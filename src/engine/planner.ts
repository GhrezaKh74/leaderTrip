import type {
  City,
  DayPlan,
  POI,
  PlanBlock,
  TripInput,
  TripPlan,
  Warning,
} from '../domain/types'
import { CITIES, getCity } from '../data/cities'
import { POIS } from '../data/pois'
import { getVehicle } from '../data/vehicles'
import {
  LODGING_FACTOR,
  lodgingAgeFactor,
  mealFactor,
  seasonFactor,
  ticketFactor,
} from '../data/pricing'
import { addDays, fromISODate, isNowruzPeriod, toISODate } from '../lib/jalali'
import { faNum } from '../lib/format'
import { computeLeg, haversineKm, type LatLng, terrainBetween } from './geo'
import { sunTimes } from './sun'
import { optimizeOrder } from './router'
import { computeCost, effectiveFuelPrice, loadFactor, resolvePrices } from './cost'
import {
  buildGroupProfile,
  groupSlowdown,
  hardRejectReason,
  scorePOI,
  visitTimeFactor,
} from './scoring'

/** حداکثر رانندگی پیوسته پیش از توقف اجباری استراحت */
const CONTINUOUS_DRIVE_LIMIT_MIN = 120
const REST_MIN = 15
const BREAKFAST_MIN = 45
const LUNCH_WINDOW = { from: 12 * 60, to: 14.5 * 60 }
const DINNER_MIN = 75
const FUEL_STOP_EVERY_KM = 350
const FUEL_STOP_MIN = 15

/** شهرهایی که می‌شود شب را در آن‌ها ماند */
const STAY_CITIES = CITIES.filter((c) => c.amenities >= 2)

export function generatePlan(input: TripInput): TripPlan {
  const origin = getCity(input.originCityId)
  const destination = input.destinationCityId ? getCity(input.destinationCityId) : null
  const vehicle = getVehicle(input.vehicleId)
  const group = buildGroupProfile(input.travelers)
  const prices = resolvePrices(input.priceOverrides)

  const startDate = fromISODate(input.startDate)
  const month = startDate.getMonth() + 1
  const slowdown = groupSlowdown(group)
  const timeFactor = visitTimeFactor(group)

  const warnings: Warning[] = []

  // ─── گام ۱ و ۲: کاندیدها و امتیازدهی ──────────────────────
  const rejected = new Map<string, string>()
  const scored: { poi: POI; score: number }[] = []

  for (const p of POIS) {
    const reason = hardRejectReason(p, input, group, vehicle, origin, destination, month)
    const isPinned = input.pinnedPoiIds.includes(p.id)

    if (reason && !isPinned) {
      // فقط جاذبه‌های داخل محدودهٔ سفر ارزش گزارش‌کردن دارند
      if (!reason.includes('دور') && !reason.includes('شعاع')) rejected.set(p.id, reason)
      continue
    }
    if (reason && isPinned) {
      warnings.push({
        level: 'warn',
        title: `«${p.name}» با شرایط سفر جور نیست`,
        detail: `${reason} — چون خودتان آن را پین کرده‌اید در برنامه نگه داشته شد.`,
      })
    }
    scored.push({
      poi: p,
      score: scorePOI(p, input, group, origin, destination, month),
    })
  }

  scored.sort((a, b) => b.score - a.score)

  // ─── گام ۳ و ۴: انتخاب و ترتیب مسیر ───────────────────────
  const endPoint: LatLng | null = input.roundTrip ? origin : destination
  const ordered = selectRoute({
    scored,
    origin,
    endPoint,
    input,
    vehicle,
    slowdown,
    timeFactor,
  })

  // ─── هزینه‌های واحد برای محاسبهٔ هزینهٔ هر بلوک ────────────
  const cars = Math.max(1, input.vehicleCount)
  const fuelPrice = effectiveFuelPrice(prices, vehicle, input.subsidizedFuelShare)
  const load = loadFactor(input.travelers.length / cars)
  // هزینهٔ سوخت جدا نگه داشته می‌شود چون در مسیر کوهستانی ضریب می‌خورد.
  // این تفکیک باعث می‌شود جمع هزینهٔ روزها دقیقاً با زیرجمع کل برابر دربیاید.
  const fuelPerKm = (vehicle.consumption / 100) * fuelPrice * load * cars
  const otherPerKm =
    (prices.freewayShare * prices.tollPerKm * vehicle.tollFactor + vehicle.depreciationPerKm) * cars
  const legCost = (roadKm: number, terrain: string) =>
    roadKm * (fuelPerKm * (terrain === 'mountain' ? 1.15 : 1) + otherPerKm)

  const ticketWeight = input.travelers.reduce((s, t) => s + ticketFactor(t.age), 0)
  const eaters = input.travelers.reduce((s, t) => s + mealFactor(t.age), 0)
  const payingGuests = input.travelers.reduce((s, t) => s + lodgingAgeFactor(t.age), 0)
  const mealPrices = prices.meals[input.style]

  // ─── گام ۵: ساخت روزها ────────────────────────────────────
  const nightsTotal = Math.max(0, input.days - 1)
  const queue = [...ordered]
  const days: DayPlan[] = []
  const nightCities: City[] = []
  const visited: POI[] = []
  let totalKm = 0
  let mountainKm = 0
  let mealsAmount = 0
  let breakfasts = 0
  let lunches = 0
  let dinners = 0

  let currentPoint: LatLng = origin
  let currentCity: City = origin

  for (let d = 0; d < input.days; d += 1) {
    const isLastDay = d === input.days - 1
    const date = addDays(startDate, d)
    const dayWarnings: Warning[] = []
    const blocks: PlanBlock[] = []

    const { windowStart, windowEnd } = dayWindow(input, date, currentPoint)
    const drivingCap = input.maxDrivingHoursPerDay * 60

    let t = windowStart
    let drivingUsed = 0
    let continuousDrive = 0
    let kmSinceFuel = 0
    let dayKm = 0
    let dayCost = 0
    let lunchDone = false
    let dayMealCost = 0
    const dayPois: POI[] = []

    // صبحانه — روز اول (و هر صبحی که در خانهٔ خودمان بیدار شویم) هزینه‌ای ندارد
    if (d > 0) {
      const wokeAtHome = currentCity.id === origin.id
      const cost = wokeAtHome ? 0 : mealPrices.breakfast * eaters * currentCity.costIndex
      blocks.push({
        kind: 'meal',
        startMin: t,
        durationMin: BREAKFAST_MIN,
        title: 'صبحانه',
        cost,
        note: currentCity.name,
      })
      t += BREAKFAST_MIN
      dayCost += cost
      dayMealCost += cost
      mealsAmount += cost
      if (cost > 0) breakfasts += 1
    }

    // مقصد پایان روز: روز آخرِ سفر رفت‌وبرگشتی به مبدأ برمی‌گردد
    const forcedEnd = isLastDay && input.roundTrip ? origin : null

    // پرکردن روز با جاذبه‌ها
    while (queue.length > 0) {
      const next = queue[0]
      const leg = legBetween(currentPoint, next, currentCity, vehicle, slowdown)
      const visitMin = Math.round(next.visitMinutes * timeFactor)

      // پس از این جاذبه باید به جایی برای شب برسیم
      const endCity = forcedEnd ?? pickStayCity(next, queue[1] ?? null)
      const backLeg = legBetween(next, endCity, cityOf(next), vehicle, slowdown)

      const needsRest = continuousDrive + leg.minutes > CONTINUOUS_DRIVE_LIMIT_MIN
      const restCost = needsRest ? REST_MIN : 0
      const needsFuel = kmSinceFuel + leg.roadKm > FUEL_STOP_EVERY_KM
      const fuelCost = needsFuel ? FUEL_STOP_MIN : 0

      const wouldDrive = drivingUsed + leg.minutes + backLeg.minutes
      const wouldFinish = t + leg.minutes + restCost + fuelCost + visitMin + backLeg.minutes

      if (wouldDrive > drivingCap || wouldFinish > windowEnd) break

      // رانندگی
      if (needsRest) {
        blocks.push({
          kind: 'rest',
          startMin: t,
          durationMin: REST_MIN,
          title: 'توقف استراحت',
          cost: 0,
          note: 'دو ساعت رانندگی پیوسته',
        })
        t += REST_MIN
        continuousDrive = 0
      }
      if (needsFuel) {
        blocks.push({
          kind: 'fuel',
          startMin: t,
          durationMin: FUEL_STOP_MIN,
          title: 'سوخت‌گیری',
          cost: 0,
        })
        t += FUEL_STOP_MIN
        kmSinceFuel = 0
      }

      const driveCost = legCost(leg.roadKm, leg.terrain)
      blocks.push({
        kind: 'drive',
        startMin: t,
        durationMin: Math.round(leg.minutes),
        title: `حرکت به ${next.name}`,
        distanceKm: Math.round(leg.roadKm),
        cost: driveCost,
        note: leg.terrain === 'mountain' ? 'مسیر کوهستانی' : undefined,
      })
      t += leg.minutes
      drivingUsed += leg.minutes
      continuousDrive += leg.minutes
      dayKm += leg.roadKm
      kmSinceFuel += leg.roadKm
      dayCost += driveCost
      if (leg.terrain === 'mountain') mountainKm += leg.roadKm

      // ناهار اگر وقتش رسیده
      if (!lunchDone && t >= LUNCH_WINDOW.from && t <= LUNCH_WINDOW.to) {
        const lunchMin = input.style === 'budget' ? 60 : 75
        const cost = mealPrices.lunch * eaters * currentCity.costIndex
        blocks.push({ kind: 'meal', startMin: t, durationMin: lunchMin, title: 'ناهار', cost })
        t += lunchMin
        dayCost += cost
        dayMealCost += cost
        mealsAmount += cost
        lunches += 1
        lunchDone = true
      }

      // بازدید
      const ticketCost = next.ticket * ticketWeight
      blocks.push({
        kind: 'visit',
        startMin: t,
        durationMin: visitMin,
        title: next.name,
        poiId: next.id,
        cost: ticketCost,
      })
      t += visitMin
      dayCost += ticketCost
      continuousDrive = 0

      dayPois.push(next)
      visited.push(next)
      queue.shift()
      currentPoint = next
      currentCity = cityOf(next)
    }

    // ناهار جا نیفتاد؟ به‌هرحال باید غذا خورد
    if (!lunchDone && t < windowEnd) {
      const cost = mealPrices.lunch * eaters * currentCity.costIndex
      const at = Math.max(t, LUNCH_WINDOW.from)
      blocks.push({ kind: 'meal', startMin: at, durationMin: 60, title: 'ناهار', cost })
      t = at + 60
      dayCost += cost
      dayMealCost += cost
      mealsAmount += cost
      lunches += 1
    }

    // روز بدون هیچ جاذبه‌ای: روز جابه‌جایی است
    if (dayPois.length === 0 && queue.length > 0) {
      dayWarnings.push({
        level: 'info',
        title: 'روز جابه‌جایی',
        detail: 'فاصله زیاد بود و جاذبه‌ای در این روز جا نشد؛ این روز صرف نزدیک‌شدن به مقصد می‌شود.',
        day: d + 1,
      })
    }

    // ─── رسیدن به محل اقامت ──────────────────────────────
    const stayCity =
      forcedEnd ??
      (dayPois.length > 0
        ? pickStayCity(dayPois[dayPois.length - 1], queue[0] ?? null)
        : pickTransferCity(currentPoint, queue[0] ?? null, drivingCap - drivingUsed, vehicle, slowdown, currentCity))

    if (stayCity.id !== currentCity.id || haversineKm(currentPoint, stayCity) > 5) {
      const leg = legBetween(currentPoint, stayCity, currentCity, vehicle, slowdown)
      const driveCost = legCost(leg.roadKm, leg.terrain)
      blocks.push({
        kind: 'drive',
        startMin: t,
        durationMin: Math.round(leg.minutes),
        title: isLastDay && input.roundTrip ? `بازگشت به ${stayCity.name}` : `حرکت به ${stayCity.name}`,
        distanceKm: Math.round(leg.roadKm),
        toCityId: stayCity.id,
        cost: driveCost,
      })
      t += leg.minutes
      drivingUsed += leg.minutes
      dayKm += leg.roadKm
      dayCost += driveCost
      if (leg.terrain === 'mountain') mountainKm += leg.roadKm
    }

    currentPoint = stayCity
    currentCity = stayCity

    // شام و اقامت — شب آخرِ سفر رفت‌وبرگشتی در خانه است
    // و اگر شب در شهر خودمان بمانیم، خانهٔ خودمان است: نه هتلی، نه رستورانی
    const atHome = stayCity.id === origin.id
    const staysOvernight = d < nightsTotal && !atHome

    if (d < nightsTotal && atHome) {
      blocks.push({
        kind: 'lodging',
        startMin: Math.max(t, 21 * 60),
        durationMin: 0,
        title: `شب در خانه (${stayCity.name})`,
        toCityId: stayCity.id,
        cost: 0,
        note: 'بدون هزینهٔ اقامت',
      })
    }

    if (staysOvernight) {
      const dinnerCost = mealPrices.dinner * eaters * stayCity.costIndex
      blocks.push({
        kind: 'meal',
        startMin: Math.max(t, 19 * 60),
        durationMin: DINNER_MIN,
        title: 'شام',
        cost: dinnerCost,
        note: stayCity.name,
      })
      dayCost += dinnerCost
      dayMealCost += dinnerCost
      mealsAmount += dinnerCost
      dinners += 1

      const lodgingCost =
        payingGuests *
        prices.lodgingPerNight[input.style] *
        stayCity.costIndex *
        seasonFactor(month, stayCity.climate) *
        (LODGING_FACTOR[input.lodging] ?? 1)

      blocks.push({
        kind: 'lodging',
        startMin: Math.max(t + DINNER_MIN, 21 * 60),
        durationMin: 0,
        title: `اقامت شب در ${stayCity.name}`,
        toCityId: stayCity.id,
        cost: lodgingCost,
      })
      dayCost += lodgingCost
      nightCities.push(stayCity)
    }

    // تنقلات بین‌راهی — درصدی از خوراک همان روز
    if (dayMealCost > 0) {
      const snack = dayMealCost * prices.snackRate
      blocks.push({
        kind: 'meal',
        startMin: Math.min(windowEnd, LUNCH_WINDOW.from + 240),
        durationMin: 0,
        title: 'تنقلات و نوشیدنی بین‌راهی',
        cost: snack,
      })
      dayCost += snack
    }

    // هشدارهای روز
    if (drivingUsed > 5 * 60 && group.drivers < 2) {
      dayWarnings.push({
        level: 'danger',
        title: `${faNum(drivingUsed / 60)} ساعت رانندگی با یک راننده`,
        detail: 'برای این حجم رانندگی راننده دوم لازم است، یا این روز را کوتاه‌تر کنید.',
        day: d + 1,
      })
    }
    const hardVisits = dayPois.filter((p) => p.difficulty >= 2).length
    if (hardVisits >= 2 && (group.hasChild || group.hasSenior || group.hasToddler)) {
      dayWarnings.push({
        level: 'warn',
        title: 'روز پرفشار برای اعضای گروه',
        detail: `${faNum(hardVisits)} بازدید با پیاده‌روی سنگین در یک روز، با وجود کودک یا سالمند در جمع.`,
        day: d + 1,
      })
    }

    days.push({
      index: d + 1,
      date: toISODate(date),
      baseCityId: stayCity.id,
      blocks: blocks
        .map((b) => ({ ...b, startMin: Math.round(b.startMin), durationMin: Math.round(b.durationMin) }))
        .sort((a, b) => a.startMin - b.startMin),
      distanceKm: Math.round(dayKm),
      drivingMinutes: Math.round(drivingUsed),
      cost: dayCost,
      warnings: dayWarnings,
    })

    totalKm += dayKm
    warnings.push(...dayWarnings)
  }

  // ─── گام ۷: هزینه ─────────────────────────────────────────
  const cost = computeCost({
    input,
    vehicle,
    group,
    totalKm,
    mountainShare: totalKm > 0 ? mountainKm / totalKm : 0,
    nightCities,
    visitedPois: visited,
    month,
    mealsActual: { amount: mealsAmount, breakfasts, lunches, dinners },
  })

  // ─── گام ۸: هشدارهای کلی ─────────────────────────────────
  if (group.drivers === 0) {
    warnings.unshift({
      level: 'danger',
      title: 'هیچ راننده‌ای مشخص نشده',
      detail: 'دست‌کم یک نفر از همسفران را به‌عنوان راننده علامت بزنید.',
    })
  }

  if (cost.overBudget > 0) {
    warnings.unshift({
      level: 'warn',
      title: `${faNum((cost.overBudget / Math.max(1, input.budgetTotal)) * 100)}٪ بالاتر از بودجه`,
      detail: 'در پنل هزینه می‌توانید سطح اقامت را پایین بیاورید یا جاذبه‌های دورتر را حذف کنید.',
    })
  } else if (input.budgetTotal > 0 && cost.total < input.budgetTotal * 0.6) {
    warnings.push({
      level: 'info',
      title: 'بودجه جای بیشتری دارد',
      detail: 'می‌توانید شعاع سفر را بیشتر کنید یا سطح اقامت را یک پله بالا ببرید.',
    })
  }

  if (isNowruzPeriod(startDate)) {
    warnings.push({
      level: 'warn',
      title: 'سفر در بازهٔ نوروز',
      detail: 'قیمت اقامت تا ۴۵٪ بالاتر حساب شده است. حتماً از قبل رزرو کنید.',
    })
  }

  const droppedHighScore = queue.slice(0, 5).map((p) => p.id)
  if (queue.length > 0) {
    warnings.push({
      level: 'info',
      title: `${faNum(queue.length)} جاذبه در برنامه جا نشد`,
      detail: 'با افزودن یک روز به سفر یا بالا بردن سقف رانندگی روزانه می‌توانید بیشترشان را بگنجانید.',
    })
  }

  const missedByVehicle = [...rejected.entries()].filter(([, r]) => r.includes('خودرو')).length
  if (missedByVehicle >= 3 && vehicle.offroad === 0) {
    warnings.push({
      level: 'info',
      title: `${faNum(missedByVehicle)} جاذبه به‌خاطر نوع خودرو حذف شد`,
      detail: 'این مقصدها جادهٔ خاکی یا کوهستانی دارند و با خودروی سواری توصیه نمی‌شوند.',
    })
  }

  return {
    input,
    days,
    cost,
    warnings,
    stats: {
      totalKm,
      totalDrivingMin: days.reduce((s, d) => s + d.drivingMinutes, 0),
      poiCount: visited.length,
      nights: nightCities.length,
    },
    droppedPoiIds: droppedHighScore,
    generatedAt: new Date().toISOString(),
  }
}

// ─────────────────────── انتخاب مسیر ───────────────────────

interface SelectArgs {
  scored: { poi: POI; score: number }[]
  origin: City
  endPoint: LatLng | null
  input: TripInput
  vehicle: ReturnType<typeof getVehicle>
  slowdown: number
  timeFactor: number
}

/**
 * انتخاب جاذبه‌ها به‌صورت «مسئلهٔ جهت‌یابی» (Orienteering):
 * بیشترین امتیاز ممکن در چارچوب بودجهٔ زمانی سفر.
 *
 * انتخاب صرفاً بر اساس بالاترین امتیاز کار نمی‌کند — نتیجه‌اش پخش‌شدن در
 * چند جهت مخالف است که در یک سفر جاده‌ای شدنی نیست. این‌جا هر جاذبه با
 * «امتیاز به‌ازای دقیقهٔ اضافه‌شده به سفر» سنجیده می‌شود و در ارزان‌ترین
 * جای مسیر درج می‌شود، پس مسیر خودبه‌خود در یک راستا شکل می‌گیرد.
 */
function selectRoute({
  scored,
  origin,
  endPoint,
  input,
  vehicle,
  slowdown,
  timeFactor,
}: SelectArgs): POI[] {
  const cityFor = (pt: LatLng & { cityId?: string }): City =>
    pt.cityId ? getCity(pt.cityId) : (pt as City)

  const driveMin = (a: LatLng & { cityId?: string }, b: LatLng & { cityId?: string }) => {
    const straight = haversineKm(a, b)
    const terrain = terrainBetween(cityFor(a), cityFor(b), straight)
    return computeLeg(a, b, terrain, vehicle, slowdown).minutes
  }

  const driveBudget = input.days * input.maxDrivingHoursPerDay * 60
  // ساعات مفید روز منهای وعده‌های غذایی و توقف‌ها
  const usablePerDay = Math.max(0, (input.dayEndHour - input.dayStartHour) * 60 - 150)
  const timeBudget = input.days * usablePerDay

  const route: POI[] = []
  const used = new Set<string>()

  /** زمان رانندگی کل یک ترتیب مشخص */
  const routeDrive = (order: POI[]): number => {
    let total = 0
    let cur: LatLng & { cityId?: string } = origin
    for (const p of order) {
      total += driveMin(cur, p)
      cur = p
    }
    if (endPoint) total += driveMin(cur, endPoint as LatLng & { cityId?: string })
    return total
  }

  // جاذبه‌های پین‌شده بی‌چون‌وچرا وارد مسیر می‌شوند
  for (const s of scored) {
    if (input.pinnedPoiIds.includes(s.poi.id)) {
      route.push(s.poi)
      used.add(s.poi.id)
    }
  }
  if (route.length > 1) {
    const better = optimizeOrder(origin, route, endPoint)
    route.length = 0
    route.push(...better)
  }

  let totalDrive = routeDrive(route)
  let totalVisit = route.reduce((s, p) => s + p.visitMinutes * timeFactor, 0)

  // درج حریصانه: در هر دور، بهترین نسبت «امتیاز به زمان اضافه‌شده»
  for (;;) {
    let bestRatio = -Infinity
    let bestPoi: POI | null = null
    let bestPos = 0
    let bestDrive = 0

    for (const s of scored) {
      if (used.has(s.poi.id)) continue
      const visit = s.poi.visitMinutes * timeFactor

      for (let pos = 0; pos <= route.length; pos += 1) {
        const candidate = [...route.slice(0, pos), s.poi, ...route.slice(pos)]
        const drive = routeDrive(candidate)
        const addedDrive = drive - totalDrive

        if (drive > driveBudget) continue
        if (totalVisit + visit + drive > timeBudget) continue

        const ratio = s.score / Math.max(1, addedDrive + visit)
        if (ratio > bestRatio) {
          bestRatio = ratio
          bestPoi = s.poi
          bestPos = pos
          bestDrive = drive
        }
      }
    }

    if (!bestPoi) break

    route.splice(bestPos, 0, bestPoi)
    used.add(bestPoi.id)
    totalDrive = bestDrive
    totalVisit += bestPoi.visitMinutes * timeFactor
  }

  return optimizeOrder(origin, route, endPoint)
}

// ─────────────────────── کمکی‌ها ───────────────────────

function cityOf(p: POI): City {
  return getCity(p.cityId)
}

function legBetween(
  from: LatLng,
  to: LatLng & { cityId?: string; climate?: string },
  fromCity: City,
  vehicle: ReturnType<typeof getVehicle>,
  slowdown: number,
) {
  const toCity: City =
    'cityId' in to && to.cityId ? getCity(to.cityId) : (to as unknown as City)
  const straight = haversineKm(from, to)
  const terrain = terrainBetween(fromCity, toCity, straight)
  return computeLeg(from, to, terrain, vehicle, slowdown)
}

/** پنجرهٔ ساعات مفید روز، با در نظر گرفتن طلوع و غروب واقعی */
function dayWindow(input: TripInput, date: Date, at: LatLng) {
  // طلوع و غروب برای تنظیم پنجرهٔ روز — پیاده‌سازی در sun.ts
  const { sunriseMin, sunsetMin } = sunTimesCached(date, at)
  return {
    windowStart: Math.max(input.dayStartHour * 60, sunriseMin - 30),
    windowEnd: Math.min(input.dayEndHour * 60, sunsetMin + 60),
  }
}

const sunCache = new Map<string, ReturnType<typeof sunTimes>>()
function sunTimesCached(date: Date, at: LatLng) {
  const key = `${toISODate(date)}|${at.lat.toFixed(1)}|${at.lng.toFixed(1)}`
  const hit = sunCache.get(key)
  if (hit) return hit
  const v = sunTimes(date, at.lat, at.lng)
  sunCache.set(key, v)
  return v
}

/**
 * شهر مناسب برای ماندن شب: نزدیک به آخرین جاذبهٔ روز و
 * ترجیحاً در جهت جاذبهٔ بعدی، تا فردا کمتر رانندگی کنیم.
 */
function pickStayCity(lastPoi: POI, nextPoi: POI | null): City {
  let best = STAY_CITIES[0]
  let bestScore = Infinity

  for (const c of STAY_CITIES) {
    const d = haversineKm(lastPoi, c)
    if (d > 120) continue
    const forward = nextPoi ? haversineKm(c, nextPoi) * 0.35 : 0
    const score = d + forward
    if (score < bestScore) {
      bestScore = score
      best = c
    }
  }

  // اگر هیچ شهری در ۱۲۰ کیلومتری نبود، نزدیک‌ترین را بردار
  if (bestScore === Infinity) {
    for (const c of STAY_CITIES) {
      const d = haversineKm(lastPoi, c)
      if (d < bestScore) {
        bestScore = d
        best = c
      }
    }
  }
  return best
}

/**
 * روز جابه‌جایی: تا جایی که سقف رانندگی اجازه می‌دهد به جاذبهٔ بعدی نزدیک شو.
 */
function pickTransferCity(
  from: LatLng,
  nextPoi: POI | null,
  remainingDriveMin: number,
  vehicle: ReturnType<typeof getVehicle>,
  slowdown: number,
  fromCity: City,
): City {
  if (!nextPoi) return fromCity

  let best = fromCity
  let bestDistToNext = haversineKm(from, nextPoi)

  for (const c of STAY_CITIES) {
    const leg = legBetween(from, c, fromCity, vehicle, slowdown)
    if (leg.minutes > remainingDriveMin) continue
    const d = haversineKm(c, nextPoi)
    if (d < bestDistToNext) {
      bestDistToNext = d
      best = c
    }
  }
  return best
}

/** برنامهٔ نمونه برای شروع سریع */
export function defaultInput(): TripInput {
  const today = new Date()
  return {
    originCityId: 'tehran',
    destinationCityId: null,
    startDate: toISODate(addDays(today, 7)),
    days: 3,
    radiusKm: 300,
    travelers: [
      { id: 't1', name: '', age: 35, mobility: 'full', isDriver: true },
      { id: 't2', name: '', age: 33, mobility: 'full', isDriver: false },
    ],
    vehicleId: 'sedan-206',
    vehicleCount: 1,
    budgetTotal: 30_000_000,
    style: 'balanced',
    lodging: 'hotel',
    interests: ['historical', 'nature'],
    maxDrivingHoursPerDay: 5,
    dayStartHour: 8,
    dayEndHour: 21,
    roundTrip: true,
    pinnedPoiIds: [],
    blockedPoiIds: [],
    subsidizedFuelShare: 0.6,
    priceOverrides: {},
  }
}

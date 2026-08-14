import type {
  City,
  CustomStop,
  DayPlan,
  DayWeather,
  POI,
  PlanBlock,
  TripInput,
  TripPlan,
  WeatherMap,
  WeatherProfile,
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
import { addDays, fromISODate, toISODate } from '../lib/jalali'
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
import { advise } from './advisor'
import {
  buildWeatherProfile,
  needsSiesta,
  pickDayWeather,
  weatherSpeedFactor,
  weatherWindowShift,
} from './climate'

/** حداکثر رانندگی پیوسته پیش از توقف اجباری استراحت */
const CONTINUOUS_DRIVE_LIMIT_MIN = 120
const REST_MIN = 15
const BREAKFAST_MIN = 45
const LUNCH_WINDOW = { from: 12 * 60, to: 14.5 * 60 }
const DINNER_MIN = 75
const FUEL_STOP_EVERY_KM = 350
const FUEL_STOP_MIN = 15
const SIESTA_MIN = 60

/** شهرهایی که می‌شود شب را در آن‌ها ماند */
const STAY_CITIES = CITIES.filter((c) => c.amenities >= 2)

export function generatePlan(input: TripInput, weather?: WeatherMap): TripPlan {
  const origin = getCity(input.originCityId)
  const destination = input.destinationCityId ? getCity(input.destinationCityId) : null
  const vehicle = getVehicle(input.vehicleId)
  const group = buildGroupProfile(input.travelers)
  const prices = resolvePrices(input.priceOverrides)

  const startDate = fromISODate(input.startDate)
  const month = startDate.getMonth() + 1
  const slowdown = groupSlowdown(group)
  const timeFactor = visitTimeFactor(group)

  // خلاصهٔ جوّی سفر — از همهٔ روزهایی که داده دارند، برای وزن‌دهی به
  // جاذبه‌های سرپوشیده در برابر فضای باز
  const tripDates = new Set(
    Array.from({ length: input.days }, (_, i) => toISODate(addDays(startDate, i))),
  )
  const weatherProfile: WeatherProfile = buildWeatherProfile(
    Object.values(weather ?? {}).filter((w) => tripDates.has(w.date)),
  )

  const pinnedConflicts: { name: string; reason: string }[] = []

  // ─── گام ۱ و ۲: کاندیدها و امتیازدهی ──────────────────────
  const rejected = new Map<string, string>()
  const scored: { poi: POI; score: number }[] = []

  // توقف‌های دلخواه کاربر مثل هر جاذبهٔ دیگری رفتار می‌کنند — تا بقیهٔ موتور
  // لازم نباشد دربارهٔ آن‌ها چیزی بداند
  const allPois = [...POIS, ...input.customStops.map(customStopToPoi)]

  for (const p of allPois) {
    const reason = hardRejectReason(p, input, group, vehicle, origin, destination, month)
    const isPinned = input.pinnedPoiIds.includes(p.id) || p.id.startsWith(CUSTOM_PREFIX)

    if (reason && !isPinned) {
      // فقط جاذبه‌های داخل محدودهٔ سفر ارزش گزارش‌کردن دارند
      if (!reason.includes('دور') && !reason.includes('شعاع')) rejected.set(p.id, reason)
      continue
    }
    if (reason && isPinned) pinnedConflicts.push({ name: p.name, reason })

    scored.push({
      poi: p,
      score: scorePOI(p, input, group, origin, destination, month, weatherProfile),
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
  /** جاذبه‌هایی که هنوز جایی در برنامه پیدا نکرده‌اند، به ترتیب مسیر */
  let remaining = [...ordered]
  const assignment = input.dayAssignment
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
    const dateISO = toISODate(date)
    const blocks: PlanBlock[] = []

    // آب‌وهوای جایی که این روز را از آن شروع می‌کنیم
    const dayW: DayWeather | undefined = pickDayWeather(weather, currentCity.id, dateISO)
    // هوای بد یعنی سرعت کمتر یعنی مسافت کمتر در روز — این واقعاً برنامه را عوض می‌کند
    const daySlowdown = slowdown * weatherSpeedFactor(dayW)

    const { windowStart, windowEnd } = dayWindow(input, date, currentPoint, dayW)
    const drivingCap = input.maxDrivingHoursPerDay * 60
    let siestaDone = !needsSiesta(dayW)

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

    /**
     * صف امروز: اول آن‌هایی که کاربر دستی به همین روز سنجاق کرده، بعد
     * بقیه به ترتیب مسیر. هر جاذبه‌ای که به روز دیگری سنجاق شده، امروز
     * اصلاً دیده نمی‌شود.
     */
    const dayNumber = d + 1
    const pinnedToday = remaining.filter((p) => assignment[p.id] === dayNumber)
    const unassigned = remaining.filter((p) => assignment[p.id] === undefined)
    const dayQueue = [...pinnedToday, ...unassigned]

    // پرکردن روز با جاذبه‌ها
    while (dayQueue.length > 0) {
      const next = dayQueue[0]
      const leg = legBetween(currentPoint, next, currentCity, vehicle, daySlowdown)
      const visitMin = Math.round(next.visitMinutes * timeFactor)

      // پس از این جاذبه باید به جایی برای شب برسیم
      const endCity = forcedEnd ?? pickStayCity(next, dayQueue[1] ?? null)
      const backLeg = legBetween(next, endCity, cityOf(next), vehicle, daySlowdown)

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

      // استراحت نیم‌روزی در گرمای شدید — بین ۱۳ تا ۱۷ بیرون بودن خطرناک است
      if (!siestaDone && t >= 13 * 60) {
        blocks.push({
          kind: 'rest',
          startMin: t,
          durationMin: SIESTA_MIN,
          title: 'استراحت نیم‌روزی',
          cost: 0,
          note: 'گرمای شدید — ساعت اوج آفتاب',
        })
        t += SIESTA_MIN
        siestaDone = true
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
      dayQueue.shift()
      remaining = remaining.filter((p) => p.id !== next.id)
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

    // ─── رسیدن به محل اقامت ──────────────────────────────
    const stayCity =
      forcedEnd ??
      (dayPois.length > 0
        ? pickStayCity(dayPois[dayPois.length - 1], remaining[0] ?? null)
        : pickTransferCity(
            currentPoint,
            remaining[0] ?? null,
            drivingCap - drivingUsed,
            vehicle,
            daySlowdown,
            currentCity,
          ))

    if (stayCity.id !== currentCity.id || haversineKm(currentPoint, stayCity) > 5) {
      const leg = legBetween(currentPoint, stayCity, currentCity, vehicle, daySlowdown)
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

    days.push({
      index: d + 1,
      date: dateISO,
      baseCityId: stayCity.id,
      blocks: blocks
        .map((b) => ({ ...b, startMin: Math.round(b.startMin), durationMin: Math.round(b.durationMin) }))
        .sort((a, b) => a.startMin - b.startMin),
      distanceKm: Math.round(dayKm),
      drivingMinutes: Math.round(drivingUsed),
      cost: dayCost,
      warnings: [],
      weather: dayW,
    })

    totalKm += dayKm
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

  // ─── گام ۸: هشدارها ───────────────────────────────────────
  // برنامه‌ریز فقط واقعیت می‌سازد؛ قضاوت دربارهٔ آن کار مشاور است.
  const inPlanIds = new Set(visited.map((p) => p.id))
  const warnings = advise({
    input,
    group,
    vehicle,
    days,
    cost,
    weather: weatherProfile,
    rejected,
    droppedCount: remaining.length,
    pinnedConflicts,
    unscheduledPinned: input.pinnedPoiIds.filter((id) => !inPlanIds.has(id)),
  })

  // هشدارهای مربوط به هر روز، به همان روز برگردانده می‌شوند
  for (const day of days) {
    day.warnings = warnings.filter((w) => w.day === day.index)
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
    droppedPoiIds: remaining.slice(0, 8).map((p) => p.id),
    candidates: scored.map((s) => ({
      poiId: s.poi.id,
      score: s.score,
      inPlan: inPlanIds.has(s.poi.id),
    })),
    weather: weatherProfile,
    generatedAt: new Date().toISOString(),
  }
}

export const CUSTOM_PREFIX = 'custom:'

/**
 * توقف دلخواه کاربر را به شکل یک جاذبهٔ کامل درمی‌آورد.
 * مختصات از شهر انتخابی می‌آید — بدون سرویس ژئوکدینگ، این دقیق‌ترین چیزی است
 * که می‌شود آفلاین به‌دست آورد، و برای تخمین مسافت کافی است.
 */
export function customStopToPoi(stop: CustomStop): POI {
  const city = getCity(stop.cityId)
  return {
    id: `${CUSTOM_PREFIX}${stop.id}`,
    name: stop.name,
    cityId: stop.cityId,
    lat: city.lat,
    lng: city.lng,
    cat: stop.cat,
    tags: ['توقف دلخواه'],
    rating: 4,
    visitMinutes: stop.visitMinutes,
    ticket: stop.ticket,
    bestMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    indoor: false,
    difficulty: 0,
    minAge: 0,
    kidFriendly: true,
    seniorFriendly: true,
    requiresVehicle: 0,
    nightSuitable: false,
    desc: stop.note || `توقف دلخواه در ${city.name}`,
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

  // وقتی کاربر جاذبه‌ای را «حتماً برو» کرده، کمی از بودجهٔ رانندگی را دست‌نخورده
  // نگه می‌داریم؛ وگرنه درج حریصانه بودجه را پر می‌کند و جای پین‌شده در
  // زمان‌بندی روزها تنگ می‌شود.
  const headroom = input.pinnedPoiIds.length > 0 ? 0.85 : 1
  const driveBudget = input.days * input.maxDrivingHoursPerDay * 60 * headroom
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

/**
 * پنجرهٔ ساعات مفید روز — طلوع و غروب واقعی، به‌علاوهٔ جابه‌جایی جوّی:
 * گرمای شدید روز را جلو می‌کشد، یخبندان عقب می‌اندازد.
 */
function dayWindow(input: TripInput, date: Date, at: LatLng, w?: DayWeather) {
  const { sunriseMin, sunsetMin } = sunTimesCached(date, at)
  const shift = weatherWindowShift(w)

  const earliest = sunriseMin - 30
  const latest = sunsetMin + 60

  return {
    windowStart: Math.max(earliest, input.dayStartHour * 60 + shift.start),
    windowEnd: Math.min(latest, input.dayEndHour * 60 + shift.end),
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
    dayAssignment: {},
    customStops: [],
    subsidizedFuelShare: 0.6,
    priceOverrides: {},
  }
}

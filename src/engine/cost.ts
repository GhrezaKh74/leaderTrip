import type {
  City,
  CostBreakdown,
  CostLine,
  GroupProfile,
  POI,
  PriceBook,
  TripInput,
  Vehicle,
} from '../domain/types'
import {
  DEFAULT_PRICES,
  LODGING_FACTOR,
  SCENARIO,
  lodgingAgeFactor,
  mealFactor,
  seasonFactor,
  ticketFactor,
} from '../data/pricing'
import { faNum, toman } from '../lib/format'

export interface CostContext {
  input: TripInput
  vehicle: Vehicle
  group: GroupProfile
  /** مسافت کل جاده‌ای یک خودرو، کیلومتر */
  totalKm: number
  /** سهم مسیر کوهستانی از کل، ۰ تا ۱ */
  mountainShare: number
  /** شهر اقامت هر شب — طول آرایه = تعداد شب‌ها */
  nightCities: City[]
  /** جاذبه‌هایی که واقعاً در برنامه هستند */
  visitedPois: POI[]
  /** ماه میلادی شروع سفر */
  month: number
  /**
   * جمع واقعی وعده‌های غذایی که برنامه‌ریز چیده است (بدون تنقلات).
   * برنامه‌ریز قیمت هر وعده را با ضریب گرانی همان شهر حساب می‌کند، در حالی که
   * تخمین اینجا ناچار به میانگین‌گیری است — پس اگر داده شود، همان ملاک است و
   * جمع هزینهٔ روزها دقیقاً با جمع کل برابر درمی‌آید.
   */
  mealsActual?: { amount: number; breakfasts: number; lunches: number; dinners: number }
}

/** ضرایب قیمت نهایی: پیش‌فرض‌ها + دست‌کاری‌های کاربر */
export function resolvePrices(overrides: Partial<PriceBook> = {}): PriceBook {
  return { ...DEFAULT_PRICES, ...overrides }
}

/** قیمت مؤثر هر لیتر سوخت با در نظر گرفتن سهم سهمیه‌ای */
export function effectiveFuelPrice(
  prices: PriceBook,
  vehicle: Vehicle,
  subsidizedShare: number,
): number {
  const s = Math.min(1, Math.max(0, subsidizedShare))
  return (
    s * prices.fuelSubsidized[vehicle.fuel] + (1 - s) * prices.fuelFree[vehicle.fuel]
  )
}

/** ضریب افزایش مصرف به‌خاطر سرنشین اضافه */
export function loadFactor(passengersPerVehicle: number): number {
  return Math.min(1.2, 1 + 0.03 * Math.max(0, passengersPerVehicle - 2))
}

export function computeCost(ctx: CostContext): CostBreakdown {
  const { input, vehicle, totalKm, nightCities, visitedPois, month } = ctx
  const prices = resolvePrices(input.priceOverrides)
  const travelers = input.travelers
  const people = travelers.length
  const cars = Math.max(1, input.vehicleCount)
  const nights = nightCities.length
  const days = input.days

  const lines: CostLine[] = []

  // ─── سوخت ───────────────────────────────────────────────
  const passengersPerCar = people / cars
  const load = loadFactor(passengersPerCar)
  const mountainPenalty = 1 + 0.15 * ctx.mountainShare
  const liters = (totalKm / 100) * vehicle.consumption * load * mountainPenalty
  const fuelPrice = effectiveFuelPrice(prices, vehicle, input.subsidizedFuelShare)
  const fuelCost = liters * fuelPrice * cars
  const fuelUnit = vehicle.fuel === 'electric' ? 'کیلووات‌ساعت' : 'لیتر'

  lines.push({
    key: 'fuel',
    label: 'سوخت',
    amount: fuelCost,
    formula:
      `${faNum(totalKm)} کیلومتر × ${faNum(vehicle.consumption, 1)} ${fuelUnit}/۱۰۰کیلومتر` +
      ` × ${faNum(fuelPrice)} تومان = ${faNum(liters, 1)} ${fuelUnit}` +
      (cars > 1 ? ` × ${faNum(cars)} خودرو` : '') +
      (load > 1 ? ` (${faNum((load - 1) * 100)}٪ اضافه بابت بار و سرنشین)` : ''),
  })

  // ─── عوارض ──────────────────────────────────────────────
  const tollCost =
    totalKm * prices.freewayShare * prices.tollPerKm * vehicle.tollFactor * cars
  lines.push({
    key: 'toll',
    label: 'عوارض آزادراه',
    amount: tollCost,
    formula:
      `${faNum(totalKm)} کیلومتر × ${faNum(prices.freewayShare * 100)}٪ آزادراه` +
      ` × ${faNum(prices.tollPerKm)} تومان بر کیلومتر` +
      (vehicle.tollFactor !== 1 ? ` × ضریب ${faNum(vehicle.tollFactor, 1)} خودرو` : ''),
  })

  // ─── اقامت ──────────────────────────────────────────────
  const lodgingBase = prices.lodgingPerNight[input.style]
  const lodgingKindFactor = LODGING_FACTOR[input.lodging] ?? 1
  const payingGuests = travelers.reduce((s, t) => s + lodgingAgeFactor(t.age), 0)

  let lodgingCost = 0
  for (const city of nightCities) {
    lodgingCost +=
      payingGuests * lodgingBase * city.costIndex * seasonFactor(month, city.climate) * lodgingKindFactor
  }

  const avgCityIndex =
    nightCities.length > 0
      ? nightCities.reduce((s, c) => s + c.costIndex, 0) / nightCities.length
      : 1

  lines.push({
    key: 'lodging',
    label: 'اقامت',
    amount: lodgingCost,
    formula:
      nights === 0
        ? 'بدون شب اقامت'
        : `${faNum(nights)} شب × ${faNum(payingGuests, 1)} نفر معادل × ${toman(lodgingBase)}` +
          ` × ضریب گرانی ${faNum(avgCityIndex, 2)}` +
          (lodgingKindFactor !== 1 ? ` × ضریب ${faNum(lodgingKindFactor, 2)} نوع اقامت` : ''),
  })

  // ─── خوراک ──────────────────────────────────────────────
  // صبحانه در محل اقامت (به تعداد شب‌ها)، ناهار هر روز، شام همهٔ شب‌ها
  const m = prices.meals[input.style]
  const eaters = travelers.reduce((s, t) => s + mealFactor(t.age), 0)

  const counts = ctx.mealsActual
    ? ctx.mealsActual
    : { breakfasts: nights, lunches: days, dinners: nights, amount: 0 }

  const mealsBase =
    ctx.mealsActual?.amount ??
    (counts.breakfasts * m.breakfast + counts.lunches * m.lunch + counts.dinners * m.dinner) *
      eaters *
      avgCityIndex

  const snacks = mealsBase * prices.snackRate

  lines.push({
    key: 'meals',
    label: 'وعده‌های غذایی',
    amount: mealsBase,
    formula:
      `${faNum(counts.breakfasts)} صبحانه + ${faNum(counts.lunches)} ناهار + ${faNum(counts.dinners)} شام` +
      ` × ${faNum(eaters, 1)} نفر معادل (کودکان سهم کمتری دارند)` +
      ` × ضریب گرانی شهرها`,
  })

  lines.push({
    key: 'snacks',
    label: 'تنقلات بین‌راهی',
    amount: snacks,
    formula: `${faNum(prices.snackRate * 100)}٪ روی جمع وعده‌های غذایی — نوشیدنی، آجیل و خرده‌خوراکی جاده`,
  })

  // ─── بلیت ───────────────────────────────────────────────
  const ticketWeight = travelers.reduce((s, t) => s + ticketFactor(t.age), 0)
  const paidPois = visitedPois.filter((p) => p.ticket > 0)
  const ticketCost = paidPois.reduce((s, p) => s + p.ticket * ticketWeight, 0)

  lines.push({
    key: 'tickets',
    label: 'بلیت جاذبه‌ها',
    amount: ticketCost,
    formula:
      paidPois.length === 0
        ? 'همهٔ جاذبه‌های برنامه رایگان‌اند'
        : `${faNum(paidPois.length)} جاذبهٔ بلیت‌دار × ${faNum(ticketWeight, 1)} نفر معادل` +
          ` (${faNum(visitedPois.length - paidPois.length)} جاذبهٔ رایگان)`,
  })

  // ─── اهلاک خودرو ────────────────────────────────────────
  const depreciation = totalKm * vehicle.depreciationPerKm * cars
  lines.push({
    key: 'depreciation',
    label: 'اهلاک خودرو',
    amount: depreciation,
    formula:
      `${faNum(totalKm)} کیلومتر × ${faNum(vehicle.depreciationPerKm)} تومان بر کیلومتر` +
      (cars > 1 ? ` × ${faNum(cars)} خودرو` : '') +
      ' — روغن، لاستیک، لنت و سرویس',
  })

  // ─── جمع‌بندی ───────────────────────────────────────────
  const subtotal = lines.reduce((s, l) => s + l.amount, 0)
  const misc = subtotal * prices.miscRate[input.style]
  const buffer = (subtotal + misc) * prices.bufferRate[input.style]
  const total = subtotal + misc + buffer

  return {
    lines,
    subtotal,
    misc,
    buffer,
    total,
    perPerson: total / Math.max(1, people),
    optimistic: total * SCENARIO.optimistic,
    pessimistic: total * SCENARIO.pessimistic,
    overBudget: total - input.budgetTotal,
  }
}

// ─────────────────────── تقسیم بین نفرات ───────────────────────

export interface Share {
  travelerId: string
  name: string
  weight: number
  amount: number
}

/**
 * تقسیم هزینه بین اعضا.
 * equal: مساوی بین بزرگسالان · weighted: کودکان سهم کمتر
 */
export function splitCost(
  total: number,
  input: TripInput,
  mode: 'equal' | 'weighted' = 'weighted',
): Share[] {
  const weights: number[] = input.travelers.map((t) => {
    if (mode === 'equal') return t.age >= 18 ? 1 : 0
    if (t.age < 6) return 0.3
    if (t.age < 13) return 0.6
    return 1
  })

  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1

  return input.travelers.map((t, i) => ({
    travelerId: t.id,
    name: t.name || `همسفر ${faNum(i + 1)}`,
    weight: weights[i],
    amount: (total * weights[i]) / totalWeight,
  }))
}

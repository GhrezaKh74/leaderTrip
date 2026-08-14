import type { PriceBook } from '../domain/types'

/**
 * قیمت‌های پایه — همه به تومان.
 *
 * ⚠️ این اعداد تخمینی‌اند و با تورم بی‌اعتبار می‌شوند.
 * کاربر می‌تواند همه را در رابط کاربری ویرایش کند؛ مقدار ویرایش‌شده در
 * `TripInput.priceOverrides` ذخیره می‌شود و بر این پیش‌فرض‌ها می‌نشیند.
 *
 * مرجع فرمول‌ها: docs/04-cost-model.md
 */
export const DEFAULT_PRICES: PriceBook = {
  fuelSubsidized: {
    gasoline: 1_500,
    diesel: 400,
    cng: 600,
    electric: 1_000, // هر کیلووات‌ساعت
  },
  fuelFree: {
    gasoline: 3_000,
    diesel: 1_500,
    cng: 600,
    electric: 1_000,
  },

  tollPerKm: 300,
  freewayShare: 0.45,

  lodgingPerNight: {
    budget: 400_000,
    balanced: 900_000,
    comfort: 1_800_000,
    luxury: 4_000_000,
  },

  meals: {
    budget: { breakfast: 80_000, lunch: 250_000, dinner: 250_000 },
    balanced: { breakfast: 150_000, lunch: 450_000, dinner: 450_000 },
    comfort: { breakfast: 250_000, lunch: 800_000, dinner: 800_000 },
    luxury: { breakfast: 450_000, lunch: 1_500_000, dinner: 1_500_000 },
  },

  snackRate: 0.15,

  miscRate: { budget: 0.05, balanced: 0.08, comfort: 0.1, luxury: 0.15 },
  bufferRate: { budget: 0.1, balanced: 0.12, comfort: 0.12, luxury: 0.15 },

  updatedAt: '۱۴۰۴/۰۵',
}

/** ضریب هزینهٔ اقامت بر اساس نوع اقامت انتخابی */
export const LODGING_FACTOR: Record<string, number> = {
  hotel: 1,
  ecolodge: 0.75,
  villa: 1.1,
  camp: 0.1, // فقط هزینهٔ محوطه و امکانات
  friends: 0,
}

export const LODGING_LABEL: Record<string, string> = {
  hotel: 'هتل',
  ecolodge: 'بوم‌گردی',
  villa: 'ویلا / سوئیت',
  camp: 'کمپینگ',
  friends: 'خانهٔ آشنا',
}

export const STYLE_LABEL: Record<string, string> = {
  budget: 'اقتصادی',
  balanced: 'متعادل',
  comfort: 'راحت',
  luxury: 'لوکس',
}

/** ضریب سناریوهای هزینه */
export const SCENARIO = { optimistic: 0.85, likely: 1, pessimistic: 1.25 }

/** ضریب پیچش جاده به تفکیک نوع زمین (فاصلهٔ هوایی ← فاصلهٔ جاده‌ای) */
export const DETOUR_FACTOR = {
  freeway: 1.15,
  plain: 1.25,
  mountain: 1.45,
  dirt: 1.6,
} as const

/** ضریب سرعت به تفکیک نوع زمین */
export const TERRAIN_SPEED = {
  freeway: 1.1,
  plain: 1,
  mountain: 0.75,
  dirt: 0.5,
} as const

/** سرعت پایهٔ برون‌شهری، کیلومتر بر ساعت */
export const BASE_SPEED_KMH = 85

/** ضریب تخفیف سنی بلیت */
export function ticketFactor(age: number): number {
  if (age < 5) return 0
  if (age <= 12) return 0.5
  if (age >= 65) return 0.7
  return 1
}

/** ضریب سنی هزینهٔ خوراک */
export function mealFactor(age: number): number {
  if (age < 6) return 0.4
  if (age <= 12) return 0.7
  return 1
}

/** ضریب سنی هزینهٔ اقامت */
export function lodgingAgeFactor(age: number): number {
  if (age < 3) return 0
  if (age <= 10) return 0.5
  return 1
}

/**
 * ضریب فصل روی قیمت اقامت.
 * نوروز (فروردین) و تعطیلات تابستان گران‌ترند.
 */
export function seasonFactor(month: number, climate: string): number {
  // فروردین ≈ ۲۱ مارس تا ۲۰ آوریل
  if (month === 3 || month === 4) return 1.45
  if ((month === 7 || month === 8) && (climate === 'caspian' || climate === 'mountain')) return 1.3
  if ((month === 12 || month === 1 || month === 2) && climate === 'gulf') return 1.25
  return 1
}

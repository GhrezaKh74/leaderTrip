import type {
  Difficulty,
  GroupProfile,
  POI,
  Traveler,
  TripInput,
  Vehicle,
  WeatherProfile,
} from '../domain/types'
import { distanceToCorridor, haversineKm, type LatLng } from './geo'
import { weatherScoreAdjust, weatherValueFactor } from './climate'
import { BIAS_STRENGTH, type CategoryBias } from './preferences'

/** خلاصهٔ گروه از روی فهرست همسفران */
export function buildGroupProfile(travelers: Traveler[]): GroupProfile {
  if (travelers.length === 0) throw new Error('حداقل یک همسفر لازم است')

  const ages = travelers.map((t) => t.age)
  const minAge = Math.min(...ages)
  const maxAge = Math.max(...ages)
  const avgAge = ages.reduce((a, b) => a + b, 0) / ages.length

  const hasToddler = ages.some((a) => a < 4)
  const hasChild = ages.some((a) => a >= 4 && a <= 12)
  const hasSenior = ages.some((a) => a >= 65)
  const hasLimitedMobility = travelers.some((t) => t.mobility !== 'full')
  const hasWheelchair = travelers.some((t) => t.mobility === 'wheelchair')

  // توان جسمی جمع را ضعیف‌ترین عضو تعیین می‌کند
  let stamina = 1
  for (const t of travelers) {
    let s: number
    if (t.age < 4) s = 0.25
    else if (t.age < 8) s = 0.45
    else if (t.age < 13) s = 0.7
    else if (t.age < 60) s = 1
    else if (t.age < 70) s = 0.65
    else s = 0.4

    if (t.mobility === 'limited') s = Math.min(s, 0.4)
    if (t.mobility === 'wheelchair') s = Math.min(s, 0.15)

    stamina = Math.min(stamina, s)
  }

  let maxDifficulty: Difficulty = 3
  if (stamina < 0.2) maxDifficulty = 0
  else if (stamina < 0.5) maxDifficulty = 1
  else if (stamina < 0.85) maxDifficulty = 2

  return {
    count: travelers.length,
    minAge,
    maxAge,
    avgAge,
    drivers: travelers.filter((t) => t.isDriver).length,
    hasToddler,
    hasChild,
    hasSenior,
    hasLimitedMobility,
    hasWheelchair,
    stamina,
    maxDifficulty,
  }
}

/** ضریب کندشدن سرعت حرکت گروه (توقف‌های بیشتر) */
export function groupSlowdown(g: GroupProfile): number {
  if (g.hasToddler || g.maxAge >= 70) return 0.9
  if (g.hasChild || g.hasSenior) return 0.95
  return 1
}

/** ضریب کش‌آمدن مدت بازدید — همه‌چیز با کودک و سالمند کندتر پیش می‌رود */
export function visitTimeFactor(g: GroupProfile): number {
  const kid = g.hasToddler || g.hasChild
  if (kid && g.hasSenior) return 1.3
  if (kid || g.hasSenior) return 1.2
  return 1
}

// ─────────────────────── قیدهای سخت ───────────────────────

export interface RejectReason {
  poiId: string
  reason: string
}

/**
 * آیا این جاذبه اصلاً برای این سفر قابل بررسی است؟
 * برگرداندن رشته = دلیل رد شدن. برگرداندن null = قبول.
 */
export function hardRejectReason(
  p: POI,
  input: TripInput,
  group: GroupProfile,
  vehicle: Vehicle,
  origin: LatLng,
  destination: LatLng | null,
  tripMonth: number,
): string | null {
  if (input.blockedPoiIds.includes(p.id)) return 'کاربر حذف کرده'

  // سفر چندروزه یعنی رفتن به جایی. جاذبه‌های شهر خودِ مسافر سفر نیستند —
  // هزینهٔ رسیدن به آن‌ها صفر است و اگر کنار نروند، کل برنامه را به خودشان می‌کشند.
  if (p.cityId === input.originCityId && input.days >= 2) return 'در شهر خودتان است'

  if (p.requiresVehicle > vehicle.offroad) {
    return `نیاز به خودروی مناسب‌تر (${p.requiresVehicle === 2 ? 'آفرود' : 'شاسی‌بلند'})`
  }

  if (group.hasWheelchair && p.difficulty >= 2) return 'دسترسی ویلچر ممکن نیست'
  if (p.minAge > group.minAge) return `حداقل سن ${p.minAge} سال`
  if (p.difficulty > group.maxDifficulty) return 'سختی مسیر بیش از توان گروه'
  if (!p.bestMonths.includes(tripMonth)) return 'خارج از فصل مناسب بازدید'

  // فاصله: در حالت مقصد آزاد شعاعی، در حالت مقصد مشخص کریدوری
  if (destination) {
    const detour = distanceToCorridor(p, origin, destination)
    if (detour > Math.max(60, input.radiusKm * 0.5)) return 'خیلی دور از مسیر'
  } else if (haversineKm(origin, p) > input.radiusKm) {
    return 'خارج از شعاع جست‌وجو'
  }

  return null
}

// ─────────────────────── امتیازدهی ───────────────────────

export interface ScoredPOI {
  poi: POI
  score: number
  /** فاصلهٔ هوایی از مبدأ */
  distanceFromOrigin: number
  pinned: boolean
}

/**
 * امتیاز یک جاذبه برای این گروه خاص — نه امتیاز عمومی.
 * مرجع فرمول: docs/05-planner-algorithm.md گام ۲
 */
export function scorePOI(
  p: POI,
  input: TripInput,
  group: GroupProfile,
  origin: LatLng,
  destination: LatLng | null,
  tripMonth: number,
  weather?: WeatherProfile,
  bias?: CategoryBias,
): number {
  let score = 100

  // تطابق با علایق کاربر
  if (input.interests.length > 0 && input.interests.includes(p.cat)) score += 25
  else if (input.interests.length > 0) score -= 8

  // کیفیت عمومی
  score += 12 * (p.rating - 3)

  // تناسب فصل — چند ماه محدود یعنی «الان دقیقاً فصلش است»
  if (p.bestMonths.includes(tripMonth)) {
    score += p.bestMonths.length <= 6 ? 15 : 8
  }

  // تناسب سنی
  if (group.hasToddler || group.hasChild) {
    score += p.kidFriendly ? 10 : -12
    if (p.difficulty >= 2) score -= 15
  }
  if (group.hasSenior) {
    score += p.seniorFriendly ? 10 : -12
    if (p.visitMinutes > 120) score -= 8
  }

  // جریمهٔ سختی نسبت به توان گروه
  score -= 15 * Math.max(0, p.difficulty - group.maxDifficulty + 1)

  // جریمهٔ انحراف از مسیر
  const detour = destination
    ? distanceToCorridor(p, origin, destination)
    : haversineKm(origin, p)
  const detourNorm = Math.min(1, detour / Math.max(1, input.radiusKm))
  score -= 20 * detourNorm

  // جریمهٔ هزینه نسبت به بودجهٔ نفری روزانه
  const perPersonPerDay = input.budgetTotal / Math.max(1, input.travelers.length * input.days)
  if (perPersonPerDay > 0) {
    score -= 10 * Math.min(1, p.ticket / (perPersonPerDay * 0.4))
  }

  // جاذبه‌های رایگان کمی جذاب‌ترند وقتی بودجه تنگ است
  if (p.ticket === 0) score += 4

  // اثر آب‌وهوا — روز بارانی جاذبهٔ سرپوشیده را جلو می‌اندازد
  if (weather) {
    score += weatherScoreAdjust(p, weather)
    score *= weatherValueFactor(p, weather)
  }

  // سلیقهٔ آموخته‌شده از امتیازهای سفرهای قبل — ضربی، تا در برابر فاصله محو نشود
  if (bias?.[p.cat]) score *= 1 + BIAS_STRENGTH * bias[p.cat]!

  // پین کاربر بعد از ضریب جوّی اعمال می‌شود: خواستهٔ صریح کاربر را
  // هوا کم‌رنگ نمی‌کند
  if (input.pinnedPoiIds.includes(p.id)) score += 30

  return score
}

/**
 * جریمهٔ تکرار دسته در یک روز — جلوگیری از «پنج مسجد پشت سر هم».
 * n = چندمین جاذبهٔ این دسته در روز (از صفر)
 */
export function varietyPenalty(nthOfCategory: number): number {
  if (nthOfCategory <= 0) return 1
  if (nthOfCategory === 1) return 0.85
  return 0.7
}

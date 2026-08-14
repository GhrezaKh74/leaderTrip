import type { DayWeather, POI, WeatherMap, WeatherProfile } from '../domain/types'
import { isSnowCode, isStormCode, weatherKey } from '../services/weather'

/**
 * تبدیل دادهٔ خام آب‌وهوا به چیزی که الگوریتم می‌فهمد.
 * این‌جا تنها جایی است که «هوا چطور است» به «برنامه چه فرقی می‌کند» ترجمه می‌شود.
 */

export const HEAT_THRESHOLD = 38
export const FROST_THRESHOLD = 0
export const RAIN_PROB_THRESHOLD = 60
export const WIND_THRESHOLD_KMH = 50

export const NO_WEATHER: WeatherProfile = {
  avgTMax: NaN,
  avgPrecipProb: NaN,
  hasRain: false,
  hasHeat: false,
  hasFrost: false,
  hasSnow: false,
  hasStorm: false,
  source: 'none',
}

/** خلاصهٔ جوّی کل سفر — برای وزن‌دهی به جاذبه‌های سرپوشیده در برابر فضای باز */
export function buildWeatherProfile(days: (DayWeather | undefined)[]): WeatherProfile {
  const known = days.filter((d): d is DayWeather => !!d)
  if (known.length === 0) return NO_WEATHER

  return {
    avgTMax: known.reduce((s, d) => s + d.tMax, 0) / known.length,
    avgPrecipProb: known.reduce((s, d) => s + d.precipProb, 0) / known.length,
    hasRain: known.some((d) => d.precipProb >= RAIN_PROB_THRESHOLD),
    hasHeat: known.some((d) => d.tMax >= HEAT_THRESHOLD),
    hasFrost: known.some((d) => d.tMin <= FROST_THRESHOLD),
    hasSnow: known.some((d) => isSnowCode(d.code)),
    hasStorm: known.some((d) => isStormCode(d.code) || d.windMaxKmh >= WIND_THRESHOLD_KMH),
    source: known.every((d) => d.source === 'forecast') ? 'forecast' : 'historical',
  }
}

/**
 * اثر آب‌وهوا بر امتیاز یک جاذبه.
 * روز بارانی جاذبهٔ سرپوشیده را جلو می‌اندازد؛ گرمای شدید بازدیدهای طولانی
 * در فضای باز را عقب می‌راند.
 */
export function weatherScoreAdjust(p: POI, w: WeatherProfile): number {
  if (w.source === 'none') return 0

  let adjust = 0

  if (w.avgPrecipProb >= RAIN_PROB_THRESHOLD) {
    adjust += p.indoor ? 18 : -18
  } else if (w.avgPrecipProb >= 35) {
    adjust += p.indoor ? 8 : -8
  }

  if (w.avgTMax >= HEAT_THRESHOLD) {
    if (p.indoor) adjust += 12
    else if (p.visitMinutes > 90) adjust -= 15
    else adjust -= 6
    // در گرما آب دوست‌داشتنی می‌شود
    if (p.cat === 'lake' || p.cat === 'waterfall' || p.cat === 'beach' || p.cat === 'cave') {
      adjust += 12
    }
  }

  if (w.avgTMax <= 5 && !p.indoor) adjust -= 10
  if (w.hasSnow && p.difficulty >= 2) adjust -= 20

  return adjust
}

/**
 * ضریب ارزش جاذبه در هوای بد — **ضربی، نه جمعی**.
 *
 * چرا ضربی: انتخاب جاذبه‌ها بر پایهٔ «امتیاز به ازای دقیقهٔ اضافه‌شده» است، پس یک
 * پاداش جمعیِ ۲۰ امتیازی در برابر دو برابر شدن زمان رسیدن هیچ شانسی ندارد.
 * نصف‌شدن ارزشِ یک بازدید در فضای باز اما دقیقاً هم‌وزن دو برابر شدن مسافت است —
 * و همین است که در روز بارانی برنامه را واقعاً به سمت جاذبه‌های سرپوشیده می‌چرخاند.
 */
export function weatherValueFactor(p: POI, w: WeatherProfile): number {
  if (w.source === 'none') return 1

  let factor = 1

  if (w.avgPrecipProb >= RAIN_PROB_THRESHOLD) {
    factor *= p.indoor ? 1.3 : 0.6
  } else if (w.avgPrecipProb >= 35) {
    factor *= p.indoor ? 1.12 : 0.85
  }

  if (w.avgTMax >= HEAT_THRESHOLD && !p.indoor) {
    // هرچه بازدید طولانی‌تر، آفتاب بی‌رحم‌تر
    factor *= p.visitMinutes > 90 ? 0.65 : 0.85
  }

  if (w.hasSnow && p.difficulty >= 2) factor *= 0.5

  return factor
}

/**
 * ضریب کندشدن رانندگی به‌خاطر شرایط جوی.
 * این ضریب واقعاً برنامه را عوض می‌کند: در برف مسیر کمتری در روز جا می‌شود.
 */
export function weatherSpeedFactor(w: DayWeather | undefined): number {
  if (!w) return 1
  if (isSnowCode(w.code)) return 0.7
  if (isStormCode(w.code) || w.windMaxKmh >= WIND_THRESHOLD_KMH) return 0.8
  if (w.precipMm >= 10) return 0.85
  if (w.precipProb >= RAIN_PROB_THRESHOLD) return 0.92
  return 1
}

/**
 * جابه‌جایی پنجرهٔ ساعات مفید روز بر اساس هوا.
 * گرمای شدید ⇒ زودتر شروع کن. یخبندان ⇒ دیرتر، تا جاده باز شود.
 */
export function weatherWindowShift(w: DayWeather | undefined): { start: number; end: number } {
  if (!w) return { start: 0, end: 0 }
  if (w.tMax >= HEAT_THRESHOLD) return { start: -90, end: 0 }
  if (w.tMin <= FROST_THRESHOLD) return { start: 60, end: -30 }
  return { start: 0, end: 0 }
}

/** آیا این روز به استراحت نیم‌روزی اجباری نیاز دارد؟ */
export function needsSiesta(w: DayWeather | undefined): boolean {
  return !!w && w.tMax >= HEAT_THRESHOLD
}

/**
 * آب‌وهوای یک شهر در یک تاریخ.
 *
 * داده بر پایهٔ پیش‌نویس برنامه گرفته می‌شود، ولی چون خودِ آب‌وهوا سرعت را
 * عوض می‌کند، شهر پایهٔ روز ممکن است در اجرای دوم جابه‌جا شود. در آن صورت
 * به دادهٔ همان تاریخ در نزدیک‌ترین شهرِ موجود برمی‌گردیم — هوای یک منطقه
 * در یک روز تفاوت فاحشی ندارد، و این بهتر از بی‌آب‌وهوا ماندن آن روز است.
 */
export function pickDayWeather(
  weather: WeatherMap | undefined,
  cityId: string,
  date: string,
): DayWeather | undefined {
  if (!weather) return undefined

  const exact = weather[weatherKey(cityId, date)]
  if (exact) return exact

  for (const [key, value] of Object.entries(weather)) {
    if (key.endsWith(`|${date}`)) return value
  }
  return undefined
}

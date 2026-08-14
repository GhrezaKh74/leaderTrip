/**
 * محاسبهٔ طلوع و غروب خورشید (الگوریتم NOAA ساده‌شده).
 * دقت حدود ±۲ دقیقه — برای برنامه‌ریزی سفر کاملاً کافی است.
 */

const toRad = (d: number) => (d * Math.PI) / 180
const toDeg = (r: number) => (r * 180) / Math.PI

/** شمارهٔ روز در سال، ۱ تا ۳۶۶ */
function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000)
}

export interface SunTimes {
  /** دقیقه از نیمه‌شب، به وقت محلی ایران */
  sunriseMin: number
  sunsetMin: number
  daylightMin: number
}

/**
 * ایران یک منطقهٔ زمانی دارد (UTC+3:30)، پس طول جغرافیایی
 * باعث اختلاف واقعی طلوع بین شرق و غرب کشور می‌شود — که همین‌جا لحاظ شده است.
 */
const IRAN_TZ_OFFSET_HOURS = 3.5

export function sunTimes(date: Date, lat: number, lng: number): SunTimes {
  const n = dayOfYear(date)

  // زاویهٔ میل خورشید
  const decl = 23.45 * Math.sin(toRad((360 / 365) * (n - 81)))

  // معادلهٔ زمان (دقیقه)
  const b = toRad((360 / 364) * (n - 81))
  const eqTime = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b)

  // زاویهٔ ساعتی طلوع
  const cosH =
    -Math.tan(toRad(lat)) * Math.tan(toRad(decl)) -
    Math.sin(toRad(0.833)) / (Math.cos(toRad(lat)) * Math.cos(toRad(decl)))

  // عرض‌های قطبی — در ایران رخ نمی‌دهد ولی محافظ لازم است
  if (cosH > 1) return { sunriseMin: 0, sunsetMin: 0, daylightMin: 0 }
  if (cosH < -1) return { sunriseMin: 0, sunsetMin: 1439, daylightMin: 1439 }

  const h = toDeg(Math.acos(cosH)) / 15 // ساعت

  const solarNoon = 12 - lng / 15 + IRAN_TZ_OFFSET_HOURS - eqTime / 60

  const sunrise = (solarNoon - h) * 60
  const sunset = (solarNoon + h) * 60

  return {
    sunriseMin: Math.round(sunrise),
    sunsetMin: Math.round(sunset),
    daylightMin: Math.round(sunset - sunrise),
  }
}

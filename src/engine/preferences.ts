import type { POICategory, TripJournal } from '../domain/types'
import { POI_BY_ID } from '../data/pois'

/**
 * یادگیری از بازخورد کاربر.
 *
 * فاز ۴ امتیاز شخصی هر توقف را جمع کرد؛ این‌جا از همان استفاده می‌شود:
 * اگر کسی به آبشارها همیشه ۵ می‌دهد و به موزه‌ها ۲، سفر بعدی‌اش باید
 * آبشار بیشتری داشته باشد.
 *
 * عمداً محافظه‌کار است: با کمتر از سه نمونه در یک دسته هیچ نتیجه‌ای گرفته
 * نمی‌شود، و سقف اثرش هم محدود است — سلیقهٔ گذشته نباید کل برنامه را برباید.
 */

export type CategoryBias = Partial<Record<POICategory, number>>

const MIN_SAMPLES = 3

/**
 * شدت اثر سلیقه — **ضربی**، نه جمعی.
 *
 * همان درسی که در آب‌وهوا گرفتیم: انتخاب جاذبه بر پایهٔ «امتیاز به ازای دقیقهٔ
 * اضافه‌شده» است، پس یک پاداش جمعی در برابر فاصله محو می‌شود. ۰٫۲۵ یعنی
 * دسته‌ای که کاربر عاشقش است تا ۲۵٪ ارزشمندتر حساب می‌شود — کافی برای
 * جابه‌جا کردن انتخاب، کم‌تر از آنکه کل برنامه را برباید.
 */
export const BIAS_STRENGTH = 0.25

export function learnPreferences(journals: TripJournal[]): CategoryBias {
  const sum = new Map<POICategory, number>()
  const count = new Map<POICategory, number>()

  for (const journal of journals) {
    for (const [key, checkIn] of Object.entries(journal.checkIns)) {
      if (typeof checkIn.rating !== 'number') continue
      if (!key.startsWith('visit:')) continue

      const poi = POI_BY_ID.get(key.slice('visit:'.length))
      if (!poi) continue

      sum.set(poi.cat, (sum.get(poi.cat) ?? 0) + checkIn.rating)
      count.set(poi.cat, (count.get(poi.cat) ?? 0) + 1)
    }
  }

  const bias: CategoryBias = {}
  for (const [cat, n] of count) {
    if (n < MIN_SAMPLES) continue
    const avg = sum.get(cat)! / n
    // میانگین ۳ یعنی خنثی؛ ۵ یعنی +۱ و ۱ یعنی −۱
    bias[cat] = Math.max(-1, Math.min(1, (avg - 3) / 2))
  }
  return bias
}

/** خلاصهٔ خوانا برای نمایش — «چه چیزی یاد گرفته‌ایم» */
export function describeBias(bias: CategoryBias): { liked: POICategory[]; disliked: POICategory[] } {
  const entries = Object.entries(bias) as [POICategory, number][]
  return {
    liked: entries.filter(([, v]) => v >= 0.34).map(([c]) => c),
    disliked: entries.filter(([, v]) => v <= -0.34).map(([c]) => c),
  }
}

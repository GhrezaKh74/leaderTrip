import { parseTripForm, type TripForm } from '../wizard/tripSchema'

/**
 * اشتراک‌گذاری و خروجی سفر.
 *
 * <p><b>آنچه به اشتراک گذاشته می‌شود ورودی است، نه خروجی.</b> برنامهٔ ساخته‌شده
 * چند ده کیلوبایت است و با به‌روزشدن قیمت‌ها کهنه می‌شود؛ ورودی چند صد بایت
 * است و گیرنده با همان، برنامه را با قیمت‌های امروز می‌سازد. یعنی لینکی که
 * ماه پیش فرستادید، امروز هم عدد درست می‌دهد.</p>
 */

const SHARE_PARAM = 'trip'

/** ورودی سفر → رشتهٔ فشرده و امن برای URL. */
export function encodeTrip(input: TripForm): string {
  const json = JSON.stringify(input)
  const bytes = new TextEncoder().encode(json)

  // `btoa` فقط با بایت‌های لاتین کار می‌کند و نام فارسی همسفران را می‌شکند؛
  // پس ابتدا به بایت و بعد به Base64 تبدیل می‌شود.
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

/** رشتهٔ لینک → ورودی سفر، یا `null` اگر خراب یا از نسخهٔ ناسازگار بود. */
export function decodeTrip(encoded: string): TripForm | null {
  try {
    const base64 = encoded.replaceAll('-', '+').replaceAll('_', '/')
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    // لینک خراب بی‌صدا رد می‌شود و کاربر ویزارد خالی می‌بیند — بهتر از فرمی
    // که با مقادیر نیمه‌معتبر پر شده باشد. لینکِ نسخه‌های قبل (بدون مقصد) اما
    // باز می‌شود: parseTripForm فیلدهای تازه را پیش‌فرض می‌گذارد.
    return parseTripForm(JSON.parse(new TextDecoder().decode(bytes)))
  } catch {
    return null
  }
}

export function shareUrl(input: TripForm): string {
  const url = new URL(window.location.href)
  url.hash = ''
  url.searchParams.set(SHARE_PARAM, encodeTrip(input))

  return url.toString()
}

/** ورودی سفر از نشانی صفحه، اگر لینک اشتراکی باشد. */
export function tripFromUrl(): TripForm | null {
  if (typeof window === 'undefined') return null

  const encoded = new URLSearchParams(window.location.search).get(SHARE_PARAM)

  return encoded === null ? null : decodeTrip(encoded)
}

/** پاک‌کردن پارامتر اشتراک از نشانی، بدون بارگذاری دوباره. */
export function clearShareParam(): void {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)

  if (!url.searchParams.has(SHARE_PARAM)) return

  url.searchParams.delete(SHARE_PARAM)
  window.history.replaceState(null, '', url.toString())
}

/** دانلود ورودی سفر به‌صورت فایل JSON. */
export function downloadTrip(input: TripForm, fileName = 'leadertrip.json'): void {
  const blob = new Blob([JSON.stringify(input, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = fileName
  anchor.click()

  URL.revokeObjectURL(url)
}

/** خواندن ورودی سفر از فایل انتخاب‌شده. */
export async function readTripFile(file: File): Promise<TripForm | null> {
  try {
    return parseTripForm(JSON.parse(await file.text()))
  } catch {
    return null
  }
}

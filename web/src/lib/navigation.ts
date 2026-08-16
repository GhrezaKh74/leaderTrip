/**
 * پیوند به مسیریاب‌ها — از برنامهٔ ما تا پشت فرمان.
 *
 * <p>سه در خروجی، چون سه دنیای واقعی هست: گوگل‌مپس (فراگیرترین)، ویز
 * (ترافیک زنده)، و «اپ نقشهٔ گوشی» با URI استاندارد <code>geo:</code> که روی
 * اندروید فهرست همهٔ نقشه‌های نصب‌شده را باز می‌کند — از جمله نشان و بلد که
 * نقشهٔ ایرانشان دقیق‌تر است. لینک مستقیم نشان/بلد عمداً نیست: قالب URLشان
 * مستند و پایدار نیست و لینکی که نصفه باز شود بدتر از نبودنش است؛
 * <code>geo:</code> همان کار را با قرارداد رسمی می‌کند.</p>
 */

export interface NavPoint {
  lat: number
  lng: number
  name?: string
}

const point = ({ lat, lng }: NavPoint): string => `${lat.toFixed(6)},${lng.toFixed(6)}`

/** مسیریابی گوگل‌مپس؛ بدون مبدأ، از موقعیت فعلی کاربر حساب می‌شود. */
export function googleMapsDirections(destination: NavPoint, origin?: NavPoint): string {
  const params = new URLSearchParams({
    api: '1',
    destination: point(destination),
    travelmode: 'driving',
  })

  if (origin !== undefined) params.set('origin', point(origin))

  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/** ویز، مستقیم در حالت ناوبری. */
export function wazeNavigation(destination: NavPoint): string {
  return `https://waze.com/ul?ll=${point(destination)}&navigate=yes`
}

/**
 * URI استاندارد geo: — اندروید فهرست نقشه‌های نصب‌شده را باز می‌کند
 * (نشان، بلد، گوگل‌مپس…). روی دسکتاپ معمولاً گیرنده‌ای ندارد.
 */
export function geoUri(destination: NavPoint): string {
  const q = destination.name === undefined ? point(destination) : `${point(destination)}(${destination.name})`

  return `geo:${point(destination)}?q=${encodeURIComponent(q)}`
}

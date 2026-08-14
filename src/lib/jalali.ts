/**
 * تبدیل تاریخ شمسی ↔ میلادی.
 * پیاده‌سازی مستقیم الگوریتم استاندارد تقویم جلالی — بدون وابستگی بیرونی.
 */

const breaks = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 1701, 1866, 2020, 2369, 2394, 2456,
  3178,
]

interface JalaliCal {
  leap: number
  gy: number
  march: number
}

function jalCal(jy: number): JalaliCal {
  const bl = breaks.length
  const gy = jy + 621
  let leapJ = -14
  let jp = breaks[0]

  if (jy < jp || jy >= breaks[bl - 1]) throw new Error('سال شمسی خارج از محدودهٔ پشتیبانی')

  let jump = 0
  for (let i = 1; i < bl; i += 1) {
    const jm = breaks[i]
    jump = jm - jp
    if (jy < jm) break
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4)
    jp = jm
  }
  let n = jy - jp

  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4)
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150
  const march = 20 + leapJ - leapG

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33
  let leap = mod(mod(n + 1, 33) - 1, 4)
  if (leap === -1) leap = 4

  return { leap, gy, march }
}

const div = (a: number, b: number) => ~~(a / b)
const mod = (a: number, b: number) => a - ~~(a / b) * b

/** شمارهٔ روز ژولیَن از تاریخ میلادی */
function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752
  return d
}

/** تاریخ میلادی از شمارهٔ روز ژولیَن */
function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908
  const i = div(mod(j, 1461), 4) * 5 + 308
  const gd = div(mod(i, 153), 5) + 1
  const gm = mod(div(i, 153), 12) + 1
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6)
  return { gy, gm, gd }
}

export interface JalaliDate {
  jy: number
  jm: number
  jd: number
}

export function toJalali(date: Date): JalaliDate {
  const gy = date.getFullYear()
  const gm = date.getMonth() + 1
  const gd = date.getDate()
  const jdn = g2d(gy, gm, gd)

  let jy = gy - 621
  const r = jalCal(jy)
  const jdn1f = g2d(gy, 3, r.march)
  let k = jdn - jdn1f

  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 }
    k -= 186
  } else {
    jy -= 1
    k += 179
    // r.leap شمار سال‌های گذشته از آخرین سال کبیسه است؛ مقدار ۱ یعنی سال قبل کبیسه بوده
    if (r.leap === 1) k += 1
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 }
}

export function toGregorian(jy: number, jm: number, jd: number): Date {
  const r = jalCal(jy)
  const jdn =
    g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1
  const g = d2g(jdn)
  return new Date(g.gy, g.gm - 1, g.gd)
}

export const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
]

export const WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه']

/** نام روز هفته برای یک تاریخ میلادی */
export function weekdayName(date: Date): string {
  return WEEKDAYS[date.getDay()]
}

/** «۲۵ مرداد ۱۴۰۴» */
export function formatJalali(date: Date, withWeekday = false): string {
  const { jy, jm, jd } = toJalali(date)
  const base = `${toFa(jd)} ${JALALI_MONTHS[jm - 1]} ${toFa(jy)}`
  return withWeekday ? `${weekdayName(date)} ${base}` : base
}

/** «۱۴۰۴/۰۵/۲۵» */
export function formatJalaliShort(date: Date): string {
  const { jy, jm, jd } = toJalali(date)
  return `${toFa(jy)}/${toFa(String(jm).padStart(2, '0'))}/${toFa(String(jd).padStart(2, '0'))}`
}

/** تبدیل ارقام لاتین به فارسی */
export function toFa(v: string | number): string {
  return String(v).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
}

/** آیا این تاریخ در بازهٔ تعطیلات نوروز است؟ */
export function isNowruzPeriod(date: Date): boolean {
  const { jm, jd } = toJalali(date)
  return (jm === 1 && jd <= 15) || (jm === 12 && jd >= 25)
}

/** تاریخ ISO محلی (بدون اثر منطقهٔ زمانی) */
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

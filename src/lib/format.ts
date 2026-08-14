import { toFa } from './jalali'

export { toFa }

/** جداکنندهٔ هزارگان + ارقام فارسی */
export function faNum(n: number, digits = 0): string {
  const rounded = digits > 0 ? n.toFixed(digits) : String(Math.round(n))
  const [int, frac] = rounded.split('.')
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, '٬')
  return toFa(frac ? `${withSep}.${frac}` : withSep)
}

/** «۲٬۴۵۰٬۰۰۰ تومان» */
export function toman(n: number): string {
  return `${faNum(Math.round(n))} تومان`
}

/**
 * مبلغ خوانا برای اعداد بزرگ: «۲۴٫۵ میلیون تومان»
 * زیر یک میلیون به‌صورت کامل نمایش داده می‌شود.
 */
export function tomanShort(n: number): string {
  const v = Math.round(n)
  if (v >= 1_000_000_000) return `${faNum(v / 1_000_000_000, 1)} میلیارد تومان`
  if (v >= 1_000_000) return `${faNum(v / 1_000_000, 1)} میلیون تومان`
  if (v >= 1_000) return `${faNum(v / 1_000)} هزار تومان`
  return toman(v)
}

/** «۳ ساعت و ۲۵ دقیقه» */
export function duration(minutes: number): string {
  const m = Math.round(minutes)
  const h = Math.floor(m / 60)
  const rest = m % 60
  if (h === 0) return `${faNum(rest)} دقیقه`
  if (rest === 0) return `${faNum(h)} ساعت`
  return `${faNum(h)} ساعت و ${faNum(rest)} دقیقه`
}

/** دقیقه از نیمه‌شب → «۰۸:۳۰» */
export function clock(minutesFromMidnight: number): string {
  const total = ((Math.round(minutesFromMidnight) % 1440) + 1440) % 1440
  const h = Math.floor(total / 60)
  const m = total % 60
  return toFa(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
}

/** «۳۲۰ کیلومتر» */
export function km(v: number): string {
  return `${faNum(Math.round(v))} کیلومتر`
}

/** «۲۴٪» */
export function percent(fraction: number): string {
  return `${faNum(Math.round(fraction * 100))}٪`
}

/** درجهٔ سلسیوس */
export function celsius(v: number): string {
  return `${faNum(Math.round(v))}°`
}

/** توصیف گروه سنی برای نمایش */
export function ageLabel(age: number): string {
  if (age < 3) return 'نوپا'
  if (age < 13) return 'کودک'
  if (age < 18) return 'نوجوان'
  if (age >= 65) return 'سالمند'
  return 'بزرگسال'
}

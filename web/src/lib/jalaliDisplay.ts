import { formatJalali, fromISODate } from './jalali'

/**
 * تاریخ ISO میلادی → متن شمسی، با تحمل ورودی ناقص.
 *
 * ورودی `type="date"` می‌تواند وسط تایپ کاربر رشتهٔ نیمه‌کاره بدهد. پرتاب خطا
 * در آن لحظه یعنی کل فرم سفید شود؛ رشتهٔ خالی یعنی راهنمای زیر فیلد موقتاً
 * ناپدید شود و بس.
 */
export function formatJalaliFromIso(iso: string, withWeekday = true): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ' '

  const date = fromISODate(iso)

  return Number.isNaN(date.getTime()) ? ' ' : formatJalali(date, withWeekday)
}

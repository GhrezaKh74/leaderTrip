import { z } from 'zod'

import { poiCategorySchema, type PoiCategory } from '../../api/schemas'

/**
 * دفترچهٔ حین سفر — چک‌این‌ها، هزینه‌های واقعی و امتیازها.
 *
 * <p>دفترچه روی همان دستگاه می‌ماند. نگه‌داشتنش سمت سرور یعنی حساب کاربری، و
 * حساب کاربری یعنی دادهٔ شخصیِ سفر روی سرور ما — بهایی که این ویژگی به تنهایی
 * توجیهش نمی‌کند. سفرِ گروهی و همگام‌سازی، وقتی هویت داشتیم.</p>
 *
 * <p>یک استثنای صریح: <b>عکس چک‌این</b> روی سرور ذخیره می‌شود (در localStorage
 * جا نمی‌شود) — ولی فقط بایت‌های عکس. سرور نمی‌داند عکس مال کدام سفر و کدام
 * توقف است؛ آن پیوند فقط در همین دفترچهٔ محلی است.</p>
 */

export const checkInSchema = z.object({
  poiId: z.string(),
  /** ساعت واقعی رسیدن، «HH:mm». */
  arrivedAt: z.string(),
  note: z.string().max(500).optional(),
  /** امتیاز ۱ تا ۵ — پایهٔ یادگیری سلیقه. */
  rating: z.number().int().min(1).max(5).optional(),
  category: poiCategorySchema.optional(),
  /** شناسهٔ عکس ذخیره‌شده روی سرور؛ خودِ عکس هرگز این‌جا نیست. */
  photoId: z.string().optional(),
})

export const expenseSchema = z.object({
  id: z.string(),
  label: z.string().max(80),
  amount: z.number().min(0),
  /** شناسهٔ همسفری که پرداخت کرده. */
  paidBy: z.string(),
  /** شناسهٔ همسفرانی که سهم دارند؛ خالی یعنی همه. */
  sharedBy: z.array(z.string()),
})

export const journalSchema = z.object({
  tripId: z.string(),
  checkIns: z.array(checkInSchema),
  expenses: z.array(expenseSchema),
})

export type CheckIn = z.infer<typeof checkInSchema>
export type Expense = z.infer<typeof expenseSchema>
export type Journal = z.infer<typeof journalSchema>

const STORAGE_KEY = 'leadertrip.journal.v1'

export const emptyJournal = (tripId: string): Journal => ({ tripId, checkIns: [], expenses: [] })

export function loadJournal(tripId: string): Journal {
  if (typeof localStorage === 'undefined') return emptyJournal(tripId)

  const raw = localStorage.getItem(STORAGE_KEY)

  if (raw === null) return emptyJournal(tripId)

  try {
    const parsed = journalSchema.safeParse(JSON.parse(raw))

    // دفترچهٔ سفرِ دیگر نباید روی این سفر بنشیند: هزینه‌های سفر قبل در گزارش
    // امروز، بدتر از نداشتن گزارش است.
    return parsed.success && parsed.data.tripId === tripId ? parsed.data : emptyJournal(tripId)
  } catch {
    return emptyJournal(tripId)
  }
}

export function saveJournal(journal: Journal): void {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(journal))
  } catch {
    // سهمیهٔ حافظه پر است — از دست‌رفتن دفترچه بد است، ولی از کار افتادن صفحه بدتر.
  }
}

/**
 * سلیقهٔ آموخته‌شده از امتیازها.
 *
 * <p>امتیاز ۱ تا ۵ به بازهٔ ‎−۱ تا ۱ نگاشت می‌شود: ۳ یعنی خنثی. میانگین هر دسته
 * گرفته می‌شود، و دسته‌ای که کمتر از دو امتیاز دارد اصلاً وارد نمی‌شود — یک
 * بازدیدِ بد در یک روز بارانی، «من از موزه بدم می‌آید» نیست.</p>
 */
export function learnedTaste(journal: Journal): Record<string, number> {
  const byCategory = new Map<PoiCategory, number[]>()

  for (const checkIn of journal.checkIns) {
    if (checkIn.rating === undefined || checkIn.category === undefined) continue

    byCategory.set(checkIn.category, [...(byCategory.get(checkIn.category) ?? []), checkIn.rating])
  }

  const taste: Record<string, number> = {}

  for (const [category, ratings] of byCategory) {
    if (ratings.length < 2) continue

    const average = ratings.reduce((sum, r) => sum + r, 0) / ratings.length

    taste[category] = Math.max(-1, Math.min(1, (average - 3) / 2))
  }

  return taste
}

/** اختلاف ساعت واقعی با برنامه، به دقیقه. مثبت یعنی دیرتر. */
export function driftMinutes(planned: string, actual: string): number | null {
  const toMinutes = (value: string): number | null => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value)

    if (match === null) return null

    return Number(match[1]) * 60 + Number(match[2])
  }

  const a = toMinutes(planned)
  const b = toMinutes(actual)

  return a === null || b === null ? null : b - a
}

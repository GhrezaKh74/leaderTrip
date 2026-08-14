import type { ActualLine, ActualsReport, Expense, ExpenseCategory, TripPlan } from '../domain/types'

/**
 * گزارش «تخمین در برابر واقعیت».
 *
 * ارزش اصلی این گزارش برای سفر بعدی است: اگر همیشه خوراک را کم تخمین می‌زنید،
 * دفعهٔ بعد ضریب خوراک را در قیمت‌های پایه بالا ببرید. برای همین مقایسه
 * دسته‌به‌دسته است، نه فقط یک عدد کل.
 */

export const EXPENSE_LABEL: Record<ExpenseCategory, string> = {
  fuel: 'سوخت',
  toll: 'عوارض آزادراه',
  lodging: 'اقامت',
  meals: 'وعده‌های غذایی',
  snacks: 'تنقلات بین‌راهی',
  tickets: 'بلیت جاذبه‌ها',
  other: 'سایر',
}

export const EXPENSE_ICON: Record<ExpenseCategory, string> = {
  fuel: '⛽',
  toll: '🛣️',
  lodging: '🛏️',
  meals: '🍽️',
  snacks: '🥤',
  tickets: '🎟️',
  other: '📦',
}

const CATEGORIES: ExpenseCategory[] = [
  'fuel',
  'toll',
  'lodging',
  'meals',
  'snacks',
  'tickets',
  'other',
]

export function buildActualsReport(plan: TripPlan, expenses: Expense[]): ActualsReport {
  const actualByCat = new Map<ExpenseCategory, number>()
  for (const e of expenses) {
    if (e.amount <= 0) continue
    actualByCat.set(e.category, (actualByCat.get(e.category) ?? 0) + e.amount)
  }

  const estimateByKey = new Map(plan.cost.lines.map((l) => [l.key, l.amount]))

  const lines: ActualLine[] = CATEGORIES.map((cat) => {
    // «سایر» در تخمین معادلی ندارد؛ متفرقه و بافر ریسک نقش همان را بازی می‌کنند
    const estimated =
      cat === 'other' ? plan.cost.misc + plan.cost.buffer : (estimateByKey.get(cat) ?? 0)
    const actual = actualByCat.get(cat) ?? 0
    return {
      key: cat,
      label: EXPENSE_LABEL[cat],
      estimated,
      actual,
      delta: actual - estimated,
    }
  })

  const hasData = expenses.some((e) => e.amount > 0)

  // اهلاک خودرو هزینهٔ نقدی نیست و کسی آن را حین سفر پرداخت نمی‌کند،
  // ولی در جمع تخمین هست — پس در مقایسه هم باید دیده شود، وگرنه واقعیت
  // به‌ناحق ارزان‌تر به نظر می‌رسد. تا وقتی هیچ داده‌ای ثبت نشده، این ردیف
  // هم نمی‌آید؛ وگرنه گزارشِ خالی، «واقعیِ» غیرصفر نشان می‌دهد.
  const depreciation = estimateByKey.get('depreciation') ?? 0
  if (hasData && depreciation > 0) {
    lines.push({
      key: 'depreciation',
      label: 'اهلاک خودرو (غیرنقدی)',
      estimated: depreciation,
      actual: depreciation,
      delta: 0,
    })
  }

  const totalEstimated = lines.reduce((s, l) => s + l.estimated, 0)
  const totalActual = lines.reduce((s, l) => s + l.actual, 0)
  const daysRecorded = new Set(expenses.filter((e) => e.amount > 0).map((e) => e.day)).size

  return {
    lines,
    totalEstimated,
    totalActual,
    delta: totalActual - totalEstimated,
    daysRecorded,
    hasData,
  }
}

/**
 * اختلاف زمان واقعی رسیدن با زمان برنامه‌ریزی‌شده، به دقیقه.
 * مثبت = دیرتر از برنامه.
 */
export function scheduleDrift(plannedStartMin: number, checkInAt: string): number {
  const at = new Date(checkInAt)
  const actualMin = at.getHours() * 60 + at.getMinutes()
  return actualMin - plannedStartMin
}

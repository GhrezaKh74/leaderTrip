import { useMemo } from 'react'
import type { TripInput, TripPlan, WeatherMap } from '../../domain/types'
import { budgetLevers } from '../../engine/optimizer'
import { percent, tomanShort } from '../../lib/format'

/**
 * راه‌های کاهش هزینه.
 *
 * هیچ‌کدام خودکار اعمال نمی‌شود — عدد صرفه‌جویی نشان داده می‌شود و انتخاب با کاربر است.
 * صرفه‌جویی‌ها از اجرای دوبارهٔ برنامه‌ریز می‌آیند، پس دقیق‌اند نه تقریبی.
 */
export function OptimizerPanel({
  plan,
  weather,
  onApply,
}: {
  plan: TripPlan
  weather?: WeatherMap
  onApply: (patch: Partial<TripInput>) => void
}) {
  const levers = useMemo(() => budgetLevers(plan, weather), [plan, weather])
  const over = plan.cost.overBudget > 0

  if (levers.length === 0) return null

  return (
    <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
      <h3 className="text-sm font-bold">راه‌های کاهش هزینه</h3>
      <p className="mt-1 text-[11px] text-ink-500">
        {over
          ? `برای رسیدن به بودجه، ${tomanShort(plan.cost.overBudget)} باید کم شود.`
          : 'زیر بودجه هستید؛ این‌ها فقط برای اطلاع است.'}{' '}
        عددها از ساختِ دوبارهٔ برنامه با همان تغییر به‌دست آمده‌اند.
      </p>

      <ul className="mt-4 space-y-2">
        {levers.map((lever) => {
          const enough = over && lever.saving >= plan.cost.overBudget
          return (
            <li
              key={lever.id}
              className="rounded-xl border border-ink-200 p-3 dark:border-ink-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{lever.title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500">{lever.detail}</p>
                </div>
                <div className="shrink-0 text-left">
                  <p className="text-sm font-bold text-brand-700 dark:text-brand-300">
                    −{tomanShort(lever.saving)}
                  </p>
                  <p className="text-[10px] text-ink-400">
                    {percent(lever.saving / plan.cost.total)} از کل
                  </p>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => onApply(lever.patch)}
                >
                  اعمال کن
                </button>
                {enough && (
                  <span className="badge bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200">
                    ✓ همین یکی کافی است
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

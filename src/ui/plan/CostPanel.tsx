import { useState } from 'react'
import type { PriceBook, TripPlan } from '../../domain/types'
import { splitCost } from '../../engine/cost'
import { DEFAULT_PRICES } from '../../data/pricing'
import { faNum, percent, toman, tomanShort } from '../../lib/format'

/**
 * تفکیک هزینه: یک سری مقادیر بزرگی — پس میلهٔ افقی با یک رنگ،
 * برچسب مستقیم روی هر میله و بدون راهنمای رنگ.
 * رنگ‌ها با اسکریپت اعتبارسنجی برای هر دو حالت روشن و تاریک بررسی شده‌اند.
 */
const BAR_LIGHT = '#047655'
const BAR_DARK = '#059468'
const STATUS = { good: '#0ca30c', critical: '#d03b3b', warning: '#fab219' }

export function CostPanel({
  plan,
  onPriceChange,
}: {
  plan: TripPlan
  onPriceChange: (patch: Partial<PriceBook>) => void
}) {
  const [open, setOpen] = useState<string | null>(null)
  const [showPrices, setShowPrices] = useState(false)

  const { cost } = plan
  const rows = [
    ...cost.lines,
    { key: 'misc', label: 'متفرقه', amount: cost.misc, formula: 'سوغات، پارکینگ، انعام و خرده‌خرج‌ها' },
    {
      key: 'buffer',
      label: 'بافر ریسک',
      amount: cost.buffer,
      formula: 'ذخیره برای اتفاق‌های پیش‌بینی‌نشده — پنچری، تغییر برنامه، گران‌تر بودن قیمت‌ها',
    },
  ]
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  const max = Math.max(...rows.map((r) => r.amount), 1)
  const over = cost.overBudget > 0
  const budgetRatio = plan.input.budgetTotal > 0 ? cost.total / plan.input.budgetTotal : 0

  return (
    <div className="space-y-5">
      {/* عدد اصلی */}
      <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
        <p className="text-xs text-ink-500">برآورد هزینهٔ کل سفر</p>
        <p className="mt-1 text-3xl font-bold tracking-tight">{tomanShort(cost.total)}</p>
        <p className="mt-1 text-sm text-ink-500">
          نفری {tomanShort(cost.perPerson)} · بازهٔ محتمل {tomanShort(cost.optimistic)} تا{' '}
          {tomanShort(cost.pessimistic)}
        </p>

        {plan.input.budgetTotal > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-ink-500">بودجهٔ شما: {tomanShort(plan.input.budgetTotal)}</span>
              <span
                className="inline-flex items-center gap-1 font-medium"
                style={{ color: over ? STATUS.critical : STATUS.good }}
              >
                <span aria-hidden>{over ? '⚠' : '✓'}</span>
                {over
                  ? `${tomanShort(cost.overBudget)} بیشتر از بودجه`
                  : `${tomanShort(-cost.overBudget)} باقی می‌ماند`}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, budgetRatio * 100)}%`,
                  background: over ? STATUS.critical : 'var(--bar)',
                }}
              />
            </div>
            <p className="mt-1 text-[11px] text-ink-400">
              {percent(Math.min(budgetRatio, 9.99))} از بودجه
            </p>
          </div>
        )}
      </div>

      {/* تفکیک */}
      <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="text-sm font-bold">تفکیک هزینه</h3>
          <span className="text-[11px] text-ink-400">روی هر ردیف بزنید تا فرمولش را ببینید</span>
        </div>

        <ul className="space-y-3">
          {rows.map((r) => {
            const isOpen = open === r.key
            return (
              <li key={r.key}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : r.key)}
                  className="w-full text-right"
                  aria-expanded={isOpen}
                >
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="text-sm text-ink-700 dark:text-ink-200">
                      {r.label}
                      <span className="mr-1.5 text-[11px] text-ink-400">
                        {percent(r.amount / cost.total)}
                      </span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{toman(r.amount)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(r.amount / max) * 100}%`, background: 'var(--bar)' }}
                    />
                  </div>
                </button>
                {isOpen && (
                  <p className="mt-2 rounded-lg bg-ink-50 p-2.5 text-xs leading-relaxed text-ink-600 dark:bg-ink-950 dark:text-ink-300">
                    {r.formula}
                  </p>
                )}
              </li>
            )
          })}
        </ul>

        <div className="mt-4 flex items-baseline justify-between border-t border-ink-200 pt-3 dark:border-ink-800">
          <span className="text-sm font-bold">جمع کل</span>
          <span className="text-sm font-bold tabular-nums">{toman(cost.total)}</span>
        </div>
      </div>

      {/* تقسیم بین نفرات */}
      <SplitTable plan={plan} />

      {/* ویرایش قیمت‌های پایه */}
      <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
        <button
          type="button"
          onClick={() => setShowPrices((v) => !v)}
          className="flex w-full items-center justify-between text-right"
        >
          <span className="text-sm font-bold">قیمت‌های پایه</span>
          <span className="text-xs text-ink-400">{showPrices ? 'بستن' : 'ویرایش'}</span>
        </button>

        <p className="mt-1 text-[11px] text-ink-400">
          آخرین به‌روزرسانی: {DEFAULT_PRICES.updatedAt} — اگر قیمت‌ها عوض شده، همین‌جا اصلاح کنید.
        </p>

        {showPrices && <PriceEditor plan={plan} onPriceChange={onPriceChange} />}
      </div>

      <p className="px-1 text-[11px] leading-relaxed text-ink-400">
        همهٔ ارقام تخمینی‌اند. قیمت واقعی سوخت، اقامت و بلیت با زمان و مکان تغییر می‌کند؛ پیش از
        سفر قیمت‌های پایه را به‌روز کنید.
      </p>
    </div>
  )
}

function SplitTable({ plan }: { plan: TripPlan }) {
  const [mode, setMode] = useState<'weighted' | 'equal'>('weighted')
  const shares = splitCost(plan.cost.total, plan.input, mode)

  return (
    <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold">سهم هر نفر</h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMode('weighted')}
            className={`btn btn-sm ${mode === 'weighted' ? 'bg-brand-600 text-white' : 'text-ink-500'}`}
          >
            وزنی
          </button>
          <button
            type="button"
            onClick={() => setMode('equal')}
            className={`btn btn-sm ${mode === 'equal' ? 'bg-brand-600 text-white' : 'text-ink-500'}`}
          >
            مساوی بین بزرگسالان
          </button>
        </div>
      </div>

      <table className="w-full text-sm">
        <tbody>
          {shares.map((s) => (
            <tr key={s.travelerId} className="border-b border-ink-100 last:border-0 dark:border-ink-800">
              <td className="py-2 text-ink-700 dark:text-ink-200">{s.name}</td>
              <td className="py-2 text-center text-[11px] text-ink-400">
                {s.weight === 0 ? 'بدون سهم' : `ضریب ${faNum(s.weight, s.weight % 1 ? 1 : 0)}`}
              </td>
              <td className="py-2 text-left font-semibold tabular-nums">
                {s.amount > 0 ? toman(s.amount) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PriceEditor({
  plan,
  onPriceChange,
}: {
  plan: TripPlan
  onPriceChange: (patch: Partial<PriceBook>) => void
}) {
  const p = { ...DEFAULT_PRICES, ...plan.input.priceOverrides }
  const style = plan.input.style

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <NumField
        label="بنزین آزاد (تومان/لیتر)"
        value={p.fuelFree.gasoline}
        onChange={(v) => onPriceChange({ fuelFree: { ...p.fuelFree, gasoline: v } })}
      />
      <NumField
        label="بنزین سهمیه‌ای (تومان/لیتر)"
        value={p.fuelSubsidized.gasoline}
        onChange={(v) => onPriceChange({ fuelSubsidized: { ...p.fuelSubsidized, gasoline: v } })}
      />
      <NumField
        label="عوارض (تومان/کیلومتر)"
        value={p.tollPerKm}
        onChange={(v) => onPriceChange({ tollPerKm: v })}
      />
      <NumField
        label="اقامت هر نفر هر شب"
        value={p.lodgingPerNight[style]}
        onChange={(v) =>
          onPriceChange({ lodgingPerNight: { ...p.lodgingPerNight, [style]: v } })
        }
      />
      <NumField
        label="ناهار هر نفر"
        value={p.meals[style].lunch}
        onChange={(v) =>
          onPriceChange({
            meals: { ...p.meals, [style]: { ...p.meals[style], lunch: v } },
          })
        }
      />
      <NumField
        label="شام هر نفر"
        value={p.meals[style].dinner}
        onChange={(v) =>
          onPriceChange({
            meals: { ...p.meals, [style]: { ...p.meals[style], dinner: v } },
          })
        }
      />
    </div>
  )
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        className="field tabular-nums"
        type="number"
        min={0}
        step={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

/** رنگ میله‌ها را به‌صورت متغیر CSS در اختیار زیرشاخه می‌گذارد */
export function CostThemeVars({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .lt-cost { --bar: ${BAR_LIGHT}; }
        .dark .lt-cost { --bar: ${BAR_DARK}; }
      `}</style>
      <div className="lt-cost">{children}</div>
    </>
  )
}

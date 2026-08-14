import { useMemo, useState } from 'react'
import type { Expense, ExpenseCategory, TripJournal, TripPlan } from '../../domain/types'
import { addExpense, removeExpense } from '../../lib/journal'
import { newId } from '../../lib/storage'
import { buildActualsReport, EXPENSE_ICON, EXPENSE_LABEL } from '../../engine/actuals'
import { computeBalances, settle } from '../../engine/settlement'
import { faNum, percent, toman, tomanShort } from '../../lib/format'

const CATEGORIES: ExpenseCategory[] = [
  'fuel',
  'meals',
  'lodging',
  'tickets',
  'toll',
  'snacks',
  'other',
]

const STATUS = { good: '#0ca30c', critical: '#d03b3b' }

/**
 * دفتر هزینهٔ واقعی + مقایسه با تخمین + تسویه‌حساب گروهی.
 *
 * این سه با هم معنا دارند: هر هزینه هم به گزارش «تخمین در برابر واقعیت»
 * می‌رود و هم به حساب «چه کسی به چه کسی بدهکار است».
 */
export function ExpensePanel({
  plan,
  journal,
  onChange,
}: {
  plan: TripPlan
  journal: TripJournal
  onChange: (next: TripJournal) => void
}) {
  const travelers = plan.input.travelers
  const report = useMemo(
    () => buildActualsReport(plan, journal.expenses),
    [plan, journal.expenses],
  )
  const balances = useMemo(
    () => computeBalances(journal.expenses, travelers),
    [journal.expenses, travelers],
  )
  const transfers = useMemo(() => settle(balances), [balances])

  return (
    <div className="space-y-5">
      <ExpenseForm plan={plan} onAdd={(e) => onChange(addExpense(journal, e))} />

      {journal.expenses.length > 0 && (
        <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
          <h3 className="text-sm font-bold">هزینه‌های ثبت‌شده</h3>
          <ul className="mt-3 space-y-2">
            {[...journal.expenses]
              .sort((a, b) => b.at.localeCompare(a.at))
              .map((e) => {
                const payer = travelers.find((t) => t.id === e.paidBy)
                return (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 p-2.5 dark:border-ink-800"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span aria-hidden>{EXPENSE_ICON[e.category]}</span>{' '}
                        {EXPENSE_LABEL[e.category]}
                        <span className="mr-1.5 text-[11px] text-ink-400">
                          · روز {faNum(e.day)}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-500">
                        پرداخت: {payer?.name || 'نامشخص'}
                        {e.sharedWith.length > 0 &&
                          e.sharedWith.length < travelers.length &&
                          ` · سهیم: ${faNum(e.sharedWith.length)} نفر`}
                        {e.note && ` · ${e.note}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {toman(e.amount)}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-ink-400 hover:text-[#d03b3b]"
                      onClick={() => onChange(removeExpense(journal, e.id))}
                      aria-label="حذف هزینه"
                    >
                      ✕
                    </button>
                  </li>
                )
              })}
          </ul>
        </div>
      )}

      <ActualsReport report={report} />

      {transfers.length > 0 && <Settlement balances={balances} transfers={transfers} />}
    </div>
  )
}

function ExpenseForm({ plan, onAdd }: { plan: TripPlan; onAdd: (e: Expense) => void }) {
  const travelers = plan.input.travelers
  const [day, setDay] = useState(1)
  const [category, setCategory] = useState<ExpenseCategory>('meals')
  const [amount, setAmount] = useState(0)
  const [paidBy, setPaidBy] = useState(travelers[0]?.id ?? '')
  const [note, setNote] = useState('')
  const [sharedWith, setSharedWith] = useState<string[]>([])

  const submit = () => {
    if (amount <= 0 || !paidBy) return
    onAdd({
      id: newId(),
      day,
      category,
      amount,
      note: note || undefined,
      paidBy,
      sharedWith,
      at: new Date().toISOString(),
    })
    setAmount(0)
    setNote('')
  }

  const toggleShare = (id: string) =>
    setSharedWith((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
      <h3 className="text-sm font-bold">ثبت هزینهٔ واقعی</h3>
      <p className="mt-1 text-[11px] text-ink-500">
        هرچه خرج کردید همین‌جا بزنید. هم با تخمین مقایسه می‌شود، هم ته سفر حساب‌ها صاف می‌شود.
      </p>

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`chip ${category === c ? 'chip-on' : ''}`}
            >
              <span aria-hidden>{EXPENSE_ICON[c]}</span>
              {EXPENSE_LABEL[c]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="label">مبلغ (تومان)</span>
            <input
              className="field tabular-nums"
              type="number"
              min={0}
              step={50_000}
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="label">روز</span>
            <select className="field" value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {plan.days.map((d) => (
                <option key={d.index} value={d.index}>
                  روز {faNum(d.index)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="label">چه کسی پرداخت کرد؟</span>
          <select className="field" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
            {travelers.map((t, i) => (
              <option key={t.id} value={t.id}>
                {t.name || `همسفر ${faNum(i + 1)}`}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="label">
            چه کسانی سهیم‌اند؟ {sharedWith.length === 0 && '(هیچ‌کدام انتخاب نشده = همه)'}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {travelers.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleShare(t.id)}
                className={`chip ${sharedWith.includes(t.id) ? 'chip-on' : ''}`}
              >
                {t.name || `همسفر ${faNum(i + 1)}`}
              </button>
            ))}
          </div>
        </div>

        <input
          className="field"
          placeholder="توضیح (اختیاری)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <button type="button" className="btn-primary w-full" onClick={submit} disabled={amount <= 0}>
          ثبت هزینه
        </button>
      </div>
    </div>
  )
}

function ActualsReport({ report }: { report: ReturnType<typeof buildActualsReport> }) {
  if (!report.hasData) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-300 p-6 text-center dark:border-ink-700">
        <p className="text-sm text-ink-600 dark:text-ink-300">هنوز هزینه‌ای ثبت نشده</p>
        <p className="mt-1 text-xs text-ink-500">
          با ثبت اولین هزینه، مقایسهٔ «تخمین در برابر واقعیت» این‌جا ساخته می‌شود.
        </p>
      </div>
    )
  }

  const over = report.delta > 0
  const max = Math.max(...report.lines.map((l) => Math.max(l.estimated, l.actual)), 1)

  return (
    <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
      <h3 className="text-sm font-bold">تخمین در برابر واقعیت</h3>
      <p className="mt-1 text-[11px] text-ink-500">
        هزینهٔ {faNum(report.daysRecorded)} روز ثبت شده است. تا پایان سفر این نسبت‌ها کامل می‌شود.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-ink-200 p-3 dark:border-ink-800">
          <p className="text-[11px] text-ink-500">تخمین</p>
          <p className="mt-0.5 text-base font-bold">{tomanShort(report.totalEstimated)}</p>
        </div>
        <div className="rounded-xl border border-ink-200 p-3 dark:border-ink-800">
          <p className="text-[11px] text-ink-500">واقعی</p>
          <p
            className="mt-0.5 text-base font-bold"
            style={{ color: over ? STATUS.critical : STATUS.good }}
          >
            {tomanShort(report.totalActual)}
          </p>
        </div>
      </div>

      <p className="mt-2 text-xs" style={{ color: over ? STATUS.critical : STATUS.good }}>
        <span aria-hidden>{over ? '▲' : '▼'}</span>{' '}
        {over ? 'بیشتر از تخمین' : 'کمتر از تخمین'}: {tomanShort(Math.abs(report.delta))}
        {report.totalEstimated > 0 &&
          ` (${percent(Math.abs(report.delta) / report.totalEstimated)})`}
      </p>

      <ul className="mt-4 space-y-3">
        {report.lines
          .filter((l) => l.estimated > 0 || l.actual > 0)
          .map((l) => (
            <li key={l.key}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                <span className="text-ink-700 dark:text-ink-200">{l.label}</span>
                <span className="tabular-nums text-ink-500">
                  {toman(l.actual)} / {toman(l.estimated)}
                </span>
              </div>
              {/* دو میلهٔ هم‌مقیاس: بالا تخمین، پایین واقعی */}
              <div className="space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                  <div
                    className="h-full rounded-full bg-ink-300 dark:bg-ink-600"
                    style={{ width: `${(l.estimated / max) * 100}%` }}
                  />
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(l.actual / max) * 100}%`,
                      background: l.delta > 0 ? STATUS.critical : STATUS.good,
                    }}
                  />
                </div>
              </div>
            </li>
          ))}
      </ul>

      <p className="mt-3 text-[10px] text-ink-400">
        میلهٔ خاکستری تخمین است و میلهٔ رنگی واقعیت. اگر دسته‌ای همیشه از تخمین بیشتر درمی‌آید،
        ضریبش را در «قیمت‌های پایه» بالا ببرید تا سفر بعدی دقیق‌تر شود.
      </p>
    </div>
  )
}

function Settlement({
  balances,
  transfers,
}: {
  balances: ReturnType<typeof computeBalances>
  transfers: ReturnType<typeof settle>
}) {
  return (
    <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
      <h3 className="text-sm font-bold">تسویه‌حساب</h3>
      <p className="mt-1 text-[11px] text-ink-500">
        کمترین تعداد جابه‌جایی پول برای اینکه همه بی‌حساب شوند.
      </p>

      <ul className="mt-4 space-y-2">
        {transfers.map((t, i) => (
          <li
            key={`${t.fromId}-${t.toId}-${i}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 p-3 dark:border-ink-800"
          >
            <span className="text-sm">
              <span className="font-medium">{t.fromName}</span>
              <span className="mx-1.5 text-ink-400">←</span>
              <span className="font-medium">{t.toName}</span>
            </span>
            <span className="text-sm font-bold tabular-nums text-brand-700 dark:text-brand-300">
              {toman(t.amount)}
            </span>
          </li>
        ))}
      </ul>

      <table className="mt-4 w-full text-xs">
        <thead>
          <tr className="text-ink-500">
            <th className="pb-2 text-right font-normal">نفر</th>
            <th className="pb-2 text-left font-normal">پرداخته</th>
            <th className="pb-2 text-left font-normal">سهمش</th>
            <th className="pb-2 text-left font-normal">مانده</th>
          </tr>
        </thead>
        <tbody>
          {balances.map((b) => (
            <tr key={b.travelerId} className="border-t border-ink-100 dark:border-ink-800">
              <td className="py-1.5">{b.name}</td>
              <td className="py-1.5 text-left tabular-nums">{toman(b.paid)}</td>
              <td className="py-1.5 text-left tabular-nums">{toman(b.owed)}</td>
              <td
                className="py-1.5 text-left font-medium tabular-nums"
                style={{ color: b.net >= 0 ? STATUS.good : STATUS.critical }}
              >
                {b.net >= 0 ? '+' : '−'}
                {toman(Math.abs(b.net))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

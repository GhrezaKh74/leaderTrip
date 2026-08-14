import { useEffect, useMemo, useState } from 'react'
import type { TripPlan } from '../../domain/types'
import { buildPackingList } from '../../engine/packing'
import { faNum } from '../../lib/format'

const STORAGE_KEY = 'leadertrip.packing.v1'

/**
 * چک‌لیست بار — تیک‌ها در دستگاه کاربر ذخیره می‌شوند تا بین جلسه‌ها گم نشوند.
 */
export function PackingPanel({ plan }: { plan: TripPlan }) {
  const groups = useMemo(() => buildPackingList(plan), [plan])
  const [checked, setChecked] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return new Set<string>(raw ? (JSON.parse(raw) as string[]) : [])
    } catch {
      return new Set<string>()
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...checked]))
    } catch {
      /* فضای ذخیره‌سازی پر است — بی‌اهمیت */
    }
  }, [checked])

  const toggle = (label: string) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })

  const all = groups.flatMap((g) => g.items)
  const done = all.filter((i) => checked.has(i.label)).length
  const essentialsLeft = all.filter((i) => i.essential && !checked.has(i.label)).length

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-bold">چک‌لیست بار</h3>
          <span className="text-xs tabular-nums text-ink-500">
            {faNum(done)} از {faNum(all.length)}
          </span>
        </div>
        {/* عرض باید عدد لاتین باشد، نه رشتهٔ فارسی‌شده — وگرنه CSS نادیده‌اش می‌گیرد */}
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${(done / Math.max(1, all.length)) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-ink-500">
          {essentialsLeft > 0
            ? `${faNum(essentialsLeft)} قلم ضروری هنوز تیک نخورده است.`
            : 'همهٔ اقلام ضروری تیک خورده‌اند. سفر خوش! 🚗'}
        </p>
        <p className="mt-1 text-[11px] text-ink-400">
          فهرست بر پایهٔ فصل، اقلیم مقصدها، نوع اقامت و اعضای گروه ساخته شده است.
        </p>
      </div>

      {groups.map((group) => (
        <div
          key={group.title}
          className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900"
        >
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <span aria-hidden>{group.icon}</span>
            {group.title}
          </h4>

          <ul className="space-y-2">
            {group.items.map((item) => {
              const on = checked.has(item.label)
              return (
                <li key={item.label}>
                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(item.label)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`text-sm ${
                          on ? 'text-ink-400 line-through' : 'text-ink-800 dark:text-ink-100'
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.essential && !on && (
                        <span className="badge mr-1.5 bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                          ضروری
                        </span>
                      )}
                      {item.reason && (
                        <span className="mt-0.5 block text-[11px] text-ink-500">{item.reason}</span>
                      )}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

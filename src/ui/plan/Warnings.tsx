import type { Warning, WarningLevel } from '../../domain/types'

/** رنگ وضعیت همیشه با آیکون و متن همراه است — رنگ به‌تنهایی معنا حمل نمی‌کند */
const LEVEL: Record<WarningLevel, { icon: string; color: string; bg: string; label: string }> = {
  danger: {
    icon: '⛔',
    color: '#d03b3b',
    bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900',
    label: 'هشدار جدی',
  },
  warn: {
    icon: '⚠️',
    color: '#b45309',
    bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
    label: 'توجه',
  },
  info: {
    icon: '💡',
    color: '#0369a1',
    bg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900',
    label: 'نکته',
  },
}

export function WarningList({
  warnings,
  compact = false,
}: {
  warnings: Warning[]
  compact?: boolean
}) {
  if (warnings.length === 0) return null

  const order: WarningLevel[] = ['danger', 'warn', 'info']
  const sorted = [...warnings].sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level))

  return (
    <ul className="space-y-2">
      {sorted.map((w, i) => {
        const L = LEVEL[w.level]
        return (
          <li key={`${w.title}-${i}`} className={`rounded-xl border p-3 ${L.bg}`}>
            <div className="flex items-start gap-2">
              <span aria-hidden className="text-sm leading-5">
                {L.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" style={{ color: L.color }}>
                  <span className="sr-only">{L.label}: </span>
                  {w.title}
                </p>
                {!compact && (
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-600 dark:text-ink-300">
                    {w.detail}
                  </p>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

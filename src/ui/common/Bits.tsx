import { useEffect, useState, type ReactNode } from 'react'
import { JALALI_MONTHS, toGregorian, toJalali, toISODate, fromISODate, toFa } from '../../lib/jalali'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card p-4 sm:p-5 ${className}`}>{children}</div>
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-bold text-ink-800 dark:text-ink-100">{children}</h3>
      {hint && <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{hint}</p>}
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-400">{hint}</span>}
    </label>
  )
}

export function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" onClick={onClick} className={`chip ${on ? 'chip-on' : ''}`}>
      {children}
    </button>
  )
}

export function Stat({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  sub?: string
  tone?: 'default' | 'good' | 'bad'
}) {
  const toneClass =
    tone === 'good'
      ? 'text-[#0ca30c]'
      : tone === 'bad'
        ? 'text-[#d03b3b]'
        : 'text-ink-900 dark:text-ink-50'
  return (
    <div className="rounded-xl border border-ink-200/70 bg-white p-3 dark:border-ink-800 dark:bg-ink-900">
      <div className="text-[11px] text-ink-500 dark:text-ink-400">{label}</div>
      <div className={`mt-1 text-lg font-bold ${toneClass}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-ink-400">{sub}</div>}
    </div>
  )
}

/** لغزندهٔ عددی با نمایش مقدار */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  format: (v: number) => string
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="label mb-0">{label}</span>
        <span className="text-sm font-bold text-brand-700 dark:text-brand-300">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

/** انتخاب تاریخ شمسی با سه فهرست سال/ماه/روز */
export function JalaliDateInput({
  value,
  onChange,
}: {
  value: string
  onChange: (iso: string) => void
}) {
  const date = fromISODate(value)
  const { jy, jm, jd } = toJalali(date)
  const thisYear = toJalali(new Date()).jy
  const years = [thisYear, thisYear + 1]

  // اسفند ۲۹ یا ۳۰ روز دارد؛ برای سادگی سقف ۳۰ گذاشته‌ایم و تبدیل خودش اصلاح می‌کند
  const daysInMonth = jm <= 6 ? 31 : jm <= 11 ? 30 : 29

  const set = (y: number, m: number, d: number) => {
    const clamped = Math.min(d, m <= 6 ? 31 : m <= 11 ? 30 : 29)
    onChange(toISODate(toGregorian(y, m, clamped)))
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <select className="field" value={jd} onChange={(e) => set(jy, jm, Number(e.target.value))}>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {toFa(d)}
          </option>
        ))}
      </select>
      <select className="field" value={jm} onChange={(e) => set(jy, Number(e.target.value), jd)}>
        {JALALI_MONTHS.map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
      <select className="field" value={jy} onChange={(e) => set(Number(e.target.value), jm, jd)}>
        {years.map((y) => (
          <option key={y} value={y}>
            {toFa(y)}
          </option>
        ))}
      </select>
    </div>
  )
}

export type Theme = 'light' | 'dark' | 'system'

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('leadertrip.theme') as Theme) || 'system',
  )

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark')
    if (theme === 'dark') root.classList.add('dark')
    if (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark')
    }
    localStorage.setItem('leadertrip.theme', theme)
  }, [theme])

  return [theme, setTheme]
}

export function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  const next: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' }
  const icon = { system: '🌗', light: '☀️', dark: '🌙' }[theme]
  const title = { system: 'هماهنگ با سیستم', light: 'روشن', dark: 'تاریک' }[theme]

  return (
    <button
      type="button"
      onClick={() => onChange(next[theme])}
      title={`نمایش: ${title}`}
      className="btn-ghost btn-sm"
    >
      <span aria-hidden>{icon}</span>
      <span className="sr-only">تغییر حالت نمایش</span>
    </button>
  )
}

export function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-300 p-8 text-center dark:border-ink-700">
      <p className="text-sm font-medium text-ink-700 dark:text-ink-200">{title}</p>
      <p className="mt-1 text-xs text-ink-500">{detail}</p>
    </div>
  )
}

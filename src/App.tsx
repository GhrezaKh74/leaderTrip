import { useCallback, useMemo, useState } from 'react'
import type { PriceBook, TripInput, TripPlan } from './domain/types'
import { defaultInput, generatePlan } from './engine/planner'
import { loadDraft, saveDraft } from './lib/storage'
import { ThemeToggle, useTheme } from './ui/common/Bits'
import { Wizard } from './ui/wizard/Wizard'
import { PlanView } from './ui/plan/PlanView'

export default function App() {
  const [theme, setTheme] = useTheme()
  const [input, setInput] = useState<TripInput>(() => loadDraft() ?? defaultInput())
  const [showPlan, setShowPlan] = useState(false)

  const patch = useCallback((p: Partial<TripInput>) => {
    setInput((prev) => {
      const next = { ...prev, ...p }
      saveDraft(next)
      return next
    })
  }, [])

  // ساخت برنامه یک تابع خالص است — خطایش هم بخشی از همین محاسبه است، نه یک اثر جانبی
  const { plan, error } = useMemo<{ plan: TripPlan | null; error: string | null }>(() => {
    if (!showPlan) return { plan: null, error: null }
    try {
      return { plan: generatePlan(input), error: null }
    } catch (e) {
      return { plan: null, error: e instanceof Error ? e.message : 'خطای ناشناخته در ساخت برنامه' }
    }
  }, [input, showPlan])

  const onPriceChange = useCallback(
    (p: Partial<PriceBook>) => patch({ priceOverrides: { ...input.priceOverrides, ...p } }),
    [patch, input.priceOverrides],
  )

  return (
    <div className="min-h-full">
      <header className="no-print sticky top-0 z-10 border-b border-ink-200/70 bg-ink-50/85 backdrop-blur dark:border-ink-800 dark:bg-ink-950/85">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <button
            type="button"
            className="flex items-center gap-2"
            onClick={() => setShowPlan(false)}
          >
            <span aria-hidden className="text-lg">
              🧭
            </span>
            <span className="text-sm font-bold">لیدرتریپ</span>
          </button>

          <div className="flex items-center gap-2">
            {showPlan && (
              <button type="button" className="btn-ghost btn-sm" onClick={() => window.print()}>
                🖨️ چاپ
              </button>
            )}
            <ThemeToggle theme={theme} onChange={setTheme} />
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-auto mt-4 max-w-3xl px-4">
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
            {error}
          </p>
        </div>
      )}

      {showPlan && plan ? (
        <PlanView plan={plan} onEdit={() => setShowPlan(false)} onPriceChange={onPriceChange} />
      ) : (
        <>
          <Intro />
          <Wizard input={input} onChange={patch} onSubmit={() => setShowPlan(true)} />
        </>
      )}
    </div>
  )
}

function Intro() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 text-center">
      <h1 className="text-xl font-bold sm:text-2xl">دستیار هوشمند لیدر سفر</h1>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-500 dark:text-ink-400">
        بگویید کِی، با چه کسانی، با چه خودرویی و با چه بودجه‌ای — برنامهٔ ساعت‌به‌ساعت و تخمین
        هزینه‌ای می‌گیرید که می‌شود به آن تکیه کرد.
      </p>
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PriceBook, TripInput, TripPlan, WeatherMap } from './domain/types'
import { defaultInput, generatePlan } from './engine/planner'
import { fetchWeather, type WeatherRequest } from './services/weather'
import { getCity } from './data/cities'
import { loadDraft, saveDraft } from './lib/storage'
import { ThemeToggle, useTheme } from './ui/common/Bits'
import { Wizard } from './ui/wizard/Wizard'
import { PlanView, type WeatherStatus } from './ui/plan/PlanView'

export default function App() {
  const [theme, setTheme] = useTheme()
  const [input, setInput] = useState<TripInput>(() => loadDraft() ?? defaultInput())
  const [showPlan, setShowPlan] = useState(false)
  const [weather, setWeather] = useState<WeatherMap | undefined>(undefined)
  const [weatherStatus, setWeatherStatus] = useState<WeatherStatus>('idle')

  const patch = useCallback((p: Partial<TripInput>) => {
    setInput((prev) => {
      const next = { ...prev, ...p }
      saveDraft(next)
      return next
    })
  }, [])

  /**
   * ساخت برنامه یک تابع خالص است — خطایش هم بخشی از همین محاسبه است، نه یک اثر جانبی.
   *
   * دو مرحله‌ای است: اول یک پیش‌نویس بدون آب‌وهوا ساخته می‌شود تا بدانیم کدام
   * شهرها و کدام روزها را باید از هواشناسی بپرسیم؛ بعد همان برنامه با دادهٔ
   * آب‌وهوا دوباره ساخته می‌شود. ساخت برنامه چند میلی‌ثانیه است، پس دو بار
   * اجرا کردنش از پیچیده کردن معماری بهتر است.
   */
  const { plan, error } = useMemo<{ plan: TripPlan | null; error: string | null }>(() => {
    if (!showPlan) return { plan: null, error: null }
    try {
      return { plan: generatePlan(input, weather), error: null }
    } catch (e) {
      return { plan: null, error: e instanceof Error ? e.message : 'خطای ناشناخته در ساخت برنامه' }
    }
  }, [input, showPlan, weather])

  /** کلید شهرها و تاریخ‌های برنامه — تا فقط وقتی واقعاً عوض شدند دوباره بپرسیم */
  const weatherTargets = useMemo(() => {
    if (!plan) return null
    const byCity = new Map<string, Set<string>>()
    for (const day of plan.days) {
      const set = byCity.get(day.baseCityId) ?? new Set<string>()
      set.add(day.date)
      byCity.set(day.baseCityId, set)
    }
    const requests: WeatherRequest[] = [...byCity.entries()].map(([cityId, dates]) => {
      const city = getCity(cityId)
      return { cityId, lat: city.lat, lng: city.lng, dates: [...dates].sort() }
    })
    return { requests, key: requests.map((r) => `${r.cityId}:${r.dates.join(',')}`).sort().join('|') }
  }, [plan])

  const targetKey = weatherTargets?.key ?? ''

  useEffect(() => {
    if (!weatherTargets || targetKey === '') return

    let cancelled = false
    setWeatherStatus('loading')

    fetchWeather(weatherTargets.requests)
      .then((data) => {
        if (cancelled) return
        // ادغام با آنچه داریم: برنامه پس از رسیدن آب‌وهوا ممکن است شهرهایش
        // جابه‌جا شود، و نباید دادهٔ قبلی را از دست بدهیم
        setWeather((prev) => {
          const merged = { ...prev, ...data }
          const changed = Object.keys(merged).length !== Object.keys(prev ?? {}).length
          return changed ? merged : prev
        })
        setWeatherStatus(Object.keys(data).length > 0 ? 'ok' : 'unavailable')
      })
      .catch(() => {
        if (!cancelled) setWeatherStatus('unavailable')
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey])

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
        <PlanView
          plan={plan}
          weather={weather}
          weatherStatus={weatherStatus}
          onEdit={() => setShowPlan(false)}
          onPriceChange={onPriceChange}
          onInputChange={patch}
        />
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

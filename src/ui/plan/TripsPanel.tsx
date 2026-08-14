import { useState } from 'react'
import type { TripInput, TripPlan } from '../../domain/types'
import { deleteTrip, listTrips, newId, saveTrip, type SavedTrip } from '../../lib/storage'
import { downloadJson, readJsonFile, shareUrl } from '../../lib/share'
import { getCity } from '../../data/cities'
import { faNum } from '../../lib/format'
import { formatJalali, fromISODate } from '../../lib/jalali'

/**
 * سفرهای من + خروجی و اشتراک‌گذاری.
 *
 * همه‌چیز روی دستگاه خود کاربر می‌ماند: ذخیره در `localStorage`، اشتراک‌گذاری
 * با آدرسی که کل سفر در خودش دارد، و خروجی JSON برای پشتیبان‌گیری.
 */
export function TripsPanel({
  plan,
  onLoad,
}: {
  plan: TripPlan
  onLoad: (input: TripInput) => void
}) {
  const [trips, setTrips] = useState<SavedTrip[]>(() => listTrips())
  const [title, setTitle] = useState(plan.input.title ?? '')
  const [copied, setCopied] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  const refresh = () => setTrips(listTrips())

  const defaultTitle = `${faNum(plan.input.days)} روز از ${getCity(plan.input.originCityId).name}`

  const save = () => {
    const name = title.trim() || defaultTitle
    saveTrip({
      id: newId(),
      title: name,
      input: { ...plan.input, title: name },
      savedAt: new Date().toISOString(),
    })
    setTitle('')
    refresh()
  }

  const copyLink = async () => {
    const url = shareUrl(plan.input)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // بعضی مرورگرها بدون تعامل مستقیم اجازهٔ کلیپ‌بورد نمی‌دهند
      window.prompt('این آدرس را کپی کنید:', url)
    }
  }

  const onImport = async (file: File | undefined) => {
    if (!file) return
    const parsed = await readJsonFile(file)
    if (!parsed) {
      setImportError('این فایل یک سفر معتبر لیدرتریپ نیست.')
      return
    }
    setImportError(null)
    onLoad(parsed)
  }

  return (
    <div className="space-y-4">
      {/* اشتراک‌گذاری */}
      <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
        <h3 className="text-sm font-bold">اشتراک‌گذاری و خروجی</h3>
        <p className="mt-1 text-[11px] text-ink-500">
          لینک اشتراک، کل سفر را در خودِ آدرس حمل می‌کند — بدون سرور و بدون حساب کاربری.
          هرکس بازش کند همین برنامه را می‌بیند.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-primary btn-sm" onClick={copyLink}>
            {copied ? '✓ کپی شد' : '🔗 کپی لینک سفر'}
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => downloadJson(plan.input, `leadertrip-${plan.input.startDate}.json`)}
          >
            ⬇ خروجی JSON
          </button>
          <label className="btn-ghost btn-sm cursor-pointer">
            ⬆ بارگذاری JSON
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => onImport(e.target.files?.[0])}
            />
          </label>
          <button type="button" className="btn-ghost btn-sm" onClick={() => window.print()}>
            🖨️ چاپ / PDF
          </button>
        </div>

        {importError && <p className="mt-2 text-xs text-[#d03b3b]">{importError}</p>}
      </div>

      {/* ذخیره */}
      <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
        <h3 className="text-sm font-bold">ذخیرهٔ این سفر</h3>
        <div className="mt-3 flex gap-2">
          <input
            className="field"
            placeholder={defaultTitle}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button type="button" className="btn-primary shrink-0" onClick={save}>
            ذخیره
          </button>
        </div>
      </div>

      {/* فهرست سفرها */}
      <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
        <h3 className="text-sm font-bold">سفرهای ذخیره‌شده</h3>

        {trips.length === 0 ? (
          <p className="mt-3 text-xs text-ink-400">هنوز سفری ذخیره نکرده‌اید.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {trips.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 p-3 dark:border-ink-800"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="mt-0.5 text-[11px] text-ink-500">
                    {formatJalali(fromISODate(t.input.startDate))} ·{' '}
                    {faNum(t.input.travelers.length)} نفر · {faNum(t.input.days)} روز
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => onLoad(t.input)}
                  >
                    باز کن
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => {
                      saveTrip({
                        ...t,
                        id: newId(),
                        title: `${t.title} (کپی)`,
                        savedAt: new Date().toISOString(),
                      })
                      refresh()
                    }}
                    title="کپی"
                  >
                    ⧉
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm hover:text-[#d03b3b]"
                    onClick={() => {
                      deleteTrip(t.id)
                      refresh()
                    }}
                    title="حذف"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

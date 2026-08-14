import { useEffect, useState } from 'react'
import type { CheckIn, TripJournal, TripPlan } from '../../domain/types'
import { POI_BY_ID } from '../../data/pois'
import { getCity } from '../../data/cities'
import { checkInKey, setCheckIn } from '../../lib/journal'
import { deletePhoto, loadPhotoUrl, savePhoto } from '../../lib/photos'
import { newId } from '../../lib/storage'
import { scheduleDrift } from '../../engine/actuals'
import { clock, duration, faNum } from '../../lib/format'
import { formatJalali, fromISODate } from '../../lib/jalali'
import { ExpensePanel } from './ExpensePanel'

/**
 * حالت حین سفر.
 *
 * تا این‌جا اپ دربارهٔ آینده حرف می‌زد؛ این‌جا دربارهٔ چیزی که واقعاً اتفاق
 * می‌افتد. چک‌این هر توقف ساعت واقعی را ثبت می‌کند و همان‌جا نشان می‌دهد
 * چقدر از برنامه جلو یا عقبیم.
 */
export function LivePanel({
  plan,
  journal,
  onChange,
}: {
  plan: TripPlan
  journal: TripJournal
  onChange: (next: TripJournal) => void
}) {
  const stops = plan.days.flatMap((day) =>
    day.blocks
      .filter((b) => b.kind === 'visit' && b.poiId)
      .map((b) => ({
        key: checkInKey('visit', b.poiId!),
        day: day.index,
        date: day.date,
        plannedMin: b.startMin,
        title: b.title,
        poiId: b.poiId!,
      })),
  )

  const done = stops.filter((s) => journal.checkIns[s.key]).length

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-bold">پیشرفت سفر</h3>
          <span className="text-xs tabular-nums text-ink-500">
            {faNum(done)} از {faNum(stops.length)} توقف
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${(done / Math.max(1, stops.length)) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-ink-400">
          هر توقف را که رسیدید ثبت کنید — ساعت واقعی ذخیره می‌شود و اختلافش با برنامه نمایش
          داده می‌شود. همه‌چیز روی دستگاه خودتان می‌ماند و آفلاین هم کار می‌کند.
        </p>
      </div>

      {plan.days.map((day) => {
        const dayStops = stops.filter((s) => s.day === day.index)
        if (dayStops.length === 0) return null

        return (
          <div
            key={day.index}
            className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900"
          >
            <h4 className="text-sm font-bold">
              روز {faNum(day.index)} — {formatJalali(fromISODate(day.date))}
              <span className="mr-2 text-[11px] font-normal text-ink-400">
                {getCity(day.baseCityId).name}
              </span>
            </h4>

            <ul className="mt-3 space-y-3">
              {dayStops.map((stop) => (
                <StopRow
                  key={stop.key}
                  stop={stop}
                  checkIn={journal.checkIns[stop.key]}
                  onSet={(value) => onChange(setCheckIn(journal, stop.key, value))}
                />
              ))}
            </ul>
          </div>
        )
      })}

      <ExpensePanel plan={plan} journal={journal} onChange={onChange} />
    </div>
  )
}

interface Stop {
  key: string
  day: number
  plannedMin: number
  title: string
  poiId: string
}

function StopRow({
  stop,
  checkIn,
  onSet,
}: {
  stop: Stop
  checkIn: CheckIn | undefined
  onSet: (value: CheckIn | null) => void
}) {
  const poi = POI_BY_ID.get(stop.poiId)
  const [note, setNote] = useState(checkIn?.note ?? '')
  const [busy, setBusy] = useState(false)

  const drift = checkIn ? scheduleDrift(stop.plannedMin, checkIn.at) : null

  const check = () => onSet({ at: new Date().toISOString(), note: note || undefined })

  const attach = async (file: File | undefined) => {
    if (!file || !checkIn) return
    setBusy(true)
    const photoId = checkIn.photoId ?? newId()
    const ok = await savePhoto(photoId, file)
    setBusy(false)
    if (ok) onSet({ ...checkIn, photoId })
  }

  const clear = async () => {
    if (checkIn?.photoId) await deletePhoto(checkIn.photoId)
    onSet(null)
    setNote('')
  }

  return (
    <li className="rounded-xl border border-ink-200 p-3 dark:border-ink-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {checkIn && <span aria-hidden>✅ </span>}
            {stop.title}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-500">
            برنامه: {clock(stop.plannedMin)}
            {checkIn && ` · واقعی: ${clock(minutesOf(checkIn.at))}`}
            {drift !== null && Math.abs(drift) >= 10 && (
              <span className={drift > 0 ? 'mr-1 text-[#b45309]' : 'mr-1 text-[#0ca30c]'}>
                {drift > 0 ? `${duration(drift)} دیرتر` : `${duration(-drift)} زودتر`}
              </span>
            )}
          </p>
        </div>

        {checkIn ? (
          <button type="button" className="btn-ghost btn-sm shrink-0" onClick={clear}>
            لغو ثبت
          </button>
        ) : (
          <button type="button" className="btn-primary btn-sm shrink-0" onClick={check}>
            رسیدم
          </button>
        )}
      </div>

      {checkIn && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onSet({ ...checkIn, rating: n })}
                className={`text-lg leading-none transition ${
                  (checkIn.rating ?? 0) >= n ? 'opacity-100' : 'opacity-25'
                }`}
                aria-label={`${n} ستاره`}
              >
                ⭐
              </button>
            ))}
            {poi && (
              <span className="mr-2 text-[11px] text-ink-400">
                امتیاز عمومی {faNum(poi.rating, 1)}
              </span>
            )}
          </div>

          <textarea
            className="field min-h-[60px] resize-y text-xs"
            placeholder="یادداشت — چه دیدید، چه چیزی به درد سفر بعدی می‌خورد؟"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => onSet({ ...checkIn, note: note || undefined })}
          />

          <div className="flex items-center gap-2">
            <label className="btn-ghost btn-sm cursor-pointer">
              {busy ? 'در حال ذخیره…' : checkIn.photoId ? '🖼️ تعویض عکس' : '📷 افزودن عکس'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => attach(e.target.files?.[0])}
              />
            </label>
            {checkIn.photoId && (
              <button
                type="button"
                className="text-[11px] text-ink-400 hover:text-[#d03b3b]"
                onClick={async () => {
                  await deletePhoto(checkIn.photoId!)
                  onSet({ ...checkIn, photoId: undefined })
                }}
              >
                حذف عکس
              </button>
            )}
          </div>

          {checkIn.photoId && <Photo id={checkIn.photoId} alt={stop.title} />}
        </div>
      )}
    </li>
  )
}

function Photo({ id, alt }: { id: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let revoked: string | null = null
    loadPhotoUrl(id).then((u) => {
      revoked = u
      setUrl(u)
    })
    // آدرس شیء باید آزاد شود، وگرنه Blob تا بسته‌شدن تب در حافظه می‌ماند
    return () => {
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [id])

  if (!url) return null
  return <img src={url} alt={alt} className="mt-2 w-full rounded-xl" loading="lazy" />
}

function minutesOf(iso: string): number {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

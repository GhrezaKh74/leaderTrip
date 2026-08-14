import { useState } from 'react'
import type { CustomStop, POICategory, TripInput, TripPlan } from '../../domain/types'
import { CATEGORY_EMOJI, CATEGORY_LABEL, DIFFICULTY_LABEL, POI_BY_ID } from '../../data/pois'
import { CITIES, getCity } from '../../data/cities'
import { duration, faNum, toman } from '../../lib/format'
import { newId } from '../../lib/storage'

/**
 * جاذبه‌هایی که در برنامه نیستند.
 *
 * الگوریتم آخرین حرف را نمی‌زند: هر مورد را می‌شود «حتماً برو» کرد و برنامه
 * دوباره حولش ساخته می‌شود. جاذبه‌های حذف‌شده هم این‌جا برمی‌گردند.
 */
export function NearbyPanel({
  plan,
  onChange,
}: {
  plan: TripPlan
  onChange: (patch: Partial<TripInput>) => void
}) {
  const { pinnedPoiIds, blockedPoiIds } = plan.input

  const others = plan.candidates
    .filter((c) => !c.inPlan)
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)

  const blocked = blockedPoiIds.map((id) => POI_BY_ID.get(id)).filter((p) => !!p)

  const pin = (id: string) =>
    onChange({
      pinnedPoiIds: pinnedPoiIds.includes(id)
        ? pinnedPoiIds.filter((x) => x !== id)
        : [...pinnedPoiIds, id],
      blockedPoiIds: blockedPoiIds.filter((x) => x !== id),
    })

  const unblock = (id: string) =>
    onChange({ blockedPoiIds: blockedPoiIds.filter((x) => x !== id) })

  return (
    <div className="space-y-4">
      <CustomStopForm plan={plan} onChange={onChange} />

      {blocked.length > 0 && (
        <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
          <h3 className="text-sm font-bold">جاذبه‌های حذف‌شده</h3>
          <p className="mt-1 text-[11px] text-ink-500">این‌ها را خودتان کنار گذاشته‌اید.</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {blocked.map((p) => (
              <li key={p.id}>
                <button type="button" className="chip" onClick={() => unblock(p.id)}>
                  <span className="line-through">{p.name}</span>
                  <span aria-hidden>↩</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
        <h3 className="text-sm font-bold">جاذبه‌های دیگر این منطقه</h3>
        <p className="mt-1 text-[11px] text-ink-500">
          این‌ها شرایط سفر شما را دارند ولی در برنامه جا نشدند. هرکدام را «حتماً برو» کنید،
          برنامه دوباره حول آن ساخته می‌شود.
        </p>

        {others.length === 0 ? (
          <p className="mt-4 text-xs text-ink-400">
            همهٔ جاذبه‌های واجد شرایط در برنامه هستند.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {others.map((c) => {
              const p = POI_BY_ID.get(c.poiId)
              if (!p) return null
              const city = getCity(p.cityId)
              const isPinned = pinnedPoiIds.includes(p.id)

              return (
                <li
                  key={p.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-ink-200 p-3 dark:border-ink-800"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      <span aria-hidden>{CATEGORY_EMOJI[p.cat]}</span> {p.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-500">
                      {city.name} · {CATEGORY_LABEL[p.cat]} · ⭐ {faNum(p.rating, 1)} ·{' '}
                      {duration(p.visitMinutes)} · {p.ticket === 0 ? 'رایگان' : toman(p.ticket)}
                      {p.difficulty > 0 && ` · ${DIFFICULTY_LABEL[p.difficulty]}`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => pin(p.id)}
                    className={`btn btn-sm shrink-0 ${
                      isPinned
                        ? 'bg-brand-600 text-white'
                        : 'border border-ink-200 text-ink-600 dark:border-ink-700 dark:text-ink-300'
                    }`}
                  >
                    {isPinned ? '📌 حتماً' : 'حتماً برو'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}


/**
 * افزودن توقف دلخواه — خانهٔ فامیل، رستوران محبوب، هر جایی که در پایگاه دادهٔ
 * ما نیست. مختصات از شهر انتخابی گرفته می‌شود؛ بدون سرویس ژئوکدینگ این
 * دقیق‌ترین چیزی است که آفلاین ممکن است، و برای تخمین مسافت کافی است.
 */
function CustomStopForm({
  plan,
  onChange,
}: {
  plan: TripPlan
  onChange: (patch: Partial<TripInput>) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [cityId, setCityId] = useState(plan.input.originCityId)
  const [minutes, setMinutes] = useState(90)
  const [ticket, setTicket] = useState(0)
  const [cat, setCat] = useState<POICategory>('entertainment')

  const stops = plan.input.customStops
  const sortedCities = [...CITIES].sort((a, b) => a.name.localeCompare(b.name, 'fa'))

  const add = () => {
    if (!name.trim()) return
    const stop: CustomStop = {
      id: newId(),
      name: name.trim(),
      cityId,
      visitMinutes: minutes,
      ticket,
      cat,
    }
    onChange({ customStops: [...stops, stop] })
    setName('')
    setOpen(false)
  }

  const remove = (id: string) =>
    onChange({
      customStops: stops.filter((s) => s.id !== id),
      dayAssignment: Object.fromEntries(
        Object.entries(plan.input.dayAssignment).filter(([k]) => k !== `custom:${id}`),
      ),
    })

  return (
    <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">توقف‌های دلخواه شما</h3>
        <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen((v) => !v)}>
          {open ? 'بستن' : '+ افزودن'}
        </button>
      </div>
      <p className="mt-1 text-[11px] text-ink-500">
        هر جایی که در فهرست ما نیست — خانهٔ فامیل، رستوران، هر توقفی. همیشه در برنامه می‌آید.
      </p>

      {stops.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {stops.map((s) => (
            <li key={s.id}>
              <span className="chip chip-on">
                {s.name}
                <span className="text-[10px] opacity-70">{getCity(s.cityId).name}</span>
                <button type="button" onClick={() => remove(s.id)} aria-label={`حذف ${s.name}`}>
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="mt-4 space-y-3">
          <input
            className="field"
            placeholder="نام توقف — مثلاً «خانهٔ عمو در لاهیجان»"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-2">
            <select className="field" value={cityId} onChange={(e) => setCityId(e.target.value)}>
              {sortedCities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="field"
              value={cat}
              onChange={(e) => setCat(e.target.value as POICategory)}
            >
              {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="label">مدت توقف (دقیقه)</span>
              <input
                className="field"
                type="number"
                min={15}
                step={15}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
              />
            </label>
            <label className="block">
              <span className="label">هزینهٔ ورودی (تومان)</span>
              <input
                className="field"
                type="number"
                min={0}
                step={50_000}
                value={ticket}
                onChange={(e) => setTicket(Number(e.target.value))}
              />
            </label>
          </div>

          <button type="button" className="btn-primary w-full" onClick={add} disabled={!name.trim()}>
            افزودن به برنامه
          </button>
        </div>
      )}
    </div>
  )
}

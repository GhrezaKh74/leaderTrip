import type { TripInput, TripPlan } from '../../domain/types'
import { CATEGORY_EMOJI, CATEGORY_LABEL, DIFFICULTY_LABEL, POI_BY_ID } from '../../data/pois'
import { getCity } from '../../data/cities'
import { duration, faNum, toman } from '../../lib/format'

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

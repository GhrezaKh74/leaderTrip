import type { BlockKind, DayPlan, PlanBlock } from '../../domain/types'
import { getCity } from '../../data/cities'
import { CATEGORY_EMOJI, CATEGORY_LABEL, DIFFICULTY_LABEL, POI_BY_ID } from '../../data/pois'
import { clock, duration, faNum, km, toman } from '../../lib/format'
import { formatJalali, fromISODate } from '../../lib/jalali'
import { WarningList } from './Warnings'
import { WeatherBadge } from './WeatherBadge'

const KIND_STYLE: Record<BlockKind, { icon: string; ring: string; label: string }> = {
  drive: { icon: '🚗', ring: 'bg-ink-400', label: 'رانندگی' },
  visit: { icon: '📍', ring: 'bg-brand-500', label: 'بازدید' },
  meal: { icon: '🍽️', ring: 'bg-sand-500', label: 'وعدهٔ غذا' },
  rest: { icon: '☕', ring: 'bg-ink-300', label: 'استراحت' },
  fuel: { icon: '⛽', ring: 'bg-ink-300', label: 'سوخت‌گیری' },
  lodging: { icon: '🛏️', ring: 'bg-ink-600', label: 'اقامت' },
}

export function DayTimeline({ day, onBlock }: { day: DayPlan; onBlock?: (poiId: string) => void }) {
  const city = getCity(day.baseCityId)
  const visits = day.blocks.filter((b) => b.kind === 'visit')

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-bold">
            روز {faNum(day.index)} — {formatJalali(fromISODate(day.date), true)}
          </h2>
          <p className="mt-0.5 text-xs text-ink-500">
            شب در {city.name} · {faNum(visits.length)} بازدید
          </p>
        </div>
        <dl className="flex gap-4 text-xs">
          <div>
            <dt className="text-ink-400">مسافت</dt>
            <dd className="font-semibold">{km(day.distanceKm)}</dd>
          </div>
          <div>
            <dt className="text-ink-400">رانندگی</dt>
            <dd className="font-semibold">{duration(day.drivingMinutes)}</dd>
          </div>
          <div>
            <dt className="text-ink-400">هزینهٔ روز</dt>
            <dd className="font-semibold">{toman(day.cost)}</dd>
          </div>
        </dl>
      </header>

      {day.weather && <WeatherBadge w={day.weather} />}

      {day.warnings.length > 0 && <WarningList warnings={day.warnings} compact />}

      <ol className="relative space-y-1 border-r border-ink-200 pr-4 dark:border-ink-800">
        {day.blocks.map((b, i) => (
          <BlockRow key={`${b.kind}-${b.startMin}-${i}`} block={b} onBlock={onBlock} />
        ))}
      </ol>
    </section>
  )
}

function BlockRow({ block, onBlock }: { block: PlanBlock; onBlock?: (poiId: string) => void }) {
  const style = KIND_STYLE[block.kind]
  const poi = block.poiId ? POI_BY_ID.get(block.poiId) : null
  const isVisit = block.kind === 'visit'

  return (
    <li className="relative py-1.5">
      <span
        className={`absolute -right-[21px] top-3.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-ink-950 ${style.ring}`}
        aria-hidden
      />

      <div
        className={
          isVisit
            ? 'rounded-xl border border-ink-200 bg-white p-3 dark:border-ink-800 dark:bg-ink-900'
            : 'px-1 py-1'
        }
      >
        <div className="flex items-baseline gap-2">
          <time className="shrink-0 text-xs font-medium tabular-nums text-ink-500">
            {clock(block.startMin)}
          </time>
          <span aria-hidden className="text-sm">
            {style.icon}
          </span>
          <span className={`text-sm ${isVisit ? 'font-bold' : 'text-ink-600 dark:text-ink-300'}`}>
            {block.title}
          </span>
          {block.durationMin > 0 && (
            <span className="text-[11px] text-ink-400">{duration(block.durationMin)}</span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 pr-[3.4rem] text-[11px] text-ink-500">
          {block.distanceKm ? <span>{km(block.distanceKm)}</span> : null}
          {block.cost > 0 && <span>{toman(block.cost)}</span>}
          {block.note && <span>{block.note}</span>}
        </div>

        {poi && (
          <>
            <p className="mt-2 pr-[3.4rem] text-xs leading-relaxed text-ink-600 dark:text-ink-300">
              {poi.desc}
            </p>
            {onBlock && (
              <button
                type="button"
                onClick={() => onBlock(poi.id)}
                className="no-print mt-2 mr-[3.4rem] text-[11px] text-ink-400 underline-offset-2 hover:text-[#d03b3b] hover:underline"
              >
                این را نمی‌خواهم — از برنامه حذف کن
              </button>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5 pr-[3.4rem]">
              <Tag>
                {CATEGORY_EMOJI[poi.cat]} {CATEGORY_LABEL[poi.cat]}
              </Tag>
              <Tag>⭐ {faNum(poi.rating, 1)}</Tag>
              {poi.difficulty > 0 && <Tag>🥾 {DIFFICULTY_LABEL[poi.difficulty]}</Tag>}
              {poi.ticket === 0 && <Tag tone="good">رایگان</Tag>}
              {poi.kidFriendly && <Tag>👶 مناسب کودک</Tag>}
              {poi.seniorFriendly && <Tag>👵 مناسب سالمند</Tag>}
              {poi.requiresVehicle > 0 && (
                <Tag tone="warn">🚙 {poi.requiresVehicle === 2 ? 'آفرود' : 'شاسی‌بلند'}</Tag>
              )}
              {poi.indoor && <Tag>🏠 سرپوشیده</Tag>}
              {poi.nightSuitable && <Tag>🌙 شب‌گردی</Tag>}
              {poi.tags.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
          </>
        )}
      </div>
    </li>
  )
}

function Tag({
  children,
  tone = 'default',
}: {
  children: React.ReactNode
  tone?: 'default' | 'good' | 'warn'
}) {
  const cls =
    tone === 'good'
      ? 'bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
      : tone === 'warn'
        ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
        : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'
  return <span className={`badge ${cls}`}>{children}</span>
}

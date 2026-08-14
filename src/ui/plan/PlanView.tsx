import { useState } from 'react'
import type { PriceBook, TripPlan } from '../../domain/types'
import { getCity } from '../../data/cities'
import { getVehicle } from '../../data/vehicles'
import { STYLE_LABEL } from '../../data/pricing'
import { duration, faNum, km, tomanShort } from '../../lib/format'
import { formatJalali, fromISODate } from '../../lib/jalali'
import { Stat } from '../common/Bits'
import { CostPanel, CostThemeVars } from './CostPanel'
import { DayTimeline } from './DayTimeline'
import { TripMap } from './TripMap'
import { WarningList } from './Warnings'

type Tab = 'plan' | 'cost' | 'map'

export function PlanView({
  plan,
  onEdit,
  onPriceChange,
}: {
  plan: TripPlan
  onEdit: () => void
  onPriceChange: (patch: Partial<PriceBook>) => void
}) {
  const [tab, setTab] = useState<Tab>('plan')
  const [activeDay, setActiveDay] = useState<number | null>(null)

  const origin = getCity(plan.input.originCityId)
  const vehicle = getVehicle(plan.input.vehicleId)
  const start = fromISODate(plan.input.startDate)

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-4">
      {/* سربرگ */}
      <header className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">
              {faNum(plan.input.days)} روز از {origin.name}
            </h1>
            <p className="mt-0.5 text-xs text-ink-500">
              {formatJalali(start)} · {faNum(plan.input.travelers.length)} نفر · {vehicle.label} ·{' '}
              {STYLE_LABEL[plan.input.style]}
            </p>
          </div>
          <button type="button" className="btn-ghost btn-sm no-print" onClick={onEdit}>
            ✏️ ویرایش سفر
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="مسافت کل" value={km(plan.stats.totalKm)} />
          <Stat label="زمان رانندگی" value={duration(plan.stats.totalDrivingMin)} />
          <Stat label="جاذبه‌ها" value={`${faNum(plan.stats.poiCount)} مورد`} />
          <Stat
            label="هزینهٔ تخمینی"
            value={tomanShort(plan.cost.total)}
            sub={`نفری ${tomanShort(plan.cost.perPerson)}`}
            tone={plan.cost.overBudget > 0 ? 'bad' : 'good'}
          />
        </div>
      </header>

      {plan.warnings.length > 0 && (
        <div className="mb-4">
          <WarningList warnings={plan.warnings.filter((w) => !w.day)} />
        </div>
      )}

      {/* زبانه‌ها */}
      <nav className="no-print mb-4 flex gap-1 rounded-xl bg-ink-100 p-1 dark:bg-ink-900">
        {(
          [
            ['plan', '📅 برنامه'],
            ['cost', '💰 هزینه'],
            ['map', '🗺️ نقشه'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              tab === id
                ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-800 dark:text-ink-50'
                : 'text-ink-500'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'plan' && (
        <div className="space-y-8">
          {plan.days.map((day) => (
            <DayTimeline key={day.index} day={day} />
          ))}
        </div>
      )}

      {tab === 'cost' && (
        <CostThemeVars>
          <CostPanel plan={plan} onPriceChange={onPriceChange} />
        </CostThemeVars>
      )}

      {tab === 'map' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <DayChip on={activeDay === null} onClick={() => setActiveDay(null)}>
              کل سفر
            </DayChip>
            {plan.days.map((d) => (
              <DayChip
                key={d.index}
                on={activeDay === d.index}
                onClick={() => setActiveDay(d.index)}
              >
                روز {faNum(d.index)}
              </DayChip>
            ))}
          </div>

          <TripMap plan={plan} dayFilter={activeDay} />

          <p className="text-[11px] text-ink-400">
            خط‌چین مسیر تقریبی است، نه مسیر واقعی جاده. مسافت‌ها با ضریب پیچش جاده تخمین زده شده‌اند.
          </p>
        </div>
      )}
    </div>
  )
}

function DayChip({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button type="button" onClick={onClick} className={`chip ${on ? 'chip-on' : ''}`}>
      {children}
    </button>
  )
}

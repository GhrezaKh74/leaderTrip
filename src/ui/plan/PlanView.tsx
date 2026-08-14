import { useState } from 'react'
import type { PriceBook, TripInput, TripPlan, WeatherMap } from '../../domain/types'
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
import { NearbyPanel } from './NearbyPanel'
import { OptimizerPanel } from './OptimizerPanel'
import { PackingPanel } from './PackingPanel'

type Tab = 'plan' | 'cost' | 'map' | 'packing' | 'nearby'

export type WeatherStatus = 'idle' | 'loading' | 'ok' | 'unavailable'

export function PlanView({
  plan,
  weather,
  weatherStatus,
  onEdit,
  onPriceChange,
  onInputChange,
}: {
  plan: TripPlan
  weather?: WeatherMap
  weatherStatus: WeatherStatus
  onEdit: () => void
  onPriceChange: (patch: Partial<PriceBook>) => void
  onInputChange: (patch: Partial<TripInput>) => void
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
            ['packing', '🎒 چک‌لیست'],
            ['nearby', '✨ بیشتر'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 whitespace-nowrap rounded-lg px-1 py-2 text-xs font-medium transition sm:text-sm ${
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
          {weatherStatus === 'loading' && (
            <p className="text-xs text-ink-400">در حال گرفتن آب‌وهوای مقصدها…</p>
          )}
          {weatherStatus === 'unavailable' && (
            <p className="rounded-lg bg-ink-100 p-2.5 text-[11px] text-ink-500 dark:bg-ink-900">
              آب‌وهوا در دسترس نیست (اینترنت وصل نیست یا سرویس پاسخ نداد). برنامه بدون در نظر
              گرفتن هوا چیده شده است — پیش از حرکت خودتان هواشناسی را چک کنید.
            </p>
          )}
          {plan.days.map((day) => (
            <DayTimeline
              key={day.index}
              day={day}
              onBlock={(poiId) =>
                onInputChange({ blockedPoiIds: [...plan.input.blockedPoiIds, poiId] })
              }
            />
          ))}
        </div>
      )}

      {tab === 'cost' && (
        <CostThemeVars>
          <div className="space-y-5">
            <CostPanel plan={plan} onPriceChange={onPriceChange} />
            <OptimizerPanel plan={plan} weather={weather} onApply={onInputChange} />
          </div>
        </CostThemeVars>
      )}

      {tab === 'packing' && <PackingPanel plan={plan} />}

      {tab === 'nearby' && <NearbyPanel plan={plan} onChange={onInputChange} />}

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

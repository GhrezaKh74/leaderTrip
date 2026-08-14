import type { TripPlan } from '../../domain/types'
import { getCity } from '../../data/cities'
import { getVehicle } from '../../data/vehicles'
import { STYLE_LABEL } from '../../data/pricing'
import { POI_BY_ID } from '../../data/pois'
import { buildPackingList } from '../../engine/packing'
import { clock, duration, faNum, km, toman, tomanShort } from '../../lib/format'
import { formatJalali, fromISODate } from '../../lib/jalali'

/**
 * نسخهٔ چاپی — یک سند کامل، مستقل از اینکه کاربر کدام زبانه را باز کرده.
 *
 * چیزی که در جاده به درد می‌خورد این است: برنامهٔ روزها، جمع هزینه،
 * شماره‌های اضطراری و چک‌لیست بار، همه روی کاغذ.
 */
export function PrintSheet({ plan }: { plan: TripPlan }) {
  const origin = getCity(plan.input.originCityId)
  const vehicle = getVehicle(plan.input.vehicleId)
  const packing = buildPackingList(plan)

  return (
    <div className="hidden print:block">
      <header className="mb-4 border-b border-ink-300 pb-3">
        <h1 className="text-xl font-bold">
          برنامهٔ سفر — {faNum(plan.input.days)} روز از {origin.name}
        </h1>
        <p className="mt-1 text-xs">
          {formatJalali(fromISODate(plan.input.startDate), true)} ·{' '}
          {faNum(plan.input.travelers.length)} نفر · {vehicle.label} ·{' '}
          {STYLE_LABEL[plan.input.style]}
        </p>
        <p className="mt-1 text-xs">
          {km(plan.stats.totalKm)} · {duration(plan.stats.totalDrivingMin)} رانندگی ·{' '}
          {faNum(plan.stats.poiCount)} بازدید · برآورد {tomanShort(plan.cost.total)} (نفری{' '}
          {tomanShort(plan.cost.perPerson)})
        </p>
      </header>

      {/* روزها */}
      {plan.days.map((day) => {
        const staysOver = day.blocks.some((b) => b.kind === 'lodging')
        return (
        <section key={day.index} className="mb-4">
          <h2 className="border-b border-ink-300 pb-1 text-sm font-bold">
            روز {faNum(day.index)} — {formatJalali(fromISODate(day.date), true)} ·{' '}
            {staysOver ? 'شب در' : 'پایان روز در'} {getCity(day.baseCityId).name}
          </h2>
          <p className="mt-1 text-[11px]">
            {km(day.distanceKm)} · {duration(day.drivingMinutes)} رانندگی · {toman(day.cost)}
            {day.weather &&
              ` · ${faNum(day.weather.tMax)}°/${faNum(day.weather.tMin)}° · بارش ${faNum(day.weather.precipProb)}٪`}
          </p>

          <table className="mt-2 w-full text-[11px]">
            <tbody>
              {day.blocks
                .filter((b) => b.durationMin > 0 || b.kind === 'lodging')
                .map((b, i) => {
                  const poi = b.poiId ? POI_BY_ID.get(b.poiId) : null
                  return (
                    <tr key={`${b.kind}-${i}`} className="border-b border-ink-200">
                      <td className="w-14 py-1 align-top tabular-nums">{clock(b.startMin)}</td>
                      <td className="py-1 align-top">
                        <span className={b.kind === 'visit' ? 'font-bold' : ''}>{b.title}</span>
                        {poi?.ticket ? (
                          <span className="mr-2 text-ink-600">بلیت {toman(poi.ticket)}</span>
                        ) : null}
                        {b.distanceKm ? (
                          <span className="mr-2 text-ink-600">{km(b.distanceKm)}</span>
                        ) : null}
                      </td>
                      <td className="w-20 py-1 text-left align-top tabular-nums">
                        {b.cost > 0 ? toman(b.cost) : ''}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </section>
        )
      })}

      {/* هزینه */}
      <section className="mb-4" style={{ breakInside: 'avoid' }}>
        <h2 className="border-b border-ink-300 pb-1 text-sm font-bold">تفکیک هزینه</h2>
        <table className="mt-2 w-full text-[11px]">
          <tbody>
            {plan.cost.lines.map((l) => (
              <tr key={l.key} className="border-b border-ink-200">
                <td className="py-1">{l.label}</td>
                <td className="py-1 text-left tabular-nums">{toman(l.amount)}</td>
              </tr>
            ))}
            <tr className="border-b border-ink-200">
              <td className="py-1">متفرقه</td>
              <td className="py-1 text-left tabular-nums">{toman(plan.cost.misc)}</td>
            </tr>
            <tr className="border-b border-ink-200">
              <td className="py-1">بافر ریسک</td>
              <td className="py-1 text-left tabular-nums">{toman(plan.cost.buffer)}</td>
            </tr>
            <tr className="font-bold">
              <td className="py-1">جمع کل</td>
              <td className="py-1 text-left tabular-nums">{toman(plan.cost.total)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-1 text-[10px]">
          همهٔ ارقام تخمینی‌اند — بازهٔ محتمل {tomanShort(plan.cost.optimistic)} تا{' '}
          {tomanShort(plan.cost.pessimistic)}.
        </p>
      </section>

      {/* اضطراری */}
      <section className="mb-4" style={{ breakInside: 'avoid' }}>
        <h2 className="border-b border-ink-300 pb-1 text-sm font-bold">شماره‌های اضطراری</h2>
        <p className="mt-2 text-[11px]">
          اورژانس ۱۱۵ · پلیس ۱۱۰ · آتش‌نشانی ۱۲۵ · راهداری ۱۴۱ · پلیس راه ۰۹۶۴۴۰ · هلال احمر ۱۱۲
        </p>
        <p className="mt-1 text-[11px]">
          {plan.input.travelers
            .map((t, i) => `${t.name || `همسفر ${faNum(i + 1)}`}${t.phone ? ` — ${t.phone}` : ''}`)
            .join(' · ')}
        </p>
      </section>

      {/* چک‌لیست */}
      <section style={{ breakInside: 'avoid' }}>
        <h2 className="border-b border-ink-300 pb-1 text-sm font-bold">چک‌لیست بار</h2>
        {packing.map((g) => (
          <p key={g.title} className="mt-2 text-[11px]">
            <span className="font-bold">{g.title}: </span>
            {g.items.map((i) => `☐ ${i.label}`).join(' · ')}
          </p>
        ))}
      </section>

      <footer className="mt-6 border-t border-ink-300 pt-2 text-[10px]">
        ساخته‌شده با لیدرتریپ — ارقام تخمینی‌اند و پیش از سفر باید با قیمت روز به‌روز شوند.
      </footer>
    </div>
  )
}

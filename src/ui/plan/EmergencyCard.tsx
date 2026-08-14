import type { TripPlan } from '../../domain/types'
import { getCity } from '../../data/cities'
import { faNum, toFa } from '../../lib/format'
import { formatJalali, fromISODate } from '../../lib/jalali'

/**
 * کارت اطلاعات اضطراری — ساخته شده برای چاپ و گذاشتن در داشبورد خودرو.
 * همه‌چیزش باید بدون اینترنت و بدون گوشی هم قابل استفاده باشد.
 */

const NATIONAL = [
  { label: 'اورژانس', number: '۱۱۵' },
  { label: 'پلیس', number: '۱۱۰' },
  { label: 'آتش‌نشانی', number: '۱۲۵' },
  { label: 'راهداری و وضعیت جاده', number: '۱۴۱' },
  { label: 'پلیس راه', number: '۰۹۶۴۴۰' },
  { label: 'هلال احمر', number: '۱۱۲' },
]

export function EmergencyCard({ plan }: { plan: TripPlan }) {
  const drivers = plan.input.travelers.filter((t) => t.isDriver)
  const withPhone = plan.input.travelers.filter((t) => t.phone?.trim())

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
        <h3 className="text-sm font-bold">شماره‌های اضطراری</h3>
        <p className="mt-1 text-[11px] text-ink-500">
          این کارت را چاپ کنید و در داشبورد خودرو بگذارید — وقتی گوشی خاموش یا آنتن قطع است
          به کار می‌آید.
        </p>

        <ul className="mt-4 grid grid-cols-2 gap-2">
          {NATIONAL.map((n) => (
            <li
              key={n.number}
              className="rounded-xl border border-ink-200 p-3 dark:border-ink-800"
            >
              <p className="text-[11px] text-ink-500">{n.label}</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums">{n.number}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
        <h3 className="text-sm font-bold">مسیر سفر</h3>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex justify-between gap-3 border-b border-ink-100 pb-2 dark:border-ink-800">
            <span className="text-ink-500">مبدأ</span>
            <span className="font-medium">{getCity(plan.input.originCityId).name}</span>
          </li>
          {plan.days.map((d) => {
            const city = getCity(d.baseCityId)
            return (
              <li
                key={d.index}
                className="flex justify-between gap-3 border-b border-ink-100 pb-2 last:border-0 dark:border-ink-800"
              >
                <span className="text-ink-500">
                  روز {faNum(d.index)} — {formatJalali(fromISODate(d.date))}
                </span>
                <span className="font-medium">
                  {city.name}
                  <span className="mr-1 text-[11px] text-ink-400">({city.province})</span>
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="rounded-2xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
        <h3 className="text-sm font-bold">اعضای گروه</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {plan.input.travelers.map((t, i) => (
            <li
              key={t.id}
              className="flex items-baseline justify-between gap-3 border-b border-ink-100 pb-2 last:border-0 dark:border-ink-800"
            >
              <span>
                {t.name || `همسفر ${faNum(i + 1)}`}
                {/* جداکنندهٔ غیرعددی لازم است: دو عدد چسبیده در متن راست‌به‌چپ
                    به‌هم می‌پیوندند و «همسفر ۱» + «۳۵ ساله» را «۱۳۵» می‌خوانند */}
                <span className="mr-1.5 text-[11px] text-ink-400">· {faNum(t.age)} ساله</span>
                {t.isDriver && (
                  <span className="badge mr-1.5 bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200">
                    راننده
                  </span>
                )}
              </span>
              {t.phone && <span className="tabular-nums text-ink-600">{toFa(t.phone)}</span>}
            </li>
          ))}
        </ul>

        {withPhone.length === 0 && (
          <p className="mt-3 text-[11px] text-ink-400">
            شمارهٔ تماس اعضا در گام «همسفران» قابل افزودن است.
          </p>
        )}
        {drivers.length === 0 && (
          <p className="mt-3 text-[11px] text-[#d03b3b]">هیچ راننده‌ای مشخص نشده است.</p>
        )}
      </div>
    </div>
  )
}

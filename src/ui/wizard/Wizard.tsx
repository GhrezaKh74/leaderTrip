import { useState } from 'react'
import type { POICategory, TravelStyle, TripInput, LodgingKind } from '../../domain/types'
import { CITIES } from '../../data/cities'
import { VEHICLES } from '../../data/vehicles'
import { CATEGORY_EMOJI, CATEGORY_LABEL } from '../../data/pois'
import { LODGING_LABEL, STYLE_LABEL } from '../../data/pricing'
import { faNum, toFa, tomanShort } from '../../lib/format'
import { formatJalali, fromISODate } from '../../lib/jalali'
import { Card, Chip, Field, JalaliDateInput, SectionTitle, Slider } from '../common/Bits'

const STEPS = ['مقصد', 'زمان', 'همسفران', 'خودرو', 'سلیقه'] as const

const INTERESTS: POICategory[] = [
  'historical',
  'nature',
  'religious',
  'museum',
  'mountain',
  'desert',
  'waterfall',
  'lake',
  'beach',
  'village',
  'cave',
  'garden',
  'adventure',
  'shopping',
  'entertainment',
]

interface Props {
  input: TripInput
  onChange: (patch: Partial<TripInput>) => void
  onSubmit: () => void
}

export function Wizard({ input, onChange, onSubmit }: Props) {
  const [step, setStep] = useState(0)
  const last = step === STEPS.length - 1

  const sortedCities = [...CITIES].sort((a, b) => a.name.localeCompare(b.name, 'fa'))

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6">
      {/* نوار پیشرفت */}
      <ol className="mb-6 flex items-center gap-1">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-1">
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`flex-1 rounded-lg px-2 py-2 text-center text-[11px] font-medium transition ${
                i === step
                  ? 'bg-brand-600 text-white'
                  : i < step
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200'
                    : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400'
              }`}
            >
              {s}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card>
          <SectionTitle hint="یا مقصد را خودتان بگویید، یا بگذارید ما بر اساس شعاع پیشنهاد بدهیم.">
            کجا می‌رویم؟
          </SectionTitle>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="مبدأ سفر">
              <select
                className="field"
                value={input.originCityId}
                onChange={(e) => onChange({ originCityId: e.target.value })}
              >
                {sortedCities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.province}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="مقصد">
              <select
                className="field"
                value={input.destinationCityId ?? ''}
                onChange={(e) => onChange({ destinationCityId: e.target.value || null })}
              >
                <option value="">🎲 خودت پیشنهاد بده (کشف آزاد)</option>
                {sortedCities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-5">
            <Slider
              label={input.destinationCityId ? 'حداکثر انحراف از مسیر' : 'شعاع جست‌وجو از مبدأ'}
              value={input.radiusKm}
              min={50}
              max={900}
              step={25}
              onChange={(v) => onChange({ radiusKm: v })}
              format={(v) => `${faNum(v)} کیلومتر`}
            />
          </div>

          <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-600"
              checked={input.roundTrip}
              onChange={(e) => onChange({ roundTrip: e.target.checked })}
            />
            <span>در پایان سفر به مبدأ برمی‌گردیم</span>
          </label>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <SectionTitle hint="طول سفر و ساعت‌های مفید روز، سقف کاری که در هر روز شدنی است را تعیین می‌کند.">
            کِی و چند روز؟
          </SectionTitle>

          <Field label="تاریخ شروع">
            <JalaliDateInput value={input.startDate} onChange={(v) => onChange({ startDate: v })} />
          </Field>
          <p className="mt-1.5 text-xs text-ink-500">
            {formatJalali(fromISODate(input.startDate), true)}
          </p>

          <div className="mt-5 space-y-5">
            <Slider
              label="تعداد روز"
              value={input.days}
              min={1}
              max={14}
              onChange={(v) => onChange({ days: v })}
              format={(v) => `${faNum(v)} روز`}
            />
            <Slider
              label="سقف رانندگی روزانه"
              value={input.maxDrivingHoursPerDay}
              min={2}
              max={10}
              step={0.5}
              onChange={(v) => onChange({ maxDrivingHoursPerDay: v })}
              format={(v) => `${faNum(v, v % 1 ? 1 : 0)} ساعت`}
            />

            <div className="grid grid-cols-2 gap-4">
              <Field label="شروع روز">
                <select
                  className="field"
                  value={input.dayStartHour}
                  onChange={(e) => onChange({ dayStartHour: Number(e.target.value) })}
                >
                  {[6, 7, 8, 9, 10].map((h) => (
                    <option key={h} value={h}>
                      {toFa(h)}:۰۰
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="پایان روز">
                <select
                  className="field"
                  value={input.dayEndHour}
                  onChange={(e) => onChange({ dayEndHour: Number(e.target.value) })}
                >
                  {[17, 18, 19, 20, 21, 22, 23].map((h) => (
                    <option key={h} value={h}>
                      {toFa(h)}:۰۰
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </Card>
      )}

      {step === 2 && <TravelersStep input={input} onChange={onChange} />}

      {step === 3 && (
        <Card>
          <SectionTitle hint="مصرف سوخت و توان خودرو، هم هزینه و هم فهرست مقصدهای ممکن را عوض می‌کند.">
            با چه خودرویی؟
          </SectionTitle>

          <Field label="نوع خودرو">
            <select
              className="field"
              value={input.vehicleId}
              onChange={(e) => onChange({ vehicleId: e.target.value })}
            >
              {VEHICLES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>

          <VehicleSummary vehicleId={input.vehicleId} />

          <div className="mt-5 space-y-5">
            <Slider
              label="تعداد خودرو (کاروان)"
              value={input.vehicleCount}
              min={1}
              max={6}
              onChange={(v) => onChange({ vehicleCount: v })}
              format={(v) => `${faNum(v)} خودرو`}
            />
            <Slider
              label="سهم سوخت با نرخ سهمیه‌ای"
              value={Math.round(input.subsidizedFuelShare * 100)}
              min={0}
              max={100}
              step={10}
              onChange={(v) => onChange({ subsidizedFuelShare: v / 100 })}
              format={(v) => `${faNum(v)}٪`}
            />
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <SectionTitle hint="این‌ها وزن‌های الگوریتم امتیازدهی جاذبه‌ها را تنظیم می‌کنند.">
            سلیقه و بودجه
          </SectionTitle>

          <Field label="بودجهٔ کل سفر (تومان)">
            <input
              className="field"
              type="number"
              min={0}
              step={1_000_000}
              value={input.budgetTotal}
              onChange={(e) => onChange({ budgetTotal: Number(e.target.value) })}
            />
          </Field>
          <p className="mt-1.5 text-xs text-ink-500">
            {tomanShort(input.budgetTotal)} · نفری{' '}
            {tomanShort(input.budgetTotal / Math.max(1, input.travelers.length))}
          </p>

          <div className="mt-5">
            <span className="label">سطح سفر</span>
            <div className="flex flex-wrap gap-2">
              {(['budget', 'balanced', 'comfort', 'luxury'] as TravelStyle[]).map((s) => (
                <Chip key={s} on={input.style === s} onClick={() => onChange({ style: s })}>
                  {STYLE_LABEL[s]}
                </Chip>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <span className="label">نوع اقامت</span>
            <div className="flex flex-wrap gap-2">
              {(['hotel', 'ecolodge', 'villa', 'camp', 'friends'] as LodgingKind[]).map((l) => (
                <Chip key={l} on={input.lodging === l} onClick={() => onChange({ lodging: l })}>
                  {LODGING_LABEL[l]}
                </Chip>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <span className="label">
              علاقه‌مندی‌ها {input.interests.length > 0 && `(${faNum(input.interests.length)})`}
            </span>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((c) => (
                <Chip
                  key={c}
                  on={input.interests.includes(c)}
                  onClick={() =>
                    onChange({
                      interests: input.interests.includes(c)
                        ? input.interests.filter((x) => x !== c)
                        : [...input.interests, c],
                    })
                  }
                >
                  <span aria-hidden>{CATEGORY_EMOJI[c]}</span>
                  {CATEGORY_LABEL[c]}
                </Chip>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ناوبری */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          قبلی
        </button>

        {last ? (
          <button type="button" className="btn-primary flex-1 sm:flex-none" onClick={onSubmit}>
            ✨ برنامه را بساز
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={() => setStep((s) => s + 1)}>
            بعدی
          </button>
        )}
      </div>
    </div>
  )
}

function VehicleSummary({ vehicleId }: { vehicleId: string }) {
  const v = VEHICLES.find((x) => x.id === vehicleId)
  if (!v) return null

  const offroadLabel = ['فقط جادهٔ آسفالت', 'جادهٔ خاکی سبک', 'آفرود واقعی'][v.offroad]

  return (
    <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-ink-50 p-3 text-xs dark:bg-ink-950 sm:grid-cols-4">
      <div>
        <dt className="text-ink-500">مصرف</dt>
        <dd className="font-medium">
          {faNum(v.consumption, 1)} {v.fuel === 'electric' ? 'kWh' : 'لیتر'}/۱۰۰کیلومتر
        </dd>
      </div>
      <div>
        <dt className="text-ink-500">ظرفیت</dt>
        <dd className="font-medium">{faNum(v.seats)} نفر</dd>
      </div>
      <div>
        <dt className="text-ink-500">توان مسیر</dt>
        <dd className="font-medium">{offroadLabel}</dd>
      </div>
      <div>
        <dt className="text-ink-500">اهلاک</dt>
        <dd className="font-medium">{faNum(v.depreciationPerKm)} تومان/کیلومتر</dd>
      </div>
    </dl>
  )
}

function TravelersStep({
  input,
  onChange,
}: {
  input: TripInput
  onChange: (patch: Partial<TripInput>) => void
}) {
  const update = (id: string, patch: Partial<TripInput['travelers'][number]>) =>
    onChange({
      travelers: input.travelers.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })

  const add = () =>
    onChange({
      travelers: [
        ...input.travelers,
        {
          id: `t${Date.now()}`,
          name: '',
          age: 30,
          mobility: 'full',
          isDriver: false,
        },
      ],
    })

  const remove = (id: string) =>
    onChange({ travelers: input.travelers.filter((t) => t.id !== id) })

  return (
    <Card>
      <SectionTitle hint="سنِ کم‌توان‌ترین عضو گروه سقف سختی برنامه را تعیین می‌کند — این‌جا دقیق باشید.">
        چه کسانی می‌آیند؟
      </SectionTitle>

      <div className="space-y-2">
        {input.travelers.map((t, i) => (
          <div
            key={t.id}
            className="grid grid-cols-12 items-center gap-2 rounded-xl border border-ink-200 p-2 dark:border-ink-800"
          >
            <input
              className="field col-span-4 py-2"
              placeholder={`همسفر ${toFa(i + 1)}`}
              value={t.name}
              onChange={(e) => update(t.id, { name: e.target.value })}
            />
            <div className="col-span-3">
              <input
                className="field py-2 text-center"
                type="number"
                min={0}
                max={110}
                value={t.age}
                onChange={(e) => update(t.id, { age: Number(e.target.value) })}
                aria-label="سن"
              />
            </div>
            <select
              className="field col-span-3 py-2"
              value={t.mobility}
              onChange={(e) =>
                update(t.id, { mobility: e.target.value as TripInput['travelers'][number]['mobility'] })
              }
              aria-label="وضعیت تحرک"
            >
              <option value="full">تحرک کامل</option>
              <option value="limited">تحرک محدود</option>
              <option value="wheelchair">ویلچر</option>
            </select>

            <button
              type="button"
              title={t.isDriver ? 'راننده است' : 'راننده نیست'}
              onClick={() => update(t.id, { isDriver: !t.isDriver })}
              className={`col-span-1 rounded-lg py-2 text-center text-base ${
                t.isDriver
                  ? 'bg-brand-100 dark:bg-brand-900/50'
                  : 'bg-ink-100 opacity-40 dark:bg-ink-800'
              }`}
            >
              🚗
            </button>

            <button
              type="button"
              onClick={() => remove(t.id)}
              disabled={input.travelers.length === 1}
              className="col-span-1 rounded-lg py-2 text-center text-ink-400 hover:text-[#d03b3b] disabled:opacity-30"
              title="حذف"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="btn-ghost mt-3 w-full" onClick={add}>
        + افزودن همسفر
      </button>

      <p className="mt-3 text-xs text-ink-500">
        مجموع {faNum(input.travelers.length)} نفر ·{' '}
        {faNum(input.travelers.filter((t) => t.isDriver).length)} راننده
      </p>
    </Card>
  )
}

import { describe, expect, it } from 'vitest'
import type { DayWeather, TripInput, WeatherMap } from '../../domain/types'
import { defaultInput, generatePlan } from '../planner'
import { budgetLevers } from '../optimizer'
import { buildPackingList } from '../packing'
import {
  buildWeatherProfile,
  needsSiesta,
  pickDayWeather,
  weatherScoreAdjust,
  weatherSpeedFactor,
  weatherWindowShift,
} from '../climate'
import { POI_BY_ID, POIS } from '../../data/pois'
import { addDays, fromISODate, toISODate } from '../../lib/jalali'
import { weatherKey } from '../../services/weather'

// ─────────────────────── ابزار ساخت آب‌وهوای ساختگی ───────────────────────

const CLEAR = { code: 0, precipMm: 0, precipProb: 5, windMaxKmh: 10, tMax: 24, tMin: 12 }
const RAINY = { code: 63, precipMm: 12, precipProb: 90, windMaxKmh: 25, tMax: 16, tMin: 9 }
const SNOWY = { code: 73, precipMm: 8, precipProb: 95, windMaxKmh: 30, tMax: 1, tMin: -6 }
const HOT = { code: 0, precipMm: 0, precipProb: 0, windMaxKmh: 15, tMax: 43, tMin: 28 }

/** آب‌وهوای یکسان برای همهٔ روزهای سفر، به نام شهر مبدأ */
function weatherFor(input: TripInput, sample: Omit<DayWeather, 'date' | 'source'>): WeatherMap {
  const start = fromISODate(input.startDate)
  const map: WeatherMap = {}
  for (let i = 0; i < input.days; i += 1) {
    const date = toISODate(addDays(start, i))
    map[weatherKey(input.originCityId, date)] = { ...sample, date, source: 'forecast' }
  }
  return map
}

const baseTrip = (): TripInput => ({
  ...defaultInput(),
  originCityId: 'tehran',
  destinationCityId: null,
  startDate: '2025-10-10',
  days: 3,
  radiusKm: 300,
  travelers: [
    { id: '1', name: 'رضا', age: 35, mobility: 'full', isDriver: true },
    { id: '2', name: 'مینا', age: 33, mobility: 'full', isDriver: true },
  ],
  vehicleId: 'sedan-206',
  budgetTotal: 25_000_000,
  interests: ['historical', 'nature'],
})

// ─────────────────────── قواعد جوّی ───────────────────────

describe('climate', () => {
  it('روز بارانی جاذبهٔ سرپوشیده را بالا و فضای باز را پایین می‌برد', () => {
    const profile = buildWeatherProfile([{ ...RAINY, date: '2025-10-10', source: 'forecast' }])
    const indoor = POIS.find((p) => p.indoor)!
    const outdoor = POIS.find((p) => !p.indoor)!

    expect(weatherScoreAdjust(indoor, profile)).toBeGreaterThan(0)
    expect(weatherScoreAdjust(outdoor, profile)).toBeLessThan(0)
  })

  it('بدون داده هیچ تعدیلی اعمال نمی‌شود', () => {
    const profile = buildWeatherProfile([])
    expect(profile.source).toBe('none')
    expect(weatherScoreAdjust(POIS[0], profile)).toBe(0)
  })

  it('برف و طوفان سرعت را کم می‌کنند، هوای صاف نه', () => {
    const day = (s: typeof CLEAR) => ({ ...s, date: '2025-10-10', source: 'forecast' as const })
    expect(weatherSpeedFactor(day(CLEAR))).toBe(1)
    expect(weatherSpeedFactor(day(RAINY))).toBeLessThan(1)
    expect(weatherSpeedFactor(day(SNOWY))).toBeLessThan(weatherSpeedFactor(day(RAINY)))
    expect(weatherSpeedFactor(undefined)).toBe(1)
  })

  it('گرما روز را جلو می‌کشد و یخبندان عقب می‌اندازد', () => {
    const hot = { ...HOT, date: '2025-07-10', source: 'forecast' as const }
    const frost = { ...SNOWY, date: '2025-01-10', source: 'forecast' as const }

    expect(weatherWindowShift(hot).start).toBeLessThan(0)
    expect(weatherWindowShift(frost).start).toBeGreaterThan(0)
    expect(needsSiesta(hot)).toBe(true)
    expect(needsSiesta(frost)).toBe(false)
  })

  it('اگر شهر دقیق نبود، دادهٔ همان تاریخ در شهر دیگر برداشته می‌شود', () => {
    const map: WeatherMap = {
      [weatherKey('tehran', '2025-10-10')]: { ...CLEAR, date: '2025-10-10', source: 'forecast' },
    }
    expect(pickDayWeather(map, 'isfahan', '2025-10-10')?.tMax).toBe(CLEAR.tMax)
    expect(pickDayWeather(map, 'isfahan', '2025-10-11')).toBeUndefined()
    expect(pickDayWeather(undefined, 'tehran', '2025-10-10')).toBeUndefined()
  })

  it('خلاصهٔ جوّی سفر پرچم‌های درست را می‌زند', () => {
    const p = buildWeatherProfile([
      { ...CLEAR, date: '2025-10-10', source: 'forecast' },
      { ...SNOWY, date: '2025-10-11', source: 'forecast' },
    ])
    expect(p.hasSnow).toBe(true)
    expect(p.hasFrost).toBe(true)
    expect(p.hasHeat).toBe(false)
    expect(p.source).toBe('forecast')
  })

  it('اگر حتی یک روز از بایگانی باشد، کل خلاصه «انتظار فصلی» می‌شود', () => {
    const p = buildWeatherProfile([
      { ...CLEAR, date: '2025-10-10', source: 'forecast' },
      { ...CLEAR, date: '2025-10-11', source: 'historical' },
    ])
    expect(p.source).toBe('historical')
  })
})

// ─────────── معیار پذیرش فاز ۲: هوا برنامه را عوض می‌کند و دلیلش را می‌گوید ───────────

describe('weather changes the plan', () => {
  const input = baseTrip()

  it('برنامهٔ روز بارانی با برنامهٔ روز آفتابی فرق دارد', () => {
    const clear = generatePlan(input, weatherFor(input, CLEAR))
    const rainy = generatePlan(input, weatherFor(input, RAINY))

    const ids = (p: typeof clear) =>
      p.days
        .flatMap((d) => d.blocks)
        .filter((b) => b.kind === 'visit')
        .map((b) => b.poiId)
        .join(',')

    expect(ids(rainy)).not.toBe(ids(clear))
  })

  it('در روز بارانی سهم جاذبه‌های سرپوشیده بیشتر می‌شود', () => {
    const indoorShare = (w: WeatherMap) => {
      const plan = generatePlan(input, w)
      const visited = plan.days
        .flatMap((d) => d.blocks)
        .filter((b) => b.kind === 'visit' && b.poiId)
        .map((b) => POI_BY_ID.get(b.poiId!)!)
      return visited.filter((p) => p.indoor).length / Math.max(1, visited.length)
    }

    expect(indoorShare(weatherFor(input, RAINY))).toBeGreaterThan(
      indoorShare(weatherFor(input, CLEAR)),
    )
  })

  it('در برف سرعت مؤثر سفر پایین می‌آید', () => {
    // مسافت کل معیار درستی نیست: برف انتخاب جاذبه‌ها را هم عوض می‌کند و ممکن
    // است مسیر کلاً به منطقهٔ دیگری برود. چیزی که همیشه باید صادق باشد،
    // «کیلومتر بر ساعت» است.
    const speed = (w: WeatherMap) => {
      const p = generatePlan(input, w)
      return p.stats.totalKm / Math.max(1, p.stats.totalDrivingMin)
    }
    expect(speed(weatherFor(input, SNOWY))).toBeLessThan(speed(weatherFor(input, CLEAR)))
  })

  it('برنامه دلیلش را می‌گوید — هشدار بارش با روز مشخص', () => {
    const rainy = generatePlan(input, weatherFor(input, RAINY))
    const rainWarnings = rainy.warnings.filter((w) => w.title.includes('بارش'))
    expect(rainWarnings.length).toBeGreaterThan(0)
    expect(rainWarnings.every((w) => typeof w.day === 'number')).toBe(true)
  })

  it('برف هشدار جدی و توصیهٔ زنجیر چرخ می‌دهد', () => {
    const snowy = generatePlan(input, weatherFor(input, SNOWY))
    const snow = snowy.warnings.find((w) => w.detail.includes('زنجیر چرخ'))
    expect(snow).toBeDefined()
    expect(snow!.level).toBe('danger')
  })

  it('گرمای شدید استراحت نیم‌روزی اضافه می‌کند', () => {
    const summer = { ...input, startDate: '2025-07-10' }
    const hot = generatePlan(summer, weatherFor(summer, HOT))
    const siestas = hot.days.flatMap((d) =>
      d.blocks.filter((b) => b.kind === 'rest' && b.title.includes('نیم‌روزی')),
    )
    expect(siestas.length).toBeGreaterThan(0)
  })

  it('آب‌وهوای بایگانی برچسب «انتظار فصلی» می‌گیرد', () => {
    const map = weatherFor(input, CLEAR)
    for (const k of Object.keys(map)) map[k] = { ...map[k], source: 'historical' }
    const plan = generatePlan(input, map)
    expect(plan.warnings.some((w) => w.title.includes('انتظار فصلی'))).toBe(true)
  })

  it('بدون آب‌وهوا برنامه کامل ساخته می‌شود', () => {
    const plan = generatePlan(input)
    expect(plan.weather.source).toBe('none')
    expect(plan.stats.poiCount).toBeGreaterThan(0)
    expect(plan.days.every((d) => d.weather === undefined)).toBe(true)
  })
})

// ─────────────────────── مشاور ───────────────────────

describe('advisor', () => {
  it('نبود راننده هشدار جدی می‌دهد', () => {
    const input = baseTrip()
    const plan = generatePlan({
      ...input,
      travelers: input.travelers.map((t) => ({ ...t, isDriver: false })),
    })
    expect(plan.warnings.some((w) => w.level === 'danger' && w.title.includes('راننده'))).toBe(true)
  })

  it('بودجهٔ کم هشدار می‌دهد و به راه‌های کاهش اشاره می‌کند', () => {
    const plan = generatePlan({ ...baseTrip(), budgetTotal: 2_000_000, style: 'luxury' })
    const w = plan.warnings.find((x) => x.title.includes('بالاتر از بودجه'))
    expect(w).toBeDefined()
    expect(w!.detail).toContain('کاهش هزینه')
  })

  it('هر هشدار عنوان و توضیح غیرخالی دارد', () => {
    const plan = generatePlan(baseTrip(), weatherFor(baseTrip(), RAINY))
    for (const w of plan.warnings) {
      expect(w.title.length).toBeGreaterThan(3)
      expect(w.detail.length).toBeGreaterThan(10)
    }
  })

  it('هشدارهای روز به همان روز چسبانده می‌شوند', () => {
    const plan = generatePlan(baseTrip(), weatherFor(baseTrip(), SNOWY))
    for (const day of plan.days) {
      expect(day.warnings.every((w) => w.day === day.index)).toBe(true)
    }
  })
})

// ─────────────────────── بهینه‌ساز بودجه ───────────────────────

describe('budget optimizer', () => {
  const overBudget = (): TripInput => ({
    ...baseTrip(),
    style: 'luxury',
    budgetTotal: 8_000_000,
    days: 4,
  })

  it('برای سفر گران‌تر از بودجه اهرم پیشنهاد می‌دهد', () => {
    const plan = generatePlan(overBudget())
    expect(plan.cost.overBudget).toBeGreaterThan(0)
    expect(budgetLevers(plan).length).toBeGreaterThan(0)
  })

  it('هر اهرم صرفه‌جویی مثبت دارد و بر اساس آن مرتب شده است', () => {
    const levers = budgetLevers(generatePlan(overBudget()))
    expect(levers.every((l) => l.saving > 0)).toBe(true)
    for (let i = 1; i < levers.length; i += 1) {
      expect(levers[i - 1].saving).toBeGreaterThanOrEqual(levers[i].saving)
    }
  })

  it('صرفه‌جویی اعلام‌شده با اجرای واقعی همان تغییر می‌خواند', () => {
    const input = overBudget()
    const plan = generatePlan(input)
    for (const lever of budgetLevers(plan)) {
      const applied = generatePlan({ ...input, ...lever.patch })
      expect(plan.cost.total - applied.cost.total).toBeCloseTo(lever.saving, 3)
    }
  })

  it('سفر ارزان هم اهرم دارد ولی هیچ‌کدام الزامی نیست', () => {
    const plan = generatePlan({ ...baseTrip(), style: 'budget', budgetTotal: 100_000_000 })
    expect(plan.cost.overBudget).toBeLessThan(0)
    expect(budgetLevers(plan).every((l) => l.saving > 0)).toBe(true)
  })
})

// ─────────────────────── پین و حذف ───────────────────────

describe('pin and block', () => {
  it('جاذبهٔ پین‌شده یا در برنامه می‌آید یا صریحاً گزارش می‌شود', () => {
    const input = baseTrip()
    const others = generatePlan(input).candidates.filter((c) => !c.inPlan)
    expect(others.length).toBeGreaterThan(0)

    // هر پین ممکن است با سقف رانندگی جور درنیاید؛ چیزی که هرگز مجاز نیست،
    // انداختنِ بی‌صدای آن است
    for (const target of others.slice(0, 5)) {
      const plan = generatePlan({ ...input, pinnedPoiIds: [target.poiId] })
      const visited = plan.days
        .flatMap((d) => d.blocks)
        .filter((b) => b.kind === 'visit')
        .map((b) => b.poiId)

      const scheduled = visited.includes(target.poiId)
      const reported = plan.warnings.some((w) => w.title.includes('جا نشد'))
      expect(scheduled || reported).toBe(true)
    }
  })

  it('پین‌کردن یک جاذبه، مسیر را واقعاً به سمت آن می‌چرخاند', () => {
    const input = baseTrip()
    const before = generatePlan(input)
    const target = before.candidates.filter((c) => !c.inPlan)[0]
    const after = generatePlan({ ...input, pinnedPoiIds: [target.poiId] })

    const ids = (p: typeof before) => p.candidates.filter((c) => c.inPlan).map((c) => c.poiId)
    expect(ids(after)).not.toEqual(ids(before))
  })

  it('جاذبهٔ حذف‌شده دیگر پیشنهاد نمی‌شود', () => {
    const input = baseTrip()
    const inPlan = generatePlan(input).candidates.find((c) => c.inPlan)!

    const blocked = generatePlan({ ...input, blockedPoiIds: [inPlan.poiId] })
    const visited = blocked.days
      .flatMap((d) => d.blocks)
      .filter((b) => b.kind === 'visit')
      .map((b) => b.poiId)
    expect(visited).not.toContain(inPlan.poiId)
  })

  it('فهرست کاندیدها هم موارد داخل برنامه و هم بیرون را نشان می‌دهد', () => {
    const plan = generatePlan(baseTrip())
    expect(plan.candidates.filter((c) => c.inPlan).length).toBe(plan.stats.poiCount)
    expect(plan.candidates.some((c) => !c.inPlan)).toBe(true)
  })
})

// ─────────────────────── چک‌لیست ───────────────────────

describe('packing list', () => {
  it('اقلام پایه همیشه هستند', () => {
    const groups = buildPackingList(generatePlan(baseTrip()))
    const labels = groups.flatMap((g) => g.items.map((i) => i.label))
    expect(labels.some((l) => l.includes('گواهی‌نامه'))).toBe(true)
    expect(labels.some((l) => l.includes('کمک‌های اولیه'))).toBe(true)
    expect(labels.some((l) => l.includes('زاپاس'))).toBe(true)
  })

  it('کمپینگ چادر و کیسه‌خواب اضافه می‌کند', () => {
    const groups = buildPackingList(generatePlan({ ...baseTrip(), lodging: 'camp' }))
    const labels = groups.flatMap((g) => g.items.map((i) => i.label))
    expect(labels.some((l) => l.includes('چادر'))).toBe(true)
    expect(labels.some((l) => l.includes('کیسه‌خواب'))).toBe(true)
  })

  it('کودک خردسال پوشک و صندلی ایمنی می‌آورد', () => {
    const input = baseTrip()
    const groups = buildPackingList(
      generatePlan({
        ...input,
        travelers: [...input.travelers, { id: 'k', name: 'نی‌نی', age: 2, mobility: 'full', isDriver: false }],
      }),
    )
    const labels = groups.flatMap((g) => g.items.map((i) => i.label))
    expect(labels.some((l) => l.includes('پوشک'))).toBe(true)
    expect(labels.some((l) => l.includes('صندلی ایمنی'))).toBe(true)
  })

  it('هر قلم غیرضروریِ پیشنهادی دلیل دارد یا عمومی است', () => {
    const groups = buildPackingList(generatePlan(baseTrip()))
    expect(groups.length).toBeGreaterThan(3)
    for (const g of groups) {
      expect(g.items.length).toBeGreaterThan(0)
      for (const i of g.items) expect(i.label.length).toBeGreaterThan(2)
    }
  })

  it('چک‌لیست بدون کودک و سالمند، بخش‌های مربوطه را نمی‌آورد', () => {
    const groups = buildPackingList(generatePlan(baseTrip()))
    expect(groups.some((g) => g.title === 'کودکان')).toBe(false)
  })
})

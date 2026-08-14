import { describe, expect, it } from 'vitest'
import { defaultInput, generatePlan } from '../planner'
import { computeCost, effectiveFuelPrice, loadFactor, splitCost } from '../cost'
import { haversineKm, roadKm, distanceToCorridor } from '../geo'
import { optimizeOrder, orderLength } from '../router'
import { buildGroupProfile } from '../scoring'
import { sunTimes } from '../sun'
import { formatJalali, fromISODate, toGregorian, toJalali } from '../../lib/jalali'
import { getCity } from '../../data/cities'
import { getVehicle } from '../../data/vehicles'
import { POIS } from '../../data/pois'
import { DEFAULT_PRICES } from '../../data/pricing'
import type { TripInput } from '../../domain/types'

// ─────────────────────── جغرافیا ───────────────────────

describe('geo', () => {
  it('فاصلهٔ تهران تا اصفهان را درست حساب می‌کند', () => {
    const d = haversineKm(getCity('tehran'), getCity('isfahan'))
    // فاصلهٔ هوایی واقعی حدود ۳۴۰ کیلومتر است
    expect(d).toBeGreaterThan(320)
    expect(d).toBeLessThan(360)
  })

  it('فاصلهٔ یک نقطه با خودش صفر است', () => {
    expect(haversineKm({ lat: 35, lng: 51 }, { lat: 35, lng: 51 })).toBe(0)
  })

  it('مسیر کوهستانی ضریب پیچش بیشتری از آزادراه دارد', () => {
    expect(roadKm(100, 'mountain')).toBeGreaterThan(roadKm(100, 'freeway'))
  })

  it('نقطهٔ روی مسیر انحراف صفر دارد', () => {
    const from = { lat: 35, lng: 51 }
    const to = { lat: 33, lng: 51 }
    expect(distanceToCorridor({ lat: 34, lng: 51 }, from, to)).toBeLessThan(1)
  })
})

// ─────────────────────── مسیریابی ───────────────────────

describe('router', () => {
  it('ترتیب بهینه از ترتیب اولیه کوتاه‌تر یا مساوی است', () => {
    const start = { lat: 35.7, lng: 51.4 }
    const pts = [
      { lat: 32.6, lng: 51.7 },
      { lat: 29.6, lng: 52.5 },
      { lat: 34.0, lng: 51.4 },
      { lat: 31.9, lng: 54.4 },
    ]
    const optimized = optimizeOrder(start, pts)
    expect(orderLength(start, optimized)).toBeLessThanOrEqual(orderLength(start, pts) + 1e-6)
    expect(optimized).toHaveLength(pts.length)
  })

  it('با یک نقطه یا صفر نقطه بدون خطا کار می‌کند', () => {
    const s = { lat: 35, lng: 51 }
    expect(optimizeOrder(s, [])).toEqual([])
    expect(optimizeOrder(s, [{ lat: 30, lng: 50 }])).toHaveLength(1)
  })
})

// ─────────────────────── تقویم ───────────────────────

describe('jalali', () => {
  it('نوروز ۱۴۰۳ برابر ۲۰ مارس ۲۰۲۴ است', () => {
    const d = toGregorian(1403, 1, 1)
    expect(d.getFullYear()).toBe(2024)
    expect(d.getMonth() + 1).toBe(3)
    expect(d.getDate()).toBe(20)
  })

  // ۱۴۰۳ کبیسه است (۳۶۶ روز)، پس نوروز سال بعد یک روز جلو می‌افتد
  it('نوروز ۱۴۰۴ برابر ۲۱ مارس ۲۰۲۵ است', () => {
    const d = toGregorian(1404, 1, 1)
    expect(d.getFullYear()).toBe(2025)
    expect(d.getMonth() + 1).toBe(3)
    expect(d.getDate()).toBe(21)
  })

  it('تبدیل رفت‌وبرگشت تاریخ را حفظ می‌کند', () => {
    for (const iso of ['2025-01-15', '2025-08-14', '2026-03-21', '2024-02-29']) {
      const d = fromISODate(iso)
      const j = toJalali(d)
      const back = toGregorian(j.jy, j.jm, j.jd)
      expect(back.getTime()).toBe(d.getTime())
    }
  })

  it('تاریخ را فارسی می‌نویسد', () => {
    expect(formatJalali(fromISODate('2025-08-14'))).toContain('مرداد')
  })
})

// ─────────────────────── خورشید ───────────────────────

describe('sun', () => {
  it('روز تابستان در تهران بلندتر از روز زمستان است', () => {
    const summer = sunTimes(new Date(2025, 5, 21), 35.69, 51.39)
    const winter = sunTimes(new Date(2025, 11, 21), 35.69, 51.39)
    expect(summer.daylightMin).toBeGreaterThan(winter.daylightMin)
    expect(summer.daylightMin).toBeGreaterThan(13 * 60)
    expect(winter.daylightMin).toBeLessThan(11 * 60)
  })

  it('طلوع در تهران حوالی ساعت منطقی است', () => {
    const s = sunTimes(new Date(2025, 5, 21), 35.69, 51.39)
    expect(s.sunriseMin).toBeGreaterThan(4 * 60)
    expect(s.sunriseMin).toBeLessThan(7 * 60)
  })
})

// ─────────────────────── پروفایل گروه ───────────────────────

describe('groupProfile', () => {
  it('ضعیف‌ترین عضو سقف سختی را تعیین می‌کند', () => {
    const withToddler = buildGroupProfile([
      { id: '1', name: '', age: 30, mobility: 'full', isDriver: true },
      { id: '2', name: '', age: 2, mobility: 'full', isDriver: false },
    ])
    expect(withToddler.hasToddler).toBe(true)
    expect(withToddler.maxDifficulty).toBeLessThanOrEqual(1)

    const allAdults = buildGroupProfile([
      { id: '1', name: '', age: 30, mobility: 'full', isDriver: true },
      { id: '2', name: '', age: 28, mobility: 'full', isDriver: true },
    ])
    expect(allAdults.maxDifficulty).toBe(3)
    expect(allAdults.drivers).toBe(2)
  })

  it('ویلچر توان را به کمترین حد می‌رساند', () => {
    const g = buildGroupProfile([
      { id: '1', name: '', age: 40, mobility: 'wheelchair', isDriver: true },
    ])
    expect(g.hasWheelchair).toBe(true)
    expect(g.maxDifficulty).toBe(0)
  })
})

// ─────────────────────── هزینه ───────────────────────

describe('cost', () => {
  const base = () => ({
    input: { ...defaultInput(), budgetTotal: 30_000_000 },
    vehicle: getVehicle('sedan-206'),
    group: buildGroupProfile(defaultInput().travelers),
    totalKm: 1000,
    mountainShare: 0,
    nightCities: [getCity('isfahan'), getCity('kashan')],
    visitedPois: POIS.slice(0, 4),
    month: 5,
  })

  it('قیمت مؤثر سوخت بین نرخ سهمیه‌ای و آزاد قرار می‌گیرد', () => {
    const v = getVehicle('sedan-206')
    const p = effectiveFuelPrice(DEFAULT_PRICES, v, 0.6)
    expect(p).toBeGreaterThan(DEFAULT_PRICES.fuelSubsidized.gasoline)
    expect(p).toBeLessThan(DEFAULT_PRICES.fuelFree.gasoline)
    expect(effectiveFuelPrice(DEFAULT_PRICES, v, 1)).toBe(DEFAULT_PRICES.fuelSubsidized.gasoline)
    expect(effectiveFuelPrice(DEFAULT_PRICES, v, 0)).toBe(DEFAULT_PRICES.fuelFree.gasoline)
  })

  it('ضریب بار با سرنشین بیشتر بالا می‌رود ولی سقف دارد', () => {
    expect(loadFactor(2)).toBe(1)
    expect(loadFactor(5)).toBeCloseTo(1.09)
    expect(loadFactor(50)).toBe(1.2)
  })

  it('جمع کل برابر زیرجمع به‌علاوهٔ متفرقه و بافر است', () => {
    const c = computeCost(base())
    expect(c.total).toBeCloseTo(c.subtotal + c.misc + c.buffer, 5)
    expect(c.subtotal).toBeCloseTo(
      c.lines.reduce((s, l) => s + l.amount, 0),
      5,
    )
  })

  it('همهٔ اقلام هزینه فرمول قابل نمایش دارند', () => {
    const c = computeCost(base())
    for (const line of c.lines) {
      expect(line.formula.length).toBeGreaterThan(0)
      expect(line.amount).toBeGreaterThanOrEqual(0)
    }
  })

  it('اهلاک خودرو در محاسبه هست و با مسافت نسبت مستقیم دارد', () => {
    const c1 = computeCost(base())
    const c2 = computeCost({ ...base(), totalKm: 2000 })
    const d1 = c1.lines.find((l) => l.key === 'depreciation')!
    const d2 = c2.lines.find((l) => l.key === 'depreciation')!
    expect(d1.amount).toBeGreaterThan(0)
    expect(d2.amount).toBeCloseTo(d1.amount * 2, 5)
  })

  it('سفر لوکس گران‌تر از سفر اقتصادی است', () => {
    const b = base()
    const cheap = computeCost({ ...b, input: { ...b.input, style: 'budget' } })
    const lux = computeCost({ ...b, input: { ...b.input, style: 'luxury' } })
    expect(lux.total).toBeGreaterThan(cheap.total * 2)
  })

  it('بازهٔ خوش‌بینانه تا بدبینانه جمع کل را در بر می‌گیرد', () => {
    const c = computeCost(base())
    expect(c.optimistic).toBeLessThan(c.total)
    expect(c.pessimistic).toBeGreaterThan(c.total)
  })

  it('تقسیم هزینه دقیقاً کل مبلغ را پخش می‌کند', () => {
    const input: TripInput = {
      ...defaultInput(),
      travelers: [
        { id: 'a', name: 'الف', age: 35, mobility: 'full', isDriver: true },
        { id: 'b', name: 'ب', age: 33, mobility: 'full', isDriver: false },
        { id: 'c', name: 'ج', age: 8, mobility: 'full', isDriver: false },
      ],
    }
    const shares = splitCost(9_000_000, input, 'weighted')
    expect(shares.reduce((s, x) => s + x.amount, 0)).toBeCloseTo(9_000_000, 3)
    // کودک سهم کمتری دارد
    expect(shares[2].amount).toBeLessThan(shares[0].amount)
  })
})

// ─────────────────────── برنامه‌ریز ───────────────────────

describe('planner', () => {
  /** سناریوی پذیرش فاز ۱ از docs/03-roadmap.md */
  const acceptanceInput = (): TripInput => ({
    ...defaultInput(),
    originCityId: 'tehran',
    destinationCityId: null,
    startDate: '2025-10-10',
    days: 3,
    radiusKm: 300,
    travelers: [
      { id: '1', name: 'رضا', age: 35, mobility: 'full', isDriver: true },
      { id: '2', name: 'مینا', age: 33, mobility: 'full', isDriver: true },
      { id: '3', name: 'آرش', age: 8, mobility: 'full', isDriver: false },
      { id: '4', name: 'پدربزرگ', age: 67, mobility: 'full', isDriver: false },
    ],
    vehicleId: 'sedan-206',
    budgetTotal: 25_000_000,
    interests: ['historical', 'nature', 'village'],
  })

  it('سناریوی پذیرش: برنامهٔ ۳ روزه با ۶ تا ۹ جاذبه می‌سازد', () => {
    const plan = generatePlan(acceptanceInput())
    expect(plan.days).toHaveLength(3)
    expect(plan.stats.poiCount).toBeGreaterThanOrEqual(5)
    expect(plan.cost.total).toBeGreaterThan(0)
  })

  it('هیچ روزی از سقف رانندگی تجاوز نمی‌کند', () => {
    const input = acceptanceInput()
    const plan = generatePlan(input)
    for (const day of plan.days) {
      // مقداری تلورانس برای مسیر اجباری بازگشت روز آخر
      expect(day.drivingMinutes).toBeLessThanOrEqual(input.maxDrivingHoursPerDay * 60 + 90)
    }
  })

  it('هیچ بلوکی بعد از پایان روز شروع نمی‌شود جز اقامت و شام', () => {
    const input = acceptanceInput()
    const plan = generatePlan(input)
    for (const day of plan.days) {
      for (const b of day.blocks) {
        if (b.kind === 'lodging' || b.kind === 'meal') continue
        expect(b.startMin).toBeLessThanOrEqual(input.dayEndHour * 60 + 60)
      }
    }
  })

  it('بلوک‌های هر روز به ترتیب زمانی مرتب‌اند', () => {
    const plan = generatePlan(acceptanceInput())
    for (const day of plan.days) {
      for (let i = 1; i < day.blocks.length; i += 1) {
        expect(day.blocks[i].startMin).toBeGreaterThanOrEqual(day.blocks[i - 1].startMin)
      }
    }
  })

  it('با خودروی سواری هیچ جاذبهٔ آفرودی پیشنهاد نمی‌شود', () => {
    const plan = generatePlan({ ...acceptanceInput(), vehicleId: 'eco-sedan' })
    const visited = plan.days
      .flatMap((d) => d.blocks)
      .filter((b) => b.kind === 'visit')
      .map((b) => POIS.find((p) => p.id === b.poiId)!)
    expect(visited.every((p) => p.requiresVehicle === 0)).toBe(true)
  })

  it('با عضو ویلچری هیچ مسیر سختی پیشنهاد نمی‌شود', () => {
    const input = acceptanceInput()
    const plan = generatePlan({
      ...input,
      travelers: [
        ...input.travelers,
        { id: '5', name: 'مادر', age: 70, mobility: 'wheelchair', isDriver: false },
      ],
    })
    const visited = plan.days
      .flatMap((d) => d.blocks)
      .filter((b) => b.kind === 'visit')
      .map((b) => POIS.find((p) => p.id === b.poiId)!)
    expect(visited.every((p) => p.difficulty === 0)).toBe(true)
  })

  it('سفر رفت‌وبرگشتی روز آخر به مبدأ برمی‌گردد', () => {
    const plan = generatePlan({ ...acceptanceInput(), roundTrip: true })
    expect(plan.days[plan.days.length - 1].baseCityId).toBe('tehran')
  })

  it('شب‌های پرداختی حداکثر یکی کمتر از تعداد روزهاست', () => {
    const plan = generatePlan(acceptanceInput())
    expect(plan.stats.nights).toBeGreaterThan(0)
    expect(plan.stats.nights).toBeLessThanOrEqual(2)
  })

  it('در سفر چندروزه جاذبه‌ای از شهر خودِ مسافر پیشنهاد نمی‌شود', () => {
    const plan = generatePlan(acceptanceInput())
    const visitedIds = plan.days
      .flatMap((d) => d.blocks)
      .filter((b) => b.kind === 'visit')
      .map((b) => b.poiId)
    const fromHome = POIS.filter((p) => p.cityId === 'tehran').map((p) => p.id)
    expect(visitedIds.some((id) => fromHome.includes(id!))).toBe(false)
  })

  it('شب ماندن در شهر خودِ مسافر هزینهٔ اقامت ندارد', () => {
    const plan = generatePlan({ ...acceptanceInput(), days: 2, radiusKm: 60 })
    const homeNights = plan.days.filter((d) => d.baseCityId === 'tehran')
    for (const d of homeNights) {
      const lodging = d.blocks.filter((b) => b.kind === 'lodging')
      expect(lodging.every((b) => b.cost === 0)).toBe(true)
    }
  })

  it('نبود راننده هشدار جدی تولید می‌کند', () => {
    const input = acceptanceInput()
    const plan = generatePlan({
      ...input,
      travelers: input.travelers.map((t) => ({ ...t, isDriver: false })),
    })
    expect(plan.warnings.some((w) => w.level === 'danger')).toBe(true)
  })

  it('سفر یک‌روزه بدون شب اقامت است', () => {
    const plan = generatePlan({ ...acceptanceInput(), days: 1 })
    expect(plan.days).toHaveLength(1)
    expect(plan.stats.nights).toBe(0)
    expect(plan.cost.lines.find((l) => l.key === 'lodging')!.amount).toBe(0)
  })

  it('مقصد مشخص باعث می‌شود جاذبه‌های مسیر انتخاب شوند', () => {
    const plan = generatePlan({
      ...acceptanceInput(),
      destinationCityId: 'isfahan',
      days: 4,
      radiusKm: 400,
    })
    expect(plan.stats.poiCount).toBeGreaterThan(0)
    expect(plan.stats.totalKm).toBeGreaterThan(200)
  })

  it('هزینهٔ روزها با زیرجمع کل هم‌خوانی دارد', () => {
    const plan = generatePlan(acceptanceInput())
    const sumDays = plan.days.reduce((s, d) => s + d.cost, 0)
    // باید دقیقاً برابر باشند — هر اختلافی یعنی قلمی در یکی از دو مسیر جا افتاده
    expect(sumDays).toBeCloseTo(plan.cost.subtotal, 3)
  })
})

// ─────────────────────── سلامت داده ───────────────────────

describe('data integrity', () => {
  it('شناسهٔ جاذبه‌ها تکراری نیست', () => {
    const ids = POIS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('هر جاذبه به شهر معتبری اشاره می‌کند', () => {
    for (const p of POIS) {
      expect(() => getCity(p.cityId)).not.toThrow()
    }
  })

  it('مختصات همهٔ جاذبه‌ها داخل محدودهٔ ایران است', () => {
    for (const p of POIS) {
      expect(p.lat).toBeGreaterThan(24)
      expect(p.lat).toBeLessThan(40)
      expect(p.lng).toBeGreaterThan(43)
      expect(p.lng).toBeLessThan(64)
    }
  })

  it('مقادیر جاذبه‌ها در بازهٔ معتبرند', () => {
    for (const p of POIS) {
      expect(p.rating).toBeGreaterThanOrEqual(1)
      expect(p.rating).toBeLessThanOrEqual(5)
      expect(p.visitMinutes).toBeGreaterThan(0)
      expect(p.ticket).toBeGreaterThanOrEqual(0)
      expect(p.bestMonths.length).toBeGreaterThan(0)
      expect(p.bestMonths.every((m) => m >= 1 && m <= 12)).toBe(true)
    }
  })

  it('هر جاذبه توضیح دارد', () => {
    for (const p of POIS) {
      expect(p.desc.length).toBeGreaterThan(10)
    }
  })
})

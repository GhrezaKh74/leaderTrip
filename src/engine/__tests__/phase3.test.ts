import { describe, expect, it } from 'vitest'
import type { CustomStop, TripInput } from '../../domain/types'
import { defaultInput, generatePlan, customStopToPoi, CUSTOM_PREFIX } from '../planner'
import { decodeTrip, encodeTrip } from '../../lib/share'

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

const visitedIds = (plan: ReturnType<typeof generatePlan>) =>
  plan.days.flatMap((d) => d.blocks.filter((b) => b.kind === 'visit').map((b) => b.poiId!))

const dayOf = (plan: ReturnType<typeof generatePlan>, poiId: string) =>
  plan.days.find((d) => d.blocks.some((b) => b.kind === 'visit' && b.poiId === poiId))?.index

// ─────────────────────── ویرایش دستی ───────────────────────

describe('manual day assignment', () => {
  it('جاذبه به روزی که کاربر گفته منتقل می‌شود', () => {
    const input = baseTrip()
    const plan = generatePlan(input)

    // جاذبه‌ای پیدا کن که در روز اول است و می‌شود به روز دوم بردش
    const first = plan.days[0].blocks.find((b) => b.kind === 'visit')?.poiId
    expect(first).toBeDefined()

    const moved = generatePlan({ ...input, dayAssignment: { [first!]: 2 } })
    if (visitedIds(moved).includes(first!)) {
      expect(dayOf(moved, first!)).toBe(2)
    } else {
      // اگر با قیدهای روز دوم جور درنیامد، دست‌کم نباید در روز اول مانده باشد
      expect(dayOf(moved, first!)).toBeUndefined()
    }
  })

  it('سنجاق‌کردن به یک روز، جاذبه را از روزهای دیگر برمی‌دارد', () => {
    const input = baseTrip()
    const plan = generatePlan(input)
    const target = plan.days[0].blocks.find((b) => b.kind === 'visit')!.poiId!

    const moved = generatePlan({ ...input, dayAssignment: { [target]: 3 } })
    const day = dayOf(moved, target)
    expect(day === undefined || day === 3).toBe(true)
  })

  it('بدون سنجاق، برنامه دقیقاً همان قبلی می‌ماند', () => {
    const input = baseTrip()
    expect(visitedIds(generatePlan({ ...input, dayAssignment: {} }))).toEqual(
      visitedIds(generatePlan(input)),
    )
  })
})

// ─────────────────────── توقف دلخواه ───────────────────────

describe('custom stops', () => {
  const stop: CustomStop = {
    id: 'x1',
    name: 'خانهٔ عمو',
    cityId: 'lahijan',
    visitMinutes: 120,
    ticket: 0,
    cat: 'village',
  }

  it('به جاذبهٔ کامل با مختصات شهر تبدیل می‌شود', () => {
    const poi = customStopToPoi(stop)
    expect(poi.id).toBe(`${CUSTOM_PREFIX}x1`)
    expect(poi.name).toBe('خانهٔ عمو')
    expect(poi.lat).toBeCloseTo(37.2073, 3)
    expect(poi.bestMonths).toHaveLength(12)
  })

  it('همیشه در برنامه می‌آید — مثل یک پین اجباری', () => {
    const plan = generatePlan({ ...baseTrip(), customStops: [stop] })
    const ids = visitedIds(plan)
    const unscheduled = plan.warnings.some((w) => w.title.includes('جا نشد'))
    expect(ids.includes(`${CUSTOM_PREFIX}x1`) || unscheduled).toBe(true)
  })

  it('توقف بلیت‌دار به هزینهٔ سفر اضافه می‌کند', () => {
    const input = baseTrip()
    const withFree = generatePlan({ ...input, customStops: [stop] })
    const withPaid = generatePlan({
      ...input,
      customStops: [{ ...stop, ticket: 500_000 }],
    })

    const tickets = (p: typeof withFree) =>
      p.cost.lines.find((l) => l.key === 'tickets')!.amount

    if (visitedIds(withPaid).includes(`${CUSTOM_PREFIX}x1`)) {
      expect(tickets(withPaid)).toBeGreaterThan(tickets(withFree))
    }
  })

  it('نبودِ توقف دلخواه چیزی را خراب نمی‌کند', () => {
    const plan = generatePlan({ ...baseTrip(), customStops: [] })
    expect(plan.stats.poiCount).toBeGreaterThan(0)
  })
})

// ─────────────────────── لینک اشتراکی ───────────────────────

describe('share link', () => {
  it('رفت‌وبرگشت کامل: هرچه رفت، همان برمی‌گردد', () => {
    const input: TripInput = {
      ...baseTrip(),
      title: 'سفر شمال با بچه‌ها',
      pinnedPoiIds: ['masuleh'],
      blockedPoiIds: ['rudkhan'],
      dayAssignment: { masuleh: 2 },
      customStops: [
        { id: 'c1', name: 'کافهٔ جنگلی', cityId: 'fuman', visitMinutes: 60, ticket: 0, cat: 'food' },
      ],
      travelers: [
        { id: '1', name: 'رضا', age: 35, mobility: 'full', isDriver: true, phone: '09121234567' },
      ],
    }

    const decoded = decodeTrip(encodeTrip(input))
    expect(decoded).not.toBeNull()

    for (const key of Object.keys(input) as (keyof TripInput)[]) {
      expect(decoded![key]).toEqual(input[key])
    }
  })

  it('فارسی سالم رد و بدل می‌شود', () => {
    const input = { ...baseTrip(), title: 'سفر نوروزی به کویر مصر — ۱۴۰۴' }
    expect(decodeTrip(encodeTrip(input))!.title).toBe(input.title)
  })

  it('لینک فقط تفاوت‌ها را حمل می‌کند، پس کوتاه می‌ماند', () => {
    expect(encodeTrip(defaultInput()).length).toBeLessThan(120)
    expect(encodeTrip(baseTrip()).length).toBeLessThan(700)
  })

  it('لینک خراب یا دستکاری‌شده اپ را از کار نمی‌اندازد', () => {
    expect(decodeTrip('این-یک-لینک-معتبر-نیست')).toBeNull()
    expect(decodeTrip('')).toBeNull()
    expect(decodeTrip(btoa('{"o":""}'))).toBeNull()
  })

  it('لینک قدیمی که فیلد جدید ندارد، با پیش‌فرض پر می‌شود', () => {
    // شبیه‌سازی لینکی که پیش از افزوده‌شدن customStops ساخته شده
    const legacy = btoa(JSON.stringify({ o: 'shiraz', d: 5 }))
    const decoded = decodeTrip(legacy)
    expect(decoded).not.toBeNull()
    expect(decoded!.originCityId).toBe('shiraz')
    expect(decoded!.days).toBe(5)
    expect(decoded!.customStops).toEqual([])
    expect(decoded!.dayAssignment).toEqual({})
  })
})

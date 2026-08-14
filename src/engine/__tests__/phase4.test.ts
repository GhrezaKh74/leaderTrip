import { describe, expect, it } from 'vitest'
import type { Expense, Traveler, TripInput } from '../../domain/types'
import { defaultInput, generatePlan } from '../planner'
import { computeBalances, settle } from '../settlement'
import { buildActualsReport, scheduleDrift } from '../actuals'

const TRAVELERS: Traveler[] = [
  { id: 'a', name: 'رضا', age: 35, mobility: 'full', isDriver: true },
  { id: 'b', name: 'مینا', age: 33, mobility: 'full', isDriver: true },
  { id: 'c', name: 'سارا', age: 28, mobility: 'full', isDriver: false },
]

let seq = 0
function expense(partial: Partial<Expense> & { amount: number; paidBy: string }): Expense {
  seq += 1
  return {
    id: `e${seq}`,
    day: 1,
    category: 'meals',
    sharedWith: [],
    at: `2025-10-10T1${seq % 10}:00:00.000Z`,
    note: undefined,
    ...partial,
  }
}

const trip = (): TripInput => ({
  ...defaultInput(),
  originCityId: 'tehran',
  startDate: '2025-10-10',
  days: 3,
  radiusKm: 300,
  travelers: TRAVELERS,
  vehicleId: 'sedan-206',
  budgetTotal: 25_000_000,
})

// ─────────────────────── مانده‌ها ───────────────────────

describe('balances', () => {
  it('هزینهٔ مشترک بین همه مساوی تقسیم می‌شود', () => {
    const balances = computeBalances([expense({ amount: 300_000, paidBy: 'a' })], TRAVELERS)

    expect(balances.find((b) => b.travelerId === 'a')!.paid).toBe(300_000)
    for (const b of balances) expect(b.owed).toBeCloseTo(100_000, 5)
    expect(balances.find((b) => b.travelerId === 'a')!.net).toBeCloseTo(200_000, 5)
    expect(balances.find((b) => b.travelerId === 'b')!.net).toBeCloseTo(-100_000, 5)
  })

  it('اگر فقط چند نفر سهیم باشند، بقیه سهمی ندارند', () => {
    const balances = computeBalances(
      [expense({ amount: 200_000, paidBy: 'a', sharedWith: ['a', 'b'] })],
      TRAVELERS,
    )
    expect(balances.find((b) => b.travelerId === 'c')!.owed).toBe(0)
    expect(balances.find((b) => b.travelerId === 'b')!.owed).toBeCloseTo(100_000, 5)
  })

  it('جمع مانده‌ها همیشه صفر است', () => {
    const balances = computeBalances(
      [
        expense({ amount: 500_000, paidBy: 'a' }),
        expense({ amount: 300_000, paidBy: 'b', sharedWith: ['b', 'c'] }),
        expense({ amount: 120_000, paidBy: 'c' }),
      ],
      TRAVELERS,
    )
    expect(balances.reduce((s, b) => s + b.net, 0)).toBeCloseTo(0, 5)
  })

  it('هزینهٔ همسفری که دیگر در گروه نیست، حساب را خراب نمی‌کند', () => {
    const balances = computeBalances(
      [expense({ amount: 300_000, paidBy: 'ghost', sharedWith: ['ghost'] })],
      TRAVELERS,
    )
    expect(balances.every((b) => b.paid === 0 && b.owed === 0)).toBe(true)
  })

  it('مبلغ صفر یا منفی نادیده گرفته می‌شود', () => {
    const balances = computeBalances(
      [expense({ amount: 0, paidBy: 'a' }), expense({ amount: -5000, paidBy: 'a' })],
      TRAVELERS,
    )
    expect(balances.every((b) => b.paid === 0)).toBe(true)
  })
})

// ─────────────────────── تسویه‌حساب ───────────────────────

describe('settlement', () => {
  it('هرکس دقیقاً به اندازهٔ بدهی‌اش پول می‌دهد', () => {
    const expenses = [
      expense({ amount: 900_000, paidBy: 'a' }),
      expense({ amount: 300_000, paidBy: 'b' }),
    ]
    const balances = computeBalances(expenses, TRAVELERS)
    const transfers = settle(balances)

    for (const b of balances) {
      const out = transfers.filter((t) => t.fromId === b.travelerId).reduce((s, t) => s + t.amount, 0)
      const inn = transfers.filter((t) => t.toId === b.travelerId).reduce((s, t) => s + t.amount, 0)
      expect(inn - out).toBeCloseTo(b.net, 3)
    }
  })

  it('تعداد انتقال‌ها از تعداد نفرات کمتر است', () => {
    const expenses = [
      expense({ amount: 900_000, paidBy: 'a' }),
      expense({ amount: 150_000, paidBy: 'b' }),
      expense({ amount: 60_000, paidBy: 'c' }),
    ]
    const transfers = settle(computeBalances(expenses, TRAVELERS))
    expect(transfers.length).toBeLessThan(TRAVELERS.length)
  })

  it('وقتی همه سر به سرند، هیچ انتقالی لازم نیست', () => {
    const expenses = TRAVELERS.map((t) => expense({ amount: 300_000, paidBy: t.id }))
    expect(settle(computeBalances(expenses, TRAVELERS))).toHaveLength(0)
  })

  it('بدون هیچ هزینه‌ای، تسویه خالی است', () => {
    expect(settle(computeBalances([], TRAVELERS))).toHaveLength(0)
  })

  it('اختلاف‌های ناچیز نادیده گرفته می‌شوند', () => {
    // ۳۰۰ تومان اختلاف ارزش یک ردیف تسویه را ندارد
    const transfers = settle(computeBalances([expense({ amount: 900, paidBy: 'a' })], TRAVELERS))
    expect(transfers).toHaveLength(0)
  })

  it('هیچ‌کس به خودش پول نمی‌دهد', () => {
    const expenses = [
      expense({ amount: 700_000, paidBy: 'a' }),
      expense({ amount: 200_000, paidBy: 'c' }),
    ]
    const transfers = settle(computeBalances(expenses, TRAVELERS))
    expect(transfers.every((t) => t.fromId !== t.toId)).toBe(true)
    expect(transfers.every((t) => t.amount > 0)).toBe(true)
  })
})

// ─────────── معیار پذیرش فاز ۴: گزارش تخمین در برابر واقعیت ───────────

describe('estimate vs actual', () => {
  it('بدون داده، گزارش خالی و صادق است', () => {
    const report = buildActualsReport(generatePlan(trip()), [])
    expect(report.hasData).toBe(false)
    expect(report.totalActual).toBe(0)
    expect(report.daysRecorded).toBe(0)
  })

  it('هزینهٔ ثبت‌شده در دستهٔ درست می‌نشیند و با تخمین مقایسه می‌شود', () => {
    const plan = generatePlan(trip())
    const report = buildActualsReport(plan, [
      expense({ amount: 2_000_000, paidBy: 'a', category: 'lodging' }),
    ])

    const lodging = report.lines.find((l) => l.key === 'lodging')!
    expect(lodging.actual).toBe(2_000_000)
    expect(lodging.estimated).toBeGreaterThan(0)
    expect(lodging.delta).toBeCloseTo(lodging.actual - lodging.estimated, 5)
    expect(report.hasData).toBe(true)
  })

  it('جمع کل واقعی برابر جمع همهٔ ردیف‌هاست', () => {
    const plan = generatePlan(trip())
    const report = buildActualsReport(plan, [
      expense({ amount: 500_000, paidBy: 'a', category: 'fuel' }),
      expense({ amount: 900_000, paidBy: 'b', category: 'meals' }),
      expense({ amount: 300_000, paidBy: 'c', category: 'other' }),
    ])
    expect(report.totalActual).toBeCloseTo(
      report.lines.reduce((s, l) => s + l.actual, 0),
      5,
    )
    expect(report.delta).toBeCloseTo(report.totalActual - report.totalEstimated, 5)
  })

  it('اهلاک خودرو در هر دو طرف مقایسه می‌آید — وگرنه واقعیت به‌ناحق ارزان به نظر می‌رسد', () => {
    const plan = generatePlan(trip())
    const report = buildActualsReport(plan, [expense({ amount: 100_000, paidBy: 'a' })])

    const dep = report.lines.find((l) => l.key === 'depreciation')
    expect(dep).toBeDefined()
    expect(dep!.actual).toBe(dep!.estimated)
    expect(dep!.delta).toBe(0)
  })

  it('تعداد روزهای ثبت‌شده درست شمرده می‌شود', () => {
    const plan = generatePlan(trip())
    const report = buildActualsReport(plan, [
      expense({ amount: 100_000, paidBy: 'a', day: 1 }),
      expense({ amount: 100_000, paidBy: 'a', day: 1 }),
      expense({ amount: 100_000, paidBy: 'a', day: 3 }),
    ])
    expect(report.daysRecorded).toBe(2)
  })
})

// ─────────────────────── اختلاف با برنامه ───────────────────────

describe('schedule drift', () => {
  it('رسیدن دیرتر از برنامه مثبت است', () => {
    const at = new Date(2025, 9, 10, 10, 30).toISOString()
    expect(scheduleDrift(9 * 60, at)).toBe(90)
  })

  it('رسیدن زودتر از برنامه منفی است', () => {
    const at = new Date(2025, 9, 10, 8, 30).toISOString()
    expect(scheduleDrift(9 * 60, at)).toBe(-30)
  })

  it('رسیدن سر وقت صفر است', () => {
    const at = new Date(2025, 9, 10, 9, 0).toISOString()
    expect(scheduleDrift(9 * 60, at)).toBe(0)
  })
})

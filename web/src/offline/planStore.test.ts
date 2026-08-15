import { beforeEach, describe, expect, it } from 'vitest'

import { clearPlan, loadPlan, savePlan } from './planStore'
import { DEFAULT_TRIP } from '../features/wizard/tripSchema'
import type { TripPlan } from '../api/schemas'

const PLAN: TripPlan = {
  days: [
    {
      index: 1,
      date: '2026-05-02',
      baseCityId: 'tehran',
      blocks: [
        {
          kind: 'Visit',
          startsAt: '09:56',
          durationMinutes: 108,
          title: 'کاخ گلستان',
          cost: 300_000,
          poiId: 'golestan',
        },
      ],
      kilometers: 210,
      drivingMinutes: 150,
      cost: 300_000,
    },
  ],
  cost: {
    lines: [{ key: 'fuel', label: 'سوخت', amount: 500_000, formula: '…' }],
    subtotal: 500_000,
    miscellaneous: 40_000,
    riskBuffer: 60_000,
    total: 600_000,
    perPerson: 300_000,
    optimistic: 510_000,
    pessimistic: 750_000,
    overBudget: -100_000,
  },
  totalKilometers: 210,
  totalDrivingMinutes: 150,
  visitCount: 1,
  unscheduledPoiIds: [],
  distanceSource: 'Estimated',
  advice: [{ code: 'budget.tight', level: 'Warning', title: 'بودجهٔ تنگ', detail: 'کمی ذخیره کنار بگذارید.' }],
  packing: [{ group: 'مدارک', item: 'کارت ملی', reason: 'کنترل جاده‌ای معمول است' }],
}

beforeEach(() => localStorage.clear())

describe('کش برنامهٔ آفلاین', () => {
  it('برنامه را ذخیره و بازیابی می‌کند', () => {
    savePlan(PLAN, DEFAULT_TRIP)

    const cached = loadPlan()

    expect(cached?.plan.days[0]?.blocks[0]?.title).toBe('کاخ گلستان')
    expect(cached?.input.originCityId).toBe(DEFAULT_TRIP.originCityId)
    expect(cached?.generatedAt).not.toBe('')
  })

  it('بدون برنامهٔ ذخیره‌شده، تهی برمی‌گرداند', () => {
    expect(loadPlan()).toBeNull()
  })

  /**
   * برنامهٔ ذخیره‌شده ممکن است از نسخهٔ قدیمی‌تر اپ مانده باشد. اعتماد به آن
   * یعنی صفحه‌ای که با خطای عجیب سفید می‌شود؛ اعتبارسنجی یعنی برگشت آرام به
   * ویزارد.
   */
  it('برنامهٔ ذخیره‌شده با شکل قدیمی را رد می‌کند', () => {
    localStorage.setItem(
      'leadertrip.lastPlan.v1',
      JSON.stringify({ plan: { days: 'یک' }, input: DEFAULT_TRIP }),
    )

    expect(loadPlan()).toBeNull()
  })

  it('محتوای خراب را رد می‌کند، نه اینکه بترکد', () => {
    localStorage.setItem('leadertrip.lastPlan.v1', 'نه JSON است و نه چیز دیگر')

    expect(loadPlan()).toBeNull()
  })

  it('پاک‌کردن، کش را خالی می‌کند', () => {
    savePlan(PLAN, DEFAULT_TRIP)
    clearPlan()

    expect(loadPlan()).toBeNull()
  })
})

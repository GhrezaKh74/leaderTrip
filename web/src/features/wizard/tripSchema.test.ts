import { describe, expect, it } from 'vitest'

import { DEFAULT_TRIP, parseTripForm, tripFormSchema } from './tripSchema'

describe('اعتبارسنجی ورودی سفر', () => {
  it('پیش‌فرض معتبر است', () => {
    expect(tripFormSchema.safeParse(DEFAULT_TRIP).success).toBe(true)
  })

  it('روز کوتاه‌تر از پنج ساعت را رد می‌کند', () => {
    const result = tripFormSchema.safeParse({ ...DEFAULT_TRIP, dayStartHour: 10, dayEndHour: 13 })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['dayEndHour'])
  })

  /**
   * بدون رانندهٔ واجد شرایط، برنامه‌ای که موتور می‌سازد روی کاغذ درست است و در
   * جاده غیرقابل اجرا. این را باید همین‌جا گرفت، نه بعد از ساخته‌شدن برنامه.
   */
  it('سفر بدون رانندهٔ بزرگسال را رد می‌کند', () => {
    const result = tripFormSchema.safeParse({
      ...DEFAULT_TRIP,
      travelers: [{ id: 'x', name: '', age: 15, mobility: 'Full', isDriver: true }],
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['travelers'])
  })

  it('گروه بدون هیچ همسفری را رد می‌کند', () => {
    expect(tripFormSchema.safeParse({ ...DEFAULT_TRIP, travelers: [] }).success).toBe(false)
  })

  it('تعداد روز خارج از محدوده را رد می‌کند', () => {
    expect(tripFormSchema.safeParse({ ...DEFAULT_TRIP, days: 0 }).success).toBe(false)
    expect(tripFormSchema.safeParse({ ...DEFAULT_TRIP, days: 31 }).success).toBe(false)
  })

  /**
   * ورودی ذخیره‌شده از نسخهٔ قدیمی‌تر باید بی‌سروصدا رد شود، نه اینکه با
   * `undefined` وارد فرم شود و بعداً «NaN تومان» روی صفحه بنشیند.
   */
  it('ورودی با شکل قدیمی را رد می‌کند', () => {
    const legacy = { ...DEFAULT_TRIP, style: 'balanced', budgetToman: '50000000' }

    expect(tripFormSchema.safeParse(legacy).success).toBe(false)
  })
})

describe('مبدأ و مقصد', () => {
  it('مقصد برابر مبدأ رد می‌شود', () => {
    const result = tripFormSchema.safeParse({ ...DEFAULT_TRIP, destinationCityId: DEFAULT_TRIP.originCityId })

    expect(result.success).toBe(false)
  })

  it('ورودیِ پیش از ویژگی مقصد (بدون فیلد) با parseTripForm باز می‌شود', () => {
    const { destinationCityId: _dropped, ...legacy } = DEFAULT_TRIP

    expect(tripFormSchema.safeParse(legacy).success).toBe(false)
    expect(parseTripForm(legacy)?.destinationCityId).toBeNull()
  })

  it('مقصد معتبر عبور می‌کند و یک‌سویه است', () => {
    const result = tripFormSchema.safeParse({ ...DEFAULT_TRIP, destinationCityId: 'isfahan' })

    expect(result.success).toBe(true)
  })
})

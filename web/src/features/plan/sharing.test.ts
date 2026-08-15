import { describe, expect, it } from 'vitest'

import { decodeTrip, encodeTrip } from './sharing'
import { DEFAULT_TRIP } from '../wizard/tripSchema'

describe('اشتراک‌گذاری سفر', () => {
  it('ورودی سفر را بی‌کم‌وکاست رفت‌وبرگشت می‌کند', () => {
    const trip = {
      ...DEFAULT_TRIP,
      travelers: [{ id: 't1', name: 'مریم', age: 34, mobility: 'Full' as const, isDriver: true }],
      pinnedPoiIds: ['golestan'],
    }

    expect(decodeTrip(encodeTrip(trip))).toEqual(trip)
  })

  /**
   * `btoa` فقط با بایت‌های لاتین کار می‌کند. بدون تبدیل صریح به بایت، نام
   * فارسی همسفران کل لینک را می‌شکند — و خطایش هم در لحظهٔ اشتراک‌گذاری
   * ظاهر می‌شود، نه در آزمایش.
   */
  it('نام فارسی همسفران لینک را نمی‌شکند', () => {
    const trip = {
      ...DEFAULT_TRIP,
      travelers: [{ id: 't1', name: 'محمدرضا', age: 40, mobility: 'Full' as const, isDriver: true }],
    }

    expect(decodeTrip(encodeTrip(trip))?.travelers[0]?.name).toBe('محمدرضا')
  })

  it('رشتهٔ خراب را بی‌سروصدا رد می‌کند', () => {
    expect(decodeTrip('نه-base64-است-و-نه-چیز-دیگر')).toBeNull()
  })

  it('ورودی معتبرِ base64 ولی با شکل ناسازگار را رد می‌کند', () => {
    // متن آزمون عمداً لاتین است: `btoa` خام با حرف فارسی خطا می‌دهد — همان
    // محدودیتی که `encodeTrip` با تبدیل صریح به بایت دورش می‌زند.
    expect(decodeTrip(btoa('{"days":"three"}'))).toBeNull()
  })

  it('خروجی برای نشانی امن است', () => {
    const encoded = encodeTrip(DEFAULT_TRIP)

    expect(encoded).not.toMatch(/[+/=]/)
  })
})

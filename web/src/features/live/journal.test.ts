import { describe, expect, it } from 'vitest'

import { driftMinutes, journalSchema, learnedTaste, type Journal } from './journal'

const journal = (checkIns: Journal['checkIns']): Journal => ({
  tripId: 'x',
  checkIns,
  expenses: [],
})

describe('یادگیری سلیقه', () => {
  /**
   * یک بازدیدِ بد در یک روز بارانی، «من از موزه بدم می‌آید» نیست. تا دو
   * امتیاز نرسد، دسته وارد نمی‌شود.
   */
  it('با یک امتیاز، چیزی یاد نمی‌گیرد', () => {
    const taste = learnedTaste(journal([{ poiId: 'a', arrivedAt: '10:00', rating: 5, category: 'Museum' }]))

    expect(taste).toEqual({})
  })

  it('امتیاز بالا به سلیقهٔ مثبت تبدیل می‌شود', () => {
    const taste = learnedTaste(
      journal([
        { poiId: 'a', arrivedAt: '10:00', rating: 5, category: 'Nature' },
        { poiId: 'b', arrivedAt: '12:00', rating: 5, category: 'Nature' },
      ]),
    )

    expect(taste['Nature']).toBe(1)
  })

  it('امتیاز پایین به سلیقهٔ منفی تبدیل می‌شود', () => {
    const taste = learnedTaste(
      journal([
        { poiId: 'a', arrivedAt: '10:00', rating: 1, category: 'Shopping' },
        { poiId: 'b', arrivedAt: '12:00', rating: 1, category: 'Shopping' },
      ]),
    )

    expect(taste['Shopping']).toBe(-1)
  })

  it('امتیاز میانه خنثی است', () => {
    const taste = learnedTaste(
      journal([
        { poiId: 'a', arrivedAt: '10:00', rating: 3, category: 'Historical' },
        { poiId: 'b', arrivedAt: '12:00', rating: 3, category: 'Historical' },
      ]),
    )

    expect(taste['Historical']).toBe(0)
  })
})

describe('اختلاف با برنامه', () => {
  it('دیرتر رسیدن مثبت است', () => {
    expect(driftMinutes('09:00', '09:25')).toBe(25)
  })

  it('زودتر رسیدن منفی است', () => {
    expect(driftMinutes('09:00', '08:40')).toBe(-20)
  })

  it('ساعت نامعتبر، تهی می‌دهد نه عدد بی‌معنا', () => {
    expect(driftMinutes('09:00', '')).toBeNull()
  })
})

describe('اسکیمای دفترچه', () => {
  it('چک‌این با شناسهٔ عکس، از ذخیره‌سازی سالم برمی‌گردد', () => {
    const stored = JSON.stringify({
      tripId: 'x',
      expenses: [],
      checkIns: [{ poiId: 'p1', arrivedAt: '10:00', photoId: `${'a'.repeat(32)}.jpg` }],
    })

    const parsed = journalSchema.safeParse(JSON.parse(stored))

    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data.checkIns[0]?.photoId).toBe(`${'a'.repeat(32)}.jpg`)
  })

  it('چک‌این بدون عکس همچنان معتبر است — عکس اختیاری است', () => {
    const parsed = journalSchema.safeParse({
      tripId: 'x',
      expenses: [],
      checkIns: [{ poiId: 'p1', arrivedAt: '10:00' }],
    })

    expect(parsed.success).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'

import { balances, settle } from './settlement'
import type { Expense } from './journal'

const people = ['a', 'b', 'c']

const expense = (id: string, amount: number, paidBy: string, sharedBy: string[] = []): Expense => ({
  id,
  label: id,
  amount,
  paidBy,
  sharedBy,
})

describe('تسویه‌حساب گروهی', () => {
  it('سهم هرکس از هزینهٔ مشترک برابر است', () => {
    const rows = balances([expense('شام', 300_000, 'a')], people)

    expect(rows.find((r) => r.travelerId === 'a')?.net).toBe(200_000)
    expect(rows.find((r) => r.travelerId === 'b')?.net).toBe(-100_000)
  })

  /** خالی‌بودن فهرست سهم‌داران یعنی «همه» — رایج‌ترین حالت. */
  it('هزینهٔ بدون فهرست سهم‌داران بین همه پخش می‌شود', () => {
    const rows = balances([expense('بنزین', 300_000, 'b')], people)

    expect(rows.every((r) => Math.abs(r.owes - 100_000) < 1)).toBe(true)
  })

  it('هزینهٔ با سهم‌داران مشخص، فقط بین همان‌ها پخش می‌شود', () => {
    const rows = balances([expense('بلیت', 200_000, 'a', ['a', 'b'])], people)

    expect(rows.find((r) => r.travelerId === 'c')?.owes).toBe(0)
    expect(rows.find((r) => r.travelerId === 'b')?.net).toBe(-100_000)
  })

  it('وقتی همه سهم مساوی داده‌اند، انتقالی لازم نیست', () => {
    const transfers = settle(
      [expense('۱', 300_000, 'a'), expense('۲', 300_000, 'b'), expense('۳', 300_000, 'c')],
      people,
    )

    expect(transfers).toEqual([])
  })

  /**
   * نکتهٔ اصلی: تعداد انتقال‌ها باید کمتر از تعداد افراد بماند. روش ساده
   * «هرکس به هرکس» برای سه نفر تا شش انتقال می‌سازد و در عمل کسی انجامش
   * نمی‌دهد.
   */
  it('کمترین تعداد جابه‌جایی پول را می‌سازد', () => {
    const transfers = settle([expense('شام', 900_000, 'a')], people)

    expect(transfers).toHaveLength(2)
    expect(transfers.every((t) => t.to === 'a')).toBe(true)
    expect(transfers.reduce((sum, t) => sum + t.amount, 0)).toBe(600_000)
  })

  it('جمع انتقال‌ها برابر جمع بدهی‌هاست', () => {
    const expenses = [expense('۱', 500_000, 'a'), expense('۲', 100_000, 'b')]
    const transfers = settle(expenses, people)
    const owed = balances(expenses, people)
      .filter((r) => r.net < 0)
      .reduce((sum, r) => sum - r.net, 0)

    expect(transfers.reduce((sum, t) => sum + t.amount, 0)).toBeCloseTo(owed, -2)
  })

  /** انتقال ۳۰۰ تومانی بین دو دوست، آزاردهنده است نه دقیق. */
  it('مانده‌های ریز نادیده گرفته می‌شوند', () => {
    const transfers = settle([expense('چای', 900, 'a')], people)

    expect(transfers).toEqual([])
  })
})

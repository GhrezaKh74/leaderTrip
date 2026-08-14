import type { Balance, Expense, Traveler, Transfer } from '../domain/types'
import { faNum } from '../lib/format'

/**
 * تسویه‌حساب گروهی — «چه کسی به چه کسی چقدر بدهکار است».
 *
 * هزینه‌ها را کسی می‌دهد و چند نفر مصرف می‌کنند. هدف این است که با
 * **کمترین تعداد جابه‌جایی پول** همه بی‌حساب شوند؛ نه اینکه هرکس با هرکس
 * جداگانه حساب کند.
 */

const TOLERANCE = 1000 // تومان — زیر این مقدار بی‌حساب فرض می‌شود

/** سهم هر نفر از هر هزینه، مساوی بین کسانی که در آن سهیم بوده‌اند */
export function computeBalances(expenses: Expense[], travelers: Traveler[]): Balance[] {
  const paid = new Map<string, number>()
  const owed = new Map<string, number>()
  const validIds = new Set(travelers.map((t) => t.id))

  for (const e of expenses) {
    if (e.amount <= 0) continue

    // فقط کسانی که واقعاً در گروه هستند — همسفر حذف‌شده نباید در حساب بماند
    const sharers = (e.sharedWith.length > 0 ? e.sharedWith : travelers.map((t) => t.id)).filter(
      (id) => validIds.has(id),
    )
    if (sharers.length === 0) continue

    if (validIds.has(e.paidBy)) {
      paid.set(e.paidBy, (paid.get(e.paidBy) ?? 0) + e.amount)
    }

    const share = e.amount / sharers.length
    for (const id of sharers) owed.set(id, (owed.get(id) ?? 0) + share)
  }

  return travelers.map((t, i) => {
    const p = paid.get(t.id) ?? 0
    const o = owed.get(t.id) ?? 0
    return {
      travelerId: t.id,
      name: t.name || `همسفر ${faNum(i + 1)}`,
      paid: p,
      owed: o,
      net: p - o,
    }
  })
}

/**
 * کمترین تعداد انتقال برای بی‌حساب شدن.
 *
 * الگوریتم حریصانه: در هر گام بزرگ‌ترین بدهکار به بزرگ‌ترین طلبکار پول می‌دهد.
 * برای اندازهٔ یک گروه سفر (چند نفر) این روش عملاً به کمینهٔ واقعی می‌رسد.
 */
export function settle(balances: Balance[]): Transfer[] {
  const creditors = balances
    .filter((b) => b.net > TOLERANCE)
    .map((b) => ({ ...b, remaining: b.net }))
    .sort((a, b) => b.remaining - a.remaining)

  const debtors = balances
    .filter((b) => b.net < -TOLERANCE)
    .map((b) => ({ ...b, remaining: -b.net }))
    .sort((a, b) => b.remaining - a.remaining)

  const transfers: Transfer[] = []
  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]
    const debtor = debtors[di]
    const amount = Math.min(creditor.remaining, debtor.remaining)

    if (amount > TOLERANCE) {
      transfers.push({
        fromId: debtor.travelerId,
        fromName: debtor.name,
        toId: creditor.travelerId,
        toName: creditor.name,
        amount,
      })
    }

    creditor.remaining -= amount
    debtor.remaining -= amount

    if (creditor.remaining <= TOLERANCE) ci += 1
    if (debtor.remaining <= TOLERANCE) di += 1
  }

  return transfers
}

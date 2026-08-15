import type { Expense } from './journal'

export interface Transfer {
  from: string
  to: string
  amount: number
}

export interface Balance {
  travelerId: string
  paid: number
  owes: number
  net: number
}

/**
 * تسویه‌حساب گروهی با کمترین تعداد جابه‌جایی پول.
 *
 * <p>روش ساده — «هرکس به هرکس» — برای پنج نفر تا بیست انتقال می‌سازد و در عمل
 * کسی انجامش نمی‌دهد. این‌جا بدهکارترین با طلبکارترین جفت می‌شود و هر بار
 * دست‌کم یک نفر تسویه می‌شود، پس تعداد انتقال‌ها از تعداد افراد کمتر می‌ماند.</p>
 *
 * <p>مانده‌های ریز (زیر هزار تومان) نادیده گرفته می‌شوند: انتقال ۳۰۰ تومانی
 * بین دو دوست، آزاردهنده است نه دقیق.</p>
 */
const DustThreshold = 1000

export function balances(expenses: Expense[], travelerIds: string[]): Balance[] {
  const paid = new Map<string, number>()
  const owes = new Map<string, number>()

  for (const id of travelerIds) {
    paid.set(id, 0)
    owes.set(id, 0)
  }

  for (const expense of expenses) {
    if (expense.amount <= 0) continue

    paid.set(expense.paidBy, (paid.get(expense.paidBy) ?? 0) + expense.amount)

    // خالی یعنی همه — رایج‌ترین حالت، و نوشتن نام همه هر بار آزاردهنده است.
    const sharers = expense.sharedBy.length > 0 ? expense.sharedBy : travelerIds
    const share = expense.amount / sharers.length

    for (const id of sharers) {
      owes.set(id, (owes.get(id) ?? 0) + share)
    }
  }

  return travelerIds.map((id) => {
    const p = paid.get(id) ?? 0
    const o = owes.get(id) ?? 0

    return { travelerId: id, paid: p, owes: o, net: p - o }
  })
}

export function settle(expenses: Expense[], travelerIds: string[]): Transfer[] {
  const net = balances(expenses, travelerIds)
    .map((b) => ({ id: b.travelerId, amount: b.net }))
    .filter((b) => Math.abs(b.amount) >= DustThreshold)

  const creditors = net.filter((b) => b.amount > 0).sort((a, b) => b.amount - a.amount)
  const debtors = net.filter((b) => b.amount < 0).sort((a, b) => a.amount - b.amount)

  const transfers: Transfer[] = []
  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]
    const debtor = debtors[di]

    if (creditor === undefined || debtor === undefined) break

    const amount = Math.min(creditor.amount, -debtor.amount)

    if (amount >= DustThreshold) {
      transfers.push({ from: debtor.id, to: creditor.id, amount: Math.round(amount) })
    }

    creditor.amount -= amount
    debtor.amount += amount

    if (creditor.amount < DustThreshold) ci += 1
    if (-debtor.amount < DustThreshold) di += 1
  }

  return transfers
}

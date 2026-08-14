import type { Expense, CheckIn, TripJournal } from '../domain/types'

/**
 * ذخیرهٔ دفترچهٔ حین سفر — یک کلید در `localStorage` به ازای هر سفر.
 * حجمش کوچک است (متن و عدد)؛ عکس‌ها جدا در IndexedDB می‌روند.
 */

const PREFIX = 'leadertrip.journal.'

export function emptyJournal(tripId: string): TripJournal {
  return { tripId, checkIns: {}, expenses: [], updatedAt: new Date().toISOString() }
}

export function loadJournal(tripId: string): TripJournal {
  try {
    const raw = localStorage.getItem(PREFIX + tripId)
    if (!raw) return emptyJournal(tripId)
    const parsed = JSON.parse(raw) as TripJournal
    return {
      ...emptyJournal(tripId),
      ...parsed,
      checkIns: parsed.checkIns ?? {},
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
    }
  } catch {
    return emptyJournal(tripId)
  }
}

export function saveJournal(journal: TripJournal): void {
  try {
    localStorage.setItem(
      PREFIX + journal.tripId,
      JSON.stringify({ ...journal, updatedAt: new Date().toISOString() }),
    )
  } catch {
    /* فضای ذخیره‌سازی پر است — ثبت بعدی دوباره تلاش می‌کند */
  }
}

export function setCheckIn(journal: TripJournal, key: string, value: CheckIn | null): TripJournal {
  const checkIns = { ...journal.checkIns }
  if (value === null) delete checkIns[key]
  else checkIns[key] = value
  return { ...journal, checkIns }
}

export function addExpense(journal: TripJournal, expense: Expense): TripJournal {
  return { ...journal, expenses: [...journal.expenses, expense] }
}

export function removeExpense(journal: TripJournal, id: string): TripJournal {
  return { ...journal, expenses: journal.expenses.filter((e) => e.id !== id) }
}

/** کلید چک‌این برای هر نوع توقف */
export function checkInKey(kind: 'visit' | 'lodging', ref: string | number): string {
  return kind === 'visit' ? `visit:${ref}` : `lodging:${ref}`
}

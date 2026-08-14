import type { TripInput } from '../domain/types'

const KEY = 'leadertrip.trips.v1'
const ACTIVE_KEY = 'leadertrip.active.v1'

export interface SavedTrip {
  id: string
  title: string
  input: TripInput
  savedAt: string
}

function read(): SavedTrip[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    // داده‌ای که خوانده نمی‌شود بهتر است نادیده گرفته شود تا اپ از کار بیفتد
    return []
  }
}

function write(trips: SavedTrip[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(trips))
  } catch {
    // فضای ذخیره‌سازی پر است یا حالت ناشناس — سکوت می‌کنیم
  }
}

export function listTrips(): SavedTrip[] {
  return read().sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

export function saveTrip(trip: SavedTrip): void {
  const trips = read().filter((t) => t.id !== trip.id)
  trips.push(trip)
  write(trips)
}

export function deleteTrip(id: string): void {
  write(read().filter((t) => t.id !== id))
}

export function getTrip(id: string): SavedTrip | null {
  return read().find((t) => t.id === id) ?? null
}

/** ورودیِ در حال ویرایش — تا با رفرش صفحه از دست نرود */
export function saveDraft(input: TripInput): void {
  try {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(input))
  } catch {
    /* بی‌اهمیت */
  }
}

export function loadDraft(): TripInput | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY)
    return raw ? (JSON.parse(raw) as TripInput) : null
  } catch {
    return null
  }
}

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

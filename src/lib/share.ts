import type { TripInput } from '../domain/types'
import { defaultInput } from '../engine/planner'

/**
 * اشتراک‌گذاری سفر بدون هیچ سروری: کل ورودی در خود آدرس صفحه جا می‌شود.
 *
 * برای کوتاه ماندن لینک، فقط فیلدهایی نوشته می‌شوند که با مقدار پیش‌فرض فرق
 * دارند، و کلیدها به شکل کوتاه ذخیره می‌شوند. باز کردن لینک یعنی ادغام همان
 * تفاوت‌ها روی پیش‌فرض‌ها — پس اگر بعداً فیلدی به مدل اضافه شود، لینک‌های قدیمی
 * همچنان باز می‌شوند.
 */

const KEY_MAP: Record<keyof TripInput, string> = {
  originCityId: 'o',
  destinationCityId: 'de',
  startDate: 'sd',
  days: 'd',
  radiusKm: 'r',
  travelers: 'tr',
  vehicleId: 'v',
  vehicleCount: 'vc',
  budgetTotal: 'b',
  style: 'st',
  lodging: 'lg',
  interests: 'i',
  maxDrivingHoursPerDay: 'mh',
  dayStartHour: 'ds',
  dayEndHour: 'dh',
  roundTrip: 'rt',
  pinnedPoiIds: 'pn',
  blockedPoiIds: 'bl',
  dayAssignment: 'da',
  customStops: 'cs',
  subsidizedFuelShare: 'sf',
  priceOverrides: 'po',
  title: 'ti',
}

const REVERSE_MAP = Object.fromEntries(
  Object.entries(KEY_MAP).map(([full, short]) => [short, full]),
) as Record<string, keyof TripInput>

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** فقط تفاوت‌ها با پیش‌فرض، با کلیدهای کوتاه */
export function encodeTrip(input: TripInput): string {
  const base = defaultInput()
  const diff: Record<string, unknown> = {}

  for (const key of Object.keys(KEY_MAP) as (keyof TripInput)[]) {
    const value = input[key]
    if (value === undefined) continue
    // تاریخ شروع همیشه نوشته می‌شود؛ پیش‌فرضش «یک هفتهٔ دیگر» است و
    // برای گیرندهٔ لینک معنای دیگری دارد
    if (key !== 'startDate' && sameValue(value, base[key])) continue
    diff[KEY_MAP[key]] = value
  }

  return toBase64Url(JSON.stringify(diff))
}

export function decodeTrip(encoded: string): TripInput | null {
  try {
    const parsed = JSON.parse(fromBase64Url(encoded)) as Record<string, unknown>
    const out: Record<string, unknown> = { ...defaultInput() }

    for (const [short, value] of Object.entries(parsed)) {
      const key = REVERSE_MAP[short]
      if (key) out[key] = value
    }
    const trip = out as unknown as TripInput

    // یک بررسی حداقلی — لینک دستکاری‌شده نباید اپ را از پا دربیاورد
    if (!trip.originCityId || !Array.isArray(trip.travelers) || trip.travelers.length === 0) {
      return null
    }
    return trip
  } catch {
    return null
  }
}

/** base64url روی رشتهٔ یونیکد — فارسی هم باید سالم رد و بدل شود */
function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

// ─────────────────────── آدرس صفحه ───────────────────────

export function shareUrl(input: TripInput): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#t=${encodeTrip(input)}`
}

/** اگر آدرس صفحه حاوی سفر بود، بخوانش (و از نوار آدرس پاکش کن) */
export function readTripFromUrl(): TripInput | null {
  const hash = window.location.hash
  if (!hash.startsWith('#t=')) return null

  const trip = decodeTrip(hash.slice(3))
  if (trip) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }
  return trip
}

// ─────────────────────── خروجی و ورودی فایل ───────────────────────

export function downloadJson(input: TripInput, filename: string): void {
  const blob = new Blob([JSON.stringify(input, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function readJsonFile(file: File): Promise<TripInput | null> {
  try {
    const parsed = JSON.parse(await file.text()) as Partial<TripInput>
    const merged = { ...defaultInput(), ...parsed }
    if (!merged.originCityId || !Array.isArray(merged.travelers) || merged.travelers.length === 0) {
      return null
    }
    return merged
  } catch {
    return null
  }
}

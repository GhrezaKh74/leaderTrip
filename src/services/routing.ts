import type { LatLng } from '../engine/geo'

/**
 * مسافت و زمان واقعی جاده‌ای از OSRM.
 *
 * تا این‌جا مسافت‌ها با «ضریب پیچش جاده» تخمین زده می‌شدند — روشی که در سند
 * از روز اول با خطای ±۱۵٪ برچسب خورده بود. این سرویس همان محدودیت را برمی‌دارد.
 *
 * قاعده مثل آب‌وهوا: **اگر نشد، اپ باید بدون آن کامل کار کند.** نبود شبکه یعنی
 * برگشت به همان تخمین، نه خطا — و رابط کاربری صادقانه می‌گوید کدام است.
 */

const OSRM_URL = 'https://router.project-osrm.org/table/v1/driving'
const CACHE_KEY = 'leadertrip.routes.v1'
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // جادهٔ جدید هر روز ساخته نمی‌شود
const REQUEST_TIMEOUT_MS = 12_000
/** سقف مختصات در یک درخواست — سرور عمومی OSRM حدود ۱۰۰ تا می‌پذیرد */
const MAX_POINTS = 60
const MAX_CACHE_BYTES = 900_000

export interface RouteLeg {
  km: number
  minutes: number
}

export interface RouteMatrix {
  legs: Record<string, RouteLeg>
  source: 'osrm'
}

/** کلید یک جفت نقطه — گرد شده تا جابه‌جایی ناچیز، کش را بی‌اثر نکند */
export function matrixKey(a: LatLng, b: LatLng): string {
  return `${a.lat.toFixed(4)},${a.lng.toFixed(4)}|${b.lat.toFixed(4)},${b.lng.toFixed(4)}`
}

export function lookupLeg(matrix: RouteMatrix | undefined, a: LatLng, b: LatLng): RouteLeg | null {
  if (!matrix) return null
  return matrix.legs[matrixKey(a, b)] ?? null
}

// ─────────────────────────── کش ───────────────────────────

interface CacheEntry {
  legs: Record<string, RouteLeg>
  fetchedAt: number
}

const memoryCache: Record<string, RouteLeg> = {}

function readCache(): Record<string, RouteLeg> {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as CacheEntry
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return {}
    return parsed.legs ?? {}
  } catch {
    return {}
  }
}

function writeCache(legs: Record<string, RouteLeg>): void {
  try {
    const payload = JSON.stringify({ legs, fetchedAt: Date.now() } satisfies CacheEntry)
    if (payload.length > MAX_CACHE_BYTES) return
    localStorage.setItem(CACHE_KEY, payload)
  } catch {
    /* فضای ذخیره‌سازی پر است — دفعهٔ بعد دوباره از شبکه می‌گیریم */
  }
}

// ─────────────────────────── دریافت ───────────────────────────

interface OsrmTable {
  code?: string
  distances?: (number | null)[][]
  durations?: (number | null)[][]
}

/**
 * ماتریس مسافت و زمان بین نقاط داده‌شده.
 * برمی‌گرداند `undefined` اگر شبکه نبود یا پاسخ خراب بود — یعنی «تخمین را نگه دار».
 */
export async function fetchRouteMatrix(points: LatLng[]): Promise<RouteMatrix | undefined> {
  const unique = dedupe(points).slice(0, MAX_POINTS)
  if (unique.length < 2) return undefined

  const cached = { ...readCache(), ...memoryCache }
  const missing = unique.some((a) =>
    unique.some((b) => a !== b && cached[matrixKey(a, b)] === undefined),
  )

  if (!missing) return { legs: cached, source: 'osrm' }

  const coords = unique.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(';')
  const url = `${OSRM_URL}/${coords}?annotations=distance,duration`

  let json: OsrmTable | null = null
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return undefined
    json = (await res.json()) as OsrmTable
  } catch {
    // شبکه نیست یا تایم‌اوت شد — تخمین سر جایش می‌ماند
    return undefined
  }

  if (json?.code !== 'Ok' || !json.distances || !json.durations) return undefined

  const legs: Record<string, RouteLeg> = { ...cached }
  for (let i = 0; i < unique.length; i += 1) {
    for (let j = 0; j < unique.length; j += 1) {
      if (i === j) continue
      const meters = json.distances[i]?.[j]
      const seconds = json.durations[i]?.[j]
      if (meters == null || seconds == null) continue
      legs[matrixKey(unique[i], unique[j])] = { km: meters / 1000, minutes: seconds / 60 }
    }
  }

  Object.assign(memoryCache, legs)
  writeCache(legs)
  return { legs, source: 'osrm' }
}

function dedupe(points: LatLng[]): LatLng[] {
  const seen = new Set<string>()
  const out: LatLng[] = []
  for (const p of points) {
    const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }
  return out
}

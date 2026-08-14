import type { LatLng } from '../engine/geo'

/**
 * ارتفاع نقاط از سطح دریا (Open-Meteo، رایگان و بدون کلید).
 *
 * چرا مهم است: در ایران خیلی از مسیرهای زیبا از گردنه‌های بالای ۲۰۰۰ متر
 * می‌گذرند. همان مسیری که در مهر دل‌انگیز است، در دی می‌تواند بسته باشد.
 * ارتفاع تنها چیزی است که این ریسک را از پیش قابل دیدن می‌کند.
 */

const URL_BASE = 'https://api.open-meteo.com/v1/elevation'
const CACHE_KEY = 'leadertrip.elevation.v1'
const MAX_POINTS = 100
const REQUEST_TIMEOUT_MS = 8000

/** کلید: `lat,lng` گرد شده به سه رقم اعشار */
export type ElevationMap = Record<string, number>

export function elevationKey(p: LatLng): string {
  return `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`
}

export function lookupElevation(map: ElevationMap | undefined, p: LatLng): number | null {
  if (!map) return null
  return map[elevationKey(p)] ?? null
}

function readCache(): ElevationMap {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as ElevationMap) : {}
  } catch {
    return {}
  }
}

function writeCache(map: ElevationMap): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(map))
  } catch {
    /* بی‌اهمیت */
  }
}

/**
 * ارتفاع نقاط را می‌گیرد. ارتفاع زمین عوض نمی‌شود، پس کش تاریخ انقضا ندارد.
 * نبود شبکه یعنی `undefined` — هشدار گردنه ساخته نمی‌شود و بقیهٔ اپ سر جایش است.
 */
export async function fetchElevation(points: LatLng[]): Promise<ElevationMap | undefined> {
  const cache = readCache()
  const missing = points.filter((p) => cache[elevationKey(p)] === undefined).slice(0, MAX_POINTS)

  if (missing.length === 0) return cache

  const lat = missing.map((p) => p.lat.toFixed(4)).join(',')
  const lng = missing.map((p) => p.lng.toFixed(4)).join(',')

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    const res = await fetch(`${URL_BASE}?latitude=${lat}&longitude=${lng}`, {
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return Object.keys(cache).length > 0 ? cache : undefined

    const json = (await res.json()) as { elevation?: (number | null)[] }
    if (!Array.isArray(json.elevation)) return Object.keys(cache).length > 0 ? cache : undefined

    const next = { ...cache }
    missing.forEach((p, i) => {
      const value = json.elevation![i]
      if (typeof value === 'number') next[elevationKey(p)] = value
    })

    writeCache(next)
    return next
  } catch {
    return Object.keys(cache).length > 0 ? cache : undefined
  }
}

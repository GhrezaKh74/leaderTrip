import type { POICategory } from '../domain/types'
import type { LatLng } from '../engine/geo'

/**
 * کشف جاذبه از OpenStreetMap.
 *
 * چرا این‌ها وارد پایگاه دادهٔ اصلی نمی‌شوند: امتیازدهی ما به فیلدهایی تکیه
 * دارد که OSM ندارد — مدت بازدید، سختی مسیر، بلیت، تناسب سنی، نیاز به
 * شاسی‌بلند. ریختن دادهٔ خام در دیتاست، همان چیزی را خراب می‌کند که ارزش
 * محصول است.
 *
 * پس نقشش این است: پرکردن حفره‌های پوشش. هرچه پیدا شد با برچسب «دادهٔ خام»
 * نشان داده می‌شود و کاربر می‌تواند آن را به‌عنوان «توقف دلخواه» اضافه کند —
 * جایی که خودش مدت و هزینه را تعیین می‌کند.
 */

const ENDPOINT = 'https://overpass-api.de/api/interpreter'
const REQUEST_TIMEOUT_MS = 25_000
const MAX_RESULTS = 30

export interface OsmPlace {
  osmId: string
  name: string
  lat: number
  lng: number
  /** حدس دستهٔ ما از روی تگ‌های OSM */
  cat: POICategory
  /** تگ خام، برای اینکه کاربر بداند با چه چیزی طرف است */
  rawTag: string
}

/** نگاشت تگ‌های OSM به دسته‌های ما — حدسی، و در UI هم همین‌طور برچسب می‌خورد */
function guessCategory(tags: Record<string, string>): { cat: POICategory; rawTag: string } {
  const t = tags.tourism || tags.historic || tags.natural || tags.leisure || tags.amenity || ''

  if (tags.historic) return { cat: 'historical', rawTag: `historic=${tags.historic}` }
  if (tags.tourism === 'museum') return { cat: 'museum', rawTag: 'tourism=museum' }
  if (tags.tourism === 'viewpoint') return { cat: 'nature', rawTag: 'tourism=viewpoint' }
  if (tags.natural === 'waterfall') return { cat: 'waterfall', rawTag: 'natural=waterfall' }
  if (tags.natural === 'cave_entrance') return { cat: 'cave', rawTag: 'natural=cave_entrance' }
  if (tags.natural === 'beach') return { cat: 'beach', rawTag: 'natural=beach' }
  if (tags.natural === 'peak') return { cat: 'mountain', rawTag: 'natural=peak' }
  if (tags.natural) return { cat: 'nature', rawTag: `natural=${tags.natural}` }
  if (tags.leisure === 'park' || tags.leisure === 'garden') {
    return { cat: 'garden', rawTag: `leisure=${tags.leisure}` }
  }
  if (tags.amenity === 'place_of_worship') {
    return { cat: 'religious', rawTag: 'amenity=place_of_worship' }
  }
  return { cat: 'entertainment', rawTag: t ? `tourism=${t}` : 'unknown' }
}

interface OverpassElement {
  id: number
  type: string
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

/**
 * جاذبه‌های نام‌دار در شعاع مشخص. اگر شبکه نبود یا سرویس شلوغ بود،
 * آرایهٔ خالی برمی‌گردد — نه خطا.
 */
export async function discoverNearby(center: LatLng, radiusKm: number): Promise<OsmPlace[]> {
  const r = Math.round(Math.min(radiusKm, 40) * 1000)
  const around = `(around:${r},${center.lat.toFixed(4)},${center.lng.toFixed(4)})`

  const query = `[out:json][timeout:20];
(
  node["tourism"~"^(attraction|museum|viewpoint|artwork)$"]["name"]${around};
  node["historic"]["name"]${around};
  node["natural"~"^(waterfall|cave_entrance|peak|beach|spring)$"]["name"]${around};
  way["tourism"~"^(attraction|museum)$"]["name"]${around};
);
out center ${MAX_RESULTS};`

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return []

    const json = (await res.json()) as { elements?: OverpassElement[] }
    return parsePlaces(json.elements ?? [])
  } catch {
    return []
  }
}

export function parsePlaces(elements: OverpassElement[]): OsmPlace[] {
  const out: OsmPlace[] = []
  const seen = new Set<string>()

  for (const el of elements) {
    const name = el.tags?.name
    const lat = el.lat ?? el.center?.lat
    const lng = el.lon ?? el.center?.lon
    if (!name || lat === undefined || lng === undefined) continue
    if (seen.has(name)) continue
    seen.add(name)

    const { cat, rawTag } = guessCategory(el.tags ?? {})
    out.push({ osmId: `${el.type}/${el.id}`, name, lat, lng, cat, rawTag })
  }
  return out.slice(0, MAX_RESULTS)
}

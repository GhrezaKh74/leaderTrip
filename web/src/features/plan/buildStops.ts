import type { Poi } from '../../api/schemas'
import type { MapStop } from './RouteMap'

interface NamedPoint {
  id: string
  name: string
  lat: number
  lng: number
}

/**
 * توقف‌های نقشه از روی بلوک‌های برنامه و فهرست جاذبه‌ها.
 *
 * <p><code>extras</code> توقف‌های دلخواه کاربرند — در دیتاست نیستند و
 * مختصاتشان از خود ورودی سفر می‌آید؛ بدون این، توقفی که کاربر خودش پین کرده
 * از نقشهٔ سفرش غایب می‌ماند.</p>
 */
export function buildStops(
  poiIdsInOrder: string[],
  pois: Poi[] | undefined,
  extras: NamedPoint[] = [],
): MapStop[] {
  if (pois === undefined && extras.length === 0) return []

  const byId = new Map<string, NamedPoint>((pois ?? []).map((poi) => [poi.id, poi]))

  for (const extra of extras) {
    byId.set(extra.id, extra)
  }

  return poiIdsInOrder
    .map((id) => byId.get(id))
    .filter((point): point is NamedPoint => point !== undefined)
    .map((point, index) => ({
      id: point.id,
      name: point.name,
      lat: point.lat,
      lng: point.lng,
      order: index + 1,
    }))
}

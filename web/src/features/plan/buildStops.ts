import type { Poi } from '../../api/schemas'
import type { MapStop } from './RouteMap'

/** توقف‌های نقشه از روی بلوک‌های برنامه و فهرست جاذبه‌ها. */
export function buildStops(
  poiIdsInOrder: string[],
  pois: Poi[] | undefined,
): MapStop[] {
  if (pois === undefined) return []

  const byId = new Map(pois.map((poi) => [poi.id, poi]))

  return poiIdsInOrder
    .map((id) => byId.get(id))
    .filter((poi): poi is Poi => poi !== undefined)
    .map((poi, index) => ({
      id: poi.id,
      name: poi.name,
      lat: poi.lat,
      lng: poi.lng,
      order: index + 1,
    }))
}

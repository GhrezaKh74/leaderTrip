import type { City, Terrain, Vehicle } from '../domain/types'
import { BASE_SPEED_KMH, DETOUR_FACTOR, TERRAIN_SPEED } from '../data/pricing'
import { lookupLeg, type RouteMatrix } from '../services/routing'

export interface LatLng {
  lat: number
  lng: number
}

const R_EARTH = 6371 // کیلومتر

const toRad = (deg: number) => (deg * Math.PI) / 180

/** فاصلهٔ هوایی بین دو نقطه، کیلومتر */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * نوع زمین بین دو نقطه را از روی اقلیم شهرها حدس می‌زند.
 * گذر از خزر به فلات مرکزی یعنی عبور از البرز ⇒ کوهستان.
 */
export function terrainBetween(a: City, b: City, straightKm: number): Terrain {
  const mountainous = a.climate === 'mountain' || b.climate === 'mountain'
  const crossesAlborz =
    (a.climate === 'caspian') !== (b.climate === 'caspian') && straightKm > 40

  if (mountainous || crossesAlborz) return 'mountain'
  if (straightKm > 200) return 'freeway'
  return 'plain'
}

/** فاصلهٔ جاده‌ای تخمینی = فاصلهٔ هوایی × ضریب پیچش */
export function roadKm(straightKm: number, terrain: Terrain): number {
  return straightKm * DETOUR_FACTOR[terrain]
}

/** زمان رانندگی به دقیقه */
export function drivingMinutes(
  distanceRoadKm: number,
  terrain: Terrain,
  vehicle: Vehicle,
  groupSlowdown = 1,
): number {
  const speed = BASE_SPEED_KMH * vehicle.speedFactor * TERRAIN_SPEED[terrain] * groupSlowdown
  return (distanceRoadKm / speed) * 60
}

export interface Leg {
  straightKm: number
  roadKm: number
  minutes: number
  terrain: Terrain
  /** osrm = مسیر واقعی جاده · estimate = فاصلهٔ هوایی × ضریب پیچش */
  source: 'osrm' | 'estimate'
}

/**
 * یک مرحلهٔ حرکت بین دو نقطه.
 *
 * اگر ماتریس مسیر واقعی در دسترس باشد، مسافت و زمانِ خودِ جاده استفاده می‌شود.
 * زمان OSRM برای یک خودروی معمولی در جادهٔ خلوت است، پس ضریب خودرو و ضریب
 * گروه همچنان روی آن اعمال می‌شوند — اتوبوس و گروهِ با کودک واقعاً کندترند.
 */
export function computeLeg(
  from: LatLng,
  to: LatLng,
  terrain: Terrain,
  vehicle: Vehicle,
  groupSlowdown = 1,
  matrix?: RouteMatrix,
): Leg {
  const straight = haversineKm(from, to)
  const real = lookupLeg(matrix, from, to)

  if (real) {
    return {
      straightKm: straight,
      roadKm: real.km,
      minutes: real.minutes / Math.max(0.3, vehicle.speedFactor * groupSlowdown),
      terrain,
      source: 'osrm',
    }
  }

  const road = roadKm(straight, terrain)
  return {
    straightKm: straight,
    roadKm: road,
    minutes: drivingMinutes(road, terrain, vehicle, groupSlowdown),
    terrain,
    source: 'estimate',
  }
}

/** مرکز ثقل مجموعه‌ای از نقاط */
export function centroid(points: LatLng[]): LatLng {
  if (points.length === 0) throw new Error('مجموعهٔ نقاط خالی است')
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), {
    lat: 0,
    lng: 0,
  })
  return { lat: sum.lat / points.length, lng: sum.lng / points.length }
}

/** مرکز ثقل وزن‌دار — نقاط با وزن بیشتر مرکز را به سمت خود می‌کشند */
export function weightedCentroid(points: (LatLng & { weight: number })[]): LatLng {
  const totalW = points.reduce((s, p) => s + p.weight, 0)
  if (totalW <= 0) return centroid(points)
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat * p.weight, lng: acc.lng + p.lng * p.weight }),
    { lat: 0, lng: 0 },
  )
  return { lat: sum.lat / totalW, lng: sum.lng / totalW }
}

/** نزدیک‌ترین عضو مجموعه به یک نقطه */
export function nearest<T extends LatLng>(from: LatLng, candidates: T[]): T | null {
  let best: T | null = null
  let bestD = Infinity
  for (const c of candidates) {
    const d = haversineKm(from, c)
    if (d < bestD) {
      bestD = d
      best = c
    }
  }
  return best
}

/**
 * فاصلهٔ یک نقطه تا پاره‌خط مبدأ↔مقصد (کیلومتر).
 * برای سنجش «چقدر از مسیر اصلی منحرف می‌شویم» استفاده می‌شود.
 */
export function distanceToCorridor(point: LatLng, from: LatLng, to: LatLng): number {
  const ax = from.lng
  const ay = from.lat
  const bx = to.lng
  const by = to.lat
  const px = point.lng
  const py = point.lat

  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy

  if (lenSq === 0) return haversineKm(point, from)

  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))

  return haversineKm(point, { lat: ay + t * dy, lng: ax + t * dx })
}

/** جعبهٔ محیطی مجموعه‌ای از نقاط، برای تنظیم زوم نقشه */
export function bounds(points: LatLng[]): [[number, number], [number, number]] | null {
  if (points.length === 0) return null
  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity
  for (const p of points) {
    minLat = Math.min(minLat, p.lat)
    maxLat = Math.max(maxLat, p.lat)
    minLng = Math.min(minLng, p.lng)
    maxLng = Math.max(maxLng, p.lng)
  }
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ]
}

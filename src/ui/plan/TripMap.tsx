import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import type { TripPlan } from '../../domain/types'
import { getCity } from '../../data/cities'
import { POI_BY_ID } from '../../data/pois'
import { faNum } from '../../lib/format'

interface Point {
  lat: number
  lng: number
  label: string
  kind: 'origin' | 'poi' | 'stay'
  order: number
}

const COLORS = { origin: '#0b1119', poi: '#047655', stay: '#5a6d88' }

function collectPoints(plan: TripPlan, dayFilter: number | null): Point[] {
  const points: Point[] = []
  const origin = getCity(plan.input.originCityId)
  points.push({ ...origin, label: `مبدأ: ${origin.name}`, kind: 'origin', order: 0 })

  let n = 0
  for (const day of plan.days) {
    if (dayFilter !== null && day.index !== dayFilter) continue

    for (const b of day.blocks) {
      if (b.kind === 'visit' && b.poiId) {
        const poi = POI_BY_ID.get(b.poiId)
        if (poi) {
          n += 1
          points.push({ lat: poi.lat, lng: poi.lng, label: poi.name, kind: 'poi', order: n })
        }
      }
    }

    const stay = getCity(day.baseCityId)
    const alreadyThere = points.some(
      (p) => Math.abs(p.lat - stay.lat) < 0.01 && Math.abs(p.lng - stay.lng) < 0.01,
    )
    if (!alreadyThere) {
      points.push({ ...stay, label: `شب ${faNum(day.index)}: ${stay.name}`, kind: 'stay', order: -1 })
    }
  }
  return points
}

export function TripMap({ plan, dayFilter }: { plan: TripPlan; dayFilter: number | null }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const [tilesFailed, setTilesFailed] = useState(false)

  // ساخت یک‌بارهٔ نقشه
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    }).setView([32.5, 53.5], 5)

    // نشانگرها و مسیر مستقل از کاشی‌ها کشیده می‌شوند، پس نبودِ اینترنت
    // نقشه را بی‌فایده نمی‌کند — فقط پس‌زمینه‌اش خالی می‌ماند
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap',
    })
      .on('tileerror', () => setTilesFailed(true))
      .addTo(map)

    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  // به‌روزرسانی نشانگرها با تغییر برنامه یا روز فعال
  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    layer.clearLayers()
    const points = collectPoints(plan, dayFilter)
    if (points.length === 0) return

    const route: [number, number][] = points
      .filter((p) => p.kind !== 'stay' || points.length <= 2)
      .map((p) => [p.lat, p.lng])

    if (route.length > 1) {
      L.polyline(route, {
        color: COLORS.poi,
        weight: 2,
        opacity: 0.7,
        dashArray: '6 5',
      }).addTo(layer)
    }

    for (const p of points) {
      const badge = p.kind === 'poi' ? faNum(p.order) : p.kind === 'origin' ? '🏠' : '🛏'
      const icon = L.divIcon({
        className: '',
        html: `<div class="lt-pin" style="background:${COLORS[p.kind]}">${badge}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })
      L.marker([p.lat, p.lng], { icon, title: p.label }).addTo(layer).bindPopup(p.label)
    }

    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]))
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 11 })
  }, [plan, dayFilter])

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="h-[320px] w-full sm:h-[420px]"
        role="application"
        aria-label="نقشهٔ مسیر سفر"
      />
      {tilesFailed && (
        <p className="rounded-lg bg-amber-50 p-2.5 text-[11px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          تصویر نقشه بارگذاری نشد (احتمالاً اینترنت در دسترس نیست). ترتیب و موقعیت نسبی توقف‌ها
          همچنان درست نمایش داده می‌شود.
        </p>
      )}
    </div>
  )
}

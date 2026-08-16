import { useEffect, useRef } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import { useTheme } from '@mui/material/styles'
import * as maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import { layers, namedFlavor } from '@protomaps/basemaps'
// نسخهٔ باندل‌شدهٔ افزونهٔ RTL — import عمیق از بستهٔ اصلی پشت «exports»
// بسته است، پس فایل dist آن به‌صورت دارایی ثابت کنار کد ما نگه داشته می‌شود.
// پسوند ‎.mjs عمدی است: ورکر MapLibre فایل‌های ‎.js را با eval اجرا می‌کند که
// CSP ما آن را می‌بندد؛ ‎.mjs از مسیر import ماژول می‌رود که مجاز است.
import rtlPluginUrl from '../../assets/mapbox-gl-rtl-text.mjs?url'
// MapLibre وب‌ورکرش را نسبت به import.meta.url خودش پیدا می‌کند؛ بعد از
// باندل‌شدن آن آدرس وجود ندارد. ?worker&url به Vite می‌گوید ورکر را جدا
// باندل کند و آدرس نهایی را بدهد.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'

import { faNum } from '../../lib/format'
import type { MapStop } from './RouteMap'

/**
 * نقشهٔ برداری خودمیزبان — کاشی‌های ایران روی سرور خودمان.
 *
 * <p>وقتی <code>/tiles/iran.pmtiles</code> روی سرور باشد این نقشه بالا می‌آید:
 * برداری، با برچسب فارسی، بدون حتی یک درخواست به بیرون — همان اصل «هیچ
 * ویژگی‌ای به سرویس بیرونی گروگان نیست»، این‌بار برای خودِ نقشه. ساختش هم
 * یک فرمان است: <code>docker compose --profile tiles up</code> (سند
 * <code>maps/README.md</code>).</p>
 *
 * <p>این فایل تنبل بار می‌شود (dynamic import): MapLibre سنگین است و فقط
 * وقتی لازم است که کاشی خودی موجود باشد و تب نقشه باز.</p>
 */

let protocolRegistered = false
let rtlLoaded = false

function ensureGlobalSetupOnce() {
  if (!protocolRegistered) {
    maplibregl.setWorkerUrl(maplibreWorkerUrl)
    maplibregl.addProtocol('pmtiles', new Protocol().tile)
    protocolRegistered = true
  }

  if (!rtlLoaded) {
    // بدون این افزونه، حروف فارسی روی نقشه جدا و چپ‌به‌راست رندر می‌شوند.
    // از باندل خودمان بار می‌شود، نه CDN.
    void maplibregl.setRTLTextPlugin(rtlPluginUrl, true)
    rtlLoaded = true
  }
}

export default function VectorMap({
  stops,
  roadPoints,
}: {
  stops: MapStop[]
  roadPoints: { lat: number; lng: number }[] | null
}) {
  const container = useRef<HTMLDivElement | null>(null)
  const theme = useTheme()
  const dark = theme.palette.mode === 'dark'

  useEffect(() => {
    if (container.current === null || stops.length === 0) return

    ensureGlobalSetupOnce()

    const flavorName = dark ? 'dark' : 'light'

    const map = new maplibregl.Map({
      container: container.current,
      style: {
        version: 8,
        glyphs: '/tiles/assets/fonts/{fontstack}/{range}.pbf',
        sprite: `${window.location.origin}/tiles/assets/sprites/v4/${flavorName}`,
        sources: {
          protomaps: {
            type: 'vector',
            url: 'pmtiles:///tiles/iran.pmtiles',
            attribution: '© OpenStreetMap',
          },
        },
        // برچسب‌ها فارسی؛ جایی که name:fa در OSM نباشد، نام محلی می‌آید.
        layers: layers('protomaps', namedFlavor(flavorName), { lang: 'fa' }),
      },
      attributionControl: { compact: true },
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }))

    const linePoints = (roadPoints ?? stops).map(
      (point) => [point.lng, point.lat] as [number, number],
    )

    map.on('load', () => {
      map.addSource('trip-route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: linePoints } },
      })

      // خط حدسی نباید شبیه جاده باشد — همان قاعدهٔ نقشهٔ آنلاین.
      map.addLayer({
        id: 'trip-route',
        type: 'line',
        source: 'trip-route',
        paint: {
          'line-color': theme.palette.primary.main,
          'line-width': 4,
          'line-opacity': 0.85,
          ...(roadPoints === null ? { 'line-dasharray': [2, 2] } : {}),
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      })
    })

    for (const stop of stops) {
      const element = document.createElement('div')

      element.style.cssText =
        `background:${theme.palette.primary.dark};color:#fff;width:26px;height:26px;border-radius:50%;` +
        'display:flex;align-items:center;justify-content:center;font:600 12px/1 sans-serif;' +
        'box-shadow:0 1px 4px rgba(0,0,0,.4)'
      element.textContent = faNum(stop.order)

      new maplibregl.Marker({ element })
        .setLngLat([stop.lng, stop.lat])
        .setPopup(new maplibregl.Popup({ offset: 18 }).setText(stop.name))
        .addTo(map)
    }

    const bounds = new maplibregl.LngLatBounds()

    for (const stop of stops) bounds.extend([stop.lng, stop.lat])
    map.fitBounds(bounds, { padding: 60, maxZoom: 13, animate: false })

    return () => map.remove()
  }, [stops, roadPoints, dark, theme.palette.primary.main, theme.palette.primary.dark])

  return (
    <Paper sx={{ overflow: 'hidden' }}>
      <Box
        ref={container}
        sx={{
          height: { xs: 320, sm: 460 },
          // برچسب‌های کنترل نقشه لاتین‌اند و نباید آینه شوند.
          direction: 'ltr',
          '& .maplibregl-map': { fontFamily: 'inherit' },
        }}
      />
    </Paper>
  )
}

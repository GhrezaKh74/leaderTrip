import { useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { useRoutePath } from '../../api/queries'
import { faNum } from '../../lib/format'
import { googleMapsDirections, wazeNavigation } from '../../lib/navigation'

/** مهلت انتظار برای اولین کاشی، پیش از اعلام شکست. */
const TileTimeoutMs = 6000

export interface MapStop {
  id: string
  name: string
  lat: number
  lng: number
  order: number
}

/**
 * نقشهٔ مسیر با Leaflet خام.
 *
 * <p>چرا `react-leaflet` نه: Leaflet خودش DOM را مدیریت می‌کند و لایهٔ واسط
 * React روی آن، برای این کاربرد یک وابستگی و یک منبع ناسازگاری نسخه اضافه
 * می‌کند بی‌آنکه چیزی حل کند. نقشه در یک `useEffect` ساخته و در پاک‌سازی همان
 * افکت نابود می‌شود.</p>
 *
 * <p>اگر کاشی‌ها بارگذاری نشوند — بی‌اینترنت، فیلتر، یا سهمیهٔ سرور — نقشه
 * جای خالی خاکستری نمی‌ماند: پیام صریح می‌دهد و فهرست توقف‌ها را نشان می‌دهد،
 * چون همان فهرست کار اصلی را در جاده انجام می‌دهد.</p>
 *
 * <p><b>خط مسیر:</b> اگر هندسهٔ واقعی جاده از بک‌اند برسد، همان کشیده می‌شود
 * (خط پیوسته)؛ وگرنه خط مستقیمِ نقطه‌چین — و برچسب بالای نقشه صادقانه می‌گوید
 * کدام است. خطی که حدس است نباید شبیه جاده به نظر برسد.</p>
 */
export function RouteMap({ stops, expectTiles = true }: { stops: MapStop[]; expectTiles?: boolean }) {
  const container = useRef<HTMLDivElement | null>(null)
  const [tilesFailed, setTilesFailed] = useState(!expectTiles)
  const theme = useTheme()

  const routePath = useRoutePath(stops, expectTiles)
  const roadPoints =
    routePath.data !== undefined && routePath.data.source === 'Routed'
      ? routePath.data.points
      : null

  useEffect(() => {
    if (container.current === null || stops.length === 0) return

    const map = L.map(container.current, { attributionControl: true })
    const points = stops.map((stop) => [stop.lat, stop.lng] as [number, number])

    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap',
    })

    // دو نشانهٔ جدا، چون دو جور شکست هست:
    //
    // ۱. خطای صریح — سرور کد خطا می‌دهد. یک کاشیِ ناموفق عادی است؛ چند تای
    //    پشت‌سرهم یعنی نقشه واقعاً نمی‌آید.
    // ۲. سکوت — درخواست‌ها لغو می‌شوند و هیچ رویداد خطایی نمی‌آید. این حالت در
    //    شبکه‌های فیلترشده رایج است و دقیقاً همان جایی است که کاربر ایرانی
    //    گیر می‌کند. بدون این مهلت، فقط یک مستطیل خاکستری بی‌توضیح می‌ماند.
    let failures = 0
    let loadedAny = false

    tiles.on('tileload', () => {
      loadedAny = true
    })

    tiles.on('tileerror', () => {
      failures += 1
      if (failures >= 3) setTilesFailed(true)
    })

    const silenceTimer = setTimeout(() => {
      if (!loadedAny) setTilesFailed(true)
    }, TileTimeoutMs)

    tiles.addTo(map)

    if (roadPoints !== null) {
      // جادهٔ واقعی: خط پیوسته روی خودِ شبکهٔ راه‌ها.
      L.polyline(
        roadPoints.map((point) => [point.lat, point.lng] as [number, number]),
        { color: theme.palette.primary.main, weight: 4, opacity: 0.85 },
      ).addTo(map)
    } else {
      // خط مستقیم: نقطه‌چین، تا حدس شبیه جاده به نظر نرسد.
      L.polyline(points, {
        color: theme.palette.primary.main,
        weight: 3,
        opacity: 0.7,
        dashArray: '8 8',
      }).addTo(map)
    }

    stops.forEach((stop) => {
      // نام‌ها از دیتاست خودمان می‌آیند؛ HTML پاپ‌آپ فقط لینک مسیریابی است.
      L.marker([stop.lat, stop.lng], { icon: numberedIcon(stop.order, theme.palette.primary.dark) })
        .addTo(map)
        .bindPopup(
          `<b>${stop.name}</b><br/>` +
            `<a href="${googleMapsDirections(stop)}" target="_blank" rel="noopener">مسیریابی گوگل‌مپس</a> · ` +
            `<a href="${wazeNavigation(stop)}" target="_blank" rel="noopener">ویز</a>`,
        )
    })

    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] })

    return () => {
      clearTimeout(silenceTimer)
      map.remove()
    }
  }, [stops, roadPoints, theme.palette.primary.main, theme.palette.primary.dark])

  if (stops.length === 0) {
    return <Alert severity="info">این برنامه توقف قابل نمایشی روی نقشه ندارد.</Alert>
  }

  return (
    <Stack spacing={2}>
      {tilesFailed ? (
        <Alert severity="warning">
          {expectTiles
            ? 'کاشی‌های نقشه بارگذاری نشدند. ترتیب توقف‌ها زیر همین کادر هست و برنامه بدون نقشه هم کامل است.'
            : 'آفلاین هستید و کاشی‌های نقشه در دسترس نیستند. ترتیب توقف‌ها زیر همین کادر هست.'}
        </Alert>
      ) : null}

      {/* برچسب صادق: عددِ حدسی نباید شبیه اندازه‌گیری باشد، خط حدسی هم نباید
          شبیه جاده. با کمتر از دو توقف خطی در کار نیست که برچسب بخواهد. */}
      {stops.length >= 2 ? (
        <Stack direction="row" spacing={1}>
          {roadPoints !== null ? (
            <Chip size="small" color="success" label="مسیر واقعی جاده" />
          ) : routePath.isFetching ? (
            <Chip size="small" variant="outlined" label="در حال گرفتن مسیر جاده…" />
          ) : (
            <Chip size="small" variant="outlined" label="خط مستقیم — مسیر تقریبی" />
          )}
        </Stack>
      ) : null}

      <Paper sx={{ overflow: 'hidden' }}>
        <Box
          ref={container}
          sx={{
            height: { xs: 320, sm: 460 },
            // برچسب‌های Leaflet لاتین‌اند و نباید آینه شوند؛ محتوای نقشه از
            // جهت راست‌به‌چپ صفحه مستثناست.
            direction: 'ltr',
            '& .leaflet-container': { fontFamily: 'inherit' },
          }}
        />
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          ترتیب توقف‌ها
        </Typography>
        <Stack
          component="ol"
          // شماره‌گذاری فارسی فهرست: با پیش‌فرض مرورگر «1.» می‌شود و کنار متن
          // فارسی وصله به‌نظر می‌رسد.
          sx={{ m: 0, mt: 1, pr: 3, gap: 0.5, listStyleType: 'persian' }}
        >
          {stops.map((stop) => (
            <Typography key={`${stop.id}-${stop.order}`} component="li" variant="body2">
              {stop.name}
            </Typography>
          ))}
        </Stack>
      </Paper>
    </Stack>
  )
}

function numberedIcon(order: number, color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html:
      `<div style="background:${color};color:#fff;width:26px;height:26px;border-radius:50%;` +
      `display:flex;align-items:center;justify-content:center;font:600 12px/1 sans-serif;` +
      `box-shadow:0 1px 4px rgba(0,0,0,.4)">${faNum(order)}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
}

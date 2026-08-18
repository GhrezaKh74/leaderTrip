import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import { alpha, useTheme } from '@mui/material/styles'

import { scrubRoad } from '../../lib/motion'

/**
 * جادهٔ روز — خطی که توقف‌ها را به هم می‌دوزد، حالا زنده.
 *
 * <p>پیش‌تر این خط یک `::before` نقطه‌چین ساده بود. حالا دو لایه است: جادهٔ
 * خاموش (همان نقطه‌چین، همیشه پیدا) و جادهٔ پیموده‌شده که <b>با اسکرول شما</b>
 * کشیده می‌شود، به‌علاوهٔ پیمایشگری که رویش می‌راند. یعنی هرچه در برنامهٔ روز
 * پایین‌تر می‌روید، دقیقاً همان‌قدر از مسیر طی شده است.</p>
 *
 * <p>خط صاف است، نه موج‌دار: نسخهٔ اول ۴ پیکسل موج داشت و روی گوشی به‌جای
 * «جادهٔ پیچ‌دار»، خطِ کج خوانده می‌شد — انحرافی که قصه نمی‌گوید، خطا دیده
 * می‌شود.</p>
 *
 * <p>ابعاد از والد خوانده می‌شود نه از پراپ: بلوک‌های روز ارتفاع متغیر دارند
 * (یادداشت، چیپ‌های چندخطی، دکمهٔ ویرایش) و هر بار که چیزی باز/بسته شود قد
 * جاده عوض می‌شود. `ResizeObserver` تنها راهی است که این را بی‌حدس‌زدن
 * می‌گیرد.</p>
 */
export function RoadTrail() {
  const theme = useTheme()
  const hostRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<SVGPathElement>(null)
  const glowRef = useRef<SVGPathElement>(null)
  const riderRef = useRef<SVGGElement>(null)
  const [height, setHeight] = useState(0)
  const [offset, setOffset] = useState<number | null>(null)

  useLayoutEffect(() => {
    const parent = hostRef.current?.parentElement

    if (parent == null) return

    const measure = () => {
      setHeight(parent.clientHeight)
      setOffset(railOffset(parent))
    }

    const observer = new ResizeObserver(measure)

    observer.observe(parent)
    measure()

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const parent = hostRef.current?.parentElement
    const progress = progressRef.current
    const glow = glowRef.current
    const rider = riderRef.current

    // قد صفر یعنی هنوز چیدمان نشده؛ ساختن ناظر روی جادهٔ بی‌طول بی‌معنی است.
    if (height === 0 || parent == null || progress == null || rider == null) return

    return scrubRoad({ container: parent, progress, rider, ...(glow ? { glow } : {}) })
  }, [height])

  const d = roadPath(height)
  const road = theme.palette.primary.main

  return (
    <Box
      ref={hostRef}
      aria-hidden
      sx={{
        position: 'absolute',
        top: 0,
        // اندازه‌گیری‌شده، نه عدد ثابت. تا پیش از این دو عدد دستی این‌جا بود
        // (۱۵ و ۸۳) و روی گوشی ۱۳ پیکسل خطا داشت: ستون ساعت آن‌جا
        // `display:none` می‌شود ولی فرزندِ Stack می‌ماند، پس فاصلهٔ ۱۲
        // پیکسلی‌اش را همچنان می‌گیرد — چیزی که عدد ثابت نمی‌بیند. خط نازک
        // قبلی خطا را پنهان می‌کرد.
        insetInlineStart: `${(offset ?? 16) - RAIL / 2}px`,
        width: RAIL,
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      {height > 0 ? (
        <svg width={RAIL} height={height} viewBox={`0 0 ${RAIL} ${height}`} fill="none">
          <defs>
            <linearGradient id="lt-road" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.palette.primary.main} />
              <stop offset="60%" stopColor={theme.palette.info.main} />
              <stop offset="100%" stopColor={theme.palette.secondary.main} />
            </linearGradient>
          </defs>

          {/* جادهٔ خاموش — مسیرِ پیشِ رو، همیشه پیدا. */}
          <path
            d={d}
            stroke={alpha(road, 0.28)}
            strokeWidth={2}
            strokeDasharray="5 7"
            strokeLinecap="round"
          />

          {/* هالهٔ جادهٔ پیموده‌شده — استروک پهنِ کم‌رنگ، نه فیلتر drop-shadow:
              فیلتر SVG روی مسیری که هر فریمِ اسکرول عوض می‌شود، یعنی blur
              دوباره در هر فریم — روی گوشی با DPR بالا همین بود که لگ می‌ساخت.
              استروک ساده همان هاله را می‌دهد و raster ارزانی دارد. */}
          <path
            ref={glowRef}
            d={d}
            stroke={alpha(road, 0.2)}
            strokeWidth={8}
            strokeLinecap="round"
          />

          {/* جادهٔ پیموده‌شده — این یکی را اسکرول می‌کشد. */}
          <path
            ref={progressRef}
            d={d}
            stroke="url(#lt-road)"
            strokeWidth={3}
            strokeLinecap="round"
          />

          {/* پیمایشگر: هالهٔ نرم + مغزِ روشن. ماشینِ ریزنقش در ۱۲ پیکسل به
              لکه تبدیل می‌شود؛ نقطهٔ موقعیت هم خواناتر است هم صادق‌تر. */}
          <g ref={riderRef} style={{ transformBox: 'fill-box' }}>
            <circle cx={0} cy={0} r={9} fill={alpha(road, 0.22)} />
            <circle cx={0} cy={0} r={4.5} fill={theme.palette.background.paper} stroke={road} strokeWidth={2.5} />
          </g>
        </svg>
      ) : null}
    </Box>
  )
}

/** عرض لایهٔ جاده — جا برای موج و هالهٔ پیمایشگر. */
const RAIL = 26

/** مسیر جاده برای این قد — خط صافِ عمودی از مرکز ستون حباب‌ها. */
function roadPath(height: number): string {
  const top = 24
  const bottom = Math.max(top + 40, height - 24)
  const center = RAIL / 2

  return `M ${center} ${top} L ${center} ${bottom}`
}

/**
 * مرکز ستون حباب‌ها، از لبهٔ شروعِ محتوا — با خط‌کش، نه با حساب سرانگشتی.
 *
 * <p>چرا اندازه‌گیری: چیدمان این ردیف بین گوشی و دسکتاپ عوض می‌شود (ستون
 * ساعت پنهان می‌شود ولی فاصله‌اش می‌ماند)، و هر بار که کسی فاصله یا اندازهٔ
 * حباب را دست بزند، عددِ ثابتِ جاده بی‌صدا غلط می‌شود. خواندن از خود حباب
 * یعنی جاده همیشه همان‌جاست که باید.</p>
 *
 * <p>راست‌به‌چپ: «شروع» لبهٔ راست است. فاصله از همان لبه حساب می‌شود تا
 * `insetInlineStart` بی‌قید جهت درست بنشیند.</p>
 */
function railOffset(container: HTMLElement): number | null {
  const bubble = container.querySelector('.lt-stop')

  if (bubble === null) return null

  const box = bubble.getBoundingClientRect()
  const frame = container.getBoundingClientRect()
  const rtl = getComputedStyle(container).direction === 'rtl'

  return rtl ? frame.right - box.right + box.width / 2 : box.left - frame.left + box.width / 2
}

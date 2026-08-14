import type { DayWeather } from '../../domain/types'
import { weatherLabel } from '../../services/weather'
import { faNum } from '../../lib/format'
import { HEAT_THRESHOLD, FROST_THRESHOLD, RAIN_PROB_THRESHOLD } from '../../engine/climate'

/**
 * نوار آب‌وهوای روز.
 * منبع همیشه برچسب می‌خورد: «پیش‌بینی» یا «انتظار فصلی» — چون این دو یکی نیستند
 * و کاربر باید بداند با کدام طرف است.
 */
export function WeatherBadge({ w }: { w: DayWeather }) {
  const label = weatherLabel(w.code)
  const hot = w.tMax >= HEAT_THRESHOLD
  const frost = w.tMin <= FROST_THRESHOLD
  const wet = w.precipProb >= RAIN_PROB_THRESHOLD

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 text-xs dark:border-ink-800 dark:bg-ink-950">
      <span className="flex items-center gap-1.5 font-medium">
        <span aria-hidden className="text-base">
          {label.icon}
        </span>
        {label.text}
      </span>

      <span className="tabular-nums">
        <span className={hot ? 'font-bold text-[#d03b3b]' : 'font-medium'}>{faNum(w.tMax)}°</span>
        <span className="text-ink-400"> / </span>
        <span className={frost ? 'font-bold text-[#2a78d6]' : 'text-ink-500'}>
          {faNum(w.tMin)}°
        </span>
      </span>

      {w.precipProb >= 20 && (
        <span className={wet ? 'font-medium text-[#2a78d6]' : 'text-ink-500'}>
          💧 {faNum(w.precipProb)}٪
        </span>
      )}

      {w.windMaxKmh >= 35 && <span className="text-ink-500">💨 {faNum(w.windMaxKmh)}</span>}

      <span className="mr-auto text-[10px] text-ink-400">
        {w.source === 'forecast' ? 'پیش‌بینی' : 'انتظار فصلی (سال گذشته)'}
      </span>
    </div>
  )
}

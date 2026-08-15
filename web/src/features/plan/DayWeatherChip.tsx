import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import { RainIcon, SnowIcon, SunIcon } from '../../components/icons'

import type { DayWeather } from '../../api/schemas'
import { faNum } from '../../lib/format'

/**
 * هوای یک روز.
 *
 * <p><b>«انتظار فصلی» پیش‌بینی نیست</b> و نباید مثل آن دیده شود. وقتی تاریخ سفر
 * دورتر از افق پیش‌بینی است، عدد از بایگانی سال گذشته می‌آید؛ همان‌قدر مفید که
 * بدانیم تیرماه کویر گرم است، و همان‌قدر بی‌فایده برای تصمیم «فردا بارانی است
 * یا نه». برچسبش هم همین را می‌گوید.</p>
 */
export function DayWeatherChip({ weather }: { weather: DayWeather }) {
  const rain = Math.round(weather.precipitationProbability)
  const label =
    `${faNum(Math.round(weather.maxTemperature))}°` +
    ` / ${faNum(Math.round(weather.minTemperature))}°` +
    (rain >= 20 ? ` · بارش ${faNum(rain)}٪` : '')

  const icon = weather.hasSnow ? <SnowIcon /> : rain >= 20 ? <RainIcon /> : <SunIcon />

  return (
    <Tooltip
      title={
        weather.isForecast
          ? 'پیش‌بینی هواشناسی برای همین تاریخ'
          : 'انتظار فصلی بر پایهٔ همین بازه در سال گذشته — پیش‌بینی نیست'
      }
    >
      <Chip
        size="small"
        icon={icon}
        label={weather.isForecast ? label : `${label} (فصلی)`}
        variant={weather.isForecast ? 'filled' : 'outlined'}
        color={weather.hasSnow ? 'info' : 'default'}
      />
    </Tooltip>
  )
}

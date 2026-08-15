import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { City, TripPlan } from '../../api/schemas'
import type { TripForm } from '../wizard/tripSchema'
import { duration, faNum, toFa, toman, tomanShort } from '../../lib/format'
import { formatJalaliFromIso } from '../../lib/jalaliDisplay'

/**
 * نسخهٔ چاپی — کاغذی که در جاده کار می‌کند.
 *
 * <p>در دره‌ای که آنتن ندارد، کاغذ تنها چیزی است که همیشه کار می‌کند. پس این
 * صفحه همان چیزهایی را دارد که آن‌جا لازم می‌شود: برنامهٔ ساعتی، تفکیک هزینه،
 * چک‌لیست بار، هشدارها، و شماره‌های اضطراری — و هیچ دکمه‌ای.</p>
 *
 * <p>در حالت عادی پنهان است و فقط هنگام چاپ دیده می‌شود؛ بقیهٔ صفحه هنگام چاپ
 * پنهان می‌شود. یعنی «چاپ» همان چیزی را می‌دهد که انتظار می‌رود، نه اسکرین‌شاتی
 * از رابط کاربری با منو و دکمه.</p>
 */
const EMERGENCY: { label: string; number: string }[] = [
  { label: 'اورژانس', number: '۱۱۵' },
  { label: 'پلیس', number: '۱۱۰' },
  { label: 'آتش‌نشانی', number: '۱۲۵' },
  { label: 'امداد خودرو (ایران‌خودرو)', number: '۰۹۶۴۴۰' },
  { label: 'امداد خودرو (سایپا)', number: '۰۹۶۵۵۰' },
  { label: 'پلیس راه', number: '۱۴۱' },
  { label: 'هلال احمر', number: '۱۱۲' },
]

export function PrintSheet({
  plan,
  input,
  cities,
}: {
  plan: TripPlan
  input: TripForm
  cities: City[]
}) {
  const cityName = (id: string) => cities.find((c) => c.id === id)?.name ?? id
  const origin = cityName(input.originCityId)

  return (
    <Box className="print-only" sx={{ display: 'none' }}>
      <Typography variant="h2" component="h1">
        برنامهٔ سفر {faNum(plan.days.length)} روزه از {origin}
      </Typography>

      <Typography variant="body2" sx={{ mb: 2 }}>
        {formatJalaliFromIso(plan.days[0]?.date ?? input.startDate)} ·{' '}
        {faNum(input.travelers.length)} همسفر · {faNum(Math.round(plan.totalKilometers))} کیلومتر ·{' '}
        {tomanShort(plan.cost.total)}
        {plan.distanceSource === 'Estimated' ? ' · مسافت‌ها تخمینی' : ''}
      </Typography>

      {plan.days.map((day) => (
        <Box key={day.index} sx={{ mb: 2, breakInside: 'avoid' }}>
          <Typography variant="h4" component="h2">
            روز {faNum(day.index)} — {formatJalaliFromIso(day.date)} · شب در {cityName(day.baseCityId)}
          </Typography>

          <Typography variant="caption">
            {faNum(Math.round(day.kilometers))} کیلومتر · {duration(day.drivingMinutes)} رانندگی ·{' '}
            {toman(day.cost)}
            {day.weather
              ? ` · ${faNum(Math.round(day.weather.maxTemperature))}°/${faNum(Math.round(day.weather.minTemperature))}°`
              : ''}
          </Typography>

          <Stack component="ul" sx={{ m: 0, mt: 0.5, pr: 3, gap: 0.25 }}>
            {day.blocks.map((block, index) => (
              <Typography key={`${block.startsAt}-${index}`} component="li" variant="body2">
                <b>{toFa(block.startsAt)}</b> — {block.title}
                {block.kilometers != null ? ` (${faNum(Math.round(block.kilometers))} کیلومتر)` : ''}
                {block.cost > 0 ? ` — ${toman(block.cost)}` : ''}
              </Typography>
            ))}
          </Stack>
        </Box>
      ))}

      <Divider sx={{ my: 2 }} />

      <Typography variant="h4" component="h2">
        تفکیک هزینه
      </Typography>

      <Stack component="ul" sx={{ m: 0, mt: 0.5, pr: 3, gap: 0.25 }}>
        {plan.cost.lines.map((line) => (
          <Typography key={line.key} component="li" variant="body2">
            {line.label}: {toman(line.amount)} — {toFa(line.formula).replaceAll(',', '٬')}
          </Typography>
        ))}
        <Typography component="li" variant="body2">
          متفرقه: {toman(plan.cost.miscellaneous)} · بافر ریسک: {toman(plan.cost.riskBuffer)}
        </Typography>
        <Typography component="li" variant="body2" sx={{ fontWeight: 700 }}>
          جمع کل: {toman(plan.cost.total)} · هر نفر: {toman(plan.cost.perPerson)}
        </Typography>
      </Stack>

      {plan.advice.length > 0 ? (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h4" component="h2">
            هشدارها
          </Typography>
          <Stack component="ul" sx={{ m: 0, mt: 0.5, pr: 3, gap: 0.25 }}>
            {plan.advice.map((item) => (
              <Typography key={item.code} component="li" variant="body2">
                <b>{item.title}</b> — {item.detail}
              </Typography>
            ))}
          </Stack>
        </>
      ) : null}

      <Divider sx={{ my: 2 }} />

      <Typography variant="h4" component="h2">
        چک‌لیست بار
      </Typography>

      <Stack component="ul" sx={{ m: 0, mt: 0.5, pr: 3, gap: 0.25 }}>
        {plan.packing.map((item) => (
          <Typography key={`${item.group}/${item.item}`} component="li" variant="body2">
            ☐ {item.item} <span style={{ opacity: 0.7 }}>({item.group})</span>
          </Typography>
        ))}
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Typography variant="h4" component="h2">
        شماره‌های اضطراری
      </Typography>

      <Stack sx={{ mt: 0.5, gap: 0.25 }}>
        {EMERGENCY.map((item) => (
          <Typography key={item.number} variant="body2">
            {item.label}: <b>{item.number}</b>
          </Typography>
        ))}
      </Stack>

      <Typography variant="caption" sx={{ display: 'block', mt: 2 }}>
        همهٔ ارقام تخمینی‌اند. قیمت‌های پایه پیش از سفر باید با نرخ روز بررسی شوند.
      </Typography>
    </Box>
  )
}

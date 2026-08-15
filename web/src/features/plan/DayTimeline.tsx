import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import BedIcon from '@mui/icons-material/BedOutlined'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCarOutlined'
import LocalGasStationIcon from '@mui/icons-material/LocalGasStationOutlined'
import PlaceIcon from '@mui/icons-material/PlaceOutlined'
import RestaurantIcon from '@mui/icons-material/RestaurantOutlined'
import SelfImprovementIcon from '@mui/icons-material/SelfImprovementOutlined'

import type { DayPlan, PlanBlock } from '../../api/schemas'
import { duration, faNum, toFa, toman } from '../../lib/format'
import { formatJalaliFromIso } from '../../lib/jalaliDisplay'

const BLOCK_ICON: Record<PlanBlock['kind'], typeof PlaceIcon> = {
  Drive: DirectionsCarIcon,
  Visit: PlaceIcon,
  Meal: RestaurantIcon,
  Rest: SelfImprovementIcon,
  Lodging: BedIcon,
  Refuel: LocalGasStationIcon,
}

const BLOCK_COLOR: Record<PlanBlock['kind'], string> = {
  Drive: 'text.secondary',
  Visit: 'primary.main',
  Meal: 'secondary.main',
  Rest: 'text.secondary',
  Lodging: 'text.secondary',
  Refuel: 'text.secondary',
}

export function DayTimeline({ day, cityName }: { day: DayPlan; cityName: string }) {
  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'baseline' }, mb: 2 }}
      >
        <Typography variant="h3" component="h3">
          روز {faNum(day.index)} — {formatJalaliFromIso(day.date)}
        </Typography>

        <Typography variant="body2" color="text.secondary">
          {/* «·» جداکنندهٔ عمدی است: دو رشتهٔ رقمی چسبیده در متن راست‌به‌چپ در هم
              ادغام می‌شوند و «۲۱۰ کیلومتر» کنار «۳ ساعت» بد خوانده می‌شود. */}
          شب در {cityName} · {faNum(Math.round(day.kilometers))} کیلومتر ·{' '}
          {duration(day.drivingMinutes)} رانندگی · {toman(day.cost)}
        </Typography>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {day.blocks.length === 0 ? (
        <Typography color="text.secondary">برای این روز برنامه‌ای ساخته نشد.</Typography>
      ) : (
        <Stack spacing={0}>
          {day.blocks.map((block, index) => (
            <BlockRow key={`${block.startsAt}-${index}`} block={block} />
          ))}
        </Stack>
      )}
    </Paper>
  )
}

function BlockRow({ block }: { block: PlanBlock }) {
  const Icon = BLOCK_ICON[block.kind]

  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', py: 1 }}>
      <Typography
        variant="body2"
        color="text.secondary"
        // عرض ثابت تا ساعت‌ها زیر هم بنشینند؛ `tabular-nums` تا ارقام هم‌عرض
        // شوند و ستون نلرزد.
        sx={{ minWidth: 52, fontVariantNumeric: 'tabular-nums', pt: 0.25 }}
      >
        {toFa(block.startsAt)}
      </Typography>

      <Box sx={{ color: BLOCK_COLOR[block.kind], pt: 0.25 }}>
        <Icon fontSize="small" />
      </Box>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: block.kind === 'Visit' ? 600 : 400 }}>
          {block.title}
        </Typography>

        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
          <Chip size="small" variant="outlined" label={duration(block.durationMinutes)} />

          {block.kilometers != null ? (
            <Chip size="small" variant="outlined" label={`${faNum(Math.round(block.kilometers))} کیلومتر`} />
          ) : null}

          {block.cost > 0 ? (
            <Chip size="small" variant="outlined" color="secondary" label={toman(block.cost)} />
          ) : null}
        </Stack>

        {block.note ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {block.note}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  )
}

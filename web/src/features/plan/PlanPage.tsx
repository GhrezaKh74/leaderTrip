import { useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import EditIcon from '@mui/icons-material/EditOutlined'

import { usePois, useReferenceData } from '../../api/queries'
import type { TripPlan } from '../../api/schemas'
import type { TripForm } from '../wizard/tripSchema'
import { duration, faNum, tomanShort } from '../../lib/format'
import { AdvicePanel } from './AdvicePanel'
import { CostPanel } from './CostPanel'
import { PackingPanel } from './PackingPanel'
import { DayTimeline } from './DayTimeline'
import { buildStops } from './buildStops'
import { RouteMap } from './RouteMap'

export function PlanPage({
  plan,
  input,
  online,
  onEdit,
}: {
  plan: TripPlan
  input: TripForm
  online: boolean
  onEdit: () => void
}) {
  const [tab, setTab] = useState(0)
  const reference = useReferenceData()
  const pois = usePois()

  const cityName = useMemo(() => {
    const byId = new Map((reference.data?.cities ?? []).map((city) => [city.id, city.name]))

    return (id: string) => byId.get(id) ?? id
  }, [reference.data])

  const stops = useMemo(() => {
    const ordered = plan.days.flatMap((day) =>
      day.blocks.filter((block) => block.kind === 'Visit' && block.poiId).map((block) => block.poiId!),
    )

    return buildStops(ordered, pois.data?.items)
  }, [plan, pois.data])

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' } }}
      >
        <Box>
          <Typography variant="h2" component="h2">
            برنامهٔ {faNum(plan.days.length)} روزه
          </Typography>

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mt: 1 }}>
            <Chip size="small" label={`${faNum(plan.visitCount)} بازدید`} />
            <Chip size="small" label={`${faNum(Math.round(plan.totalKilometers))} کیلومتر`} />
            <Chip size="small" label={`${duration(plan.totalDrivingMinutes)} رانندگی`} />
            <Chip size="small" color="secondary" label={tomanShort(plan.cost.total)} />
            {/*
              مبدأ مسافت روی صفحه می‌آید، نه در لاگ: عددی که حدس است نباید شبیه
              اندازه‌گیری به نظر برسد. کسی که می‌داند مسافت تخمینی است، بنزین را
              با حاشیه حساب می‌کند.
            */}
            <Chip
              size="small"
              variant="outlined"
              color={plan.distanceSource === 'Routed' ? 'success' : 'default'}
              label={plan.distanceSource === 'Routed' ? 'مسافت واقعی جاده' : 'مسافت‌ها تخمینی'}
            />
          </Stack>
        </Box>

        <Button onClick={onEdit} startIcon={<EditIcon />} variant="outlined">
          ویرایش ورودی‌ها
        </Button>
      </Stack>

      {online ? null : (
        // برنامه از حافظهٔ محلی می‌آید و کامل است. تنها چیزی که آفلاین ممکن
        // نیست، ساختن برنامهٔ تازه است — و همین صریح گفته می‌شود.
        <Alert severity="info">
          آفلاین هستید. این برنامه از حافظهٔ دستگاه خوانده شده و کامل است؛
          ساخت برنامهٔ تازه به اینترنت نیاز دارد.
        </Alert>
      )}

      {plan.unscheduledPoiIds.length > 0 ? (
        <Alert severity="warning">
          {faNum(plan.unscheduledPoiIds.length)} جاذبهٔ انتخابی در برنامه جا نشد —
          معمولاً یعنی سقف رانندگی روزانه یا طول روز اجازه نداده است.
        </Alert>
      ) : null}

      <Tabs value={tab} onChange={(_, next: number) => setTab(next)} variant="scrollable" scrollButtons="auto">
        <Tab label="برنامه" />
        <Tab label="هزینه" />
        <Tab label={`هشدارها${plan.advice.length > 0 ? ` (${faNum(plan.advice.length)})` : ''}`} />
        <Tab label="چک‌لیست" />
        <Tab label="نقشه" />
      </Tabs>

      <Box hidden={tab !== 0}>
        <Stack spacing={2}>
          {plan.days.map((day) => (
            <DayTimeline key={day.index} day={day} cityName={cityName(day.baseCityId)} />
          ))}
        </Stack>
      </Box>

      <Box hidden={tab !== 1}>
        <CostPanel cost={plan.cost} budget={input.budgetToman} people={input.travelers.length} />
      </Box>

      <Box hidden={tab !== 2}>
        <AdvicePanel advice={plan.advice} />
      </Box>

      <Box hidden={tab !== 3}>
        <PackingPanel items={plan.packing} />
      </Box>

      <Box hidden={tab !== 4}>
        {pois.isPending ? (
          <Stack spacing={2} sx={{ py: 6, alignItems: 'center' }}>
            <CircularProgress />
            <Typography color="text.secondary">در حال گرفتن مختصات جاذبه‌ها…</Typography>
          </Stack>
        ) : pois.isError ? (
          <Alert severity="warning">
            مختصات جاذبه‌ها گرفته نشد؛ برنامه و هزینه بدون نقشه هم کامل‌اند.
          </Alert>
        ) : (
          // نقشه فقط وقتی ساخته می‌شود که تبش باز باشد: Leaflet در کانتینری با
          // ارتفاع صفر اندازه‌ها را غلط حساب می‌کند و بعد هم خودش را درست نمی‌کند.
          tab === 4 ? <RouteMap stops={stops} expectTiles={online} /> : null
        )}
      </Box>
    </Stack>
  )
}

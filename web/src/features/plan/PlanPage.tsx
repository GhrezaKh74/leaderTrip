import { useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined'
import EditIcon from '@mui/icons-material/EditOutlined'
import PrintIcon from '@mui/icons-material/PrintOutlined'
import ShareIcon from '@mui/icons-material/ShareOutlined'

import { usePois, useReferenceData } from '../../api/queries'
import type { TripPlan } from '../../api/schemas'
import type { TripForm } from '../wizard/tripSchema'
import { duration, faNum, tomanShort } from '../../lib/format'
import { AdvicePanel } from './AdvicePanel'
import { CostPanel } from './CostPanel'
import { DayTimeline } from './DayTimeline'
import { OptimizerPanel } from './OptimizerPanel'
import { PackingPanel } from './PackingPanel'
import { PrintSheet } from './PrintSheet'
import { buildStops } from './buildStops'
import { RouteMap } from './RouteMap'
import { downloadTrip, shareUrl } from './sharing'
import { LivePanel } from '../live/LivePanel'
import { learnedTaste, loadJournal, saveJournal, type Journal } from '../live/journal'

const TABS = ['برنامه', 'هزینه', 'کاهش هزینه', 'هشدارها', 'چک‌لیست', 'نقشه', 'حین سفر'] as const

const ADVICE_TAB = 3
const MAP_TAB = 5
const LIVE_TAB = 6

export function PlanPage({
  plan,
  input,
  online,
  onEdit,
  onRebuild,
}: {
  plan: TripPlan
  input: TripForm
  online: boolean
  onEdit: () => void
  /** ورودی عوض شده — برنامه باید از نو ساخته شود، نه دستکاری. */
  onRebuild: (next: TripForm) => void
}) {
  const [tab, setTab] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const reference = useReferenceData()
  const pois = usePois()

  const tripId = useMemo(() => `${input.originCityId}|${input.startDate}|${input.days}`, [input])
  const [journal, setJournal] = useState<Journal>(() => loadJournal(tripId))

  useEffect(() => setJournal(loadJournal(tripId)), [tripId])

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

  const updateJournal = (next: Journal) => {
    setJournal(next)
    saveJournal(next)
  }

  /**
   * جابه‌جایی و حذف، ورودی را عوض می‌کنند و برنامه از نو ساخته می‌شود.
   * دستکاری مستقیم خروجی یعنی مسافت و ساعت و هزینه با آنچه دیده می‌شود نخواند.
   */
  const editActions = {
    totalDays: plan.days.length,
    onMove: (poiId: string, targetDay: number) =>
      onRebuild({ ...input, dayAssignments: { ...input.dayAssignments, [poiId]: targetDay } }),
    onRemove: (poiId: string) =>
      onRebuild({ ...input, excludedPoiIds: [...input.excludedPoiIds, poiId] }),
  }

  const taste = learnedTaste(journal)

  const share = async () => {
    const url = shareUrl(input)

    // `navigator.share` روی موبایل تجربهٔ درست است؛ روی دسکتاپ معمولاً نیست،
    // پس کپی در کلیپ‌بورد جایگزینش می‌شود.
    try {
      if (navigator.share !== undefined) {
        await navigator.share({ title: 'برنامهٔ سفر', url })
      } else {
        await navigator.clipboard.writeText(url)
        setToast('لینک سفر کپی شد.')
      }
    } catch {
      setToast('اشتراک‌گذاری انجام نشد.')
    }
  }

  return (
    <Box className="print-root">
      <PrintSheet plan={plan} input={input} cities={reference.data?.cities ?? []} />

      <Stack spacing={3} className="no-print">
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
                مبدأ مسافت روی صفحه می‌آید، نه در لاگ: عددی که حدس است نباید
                شبیه اندازه‌گیری به نظر برسد.
              */}
              <Chip
                size="small"
                variant="outlined"
                color={plan.distanceSource === 'Routed' ? 'success' : 'default'}
                label={plan.distanceSource === 'Routed' ? 'مسافت واقعی جاده' : 'مسافت‌ها تخمینی'}
              />
            </Stack>
          </Box>

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Button onClick={onEdit} startIcon={<EditIcon />} variant="outlined" size="small">
              ویرایش ورودی‌ها
            </Button>

            <Button onClick={() => window.print()} startIcon={<PrintIcon />} variant="outlined" size="small">
              چاپ
            </Button>

            <Button onClick={() => void share()} startIcon={<ShareIcon />} variant="outlined" size="small">
              اشتراک
            </Button>

            <Button
              onClick={() => downloadTrip(input)}
              startIcon={<DownloadIcon />}
              variant="outlined"
              size="small"
            >
              خروجی
            </Button>
          </Stack>
        </Stack>

        {online ? null : (
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

        <Tabs
          value={tab}
          onChange={(_, next: number) => setTab(next)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {TABS.map((label, index) => (
            <Tab
              key={label}
              label={
                index === ADVICE_TAB && plan.advice.length > 0
                  ? `${label} (${faNum(plan.advice.length)})`
                  : label
              }
            />
          ))}
        </Tabs>

        <Box hidden={tab !== 0}>
          <Stack spacing={2}>
            {plan.days.map((day) => (
              <DayTimeline
                key={day.index}
                day={day}
                cityName={cityName(day.baseCityId)}
                actions={editActions}
              />
            ))}
          </Stack>
        </Box>

        <Box hidden={tab !== 1}>
          <CostPanel cost={plan.cost} budget={input.budgetToman} people={input.travelers.length} />
        </Box>

        <Box hidden={tab !== 2}>
          <OptimizerPanel input={input} onApply={onRebuild} />
        </Box>

        <Box hidden={tab !== ADVICE_TAB}>
          <AdvicePanel advice={plan.advice} />
        </Box>

        <Box hidden={tab !== 4}>
          <PackingPanel items={plan.packing} />
        </Box>

        <Box hidden={tab !== MAP_TAB}>
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
            tab === MAP_TAB ? <RouteMap stops={stops} expectTiles={online} /> : null
          )}
        </Box>

        <Box hidden={tab !== LIVE_TAB}>
          <LivePanel
            plan={plan}
            input={input}
            pois={pois.data?.items}
            journal={journal}
            onChange={updateJournal}
          />

          {Object.keys(taste).length > 0 ? (
            <Alert severity="success" sx={{ mt: 2 }}>
              سلیقهٔ شما از {faNum(Object.keys(taste).length)} دسته یاد گرفته شد و در ساخت برنامهٔ
              بعدی اثر می‌گذارد.
            </Alert>
          ) : null}
        </Box>
      </Stack>

      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Box>
  )
}

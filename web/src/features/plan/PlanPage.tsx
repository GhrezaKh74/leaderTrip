import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import MoreIcon from '@mui/icons-material/MoreHoriz'

import {
  CarIcon,
  ChecklistIcon,
  CostIcon,
  DownloadIcon,
  EditIcon,
  FlagIcon,
  MapIcon,
  PrintIcon,
  RouteIcon,
  SavingsIcon,
  ShareIcon,
  ShieldIcon,
  VisitPinIcon,
} from '../../components/icons'

import AddIcon from '@mui/icons-material/AddOutlined'

import { usePois, useReferenceData } from '../../api/queries'
import { SaveTripButton } from '../auth/SaveTripButton'
import type { TripPlan } from '../../api/schemas'
import type { TripForm } from '../wizard/tripSchema'
import { duration, faNum, tomanShort } from '../../lib/format'
import { countUp, riseIn } from '../../lib/motion'
import { glass } from '../../theme/tokens'
import { AdvicePanel } from './AdvicePanel'
import { CostPanel } from './CostPanel'
import { DayTimeline } from './DayTimeline'
import { OptimizerPanel } from './OptimizerPanel'
import { PackingPanel } from './PackingPanel'
import { PrintSheet } from './PrintSheet'
import { buildStops } from './buildStops'
import { downloadTrip, shareUrl } from './sharing'
import { LivePanel } from '../live/LivePanel'
import { learnedTaste, loadJournal, saveJournal, type Journal } from '../live/journal'

/**
 * تب‌ها با آیکون اختصاصی — آیکون پیش از خواندن برچسب می‌گوید داخل تب چیست، و
 * در عرض موبایل که برچسب‌ها کوچک می‌شوند، همان آیکون لنگر بازشناسی است.
 */
const TABS = [
  { label: 'برنامه', icon: RouteIcon },
  { label: 'هزینه', icon: CostIcon },
  { label: 'کاهش هزینه', icon: SavingsIcon },
  { label: 'هشدارها', icon: ShieldIcon },
  { label: 'چک‌لیست', icon: ChecklistIcon },
  { label: 'نقشه', icon: MapIcon },
  { label: 'حین سفر', icon: FlagIcon },
] as const

const ADVICE_TAB = 3
const MAP_TAB = 5
const LIVE_TAB = 6

// نقشه (و Leaflet همراهش) فقط وقتی دانلود می‌شود که تبش باز شود؛ در باندل
// اولیه بودنش یعنی اسپلش طولانی‌تر برای همه، به‌خاطر تبی که شاید باز نشود.
const RouteMap = lazy(() => import('./RouteMap').then((m) => ({ default: m.RouteMap })))

export function PlanPage({
  plan,
  input,
  online,
  onEdit,
  onNew,
  onRebuild,
}: {
  plan: TripPlan
  input: TripForm
  online: boolean
  onEdit: () => void
  /** شروع سفر تازه: ویزارد از نو با پیش‌فرض‌ها، نه با فرم نیمه‌پر قبلی. */
  onNew: () => void
  /** ورودی عوض شده — برنامه باید از نو ساخته شود، نه دستکاری. */
  onRebuild: (next: TripForm) => void
}) {
  const [tab, setTab] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  // منوی «بیشتر» روی گوشی: چاپ/اشتراک/خروجی کنش‌های گاه‌به‌گاه‌اند و سه
  // دکمهٔ متنی جا می‌خوردند.
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null)
  const reference = useReferenceData()
  const pois = usePois()

  const tripId = useMemo(() => `${input.originCityId}|${input.startDate}|${input.days}`, [input])
  const [journal, setJournal] = useState<Journal>(() => loadJournal(tripId))

  useEffect(() => setJournal(loadJournal(tripId)), [tripId])

  const cityName = useMemo(() => {
    const byId = new Map((reference.data?.cities ?? []).map((city) => [city.id, city.name]))

    return (id: string) => byId.get(id) ?? id
  }, [reference.data])

  const locatePoi = useMemo(() => {
    const byId = new Map((pois.data?.items ?? []).map((poi) => [poi.id, { lat: poi.lat, lng: poi.lng }]))

    return (id: string) => byId.get(id)
  }, [pois.data])

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
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Typography variant="h1" component="h2" sx={{ fontSize: { xs: '1.55rem', sm: '2.25rem' } }}>
              برنامهٔ {faNum(plan.days.length)} روزه
            </Typography>

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

          {/* روی گوشی، شش دکمهٔ متنی نصف صفحهٔ اول را می‌خوردند. حالا: کنش
              اصلی (ذخیره) متنی می‌ماند، «سفر جدید» و «ویرایش» آیکونی
              می‌شوند، و کنش‌های گاه‌به‌گاه (چاپ/اشتراک/خروجی) پشت منوی «بیشتر»
              می‌روند. دسکتاپ جا دارد؛ همه متنی می‌مانند. */}
          <Stack direction="row" spacing={1} sx={{ flexWrap: { sm: 'wrap' }, gap: 1, alignItems: 'center' }}>
            <Tooltip title="سفر جدید">
              <IconButton
                onClick={onNew}
                aria-label="سفر جدید"
                size="small"
                sx={{
                  display: { xs: 'inline-flex', sm: 'none' },
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: '10px',
                }}
              >
                <AddIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
            <Button
              onClick={onNew}
              startIcon={<AddIcon sx={{ fontSize: 18 }} />}
              variant="outlined"
              size="small"
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              سفر جدید
            </Button>

            <SaveTripButton input={input} onSaved={setToast} />

            <Tooltip title="ویرایش ورودی‌ها">
              <IconButton
                onClick={onEdit}
                aria-label="ویرایش ورودی‌ها"
                size="small"
                sx={{
                  display: { xs: 'inline-flex', sm: 'none' },
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: '10px',
                }}
              >
                <EditIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Button
              onClick={onEdit}
              startIcon={<EditIcon />}
              variant="outlined"
              size="small"
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              ویرایش ورودی‌ها
            </Button>

            <Button
              onClick={() => window.print()}
              startIcon={<PrintIcon />}
              variant="outlined"
              size="small"
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              چاپ
            </Button>

            <Button
              onClick={() => void share()}
              startIcon={<ShareIcon />}
              variant="outlined"
              size="small"
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              اشتراک
            </Button>

            <Button
              onClick={() => downloadTrip(input)}
              startIcon={<DownloadIcon />}
              variant="outlined"
              size="small"
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              خروجی
            </Button>

            <Tooltip title="چاپ، اشتراک و خروجی">
              <IconButton
                aria-label="کنش‌های بیشتر"
                size="small"
                onClick={(event) => setMoreAnchor(event.currentTarget)}
                sx={{
                  display: { xs: 'inline-flex', sm: 'none' },
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: '10px',
                }}
              >
                <MoreIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>

            <Menu anchorEl={moreAnchor} open={moreAnchor !== null} onClose={() => setMoreAnchor(null)}>
              <MenuItem
                onClick={() => {
                  setMoreAnchor(null)
                  window.print()
                }}
              >
                <ListItemIcon>
                  <PrintIcon sx={{ fontSize: 19 }} />
                </ListItemIcon>
                <ListItemText>چاپ برنامه</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMoreAnchor(null)
                  void share()
                }}
              >
                <ListItemIcon>
                  <ShareIcon sx={{ fontSize: 19 }} />
                </ListItemIcon>
                <ListItemText>اشتراک‌گذاری</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMoreAnchor(null)
                  downloadTrip(input)
                }}
              >
                <ListItemIcon>
                  <DownloadIcon sx={{ fontSize: 19 }} />
                </ListItemIcon>
                <ListItemText>خروجی فایل سفر</ListItemText>
              </MenuItem>
            </Menu>
          </Stack>
        </Stack>

        {/* داشبورد لیدر: چهار عدد کلیدی سفر، درشت و شمارنده — یک نگاه، کل سفر. */}
        <StatBoard plan={plan} />

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

        {/* تب‌ها چسبان می‌مانند: در برنامهٔ چندروزهٔ بلند، کاربر وسط روز سوم
            نباید برای عوض‌کردن تب تا بالای صفحه برگردد. */}
        <Box
          sx={(theme) => ({
            position: 'sticky',
            top: { xs: 56, sm: 64 },
            zIndex: 2,
            // شیشه، نه سطح کدر: نوار چسبان روی محتوای در حال عبور شناور است.
            ...glass(theme.palette.mode),
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            mx: -1,
            px: 1,
          })}
        >
          <Tabs
            value={tab}
            onChange={(_, next: number) => setTab(next)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {TABS.map(({ label, icon: Icon }, index) => (
              <Tab
                key={label}
                icon={<Icon sx={{ fontSize: 19 }} />}
                iconPosition="start"
                label={
                  index === ADVICE_TAB && plan.advice.length > 0
                    ? `${label} (${faNum(plan.advice.length)})`
                    : label
                }
              />
            ))}
          </Tabs>
        </Box>

        <Box hidden={tab !== 0}>
          <Stack spacing={2}>
            {plan.days.map((day) => (
              <DayTimeline
                key={day.index}
                day={day}
                cityName={cityName(day.baseCityId)}
                actions={editActions}
                locate={locatePoi}
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
            tab === MAP_TAB ? (
              <Suspense
                fallback={
                  <Stack spacing={2} sx={{ py: 6, alignItems: 'center' }}>
                    <CircularProgress />
                    <Typography color="text.secondary">در حال آماده‌سازی نقشه…</Typography>
                  </Stack>
                }
              >
                <RouteMap stops={stops} expectTiles={online} />
              </Suspense>
            ) : null
          )}
        </Box>

        <Box hidden={tab !== LIVE_TAB}>
          <LivePanel
            plan={plan}
            input={input}
            pois={pois.data?.items}
            journal={journal}
            online={online}
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

// قالب‌بندهای شمارنده در سطح ماژول تا مرجعشان پایدار بماند؛ وگرنه افکت
// StatCard با هر رندر (مثلاً هر تعویض تب) دوباره از صفر می‌شمارد.
const formatCount = (value: number) => faNum(Math.round(value))
const formatKm = (value: number) => faNum(Math.round(value))
const formatDrive = (value: number) => duration(Math.round(value))
const formatCost = (value: number) => tomanShort(Math.round(value))

/** داشبورد آمار سفر — چهار کارت شمارنده با ورود پلکانی. */
function StatBoard({ plan }: { plan: TripPlan }) {
  const boardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (boardRef.current) riseIn(Array.from(boardRef.current.children), { step: 60 })
  }, [plan])

  return (
    <Box
      ref={boardRef}
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
        gap: 1.5,
      }}
    >
      <StatCard icon={VisitPinIcon} label="بازدید" value={plan.visitCount} format={formatCount} color="primary" />
      <StatCard icon={RouteIcon} label="کیلومتر" value={Math.round(plan.totalKilometers)} format={formatKm} color="info" />
      <StatCard icon={CarIcon} label="رانندگی" value={plan.totalDrivingMinutes} format={formatDrive} color="success" />
      <StatCard icon={CostIcon} label="هزینهٔ کل" value={plan.cost.total} format={formatCost} color="secondary" />
    </Box>
  )
}

/**
 * کارت آمار — عدد درشتی که از صفر تا مقدارش می‌شمارد.
 *
 * <p>شمارش تزئین نیست: می‌گوید «این عدد از جمع سفرت ساخته شد»، و چون از همان
 * قالب‌بند همیشگی می‌گذرد (`lib/format.ts`)، هر فریمش هم فارسی و درست است.</p>
 */
function StatCard({
  icon: Icon,
  label,
  value,
  format,
  color,
}: {
  icon: typeof RouteIcon
  label: string
  value: number
  format: (value: number) => string
  color: 'primary' | 'secondary' | 'info' | 'success'
}) {
  const valueRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (valueRef.current) countUp(valueRef.current, value, format)
  }, [value, format])

  return (
    <Box
      sx={(theme) => ({
        ...glass(theme.palette.mode),
        // حاشیه به رنگِ همان آمار، بسیار کم‌رنگ: چهار کارت، چهار هویت — بی‌آنکه
        // رنگی جیغ بزند. لبهٔ بالایی روشن همان نور صحنهٔ بقیهٔ سطح‌هاست.
        border: `1px solid ${alpha(theme.palette[color].main, theme.palette.mode === 'dark' ? 0.24 : 0.3)}`,
        borderRadius: 3,
        p: { xs: 1.5, sm: 2 },
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        minWidth: 0,
        ...(theme.palette.mode === 'dark'
          ? { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }
          : null),
      })}
    >
      <Box
        sx={(theme) => ({
          width: 40,
          height: 40,
          borderRadius: '13px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.palette[color].main,
          bgcolor: alpha(theme.palette[color].main, 0.12),
          // هالهٔ نوری زیر آیکون — کاشی آیکون «منبع نور» کارت است.
          boxShadow: `0 0 18px ${alpha(theme.palette[color].main, 0.3)}`,
        })}
      >
        <Icon sx={{ fontSize: 21 }} />
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="span"
          ref={valueRef}
          // بدون nowrap: مقدار بلند («۱۰ ساعت و ۱۶ دقیقه») باید بشکند، نه از کارت بیرون بزند.
          sx={{
            display: 'block',
            fontFamily: (theme) => theme.typography.h3.fontFamily,
            fontWeight: 800,
            fontSize: { xs: '1.05rem', sm: '1.2rem' },
            lineHeight: 1.5,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {format(value)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
          {label}
        </Typography>
      </Box>
    </Box>
  )
}

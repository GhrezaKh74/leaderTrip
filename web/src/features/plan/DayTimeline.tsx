import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import ArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import MoreIcon from '@mui/icons-material/MoreHoriz'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { alpha, useTheme } from '@mui/material/styles'

import { BanIcon, CarIcon, FuelIcon, LodgingIcon, MealIcon, TeaIcon, VisitPinIcon } from '../../components/icons'

import type { DayPlan, PlanBlock } from '../../api/schemas'
import { duration, faNum, toFa, toman } from '../../lib/format'
import { formatJalaliFromIso } from '../../lib/jalaliDisplay'
import type { NavPoint } from '../../lib/navigation'
import { revealOnScroll } from '../../lib/motion'
import { heroGradient } from '../../theme/tokens'
import { DayWeatherChip } from './DayWeatherChip'
import { NavigateButton } from './NavigateButton'
import { RoadTrail } from './RoadTrail'

/**
 * آیکون و رنگ هر نوع بلوک — از پالت معنایی برند.
 *
 * <p>بازدید فیروزه است (خودِ سفر)، وعده زعفران، استراحت سبزِ چای (آیکونش هم
 * استکان است)، اقامت لاجوردِ شب، سوخت اُخرا. رانندگی خاکستری می‌ماند: بین راه
 * است، نه مقصد — چشم باید اول توقف‌ها را بگیرد.</p>
 */
const BLOCK_ICON: Record<PlanBlock['kind'], typeof CarIcon> = {
  Drive: CarIcon,
  Visit: VisitPinIcon,
  Meal: MealIcon,
  Rest: TeaIcon,
  Lodging: LodgingIcon,
  Refuel: FuelIcon,
}

export interface DayEditActions {
  totalDays: number
  onMove: (poiId: string, targetDay: number) => void
  onRemove: (poiId: string) => void
}

export function DayTimeline({
  day,
  cityName,
  actions,
  locate,
}: {
  day: DayPlan
  cityName: string
  actions?: DayEditActions
  /** مختصات جاذبه از روی شناسه — برای دکمهٔ «برو با مسیریاب». */
  locate?: (poiId: string) => { lat: number; lng: number } | undefined
}) {
  const trailRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const trail = trailRef.current

    if (trail == null) return

    // حباب‌ها با رسیدنِ چشم جان می‌گیرند. وابسته به تعداد بلوک‌هاست چون
    // جابه‌جایی و حذفِ توقف، فهرست را از نو می‌سازد.
    return revealOnScroll([...trail.querySelectorAll('.lt-stop')])
  }, [day.blocks.length])

  return (
    <Paper
      className="lt-rise"
      // ورود پلکانی به‌ترتیب روز — برنامه روزبه‌روز است، ورودش هم.
      sx={{ p: { xs: 2, sm: 3 }, animationDelay: `${(day.index - 1) * 70}ms` }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 2 }}
      >
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          {/* نشان روز با گرادیان برند — لنگر چشم هنگام اسکرول برنامهٔ چندروزه. */}
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: '12px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: heroGradient,
              color: '#fff',
              fontFamily: (theme) => theme.typography.h3.fontFamily,
              fontWeight: 800,
              fontSize: '0.95rem',
            }}
          >
            {faNum(day.index)}
          </Box>

          <Typography variant="h3" component="h3" sx={{ fontSize: { xs: '1.02rem', sm: '1.25rem' } }}>
            روز {faNum(day.index)} — {formatJalaliFromIso(day.date)}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          {day.weather ? <DayWeatherChip weather={day.weather} /> : null}

          <Typography
            variant="body2"
            color="text.secondary"
            // روی گوشی این خط زیر تیتر می‌نشیند؛ ریزتر، تا سرصفحهٔ روز از خودِ
            // برنامه پرصداتر نشود.
            sx={{ fontSize: { xs: '0.74rem', sm: '0.875rem' } }}
          >
            {/* «·» جداکنندهٔ عمدی است: دو رشتهٔ رقمی چسبیده در متن راست‌به‌چپ در هم
                ادغام می‌شوند و «۲۱۰ کیلومتر» کنار «۳ ساعت» بد خوانده می‌شود. */}
            شب در {cityName} · {faNum(Math.round(day.kilometers))} کیلومتر ·{' '}
            {duration(day.drivingMinutes)} رانندگی · {toman(day.cost)}
          </Typography>
        </Stack>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {day.blocks.length === 0 ? (
        <Typography color="text.secondary">برای این روز برنامه‌ای ساخته نشد.</Typography>
      ) : (
        <Stack ref={trailRef} spacing={0} sx={{ position: 'relative' }}>
          {/*
            جادهٔ روز. تا پیش از این یک `::before` نقطه‌چین ساکن بود؛ حالا
            لایه‌ای است که اسکرولِ شما آن را می‌پیماید. مرکزش همان دو عدد
            قبلی است: دسکتاپ ۸۴ = ستون ساعت (۵۲) + فاصله (۱۶) + نصف حباب
            (۱۷) − ۱، و گوشی ۱۶ = نصف حباب − ۱ (آن‌جا ساعت کنار عنوان است).
          */}
          <RoadTrail />
          {day.blocks.map((block, index) => {
            // مقصدِ ناوبری: خود توقف اگر مختصات دارد؛ برای بلوک رانندگی،
            // نخستین توقفِ مختصات‌دارِ بعدی — همان جایی که واقعاً می‌رانید.
            const destinationBlock =
              block.poiId != null
                ? block
                : block.kind === 'Drive'
                  ? day.blocks.slice(index + 1).find((next) => next.poiId != null)
                  : undefined
            const located =
              destinationBlock?.poiId != null ? locate?.(destinationBlock.poiId) : undefined
            const navTarget: NavPoint | undefined =
              located === undefined ? undefined : { ...located, name: destinationBlock?.title ?? '' }

            return (
              <BlockRow
                key={`${block.startsAt}-${index}`}
                block={block}
                day={day.index}
                {...(navTarget ? { navTarget } : {})}
                {...(actions ? { actions } : {})}
              />
            )
          })}
        </Stack>
      )}
    </Paper>
  )
}

function BlockRow({
  block,
  day,
  navTarget,
  actions,
}: {
  block: PlanBlock
  day: number
  navTarget?: NavPoint
  actions?: DayEditActions
}) {
  const theme = useTheme()
  const Icon = BLOCK_ICON[block.kind]
  const editable = actions !== undefined && block.kind === 'Visit' && block.poiId != null

  const kindColor: Record<PlanBlock['kind'], string> = {
    Drive: theme.palette.text.secondary,
    Visit: theme.palette.primary.main,
    Meal: theme.palette.secondary.main,
    Rest: theme.palette.success.main,
    Lodging: theme.palette.info.main,
    Refuel: theme.palette.warning.main,
  }
  const color = kindColor[block.kind]

  return (
    <Stack direction="row" spacing={{ xs: 1.5, sm: 2 }} sx={{ alignItems: 'flex-start', py: 1 }}>
      {/* ستون ساعت فقط از sm به بالا: روی گوشی این ستون + حباب نصف عرض را
          می‌خورد و چیپ‌ها تک‌ستونه زیر هم می‌ریختند؛ آن‌جا ساعت کنار عنوان
          می‌نشیند و کل عرض به محتوا می‌رسد. */}
      <Typography
        variant="body2"
        color="text.secondary"
        // عرض ثابت تا ساعت‌ها زیر هم بنشینند؛ `tabular-nums` تا ارقام هم‌عرض
        // شوند و ستون نلرزد.
        sx={{
          minWidth: 52,
          fontVariantNumeric: 'tabular-nums',
          pt: 0.25,
          display: { xs: 'none', sm: 'block' },
        }}
      >
        {toFa(block.startsAt)}
      </Typography>

      {/* حباب رنگی: ستون آیکون‌ها خودش خط زمان می‌شود و نوع هر توقف بی‌خواندن
          متن معلوم است. پس‌زمینهٔ دولایه (کاغذ + رنگ‌مایه) حباب را کدر می‌کند
          تا خط سفرِ پشتش از میانش رد نشود. */}
      <Box
        className="lt-stop"
        sx={{
          width: 34,
          height: 34,
          borderRadius: '11px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
          color,
          backgroundColor: 'background.paper',
          backgroundImage: `linear-gradient(${alpha(color, block.kind === 'Drive' ? 0.08 : 0.13)}, ${alpha(
            color,
            block.kind === 'Drive' ? 0.08 : 0.13,
          )})`,
        }}
      >
        <Icon sx={{ fontSize: 19 }} />
      </Box>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}
        >
          <Typography variant="body2" sx={{ fontWeight: block.kind === 'Visit' ? 600 : 400 }}>
            {block.title}
          </Typography>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0,
              display: { xs: 'block', sm: 'none' },
            }}
          >
            {toFa(block.startsAt)}
          </Typography>
        </Stack>

        {/* یک خطِ متنیِ آرام به‌جای ردیف چیپ‌های قاب‌دار: سه قاب در هر توقف،
            در روزِ هفت‌توقفه یعنی بیست‌ویک جعبهٔ کوچک — شلوغیِ بی‌اطلاعات.
            همان داده‌ها، بی‌قاب؛ فقط هزینه رنگ می‌گیرد چون تصمیم‌سازِ واقعی است. */}
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 0.25 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontVariantNumeric: 'tabular-nums', flexGrow: 1, minWidth: 0 }}
          >
            {duration(block.durationMinutes)}
            {block.kilometers != null ? ` · ${faNum(Math.round(block.kilometers))} کیلومتر` : null}
            {block.cost > 0 ? (
              <>
                {' · '}
                <Box component="span" sx={{ color: 'secondary.main', fontWeight: 700 }}>
                  {toman(block.cost)}
                </Box>
              </>
            ) : null}
          </Typography>

          {navTarget !== undefined ? (
            <Box component="span" className="no-print" sx={{ my: -0.75 }}>
              <NavigateButton destination={navTarget} />
            </Box>
          ) : null}

          {editable ? (
            <Box component="span" className="no-print" sx={{ my: -0.75 }}>
              <RowMenu block={block} day={day} actions={actions} />
            </Box>
          ) : null}
        </Stack>

        {block.note ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            {block.note}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  )
}

/**
 * منوی سه‌نقطهٔ توقف — جابه‌جایی بین روزها و حذف.
 *
 * <p>این سه کنش قبلاً سه دکمهٔ همیشه‌پیدا زیر هر بازدید بودند؛ در روزِ
 * پنج‌بازدیده یعنی پانزده دکمه که ۹۹٪ وقت‌ها به هیچ‌کدامشان دست نمی‌خورد.
 * کنشِ گاه‌به‌گاه پشت منو می‌رود، صفحه مال محتواست.</p>
 *
 * <p>جابه‌جایی و حذف همچنان ورودی سفر را عوض می‌کنند و برنامه از نو ساخته
 * می‌شود — نه اینکه خروجی دستکاری شود؛ وگرنه مسافت و ساعت و هزینه با آنچه
 * روی صفحه است نمی‌خواند.</p>
 */
function RowMenu({
  block,
  day,
  actions,
}: {
  block: PlanBlock
  day: number
  actions: DayEditActions
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  const run = (action: () => void) => {
    setAnchor(null)
    action()
  }

  return (
    <>
      <Tooltip title="جابه‌جایی و حذف">
        <IconButton
          size="small"
          aria-label={`گزینه‌های ${block.title}`}
          onClick={(event) => setAnchor(event.currentTarget)}
        >
          <MoreIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)}>
        <MenuItem disabled={day <= 1} onClick={() => run(() => actions.onMove(block.poiId!, day - 1))}>
          <ListItemIcon>
            <ArrowUpIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>یک روز زودتر</ListItemText>
        </MenuItem>

        <MenuItem
          disabled={day >= actions.totalDays}
          onClick={() => run(() => actions.onMove(block.poiId!, day + 1))}
        >
          <ListItemIcon>
            <ArrowDownIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>یک روز دیرتر</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => run(() => actions.onRemove(block.poiId!))}>
          <ListItemIcon>
            <BanIcon sx={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText>حذف از برنامه</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}

import { useMemo, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

import { CalendarIcon } from './icons'
import {
  JALALI_MONTHS,
  fromISODate,
  toGregorian,
  toISODate,
  toJalali,
  toFa,
  type JalaliDate,
} from '../lib/jalali'
import { formatJalaliFromIso } from '../lib/jalaliDisplay'

/**
 * فیلد تاریخ شمسی — جایگزین `type="date"` مرورگر.
 *
 * <p>تقویم بومی مرورگر میلادی است و برای کاربر ایرانی یعنی «تبدیل ذهنی در هر
 * انتخاب». این فیلد ظاهرش، تقویمش و ارقامش شمسی است؛ ولی مقداری که به فرم
 * می‌دهد همان ISO میلادی می‌ماند — چون قرارداد بک‌اند و اسکیما ISO است و
 * تبدیل، کارِ لایهٔ نمایش است نه دادهٔ ذخیره‌شده.</p>
 *
 * <p>هفته از شنبه شروع می‌شود و ستون جمعه با رنگ تعطیلی جدا شده — همان شکلی
 * که هر تقویم دیواری ایرانی دارد؛ آشناییِ چیدمان، خودِ راهنماست.</p>
 */
export function JalaliDateField({
  value,
  onChange,
  label,
  error,
  helperText,
}: {
  /** تاریخ ISO میلادی (`YYYY-MM-DD`) — همان قرارداد فرم و بک‌اند. */
  value: string
  onChange: (iso: string) => void
  label: string
  error?: boolean
  helperText?: string
}) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const selected = useMemo(() => {
    const date = fromISODate(value)

    return Number.isNaN(date.getTime()) ? null : toJalali(date)
  }, [value])

  return (
    <>
      <TextField
        ref={anchorRef}
        label={label}
        value={formatJalaliFromIso(value, false)}
        onClick={() => setOpen(true)}
        // فقط‌خواندنی، نه غیرفعال: تایپ آزادِ تاریخ شمسی یعنی اعتبارسنجیِ
        // رشته‌های نیمه‌کاره؛ تقویم همان کار را بی‌ابهام می‌کند.
        slotProps={{
          input: {
            readOnly: true,
            sx: { cursor: 'pointer', '& input': { cursor: 'pointer' } },
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setOpen(true)}
                  aria-label={`انتخاب ${label}`}
                  edge="end"
                >
                  <CalendarIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
        error={error ?? false}
        helperText={helperText ?? ' '}
      />

      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <JalaliCalendar
          selected={selected}
          onPick={(picked) => {
            onChange(toISODate(toGregorian(picked.jy, picked.jm, picked.jd)))
            setOpen(false)
          }}
        />
      </Popover>
    </>
  )
}

/** روزهای هر ماه شمسی؛ اسفند در سال کبیسه ۳۰ روز است. */
function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31
  if (jm <= 11) return 30

  return isJalaliLeap(jy) ? 30 : 29
}

function isJalaliLeap(jy: number): boolean {
  // کبیسه یعنی اسفندِ ۳۰ روزه: اول فروردینِ سال بعد، ۳۶۶ روز بعدِ اول فروردین
  // همین سال است. از خود تبدیل موجود استفاده می‌شود تا دو الگوریتم موازی نداشته
  // باشیم که روزی با هم اختلاف پیدا کنند.
  const first = toGregorian(jy, 1, 1).getTime()
  const next = toGregorian(jy + 1, 1, 1).getTime()

  return Math.round((next - first) / 86_400_000) === 366
}

/** ستون شنبه‌اول برای یک تاریخ میلادی (شنبه=۰ … جمعه=۶). */
function saturdayFirstColumn(date: Date): number {
  return (date.getDay() + 1) % 7
}

const WEEKDAY_INITIALS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

function JalaliCalendar({
  selected,
  onPick,
}: {
  selected: JalaliDate | null
  onPick: (picked: JalaliDate) => void
}) {
  const today = toJalali(new Date())
  const [view, setView] = useState<{ jy: number; jm: number }>(() => ({
    jy: (selected ?? today).jy,
    jm: (selected ?? today).jm,
  }))

  const shift = (delta: number) => {
    setView(({ jy, jm }) => {
      const index = jy * 12 + (jm - 1) + delta

      return { jy: Math.floor(index / 12), jm: (index % 12) + 1 }
    })
  }

  const length = jalaliMonthLength(view.jy, view.jm)
  const offset = saturdayFirstColumn(toGregorian(view.jy, view.jm, 1))

  const isToday = (jd: number) => view.jy === today.jy && view.jm === today.jm && jd === today.jd
  const isSelected = (jd: number) =>
    selected !== null && view.jy === selected.jy && view.jm === selected.jm && jd === selected.jd

  return (
    <Box sx={{ p: 2, width: 292 }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        {/* در چیدمان راست‌به‌چپ، «ماه قبل» یعنی حرکت به راست. */}
        <IconButton size="small" onClick={() => shift(-1)} aria-label="ماه قبل">
          <ArrowForwardIcon fontSize="small" />
        </IconButton>

        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {JALALI_MONTHS[view.jm - 1]} {toFa(view.jy)}
        </Typography>

        <IconButton size="small" onClick={() => shift(1)} aria-label="ماه بعد">
          <ArrowBackIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.25 }}>
        {WEEKDAY_INITIALS.map((initial, column) => (
          <Typography
            key={initial}
            variant="caption"
            sx={{
              textAlign: 'center',
              pb: 0.5,
              fontWeight: 700,
              color: column === 6 ? 'error.main' : 'text.secondary',
            }}
          >
            {initial}
          </Typography>
        ))}

        {Array.from({ length: offset }, (_, i) => (
          <Box key={`blank-${i}`} />
        ))}

        {Array.from({ length }, (_, i) => {
          const jd = i + 1
          const column = (offset + i) % 7
          const chosen = isSelected(jd)

          return (
            <Box
              key={jd}
              component="button"
              type="button"
              onClick={() => onPick({ jy: view.jy, jm: view.jm, jd })}
              aria-label={`${toFa(jd)} ${JALALI_MONTHS[view.jm - 1]} ${toFa(view.jy)}`}
              sx={(theme) => ({
                border: 'none',
                font: 'inherit',
                width: 36,
                height: 36,
                borderRadius: '10px',
                cursor: 'pointer',
                fontVariantNumeric: 'tabular-nums',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: chosen ? '#fff' : column === 6 ? 'error.main' : 'text.primary',
                bgcolor: chosen ? 'primary.main' : 'transparent',
                outline: isToday(jd) && !chosen ? `1.5px solid ${theme.palette.primary.main}` : 'none',
                outlineOffset: '-1.5px',
                '&:hover': {
                  bgcolor: chosen ? 'primary.main' : alpha(theme.palette.primary.main, 0.12),
                },
              })}
            >
              {toFa(jd)}
            </Box>
          )
        })}
      </Box>

      <Stack direction="row" sx={{ justifyContent: 'flex-start', mt: 1 }}>
        <Button size="small" onClick={() => onPick(today)}>
          امروز
        </Button>
      </Stack>
    </Box>
  )
}

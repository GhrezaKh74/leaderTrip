import { useEffect, useRef, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Stepper from '@mui/material/Stepper'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import Skeleton from '@mui/material/Skeleton'
import { alpha } from '@mui/material/styles'
import type { StepIconProps } from '@mui/material/StepIcon'

import {
  CarIcon,
  CheckIcon,
  PeopleIcon,
  PinPointIcon,
  SlidersIcon,
  UploadIcon,
  VisitPinIcon,
} from '../../components/icons'
import { heroGradient } from '../../theme/tokens'
import { drawPath, riseIn } from '../../lib/motion'

import { useGeneratePlan, useReferenceData } from '../../api/queries'
import type { TripPlan } from '../../api/schemas'
import { DEFAULT_TRIP, parseTripForm, tripFormSchema, type TripForm } from './tripSchema'
import { OriginStep } from './steps/OriginStep'
import { TravelersStep } from './steps/TravelersStep'
import { VehicleStep } from './steps/VehicleStep'
import { StyleStep } from './steps/StyleStep'
import { PoiStep } from './steps/PoiStep'
import { readTripFile } from '../plan/sharing'

/**
 * فیلدهای هر گام — برای اعتبارسنجی جزئی هنگام «بعدی».
 *
 * بدون این، دکمهٔ «بعدی» یا هیچ چیزی را نمی‌سنجد (و کاربر تا انتها می‌رود و
 * بعد می‌فهمد گام اول ناقص بوده)، یا کل فرم را می‌سنجد (و در گام اول برای
 * فیلدهایی خطا می‌دهد که هنوز ندیده است).
 */
const STEPS: { label: string; fields: (keyof TripForm)[] }[] = [
  { label: 'مبدأ و مقصد', fields: ['originCityId', 'destinationCityId', 'destinationMode', 'startDate', 'days', 'radiusKm', 'budgetToman'] },
  { label: 'همسفران', fields: ['travelers'] },
  { label: 'خودرو', fields: ['vehicleId', 'vehicleCount', 'maxDrivingHoursPerDay', 'dayStartHour', 'dayEndHour'] },
  {
    label: 'سبک سفر',
    fields: [
      'style', 'lodging', 'interests', 'roundTrip',
      'dayPace', 'checkInFirst', 'middayRest', 'eveningProgram', 'lunchStyle', 'firstDayStartHour',
    ],
  },
  { label: 'جاذبه‌ها', fields: ['pinnedPoiIds', 'excludedPoiIds'] },
]

const STEP_ICONS = [PinPointIcon, PeopleIcon, CarIcon, SlidersIcon, VisitPinIcon] as const

/**
 * نشان‌گر گام ویزارد — کاشی گرد با آیکون همان گام.
 *
 * <p>گامِ فعال و گام‌های انجام‌شده گرادیان برند را می‌گیرند؛ انجام‌شده تیک
 * می‌خورد. عددِ خالی پیش‌فرض MUI هیچ‌چیزی دربارهٔ محتوای گام نمی‌گوید — آیکون
 * می‌گوید «این گام دربارهٔ چیست»، پیش از آنکه کاربر واردش شود.</p>
 */
function BrandStepIcon({ active, completed, icon }: StepIconProps) {
  const Icon = STEP_ICONS[Number(icon) - 1] ?? PinPointIcon

  return (
    <Box
      sx={(theme) => ({
        width: 38,
        height: 38,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all .2s ease',
        // فلت: گامِ فعال فیروزهٔ تخت با هالهٔ بسیار ظریف؛ انجام‌شده سطحِ
        // کم‌رنگ فیروزه با تیک؛ آینده فقط خطِ خاکستری. یک رنگ، سه شدت.
        ...(active === true
          ? {
              backgroundColor: 'primary.main',
              color: mode(theme) === 'dark' ? '#08252b' : '#fff',
              boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.16)}, 0 0 20px ${alpha(
                theme.palette.primary.main,
                0.35,
              )}`,
            }
          : completed === true
            ? {
                backgroundColor: alpha(theme.palette.primary.main, 0.14),
                color: 'primary.main',
              }
            : {
                backgroundColor: 'transparent',
                color: 'text.disabled',
                border: '1.5px solid',
                borderColor: 'divider',
              }),
      })}
    >
      {completed === true ? <CheckIcon sx={{ fontSize: 19 }} /> : <Icon sx={{ fontSize: 21 }} />}
    </Box>
  )
}

/** حالت تم از خود شیء تم — بدون هوک اضافه در آیکون گام. */
function mode(theme: { palette: { mode: string } }): string {
  return theme.palette.mode
}

/**
 * صحنهٔ مسیر در سرصفحهٔ قهرمان — جاده‌ای که جلوی چشم «رانده می‌شود».
 *
 * <p>خط از راست (مبدأ، جهت خواندن فارسی) کشیده می‌شود و به سنجاق مقصد در چپ
 * می‌رسد؛ توقف‌ها در طول راه روشن می‌شوند. این همان قصهٔ خود اپ است: مسیر،
 * توقف‌ها، مقصد — پیش از آنکه کاربر کلمه‌ای خوانده باشد.</p>
 *
 * <p>ترسیم با anime.js است و پشت prefers-reduced-motion گارد شده
 * (`lib/motion.ts`)؛ بدون حرکت، صحنه ثابت و کامل دیده می‌شود.</p>
 */
function HeroRoute() {
  const routeRef = useRef<SVGPathElement>(null)
  const stopsRef = useRef<SVGGElement>(null)

  useEffect(() => {
    if (routeRef.current) drawPath(routeRef.current, { duration: 2200, delay: 250 })
    if (stopsRef.current) riseIn(Array.from(stopsRef.current.children), { step: 420, start: 650, from: 6 })
  }, [])

  return (
    <Box
      component="svg"
      viewBox="0 0 600 170"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      <path
        ref={routeRef}
        d="M 618 34 C 500 148, 430 -12, 310 84 S 150 176, 34 100"
        fill="none"
        stroke="rgba(255,255,255,0.38)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <g ref={stopsRef} fill="#fff">
        {/* توقف‌های میانی — در بازه‌ای که برشِ موبایل هم نگهشان می‌دارد. */}
        <circle cx="380" cy="150" r="4" opacity="0.7" />
        <circle cx="230" cy="152" r="4" opacity="0.7" />
      </g>
    </Box>
  )
}

const STORAGE_KEY = 'leadertrip.trip.v2'

function readSavedTrip(): TripForm {
  if (typeof localStorage === 'undefined') return DEFAULT_TRIP

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return DEFAULT_TRIP

  // ورودی ذخیره‌شده از نسخهٔ قدیمی‌تر اپ می‌تواند شکل دیگری داشته باشد. اعتماد
  // به آن یعنی فرمی که با یک خطای عجیب سفید می‌شود؛ اعتبارسنجی یعنی برگشت آرام
  // به پیش‌فرض.
  return parseTripForm(JSON.parse(raw)) ?? DEFAULT_TRIP
}

export function WizardPage({
  initial,
  onPlanReady,
}: {
  /** ورودی آمده از لینک اشتراکی، اگر بود. */
  initial?: TripForm | null
  onPlanReady: (plan: TripPlan, input: TripForm) => void
}) {
  const [activeStep, setActiveStep] = useState(0)
  const [importError, setImportError] = useState<string | null>(null)
  const reference = useReferenceData()

  const form = useForm<TripForm>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: initial ?? readSavedTrip(),
    mode: 'onBlur',
  })

  const generate = useGeneratePlan()

  const isLast = activeStep === STEPS.length - 1

  const next = async () => {
    const step = STEPS[activeStep]
    if (!step) return

    const valid = await form.trigger(step.fields)
    if (valid) setActiveStep((current) => current + 1)
  }

  const submit = form.handleSubmit(async (values) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values))
    }

    const plan = await generate.mutateAsync(values)
    onPlanReady(plan, values)
  })

  if (reference.isPending) {
    // اسکلتِ همان چیزی که می‌آید، نه اسپینر: اسپینر می‌گوید «صبر کن»، اسکلت
    // می‌گوید «این‌جا قرار است چه شکلی شود» — و پرش چیدمان هم ندارد.
    return (
      <Stack spacing={3}>
        <Skeleton variant="rounded" height={118} sx={{ borderRadius: 4 }} />
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'center' }}>
          {STEP_ICONS.map((_, index) => (
            <Skeleton key={index} variant="rounded" width={38} height={38} sx={{ borderRadius: '12px' }} />
          ))}
        </Stack>
        <Skeleton variant="rounded" height={280} sx={{ borderRadius: 4 }} />
      </Stack>
    )
  }

  if (reference.isError) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => void reference.refetch()}>
            تلاش دوباره
          </Button>
        }
      >
        {reference.error.message}
      </Alert>
    )
  }

  const { cities, vehicles, prices } = reference.data

  return (
    <FormProvider {...form}>
      <Stack spacing={3} component="form" onSubmit={submit} noValidate>
        {/* سرصفحهٔ قهرمان — فلت و مینیمال: گرادیان سرمه‌ای→فیروزه‌ای، فقط
            تصویرسازی هندسیِ مسیر (جاده، ماشین کوچک، سنجاق مقصد). نقش تزئینی
            عمداً حذف شد: چیزی که قصه نگوید، شلوغی است. */}
        <Box
          sx={{
            borderRadius: '20px',
            p: { xs: 3, sm: 4.5 },
            minHeight: { xs: 156, sm: 185 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            color: '#fff',
            background: heroGradient,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 10px 30px -16px rgba(12, 125, 132, 0.45)',
          }}
        >
          <HeroRoute />

          {/* قصهٔ سفر در نوار پایین، راست‌به‌چپ: ماشین → توقف‌ها → مقصد. */}
          <Box
            aria-hidden
            sx={{ position: 'absolute', bottom: 10, insetInlineStart: '9%', color: '#fff', opacity: 0.92, display: 'flex' }}
          >
            <CarIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              bottom: 14,
              insetInlineEnd: '7%',
              width: 16,
              height: 16,
              borderRadius: '50%',
              border: '2.5px solid #fff',
              opacity: 0.95,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&::after': {
                content: '""',
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: '#fff',
              },
            }}
          />

          <Typography variant="h1" component="h2" className="lt-rise" sx={{ position: 'relative' }}>
            برنامهٔ سفرت را بساز
          </Typography>
          <Typography
            variant="body2"
            className="lt-rise"
            sx={{
              position: 'relative',
              opacity: 0.88,
              mt: 1,
              maxWidth: 440,
              lineHeight: 1.9,
              animationDelay: '.12s',
            }}
          >
            مسیر، هزینه، برنامه و زمان‌بندی سفرت را متناسب با خودرو، همسفرها و
            بودجه تنظیم کن.
          </Typography>
        </Box>

        <Stepper
          activeStep={activeStep}
          alternativeLabel
          sx={{
            // نشان‌گرِ بزرگ‌تر یعنی خط اتصال باید پایین‌تر بنشیند، وگرنه از
            // بالای کاشی‌ها رد می‌شود.
            '& .MuiStepConnector-root': { top: 19 },
            '& .MuiStepConnector-line': { borderColor: 'divider', borderTopWidth: 1 },
            '& .Mui-active .MuiStepConnector-line, & .Mui-completed .MuiStepConnector-line': {
              borderColor: (theme) => alpha(theme.palette.primary.main, 0.5),
            },
          }}
        >
          {STEPS.map((step) => (
            <Step key={step.label}>
              <StepLabel slots={{ stepIcon: BrandStepIcon }}>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Box hidden={activeStep !== 0}>
            <OriginStep cities={cities} />
          </Box>
          <Box hidden={activeStep !== 1}>
            <TravelersStep />
          </Box>
          <Box hidden={activeStep !== 2}>
            <VehicleStep vehicles={vehicles} />
          </Box>
          <Box hidden={activeStep !== 3}>
            <StyleStep />
          </Box>
          <Box hidden={activeStep !== 4}>
            <PoiStep cities={cities} />
          </Box>
        </Paper>

        {generate.isError ? <Alert severity="error">{generate.error.message}</Alert> : null}
        {importError ? <Alert severity="warning">{importError}</Alert> : null}

        <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
          {/*
            `type="button"` صریح لازم است: دکمهٔ بدون نوع، داخل `<form>` پیش‌فرضاً
            دکمهٔ ارسال است. بدون آن، «قبلی» و «بعدی» فرم را می‌فرستادند و کاربر
            از گام اول یک‌راست به برنامهٔ ساخته‌شده می‌رسید — که چون مقادیر پیش‌فرض
            معتبرند، هیچ خطایی هم نمی‌داد و بی‌صدا کل ویزارد را دور می‌زد.
          */}
          <Button
            type="button"
            onClick={() => setActiveStep((current) => current - 1)}
            disabled={activeStep === 0}
            startIcon={<ArrowForwardIcon />}
          >
            قبلی
          </Button>

          {/*
            `key` این دو دکمه عمداً فرق دارد.

            بدون آن، React هر دو را یک عنصر می‌بیند (همان جایگاه، همان تگ) و
            به‌جای ساختن دکمهٔ تازه، فقط صفت‌های همان `<button>` را عوض می‌کند.
            نتیجه‌اش یک باگ واقعی بود که فقط در مرورگر دیده شد: کلیک روی «بعدی»
            بین `mousedown` و `mouseup` گام را جلو می‌برد، `type` همان عنصر از
            `button` به `submit` تغییر می‌کرد، و `mouseup` روی دکمه‌ای می‌نشست که
            حالا دکمهٔ ارسال بود — کاربر با یک کلیک از گام سوم مستقیم به برنامهٔ
            ساخته‌شده می‌رسید و گام «سبک سفر» را هرگز نمی‌دید.
          */}
          {isLast ? (
            <Button
              key="submit"
              type="submit"
              variant="contained"
              size="large"
              disabled={generate.isPending}
              startIcon={generate.isPending ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {generate.isPending ? 'در حال ساختن برنامه…' : 'ساخت برنامه'}
            </Button>
          ) : (
            <Button
              key="next"
              type="button"
              onClick={() => void next()}
              variant="contained"
              endIcon={<ArrowBackIcon />}
            >
              بعدی
            </Button>
          )}
        </Stack>

        <Stack
          direction="row"
          spacing={2}
          sx={{ justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}
        >
          <Button component="label" size="small" startIcon={<UploadIcon />}>
            بارگذاری سفر از فایل
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={async (event) => {
                const file = event.target.files?.[0]

                if (file === undefined) return

                const imported = await readTripFile(file)

                // فایل خراب یا از نسخهٔ ناسازگار، بی‌صدا رد نمی‌شود: کاربری که
                // فایل داده و هیچ اتفاقی نیفتاده، فکر می‌کند اپ خراب است.
                if (imported === null) {
                  setImportError('فایل خوانده نشد یا با نسخهٔ فعلی سازگار نیست.')
                } else {
                  setImportError(null)
                  form.reset(imported)
                  setActiveStep(0)
                }

                event.target.value = ''
              }}
            />
          </Button>

          <Typography variant="caption" color="text.secondary">
            قیمت‌های پایه: به‌روزرسانی {prices.updatedAt} — همهٔ ارقام تخمینی‌اند.
          </Typography>
        </Stack>
      </Stack>
    </FormProvider>
  )
}

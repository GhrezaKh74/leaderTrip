import { useState } from 'react'
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
import UploadIcon from '@mui/icons-material/UploadFileOutlined'

import { useGeneratePlan, useReferenceData } from '../../api/queries'
import type { TripPlan } from '../../api/schemas'
import { DEFAULT_TRIP, tripFormSchema, type TripForm } from './tripSchema'
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
  { label: 'مبدأ و زمان', fields: ['originCityId', 'startDate', 'days', 'radiusKm', 'budgetToman'] },
  { label: 'همسفران', fields: ['travelers'] },
  { label: 'خودرو', fields: ['vehicleId', 'vehicleCount', 'maxDrivingHoursPerDay', 'dayStartHour', 'dayEndHour'] },
  { label: 'سبک سفر', fields: ['style', 'lodging', 'interests', 'roundTrip'] },
  { label: 'جاذبه‌ها', fields: ['pinnedPoiIds', 'excludedPoiIds'] },
]

const STORAGE_KEY = 'leadertrip.trip.v2'

function readSavedTrip(): TripForm {
  if (typeof localStorage === 'undefined') return DEFAULT_TRIP

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return DEFAULT_TRIP

  // ورودی ذخیره‌شده از نسخهٔ قدیمی‌تر اپ می‌تواند شکل دیگری داشته باشد. اعتماد
  // به آن یعنی فرمی که با یک خطای عجیب سفید می‌شود؛ اعتبارسنجی یعنی برگشت آرام
  // به پیش‌فرض.
  const parsed = tripFormSchema.safeParse(JSON.parse(raw))

  return parsed.success ? parsed.data : DEFAULT_TRIP
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
    return (
      <Stack spacing={2} sx={{ py: 8, alignItems: 'center' }}>
        <CircularProgress />
        <Typography color="text.secondary">در حال گرفتن شهرها و قیمت‌ها…</Typography>
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
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEPS.map((step) => (
            <Step key={step.label}>
              <StepLabel>{step.label}</StepLabel>
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

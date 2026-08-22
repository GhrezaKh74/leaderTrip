import { useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

import { JalaliDateField } from '../../../components/JalaliDateField'
import { LocateIcon } from '../../../components/icons'
import { NumberField } from '../../../components/NumberField'
import Typography from '@mui/material/Typography'
import { currentPosition, nearestCity } from '../../../lib/geo'

import type { City } from '../../../api/schemas'
import type { TripForm } from '../tripSchema'
import { faNum, tomanShort } from '../../../lib/format'
import { formatJalaliFromIso } from '../../../lib/jalaliDisplay'

export function OriginStep({ cities }: { cities: City[] }) {
  const { control, formState, watch, setValue } = useFormContext<TripForm>()
  const errors = formState.errors

  const destinationCityId = watch('destinationCityId')
  const hasDestination = destinationCityId !== null && destinationCityId !== ''

  const [locating, setLocating] = useState(false)
  const [locateNote, setLocateNote] = useState<string | null>(null)

  /**
   * مبدأ از موقعیت فعلی — با کلیک صریح کاربر، نه خودکار هنگام بازشدن صفحه:
   * پنجرهٔ اجازهٔ موقعیت بی‌مقدمه، اولین تجربهٔ کاربر با اپ را «درخواست
   * دسترسی» می‌کند. مختصات هم مرورگر می‌ماند؛ فقط شناسهٔ نزدیک‌ترین شهر
   * وارد فرم می‌شود.
   */
  const locateMe = async () => {
    setLocating(true)
    setLocateNote(null)

    try {
      const { lat, lng } = await currentPosition()
      const found = nearestCity(cities, lat, lng)

      if (found === null) {
        setLocateNote('شهری در فهرست نیست.')

        return
      }

      setValue('originCityId', found.city.id, { shouldValidate: true, shouldDirty: true })
      setLocateNote(
        found.distanceKm > 80
          ? `نزدیک‌ترین شهرِ فهرست: ${found.city.name} (حدود ${faNum(Math.round(found.distanceKm))} کیلومتر با شما فاصله دارد)`
          : `مبدأ شد: ${found.city.name}`,
      )
    } catch (error) {
      setLocateNote(error instanceof Error ? error.message : 'موقعیت پیدا نشد؛ شهر را دستی انتخاب کنید.')
    } finally {
      setLocating(false)
    }
  }

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="originCityId"
            control={control}
            render={({ field }) => (
              <Autocomplete
                options={cities}
                value={cities.find((c) => c.id === field.value) ?? null}
                onChange={(_, city) => field.onChange(city?.id ?? '')}
                getOptionLabel={(city) => `${city.name} — ${city.province}`}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                noOptionsText="شهری پیدا نشد"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="شهر مبدأ"
                    error={Boolean(errors.originCityId)}
                    helperText={
                      errors.originCityId?.message ??
                      locateNote ??
                      (hasDestination ? 'سفر از این‌جا شروع می‌شود.' : 'سفر از این‌جا شروع و تمام می‌شود.')
                    }
                  />
                )}
              />
            )}
          />

          <Button
            size="small"
            startIcon={locating ? <CircularProgress size={14} /> : <LocateIcon sx={{ fontSize: 17 }} />}
            onClick={() => void locateMe()}
            disabled={locating}
            sx={{ mt: 0.5, alignSelf: 'flex-start' }}
          >
            {locating ? 'در حال یافتن موقعیت…' : 'انتخاب از موقعیت فعلی'}
          </Button>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="destinationCityId"
            control={control}
            render={({ field }) => (
              <Autocomplete
                options={cities.filter((city) => city.id !== watch('originCityId'))}
                value={cities.find((c) => c.id === field.value) ?? null}
                onChange={(_, city) => field.onChange(city?.id ?? null)}
                getOptionLabel={(city) => `${city.name} — ${city.province}`}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                noOptionsText="شهری پیدا نشد"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="مقصد (اختیاری)"
                    error={Boolean(errors.destinationCityId)}
                    // مقصدِ خالی رفتار همیشگی است؛ مقصدِ پر، سفر را یک‌سویه و
                    // مسیرمحور می‌کند — این تفاوت باید پیش از انتخاب معلوم باشد.
                    helperText={
                      errors.destinationCityId?.message ??
                      (hasDestination
                        ? 'شهری که سفر برایش برنامه‌ریزی می‌شود.'
                        : 'خالی یعنی سفر حلقه‌ای دور مبدأ.')
                    }
                  />
                )}
              />
            )}
          />
        </Grid>

        {hasDestination ? (
          <Grid size={12}>
            <Controller
              name="destinationMode"
              control={control}
              render={({ field }) => (
                <Stack spacing={0.75}>
                  <Typography variant="body2" color="text.secondary">
                    هدف از این مقصد چیست؟
                  </Typography>

                  <ToggleButtonGroup
                    exclusive
                    color="primary"
                    value={field.value}
                    onChange={(_, next: 'Mixed' | 'Stay' | 'Corridor' | null) => {
                      if (next !== null) field.onChange(next)
                    }}
                    size="small"
                    sx={{
                      width: { xs: '100%', sm: 'fit-content' },
                      '& .MuiToggleButton-root': { flex: { xs: 1, sm: 'initial' }, whiteSpace: 'nowrap' },
                    }}
                  >
                    <ToggleButton value="Mixed">ترکیبی</ToggleButton>
                    <ToggleButton value="Stay">فقط مقصد</ToggleButton>
                    <ToggleButton value="Corridor">گشت در مسیر</ToggleButton>
                  </ToggleButtonGroup>

                  <Typography variant="caption" color="text.secondary">
                    {field.value === 'Mixed'
                      ? 'اقامت دور مقصد + گشتِ سرِ راه: هم توقف‌های بین راه، هم شب‌ها در مقصد. زمان رفت‌وبرگشت جزو روزهای سفر حساب می‌شود.'
                      : field.value === 'Stay'
                        ? 'یک‌راست تا مقصد: راه فقط راه است و همهٔ گشت دور مقصد می‌گذرد.'
                        : 'خودِ راه هدف است: جاذبه‌ها در طول مسیر و روز آخر رسیدن به مقصد — برگشت، خودش سفری است جدا.'}
                  </Typography>
                </Stack>
              )}
            />
          </Grid>
        ) : null}

        <Grid size={{ xs: 12, sm: 3 }}>
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <JalaliDateField
                value={field.value}
                onChange={field.onChange}
                label="تاریخ حرکت"
                error={Boolean(errors.startDate)}
                // فیلد و تقویمش شمسی‌اند؛ راهنمای زیرش روز هفته را هم می‌گوید.
                helperText={errors.startDate?.message ?? formatJalaliFromIso(field.value)}
              />
            )}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 3 }}>
          <Controller
            name="days"
            control={control}
            render={({ field }) => (
              <NumberField
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                label="چند روز"
                min={1}
                max={30}
                error={Boolean(errors.days)}
                helperText={errors.days?.message ?? ' '}
              />
            )}
          />
        </Grid>
      </Grid>

      <Stack spacing={1}>
        <Controller
          name="radiusKm"
          control={control}
          render={({ field }) => (
            <>
              <Typography variant="body2" color="text.secondary">
                {!hasDestination
                  ? `شعاع جست‌وجو: تا ${faNum(field.value)} کیلومتر از ${
                      cities.find((c) => c.id === control._formValues.originCityId)?.name ?? 'مبدأ'
                    }`
                  : watch('destinationMode') === 'Corridor'
                    ? `پهنای راهرو: جاذبه‌ها تا ${faNum(field.value)} کیلومتر دو طرف مسیر`
                    : watch('destinationMode') === 'Mixed'
                      ? `شعاع گشت: تا ${faNum(field.value)} کیلومتر دور مقصد، به‌علاوهٔ توقف‌های سرِ راه`
                      : `شعاع گشت: تا ${faNum(field.value)} کیلومتر دور مقصد`}
              </Typography>
              <Slider
                value={field.value}
                onChange={(_, value) => field.onChange(value)}
                min={20}
                max={1200}
                step={20}
                // برچسب‌های اسلایدر عمداً لاتین نیستند، ولی مقدار `value` هست:
                // ارقام فارسی داخل محاسبه یا استایل، بی‌صدا از کار می‌افتند.
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${faNum(value)} کیلومتر`}
              />
            </>
          )}
        />
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="budgetToman"
            control={control}
            render={({ field }) => (
              <NumberField
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                label="بودجهٔ کل"
                min={0}
                step={1_000_000}
                slotProps={{
                  input: {
                    endAdornment: <InputAdornment position="end">تومان</InputAdornment>,
                  },
                }}
                error={Boolean(errors.budgetToman)}
                // خودِ ورودی عدد لاتین است و باید بماند، ولی «۵۰٬۰۰۰٬۰۰۰» را کسی
                // با نگاه نمی‌خواند؛ معادل خوانا زیرش نوشته می‌شود.
                helperText={errors.budgetToman?.message ?? tomanShort(field.value)}
              />
            )}
          />
        </Grid>
      </Grid>
    </Stack>
  )
}

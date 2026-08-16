import { Controller, useFormContext } from 'react-hook-form'
import Autocomplete from '@mui/material/Autocomplete'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'

import { JalaliDateField } from '../../../components/JalaliDateField'
import { NumberField } from '../../../components/NumberField'
import Typography from '@mui/material/Typography'

import type { City } from '../../../api/schemas'
import type { TripForm } from '../tripSchema'
import { faNum, tomanShort } from '../../../lib/format'
import { formatJalaliFromIso } from '../../../lib/jalaliDisplay'

export function OriginStep({ cities }: { cities: City[] }) {
  const { control, formState, watch } = useFormContext<TripForm>()
  const errors = formState.errors

  const destinationCityId = watch('destinationCityId')
  const hasDestination = destinationCityId !== null && destinationCityId !== ''

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
                      (hasDestination ? 'سفر از این‌جا شروع می‌شود.' : 'سفر از این‌جا شروع و تمام می‌شود.')
                    }
                  />
                )}
              />
            )}
          />
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
                        ? 'سفر یک‌سویه: جاذبه‌ها در راهروی مبدأ تا مقصد چیده می‌شوند و روز آخر به مقصد می‌رسید.'
                        : 'خالی یعنی سفر حلقه‌ای دور مبدأ.')
                    }
                  />
                )}
              />
            )}
          />
        </Grid>

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
                {hasDestination
                  ? `پهنای راهرو: جاذبه‌ها تا ${faNum(field.value)} کیلومتر دو طرف مسیر`
                  : `شعاع جست‌وجو: تا ${faNum(field.value)} کیلومتر از ${
                      cities.find((c) => c.id === control._formValues.originCityId)?.name ?? 'مبدأ'
                    }`}
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

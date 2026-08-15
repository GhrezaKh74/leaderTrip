import { Controller, useFormContext } from 'react-hook-form'
import Alert from '@mui/material/Alert'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { NumberField } from '../../../components/NumberField'
import type { Vehicle } from '../../../api/schemas'
import type { TripForm } from '../tripSchema'
import { faNum, percent } from '../../../lib/format'

const OFFROAD_NOTE: Record<Vehicle['offroad'], string> = {
  Paved: 'فقط جادهٔ آسفالت — مسیرهای خاکی پیشنهاد نمی‌شوند.',
  LightDirt: 'جادهٔ خاکی سبک قابل عبور است.',
  FullOffroad: 'مسیرهای آفرود هم در دسترس‌اند.',
}

export function VehicleStep({ vehicles }: { vehicles: Vehicle[] }) {
  const { control, watch } = useFormContext<TripForm>()

  const vehicleId = watch('vehicleId')
  const count = watch('vehicleCount')
  const travelers = watch('travelers')
  const selected = vehicles.find((v) => v.id === vehicleId)

  const capacity = selected ? selected.seats * count : 0
  const overCapacity = selected !== undefined && travelers.length > capacity

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 8 }}>
          <Controller
            name="vehicleId"
            control={control}
            render={({ field }) => (
              <TextField {...field} select label="خودرو">
                {vehicles.map((vehicle) => (
                  <MenuItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Controller
            name="vehicleCount"
            control={control}
            render={({ field }) => (
              <NumberField
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                label="تعداد خودرو"
                min={1}
                max={10}
              />
            )}
          />
        </Grid>
      </Grid>

      {selected ? (
        <Typography variant="body2" color="text.secondary">
          {faNum(selected.consumptionPer100Km, 1)} لیتر در ۱۰۰ کیلومتر ·{' '}
          {faNum(selected.seats)} صندلی در هر خودرو · {OFFROAD_NOTE[selected.offroad]}
        </Typography>
      ) : null}

      {overCapacity ? (
        // این هشدار است نه خطا: ممکن است کسی عمداً با خودروی دیگری بیاید و فقط
        // بخواهد هزینهٔ سوخت این یکی را ببیند. جلوی ادامه‌دادن گرفته نمی‌شود.
        <Alert severity="warning">
          {faNum(travelers.length)} همسفر در {faNum(capacity)} صندلی جا نمی‌شوند.
        </Alert>
      ) : null}

      <Stack spacing={1}>
        <Controller
          name="subsidizedFuelShare"
          control={control}
          render={({ field }) => (
            <>
              <Typography variant="body2" color="text.secondary">
                سهم سوخت سهمیه‌ای: {percent(field.value)}
              </Typography>
              <Slider
                value={field.value}
                onChange={(_, value) => field.onChange(value)}
                min={0}
                max={1}
                step={0.05}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => percent(value)}
              />
              <Typography variant="caption" color="text.secondary">
                در سفر طولانی معمولاً سهمیه وسط راه تمام می‌شود و بقیه با نرخ آزاد پر می‌شود.
              </Typography>
            </>
          )}
        />
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="maxDrivingHoursPerDay"
            control={control}
            render={({ field }) => (
              <>
                <Typography variant="body2" color="text.secondary">
                  سقف رانندگی روزانه: {faNum(field.value, 1)} ساعت
                </Typography>
                <Slider
                  value={field.value}
                  onChange={(_, value) => field.onChange(value)}
                  min={1}
                  max={12}
                  step={0.5}
                  valueLabelDisplay="auto"
                />
              </>
            )}
          />
        </Grid>

        <Grid size={{ xs: 6, sm: 3 }}>
          <Controller
            name="dayStartHour"
            control={control}
            render={({ field }) => (
              <NumberField
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                label="شروع روز (ساعت)"
                min={0}
                max={12}
              />
            )}
          />
        </Grid>

        <Grid size={{ xs: 6, sm: 3 }}>
          <Controller
            name="dayEndHour"
            control={control}
            render={({ field, formState }) => (
              <NumberField
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                label="پایان روز (ساعت)"
                min={12}
                max={24}
                error={Boolean(formState.errors.dayEndHour)}
                helperText={formState.errors.dayEndHour?.message ?? ' '}
              />
            )}
          />
        </Grid>
      </Grid>
    </Stack>
  )
}

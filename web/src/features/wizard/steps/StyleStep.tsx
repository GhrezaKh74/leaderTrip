import { Controller, useFormContext } from 'react-hook-form'
import Chip from '@mui/material/Chip'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { lodgingKindSchema, travelStyleSchema } from '../../../api/schemas'
import { CATEGORY_LABEL, CATEGORY_ORDER, LODGING_LABEL, STYLE_HINT, STYLE_LABEL } from '../labels'
import type { TripForm } from '../tripSchema'

export function StyleStep() {
  const { control, watch } = useFormContext<TripForm>()

  const destinationCityId = watch('destinationCityId')
  const hasDestination = destinationCityId !== null && destinationCityId !== ''
  // فقط «گشت در مسیر» یک‌سویهٔ اجباری است؛ سفر اقامتی برگشت دارد و انتخابش
  // با کاربر است.
  const corridorTrip = hasDestination && watch('destinationMode') === 'Corridor'

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="style"
            control={control}
            render={({ field }) => (
              <TextField {...field} select label="سطح سفر">
                {travelStyleSchema.options.map((style) => (
                  <MenuItem key={style} value={style}>
                    {STYLE_LABEL[style]} — {STYLE_HINT[style]}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="lodging"
            control={control}
            render={({ field }) => (
              <TextField {...field} select label="نوع اقامت">
                {lodgingKindSchema.options.map((kind) => (
                  <MenuItem key={kind} value={kind}>
                    {LODGING_LABEL[kind]}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Grid>
      </Grid>

      <Stack spacing={1}>
        <Typography variant="body2" color="text.secondary">
          علاقه‌مندی‌ها — خالی گذاشتنش یعنی همه‌چیز به یک اندازه مهم است.
        </Typography>

        <Controller
          name="interests"
          control={control}
          render={({ field }) => (
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
              {CATEGORY_ORDER.map((category) => {
                const selected = field.value.includes(category)

                return (
                  <Chip
                    key={category}
                    label={CATEGORY_LABEL[category]}
                    color={selected ? 'primary' : 'default'}
                    variant={selected ? 'filled' : 'outlined'}
                    onClick={() =>
                      field.onChange(
                        selected
                          ? field.value.filter((c) => c !== category)
                          : [...field.value, category],
                      )
                    }
                  />
                )
              })}
            </Stack>
          )}
        />
      </Stack>

      <Controller
        name="roundTrip"
        control={control}
        render={({ field }) => (
          <Stack spacing={0}>
            <FormControlLabel
              control={
                <Switch checked={field.value && !corridorTrip} onChange={field.onChange} disabled={corridorTrip} />
              }
              label={hasDestination ? 'برگشت به مبدأ در پایان سفر' : 'برگشت به شهر مبدأ'}
            />
            {corridorTrip ? (
              <Typography variant="caption" color="text.secondary">
                «گشت در مسیر» یک‌سویه برنامه‌ریزی می‌شود؛ برگشت، خودش سفری است
                با توقف‌های خودش. برای رفت‌وبرگشت، هدف مقصد را «اقامت» بگذارید.
              </Typography>
            ) : null}
          </Stack>
        )}
      />
    </Stack>
  )
}

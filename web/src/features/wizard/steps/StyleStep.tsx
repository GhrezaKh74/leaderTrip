import { Controller, useFormContext } from 'react-hook-form'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

import { lodgingKindSchema, travelStyleSchema } from '../../../api/schemas'
import { faNum } from '../../../lib/format'
import { CATEGORY_LABEL, CATEGORY_ORDER, LODGING_LABEL, STYLE_HINT, STYLE_LABEL } from '../labels'
import type { TripForm } from '../tripSchema'

/** ساعت‌های معقول برای حرکتِ دیرترِ روز اول. */
const FIRST_DAY_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14]

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

      <Divider />

      {/* ترجیحات روز: سلیقه‌هایی که برنامهٔ خوب را برای این گروه خوب می‌کنند.
          پیش‌فرضِ همه، رفتار همیشگی است — کسی که کاری به این‌ها ندارد،
          هیچ تغییری نمی‌بیند. */}
      <Stack spacing={2}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          ترجیحات روز
        </Typography>

        <Controller
          name="dayPace"
          control={control}
          render={({ field }) => (
            <Stack spacing={0.75}>
              <Typography variant="body2" color="text.secondary">
                ریتم بازدید روزانه
              </Typography>

              <ToggleButtonGroup
                exclusive
                color="primary"
                size="small"
                value={field.value}
                onChange={(_, next: 'Relaxed' | 'Balanced' | 'Packed' | null) => {
                  if (next !== null) field.onChange(next)
                }}
              >
                <ToggleButton value="Relaxed">آرام</ToggleButton>
                <ToggleButton value="Balanced">متعادل</ToggleButton>
                <ToggleButton value="Packed">پرگشت</ToggleButton>
              </ToggleButtonGroup>

              <Typography variant="caption" color="text.secondary">
                {field.value === 'Relaxed'
                  ? 'حداکثر ۳ توقف در روز، با حاشیهٔ نفس‌کشیدن — مناسب خانواده با بچه یا سالمند.'
                  : field.value === 'Balanced'
                    ? 'حداکثر ۵ توقف در روز.'
                    : 'هرچه جا شود — روزهای پُر و سیر.'}
              </Typography>
            </Stack>
          )}
        />

        <Controller
          name="lunchStyle"
          control={control}
          render={({ field }) => (
            <Stack spacing={0.75}>
              <Typography variant="body2" color="text.secondary">
                ناهار
              </Typography>

              <ToggleButtonGroup
                exclusive
                color="primary"
                size="small"
                value={field.value}
                onChange={(_, next: 'Restaurant' | 'Picnic' | null) => {
                  if (next !== null) field.onChange(next)
                }}
              >
                <ToggleButton value="Restaurant">رستوران بین‌راهی</ToggleButton>
                <ToggleButton value="Picnic">همراه می‌بریم</ToggleButton>
              </ToggleButtonGroup>

              {field.value === 'Picnic' ? (
                <Typography variant="caption" color="text.secondary">
                  توقف ناهار کوتاه‌تر می‌شود و هزینهٔ ناهار از تفکیک حذف.
                </Typography>
              ) : null}
            </Stack>
          )}
        />

        <Stack spacing={0}>
          <Controller
            name="checkInFirst"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={field.onChange} />}
                label="اول تحویل اقامتگاه و کمی استراحت، بعد گشت"
              />
            )}
          />

          <Controller
            name="middayRest"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={field.onChange} />}
                label="استراحت بعد از ناهار"
              />
            )}
          />

          <Controller
            name="eveningProgram"
            control={control}
            render={({ field }) => (
              <Stack spacing={0}>
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={field.onChange} />}
                  label="برنامهٔ شب (گشت بعد از شام)"
                />
                {field.value ? null : (
                  <Typography variant="caption" color="text.secondary">
                    بعد از شام هیچ برنامه‌ای گذاشته نمی‌شود؛ شبْ استراحت است.
                  </Typography>
                )}
              </Stack>
            )}
          />
        </Stack>

        <Controller
          name="firstDayStartHour"
          control={control}
          render={({ field }) => (
            <TextField
              select
              label="حرکت روز اول"
              value={field.value === null ? '' : String(field.value)}
              onChange={(event) =>
                field.onChange(event.target.value === '' ? null : Number(event.target.value))
              }
              helperText="خیلی‌ها روز اول دیرتر راه می‌افتند — جمع‌کردن وسایل، تحویل خانه."
              sx={{ maxWidth: 320 }}
            >
              <MenuItem value="">مثل بقیهٔ روزها</MenuItem>
              {FIRST_DAY_HOURS.map((hour) => (
                <MenuItem key={hour} value={String(hour)}>
                  ساعت {faNum(hour)}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
      </Stack>
    </Stack>
  )
}

import { Controller, useFieldArray, useFormContext } from 'react-hook-form'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined'

import { NumberField } from '../../../components/NumberField'
import { MOBILITY_LABEL } from '../labels'
import { mobilitySchema } from '../../../api/schemas'
import type { TripForm } from '../tripSchema'
import { faNum } from '../../../lib/format'

export function TravelersStep() {
  const { control, formState, watch } = useFormContext<TripForm>()
  const { fields, append, remove } = useFieldArray({ control, name: 'travelers' })
  const travelers = watch('travelers')

  const rootError = formState.errors.travelers?.root?.message ?? formState.errors.travelers?.message

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        سن و توان جسمی هر نفر روی انتخاب جاذبه‌ها و طول روز اثر می‌گذارد — نه فقط روی هزینه.
        ضعیف‌ترین عضو گروه سرعت را تعیین می‌کند.
      </Typography>

      {rootError ? <Alert severity="warning">{rootError}</Alert> : null}

      {fields.map((field, index) => (
        <Paper key={field.id} sx={{ p: 2 }}>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller
                name={`travelers.${index}.name`}
                control={control}
                render={({ field: input }) => (
                  <TextField
                    {...input}
                    label="نام (اختیاری)"
                    // جداکنندهٔ «·» عمدی است: در متن راست‌به‌چپ، دو رشتهٔ رقمیِ
                    // چسبیده به هم ادغام می‌شوند و «همسفر ۱» کنار «۳۵ ساله»
                    // به‌شکل «۱۳۵» خوانده می‌شود.
                    placeholder={`همسفر ${faNum(index + 1)}`}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 2 }}>
              <Controller
                name={`travelers.${index}.age`}
                control={control}
                render={({ field: input }) => (
                  <NumberField
                    value={input.value}
                    onChange={input.onChange}
                    onBlur={input.onBlur}
                    label="سن"
                    min={0}
                    max={120}
                    error={Boolean(formState.errors.travelers?.[index]?.age)}
                    helperText={formState.errors.travelers?.[index]?.age?.message ?? ' '}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <Controller
                name={`travelers.${index}.mobility`}
                control={control}
                render={({ field: input }) => (
                  <TextField {...input} select label="توان حرکتی">
                    {mobilitySchema.options.map((level) => (
                      <MenuItem key={level} value={level}>
                        {MOBILITY_LABEL[level]}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            <Grid size={{ xs: 8, sm: 2 }}>
              <Controller
                name={`travelers.${index}.isDriver`}
                control={control}
                render={({ field: input }) => (
                  <FormControlLabel
                    control={<Switch checked={input.value} onChange={input.onChange} />}
                    label="راننده"
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 4, sm: 1 }} sx={{ textAlign: 'end' }}>
              <IconButton
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                aria-label={`حذف همسفر ${faNum(index + 1)}`}
              >
                <DeleteOutlineIcon />
              </IconButton>
            </Grid>
          </Grid>
        </Paper>
      ))}

      <Button
        startIcon={<AddIcon />}
        onClick={() =>
          append({
            id: `t${Date.now()}`,
            name: '',
            age: 30,
            mobility: 'Full',
            isDriver: false,
          })
        }
        variant="outlined"
        sx={{ alignSelf: 'flex-start' }}
      >
        افزودن همسفر
      </Button>

      <Typography variant="caption" color="text.secondary">
        {faNum(travelers.length)} نفر · {faNum(travelers.filter((t) => t.isDriver).length)} راننده
      </Typography>
    </Stack>
  )
}

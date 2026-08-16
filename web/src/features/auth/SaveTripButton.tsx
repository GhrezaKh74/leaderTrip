import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import SaveIcon from '@mui/icons-material/SaveOutlined'

import { faNum } from '../../lib/format'
import type { TripForm } from '../wizard/tripSchema'
import { AuthDialog } from './AccountButton'
import { getSession, saveTrip, useSession } from './session'

/**
 * دکمهٔ «ذخیرهٔ برنامه» در صفحهٔ برنامه.
 *
 * <p>همان ذخیره‌ای است که در «سفرهای من» هست، ولی جایی که کاربر واقعاً
 * می‌خواهدش: روبه‌روی برنامه‌ای که همین حالا ساخته. بی‌حساب که باشد، اول
 * پنجرهٔ ورود می‌آید و بعدِ ورود، همان ذخیره ادامه پیدا می‌کند — کلیک کاربر
 * نباید وسط راه گم شود.</p>
 */
export function SaveTripButton({
  input,
  onSaved,
}: {
  input: TripForm
  /** پیام موفقیت به اسنک‌بار صفحهٔ میزبان می‌رود، نه یک اسنک‌بار دوم. */
  onSaved: (message: string) => void
}) {
  const session = useSession()
  const queryClient = useQueryClient()
  const [authOpen, setAuthOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [title, setTitle] = useState('')

  const defaultTitle = `سفر ${faNum(input.days)} روزه`

  const save = useMutation({
    mutationFn: () => saveTrip(title.trim() || defaultTitle, JSON.stringify(input)),
    onSuccess: () => {
      // فهرست «سفرهای من» باید بدون بازکردن دوباره تازه باشد.
      void queryClient.invalidateQueries({ queryKey: ['me', 'trips'] })
      setSaveOpen(false)
      setTitle('')
      onSaved('برنامه روی حساب ذخیره شد.')
    },
  })

  return (
    <>
      <Button
        onClick={() => (session === null ? setAuthOpen(true) : setSaveOpen(true))}
        startIcon={<SaveIcon sx={{ fontSize: 18 }} />}
        variant="outlined"
        size="small"
      >
        ذخیرهٔ برنامه
      </Button>

      <AuthDialog
        open={authOpen}
        onClose={() => {
          setAuthOpen(false)
          // اگر بستن به‌خاطر ورود موفق بود، ذخیره از همان‌جا ادامه می‌گیرد؛
          // اگر انصراف بود، نشستی نیست و هیچ اتفاقی نمی‌افتد.
          if (getSession() !== null) setSaveOpen(true)
        }}
      />

      <Dialog open={saveOpen} onClose={() => setSaveOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>ذخیرهٔ برنامه روی حساب</DialogTitle>

        <DialogContent>
          <Stack
            spacing={2}
            component="form"
            onSubmit={(event) => {
              event.preventDefault()
              save.mutate()
            }}
          >
            <TextField
              label="عنوان سفر"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={defaultTitle}
              autoFocus
            />

            {save.isError ? <Alert severity="error">{save.error.message}</Alert> : null}

            <Typography variant="caption" color="text.secondary">
              از «سفرهای من» در منوی حساب، روی هر دستگاهی برمی‌گردد.
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setSaveOpen(false)}>انصراف</Button>
          <Button
            variant="contained"
            onClick={() => save.mutate()}
            disabled={save.isPending}
            startIcon={save.isPending ? <CircularProgress size={14} color="inherit" /> : null}
          >
            ذخیره
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

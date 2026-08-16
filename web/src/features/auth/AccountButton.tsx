import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined'

import { UserIcon } from '../../components/icons'
import { heroGradient } from '../../theme/tokens'
import { ApiError } from '../../api/client'
import { parseTripForm, type TripForm } from '../wizard/tripSchema'
import { formatJalali } from '../../lib/jalali'
import { faNum } from '../../lib/format'
import {
  deleteTrip,
  dropSession,
  listTrips,
  login,
  logout,
  register,
  saveTrip,
  useSession,
} from './session'

/**
 * دکمهٔ حساب در سرصفحه — کل رابط احراز هویت از همین‌جا باز می‌شود.
 *
 * <p>حساب اختیاری است و اختیاری می‌ماند: بدون ورود، همهٔ اپ کار می‌کند (برنامه،
 * چاپ، اشتراک، حین سفر). حساب فقط یک چیز اضافه می‌کند: سفرهای ذخیره‌شده که از
 * هر دستگاهی برگردند.</p>
 */
export function AccountButton({
  currentInput,
  onLoadTrip,
}: {
  /** ورودی سفر جاری اگر برنامه‌ای ساخته شده — برای «ذخیرهٔ سفر فعلی». */
  currentInput: TripForm | null
  onLoadTrip: (trip: TripForm) => void
}) {
  const session = useSession()
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [tripsOpen, setTripsOpen] = useState(false)

  if (session === null) {
    return (
      <>
        <Tooltip title="ورود به حساب">
          <IconButton onClick={() => setAuthOpen(true)} aria-label="ورود به حساب">
            <UserIcon />
          </IconButton>
        </Tooltip>

        <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    )
  }

  return (
    <>
      <Tooltip title={session.user.displayName}>
        <IconButton onClick={(event) => setMenuAnchor(event.currentTarget)} aria-label="حساب کاربری">
          {/* حرف اول نام روی گرادیان برند — آواتار بی‌عکس، با هویت. */}
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: heroGradient,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              fontWeight: 800,
            }}
          >
            {session.user.displayName.trim().charAt(0) || '؟'}
          </Box>
        </IconButton>
      </Tooltip>

      <Menu anchorEl={menuAnchor} open={menuAnchor !== null} onClose={() => setMenuAnchor(null)}>
        <MenuItem disabled sx={{ opacity: '1 !important' }}>
          <ListItemText
            primary={session.user.displayName}
            secondary={session.user.email}
            slotProps={{ primary: { sx: { fontWeight: 700 } } }}
          />
        </MenuItem>

        <Divider />

        <MenuItem
          onClick={() => {
            setMenuAnchor(null)
            setTripsOpen(true)
          }}
        >
          سفرهای من
        </MenuItem>

        <MenuItem
          onClick={() => {
            setMenuAnchor(null)
            void logout()
          }}
        >
          خروج از حساب
        </MenuItem>
      </Menu>

      <TripsDialog
        open={tripsOpen}
        onClose={() => setTripsOpen(false)}
        currentInput={currentInput}
        onLoadTrip={(trip) => {
          setTripsOpen(false)
          onLoadTrip(trip)
        }}
      />
    </>
  )
}

// ─── ورود / ثبت‌نام ──────────────────────────────────────────────────────

function AuthDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')

  const submit = useMutation({
    mutationFn: async () => {
      if (mode === 'register') await register(email, password, displayName)
      else await login(email, password)
    },
    onSuccess: onClose,
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 0 }}>حساب لیدرتریپ</DialogTitle>

      <DialogContent>
        <Stack
          spacing={2}
          component="form"
          onSubmit={(event) => {
            event.preventDefault()
            submit.mutate()
          }}
        >
          <Tabs value={mode} onChange={(_, next: 'login' | 'register') => setMode(next)}>
            <Tab value="login" label="ورود" />
            <Tab value="register" label="ثبت‌نام" />
          </Tabs>

          {mode === 'register' ? (
            <TextField
              label="نام نمایشی"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoFocus
            />
          ) : null}

          <TextField
            type="email"
            label="ایمیل"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoFocus={mode === 'login'}
          />

          <TextField
            type="password"
            label="گذرواژه"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            helperText={mode === 'register' ? 'دست‌کم ۸ نویسه — قاعدهٔ دیگری ندارد.' : ' '}
          />

          {submit.isError ? <Alert severity="error">{submit.error.message}</Alert> : null}

          <Button
            type="submit"
            variant="contained"
            disabled={submit.isPending || email.trim() === '' || password === ''}
            startIcon={submit.isPending ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {mode === 'register' ? 'ساخت حساب' : 'ورود'}
          </Button>

          <Typography variant="caption" color="text.secondary">
            حساب فقط برای ذخیرهٔ سفرها روی سرور است؛ بدون آن هم همهٔ اپ کار
            می‌کند.
          </Typography>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}

// ─── سفرهای من ───────────────────────────────────────────────────────────

function TripsDialog({
  open,
  onClose,
  currentInput,
  onLoadTrip,
}: {
  open: boolean
  onClose: () => void
  currentInput: TripForm | null
  onLoadTrip: (trip: TripForm) => void
}) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)

  const trips = useQuery({
    queryKey: ['me', 'trips'],
    queryFn: listTrips,
    enabled: open,
  })

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['me', 'trips'] })

  const save = useMutation({
    mutationFn: () =>
      saveTrip(
        title.trim() || `سفر ${faNum(currentInput?.days ?? 0)} روزه`,
        JSON.stringify(currentInput),
      ),
    onSuccess: () => {
      setTitle('')
      refresh()
    },
  })

  const remove = useMutation({ mutationFn: deleteTrip, onSuccess: refresh })

  // ۴۰۱ یعنی نشست مرده — نگه‌داشتنش فقط خطاهای بعدی می‌سازد.
  if (trips.error instanceof ApiError && trips.error.status === 401) {
    dropSession()
  }

  const load = (payload: string) => {
    try {
      const parsed = parseTripForm(JSON.parse(payload))

      if (parsed === null) {
        setLoadError('این سفر با نسخهٔ فعلی اپ سازگار نیست.')

        return
      }

      setLoadError(null)
      onLoadTrip(parsed)
    } catch {
      setLoadError('محتوای این سفر خوانا نیست.')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>سفرهای من</DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          {currentInput !== null ? (
            <Paper sx={{ p: 1.5 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
                <TextField
                  label="عنوان سفر فعلی"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={`سفر ${faNum(currentInput.days)} روزه`}
                  sx={{ flexGrow: 1 }}
                />

                <Button
                  variant="contained"
                  onClick={() => save.mutate()}
                  disabled={save.isPending}
                  startIcon={save.isPending ? <CircularProgress size={14} color="inherit" /> : null}
                >
                  ذخیرهٔ سفر فعلی
                </Button>
              </Stack>

              {save.isError ? (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {save.error.message}
                </Alert>
              ) : null}
            </Paper>
          ) : (
            <Typography variant="body2" color="text.secondary">
              وقتی برنامه‌ای ساخته باشید، از همین‌جا روی حساب ذخیره می‌شود.
            </Typography>
          )}

          {loadError ? <Alert severity="warning">{loadError}</Alert> : null}
          {remove.isError ? <Alert severity="error">{remove.error.message}</Alert> : null}

          {trips.isPending ? (
            <Stack sx={{ py: 3, alignItems: 'center' }}>
              <CircularProgress size={24} />
            </Stack>
          ) : trips.isError ? (
            <Alert severity="error">{trips.error.message}</Alert>
          ) : trips.data.length === 0 ? (
            <Typography color="text.secondary">هنوز سفری ذخیره نشده است.</Typography>
          ) : (
            <Stack spacing={1}>
              {trips.data.map((trip) => (
                <Paper key={trip.id} sx={{ p: 1.5 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {trip.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatJalali(new Date(trip.updatedAt))}
                      </Typography>
                    </Stack>

                    <Button size="small" variant="outlined" onClick={() => load(trip.payload)}>
                      بارگذاری
                    </Button>

                    <Tooltip title="حذف از حساب">
                      <IconButton
                        size="small"
                        aria-label={`حذف ${trip.title}`}
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(trip.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  )
}

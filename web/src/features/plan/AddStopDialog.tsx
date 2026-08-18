import { useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { SearchIcon, VisitPinIcon } from '../../components/icons'
import { useSearchPlaces } from '../../api/queries'
import { faNum } from '../../lib/format'

export interface CustomStopDraft {
  id: string
  name: string
  lat: number
  lng: number
  visitMinutes: number
}

/**
 * افزودن توقف دلخواه — برای جایی که در دیتاست ما نیست.
 *
 * <p>دو راه تا مقصد: جست‌وجوی نام (از سرور خودی، که خودش از OpenStreetMap
 * می‌پرسد) یا — اگر جست‌وجو چیزی نیاورد — ضربهٔ مستقیم روی نقشه. هر دو به یک
 * جا می‌رسند: یک پین، یک عنوان، و «افزودن به برنامه». نقشه روی کانون سفر
 * (مقصد، و اگر نبود مبدأ) باز می‌شود چون توقفِ تازه به احتمال زیاد همان
 * حوالی است.</p>
 */
export function AddStopDialog({
  open,
  focus,
  online,
  onClose,
  onAdd,
}: {
  open: boolean
  /** مرکز اولیهٔ نقشه — کانون سفر. */
  focus: { lat: number; lng: number; name: string }
  online: boolean
  onClose: () => void
  onAdd: (stop: CustomStopDraft) => void
}) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const search = useSearchPlaces()

  const [term, setTerm] = useState('')
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null)
  const [name, setName] = useState('')
  const [visitMinutes, setVisitMinutes] = useState(60)

  const mapHost = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  // ‏circleMarker به‌جای marker: آیکونِ تصویریِ پیش‌فرض Leaflet زیر باندلر
  // مسیرش گم می‌شود و پینِ شکسته نشان می‌دهد؛ دایرهٔ برداری همیشه سالم است.
  const markerRef = useRef<L.CircleMarker | null>(null)

  const runSearch = () => {
    if (term.trim() !== '') search.mutate(term.trim())
  }

  const place = (lat: number, lng: number, label?: string) => {
    setPicked({ lat, lng })
    if (label !== undefined) setName(label)

    const map = mapRef.current

    if (map !== null) {
      if (markerRef.current === null) {
        markerRef.current = L.circleMarker([lat, lng], {
          radius: 10,
          color: theme.palette.primary.main,
          weight: 3,
          fillColor: theme.palette.background.paper,
          fillOpacity: 1,
        }).addTo(map)
      } else {
        markerRef.current.setLatLng([lat, lng])
      }

      map.setView([lat, lng], Math.max(map.getZoom(), 13))
    }
  }

  // ساخت نقشه بعد از پایان ترنزیشن دیالوگ (onEntered)، نه در useEffect:
  // محتوای دیالوگ از پورتال و ترنزیشن می‌گذرد و افکتِ mount پیش از آنکه ظرف
  // اندازهٔ واقعی بگیرد اجرا می‌شود — Leaflet در ظرف بی‌اندازه هیچ‌چیز نمی‌کشد.
  // onEntered یعنی «چیدمان تمام است»، پس invalidateSize هم لازم نیست.
  const initMap = () => {
    if (mapHost.current === null || mapRef.current !== null) return

    const map = L.map(mapHost.current, { zoomControl: true, attributionControl: true }).setView(
      [focus.lat, focus.lng],
      12,
    )

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(map)

    map.on('click', (event: L.LeafletMouseEvent) => {
      place(event.latlng.lat, event.latlng.lng)
    })

    mapRef.current = map
  }

  // برچیدن نقشه با بسته‌شدن/رفتن کامپوننت — وگرنه هر بازکردن یک نقشهٔ زنده اضافه می‌کند.
  useEffect(() => {
    if (open) return

    mapRef.current?.remove()
    mapRef.current = null
    markerRef.current = null
  }, [open])

  useEffect(
    () => () => {
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    },
    [],
  )

  const reset = () => {
    setTerm('')
    setPicked(null)
    setName('')
    setVisitMinutes(60)
    search.reset()
  }

  const submit = () => {
    if (picked === null || name.trim() === '') return

    onAdd({
      id: `custom-${Date.now()}`,
      name: name.trim(),
      lat: picked.lat,
      lng: picked.lng,
      visitMinutes,
    })
    reset()
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      slotProps={{ transition: { onEntered: initMap } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <VisitPinIcon sx={{ fontSize: 22, color: 'primary.main' }} />
        <Box component="span" sx={{ flexGrow: 1 }}>
          افزودن توقف دلخواه
        </Box>
        <IconButton
          aria-label="بستن"
          onClick={() => {
            reset()
            onClose()
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            جایی که در فهرست ما نیست؟ نامش را جست‌وجو کنید یا مستقیم روی نقشه
            بزنید تا پین شود — حوالی {focus.name}.
          </Typography>

          {online ? null : (
            <Alert severity="warning">
              آفلاین هستید؛ جست‌وجو و نقشه به اینترنت نیاز دارند.
            </Alert>
          )}

          <TextField
            label="جست‌وجوی مکان"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                runSearch()
              }
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button size="small" onClick={runSearch} disabled={search.isPending || term.trim() === ''}>
                      {search.isPending ? <CircularProgress size={16} /> : 'جست‌وجو'}
                    </Button>
                  </InputAdornment>
                ),
              },
            }}
          />

          {search.isError ? (
            <Alert severity="warning">جست‌وجو انجام نشد؛ می‌توانید مستقیم روی نقشه انتخاب کنید.</Alert>
          ) : null}

          {search.data ? (
            search.data.items.length === 0 ? (
              <Alert severity="info">
                چیزی با این نام پیدا نشد — روی نقشه بزنید تا همان نقطه پین شود.
              </Alert>
            ) : (
              <List dense disablePadding sx={{ maxHeight: 168, overflowY: 'auto' }}>
                {search.data.items.map((item, index) => (
                  <ListItemButton
                    key={`${item.lat}-${item.lng}-${index}`}
                    onClick={() => place(item.lat, item.lng, item.name)}
                  >
                    <ListItemText
                      primary={item.name}
                      slotProps={{ primary: { variant: 'body2' } }}
                    />
                  </ListItemButton>
                ))}
              </List>
            )
          ) : null}

          {/* نقشه: جست‌وجو نتیجه نداد؟ همین‌جا ضربه بزنید — راه دستی همیشه باز است. */}
          <Box
            ref={mapHost}
            sx={{
              height: { xs: 300, sm: 320 },
              borderRadius: 3,
              overflow: 'hidden',
              border: 1,
              borderColor: 'divider',
              // بدون این، z-index لایه‌های Leaflet روی دیالوگ MUI بالا می‌آید.
              '& .leaflet-pane, & .leaflet-control': { zIndex: 'auto' },
            }}
          />

          <Stack direction="row" spacing={1.5}>
            <TextField
              label="عنوان توقف"
              value={name}
              onChange={(event) => setName(event.target.value)}
              sx={{ flexGrow: 1 }}
            />

            <TextField
              select
              label="مدت"
              value={visitMinutes}
              onChange={(event) => setVisitMinutes(Number(event.target.value))}
              sx={{ width: 120, flexShrink: 0 }}
            >
              {[30, 45, 60, 90, 120, 180].map((minutes) => (
                <MenuItem key={minutes} value={minutes}>
                  {faNum(minutes)} دقیقه
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {picked === null ? (
            <Typography variant="caption" color="text.secondary">
              هنوز نقطه‌ای انتخاب نشده — از جست‌وجو یا با ضربه روی نقشه.
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={() => {
            reset()
            onClose()
          }}
        >
          انصراف
        </Button>
        <Button
          variant="contained"
          disabled={picked === null || name.trim() === ''}
          onClick={submit}
        >
          افزودن به برنامه
        </Button>
      </DialogActions>
    </Dialog>
  )
}

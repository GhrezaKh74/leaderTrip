import { useMemo, useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { BanIcon, CompassIcon, PinIcon, SearchIcon } from '../../../components/icons'

import Box from '@mui/material/Box'
import { alpha } from '@mui/material/styles'

import { useDiscoverPlaces, usePois } from '../../../api/queries'
import type { City, Poi } from '../../../api/schemas'
import { haversineKm } from '../../../lib/geo'
import { CATEGORY_LABEL } from '../labels'
import { CATEGORY_VISUAL } from '../categoryVisual'
import type { TripForm } from '../tripSchema'
import { faNum, toman } from '../../../lib/format'

/**
 * انتخاب دستی جاذبه‌ها.
 *
 * <p>دو کار متفاوت با نتیجهٔ متفاوت: <b>سنجاق</b> یعنی «این حتماً باشد» و
 * موتور بودجهٔ زمانی را دورش می‌چیند؛ <b>حذف</b> یعنی «این را نمی‌خواهم» و
 * دیگر پیشنهاد نمی‌شود. حرف آخر را کاربر می‌زند، نه الگوریتم — ولی نتیجه
 * همچنان یک برنامهٔ سازگار است، نه فهرستی که کاربر دستی چیده باشد.</p>
 */
export function PoiStep({ cities }: { cities: City[] }) {
  const { control, watch } = useFormContext<TripForm>()
  const [search, setSearch] = useState('')

  const originCityId = watch('originCityId')
  const destinationCityId = watch('destinationCityId')
  const pois = usePois()

  const origin = cities.find((city) => city.id === originCityId)
  // کانون فهرست: اگر مقصد انتخاب شده، جاذبه‌ها باید مالِ همان‌جا باشند —
  // کسی که به اصفهان می‌رود، فهرست جاهای اطراف تهران به کارش نمی‌آید.
  // سفر حلقه‌ای (بی‌مقصد) دور مبدأ می‌گردد، پس آن‌جا مبدأ کانون است.
  const focus = cities.find((city) => city.id === destinationCityId) ?? origin
  const cityName = useMemo(() => {
    const byId = new Map(cities.map((city) => [city.id, city.name]))

    return (id: string) => byId.get(id) ?? id
  }, [cities])

  const matches = useMemo(() => {
    const all = pois.data?.items ?? []
    const term = search.trim()

    // نزدیک‌ترین‌ها به کانون سفر اول — نه ترتیبِ اتفاقی پایگاه داده.
    const byDistance = (list: Poi[]) =>
      focus === undefined
        ? list
        : [...list].sort(
            (a, b) =>
              haversineKm(a.lat, a.lng, focus.lat, focus.lng) -
              haversineKm(b.lat, b.lng, focus.lat, focus.lng),
          )

    if (term === '') return byDistance(all).slice(0, 12)

    return byDistance(
      all.filter((poi) => poi.name.includes(term) || cityName(poi.cityId).includes(term)),
    ).slice(0, 20)
  }, [pois.data, search, cityName, focus])

  return (
    <Stack spacing={3}>
      <Typography variant="body2" color="text.secondary">
        اختیاری است. اگر جایی حتماً باید در برنامه باشد سنجاقش کنید، و اگر جایی
        را نمی‌خواهید حذفش کنید. بقیه را موتور انتخاب می‌کند.
      </Typography>

      <TextField
        label="جست‌وجوی جاذبه"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      {pois.isPending ? (
        <Stack spacing={2} sx={{ py: 4, alignItems: 'center' }}>
          <CircularProgress size={24} />
        </Stack>
      ) : pois.isError ? (
        <Alert severity="warning">فهرست جاذبه‌ها گرفته نشد؛ می‌توانید بدون انتخاب دستی ادامه دهید.</Alert>
      ) : (
        <Controller
          name="pinnedPoiIds"
          control={control}
          render={({ field: pinned }) => (
            <Controller
              name="excludedPoiIds"
              control={control}
              render={({ field: excluded }) => (
                <Stack spacing={1}>
                  {matches.map((poi) => (
                    <PoiRow
                      key={poi.id}
                      poi={poi}
                      cityName={cityName(poi.cityId)}
                      pinned={pinned.value.includes(poi.id)}
                      excluded={excluded.value.includes(poi.id)}
                      // سنجاق و حذف متضادند: انتخاب یکی، دیگری را برمی‌دارد.
                      // وگرنه جاذبه‌ای می‌ماند که هم «حتماً باشد» است هم «نباشد».
                      onPin={() => {
                        pinned.onChange(toggle(pinned.value, poi.id))
                        excluded.onChange(excluded.value.filter((id) => id !== poi.id))
                      }}
                      onExclude={() => {
                        excluded.onChange(toggle(excluded.value, poi.id))
                        pinned.onChange(pinned.value.filter((id) => id !== poi.id))
                      }}
                    />
                  ))}

                  {matches.length === 0 ? (
                    <Typography color="text.secondary">جاذبه‌ای با این نام پیدا نشد.</Typography>
                  ) : null}

                  <Typography variant="caption" color="text.secondary">
                    {faNum(pinned.value.length)} سنجاق‌شده · {faNum(excluded.value.length)} حذف‌شده
                  </Typography>
                </Stack>
              )}
            />
          )}
        />
      )}

      {focus ? <DiscoverySection around={focus} /> : null}
    </Stack>
  )
}

function PoiRow({
  poi,
  cityName,
  pinned,
  excluded,
  onPin,
  onExclude,
}: {
  poi: Poi
  cityName: string
  pinned: boolean
  excluded: boolean
  onPin: () => void
  onExclude: () => void
}) {
  const visual = CATEGORY_VISUAL[poi.category]
  const CategoryIcon = visual.icon

  return (
    <Paper
      sx={{
        p: 1.5,
        opacity: excluded ? 0.55 : 1,
        transition: 'border-color .2s ease, opacity .2s ease',
        // سنجاق‌شده باید در فهرست هم «قول داده‌شده» دیده شود، نه فقط در آیکونش.
        ...(pinned ? { borderColor: 'primary.main' } : null),
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        {/* آواتار دسته: پیش از خواندنِ نام، «جنس» جاذبه معلوم است. */}
        <Box
          aria-hidden
          sx={(theme) => ({
            width: 38,
            height: 38,
            borderRadius: '12px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.palette[visual.color].main,
            bgcolor: alpha(theme.palette[visual.color].main, 0.12),
          })}
        >
          <CategoryIcon sx={{ fontSize: 20 }} />
        </Box>

        <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: pinned ? 700 : 400 }}>
            {poi.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {cityName} · {CATEGORY_LABEL[poi.category]} · {faNum(poi.visitMinutes)} دقیقه ·{' '}
            {poi.ticket > 0 ? toman(poi.ticket) : 'رایگان'}
          </Typography>
        </Stack>

        <Tooltip title={pinned ? 'برداشتن سنجاق' : 'حتماً در برنامه باشد'}>
          <IconButton
            size="small"
            color={pinned ? 'primary' : 'default'}
            onClick={onPin}
            aria-label={`سنجاق ${poi.name}`}
          >
            <PinIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        <Tooltip title={excluded ? 'برگرداندن' : 'در برنامه نباشد'}>
          <IconButton
            size="small"
            color={excluded ? 'error' : 'default'}
            onClick={onExclude}
            aria-label={`حذف ${poi.name}`}
          >
            <BanIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Paper>
  )
}

/**
 * کشف از OpenStreetMap.
 *
 * <p>دستی است، نه خودکار: سهمیهٔ سرور عمومی محدود است و این ویژگی «پرکردن
 * حفرهٔ پوشش» است نه بخش اصلی. نتیجه هم با برچسب «دادهٔ خام» نشان داده می‌شود،
 * چون مدت بازدید و بلیت و سختی مسیر ندارد.</p>
 */
function DiscoverySection({ around }: { around: City }) {
  const discover = useDiscoverPlaces()

  return (
    <Stack spacing={1}>
      <Button
        variant="outlined"
        startIcon={discover.isPending ? <CircularProgress size={16} /> : <CompassIcon />}
        onClick={() => discover.mutate({ lat: around.lat, lng: around.lng, radiusKm: 20 })}
        disabled={discover.isPending}
        sx={{ alignSelf: 'flex-start' }}
      >
        {discover.isPending ? 'در حال جست‌وجو…' : `کشف جاهای دیگر اطراف ${around.name}`}
      </Button>

      {discover.isError ? <Alert severity="warning">{discover.error.message}</Alert> : null}

      {discover.data ? (
        discover.data.items.length === 0 ? (
          <Alert severity="info">
            چیزی پیدا نشد — یا سرویس کشف روی این نمونه خاموش است، یا اطراف این نقطه
            داده‌ای در OpenStreetMap ثبت نشده.
          </Alert>
        ) : (
          <Stack spacing={1}>
            <Alert severity="info">{discover.data.note}</Alert>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
              {discover.data.items.map((place) => (
                <Chip
                  key={place.osmId}
                  label={`${place.name} (${place.rawTag})`}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Stack>
          </Stack>
        )
      ) : null}
    </Stack>
  )
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
}

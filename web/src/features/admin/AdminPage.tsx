import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined'

import { NumberField } from '../../components/NumberField'
import { CostIcon, PeopleIcon, ShieldIcon, VisitPinIcon } from '../../components/icons'
import { api, ApiError, photoUrl } from '../../api/client'
import {
  adminOverviewSchema,
  photoInventorySchema,
  priceVersionSchema,
  type AdminOverview,
  type ReferenceData,
} from '../../api/schemas'
import { referenceDataSchema } from '../../api/schemas'
import { STYLE_LABEL } from '../wizard/labels'
import { faNum, toFa } from '../../lib/format'

/**
 * پنل مدیریت — «/?admin».
 *
 * <p>پشت کلید مدیریتی است، نه حساب کاربری: همان تصمیم
 * <code>ApiOptions.AdminApiKey</code> — قفلی روی در پشتی برای صاحب نمونه، نه
 * سامانهٔ هویت. کلید فقط در sessionStorage می‌ماند (با بستن تب پاک می‌شود) و
 * فقط در سرآیند می‌رود، هرگز در URL.</p>
 *
 * <p>سه چیزِ قابل مدیریت، همان سه چیزی که سرور واقعاً دارد: وضعیت سامانه،
 * دفترچهٔ قیمت (دلیل اصلی وجود بک‌اند)، و عکس‌های ذخیره‌شده. چیزی که مدیریتش
 * معنا ندارد — مثل ویرایش جاذبه‌ها که با هم‌ترازسازی seed بازنویسی می‌شود —
 * عمداً این‌جا نیست تا دکمه‌ای نسازیم که کارش را انجام نمی‌دهد.</p>
 */

const KEY_STORAGE = 'leadertrip.admin.key'

export function AdminPage() {
  const [key, setKey] = useState<string>(() => sessionStorage.getItem(KEY_STORAGE) ?? '')

  const login = (next: string) => {
    sessionStorage.setItem(KEY_STORAGE, next)
    setKey(next)
  }

  const logout = () => {
    sessionStorage.removeItem(KEY_STORAGE)
    setKey('')
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h1" component="h2">
          پنل مدیریت
        </Typography>

        {key !== '' ? (
          <Button size="small" variant="outlined" onClick={logout}>
            خروج
          </Button>
        ) : null}
      </Stack>

      {key === '' ? <KeyForm onSubmit={login} /> : <Dashboard adminKey={key} onUnauthorized={logout} />}
    </Stack>
  )
}

function KeyForm({ onSubmit }: { onSubmit: (key: string) => void }) {
  const [draft, setDraft] = useState('')

  return (
    <Paper sx={{ p: 3, maxWidth: 440 }}>
      <Stack
        spacing={2}
        component="form"
        onSubmit={(event) => {
          event.preventDefault()
          if (draft.trim() !== '') onSubmit(draft.trim())
        }}
      >
        <Typography variant="body2" color="text.secondary">
          کلید مدیریتی همان است که هنگام استقرار در <code>ADMIN_API_KEY</code> گذاشته‌اید.
          اگر خالی گذاشته باشید، اندپوینت‌های مدیریتی اصلاً روی سرور ثبت نشده‌اند.
        </Typography>

        <TextField
          type="password"
          label="کلید مدیریتی"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          autoFocus
        />

        <Button type="submit" variant="contained" disabled={draft.trim() === ''}>
          ورود
        </Button>
      </Stack>
    </Paper>
  )
}

function Dashboard({ adminKey, onUnauthorized }: { adminKey: string; onUnauthorized: () => void }) {
  const overview = useQuery({
    queryKey: ['admin', 'overview', adminKey],
    queryFn: () => api.adminGet('/admin/overview', adminOverviewSchema, adminKey),
    retry: false,
  })

  if (overview.isPending) {
    return (
      <Stack sx={{ py: 6, alignItems: 'center' }}>
        <CircularProgress />
      </Stack>
    )
  }

  if (overview.isError) {
    const unauthorized = overview.error instanceof ApiError && overview.error.status === 401

    return (
      <Alert
        severity="error"
        action={
          unauthorized ? (
            <Button color="inherit" size="small" onClick={onUnauthorized}>
              ورود دوباره
            </Button>
          ) : null
        }
      >
        {unauthorized ? 'کلید مدیریتی نامعتبر است.' : overview.error.message}
      </Alert>
    )
  }

  return (
    <Stack spacing={4}>
      <OverviewSection overview={overview.data} />
      <PricesSection adminKey={adminKey} />
      <PhotosSection adminKey={adminKey} />
    </Stack>
  )
}

// ─── نمای کلی ────────────────────────────────────────────────────────────

function OverviewSection({ overview }: { overview: AdminOverview }) {
  return (
    <Stack spacing={1.5}>
      <Typography variant="h3" component="h3">
        نمای کلی
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
        <StatCard
          label="ذخیره‌سازی"
          value={overview.storageMode === 'Database' ? 'پایگاه داده' : 'دادهٔ همراه برنامه'}
          hint={overview.storageMode === 'Database' ? 'قیمت‌ها قابل انتشارند' : 'قیمت‌ها فقط‌خواندنی‌اند'}
        />
        <StatCard label="شهرها" value={faNum(overview.cities)} icon={<PeopleIcon sx={{ fontSize: 20 }} />} />
        <StatCard label="جاذبه‌ها" value={faNum(overview.pois)} icon={<VisitPinIcon sx={{ fontSize: 20 }} />} />
        <StatCard label="خودروها" value={faNum(overview.vehicles)} />
        <StatCard
          label="قیمت‌های پایه"
          value={toFa(overview.pricesUpdatedAt)}
          hint="برچسب آخرین به‌روزرسانی"
          icon={<CostIcon sx={{ fontSize: 20 }} />}
        />
        <StatCard
          label="عکس‌های چک‌این"
          value={faNum(overview.photoCount)}
          hint={formatBytes(overview.photoBytes)}
        />
        <StatCard
          label="سقف درخواست"
          value={`${faNum(overview.requestsPerMinute)} / ${faNum(overview.planRequestsPerMinute)}`}
          hint="در دقیقه: عمومی / ساخت برنامه"
          icon={<ShieldIcon sx={{ fontSize: 20 }} />}
        />

        <Paper sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            سرویس‌های بیرونی
          </Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            <ServiceChip label="مسیریابی" enabled={overview.routingEnabled} />
            <ServiceChip label="هواشناسی" enabled={overview.weatherEnabled} />
            <ServiceChip label="کشف OSM" enabled={overview.discoveryEnabled} />
          </Stack>
        </Paper>
      </Box>
    </Stack>
  )
}

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string
  value: string
  hint?: string
  icon?: React.ReactNode
}) {
  return (
    <Paper sx={{ p: 2, minWidth: 0 }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.5, color: 'text.secondary' }}>
        {icon}
        <Typography variant="caption">{label}</Typography>
      </Stack>

      <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.5 }}>{value}</Typography>

      {hint ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {hint}
        </Typography>
      ) : null}
    </Paper>
  )
}

function ServiceChip({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <Chip
      size="small"
      variant={enabled ? 'filled' : 'outlined'}
      color={enabled ? 'success' : 'default'}
      label={`${label}: ${enabled ? 'روشن' : 'خاموش'}`}
    />
  )
}

// ─── قیمت‌های پایه ───────────────────────────────────────────────────────

const FUEL_LABEL: Record<string, string> = {
  Gasoline: 'بنزین',
  Diesel: 'گازوئیل',
  Cng: 'سی‌ان‌جی',
  Electric: 'برق',
}

const styleLabel = (key: string): string => (STYLE_LABEL as Record<string, string>)[key] ?? key

/**
 * ویرایش دفترچهٔ قیمت.
 *
 * <p>فرم از دادهٔ زندهٔ <code>/api/reference</code> پر می‌شود و انتشار، نسخهٔ
 * تازه می‌سازد (نسخهٔ قبلی بازنویسی نمی‌شود — برگشتن یعنی یک انتشار دیگر).
 * روی نمونهٔ بدون پایگاه داده، سرور با پیام روشنِ «فقط‌خواندنی» رد می‌کند و
 * همان پیام این‌جا نشان داده می‌شود.</p>
 */
function PricesSection({ adminKey }: { adminKey: string }) {
  const reference = useQuery({
    queryKey: ['reference'],
    queryFn: () => api.get('/reference', referenceDataSchema),
    staleTime: 10 * 60 * 1000,
  })

  if (reference.isPending) {
    return (
      <Stack sx={{ py: 3, alignItems: 'center' }}>
        <CircularProgress size={24} />
      </Stack>
    )
  }

  if (reference.isError) {
    return <Alert severity="error">{reference.error.message}</Alert>
  }

  return <PriceEditor adminKey={adminKey} initial={reference.data} />
}

function PriceEditor({ adminKey, initial }: { adminKey: string; initial: ReferenceData }) {
  // رونوشت عمیق: ویرایش پیش‌نویس نباید کش کوئری مرجع را دستکاری کند.
  const [draft, setDraft] = useState(() => structuredClone(initial.prices))
  const [updatedAt, setUpdatedAt] = useState(initial.prices.updatedAt)
  const queryClient = useQueryClient()

  const publish = useMutation({
    mutationFn: () =>
      api.adminPost(
        '/admin/prices',
        { payload: JSON.stringify({ ...draft, updatedAt }), updatedAt },
        priceVersionSchema,
        adminKey,
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['reference'] }),
  })

  const setRecord = (field: 'subsidizedFuel' | 'freeMarketFuel' | 'lodgingPerNight' | 'miscRate' | 'bufferRate') =>
    (key: string, value: number) =>
      setDraft((current) => ({ ...current, [field]: { ...current[field], [key]: value } }))

  return (
    <Stack spacing={1.5}>
      <Typography variant="h3" component="h3">
        دفترچهٔ قیمت
      </Typography>

      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={3}>
          <RecordEditor
            title="سوخت سهمیه‌ای (تومان بر لیتر)"
            record={draft.subsidizedFuel}
            labelOf={(key) => FUEL_LABEL[key] ?? key}
            onChange={setRecord('subsidizedFuel')}
          />

          <RecordEditor
            title="سوخت آزاد (تومان بر لیتر)"
            record={draft.freeMarketFuel}
            labelOf={(key) => FUEL_LABEL[key] ?? key}
            onChange={setRecord('freeMarketFuel')}
          />

          <RecordEditor
            title="اقامت هر شب (تومان به‌ازای هر نفر)"
            record={draft.lodgingPerNight}
            labelOf={styleLabel}
            onChange={setRecord('lodgingPerNight')}
            step={100_000}
          />

          <Stack spacing={1}>
            <Typography variant="subtitle1">وعده‌های غذایی (تومان به‌ازای هر نفر)</Typography>
            {Object.entries(draft.meals).map(([style, meals]) => (
              <Grid container spacing={1.5} key={style} sx={{ alignItems: 'center' }}>
                <Grid size={{ xs: 12, sm: 2 }}>
                  <Typography variant="body2">{styleLabel(style)}</Typography>
                </Grid>
                {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => (
                  <Grid size={{ xs: 4, sm: 3 }} key={meal}>
                    <NumberField
                      label={meal === 'breakfast' ? 'صبحانه' : meal === 'lunch' ? 'ناهار' : 'شام'}
                      value={meals[meal]}
                      min={0}
                      step={50_000}
                      onChange={(value) =>
                        setDraft((current) => ({
                          ...current,
                          meals: { ...current.meals, [style]: { ...meals, [meal]: value } },
                        }))
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            ))}
          </Stack>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <NumberField
                label="عوارض (تومان بر کیلومتر)"
                value={draft.tollPerKilometer}
                min={0}
                step={50}
                onChange={(value) => setDraft((current) => ({ ...current, tollPerKilometer: value }))}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <NumberField
                label="سهم آزادراه (۰ تا ۱)"
                value={draft.freewayShare}
                min={0}
                max={1}
                step={0.05}
                onChange={(value) => setDraft((current) => ({ ...current, freewayShare: value }))}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <NumberField
                label="نرخ تنقلات (۰ تا ۱)"
                value={draft.snackRate}
                min={0}
                max={1}
                step={0.01}
                onChange={(value) => setDraft((current) => ({ ...current, snackRate: value }))}
              />
            </Grid>
          </Grid>

          <RecordEditor
            title="نرخ متفرقه (۰ تا ۱ از جمع)"
            record={draft.miscRate}
            labelOf={styleLabel}
            onChange={setRecord('miscRate')}
            step={0.01}
          />

          <RecordEditor
            title="بافر ریسک (۰ تا ۱ از جمع)"
            record={draft.bufferRate}
            labelOf={styleLabel}
            onChange={setRecord('bufferRate')}
            step={0.01}
          />

          <Divider />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
            <TextField
              label="برچسب به‌روزرسانی (مثل ۱۴۰۴/۰۶)"
              value={updatedAt}
              onChange={(event) => setUpdatedAt(event.target.value)}
              sx={{ maxWidth: 260 }}
            />

            <Button
              variant="contained"
              onClick={() => publish.mutate()}
              disabled={publish.isPending || updatedAt.trim() === ''}
              startIcon={publish.isPending ? <CircularProgress size={16} color="inherit" /> : null}
            >
              انتشار نسخهٔ تازه
            </Button>
          </Stack>

          {publish.isError ? <Alert severity="error">{publish.error.message}</Alert> : null}

          {publish.isSuccess ? (
            <Alert severity="success">
              نسخهٔ {faNum(publish.data.version)} منتشر شد و از همین حالا مبنای همهٔ برنامه‌هاست.
            </Alert>
          ) : null}
        </Stack>
      </Paper>
    </Stack>
  )
}

function RecordEditor({
  title,
  record,
  labelOf,
  onChange,
  step = 1000,
}: {
  title: string
  record: Record<string, number>
  labelOf: (key: string) => string
  onChange: (key: string, value: number) => void
  step?: number
}) {
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle1">{title}</Typography>
      <Grid container spacing={1.5}>
        {Object.entries(record).map(([key, value]) => (
          <Grid size={{ xs: 6, sm: 3 }} key={key}>
            <NumberField label={labelOf(key)} value={value} min={0} step={step} onChange={(v) => onChange(key, v)} />
          </Grid>
        ))}
      </Grid>
    </Stack>
  )
}

// ─── عکس‌ها ──────────────────────────────────────────────────────────────

function PhotosSection({ adminKey }: { adminKey: string }) {
  const queryClient = useQueryClient()

  const photos = useQuery({
    queryKey: ['admin', 'photos', adminKey],
    queryFn: () => api.adminGet('/admin/photos?take=60', photoInventorySchema, adminKey),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.adminDelete(`/admin/photos/${id}`, adminKey),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'photos'] }),
  })

  return (
    <Stack spacing={1.5}>
      <Typography variant="h3" component="h3">
        عکس‌های چک‌این
      </Typography>

      {photos.isPending ? (
        <Stack sx={{ py: 3, alignItems: 'center' }}>
          <CircularProgress size={24} />
        </Stack>
      ) : photos.isError ? (
        <Alert severity="error">{photos.error.message}</Alert>
      ) : photos.data.totalCount === 0 ? (
        <Typography color="text.secondary">هنوز عکسی ذخیره نشده است.</Typography>
      ) : (
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            {faNum(photos.data.totalCount)} عکس · {formatBytes(photos.data.totalBytes)}
            {photos.data.items.length < photos.data.totalCount
              ? ` · ${faNum(photos.data.items.length)} تای تازه نشان داده می‌شود`
              : ''}
          </Typography>

          {remove.isError ? <Alert severity="error">{remove.error.message}</Alert> : null}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: 1.5,
            }}
          >
            {photos.data.items.map((photo) => (
              <Paper key={photo.id} sx={{ p: 1, minWidth: 0 }}>
                <Box
                  component="img"
                  src={photoUrl(photo.id)}
                  alt={`عکس ${photo.id}`}
                  loading="lazy"
                  sx={{
                    width: '100%',
                    height: 96,
                    objectFit: 'cover',
                    borderRadius: 1.5,
                    display: 'block',
                  }}
                />

                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {formatBytes(photo.bytes)}
                  </Typography>

                  <Tooltip title="حذف برای همیشه از سرور">
                    <IconButton
                      size="small"
                      aria-label={`حذف عکس ${photo.id}`}
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(photo.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Paper>
            ))}
          </Box>
        </Stack>
      )}
    </Stack>
  )
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${faNum(bytes / 1_000_000_000, 1)} گیگابایت`
  if (bytes >= 1_000_000) return `${faNum(bytes / 1_000_000, 1)} مگابایت`
  if (bytes >= 1_000) return `${faNum(bytes / 1_000)} کیلوبایت`

  return `${faNum(bytes)} بایت`
}

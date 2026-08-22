import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Backdrop from '@mui/material/Backdrop'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import IconButton from '@mui/material/IconButton'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

import InfoIcon from '@mui/icons-material/InfoOutlined'
import Button from '@mui/material/Button'

import { MoonIcon, OfflineIcon, SunIcon } from './components/icons'
import { AboutDialog } from './components/AboutDialog'
import { AccountButton } from './features/auth/AccountButton'
// آیکون از داخل سورس می‌آید و با بقیهٔ باندل هش می‌خورد — نه از مسیر خامِ
// public که اگر روی سروری نبود، بی‌صدا ۴۰۴ می‌شود.
import appIcon from './assets/app-icon.svg'
import { glass } from './theme/tokens'

import { RtlProvider } from './theme/RtlProvider'
import { useThemeControl } from './theme/useThemeControl'
import { WizardPage } from './features/wizard/WizardPage'
import { PlanPage } from './features/plan/PlanPage'
import { clearShareParam, tripFromUrl } from './features/plan/sharing'
import { loadPlan, savePlan } from './offline/planStore'
import { useOnlineStatus } from './offline/useOnlineStatus'
import { useGeneratePlan } from './api/queries'
import { learnedTaste, loadJournal } from './features/live/journal'
import type { TripPlan } from './api/schemas'
import { DEFAULT_TRIP, type TripForm } from './features/wizard/tripSchema'

interface Generated {
  plan: TripPlan
  input: TripForm
}

// خارج از باندل اولیه: این دو صفحه فقط با «/?admin» و «/?icons» دیده می‌شوند،
// ولی به‌صورت ایستا وزنشان روی دوش اولین بازدیدِ هر کاربر بود — یعنی اسپلشِ
// طولانی‌تر برای صفحه‌ای که ۹۹٪ کاربران هرگز نمی‌بینند.
const AdminPage = lazy(() =>
  import('./features/admin/AdminPage').then((m) => ({ default: m.AdminPage })),
)
const IconGallery = lazy(() =>
  import('./components/IconGallery').then((m) => ({ default: m.IconGallery })),
)

export function App() {
  const { resolved, setMode } = useThemeControl()
  const online = useOnlineStatus()
  const [toast, setToast] = useState<string | null>(null)

  // لینک اشتراکی بر برنامهٔ کش‌شده مقدم است: کسی که روی لینک دوستش کلیک کرده،
  // سفر او را می‌خواهد ببیند نه سفر خودش.
  const [shared] = useState<TripForm | null>(() => tripFromUrl())

  const [generated, setGenerated] = useState<Generated | null>(() => {
    if (tripFromUrl() !== null) return null

    const cached = loadPlan()

    return cached === null ? null : { plan: cached.plan, input: cached.input }
  })

  // سفر بارگذاری‌شده از حساب. `key` ویزارد از شمارنده می‌آید تا هر بارگذاری،
  // فرم را با مقدارهای تازه از نو بسازد — reset دستی فرمِ نیمه‌پرشده خطاخیز است.
  const [loaded, setLoaded] = useState<{ trip: TripForm; sequence: number } | null>(null)

  // «ویرایش ورودی‌ها» برنامه را دور نمی‌ریزد: ویزارد باز می‌شود ولی برنامهٔ
  // فعلی سر جایش می‌ماند تا «بازگشت به برنامه» بدون ساخت دوباره ممکن باشد.
  const [editing, setEditing] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  const rebuild = useGeneratePlan()

  // انصرافِ ساخت دوباره: پاسخ دیررس نباید بی‌خبر برنامه را عوض کند.
  const rebuildIgnored = useRef(false)

  // گالری کنترل کیفیت آیکون‌ها — «/?icons». سطح کاربری نیست؛ جایی است که هر
  // آیکون تازه باید یک‌بار با چشم دیده شود.
  const showIconGallery =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('icons')

  // پنل مدیریت — «/?admin». پنهان‌بودن نشانی، امنیت نیست و ادعایش را هم ندارد؛
  // امنیت کلیدِ سرآیند است که بدونش سرور ۴۰۱ می‌دهد.
  const showAdmin =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('admin')

  const accept = (plan: TripPlan, input: TripForm) => {
    savePlan(plan, input)
    setGenerated({ plan, input })
    setEditing(false)
  }

  // لینک اشتراکی باید مستقیم به خودِ برنامه برسد — ارزش محصول همان است، نه
  // فرمِ نیمه‌پُر. آفلاین که ساختن ممکن نیست، فرم پیش‌پُر با توضیح می‌ماند.
  const sharedBuildStarted = useRef(false)

  useEffect(() => {
    if (shared === null || sharedBuildStarted.current) return

    sharedBuildStarted.current = true
    clearShareParam()

    if (!online) {
      setToast('سفر از لینک اشتراکی رسید؛ ساخت برنامه به اینترنت نیاز دارد.')

      return
    }

    rebuildIgnored.current = false
    rebuild.mutate(shared, {
      onSuccess: (plan) => {
        if (!rebuildIgnored.current) accept(plan, shared)
      },
      onError: (error) => setToast(`ساخت برنامهٔ اشتراکی نشد: ${error.message}`),
    })
    // فقط یک‌بار در شروع؛ وابستگی‌ها عمداً محدودند.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shared, online])

  /**
   * ساخت دوباره با ورودی تغییرکرده.
   *
   * ویرایش دستی و اهرم‌های کاهش هزینه، هر دو از این راه می‌آیند: ورودی عوض
   * می‌شود و موتور برنامه را از نو می‌سازد. دستکاری مستقیم خروجی یعنی مسافت و
   * ساعت و هزینه با آنچه روی صفحه است نخواند.
   */
  const rebuildWith = (next: TripForm) => {
    // سلیقهٔ آموخته‌شده از دفترچهٔ همین دستگاه، در هر ساخت دوباره تازه می‌شود.
    const taste = learnedTaste(loadJournal(`${next.originCityId}|${next.startDate}|${next.days}`))
    const withTaste: TripForm = { ...next, learnedTaste: taste }

    rebuildIgnored.current = false
    rebuild.mutate(withTaste, {
      onSuccess: (plan) => {
        if (!rebuildIgnored.current) accept(plan, withTaste)
      },
      onError: (error) => setToast(error.message),
    })
  }

  return (
    <RtlProvider mode={resolved}>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        // شیشه‌مات: سرصفحه روی محتوایی که زیرش می‌گذرد شناور است، پس باید
        // «از جنس شیشه» باشد نه یک نوار کدرِ جدا از صحنه.
        sx={{ ...glass(resolved), borderBottom: 1, borderColor: 'divider' }}
        className="no-print"
      >
        <Toolbar>
          {/* آیکون رسمی اپ — همانی که روی گوشی نصب می‌شود، همان‌جا که اسم است. */}
          <Box
            component="img"
            src={appIcon}
            alt=""
            sx={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
              ml: 1.25,
              flexShrink: 0,
            }}
          />

          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="h1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              لیدرتریپ
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: { xs: 'none', sm: 'block' }, lineHeight: 1.2 }}
            >
              دستیار لیدر سفر
            </Typography>
          </Box>

          {online ? null : (
            <Chip
              size="small"
              icon={<OfflineIcon />}
              label="آفلاین"
              sx={{ ml: 1 }}
              title="برنامهٔ ذخیره‌شده در دسترس است؛ ساخت برنامهٔ تازه به اینترنت نیاز دارد."
            />
          )}

          <AccountButton
            currentInput={generated?.input ?? null}
            onLoadTrip={(trip) => {
              setLoaded((current) => ({ trip, sequence: (current?.sequence ?? 0) + 1 }))
              setGenerated(null)
              setToast('سفر از حساب بارگذاری شد. برای دیدن برنامه، آن را بسازید.')
            }}
          />

          <Tooltip title={resolved === 'dark' ? 'حالت روشن' : 'حالت تاریک'}>
            <IconButton onClick={() => setMode(resolved === 'dark' ? 'light' : 'dark')}>
              {resolved === 'dark' ? <SunIcon /> : <MoonIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title="دربارهٔ لیدرتریپ">
            <IconButton aria-label="دربارهٔ لیدرتریپ" onClick={() => setAboutOpen(true)}>
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {showAdmin ? (
          <Suspense fallback={<CircularProgress sx={{ display: 'block', mx: 'auto', my: 6 }} />}>
            <AdminPage />
          </Suspense>
        ) : showIconGallery ? (
          <Suspense fallback={<CircularProgress sx={{ display: 'block', mx: 'auto', my: 6 }} />}>
            <IconGallery />
          </Suspense>
        ) : generated === null || editing ? (
          <WizardPage
            key={loaded?.sequence ?? 0}
            initial={loaded?.trip ?? shared}
            onPlanReady={accept}
            {...(editing && generated !== null
              ? { onCancelEdit: () => setEditing(false) }
              : {})}
          />
        ) : (
          <PlanPage
            plan={generated.plan}
            input={generated.input}
            online={online}
            onEdit={() => {
              setLoaded((current) => ({
                trip: generated.input,
                sequence: (current?.sequence ?? 0) + 1,
              }))
              setEditing(true)
            }}
            // «سفر جدید» یعنی ویزارد با پیش‌فرض‌ها، نه فرم نیمه‌پر سفر قبلی —
            // برای برگشتن به همان مقدارها «ویرایش ورودی‌ها» هست.
            onNew={() => {
              setLoaded((current) => ({ trip: DEFAULT_TRIP, sequence: (current?.sequence ?? 0) + 1 }))
              setEditing(false)
              setGenerated(null)
            }}
            onRebuild={rebuildWith}
          />
        )}
      </Container>

      <Backdrop open={rebuild.isPending} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        {/* role=status: اسکرین‌ریدر هم بداند اپ مشغول است؛ دکمهٔ انصراف: روکشِ
            تمام‌صفحه هرگز نباید بی‌راه‌فرار باشد. */}
        <Stack spacing={2} sx={{ alignItems: 'center' }} role="status">
          <CircularProgress color="inherit" />
          <Typography color="inherit">در حال ساخت دوبارهٔ برنامه…</Typography>
          <Button
            color="inherit"
            size="small"
            variant="outlined"
            onClick={() => {
              rebuildIgnored.current = true
              rebuild.reset()
            }}
          >
            انصراف
          </Button>
        </Stack>
      </Backdrop>

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />

      <Snackbar
        open={toast !== null}
        autoHideDuration={6000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </RtlProvider>
  )
}

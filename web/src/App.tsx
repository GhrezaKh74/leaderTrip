import { useEffect, useState } from 'react'
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
import CloudOffIcon from '@mui/icons-material/CloudOffOutlined'
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined'
import ExploreIcon from '@mui/icons-material/ExploreOutlined'
import LightModeIcon from '@mui/icons-material/LightModeOutlined'

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
import type { TripForm } from './features/wizard/tripSchema'

interface Generated {
  plan: TripPlan
  input: TripForm
}

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

  const rebuild = useGeneratePlan()

  useEffect(() => {
    if (shared !== null) {
      clearShareParam()
      setToast('سفر از لینک اشتراکی بارگذاری شد. برای دیدن برنامه، آن را بسازید.')
    }
  }, [shared])

  const accept = (plan: TripPlan, input: TripForm) => {
    savePlan(plan, input)
    setGenerated({ plan, input })
  }

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

    rebuild.mutate(withTaste, {
      onSuccess: (plan) => accept(plan, withTaste),
      onError: (error) => setToast(error.message),
    })
  }

  return (
    <RtlProvider mode={resolved}>
      <AppBar
        position="sticky"
        color="default"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
        className="no-print"
      >
        <Toolbar>
          <ExploreIcon color="primary" sx={{ ml: 1 }} />
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1, fontWeight: 700 }}>
            لیدرتریپ
          </Typography>

          {online ? null : (
            <Chip
              size="small"
              icon={<CloudOffIcon />}
              label="آفلاین"
              sx={{ ml: 1 }}
              title="برنامهٔ ذخیره‌شده در دسترس است؛ ساخت برنامهٔ تازه به اینترنت نیاز دارد."
            />
          )}

          <Tooltip title={resolved === 'dark' ? 'حالت روشن' : 'حالت تاریک'}>
            <IconButton onClick={() => setMode(resolved === 'dark' ? 'light' : 'dark')}>
              {resolved === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {generated === null ? (
          <WizardPage initial={shared} onPlanReady={accept} />
        ) : (
          <PlanPage
            plan={generated.plan}
            input={generated.input}
            online={online}
            onEdit={() => setGenerated(null)}
            onRebuild={rebuildWith}
          />
        )}
      </Container>

      <Backdrop open={rebuild.isPending} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <CircularProgress color="inherit" />
          <Typography color="inherit">در حال ساخت دوبارهٔ برنامه…</Typography>
        </Stack>
      </Backdrop>

      <Snackbar
        open={toast !== null}
        autoHideDuration={6000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </RtlProvider>
  )
}

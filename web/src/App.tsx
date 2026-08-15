import { useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Chip from '@mui/material/Chip'
import Container from '@mui/material/Container'
import IconButton from '@mui/material/IconButton'
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
import { loadPlan, savePlan } from './offline/planStore'
import { useOnlineStatus } from './offline/useOnlineStatus'
import type { TripPlan } from './api/schemas'
import type { TripForm } from './features/wizard/tripSchema'

interface Generated {
  plan: TripPlan
  input: TripForm
}

export function App() {
  const { resolved, setMode } = useThemeControl()
  const online = useOnlineStatus()

  // برنامهٔ کش‌شده همان چیزی است که اپ با آن باز می‌شود: کسی که در جاده اپ را
  // باز می‌کند، برنامهٔ دیروزش را می‌خواهد ببیند، نه ویزارد خالی.
  const [generated, setGenerated] = useState<Generated | null>(() => {
    const cached = loadPlan()

    return cached === null ? null : { plan: cached.plan, input: cached.input }
  })

  return (
    <RtlProvider mode={resolved}>
      <AppBar
        position="sticky"
        color="default"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
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
          <WizardPage
            onPlanReady={(plan, input) => {
              savePlan(plan, input)
              setGenerated({ plan, input })
            }}
          />
        ) : (
          <PlanPage
            plan={generated.plan}
            input={generated.input}
            online={online}
            onEdit={() => setGenerated(null)}
          />
        )}
      </Container>
    </RtlProvider>
  )
}

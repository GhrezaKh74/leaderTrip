import { useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Container from '@mui/material/Container'
import IconButton from '@mui/material/IconButton'
import Toolbar from '@mui/material/Toolbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined'
import ExploreIcon from '@mui/icons-material/ExploreOutlined'
import LightModeIcon from '@mui/icons-material/LightModeOutlined'

import { RtlProvider } from './theme/RtlProvider'
import { useThemeControl } from './theme/useThemeControl'
import { WizardPage } from './features/wizard/WizardPage'
import { PlanPage } from './features/plan/PlanPage'
import type { TripPlan } from './api/schemas'
import type { TripForm } from './features/wizard/tripSchema'

interface Generated {
  plan: TripPlan
  input: TripForm
}

export function App() {
  const { resolved, setMode } = useThemeControl()
  const [generated, setGenerated] = useState<Generated | null>(null)

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

          <Tooltip title={resolved === 'dark' ? 'حالت روشن' : 'حالت تاریک'}>
            <IconButton onClick={() => setMode(resolved === 'dark' ? 'light' : 'dark')}>
              {resolved === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {generated === null ? (
          <WizardPage onPlanReady={(plan, input) => setGenerated({ plan, input })} />
        ) : (
          <PlanPage
            plan={generated.plan}
            input={generated.input}
            onEdit={() => setGenerated(null)}
          />
        )}
      </Container>
    </RtlProvider>
  )
}

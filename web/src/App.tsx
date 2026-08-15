import { useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
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
import type { TripPlan } from './api/schemas'
import type { TripForm } from './features/wizard/tripSchema'
import { faNum, tomanShort } from './lib/format'

export function App() {
  const { resolved, setMode } = useThemeControl()
  const [plan, setPlan] = useState<{ plan: TripPlan; input: TripForm } | null>(null)

  return (
    <RtlProvider mode={resolved}>
      <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
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
        {plan === null ? (
          <WizardPage onPlanReady={(result, input) => setPlan({ plan: result, input })} />
        ) : (
          // نمایش کامل برنامه کار فاز ف‌۲ است. تا آن‌ زمان این خلاصه سرِ جای
          // خالی می‌نشیند تا مسیر ویزارد → برنامه واقعاً قابل آزمودن باشد،
          // نه اینکه به یک صفحهٔ سفید ختم شود.
          <PlanSummary plan={plan.plan} onBack={() => setPlan(null)} />
        )}
      </Container>
    </RtlProvider>
  )
}

function PlanSummary({ plan, onBack }: { plan: TripPlan; onBack: () => void }) {
  return (
    <Box>
      <Typography variant="h2" gutterBottom>
        برنامهٔ {faNum(plan.days.length)} روزه
      </Typography>

      <Typography color="text.secondary" gutterBottom>
        {faNum(plan.visitCount)} بازدید · {faNum(Math.round(plan.totalKilometers))} کیلومتر ·{' '}
        {tomanShort(plan.cost.total)}
        {plan.distanceSource === 'Estimated' ? ' · مسافت‌ها تخمینی' : ' · مسافت واقعی جاده'}
      </Typography>

      <Typography
        component="button"
        onClick={onBack}
        variant="body2"
        sx={{ background: 'none', border: 0, color: 'primary.main', cursor: 'pointer', p: 0 }}
      >
        بازگشت به ویزارد
      </Typography>
    </Box>
  )
}

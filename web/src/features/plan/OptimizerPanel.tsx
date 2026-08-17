import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { SavingsIcon } from '../../components/icons'

import { useBudgetLevers } from '../../api/queries'
import type { BudgetLever } from '../../api/schemas'
import type { TripForm } from '../wizard/tripSchema'
import { toFa, toman, tomanShort } from '../../lib/format'
import { applyLever } from './levers'

/**
 * راه‌های کاهش هزینه.
 *
 * <p>هر عدد از اجرای واقعی موتور می‌آید، نه از تخمین: برنامه با آن تغییر
 * دوباره ساخته می‌شود و اختلاف جمع کل گزارش می‌شود. کاربری که یک‌بار عدد
 * تخمینی را باور کند و بعد نبیند، دیگر هیچ عددی را باور نمی‌کند.</p>
 *
 * <p>هیچ اهرمی خودکار اعمال نمی‌شود. اعمالش یعنی ورودی عوض شود و برنامه از نو
 * ساخته شود — تصمیمی که با لیدر است، نه با اپ.</p>
 */
export function OptimizerPanel({
  input,
  onApply,
}: {
  input: TripForm
  onApply: (next: TripForm) => void
}) {
  const levers = useBudgetLevers()

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Typography variant="body2" color="text.secondary">
          هر راه با عدد صرفه‌جویی واقعی — برنامه با آن تغییر دوباره ساخته می‌شود،
          پس عدد تخمین نیست.
        </Typography>

        <Button
          variant="contained"
          onClick={() => levers.mutate(input)}
          disabled={levers.isPending}
          startIcon={levers.isPending ? <CircularProgress size={18} color="inherit" /> : <SavingsIcon />}
        >
          {levers.isPending ? 'در حال محاسبه…' : 'محاسبهٔ راه‌های کاهش'}
        </Button>
      </Stack>

      {levers.isError ? <Alert severity="error">{levers.error.message}</Alert> : null}

      {/* پیش از اولین محاسبه، صفحهٔ خالی شبیه صفحهٔ خراب است؛ جای خالیِ نتیجه
          می‌گوید این‌جا قرار است چه ظاهر شود و چرا ارزش یک کلیک را دارد. */}
      {!levers.data && !levers.isError && !levers.isPending ? (
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 3, sm: 4 },
            textAlign: 'center',
            borderStyle: 'dashed',
            bgcolor: 'transparent',
            backgroundImage: 'none',
          }}
        >
          <SavingsIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mx: 'auto' }}>
            چند نسخهٔ جایگزین از همین سفر ساخته می‌شود — اقامت ارزان‌تر، ناهار همراه،
            مسیر جمع‌وجورتر — و صرفه‌جویی واقعی هرکدام این‌جا فهرست می‌شود.
          </Typography>
        </Paper>
      ) : null}

      {levers.data ? (
        levers.data.levers.length === 0 ? (
          <Alert severity="info">
            با تغییرهای معمول، هزینهٔ این برنامه کمتر نمی‌شود. یعنی برنامه از قبل
            فشرده است.
          </Alert>
        ) : (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              هزینهٔ فعلی: {tomanShort(levers.data.baseline)}
            </Typography>

            {levers.data.levers.map((lever) => (
              <LeverCard
                key={lever.id}
                lever={lever}
                onApply={() => onApply(applyLever(input, lever))}
              />
            ))}
          </Stack>
        )
      ) : null}
    </Stack>
  )
}

function LeverCard({ lever, onApply }: { lever: BudgetLever; onApply: () => void }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          {/* عنوان از بک‌اند با ارقام لاتین می‌آید؛ شکل‌دادنش کار این لایه است. */}
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {toFa(lever.title)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {toFa(lever.detail)}
          </Typography>
        </Stack>

        <Stack spacing={1} sx={{ alignItems: { xs: 'flex-start', sm: 'flex-end' }, flexShrink: 0 }}>
          <Typography variant="h4" component="p" color="success.main" sx={{ whiteSpace: 'nowrap' }}>
            −{toman(lever.saving)}
          </Typography>
          <Button size="small" variant="outlined" onClick={onApply}>
            اعمال و ساخت دوباره
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}

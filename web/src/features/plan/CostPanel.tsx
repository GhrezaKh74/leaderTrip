import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import { alpha } from '@mui/material/styles'

import {
  CarIcon,
  CostIcon,
  FuelIcon,
  LodgingIcon,
  MealIcon,
  RouteIcon,
  TeaIcon,
  VisitPinIcon,
} from '../../components/icons'

import type { CostBreakdown } from '../../api/schemas'
import { faNum, toFa, toman, tomanShort } from '../../lib/format'

/**
 * آیکون و رنگ هر قلم هزینه — همان نگاشت معناییِ بلوک‌های برنامه.
 *
 * <p>جدولِ صرفاً متنی، اقلام را هم‌وزن نشان می‌دهد؛ آیکونِ رنگی می‌گذارد چشم
 * مستقیم سراغ قلمی برود که دنبالش است — سوخت اُخرا، اقامت لاجورد، وعده زعفران.</p>
 */
const LINE_VISUAL: Record<string, { icon: typeof CostIcon; color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' }> = {
  fuel: { icon: FuelIcon, color: 'warning' },
  toll: { icon: RouteIcon, color: 'info' },
  lodging: { icon: LodgingIcon, color: 'info' },
  meals: { icon: MealIcon, color: 'secondary' },
  snacks: { icon: TeaIcon, color: 'success' },
  tickets: { icon: VisitPinIcon, color: 'primary' },
  depreciation: { icon: CarIcon, color: 'warning' },
}

function LineAvatar({ lineKey, size = 30 }: { lineKey: string; size?: number }) {
  const visual = LINE_VISUAL[lineKey] ?? { icon: CostIcon, color: 'primary' as const }
  const Icon = visual.icon

  return (
    <Box
      aria-hidden
      sx={(theme) => ({
        width: size,
        height: size,
        borderRadius: '10px',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme.palette[visual.color].main,
        bgcolor: alpha(theme.palette[visual.color].main, 0.12),
      })}
    >
      <Icon sx={{ fontSize: size * 0.55 }} />
    </Box>
  )
}

/**
 * ارقام لاتینِ داخل فرمول را فارسی می‌کند.
 *
 * <p>فرمول‌ها را بک‌اند با فرهنگ ثابت می‌سازد — و باید هم بسازد، چون آن‌جا
 * محاسبه است نه نمایش. شکل ارقام کار همین لایه است؛ فرستادنش به بک‌اند یعنی
 * موتور هزینه بداند مخاطبش فارسی‌زبان است.</p>
 */
function shapeDigits(formula: string): string {
  return toFa(formula).replace(/,/g, '٬')
}

/**
 * تفکیک هزینه — با فرمول هر قلم.
 *
 * <p>ستون «فرمول» تزئین نیست؛ همان چیزی است که این محصول را از «یک عدد
 * تخمینی» جدا می‌کند. کاربری که می‌بیند «۸۶۱ کیلومتر × ۷٫۲ لیتر × ۲٬۱۰۰
 * تومان»، هم می‌تواند اشتباهش را پیدا کند و هم می‌تواند با قیمت روزِ خودش
 * دوباره حساب کند. عددِ بی‌فرمول فقط قابل باور یا ناباور کردن است.</p>
 */
export function CostPanel({ cost, budget, people }: { cost: CostBreakdown; budget: number; people: number }) {
  const overBudget = cost.overBudget > 0
  const usedFraction = budget > 0 ? Math.min(1, cost.total / budget) : 1

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Summary title="هزینهٔ کل" value={tomanShort(cost.total)} />
        <Summary title="هر نفر" value={tomanShort(cost.perPerson)} hint={`${faNum(people)} همسفر`} />
        <Summary
          title="بازهٔ محتمل"
          value={`${tomanShort(cost.optimistic)} تا ${tomanShort(cost.pessimistic)}`}
          hint="خوش‌بینانه تا بدبینانه"
        />
      </Grid>

      {budget > 0 ? (
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">بودجه: {tomanShort(budget)}</Typography>
            <Typography variant="body2" color={overBudget ? 'error.main' : 'success.main'}>
              {overBudget
                ? `${tomanShort(cost.overBudget)} بیشتر از بودجه`
                : `${tomanShort(-cost.overBudget)} باقی می‌ماند`}
            </Typography>
          </Stack>

          <LinearProgress
            variant="determinate"
            // مقدار عرض باید لاتین بماند. در نسخهٔ اول همین‌جا رشتهٔ فارسی‌شده
            // پاس داده شد و نوار همیشه پر بود، بی‌آنکه خطایی بدهد.
            value={usedFraction * 100}
            color={overBudget ? 'error' : 'primary'}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Paper>
      ) : null}

      {overBudget ? (
        <Alert severity="warning">
          این برنامه از بودجه بیشتر است. کوتاه‌کردن سفر، پایین‌آوردن سطح اقامت یا
          کم‌کردن شعاع، سه راه معمول کاهش‌اند.
        </Alert>
      ) : null}

      {/* روی گوشی، جدول سه‌ستونه فرمول را در ستونی سه‌کلمه‌ای له می‌کند —
          همان ستونی که کل ادعای «قابل‌ردیابی» است. آن‌جا هر قلم یک ردیفِ
          پشته‌ای می‌شود: قلم و مبلغ در یک خط، فرمول تمام‌عرض زیرش. */}
      <TableContainer component={Paper} sx={{ display: { xs: 'none', sm: 'block' } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>قلم</TableCell>
              <TableCell align="left">مبلغ</TableCell>
              <TableCell>چطور حساب شد</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {cost.lines.map((line) => (
              <TableRow key={line.key}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <LineAvatar lineKey={line.key} size={28} />
                    <span>{line.label}</span>
                  </Stack>
                </TableCell>
                <TableCell align="left" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  {toman(line.amount)}
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {shapeDigits(line.formula)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Paper sx={{ display: { xs: 'block', sm: 'none' } }}>
        <Stack divider={<Divider />} sx={{ p: 2 }} spacing={1.5}>
          {cost.lines.map((line) => (
            <Stack key={line.key} direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
              <LineAvatar lineKey={line.key} />
              <Stack spacing={0.25} sx={{ flexGrow: 1, minWidth: 0 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {line.label}
                  </Typography>
                  <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {toman(line.amount)}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {shapeDigits(line.formula)}
                </Typography>
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Line label="جمع اقلام" value={cost.subtotal} />
          <Line label="متفرقه" value={cost.miscellaneous} />
          <Line label="بافر ریسک" value={cost.riskBuffer} />
          <Divider />
          <Line label="جمع کل" value={cost.total} strong />
        </Stack>
      </Paper>

      <Typography variant="caption" color="text.secondary">
        همهٔ ارقام تخمینی‌اند و با قیمت‌های روز فرق می‌کنند. پیش از سفر، دست‌کم
        سوخت و اقامت را با نرخ واقعی بررسی کنید.
      </Typography>
    </Stack>
  )
}

function Summary({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <Grid size={{ xs: 12, sm: 4 }}>
      <Paper sx={{ p: 2, height: '100%' }}>
        <Typography variant="caption" color="text.secondary">
          {title}
        </Typography>
        <Typography
          variant="h4"
          component="p"
          sx={{ mt: 0.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </Typography>
        {hint ? (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        ) : null}
      </Paper>
    </Grid>
  )
}

function Line({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography variant="body2" sx={{ fontWeight: strong ? 700 : 400 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: strong ? 700 : 400, fontVariantNumeric: 'tabular-nums' }}
      >
        {toman(value)}
      </Typography>
    </Box>
  )
}

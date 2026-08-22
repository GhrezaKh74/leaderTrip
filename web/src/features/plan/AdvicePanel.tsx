import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { Advice } from '../../api/schemas'
import { toFa } from '../../lib/format'

const SEVERITY = {
  Critical: 'error',
  Warning: 'warning',
  Info: 'info',
} as const

/**
 * هشدارهای لیدر.
 *
 * <p>ترتیب از شدید به کم است و متن هرکدام کاری را که می‌شود کرد هم می‌گوید.
 * هشداری که راه‌حل ندارد فقط نگرانی تولید می‌کند و بعد از دو بار، نادیده
 * گرفته می‌شود.</p>
 */
export function AdvicePanel({ advice }: { advice: Advice[] }) {
  if (advice.length === 0) {
    return (
      <Alert
        severity="success"
        sx={(theme) => ({ borderInlineStart: `3px solid ${theme.palette.success.main}` })}
      >
        هشدار مهمی برای این برنامه پیدا نشد. باز هم پیش از حرکت وضعیت جاده و
        هوا را بررسی کنید.
      </Alert>
    )
  }

  return (
    <Stack spacing={2}>
      {advice.map((item) => (
        <Alert
          key={item.code}
          severity={SEVERITY[item.level]}
          // لبهٔ رنگیِ آغازِ خط: شدت هشدار پیش از خواندن متن، از گوشهٔ چشم معلوم است.
          sx={(theme) => ({
            borderInlineStart: `3px solid ${theme.palette[SEVERITY[item.level]].main}`,
          })}
        >
          <AlertTitle>{toFa(item.title)}</AlertTitle>
          <Typography variant="body2">{toFa(item.detail)}</Typography>
        </Alert>
      ))}
    </Stack>
  )
}

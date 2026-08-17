import { useMemo, useState } from 'react'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import type { PackingItem } from '../../api/schemas'
import { faNum } from '../../lib/format'

/**
 * چک‌لیست بار، با ستون «چرا».
 *
 * <p>چک‌لیست عمومی را همه‌جا می‌شود پیدا کرد و کسی نمی‌خواندش. ارزش این‌جا در
 * دلیل هر قلم است: «زنجیر چرخ — چون شب در کوهستان و در زمستان می‌مانید» چیزی
 * است که کاربر جدی می‌گیرد.</p>
 *
 * <p>تیک‌ها عمداً ذخیره نمی‌شوند: این فهرست با هر برنامهٔ تازه عوض می‌شود و
 * تیکِ مانده از سفر قبل، بدتر از تیک‌نخورده است.</p>
 */
export function PackingPanel({ items }: { items: PackingItem[] }) {
  const [packed, setPacked] = useState<ReadonlySet<string>>(new Set())

  const groups = useMemo(() => {
    const byGroup = new Map<string, PackingItem[]>()

    for (const item of items) {
      byGroup.set(item.group, [...(byGroup.get(item.group) ?? []), item])
    }

    return [...byGroup.entries()]
  }, [items])

  const toggle = (key: string) =>
    setPacked((current) => {
      const next = new Set(current)

      if (next.has(key)) next.delete(key)
      else next.add(key)

      return next
    })

  return (
    <Stack spacing={2}>
      {/* نوار پیشرفت کنار متن: عددِ تنها احساس پیشروی نمی‌دهد؛ نواری که با هر
          تیک پر می‌شود، چک‌لیست را از فهرست به بازیِ تمام‌کردنی تبدیل می‌کند. */}
      <Stack spacing={0.75}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Typography variant="body2" color="text.secondary">
            {faNum(packed.size)} از {faNum(items.length)} قلم آماده است.
          </Typography>
          {packed.size === items.length && items.length > 0 ? (
            <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
              آمادهٔ حرکت!
            </Typography>
          ) : null}
        </Stack>
        <LinearProgress
          variant="determinate"
          value={items.length > 0 ? (packed.size / items.length) * 100 : 0}
          color={packed.size === items.length && items.length > 0 ? 'success' : 'primary'}
          // زمینهٔ پیش‌فرض آن‌قدر پررنگ است که نوارِ خالی «پُر» خوانده می‌شود.
          sx={(theme) => ({
            height: 6,
            borderRadius: 999,
            backgroundColor: alpha(theme.palette.primary.main, 0.16),
          })}
        />
      </Stack>

      {groups.map(([group, groupItems]) => (
        <Paper key={group} sx={{ p: 2 }}>
          <Typography variant="h4" component="h3" gutterBottom>
            {group}
          </Typography>

          <Stack spacing={1}>
            {groupItems.map((item) => {
              const key = `${item.group}/${item.item}`

              return (
                <Stack key={key} spacing={0}>
                  <FormControlLabel
                    control={
                      <Checkbox checked={packed.has(key)} onChange={() => toggle(key)} size="small" />
                    }
                    label={item.item}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ pr: 4 }}>
                    {item.reason}
                  </Typography>
                </Stack>
              )
            })}
          </Stack>
        </Paper>
      ))}
    </Stack>
  )
}

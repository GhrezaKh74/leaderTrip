import type { ComponentType } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import type { SvgIconProps } from '@mui/material/SvgIcon'

import * as icons from './icons'

/**
 * گالری کنترل کیفیت آیکون‌ها — با «/?icons» باز می‌شود.
 *
 * <p>مسیر SVG کور نوشته می‌شود و کور هم خراب می‌شود؛ این صفحه جایی است که هر
 * آیکون تازه یا ویرایش‌شده باید یک‌بار با چشم دیده شود — در سه اندازه، چون
 * خطایی که در ۳۲ پیدا نیست در ۱۶ خودش را نشان می‌دهد.</p>
 */
export function IconGallery() {
  const entries = Object.entries(icons).filter(
    (entry) => typeof entry[1] === 'function',
  ) as [string, ComponentType<SvgIconProps>][]

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))', gap: 1.5 }}>
      {entries.map(([name, Icon]) => (
        <Paper key={name} sx={{ p: 1.5, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', alignItems: 'flex-end', mb: 1 }}>
            <Icon sx={{ fontSize: 32 }} />
            <Icon sx={{ fontSize: 22 }} />
            <Icon sx={{ fontSize: 16 }} />
          </Box>
          <Typography variant="caption" sx={{ direction: 'ltr', display: 'block' }}>
            {name.replace(/Icon$/, '')}
          </Typography>
        </Paper>
      ))}
    </Box>
  )
}

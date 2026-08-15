import { useMemo, type ReactNode } from 'react'
import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import { prefixer } from 'stylis'
import rtlPlugin from 'stylis-plugin-rtl'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'

import { buildTheme } from './theme'

/**
 * کش استایل راست‌به‌چپ.
 *
 * `direction: 'rtl'` در تم فقط به کامپوننت‌ها می‌گوید در کدام جهت بچینند؛ ولی
 * خودِ CSS تولیدشده همچنان `margin-left` و `padding-right` دارد. این افزونه آن
 * قواعد را در زمان تولید آینه می‌کند. بدون آن، ظاهر اپ «تقریباً» درست است — و
 * «تقریباً» در چیدمان یعنی هر جایی که فاصله دارد، در سمت اشتباه باشد.
 *
 * تست `RtlProvider.test.tsx` همین را نگه می‌دارد: بدون آن، خراب‌شدن این
 * پیکربندی هیچ خطایی نمی‌دهد و فقط ظاهر به‌هم می‌ریزد.
 */
const rtlCache = createCache({
  key: 'lt',
  stylisPlugins: [prefixer, rtlPlugin],
})

export function RtlProvider({
  children,
  mode,
}: {
  children: ReactNode
  mode: 'light' | 'dark'
}) {
  const theme = useMemo(() => buildTheme(mode), [mode])

  return (
    <CacheProvider value={rtlCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  )
}

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import Box from '@mui/material/Box'
import { useTheme } from '@mui/material/styles'

import { RtlProvider } from './RtlProvider'
import { surfaces } from './tokens'

function ShowDirection() {
  return <span data-testid="dir">{useTheme().direction}</span>
}

describe('تم راست‌به‌چپ', () => {
  it('جهت تم راست‌به‌چپ است', () => {
    render(
      <RtlProvider mode="light">
        <ShowDirection />
      </RtlProvider>,
    )

    expect(screen.getByTestId('dir')).toHaveTextContent('rtl')
  })

  /**
   * قلب ماجرا این‌جاست و نه در `direction: 'rtl'` تم.
   *
   * تم فقط به کامپوننت‌ها می‌گوید در کدام جهت بچینند؛ ولی CSS تولیدشده همچنان
   * `margin-left` دارد. افزونهٔ `stylis-plugin-rtl` آن را آینه می‌کند. بدون این
   * تست، شکستن آن پیکربندی هیچ خطایی نمی‌دهد — فقط هر فاصله در سمت اشتباه
   * می‌نشیند و کسی تا دیدن اسکرین‌شات متوجه نمی‌شود.
   */
  it('حاشیهٔ چپ در CSS تولیدشده به راست آینه می‌شود', () => {
    render(
      <RtlProvider mode="light">
        <Box data-testid="boxed" sx={{ marginLeft: '11px' }} />
      </RtlProvider>,
    )

    const emitted = [...document.querySelectorAll('style')]
      .map((tag) => tag.textContent ?? '')
      .join('')

    expect(emitted).toContain('margin-right:11px')
    expect(emitted).not.toContain('margin-left:11px')
  })

  it('حالت تاریک پس‌زمینهٔ تیره می‌دهد', () => {
    function ShowBackground() {
      return <span data-testid="bg">{useTheme().palette.background.default}</span>
    }

    render(
      <RtlProvider mode="dark">
        <ShowBackground />
      </RtlProvider>,
    )

    // از توکن می‌خواند، نه literal تکراری: تست باید بگوید «پس‌زمینه از توکن
    // تاریک می‌آید»، نه اینکه مقدار توکن را جای دومی کپی کند.
    expect(screen.getByTestId('bg')).toHaveTextContent(surfaces.dark.background)
  })
})

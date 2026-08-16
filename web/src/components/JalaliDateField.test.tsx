import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { RtlProvider } from '../theme/RtlProvider'
import { JalaliDateField } from './JalaliDateField'

function renderField(value: string, onChange = vi.fn()) {
  render(
    <RtlProvider mode="light">
      <JalaliDateField value={value} onChange={onChange} label="تاریخ حرکت" />
    </RtlProvider>,
  )

  return onChange
}

describe('JalaliDateField', () => {
  it('مقدار ISO میلادی را شمسی نشان می‌دهد', () => {
    renderField('2026-08-16')

    // ۱۶ اوت ۲۰۲۶ = ۲۵ مرداد ۱۴۰۵
    expect(screen.getByLabelText('تاریخ حرکت')).toHaveValue('۲۵ مرداد ۱۴۰۵')
  })

  it('انتخاب روز از تقویم، ISO میلادیِ درست می‌دهد', async () => {
    const user = userEvent.setup()
    const onChange = renderField('2026-08-16')

    await user.click(screen.getByLabelText('تاریخ حرکت'))

    // تقویم روی مرداد ۱۴۰۵ باز می‌شود؛ روز ۱ مرداد = ۲۳ ژوئیه ۲۰۲۶
    expect(screen.getByText('مرداد ۱۴۰۵')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '۱ مرداد ۱۴۰۵' }))

    expect(onChange).toHaveBeenCalledWith('2026-07-23')
  })

  it('پیمایش ماه، مرز سال را درست رد می‌کند', async () => {
    const user = userEvent.setup()
    renderField('2026-03-18') // ۲۷ اسفند ۱۴۰۴

    await user.click(screen.getByLabelText('تاریخ حرکت'))
    expect(screen.getByText('اسفند ۱۴۰۴')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'ماه بعد' }))
    expect(screen.getByText('فروردین ۱۴۰۵')).toBeInTheDocument()
  })

  it('دکمهٔ «امروز» تاریخ امروز را برمی‌گرداند', async () => {
    const user = userEvent.setup()
    const onChange = renderField('2026-08-16')

    await user.click(screen.getByLabelText('تاریخ حرکت'))
    await user.click(screen.getByRole('button', { name: 'امروز' }))

    const today = new Date()
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate(),
    ).padStart(2, '0')}`

    expect(onChange).toHaveBeenCalledWith(iso)
  })
})

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { RtlProvider } from '../../theme/RtlProvider'
import type { CostBreakdown } from '../../api/schemas'
import { CostPanel } from './CostPanel'

const COST: CostBreakdown = {
  lines: [
    { key: 'fuel', label: 'سوخت', amount: 186_608, formula: '210 کیلومتر × 2,100 تومان' },
    { key: 'tickets', label: 'بلیت جاذبه‌ها', amount: 313_392, formula: '1 جاذبه × 2 نفر' },
  ],
  subtotal: 500_000,
  miscellaneous: 40_000,
  riskBuffer: 60_000,
  total: 600_000,
  perPerson: 300_000,
  optimistic: 510_000,
  pessimistic: 750_000,
  overBudget: -400_000,
}

function renderPanel(cost: CostBreakdown, budget: number) {
  return render(
    <RtlProvider mode="light">
      <CostPanel cost={cost} budget={budget} people={2} />
    </RtlProvider>,
  )
}

describe('تفکیک هزینه', () => {
  it('فرمول هر قلم را نشان می‌دهد', () => {
    renderPanel(COST, 1_000_000)

    // ستون فرمول تزئین نیست: بدون آن، عدد فقط قابل باور یا ناباور کردن است.
    expect(screen.getByText(/۲۱۰ کیلومتر × ۲٬۱۰۰ تومان/)).toBeInTheDocument()
    expect(screen.getByText(/۱ جاذبه × ۲ نفر/)).toBeInTheDocument()
  })

  it('باقی‌ماندهٔ بودجه را نشان می‌دهد', () => {
    renderPanel(COST, 1_000_000)

    expect(screen.getByText(/باقی می‌ماند/)).toBeInTheDocument()
  })

  it('بیش از بودجه را هشدار می‌دهد', () => {
    renderPanel({ ...COST, overBudget: 250_000 }, 350_000)

    expect(screen.getByText(/بیشتر از بودجه/)).toBeInTheDocument()
    expect(screen.getByText(/این برنامه از بودجه بیشتر است/)).toBeInTheDocument()
  })

  /**
   * نوار پیشرفت مقدار عددی می‌گیرد، نه رشتهٔ فارسی‌شده. در نسخهٔ اول دقیقاً
   * همین‌جا رشتهٔ فارسی پاس داده شد و نوار همیشه پر بود — بی‌آنکه خطایی بدهد.
   */
  it('نوار بودجه مقدار عددی معتبر می‌گیرد', () => {
    const { container } = renderPanel(COST, 1_000_000)
    const bar = container.querySelector('[role="progressbar"]')

    expect(bar).toHaveAttribute('aria-valuenow', '60')
  })

  it('بدون بودجه، نوار را نشان نمی‌دهد', () => {
    const { container } = renderPanel(COST, 0)

    expect(container.querySelector('[role="progressbar"]')).toBeNull()
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { RtlProvider } from '../../theme/RtlProvider'
import { WizardPage } from './WizardPage'

const REFERENCE = {
  cities: [
    {
      id: 'tehran', name: 'تهران', province: 'تهران', lat: 35.68, lng: 51.38,
      costIndex: 1.3, amenities: 3, climate: 'Plain', canStayOvernight: true,
    },
    {
      id: 'isfahan', name: 'اصفهان', province: 'اصفهان', lat: 32.65, lng: 51.66,
      costIndex: 1, amenities: 3, climate: 'Plain', canStayOvernight: true,
    },
  ],
  vehicles: [
    {
      id: 'sedan-206', label: 'پژو ۲۰۶', class: 'Sedan', fuel: 'Gasoline',
      consumptionPer100Km: 7.2, seats: 5, offroad: 'Paved', depreciationPerKm: 900,
    },
  ],
  prices: {
    subsidizedFuel: { Gasoline: 1500 }, freeMarketFuel: { Gasoline: 3000 },
    tollPerKilometer: 300, freewayShare: 0.45,
    lodgingPerNight: { Balanced: 900000 },
    meals: { Balanced: { breakfast: 150000, lunch: 450000, dinner: 450000 } },
    snackRate: 0.15, miscRate: { Balanced: 0.08 }, bufferRate: { Balanced: 0.12 },
    updatedAt: '۱۴۰۴/۰۵',
  },
}

function renderWizard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <RtlProvider mode="light">
        <WizardPage onPlanReady={() => {}} />
      </RtlProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(REFERENCE), { headers: { 'Content-Type': 'application/json' } }),
    ),
  )
})

afterEach(() => vi.unstubAllGlobals())

describe('ویزارد', () => {
  it('پس از گرفتن دادهٔ مرجع، گام اول را نشان می‌دهد', async () => {
    renderWizard()

    expect(await screen.findByLabelText('شهر مبدأ')).toBeInTheDocument()
    expect(screen.getByText(/به‌روزرسانی ۱۴۰۴\/۰۵/)).toBeInTheDocument()
  })

  it('با ورودی معتبر به گام بعد می‌رود', async () => {
    const user = userEvent.setup()
    renderWizard()
    await screen.findByLabelText('شهر مبدأ')

    await user.click(screen.getByRole('button', { name: 'بعدی' }))

    expect(await screen.findByRole('button', { name: /افزودن همسفر/ })).toBeInTheDocument()
  })

  /**
   * اعتبارسنجی جزئی باید همان‌جا جلوی کاربر را بگیرد. بدون آن، کاربر تا انتهای
   * ویزارد می‌رود و بعد می‌فهمد گام اول ناقص بوده.
   */
  it('با شهر خالی در همان گام می‌ماند', async () => {
    const user = userEvent.setup()
    renderWizard()

    const city = await screen.findByLabelText('شهر مبدأ')
    await user.clear(city)
    await user.click(document.body)
    await user.click(screen.getByRole('button', { name: 'بعدی' }))

    await waitFor(() => {
      expect(screen.getByText('شهر مبدأ را انتخاب کنید.')).toBeInTheDocument()
    })
  })

  /**
   * ورودی HTML همیشه رشته می‌دهد. اگر همان رشته مستقیم وارد فرم شود، اسکیمای
   * `z.number()` آن را رد می‌کند و کاربر پیام «expected number, received
   * string» می‌بیند — که نه فارسی است و نه به او می‌گوید چه کند. این باگ فقط
   * وقتی دیده می‌شد که کسی عدد را دست بزند؛ با مقادیر پیش‌فرض همه‌چیز سالم بود.
   */
  it('ویرایش فیلد عددی، فرم را نامعتبر نمی‌کند', async () => {
    const user = userEvent.setup()
    renderWizard()

    const days = await screen.findByLabelText('چند روز')
    await user.clear(days)
    await user.type(days, '5')
    await user.click(screen.getByRole('button', { name: 'بعدی' }))

    expect(await screen.findByRole('button', { name: /افزودن همسفر/ })).toBeInTheDocument()
    expect(screen.queryByText(/expected number/i)).not.toBeInTheDocument()
  })

  /**
   * «بعدی» نباید فرم را بفرستد. این دقیقاً همان چیزی است که یک‌بار شکست: React
   * همان `<button>` را بین «بعدی» و «ساخت برنامه» بازاستفاده می‌کرد و `type`
   * وسط کلیک از `button` به `submit` می‌رفت.
   */
  it('پیمایش بین گام‌ها هیچ درخواستی برای ساخت برنامه نمی‌فرستد', { timeout: 20_000 }, async () => {
    const user = userEvent.setup()
    renderWizard()
    await screen.findByLabelText('شهر مبدأ')

    // تا وقتی «بعدی» هست جلو می‌رود، پس افزودن گام تازه این تست را بی‌صدا از
    // کار نمی‌اندازد. سقف صریح است تا یک باگ، اجرای تست‌ها را معلق نکند.
    for (let guard = 0; guard < 10; guard += 1) {
      const next = screen.queryByRole('button', { name: 'بعدی' })

      if (next === null) break

      await user.click(next)
    }

    // گام آخر رسیده است ولی هنوز چیزی ارسال نشده.
    expect(await screen.findByRole('button', { name: 'ساخت برنامه' })).toBeInTheDocument()

    const calls = vi.mocked(fetch).mock.calls.map(([url]) => String(url))
    expect(calls.filter((url) => url.includes('/trips/plan'))).toHaveLength(0)
  })

  it('خطای شبکه را با امکان تلاش دوباره نشان می‌دهد', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    renderWizard()

    expect(await screen.findByText(/اتصال به سرور برقرار نشد/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تلاش دوباره' })).toBeInTheDocument()
  })
})

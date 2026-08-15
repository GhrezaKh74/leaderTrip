import { expect, test, type Page } from '@playwright/test'

const REFERENCE = {
  cities: [
    {
      id: 'tehran', name: 'تهران', province: 'تهران', lat: 35.6892, lng: 51.389,
      costIndex: 1.3, amenities: 3, climate: 'Plain', canStayOvernight: true,
    },
  ],
  vehicles: [
    {
      id: 'sedan-206', label: 'پژو ۲۰۶ / ۲۰۷ / کوییک', class: 'Sedan', fuel: 'Gasoline',
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

const PLAN = {
  days: [
    {
      index: 1, date: '2026-05-02', baseCityId: 'tehran', blocks: [],
      kilometers: 210, drivingMinutes: 150, cost: 3_000_000,
    },
  ],
  cost: {
    lines: [{ key: 'fuel', label: 'سوخت', amount: 500_000, formula: '…' }],
    subtotal: 500_000, miscellaneous: 40_000, riskBuffer: 60_000,
    total: 600_000, perPerson: 300_000, optimistic: 510_000, pessimistic: 750_000,
    overBudget: -49_400_000,
  },
  totalKilometers: 210, totalDrivingMinutes: 150, visitCount: 3,
  unscheduledPoiIds: [], distanceSource: 'Estimated',
}

/** شمارندهٔ درخواست ساخت برنامه — قلب ادعای این تست. */
async function stubApi(page: Page): Promise<{ planCalls: () => number }> {
  let planCalls = 0

  await page.route('**/api/reference', (route) =>
    route.fulfill({ json: REFERENCE }),
  )

  await page.route('**/api/trips/plan', (route) => {
    planCalls += 1

    return route.fulfill({ json: PLAN })
  })

  return { planCalls: () => planCalls }
}

// هر تست در Playwright بستر مرورگر تازه‌ای می‌گیرد، پس `localStorage` از قبل
// خالی است. پاک‌کردن دستی‌اش با `addInitScript` اشتباه بود: آن اسکریپت در هر
// ناوبری — از جمله `reload()` — دوباره اجرا می‌شود و همان چیزی را پاک می‌کرد که
// تستِ ماندگاری تم می‌خواست بسنجد.

test('صفحه راست‌به‌چپ بالا می‌آید و گام اول را نشان می‌دهد', async ({ page }) => {
  await stubApi(page)
  await page.goto('/')

  await expect(page.getByRole('combobox', { name: 'شهر مبدأ' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
})

/**
 * این تست دقیقاً همان باگی را می‌گیرد که jsdom نمی‌گرفت.
 *
 * بدون `key` متفاوت روی دکمه‌های «بعدی» و «ساخت برنامه»، React همان `<button>`
 * را بازاستفاده می‌کند و `type` وسط کلیک عوض می‌شود؛ نتیجه‌اش این است که کاربر
 * با کلیک روی «بعدی» در گام سوم، مستقیم به برنامهٔ ساخته‌شده می‌رسد و گام
 * «سبک سفر» را هرگز نمی‌بیند — بی‌هیچ خطایی، چون مقادیر پیش‌فرض معتبرند.
 */
test('پیمایش تا گام آخر هیچ برنامه‌ای نمی‌سازد', async ({ page }) => {
  const { planCalls } = await stubApi(page)
  await page.goto('/')
  await expect(page.getByRole('combobox', { name: 'شهر مبدأ' })).toBeVisible()

  for (let step = 0; step < 3; step += 1) {
    await page.getByRole('button', { name: 'بعدی' }).click()
  }

  await expect(page.getByRole('button', { name: 'ساخت برنامه' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'تاریخی' })).toBeVisible()
  expect(planCalls()).toBe(0)
})

test('ویرایش عدد و ساخت برنامه تا انتها کار می‌کند', async ({ page }) => {
  const { planCalls } = await stubApi(page)
  await page.goto('/')

  await page.getByLabel('چند روز', { exact: true }).fill('4')
  await page.getByLabel('بودجهٔ کل', { exact: true }).fill('75000000')
  await expect(page.getByText('۷۵.۰ میلیون تومان')).toBeVisible()

  for (let step = 0; step < 3; step += 1) {
    await page.getByRole('button', { name: 'بعدی' }).click()
  }

  await page.getByRole('button', { name: 'تاریخی' }).click()
  await page.getByRole('button', { name: 'ساخت برنامه' }).click()

  await expect(page.getByRole('heading', { name: /برنامهٔ/ })).toBeVisible()
  expect(planCalls()).toBe(1)
})

test('حالت تاریک بین بارگذاری‌ها می‌ماند', async ({ page }) => {
  await stubApi(page)
  await page.goto('/')
  await expect(page.getByRole('combobox', { name: 'شهر مبدأ' })).toBeVisible()

  await page.getByRole('button', { name: 'حالت تاریک' }).click()
  await page.reload()

  await expect(page.getByRole('button', { name: 'حالت روشن' })).toBeVisible()
})

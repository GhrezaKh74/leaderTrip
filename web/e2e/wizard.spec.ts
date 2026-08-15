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
      index: 1,
      date: '2026-05-02',
      baseCityId: 'tehran',
      blocks: [
        {
          kind: 'Drive', startsAt: '08:00', durationMinutes: 116, title: 'حرکت به کاخ گلستان',
          cost: 186_608, poiId: null, kilometers: 157, note: null,
        },
        {
          kind: 'Visit', startsAt: '09:56', durationMinutes: 108, title: 'کاخ گلستان',
          cost: 300_000, poiId: 'golestan', kilometers: null, note: null,
        },
      ],
      kilometers: 210, drivingMinutes: 150, cost: 486_608,
    },
  ],
  cost: {
    lines: [
      { key: 'fuel', label: 'سوخت', amount: 186_608, formula: '210 کیلومتر × 7.2 لیتر × 2,100 تومان' },
      { key: 'tickets', label: 'بلیت جاذبه‌ها', amount: 313_392, formula: '1 جاذبهٔ بلیت‌دار × 2 نفر معادل' },
    ],
    subtotal: 500_000, miscellaneous: 40_000, riskBuffer: 60_000,
    total: 600_000, perPerson: 300_000, optimistic: 510_000, pessimistic: 750_000,
    overBudget: -49_400_000,
  },
  totalKilometers: 210, totalDrivingMinutes: 150, visitCount: 1,
  unscheduledPoiIds: [], distanceSource: 'Estimated',
}

const POIS = {
  total: 1,
  items: [
    {
      id: 'golestan', name: 'کاخ گلستان', cityId: 'tehran', lat: 35.6797, lng: 51.42,
      category: 'Historical', rating: 4.7, visitMinutes: 120, ticket: 300_000,
      bestMonths: [1, 2, 3], indoor: true, difficulty: 'Light', minAge: 0,
      kidFriendly: true, seniorFriendly: true, requiredVehicle: 'Paved',
      nightSuitable: false, tags: ['یونسکو'], description: 'کاخ قاجاری.',
    },
  ],
}

/** شمارندهٔ درخواست ساخت برنامه — قلب ادعای این تست. */
async function stubApi(page: Page): Promise<{ planCalls: () => number }> {
  let planCalls = 0

  await page.route('**/api/reference', (route) =>
    route.fulfill({ json: REFERENCE }),
  )

  await page.route('**/api/pois*', (route) => route.fulfill({ json: POIS }))

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

/** رفتن تا برنامهٔ ساخته‌شده — پایهٔ تست‌های نمایش برنامه. */
async function generatePlan(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page.getByRole('combobox', { name: 'شهر مبدأ' })).toBeVisible()

  for (let step = 0; step < 3; step += 1) {
    await page.getByRole('button', { name: 'بعدی' }).click()
  }

  await page.getByRole('button', { name: 'ساخت برنامه' }).click()
  await expect(page.getByRole('heading', { name: /برنامهٔ/ })).toBeVisible()
}

test('برنامهٔ روزانه با ساعت و هزینهٔ هر بلوک نشان داده می‌شود', async ({ page }) => {
  await stubApi(page)
  await generatePlan(page)

  await expect(page.getByText('کاخ گلستان', { exact: true })).toBeVisible()
  await expect(page.getByText('۰۹:۵۶')).toBeVisible()

  // هزینهٔ روز باید واقعی باشد. «۰ تومان» روی صفحه یعنی «رایگان» — دقیقاً همان
  // چیزی که پیش از پخش هزینه روی روزها نمایش داده می‌شد.
  await expect(page.getByText(/۴۸۶٬۶۰۸ تومان/)).toBeVisible()
})

test('تفکیک هزینه فرمول هر قلم را با ارقام فارسی نشان می‌دهد', async ({ page }) => {
  await stubApi(page)
  await generatePlan(page)

  await page.getByRole('tab', { name: 'هزینه' }).click()

  await expect(page.getByText('سوخت', { exact: true })).toBeVisible()
  // فرمول از بک‌اند با ارقام لاتین می‌آید؛ شکل‌دادنش کار لایهٔ نمایش است.
  await expect(page.getByText(/۲۱۰ کیلومتر × ۷.۲ لیتر × ۲٬۱۰۰ تومان/)).toBeVisible()
  await expect(page.getByText(/باقی می‌ماند/)).toBeVisible()
})

/**
 * در شبکه‌های فیلترشده کاشی‌های نقشه نمی‌آیند و هیچ رویداد خطایی هم نمی‌رسد.
 * بدون این رفتار، کاربر فقط یک مستطیل خاکستری بی‌توضیح می‌بیند.
 */
test('نبودِ کاشی نقشه، فهرست توقف‌ها را از بین نمی‌برد', async ({ page }) => {
  await stubApi(page)
  await page.route('**/tile.openstreetmap.org/**', (route) => route.abort())
  await generatePlan(page)

  await page.getByRole('tab', { name: 'نقشه' }).click()

  await expect(page.getByText('ترتیب توقف‌ها', { exact: true })).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'کاخ گلستان' })).toBeVisible()
  await expect(page.getByText(/کاشی‌های نقشه بارگذاری نشدند/)).toBeVisible({ timeout: 15_000 })
})

test('حالت تاریک بین بارگذاری‌ها می‌ماند', async ({ page }) => {
  await stubApi(page)
  await page.goto('/')
  await expect(page.getByRole('combobox', { name: 'شهر مبدأ' })).toBeVisible()

  await page.getByRole('button', { name: 'حالت تاریک' }).click()
  await page.reload()

  await expect(page.getByRole('button', { name: 'حالت روشن' })).toBeVisible()
})

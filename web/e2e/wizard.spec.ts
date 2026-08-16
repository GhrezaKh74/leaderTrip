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
  advice: [
    {
      code: 'driving.fatigue', level: 'Warning', title: 'رانندگی طولانی',
      detail: 'روز ۱ حدود ۶ ساعت رانندگی دارد.',
    },
  ],
  packing: [
    { group: 'خودرو', item: 'زنجیر چرخ', reason: 'جادهٔ کوهستانی در زمستان ممکن است زنجیر بخواهد' },
  ],
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

  await page.route('**/api/trips/optimize', (route) =>
    route.fulfill({
      json: {
        baseline: 600_000,
        levers: [
          {
            id: 'camp',
            title: 'اقامت: کمپینگ به‌جای اقامتگاه',
            detail: 'هزینهٔ اقامت تقریباً حذف می‌شود.',
            saving: 120_000,
            patch: { lodging: 'Camp' },
          },
        ],
      },
    }),
  )

  // عکس چک‌این: بارگذاری شناسه می‌دهد و همان شناسه قابل‌گرفتن است.
  const photoId = `${'a'.repeat(32)}.jpg`
  const jpegPixel = Buffer.from(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==',
    'base64',
  )

  await page.route('**/api/photos', (route) =>
    route.fulfill({ json: { id: photoId, url: `/api/photos/${photoId}` } }),
  )

  await page.route(`**/api/photos/${photoId}`, (route) =>
    route.fulfill({ body: jpegPixel, contentType: 'image/jpeg' }),
  )

  // پنل مدیریت
  await page.route('**/api/admin/overview', (route) =>
    route.fulfill({
      json: {
        storageMode: 'Seed',
        cities: 2,
        pois: 3,
        vehicles: 1,
        pricesUpdatedAt: '1404/05',
        photoCount: 1,
        photoBytes: 12_345,
        routingEnabled: false,
        weatherEnabled: true,
        discoveryEnabled: false,
        requestsPerMinute: 60,
        planRequestsPerMinute: 10,
      },
    }),
  )

  await page.route('**/api/admin/photos*', (route) =>
    route.fulfill({
      json: {
        items: [{ id: photoId, bytes: 12_345, createdAt: '2026-08-16T10:00:00Z' }],
        totalCount: 1,
        totalBytes: 12_345,
      },
    }),
  )

  await page.route('**/api/admin/prices', (route) =>
    route.fulfill({
      json: { version: 2, effectiveFrom: '2026-08-16T10:00:00Z', updatedAt: '1405/05' },
    }),
  )

  // حساب کاربری: ثبت‌نام/ورود توکن می‌دهد؛ سفرهای ذخیره‌شده حالت‌دارند تا
  // «ذخیره» و «فهرست» با هم بخوانند.
  const authUser = { id: 'u1', email: 'reza@example.com', displayName: 'رضا' }
  let savedTrips: { id: string; title: string; payload: string; updatedAt: string }[] = []

  await page.route('**/api/auth/register', (route) =>
    route.fulfill({ json: { token: 'test-token', user: authUser } }),
  )

  await page.route('**/api/auth/login', (route) =>
    route.fulfill({ json: { token: 'test-token', user: authUser } }),
  )

  await page.route('**/api/me/trips', (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { title: string; payload: string }
      const trip = {
        id: 'b'.repeat(32),
        title: body.title,
        payload: body.payload,
        updatedAt: '2026-08-16T10:00:00Z',
      }

      savedTrips = [trip]

      return route.fulfill({ json: trip })
    }

    return route.fulfill({ json: savedTrips })
  })

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

  // تا وقتی «بعدی» هست کلیک می‌شود: افزودن گام تازه نباید تست را بی‌صدا
  // از کار بیندازد.
  while ((await page.getByRole('button', { name: 'بعدی' }).count()) > 0) {
    await page.getByRole('button', { name: 'بعدی' }).click()
  }

  await expect(page.getByRole('button', { name: 'ساخت برنامه' })).toBeVisible()
  // گام آخر «جاذبه‌ها» است — رسیدن به آن یعنی هیچ گامی دور زده نشده.
  await expect(page.getByLabel('جست‌وجوی جاذبه')).toBeVisible()
  expect(planCalls()).toBe(0)
})

test('ویرایش عدد و ساخت برنامه تا انتها کار می‌کند', async ({ page }) => {
  const { planCalls } = await stubApi(page)
  await page.goto('/')

  await page.getByLabel('چند روز', { exact: true }).fill('4')
  await page.getByLabel('بودجهٔ کل', { exact: true }).fill('75000000')
  await expect(page.getByText('۷۵.۰ میلیون تومان')).toBeVisible()

  // تا وقتی «بعدی» هست کلیک می‌شود: افزودن گام تازه نباید تست را بی‌صدا
  // از کار بیندازد.
  while ((await page.getByRole('button', { name: 'بعدی' }).count()) > 0) {
    await page.getByRole('button', { name: 'بعدی' }).click()
  }

  await page.getByRole('button', { name: 'ساخت برنامه' }).click()

  await expect(shown(page).getByRole('heading', { name: /برنامهٔ/ })).toBeVisible()
  expect(planCalls()).toBe(1)
})

/**
 * بخش تعاملی صفحه.
 *
 * نسخهٔ چاپی همان متن‌ها را در DOM دارد (پنهان، تا هنگام چاپ ظاهر شود)، پس
 * ادعاها باید به بخش دیده‌شده محدود شوند وگرنه به عنصر پنهان می‌رسند.
 */
const shown = (page: Page) => page.locator('.no-print')

/** رفتن تا برنامهٔ ساخته‌شده — پایهٔ تست‌های نمایش برنامه. */
async function generatePlan(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page.getByRole('combobox', { name: 'شهر مبدأ' })).toBeVisible()

  // تا وقتی «بعدی» هست کلیک می‌شود: افزودن گام تازه نباید تست را بی‌صدا
  // از کار بیندازد.
  while ((await page.getByRole('button', { name: 'بعدی' }).count()) > 0) {
    await page.getByRole('button', { name: 'بعدی' }).click()
  }

  await page.getByRole('button', { name: 'ساخت برنامه' }).click()
  await expect(shown(page).getByRole('heading', { name: /برنامهٔ/ })).toBeVisible()
}

test('برنامهٔ روزانه با ساعت و هزینهٔ هر بلوک نشان داده می‌شود', async ({ page }) => {
  await stubApi(page)
  await generatePlan(page)

  await expect(shown(page).getByText('کاخ گلستان', { exact: true }).first()).toBeVisible()
  await expect(shown(page).getByText('۰۹:۵۶').first()).toBeVisible()

  // هزینهٔ روز باید واقعی باشد. «۰ تومان» روی صفحه یعنی «رایگان» — دقیقاً همان
  // چیزی که پیش از پخش هزینه روی روزها نمایش داده می‌شد.
  await expect(shown(page).getByText(/۴۸۶٬۶۰۸ تومان/).first()).toBeVisible()
})

test('تفکیک هزینه فرمول هر قلم را با ارقام فارسی نشان می‌دهد', async ({ page }) => {
  await stubApi(page)
  await generatePlan(page)

  await page.getByRole('tab', { name: 'هزینه', exact: true }).click()

  await expect(shown(page).getByText('سوخت', { exact: true }).first()).toBeVisible()
  // فرمول از بک‌اند با ارقام لاتین می‌آید؛ شکل‌دادنش کار لایهٔ نمایش است.
  await expect(shown(page).getByText(/۲۱۰ کیلومتر × ۷.۲ لیتر × ۲٬۱۰۰ تومان/).first()).toBeVisible()
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

/**
 * جبران آفلاین — همان چیزی که با رفتن موتور به سرور از دست رفت و در سند ۶
 * وعده داده شد.
 *
 * ساختن برنامه آنلاین است؛ دیدنش — که کار اصلی در جاده است — نباید باشد.
 */
test('برنامهٔ ساخته‌شده پس از قطع اینترنت هم باز می‌شود', async ({ page, context }) => {
  await stubApi(page)
  await generatePlan(page)

  // سرویس‌ورکر باید پیش از قطع شبکه فعال شده باشد، وگرنه بارگذاری دوباره
  // اصلاً به اپ نمی‌رسد که کش برنامه را بخواند.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))

  await context.setOffline(true)
  await page.reload()

  // ویزارد نباید برگردد: کسی که در جاده اپ را باز می‌کند، برنامهٔ دیروزش را
  // می‌خواهد ببیند، نه فرم خالی.
  await expect(shown(page).getByRole('heading', { name: /برنامهٔ/ })).toBeVisible()
  await expect(shown(page).getByText('کاخ گلستان', { exact: true }).first()).toBeVisible()
  await expect(page.getByText(/آفلاین هستید/)).toBeVisible()

  // تفکیک هزینه هم باید کامل باشد، نه فقط عنوان.
  await page.getByRole('tab', { name: 'هزینه', exact: true }).click()
  await expect(shown(page).getByText('سوخت', { exact: true }).first()).toBeVisible()

  await context.setOffline(false)
})

test('هشدارها و چک‌لیست با دلیل هرکدام نشان داده می‌شوند', async ({ page }) => {
  await stubApi(page)
  await generatePlan(page)

  await page.getByRole('tab', { name: /هشدارها/ }).click()
  await expect(shown(page).getByText('رانندگی طولانی').first()).toBeVisible()

  await page.getByRole('tab', { name: 'چک‌لیست' }).click()
  await expect(shown(page).getByText('زنجیر چرخ').first()).toBeVisible()
  // ستون «چرا» همان چیزی است که چک‌لیست را از فهرست عمومی جدا می‌کند.
  await expect(shown(page).getByText(/جادهٔ کوهستانی در زمستان/).first()).toBeVisible()
})

test('راه‌های کاهش هزینه با عدد صرفه‌جویی نشان داده می‌شوند', async ({ page }) => {
  await stubApi(page)
  await generatePlan(page)

  await page.getByRole('tab', { name: 'کاهش هزینه' }).click()
  await page.getByRole('button', { name: /محاسبهٔ راه‌های کاهش/ }).click()

  await expect(page.getByText(/کمپینگ به‌جای اقامتگاه/)).toBeVisible()
  await expect(page.getByText('−۱۲۰٬۰۰۰ تومان')).toBeVisible()
})

test('حین سفر: چک‌این، هزینهٔ واقعی و تسویه‌حساب', async ({ page }) => {
  await stubApi(page)
  await generatePlan(page)

  await page.getByRole('tab', { name: 'حین سفر' }).click()

  // ساعت واقعی رسیدن، اختلاف با برنامه را نشان می‌دهد.
  await page.getByLabel('ساعت واقعی').first().fill('10:30')
  await expect(page.getByText(/دیرتر/)).toBeVisible()

  // پیوست عکس: بندانگشتی از سرور می‌آید و دکمهٔ پیوست جایش را می‌دهد.
  await page
    .locator('input[type="file"][accept="image/*"]')
    .first()
    .setInputFiles({ name: 'checkin.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]) })
  await expect(page.locator('img[alt^="عکس"]').first()).toBeVisible()

  await page.getByLabel('بابت').fill('شام')
  await page.getByLabel('مبلغ', { exact: true }).fill('300000')
  await page.getByRole('button', { name: 'افزودن' }).click()

  await expect(page.getByText(/شام — ۳۰۰٬۰۰۰ تومان/)).toBeVisible()
  await expect(page.getByText(/کمترین تعداد جابه‌جایی پول/)).toBeVisible()
})

test('حالت تاریک بین بارگذاری‌ها می‌ماند', async ({ page }) => {
  await stubApi(page)
  await page.goto('/')
  await expect(page.getByRole('combobox', { name: 'شهر مبدأ' })).toBeVisible()

  await page.getByRole('button', { name: 'حالت تاریک' }).click()
  await page.reload()

  await expect(page.getByRole('button', { name: 'حالت روشن' })).toBeVisible()
})

test('پنل مدیریت: ورود با کلید، نمای کلی، قیمت‌ها و عکس‌ها', async ({ page }) => {
  await stubApi(page)
  await page.goto('/?admin')

  // بدون کلید، فقط فرم ورود
  await page.getByLabel('کلید مدیریتی').fill('test-admin-key')
  await page.getByRole('button', { name: 'ورود', exact: true }).click()

  // نمای کلی از پاسخ سرور پر می‌شود
  await expect(page.getByText('دادهٔ همراه برنامه')).toBeVisible()
  await expect(page.getByText('هواشناسی: روشن')).toBeVisible()
  await expect(page.getByText('مسیریابی: خاموش')).toBeVisible()

  // فرم قیمت از دادهٔ مرجع زنده پر شده و انتشار پاسخ موفق می‌گیرد
  await expect(page.getByText('دفترچهٔ قیمت')).toBeVisible()
  await page.getByRole('button', { name: 'انتشار نسخهٔ تازه' }).click()
  await expect(page.getByText(/منتشر شد/)).toBeVisible()

  // عکس ذخیره‌شده با حجمش فهرست می‌شود
  await expect(page.locator('img[alt^="عکس"]')).toBeVisible()
  await expect(page.getByText(/کیلوبایت/).first()).toBeVisible()
})

test('حساب کاربری: ثبت‌نام، ذخیرهٔ سفر روی حساب و بارگذاری دوباره', async ({ page }) => {
  await stubApi(page)
  await generatePlan(page)

  // ثبت‌نام از سرصفحه
  await page.getByRole('button', { name: 'ورود به حساب' }).click()
  await page.getByRole('tab', { name: 'ثبت‌نام' }).click()
  await page.getByLabel('نام نمایشی').fill('رضا')
  await page.getByLabel('ایمیل').fill('reza@example.com')
  await page.getByLabel('گذرواژه').fill('12345678')
  await page.getByRole('button', { name: 'ساخت حساب' }).click()

  // پس از ورود، منوی حساب با نام کاربر باز می‌شود
  await page.getByRole('button', { name: 'حساب کاربری' }).click()
  await expect(page.getByText('reza@example.com')).toBeVisible()
  await page.getByRole('menuitem', { name: 'سفرهای من' }).click()

  // ذخیرهٔ سفر فعلی و دیدنش در فهرست
  await page.getByRole('button', { name: 'ذخیرهٔ سفر فعلی' }).click()
  await expect(page.getByText(/سفر ۳ روزه/)).toBeVisible()

  // بارگذاری، کاربر را با همان ورودی به ویزارد برمی‌گرداند
  await page.getByRole('button', { name: 'بارگذاری' }).click()
  await expect(page.getByRole('combobox', { name: 'شهر مبدأ' })).toBeVisible()
  await expect(page.getByText('سفر از حساب بارگذاری شد', { exact: false })).toBeVisible()
})

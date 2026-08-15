import { defineConfig, devices } from '@playwright/test'

/**
 * تست مرورگر واقعی.
 *
 * <p>چرا وقتی تست‌های jsdom هست: باگی که در فاز ف‌۱ پیدا شد در jsdom اصلاً
 * بازتولید نمی‌شد. React همان عنصر `<button>` را بین «بعدی» و «ساخت برنامه»
 * بازاستفاده می‌کرد و `type` آن وسط کلیک از `button` به `submit` می‌رفت؛ در
 * مرورگر واقعی، `mouseup` روی دکمه‌ای می‌نشست که حالا دکمهٔ ارسال بود و فرم
 * فرستاده می‌شد. jsdom این ترتیب رویدادها را ندارد و سبز می‌ماند.</p>
 *
 * <p>بک‌اند لازم نیست: پاسخ‌های `/api` در خود تست جعل می‌شوند. یعنی این تست در
 * CI هم بدون پایگاه داده و بدون شبکه اجرا می‌شود.</p>
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // مرورگر از پیش نصب‌شدهٔ محیط استفاده می‌شود، نه دانلود تازه.
        launchOptions: process.env['CHROMIUM_PATH']
          ? { executablePath: process.env['CHROMIUM_PATH'] }
          : {},
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
})

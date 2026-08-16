import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

/**
 * تست‌های نسخهٔ اول — فقط همین ریشه.
 *
 * بدون این پیکربندی، vitest با الگوی پیش‌فرضش فایل‌های تست `web/` (نسخهٔ
 * بازنویسی) را هم برمی‌دارد؛ وابستگی‌های آن‌ها این‌جا نصب نیست و بیلدِ
 * Dockerfile ریشه — که تست را بخشی از بیلد می‌داند — بی‌دلیل قرمز می‌شود.
 * هر اپ، تست‌های خودش را با وابستگی‌های خودش اجرا می‌کند.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    exclude: [...configDefaults.exclude, 'web/**', 'backend/**'],
  },
})

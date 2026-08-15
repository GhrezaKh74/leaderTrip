import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// در توسعه، درخواست‌های /api به بک‌اند .NET پروکسی می‌شوند. یعنی مرورگر همه‌چیز
// را از یک مبدأ می‌بیند و CORS اصلاً وارد ماجرا نمی‌شود — نه در توسعه لازم است
// بازش کنیم، نه در تولید فراموش می‌کنیم ببندیمش.
export default defineConfig({
  plugins: [react()],
  build: {
    // بستهٔ MUI و React جدا از کد اپ باشند: با هر انتشار، فقط تکهٔ کوچکِ کد ما
    // تغییر می‌کند و کتابخانه‌ها در کش مرورگر کاربر می‌مانند.
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@mui') || id.includes('@emotion')) return 'mui'
          if (id.includes('react-dom') || id.includes('/react/')) return 'react'

          return 'vendor'
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET ?? 'http://127.0.0.1:5199',
        changeOrigin: true,
      },
    },
  },
  test: {
    // تست‌های Playwright در `e2e/` با runner خودشان اجرا می‌شوند؛ اگر Vitest هم
    // برشان دارد، با خطای گیج‌کنندهٔ «test() اینجا انتظار نمی‌رفت» شکست می‌خورند.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})

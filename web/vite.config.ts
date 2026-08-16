import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * فهرست دارایی‌های بیلد را داخل سرویس‌ورکر می‌نویسد.
 *
 * نام فایل‌ها هش دارند و پیش از بیلد معلوم نیستند، پس این تنها راه دقیق است.
 * جایگزینش — «هرچه گرفته شد را کش کن» — در بازدید اول کار نمی‌کند و آفلاین
 * فقط از دفعهٔ دوم فعال می‌شود.
 */
function precachePlugin(): Plugin {
  return {
    name: 'leadertrip-precache',
    apply: 'build',
    writeBundle(options, bundle) {
      const outDir = options.dir ?? 'dist'
      const swPath = join(outDir, 'sw.js')

      const assets = Object.keys(bundle)
        .filter((name) => /\.(js|css|woff2?)$/.test(name))
        .map((name) => `/${name}`)

      const shell = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', ...assets]

      const source = readFileSync(swPath, 'utf8')
      writeFileSync(swPath, `self.__PRECACHE__ = ${JSON.stringify(shell)}\n${source}`, 'utf8')
    },
  }
}

// در توسعه، درخواست‌های /api به بک‌اند .NET پروکسی می‌شوند. یعنی مرورگر همه‌چیز
// را از یک مبدأ می‌بیند و CORS اصلاً وارد ماجرا نمی‌شود — نه در توسعه لازم است
// بازش کنیم، نه در تولید فراموش می‌کنیم ببندیمش.
export default defineConfig({
  plugins: [react(), precachePlugin()],
  build: {
    // بستهٔ MUI و React جدا از کد اپ باشند: با هر انتشار، فقط تکهٔ کوچکِ کد ما
    // تغییر می‌کند و کتابخانه‌ها در کش مرورگر کاربر می‌مانند.
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (!id.includes('node_modules')) return undefined
          // نقشهٔ برداری خودمیزبان: سنگین و تنبل‌بار — نباید داخل vendor برود
          // وگرنه از همان بازدید اول بار می‌شود.
          if (
            id.includes('maplibre') ||
            id.includes('pmtiles') ||
            id.includes('protomaps') ||
            id.includes('rtl-text')
          ) {
            return 'maplibre'
          }
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
    // تست داخل بیلد است و بیلد گاهی روی سرور اشتراکیِ کند اجرا می‌شود
    // (هاست پنلی)؛ تستی که روی ماشین معمولی نیم‌ثانیه است، آن‌جا ۷ ثانیه
    // می‌شود و سقف ۵ ثانیه‌ایِ پیش‌فرض، بیلد سالم را می‌شکند.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})

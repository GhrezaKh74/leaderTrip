import { describe, expect, it } from 'vitest'

// با `?raw` خوانده می‌شوند نه با fs: این‌طور تست به تایپ‌های node نیاز ندارد
// و مسیرها را خود Vite حل می‌کند، نه حدسِ __dirname.
import headers from '../docker/security-headers.conf?raw'
import indexHtml from '../index.html?raw'
import viteConfig from '../vite.config.ts?raw'

/**
 * نگهبانان پوستهٔ اپ — دو قاعده که شکستنشان سایت را می‌خواباند و هیچ تست
 * دیگری نمی‌گیردشان.
 *
 * <p>چرا این فایل هست: هر دو قاعده یک‌بار در تولید شکسته شدند و هیچ تستی
 * قرمز نشد. سرور توسعه و `vite preview` هدر CSP نمی‌فرستند، پس اسکریپت
 * درون‌خطیِ بلوک‌شده فقط پشت nginx دیده می‌شود — یعنی دقیقاً جایی که کاربر
 * است و تست نیست.</p>
 */

describe('پوستهٔ index.html در برابر CSP', () => {
  it('هیچ اسکریپت درون‌خطی ندارد', () => {
    // `script-src 'self'` هر <script> بی‌src را بی‌صدا بلوک می‌کند. اگر روزی
    // درون‌خطی لازم شد، یا هش‌ش را به همان دستور اضافه کنید یا فایلش کنید.
    const inline = [...indexHtml.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>/g)].map((m) => m[0])

    expect(inline).toEqual([])
  })

  it('دستور script-src هنوز درون‌خطی را نمی‌پذیرد', () => {
    // اگر این تست شکست، یعنی کسی 'unsafe-inline' را باز کرده — که سپر XSS کل
    // اپ را برمی‌دارد. تست بالا آن‌وقت بی‌معنی می‌شود، پس این‌جا هم می‌ایستیم.
    expect(headers).not.toContain("'unsafe-inline'; script-src")
    expect(/script-src[^;]*'unsafe-inline'/.test(headers)).toBe(false)
  })
})

describe('پوستهٔ اسپلش در برابر آفلاین', () => {
  it('هر اسکریپت خارجیِ index.html پیش‌کش می‌شود', () => {
    // فایل‌های `public/` در باندل رول‌آپ نیستند، پس خودکار وارد فهرست
    // پیش‌کش نمی‌شوند. اسکریپتی که آفلاین ۴۰۴ شود یعنی اسپلشی که بسته
    // نمی‌شود و اپی که زیرش دفن است.
    const sources = [...indexHtml.matchAll(/<script[^>]*\bsrc="(\/[^"]+)"/g)].map((m) => m[1])
    const local = sources.filter((src) => src !== undefined && !src.startsWith('/src/'))

    expect(local.length).toBeGreaterThan(0)

    for (const src of local) {
      expect(viteConfig, `${src} در فهرست پیش‌کش سرویس‌ورکر نیست`).toContain(`'${src}'`)
    }
  })

  it('اسپلش یک راه خروج بدون جاوااسکریپت دارد', () => {
    // آخرین خط دفاع: اگر هیچ اسکریپتی اجرا نشد، خود CSS روکش را کنار بزند.
    expect(indexHtml).toContain('splash-timeout')
    expect(indexHtml).toMatch(/animation:\s*splash-timeout/)
  })
})

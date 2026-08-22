/**
 * ثبت سرویس‌ورکر — فقط در تولید.
 *
 * در توسعه ثبت نمی‌شود، چون کشِ سرویس‌ورکر با بارگذاری داغ Vite می‌جنگد و
 * نتیجه‌اش ساعت‌ها دنبال باگی گشتن است که وجود ندارد.
 *
 * <p>اعلام نسخهٔ تازه: سرویس‌ورکر ما skipWaiting دارد، پس نسخهٔ تازه بی‌درنگ
 * فعال می‌شود — ولی صفحهٔ باز هنوز باندل قدیمی را اجرا می‌کند. بدون اعلام،
 * کاربر PWA تا ابد روی نسخهٔ کهنه می‌ماند و هیچ‌وقت نمی‌فهمد. رویداد
 * <code>leadertrip:update-ready</code> به اپ می‌گوید دکمهٔ «بارگذاری دوباره»
 * نشان بدهد.</p>
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    // شکست ثبت نباید چیزی را خراب کند: اپ بدون سرویس‌ورکر هم کامل کار می‌کند،
    // فقط آفلاین باز نمی‌شود.
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const fresh = registration.installing

          if (fresh === null) return

          fresh.addEventListener('statechange', () => {
            // «فعال شد» + «صفحه از قبل کنترل‌کننده داشت» = این یک به‌روزرسانی
            // است، نه نصب اول. نصب اول اعلام نمی‌خواهد.
            if (fresh.state === 'activated' && navigator.serviceWorker.controller !== null) {
              window.dispatchEvent(new CustomEvent('leadertrip:update-ready'))
            }
          })
        })
      })
      .catch(() => undefined)
  })
}

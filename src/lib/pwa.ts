/**
 * ثبت سرویس‌ورکر — فقط در نسخهٔ تولید.
 * شکستش هیچ اثری بر کارکرد اپ ندارد؛ آفلاین یک امتیاز است، نه یک پیش‌نیاز.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* بی‌اهمیت — اپ بدون کش آفلاین هم کار می‌کند */
    })
  })
}

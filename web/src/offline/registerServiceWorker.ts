/**
 * ثبت سرویس‌ورکر — فقط در تولید.
 *
 * در توسعه ثبت نمی‌شود، چون کشِ سرویس‌ورکر با بارگذاری داغ Vite می‌جنگد و
 * نتیجه‌اش ساعت‌ها دنبال باگی گشتن است که وجود ندارد.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    // شکست ثبت نباید چیزی را خراب کند: اپ بدون سرویس‌ورکر هم کامل کار می‌کند،
    // فقط آفلاین باز نمی‌شود.
    navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}

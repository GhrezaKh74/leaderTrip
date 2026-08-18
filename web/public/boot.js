// بوت پیش از رندر — عمداً بیرون از index.html.
//
// این کد قبلاً درون‌خطی بود و CSP (`script-src 'self'`) بی‌صدا بلوکش می‌کرد:
// اسپلش هرگز کنار نمی‌رفت و اپِ سالم زیرش دفن می‌شد. فایل جدا یعنی 'self'
// پوششش می‌دهد و دیگر با هر ویرایش نمی‌شکند.
//
// باید بدون defer/async در <head> بیاید تا پیش از نقاشی body اجرا شود.
(function () {
  try {
    // اسپلش فقط بار اول: از بازدید دوم به بعد، کاربر اپ را می‌شناسد و اسپلش
    // فقط بین او و کارش می‌ایستد.
    if (localStorage.getItem('leadertrip.theme') !== 'light') {
      // پس‌زمینهٔ تیره همین‌جا ست می‌شود که در فاصلهٔ بارشدن باندل، صفحهٔ
      // سفید برق نزند.
      document.documentElement.style.background = '#0a1120'
    }
    if (localStorage.getItem('leadertrip.splash.seen') === '1') {
      document.documentElement.classList.add('no-splash')
    } else {
      localStorage.setItem('leadertrip.splash.seen', '1')
    }
  } catch (e) {
    /* حالت خصوصی: اسپلش مثل بار اول نشان داده می‌شود */
  }
})()

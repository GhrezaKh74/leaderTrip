// بستن اسپلش — عمداً بیرون از index.html (همان دلیل boot.js: CSP).
//
// سه راه خروج دارد و هر سه باید زنده بمانند؛ وقتی این کد درون‌خطی بود و CSP
// بلوکش کرد، هر سه با هم مردند و اسپلش تا ابد ماند. اگر روزی دوباره
// درون‌خطی‌اش کردید، `script-src` در web/docker/security-headers.conf را هم
// همان‌جا به‌روز کنید.
(function () {
  var splash = document.getElementById('splash')

  if (splash === null) {
    return
  }

  var hide = function () {
    splash.classList.add('done')
    setTimeout(function () {
      splash.remove()
    }, 600)
  }

  // ۱) اپ که آماده شد این رویداد را می‌فرستد (main.tsx).
  window.addEventListener('leadertrip:ready', hide, { once: true })
  // ۲) کنترل دست کاربر است، حتی وقتی شبکه کند است.
  splash.querySelector('.skip').addEventListener('click', hide)
  // ۳) و اگر رویداد هرگز نیامد (خطای بارگذاری)، اسپلش خودش کنار می‌رود تا
  //    پیام خطا پنهان نماند.
  setTimeout(hide, 8000)
})()

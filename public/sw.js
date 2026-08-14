/**
 * سرویس‌ورکر لیدرتریپ — آفلاین‌سازی بدون وابستگی به ابزار بیلد.
 *
 * راهبرد ساده و مقاوم: هر منبع هم‌ریشه که یک‌بار گرفته شد، کش می‌شود.
 * پس از اولین بازدید، اپ در حالت هواپیما هم کامل بالا می‌آید.
 * درخواست‌های بیرونی (نقشه و هواشناسی) هرگز کش نمی‌شوند تا دادهٔ کهنه نمایش ندهیم.
 */
const CACHE = 'leadertrip-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/logo.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // ناوبری: اول شبکه، و اگر نبود همان پوستهٔ کش‌شده
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/index.html', copy))
          return res
        })
        .catch(() => caches.match('/index.html').then((r) => r || Response.error())),
    )
    return
  }

  // دارایی‌ها: اول کش (نام فایل‌ها هش دارند، پس کهنه نمی‌شوند)
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(request, copy))
          }
          return res
        }),
    ),
  )
})

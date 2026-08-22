/**
 * سرویس‌ورکر لیدرتریپ — بدون وابستگی به ابزار بیلد.
 *
 * راهبرد ساده و مقاوم: هر منبع هم‌ریشه که یک‌بار گرفته شد کش می‌شود، پس پس از
 * اولین بازدید اپ در حالت هواپیما هم بالا می‌آید.
 *
 * پاسخ‌های `/api` عمداً کش نمی‌شوند. دلیلش این است که دادهٔ کهنه در این محصول
 * ساکت‌نیست: قیمت شش‌ماه‌پیش، برنامه‌ای می‌سازد که ظاهرش درست و عددش غلط است.
 * آنچه آفلاین می‌ماند، *آخرین برنامهٔ ساخته‌شده* است که خودِ اپ در حافظهٔ محلی
 * نگه می‌دارد — یعنی همان کاری که در جاده لازم است: دیدن، نه ساختن.
 */
const CACHE = 'leadertrip-web-v1'

/**
 * فهرست دارایی‌ها هنگام بیلد این‌جا نوشته می‌شود (`precachePlugin` در
 * `vite.config.ts`).
 *
 * چرا لازم است: راهبرد «هرچه گرفته شد را کش کن» در بازدید *اول* کار نمی‌کند،
 * چون سرویس‌ورکر همان لحظه نصب می‌شود و درخواست‌های اولیه از کنارش رد شده‌اند.
 * نتیجه‌اش آفلاینی بود که فقط از بازدید دوم به بعد کار می‌کرد — یعنی دقیقاً
 * وقتی کار نمی‌کرد که لازم بود.
 */
// آیکون svg دیگر این‌جا نیست: داخل سورس است، هش می‌خورد و با بقیهٔ دارایی‌های
// بیلد در فهرست __PRECACHE__ می‌آید.
const SHELL = self.__PRECACHE__ ?? ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png']

/**
 * <code>ignoreVary</code> اجباری است، نه احتیاط.
 *
 * سرور می‌تواند روی دارایی‌ها هدر <code>Vary</code> بگذارد؛ آن‌وقت
 * <code>Cache.match</code> پیش‌فرض، هدرهای درخواست را هم مقایسه می‌کند و همان
 * فایلِ کش‌شده را پیدا <em>نمی‌کند</em>. نتیجه‌اش آفلاینی بود که کش پر داشت و
 * باز هم صفحهٔ سفید می‌داد — و هیچ خطایی جز <code>ERR_FAILED</code> نمی‌گفت.
 */
const MATCH = { cacheName: CACHE, ignoreVary: true }

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // یک منبعِ ناموفق نباید کل نصب را شکست بدهد.
      .then((cache) => Promise.allSettled(SHELL.map((path) => cache.add(path))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      // هرس دارایی‌های هش‌دارِ نسخه‌های قبلی: نام کش یکی است، پس بدون این،
      // هر انتشارْ چند مگابایت باندل مرده روی دستگاه کاربر می‌انباشت.
      .then(() => caches.open(CACHE))
      .then(async (cache) => {
        const precached = new Set(SHELL)
        const stored = await cache.keys()

        await Promise.all(
          stored
            .filter((request) => {
              const path = new URL(request.url).pathname

              return path.startsWith('/assets/') && !precached.has(path)
            })
            .map((request) => cache.delete(request)),
        )
      })
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') return

  const url = new URL(request.url)

  if (url.origin !== self.location.origin) return

  // درخواست‌های API هرگز کش نمی‌شوند — نه پاسخشان، نه شکستشان.
  if (url.pathname.startsWith('/api/')) return

  // ناوبری: اول شبکه، و اگر نبود همان پوستهٔ کش‌شده.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put('/index.html', copy))

          return response
        })
        .catch(() => caches.match('/index.html', MATCH).then((cached) => cached || Response.error())),
    )

    return
  }

  // دارایی‌ها: اول کش. نام فایل‌ها هش دارند، پس نسخهٔ کش‌شده هرگز کهنه نیست.
  event.respondWith(
    caches.match(request, MATCH).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }

          return response
        }),
    ),
  )
})

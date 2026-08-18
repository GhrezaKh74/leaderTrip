/**
 * یافتن نزدیک‌ترین شهر به یک مختصات — برای «موقعیت فعلی من».
 *
 * <p>مختصات کاربر هرگز به سرور نمی‌رود: نزدیک‌ترین شهر همین‌جا در مرورگر پیدا
 * می‌شود و فقط «شناسهٔ شهر» وارد فرم می‌شود — همان چیزی که با انتخاب دستی هم
 * وارد می‌شد. حریم خصوصی با نفرستادن حفظ می‌شود، نه با قول.</p>
 */

export interface GeoCity {
  id: string
  name: string
  lat: number
  lng: number
}

const EarthRadiusKm = 6371

/** فاصلهٔ کرویِ دو مختصات به کیلومتر — برای مرتب‌سازی «نزدیک به سفر». */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (deg: number) => (deg * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLng = rad(lng2 - lng1)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2

  return 2 * EarthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** نزدیک‌ترین شهر و فاصله‌اش؛ فهرست خالی، تهی می‌دهد. */
export function nearestCity<T extends GeoCity>(
  cities: readonly T[],
  lat: number,
  lng: number,
): { city: T; distanceKm: number } | null {
  let best: T | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const city of cities) {
    const distance = haversineKm(lat, lng, city.lat, city.lng)

    if (distance < bestDistance) {
      best = city
      bestDistance = distance
    }
  }

  return best === null ? null : { city: best, distanceKm: bestDistance }
}

/**
 * موقعیت فعلی کاربر از مرورگر — به شکل Promise و با پیام خطای فارسیِ قابل نمایش.
 */
export function currentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('مرورگر شما موقعیت‌یابی ندارد؛ شهر را دستی انتخاب کنید.'))

      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) =>
        reject(
          new Error(
            error.code === error.PERMISSION_DENIED
              ? 'اجازهٔ دسترسی به موقعیت داده نشد؛ شهر را دستی انتخاب کنید.'
              : 'موقعیت پیدا نشد؛ شهر را دستی انتخاب کنید.',
          ),
        ),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  })
}

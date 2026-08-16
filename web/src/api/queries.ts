import { useMutation, useQuery } from '@tanstack/react-query'

import { api, ApiError } from './client'
import {
  budgetLeversSchema,
  discoveredPlacesSchema,
  photoUploadSchema,
  routePathSchema,
  poiListSchema,
  referenceDataSchema,
  tripPlanSchema,
  type TripPlan,
} from './schemas'
import type { TripRequest } from '../features/wizard/tripSchema'

export const queryKeys = {
  reference: ['reference'] as const,
  pois: (cityId?: string) => ['pois', cityId ?? 'all'] as const,
}

/**
 * دادهٔ مرجع تقریباً هرگز عوض نمی‌شود، پس مدت اعتبارش بلند است.
 * بدون آن، هر بازگشت به ویزارد یک درخواست تازه می‌زند.
 */
export function useReferenceData() {
  return useQuery({
    queryKey: queryKeys.reference,
    queryFn: ({ signal }) => api.get('/reference', referenceDataSchema, signal),
    staleTime: 10 * 60 * 1000,
  })
}

export function usePois(cityId?: string) {
  return useQuery({
    queryKey: queryKeys.pois(cityId),
    queryFn: ({ signal }) =>
      api.get(cityId ? `/pois?cityId=${encodeURIComponent(cityId)}` : '/pois', poiListSchema, signal),
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * اهرم‌های کاهش هزینه.
 *
 * جهش است نه کوئری: گران‌ترین اندپوینت است (چند بار اجرای کامل موتور) و
 * اجرای خودکارش با هر تغییر فرم، هم سرور را می‌سوزاند هم بی‌فایده است —
 * کاربر وقتی می‌خواهدش که برنامه‌ای ساخته و از هزینه‌اش ناراضی است.
 */
export function useBudgetLevers() {
  return useMutation({
    mutationFn: (request: TripRequest) => api.post('/trips/optimize', request, budgetLeversSchema),
  })
}

/** کشف مکان از OpenStreetMap — دستی، چون سهمیهٔ سرور عمومی محدود است. */
export function useDiscoverPlaces() {
  return useMutation({
    mutationFn: ({ lat, lng, radiusKm }: { lat: number; lng: number; radiusKm: number }) =>
      api.get(
        `/pois/discover?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`,
        discoveredPlacesSchema,
      ),
  })
}

/**
 * ساخت برنامه یک عملیات است، نه یک کوئری: گران است، و اجرای دوبارهٔ خودکارش
 * (که رفتار پیش‌فرض کوئری است) هم منابع سرور را می‌سوزاند هم می‌تواند برنامه‌ای
 * را که کاربر دستی ویرایش کرده جایگزین کند.
 */
export function useGeneratePlan(onSuccess?: (plan: TripPlan) => void) {
  return useMutation({
    mutationFn: (request: TripRequest) => api.post('/trips/plan', request, tripPlanSchema),
    ...(onSuccess ? { onSuccess } : {}),
    retry: (failureCount, error) =>
      // خطای اعتبارسنجی با تلاش دوباره درست نمی‌شود؛ فقط خطای گذرای سرور یا
      // شبکه ارزش تکرار دارد.
      failureCount < 2 && error instanceof ApiError && (error.status === 0 || error.status >= 500),
  })
}

/**
 * بارگذاری عکس چک‌این.
 *
 * تنها داده‌ای که از بخش «حین سفر» به سرور می‌رود، و فقط با کنشِ صریح کاربر.
 * پیش از ارسال، لایهٔ نمایش عکس را کوچک می‌کند (`lib/image.ts`) — در جاده،
 * اینترنت گران‌ترین منبع است.
 */
export function useUploadPhoto() {
  return useMutation({
    mutationFn: (photo: Blob) => {
      const form = new FormData()

      form.append('photo', photo, 'checkin.jpg')

      return api.postForm('/photos', form, photoUploadSchema)
    },
  })
}

/**
 * هندسهٔ مسیر واقعی جاده برای نقشه.
 *
 * کلید کوئری از مختصات گردشده ساخته می‌شود و `staleTime` بی‌نهایت است:
 * شکل جاده بین دو نقطه عوض نمی‌شود و سهمیهٔ سرویس مسیریابی محدود است.
 */
export function useRoutePath(stops: { lat: number; lng: number }[], enabled: boolean) {
  return useQuery({
    queryKey: [
      'route-path',
      stops.map((stop) => `${stop.lat.toFixed(4)},${stop.lng.toFixed(4)}`).join(';'),
    ],
    queryFn: () =>
      api.post(
        '/trips/route-path',
        { points: stops.map(({ lat, lng }) => ({ lat, lng })) },
        routePathSchema,
      ),
    enabled: enabled && stops.length >= 2,
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
  })
}

import { useMutation, useQuery } from '@tanstack/react-query'

import { api, ApiError } from './client'
import {
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

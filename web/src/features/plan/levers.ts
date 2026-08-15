import type { BudgetLever } from '../../api/schemas'
import type { TripForm } from '../wizard/tripSchema'

/** اعمال یک اهرم روی ورودی سفر — همان تغییری که صرفه‌جویی از آن حساب شد. */
export function applyLever(input: TripForm, lever: BudgetLever): TripForm {
  const patch = lever.patch

  return {
    ...input,
    ...(patch.style ? { style: patch.style } : {}),
    ...(patch.lodging ? { lodging: patch.lodging } : {}),
    ...(patch.days != null ? { days: patch.days } : {}),
    ...(patch.radiusKm != null ? { radiusKm: patch.radiusKm } : {}),
    ...(patch.vehicleCount != null ? { vehicleCount: patch.vehicleCount } : {}),
    ...(patch.subsidizedFuelShare != null ? { subsidizedFuelShare: patch.subsidizedFuelShare } : {}),
    ...(patch.excludedPoiIds ? { excludedPoiIds: patch.excludedPoiIds } : {}),
  }
}

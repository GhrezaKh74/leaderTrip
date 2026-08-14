import type { BudgetLever, TravelStyle, TripInput, TripPlan, WeatherMap } from '../domain/types'
import { POI_BY_ID } from '../data/pois'
import { LODGING_LABEL, STYLE_LABEL } from '../data/pricing'
import { faNum } from '../lib/format'
import { generatePlan } from './planner'

/**
 * اهرم‌های کاهش هزینه.
 *
 * صرفه‌جویی هر اهرم **تخمین زده نمی‌شود** — برنامه با آن تغییر دوباره ساخته
 * می‌شود و اختلاف واقعی جمع کل گزارش می‌شود. برنامه‌ریز چند میلی‌ثانیه بیشتر
 * طول نمی‌کشد، پس ارزشش را دارد که عدد دقیق باشد نه حدسی.
 *
 * اپ هیچ‌کدام را خودش اعمال نمی‌کند؛ فقط گزینه‌ها را با عدد نشان می‌دهد.
 */

const CHEAPER_STYLE: Record<TravelStyle, TravelStyle | null> = {
  luxury: 'comfort',
  comfort: 'balanced',
  balanced: 'budget',
  budget: null,
}

export function budgetLevers(plan: TripPlan, weather?: WeatherMap): BudgetLever[] {
  const input = plan.input
  const baseline = plan.cost.total
  const candidates: { id: string; title: string; detail: string; patch: Partial<TripInput> }[] = []

  // ۱ — یک پله پایین‌آوردن سطح سفر
  const cheaper = CHEAPER_STYLE[input.style]
  if (cheaper) {
    candidates.push({
      id: 'style',
      title: `سطح سفر: ${STYLE_LABEL[input.style]} ← ${STYLE_LABEL[cheaper]}`,
      detail: 'اقامت و رستوران یک پله ارزان‌تر می‌شود؛ مسیر و جاذبه‌ها دست‌نخورده می‌مانند.',
      patch: { style: cheaper },
    })
  }

  // ۲ — کمپینگ به‌جای هتل
  if (input.lodging !== 'camp' && input.days > 1) {
    candidates.push({
      id: 'camp',
      title: `اقامت: ${LODGING_LABEL[input.lodging]} ← کمپینگ`,
      detail: 'هزینهٔ اقامت تقریباً حذف می‌شود. تجهیزات چادر و کیسه‌خواب لازم است.',
      patch: { lodging: 'camp' },
    })
  }

  // ۳ — حذف کم‌ارزش‌ترین جاذبه‌های برنامه
  const inPlan = plan.candidates.filter((c) => c.inPlan).sort((a, b) => a.score - b.score)
  if (inPlan.length >= 3) {
    const drop = inPlan.slice(0, 2)
    const names = drop.map((c) => POI_BY_ID.get(c.poiId)?.name).filter(Boolean)
    candidates.push({
      id: 'drop-pois',
      title: `حذف ${faNum(drop.length)} جاذبهٔ کم‌امتیازتر`,
      detail: `${names.join(' و ')} — هم بلیتشان و هم مسافت انحرافی‌شان صرفه‌جویی می‌شود.`,
      patch: { blockedPoiIds: [...input.blockedPoiIds, ...drop.map((c) => c.poiId)] },
    })
  }

  // ۴ — کوتاه‌کردن شعاع سفر
  if (input.radiusKm > 100) {
    const next = Math.round((input.radiusKm * 0.7) / 25) * 25
    candidates.push({
      id: 'radius',
      title: `کاهش شعاع سفر به ${faNum(next)} کیلومتر`,
      detail: 'مقصدهای نزدیک‌تر یعنی سوخت، عوارض و اهلاک کمتر.',
      patch: { radiusKm: next },
    })
  }

  // ۵ — یک روز کمتر
  if (input.days > 1) {
    candidates.push({
      id: 'days',
      title: `کوتاه‌کردن سفر به ${faNum(input.days - 1)} روز`,
      detail: 'یک شب اقامت و یک روز خوراک کامل حذف می‌شود.',
      patch: { days: input.days - 1 },
    })
  }

  // ۶ — سوخت سهمیه‌ای بیشتر
  if (input.subsidizedFuelShare < 1) {
    candidates.push({
      id: 'fuel',
      title: 'تأمین کل سوخت با نرخ سهمیه‌ای',
      detail: 'اگر سهمیهٔ کارت سوخت کفاف می‌دهد، اختلاف نرخ آزاد حذف می‌شود.',
      patch: { subsidizedFuelShare: 1 },
    })
  }

  // ۷ — کاروان را در خودروی کمتری جا بدهید
  if (input.vehicleCount > 1) {
    candidates.push({
      id: 'cars',
      title: `کاهش تعداد خودرو به ${faNum(input.vehicleCount - 1)}`,
      detail: 'سوخت، عوارض و اهلاک به‌نسبت کم می‌شود — اگر ظرفیت سرنشین اجازه بدهد.',
      patch: { vehicleCount: input.vehicleCount - 1 },
    })
  }

  const levers: BudgetLever[] = []
  for (const c of candidates) {
    try {
      const alt = generatePlan({ ...input, ...c.patch }, weather)
      const saving = baseline - alt.cost.total
      if (saving > 0) levers.push({ ...c, saving })
    } catch {
      // اگر ترکیبی برنامهٔ معتبر نداد، همان اهرم را کنار می‌گذاریم
    }
  }

  return levers.sort((a, b) => b.saving - a.saving)
}

import { tripPlanSchema, type TripPlan } from '../api/schemas'
import { tripFormSchema, type TripForm } from '../features/wizard/tripSchema'

const STORAGE_KEY = 'leadertrip.lastPlan.v1'

export interface CachedPlan {
  plan: TripPlan
  input: TripForm
  generatedAt: string
}

/**
 * آخرین برنامهٔ ساخته‌شده، برای دیدن در نبود اینترنت.
 *
 * <p>نسخهٔ اول عمداً بدون بک‌اند بود و «آفلاین-اول» یکی از پنج تمایزش. با رفتن
 * موتور به سرور، <em>ساختن</em> برنامه آنلاین شد — ولی <em>دیدنش</em>، که کار
 * اصلی در جاده است، نباید می‌شد. این همان جبرانی است که در
 * <a href="../../../docs/06-rewrite-architecture.md">سند ۶</a> وعده داده شد.</p>
 *
 * <p>خواندن با اعتبارسنجی انجام می‌شود: برنامهٔ ذخیره‌شده ممکن است از نسخهٔ
 * قدیمی‌تر اپ مانده باشد و شکلش با قرارداد امروز نخواند. اعتماد به آن یعنی
 * صفحه‌ای که با خطای عجیب سفید می‌شود؛ اعتبارسنجی یعنی برگشت آرام به ویزارد.</p>
 */
const cachedPlanSchema = {
  parse(raw: unknown): CachedPlan | null {
    if (typeof raw !== 'object' || raw === null) return null

    const record = raw as Record<string, unknown>
    const plan = tripPlanSchema.safeParse(record['plan'])
    const input = tripFormSchema.safeParse(record['input'])

    if (!plan.success || !input.success) return null

    return {
      plan: plan.data,
      input: input.data,
      generatedAt: typeof record['generatedAt'] === 'string' ? record['generatedAt'] : '',
    }
  },
}

export function savePlan(plan: TripPlan, input: TripForm): void {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ plan, input, generatedAt: new Date().toISOString() }),
    )
  } catch {
    // سهمیهٔ حافظه پر است. از دست‌رفتن کش آفلاین بد است، ولی از کار افتادن
    // ساخت برنامه بدتر — پس اینجا شکست بی‌صداست و عمداً بی‌صدا.
  }
}

export function loadPlan(): CachedPlan | null {
  if (typeof localStorage === 'undefined') return null

  const raw = localStorage.getItem(STORAGE_KEY)

  if (raw === null) return null

  try {
    return cachedPlanSchema.parse(JSON.parse(raw))
  } catch {
    return null
  }
}

export function clearPlan(): void {
  if (typeof localStorage === 'undefined') return

  localStorage.removeItem(STORAGE_KEY)
}

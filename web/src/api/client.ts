import type { z } from 'zod'

/**
 * خطایی که کاربر می‌تواند بخواند، از پاسخ `ProblemDetails` بک‌اند.
 *
 * `code` ماشین‌خوان است و `message` برای انسان. رابط کاربری روی `code` شرط
 * می‌گذارد نه روی متن — چون متن روزی عوض می‌شود و آن‌وقت شرطِ نوشته‌شده روی متن،
 * بی‌صدا از کار می‌افتد.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

const BASE = import.meta.env['VITE_API_BASE'] ?? '/api'

interface ProblemDetails {
  title?: string
  detail?: string
  code?: string
}

async function toApiError(response: Response): Promise<ApiError> {
  let problem: ProblemDetails = {}

  try {
    problem = (await response.json()) as ProblemDetails
  } catch {
    // پاسخ خطا همیشه JSON نیست — یک پروکسی میانی می‌تواند HTML برگرداند.
  }

  const message =
    problem.detail ??
    problem.title ??
    (response.status >= 500
      ? 'سرور پاسخ نداد. کمی بعد دوباره تلاش کنید.'
      : 'درخواست انجام نشد.')

  return new ApiError(response.status, problem.code ?? `http.${response.status}`, message)
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        // برای FormData هدر دستی ممنوع است: مرورگر باید خودش boundary را بنویسد.
        ...(init?.body && !(init.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...init?.headers,
      },
    })
  } catch {
    // شکست شبکه با خطای سرور یکی نیست و پیامش هم نباید یکی باشد: یکی «اینترنت
    // نداری» است و دیگری «ما خرابیم».
    throw new ApiError(0, 'network.unreachable', 'اتصال به سرور برقرار نشد. اینترنت را بررسی کنید.')
  }

  if (!response.ok) {
    throw await toApiError(response)
  }

  const parsed = schema.safeParse(await response.json())

  if (!parsed.success) {
    // خطا در همان مرز شبکه گرفته می‌شود، نه چند کامپوننت آن‌طرف‌تر به‌شکل
    // «NaN تومان» روی صفحه.
    throw new ApiError(
      response.status,
      'contract.mismatch',
      `پاسخ سرور با قرارداد نمی‌خواند: ${parsed.error.issues[0]?.path.join('.') ?? 'نامشخص'}`,
    )
  }

  return parsed.data
}

export const api = {
  get: <T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal) =>
    request(path, schema, signal ? { signal } : {}),

  post: <T>(path: string, body: unknown, schema: z.ZodType<T>, signal?: AbortSignal) =>
    request(path, schema, {
      method: 'POST',
      body: JSON.stringify(body),
      ...(signal ? { signal } : {}),
    }),

  postForm: <T>(path: string, form: FormData, schema: z.ZodType<T>) =>
    request(path, schema, { method: 'POST', body: form }),

  // نسخه‌های مدیریتی: همان درخواست، با کلید در سرآیند. کلید هرگز در URL
  // نمی‌رود — URL در تاریخچه و لاگ می‌ماند، سرآیند نه.
  adminGet: <T>(path: string, schema: z.ZodType<T>, key: string) =>
    request(path, schema, { headers: { [ADMIN_KEY_HEADER]: key } }),

  adminPost: <T>(path: string, body: unknown, schema: z.ZodType<T>, key: string) =>
    request(path, schema, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { [ADMIN_KEY_HEADER]: key },
    }),

  adminDelete: async (path: string, key: string): Promise<void> => {
    let response: Response

    try {
      response = await fetch(`${BASE}${path}`, {
        method: 'DELETE',
        headers: { [ADMIN_KEY_HEADER]: key },
      })
    } catch {
      throw new ApiError(0, 'network.unreachable', 'اتصال به سرور برقرار نشد. اینترنت را بررسی کنید.')
    }

    if (!response.ok) {
      throw await toApiError(response)
    }
  },
}

const ADMIN_KEY_HEADER = 'X-Admin-Key'

/** نشانی نمایش یک عکس ذخیره‌شده — از همان مبدأ API. */
export const photoUrl = (id: string): string => `${BASE}/photos/${id}`

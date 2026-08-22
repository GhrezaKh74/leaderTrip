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
  timeoutMs = 20_000,
): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      // بدون مهلت، درخواستِ گیرکرده اسپینر ابدی می‌سازد؛ مهلت یعنی شکستِ
      // معلوم به‌جای انتظارِ نامعلوم. صداکننده می‌تواند مهلت بلندتر بدهد.
      signal: init?.signal ?? AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: 'application/json',
        // برای FormData هدر دستی ممنوع است: مرورگر باید خودش boundary را بنویسد.
        ...(init?.body && !(init.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...init?.headers,
      },
    })
  } catch (error) {
    if ((error as DOMException | undefined)?.name === 'TimeoutError') {
      throw new ApiError(0, 'network.timeout', 'سرور دیر پاسخ داد. کمی بعد دوباره تلاش کنید.')
    }

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

  post: <T>(path: string, body: unknown, schema: z.ZodType<T>, signal?: AbortSignal, timeoutMs?: number) =>
    request(
      path,
      schema,
      {
        method: 'POST',
        body: JSON.stringify(body),
        ...(signal ? { signal } : {}),
      },
      timeoutMs,
    ),

  // بارگذاری عکس روی اینترنت جاده‌ای کند است — مهلت بلندتر.
  postForm: <T>(path: string, form: FormData, schema: z.ZodType<T>) =>
    request(path, schema, { method: 'POST', body: form }, 90_000),

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

/** نسخه‌های با توکن کاربر — Bearer در سرآیند، نه کوکی و نه URL. */
export const authApi = {
  get: <T>(path: string, schema: z.ZodType<T>, token: string) =>
    request(path, schema, { headers: { Authorization: `Bearer ${token}` } }),

  post: <T>(path: string, body: unknown, schema: z.ZodType<T>, token: string) =>
    request(path, schema, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}` },
    }),

  /** POST بدون بدنه و بدون پاسخ — مثل خروج. */
  send: async (path: string, token: string): Promise<void> => {
    let response: Response

    try {
      response = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      throw new ApiError(0, 'network.unreachable', 'اتصال به سرور برقرار نشد. اینترنت را بررسی کنید.')
    }

    if (!response.ok) {
      throw await toApiError(response)
    }
  },

  delete: async (path: string, token: string): Promise<void> => {
    let response: Response

    try {
      response = await fetch(`${BASE}${path}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      throw new ApiError(0, 'network.unreachable', 'اتصال به سرور برقرار نشد. اینترنت را بررسی کنید.')
    }

    if (!response.ok) {
      throw await toApiError(response)
    }
  },
}

/** نشانی نمایش یک عکس ذخیره‌شده — از همان مبدأ API. */
export const photoUrl = (id: string): string => `${BASE}/photos/${id}`

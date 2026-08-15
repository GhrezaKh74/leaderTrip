import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { api, ApiError } from './client'

const schema = z.object({ name: z.string() })

function respondWith(body: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('کلاینت API', () => {
  it('پاسخ معتبر را برمی‌گرداند', async () => {
    respondWith({ name: 'تهران' })

    await expect(api.get('/x', schema)).resolves.toEqual({ name: 'تهران' })
  })

  /**
   * بدون این، فیلد گمشده به‌شکل `undefined` پایین‌دست می‌رود و معمولاً چند
   * کامپوننت آن‌طرف‌تر به «NaN تومان» تبدیل می‌شود — خطایی که ردیابی‌اش سخت است
   * چون جایی که ظاهر می‌شود جایی نیست که رخ داده.
   */
  it('پاسخی که با قرارداد نمی‌خواند را در همان مرز شبکه رد می‌کند', async () => {
    respondWith({ name: 42 })

    await expect(api.get('/x', schema)).rejects.toMatchObject({ code: 'contract.mismatch' })
  })

  it('کد ماشین‌خوان خطا را از ProblemDetails برمی‌دارد', async () => {
    respondWith({ title: 'پیدا نشد', detail: 'شهر «atlantis» پیدا نشد.', code: 'city.notFound' }, 404)

    const error = await api.get('/x', schema).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404, code: 'city.notFound' })
    expect((error as ApiError).message).toContain('atlantis')
  })

  it('پاسخ خطای غیر JSON را هم تحمل می‌کند', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>502</html>', { status: 502 })))

    await expect(api.get('/x', schema)).rejects.toMatchObject({ status: 502 })
  })

  /** شکست شبکه با خطای سرور یکی نیست و پیامش هم نباید یکی باشد. */
  it('قطعی شبکه را از خطای سرور جدا می‌کند', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('failed to fetch')))

    await expect(api.get('/x', schema)).rejects.toMatchObject({ code: 'network.unreachable', status: 0 })
  })
})

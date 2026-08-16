import { useSyncExternalStore } from 'react'

import { authApi, api } from '../../api/client'
import {
  authResponseSchema,
  savedTripListSchema,
  savedTripSchema,
  type AuthUser,
  type SavedTrip,
} from '../../api/schemas'

/**
 * نشست کاربر — یک انبار کوچک بیرون از React.
 *
 * <p>چرا نه Context: نشست را هم کامپوننت‌ها می‌خواهند هم توابع غیر-React (مثل
 * ذخیرهٔ سفر). یک ماژول با <code>useSyncExternalStore</code> هر دو را می‌دهد،
 * بدون Provider اضافه دور کل درخت.</p>
 *
 * <p>توکن در localStorage می‌ماند — تصمیم آگاهانه: کوکی HttpOnly امن‌تر است ولی
 * CSRF و پیکربندی سرور می‌آورد؛ برای PWA بدون دامنهٔ ثابت، Bearer سرراست‌تر
 * است. توکن سمت سرور هش‌شده و سی‌روزه است و خروج واقعاً باطلش می‌کند.</p>
 */

export interface Session {
  token: string
  user: AuthUser
}

const STORAGE_KEY = 'leadertrip.auth.v1'

let current: Session | null = read()
const listeners = new Set<() => void>()

function read(): Session | null {
  if (typeof localStorage === 'undefined') return null

  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (raw === null) return null

    const parsed = JSON.parse(raw) as Session

    return typeof parsed?.token === 'string' && typeof parsed?.user?.id === 'string' ? parsed : null
  } catch {
    return null
  }
}

function write(next: Session | null): void {
  current = next

  try {
    if (next === null) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // حافظه پر — نشست فقط در همین تب می‌ماند.
  }

  for (const listener of listeners) listener()
}

export function getSession(): Session | null {
  return current
}

/** نشست فعلی، واکنشی — برای کامپوننت‌ها. */
export function useSession(): Session | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)

      return () => listeners.delete(listener)
    },
    () => current,
  )
}

export async function register(email: string, password: string, displayName: string): Promise<void> {
  const response = await api.post('/auth/register', { email, password, displayName }, authResponseSchema)

  write({ token: response.token, user: response.user })
}

export async function login(email: string, password: string): Promise<void> {
  const response = await api.post('/auth/login', { email, password }, authResponseSchema)

  write({ token: response.token, user: response.user })
}

export async function logout(): Promise<void> {
  const session = current

  // اول انبار محلی پاک می‌شود تا رابط فوراً «خارج» شود؛ ابطال سمت سرور اگر
  // شبکه نبود هم مهم است، ولی نباید کاربر را گروگان بگیرد.
  write(null)

  if (session !== null) {
    try {
      await authApi.send('/auth/logout', session.token)
    } catch {
      // توکن سمت سرور می‌ماند تا انقضای سی‌روزه — نه ایده‌آل، نه فاجعه.
    }
  }
}

/** نشست منقضی یا باطل‌شده — وقتی سرور ۴۰۱ داد، صدا زده می‌شود. */
export function dropSession(): void {
  write(null)
}

export async function listTrips(): Promise<SavedTrip[]> {
  const session = mustBeSignedIn()

  return authApi.get('/me/trips', savedTripListSchema, session.token)
}

export async function saveTrip(title: string, payload: string, id?: string): Promise<SavedTrip> {
  const session = mustBeSignedIn()

  return authApi.post('/me/trips', { id: id ?? null, title, payload }, savedTripSchema, session.token)
}

export async function deleteTrip(id: string): Promise<void> {
  const session = mustBeSignedIn()

  await authApi.delete(`/me/trips/${id}`, session.token)
}

function mustBeSignedIn(): Session {
  if (current === null) throw new Error('برای این کار باید وارد حساب شوید.')

  return current
}

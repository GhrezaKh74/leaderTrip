import { useEffect, useState } from 'react'

/**
 * وضعیت اتصال، به‌روز.
 *
 * <p><code>navigator.onLine</code> تنها نشانهٔ در دسترس است و کامل نیست: در
 * جادهٔ ایران «آنتن هست ولی داده رد نمی‌شود» حالت رایجی است و مرورگر آن را
 * آنلاین می‌بیند. برای همین این مقدار برای <em>پنهان‌کردن</em> امکانات به کار
 * نمی‌رود؛ فقط پیام راهنما را عوض می‌کند. تصمیم واقعی را خطای درخواست
 * می‌گیرد، نه این پرچم.</p>
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return online
}

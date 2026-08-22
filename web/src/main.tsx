import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@fontsource-variable/vazirmatn'
import './theme/fonts.css'

import { App } from './App'
import { registerServiceWorker } from './offline/registerServiceWorker'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // تلاش دوباره فقط برای شکستی که تکرارش معنا دارد: شبکه (status 0) یا
      // خطای سرور. تکرار ۴xx فقط تشخیص را کند می‌کند.
      retry: (failureCount: number, error: unknown) => {
        const status = (error as { status?: number } | undefined)?.status ?? 0

        return failureCount < 1 && (status === 0 || status >= 500)
      },
      refetchOnWindowFocus: false,
    },
  },
})

const root = document.getElementById('root')

if (root === null) {
  throw new Error('عنصر ریشه پیدا نشد.')
}

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

// اسپلش در index.html منتظر همین است؛ یک فریم بعد از رندر اول تا صحنه واقعاً
// نقاشی شده باشد — اسپلشی که کنار برود و پشتش سفید باشد، بدتر از نبودنش است.
requestAnimationFrame(() => {
  requestAnimationFrame(() => window.dispatchEvent(new Event('leadertrip:ready')))
})

registerServiceWorker()

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@fontsource-variable/vazirmatn'

import { App } from './App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // تلاش دوبارهٔ خودکار روی خطای ۴۰۰ بی‌فایده است و فقط تشخیص را کند می‌کند.
      retry: 1,
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

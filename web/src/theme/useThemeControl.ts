import { useState } from 'react'
import useMediaQuery from '@mui/material/useMediaQuery'

const STORAGE_KEY = 'leadertrip.theme'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemeControl {
  mode: ThemeMode
  resolved: 'light' | 'dark'
  setMode: (mode: ThemeMode) => void
}

/**
 * انتخاب حالت روشن/تاریک.
 *
 * سه حالت دارد و نه دو: «سیستم» با «روشن» یکی نیست. اگر انتخابِ نکرده را روشن
 * فرض کنیم، کاربری که گوشی‌اش شب‌ها تاریک می‌شود، اپ را روشن می‌بیند و فکر
 * می‌کند خراب است. نبودِ کلید در حافظه یعنی «هنوز انتخاب نکرده»، نه «روشن».
 */
export function useThemeControl(): ThemeControl {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode)
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')

  const resolved = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode

  const setMode = (next: ThemeMode) => {
    setModeState(next)

    if (typeof localStorage === 'undefined') return

    if (next === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, next)
  }

  return { mode, resolved, setMode }
}

function readStoredMode(): ThemeMode {
  if (typeof localStorage === 'undefined') return 'system'

  const stored = localStorage.getItem(STORAGE_KEY)

  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

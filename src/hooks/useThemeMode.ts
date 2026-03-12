import { useState, useEffect } from 'react'

export type ThemeMode = 'light' | 'dark' | 'auto'

export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'auto'
    return (localStorage.getItem('nwt-theme-mode') as ThemeMode) || 'auto'
  })

  useEffect(() => {
    const applyTheme = () => {
      let isDark: boolean
      if (mode === 'auto') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      } else {
        isDark = mode === 'dark'
      }
      document.documentElement.classList.toggle('dark', isDark)
    }

    applyTheme()
    localStorage.setItem('nwt-theme-mode', mode)

    if (mode === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => applyTheme()
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [mode])

  return [mode, setMode] as const
}

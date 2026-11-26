import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { applyTheme, getThemePref, resolveTheme, setThemePref, type ThemePref } from '../lib/theme'

interface ThemeCtx {
  pref: ThemePref
  resolved: 'light' | 'dark'
  setPref: (p: ThemePref) => void
}

const Ctx = createContext<ThemeCtx | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(getThemePref)
  const [resolved, setResolved] = useState(() => resolveTheme(getThemePref()))

  useEffect(() => {
    applyTheme(pref)
    setResolved(resolveTheme(pref))
    if (pref !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => {
      applyTheme('system')
      setResolved(resolveTheme('system'))
    }
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [pref])

  const setPref = useCallback((p: ThemePref) => {
    setThemePref(p)
    setPrefState(p)
  }, [])

  const value = useMemo(() => ({ pref, resolved, setPref }), [pref, resolved, setPref])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTheme(): ThemeCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useTheme must be used inside <ThemeProvider>')
  return v
}

import { useCallback, useEffect, useState } from 'react'
import type { ThemeConfig } from '../types'
import { deriveAccentFamily, contrastOn } from '../theme/color-ramp'
import { deriveCanvas } from '../theme/canvas'

const STORAGE_KEY = 'oh-my-ppt:theme'
const DEFAULT_ACCENT = '#61b0f1'
const DANGER = '#e06c75'

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function isDarkHour(active: string, inactive: string): boolean {
  const now = new Date()
  const current = now.getHours() * 60 + now.getMinutes()
  const from = toMinutes(active)
  const to = toMinutes(inactive)
  return from > to ? current >= from || current < to : current >= from && current < to
}

export interface DeckThemeSource {
  accent?: string
  theme: ThemeConfig
}

/** 把种子色推导出的全部变量写到 <html>。 */
export function applyDeckTheme(accentHex: string, dark: boolean) {
  const root = document.documentElement
  const family = deriveAccentFamily(accentHex)
  root.style.setProperty('--accent', family.accent)
  root.style.setProperty('--accent-dim', family.accentDim)
  root.style.setProperty('--accent-bright', family.accentBright)
  root.style.setProperty('--on-accent', family.onAccent)
  root.style.setProperty('--danger', DANGER)
  root.style.setProperty('--on-danger', contrastOn(DANGER))

  const canvas = deriveCanvas(accentHex, dark)
  for (const [key, value] of Object.entries(canvas)) {
    root.style.setProperty(key, value)
  }

  // 文字色跟随明暗（亮色近墨、暗色近纸）
  root.style.setProperty('--fg', dark ? '#dcdde3' : '#33353a')
}

export function useTheme(config: DeckThemeSource) {
  const { theme } = config

  const [dark, setDark] = useState<boolean>(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'dark') return true
    if (saved === 'light') return false
    if (theme.autoChange) {
      if (theme.changeByOS) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
      }
      if (theme.changeByHour) {
        return isDarkHour(theme.hourDarkActive, theme.hourDarkInactive)
      }
    }
    return false
  })

  const [accentOverride, setAccentOverride] = useState<string | null>(() => {
    try {
      return window.sessionStorage.getItem('oh-my-ppt:accent')
    } catch {
      return null
    }
  })

  const accent = accentOverride ?? config.accent ?? DEFAULT_ACCENT

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    applyDeckTheme(accent, dark)
  }, [dark, accent])

  const pickAccent = useCallback((seed: string) => {
    setAccentOverride(seed)
    try {
      window.sessionStorage.setItem('oh-my-ppt:accent', seed)
    } catch {
      /* 会话级记忆失败则静默 */
    }
  }, [])

  const toggle = useCallback(() => {
    setDark(current => {
      window.localStorage.setItem(STORAGE_KEY, current ? 'light' : 'dark')
      return !current
    })
  }, [])

  return { dark, toggle, accent, pickAccent }
}

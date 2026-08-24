import { useCallback, useEffect, useState } from 'react'
import type { ThemeConfig, ThemePreset } from '../types'
import { deriveAccentFamily, contrastOn } from '../theme/color-ramp'
import { deriveCanvas } from '../theme/canvas'
import { findTheme } from '../theme/presets'

const STORAGE_KEY = 'oh-my-ppt:theme'
const DEFAULT_ACCENT = '#61b0f1'
const DANGER = '#e06c75'

/** 密度 → φ 基准倍率（影响全局 --spacing-phi-md）。 */
const DENSITY_SCALE: Record<NonNullable<ThemePreset['density']>, number> = {
  compact: 0.875,
  normal: 1,
  airy: 1.125,
}

/** 存储访问守卫：隐私模式/沙箱 iframe 抛 SecurityError 时静默降级。 */
function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}
function safeSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}

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
  /** 主题预设 id（themes/ 目录或内置）。 */
  themePreset?: string
  theme: ThemeConfig
}

/** 应用主题预设（字体/密度），种子色由 preset 或 config 提供。 */
export function applyDeckTheme(
  accentHex: string,
  dark: boolean,
  preset?: ThemePreset,
  invertSlides = false,
) {
  const root = document.documentElement
  const family = deriveAccentFamily(accentHex)
  root.style.setProperty('--accent', family.accent)
  root.style.setProperty('--accent-dim', family.accentDim)
  root.style.setProperty('--accent-bright', family.accentBright)
  root.style.setProperty('--on-accent', family.onAccent)
  root.style.setProperty('--danger', DANGER)
  root.style.setProperty('--on-danger', contrastOn(DANGER))

  // 「THE DOCUMENT DOES NOT INVERT」（借鉴 bento）：深色只暗 UI chrome；
  // 舞台/卡片保持浅色纸面，除非文档显式声明 invertSlides。
  // 实现：舞台色不再参与 dark 反转，root 上的 dark 只影响 UI 控件类。
  const canvas = deriveCanvas(accentHex, dark && invertSlides)
  for (const [key, value] of Object.entries(canvas)) {
    root.style.setProperty(key, value)
  }

  // 文字色跟随明暗（亮色近墨、暗色近纸；不反转时舞台文字保持墨色）
  root.style.setProperty('--fg', dark && invertSlides ? '#dcdde3' : '#33353a')

  // 预设：字体族 + 密度倍率
  root.style.setProperty('--font-body', preset?.fontFamily ?? '')
  root.style.setProperty('--font-heading', preset?.headingFontFamily ?? '')
  const scale = DENSITY_SCALE[preset?.density ?? 'normal']
  root.style.setProperty('--spacing-phi-md', `${scale}rem`)
}

export function useTheme(config: DeckThemeSource) {
  const { theme } = config

  const [dark, setDark] = useState<boolean>(() => {
    const saved = safeGet(STORAGE_KEY)
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

  // 用户手动切换过 → 深色含舞台全局反转；自动跟随（OS/时段）→ 只暗 chrome。
  const [manual, setManual] = useState<boolean>(() => safeGet(STORAGE_KEY) !== null)
  const invertSlides = theme.invertSlides === true || manual

  const preset = findTheme(config.themePreset)
  // 优先级：会话选色 > 主题预设（整套换装语义）> config 显式 accent > 缺省
  const rawAccent = accentOverride ?? preset?.accent ?? config.accent ?? DEFAULT_ACCENT
  const HEX_OK = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i
  const accent = HEX_OK.test(rawAccent) ? rawAccent : DEFAULT_ACCENT

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    // 不反转舞台时标记，chrome 变量组接管 UI 控件配色
    document.documentElement.toggleAttribute('data-invert-slides', invertSlides)
    applyDeckTheme(accent, dark, preset, invertSlides)
  }, [dark, accent, preset, invertSlides])

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
      safeSet(STORAGE_KEY, current ? 'light' : 'dark')
      return !current
    })
    setManual(true)
  }, [])

  return { dark, toggle, accent, pickAccent }
}

import { contrastRatio } from './color-ramp'

/** 与 index.css :root / .dark 舞台色对齐，供无 DOM 单测。 */
export const LIGHT_STAGE = {
  bg: '#e7eaee',
  fg: '#33353a',
  sfg: '#7d7f86',
  accent: '#61b0f1',
  onAccent: '#161616',
} as const

export const DARK_STAGE = {
  bg: '#15181d',
  fg: '#dcdde3',
  sfg: '#8d8f97',
  accent: '#61b0f1',
  onAccent: '#161616',
} as const

export function auditStageContrast(tokens: {
  bg: string
  fg: string
  sfg: string
  accent: string
  onAccent: string
}) {
  return {
    fgOnBg: contrastRatio(tokens.fg, tokens.bg),
    sfgOnBg: contrastRatio(tokens.sfg, tokens.bg),
    onAccent: contrastRatio(tokens.onAccent, tokens.accent),
  }
}

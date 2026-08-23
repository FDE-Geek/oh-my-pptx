/**
 * 画布停点 —— 灰画布 + 卡片浮层，accent 种子混入底色。
 * 移植自 okee-ui/src/theme/theme-engine.ts（LIGHT_CANVAS / DARK_CANVAS + mixHex）。
 *
 * 直觉：页面垫带一点品牌色浅灰；卡片/面板靠对比浮起。
 * 亮色 panel 锁白（不在停点表里），让 sheet 从灰画布上抬起。
 */

export interface CanvasStop {
  /** oh-my-ppt 的 CSS 变量名。 */
  key: string
  /** accent 混入百分比（sRGB 线性插值）。 */
  accentPercent: number
  /** 底色。 */
  base: string
}

/** 暗色停点 —— 底色更亮让 panel 卡浮起。 */
export const DARK_CANVAS: readonly CanvasStop[] = [
  { key: "--bg", accentPercent: 6, base: "#12151a" },
  { key: "--sfg", accentPercent: 0, base: "#8d8f97" },
  { key: "--card", accentPercent: 8, base: "#1c2028" },
  { key: "--outline", accentPercent: 0, base: "#3a3742" },
]

/** 亮色停点 —— 灰画布让白卡浮起。 */
export const LIGHT_CANVAS: readonly CanvasStop[] = [
  { key: "--bg", accentPercent: 6, base: "#e8eaed" },
  { key: "--sfg", accentPercent: 0, base: "#7d7f86" },
  { key: "--card", accentPercent: 9, base: "#e8ecf1" },
  { key: "--outline", accentPercent: 0, base: "#c2c5cc" },
]

function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "")
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  }
}

/** sRGB 线性插值：mix(accent percent%, base) → hex（等价 color-mix(in srgb, …)）。 */
export function mixHex(accent: string, percent: number, base: string): string {
  const a = parseHex(accent)
  const b = parseHex(base)
  const p = percent / 100
  const to = (x: number, y: number) =>
    Math.round(x * p + y * (1 - p))
      .toString(16)
      .padStart(2, "0")
  return `#${to(a.r, b.r)}${to(a.g, b.g)}${to(a.b, b.b)}`
}

export function deriveCanvas(
  accentHex: string,
  isDark: boolean,
): Record<string, string> {
  const stops = isDark ? DARK_CANVAS : LIGHT_CANVAS
  const out: Record<string, string> = {}
  for (const stop of stops) {
    out[stop.key] = stop.accentPercent > 0 ? mixHex(accentHex, stop.accentPercent, stop.base) : stop.base
  }
  return out
}

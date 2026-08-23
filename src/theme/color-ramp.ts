/**
 * OKLCH 色彩科学 —— 种子色 → 语义色族。
 * 移植自 okee-ui/src/theme/color-ramp.ts（Björn Ottosson OKLab，零依赖）。
 *
 * - dim / bright：OKLCH 亮度偏移，保持 chroma 与 hue（MD3 roles 思路）
 * - on-color：WCAG 2.1 对比度在墨/纸双色中择优，soft-fail 不抛错
 */

export const ON_ACCENT_DARK = "#161616"
export const ON_ACCENT_LIGHT = "#fafafa"

export interface AccentFamily {
  accent: string
  accentDim: string
  accentBright: string
  onAccent: string
}

export interface Oklch {
  l: number
  c: number
  h: number
}

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function parseHex(raw: string): { r: number; g: number; b: number } {
  const value = raw.trim()
  const match = HEX_RE.exec(value)
  if (!match?.[1]) {
    throw new Error(`oh-my-ppt: invalid hex color: ${JSON.stringify(raw)}`)
  }
  let digits = match[1]
  if (digits.length === 3) {
    const [a, b, c] = digits
    digits = `${a}${a}${b}${b}${c}${c}`
  }
  return {
    r: Number.parseInt(digits.slice(0, 2), 16),
    g: Number.parseInt(digits.slice(2, 4), 16),
    b: Number.parseInt(digits.slice(4, 6), 16),
  }
}

function toHex(r: number, g: number, b: number): string {
  const byte = (channel: number) =>
    Math.round(clamp(channel, 0, 255))
      .toString(16)
      .padStart(2, "0")
  return `#${byte(r)}${byte(g)}${byte(b)}`
}

function srgbChannelToLinear(channel: number): number {
  const s = channel / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function linearToSrgbChannel(linear: number): number {
  const s = linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055
  return clamp(s, 0, 1) * 255
}

/** Björn Ottosson OKLab. */
function linearSrgbToOklab(r: number, g: number, b: number): { l: number; a: number; b: number } {
  const l_ = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m_ = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s_ = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
  const l = Math.cbrt(l_)
  const m = Math.cbrt(m_)
  const s = Math.cbrt(s_)
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  }
}

function oklabToLinearSrgb(l: number, a: number, b: number): { r: number; g: number; b: number } {
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b
  const s_ = l - 0.0894841775 * a - 1.291485548 * b
  const l3 = l_ ** 3
  const m3 = m_ ** 3
  const s3 = s_ ** 3
  return {
    r: 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    g: -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    b: -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  }
}

function oklabToOklch(lab: { l: number; a: number; b: number }): Oklch {
  const c = Math.hypot(lab.a, lab.b)
  const h = c < 1e-8 ? 0 : ((Math.atan2(lab.b, lab.a) * 180) / Math.PI + 360) % 360
  return { l: lab.l, c, h }
}

function oklchToOklab(lch: Oklch): { l: number; a: number; b: number } {
  const rad = (lch.h * Math.PI) / 180
  return {
    l: lch.l,
    a: lch.c * Math.cos(rad),
    b: lch.c * Math.sin(rad),
  }
}

/** Parse `#rgb` / `#rrggbb` → OKLCH. Throws on invalid hex. */
export function hexToOklch(hex: string): Oklch {
  const rgb = parseHex(hex)
  const lab = linearSrgbToOklab(
    srgbChannelToLinear(rgb.r),
    srgbChannelToLinear(rgb.g),
    srgbChannelToLinear(rgb.b),
  )
  return oklabToOklch(lab)
}

function oklchToHex(lch: Oklch): string {
  const lab = oklchToOklab(lch)
  const linear = oklabToLinearSrgb(lab.l, lab.a, lab.b)
  return toHex(
    linearToSrgbChannel(linear.r),
    linearToSrgbChannel(linear.g),
    linearToSrgbChannel(linear.b),
  )
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex)
  const R = srgbChannelToLinear(r)
  const G = srgbChannelToLinear(g)
  const B = srgbChannelToLinear(b)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

/** WCAG 2.1 contrast ratio of two hex colors. */
export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Pick `#161616` or `#fafafa` for text on `bgHex`.
 * Prefer the higher contrast; do not throw if both miss 4.5:1 (soft-fail).
 */
export function contrastOn(bgHex: string): string {
  const dark = contrastRatio(bgHex, ON_ACCENT_DARK)
  const light = contrastRatio(bgHex, ON_ACCENT_LIGHT)
  return dark >= light ? ON_ACCENT_DARK : ON_ACCENT_LIGHT
}

function normalizeHex(hex: string): string {
  const { r, g, b } = parseHex(hex)
  return toHex(r, g, b)
}

/** Seed → dim / bright / on-accent. Seed tone is preserved. */
export function deriveAccentFamily(seedHex: string): AccentFamily {
  const accent = normalizeHex(seedHex)
  const { l, c, h } = hexToOklch(accent)
  const dim = oklchToHex({ l: clamp(l * 0.82, 0.18, 0.55), c, h })
  const bright = oklchToHex({ l: clamp(l * 1.22, 0.55, 0.88), c, h })
  return {
    accent,
    accentDim: dim,
    accentBright: bright,
    onAccent: contrastOn(accent),
  }
}

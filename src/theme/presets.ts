import type { ThemePreset } from '../types'

export type { ThemePreset }

/**
 * 内置主题预设——对应 OpenDesign「丢一个目录即生效」的设计系统包。
 * themes/ 目录下的 theme.json 会经构建链合并进来（build-single 注入）；
 * 这里是随源码分发的三套出厂预设。
 */
export const BUILTIN_THEMES: ThemePreset[] = [
  {
    id: 'default',
    name: '缺省 · 天空蓝',
    accent: '#61b0f1',
    density: 'normal',
    description: 'oh-my-ppt 出厂风格',
  },
  {
    id: 'tech-share',
    name: '技术分享',
    accent: '#5b8af8',
    fontFamily: "'Inter', 'Noto Sans SC', system-ui, sans-serif",
    headingFontFamily: "'Inter', 'Noto Sans SC', system-ui, sans-serif",
    density: 'compact',
    transition: 'slide',
    description: '代码密集、信息密度高的技术演讲；冷色聚焦',
  },
  {
    id: 'product-launch',
    name: '产品发布',
    accent: '#cf7a8a',
    fontFamily: "'Georgia', 'Noto Serif SC', serif",
    headingFontFamily: "'Georgia', 'Noto Serif SC', serif",
    density: 'airy',
    transition: 'zoom',
    description: '大留白、衬线优雅的消费级发布场',
  },
  {
    id: 'academic',
    name: '学术报告',
    accent: '#2e8a7a',
    fontFamily: "'Times New Roman', 'Noto Serif SC', serif",
    headingFontFamily: "'Times New Roman', 'Noto Serif SC', serif",
    density: 'normal',
    transition: 'none',
    description: '克制无动效、稳重青绿，适合论文答辩与组会',
  },
]

export function findTheme(id?: string): ThemePreset | undefined {
  if (!id) return undefined
  return BUILTIN_THEMES.find(theme => theme.id === id)
}

/* ────────────────────────────────────────────────────────────
 * DESIGN.md 兼容（OpenDesign 9 节 schema 子集）
 * 识别的节与映射：
 *   ## Palette / ## Colors  → 任意 `#hex` 首个作为 accent
 *   ## Typography           → font-family 声明（标题/正文）
 *   ## Voice / ## Tone      → 仅存入 description（不改视觉）
 * ──────────────────────────────────────────────────────────── */

const HEX_RE = /#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/gi
const FONT_RE = /(?:heading|title)[^\n]*?font-family:\s*([^\n]+)/i
const BODY_FONT_RE = /(?:body|text)[^\n]*?font-family:\s*([^\n]+)/i

/** 解析 DESIGN.md（或其片段）为 ThemePreset；无法识别返回 null。 */
export function parseDesignMd(markdown: string, id = 'from-design-md'): ThemePreset | null {
  const sections = splitSections(markdown)
  const palette = sections.get('palette') ?? sections.get('colors') ?? ''
  const typography = sections.get('typography') ?? ''
  const voice = sections.get('voice') ?? sections.get('tone') ?? ''

  const hexes = [...palette.matchAll(HEX_RE)].map(m => m[0])
  const accent = hexes.length > 0 ? normalizeHex(hexes[0]) : undefined
  const heading = typography.match(FONT_RE)?.[1]?.trim().replace(/[`;]$/, '')
  const body = typography.match(BODY_FONT_RE)?.[1]?.trim().replace(/[`;]$/, '')

  if (!accent && !heading && !body) return null

  return {
    id,
    name: 'DESIGN.md 导入',
    accent,
    headingFontFamily: heading,
    fontFamily: body,
    description: voice ? voice.split('\n')[0].slice(0, 80) : '从 OpenDesign DESIGN.md 解析',
  }
}

function splitSections(markdown: string): Map<string, string> {
  const map = new Map<string, string>()
  const lines = markdown.split('\n')
  let current = ''
  let buffer: string[] = []
  const flush = () => {
    if (current) map.set(current, buffer.join('\n'))
  }
  for (const line of lines) {
    const match = /^#{1,3}\s+(.+?)\s*$/.exec(line)
    if (match) {
      flush()
      current = match[1].toLowerCase().trim()
      buffer = []
    } else {
      buffer.push(line)
    }
  }
  flush()
  return map
}

function normalizeHex(hex: string): string {
  if (hex.length === 4) {
    const [r, g, b] = hex.slice(1)
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return hex.toLowerCase()
}

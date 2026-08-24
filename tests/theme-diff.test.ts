import { describe, expect, it } from 'vitest'
import { contrastOn, contrastRatio, deriveAccentFamily, hexToOklch } from '../src/theme/color-ramp'
import { mixHex, deriveCanvas } from '../src/theme/canvas'
import { parseDesignMd, BUILTIN_THEMES, findTheme } from '../src/theme/presets'
import { diffDecks, formatDiff } from '../src/utils/diff'
import type { PPTConfig } from '../src/types'

describe('OKLCH color ramp', () => {
  it('accent family 保持色相推导 dim/bright', () => {
    const seed = '#61b0f1'
    const family = deriveAccentFamily(seed)
    expect(family.accent.toLowerCase()).toBe(seed)
    const h = hexToOklch(seed)
    const dim = hexToOklch(family.accentDim)
    const bright = hexToOklch(family.accentBright)
    // 色相大体保持（OKLCH gamut clamp 在亮度下限附近允许色相漂移，±30° 内）
    const hueDelta = Math.min(Math.abs(dim.h - h.h), 360 - Math.abs(dim.h - h.h))
    expect(hueDelta).toBeLessThan(30)
    expect(dim.l).toBeLessThan(h.l)
    expect(bright.l).toBeGreaterThan(h.l)
  })

  it('contrastOn 亮底选墨、暗底选纸', () => {
    expect(contrastOn('#ffffff')).toBe('#161616')
    expect(contrastOn('#111111')).toBe('#fafafa')
  })

  it('contrastRatio 白黑对比 ≈ 21', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeGreaterThan(18)
  })
})

describe('canvas 停点', () => {
  it('mixHex 百分比插值', () => {
    expect(mixHex('#000000', 0, '#ffffff')).toBe('#ffffff')
    expect(mixHex('#000000', 100, '#ffffff')).toBe('#000000')
    expect(mixHex('#000000', 50, '#ffffff')).toBe('#808080')
  })

  it('deriveCanvas 输出全部停点', () => {
    const light = deriveCanvas('#61b0f1', false)
    expect(light).toHaveProperty('--bg')
    expect(light).toHaveProperty('--card')
    const dark = deriveCanvas('#61b0f1', true)
    expect(Object.keys(dark)).toHaveLength(4)
  })
})

describe('DESIGN.md 解析', () => {
  it('提取色板与双字体', () => {
    const md = `## Palette\n\n- Primary: #D93025\n- Second: #1A73E8\n\n## Typography\n\n- heading font-family: 'Playfair Display', serif\n- body font-family: 'Roboto', sans-serif\n`
    const preset = parseDesignMd(md)
    expect(preset?.accent).toBe('#d93025')
    expect(preset?.headingFontFamily).toContain('Playfair')
    expect(preset?.fontFamily).toContain('Roboto')
  })

  it('三短 hex 归一化', () => {
    const preset = parseDesignMd('## Palette\n\n#f00\n')
    expect(preset?.accent).toBe('#ff0000')
  })

  it('无法识别返回 null', () => {
    expect(parseDesignMd('# 只是标题\n\n普通文字')).toBeNull()
  })

  it('内置预设可查找', () => {
    expect(findTheme('tech-share')?.id).toBe('tech-share')
    expect(findTheme('nope')).toBeUndefined()
    expect(BUILTIN_THEMES.length).toBeGreaterThanOrEqual(4)
  })
})

describe('deck diff', () => {
  const base: PPTConfig = {
    title: 'v1', author: 'a',
    theme: { autoChange: true, changeByOS: true, changeByHour: false, hourDarkActive: '18:30', hourDarkInactive: '07:00' },
    narration: { enabled: false, lang: 'zh-CN', rate: 1 },
    autoplay: { enabled: false, defaultDuration: 3000 },
    slides: [
      { type: 'cover', title: 'T' },
      { type: 'content', title: 'A', bullets: ['x'] },
      { type: 'content', title: 'B', bullets: ['y'] },
      { type: 'end', title: 'End' },
    ],
  }

  it('完全一致零差异', () => {
    expect(formatDiff(diffDecks(base, structuredClone(base)))).toContain('一致')
  })

  it('检出新增/删除/修改', () => {
    const other = structuredClone(base)
    other.slides.push({ type: 'quote', quote: 'q' })                      // 新增
    other.slides = other.slides.filter(s => !(s.type === 'content' && s.title === 'A')) // 删除
    other.slides[0] = { type: 'content', title: 'B', bullets: ['changed'] } // 修改
    const entries = diffDecks(base, other)
    expect(entries.some(e => e.kind === 'added')).toBe(true)
    expect(entries.some(e => e.kind === 'removed')).toBe(true)
    expect(entries.some(e => e.kind === 'changed')).toBe(true)
  })

  it('检出顺序移动', () => {
    const other = structuredClone(base)
    // 交换两页 content
    const tmp = other.slides[1]
    other.slides[1] = other.slides[2]
    other.slides[2] = tmp
    const entries = diffDecks(base, other)
    expect(entries.some(e => e.kind === 'moved')).toBe(true)
  })

  it('元信息变更', () => {
    const other = structuredClone(base)
    other.title = 'v2'
    const entries = diffDecks(base, other)
    expect(entries.some(e => e.page === 0 && e.summary.includes('title'))).toBe(true)
  })
})

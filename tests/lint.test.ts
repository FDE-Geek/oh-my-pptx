import { describe, expect, it } from 'vitest'
import { lintDeck, formatIssues } from '../src/utils/lint'
import type { PPTConfig } from '../src/types'

const base: PPTConfig = {
  title: 't',
  author: 'a',
  theme: { autoChange: true, changeByOS: true, changeByHour: false, hourDarkActive: '18:30', hourDarkInactive: '07:00' },
  narration: { enabled: false, lang: 'zh-CN', rate: 1 },
  autoplay: { enabled: false, defaultDuration: 3000 },
  slides: [],
}

describe('lintDeck', () => {
  it('空 deck 报错', () => {
    const issues = lintDeck({ ...base, slides: [] })
    expect(issues).toHaveLength(1)
    expect(issues[0].level).toBe('error')
  })

  it('干净 deck 零问题', () => {
    const doc: PPTConfig = {
      ...base,
      slides: [
        { type: 'cover', title: 'T' },
        { type: 'content', title: 'A', bullets: ['短句'] },
        { type: 'end', title: 'Thanks' },
      ],
    }
    expect(lintDeck(doc)).toHaveLength(0)
  })

  it('chart 数据不对齐报错', () => {
    const doc: PPTConfig = {
      ...base,
      slides: [
        { type: 'cover', title: 'T' },
        { type: 'chart', title: 'c', chart: { kind: 'bar', labels: ['a', 'b'], series: [{ name: 's', data: [1] }] } },
        { type: 'end', title: 'x' },
      ],
    }
    const issues = lintDeck(doc)
    expect(issues.some(i => i.level === 'error' && i.message.includes('数据'))).toBe(true)
  })

  it('diagram 悬空边引用报错', () => {
    const doc: PPTConfig = {
      ...base,
      slides: [
        { type: 'cover', title: 'T' },
        { type: 'diagram', title: 'd', diagram: { nodes: [{ id: 'a', x: 0, y: 0, label: 'A' }], edges: [{ source: 'a', target: 'ghost' }] } },
        { type: 'end', title: 'x' },
      ],
    }
    const issues = lintDeck(doc)
    expect(issues.some(i => i.level === 'error' && i.message.includes('ghost'))).toBe(true)
  })

  it('bullets 超长与超量给警告', () => {
    const doc: PPTConfig = {
      ...base,
      slides: [
        { type: 'cover', title: 'T' },
        { type: 'content', title: 'A', bullets: Array.from({ length: 7 }, () => 'x'.repeat(31)) },
        { type: 'end', title: 'x' },
      ],
    }
    const issues = lintDeck(doc)
    expect(issues.some(i => i.message.includes('超过 6'))).toBe(true)
    expect(issues.some(i => i.message.includes('过长'))).toBe(true)
    expect(issues.every(i => i.level === 'warn')).toBe(true)
  })

  it('连续 content 无 section 提示节奏', () => {
    const slides = [
      { type: 'cover' as const, title: 'T' },
      ...Array.from({ length: 7 }, (_, i) => ({ type: 'content' as const, title: `p${i}`, bullets: ['x'] })),
      { type: 'end' as const, title: 'x' },
    ]
    const issues = lintDeck({ ...base, slides })
    expect(issues.some(i => i.message.includes('节奏'))).toBe(true)
  })

  it('formatIssues 输出统计行', () => {
    const out = formatIssues([])
    expect(out).toContain('通过')
  })
})

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
        { type: 'end', title: 'Thanks', takeaways: ['带走一句'] },
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

  it('notes-coverage：正文页 <50% 有 notes 才报（排除 cover/section/end）', () => {
    const body = [
      { type: 'content' as const, title: 'A', bullets: ['x'], notes: '目的：A。转场：B。' },
      { type: 'content' as const, title: 'B', bullets: ['x'] },
      { type: 'chart' as const, title: 'c', chart: { kind: 'bar' as const, labels: ['a'], series: [{ name: 's', data: [1] }] } },
      { type: 'quote' as const, quote: '金句' },
    ]
    const below: PPTConfig = {
      ...base,
      narration: { ...base.narration, enabled: true },
      slides: [
        { type: 'cover', title: 'T' },
        { type: 'section', title: '章' },
        ...body,
        { type: 'end', title: 'x', takeaways: ['记住'] },
      ],
    }
    expect(lintDeck(below).some(i => i.code === 'notes-coverage')).toBe(true)

    const atHalf: PPTConfig = {
      ...below,
      slides: [
        { type: 'cover', title: 'T' },
        { type: 'section', title: '章' },
        body[0],
        { ...body[1], notes: '目的：B。转场：图。' },
        body[2],
        body[3],
        { type: 'end', title: 'x', takeaways: ['记住'] },
      ],
    }
    expect(lintDeck(atHalf).some(i => i.code === 'notes-coverage')).toBe(false)
  })

  it('notes-coverage：narration 关闭或只有结构页则不报', () => {
    const off: PPTConfig = {
      ...base,
      slides: [
        { type: 'cover', title: 'T' },
        { type: 'content', title: 'A', bullets: ['x'] },
        { type: 'end', title: 'x', takeaways: ['记住'] },
      ],
    }
    expect(lintDeck(off).some(i => i.code === 'notes-coverage')).toBe(false)

    const structureOnly: PPTConfig = {
      ...base,
      narration: { ...base.narration, enabled: true },
      slides: [
        { type: 'cover', title: 'T' },
        { type: 'section', title: '章' },
        { type: 'end', title: 'x', takeaways: ['记住'] },
      ],
    }
    expect(lintDeck(structureOnly).some(i => i.code === 'notes-coverage')).toBe(false)
  })

  it('narrative-tail：end 缺 takeaways 且末三页无 quote 才报', () => {
    const bothMissing: PPTConfig = {
      ...base,
      slides: [
        { type: 'cover', title: 'T' },
        { type: 'content', title: 'A', bullets: ['x'] },
        { type: 'end', title: 'x' },
      ],
    }
    expect(lintDeck(bothMissing).some(i => i.code === 'narrative-tail')).toBe(true)

    const hasTakeaways: PPTConfig = {
      ...bothMissing,
      slides: [
        { type: 'cover', title: 'T' },
        { type: 'content', title: 'A', bullets: ['x'] },
        { type: 'end', title: 'x', takeaways: ['记住'] },
      ],
    }
    expect(lintDeck(hasTakeaways).some(i => i.code === 'narrative-tail')).toBe(false)

    const hasQuote: PPTConfig = {
      ...base,
      slides: [
        { type: 'cover', title: 'T' },
        { type: 'quote', quote: '少即是多。' },
        { type: 'end', title: 'x' },
      ],
    }
    expect(lintDeck(hasQuote).some(i => i.code === 'narrative-tail')).toBe(false)
  })

  it('tag / items / takeaways 是合法字段', () => {
    const doc: PPTConfig = {
      ...base,
      slides: [
        { type: 'cover', title: 'T', tag: 'v1' },
        {
          type: 'section',
          title: '目录',
          items: [{ title: '一', summary: '摘要' }],
        },
        { type: 'end', title: 'Thanks', takeaways: ['记住这一句'] },
      ],
    }
    expect(lintDeck(doc)).toHaveLength(0)
  })
})

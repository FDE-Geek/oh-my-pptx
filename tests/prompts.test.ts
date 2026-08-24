import { describe, expect, it } from 'vitest'
import { formatClarifyBlock, parseMinutes } from '../prompts/clarify'
import { pageBudget, renderUserPrompt, findPrompt } from '../prompts/index'

describe('parseMinutes / formatClarifyBlock', () => {
  it('抽出时长数字', () => {
    expect(parseMinutes('15')).toBe(15)
    expect(parseMinutes('约 20 分钟')).toBe(20)
    expect(parseMinutes('无')).toBeUndefined()
    expect(parseMinutes('')).toBeUndefined()
  })

  it('空答案不输出澄清块', () => {
    expect(formatClarifyBlock({})).toBe('')
    expect(formatClarifyBlock({ style: '  ' })).toBe('')
  })

  it('preset 风格标注 themePreset', () => {
    const block = formatClarifyBlock({
      style: 'tech-share',
      audience: '内部技术分享',
      duration: '15',
      material: '无',
      hard: '不能出现竞品名',
    })
    expect(block).toContain('【需求澄清】')
    expect(block).toContain('themePreset 用 tech-share')
    expect(block).toContain('内部技术分享')
    expect(block).toContain('不能出现竞品名')
  })
})

describe('pageBudget', () => {
  it('full-deck 按时长换算（15→10，30→20）', () => {
    expect(pageBudget('full-deck', 15).target).toBe(10)
    expect(pageBudget('full-deck', 30).target).toBe(20)
    expect(pageBudget('full-deck', 45).target).toBe(30)
    expect(pageBudget('full-deck').hint).toContain('12–18')
  })

  it('lightning-talk 固定 6–8，不吃换算', () => {
    const five = pageBudget('lightning-talk', 5)
    expect(five.target).toBeUndefined()
    expect(five.min).toBe(6)
    expect(five.max).toBe(8)
    expect(five.hint).toContain('不按时长换算')
  })

  it('data-review / tech-tutorial 有各自上下限', () => {
    expect(pageBudget('data-review', 15).target).toBe(10)
    expect(pageBudget('data-review', 5).target).toBe(10)
    expect(pageBudget('tech-tutorial', 45).target).toBe(24)
  })
})

describe('renderUserPrompt', () => {
  it('注入澄清摘要与页数预算，且区分 notes / narration', () => {
    const text = renderUserPrompt(findPrompt('full-deck'), 'Rust 入门', {
      minutes: 15,
      answers: { style: 'tech-share', duration: '15', audience: '内部' },
    })
    expect(text).toContain('Rust 入门')
    expect(text).toContain('【需求澄清】')
    expect(text).toContain('内部')
    expect(text).toContain('目标 10 页')
    expect(text).toContain('目的：')
    expect(text).toContain('narration')
    expect(text).not.toContain('{clarify}')
    expect(text).not.toContain('{pageBudget}')
  })
})

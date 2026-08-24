import { describe, expect, it } from 'vitest'
import { convertSlide, NEW_SLIDE } from '../src/components/editor/slideFactory'
import type { ContentSlide, EndSlide, TwoColumnSlide } from '../src/types'

describe('convertSlide', () => {
  it('保留共有字段与标题', () => {
    const next = convertSlide(
      { type: 'content', title: '所有权', tag: '§1', notes: '目的：A。转场：B。', bullets: ['一', '二'] },
      'code',
    )
    expect(next.type).toBe('code')
    expect(next.tag).toBe('§1')
    expect(next.notes).toContain('目的')
    if (next.type === 'code') expect(next.title).toBe('所有权')
  })

  it('content → end 把 bullets 收成 takeaways', () => {
    const next = convertSlide(
      { type: 'content', title: '记住', bullets: ['甲', '乙', '丙'] },
      'end',
    ) as EndSlide
    expect(next.takeaways).toEqual(['甲', '乙', '丙'])
  })

  it('content → two-column 对半分要点', () => {
    const next = convertSlide(
      { type: 'content', title: '对比', bullets: ['a', 'b', 'c'] },
      'two-column',
    ) as TwoColumnSlide
    expect(next.left.bullets).toEqual(['a', 'b'])
    expect(next.right.bullets).toEqual(['c'])
  })

  it('同页型是同一引用语义（内容不变）', () => {
    const slide: ContentSlide = { type: 'content', title: 'T', bullets: ['x'] }
    expect(convertSlide(slide, 'content')).toBe(slide)
  })

  it('每种页型工厂可构造', () => {
    for (const type of Object.keys(NEW_SLIDE) as (keyof typeof NEW_SLIDE)[]) {
      expect(NEW_SLIDE[type]().type).toBe(type)
    }
  })
})

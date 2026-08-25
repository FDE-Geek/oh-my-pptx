import { describe, expect, it } from 'vitest'
import { LIGHT_STAGE, DARK_STAGE, auditStageContrast } from '../src/theme/contrast-audit'
import { slideHeading, slideLiveText } from '../src/utils/a11y'
import type { Slide } from '../src/types'

describe('slideHeading / live 文案', () => {
  it('优先用 title', () => {
    expect(slideHeading({ type: 'cover', title: '季度汇报' })).toBe('季度汇报')
  })

  it('金句页截 quote', () => {
    const short: Slide = { type: 'quote', quote: '少即是多。' }
    expect(slideHeading(short)).toBe('少即是多。')
    const long: Slide = {
      type: 'quote',
      quote: '金句'.repeat(25),
    }
    expect(slideHeading(long).endsWith('…')).toBe(true)
    expect(slideHeading(long).length).toBeLessThanOrEqual(41)
  })

  it('空 slide 返回空串', () => {
    expect(slideHeading(undefined)).toBe('')
  })

  it('拼出第 N 页宣告', () => {
    expect(slideLiveText(0, 5, { type: 'cover', title: '开场' })).toBe(
      '第 1 页，共 5 页。开场',
    )
  })
})

describe('舞台 token 对比度', () => {
  it('亮色：正文 ≥4.5、sfg/UI ≥3、on-accent ≥4.5', () => {
    const r = auditStageContrast(LIGHT_STAGE)
    expect(r.fgOnBg).toBeGreaterThanOrEqual(4.5)
    expect(r.sfgOnBg).toBeGreaterThanOrEqual(3)
    expect(r.onAccent).toBeGreaterThanOrEqual(4.5)
  })

  it('暗色：正文 ≥4.5、sfg/UI ≥3、on-accent ≥4.5', () => {
    const r = auditStageContrast(DARK_STAGE)
    expect(r.fgOnBg).toBeGreaterThanOrEqual(4.5)
    expect(r.sfgOnBg).toBeGreaterThanOrEqual(3)
    expect(r.onAccent).toBeGreaterThanOrEqual(4.5)
  })
})

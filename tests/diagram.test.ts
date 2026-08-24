import { describe, expect, it } from 'vitest'
import { edgeAttrsToSpec, edgeLabelText, routerNameOf } from '../src/utils/diagram-spec'

describe('edgeAttrsToSpec', () => {
  it('虚线边：strokeDasharray 有值 → dashed', () => {
    expect(edgeAttrsToSpec({ line: { strokeDasharray: '6 4', targetMarker: 'block' } })).toEqual({
      dashed: true,
      arrow: undefined,
      router: undefined,
    })
  })

  it('无箭头边：targetMarker 空 → arrow false', () => {
    expect(edgeAttrsToSpec({ line: { targetMarker: null } })).toEqual({
      dashed: undefined,
      arrow: false,
      router: undefined,
    })
  })

  it('直线路由：router normal', () => {
    expect(edgeAttrsToSpec({ line: { targetMarker: 'block' } }, 'normal')).toEqual({
      dashed: undefined,
      arrow: undefined,
      router: 'normal',
    })
  })

  it('空 attrs 视为无箭头实线 orth', () => {
    expect(edgeAttrsToSpec({})).toEqual({
      dashed: undefined,
      arrow: false,
      router: undefined,
    })
  })
})

describe('edgeLabelText', () => {
  it('读 attrs.label.text', () => {
    expect(edgeLabelText({ labels: [{ attrs: { label: { text: '可选' } } }] })).toBe('可选')
  })

  it('读简写 text', () => {
    expect(edgeLabelText({ labels: [{ text: '简写' }] })).toBe('简写')
  })

  it('无 labels 为 undefined', () => {
    expect(edgeLabelText({ labels: [] })).toBeUndefined()
  })
})

describe('routerNameOf', () => {
  it('吃字符串或 { name }', () => {
    expect(routerNameOf('normal')).toBe('normal')
    expect(routerNameOf({ name: 'orth', args: { padding: 12 } })).toBe('orth')
    expect(routerNameOf(undefined)).toBeUndefined()
  })
})

import { describe, expect, it } from 'vitest'
import { compileDiagramFlow, expandDiagramSlide } from '../src/utils/diagram-flow'

describe('compileDiagramFlow', () => {
  it('链 + 虚线 + dagre', () => {
    const r = compileDiagramFlow('a[甲] -> b[乙] -.-> c')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.spec.layout).toBe('dagre')
    expect(r.spec.nodes.map(n => n.id)).toEqual(['a', 'b', 'c'])
    expect(r.spec.nodes[0].label).toBe('甲')
    expect(r.spec.edges).toHaveLength(2)
    expect(r.spec.edges[0]).toMatchObject({ source: 'a', target: 'b' })
    expect(r.spec.edges[1]).toMatchObject({ source: 'b', target: 'c', dashed: true })
  })

  it('无箭头 --', () => {
    const r = compileDiagramFlow('a -- b')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.spec.edges[0].arrow).toBe(false)
  })

  it('边标签 : 与 | |', () => {
    const colon = compileDiagramFlow('a -> b : 可选')
    expect(colon.ok).toBe(true)
    if (colon.ok) expect(colon.spec.edges[0].label).toBe('可选')
    const pipe = compileDiagramFlow('a ->|是| b')
    expect(pipe.ok).toBe(true)
    if (pipe.ok) expect(pipe.spec.edges[0].label).toBe('是')
  })

  it('形状 diamond / ellipse / double-rect', () => {
    const r = compileDiagramFlow('j[判断]{diamond}\nok(ellipse)\nproc[[double-rect]]')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.spec.nodes.find(n => n.id === 'j')?.shape).toBe('diamond')
    expect(r.spec.nodes.find(n => n.id === 'ok')?.shape).toBe('ellipse')
    expect(r.spec.nodes.find(n => n.id === 'proc')?.shape).toBe('double-rect')
  })

  it('@dir 与 @fill', () => {
    const r = compileDiagramFlow('@dir LR\n@fill cfg #5b8af8\ncfg[读配置] -> db')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.spec.layoutDir).toBe('LR')
    expect(r.spec.nodes.find(n => n.id === 'cfg')?.fill).toBe('#5b8af8')
  })

  it('先出现的标签保留', () => {
    const r = compileDiagramFlow('a[甲]\na[乙] -> b')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.spec.nodes[0].label).toBe('甲')
  })

  it('非法 id 报错', () => {
    const r = compileDiagramFlow('配置 -> db')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors[0].message).toMatch(/id/)
  })

  it('空简写报错', () => {
    expect(compileDiagramFlow('  \n  ').ok).toBe(false)
  })
})

describe('expandDiagramSlide', () => {
  it('flow 与 nodes 混写报错', () => {
    const r = expandDiagramSlide({
      type: 'diagram',
      diagram: { flow: 'a -> b', nodes: [{ id: 'a', x: 0, y: 0, label: 'a' }] },
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0].message).toMatch(/不能同时/)
  })

  it('编译后去掉 flow', () => {
    const r = expandDiagramSlide({
      type: 'diagram',
      title: '链',
      diagram: { flow: 'a[甲] -> b' },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const diagram = r.slide.diagram as { flow?: unknown; nodes: { id: string }[] }
    expect(diagram.flow).toBeUndefined()
    expect(diagram.nodes.map(n => n.id)).toEqual(['a', 'b'])
  })
})

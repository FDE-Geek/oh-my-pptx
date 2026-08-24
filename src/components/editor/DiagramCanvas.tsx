import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Download,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Trash2,
  Wand2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import type { Graph } from '@antv/x6'
import type { DiagramNodeSpec, DiagramSpec } from '../../types'
import {
  mountGraph,
  graphToSpec,
  applyDagreLayout,
  applyEdgeVisual,
  downloadRenderedSvg,
} from '../../utils/diagram'

type Sel =
  | { kind: 'none' }
  | { kind: 'node'; id: string }
  | { kind: 'edge'; id: string; source: string; target: string }
  | { kind: 'multi'; count: number }

const SHAPES: { shape: NonNullable<DiagramNodeSpec['shape']>; label: string }[] = [
  { shape: 'rect', label: '矩形' },
  { shape: 'ellipse', label: '椭圆' },
  { shape: 'diamond', label: '菱形' },
  { shape: 'double-rect', label: '双框' },
]

function isTypingTarget(el: EventTarget | null): boolean {
  return (
    el instanceof HTMLElement &&
    (el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.tagName === 'SELECT' ||
      el.isContentEditable)
  )
}

function portalRoot(): HTMLElement {
  return document.querySelector('.ed-root') ?? document.body
}

/**
 * 属性栏只渲染入口卡片（无 Graph 宿主）。
 * 工作台经 portal 挂到 .ed-root：拖节点回流 spec 不重挂 Graph。
 */
export function DiagramCanvas({
  spec,
  onChange,
}: {
  spec: DiagramSpec
  onChange: (next: DiagramSpec) => void
}) {
  const [focused, setFocused] = useState(false)
  const [sel, setSel] = useState<Sel>({ kind: 'none' })
  const [zoomPct, setZoomPct] = useState(100)
  const [svgOk, setSvgOk] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const workbenchRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<Graph | null>(null)
  const specRef = useRef(spec)
  specRef.current = spec
  const selRef = useRef(sel)
  selRef.current = sel
  const fromGraph = useRef(false)
  const skipEpoch = useRef(false)
  const pendingSelect = useRef<string | null>(null)
  const [epoch, setEpoch] = useState(0)

  const enter = useCallback(() => {
    skipEpoch.current = true
    setSel({ kind: 'none' })
    setFocused(true)
  }, [])

  const exit = useCallback(() => {
    setFocused(false)
    setSel({ kind: 'none' })
  }, [])

  useEffect(() => {
    if (!focused) return
    if (skipEpoch.current) {
      skipEpoch.current = false
      return
    }
    if (fromGraph.current) {
      fromGraph.current = false
      return
    }
    setEpoch(n => n + 1)
  }, [spec, focused])

  useEffect(() => {
    if (!focused) {
      graphRef.current = null
      return
    }
    const host = containerRef.current
    if (!host) return

    const graph = mountGraph(host, specRef.current, false)
    graphRef.current = graph

    const sync = () => {
      fromGraph.current = true
      onChange(graphToSpec(graph, specRef.current))
    }
    const fitSize = () => {
      if (host.clientWidth > 0 && host.clientHeight > 0) {
        graph.resize(host.clientWidth, host.clientHeight)
      }
    }
    const reportZoom = () => setZoomPct(Math.round(graph.zoom() * 100))

    fitSize()
    requestAnimationFrame(() => {
      fitSize()
      graph.zoomToFit({ padding: 48, maxScale: 1 })
      reportZoom()
    })

    const ro = new ResizeObserver(fitSize)
    ro.observe(host)

    graph.on('selection:changed', ({ selected }) => {
      if (selected.length === 0) setSel({ kind: 'none' })
      else if (selected.length === 1 && selected[0].isNode()) {
        setSel({ kind: 'node', id: String(selected[0].id) })
      } else if (selected.length === 1 && selected[0].isEdge()) {
        const edge = selected[0]
        setSel({
          kind: 'edge',
          id: String(edge.id),
          source: String(edge.getSourceCellId()),
          target: String(edge.getTargetCellId()),
        })
      } else setSel({ kind: 'multi', count: selected.length })
    })
    graph.on('node:moved', sync)
    graph.on('node:resized', sync)
    graph.on('node:added', sync)
    graph.on('node:removed', sync)
    graph.on('edge:added', sync)
    graph.on('edge:removed', sync)
    graph.on('edge:connected', sync)
    graph.on('scale', reportZoom)

    const want = pendingSelect.current
    if (want) {
      pendingSelect.current = null
      graph.select(want)
    }

    return () => {
      ro.disconnect()
      graph.dispose()
      if (graphRef.current === graph) graphRef.current = null
    }
    // epoch：撤销/自动布局等外部 spec 变化才重挂；拖节点走 fromGraph 跳过
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, epoch])

  const addNode = (shape: NonNullable<DiagramNodeSpec['shape']> = 'rect') => {
    const id = `n${Date.now().toString(36)}`
    pendingSelect.current = id
    onChange({
      ...spec,
      nodes: [
        ...spec.nodes,
        {
          id,
          x: 120 + ((spec.nodes.length * 60) % 360),
          y: 80 + ((spec.nodes.length * 40) % 240),
          label: '新节点',
          shape,
          height: shape === 'diamond' ? 72 : undefined,
        },
      ],
    })
  }

  const autoLayout = (dir: 'TB' | 'LR') => {
    onChange({ ...applyDagreLayout(spec, dir), layout: 'dagre', layoutDir: dir })
    setSel({ kind: 'none' })
  }

  const removeSelected = useCallback(() => {
    const graph = graphRef.current
    if (graph) {
      const cells = graph.getSelectedCells()
      if (cells.length === 0) return
      graph.removeCells(cells)
      return
    }
    const current = selRef.current
    if (current.kind === 'node') {
      onChange({
        nodes: specRef.current.nodes.filter(n => n.id !== current.id),
        edges: specRef.current.edges.filter(e => e.source !== current.id && e.target !== current.id),
      })
    } else if (current.kind === 'edge') {
      onChange({
        ...specRef.current,
        edges: specRef.current.edges.filter(
          e => !(e.source === current.source && e.target === current.target),
        ),
      })
    }
    setSel({ kind: 'none' })
  }, [onChange])

  useEffect(() => {
    if (!focused) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        exit()
        return
      }
      if (isTypingTarget(e.target) || isTypingTarget(document.activeElement)) return
      const root = workbenchRef.current
      const target = e.target
      const inWorkbench =
        root != null &&
        (root.contains(target as Node) || root.contains(document.activeElement))
      const onChrome = target === document.body || target === document.documentElement
      if (!inWorkbench && !onChrome) return
      if (e.key === 'z' && (e.metaKey || e.ctrlKey)) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        e.stopPropagation()
        removeSelected()
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        graphRef.current?.select(graphRef.current.getCells())
        return
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const graph = graphRef.current
        if (!graph) return
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        graph.getSelectedCells().forEach(cell => {
          if (cell.isNode()) cell.translate(dx, dy)
        })
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [focused, exit, removeSelected])

  const bumpZoom = (delta: number) => {
    const graph = graphRef.current
    if (!graph) return
    graph.zoom(delta)
    setZoomPct(Math.round(graph.zoom() * 100))
  }

  const fitView = () => {
    const graph = graphRef.current
    if (!graph) return
    graph.zoomToFit({ padding: 48, maxScale: 1.5 })
    setZoomPct(Math.round(graph.zoom() * 100))
  }

  const exportSvg = () => {
    const host = containerRef.current
    if (!host) return
    const ok = downloadRenderedSvg(host)
    setSvgOk(ok)
  }

  const selectedNode = sel.kind === 'node' ? spec.nodes.find(n => n.id === sel.id) : undefined
  const selectedEdge =
    sel.kind === 'edge'
      ? spec.edges.find(e => e.source === sel.source && e.target === sel.target)
      : undefined

  const patchNode = (partial: Partial<DiagramNodeSpec>, remount = false) => {
    if (!selectedNode) return
    if (!remount) fromGraph.current = true
    onChange({
      ...spec,
      nodes: spec.nodes.map(n => (n.id === selectedNode.id ? { ...n, ...partial } : n)),
    })
    const cell = graphRef.current?.getCellById(selectedNode.id)
    if (!cell?.isNode() || remount) return
    if (partial.label !== undefined) cell.attr('label/text', partial.label)
    if ('fill' in partial) {
      const fill = partial.fill
      cell.attr('body/fill', fill || 'var(--card)')
      cell.attr('body/stroke', fill || 'var(--accent)')
    }
  }

  const patchEdge = (partial: Partial<(typeof spec.edges)[number]>) => {
    if (sel.kind !== 'edge' || !selectedEdge) return
    const next = { ...selectedEdge, ...partial }
    fromGraph.current = true
    onChange({
      ...spec,
      edges: spec.edges.map(e =>
        e.source === selectedEdge.source && e.target === selectedEdge.target ? next : e,
      ),
    })
    const cell = graphRef.current?.getCellById(sel.id)
    if (!cell?.isEdge()) return
    applyEdgeVisual(cell, next)
  }

  const idle = (
    <div className="ed-diagram-idle">
      <p>
        <strong>{spec.nodes.length}</strong> 个节点 · <strong>{spec.edges.length}</strong> 条边
      </p>
      <p>图示请在专注模式里拖节点、拉连线。侧栏只改标题和讲稿。</p>
      <button type="button" className="ed-btn ed-btn-primary" onClick={enter}>
        <Maximize2 size={14} />
        进入专注模式
      </button>
    </div>
  )

  if (!focused) return idle

  const workbench = (
    <div ref={workbenchRef} className="ed-diagram-focus" role="dialog" aria-label="图示专注编辑">
      <div className="ed-diagram-bar">
        {SHAPES.map(item => (
          <button
            key={item.shape}
            type="button"
            className="ed-btn"
            title={`添加${item.label}`}
            onClick={() => addNode(item.shape)}
          >
            {item.label}
          </button>
        ))}
        <button type="button" className="ed-btn" disabled={sel.kind === 'none'} onClick={removeSelected}>
          <Trash2 size={13} /> 删除选中
        </button>
        <button type="button" className="ed-btn" title="上下分层" onClick={() => autoLayout('TB')}>
          <Wand2 size={13} /> 布局 ↕
        </button>
        <button type="button" className="ed-btn" title="左右分层" onClick={() => autoLayout('LR')}>
          <LayoutGrid size={13} /> 布局 ↔
        </button>
        <button type="button" className="ed-btn" title="缩小" onClick={() => bumpZoom(-0.15)}>
          <ZoomOut size={13} />
        </button>
        <span className="text-xs text-sfg tabular-nums">{zoomPct}%</span>
        <button type="button" className="ed-btn" title="放大" onClick={() => bumpZoom(0.15)}>
          <ZoomIn size={13} />
        </button>
        <button type="button" className="ed-btn" onClick={fitView}>
          适应窗口
        </button>
        <button
          type="button"
          className="ed-btn"
          title={svgOk ? '导出 SVG 快照（不是 round-trip）' : '主题色未解析，无法导出'}
          disabled={!svgOk}
          onClick={exportSvg}
        >
          <Download size={13} /> SVG
        </button>
        <span className="flex-1 text-xs text-sfg">
          空白拖框选 · 节点边缘拉线 · Shift+拖平移 · Del 删除 · Esc 退出
        </span>
        <button type="button" className="ed-btn ed-btn-primary" onClick={exit}>
          <Minimize2 size={13} />
          退出专注
        </button>
      </div>

      <div className="ed-diagram-stage">
        <div className="ed-diagram-canvas">
          <div ref={containerRef} className="h-full w-full" />
        </div>
        {selectedNode && (
          <div className="ed-diagram-inspect thin-scroll">
            <p className="ed-section" style={{ marginTop: 0 }}>
              节点
            </p>
            <label className="mb-phi-sm flex flex-col gap-phi-xs text-xs text-sfg">
              文字
              <input
                type="text"
                value={selectedNode.label}
                onChange={e => patchNode({ label: e.target.value })}
                className="rounded-md border border-[var(--ed-line)] bg-[var(--ed-field)] px-phi-xs py-phi-xs text-sm text-[var(--ed-ink)] outline-none focus:border-accent"
              />
            </label>
            <label className="mb-phi-sm flex flex-col gap-phi-xs text-xs text-sfg">
              填充色
              <input
                type="text"
                value={selectedNode.fill ?? ''}
                placeholder="#61b0f1"
                onChange={e => patchNode({ fill: e.target.value || undefined })}
                className="rounded-md border border-[var(--ed-line)] bg-[var(--ed-field)] px-phi-xs py-phi-xs text-sm text-[var(--ed-ink)] outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-phi-xs text-xs text-sfg">
              形状
              <select
                value={selectedNode.shape ?? 'rect'}
                onChange={e =>
                  patchNode({ shape: e.target.value as DiagramNodeSpec['shape'] }, true)
                }
                className="rounded-md border border-[var(--ed-line)] bg-[var(--ed-field)] px-phi-xs py-phi-xs text-sm text-[var(--ed-ink)] outline-none focus:border-accent"
              >
                <option value="rect">矩形</option>
                <option value="ellipse">椭圆</option>
                <option value="diamond">菱形（判断）</option>
                <option value="double-rect">双框（过程）</option>
              </select>
            </label>
          </div>
        )}
        {sel.kind === 'edge' && selectedEdge && (
          <div className="ed-diagram-inspect thin-scroll">
            <p className="ed-section" style={{ marginTop: 0 }}>
              边
            </p>
            <label className="mb-phi-sm flex flex-col gap-phi-xs text-xs text-sfg">
              文字
              <input
                type="text"
                value={selectedEdge.label ?? ''}
                onChange={e => patchEdge({ label: e.target.value || undefined })}
                className="rounded-md border border-[var(--ed-line)] bg-[var(--ed-field)] px-phi-xs py-phi-xs text-sm text-[var(--ed-ink)] outline-none focus:border-accent"
              />
            </label>
            <label className="ed-diagram-check">
              <input
                type="checkbox"
                checked={Boolean(selectedEdge.dashed)}
                onChange={e => patchEdge({ dashed: e.target.checked || undefined })}
              />
              虚线
            </label>
            <label className="ed-diagram-check">
              <input
                type="checkbox"
                checked={selectedEdge.arrow !== false}
                onChange={e => patchEdge({ arrow: e.target.checked ? undefined : false })}
              />
              箭头
            </label>
            <label className="flex flex-col gap-phi-xs text-xs text-sfg">
              路由
              <select
                value={selectedEdge.router ?? 'orth'}
                onChange={e =>
                  patchEdge({ router: e.target.value === 'normal' ? 'normal' : undefined })
                }
                className="rounded-md border border-[var(--ed-line)] bg-[var(--ed-field)] px-phi-xs py-phi-xs text-sm text-[var(--ed-ink)] outline-none focus:border-accent"
              >
                <option value="orth">正交</option>
                <option value="normal">直线</option>
              </select>
            </label>
          </div>
        )}
        {sel.kind === 'multi' && (
          <div className="ed-diagram-inspect thin-scroll">
            <p className="ed-section" style={{ marginTop: 0 }}>
              已选 {sel.count} 项
            </p>
            <button type="button" className="ed-btn" onClick={removeSelected}>
              <Trash2 size={13} /> 删除选中
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {idle}
      {createPortal(workbench, portalRoot())}
    </>
  )
}

import { Graph, Selection, Snapline, Transform, type Edge } from '@antv/x6'
import dagre from 'dagre'
import type { DiagramEdgeSpec, DiagramNodeSpec, DiagramSpec } from '../types'
import { contrastOn } from '../theme/color-ramp'
import { edgeAttrsToSpec, edgeLabelText, routerNameOf } from './diagram-spec'

export { edgeAttrsToSpec, edgeLabelText, routerNameOf } from './diagram-spec'

type DagreNode = { x: number; y: number; width: number; height: number }
type DagreGraph = {
  setGraph: (options: Record<string, unknown>) => void
  setDefaultEdgeLabel: (factory: () => Record<string, never>) => void
  setNode: (id: string, options: DagreNode) => void
  setEdge: (source: string, target: string) => void
  nodes: () => string[]
  node: (id: string) => DagreNode
  layout: () => void
}

function createDagre(dir: 'TB' | 'LR'): DagreGraph {
  const g = new dagre.graphlib.Graph() as unknown as DagreGraph
  g.setGraph({ rankdir: dir, nodesep: 48, ranksep: 64, marginx: 24, marginy: 24 })
  g.setDefaultEdgeLabel(() => ({}))
  return g
}

const NODE_FILL = 'var(--card)'
const TEXT_COLOR = 'var(--fg)'
const NODE_DEFAULTS = { width: 140, height: 44 }

/**
 * diamond / double-rect 非内置形状，用 Graph.registerNode 注册一次（幂等）。
 */
let shapesRegistered = false
function ensureCustomShapes() {
  if (shapesRegistered) return

  Graph.registerNode('omp-diamond', {
    inherit: 'path',
    width: 140,
    height: 72,
    markup: [
      { tagName: 'path', selector: 'body' },
      { tagName: 'text', selector: 'label' },
    ],
    attrs: {
      body: {
        refD: 'M 0.5*w 0 L w 0.5*h L 0.5*w h L 0 0.5*h Z',
        fill: NODE_FILL,
        stroke: 'var(--accent)',
        strokeWidth: 1.5,
      },
      label: {
        fill: TEXT_COLOR,
        fontSize: 13,
        refX: '50%',
        refY: '50%',
        textAnchor: 'middle',
        textVerticalAnchor: 'middle',
      },
    },
  })

  Graph.registerNode('omp-double-rect', {
    inherit: 'rect',
    width: 140,
    height: 44,
    markup: [
      { tagName: 'rect', selector: 'outer' },
      { tagName: 'rect', selector: 'body' },
      { tagName: 'text', selector: 'label' },
    ],
    attrs: {
      outer: {
        refWidth: 1,
        refHeight: 1,
        fill: 'none',
        stroke: 'var(--accent)',
        strokeWidth: 1.5,
        rx: 8,
        ry: 8,
      },
      body: {
        refWidth: -8,
        refHeight: -8,
        x: 4,
        y: 4,
        fill: NODE_FILL,
        stroke: 'var(--accent)',
        strokeWidth: 1,
        rx: 6,
        ry: 6,
      },
      label: {
        fill: TEXT_COLOR,
        fontSize: 14,
        refX: '50%',
        refY: '50%',
        textAnchor: 'middle',
        textVerticalAnchor: 'middle',
      },
    },
  })

  shapesRegistered = true
}

function edgeAttrs(edge: Pick<DiagramEdgeSpec, 'dashed' | 'arrow'>) {
  return {
    line: {
      stroke: 'var(--accent)',
      strokeWidth: 2,
      strokeDasharray: edge.dashed ? '6 4' : undefined,
      targetMarker: edge.arrow === false ? null : 'block',
    },
  }
}

/** dagre 自动布局（底层 dagre 库直调，同步）：返回带坐标的节点副本。 */
export function applyDagreLayout(
  spec: DiagramSpec,
  dir: 'TB' | 'LR' = 'TB',
): DiagramSpec {
  const g = createDagre(dir)
  for (const node of spec.nodes) {
    g.setNode(node.id, {
      width: node.width ?? NODE_DEFAULTS.width,
      height: node.height ?? (node.shape === 'diamond' ? 72 : NODE_DEFAULTS.height),
      x: 0,
      y: 0,
    })
  }
  for (const edge of spec.edges) {
    g.setEdge(edge.source, edge.target)
  }
  dagre.layout(g as unknown as Parameters<typeof dagre.layout>[0])
  const positioned = new Map(
    g.nodes().map(id => {
      const n = g.node(id)
      return [id, { x: n.x - n.width / 2, y: n.y - n.height / 2 }]
    }),
  )
  return {
    ...spec,
    nodes: spec.nodes.map(n => {
      const p = positioned.get(n.id)
      return p ? { ...n, x: Math.round(p.x), y: Math.round(p.y) } : n
    }),
  }
}

/** 布局入口：spec.layout 声明 dagre 时自动排坐标（无坐标节点也补齐）。 */
export function resolveSpec(spec: DiagramSpec): DiagramSpec {
  if (spec.layout === 'dagre') return applyDagreLayout(spec, spec.layoutDir ?? 'TB')
  return spec
}

/** 编辑态：仅当坐标全是 0 时套 dagre，避免重挂时冲掉用户拖过的位置。 */
export function specForEdit(spec: DiagramSpec): DiagramSpec {
  const parked = spec.nodes.every(n => !n.x && !n.y)
  if (spec.layout === 'dagre' && parked) return applyDagreLayout(spec, spec.layoutDir ?? 'TB')
  return spec
}

function nodeShape(node: DiagramNodeSpec): string {
  switch (node.shape) {
    case 'ellipse':
      return 'ellipse'
    case 'diamond':
      return 'omp-diamond'
    case 'double-rect':
      return 'omp-double-rect'
    default:
      return 'rect'
  }
}

function addSpecNodes(graph: Graph, spec: DiagramSpec) {
  for (const node of spec.nodes) {
    const custom = node.shape === 'diamond' || node.shape === 'double-rect'
    const base = {
      id: node.id,
      x: node.x,
      y: node.y,
      width: node.width ?? NODE_DEFAULTS.width,
      height: node.height ?? (node.shape === 'diamond' ? 72 : NODE_DEFAULTS.height),
      label: node.label,
    }
    if (custom) {
      graph.addNode({
        ...base,
        shape: nodeShape(node),
        attrs: node.fill
          ? {
              body: { fill: node.fill, stroke: node.fill },
              label: { fill: contrastOn(node.fill) },
            }
          : undefined,
      })
    } else {
      graph.addNode({
        ...base,
        shape: nodeShape(node),
        attrs: {
          body: {
            fill: node.fill ?? NODE_FILL,
            stroke: node.fill ?? 'var(--accent)',
            strokeWidth: 1.5,
            rx: 8,
            ry: 8,
          },
          label: {
            fill: node.fill ? contrastOn(node.fill) : TEXT_COLOR,
            fontSize: 14,
            refX: '50%',
            refY: '50%',
          },
        },
      })
    }
  }
}

function addSpecEdges(graph: Graph, spec: DiagramSpec) {
  // 悬空边过滤：lint 视为 error 的引用在渲染层静默跳过（X6 对缺失 terminal 不友好）
  const ids = new Set(spec.nodes.map(n => n.id))
  for (const edge of spec.edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) continue
    graph.addEdge({
      source: edge.source,
      target: edge.target,
      label: edge.label,
      attrs: edgeAttrs(edge),
      router: edge.router === 'normal' ? { name: 'normal' } : { name: 'orth', args: { padding: 12 } },
      connector: { name: 'rounded' },
    })
  }
}

/** spec → 已挂载的 Graph 实例（readonly=false 时可交互编辑；readonly 时先做自动布局）。 */
export function mountGraph(
  container: HTMLElement,
  rawSpec: DiagramSpec,
  readonly: boolean,
): Graph {
  ensureCustomShapes()
  const spec = readonly ? resolveSpec(rawSpec) : specForEdit(rawSpec)

  const graph: Graph = new Graph({
    container,
    interacting: readonly ? false : true,
    panning: readonly ? false : { enabled: true, modifiers: 'shift' },
    mousewheel: readonly
      ? false
      : { enabled: true, zoomAtMousePosition: true, modifiers: ['ctrl', 'meta'], minScale: 0.2, maxScale: 3 },
    grid: readonly
      ? false
      : { size: 16, visible: true, type: 'doubleMesh' },
    connecting: {
      connector: { name: 'rounded' },
      anchor: 'center',
      connectionPoint: 'anchor',
      allowBlank: false,
      allowLoop: false,
      createEdge() {
        return graph.createEdge({
          attrs: edgeAttrs({ arrow: true }),
          router: { name: 'orth', args: { padding: 12 } },
          connector: { name: 'rounded' },
        })
      },
    },
  })

  addSpecNodes(graph, spec)
  addSpecEdges(graph, spec)
  if (!readonly) attachWorkbenchPlugins(graph)

  return graph
}

/** 工作台专用：只读路径（放映/缩略图）不得调用。 */
function attachWorkbenchPlugins(graph: Graph) {
  graph
    .use(
      new Selection({
        enabled: true,
        multiple: true,
        rubberband: true,
        movable: true,
        showNodeSelectionBox: true,
        showEdgeSelectionBox: true,
      }),
    )
    .use(new Snapline({ enabled: true, resizing: true }))
    .use(
      new Transform({
        rotating: false,
        resizing: {
          enabled: true,
          minWidth: 40,
          minHeight: 24,
          preserveAspectRatio: node =>
            node.shape === 'omp-diamond' || node.shape === 'omp-double-rect',
        },
      }),
    )
}

function nodeLabel(node: { label?: unknown }): string {
  const label = node.label
  if (typeof label === 'string') return label
  if (label && typeof label === 'object' && 'text' in (label as Record<string, unknown>)) {
    const text = (label as { text?: unknown }).text
    if (typeof text === 'string') return text
  }
  return ''
}

function specShapeOf(json: { shape?: string }): DiagramNodeSpec['shape'] {
  switch (json.shape) {
    case 'ellipse':
      return 'ellipse'
    case 'omp-diamond':
      return 'diamond'
    case 'omp-double-rect':
      return 'double-rect'
    default:
      return 'rect'
  }
}

/** Graph 实例 → spec（编辑器同步回数据模型）。 */
export function graphToSpec(graph: Graph, spec: DiagramSpec): DiagramSpec {
  return {
    layout: spec.layout,
    layoutDir: spec.layoutDir,
    nodes: graph.getNodes().map(node => {
      const json = node.toJSON() as {
        label?: unknown
        attrs?: { body?: { fill?: string } }
        shape?: string
      }
      const position = node.getPosition()
      const size = node.getSize()
      return {
        id: String(node.id),
        x: Math.round(position.x),
        y: Math.round(position.y),
        width: Math.round(size.width),
        height: Math.round(size.height),
        label: nodeLabel(json),
        shape: specShapeOf(json),
        fill:
          json.attrs?.body?.fill && !json.attrs.body.fill.startsWith('var(')
            ? json.attrs.body.fill
            : undefined,
      }
    }),
    edges: graph.getEdges().map(edge => {
      const json = edge.toJSON() as { labels?: unknown; attrs?: { line?: { strokeDasharray?: string; targetMarker?: unknown } } }
      const source = String(edge.getSourceCellId())
      const target = String(edge.getTargetCellId())
      const attrs = (edge.getAttrs() ?? json.attrs ?? {}) as {
        line?: { strokeDasharray?: string; targetMarker?: unknown }
      }
      const fields = edgeAttrsToSpec(attrs, routerNameOf(edge.getRouter()))
      return {
        source,
        target,
        label: edgeLabelText(json),
        ...fields,
      }
    }),
  }
}

/** 检查器改边：同步画布 attrs，避免 epoch 重挂。 */
export function applyEdgeVisual(
  edge: Edge,
  next: Pick<DiagramEdgeSpec, 'dashed' | 'arrow' | 'router' | 'label'>,
) {
  const attrs = edgeAttrs(next)
  edge.attr('line/strokeDasharray', attrs.line.strokeDasharray ?? '')
  edge.attr('line/targetMarker', attrs.line.targetMarker)
  if (next.router === 'normal') edge.setRouter({ name: 'normal' })
  else edge.setRouter({ name: 'orth', args: { padding: 12 } })
  if (next.label !== undefined) {
    if (next.label) edge.setLabels([next.label])
    else edge.setLabels([])
  }
}

/** 从现场 SVG 下载快照（不用 Export 插件）。CSS 变量打成实色。 */
export function downloadRenderedSvg(host: HTMLElement, filename = 'diagram.svg'): boolean {
  const svg = host.querySelector('svg')
  if (!svg) return false
  const clone = svg.cloneNode(true) as SVGSVGElement
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const cs = getComputedStyle(host.closest('.ed-diagram-focus') ?? host)
  const replacements: [string, string][] = [
    ['var(--accent)', cs.getPropertyValue('--accent').trim() || '#61b0f1'],
    ['var(--card)', cs.getPropertyValue('--card').trim() || '#ffffff'],
    ['var(--fg)', cs.getPropertyValue('--fg').trim() || '#111111'],
  ]
  let xml = new XMLSerializer().serializeToString(clone)
  for (const [from, to] of replacements) xml = xml.split(from).join(to)
  if (xml.includes('var(--')) return false
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return true
}

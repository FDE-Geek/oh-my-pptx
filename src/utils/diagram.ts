import { Graph } from '@antv/x6'
import dagre from 'dagre'
import type { DiagramEdgeSpec, DiagramNodeSpec, DiagramSpec } from '../types'
import { contrastOn } from '../theme/color-ramp'

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
  for (const edge of spec.edges) {
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
  const spec = readonly ? resolveSpec(rawSpec) : rawSpec

  const graph: Graph = new Graph({
    container,
    interacting: readonly ? false : true,
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
        return graph.createEdge({ attrs: edgeAttrs({ arrow: true }) })
      },
    },
  })

  addSpecNodes(graph, spec)
  addSpecEdges(graph, spec)

  return graph
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

function edgeLabelText(edge: { labels?: unknown }): string | undefined {
  const labels = edge.labels
  if (!Array.isArray(labels) || labels.length === 0) return undefined
  const first = labels[0] as { attrs?: { label?: { text?: unknown } } } | { text?: unknown }
  const text =
    'attrs' in first ? first.attrs?.label?.text : (first as { text?: unknown }).text
  return typeof text === 'string' ? text : undefined
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
      const json = edge.toJSON() as { labels?: unknown }
      return {
        source: String(edge.getSourceCellId()),
        target: String(edge.getTargetCellId()),
        label: edgeLabelText(json),
      }
    }),
  }
}

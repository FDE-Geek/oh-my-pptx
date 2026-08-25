import type { DiagramEdgeSpec, DiagramNodeSpec, DiagramSpec } from '../types'

export type FlowError = { line: number; message: string; snippet?: string }

export type CompileFlowResult =
  | { ok: true; spec: DiagramSpec }
  | { ok: false; errors: FlowError[] }

type ShapeName = NonNullable<DiagramNodeSpec['shape']>
const SHAPES = new Set<string>(['rect', 'ellipse', 'diamond', 'double-rect'])

type NodeDraft = {
  id: string
  label?: string
  shape?: DiagramNodeSpec['shape']
  fill?: string
}

type EdgeDraft = Pick<DiagramEdgeSpec, 'source' | 'target' | 'label' | 'dashed' | 'arrow'>

type LooseSlide = {
  type?: string
  diagram?: {
    flow?: unknown
    nodes?: unknown
    edges?: unknown
    [key: string]: unknown
  }
  [key: string]: unknown
}

function err(line: number, message: string, snippet?: string): FlowError {
  return snippet ? { line, message, snippet } : { line, message }
}

function stripLineComment(line: string): string {
  let depth = 0
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '[') depth++
    else if (ch === ']' && depth > 0) depth--
    else if (ch === '#' && depth === 0) return line.slice(0, i).trimEnd()
  }
  return line
}

function skipWs(src: string, i: number): number {
  while (i < src.length && (src[i] === ' ' || src[i] === '\t')) i++
  return i
}

function parseShapeName(raw: string, line: number): ShapeName | FlowError {
  if (!SHAPES.has(raw)) return err(line, `未知形状「${raw}」`, raw)
  return raw as ShapeName
}

function parseNodeAtom(
  src: string,
  from: number,
  line: number,
): { node: NodeDraft; next: number } | FlowError {
  const idMatch = src.slice(from).match(/^([A-Za-z_][A-Za-z0-9_-]*)/)
  if (!idMatch) return err(line, '此处需要节点 id（ASCII：字母/数字/_/-）', src.slice(from, from + 16))
  const id = idMatch[1]
  let i = from + id.length
  let label: string | undefined
  let shape: ShapeName | undefined

  const take = (re: RegExp): RegExpMatchArray | null => {
    const m = src.slice(i).match(re)
    if (!m) return null
    i += m[0].length
    return m
  }

  const dbl = take(/^\[\[([a-z0-9-]+)\]\]/)
  if (dbl) {
    const parsed = parseShapeName(dbl[1], line)
    if (typeof parsed !== 'string') return parsed
    shape = parsed
  } else {
    const lab = take(/^\[([^\]]*)\]/)
    if (lab) label = lab[1]
    const brace = take(/^\{([a-z0-9-]+)\}/)
    const paren = brace ? null : take(/^\(([a-z0-9-]+)\)/)
    const after = brace ? null : take(/^\[\[([a-z0-9-]+)\]\]/)
    const shapeRaw = brace?.[1] ?? paren?.[1] ?? after?.[1]
    if (shapeRaw) {
      const parsed = parseShapeName(shapeRaw, line)
      if (typeof parsed !== 'string') return parsed
      shape = parsed
    }
  }

  return { node: { id, label, shape }, next: i }
}

function parseEdgeOp(
  src: string,
  from: number,
  line: number,
): { dashed?: boolean; arrow?: boolean; label?: string; next: number } | FlowError {
  const slice = src.slice(from)
  if (slice.startsWith('-.->')) return { dashed: true, next: from + 4 }
  const pipe = slice.match(/^->\|([^|]+)\|/)
  if (pipe) return { label: pipe[1], next: from + pipe[0].length }
  if (slice.startsWith('->')) return { next: from + 2 }
  if (slice.startsWith('--')) return { arrow: false, next: from + 2 }
  return err(line, '无法识别的边（用 -> / -.-> / -- / ->|标签|）', slice.slice(0, 16))
}

function applyNode(store: Map<string, NodeDraft>, incoming: NodeDraft) {
  const prev = store.get(incoming.id)
  if (!prev) {
    store.set(incoming.id, { ...incoming })
    return
  }
  if (prev.label === undefined && incoming.label !== undefined) prev.label = incoming.label
  if (prev.shape === undefined && incoming.shape !== undefined) prev.shape = incoming.shape
}

function parseChain(
  code: string,
  line: number,
): { nodes: NodeDraft[]; edges: EdgeDraft[] } | { errors: FlowError[] } {
  const nodes: NodeDraft[] = []
  const edges: EdgeDraft[] = []
  let i = 0

  const first = parseNodeAtom(code, i, line)
  if ('message' in first) return { errors: [first] }
  nodes.push(first.node)
  i = skipWs(code, first.next)
  let prev = first.node

  if (i === code.length) return { nodes, edges }

  while (i < code.length) {
    if (/^\s*:/.test(code.slice(i))) {
      const m = code.slice(i).match(/^\s*:\s*(.+)$/)
      if (!m || !m[1].trim()) return { errors: [err(line, '「:」后面需要边标签', code.slice(i))] }
      if (edges.length === 0) return { errors: [err(line, '边标签「: 文案」只能跟在边后面', code)] }
      const last = edges[edges.length - 1]
      if (last.label === undefined) last.label = m[1].trim()
      break
    }

    const op = parseEdgeOp(code, i, line)
    if ('message' in op) return { errors: [op] }
    i = skipWs(code, op.next)
    const next = parseNodeAtom(code, i, line)
    if ('message' in next) return { errors: [next] }
    nodes.push(next.node)
    edges.push({
      source: prev.id,
      target: next.node.id,
      dashed: op.dashed,
      arrow: op.arrow,
      label: op.label,
    })
    prev = next.node
    i = skipWs(code, next.next)
  }

  return { nodes, edges }
}

export function compileDiagramFlow(src: string): CompileFlowResult {
  const errors: FlowError[] = []
  const nodeStore = new Map<string, NodeDraft>()
  const edgeList: EdgeDraft[] = []
  let layoutDir: 'TB' | 'LR' | undefined

  if (src.trim() === '') return { ok: false, errors: [err(1, '简写为空')] }

  const lines = src.replace(/\r\n/g, '\n').split('\n')
  for (let n = 0; n < lines.length; n++) {
    const lineNo = n + 1
    const raw = lines[n]
    const trimmed = raw.trim()
    if (trimmed === '') continue

    if (trimmed.startsWith('@dir')) {
      const code = stripLineComment(trimmed)
      const m = code.match(/^@dir\s+(TB|LR)\s*$/i)
      if (!m) {
        errors.push(err(lineNo, '@dir 只能是 TB 或 LR', code))
        continue
      }
      layoutDir = m[1].toUpperCase() as 'TB' | 'LR'
      continue
    }

    if (trimmed.startsWith('@fill')) {
      const m = trimmed.match(/^@fill\s+([A-Za-z_][A-Za-z0-9_-]*)\s+(#[0-9A-Fa-f]{3,8})\s*(?:#.*)?$/)
      if (!m) {
        errors.push(err(lineNo, '@fill 格式为「@fill id #hex」', trimmed))
        continue
      }
      applyNode(nodeStore, { id: m[1] })
      nodeStore.get(m[1])!.fill = m[2]
      continue
    }

    const code = stripLineComment(raw).trim()
    if (code === '') continue

    const parsed = parseChain(code, lineNo)
    if ('errors' in parsed) {
      errors.push(...parsed.errors)
      continue
    }
    for (const node of parsed.nodes) applyNode(nodeStore, node)
    edgeList.push(...parsed.edges)
  }

  if (errors.length > 0) return { ok: false, errors }
  if (nodeStore.size === 0) return { ok: false, errors: [err(1, '简写没有产生任何节点')] }

  return {
    ok: true,
    spec: {
      layout: 'dagre',
      layoutDir,
      nodes: [...nodeStore.values()].map(n => ({
        id: n.id,
        x: 0,
        y: 0,
        label: n.label ?? n.id,
        shape: n.shape,
        fill: n.fill,
      })),
      edges: edgeList.map(e => ({
        source: e.source,
        target: e.target,
        label: e.label,
        dashed: e.dashed,
        arrow: e.arrow,
      })),
    },
  }
}

export function expandDiagramSlide(slide: LooseSlide):
  | { ok: true; slide: LooseSlide }
  | { ok: false; errors: FlowError[] } {
  if (slide.type !== 'diagram' || !slide.diagram || typeof slide.diagram !== 'object') {
    return { ok: true, slide }
  }
  const flow = slide.diagram.flow
  if (flow === undefined || flow === null) return { ok: true, slide }
  if (typeof flow !== 'string') {
    return { ok: false, errors: [err(1, 'diagram.flow 必须是字符串')] }
  }
  if (flow.trim() === '') return { ok: true, slide }

  const hasNodes = Array.isArray(slide.diagram.nodes) && slide.diagram.nodes.length > 0
  const hasEdges = Array.isArray(slide.diagram.edges) && slide.diagram.edges.length > 0
  if (hasNodes || hasEdges) {
    return { ok: false, errors: [err(1, '不能同时写 flow 与 nodes/edges')] }
  }

  const compiled = compileDiagramFlow(flow)
  if (!compiled.ok) return compiled
  const rest = { ...slide.diagram }
  delete rest.flow
  return {
    ok: true,
    slide: {
      ...slide,
      diagram: { ...rest, ...compiled.spec },
    },
  }
}

export function expandDeckDiagrams(deck: { slides?: LooseSlide[] }):
  | { ok: true }
  | { ok: false; page: number; errors: FlowError[] } {
  const slides = deck.slides
  if (!Array.isArray(slides)) return { ok: true }
  for (let i = 0; i < slides.length; i++) {
    const result = expandDiagramSlide(slides[i] ?? {})
    if (!result.ok) return { ok: false, page: i + 1, errors: result.errors }
    slides[i] = result.slide
  }
  return { ok: true }
}

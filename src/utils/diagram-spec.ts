import type { DiagramEdgeSpec } from '../types'

/** X6 edge.toJSON().labels 的两种常见形态。 */
export function edgeLabelText(edge: { labels?: unknown }): string | undefined {
  const labels = edge.labels
  if (!Array.isArray(labels) || labels.length === 0) return undefined
  const first = labels[0] as { attrs?: { label?: { text?: unknown } } } | { text?: unknown }
  const text =
    'attrs' in first ? first.attrs?.label?.text : (first as { text?: unknown }).text
  return typeof text === 'string' ? text : undefined
}

export function routerNameOf(router: unknown): string | undefined {
  if (typeof router === 'string') return router
  if (router && typeof router === 'object' && 'name' in router) {
    const name = (router as { name?: unknown }).name
    return typeof name === 'string' ? name : undefined
  }
  return undefined
}

export type EdgeAttrsInput = {
  line?: {
    strokeDasharray?: string | number | null
    targetMarker?: unknown
  }
}

function hasDash(value: unknown): boolean {
  if (value == null || value === '' || value === 0 || value === 'none') return false
  return true
}

function hasMarker(value: unknown): boolean {
  if (value == null || value === false || value === '' || value === 'none') return false
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const rec = value as Record<string, unknown>
    if (Object.keys(rec).length === 0) return false
    if (rec.name === null || rec.name === '' || rec.name === 'none') return false
  }
  return true
}

/**
 * X6 edge attrs + router 名 → DiagramEdgeSpec 的可变字段。
 * 缺省：实线、有箭头、orth（与 mountGraph 写出的边对齐；缺省值省略不写）。
 */
export function edgeAttrsToSpec(
  attrs: EdgeAttrsInput,
  router?: string,
): Pick<DiagramEdgeSpec, 'dashed' | 'arrow' | 'router'> {
  return {
    dashed: hasDash(attrs.line?.strokeDasharray) ? true : undefined,
    arrow: hasMarker(attrs.line?.targetMarker) ? undefined : false,
    router: router === 'normal' ? 'normal' : undefined,
  }
}

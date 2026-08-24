import { useEffect, useRef, useState } from 'react'
import { LayoutGrid, Plus, Trash2, Wand2 } from 'lucide-react'
import type { DiagramSpec } from '../../types'
import { mountGraph, graphToSpec, applyDagreLayout } from '../../utils/diagram'

/**
 * 编辑态 X6 画布：拖节点、连线、删除、选中编辑属性，
 * 每次交互后同步回 spec（进 useEditorDoc 撤销栈与草稿）。
 */
export function DiagramCanvas({
  spec,
  onChange,
}: {
  spec: DiagramSpec
  onChange: (next: DiagramSpec) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const specRef = useRef(spec)
  specRef.current = spec
  // spec 外部替换（自动布局/撤销/导入）时经 key 重挂画布；
  // 画布自身交互的 onChange 产生的 spec 走「先 unmount 保护」不适用——
  // 但回流 spec 与当前画布一致，重挂等价无害（仅多一次渲染）。
  const remountKey = JSON.stringify(spec)

  useEffect(() => {
    if (!containerRef.current) return
    const graph = mountGraph(containerRef.current, specRef.current, false)

    const sync = () => onChange(graphToSpec(graph, specRef.current))

    graph.on('node:click', ({ node }) => setSelectedId(String(node.id)))
    graph.on('edge:click', ({ edge }) => setSelectedId(`${String(edge.getSourceCellId())}->${String(edge.getTargetCellId())}`))
    graph.on('blank:click', () => setSelectedId(null))
    graph.on('node:moved', sync)
    graph.on('node:added', sync)
    graph.on('node:removed', sync)
    graph.on('edge:added', sync)
    graph.on('edge:removed', sync)
    graph.on('edge:connected', sync)

    return () => {
      graph.dispose()
    }
    // 画布只初始化一次；后续数据经画布自身交互产生并回流
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addNode = () => {
    const id = `n${Date.now().toString(36)}`
    onChange({
      ...spec,
      nodes: [
        ...spec.nodes,
        {
          id,
          x: 120 + ((spec.nodes.length * 60) % 360),
          y: 80 + ((spec.nodes.length * 40) % 240),
          label: '新节点',
        },
      ],
    })
    setSelectedId(id)
  }

  const autoLayout = (dir: 'TB' | 'LR') => {
    onChange({ ...applyDagreLayout(spec, dir), layout: 'dagre', layoutDir: dir })
    setSelectedId(null)
  }

  const removeSelected = () => {
    if (!selectedId) return
    onChange({
      nodes: spec.nodes.filter(n => n.id !== selectedId),
      edges: spec.edges.filter(e => e.source !== selectedId && e.target !== selectedId),
    })
    setSelectedId(null)
  }

  const selectedNode = spec.nodes.find(n => n.id === selectedId)

  return (
    <div className="flex h-full min-h-[420px] flex-col gap-phi-sm">
      <div className="flex items-center gap-phi-sm">
        <button
          onClick={addNode}
          className="flex items-center gap-phi-xs rounded-md bg-accent/15 px-phi-sm py-phi-xs text-xs text-accent hover:bg-accent/25"
        >
          <Plus size={13} /> 添加节点
        </button>
        <button
          onClick={removeSelected}
          disabled={!selectedId}
          className="flex items-center gap-phi-xs rounded-md px-phi-sm py-phi-xs text-xs text-sfg hover:text-danger disabled:opacity-30"
        >
          <Trash2 size={13} /> 删除选中
        </button>
        <span className="mx-phi-xs h-4 w-px bg-outline" />
        <button
          onClick={() => autoLayout('TB')}
          title="DAG 分层自动布局（上下）"
          className="flex items-center gap-phi-xs rounded-md bg-accent/15 px-phi-sm py-phi-xs text-xs text-accent hover:bg-accent/25"
        >
          <Wand2 size={13} /> 自动布局 ↕
        </button>
        <button
          onClick={() => autoLayout('LR')}
          title="DAG 分层自动布局（左右）"
          className="flex items-center gap-phi-xs rounded-md bg-accent/15 px-phi-sm py-phi-xs text-xs text-accent hover:bg-accent/25"
        >
          <LayoutGrid size={13} /> 自动布局 ↔
        </button>
        <span className="text-xs text-sfg">
          画布：拖动节点 · 从节点边缘拖出连线 · 点选后编辑属性
        </span>
      </div>

      <div className="flex min-h-0 flex-1 gap-phi-sm">
        <div className="min-h-[380px] flex-1 overflow-hidden rounded-lg border border-outline bg-bg">
          <div key={remountKey} ref={containerRef} className="h-full w-full" />
        </div>

        {selectedNode && (
          <div className="thin-scroll w-52 shrink-0 overflow-y-auto rounded-lg border border-outline bg-card p-phi-sm">
            <p className="mb-phi-sm text-xs font-semibold text-accent">节点属性</p>
            <label className="mb-phi-sm flex flex-col gap-phi-xs text-xs text-sfg">
              文字
              <input
                type="text"
                value={selectedNode.label}
                onChange={e =>
                  onChange({
                    ...spec,
                    nodes: spec.nodes.map(n =>
                      n.id === selectedNode.id ? { ...n, label: e.target.value } : n,
                    ),
                  })
                }
                className="rounded-md border border-outline bg-bg px-phi-xs py-phi-xs text-sm text-fg outline-none focus:border-accent"
              />
            </label>
            <label className="mb-phi-sm flex flex-col gap-phi-xs text-xs text-sfg">
              填充色（留空用主题色）
              <input
                type="text"
                value={selectedNode.fill ?? ''}
                placeholder="#61b0f1"
                onChange={e =>
                  onChange({
                    ...spec,
                    nodes: spec.nodes.map(n =>
                      n.id === selectedNode.id
                        ? { ...n, fill: e.target.value || undefined }
                        : n,
                    ),
                  })
                }
                className="rounded-md border border-outline bg-bg px-phi-xs py-phi-xs text-sm text-fg outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-phi-xs text-xs text-sfg">
              形状
              <select
                value={selectedNode.shape ?? 'rect'}
                onChange={e =>
                  onChange({
                    ...spec,
                    nodes: spec.nodes.map(n =>
                      n.id === selectedNode.id
                        ? {
                            ...n,
                            shape: e.target.value as DiagramSpec['nodes'][number]['shape'],
                          }
                        : n,
                    ),
                  })
                }
                className="rounded-md border border-outline bg-bg px-phi-xs py-phi-xs text-sm text-fg outline-none focus:border-accent"
              >
                <option value="rect">矩形</option>
                <option value="ellipse">椭圆</option>
                <option value="diamond">菱形（判断）</option>
                <option value="double-rect">双框（过程）</option>
              </select>
            </label>
          </div>
        )}
      </div>
    </div>
  )
}

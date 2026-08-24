import { useEffect, useRef } from 'react'
import type { DiagramSpec } from '../../types'
import { mountGraph } from '../../utils/diagram'
import { useDeck } from '../DeckContext'
import { useThemeAccent } from '../../hooks/useThemeAccent'

/** 放映态：只读 X6 图，内容居中；accent 种子变化时重挂载跟随主题。 */
export function DiagramView({ spec }: { spec: DiagramSpec }) {
  const containerRef = useRef<HTMLDivElement>(null)
  useDeck() // 确保在 DeckContext 内渲染（与其它页型一致）
  const accent = useThemeAccent()

  useEffect(() => {
    if (!containerRef.current) return
    const graph = mountGraph(containerRef.current, spec, true)
    graph.centerContent()
    return () => graph.dispose()
    // spec 或 accent 变化都重建（X6 attr 是快照，不跟随 CSS 变量）
  }, [spec, accent])

  return <div ref={containerRef} className="h-full w-full" />
}

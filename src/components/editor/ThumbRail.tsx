import { useState } from 'react'
import { Copy, GripVertical, Plus, Trash2 } from 'lucide-react'
import type { Slide } from '../../types'
import { SlideRenderer } from '../SlideRenderer'

export function ThumbRail({
  width,
  slides,
  selected,
  onSelect,
  onAdd,
  onDuplicate,
  onRemove,
  onMove,
}: {
  width: number
  slides: Slide[]
  selected: number
  onSelect: (index: number) => void
  onAdd: () => void
  onDuplicate: (index: number) => void
  onRemove: (index: number) => void
  onMove: (from: number, to: number) => void
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  // 缩略图随栏宽缩放：扣除栏内边距/卡片边框/把手/间距后按 16:9 自适应
  const thumbScale = Math.max(0.05, (width - 52) / 960)

  return (
    <aside
      className="flex h-full shrink-0 flex-col border-r border-outline bg-card"
      style={{ width }}
    >
      <div className="flex items-center justify-between px-phi-md py-phi-sm">
        <span className="text-xs font-semibold tracking-widest text-sfg uppercase">
          页面 {slides.length}
        </span>
        <button
          onClick={onAdd}
          title="新增页面"
          className="rounded-md bg-accent/15 px-phi-sm py-phi-xs text-xs text-accent hover:bg-accent/25"
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="thin-scroll flex flex-1 flex-col gap-phi-sm overflow-y-auto px-phi-sm pb-phi-sm">
        {slides.map((slide, index) => (
          <div
            key={index}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragEnd={() => {
              setDragIndex(null)
              setDropIndex(null)
            }}
            onDragOver={e => {
              e.preventDefault()
              setDropIndex(index)
            }}
            onDrop={() => {
              if (dragIndex !== null) onMove(dragIndex, index)
              setDragIndex(null)
              setDropIndex(null)
            }}
            className={`group relative flex cursor-pointer items-center gap-phi-xs rounded-lg border p-phi-xs transition-colors ${
              index === selected
                ? 'border-accent bg-bg'
                : dropIndex === index && dragIndex !== null
                  ? 'border-accent-dim bg-accent/10'
                  : 'border-transparent hover:border-outline'
            }`}
            onClick={() => onSelect(index)}
          >
            <GripVertical
              size={12}
              className="shrink-0 text-sfg opacity-0 transition-opacity group-hover:opacity-100"
            />
            <div className="flex aspect-video w-full flex-1 items-center justify-center overflow-hidden rounded-md bg-bg">
              <div
                className="pointer-events-none origin-center"
                style={{ transform: `scale(${thumbScale})` }}
              >
                <div className="flex h-[540px] w-[960px] items-center px-phi-3xl">
                  <SlideRenderer slide={slide} transition="none" />
                </div>
              </div>
            </div>
            <span className="absolute top-0.5 left-4 text-[10px] text-sfg tabular-nums">
              {index + 1}
            </span>
            <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={e => {
                  e.stopPropagation()
                  onDuplicate(index)
                }}
                title="复制此页"
                className="rounded bg-bg/80 p-0.5 text-sfg hover:text-accent"
              >
                <Copy size={11} />
              </button>
              <button
                onClick={e => {
                  e.stopPropagation()
                  onRemove(index)
                }}
                title="删除此页"
                disabled={slides.length <= 1}
                className="rounded bg-bg/80 p-0.5 text-sfg hover:text-danger disabled:opacity-30"
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

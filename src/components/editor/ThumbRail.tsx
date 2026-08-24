import { useState } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import type { Slide } from '../../types'
import { SlideRenderer } from '../SlideRenderer'

export function ThumbRail({
  width,
  slides,
  selected,
  collapsed,
  onSelect,
  onAdd,
  onInsertAfter,
  onDuplicate,
  onRemove,
  onMove,
}: {
  width: number
  slides: Slide[]
  selected: number
  collapsed?: boolean
  onSelect: (index: number) => void
  onAdd: () => void
  onInsertAfter: (index: number) => void
  onDuplicate: (index: number) => void
  onRemove: (index: number) => void
  onMove: (from: number, to: number) => void
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const thumbScale = Math.max(0.05, (width - 32) / 960)

  return (
    <aside className={`ed-sidebar thin-scroll${collapsed ? ' ed-collapsed' : ''}`} style={{ width: collapsed ? 0 : width }}>
      {slides.map((slide, index) => (
        <div key={index} className="flex w-full flex-col items-center">
          <div
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
            className={`ed-thumb${index === selected ? ' active' : ''}${dropIndex === index && dragIndex !== null ? ' drop' : ''}`}
            onClick={() => onSelect(index)}
          >
            <span className="ed-thumb-num">{index + 1}</span>
            <div className="ed-thumb-tools">
              <button
                type="button"
                title="复制此页"
                onClick={e => {
                  e.stopPropagation()
                  onDuplicate(index)
                }}
              >
                <Copy size={11} />
              </button>
              <button
                type="button"
                title="删除此页"
                className="danger"
                disabled={slides.length <= 1}
                onClick={e => {
                  e.stopPropagation()
                  onRemove(index)
                }}
              >
                <Trash2 size={11} />
              </button>
            </div>
            <div className="flex aspect-video w-full items-center justify-center overflow-hidden bg-bg">
              <div className="pointer-events-none origin-center" style={{ transform: `scale(${thumbScale})` }}>
                <div className="flex h-[540px] w-[960px] items-center px-phi-3xl">
                  <SlideRenderer slide={slide} transition="none" />
                </div>
              </div>
            </div>
          </div>
          <div
            className="ed-insertgap"
            title="在此插入一页"
            onClick={e => {
              e.stopPropagation()
              onInsertAfter(index)
            }}
          >
            <button type="button" className="ed-insertgap-btn" aria-label="插入">+</button>
          </div>
        </div>
      ))}
      <button type="button" className="ed-add-slide" onClick={onAdd}>
        + 新页面
      </button>
    </aside>
  )
}

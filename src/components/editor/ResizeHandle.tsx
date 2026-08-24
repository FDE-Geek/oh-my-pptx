import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 面板拖拽调宽：拖动时返回 true（阻止外部 drag 逻辑），
 * 松手后宽度存 sessionStorage（会话级记忆，刷新回默认）。
 */
export function useResizablePanel(
  storageKey: string,
  initial: number,
  min: number,
  max: number,
  reverse = false,
) {
  const [width, setWidth] = useState(() => {
    try {
      const saved = Number(sessionStorage.getItem(storageKey))
      return Number.isFinite(saved) && saved >= min && saved <= max ? saved : initial
    } catch {
      return initial
    }
  })
  const [dragging, setDragging] = useState(false)
  const startRef = useRef({ pointer: 0, width: 0 })

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      startRef.current = { pointer: e.clientX, width }
      setDragging(true)
    },
    [width],
  )

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: PointerEvent) => {
      const delta = e.clientX - startRef.current.pointer
      const next = Math.max(min, Math.min(max, startRef.current.width + (reverse ? -delta : delta)))
      setWidth(next)
    }
    const onUp = () => {
      setDragging(false)
      try {
        sessionStorage.setItem(storageKey, String(Math.round(width)))
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [dragging, min, max, reverse, storageKey, width])

  return { width, dragging, onPointerDown }
}

/** 分隔条手柄。 */
export function ResizeHandle({
  dragging,
  onPointerDown,
}: {
  dragging: boolean
  onPointerDown: (e: React.PointerEvent) => void
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      role="separator"
      aria-orientation="vertical"
      className={`relative z-10 -mx-0.5 w-1.5 shrink-0 cursor-col-resize transition-colors ${
        dragging ? 'bg-accent' : 'bg-transparent hover:bg-accent/50'
      }`}
      title="拖拽调节宽度"
    >
      <span className="pointer-events-none absolute top-1/2 left-1/2 h-8 w-px -translate-x-1/2 -translate-y-1/2 rounded-full bg-outline" />
    </div>
  )
}

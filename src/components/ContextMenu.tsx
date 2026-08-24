import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

export interface MenuItem {
  label: string
  icon: ReactNode
  onClick?: () => void
  danger?: boolean
  separatorBefore?: boolean
  /** 嵌入面板区块（如主题设置）：点击面板内部不关闭菜单。 */
  panel?: ReactNode
  separatorAfter?: boolean
}

export function ContextMenu({ items }: { items: MenuItem[] }) {
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      setPos(null)
      setAnchor({ x: e.clientX, y: e.clientY })
    }
    const close = () => {
      setAnchor(null)
      setPos(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('click', close)
    document.addEventListener('keydown', onKey)
    window.addEventListener('blur', close)
    return () => {
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('click', close)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', close)
    }
  }, [])

  useLayoutEffect(() => {
    if (!anchor || !menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    let { x, y } = anchor
    if (x + rect.width > window.innerWidth - 8) {
      x = Math.max(8, window.innerWidth - rect.width - 8)
    }
    if (y + rect.height > window.innerHeight - 8) {
      y = Math.max(8, window.innerHeight - rect.height - 8)
    }
    setPos({ x, y })
  }, [anchor])

  if (!anchor) return null

  return (
    <div
      ref={menuRef}
      className={`no-print fixed z-50 w-60 overflow-hidden rounded-xl border border-[var(--chrome-outline)] bg-[var(--chrome-card)] py-phi-sm shadow-2xl ${
        pos ? '' : 'invisible'
      }`}
      style={
        pos
          ? { left: pos.x, top: pos.y }
          : { left: anchor.x, top: anchor.y }
      }
    >
      {items.map((item, i) => (
        <Fragment key={i}>
          {item.separatorBefore && <div className="my-phi-sm h-px bg-outline" />}
          {item.panel ? (
            <div onClick={e => e.stopPropagation()}>{item.panel}</div>
          ) : (
            <button
              onClick={item.onClick}
              className={`flex w-full items-center gap-phi-sm px-phi-md py-phi-sm text-left text-sm transition-colors hover:bg-accent/10 hover:text-accent ${
                item.danger ? 'text-danger' : 'text-fg'
              }`}
            >
              <span className="flex w-4 justify-center">{item.icon}</span>
              {item.label}
            </button>
          )}
          {item.separatorAfter && <div className="my-phi-sm h-px bg-outline" />}
        </Fragment>
      ))}
    </div>
  )
}

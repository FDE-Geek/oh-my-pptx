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
  const openRef = useRef(false)
  openRef.current = Boolean(anchor)

  useEffect(() => {
    const typing = (el: EventTarget | null) =>
      el instanceof HTMLElement &&
      (el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' ||
        el.isContentEditable)

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
      if (e.key === 'Escape' && openRef.current) {
        e.preventDefault()
        e.stopPropagation()
        close()
        return
      }
      if (typing(e.target) || typing(document.activeElement)) return
      if (e.key === 'm' || e.key === 'M' || e.key === '?') {
        e.preventDefault()
        setPos(null)
        setAnchor(cur =>
          cur ? null : { x: window.innerWidth - 72, y: window.innerHeight - 72 },
        )
      }
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

  useEffect(() => {
    if (!pos || !menuRef.current) return
    menuRef.current.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
  }, [pos])

  if (!anchor) return null

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="放映菜单"
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
              type="button"
              role="menuitem"
              onClick={item.onClick}
              className={`flex w-full items-center gap-phi-sm px-phi-md py-phi-sm text-left text-sm transition-colors hover:bg-accent-dim/20 hover:text-[var(--chrome-accent)] focus-visible:bg-accent-dim/20 focus-visible:outline-none ${
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

import { useEffect, useState } from 'react'

/**
 * 订阅 --accent 的运行时变化（MutationObserver 监听 <html> 的 style/class 变更）。
 * X6 等命令式库把 CSS 变量解析为快照，需要知道 accent 何时变了以便重建。
 */
export function useThemeAccent(): string {
  const [accent, setAccent] = useState(() => readAccent())

  useEffect(() => {
    const observer = new MutationObserver(() => setAccent(readAccent()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    })
    return () => observer.disconnect()
  }, [])

  return accent
}

function readAccent(): string {
  return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
}

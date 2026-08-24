import type { ReactNode } from 'react'

type HeadingLevel = 1 | 2 | 3 | 4

const TAG: Record<HeadingLevel, 'h1' | 'h2' | 'h3'> = {
  1: 'h1',
  2: 'h2',
  3: 'h2',
  4: 'h3',
}

const LEVEL: Record<HeadingLevel, string> = {
  1: 'text-heading-1 font-bold tracking-tight',
  2: 'text-heading-2 font-bold tracking-tight',
  3: 'text-heading-3 font-bold tracking-tight',
  4: 'text-heading-4 font-semibold tracking-tight',
}

/**
 * 舞台标题：level 1 封面/收束 · 2 章节 · 3 页标题 · 4 列标题。
 * 字号来自 index.css 的 φ 阶梯（text-heading-*）。
 */
export function Heading({
  level,
  children,
  className = '',
}: {
  level: HeadingLevel
  children: ReactNode
  className?: string
}) {
  const Tag = TAG[level]
  return <Tag className={`${LEVEL[level]} ${className}`.trim()}>{children}</Tag>
}

/** 副题：跟在 heading 1/2 下面，sfg + lead 字号。 */
export function Lead({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-lead text-sfg ${className}`.trim()}>{children}</p>
}

/** 与标题配套的页眉标签：章节 / 目录，或自定义（如 §1.1）。 */
export const KICKER = {
  section: '章节',
  toc: '目录',
} as const

export type KickerKind = keyof typeof KICKER

const KICKER_CLASS =
  'font-mono text-kicker font-semibold tracking-kicker text-accent uppercase'

export function Kicker({
  kind,
  children,
  className = '',
}: {
  kind?: KickerKind
  children?: ReactNode
  className?: string
}) {
  const text = children ?? (kind ? KICKER[kind] : null)
  if (!text) return null
  return <p className={`${KICKER_CLASS} ${className}`.trim()}>{text}</p>
}

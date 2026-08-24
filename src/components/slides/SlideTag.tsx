/** 页眉面包屑（可选 tag 字段）：等宽小字 + accent 色，标题上方。 */
export function SlideTag({ tag }: { tag?: string }) {
  if (!tag) return null
  return (
    <p className="mb-phi-sm font-mono text-xs font-semibold tracking-[0.22em] text-accent uppercase">
      {tag}
    </p>
  )
}

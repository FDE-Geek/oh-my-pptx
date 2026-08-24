import type { PPTConfig, Slide } from '../types'

export interface DiffEntry {
  kind: 'added' | 'removed' | 'changed' | 'moved'
  /** 页码（base 侧；added 用 other 侧）。 */
  page: number
  summary: string
}

/**
 * 两份 deck 的结构化 diff：页级增删改移 + 页内字段变更摘要。
 * 纯函数，供 window.ohMyPpt.diffDocs 与编辑器对比视图共用。
 */
export function diffDecks(base: PPTConfig, other: PPTConfig): DiffEntry[] {
  const entries: DiffEntry[] = []

  // 元信息
  const metaKeys = ['title', 'author', 'accent', 'themePreset', 'transition'] as const
  for (const key of metaKeys) {
    if (base[key] !== other[key]) {
      entries.push({
        kind: 'changed',
        page: 0,
        summary: `${key}：${JSON.stringify(base[key])} → ${JSON.stringify(other[key])}`,
      })
    }
  }

  // 页面：按"内容指纹"匹配（同 type+title 视为同页）
  const fingerprint = (slide: Slide) => JSON.stringify(slide)
  const slideName = (slide: Slide) => ('title' in slide && slide.title) || ('quote' in slide ? slide.quote : slide.type)
  const titleKey = (slide: Slide) =>
    `${slide.type}::${'title' in slide ? slide.title : 'quote' in slide ? slide.quote : ''}`

  const otherUsed = new Set<number>()
  const baseMatch: (number | null)[] = base.slides.map(baseSlide => {
    const idx = other.slides.findIndex(
      (o, i) => !otherUsed.has(i) && titleKey(o) === titleKey(baseSlide),
    )
    if (idx >= 0) {
      otherUsed.add(idx)
      return idx
    }
    return null
  })

  base.slides.forEach((baseSlide, i) => {
    const matched = baseMatch[i]
    if (matched === null) {
      entries.push({ kind: 'removed', page: i + 1, summary: `删除「${slideName(baseSlide)}」（${baseSlide.type}）` })
      return
    }
    const otherSlide = other.slides[matched]
    if (fingerprint(baseSlide) !== fingerprint(otherSlide)) {
      entries.push({
        kind: 'changed',
        page: i + 1,
        summary: `修改「${slideName(baseSlide)}」`,
      })
    }
  })

  other.slides.forEach((otherSlide, i) => {
    if (!otherUsed.has(i)) {
      entries.push({ kind: 'added', page: i + 1, summary: `新增「${slideName(otherSlide)}」（${otherSlide.type}）` })
    }
  })

  // 位移：匹配对的原顺序是否反转
  const matchedPairs = baseMatch
    .map((m, i) => (m === null ? null : { base: i, other: m }))
    .filter((x): x is { base: number; other: number } => x !== null)
  for (let a = 0; a < matchedPairs.length; a++) {
    for (let b = a + 1; b < matchedPairs.length; b++) {
      const first = matchedPairs[a]
      const second = matchedPairs[b]
      if (first.other > second.other) {
        entries.push({
          kind: 'moved',
          page: second.base + 1,
          summary: `「${slideName(base.slides[second.base])}」移到「${slideName(base.slides[first.base])}」之前`,
        })
        break
      }
    }
  }

  return entries
}

export function formatDiff(entries: DiffEntry[]): string {
  if (entries.length === 0) return '两份文档内容一致'
  const icon = { added: '+', removed: '−', changed: '~', moved: '→' } as const
  return entries.map(e => `${icon[e.kind]} ${e.page === 0 ? '元信息' : `第 ${e.page} 页`}：${e.summary}`).join('\n')
}

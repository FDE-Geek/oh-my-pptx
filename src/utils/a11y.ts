import type { Slide } from '../types'

/** 读屏用短标题：有 title 用 title，金句页截 quote。 */
export function slideHeading(slide: Slide | undefined): string {
  if (!slide) return ''
  if ('title' in slide && typeof slide.title === 'string' && slide.title.trim()) {
    return slide.title.trim()
  }
  if (slide.type === 'quote' && slide.quote.trim()) {
    const q = slide.quote.trim()
    return q.length > 40 ? `${q.slice(0, 40)}…` : q
  }
  return slide.type
}

export function slideLiveText(page: number, total: number, slide: Slide | undefined): string {
  const heading = slideHeading(slide)
  const base = `第 ${page + 1} 页，共 ${total} 页`
  return heading ? `${base}。${heading}` : base
}

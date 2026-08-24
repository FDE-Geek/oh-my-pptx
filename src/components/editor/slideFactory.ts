import type { Slide } from '../../types'

export const SLIDE_TYPE_META: { type: Slide['type']; label: string }[] = [
  { type: 'cover', label: '封面' },
  { type: 'section', label: '章节' },
  { type: 'content', label: '正文' },
  { type: 'two-column', label: '双栏' },
  { type: 'quote', label: '金句' },
  { type: 'code', label: '代码' },
  { type: 'image', label: '图片' },
  { type: 'table', label: '表格' },
  { type: 'chart', label: '图表' },
  { type: 'diagram', label: '图示' },
  { type: 'end', label: '结尾' },
]

export const SLIDE_TYPE_LABEL: Record<Slide['type'], string> = Object.fromEntries(
  SLIDE_TYPE_META.map(item => [item.type, item.label]),
) as Record<Slide['type'], string>

export const NEW_SLIDE: Record<Slide['type'], () => Slide> = {
  cover: () => ({ type: 'cover', title: '新封面' }),
  section: () => ({ type: 'section', title: '新章节' }),
  content: () => ({ type: 'content', title: '新页面', bullets: ['要点一', '要点二'] }),
  'two-column': () => ({
    type: 'two-column',
    title: '对比页',
    left: { title: '左', bullets: [] },
    right: { title: '右', bullets: [] },
  }),
  quote: () => ({ type: 'quote', quote: '新引用', author: '' }),
  code: () => ({ type: 'code', title: '代码页', code: 'console.log("hello")', language: 'js' }),
  image: () => ({ type: 'image', title: '图片页', src: '' }),
  table: () => ({ type: 'table', title: '表格页', headers: ['列一', '列二'], rows: [['', '']] }),
  chart: () => ({
    type: 'chart',
    title: '图表页',
    chart: {
      kind: 'bar',
      labels: ['一', '二', '三'],
      series: [{ name: '系列一', data: [1, 2, 3] }],
    },
  }),
  diagram: () => ({
    type: 'diagram',
    title: '图示页',
    diagram: {
      nodes: [
        { id: 'a', x: 80, y: 60, label: '开始' },
        { id: 'b', x: 280, y: 60, label: '处理' },
        { id: 'c', x: 480, y: 60, label: '结束' },
      ],
      edges: [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c' },
      ],
    },
  }),
  end: () => ({ type: 'end', title: 'Thanks' }),
}

function slideTitle(slide: Slide): string | undefined {
  if ('title' in slide && typeof slide.title === 'string' && slide.title) return slide.title
  if (slide.type === 'quote' && slide.quote) return slide.quote
  return undefined
}

function slideBullets(slide: Slide): string[] | undefined {
  if (slide.type === 'content') return slide.bullets
  if (slide.type === 'end') return slide.takeaways
  if (slide.type === 'two-column') return [...(slide.left.bullets ?? []), ...(slide.right.bullets ?? [])]
  return undefined
}

/** 换页型：保留共有字段与标题/要点，其余用新页型缺省。 */
export function convertSlide(slide: Slide, next: Slide['type']): Slide {
  if (slide.type === next) return slide
  const fresh = NEW_SLIDE[next]()
  const title = slideTitle(slide)
  const bullets = slideBullets(slide)
  const shared = {
    tag: slide.tag,
    notes: slide.notes,
    narration: slide.narration,
    narrationAudio: slide.narrationAudio,
    duration: slide.duration,
    animation: slide.animation,
    transition: slide.transition,
  }
  if (title) {
    if (fresh.type === 'quote') fresh.quote = title
    else if ('title' in fresh) fresh.title = title
  }
  if (bullets?.length) {
    if (fresh.type === 'content') fresh.bullets = bullets.slice(0, 6)
    else if (fresh.type === 'end') fresh.takeaways = bullets.slice(0, 6)
    else if (fresh.type === 'two-column') {
      const mid = Math.ceil(bullets.length / 2)
      fresh.left = { ...fresh.left, bullets: bullets.slice(0, mid) }
      fresh.right = { ...fresh.right, bullets: bullets.slice(mid) }
    }
  }
  return { ...fresh, ...shared }
}

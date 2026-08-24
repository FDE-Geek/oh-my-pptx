export type Transition = 'fade' | 'slide' | 'zoom' | 'none'

interface SlideBase {
  notes?: string
  transition?: Transition
  /** TTS 旁白文本；缺省时用 title+bullets 拼接 */
  narration?: string
  /** 自动放映时该页停留毫秒数；缺省由朗读时长或默认值决定 */
  duration?: number
}

export interface CoverSlide extends SlideBase {
  type: 'cover'
  title: string
  subtitle?: string
}

export interface SectionSlide extends SlideBase {
  type: 'section'
  title: string
  subtitle?: string
}

export interface ContentSlide extends SlideBase {
  type: 'content'
  title: string
  bullets?: string[]
  step?: boolean
}

export interface EndSlide extends SlideBase {
  type: 'end'
  title: string
  subtitle?: string
}

export interface ColumnContent {
  title?: string
  bullets?: string[]
}

export interface TwoColumnSlide extends SlideBase {
  type: 'two-column'
  title: string
  left: ColumnContent
  right: ColumnContent
}

export interface QuoteSlide extends SlideBase {
  type: 'quote'
  quote: string
  author?: string
}

export interface CodeSlide extends SlideBase {
  type: 'code'
  title: string
  code: string
  language?: string
  filename?: string
}

export interface ImageSlide extends SlideBase {
  type: 'image'
  title: string
  src: string
  caption?: string
}

export interface TableSlide extends SlideBase {
  type: 'table'
  title: string
  headers: string[]
  rows: string[][]
}

export type ChartKind = 'bar' | 'line' | 'pie'

export interface ChartSpec {
  kind: ChartKind
  labels: string[]
  series: { name: string; data: number[] }[]
}

export interface ChartSlide extends SlideBase {
  type: 'chart'
  title: string
  chart: ChartSpec
}

/** X6 图节点（简化 spec，独立于 X6 内部格式）。 */
export interface DiagramNodeSpec {
  id: string
  x: number
  y: number
  width?: number
  height?: number
  label: string
  shape?: 'rect' | 'ellipse' | 'diamond' | 'double-rect'
  fill?: string
}

export interface DiagramEdgeSpec {
  source: string
  target: string
  label?: string
  dashed?: boolean
  arrow?: boolean
  /** 路由：normal 直线 / orth 正交拐线（缺省） */
  router?: 'normal' | 'orth'
}

export interface DiagramSpec {
  nodes: DiagramNodeSpec[]
  edges: DiagramEdgeSpec[]
  /** 自动布局：dagre（DAG 分层）/ 指定后 x/y 可省略自动计算 */
  layout?: 'dagre'
  /** dagre 布局方向：TB 上下 / LR 左右（缺省 TB） */
  layoutDir?: 'TB' | 'LR'
}

export interface DiagramSlide extends SlideBase {
  type: 'diagram'
  title: string
  diagram: DiagramSpec
}

export type Slide =
  | CoverSlide
  | SectionSlide
  | ContentSlide
  | EndSlide
  | TwoColumnSlide
  | QuoteSlide
  | CodeSlide
  | ImageSlide
  | TableSlide
  | ChartSlide
  | DiagramSlide

export interface ThemeConfig {
  autoChange: boolean
  changeByOS: boolean
  changeByHour: boolean
  hourDarkActive: string
  hourDarkInactive: string
}

export interface NarrationConfig {
  enabled: boolean
  lang: string
  rate: number
  voiceName?: string
}

export interface AutoplayConfig {
  enabled: boolean
  /** 无旁白页面的默认停留毫秒数 */
  defaultDuration: number
}

export interface PPTConfig {
  title: string
  author: string
  accent?: string
  transition?: Transition
  theme: ThemeConfig
  narration: NarrationConfig
  autoplay: AutoplayConfig
  slides: Slide[]
}

export const DECK_CHANNEL = 'oh-my-ppt:deck'

export interface DeckMessage {
  kind: 'goto'
  page: number
}

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

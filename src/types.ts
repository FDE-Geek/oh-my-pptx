export type Transition = 'fade' | 'slide' | 'zoom' | 'none'

interface SlideBase {
  notes?: string
  transition?: Transition
  /** 页眉面包屑（如 '§1 · 进程启动链路'），显示在标题上方。 */
  tag?: string
  /** TTS 旁白文本；缺省时用 title+bullets 拼接 */
  narration?: string
  /** 旁白音频文件地址（设置后此页不用 TTS，音频走 AudioMixer 混入录制流）。 */
  narrationAudio?: string
  /** 自动放映时该页停留毫秒数；缺省由朗读/音频时长或默认值决定 */
  duration?: number
  /** 入场时序（毫秒）：自动放映时按时间轴显示 bullets；手动模式仍可 step 翻。 */
  animation?: AnimationStep[]
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
  /** 目录条目（提供时渲染为 TOC 目录页：编号+标题+摘要）。 */
  items?: { title: string; summary?: string }[]
}

export interface ContentSlide extends SlideBase {
  type: 'content'
  title: string
  bullets?: string[]
  step?: boolean
  /** 版式：left 左对齐缺省 / center 居中 / card 卡片式 */
  layout?: 'left' | 'center' | 'card'
}

export interface EndSlide extends SlideBase {
  type: 'end'
  title: string
  subtitle?: string
  /** 结尾记忆点（如三句话带走），在标题下方逐条展示。 */
  takeaways?: string[]
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

/** 可丢入 themes/ 目录的主题预设（对应 OpenDesign 的设计系统包）。 */
export interface ThemePreset {
  id: string
  name: string
  /** 种子色（驱动 OKLCH 全套推导）。 */
  accent?: string
  /** 正文字体族（CSS font-family 值）。 */
  fontFamily?: string
  /** 标题字体族。 */
  headingFontFamily?: string
  /** 版式密度：compact 紧凑 / normal 缺省 / airy 宽松（影响 φ 基准倍率）。 */
  density?: 'compact' | 'normal' | 'airy'
  /** 全局切换动效覆盖。 */
  transition?: Transition
  /** 备注（来源/授权说明）。 */
  description?: string
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

/** 逐页动画时间轴（自动放映时元素级入场时序，毫秒相对页面开始）。 */
export interface AnimationStep {
  /** 起始毫秒（0 = 与页面同时出现）。 */
  at: number
  /** 作用的元素序号：bullets 索引 / 图表系列等；缺省按声明顺序。 */
  index?: number
}

export interface PPTConfig {
  title: string
  author: string
  accent?: string
  /** 引用 themes/ 目录中的主题预设 id（如 'tech-share'），缺省用内置风格。 */
  themePreset?: string
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

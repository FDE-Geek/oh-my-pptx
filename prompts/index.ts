/**
 * prompt 库：deck 生成用的分段提示词模板。
 * 被 CLI 生成器与 Claude Code skill 共用；`{topic}` 占位。
 */

import { formatClarifyBlock, type ClarifyAnswers } from './clarify.ts'

export { CLARIFY_QUESTIONS, formatClarifyBlock, parseMinutes } from './clarify.ts'
export type { ClarifyAnswers, ClarifyId } from './clarify.ts'

export interface PromptTemplate {
  id: string
  name: string
  /** 系统指令碎片（页型/schema 约束）。 */
  system: string
  /** 用户提示词模板。 */
  user: string
}

export const SCHEMA_BRIEF = `你是 oh-my-ppt 演示文稿作者。输出且仅输出一个 JSON 对象（无 markdown 代码块包裹），符合以下 TypeScript 类型：

interface Deck {
  title: string
  author: string          // 固定写 "Abel-数字牧民"（用户未另行指定时）
  accent?: string          // hex 种子色，整套界面色由 OKLCH 算法推导
  themePreset?: 'tech-share' | 'product-launch' | 'academic'
  transition?: 'fade' | 'slide' | 'zoom' | 'none'
  narration: { enabled: boolean, lang: string, rate: number }
  autoplay: { enabled: boolean, defaultDuration: number }
  theme: { autoChange: boolean, changeByOS: boolean, changeByHour: boolean, hourDarkActive: string, hourDarkInactive: string }
  slides: Slide[]
}

type Slide =
  | { type: 'cover', title: string, subtitle?: string }
  | { type: 'section', title: string, subtitle?: string, items?: { title: string, summary?: string }[] }
  | { type: 'content', title: string, bullets?: string[], step?: boolean, layout?: 'left' | 'center' | 'card' }
  | { type: 'two-column', title: string, left: { title?: string, bullets?: string[] }, right: { title?: string, bullets?: string[] } }
  | { type: 'quote', quote: string, author?: string }
  | { type: 'code', title: string, code: string, language?: string, filename?: string }
  | { type: 'image', title: string, src: string, caption?: string }
  | { type: 'table', title: string, headers: string[], rows: string[][] }
  | { type: 'chart', title: string, chart: { kind: 'bar' | 'line' | 'pie', labels: string[], series: { name: string, data: number[] }[] } }
  | { type: 'diagram', title: string, diagram: { layout?: 'dagre', layoutDir?: 'TB' | 'LR', flow?: string, nodes?: { id: string, x: number, y: number, label: string, fill?: string, shape?: 'rect' | 'ellipse' | 'diamond' | 'double-rect' }[], edges?: { source: string, target: string, label?: string, dashed?: boolean }[] } }
  | { type: 'end', title: string, subtitle?: string, takeaways?: string[] }

每页可选 tag（页眉面包屑）、notes（讲者备注）与 narration（TTS 旁白口播稿）。
section.items 有值时渲染为 TOC 目录页；end.takeaways 为结尾记忆点。`

export const WRITING_RULES = `写作守则：
1. 一页一个观点：content 页 bullets ≤ 6 条，每条 ≤ 20 字（中文）。
2. 章节节奏：每 4–6 页插一个 section 过渡页。
3. 数据表达：对比用 two-column，趋势用 chart(line)，占比用 chart(pie)，明细用 table，流程/架构用 diagram。diagram 优先写 flow 简写（自研，非 Infographic），例如 "@dir LR" 换行后 "cfg[读配置] -> db[数据库] -.-> swm"。不要 flow 与 nodes 混写；id 仅 ASCII。生成器会展开成 nodes/edges。
4. 讲稿字段分工（不要写反）：
   | 字段 | 写给谁 | 写法 | 示例 |
   | notes | 讲者 | 目的：…转场：… | 目的：建立问题意识。转场：下一页给出数据。 |
   | narration | TTS | 完整口播句 | 今天我们只回答一个问题：为什么启动会卡在这一步。 |
   正文页（非 cover/section/end）都应写 notes；narration ≠ 屏幕文字。
5. 代码页 ≤ 15 行，保持缩进。
6. 中文文案标点全角，中英之间加空格。`

export const QUALITY_RULES = `质量自检（生成后立即心算检查，不通过就重写）：
- 首页必须是 cover，末页必须是 end。
- chart 页 series.data 与 labels 数量一致且非空。
- table 页 rows 每行列数 = headers.length。
- diagram 页优先 flow 简写；若写 nodes/edges，则 source/target 都在 nodes.id 里。id 只含 ASCII。
- 总页数 8–20 页之间。`

const NOTES_SHAPE = `每页 notes 用「目的：…转场：…」；narration 写完整口播句。end 给 takeaways 三条记忆点。`

const ARC_FULL = `叙事弧骨架（按主题微调，不要硬套页型）：
- 钩子 Hook（1 页）：反差/问题/硬数据，让人停下来
- 定调 Context（1–2 页）：背景、你是谁、为什么讲
- 主体 Core（中间页）：按章节推进，页型混排
- 转折 Shift（1 页）：打破预期（quote 或 two-column）
- 收束 Takeaway（1–2 页）：金句 + end.takeaways 三条`

const ARC_LIGHTNING = `叙事弧（闪电裁剪）：钩子 1 页 → 主体爆点 3–5 页 → 收束 end.takeaways。不设 section，不做长定调。`

const ARC_DATA = `叙事弧（汇报裁剪）：开场硬数据钩子 → 目标/口径定调 → 图表主体 → end.takeaways（结论三条）。转折可用 two-column 做目标 vs 实际。`

export interface PageBudgetSpec {
  min: number
  max: number
  defaultRange: string
  /** 有时长时 pages = clamp(round(minutes / divisor), min, max)。缺省则用 defaultRange。 */
  divisor?: number
  /** 固定区间，不按时长换算（lightning-talk）。 */
  fixed?: boolean
}

export const PAGE_BUDGET: Record<string, PageBudgetSpec> = {
  'full-deck': { min: 8, max: 30, defaultRange: '12–18', divisor: 1.5 },
  'lightning-talk': { min: 6, max: 8, defaultRange: '6–8', fixed: true },
  'data-review': { min: 10, max: 24, defaultRange: '12–16', divisor: 1.5 },
  'tech-tutorial': { min: 8, max: 24, defaultRange: '10–16', divisor: 1.5 },
}

export interface PageBudgetResult {
  min: number
  max: number
  target?: number
  hint: string
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** 按模板换算页数。lightning 固定 6–8；无时长回落各模板缺省区间。 */
export function pageBudget(promptId: string, minutes?: number): PageBudgetResult {
  const spec = PAGE_BUDGET[promptId] ?? PAGE_BUDGET['full-deck']
  if (spec.fixed) {
    return {
      min: spec.min,
      max: spec.max,
      hint: `本模板固定 ${spec.min}–${spec.max} 页，不按时长换算。`,
    }
  }
  if (minutes && minutes > 0 && spec.divisor) {
    const target = clamp(Math.round(minutes / spec.divisor), spec.min, spec.max)
    return {
      min: spec.min,
      max: spec.max,
      target,
      hint: `本模板目标 ${target} 页（区间 ${spec.min}–${spec.max}；按 ${minutes} 分钟换算）。`,
    }
  }
  return {
    min: spec.min,
    max: spec.max,
    hint: `本模板页数 ${spec.defaultRange} 页（未指定时长，用缺省区间）。`,
  }
}

export const PROMPTS: PromptTemplate[] = [
  {
    id: 'full-deck',
    name: '完整演示（默认）',
    system: `${SCHEMA_BRIEF}\n\n${WRITING_RULES}\n\n${QUALITY_RULES}`,
    user: `主题：{topic}

{clarify}{pageBudget}
${ARC_FULL}
${NOTES_SHAPE}

生成一份完整演示文稿：cover 开场 → 2–3 个章节（section 分隔）→ 每章 2–4 页正文（混合使用 content/two-column/chart/diagram 增加节奏）→ quote 或金句页 → end 收尾。
根据主题气质选择 themePreset 与 accent（技术主题用 tech-share，消费/发布用 product-launch，学术用 academic）。
演讲稿 narration.enabled 设为 true；每页写 narration 口播稿与 notes。`,
  },
  {
    id: 'lightning-talk',
    name: '闪电演讲（5 分钟）',
    system: `${SCHEMA_BRIEF}\n\n${WRITING_RULES}\n\n${QUALITY_RULES}`,
    user: `主题：{topic}

{clarify}{pageBudget}
${ARC_LIGHTNING}
${NOTES_SHAPE}

闪电演讲模式：总共 6–8 页。cover → 3–5 页高密度内容（每页一个爆点，step: true 逐条出现）→ end。不设 section 页，动效用 'slide' 保持节奏感。
演讲稿 narration.enabled 设为 true；每页写 narration 与 notes。`,
  },
  {
    id: 'data-review',
    name: '数据汇报',
    system: `${SCHEMA_BRIEF}\n\n${WRITING_RULES}\n\n${QUALITY_RULES}`,
    user: `汇报主题：{topic}

{clarify}{pageBudget}
${ARC_DATA}
${NOTES_SHAPE}

数据汇报模式：重点用 chart 页呈现趋势与占比（至少 3 张图，数据合理编造并标注单位），two-column 做目标 vs 实际对比，table 收明细。narration 风格：结论先行，数字口播清晰。
演讲稿 narration.enabled 设为 true；每页写 narration 与 notes。`,
  },
  {
    id: 'tech-tutorial',
    name: '技术教程',
    system: `${SCHEMA_BRIEF}\n\n${WRITING_RULES}\n\n${QUALITY_RULES}`,
    user: `教程主题：{topic}

{clarify}{pageBudget}
${ARC_FULL}
${NOTES_SHAPE}

技术教程模式：原理图用 diagram（dagre 自动布局），关键代码用 code 页（带 filename 与 language），步骤用 content + step 逐条展开。themePreset 固定 'tech-share'。
演讲稿 narration.enabled 设为 true；每页写 narration 与 notes。`,
  },
]

export function findPrompt(id?: string): PromptTemplate {
  return PROMPTS.find(p => p.id === id) ?? PROMPTS[0]
}

export interface RenderPromptExtras {
  minutes?: number
  clarify?: string
  answers?: ClarifyAnswers
}

export function renderUserPrompt(template: PromptTemplate, topic: string, extras?: RenderPromptExtras): string {
  const clarify = extras?.clarify
    ?? (extras?.answers ? formatClarifyBlock(extras.answers) : '')
  const budget = pageBudget(template.id, extras?.minutes)
  const clarifyBlock = clarify ? `${clarify}\n\n` : ''
  return template.user
    .replaceAll('{topic}', topic)
    .replaceAll('{clarify}', clarifyBlock)
    .replaceAll('{pageBudget}', `【页数预算】${budget.hint}\n`)
}

/**
 * prompt 库：deck 生成用的分段提示词模板。
 * 被 CLI 生成器与 Claude Code skill 共用；`{topic}` 占位。
 */

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
  author: string
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
  | { type: 'section', title: string, subtitle?: string }
  | { type: 'content', title: string, bullets?: string[], step?: boolean, layout?: 'left' | 'center' | 'card' }
  | { type: 'two-column', title: string, left: { title?: string, bullets?: string[] }, right: { title?: string, bullets?: string[] } }
  | { type: 'quote', quote: string, author?: string }
  | { type: 'code', title: string, code: string, language?: string, filename?: string }
  | { type: 'image', title: string, src: string, caption?: string }
  | { type: 'table', title: string, headers: string[], rows: string[][] }
  | { type: 'chart', title: string, chart: { kind: 'bar' | 'line' | 'pie', labels: string[], series: { name: string, data: number[] }[] } }
  | { type: 'diagram', title: string, diagram: { layout?: 'dagre', layoutDir?: 'TB' | 'LR', nodes: { id: string, x: number, y: number, label: string, fill?: string, shape?: 'rect' | 'ellipse' | 'diamond' | 'double-rect' }[], edges: { source: string, target: string, label?: string, dashed?: boolean }[] } }
  | { type: 'end', title: string, subtitle?: string }

每页可选 notes（讲者备注）与 narration（TTS 旁白口播稿）。`

export const WRITING_RULES = `写作守则：
1. 一页一个观点：content 页 bullets ≤ 6 条，每条 ≤ 20 字（中文）。
2. 章节节奏：每 4–6 页插一个 section 过渡页。
3. 数据表达：对比用 two-column，趋势用 chart(line)，占比用 chart(pie)，明细用 table，流程/架构用 diagram（layout:'dagre' 时坐标可全 0）。
4. 旁白 narration 写完整口播句子，≠ 屏幕文字。
5. 代码页 ≤ 15 行，保持缩进。
6. 中文文案标点全角，中英之间加空格。`

export const QUALITY_RULES = `质量自检（生成后立即心算检查，不通过就重写）：
- 首页必须是 cover，末页必须是 end。
- chart 页 series.data 与 labels 数量一致且非空。
- table 页 rows 每行列数 = headers.length。
- diagram 页 edges 引用的 source/target 都在 nodes.id 里。
- 总页数 8–20 页之间。`

export const PROMPTS: PromptTemplate[] = [
  {
    id: 'full-deck',
    name: '完整演示（默认）',
    system: `${SCHEMA_BRIEF}\n\n${WRITING_RULES}\n\n${QUALITY_RULES}`,
    user: `主题：{topic}

生成一份完整演示文稿：cover 开场 → 2–3 个章节（section 分隔）→ 每章 2–4 页正文（混合使用 content/two-column/chart/diagram 增加节奏）→ quote 或金句页 → end 收尾。
根据主题气质选择 themePreset 与 accent（技术主题用 tech-share，消费/发布用 product-launch，学术用 academic）。
每页写 narration 口播稿。`,
  },
  {
    id: 'lightning-talk',
    name: '闪电演讲（5 分钟）',
    system: `${SCHEMA_BRIEF}\n\n${WRITING_RULES}\n\n${QUALITY_RULES}`,
    user: `主题：{topic}

闪电演讲模式：总共 6–8 页。cover → 3–5 页高密度内容（每页一个爆点，step: true 逐条出现）→ end。不设 section 页，动效用 'slide' 保持节奏感。`,
  },
  {
    id: 'data-review',
    name: '数据汇报',
    system: `${SCHEMA_BRIEF}\n\n${WRITING_RULES}\n\n${QUALITY_RULES}`,
    user: `汇报主题：{topic}

数据汇报模式：重点用 chart 页呈现趋势与占比（至少 3 张图，数据合理编造并标注单位），two-column 做目标 vs 实际对比，table 收明细。narration 风格：结论先行，数字口播清晰。`,
  },
  {
    id: 'tech-tutorial',
    name: '技术教程',
    system: `${SCHEMA_BRIEF}\n\n${WRITING_RULES}\n\n${QUALITY_RULES}`,
    user: `教程主题：{topic}

技术教程模式：原理图用 diagram（dagre 自动布局），关键代码用 code 页（带 filename 与 language），步骤用 content + step 逐条展开。themePreset 固定 'tech-share'。`,
  },
]

export function findPrompt(id?: string): PromptTemplate {
  return PROMPTS.find(p => p.id === id) ?? PROMPTS[0]
}

export function renderUserPrompt(template: PromptTemplate, topic: string): string {
  return template.user.replaceAll('{topic}', topic)
}

/**
 * 生成前澄清：五问库。
 * CLI `--ask` 逐问；skill 信息齐则跳过。答案合并进 user prompt 头部。
 */

export const CLARIFY_QUESTIONS = [
  {
    id: 'style',
    question: '风格基调与主题色？',
    options: ['tech-share', 'product-launch', 'academic', '由内容决定'] as const,
  },
  {
    id: 'audience',
    question: '受众与场景？',
    example: '行业内部 / 商业发布 / demo day / 私享会',
  },
  {
    id: 'duration',
    question: '分享时长（分钟）？',
    hint: '用于页数预算（lightning-talk 固定 6–8 页，不吃换算）',
  },
  {
    id: 'material',
    question: '有原始素材吗？',
    hint: '文档/数据/旧 PPT/链接——有则基于素材，无则代拟',
  },
  {
    id: 'hard',
    question: '硬约束？',
    hint: '必须包含 XX / 不能出现 YY / 图片与配色特殊要求也写这里',
  },
] as const

export type ClarifyId = (typeof CLARIFY_QUESTIONS)[number]['id']
export type ClarifyAnswers = Partial<Record<ClarifyId, string>>

/** 从时长回答抽出第一个正数（「约 15 分钟」→ 15）。 */
export function parseMinutes(raw?: string): number | undefined {
  if (!raw) return undefined
  const m = raw.match(/(\d+(?:\.\d+)?)/)
  if (!m) return undefined
  const n = Number(m[1])
  if (!Number.isFinite(n) || n <= 0) return undefined
  return n
}

/** 把五问答案收成写入 user prompt 的摘要块；全空则返回空串。 */
export function formatClarifyBlock(answers: ClarifyAnswers): string {
  const lines: string[] = []
  const style = answers.style?.trim()
  if (style) {
    const preset = style === 'tech-share' || style === 'product-launch' || style === 'academic'
      ? `（themePreset 用 ${style}）`
      : ''
    lines.push(`- 风格基调：${style}${preset}`)
  }
  if (answers.audience?.trim()) lines.push(`- 受众与场景：${answers.audience.trim()}`)
  if (answers.duration?.trim()) lines.push(`- 分享时长：${answers.duration.trim()}`)
  if (answers.material?.trim()) lines.push(`- 原始素材：${answers.material.trim()}`)
  if (answers.hard?.trim()) lines.push(`- 硬约束：${answers.hard.trim()}`)
  if (lines.length === 0) return ''
  return `【需求澄清】\n${lines.join('\n')}`
}

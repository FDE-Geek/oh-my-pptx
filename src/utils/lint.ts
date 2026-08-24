import type { PPTConfig } from '../types'

export interface LintIssue {
  page: number
  level: 'error' | 'warn'
  message: string
  /** 稳定检查码（如 'unknown-key'），机器可读。 */
  code: string
  /** 字段路径（unknown-key 用），如 'slides[2].bullets'。 */
  path?: string
}

/* ── 字段白名单（unknown-key 检查；与 types.ts 同步维护） ────── */

const SLIDE_KEYS: Record<string, Set<string>> = {
  common: new Set(['type', 'notes', 'transition', 'tag', 'narration', 'narrationAudio', 'duration', 'animation']),
  cover: new Set(['title', 'subtitle']),
  section: new Set(['title', 'subtitle', 'items']),
  content: new Set(['title', 'bullets', 'step', 'layout']),
  'two-column': new Set(['title', 'left', 'right']),
  quote: new Set(['quote', 'author']),
  code: new Set(['title', 'code', 'language', 'filename']),
  image: new Set(['title', 'src', 'caption']),
  table: new Set(['title', 'headers', 'rows']),
  chart: new Set(['title', 'chart']),
  diagram: new Set(['title', 'diagram']),
  end: new Set(['title', 'subtitle', 'takeaways']),
}

const DOC_KEYS = new Set([
  'title', 'author', 'accent', 'themePreset', 'transition', 'theme',
  'narration', 'autoplay', 'slides',
])

/**
 * 内容质量闸：deck 数据的结构性检查（纯函数）。
 * CLI 生成后强制跑；编辑器保存/导出前提示性跑。
 */
export function lintDeck(doc: PPTConfig): LintIssue[] {
  const issues: LintIssue[] = []

  if (doc.slides.length === 0) {
    issues.push({ page: 0, level: 'error', message: 'deck 没有任何页面', code: 'empty-deck' })
    return issues
  }

  // unknown-key：静默拼错最常见（AI 生成尤甚）——对照白名单告警
  for (const key of Object.keys(doc)) {
    if (!DOC_KEYS.has(key)) {
      issues.push({
        page: 0, level: 'warn', code: 'unknown-key', path: key,
        message: `文档未知字段「${key}」将被忽略（拼写错误？）`,
      })
    }
  }

  doc.slides.forEach((slide, index) => {
    const page = index + 1
    const label = `第 ${page} 页（${slide.type}）`

    const allowed = SLIDE_KEYS.common
    const own = SLIDE_KEYS[slide.type]
    if (own) {
      for (const key of Object.keys(slide)) {
        if (!allowed.has(key) && !own.has(key)) {
          issues.push({
            page, level: 'warn', code: 'unknown-key', path: `slides[${index}].${key}`,
            message: `${label}：未知字段「${key}」将被忽略（拼写错误？）`,
          })
        }
      }
    } else {
      issues.push({ page, level: 'error', code: 'unknown-slide-type', message: `${label}：未知页型，将渲染为占位页` })
    }

    if (index === 0 && slide.type !== 'cover') {
      issues.push({ page, level: 'warn', code: 'cover-first', message: `${label}：deck 首页建议用 cover` })
    }
    if (index === doc.slides.length - 1 && slide.type !== 'end') {
      issues.push({ page, level: 'warn', code: 'end-last', message: `${label}：deck 末页建议用 end` })
    }

    switch (slide.type) {
      case 'content': {
        const bullets = slide.bullets ?? []
        if (bullets.length > 6) {
          issues.push({ page, level: 'warn', code: 'bullets-count', message: `${label}：bullets ${bullets.length} 条超过 6，建议拆页` })
        }
        bullets.forEach((bullet, i) => {
          if (bullet.length > 30) {
            issues.push({ page, level: 'warn', code: 'bullet-length', message: `${label}：第 ${i + 1} 条 ${bullet.length} 字过长（≤20 最佳）` })
          }
        })
        break
      }
      case 'chart': {
        const { labels, series } = slide.chart
        if (labels.length === 0) {
          issues.push({ page, level: 'error', code: 'chart-empty-labels', message: `${label}：图表 labels 为空` })
        }
        for (const s of series) {
          if (s.data.length !== labels.length) {
            issues.push({
              page,
              level: 'error',
              code: 'chart-data-misalign',
              message: `${label}：系列「${s.name}」数据 ${s.data.length} 个 ≠ labels ${labels.length} 个`,
            })
          }
          if (s.data.every(v => v === 0)) {
            issues.push({ page, level: 'warn', code: 'chart-all-zero', message: `${label}：系列「${s.name}」全为 0` })
          }
        }
        break
      }
      case 'table': {
        slide.rows.forEach((row, i) => {
          if (row.length !== slide.headers.length) {
            issues.push({
              page,
              level: 'error',
              code: 'table-col-mismatch',
              message: `${label}：第 ${i + 1} 行 ${row.length} 列 ≠ 表头 ${slide.headers.length} 列`,
            })
          }
        })
        break
      }
      case 'diagram': {
        const ids = new Set(slide.diagram.nodes.map(n => n.id))
        if (slide.diagram.nodes.length === 0) {
          issues.push({ page, level: 'error', code: 'diagram-empty', message: `${label}：图示没有任何节点` })
        }
        const dup = slide.diagram.nodes.find((n, i, arr) => arr.findIndex(m => m.id === n.id) !== i)
        if (dup) {
          issues.push({ page, level: 'error', code: 'diagram-dup-id', message: `${label}：节点 id 重复「${dup.id}」` })
        }
        for (const edge of slide.diagram.edges) {
          if (!ids.has(edge.source) || !ids.has(edge.target)) {
            issues.push({
              page,
              level: 'error',
              code: 'diagram-dangling-edge',
              message: `${label}：边 ${edge.source}→${edge.target} 引用了不存在的节点`,
            })
          }
        }
        break
      }
      case 'image': {
        if (!slide.src) {
          issues.push({ page, level: 'error', code: 'image-empty-src', message: `${label}：图片 src 为空` })
        }
        break
      }
    }
  })

  // 节奏检查：连续 content 无 section 超过 6 页
  let run = 0
  doc.slides.forEach((slide, index) => {
    if (slide.type === 'content') {
      run++
      if (run === 7) {
        issues.push({
          page: index + 1,
          level: 'warn',
          code: 'section-rhythm',
          message: `已连续 ${run} 页 content 无 section 过渡，建议插入章节页调节节奏`,
        })
      }
    } else {
      run = 0
    }
  })

  // 现场经验层：备注覆盖（仅演讲稿；分母排除结构页）
  if (doc.narration?.enabled) {
    const body = doc.slides.filter(s => s.type !== 'cover' && s.type !== 'section' && s.type !== 'end')
    if (body.length > 0) {
      const covered = body.filter(s => typeof s.notes === 'string' && s.notes.trim().length > 0).length
      if (covered / body.length < 0.5) {
        issues.push({
          page: 0,
          level: 'warn',
          code: 'notes-coverage',
          message: `正文页备注覆盖 ${covered}/${body.length}（<50%），建议每页 notes 写目的+转场`,
        })
      }
    }
  }

  // 现场经验层：收束双缺才报（end.takeaways 或末三页 quote）
  const last = doc.slides[doc.slides.length - 1]
  const endHasTakeaways = last?.type === 'end'
    && Array.isArray(last.takeaways)
    && last.takeaways.length > 0
  const last3HasQuote = doc.slides.slice(-3).some(s => s.type === 'quote')
  if (!endHasTakeaways && !last3HasQuote) {
    issues.push({
      page: doc.slides.length,
      level: 'warn',
      code: 'narrative-tail',
      message: '收束不完整：end 缺 takeaways 且末三页无 quote',
    })
  }

  return issues
}

export function formatIssues(issues: LintIssue[]): string {
  if (issues.length === 0) return '✓ 质量检查通过，无问题'
  const lines = issues.map(
    issue => `${issue.level === 'error' ? '✗' : '⚠'} [${issue.code}] ${issue.message}`,
  )
  const errors = issues.filter(i => i.level === 'error').length
  return `${lines.join('\n')}\n\n共 ${errors} 错误 / ${issues.length - errors} 警告`
}

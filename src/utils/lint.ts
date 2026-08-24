import type { PPTConfig } from '../types'

export interface LintIssue {
  page: number
  level: 'error' | 'warn'
  message: string
}

/**
 * 内容质量闸：deck 数据的结构性检查（纯函数）。
 * CLI 生成后强制跑；编辑器保存/导出前提示性跑。
 */
export function lintDeck(doc: PPTConfig): LintIssue[] {
  const issues: LintIssue[] = []

  if (doc.slides.length === 0) {
    issues.push({ page: 0, level: 'error', message: 'deck 没有任何页面' })
    return issues
  }

  doc.slides.forEach((slide, index) => {
    const page = index + 1
    const label = `第 ${page} 页（${slide.type}）`

    if (index === 0 && slide.type !== 'cover') {
      issues.push({ page, level: 'warn', message: `${label}：deck 首页建议用 cover` })
    }
    if (index === doc.slides.length - 1 && slide.type !== 'end') {
      issues.push({ page, level: 'warn', message: `${label}：deck 末页建议用 end` })
    }

    switch (slide.type) {
      case 'content': {
        const bullets = slide.bullets ?? []
        if (bullets.length > 6) {
          issues.push({ page, level: 'warn', message: `${label}：bullets ${bullets.length} 条超过 6，建议拆页` })
        }
        bullets.forEach((bullet, i) => {
          if (bullet.length > 30) {
            issues.push({ page, level: 'warn', message: `${label}：第 ${i + 1} 条 ${bullet.length} 字过长（≤20 最佳）` })
          }
        })
        break
      }
      case 'chart': {
        const { labels, series } = slide.chart
        if (labels.length === 0) {
          issues.push({ page, level: 'error', message: `${label}：图表 labels 为空` })
        }
        for (const s of series) {
          if (s.data.length !== labels.length) {
            issues.push({
              page,
              level: 'error',
              message: `${label}：系列「${s.name}」数据 ${s.data.length} 个 ≠ labels ${labels.length} 个`,
            })
          }
          if (s.data.every(v => v === 0)) {
            issues.push({ page, level: 'warn', message: `${label}：系列「${s.name}」全为 0` })
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
              message: `${label}：第 ${i + 1} 行 ${row.length} 列 ≠ 表头 ${slide.headers.length} 列`,
            })
          }
        })
        break
      }
      case 'diagram': {
        const ids = new Set(slide.diagram.nodes.map(n => n.id))
        if (slide.diagram.nodes.length === 0) {
          issues.push({ page, level: 'error', message: `${label}：图示没有任何节点` })
        }
        const dup = slide.diagram.nodes.find((n, i, arr) => arr.findIndex(m => m.id === n.id) !== i)
        if (dup) {
          issues.push({ page, level: 'error', message: `${label}：节点 id 重复「${dup.id}」` })
        }
        for (const edge of slide.diagram.edges) {
          if (!ids.has(edge.source) || !ids.has(edge.target)) {
            issues.push({
              page,
              level: 'error',
              message: `${label}：边 ${edge.source}→${edge.target} 引用了不存在的节点`,
            })
          }
        }
        break
      }
      case 'image': {
        if (!slide.src) {
          issues.push({ page, level: 'error', message: `${label}：图片 src 为空` })
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
          message: `已连续 ${run} 页 content 无 section 过渡，建议插入章节页调节节奏`,
        })
      }
    } else {
      run = 0
    }
  })

  return issues
}

export function formatIssues(issues: LintIssue[]): string {
  if (issues.length === 0) return '✓ 质量检查通过，无问题'
  const lines = issues.map(
    issue => `${issue.level === 'error' ? '✗' : '⚠'} ${issue.message}`,
  )
  const errors = issues.filter(i => i.level === 'error').length
  return `${lines.join('\n')}\n\n共 ${errors} 错误 / ${issues.length - errors} 警告`
}

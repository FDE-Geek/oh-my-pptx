import type { PPTConfig } from '../types'

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/** 生成可直接落盘的 src/config.ts 内容。 */
export function toConfigSource(doc: PPTConfig): string {
  const slides = doc.slides
    .map(slide => `    ${JSON.stringify(slide)},`)
    .join('\n')
  const meta: string[] = [
    `  title: ${JSON.stringify(doc.title)},`,
    `  author: ${JSON.stringify(doc.author)},`,
  ]
  if (doc.accent) meta.push(`  accent: ${JSON.stringify(doc.accent)},`)
  if (doc.transition) meta.push(`  transition: ${JSON.stringify(doc.transition)},`)
  return `import type { PPTConfig } from './types'

// 由 oh-my-ppt 编辑器导出 · ${new Date().toISOString().slice(0, 10)}
export const CONFIG: PPTConfig = {
${meta.join('\n')}

  theme: {
    autoChange: ${doc.theme.autoChange},
    changeByOS: ${doc.theme.changeByOS},
    changeByHour: ${doc.theme.changeByHour},
    hourDarkActive: ${JSON.stringify(doc.theme.hourDarkActive)},
    hourDarkInactive: ${JSON.stringify(doc.theme.hourDarkInactive)},
  },

  narration: {
    enabled: ${doc.narration.enabled},
    lang: ${JSON.stringify(doc.narration.lang)},
    rate: ${doc.narration.rate},
  },

  autoplay: {
    enabled: ${doc.autoplay.enabled},
    defaultDuration: ${doc.autoplay.defaultDuration},
  },

  slides: [
${slides}
  ],
}
`
}

export function downloadConfigTs(doc: PPTConfig) {
  download(toConfigSource(doc), 'config.ts', 'text/typescript')
}

export function downloadJson(doc: PPTConfig) {
  download(
    JSON.stringify(doc, null, 2),
    'oh-my-ppt-doc.json',
    'application/json',
  )
}

/** 单文件数据块内容（明文 JSON，`<` 转义防 </script> 截断）。 */
export function toDocBlock(doc: PPTConfig): string {
  return JSON.stringify(doc).replace(/</g, '\\u003c')
}

/**
 * 解析导入文件：支持 editor 导出的 JSON / config.ts（提取 CONFIG 对象字面量）。
 * 返回 null 表示无法解析。
 */
export function parseImportedFile(content: string): PPTConfig | null {
  const trimmed = content.trim()

  // 1) 纯 JSON
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as PPTConfig
      return Array.isArray(parsed.slides) ? parsed : null
    } catch {
      return null
    }
  }

  // 2) config.ts：提取 "export const CONFIG..." 的对象字面量
  const match = /export\s+const\s+CONFIG[^{]*\{([\s\S]*)\}\s*;?\s*$/.exec(trimmed)
  if (!match) return null
  const body = match[1]

  // 去掉 import / 类型引用，把 TS 对象近似转为 JSON：
  // - 注释删除、单引号→双引号、尾逗号删除、裸键加引号
  const cleaned = body
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/'((?:[^'\\]|\\.)*)'/g, '"$1"')
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3')
    .replace(/(^|\n)(\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1$2"$3"$4')
    .replace(/,(\s*[}\]])/g, '$1')
    .replace(/,\s*$/, '')
  try {
    const parsed = JSON.parse(`{${cleaned}}`) as PPTConfig
    return Array.isArray(parsed.slides) ? parsed : null
  } catch {
    return null
  }
}

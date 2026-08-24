import type { PPTConfig } from '../types'
import { DOC_ID } from '../deck'

const DOC_BLOCK_RE = new RegExp(
  `<script type="application/json" id="${DOC_ID}">[\\s\\S]*?</script>`,
)

/**
 * 独立 HTML 导出（浏览器内）：fetch 单文件构建壳（dist-single 产物），
 * 用当前编辑的 doc 替换 #oh-my-ppt-doc 数据块，下载即得自包含可放映文件。
 *
 * 注意判定必须用「真块正则」而非字符串 includes——壳内联 JS 里也有
 * DOC_ID 字符串常量（deck.ts 编译产物），includes 会误判。
 */
export async function exportStandaloneHtml(doc: PPTConfig): Promise<void> {
  const candidates = ['shell.html', './shell.html', 'public/shell.html']

  let shell: string | null = null
  const failures: string[] = []
  for (const url of candidates) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        const text = await response.text()
        if (DOC_BLOCK_RE.test(text)) {
          shell = text
          break
        }
        failures.push(`${url}: 无有效数据块`)
      } else {
        failures.push(`${url}: HTTP ${response.status}`)
      }
    } catch (e) {
      failures.push(`${url}: ${e instanceof Error ? e.message : 'fetch 失败'}`)
    }
  }

  if (!shell) {
    throw new Error(
      `找不到单文件壳（尝试：${failures.join('；')}）。\n` +
        '请先执行 npm run build:single（自动生成 public/shell.html），\n' +
        '或通过 dev/静态站点访问编辑器（file:// 直开页面无法导出）。',
    )
  }

  const json = JSON.stringify(doc).replace(/</g, '\\u003c')
  const block = `<script type="application/json" id="${DOC_ID}">${json}</script>`

  const replaced = shell.replace(DOC_BLOCK_RE, block)
  if (!DOC_BLOCK_RE.test(replaced)) {
    throw new Error('数据块替换失败（内部错误）')
  }

  const blob = new Blob([replaced], { type: 'text/html' })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = `${doc.title || 'oh-my-ppt'}.html`
  anchor.click()
  URL.revokeObjectURL(href)
}

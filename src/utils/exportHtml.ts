import type { PPTConfig } from '../types'
import { DOC_ID } from '../deck'

/**
 * 独立 HTML 导出（浏览器内）：fetch 单文件构建壳（dist-single 产物），
 * 用当前编辑的 doc 替换 #oh-my-ppt-doc 数据块，下载即得自包含可放映文件。
 *
 * 壳来源优先级：
 *   1. 同源 ./shell.html（软链/拷贝的 dist-single 产物，部署时随站点分发）
 *   2. dev server 的 /dist-single/oh-my-ppt.html（vite publicDir 之外但 dev 可直访）
 * 数据块契约与 build-single.mjs 一致：明文 JSON、`<` 转义 \u003c。
 */
export async function exportStandaloneHtml(doc: PPTConfig): Promise<void> {
  // 壳来源：同源相对路径（dev 与 dist 部署都适用）；file:// 直开编辑器页则无法 fetch——提示走构建
  const candidates = [
    'shell.html',
    './shell.html',
    'public/shell.html',
  ]

  let shell: string | null = null
  const failures: string[] = []
  for (const url of candidates) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        const text = await response.text()
        if (text.includes(`id="${DOC_ID}"`)) {
          shell = text
          break
        }
        failures.push(`${url}: 壳缺少 ${DOC_ID} 数据块`)
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
        '请先执行 npm run build:single（会自动链接 public/shell.html），\n' +
        '或通过 dev/静态站点访问编辑器（file:// 直开页面无法导出）。',
    )
  }

  const json = JSON.stringify(doc).replace(/</g, '\\u003c')
  const block = `<script type="application/json" id="${DOC_ID}">${json}</script>`

  const replaced = shell.replace(
    new RegExp(`<script type="application/json" id="${DOC_ID}">[\\s\\S]*?</script>`),
    block,
  )
  if (replaced === shell || !replaced.includes(`id="${DOC_ID}"`)) {
    throw new Error('壳中未找到数据块，替换失败')
  }

  const blob = new Blob([replaced], { type: 'text/html' })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = `${doc.title || 'oh-my-ppt'}.html`
  anchor.click()
  URL.revokeObjectURL(href)
}

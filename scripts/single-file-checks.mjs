/**
 * 单文件产物的 HTML 骨架检查：只看标签本身，不扫 <script>/<style> 正文。
 * 内联包里的字面量（如 HyperFrames 模板的 `<script src=gsap>`）不算外链。
 */

/** 去掉 script/style 正文，留下开闭标签，避免正文里的 HTML 字面量误伤。 */
export function htmlSkeleton(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, openOnly)
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, openOnly)
}

function openOnly(block) {
  const gt = block.indexOf('>')
  const open = gt === -1 ? block : block.slice(0, gt + 1)
  const close = block.slice(-8).toLowerCase().startsWith('</style')
    ? '</style>'
    : '</script>'
  return `${open}${close}`
}

export function hasExternalScript(html) {
  return /<script\b[^>]*\bsrc\s*=/i.test(htmlSkeleton(html))
}

export function hasExternalStylesheet(html) {
  const links = htmlSkeleton(html).match(/<link\b[^>]*>/gi) ?? []
  return links.some(
    tag => /rel\s*=\s*(['"]?)stylesheet\1/i.test(tag) && /\bhref\s*=/i.test(tag),
  )
}

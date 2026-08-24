/**
 * build-single 后处理：把 deck JSON 注入为明文数据块，产出自包含单文件。
 * 契约：#oh-my-ppt-doc 块必须是明文 JSON、可正则提取、`<` 转义为 \u003c。
 */
import { readFileSync, writeFileSync, mkdirSync, symlinkSync, existsSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'
import { build } from 'esbuild'

const root = resolve(process.cwd())
const outDir = join(root, 'dist-single')
const outFile = join(outDir, 'oh-my-ppt.html')
const genDir = join(root, '.tmp-single')
const genFile = join(genDir, 'config.gen.mjs')

mkdirSync(genDir, { recursive: true })

// 1. 编译 config.ts 拿到 CONFIG 对象
const result = await build({
  entryPoints: [join(root, 'src/config.ts')],
  bundle: true,
  format: 'esm',
  write: false,
  outfile: 'config.gen.mjs',
})
writeFileSync(genFile, result.outputFiles[0].text)
const { CONFIG } = await import(genFile)

// 2. 读取 singlefile 构建产物
const htmlPath = join(outDir, 'index.html')
let html = readFileSync(htmlPath, 'utf8')

// 3. 注入明文 JSON 块（防 </script> 截断：转义 <）
const json = JSON.stringify(CONFIG).replace(/</g, '\\u003c')
const block = `<script type="application/json" id="oh-my-ppt-doc">${json}</script>`
if (html.includes('</head>')) {
  html = html.replace('</head>', `${block}\n</head>`)
} else {
  html = html.replace('<body>', `<head>${block}</head><body>`)
}
writeFileSync(outFile, html)

// 4. 校验
const final = readFileSync(outFile, 'utf8')
const checks = [
  ['doc block present', final.includes('id="oh-my-ppt-doc"')],
  ['no external script', !/<script[^>]+src=/.test(final)],
  ['no external stylesheet', !/<link[^>]+rel="stylesheet"[^>]+href=/.test(final)],
  ['json extractable', (() => {
    const match = final.match(
      /<script type="application\/json" id="oh-my-ppt-doc">([\s\S]*?)<\/script>/,
    )
    if (!match) return false
    try {
      const doc = JSON.parse(match[1])
      return Array.isArray(doc.slides) && doc.slides.length > 0
    } catch {
      return false
    }
  })()],
]
let ok = true
for (const [name, pass] of checks) {
  console.log(`${pass ? '✓' : '✗'} ${name}`)
  if (!pass) ok = false
}
const size = (final.length / 1024).toFixed(0)
console.log(`→ ${outFile} (${size} KB, ${CONFIG.slides.length} slides)`)

// 5. 刷新 public/shell.html 软链（编辑器「导出 HTML」运行时 fetch 的壳）
const shellLink = join(root, 'public/shell.html')
try {
  if (!existsSync(shellLink)) {
    symlinkSync(outFile, shellLink)
    console.log(`→ linked public/shell.html → ${relative(root, outFile)}（编辑器导出壳）`)
  }
} catch {
  /* 软链失败（如 Windows 无权限）不阻塞构建 */
}
process.exitCode = ok ? 0 : 1

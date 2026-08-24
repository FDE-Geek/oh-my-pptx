#!/usr/bin/env node
/**
 * oh-my-ppt → HyperFrames composition 导出
 *
 *   node scripts/export-hyperframes.mjs [单文件.html] [-o composition.html]
 *
 * 读单文件产物的 #oh-my-ppt-doc 数据块 → 生成 HyperFrames composition
 * （每页 iframe clip + GSAP seekable timelines）。
 * 输出与单文件同目录放置后：npx hyperframes preview / render。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const htmlArg = args.find(a => !a.startsWith('-')) ?? join(root, 'dist-single/oh-my-ppt.html')
const getOpt = (...names) => {
  for (const name of names) {
    const flag = name.length === 1 ? `-${name}` : `--${name}`
    const i = args.indexOf(flag)
    if (i >= 0) return args[i + 1]
  }
  return undefined
}
const outFile = getOpt('o', 'out') ?? 'composition.html'

if (!existsSync(htmlArg)) {
  console.error(`✗ 找不到 ${htmlArg}，先执行 npm run build:single`)
  process.exit(1)
}

// 编译 hyperframes.ts 导出器
const result = await build({
  entryPoints: [join(root, 'src/utils/hyperframes.ts')],
  bundle: true,
  format: 'esm',
  write: false,
  outfile: 'hf.gen.mjs',
})
const genDir = join(root, '.tmp-single')
const { mkdirSync } = await import('node:fs')
mkdirSync(genDir, { recursive: true })
const genFile = join(genDir, 'hf.gen.mjs')
writeFileSync(genFile, result.outputFiles[0].text)
const { toHyperframesComposition } = await import(genFile)

// 读 deck JSON
const html = readFileSync(htmlArg, 'utf8')
const match = html.match(/<script type="application\/json" id="oh-my-ppt-doc">([\s\S]*?)<\/script>/)
if (!match) {
  console.error('✗ 文件中没有 #oh-my-ppt-doc 数据块')
  process.exit(1)
}
const doc = JSON.parse(match[1].replace(/\\u003c/g, '<'))

const deckName = htmlArg.split('/').pop()
const composition = toHyperframesComposition(doc, { singleFileName: deckName })

writeFileSync(outFile, composition)
console.log(`✓ ${outFile}（${doc.slides.length} 页，HyperFrames composition）`)
console.log(`  使用：把 ${outFile} 与 ${deckName} 放同一目录，然后`)
console.log(`    npx hyperframes init hf-project && cp ${outFile} ${deckName} hf-project/ && cd hf-project && npx hyperframes render`)

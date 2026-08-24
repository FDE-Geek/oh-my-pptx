#!/usr/bin/env node
/**
 * oh-my-ppt TTS 预生成 CLI
 *
 *   node scripts/tts.mjs [deck.json|单文件.html|config 提取] [--voice zh-CN-XiaoxiaoNeural] [--out assets/narration]
 *
 * 读 deck 的每页 narration（缺省自动拼接），逐段生成 MP3 到输出目录，
 * 并打印每页对应的 narrationAudio 引用（相对路径），可直接贴进 config。
 *
 * 零 npm 依赖：Edge TTS 走 Node 22 原生 WebSocket。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const getOpt = (...names) => {
  for (const name of names) {
    const flag = name.length === 1 ? `-${name}` : `--${name}`
    const i = args.indexOf(flag)
    if (i >= 0) return args[i + 1]
  }
  return undefined
}
const source = args.find(a => !a.startsWith('-')) ?? join(root, 'src/config.ts')
const voice = getOpt('voice') ?? 'zh-CN-XiaoxiaoNeural'
const outDir = resolve(root, getOpt('out') ?? 'assets/narration')
const providerId = getOpt('provider') ?? 'edge'

// ── 读 deck ───────────────────────────────────────────────────
function loadDoc() {
  if (source.endsWith('.html')) {
    const html = readFileSync(source, 'utf8')
    const m = html.match(/<script type="application\/json" id="oh-my-ppt-doc">([\s\S]*?)<\/script>/)
    if (m) return JSON.parse(m[1].replace(/\\u003c/g, '<'))
    console.error('✗ 单文件中无数据块')
    return null
  }
  if (source.endsWith('.json')) {
    return JSON.parse(readFileSync(source, 'utf8'))
  }
  return null
}

let doc = loadDoc()
if (!doc && source.endsWith('.ts')) {
  // config.ts：esbuild 编译后 import
  const result = await build({
    entryPoints: [source],
    bundle: true,
    format: 'esm',
    write: false,
    outfile: 'config.gen.mjs',
  })
  const genDir = join(root, '.tmp-single')
  mkdirSync(genDir, { recursive: true })
  const genFile = join(genDir, 'config.gen.mjs')
  writeFileSync(genFile, result.outputFiles[0].text)
  doc = (await import(genFile)).CONFIG
}

if (!doc?.slides?.length) {
  console.error('✗ 读不到 slides')
  process.exit(1)
}

// ── narration 提取（与运行时 defaultNarration 同规则） ────────
function defaultNarration(slide) {
  const parts = []
  if (slide.type !== 'quote') parts.push(slide.title)
  switch (slide.type) {
    case 'cover': case 'section': case 'end':
      if (slide.subtitle) parts.push(slide.subtitle); break
    case 'content': parts.push(...(slide.bullets ?? [])); break
    case 'two-column':
      for (const c of [slide.left, slide.right]) { if (c?.title) parts.push(c.title); parts.push(...(c?.bullets ?? [])) }
      break
    case 'quote': parts.push(slide.quote); if (slide.author) parts.push(slide.author); break
    case 'table': parts.push(...(slide.rows ?? []).flat()); break
  }
  return parts.join('。')
}

const segments = []
doc.slides.forEach((slide, i) => {
  const text = slide.narration ?? defaultNarration(slide)
  if (text && text.length > 1) {
    segments.push({ text, file: `p${String(i + 1).padStart(2, '0')}.mp3`, page: i + 1 })
  }
})

if (segments.length === 0) {
  console.error('✗ 没有可合成的旁白（所有页都无 narration/标题）')
  process.exit(0)
}

console.error(`▶ ${segments.length} 段旁白 · 音色 ${voice} · 输出 ${relative(root, outDir)}`)

// ── Provider ──────────────────────────────────────────────────
const ttsGenDir = join(root, '.tmp-single', 'tts.gen.mjs')
mkdirSync(dirname(ttsGenDir), { recursive: true })
const ttsBundle = await build({
  entryPoints: [join(root, 'src/tts/edge.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  outfile: 'edge.gen.mjs',
})
writeFileSync(ttsGenDir, ttsBundle.outputFiles[0].text)
const { EdgeTtsProvider } = await import(ttsGenDir)

const provider = new EdgeTtsProvider()
const result = await provider.synthesize({
  segments: segments.map(s => ({ text: s.text, file: s.file })),
  voice,
  rate: 1,
  outDir,
})

for (const f of result.files) {
  const seg = segments.find(s => s.file === f)
  console.error(`  ✓ 第 ${seg.page} 页 → ${f}`)
}
for (const e of result.errors) {
  const seg = segments.find(s => s.file === e.file)
  console.error(`  ✗ 第 ${seg?.page} 页：${e.reason}`)
}

// 输出 config 引用片段
const refPath = relative(root, outDir).replace(/\\/g, '/')
const refLines = doc.slides.map((slide, i) => {
  const seg = segments.find(s => s.page === i + 1)
  return seg ? `  // 第 ${i + 1} 页：narrationAudio: '${refPath}/${seg.file}',` : null
}).filter(Boolean).join('\n')

writeFileSync(join(outDir, 'narration-refs.txt'), refLines + '\n')
console.error(`\n✓ 完成：${result.files.length} 成功 / ${result.errors.length} 失败`)
console.error(`  引用片段已写入 ${refPath}/narration-refs.txt（贴进 config 各页即可）`)
console.error(`  放映/录制将自动优先使用 narrationAudio（AudioMixer 混入录制音轨）`)

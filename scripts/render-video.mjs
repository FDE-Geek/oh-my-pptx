#!/usr/bin/env node
/**
 * oh-my-ppt 确定性渲染脚本（v0.7 实验性）
 *
 *   node scripts/render-video.mjs dist-single/oh-my-ppt.html -o out.mp4
 *
 * 流程：headless Chromium 逐页打开单文件 → 每页停留 duration 截图 PNG →
 *       ffmpeg 合成 H.264 MP4（帧率由每页停留时长推导）。
 * 依赖：系统安装了 chromium/chrome 与 ffmpeg（运行时探测，缺哪个提示哪个）。
 * 说明：无 TTS 音轨（浏览器 TTS 无法离屏截获）；旁白音频走后续版本。
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync, spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'

const args = process.argv.slice(2)
const htmlPath = args.find(a => !a.startsWith('-'))
const getOpt = (...names) => {
  for (const name of names) {
    const flag = name.length === 1 ? `-${name}` : `--${name}`
    const i = args.indexOf(flag)
    if (i >= 0) return args[i + 1]
  }
  return undefined
}
const outFile = getOpt('o', 'out') ?? 'oh-my-ppt.mp4'
const fps = Number(getOpt('fps') ?? 10)

if (!htmlPath || !existsSync(htmlPath)) {
  console.log(`用法: node scripts/render-video.mjs <单文件.html> [-o out.mp4] [--fps 10]

依赖: chromium / google-chrome（无头截图） + ffmpeg（合成）
说明: 每页按 deck autoplay.defaultDuration 停留，无旁白音轨。`)
  process.exit(htmlPath ? 1 : 0)
}

// ── 工具探测 ─────────────────────────────────────────────────
function findBinary(candidates) {
  for (const cmd of candidates) {
    const probe = spawnSync(cmd, ['--version'], { stdio: 'ignore' })
    if (probe.status === 0) return cmd
  }
  // which 兜底
  for (const cmd of candidates) {
    const which = spawnSync('which', [cmd], { encoding: 'utf8' })
    if (which.status === 0) return which.stdout.trim()
  }
  return null
}

const chrome = findBinary(['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable'])
if (!chrome) {
  console.error('✗ 未找到 chromium/google-chrome，请先安装（无头截图依赖）')
  process.exit(1)
}
const ffmpeg = findBinary(['ffmpeg'])
if (!ffmpeg) {
  console.error('✗ 未找到 ffmpeg，请先安装（视频合成依赖）')
  process.exit(1)
}

// ── 读 deck JSON（明文数据块契约） ────────────────────────────
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const html = readFileSync(htmlPath, 'utf8')
const match = html.match(/<script type="application\/json" id="oh-my-ppt-doc">([\s\S]*?)<\/script>/)
if (!match) {
  console.error('✗ 文件中没有 #oh-my-ppt-doc 数据块（请用 build:single 产物）')
  process.exit(1)
}
const doc = JSON.parse(match[1].replace(/\\u003c/g, '<'))
const pages = doc.slides.length
const stayMs = doc.autoplay?.defaultDuration ?? 3000
console.log(`▶ ${basename(htmlPath)}：${pages} 页 × ${stayMs}ms @ ${fps}fps → ${outFile}`)

// ── 逐页截图 ─────────────────────────────────────────────────
const shotDir = mkdtempSync(resolve(tmpdir(), 'omp-render-'))
const perPage = Math.max(1, Math.round((stayMs / 1000) * fps))
let index = 0
for (let page = 1; page <= pages; page++) {
  const url = `file://${resolve(htmlPath)}#${page}`
  for (let frame = 0; frame < perPage; frame++) {
    const shot = resolve(shotDir, `p${String(page).padStart(3, '0')}-f${String(frame).padStart(3, '0')}.png`)
    // 注：每帧重新加载成本高；无 CDP 驱动下这是零依赖的最简确定性方案。
    // 停留语义靠复制首帧实现（下一循环直接复制文件）。
    if (frame === 0) {
      execFileSync(chrome, [
        '--headless=new', '--disable-gpu', '--no-sandbox',
        '--window-size=1280,720', '--hide-scrollbars',
        `--screenshot=${shot}`, url,
      ], { stdio: 'inherit' })
    } else {
      const first = resolve(shotDir, `p${String(page).padStart(3, '0')}-f000.png`)
      execFileSync('cp', [first, shot])
    }
    index++
  }
  console.error(`  ✓ 第 ${page}/${pages} 页`)
}

// ── ffmpeg 合成 ──────────────────────────────────────────────
const listFile = resolve(shotDir, 'frames.txt')
writeFileSync(listFile, Array.from({ length: index }, (_, i) => {
  const page = String(Math.floor(i / perPage) + 1).padStart(3, '0')
  const frame = String(i % perPage).padStart(3, '0')
  return `file 'p${page}-f${frame}.png'`
}).join('\n') + '\n')

execFileSync(ffmpeg, [
  '-y', '-r', String(fps),
  '-f', 'concat', '-safe', '0', '-i', listFile,
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-vf', 'scale=1280:720',
  resolve(outFile),
], { stdio: 'inherit' })

console.log(`✓ ${outFile}（${pages} 页，${index} 帧）`)
console.log(`  帧目录（可清理）：${shotDir}`)

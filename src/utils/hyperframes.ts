import type { PPTConfig, Slide } from '../types'
import { slideNarration } from './narration'

/**
 * HyperFrames composition 导出器（借力路线：deck → HTML composition）。
 *
 * - 每页一个 <iframe class="clip" data-start data-duration>，src 指向
 *   build:single 产物 + `?embed=1&frame=1&start=N`（单页锁定渲染）
 * - 逐条动画（animation 显式时序 / step 均匀 500ms）→ GSAP seekable
 *   timeline 挂 window.__timelines（HyperFrames 逐帧 seek 驱动）
 * - duration 推导：slide.duration > narration 字数近似语速 > autoplay.defaultDuration
 *
 * 用法：产物 HTML 与单文件 deck 同目录，`npx hyperframes preview/render`。
 */

const DEFAULT_MS = 3000
/** 中文口播近似语速：4 字/秒（rate=1）；与 rate 成反比。 */
const CHAR_PER_SEC = 4

function slideDurationMs(slide: Slide, rate: number): number {
  if (slide.duration) return slide.duration
  const text = slide.narration ?? slideNarration(slide)
  if (text) return Math.max(1500, Math.round((text.length / (CHAR_PER_SEC * rate)) * 1000))
  return DEFAULT_MS
}

function esc(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** GSAP seekable 时间轴脚本：逐条入场（step/animation 页）。 */
function timelineScript(slide: Slide, clipId: string): string {
  const steps: { at: number; index: number }[] = slide.animation?.length
    ? slide.animation.map((item, i) => ({ at: item.at, index: item.index ?? i }))
    : slide.type === 'content' && slide.step
      ? (slide.bullets ?? []).map((_, index) => ({ at: 400 + index * 500, index }))
      : []

  if (steps.length === 0) return ''

  const lines = steps.map(
    ({ at, index }) =>
      `  tl.fromTo("#${clipId}w .omp-step-${index}", {opacity: 0, y: 24}, {opacity: 1, y: 0, duration: 0.4}, ${(at / 1000).toFixed(2)});`,
  )
  return `  (() => {
    const tl = gsap.timeline({ paused: true });
${lines.join('\n')}
    window.__timelines["${clipId}"] = tl;
  })();`
}

export interface HyperframesOptions {
  /** 内嵌的单文件 HTML 文件名（同目录引用，如 "oh-my-ppt.html"）。 */
  singleFileName?: string
  /** 画布尺寸（缺省 1920×1080）。 */
  width?: number
  height?: number
}

export function toHyperframesComposition(
  doc: PPTConfig,
  opts: HyperframesOptions = {},
): string {
  const width = opts.width ?? 1920
  const height = opts.height ?? 1080
  const deckFile = opts.singleFileName ?? 'oh-my-ppt.html'
  const rate = doc.narration.rate || 1

  let cursor = 0
  const plan = doc.slides.map((slide, index) => {
    const durationMs = slideDurationMs(slide, rate)
    const entry = { slide, index, startMs: cursor, durationMs, clipId: `page-${index + 1}` }
    cursor += durationMs
    return entry
  })
  const totalSec = (cursor / 1000).toFixed(3)

  const clips = plan
    .map(({ index, startMs, durationMs, clipId }) => {
      const sec = (ms: number) => (ms / 1000).toFixed(3)
      return `  <div
    id="${clipId}w"
    style="position:absolute;inset:0"
  >
  <iframe
    class="clip"
    id="${clipId}"
    data-start="${sec(startMs)}"
    data-duration="${sec(durationMs)}"
    data-track-index="${index === 0 ? 0 : 1}"
    src="${deckFile}?embed=1&frame=1&start=${index + 1}"
    style="width:${width}px;height:${height}px;border:0;transform-origin:top left;position:absolute;top:0;left:0"
  ></iframe>
  </div>`
    })
    .join('\n')

  const timelines = plan
    .map(({ slide, clipId }) => timelineScript(slide, clipId))
    .filter(Boolean)
    .join('\n')

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(doc.title)} — HyperFrames composition</title>
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
<style>
  html, body { margin: 0; background: #000; }
  #stage { position: relative; width: ${width}px; height: ${height}px; overflow: hidden; }
</style>
</head>
<body>
<div id="stage" data-composition-id="deck" data-start="0" data-width="${width}" data-height="${height}" data-duration="${totalSec}">
${clips}
</div>
<script>
  window.__timelines = window.__timelines || {};
${timelines}
</script>
</body>
</html>
`
}

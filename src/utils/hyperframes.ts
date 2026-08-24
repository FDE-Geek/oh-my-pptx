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

/** GSAP seekable 时间轴脚本：step 页的 iframe 内容不跨域可达，
 * 逐条动画在 deck 侧 frame 模式内自动按 animation 时序播放（见 frame 模式实现）。
 * 外层时间轴仅对"页面级"效果保留（当前无——保持结构供未来扩展）。 */
function timelineScript(_slide: Slide, _clipId: string): string {
  void _slide
  void _clipId
  return ''
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

  // 纯浏览器预览播放器：URL 带 ?preview 时启用（不影响 hyperframes render 的解析）
  const previewPlayer = `
  (function () {
    var docTitle = ${JSON.stringify(doc.title).replace(/</g, '\\u003c')};
    if (!/[?&]preview/.test(location.search)) return;
    var stage = document.getElementById('stage');
    var clips = Array.prototype.slice.call(stage.querySelectorAll('.clip'));
    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99;background:rgba(10,10,14,.92);color:#eee;font:13px/1.6 ui-monospace,monospace;padding:10px 14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap';
    var btn = function (label, onClick) {
      var b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = 'background:#61b0f1;color:#111;border:0;border-radius:6px;padding:4px 12px;cursor:pointer;font:inherit';
      b.onclick = onClick;
      return b;
    };
    var time = document.createElement('span');
    var title = document.createElement('span');
    title.textContent = docTitle + ' · ${doc.slides.length} 页 · ' + stage.getAttribute('data-duration') + 's';
    title.style.opacity = '0.6';
    var t = 0, playing = false, last = 0;
    var total = parseFloat(stage.getAttribute('data-duration'));
    function render() {
      clips.forEach(function (clip) {
        var s = parseFloat(clip.getAttribute('data-start'));
        var d = parseFloat(clip.getAttribute('data-duration'));
        var active = t >= s && t < s + d;
        clip.parentElement.style.visibility = active ? 'visible' : 'hidden';
        if (active) {
          var tl = window.__timelines[clip.id];
          if (tl) tl.pause(t - s);
        }
      });
      time.textContent = t.toFixed(1) + 's / ' + total.toFixed(1) + 's';
      bar.value = t;
    }
    var bar = document.createElement('input');
    bar.type = 'range'; bar.min = 0; bar.max = total; bar.step = 0.05; bar.value = 0;
    bar.style.cssText = 'flex:1;min-width:160px;accent-color:#61b0f1';
    bar.oninput = function () { t = parseFloat(bar.value); render(); };
    var playBtn = btn('▶', function () {
      if (!playing && t >= total) t = 0;
      playing = !playing;
      playBtn.textContent = playing ? '❚❚' : '▶';
      if (playing) last = performance.now();
    });
    wrapper.appendChild(playBtn);
    wrapper.appendChild(btn('⟲', function () { t = 0; render(); }));
    wrapper.appendChild(bar);
    wrapper.appendChild(time);
    wrapper.appendChild(title);
    document.body.appendChild(wrapper);
    // 缩放舞台适配窗口
    function fit() {
      var scale = Math.min(window.innerWidth / ${width}, (window.innerHeight - 48) / ${height});
      stage.style.transform = 'scale(' + scale + ')';
      stage.style.transformOrigin = 'top left';
      stage.style.position = 'absolute';
      stage.style.left = Math.max(0, (window.innerWidth - ${width} * scale) / 2) + 'px';
      stage.style.top = (48 + Math.max(0, (window.innerHeight - 48 - ${height} * scale) / 2)) + 'px';
    }
    window.addEventListener('resize', fit); fit();
    function loop(now) {
      if (playing) {
        t += (now - last) / 1000;
        last = now;
        if (t >= total) { t = total; playing = false; playBtn.textContent = '▶'; }
        render();
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    render();
  })();`

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
<script>
${previewPlayer}
</script>
</body>
</html>
`
}

import { describe, expect, it } from 'vitest'
import {
  hasExternalScript,
  hasExternalStylesheet,
  htmlSkeleton,
} from '../scripts/single-file-checks.mjs'

const gsapLiteral = '<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"><\\/script>'

describe('single-file-checks', () => {
  it('内联 JS 里的 script src 字面量不算外链', () => {
    const html = `<html><head><script type="module">const t=\`${gsapLiteral}\`</script></head></html>`
    expect(hasExternalScript(html)).toBe(false)
    expect(htmlSkeleton(html)).not.toContain('gsap')
  })

  it('head 里真正的 <script src> 要报', () => {
    const html = `<html><head><script src="./app.js"></script></head></html>`
    expect(hasExternalScript(html)).toBe(true)
  })

  it('无 src 的 module / json 数据块通过', () => {
    const html = `<html><head>
      <script type="application/json" id="oh-my-ppt-doc">{"slides":[]}</script>
      <script type="module">console.log(1)</script>
    </head></html>`
    expect(hasExternalScript(html)).toBe(false)
  })

  it('stylesheet：标签外链报、正文字面量不报', () => {
    expect(hasExternalStylesheet('<link rel="stylesheet" href="./a.css">')).toBe(true)
    expect(
      hasExternalStylesheet(
        `<html><head><script>const x='<link rel="stylesheet" href="./a.css">'</script></head></html>`,
      ),
    ).toBe(false)
  })
})

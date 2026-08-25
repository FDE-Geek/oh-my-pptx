import { createServer, type Server } from 'node:http'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const generate = resolve(root, 'scripts/generate.mjs')

const theme = {
  autoChange: true,
  changeByOS: true,
  changeByHour: false,
  hourDarkActive: '18:30',
  hourDarkInactive: '07:00',
}

function mockDeck(slideExtra: Record<string, unknown> = {}) {
  return {
    title: 'X',
    author: 't',
    narration: { enabled: false, lang: 'zh-CN', rate: 1 },
    autoplay: { enabled: false, defaultDuration: 3000 },
    theme,
    slides: [
      { type: 'cover', title: 'T', ...slideExtra },
      { type: 'end', title: 'Thanks', takeaways: ['记住'] },
    ],
  }
}

function startMock(deck: unknown): Promise<{ server: Server, url: string }> {
  const server = createServer((_req, res) => {
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(deck) } }],
    }))
  })
  return new Promise((resolveListen, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') {
        reject(new Error('no port'))
        return
      }
      resolveListen({ server, url: `http://127.0.0.1:${addr.port}/v1` })
    })
  })
}

function runGenerate(args: string[], env: NodeJS.ProcessEnv, stdinText?: string): Promise<{ stderr: string, stdout: string, code: number | null }> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [generate, ...args], {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', reject)
    child.on('close', code => resolveRun({ stderr, stdout, code }))
    if (stdinText !== undefined) child.stdin.end(stdinText)
    else child.stdin.end()
  })
}

describe('generate.mjs CLI', () => {
  it('不带 --ask 走 lintDeck：拼错字段报 unknown-key', async () => {
    const { server, url } = await startMock(mockDeck({ bullet: 'typo' }))
    try {
      const { stderr, code } = await runGenerate(
        ['接线验收', '--prompt', 'full-deck'],
        { OHMY_PPT_BASE_URL: url, OHMY_PPT_API_KEY: 'test', OHMY_PPT_MODEL: 'mock' },
      )
      expect(code).toBe(0)
      expect(stderr).toContain('unknown-key')
      expect(stderr).toContain('bullet')
      expect(stderr).not.toContain('lintBasic')
    } finally {
      server.close()
    }
  }, 20_000)

  it('diagram.flow 展开后落盘无 flow 键', async () => {
    const deck = {
      title: 'X',
      author: 't',
      narration: { enabled: false, lang: 'zh-CN', rate: 1 },
      autoplay: { enabled: false, defaultDuration: 3000 },
      theme,
      slides: [
        { type: 'cover', title: 'T' },
        {
          type: 'diagram',
          title: '链',
          notes: '目的：验收简写。转场：结束。',
          diagram: { flow: '@dir LR\ncfg[读配置] -> db[数据库]\ncfg -.-> db : 可选' },
        },
        { type: 'end', title: 'Thanks', takeaways: ['记住'] },
      ],
    }
    const { server, url } = await startMock(deck)
    try {
      const { stdout, stderr, code } = await runGenerate(
        ['简写验收', '--prompt', 'full-deck'],
        { OHMY_PPT_BASE_URL: url, OHMY_PPT_API_KEY: 'test', OHMY_PPT_MODEL: 'mock' },
      )
      expect(code).toBe(0)
      const out = JSON.parse(stdout)
      const diagram = out.slides.find((s: { type: string }) => s.type === 'diagram').diagram
      expect(diagram.flow).toBeUndefined()
      expect(diagram.nodes.map((n: { id: string }) => n.id)).toEqual(['cfg', 'db'])
      expect(diagram.edges.some((e: { dashed?: boolean }) => e.dashed)).toBe(true)
      expect(stderr).not.toContain('编译失败')
    } finally {
      server.close()
    }
  }, 20_000)

  it('flow 与 nodes 混写非 0 退出', async () => {
    const deck = {
      title: 'X',
      author: 't',
      narration: { enabled: false, lang: 'zh-CN', rate: 1 },
      autoplay: { enabled: false, defaultDuration: 3000 },
      theme,
      slides: [
        { type: 'cover', title: 'T' },
        {
          type: 'diagram',
          title: '混',
          diagram: {
            flow: 'a -> b',
            nodes: [{ id: 'a', x: 0, y: 0, label: 'a' }],
            edges: [],
          },
        },
        { type: 'end', title: 'Thanks', takeaways: ['记住'] },
      ],
    }
    const { server, url } = await startMock(deck)
    try {
      const { stderr, code } = await runGenerate(
        ['混写', '--prompt', 'full-deck'],
        { OHMY_PPT_BASE_URL: url, OHMY_PPT_API_KEY: 'test', OHMY_PPT_MODEL: 'mock' },
      )
      expect(code).not.toBe(0)
      expect(stderr).toContain('编译失败')
      expect(stderr).toContain('不能同时')
    } finally {
      server.close()
    }
  }, 20_000)

  it('--ask 注入澄清摘要与页数预算', async () => {
    const { server, url } = await startMock(mockDeck())
    try {
      const answers = ['tech-share', '内部技术分享', '15', '无', '无'].join('\n') + '\n'
      const { stderr, code } = await runGenerate(
        ['Rust 入门', '--ask', '--prompt', 'full-deck'],
        { OHMY_PPT_BASE_URL: url, OHMY_PPT_API_KEY: 'test', OHMY_PPT_MODEL: 'mock' },
        answers,
      )
      expect(code).toBe(0)
      expect(stderr).toContain('【需求澄清】')
      expect(stderr).toContain('内部技术分享')
      expect(stderr).toContain('目标 10 页')
    } finally {
      server.close()
    }
  }, 20_000)
})

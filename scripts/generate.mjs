#!/usr/bin/env node
/**
 * oh-my-ppt CLI 生成器
 *
 *   node scripts/generate.mjs "主题"                     # 默认模板 → 生成的 deck 存 stdout
 *   node scripts/generate.mjs "主题" -o deck.json         # 写入文件
 *   node scripts/generate.mjs "主题" --ask                # 可选：澄清五问后再生成
 *   OHMY_PPT_BASE_URL= OHMY_PPT_API_KEY= OHMY_PPT_MODEL= 环境变量配置端点
 *     - OpenAI 兼容： https://api.openai.com/v1 / sk-… / gpt-4o
 *     - Ollama 本地：  http://localhost:11434/v1 / ollama / qwen3:8b
 *   --prompt lightning-talk|data-review|tech-tutorial|full-deck
 *   --lint   生成后跑质量闸（默认开启；优先 lintDeck，失败降级 lintBasic）
 *
 * 零运行时 npm 依赖（Node 18+ 原生 fetch）；质量闸经 esbuild 编译 lint.ts。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stdin, stderr } from 'node:process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ── prompt 库（与 skill 共用同一份源码） ──────────────────────
const promptsModule = await import('../prompts/index.ts').catch(() => null)
const PROMPTS = promptsModule?.PROMPTS ?? (await loadPromptsFromSource())
const SCHEMA = promptsModule?.SCHEMA_BRIEF ?? ''

async function loadPromptsFromSource() {
  // Node 无 ts 加载器时退化为直接读源文件正则抽取（保底）
  const src = readFileSync(resolve(root, 'prompts/index.ts'), 'utf8')
  const ids = [...src.matchAll(/id: '([\w-]+)'/g)].map(m => m[1])
  return ids.map(id => ({ id, name: id, system: '', user: '' }))
}

// ── lint：esbuild 编译 lint.ts；失败降级 lintBasic ───────────
function lintBasic(deck) {
  const issues = []
  if (!deck || !Array.isArray(deck.slides) || deck.slides.length === 0) {
    issues.push('✗ deck.slides 为空或缺失')
    return issues
  }
  if (typeof deck.title !== 'string') issues.push('✗ 缺少 title')
  const known = new Set(['cover','section','content','two-column','quote','code','image','table','chart','diagram','end'])
  deck.slides.forEach((slide, i) => {
    if (!known.has(slide.type)) issues.push(`✗ 第 ${i+1} 页未知页型 ${slide.type}`)
  })
  const d = deck.slides.find(s => s.type === 'diagram')
  if (d) {
    const ids = new Set(d.diagram.nodes.map(n => n.id))
    for (const e of d.diagram.edges) {
      if (!ids.has(e.source) || !ids.has(e.target)) issues.push(`✗ diagram 边 ${e.source}→${e.target} 引用不存在节点`)
    }
  }
  return issues
}

async function loadLintDeck() {
  try {
    return await import('../src/utils/lint.ts')
  } catch {
    // 无原生 TS 加载时走 esbuild（与 export-hyperframes 同法）
  }
  try {
    const { build } = await import('esbuild')
    const result = await build({
      entryPoints: [join(root, 'src/utils/lint.ts')],
      bundle: true,
      format: 'esm',
      platform: 'node',
      write: false,
      outfile: 'lint.gen.mjs',
    })
    const genDir = join(root, '.tmp-generate')
    mkdirSync(genDir, { recursive: true })
    const genFile = join(genDir, 'lint.gen.mjs')
    writeFileSync(genFile, result.outputFiles[0].text)
    return await import(genFile)
  } catch (e) {
    console.error(`⚠ 完整质量闸不可用（lint.ts 编译失败），降级 lintBasic：${e.message}`)
    return null
  }
}

// ── 参数解析 ─────────────────────────────────────────────────
const args = process.argv.slice(2)
const topic = args.find(a => !a.startsWith('-'))
const getOpt = (...names) => {
  for (const name of names) {
    const flag = name.length === 1 ? `-${name}` : `--${name}`
    const i = args.indexOf(flag)
    if (i >= 0) return args[i + 1]
  }
  return undefined
}
const outFile = getOpt('o', 'out')
const promptId = getOpt('prompt') ?? 'full-deck'
const noLint = args.includes('--no-lint')
const ask = args.includes('--ask')

if (!topic) {
  console.log(`用法: node scripts/generate.mjs "主题" [-o 输出文件] [--prompt 模板id] [--ask] [--no-lint]

环境变量:
  OHMY_PPT_BASE_URL  OpenAI 兼容端点（缺省 http://localhost:11434/v1 即 Ollama）
  OHMY_PPT_API_KEY   API key（Ollama 填 ollama）
  OHMY_PPT_MODEL     模型名（缺省 qwen3:8b）

  --ask    生成前交互澄清五问（风格/受众/时长/素材/硬约束）；缺省不打断
  --no-lint  跳过质量闸

模板: ${PROMPTS.map(p => p.id).join(' | ')}`)
  process.exit(0)
}

const baseUrl = process.env.OHMY_PPT_BASE_URL ?? 'http://localhost:11434/v1'
const apiKey = process.env.OHMY_PPT_API_KEY ?? 'ollama'
const model = process.env.OHMY_PPT_MODEL ?? 'qwen3:8b'

const template = PROMPTS.find(p => p.id === promptId) ?? PROMPTS[0]
const system = template.system || SCHEMA

function formatQuestion(q) {
  let line = q.question
  if (q.options) line += ` [${q.options.join(' / ')}]`
  if (q.example) line += `（如：${q.example}）`
  if (q.hint) line += `（${q.hint}）`
  return `${line}\n> `
}

async function collectAnswers(questions) {
  const answers = {}
  if (stdin.isTTY) {
    const rl = createInterface({ input: stdin, crlfDelay: Infinity })
    for (const q of questions) {
      stderr.write(formatQuestion(q))
      answers[q.id] = await new Promise(resolve => {
        rl.once('line', line => resolve(line.trim()))
      })
    }
    rl.close()
    return answers
  }
  // 管道 / 测试：stdin 可能在开读前已写完并 EOF，先收齐再按序配对
  const queued = []
  for await (const line of createInterface({ input: stdin, crlfDelay: Infinity })) {
    queued.push(line)
  }
  for (const [i, q] of questions.entries()) {
    stderr.write(formatQuestion(q))
    answers[q.id] = (queued[i] ?? '').trim()
  }
  return answers
}

let minutes
let clarify = ''
if (ask) {
  const questions = promptsModule?.CLARIFY_QUESTIONS ?? []
  if (questions.length > 0) {
    const answers = await collectAnswers(questions)
    minutes = promptsModule?.parseMinutes?.(answers.duration)
    clarify = promptsModule?.formatClarifyBlock?.(answers) ?? ''
  } else {
    console.error('⚠ 澄清题库未加载，跳过 --ask')
  }
}

const user = promptsModule?.renderUserPrompt
  ? promptsModule.renderUserPrompt(template, topic, { minutes, clarify })
  : (template.user || '').replaceAll('{topic}', topic)

if (ask && clarify) console.error(`▶ 澄清摘要：\n${clarify}`)
if (ask && promptsModule?.pageBudget) {
  console.error(`▶ 页数预算: ${promptsModule.pageBudget(promptId, minutes).hint}`)
}

// ── 调用模型 ─────────────────────────────────────────────────
console.error(`▶ 模板: ${promptId} · 端点: ${baseUrl} · 模型: ${model}`)
console.error(`▶ 主题: ${topic}`)

let response
try {
  response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.7,
    }),
  })
} catch (e) {
  console.error(`✗ 无法连接 ${baseUrl}：${e.message}`)
  console.error('  提示：Ollama 用户先执行 ollama pull qwen3:8b；或设置 OHMY_PPT_BASE_URL 指向其他端点')
  process.exit(1)
}

if (!response.ok) {
  console.error(`✗ 端点返回 ${response.status}: ${(await response.text()).slice(0, 300)}`)
  process.exit(1)
}

const payload = await response.json()
let content = payload.choices?.[0]?.message?.content ?? ''

// 剥掉可能的 markdown 代码围栏
content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')

let deck
try {
  deck = JSON.parse(content)
} catch {
  console.error('✗ 模型输出不是合法 JSON。前 300 字符：')
  console.error(content.slice(0, 300))
  process.exit(1)
}

// 默认署名（用户未在主题里指定时）
const DEFAULT_AUTHOR = 'Abel-数字牧民'
if (!deck.author || deck.author === 'abel' || deck.author === 'Abel') {
  deck.author = DEFAULT_AUTHOR
}

// ── 质量闸 ───────────────────────────────────────────────────
if (!noLint) {
  const lint = await loadLintDeck()
  if (lint?.lintDeck && lint?.formatIssues) {
    const issues = lint.lintDeck(deck)
    console.error(lint.formatIssues(issues))
    if (issues.length > 0) {
      console.error('（继续输出，但建议修复后使用）')
    }
  } else {
    const issues = lintBasic(deck)
    if (issues.length > 0) {
      console.error('⚠ 质量闸发现问题：')
      for (const issue of issues) console.error('  ' + issue)
      console.error('（继续输出，但建议修复后使用）')
    } else {
      console.error('✓ 质量闸通过（lintBasic 降级）')
    }
  }
}

// ── 输出 ─────────────────────────────────────────────────────
const json = JSON.stringify(deck, null, 2)
if (outFile) {
  writeFileSync(outFile, json + '\n')
  console.error(`✓ 已写入 ${outFile}（${deck.slides.length} 页）`)
  console.error(`  下一步：导入编辑器微调，或替换 src/config.ts 后 npm run build:single`)
} else {
  process.stdout.write(json + '\n')
}

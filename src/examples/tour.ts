import type { PPTConfig } from '../types'

/**
 * 官方文档站 deck——用 oh-my-ppt 演示 oh-my-ppt。
 * 每个宣称的功能由该功能本身证明（借鉴 bento starter）。
 *
 * 切为当前放映内容：
 *   cp src/examples/tour.ts src/config.ts
 * 再 `npm run build:single` 即文档站单文件。
 */
/** 与 src/config.ts 同名导出，便于 `cp` 后直接作为当前 deck。 */
export const TOUR: PPTConfig = {
  title: 'oh-my-ppt 文档站',
  author: 'oh-my-ppt',
  themePreset: 'default',
  transition: 'fade',

  theme: {
    autoChange: true,
    changeByOS: true,
    changeByHour: false,
    hourDarkActive: '18:30',
    hourDarkInactive: '07:00',
  },

  narration: {
    enabled: false,
    lang: 'zh-CN',
    rate: 1,
  },

  autoplay: {
    enabled: true,
    defaultDuration: 2500,
  },

  slides: [
    {
      type: 'cover',
      title: 'oh-my-ppt',
      subtitle: '一份 HTML 文件，就是一场演示 · 官方文档站',
      tag: 'v1.0',
    },
    {
      type: 'section',
      title: '这份文档本身就是证明',
      items: [
        { title: '11 种页型', summary: '本导览全部用到，含 tag / TOC / takeaways' },
        { title: '算法主题', summary: 'OKLCH 种子色推导全套界面' },
        { title: '零依赖图表与高亮', summary: 'SVG 手绘 · 自研 tokenizer' },
        { title: '作者工作流', summary: 'config · CLI · skill · 质量闸' },
        { title: '从想法到成片', summary: 'TTS · 录制 · HyperFrames' },
      ],
    },
    {
      type: 'content',
      tag: '核心主张',
      title: '文件即软件',
      step: true,
      bullets: [
        '改 PPT = 改一个 config.ts',
        '构建产物是单个 HTML 文件',
        '放映 · 编辑 · 录屏全部内含',
        '无服务器 · 无安装 · 无锁定',
      ],
    },
    {
      type: 'two-column',
      title: '两种用法',
      left: {
        title: '写给作者',
        bullets: ['config 驱动 + git 管版本', 'AI 生成（CLI / skill / prompt 库）', '编辑器可视化微调'],
      },
      right: {
        title: '写给观众',
        bullets: ['双击 HTML 即可放映', '键盘导航 + 概览 + 演讲者视图', '右键菜单换主题'],
      },
    },
    {
      type: 'section',
      title: '页型与表达',
      subtitle: '11 种 type，一页一个观点',
    },
    {
      type: 'table',
      tag: 'schema',
      title: '页型速查',
      headers: ['type', '用来干什么'],
      rows: [
        ['cover / end', '开场与收束，end 可写 takeaways'],
        ['section', '章节过渡；items 做成 TOC'],
        ['content', '要点；step 逐条，layout 换版式'],
        ['two-column / table', '对比与明细'],
        ['chart / diagram', '趋势占比 · 流程架构'],
        ['code / image / quote', '证据、画面、金句'],
      ],
    },
    {
      type: 'chart',
      tag: '零依赖图表',
      title: '单文件体积演进（KB）',
      chart: {
        kind: 'bar',
        labels: ['v0.4', 'v0.5', 'v0.6', 'v0.7', 'v1.0'],
        series: [{ name: '产物体积', data: [276, 278, 279, 935, 958] }],
      },
    },
    {
      type: 'diagram',
      tag: 'X6 图示 · dagre',
      title: '从想法到视频',
      diagram: {
        layout: 'dagre',
        layoutDir: 'LR',
        nodes: [
          { id: 'idea', x: 0, y: 0, label: '想法', fill: '#61b0f1' },
          { id: 'gen', x: 0, y: 0, label: 'AI 生成 config' },
          { id: 'need', x: 0, y: 0, label: '需要人工把关？', shape: 'diamond' },
          { id: 'edit', x: 0, y: 0, label: '编辑器微调', shape: 'double-rect' },
          { id: 'deck', x: 0, y: 0, label: '单文件 deck' },
          { id: 'video', x: 0, y: 0, label: 'MP4 成片', fill: '#2e8a7a' },
        ],
        edges: [
          { source: 'idea', target: 'gen' },
          { source: 'gen', target: 'need' },
          { source: 'need', target: 'edit', label: '是' },
          { source: 'edit', target: 'deck' },
          { source: 'need', target: 'deck', label: '否' },
          { source: 'deck', target: 'video', label: 'HyperFrames' },
        ],
      },
    },
    {
      type: 'code',
      tag: 'config 驱动',
      title: '一页 PPT 就是一个对象',
      filename: 'config.ts',
      language: 'ts',
      code: `{
  type: 'content',
  tag: '核心主张',
  title: '文件即软件',
  step: true,
  bullets: ['改 config 即改 PPT', '产物是单个 HTML'],
  narration: '口播稿写这里，TTS 自动朗读',
}`,
    },
    {
      type: 'image',
      tag: 'image 页型',
      title: '舞台就是一张 16:9 的纸',
      src: '/tour-mark.svg',
      caption: '深色模式默认不反转舞台——校对者半夜也要看到纸是白的',
    },
    {
      type: 'section',
      title: '作者怎么写',
      subtitle: 'AGENTS.md 是唯一写作契约',
    },
    {
      type: 'content',
      tag: '写作守则',
      title: '六条写进质量闸',
      layout: 'card',
      bullets: [
        '一页一个观点，bullets ≤ 6 × 20 字',
        '每 4–6 页插一个 section',
        '对比 two-column，趋势 line，占比 pie',
        '旁白写完整口播句，≠ 屏幕字',
        '代码 ≤ 15 行，保持缩进',
        '中文全角标点，中英之间加空格',
      ],
    },
    {
      type: 'content',
      tag: 'AI 工具链',
      title: '生成 → 闸门 → 验证',
      step: true,
      bullets: [
        'npm run generate -- "主题"',
        'prompt 库 4 套模板共用',
        'lintDeck 跑结构性检查',
        'npm run build 必须零错误',
        'window.ohMyPpt.validate 可复验',
      ],
    },
    {
      type: 'table',
      tag: '放映操作',
      title: '快捷键速查',
      headers: ['键', '功能'],
      rows: [
        ['→ / 空格', '下一页（step 页先逐条）'],
        ['G / S / E', '概览 / 演讲者视图 / 编辑器'],
        ['F / P', '全屏 / 打印导出 PDF'],
        ['M / ? / 右键', '上下文菜单（主题 / 放映 / 录制）'],
      ],
    },
    {
      type: 'quote',
      quote: 'Talk is cheap. Show me the deck.',
      author: '把这句话放进 config，双击 HTML 就能放映',
    },
    {
      type: 'end',
      title: '现在轮到你了',
      subtitle: 'cp src/examples/tour.ts src/config.ts · 然后改成你的',
      takeaways: [
        '右键菜单可以换主题种子色',
        'E 进编辑器改造这份导览',
        '导出 HTML 分享给任何人——零依赖',
      ],
    },
  ],
}

/** `cp src/examples/tour.ts src/config.ts` 后 deck.ts 读的是 CONFIG。 */
export const CONFIG = TOUR

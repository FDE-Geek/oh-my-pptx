# oh-my-ppt 🎞️

**极简、优雅、可定制的 HTML 演示工具** —— 参照 [Bento](https://github.com/migueravila/bento) 的设计哲学打造：改 PPT 就是改一个配置文件，纯静态产物，随处分发。

一个 `config.ts` 定义整份演示文稿；一份 `oh-my-ppt.html` 单文件自带放映、编辑、配音、录屏全部能力——文件即软件。

## ✨ 特性

### 演示体验
- **11 种页型**：cover / section / content / two-column / quote / code / image / table / chart / diagram / end
- **零依赖图表**：手写 SVG 的 bar / line / pie，自动刻度、悬浮数值、主题适配
- **X6 图示页**：基于 AntV X6 的流程图/DAG 页型——config 存节点/边 JSON，编辑模式直接在画布上拖节点、拉连线、改属性
- **轻量代码高亮**：自研 tokenizer（关键字/字符串/注释/数字/函数），支持 js/ts/py/bash
- **逐条动画**：content 页 bullets 分步出现
- **切换动效**：fade / slide / zoom，全局或单页覆盖
- **概览模式**（`G`）：网格缩略全部页面，点击跳转
- **演讲者视图**（`S`）：当前页 + 下一页 + 备注 + 计时器，跨窗口实时同步
- **PDF 导出**（`P`）：打印样式，每页一张

### AI 成片
- **TTS 旁白**：每页可写口播稿（缺省自动拼接 title/bullets），按语言自动选音色
- **自动放映**：朗读完自动翻页，逐条动画自动展开
- **一键录制成片**：`getDisplayMedia + MediaRecorder` 全程录制，结束自动下载 webm

### 可视化编辑器（`E`）
- **三栏布局**：缩略图栏 + 表单栏 + 实时预览，左右可拖拽调宽
- **全页型表单**：10 种页型动态编辑（bullets 列表、图表数据、表格行列……）
- **拖拽排序 / 复制 / 删除页**，50 步撤销/重做
- **deck 设置**：标题、署名、主题种子色、动效、TTS 参数
- **导出**：可直接落盘的 `config.ts` 或 JSON

### 主题系统（算法驱动，非色表）
- **OKLCH 色彩科学**（移植自 okee-ui）：一个种子色推导 accent 族 + on-color（WCAG 2.1 对比度择优）
- **灰画布停点**（移植自 okee-ui）：bg/card 按百分比混入种子色，深浅主题各自气质
- **黄金比例间距**（借鉴 LiftKit）：`p-phi-md`/`gap-phi-xl` 语义 token，斐波那契自洽
- **主题设置菜单**：右键菜单内嵌 8 色板 + 深浅切换，实时生效
- **自动主题**：跟随 OS 或按时段（如 18:30 后深色）

### 单文件分发（bento 的灵魂）
- `npm run build:single` 产出自包含 `dist-single/oh-my-ppt.html`（约 276 KB）——JS/CSS 全内联，file:// 双击可开
- 文档数据在 `#oh-my-ppt-doc` 明文 JSON 块中，可正则提取、原地替换
- **AI round-trip**：`window.ohMyPpt.getDoc()` 导出 → 修改 → `window.ohMyPpt.loadDoc(json)` 热预览
- 单文件模式下演讲者视图经 `?speaker` 打开，跨窗口同步照常工作

## 🚀 快速开始

```sh
npm install
npm run dev        # http://localhost:5173
```

改内容 = 改 `src/config.ts`（热更新即时预览）。

```ts
slides: [
  { type: 'cover', title: '季度汇报', subtitle: '2026 Q2' },
  { type: 'content', title: '重点成果', step: true, bullets: ['用户增长 40%', 'NRR 达到 110%'] },
  { type: 'chart', title: '收入趋势', chart: { kind: 'line', labels: ['1月','2月','3月'], series: [{ name: '营收', data: [120, 150, 180] }] } },
  { type: 'end', title: 'Thanks' },
]
```

## ⌨️ 快捷键

| 键 | 功能 |
|---|---|
| `→` / `空格` | 下一页（或下一条） |
| `←` | 上一页 |
| `Home` / `End` | 首页 / 末页 |
| `F` | 全屏 |
| `G` | 概览模式 |
| `S` | 演讲者视图 |
| `E` | 编辑模式 |
| `P` | 打印导出 PDF |
| `Esc` | 关闭概览 / 停止放映 |
| **右键** | 上下文菜单（放映/录制/主题/编辑……） |

## 📦 构建

| 命令 | 产物 |
|---|---|
| `npm run build` | `dist/` 纯静态（可部署 GitHub Pages / 任意静态托管） |
| `npm run build:single` | `dist-single/oh-my-ppt.html` 自包含单文件 |

## 🏗️ 架构

```
src/
├── config.ts            # ★ 唯一内容入口——整份 deck
├── types.ts             # schema：所有页型字段定义
├── deck.ts              # 文档源优先级（preview > 数据块 > config）+ window.ohMyPpt API
├── theme/               # 算法层：OKLCH color-ramp + 灰画布 canvas 停点
├── hooks/
│   ├── useTheme.ts      # 种子色 → 运行时全套界面变量
│   ├── useDeck.ts       # 翻页/逐条/hash 定位/跨窗口同步
│   ├── useAutoPlay.ts   # 自动放映编排（朗读→翻页→录制收尾）
│   └── useEditorDoc.ts  # 编辑器状态机（增删改排序 + 撤销/重做）
├── components/
│   ├── slides/          # 10 种页型渲染组件
│   ├── charts/          # 零依赖 SVG 图表
│   ├── editor/          # 可视化编辑器（三栏 + 拖宽 + 表单）
│   └── …                # 右键菜单 / 概览 / 进度条 / 主题面板
└── utils/               # 高亮 / 旁白 / 录屏 / 导出 / 跨窗口通道
```

## 🛠️ 技术栈

| 层 | 选型 | 版本 | 说明 |
|---|---|---|---|
| 语言 | TypeScript | 5.x | strict 模式，`types.ts` 即内容 schema，类型报错 = 内容写错 |
| UI 框架 | React | 19 | 函数组件 + hooks，无 class、无第三方状态库 |
| 样式 | Tailwind CSS | 4 | `@theme` token 直出工具类；CSS 变量承载运行时主题 |
| 构建 | Vite | 8 | 双配置：常规构建 + `vite-plugin-singlefile` 单文件内联 |
| 图标 | lucide-react | — | 唯一运行时 UI 依赖，tree-shaking 按需打包 |
| 打包体积 | — | — | 单文件 ~276 KB（gzip 后可再压约 2/3），无图表/高亮等重依赖 |

### 关键技术决策

- **零依赖图表**：bar/line/pie 全部手写 SVG（`components/charts/`）——不引 recharts/echarts，主题变量直接生效于 stroke/fill
- **零依赖代码高亮**：自研正则 tokenizer + React 元素输出（`utils/highlight.tsx`），无 shiki/highlight.js 运行时，天然免疫 XSS
- **OKLCH 色彩科学**：`theme/color-ramp.ts` 内嵌 Björn Ottosson OKLab 完整数学（sRGB ↔ 线性 ↔ OKLab ↔ OKLCH），种子色 → dim/bright/on-color 全算法推导，WCAG 2.1 对比度择优，替代一切手写色表
- **画布停点混合**：`theme/canvas.ts` 用 sRGB 线性插值（等价 `color-mix(in srgb)`）把种子色按百分比混入底色，深浅主题各有一组停点
- **黄金比例间距**：`--spacing-phi-*` token（φ=1.618，基准 1rem），带 `phi-` 前缀避免劫持 Tailwind v4 的 `max-w-*` container 命名空间（真实踩过的坑）
- **跨窗口同步**：`BroadcastChannel` 主通道 + `localStorage` storage 事件兜底——file:// 协议下演讲者视图照样同步
- **Web APIs**：SpeechSynthesis（TTS）、getDisplayMedia + MediaRecorder（录屏）、File System 下载（导出）、Pointer Events（拖宽）、sessionStorage（会话级状态）

### 主题数据流

```
config.accent（种子 hex）
  → deriveAccentFamily()   OKLCH 亮度偏移 → accent / dim / bright / on-accent
  → deriveCanvas()         停点混合 → bg / card / outline / sfg
  → useTheme() 写入 <html> CSS 变量
  → Tailwind @theme inline → bg-accent / text-on-accent / … 工具类
```

换一个种子 hex，整套界面气质（含滚动条、菜单、图表配色）跟随变化。

**设计原则**：config 驱动、算法优于色表、零后端、AI 可读写（详见 [AGENTS.md](AGENTS.md)——AI 代理编辑规范与单文件 splice 契约）。

## 📄 许可

个人项目，仅供学习交流。

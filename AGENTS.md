# oh-my-ppt — AI Deck Authoring Guide

oh-my-ppt 的演示文稿由 `src/config.ts` 中的 `CONFIG` 对象完整定义。本文件是 AI 代理（Claude Code、Cursor、Aider 等）编辑这份文件的规范。

## 核心契约

- **改 PPT = 改 `src/config.ts`**，不改任何组件代码。
- `src/types.ts` 是唯一 schema，所有页型字段以它的 TypeScript 类型为准。
- 构建验证：`npm run build`（含 tsc 类型检查）。类型报错 = 内容写错，修 config 而不是修类型。

## 顶层结构

```ts
{
  title: string            // 文档标题与浏览器标签标题
  author: string           // 封面署名
  accent?: string          // 主题色 hex，如 '#61b0f1'
  themePreset?: string     // 主题预设 id：'tech-share'/'product-launch'/'academic'（整套换装：种子色+字体+密度+动效）
  transition?: 'fade' | 'slide' | 'zoom' | 'none'   // 全局切换动效
  theme: ThemeConfig       // 深浅色自动切换策略
  narration: NarrationConfig  // TTS 旁白（lang 如 'zh-CN'，rate 0.5–2）
  autoplay: AutoplayConfig    // 自动放映默认停留毫秒
  slides: Slide[]          // 幻灯片数组，顺序即页序
}
```

主题预设优先级：会话选色 > themePreset > accent > 缺省。DESIGN.md（OpenDesign 9 节 schema 子集：Palette/Typography/Voice）可经 `window.ohMyPpt.importDesignMd(md)` 解析为预设。

## 页型速查（slides 数组元素）

| type | 必填字段 | 可选字段 |
|---|---|---|
| `cover` | `title` | `subtitle` |
| `section` | `title` | `subtitle` |
| `content` | `title` | `bullets: string[]`、`step: true`（逐条出现）、`layout: 'center'/'card'`（版式） |
| `two-column` | `title, left, right` | 每列 `{ title?, bullets? }` |
| `quote` | `quote` | `author` |
| `code` | `title, code` | `language`（js/ts/py/bash）、`filename` |
| `image` | `title, src` | `caption` |
| `table` | `title, headers, rows` | — |
| `chart` | `title, chart` | `chart: { kind, labels, series }`，kind 为 `bar/line/pie` |
| `diagram` | `title, diagram` | `diagram: { nodes, edges }`，X6 图示（详见下） |
| `end` | `title` | `subtitle` |

所有页型共有可选字段：

- `notes` — 演讲者备注（Speaker 视图显示）
- `narration` — TTS 旁白文本；缺省时由 title/bullets 自动拼接
- `narrationAudio` — 旁白音频文件地址（优先于 TTS；录制时经 AudioMixer 混入视频音轨）
- `duration` — 自动放映停留毫秒（无旁白页生效）
- `animation` — 入场时间轴 `[{at: 毫秒, index?: 序号}]`，自动放映按毫秒逐条显示
- `transition` — 覆盖全局切换动效

## diagram 页型（X6 图示）

```ts
{
  type: 'diagram',
  title: '流程',
  diagram: {
    layout: 'dagre',        // 可选：声明后 x/y 可全写 0，放映时自动分层排列
    layoutDir: 'LR',        // TB 上下（缺省）/ LR 左右
    nodes: [
      { id: 'a', x: 0, y: 0, label: '开始', fill: '#61b0f1', shape: 'ellipse' },
      { id: 'b', x: 0, y: 0, label: '判断', shape: 'diamond' },   // 缺省 rect
      { id: 'c', x: 0, y: 0, label: '过程', shape: 'double-rect' },
    ],
    edges: [
      { source: 'a', target: 'b', label: '可选', dashed: true, arrow: false },
    ],
  },
}
```

- 节点：`id/label` 必填；`fill`（hex，同时作为描边色，字色 OKLCH 自动对比）、`shape`（`rect` 缺省 / `ellipse` / `diamond` 菱形判断 / `double-rect` 双框过程）可选
- 边：`source/target` 引用节点 id；`label/dashed/arrow`（缺省 true）/ `router`（`orth` 正交缺省 / `normal` 直线）可选
- 布局：`layout: 'dagre'` 时坐标自动计算（编辑器「自动布局 ↕/↔」按钮等价）
- 编辑模式选中该页时表单区变为 X6 画布：拖节点、从边缘拉连线、点选改属性（文字/填充/形状）

## 写作守则

1. **一页一个观点**：content 页 bullets 不超过 6 条，每条 ≤ 20 字。
2. **章节节奏**：每 4–6 页插一个 `section` 过渡页。
3. **数据页**：对比用 `two-column`，趋势用 `chart` (line)，占比用 `chart` (pie)，明细用 `table`。
4. **旁白 ≠ 屏幕文字**：有 `narration` 时写完整的口播句子；没有就保持缺省自动拼接。
5. **代码页**：`code` 字段用模板字符串，保持缩进；示例代码 ≤ 15 行。
6. **中文文案**标点用全角，中英之间加空格。

## 验证清单（AI 改完 config 后必做）

```sh
npm run build   # tsc + vite build，必须零错误
npm run dev     # 打开 http://localhost:5173 翻一遍全部页面
```

- 逐页检查：文字不溢出、图表数据非空、代码可读。
- `npm run dev` 热更新即时预览；`dist/` 为纯静态可部署产物。

## AI 生成工具链（v0.6+）

- **CLI**：`npm run generate -- "主题" --prompt tech-tutorial -o deck.json`——OpenAI 兼容端点（缺省 Ollama `qwen3:8b`），生成后自动质量闸
- **prompt 库**：`prompts/index.ts`（full-deck / lightning-talk / data-review / tech-tutorial）
- **质量闸**：`src/utils/lint.ts`——图表数据对齐、diagram 边引用、表格列数、bullets 超长、章节节奏等结构性检查；agent 生成 deck 后应心算过一遍同规则
- **skill**：`skills/oh-my-ppt/SKILL.md`——Claude Code 安装后按工作流生成
- **MP4 成片**：`node scripts/export-hyperframes.mjs` 或编辑器「MP4」按钮 → HyperFrames composition（每页 iframe clip + GSAP timelines）；与单文件 deck 同目录后 `npx hyperframes render` 出确定性 MP4
- **TTS 预生成**：`npm run tts`（`src/tts/` Provider 抽象：system/edge 可扩展云端）——Edge neural 音色（`--voice zh-CN-XiaoxiaoNeural` 等 8 个内置）逐页生成 MP3 到 `assets/narration/`，并在 `narration-refs.txt` 输出各页 `narrationAudio` 引用片段；放映/录制自动优先用音频文件（AudioMixer 混入录制音轨）

## 单文件分发（dist-single）

`npm run build:single` 产出自包含 `dist-single/oh-my-ppt.html`：JS/CSS 全部内联，文档数据在 `<script type="application/json" id="oh-my-ppt-doc">` 明文块中。

**不可破坏的契约**（改 build-single.mjs 或渲染入口时遵守）：

1. `#oh-my-ppt-doc` 块必须保持明文 JSON、同 id、可正则提取——这是 splice 契约，外部工具靠它原地换内容。
2. 序列化时 `<` 必须转义为 `\u003c`，绝不允许字面 `</script>` 进入数据块。
3. 运行时优先级：`sessionStorage 预览 > #oh-my-ppt-doc 块 > 内置 config.ts`。
4. `window.ohMyPpt.loadDoc(json)` 校验并热预览（存 sessionStorage 后刷新）；`window.ohMyPpt.getDoc()` 返回当前文档 JSON。AI round-trip：getDoc 导出 → 修改 → loadDoc 预览 → 满意后把 JSON 写回数据块或 config.ts。
5. 单文件模式下演讲者视图经 `?speaker` 查询参数打开（无独立 speaker.html）。

## 示例：生成一份 5 页最小 deck

```ts
slides: [
  { type: 'cover', title: '季度汇报', subtitle: '2026 Q2' },
  { type: 'content', title: '重点成果', step: true, bullets: ['用户增长 40%', 'NRR 达到 110%'] },
  { type: 'chart', title: '收入趋势', chart: { kind: 'line', labels: ['1月','2月','3月'], series: [{ name: '营收', data: [120, 150, 180] }] } },
  { type: 'quote', quote: '少即是多。', author: '密斯·凡德罗' },
  { type: 'end', title: 'Thanks' },
]
```

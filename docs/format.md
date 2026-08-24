# oh-my-ppt 文档格式规范（normative）

> 本文件是 oh-my-ppt deck 数据模型的规范。单文件构建产物中 `#oh-my-ppt-doc`
> 明文 JSON 块遵循此格式；`src/types.ts` 是它的 TypeScript 权威表达。
> **向后兼容承诺**：符合本规范的文件在未来的 oh-my-ppt 版本中永远可打开。

## 1. 顶层结构

```jsonc
{
  "title": "string（必填）文档标题，浏览器标签用",
  "author": "string（必填）封面署名",
  "accent": "#hex（可选）主题种子色",
  "themePreset": "default|tech-share|product-launch|academic（可选）主题预设",
  "transition": "fade|slide|zoom|none（可选）全局切换动效",
  "theme": {
    "autoChange": true, "changeByOS": true, "changeByHour": false,
    "hourDarkActive": "18:30", "hourDarkInactive": "07:00"
  },
  "narration": { "enabled": true, "lang": "zh-CN", "rate": 1 },
  "autoplay": { "enabled": true, "defaultDuration": 3000 },
  "slides": [ /* Slide[] 必填，顺序即页序 */ ]
}
```

## 2. 页型（11 种）

每种页型必有 `type` 字段；所有页型共享可选字段（§3）。

| type | 必填字段 | 可选字段（页型专属） |
|---|---|---|
| `cover` | `title` | `subtitle` |
| `section` | `title` | `subtitle`、`items: { title, summary? }[]`（有 items 时渲染为 TOC 目录页） |
| `content` | `title` | `bullets: string[]`、`step: boolean`、`layout: "left"\|"center"\|"card"` |
| `two-column` | `title, left, right` | 每列 `{ title?: string, bullets?: string[] }` |
| `quote` | `quote` | `author` |
| `code` | `title, code` | `language`、`filename` |
| `image` | `title, src` | `caption` |
| `table` | `title, headers, rows` | `headers: string[]`、`rows: string[][]` |
| `chart` | `title, chart` | `chart: { kind, labels, series }` |
| `diagram` | `title, diagram` | 见 §4 |
| `end` | `title` | `subtitle`、`takeaways: string[]`（结尾记忆点） |

chart 约束：`kind ∈ bar|line|pie`；每条 `series.data.length === labels.length`。

## 3. 页面共有可选字段

| 字段 | 类型 | 语义 |
|---|---|---|
| `tag` | string | 页眉面包屑（标题上方等宽小字，如 `§1 · 启动链路`） |
| `notes` | string | 讲者备注（Speaker 视图） |
| `narration` | string | TTS 旁白口播稿（缺省自动拼接 title/bullets） |
| `narrationAudio` | string | 旁白音频 URL（优先于 TTS；录制时经 AudioMixer 混入） |
| `duration` | number | 自动放映停留毫秒（无旁白页生效） |
| `animation` | `{at: number, index?: number}[]` | 入场毫秒时序（自动放映逐条驱动） |
| `transition` | string | 覆盖全局切换动效 |

## 4. diagram 页型

```jsonc
{
  "type": "diagram",
  "title": "string",
  "diagram": {
    "layout": "dagre",          // 可选；声明后 x/y 可全 0，渲染时自动分层
    "layoutDir": "TB|LR",       // 可选，缺省 TB
    "nodes": [{
      "id": "string（必填，图内唯一）",
      "x": 0, "y": 0,            // number（dagre 布局下可省为 0）
      "label": "string（必填）",
      "width": 140, "height": 44, // 可选
      "fill": "#hex",             // 可选：填充+描边，字色由 OKLCH 对比度推导
      "shape": "rect|ellipse|diamond|double-rect" // 可选，缺省 rect
    }],
    "edges": [{
      "source": "nodeId", "target": "nodeId",  // 必须引用存在的节点 id
      "label": "string", "dashed": true, "arrow": true,
      "router": "orth|normal"   // 可选，缺省 orth
    }]
  }
}
```

## 5. 单文件分发格式（splice 契约）

1. 产物为单一 HTML：JS/CSS 全内联，无外部请求，file:// 可开。
2. 文档数据在 `<script type="application/json" id="oh-my-ppt-doc">…</script>` 明文块中。
3. 块内 `<` 必须转义为 `\u003c`（禁止字面 `</script>` 进入数据块）。
4. 运行时优先级：`localStorage[oh-my-ppt:draft-doc]`（编辑草稿）> `sessionStorage[oh-my-ppt:preview-doc]` > 明文块 > 内置 config。草稿最高，避免编辑中的内容被底层数据覆盖。
5. `window.ohMyPpt` API：
   - `getDoc(): string` — 当前生效文档 JSON
   - `loadDoc(json): boolean` — 校验并热预览（写 sessionStorage 后刷新）
   - `importDesignMd(md): ThemePreset|null` — OpenDesign DESIGN.md 子集解析
   - `diffDocs(a, b): string` — 两份 deck 的文本化对比
   - `validate(json?): string` — 质量闸 JSON
   - `validateReport(json?): string` — 质量闸可读文本

## 6. 稳定性规则（实现方必须遵守）

- 读取方对**未知字段必须忽略**（前向兼容：未来版本可加字段）。
- 读取方对**未知页型 type 渲染为占位页**（不崩、不丢页码）。
- `slides` 至少 1 页；`chart.series` 空数组时渲染空态而非报错。
- URL 参数 `#N` 页码定位从 1 开始。

# 计划：X6 图工作台（专注模式升格）

> 状态：v2 已落地（2026-08-25）
> 落地核实：npm test 51/51；tsc 零错误；单文件壳 978KB（≤1.5MB）。浏览器：属性栏无 Graph 宿主；工作台画布 1410×831；Selection/Transform 挂上；边 dashed/router 写回草稿；检查器 Del 不删节点；Esc 只退工作台。
> 日期：2026-08-25
> 来源：AntV X6（https://github.com/antvis/x6，文档 https://x6.antv.antgroup.com/tutorial/about）
> 关联：diagram 页型 + 编辑器专注模式；非新版本号，v0.3 图示能力的增量
> 前置：侧栏不再塞可拖画布；图示只在专注模式编辑（已落地）
> 对照核实：`src/utils/diagram.ts`、`DiagramCanvas.tsx`、X6 3.1.8；`vitest.config.ts` 为 `environment: 'node'`
>
> v2 变更（开工前评审）：
> 1. 任务 1 单测拆纯函数 `edgeAttrsToSpec`——vitest node 挂不起 Graph（`getBBox`）
> 2. Selection 与 `selectedId` 合并为单一事实源（`selection:changed`，删自管 click）
> 3. 快捷键必须 focus-scoped；默认不用 Keyboard 插件，自管 keydown（零体积）
> 4. 验收 1 的表单入口化并入任务 2（SlideForm 不再整块嵌工作台）
> 5. `toSVG` 是内核能力，无需 export 插件（那个是 PNG/JPEG）；体积项划掉
> 时间重估：6–7h（原 5–6h）+ Selection 整合 + 表单入口化

## 1. 背景与动机

X6 是基于 HTML/SVG 的**图编辑引擎**（DAG / 流程 / ER / 血缘），不是通用矢量画板。我们已依赖 `@antv/x6` ^3.1.8，但只用了内核一截：

| 层 | X6 提供 | oh-my-ppt 现状 |
|---|---|---|
| 数据 | MVC，节点/边 JSON | 自有 `DiagramSpec`（简化、可 lint、可 AI 生成） |
| 渲染 | SVG Graph + 自定义 shape | `mountGraph`：4 种节点 + 连线 + 自管 dagre |
| 编辑配套 | 10+ 插件（框选、对齐线、变换、快捷键、物料栏、小地图…） | 专注模式：拖节点/拉线/缩放/平移；**无多选、对齐、节点缩放、边属性回写** |
| 导出 | `graph.toSVG()`（内核）/ PNG（export 插件） | 无——放映时现场挂 Graph |

两个具体痛点：

1. **边属性半残**：`graphToSpec`（`diagram.ts:333–349`）把 `dashed` / `arrow` / `router` 从旧 spec 按 source→target 合并，画布上改边等于写不回去。注释写明「画布交互不表达这些」——本轮要让画布表达并回写。
2. **编辑配套空**：一排节点无法对齐、无法框选、width/height 在 schema 里但 UI 不能拖。

「单独做成编辑器、便于单独编辑 SVG」的诉求，正确落点是**同应用里的图工作台**（专注模式升格），不是第二套产品、也不是任意 SVG 插画编辑。

已有、必须保住的机制（`DiagramCanvas.tsx`）：

- `fromGraph` / `epoch`：拖节点回流 spec 不重挂 Graph；撤销/自动布局/改 shape 才 `epoch++`
- 非专注态已是 idle 卡片（无 live X6）
- Esc 只关专注层，不退出编辑器

## 2. 目标与非目标

**目标**
1. 图页的**唯一编辑面**仍是专注模式（浮层铺满，不依赖 Fullscreen API）。
2. 把 X6 编辑配套接到工作台：框选 / 对齐线 / 节点缩放；删除与全选走 **focus-scoped 自管快捷键**（见 3.2）。
3. **边属性闭环**：label / dashed / arrow / router 从画布写回 `DiagramSpec`，不再靠旧边合并。
4. 可选：内核 `graph.toSVG()` 导出快照（下载或复制），**不替代** JSON spec，不进 `image.src`。
5. schema **不扩**（`types.ts` / `docs/format.md` 已有 width/height 与边字段）；体积守 1.5MB 预算。

**非目标**
- 不做通用 SVG 编辑器（路径笔、布尔运算、任意插画）。X6 不管这个。
- 不新开仓库 / 微前端 / 独立 HTML 产品。X6 已在单文件包里。
- 不把图导出成 `image` 页当主存储（AI/lint/主题会盲）。
- 不上 React/Vue/HTML 节点、群组嵌套、ER 端口系统。
- 不上 Stencil 物料栏、Minimap（图真大了再开，记 backlog）。
- 不上 X6 `History` 插件（避免与 deck `useEditorDoc` 两套撤销栈）。
- 不上 `@antv/x6-plugin-keyboard`（体积 + Del 误伤表单；用自管 keydown 代替）。
- 不上 `@antv/x6-plugin-export`（PNG/JPEG；本轮只要内核 `toSVG`）。
- 不改放映态契约：只读 `mountGraph(..., true)` + `resolveSpec`。
- 不为 Graph 集成开 jsdom/happy-dom（node 环境也过不了 `getBBox`；见 3.3）。

## 3. 设计方案

### 3.1 产品形态：同应用图工作台

```
属性栏（SlideForm 图页）              专注模式（图工作台）
──────────────────────              ─────────────────
标题 / notes / 讲稿                 顶栏：物料四形状 + 布局 + 缩放 + 退出
入口卡片（节点/边计数 + 按钮）  →    画布：X6 + Selection/Snapline/Transform
                                    右侧：选中节点或边的检查器
                                    Esc：只关工作台，不退出编辑器
```

**表单入口化（v2，并入任务 2）**

现码：`SlideForm` diagram 分支整块嵌 `DiagramCanvas`（`SlideForm.tsx:355`）。idle 卡片虽已在组件内，工作台仍是表单子树——检查器 input 与画布快捷键共享同一 React 树，Del 误伤风险更高。

改法：

- `SlideForm` 图页只渲染标题 / notes / 入口卡片（计数 +「进入专注模式」）。
- 工作台浮层由 `DiagramCanvas` 在 `focused` 时 `position:fixed` 挂到视口（或 portal 到 `EditorShell`），**不作为表单可拖控件**。
- 属性栏验收「没有可拖 X6」= 表单 DOM 里没有 Graph 宿主，只有入口。

可选入口（本轮可做、不强制）：`?diagram=<页码>` 启动后自动打开该页专注模式。仍读写当前 deck 的 `slides[i].diagram`。

不提供「另存为 .svg 再当图片页」的主路径。

### 3.2 插件清单（3 个插件 + 自管快捷键）

包：`@antv/x6-plugin-selection` / `snapline` / `transform`（以 X6 3.x 实际包名为准，接入时核对）。

| 能力 | 实现 | 回写 spec |
|---|---|---|
| Selection | 插件 | 单击 / 框选 / 多选；**唯一选中源**（见 3.4） |
| Snapline | 插件 | 坐标仍走 `node:moved` |
| Transform | 插件 | `width` / `height` |
| Del / ⌘A / 方向微调 | **自管 `keydown`**，不装 Keyboard 插件 | 删除选中；不 bind ⌘Z |

`mountGraph` 在 `readonly` 时不注册插件。工作台挂载后 `graph.use(...)`。

**快捷键必须 focus-scoped（v2）**

计划 v1 只防了 ⌘Z。更大的坑是 **Del**：编辑器表单或检查器里按 Del 删字符，若 Keyboard 插件全局监听会同时删节点。

默认方案（零体积）：

```ts
function isTypingTarget(el: EventTarget | null): boolean {
  return el instanceof HTMLElement && (
    el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' || el.isContentEditable
  )
}
// 工作台打开时 capture 监听；isTypingTarget(document.activeElement) 则放行
// 且仅当事件目标属于画布容器或工作台根（非 SlideForm 标题栏）才处理 Del/⌘A
```

若仍要 Keyboard 插件：必须绑画布容器 focus 态（`graph.bindKey` + 容器 `tabIndex`，失焦不响应）。本轮不采用，避免多一个包。

### 3.3 spec 回写：纯函数可测，Graph 不进 vitest

改 `src/utils/diagram.ts`：

抽出 **纯函数**（node 环境可测，不碰 Graph / DOM）：

```ts
/** X6 edge attrs + router 名 → DiagramEdgeSpec 的可变字段 */
export function edgeAttrsToSpec(
  attrs: { line?: { strokeDasharray?: string; targetMarker?: unknown } },
  router?: string,
): Pick<DiagramEdgeSpec, 'dashed' | 'arrow' | 'router'>
```

约定（与现 `mountGraph` 写出的 attrs 对齐）：

- `strokeDasharray` 有值 → `dashed: true`，否则省略 / false
- `targetMarker` 缺省或空 → `arrow: false`，有 marker → `arrow: true`（或缺省 true，与现创建边一致）
- `router === 'normal'` → `router: 'normal'`，其余（含 `orth` / 空）→ `orth` 或缺省

`graphToSpec` 对每条边：读 `edge.getAttrs()` / `edge.getRouter()`，调用 `edgeAttrsToSpec`，再拼 `source` / `target` / `label`（`edgeLabelText` 已是纯函数）。**禁止**「只按 source→target 抄旧边」。

- **节点**：已有 x/y/width/height/label/shape/fill；Transform 之后尺寸必须进 spec。
- **填充**：继续忽略 `var(--*)`，只持久化显式 hex。
- 工作台内拖节点 / 改检查器：**不重挂 Graph**（`fromGraph` 旗标，已有）；撤销/自动布局/改 shape 才 `epoch++`。

**单测范围（任务 1 / 验收 7）**：只测 `edgeAttrsToSpec` + `edgeLabelText`（若尚未覆盖）≥ 3 条。不 `new Graph()`。Graph 往返靠任务 7 浏览器手测。

检查器补边：选中边时可改 label、虚线、箭头、路由（orth/normal）。

### 3.4 选中态：单一事实源（v2）

现码两套即将打架：

| 源 | 位置 | 行为 |
|---|---|---|
| 自管 | `node:click` / `edge:click` / `blank:click` → `selectedId`（`DiagramCanvas.tsx:98–102`） | 单选；边 id 为 `source->target` |
| 插件 | Selection 的 `selection:changed` | 单击 + 框选，可多选 |

**只留一套**：`selectedId` / `selectedIds` **只从** `selection:changed` 取；删上述三条 click 监听。检查器：

- 0 个选中：隐藏
- 1 个节点：现有节点表单
- 1 条边：边表单（任务 3）
- 多个：只显示「已选 N 项」+ 删除，不拼检查器

删除按钮与 Del：对当前 selection 一次删完（节点及相连边）。隐性工作约 +0.5h，计入任务 2。

### 3.5 物料与布局（不引入 Stencil）

顶栏四个按钮对应已有 shape：`rect` / `ellipse` / `diamond` / `double-rect`。自动布局 ↕/↔ 保持，写回 `layout` + `layoutDir` + 坐标。

`specForEdit` 维持：仅当坐标全 0 且 `layout:'dagre'` 时套 dagre，避免重挂冲掉手排。

### 3.6 SVG 快照（可选、附属）

工作台「导出 SVG」调用 **内核** `graph.toSVG()`，浏览器下载 `diagram.svg`。

- 不装 `@antv/x6-plugin-export`（那是 PNG/JPEG，与体积无关）。
- 用途：贴文档、给不读 JSON 的人看一眼。
- **不是** round-trip 格式。再编辑仍打开 deck 的 diagram spec。
- 序列化时注意：主题 `var(--accent)` 需在导出前解析成当前计算色，否则 SVG 在 deck 外是空的。

### 3.7 体积与契约

- 单文件预算 ≤ 1.5MB（当前壳约 969KB）。三插件接入后 `npm run build:single`，超 1.2MB 先警告、超 1.5MB 必须砍插件或改按需。
- 体积优先砍 Transform；Selection + Snapline 留下。Keyboard / export **本来就不装**。
- `#oh-my-ppt-doc` splice 契约不变；`DiagramSpec` 字段不新增。
- 放映 / 缩略图继续只读 Graph，不加载插件。

## 4. 实施步骤

| # | 任务 | 产物 | 预估 |
|---|---|---|---|
| 1 | 抽出 `edgeAttrsToSpec`；`graphToSpec` 用它回写边；**纯函数单测**（不挂 Graph） | `src/utils/diagram.ts`、`tests/diagram.test.ts` | 1h |
| 2 | SlideForm 入口化（表单无 Graph 宿主）；工作台挂 Selection/Snapline/Transform；`selectedIds` 只听 `selection:changed`；readonly 零插件 | `SlideForm.tsx`、`diagram.ts` `mountGraph`、`DiagramCanvas.tsx` | 2h |
| 3 | 检查器：边选中可编辑；节点缩放后尺寸进 spec | `DiagramCanvas.tsx` | 1h |
| 4 | 顶栏四形状物料；自管 Del / ⌘A（`isTypingTarget` + 容器归属）；Esc 仍只退工作台 | `DiagramCanvas.tsx` | 0.75h |
| 5 | （可选）内核 `toSVG` 下载 + 导出前把 CSS 变量打成实色 | 工作台按钮 | 0.5h |
| 6 | 文档：AGENTS diagram 节、format 不改字段只补「工作台编辑」一句 | `AGENTS.md`、README | 0.3h |
| 7 | `build:single` 体积门禁；浏览器手测 Graph 往返（虚线/无箭头/normal 路由 + 框选删） | 验证记录 | 0.5h |

总计约 **6–7 小时**（含可选 SVG 导出则取上沿）。任务 2 含 Selection 整合 + 表单入口化（相对 v1 +0.5h 量级，整任务提到 2h）。

任务 1 必须先于 2：边写不回去，插件再多也半残。

## 5. 风险与对策

| 风险 | 对策 |
|---|---|
| 插件包名/API 与 X6 3.1 对不上 | 先读已装 `@antv/x6` 的 peer/docs，不预装一整套 plugin-* |
| 框选 + 拉线抢指针 | 拉线仍从节点边缘；框选仅空白处；对表写进工作台提示 |
| Transform 与自定义 diamond markup 打架 | diamond/double-rect 先只允许等比缩放；不行就这两形禁用 Transform |
| 自管 click 与 Selection 两套选中 | **禁止并存**：删 `node:click` 等，只信 `selection:changed` |
| Del 误删节点（表单/检查器在打字） | 不装 Keyboard 插件；`isTypingTarget` + 事件属于工作台画布才处理 |
| ⌘Z 被工作台吞掉 | 自管快捷键 **不 bind** undo/redo；⌘Z 继续 `useEditorDoc` |
| 三插件把单文件打过预算 | 砍 Transform（Selection + Snapline 优先） |
| `toSVG` 带 `var(--accent)` 在外部空白 | 导出前用 `getComputedStyle` 替换，失败则禁用按钮并提示 |
| 缩略图里只读 Graph 被插件污染 | 插件只在 `readonly===false` 的 mount 上 `use` |
| 任务 1「Graph 往返单测」在 node 落空 | 不测 Graph；测 `edgeAttrsToSpec`；往返改手测（验收 2 / 任务 7） |

## 6. 验收标准

1. 图页属性栏 **DOM 内没有 Graph 宿主**，只有标题/讲稿/入口卡片；进入专注模式画布约等于视口（回归：宿主 ≥ 1000×600，视口 1440 宽时）。
2. 夹具 spec：一条虚线边、一条无箭头边、一条 `router:'normal'`；工作台里改完退出，JSON 三字段仍在。**自动化**：`edgeAttrsToSpec` 覆盖这三种 attrs。**手测**：真实 Graph 改完再读 spec。
3. 框选两个节点 → Del → 两节点及相连边从 spec 消失；⌘Z 恢复（deck 撤销）。焦点在检查器「文字」input 时按 Del **只删字符、不删节点**。
4. 拖齐两个 rect，出现对齐线；松开后 x 或 y 相等（允许 ±1px）。
5. Transform 拉大节点，spec `width`/`height` 变化；放映页节点同步变大。
6. Esc 退出工作台，编辑器仍在；再 Esc 才回放映。
7. `npm test` 存量无回归；新增 **纯函数** 用例 ≥ 3（禁止为过验收去 `new Graph()`）。
8. `npm run build:single` 产物 ≤ 1.5MB；AGENTS 写明「图只在专注模式/工作台编辑」。

## 7. Backlog（本轮不做）

- Stencil 物料栏、Minimap
- X6 History（与 deck 撤销合并策略未定）
- `@antv/x6-plugin-keyboard` / `export`（已有替代）
- jsdom 下的 Graph 集成测（`getBBox` 不可靠）
- `?diagram=` 深链（任务表列为可选，不做也不挡验收）
- 独立仓库 / 通用 SVG 笔刷
- 图 → `image` 页管线
- React 自定义节点、群组、端口/ER
- Playwright 对工作台的溢出实测

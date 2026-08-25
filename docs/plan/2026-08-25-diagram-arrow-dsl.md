# 计划：diagram 箭头简写编译器（生成层）

> 状态：已落地（2026-08-25）
> 日期：2026-08-25
> 来源决策：`docs/decision/2026-08-25-keep-x6-over-infographic.md` v2
> 关联：`DiagramSpec` / `src/utils/lint.ts` / `scripts/generate.mjs` / `prompts/index.ts`
> 非新版本号：生成工具链增量，schema **落盘字段不扩**

## 1. 背景与动机

AI 写 diagram 必须吐完整 `nodes[]` + `edges[]`，字数长、id 对不齐，质量闸只能事后报 `diagram-dangling-edge`。Infographic 用箭头链降低生成成本，但引擎与契约不能换。

本轮只做：**生成入口允许简写，编译成现有 DiagramSpec 再落盘 / 再 lint。** 编辑器与放映仍只认 JSON 图。

## 2. 目标与非目标

**目标**
1. 纯函数 `compileDiagramFlow(src) → { spec } | { errors }`，vitest node 可测，不碰 Graph。
2. 模型可输出 `diagram.flow`（字符串）；`generate.mjs` 在 `lintDeck` **之前**编译并删掉 `flow`。
3. prompt / skill / AGENTS 写明：简写只是生成态；人手改 `config.ts` 仍写 nodes/edges。
4. 编译失败结构化报错（行号 + 片段），不把半残 spec 静默写下。

**非目标**
- 不把 `flow` 写入 `types.ts` / `docs/format.md` 落盘 schema（format 只补一句「生成可用简写」）。
- 不做 spec → 简写反编译（工作台改过的坐标/形状回写不了简写）。
- 不装 `@antv/infographic`，不新开 `infographic` 页型。
- 不实现 Infographic 全套缩进 DSL / 200 模板。
- 不改 `loadDoc` 流式预览。
- 编辑器不提供简写文本框（避免与画布双源）。

## 3. 设计

### 3.1 落盘契约不变

```
模型 JSON（允许多余字段 flow）
    → compile（generate / skill 手写时同等）
    → DiagramSpec（nodes/edges/layout）
    → lintDeck
    → 写入文件 / 导入编辑器
```

`config.ts` 与 `#oh-my-ppt-doc` **禁止**依赖 `flow`。tsc 类型里没有该字段；运行时若人手 JSON 带了 `flow`，导入工具可编译一次再剥掉（可选，见任务 4），编辑器保存不再写出。

同时存在非空 `flow` 与非空 `nodes` → **错误**（不猜谁赢）。

### 3.2 自研小语法（v1）

借鉴「`A -> B -> C[标签]`」，**不是** Infographic 语法超集。一行一句，`#` 行注释。

```
@dir LR                  # 可选；缺省 TB。隐含 layout: dagre
cfg[读配置]
cfg -> db -> swm
db -.-> swm : 失败重试   # 虚线 + 边标签
swm -- http              # 无箭头
judge{diamond} -> ok
ok(ellipse)
proc[[double-rect]]
```

| 形式 | 含义 |
|---|---|
| `id` / `id[标签]` | 声明或补标签（先出现的标签保留） |
| `id{diamond}` `id(ellipse)` `id[[double-rect]]` | 形状；可与 `[标签]` 连写：`j[判断]{diamond}` |
| `A -> B -> C` | 有向边链，默认有箭头 |
| `A -.-> B` | `dashed: true` |
| `A -- B` | `arrow: false` |
| `A -> B : 文案` 或 `A ->\|文案\| B` | 边 `label` |
| `@dir TB\|LR` | `layoutDir`；`layout` 恒为 `dagre` |
| `@fill id #hex` | 该节点 `fill`（可选，v1 就要，避免模型只会写链） |

**id**：`[A-Za-z_][A-Za-z0-9_-]*`。中文只进标签，不进 id（避免与全角标点打架）。

**坐标**：全部 `x:0 y:0`，交给已有 `layout:'dagre'`。

**v1 不做**：子图、端口、`router`、width/height、无向图除 `--` 以外的语义。

### 3.3 函数形状

```ts
export type FlowError = { line: number; message: string; snippet?: string }

export function compileDiagramFlow(src: string):
  | { ok: true; spec: DiagramSpec }
  | { ok: false; errors: FlowError[] }
```

放 `src/utils/diagram-flow.ts`（与 `diagram-spec.ts` 一样零 X6 依赖）。`expandDiagramSlide(slide)`：若无 `flow` 原样返回；有则编译并返回剥掉 `flow` 的 slide。

### 3.4 生成接线

`scripts/generate.mjs`：`JSON.parse` 之后、署名修补之后、`lintDeck` 之前：

```
for slide of deck.slides:
  if slide.type==='diagram' && typeof slide.diagram?.flow === 'string':
    编译；失败则打印 errors 并以非 0 退出（比「写出再让 lint 报空图」更早）
```

prompt：`SCHEMA_BRIEF` 的 diagram 行改为「优先 `flow` 简写，编译器会展开；不要 flow 与 nodes 混写」。`QUALITY_RULES` 加一条：简写 id 只含 ASCII。

skill / AGENTS：生成 diagram 用简写；写入 config 前必须已是 nodes/edges。

### 3.5 体积与契约

零新依赖。单文件体积不变（编译器只进 CLI/工具链；若被 `src/` 误 import 进编辑器包，任务 4 要保证 **只有 generate 路径引用**，或接受 ~几 KB 进包——优先不进编辑器 bundle）。

## 4. 实施步骤

| # | 任务 | 产物 | 预估 |
|---|---|---|---|
| 1 | 语法实现 + ≥ 8 条单测（链、虚线、无箭头、标签、形状、@dir、混写错误、坏 id） | `src/utils/diagram-flow.ts`、`tests/diagram-flow.test.ts` | 2h |
| 2 | `generate.mjs` 编译失败退出；夹具 mock 一条 flow 图 | `scripts/generate.mjs`、`tests/generate-cli.test.ts` | 0.75h |
| 3 | `SCHEMA_BRIEF` / `QUALITY_RULES` / skill / AGENTS | `prompts/index.ts`、`skills/…/SKILL.md`、`AGENTS.md` | 0.5h |
| 4 | format 一句「生成可用简写，落盘必须 nodes/edges」；确认编辑器不 import flow | `docs/format.md` | 0.2h |

总计约 **3.5h**。不要按「100 行」排期。

## 5. 风险

| 风险 | 对策 |
|---|---|
| 模型仍吐完整 JSON（忽略 flow） | 合法；无 flow 则跳过。prompt 写「优先 flow」即可 |
| 模型混写 flow + nodes | 硬错误，不猜 |
| 简写覆盖不了 fill/shape，生成图变灰块 | v1 带 `{shape}` 与 `@fill`；缺省 rect 可接受 |
| 编译器被打进单文件 | 只从 `scripts/generate.mjs` 动态 import；编辑器/放映不引用 |
| 语法爬行成第二套 schema | 冻结 v1 表；新符号另开计划 |
| 与 Infographic 语法混淆 | 文档写「自研、非 Infographic 超集」 |

## 6. 验收

1. `compileDiagramFlow('a[甲] -> b[乙] -.-> c')` 得到 3 节点 2 边，第二条 `dashed: true`，`layout:'dagre'`。
2. `a -- b` → `arrow: false`。
3. `j[判断]{diamond}` → `shape:'diamond'`。
4. 同时有 `flow` 与 `nodes` → `ok: false`。
5. mock CLI：模型只输出 `flow` 字符串，写出的 JSON **没有** `flow` 键，lint 零 error。
6. `npm test` 存量无回归；`npx tsc --noEmit` 零错误（types 未加 `flow`）。
7. 编辑器打开生成稿：图工作台仍能拖、边属性仍回写。

## 7. Backlog

- spec → 简写（仅当坐标全 0 且无手改形状？语义窄，慎做）
- 导入 JSON 时若残留 `flow` 则编译一次
- `infographic` 页型 / 装 `@antv/infographic`（决策 §3 观察项）
- `loadDoc` 流式预览
- `router` / 节点宽高进简写

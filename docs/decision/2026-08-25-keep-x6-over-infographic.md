# 技术评估：弃用 X6 改用 AntV Infographic 是否合理

> 状态：已决策——**不弃用；分层共存**（v2 勘误后仍成立）
> 日期：2026-08-25
> 评估人：opencode（glm-5.3）
> 独立复评：Cursor Grok（2026-08-25）——结论维持，若干证据改写
> 触发：用户提议"放弃 X6，改用 antvis/Infographic"
> 关联：docs/plan/2026-08-25-x6-diagram-workbench.md（已落地）、docs/plan/2026-08-25-diagram-arrow-dsl.md（编译器，草案）、MEMO.md（@antv/layout 前科）
>
> v2 勘误（复评）：
> 1. Infographic **有** `editable: true` 二次编辑（拖块/改字/缩放/命令栈），不是「没有画布」；它仍不是 DAG 图工作台
> 2. §5 条件 2 收紧为「图模型级编辑 + 双向持久化」，避免把模板编辑器当成已满足
> 3. 体积写清口径：`dist-single/oh-my-ppt.html` 978KB / `public/shell.html` 约 1011KB；未实测不得写「超余量一两倍」
> 4. 编译器不是「~100 行零成本」；DSL 只在 generate 入口，落盘仍是 DiagramSpec
> 5. 新页型 `infographic` 降为观察 backlog，本轮不装包
> 6. `@antv/layout` 是供应链/体积风险，不是会再踩 `DagreLayout.execute` 空返回

## 0. 结论速览

**不合理。保留 X6 作为 diagram 页的编辑/渲染引擎。** Infographic 可取的是「生成层简写」和「流式渲染」思路，用自研编译器吸收前者；不换引擎。

换引擎会拆掉对岗的三样（图工作台 / DiagramSpec 契约 / `--accent` 主题），只换来生成体验。生成体验不必换引擎。

岗位判断：diagram 要的是**可编辑 DAG**，不是 200 套信息图模板。后者更接近 VERSION.md 划给 OpenDesign 的「全品类设计」，不是本页型升级。

## 1. 两个项目是什么

| | @antv/x6（现有） | @antv/infographic（候选） |
|---|---|---|
| 定位 | **图编辑引擎**（DAG/流程/ER/血缘）——画布 + 交互 + MVC | **声明式信息图引擎**——DSL → 预设模板排版 |
| 版本 | 3.1.8（生产成熟） | **0.2.20**（2025-09 建仓，不满一岁） |
| 热度 | 长期生态 | ~6.4k stars（热度，非沉淀） |
| 编辑 | 图工作台：任意节点/边、拉线、框选、对齐、Transform、边属性回写 | **有**内置编辑器（`editable: true`：拖元素、框选、缩放、双击改字、命令撤销、EditBar）。品类是**模板画板二次微调**，不是任意 DAG |
| 数据 | 自有 DiagramSpec JSON（可 lint、可 AI 契约、进格式规范） | 自有缩进 DSL（流式友好；与我们的 spec 单向） |
| 布局 | 自管 dagre（直调底层库，同步 API） | 预设模板名选布局 |
| 依赖 | 已在包内 | d3 + roughjs + linkedom + postcss + **@antv/layout ^2.0.0-beta.0** |
| 主题 | `var(--accent)` / OKLCH 种子，明暗实时变 | `ThemeConfig`（`colorPrimary` / palette）；**不吃外部 CSS 变量**（可单向灌色，不能实时跟 token） |

## 2. 五个不能换的理由

### 2.1 品类错位：它的编辑器替代不了图工作台

Infographic 的主路径仍是「选模板 → 填列表数据 → 渲染」。`editable: true` 让人在**已经排好的信息图**上挪块、改字、改色，不是拉一条新边、加一个 diamond 判断节点、dagre 重排、把 `dashed`/`router` 写回 JSON。

我们刚验收的图工作台（Selection / Snapline / Transform / 边属性闭环 / 检查器 / SVG 快照）服务的是后一类。换过去不是「编辑能力升级」，是换成另一种图种。

### 2.2 契约与生态：DiagramSpec 是一等公民

- `docs/format.md` 收录 diagram 页型（nodes/edges/约束）
- lint：`diagram-dangling-edge` / `diagram-dup-id` / `diagram-empty`；`window.ohMyPpt.validate` 覆盖
- AI 工具链（prompt / skill / CLI）以 DiagramSpec JSON 为**落盘**契约
- HyperFrames、`exportStandaloneHtml` splice、编辑器撤销栈——消费同一 spec

把存储改成 Infographic DSL = 五条链重写，语法错误更晚发现。JSON 至少有 parse + lint +（人手写时）tsc。

### 2.3 成熟度：0.2.x + beta 依赖

- 0.x 无稳定性承诺
- 依赖 `@antv/layout ^2.0.0-beta.0`：我们卸过它（MEMO #6：`DagreLayout.execute` 对 G6 模型，不更新不返回）。**风险是包体和破坏性升级**，不是我们会再直接调那个 API
- linkedom + postcss 进浏览器包，体积未测

### 2.4 体积预算：1.5MB 红线

口径（2026-08-25）：`dist-single/oh-my-ppt.html` **978KB**；编辑器导出壳 `public/shell.html` **约 1011KB**。预算余量大约 0.5MB。

d3 全量 + roughjs + 资源**没有 tree-shaking 实测**。正确说法：先测增量，超 300KB 或顶破 1.5MB 就不能进主包。X6 成本已经付过。

### 2.5 主题体系对不齐

accent → OKLCH 推导、diagram 描边/字色跟 `var(--accent)`，换种子/明暗即时变。Infographic 用 `colorPrimary`。可以在渲染前灌一次种子色，做不到 CSS 变量级联动。接进来等于两套上色路径。

## 3. 想换的动机，拆开看

| 诉求 | Infographic | 不换引擎的解法 |
|---|---|---|
| AI 写 nodes+edges 啰嗦、悬空引用 | 箭头/缩进 DSL | **生成层箭头简写 → 纯函数编译成 DiagramSpec**（见计划）。落盘无 DSL。工作量按接线+单测估，不是「100 行关账」 |
| 时间线/四象限/SWOT 排版 | ~200 模板 | **观察 backlog**：若真要做，才考虑新页型 + dynamic import。本轮不装 `@antv/infographic` |
| 生成过程可视化 | 流式 chunk 渲染 | 独立体验（`loadDoc` 流式预览）。**不是**否决换引擎的必要条件 |

没有一条必须换引擎。

## 4. 决策：分层共存

```
生成层：  箭头简写（自研小语法，借鉴「A -> B -> C[标签]」）
              ↓ 纯函数编译（只在 generate / skill 落盘前）
数据层：  DiagramSpec JSON     ← config.ts / #oh-my-ppt-doc / 编辑器只认这个
编辑层：  X6 图工作台
渲染层：  X6 mountGraph（--accent）
```

硬约束：**`config.ts` 与明文数据块不收 DSL。** 人和模型若两套语言，工作台一改就回不去。

## 5. 若未来重评，满足什么条件再换

满足**两条以上**再议（条件 2 已按复评收紧）：

1. Infographic 发布 **1.0** 且有 API 稳定承诺
2. **图模型级**编辑：任意增删节点/边，状态双向写回可 lint 的图 JSON（或官方 X6 互操作）。仅有模板画板二次微调**不算**满足
3. 支持外部 CSS 变量，或等价于我们的 OKLCH 种子实时跟随
4. 依赖瘦身（d3 按需、去掉 beta）且**实测**单文件增量 ≤ 300KB
5. 我们的 diagram 需求收敛为纯展示（编辑场景消失）

按收紧后的 2：当前仍是 0/5。

## 6. 本轮行动项

| # | 行动 | 状态 |
|---|---|---|
| 1 | 本文档归档（docs/decision/ 首篇） | ✅ |
| 2 | 箭头简写编译器计划 | ✅ `docs/plan/2026-08-25-diagram-arrow-dsl.md` |
| 3 | Infographic 观察清单（1.0 / 图模型编辑 / 主题变量 / 体积实测） | ✅ MEMO |

## 附：数据核实记录

- `npm view @antv/infographic`：0.2.20；依赖含 d3@^7.9.0、roughjs、linkedom、postcss、@antv/layout@^2.0.0-beta.0
- GitHub：antvis/Infographic created 2025-09-11；README 写明内置编辑器 + `editable: true`（2026-08-25）
- 本仓：X6 3.1.8；图工作台已落地；测试 55（工作台落地时 51，其后加 diagram-spec / single-file-checks）；单文件 978KB / 壳约 1011KB / 预算 1.5MB

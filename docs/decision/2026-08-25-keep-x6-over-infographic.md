# 技术评估：弃用 X6 改用 AntV Infographic 是否合理

> 状态：已决策——**不弃用；分层共存**
> 日期：2026-08-25
> 评估人：opencode（glm-5.3）
> 触发：用户提议"放弃 X6，改用 antvis/Infographic"
> 关联：docs/plan/2026-08-25-x6-diagram-workbench.md（图工作台，已落地）、MEMO.md（@antv/layout 前科）

## 0. 结论速览

**不合理。建议保留 X6 作为 diagram 页的编辑/渲染引擎，把 Infographic 的可取设计（箭头简写 DSL、流式渲染）作为增量吸收，而非引擎替换。**

一句话：换引擎 = 三样全弃（图工作台投资 / JSON 契约 / 主题体系）换一样（DSL 生成体验），而那一样可以用 ~100 行编译器零成本拿到。

## 1. 两个项目是什么

| | @antv/x6（现有） | @antv/infographic（候选） |
|---|---|---|
| 定位 | **图编辑引擎**（DAG/流程/ER/血缘）——画布 + 交互 + MVC | **声明式信息图引擎**——DSL 文本 → 排版好的预设模板 |
| 版本 | 3.1.8（生产成熟） | **0.2.20**（2025-09 建仓，不满一岁） |
| 热度 | 长期生态 | 6.4k stars（热度，非沉淀；20 open issues） |
| 编辑 | 拖节点/拉线/框选/对齐/Transform——我们已建成图工作台 | ❌ 不可拖拽编辑；改图 = 改 DSL 文本重新渲染 |
| 数据 | 自有 DiagramSpec JSON（可 lint、可 AI 契约、进格式规范） | 类 Mermaid DSL（流式友好，但单向） |
| 布局 | 自管 dagre（我们直调底层库，同步 API） | 预设模板（dagre-flow-tb 等，模板名选布局） |
| 依赖 | 已在包内（含我们已付的成本） | d3 全量 + roughjs + linkedom + postcss + **@antv/layout ^2.0.0-beta.0** |
| 主题 | 吃我们的 `--accent` CSS 变量体系（OKLCH 推导、明暗适配） | 自带 theme 块；不接外部变量体系 |

## 2. 五个不能换的理由

### 2.1 定位错位：它不是编辑器，替代不了图工作台

Infographic 的产品形态是"选模板 → 填数据 → 渲染"，**没有画布**。而我们上周刚验收图工作台：Selection 框选、Snapline 对齐、Transform 缩放、边属性闭环（attrs ↔ spec 双向回写）、检查器、SVG 快照——51 项测试。

换过去意味着这整套**可编辑性投资清零**，编辑体验从"可视化画布"倒退为"改文本重生成"。这不是升级，是范式降级。

### 2.2 契约与生态：DiagramSpec 是一等公民

- `docs/format.md` normative 规范收录 diagram 页型（nodes/edges/约束/稳定性规则）
- lint 质量闸有 `diagram-dangling-edge`/`diagram-dup-id` 检查码；`window.ohMyPpt.validate` 覆盖
- AI 生成工具链（prompt 库 / skill / CLI）全部以 DiagramSpec JSON 为输出契约
- HyperFrames composition、`exportStandaloneHtml` splice、编辑器撤销栈——全部消费同一 spec

改 DSL 意味着**五条消费链全部改写**，且 DSL 的语法错误只能运行时发现（JSON 至少 tsc/parse 双保险）。

### 2.3 成熟度：0.2.x + beta 依赖

- 不满一年，API 无稳定性承诺；0.x 版本号本身就说明作者保留破坏性变更权
- 依赖树里 `@antv/layout ^2.0.0-beta.0`——我们 MEMO 有前科：`@antv/layout` 的 DagreLayout 是给 G6 用的（execute 不更新不返回），为此我们卸载它直调底层 dagre。同一个坑不想踩第二次
- linkedom（服务端 DOM shim）+ postcss 进浏览器包，体积风险未经测量

### 2.4 体积预算：1.5MB 红线

当前单文件壳 1011KB，预算余量 ~490KB。d3 全量（未按需）+ roughjs + 图案/图标资源——**没有 tree-shaking 数据**，很可能一到两倍超余量。而 X6 的成本**已经付过**（增量归零）。

### 2.5 主题体系断裂

我们的核心竞争力之一：accent 种子 → OKLCH 推导整套界面色（含 diagram 节点描边/字色跟随）。X6 渲染吃 `var(--accent)`，明暗切换/换种子实时变色。Infographic 自带 theme 块自成体系，**不接外部 CSS 变量**——接进来就是两套色、两次漂移。

## 3. 想换的动机，拆开看其实另有解法

评估中还原的三个真实诉求：

| 诉求 | Infographic 的解法 | 更好的解法（不换引擎） |
|---|---|---|
| **AI 生成 diagram 的 JSON 啰嗦易错**（nodes+edges 冗长、悬空引用） | `A -> B -> C[标签]` 箭头简写 | **写 ~100 行编译器**：prompt 让模型输出箭头简写 → 纯函数编译成 DiagramSpec。零依赖、零契约变更，字数省一半 |
| 预设模板的美感（时间线/四象限/SWOT 排版） | 模板库 | 若真需要，做成**新页型**（`infographic`），dynamic import 按需加载，与 diagram 并存——各管各场景 |
| 生成过程的可视化反馈 | 流式渲染（chunk 级 re-render） | `loadDoc` 升级为免刷新流式预览（对现有 API 的体验增强） |

三个诉求没有一个需要"换引擎"才能满足。

## 4. 决策：分层共存架构

```
生成层（AI）：   箭头简写 DSL（借鉴 Infographic 语法）
                 "A -> B -> C[标签]" / "A -- B"（无向）
                      ↓ 简写编译器（纯函数，~100 行，本轮新增）
数据层（不变）： DiagramSpec JSON
                 （格式规范 / lint / AI 契约 / 撤销栈——全部不动）
                      ↓
编辑层（不变）： X6 图工作台（拖拽/检查器/边属性闭环）
渲染层（不变）： X6 mountGraph（--accent 主题体系、明暗适配）
```

DSL **只做生成入口**：降低模型输出成本与错误率；编辑与渲染的既有投资原封不动。

## 5. 若未来重评，满足什么条件再换

技术决策要有可逆性。写下重评触发条件（满足两条以上再议）：

1. Infographic 发布 **1.0** 且 API 稳定承诺
2. 提供**可编辑画布**（或官方 X6 互操作层）
3. 支持外部 CSS 变量/主题注入（接我们的 OKLCH 体系）
4. 依赖瘦身（d3 按需/beta 依赖清除）且实测单文件增量 ≤ 300KB
5. 我们的 diagram 需求**收敛为纯展示**（编辑场景消失）

当前五条一条不占。

## 6. 本轮行动项

| # | 行动 | 状态 |
|---|---|---|
| 1 | 本文档归档（docs/decision/ 首篇） | ✅ |
| 2 | "箭头简写编译器"起草计划 → docs/plan/ | 待启动（用户确认后） |
| 3 | Infographic 纳入观察清单：季度重看 1.0/编辑能力/主题注入进展 | MEMO 记录 |

## 附：数据核实记录

- `npm view @antv/infographic`：latest 0.2.20；依赖含 d3@^7.9.0、roughjs、linkedom、postcss、@antv/layout@^2.0.0-beta.0
- GitHub API：antvis/Infographic created 2025-09-11，stars 6381，open issues 20（2026-08-25 查询）
- 本仓现状：X6 3.1.8 已装；图工作台已落地（51/51 测试）；单文件壳 1011KB / 预算 1.5MB

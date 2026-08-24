# 计划：吸收 guizang-ppt-skill 的生成质量设计

> 状态：草案（待评审）
> 日期：2026-08-25
> 来源研究：`~/EA/guizang-ppt-skill`（歸藏 · op7418/guizang-ppt-skill）
> 关联：VERSION.md v0.6 AI 生成工具链的增量强化，非新版本号

## 1. 背景与动机

guizang-ppt-skill 是"提示词工程"范式的 PPT 生成器（43KB SKILL.md + 4352 行参考文档，AI 直接手写整份 HTML）。对照分析发现：我们的 v0.6 工具链（CLI/prompt 库/质量闸/skill）覆盖了**结构与数据正确性**，但缺少它多年沉淀的三层设计：

| 层 | guizang 做法 | oh-my-ppt 现状 | 差距 |
|---|---|---|---|
| **生成前** | 7 问需求澄清强制对齐 | 无——主题直接开写 | 结构定错的返工成本前置 |
| **生成中** | 叙事弧大纲 + 讲稿同步规划 | prompt 只有屏幕内容模板 | "台上说什么"维度缺失 |
| **生成后** | 634 行交互/现场经验 checklist | lint 只查 JSON 结构 | 现场翻车类问题无检查 |

## 2. 目标与非目标

**目标**
1. AI 生成的 deck 在**动笔前**经过需求澄清（风格/受众/时长/素材/硬约束）
2. 生成 prompt 包含**叙事弧结构**与**讲稿维度**（目的/时长/转场进入 notes）
3. 质量闸新增**现场经验层**检查项（备注覆盖、时长预算、节奏）
4. 上述能力同时进入 CLI（`scripts/generate.mjs`）与 Claude Code skill（`skills/`）

**非目标**
- 不引入它的 HTML 模板/风格（我们有自己的页型系统与主题算法）
- 不做图片生成/截图美化工作流（素材管道是另一个主题）
- 不做 Playwright 溢出实测（需浏览器环境，记入 backlog）

## 3. 设计方案

### 3.1 需求澄清（clarify 阶段）

新增 `prompts/clarify.ts`——澄清问题库与回答→参数的映射：

```ts
export const CLARIFY_QUESTIONS = [
  { id: 'style',    question: '风格基调？', options: ['tech-share','product-launch','academic','由内容决定'] },
  { id: 'audience', question: '受众与场景？', example: '行业内部 / 商业发布 / demo day / 私享会' },
  { id: 'duration', question: '分享时长？', hint: '15 分钟 ≈ 10 页 · 30 分钟 ≈ 20 页 · 45 分钟 ≈ 25-30 页' },
  { id: 'material', question: '有原始素材吗？', hint: '文档/数据/旧 PPT/链接——有则基于素材，无则代拟' },
  { id: 'images',   question: '图片/截图处理要求？' },
  { id: 'accent',   question: '主题色偏好？', options: ['天空蓝','克莱因蓝','青绿','由内容决定'] },
  { id: 'hard',     question: '硬约束？', hint: '必须包含 XX 数据 / 不能出现 YY' },
] as const
```

时长→页数换算：`Math.max(8, Math.round(minutes / 1.6))`，注入生成 prompt 的 QUALITY_RULES（替换现有"8–20 页"拍脑袋区间）。

**入口行为**：
- **CLI**：`npm run generate -- "主题" --ask` 进入交互逐问（readline）；缺省沿用现状（无 `--ask` 不打断）
- **skill**：SKILL.md 工作流新增 Step 0.5「澄清」，注明"用户已给完整大纲+素材处理要求时可跳过"（guizang 原文语义）
- 七问的答案合并进 user prompt 头部（受众/硬约束/素材要点逐条列出）

### 3.2 叙事弧 + 讲稿规划（narrative 阶段）

改造 `prompts/index.ts` 的 full-deck 模板：

```
叙事弧骨架（五段，页数按时长预算分配）：
  钩子 Hook       → 1 页   : 反差/问题/硬数据，让人停下来
  定调 Context    → 1-2 页 : 背景、你是谁、为什么讲
  主体 Core       → N-6 页 : 按章节推进，页型混排（content/chart/diagram/two-column）
  转折 Shift      → 1 页   : 打破预期/提出新观点（quote 或 two-column 版式）
  收束 Takeaway   → 1-2 页 : 金句 + end.takeaways 三条记忆点

讲稿维度（每页同步产出，写入 notes/narration）：
  | 页面目的 | 观众可见 | 演讲者补充（notes）| 建议时长 | 转场 |
```

- `notes` 字段升格：模板明确要求每页 notes 含「目的 + 转场提示」——现有生成只有屏幕内容的 narration，讲者备注多为空
- end 页 takeaways 与叙事弧"收束"段对齐（已有字段，补生成规则）
- 其他三个模板（lightning-talk/data-review/tech-tutorial）按各自节奏裁剪弧线（如 lightning 是 钩子→3 爆点→收束）

### 3.3 质量闸现场经验层（lint v2）

`src/utils/lint.ts` 新增检查码：

| code | 级别 | 规则 | 来源 |
|---|---|---|---|
| `notes-coverage` | warn | 演讲 deck（narration.enabled）但 notes 覆盖 < 50% 页 | checklist 0-P |
| `duration-budget` | warn | 各页 duration 之和 < 时长预算 × 0.6（讲不完）或 > ×1.8（超时）——预算来自澄清答案，无预算跳过 | 7 问·时长 |
| `narrative-tail` | warn | 末三页无 quote/takeaways/end 之一（收束缺失） | 叙事弧 |
| `narrative-hook` | info | 首页外第 2 页仍非"钩子型"内容（无数据/反差页型） | 叙事弧（宽松，仅提示） |

全部为 warn/info——沿用 "advice, not refusal" 语义。

### 3.4 skill 与文档同步

- `skills/oh-my-ppt/SKILL.md`：工作流插入 Step 0.5（澄清七问）与 Step 2.5（叙事弧+讲稿表对齐后再动笔）
- `AGENTS.md`：AI 生成工具链节补"澄清→叙事→生成→质量闸"四步循环
- `MEMO.md`：记录本计划来源与决策

## 4. 实施步骤

| # | 任务 | 产物 | 预估 |
|---|---|---|---|
| 1 | `prompts/clarify.ts` + CLI `--ask` 交互 | prompts/clarify.ts、generate.mjs | 1.5h |
| 2 | 叙事弧/讲稿维度改造四个模板 | prompts/index.ts | 1h |
| 3 | lint v2 四个新检查码 + 单测 | utils/lint.ts、tests | 1h |
| 4 | SKILL.md 工作流 + AGENTS/MEMO 同步 | skills/、docs | 0.5h |
| 5 | mock 端点端到端验证（澄清参数注入/弧线页数/新 lint 码） | 验证记录 | 1h |

总计约 5 小时，一个会话内可完成。

## 5. 风险与对策

| 风险 | 对策 |
|---|---|
| 七问增加摩擦，用户只想快速出稿 | 默认不问：CLI 需显式 `--ask`；skill 遵循"信息齐则跳过"——澄清是可选增强而非门槛 |
| 叙事弧让小模型生成更僵化 | 弧线写为"骨架建议"而非硬模板；QUALITY_RULES 只约束页数区间，段落分配自由 |
| duration-budget 无预算时空跑 | 预算作为可选 meta 注入（`_budget_minutes` 下划线私有字段，读取后剔除，不进 schema） |
| lint 新规则误报存量 deck | 全部 warn/info 级；validateReport 输出不受影响 |

## 6. 验收标准

1. `npm run generate -- "X" --ask`（mock 端点）逐问采集，user prompt 含澄清摘要，页数=时长换算
2. 不带 `--ask` 行为与现状完全一致（回归）
3. 生成的 deck：末三页含收束、notes 覆盖率 > 50%、每页 notes 含目的/转场
4. `npm test`：新增 ≥ 4 个 lint 用例全过，存量 25 用例无回归
5. SKILL.md 含 Step 0.5/2.5，AGENTS.md 四步循环更新

## 7. Backlog（本计划不做，记录待选）

- Playwright 逐页溢出实测（guizang validate-swiss-deck 思路）——待浏览器环境就绪
- 图片/截图素材管道（保真优先 → 概念重构分级）
- 动效降级保底策略（Motion One 式"内容永远可读"）
- "单一高饱和高亮"克制配色预设（瑞士风主题包）

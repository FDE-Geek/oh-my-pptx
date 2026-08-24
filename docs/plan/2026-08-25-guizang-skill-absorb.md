# 计划：吸收 guizang-ppt-skill 的生成质量设计

> 状态：v2 草案（已按评审意见修订，待开工）
> 日期：2026-08-25（v2 同日）
> 来源研究：`~/EA/guizang-ppt-skill`（歸藏 · op7418/guizang-ppt-skill）
> 关联：VERSION.md v0.6 AI 生成工具链的增量强化，非新版本号
> v2 变更：砍 duration-budget / narrative-hook；七问收五问；CLI 接 lintDeck；页数按模板注入；tail/coverage 规则改机械可判定；验收改夹具回归

## 1. 背景与动机

guizang-ppt-skill 是"提示词工程"范式的 PPT 生成器（43KB SKILL.md + 4352 行参考文档，AI 直接手写整份 HTML）。对照分析发现：我们的 v0.6 工具链（CLI/prompt 库/质量闸/skill）覆盖了**结构与数据正确性**，但缺少它多年沉淀的三层设计：

| 层 | guizang 做法 | oh-my-ppt 现状 | 差距 |
|---|---|---|---|
| **生成前** | 需求澄清强制对齐 | 无——主题直接开写 | 结构定错的返工成本前置 |
| **生成中** | 叙事弧大纲 + 讲稿同步规划 | prompt 只有屏幕内容模板 | "台上说什么"维度缺失 |
| **生成后** | 交互/现场经验 checklist | lint 只查 JSON 结构 | 现场翻车类问题无检查 |

## 2. 目标与非目标

**目标**
1. AI 生成的 deck 在**动笔前**经过需求澄清（风格/受众/时长/素材/硬约束——五问）
2. 生成 prompt 包含**叙事弧结构**与**讲稿维度**（notes = 目的 + 转场；narration = 口播）
3. 质量闸新增**现场经验层**检查项（备注覆盖、收束完整）——且 CLI 真正跑到它们
4. 上述能力同时进入 CLI（`scripts/generate.mjs`）与 Claude Code skill（`skills/`）

**非目标**
- 不引入它的 HTML 模板/风格（我们有自己的页型系统与主题算法）
- 不做图片生成/截图美化工作流（素材管道是另一个主题）
- 不做 Playwright 溢出实测（记入 backlog）
- **不做时长预算 lint**（v2 砍除：`duration` 是可选字段、有旁白时靠字数推算，闸门语义对不上真实时长模型；真要查需复用 `slideDurationMs` 做 `lintDeck(doc, { budgetMinutes })` 第二参——记 backlog）

## 3. 设计方案

### 3.1 需求澄清（clarify 阶段）

新增 `prompts/clarify.ts`——**五问**（v2：七问中砍掉与计划打架的两问）：

```ts
export const CLARIFY_QUESTIONS = [
  { id: 'style',    question: '风格基调与主题色？', options: ['tech-share','product-launch','academic','由内容决定'] },
  { id: 'audience', question: '受众与场景？', example: '行业内部 / 商业发布 / demo day / 私享会' },
  { id: 'duration', question: '分享时长（分钟）？', hint: '用于页数预算，见 3.2 按模板换算' },
  { id: 'material', question: '有原始素材吗？', hint: '文档/数据/旧 PPT/链接——有则基于素材，无则代拟' },
  { id: 'hard',     question: '硬约束？', hint: '必须包含 XX / 不能出现 YY / 图片与配色特殊要求也写这里' },
] as const
```

（v2 说明：`images` 并入 `hard`——不做图管线的计划里，单独问图会诱导模型吐空 `src` 的 image 页触发 error；`accent` 并入 `style`——themePreset 已带种子色，重复提问。）

**入口行为**：
- **CLI**：`npm run generate -- "主题" --ask` 进入交互逐问（readline）；缺省沿用现状（无 `--ask` 不打断）
- **skill**：SKILL.md 工作流新增 Step 0.5「澄清」，注明"用户已给完整大纲+素材处理要求时可跳过"（guizang 原文语义）
- 五问的答案合并进 user prompt 头部（受众/硬约束/素材要点逐条列出）

### 3.2 叙事弧 + 讲稿规划（narrative 阶段）

改造 `prompts/index.ts` 的四个模板：

**页数预算按模板注入**（v2：不能改共用的 QUALITY_RULES 打架 lightning/data-review）：

| 模板 | 页数公式（minutes → pages） | 说明 |
|---|---|---|
| full-deck | `clamp(round(m / 1.5), 8, 30)` | 15min→10，30min→20，45min→30 |
| lightning-talk | **固定 6–8** | 不按时长换算（5 分钟也 6–8 页） |
| data-review | `clamp(round(m / 1.5), 10, 24)` | 图表密集略多页 |
| tech-tutorial | `clamp(round(m / 1.5), 8, 24)` | — |

无时长答案 → 各模板回落自家缺省区间（full-deck 12–18 等）。页数区间写进**各模板自己的 user prompt**，QUALITY_RULES 保持现状不动。

**叙事弧骨架**（写进 full-deck 与 tech-tutorial；lightning/data-review 裁剪版）：

```
钩子 Hook       → 1 页   : 反差/问题/硬数据，让人停下来
定调 Context    → 1-2 页 : 背景、你是谁、为什么讲
主体 Core       → N-5 页 : 按章节推进，页型混排（content/chart/diagram/two-column）
转折 Shift      → 1 页   : 打破预期/提出新观点（quote 或 two-column）
收束 Takeaway   → 1-2 页 : 金句 + end.takeaways 三条记忆点
```

**讲稿维度（notes ≠ narration，模板显式区分）**：
- `notes` = 页面目的 + 转场提示（一句话，写给讲者）
- `narration` = 完整口播句（写给 TTS）
- 模板中用表格示例双栏展示，防止模型把口播灌进 notes

### 3.3 质量闸现场经验层（lint v2）

`src/utils/lint.ts` 新增**两个**检查码（v2：砍 duration-budget / narrative-hook）：

| code | 级别 | 规则（机械可判定） |
|---|---|---|
| `notes-coverage` | warn | `narration.enabled` 为真时，**正文页**（排除 cover/section/end）含非空 notes 的比例 < 50% 触发。分母去掉封面/目录/结尾，防止结构页拖低覆盖率 |
| `narrative-tail` | warn | **end 页缺 `takeaways` 且 末三页中无 `quote` 页**——收束双保险缺两者才报（v2：原"含 quote/takeaways/end 之一"因 end 必在末位而永不响） |

~~duration-budget~~：砍。理由见非目标。
~~narrative-hook~~：砍。"钩子型/反差"无法结构性判定，机械版会变猜页型。

### 3.4 CLI 接入真 lintDeck（v2 新增任务，评审必改项）

`scripts/generate.mjs` 现用本地 `lintBasic`（只查空 slides/未知页型/悬空边）——新码写进 `lint.ts` 后 CLI 根本跑不到。改造：

- esbuild 额外编译 `src/utils/lint.ts`（与 hyperframes 导出器同法，platform: 'node'）
- 生成后 `lintDeck(deck)` + `formatIssues` 输出，替换 `lintBasic`
- 本地 `lintBasic` 保留为编译失败时的降级路径（提示"完整质量闸不可用"）

### 3.5 skill 与文档同步

- `skills/oh-my-ppt/SKILL.md`：工作流插入 Step 0.5（澄清五问）与 Step 2.5（叙事弧+讲稿表对齐后再动笔）
- `AGENTS.md`：AI 生成工具链节补"澄清→叙事→生成→质量闸"四步循环；注明 notes/narration 分工
- `MEMO.md`：记录本计划来源、v2 评审结论与砍除项

## 4. 实施步骤

| # | 任务 | 产物 | 预估 |
|---|---|---|---|
| 1 | `prompts/clarify.ts` 五问 + CLI `--ask` 交互 + generate 改接 lintDeck | prompts/clarify.ts、generate.mjs | 2h |
| 2 | 四模板：页数按模板注入 + 叙事弧 + notes/narration 双栏规范 | prompts/index.ts | 1h |
| 3 | lint v2 两个新检查码（notes-coverage / narrative-tail）+ 单测 ≥ 4 例 | utils/lint.ts、tests | 1h |
| 4 | SKILL.md Step 0.5/2.5 + AGENTS/MEMO 同步 | skills/、docs | 0.5h |
| 5 | 验证：夹具 deck 跑新码 + `--ask` 注入回归 + 真实生成标"有端点再验" | 验证记录 | 0.5h |

总计约 5 小时（v2 范围收窄后：只改 prompt + 2 个机械 warn + CLI 接线，无时长语义闭环负担）。

## 5. 风险与对策

| 风险 | 对策 |
|---|---|
| 澄清增加摩擦，用户只想快速出稿 | 默认不问：CLI 需显式 `--ask`；skill 遵循"信息齐则跳过" |
| 叙事弧让小模型僵化 | 弧线是"骨架建议"；页数区间按模板注入，不绑全局 |
| notes 灌水过闸（coverage 检查被形式化满足） | notes 最低形状：模板要求含"目的：…转场：…"结构；lint 只查非空（形状靠 prompt 约束，机械查"目的"二字太脆——权衡后接受） |
| lint 新规则误报存量 deck | 全 warn 级；validateReport 不受影响 |
| generate 编译 lint.ts 失败（环境异常） | 降级 lintBasic 并提示，不阻塞出稿 |

## 6. 验收标准（v2：夹具化，不依赖真模型）

1. `npm run generate -- "X" --ask`（mock 端点）：逐问采集、user prompt 含澄清摘要、页数=对应模板换算
2. 不带 `--ask` 行为与现状一致（回归）；generate 输出走 `lintDeck`（构造带 `slides[0].bullet` 拼错字段的 mock 响应，CLI 报 unknown-key 即证明接线成功）
3. **夹具 deck**（tests 内构造）：`notes-coverage` 在 50% 边界两侧各触发/不触发；`narrative-tail` 对"无 takeaways 无 quote"报、对"有其一"不报
4. `npm test`：新增 ≥ 4 用例全过，存量 26 用例无回归
5. SKILL.md 含 Step 0.5/2.5；AGENTS.md 四步循环更新
6. 真实模型生成的 notes 质量（>50% 覆盖、目的/转场形状）——**标注"有端点再验"**，不阻塞本轮验收

## 7. Backlog（本轮不做，记录待选）

- **时长预算 lint**：`lintDeck(doc, { budgetMinutes })` 第二参 + 复用 `utils/hyperframes.ts` 的 `slideDurationMs`（4 字/秒 × rate）推算真实停留——语义闭环后再上
- Playwright 逐页溢出实测（guizang validate-swiss-deck 思路）
- 图片/截图素材管道（保真优先 → 概念重构分级）
- 动效降级保底策略（Motion One 式"内容永远可读"）
- "单一高饱和高亮"克制配色预设（瑞士风主题包）

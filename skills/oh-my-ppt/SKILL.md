---
name: oh-my-ppt
description: Generate, refine, and present single-file HTML slide decks. Use when the user asks for a presentation, slides, a deck, 演示文稿, or PPT. Reads AGENTS.md as the authoring contract; emits config.ts / JSON; builds self-contained HTML.
---

# oh-my-ppt deck authoring

oh-my-ppt 演示文稿由 `src/config.ts` 的 `CONFIG` 对象完整定义。本 skill 指导你生成与修改 deck。

## 工作流

0.5. **澄清**（可跳过）：用户未同时给出风格/受众/时长/素材/硬约束时，先问这五问（见 `prompts/clarify.ts`）。已给完整大纲 + 素材处理要求则跳过，不要为问而问。时长按模板换算页数（`prompts/index.ts` 的 `pageBudget`）：full-deck / tech-tutorial / data-review 用 `minutes/1.5` 夹在各自区间；**lightning-talk 固定 6–8 页，不吃换算**。
1. **读契约**：`AGENTS.md`（页型速查表 + 写作守则 + 验证清单）
2. **生成**：按 prompt 库 `prompts/index.ts` 的模板结构生成 slides 数组（或用户给定主题直接写）
2.5. **叙事弧 + 讲稿对齐后再动笔**：按模板弧线排页（full-deck / tech-tutorial 用五段弧；lightning / data-review 用裁剪版）。每页 `notes` = 目的 + 转场（写给讲者）；`narration` = 完整口播句（写给 TTS），二者不要写反。`end.takeaways` 给三条记忆点。
3. **质量闸**：生成后自检——首页 cover / 末页 end / chart 数据对齐 / diagram 边引用有效 / bullets ≤ 6 条每条 ≤ 20 字 / 每 4–6 页一个 section / 正文页 notes 覆盖 ≥ 50%（`notes-coverage`）/ end 有 takeaways 或末三页有 quote（`narrative-tail`）
4. **写文件**：生成新的 `src/config.ts`（或独立 JSON 供 loadDoc 导入）
5. **验证**：`npm run build` 必须零错误；有可视化环境时 `npm run dev` 翻页检查

## 快速参考

- 页型（11 种）：cover / section（可 `items` 做 TOC）/ content（layout: left|center|card, step）/ two-column / quote / code / image / table / chart（bar|line|pie）/ diagram（X6 + dagre）/ end（可 `takeaways`）
- 生成 diagram 优先 `flow` 简写（`cfg[读配置] -> db -.-> swm`）；写入 `config.ts` 前必须已是 nodes/edges（`npm run generate` 会自动展开）
- 主题：`themePreset: 'tech-share' | 'product-launch' | 'academic'`；或 accent 种子色（OKLCH 推导全套）
- 每页可选 `tag`（页眉面包屑）、`notes`（讲者备注：目的+转场）与 `narration`（TTS 口播稿）
- 单文件构建：`npm run build:single` → `dist-single/oh-my-ppt.html`

## 示例

```
用户：帮我做一份"Rust 入门"技术分享 deck

→ 信息已齐（技术分享 + 教程向）→ 跳过澄清
→ themePreset: 'tech-share' · 页数走 tech-tutorial 缺省区间
→ cover → 钩子 → section(为什么 Rust) → content(三大卖点 step) → code(所有权示例)
→ section(生态) → chart(性能对比 bar) → diagram(工具链 dagre LR)
→ quote → end(Thanks + takeaways)
→ 正文页 notes「目的：…转场：…」+ narration 口播稿 → npm run build 验证 → 提示用户 npm run dev 预览
```

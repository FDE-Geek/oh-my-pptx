---
name: oh-my-ppt
description: Generate, refine, and present single-file HTML slide decks. Use when the user asks for a presentation, slides, a deck, 演示文稿, or PPT. Reads AGENTS.md as the authoring contract; emits config.ts / JSON; builds self-contained HTML.
---

# oh-my-ppt deck authoring

oh-my-ppt 演示文稿由 `src/config.ts` 的 `CONFIG` 对象完整定义。本 skill 指导你生成与修改 deck。

## 工作流

1. **读契约**：`AGENTS.md`（页型速查表 + 写作守则 + 验证清单）
2. **生成**：按 prompt 库 `prompts/index.ts` 的模板结构生成 slides 数组（或用户给定主题直接写）
3. **质量闸**：生成后自检——首页 cover / 末页 end / chart 数据对齐 / diagram 边引用有效 / bullets ≤ 6 条每条 ≤ 20 字 / 每 4–6 页一个 section
4. **写文件**：生成新的 `src/config.ts`（或独立 JSON 供 loadDoc 导入）
5. **验证**：`npm run build` 必须零错误；有可视化环境时 `npm run dev` 翻页检查

## 快速参考

- 页型（11 种）：cover / section / content（layout: left|center|card, step）/ two-column / quote / code / image / table / chart（bar|line|pie）/ diagram（X6 + dagre）/ end
- 主题：`themePreset: 'tech-share' | 'product-launch' | 'academic'`；或 accent 种子色（OKLCH 推导全套）
- 每页可选 `notes`（讲者备注）与 `narration`（TTS 口播稿）
- 单文件构建：`npm run build:single` → `dist-single/oh-my-ppt.html`

## 示例

```
用户：帮我做一份"Rust 入门"技术分享 deck

→ themePreset: 'tech-share'
→ cover → section(为什么 Rust) → content(三大卖点 step) → code(所有权示例)
→ section(生态) → chart(性能对比 bar) → diagram(工具链 dagre LR)
→ quote → end(Thanks)
→ 每页写 narration 口播稿 → npm run build 验证 → 提示用户 npm run dev 预览
```

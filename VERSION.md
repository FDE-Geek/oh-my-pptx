# oh-my-ppt 路线图（VERSION）

> **对标 [nexu-io/open-design](https://github.com/nexu-io/open-design)，聚焦 HTML 单文件 PPT 演示方向。**
>
> OpenDesign 是"开源版 Claude Design"：agent 原生、本地优先、产物为真 HTML 的全品类设计工具（原型/Deck/看板/图片/视频）。oh-my-ppt 汲取其理念，但只做一件事并做到极致：**一份 HTML 文件，就是一场演示**。文件即软件——放映、编辑、配音、录屏、分发全部内含，无服务器、无安装、无锁定。

## 定位差异

| 维度 | OpenDesign | oh-my-ppt |
|---|---|---|
| 范围 | 全品类设计（原型/deck/看板/图/视频） | **只做 PPT 演示** |
| 形态 | 桌面 app + daemon + 云服务 | **单个 HTML 文件** |
| 引擎 | 外接 26 种编码 CLI | **config 驱动 + 浏览器即引擎** |
| AI 契约 | MCP server / skills 目录 | **`#oh-my-ppt-doc` 明文 JSON 块 + AGENTS.md** |
| 设计系统 | 151 个 DESIGN.md 包 | **OKLCH 算法主题 + 种子色**（后续兼容 DESIGN.md） |

## 已完成（v0.1 – v0.4）

- [x] **v0.1 复刻起步**：config 驱动、深浅主题（OS 跟随/按时段）、键盘导航、URL 定位
- [x] **v0.2 演示体验**：逐条动画、切换动效、概览模式（G）、演讲者视图（S，跨窗同步）、PDF 导出（P）
- [x] **v0.3 表达力**：11 种页型（cover/section/content/two-column/quote/code/image/table/chart/**diagram(X6)**/end）、零依赖 SVG 图表、轻量代码高亮
- [x] **v0.4 AI 成片**：TTS 旁白、自动放映、getDisplayMedia 录屏成片
- [x] **单文件分发**：`build:single` → 自包含 HTML（明文 JSON 数据块，外部工具可 splice）
- [x] **可视化编辑器（E）**：三栏可拖布局、全页型表单、X6 画布（dagre 自动布局）、撤销/重做、草稿自动保存、导入导出（config.ts/JSON）
- [x] **算法主题**：OKLCH color-ramp、灰画布停点、φ 黄金比例间距、8 色种子面板

## 里程碑

### v0.8.5 —— HyperFrames 借力路线（deck → 确定性 MP4）✅

- [x] **composition 导出器**：`src/utils/hyperframes.ts`——deck → HyperFrames HTML composition：每页 iframe clip（`?embed=1&frame=1&start=N` 单页锁定）+ `data-start/duration` 时间轴（时长按旁白字数×语速近似推导）+ GSAP seekable timelines（step/animation 逐条入场）
- [x] **frame 锁定模式**：`?frame=1` 单页渲染、禁键盘禁自动逻辑——供逐帧 seek
- [x] **导出入口**：编辑器「MP4」按钮 / `node scripts/export-hyperframes.mjs`；产物 + 单文件 deck 同目录放 `npx hyperframes render` 即得确定性 MP4（自动获得 GSAP/音频/Lambda 分布式渲染全部能力）
- [x] **纯浏览器预览**：`composition.html?preview` 内嵌播放器——播放/暂停/重置/拖动进度条，逐页时间轴节奏零依赖可见（file:// 可开）；frame 模式支持页面内 animation 时序自动播放

### v0.5 —— 模板与品牌（对标 OpenDesign 的 DESIGN.md / 模板体系）✅

- [x] **主题目录**：`ThemePreset`（`src/theme/presets.ts`），config `themePreset` 一行引用；优先级 会话选色 > preset > accent > 缺省
- [x] **DESIGN.md 兼容**：`window.ohMyPpt.importDesignMd(md)` 解析 OpenDesign 9 节 schema 子集（Palette/Typography/Voice → 种子色+字体族）
- [x] **版式扩展**：content 页 `layout: 'center'/'card'` 版式变体
- [x] **deck 模板预设**：内置 4 套（default/tech-share/product-launch/academic）——种子色+字体+密度（compact/normal/airy → φ 基准倍率）+动效，编辑器 Deck 设置下拉切换

### v0.6 —— AI 深度集成（对标 agent-native 循环）✅

- [x] **CLI 生成器**：`npm run generate -- "主题"`（`scripts/generate.mjs`）——OpenAI 兼容端点（缺省 Ollama 本地，`OHMY_PPT_BASE_URL/KEY/MODEL` 可换任意端点），零 npm 依赖，markdown 围栏自动剥离
- [x] **Claude Code skill**：`.claude-plugin/plugin.json` + `skills/oh-my-ppt/SKILL.md`——生成/质量闸/验证工作流打包，可 `/plugin marketplace add FDE-GROUP/oh-my-pptx` 安装
- [x] **prompt 库**：`prompts/index.ts`——4 套模板（full-deck/lightning-talk/data-review/tech-tutorial）× schema 约束 × 写作守则 × 质量自检，CLI 与 skill 共用
- [x] **内容质量闸**：`src/utils/lint.ts` 纯函数——页型结构/图表数据对齐/diagram 边引用/表格列数/bullets 超长/章节节奏，CLI 生成后强制跑（14 项规则实测命中）

### v0.7 —— 成片增强（对标 HyperFrames 思路）✅

- [x] **音频混入**：`AudioMixer`（AudioContext → MediaStreamDestination）——旁白音频文件（`narrationAudio`）与屏幕系统音频混成单一音轨进 MediaRecorder，解决录屏无声
- [x] **逐页动画时间轴**：slide `animation: [{at, index}]` 毫秒时序——自动放映按时间轴驱动逐条入场（替代固定 600ms）
- [x] **确定性渲染（实验）**：`node scripts/render-video.mjs deck.html -o out.mp4`——headless Chromium 逐页截图 × ffmpeg 合成 H.264；依赖系统 chromium+ffmpeg（本机未装，帮助/探测/数据块解析路径已验证；截图管线经无头浏览器实测可行）

### v0.8 —— 协作与生态

- [x] **嵌入式播放**：`?embed=1&start=N&autoplay=1&loop=1` 参数化——隐藏全部 UI（菜单/翻页/进度条），自动翻页 + 末页循环，iframe 嵌任意站点（gotoRef 修复 useCallback 闭包过期导致的翻页错乱）
- [x] **版本对比**：`window.ohMyPpt.diffDocs(baseJson, otherJson)`——页级增/删/改/移结构化 diff + 元信息变更，文本报告输出
- [ ] **多 deck 工作区**：单文件内嵌多份演示 + 目录页（产品手册/课程套件场景）——**移入 v1.x**（数据模型需扩展，避免破坏 1.0 契约）
- [ ] **组件市场雏形**：`slides/recipes/` 社区页型模板——**移入 v1.x**（依赖多 deck 的引用机制）

### v1.0 —— 稳定契约

- [x] **格式规范冻结**：`docs/format.md`——normative 数据模型规范（11 页型/共有字段/diagram/splice 契约/稳定性规则），承诺向后兼容
- [x] **测试基线**：Vitest 单测 20 项（lint 质量闸 / OKLCH 色彩科学 / 画布停点 / DESIGN.md 解析 / deck diff），`npm test`
- [ ] **无障碍**：键盘全流程、ARIA 标注、对比度审计（复用 contrastOn 已有算法）——收尾中
- [ ] **文档站**：单文件构建的官方文档站（用 oh-my-ppt 演示 oh-my-ppt）——收尾中

## 不做清单（Non-goals）

- ❌ 编辑器 GUI 对标 PowerPoint（定位是"config 生成 + 浏览器微调"，不做像素级排版）
- ❌ 实时协作 / CRDT（git 管版本足够；协作交给 fork + PR）
- ❌ 云端服务 / 账号体系（文件即软件，永远本地优先）
- ❌ 全品类设计（原型/看板/图片生成是 OpenDesign 的赛道，我们只做演示）

## 版本原则

1. **单文件契约不可破坏**：`#oh-my-ppt-doc` 明文块、可正则提取、`<` 转义——每次发版回归校验
2. **零后端**：任何新功能不得引入强制网络依赖（可选增强除外，如在线 TTS 音色）
3. **体积预算**：单文件产物 ≤ 1.5MB（当前 928KB）；超预算的功能需按需加载或裁剪
4. **向后兼容**：2026 年生成的文件在 2036 年的浏览器照常打开

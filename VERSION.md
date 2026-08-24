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

### v0.5 —— 模板与品牌（对标 OpenDesign 的 DESIGN.md / 模板体系）

- [ ] **主题目录**：`themes/` 可丢入目录（`theme.json`：种子色/字体/版式密度），config 一行引用——对应 OpenDesign 的"丢文件夹即生效"
- [ ] **DESIGN.md 兼容**：解析 OpenDesign 9 节 schema 的子集（色板/字体/语气），自动映射为 deck 主题
- [ ] **版式扩展**：页型 × 版式矩阵（同一 content 页可选"居中/左对齐/卡片式"），向 31 种布局靠拢
- [ ] **deck 模板预设**：内置 3–5 套成品模板（技术分享/产品发布/学术报告），`config.ts` 一键换装

### v0.6 —— AI 深度集成（对标 agent-native 循环）

- [ ] **CLI 生成器**：`npx oh-my-ppt "主题"`——命令行直出 config.ts（本地模型/Ollama 友好）
- [ ] **Claude Code skill 发布**：把 AGENTS.md 打包为可安装 skill（`/plugin` 市场分发）
- [ ] **prompt 库**：`prompts/` 目录沉淀"开场页/数据页/对比页"级别的生成 prompt 模板（对应 OpenDesign 的 93 个 prompt-templates）
- [ ] **内容质量闸**：生成后自动检查（bullets 超长/图表空数据/页数节奏），报告而非静默

### v0.7 —— 成片增强（对标 HyperFrames 思路）

- [ ] **音频混入**：Edge TTS / 音频文件轨道 + AudioContext 混音，解决系统 TTS 录不进屏的问题
- [ ] **逐页动画时间轴**：`animation` 字段声明元素级入场时序，录制自动执行
- [ ] **确定性渲染**：deck → 逐页截图 → ffmpeg 合成（无头浏览器，需 Node CLI 辅助），产出对齐到帧的 MP4

### v0.8 —— 协作与生态

- [ ] **多 deck 工作区**：单文件内嵌多份演示 + 目录页（产品手册/课程套件场景）
- [ ] **版本对比**：两个单文件的 JSON diff 视图（谁改了哪页）
- [ ] **嵌入式播放**：`<iframe>` 嵌入任意站点的参数化播放（`?start=3&autoplay=1`）
- [ ] **组件市场雏形**：`slides/recipes/`——社区贡献的页型模板（婚礼请柬/代码走查/复盘报告），config 引用

### v1.0 —— 稳定契约

- [ ] **格式规范冻结**：`docs/format.md`——数据模型规范（对应 OpenDesign 的 normative spec），旧文件永久可开
- [ ] **测试基线**：Vitest 单测（types/theme/diagram 纯函数）+ Playwright 冒烟（翻页/编辑/导出）
- [ ] **无障碍**：键盘全流程、ARIA 标注、对比度审计（复用 contrastOn 已有算法）
- [ ] **文档站**：单文件构建的官方文档站（用 oh-my-ppt 演示 oh-my-ppt）

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

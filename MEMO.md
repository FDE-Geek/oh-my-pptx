# oh-my-ppt 开发备忘（MEMO）

> 工作日志式的备忘：踩过的坑、当前状态、待办、环境限制。
> 与 VERSION.md（路线图）互补——这里记"过程中值得记住的事"。

## 环境现状（2026-08-24）

| 项 | 状态 | 影响 |
|---|---|---|
| Node | v22.23.0（nvm） | 满足 HyperFrames 要求的 22+ |
| 本机 chromium / google-chrome | ❌ 未安装 | render-video.mjs 无法跑；HyperFrames 渲染也不行 |
| 本机 ffmpeg | ❌ 未安装 | 同上，视频合成全受阻 |
| npm 访问 GitHub Releases | ❌ ETIMEDOUT（20.205.243.166:443） | hyperframes 包 postinstall 拉二进制失败 |
| `npx hyperframes` CLI | ⚠️ 可下载（0.8.11）但执行静默退出 | 原因未明，可能与上述网络/二进制有关 |
| Ollama | ❌ 未安装 | CLI 生成器（scripts/generate.mjs）真实生成需装：`ollama pull qwen3:8b`；mock 端点链路已测通 |
| dev server | `npm run dev` → http://localhost:5173 | 正常 |
| 浏览器测试 | gstack browse（headless Chromium） | 正常，项目主要验证手段 |

**结论**：浏览器内全功能可用（放映/编辑/录制/导出）；**Node 侧视频渲染管线（render-video.mjs / hyperframes render）需在装好 ffmpeg+chromium+网络的机器上验证**。导出的 composition.html 结构已自校验（16 clips / 213s / timelines 契约）。

## 踩坑记录（按时间）

### 1. Tailwind v4 spacing 命名空间劫持（v0.2 时期，影响最大）
- **现象**：多个页面内容挤成 110px 窄条；`max-w-3xl` 被解析为 `var(--spacing-3xl)`=6.854rem
- **根因**：`@theme` 里注册 `--spacing-xs..3xl` 后，Tailwind v4 把同名刻度用于 `max-w/min-w/w`
- **修复**：φ 间距 token 全部加 `phi-` 前缀（`p-phi-md`），83 处类名批量替换；`max-w-3xl` 恢复 container 刻度
- **教训**：Tailwind v4 的 `--spacing-*` 命名空间威力大，自定义刻度务必用前缀隔离

### 2. HTML 元素不支持 x/y CSS 属性（右键菜单）
- **现象**：菜单"不出现"——实际渲染在文档流末尾（视口外）
- **根因**：`style={{x, y}}` 只对 SVG 有效，HTML 必须用 `left/top`
- **教训**：React style 对象直接透传 CSS，认不出就静默丢弃

### 3. HMR 伪影反复干扰判断
- **现象**：改动后浏览器测试"无效"，console 报 Hooks 顺序变化 / 模块 500
- **根因**：热替换旧模块缓存；删除文件、改 hook 数量、加新文件时尤其频繁
- **对策**：验证一律用全新 URL 参数（`?v=$(date +%s)`）或 `$B disconnect` 后重连；console 时间戳要核对是否为最新

### 4. interval/useCallback 闭包过期（embed 自动播放）
- **现象**：`?start=3&autoplay=1` 翻页序列 3→2→2→2（而非 3→4→5）
- **根因**：interval 闭包捕获**首次渲染**的 `next`/`goto`（useCallback 依赖 count），其闭包 current=0 → goto(1)
- **修复**：`currentRef`/`gotoRef` 在渲染体同步最新引用，tick 内用 ref
- **教训**：任何 setInterval/handler 里的"当前状态"都要走 ref，不走闭包

### 5. X6 v2 的 API 差异（diagram 页型）
- `Shape.Path.define({shapeName})` 注册不生效（"Node with name does not exist"）→ 必须用 **`Graph.registerNode`** + markup
- `getLabel()` 不存在 → `toJSON()` 里读 label（string 或 `{text}`）
- 定位手段：浏览器探针（临时 div + 页面内 import 模块直接调用）拿到真实错误栈

### 6. @antv/layout 的 DagreLayout 是给 G6 用的
- **现象**：`execute(model)` 不更新入参也不返回值
- **修复**：直接用底层 **dagre 库**（43KB，同步 API），卸载 @antv/layout
- 附带坑：卸载 @antv/layout 会带走 dagre（它曾是传递依赖），需显式 `npm i dagre @types/dagre`

### 7. OKLCH 色域钳制导致色相漂移
- 深蓝种子 dim 推导（L×0.82 clamp 到 0.18-0.55）时色相漂 20.8°——gamut 边界正常现象
- 单测容差放到 ±30°，注释说明原因

### 8. Cover 组件模块级快照
- `const deck = getDeckConfig()` 写在模块顶层 → 署名永远是启动快照，编辑器改了不生效
- **修复**：`DeckContext`（Provider 传 liveDoc，无 Provider 回退 getDeckConfig）
- **教训**：模块级单例 + React 数据流是反模式，需要"渲染期读取"的东西走 Context

### 9. 浏览器 TTS 录不进屏
- speechSynthesis 的音频不走音频设备路由，getDisplayMedia 捕获不到
- **方案**：`narrationAudio`（音频文件）走 AudioMixer 混入录制流；或整体切 HyperFrames 确定性渲染

### 10. esbuild 在 Vite 8 下不是直接依赖
- build-single.mjs 用 esbuild 编译 config.ts 时 `Cannot find package` → 显式 `npm i -D esbuild`

### 11. 吸收 guizang-ppt-skill 生成质量（2026-08-25，v2）
- 来源：`docs/plan/2026-08-25-guizang-skill-absorb.md`（v2 按评审修订后落地）
- 做了：五问澄清（CLI `--ask`，默认不问）+ 四模板叙事弧/讲稿双栏 + lint `notes-coverage` / `narrative-tail` + generate 改接 `lintDeck`
- v2 砍除：`duration-budget`（时长模型对不上，backlog：`lintDeck(doc, { budgetMinutes })` + `slideDurationMs`）；`narrative-hook`（不可机械判定）
- 验收靠夹具与 mock 端点，不依赖本机 Ollama

## 架构决策记录

| 决策 | 理由 | 备选方案（被否） |
|---|---|---|
| φ 间距用 `phi-` 前缀 token | 规避 Tailwind v4 命名空间劫持 | 改回默认刻度（丢失黄金比例） |
| 颜色算法而非色表 | 种子色推导全套装（OKLCH + 画布停点） | 手写 8 套主题变量（不可扩展） |
| dagre 直调 | 同步、43KB | @antv/layout（G6 向，不兼容） |
| 草稿存 localStorage（非 sessionStorage） | 跨刷新/重启保留；dirty 由内容比较得出 | sessionStorage（关标签即丢） |
| diagram 编辑画布用 `key={JSON.stringify(spec)}` 重挂 | 外部变更（布局/撤销）需重建，自身回流重挂等价无害 | 精细 diff 更新（复杂度高） |
| HyperFrames 借力而非自研逐帧 seek | 42k 生态的确定性渲染/音频/Lambda 白拿 | 自研 frame=N seek（工作量大且重复造轮） |
| 多 deck 工作区延到 v1.x | 需扩数据模型，会破坏 1.0 契约 | 硬上（契约污染） |
| diagram 继续用 X6，不换 Infographic | 岗位是可编辑 DAG，不是模板信息图；换引擎拆契约/工作台/主题。生成层自研箭头简写即可（见 decision 2026-08-25） | 整包替换 @antv/infographic 0.2 |

## 观察清单

- **@antv/infographic**（季度）：1.0 与稳定承诺；是否出现**图模型级**编辑（任意节点/边双向写回 JSON，模板画板微调不算）；外部 CSS 变量 / OKLCH 种子跟随；单文件增量实测 ≤ 300KB。两条以上再议换引擎。记录：`docs/decision/2026-08-25-keep-x6-over-infographic.md`。

## 待验证清单（拿到好环境后）

- [ ] `npm run tts`：Edge TTS 真实合成（本机到 speech.platform.bing.com WSS 不通，CLI 链路/错误归因/引用片段生成已验证；网络通了直接重跑）
- [ ] `npx hyperframes render`：composition.html → MP4（网络 + ffmpeg + chromium）
- [ ] `node scripts/render-video.mjs`：截图合成版（chromium + ffmpeg）
- [ ] `npm run generate -- "主题"`：真实 Ollama 生成（`ollama pull qwen3:8b`）；生成稿 notes 覆盖与目的/转场形状标「有端点再验」
- [ ] narrationAudio 全链路：音频文件 → AudioMixer → 录制 WebM 音轨可闻
- [ ] 单文件 deck 在 file:// 下双击打开（Safari/Firefox 各验一遍）

## 常用命令

```sh
npm run dev            # 开发（热更新）
npm run build          # tsc + vite build → dist/
npm run build:single   # 单文件 → dist-single/oh-my-ppt.html（当前 ~940KB）
npm test               # vitest
npm run generate -- "主题" -o deck.json   # AI 生成（需端点）
npm run generate -- "主题" --ask          # 可选澄清五问后再生成
node scripts/export-hyperframes.mjs       # composition 导出
```

## 浏览器测试速查（gstack browse）

```sh
B="$HOME/.config/opencode/skills/gstack/browse/dist/browse"
$B goto "http://localhost:5173/?v=$(date +%s)"   # 新 URL 绕 HMR
$B js "..."            # 页面内求值（注意类名含 [ ] 时 querySelector 需转义）
$B console --errors    # 错误（时间戳要核对是否最新）
$B screenshot /tmp/x.png
# HMR 疑似失效时：$B disconnect 后重新 goto
```

import type { PPTConfig } from './types'

export const CONFIG: PPTConfig = {
  title: 'oh-my-ppt',
  author: 'abel',
  accent: '#61b0f1',
  themePreset: 'default',
  transition: 'fade',

  theme: {
    autoChange: true,
    changeByOS: true,
    changeByHour: false,
    hourDarkActive: '18:30',
    hourDarkInactive: '07:00',
  },

  narration: {
    enabled: true,
    lang: 'zh-CN',
    rate: 1,
  },

  autoplay: {
    enabled: true,
    defaultDuration: 3000,
  },

  slides: [
    {
      type: 'cover',
      title: 'oh-my-ppt',
      subtitle: '极简、优雅、可定制的 HTML 演示工具',
      notes: '开场：介绍项目动机，参考 Bento 的设计哲学。',
    },
    {
      type: 'content',
      title: '为什么做它',
      step: true,
      bullets: [
        '参考 Bento 的设计哲学：极简、优雅、可定制',
        'config.ts 单文件驱动全部内容',
        '纯静态产物，无后端、可部署到任意平台',
      ],
      notes: '强调 config 驱动与纯静态两个卖点。',
    },
    { type: 'section', title: '核心特性', notes: '过渡页，停顿一下。' },
    {
      type: 'content',
      title: '功能一览',
      step: true,
      layout: 'card',
      bullets: [
        '主题：深色 / 浅色手动切换，保存到 localStorage',
        '自动主题：跟随操作系统 或 按时段切换',
        '导航：键盘 ← → / 空格 / Home / End / F 全屏',
        '概览模式 G、演讲者视图 S、PDF 导出 P',
      ],
      notes: '演示各快捷键。',
    },
    {
      type: 'content',
      title: '技术栈',
      bullets: ['TypeScript', 'React 19', 'Tailwind CSS 4', 'Vite'],
    },
    {
      type: 'two-column',
      title: '两种哲学',
      left: {
        title: '传统 PPT',
        bullets: ['二进制格式，锁定生态', '所见即所得编辑器', '动画靠手工调试'],
      },
      right: {
        title: 'oh-my-ppt',
        bullets: ['纯文本 config，git 管版本', '类型即 Schema，AI 友好', '纯静态产物，随处部署'],
      },
    },
    {
      type: 'quote',
      quote: 'Talk is cheap. Show me the deck.',
      author: 'Linus Torvalds (改编)',
    },
    {
      type: 'code',
      title: '一页 PPT 就是一个对象',
      language: 'ts',
      filename: 'config.ts',
      code: `{
  type: 'content',
  title: '为什么做它',
  step: true,
  bullets: [
    '极简、优雅、可定制',
    'config 驱动全部内容',
    '纯静态，无后端',
  ],
  notes: '讲者备注写在这里',
}`,
    },
    {
      type: 'chart',
      title: '零依赖图表',
      chart: {
        kind: 'bar',
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        series: [
          { name: '2025', data: [30, 48, 42, 61] },
          { name: '2026', data: [45, 56, 63, 78] },
        ],
      },
    },
    {
      type: 'chart',
      title: '内容构成',
      chart: {
        kind: 'pie',
        labels: ['内容页', '章节页', '图表页', '代码页'],
        series: [{ name: '占比', data: [10, 2, 2, 1] }],
      },
    },
    {
      type: 'table',
      title: '页型一览',
      headers: ['页型', '用途', '关键字段'],
      rows: [
        ['cover / end', '封面与结尾', 'title, subtitle'],
        ['section', '章节过渡', 'title'],
        ['content', '要点列表', 'bullets, step'],
        ['two-column', '对比呈现', 'left, right'],
        ['quote', '引用', 'quote, author'],
        ['code', '代码展示', 'code, language'],
        ['image / table / chart', '多媒体与数据', 'src / rows / chart'],
      ],
    },
    {
      type: 'diagram',
      title: '图示：想法到成片',
      diagram: {
        layout: 'dagre',
        layoutDir: 'LR',
        nodes: [
          { id: 'idea', x: 0, y: 0, label: '一个想法', fill: '#61b0f1' },
          { id: 'config', x: 0, y: 0, label: 'config.ts' },
          { id: 'ai', x: 0, y: 0, label: '需要 AI 修改吗？', shape: 'diamond' },
          { id: 'human', x: 0, y: 0, label: '编辑器人工把关', shape: 'double-rect' },
          { id: 'deck', x: 0, y: 0, label: '演示文稿' },
          { id: 'video', x: 0, y: 0, label: 'webm 视频' },
        ],
        edges: [
          { source: 'idea', target: 'config' },
          { source: 'config', target: 'ai' },
          { source: 'ai', target: 'human', label: '是' },
          { source: 'human', target: 'config', dashed: true },
          { source: 'ai', target: 'deck', label: '否' },
          { source: 'deck', target: 'video' },
        ],
      },
      notes: 'X6 图：dagre 自动布局（LR），菱形判断 + 双框过程 + 回环边。',
    },
    { type: 'section', title: '开始使用' },
    {
      type: 'content',
      title: '快捷键',
      bullets: [
        '→ / 空格：下一页（或下一条）',
        '←：上一页（或上一条）',
        'Home / End：跳到首尾页',
        'F：全屏 · G：概览 · S：演讲者视图 · P：打印导出',
      ],
    },
    {
      type: 'content',
      title: 'AI 成片',
      step: true,
      narration:
        'AI 成片三步走。第一步，点击录制成片，选择整个屏幕或当前标签页。第二步，演示自动播放，每页旁白自动朗读，自动翻页。第三步，放映结束，视频自动下载，无需剪辑。',
      bullets: [
        '点「录制成片」→ 选屏幕/标签页',
        '自动放映：旁白朗读 + 自动翻页，逐条动画自动展开',
        '结束自动停止，webm 视频自动下载',
      ],
    },
    {
      type: 'end',
      title: 'Thanks',
      subtitle: 'fork it, hack it, present it',
    },
  ],
}

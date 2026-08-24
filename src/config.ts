import type { PPTConfig } from './types'

/**
 * 基于 manuscripts/README.md 的第二份演绎（v2 工作流：澄清→叙事→生成→质量闸）。
 * 与 22 页全景版不同：本版走「现场排查」叙事弧——从一条启动日志出发，
 * 逐层回答"卡在哪/为什么/怎么修"，15 页，节奏更紧。
 * 澄清参数（人工代入）：style=tech-share / audience=内部工程分享 /
 * duration=20min→13页 / material=manuscripts/README.md / hard=覆盖五节结论。
 */
export const CONFIG: PPTConfig = {
  title: 'Odoo 起不来？——19 CE 启动链现场排查',
  author: 'Abel-数字牧民',
  themePreset: 'tech-share',
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
      title: 'Odoo 起不来？',
      subtitle: '19 CE 启动链现场排查 · 从一行日志定位到修复 · 源码基准 11f6e1f6',
      tag: '内部工程分享 · 20 分钟',
      narration:
        '开场抛一个大家都遇过的场景：odoo-bin 敲下去，进程转两圈没了，或者卡在某一行不动。今天不讲架构图，讲现场——怎么从日志反推卡在哪一层，为什么，怎么修。',
      notes: '目的：钩子——用"起不来"痛点抓住注意力。转场：先看一个真实日志序列。',
    },
    {
      type: 'content',
      tag: '钩子 · 现场还原',
      title: '一条卡住的启动日志',
      step: true,
      bullets: [
        '版本行 ✓ · addons 路径 ✓',
        '数据库连接串 ✓',
        'HTTP running on :8069 ✓',
        'loading 1 modules...',
        '——然后？没有然后了',
      ],
      narration:
        '这是空库首次启动的真实日志：横幅正常、HTTP 已监听、开始装模块，然后永远停住。注意没有报错，也没有下文。如果是你，下一步查什么？',
      notes: '目的：制造悬念——日志"正常"却卡死。转场：答案藏在启动链的分阶段模型里。',
    },
    {
      type: 'section',
      title: '排查的心智模型',
      subtitle: '启动不是一件事，是五件事',
      narration: '要定位卡点，先得知道进程在这条链上走到了哪一格。',
      notes: '目的：定调——给出全篇的地图。转场：看链路全景。',
    },
    {
      type: 'diagram',
      tag: '心智模型',
      title: '五段启动链',
      diagram: {
        layout: 'dagre',
        layoutDir: 'LR',
        nodes: [
          { id: 'cfg', x: 0, y: 0, label: '① 读配置·横幅', fill: '#5b8af8' },
          { id: 'db', x: 0, y: 0, label: '② 数据库存在性' },
          { id: 'swm', x: 0, y: 0, label: '③ 进程级模块' },
          { id: 'http', x: 0, y: 0, label: '④ 进程模型·绑端口' },
          { id: 'reg', x: 0, y: 0, label: '⑤ Registry 预热', fill: '#e06c5a' },
        ],
        edges: [
          { source: 'cfg', target: 'db' },
          { source: 'db', target: 'swm' },
          { source: 'swm', target: 'http' },
          { source: 'http', target: 'reg' },
        ],
      },
      narration:
        '五段链：配置横幅、数据库检查、进程级模块、绑端口、Registry 预热。刚才的日志停在第五格——模块装到一半。排查方法就是：日志走到哪一格，问题就在那一格与下一格之间。',
      notes: '目的：给出可复用的定位法。转场：逐格过一遍每格的"正常长什么样"。',
    },
    {
      type: 'table',
      tag: '① 读配置',
      title: '第一格的两条红线',
      headers: ['信号', '后果', '处置'],
      rows: [
        ['root 运行', '仅警告，不拦', '可以继续跑'],
        ['db_user=postgres', '直接 exit(1)', '换业务账号'],
        ['横幅没打出来', '配置文件就没读到', '先查 -c 参数'],
      ],
      narration:
        '第一格看配置：root 只是警告；db_user 写成 postgres 是硬红线直接退出——因为它该是超级用户专用。横幅能打出来，说明配置解析已经成功，这一格就过了。',
      notes: '目的：第一格快速通过。转场：第二格开始接触数据库。',
    },
    {
      type: 'two-column',
      tag: '② 数据库',
      title: '空库的命运分岔',
      left: {
        title: '库不存在',
        bullets: ['自动建空库', '置 init["base"]=True', '本轮走安装路径'],
      },
      right: {
        title: '库已存在',
        bullets: ['什么都不做', '不重装用户', '直接进预热'],
      },
      narration:
        '第二格检查 db_name 里的每个库：不存在就建空库并标记要装 base；已存在就跳过。权限不够建库只打 INFO 不中止。我们卡住的场景正是左列——空库走进安装路径后的岔路。',
      notes: '目的：指出卡点在左列下游。转场：真正装模块的是 Registry。',
    },
    {
      type: 'code',
      tag: '⑤ Registry · 根因',
      title: '卡住的那行代码',
      filename: 'odoo/modules/loading.py',
      language: 'py',
      code: `if not initialized and not update_module:
    _logger.error(
        "Database %s not initialized, "
        "you can force it with -i base", db_name)
    return   # ← 就是这里：ERROR 后返回，
            #   不进服务循环，进程"安静地"结束`,
      narration:
        '回到开头的卡死现场：空库未初始化，又没带 dash i base，load modules 打一行 ERROR 就 return——不进服务循环。日志里那一行 ERROR 很容易在滚动中被忽略，于是看起来像"卡住"。修复：启动命令补上 dash i base。',
      notes: '目的：全篇核心一页——根因揭晓。转场：把它变成两条通用守则。',
    },
    {
      type: 'quote',
      quote: '空库不会自愈：没有 -i base，它永远不会变成"已初始化"。',
      author: '排查守则其一',
      narration:
        '第一句守则：空库不会自愈。指望重启解决是没用的，初始化必须显式触发。',
      notes: '目的：把根因压缩成记忆点。转场：守则其二关于日志。',
    },
    {
      type: 'content',
      tag: '守则其二',
      title: '怎么判断"已经起来了"',
      bullets: [
        'HTTP service running on :8069',
        'Modules loaded.',
        'Registry loaded in X.XXXs',
        '没有第三行「启动完成」口号',
      ],
      narration:
        '第二条守则：能接请求的标志就是这两行——HTTP 监听加 Registry loaded。没有单独的"启动完成"标语，不要等一行不存在的日志。',
      notes: '目的：给出明确的"完成"判据。转场：转折——服务起来后还有一个更隐蔽的坑。',
    },
    {
      type: 'section',
      title: '起来了 ≠ 想象中那样',
      subtitle: '登录页背后的用户谜题',
      narration: '进程正常了，新的困惑来了：登录用什么账号？演示数据勾不勾有什么区别？',
      notes: '目的：转折段——从启动问题切到用户问题。转场：三用户表。',
    },
    {
      type: 'table',
      tag: '④ 默认用户',
      title: '库里其实有三个用户',
      headers: ['login', '密码', '给人用？', '真实身份'],
      rows: [
        ['__system__', 'NULL', '否·归档', 'SUPERUSER_ID 技术超管'],
        ['admin', 'admin', '是', 'Administrator（改口令！）'],
        ['public', '空', '否·归档', '网站匿名会话'],
      ],
      narration:
        '不装演示也有三个用户：系统账号归档无密码，是 ORM 的超级用户；admin 是唯一给人登录的，XML 默认口令就是 admin，务必改掉；public 服务网站匿名。界面用户列表只显示 Administrator，但另外两个真实存在。',
      notes: '目的：破除"没演示就没用户"的误解。转场：网页建库会改写 admin。',
    },
    {
      type: 'code',
      tag: '④ 默认用户',
      title: '网页建库时的口令覆盖',
      filename: 'odoo/service/db.py:91-98',
      language: 'py',
      code: `values = {'password': user_password, 'lang': lang}
if login:
    values['login'] = login
env.ref('base.user_admin').write(values)

# 命令行 -i base 不走这条路
# → 仍是 admin / admin`,
      narration:
        '数据库管理器建库时，表单里的登录名和密码会写到 user_admin 上。但命令行 dash i base 初始化不走这条路——口令保持 admin admin。这就是为什么手测库用 admin 能登，而有人以为"没设过密码怎么登得进去"。',
      notes: '目的：解释两种初始化路径的口令差异。转场：收束——带走的清单。',
    },
    {
      type: 'content',
      tag: '收束',
      title: '现场排查四步卡',
      layout: 'card',
      bullets: [
        '卡住先定位：日志停在五段链哪一格',
        '空库 + 无 -i base = ERROR 静默返回',
        '起来了看两行：HTTP + Registry loaded',
        'admin/admin 只在命令行初始化时成立',
      ],
      narration:
        '带走四步卡：定位卡在哪一格；空库必须显式初始化；完成的判据是那两行日志；默认口令取决于初始化路径。下次 Odoo 起不来，按卡走一遍。',
      notes: '目的：收束——可贴在工位的速查卡。转场：结尾。',
    },
    {
      type: 'end',
      title: '排查愉快',
      subtitle: 'manuscripts/README.md · 五节完整版随时可查',
      takeaways: [
        '启动是五段链，不是一件事',
        '静默卡死九成是空库未初始化',
        '给人登录的只有 Administrator',
      ],
      narration: '谢谢。完整研究文档在 manuscripts 目录，五节细节都在。',
      notes: '目的：收尾并给出延伸阅读入口。',
    },
  ],
}

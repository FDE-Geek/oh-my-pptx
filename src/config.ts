import type { PPTConfig } from './types'

export const CONFIG: PPTConfig = {
  title: 'Odoo 19 CE 启动链',
  author: 'abel',
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
      title: 'Odoo 19 CE 启动链',
      subtitle: '从 odoo-bin 到接住第一个请求 · ThreadedServer 主线',
      narration:
        '大家好。这次我们把 Odoo 19 社区版启动时的完整链路过一遍：入口在 cli 的 server 命令，主线落在 service 模块，日常零 worker 跑的是 ThreadedServer。',
    },
    {
      type: 'diagram',
      title: '启动链全景',
      diagram: {
        layout: 'dagre',
        layoutDir: 'LR',
        nodes: [
          { id: 'cli', x: 0, y: 0, label: 'cli/server.py', fill: '#5b8af8' },
          { id: 'conf', x: 0, y: 0, label: '读配置 · 打横幅' },
          { id: 'db', x: 0, y: 0, label: '数据库存在性' },
          { id: 'sw', x: 0, y: 0, label: '进程级模块 base/rpc/web', shape: 'double-rect' },
          { id: 'srv', x: 0, y: 0, label: '选进程模型 · 绑 HTTP' },
          { id: 'reg', x: 0, y: 0, label: '预热 Registry', shape: 'double-rect' },
          { id: 'loop', x: 0, y: 0, label: '常驻服务循环', fill: '#2e8a7a' },
        ],
        edges: [
          { source: 'cli', target: 'conf' },
          { source: 'conf', target: 'db' },
          { source: 'db', target: 'sw' },
          { source: 'sw', target: 'srv' },
          { source: 'srv', target: 'reg' },
          { source: 'reg', target: 'loop' },
        ],
      },
      narration:
        '先看全景：七个阶段串成一条线。配置与横幅、数据库检查、进程级模块、进程模型与端口绑定、Registry 预热，最后进入常驻循环。下面逐段展开。',
    },
    {
      type: 'section',
      title: '阶段一 · 读配置',
      subtitle: '解析参数，亮出身份',
      narration: '第一阶段，读配置、打横幅。这一步决定后面所有行为。',
    },
    {
      type: 'content',
      title: '读配置、打横幅',
      step: true,
      bullets: [
        '解析命令行 / 配置文件，装 logging',
        'root 用户只警告，不阻止',
        'db_user=postgres 直接退出',
        'INFO 打版本、配置、连接串',
        '有 replica 再补一行',
      ],
      narration:
        '解析命令行和配置文件，装配日志系统。用 root 跑只会警告；但 db_user 设成 postgres 会直接退出，这是安全底线。横幅用 INFO 级别打出版本、配置文件路径、addons 路径、数据库连接串，配置了只读副本的话再补一行。',
    },
    {
      type: 'content',
      title: '数据库是否存在',
      step: true,
      bullets: [
        '对 db_name 里每个库逐个检查',
        '不存在 → 建空库并置 init["base"]=True',
        '已存在 → 跳过',
        '建库权限不够只打 INFO，不中止',
      ],
      narration:
        '接下来对配置里的每个库名做存在性检查。库不存在就建一个空库，并标记下一步要初始化 base 模块；库已存在直接跳过。权限不够建不了库也只记一条 INFO，不会中断启动。',
    },
    {
      type: 'section',
      title: '阶段二 · 进程与端口',
      subtitle: '进程级模块 · 进程模型 · HTTP 绑定',
      narration: '第二阶段，还没连业务库：先做进程级模块加载，再选进程模型、绑端口。',
    },
    {
      type: 'two-column',
      title: '进程级模块 vs 按库装模块',
      left: {
        title: 'load_server_wide_modules()',
        bullets: [
          '进程级 import，不属于任何库',
          '默认加载 base、rpc、web',
          '可用 --load 改列表',
        ],
      },
      right: {
        title: 'Registry.load_modules()',
        bullets: [
          '按库执行，稍后预热阶段才跑',
          '读 ir.module.module 已安装集',
          '-i / -u / --reinit 触发升级',
        ],
      },
      narration:
        '容易混淆的两个概念：进程级模块加载是 import，默认装 base、rpc、web 三个，用 dash load 可以改；而按库装模块发生在后面的 Registry 预热，依据是库里 ir dot module dot module 记录的已安装集合。',
    },
    {
      type: 'table',
      title: '选进程模型',
      headers: ['启动条件', '进程模型', '备注'],
      rows: [
        ['默认（--workers 0）', 'ThreadedServer', '日常开发主线'],
        ['Linux 64 位', 'glibc M_ARENA_MAX=2', '压虚拟内存'],
        ['--workers N', 'PreforkServer', '多进程预派生'],
        ['gevent', 'GeventServer', '长轮询协作调度'],
        ['--dev=reload', 'inotify/watchdog', '文件变化自动重启'],
      ],
      narration:
        '进程模型按参数选择：日常零 worker 是 ThreadedServer；Linux 64 位下还会把 glibc 的 arena 上限收到 2 来压虚拟内存。指定 workers 走 Prefork 预派发；gevent 场景走 GeventServer；dev reload 用 inotify 或 watchdog 监听文件变化。HTTP 开着就会绑端口，日志里会看到 werkzeug 运行在 8069 这一行。',
    },
    {
      type: 'section',
      title: '阶段三 · Registry 预热',
      subtitle: '每个预加载库一次 Registry.new(dbname)',
      narration: '第三阶段是启动链的重头戏：为每个预加载库构建一次 Registry。',
    },
    {
      type: 'content',
      title: 'Registry.new(dbname) 做什么',
      step: true,
      bullets: [
        '建连接、初始化 signaling',
        '确认库已初始化，先装 base',
        '再按 ir.module.module 装已装模块',
        '-i / -u / --reinit 才升级安装',
        '结束打 Modules loaded 与耗时',
      ],
      narration:
        'Registry 点 new 负责建连接和 signaling；随后 load_modules 先确认库已初始化，装上 base，再把库里登记过的已安装模块依次装载。只有带 dash i、dash u 或 reinit 参数才会走升级路径并打 updating modules list。收尾两行日志是 Modules loaded 和 Registry loaded 耗时。',
    },
    {
      type: 'content',
      title: '两个失败边界',
      bullets: [
        '没带 -i base 且库未初始化 → ERROR 后返回',
        '此时不进服务循环，进程结束',
      ],
      narration:
        '注意一个失败边界：如果库没有初始化过，又没有显式带 dash i base，启动会在 ERROR 后直接返回，不会进入服务循环。这也是空库首次启动必须指定初始化参数的原因。',
      notes: '排查「起不来」问题时先看是不是踩了这个边界。',
    },
    {
      type: 'section',
      title: '阶段四 · 常驻',
      subtitle: 'cron 线程 · 信号等待 · stop-after-init',
      narration: '最后一个阶段：进入常驻。',
    },
    {
      type: 'content',
      title: '常驻服务循环',
      step: true,
      bullets: [
        '起 cron 线程，数量看 max_cron_threads',
        '主线程阻塞等 SIGINT / SIGTERM',
        '信号再来一次才强退',
        '--stop-after-init 预热完就退出',
        '测试与模块升级常用此参数',
      ],
      narration:
        '常驻阶段先拉起 cron 线程，数量看 max_cron_threads；主线程挂起等待中断或终止信号，再来一次信号才强制退出。如果带了 stop after init，预热完成就退出，测试和模块升级场景经常用。',
    },
    {
      type: 'content',
      title: '日常启动日志节奏',
      layout: 'card',
      bullets: [
        '版本 → addons 路径',
        '数据库连接信息',
        'HTTP 已监听 8069',
        'loading N modules...',
        'Modules loaded 耗时行',
      ],
      narration:
        '对照日常日志节奏：版本、addons 路径、数据库连接、HTTP 监听、逐模块加载、最后 Registry loaded。没有单独的启动完成标语——看到 HTTP 那行加 Registry loaded，就表示可以接请求了。',
    },
    {
      type: 'end',
      title: 'Thanks',
      subtitle: 'cli/server.py → service/server.py · ThreadedServer 主线',
      narration: '启动链到此。谢谢。',
    },
  ],
}

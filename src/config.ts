import type { PPTConfig } from './types'

export const CONFIG: PPTConfig = {
  title: 'Odoo 19 CE 进程启动与数据库初始化',
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
      title: 'Odoo 19 CE 进程启动与数据库初始化',
      subtitle: '源码为唯一事实依据 · odoo/odoo 19.0 @ 11f6e1f6 · 五节速览',
      narration:
        '这次分享基于 Odoo 19 社区版源码，把两件事讲透：进程启动时做了什么，以及建库装 base 时默认有哪些用户。结论先行，细节在后。',
      notes: '源码基准：本地树 /home/abel/EA/odoo-19-ce；引用格式 文件路径:行号。',
    },
    {
      type: 'content',
      title: '核心结论一页速览',
      step: true,
      layout: 'card',
      bullets: [
        '启动 ≠ 装全部模块',
        '可接请求：HTTP 行 + Registry loaded',
        '空库自动建并 init base',
        '默认用户与演示无关',
        '给人登录的只有 Administrator',
        '网页建库覆盖 admin 口令',
      ],
      narration:
        '六条核心结论：启动不是装一遍全部模块，而是分阶段推进；能接请求的标志是 HTTP 那行加 Registry loaded；配置里的库不存在就建空库并初始化 base；默认用户来自正式数据，和演示数据无关；给人登录的只有 Administrator，另外两个是技术账号；网页建库时填的登录名密码会覆盖 XML 默认的 admin admin。',
      notes: '对应 README「核心结论（一页速览）」。',
    },
    {
      type: 'section',
      title: '1 · 进程启动链路',
      subtitle: 'cli/server.py → service/server.py 主线',
      narration: '第一节，进程启动链路。入口是 odoo-bin 默认命令，主线落在 service/server。',
    },
    {
      type: 'diagram',
      title: '启动链全景',
      diagram: {
        layout: 'dagre',
        layoutDir: 'TB',
        nodes: [
          { id: 'cfg', x: 0, y: 0, label: 'parse_config + logging', fill: '#5b8af8' },
          { id: 'sec', x: 0, y: 0, label: '安全检查（root/pg 用户）', shape: 'diamond' },
          { id: 'banner', x: 0, y: 0, label: 'report_configuration 横幅' },
          { id: 'emptydb', x: 0, y: 0, label: '对 db_name 建空库' },
          { id: 'start', x: 0, y: 0, label: 'server.start(preload)', shape: 'double-rect' },
          { id: 'swm', x: 0, y: 0, label: 'load_server_wide_modules' },
          { id: 'http', x: 0, y: 0, label: '选模型 · 绑 HTTP' },
          { id: 'reg', x: 0, y: 0, label: 'preload_registries', shape: 'double-rect' },
          { id: 'cron', x: 0, y: 0, label: 'cron_spawn · 等信号', fill: '#2e8a7a' },
        ],
        edges: [
          { source: 'cfg', target: 'sec' },
          { source: 'sec', target: 'banner' },
          { source: 'banner', target: 'emptydb' },
          { source: 'emptydb', target: 'start' },
          { source: 'start', target: 'swm' },
          { source: 'swm', target: 'http' },
          { source: 'http', target: 'reg' },
          { source: 'reg', target: 'cron' },
        ],
      },
      narration:
        '链路九步：解析配置装日志，安全检查是个菱形判断，root 只警告但 db_user 是 postgres 直接退出；打配置横幅；对 db_name 里的库建空库；进入 server.start；先加载 server-wide 模块；再选进程模型绑 HTTP；对每个预加载库做 Registry 预热；最后拉起 cron、主线程等信号。',
    },
    {
      type: 'content',
      title: '配置与安全检查',
      step: true,
      bullets: [
        'root 运行：stderr 警告，不中止',
        'db_user=postgres：直接 exit(1)',
        '横幅先于连库与装模块',
        '建空库权限不够只打 INFO',
      ],
      narration:
        '配置阶段两条安全底线：POSIX 下用 root 跑只警告不拦；但数据库用户是 postgres 会直接退出，因为它该是超级用户专用。横幅在连库装模块之前就打出来。建空库时权限不够也只是 INFO 提示，不会中断启动。',
      notes: 'odoo/cli/server.py:31-44（安全）、:101-113（空库）。',
    },
    {
      type: 'code',
      title: 'Server-wide 模块：进程级 import',
      filename: 'odoo/tools/config.py:30',
      language: 'py',
      code: `DEFAULT_SERVER_WIDE_MODULES = ['base', 'rpc', 'web']

# load_server_wide_modules() 按 config['server_wide_modules']
# **import** 模块（odoo/service/server.py:1486）
# —— 是进程级加载，不是按库安装 ir.module.module
# 可用 --load 改列表；web 失败时提示检查 addons_path`,
      narration:
        'server-wide 模块默认是 base、rpc、web 三个，这是进程级 import，跟按库安装模块是两码事。注意 web 加载失败时，日志会提示检查 addons 路径。',
    },
    {
      type: 'table',
      title: '选进程模型',
      headers: ['条件', '实现', '场景'],
      rows: [
        ['odoo.evented', 'GeventServer', '长轮询 / gevent'],
        ['--workers N（N>0）', 'PreforkServer', '生产多进程'],
        ['否则（日常）', 'ThreadedServer', '本地默认'],
        ['Linux 64 位', 'M_ARENA_MAX=2', '压虚拟内存'],
        ['--dev=reload', 'inotify/watchdog', '改文件自动重启'],
      ],
      narration:
        '进程模型按配置选择：gevent 场景走 GeventServer；指定 workers 走 Prefork 预派发；日常零 worker 是 ThreadedServer。Linux 64 位线程模式还会把 glibc 的 arena 上限收到 2 压虚拟内存。dev reload 用 inotify 或 watchdog，缺依赖会降级并给 WARNING。',
    },
    {
      type: 'content',
      title: 'Registry 预热四步',
      step: true,
      bullets: [
        '进入进程内 LRU，setup_signaling',
        '清半升级标记，必要时强制更新',
        'load_modules：先 base 再已装模块',
        'ready → Registry loaded 计时行',
      ],
      narration:
        'Registry 点 new 四步：先进进程内 LRU 并建立 signaling；如果库里有半升级标记就清掉，清过则强制走更新；然后 load_modules 装模块，先装 base 再按已装清单循环；最后 ready 置真，打出 Registry loaded 耗时。',
      notes: 'odoo/orm/registry.py:113-215。',
    },
    {
      type: 'table',
      title: 'load_modules 步骤表',
      headers: ['步', '做什么'],
      rows: [
        ['未初始化且无 update', 'ERROR 后返回，不进服务循环'],
        ['未初始化且要更新', '跑 base_data.sql 初始化'],
        ['STEP 1', '先装 base（依赖图根）'],
        ['STEP 2', 'updating modules list → 装载'],
        ['STEP 3', '循环装 ir.module.module 已标记项'],
        ['收尾', 'Modules loaded.'],
      ],
      narration:
        'load_modules 的判定表：库未初始化又没带更新参数，直接 ERROR 返回，这就是空库起不来必须加 dash i base 的原因；要初始化就先跑 base data SQL；然后三步走——先装 base、更新模块列表、循环装已标记模块；收尾打 Modules loaded。',
      notes: 'odoo/modules/loading.py。',
    },
    {
      type: 'section',
      title: '2 · 启动日志对照',
      subtitle: '没有「启动完成」口号',
      narration: '第二节，把日志节奏对上源码行为。',
    },
    {
      type: 'content',
      title: '日志里看什么',
      layout: 'card',
      bullets: [
        '横幅：版本 / 配置 / addons 路径',
        'database: user@host:port',
        'HTTP service running on :8069',
        'loading N modules...',
        'Modules loaded + Registry 计时',
      ],
      narration:
        '横幅先打版本、配置文件、addons 路径、数据库连接串；随后 HTTP 监听那行、模块加载计数、Modules loaded 和 Registry loaded。要点：没有第三行就绪标语——HTTP 已监听加 Registry loaded，就表示可以接请求了。',
      notes: '升级/安装时额外有 Initializing database、updating modules list。',
    },
    {
      type: 'section',
      title: '3 · 数据库何时算初始化',
      subtitle: '两套入口，同归「空库 + 装 base」',
      narration: '第三节，数据库初始化的两套入口与种子数据。',
    },
    {
      type: 'two-column',
      title: '两套建库入口',
      left: {
        title: '启动时自动建空库',
        bullets: [
          '对 db_name 逐库 _create_empty_database',
          '成功则 init["base"]=True',
          '已存在的库什么都不做',
          '不会因「没演示」重装用户',
        ],
      },
      right: {
        title: '网页 / RPC 建库',
        bullets: [
          'GET /web/database/manager 出表单',
          'POST create → dispatch_rpc db.create',
          '_initialize_db 带 demo / lang 参数',
          '登录名密码写到 base.user_admin',
        ],
      },
      narration:
        '两套入口：启动时对配置里的库名自动建空库并标记初始化 base，已存在的库完全不动；网页建库走数据库管理器表单，底层同样先建空库再初始化，但会把表单里的登录名和密码写到 user_admin 上。demo 参数只影响各模块演示数据是否加载，不决定用户创建。',
    },
    {
      type: 'table',
      title: 'base_data.sql 立即插入的五行',
      headers: ['表', 'xmlid', '要点'],
      rows: [
        ['res_currency', 'base.USD', '美元'],
        ['res_company', 'base.main_company', 'My Company'],
        ['res_partner', 'base.main_partner', '公司伙伴'],
        ['res_users', 'base.user_root', 'login=__system__ 归档'],
        ['res_groups', 'base.group_user', 'Employee 组'],
      ],
      narration:
        '初始化时先跑 base data SQL，落五行最小骨架：美元币种、主公司、公司伙伴、id 为 1 的系统用户——注意它 login 是双下划线 system、已归档、无密码；还有 Employee 组。随后 XML 正式数据再补全管理员等记录。',
      notes: 'base_data.sql:122-140。',
    },
    {
      type: 'section',
      title: '4 · 默认用户',
      subtitle: '不装演示也有三个用户',
      narration: '第四节，最容易被误解的默认用户问题。',
    },
    {
      type: 'table',
      title: '正式数据里的三个用户',
      headers: ['xmlid', 'login', '密码', 'active', '用途'],
      rows: [
        ['base.user_root', '__system__', 'NULL', '否', '技术超管 SUPERUSER_ID'],
        ['base.user_admin', 'admin', 'admin', '是', '给人用的管理员'],
        ['base.public_user', 'public', '空', '否', '网站匿名会话'],
      ],
      narration:
        '正式数据三个用户：id 为 1 的系统账号，归档无密码，是 ORM 里的超级用户但不给人登录；id 为 2 的 admin 是唯一给人用的管理员，XML 默认口令也是 admin，务必修改；id 为 3 的 public 用户服务网站匿名会话，归档空密码。这三行都来自 data 目录，跟演示无关。',
      notes: 'res_users_data.xml 属 data:（noupdate），不是 demo:。',
    },
    {
      type: 'two-column',
      title: '演示数据才多出来的账号',
      left: {
        title: '勾演示才有的 login',
        bullets: [
          'demo / demo：内部用户 Marc Demo',
          'portal / portal：门户 Joel Willis',
          '管理员伙伴变 Mitchell Admin',
          '公司改 YourCompany 样例',
        ],
      },
      right: {
        title: '不勾演示',
        bullets: [
          '没有 demo / portal 账号',
          '管理员仍叫 Administrator',
          '公司保持 My Company',
          '界面用户列表只见 Administrator',
        ],
      },
      narration:
        '对比演示与不演示：勾了演示多出 demo 和 portal 两个登录，管理员伙伴改叫 Mitchell Admin，公司变成 YourCompany 样例；不勾演示这些都没有，管理员还是 Administrator，用户列表里也只见他一个——但库里仍藏着系统账号和公共账号两个技术用户。',
    },
    {
      type: 'code',
      title: '网页建库如何改 admin',
      filename: 'odoo/service/db.py:91-98',
      language: 'py',
      code: `values = {'password': user_password, 'lang': lang}
if login:
    values['login'] = login
    # login 里若像邮箱，顺带写 email
env.ref('base.user_admin').write(values)

# 主密码（master pwd）是管理多库的配置项
# 不是 res.users 的登录密码`,
      narration:
        '网页建库覆盖口令的机制很简单：初始化完成后把表单的密码语言、登录名直接写到 user_admin。注意主密码是多库管理配置，别和登录密码混淆。命令行 dash i base 不走这条路，所以还是 admin admin 默认口令。',
    },
    {
      type: 'section',
      title: '5 · 实战含义',
      subtitle: '手测 · 空壳库 · 自动化登录',
      narration: '最后落到实战：这些机制对本地手测和 OdooThink 意味着什么。',
    },
    {
      type: 'content',
      title: '五条实战守则',
      step: true,
      bullets: [
        '空壳库也有 admin，别假设没有用户',
        '引导写公司改的是伙伴，不是造用户',
        '自动化别写死 demo / portal',
        '卡住先看 HTTP 行与 Registry loaded',
        '空库缺 -i base 不会自愈',
      ],
      narration:
        '五条守则：空壳库也能用 admin 登录，不要假设没有用户；引导脚本写公司信息改的是公司和伙伴，不是在造第一个用户；自动化登录别写死 demo 或 portal，无演示库会失败；启动卡住先看有没有 HTTP 行和 Registry loaded；空库缺了 dash i base 永远不会自己变成已初始化。',
      notes: 'OKEE/网关连已存在的库，会话走 user_admin 而非 __system__。',
    },
    {
      type: 'table',
      title: '主要源码索引',
      headers: ['主题', '路径'],
      rows: [
        ['CLI 入口', 'odoo/cli/server.py'],
        ['HTTP / cron / 预热', 'odoo/service/server.py'],
        ['建库 RPC', 'odoo/service/db.py'],
        ['Registry', 'odoo/orm/registry.py'],
        ['SQL 种子', 'base/data/base_data.sql'],
        ['用户正式数据', 'base/data/res_users_data.xml'],
      ],
      narration: '源码索引表在此，感兴趣的同学按图索骥。谢谢大家。',
    },
    {
      type: 'end',
      title: 'Thanks',
      subtitle: 'Odoo 19 CE · 启动链与初始化 · 源码基准 11f6e1f6',
      narration: '谢谢。',
    },
  ],
}

# Odoo 19 CE 进程启动与数据库初始化

> 以 **Odoo 19 Community Edition** 源码为唯一事实依据，说明进程启动时做了什么、打什么日志，以及建库 / 装 `base` 时默认有哪些用户（含「不装演示数据」）。
>
> 源码基准：`odoo/odoo 19.0`（branch `19.0`，commit `11f6e1f6`，本地树 `/home/abel/EA/odoo-19-ce`）。
> 文中引用格式 `文件路径:行号` 均相对该源码根目录。
> 本目录为**研究性文档**，不属于 `docs/specs/` 开发约束基准，随源码版本演进可能过时。

## 核心结论（一页速览）

1. **启动不是「装一遍全部模块」**。进程先读配置、加载 **server-wide** 模块（默认 `base` / `rpc` / `web`），再绑 HTTP，再对预加载库做 `Registry.new` → `load_modules`。
2. **可接请求的标志**是日志里的 `HTTP service (werkzeug) running on …` 加上 `Modules loaded.` / `Registry loaded in …s`。没有单独的「启动完成」口号。
3. **空库 vs 已有库**：`db_name` 里列出的库若不存在，启动时会建空库并设 `init['base']=True`；已存在则跳过。未初始化且没有 `-i base` 会 ERROR 后返回，不进服务循环。
4. **演示数据与默认用户无关**。不勾演示也会有用户：它们来自 `base` 的 SQL 种子 + 正式 `data/`，不在 `demo/`。
5. **给人登录的只有 Administrator**。另两个是技术账号：`__system__`（id=1，归档）和 `public`（网站匿名会话，归档、空密码）。
6. **网页建库**会把表单里的登录名/密码写到 `base.user_admin` 上，覆盖 XML 默认的 `admin` / `admin`。

## 目录

| 节 | 主题 |
|----|------|
| [1](#1-进程启动链路) | 入口、配置横幅、进程模型、HTTP、Registry 预热、cron |
| [2](#2-启动时典型日志) | 日常 INFO 行对照 |
| [3](#3-数据库何时算初始化) | 空库、`base_data.sql`、`load_modules` 步骤 |
| [4](#4-默认用户不装演示也有) | 三用户表、演示多出来的账号、建库表单覆盖 |
| [5](#5-对本地与-okeethink-的含义) | 手测、空壳库、登录约定 |

---

## 1. 进程启动链路

入口：`odoo-bin` 默认命令 → `odoo/cli/server.py` 的 `main()`。

```
parse_config + logging
  → 安全检查（root 警告；db_user=postgres 则退出）
  → report_configuration()          # 版本 / 配置文件 / addons_path / PG 连接
  → 对 config['db_name'] 尝试建空库
  → 写 pidfile
  → server.start(preload=db_name)
       → load_server_wide_modules()
       → 选 Threaded / Prefork / Gevent
       → 绑 HTTP（若 http_enable）
       → preload_registries()       # Registry.new → load_modules
       → cron_spawn()               # 除非 --stop-after-init
       → 主线程等信号
```

### 1.1 配置与安全

| 步骤 | 位置 | 行为 |
|------|------|------|
| 解析参数 / 配置文件 | `odoo/cli/server.py:97` | `config.parse_config(args, setup_logging=True)` |
| root | `odoo/cli/server.py:31-34` | POSIX 且 uid=0：stderr 警告，不中止 |
| postgres 用户 | `odoo/cli/server.py:37-44` | `db_user` 或 `PGUSER` 为 `postgres`：**直接 exit(1)** |
| 横幅 | `odoo/cli/server.py:46-73` | 见 §2 |
| 空库 | `odoo/cli/server.py:101-113` | `_create_empty_database`；已存在则 `DatabaseExists` 忽略；权限不够只 INFO |

### 1.2 Server-wide 模块（尚未连业务库）

`load_server_wide_modules()`（`odoo/service/server.py:1486-1498`）按 `config['server_wide_modules']` **import** 模块。默认值：

```
DEFAULT_SERVER_WIDE_MODULES = ['base', 'rpc', 'web']
```

（`odoo/tools/config.py:30`，可用 `--load` 改。）

这是**进程级**加载，不是按库安装 `ir.module.module`。`web` 失败时日志会提示检查 `addons_path`。

### 1.3 进程模型与 HTTP

`server.start()`（`odoo/service/server.py:1581`）按配置选实现：

| 条件 | 实现 | 日常 |
|------|------|------|
| `odoo.evented` | `GeventServer` | 长轮询 / gevent |
| `--workers N`（N>0） | `PreforkServer` | 生产多进程 |
| 否则 | `ThreadedServer` | 本地默认 |

Linux 64 位线程模式会把 glibc `M_ARENA_MAX` 收到 2，压虚拟内存（`odoo/service/server.py:1597-1618`），除非已设环境变量 `MALLOC_ARENA_MAX`。

`--dev=reload` 时启 inotify/watchdog；缺依赖则 WARNING，自动重载关闭。

HTTP（`http_enable`）：

- 线程模式：`ThreadedServer.start` 里 `http_spawn()`（`odoo/service/server.py:612-638`），日志在 `ThreadedWSGIServerReloadable.server_bind`（`:273-277`）。
- Prefork：master 绑 socket（`:1056-1078`），worker 再接连接。

典型一行：

```
HTTP service (werkzeug) running on 0.0.0.0:8069
```

socket activation（`LISTEN_FDS` / systemd）则打 `running through socket activation`。

### 1.4 Registry 预热

`preload_registries(dbnames)`（`odoo/service/server.py:1515-1579`）对每个预加载库：

```
Registry.new(dbname, update_module=…, install_modules=init, upgrade_modules=update, reinit_modules=reinit)
```

`update_module` 在存在 `-i` / `-u` / `--reinit` 时为真。

`Registry.new`（`odoo/orm/registry.py:113-215`）：

1. 放入进程内 LRU，`setup_signaling()`。
2. 若库已初始化：清掉半升级标记 `base.partially_updated_database`；清到过则强制 `update_module=True`。
3. `load_modules(...)`（`odoo/modules/loading.py`）。
4. `ready=True`，`signal_changes()`，INFO：`Registry loaded in X.XXXs`。

`load_modules` 要点：

| 步 | 做什么 |
|----|--------|
| 未初始化且无 `update_module` | ERROR：`Database %s not initialized, you can force it with -i base`，返回 |
| 未初始化且要更新 | INFO：`Initializing database %s`，跑 `modules_db.initialize`（执行 `base/data/base_data.sql` 等） |
| STEP 1 | 先装 **`base`**（依赖图必须先有它） |
| STEP 2 | 若在升级/安装：`updating modules list`，再 `button_install` / `button_upgrade` |
| STEP 3 | 循环装 `ir.module.module` 里已标记的模块 |
| 收尾 | `Modules loaded.`；失败测试则 ERROR |

带 `--test-enable` 时，预热后还会跑 `post_install` 测试套件。

`--stop-after-init`：预热完停 HTTP / 退出（升级、CI、只初始化时常用）。否则线程模式再 `cron_spawn()`（`max_cron_threads` 条守护线程），主线程等 SIGINT/SIGTERM（再来一次才强退）。

---

## 2. 启动时典型日志

`report_configuration()`（`odoo/cli/server.py:46-73`）在连库、装模块之前就会打：

| 级别 | 内容 |
|------|------|
| INFO | `Odoo version %s` |
| INFO | `Using configuration file at %s`（仅当配置文件存在） |
| INFO | `addons paths: %s` |
| INFO | `upgrade path` / `extra upgrade scripts`（若配置了） |
| INFO | `database: user@host:port`（缺省显示 `default`，即走环境变量 / PG 默认） |
| INFO | `replica database: …`（配了 replica 或 `dev_mode` 含 `replica`） |
| WARNING | Python 版本高于 `odoo.release.MAX_PY_VERSION` |

之后常见：

```
HTTP service (werkzeug) running on 0.0.0.0:8069
loading N modules...
Modules loaded.
Registry loaded in X.XXXs
```

升级/安装时额外有 `Initializing database …`、`updating modules list`、`module foo: creating or updating database tables` 等。没有第三行「就绪」标语：**HTTP 已监听 + Registry loaded 即表示可以接请求**。

---

## 3. 数据库何时算初始化

两套入口，最后都落到「空库 + 装 `base`（及依赖）」。

### 3.1 启动时自动建空库

`main()` 对 `config['db_name']` 逐个 `_create_empty_database`。成功则 `config['init']['base'] = True`，本轮启动会走模块安装。库已存在则什么都不做——**不会**因为「没演示」而重装用户。

### 3.2 网页 / RPC 建库

网页管理页 `GET /web/database/manager`（`addons/web/controllers/database.py:65-69`）出表单；提交走 `POST /web/database/create`（同文件 `:71-81`，`dispatch_rpc('db', 'create_database', …)`）→ `odoo/service/db.py`：

```
exp_create_database(...)          # :177
  → _create_empty_database
  → _initialize_db(..., demo, lang, user_password, login, country_code, phone)
       → Registry.new(..., update_module=True, new_db_demo=demo)
       → 按国家写公司国家/币种/时区、电话、邮箱
       → 把 login / password / lang 写到 base.user_admin
```

`demo` 只影响 `new_db_demo`（各模块 `demo/` 是否加载），**不决定**是否创建 `user_admin`。

### 3.3 `base` 种子：先 SQL，再 XML data

库未初始化时 `modules_db.initialize` 执行 `odoo/addons/base/data/base_data.sql`（见 `odoo/modules/db.py`）。SQL 先落最小骨架，再被 `base` 的 `__manifest__.py` `data:` 列表里的 XML 补全。

`base_data.sql:122-140` 立刻插入：

| 表 | id | xmlid | 要点 |
|----|----|--------|------|
| `res_currency` | 1 | `base.USD` | USD |
| `res_company` | 1 | `base.main_company` | 名 `My Company` |
| `res_partner` | 1 | `base.main_partner` | 公司伙伴 |
| `res_users` | 1 | `base.user_root` | login=`__system__`，`active=false`，password=NULL |
| `res_groups` | 1 | `base.group_user` | Employee |

随后 XML（`data/res_partner_data.xml`、`data/res_users_data.xml`、`data/res_company_data.xml` 等）补 Administrator、Public user、System 伙伴，并把 `user_root` 的伙伴改到 `base.partner_root`。

`base` 的 `demo:`（`odoo/addons/base/__manifest__.py:80-88`）是另一批文件（`res_users_demo.xml` 等），**仅当建库勾选演示 / `with_demo` / `new_db_demo=True` 才加载**。

---

## 4. 默认用户：不装演示也有

### 4.1 正式数据里的三个用户

`odoo/addons/base/data/res_users_data.xml`（`noupdate="1"`，属 `data:` 不是 `demo:`）：

| xmlid | 典型 id | login | 密码 | active | 用途 |
|-------|---------|-------|------|--------|------|
| `base.user_root` | 1 | `__system__`（SQL 种子） | 无（NULL） | 否 | 技术超管 `SUPERUSER_ID`；伙伴 `System` / `odoobot@example.com`，已归档。不当人登录。 |
| `base.user_admin` | 2 | `admin` | `admin`（XML 默认） | 是 | **给人用的管理员**。伙伴名 `Administrator`。 |
| `base.public_user` | 3（顺序依赖） | `public` | 空 | 否 | 网站匿名会话。注释写「Avoid auto-including this demo user…」，但是正式 data，不是演示账号。 |

伙伴对照（`data/res_partner_data.xml`）：

- `base.main_partner`：公司「My Company」
- `base.partner_root`：`System`，归档
- `base.partner_admin`：`Administrator`
- `base.public_partner`：`Public user`，归档

`user_admin` 的 `group_ids` 在 XML 里先清空，再由 `security/base_groups.xml` 把 Settings / 管理组链上 `user_root` 与 `user_admin`。

### 4.2 演示数据才多出来的账号

`data/res_users_demo.xml`（仅 `demo:`）：

| xmlid | login | 密码 | 说明 |
|-------|-------|------|------|
| `base.user_demo` | `demo` | `demo` | 内部用户 Marc Demo |
| `base.demo_user0` | `portal` | `portal` | 门户 Joel Willis |

演示还会把管理员伙伴改成 **Mitchell Admin**（美国样例地址、`admin@yourcompany.example.com`），并把主公司从「My Company」改成 YourCompany 样例（仅当公司名仍是 `My Company`）。

**不勾演示：没有 `demo` / `portal`，管理员仍叫 Administrator，不是 Mitchell。**

### 4.3 网页建库如何改 admin

`_initialize_db`（`odoo/service/db.py:91-98`）在 Registry 装完后：

```python
values = {'password': user_password, 'lang': lang}
if login:
    values['login'] = login
    # login 里若像邮箱，顺带写 email
env.ref('base.user_admin').write(values)
```

因此：

- 数据库管理器里填的「邮箱 / 登录」和密码 → 覆盖 `admin` / `admin`。
- 命令行 `-i base`、不经过管理器 → 仍是 XML 默认 `admin` / `admin`（务必改掉）。
- 主密码（master password）是**管理多库**的配置项，不是 `res.users` 的登录密码。

### 4.4 登录面怎么理解「有没有用户」

界面设置里「用户」列表通常只显示 **内部用户且 active**。不装演示时，列表里往往只看见 **Administrator**。`__system__` 与 `public` 已归档，默认不出现，但库里存在，网站/ORM 会用到。

---

## 5. 对本地与 OdooThink 的含义

- 手测「空壳」库：不装演示也能 `admin` 登录（或建库表单给定的登录名）。不要假设没有用户。
- 引导写入公司（如「手测写入空壳」）改的是 `res.company` / 伙伴，**不是**在造第一个用户。
- 自动化若写死 `demo` / `portal`，无演示库会失败；应走 `admin` 或建库时指定的登录。
- 启动卡住时先看：是否打出 HTTP 行、是否 `Registry loaded`、是否 `Database … not initialized`。缺 `-i base` 的空库不会自己变「已初始化」。
- 本仓库 OKEE / 网关连的是**已存在的 Odoo 19 CE 库**，不替代上述初始化；会话认证走的是 `user_admin` 这类真实 `res.users`，不是 `__system__`。

---

## 主要源码索引

| 主题 | 路径 |
|------|------|
| CLI 入口 | `odoo/cli/server.py` |
| HTTP / cron / 预热 | `odoo/service/server.py` |
| 建库 RPC | `odoo/service/db.py` |
| 网页建库 | `addons/web/controllers/database.py` |
| Registry | `odoo/orm/registry.py` |
| 装模块 | `odoo/modules/loading.py`、`odoo/modules/db.py` |
| SQL 种子 | `odoo/addons/base/data/base_data.sql` |
| 用户正式数据 | `odoo/addons/base/data/res_users_data.xml` |
| 用户演示数据 | `odoo/addons/base/data/res_users_demo.xml` |
| `base` 清单 | `odoo/addons/base/__manifest__.py` |

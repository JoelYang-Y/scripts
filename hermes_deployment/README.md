# 🚀 Hermes Agent 多 Bot 架构部署与灾备迁移 SOP

> **版本**：v3.0 · **基线**：2026-11-11 全量实测（宿主 Mac mini / macOS 27.2 / Hermes v0.23.0）
> **定位**：一台宿主上跑**单个 Hermes 运行时 + 5 个 profile 分身**的 AI 中枢，统一 DeepSeek 推理、共享 Mem0+Qdrant 长期记忆、共享单一技能库、由 default 网关统一调度全部 Cron。
> 本文件是本套件的**唯一权威部署口径**；任何与旧版（v2「Vertex AI 单 Bot + Gemini 3.7」）冲突之处，以本版为准。

---

## 📑 目录

- [0. 本版相对旧版的关键变更](#0-本版相对旧版的关键变更)
- [1. 架构总览与拓扑](#1-架构总览与拓扑)
- [2. 文件与目录结构](#2-文件与目录结构)
- [3. Profile 矩阵（多 Bot 分身）](#3-profile-矩阵多-bot-分身)
- [4. 场景一：全新机器从零部署 (Greenfield)](#4-场景一全新机器从零部署-greenfield)
- [5. 场景二：灾备恢复与迁移 (Restore)](#5-场景二灾备恢复与迁移-restore)
- [6. 核心子系统详解](#6-核心子系统详解)
- [7. 系统体检清单](#7-系统体检清单)
- [8. 已知坑与排错 FAQ](#8-已知坑与排错-faq)

---

## 0. 本版相对旧版的关键变更

| 维度 | 旧版口径（已失效） | 当前实测结构 |
|---|---|---|
| 推理主模型 | Vertex AI `google/gemini-3.7-flash`，fallback 混合 | **`deepseek-flash` / provider `deepseek` / `https://api.deepseek.com` / `chat_completions`**；`fallback_providers: []`（Vertex 配置已注释停用） |
| 形态 | 单 Bot | **1 运行时 + 5 个 profile 分身**（default / memory-keeper / mail-keeper / server-keeper / skill-keeper） |
| 技能库存放 | 单一 `~/.hermes/skills` 手工同步 | **`~/.hermes/skills` 为唯一物理库（107 个活跃技能 / 58 MB），靠 `skills.external_dirs` + 软链接只读分发；GitHub 仓库 `JoelYang-Y/hermes-skills` 每日自动镜像** |
| 技能数量 | 160+ | **107 个活跃 SKILL.md（另有 80 个已归档在 `.archive/`），37 个可见分类目录（28 个有内容、9 个空壳）** |
| Cron | 7 个（含 `15 */6` 记忆整理） | **15 个，分布在 4 个 profile**（default 10 / memory-keeper 2 / mail-keeper 1 / skill-keeper 2），default 网关统一调度 |
| 记忆并列集合 | 仅 `hermes_memories_v2_hybrid` | 活跃 2 个（`_hybrid` + `_v2_hybrid_entities`），**遗留 3 个未删**（`hermes_memories` / `hermes_memories_v2` / `hermes_memories_v2_entities`）；另有 `mem0migrations` / `midjourney` |
| 密钥必填项 | `GOOGLE_APPLICATION_CREDENTIALS` / `GOOGLE_API_KEY` | **`DEEPSEEK_API_KEY` 为核心必填**，Google 系已非必需 |
| 部署脚本 | 5 个脚本覆盖全流程 | 5 个脚本不变；**4 个配置模板已同步到当前结构**（DeepSeek 模型栈 / plugins / 记忆五要件 / Cron 10+5 分 profile），见 §2.2 |

---

## 1. 架构总览与拓扑

```text
                          ┌───────────────────────────────────────────────┐
                          │            多端入口 (Clients)                  │
                          │  TUI/CLI · Telegram · HermesPilot · Desktop   │
                          └───────────────────────┬───────────────────────┘
                                                  │
                    ┌─────────────────────────────▼─────────────────────────────┐
                    │        Hermes 运行时（单实例，PID 由 launchd 守护）          │
                    │  ai.hermes.gateway → stderr_timestamp → gateway run        │
                    │             --external-supervisor  (KeepAlive)             │
                    │                                                            │
                    │  模型层：deepseek-flash · deepseek · api.deepseek.com       │
                    │          fallback_providers: [] · MoA: disabled            │
                    │  插件层：mem0 · homeassistant · hermespilot-link            │
                    │  审批：approvals.mode=manual · cron_mode=deny (300s)        │
                    └───────┬───────────────┬───────────────┬────────────────────┘
                            │               │               │
        ┌───────────────────▼──┐  ┌─────────▼─────────┐  ┌──▼──────────────────────┐
        │ 5 个 Profile 分身     │  │ 技能库 Skills      │  │ Cron 调度器              │
        │ default   @hermes    │  │ ~/.hermes/skills  │  │ 15 任务 / 4 profile      │
        │ memory-keeper        │  │ 107 活跃 SKILL.md │  │ default 网关统一 dispatch │
        │ mail-keeper          │  │ 28 个有内容分类    │  │ max_parallel_jobs: 1     │
        │ server-keeper        │  │ 58 MB             │  │ allow_agent_scheduling:  │
        │ skill-keeper         │  │ external_dirs 只读 │  │ false                    │
        └───────────┬──────────┘  └─────────┬─────────┘  └──┬──────────────────────┘
                    │                       │               │
                    │                       ▼               │
                    │        ┌──────────────────────────┐   │
                    │        │ GitHub 镜像（每日 23:30） │   │
                    │        │ JoelYang-Y/hermes-skills │   │
                    │        └──────────────────────────┘   │
                    ▼                                       │
    ┌───────────────────────────────────────────────────────▼──────────────────────┐
    │          记忆系统：Mem0 OSS → Qdrant Server (10.0.0.3:6333)                   │
    │  活跃集合：hermes_memories_v2_hybrid / hermes_memories_v2_hybrid_entities     │
    │  Embedder：huggingface · BAAI/bge-small-zh-v1.5 · 512 维                      │
    │  LLM（抽事实用）：openai 兼容 · deepseek-v4-flash · api.deepseek.com           │
    │  注入限额：top_k 5 (max 10) · search_max_chars 12000 · prefetch_max_chars 6000 │
    │  身份：user_id=zhaoyang · agent_id=hermes（全 profile 共享同一库）             │
    └──────────────────────────────────────────────────────────────────────────────┘
```

**一句话读法**：profile 是"人格与权限"的分层，不是资源隔离层 —— 它们共享同一个运行时进程、同一个模型契约、同一份记忆库、同一份技能库，仅工具面、SOUL 与 Cron 归属不同。

---

## 2. 文件与目录结构

### 2.1 宿主关键路径（实测）

| 路径 | 作用 | 备注 |
|---|---|---|
| `~/.hermes/hermes-agent/` | Hermes 安装目录（git checkout） | 当前 `v0.23.0`，本地 commit `2bd378ed1b8d` |
| `~/.hermes/hermes-agent/venv/bin/python3` | 运行时 Python | 3.11.15；`hermes update` 必须用此 venv 内的 hermes |
| `~/.hermes/hermes-agent/.hermes/bin/hermes` | CLI 入口（PATH 中的 `hermes`） | 升级/版本核对以此为准 |
| `~/.hermes/config.yaml` | default profile 主配置 | 变更前必须 `cp` 备份 |
| `~/.hermes/mem0.json` | 记忆库连接配置（**共享库的唯一真源**） | 新 profile 以此为准接入 |
| `~/.hermes/.env` | 密钥与环境变量 | 含 `DEEPSEEK_API_KEY` / `MEM0_MODE=oss` / `TELEGRAM_BOT_TOKEN` 等 |
| `~/.hermes/skills/` | **技能唯一物理库** | 107 活跃 SKILL.md（+80 已归档）/ 58 MB / 37 个分类目录（28 有内容） |
| `~/.hermes/scripts/` | 运维脚本箱（cron 脚本主体） | 约 80 个脚本，含备份/巡检/记忆整理/守卫 |
| `~/.hermes/cron/jobs.json` | default 的 Cron 定义 | 另有 3 个 profile 各自独立的 `jobs.json` |
| `~/.hermes/profiles/<name>/` | 分身配置、SOUL、独立 skills/cron/.env/mem0.json | 非沙箱，见 §6.5 |
| `~/hermes-backups-local/` | 本机记忆冷备（保留 4 份，约 80 MB） | 由 `hermes_backup_local.py` 生成 |
| `~/hermes-skills/` | GitHub 技能镜像本地 clone | 内含一键同步 `scripts/sync.sh` |
| `~/Library/LaunchAgents/ai.hermes.gateway.plist` | 网关守护定义 | 入口必须是 venv + `stderr_timestamp` 包装 |

### 2.2 本套件 `hermes_deployment/` 结构

```text
hermes_deployment/
├── README.md                      # 本 SOP（唯一权威口径）
├── config/                        # 配置模板（已与线上结构同步，全部占位符化、无真实密钥）
│   ├── config.yaml.template       # 主配置：DeepSeek 模型栈 / plugins / memory / skills / approvals / api_server
│   ├── env.template               # 环境变量键名清单：DEEPSEEK / MEM0_MODE / TAVILY / TELEGRAM / BROWSER
│   ├── mem0.json.template         # 记忆连接：qdrant 512 维 / bge-small-zh-v1.5 / deepseek-v4-flash / 检索限额
│   ├── cron_jobs.json.template            # default 的 10 项 Cron
│   ├── cron_jobs.memory-keeper.json.template   # memory-keeper 的 2 项
│   ├── cron_jobs.mail-keeper.json.template     # mail-keeper 的 1 项
│   └── cron_jobs.skill-keeper.json.template    # skill-keeper 的 2 项
└── scripts/                       # 自动化部署、备份与恢复脚本箱
    ├── setup_environment.sh       # [步骤1] 宿主机依赖 + ~/.hermes 骨架（未含 profile / mem0 插件安装）
    ├── deploy_qdrant.sh           # [步骤2] Qdrant 容器一键拉起（本机模式；接 NAS 时跳过）
    ├── backup_hermes.py           # [工具] tar.gz 全量打包（Qdrant REST 全量 + Skills + Cron + 配置 + manifest）
    ├── restore_hermes.py          # [工具] 一键还原（建集合 / 批量 Upsert / 释放 Skills 与 Cron）
    └── health_check.py            # [验证] 5 段体检：配置 → Qdrant → Skills → Cron → CLI
```

> 📌 **使用纪律**：模板已按 2026-11-11 实测结构重写（模型栈、插件、记忆五要件、Cron 15 项分 profile），可直接用于**全新机器**；但模板中的 `<PLACEHOLDER>` 必须替换，且**任何真实密钥、chat_id、API Server key 都不在模板内**。已运行中的机器不要用模板覆盖现有文件，改前先 `cp` 备份。

---

## 3. Profile 矩阵（多 Bot 分身）

| Profile | 角色 | 工具面（实测） | 技能来源 | 自有 Cron |
|---|---|---|---|---|
| `default`（@hermes） | 总助手：协调、派活、配置变更、跨 Bot 汇总 | 全开（`disabled_toolsets: []`） | `~/.hermes/skills` + `external_dirs: ~/.hermeslink/hermes-skills`（仅 HermesLink 内置技能） | 10 |
| `memory-keeper` | 记忆管家：每小时增量提取 + 每日 02:00 分级整理 | 全开 | `skills` → 软链接 `~/.hermes/skills` | 2 |
| `mail-keeper` | 邮件管家：巡检、只读分级、起草不发送 | **禁用 10 项**：`terminal`/`file`/`code_execution`/`browser`/`computer_use`/`desktop_ui`/`project`/`kanban`/`catalog`/`connections` | `external_dirs: /Users/macmini/.hermes/skills` + 私有 `skills/`（8 项） | 1 |
| `server-keeper` | 服务器管家：可自执行命令、改自身配置、装技能/MCP | **禁用 6 项**：`browser`/`computer_use`/`desktop_ui`/`project`/`cronjob`/`kanban`；`terminal`/`file`/`code_execution` 已启用 | `external_dirs: /Users/macmini/.hermes/skills` + 私有 `skills/`（9 项） | 0 |
| `skill-keeper` | Skill 管家：技能库唯一写入者、沉淀与镜像 | **禁用 10 项**（同 mail-keeper）；`cronjob` 与记忆工具已启用 | `skills` → 软链接 `~/.hermes/skills`（`external_dirs: []`） | 2 |

**共同契约（5 个 profile 一致）**

- 模型：`deepseek-flash` / `deepseek` / `https://api.deepseek.com` / `chat_completions`
- 记忆：`plugins.enabled` 含 `mem0`；`memory.provider: 'mem0'`；`.env` 内 `MEM0_MODE=oss`；profile 目录内有独立 `mem0.json`（仅 `collection_name`/`user_id`/`agent_id` 与主库对齐）
- 授权：`memory.write_approval: true`（记忆写入需确认）；`cron.allow_agent_scheduling: false`
- 归属：Bot 之间平级；对外发送（邮件 / 真人 Telegram / 第三方系统）必须先出完整草稿待批
- 残壳（待清理，不参与运行）：`profiles/fleet-mail`、`profiles/profile-gf91fi` —— 仅剩 `projects.db`，`@fleet-mail` / `@fleet-server` 旧 handle 已失效

---

## 4. 场景一：全新机器从零部署 (Greenfield)

> 目标：在一台空白 macOS/Linux 上复原"1 运行时 + 5 分身"的同等结构。全程约 20–30 分钟，**Qdrant 复用 NAS 时跳过步骤 2**。

### 步骤 1：基础运行时

```bash
cd hermes_deployment/scripts && chmod +x *.sh *.py
./setup_environment.sh          # Python 3.11+ / git / docker 探测，建 ~/.hermes 骨架，装 mem0ai·qdrant-client 等
```

安装后必须核对三件事（脚本本身不校验）：

```bash
hermes --version                                     # 期望 v0.23.x（stable）
~/.hermes/hermes-agent/venv/bin/python3 -V            # 期望 3.11.x
~/.hermes/hermes-agent/.hermes/bin/hermes cron list   # 能列出任务即运行时可用
```

> ⚠️ `hermes update` 只能用 `~/.hermes/hermes-agent/venv/bin/hermes`（有 `.git` 的 checkout）。PM 运行时入口（`~/.hermes/installs/<id>/environments/<id>/venv/bin/hermes`）指向无 `.git` 的 workspace，会报 `Not a git repository`。

### 步骤 2：记忆后端（Qdrant）

```bash
./deploy_qdrant.sh     # 本机模式：Docker 拉起 Qdrant 并暴露 6333
```

内网已有 Qdrant（本环境为 NAS `10.0.0.3:6333`）时**跳过本步**，仅验证连通：

```bash
curl -s http://10.0.0.3:6333/readyz            # 期望: all shards are ready
curl -s http://10.0.0.3:6333/collections       # 期望含 hermes_memories_v2_hybrid 等
```

### 步骤 3：主 profile 配置（值取自当前线上真源）

```bash
# 全新机器（~/.hermes/config.yaml 尚不存在）
cp config/config.yaml.template  ~/.hermes/config.yaml
cp config/mem0.json.template    ~/.hermes/mem0.json
cp config/env.template          ~/.hermes/.env
# 已有配置的机器：只做比对参考，不要覆盖
# diff -u config/config.yaml.template ~/.hermes/config.yaml
```

`~/.hermes/config.yaml` 必须含以下**当前生效值**（缺失会导致记忆/技能/审批行为与线上不一致）：

```yaml
model:
  default: deepseek-flash
  provider: deepseek
  base_url: https://api.deepseek.com
  api_mode: chat_completions
fallback_providers: []            # Vertex 已停用，保持空

memory:
  provider: 'mem0'                # 升级后会被清空为 ''，须复核
  memory_enabled: true
  write_approval: true
  memory_char_limit: 2200
  user_char_limit: 1375
  flush_min_turns: 6

skills:
  external_dirs: []               # default 可留空；见步骤 5
  write_approval: false
  template_vars: true

plugins:
  enabled: [mem0, homeassistant, hermespilot-link]

security:
  allow_lazy_installs: false      # 插件不会被自动拉取，必须显式安装
  redact_secrets: true

approvals:
  mode: manual
  cron_mode: deny
  timeout: 300

cron:
  allow_agent_scheduling: false
```

`.env` 必填/常用键（键名实测口径）：

```bash
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_BASE_URL=https://api.deepseek.com
MEM0_MODE=oss                       # 缺失会回落 platform 模式并报 Missing MEM0_API_KEY
TAVILY_API_KEY=tvly-...             # web 检索
TELEGRAM_BOT_TOKEN=...              # 网关投递
TELEGRAM_ALLOWED_USERS=...          # 白名单
OBSIDIAN_VAULT_PATH=~/Documents/ObsidianVault
```

### 步骤 4：mem0 插件与 embedder 依赖（最容易漏的一步）

**mem0 生效五要件，缺一即静默失效**：

1. `config.yaml` → `plugins.enabled` 含 `mem0`
2. `config.yaml` → `memory.provider: 'mem0'`
3. `.env` → `MEM0_MODE=oss`
4. `~/.hermes/mem0.json` 存在（**每个 profile 各一份**，插件不跨 profile 共享）
5. 逐 profile 显式安装并启用插件

```bash
# 依赖（v2_hybrid = dense + sparse 混合检索，缺 fastembed/onnxruntime 会静默退化为纯 dense）
uv pip install --python ~/.hermes/hermes-agent/venv/bin/python \
  mem0ai qdrant-client sentence-transformers fastembed onnxruntime spacy
~/.hermes/hermes-agent/venv/bin/python -m spacy download en_core_web_sm

# 逐 profile 安装插件
for p in default memory-keeper mail-keeper server-keeper skill-keeper; do
  hermes -p "$p" plugins install mem0 --yes-deps --enable
done
```

### 步骤 5：技能库落位与分发

技能库**只有一份物理真源**：`~/.hermes/skills/`。

```bash
# 方式 A（推荐）：从 GitHub 镜像恢复（公开仓库）
git clone https://github.com/JoelYang-Y/hermes-skills.git ~/hermes-skills
rsync -a --exclude '/.git' --exclude '/README.md' --exclude '/scripts/' \
      ~/hermes-skills/ ~/.hermes/skills/

# 方式 B：从灾备归档恢复
python3 scripts/restore_hermes.py --backup-file /path/to/hermes_full_backup_*.tar.gz --skip-qdrant
```

然后让各 profile **只读挂载**这一份库（不要复制目录，避免版本漂移）：

```bash
# 已封装：为指定 profile 追加 external_dirs（幂等、改前备份）
python3 ~/.hermes/scripts/profile_join_shared_skills.py <profile-name>
python3 ~/.hermes/scripts/profile_join_shared_skills.py --all
```

分发机制对照（当前线上事实）：

| Profile | 接入方式 | 实际路径 |
|---|---|---|
| `memory-keeper`、`skill-keeper` | `skills` 目录**软链接** | `profiles/<p>/skills -> /Users/macmini/.hermes/skills` |
| `mail-keeper`、`server-keeper` | `skills.external_dirs` 只读挂载 | `/Users/macmini/.hermes/skills`（另有各自私有 `skills/` 放少量专属技能） |
| `default` | 主库 + HermesLink 内置技能 | `~/.hermes/skills` + `external_dirs: ~/.hermeslink/hermes-skills` |

### 步骤 6：新建一个 Bot 分身（标准动作）

```bash
# 1) 创建 profile 骨架
hermes profile create <name>

# 2) 接入共享记忆库（只改 collection_name/user_id/agent_id，其余保留原值，改前自动备份）
python3 ~/.hermes/scripts/profile_join_shared_memory.py <name>

# 3) 接入共享技能库
python3 ~/.hermes/scripts/profile_join_shared_skills.py <name>

# 4) 复制主库连接凭据（漏此步会报 Missing MEM0_API_KEY 并回落 platform 模式）
cp ~/.hermes/mem0.json ~/.hermes/profiles/<name>/mem0.json
cp ~/.hermes/.env      ~/.hermes/profiles/<name>/.env      # 至少含 MEM0_MODE=oss / DEEPSEEK_API_KEY

# 5) 装插件
hermes -p <name> plugins install mem0 --yes-deps --enable
```

收尾必须做两件事：写 `profiles/<name>/SOUL.md`（身份、边界、语言规范），并按最小权限收紧 `agent.disabled_toolsets`（参考 §3：邮件类禁 `terminal`/`file`，服务器类禁 `browser`）。

### 步骤 7：Cron 注册

Cron **按 profile 归属**，但由 default 网关统一调度（多路复用）：

```bash
cp config/cron_jobs.json.template            ~/.hermes/cron/jobs.json                              # default 10 项
cp config/cron_jobs.memory-keeper.json.template  ~/.hermes/profiles/memory-keeper/cron/jobs.json    # 2 项
cp config/cron_jobs.mail-keeper.json.template    ~/.hermes/profiles/mail-keeper/cron/jobs.json      # 1 项
cp config/cron_jobs.skill-keeper.json.template   ~/.hermes/profiles/skill-keeper/cron/jobs.json     # 2 项

hermes cron list && hermes -p memory-keeper cron list     # 核对任务已注册
```

四项合计 **15 个任务**（§6.3 为全表）。落地后必须把各任务的 `deliver` 从模板占位改成真实投递目标（`telegram` / `telegram:<chat_id>` / `bot-chat`）。**脚本必须落在 `~/.hermes/scripts/`**，Cron 以文件名引用；`server-keeper` 未配 Cron（其 `cronjob` 工具集亦被禁用）。

### 步骤 8：全系统体检

```bash
python3 scripts/health_check.py
```

输出 `🎉 全系统各项指标正常` 后方可 `hermes` 启动；网关常驻用 `hermes gateway install`（会写 launchd，见 §6.4）。

---

## 5. 场景二：灾备恢复与迁移 (Restore)

### 5.1 三套备份资产（互不替代）

| 资产 | 触发 | 产物 | 内容范围 | 保留 |
|---|---|---|---|---|
| **本机记忆冷备** | Cron `30 4 * * 0`（周日 04:30） | `~/hermes-backups-local/<YYYYMMDD_HHMMSS>/` | Qdrant 两活跃集合**全量含向量**（逐点 scroll + 点数比对，不一致即非零退出）、`mem0.json`、`config.yaml`、`.env`、`manifest.json`（sha256） | 4 份（约 80 MB） |
| **NAS 全量备份** | Cron `0 3 * * 0`（周日 03:00） | 远端 `<NAS_BASE>/<date>/` | SQLite 先做 `quick_check` 快照，再打包 `config.yaml*`、`.env*`、`mem0.json*`、`memories/`、`skills/`、`backups/` | 由 NAS 侧策略管理 |
| **灾备套件** | 手动（重大变更前） | `hermes_full_backup_<ts>.tar.gz` + `manifest.json` | Qdrant 全量 + Skills + Cron + 配置，可跨机迁移 | 手动 |

```bash
# 手动触发全量打包（跨机迁移用这一套）
python3 scripts/backup_hermes.py --qdrant-host 10.0.0.3 --qdrant-port 6333 --out-dir ~/hermes-backups
```

> 🔐 **安全红线**：NAS 备份脚本内含明文 NAS 账号口令。该脚本**只存在于本机 `~/.hermes/scripts/`，严禁提交到公开仓库**；恢复演练时也不得把凭据写进笔记或消息。

### 5.2 一键复原

```bash
# 自动建集合 → 批量 Upsert（wait=true）→ 释放 Skills 与 Cron
python3 scripts/restore_hermes.py \
    --backup-file ~/hermes-backups/hermes_full_backup_<ts>.tar.gz \
    --qdrant-host 10.0.0.3 --qdrant-port 6333

# 仅还原文件、不动向量（技能库/配置回滚时用）
python3 scripts/restore_hermes.py --backup-file <...>.tar.gz --skip-qdrant
```

### 5.3 恢复后必做校验

1. `curl -s http://10.0.0.3:6333/collections/<col>` → `points_count` 与 `manifest.json` 记录一致
2. `python3 scripts/health_check.py` → 5 段全绿
3. 每个 profile 复核 `memory.provider: 'mem0'`（升级/恢复常被清空）
4. `hermes cron list` 与 `hermes -p <p> cron list` → 15 个任务齐、`enabled: true`
5. `skill_view` 抽查 2–3 个技能可加载；`ls -d ~/.hermes/skills/*/ | wc -l` = 37
6. 发一条测试消息确认网关在线（`gateway_state.json` 内 `platforms.telegram.state: connected`）

---

## 6. 核心子系统详解

### 6.1 记忆系统（Mem0 OSS + Qdrant）

`~/.hermes/mem0.json`（每个 profile 一份，仅身份三键随 profile 变化）：

```json
{
  "mode": "oss",
  "oss": {
    "vector_store": { "provider": "qdrant",
      "config": { "host": "10.0.0.3", "port": 6333,
                  "collection_name": "hermes_memories_v2_hybrid",
                  "embedding_model_dims": 512 } },
    "embedder": { "provider": "huggingface",
      "config": { "model": "BAAI/bge-small-zh-v1.5" } },
    "llm": { "provider": "openai",
      "config": { "model": "deepseek-v4-flash",
                  "openai_base_url": "https://api.deepseek.com" } }
  },
  "user_id": "zhaoyang",
  "agent_id": "hermes",
  "search_top_k": 5, "search_max_top_k": 10,
  "search_max_chars": 12000, "search_item_max_chars": 2000,
  "prefetch_max_chars": 6000
}
```

- **五 profile 共享同一集合**：多写同一库，靠 `agent_id`/会话来源区分，不做物理隔离（有意为之，避免领域经验流不进来）。
- **注入成本**由 `search_top_k` / `search_max_chars` / `prefetch_max_chars` 三个键控制，与库总量无关。
- **遗留集合**：`hermes_memories`、`hermes_memories_v2`、`hermes_memories_v2_entities` 仍在 Qdrant 中，删除需显式授权；`midjourney` / `mem0migrations` 与本系统无关，勿动。
- 记忆写入默认需审批（`memory.write_approval: true`）；去重/合并/清理由 memory-keeper 每日 02:00 分级执行，删前落盘快照。

### 6.2 技能库与分发

- **唯一物理库**：`~/.hermes/skills/`（107 个活跃 SKILL.md，58 MB，37 个可见分类目录其中 28 个有内容；`.archive/` 内另有 80 个已归档技能，不计入活跃数、不参与索引）。
- **唯一写入者**：`skill-keeper`（其余 profile 只读挂载；运维应急可由 default 直接修补坏技能）。
- **禁止**往 `~/.hermes/profiles/<p>/skills/` 手工添加技能做"分发"——那只有该分身可见，会造成版本分裂。私有目录仅用于该分身专属的极少数技能。
- **GitHub 镜像闭环**（Cron `30 23 * * *`，skill-keeper 执行 `sync-skills-github.sh`）：

```text
rsync 镜像 → gen_readme.py 重建分类索引 → git commit → git push
（--dry-run / --no-push / --verbose 可用；无变更即跳过）
```

> ⚠️ 同步脚本的 `--delete` 必须使用**锚定排除**（`/README.md`、`/.gitignore`、`/scripts/`）。裸写 `scripts/` 会误删各技能自带的 `scripts/` 子目录。单向同步，无反向拉取。

主要分类（按技能数）：`mlops 19`、`devops 14`、`creative 12`、`productivity 10`、`hermes 10`、`software-development 8`、`research 6`、`autonomous-ai-agents 4`，其余为 1–2 项的专题分类。

### 6.3 Cron 全表（15 项实测）

**default（10 项，投递 Telegram 私聊）**

| 周期 | 任务 | 执行体 | 说明 |
|---|---|---|---|
| `0 */6 * * *` | Hermes 只读更新检查 | `hermes_update_check.sh` | **只查不升**：不执行 update、不 fetch/pull、不重启 |
| `20 */6 * * *` | Hermes 记忆库依赖守卫 | `mem0_health_guard.sh` | 兜底 PM 重建后 embedder 依赖被剥离的空窗 |
| `0 8 * * *` | Hermes 每日状态推送 | `hermes_daily_status.sh` | 纯 shell 采集，脚本 stdout 直发 |
| `15 */6 * * *` | Hermes 记忆自动整理 | agent | 自主去重合并，输出简短健康状况 |
| `0 3 * * 0` | 每周备份到 NAS | `hermes_backup_to_nas.sh` | 周日 03:00 |
| `30 4 * * 0` | 本机记忆备份 | `hermes_backup_local.py` | 周日 04:30，保留 4 份 |
| `0 9 * * *` | 每日 AI 前沿资讯早报 | `ai_daily_brief.py` | 仅基于预采集输出，禁编造/联网 |
| `30 9 * * 1` | 全网 SSL 证书巡检 | `ssl_cert_patrol.py` | 剩余 <30 天或探测失败才告警 |
| `*/15 * * * *` | 本机 DSH CLI 可用性检查 | `dsh_token_watch.sh` | 静默，异常才推 |
| `*/15 * * * *` | HermesPilot Link 失联监控 | `hermeslink_watch.sh` | **仅告警不自动拉起** |

**memory-keeper（2 项）**：`0 * * * *` 每小时增量提取（`hermes_memory_extract.py`）；`0 2 * * *` 每日记忆库分级整理（`mem0_tidy_scan.py`，L1–L4 分级 + 快照回滚）。
**mail-keeper（1 项）**：每 30 分钟邮件巡检（只读、分级推送）。
**skill-keeper（2 项）**：`0 4 * * *` 每日会话沉淀 Skill；`30 23 * * *` 每日技能库同步 GitHub。

> 调度事实：`cron.max_parallel_jobs: 1`、`allow_agent_scheduling: false`（Agent 不能自行新增任务）；`approvals.cron_mode: deny`（Cron 内不弹审批，脚本必须自证幂等）。

### 6.4 网关与多端入口

- 守护：launchd `ai.hermes.gateway`，`KeepAlive.SuccessfulExit=false`；入口为 **venv 内 `hermes --run-module hermes_cli.stderr_timestamp -- ... gateway run --external-supervisor`**（给日志加时间戳 + 外部监管模式）。**直接改回裸 shim 会被依赖守卫拒载。**
- 平台状态：`~/.hermes/gateway_state.json` → `platforms.telegram.state`、`platforms.api_server`（本机 `127.0.0.1:864x`）。
- 多端入口并行：TUI/CLI、Telegram、HermesPilot（`hermespilot-link` 插件）、Desktop。入口与 Hermes 物理部署位置无关。
- **会话内禁止重启网关**，须由用户在外部终端执行 `hermes gateway restart`。

### 6.5 权限边界（结构性事实，不要误当隔离）

- Profile **不是沙箱**：同一系统用户下，任何分身的终端都能读到其他 profile、`.env` 与 CLI 凭据；`SOUL.md` 是行为约定，不是权限边界。
- 分身之间平级：总助手有协调权，无代审批、无修改他人配置、无暂停他人任务的权力。
- Bot 间信息流转（`message_agent`、共享记忆读写、跨 profile 只读会话检索）可自行进行；**对外发送、密钥类信息一律拦截**。
- `security.allow_lazy_installs: false`：新插件必须显式 `plugins install`，不会自动拉取。

---

## 7. 系统体检清单

| # | 检查项 | 命令 | 期望 |
|---|---|---|---|
| 1 | 运行时版本 | `hermes --version` | `v0.23.x · stable` |
| 2 | 配置完整性 | `python3 scripts/health_check.py` | 5 段全绿，配置/Qdrant/Skills/Cron/CLI |
| 3 | Qdrant 就绪 | `curl -s http://10.0.0.3:6333/readyz` | `all shards are ready` |
| 4 | 集合点数 | `curl -s http://10.0.0.3:6333/collections/hermes_memories_v2_hybrid` | `points_count` > 0 且与备份一致 |
| 5 | 记忆读写 | `hermes chat -q "检索我的核心记忆并列出主机拓扑"` | 返回真实事实，非空 |
| 6 | 技能加载 | `ls -d ~/.hermes/skills/*/ \| wc -l`；`skill_view` 抽检 | 37 个分类目录（28 有内容）；技能可加载 |
| 7 | Cron 齐备 | `hermes cron list` + `-p <p> cron list` | 15 项 active |
| 8 | 网关在线 | `cat ~/.hermes/gateway_state.json` | `telegram: connected`，无 `needs_attention` |
| 9 | 备份新鲜度 | `ls -1 ~/hermes-backups-local` | 最近一份 < 8 天，共 ≤4 份 |

> 口径提示：`health_check.py` 的技能计数是 `find -name SKILL.md` 全量结果（含 `.archive/`，故显示 187）；"活跃技能"以 §6.2 的 107 为准。Cron 一项该脚本只读 default 的 `jobs.json`（10 项），全部 15 项需按 `-p <profile>` 逐个核。

---

## 8. 已知坑与排错 FAQ

**Q1：升级后 `mem0_search` 全部返回空，记忆工具从清单消失？**
A：`hermes update` 会把 `memory.provider` 清空为 `''`。改回 `provider: 'mem0'` 即恢复（逐 profile 检查）。

**Q2：记忆检索质量骤降、混合检索像纯语义？**
A：PM 重建运行环境会剥离 embedder 依赖，且**补装不救已运行进程**。按 §4 步骤 4 补装 `sentence-transformers fastembed onnxruntime spacy + en_core_web_sm`，然后重启网关。判别活跃 venv 要读 `facts.json` 的 `packages.venv.environment`，`ls -d .../venv | head -1` 会假阴性。

**Q3：网关起不来，报 `no dependency environment is committed for this install`？**
A：launchd 入口被 `gateway install` 重写回 PM shim。改回 venv 的 `stderr_timestamp + gateway run --external-supervisor` 形式（§6.4）。`gateway status` 报 `Service definition is stale` 属提示性，服务可能实际健康。

**Q4：新 profile 怎么都读不到记忆？**
A：逐项核对"五要件"（§4 步骤 4）。最常见是漏拷 `profiles/<name>/mem0.json`（报 `Missing MEM0_API_KEY` 并回落 platform 模式）。

**Q5：新 profile 看不到技能库？**
A：跑 `profile_join_shared_skills.py <name>`（或手工在 `skills.external_dirs` 追加 `/Users/macmini/.hermes/skills`）。不要复制技能目录。

**Q6：Qdrant 连通失败（`Connection refused`）？**
A：查防火墙与 6333 放行；`curl -s http://<IP>:6333/readyz` 应返回 `all shards are ready`。

**Q7：恢复后点数对不上？**
A：`restore_hermes.py` 已带 `wait=true`；仍不一致则等 5 秒重跑 `health_check.py`，并以 `manifest.json` 的 `live_points_count` 为准比对。

**Q8：模型调用 401/403？**
A：查 `~/.hermes/.env` 的 `DEEPSEEK_API_KEY` 与 `DEEPSEEK_BASE_URL`；Google 系密钥在本架构中已非必需（§0）。

**Q9：Cron 任务到点不执行 / 直接失败？**
A：`approvals.cron_mode: deny` 表示 Cron 内不弹审批——脚本必须自幂等且不依赖交互。核查脚本是否在 `~/.hermes/scripts/`、是否可执行、上一轮 `hermes cron list` 中 `Last run` 状态。

**Q10：技能镜像同步后原技能的子目录丢了？**
A：`rsync --delete` 的排除项必须锚定（`/scripts/`），裸 `scripts/` 会误杀。同步后跑一次 `git status` 确认没有大面积删除再 push。

---

*维护约定：本文件随架构变更同步更新，每次变更注明版本与基线日期。`config/*.template` 与本文同批次修订（2026-11-11）；若某次架构调整只改了线上而未回写模板，以本文件 §4/§6 的实测值为真源，并尽快补齐模板。*

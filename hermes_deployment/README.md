# 🚀 Hermes Agent 架构重构与一键部署迁移标准指南 (SOP)

> 本文档为基于 **Nous Research Hermes Agent** 框架构建的高可用个人 AI 助手与智能运维中枢的标准重构手册。  
> 包含 **Mem0 OSS + Qdrant 长期向量记忆系统**、**160+ 生产级技能库 (Skills)**、**Cron 定时调度守护**、**多端网关 (Gateway)** 及 **自动化灾备/还原工程体系**。

---

## 📑 目录

- [1. 架构总览与拓扑](#1-架构总览与拓扑)
- [2. 部署套件文件结构](#2-部署套件文件结构)
- [3. 场景一：全新机器从零初始化部署 (Greenfield)](#3-场景一全新机器从零初始化部署-greenfield)
- [4. 场景二：基于备份的一键灾备恢复与迁移 (Restore)](#4-场景二基于备份的一键灾备恢复与迁移-restore)
- [5. 核心子系统配置详解](#5-核心子系统配置详解)
  - [5.1 记忆系统 (Mem0 OSS + Qdrant)](#51-记忆系统-mem0-oss--qdrant)
  - [5.2 技能库生态与 Matt Pocock 工程体系](#52-技能库生态与-matt-pocock-工程体系)
  - [5.3 定时任务自动化调度 (Cron)](#53-定时任务自动化调度-cron)
- [6. 灾备备份机制与演练](#6-灾备备份机制与演练)
- [7. 系统体检与验证清单](#7-系统体检与验证清单)
- [8. 常见排错与高频 FAQ](#8-常见排错与高频-faq)

---

## 1. 架构总览与拓扑

```text
                                  ┌──────────────────────────────────────────────────┐
                                  │               多端交互入口 (Clients)              │
                                  │   Hermes TUI / CLI  │ Telegram Bot │ HermesPilot  │
                                  └────────────────────────┬─────────────────────────┘
                                                           │
                                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   Hermes Agent 核心调度大脑                                              │
│                                                                                                        │
│  ┌───────────────────────┐  ┌─────────────────────────┐  ┌──────────────────────────────────────────┐  │
│  │     主推理模型        │  │     辅助小模型矩阵      │  │             核心行为规范                 │  │
│  │ Vertex AI (Gemini 3.7)│  │ DeepSeek / Flash-Lite   │  │ 100% 全中文思维链 / 破坏性操作确认 / 闭环执行  │  │
│  └───────────────────────┘  └─────────────────────────┘  └──────────────────────────────────────────┘  │
│                                                          │                                             │
│  ┌───────────────────────────────────────────────────────┴───────────────────────────────────────────┐  │
│  │                                          技能生态 (Skills Ecosystem)                              │  │
│  │   • Matt Pocock 四大工程体系 (pocock-grilling / domain-modeling / diagnosing-bugs / codebase-design)│  │
│  │   • 运维与网络诊断 (devops / proxy-chain / nas-docker / pve / oci / hermes-operations)             │  │
│  │   • 生产力与多媒体 (productivity / mlops / research / creative / autonomous-ai-agents)             │  │
│  └───────────────────────────────────────────────────────┬───────────────────────────────────────────┘  │
│                                                          │                                             │
│  ┌───────────────────────────────────────────────────────┴───────────────────────────────────────────┐  │
│  │                                  Cron 自动化定时任务引擎 (Cron Scheduler)                         │  │
│  │   • 自动更新检查 (0 */6)      • 每日健康日报 (0 8 * * *)      • 记忆自动整理去重 (15 */6 * * *)   │  │
│  │   • 每周 NAS 备份 (0 3 * * 0) • 本地向量冷备 (30 4 * * 0)    • 每日 AI 资讯 (0 9 * * *)          │  │
│  └───────────────────────────────────────────────────────┬───────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┼─────────────────────────────────────────────┘
                                                           │
                                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              记忆系统与向量检索 (Mem0 OSS + Qdrant Storage)                            │
│                                                                                                        │
│  • 架构模式: Mem0 OSS (自建开源版)                                                                     │
│  • 向量数据库: Qdrant Server (10.0.0.3:6333 / 容器名: qdrant-mem0)                                      │
│  • 嵌入模型 (Embedder): BAAI/bge-small-zh-v1.5 (512 维向量)                                            │
│  • 核心集合 (Collections):                                                                             │
│      - hermes_memories_v2_hybrid (长期黄金事实向量库)                                                   │
│      - hermes_memories_v2_hybrid_entities (关联实体与元数据)                                            │
│  • 检索注入策略: Top-K (3~5 条高相关事实) 动态注入，保证极低 Token 消耗与秒级响应                       │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 部署套件文件结构

当前部署中心文件组织如下：

```text
hermes_deployment/
├── README.md                      # 本部署指南与架构 SOP
├── config/                        # 核心配置模板 (脱敏)
│   ├── config.yaml.template       # Hermes 主配置文件模板
│   ├── env.template               # API Key 与环境变量模板
│   ├── mem0.json.template         # Mem0 OSS 向量记忆配置模板
│   └── cron_jobs.json.template    # 标准化 7 大 Cron 任务配置模板
└── scripts/                       # 自动化部署、备份与恢复脚本箱
    ├── setup_environment.sh       # [步骤1] 宿主机环境与依赖一键安装脚本
    ├── deploy_qdrant.sh           # [步骤2] Qdrant 向量数据库 Docker 一键拉起
    ├── backup_hermes.py           # [工具] 全量备份打包工具 (向量/Skills/Cron/配置)
    ├── restore_hermes.py          # [工具] 一键全量灾备还原工具 (自动建库/Upsert/恢复)
    └── health_check.py            # [验证] 全系统链路健康深度体检脚本
```

---

## 3. 场景一：全新机器从零初始化部署 (Greenfield)

当你在全新 macOS / Linux 服务器上从零部署一套一模一样的 Hermes 架构时，遵循以下 6 步标准流程：

### 步骤 1：基础环境与依赖初始化

```bash
cd hermes_deployment/scripts
chmod +x *.sh *.py
./setup_environment.sh
```
*脚本会自动检测并安装 Python 3.11+、Git、Hermes CLI、`mem0ai`、`qdrant-client` 等必备库，并建立 `~/.hermes/` 基础目录树。*

### 步骤 2：启动 Qdrant 向量数据库

若在当前宿主机运行 Qdrant 容器：
```bash
./deploy_qdrant.sh
```
若已在内网 NAS（如 `10.0.0.3:6333`）上运行 Qdrant，请跳过此步，直接确保网络连通。

### 步骤 3：配置核心参数与密钥

```bash
# 复制配置文件模板
cp ../config/config.yaml.template ~/.hermes/config.yaml
cp ../config/mem0.json.template ~/.hermes/mem0.json
cp ../config/env.template ~/.hermes/.env

# 编辑 ~/.hermes/.env 填入实际 API Key
# 必填项: GOOGLE_APPLICATION_CREDENTIALS / GOOGLE_API_KEY / DEEPSEEK_API_KEY
# 选填项: TAVILY_API_KEY / TELEGRAM_BOT_TOKEN
nano ~/.hermes/.env
```

### 步骤 4：导入技能库 (Skills)

将技能库同步至 `~/.hermes/skills/`：
```bash
# 从本仓库或备份中还原全量 Skills
mkdir -p ~/.hermes/skills
# 若从备份恢复：可直接运行 python3 restore_hermes.py ...
```

### 步骤 5：注册 Cron 定时任务

```bash
cp ../config/cron_jobs.json.template ~/.hermes/cron/jobs.json
```

### 步骤 6：全系统健康体检

```bash
python3 health_check.py
```
当控制台输出 `🎉 全系统各项指标正常，具备高可用生产运行能力！` 时，即可启动 Hermes：
```bash
hermes
```

---

## 4. 场景二：基于备份的一键灾备恢复与迁移 (Restore)

如果你已有定期生成的 `hermes_full_backup_*.tar.gz` 备份归档包，可在任意新环境实现**全自动 1 分钟一键复原**：

```bash
# 执行一键恢复脚本 (自动创建向量集合、批量 Upsert 点数据、释放 Skills 与 Cron)
python3 scripts/restore_hermes.py \
    --backup-file /path/to/hermes_full_backup_20260824_220000.tar.gz \
    --qdrant-host 10.0.0.3 \
    --qdrant-port 6333

# 执行全链路体检
python3 scripts/health_check.py
```

---

## 5. 核心子系统配置详解

### 5.1 记忆系统 (Mem0 OSS + Qdrant)

`~/.hermes/mem0.json` 架构规范：
- **模式**: `oss`
- **向量存储**: `qdrant`，集合名 `hermes_memories_v2_hybrid`，向量维度 `512`。
- **Embedder**: `BAAI/bge-small-zh-v1.5`（语义表达精准，中文匹配度高）。
- **LLM**: `deepseek-v4-flash` / `https://api.deepseek.com`（负责提取事实元组与去重逻辑）。
- **用户标识**: `user_id: "zhaoyang"`, `agent_id: "hermes"`。

### 5.2 技能库生态与 Matt Pocock 工程体系

技能库统一存放于 `~/.hermes/skills/`，分为以下核心分类：
1. **Matt Pocock 4 大核心工程规范**:
   - `pocock-grilling`: 审问式需求与边界对齐。
   - `pocock-domain-modeling`: 维护领域语言统一与标准术语字典 (`CONTEXT.md`)。
   - `pocock-diagnosing-bugs`: 假设驱动排障，杜绝盲目试错。
   - `pocock-codebase-design`: 深模块化软件设计规范。
2. **DevOps & 网络**: `proxy-chain-diagnostics`, `nas-docker-ops`, `pve-ops`, `oracle-cloud-ops`, `att-ops`。
3. **Hermes 运维**: `hermes-operations`, `hermes-system-optimization`, `mem0-oss-operations`。

### 5.3 定时任务自动化调度 (Cron)

配置文件 `~/.hermes/cron/jobs.json` 固化了 7 大核心守护任务：
1. `0 */6 * * *`: **Hermes 自动更新检查** (`hermes_update_check.sh`, no_agent)
2. `0 8 * * *`: **Hermes 每日状态推送** (`hermes_daily_status.sh`)
3. `15 */6 * * *`: **Hermes 记忆自动整理** (自主去重合并，维持 100~130 条黄金记忆)
4. `0 3 * * 0`: **Hermes 每周冷备到 NAS** (`hermes_backup_to_nas.sh`, no_agent)
5. `30 4 * * 0`: **Hermes 本机记忆备份** (`hermes_backup_local.py`, no_agent)
6. `0 9 * * *`: **每日 AI 前沿资讯早报**
7. `30 9 * * 1`: **全网 SSL 证书每周健康巡检** (`ssl_cert_patrol.py`)

---

## 6. 灾备备份机制与演练

建议每周自动或在重大变更前手动执行全量打包导出：

```bash
# 手动触发全量导出
python3 scripts/backup_hermes.py --qdrant-host 10.0.0.3 --qdrant-port 6333 --out-dir ~/hermes-backups
```
备份产物特性：
- 包含 Qdrant 向量全部 Dense 向量与 Payload JSON。
- 包含全部 Skills、Scripts、Cron 配置文件。
- 自动生成 SHA256 完整性校验清单 (`manifest.json`)。

---

## 7. 系统体检与验证清单

部署完成后，依次执行以下三项测试以确认系统闭环：

1. **链路深度体检**:
   ```bash
   python3 scripts/health_check.py
   ```
2. **记忆系统读写验证**:
   ```bash
   # CLI 交互验证
   hermes chat -q "请检索我的核心记忆并简要列出当前已知的主机拓扑"
   ```
3. **Cron 定时任务状态**:
   ```bash
   hermes cron list
   ```

---

## 8. 常见排错与高频 FAQ

- **Q: Qdrant 连通失败 (`Connection refused`)？**  
  **A**: 检查目标主机防火墙及端口 `6333` 是否放行，运行 `curl -s http://<IP>:6333/readyz` 验证是否返回 `all systems go`。
- **Q: 恢复记忆后点数不匹配？**  
  **A**: Qdrant 默认异步索引写入，`restore_hermes.py` 已加入 `?wait=true` 参数。若仍有延迟，等待 5 秒后再次运行 `health_check.py`。
- **Q: 模型调用报 401 / 403 权限错误？**  
  **A**: 检查 `~/.hermes/.env` 中对应的 API Key 或 Google ADC 凭据路径是否存在且有效。

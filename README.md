# 个人通用网络与运维工具脚本库 (JoelYang-Y/scripts)

## 🤖 Hermes Agent 架构重构与部署中心

详见 [`hermes_deployment/README.md`](./hermes_deployment/README.md)，包含完整 Hermes AI Agent 的架构重构与一键还原套件：
- **记忆与向量库**: Mem0 OSS + NAS Qdrant 向量数据库自动创建与向量批量 Upsert 恢复
- **技能体系 (Skills)**: 160+ 个技能库全量打包与 Matt Pocock 4 大核心工程规范
- **自动化守护**: 7 大 Cron 核心定时任务与自动化运维脚本
- **自动化工具箱**: 一键环境安装 (`setup_environment.sh`)、全量备份导出 (`backup_hermes.py`)、一键灾备还原 (`restore_hermes.py`) 与全链路健康体检 (`health_check.py`)

---

## 📦 NAS Docker 部署中心 (极空间 Z4Pro)

详见 [`nas_docker/README.md`](./nas_docker/README.md)，包含极空间 NAS 上 13 个关键服务的标准 `docker-compose.yml`（逐项注释）与专属部署说明：

- **网络与基础**: `openspeedtest` (测速), `sub-store` (订阅管理), `homelable` (拓扑监控), `syncthing` (多端同步), `lucky` (反代/DDNS/打洞)
- **AI 记忆存储**: `qdrant-mem0` (Hermes Agent 长期向量记忆库)
- **家庭影音系统**: `embyserver` (流媒体/核显硬解), `moviepilot-v2` (追剧下载入库), `chinesesubfinder` (中文字幕), `qbittorrent` (PT/BT 下载), `metatube` (元数据刮削)
- **个人音乐流媒体**: `navidrome` (Subsonic 音乐服务器), `music-tag-web` (音乐标签封面刮削)


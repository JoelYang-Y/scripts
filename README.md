##  NAS Docker 部署中心 (极空间 Z4Pro)

详见 [`nas_docker/README.md`](./nas_docker/README.md)，包含极空间 NAS 上 13 个关键服务的标准 `docker-compose.yml`（逐项注释）与专属部署说明：

- **网络与基础**: `openspeedtest` (测速), `sub-store` (订阅管理), `homelable` (拓扑监控), `syncthing` (多端同步), `lucky` (反代/DDNS/打洞)
- **AI 记忆存储**: `qdrant-mem0` (Hermes Agent 长期向量记忆库)
- **家庭影音系统**: `embyserver` (流媒体/核显硬解), `moviepilot-v2` (追剧下载入库), `chinesesubfinder` (中文字幕), `qbittorrent` (PT/BT 下载), `metatube` (元数据刮削)
- **个人音乐流媒体**: `navidrome` (Subsonic 音乐服务器), `music-tag-web` (音乐标签封面刮削)


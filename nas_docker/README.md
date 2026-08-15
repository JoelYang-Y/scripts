# NAS Docker 架构与部署配置中心 (极空间 Z4Pro)

本目录汇总了极空间 Z4Pro NAS (10.0.0.3) 上所有容器化服务的 **标准 Docker Compose 部署配置** 与 **详细运维说明文档**（已按需排除 `paopaodns`）。

所有原本采用极空间图形化界面或 `docker run` 单独创建的容器，均已**等量转换为规范的 `docker-compose.yml`**，并针对每个配置项（端口、挂载、环境变量、硬件直通、网络模式等）添加了详尽的中文注释。

---

## 服务清单与架构总览

| 服务目录 | 服务名称 | 核心功能 | 网络模式 | 监听端口 | 存储与硬件依赖 |
|:---|:---|:---|:---:|:---|:---|
| [`openspeedtest`](./openspeedtest/) | **OpenSpeedTest** | 局域网 HTML5 高性能测速服务器 | Bridge | `6680`, `3004` | 静态网页与配置挂载 |
| [`sub-store`](./sub-store/) | **Sub-Store** | 高级订阅转换、节点过滤与规则管理 | Bridge | `3002` | SQLite 数据库持久化 |
| [`homelable`](./homelable/) | **Homelable** | 家庭网络拓扑可视化与设备在线监控 | Bridge | `3003` | 双容器架构 (FastAPI + Nginx), `NET_ADMIN` |
| [`syncthing`](./syncthing/) | **Syncthing** | 多端文件连续同步 (Obsidian Vault 等) | Bridge | `8384`, `22002`, `21027` | 端口避让 22002，避开系统内置 Syncthing |
| [`qdrant-mem0`](./qdrant-mem0/) | **Qdrant** | AI Agent (Hermes/Mem0) 长期记忆向量库 | Bridge | `6333`, `6334` | 混合向量检索 (Dense+BM25) |
| [`embyserver`](./embyserver/) | **Emby Server** | 家庭影音中心与流媒体转码播放 | **Host** | `8096`, `8920`, `1900` | Intel 核显 `/dev/dri/renderD128` 硬解直通 |
| [`metatube`](./metatube/) | **MetaTube** | 影视元数据精准抓取与刮削后端 | Bridge | `8081` | 局域网 HTTP 代理与 SQLite |
| [`moviepilot-v2`](./moviepilot-v2/) | **MoviePilot-v2** | 影视自动化下载、刮削与入库中枢 | **Host** | `3000` | 特权模式，支持跨目录硬链接入库 |
| [`chinesesubfinder`](./chinesesubfinder/) | **ChineseSubFinder**| 中文字幕自动化下载与匹配助手 | **Host** | `19035` | 媒体库读写挂载 |
| [`qbittorrent`](./qbittorrent/) | **qBittorrent** | 全功能 PT/BT 高性能下载利器 | **Host** | `8989`, `6881` | 自动 Tracker 更新与吸血防护 |
| [`lucky`](./lucky/) | **Lucky** | 动态域名 (DDNS)、反向代理与 STUN 打洞 | **Host** | `16601` | 网卡物理监听与 SSL 自动续期 |
| [`music-tag-web`](./music-tag-web/) | **Music-Tag-Web** | 网页端音乐标签、封面自动刮削整理 | Bridge | `8002` | 音乐库 ID3 标签批量写入 |
| [`navidrome`](./navidrome/) | **Navidrome** | 现代化个人音乐流媒体服务器 (Subsonic) | Bridge | `4533` | 兼容全平台 Subsonic 客户端 |

---

## 目录结构

```text
nas_docker/
├── README.md                      # 本总览文档
├── openspeedtest/
│   ├── docker-compose.yml
│   └── README.md
├── sub-store/
│   ├── docker-compose.yml
│   └── README.md
├── homelable/
│   ├── docker-compose.yml
│   └── README.md
├── syncthing/
│   ├── docker-compose.yml
│   └── README.md
├── qdrant-mem0/
│   ├── docker-compose.yml
│   └── README.md
├── embyserver/
│   ├── docker-compose.yml
│   └── README.md
├── metatube/
│   ├── docker-compose.yml
│   └── README.md
├── moviepilot-v2/
│   ├── docker-compose.yml
│   └── README.md
├── chinesesubfinder/
│   ├── docker-compose.yml
│   └── README.md
├── qbittorrent/
│   ├── docker-compose.yml
│   └── README.md
├── lucky/
│   ├── docker-compose.yml
│   └── README.md
├── music-tag-web/
│   ├── docker-compose.yml
│   └── README.md
└── navidrome/
    ├── docker-compose.yml
    └── README.md
```

---

## 统一运维与管理

### 1. 启动指定服务

进入对应服务目录，执行后台启动：

```bash
cd <service_name>
docker compose up -d
```

### 2. 更新服务镜像

```bash
cd <service_name>
docker compose pull
docker compose up -d
```

### 3. 查看容器日志

```bash
cd <service_name>
docker compose logs -f
```

---

## 特殊注意事项与避坑指南

1. **Syncthing 端口冲突避坑**:
   - 极空间系统内置服务占用了宿主机 `22000` 端口，容器映射必须使用 `22002:22000`。
   - 客户端（如 Mac mini 端 Syncthing）添加 NAS 设备时必须连接 `tcp://10.0.0.3:22002`。

2. **硬件转码权限**:
   - Emby Server 依赖核显节点 `/dev/dri/renderD128`，必须开启 `privileged: true` 并映射 devices。

3. **MoviePilot 秒级硬链接**:
   - 下载目录（如 `/media/download`）与影视库目录（如 `/media/movies`）必须挂载在同一物理存储卷下，方可实现 0 空间秒级硬链接。

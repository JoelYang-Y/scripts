export interface DockerServiceConfig {
  id: string;
  name: string;
  category: 'network' | 'media' | 'monitor' | 'tools' | 'music' | 'data' | 'cloud';
  categoryLabel: string;
  desc: string;
  port: string;
  host: string;
  envDesc: string[];
  compose: string;
}

export const DOCKER_SERVICES: DockerServiceConfig[] = [
  // ==================== 1. 网关与网络 (network) ====================
  {
    id: "sub-store",
    name: "Sub-Store 订阅转换中枢",
    category: "network",
    categoryLabel: "网关与网络",
    desc: "高级订阅转换、节点过滤、正则重命名与多节点同步后端",
    port: "3002",
    host: "10.0.0.3 (极空间 NAS)",
    envDesc: [
      "SUB_STORE_FRONTEND_BACKEND_PATH: API 访问安全前缀 (/T3B9dgzBzdRbBF8Aqx7P)",
      "SUB_STORE_DATA_BASE_PATH: 数据持久化存储路径 (/opt/app/data)",
      "Network Mode: Host 网络模式直连"
    ],
    compose: `version: '3.8'
services:
  sub-store:
    image: xream/sub-store:latest
    container_name: sub-store
    restart: always
    network_mode: host
    environment:
      - SUB_STORE_FRONTEND_BACKEND_PATH=/T3B9dgzBzdRbBF8Aqx7P
      - SUB_STORE_DATA_BASE_PATH=/opt/app/data
    volumes:
      - /Volume1/docker/sub-store:/opt/app/data
`
  },
  {
    id: "homelable",
    name: "Homelable 架构拓扑大屏",
    category: "network",
    categoryLabel: "网关与网络",
    desc: "家庭网络架构、服务依赖链路与物理节点拓扑可视化大屏",
    port: "3003",
    host: "10.0.0.3 (极空间 NAS)",
    envDesc: [
      "PORT: Web 前端展示端口 (3003 -> 3000)",
      "Volumes: 拓扑数据与配置持久化"
    ],
    compose: `version: '3.8'
services:
  homelable:
    image: ghcr.io/homelable/homelable:latest
    container_name: homelable
    restart: unless-stopped
    ports:
      - "3003:3000"
    volumes:
      - /Volume1/docker/homelable/data:/app/data
`
  },
  {
    id: "adguardhome",
    name: "AdGuard Home DNS 网关",
    category: "network",
    categoryLabel: "网关与网络",
    desc: "全网广告拦截、恶意追踪过滤、DoH/DoT 与局域网 DNS 调度中枢",
    port: "3000 / 53",
    host: "10.0.0.6 (DNS Alpine 宿主)",
    envDesc: [
      "Port 53: DNS 核心解析端口",
      "Port 3000: WebUI 控制台端口",
      "Network Mode: Host 网络模式"
    ],
    compose: `version: '3.8'
services:
  adguardhome:
    image: adguard/adguardhome:latest
    container_name: adguardhome
    restart: unless-stopped
    network_mode: host
    volumes:
      - /opt/adguardhome/work:/opt/adguardhome/work
      - /opt/adguardhome/conf:/opt/adguardhome/conf
`
  },
  {
    id: "openspeedtest",
    name: "OpenSpeedTest 内网测速",
    category: "network",
    categoryLabel: "网关与网络",
    desc: "HTML5 局域网千兆/2.5G 局域网带宽极速测速中枢",
    port: "6680 / 3004",
    host: "10.0.0.3 (极空间 NAS)",
    envDesc: [
      "Port 6680: HTTP 测速端口",
      "Port 3004: HTTPS 测速端口"
    ],
    compose: `version: '3.8'
services:
  openspeedtest:
    image: openspeedtest/latest:latest
    container_name: openspeedtest
    restart: unless-stopped
    ports:
      - "6680:3000"
      - "3004:3001"
`
  },

  // ==================== 2. 影音与影视 (media) ====================
  {
    id: "embyserver",
    name: "Emby Server 家庭私有影院",
    category: "media",
    categoryLabel: "影音与影视",
    desc: "个人私有流媒体影院、音视频海报墙与 Intel 核显 GPU 硬件转码服务器",
    port: "8096 / 8920",
    host: "10.0.0.3 (极空间 NAS)",
    envDesc: [
      "UID/GID: 0 (Root 权限读取媒体盘)",
      "Devices: /dev/dri Intel 核显硬件加速转码直通",
      "Network Mode: Host 模式确保 DLNA 设备发现"
    ],
    compose: `version: '3.8'
services:
  embyserver:
    image: amilys/embyserver:latest
    container_name: embyserver
    restart: unless-stopped
    network_mode: host
    environment:
      - UID=0
      - GID=0
      - GIDLIST=0
    volumes:
      - /Volume1/docker/emby/config:/config
      - /Volume1/Media:/media
    devices:
      - /dev/dri:/dev/dri
`
  },
  {
    id: "moviepilot-v2",
    name: "MoviePilot 全自动影视中枢",
    category: "media",
    categoryLabel: "影音与影视",
    desc: "全自动影视搜索、站点订阅、洗版、下载联动与刮削整理中枢",
    port: "3000",
    host: "10.0.0.3 (极空间 NAS)",
    envDesc: [
      "NGINX_PORT: Web 管理端口 (3000)",
      "AUTH_KEY: API 安全密钥认证",
      "Docker Sock: /var/run/docker.sock 容器状态调度"
    ],
    compose: `version: '3.8'
services:
  moviepilot:
    image: jxxghp/moviepilot:latest
    container_name: moviepilot
    restart: unless-stopped
    hostname: moviepilot
    ports:
      - "3000:3000"
    volumes:
      - /Volume1/docker/moviepilot/config:/config
      - /Volume1/Media:/media
      - /Volume1/docker/qbittorrent/downloads:/downloads
      - /var/run/docker.sock:/var/run/docker.sock:ro
`
  },
  {
    id: "qbittorrent",
    name: "qBittorrent 极速下载器",
    category: "media",
    categoryLabel: "影音与影视",
    desc: "高带宽 PT/BT 资源多线程下载、自动分类做种与 WebUI 管理",
    port: "8989",
    host: "10.0.0.3 (极空间 NAS)",
    envDesc: [
      "WEBUI_PORT: 8989 控制台端口",
      "Network Mode: Host 模式保证 PT 节点最高连接数",
      "PUID/PGID: 0 (文件所有者与下载目录权限)"
    ],
    compose: `version: '3.8'
services:
  qbittorrent:
    image: linuxserver/qbittorrent:latest
    container_name: qbittorrent
    restart: unless-stopped
    network_mode: host
    environment:
      - PUID=0
      - PGID=0
      - WEBUI_PORT=8989
    volumes:
      - /Volume1/docker/qbittorrent/config:/config
      - /Volume1/docker/qbittorrent/downloads:/downloads
`
  },
  {
    id: "chinesesubfinder",
    name: "ChineseSubFinder 中文字幕挂载",
    category: "media",
    categoryLabel: "影音与影视",
    desc: "自动化中文字幕批量匹配、下载与多来源字幕自动修正服务",
    port: "19035",
    host: "10.0.0.3 (极空间 NAS)",
    envDesc: [
      "PUID/PGID: 0",
      "Network Mode: Host 模式直连扫描媒体库"
    ],
    compose: `version: '3.8'
services:
  chinesesubfinder:
    image: allanpk716/chinesesubfinder:latest
    container_name: chinesesubfinder
    restart: unless-stopped
    network_mode: host
    environment:
      - PUID=0
      - PGID=0
    volumes:
      - /Volume1/docker/chinesesubfinder/config:/config
      - /Volume1/Media:/media
`
  },
  {
    id: "metatube",
    name: "MetaTube 影视元数据刮削",
    category: "media",
    categoryLabel: "影音与影视",
    desc: "专业影视元数据抓取插件服务端，提供高精度元数据与海报抓取",
    port: "8081",
    host: "10.0.0.3 (极空间 NAS)",
    envDesc: [
      "Port: 8081 服务端口",
      "TOKEN: 客户端调用认证 Token"
    ],
    compose: `version: '3.8'
services:
  metatube:
    image: metatube/metatube-server:latest
    container_name: metatube
    restart: unless-stopped
    ports:
      - "8081:8080"
    volumes:
      - /Volume1/docker/metatube/config:/config
`
  },

  // ==================== 3. 监控与探针 (monitor) ====================
  {
    id: "beszel-hub",
    name: "Beszel Hub 全主机探针大屏",
    category: "monitor",
    categoryLabel: "监控与探针",
    desc: "轻量级全物理机、LXC、虚拟机与云端 VPS 资源性能探针监控中枢",
    port: "8095",
    host: "10.0.0.3 (极空间 NAS)",
    envDesc: [
      "Port 8095: WebUI 面板访问端口",
      "KEY: Agent 公钥通信验证",
      "Volumes: 历史资源数据持久化"
    ],
    compose: `version: '3.8'
services:
  beszel-hub:
    image: henrygd/beszel:latest
    container_name: beszel-hub
    restart: unless-stopped
    ports:
      - "8095:8090"
    volumes:
      - /Volume1/docker/beszel/data:/beszel_data
`
  },
  {
    id: "uptime-kuma",
    name: "Uptime Kuma 服务监控",
    category: "monitor",
    categoryLabel: "监控与探针",
    desc: "19+ 核心容器与全球网络链路可用性秒级状态心跳探测与告警",
    port: "3005",
    host: "10.0.0.3 (极空间 NAS)",
    envDesc: [
      "Port 3005: Web 控制台与监控状态页",
      "Volumes: SQLite 数据库持久化"
    ],
    compose: `version: '3.8'
services:
  uptime-kuma:
    image: louislam/uptime-kuma:latest
    container_name: uptime-kuma
    restart: always
    ports:
      - "3005:3001"
    volumes:
      - /Volume1/docker/uptime-kuma:/app/data
`
  },

  // ==================== 4. 音乐与流媒体 (music) ====================
  {
    id: "navidrome",
    name: "Navidrome 私有音乐服务器",
    category: "music",
    categoryLabel: "音乐与流媒体",
    desc: "个人自建高保真音乐流媒体服务器，支持 Subsonic 协议全端播放器接入",
    port: "4533",
    host: "10.0.0.3 (极空间 NAS)",
    envDesc: [
      "ND_SCANSCHEDULE: 音乐库扫描计划",
      "ND_LOGLEVEL: 日志等级",
      "Port 4533: Web 播放器与 API 端口"
    ],
    compose: `version: '3.8'
services:
  navidrome:
    image: deluan/navidrome:latest
    container_name: navidrome
    restart: unless-stopped
    ports:
      - "4533:4533"
    environment:
      - ND_SCANSCHEDULE=1h
      - ND_LOGLEVEL=info
      - ND_SESSIONTIMEOUT=24h
    volumes:
      - /Volume1/docker/navidrome/data:/data
      - /Volume1/Music:/music:ro
`
  },
  {
    id: "music-tag-web",
    name: "Music-Tag-Web 音乐刮削整理",
    category: "music",
    categoryLabel: "音乐与流媒体",
    desc: "网页版音乐标签整理刮削器，支持网易云、QQ音乐、酷狗多源海报与歌词写入",
    port: "8002",
    host: "10.0.0.3 (极空间 NAS)",
    envDesc: [
      "Port 8002: Web 管理界面",
      "Volumes: 音乐目录读写权限"
    ],
    compose: `version: '3.8'
services:
  music-tag-web:
    image: xhongc/music_tag_web:latest
    container_name: music-tag-web
    restart: unless-stopped
    ports:
      - "8002:8002"
    volumes:
      - /Volume1/docker/music-tag-web/config:/app/data
      - /Volume1/Music:/app/media
`
  },

  // ==================== 5. 数据与知识库 (data) ====================
  {
    id: "qdrant-mem0",
    name: "Qdrant 向量记忆数据库",
    category: "data",
    categoryLabel: "数据与知识库",
    desc: "Hermes Agent 专用混合检索向量数据库 (Dense 512 + BM25 Hybrid Memory)",
    port: "6333 / 6334",
    host: "10.0.0.3 (极空间 NAS)",
    envDesc: [
      "Port 6333: REST API 端口",
      "Port 6334: gRPC 高性能通信端口",
      "Collection: hermes_memories_v2_hybrid"
    ],
    compose: `version: '3.8'
services:
  qdrant:
    image: qdrant/qdrant:latest
    container_name: qdrant
    restart: always
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - /Volume1/docker/qdrant/storage:/qdrant/storage
`
  },
  {
    id: "syncthing",
    name: "Syncthing 私有全端双向同步",
    category: "data",
    categoryLabel: "数据与知识库",
    desc: "Obsidian 个人笔记库与关键配置跨 Mac/iPad/iPhone 多端点对点加密同步",
    port: "8384 / 22002",
    host: "10.0.0.3 (极空间 NAS)",
    envDesc: [
      "Port 8384: Web GUI 管理控制台",
      "Port 22002: 数据传输端口 (避开极空间内置 22000 端口占用冲突)",
      "Port 21027: 本地发现广播端口"
    ],
    compose: `version: '3.8'
services:
  syncthing:
    image: syncthing/syncthing:latest
    container_name: syncthing
    restart: unless-stopped
    network_mode: host
    environment:
      - PUID=0
      - PGID=0
    volumes:
      - /Volume1/docker/syncthing/data:/var/syncthing
`
  },

  // ==================== 6. 云端生产与密码库 (cloud) ====================
  {
    id: "vaultwarden",
    name: "Vaultwarden 密码保险库",
    category: "cloud",
    categoryLabel: "云端生产与密码库",
    desc: "轻量级 Bitwarden 兼容私有端到端加密密码管理器",
    port: "8080",
    host: "129.146.122.202 (甲骨文 VPS)",
    envDesc: [
      "SIGNUPS_ALLOWED=false (禁止公开注册)",
      "WEBSOCKET_ENABLED=true (客户端实时同步推送)"
    ],
    compose: `version: '3.8'
services:
  vaultwarden:
    image: vaultwarden/server:latest
    container_name: vaultwarden
    restart: always
    environment:
      - SIGNUPS_ALLOWED=false
      - WEBSOCKET_ENABLED=true
    volumes:
      - /opt/vaultwarden/data:/data
    ports:
      - "127.0.0.1:8080:80"
`
  },
  {
    id: "docker-registry-mirror",
    name: "Docker 私有镜像加速缓存",
    category: "cloud",
    categoryLabel: "云端生产与密码库",
    desc: "自建 Registry v2 镜像加速缓存节点，实现内网拉取毫秒级响应",
    port: "5000",
    host: "129.146.122.202 (甲骨文 VPS)",
    envDesc: [
      "Port 5000: 内部 Docker Registry 端口",
      "REGISTRY_PROXY_REMOTEURL: 上游官方镜像源"
    ],
    compose: `version: '3.8'
services:
  docker-registry-mirror:
    image: registry:2
    container_name: docker-registry-mirror
    restart: always
    environment:
      - REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io
    volumes:
      - /opt/docker-registry/data:/var/lib/registry
    ports:
      - "127.0.0.1:5000:5000"
`
  }
];

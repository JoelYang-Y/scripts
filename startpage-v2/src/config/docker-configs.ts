export interface DockerServiceConfig {
  id: string;
  name: string;
  category: 'nas' | 'pve' | 'harness' | 'dns' | 'cloud';
  categoryLabel: string;
  desc: string;
  port: string;
  host: string;
  hostIp: string;
  envDesc: string[];
  compose: string;
}

export const DOCKER_SERVICES: DockerServiceConfig[] = [
  // =========================================================================
  // 1. DNS 枢纽节点 (10.0.0.6 · DNS-Alpine VM 100)
  // =========================================================================
  {
    id: "dns-adguardhome",
    name: "AdGuard Home DNS 网关",
    category: "dns",
    categoryLabel: "10.0.0.6 DNS枢纽",
    desc: "全网广告拦截、恶意追踪过滤、原生 HTTPS 443 DoH 与局域网 DNS 调度中枢",
    port: "3000 / 53 / 443",
    host: "10.0.0.6 (DNS-Alpine)",
    hostIp: "10.0.0.6",
    envDesc: [
      "Port 53: DNS 核心 UDP/TCP 53 解析端口",
      "Port 443: 原生 HTTPS / DoH 443 加密解析端口",
      "Port 3000: Web 控制台初始化与管理界面",
      "Network Mode: Host 网络模式直通网卡",
      "Upstream: 本机 127.0.0.1:5335 (PaoPaoDNS 递归)"
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
      - /etc/letsencrypt:/opt/adguardhome/ssl:ro
`
  },
  {
    id: "dns-paopaodns",
    name: "PaoPaoDNS 递归防污染",
    category: "dns",
    categoryLabel: "10.0.0.6 DNS枢纽",
    desc: "纯净 DNS 递归防污染解析容器，绑定南京电信递归服务器实现毫秒级国内 CDN 调度",
    port: "5335",
    host: "10.0.0.6 (DNS-Alpine)",
    hostIp: "10.0.0.6",
    envDesc: [
      "Port 5335: 本地递归 DNS 服务端口",
      "CNAUTO=yes: 自动识别国内域名并就近调度",
      "CUSTOM_FORWARD: 58.212.0.208 (南京电信递归出口)"
    ],
    compose: `version: '3.8'
services:
  paopaodns:
    image: slipk/paopaodns:latest
    container_name: paopaodns
    restart: always
    ports:
      - "5335:53/udp"
      - "5335:53/tcp"
    environment:
      - CNAUTO=yes
      - IPV6=yes
      - SOCKS5=
      - HTTP_PROXY=
    volumes:
      - /opt/paopaodns/data:/data
`
  },
  {
    id: "dns-beszel-agent",
    name: "Beszel Agent 探针 (DNS)",
    category: "dns",
    categoryLabel: "10.0.0.6 DNS枢纽",
    desc: "Alpine DNS 虚拟机轻量级资源与网络探针，秒级上报至 Beszel Hub",
    port: "45876",
    host: "10.0.0.6 (DNS-Alpine)",
    hostIp: "10.0.0.6",
    envDesc: [
      "PORT: 45876 探针通信端口",
      "KEY: Beszel Hub 公钥认证"
    ],
    compose: `version: '3.8'
services:
  beszel-agent:
    image: henrygd/beszel-agent:latest
    container_name: beszel-agent
    restart: unless-stopped
    network_mode: host
    environment:
      - PORT=45876
      - KEY=ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
`
  },

  // =========================================================================
  // 2. DeepSeek Harness 节点 (10.0.0.5 · CT 101)
  // =========================================================================
  {
    id: "harness-dsh-web",
    name: "DeepSeek Harness AI 智能体",
    category: "harness",
    categoryLabel: "10.0.0.5 AI中枢",
    desc: "基于 Nous Research 框架与 Gemini 3.7 Flash 的本地自动化编程、代码审计与任务派发中枢",
    port: "3000",
    host: "10.0.0.5 (Harness CT 101)",
    hostIp: "10.0.0.5",
    envDesc: [
      "PORT: 3000 WebUI 与 CLI 工作区访问端口",
      "Model: google/gemini-3.7-flash (Vertex AI Global)",
      "Workspace: /root/workspace 隔离沙箱环境"
    ],
    compose: `version: '3.8'
services:
  deepseek-harness:
    image: deepseek-ai/harness:latest
    container_name: deepseek-harness
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - GOOGLE_GENAI_USE_VERTEXAI=true
      - GOOGLE_CLOUD_LOCATION=global
    volumes:
      - /root/workspace:/workspace
      - /etc/dsh.env:/etc/dsh.env:ro
`
  },
  {
    id: "harness-beszel-agent",
    name: "Beszel Agent 探针 (Harness)",
    category: "harness",
    categoryLabel: "10.0.0.5 AI中枢",
    desc: "AI 编程智能体容器 CPU/内存负载与磁盘 I/O 实时监控探针",
    port: "45876",
    host: "10.0.0.5 (Harness CT 101)",
    hostIp: "10.0.0.5",
    envDesc: [
      "PORT: 45876",
      "Network Mode: Host"
    ],
    compose: `version: '3.8'
services:
  beszel-agent:
    image: henrygd/beszel-agent:latest
    container_name: beszel-agent
    restart: unless-stopped
    network_mode: host
    environment:
      - PORT=45876
      - KEY=ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
`
  },

  // =========================================================================
  // 3. PVE 物理宿主机 (10.0.0.4 · PVE-Host Debian 13)
  // =========================================================================
  {
    id: "pve-beszel-agent",
    name: "Beszel Agent 探针 (PVE 物理机)",
    category: "pve",
    categoryLabel: "10.0.0.4 PVE底座",
    desc: "PVE 物理硬件宿主机底层硬件指标（CPU 调频、NVMe SMART、虚拟化负载）监控探针",
    port: "45876",
    host: "10.0.0.4 (PVE 物理宿主)",
    hostIp: "10.0.0.4",
    envDesc: [
      "Port 45876: 物理机 Agent 端口",
      "Filesystems: 映射 /proc 与 /sys 采集底层温度与 NVMe 寿命"
    ],
    compose: `version: '3.8'
services:
  beszel-agent:
    image: henrygd/beszel-agent:latest
    container_name: beszel-agent
    restart: unless-stopped
    network_mode: host
    environment:
      - PORT=45876
      - KEY=ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...
      - FILESYSTEM=/dev/nvme0n1p3
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /sys:/sys:ro
`
  },

  // =========================================================================
  // 4. NAS 极空间中枢 (10.0.0.3 · Z4Pro)
  // =========================================================================
  {
    id: "nas-sub-store",
    name: "Sub-Store 订阅转换中枢",
    category: "nas",
    categoryLabel: "10.0.0.3 NAS容器",
    desc: "高级订阅转换、节点过滤、正则重命名与多节点同步后端",
    port: "3002",
    host: "10.0.0.3 (极空间 NAS)",
    hostIp: "10.0.0.3",
    envDesc: [
      "SUB_STORE_FRONTEND_BACKEND_PATH: API 访问安全前缀 (/T3B9dgzBzdRbBF8Aqx7P)",
      "SUB_STORE_DATA_BASE_PATH: 数据持久化路径 (/opt/app/data)",
      "Network Mode: Host"
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
    id: "nas-homelable",
    name: "Homelable 拓扑可视化",
    category: "nas",
    categoryLabel: "10.0.0.3 NAS容器",
    desc: "家庭网络架构拓扑可视化大屏，实时展示各节点与服务依赖",
    port: "3003",
    host: "10.0.0.3 (极空间 NAS)",
    hostIp: "10.0.0.3",
    envDesc: [
      "Ports: 3003 -> 3000"
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
    id: "nas-embyserver",
    name: "Emby Server 家庭影院",
    category: "nas",
    categoryLabel: "10.0.0.3 NAS容器",
    desc: "个人私有流媒体影院、音视频海报墙与 Intel 核显 GPU 硬件转码服务器",
    port: "8096 / 8920",
    host: "10.0.0.3 (极空间 NAS)",
    hostIp: "10.0.0.3",
    envDesc: [
      "UID/GID: 0 (Root 权限读写媒体库)",
      "Devices: /dev/dri Intel 核显硬件加速转码直通",
      "Network Mode: Host 模式"
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
    id: "nas-moviepilot-v2",
    name: "MoviePilot 影视整理中枢",
    category: "nas",
    categoryLabel: "10.0.0.3 NAS容器",
    desc: "全自动影视搜索、站点订阅、洗版、下载联动与刮削整理中枢",
    port: "3000",
    host: "10.0.0.3 (极空间 NAS)",
    hostIp: "10.0.0.3",
    envDesc: [
      "Ports: 3000:3000",
      "Docker Sock: /var/run/docker.sock"
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
    id: "nas-qbittorrent",
    name: "qBittorrent 极速下载器",
    category: "nas",
    categoryLabel: "10.0.0.3 NAS容器",
    desc: "高带宽 PT/BT 资源多线程下载与做种中枢",
    port: "8989",
    host: "10.0.0.3 (极空间 NAS)",
    hostIp: "10.0.0.3",
    envDesc: [
      "WEBUI_PORT=8989",
      "Network Mode: Host"
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
    id: "nas-beszel-hub",
    name: "Beszel Hub 全主机探针大屏",
    category: "nas",
    categoryLabel: "10.0.0.3 NAS容器",
    desc: "轻量级全主机、虚拟机与 VPS 探针监控控制大屏",
    port: "8095",
    host: "10.0.0.3 (极空间 NAS)",
    hostIp: "10.0.0.3",
    envDesc: [
      "Ports: 8095 -> 8090"
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
    id: "nas-uptime-kuma",
    name: "Uptime Kuma 服务监控",
    category: "nas",
    categoryLabel: "10.0.0.3 NAS容器",
    desc: "19+ 核心容器与网络链路可用性秒级状态心跳探测与告警",
    port: "3005",
    host: "10.0.0.3 (极空间 NAS)",
    hostIp: "10.0.0.3",
    envDesc: [
      "Ports: 3005 -> 3001"
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
  {
    id: "nas-qdrant-mem0",
    name: "Qdrant 向量记忆数据库",
    category: "nas",
    categoryLabel: "10.0.0.3 NAS容器",
    desc: "Hermes Agent 专用向量记忆检索数据库 (Dense 512 + BM25 Hybrid)",
    port: "6333 / 6334",
    host: "10.0.0.3 (极空间 NAS)",
    hostIp: "10.0.0.3",
    envDesc: [
      "Ports: 6333 (REST), 6334 (gRPC)"
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
    id: "nas-syncthing",
    name: "Syncthing 私有全端双向同步",
    category: "nas",
    categoryLabel: "10.0.0.3 NAS容器",
    desc: "Obsidian 个人笔记库与关键配置跨 Mac/iPad/iPhone 多端点对点加密同步",
    port: "8384 / 22002",
    host: "10.0.0.3 (极空间 NAS)",
    hostIp: "10.0.0.3",
    envDesc: [
      "Port 8384: Web GUI",
      "Port 22002: 避开极空间系统 22000 端口占用冲突"
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
  {
    id: "nas-navidrome",
    name: "Navidrome 私有音乐服务器",
    category: "nas",
    categoryLabel: "10.0.0.3 NAS容器",
    desc: "个人自建高保真音乐流媒体服务器，支持 Subsonic 协议全端播放器接入",
    port: "4533",
    host: "10.0.0.3 (极空间 NAS)",
    hostIp: "10.0.0.3",
    envDesc: [
      "Ports: 4533:4533",
      "ND_SCANSCHEDULE=1h"
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
    volumes:
      - /Volume1/docker/navidrome/data:/data
      - /Volume1/Music:/music:ro
`
  },
  {
    id: "nas-music-tag-web",
    name: "Music-Tag-Web 音乐刮削器",
    category: "nas",
    categoryLabel: "10.0.0.3 NAS容器",
    desc: "网页版音乐标签整理刮削器，支持网易云、QQ音乐多源歌词与封面写入",
    port: "8002",
    host: "10.0.0.3 (极空间 NAS)",
    hostIp: "10.0.0.3",
    envDesc: [
      "Ports: 8002:8002"
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
  {
    id: "nas-chinesesubfinder",
    name: "ChineseSubFinder 中文字幕挂载",
    category: "nas",
    categoryLabel: "10.0.0.3 NAS容器",
    desc: "自动化中文字幕批量匹配、下载与多来源字幕自动修正服务",
    port: "19035",
    host: "10.0.0.3 (极空间 NAS)",
    hostIp: "10.0.0.3",
    envDesc: [
      "Network Mode: Host"
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
    id: "nas-metatube",
    name: "MetaTube 影视元数据刮削",
    category: "nas",
    categoryLabel: "10.0.0.3 NAS容器",
    desc: "专业影视元数据抓取插件服务端，提供高精度元数据与海报抓取",
    port: "8081",
    host: "10.0.0.3 (极空间 NAS)",
    hostIp: "10.0.0.3",
    envDesc: [
      "Ports: 8081:8080"
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
  {
    id: "nas-openspeedtest",
    name: "OpenSpeedTest 内网测速",
    category: "nas",
    categoryLabel: "10.0.0.3 NAS容器",
    desc: "HTML5 局域网千兆/2.5G 局域网带宽极速测速中枢",
    port: "6680 / 3004",
    host: "10.0.0.3 (极空间 NAS)",
    hostIp: "10.0.0.3",
    envDesc: [
      "Ports: 6680 (HTTP), 3004 (HTTPS)"
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

  // =========================================================================
  // 5. 云端生产环境 (129.146.122.202 · Oracle OCI)
  // =========================================================================
  {
    id: "cloud-vaultwarden",
    name: "Vaultwarden 密码保险库",
    category: "cloud",
    categoryLabel: "云端生产节点",
    desc: "轻量级 Bitwarden 兼容私有端到端加密密码管理器",
    port: "8080",
    host: "129.146.122.202 (甲骨文 VPS)",
    hostIp: "129.146.122.202",
    envDesc: [
      "SIGNUPS_ALLOWED=false",
      "WEBSOCKET_ENABLED=true"
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
    id: "cloud-docker-mirror",
    name: "Docker 私有镜像加速缓存",
    category: "cloud",
    categoryLabel: "云端生产节点",
    desc: "自建 Registry v2 官方镜像加速缓存节点",
    port: "5000",
    host: "129.146.122.202 (甲骨文 VPS)",
    hostIp: "129.146.122.202",
    envDesc: [
      "REGISTRY_PROXY_REMOTEURL: https://registry-1.docker.io"
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

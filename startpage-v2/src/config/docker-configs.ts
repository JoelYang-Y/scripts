export interface DockerServiceConfig {
  id: string;
  name: string;
  category: 'network' | 'media' | 'monitor' | 'tools' | 'cloud';
  desc: string;
  port: string;
  host: string;
  envDesc: string[];
  compose: string;
}

export const DOCKER_SERVICES: DockerServiceConfig[] = [
  {
    id: "sub-store",
    name: "Sub-Store 订阅转换中枢",
    category: "tools",
    desc: "高级订阅转换、节点过滤、正则重命名与同步后端",
    port: "3002",
    host: "10.0.0.3 (NAS)",
    envDesc: [
      "SUB_STORE_FRONTEND_BACKEND_PATH: API 访问安全前缀 (/T3B9dgzBzdRbBF8Aqx7P)",
      "SUB_STORE_DATA_BASE_PATH: 数据持久化路径"
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
    name: "Homelable 拓扑可视化",
    category: "network",
    desc: "家庭网络架构、服务依赖与物理节点拓扑大屏",
    port: "3003",
    host: "10.0.0.3 (NAS)",
    envDesc: [
      "PORT: 服务监听端口 (3003)"
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
    id: "beszel-hub",
    name: "Beszel Hub 全主机探针大屏",
    category: "monitor",
    desc: "轻量级全物理机/虚拟机/VPS 资源探针监控中枢",
    port: "8095",
    host: "10.0.0.3 (NAS)",
    envDesc: [
      "PORT: WebUI 面板端口 (8095)",
      "KEY: Agent 通信公钥认证"
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
    desc: "19+ 核心容器与网络链路可用性秒级状态探测",
    port: "3005",
    host: "10.0.0.3 (NAS)",
    envDesc: [
      "DATA_DIR: SQLite 数据库与监控历史存储路径"
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
    id: "emby",
    name: "Emby Server 家庭影院",
    category: "media",
    desc: "个人私有流媒体影院与音视频硬件转码服务器",
    port: "8096",
    host: "10.0.0.3 (NAS)",
    envDesc: [
      "UID/GID: 媒体目录读写权限映射",
      "devices: /dev/dri 硬件转码直通"
    ],
    compose: `version: '3.8'
services:
  emby:
    image: amilys/embyserver:latest
    container_name: emby
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
    id: "moviepilot",
    name: "MoviePilot 自动刮削整理",
    category: "media",
    desc: "全自动影视搜索、订阅、下载联动与刮削整理中枢",
    port: "3000",
    host: "10.0.0.3 (NAS)",
    envDesc: [
      "NGINX_PORT: Web 管理端口",
      "AUTH_KEY: API 安全密钥"
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
    desc: "高带宽 PT/BT 资源多线程下载与做种服务",
    port: "8989",
    host: "10.0.0.3 (NAS)",
    envDesc: [
      "WEBUI_PORT: Web 控制台端口",
      "PUID/PGID: 文件所有者权限"
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
    id: "syncthing",
    name: "Syncthing 私有全端同步",
    category: "tools",
    desc: "Obsidian 笔记知识库与重要配置跨端多点双向加密同步",
    port: "8384",
    host: "10.0.0.3 (NAS)",
    envDesc: [
      "GUI 端口: 8384",
      "同步传输端口: 22000"
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
    id: "adguardhome",
    name: "AdGuard Home DNS 网关",
    category: "network",
    desc: "全网广告拦截、追踪过滤与本地 DNS 解析中枢",
    port: "3000 / 53",
    host: "10.0.0.6 (DNS Alpine)",
    envDesc: [
      "53: DNS 核心解析端口",
      "3000: WebUI 初始化与管理端口"
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
    id: "vaultwarden",
    name: "Vaultwarden 密码保险库",
    category: "cloud",
    desc: "轻量级 Bitwarden 兼容私有端到端加密密码管理器",
    port: "8080",
    host: "129.146.122.202 (甲骨文 VPS)",
    envDesc: [
      "SIGNUPS_ALLOWED: 是否允许公开注册",
      "WEBSOCKET_ENABLED: 实时推送支持"
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
  }
];

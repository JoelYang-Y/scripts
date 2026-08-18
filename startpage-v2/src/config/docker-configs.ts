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
  {
    "id": "nas-sub-store",
    "name": "Sub-Store 订阅转换中枢",
    "category": "nas",
    "categoryLabel": "10.0.0.3 NAS容器",
    "desc": "适用于 Surge / Clash / Loon 的订阅管理、节点转换与过滤平台 (带安全路径)",
    "port": "3002",
    "host": "10.0.0.3 (极空间 NAS)",
    "hostIp": "10.0.0.3",
    "envDesc": [
      "SUB_STORE_FRONTEND_BACKEND_PATH: API 访问安全前缀 (/T3B9dgzBzdRbBF8Aqx7P)",
      "原 NAS 宿主机实际路径: /tmp/zfsv3/sata12/18332733294/data/docker/substore",
      "端口映射: 3002:3001"
    ],
    "compose": "# ==============================================================================\n# 服务名称: Sub-Store (高级订阅管理与转换工具)\n# 部署方式: Docker Compose\n# 架构说明: 适用于 Surge / Clash / Loon / QX 等主流代理客户端的订阅管理、节点转换与过滤平台\n# ==============================================================================\n\nservices:\n  sub-store:\n    # 容器镜像: xream/sub-store 官方镜像 (国内拉取慢可用 docker.1ms.run/xream/sub-store:latest)\n    image: xream/sub-store:latest\n    \n    # 容器名称\n    container_name: sub-store\n    \n    # 重启策略: 容器意外退出或系统重启时始终自动重启\n    restart: always\n    \n    # 端口映射: [宿主机端口:容器内端口]\n    ports:\n      # Sub-Store Web 控制台与订阅 API 端口 (宿主机 3002 映射容器内默认服务端口 3001)\n      - \"3002:3001\"\n      \n    # 数据卷挂载: 持久化存储订阅配置、节点数据及缓存 [宿主机相对路径:容器内绝对路径]\n    # 原 NAS 宿主机实际路径: /tmp/zfsv3/sata12/18332733294/data/docker/substore\n    volumes:\n      # 数据目录持久化 (包含 sub-store.db 与相关配置文件)\n      - ./data:/opt/app/data\n      \n    # 环境变量配置\n    environment:\n      # 前端与后端通信的安全密钥路径 (防止未经授权的 API 访问，请妥善保管)\n      - SUB_STORE_FRONTEND_BACKEND_PATH=/T3B9dgzBzdRbBF8Aqx7P\n      # 系统时区\n      - TZ=Asia/Shanghai\n      - TIME_ZONE=Asia/Shanghai\n      \n    # 自定义容器启动命令: 确保数据目录存在并以指定路径启动 Node.js 服务\n    command: >\n      /bin/sh -c \"mkdir -p /opt/app/data; cd /opt/app/data; SUB_STORE_DOCKER=true SUB_STORE_FRONTEND_PATH=/opt/app/frontend SUB_STORE_DATA_BASE_PATH=/opt/app/data node /opt/app/sub-store.bundle.js\""
  },
  {
    "id": "nas-homelable",
    "name": "Homelable 网络拓扑大屏 (双容器)",
    "category": "nas",
    "categoryLabel": "10.0.0.3 NAS容器",
    "desc": "家庭网络拓扑与资产可视化看板 (前端 Nginx + 后端 FastAPI 双容器架构)",
    "port": "3003",
    "host": "10.0.0.3 (极空间 NAS)",
    "hostIp": "10.0.0.3",
    "envDesc": [
      "双容器架构: homelable-backend + homelable-frontend",
      "端口映射: 宿主机 3003 映射前端 Nginx 80 端口",
      "自动扫描内网设备、监控主机状态与网络资产看板"
    ],
    "compose": "# ==============================================================================\n# 服务名称: Homelable (家庭网络拓扑与资产可视化看板)\n# 部署方式: Docker Compose (双容器架构: 前端 Nginx + 后端 Python FastAPI/Uvicorn)\n# 架构说明: 自动扫描内网设备、监控主机状态、拓扑可视化与网络资产看板\n# ==============================================================================\n\nservices:\n  # 后端服务: 负责网络扫描、SQLite 数据库操作与 API 接口提供\n  backend:\n    # 容器镜像: Homelable 官方后端镜像\n    image: ghcr.io/pouzor/homelable-backend:latest\n    \n    # 容器名称\n    container_name: homelable-backend\n    \n    # 重启策略: 容器意外退出时自动重启\n    restart: unless-stopped\n    \n    # Linux 内核权限能力: 赋予网络管理与原始套接字权限，用于内网 ARP/ICMP 探测与设备发现\n    cap_add:\n      # 网络管理员权限: 允许配置网络接口与路由表探测\n      - NET_ADMIN\n      # 原始套接字权限: 允许发送 ICMP Ping 与 ARP 扫描数据包\n      - NET_RAW\n      \n    # 数据卷挂载: 持久化后端 SQLite 数据库及应用配置\n    # 原 NAS 宿主机实际路径: /tmp/zfsv3/nvme14/18332733294/data/Docker/homelable/data\n    volumes:\n      - ./data:/app/data\n      \n    # 环境变量配置\n    environment:\n      # 管理员登录用户名\n      - AUTH_USERNAME=JHSweetheart\n      # 管理员登录密码的 Bcrypt 哈希值\n      - AUTH_PASSWORD_HASH=$2b$12$u0Covfj10O3hnjB3iD1BlekQ1.MyjEt4j0k9S4nsySu7GaVIeFHY2\n      # 局域网扫描网段 (JSON 数组格式)\n      - SCANNER_RANGES=[\"10.0.0.0/24\"]\n      # 主机状态检测间隔时间 (单位: 秒)\n      - STATUS_CHECKER_INTERVAL=60\n      # 数据库连接 URL (使用 SQLite 本地数据库)\n      - DATABASE_URL=sqlite:///data/homelable.db\n      # 会话加解密安全密钥\n      - SECRET_KEY=homelable_secure_secret_key_change_me\n      \n    # 容器启动命令: 启动 Uvicorn ASGI 服务器，监听容器内部 8000 端口\n    command: [\"uvicorn\", \"app.main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"]\n\n  # 前端服务: 基于 Nginx 的 Web 静态页面展示与 API 请求反向代理\n  frontend:\n    # 容器镜像: Homelable 官方前端镜像\n    image: ghcr.io/pouzor/homelable-frontend:latest\n    \n    # 容器名称\n    container_name: homelable-frontend\n    \n    # 重启策略\n    restart: unless-stopped\n    \n    # 依赖关系: 确保后端服务启动后再启动前端\n    depends_on:\n      - backend\n      \n    # 端口映射: [宿主机端口:容器内端口]\n    ports:\n      # Web 前端访问端口 (宿主机 3003 映射容器内 Nginx 80 端口)\n      - \"3003:80\"\n      \n    # 数据卷挂载: 前端静态 HTML/JS 资源\n    # 原 NAS 宿主机实际路径: /tmp/zfsv3/nvme14/18332733294/data/Docker/homelable/html\n    volumes:\n      - ./html:/usr/share/nginx/html\n      \n    # 环境变量配置\n    environment:\n      # 后端 API 服务地址 (在同一 Compose 网络下直接使用后端容器名 backend:8000)\n      - BACKEND_URL=http://backend:8000"
  },
  {
    "id": "nas-embyserver",
    "name": "Emby Server 家庭私有影院",
    "category": "nas",
    "categoryLabel": "10.0.0.3 NAS容器",
    "desc": "家庭影音媒体服务器，支持 Intel 核显 QSV / VAAPI 硬件转码直通与海报墙",
    "port": "8096 / 8920",
    "host": "10.0.0.3 (极空间 NAS)",
    "hostIp": "10.0.0.3",
    "envDesc": [
      "UID/GID=0 (Root 权限无障碍读取全盘媒体资源)",
      "devices: /dev/dri Intel 核显硬件加速转码直通",
      "Network Mode: Host 模式确保 DLNA 设备发现与局域网满血吞吐"
    ],
    "compose": "# ==============================================================================\n# 服务名称: Emby Server (家庭影音媒体服务器)\n# 部署方式: Docker Compose\n# 架构说明: 集中管理电影、电视剧、动漫、音乐等媒体库，支持 Intel 核显 QSV / VAAPI 硬件转码\n# ==============================================================================\n\nservices:\n  embyserver:\n    # 容器镜像: amilys/embyserver (含开心版/增强转码支持)\n    image: amilys/embyserver:latest\n    \n    # 容器名称\n    container_name: embyserver\n    \n    # 网络模式: host 主机网络模式 (保障 DLNA/UPnP 广播发现、低延迟推流与多端口监听)\n    network_mode: host\n    \n    # 特权模式: 赋予容器完全硬件访问权限 (用于调用 Intel GPU 转码与多媒体驱动)\n    privileged: true\n    \n    # 重启策略: 容器异常或主机重启时始终重启\n    restart: always\n    \n    # 硬件设备直通: 映射核显渲染节点，开启 VAAPI / Intel QuickSync 硬解硬编\n    devices:\n      - /dev/dri/renderD128:/dev/dri/renderD128\n      \n    # Linux 安全能力扩展\n    cap_add:\n      - AUDIT_WRITE\n      - CHOWN\n      - DAC_OVERRIDE\n      - FOWNER\n      - FSETID\n      - KILL\n      - MKNOD\n      - NET_BIND_SERVICE\n      - NET_RAW\n      - SETFCAP\n      - SETGID\n      - SETPCAP\n      - SETUID\n      - SYS_CHROOT\n      \n    # 数据卷挂载: 配置文件与影视媒体库 [宿主机相对路径或绝对路径:容器内路径]\n    # 原 NAS 宿主机实际路径:\n    #   配置目录: /tmp/zfsv3/sata12/18332733294/data/docker/emby/config\n    #   媒体目录: /tmp/zfsv3/sata12/18332733294/data/media\n    volumes:\n      # Emby 配置文件、数据库与元数据缓存目录\n      - ./config:/config\n      # 媒体存储根目录 (包含 movies, tv, anime, music 等)\n      - /media:/media\n      \n    # 环境变量配置\n    environment:\n      # 运行身份 UID / GID: 设置为 0 (root) 确保对挂载硬盘与媒体文件的完全读写权限\n      - UID=0\n      - GID=0\n      - GIDLIST=0\n      # 系统时区\n      - TZ=Asia/Shanghai\n      # 强制启用 VAAPI 硬件加速检测\n      - IGNORE_VAAPI_ENABLED_FLAG=false\n      # 转码与图片缓存目录指定\n      - XDG_CACHE_HOME=/config/cache\n      # Intel OpenCL / Neo 驱动调试与显存优化参数\n      - NEOReadDebugKeys=1\n      - OverrideGpuAddressSpace=48\n      # NVIDIA 显卡调用支持 (如有独显)\n      - NVIDIA_VISIBLE_DEVICES=all\n      - NVIDIA_DRIVER_CAPABILITIES=compute,video,utility"
  },
  {
    "id": "nas-moviepilot-v2",
    "name": "MoviePilot-v2 影视整理中枢",
    "category": "nas",
    "categoryLabel": "10.0.0.3 NAS容器",
    "desc": "整合 PT/BT 搜索、自动下载、刮削、硬链接整理、Emby 通知的一站式管理系统",
    "port": "3000",
    "host": "10.0.0.3 (极空间 NAS)",
    "hostIp": "10.0.0.3",
    "envDesc": [
      "端口映射: 3000:3000",
      "挂载 /var/run/docker.sock 动态管理联动下载容器",
      "媒体与下载目录权限统一映射: PUID=0, PGID=0"
    ],
    "compose": "# ==============================================================================\n# 服务名称: MoviePilot-v2 (自动化影视库整理与下载管理中枢)\n# 部署方式: Docker Compose\n# 架构说明: 整合 PT/BT 搜索、自动下载、刮削、硬链接整理、Emby 通知与微信/Telegram 交互的一站式影视管理系统\n# ==============================================================================\n\nservices:\n  moviepilot-v2:\n    # 容器镜像: MoviePilot 官方 v2 镜像 (国内拉取慢可用 docker.1ms.run/jxxghp/moviepilot-v2:latest)\n    image: jxxghp/moviepilot-v2:latest\n    \n    # 容器名称\n    container_name: moviepilot-v2\n    \n    # 网络模式: host 主机网络模式 (方便发现并直连局域网内 qBittorrent, Emby, NAS 等服务)\n    network_mode: host\n    \n    # 特权模式: 赋予最高权限以便在不同挂载盘之间建立硬链接 (Hardlink)\n    privileged: true\n    \n    # 重启策略: 始终自动重启\n    restart: always\n    \n    # Linux 安全能力扩展\n    cap_add:\n      - AUDIT_WRITE\n      - CHOWN\n      - DAC_OVERRIDE\n      - FOWNER\n      - FSETID\n      - KILL\n      - MKNOD\n      - NET_BIND_SERVICE\n      - NET_RAW\n      - SETFCAP\n      - SETGID\n      - SETPCAP\n      - SETUID\n      - SYS_CHROOT\n      \n    # 数据卷挂载: 配置文件、浏览器核心缓存与媒体库目录 [宿主机相对/绝对路径:容器内路径]\n    # 原 NAS 宿主机实际路径:\n    #   配置目录: /tmp/zfsv3/sata12/18332733294/data/docker/moviepilot/config\n    #   核心缓存: /tmp/zfsv3/sata12/18332733294/data/docker/moviepilot/core\n    #   媒体目录: /tmp/zfsv3/sata12/18332733294/data/media\n    volumes:\n      # MoviePilot 配置、插件及 SQLite 数据库\n      - ./config:/config\n      # Playwright 无头浏览器核心缓存持久化 (避免每次更新重新下载浏览器二进制)\n      - ./core:/moviepilot/.cache/ms-playwright\n      # 媒体存储根目录 (包含下载源目录与最终媒体库，支持跨目录硬链接)\n      - /media:/media\n      \n    # 环境变量配置\n    environment:\n      # 系统时区: 保证定时任务与日志时间准确\n      - TZ=Asia/Shanghai\n      # 指定配置目录路径\n      - CONFIG_DIR=/config\n      # 运行用户 UID / GID: 设置为 0 (root) 确保能够跨目录创建硬链接和文件转移\n      - PUID=0\n      - PGID=0\n      # 文件创建权限掩码 (000 保证所有生成的文件全权限)\n      - UMASK=000\n      # 是否在容器启动时自动拉取代码更新 (推荐 false 保证生产稳定性)\n      - MOVIEPILOT_AUTO_UPDATE=false\n      # GitHub 加速代理 (用于国内环境下下载插件与站点规则)\n      - GITHUB_PROXY=https://gh-proxy.org/"
  },
  {
    "id": "nas-qbittorrent",
    "name": "qBittorrent-Enhanced 极速下载器",
    "category": "nas",
    "categoryLabel": "10.0.0.3 NAS容器",
    "desc": "全功能 BT/PT 下载利器，具备屏蔽吸血客户端 (迅雷等) 与自动更新 Tracker 特性",
    "port": "8989 / 6881",
    "host": "10.0.0.3 (极空间 NAS)",
    "hostIp": "10.0.0.3",
    "envDesc": [
      "镜像: johngong/qbittorrent:4.6.7-4.6.7.10 (增强防吸血版)",
      "Network Mode: Host 模式实现最高 PT/BT 吞吐量与 BT 监听端口直连",
      "WEB_PORT: 8989, BT_PORT: 6881"
    ],
    "compose": "# ==============================================================================\n# 服务名称: qBittorrent-Enhanced-Edition (全功能 BT/PT 下载利器)\n# 部署方式: Docker Compose\n# 架构说明: 具备屏蔽吸血客户端 (迅雷等)、自动更新 Tracker 列表与高性能磁盘 I/O 的下载服务器\n# ==============================================================================\n\nservices:\n  qbittorrent:\n    # 容器镜像: johngong/qbittorrent (集成屏蔽吸血客户端与增强特性的优质镜像)\n    image: johngong/qbittorrent:4.6.7-4.6.7.10\n    \n    # 容器名称\n    container_name: qbittorrent\n    \n    # 网络模式: host 主机网络模式 (保障 BT 监听端口 6881 获得最高连接数与公网入站连接)\n    network_mode: host\n    \n    # 特权模式: 提高网络性能与磁盘调度优先级\n    privileged: true\n    \n    # 重启策略: 始终自动重启\n    restart: always\n    \n    # Linux 安全能力扩展\n    cap_add:\n      - AUDIT_WRITE\n      - CHOWN\n      - DAC_OVERRIDE\n      - FOWNER\n      - FSETID\n      - KILL\n      - MKNOD\n      - NET_BIND_SERVICE\n      - NET_RAW\n      - SETFCAP\n      - SETGID\n      - SETPCAP\n      - SETUID\n      - SYS_CHROOT\n      \n    # 数据卷挂载: 配置文件、下载目录与完整媒体库 [宿主机相对/绝对路径:容器内路径]\n    # 原 NAS 宿主机实际路径:\n    #   配置目录: /tmp/zfsv3/sata12/18332733294/data/docker/qb/config\n    #   下载目录: /tmp/zfsv3/sata12/18332733294/data/media/download\n    #   媒体目录: /tmp/zfsv3/sata12/18332733294/data/media\n    volumes:\n      # qBittorrent 配置文件、BT 种子状态数据库与 FastResume 数据\n      - ./config:/config\n      # 默认下载存储路径\n      - /media/download:/Downloads\n      # 完整媒体库根目录 (支持跨文件夹硬链接与做种管理)\n      - /media:/media\n      \n    # 环境变量配置\n    environment:\n      # 运行用户 UID / GID: 0 (root 权限运行)\n      - UID=0\n      - GID=0\n      # 文件权限掩码\n      - UMASK=022\n      # 系统时区\n      - TZ=Asia/Shanghai\n      # WebUI 访问端口 (配置为 8989 避开常用 8080 冲突)\n      - QB_WEBUI_PORT=8989\n      # 是否使用 EE (Enhanced Edition) 二进制\n      - QB_EE_BIN=false\n      # 是否自动更新 Public Tracker 列表 (加速公网种子下载)\n      - QB_TRACKERS_UPDATE_AUTO=true\n      # Tracker 自动更新源 URL\n      - QB_TRACKERS_LIST_URL=https://raw.githubusercontent.com/ngosang/trackerslist/master/trackers_all.txt\n      # 下载完成后自动修正文件权限所有者\n      - ENABLE_CHOWN_DOWNLOADS=true\n      - ENABLE_CHOWN_R_DOWNLOADS=true\n      # 默认下载目标路径\n      - QB_DOWNLOADS_DIRECTORY=/Downloads\n      # S6 服务管理器超时设置\n      - S6_CMD_WAIT_FOR_SERVICES_MAXTIME=0"
  },
  {
    "id": "nas-beszel",
    "name": "Beszel Hub & Agent 性能监控",
    "category": "nas",
    "categoryLabel": "10.0.0.3 NAS容器",
    "desc": "极空间系统与容器性能监控全套 (Hub 服务端 8095 + Agent 客户端 45876)",
    "port": "8095 / 45876",
    "host": "10.0.0.3 (极空间 NAS)",
    "hostIp": "10.0.0.3",
    "envDesc": [
      "双容器协同: beszel-hub (8095:8090) + beszel-agent (Host 模式 45876)",
      "统一收集 NAS 自身、Mac mini、PVE Harness (10.0.0.5)、VPS 主机指标",
      "挂载 /var/run/docker.sock 自动采集所有运行中容器 CPU 与内存"
    ],
    "compose": "# ==============================================================================\n# 服务名称: Beszel Hub & Agent (极空间系统与容器性能监控全套)\n# 部署方式: Docker Compose\n# 架构说明: 统一收集 NAS 自身、Mac mini、PVE Harness (10.0.0.5)、VPS 主机与 Docker 指标\n# ==============================================================================\n\nversion: '3.8'\n\nservices:\n  # 中心服务端 (Web 管理控制台)\n  beszel-hub:\n    image: docker.1ms.run/henrygd/beszel:latest\n    container_name: beszel-hub\n    restart: unless-stopped\n    ports:\n      - \"8095:8090\"\n    volumes:\n      - ./data:/beszel_data\n    environment:\n      - TZ=Asia/Shanghai\n\n  # NAS 本地系统与容器监控探针\n  beszel-agent:\n    image: docker.1ms.run/henrygd/beszel-agent:latest\n    container_name: beszel-agent\n    restart: unless-stopped\n    network_mode: host\n    volumes:\n      # 挂载 Docker socket 监控 NAS 上的全部容器状态与资源\n      - /var/run/docker.sock:/var/run/docker.sock:ro\n    environment:\n      - TZ=Asia/Shanghai\n      - PORT=45876\n      # Hub 生成的安全认证公钥 (与 8095 控制台配对)\n      - KEY=ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIODn+CqgzpJ65PaOUL6MwueWlGh/MryzDBMAvWYAOtad"
  },
  {
    "id": "nas-uptime-kuma",
    "name": "Uptime Kuma 服务与链路监控",
    "category": "nas",
    "categoryLabel": "10.0.0.3 NAS容器",
    "desc": "监控 NAS 服务 (Emby/SubStore/Lucky)、VPS 节点、美国家宽出口及 DNS 链连通性",
    "port": "3005",
    "host": "10.0.0.3 (极空间 NAS)",
    "hostIp": "10.0.0.3",
    "envDesc": [
      "端口映射: 3005:3001",
      "SQLite 数据库持久化: ./data:/app/data",
      "支持 HTTP(s)、TCP、Ping、DNS 等多协议秒级探活"
    ],
    "compose": "# ==============================================================================\n# 服务名称: Uptime Kuma (自建轻量级服务可用性与网络监控系统)\n# 部署方式: Docker Compose\n# 架构说明: 监控 NAS 服务 (Emby/SubStore/Lucky)、VPS 节点、美国家宽出口及 DNS 链连通性\n# ==============================================================================\n\nversion: '3.8'\n\nservices:\n  uptime-kuma:\n    # 容器镜像: Uptime Kuma 官方最新镜像 (国内加速拉取)\n    image: docker.1ms.run/louislam/uptime-kuma:latest\n    \n    # 容器名称\n    container_name: uptime-kuma\n    \n    # 重启策略: 容器异常退出或系统重启时自动拉起\n    restart: unless-stopped\n    \n    # 端口映射: [宿主机端口:容器内端口]\n    ports:\n      # Web 控制台与 API 端口 (宿主机 3005 映射容器内默认服务端口 3001)\n      - \"3005:3001\"\n      \n    # 数据卷挂载: 持久化存储 SQLite 数据库、监控探针记录与告警配置\n    # 原 NAS 宿主机实际路径: /tmp/zfsv3/nvme14/18332733294/data/Docker/uptime-kuma/data\n    volumes:\n      - ./data:/app/data\n      \n    # 环境变量配置\n    environment:\n      # 系统时区: 确保监控图表与日志时间对齐北京时间\n      - TZ=Asia/Shanghai"
  },
  {
    "id": "nas-qdrant-mem0",
    "name": "Qdrant-Mem0 向量记忆数据库",
    "category": "nas",
    "categoryLabel": "10.0.0.3 NAS容器",
    "desc": "Hermes Agent 长期记忆向量数据库，为 Mem0 AI Agent 提供 Dense+BM25 混合检索",
    "port": "6333 / 6334",
    "host": "10.0.0.3 (极空间 NAS)",
    "hostIp": "10.0.0.3",
    "envDesc": [
      "端口映射: 6333:6333 (REST API), 6334:6334 (gRPC 高性能通信)",
      "存储持久化: ./storage:/qdrant/storage",
      "Collection: hermes_memories_v2_hybrid (512 维向量空间)"
    ],
    "compose": "# ==============================================================================\n# 服务名称: Qdrant-Mem0 (Hermes Agent 长期记忆向量数据库)\n# 部署方式: Docker Compose\n# 架构说明: 高性能开源向量搜索引擎，为 Mem0 / Hermes AI Agent 提供 Dense+BM25 混合检索支持\n# ==============================================================================\n\nservices:\n  qdrant:\n    # 容器镜像: Qdrant 官方最新稳定版\n    image: qdrant/qdrant:latest\n    \n    # 容器名称: 在 Docker 中命名为 qdrant-mem0\n    container_name: qdrant-mem0\n    \n    # 重启策略: 异常退出时自动重启\n    restart: unless-stopped\n    \n    # 运行用户: root 权限运行保证对持久化目录的完全读写\n    user: \"0:0\"\n    \n    # 端口映射: [宿主机端口:容器内端口]\n    ports:\n      # REST API 访问端口 (Mem0 SDK / HTTP 客户端连接)\n      - \"6333:6333\"\n      # gRPC 通信端口 (高性能向量检索)\n      - \"6334:6334\"\n      \n    # 数据卷挂载: 持久化向量索引、Payload 与 Snapshot [宿主机相对路径:容器内绝对路径]\n    # 原 NAS 宿主机实际路径: /tmp/zfsv3/nvme14/18332733294/data/Docker/hermesmemory/qdrant_data\n    volumes:\n      # Qdrant 存储目录 (包含 collections/hermes_memories_v2_hybrid 等)\n      - ./qdrant_data:/qdrant/storage\n      \n    # 环境变量配置\n    environment:\n      # 系统时区\n      - TZ=Asia/Shanghai\n      # 运行模式: 生产模式优化\n      - RUN_MODE=production"
  },
  {
    "id": "nas-syncthing",
    "name": "Syncthing 私有去中心化同步",
    "category": "nas",
    "categoryLabel": "10.0.0.3 NAS容器",
    "desc": "Obsidian 笔记库、手机相册、文档在 Mac / 手机 / NAS 间多向连续同步",
    "port": "8384 / 22002",
    "host": "10.0.0.3 (极空间 NAS)",
    "hostIp": "10.0.0.3",
    "envDesc": [
      "极空间避坑要点: 宿主 22000 已被 autoBackup 占用，本容器传输端口必须映射为 22002！",
      "端口映射: 8384:8384 (WebUI), 22002:22000 (TCP/UDP 数据传输), 21027:21027/udp",
      "权限映射: PUID=0, PGID=0"
    ],
    "compose": "# ==============================================================================\n# 服务名称: Syncthing (去中心化多端文件实时同步服务)\n# 部署方式: Docker Compose\n# 架构说明: 用于 Obsidian 笔记库、手机相册、文档在 Mac / 手机 / NAS 间多向连续同步\n# 极空间踩坑要点: 宿主机 22000 端口已被极空间系统 autoBackup 内置 syncthing 占用，\n#               本 Docker 容器必须将文件传输端口映射为 22002，否则会导致宿主进程冲突崩溃！\n# ==============================================================================\n\nservices:\n  syncthing:\n    # 容器镜像: Syncthing 官方最新镜像\n    image: syncthing/syncthing:latest\n    \n    # 容器名称\n    container_name: syncthing\n    \n    # 重启策略: 容器异常退出时自动重启\n    restart: unless-stopped\n    \n    # 端口映射: [宿主机端口:容器内端口]\n    ports:\n      # Web GUI 管理面板端口 (建议绑定 NAS 内网 IP 或 0.0.0.0)\n      - \"8384:8384\"\n      # 文件同步传输 TCP 端口 (宿主机 22002 映射容器内 22000，避开极空间系统 22000 端口)\n      - \"22002:22000/tcp\"\n      # 文件同步传输 UDP/QUIC 端口 (宿主机 22002 映射容器内 22000)\n      - \"22002:22000/udp\"\n      # 本地区域网络发现广播端口 (用于局域网设备自动发现)\n      - \"21027:21027/udp\"\n      \n    # 数据卷挂载: 持久化配置、同步目录与数据 [宿主机相对路径:容器内绝对路径]\n    # 原 NAS 宿主机实际路径: /data_s002/syncthing/\n    volumes:\n      # 配置文件目录 (存放 config.xml、TLS 证书及索引数据库)\n      - ./config:/var/syncthing/config\n      # 同步文件主目录 (Obsidian Vault 与主要同步文件)\n      - ./sync:/var/syncthing/sync\n      # 额外数据存储目录\n      - ./data:/var/syncthing/data\n      \n    # 环境变量配置\n    environment:\n      # 系统时区: 保持日志与文件修改时间戳准确\n      - TZ=Asia/Shanghai\n      # Web GUI 监听地址: 允许从所有网卡 IP 访问 Web 页面\n      - STGUIADDRESS=0.0.0.0:8384\n      # 指定 Syncthing 主配置路径\n      - STHOMEDIR=/var/syncthing/config\n      # 运行用户 UID: 映射为普通用户权限，防止权限混乱\n      - PUID=1000\n      # 运行用户 GID: 映射为普通用户组\n      - PGID=1000"
  },
  {
    "id": "nas-navidrome",
    "name": "Navidrome 个人音乐服务器",
    "category": "nas",
    "categoryLabel": "10.0.0.3 NAS容器",
    "desc": "现代化个人音乐流媒体服务器，完全兼容 Subsonic / OpenSubsonic API 全平台播放",
    "port": "4533",
    "host": "10.0.0.3 (极空间 NAS)",
    "hostIp": "10.0.0.3",
    "envDesc": [
      "端口映射: 4533:4533",
      "ND_SCANSCHEDULE=1h (每小时自动扫描音乐库更新)",
      "只读挂载音乐资产目录: /tmp/zfsv3/sata12/18332733294/data/media/Music:/music:ro"
    ],
    "compose": "# ==============================================================================\n# 服务名称: Navidrome (现代化个人音乐流媒体服务器)\n# 部署方式: Docker Compose\n# 架构说明: 超轻量级、高性能音乐服务器，完全兼容 Subsonic / OpenSubsonic API，支持全平台客户端播放\n# ==============================================================================\n\nservices:\n  navidrome:\n    # 容器镜像: Navidrome 官方镜像\n    image: deluan/navidrome:latest\n    \n    # 容器名称\n    container_name: navidrome\n    \n    # 重启策略: 始终自动重启\n    restart: always\n    \n    # 端口映射: [宿主机端口:容器内端口]\n    ports:\n      # WebUI 与 Subsonic API 服务端口 (宿主机 4533 映射容器内 4533)\n      - \"4533:4533\"\n      \n    # 数据卷挂载: 持久化数据库与音乐库目录 [宿主机相对/绝对路径:容器内路径]\n    # 原 NAS 宿主机实际路径:\n    #   数据目录: /tmp/zfsv3/sata12/18332733294/data/docker/navidrome/data\n    #   音乐目录: /tmp/zfsv3/sata12/18332733294/data/media/music\n    volumes:\n      # Navidrome 数据目录 (存放 SQLite 数据库 navidrome.db 与艺术家图片缓存)\n      - ./data:/data\n      # 音乐存储根目录 (只读挂载即可，保护音乐文件安全)\n      - /media/music:/music:ro\n      \n    # 环境变量配置\n    environment:\n      # 音乐库读取路径 (与容器内挂载点保持一致)\n      - ND_MUSICFOLDER=/music\n      # 数据库与缓存存放路径\n      - ND_DATAFOLDER=/data\n      # 配置文件路径\n      - ND_CONFIGFILE=/data/navidrome.toml\n      # 服务监听端口\n      - ND_PORT=4533\n      # 系统时区\n      - TZ=Asia/Shanghai\n      # Go 运行时抢占调度调优参数\n      - GODEBUG=asyncpreemptoff=1"
  },
  {
    "id": "nas-music-tag-web",
    "name": "Music-Tag-Web 音乐刮削器",
    "category": "nas",
    "categoryLabel": "10.0.0.3 NAS容器",
    "desc": "在线音乐标签与封面批量编辑整理工具，支持网易云、QQ音乐多源自动写入",
    "port": "8002",
    "host": "10.0.0.3 (极空间 NAS)",
    "hostIp": "10.0.0.3",
    "envDesc": [
      "端口映射: 8002:8002",
      "双向挂载读写音乐目录自动固化 ID3 标签与高清内嵌封面"
    ],
    "compose": "# ==============================================================================\n# 服务名称: Music-Tag-Web (在线音乐标签与封面批量编辑整理工具)\n# 部署方式: Docker Compose\n# 架构说明: 基于 WebUI 的音频元数据抓取工具，支持从网易云、QQ音乐、酷狗等平台批量自动写入 ID3 标签与高清封面\n# ==============================================================================\n\nservices:\n  music-tag-web:\n    # 容器镜像: xhongc/music_tag_web 官方镜像\n    image: xhongc/music_tag_web:latest\n    \n    # 容器名称\n    container_name: music-tag-web\n    \n    # 重启策略: 始终自动重启\n    restart: always\n    \n    # 端口映射: [宿主机端口:容器内端口]\n    ports:\n      # Web 管理界面端口 (宿主机 8002 映射容器内 8002)\n      - \"8002:8002\"\n      \n    # 数据卷挂载: 配置文件与音乐文件库 [宿主机相对/绝对路径:容器内路径]\n    # 原 NAS 宿主机实际路径:\n    #   配置目录: /tmp/zfsv3/sata12/18332733294/data/docker/musictag/config\n    #   音乐目录: /tmp/zfsv3/sata12/18332733294/data/media/music\n    volumes:\n      # 配置文件与刮削缓存\n      - ./config:/app/data\n      # 音乐存储目录 (读写挂载，以便直接修改音频文件的 ID3 标签与内嵌封面)\n      - /media/music:/app/media\n      \n    # 环境变量配置\n    environment:\n      # 运行环境: 生产环境模式\n      - BUILD_ENV=prod\n      # 运行用户 UID / GID: 设置为 0 (root) 保证对音频文件的直接读写修改权限\n      - PUID=0\n      - PGID=0\n      # 权限掩码\n      - UMASK=022\n      # 系统时区\n      - TZ=Asia/Shanghai"
  },
  {
    "id": "nas-chinesesubfinder",
    "name": "ChineseSubFinder 字幕自动化",
    "category": "nas",
    "categoryLabel": "10.0.0.3 NAS容器",
    "desc": "中文字幕自动化下载助手，自动化监控影视库并通过射手网/SubHD 匹配高质量字幕",
    "port": "19035",
    "host": "10.0.0.3 (极空间 NAS)",
    "hostIp": "10.0.0.3",
    "envDesc": [
      "端口映射: 19035:19035",
      "挂载点: 媒体库目录只读/写入双向支持"
    ],
    "compose": "# ==============================================================================\n# 服务名称: ChineseSubFinder (中文字幕自动化下载助手)\n# 部署方式: Docker Compose\n# 架构说明: 自动化监控影视媒体库，通过射手网、SubHD、字幕库等来源自动匹配下载高质量中文字幕\n# ==============================================================================\n\nservices:\n  chinesesubfinder:\n    # 容器镜像: ChineseSubFinder 官方镜像\n    image: allanpk716/chinesesubfinder:latest\n    \n    # 容器名称\n    container_name: chinesesubfinder\n    \n    # 网络模式: host 主机网络模式\n    network_mode: host\n    \n    # 重启策略: 始终自动重启\n    restart: always\n    \n    # Linux 安全能力扩展\n    cap_add:\n      - AUDIT_WRITE\n      - CHOWN\n      - DAC_OVERRIDE\n      - FOWNER\n      - FSETID\n      - KILL\n      - MKNOD\n      - NET_BIND_SERVICE\n      - NET_RAW\n      - SETFCAP\n      - SETGID\n      - SETPCAP\n      - SETUID\n      - SYS_CHROOT\n      \n    # 数据卷挂载: 配置文件与影视媒体库 [宿主机相对/绝对路径:容器内路径]\n    # 原 NAS 宿主机实际路径:\n    #   配置目录: /tmp/zfsv3/sata12/18332733294/data/docker/csf/config\n    #   媒体目录: /tmp/zfsv3/sata12/18332733294/data/media\n    volumes:\n      # 配置文件与字幕下载缓存\n      - ./config:/config\n      # 媒体存储根目录 (需要有写入权限以便将 .srt/.ass 字幕写入视频同级目录)\n      - /media:/media\n      \n    # 环境变量配置\n    environment:\n      # 系统时区\n      - TZ=Asia/Shanghai\n      # 启用文件权限自动修正\n      - PERMS=true\n      # 运行用户 UID / GID: 匹配 NAS 用户权限\n      - PUID=1026\n      - PGID=100\n      # 文件创建权限掩码\n      - UMASK=022"
  },
  {
    "id": "nas-metatube",
    "name": "MetaTube 多媒体刮削后端",
    "category": "nas",
    "categoryLabel": "10.0.0.3 NAS容器",
    "desc": "特殊影片高精度元数据抓取与刮削服务器，配合 Emby/Jellyfin 插件使用",
    "port": "8081",
    "host": "10.0.0.3 (极空间 NAS)",
    "hostIp": "10.0.0.3",
    "envDesc": [
      "端口映射: 8081:8080",
      "持久化配置目录: ./config:/config"
    ],
    "compose": "# ==============================================================================\n# 服务名称: MetaTube Server (多媒体元数据智能刮削后端)\n# 部署方式: Docker Compose\n# 架构说明: 针对日韩/欧美等特殊影片的高精度元数据抓取与刮削服务器，配合 Emby/Jellyfin 插件使用\n# ==============================================================================\n\nservices:\n  metatube:\n    # 容器镜像: MetaTube 官方镜像\n    image: ghcr.io/metatube-community/metatube-server:latest\n    \n    # 容器名称\n    container_name: metatube\n    \n    # 重启策略: 容器意外退出时自动重启\n    restart: unless-stopped\n    \n    # 端口映射: [宿主机端口:容器内端口]\n    ports:\n      # MetaTube Server API 监听端口 (宿主机 8081 映射容器内 8080)\n      - \"8081:8080\"\n      \n    # 数据卷挂载: 持久化 SQLite 数据库与刮削缓存\n    # 原 NAS 宿主机实际路径: /tmp/zfsv3/sata12/18332733294/data/docker/metatube/data\n    volumes:\n      # 数据目录 (存放 metatube.db)\n      - ./data:/data\n      \n    # 环境变量配置: 局域网网络代理 (用于访问外部元数据源)\n    environment:\n      # HTTP 代理地址 (指向局域网 Surge / Clash 代理端口)\n      - HTTP_PROXY=http://10.0.0.2:6152\n      # HTTPS 代理地址\n      - HTTPS_PROXY=http://10.0.0.2:6152\n      # 系统时区\n      - TZ=Asia/Shanghai\n      \n    # 容器启动参数: 指定 SQLite 数据库路径、服务端口并开启自动数据库迁移\n    command: -dsn \"/data/metatube.db\" -port 8080 -db-auto-migrate"
  },
  {
    "id": "nas-openspeedtest",
    "name": "OpenSpeedTest HTML5 测速",
    "category": "nas",
    "categoryLabel": "10.0.0.3 NAS容器",
    "desc": "基于 Nginx Alpine 驱动的高性能局域网测速服务器，免客户端免 Flash",
    "port": "6680 / 3004",
    "host": "10.0.0.3 (极空间 NAS)",
    "hostIp": "10.0.0.3",
    "envDesc": [
      "端口映射: 6680:80 (HTTP 测速), 3004:443 (HTTPS 测速)",
      "支持局域网 2.5G 高带宽压力测试"
    ],
    "compose": "# ==============================================================================\n# 服务名称: OpenSpeedTest (HTML5 网络测速工具)\n# 部署方式: Docker Compose\n# 架构说明: 基于 Nginx Alpine 驱动的高性能局域网/广域网测速服务器，免客户端免 Flash\n# ==============================================================================\n\nservices:\n  openspeedtest:\n    # 容器镜像: 官方标准 nginx:alpine 镜像 (国内拉取慢可用 docker.1ms.run/library/nginx:alpine)\n    image: nginx:alpine\n    \n    # 容器名称: 便于在 docker ps 和日志中识别\n    container_name: openspeedtest\n    \n    # 重启策略: 容器退出时自动重启，除非手动停止 (适用于长期稳定运行的后台服务)\n    restart: unless-stopped\n    \n    # 端口映射: [宿主机端口:容器内端口]\n    ports:\n      # 测速主端口 (极空间默认 6680 映射容器内 3000)\n      - \"6680:3000\"\n      # 备用/备选测速端口 (映射容器内 3000)\n      - \"3004:3000\"\n      \n    # 数据卷挂载: 持久化配置文件与测速静态页面 [宿主机相对路径:容器内绝对路径:权限]\n    # 原 NAS 宿主机实际路径: /tmp/zfsv3/nvme14/18332733294/data/Docker/openspeedtest/\n    volumes:\n      # Nginx 配置文件 (只读挂载，定义测速 chunk 大小与缓存规则)\n      - ./conf/default.conf:/etc/nginx/conf.d/default.conf:ro\n      # 测速 WebUI 静态文件与测速数据 payload 文件 (只读挂载)\n      - ./www:/usr/share/nginx/html:ro\n      \n    # 环境变量配置\n    environment:\n      # 系统时区: 确保日志时间与北京时间一致\n      - TZ=Asia/Shanghai"
  },
  {
    "id": "dns-adguardhome",
    "name": "AdGuard Home DNS 网关",
    "category": "dns",
    "categoryLabel": "10.0.0.6 DNS枢纽",
    "desc": "全网广告拦截、恶意追踪过滤、原生 HTTPS 443 DoH 与局域网 DNS 调度中枢",
    "port": "3000 / 53 / 443",
    "host": "10.0.0.6 (DNS-Alpine)",
    "hostIp": "10.0.0.6",
    "envDesc": [
      "Port 53: DNS 核心 UDP/TCP 53 解析端口",
      "Port 443: 原生 HTTPS / DoH 443 加密解析端口",
      "Port 3000: Web 控制台初始化与管理界面",
      "Network Mode: Host 网络模式直通网卡",
      "Upstream: 本机 127.0.0.1:5335 (PaoPaoDNS 递归)"
    ],
    "compose": "version: '3.8'\nservices:\n  adguardhome:\n    image: adguard/adguardhome:latest\n    container_name: adguardhome\n    restart: unless-stopped\n    network_mode: host\n    volumes:\n      - /opt/adguardhome/work:/opt/adguardhome/work\n      - /opt/adguardhome/conf:/opt/adguardhome/conf\n      - /etc/letsencrypt:/opt/adguardhome/ssl:ro\n"
  },
  {
    "id": "dns-paopaodns",
    "name": "PaoPaoDNS 递归防污染",
    "category": "dns",
    "categoryLabel": "10.0.0.6 DNS枢纽",
    "desc": "纯净 DNS 递归防污染解析容器，绑定南京电信递归服务器 (58.212.0.208) 实现毫秒级国内 CDN 调度",
    "port": "5335",
    "host": "10.0.0.6 (DNS-Alpine)",
    "hostIp": "10.0.0.6",
    "envDesc": [
      "Port 5335: 本地递归 DNS 服务端口 (映射容器 53 端口)",
      "CNAUTO=yes: 自动识别国内域名并就近调度",
      "CUSTOM_FORWARD: 58.212.0.208 (南京电信递归出口)"
    ],
    "compose": "version: '3.8'\nservices:\n  paopaodns:\n    image: slipk/paopaodns:latest\n    container_name: paopaodns\n    restart: always\n    ports:\n      - \"5335:53/udp\"\n      - \"5335:53/tcp\"\n    environment:\n      - CNAUTO=yes\n      - IPV6=yes\n      - SOCKS5=\n      - HTTP_PROXY=\n    volumes:\n      - /opt/paopaodns/data:/data\n"
  },
  {
    "id": "dns-beszel-agent",
    "name": "Beszel Agent 探针 (DNS 节点)",
    "category": "dns",
    "categoryLabel": "10.0.0.6 DNS枢纽",
    "desc": "Alpine DNS 虚拟机轻量级资源与网络探针，秒级上报至 Beszel Hub",
    "port": "45876",
    "host": "10.0.0.6 (DNS-Alpine)",
    "hostIp": "10.0.0.6",
    "envDesc": [
      "PORT: 45876 探针通信端口",
      "KEY: Beszel Hub 公钥认证"
    ],
    "compose": "version: '3.8'\nservices:\n  beszel-agent:\n    image: henrygd/beszel-agent:latest\n    container_name: beszel-agent\n    restart: unless-stopped\n    network_mode: host\n    environment:\n      - PORT=45876\n      - KEY=ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...\n    volumes:\n      - /var/run/docker.sock:/var/run/docker.sock:ro\n"
  },
  {
    "id": "harness-dsh-web",
    "name": "DeepSeek Harness AI 智能体",
    "category": "harness",
    "categoryLabel": "10.0.0.5 AI中枢",
    "desc": "基于 Nous Research 框架与 Gemini 3.7 Flash 的本地自动化编程、代码审计与任务派发中枢",
    "port": "3000",
    "host": "10.0.0.5 (Harness CT 101)",
    "hostIp": "10.0.0.5",
    "envDesc": [
      "PORT: 3000 WebUI 与 CLI 工作区访问端口",
      "Model: google/gemini-3.7-flash (Vertex AI Global)",
      "Workspace: /root/workspace 隔离沙箱环境"
    ],
    "compose": "version: '3.8'\nservices:\n  deepseek-harness:\n    image: deepseek-ai/harness:latest\n    container_name: deepseek-harness\n    restart: unless-stopped\n    ports:\n      - \"3000:3000\"\n    environment:\n      - PORT=3000\n      - GOOGLE_GENAI_USE_VERTEXAI=true\n      - GOOGLE_CLOUD_LOCATION=global\n    volumes:\n      - /root/workspace:/workspace\n      - /etc/dsh.env:/etc/dsh.env:ro\n"
  },
  {
    "id": "harness-beszel-agent",
    "name": "Beszel Agent 探针 (Harness 节点)",
    "category": "harness",
    "categoryLabel": "10.0.0.5 AI中枢",
    "desc": "AI 编程智能体容器 CPU/内存负载与磁盘 I/O 实时监控探针",
    "port": "45876",
    "host": "10.0.0.5 (Harness CT 101)",
    "hostIp": "10.0.0.5",
    "envDesc": [
      "PORT: 45876",
      "Network Mode: Host"
    ],
    "compose": "version: '3.8'\nservices:\n  beszel-agent:\n    image: henrygd/beszel-agent:latest\n    container_name: beszel-agent\n    restart: unless-stopped\n    network_mode: host\n    environment:\n      - PORT=45876\n      - KEY=ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...\n    volumes:\n      - /var/run/docker.sock:/var/run/docker.sock:ro\n"
  },
  {
    "id": "pve-beszel-agent",
    "name": "Beszel Agent 探针 (PVE 物理机)",
    "category": "pve",
    "categoryLabel": "10.0.0.4 PVE底座",
    "desc": "PVE 物理硬件宿主机底层硬件指标（CPU 调频、NVMe SMART、虚拟化负载）监控探针",
    "port": "45876",
    "host": "10.0.0.4 (PVE 物理宿主)",
    "hostIp": "10.0.0.4",
    "envDesc": [
      "Port 45876: 物理机 Agent 端口",
      "Filesystems: 映射 /proc 与 /sys 采集底层温度与 NVMe 寿命"
    ],
    "compose": "version: '3.8'\nservices:\n  beszel-agent:\n    image: henrygd/beszel-agent:latest\n    container_name: beszel-agent\n    restart: unless-stopped\n    network_mode: host\n    environment:\n      - PORT=45876\n      - KEY=ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...\n      - FILESYSTEM=/dev/nvme0n1p3\n    volumes:\n      - /var/run/docker.sock:/var/run/docker.sock:ro\n      - /sys:/sys:ro\n"
  },
  {
    "id": "cloud-vaultwarden-gateway",
    "name": "甲骨文 VPS 统一网关与 Vaultwarden",
    "category": "cloud",
    "categoryLabel": "云端生产节点",
    "desc": "甲骨文云宿主机三位一体生产架构: Nginx 网关 + Vaultwarden 密码库 + Docker Registry 缓存",
    "port": "80 / 443 / 8080 / 5000",
    "host": "129.146.122.202 (甲骨文 VPS)",
    "hostIp": "129.146.122.202",
    "envDesc": [
      "实机路径: /opt/vaultwarden/docker-compose.yml",
      "包含 unified-gateway-nginx (80/443), vaultwarden, docker-registry-mirror",
      "挂载 /opt/startpage 导航站静态资源与 Let's Encrypt 证书"
    ],
    "compose": "services:\n  vaultwarden:\n    image: vaultwarden/server:latest\n    container_name: vaultwarden\n    restart: always\n    environment:\n      - WEBSOCKET_ENABLED=true\n      - SIGNUPS_ALLOWED=false\n      - INVITATIONS_ALLOWED=false\n      - SHOW_PASSWORD_HINT=false\n      - DOMAIN=https://oracle.jhsweetheart.com\n      - LOG_FILE=/data/vaultwarden.log\n      - LOG_LEVEL=Info\n    volumes:\n      - ./data:/data\n\n  registry:\n    image: registry:2\n    container_name: docker-registry-mirror\n    restart: always\n    environment:\n      REGISTRY_PROXY_REMOTEURL: https://registry-1.docker.io\n      REGISTRY_STORAGE_DELETE_ENABLED: true\n      REGISTRY_HTTP_ADDR: 0.0.0.0:5000\n    volumes:\n      - /opt/docker-registry/data:/var/lib/registry\n\n  nginx:\n    image: nginx:alpine\n    container_name: unified-gateway-nginx\n    restart: always\n    ports:\n      - 80:80\n      - 443:443\n    volumes:\n      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro\n      - /usr/local/etc/fullchain.pem:/usr/local/etc/fullchain.pem:ro\n      - /usr/local/etc/privkey.pem:/usr/local/etc/privkey.pem:ro\n      - /etc/letsencrypt:/etc/letsencrypt:ro\n      - /opt/startpage:/usr/share/nginx/html/startpage:ro\n    depends_on:\n      - vaultwarden\n      - registry\n"
  }
];

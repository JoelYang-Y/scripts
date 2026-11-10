# 极空间 Z4Pro NAS · Docker 部署全解（10.0.0.3）

> 采集基线：**2026-11-11**，来源为实机 `docker inspect` / `docker ps` / `daemon.json` / compose 文件原文，非推测。
> 容器总数 **18**（10 个 Compose 管理 + 8 个 `docker run` 创建），镜像拉取统一走国内加速源。

---

## 1. 主机与 Docker 运行时

| 项 | 值 |
|---|---|
| 主机名 / 系统 | `Z4Pro-Z66F` · `zos`（极空间定制系统）· Linux 5.19.17-z4pro-generic x86_64 |
| Docker 版本 | **26.1.4**（服务端） |
| 存储驱动 | `overlay2` |
| cgroup 驱动 | `systemd` |
| Docker 数据根 | `/data_s002/data/udata/real/zdocker`（**非默认路径**，重装系统后须回填） |
| 日志策略 | `json-file`，`max-size=20m`、`max-file=1`（单容器上限 20MB，防日志撑爆） |
| IPv6 | 启用，固定 CIDR `fd00:db7::/48`（bridge 网络带 IPv6） |
| live-restore | `false`（Docker 重启会连带重启容器） |
| seccomp | 自定义 `/etc/docker/seccomp-copyfail-block.json`（缓解 copy_file_range 提权面） |
| 自启 | `systemctl is-enabled docker` = **disabled**，容器由极空间 ZOS 的容器服务托管开机拉起 |

### `/etc/docker/daemon.json`（原文）

```json
{
  "data-root": "/data_s002/data/udata/real/zdocker",
  "fixed-cidr-v6": "fd00:db7::/48",
  "ipv6": true,
  "live-restore": false,
  "log-driver": "json-file",
  "log-opts": { "max-file": "1", "max-size": "20m" },
  "registry-mirrors": [
    "https://dockerpull.org/",
    "https://docker.ketches.cn/",
    "https://registry.zenithspace.net",
    "https://registry-1.docker.io"
  ],
  "seccomp-profile": "/etc/docker/seccomp-copyfail-block.json",
  "storage-driver": "overlay2"
}
```

**要点**

- `data-root` 落在机械/固态数据盘，系统盘只放 Docker 二进制；备份容器服务时**必须连同该目录一起考虑**。
- `registry-mirrors` 四个源按顺序尝试，前置源失效时 Docker 会回落，最后一个指向官方。
- `max-file=1` 意味着日志只保留一份，排查长时间问题需外部采集（NAS 未接集中日志）。

---

## 2. 容器总览（18 个）

| 容器 | 部署方式 | 镜像 | 端口 | 网络 | 挂载 | 重启策略 |
|---|---|---|---|---|---|---|
| `homelab-gateway-nginx` | Compose `unified-gateway` | `docker.1ms.run/nginx:alpine` | —（host） | host | 2 | always |
| `beszel-hub` | Compose `beszel` | `docker.1ms.run/henrygd/beszel:latest` | 8095→8090 | beszel_default | 1 | unless-stopped |
| `beszel-agent` | Compose `beszel` | `docker.1ms.run/henrygd/beszel-agent:latest` | —（host，45876） | host | 2 | unless-stopped |
| `uptime-kuma` | Compose `uptime-kuma` | `docker.1ms.run/louislam/uptime-kuma:latest` | 3005→3001 | uptime-kuma_default | 1 | unless-stopped |
| `paopaodns` | Compose `paopaodns` | `sliamb/paopaodns:latest` | 5335、5304、7889 | paopaodns_default | 1 | always |
| `qdrant-mem0` | Compose `mem0` | `qdrant/qdrant:latest` | 6333、6334 | mem0_default | 1 | unless-stopped |
| `homelable-frontend` | Compose `homelable` | `ghcr.io/pouzor/homelable-frontend:latest` | 3003→80 | homelable_default | 1 | unless-stopped |
| `homelable-backend` | Compose `homelable` | `ghcr.io/pouzor/homelable-backend:latest` | —（内网 8000） | homelable_default | 1 | unless-stopped |
| `openspeedtest` | Compose `openspeedtest` | `docker.1ms.run/library/nginx:alpine` | 6680→3000、3004→3000 | openspeedtest_default | 2 | unless-stopped |
| `metatube` | Compose `metatube` | `ghcr.io/metatube-community/metatube-server:latest` | 8081→8080 | metatube_default | 1 | unless-stopped |
| `embyserver` | `docker run` | `docker.1ms.run/amilys/embyserver:latest` | 8096、8920、1900/u、7359/u（host） | host | 2 | always |
| `moviepilot-v2` | `docker run` | `docker.1ms.run/jxxghp/moviepilot-v2:latest` | 3000（host） | host | 3 | always |
| `qbittorrent` | `docker run` | `johngong/qbittorrent:4.6.7-4.6.7.10` | 8989、6881/tcp+udp（host） | host | 3 | always |
| `chinesesubfinder` | `docker run` | `allanpk716/chinesesubfinder:latest` | —（host 网络，应用监听 19035） | host | 2 | always |
| `deluan_navidrome` | `docker run` | `deluan/navidrome:latest` | 4533→4533 | bridge | 2 | always |
| `xhongc_music_tag_web` | `docker run` | `xhongc/music_tag_web:latest` | 8002→8002 | bridge | 2 | always |
| `syncthing` | `docker run` | `syncthing/syncthing:latest` | 8384→8384（仅 10.0.0.3）、22002→22000、21027/udp | bridge | 4 | unless-stopped |
| `xream_sub-store` | `docker run` | `docker.1ms.run/xream/sub-store:latest` | 3002→3001 | bridge | 1 | always |

> 部署方式判定依据：容器标签 `com.docker.compose.project` 存在即为 Compose 管理；缺失则视为 `docker run` 创建（其 compose 文件为**按实机参数反推的等效配置**，用于重建/迁移，未在生产切换）。

---

## 3. 端口占用总表

| 端口 | 协议 | 服务 | 监听范围 |
|---|---|---|---|
| 3000 | tcp | moviepilot-v2（host 网络） | 0.0.0.0 |
| 3002 | tcp | Sub-Store | 0.0.0.0 |
| 3003 | tcp | Homelable 前端 | 0.0.0.0 |
| 3004 | tcp | OpenSpeedTest（备用入口） | 0.0.0.0 |
| 3005 | tcp | Uptime Kuma | 0.0.0.0 |
| 4533 | tcp | Navidrome | 0.0.0.0 |
| 5304 | tcp/udp | PaoPaoDNS 管理 | 0.0.0.0 |
| 5335 | tcp/udp | PaoPaoDNS DNS | 0.0.0.0 |
| 6333 / 6334 | tcp | Qdrant REST / gRPC | 0.0.0.0 |
| 6680 | tcp | OpenSpeedTest 主入口 | 0.0.0.0 |
| 6881 | tcp/udp | qBittorrent BT | host |
| 7889 | tcp | PaoPaoDNS Web | 0.0.0.0 |
| 8002 | tcp | Music-Tag-Web | 0.0.0.0 |
| 8081 | tcp | MetaTube | 0.0.0.0 |
| 8095 | tcp | Beszel Hub | 0.0.0.0 |
| 8384 | tcp | Syncthing Web UI | **仅 10.0.0.3** |
| 8096 / 8920 | tcp | Emby HTTP / HTTPS | host |
| 8989 | tcp | qBittorrent Web UI | host |
| 1900/udp、7359/udp | udp | Emby DLNA / 发现 | host |
| 21027/udp、22002 | udp/tcp | Syncthing 发现 / 同步 | 0.0.0.0 |
| 45876 | tcp | Beszel Agent | host |

**冲突提示**：`3000`、`3005`、`8081` 等端口与 `homelab-gateway-nginx` 的反代规则耦合，改动前先看网关配置（`compose/nas/unified-gateway.yml`）。

---

## 4. 网络与卷

- **15 个网络**：`host`、`bridge`（IPv6 已开）+ 各 Compose 项目的 `*_default`。
- **6 个疑似遗留网络**（无容器挂载，确认后可清理）：`appstore_default`、`avtube_default`、`meta_default`、`meta-av_default`、`metatube-av_default`、`none`。
  > 清理命令：`docker network rm <name>`；先 `docker network inspect <name>` 确认无人使用。
- **6 个卷**：均为匿名卷（`com.docker.volume.anonymous`），其中 `syncthing` 的 `/var/syncthing` 使用匿名卷 + 三个宿主目录双挂载，迁移时**不要只迁宿主目录**，匿名卷内的 `index-v0.14.0.db` 也要一并处理（见 §5.16）。
- 其余服务全部使用**宿主目录绑定挂载**（bind mount），数据在 `/tmp/zfsv3/{nvme14,sata12}/...` 与 `/data_s002/...` 下；备份策略按目录打包即可。

---

## 5. 逐服务详解

> 每节结构：用途 → 部署方式 → 实机参数 → 配置要点/坑。Compose 原文见 `compose/nas/<目录>.yml`（已加中文注释）。

### 5.1 homelab-gateway-nginx（统一反代入口）

- **用途**：NAS 上所有 Web 服务的统一 HTTPS 入口，按域名分发到各容器端口。
- **部署**：Compose 项目 `unified-gateway`，`network_mode: host`（因此没有端口映射，直接占用宿主 80/443）。
- **挂载**：`./conf.d:/etc/nginx/conf.d:ro`、`./ssl:/etc/nginx/ssl:ro`。
- **要点**：host 网络下容器与宿主共享端口空间，任何抢占 80/443 的容器都会冲突；证书轮换后需 `docker restart homelab-gateway-nginx` 才会生效（nginx 不热加载）。

### 5.2 beszel-hub / beszel-agent（资源监控）

- **用途**：Hub 提供 Web 面板（8095），Agent 采集 NAS 自身 + 其他主机指标（45876）。
- **部署**：Compose 项目 `beszel`；Agent 用 `network_mode: host` 才能读到真实网络/端口。
- **挂载**：Hub `./data:/beszel_data`；Agent 挂 `/var/run/docker.sock:ro`（读取容器指标，只读）。
- **环境**：`PORT=45876`、`KEY=<Beszel 公钥>`（**公钥非密钥**，用于 Hub↔Agent 认证）。
- **要点**：Agent 挂载 docker.sock 属于高权限只读面，禁止改成读写；Hub 数据在 `./data`，迁移后需重新配对 Agent 才恢复曲线。

### 5.3 uptime-kuma（可用性监控）

- **用途**：HTTP/TCP 探针 + 告警（Telegram），监控 NAS 服务、VPS、家宽出口。
- **部署**：Compose 项目 `uptime-kuma`，`3005:3001`，数据 `./data`。
- **要点**：健康检查为容器自带 `healthy` 状态；告警通知配置存 SQLite（`./data/kuma.db`），备份该目录即可保留全部探针与通知渠道。

### 5.4 paopaodns（本机 DNS 后端）

- **用途**：国内/国外域名分流递归解析，作为 AdGuard Home 的上游之一。
- **部署**：Compose 项目 `paopaodns`，`restart: always`。
- **端口**：`5335:53`（DNS）、`5304`、`7889`（Web/管理）。
- **环境差异**：本实例 `IPV6=yes`、`CUSTOM_FORWARD_TTL=0`（不缓存上游结果）；VM100 实例为 `yes_only6` + TTL 300。
- **要点**：`/data` 整目录持久化；`IPV6=yes` 与 VM100 的 `yes_only6` 不要互相复制，否则 AAAA 行为会变。

### 5.5 qdrant-mem0（Hermes 长期记忆向量库）

- **用途**：Hermes / Mem0 的向量存储（`hermes_memories_v2_hybrid` 等集合）。
- **部署**：Compose 项目 **`mem0`**（注意目录名 `hermesmemory` ≠ 项目名 `mem0`），`./qdrant_data:/qdrant/storage`。
- **端口**：6333（REST）、6334（gRPC）。
- **要点**：集合维度 512（bge-small-zh-v1.5）；删除集合不可恢复，备份用 `hermes_backup_local.py` 的 scroll 导出而非直接拷卷（Qdrant 运行中拷卷可能不一致）。

### 5.6 homelable 前端 + 后端（家庭拓扑大屏）

- **用途**：家庭网络拓扑可视化（10.0.0.3:3003），后端 FastAPI 提供设备/链路数据。
- **部署**：Compose 项目 `homelable`，两容器同网络；前端 `3003:80`，`BACKEND_URL=http://backend:8000`。
- **权限**：后端 `cap_add: [NET_ADMIN, NET_RAW]`（做局域网探测/ARP 需要），**不要**加 `privileged`。
- **环境**：后端用 `env_file: .env`（含扫描网段等），该文件不入库。
- **要点**：前端静态目录 `./html` 可直接替换实现改版；后端数据 `./data`。

### 5.7 openspeedtest（局域网测速）

- **用途**：内网 HTML5 测速页（6680 主入口，3004 备用）。
- **部署**：Compose 项目 `openspeedtest`，基于 `nginx:alpine`，挂 `./conf/default.conf` 与 `./www`。
- **要点**：不是官方 openspeedtest 镜像，而是 nginx 托管静态页 + 自定义配置；升级 nginx 镜像前先比对 `default.conf` 的 `client_max_body_size` 等参数。

### 5.8 metatube（影视元数据刮削）

- **用途**：为 Emby/MoviePilot 提供元数据聚合接口（8081）。
- **部署**：Compose 项目 `metatube`，命令 `-dsn /data/metatube.db -port 8080 -db-auto-migrate`。
- **环境**：`HTTP_PROXY/HTTPS_PROXY=http://10.0.0.2:6152`（走 Mac mini Surge 出口）。
- **要点**：代理不可用时刮削会整体超时；SQLite 在 `./data/metatube.db`，迁移只搬该目录即可。

### 5.9 embyserver（家庭影音中心）

- **部署**：`docker run` 创建，**`privileged: true`**，`network_mode: host`。
- **设备直通**：`/dev/dri/renderD128`（Intel 核显硬解/硬转码，`rwm`）。
- **挂载**：`/tmp/zfsv3/sata12/.../docker/emby/config→/config`、`.../data/media→/media`。
- **生效端口**：8096（HTTP）、8920（HTTPS）、1900/udp（DLNA）、7359/udp（客户端发现）。
- **要点**：host 网络 + 特权 + 核显三项缺一不可；核显驱动升级或内核更新后需重启容器，否则转码回落到软解（CPU 打满）。等效 compose 见 `compose/nas/embyserver.yml`。

### 5.10 moviepilot-v2（影视自动化中枢）

- **部署**：`docker run` 创建，`privileged: true` + `network_mode: host`（3000 直出）。
- **挂载**：`media→/media`（与 qB/Emby 共用，实现硬链接入库）、`docker/moviepilot/config→/config`、`docker/moviepilot/core→/moviepilot/.cache/ms-playwright`（浏览器内核持久化，避免每次重装）。
- **要点**：硬链接要求/downloads 与 /media 在**同一文件系统**；`MOVIEPILOT_AUTO_UPDATE` 若开启，容器重启会自动升级容器内代码，与镜像版本解耦，排障时以容器内版本为准。

### 5.11 qbittorrent（下载器）

- **部署**：`docker run`，`privileged: true` + host 网络（8989 Web、6881 BT tcp/udp）。
- **挂载**：`media/download→/Downloads`、`media→/media`、`docker/qb/config→/config`。
- **环境**：`QB_WEBUI_PORT=8989`、`QB_TRACKERS_UPDATE_AUTO`、`PUID/PGID/UMASK`。
- **要点**：镜像锁版本 `4.6.7-4.6.7.10`（libtorrent 1.2 线），**不要随手 `latest`**，4.6+ 与 5.x 的 API/配置不兼容；`UMASK` 决定下载文件权限，改小会影响 Emby 读取。

### 5.12 chinesesubfinder（中文字幕）

- **部署**：`docker run`，host 网络（容器内监听 19035，无端口映射），挂 `media→/media`、`docker/csf/config→/config`。
- **环境**：`PUID/PGID/UMASK/PERMS`。
- **要点**：与 Emby/MoviePilot 共用媒体目录，权限需一致；字幕命名规则在 config 内，改库结构后要重新扫描。

### 5.13 deluan_navidrome（音乐流媒体）

- **部署**：`docker run`，bridge 网络，`4533:4533`。
- **挂载**：`docker/navidrome/data→/data`、`media/music→/music`。
- **环境**：`ND_MUSICFOLDER=/music`、`ND_DATAFOLDER=/data`、`ND_PORT=4533`。
- **要点**：扫描靠文件 mtime，音乐库大批量改动后需在 UI 触发全量扫描；数据库在 `/data/navidrome.db`。

### 5.14 xhongc_music_tag_web（音乐标签）

- **部署**：`docker run`，`8002:8002`，挂 `docker/musictag/config→/app/data`、`media/music→/app/media`。
- **要点**：直接写 ID3 标签到音乐文件，**操作前先备份**；与 Navidrome 共用目录，写入后 Navidrome 需重新扫描。

### 5.15 syncthing（多端同步）

- **部署**：`docker run`，bridge；`22002:22000`（**故意避开 22000**，给极空间内置同步留位）、`21027/udp`、`8384` 仅绑定 `10.0.0.3`。
- **挂载**：匿名卷 `/var/syncthing` + `/data_s002/syncthing/{config,data,sync}`。
- **环境**：`STGUIADDRESS`、`STHOMEDIR`、`PUID/PGID`。
- **要点**：`8384` 只监听 NAS 本机地址，远程访问须经网关反代；匿名卷保存设备 ID 与索引，迁移时漏掉会导致所有节点重新配对。

### 5.16 xream_sub-store（订阅转换）

- **部署**：`docker run`，`3002:3001`，挂 `docker/substore→/opt/app/data`。
- **环境**：`SUB_STORE_FRONTEND_BACKEND_PATH=<路径令牌>`（**安全前缀，真实值不入库**）。
- **要点**：该路径令牌即访问凭据，泄露等于把订阅接口交出去；升级前备份 `sub-store.json`（节点与订阅都在里面）。

---

## 6. 运维要点（踩过的坑）

1. **`data-root` 非默认**：任何"以为在 /var/lib/docker"的清理脚本都会打空；改路径等于迁移全部镜像与卷。
2. **Docker 服务 disabled**：`systemctl enable docker` 会与极空间的容器托管打架，重启后以 ZOS 面板状态为准。
3. **host 网络容器多**：`embyserver`、`moviepilot-v2`、`qbittorrent`、`chinesesubfinder`、`beszel-agent`、`homelab-gateway-nginx` 六个共享宿主网络栈，端口冲突排查用 `ss -ltnp` 而不是 `docker ps` 的端口列。
4. **特权容器三个**：Emby、MoviePilot、qBittorrent。特权 + host 网络意味着容器内进程等同宿主 root 部分能力，**不要在这些容器里跑来源不明的脚本**。
5. **日志只留 20MB**：`max-file=1`，长周期问题需靠 Uptime Kuma / Beszel 的历史曲线回溯。
6. **遗留网络可清**：`avtube_default`、`meta_default`、`meta-av_default`、`metatube-av_default`、`appstore_default` 已无容器，属历史项目残留。
7. **Compose 项目名与目录名不一致**：`hermesmemory` 目录 → 项目 `mem0`；用 `docker compose ls` 找项目，不要按目录名猜。
8. **重启策略两套**：媒体链（Emby/qB/MoviePilot/字幕/音乐）为 `always`，基础设施与监控为 `unless-stopped`。手动 stop 后，`always` 会被 dockerd 拉起（除非 stop 容器本身），排障时注意区分。

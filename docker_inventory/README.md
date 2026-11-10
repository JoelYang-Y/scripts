# 🐳 局域网 Docker 部署全量清单（Homelab Inventory）

> **采集基线**：2026-11-11，全部来自实机 `docker inspect` / `daemon.json` / compose 原文，**不含推测**。
> **覆盖**：2 台 Docker 主机 · **20 个容器** · **10 个 Compose 项目** · 2 份 `daemon.json` · 每份 compose 附中文注释。
> **凭证纪律**：所有口令、token、路径令牌一律占位符或省略；真实值只存在于主机上的 `.env` / 配置文件，**不入仓库、不进文档**。

---

## 1. 覆盖范围与边界

| 主机 | IP | 角色 | Docker | 容器数 | 结论 |
|---|---|---|---|---|---|
| 极空间 Z4Pro NAS | `10.0.0.3` | 存储/服务中枢 | 26.1.4 | **18** | 已全量采集 |
| PVE VM100 `AdGuardHome` | `10.0.0.6` | 全屋 DNS 入口 | 29.5.3 | **2** | 已全量采集 |
| PVE 宿主 `pve` | `10.0.0.4` | 虚拟化底座 | — | 0 | 未装 Docker（`pct list` 确认只有 LXC 101，`qm list` 只有 VM100） |
| LXC 101 `DeepSeek-Harness` | `10.0.0.5` | AI 运行时 | — | 0 | 无 docker 二进制、无 docker.sock |
| Mac mini | `10.0.0.2` | Hermes 宿主 | — | 0 | 未安装 Docker CLI/守护进程 |

**扫描方法**：`10.0.0.1–254` ICMP 扫描得 17 台存活主机 → 对非已知主机做端口探测（22 / 2375 / 2376 / 3000 / 8080 / 9443）→ 无任何主机暴露 Docker API（2375/2376 全关）。

**未覆盖（无法认证）**：`10.0.0.7`、`10.0.0.37`（22 开放但统一口令被拒）、`10.0.0.44`（仅 8080，Web 返回 403）。三者均**无 Docker API 端口暴露**，不能证明存在 Docker；如需纳入，需提供登录凭据。

---

## 2. 目录结构

```text
docker_inventory/
├── README.md                       # 本文件：总览、端口总表、运行时对比、纪律
├── COLLECTION.md                   # 采集方法与可复现脚本（只读，不落密码）
├── inventory.json                  # 机器可读清单（容器/端口/挂载/env 键名，已脱敏）
├── hosts/
│   ├── nas-10.0.0.3.md             # NAS 18 容器逐服务详解 + 运维坑
│   └── vm100-10.0.0.6.md           # DNS 双容器详解 + Alpine 特有注意事项
└── compose/
    ├── nas/                        # 16 份（12 个实机项目 + 8 个 docker run 的等效配置）
    │   ├── beszel.yml  homelable.yml  qdrant-mem0.yml  metatube.yml
    │   ├── openspeedtest.yml  paopaodns.yml  unified-gateway.yml  uptime-kuma.yml
    │   ├── embyserver.yml  moviepilot-v2.yml  qbittorrent.yml  chinesesubfinder.yml
    │   ├── navidrome.yml  music-tag-web.yml  syncthing.yml  sub-store.yml
    └── vm100/
        ├── adguardhome.yml
        └── paopaodns.yml
```

> 每份 compose 顶部都有「服务 / 主机 / 实际部署方式 / 项目路径 / 采集基线」注释头；正文对端口、挂载、特权、环境变量逐项注释。
> 仓库中另有 `nas_docker/`（历史目录，仅 NAS 14 个服务的 Compose+说明）。**本目录为全量现行口径**，两者冲突时以本目录为准；`nas_docker/` 待后续并入或归档。

---

## 3. 20 个容器一览

| # | 主机 | 容器 | 部署方式 | 镜像 | 对外端口 |
|---|---|---|---|---|---|
| 1 | NAS | `homelab-gateway-nginx` | Compose `unified-gateway` | `nginx:alpine` | 80/443（host） |
| 2 | NAS | `beszel-hub` | Compose `beszel` | `henrygd/beszel` | 8095 |
| 3 | NAS | `beszel-agent` | Compose `beszel` | `henrygd/beszel-agent` | 45876（host） |
| 4 | NAS | `uptime-kuma` | Compose `uptime-kuma` | `louislam/uptime-kuma` | 3005 |
| 5 | NAS | `paopaodns` | Compose `paopaodns` | `sliamb/paopaodns` | 5335 / 5304 / 7889 |
| 6 | NAS | `qdrant-mem0` | Compose `mem0` | `qdrant/qdrant` | 6333 / 6334 |
| 7 | NAS | `homelable-frontend` | Compose `homelable` | `pouzor/homelable-frontend` | 3003 |
| 8 | NAS | `homelable-backend` | Compose `homelable` | `pouzor/homelable-backend` | 内网 8000 |
| 9 | NAS | `openspeedtest` | Compose `openspeedtest` | `nginx:alpine` | 6680 / 3004 |
| 10 | NAS | `metatube` | Compose `metatube` | `metatube-community/metatube-server` | 8081 |
| 11 | NAS | `embyserver` | `docker run` | `amilys/embyserver` | 8096 / 8920 / 1900u / 7359u |
| 12 | NAS | `moviepilot-v2` | `docker run` | `jxxghp/moviepilot-v2` | 3000（host） |
| 13 | NAS | `qbittorrent` | `docker run` | `johngong/qbittorrent:4.6.7` | 8989 / 6881 |
| 14 | NAS | `chinesesubfinder` | `docker run` | `allanpk716/chinesesubfinder` | 19035（host） |
| 15 | NAS | `deluan_navidrome` | `docker run` | `deluan/navidrome` | 4533 |
| 16 | NAS | `xhongc_music_tag_web` | `docker run` | `xhongc/music_tag_web` | 8002 |
| 17 | NAS | `syncthing` | `docker run` | `syncthing/syncthing` | 8384（仅本机）/ 22002 / 21027u |
| 18 | NAS | `xream_sub-store` | `docker run` | `xream/sub-store` | 3002 |
| 19 | VM100 | `adguardhome` | Compose `adguardhome` | `adguard/adguardhome` | 53 / 80 / 443 / 3000 |
| 20 | VM100 | `paopaodns` | Compose `paopaodns` | `sliamb/paopaodns` | 5335 / 5304 / 7889 |

**部署方式分布**：Compose 管理 **12** 个（NAS 10 + VM100 2），`docker run` 创建 **8** 个（全部在 NAS，已按实机参数反推等效 compose）。

---

## 4. Docker 运行时对比

| 项 | NAS `10.0.0.3` | VM100 `10.0.0.6` |
|---|---|---|
| 版本 | 26.1.4 | 29.5.3 |
| 存储驱动 | `overlay2` | `overlayfs` |
| cgroup | `systemd` | `cgroupfs` |
| data-root | `/data_s002/data/udata/real/zdocker` | `/var/lib/docker`（默认） |
| 日志 | `json-file` 20MB × 1 | `json-file` 默认（无上限） |
| IPv6 | 开（`fd00:db7::/48`） | 关 |
| live-restore | false | false |
| 镜像加速 | dockerpull.org / docker.ketches.cn / registry.zenithspace.net / 官方 | oracle.jhsweetheart.com / docker.1ms.run |
| 额外加固 | 自定义 seccomp（阻断 copyfail 提权面） | 无 |
| 服务自启 | `disabled`，由 ZOS 容器面板托管 | 随 VM 启动 |

---

## 5. 跨主机端口总表

| 主机 | 端口 | 服务 |
|---|---|---|
| NAS | 80 / 443 | `homelab-gateway-nginx`（统一反代，host 网络） |
| NAS | 3000 | MoviePilot-v2 |
| NAS | 3002 | Sub-Store |
| NAS | 3003 | Homelable 前端 |
| NAS | 3004 / 6680 | OpenSpeedTest |
| NAS | 3005 | Uptime Kuma |
| NAS | 4533 | Navidrome |
| NAS | 5304 / 5335 / 7889 | PaoPaoDNS（管理 / DNS / Web） |
| NAS | 6333 / 6334 | Qdrant（REST / gRPC） |
| NAS | 6881 | qBittorrent BT |
| NAS | 8002 | Music-Tag-Web |
| NAS | 8081 | MetaTube |
| NAS | 8095 | Beszel Hub |
| NAS | 8096 / 8920 / 1900u / 7359u | Emby |
| NAS | 8384 | Syncthing（仅绑定 `10.0.0.3`） |
| NAS | 8989 | qBittorrent Web |
| NAS | 19035 | ChineseSubFinder（host） |
| NAS | 21027u / 22002 | Syncthing 发现 / 同步 |
| NAS | 45876 | Beszel Agent（host） |
| VM100 | 53/tcp+udp | AdGuard Home DNS |
| VM100 | 80 / 443 / 3000 | AdGuard 管理 / DoH / 安装向导 |
| VM100 | 5335 / 5304 / 7889 | PaoPaoDNS 上游 DNS / 管理 / Web |

---

## 6. 三条结构性结论

1. **host 网络容器集中**：NAS 上 6 个容器用 `host` 网络（网关、Emby、MoviePilot、qBittorrent、ChineseSubFinder、Beszel Agent），端口冲突要用 `ss -ltnp` 查，`docker ps` 的 PORTS 列对它们无效。
2. **特权容器只有 3 个**：Emby（核显直通 `/dev/dri/renderD128`）、MoviePilot（硬链接入库）、qBittorrent。这三个的安全面等同宿主部分 root 能力。
3. **DNS 是单点**：`10.0.0.6` 的 AdGuard + PaoPaoDNS 两容器是全屋解析唯一入口；`10.0.0.3` 的 PaoPaoDNS 是并行实例，不对外提供 53。

---

## 7. 维护纪律

- 新增/变更服务后，同步更新：本 README 的容器表 + 对应 `hosts/*.md` 小节 + `compose/` 文件 + `inventory.json`。
- `inventory.json` 由实机采集生成，只含**键名**与端口，不含任何环境变量值。
- 任何 compose / 文档**禁止写入真实口令、token、路径令牌、chat id**；必须用 `<PLACEHOLDER>`。历史事故：技能库镜像曾因明文口令进公开仓库被迫重建。
- 本次采集为**只读**：未启动、未停止、未修改任何容器与配置。

---

*采集与复现方法见 [`COLLECTION.md`](./COLLECTION.md)。*

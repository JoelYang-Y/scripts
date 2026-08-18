# Joel's Life Hub (https://jhsweetheart.com)

个人专属 Apple 拟态毛玻璃 (Glassmorphism 2.0) 浏览器起始页、聚合控制大屏与全量 Docker 配置代码库。

---

## 核心设计与系统特性

1. **一级域名直达与 Cloudflare DNS 联动**
   - 生产域名：`https://jhsweetheart.com` (一级主域名)
   - 宿主机：甲骨文云 VPS (`129.146.122.202`)
   - DNS 体系：Cloudflare DNS 原生 A 记录直连，已清理废弃二级域名并严格隔离搬瓦工与 AT&T 服务器。

2. **内置 Docker 配置代码库知识库 (Docker Hub & Repo)**
   - 包含 NAS (`10.0.0.3`) 与云端全量 10+ 核心生产服务容器配置；
   - 支持多服务分类快速切换、环境变量参数映射说明与一键复制 `docker-compose.yml`；
   - 深度联动 GitHub 私有仓库 (`JoelYang-Y/scripts`) 保持双向同步。

3. **顶级 Apple 拟态毛玻璃美学 (Glassmorphism 2.0)**
   - **深空流光星云 (Cosmic Nebula)**：4 组动态流体光斑配合 110px 超广角高斯弥散，呼吸律动；
   - **四套视觉主题自由切换**：🌌 深空星云 / 🏔️ 暗夜雪峰 / 🪐 科技微网格 / 🌑 OLED 纯黑（LocalStorage 持久记忆）。

4. **双时区秒级拟态时钟 + 智能高精定位天气**
   - **双时区**：🇨🇳 北京时间 (UTC+8) 与 🇺🇸 洛杉矶时间 (America/Los_Angeles) 同步秒级渲染；
   - **天气系统**：IP 地理位置初定位 + GPS 探测，调用免 Key 的 Open-Meteo API 实时获取气温与气象并本地缓存。

5. **全自托管图标体系与 0ms 秒开**
   - 38 个精选服务图标 100% 本地自托管在 `/icons/` 目录下（SVG 矢量与 Retina PNG 结合）；
   - 杜绝第三方 CDN 依赖、外链防盗链及网络阻断。

---

## 7 大精准业务分类与 38 个服务卡片

| 核心分类 | 包含服务卡片（共 38 个） | 说明 |
| :--- | :--- | :--- |
| **`AI 智汇` (ai)** | **ChatGPT** / **Google Gemini** / **Claude** / **Grok** / **DeepSeek Harness** | 5 大全球顶尖大模型与本地 AI 编程智能体 |
| **`内网中枢` (homelab)** | **ASUS 路由器** / **Surge Web** / **PVE 物理宿主机** / **AdGuard Home** / **Homelable 拓扑** / **Syncthing 同步** / **Vaultwarden 密码库** | 家庭网络、虚拟化底座与本地基础设施 |
| **`核心云端` (cloud)** | **Google Cloud (GCP)** / **Oracle Cloud (OCI)** / **搬瓦工后台** / **VirCS 控制台（纯正美国家宽）** / **甲骨文 s-ui** / **搬瓦工 s-ui** / **搬瓦工 1Panel** / **IPRoyal 住宅代理** | 云厂商控制台、VPS 资产与核心节点管理 |
| **`通信邮箱` (mail)** | **Gmail** / **Outlook** / **QQ 邮箱** / **Tello Mobile** / **T-Mobile** / **Anytime Mailbox 私人信箱** | 个人与企业核心邮箱、美国手机卡与真实地址管理 |
| **`影音 PT` (media)** | **MoviePilot 影音整理** / **Emby 媒体库** / **qBittorrent 下载** / **M-Team 馒头 (PT站点)** / **xHamster** | 家庭影院、PT 资源与流媒体影视娱乐 |
| **`监控探针` (monitor)** | **Uptime Kuma 可用性监控** / **Beszel Hub 全主机探针大屏** | 全局网络链路与服务器状态实时监控 |
| **`实用工具` (tools)** | **GitHub 脚本库** / **Sub-Store 订阅转换** / **ping0.cc 风险检测** / **ip.net.coffee 纯净度检测** / **WLOC 无线定位** / **奶昔 Nexitally（顶级旗舰机场）** | 运维脚本仓库、订阅转换、多源 IP 画像、定位与网络检测工具 |

---

## 项目工程结构

```text
scripts/
├── startpage-v2/              # 导航大屏 Vite + Tailwind 前端工程
│   ├── index.html             # 单页面 HTML 入口
│   ├── vite.config.ts         # Vite 构建配置
│   ├── deploy.sh              # 一键编译并部署到甲骨文 VPS 脚本
│   ├── nginx-jhsweetheart.conf # 甲骨文 VPS Nginx 生产反代配置
│   ├── src/
│   │   ├── main.ts            # 前端业务逻辑与交互驱动
│   │   ├── config/
│   │   │   ├── site.config.ts # 38 个服务卡片与全站配置
│   │   │   └── docker-configs.ts # 全量 Docker 服务 Compose 数据集
│   │   └── styles/
│   │       └── app.css        # Tailwind v4 与毛玻璃 2.0 样式
│   └── public/                # 自托管图标与高清壁纸资源
└── docker/                    # 10+ 独立服务 docker-compose.yml 文件库
    ├── sub-store/
    ├── homelable/
    ├── beszel-hub/
    ├── uptime-kuma/
    ├── emby/
    ├── moviepilot/
    ├── qbittorrent/
    ├── syncthing/
    ├── adguardhome/
    └── vaultwarden/
```

---

## 一键同步与部署指南

### 本地编译并同步至甲骨文 VPS
```bash
cd /Users/macmini/scripts/startpage-v2
./deploy.sh
```

### 甲骨文 VPS Nginx 挂载配置
将 `nginx-jhsweetheart.conf` 复制到甲骨文 VPS `/etc/nginx/conf.d/jhsweetheart.conf` 并执行：
```bash
nginx -t && systemctl reload nginx
```

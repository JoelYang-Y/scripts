# Joel's Life Hub (start.jhsweetheart.com)

个人专属 Apple 拟态毛玻璃 (Glassmorphism 2.0) 浏览器起始页与聚合控制大屏。

---

## 核心设计与特性

1. **顶级 Apple 暗黑拟态美学 (Glassmorphism 2.0)**
   - **深空流光星云 (Cosmic Nebula)**：4 组动态流体光斑配合 110px 超广角高斯弥散，呼吸律动。
   - **毛玻璃光影**：多层 `backdrop-filter: blur(24px) saturate(160%)`，拟态边框与内嵌微光。
   - **四套视觉主题自由切换**：🌌 深空星云 / 🏔️ 暗夜雪峰 / 🪐 科技微网格 / 🌑 OLED 纯黑（支持 LocalStorage 记忆）。

2. **双时区秒级拟态时钟 + 智能高精定位天气**
   - **双时区**：🇨🇳 北京时间 (UTC+8) 与 🇺🇸 洛杉矶时间 (America/Los_Angeles) 同步显示。
   - **天气系统**：IP 地理位置初定位 + 浏览器 GPS 探测，调用 Open-Meteo API 实时渲染温度与气象。

3. **全生态跨端与 PWA 独立 App 支持**
   - 注入 `apple-mobile-web-app-capable` 与 `black-translucent` 沉浸式暗黑状态栏。
   - iPad / iPhone 在 Safari 中点击「添加到主屏幕」即可生成名为 **"Joel's Life"** 的无边框独立全屏桌面应用。

4. **全自托管图标与 0ms 秒开**
   - 37 个服务图标 100% 本地自托管在 `/icons/` 目录下（SVG 矢量与 Retina PNG 结合）。
   - 杜绝第三方 CDN 依赖、外链防盗链及网络阻断。

5. **全平台浏览器安全隔离**
   - 所有外链卡片严格标注 `target="_blank" rel="noopener noreferrer"`，全面解决 Safari / WebKit 跨上下文拦截与 Mixed Context 导航异常。

---

## 7 大精准业务分类与 37 个服务卡片

| 核心分类 | 包含服务卡片（共 37 个） | 说明 |
| :--- | :--- | :--- |
| **`AI 智汇` (ai)** | **ChatGPT** / **Google Gemini** / **Claude** / **Grok** / **DeepSeek Harness** | 5 大全球顶尖大模型与本地 AI 编程智能体 |
| **`内网中枢` (homelab)** | **ASUS 路由器** / **Surge Web** / **PVE 物理宿主机** / **AdGuard Home** / **Homelable 拓扑** / **Syncthing 同步** / **Vaultwarden 密码库** | 家庭网络、虚拟化底座与本地基础设施 |
| **`核心云端` (cloud)** | **Google Cloud (GCP)** / **Oracle Cloud (OCI)** / **搬瓦工后台** / **VirCS 控制台（纯正美国家宽）** / **甲骨文 s-ui** / **搬瓦工 s-ui** / **IPRoyal 住宅代理** | 云厂商控制台、VPS 资产与核心节点管理 |
| **`通信邮箱` (mail)** | **Gmail** / **Outlook** / **QQ 邮箱** / **Tello Mobile** / **T-Mobile** / **Anytime Mailbox 私人信箱** | 个人与企业核心邮箱、美国手机卡与真实地址管理 |
| **`影音 PT` (media)** | **MoviePilot 影音整理** / **Emby 媒体库** / **qBittorrent 下载** / **M-Team 馒头 (PT站点)** / **xHamster** | 家庭影院、PT 资源与流媒体影视娱乐 |
| **`监控探针` (monitor)** | **Uptime Kuma 可用性监控** / **Beszel Hub 全主机探针大屏** | 全局网络链路与服务器状态实时监控 |
| **`实用工具` (tools)** | **Sub-Store 订阅转换** / **ping0.cc 风险检测** / **ip.net.coffee 纯净度检测** / **WLOC 无线定位** / **奶昔 Nexitally（顶级旗舰机场）** | 订阅转换、多源 IP 画像、定位与网络检测工具 |

---

## 目录结构

```text
startpage/
├── index.html              # 聚合大屏单页面源码
├── avatar.png              # 个人头像与 Favicon 资源
├── scenic_dark.webp        # 苹果暗夜雪峰主题高清壁纸
├── wallpaper.webp          # 预备壁纸
├── nginx-startpage.conf    # Nginx 统一网关反代与 SSL 证书配置
├── icons/                  # 37+ 官方自托管超清矢量与 PNG 图标库
│   ├── chatgpt.svg
│   ├── gemini.svg
│   ├── claude.svg
│   ├── grok.svg
│   ├── gmail.svg
│   ├── outlook.svg
│   ├── qqmail.svg
│   ├── google-cloud.svg
│   ├── tello.svg
│   ├── ...
└── README.md               # 项目全量说明文档
```

---

## 部署与运维

### Nginx 挂载配置示例

```nginx
server {
    listen 443 ssl http2;
    server_name start.jhsweetheart.com;

    ssl_certificate /etc/letsencrypt/live/start.jhsweetheart.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/start.jhsweetheart.com/privkey.pem;

    root /usr/share/nginx/html/startpage;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /icons/ {
        alias /usr/share/nginx/html/startpage/icons/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

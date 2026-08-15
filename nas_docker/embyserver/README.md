# Emby Server - 家庭影视媒体中心

Emby Server 是一款强大的个人流媒体服务器，能够将个人影视、音乐收藏统一编目，并自动刮削封面、演职员表、评分等元数据，支持多端（Apple TV, iOS, Android, Web, Infuse）无缝播放。

## 端口与访问 (Host 模式)

- **HTTP Web 界面**: `http://<NAS_IP>:8096`
- **HTTPS Web 界面**: `https://<NAS_IP>:8920`
- **DLNA / UPnP 发现端口**: `1900/udp`, `7359/udp`

## 目录结构

```text
embyserver/
├── docker-compose.yml
├── config/                # 配置文件、SQLite 数据库及插件
└── /media                 # 媒体库根目录挂载 (挂载宿主 /data/media)
    ├── movies/
    ├── tv/
    ├── anime/
    └── music/
```

## 硬件转码 (Intel QSV / VAAPI)

- 配置中通过 `devices: - /dev/dri/renderD128:/dev/dri/renderD128` 直通了核显节点。
- 在 Emby 管理后台 -> **转码 (Transcoding)** 中：
  - 硬件加速选择 **Advanced** 或 **VAAPI / QuickSync**。
  - 勾选 H.264, HEVC (H.265), VP9 等解码器与编码器。

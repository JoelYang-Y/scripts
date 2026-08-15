# qBittorrent - 高性能 PT/BT 下载客户端

基于 `johngong/qbittorrent` 镜像构建，内置自动 Tracker 列表更新、吸血保护及友好的 Web 控制台。

## 端口与访问 (Host 模式)

- **WebUI 控制台**: `http://<NAS_IP>:8989`
- **默认账号/密码**: `admin` / `adminadmin` (首次登录请及时修改)
- **BT 传输监听端口**: `6881` (TCP/UDP)

## 目录结构

```text
qbittorrent/
├── docker-compose.yml
├── config/                # qBittorrent 配置文件 (qBittorrent.conf) 及种子断点数据
├── /media/download        # 默认下载目录
└── /media                 # 媒体存储卷 (用于做种与硬链接管理)
```

## 关键特性

1. **Host 模式与端口映射**: 采用 Host 模式能够最大化 PT 做种与 BT 下载的连接数，同时避免了 Docker NAT 对高并发连接的性能损耗。
2. **自动 Tracker 更新**: 环境变量 `QB_TRACKERS_UPDATE_AUTO=true` 会定期抓取公共 Tracker，极大提升非 PT 种子的下载速度。

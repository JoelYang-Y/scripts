# Homelable - 家庭网络拓扑可视化看板

Homelable 是一款美观现代的家庭网络拓扑可视化与设备状态监控看板。通过对局域网进行 ARP/ICMP 探测，实时展现设备在线状态、IP 分配与网络拓扑。

## 架构

采用前后端分离架构：
- **Frontend**: Nginx 托管的 React/Vue 静态前端，监听 `3003` 端口。
- **Backend**: Python FastAPI 后端，处理网络扫描、SQLite 存储及身份认证。

## 端口与访问

- **Web 访问地址**: `http://<NAS_IP>:3003`
- **默认用户**: `JHSweetheart` (密码见环境变量或自行通过 bcrypt 生成)

## 目录结构

```text
homelable/
├── docker-compose.yml
├── data/                  # 后端 SQLite 数据库 homelable.db
└── html/                  # 前端静态资源
```

## 关键配置说明

1. **`cap_add: [NET_ADMIN, NET_RAW]`**: 后端必须具备此权限才能发送 ARP 和原始 Ping 包进行局域网设备扫描。
2. **`SCANNER_RANGES`**: 设置内网扫描网段，如 `["10.0.0.0/24"]`。
3. **`BACKEND_URL`**: 前端反代指向 `http://backend:8000`。

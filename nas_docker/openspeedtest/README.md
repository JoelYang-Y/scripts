# OpenSpeedTest - 内网测速服务器

基于 HTML5 的免客户端高性能网络测速服务器，部署在 NAS 上可用于测试局域网 Wi-Fi 覆盖、有线内网吞吐以及外网打洞访问速度。

## 端口与访问

- **Web 访问地址**: `http://<NAS_IP>:6680` 或 `http://<NAS_IP>:3004`
- **协议**: HTTP

## 目录结构

```text
openspeedtest/
├── docker-compose.yml
├── conf/
│   └── default.conf       # Nginx 配置文件
└── www/                   # 测速静态网页文件及测速 payload
```

## 部署与管理

```bash
# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f

# 停止服务
docker compose down
```

## 配置说明

- **端口 6680 / 3004**: 两个端口均映射至内部 3000 端口，可按需挑选无冲突端口访问。
- **文件只读挂载 (`:ro`)**: 测速前端文件及 Nginx 配置文件无需写入权限，保障容器安全性。

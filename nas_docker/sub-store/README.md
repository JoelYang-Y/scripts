# Sub-Store - 高级订阅管理与转换中心

Sub-Store 是专为各类代理工具（Surge, Clash, Shadowrocket, Loon, Quantumult X 等）设计的强大订阅管理工具，支持节点拉取、智能筛选、排序、重命名、UDP/TLS 参数重写与订阅托管。

## 端口与访问

- **Web 管理界面**: `http://<NAS_IP>:3002?api=http://<NAS_IP>:3002/T3B9dgzBzdRbBF8Aqx7P`
- **API 路径密钥**: `/T3B9dgzBzdRbBF8Aqx7P`（由 `SUB_STORE_FRONTEND_BACKEND_PATH` 定义）

## 目录结构

```text
sub-store/
├── docker-compose.yml
└── data/                  # 数据库与订阅缓存目录
```

## 部署与管理

```bash
# 启动
docker compose up -d

# 查看日志
docker compose logs -f

# 更新镜像
docker compose pull && docker compose up -d
```

## 安全与注意事项

1. **API Token 路径**: 环境变量 `SUB_STORE_FRONTEND_BACKEND_PATH` 定义了访问后端的安全路由，若暴露在公网请设置强随机字符串。
2. **数据备份**: 定期备份 `data/` 目录中的 `sub-store.db`，防止订阅配置丢失。

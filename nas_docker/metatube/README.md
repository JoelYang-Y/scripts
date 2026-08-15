# MetaTube Server - 多媒体元数据刮削后端

MetaTube Server 是专为 Emby / Jellyfin 打造的元数据抓取服务器，能够自动解析番号、演员信息、封面大图及剧照。

## 端口与访问

- **API 服务地址**: `http://<NAS_IP>:8081`
- **健康检查**: `http://<NAS_IP>:8081/system/status`

## 目录结构

```text
metatube/
├── docker-compose.yml
└── data/                  # SQLite 数据库 metatube.db 与缓存文件
```

## 代理设置说明

由于元数据源通常位于境外，必须配置 `HTTP_PROXY` 与 `HTTPS_PROXY`（默认指向 `http://10.0.0.2:6152`），以保证正常从 DMM / FANZA / JavDB 等数据源抓取。

# Lucky - 网络工具箱与反向代理网关

Lucky 是一款功能极为强大的网络综合管理工具，支持动态域名解析（DDNS）、反向代理（支持 HTTP/HTTPS/Socks5/WebDAV/ gRPC）、端口转发、IPv6 自动打洞以及 ACME Let's Encrypt 证书自动续期。

## 端口与访问 (Host 模式)

- **Web 管理界面**: `http://<NAS_IP>:16601` (默认后台管理端口)
- **默认初始账号/密码**: `666` / `666` (初次登录强制修改)

## 目录结构

```text
lucky/
├── docker-compose.yml
└── goodluck/              # 配置文件 lucky.conf、规则与 SSL 证书存储目录
```

## 核心功能

1. **DDNS 动态域名**: 支持阿里云、腾讯云 DNSPod、Cloudflare、华为云等主流 DNS 服务商的 IPv4 / IPv6 自动解析。
2. **反向代理**: 可替代 Nginx 进行内网各 Docker 服务的反代，并一键配置 Let's Encrypt 证书。
3. **STUN 内网穿透**: 配合无公网 IP 场景进行 UDP/TCP 打洞穿透。

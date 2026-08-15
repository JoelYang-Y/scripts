# 家庭内网 DNS 方案：AdGuardHome + PaoPaoDNS

这是一个基于 Docker Compose 部署的家庭内网 DNS 优化方案。通过 AdGuardHome 作为前置拦截器进行去广告和内网域名解析，并使用 PaoPaoDNS 作为后端上游，利用其分流和 CDN 优化能力。

## 目录结构

```text
dns_stack/
├── adguardhome/
│   └── docker-compose.yml
└── paopaodns/
    └── docker-compose.yml
```

## 部署步骤

### 1. 部署 PaoPaoDNS

PaoPaoDNS 作为上游递归解析器，提供极速的 DNS 解析和智能分流。

```bash
cd paopaodns
docker compose up -d
```

*   **监听端口**: `5335` (TCP/UDP)
*   **特性**: 开启了 `CNAUTO` (自动分流), `IPV6` 支持, `CNFALL` (国内优先), `EXPIRED_FLUSH` (过期刷新) 等功能。

### 2. 部署 AdGuardHome

AdGuardHome 作为主 DNS 监听 53 端口，负责拦截广告和管理内网设备。

```bash
cd adguardhome
mkdir -p work conf
docker compose up -d
```

*   **管理界面**: `http://<服务器IP>:3000`
*   **DNS 监听**: `53` 端口

### 3. 配置 DNS 链

在 AdGuardHome 的管理界面（设置 -> DNS 设置）中，将上游 DNS 服务器配置为 PaoPaoDNS：

```text
127.0.0.1:5335
```

如果是不同宿主机部署，请将 `127.0.0.1` 替换为运行 PaoPaoDNS 的服务器 IP。

## 注意事项

1.  **国内镜像源**: 如果拉取镜像缓慢，建议使用代理或国内加速源（如 `docker.1ms.run`）。
2.  **端口冲突**: 确保宿主机的 53 端口未被其他服务（如 `systemd-resolved`）占用。
3.  **持久化**: 配置文件和数据分别挂载在各自目录下的 `work`/`conf` 和 `data` 目录中。

## 架构参考

`Surge (DoH) -> AdGuardHome (10.0.0.6:53) -> PaoPaoDNS (10.0.0.6:5335) -> 上游 DNS (如 223.5.5.5)`

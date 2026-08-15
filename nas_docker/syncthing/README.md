# Syncthing - 多端文件连续同步服务

Syncthing 是一款开源、安全、去中心化的连续文件同步工具，用于在 Macmini、iPhone/Android 与 NAS 之间实时双向同步 Obsidian 笔记库及其他重要文档。

## 端口与访问

- **Web GUI 管理界面**: `http://<NAS_IP>:8384`
- **同步传输端口**: `22002` (TCP/UDP)
- **局域网广播端口**: `21027` (UDP)

## 目录结构

```text
syncthing/
├── docker-compose.yml
├── config/                # Syncthing 配置文件 (config.xml, cert.pem, key.pem, index-v0.14.0.db)
├── sync/                  # 主要同步文件夹 (如 Obsidian Vault)
└── data/                  # 数据文件目录
```

## 极空间 Z4Pro 核心避坑指南 (重要)

1. **宿主 Syncthing 端口冲突**:
   - 极空间系统内置的 `autoBackup` 守护进程硬编码监听了宿主机的 `22000` 端口。
   - 如果 Docker 容器直接映射 `22000:22000`，会导致系统守护脚本每 27 秒误杀 Docker 容器进程。
   - **解决方案**: Docker 容器必须使用 `22002:22000` 映射，客户端（如 Mac 上的 Syncthing）在添加 NAS 设备时，地址必须显式指定为 `tcp://10.0.0.3:22002`。

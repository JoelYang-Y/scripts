# Beszel 监控服务

## 1. 服务介绍
Beszel 是一款极简且极其轻量级的系统和 Docker 容器性能监控平台，分为中心服务端 (Hub) 与各节点探针端 (Agent)。它可以直观地监控多台服务器的 CPU、内存、网络、磁盘与各个 Docker 容器的运行状况，资源占用极低（Hub 内存 < 20MB）。

## 2. 访问地址
- 仪表盘 Web 页面：[http://10.0.0.3:8095](http://10.0.0.3:8095)

## 3. Hub 初次配置流程
1. 访问 Hub 网页 `http://10.0.0.3:8095`。
2. 首次打开会提示创建超级管理员账号与密码，创建后登录。
3. 点击「Add System」添加需要监控的系统名（例如 `NAS-Z4Pro`）。
4. 界面会生成对应主机的公钥（`KEY`），复制该公钥备用。

## 4. 各端 Agent 探针接入方法

### 1) NAS 本地自身监控
在极空间 NAS (10.0.0.3) 本地监控主机自身：
- 编辑 `beszel/docker-compose.yml` 文件。
- 取消 `beszel-agent` 相关的注释段。
- 将获取的公钥填入 `KEY` 环境变量处。
- 重新执行 `docker compose up -d` 即可。

### 2) Mac mini 监控
在 Mac mini 终端运行：
```bash
docker run -d \
  --name beszel-agent \
  --restart unless-stopped \
  -p 45876:45876 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -e PORT=45876 \
  -e KEY="填入HUB生成的KEY" \
  docker.1ms.run/henrygd/beszel-agent:latest
```

### 3) PVE / Debian 容器 (10.0.0.5 DeepSeek Harness)
在 10.0.0.5 终端运行官方一键安装脚本作为 Systemd 服务：
```bash
curl -sL https://raw.githubusercontent.com/henrygd/beszel/main/supplementary/install-agent.sh -o install-agent.sh
chmod +x install-agent.sh
./install-agent.sh -p 45876 -k "填入HUB生成的KEY"
```

### 4) 搬瓦工 VPS 监控
在云端 VPS 上运行 Docker 容器探针：
```bash
docker run -d \
  --name beszel-agent \
  --restart unless-stopped \
  -p 45876:45876 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -e PORT=45876 \
  -e KEY="填入HUB生成的KEY" \
  henrygd/beszel-agent:latest
```
*(注意：公网 VPS 需在防火墙/安全组放行 45876 端口)*

## 5. Telegram 告警配置指南
1. 在 Hub 网页端点击右上角设置 -> 「通知 (Notifications)」。
2. 添加 Telegram 配置，输入 Bot Token 与 Chat ID。
3. 可针对各节点设置离线报警或资源超限阈值（如 CPU > 90%）。

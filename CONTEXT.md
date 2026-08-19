# JoelYang-Y / scripts 领域上下文与架构契约 (CONTEXT.md)

本文档遵循 **Pocock 领域建模 (Domain Modeling) 与统一语言规范**，为本仓库所有运维脚本、导航大屏工程及 AI Agent 提供单一高密度知识基准，消灭术语歧义与废话。

---

## 1. 统一领域术语字典 (Ubiquitous Language)

| 领域专有名词 | 唯一标准定义与物理映射 | 严禁使用的模糊词汇 |
| :--- | :--- | :--- |
| **`Oracle VPS 1`** | 甲骨文 1 号美西凤凰城 VPS (`129.146.122.202`)，承载导航主站与 Vaultwarden 生产环境 | “甲骨文服务器”、“那台云主机” |
| **`Oracle VPS 2`** | 甲骨文 2 号美西凤凰城 VPS (`129.153.89.114`)，公网域名 `oracle2.jhsweetheart.com`，备用/扩展节点 (ARM 2C/12G) | “甲骨文2号”、“二号机” |
| **`BWG VPS`** | 搬瓦工主力 VPS (`64.64.237.34`)，承载 AnyTLS 主力节点与 1Panel 面板 (`/Joel`) | “搬瓦工”、“节点服务器” |
| **`ATT 家宽`** | 纯正美国家宽服务器 (`107.141.151.219`)，承载 ss-rust 高可信出口节点 | “ATT机器”、“家宽节点” |
| **`NAS 中枢`** | 极空间 Z4Pro 物理机 (`10.0.0.3`)，承载 14 个核心 Docker 容器与媒体存储 | “局域网 NAS”、“私有云” |
| **`PVE 底座`** | Proxmox VE 9.2.2 物理虚拟化宿主机 (`10.0.0.4`, Debian 13) | “PVE宿主机”、“物理机” |
| **`Harness 节点`** | DeepSeek Harness AI 智能体容器 (`10.0.0.5`, PVE CT 101)，主模型 Gemini 3.7 Flash | “dsh”、“本地大模型” |
| **`DNS 枢纽`** | AdGuard Home + PaoPaoDNS 递归防污染虚拟机 (`10.0.0.6`, PVE VM 100) | “内网 DNS”、“广告拦截机” |
| **`StartPage Hub`** | 部署于 `jhsweetheart.com` 的个人导航大屏与 17 个生产 Docker 配置代码库 | “起始页”、“导航站”、“主页” |

---

## 2. 核心架构不变性 (Architecture Invariants)

1. **绝对物理隔离原则**：
   - 搬瓦工 VPS (`64.64.237.34`) 与 ATT 家宽 (`107.141.151.219`) 为核心网络基础设施，任何操作**严禁修改、重载或破坏其配置与运行状态**。
2. **白名单域名与阻断策略**：
   - 导航主站仅允许通过 **`https://jhsweetheart.com`** 与 **`https://www.jhsweetheart.com`** 访问；
   - 废弃的 `start.jhsweetheart.com` 及任何未授权 Host 在 Nginx 层由 `default_server` 触发 `444` 直接丢弃 TCP 连接。
3. **内网服务访问契约**：
   - 局域网服务卡片链接统一采用 **HTTPS 二级域名**（如 `https://dsh.jhsweetheart.com`），由 Surge [Host] 拦截直连至对应的内网 IP:端口，零公网 DNS 绕行。
4. **图标 100% 本地自托管**：
   - 所有服务卡片图标必须存放在本地 `/icons/` 目录下，禁止直接引用不可靠的公网 CDN，由 Nginx 配置 30 天强缓存。

---

## 3. 架构决策记录 (Architectural Decision Records)

### ADR-0001: 导航站从 start 二级域名全面升级为一级根域名
- **背景**：原有 `start.jhsweetheart.com` 冗长且不便记忆。
- **决策**：通过 Cloudflare API 删除 `start` 记录，将根域名 `jhsweetheart.com` 及 `www` 的 A 记录指向甲骨文 VPS，并在 Nginx 部署 Let's Encrypt 泛域名 ECC 证书。
- **状态**：已在生产环境生效 (2026-08-18)。

### ADR-0002: 内网服务由 Surge Host 接管，废弃统一反代容器
- **背景**：曾尝试在 NAS 10.0.0.3 部署 Nginx 网关集中反代，但增加了 DNS 复杂性与中间单点故障。
- **决策**：彻底回滚并废弃 NAS 网关，由客户端 Surge [Host] 原生拦截二级域名并映射到局域网 IP:端口。
- **状态**：已确立并固化 (2026-08-17)。

### ADR-0003: 导航大屏内置全内网 17 个 Docker 生产配置代码库
- **背景**：需要随时多端查看并一键复制 NAS 与各宿主机的真实 Docker Compose 参数。
- **决策**：在导航站前端集成全屏拟态 Docker 配置抽屉，支持按宿主机（10.0.0.3/4/5/6/Cloud）精准过滤与一键复制代码。
- **状态**：已上线并与 GitHub 双向同步 (2026-08-18)。

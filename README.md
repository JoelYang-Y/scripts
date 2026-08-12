# scripts

个人常用网络工具脚本集合。在任何电脑上 `git clone` 即可使用（仅依赖 bash/curl/python3）。

## 脚本列表

| 脚本 | 用途 | 用法 |
|------|------|------|
| `check-egress.sh` | **IP 完整体检**（xykt/IPQuality v2026-08-09，即 https://IP.Check.Place）：IP 类型/纯净度/Scamalytics 评分/代理检测/流媒体解锁/邮局连通性 | 见下方 |
| `check-site-egress.sh` | 检测指定网站在本地网络(Surge)中的实际出口 IP | `./check-site-egress.sh paypal.com` / `-j` |

## check-egress.sh 用法（IPQuality）

```bash
# 完整检测（终端报告）
bash <(curl -Ls https://Check.Place) -I          # 等价: bash check-egress.sh -4 -n

# 本地直接跑（macOS 需 bash 4+，建议 /opt/homebrew/bin/bash）
PATH=/opt/homebrew/bin:$PATH bash check-egress.sh -4 -n -p        # IPv4 + 终端报告
PATH=/opt/homebrew/bin:$PATH bash check-egress.sh -4 -n -j -o /tmp/ipq.json  # JSON 报告
```

常用参数：

| 参数 | 含义 |
|------|------|
| `-4` / `-6` | 只检测 IPv4 / IPv6 |
| `-j` + `-o 文件` | JSON 报告输出到文件 |
| `-x 代理地址` | 走指定代理检测（如 `-x socks5://127.0.0.1:6153`） |
| `-f` | 报告展示完整 IP（默认掩码中间段） |
| `-n` | 跳过系统/依赖检查（macOS 推荐） |
| `-p` | 隐私模式，不生成在线报告链接 |
| `-E` / `-l en` | 英文输出 |

> macOS 注意：系统自带 bash 3.2 太旧，需用 Homebrew bash（`brew install bash`）。
> Linux 直接 `./check-egress.sh -4` 即可。

## 快速开始

```bash
git clone https://github.com/JoelYang-Y/scripts.git
cd scripts
bash check-egress.sh -4 -n -p         # IP 完整体检
./check-site-egress.sh paypal.com     # 查指定网站出口
```

# scripts

个人常用网络工具脚本集合。在任何电脑上 `git clone` 即可使用（仅依赖 bash/curl/python3）。

## 脚本列表

| 脚本 | 用途 | 用法 |
|------|------|------|
| `check-egress.sh` | **IP 完整体检**（xykt/IPQuality v2026-08-09，自托管）：IP 类型/纯净度/Scamalytics 评分/代理检测/流媒体解锁/邮局连通性 | 见下方 |
| `check_domain.py` | 检测指定网站在本地网络(Surge)中走哪个节点、真实出口 IP（交互式） | `python3 check_domain.py` 或 `echo paypal.com \| python3 check_domain.py` |

## check-egress.sh 用法（IPQuality 完整检测）

```bash
# 用你自己的域名（check-egress.sh 就是完整 IP 检测脚本，无广告、无第三方链接）
bash <(curl -Ls https://joel.jhsweetheart.com/check-egress.sh) -4 -n -p

# 本地直接跑（macOS 需 bash 4+，建议 /opt/homebrew/bin/bash）
PATH=/opt/homebrew/bin:$PATH bash check-egress.sh -4 -n -p        # IPv4 + 终端报告
PATH=/opt/homebrew/bin:$PATH bash check-egress.sh -4 -n -j -o /tmp/ipq.json  # JSON 报告
```

> 脚本资源文件（iso3166.json / dnsbl.list / cookies.txt / iata-icao.csv）已本地化到 `ref/`，
> 并部署在 VPS `https://joel.jhsweetheart.com/ref/`，运行时从自己域名拉取，不依赖上游 GitHub。
> 报告头、帮助文本、升级提示中的链接已全部替换为 `https://joel.jhsweetheart.com/check-egress.sh`。

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

## check_domain.py 用法（Surge 域名出口检测）

```bash
# 交互式：逐个输入域名检测（q 退出）
python3 check_domain.py

# 单次查询
echo "paypal.com" | python3 check_domain.py
```

原理：通过 Surge 代理发起真实请求 → 查 `/v1/requests/recent` 命中策略 →
用 `X-Surge-Policy` 头强制走该策略探测真实出口 IP。
**需要本机运行 Surge**（代理 127.0.0.1:6152 + API 127.0.0.1:6171）。

## 快速开始

```bash
git clone https://github.com/JoelYang-Y/scripts.git
cd scripts
bash check-egress.sh -4 -n -p         # IP 完整体检
echo "paypal.com" | python3 check_domain.py   # 查指定网站出口
```

# scripts

个人常用网络工具脚本集合。在任何电脑上 `git clone` 即可使用（仅依赖 bash/curl/python3）。

## 脚本列表

| 脚本 | 用途 | 用法 |
|------|------|------|
| `check-egress.sh` | 检测本地网络环境的实际出口 IP + 国家/运营商/ASN | `./check-egress.sh` / `-x socks5://127.0.0.1:6153` / `-d` / `-j` |
| `check-site-egress.sh` | 检测指定网站在本地网络(Surge)中的实际出口 IP | `./check-site-egress.sh paypal.com` / `-j` |

## 快速开始

```bash
git clone https://github.com/JoelYang-Y/scripts.git
cd scripts
./check-egress.sh          # 查当前出口
./check-site-egress.sh paypal.com   # 查指定网站出口
```

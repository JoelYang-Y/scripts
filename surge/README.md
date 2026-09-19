# Surge 美国通信与金融规则集

本目录提供面向 Surge 的通信、银行、信用卡、券商、支付和电子钱包规则集。

## 订阅文件

- `tmobile-tello.list`：T-Mobile、Tello 及常见美国移动运营商
- `us-banks-checking.list`：银行与支票账户
- `us-credit-cards.list`：信用卡发行机构
- `us-brokers-investing.list`：券商、投资和退休账户
- `us-payments-wallets.list`：支付、转账和电子钱包
- `us-financial.list`：金融服务合并规则集
- `us-mobile-financial.list`：通信与金融全部合并规则集

## Surge 用法

```ini
[Rule]
RULE-SET,https://raw.githubusercontent.com/JoelYang-Y/scripts/main/surge/us-mobile-financial.list,美国金融通信
```

也可以将策略名称替换为现有的策略组，例如 `节点选择` 或专用美国出口策略。

## 维护说明

- 域名规则是主要规则。
- IP-CIDR 是生成时通过 DNS 查询得到的 IPv4 快照，仅用于补充无法正常解析域名的连接。
- 金融机构和移动运营商普遍使用 CDN、云负载均衡和动态 DNS，IP 地址可能变化。
- 未加入大范围 Cloudflare、Akamai、Fastly、AWS 网段，避免误匹配无关网站。
- `DOMAIN-SUFFIX` 会覆盖同一官方根域名下的登录、接口和支付子域名。
- 规则集不包含任何账号、密码、Cookie、证书或代理节点信息。

生成时间：2026-09-19

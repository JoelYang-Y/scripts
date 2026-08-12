#!/usr/bin/env python3
"""
check_domain.py — Surge 域名出口 IP 检测工具 (v3)

原理 (三步):
  1. 通过 Surge 代理发起 HTTPS 请求 (带 TLS SNI, 让规则引擎按域名精确匹配)
  2. 查询 Surge /v1/requests/recent, 找到该域名的连接记录, 读取:
       - rule: 命中的规则 (DOMAIN-SUFFIX / DOMAIN-KEYWORD / RULE-SET / FINAL 等)
       - policyName: 实际路由策略
       - notes: 完整决策链 (Policy decision path: 组 -> 最终节点)
  3. 用 X-Surge-Policy 强制走该策略访问 ip-api.com, 拿真实出口 IP/国家/ASN

v3 改进 (2026-08-12):
  - 规则类型识别: DOMAIN-SUFFIX (精确后缀) / DOMAIN-KEYWORD (关键词, 覆盖广)
  - 命中 DOMAIN-KEYWORD 时提示: 该关键词覆盖范围广, 服务的 IP 段流量可能
    走其他更精确的规则 (如 Telegram.list -> Telegram 组), App 与域名可能不同路
  - 支持输入纯关键词 (如 telegram) 也能匹配 recent 记录
  - 显示所有相关规则类型, 不只最新一条
"""
import urllib.request
import json
import time
import sys
import ssl
import re

# Surge 代理与 API 配置
PROXY = 'http://127.0.0.1:6152'
API_URL = 'http://127.0.0.1:6171/v1/requests/recent'
API_KEY = 'Ygg1014.'


def make_opener():
    """创建走 Surge 代理的 opener (忽略证书错误)"""
    proxy_handler = urllib.request.ProxyHandler({'http': PROXY, 'https': PROXY})
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return urllib.request.build_opener(proxy_handler, urllib.request.HTTPSHandler(context=ctx))


def parse_decision_path(notes):
    """从 notes 提取策略决策链, 如 'Policy decision path: 节点选择 -> AnyTLS-AT&T'"""
    for n in notes:
        m = re.search(r'Policy decision path:\s*(.+)', n)
        if m:
            return m.group(1).strip()
    return None


def parse_subrule(notes):
    """从 notes 提取子规则, 如 'Sub-rule matched: DOMAIN-KEYWORD telegram(in Proxy.list)'"""
    for n in notes:
        m = re.search(r'Sub-rule matched:\s*(.+)', n)
        if m:
            return m.group(1).strip()
    return None


def classify_rule(rule_str, sub_rule_str):
    """识别规则类型: DOMAIN-SUFFIX / DOMAIN-KEYWORD / DOMAIN / RULE-SET / IP-CIDR / FINAL"""
    text = f"{rule_str} {sub_rule_str}".upper()
    if 'DOMAIN-SUFFIX' in text:
        return 'DOMAIN-SUFFIX'
    if 'DOMAIN-KEYWORD' in text:
        return 'DOMAIN-KEYWORD'
    if 'DOMAIN,' in text or text.startswith('DOMAIN '):
        return 'DOMAIN'
    if 'IP-CIDR' in text:
        return 'IP-CIDR'
    if 'RULE-SET' in text:
        return 'RULE-SET'
    if 'FINAL' in text:
        return 'FINAL'
    return 'OTHER'


def is_ip_input(s):
    """判断输入是否为 IP 段/IP 地址: 纯数字+点(/ 可选)"""
    s = s.strip()
    if not s:
        return False
    # 去掉 CIDR 后缀 (/xx) 后, 应只剩数字和点
    base = s.split('/')[0]
    if not base:
        return False
    return all(c.isdigit() or c == '.' for c in base) and '.' in base


def check_domain_exit_ip(domain):
    opener = make_opener()

    # 判断输入类型: 完整域名 / 纯关键词 / IP 段
    is_ip = is_ip_input(domain)
    is_keyword = ('.' not in domain) and not is_ip
    probe_target = domain if (not is_keyword and not is_ip) else None

    if is_ip:
        print(f"\n🔍 [1/3] 检测到 IP 段输入: {domain}, 将直接匹配 Surge 的 IP-CIDR 规则...")
    else:
        print(f"\n🔍 [1/3] 正在通过 Surge 发起 {domain} 的 HTTPS 请求 (携带 SNI)...")
    try:
        # 用 HTTPS (带 TLS SNI) 触发规则引擎, 2 秒超时, 成败无关
        if probe_target:
            req = urllib.request.Request(f"https://{probe_target}", method='HEAD')
            opener.open(req, timeout=2)
    except Exception:
        pass

    time.sleep(0.5)  # 等 Surge 记账

    print(f"📊 [2/3] 正在查询 Surge 引擎, 获取命中策略...")
    try:
        req_api = urllib.request.Request(API_URL, headers={"X-Key": API_KEY})
        resp = urllib.request.urlopen(req_api, timeout=3)
        data = json.loads(resp.read().decode('utf-8'))

        # 收集所有匹配的记录 (含 URL / notes 里的域名 / SNI / IP-CIDR)
        candidates = []
        for r in data.get('requests', []):
            url = r.get('URL', '') or ''
            notes = r.get('notes', []) or []
            blob = f"{url} {' '.join(notes)}"
            if domain.lower() in blob.lower():
                candidates.append(r)

        if not candidates:
            print("❌ 未能在 Surge 中找到匹配记录, 请确保 Surge 已启动并在接管流量。")
            if is_keyword:
                print("   💡 提示: 输入的是关键词而非完整域名, 可尝试输入完整域名 (如 telegram.org)。")
            if is_ip:
                print("   💡 提示: 该 IP 段可能在 recent 记录中没有命中记录 (服务未活动/窗口已过)。")
            return

        # 取最新一条做主结果, 同时统计所有出现的规则类型
        # IP 输入时优先选 IP-CIDR 命中的记录
        r = candidates[0]
        if is_ip:
            ipcidr_cands = []
            for c in candidates:
                c_notes = ' '.join(c.get('notes', []) or [])
                c_sub = parse_subrule(c.get('notes', []) or []) or ''
                c_rule = c.get('rule', '')
                if classify_rule(c_rule, c_sub) == 'IP-CIDR' or 'IP-CIDR' in c_notes:
                    ipcidr_cands.append(c)
            if ipcidr_cands:
                r = ipcidr_cands[0]
        matched_policy = r.get('policyName') or r.get('originalPolicyName')
        matched_rule = r.get('rule', 'N/A')
        notes = r.get('notes', []) or []
        decision_path = parse_decision_path(notes)
        sub_rule = parse_subrule(notes)

        # 提取命中的 IP-CIDR 规则 (如 "IP-CIDR 149.154.160.0/20")
        matched_ipcidr = None
        for n in notes:
            m = re.search(r'(IP-CIDR[0-9a-zA-Z.:/]+(?:\(in [^)]+\))?)', n)
            if m:
                matched_ipcidr = m.group(1)
                break

        # 统计所有候选记录里出现的规则类型
        rule_types = set()
        for c in candidates:
            c_rule = c.get('rule', '')
            c_notes = ' '.join(c.get('notes', []) or [])
            c_sub = parse_subrule(c.get('notes', []) or []) or ''
            rule_types.add(classify_rule(c_rule, c_sub))

        rule_type = classify_rule(matched_rule, sub_rule or '')

        print(f"🎯 命中规则: [{matched_rule}]")
        if sub_rule:
            print(f"🔎 子规则:   [{sub_rule}]")
        if matched_ipcidr:
            print(f"🌐 IP-CIDR:  [{matched_ipcidr}]")
        print(f"🛤️ 路由策略: [{matched_policy}]")
        if decision_path:
            print(f"🔗 决策链:   {decision_path}")
        print(f"📋 规则类型: {rule_type} (相关: {', '.join(sorted(rule_types)) if rule_types else rule_type})")

        # IP-CIDR 命中提示
        if rule_type == 'IP-CIDR' or matched_ipcidr:
            print("   ✅ 命中【IP-CIDR 规则】, 该 IP 段流量走精确路由。")

        # DOMAIN-SUFFIX 精确提示
        if rule_type == 'DOMAIN-SUFFIX':
            print("   ✅ 命中【后缀规则】(DOMAIN-SUFFIX), 精确匹配, 结果可靠。")

        # FINAL 兜底提示
        if rule_type == 'FINAL':
            print("   ⚠️ 命中【兜底规则】(FINAL), 该域名没有专门规则, 走默认策略。")

        # 已知服务的策略组映射: 关键词 -> 策略组名 (用于探测 App/IP 段实际出口)
        GROUP_HINTS = {
            'telegram': 'Telegram',
            'whatsapp': 'Telegram',   # WhatsApp 也常归入 Telegram 组 (Meta 类目)
            'youtube': 'Google',
            'google': 'Google',
            'netflix': 'Netflix',
            'disney': 'Disney',
            'tiktok': 'TikTok',
            'chatgpt': 'OpenAI',
            'openai': 'OpenAI',
            'paypal': 'PayPal',
        }
        group_name = None
        for kw, grp in GROUP_HINTS.items():
            if kw in domain.lower():
                group_name = grp
                break

        if group_name:
            print(f"   💡 检测到 {domain} 可能对应策略组 [{group_name}], 将额外探测该组的实际出口...")

    except Exception as e:
        print(f"❌ 无法连接 Surge API, 请检查密码或端口配置 ({e})")
        return

    print(f"🚀 [3/3] 正在探测策略 [{matched_policy}] 的真实出口 IP...")
    try:
        # 用最终实际策略 (决策链末段) 强制探测; 若策略是组名, 取决策链最后节点
        probe_policy = matched_policy
        if decision_path and '->' in decision_path:
            last_node = decision_path.split('->')[-1].strip()
            if last_node:
                probe_policy = last_node

        def probe_ip(policy_label):
            """强制走指定策略探测出口 IP, 返回 (ip, country, region, isp, asn) 或 None
            DIRECT 时用无代理直连查询 (ip.sb 等国内可达 API)
            """
            try:
                if policy_label == 'DIRECT' or 'DEVICE:' in str(policy_label):
                    # 直连: 不走 Surge 代理, 用国内可达的 API 查询真实出口
                    direct_opener = urllib.request.build_opener()
                    try:
                        resp_d = direct_opener.open("https://ip.sb", timeout=5)
                        direct_ip = resp_d.read().decode('utf-8').strip()
                    except Exception:
                        direct_ip = None
                    if direct_ip:
                        # 用 ip-api.com 查详情 (直连)
                        try:
                            resp_info = direct_opener.open(f"http://ip-api.com/json/{direct_ip}", timeout=5)
                            d = json.loads(resp_info.read().decode('utf-8'))
                            if d.get('status') == 'success':
                                asn_raw = d.get('as', '')
                                asn_num = asn_raw.split()[0] if asn_raw else ''
                                asn_org = ' '.join(asn_raw.split()[1:]) if asn_raw else ''
                                return (d.get('query', ''), d.get('country', ''), d.get('countryCode', ''),
                                        d.get('regionName', ''), d.get('city', ''), d.get('isp', ''), asn_num, asn_org)
                        except Exception:
                            pass
                        return (direct_ip, '', '', '', '', '', '', '')
                # 代理策略: 用 X-Surge-Policy 强制走指定策略
                req_ip = urllib.request.Request("http://ip-api.com/json/")
                req_ip.add_header("X-Surge-Policy", policy_label)
                resp_ip = opener.open(req_ip, timeout=5)
                d = json.loads(resp_ip.read().decode('utf-8'))
                if d.get('status') == 'success':
                    asn_raw = d.get('as', '')
                    asn_num = asn_raw.split()[0] if asn_raw else ''
                    asn_org = ' '.join(asn_raw.split()[1:]) if asn_raw else ''
                    return (d.get('query', ''), d.get('country', ''), d.get('countryCode', ''),
                            d.get('regionName', ''), d.get('city', ''), d.get('isp', ''), asn_num, asn_org)
            except Exception:
                pass
            return None

        # 1) 探测域名实际命中策略
        main_result = probe_ip(probe_policy)

        # 2) 若有对应策略组, 额外探测组的实际出口 (App/IP 段路径)
        group_result = None
        if group_name and group_name != probe_policy:
            group_result = probe_ip(group_name)

        print("\n================ 最终检测结果 ================")
        print(f"🌐 域名: {domain}")
        print(f"🛤️ 域名命中策略: {probe_policy}")
        if decision_path:
            print(f"🔗 决策链:   {decision_path}")
        if main_result:
            ip, country, cc, region, city, isp, asn_num, asn_org = main_result
            print(f"🖥️ 域名出口:  {ip}")
            print(f"   📍 {country} ({cc}) {region} {city} | {isp} | ASN {asn_num} {asn_org}".rstrip())
        else:
            print("   ❌ 域名策略探测失败")

        if group_result:
            ip, country, cc, region, city, isp, asn_num, asn_org = group_result
            print(f"\n🛤️ 策略组 [{group_name}] (App/IP 段路径):")
            print(f"🖥️ 组出口:    {ip}")
            print(f"   📍 {country} ({cc}) {region} {city} | {isp} | ASN {asn_num} {asn_org}".rstrip())
        print("==============================================")

    except Exception as e:
        print(f"❌ 测速 IP 失败: {e}")


if __name__ == "__main__":
    print("==============================================")
    print("          Surge 域名出口 IP 检测工具          ")
    print("==============================================")
    try:
        while True:
            domain = input("\n👉 请输入要检测的域名或关键词 (如 www.youtube.com / telegram, 输入 q 退出): ").strip()
            if not domain:
                continue
            if domain.lower() in ['q', 'quit', 'exit']:
                print("👋 退出工具。")
                break

            # 自动处理用户可能带上的 http:// 头部或路径
            if domain.startswith("http://"):
                domain = domain[7:]
            elif domain.startswith("https://"):
                domain = domain[8:]
            domain = domain.split('/')[0]

            check_domain_exit_ip(domain)
    except KeyboardInterrupt:
        print("\n👋 退出工具。")

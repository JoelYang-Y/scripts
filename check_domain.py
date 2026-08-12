#!/usr/bin/env python3
"""
check_domain.py — Surge 域名出口 IP 检测工具 (v2)

原理 (三步):
  1. 通过 Surge 代理发起 HTTPS 请求 (带 TLS SNI, 让规则引擎按域名精确匹配)
  2. 查询 Surge /v1/requests/recent, 找到该域名的连接记录, 读取:
       - rule: 命中的规则 (含 RULE-SET 子规则 DOMAIN-KEYWORD 等)
       - policyName: 实际路由策略
       - notes: 完整决策链 (Policy decision path: 组 -> 最终节点)
  3. 用 X-Surge-Policy 强制走该策略访问 ip-api.com, 拿真实出口 IP/国家/ASN

v2 改进 (2026-08-12):
  - 用 HTTPS 代替 HTTP HEAD 请求, 携带 TLS SNI, 规则匹配更精确
  - 从 notes 提取 Policy decision path, 显示组内实际选择的节点
  - 匹配逻辑增强: 兼容 URL 无域名的情况 (IP 直连/加密流量)
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


def check_domain_exit_ip(domain):
    opener = make_opener()

    print(f"\n🔍 [1/3] 正在通过 Surge 发起 {domain} 的 HTTPS 请求 (携带 SNI)...")
    try:
        # 用 HTTPS (带 TLS SNI) 触发规则引擎, 2 秒超时, 成败无关
        req = urllib.request.Request(f"https://{domain}", method='HEAD')
        opener.open(req, timeout=2)
    except Exception:
        pass

    time.sleep(0.5)  # 等 Surge 记账

    print(f"📊 [2/3] 正在查询 Surge 引擎, 获取命中策略...")
    matched_policy = None
    matched_rule = None
    decision_path = None
    sub_rule = None
    try:
        req_api = urllib.request.Request(API_URL, headers={"X-Key": API_KEY})
        resp = urllib.request.urlopen(req_api, timeout=3)
        data = json.loads(resp.read().decode('utf-8'))

        # 优先找最近且匹配域名的记录; 兼容 URL 字段为空 (IP 直连) 时看 notes
        candidates = []
        for r in data.get('requests', []):
            url = r.get('URL', '') or ''
            notes = r.get('notes', []) or []
            blob = url + ' ' + ' '.join(notes)
            # 域名匹配: URL 含域名 或 notes 里出现域名/SNI
            if domain.lower() in blob.lower():
                candidates.append(r)

        if not candidates:
            print("❌ 未能在 Surge 中找到匹配记录, 请确保 Surge 已启动并在接管流量。")
            print("   💡 提示: 若该服务走 IP 直连 (无域名), 可改用 IP 段关键词检测。")
            return

        # 取最新一条 (列表按时间倒序, 第一条最新)
        r = candidates[0]
        matched_policy = r.get('policyName') or r.get('originalPolicyName')
        matched_rule = r.get('rule', 'N/A')
        notes = r.get('notes', []) or []
        decision_path = parse_decision_path(notes)
        sub_rule = parse_subrule(notes)

        print(f"🎯 命中规则: [{matched_rule}]")
        if sub_rule:
            print(f"🔎 子规则:   [{sub_rule}]")
        print(f"🛤️ 路由策略: [{matched_policy}]")
        if decision_path:
            print(f"🔗 决策链:   {decision_path}")

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

        req_ip = urllib.request.Request("http://ip-api.com/json/")
        req_ip.add_header("X-Surge-Policy", probe_policy)
        resp_ip = opener.open(req_ip, timeout=5)
        ip_data = json.loads(resp_ip.read().decode('utf-8'))

        if ip_data['status'] == 'success':
            asn_raw = ip_data.get('as', '')
            asn_num = asn_raw.split()[0] if asn_raw else ''
            asn_org = ' '.join(asn_raw.split()[1:]) if asn_raw else ''
            country_code = ip_data.get('countryCode', '')

            print("\n================ 最终检测结果 ================")
            print(f"🌐 域名: {domain}")
            print(f"🛤️ 策略: {probe_policy}")
            if decision_path:
                print(f"🔗 决策链: {decision_path}")
            print(f"🖥️ 出口 IP:  {ip_data['query']}")
            print(f"📍 国家:     {ip_data.get('country', '')} ({country_code})")
            print(f"🗺️  地区:     {ip_data.get('regionName', '')} {ip_data.get('city', '')}")
            print(f"🏢 运营商:   {ip_data.get('isp', '')}")
            print(f"🔢 ASN:      {asn_num} {asn_org}".rstrip())
            print("==============================================")
        else:
            print("❌ 获取出口 IP 详情失败。")

    except Exception as e:
        print(f"❌ 测速 IP 失败: {e}")


if __name__ == "__main__":
    print("==============================================")
    print("          Surge 域名出口 IP 检测工具          ")
    print("==============================================")
    try:
        while True:
            domain = input("\n👉 请输入要检测的域名 (如 www.youtube.com, 输入 q 退出): ").strip()
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

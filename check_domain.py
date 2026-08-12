import urllib.request
import json
import time
import sys
import ssl

def check_domain_exit_ip(domain):
    # Surge 默认 HTTP 代理端口
    proxy = 'http://127.0.0.1:6152'
    # 你配置文件中开启的 HTTP API 地址与密码
    api_url = 'http://127.0.0.1:6171/v1/requests/recent'
    api_key = 'Ygg1014.'
    
    proxy_handler = urllib.request.ProxyHandler({'http': proxy, 'https': proxy})
    # 忽略可能出现的证书错误
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    opener = urllib.request.build_opener(proxy_handler, urllib.request.HTTPSHandler(context=ctx))
    
    print(f"\n🔍 [1/3] 正在通过 Surge 发起 {domain} 的测试请求...")
    try:
        # 发起真实请求以触发 Surge 规则引擎（超时设为 2 秒，因为我们只需要 Surge 产生记录）
        req = urllib.request.Request(f"http://{domain}", method='HEAD')
        opener.open(req, timeout=2)
    except Exception:
        pass # 报错忽略，只要流量进代理了 Surge 就会记录

    time.sleep(0.5) # 给 Surge 一点时间生成记录
    
    print(f"📊 [2/3] 正在查询 Surge 引擎，获取命中策略...")
    matched_policy = None
    matched_rule = None
    try:
        req_api = urllib.request.Request(api_url, headers={"X-Key": api_key})
        resp = urllib.request.urlopen(req_api, timeout=3)
        data = json.loads(resp.read().decode('utf-8'))
        
        # 从最近的请求中找出刚刚访问的域名
        for r in data.get('requests', []):
            if domain in r.get('URL', ''):
                matched_policy = r.get('policyName')
                matched_rule = r.get('rule')
                break
                
        if not matched_policy:
            print("❌ 未能在 Surge 中找到匹配记录，请确保 Surge 已启动并在接管流量。")
            return
            
        print(f"🎯 命中规则: [{matched_rule}]")
        print(f"🛤️ 路由策略: [{matched_policy}]")
        
    except Exception as e:
        print(f"❌ 无法连接 Surge API，请检查密码或端口配置 ({e})")
        return

    print(f"🚀 [3/3] 正在探测策略 [{matched_policy}] 的真实出口 IP...")
    try:
        # Surge 隐藏特性：通过 X-Surge-Policy 请求头强制指定某次请求走特定的策略
        req_ip = urllib.request.Request("http://ip-api.com/json/")
        req_ip.add_header("X-Surge-Policy", matched_policy)
        resp_ip = opener.open(req_ip, timeout=5)
        ip_data = json.loads(resp_ip.read().decode('utf-8'))
        
        if ip_data['status'] == 'success':
            # 解析 ASN (格式: "AS7018 AT&T Enterprises, LLC")
            asn_raw = ip_data.get('as', '')
            asn_num = asn_raw.split()[0] if asn_raw else ''
            asn_org = ' '.join(asn_raw.split()[1:]) if asn_raw else ''
            country_code = ip_data.get('countryCode', '')

            print("\n================ 最终检测结果 ================")
            print(f"🌐 域名: {domain}")
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
            domain = input("\n👉 请输入要检测的域名 (如 www.youtube.com，输入 q 退出): ").strip()
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

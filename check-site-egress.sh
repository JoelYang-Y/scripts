#!/bin/bash
# check-site-egress.sh — 检测指定网站在本地网络(Surge)中的实际出口 IP
# 原理: 读 Surge /v1/rules 按序匹配域名 → 命中策略(节点/组) → 映射出口 IP → 标注国家/运营商/ASN
# 用法:
#   ./check-site-egress.sh paypal.com
#   ./check-site-egress.sh -j google.com        # JSON 输出
#   ./check-site-egress.sh -l                   # 列出已知节点→出口 IP 映射
set -u

API="http://10.0.0.2:6171"
KEY="X-Key: Ygg1014."
JSON=0
LIST=0

while getopts "jlh" opt; do
  case $opt in
    j) JSON=1 ;;
    l) LIST=1 ;;
    h) grep '^#' "$0" | sed 's/^# \{0,1\}//' | head -6; exit 0 ;;
    *) echo "未知参数"; exit 2 ;;
  esac
done
shift $((OPTIND-1))
DOMAIN="${1:-}"

# 已知节点 → 出口 IP 映射（实测/推断维护）
# AnyTLS-AT&T = 美国 AT&T 家宽 AnyTLS 节点(默认出口实测=107.141.151.219)
# AnyTLS-BWG  = 搬瓦工 VPS(64.64.237.34, joel.jhsweetheart.com)
node_ip() {
  case "$1" in
    "AnyTLS-AT&T") echo "107.141.151.219" ;;
    "AnyTLS-BWG") echo "64.64.237.34" ;;
  esac
}

if [ "$LIST" -eq 1 ]; then
  echo "已知节点 → 出口 IP 映射:"
  echo "  AnyTLS-AT&T → 107.141.151.219"
  echo "  AnyTLS-BWG → 64.64.237.34"
  echo "  DIRECT → 本地直连(中国电信/联通出口, 脚本无法直接实测)"
  echo "  机场节点(HongKong/Singapore/Japan/Taiwan/UK/Nexitally) → 出口动态, 需另行实测"
  exit 0
fi

if [ -z "$DOMAIN" ]; then
  echo "用法: $0 <域名>   (如: $0 paypal.com)" >&2
  exit 2
fi

# ---------- 1. 拉取规则 ----------
curl -s -m 10 -H "$KEY" "$API/v1/rules" -o /tmp/surge_rules.json
if ! grep -q '"rules"' /tmp/surge_rules.json; then
  echo "❌ 无法读取 Surge 规则" >&2; exit 1
fi

# ---------- 2. 拉取 RULE-SET 内容 ----------
mkdir -p /tmp/rulesets
python3 -c "
import json
d=json.load(open('/tmp/surge_rules.json'))
urls=[]
for r in d.get('rules',[]):
    parts=r.split(',')
    if parts and parts[0]=='RULE-SET' and len(parts)>=2 and parts[1].startswith('http'):
        urls.append(parts[1])
open('/tmp/ruleset_urls.txt','w').write('\n'.join(urls))
" 2>/dev/null
while IFS= read -r url; do
  [ -z "$url" ] && continue
  fn="/tmp/rulesets/$(printf '%s' "$url" | md5 -q 2>/dev/null || printf '%s' "$url" | md5sum | cut -d' ' -f1)"
  [ -f "$fn" ] || curl -s -m 12 -L "$url" -o "$fn"
done < /tmp/ruleset_urls.txt

# ---------- 3. 规则匹配 ----------
MATCH=$(python3 - "$DOMAIN" <<'EOF'
import json, sys, os
domain = sys.argv[1].lower()
d = json.load(open('/tmp/surge_rules.json'))
rules = d.get('rules', [])

def match_simple(rule_type, arg, host):
    arg = arg.lower()
    if rule_type == 'DOMAIN':
        return host == arg
    if rule_type == 'DOMAIN-SUFFIX':
        return host == arg or host.endswith('.' + arg)
    if rule_type == 'DOMAIN-KEYWORD':
        return arg in host
    return False

def match_ruleset(path, host):
    if not os.path.exists(path): return None
    try:
        lines = open(path, encoding='utf-8', errors='ignore').read().splitlines()
    except Exception:
        return None
    for ln in lines:
        ln = ln.strip()
        if not ln or ln.startswith('#') or ln.startswith('//'): continue
        parts = [p.strip() for p in ln.split(',')]
        if len(parts) < 2: continue
        if parts[0] == 'DOMAIN-SUFFIX' and (host == parts[1].lower() or host.endswith('.' + parts[1].lower())):
            return True
        if parts[0] == 'DOMAIN' and host == parts[1].lower():
            return True
        if parts[0] == 'DOMAIN-KEYWORD' and parts[1].lower() in host:
            return True
    return None

for r in rules:
    if not r: continue
    parts = [p.strip() for p in r.split(',')]
    rt = parts[0]
    if rt in ('DOMAIN', 'DOMAIN-SUFFIX', 'DOMAIN-KEYWORD') and len(parts) >= 3:
        if match_simple(rt, parts[1], domain):
            print(f"RULE|{r}|{parts[2]}"); sys.exit(0)
    elif rt == 'RULE-SET' and len(parts) >= 3:
        url = parts[1]
        if url.startswith('http'):
            fn = "/tmp/rulesets/" + __import__('hashlib').md5(url.encode()).hexdigest()
            hit = match_ruleset(fn, domain)
            if hit:
                print(f"RULE|{r}|{parts[2]}"); sys.exit(0)
        else:
            # masked URL — 无法拉取内容, 跳过并记录
            continue
    elif rt == 'FINAL' and len(parts) >= 2:
        # Surge: FINAL,<policy>[,flag] — 策略是第二段
        print(f"FINAL|FINAL|{parts[1]}"); sys.exit(0)
    # 其他类型(IP-CIDR/AND/SRC-IP/GEOIP 等)域名阶段跳过
print(f"FINAL|FINAL|DIRECT")
EOF
)

RULE_STR="${MATCH%%|*}"
REST="${MATCH#*|}"
POLICY="${REST#*|}"

# ---------- 4. 策略 → 出口 IP ----------
EGRESS=""
POLICY_TYPE="节点"
if [ -n "$(node_ip "$POLICY")" ]; then
  EGRESS="$(node_ip "$POLICY")"
elif [ "$POLICY" = "DIRECT" ]; then
  POLICY_TYPE="直连"; EGRESS=""
else
  # 精确分类: 用 /v1/policies 区分 节点(proxies) vs 策略组(policy-groups)
  curl -s -m 8 -H "$KEY" "$API/v1/policies" -o /tmp/surge_policies.json 2>/dev/null
  IS_PROXY=$(python3 -c "import json,sys; d=json.load(open('/tmp/surge_policies.json')); print('yes' if sys.argv[1] in d.get('proxies',[]) else 'no')" "$POLICY" 2>/dev/null)
  IS_GROUP=$(python3 -c "import json,sys; d=json.load(open('/tmp/surge_policies.json')); print('yes' if sys.argv[1] in d.get('policy-groups',[]) else 'no')" "$POLICY" 2>/dev/null)
  if [ "$IS_GROUP" = "yes" ]; then
    # 策略组 — 从 profile [Proxy Group] 解析默认(第一个)节点
    POLICY_TYPE="策略组(默认节点)"
    curl -s -m 10 -H "$KEY" "$API/v1/profiles/current" -o /tmp/surge_profile.json 2>/dev/null
    GRP_DEFAULT=$(python3 - "$POLICY" <<'EOF'
import json, sys, re
target = sys.argv[1]
try:
    d = json.load(open('/tmp/surge_profile.json'))
except Exception:
    print(""); sys.exit(0)
s = json.dumps(d, ensure_ascii=False)
# [Proxy Group] 段中查找 "组名 = select, 选项1, 选项2, ..." (smart 组同格式取第一个)
m = re.search(re.escape(target) + r'\s*=\s*(?:select|smart),\s*([^,\n]+)', s)
print(m.group(1).strip() if m else "")
EOF
)
    if [ "$GRP_DEFAULT" = "DIRECT" ]; then
      POLICY_TYPE="策略组(默认直连)"; EGRESS=""
    elif [ -n "$GRP_DEFAULT" ] && [ -n "$(node_ip "$GRP_DEFAULT")" ]; then
      EGRESS="$(node_ip "$GRP_DEFAULT")"
    else
      POLICY_TYPE="策略组"
    fi
  elif [ "$IS_PROXY" = "yes" ]; then
    POLICY_TYPE="机场节点"; EGRESS=""
  else
    POLICY_TYPE="未知策略"; EGRESS=""
  fi
fi

# ---------- 5. 出口 IP 标注 ----------
if [ -n "$EGRESS" ]; then
  INFO=$(curl -s -m 12 "https://ipinfo.io/${EGRESS}/json" 2>/dev/null)
  if ! echo "$INFO" | grep -q '"ip"'; then
    INFO=$(curl -s -m 12 "https://api.ipapi.is/?q=${EGRESS}" 2>/dev/null)
    if echo "$INFO" | grep -q '"ip"'; then
      INFO=$(python3 -c "
import json,sys
d=json.loads('''$INFO''')
print(json.dumps({'ip':d.get('ip'),'country':d.get('cc'),'city':'','region':'','org':d.get('asn_org') or d.get('company_name'),'asn':('AS'+str(d['asn_num'])) if d.get('asn_num') else ''},ensure_ascii=False))
")
    else
      INFO='{"ip":"'$EGRESS'","country":"?","org":"查询失败"}'
    fi
  fi
fi

# ---------- 6. 输出 ----------
if [ "$JSON" -eq 1 ]; then
  python3 - "$DOMAIN" "$RULE_STR" "$POLICY" "$POLICY_TYPE" "$EGRESS" "$INFO" <<'EOF'
import json, sys
domain, rule, policy, ptype, egress, info = sys.argv[1:7]
out = {"domain": domain, "matched_rule": rule, "policy": policy, "policy_type": ptype}
if egress:
    out["egress_ip"] = egress
    try: out["ipinfo"] = json.loads(info)
    except Exception: out["ipinfo"] = {}
print(json.dumps(out, ensure_ascii=False, indent=2))
EOF
  exit 0
fi

echo "══════════════════════════════════════════════"
echo "  网站出口 IP 检测: $DOMAIN"
echo "══════════════════════════════════════════════"
echo "🎯 命中规则: $RULE_STR"
echo "🧭 策略:     $POLICY ($POLICY_TYPE)"
if [ "$POLICY_TYPE" = "策略组(默认节点)" ] || [ "$POLICY_TYPE" = "策略组(默认直连)" ]; then
  echo "⚠️  显示为 profile 默认配置，运行时选中以 Surge 界面为准（API 无法读取组内当前选择）"
fi
if [ -n "$EGRESS" ]; then
  echo ""
  echo "📍 出口 IP:   $EGRESS"
  echo "$INFO" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('🌍 国家:     ' + (d.get('country') or '?'))
if d.get('city') or d.get('region'):
    print('🗺️  地区:     ' + ' '.join(x for x in [d.get('city'),d.get('region')] if x))
print('🏢 运营商:   ' + (d.get('org') or '?'))
if d.get('asn'): print('🔢 ASN:      ' + d['asn'])
"
else
  echo ""
  echo "⚠️  $POLICY 的出口 IP 无法静态确定:"
  if [ "$POLICY_TYPE" = "策略组" ]; then
    echo "   策略组当前选中需在 Surge 中确认；可用 /v1/traffic 看活跃连接"
  elif [ "$POLICY_TYPE" = "机场节点" ]; then
    echo "   机场节点出口动态变化，建议用 check-egress.sh -x <代理> 实测"
  else
    echo "   直连出口为本地 ISP 公网 IP"
  fi
fi
echo ""

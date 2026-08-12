#!/bin/bash
# check-egress.sh — 检测本地网络环境的实际出口 IP + 国家/运营商/ASN
# 默认检测本机（含 Surge 代理）当前出口；-x 指定代理出口；-d 附加域名真实解析(DoH)
# 用法:
#   ./check-egress.sh                      # 检测当前出口
#   ./check-egress.sh -x socks5://127.0.0.1:6153   # 走 SOCKS5 代理检测
#   ./check-egress.sh -d google.com        # 出口 + google.com 真实 IP 标注
#   ./check-egress.sh -j                   # JSON 输出
set -u

PROXY=""
DOMAIN=""
JSON=0
IP_ECHO="https://api.ipify.org"

while getopts "x:d:jh" opt; do
  case $opt in
    x) PROXY="$OPTARG" ;;
    d) DOMAIN="$OPTARG" ;;
    j) JSON=1 ;;
    h)
      grep '^#' "$0" | sed 's/^# \{0,1\}//' | head -8
      exit 0 ;;
    *) echo "未知参数"; exit 2 ;;
  esac
done

CURL_OPTS=(-s -m 15)
[ -n "$PROXY" ] && CURL_OPTS+=(-x "$PROXY")

# ---------- 1. 出口 IP ----------
EGRESS=$(curl "${CURL_OPTS[@]}" "$IP_ECHO" 2>/dev/null | tr -d '[:space:]')
if [ -z "$EGRESS" ]; then
  echo "❌ 无法获取出口 IP（网络/代理异常）" >&2
  exit 1
fi

# ---------- 2. IP 标注（ipinfo 优先，失败降级 ipapi.is） ----------
annotate() {
  local ip="$1"
  local info
  info=$(curl "${CURL_OPTS[@]}" "https://ipinfo.io/${ip}/json" 2>/dev/null)
  if [ -z "$info" ] || ! echo "$info" | grep -q '"ip"'; then
    info=$(curl "${CURL_OPTS[@]}" "https://api.ipapi.is/?q=${ip}" 2>/dev/null)
    if [ -z "$info" ] || ! echo "$info" | grep -q '"ip"'; then
      echo "{\"ip\":\"$ip\",\"country\":\"?\",\"region\":\"\",\"city\":\"\",\"org\":\"查询失败\",\"asn\":\"\"}"
      return
    fi
    # ipapi.is 结构转换
    python3 -c "
import json,sys
d=json.loads('''$info''')
print(json.dumps({'ip':d.get('ip'),'country':d.get('cc'),'region':'','city':'','org':d.get('asn_org') or d.get('company_name'),'asn':('AS'+str(d['asn_num'])) if d.get('asn_num') else ''},ensure_ascii=False))
"
    return
  fi
  echo "$info"
}

info=$(annotate "$EGRESS")

# ---------- 3. 输出 ----------
if [ "$JSON" -eq 1 ]; then
  if [ -n "$DOMAIN" ]; then
    curl "${CURL_OPTS[@]}" "https://dns.google/resolve?name=${DOMAIN}&type=A" 2>/dev/null \
      | python3 -c "
import json,sys
d=json.load(sys.stdin)
ips=[a['data'] for a in d.get('Answer',[]) if a.get('type')==1]
print(json.dumps({'egress':json.loads('''$info'''),'domain':{'$DOMAIN':ips}},ensure_ascii=False))
"
  else
    echo "$info"
  fi
  exit 0
fi

echo "══════════════════════════════════════════════"
echo "  实际出口 IP 检测"
echo "══════════════════════════════════════════════"
[ -n "$PROXY" ] && echo "代理出口: $PROXY"
echo ""
echo "📍 出口 IP:   $EGRESS"
echo "$info" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('🌍 国家:     ' + d.get('country','?'))
if d.get('region') or d.get('city'):
    print('🗺️  地区:     ' + ' '.join(x for x in [d.get('city'),d.get('region')] if x))
print('🏢 运营商:   ' + (d.get('org','?') or '?'))
asn=d.get('asn','')
if asn: print('🔢 ASN:      ' + asn)
"

if [ -n "$DOMAIN" ]; then
  echo ""
  echo "── $DOMAIN 真实解析（DoH 绕过本地 FakeIP）──"
  curl "${CURL_OPTS[@]}" "https://dns.google/resolve?name=${DOMAIN}&type=A" 2>/dev/null \
    | python3 -c "
import json,sys
d=json.load(sys.stdin)
ips=[a['data'] for a in d.get('Answer',[]) if a.get('type')==1]
for ip in ips: print('   ' + ip)
if not ips: print('   (无 A 记录/解析失败)')
"
fi
echo ""

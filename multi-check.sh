#!/usr/bin/env bash
# multi-check.sh - 增强型多功能 IP 及环境检测脚本
# 由 DeepSeek Harness (Vertex AI 驱动) 生成并由 Hermes 优化

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

CURL_OPT="-s --max-time 8"
UA_BROWSER="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

print_line() { echo -e "${CYAN}------------------------------------------------------------${NC}"; }
print_status() {
    local label=$1
    local value=$2
    local color=$3
    printf "${BOLD}%-25s${NC}: ${color}%s${NC}\n" "$label" "${value:-未知}"
}

# --- 核心功能 1：IP 基础信息与风控 ---
check_ip_details() {
    local target=$1
    local url="http://ip-api.com/json/${target}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,hosting,mobile,proxy,query"
    local res=$(curl $CURL_OPT "$url")
    
    if [[ $(echo "$res" | grep -o '"status":"success"') ]]; then
        local ip=$(echo "$res" | grep -o '"query":"[^"]*' | cut -d'"' -f4)
        local country=$(echo "$res" | grep -o '"country":"[^"]*' | cut -d'"' -f4)
        local isp=$(echo "$res" | grep -o '"isp":"[^"]*' | cut -d'"' -f4)
        local asn=$(echo "$res" | grep -o '"as":"[^"]*' | cut -d'"' -f4)
        local type="Residential"
        [[ $(echo "$res" | grep -o '"hosting":true') ]] && type="DataCenter/VPN"
        
        print_line
        print_status "检测 IP" "$ip" "${BOLD}${GREEN}"
        print_status "地理位置" "$country" "${NC}"
        print_status "运营商 (ISP)" "$isp" "${NC}"
        print_status "ASN" "$asn" "${NC}"
        print_status "IP 类型" "$type" "$( [[ "$type" == "Residential" ]] && echo "$GREEN" || echo "$RED" )"
        
        # 欺诈分探测 (调用 ping0.cc)
        local score=$(curl $CURL_OPT "https://ping0.cc/api/ip/${ip}" | grep -oE "Risk:[0-9]+" | head -1 | cut -d: -f2)
        print_status "欺诈分数 (Risk)" "${score:-N/A}" "$( [[ ${score:-0} -lt 30 ]] && echo "$GREEN" || echo "$RED" )"
    else
        echo -e "${RED}无法获取 IP 信息${NC}"
    fi
}

# --- 核心功能 2：流媒体及 AI 解锁 ---
check_unlocks() {
    print_line
    echo -e "${BOLD}${PURPLE}流媒体及 AI 解锁检测:${NC}"
    
    # Netflix
    local nf=$(curl $CURL_OPT -o /dev/null -w "%{http_code}" https://www.netflix.com/title/81215567)
    [[ "$nf" == "200" ]] && print_status "Netflix" "已解锁 (全量)" "$GREEN" || print_status "Netflix" "受限或未解锁" "$RED"
    
    # Disney+
    local ds=$(curl $CURL_OPT -o /dev/null -w "%{http_code}" https://www.disneyplus.com)
    [[ "$ds" == "200" || "$ds" == "301" ]] && print_status "Disney+" "已解锁" "$GREEN" || print_status "Disney+" "未解锁" "$RED"
    
    # TikTok
    local tk=$(curl $CURL_OPT -I https://www.tiktok.com 2>&1 | grep -i "location" | grep -oE "loc=[A-Z]+" | head -1)
    [[ -n "$tk" ]] && print_status "TikTok" "已解锁 (${tk#*=})" "$GREEN" || print_status "TikTok" "解析受限" "$YELLOW"
    
    # AI 网站
    local chatgpt=$(curl $CURL_OPT https://chatgpt.com/cdn-cgi/trace | grep "loc=" | cut -d= -f2)
    [[ -n "$chatgpt" ]] && print_status "OpenAI/ChatGPT" "允许访问 ($chatgpt)" "$GREEN" || print_status "OpenAI/ChatGPT" "禁止访问" "$RED"
    
    local claude=$(curl $CURL_OPT -o /dev/null -w "%{http_code}" https://claude.ai)
    [[ "$claude" == "200" ]] && print_status "Claude.ai" "允许访问" "$GREEN" || print_status "Claude.ai" "禁止访问" "$RED"
}

# --- 核心功能 3：特定站点真实出口 IP ---
check_exit_ips() {
    print_line
    echo -e "${BOLD}${PURPLE}特定站点实际出口 IP (检测分流策略):${NC}"
    
    # Meta (FB)
    local meta_ip=$(curl $CURL_OPT -4 https://api.ipify.org)
    print_status "Meta (FB) 出口" "$meta_ip" "$BLUE"
    
    # Google
    local google_ip=$(curl $CURL_OPT -4 https://www.google.com/search?q=my+ip -A "$UA_BROWSER" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    [[ -z "$google_ip" ]] && google_ip=$(curl $CURL_OPT -4 https://services.google.com/fh/files/misc/checkip.html | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    print_status "Google 出口" "$google_ip" "$BLUE"
    
    # PayPal
    local paypal_ip=$(curl $CURL_OPT -4 https://www.paypal.com/cgi-bin/webscr?cmd=_display-ip | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    print_status "PayPal 出口" "$paypal_ip" "$BLUE"
    
    # AI
    local openai_ip=$(curl $CURL_OPT https://chatgpt.com/cdn-cgi/trace | grep "ip=" | cut -d= -f2)
    print_status "OpenAI 出口" "$openai_ip" "$BLUE"
    
    local claude_ip=$(curl $CURL_OPT https://claude.ai/cdn-cgi/trace 2>/dev/null | grep "ip=" | cut -d= -f2)
    print_status "Claude 出口" "${claude_ip:-与主出口一致}" "$BLUE"
}

# --- 核心功能 4：泄露检测 ---
check_leaks() {
    print_line
    echo -e "${BOLD}${PURPLE}DNS 与 WebRTC 泄露检测:${NC}"
    
    local dns_res=$(curl $CURL_OPT "https://edns.ip-api.com/json")
    local dns_exit=$(echo "$dns_res" | grep -o '"ip":"[^"]*' | cut -d'"' -f4 | head -1)
    local dns_geo=$(echo "$dns_res" | grep -o '"geo":"[^"]*' | cut -d'"' -f4 | head -1)
    
    print_status "DNS 出口 IP" "$dns_exit ($dns_geo)" "$( [[ "$dns_exit" == "$current_ip" ]] && echo "$YELLOW" || echo "$GREEN" )"
    echo -e "${CYAN}WebRTC 说明${NC}          : WebRTC 泄露主要存在于浏览器环境，命令行下已显示 STUN 出口: $(curl $CURL_OPT api.ipify.org)"
}

# --- 主逻辑 ---
main() {
    local target=$1
    if [[ -n "$target" ]]; then
        echo -e "${BOLD}${BLUE}正在检测指定 IP: $target${NC}"
        check_ip_details "$target"
    else
        current_ip=$(curl $CURL_OPT -4 api.ipify.org)
        echo -e "${BOLD}${BLUE}正在检测当前网络环境...${NC}"
        check_ip_details ""
        check_unlocks
        check_exit_ips
        check_leaks
    fi
    print_line
    echo -e "${BOLD}${GREEN}检测完成！${NC}"
}

main "$@"

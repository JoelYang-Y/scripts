#!/usr/bin/env bash
# ============================================================================
# multi-check.sh — 增强型 IP 及环境检测脚本（全面重构版）
# ----------------------------------------------------------------------------
# GitHub : https://github.com/JoelYang-Y/Personal/blob/main/multi-check.sh
# Usage  : bash <(curl -sL https://raw.githubusercontent.com/JoelYang-Y/Personal/main/multi-check.sh)
# ----------------------------------------------------------------------------
# 功能一（全面环境检测，无参数）：
#   1. IP 基础   ：出口 IP（多源交叉验证）、类型（原生家宽/机房/移动）、
#                  ASN、所有者及企业
#   2. 风控      ：信任/欺诈评分、代理/VPN/Tor 标记
#                  （集成 ip.net.coffee 与 ping0.cc 数据）
#   3. 流媒体    ：Netflix / Disney+ / TikTok / ChatGPT 解锁情况，
#                  并显示测试时抓取到的实际出口 IP、ASN 及归属企业
#   4. 分流出口  ：Meta(FB/IG) / TikTok / PayPal / Google /
#                  AI 类(Claude/Gemini/Antigravity/Codex/OpenAI/Perplexity)
#                  的实测出口 IP（连接测试 + CDN 回显抓取）
#   5. 泄露检测  ：DNS 泄露（5 次随机子域名探测）、
#                  WebRTC 泄露（STUN 协议获取真实出口 IP 与本地 IP）
# 功能二（指定 IP 检测，传参）：
#   查询目标 IP 的风控、类型、流媒体支持评估及 ASN 详情
# ----------------------------------------------------------------------------
# 兼容性：macOS / Linux，bash 3.2+；所有 curl 均带 --max-time 8
# 用法  ：bash multi-check.sh              # 全面环境检测
#         bash multi-check.sh 1.2.3.4      # 指定 IP 检测
# ============================================================================

# ============================ 全局配置区 ====================================
# ANSI 高亮颜色
RED='\033[0;31m'      # 红    —— 风险/失败
GREEN='\033[0;32m'    # 绿    —— 正常/通过
YELLOW='\033[0;33m'   # 黄    —— 警告/未知
BLUE='\033[0;34m'     # 蓝    —— 信息
PURPLE='\033[0;35m'   # 紫    —— 标题
CYAN='\033[0;36m'     # 青    —— 标签
BOLD='\033[1m'        # 加粗
DIM='\033[2m'         # 暗淡  —— 注释/次要信息
NC='\033[0m'          # 重置

TIMEOUT=8             # 所有 curl 的统一超时（秒）
# 浏览器 UA（部分站点如 Netflix 需要桌面 UA 才返回可判定内容）
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
# 使用数组保存 curl 公共参数（避免 UA 含空格被错误分词）
CURL_OPT=(-s --max-time "$TIMEOUT" -A "$UA")

# STUN 服务器列表（WebRTC 泄露检测用，按优先级排列）
STUN_SERVERS="stun.l.google.com:19302 stun1.l.google.com:19302 stun.cloudflare.com:3478 stun.stunprotocol.org:3478"

# ============================ 工具函数区 ====================================

# 打印章节标题（紫底加粗 + 分隔线）
print_header() {
    echo -e "\n${BOLD}${PURPLE}═══ $1 ═══${NC}"
}

# 打印分隔线
print_rule() {
    echo -e "${DIM}──────────────────────────────────────────────────────────────${NC}"
}

# 打印键值对：$1=标签 $2=值 $3=值颜色（可选，默认 GREEN）
print_kv() {
    local label=$1 value=$2 color=${3:-$GREEN}
    # 清理值首尾空白（多字段拼接时可能产生）
    value=$(printf '%s' "$value" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')
    printf "${CYAN}  %-20s${NC} : ${color}%s${NC}\n" "$label" "${value:-未知}"
}

# 打印多行缩进内容（用于子项展开）
print_indent() {
    echo -e "    ${DIM}$1${NC}"
}

# 从 JSON 中提取字符串字段：$1=json $2=key
# 兼容 macOS(BSD) / Linux(GNU) 的 grep/sed
jget() {
    echo "$1" | grep -oE "\"$2\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" \
        | head -1 | sed -E 's/^[^:]*:[[:space:]]*"//; s/"$//'
}

# 从 JSON 中提取数字/布尔字段：$1=json $2=key
jgetn() {
    echo "$1" | grep -oE "\"$2\"[[:space:]]*:[[:space:]]*[a-zA-Z0-9._-]+" \
        | head -1 | sed -E 's/^[^:]*:[[:space:]]*//'
}

# 从 JSON 中提取嵌套字段：$1=json $2=外层key $3=内层key
jget_nested() {
    echo "$1" | grep -oE "\"$2\"[[:space:]]*:[[:space:]]*\{[^}]*\}" \
        | grep -oE "\"$3\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" \
        | head -1 | sed -E 's/^[^:]*:[[:space:]]*"//; s/"$//'
}

# 提取 JSON 中所有 "label" 值（用于威胁列表），每行一个
jlabels() {
    echo "$1" | grep -oE '"label"[[:space:]]*:[[:space:]]*"[^"]+"' \
        | sed -E 's/^[^:]*:[[:space:]]*"//; s/"$//'
}

# IPv4 格式校验：$1=ip，合法返回 0
valid_ipv4() {
    echo "$1" | grep -qE '^([0-9]{1,3}\.){3}[0-9]{1,3}$' || return 1
    local a b c d
    IFS=. read -r a b c d <<<"$1"
    [ "$a" -le 255 ] && [ "$b" -le 255 ] && [ "$c" -le 255 ] && [ "$d" -le 255 ]
}

# 十六进制字符串转二进制输出到 stdout（通过管道，避免 bash 变量丢失 NUL）
# $1=hex 字符串；依赖 perl（macOS/Linux 均自带），回退 xxd
hex2bin() {
    if command -v perl >/dev/null 2>&1; then
        printf '%s' "$1" | perl -ne 'print pack("H*", $_)'
    elif command -v xxd >/dev/null 2>&1; then
        printf '%s' "$1" | xxd -r -p
    else
        return 1
    fi
}

# 获取本机局域网 IP（WebRTC 可能泄露的本地地址）
get_local_ip() {
    local lip
    lip=$(ifconfig 2>/dev/null | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | head -1)
    [ -z "$lip" ] && lip=$(ip -4 addr show 2>/dev/null | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d/ -f1 | head -1)
    echo "$lip"
}

# ============================ 数据查询区 ====================================
# lookup_ip <ip>：深度查询一个 IP，结果写入全局 D_* 变量
# 数据源优先级：ip.net.coffee(iprisk + geoip) → ip-api.com（回退）
D_IP="" D_COUNTRY="" D_REGION="" D_CITY="" D_ISP="" D_ORG="" D_ASN="" D_ASORG=""
D_CTYPE="" D_DC="" D_RES="" D_MOB="" D_VPN="" D_PROXY="" D_TOR="" D_ABUSER=""
D_CRAWLER="" D_TRUST="" D_AI="" D_AI_CONF="" D_RDNS="" D_ASNKIND="" D_ASNALLOC=""
D_ASNTBPS="" D_ASNIPV4="" D_REDDIT="" D_ABUSERSCORE="" D_SRC=""
D_THREATS=""

lookup_ip() {
    local ip=$1 risk geo api
    # 重置所有结果变量
    D_IP= D_COUNTRY= D_REGION= D_CITY= D_ISP= D_ORG= D_ASN= D_ASORG=
    D_CTYPE= D_DC= D_RES= D_MOB= D_VPN= D_PROXY= D_TOR= D_ABUSER=
    D_CRAWLER= D_TRUST= D_AI= D_AI_CONF= D_RDNS= D_ASNKIND= D_ASNALLOC=
    D_ASNTBPS= D_ASNIPV4= D_REDDIT= D_ABUSERSCORE= D_SRC= D_THREATS=

    # ---- 主数据源：ip.net.coffee（深度风控 + 归属） ----
    risk=$(curl "${CURL_OPT[@]}" "https://ip.net.coffee/api/iprisk/$ip" 2>/dev/null)
    if echo "$risk" | grep -qE '"asn"[[:space:]]*:'; then
        D_SRC="ip.net.coffee (iprisk/geoip)"
        D_IP=$(jget "$risk" ip)
        D_COUNTRY=$(jget "$risk" country)
        D_REGION=$(jget "$risk" region)
        D_CITY=$(jget "$risk" city)
        D_ORG=$(jget "$risk" company_name)          # 归属企业
        D_ASN="AS$(jgetn "$risk" asn)"              # AS 号码
        D_ASORG=$(jget "$risk" asOrganization)      # AS 组织
        D_CTYPE=$(jget "$risk" company_type)        # hosting/isp/...
        D_DC=$(jgetn "$risk" is_datacenter)         # 是否机房
        D_RES=$(jgetn "$risk" isResidential)        # 是否家宽
        D_MOB=$(jgetn "$risk" is_mobile)            # 是否移动
        D_VPN=$(jgetn "$risk" is_vpn)               # VPN 标记
        D_PROXY=$(jgetn "$risk" is_proxy)           # 代理标记
        D_TOR=$(jgetn "$risk" is_tor)               # Tor 标记
        D_ABUSER=$(jgetn "$risk" is_abuser)         # 滥用标记
        D_CRAWLER=$(jgetn "$risk" is_crawler)       # 爬虫标记
        D_TRUST=$(jgetn "$risk" trust_score)        # 信任分(0-100，越低越可疑)
        D_ABUSERSCORE=$(jget "$risk" abuser_score)  # 滥用评分
        D_AI=$(jget_nested "$risk" ai_verdict label)        # AI 综合判定
        D_AI_CONF=$(jget_nested "$risk" ai_verdict confidence)
        D_RDNS=$(jget "$risk" rdns)                 # 反向 DNS
        D_ASNKIND=$(jget "$risk" asn_kind)          # ASN 类型(isp/hosting/...)
        D_ASNALLOC=$(jget "$risk" asn_allocated)    # ASN 分配日期
        D_ASNTBPS=$(jget "$risk" asn_tbps)          # ASN 带宽
        D_ASNIPV4=$(jgetn "$risk" asn_ipv4_count)   # ASN IPv4 数量
        D_REDDIT=$(jgetn "$risk" reddit_blocked)    # Reddit 封锁标记
        D_THREATS=$(jlabels "$risk")                # 威胁标签列表(多行)
        # geoip 接口补充 ISP 信息
        geo=$(curl "${CURL_OPT[@]}" "https://ip.net.coffee/api/geoip/$ip" 2>/dev/null)
        D_ISP=$(jget "$geo" isp)
        [ -z "$D_COUNTRY" ] && D_COUNTRY=$(jget "$geo" country)
        [ -z "$D_CITY" ] && D_CITY=$(jget "$geo" city)
        return 0
    fi

    # ---- 回退数据源：ip-api.com（免费版，http，45次/分钟限额） ----
    api=$(curl "${CURL_OPT[@]}" "http://ip-api.com/json/$ip?fields=status,country,regionName,city,isp,org,as,hosting,mobile,proxy,query" 2>/dev/null)
    if echo "$api" | grep -qE '"status"[[:space:]]*:[[:space:]]*"success"'; then
        D_SRC="ip-api.com (回退)"
        D_IP=$(jget "$api" query)
        D_COUNTRY=$(jget "$api" country)
        D_REGION=$(jget "$api" regionName)
        D_CITY=$(jget "$api" city)
        D_ISP=$(jget "$api" isp)
        D_ORG=$(jget "$api" org)
        D_ASN=$(jget "$api" as)
        D_DC=$(jgetn "$api" hosting)
        D_MOB=$(jgetn "$api" mobile)
        D_PROXY=$(jgetn "$api" proxy)
        return 0
    fi
    D_SRC="查询失败（网络不可达或接口限流）"
}

# 获取指定域名路径的实测出口 IP（优先 CDN 回显，仅 Cloudflare 系可用）
# $1=域名；返回空表示该站点无 IP 回显端点
get_exit_ip() {
    local domain=$1 ip
    ip=$(curl "${CURL_OPT[@]}" "https://$domain/cdn-cgi/trace" 2>/dev/null \
        | grep -E '^ip=' | head -1 | cut -d= -f2)
    if echo "$ip" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
        echo "$ip"
    fi
}

# 连接探测：$1=url；结果写入全局 P_CODE(HTTP状态码) / P_REMOTE(对端服务器IP)
P_CODE="" P_REMOTE=""
probe_url() {
    local out
    out=$(curl "${CURL_OPT[@]}" -o /dev/null -w "%{http_code}|%{remote_ip}" -L "$1" 2>/dev/null)
    P_CODE="${out%%|*}"
    P_REMOTE="${out##*|}"
    [ -z "$P_CODE" ] && P_CODE="000"   # 000 = 连接失败/超时
}

# 综合 IP 类型判定（基于 D_* 数据）
ip_type_label() {
    if [ "$D_RES" = "true" ] && [ "$D_DC" != "true" ]; then
        echo "原生家宽 (Residential)"
    elif [ "$D_DC" = "true" ]; then
        echo "机房 (Datacenter)"
    elif [ "$D_MOB" = "true" ]; then
        echo "移动网络 (Mobile)"
    elif [ -n "$D_CTYPE" ]; then
        echo "归属类型: ${D_CTYPE}"
    else
        echo "未知"
    fi
}

# 信任分 → 风险等级文案
trust_grade() {
    local t=$1
    if [ -z "$t" ]; then echo "未知"
    elif [ "$t" -lt 30 ]; then echo "低风险"
    elif [ "$t" -lt 60 ]; then echo "中风险"
    else echo "高风险"
    fi
}

# ============================ 模块一：IP 基础与风控 =========================
# $1=目标IP（空=本机出口）
check_basics() {
    local target=$1 exit_ip ping0txt p_ip p_loc p_asn p_org
    print_header "① IP 基础信息"

    if [ -z "$target" ]; then
        # ---- 本机模式：多源交叉验证出口 IP ----
        # 数据源 A：api.ipify.org（纯文本 IP）
        exit_ip=$(curl "${CURL_OPT[@]}" "https://api.ipify.org" 2>/dev/null)
        # 数据源 B：ping0.cc/geo（本机 IP 4 行文本：IP/位置/ASN/商家）
        ping0txt=$(curl "${CURL_OPT[@]}" "https://ping0.cc/geo" 2>/dev/null)
        p_ip=$(echo "$ping0txt" | sed -n '1p')
        p_loc=$(echo "$ping0txt" | sed -n '2p')
        p_asn=$(echo "$ping0txt" | sed -n '3p')
        p_org=$(echo "$ping0txt" | sed -n '4p')
        [ -z "$exit_ip" ] && exit_ip="$p_ip"

        print_kv "出口 IP" "$exit_ip" "$BOLD"
        print_indent "来源: api.ipify.org"
        if [ -n "$p_ip" ] && [ "$p_ip" != "$exit_ip" ]; then
            print_indent "${YELLOW}⚠ ping0.cc 观测到不同出口: ${p_ip}${NC}"
            print_indent "${YELLOW}  可能处于多出口/分流/代理链环境${NC}"
        elif [ -n "$p_ip" ]; then
            print_indent "ping0.cc 交叉验证: 出口一致 ✓"
        fi
        # 展示 ping0 深度文本（位置/ASN/商家）
        if [ -n "$p_loc" ]; then
            print_indent "ping0.cc 定位: $p_loc"
            [ -n "$p_asn" ] && print_indent "ping0.cc ASN : $p_asn"
            [ -n "$p_org" ] && print_indent "ping0.cc 商家: $p_org"
        fi
        # 深度查询出口 IP
        lookup_ip "$exit_ip"
    else
        # ---- 指定 IP 模式 ----
        exit_ip=$target
        lookup_ip "$exit_ip"
        print_indent "${DIM}说明: ping0.cc 免费接口仅支持本机出口查询，目标 IP 深度数据由 ip.net.coffee 提供${NC}"
    fi

    print_rule
    print_kv "IP 地址" "$exit_ip" "$BOLD"
    print_kv "地理位置" "$D_COUNTRY ${D_REGION:+$D_REGION }${D_CITY}" "$NC"
    print_kv "运营商 ISP" "$D_ISP"
    print_kv "ASN" "$D_ASN${D_ASORG:+ / $D_ASORG}" "$BLUE"
    print_kv "归属企业" "$D_ORG"
    if [ -n "$D_RDNS" ]; then
        print_kv "反向 DNS" "$D_RDNS" "$DIM"
    fi
    print_kv "IP 类型" "$(ip_type_label)" \
        "$( [ "$D_DC" = "true" ] && echo "$YELLOW" || echo "$GREEN" )"
    print_kv "数据来源" "$D_SRC" "$DIM"

    # ---- 风控信息（模块一内嵌） ----
    print_header "② 风控检测 (ip.net.coffee + ping0.cc)"
    print_rule
    if [ -n "$D_TRUST" ]; then
        local grade tcolor
        grade=$(trust_grade "$D_TRUST")
        if [ "$D_TRUST" -lt 30 ]; then tcolor=$GREEN
        elif [ "$D_TRUST" -lt 60 ]; then tcolor=$YELLOW
        else tcolor=$RED; fi
        print_kv "信任评分" "${D_TRUST}/100 ($grade)" "$tcolor"
        print_indent "ip.net.coffee trust_score（分数越低风险越高，等效欺诈分反向指标）"
    fi
    if [ -n "$D_ABUSERSCORE" ]; then
        print_kv "滥用评分" "$D_ABUSERSCORE" "$NC"
    fi
    if [ -n "$D_AI" ]; then
        print_kv "AI 综合判定" "${D_AI}${D_AI_CONF:+ (置信度 ${D_AI_CONF}%)}" \
            "$( [ "$D_AI" = "Clean" ] || [ "$D_AI" = "Trustworthy" ] && echo "$GREEN" || echo "$YELLOW" )"
    fi

    # 代理/VPN/Tor 标记（ip.net.coffee），拼接避免前导空格
    local flags=""
    [ "$D_VPN" = "true" ] && flags="${flags:+$flags }VPN"
    [ "$D_PROXY" = "true" ] && flags="${flags:+$flags }Proxy"
    [ "$D_TOR" = "true" ] && flags="${flags:+$flags }Tor"
    [ "$D_ABUSER" = "true" ] && flags="${flags:+$flags }Abuser"
    [ "$D_CRAWLER" = "true" ] && flags="${flags:+$flags }Crawler"
    if [ -n "$flags" ]; then
        print_kv "风险标记" "$flags" "$RED"
        print_indent "ip.net.coffee 判定该 IP 存在以上风险特征"
    elif [ -n "$D_SRC" ]; then
        print_kv "风险标记" "无 (Clean)" "$GREEN"
        print_indent "ip.net.coffee 未发现 VPN/代理/Tor/滥用特征"
    fi

    # 威胁标签列表（ip.net.coffee intelligence.threats）
    if [ -n "$D_THREATS" ]; then
        local tcount
        tcount=$(echo "$D_THREATS" | grep -c . )
        print_kv "威胁记录" "存在 ${tcount} 条" "$YELLOW"
        echo "$D_THREATS" | while IFS= read -r t; do
            [ -n "$t" ] && print_indent "${YELLOW}• $t${NC}"
        done
    fi

    # ping0.cc 数据（本机模式：作为第二数据源佐证）
    if [ -z "$target" ] && [ -n "$p_loc" ]; then
        print_kv "ping0 定位" "$p_loc" "$DIM"
        [ -n "$p_asn" ] && print_kv "ping0 ASN" "$p_asn" "$DIM"
        [ -n "$p_org" ] && print_kv "ping0 商家" "$p_org" "$DIM"
    fi
}

# ============================ 模块二：流媒体解锁 ============================
# 每项服务：名称|类型|探测URL（解锁判定 + 出口 IP/ASN/企业）
check_streaming() {
    print_header "③ 流媒体解锁检测（含实测出口 IP/ASN/企业）"
    local services=(
        "Netflix|netflix|https://www.netflix.com/title/81215567"
        "Disney+|disney|https://www.disneyplus.com"
        "TikTok|tiktok|https://www.tiktok.com"
        "ChatGPT|chatgpt|https://chatgpt.com"
    )
    local name type url code remote exit_ip body
    for item in "${services[@]}"; do
        name="${item%%|*}"; rest="${item#*|}"
        type="${rest%%|*}"; url="${rest#*|}"
        echo -e "\n${BOLD}${BLUE}● ${name}${NC}"

        # 1) 连接测试：HTTP 状态码 + 对端服务器 IP
        probe_url "$url"
        code=$P_CODE
        remote=$P_REMOTE

        # 2) 解锁判定（状态码 + 页面关键词启发式）
        local verdict vcolor
        verdict="未知"; vcolor=$YELLOW
        case "$type" in
            netflix)
                # Netflix 对不可用地区渲染 data-uia="locally-unavailable"
                body=$(curl "${CURL_OPT[@]}" "$url" 2>/dev/null)
                if [ "$code" = "403" ]; then
                    verdict="封锁 (HTTP 403)"; vcolor=$RED
                elif echo "$body" | grep -q 'data-uia="locally-unavailable"'; then
                    verdict="地区不可用 (locally-unavailable)"; vcolor=$RED
                elif [ "$code" = "200" ]; then
                    verdict="疑似解锁 (HTTP 200)"; vcolor=$GREEN
                else
                    verdict="异常 (HTTP $code)"; vcolor=$YELLOW
                fi
                ;;
            disney)
                if [ "$code" = "403" ]; then
                    verdict="封锁 (HTTP 403)"; vcolor=$RED
                elif [ "$code" = "200" ]; then
                    verdict="可访问 (HTTP 200)"; vcolor=$GREEN
                else
                    verdict="异常 (HTTP $code)"; vcolor=$YELLOW
                fi
                ;;
            tiktok)
                if [ "$code" = "403" ]; then
                    verdict="封锁 (HTTP 403)"; vcolor=$RED
                elif [ "$code" = "200" ]; then
                    verdict="可访问 (HTTP 200)"; vcolor=$GREEN
                else
                    verdict="异常 (HTTP $code)"; vcolor=$YELLOW
                fi
                ;;
            chatgpt)
                # OpenAI 对不支持地区/机房 IP 直接返回 403
                if [ "$code" = "403" ]; then
                    verdict="不支持 (HTTP 403)"; vcolor=$RED
                elif [ "$code" = "200" ]; then
                    verdict="疑似可用 (HTTP 200)"; vcolor=$GREEN
                else
                    verdict="异常 (HTTP $code)"; vcolor=$YELLOW
                fi
                ;;
        esac
        echo -e "    ${CYAN}解锁状态${NC}   : ${vcolor}${verdict}${NC}"

        # 3) 实测出口 IP：优先 CDN 回显（CF trace），否则通用出口
        local domain
        domain=$(echo "$url" | sed -E 's#https?://([^/]+).*#\1#')
        exit_ip=$(get_exit_ip "$domain")
        local exit_src="cdn-cgi/trace (该域名实测)"
        if [ -z "$exit_ip" ]; then
            exit_ip=$(curl "${CURL_OPT[@]}" "https://api.ipify.org" 2>/dev/null)
            exit_src="api.ipify.org (通用出口)"
        fi
        echo -e "    ${CYAN}出口 IP${NC}     : ${BOLD}${YELLOW}${exit_ip}${NC}  ${DIM}($exit_src)${NC}"

        # 4) 出口 IP 的 ASN 与归属企业
        lookup_ip "$exit_ip"
        echo -e "    ${CYAN}ASN${NC}         : ${BLUE}${D_ASN}${NC}${D_ASORG:+ / ${D_ASORG}}"
        echo -e "    ${CYAN}归属企业${NC}   : ${D_ORG:-未知}"
        echo -e "    ${CYAN}对端服务器${NC} : ${remote:-未知}  ${DIM}(本测试连接到的服务端)${NC}"
    done
    echo -e "\n${DIM}注: 解锁判定为状态码+页面关键词启发式结果，仅供快速参考。${NC}"
}

# ============================ 模块三：分流出口实测 ==========================
check_routing() {
    print_header "④ 分流出口实测 (连接测试 + CDN 回显)"
    local routes=(
        "Meta (Facebook)|www.facebook.com"
        "Meta (Instagram)|www.instagram.com"
        "TikTok|www.tiktok.com"
        "PayPal|www.paypal.com"
        "Google|www.google.com"
        "Claude (AI)|claude.ai"
        "Gemini (AI)|gemini.google.com"
        "Antigravity (AI)|antigravity.ai"
        "Codex (AI)|codex.openai.com"
        "OpenAI (AI)|chatgpt.com"
        "Perplexity (AI)|www.perplexity.ai"
    )
    local name domain code remote exit_ip exit_src
    for item in "${routes[@]}"; do
        name="${item%%|*}"; domain="${item##*|}"
        echo -e "\n${BOLD}${BLUE}● ${name}${NC}  ${DIM}($domain)${NC}"

        # 1) 连接测试：HTTP 状态码 + 对端服务器 IP（验证分流可达性）
        probe_url "https://$domain/"
        code=$P_CODE; remote=$P_REMOTE
        local ccolor=$GREEN
        [ "$code" = "403" ] && ccolor=$YELLOW
        [ "$code" = "000" ] && ccolor=$RED
        echo -e "    ${CYAN}连接状态${NC}   : ${ccolor}HTTP ${code}${NC}  对端服务器 ${remote:-未知}"

        # 2) 实测出口 IP：CDN 回显优先，否则通用出口
        exit_ip=$(get_exit_ip "$domain")
        exit_src="cdn-cgi/trace (该域名实测)"
        if [ -z "$exit_ip" ]; then
            exit_ip=$(curl "${CURL_OPT[@]}" "https://api.ipify.org" 2>/dev/null)
            exit_src="api.ipify.org (通用出口)"
        fi
        echo -e "    ${CYAN}出口 IP${NC}     : ${BOLD}${YELLOW}${exit_ip}${NC}  ${DIM}($exit_src)${NC}"

        # 3) 出口 IP 的 ASN 与归属企业
        lookup_ip "$exit_ip"
        echo -e "    ${CYAN}ASN${NC}         : ${BLUE}${D_ASN}${NC}${D_ASORG:+ / ${D_ASORG}}"
        echo -e "    ${CYAN}归属企业${NC}   : ${D_ORG:-未知}"
    done
    echo -e "\n${DIM}注: 若各站点出口 IP 一致，说明当前为统一出口；若不同，说明存在按域分流。${NC}"
}

# ============================ 模块四：泄露检测 ==============================
check_leaks() {
    local main_ip
    main_ip=$(curl "${CURL_OPT[@]}" "https://api.ipify.org" 2>/dev/null)

    # ---------- 4.1 DNS 泄露（5 次随机子域名探测） ----------
    print_header "⑤ DNS 泄露检测（5 次随机子域名探测）"
    print_rule
    echo -e "  ${BOLD}${CYAN}主出口 IP${NC}   : ${BOLD}${YELLOW}${main_ip:-未知}${NC}"
    echo -e "  ${DIM}探测原理: 每次请求 edns.ip-api.com，其 302 分配随机子域名，"
    echo -e "  DNS 解析该随机子域所经过的 DNS 服务器出口会返回在 dns.ip 中。${NC}"
    local i rand res dns_ip dns_geo
    for i in 1 2 3 4 5; do
        # 每次请求都会 302 到新的随机子域名（服务端生成），绕过缓存强制真实查询
        res=$(curl "${CURL_OPT[@]}" -sL "http://edns.ip-api.com/json" 2>/dev/null)
        dns_ip=$(echo "$res" | grep -oE '"ip"[[:space:]]*:[[:space:]]*"[0-9.]+"' | head -1 | sed -E 's/^[^:]*:[[:space:]]*"//; s/"$//')
        dns_geo=$(echo "$res" | grep -oE '"geo"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed -E 's/^[^:]*:[[:space:]]*"//; s/"$//')
        local dcolor=$GREEN
        if [ -n "$dns_ip" ] && [ -n "$main_ip" ] && [ "$dns_ip" != "$main_ip" ]; then
            dcolor=$YELLOW
        fi
        printf "  探针 %d : DNS 出口 ${dcolor}%-15s${NC} (%s)\n" "$i" "${dns_ip:-失败}" "${dns_geo:-无}"
    done
    echo -e "  ${DIM}若 DNS 出口与主出口不一致，说明 DNS 请求走了其他路径（存在泄露风险）。${NC}"

    # ---------- 4.2 WebRTC 泄露（STUN 协议） ----------
    print_header "⑥ WebRTC 泄露检测 (STUN 协议)"
    print_rule

    # 本地内网 IP（WebRTC 可能暴露的本地地址）
    local lip
    lip=$(get_local_ip)
    print_kv "本地内网 IP" "${lip:-未知}" "$YELLOW"
    print_indent "WebRTC 可能向站点暴露上述本地地址（含网关出口）"

    # 工具依赖检查
    if ! command -v nc >/dev/null 2>&1 || ! command -v od >/dev/null 2>&1; then
        print_kv "STUN 测试" "缺少 nc/od 工具，无法执行" "$RED"
        print_indent "macOS: 自带 nc/od；Linux: 安装 netcat-openbsd"
        return
    fi
    if ! command -v perl >/dev/null 2>&1 && ! command -v xxd >/dev/null 2>&1; then
        print_kv "STUN 测试" "缺少 perl/xxd，无法构造请求" "$RED"
        return
    fi

    # STUN Binding Request（20 字节）：type=0x0001 len=0x0000 cookie=0x2112A442 + 12字节事务ID
    local srv host port txid req resp stun_ip stun_port found=""
    for srv in $STUN_SERVERS; do
        host="${srv%%:*}"; port="${srv##*:}"
        txid=$(od -An -N12 -tx1 /dev/urandom | tr -d ' \n')
        req="000100002112a442${txid}"
        # 发送请求并读取响应（nc -u -q：UDP 模式，stdin EOF 后等 2 秒收包）
        resp=$(hex2bin "$req" | nc -u -q 2 "$host" "$port" 2>/dev/null | od -An -tx1 -v | tr -d ' \n')
        [ ${#resp} -lt 40 ] && continue   # 无响应，尝试下一台
        # 解析 XOR-MAPPED-ADDRESS (0x0020)：跳过 20 字节头部，遍历属性
        local body atype alen aval family xport xip a b c d
        body="${resp:40}"
        while [ ${#body} -ge 8 ]; do
            atype="${body:0:4}"; alen=$((16#${body:4:4})); aval="${body:8:$((alen*2))}"
            if [ "$atype" = "0020" ]; then
                family="${aval:2:2}"
                if [ "$family" = "01" ]; then   # IPv4
                    xport=$((16#${aval:4:4})); port=$((xport ^ 0x2112))
                    xip="${aval:8:8}"
                    a=$((16#${xip:0:2} ^ 0x21)); b=$((16#${xip:2:2} ^ 0x12))
                    c=$((16#${xip:4:2} ^ 0xa4)); d=$((16#${xip:6:2} ^ 0x42))
                    stun_ip="$a.$b.$c.$d"
                    stun_port="$port"
                    found=1
                    break
                fi
            fi
            local total=$((8 + alen * 2)) pad=$(( (4 - (alen % 4)) % 4 ))
            body="${body:$((total + pad * 2))}"
        done
        [ -n "$found" ] && break
    done

    if [ -n "$found" ]; then
        print_kv "STUN 网关出口" "${stun_ip}:${stun_port}" "$BOLD"
        print_indent "经 STUN 协议（UDP 路径）获取的真实公网出口"
        if [ -n "$main_ip" ] && [ "$stun_ip" = "$main_ip" ]; then
            print_kv "WebRTC 判定" "无泄露（UDP 出口与 TCP 出口一致）" "$GREEN"
        else
            print_kv "WebRTC 判定" "⚠ 出口不一致（TCP=$main_ip / UDP=$stun_ip）" "$YELLOW"
            print_indent "WebRTC/STUN 走 UDP 路径，若与代理/VPN 的 TCP 出口不同则可能泄露真实 IP"
        fi
    else
        print_kv "STUN 测试" "所有服务器无响应（UDP 出站可能被限制）" "$YELLOW"
        print_indent "已尝试: $STUN_SERVERS"
        if [ -n "$main_ip" ]; then
            print_indent "回退参考: 当前 TCP 出口为 $main_ip"
        fi
    fi
}

# ============================ 功能二：指定 IP 检测 ===========================
check_specific() {
    local ip=$1
    print_header "指定 IP 深度检测: ${BOLD}${ip}${NC}"
    print_rule

    # 深度查询（ip.net.coffee 主 / ip-api 回退）
    lookup_ip "$ip"
    if [ -z "$D_ASN" ] && [ -z "$D_ORG" ]; then
        echo -e "${RED}  无法获取该 IP 的数据（接口限流或网络不可达）${NC}"
        return
    fi

    # ---- 基础与类型 ----
    print_kv "IP 地址" "$ip" "$BOLD"
    print_kv "地理位置" "$D_COUNTRY ${D_REGION:+$D_REGION }${D_CITY}" "$NC"
    print_kv "运营商 ISP" "$D_ISP"
    print_kv "IP 类型" "$(ip_type_label)" \
        "$( [ "$D_DC" = "true" ] && echo "$YELLOW" || echo "$GREEN" )"
    print_kv "归属企业" "$D_ORG"
    print_kv "数据来源" "$D_SRC" "$DIM"

    # ---- 风控 ----
    print_rule
    echo -e "  ${BOLD}${CYAN}风控信息${NC}"
    if [ -n "$D_TRUST" ]; then
        local grade tcolor
        grade=$(trust_grade "$D_TRUST")
        if [ "$D_TRUST" -lt 30 ]; then tcolor=$GREEN
        elif [ "$D_TRUST" -lt 60 ]; then tcolor=$YELLOW
        else tcolor=$RED; fi
        print_kv "信任评分" "${D_TRUST}/100 ($grade)" "$tcolor"
    fi
    if [ -n "$D_ABUSERSCORE" ]; then print_kv "滥用评分" "$D_ABUSERSCORE" "$NC"; fi
    if [ -n "$D_AI" ]; then
        print_kv "AI 判定" "${D_AI}${D_AI_CONF:+ (置信度 ${D_AI_CONF}%)}" "$NC"
    fi
    local flags=""
    [ "$D_VPN" = "true" ] && flags="${flags:+$flags }VPN"
    [ "$D_PROXY" = "true" ] && flags="${flags:+$flags }Proxy"
    [ "$D_TOR" = "true" ] && flags="${flags:+$flags }Tor"
    [ "$D_ABUSER" = "true" ] && flags="${flags:+$flags }Abuser"
    [ "$D_CRAWLER" = "true" ] && flags="${flags:+$flags }Crawler"
    [ "$D_REDDIT" = "true" ] && flags="${flags:+$flags }Reddit-Blocked"
    if [ -n "$flags" ]; then
        print_kv "风险标记" "$flags" "$RED"
    else
        print_kv "风险标记" "无 (Clean)" "$GREEN"
    fi
    if [ -n "$D_THREATS" ]; then
        local tcount
        tcount=$(echo "$D_THREATS" | grep -c . )
        print_kv "威胁记录" "存在 ${tcount} 条" "$YELLOW"
        echo "$D_THREATS" | while IFS= read -r t; do
            [ -n "$t" ] && print_indent "${YELLOW}• $t${NC}"
        done
    fi

    # ---- 流媒体支持评估（基于 IP 属性的启发式） ----
    print_rule
    echo -e "  ${BOLD}${CYAN}流媒体支持评估${NC}（基于 IP 属性启发式，非实测）"
    local eval_txt ecolor
    if [ "$D_RES" = "true" ] && [ "$D_DC" != "true" ]; then
        eval_txt="原生家宽 IP，Netflix/Disney+ 等主流流媒体解锁概率高"
        ecolor=$GREEN
    elif [ "$D_DC" = "true" ]; then
        eval_txt="机房/数据中心 IP，Netflix 等流媒体大概率不可用（部分支持 CDN 白名单的除外）"
        ecolor=$RED
    elif [ "$D_VPN" = "true" ] || [ "$D_PROXY" = "true" ] || [ "$D_TOR" = "true" ]; then
        eval_txt="代理/VPN 出口，流媒体可能被风控拦截"
        ecolor=$YELLOW
    else
        eval_txt="无法可靠评估，建议实测"
        ecolor=$YELLOW
    fi
    print_kv "评估结论" "$eval_txt" "$ecolor"

    # ---- ASN 详情 ----
    print_rule
    echo -e "  ${BOLD}${CYAN}ASN 详情${NC}"
    print_kv "AS 号码" "$D_ASN" "$BLUE"
    print_kv "AS 组织" "$D_ASORG"
    print_kv "ASN 类型" "$D_ASNKIND"
    print_kv "ASN 分配" "$D_ASNALLOC"
    print_kv "ASN 带宽" "$D_ASNTBPS"
    print_kv "IPv4 数量" "$D_ASNIPV4"
    print_kv "反向 DNS" "$D_RDNS" "$DIM"
    print_kv "企业类型" "$D_CTYPE"

    # ping0 说明
    print_rule
    echo -e "  ${DIM}ping0.cc 免费接口仅支持本机出口查询（curl ping0.cc/geo）；${NC}"
    echo -e "  ${DIM}目标 IP 深度数据已通过 ip.net.coffee (iprisk/geoip) 获取。${NC}"
}

# ============================ 主程序 ========================================
main() {
    echo -e "\n${BOLD}${PURPLE}══════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${PURPLE}   MULTI-CHECK · 增强型 IP 及环境检测${NC}"
    echo -e "${BOLD}${PURPLE}══════════════════════════════════════════════════════════${NC}"

    if ! command -v curl >/dev/null 2>&1; then
        echo -e "${RED}错误: 未找到 curl，请先安装${NC}" >&2
        exit 1
    fi

    local target=$1
    if [ -n "$target" ]; then
        # 功能二：指定 IP 检测
        if ! valid_ipv4 "$target"; then
            echo -e "${RED}错误: 参数不是合法的 IPv4 地址: $target${NC}" >&2
            exit 1
        fi
        echo -e "\n${BOLD}${BLUE}>>> 模式: 指定 IP 检测（$target）<<<${NC}"
        check_specific "$target"
    else
        # 功能一：全面环境检测
        echo -e "\n${BOLD}${BLUE}>>> 模式: 全面环境检测（本机出口）<<<${NC}"
        check_basics ""
        check_streaming
        check_routing
        check_leaks
    fi
    echo -e "\n${BOLD}${GREEN}══════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${GREEN}   所有检测已完成 ✓${NC}"
    echo -e "${BOLD}${GREEN}══════════════════════════════════════════════════════════${NC}\n"
}

main "$@"

#!/usr/bin/env bash
#===============================================================================
# check-ip-all.sh — 全方位 IP 检测脚本 (Comprehensive IP Check)
# 功能: 出口IP多源交叉验证(api.ipify.org/ipinfo.io/ip/api.ip.sb/ipwho.is)
#       | 地理/ASN/ISP/rDNS(ipinfo/ipwho.is/ip-api) | 风控因子(ipapi.is+ip-api)
#       | IP类型(原生/家宽/机房/移动,含依据) | 风控评分0-100(低<20/中20-60/高60-85/极高>85)
#       | 流媒体/AI解锁(状态码,浏览器UA,8s): YT/Netflix/ChatGPT/Claude/Gemini/TikTok/Disney+/Perplexity
#       | 延迟(time_connect: 1.1.1.1/223.5.5.5) | rDNS(ipinfo hostname)
#       | 输出: 中文彩色(非TTY纯文本) / -j JSON / -E 英文 / -4/-6 / -f 完整IP / -o 文件 / -n / -p 隐私
#       | 纯 bash 4+, 自包含不下载外部文件, jq 可选(无 jq 用 grep/sed 解析)
# 用法: $0 [-x PROXY] [-j] [-E] [-4|-6] [-f] [-o FILE] [-n] [-p] [IP]
# 示例: $0 | $0 1.2.3.4 | $0 -x socks5://127.0.0.1:1080 -j | $0 -E -f -o r.txt | $0 -p
#===============================================================================

#--- bash 4+ 检查 ---------------------------------------------------------------
if [[ -z ${BASH_VERSION:-} ]]; then
    printf '%s\n' "Error: this script must be run with bash (bash >= 4 required)" >&2; exit 1
fi
if [[ ${BASH_VERSINFO[0]:-0} -lt 4 ]]; then
    printf '%s\n' "Error: bash >= 4 required, current: ${BASH_VERSION}" >&2; exit 1
fi

#--- 全局配置 -------------------------------------------------------------------
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
TMO=6; TMO_UNLOCK=8   # 常规/解锁 超时(秒)

#--- 输出模式开关 ---------------------------------------------------------------
EN=0; JSON=0; FULL=0; PRIV=0; NODEP=0
PROXY=""; TARGET_IP=""; OUTFILE=""; IPFLAG=""
IPV4ONLY=0; IPV6ONLY=0

#--- 颜色(仅 TTY 且非 JSON 且未指定 -o 时启用) ------------------------------------
C_RESET=$'\033[0m'; C_RED=$'\033[31m'; C_GREEN=$'\033[32m'
C_YELLOW=$'\033[33m'; C_CYAN=$'\033[36m'; C_BOLD=$'\033[1m'
USE_COLOR=0

#--- 检测结果全局变量 --------------------------------------------------------------
IP="" IP_FAM="" IP_SOURCE=""
IP_IPIFY="" IP_IPINFO="" IP_IPSB="" IP_IPWHOIS=""
GEO_CC="" GEO_COUNTRY="" GEO_REGION="" GEO_CITY="" GEO_LAT="" GEO_LON=""
GEO_ORG="" GEO_ISP="" GEO_ASN="" RDNS=""
RISK_OK=0 R2OK=0
R_IS_DC="" R_IS_PROXY="" R_IS_VPN="" R_IS_TOR="" R_IS_CRAWLER=""
R_IS_ABUSER="" R_IS_MOBILE="" R_IS_BOGON="" R_ABUSER_SCORE="" R_ABUSER_SCORE_RAW=""
R2_PROXY="" R2_HOSTING="" R2_MOBILE=""
RISK_SCORE="" RISK_LEVEL=""
IP_TYPE="" IP_TYPE_BASIS=""
UNL_NAMES=() UNL_CODES=() UNL_STATUS=()
LAT_CF="" LAT_ALI=""
ERRORS=()

#--- 基础工具 -------------------------------------------------------------------
out() { local line="$1"; if [[ -n $OUTFILE ]]; then printf '%s\n' "$line" >> "$OUTFILE"; fi; printf '%s\n' "$line"; }
L() { if [[ $EN -eq 1 ]]; then printf '%s' "$1"; else printf '%s' "$2"; fi; }  # 中英文: L "EN" "中文"
cecho() { local color="$1"; shift; if [[ $USE_COLOR -eq 1 ]]; then out "${color}${*}${C_RESET}"; else out "$*"; fi; }
err()  { printf '%s\n' "$(L 'Error' '错误'): $*" >&2; }
warn() { printf '%s\n' "$(L 'Warning' '警告'): $*" >&2; }

#--- 请求工具: 所有 curl 强制 --max-time, 失败静默返回空, 绝不阻塞 -------------------
req() {  # $1=url, $2=可选额外 header -> 响应体(stdout); 失败输出空
    local url="$1" hdr="${2:-}"
    curl -sS --max-time "$TMO" ${PROXY:+--proxy "$PROXY"} --user-agent "$UA" \
        ${hdr:+-H "$hdr"} $IPFLAG "$url" 2>/dev/null
}
http_code() {  # $1=url -> 状态码或 000
    local url="$1"
    curl -sS -o /dev/null -w '%{http_code}' --max-time "$TMO_UNLOCK" \
        ${PROXY:+--proxy "$PROXY"} --user-agent "$UA" $IPFLAG "$url" 2>/dev/null
}
t_connect() {  # $1=url -> time_connect 秒数或空
    local url="$1"
    curl -sS -o /dev/null -w '%{time_connect}' --max-time "$TMO" \
        --user-agent "$UA" $IPFLAG "$url" 2>/dev/null
}

#--- JSON 解析: 有 jq 用 jq, 否则 grep/sed ------------------------------------------
HAVE_JQ=0; command -v jq >/dev/null 2>&1 && HAVE_JQ=1
json_escape() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }
jget() {  # jget "json" "key" s|n|b  (s=字符串 n=数字 b=布尔)
    local j="$1" k="$2" t="${3:-s}"
    if [[ $HAVE_JQ -eq 1 ]]; then
        if [[ $t == b ]]; then
            # 布尔: 精确匹配 true/false (不能用 // null, 那会把 false 也当空)
            printf '%s' "$j" | jq -r --arg k "$k" \
                'if (.[$k] == true or .[$k] == false) then (.[$k]|tostring) else empty end' 2>/dev/null
        else
            printf '%s' "$j" | jq -r --arg k "$k" \
                'if ((.[$k] // null) != null) then (.[$k]|tostring) else empty end' 2>/dev/null
        fi
    else
        case $t in
            s) printf '%s' "$j" | sed -n "s/.*\"$k\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" | head -n1 ;;
            n) printf '%s' "$j" | sed -n "s/.*\"$k\"[[:space:]]*:[[:space:]]*\(-\?[0-9][0-9.]*\).*/\1/p" | head -n1 ;;
            b) printf '%s' "$j" | sed -n "s/.*\"$k\"[[:space:]]*:[[:space:]]*\(true\|false\).*/\1/p" | head -n1 ;;
        esac
    fi
}

#--- IP 地址工具 -------------------------------------------------------------------
is_ipv4() {
    local ip="$1" o1="" o2="" o3="" o4="" rest=""
    IFS=. read -r o1 o2 o3 o4 rest <<< "$ip"
    [[ -n $o1 && -n $o2 && -n $o3 && -n $o4 && -z $rest ]] || return 1
    [[ $o1 =~ ^[0-9]+$ && $o2 =~ ^[0-9]+$ && $o3 =~ ^[0-9]+$ && $o4 =~ ^[0-9]+$ ]] || return 1
    (( 10#$o1 <= 255 && 10#$o2 <= 255 && 10#$o3 <= 255 && 10#$o4 <= 255 )) || return 1
    return 0
}
is_ipv6() { [[ $1 == *:* ]] || return 1; [[ $1 =~ ^[0-9a-fA-F:]+$ ]] || return 1; return 0; }
family_of() { if is_ipv4 "$1"; then printf '4'; elif is_ipv6 "$1"; then printf '6'; else printf '0'; fi; }
pick() {  # 第一个非空变量值
    local v
    for v in "$@"; do if [[ -n ${!v:-} ]]; then printf '%s' "${!v}"; return 0; fi; done
    return 1
}

#--- 步骤 1: 出口 IP 多源交叉验证 -----------------------------------------------------
detect_exit_ip() {
    local fam val c4=0 c6=0 ip4="" ip6="" n_ok=0 entry
    if [[ -n $TARGET_IP ]]; then
        IP="$TARGET_IP"; IP_FAM=$(family_of "$IP")
        if [[ $IP_FAM == 0 ]]; then err "$(L 'Invalid IP argument' '无效的 IP 参数'): $IP"; exit 1; fi
        if [[ $IPV4ONLY -eq 1 && $IP_FAM != 4 ]] || [[ $IPV6ONLY -eq 1 && $IP_FAM != 6 ]]; then
            warn "$(L 'Specified IP family conflicts with -4/-6, using the specified IP anyway.' '指定 IP 与 -4/-6 家族不符，仍以指定 IP 为准。')"
        fi
        IP_SOURCE="$(L 'user-specified' '用户指定')"
        return 0
    fi
    IP_IPIFY=$(req "https://api.ipify.org" | tr -d '[:space:]')
    IP_IPINFO=$(req "https://ipinfo.io/ip" | tr -d '[:space:]')
    local j_ipsb j_ipwho
    j_ipsb=$(req "https://api.ip.sb/geoip")
    j_ipwho=$(req "https://ipwho.is/")
    IP_IPSB=$(jget "$j_ipsb" ip s)
    IP_IPWHOIS=$(jget "$j_ipwho" ip s)
    # 统计每个来源 IP 的出现次数（真正多数票），而不是最后一个写入者
    local -A cnt4 cnt6
    local v4order=() v6order=()
    for entry in "ipify:${IP_IPIFY}" "ipinfo:${IP_IPINFO}" "ipsb:${IP_IPSB}" "ipwhois:${IP_IPWHOIS}"; do
        val="${entry#*:}"; fam=$(family_of "$val")
        [[ $fam == 0 ]] && continue
        n_ok=$((n_ok + 1))
        if [[ $fam == 4 ]]; then
            c4=$((c4 + 1))
            if [[ -z ${cnt4[$val]:-} ]]; then cnt4[$val]=0; v4order+=("$val"); fi
            cnt4[$val]=$((cnt4[$val] + 1))
        elif [[ $fam == 6 ]]; then
            c6=$((c6 + 1))
            if [[ -z ${cnt6[$val]:-} ]]; then cnt6[$val]=0; v6order+=("$val"); fi
            cnt6[$val]=$((cnt6[$val] + 1))
        fi
    done
    if [[ $n_ok -eq 0 ]]; then
        err "$(L 'All IP sources failed (network blocked?).' '所有出口 IP 来源均失败(网络被阻断?)。')"; exit 1
    fi
    if [[ $IPV6ONLY -eq 1 && $c6 -eq 0 ]]; then
        err "$(L 'No IPv6 connectivity detected (-6 requested).' '未检测到 IPv6 连接(请求了 -6)。')"; exit 1
    fi
    if [[ $IPV4ONLY -eq 1 && $c4 -eq 0 ]]; then
        err "$(L 'No IPv4 connectivity detected (-4 requested).' '未检测到 IPv4 连接(请求了 -4)。')"; exit 1
    fi
    # 选择: -6 优先 IPv6, -4 优先 IPv4, 否则取出现次数最多的（平局按来源顺序取先出现者）
    if [[ $IPV6ONLY -eq 1 ]]; then
        IP="${v6order[0]}"; local best=0
        for v in "${v6order[@]}"; do [[ ${cnt6[$v]} -gt $best ]] && { best=${cnt6[$v]}; IP="$v"; }; done
    elif [[ $IPV4ONLY -eq 1 ]]; then
        IP="${v4order[0]}"; local best4=0
        for v in "${v4order[@]}"; do [[ ${cnt4[$v]} -gt $best4 ]] && { best4=${cnt4[$v]}; IP="$v"; }; done
    elif [[ $c6 -gt $c4 ]]; then
        IP="${v6order[0]}"; local best6=0
        for v in "${v6order[@]}"; do [[ ${cnt6[$v]} -gt $best6 ]] && { best6=${cnt6[$v]}; IP="$v"; }; done
    else
        IP="${v4order[0]}"; local best4a=0
        for v in "${v4order[@]}"; do [[ ${cnt4[$v]} -gt $best4a ]] && { best4a=${cnt4[$v]}; IP="$v"; }; done
    fi
    IP_FAM=$(family_of "$IP")
    if [[ $n_ok -eq 1 ]]; then IP_SOURCE="$(L 'single source (others failed)' '单源(其余失败)' )"
    elif [[ $c4 -gt 1 && $c6 -gt 1 ]]; then IP_SOURCE="$(L 'mixed IPv4/IPv6' '多源(IPv4/IPv6 混合)')"
    else IP_SOURCE="$(L 'multi-source consistent' '多源一致')"; fi
}

#--- 步骤 2: 地理 / ASN / ISP ---------------------------------------------------------
geo_info() {
    local j_info j_who loc
    j_info=$(req "https://ipinfo.io/${IP}/json")
    j_who=$(req "https://ipwho.is/${IP}")
    local cc_info cc_who region_info region_who city_info city_who
    cc_info=$(jget "$j_info" country s);       cc_who=$(jget "$j_who" country_code s)
    region_info=$(jget "$j_info" region s);    region_who=$(jget "$j_who" region s)
    city_info=$(jget "$j_info" city s);        city_who=$(jget "$j_who" city s)
    GEO_CC=$(pick cc_info cc_who)
    GEO_COUNTRY=$(jget "$j_who" country s); [[ -z $GEO_COUNTRY ]] && GEO_COUNTRY="$GEO_CC"
    GEO_REGION=$(pick region_who region_info)
    GEO_CITY=$(pick city_who city_info)
    GEO_LAT=$(jget "$j_who" latitude n); GEO_LON=$(jget "$j_who" longitude n)
    if [[ -z $GEO_LAT && -n $j_info ]]; then  # ipinfo "loc":"lat,lon"
        loc=$(jget "$j_info" loc s)
        [[ -n $loc ]] && { GEO_LAT="${loc%%,*}"; GEO_LON="${loc#*,}"; }
    fi
    GEO_ORG=$(jget "$j_info" org s); [[ -z $GEO_ORG ]] && GEO_ORG=$(jget "$j_who" org s)
    [[ -n $GEO_ORG ]] && GEO_ASN=$(printf '%s' "$GEO_ORG" | grep -oE 'AS[0-9]+' | head -n1)
    # ISP: ipwho.is connection.isp 子对象优先, 其次 ipinfo org
    GEO_ISP=$(printf '%s' "$j_who" | jq -r '.connection.isp // empty' 2>/dev/null)
    [[ -z $GEO_ISP ]] && GEO_ISP="$GEO_ORG"
    RDNS=$(jget "$j_info" hostname s)  # rDNS: ipinfo hostname 优先
}

#--- 步骤 3: 风控因子 (ipapi.is + ip-api.com) --------------------------------------------
risk_info() {
    [[ $PRIV -eq 1 ]] && return 0
    local j_ris j_api st
    j_ris=$(req "https://api.ipapi.is/?q=${IP}" "origin: https://ipapi.is")
    if [[ -n $j_ris ]]; then
        RISK_OK=1
        R_IS_DC=$(jget "$j_ris" is_datacenter b);     R_IS_PROXY=$(jget "$j_ris" is_proxy b)
        R_IS_VPN=$(jget "$j_ris" is_vpn b);           R_IS_TOR=$(jget "$j_ris" is_tor b)
        R_IS_CRAWLER=$(jget "$j_ris" is_crawler b);   R_IS_ABUSER=$(jget "$j_ris" is_abuser b)
        R_IS_MOBILE=$(jget "$j_ris" is_mobile b);     R_IS_BOGON=$(jget "$j_ris" is_bogon b)
        # abuser_score 在 company 子对象, 形如 "0.0001 (Very Low)"; 取前导数值并换算成 0-100
        R_ABUSER_SCORE_RAW=$(printf '%s' "$j_ris" | jq -r '.company.abuser_score // empty' 2>/dev/null)
        if [[ -n $R_ABUSER_SCORE_RAW ]]; then
            local abuser_val
            abuser_val=$(printf '%s' "$R_ABUSER_SCORE_RAW" | grep -oE '^[0-9]+(\.[0-9]+)?' | head -n1)
            if [[ -n $abuser_val ]]; then
                # 0-1 概率值 → 0-100 分数
                R_ABUSER_SCORE=$(awk -v v="$abuser_val" 'BEGIN { s=v*100; if (s<0) s=0; if (s>100) s=100; printf "%d", s }')
            fi
        fi
    else
        ERRORS+=("ipapi.is $(L 'request failed' '请求失败')")
    fi
    j_api=$(req "https://ip-api.com/json/${IP}?fields=status,country,countryCode,regionName,city,isp,org,as,asname,reverse,proxy,hosting,mobile,query")
    if [[ -n $j_api ]]; then
        st=$(jget "$j_api" status s)
        if [[ $st == success ]]; then
            R2OK=1
            R2_PROXY=$(jget "$j_api" proxy b); R2_HOSTING=$(jget "$j_api" hosting b); R2_MOBILE=$(jget "$j_api" mobile b)
            # 回填地理/ISP/rDNS (ipinfo 缺失时)
            [[ -z $GEO_ISP ]] && GEO_ISP=$(jget "$j_api" isp s)
            [[ -z $GEO_ORG ]] && GEO_ORG=$(jget "$j_api" org s)
            [[ -z $GEO_ASN ]] && GEO_ASN=$(jget "$j_api" as s)
            [[ -z $RDNS ]] && RDNS=$(jget "$j_api" reverse s)
        else
            ERRORS+=("ip-api.com: $(jget "$j_api" message s)")
        fi
    else
        ERRORS+=("ip-api.com $(L 'request failed' '请求失败')")
    fi
}

#--- 步骤 4: 风控评分 0-100 ---------------------------------------------------------------
risk_score() {
    local s=0
    if [[ $PRIV -eq 1 ]]; then RISK_SCORE=""; RISK_LEVEL="skipped"; return 0; fi
    if [[ $RISK_OK -eq 0 && $R2OK -eq 0 ]]; then RISK_SCORE=""; RISK_LEVEL="unknown"; return 0; fi
    if [[ -n $R_ABUSER_SCORE && $R_ABUSER_SCORE =~ ^[0-9]+$ ]]; then s=$R_ABUSER_SCORE; fi
    [[ $R_IS_PROXY == true ]] && s=$((s + 12))
    [[ $R_IS_VPN == true ]] && s=$((s + 12))
    [[ $R_IS_TOR == true ]] && s=$((s + 25))
    [[ $R_IS_DC == true ]] && s=$((s + 10))
    [[ $R_IS_CRAWLER == true ]] && s=$((s + 8))
    [[ $R_IS_ABUSER == true ]] && s=$((s + 10))
    [[ $R_IS_BOGON == true ]] && s=$((s + 25))
    [[ $R2_PROXY == true ]] && s=$((s + 8))
    [[ $R2_HOSTING == true ]] && s=$((s + 8))
    (( s > 100 )) && s=100
    RISK_SCORE=$s
    if (( s < 20 )); then RISK_LEVEL="low"
    elif (( s <= 60 )); then RISK_LEVEL="medium"
    elif (( s <= 85 )); then RISK_LEVEL="high"
    else RISK_LEVEL="extreme"; fi
}

#--- 步骤 5: IP 类型分类 (原生/家宽/机房/移动) ----------------------------------------------
classify_ip() {
    local org_lo isp_lo base=""
    org_lo=$(printf '%s' "$GEO_ORG" | tr 'A-Z' 'a-z')
    isp_lo=$(printf '%s' "$GEO_ISP" | tr 'A-Z' 'a-z')
    if [[ $R_IS_MOBILE == true || $R2_MOBILE == true ]]; then
        IP_TYPE="mobile"; base="$(L 'is_mobile/is_mobile flag set' '命中移动网络标志 is_mobile/is_mobile')"
    elif [[ $isp_lo == *mobile* || $isp_lo == *cellular* || $isp_lo == *wireless* \
         || $isp_lo == *lte* || $isp_lo == *"3g"* || $isp_lo == *"4g"* || $isp_lo == *"5g"* ]]; then
        IP_TYPE="mobile"; base="$(L 'ISP name contains mobile keywords' 'ISP 名称含移动网络关键词'): $GEO_ISP"
    elif [[ $R_IS_DC == true || $R2_HOSTING == true ]]; then
        IP_TYPE="datacenter"; base="$(L 'is_datacenter/hosting flag set' '命中机房标志 is_datacenter/hosting')"
    elif [[ $org_lo == *hosting* || $org_lo == *datacenter* || $org_lo == *"data center"* \
         || $org_lo == *cloud* || $org_lo == *idc* || $org_lo == *server* \
         || $org_lo == *amazon* || $org_lo == *"google cloud"* || $org_lo == *microsoft* \
         || $org_lo == *azure* || $org_lo == *digitalocean* || $org_lo == *vultr* \
         || $org_lo == *linode* || $org_lo == *hetzner* || $org_lo == *ovh* \
         || $org_lo == *oracle* || $org_lo == *alibaba* || $org_lo == *tencent* \
         || $org_lo == *it7* || $org_lo == *bandwagon* || $org_lo == *16clouds* \
         || $org_lo == *bwg* || $org_lo == *incapsula* || $org_lo == *hostinger* \
         || $org_lo == *contabo* || $org_lo == *ionos* || $org_lo == *namecheap* \
         || $org_lo == *bluehost* || $org_lo == *godaddy* || $org_lo == *a2hosting* \
         || $org_lo == *hostgator* || $org_lo == *interserver* ]]; then
        IP_TYPE="datacenter"; base="$(L 'ORG name contains datacenter keywords' 'ORG 名称含机房关键词'): $GEO_ORG"
    elif [[ $isp_lo == *broadband* || $isp_lo == *fiber* || $isp_lo == *fibre* \
         || $isp_lo == *cable* || $isp_lo == *dsl* || $isp_lo == *adsl* \
         || $isp_lo == *residential* || $isp_lo == *home* \
         || $isp_lo == *"china telecom"* || $isp_lo == *"china unicom"* \
         || $isp_lo == *att* || $isp_lo == *comcast* || $isp_lo == *verizon* \
         || $isp_lo == *spectrum* || $isp_lo == *cox* || $isp_lo == *charter* \
         || $isp_lo == *centurylink* || $isp_lo == *frontier* || $isp_lo == *"time warner"* \
         || $isp_lo == *optimum* || $isp_lo == *windstream* || $isp_lo == *etisalat* \
         || $isp_lo == *stc* || $isp_lo == *"china mobile"* || $isp_lo == *"bt broadband"* \
         || $isp_lo == *sky* || $isp_lo == *virgin* || $isp_lo == *kpn* \
         || $isp_lo == *telekom* || $isp_lo == *telecom* || $isp_lo == *fios* \
         || $isp_lo == *sbcglobal* || $isp_lo == *lightspeed* \
         || $GEO_ASN == AS7018* || $GEO_ASN == AS7922* || $GEO_ASN == AS20001* \
         || $GEO_ASN == AS4134* || $GEO_ASN == AS4837* || $GEO_ASN == AS9808* \
         || $GEO_ASN == AS3320* || $GEO_ASN == AS6830* ]]; then
        IP_TYPE="residential"; base="$(L 'ISP/ASN name contains home-broadband keywords' 'ISP/ASN 名称含家宽关键词'): $GEO_ISP / $GEO_ASN"
    else
        IP_TYPE="native"; base="$(L 'No datacenter/home/mobile features; ASN is not a datacenter' '未命中机房/家宽/移动特征，ASN 非数据中心')"
    fi
    [[ $R_IS_PROXY == true || $R2_PROXY == true ]] && base+="; $(L 'proxy flag hit (type may be distorted)' '命中代理标记(类型可能失真)')"
    [[ $R_IS_TOR == true ]] && base+="; TOR $(L 'exit node' '出口节点')"
    [[ $R_IS_BOGON == true ]] && base+="; $(L 'bogon/reserved address' 'bogon/保留地址')"
    IP_TYPE_BASIS="$base"
}

#--- 步骤 6: 流媒体 / AI 解锁检测 ------------------------------------------------------------
unlock_status() {  # $1=code -> 机器状态
    case $1 in
        200|204) printf 'unlocked' ;;
        301|302|303|307|308) printf 'redirect' ;;
        401|403|429|451) printf 'restricted' ;;
        000) printf 'unreachable' ;;
        *) printf 'unknown' ;;
    esac
}
status_label() {  # $1=机器状态 -> 显示文本
    if [[ $EN -eq 1 ]]; then
        case $1 in
            unlocked) printf 'Unlocked' ;; redirect) printf 'Accessible (redirect)' ;;
            restricted) printf 'Restricted / Risk-controlled' ;; unreachable) printf 'Unreachable' ;;
            unknown) printf 'Unknown' ;;
        esac
    else
        case $1 in
            unlocked) printf '解锁' ;; redirect) printf '可访问(重定向)' ;;
            restricted) printf '受限/风控' ;; unreachable) printf '无法连接' ;;
            unknown) printf '未知' ;;
        esac
    fi
}
unlock_checks() {
    [[ $PRIV -eq 1 ]] && return 0
    local sites=(
        "youtube|YouTube|https://www.youtube.com/generate_204"
        "netflix|Netflix|https://www.netflix.com"
        "chatgpt|ChatGPT|https://chatgpt.com"
        "claude|Claude|https://claude.ai"
        "gemini|Gemini|https://gemini.google.com"
        "tiktok|TikTok|https://www.tiktok.com"
        "disneyplus|Disney+|https://www.disneyplus.com"
        "perplexity|Perplexity|https://www.perplexity.ai"
    )
    local entry disp url code st
    for entry in "${sites[@]}"; do
        disp="${entry#*|}"
        url="${disp#*|}"; disp="${disp%%|*}"
        code=$(http_code "$url"); st=$(unlock_status "$code")
        UNL_NAMES+=("$disp"); UNL_CODES+=("$code"); UNL_STATUS+=("$st")
    done
}

#--- 步骤 7: 延迟测试 (time_connect) -----------------------------------------------------------
latency_checks() {
    local t
    t=$(t_connect "https://1.1.1.1")
    if [[ -n $t && $t =~ ^[0-9.]+$ ]]; then LAT_CF=$(awk -v x="$t" 'BEGIN{printf "%d", x*1000}'); fi
    t=$(t_connect "https://223.5.5.5"); [[ -z $t ]] && t=$(t_connect "http://223.5.5.5")
    if [[ -n $t && $t =~ ^[0-9.]+$ ]]; then LAT_ALI=$(awk -v x="$t" 'BEGIN{printf "%d", x*1000}'); fi
}

#--- 显示辅助 ---------------------------------------------------------------------------------
type_label() {  # $1=机器类型
    if [[ $EN -eq 1 ]]; then
        case $1 in
            native) printf 'Native IP' ;; residential) printf 'Residential (Home Broadband)' ;;
            datacenter) printf 'Datacenter / IDC' ;; mobile) printf 'Mobile Network' ;;
        esac
    else
        case $1 in
            native) printf '原生IP' ;; residential) printf '家宽IP' ;;
            datacenter) printf '机房IP' ;; mobile) printf '移动网络' ;;
        esac
    fi
}
level_label() {  # $1=机器级别
    if [[ $EN -eq 1 ]]; then
        case $1 in
            low) printf 'Low Risk (<20)' ;; medium) printf 'Medium Risk (20-60)' ;;
            high) printf 'High Risk (60-85)' ;; extreme) printf 'Extreme Risk (>85)' ;;
            skipped) printf 'Skipped (privacy mode)' ;; unknown) printf 'Unknown' ;;
        esac
    else
        case $1 in
            low) printf '低风险(<20)' ;; medium) printf '中风险(20-60)' ;;
            high) printf '高风险(60-85)' ;; extreme) printf '极高风险(>85)' ;;
            skipped) printf '已跳过(隐私模式)' ;; unknown) printf '未知' ;;
        esac
    fi
}
sec() {  # 小节标题
    local num="$1" title="$2"
    if [[ $USE_COLOR -eq 1 ]]; then out "${C_BOLD}${C_CYAN}${num} ${title}${C_RESET}"
    else out "${num} ${title}"; fi
}
row() {  # 键值行, $3 颜色变量内容(可空)
    local label="$1" value="$2" color="${3:-}" line
    printf -v line '  %-20s: %s' "$label" "$value"
    if [[ -n $color && $USE_COLOR -eq 1 ]]; then out "${color}${line}${C_RESET}"; else out "$line"; fi
}
flag_row() {  # 风险因子行: $1=显示名 $2=ipapi值 $3=ip-api值
    local name="$1" v1="$2" v2="$3" src="" hit=0
    [[ $v1 == true ]] && { hit=1; src="ipapi.is"; }
    [[ $v2 == true ]] && { hit=1; src="${src:+$src,}ip-api"; }
    if [[ $hit -eq 1 ]]; then row "$name" "✓ $(L 'hit' '命中') ($src)" "$C_RED"
    elif [[ -z $v1 && -z $v2 ]]; then row "$name" "— $(L 'no data' '无数据')"
    else row "$name" "✗ $(L 'not hit' '未命中')" ""; fi
}

#--- 文本渲染 -----------------------------------------------------------------------------------
render_text() {
    local n=1 i
    local c_good="$C_GREEN" c_warn="$C_YELLOW" c_bad="$C_RED" c_info="$C_CYAN"
    sec "[0$n]" "$(L 'Exit IP (multi-source)' '出口 IP 检测(多源交叉验证)')"; n=$((n + 1))
    row "$(L 'api.ipify.org' 'api.ipify.org')" "${IP_IPIFY:-$(L 'failed' '失败')}"
    row "$(L 'ipinfo.io/ip' 'ipinfo.io/ip')" "${IP_IPINFO:-$(L 'failed' '失败')}"
    row "$(L 'api.ip.sb/geoip' 'api.ip.sb/geoip')" "${IP_IPSB:-$(L 'failed' '失败')}"
    row "$(L 'ipwho.is' 'ipwho.is')" "${IP_IPWHOIS:-$(L 'failed' '失败')}"
    row "$(L 'Confirmed IP' '确认出口 IP')" "$IP" "$c_info"
    row "$(L 'Family' '地址族')" "IPv${IP_FAM}"; row "$(L 'Source' '来源')" "$IP_SOURCE"
    if [[ $FULL -eq 1 ]]; then
        sec "[0$n]" "$(L 'Full IP Details' '完整 IP 明细(-f)')"; n=$((n + 1))
        row "api.ipify.org" "${IP_IPIFY:-$(L 'failed' '失败')}"
        row "ipinfo.io/ip" "${IP_IPINFO:-$(L 'failed' '失败')}"
        row "api.ip.sb/geoip" "${IP_IPSB:-$(L 'failed' '失败')}"
        row "ipwho.is" "${IP_IPWHOIS:-$(L 'failed' '失败')}"
    fi
    sec "[0$n]" "$(L 'Geo / ASN / ISP' '地理位置 / ASN / ISP')"; n=$((n + 1))
    row "$(L 'Country' '国家/地区')" "${GEO_COUNTRY:-$(L 'failed' '失败')}${GEO_CC:+ ($GEO_CC)}"
    row "$(L 'Region' '地区')" "${GEO_REGION:-$(L 'failed' '失败')}"
    row "$(L 'City' '城市')" "${GEO_CITY:-$(L 'failed' '失败')}"
    row "$(L 'Coordinates' '坐标')" "${GEO_LAT:+$GEO_LAT, }${GEO_LON:-$(L 'failed' '失败')}"
    row "$(L 'Organization' '组织/ORG')" "${GEO_ORG:-$(L 'failed' '失败')}"
    row "$(L 'ISP' 'ISP')" "${GEO_ISP:-$(L 'failed' '失败')}"
    row "$(L 'ASN' 'ASN')" "${GEO_ASN:-$(L 'failed' '失败')}"
    row "$(L 'rDNS (reverse DNS)' 'rDNS(反向解析)')" "${RDNS:-$(L 'not available' '无')}"
    sec "[0$n]" "$(L 'IP Type Classification' 'IP 类型分类')"; n=$((n + 1))
    if [[ -n $IP_TYPE ]]; then
        row "$(L 'Type' '类型')" "$(type_label "$IP_TYPE")" "$c_info"
        row "$(L 'Basis' '依据')" "$IP_TYPE_BASIS"
    else
        row "$(L 'Type' '类型')" "$(L 'unavailable' '无法判定')"
    fi
    sec "[0$n]" "$(L 'Risk Score' '风控评分(0-100)')"; n=$((n + 1))
    if [[ $RISK_LEVEL == skipped ]]; then
        row "$(L 'Score' '分数')" "$(level_label skipped)"
    elif [[ $RISK_LEVEL == unknown ]]; then
        row "$(L 'Score' '分数')" "$(L 'unavailable (risk APIs failed)' '无法获取(风险 API 均失败)')"
    else
        local scolor=""
        case $RISK_LEVEL in low) scolor="$c_good" ;; medium) scolor="$c_warn" ;;
            high) scolor="$c_bad" ;; extreme) scolor="$C_BOLD${C_RED}" ;; esac
        row "$(L 'Score' '分数')" "${RISK_SCORE}/100 — $(level_label "$RISK_LEVEL")" "$scolor"
    fi
    [[ -n $R_ABUSER_SCORE ]] && row "$(L 'abuser_score (ipapi.is)' 'abuser_score(ipapi.is)')" "${R_ABUSER_SCORE}/100"
    sec "[0$n]" "$(L 'Risk Factors' '风险因子(来源: ipapi.is / ip-api.com)')"; n=$((n + 1))
    if [[ $RISK_OK -eq 0 && $R2OK -eq 0 ]]; then
        if [[ $PRIV -eq 1 ]]; then row "$(L 'Factors' '因子')" "$(L 'skipped (privacy mode)' '已跳过(隐私模式)')"
        else row "$(L 'Factors' '因子')" "$(L 'unavailable (APIs failed)' '无法获取(API 失败)')"; fi
    else
        flag_row "$(L 'Proxy' '代理 Proxy')" "$R_IS_PROXY" "$R2_PROXY"
        flag_row "$(L 'VPN' 'VPN')" "$R_IS_VPN" ""
        flag_row "$(L 'TOR' 'TOR')" "$R_IS_TOR" ""
        flag_row "$(L 'Datacenter' '数据中心 Datacenter')" "$R_IS_DC" "$R2_HOSTING"
        flag_row "$(L 'Abuser' 'Abuser 滥用')" "$R_IS_ABUSER" ""
        flag_row "$(L 'Mobile' '移动网络 Mobile')" "$R_IS_MOBILE" "$R2_MOBILE"
        flag_row "$(L 'Bogon' 'Bogon 保留地址')" "$R_IS_BOGON" ""
        flag_row "$(L 'Crawler' '爬虫 Crawler')" "$R_IS_CRAWLER" ""
    fi
    sec "[0$n]" "$(L 'Streaming / AI Unlock' '流媒体 / AI 解锁检测(状态码)')"; n=$((n + 1))
    if [[ $PRIV -eq 1 ]]; then
        row "$(L 'Unlock' '解锁')" "$(L 'skipped (privacy mode)' '已跳过(隐私模式)')"
    elif [[ ${#UNL_NAMES[@]} -eq 0 ]]; then
        row "$(L 'Unlock' '解锁')" "$(L 'failed' '失败')"
    else
        local disp ucolor
        for i in "${!UNL_NAMES[@]}"; do
            disp=$(status_label "${UNL_STATUS[$i]}"); ucolor=""
            case ${UNL_STATUS[$i]} in
                unlocked) ucolor="$c_good" ;; redirect) ucolor="$c_info" ;;
                restricted) ucolor="$c_bad" ;; unreachable) ucolor="$c_warn" ;;
            esac
            row "${UNL_NAMES[$i]}" "${UNL_CODES[$i]} ($disp)" "$ucolor"
        done
    fi
    sec "[0$n]" "$(L 'Latency (TCP connect)' '延迟测试(time_connect)')"; n=$((n + 1))
    if [[ -n $LAT_CF ]]; then row "Cloudflare 1.1.1.1" "${LAT_CF} ms"; else row "Cloudflare 1.1.1.1" "$(L 'failed' '失败')"; fi
    if [[ -n $LAT_ALI ]]; then row "AliDNS 223.5.5.5" "${LAT_ALI} ms"; else row "AliDNS 223.5.5.5" "$(L 'failed' '失败')"; fi
    if [[ ${#ERRORS[@]} -gt 0 ]]; then
        sec "[0$n]" "$(L 'Warnings' '提示')"; n=$((n + 1))
        local e
        for e in "${ERRORS[@]}"; do row "$(L 'Note' '注意')" "$e"; done
    fi
    out ""
    cecho "$C_BOLD" "========== $(L 'SUMMARY' '总结') =========="
    row "$(L 'Exit IP' '出口 IP')" "$IP"
    row "$(L 'IP Type' 'IP 类型')" "$(type_label "$IP_TYPE")"
    if [[ $RISK_LEVEL != unknown && $RISK_LEVEL != skipped ]]; then
        row "$(L 'Risk Score' '风控评分')" "${RISK_SCORE}/100 ($(level_label "$RISK_LEVEL"))"
    elif [[ $RISK_LEVEL == skipped ]]; then
        row "$(L 'Risk Score' '风控评分')" "$(level_label skipped)"
    fi
    row "$(L 'Generated at' '检测时间')" "$(date '+%F %T')"
}

#--- JSON 渲染 -----------------------------------------------------------------------------------
jval() { if [[ -z $1 ]]; then printf 'null'; else printf '"%s"' "$(json_escape "$1")"; fi; }
jnum() { if [[ -z $1 ]]; then printf 'null'; else printf '%s' "$1"; fi; }
jstr() { printf '"%s":%s' "$1" "$(jval "$2")"; }
jflag() {  # 布尔标志: true/false/空
    local k="$1" v="$2"
    case $v in true) printf '"%s":true' "$k" ;; false) printf '"%s":false' "$k" ;; *) printf '"%s":null' "$k" ;; esac
}
render_json() {
    local i fac="" ul="" lat="" errs="" jsrc="" j
    fac+="$(jflag proxy "$R_IS_PROXY"),$(jflag vpn "$R_IS_VPN"),$(jflag tor "$R_IS_TOR"),"
    fac+="$(jflag datacenter "$R_IS_DC"),$(jflag abuser "$R_IS_ABUSER"),"
    fac+="$(jflag mobile "$R_IS_MOBILE"),$(jflag bogon "$R_IS_BOGON"),$(jflag crawler "$R_IS_CRAWLER"),"
    fac+="$(jflag ip_api_proxy "$R2_PROXY"),$(jflag ip_api_hosting "$R2_HOSTING"),$(jflag ip_api_mobile "$R2_MOBILE")"
    for i in "${!UNL_NAMES[@]}"; do
        [[ -n $ul ]] && ul+=","
        ul+="\"${UNL_NAMES[$i]}\":{\"code\":${UNL_CODES[$i]},\"status\":$(jval "${UNL_STATUS[$i]}")}"
    done
    if [[ -n $LAT_CF ]]; then lat+="\"cloudflare_1.1.1.1\":{\"connect_ms\":$LAT_CF}"
    else lat+="\"cloudflare_1.1.1.1\":null"; fi
    if [[ -n $LAT_ALI ]]; then lat+=",\"alidns_223.5.5.5\":{\"connect_ms\":$LAT_ALI}"
    else lat+=",\"alidns_223.5.5.5\":null"; fi
    for i in "${!ERRORS[@]}"; do
        [[ -n $errs ]] && errs+=","
        errs+="$(jval "${ERRORS[$i]}")"
    done
    jsrc+="$(jstr ipify "$IP_IPIFY"),$(jstr ipinfo "$IP_IPINFO"),$(jstr ipsb "$IP_IPSB"),$(jstr ipwhois "$IP_IPWHOIS")"
    j="{"
    j+="\"generated_at\":$(jval "$(date '+%F %T')"),\"privacy_mode\":$([[ $PRIV -eq 1 ]] && printf true || printf false),"
    j+="\"target_ip\":$(jval "$IP"),\"ip_family\":\"IPv${IP_FAM}\",\"ip_source\":$(jval "$IP_SOURCE"),"
    j+="\"ip_sources\":{${jsrc}},"
    j+="\"geo\":{$(jstr country_code "$GEO_CC"),$(jstr country "$GEO_COUNTRY"),$(jstr region "$GEO_REGION"),"
    j+="$(jstr city "$GEO_CITY"),$(jstr lat "$GEO_LAT"),$(jstr lon "$GEO_LON"),"
    j+="$(jstr org "$GEO_ORG"),$(jstr isp "$GEO_ISP"),$(jstr asn "$GEO_ASN")},"
    j+="\"rdns\":$(jval "$RDNS"),"
    j+="\"ip_type\":{\"type\":$(jval "$IP_TYPE"),\"label\":$(jval "$(type_label "$IP_TYPE")"),\"basis\":$(jval "$IP_TYPE_BASIS")},"
    j+="\"risk\":{\"available\":$([[ $RISK_OK -eq 1 || $R2OK -eq 1 ]] && printf true || printf false),"
    j+="\"score\":$(jval "$RISK_SCORE"),\"level\":$(jval "$RISK_LEVEL"),\"abuser_score\":$(jval "$R_ABUSER_SCORE"),"
    j+="\"factors\":{${fac}},"
    j+="\"sources\":{\"ipapi_is\":$([[ $RISK_OK -eq 1 ]] && printf true || printf false),\"ip_api_com\":$([[ $R2OK -eq 1 ]] && printf true || printf false)}},"
    j+="\"unlock\":{${ul}},\"latency\":{${lat}},\"errors\":[${errs}]"
    j+="}"
    out "$j"
}

#--- 参数解析 -----------------------------------------------------------------------------------
usage() {
    cat <<EOF
$(L 'Usage' '用法'): $0 [$(L 'options' '选项')] [IP]

$(L 'Options' '选项'):
  -x PROXY   $(L 'use proxy for all requests' '所有请求走代理') (e.g. socks5://127.0.0.1:1080)
  -j         $(L 'JSON output' 'JSON 格式输出')
  -E         $(L 'English output' '英文输出')
  -4         $(L 'force IPv4' '强制 IPv4')      -6  $(L 'force IPv6' '强制 IPv6')
  -f         $(L 'print full per-source IP details' '输出完整 IP 来源明细')
  -o FILE    $(L 'also write output to file (plain text)' '同时输出到文件(纯文本)')
  -n         $(L 'skip dependency check' '跳过依赖检查')
  -p         $(L 'privacy mode: skip risk/unlock checks' '隐私模式: 跳过风险/解锁检测')
  -h         $(L 'show this help' '显示帮助')

$(L 'Examples' '示例'):
  $0            $0 1.2.3.4
  $0 -x socks5://127.0.0.1:1080 -j
  $0 -E -f -o result.txt
EOF
}
parse_args() {
    local opt
    while getopts 'x:jE46fo:nph' opt; do
        case $opt in
            x) PROXY="$OPTARG" ;;
            j) JSON=1 ;;
            E) EN=1 ;;
            4) IPV4ONLY=1; IPV6ONLY=0; IPFLAG="-4" ;;
            6) IPV6ONLY=1; IPV4ONLY=0; IPFLAG="-6" ;;
            f) FULL=1 ;;
            o) OUTFILE="$OPTARG" ;;
            n) NODEP=1 ;;
            p) PRIV=1 ;;
            h) usage; exit 0 ;;
            *) usage >&2; exit 1 ;;
        esac
    done
    shift $((OPTIND - 1))
    [[ $# -gt 0 ]] && TARGET_IP="$1"
    if [[ $IPV4ONLY -eq 1 && $IPV6ONLY -eq 1 ]]; then
        err "$(L '-4 and -6 cannot be used together' '-4 与 -6 不能同时使用')"; exit 1
    fi
    if [[ -n $OUTFILE ]] && ! : > "$OUTFILE" 2>/dev/null; then
        err "$(L 'Cannot write output file' '无法写入输出文件'): $OUTFILE"; exit 1
    fi
}

#--- 依赖检查 -----------------------------------------------------------------------------------
dep_check() {
    [[ $NODEP -eq 1 ]] && return 0
    local cmd missing=0
    for cmd in curl sed grep awk tr head cut date; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            printf '%s\n' "$(L 'Missing dependency' '缺少依赖'): $cmd" >&2
            missing=1
        fi
    done
    if [[ $missing -eq 1 ]]; then
        printf '%s\n' "$(L 'Install the missing tools or use -n to skip.' '请安装缺失工具，或使用 -n 跳过依赖检查。')" >&2
        exit 1
    fi
}

#--- 主流程 -------------------------------------------------------------------------------------
main() {
    parse_args "$@"
    dep_check
    if [[ -t 1 && $JSON -eq 0 && -z $OUTFILE ]]; then USE_COLOR=1; fi
    detect_exit_ip
    geo_info
    risk_info
    risk_score
    classify_ip
    unlock_checks
    latency_checks
    if [[ $JSON -eq 1 ]]; then render_json; else render_text; fi
}

main "$@"

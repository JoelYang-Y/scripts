export interface NavCard {
  name: string;
  url: string;
  icon: string;
  desc: string;
  category: string;
  statusDot?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface SearchEngine {
  id: string;
  name: string;
  icon: string;
  iconColor: string;
  url: string;
}

export const SITE_CONFIG = {
  title: "Joel's Life",
  badge: "Hub",
  domain: "jhsweetheart.com",
  defaultTheme: "nebula",
  clocks: [
    { label: "北京时间", flag: "🇨🇳", timezone: "Asia/Shanghai" },
    { label: "洛杉矶 (LA)", flag: "🇺🇸", timezone: "America/Los_Angeles" }
  ],
  categories: [
    { id: "all", name: "全部", icon: "layout-grid" },
    { id: "ai", name: "AI 智汇", icon: "sparkles" },
    { id: "homelab", name: "内网中枢", icon: "server" },
    { id: "cloud", name: "核心云端", icon: "cloud" },
    { id: "mail", name: "通信邮箱", icon: "mail" },
    { id: "media", name: "影音 PT", icon: "film" },
    { id: "monitor", name: "监控探针", icon: "activity" },
    { id: "tools", name: "实用工具", icon: "wrench" }
  ],
  searchEngines: [
    { id: "google", name: "Google", icon: "G", iconColor: "text-blue-400", url: "https://www.google.com/search?q=" },
    { id: "bing", name: "Bing", icon: "B", iconColor: "text-teal-400", url: "https://www.bing.com/search?q=" },
    { id: "baidu", name: "百度", icon: "度", iconColor: "text-red-400", url: "https://www.baidu.com/s?wd=" },
    { id: "github", name: "GitHub", icon: "Git", iconColor: "text-purple-400", url: "https://github.com/search?q=" },
    { id: "bilibili", name: "B站", icon: "B", iconColor: "text-pink-400", url: "https://search.bilibili.com/all?keyword=" },
    { id: "youtube", name: "YouTube", icon: "YT", iconColor: "text-red-500", url: "https://www.youtube.com/results?search_query=" }
  ],
  cards: [
    // 1. AI 智汇 (ai)
    {
      name: "ChatGPT",
      url: "https://chatgpt.com/",
      icon: "/icons/chatgpt.svg",
      desc: "OpenAI 对话旗舰与 GPT-4o",
      category: "ai"
    },
    {
      name: "Google Gemini",
      url: "https://gemini.google.com/",
      icon: "/icons/gemini.svg",
      desc: "Google 旗舰多模态大模型",
      category: "ai"
    },
    {
      name: "Claude",
      url: "https://claude.ai/",
      icon: "/icons/claude.svg",
      desc: "Anthropic 深度推理与代码专家",
      category: "ai"
    },
    {
      name: "Grok",
      url: "https://grok.com/",
      icon: "/icons/grok.svg",
      desc: "xAI 实时搜索与极客大模型",
      category: "ai"
    },
    {
      name: "DeepSeek Harness",
      url: "https://dsh.jhsweetheart.com",
      icon: "/icons/deepseek.png",
      desc: "本地 AI 编程与任务派发中枢",
      category: "ai",
      statusDot: true
    },
    {
      name: "Dify AI",
      url: "https://dify.jhsweetheart.com",
      icon: "/icons/dify.svg",
      desc: "私有化 LLM 编排与知识库中枢",
      category: "ai",
      statusDot: true
    },

    // 2. 内网中枢 (homelab)
    {
      name: "ASUS 路由器",
      url: "http://10.0.0.1",
      icon: "/icons/asus.png",
      desc: "BE88U 家庭主路由后台",
      category: "homelab"
    },
    {
      name: "Surge Web",
      url: "http://10.0.0.2:6171",
      icon: "/icons/surge.png",
      desc: "Mac 网关与分流控制",
      category: "homelab"
    },
    {
      name: "PVE 物理宿主机",
      url: "https://pve.jhsweetheart.com",
      icon: "/icons/proxmox.png",
      desc: "底层虚拟化集群中枢",
      category: "homelab"
    },
    {
      name: "AdGuard Home",
      url: "https://adg.jhsweetheart.com",
      icon: "/icons/adguard-home.png",
      desc: "全网广告拦截与安全DNS",
      category: "homelab"
    },
    {
      name: "Homelable",
      url: "https://topo.jhsweetheart.com",
      icon: "/icons/homelable.svg",
      desc: "家庭网络拓扑可视化",
      category: "homelab"
    },
    {
      name: "Syncthing",
      url: "https://sync.jhsweetheart.com",
      icon: "/icons/syncthing.png",
      desc: "Obsidian 跨端双向同步",
      category: "homelab"
    },
    {
      name: "Vaultwarden",
      url: "https://oracle.jhsweetheart.com",
      icon: "/icons/bitwarden.png",
      desc: "私有全端同步密码保险库",
      category: "homelab"
    },

    // 3. 核心云端 (cloud)
    {
      name: "Google Cloud",
      url: "https://cloud.google.com/",
      icon: "/icons/google-cloud.svg",
      desc: "GCP 控制台与 Vertex AI 资源",
      category: "cloud"
    },
    {
      name: "Oracle Cloud",
      url: "https://cloud.oracle.com/?region=us-phoenix-1",
      icon: "/icons/oracle-cloud.png",
      desc: "美西凤凰城 OCI 官方控制台",
      category: "cloud"
    },
    {
      name: "搬瓦工后台",
      url: "https://bandwagonhost.com/services",
      icon: "/icons/bandwagonhost.png",
      desc: "VPS 实例与服务控制中心",
      category: "cloud"
    },
    {
      name: "VirCS 控制台",
      url: "https://www.vircs.com/",
      icon: "/icons/vircs.svg",
      desc: "纯正美国家宽",
      category: "cloud"
    },
    {
      name: "甲骨文 s-ui",
      url: "https://oracle.jhsweetheart.com:18848/jhsweet/",
      icon: "/icons/oracle.png",
      desc: "Oracle 核心节点网关管理",
      category: "cloud"
    },
    {
      name: "搬瓦工 s-ui",
      url: "https://joel.jhsweetheart.com:18848/jhsweet/",
      icon: "/icons/bandwagonhost.png",
      desc: "Bandwagon 核心主力节点",
      category: "cloud"
    },
    {
      name: "搬瓦工 1Panel",
      url: "https://joel.jhsweetheart.com/Joel",
      icon: "/icons/1panel.svg",
      desc: "Linux 运维与 Docker 控制台",
      category: "cloud"
    },
    {
      name: "IPRoyal 代理",
      url: "https://dashboard.iproyal.com/me/products/residential-proxies/",
      icon: "/icons/iproyal.svg",
      desc: "全球纯净住宅代理与流量控制台",
      category: "cloud"
    },

    // 4. 通信邮箱 (mail)
    {
      name: "Gmail",
      url: "https://mail.google.com/",
      icon: "/icons/gmail.svg",
      desc: "Google 官方安全邮件服务",
      category: "mail"
    },
    {
      name: "Outlook",
      url: "https://outlook.live.com/",
      icon: "/icons/outlook.svg",
      desc: "微软个人与企业邮箱门户",
      category: "mail"
    },
    {
      name: "QQ 邮箱",
      url: "https://mail.qq.com/",
      icon: "/icons/qqmail.svg",
      desc: "腾讯官方核心邮件服务",
      category: "mail"
    },
    {
      name: "Tello Mobile",
      url: "https://tello.com/account/login?return_to=%2Faccount%2Fhome",
      icon: "/icons/tello.svg",
      desc: "美国手机卡账户与套餐管理",
      category: "mail"
    },
    {
      name: "T-Mobile",
      url: "https://prepaid.t-mobile.com/",
      icon: "/icons/tmobile.svg",
      desc: "美国预付费卡账户与套餐管理",
      category: "mail"
    },
    {
      name: "Anytime Mailbox",
      url: "https://signup.anytimemailbox.com/login",
      icon: "/icons/anytimemailbox.png",
      desc: "美国私人真实地址与信箱管理",
      category: "mail"
    },

    // 5. 影音 PT (media)
    {
      name: "MoviePilot",
      url: "https://movie.jhsweetheart.com",
      icon: "/icons/movie-pilot.png",
      desc: "全自动影音整理中枢",
      category: "media"
    },
    {
      name: "Emby 媒体库",
      url: "https://emby.jhsweetheart.com",
      icon: "/icons/emby.png",
      desc: "个人家庭流媒体影院",
      category: "media"
    },
    {
      name: "qBittorrent",
      url: "https://qb.jhsweetheart.com",
      icon: "/icons/qbittorrent.png",
      desc: "PT/BT 极速下载中枢",
      category: "media"
    },
    {
      name: "M-Team 馒头",
      url: "https://ob.m-team.cc/index",
      icon: "/icons/mteam.svg",
      desc: "顶级高清 PT 资源共享站点",
      category: "media"
    },
    {
      name: "xHamster",
      url: "https://zh.xhamster.com/",
      icon: "/icons/xhamster.png",
      desc: "在线影视与流媒体娱乐",
      category: "media"
    },

    // 6. 监控探针 (monitor)
    {
      name: "Uptime Kuma",
      url: "https://kuma.jhsweetheart.com",
      icon: "/icons/uptime-kuma.png",
      desc: "全系统服务可用性监控",
      category: "monitor",
      statusDot: true
    },
    {
      name: "Beszel Hub",
      url: "https://beszel.jhsweetheart.com",
      icon: "/icons/beszel.png",
      desc: "轻量级全主机探针大屏",
      category: "monitor",
      statusDot: true
    },
    {
      name: "Gatus 公网探针",
      url: "https://gatus.jhsweetheart.com",
      icon: "/icons/gatus.svg",
      desc: "甲骨文 2 号外部独立健康监控",
      category: "monitor",
      statusDot: true
    },

    // 7. 实用工具 (tools)
    {
      name: "n8n 自动化",
      url: "https://n8n.jhsweetheart.com",
      icon: "/icons/n8n.png",
      desc: "私有化工作流与 Webhook 自动化",
      category: "tools",
      statusDot: true
    },
    {
      name: "Headscale",
      url: "https://hs.jhsweetheart.com",
      icon: "/icons/tailscale.svg",
      desc: "私有 Tailscale 控制端与 DERP 中继",
      category: "tools"
    },
    {
      name: "GitHub 脚本库",
      url: "https://github.com/JoelYang-Y/scripts",
      icon: "/icons/github.svg",
      desc: "JoelYang-Y/scripts 私有运维中枢",
      category: "tools"
    },
    {
      name: "Sub-Store",
      url: "https://sub.jhsweetheart.com/?api=/T3B9dgzBzdRbBF8Aqx7P",
      icon: "/icons/sub-store.png",
      desc: "高级订阅转换与同步",
      category: "tools"
    },
    {
      name: "ping0.cc",
      url: "https://ping0.cc",
      icon: "/icons/ping0.svg",
      desc: "IP 欺诈度/类型/风险标记",
      category: "tools"
    },
    {
      name: "ip.net.coffee",
      url: "https://ip.net.coffee",
      icon: "/icons/ipcoffee.svg",
      desc: "多源欺诈分与类型综合检测",
      category: "tools"
    },
    {
      name: "WLOC 定位",
      url: "https://wloc-pages.pages.dev/",
      icon: "/icons/wloc.svg",
      desc: "WiFi BSSID / IP 经纬度精确定位",
      category: "tools"
    },
    {
      name: "奶昔 Nexitally",
      url: "https://nexitallysafe.com/",
      icon: "/icons/nexitally.png",
      desc: "顶级大带宽旗舰机场门户",
      category: "tools"
    }
  ]
};

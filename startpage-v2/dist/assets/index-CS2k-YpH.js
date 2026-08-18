(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))s(e);new MutationObserver(e=>{for(const t of e)if(t.type==="childList")for(const o of t.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function a(e){const t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?t.credentials="include":e.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function s(e){if(e.ep)return;e.ep=!0;const t=a(e);fetch(e.href,t)}})();const p={defaultTheme:"nebula",categories:[{id:"all",name:"全部",icon:"layout-grid"},{id:"ai",name:"AI 智汇",icon:"sparkles"},{id:"homelab",name:"内网中枢",icon:"server"},{id:"cloud",name:"核心云端",icon:"cloud"},{id:"mail",name:"通信邮箱",icon:"mail"},{id:"media",name:"影音 PT",icon:"film"},{id:"monitor",name:"监控探针",icon:"activity"},{id:"tools",name:"实用工具",icon:"wrench"}],cards:[{name:"ChatGPT",url:"https://chatgpt.com/",icon:"/icons/chatgpt.svg",desc:"OpenAI 对话旗舰与 GPT-4o",category:"ai"},{name:"Google Gemini",url:"https://gemini.google.com/",icon:"/icons/gemini.svg",desc:"Google 旗舰多模态大模型",category:"ai"},{name:"Claude",url:"https://claude.ai/",icon:"/icons/claude.svg",desc:"Anthropic 深度推理与代码专家",category:"ai"},{name:"Grok",url:"https://grok.com/",icon:"/icons/grok.svg",desc:"xAI 实时搜索与极客大模型",category:"ai"},{name:"DeepSeek Harness",url:"http://10.0.0.5:3000",icon:"/icons/deepseek.png",desc:"本地 AI 编程与任务派发中枢",category:"ai",statusDot:!0},{name:"ASUS 路由器",url:"http://10.0.0.1",icon:"/icons/asus.png",desc:"BE88U 家庭主路由后台",category:"homelab"},{name:"Surge Web",url:"http://10.0.0.2:6171",icon:"/icons/surge.png",desc:"Mac 网关与分流控制",category:"homelab"},{name:"PVE 物理宿主机",url:"https://10.0.0.4:8006",icon:"/icons/proxmox.png",desc:"底层虚拟化集群中枢",category:"homelab"},{name:"AdGuard Home",url:"http://10.0.0.6:3000",icon:"/icons/adguard-home.png",desc:"全网广告拦截与安全DNS",category:"homelab"},{name:"Homelable",url:"http://10.0.0.3:3003",icon:"/icons/homelable.svg",desc:"家庭网络拓扑可视化",category:"homelab"},{name:"Syncthing",url:"http://10.0.0.3:8384",icon:"/icons/syncthing.png",desc:"Obsidian 跨端双向同步",category:"homelab"},{name:"Vaultwarden",url:"https://oracle.jhsweetheart.com",icon:"/icons/bitwarden.png",desc:"私有全端同步密码保险库",category:"homelab"},{name:"Google Cloud",url:"https://cloud.google.com/",icon:"/icons/google-cloud.svg",desc:"GCP 控制台与 Vertex AI 资源",category:"cloud"},{name:"Oracle Cloud",url:"https://cloud.oracle.com/?region=us-phoenix-1",icon:"/icons/oracle-cloud.png",desc:"美西凤凰城 OCI 官方控制台",category:"cloud"},{name:"搬瓦工后台",url:"https://bandwagonhost.com/services",icon:"/icons/bandwagonhost.png",desc:"VPS 实例与服务控制中心",category:"cloud"},{name:"VirCS 控制台",url:"https://www.vircs.com/",icon:"/icons/vircs.svg",desc:"纯正美国家宽",category:"cloud"},{name:"甲骨文 s-ui",url:"http://129.146.122.202:18848/jhsweet/",icon:"/icons/oracle.png",desc:"Oracle 核心节点网关管理",category:"cloud"},{name:"搬瓦工 s-ui",url:"https://joel.jhsweetheart.com:18848/jhsweet/",icon:"/icons/bandwagonhost.png",desc:"Bandwagon 核心主力节点",category:"cloud"},{name:"搬瓦工 1Panel",url:"https://joel.jhsweetheart.com/Joel",icon:"/icons/1panel.svg",desc:"Linux 运维与 Docker 控制台",category:"cloud"},{name:"IPRoyal 代理",url:"https://dashboard.iproyal.com/me/products/residential-proxies/",icon:"/icons/iproyal.svg",desc:"全球纯净住宅代理与流量控制台",category:"cloud"},{name:"Gmail",url:"https://mail.google.com/",icon:"/icons/gmail.svg",desc:"Google 官方安全邮件服务",category:"mail"},{name:"Outlook",url:"https://outlook.live.com/",icon:"/icons/outlook.svg",desc:"微软个人与企业邮箱门户",category:"mail"},{name:"QQ 邮箱",url:"https://mail.qq.com/",icon:"/icons/qqmail.svg",desc:"腾讯官方核心邮件服务",category:"mail"},{name:"Tello Mobile",url:"https://tello.com/account/login?return_to=%2Faccount%2Fhome",icon:"/icons/tello.svg",desc:"美国手机卡账户与套餐管理",category:"mail"},{name:"T-Mobile",url:"https://prepaid.t-mobile.com/",icon:"/icons/tmobile.svg",desc:"美国预付费卡账户与套餐管理",category:"mail"},{name:"Anytime Mailbox",url:"https://signup.anytimemailbox.com/login",icon:"/icons/anytimemailbox.png",desc:"美国私人真实地址与信箱管理",category:"mail"},{name:"MoviePilot",url:"http://10.0.0.3:3000",icon:"/icons/movie-pilot.png",desc:"全自动影音整理中枢",category:"media"},{name:"Emby 媒体库",url:"http://10.0.0.3:8096",icon:"/icons/emby.png",desc:"个人家庭流媒体影院",category:"media"},{name:"qBittorrent",url:"http://10.0.0.3:8989",icon:"/icons/qbittorrent.png",desc:"PT/BT 极速下载中枢",category:"media"},{name:"M-Team 馒头",url:"https://ob.m-team.cc/index",icon:"/icons/mteam.svg",desc:"顶级高清 PT 资源共享站点",category:"media"},{name:"xHamster",url:"https://zh.xhamster.com/",icon:"/icons/xhamster.png",desc:"在线影视与流媒体娱乐",category:"media"},{name:"Uptime Kuma",url:"http://10.0.0.3:3005",icon:"/icons/uptime-kuma.png",desc:"全系统服务可用性监控",category:"monitor",statusDot:!0},{name:"Beszel Hub",url:"http://10.0.0.3:8095",icon:"/icons/beszel.png",desc:"轻量级全主机探针大屏",category:"monitor",statusDot:!0},{name:"GitHub 脚本库",url:"https://github.com/JoelYang-Y/scripts",icon:"/icons/github.svg",desc:"JoelYang-Y/scripts 私有运维中枢",category:"tools"},{name:"Sub-Store",url:"http://10.0.0.3:3002/?api=/T3B9dgzBzdRbBF8Aqx7P",icon:"/icons/sub-store.png",desc:"高级订阅转换与同步",category:"tools"},{name:"ping0.cc",url:"https://ping0.cc",icon:"/icons/ping0.svg",desc:"IP 欺诈度/类型/风险标记",category:"tools"},{name:"ip.net.coffee",url:"https://ip.net.coffee",icon:"/icons/ipcoffee.svg",desc:"多源欺诈分与类型综合检测",category:"tools"},{name:"WLOC 定位",url:"https://wloc-pages.pages.dev/",icon:"/icons/wloc.svg",desc:"WiFi BSSID / IP 经纬度精确定位",category:"tools"},{name:"奶昔 Nexitally",url:"https://nexitallysafe.com/",icon:"/icons/nexitally.png",desc:"顶级大带宽旗舰机场门户",category:"tools"}]},g=[{id:"sub-store",name:"Sub-Store 订阅转换中枢",category:"tools",desc:"高级订阅转换、节点过滤、正则重命名与同步后端",port:"3002",host:"10.0.0.3 (NAS)",envDesc:["SUB_STORE_FRONTEND_BACKEND_PATH: API 访问安全前缀 (/T3B9dgzBzdRbBF8Aqx7P)","SUB_STORE_DATA_BASE_PATH: 数据持久化路径"],compose:`version: '3.8'
services:
  sub-store:
    image: xream/sub-store:latest
    container_name: sub-store
    restart: always
    network_mode: host
    environment:
      - SUB_STORE_FRONTEND_BACKEND_PATH=/T3B9dgzBzdRbBF8Aqx7P
      - SUB_STORE_DATA_BASE_PATH=/opt/app/data
    volumes:
      - /Volume1/docker/sub-store:/opt/app/data
`},{id:"homelable",name:"Homelable 拓扑可视化",category:"network",desc:"家庭网络架构、服务依赖与物理节点拓扑大屏",port:"3003",host:"10.0.0.3 (NAS)",envDesc:["PORT: 服务监听端口 (3003)"],compose:`version: '3.8'
services:
  homelable:
    image: ghcr.io/homelable/homelable:latest
    container_name: homelable
    restart: unless-stopped
    ports:
      - "3003:3000"
    volumes:
      - /Volume1/docker/homelable/data:/app/data
`},{id:"beszel-hub",name:"Beszel Hub 全主机探针大屏",category:"monitor",desc:"轻量级全物理机/虚拟机/VPS 资源探针监控中枢",port:"8095",host:"10.0.0.3 (NAS)",envDesc:["PORT: WebUI 面板端口 (8095)","KEY: Agent 通信公钥认证"],compose:`version: '3.8'
services:
  beszel-hub:
    image: henrygd/beszel:latest
    container_name: beszel-hub
    restart: unless-stopped
    ports:
      - "8095:8090"
    volumes:
      - /Volume1/docker/beszel/data:/beszel_data
`},{id:"uptime-kuma",name:"Uptime Kuma 服务监控",category:"monitor",desc:"19+ 核心容器与网络链路可用性秒级状态探测",port:"3005",host:"10.0.0.3 (NAS)",envDesc:["DATA_DIR: SQLite 数据库与监控历史存储路径"],compose:`version: '3.8'
services:
  uptime-kuma:
    image: louislam/uptime-kuma:latest
    container_name: uptime-kuma
    restart: always
    ports:
      - "3005:3001"
    volumes:
      - /Volume1/docker/uptime-kuma:/app/data
`},{id:"emby",name:"Emby Server 家庭影院",category:"media",desc:"个人私有流媒体影院与音视频硬件转码服务器",port:"8096",host:"10.0.0.3 (NAS)",envDesc:["UID/GID: 媒体目录读写权限映射","devices: /dev/dri 硬件转码直通"],compose:`version: '3.8'
services:
  emby:
    image: amilys/embyserver:latest
    container_name: emby
    restart: unless-stopped
    network_mode: host
    environment:
      - UID=0
      - GID=0
      - GIDLIST=0
    volumes:
      - /Volume1/docker/emby/config:/config
      - /Volume1/Media:/media
    devices:
      - /dev/dri:/dev/dri
`},{id:"moviepilot",name:"MoviePilot 自动刮削整理",category:"media",desc:"全自动影视搜索、订阅、下载联动与刮削整理中枢",port:"3000",host:"10.0.0.3 (NAS)",envDesc:["NGINX_PORT: Web 管理端口","AUTH_KEY: API 安全密钥"],compose:`version: '3.8'
services:
  moviepilot:
    image: jxxghp/moviepilot:latest
    container_name: moviepilot
    restart: unless-stopped
    hostname: moviepilot
    ports:
      - "3000:3000"
    volumes:
      - /Volume1/docker/moviepilot/config:/config
      - /Volume1/Media:/media
      - /Volume1/docker/qbittorrent/downloads:/downloads
      - /var/run/docker.sock:/var/run/docker.sock:ro
`},{id:"qbittorrent",name:"qBittorrent 极速下载器",category:"media",desc:"高带宽 PT/BT 资源多线程下载与做种服务",port:"8989",host:"10.0.0.3 (NAS)",envDesc:["WEBUI_PORT: Web 控制台端口","PUID/PGID: 文件所有者权限"],compose:`version: '3.8'
services:
  qbittorrent:
    image: linuxserver/qbittorrent:latest
    container_name: qbittorrent
    restart: unless-stopped
    network_mode: host
    environment:
      - PUID=0
      - PGID=0
      - WEBUI_PORT=8989
    volumes:
      - /Volume1/docker/qbittorrent/config:/config
      - /Volume1/docker/qbittorrent/downloads:/downloads
`},{id:"syncthing",name:"Syncthing 私有全端同步",category:"tools",desc:"Obsidian 笔记知识库与重要配置跨端多点双向加密同步",port:"8384",host:"10.0.0.3 (NAS)",envDesc:["GUI 端口: 8384","同步传输端口: 22000"],compose:`version: '3.8'
services:
  syncthing:
    image: syncthing/syncthing:latest
    container_name: syncthing
    restart: unless-stopped
    network_mode: host
    environment:
      - PUID=0
      - PGID=0
    volumes:
      - /Volume1/docker/syncthing/data:/var/syncthing
`},{id:"adguardhome",name:"AdGuard Home DNS 网关",category:"network",desc:"全网广告拦截、追踪过滤与本地 DNS 解析中枢",port:"3000 / 53",host:"10.0.0.6 (DNS Alpine)",envDesc:["53: DNS 核心解析端口","3000: WebUI 初始化与管理端口"],compose:`version: '3.8'
services:
  adguardhome:
    image: adguard/adguardhome:latest
    container_name: adguardhome
    restart: unless-stopped
    network_mode: host
    volumes:
      - /opt/adguardhome/work:/opt/adguardhome/work
      - /opt/adguardhome/conf:/opt/adguardhome/conf
`},{id:"vaultwarden",name:"Vaultwarden 密码保险库",category:"cloud",desc:"轻量级 Bitwarden 兼容私有端到端加密密码管理器",port:"8080",host:"129.146.122.202 (甲骨文 VPS)",envDesc:["SIGNUPS_ALLOWED: 是否允许公开注册","WEBSOCKET_ENABLED: 实时推送支持"],compose:`version: '3.8'
services:
  vaultwarden:
    image: vaultwarden/server:latest
    container_name: vaultwarden
    restart: always
    environment:
      - SIGNUPS_ALLOWED=false
      - WEBSOCKET_ENABLED=true
    volumes:
      - /opt/vaultwarden/data:/data
    ports:
      - "127.0.0.1:8080:80"
`}];function y(){const r=document.getElementById("theme-btn"),n=document.getElementById("theme-menu"),a=document.getElementById("nebula-container");r&&n&&(r.addEventListener("click",t=>{t.stopPropagation(),n.classList.toggle("hidden")}),document.addEventListener("click",()=>{n.classList.add("hidden")}),document.querySelectorAll(".theme-option-btn").forEach(t=>{t.addEventListener("click",()=>{const o=t.getAttribute("data-theme");o&&s(o)})}));function s(t){document.body.className=`theme-${t} flex flex-col items-center justify-between p-4 sm:p-6 md:p-10 selection:bg-blue-500 selection:text-white`,a&&(a.style.display=t==="nebula"?"block":"none"),localStorage.setItem("user_theme",t),n&&n.classList.add("hidden")}const e=localStorage.getItem("user_theme")||p.defaultTheme;s(e)}function f(){function r(){const n=new Date,a=document.getElementById("bj-time"),s=document.getElementById("la-time"),e=document.getElementById("greeting");if(a&&(a.innerText=new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Shanghai",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1}).format(n)),s&&(s.innerText=new Intl.DateTimeFormat("en-US",{timeZone:"America/Los_Angeles",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1}).format(n)),e){const t=parseInt(new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Shanghai",hour:"numeric",hour12:!1}).format(n));let o="夜深了，注意休息";t>=5&&t<11?o="清晨好，迎接崭新的一天":t>=11&&t<14?o="午后好，保持专注与敏锐":t>=14&&t<18?o="下午好，咖啡时刻与创造力":t>=18&&t<23&&(o="傍晚好，享受属于自己的时光");const i=n.toLocaleDateString("zh-CN",{month:"numeric",day:"numeric",weekday:"long"});e.innerText=o+" · "+i}}r(),setInterval(r,1e3)}function v(){const r={0:{icon:"sun",text:"晴朗"},1:{icon:"cloud-sun",text:"少云"},2:{icon:"cloud-sun",text:"多云"},3:{icon:"cloudy",text:"阴天"},45:{icon:"cloud-fog",text:"大雾"},48:{icon:"cloud-fog",text:"冻雾"},51:{icon:"cloud-drizzle",text:"细雨"},61:{icon:"cloud-rain",text:"小雨"},63:{icon:"cloud-rain",text:"中雨"},65:{icon:"cloud-rain",text:"大雨"},71:{icon:"cloud-snow",text:"小雪"},75:{icon:"cloud-snow",text:"暴雪"},80:{icon:"cloud-rain",text:"阵雨"},95:{icon:"cloud-lightning",text:"雷阵雨"}};function n(s,e,t){const o=document.getElementById("weather-city"),i=document.getElementById("weather-condition"),c=document.getElementById("weather-temp"),l=document.getElementById("weather-icon-wrapper"),d=r[t]||{icon:"cloud-sun",text:"多云"};o&&(o.innerText=s||"当前位置"),i&&(i.innerText=d.text),c&&(c.innerText=`${Math.round(e)}°C`),l&&window.lucide&&(l.innerHTML=`<i data-lucide="${d.icon}" class="w-5 h-5"></i>`,window.lucide.createIcons())}async function a(){try{const o=localStorage.getItem("cached_weather_data");if(o){const i=JSON.parse(o);if(Date.now()-i.timestamp<900*1e3){n(i.city,i.temp,i.code);return}}}catch{}let s=32.06,e=118.79,t="南京";try{const o=await fetch("https://ipapi.co/json/",{signal:AbortSignal.timeout(3500)});if(o.ok){const i=await o.json();i.latitude&&i.longitude&&(s=i.latitude,e=i.longitude,t=i.city||t)}}catch{}try{const o=`https://api.open-meteo.com/v1/forecast?latitude=${s}&longitude=${e}&current_weather=true&timezone=auto`,i=await fetch(o,{signal:AbortSignal.timeout(4500)});if(i.ok){const l=(await i.json()).current_weather;l&&(n(t,l.temperature,l.weathercode),localStorage.setItem("cached_weather_data",JSON.stringify({city:t,temp:l.temperature,code:l.weathercode,timestamp:Date.now()})))}}catch{}}a()}function w(){const r={google:{name:"Google",icon:"G",url:"https://www.google.com/search?q="},bing:{name:"Bing",icon:"B",url:"https://www.bing.com/search?q="},baidu:{name:"百度",icon:"度",url:"https://www.baidu.com/s?wd="},github:{name:"GitHub",icon:"Git",url:"https://github.com/search?q="},bilibili:{name:"B站",icon:"B",url:"https://search.bilibili.com/all?keyword="},youtube:{name:"YouTube",icon:"YT",url:"https://www.youtube.com/results?search_query="}};let n="google";const a=document.getElementById("engine-btn"),s=document.getElementById("engine-menu"),e=document.getElementById("search-input"),t=document.getElementById("search-form");a&&s&&(a.addEventListener("click",o=>{o.stopPropagation(),s.classList.toggle("hidden")}),document.addEventListener("click",()=>{s.classList.add("hidden")}),document.querySelectorAll(".engine-option-btn").forEach(o=>{o.addEventListener("click",()=>{const i=o.getAttribute("data-engine");if(i&&r[i]){n=i;const c=r[i],l=document.getElementById("engine-name"),d=document.getElementById("engine-icon");l&&(l.innerText=c.name),d&&(d.innerText=c.icon),s.classList.add("hidden"),e&&e.focus()}})})),t&&e&&(t.addEventListener("submit",o=>{o.preventDefault();const i=e.value.trim();if(i){if(/^(http|https):\/\/[^ "\n\r]+$/.test(i)){window.open(i,"_blank");return}if(/^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\.?(:[0-9]{1,5})?(\/.*)?$/.test(i)){window.open("https://"+i,"_blank");return}window.open(r[n].url+encodeURIComponent(i),"_blank")}}),document.addEventListener("keydown",o=>{o.key==="/"&&document.activeElement!==e?(o.preventDefault(),e.focus()):o.key==="Escape"&&document.activeElement===e&&(e.value="",e.blur())}))}function x(){const r=document.getElementById("category-tabs-container"),n=document.getElementById("services-grid");r&&(r.innerHTML=p.categories.map((a,s)=>`
      <button 
        type="button" 
        data-category-tab="${a.id}" 
        class="category-tab px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${s===0?"bg-blue-600 text-white shadow-lg shadow-blue-500/20 active-tab":"bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white border border-white/10 backdrop-blur-md"}"
      >
        ${a.name}
      </button>
    `).join("")),n&&(n.innerHTML=p.cards.map(a=>`
      <a 
        href="${a.url}" 
        target="_blank" 
        rel="noopener noreferrer" 
        data-category="${a.category}" 
        class="nav-card glass-card p-4 rounded-2xl flex flex-col justify-between group cursor-pointer"
      >
        <div class="flex items-start justify-between">
          <div class="brand-icon-wrapper">
            <img src="${a.icon}" alt="${a.name}" class="brand-icon-img" loading="lazy" />
          </div>
          ${a.statusDot?`
            <span class="flex h-2 w-2 relative">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          `:""}
        </div>
        <div class="mt-4">
          <h3 class="text-sm font-semibold text-white/95 group-hover:text-blue-400 transition-colors">${a.name}</h3>
          <p class="text-[11px] text-slate-400 mt-0.5 truncate">${a.desc}</p>
        </div>
      </a>
    `).join("")),document.querySelectorAll(".category-tab").forEach(a=>{a.addEventListener("click",()=>{const s=a.getAttribute("data-category-tab");document.querySelectorAll(".category-tab").forEach(e=>{e===a?e.className="category-tab px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all bg-blue-600 text-white shadow-lg shadow-blue-500/20 active-tab cursor-pointer":e.className="category-tab px-4 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white border border-white/10 backdrop-blur-md cursor-pointer"}),document.querySelectorAll(".nav-card").forEach(e=>{const t=e.getAttribute("data-category");s==="all"||t===s?e.style.display="flex":e.style.display="none"})})})}function E(){let r=g[0];const n=document.getElementById("docker-modal"),a=document.getElementById("open-docker-repo-btn"),s=document.getElementById("close-docker-modal-btn"),e=document.getElementById("copy-compose-btn"),t=document.getElementById("copy-btn-text"),o=document.getElementById("docker-nav-list");o&&(o.innerHTML=g.map((c,l)=>`
      <button 
        type="button" 
        data-service-id="${c.id}" 
        class="docker-nav-btn w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${l===0?"bg-blue-600/30 text-blue-300 border border-blue-500/40 active-srv":"hover:bg-white/5 text-slate-300"}"
      >
        <div class="flex flex-col truncate pr-2">
          <span class="font-semibold truncate text-white/90">${c.name}</span>
          <span class="text-[10px] text-slate-400 mt-0.5">${c.host}</span>
        </div>
        <span class="px-1.5 py-0.5 text-[9px] rounded bg-white/5 border border-white/10 font-mono text-slate-400">${c.port}</span>
      </button>
    `).join(""));function i(c){r=c;const l=document.getElementById("srv-title"),d=document.getElementById("srv-host"),u=document.getElementById("srv-desc"),h=document.getElementById("srv-compose-code"),b=document.getElementById("srv-env-list");l&&(l.innerText=c.name),d&&(d.innerText=c.host),u&&(u.innerText=c.desc),h&&(h.innerText=c.compose),b&&(b.innerHTML=c.envDesc.map(m=>`<li class="bg-black/30 px-2.5 py-1 rounded-lg border border-white/5">${m}</li>`).join("")),document.querySelectorAll(".docker-nav-btn").forEach(m=>{m.getAttribute("data-service-id")===c.id?m.className="docker-nav-btn w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer bg-blue-600/30 text-blue-300 border border-blue-500/40 active-srv":m.className="docker-nav-btn w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer hover:bg-white/5 text-slate-300"})}a&&n&&a.addEventListener("click",()=>{n.classList.remove("hidden")}),s&&n&&s.addEventListener("click",()=>{n.classList.add("hidden")}),n&&n.addEventListener("click",c=>{c.target===n&&n.classList.add("hidden")}),document.addEventListener("keydown",c=>{c.key==="Escape"&&n&&!n.classList.contains("hidden")&&n.classList.add("hidden")}),document.querySelectorAll(".docker-nav-btn").forEach(c=>{c.addEventListener("click",()=>{const l=c.getAttribute("data-service-id"),d=g.find(u=>u.id===l);d&&i(d)})}),e&&e.addEventListener("click",async()=>{if(r&&r.compose)try{await navigator.clipboard.writeText(r.compose),t&&(t.innerText="已复制到剪贴板！"),setTimeout(()=>{t&&(t.innerText="复制 docker-compose.yml")},2e3)}catch{}})}document.addEventListener("DOMContentLoaded",()=>{y(),f(),v(),w(),x(),E(),window.lucide&&window.lucide.createIcons()});

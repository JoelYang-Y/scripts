import './styles/app.css';
import { SITE_CONFIG } from './config/site.config';
import { DOCKER_SERVICES, type DockerServiceConfig } from './config/docker-configs';

// 1. 初始化背景视觉主题
export function initTheme() {
  const themeBtn = document.getElementById('theme-btn');
  const themeMenu = document.getElementById('theme-menu');
  const nebulaContainer = document.getElementById('nebula-container');

  if (themeBtn && themeMenu) {
    themeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      themeMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
      themeMenu.classList.add('hidden');
    });

    document.querySelectorAll('.theme-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const themeKey = btn.getAttribute('data-theme');
        if (themeKey) setTheme(themeKey);
      });
    });
  }

  function setTheme(themeKey: string) {
    document.body.className = `theme-${themeKey} flex flex-col items-center justify-between p-4 sm:p-6 md:p-10 selection:bg-blue-500 selection:text-white`;
    if (nebulaContainer) {
      nebulaContainer.style.display = themeKey === 'nebula' ? 'block' : 'none';
    }
    localStorage.setItem('user_theme', themeKey);
    if (themeMenu) themeMenu.classList.add('hidden');
  }

  const savedTheme = localStorage.getItem('user_theme') || SITE_CONFIG.defaultTheme;
  setTheme(savedTheme);
}

// 2. 双时区实时秒级时钟与动态问候
export function initClocks() {
  function updateClocks() {
    const now = new Date();
    const bjEl = document.getElementById('bj-time');
    const laEl = document.getElementById('la-time');
    const greetEl = document.getElementById('greeting');

    if (bjEl) {
      bjEl.innerText = new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      }).format(now);
    }

    if (laEl) {
      laEl.innerText = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      }).format(now);
    }

    if (greetEl) {
      const hour = parseInt(new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', hour: 'numeric', hour12: false }).format(now));
      let greetText = '夜深了，注意休息';
      if (hour >= 5 && hour < 11) greetText = '清晨好，迎接崭新的一天';
      else if (hour >= 11 && hour < 14) greetText = '午后好，保持专注与敏锐';
      else if (hour >= 14 && hour < 18) greetText = '下午好，咖啡时刻与创造力';
      else if (hour >= 18 && hour < 23) greetText = '傍晚好，享受属于自己的时光';
      const dateStr = now.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'long' });
      greetEl.innerText = greetText + ' · ' + dateStr;
    }
  }

  updateClocks();
  setInterval(updateClocks, 1000);
}

// 3. 高精度天气感知
export function initWeather() {
  const weatherMap: Record<number, { icon: string; text: string }> = {
    0: { icon: 'sun', text: '晴朗' },
    1: { icon: 'cloud-sun', text: '少云' },
    2: { icon: 'cloud-sun', text: '多云' },
    3: { icon: 'cloudy', text: '阴天' },
    45: { icon: 'cloud-fog', text: '大雾' },
    48: { icon: 'cloud-fog', text: '冻雾' },
    51: { icon: 'cloud-drizzle', text: '细雨' },
    61: { icon: 'cloud-rain', text: '小雨' },
    63: { icon: 'cloud-rain', text: '中雨' },
    65: { icon: 'cloud-rain', text: '大雨' },
    71: { icon: 'cloud-snow', text: '小雪' },
    75: { icon: 'cloud-snow', text: '暴雪' },
    80: { icon: 'cloud-rain', text: '阵雨' },
    95: { icon: 'cloud-lightning', text: '雷阵雨' }
  };

  function renderWeather(city: string, temp: number, code: number) {
    const cityEl = document.getElementById('weather-city');
    const condEl = document.getElementById('weather-condition');
    const tempEl = document.getElementById('weather-temp');
    const iconWrapper = document.getElementById('weather-icon-wrapper');

    const info = weatherMap[code] || { icon: 'cloud-sun', text: '多云' };
    if (cityEl) cityEl.innerText = city || '当前位置';
    if (condEl) condEl.innerText = info.text;
    if (tempEl) tempEl.innerText = `${Math.round(temp)}°C`;
    if (iconWrapper && (window as any).lucide) {
      iconWrapper.innerHTML = `<i data-lucide="${info.icon}" class="w-5 h-5"></i>`;
      (window as any).lucide.createIcons();
    }
  }

  async function fetchWeather() {
    try {
      const cached = localStorage.getItem('cached_weather_data');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < 15 * 60 * 1000) {
          renderWeather(parsed.city, parsed.temp, parsed.code);
          return;
        }
      }
    } catch (e) {}

    let lat = 32.06, lon = 118.79, cityName = '南京';
    try {
      const ipRes = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3500) });
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData.latitude && ipData.longitude) {
          lat = ipData.latitude;
          lon = ipData.longitude;
          cityName = ipData.city || cityName;
        }
      }
    } catch (e) {}

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
      if (res.ok) {
        const data = await res.json();
        const cur = data.current_weather;
        if (cur) {
          renderWeather(cityName, cur.temperature, cur.weathercode);
          localStorage.setItem('cached_weather_data', JSON.stringify({
            city: cityName, temp: cur.temperature, code: cur.weathercode, timestamp: Date.now()
          }));
        }
      }
    } catch (err) {}
  }

  fetchWeather();
}

// 4. 多引擎搜索与热键
export function initSearch() {
  const engineMap: Record<string, { name: string; icon: string; url: string }> = {
    google: { name: 'Google', icon: 'G', url: 'https://www.google.com/search?q=' },
    bing: { name: 'Bing', icon: 'B', url: 'https://www.bing.com/search?q=' },
    baidu: { name: '百度', icon: '度', url: 'https://www.baidu.com/s?wd=' },
    github: { name: 'GitHub', icon: 'Git', url: 'https://github.com/search?q=' },
    bilibili: { name: 'B站', icon: 'B', url: 'https://search.bilibili.com/all?keyword=' },
    youtube: { name: 'YouTube', icon: 'YT', url: 'https://www.youtube.com/results?search_query=' }
  };

  let activeEngine = 'google';
  const engineBtn = document.getElementById('engine-btn');
  const engineMenu = document.getElementById('engine-menu');
  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  const searchForm = document.getElementById('search-form');

  if (engineBtn && engineMenu) {
    engineBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      engineMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
      engineMenu.classList.add('hidden');
    });

    document.querySelectorAll('.engine-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const engId = btn.getAttribute('data-engine');
        if (engId && engineMap[engId]) {
          activeEngine = engId;
          const eng = engineMap[engId];
          const nameEl = document.getElementById('engine-name');
          const iconEl = document.getElementById('engine-icon');
          if (nameEl) nameEl.innerText = eng.name;
          if (iconEl) iconEl.innerText = eng.icon;
          engineMenu.classList.add('hidden');
          if (searchInput) searchInput.focus();
        }
      });
    });
  }

  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = searchInput.value.trim();
      if (!query) return;

      if (/^(http|https):\/\/[^ "\n\r]+$/.test(query)) {
        window.open(query, '_blank');
        return;
      }
      if (/^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\.?(:[0-9]{1,5})?(\/.*)?$/.test(query)) {
        window.open('https://' + query, '_blank');
        return;
      }

      window.open(engineMap[activeEngine].url + encodeURIComponent(query), '_blank');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
      } else if (e.key === 'Escape' && document.activeElement === searchInput) {
        searchInput.value = '';
        searchInput.blur();
      }
    });
  }
}

// 5. 渲染分类与服务卡片网格
export function renderCardsAndCategories() {
  const tabsContainer = document.getElementById('category-tabs-container');
  const gridContainer = document.getElementById('services-grid');

  if (tabsContainer) {
    tabsContainer.innerHTML = SITE_CONFIG.categories.map((cat, idx) => `
      <button 
        type="button" 
        data-category-tab="${cat.id}" 
        class="category-tab px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${idx === 0 ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 active-tab' : 'bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white border border-white/10 backdrop-blur-md'}"
      >
        ${cat.name}
      </button>
    `).join('');
  }

  if (gridContainer) {
    gridContainer.innerHTML = SITE_CONFIG.cards.map(card => `
      <a 
        href="${card.url}" 
        target="_blank" 
        rel="noopener noreferrer" 
        data-category="${card.category}" 
        class="nav-card glass-card p-4 rounded-2xl flex flex-col justify-between group cursor-pointer"
      >
        <div class="flex items-start justify-between">
          <div class="brand-icon-wrapper">
            <img src="${card.icon}" alt="${card.name}" class="brand-icon-img" loading="lazy" />
          </div>
          ${card.statusDot ? `
            <span class="flex h-2 w-2 relative">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          ` : ''}
        </div>
        <div class="mt-4">
          <h3 class="text-sm font-semibold text-white/95 group-hover:text-blue-400 transition-colors">${card.name}</h3>
          <p class="text-[11px] text-slate-400 mt-0.5 truncate">${card.desc}</p>
        </div>
      </a>
    `).join('');
  }

  // 绑定 Tab 过滤
  document.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const catId = tab.getAttribute('data-category-tab');
      
      document.querySelectorAll('.category-tab').forEach(t => {
        if (t === tab) {
          t.className = 'category-tab px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all bg-blue-600 text-white shadow-lg shadow-blue-500/20 active-tab cursor-pointer';
        } else {
          t.className = 'category-tab px-4 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white border border-white/10 backdrop-blur-md cursor-pointer';
        }
      });

      document.querySelectorAll('.nav-card').forEach((card: any) => {
        const cardCat = card.getAttribute('data-category');
        if (catId === 'all' || cardCat === catId) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

// 6. Docker 全内网配置代码库交互 (覆盖 10.0.0.3 / 10.0.0.4 / 10.0.0.5 / 10.0.0.6)
export function initDockerModal() {
  let activeHost = 'all';
  let searchQuery = '';
  let currentSrv: DockerServiceConfig = DOCKER_SERVICES[0];

  const modal = document.getElementById('docker-modal');
  const openBtn = document.getElementById('open-docker-repo-btn');
  const closeBtn = document.getElementById('close-docker-modal-btn');
  const copyBtn = document.getElementById('copy-compose-btn');
  const copyBtnText = document.getElementById('copy-btn-text');
  const navList = document.getElementById('docker-nav-list');
  const searchInput = document.getElementById('docker-search-input') as HTMLInputElement | null;
  const countBadge = document.getElementById('docker-service-count');

  // 按宿主节点分类
  const hostCategories = [
    { id: 'all', name: '全网拓扑 (全部)' },
    { id: 'nas', name: '10.0.0.3 NAS' },
    { id: 'dns', name: '10.0.0.6 DNS' },
    { id: 'harness', name: '10.0.0.5 Harness' },
    { id: 'pve', name: '10.0.0.4 PVE' },
    { id: 'cloud', name: '云端 VPS' }
  ];

  // 渲染 Docker 宿主节点分类 Tab
  const filterTabsContainer = document.getElementById('docker-filter-tabs');
  if (filterTabsContainer) {
    filterTabsContainer.innerHTML = hostCategories.map((c, idx) => `
      <button 
        type="button" 
        data-docker-cat="${c.id}" 
        class="docker-cat-tab px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${idx === 0 ? 'bg-blue-600 text-white shadow-md' : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200'}"
      >
        ${c.name}
      </button>
    `).join('');

    document.querySelectorAll('.docker-cat-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeHost = btn.getAttribute('data-docker-cat') || 'all';
        document.querySelectorAll('.docker-cat-tab').forEach(b => {
          if (b === btn) {
            b.className = 'docker-cat-tab px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer bg-blue-600 text-white shadow-md';
          } else {
            b.className = 'docker-cat-tab px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200';
          }
        });
        renderNavList();
      });
    });
  }

  function getFilteredServices() {
    return DOCKER_SERVICES.filter(srv => {
      const matchHost = activeHost === 'all' || srv.category === activeHost;
      const matchSearch = !searchQuery || 
        srv.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        srv.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        srv.host.toLowerCase().includes(searchQuery.toLowerCase()) ||
        srv.port.includes(searchQuery);
      return matchHost && matchSearch;
    });
  }

  function renderNavList() {
    const list = getFilteredServices();
    if (countBadge) countBadge.innerText = `${list.length} 个配置`;
    if (!navList) return;

    if (list.length === 0) {
      navList.innerHTML = `<div class="p-4 text-xs text-slate-500 text-center">无匹配服务</div>`;
      return;
    }

    navList.innerHTML = list.map((srv) => `
      <button 
        type="button" 
        data-service-id="${srv.id}" 
        class="docker-nav-btn w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${srv.id === currentSrv.id ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 active-srv' : 'hover:bg-white/5 text-slate-300'}"
      >
        <div class="flex flex-col truncate pr-2">
          <span class="font-semibold truncate text-white/90">${srv.name}</span>
          <div class="flex items-center gap-1.5 mt-0.5">
            <span class="text-[10px] text-blue-400 font-mono">${srv.hostIp}</span>
            <span class="text-[9px] text-slate-500 truncate">· ${srv.categoryLabel}</span>
          </div>
        </div>
        <span class="px-1.5 py-0.5 text-[9px] rounded bg-white/5 border border-white/10 font-mono text-slate-400">${srv.port}</span>
      </button>
    `).join('');

    document.querySelectorAll('.docker-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sId = btn.getAttribute('data-service-id');
        const target = DOCKER_SERVICES.find(d => d.id === sId);
        if (target) renderDockerDetail(target);
      });
    });

    // 如果当前选中的不在过滤列表中，默认选中第一项
    if (!list.some(s => s.id === currentSrv.id) && list.length > 0) {
      renderDockerDetail(list[0]);
    }
  }

  function renderDockerDetail(srv: DockerServiceConfig) {
    currentSrv = srv;
    const titleEl = document.getElementById('srv-title');
    const hostEl = document.getElementById('srv-host');
    const descEl = document.getElementById('srv-desc');
    const codeEl = document.getElementById('srv-compose-code');
    const envListEl = document.getElementById('srv-env-list');
    const catBadge = document.getElementById('srv-cat-badge');

    if (titleEl) titleEl.innerText = srv.name;
    if (hostEl) hostEl.innerText = srv.host;
    if (descEl) descEl.innerText = srv.desc;
    if (codeEl) codeEl.innerText = srv.compose;
    if (catBadge) catBadge.innerText = srv.categoryLabel;

    if (envListEl) {
      envListEl.innerHTML = srv.envDesc.map(e => `
        <li class="bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>
          <span>${e}</span>
        </li>
      `).join('');
    }

    document.querySelectorAll('.docker-nav-btn').forEach(b => {
      if (b.getAttribute('data-service-id') === srv.id) {
        b.className = 'docker-nav-btn w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer bg-blue-600/30 text-blue-300 border border-blue-500/40 active-srv';
      } else {
        b.className = 'docker-nav-btn w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer hover:bg-white/5 text-slate-300';
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = (e.target as HTMLInputElement).value.trim();
      renderNavList();
    });
  }

  renderNavList();
  renderDockerDetail(DOCKER_SERVICES[0]);

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      modal.classList.remove('hidden');
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
      modal.classList.add('hidden');
    }
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      if (currentSrv && currentSrv.compose) {
        try {
          await navigator.clipboard.writeText(currentSrv.compose);
          if (copyBtnText) copyBtnText.innerText = '已复制到剪贴板！';
          setTimeout(() => {
            if (copyBtnText) copyBtnText.innerText = '复制 docker-compose.yml';
          }, 2000);
        } catch (err) {}
      }
    });
  }
}

// DOM 加载完成初始化
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initClocks();
  initWeather();
  initSearch();
  renderCardsAndCategories();
  initDockerModal();

  if ((window as any).lucide) {
    (window as any).lucide.createIcons();
  }
});

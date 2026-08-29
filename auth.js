/* ============================================================
    君主之刃 v2.4.0 · 前端帳號系統 / 官方首頁 / 登入 / 註冊 / GM面板
    對接後端 /api/auth/* 與長輪詢多人連線
    ============================================================ */

(function () {
  'use strict';

  const STORAGE_TOKEN_KEY = 'mmo_token';
  const STORAGE_ACC_KEY = 'mmo_account';
  const STORAGE_OFFLINE_KEY = 'mmo_offline_account';

  // v2.5.5：存檔 key 必須帶帳號，避免同裝置多帳號互相汙染
  function getSlotSaveKey(acc, idx) {
    if (!acc) return null;
    return 'mmo_save_' + acc + '_' + (idx != null ? idx : 0);
  }
  function getCurrentAccount() {
    try { return localStorage.getItem(STORAGE_ACC_KEY) || ''; } catch (e) { return ''; }
  }

  // 當前狀態
  let currentView = 'home'; // home | login | register | server | char | charCreate
  let currentServer = null;
  let serverList = [];
  let _pendingCreateSlot = 0; // 待建立角色的 slot index
  // ========== 連線狀態判定（v2.1.2 改為 /api/health 精準判斷）==========
  // 邏輯：fetch('/api/health') 回 HTTP 200 且 JSON.status === 'online' 才標已連線
  // 任何其他情況（404/HTML/網路錯誤/非 JSON/欄位不符）一律視為未連線
  let onlineState = 'unknown';
  let healthChecked = false;

  function setOnlineState(state) {
    onlineState = state;
    const labels = document.querySelectorAll('.auth-online-state');
    labels.forEach(l => {
      l.textContent = state === 'online' ? '● 已連線' : state === 'offline' ? '● 連線中' : '● 連線中';
      l.className = 'auth-online-state ' + state;
    });
    if (window.__updateOnlineState) {
      try { window.__updateOnlineState(state); } catch (e) {}
    }
  }

  // v2.1.2：健康檢查，精準判定是否為營運伺服器
  // v2.1.2：健康檢查（寬鬆判定，避免 Content-Type 差異導致誤判離線）
  // 只要 HTTP 200 + 本體能 JSON.parse + data.status==='online' 就算連上線
  // 加上時間戳防快取，首次失敗重試 3 次（0.5s / 1s / 1.5s）
  async function checkServerHealth() {
    const MAX_RETRY = 3;
    const RETRY_DELAYS = [500, 1000, 1500]; // ms

    async function tryOnce() {
      try {
        const url = '/api/health?ts=' + Date.now();
        const res = await fetch(url, { cache: 'no-store', method: 'GET' });
        // 非 200 直接失敗
        if (res.status !== 200) return false;
        // 嘗試解析本體為 JSON（不論 Content-Type）
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch (e) { return false; }
        if (data && data.status === 'online') return true;
        return false;
      } catch (e) {
        return false;
      }
    }

    for (let i = 0; i < MAX_RETRY; i++) {
      const ok = await tryOnce();
      if (ok) {
        setOnlineState('online');
        healthChecked = true;
        return true;
      }
      // 最後一次就不等了
      if (i < MAX_RETRY - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[i]));
      }
    }
    // 三次都失敗 → 離線
    setOnlineState('offline');
    healthChecked = true;
    return false;
  }

  function isServerOnline() {
    return onlineState === 'online';
  }

  // DOM 引用（延遲載入）
  function $(id) { return document.getElementById(id); }

  // ========== 後端 API 請求 ==========
  async function api(path, body, method) {
    const url = path.startsWith('http') ? path : '/api' + path;
    const opts = {
      method: method || (body ? 'POST' : 'GET'),
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    };
    if (body) opts.body = JSON.stringify(body);
    // token
    try {
      const tok = localStorage.getItem(STORAGE_TOKEN_KEY);
      if (tok) opts.headers['Authorization'] = 'Bearer ' + tok;
    } catch (e) { /* ignore */ }
    try {
      const res = await fetch(url, opts);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // v2.1.2：伺服器有回應但 4xx/5xx → 仍算連得上，只是業務錯誤
        if (onlineState !== 'online') setOnlineState('online');
        const err = new Error(data.error || ('HTTP ' + res.status));
        err.status = res.status;
        throw err;
      }
      if (onlineState !== 'online') setOnlineState('online');
      return data;
    } catch (e) {
      // 網路錯誤 / fetch 失敗 → 離線
      if (onlineState !== 'offline') setOnlineState('offline');
      throw e;
    }
  }

  // ========== 伺服器列表 ==========
  // v2.6.0：伺服器完全由 GM 建立，客戶端不得本地生成或 fallback
  async function loadServerList() {
    try {
      const data = await api('/servers');
      serverList = data.servers || [];
      return serverList;
    } catch (e) {
      // v2.6.0：連線失敗時顯示空清單，不允許 fallback 出私人世界
      serverList = [];
      return serverList;
    }
  }




  // ========== 視圖切換 ==========
  function switchView(view) {
    currentView = view;
    const overlay = $('auth-overlay');
    if (!overlay) return;
    renderCurrentView();
  }

  function renderCurrentView() {
    const overlay = $('auth-overlay');
    if (!overlay) return;
    let html = '';
    switch (currentView) {
      case 'home': html = renderHome(); break;
      case 'login': html = renderLogin(); break;
      case 'register': html = renderRegister(); break;
      case 'server': html = renderServerSelect(); break;
      case 'char': html = renderCharSelect(); break;
    }
    overlay.innerHTML = '<div class="auth-particles"></div>' + html;
    // v2.1.2：滾動回頂（針對長頁官網）
    overlay.scrollTop = 0;
    bindCurrentViewEvents();
  }

  // ========== 官方首頁（天堂M風長頁 / v2.1.2 動畫強化版）==========
  function renderHome() {
    const HERO_IMG = 'assets/16_landing/hero_main.jpg';
    const SCENE_BANNER = 'assets/16_landing/scene_banner.jpg';
    const TRANSFORM_ROSTER = 'assets/16_landing/transform_roster.jpg';
    const FEATURE_JOBS = 'assets/16_landing/feature_jobs.jpg';
    const FEATURE_SIEGE = 'assets/16_landing/feature_siege.jpg';
    const FEATURE_TRANSFORM = 'assets/16_landing/feature_transform.jpg';
    const FEATURE_MULTI = 'assets/16_landing/feature_multiplayer.jpg';

    const newsData = [
      { cat: '更新', tag: 'update', title: '【08/27 更新與活動總覽】', date: '2026/08/27' },
      { cat: '更新', tag: 'update', title: '(已知問題)處理說明 公告(2026.08.26)', date: '2026/08/26' },
      { cat: '活動', tag: 'event', title: '【高級商店組合包】', date: '2026/08/25' },
      { cat: '活動', tag: 'event', title: '【每日支援箱】', date: '2026/08/25' },
      { cat: '活動', tag: 'event', title: '【累積購買獎勵】', date: '2026/08/25' },
      { cat: '系統', tag: 'system', title: '【伺服器維護公告】08/28 凌晨例行維護', date: '2026/08/24' },
      { cat: '重要', tag: 'important', title: '【防詐騙宣導】請勿點擊不明連結', date: '2026/08/20' },
    ];

    const newsHtml = newsData.map(n => `
      <div class="news-item" data-cat="${n.tag}">
        <span class="news-cat-tag ${n.tag}">${n.cat}</span>
        <span class="news-title">${n.title}</span>
        <span class="news-date">${n.date}</span>
      </div>
    `).join('');

    return `
      <div class="official-site">
        <!-- 頂部導航列 -->
        <header class="site-header">
          <div class="site-header-inner">
            <div class="site-logo">
              <div class="site-logo-cn">君主之刃</div>
              <div class="site-logo-en">LINEAGE OF SWORDS</div>
            </div>
            <nav class="site-nav">
              <a href="#news" class="site-nav-link">最新消息</a>
              <a href="#features" class="site-nav-link">遊戲特色</a>
              <a href="#showcase" class="site-nav-link">展示</a>
              <a href="#" class="site-nav-link">客服</a>
            </nav>
            <div class="site-header-actions">
              <div class="site-search-btn" title="搜尋">&#128269;</div>
            </div>
          </div>
        </header>

        <!-- 主視覺 Hero -->
        <section class="hero-section" id="hero">
          <div class="hero-bg" style="background-image:url('${HERO_IMG}')"></div>
          <div class="hero-overlay"></div>
          <!-- 火焰/餘燼粒子層 -->
          <div class="hero-embers">
            <div class="ember e1"></div><div class="ember e2"></div><div class="ember e3"></div>
            <div class="ember e4"></div><div class="ember e5"></div><div class="ember e6"></div>
            <div class="ember e7"></div><div class="ember e8"></div><div class="ember e9"></div>
            <div class="ember e10"></div><div class="ember e11"></div><div class="ember e12"></div>
          </div>
          <div class="hero-content">
            <div class="hero-date reveal-anim">2026.08.27</div>
            <div class="hero-title-wrap reveal-anim delay1">
              <div class="hero-title-line">燃燼重生</div>
              <div class="hero-title-line">王者歸來</div>
            </div>
            <div class="hero-subtitle reveal-anim delay2">君主之刃 · 烈焰傳說　全新登場</div>
            <!-- 雙按鈕區：開始遊戲 / 註冊帳號 -->
            <div class="hero-btn-row reveal-anim delay3">
              <button class="hero-btn primary" id="btn-start">
                <span class="hero-btn-icon">&#9876;</span>
                開 始 遊 戲
              </button>
              <button class="hero-btn" id="btn-register">
                <span class="hero-btn-icon">&#9733;</span>
                註 冊 帳 號
              </button>
            </div>
            <!-- PWA 按鈕（取代版本字樣） -->
            <div class="hero-install-row-disabled reveal-anim delay4">
              <button class="install-btn-disabled" id="btn-install">
                <span class="install-icon">&#8681;</span>
                
              </button>
            </div>
          </div>
        </section>

        <!-- 遊戲展示區：變身角色輪播 + 場景展示 -->
        <section class="section showcase-section" id="showcase">
          <h2 class="section-title reveal-on-scroll">遊 戲 展 示</h2>
          <!-- 變身角色圖鑑自動輪播 -->
          <div class="showcase-transform reveal-on-scroll">
            <div class="showcase-transform-title">變 身 圖 鑑</div>
            <div class="transform-carousel" id="transform-carousel">
              <div class="transform-track" id="transform-track">
                <div class="transform-frame">
                  <div class="transform-img" style="background-image:url('${TRANSFORM_ROSTER}')"></div>
                </div>
                <div class="transform-frame">
                  <div class="transform-img" style="background-image:url('${TRANSFORM_ROSTER}')"></div>
                </div>
              </div>
            </div>
            <div class="transform-desc">8 種變身型態 · 金變紅變 · 無限覺醒</div>
          </div>

          <!-- 場景全景展示 -->
          <div class="showcase-scene reveal-on-scroll">
            <div class="scene-banner" style="background-image:url('${SCENE_BANNER}')">
              <div class="scene-overlay"></div>
              <div class="scene-text">
                <div class="scene-title">亞 丁 大 陸</div>
                <div class="scene-sub">雄偉城堡 · 廣闊世界 · 等你君臨</div>
              </div>
            </div>
          </div>
        </section>

        <!-- 本週更新內容 -->
        <section class="section weekly-update" id="weekly">
          <h2 class="section-title reveal-on-scroll">本 週 更 新 內 容</h2>
          <div class="weekly-cards">
            <div class="weekly-card reveal-on-scroll"><div class="weekly-card-img" style="background-image:url('${FEATURE_TRANSFORM}')"></div><div class="weekly-card-label">神話變身</div></div>
            <div class="weekly-card reveal-on-scroll delay-card1"><div class="weekly-card-img" style="background-image:url('${FEATURE_SIEGE}')"></div><div class="weekly-card-label">攻城戰</div></div>
            <div class="weekly-card highlight reveal-on-scroll delay-card2"><div class="weekly-card-img" style="background-image:url('${FEATURE_JOBS}')"></div><div class="weekly-card-label">新職業</div></div>
          </div>
          <div class="section-more-btn">想看更多</div>
        </section>

        <!-- 最新資訊 -->
        <section class="section news-section" id="news">
          <h2 class="section-title reveal-on-scroll">最 新 資 訊</h2>
          <div class="news-tabs reveal-on-scroll">
            <span class="news-tab active" data-tab="all">綜合</span>
            <span class="news-tab" data-tab="system">系統</span>
            <span class="news-tab" data-tab="event">活動</span>
            <span class="news-tab" data-tab="update">更新</span>
            <span class="news-tab" data-tab="important">重要</span>
            <span class="news-tab" data-tab="service">服務</span>
          </div>
          <div class="news-list">
            ${newsHtml}
          </div>
          <div class="section-more-btn">想看更多</div>
        </section>

        <!-- 最新重點特色 -->
        <section class="section features-section" id="features">
          <h2 class="section-title reveal-on-scroll">最 新 重 點</h2>
          <div class="feature-cards">
            <div class="feature-card big reveal-on-scroll">
              <div class="feature-card-img" style="background-image:url('${FEATURE_JOBS}')"></div>
              <div class="feature-card-info">
                <div class="feature-card-title">六 大 職 業</div>
                <div class="feature-card-desc">騎士 · 法師 · 精靈 · 黑暗妖精 · 聖騎士 · 幻術師</div>
              </div>
            </div>
            <div class="feature-card-row">
              <div class="feature-card reveal-on-scroll">
                <div class="feature-card-img" style="background-image:url('${FEATURE_TRANSFORM}')"></div>
                <div class="feature-card-info">
                  <div class="feature-card-title">變 身 系 統</div>
                  <div class="feature-card-desc">神話金變 · 無限覺醒</div>
                </div>
              </div>
              <div class="feature-card reveal-on-scroll delay-card1">
                <div class="feature-card-img" style="background-image:url('${FEATURE_SIEGE}')"></div>
                <div class="feature-card-info">
                  <div class="feature-card-title">攻 城 戰</div>
                  <div class="feature-card-desc">千人對戰 · 君臨天下</div>
                </div>
              </div>
            </div>
            <div class="feature-card big reveal-on-scroll">
              <div class="feature-card-img" style="background-image:url('${FEATURE_MULTI}')"></div>
              <div class="feature-card-info">
                <div class="feature-card-title">多 人 連 線</div>
                <div class="feature-card-desc">即時組隊 · 並肩作戰</div>
              </div>
            </div>
          </div>
          <div class="section-more-btn">想看更多</div>
        </section>

        <!-- 社群列 -->
        <section class="section community-section reveal-on-scroll">
          <div class="community-row">
            <a class="community-btn" href="#" title="Facebook">
              <div class="community-icon-circle"><span class="community-icon-txt">f</span></div>
              <span class="community-name">FACEBOOK</span>
            </a>
            <a class="community-btn" href="#" title="Youtube">
              <div class="community-icon-circle"><span class="community-icon-txt">▶</span></div>
              <span class="community-name">YOUTUBE</span>
            </a>
            <a class="community-btn" href="#" title="巴哈姆特">
              <div class="community-icon-circle"><span class="community-icon-txt">巴</span></div>
              <span class="community-name">GAMER</span>
            </a>
            <a class="community-btn" href="#" title="常見問題">
              <div class="community-icon-circle"><span class="community-icon-txt">?</span></div>
              <span class="community-name">常見問題</span>
            </a>
          </div>
        </section>

        <!-- 底部版權 -->
        <footer class="site-footer">
          <div class="footer-corp">© 2026 君主之刃團隊 版權所有</div>
          <div class="footer-license">本遊戲為免費營運 · 內有付費商城 · 請注意遊戲時間</div>
          <div class="footer-rating">輔 15 級</div>
        </footer>

        <!-- PWA 安裝引導彈層 -->
        <div class="install-modal-overlay" id="install-modal">
          <div class="install-modal">
            <div class="install-modal-title">加 入 主 畫 面</div>
            <div class="install-modal-body" id="install-modal-body">
              <!-- 動態內容：安卓直接安裝 / iOS 步驟 -->
            </div>
            <div class="install-modal-footer">
              <button class="install-modal-close" id="install-modal-close">關閉</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ========== 登入 ==========
  function renderLogin() {
    return `
      <div class="auth-fullpage">
        <div class="auth-fullpage-inner">
          <div class="auth-back-row">
            <button class="auth-back-btn" id="btn-login-back">‹ 返回官網</button>
          </div>
          <div class="auth-panel" style="position:relative">
            <div class="auth-panel-title">帳 號 登 入</div>
            <div class="auth-field">
              <label>帳 號</label>
              <input class="auth-input" type="text" id="login-account" placeholder="請輸入帳號" autocomplete="username" />
            </div>
            <div class="auth-field">
              <label>密 碼</label>
              <input class="auth-input" type="password" id="login-password" placeholder="請輸入密碼" autocomplete="current-password" />
            </div>
            <div class="auth-error" id="login-error"></div>
            <button class="auth-btn primary" id="btn-login-submit">登 入</button>
            <div class="auth-footer-text">
              還沒有帳號？<span id="link-register">立即註冊</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ========== 註冊 ==========
  function renderRegister() {
    return `
      <div class="auth-fullpage">
        <div class="auth-fullpage-inner">
          <div class="auth-back-row">
            <button class="auth-back-btn" id="btn-register-back">‹ 返回官網</button>
          </div>
          <div class="auth-panel" style="position:relative">
            <div class="auth-panel-title">帳 號 註 冊</div>
            <div class="auth-field">
              <label>帳 號</label>
              <input class="auth-input" type="text" id="reg-account" placeholder="4-20 個字元" autocomplete="username" />
            </div>
            <div class="auth-field">
              <label>密 碼</label>
              <input class="auth-input" type="password" id="reg-password" placeholder="至少 6 位" autocomplete="new-password" />
            </div>
            <div class="auth-field">
              <label>確認密碼</label>
              <input class="auth-input" type="password" id="reg-password2" placeholder="再次輸入密碼" autocomplete="new-password" />
            </div>
            <div class="auth-error" id="reg-error"></div>
            <button class="auth-btn primary" id="btn-register-submit">註 冊</button>
            <div class="auth-footer-text">
              已有帳號？<span id="link-login">返回登入</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ========== 伺服器選擇 ==========
  function renderServerSelect() {
    if (serverList.length === 0) {
      return `
        <div class="auth-fullpage">
          <div class="auth-fullpage-inner">
            <div class="auth-back-row">
              <button class="auth-back-btn" id="btn-server-back">‹ 返回首頁</button>
            </div>
            <div class="server-select-title">選 擇 伺 服 器</div>
            <div class="server-select-sub">目前無可用伺服器</div>
            <div style="margin-top:40px;padding:30px;color:#8a6a2a;text-align:center;border:1px dashed #4a3818;border-radius:8px">
              伺服器清單為空，請聯繫 GM 開放伺服器。<br/>
              <span style="font-size:12px;opacity:.6">v2.6.0 起伺服器由 GM 統一管理</span>
            </div>
          </div>
        </div>
      `;
    }
    const items = serverList.map(s => {
      // v2.6.0 新狀態：open / preparing / closed
      let statusLabel = '順暢';
      let statusClass = 'smooth';
      let disabled = false;
      if (s.status === 'preparing') { statusLabel = '準備中'; statusClass = 'maintain'; disabled = true; }
      else if (s.status === 'closed') { statusLabel = '維護中'; statusClass = 'maintain'; disabled = true; }
      else if (s.status === 'open') { statusLabel = '順暢'; statusClass = 'smooth'; disabled = false; }
      else { statusLabel = s.status || '未知'; statusClass = 'maintain'; disabled = true; }
      return `
        <div class="server-card ${disabled ? 'disabled' : ''}" data-server-id="${s.id}" data-server-status="${s.status}">
          <div class="server-status-dot ${statusClass}"></div>
          <div class="server-info">
            <div class="server-name">${s.name}</div>
            <div class="server-desc">${statusLabel} · 在線 ${s.players != null ? s.players : '--'} 人</div>
          </div>
          <div class="server-arrow">›</div>
        </div>
      `;
    }).join('');

    return `
      <div class="auth-fullpage">
        <div class="auth-fullpage-inner">
          <div class="auth-back-row">
            <button class="auth-back-btn" id="btn-server-back">‹ 返回首頁</button>
          </div>
            <div class="server-select-title">選 擇 伺 服 器</div>
            <div class="server-select-sub">請選擇欲進入的世界</div>
            <div class="server-list">
              ${items}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ========== 角色選擇 ==========
  // v2.5.6：卡片式版面，每格顯示職業 portrait / 名字 / 職業 / 等級 / 進入遊戲按鈕
  //   空格顯示「+新增角色」；暗黑風、手機好點
  const CLASS_DISPLAY = {
    warrior: { name: '騎士', color: '#c84030', accent: '#ff8060', icon: '⚔' },
    mage:    { name: '法師', color: '#3060c8', accent: '#6090ff', icon: '✦' },
    archer:  { name: '精靈', color: '#30a050', accent: '#60d080', icon: '🏹' },
    rogue:   { name: '黑暗妖精', color: '#8040a0', accent: '#c060e0', icon: '🗡' },
    paladin: { name: '聖騎士', color: '#d0a020', accent: '#ffd860', icon: '🛡' },
    warlock: { name: '幻術師', color: '#7030a0', accent: '#b060e0', icon: '◈' },
  };

  function renderCharSelect() {
    // 從 localStorage 讀取已建立的角色（v2.0 後端會回傳，這裡先用前端緩存）
    let chars = [];
    try {
      const saved = localStorage.getItem('mmo_characters');
      if (saved) chars = JSON.parse(saved);
    } catch (e) {}

    const cards = [];
    for (let i = 0; i < 3; i++) {
      const c = chars[i];
      if (c) {
        const cls = CLASS_DISPLAY[c.classId] || CLASS_DISPLAY.warrior;
        const lv = c.level || 1;
        const nationName = c.nationName || '無國籍';
        cards.push(`
          <div class="char-card" data-char-idx="${i}" style="--cls-color: ${cls.color}; --cls-accent: ${cls.accent};">
            <div class="char-card-portrait">
              <div class="char-card-portrait-ring"></div>
              <div class="char-card-portrait-inner">
                <span class="char-card-class-icon">${cls.icon}</span>
              </div>
              <div class="char-card-level-badge">Lv ${lv}</div>
            </div>
            <div class="char-card-info">
              <div class="char-card-name">${escapeHtml(c.name)}</div>
              <div class="char-card-class">
                <span class="char-card-class-dot"></span>
                ${escapeHtml(cls.name)}
              </div>
              <div class="char-card-nation">${escapeHtml(nationName)}</div>
            </div>
            <button class="char-card-enter" data-action="enter" data-char-idx="${i}">
              進入遊戲
            </button>
            <button class="char-card-delete" data-action="delete" data-delete-idx="${i}" title="刪除角色">
              刪除
            </button>
          </div>
        `);
      } else {
        cards.push(`
          <div class="char-card char-card-empty" data-char-idx="${i}" data-create="1">
            <div class="char-card-empty-plus">+</div>
            <div class="char-card-empty-text">新增角色</div>
            <div class="char-card-empty-hint">第 ${i + 1} 個角色欄位</div>
          </div>
        `);
      }
    }

    return `
      <div class="auth-fullpage char-select-page">
        <div class="auth-fullpage-inner">
          <div class="auth-back-row">
            <button class="auth-back-btn" id="btn-char-back">‹ 更換伺服器</button>
          </div>
          <div class="char-select-header">
            <div class="char-select-title">角 色 選 擇</div>
            <div class="char-select-subtitle">
              <span class="char-select-server-dot"></span>
              伺服器：${escapeHtml(currentServer?.name || '未知')}
            </div>
          </div>
          <div class="char-card-grid">
            ${cards.join('')}
          </div>
        </div>
      </div>
    `;
  }

  // ========== 角色建立（羊皮紙暗黑奇幻風 / v2.1.2 精簡版）==========
  

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // ========== 離線帳號 ==========
  function createOfflineAccount(accountName) {
    const acc = accountName || ('offline_' + Math.random().toString(36).slice(2, 8));
    const offlineData = {
      account: acc,
      isOffline: true,
      createdAt: Date.now(),
      servers: {
        zeus: { characters: [] },
        hades: { characters: [] },
      }
    };
    try {
      localStorage.setItem(STORAGE_OFFLINE_KEY, JSON.stringify(offlineData));
      localStorage.setItem(STORAGE_ACC_KEY, acc);
      // 連線模式下也放一個 token 佔位，避免 game.js 報錯
      localStorage.setItem(STORAGE_TOKEN_KEY, 'offline_' + Date.now());
    } catch (e) {}
    return offlineData;
  }

  function getOfflineAccount() {
    try {
      const raw = localStorage.getItem(STORAGE_OFFLINE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function enterOfflineMode(accName) {
    createOfflineAccount(accName);
    // 載入離線伺服器列表
    loadServerList().then(() => {
      switchView('server');
      showOfflineToast();
    });
  }

  function showOfflineToast() {
    // 不顯眼的輕微提示：僅在畫面左上角顯示一個淡色小圓點，1.5秒後消失
    // 避免影響正式營運頁面形象
    const dot = document.createElement('div');
    dot.className = 'offline-indicator-dot';
    dot.title = '連線模式';
    document.body.appendChild(dot);
    setTimeout(() => dot.classList.add('show'), 30);
    setTimeout(() => {
      dot.classList.remove('show');
      setTimeout(() => dot.remove(), 400);
    }, 1500);
  }

  // ===== 通用輕提示 =====
  function showToast(msg) {
    let box = document.getElementById('auth-toast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'auth-toast';
      document.body.appendChild(box);
    }
    box.textContent = msg;
    box.classList.add('show');
    clearTimeout(box._t);
    box._t = setTimeout(() => { box.classList.remove('show'); }, 2000);
  }

  // ========== 事件綁定 ==========
  function bindCurrentViewEvents() {
    switch (currentView) {
      case 'home':
        const btnStart = $('btn-start');
        const btnReg = $('btn-register');
        if (btnStart) btnStart.addEventListener('click', () => switchView('login'));
        if (btnReg) btnReg.addEventListener('click', () => switchView('register'));
        // 背景探測後端狀態（僅探測，不跳轉）
        probeBackendStatus();

        // ===== 新聞分頁切換 =====
        document.querySelectorAll('.news-tab').forEach(tab => {
          tab.addEventListener('click', () => {
            document.querySelectorAll('.news-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const cat = tab.dataset.tab;
            document.querySelectorAll('.news-item').forEach(item => {
              item.style.display = (cat === 'all' || item.dataset.cat === cat) ? '' : 'none';
            });
          });
        });

        // ===== PWA 安裝按鈕 =====
        (function() {
          const btn = $('btn-install');
          const modal = $('install-modal');
          const body = $('install-modal-body');
          const closeBtn = $('install-modal-close');
          if (!btn || !modal || !body) return;

          let deferredPrompt = null;

          // 攔截 Chrome/Android 安裝提示
          window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
          });

          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
          const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            navigator.standalone === true;

          btn.addEventListener('click', () => {
            if (isStandalone) {
              showToast('已在獨立模式執行');
              return;
            }
            // Android/Chrome：直接觸發安裝
            if (deferredPrompt) {
              deferredPrompt.prompt();
              deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
              return;
            }
            // iOS：顯示加入主畫面步驟
            if (isIOS) {
              body.innerHTML = `
                <div style="text-align:center;padding:8px 0">
                  <div style="font-size:40px;margin-bottom:12px">&#8613;</div>
                  <div style="font-size:14px;color:#e8d090;letter-spacing:2px;margin-bottom:14px">加入主畫面</div>
                  <div style="font-size:12px;color:#a89060;line-height:1.8;letter-spacing:1px">
                    點擊下方 <strong style="color:#f0c860">分享</strong> 按鈕<br/>
                    選擇 <strong style="color:#f0c860">加入主畫面</strong><br/>
                    即可像 App 一樣全螢幕遊玩
                  </div>
                </div>
              `;
            } else {
              // 其他瀏覽器：引導說明
              body.innerHTML = `
                <div style="text-align:center;padding:8px 0">
                  <div style="font-size:40px;margin-bottom:12px">&#9881;</div>
                  <div style="font-size:14px;color:#e8d090;letter-spacing:2px;margin-bottom:14px"></div>
                  <div style="font-size:12px;color:#a89060;line-height:1.8;letter-spacing:1px">
                    將遊戲加到主畫面<br/>
                    免開網頁直接全螢幕玩<br/>
                    支援 Chrome / Edge / Safari
                  </div>
                  <div style="margin-top:16px;font-size:11px;color:#6a5020">
                    進入遊戲後點選網址列安裝圖示
                  </div>
                </div>
              `;
            }
            modal.classList.add('show');
          });

          closeBtn.addEventListener('click', () => modal.classList.remove('show'));
          modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
        })();

        // ===== Scroll Reveal：捲動時元素漸入 =====
        (function() {
          const items = document.querySelectorAll('.reveal-on-scroll');
          if (!items.length) return;
          const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
              }
            });
          }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
          items.forEach(el => observer.observe(el));
        })();

        break;
      case 'login':
        $('btn-login-submit').addEventListener('click', doLogin);
        $('link-register').addEventListener('click', () => switchView('register'));
        $('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
        $('login-account').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
        const btnLoginBack = $('btn-login-back');
        if (btnLoginBack) btnLoginBack.addEventListener('click', () => switchView('home'));
        // 記住帳號
        try {
          const saved = localStorage.getItem(STORAGE_ACC_KEY);
          if (saved) $('login-account').value = saved;
        } catch (e) {}
        break;
      case 'register':
        $('btn-register-submit').addEventListener('click', doRegister);
        $('link-login').addEventListener('click', () => switchView('login'));
        $('reg-password2').addEventListener('keydown', e => { if (e.key === 'Enter') doRegister(); });
        const btnRegBack = $('btn-register-back');
        if (btnRegBack) btnRegBack.addEventListener('click', () => switchView('home'));
        break;
       case 'server':
         document.querySelectorAll('.server-card').forEach(card => {
           card.addEventListener('click', () => {
             const sid = card.dataset.serverId;
             const srv = serverList.find(s => s.id === sid);
             if (!srv) return;
             // v2.6.0：只有 open 狀態可進入
             if (srv.status !== 'open') {
               if (srv.status === 'preparing') {
                 showToast(srv.name + ' 伺服器準備中，敬請期待');
               } else if (srv.status === 'closed') {
                 showToast(srv.name + ' 伺服器維護中，暫時無法進入');
               } else {
                 showToast(srv.name + ' 暫不可進入');
               }
               return;
             }
             enterServer(srv);
           });
         });
         $('btn-server-back').addEventListener('click', () => switchView('home'));
         break;
      case 'char':
        // v2.5.6：卡片式版面，改用事件委派在 .char-card-grid 上
        const grid = document.querySelector('.char-card-grid');
        if (grid) {
          grid.addEventListener('click', (e) => {
            const card = e.target.closest('.char-card');
            if (!card) return;
            const idx = parseInt(card.dataset.charIdx);
            const action = e.target.closest('[data-action]')?.dataset.action;

            if (action === 'delete') {
              // 刪除按鈕：單獨處理
              e.stopPropagation();
              handleDeleteChar(idx);
              return;
            }

            if (action === 'enter' || (!card.classList.contains('char-card-empty') && !action)) {
              // 點卡片本體或「進入遊戲」按鈕 → 載入既有角色
              startGameWithChar(idx);
              return;
            }

            if (card.dataset.create === '1' || card.classList.contains('char-card-empty')) {
              // 空格卡片 → 創建新角色
              if (typeof window.showCharCreate === 'function') {
                _pendingCreateSlot = idx;
                _hookCharCreateDone();
                try {
                  window.showCharCreate();
                } catch (err) {
                  console.error('[Auth] showCharCreate 執行失敗：', err);
                  showToast('創角介面啟動失敗，請重新整理');
                }
              } else {
                console.error('[Auth] window.showCharCreate 不存在');
                showToast('遊戲載入中，請稍後再試');
              }
            }
          });
        }
        $('btn-char-back').addEventListener('click', () => switchView('server'));
        break;
          }
  }

  // ========== 背景探測後端狀態（僅探測，不自動跳轉） ==========
  // v2.0.2 修正：無論在線或離線，app 開啟一律先顯示官方首頁。
  // 玩家必須主動點擊「開始遊戲 / 註冊帳號 / 登入」才會進入下一步。
  // 此函式只做後端可用性快取，不干預畫面流程。
  function probeBackendStatus() {
    api('/auth/me').then(() => {
      // 後端可用 → 什麼都不做，留在首頁
    }).catch(() => {
      // 後端不可用 → 也留在首頁，等玩家主動開始
    });
  }

  // ========== 登入請求 ==========
  async function doLogin() {
    const acc = $('login-account').value.trim();
    const pwd = $('login-password').value;
    const errEl = $('login-error');
    errEl.textContent = '';
    if (!acc) { errEl.textContent = '請輸入帳號'; return; }
    if (!pwd) { errEl.textContent = '請輸入密碼'; return; }

    const btn = $('btn-login-submit');
    btn.disabled = true;
    try {
      const data = await api('/auth/login', { account: acc, password: pwd });
      if (data.token) {
        try {
          localStorage.setItem(STORAGE_TOKEN_KEY, data.token);
          localStorage.setItem(STORAGE_ACC_KEY, acc);
          // 登入成功清除離線標記
          localStorage.removeItem(STORAGE_OFFLINE_KEY);
        } catch (e) {}
      }
      // 記住帳號
      try { localStorage.setItem(STORAGE_ACC_KEY, acc); } catch (e) {}
      await loadServerList();
      switchView('server');
    } catch (e) {
    // 後端不可用時 → 提示玩家網路狀態，但留在登入頁，不強制跳離線
        const status = e.status;
        if (status === 401 || e.message === '帳號或密碼錯誤') {
          errEl.textContent = e.message || '帳號或密碼錯誤';
        } else {
          errEl.textContent = '無法連線伺服器，請確認已用 Web Service 模式部署（npm start）';
        }
    } finally {
      btn.disabled = false;
    }
  }

  // ========== 註冊請求 ==========
  async function doRegister() {
    const acc = $('reg-account').value.trim();
    const pwd = $('reg-password').value;
    const pwd2 = $('reg-password2').value;
    const errEl = $('reg-error');
    errEl.textContent = '';

    if (acc.length < 4 || acc.length > 20) { errEl.textContent = '帳號長度需 4-20 字元'; return; }
    if (pwd.length < 6) { errEl.textContent = '密碼至少 6 位'; return; }
    if (pwd !== pwd2) { errEl.textContent = '兩次密碼不一致'; return; }

    const btn = $('btn-register-submit');
    btn.disabled = true;
    try {
      await api('/auth/register', { account: acc, password: pwd });
      // 註冊成功 → 自動登入 → 伺服器選擇
      const data = await api('/auth/login', { account: acc, password: pwd });
      if (data.token) {
        try {
          localStorage.setItem(STORAGE_TOKEN_KEY, data.token);
          localStorage.setItem(STORAGE_ACC_KEY, acc);
          localStorage.removeItem(STORAGE_OFFLINE_KEY);
        } catch (e) {}
      }
      await loadServerList();
      switchView('server');
    } catch (e) {
      // 後端不可用時 → 提示網路錯誤，留在註冊頁
      if (e.message && e.message.includes('已存在')) {
        errEl.textContent = e.message;
      } else {
        errEl.textContent = '無法連線伺服器，請確認已用 Web Service 模式部署（npm start）';
      }
    } finally {
      btn.disabled = false;
    }
  }

  // v2.5.6：刪除角色（提取為共用函式）
  function handleDeleteChar(idx) {
    const chars = [];
    try {
      const raw = localStorage.getItem('mmo_characters');
      if (raw) chars.push(...JSON.parse(raw));
    } catch(e) {}
    const target = chars[idx];
    if (!target) return;
    if (!confirm(`確定要刪除角色「${target.name}」嗎？\n此操作無法復原。`)) return;
    const srv = currentServer?.id || '';
    api('/characters/delete', {
      server: srv,
      charIdx: idx,
      name: target.name,
    }).then(() => {
      return api('/characters?server=' + encodeURIComponent(srv));
    }).then(data => {
      const list = data.characters || [];
      try { localStorage.setItem('mmo_characters', JSON.stringify(list)); } catch(e) {}
      // v2.5.7：刪除後清理本機對應槽位存檔，避免殘留 ghost 資料
      try {
        const acc = getCurrentAccount();
        const slotKey = acc ? getSlotSaveKey(acc, idx) : 'mmo_save_' + idx;
        localStorage.removeItem(slotKey);
        const currentIdx = localStorage.getItem('mmo_char_idx');
        if (currentIdx != null && parseInt(currentIdx, 10) === idx) {
          localStorage.removeItem('mmo_char_idx');
        }
      } catch(e) {}
      switchView('char');
      showToast('角色已刪除');
    }).catch(() => {
      chars[idx] = null; // v2.5.7：標記空槽，不用 splice 導致索引錯位
      try { localStorage.setItem('mmo_characters', JSON.stringify(chars)); } catch(e) {}
      // 也清理本機槽位
      try {
        const acc = getCurrentAccount();
        const slotKey = acc ? getSlotSaveKey(acc, idx) : 'mmo_save_' + idx;
        localStorage.removeItem(slotKey);
      } catch(e) {}
      switchView('char');
      showToast('角色已刪除');
    });
  }

  // ========== 進入伺服器 ==========
  function enterServer(srv) {
    currentServer = srv;
    // 從後端載入該伺服器上的角色列表
    api('/characters?server=' + encodeURIComponent(srv.id))
      .then(data => {
        const chars = data.characters || [];
        try {
          localStorage.setItem('mmo_characters', JSON.stringify(chars));
        } catch (e) {}
        switchView('char');
      })
      .catch(() => {
        // 後端不可用：顯示空角色
        try {
          localStorage.setItem('mmo_characters', JSON.stringify([]));
        } catch (e) {}
        switchView('char');
      });
  }

  // ========== 進入伺服器 ==========
  function startGameWithNewChar() {
    startGameCommon();
  }

  // v2.4.0：創角完成鉤子——建立成功後直接進入遊戲世界（不再跳回角色選擇頁）
  function _hookCharCreateDone() {
    // 設定一次性回調：game.js 建立角色完成後呼叫
    window.__onCharCreated = function(charInfo) {
      // v2.4.0 修復：創角成功後直接留在遊戲世界，不要跳回角色選擇頁
      // 確保遊戲畫面可見、auth-overlay 隱藏
      const overlay = $('auth-overlay');
      if (overlay) overlay.classList.add('hidden');
      const gameRoot = document.getElementById('game-root');
      if (gameRoot) gameRoot.classList.remove('game-hidden');

      // 背景刷新角色列表到 localStorage（不影響當前遊戲）
      api('/characters?server=' + encodeURIComponent(currentServer?.id || ''))
        .then(data => {
          const chars = data.characters || [];
          try {
            localStorage.setItem('mmo_characters', JSON.stringify(chars));
            // 記住當前使用的角色槽（第一個非空槽即剛創的）
            const createdIdx = chars.findIndex(c => c && c.name === charInfo?.name);
            if (createdIdx >= 0) {
              localStorage.setItem('mmo_char_idx', String(createdIdx));
            }
          } catch (e) {}
        })
        .catch(() => { /* 忽略，不影響遊戲體驗 */ });

      // v2.5.5：新創角色不走 onAuthReady
      //   enterWorld() 已呼叫過 init()，再次 onAuthReady → init 會造成二次載入
      //   且 fallback 舊存檔會把新角色狀態覆蓋，導致空白創角面板
      //   這裡只負責連線多人與 GM 狀態檢查
      if (window.MultiplayerClient && currentServer) {
        const serverUrl = window.location.origin;
        window.MultiplayerClient.connect(serverUrl, AuthSystem.getToken()).catch(() => {});
      }

      checkGMStatus();
    };

    // 返回按鈕回調：從創角頁返回角色選擇（玩家主動取消時）
    window.__onCharCreateBack = function() {
      // 隱藏遊戲畫面
      const gameRoot = document.getElementById('game-root');
      if (gameRoot) gameRoot.classList.add('game-hidden');
      const overlay = $('auth-overlay');
      if (overlay) overlay.classList.remove('hidden');
      // 重新載入角色列表
      api('/characters?server=' + encodeURIComponent(currentServer?.id || ''))
        .then(data => {
          const chars = data.characters || [];
          try {
            localStorage.setItem('mmo_characters', JSON.stringify(chars));
          } catch (e) {}
          switchView('char');
        })
        .catch(() => {
          switchView('char');
        });
    };
  }
  function startGameWithChar(idx) {
    // v2.5.0：從後端載入角色存檔；失敗彈錯並留在角色選擇頁，不得靜默進遊戲
    // v2.5.5：寫入 account_charIdx 專屬 key，杜絕跨帳號資料錯亂
    api('/characters/' + idx + '?server=' + encodeURIComponent(currentServer?.id || ''))
      .then(data => {
        if (data && data.saveData) {
          try {
            const acc = getCurrentAccount();
            if (acc) {
              localStorage.setItem(getSlotSaveKey(acc, idx), JSON.stringify(data.saveData));
            } else {
              localStorage.setItem('mmo_save_' + idx, JSON.stringify(data.saveData));
            }
            localStorage.setItem('mmo_char_idx', String(idx));
          } catch (e) {}
          startGameCommon();
        } else {
          showToast('讀取角色存檔失敗，請重試', 'error');
        }
      })
      .catch(err => {
        const msg = err?.message || '讀取角色存檔失敗，請重試';
        showToast(msg, 'error');
      });
  }

  function startGameCommon() {
    const overlay = $('auth-overlay');
    if (overlay) overlay.classList.add('hidden');
    // v2.1.2：玩家真正進入遊戲時才顯示遊戲世界/HUD（避免官網前閃爍）
    const gameRoot = document.getElementById('game-root');
    if (gameRoot) gameRoot.classList.remove('game-hidden');

    // 設定遊戲的伺服器位址（同源）
    if (window.MultiplayerClient && currentServer) {
      const serverUrl = window.location.origin;
      // 連線到 socket.io（自動）
      window.MultiplayerClient.connect(serverUrl, AuthSystem.getToken()).catch(() => {
        console.warn('[Auth] 自動連線失敗，重新連線中');
      });
    }

    // 通知 game.js 已登入
    if (window.onAuthReady) {
      try { window.onAuthReady(currentServer); } catch (e) {}
    }

    // 顯示 GM 手勢提示（如果是 GM 帳號）
    checkGMStatus();
  }

  // ========== GM 狀態偵測 ==========
  // v2.4.0：GM 身分完全以伺服器端 isGM 欄位為準
  // 後端不可用時，客戶端絕不自行判斷 GM，杜絕離線後門
  function checkGMStatus() {
    api('/auth/me').then(data => {
      if (data && data.isGM) {
        initGMPanel();
      }
    }).catch(() => {
      // 後端不可用：不做任何 GM 相關處理，完全關閉 GM 面板
    });
  }

  // 取得目前登入的帳號與伺服器（GM 操作的目標，預設操作自己帳號的當前角色）
  function getGMContext() {
    const acc = localStorage.getItem(STORAGE_ACC_KEY) || '';
    const server = currentServer?.id || 'zeus';
    const charIdx = window.GS?.currentCharIdx != null ? window.GS.currentCharIdx : 0;
    return { account: acc, serverId: server, charIdx: charIdx };
  }

  // ========== GM 面板 ==========
  let gmPanelOpen = false;
  let gmGestureTaps = 0;
  let gmGestureTimer = null;

  function initGMPanel() {
    // 注入 GM 面板 DOM
    if ($('gm-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'gm-panel';
    panel.className = 'gm-panel';
    panel.innerHTML = `
      <div class="gm-panel-header">
        <span class="gm-panel-title">GM 控制台</span>
        <button class="gm-panel-close" id="gm-panel-close">×</button>
      </div>
      <div class="gm-panel-body">
        <div class="gm-section-title">伺服器狀態</div>
        <div class="gm-server-status" id="gm-server-status">
          載入中...
        </div>

        <div class="gm-section-title">資源調整</div>
        <div class="gm-row">
          <label>金幣</label>
          <input type="number" id="gm-gold-val" value="1000000" />
        </div>
        <div class="gm-row">
          <button class="gm-btn" id="gm-add-gold" style="flex:1">增加金幣</button>
          <button class="gm-btn" id="gm-set-gold" style="flex:1">設定金幣</button>
        </div>
        <div class="gm-row">
          <label>鑽石</label>
          <input type="number" id="gm-gem-val" value="10000" />
        </div>
        <div class="gm-row">
          <button class="gm-btn" id="gm-add-gem" style="flex:1">增加鑽石</button>
          <button class="gm-btn" id="gm-set-gem" style="flex:1">設定鑽石</button>
        </div>

        <div class="gm-section-title">角色調整</div>
        <div class="gm-row">
          <label>等級</label>
          <input type="number" id="gm-level-val" value="10" />
          <button class="gm-btn" id="gm-set-level">設定</button>
        </div>

        <div class="gm-section-title">傳送</div>
        <div class="gm-row">
          <select id="gm-teleport-map">
            <option value="village">米德加特村</option>
            <option value="goblin">哥布林森林</option>
            <option value="goblin_cave">哥布林洞窟</option>
            <option value="dark_forest">黑暗森林</option>
            <option value="desert">沙漠邊境</option>
            <option value="dungeon1">試煉之塔1層</option>
          </select>
          <button class="gm-btn" id="gm-teleport">傳送</button>
        </div>

        <div class="gm-section-title">道具發放</div>
        <div class="gm-row">
          <select id="gm-item-select">
            <option value="hp2">中型生命藥水×100</option>
            <option value="mp2">中型魔力藥水×100</option>
            <option value="enhance_scroll">強化卷×50</option>
            <option value="mgem">魔法寶石×50</option>
            <option value="town_scroll">回城卷軸×20</option>
            <option value="mystery_chest">神秘寶箱×10</option>
          </select>
          <button class="gm-btn" id="gm-give-item">發放</button>
        </div>

        <div class="gm-section-title">線上玩家管理</div>
        <div class="gm-row">
          <select id="gm-player-select"></select>
        </div>
        <div class="gm-row">
          <button class="gm-btn danger" id="gm-kick-player">踢出玩家</button>
        </div>

        <div class="gm-section-title">系統</div>
        <div class="gm-row">
          <button class="gm-btn" id="gm-save">強制存檔</button>
          <button class="gm-btn" id="gm-logout">登出帳號</button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // 關閉按鈕
    $('gm-panel-close').addEventListener('click', closeGMPanel);

    // 資源按鈕
    $('gm-add-gold').addEventListener('click', () => gmAdjustGold(parseInt($('gm-gold-val').value) || 0, 'add'));
    $('gm-set-gold').addEventListener('click', () => gmAdjustGold(parseInt($('gm-gold-val').value) || 0, 'set'));
    $('gm-add-gem').addEventListener('click', () => gmAdjustGem(parseInt($('gm-gem-val').value) || 0, 'add'));
    $('gm-set-gem').addEventListener('click', () => gmAdjustGem(parseInt($('gm-gem-val').value) || 0, 'set'));
    $('gm-set-level').addEventListener('click', () => gmSetLevel(parseInt($('gm-level-val').value) || 1));
    $('gm-teleport').addEventListener('click', () => gmTeleport($('gm-teleport-map').value));
    $('gm-give-item').addEventListener('click', () => gmGiveItem($('gm-item-select').value));
    $('gm-kick-player').addEventListener('click', () => gmKickPlayer());
    $('gm-save').addEventListener('click', () => { if (window.saveGame) saveGame(); alert('存檔完成'); });
    $('gm-logout').addEventListener('click', gmLogout);

    // 手勢：雙擊頂部狀態欄 5 次喚出
    bindGMGesture();

    // 更新伺服器狀態
    refreshGMServerStatus();
  }

  function bindGMGesture() {
    const hint = document.createElement('div');
    hint.className = 'gm-gesture-hint';
    hint.id = 'gm-gesture-hint';
    hint.textContent = 'GM 模式：雙擊頂部狀態欄開啟';
    document.body.appendChild(hint);

    const target = document.querySelector('.top-bar') || document.body;
    let lastTap = 0;
    let doubleTaps = 0;

    target.addEventListener('click', () => {
      const now = Date.now();
      if (now - lastTap < 350) {
        doubleTaps++;
        clearTimeout(gmGestureTimer);
        if (doubleTaps >= 3) {
          toggleGMPanel();
          doubleTaps = 0;
          return;
        }
        // 顯示提示
        hint.classList.add('show');
        hint.textContent = `GM 手勢：還需 ${3 - doubleTaps} 次雙擊`;
        gmGestureTimer = setTimeout(() => {
          hint.classList.remove('show');
          doubleTaps = 0;
        }, 1200);
      } else {
        doubleTaps = 0;
      }
      lastTap = now;
    });
  }

  function toggleGMPanel() {
    if (gmPanelOpen) closeGMPanel();
    else openGMPanel();
  }
  function openGMPanel() {
    const p = $('gm-panel');
    if (p) p.classList.add('open');
    gmPanelOpen = true;
    refreshGMPanelData();
  }
  function closeGMPanel() {
    const p = $('gm-panel');
    if (p) p.classList.remove('open');
    gmPanelOpen = false;
  }

  function refreshGMPanelData() {
    // 更新線上玩家列表
    const sel = $('gm-player-select');
    if (sel && window.MultiplayerClient && window.MultiplayerClient._getRemotePlayers) {
      const players = window.MultiplayerClient._getRemotePlayers();
      sel.innerHTML = '';
      if (players.size === 0) {
        const opt = document.createElement('option');
        opt.textContent = '（無其他線上玩家）';
        sel.appendChild(opt);
      } else {
        for (const [id, p] of players) {
          const opt = document.createElement('option');
          opt.value = id;
          opt.textContent = p.name || id;
          sel.appendChild(opt);
        }
      }
    }
    refreshGMServerStatus();
  }

  function refreshGMServerStatus() {
    const el = $('gm-server-status');
    if (!el) return;
    const online = window.MultiplayerClient?.connected;
    const myId = window.MultiplayerClient?.myId;
    const remoteCount = window.MultiplayerClient?._getRemotePlayers()?.size || 0;
    const p = window.GS?.player;
    el.innerHTML = `
      連線狀態：<span>${online ? '已連線' : '連線中'}</span><br/>
      我的 ID：<span>${myId || '--'}</span><br/>
      線上玩家：<span>${remoteCount + (online ? 1 : 0)}</span> 人<br/>
      角色名：<span>${p?.name || '--'}</span><br/>
      等級：<span>Lv.${p?.level || 1}</span><br/>
      金幣：<span>${(window.GS?.resources?.gold || 0).toLocaleString()}</span><br/>
      鑽石：<span>${(window.GS?.resources?.gem || 0).toLocaleString()}</span>
    `;
  }

  function gmAdjustGold(amt, mode) {
    const action = mode === 'set' ? 'setGold' : 'addGold';
    const ctx = getGMContext();
    api('/gm/adjust', { action, value: amt, account: ctx.account, serverId: ctx.serverId, charIdx: ctx.charIdx })
      .then(res => {
        if (res && res.resources && window.GS) {
          GS.resources.gold = res.resources.gold || 0;
          if (window.updateUI) updateUI();
        }
        refreshGMServerStatus();
      })
      .catch(err => alert('操作失敗：' + (err.message || err)));
  }
  function gmAdjustGem(amt, mode) {
    const action = mode === 'set' ? 'setGem' : 'addGem';
    const ctx = getGMContext();
    api('/gm/adjust', { action, value: amt, account: ctx.account, serverId: ctx.serverId, charIdx: ctx.charIdx })
      .then(res => {
        if (res && res.resources && window.GS) {
          GS.resources.gem = res.resources.gem || 0;
          if (window.updateUI) updateUI();
        }
        refreshGMServerStatus();
      })
      .catch(err => alert('操作失敗：' + (err.message || err)));
  }
  function gmSetLevel(lv) {
    const ctx = getGMContext();
    api('/gm/adjust', { action: 'setLevel', value: lv, account: ctx.account, serverId: ctx.serverId, charIdx: ctx.charIdx })
      .then(res => {
        if (res && window.GS && GS.player) {
          GS.player.level = res.level || lv;
          GS.player.expMax = Math.floor(100 * Math.pow(1.3, (res.level || lv) - 1));
          GS.player.exp = 0;
          if (window.recalcStats) recalcStats();
          if (window.updateUI) updateUI();
          if (window.MultiplayerClient) {
            window.MultiplayerClient.updateProfile({
              name: GS.player.name,
              classId: GS.player.classId,
              level: res.level || lv,
              nation: GS.nation,
            });
          }
        }
        refreshGMServerStatus();
      })
      .catch(err => alert('操作失敗：' + (err.message || err)));
  }
  function gmTeleport(mapId) {
    const ctx = getGMContext();
    api('/gm/adjust', { action: 'teleport', mapId: mapId, account: ctx.account, serverId: ctx.serverId, charIdx: ctx.charIdx })
      .then(() => {
        if (typeof window.loadMap === 'function') window.loadMap(mapId);
      })
      .catch(err => alert('操作失敗：' + (err.message || err)));
  }
  function gmGiveItem(itemKey) {
    const map = {
      hp2: { id: 'hp2', count: 100 },
      mp2: { id: 'mp2', count: 100 },
      enhance_scroll: { id: 'enhance_scroll', count: 50 },
      mgem: { id: 'mgem', count: 50 },
      town_scroll: { id: 'town_scroll', count: 20 },
      mystery_chest: { id: 'mystery_chest', count: 10 },
    };
    const info = map[itemKey];
    if (!info) return;
    const ctx = getGMContext();
    api('/gm/adjust', {
      action: 'giveItem',
      itemId: info.id,
      count: info.count,
      account: ctx.account,
      serverId: ctx.serverId,
      charIdx: ctx.charIdx,
    }).then(() => {
      // 發放成功後，從後端重新載入角色存檔以同步背包
      return api('/characters/' + ctx.charIdx + '?server=' + encodeURIComponent(ctx.serverId));
    }).then(res => {
      if (res && res.saveData && window.GS) {
        GS.inventory = res.saveData.inventory || [];
        if (window.renderInventory) renderInventory();
        if (window.updateUI) updateUI();
      }
      refreshGMServerStatus();
    }).catch(err => alert('操作失敗：' + (err.message || err)));
  }
  function gmKickPlayer() {
    const sel = $('gm-player-select');
    if (!sel || !sel.value) return;
    if (!confirm('確定踢出此玩家？')) return;
    api('/gm/kick', { socketId: sel.value })
      .then(() => {
        alert('已踢出');
        refreshGMPanelData();
      })
      .catch(err => alert('操作失敗：' + (err.message || err)));
  }
  function gmLogout() {
    try {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
    } catch (e) {}
    location.reload();
  }

  // ========== 公開 API ==========
  window.AuthSystem = {
    init() {
      // 建立 auth-overlay 元素
      let overlay = $('auth-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'auth-overlay';
        overlay.className = 'auth-overlay';
        document.body.appendChild(overlay);
      }
      // v2.0.2 修正：無論是否有 token，一律先顯示官方首頁
      // 玩家必須主動點擊開始 / 登入 / 註冊按鈕才進入下一步
      // 禁止自動跳轉到伺服器選擇或遊戲畫面
      switchView('home');
      // v2.1.2：啟動時立即進行健康檢查，精準判定連線狀態
      checkServerHealth();
    },
    getToken() {
      try { return localStorage.getItem(STORAGE_TOKEN_KEY) || ''; } catch (e) { return ''; }
    },
    getAccount() {
      try { return localStorage.getItem(STORAGE_ACC_KEY) || ''; } catch (e) { return ''; }
    },
    getCurrentServer() { return currentServer; },
    show() {
      const overlay = $('auth-overlay');
      if (overlay) overlay.classList.remove('hidden');
    },
    hide() {
      const overlay = $('auth-overlay');
      if (overlay) overlay.classList.add('hidden');
    },
    logout() {
      // v2.5.5：登出時徹底清空所有 session、本機存檔與前端狀態
      //   確保下一帳號絕對不會繼承上一帳號的任何資料
      try {
        const acc = getCurrentAccount();
        localStorage.removeItem(STORAGE_TOKEN_KEY);
        localStorage.removeItem(STORAGE_OFFLINE_KEY);
        // 清除角色相關快取
        localStorage.removeItem('mmo_characters');
        localStorage.removeItem('mmo_char_idx');
        localStorage.removeItem('mmo_new_char');
        // v2.5.5：清除「本帳號」所有角色存檔（account_ 前綴）
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k) continue;
          // 舊式 mmo_save_x 全清（跨帳號不安全的格式）
          if (k.startsWith('mmo_save_') && !k.includes('_')) {
            keysToRemove.push(k);
            continue;
          }
          // 本帳號的新格式 mmo_save_account_idx
          if (acc && k.startsWith('mmo_save_' + acc + '_')) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        // 通知 game.js 重置所有 GS 狀態
        if (window.__clearGameState) {
          try { window.__clearGameState(); } catch (e) {}
        }
      } catch (e) { /* ignore */ }
      // 重新整理會回到首頁（init 統一顯示 home）
      location.reload();
    },
    // 返回官方首頁（不清空登入狀態，僅切換檢視）
    goHome() {
      switchView('home');
      const overlay = $('auth-overlay');
      if (overlay) overlay.classList.remove('hidden');
    },
    api,
  };
})();

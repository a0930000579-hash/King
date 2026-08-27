/* ============================================================
    君主之刃 v2.0.9 · 前端帳號系統 / 官方首頁 / 登入 / 註冊 / 伺服器選擇 / GM面板
    對接後端 /api/auth/* 與 Socket.IO 多人連線
    ============================================================ */

(function () {
  'use strict';

  const STORAGE_TOKEN_KEY = 'mmo_token';
  const STORAGE_ACC_KEY = 'mmo_account';
  const STORAGE_OFFLINE_KEY = 'mmo_offline_account';

  // 當前狀態
  let currentView = 'home'; // home | login | register | server | char | charCreate
  let currentServer = null;
  let serverList = [];
  // v2.0.9：連線狀態（online/offline/unknown），方便除錯與營運監控
  let onlineState = 'unknown';

  function setOnlineState(state) {
    onlineState = state;
    // 更新頁面上所有連線狀態標籤
    const labels = document.querySelectorAll('.auth-online-state');
    labels.forEach(l => {
      l.textContent = state === 'online' ? '● 已連線' : state === 'offline' ? '● 未連線伺服器' : '● 連線中';
      l.className = 'auth-online-state ' + state;
    });
    // 通知 game.js（若已載入）
    if (window.__updateOnlineState) {
      try { window.__updateOnlineState(state); } catch (e) {}
    }
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
        // v2.0.9：伺服器有回應但 4xx/5xx → 仍算連得上，只是業務錯誤
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
  async function loadServerList() {
    try {
      const data = await api('/servers');
      serverList = data.servers || [];
      return serverList;
    } catch (e) {
      // 離線模式 fallback：顯示兩個神話伺服器
      serverList = [
        { id: 'zeus', name: '宙斯', desc: '開放 · 順暢', status: 'smooth', players: 0, online: true },
        { id: 'hades', name: '黑帝斯', desc: '準備中 · 即將開放', status: 'maintain', players: 0, online: false },
      ];
      return serverList;
    }
  }

  // ========== 創角頁職業資料與輔助 ==========
  const CC_CLASS_DATA = {
    warrior: { name: '戰士', weapon: '雙手劍', type: '近戰物理', trait: '高血量・高防禦',
      desc: '以強大的鎧甲和體力站在戰場的最前線，利用各種技術將戰鬥帶往勝利。',
      stats: { STR: 15, DEX: 8, INT: 5, CON: 14, LUK: 3 },
      topTransform: '真・暴君戰士' },
    paladin: { name: '騎士', weapon: '劍盾', type: '近戰物理', trait: '坦克・治癒',
      desc: '神聖力量的繼承者，以堅盾與聖光庇護隊友，是隊伍中最可靠的守護者。',
      stats: { STR: 10, DEX: 6, INT: 8, CON: 18, LUK: 3 },
      topTransform: '真・聖光騎士' },
    rogue: { name: '盜賊', weapon: '雙刀', type: '近戰物理', trait: '高爆擊・高閃避',
      desc: '潛伏於暗影中的暗殺者，以迅雷不及掩耳的速度給予敵人致命一擊。',
      stats: { STR: 10, DEX: 16, INT: 4, CON: 10, LUK: 10 },
      topTransform: '真・暗影刺客' },
    archer: { name: '弓手', weapon: '長弓', type: '遠程物理', trait: '高輸出・遠程',
      desc: '百步穿楊的精準射手，從遠處給予敵人穩定而致命的傷害。',
      stats: { STR: 7, DEX: 18, INT: 4, CON: 9, LUK: 12 },
      topTransform: '真・精靈遊俠' },
    mage: { name: '法師', weapon: '法杖', type: '遠程魔法', trait: '高魔攻・範圍',
      desc: '操控元素奧義的智者，以強大的範圍魔法毀滅擋在面前的一切。',
      stats: { STR: 4, DEX: 8, INT: 18, CON: 8, LUK: 12 },
      topTransform: '真・大法師' },
    warlock: { name: '術士', weapon: '權杖', type: '遠程魔法', trait: '召喚・持續傷害',
      desc: '與黑暗締結契約的咒術師，召喚惡魔並以詛咒逐漸吞噬敵人。',
      stats: { STR: 3, DEX: 6, INT: 16, CON: 10, LUK: 15 },
      topTransform: '真・惡魔召喚師' },
  };
  function renderInitStats(classId) {
    const box = $('cc-init-stats');
    if (!box) return;
    const stats = CC_CLASS_DATA[classId]?.stats || CC_CLASS_DATA.warrior.stats;
    const labels = { STR: '力量', DEX: '敏捷', INT: '智力', CON: '體質', LUK: '幸運' };
    box.innerHTML = Object.entries(stats).map(([k,v]) => `
      <div class="cc-init-stat">
        <div class="cc-init-stat-key">${labels[k] || k}</div>
        <div class="cc-init-stat-val">${v}</div>
      </div>
    `).join('');
  }
  function updateTpPreview(classId) {
    const nameEl = $('cc-tp-name');
    const data = CC_CLASS_DATA[classId];
    if (nameEl && data) nameEl.textContent = data.topTransform || '真系列金變';
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
      case 'charCreate': html = renderCharCreate(); break;
    }
    overlay.innerHTML = '<div class="auth-particles"></div>' + html;
    // v2.0.9：滾動回頂（針對長頁官網）
    overlay.scrollTop = 0;
    bindCurrentViewEvents();
  }

  // ========== 官方首頁（天堂M風長頁 / v2.0.9 動畫強化版）==========
  function renderHome() {
    const HERO_IMG = 'https://sf3-scmcdn-cn.feishucdn.com/obj/feishu-static/miaoda/coding-unpkg-sdk-resource/static/aadkr7s6dsyii_ve_miaoda';
    const SCENE_BANNER = 'https://sf3-scmcdn-cn.feishucdn.com/obj/feishu-static/miaoda/coding-unpkg-sdk-resource/static/aadkr7xjuwips_ve_miaoda';
    const TRANSFORM_ROSTER = 'https://sf3-scmcdn-cn.feishucdn.com/obj/feishu-static/miaoda/coding-unpkg-sdk-resource/static/aadkr7xebnybw_ve_miaoda';
    const FEATURE_JOBS = 'https://sf3-scmcdn-cn.feishucdn.com/obj/feishu-static/miaoda/coding-unpkg-sdk-resource/static/aadkr7tpmfoci_ve_miaoda';
    const FEATURE_SIEGE = 'https://sf3-scmcdn-cn.feishucdn.com/obj/feishu-static/miaoda/coding-unpkg-sdk-resource/static/aadkr7t4dqyao_ve_miaoda';
    const FEATURE_TRANSFORM = 'https://sf3-scmcdn-cn.feishucdn.com/obj/feishu-static/miaoda/coding-unpkg-sdk-resource/static/aadkr7uebiicq_ve_miaoda';
    const FEATURE_MULTI = 'https://sf3-scmcdn-cn.feishucdn.com/obj/feishu-static/miaoda/coding-unpkg-sdk-resource/static/aadkr7sju36dq_ve_miaoda';

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
            <!-- PWA 下載遊戲按鈕（取代版本字樣） -->
            <div class="hero-install-row reveal-anim delay4">
              <button class="install-btn" id="btn-install">
                <span class="install-icon">&#8681;</span>
                下 載 遊 戲
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
                <div class="feature-card-desc">戰士 · 法師 · 弓箭手 · 俠客 · 聖騎士 · 盜賊</div>
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
    const items = serverList.map(s => {
      const statusClass = {
        smooth: '順暢', busy: '擁擠', full: '滿員', maintain: '維護'
      }[s.status] || s.status;
      return `
        <div class="server-card ${s.online === false ? 'disabled' : ''}" data-server-id="${s.id}">
          <div class="server-status-dot ${s.status}"></div>
          <div class="server-info">
            <div class="server-name">${s.name}</div>
            <div class="server-desc">${statusClass} · 在線 ${s.players != null ? s.players : '--'} 人</div>
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
  function renderCharSelect() {
    // 從 localStorage 讀取已建立的角色（v2.0 後端會回傳，這裡先用前端緩存）
    let chars = [];
    try {
      const saved = localStorage.getItem('mmo_characters');
      if (saved) chars = JSON.parse(saved);
    } catch (e) {}

    const slots = [];
    for (let i = 0; i < 3; i++) {
      const c = chars[i];
      if (c) {
        slots.push(`
          <div class="char-slot" data-char-idx="${i}">
            <div class="char-avatar-box">
              <span style="font-size:28px;color:#f0c040">◆</span>
            </div>
            <div class="char-details">
              <div class="char-name-row">${escapeHtml(c.name)}</div>
              <div class="char-info-row">Lv.${c.level || 1} · ${escapeHtml(c.className || '戰士')} · ${escapeHtml(c.nationName || '無國籍')}</div>
            </div>
          </div>
        `);
      } else {
        slots.push(`
          <div class="char-slot empty" data-char-idx="${i}" data-create="1">
            + 創建新角色
          </div>
        `);
      }
    }

    return `
      <div class="auth-fullpage">
        <div class="auth-fullpage-inner">
          <div class="auth-back-row">
            <button class="auth-back-btn" id="btn-char-back">‹ 更換伺服器</button>
          </div>
          <div class="char-select-panel">
            <div class="server-select-title">角 色 選 擇</div>
            <div class="server-select-sub">伺服器：${escapeHtml(currentServer?.name || '未知')}</div>
            <div style="margin-top:14px">
              ${slots.join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ========== 角色建立（天堂風六職業選擇） ==========
  function renderCharCreate() {
    const classList = [
      { id: 'warrior',   name: '戰士',   weapon: '雙手劍',   type: '近戰物理', trait: '高血量・高防禦', desc: '以強大的鎧甲和體力站在戰場的最前線，利用各種技術將戰鬥帶往勝利。' },
      { id: 'paladin',   name: '騎士',   weapon: '劍盾',     type: '近戰物理', trait: '坦克・治癒',   desc: '神聖力量的繼承者，以堅盾與聖光庇護隊友，是隊伍中最可靠的守護者。' },
      { id: 'rogue',     name: '盜賊',   weapon: '雙刀',     type: '近戰物理', trait: '高爆擊・高閃避', desc: '潛伏於暗影中的暗殺者，以迅雷不及掩耳的速度給予敵人致命一擊。' },
      { id: 'archer',    name: '弓手',   weapon: '長弓',     type: '遠程物理', trait: '高輸出・遠程',   desc: '百步穿楊的精準射手，從遠處給予敵人穩定而致命的傷害。' },
      { id: 'mage',      name: '法師',   weapon: '法杖',     type: '遠程魔法', trait: '高魔攻・範圍',   desc: '操控元素奧義的智者，以強大的範圍魔法毀滅擋在面前的一切。' },
      { id: 'warlock',   name: '術士',   weapon: '權杖',     type: '遠程魔法', trait: '召喚・持續傷害', desc: '與黑暗締結契約的咒術師，召喚惡魔並以詛咒逐漸吞噬敵人。' },
    ];

    const classBtns = classList.map((c, i) => `
      <div class="cc-class-item ${i === 0 ? 'active' : ''}" data-class-id="${c.id}">
        <div class="cc-class-icon-wrap">
          <div class="cc-class-icon" data-sprite="${c.id}"></div>
        </div>
        <div class="cc-class-name">${c.name}</div>
      </div>
    `).join('');

    const defaultClass = classList[0];
    return `
      <div class="auth-fullpage">
        <div class="char-create-panel">
          <div class="cc-header">
            <button class="auth-back-btn" id="btn-cc-back">‹ 返回</button>
            <div class="cc-title">角 色 創 建</div>
            <div class="auth-online-state unknown" title="連線狀態">● 連線中</div>
          </div>

          <div class="cc-class-row" id="cc-class-row">
            ${classBtns}
          </div>

          <div class="cc-main-area">
            <div class="cc-portrait-col">
              <div class="cc-portrait-frame">
                <div class="cc-portrait-sprite" id="cc-portrait"></div>
                <div class="cc-portrait-glow"></div>
              </div>
              <div class="cc-portrait-name" id="cc-class-name-display">${defaultClass.name}</div>
              <!-- 真系列變身展示（精簡小尺寸） -->
              <div class="cc-transform-mini">
                <div class="cc-tp-mini-sprite" id="cc-tp-sprite"></div>
                <div class="cc-tp-mini-name" id="cc-tp-name">真系列</div>
              </div>
            </div>
            <div class="cc-info-col">
              <div class="cc-class-title" id="cc-class-title">${defaultClass.name}</div>
              <div class="cc-class-desc" id="cc-class-desc">${defaultClass.desc}</div>
              <div class="cc-stats-mini">
                <span><em>${defaultClass.weapon}</em> 主要武器</span>
                <span><em>${defaultClass.type}</em> 戰鬥類型</span>
                <span><em>${defaultClass.trait}</em> 職業特性</span>
              </div>
              <!-- 初始能力值（預設摺疊） -->
              <details class="cc-stats-details">
                <summary>初始能力值</summary>
                <div class="cc-init-grid" id="cc-init-stats"></div>
              </details>
            </div>
          </div>

          <div class="cc-name-section">
            <div class="cc-name-label">請 輸 入 角 色 名 稱</div>
            <div class="cc-name-row">
              <input type="text" id="cc-name-input" class="cc-name-input" maxlength="10" placeholder="允許中/英、數字，2-10 字元" autocomplete="off" />
              <button class="cc-check-btn" id="cc-check-btn">重複確認</button>
            </div>
            <div class="cc-name-status" id="cc-name-status"></div>
          </div>

          <div class="cc-footer">
            <button class="cc-create-btn" id="cc-create-btn" disabled>創 建 角 色</button>
          </div>
        </div>
      </div>
    `;
  }

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
      // 離線模式下也放一個 token 佔位，避免 game.js 報錯
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
    dot.title = '離線模式';
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
                  <div style="font-size:14px;color:#e8d090;letter-spacing:2px;margin-bottom:14px">下載遊戲</div>
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
            if (srv.online === false) {
              // 鎖定伺服器：顯示提示，不進入
              showToast('黑帝斯伺服器準備中，敬請期待');
              return;
            }
            enterServer(srv);
          });
        });
        $('btn-server-back').addEventListener('click', () => switchView('home'));
        break;
      case 'char':
        document.querySelectorAll('.char-slot').forEach(slot => {
          slot.addEventListener('click', () => {
            if (slot.dataset.create === '1') {
              // v2.0.9 修復：進入角色建立頁，不再直接跳進空世界
              switchView('charCreate');
            } else {
              // 載入既有角色
              startGameWithChar(parseInt(slot.dataset.charIdx));
            }
          });
        });
        $('btn-char-back').addEventListener('click', () => switchView('server'));
        break;
      case 'charCreate':
        // 職業選擇切換
        document.querySelectorAll('.cc-class-item').forEach(item => {
          item.addEventListener('click', () => {
            document.querySelectorAll('.cc-class-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const cid = item.dataset.classId;
            const classData = CC_CLASS_DATA[cid];
            if (!classData) return;
            $('cc-class-name-display').textContent = classData.name;
            $('cc-class-title').textContent = classData.name;
            $('cc-class-desc').textContent = classData.desc;
            $('cc-weapon').textContent = classData.weapon;
            $('cc-type').textContent = classData.type;
            $('cc-trait').textContent = classData.trait;
            renderInitStats(cid);
            updateTpPreview(cid);
            // 同步更換立繪
            const portraitEl = $('cc-portrait');
            if (portraitEl && typeof window.SPRITE !== 'undefined') {
              const sp = window.SPRITE[cid];
              if (sp && sp.idle) {
                portraitEl.style.backgroundImage = 'url(' + sp.idle + ')';
              }
            }
          });
        });
        // 名稱輸入
        const nameInput = $('cc-name-input');
        const checkBtn = $('cc-check-btn');
        const createBtn = $('cc-create-btn');
        const nameStatus = $('cc-name-status');
        let nameChecked = false;
        const updateBtnState = () => {
          const v = nameInput.value.trim();
          createBtn.disabled = !(v.length >= 2 && v.length <= 10 && nameChecked);
        };
        nameInput.addEventListener('input', () => {
          nameChecked = false;
          nameStatus.textContent = '';
          updateBtnState();
        });
        checkBtn.addEventListener('click', async () => {
          const v = nameInput.value.trim();
          if (v.length < 2 || v.length > 10) {
            nameStatus.textContent = '名稱長度需 2-10 字元';
            nameStatus.className = 'cc-name-status error';
            return;
          }
          nameStatus.textContent = '檢查中…';
          nameStatus.className = 'cc-name-status';
          try {
            const data = await api('/characters/check-name?name=' + encodeURIComponent(v) + '&server=' + encodeURIComponent(currentServer?.id || ''));
            if (data && data.available) {
              nameChecked = true;
              nameStatus.textContent = '✓ 此名稱可使用';
              nameStatus.className = 'cc-name-status ok';
            } else {
              nameChecked = false;
              nameStatus.textContent = '✗ 此名稱已被使用';
              nameStatus.className = 'cc-name-status error';
            }
          } catch (e) {
            // v2.0.9：後端不可用時顯示錯誤，不允許創建（避免重名漏洞）
            nameChecked = false;
            nameStatus.textContent = '✗ 未連線伺服器（靜態站模式）。需以 Web Service 部署（npm start）才能創建角色';
            nameStatus.className = 'cc-name-status error';
          }
          updateBtnState();
        });
        // 創建按鈕
        createBtn.addEventListener('click', async () => {
          const selected = document.querySelector('.cc-class-item.active');
          const classId = selected ? selected.dataset.classId : 'warrior';
          const name = nameInput.value.trim();
          if (!name || !nameChecked) return;
          // 寫入角色資訊到暫存，讓 game.js 讀取並標記 created=true
          try {
            const newChar = {
              name: name,
              classId: classId,
              level: 1,
              exp: 0,
              created: true,
              createdAt: Date.now(),
              serverId: currentServer?.id || 'zeus',
            };
            // 新增到 mmo_characters 列表
            let chars = [];
            try {
              const raw = localStorage.getItem('mmo_characters');
              if (raw) chars = JSON.parse(raw);
            } catch (e) {}
            chars.push(newChar);
            localStorage.setItem('mmo_characters', JSON.stringify(chars));
            localStorage.setItem('mmo_new_char', JSON.stringify(newChar));
          } catch (e) {}
          // 呼叫後端創建 API（v2.0.9：失敗時阻擋，不直接進遊戲）
          let createOk = false;
          try {
            const result = await api('/characters/create', {
              name: name,
              classId: classId,
              server: currentServer?.id || 'zeus',
            });
            createOk = !!(result && result.ok);
          } catch (e) {
            // 後端不可用：顯示錯誤並阻止進入
            nameStatus.textContent = '✗ 未連線伺服器：' + (e.message || '請以 Web Service 模式部署（npm start）');
            nameStatus.className = 'cc-name-status error';
            createBtn.disabled = false;
            return;
          }
          if (!createOk) {
            nameStatus.textContent = '✗ 創建失敗，請重試';
            nameStatus.className = 'cc-name-status error';
            createBtn.disabled = false;
            return;
          }
          // 進入遊戲世界
          startGameCommon();
        });
        $('btn-cc-back').addEventListener('click', () => switchView('char'));
        // 初始渲染
        renderInitStats('warrior');
        updateTpPreview('warrior');
        // v2.0.9：動態載入職業 icon 圖（從 game.js 的 SPRITE 取 idle 圖）
        setTimeout(() => {
          if (typeof window.SPRITE !== 'undefined' && typeof assetUrl === 'function') {
            document.querySelectorAll('.cc-class-item').forEach(item => {
              const cid = item.dataset.classId;
              const sp = window.SPRITE[cid];
              const iconEl = item.querySelector('.cc-class-icon');
              if (sp && sp.idle && iconEl) {
                iconEl.style.backgroundImage = 'url(' + sp.idle + ')';
              }
            });
            const portraitEl = $('cc-portrait');
            const firstClass = document.querySelector('.cc-class-item.active')?.dataset.classId || 'warrior';
            const sp = window.SPRITE[firstClass];
            if (portraitEl && sp && sp.idle) {
              portraitEl.style.backgroundImage = 'url(' + sp.idle + ')';
            }
          }
        }, 50);
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
  function startGameWithChar(idx) {
    // 從後端載入角色存檔
    api('/characters/' + idx + '?server=' + encodeURIComponent(currentServer?.id || ''))
      .then(data => {
        if (data && data.saveData) {
          // 把存檔塞進 localStorage 讓 game.js 讀
          try {
            localStorage.setItem('mmo_save_' + idx, JSON.stringify(data.saveData));
            localStorage.setItem('mmo_char_idx', String(idx));
          } catch (e) {}
        }
        startGameCommon();
      })
      .catch(() => {
        startGameCommon();
      });
  }

  function startGameCommon() {
    const overlay = $('auth-overlay');
    if (overlay) overlay.classList.add('hidden');

    // 設定遊戲的伺服器位址（同源）
    if (window.MultiplayerClient && currentServer) {
      const serverUrl = window.location.origin;
      // 連線到 socket.io（自動）
      window.MultiplayerClient.connect(serverUrl).catch(() => {
        console.warn('[Auth] 自動連線失敗，退回單機');
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
  // v2.0.3：GM 身分完全以伺服器端 isGM 欄位為準
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
      連線狀態：<span>${online ? '已連線' : '離線'}</span><br/>
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
      try {
        localStorage.removeItem(STORAGE_TOKEN_KEY);
        localStorage.removeItem(STORAGE_OFFLINE_KEY);
      } catch (e) {}
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

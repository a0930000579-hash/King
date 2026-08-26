/* ============================================================
    君主之刃 v2.0.2 · 前端帳號系統 / 官方首頁 / 登入 / 註冊 / 伺服器選擇 / GM面板
    對接後端 /api/auth/* 與 Socket.IO 多人連線
    ============================================================ */

(function () {
  'use strict';

  const STORAGE_TOKEN_KEY = 'mmo_token';
  const STORAGE_ACC_KEY = 'mmo_account';
  const STORAGE_OFFLINE_KEY = 'mmo_offline_account';
  const DEV_PASSWORD = 'owner2026';

  // 當前狀態
  let currentView = 'home'; // home | login | register | server | char
  let currentServer = null;
  let serverList = [];

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
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || ('HTTP ' + res.status));
      err.status = res.status;
      throw err;
    }
    return data;
  }

  // ========== 伺服器列表 ==========
  async function loadServerList() {
    try {
      const data = await api('/servers');
      serverList = data.servers || [];
      return serverList;
    } catch (e) {
      // 離線模式 fallback：顯示一個本機伺服器
      serverList = [
        { id: 'justice', name: '正義伺服器', desc: '新手推薦 · 和平環境', status: 'smooth', players: 0, online: true },
        { id: 'evil', name: '邪惡伺服器', desc: '高手雲集 · 自由 PVP', status: 'busy', players: 0, online: true },
        { id: 'chaos', name: '混亂伺服器', desc: '維護中', status: 'maintain', players: 0, online: false },
      ];
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
    bindCurrentViewEvents();
  }

  // ========== 官方首頁 ==========
  function renderHome() {
    return `
      <div class="home-screen">
        <div class="game-logo-wrap" id="dev-logo-target" style="cursor:pointer">
          <div class="logo-sword">
            <div class="sword-blade"></div>
            <div class="sword-guard"></div>
            <div class="sword-grip"></div>
            <div class="sword-pommel"></div>
          </div>
          <div class="game-title-cn">君主之刃</div>
          <div class="game-title-sub">LINEAGE OF SWORDS</div>
          <div class="game-version-tag" id="dev-version-target">v2.0.2 · 正式營運</div>
        </div>
        <div class="home-btn-row">
          <button class="auth-btn primary" id="btn-start">開 始 遊 戲</button>
          <button class="auth-btn" id="btn-register">註 冊 帳 號</button>
        </div>
        <div style="font-size:10px;color:#5a4a2a;letter-spacing:2px;margin-top:20px">
          點擊開始進入亞丁大陸
        </div>
        <div class="dev-hint-text" id="dev-hint"></div>
      </div>
    `;
  }

  // ========== 登入 ==========
  function renderLogin() {
    return `
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
    `;
  }

  // ========== 註冊 ==========
  function renderRegister() {
    return `
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
      <div class="server-select-panel">
        <div class="server-select-title">選 擇 伺 服 器</div>
        <div class="server-select-sub">請選擇欲進入的世界</div>
        <div class="server-list">
          ${items}
        </div>
        <div class="server-back-row">
          <button class="server-back-btn" id="btn-server-back">‹ 返回</button>
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
      <div class="char-select-panel">
        <div class="server-select-title">角 色 選 擇</div>
        <div class="server-select-sub">伺服器：${escapeHtml(currentServer?.name || '未知')}</div>
        <div style="margin-top:14px">
          ${slots.join('')}
        </div>
        <div class="server-back-row" style="margin-top:14px">
          <button class="server-back-btn" id="btn-char-back">‹ 更換伺服器</button>
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
        justice: { characters: [] },
        evil: { characters: [] },
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

  // ========== 事件綁定 ==========
  function bindCurrentViewEvents() {
    switch (currentView) {
      case 'home':
        const btnStart = $('btn-start');
        const btnReg = $('btn-register');
        if (btnStart) btnStart.addEventListener('click', () => switchView('login'));
        if (btnReg) btnReg.addEventListener('click', () => switchView('register'));
        // 首頁密技：連點版號 7 次 → 輸入密碼 → 下載原始碼彈窗
        bindDevCheat();
        // 背景探測後端狀態（僅探測，不跳轉；v2.0.2 一律顯示首頁）
        probeBackendStatus();
        break;
      case 'login':
        $('btn-login-submit').addEventListener('click', doLogin);
        $('link-register').addEventListener('click', () => switchView('register'));
        $('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
        $('login-account').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
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
        break;
      case 'server':
        document.querySelectorAll('.server-card').forEach(card => {
          card.addEventListener('click', () => {
            if (card.classList.contains('disabled')) return;
            const sid = card.dataset.serverId;
            const srv = serverList.find(s => s.id === sid);
            if (srv) enterServer(srv);
          });
        });
        $('btn-server-back').addEventListener('click', () => switchView('home'));
        break;
      case 'char':
        document.querySelectorAll('.char-slot').forEach(slot => {
          slot.addEventListener('click', () => {
            if (slot.dataset.create === '1') {
              // 創建新角色 → 直接進入遊戲（走原創角流程）
              startGameWithNewChar();
            } else {
              // 載入既有角色
              startGameWithChar(parseInt(slot.dataset.charIdx));
            }
          });
        });
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
          errEl.textContent = '無法連線伺服器，請稍後再試或使用其他帳號';
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
        errEl.textContent = '無法連線伺服器，請稍後再試';
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

  // ========== 開發者密技（首頁） ==========
  // 首頁連點版號或 Logo 7 次 → 輸入密碼 → 顯示下載彈窗（含 <a href download> 大按鈕）
  // v2.0.2 修正：直接走伺服器實體 source.zip，用 <a download> 觸發原生下載，相容內嵌瀏覽器
  function bindDevCheat() {
    const targets = ['dev-version-target', 'dev-logo-target'];
    let taps = 0;
    let tapTimer = null;

    targets.forEach(id => {
      const el = $(id);
      if (!el) return;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        taps++;
        clearTimeout(tapTimer);
        const hint = $('dev-hint');
        if (hint) {
          hint.textContent = `開發者密技：還需 ${Math.max(0, 7 - taps)} 次`;
          hint.classList.add('show');
        }
        if (taps >= 7) {
          taps = 0;
          if (hint) hint.classList.remove('show');
          showDevPasswordModal();
          return;
        }
        tapTimer = setTimeout(() => {
          taps = 0;
          if (hint) hint.classList.remove('show');
        }, 1500);
      });
    });
  }

  function showDevPasswordModal() {
    // 如果已經有 modal 就不重開
    if ($('dev-pw-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'dev-pw-modal';
    modal.className = 'dev-pw-modal';
    modal.innerHTML = `
      <div class="dev-pw-box">
        <div class="dev-pw-title">開發者後台</div>
        <div class="dev-pw-desc">請輸入開發者密碼以下載完整原始碼</div>
        <input type="password" class="dev-pw-input" id="dev-pw-input" placeholder="請輸入密碼" autocomplete="off" />
        <div class="dev-pw-error" id="dev-pw-error"></div>
        <div class="dev-pw-btn-row">
          <button class="auth-btn" id="dev-pw-cancel">取消</button>
          <button class="auth-btn primary" id="dev-pw-confirm">確認</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    const input = $('dev-pw-input');
    if (input) setTimeout(() => input.focus(), 50);
    
    $('dev-pw-cancel').addEventListener('click', () => modal.remove());
    $('dev-pw-confirm').addEventListener('click', () => {
      const val = $('dev-pw-input').value;
      if (val === DEV_PASSWORD) {
        modal.remove();
        showSourceDownloadModal();
      } else {
        const err = $('dev-pw-error');
        if (err) err.textContent = '密碼錯誤';
      }
    });
    $('dev-pw-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') $('dev-pw-confirm').click();
    });
    // 點擊背景關閉
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  // ========== 原始碼下載彈窗（直接 a[download] 走伺服器實體檔） ==========
  function showSourceDownloadModal() {
    if ($('src-dl-modal')) return;
    const zipUrl = 'source.zip?v=v2.0.2';
    const fullUrl = new URL(zipUrl, location.href).href;
    const filename = 'sword-lineage-v2.0.2_fullstack.zip';

    const modal = document.createElement('div');
    modal.id = 'src-dl-modal';
    modal.className = 'src-dl-modal';
    modal.innerHTML = `
      <div class="src-dl-box">
        <div class="src-dl-icon">
          <div class="src-dl-zip-badge">ZIP</div>
        </div>
        <div class="src-dl-title">君主之刃 v2.0.2 全棧原始碼</div>
        <div class="src-dl-sub">包含前端完整檔案 + Node.js 後端 + README</div>
        <div class="src-dl-file-info">
          <span>檔案格式：.zip</span>
          <span>全棧版 · 可直接部署</span>
        </div>
        <a class="src-dl-main-btn" href="${fullUrl}" download="${filename}" id="src-dl-main-a">
          <span class="src-dl-btn-arrow">↓</span>
          <span class="src-dl-btn-text">下 載 v2.0.2 原 始 碼 ZIP</span>
        </a>
        <div class="src-dl-tip">
          點擊上方按鈕直接下載。如彈出新頁面，請長按連結選擇「下載連結」
        </div>
        <div class="src-dl-url-row">
          <span class="src-dl-url-label">檔案位置：</span>
          <span class="src-dl-url-text">/source.zip</span>
        </div>
        <button class="src-dl-close-btn" id="src-dl-close">關 閉</button>
      </div>
    `;
    document.body.appendChild(modal);

    $('src-dl-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  // ========== 開始遊戲 ==========
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
  function checkGMStatus() {
    api('/auth/me').then(data => {
      if (data && data.isGM) {
        initGMPanel();
      }
    }).catch(() => {
      // 後端不可用 → 檢查帳號是否為 19811013
      try {
        const acc = localStorage.getItem(STORAGE_ACC_KEY);
        if (acc === '19811013') {
          initGMPanel();
        }
      } catch (e) {}
    });
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
            <option value="village">古魯丁村莊</option>
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
    if (!window.GS) return;
    if (mode === 'set') {
      GS.resources.gold = amt;
    } else {
      GS.resources.gold += amt;
    }
    if (window.updateUI) updateUI();
    refreshGMServerStatus();
  }
  function gmAdjustGem(amt, mode) {
    if (!window.GS) return;
    if (mode === 'set') {
      GS.resources.gem = amt;
    } else {
      GS.resources.gem += amt;
    }
    if (window.updateUI) updateUI();
    refreshGMServerStatus();
  }
  function gmSetLevel(lv) {
    if (!window.GS || !window.GS.player) return;
    lv = Math.max(1, Math.min(99, lv));
    GS.player.level = lv;
    // 重新計算屬性
    GS.player.expMax = Math.floor(100 * Math.pow(1.3, lv - 1));
    GS.player.exp = 0;
    if (window.recalcStats) recalcStats();
    if (window.updateUI) updateUI();
    if (window.MultiplayerClient) {
      window.MultiplayerClient.updateProfile({
        name: GS.player.name,
        classId: GS.player.classId,
        level: lv,
        nation: GS.nation,
      });
    }
    refreshGMServerStatus();
  }
  function gmTeleport(mapId) {
    if (typeof window.loadMap === 'function') {
      window.loadMap(mapId);
    }
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
    if (!info || !window.addToInventory) return;
    const itemDef = (window.GS?.inventory?.[0] || {}); // 從目錄找
    // 直接用 addToInventory
    const iconMap = window.ITEM_ICONS || {};
    addToInventory({
      id: info.id,
      name: info.id,
      type: 'consumable',
      itemType: 'consumable',
      rarity: 'green',
      icon: iconMap[info.id] || iconMap.hp1 || '',
      count: info.count,
      effect: {},
    }, info.count);
    refreshGMServerStatus();
  }
  function gmKickPlayer() {
    const sel = $('gm-player-select');
    if (!sel || !sel.value) return;
    if (window.MultiplayerClient?.kickPlayer) {
      window.MultiplayerClient.kickPlayer(sel.value);
    }
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

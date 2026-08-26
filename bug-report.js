/* ============================================================
   君主之刃 · Bug 回報與開發者後台模組
   設計原則：
     1. 全程繁體中文，無 emoji，無 SVG
     2. 不破壞任何既有遊戲功能
     3. Bug 回報預設寫入 localStorage，並嘗試呼叫後端 API
        若應用升級為全棧版本（有 /api/bug-report），自動切換為真·後端存儲
     4. 開發者後台透過「設定頁連點版本號 7 次 + 密碼」進入
   ============================================================ */

(function () {
  'use strict';

  const GAME_VERSION = 'v2.0.2';
  const DEV_PWD_KEY = 'bh_dev_password';
  const DEFAULT_DEV_PASSWORD = 'owner2026';
  const BUG_STORAGE_KEY = 'bug_reports';
  const MAX_ERROR_LOGS = 30;

  // 快取最近的 JS 錯誤
  const errorLogs = [];

  // 攔截 console.error
  const origConsoleError = console.error;
  console.error = function () {
    try {
      const msg = Array.prototype.slice.call(arguments).map(function (a) {
        if (a instanceof Error) return a.message + '\n' + (a.stack || '');
        if (typeof a === 'object') {
          try { return JSON.stringify(a); } catch (e) { return String(a); }
        }
        return String(a);
      }).join(' ');
      errorLogs.unshift({ t: Date.now(), msg: msg.slice(0, 1000) });
      if (errorLogs.length > MAX_ERROR_LOGS) errorLogs.length = MAX_ERROR_LOGS;
    } catch (e) { /* ignore */ }
    origConsoleError.apply(console, arguments);
  };

  // 攔截 window.onerror / unhandledrejection
  if (typeof window !== 'undefined') {
    window.addEventListener('error', function (e) {
      try {
        errorLogs.unshift({
          t: Date.now(),
          msg: (e.message || 'unknown error') + '\n' + (e.filename || '') + ':' + (e.lineno || '') + ':' + (e.colno || ''),
        });
        if (errorLogs.length > MAX_ERROR_LOGS) errorLogs.length = MAX_ERROR_LOGS;
      } catch (err) { /* ignore */ }
    }, true);
    window.addEventListener('unhandledrejection', function (e) {
      try {
        const reason = e.reason;
        const msg = reason instanceof Error
          ? (reason.message + '\n' + (reason.stack || ''))
          : String(reason || 'unhandled promise rejection');
        errorLogs.unshift({ t: Date.now(), msg: msg.slice(0, 1000) });
        if (errorLogs.length > MAX_ERROR_LOGS) errorLogs.length = MAX_ERROR_LOGS;
      } catch (err) { /* ignore */ }
    }, true);
  }

  // ====== 工具 ======
  function get$(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function getDeviceInfo() {
    const ua = navigator.userAgent || '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    return {
      userAgent: ua,
      platform: navigator.platform || '',
      language: navigator.language || '',
      screen: (window.screen ? (screen.width + 'x' + screen.height) : ''),
      viewport: window.innerWidth + 'x' + window.innerHeight,
      isMobile: isMobile,
      isIOS: isIOS,
    };
  }

  function getPlayerInfo() {
    const GS = window.GS || {};
    const p = GS.player || {};
    return {
      name: p.name || '(未命名)',
      level: p.level || 1,
      classId: p.classId || 'warrior',
      mapId: GS.currentMap || 'village',
    };
  }

  // ====== 本地存儲（備援） ======
  function loadLocalReports() {
    try {
      const raw = localStorage.getItem(BUG_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function saveLocalReports(list) {
    try { localStorage.setItem(BUG_STORAGE_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }

  // ====== 後端 API 偵測 ======
  const MP_SERVER_URL_KEY = 'mp_server_url'; // 與多人連線模組共用的 localStorage key

  function getMultiplayerServerUrl() {
    try {
      const url = localStorage.getItem(MP_SERVER_URL_KEY) || '';
      return url.trim();
    } catch (e) { return ''; }
  }

  function getBackendBase() {
    // 優先使用多人連線設定的同一個伺服器位址（跨網域）
    const mpUrl = getMultiplayerServerUrl();
    if (mpUrl) {
      // 去掉結尾的 / 與 socket.io 路徑，確保是 origin
      try {
        const u = new URL(mpUrl);
        return u.origin + '/api';
      } catch (e) {
        // 無法解析就當作一般字串處理
        const base = mpUrl.replace(/\/+$/, '').replace(/\/socket\.io.*$/, '');
        return base + '/api';
      }
    }
    // 降級：同源相對路徑（全棧應用升級後 /api 在同源）
    return (location.origin || '') + '/api';
  }

  function isBackendExternal() {
    return !!getMultiplayerServerUrl();
  }

  async function checkBackendAvailable() {
    try {
      const res = await fetch(getBackendBase() + '/bug-report/ping', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return res.ok;
    } catch (e) { return false; }
  }

  async function submitToBackend(report) {
    try {
      const res = await fetch(getBackendBase() + '/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
      if (!res.ok) throw new Error('backend status ' + res.status);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async function fetchFromBackend(password) {
    try {
      const res = await fetch(getBackendBase() + '/bug-report/list', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-password': password || '',
        },
      });
      if (!res.ok) throw new Error('backend status ' + res.status);
      const data = await res.json();
      return { ok: true, list: data.list || data.data || [] };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async function deleteFromBackend(id, password) {
    try {
      const res = await fetch(getBackendBase() + '/bug-report/' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-password': password || '',
        },
      });
      return res.ok;
    } catch (e) { return false; }
  }

  async function clearAllBackend(password) {
    try {
      const res = await fetch(getBackendBase() + '/bug-report/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-password': password || '',
        },
      });
      return res.ok;
    } catch (e) { return false; }
  }

  // ====== Bug 回報提交 ======
  async function submitBugReport(description) {
    const player = getPlayerInfo();
    const device = getDeviceInfo();
    const report = {
      id: 'br_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      createdAt: new Date().toISOString(),
      description: String(description || '').slice(0, 2000),
      version: GAME_VERSION,
      player: player,
      device: device,
      errors: errorLogs.slice(0, 10),
      pageUrl: location.href,
    };

    // 優先寫後端
    const backendResult = await submitToBackend(report);
    if (backendResult.ok) {
      return { ok: true, source: 'backend' };
    }

    // 後端不可用，寫入本地 localStorage 作為備援
    const list = loadLocalReports();
    list.unshift(report);
    if (list.length > 200) list.length = 200;
    saveLocalReports(list);
    return { ok: true, source: 'local', note: '後端未連接，已暫存於本機' };
  }

  // ====== 開發者密碼 ======
  function getDevPassword() {
    try {
      return localStorage.getItem(DEV_PWD_KEY) || DEFAULT_DEV_PASSWORD;
    } catch (e) { return DEFAULT_DEV_PASSWORD; }
  }

  function setDevPassword(pwd) {
    try { localStorage.setItem(DEV_PWD_KEY, pwd || DEFAULT_DEV_PASSWORD); } catch (e) { /* ignore */ }
  }

  function verifyPassword(input) {
    return String(input || '') === getDevPassword();
  }

  // ====== 開發者後台狀態 ======
  let devUnlocked = false;
  let devBackendAvailable = null; // null=未偵測, true/false
  let currentReports = [];

  // ====== DOM：Bug 回報視窗 ======
  function ensureBugModal() {
    if (get$('bug-report-modal')) return;
    const html = '' +
      '<div class="bug-report-modal" id="bug-report-modal" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.7);align-items:center;justify-content:center">' +
      '  <div style="background:rgba(20,14,8,0.98);border:2px solid #c9a24a;border-radius:10px;padding:16px 20px;width:360px;max-width:90vw;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.8)">' +
      '    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">' +
      '      <span style="font-size:15px;font-weight:700;color:#e8c878;letter-spacing:1px">Bug 回報</span>' +
      '      <button id="bug-modal-close" style="background:none;border:none;color:#c9a24a;font-size:16px;cursor:pointer;padding:0 4px">✕</button>' +
      '    </div>' +
      '    <div style="font-size:11px;color:#a89060;margin-bottom:8px;line-height:1.5">請詳述問題發生的情況，系統將自動夾帶診斷資訊協助除錯。</div>' +
      '    <textarea id="bug-report-text" placeholder="例如：在村莊與NPC對話後，點擊任務按鈕沒有反應..." style="flex:1;min-height:120px;padding:8px;background:rgba(0,0,0,0.5);border:1px solid #8b6914;border-radius:4px;color:#f0e2c0;font-size:12px;font-family:inherit;resize:vertical;line-height:1.5"></textarea>' +
      '    <div id="bug-report-status" style="font-size:11px;color:#a89060;margin-top:8px;min-height:16px;text-align:center"></div>' +
      '    <div style="display:flex;gap:8px;margin-top:10px">' +
      '      <button id="bug-submit-btn" style="flex:1;padding:8px;background:linear-gradient(180deg,#c9a24a,#7a5c1a);color:#fff;border:1px solid #c9a24a;border-radius:4px;font-size:12px;font-weight:600;cursor:pointer;text-shadow:1px 1px 2px rgba(0,0,0,0.5)">送出回報</button>' +
      '      <button id="bug-cancel-btn" style="padding:8px 16px;background:rgba(40,28,16,0.8);color:#c9a24a;border:1px solid #8b6914;border-radius:4px;font-size:12px;cursor:pointer">取消</button>' +
      '    </div>' +
      '  </div>' +
      '</div>';
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper.firstElementChild);

    get$('bug-modal-close').addEventListener('click', closeBugModal);
    get$('bug-cancel-btn').addEventListener('click', closeBugModal);
    get$('bug-report-modal').addEventListener('click', function (e) {
      if (e.target.id === 'bug-report-modal') closeBugModal();
    });
    get$('bug-submit-btn').addEventListener('click', onBugSubmit);
  }

  function openBugModal() {
    ensureBugModal();
    const modal = get$('bug-report-modal');
    const textarea = get$('bug-report-text');
    const status = get$('bug-report-status');
    if (textarea) textarea.value = '';
    if (status) status.textContent = '';
    modal.style.display = 'flex';
    if (textarea) setTimeout(function () { textarea.focus(); }, 50);
  }

  function closeBugModal() {
    const modal = get$('bug-report-modal');
    if (modal) modal.style.display = 'none';
  }

  async function onBugSubmit() {
    const textarea = get$('bug-report-text');
    const status = get$('bug-report-status');
    const btn = get$('bug-submit-btn');
    const desc = textarea ? textarea.value.trim() : '';
    if (!desc) {
      if (status) { status.style.color = '#d4726a'; status.textContent = '請描述遇到的問題'; }
      return;
    }
    if (btn) { btn.disabled = true; btn.textContent = '送出中...'; }
    if (status) { status.style.color = '#a89060'; status.textContent = '正在送出回報...'; }

    try {
      const result = await submitBugReport(desc);
      if (result.ok) {
        if (status) { status.style.color = '#7bbf6a'; status.textContent = '回報已送出，感謝協助'; }
        setTimeout(function () {
          closeBugModal();
          if (btn) { btn.disabled = false; btn.textContent = '送出回報'; }
        }, 1500);
      } else {
        if (status) { status.style.color = '#d4726a'; status.textContent = '送出失敗，請稍後再試'; }
        if (btn) { btn.disabled = false; btn.textContent = '送出回報'; }
      }
    } catch (e) {
      if (status) { status.style.color = '#d4726a'; status.textContent = '送出失敗：' + e.message; }
      if (btn) { btn.disabled = false; btn.textContent = '送出回報'; }
    }
  }

  // ====== DOM：密碼彈窗 ======
  function ensurePwdModal() {
    if (get$('dev-pwd-modal')) return;
    const html = '' +
      '<div class="dev-pwd-modal" id="dev-pwd-modal" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.75);align-items:center;justify-content:center">' +
      '  <div style="background:rgba(20,14,8,0.98);border:2px solid #c9a24a;border-radius:10px;padding:20px 24px;width:320px;max-width:90vw;box-shadow:0 10px 40px rgba(0,0,0,0.8)">' +
      '    <div style="font-size:14px;font-weight:700;color:#e8c878;letter-spacing:1px;margin-bottom:10px">開發者驗證</div>' +
      '    <div style="font-size:11px;color:#a89060;margin-bottom:12px;line-height:1.5">請輸入開發者密碼以進入後台。</div>' +
      '    <input type="password" id="dev-pwd-input" placeholder="輸入密碼" style="width:100%;padding:8px;background:rgba(0,0,0,0.5);border:1px solid #8b6914;border-radius:4px;color:#f0e2c0;font-size:12px;font-family:inherit;box-sizing:border-box" />' +
      '    <div id="dev-pwd-status" style="font-size:11px;color:#d4726a;margin-top:8px;min-height:16px;text-align:center"></div>' +
      '    <div style="display:flex;gap:8px;margin-top:12px">' +
      '      <button id="dev-pwd-confirm" style="flex:1;padding:8px;background:linear-gradient(180deg,#c9a24a,#7a5c1a);color:#fff;border:1px solid #c9a24a;border-radius:4px;font-size:12px;font-weight:600;cursor:pointer">確認</button>' +
      '      <button id="dev-pwd-cancel" style="padding:8px 16px;background:rgba(40,28,16,0.8);color:#c9a24a;border:1px solid #8b6914;border-radius:4px;font-size:12px;cursor:pointer">取消</button>' +
      '    </div>' +
      '  </div>' +
      '</div>';
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper.firstElementChild);

    get$('dev-pwd-cancel').addEventListener('click', closePwdModal);
    get$('dev-pwd-modal').addEventListener('click', function (e) {
      if (e.target.id === 'dev-pwd-modal') closePwdModal();
    });
    get$('dev-pwd-confirm').addEventListener('click', onPwdConfirm);
    get$('dev-pwd-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') onPwdConfirm();
    });
  }

  function openPwdModal() {
    ensurePwdModal();
    const modal = get$('dev-pwd-modal');
    const input = get$('dev-pwd-input');
    const status = get$('dev-pwd-status');
    if (input) input.value = '';
    if (status) status.textContent = '';
    modal.style.display = 'flex';
    if (input) setTimeout(function () { input.focus(); }, 50);
  }

  function closePwdModal() {
    const modal = get$('dev-pwd-modal');
    if (modal) modal.style.display = 'none';
  }

  function onPwdConfirm() {
    const input = get$('dev-pwd-input');
    const status = get$('dev-pwd-status');
    const pwd = input ? input.value : '';
    if (verifyPassword(pwd)) {
      devUnlocked = true;
      closePwdModal();
      openDevPanel();
    } else {
      if (status) status.textContent = '密碼錯誤';
    }
  }

  // ====== DOM：開發者後台 ======
  function ensureDevPanel() {
    if (get$('dev-panel')) return;
    const html = '' +
      '<div class="dev-panel" id="dev-panel" style="display:none;position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,0.75);align-items:center;justify-content:center">' +
      '  <div style="background:rgba(20,14,8,0.98);border:2px solid #c9a24a;border-radius:10px;width:560px;max-width:92vw;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.8)">' +
      '    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid rgba(139,105,20,0.3)">' +
      '      <span style="font-size:15px;font-weight:700;color:#e8c878;letter-spacing:1px">開發者後台</span>' +
      '      <button id="dev-panel-close" style="background:none;border:none;color:#c9a24a;font-size:16px;cursor:pointer;padding:0 4px">✕</button>' +
      '    </div>' +
      '    <div class="dev-tabs" style="display:flex;border-bottom:1px solid rgba(139,105,20,0.3)">' +
      '      <button class="dev-tab active" data-tab="bugs" style="flex:1;padding:10px;background:none;border:none;color:#a89060;font-size:12px;cursor:pointer;font-family:inherit;border-bottom:2px solid transparent">Bug 回報列表</button>' +
      '      <button class="dev-tab" data-tab="export" style="flex:1;padding:10px;background:none;border:none;color:#a89060;font-size:12px;cursor:pointer;font-family:inherit;border-bottom:2px solid transparent">原始碼匯出</button>' +
      '      <button class="dev-tab" data-tab="settings" style="flex:1;padding:10px;background:none;border:none;color:#a89060;font-size:12px;cursor:pointer;font-family:inherit;border-bottom:2px solid transparent">後台設定</button>' +
      '    </div>' +
      '    <div class="dev-tab-content" id="dev-tab-bugs" style="flex:1;overflow-y:auto;padding:14px 20px;display:block">' +
      '      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
      '        <div style="font-size:11px;color:#a89060">' +
      '          來源：<span id="dev-data-source" style="color:#e8c878;font-weight:600">偵測中</span>' +
      '          <span id="dev-count" style="margin-left:10px">共 0 筆</span>' +
      '        </div>' +
      '        <div style="display:flex;gap:6px">' +
      '          <button id="dev-refresh-btn" style="padding:4px 10px;background:rgba(40,28,16,0.8);color:#c9a24a;border:1px solid #8b6914;border-radius:4px;font-size:11px;cursor:pointer">重新整理</button>' +
      '          <button id="dev-clear-btn" style="padding:4px 10px;background:rgba(120,30,20,0.6);color:#f0c8c0;border:1px solid #8b3020;border-radius:4px;font-size:11px;cursor:pointer">全部清空</button>' +
      '        </div>' +
      '      </div>' +
      '      <div id="dev-bug-list" style="display:flex;flex-direction:column;gap:8px"></div>' +
      '    </div>' +
      '    <div class="dev-tab-content" id="dev-tab-export" style="flex:1;overflow-y:auto;padding:14px 20px;display:none">' +
      '      <div style="font-size:12px;color:#e8c878;font-weight:600;margin-bottom:8px">下載完整原始碼</div>' +
      '      <div style="font-size:11px;color:#a89060;margin-bottom:12px;line-height:1.6">包含最新版遊戲全部檔案：index.html、css/styles.css、js/game.js、js/multiplayer.js 與其他模組。</div>' +
      '      <div style="display:flex;flex-direction:column;gap:8px">' +
      '        <button id="dev-download-src-btn" style="padding:10px;background:linear-gradient(180deg,#c9a24a,#7a5c1a);color:#fff;border:1px solid #c9a24a;border-radius:4px;font-size:13px;font-weight:600;cursor:pointer;text-shadow:1px 1px 2px rgba(0,0,0,0.5)">下載原始碼 ZIP</button>' +
      '        <div style="font-size:10px;color:#a89060;line-height:1.5">' +
      '          桌面版：動態打包確保內容最新；行動裝置：使用預先打包的靜態 source.zip。' +
      '        </div>' +
      '        <div style="margin-top:6px;padding:8px;background:rgba(0,0,0,0.3);border:1px solid rgba(139,105,20,0.2);border-radius:4px">' +
      '          <div style="font-size:11px;color:#c9a24a;font-weight:600;margin-bottom:4px">打包清單</div>' +
      '          <div style="font-size:10px;color:#a89060;line-height:1.6">' +
      '            index.html ｜ css/styles.css ｜ js/game.js ｜ js/lang.js ｜ js/transform.js ｜ js/audio.js ｜ js/audio-manager.js ｜ js/iso-map.js ｜ js/sprite_object.js ｜ js/multiplayer.js' +
      '          </div>' +
      '        </div>' +
      '      </div>' +
      '    </div>' +
      '    <div class="dev-tab-content" id="dev-tab-settings" style="flex:1;overflow-y:auto;padding:14px 20px;display:none">' +
      '      <div style="font-size:12px;color:#e8c878;font-weight:600;margin-bottom:10px">變更開發者密碼</div>' +
      '      <div style="font-size:11px;color:#a89060;margin-bottom:8px">輸入新密碼後按下確認，密碼會保存於本機。</div>' +
      '      <div style="display:flex;gap:6px;margin-bottom:6px">' +
      '        <input type="password" id="dev-new-pwd" placeholder="新密碼" style="flex:1;padding:6px 8px;background:rgba(0,0,0,0.5);border:1px solid #8b6914;border-radius:4px;color:#f0e2c0;font-size:12px;font-family:inherit" />' +
      '        <button id="dev-change-pwd-btn" style="padding:6px 14px;background:rgba(40,28,16,0.8);color:#c9a24a;border:1px solid #8b6914;border-radius:4px;font-size:11px;cursor:pointer">確認變更</button>' +
      '      </div>' +
      '      <div id="dev-pwd-change-status" style="font-size:10px;color:#a89060;min-height:14px"></div>' +
      '      <div style="margin-top:14px;padding-top:10px;border-top:1px solid rgba(139,105,20,0.3)">' +
      '        <div style="font-size:12px;color:#e8c878;font-weight:600;margin-bottom:6px">後台版本</div>' +
      '        <div style="font-size:11px;color:#a89060">' +
      '          遊戲版本：<span style="color:#f0e2c0">' + escapeHtml(GAME_VERSION) + '</span><br/>' +
      '          後端狀態：<span id="dev-backend-status" style="color:#f0e2c0">偵測中</span>' +
      '        </div>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '</div>';
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper.firstElementChild);

    get$('dev-panel-close').addEventListener('click', closeDevPanel);
    get$('dev-panel').addEventListener('click', function (e) {
      if (e.target.id === 'dev-panel') closeDevPanel();
    });

    // tabs
    document.querySelectorAll('.dev-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        const name = tab.dataset.tab;
        document.querySelectorAll('.dev-tab').forEach(function (t) {
          const active = t === tab;
          t.classList.toggle('active', active);
          t.style.color = active ? '#e8c878' : '#a89060';
          t.style.borderBottomColor = active ? '#c9a24a' : 'transparent';
        });
        ['bugs', 'export', 'settings'].forEach(function (n) {
          const el = get$('dev-tab-' + n);
          if (el) el.style.display = n === name ? 'block' : 'none';
        });
        if (name === 'bugs') refreshBugList();
      });
      // init style
      const active = tab.classList.contains('active');
      tab.style.color = active ? '#e8c878' : '#a89060';
      tab.style.borderBottomColor = active ? '#c9a24a' : 'transparent';
    });

    get$('dev-refresh-btn').addEventListener('click', refreshBugList);
    get$('dev-clear-btn').addEventListener('click', onClearAll);
    get$('dev-change-pwd-btn').addEventListener('click', onChangePwd);
    get$('dev-download-src-btn').addEventListener('click', onDevDownloadSrc);
  }

  function openDevPanel() {
    ensureDevPanel();
    const panel = get$('dev-panel');
    panel.style.display = 'flex';
    refreshBugList();
    detectBackend();
  }

  function closeDevPanel() {
    const panel = get$('dev-panel');
    if (panel) panel.style.display = 'none';
  }

  async function detectBackend() {
    const statusEl = get$('dev-backend-status');
    const srcEl = get$('dev-data-source');
    const available = await checkBackendAvailable();
    devBackendAvailable = available;
    if (statusEl) {
      statusEl.textContent = available ? '已連接（後端存儲）' : '未連接（本機存儲）';
      statusEl.style.color = available ? '#7bbf6a' : '#d4726a';
    }
    if (srcEl) {
      srcEl.textContent = available ? '後端資料庫' : '本機 localStorage';
    }
  }

  async function refreshBugList() {
    const listEl = get$('dev-bug-list');
    const countEl = get$('dev-count');
    if (!listEl) return;
    listEl.innerHTML = '<div style="text-align:center;color:#a89060;font-size:11px;padding:20px">載入中...</div>';

    const pwd = getDevPassword();
    let reports = [];
    let source = 'local';

    if (devBackendAvailable === true) {
      const res = await fetchFromBackend(pwd);
      if (res.ok) { reports = res.list; source = 'backend'; }
      else { reports = loadLocalReports(); source = 'local (後端讀取失敗)'; }
    } else {
      reports = loadLocalReports();
      source = 'local';
    }

    currentReports = reports || [];
    if (countEl) countEl.textContent = '共 ' + currentReports.length + ' 筆';
    const srcEl = get$('dev-data-source');
    if (srcEl) srcEl.textContent = source;

    renderBugList();
  }

  function renderBugList() {
    const listEl = get$('dev-bug-list');
    if (!listEl) return;
    if (!currentReports || currentReports.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;color:#a89060;font-size:11px;padding:20px">尚無 Bug 回報</div>';
      return;
    }

    listEl.innerHTML = currentReports.map(function (r, idx) {
      const p = r.player || {};
      const d = r.device || {};
      const errCount = (r.errors && r.errors.length) || 0;
      const time = r.createdAt ? new Date(r.createdAt).toLocaleString('zh-TW') : '';
      return '' +
        '<div class="bug-item" data-idx="' + idx + '" style="background:rgba(0,0,0,0.35);border:1px solid rgba(139,105,20,0.3);border-radius:6px;padding:10px 12px">' +
        '  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">' +
        '    <div style="flex:1;min-width:0">' +
        '      <div style="font-size:11px;color:#e8c878;font-weight:600;word-break:break-word;line-height:1.4">' + escapeHtml(r.description || '(無描述)') + '</div>' +
        '      <div style="font-size:10px;color:#a89060;margin-top:4px">' +
        '        <span>' + escapeHtml(p.name || '?') + ' Lv.' + (p.level || '?') + ' ' + escapeHtml(p.classId || '') + '</span>' +
        '        <span style="margin:0 6px">·</span>' +
        '        <span>地圖：' + escapeHtml(p.mapId || '?') + '</span>' +
        '        <span style="margin:0 6px">·</span>' +
        '        <span>' + escapeHtml(time) + '</span>' +
        '      </div>' +
        '    </div>' +
        '    <button class="bug-delete-btn" data-id="' + escapeHtml(r.id || '') + '" style="flex-shrink:0;padding:3px 8px;background:rgba(120,30,20,0.5);color:#f0c8c0;border:1px solid #8b3020;border-radius:4px;font-size:10px;cursor:pointer">刪除</button>' +
        '  </div>' +
        '  <div style="font-size:10px;color:#8a7a58;line-height:1.5;word-break:break-all">' +
        '    版本：' + escapeHtml(r.version || '-') + ' ｜ ' +
        '    裝置：' + escapeHtml(d.platform || '-') + ' ｜ ' +
        '    畫面：' + escapeHtml(d.viewport || '-') + ' ｜ ' +
        '    錯誤數：' + errCount +
        '  </div>' +
        '  <div class="bug-detail" style="margin-top:8px;padding-top:8px;border-top:1px dashed rgba(139,105,20,0.25);display:none">' +
        '    <div style="font-size:10px;color:#c9a24a;font-weight:600;margin-bottom:4px">使用者代理</div>' +
        '    <div style="font-size:9px;color:#a89060;line-height:1.5;word-break:break-all;margin-bottom:8px">' + escapeHtml(d.userAgent || '-') + '</div>' +
        '    <div style="font-size:10px;color:#c9a24a;font-weight:600;margin-bottom:4px">錯誤紀錄</div>' +
        '    <div style="font-size:9px;color:#d4726a;line-height:1.5;word-break:break-all;max-height:120px;overflow-y:auto">' +
        (errCount > 0
          ? (r.errors || []).map(function (e) {
              return '<div style="margin-bottom:4px">[' + new Date(e.t).toLocaleTimeString('zh-TW') + '] ' + escapeHtml(e.msg || '').replace(/\n/g, '<br/>') + '</div>';
            }).join('')
          : '<div style="color:#8a7a58">無錯誤紀錄</div>') +
        '    </div>' +
        '  </div>' +
        '  <button class="bug-toggle-detail" style="margin-top:6px;background:none;border:none;color:#8b6914;font-size:10px;cursor:pointer;padding:0">顯示詳情 ▾</button>' +
        '</div>';
    }).join('');

    // 繫結事件
    listEl.querySelectorAll('.bug-toggle-detail').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const item = btn.closest('.bug-item');
        const detail = item.querySelector('.bug-detail');
        const expanded = detail.style.display === 'block';
        detail.style.display = expanded ? 'none' : 'block';
        btn.textContent = expanded ? '顯示詳情 ▾' : '收合詳情 ▴';
      });
    });
    listEl.querySelectorAll('.bug-delete-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const id = btn.dataset.id;
        onDeleteBug(id);
      });
    });
  }

  async function onDeleteBug(id) {
    if (!id) return;
    if (!confirm('確定刪除此筆回報？')) return;
    const pwd = getDevPassword();

    if (devBackendAvailable === true) {
      await deleteFromBackend(id, pwd);
    }
    // 也從本地清單移除（本地模式或快取）
    const list = loadLocalReports().filter(function (r) { return r.id !== id; });
    saveLocalReports(list);

    refreshBugList();
  }

  async function onClearAll() {
    if (!confirm('確定清空全部 Bug 回報？此動作無法復原。')) return;
    const pwd = getDevPassword();

    if (devBackendAvailable === true) {
      await clearAllBackend(pwd);
    }
    saveLocalReports([]);
    refreshBugList();
  }

  function onChangePwd() {
    const input = get$('dev-new-pwd');
    const status = get$('dev-pwd-change-status');
    const val = input ? input.value.trim() : '';
    if (!val) {
      if (status) { status.style.color = '#d4726a'; status.textContent = '密碼不可為空'; }
      return;
    }
    setDevPassword(val);
    if (status) { status.style.color = '#7bbf6a'; status.textContent = '密碼已變更'; }
    if (input) input.value = '';
    setTimeout(function () {
      if (status) status.textContent = '';
    }, 2000);
  }

  function onDevDownloadSrc() {
    // 呼叫 game.js 提供的下載函式（保留桌面 JSZip 動態打包 / 行動靜態下載的邏輯）
    if (typeof window.downloadSourceZip === 'function') {
      window.downloadSourceZip();
    } else {
      // 萬一 game.js 還沒載好，就走靜態下載
      const a = document.createElement('a');
      a.href = 'source.zip';
      a.download = '暗黑天堂MMORPG_原始碼.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  // ====== 隱藏手勢：設定頁版本號連點 7 次 ======
  let versionClickCount = 0;
  let versionClickTimer = null;

  function onVersionClick() {
    versionClickCount++;
    clearTimeout(versionClickTimer);
    versionClickTimer = setTimeout(function () {
      versionClickCount = 0;
    }, 2000);

    if (versionClickCount >= 7) {
      versionClickCount = 0;
      if (devUnlocked) {
        openDevPanel();
      } else {
        openPwdModal();
      }
    }
  }

  // ====== 注入版本號到設定面板 ======
  function injectVersionIntoSettings() {
    const scrollArea = get$('settings-scroll-area');
    if (!scrollArea) return;
    if (get$('settings-version-text')) return;

    const verWrap = document.createElement('div');
    verWrap.style.cssText = 'margin-top:12px;padding-top:10px;border-top:1px solid rgba(139,105,20,0.3);text-align:center;user-select:none';
    verWrap.innerHTML = '<span id="settings-version-text" style="font-size:10px;color:#5a4a28;cursor:default;letter-spacing:0.5px">君主之刃 ' + escapeHtml(GAME_VERSION) + '</span>';
    scrollArea.appendChild(verWrap);

    verWrap.addEventListener('click', onVersionClick);
  }

  // ====== 替換側邊選單按鈕 ======
  function replaceDownloadWithBugReport() {
    const oldBtn = get$('download-src-btn');
    const urlRow = get$('source-url-row');

    // 移除舊的下載原始碼按鈕與 source.zip 連結（若存在）
    if (oldBtn && oldBtn.parentNode) oldBtn.parentNode.removeChild(oldBtn);
    if (urlRow && urlRow.parentNode) urlRow.parentNode.removeChild(urlRow);

    // 避免重複插入
    if (get$('bug-report-btn')) return;

    // 插入 Bug 回報按鈕到側邊選單底部
    const footer = document.querySelector('.side-menu-footer');
    if (!footer) return;

    const bugBtn = document.createElement('button');
    bugBtn.className = 'bug-report-btn';
    bugBtn.id = 'bug-report-btn';
    bugBtn.style.cssText = 'width:100%;padding:10px;margin-top:8px;background:linear-gradient(180deg,#5a3a2a,#2a1a10);color:#e8c878;border:1px solid #8b6914;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;text-shadow:1px 1px 2px rgba(0,0,0,0.5)';
    bugBtn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:1.5px solid #c9a24a;border-radius:50%;position:relative;flex-shrink:0"><span style="position:absolute;top:50%;left:50%;width:6px;height:6px;background:#c9a24a;border-radius:50%;transform:translate(-50%,-60%)"></span><span style="position:absolute;bottom:2px;left:50%;width:2px;height:3px;background:#c9a24a;transform:translateX(-50%)"></span></span><span>Bug 回報</span>';
    bugBtn.addEventListener('click', openBugModal);

    // 放在匯出遊戲按鈕之後（若存在），否則放 footer 最前
    const exportBtn = get$('export-game-btn');
    if (exportBtn && exportBtn.parentNode && exportBtn.nextSibling) {
      exportBtn.parentNode.insertBefore(bugBtn, exportBtn.nextSibling);
    } else if (exportBtn && exportBtn.parentNode) {
      exportBtn.parentNode.appendChild(bugBtn);
    } else {
      footer.insertBefore(bugBtn, footer.firstChild);
    }
  }

  // ====== 匯出模組到全域 ======
  window.BugReport = {
    GAME_VERSION: GAME_VERSION,
    openBugModal: openBugModal,
    openDevPanel: function () {
      if (devUnlocked) openDevPanel();
      else openPwdModal();
    },
    submit: submitBugReport,
    getErrorLogs: function () { return errorLogs.slice(); },
    getLocalReports: loadLocalReports,
    _injectVersion: injectVersionIntoSettings,
    _replaceSideBtn: replaceDownloadWithBugReport,
  };

  // 頁面載入完成後自動注入 UI
  function initUI() {
    try {
      injectVersionIntoSettings();
      replaceDownloadWithBugReport();
    } catch (e) {
      console.error('[BugReport] init UI error:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    // 設定面板可能還沒被 game.js 建立，延遲一下
    if (document.body) {
      initUI();
    } else {
      setTimeout(initUI, 500);
    }
  }
})();

/* ============================================================
    君主之刃 v2.0.3 · Bug 回報模組（正式營運版）
    設計原則：
      1. 全程繁體中文，無 emoji，無 SVG
      2. 不破壞任何既有遊戲功能
      3. Bug 回報預設寫入 localStorage，並嘗試呼叫後端 API
         若應用升級為全棧版本（有 /api/bug-report），自動切換為真·後端存儲
      4. 正式營運版不包含任何開發者後台 / 原始碼下載入口
         GM 帳號權限完全由後端 isGM 欄位判定
    ============================================================ */

(function () {
  'use strict';

  const GAME_VERSION = 'v2.6.6';
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
    origConsoleError.apply(this, arguments);
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

  // ====== 後端 API ======
  const MP_SERVER_URL_KEY = 'mp_server_url';

  function getMultiplayerServerUrl() {
    try {
      const url = localStorage.getItem(MP_SERVER_URL_KEY) || '';
      return url.trim();
    } catch (e) { return ''; }
  }

  function getBackendBase() {
    const mpUrl = getMultiplayerServerUrl();
    if (mpUrl) {
      try {
        const u = new URL(mpUrl);
        return u.origin + '/api';
      } catch (e) {
        const base = mpUrl.replace(/\/+$/, '').replace(/\/socket\.io.*$/, '');
        return base + '/api';
      }
    }
    return (location.origin || '') + '/api';
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

  // ====== 注入版本號到設定面板（僅顯示，無手勢） ======
  function injectVersionIntoSettings() {
    const scrollArea = get$('settings-scroll-area');
    if (!scrollArea) return;
    if (get$('settings-version-text')) return;

    const verWrap = document.createElement('div');
    verWrap.style.cssText = 'margin-top:12px;padding-top:10px;border-top:1px solid rgba(139,105,20,0.3);text-align:center;user-select:none;pointer-events:none';
    verWrap.innerHTML = '<span id="settings-version-text" style="font-size:10px;color:#5a4a28;letter-spacing:0.5px">君主之刃 ' + escapeHtml(GAME_VERSION) + ' · 正式營運</span>';
    scrollArea.appendChild(verWrap);
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
    if (document.body) {
      initUI();
    } else {
      setTimeout(initUI, 500);
    }
  }
})();

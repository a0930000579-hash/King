(function() {
  'use strict';

  // v4.1.0：WebSocket ONLY 多人連線客戶端（完全移除 Long-Poll）
  const STATUS = {
    OFFLINE: 'offline',
    LOADING: 'loading',
    CONNECTING: 'connecting',
    ONLINE: 'online',
    RECONNECTING: 'reconnecting',
    ERROR: 'error',
  };

  let status = STATUS.OFFLINE;
  let onStatusChange = null;
  let onChatMessage = null;
  let onMonsterDamage = null;
  let onMonsterKilled = null;
  let onGainReward = null;

  // ========== v3.1.6：WS 診斷日誌（遊戲中可見） ==========
  const _wsDiagLog = [];
  const _aoiMessageLog = [];
  const _debugLog = [];
  function _addDebugLog(msg) { _debugLog.unshift(msg); if (_debugLog.length > 20) _debugLog.pop(); console.log(msg); } // v4.2.2：記錄最近的AOI消息，方便手機端排查
  function _wsDiag(msg) {
    const ts = new Date().toLocaleTimeString('zh-TW', {hour12: false}) + '.' + String(Date.now() % 1000).padStart(3, '0');
    const entry = ts + ' ' + msg;
    _wsDiagLog.push(entry);
    if (_wsDiagLog.length > 60) _wsDiagLog.shift();
    console.log('[WS-DIAG]', entry);
  }

  let serverUrl = '';
  let authToken = '';
  let myPlayerId = null;
  let currentMapId = null;
  let currentServerId = 'zeus';
  let currentCharIdx = 0;
  let currentWorldW = 2496;
  let currentWorldH = 1664;

  // v2.7.2：WebSocket 狀態
  let ws = null;
  let wsConnected = false;
  let wsReconnectDelay = 1000;
  let wsReconnectTimer = null;
  let useWebSocket = false; // 是否成功切換到 WS

  let _wsFailureReason = ''; // v2.7.5：WS 上次失敗原因（供 UI 顯示）
  let _wsLastCloseCode = null; // v2.7.10：最後 close code
  let _wsLastCloseReason = ''; // v2.7.10：最後 close reason
  let _wsPath = '/'; // v2.7.10：伺服器 WS upgrade 路徑（從 /api/health 取得）

  function getWsFailureReason() { return _wsFailureReason; }
  function getWsLastCloseCode() { return _wsLastCloseCode; }
  function getWsLastCloseReason() { return _wsLastCloseReason; }
  // v2.7.10：回傳目前使用的傳輸層類型（'ws' | 'lp' | 'offline'）
  function getTransportType() {
    if (status === STATUS.OFFLINE || status === STATUS.ERROR) return 'offline';
    return useWebSocket ? 'ws' : 'lp';
  }

  const remotePlayers = new Map();
  // v4.3.9：伺服器端AI（Server Authoritative，客戶端只渲染）
  const serverAIs = new Map();
  // v4.1.0：WS ONLY — 已移除所有 Long-Poll 相關變量
  let lastUpdateTime = 0;
  const UPDATE_THROTTLE = 100; // v2.7.5：50ms → 100ms（10Hz），降低廣播頻寬

  // ========== 工具 ==========
  function getAuthHeader() {
    return { 'Authorization': 'Bearer ' + authToken };
  }

  function apiPost(path, body) {
    return fetch(serverUrl + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      credentials: 'omit',
      body: JSON.stringify(body || {}),
    }).then(r => r.json());
  }

  function apiGet(path) {
    return fetch(serverUrl + path, {
      method: 'GET',
      headers: getAuthHeader(),
      credentials: 'omit',
    }).then(r => r.json());
  }

  function setStatus(newStatus) {
    if (status === newStatus) return;
    status = newStatus;
    if (onStatusChange) {
      try { onStatusChange(status); } catch (e) { console.error('[Multi] status cb error:', e); }
    }
  }

  // 座標轉換（與原 socket.io 版一致）
  function serverToWorld(sx, sy) {
    return { x: sx, y: sy };
  }
  function worldToServer(wx, wy) {
    return { x: wx, y: wy };
  }

  // ========== 公開 API ==========
  const MultiplayerClient = {
    get status() { return status; },
    get myId() { return myPlayerId; },
    get connected() { return status === STATUS.ONLINE; },
    get serverId() { return currentServerId; },
    get mapId() { return currentMapId; },
    get transport() { return useWebSocket ? 'websocket' : (status === STATUS.ONLINE ? 'longpoll' : 'offline'); },
    get wsFailureReason() { return _wsFailureReason || ''; },
    get wsLastCloseCode() { return _wsLastCloseCode || null; },
    get wsLastCloseReason() { return _wsLastCloseReason || ''; },
    get serverId() { return currentServerId || null; },
    get mapId() { return currentMapId || null; },
    STATUS: STATUS,

    getSavedServerUrl() {
      try { return localStorage.getItem('mp_server_url') || ''; } catch (e) { return ''; }
    },
    saveServerUrl(url) {
      try { localStorage.setItem('mp_server_url', url || ''); } catch (e) { /* ignore */ }
    },

    setStatusCallback(cb) { onStatusChange = typeof cb === 'function' ? cb : null; },
    setChatCallback(cb) { onChatMessage = typeof cb === 'function' ? cb : null; },
    setMonsterDamageCallback(cb) { onMonsterDamage = typeof cb === 'function' ? cb : null; },
    setMonsterKilledCallback(cb) { onMonsterKilled = typeof cb === 'function' ? cb : null; },
    setGainRewardCallback(cb) { onGainReward = typeof cb === 'function' ? cb : null; },

    setWorldSize(w, h) {
      currentWorldW = w || 2496;
      currentWorldH = h || 1664;
    },

    // v4.1.0：連線 — 嚴格只走 WebSocket，完全移除 LP 模式
     connect(url, token) {
       const u = (url || '').trim();
       if (!u) {
         setStatus(STATUS.ERROR);
         return Promise.reject(new Error('伺服器位址為空'));
       }
       serverUrl = u.replace(/\/+$/, '');
       MultiplayerClient.saveServerUrl(u);
       authToken = token || '';

       console.log('[GAME-WS] ===== MultiplayerClient.connect() v4.1.0 (WS ONLY) =====');
       console.log('[GAME-WS]   serverUrl =', serverUrl);
       console.log('[GAME-WS]   token 長度 =', authToken ? authToken.length : 0);

       // 先斷開舊的
      if (ws) {
        try { ws.close(); } catch(e) {}
        ws = null;
        wsConnected = false;
      }
      clearAllRemotePlayers();
      myPlayerId = null;
      wsReconnectDelay = 1000;
      useWebSocket = false;
      setStatus(STATUS.CONNECTING);
      _updateWsBadge('connecting', 'WS連線中');

      // v4.1.0：直接建立 WebSocket 連線，不經過 health，不啟動 LP
      return _startWsWithRetry().then(() => {
        console.log('[GAME-WS] ✅ WebSocket 連線成功');
        return { ok: true, transport: 'websocket' };
      }).catch(err => {
        console.error('[GAME-WS] ❌ WebSocket 連線失敗:', err.message);
        setStatus(STATUS.ERROR);
        _wsFailureReason = err.message || 'WebSocket 連線失敗';
        if (typeof window.setOfflineMode === 'function') {
          window.setOfflineMode(true);
        }
        throw err;
      });
     },


    // v4.1.0：WS ONLY
    disconnect() {
      if (currentMapId && ws && wsConnected) {
        try { wsSend({ type: 'leave_map' }); } catch(e) {}
      }
      if (ws) {
        try { ws.close(); } catch(e) {}
        ws = null;
        wsConnected = false;
      }
      if (wsReconnectTimer) {
        clearTimeout(wsReconnectTimer);
        wsReconnectTimer = null;
      }
      clearAllRemotePlayers();
      myPlayerId = null;
      currentMapId = null;
      useWebSocket = false;
      setStatus(STATUS.OFFLINE);
    },

    // 加入世界（從 auth token 推斷帳號）
    // v4.1.0：加入世界 — WS ONLY，只設置狀態，join_map由WebSocket auth_ok處理
    joinWorld(opts) {
      opts = opts || {};
      currentCharIdx = opts.charIdx ?? (GS.currentCharIdx ?? 0);
      const mapId = opts.mapId || GS.currentMap || 'village';
      let serverId = opts.serverId;
      if (!serverId && typeof AuthSystem !== 'undefined' && AuthSystem.getCurrentServer) {
        const srv = AuthSystem.getCurrentServer();
        if (srv && srv.id) serverId = srv.id;
      }
      if (!serverId && GS.currentServerId) serverId = GS.currentServerId;
      if (!serverId) serverId = currentServerId || 'zeus';
      currentServerId = serverId;
      currentMapId = mapId;
      if (!myPlayerId) {
        const account = (typeof AuthSystem !== 'undefined' && AuthSystem.getAccount) ? AuthSystem.getAccount() : (GS.player?.id || 'unknown');
        myPlayerId = account + ':' + currentCharIdx;
      }
      if (typeof window.setServerOnline === 'function') {
        window.setServerOnline(serverId, mapId);
      }
      console.log('[GAME-WS] joinWorld 設置狀態: mapId=' + mapId + ' serverId=' + serverId + ' playerId=' + myPlayerId);
      return Promise.resolve({ ok: true, mapId, serverId, playerId: myPlayerId });
    },

    // 切換地圖
    // v4.1.0：WS ONLY — 切換地圖，發送WebSocket join_map
    enterMap(mapId, charIdx, worldW, worldH) {
      if (!mapId || mapId === currentMapId) return Promise.resolve();
      currentMapId = mapId;
      if (worldW) currentWorldW = worldW;
      if (worldH) currentWorldH = worldH;
      if (charIdx != null) currentCharIdx = charIdx;
      clearAllRemotePlayers();
      if (!myPlayerId) {
        const account = (typeof AuthSystem !== 'undefined' && AuthSystem.getAccount) ? AuthSystem.getAccount() : (GS.player?.id || 'unknown');
        myPlayerId = account + ':' + currentCharIdx;
      }
      // v4.1.0：發送WebSocket join_map（<126字節，不會被DO proxy截斷）
      if (useWebSocket && ws && wsConnected) {
        try {
          wsSend({
            type: 'join_map',
            mapId: mapId,
            playerId: myPlayerId,
            charIdx: currentCharIdx,
          });
          console.log('[GAME-WS] enterMap 發送 join_map: mapId=' + mapId);
        } catch(e) {
          console.error('[GAME-WS] enterMap join_map 發送失敗:', e.message);
        }
      }
      return Promise.resolve({ ok: true, mapId });
    },

    // 回報移動（節流）
    // v4.1.0：WS ONLY
    reportMove(x, y, dir) {
      if (status !== STATUS.ONLINE || !currentMapId) return;
      const now = Date.now();
      if (now - lastUpdateTime < UPDATE_THROTTLE) return;
      lastUpdateTime = now;
      const sPos = worldToServer(x, y);
      if (useWebSocket && ws && wsConnected) {
        wsSend({ type: 'move', x: sPos.x, y: sPos.y, dir: dir });
      }
    },

    // 回報血量變化
    // v4.1.0：WS ONLY
    reportHp(hp, maxHp) {
      if (status !== STATUS.ONLINE || !currentMapId) return;
      if (useWebSocket && ws && wsConnected) {
        wsSend({ type: 'hp', hp, maxHp });
      }
    },

    // 回報變身變化
    // v4.1.0：WS ONLY
    reportTransform(transformId) {
      if (status !== STATUS.ONLINE || !currentMapId) return;
      if (useWebSocket && ws && wsConnected) {
        wsSend({ type: 'update_profile', transformId });
      }
    },

    // v4.1.0：WS ONLY
    sendChat(text, channel) {
      if (status !== STATUS.ONLINE || !currentMapId) return Promise.reject(new Error('未連線'));
      if (useWebSocket && ws && wsConnected) {
        wsSend({ type: 'chat', text, channel: channel || 'map' });
        return Promise.resolve({ ok: true });
      }
      return Promise.reject(new Error('WebSocket未連線'));
    },

    // v4.1.0：WS ONLY
    attackMonster(monsterId, skillId, damage) {
      if (status !== STATUS.ONLINE || !currentMapId) return;
      if (useWebSocket && ws && wsConnected) {
        wsSend({ type: 'attack', targetId: monsterId, skillId: skillId || 0, damage: damage || 0 });
      }
    },

    // 回報攻擊（對伺服器 AI 造成傷害）
    // v4.1.0：WS ONLY
    reportAttack(targetId, skillId, damage) {
      if (status !== STATUS.ONLINE || !currentMapId) return;
      if (useWebSocket && ws && wsConnected) {
        wsSend({ type: 'attack', targetId, skillId: skillId || 0, damage: damage || 0 });
      }
    },

    // v2.7.9：位置上報（LP 模式下讓其他玩家看到自己移動）
    //  節流 100ms，避免過多 HTTP 請求；WS 模式下自動走 WS 通道
    _lastMoveSend: 0,
    // v4.1.0：WS ONLY
    sendPosition(x, y, dir, opts) {
      if (status !== STATUS.ONLINE || !currentMapId) return;
      const now = Date.now();
      if (now - this._lastMoveSend < 100) return;
      this._lastMoveSend = now;
      if (useWebSocket && ws && wsConnected) {
        wsSend({ type: 'move', x, y, dir: dir || 0 });
      }
    },

    // 每幀更新遠端玩家位置（內插）
    tick(dt) {
      if (status !== STATUS.ONLINE || remotePlayers.size === 0) return;
      try { updateRemotePlayers(dt); } catch (e) { console.error('[Multi] tick error:', e); }
    },

    getNearbyPlayerCount,
    _getRemotePlayers() { return remotePlayers; },
    _clearAll() { clearAllRemotePlayers(); },
    _getWebSocket() { return ws; },
    get isWebSocket() { return useWebSocket; },
    get wsFailureReason() { return _wsFailureReason; },
    getWsFailureReason: getWsFailureReason,
  };

  // ========== v4.1.0：WebSocket 連線（唯一通道，WS ONLY） ==========
  // v3.2.0：大訊息自動分片發送（每個chunk <126位元組，避免DO proxy截斷大幀）
  function _wsChunkId() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  }
  // v3.2.1：大訊息自動分片（chunkSize=50，確保每個chunk <100位元組）
  function wsSend(msg) {
    _wsDiag('[v4.3.11] wsSend called type=' + (msg.type||msg.t||'?'));
    if (!ws || ws.readyState !== 1) return false;
    try {
      const raw = JSON.stringify(msg);
      // v4.0.5：分片閾值提高到126，<126位元組的消息直接發送小幀，不需要分片
      if (raw.length < 126) {
        _wsDiag('wsSend 小幀直接發送 len=' + raw.length + ' type=' + (msg.type||msg.t||'?'));
        ws.send(raw);
        return true;
      }
      const cid = _wsChunkId();
      const chunkSize = 30;
      const total = Math.ceil(raw.length / chunkSize);
      _wsDiag('wsSend 大訊息分片 len=' + raw.length + ' -> ' + total + ' chunks, cid=' + cid);
      for (let i = 0; i < total; i++) {
        const part = raw.substring(i * chunkSize, (i + 1) * chunkSize);
        const chunkMsg = JSON.stringify({ t: '__c', c: cid, i: i, n: total, d: part });
        _wsDiag('  發送 chunk ' + (i+1) + '/' + total + ' chunkLen=' + chunkMsg.length);
        ws.send(chunkMsg);
      }
      return true;
    } catch(e) {
      _wsDiag('wsSend 錯誤: ' + e.message);
      return false;
    }
  }

  // v4.1.2：客戶端分片接收緩衝區（對稱伺服器端的chunkBuffers）
  const _clientChunkBuffers = new Map();

  function _handleClientChunk(msg) {
    try {
      const cid = msg.c;
      const idx = msg.i;
      const total = msg.n;
      const data = msg.d;
      if (!cid || idx == null || !total || data == null) return null;
      if (!_clientChunkBuffers.has(cid)) {
        _clientChunkBuffers.set(cid, { parts: new Map(), total: total, received: 0 });
      }
      const buf = _clientChunkBuffers.get(cid);
      buf.parts.set(idx, data);
      buf.received++;
      _wsDiag('[v4.3.11] 收到chunk cid=' + cid + ' idx=' + idx + '/' + total + ' dataLen=' + data.length);
      if (buf.received >= total) {
        let full = '';
        for (let i = 0; i < total; i++) {
          full += buf.parts.get(i) || '';
        }
        _clientChunkBuffers.delete(cid);
        _wsDiag('[v4.3.11] chunk組裝完成 cid=' + cid + ' fullLen=' + full.length);
        try {
          return JSON.parse(full);
        } catch(e) {
          console.error('[GAME-WS] chunk組裝後JSON失敗:', e.message, '前50字=', full.substring(0,50));
          _wsDiag('[v4.3.11] chunk組裝後JSON失敗: ' + e.message);
          return null;
        }
      }
      return null; // 還沒收齊
    } catch(e) {
      console.error('[GAME-WS] 處理chunk異常:', e);
      return null;
    }
  }

   // v3.1.2：WS 連線 + 重試邏輯（模組級函數，health 成功或失敗都會呼叫）
   // v4.1.0：WS ONLY — 失敗直接報錯，不降級 LP
   function _startWsWithRetry() {
     if (typeof WebSocket === 'undefined') {
       const err = new Error('瀏覽器不支援 WebSocket');
       setStatus(STATUS.ERROR);
       _wsFailureReason = err.message;
       return Promise.reject(err);
     }
     let wsRetryCount = 0;
     const MAX_WS_RETRIES = 3;
     _updateWsBadge('connecting', 'WS連線中');
     function tryWsWithRetry() {
       return tryWebSocket().catch(e => {
         wsRetryCount++;
         console.warn('[GAME-WS] 第', wsRetryCount, '次連線失敗:', e.message);
         if (wsRetryCount < MAX_WS_RETRIES) {
           const delay = 1000 * wsRetryCount;
           console.warn('[GAME-WS] ', delay, 'ms 後重試 WS (剩餘', MAX_WS_RETRIES - wsRetryCount, '次)');
           _updateWsBadge('reconnecting', 'WS重試' + wsRetryCount);
           return new Promise(function(resolve) { setTimeout(resolve, delay); })
             .then(tryWsWithRetry);
         } else {
           console.error('[GAME-WS] ❌ WS 連線失敗已達', MAX_WS_RETRIES, '次');
           _wsFailureReason = e.message || 'WS 連線失敗';
           useWebSocket = false;
           _updateWsBadge('error', 'WS錯誤');
           if (typeof window.addLog === 'function') {
             try {
               addLog('system', '❌ WebSocket 連線失敗（已重試' + MAX_WS_RETRIES + '次）：' + (e.message || '未知'));
             } catch(_) {}
           }
           setStatus(STATUS.ERROR);
           return Promise.reject(e);
         }
       });
     }
     return tryWsWithRetry();
   }

   function tryWebSocket() {
     _wsDiag('[v4.3.11] tryWebSocket 開始');
     return new Promise((resolve, reject) => {
       if (typeof WebSocket === 'undefined') {
         _wsFailureReason = '瀏覽器不支援 WebSocket';
         reject(new Error(_wsFailureReason));
         return;
       }
        // v3.1.2：修復 DO 子路徑部署下 WS URL 錯誤 — 永遠用 origin root
        //  原因：Node server 監聽在根路徑 /，upgrade handler 不區分 path
        //  之前用 pathname 導致 wss://host/subpath/，upgrade 請求被 DO proxy 導到靜態檔伺服器
        //  正確方式：wss:// + host + / (與頁面 origin 同源的根)
        let wsUrl;
        try {
          const pageProto = (typeof window !== 'undefined' && window.location && window.location.protocol) || 'http:';
          const pageHost = (typeof window !== 'undefined' && window.location && window.location.host) || '';
          const pagePath = (typeof window !== 'undefined' && window.location && window.location.pathname) || '/';
          const wsProto = pageProto === 'https:' ? 'wss:' : 'ws:';
          // v3.1.2：直接用根路徑 /，避免子路徑部署下 upgrade 失敗
          wsUrl = wsProto + '//' + pageHost + '/';
          console.log('[GAME-WS] ========== WebSocket 連線開始 ==========');
          console.log('[GAME-WS] 頁面 URL =', window.location.href);
          console.log('[GAME-WS]   proto=', pageProto, 'host=', pageHost, 'pathname=', pagePath);
          console.log('[GAME-WS]   serverUrl(origin)=', serverUrl);
          console.log('[GAME-WS]   WS URL =', wsUrl);
          console.log('[GAME-WS]   authToken 長度=', authToken ? authToken.length : 0, 'token 前6字=', authToken ? authToken.substring(0,6)+'...' : '空');
       } catch(e) {
         // fallback：serverUrl 直接換協議
         wsUrl = (serverUrl || '').replace(/^http/, 'ws').replace(/\/?$/, '/');
         console.warn('[GAME-WS] URL 構建異常，使用 fallback:', wsUrl, e.message);
       }
       _wsFailureReason = '';
       try {
         ws = new WebSocket(wsUrl);
         _wsDiag('WebSocket 物件已建立, readyState=' + ws.readyState + ' URL=' + wsUrl);
         console.log('[GAME-WS] WebSocket 物件已建立, readyState=', ws.readyState, '(0=CONNECTING)');
       } catch(e) {
         _wsFailureReason = '建立失敗: ' + (e.message || String(e));
         console.error('[GAME-WS] ❌ new WebSocket() 丟出異常:', e.message, e);
         _updateWsBadge('error', 'WS異常');
         reject(e);
         return;
       }

      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          _wsDiag('⏰ 逾時! 5秒內未收到auth_ok/auth_fail。ws.readyState=' + (ws ? ws.readyState : '無ws'));
          resolved = true;
          reject(new Error('WebSocket 連線逾時'));
        }
      }, 8000);

       ws.onopen = () => {
         _wsDiag('✅ onopen - upgrade 成功, readyState=' + ws.readyState);
         try { _updateWsBadge('connecting', 'WS驗證中'); } catch(e) { _wsDiag('[v4.3.11] badge錯誤: ' + e.message); }
         try {
           let wsSessionId = '';
           try { wsSessionId = localStorage.getItem('mmo_ws_session_id') || ''; } catch(e) {}
           _wsDiag('[v4.3.11] wsSessionId=' + (wsSessionId ? '有' : '無'));
           if (wsSessionId) {
             const authMsg = { type: 'auth', wsSessionId: wsSessionId, name: 'Player' };
             const msgLen = JSON.stringify(authMsg).length;
             _wsDiag('[v4.3.11] wsSessionId認證 len=' + msgLen + (msgLen < 126 ? ' 小幀安全' : ' 大幀危險'));
             wsSend(authMsg);
             try { localStorage.removeItem('mmo_ws_session_id'); } catch(e) {}
           } else {
             const account = (typeof localStorage !== 'undefined') ? (localStorage.getItem('mmo_account') || '') : '';
             const shortToken = authToken ? authToken.substring(0, 30) : '';
             const authMsg = { type: 'auth', shortToken: shortToken, account: account, name: 'Player' };
             const msgLen = JSON.stringify(authMsg).length;
             _wsDiag('[v4.3.11] 短token認證 len=' + msgLen + (msgLen < 126 ? ' 小幀安全' : ' 大幀危險') + ' account=' + account);
             wsSend(authMsg);
           }
         } catch(e) {
           _wsDiag('[v4.3.11] auth發送異常: ' + e.message);
           try { wsSend({ type: 'auth', token: authToken, name: 'Player' }); } catch(e2) {}
         }

       };

       ws.onerror = (event) => {
         _wsDiag('❌ onerror 觸發: type=' + event.type);
         console.error('[GAME-WS] ❌ onerror 觸發');
         console.error('[GAME-WS]   event.type=', event.type);
         console.error('[GAME-WS]   event.target.url=', event.target?.url || 'n/a');
         console.error('[GAME-WS]   readyState=', ws?.readyState);
         _updateWsBadge('error', 'WS錯誤');
         _wsFailureReason = 'onerror 觸發 (詳見 console)';
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error('WebSocket 連線錯誤 (onerror, readyState=' + (ws?.readyState ?? '?') + ')'));
        }
      };

       ws.onclose = (event) => {
         _wsDiag('⚠️ onclose: code=' + event.code + ' reason=' + (event.reason || '空') + ' wasClean=' + event.wasClean);
         console.warn('[GAME-WS] ⚠️ onclose 觸發');
         console.warn('[GAME-WS]   code=', event.code);
         console.warn('[GAME-WS]   reason=', event.reason || '(空)');
         console.warn('[GAME-WS]   wasClean=', event.wasClean);
         console.warn('[GAME-WS]   readyState=', ws?.readyState);
         console.warn('[GAME-WS]   URL=', wsUrl);
         wsConnected = false;
        _wsLastCloseCode = event.code;
        _wsLastCloseReason = event.reason || '';
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          let reason = '連線被關閉';
          if (event.code === 1006) reason = '無法連接伺服器（code 1006，代理/防火牆可能不支援 WS Upgrade）';
          else if (event.code === 1000) reason = '正常關閉';
          else if (event.code === 1001) reason = '遠端離開（code 1001 Going Away）';
          else if (event.code === 4001) reason = '認證失敗（code 4001，token 無效）';
          else reason = '關閉 code=' + event.code + (event.reason ? '：' + event.reason : '');
          _wsFailureReason = reason;
          reject(new Error(reason));
          return;
        }
        // v4.1.0：WS ONLY — 意外斷線直接重連，不降級 LP
        if (useWebSocket && status === STATUS.ONLINE) {
          console.warn('[WS] 線中斷，嘗試重連');
          scheduleWsReconnect();
        }
      };

      ws.onmessage = (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch(e) { _wsDiag('❌ onmessage JSON解析失敗: ' + e.message); return; }
        // v4.1.2：檢查是否為分片消息
        if (msg && msg.t === '__c') {
          const reassembled = _handleClientChunk(msg);
          if (reassembled) {
            msg = reassembled;
          } else {
            return; // 分片還沒收齊，等待
          }
        }
        if (!msg || !msg.type) { _wsDiag('❌ onmessage 無type欄位'); return; }
        _wsDiag('📥 收到訊息: type=' + msg.type + ' 長度=' + (ev.data ? ev.data.length : 0));

         if (msg.type === 'auth_ok') {
           if (!resolved) {
             resolved = true;
             try {
             console.log('[GAME-WS] ✅ auth_ok - 驗證通過, clientId=', msg.id, 'account=', msg.account);
             clearTimeout(timeout);
             wsReconnectDelay = 1000;
             _updateWsBadge('connecting', '加入地圖中');
             // v4.0.4：先發送join_map，收到join_map_ok後再設置wsConnected=true
             // 避免遊戲循環在join_map之前就開始發送move消息
             const joinMapId = currentMapId || (typeof GS !== 'undefined' && GS?.player?.mapId) || 'village';
             const _acct = (typeof AuthSystem !== 'undefined' && AuthSystem.getAccount) ? AuthSystem.getAccount() : ((typeof GS !== 'undefined' && GS?.player?.id) || 'unknown');
             const joinPlayerId = myPlayerId || (typeof GS !== 'undefined' && GS?.player?.id) || (_acct + ':0');
             const joinServerId = currentServerId || 'zeus';
             if (!currentMapId) currentMapId = joinMapId;
             if (!myPlayerId) myPlayerId = joinPlayerId;
             // v4.0.8：進一步縮小join_map，移除名字/職業/等級（auth時伺服器端已知道）
             // 確保即使中文名字也<126位元組，不會被DO proxy截斷
             const px = (typeof GS !== 'undefined' && GS?.player?.x != null) ? GS.player.x : 400;
             const py = (typeof GS !== 'undefined' && GS?.player?.y != null) ? GS.player.y : 400;
             const joinMsg = { type: 'join_map', s: joinServerId, m: joinMapId, p: joinPlayerId, x: px, y: py };
             const joinLen = JSON.stringify(joinMsg).length;
             _wsDiag('[v4.3.11] auth_ok後發送join_map len=' + joinLen + (joinLen < 126 ? ' 小幀安全(不分片)' : ' 大幀需分片') + ' mapId=' + joinMapId);
             console.log('[GAME-WS] auth_ok 後發送 join_map, len=' + joinLen + ', mapId=' + joinMapId + ', msg=' + JSON.stringify(joinMsg));
             try {
               const joinSent = wsSend(joinMsg);
               console.log('[GAME-WS] join_map 發送結果: ' + (joinSent ? '成功' : '失敗'));
               _wsDiag('[v4.3.11] join_map發送結果: ' + (joinSent ? '成功' : '失敗'));
             } catch(e) {
               console.error('[GAME-WS] join_map 發送異常:', e);
               _wsDiag('[v4.3.11] join_map發送異常: ' + e.message);
             }
             resolve(msg);
             } catch(e) {
               console.error('[GAME-WS] ❌ auth_ok處理異常:', e);
               _wsDiag('[v4.3.11] auth_ok處理異常: ' + e.message);
               reject(e);
             }
           }
           return;
         } else if (msg.type === 'join_map_ok') {
           // v4.0.7：收到join_map_ok後正式啟用WS模式，並處理entities和在線人數
           console.log('[GAME-WS] 📩 收到 join_map_ok, entities數=' + (msg.entities||[]).length + ' self=' + JSON.stringify(msg.self||{}).substring(0,100));
           if (!wsConnected) {
             useWebSocket = true;
             wsConnected = true;
             _updateWsBadge('online', 'WS在線');
             _wsDiag('[v4.3.11] 收到join_map_ok，WS模式正式啟用');
             console.log('[GAME-WS] 收到 join_map_ok，WebSocket 模式正式啟用');
             // v4.1.3：連線成功後啟動閒置檢測
             if (typeof _resetIdleTimer === 'function') _resetIdleTimer();
           }
           // v4.0.7：處理entities（其他玩家和AI），更新在線人數
           try {
             if (msg.entities && Array.isArray(msg.entities)) {
               const _acct2 = (typeof AuthSystem !== 'undefined' && AuthSystem.getAccount) ? AuthSystem.getAccount() : ((typeof GS !== 'undefined' && GS?.player?.id) || 'unknown');
               const playerEntities = msg.entities.filter(e => e && (e.kind === 'player' || e.type === 'player' || (e.id && String(e.id).indexOf(':') > 0)) && e.id !== (myPlayerId || (_acct2+':0')));
               console.log('[GAME-WS] entities中玩家數=' + playerEntities.length + ' 總實體數=' + msg.entities.length);
               // v4.1.9：直接把玩家加入remotePlayers，不依賴game.js的handleAOIEnter
               playerEntities.forEach(p => {
                 const pid = p.playerId || p.id;
                 if (pid && pid !== myPlayerId) {
                   addOrUpdateRemotePlayer({
                     id: pid,
                     name: p.name || 'Player',
                     class: p.classId || p.class || 'warrior',
                     level: p.level || 1,
                     x: p.x, y: p.y, dir: p.dir || 0,
                     transform: p.transformId || p.transform,
                     moving: p.moving || false,
                   });
                   console.log('[GAME-WS] join_map_ok: 加入遠端玩家 ' + pid + ' ' + (p.name || ''));
                 }
               });
               if (typeof window.handleAOIEnter === 'function') {
                 window.handleAOIEnter(msg.entities);
               }
               // v4.0.7：更新在線人數（玩家數+1自己）
               if (typeof _setOnlineCount === 'function') {
                 _setOnlineCount(playerEntities.length + 1);
               }
               _wsDiag('[v4.3.11] join_map_ok處理完成，在線人數=' + (playerEntities.length + 1));
             } else {
               // 沒有entities，至少顯示自己在線
               if (typeof _setOnlineCount === 'function') {
                 _setOnlineCount(1);
               }
               _wsDiag('[v4.3.11] join_map_ok無entities，在線人數=1(自己)');
             }
           } catch(e) {
             console.error('[GAME-WS] 處理join_map_ok entities出錯:', e);
             _wsDiag('[v4.3.11] join_map_ok entities處理出錯: ' + e.message);
           }
           return;
         } else if (msg.type === 'auth_fail') {
           console.error('[GAME-WS] ❌ auth_fail - token 驗證失敗, reason=', msg.reason || msg.error || '未知');
           clearTimeout(timeout);
           _wsFailureReason = 'auth 失敗: ' + (msg.reason || msg.error || 'token 無效');
           _updateWsBadge('error', 'WS驗證失敗');
           // v3.1.2：auth 失敗時顯示明確提示給玩家
           if (typeof window.addLog === 'function') {
             try { addLog('system', '⚠️ 伺服器驗證失敗：' + (msg.reason || msg.error || 'token 無效')); } catch(e) {}
           }
           if (!resolved) {
             resolved = true;
             reject(new Error(_wsFailureReason));
           }
           return;
         }

        // 其他事件走統一處理
        handleWsMessage(msg);
      };
    });
  }

  function scheduleWsReconnect() {
    if (wsReconnectTimer) return;
    wsReconnectDelay = Math.min(wsReconnectDelay * 2, 15000);
    wsReconnectTimer = setTimeout(() => {
      wsReconnectTimer = null;
      if (status !== STATUS.ONLINE && status !== STATUS.RECONNECTING) return;
      console.log('[WS] 🔄 第', (wsReconnectCount || 0) + 1, '次重連 (delay=' + wsReconnectDelay + 'ms)');
      wsReconnectCount = (wsReconnectCount || 0) + 1;
      tryWebSocket().then(() => {
        wsReconnectDelay = 1000;
        _wsFailureReason = '';
        console.log('[WS] 重連成功');
        // 重新加入地圖
        if (currentMapId && myPlayerId) {
          wsSend({
            type: 'join_map',
            serverId: currentServerId,
            mapId: currentMapId,
            playerId: myPlayerId,
            name: GS?.player?.name || 'Player',
            classId: GS?.player?.classId || 'warrior',
            level: GS?.player?.level || 1,
            charIdx: currentCharIdx,
          });
        }
      }).catch(e => {
        console.warn('[WS] 重連失敗:', e.message);
        // v2.7.7：保留最後失敗原因給指示器
        _wsFailureReason = e.message || '重連失敗';
        scheduleWsReconnect();
      });
    }, wsReconnectDelay);
  }

  function handleWsMessage(msg) {
    switch (msg.type) {
      // v3.0.0：Server Authoritative AOI 事件
      case 'join_map_ok':
        console.log('[WS] ✅ join_map_ok - 伺服器確認加入地圖, AOI半徑=', msg.aoiRadius, '初始實體數=', msg.entities?.length || 0);
        // 設定自己的伺服器端位置
        if (msg.self && typeof window.setServerSelfState === 'function') {
          window.setServerSelfState(msg.self);
        }
        // 初始 AOI 實體
        if (msg.entities && Array.isArray(msg.entities) && typeof window.handleAOIEnter === 'function') {
          window.handleAOIEnter(msg.entities);
        }
        if (msg.aoiRadius && typeof window.setAOIRadius === 'function') {
          window.setAOIRadius(msg.aoiRadius);
        }
        break;
      case 'aoi_enter':
        // v4.1.5：正確處理aoi_enter，把新玩家加入remotePlayers
        try {
          _aoiMessageLog.unshift('[aoi_enter] entities=' + (msg.entities?.length || 0) + ' ' + JSON.stringify(msg.entities?.slice(0,3) || []).substring(0,150));
          if (_aoiMessageLog.length > 10) _aoiMessageLog.pop();
          if (msg.entities && Array.isArray(msg.entities)) {
            const playerEntities = msg.entities.filter(e => e && (e.kind === 'player' || e.type === 'player' || e.playerId || (e.id && String(e.id).indexOf(':') > 0 && !String(e.id).startsWith('ai:'))));
            playerEntities.forEach(p => {
              const pid = p.playerId || p.id;
              if (pid && pid !== myPlayerId) {
                addOrUpdateRemotePlayer({
                  id: pid,
                  name: p.name || 'Player',
                  class: p.classId || p.class || 'warrior',
                  level: p.level || 1,
                  x: p.x, y: p.y, dir: p.dir || 0,
                  transform: p.transformId || p.transform,
                  moving: p.moving || false,
                });
                console.log('[GAME-WS] aoi_enter: 玩家進入視野 ' + pid + ' ' + (p.name || ''));
              }
            });
            // 更新在線人數
            const onlineCount = remotePlayers.size + 1;
            if (typeof _setOnlineCount === 'function') {
              _setOnlineCount(onlineCount);
            }
            // 通知game.js渲染
            if (typeof window.handleAOIEnter === 'function') {
              window.handleAOIEnter(msg.entities);
            }
          }
        } catch(e) {
          console.error('[GAME-WS] aoi_enter處理異常:', e);
        }
        break;
      case 'player_move':
        // v4.3.6：即時移動廣播（技術文檔第一階段：全部人直接廣播，不用AOI）
        if (typeof _startRenderLoop === 'function') _startRenderLoop();
        try {
          if (msg.playerId && msg.playerId !== myPlayerId) {
            var rp = remotePlayers.get(msg.playerId);
            if (!rp) {
              rp = createRemotePlayer({
                id: msg.playerId,
                kind: 'player',
                name: msg.name || 'Player',
                classId: msg.classId || 'warrior',
                level: msg.level || 1,
                x: msg.x,
                y: msg.y,
                hp: msg.hp,
                maxHp: msg.maxHp,
                nation: msg.nation || '',
              }, { x: msg.x, y: msg.y });
            }
            rp.targetX = msg.x;
            rp.targetY = msg.y;
            rp.x = msg.x;
            rp.y = msg.y;
            if (msg.hp != null) rp.hp = msg.hp;
            if (msg.name) rp.name = msg.name;
            _addDebugLog('[MP-MOVE] player_move id=' + msg.playerId + ' pos=(' + msg.x + ',' + msg.y + ')');
          }
        } catch(e) { _addDebugLog('[MP-MOVE] ERROR: ' + e.message); }
        break;
      // v4.3.7：戰鬥同步 — 玩家攻擊動畫
      case 'player_attack':
        try {
          if (msg.attackerId && msg.attackerId !== myPlayerId) {
            var atkP = remotePlayers.get(msg.attackerId);
            if (atkP && atkP.el) {
              atkP.el.classList.add('mp-attacking');
              setTimeout(function() { if (atkP.el) atkP.el.classList.remove('mp-attacking'); }, 400);
            }
          }
          _addDebugLog('[MP-ATK] player_attack attacker=' + msg.attackerId + ' target=' + msg.targetId);
        } catch(e) { _addDebugLog('[MP-ATK] ERROR: ' + e.message); }
        break;
      // v4.3.7：戰鬥同步 — 玩家受傷
      case 'player_damaged':
        try {
          if (msg.targetId) {
            // 更新遠端玩家血量
            if (msg.targetId !== myPlayerId) {
              var dmgP = remotePlayers.get(msg.targetId);
              if (dmgP) {
                dmgP.hp = msg.hp;
                dmgP.maxHp = msg.maxHp;
                if (dmgP._hpFill) dmgP._hpFill.style.width = Math.max(0, (msg.hp / msg.maxHp) * 100) + '%';
                if (msg.dead && dmgP.el) dmgP.el.style.opacity = '0.3';
              }
            }
            // 顯示傷害數字
            _showDamageNumber(msg.x || 0, msg.y || 0, msg.damage, msg.targetId === myPlayerId);
            _addDebugLog('[MP-DMG] player_damaged target=' + msg.targetId + ' dmg=' + msg.damage + ' hp=' + msg.hp + '/' + msg.maxHp + ' dead=' + msg.dead);
          }
        } catch(e) { _addDebugLog('[MP-DMG] ERROR: ' + e.message); }
        break;
      // v4.3.7：玩家復活
      case 'player_respawn':
        try {
          if (msg.playerId && msg.playerId !== myPlayerId) {
            var respP = remotePlayers.get(msg.playerId);
            if (respP) {
              respP.hp = msg.hp;
              if (respP._hpFill) respP._hpFill.style.width = '100%';
              if (respP.el) respP.el.style.opacity = '1';
            }
          }
          _addDebugLog('[MP-RESPAWN] player_respawn id=' + msg.playerId);
        } catch(e) { _addDebugLog('[MP-RESPAWN] ERROR: ' + e.message); }
        break;
      // v4.3.7：AI受傷
      case 'ai_damaged':
        try {
          _addDebugLog('[MP-AI-DMG] ai_damaged ai=' + msg.aiId + ' dmg=' + msg.damage + ' hp=' + msg.hp + '/' + msg.maxHp);
        } catch(e) {}
        break;
      case 'aoi_update':
        // v4.1.2：正確處理aoi_update，更新remotePlayers和在線人數
        // v4.3.5：確保渲染循環已啟動
        if (typeof _startRenderLoop === 'function') _startRenderLoop();
        try {
          const _allIds = (msg.entities || []).map(e => e.id || '?').join(',');
          _aoiMessageLog.unshift('[aoi_update] entities=' + (msg.entities?.length || 0) + ' ids=[' + _allIds + ']');
          if (_aoiMessageLog.length > 10) _aoiMessageLog.pop();
          
          if (msg.entities && Array.isArray(msg.entities)) {
            console.log('[GAME-WS] aoi_update entities數=' + msg.entities.length + ' 內容=' + JSON.stringify(msg.entities).substring(0,200));
            const playerEntities = msg.entities.filter(e => e && (e.kind === 'player' || e.type === 'player' || e.playerId || (e.id && String(e.id).indexOf(':') > 0 && !String(e.id).startsWith('ai:'))));
            const aiEntities = msg.entities.filter(e => e && e.id && String(e.id).startsWith('ai:'));
            console.log('[GAME-WS] aoi_update 玩家數=' + playerEntities.length + ' AI數=' + aiEntities.length + ' myPlayerId=' + myPlayerId);
            // v4.3.9：渲染伺服器端AI
            aiEntities.forEach(ai => {
              addOrUpdateServerAI(ai);
            });
            // 移除不在AOI範圍內的AI
            const visibleAiIds = new Set(aiEntities.map(a => a.id));
            for (const [aiId, ai] of serverAIs) {
              if (!visibleAiIds.has(aiId)) {
                if (ai.el && ai.el.parentNode) ai.el.parentNode.removeChild(ai.el);
                serverAIs.delete(aiId);
              }
            }
            // 更新remotePlayers
            playerEntities.forEach(p => {
              const pid = p.playerId || p.id;
              if (pid && pid !== myPlayerId) {
                addOrUpdateRemotePlayer({
                  id: pid,
                  name: p.name || 'Player',
                  class: p.classId || p.class || 'warrior',
                  level: p.level || 1,
                  x: p.x, y: p.y, dir: p.dir || 0,
                  transform: p.transformId || p.transform,
                  moving: p.moving || false,
                });
              }
            });
            // 移除不在AOI範圍內的玩家
            const visibleIds = new Set(playerEntities.map(p => p.playerId || p.id));
            const toRemove = [];
            remotePlayers.forEach((_, pid) => {
              if (!visibleIds.has(pid)) toRemove.push(pid);
            });
            toRemove.forEach(pid => removeRemotePlayer(pid));
            // 更新在線人數（可見玩家數+1自己）
            const onlineCount = playerEntities.filter(p => (p.playerId || p.id) !== myPlayerId).length + 1;
            if (typeof _setOnlineCount === 'function') {
              _setOnlineCount(onlineCount);
            }
            // 通知game.js渲染
            if (typeof window.handleAOIUpdate === 'function') {
              window.handleAOIUpdate(msg.entities);
            }
            if (playerEntities.length > 0) {
              console.log('[GAME-WS] aoi_update: 可見玩家數=' + (onlineCount-1) + ' 總實體數=' + msg.entities.length);
            }
          }
        } catch(e) {
          console.error('[GAME-WS] aoi_update處理異常:', e);
        }
        break;
      case 'aoi_leave':
        // v4.1.2：正確處理aoi_leave，移除remotePlayers
        try {
          if (msg.ids && Array.isArray(msg.ids)) {
            msg.ids.forEach(pid => {
              if (pid !== myPlayerId) removeRemotePlayer(pid);
            });
            if (typeof window.handleAOILeave === 'function') {
              window.handleAOILeave(msg.ids);
            }
          }
        } catch(e) {
          console.error('[GAME-WS] aoi_leave處理異常:', e);
        }
        break;
      // v3.1.0：Zone Server 地圖切換事件
      case 'map_change':
        console.log('[WS] 🗺️ map_change - 從', msg.fromMap, '到', msg.targetMap, '實體數=', msg.entities?.length || 0);
        // 通知 game.js 切換地圖
        if (typeof window.handleMapChange === 'function') {
          window.handleMapChange(msg);
        }
        break;
      case 'change_map_fail':
        console.warn('[WS] 切換地圖失敗:', msg.error, '(target:', msg.targetMap, ')');
        break;
      case 'player_join':
        if (msg.playerId !== myPlayerId) {
          addOrUpdateRemotePlayer({
            id: msg.playerId,
            name: msg.name,
            class: msg.classId,
            level: msg.level,
            x: msg.x, y: msg.y, dir: msg.dir,
            transform: msg.transformId,
          });
        }
        break;
      case 'player_leave':
        if (msg.playerId !== myPlayerId) {
          removeRemotePlayer(msg.playerId);
        }
        break;
      case 'player_move':
        if (msg.playerId !== myPlayerId) {
          handlePlayerMove({
            id: msg.playerId,
            x: msg.x, y: msg.y, dir: msg.dir,
            moving: true,
          });
        }
        break;
      case 'player_profile':
        if (msg.playerId !== myPlayerId) {
          const p = remotePlayers.get(msg.playerId);
          if (p) {
            if (msg.name != null) p.name = msg.name;
            if (msg.level != null) p.level = msg.level;
            if (msg.transformId != null) p.transform = msg.transformId;
          }
        }
        break;
      case 'map_state':
        // 進入地圖時的初始狀態（WS 通道，包含 WS+LP 玩家快照）
        if (msg.players && Array.isArray(msg.players)) {
          handlePlayerSnapshot(msg.players);
        }
        // v2.7.2：同步伺服器級 AI
        if (msg.ais && Array.isArray(msg.ais) && typeof window.setServerAIs === 'function') {
          window.setServerAIs(msg.ais, msg.serverId, msg.mapId);
        }
        break;
      case 'ai_snapshot':
      case 'ai_update':
        if (msg.ais && Array.isArray(msg.ais) && typeof window.setServerAIs === 'function') {
          window.setServerAIs(msg.ais, msg.serverId, msg.mapId);
        }
        break;
      // v2.7.5：伺服器 AI 戰鬥事件
      case 'ai_damaged':
      case 'ai_killed':
      case 'ai_attack':
      case 'ai_respawn':
        if (typeof window._handleServerAIEvent === 'function') {
          try { window._handleServerAIEvent(msg.type, msg); } catch(e) { console.warn('[WS] AI event error:', e); }
        }
        break;
      case 'chat':
        if (onChatMessage && msg.playerId !== myPlayerId) {
          try {
            onChatMessage({
              name: msg.name,
              text: msg.text,
              channel: msg.channel || 'map',
              playerId: msg.playerId,
            });
          } catch(e) {}
        }
        break;
      case 'gm_broadcast':
        if (onChatMessage) {
          try {
            onChatMessage({
              name: '【系統公告】',
              text: msg.text || '',
              channel: 'system',
              system: true,
            });
          } catch(e) {}
        }
        break;
      case 'pong':
        break;
      default:
        break;
    }
  }

  // v2.8.0：LP 自適應輪詢間隔（閒置拉長、有事件快輪）
  let _lpPollInterval = 50;     // 當前 poll 間隔
  const LP_POLL_MIN = 50;       // 最快 50ms（有事件時）
  const LP_POLL_MAX = 2000;     // 最慢 2s（完全閒置）
  const LP_POLL_IDLE_STEPS = 5; // 連續 N 次空回應才拉長
  let _lpIdleCount = 0;

  function adjustPollInterval(hasEvents) {
    if (hasEvents) {
      // 有事件：回到最快
      _lpIdleCount = 0;
      _lpPollInterval = LP_POLL_MIN;
    } else {
      _lpIdleCount++;
      if (_lpIdleCount >= LP_POLL_IDLE_STEPS) {
        // 閒置太久：逐漸拉長
        _lpPollInterval = Math.min(LP_POLL_MAX, _lpPollInterval * 1.5);
        _lpIdleCount = 0;
      }
    }
  }

  // v4.1.0：WS ONLY — Long-Poll 循環已完全移除

  function handlePollEvents(events) {
    if (!events || !events.length) return;
    for (const ev of events) {
      if (!ev || !ev.type) continue;
      switch (ev.type) {
        case 'join':
          if (ev.playerId !== myPlayerId && ev.state) {
            addOrUpdateRemotePlayer({
              id: ev.playerId,
              name: ev.state.name,
              class: ev.state.classId,
              level: ev.state.level,
              x: ev.state.x, y: ev.state.y, dir: ev.state.dir,
              transform: ev.state.transformId,
            });
          }
          break;
        case 'leave':
          if (ev.playerId !== myPlayerId) {
            removeRemotePlayer(ev.playerId);
          }
          break;
        case 'move':
          if (ev.playerId !== myPlayerId) {
            handlePlayerMove({
              id: ev.playerId,
              x: ev.x, y: ev.y, dir: ev.dir,
              hp: ev.hp, transform: ev.transformId,
              moving: true,
            });
          }
          break;
        case 'chat':
          if (onChatMessage) {
            try {
              onChatMessage({
                name: ev.name || '匿名',
                text: ev.text || '',
                channel: ev.channel || 'map',
                country: null,
              });
            } catch(e) {}
          }
          break;
        case 'attack':
          if (ev.playerId !== myPlayerId) {
            // 觸發遠端玩家攻擊動畫
            const p = remotePlayers.get(ev.playerId);
            if (p && p.el) {
              p.el.classList.add('attacking');
              setTimeout(() => { if (p.el) p.el.classList.remove('attacking'); }, 300);
            }
            // 怪物傷害回調
            if (onMonsterDamage && ev.targetId) {
              const wPos = { x: ev.x || 0, y: ev.y || 0 };
              try {
                onMonsterDamage({
                  monsterId: ev.targetId,
                  damage: ev.damage || 0,
                  isCrit: false,
                  x: wPos.x,
                  y: wPos.y,
                  attackerName: '',
                });
              } catch(e) {}
            }
          }
          break;
        // v2.7.5：伺服器 AI 戰鬥事件（LP 通道）
        case 'ai_damaged':
        case 'ai_killed':
        case 'ai_attack':
        case 'ai_respawn':
          if (typeof window._handleServerAIEvent === 'function') {
            try { window._handleServerAIEvent(ev.type, ev); } catch(e) {}
          }
          break;
      }
    }
  }

  // ========== 工具：清空遠端玩家 ==========
  // v2.8.0：處理完整 players 快照（LP poll 返回或 WS map_state 返回）
  //  用快照做為真相：新增、更新、移除不在快照中的玩家
  function handlePlayerSnapshot(players) {
    if (!players || !Array.isArray(players)) return;
    const seen = new Set();
    players.forEach(p => {
      if (!p || !p.playerId) return;
      if (p.playerId === myPlayerId) return;
      seen.add(p.playerId);
      addOrUpdateRemotePlayer({
        id: p.playerId,
        name: p.name,
        class: p.classId,
        level: p.level,
        x: p.x, y: p.y, dir: p.dir,
        transform: p.transformId,
        country: p.nation,
      });
    });
    // 移除不在快照中的玩家
    for (const id of remotePlayers.keys()) {
      if (!seen.has(id)) removeRemotePlayer(id);
    }
    // v3.1.4：更新在線人數顯示（包含自己）
    try { _setOnlineCount(players.length + 1); } catch(e) {}
  }

  // v2.8.0：取得附近玩家數（給 UI 顯示「附近玩家:N」）
  function getNearbyPlayerCount() {
    let n = 0;
    for (const p of remotePlayers.values()) {
      if (p.el && !p.isBot) n++;
    }
    return n;
  }

  function handleMapState(entities, monsters) {
    const seen = new Set();
    entities.forEach(ent => {
      if (!ent || !ent.id) return;
      if (ent.id === myPlayerId) return;
      seen.add(ent.id);
      addOrUpdateRemotePlayer(ent);
    });
    for (const id of remotePlayers.keys()) {
      if (!seen.has(id)) removeRemotePlayer(id);
    }
  }

  function handlePlayerMove(data) {
    if (data.id === myPlayerId) return;
    let p = remotePlayers.get(data.id);
    if (!p) {
      p = createRemotePlayer({ id: data.id, x: data.x, y: data.y, dir: data.dir });
      remotePlayers.set(data.id, p);
    }
    const wPos = serverToWorld(data.x || 0, data.y || 0);
    p.targetX = wPos.x;
    p.targetY = wPos.y;
    p.dir = (data.dir === -1 || data.dir === 1) ? data.dir : (data.dir || 1);
    p.moving = !!data.moving;
    p.lastMoveAt = Date.now();
  }

  function addOrUpdateRemotePlayer(ent) {
    _addDebugLog('[MP-DEBUG] addOrUpdateRemotePlayer id=' + ent.id + ' name=' + (ent.name||'?') + ' x=' + ent.x + ' y=' + ent.y + ' kind=' + (ent.kind||'?'));
    if (ent.id === myPlayerId) { _addDebugLog('[MP-DEBUG] 跳過自己: ' + ent.id); return; }
    let p = remotePlayers.get(ent.id);
    _addDebugLog('[MP-DEBUG] remotePlayers中已存在: ' + (p ? 'YES' : 'NO'));
    const wPos = serverToWorld(ent.x || 0, ent.y || 0);
    if (!p) {
      p = createRemotePlayer(ent, wPos);
      remotePlayers.set(ent.id, p);
    } else {
      if (ent.name != null) p.name = ent.name;
      if (ent.class != null) p.classId = ent.class;
      if (ent.level != null) p.level = ent.level;
      if (ent.transform != null) p.transformId = ent.transform;
      if (ent.country != null) p.nation = ent.country;
      if (ent.x != null) { p.targetX = wPos.x; p.x = wPos.x; }
      if (ent.y != null) { p.targetY = wPos.y; p.y = wPos.y; }
      if (ent.dir != null) p.dir = ent.dir;
      p.moving = !!ent.moving;
      p.isBot = !!ent.isBot;
      p.lastMoveAt = Date.now();
    }
    if (!p.el) buildRemotePlayerDOM(p);
    else refreshRemotePlayerVisual(p);
    return p;
  }

  function createRemotePlayer(ent, wPos) {
    const pos = wPos || { x: 0, y: 0 };
    return {
      id: ent.id,
      name: ent.name || 'Player',
      classId: ent.class || 'warrior',
      level: ent.level || 1,
      transformId: ent.transform || null,
      nation: ent.country || null,
      x: pos.x,
      y: pos.y,
      targetX: pos.x,
      targetY: pos.y,
      dir: (ent.dir === -1 || ent.dir === 1) ? ent.dir : 1,
      moving: !!ent.moving,
      isBot: !!ent.isBot,
      el: null,
      lastMoveAt: Date.now(),
      _wasWalking: false,
    };
  }

  function removeRemotePlayer(id) {
    const p = remotePlayers.get(id);
    if (!p) return;
    if (p.el && p.el.parentNode) p.el.remove();
    remotePlayers.delete(id);
  }

  function clearAllRemotePlayers() {
    for (const id of remotePlayers.keys()) {
      const p = remotePlayers.get(id);
      if (p && p.el && p.el.parentNode) p.el.remove();
    }
    remotePlayers.clear();
  }

  // ========== 渲染（使用現有 SPRITE 圖資、8幀動畫） ==========
  function getSpriteForRemote(p) {
    if (typeof window.SPRITE === 'undefined') return null;
    if (p.transformId) {
      const key = String(p.transformId).replace(/^tf_/, '').replace(/^t_/, '');
      if (SPRITE[key]) return SPRITE[key];
      if (SPRITE['t_' + key]) return SPRITE['t_' + key];
    }
    if (SPRITE[p.classId]) return SPRITE[p.classId];
    return SPRITE.warrior || null;
  }

  // v4.3.9：伺服器端AI渲染
  function addOrUpdateServerAI(aiData) {
    try {
      var aiId = aiData.id;
      var ai = serverAIs.get(aiId);
      if (!ai) {
        ai = {
          id: aiId,
          name: aiData.name || 'Monster',
          level: aiData.level || 1,
          x: aiData.x || 0,
          y: aiData.y || 0,
          hp: aiData.hp || 100,
          maxHp: aiData.maxHp || 100,
          nation: aiData.nation || '',
          state: aiData.state || 'idle',
          el: null,
          _hpFill: null,
        };
        buildServerAIDOM(ai);
        serverAIs.set(aiId, ai);
        _addDebugLog('[MP-AI] 新增伺服器AI id=' + aiId + ' name=' + ai.name);
      }
      ai.x = aiData.x != null ? aiData.x : ai.x;
      ai.y = aiData.y != null ? aiData.y : ai.y;
      ai.hp = aiData.hp != null ? aiData.hp : ai.hp;
      ai.maxHp = aiData.maxHp != null ? aiData.maxHp : ai.maxHp;
      ai.name = aiData.name || ai.name;
      ai.level = aiData.level || ai.level;
      ai.state = aiData.state || ai.state;
      if (ai._hpFill && ai.maxHp) {
        ai._hpFill.style.width = Math.max(0, (ai.hp / ai.maxHp) * 100) + '%';
      }
    } catch(e) { _addDebugLog('[MP-AI] addOrUpdate ERROR: ' + e.message); }
  }
  
  function buildServerAIDOM(ai) {
    try {
      var elDiv = document.createElement('div');
      elDiv.id = 'mp_ai_' + ai.id.replace(/:/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      elDiv.className = 'mp-server-ai';
      elDiv.style.cssText = 'position:fixed !important; width:50px !important; height:56px !important; z-index:99998 !important; display:block !important; visibility:visible !important; opacity:1 !important; pointer-events:none !important;';
      
      // 名字
      var nameEl = document.createElement('div');
      nameEl.style.cssText = 'position:absolute;top:-16px;left:50%;transform:translateX(-50%);text-align:center;white-space:nowrap;z-index:2;';
      nameEl.innerHTML = '<div style="width:46px;height:3px;background:#333;border-radius:2px;margin:0 auto;"><div class="ai-hp-fill" style="width:100%;height:100%;background:#ff4444;border-radius:2px;"></div></div><div style="color:#ff6666;font-size:9px;font-weight:bold;text-shadow:1px 1px 2px #000;">' + ai.name + ' Lv.' + ai.level + '</div>';
      elDiv.appendChild(nameEl);
      ai._hpFill = nameEl.querySelector('.ai-hp-fill');
      
      // 精靈圖包裹
      var wrap = document.createElement('div');
      wrap.style.cssText = 'position:relative;width:50px;height:56px;';
      
      // 嘗試使用SPRITE精靈圖（AI/怪物）
      var aiSprite = null;
      try {
        if (typeof SPRITE !== 'undefined') {
          aiSprite = SPRITE[ai.classId] || SPRITE.enemy || SPRITE.warrior || null;
        }
      } catch(e) {}
      
      if (aiSprite && aiSprite.useImg && aiSprite.idle) {
        var img = document.createElement('img');
        img.src = aiSprite.idle;
        img.style.cssText = 'position:absolute;bottom:0;left:50%;transform:translateX(-50%);max-width:50px;max-height:56px;object-fit:contain;filter:drop-shadow(0 0 3px #ff6060) drop-shadow(0 2px 3px rgba(0,0,0,0.8));';
        img.alt = '';
        img.loading = 'lazy';
        img.onerror = function() {
          // v4.3.11：先嘗試把.jpg換成.png
          if (this.src && this.src.indexOf('.jpg') !== -1 && !this.dataset.pngTried) {
            this.dataset.pngTried = '1';
            this.src = this.src.replace(/\.jpg(\?|$)/, '.png$1');
            return;
          }
          this.style.display = 'none';
          var emoji = document.createElement('div');
          emoji.style.cssText = 'position:absolute;bottom:0;left:50%;transform:translateX(-50%);font-size:32px;';
          emoji.textContent = '👹';
          wrap.appendChild(emoji);
        };
        wrap.appendChild(img);
      } else {
        var emoji = document.createElement('div');
        emoji.style.cssText = 'position:absolute;bottom:0;left:50%;transform:translateX(-50%);font-size:32px;';
        emoji.textContent = '👹';
        wrap.appendChild(emoji);
      }
      
      // 陰影
      var shadow = document.createElement('div');
      shadow.style.cssText = 'position:absolute;bottom:-3px;left:50%;transform:translateX(-50%);width:24px;height:6px;background:rgba(0,0,0,0.4);border-radius:50%;';
      wrap.appendChild(shadow);
      
      elDiv.appendChild(wrap);
      document.body.appendChild(elDiv);
      ai.el = elDiv;
    } catch(e) { _addDebugLog('[MP-AI] buildDOM ERROR: ' + e.message); }
  }

  function buildRemotePlayerDOM(p) {
    _addDebugLog('[MP-RENDER] buildRemotePlayerDOM id=' + p.id + ' name=' + (p.name||'?'));
    if (typeof document === 'undefined') return;
    try {
      var elDiv = document.createElement('div');
      elDiv.id = 'mp_fixed_' + p.id.replace(/:/g, '_');
      elDiv.className = 'mp-fixed-remote-player mp-remote-player';
      elDiv.style.cssText = 'position:fixed !important; width:64px !important; height:80px !important; z-index:99999 !important; display:block !important; visibility:visible !important; opacity:1 !important; pointer-events:none !important; transition:transform 0.1s;';
      
      // 國家判斷
      var myNation = null;
      try { if (typeof GS !== 'undefined') myNation = GS.nation || null; } catch(e) {}
      var isEnemy = p.nation && myNation && p.nation !== myNation;
      
      // 名字標籤
      var nameEl = document.createElement('div');
      nameEl.className = 'unit-info';
      nameEl.style.cssText = 'position:absolute;top:-20px;left:50%;transform:translateX(-50%);text-align:center;white-space:nowrap;z-index:2;';
      nameEl.innerHTML = '<div class="unit-hp-bar" style="width:60px;height:4px;background:#333;border-radius:2px;margin:0 auto;"><div class="unit-hp-fill" style="width:100%;height:100%;background:' + (isEnemy ? '#ff5050' : '#50c8ff') + ';border-radius:2px;"></div></div><div class="unit-name" style="color:' + (isEnemy ? '#ff8080' : '#80d0ff') + ';font-size:10px;text-shadow:1px 1px 2px #000;">' + (p.name || 'Player') + '</div>';
      elDiv.appendChild(nameEl);
      p._hpFill = nameEl.querySelector('.unit-hp-fill');
      
      // 精靈圖包裹
      var wrap = document.createElement('div');
      wrap.className = 'unit-sprite-wrap';
      wrap.style.cssText = 'position:relative;width:64px;height:80px;';
      
      // 嘗試使用SPRITE精靈圖
      var spriteData = null;
      try {
        if (typeof SPRITE !== 'undefined') {
          spriteData = SPRITE[p.classId] || SPRITE.warrior || SPRITE[p.transformId] || null;
        }
      } catch(e) {}
      
      if (spriteData && spriteData.useImg && spriteData.idle) {
        var img = document.createElement('img');
        img.className = 'unit-sprite-img sprite-frame-idle';
        img.src = spriteData.idle;
        img.style.cssText = 'position:absolute;bottom:0;left:50%;transform:translateX(-50%);max-width:64px;max-height:80px;object-fit:contain;filter:drop-shadow(0 0 4px #ffe090) drop-shadow(0 2px 3px rgba(0,0,0,0.8));';
        img.alt = '';
        img.loading = 'lazy';
        img.onerror = function() {
          // v4.3.11：先嘗試把.jpg換成.png（assetUrl預設返回.jpg，但精靈圖可能是.png）
          if (this.src && this.src.indexOf('.jpg') !== -1 && !this.dataset.pngTried) {
            this.dataset.pngTried = '1';
            this.src = this.src.replace(/\.jpg(\?|$)/, '.png$1');
            _addDebugLog('[MP-RENDER] jpg失敗，嘗試png: ' + this.src);
            return;
          }
          this.style.display = 'none';
          var emoji = document.createElement('div');
          emoji.style.cssText = 'position:absolute;bottom:0;left:50%;transform:translateX(-50%);font-size:40px;';
          emoji.textContent = '⚔';
          wrap.appendChild(emoji);
          _addDebugLog('[MP-RENDER] 精靈圖加載失敗，使用emoji備用');
        };
        wrap.appendChild(img);
        _addDebugLog('[MP-RENDER] 使用精靈圖: ' + spriteData.idle);
      } else {
        var emoji = document.createElement('div');
        emoji.style.cssText = 'position:absolute;bottom:0;left:50%;transform:translateX(-50%);font-size:40px;';
        emoji.textContent = isEnemy ? '⚔' : '🛡';
        wrap.appendChild(emoji);
        _addDebugLog('[MP-RENDER] SPRITE不可用，使用emoji備用');
      }
      
      // 陰影
      var shadow = document.createElement('div');
      shadow.className = 'unit-shadow';
      shadow.style.cssText = 'position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);width:32px;height:8px;background:rgba(0,0,0,0.4);border-radius:50%;';
      wrap.appendChild(shadow);
      
      elDiv.appendChild(wrap);
      document.body.appendChild(elDiv);
      p.el = elDiv;
      _addDebugLog('[MP-RENDER] buildRemotePlayerDOM SUCCESS id=' + p.id + ' parent=body');
    } catch(e) {
      _addDebugLog('[MP-RENDER] buildRemotePlayerDOM ERROR: ' + e.message);
    }
  }

  function refreshRemotePlayerVisual(p) {
    if (!p.el) { buildRemotePlayerDOM(p); return; }
    // 更新名字
    var nameDiv = p.el.querySelector('div:nth-child(2)');
    if (nameDiv && p.name) nameDiv.textContent = p.name;
  }

  // ========== 每幀內插 ==========
  function updateRemotePlayers(dt) {
    if (remotePlayers.size === 0 && serverAIs.size === 0) return;
    // v4.3.8：CAMERA和GS是const聲明的全局變量，不能用window.CAMERA訪問
    var camX = 0, camY = 0;
    try { if (typeof CAMERA !== 'undefined') { camX = CAMERA.x; camY = CAMERA.y; } } catch(e) {}
    var vw = window.innerWidth, vh = window.innerHeight;
    try { if (typeof worldW !== 'undefined') vw = worldW; } catch(e) {}
    try { if (typeof worldH !== 'undefined') vh = worldH; } catch(e) {}
    
    for (var p of remotePlayers.values()) {
      if (!p.el) continue;
      
      // 內插移動
      var dx = p.targetX - p.x;
      var dy = p.targetY - p.y;
      var dist = Math.hypot(dx, dy);
      if (dist > 0.5) {
        var lerpFactor = 1 - Math.pow(0.001, dt);
        p.x += dx * lerpFactor;
        p.y += dy * lerpFactor;
      } else {
        p.x = p.targetX;
        p.y = p.targetY;
      }
      
      // 計算屏幕座標（世界座標 -> 屏幕座標）
      var screenX = (p.x - camX) + vw / 2;
      var screenY = (p.y - camY) + vh / 2;
      
      // 更新position:fixed的位置
      p.el.style.left = Math.round(screenX - 32) + 'px';
      p.el.style.top = Math.round(screenY - 80) + 'px';
      
      // v4.3.8：暫時禁用視口剔除，確保遠端玩家一定顯示
      p.el.style.display = 'block';
      p.el.style.visibility = 'visible';
      p.el.style.opacity = '1';
      
      // 更新血條
      if (p._hpFill && p.maxHp) {
        var hpPct = Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100));
        p._hpFill.style.width = hpPct + '%';
      }
    }
    
    // v4.3.9：更新伺服器AI位置
    for (var ai of serverAIs.values()) {
      if (!ai.el) continue;
      var aiScreenX = (ai.x - camX) + vw / 2;
      var aiScreenY = (ai.y - camY) + vh / 2;
      ai.el.style.left = Math.round(aiScreenX - 25) + 'px';
      ai.el.style.top = Math.round(aiScreenY - 56) + 'px';
      ai.el.style.display = 'block';
      ai.el.style.visibility = 'visible';
      ai.el.style.opacity = '1';
    }
  }
  
  // v4.3.5：獨立渲染循環，確保遠端玩家每幀更新
  var _renderLoopRunning = false;
  // v4.3.7：顯示傷害數字
  function _showDamageNumber(worldX, worldY, damage, isSelf) {
    try {
      var camX = 0, camY = 0;
      try { if (typeof CAMERA !== 'undefined') { camX = CAMERA.x; camY = CAMERA.y; } } catch(e) {}
      var vw = window.innerWidth, vh = window.innerHeight;
      try { if (typeof worldW !== 'undefined') vw = worldW; } catch(e) {}
      try { if (typeof worldH !== 'undefined') vh = worldH; } catch(e) {}
      var screenX = (worldX - camX) + vw / 2;
      var screenY = (worldY - camY) + vh / 2;
      
      var dmgEl = document.createElement('div');
      dmgEl.style.cssText = 'position:fixed;left:' + screenX + 'px;top:' + (screenY - 80) + 'px;color:' + (isSelf ? '#ff4444' : '#ffff44') + ';font-size:20px;font-weight:bold;text-shadow:2px 2px 4px #000;z-index:100000;pointer-events:none;transition:all 1s ease-out;';
      dmgEl.textContent = '-' + damage;
      document.body.appendChild(dmgEl);
      
      setTimeout(function() {
        dmgEl.style.top = (screenY - 120) + 'px';
        dmgEl.style.opacity = '0';
      }, 50);
      setTimeout(function() { if (dmgEl.parentNode) dmgEl.parentNode.removeChild(dmgEl); }, 1100);
    } catch(e) {}
  }

  function _startRenderLoop() {
    if (_renderLoopRunning) return;
    _renderLoopRunning = true;
    var lastTime = performance.now();
    function loop(now) {
      var dt = Math.min(100, now - lastTime);
      lastTime = now;
      try { updateRemotePlayers(dt / 1000); } catch(e) {}
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    _addDebugLog('[MP-RENDER] 獨立渲染循環已啟動');
  }
  // 直接啟動（如果已經在線）
  if (status === STATUS.ONLINE) _startRenderLoop();

  // v3.1.4：遊戲畫面左上角 網路狀態標籤（增大字體、顯示在線人數、點擊查看診斷）
  let _wsBadgeEl = null;
  let _wsBadgeState = 'offline';
  let _wsBadgeLabel = '離線';
  let _wsOnlineCount = 0;
  let _wsTransport = '?';
  function _ensureWsBadge() {
    if (_wsBadgeEl) return;
    try {
      const badge = document.createElement('div');
      badge.id = 'ws-status-badge';
      badge.style.cssText = 'position:fixed;top:8px;left:8px;z-index:999999;padding:5px 10px;font-size:13px;font-weight:600;font-family:monospace;border-radius:6px;cursor:pointer;opacity:0.92;box-shadow:0 2px 8px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.15);user-select:none;';
      badge.textContent = '網路:離線 0人';
      badge.style.background = '#333';
      badge.style.color = '#aaa';
      badge.title = '點擊查看網路診斷';
      badge.addEventListener('click', function(e) {
        e.stopPropagation();
        _showNetworkDiagnostics();
      });
      document.body.appendChild(badge);
      _wsBadgeEl = badge;
    } catch(e) {}
  }
  function _updateWsBadge(state, label) {
    _ensureWsBadge();
    if (!_wsBadgeEl) return;
    _wsBadgeState = state;
    _wsBadgeLabel = label || state;
    const transport = useWebSocket ? 'WS' : 'OFF';
    _wsTransport = transport;
    const count = _wsOnlineCount;
    const stateLabel = {
      online: '在線', connecting: '連線中', error: '錯誤',
      offline: '離線', reconnecting: '重連中',
    }[state] || state;
    _wsBadgeEl.textContent = transport + ':' + stateLabel + ' ' + count + '人';
    const colors = {
      online:    { bg: '#1a4d2e', color: '#4ecdc4' },
      connecting:{ bg: '#3d3d1a', color: '#ffd93d' },
      error:     { bg: '#4d1a1a', color: '#ff6b6b' },
      offline:   { bg: '#333',    color: '#aaa' },
      reconnecting: { bg: '#3d3d1a', color: '#ffd93d' },
    };
    const c = colors[state] || colors.offline;
    _wsBadgeEl.style.background = c.bg;
    _wsBadgeEl.style.color = c.color;
  }
  function _setOnlineCount(n) {
    _wsOnlineCount = n || 0;
    _updateWsBadge(_wsBadgeState, _wsBadgeLabel);
  }
  function _showNetworkDiagnostics() {
    try {
      const logText = _wsDiagLog.length > 0 ? _wsDiagLog.slice(-25).join('\n') : '(尚無日誌)';
      const info = [
        '===== 網路診斷 =====',
        '狀態: ' + _wsBadgeLabel,
        '傳輸: ' + _wsTransport,
        '在線人數: ' + _wsOnlineCount,
        'WS已連線: ' + (wsConnected ? '是' : '否'),
        'WS使用中: ' + (useWebSocket ? '是' : '否'),
        'Long-Poll使用中: 否 (v4.1.0 WS ONLY)',
        '伺服器URL: ' + (serverUrl || '未設定'),
        'Token長度: ' + (authToken ? authToken.length : 0),
        'Token前15: ' + (authToken ? authToken.substring(0,15) : '空'),
        'Token格式: ' + (authToken ? (authToken.split('.').length + '段, 各段長度=' + authToken.split('.').map(s=>s.length).join(',')) : '空'),
        'WS失敗原因: ' + (_wsFailureReason || '無'),
        '當前地圖: ' + (currentMapId || '無'),
        '我的PlayerID: ' + (myPlayerId || '無'),
        '遠端玩家數: ' + (remotePlayers ? remotePlayers.size : 0),
        (function() {
          try {
            var _wl = document.getElementById('world-layer');
            var _wc = _wl ? _wl.children.length : -1;
            var _re = _wl ? _wl.querySelectorAll('.world-unit.remote-player').length : -1;
            var _camX = '?', _camY = '?';
            try { if (typeof CAMERA !== 'undefined') { _camX = CAMERA.x; _camY = CAMERA.y; } } catch(e) {}
            var _myX = '?', _myY = '?';
            try { if (typeof GS !== 'undefined' && GS.player) { _myX = GS.player.x; _myY = GS.player.y; } } catch(e) {}
            var _spriteOk = '?';
            try { _spriteOk = (typeof SPRITE !== 'undefined') ? ('OK warrior=' + (SPRITE.warrior ? SPRITE.warrior.idle : 'null')) : 'undefined'; } catch(e) { _spriteOk = 'err:' + e.message; }
            var _info = 'world-layer子元素: ' + _wc + ', 遠端玩家DOM: ' + _re + ' 相機=(' + _camX + ',' + _camY + ') 我=(' + _myX + ',' + _myY + ') SPRITE=' + _spriteOk;
            if (remotePlayers && remotePlayers.size > 0) {
              for (var _rp of remotePlayers.values()) {
                var _ei = 'el=NULL';
                if (_rp.el) {
                  try {
                    var _rect = _rp.el.getBoundingClientRect();
                    var _html = _rp.el.innerHTML.substring(0, 200).replace(/\n/g, ' ');
                    var _imgs = _rp.el.querySelectorAll('img');
                    var _imgInfo = '';
                    if (_imgs.length > 0) {
                      _imgInfo = ' imgs=' + _imgs.length + ' src0=' + (_imgs[0].src || '?').substring(0, 50) + ' complete=' + _imgs[0].complete + ' natW=' + _imgs[0].naturalWidth;
                    }
                    _ei = 'el=YES parent=' + (_rp.el.parentNode ? 'Y' : 'N') + ' disp=' + _rp.el.style.display + ' vis=' + _rp.el.style.visibility + ' left=' + _rp.el.style.left + ' top=' + _rp.el.style.top + ' z=' + _rp.el.style.zIndex + ' screen=(' + Math.round(_rect.left) + ',' + Math.round(_rect.top) + ') size=' + _rp.el.offsetWidth + 'x' + _rp.el.offsetHeight + _imgInfo + ' html=' + _html;
                  } catch(_e) { _ei = 'el=YES err=' + _e.message; }
                }
                _info += '\n  [' + _rp.id + '] ' + (_rp.name||'?') + ' pos=(' + Math.round(_rp.x) + ',' + Math.round(_rp.y) + ') ' + _ei;
              }
            }
            return _info;
          } catch(e) { return 'DOM調試錯誤: ' + e.message; }
        })(),
        '',
        '===== 最近AOI消息（最新10筆）=====',
        _aoiMessageLog.length > 0 ? _aoiMessageLog.join('\n') : '(尚無AOI消息)',
        '',
        '===== WS 連線日誌（最新25筆）=====',
        logText,
        '',
        '===== 除錯日誌（最新20筆）=====',
        _debugLog.length > 0 ? _debugLog.join('\n') : '(尚無除錯日誌)',
      ].join('\n');
      alert(info);
    } catch(e) {
      alert('網路診斷錯誤: ' + e.message);
    }
  }

   // ========== v4.1.3：閒置檢測 — 5分鐘無操作自動斷線並回到首頁 ==========
  let _idleTimer = null;
  let _idleStartTime = Date.now();
  const IDLE_TIMEOUT = 5 * 60 * 1000; // 5分鐘

  function _resetIdleTimer() {
    _idleStartTime = Date.now();
    if (_idleTimer) {
      clearTimeout(_idleTimer);
    }
    _idleTimer = setTimeout(() => {
      console.log('[GAME-WS] ⏰ 閒置超過5分鐘，自動斷線');
      try {
        if (typeof window.addLog === 'function') {
          addLog('system', '閒置超過5分鐘，已自動斷線，請重新登入');
        }
      } catch(e) {}
      // 斷開WebSocket
      try { MultiplayerClient.disconnect(); } catch(e) {}
      // 回到遊戲首頁
      setTimeout(() => {
        try {
          if (typeof window.location !== 'undefined') {
            window.location.href = window.location.origin + window.location.pathname;
          }
        } catch(e) {}
      }, 500);
    }, IDLE_TIMEOUT);
  }

  // 監聽用戶操作，重置閒置計時
  if (typeof window !== 'undefined') {
    ['click', 'keydown', 'touchstart', 'mousemove', 'scroll'].forEach(evt => {
      window.addEventListener(evt, () => {
        if (useWebSocket && wsConnected) {
          _resetIdleTimer();
        }
      }, { passive: true });
    });
    // 頁面可見時重置，隱藏時保持計時
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && useWebSocket && wsConnected) {
        _resetIdleTimer();
      }
    });
  }

  // 連線成功後啟動閒置檢測
  const _origSetStatus = setStatus;
  // 在join_map_ok處理中啟動閒置計時（通過攔截wsConnected設置）

   // ========== 暴露到全域 ==========
  window.MultiplayerClient = MultiplayerClient;
  window.MultiplayerClient.resetIdleTimer = _resetIdleTimer;
  window.MultiplayerClient.getIdleTime = () => Date.now() - _idleStartTime;

  // 頁面關閉/刷新前主動斷線
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      try { MultiplayerClient.disconnect(); } catch (e) { /* ignore */ }
    });
  }
})();

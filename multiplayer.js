(function() {
  'use strict';

  // v2.4.0：Long-Poll 多人連線客戶端（零依賴，純 fetch）
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
  let pollAbortController = null;
  let pollRunning = false;
  let reconnectDelay = 1000;
  let lastPollTime = 0;
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

    // 連線：token 從遊戲端傳入（與 cookie 同步）
     connect(url, token) {
       const u = (url || '').trim();
       if (!u) {
         setStatus(STATUS.ERROR);
         return Promise.reject(new Error('伺服器位址為空'));
       }
       serverUrl = u.replace(/\/+$/, '');
       MultiplayerClient.saveServerUrl(u);
       authToken = token || '';

       console.log('[GAME-WS] ===== MultiplayerClient.connect() 被呼叫 =====');
       console.log('[GAME-WS]   serverUrl =', serverUrl);
       console.log('[GAME-WS]   token 長度 =', authToken ? authToken.length : 0);

       // 先斷開舊的
      if (pollAbortController) {
        try { pollAbortController.abort(); } catch(e) {}
        pollAbortController = null;
      }
      if (ws) {
        try { ws.close(); } catch(e) {}
        ws = null;
        wsConnected = false;
      }
      clearAllRemotePlayers();
      myPlayerId = null;
      reconnectDelay = 1000;
      wsReconnectDelay = 1000;
      useWebSocket = false;
      setStatus(STATUS.CONNECTING);

       // 用 health 檢查伺服器是否活著，並決定是否用 WS
       // v3.1.2：即使 health 失敗也嘗試 WS（有些平台 proxy 會擋 /api/health 但 WS upgrade 正常）
       return fetch(serverUrl + '/api/health')
         .then(r => r.json())
         .then(data => {
           if (data && data.status === 'online') {
             setStatus(STATUS.ONLINE);
             console.info('[Multi] 伺服器連線成功:', data.version, 'WS=', data.webSocket || data.socketIo);
             // v2.7.10：從伺服器取得 WS upgrade 路徑（預設 '/'）
             _wsPath = data.wsTransportPath || '/';

             // v2.7.7：伺服器在線就先把 AI 模式切到 server（防止本地 AI 偷生）
             if (typeof window.setServerOnline === 'function') {
               window.setServerOnline(currentServerId || 'pending', null);
             }
             if (typeof window.setOfflineMode === 'function') {
               window.setOfflineMode(false);
             }

             // v2.7.2：若伺服器支援 WebSocket，優先連 WS（失敗自動 fallback long-poll）
             // v3.1.2：health 有 webSocket 才連；沒有的話直接 LP
             if (data.webSocket || data.socketIo) {
               _startWsWithRetry();
             } else {
               _wsFailureReason = '伺服器未啟用 WebSocket';
               startPollLoop();
             }
           } else {
             // health 回來但 status 不是 online → 仍嘗試 WS + LP
             console.warn('[Multi] health 回應異常，仍嘗試 WS 連線');
             _startWsWithRetry();
             startPollLoop();
           }
           // 若已有玩家資料，自動 join
           if (typeof window.GS !== 'undefined' && GS.player && GS.player.name && GS.currentMap) {
             return MultiplayerClient.joinWorld().then(result => {
               if (!result) {
                 console.warn('[Multi] joinWorld 失敗，退回離線模式');
                 setStatus(STATUS.ERROR);
                 if (typeof window.setOfflineMode === 'function') {
                   window.setOfflineMode(true);
                 }
               }
               return result;
             });
           }
           return null;
         })
         .catch(err => {
           // v3.1.2：health fetch 失敗（可能被 proxy 擋）也不要放棄 — 仍嘗試 WS + LP
           console.warn('[Multi] /api/health 失敗:', err.message, '仍嘗試 WS 連線');
           setStatus(STATUS.CONNECTING);
           _updateWsBadge('connecting', 'WS連線中');
           _startWsWithRetry();
           startPollLoop();
           if (typeof window.GS !== 'undefined' && GS.player && GS.player.name && GS.currentMap) {
             return MultiplayerClient.joinWorld().catch(() => null);
           }
           return null;
         });
     },


    disconnect() {
      if (currentMapId) {
        try {
          if (ws && wsConnected) {
            wsSend({ type: 'leave_map' });
          } else {
            apiPost('/api/mp/leave', { mapId: currentMapId, charIdx: currentCharIdx });
          }
        } catch(e) {}
      }
      if (pollAbortController) {
        try { pollAbortController.abort(); } catch(e) {}
        pollAbortController = null;
      }
      pollRunning = false;
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
    // 加入世界（從 auth token 推斷帳號）
    joinWorld(opts) {
      opts = opts || {};
      currentCharIdx = opts.charIdx ?? (GS.currentCharIdx ?? 0);
      const mapId = opts.mapId || GS.currentMap || 'village_01';
      // v2.7.3：優先從 opts 取，其次用已選伺服器（AuthSystem），最後才 fallback zeus
      let serverId = opts.serverId;
      if (!serverId && typeof AuthSystem !== 'undefined' && AuthSystem.getCurrentServer) {
        const srv = AuthSystem.getCurrentServer();
        if (srv && srv.id) serverId = srv.id;
      }
      if (!serverId && GS.currentServerId) serverId = GS.currentServerId;
      if (!serverId) serverId = currentServerId || 'zeus';
      currentServerId = serverId;
      // 在線模式先告訴 game.js 進入在線狀態，避免本地隨機生成 AI
      if (typeof window.setServerOnline === 'function') {
        window.setServerOnline(serverId, mapId);
      }
      return apiPost('/api/mp/join', {
        mapId,
        serverId,
        charIdx: currentCharIdx,
      }).then(data => {
        if (data.ok) {
          myPlayerId = data.playerId;
          currentMapId = mapId;
          currentServerId = serverId;
          // 初始化遠端玩家列表
          if (data.others && Array.isArray(data.others)) {
            data.others.forEach(p => {
              if (p.playerId !== myPlayerId) {
                addOrUpdateRemotePlayer({
                  id: p.playerId,
                  name: p.name,
                  class: p.classId,
                  level: p.level,
                  x: p.x, y: p.y, dir: p.dir,
                  transform: p.transformId,
                });
              }
            });
          }
          // v2.7.3：同步伺服器級 AI 列表（權威）—— 收到才標記在線
          if (typeof window.setServerAIs === 'function') {
            window.setServerAIs((data.ais && Array.isArray(data.ais)) ? data.ais : [], serverId, mapId);
          }
          // v2.7.3：回傳 instanceId 給客戶端診斷用
          if (data.instanceId && typeof window._setServerInstanceId === 'function') {
            window._setServerInstanceId(data.instanceId);
          }
          setStatus(STATUS.ONLINE);
          // v2.7.2：WS 模式下不啟動 long-poll（WS 已處理所有事件）
          if (!useWebSocket) {
            startPollLoop();
          }
           // v3.1.1：WS 連上後，若已 joinWorld 完成（有 myPlayerId），立即發 join_map
           //  修復：WS auth 比 LP join 慢時，auth_ok 後不會自動 join_map 的 bug
           if (ws && wsConnected) {
             wsSend({
               type: 'join_map',
               serverId,
               mapId,
               playerId: myPlayerId,
               name: GS.player?.name || 'Player',
               classId: GS.player?.classId || 'warrior',
               level: GS.player?.level || 1,
               charIdx: currentCharIdx,
               x: GS.player?.x,
               y: GS.player?.y,
               hp: GS.player?.hp,
               maxHp: GS.player?.hpMax,
               mp: GS.player?.mp,
               maxMp: GS.player?.mpMax,
               nation: GS.player?.nation || '',
             });
             console.log('[Multi] WS join_map 已發送 (LP join 完成後)');
           }
          console.info('[Multi] 加入地圖 ' + mapId + '，在線 ' + ((data.others||[]).length+1) + ' 人');
          return data;
        } else {
          throw new Error(data.error || '加入失敗');
        }
        }).catch(err => {
         console.warn('[Multi] joinWorld 失敗:', err.message);
         // v2.8.2：join 失敗時標記離線，避免 health 成功但 join 失敗導致狀態假 ON
         if (typeof window.setOfflineMode === 'function') window.setOfflineMode(true);
         return null;
       });
    },

    // 切換地圖
    enterMap(mapId, charIdx, worldW, worldH) {
      if (!mapId || mapId === currentMapId) return Promise.resolve();
      // 先離開舊地圖
      const oldMap = currentMapId;
      currentMapId = mapId;
      if (worldW) currentWorldW = worldW;
      if (worldH) currentWorldH = worldH;
      if (charIdx != null) currentCharIdx = charIdx;

      // 清空遠端玩家
      clearAllRemotePlayers();

      // 加入新地圖（v2.7.3：serverId 用當前伺服器，不再寫死 zeus）
      const sId = currentServerId || (typeof AuthSystem !== 'undefined' && AuthSystem.getCurrentServer && AuthSystem.getCurrentServer()?.id) || 'zeus';
      return apiPost('/api/mp/join', {
        mapId,
        serverId: sId,
        charIdx: currentCharIdx,
      }).then(data => {
        if (data.ok) {
          myPlayerId = data.playerId;
          if (data.others && Array.isArray(data.others)) {
            data.others.forEach(p => {
              if (p.playerId !== myPlayerId) {
                addOrUpdateRemotePlayer({
                  id: p.playerId,
                  name: p.name,
                  class: p.classId,
                  level: p.level,
                  x: p.x, y: p.y, dir: p.dir,
                  transform: p.transformId,
                });
              }
            });
          }
          console.info('[Multi] 進入地圖 ' + mapId);
          return data;
        }
        return null;
      }).catch(() => null);
    },

    // 回報移動（節流）
    reportMove(x, y, dir) {
      if (status !== STATUS.ONLINE || !currentMapId) return;
      const now = Date.now();
      if (now - lastUpdateTime < UPDATE_THROTTLE) return;
      lastUpdateTime = now;
      const sPos = worldToServer(x, y);
      // v2.7.2：優先走 WebSocket
      if (useWebSocket && ws && wsConnected) {
        wsSend({
          type: 'move',
          x: sPos.x, y: sPos.y, dir: dir,
        });
      } else {
        apiPost('/api/mp/update', {
          mapId: currentMapId,
          charIdx: currentCharIdx,
          x: sPos.x,
          y: sPos.y,
          dir: dir,
        }).catch(() => {
          // 失敗不影響
        });
      }
    },

    // 回報血量變化
    reportHp(hp, maxHp) {
      if (status !== STATUS.ONLINE || !currentMapId) return;
      if (useWebSocket && ws && wsConnected) {
        wsSend({ type: 'hp', hp, maxHp });
      } else {
        apiPost('/api/mp/update', {
          mapId: currentMapId,
          charIdx: currentCharIdx,
          hp, maxHp,
        }).catch(() => {});
      }
    },

    // 回報變身變化
    reportTransform(transformId) {
      if (status !== STATUS.ONLINE || !currentMapId) return;
      if (useWebSocket && ws && wsConnected) {
        wsSend({ type: 'update_profile', transformId });
      } else {
        apiPost('/api/mp/update', {
          mapId: currentMapId,
          charIdx: currentCharIdx,
          transformId,
        }).catch(() => {});
      }
    },

    sendChat(text, channel) {
      if (status !== STATUS.ONLINE || !currentMapId) return;
      if (useWebSocket && ws && wsConnected) {
        wsSend({ type: 'chat', text, channel: channel || 'map' });
        return Promise.resolve({ ok: true });
      }
      return apiPost('/api/mp/chat', {
        mapId: currentMapId,
        charIdx: currentCharIdx,
        channel: channel || 'map',
        text,
      });
    },

    attackMonster(monsterId, skillId, damage) {
      if (status !== STATUS.ONLINE || !currentMapId) return;
      apiPost('/api/mp/attack', {
        mapId: currentMapId,
        charIdx: currentCharIdx,
        targetId: monsterId,
        skillId,
        damage,
      }).catch(() => {});
    },

    // 回報攻擊（對伺服器 AI 造成傷害）
    reportAttack(targetId, skillId, damage) {
      if (status !== STATUS.ONLINE || !currentMapId) return;
      const body = {
        mapId: currentMapId,
        serverId: currentServerId || 'zeus',
        charIdx: currentCharIdx,
        targetId,
        skillId: skillId || 0,
        damage: damage || 0,
      };
      // v2.7.5：優先走 WebSocket，否則走 LP
      if (useWebSocket && ws && wsConnected) {
        wsSend({ type: 'attack', ...body });
      } else {
        apiPost('/api/mp/attack', body).catch(() => {});
      }
    },

    // v2.7.9：位置上報（LP 模式下讓其他玩家看到自己移動）
    //  節流 100ms，避免過多 HTTP 請求；WS 模式下自動走 WS 通道
    _lastMoveSend: 0,
    sendPosition(x, y, dir, opts) {
      if (status !== STATUS.ONLINE || !currentMapId) return;
      const now = Date.now();
      if (now - this._lastMoveSend < 100) return; // 100ms 節流（10Hz）
      this._lastMoveSend = now;
      const body = {
        mapId: currentMapId,
        serverId: currentServerId || 'zeus',
        charIdx: currentCharIdx,
        x, y, dir,
        hp: opts?.hp != null ? opts.hp : undefined,
        transformId: opts?.transformId || undefined,
      };
      if (useWebSocket && ws && wsConnected) {
        wsSend({ type: 'move', ...body });
      } else {
        // LP 模式：fire and forget，非阻塞
        apiPost('/api/mp/update', body).catch(() => {});
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

  // ========== v2.7.2：WebSocket 連線（優先通道，失敗降級 long-poll） ==========
   function wsSend(msg) {
     if (!ws || ws.readyState !== 1) return false;
     try {
       ws.send(JSON.stringify(msg));
       return true;
     } catch(e) { return false; }
   }

   // v3.1.2：WS 連線 + 重試邏輯（模組級函數，health 成功或失敗都會呼叫）
   function _startWsWithRetry() {
     if (typeof WebSocket === 'undefined') {
       startPollLoop();
       return;
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
           console.warn('[GAME-WS] WS 連線失敗已達', MAX_WS_RETRIES, '次，降級 long-poll');
           _wsFailureReason = e.message || 'WS 連線失敗';
           useWebSocket = false;
           _updateWsBadge('offline', 'WS離線');
           if (typeof window.addLog === 'function') {
             try {
               addLog('system', '⚠️ WebSocket 連線失敗（已重試' + MAX_WS_RETRIES + '次），已切換為輪詢模式。錯誤：' + (e.message || '未知'));
             } catch(_) {}
           }
           startPollLoop();
         }
       });
     }
     tryWsWithRetry().catch(function() { /* 最終失敗也不中斷連線流程 */ });
   }

   function tryWebSocket() {
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
          resolved = true;
          reject(new Error('WebSocket 連線逾時'));
        }
      }, 5000);

       ws.onopen = () => {
         console.log('[GAME-WS] ✅ onopen - upgrade 成功, readyState=', ws.readyState, '(1=OPEN)。發送 auth...');
         _updateWsBadge('connecting', 'WS驗證中');
         wsSend({
           type: 'auth',
           token: authToken,
           name: GS?.player?.name || 'Player',
           classId: GS?.player?.classId || 'warrior',
           level: GS?.player?.level || 1,
         });
         console.log('[GAME-WS] 已發送 auth, token 長度=', authToken ? authToken.length : 0);
       };

       ws.onerror = (event) => {
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
        // 意外斷線：嘗試重連，或降級 long-poll
        if (useWebSocket && status === STATUS.ONLINE) {
          console.warn('[WS] 線中斷，降級 long-poll 並嘗試重連');
          useWebSocket = false;
          startPollLoop();
          scheduleWsReconnect();
        }
      };

      ws.onmessage = (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch(e) { return; }
        if (!msg || !msg.type) return;

         if (msg.type === 'auth_ok') {
           if (!resolved) {
             resolved = true;
             console.log('[GAME-WS] ✅ auth_ok - 驗證通過, clientId=', msg.id, 'account=', msg.account);
             clearTimeout(timeout);
             useWebSocket = true;
             wsConnected = true;
             wsReconnectDelay = 1000;
             console.log('[GAME-WS] 認證成功，WebSocket 模式啟用');
             _updateWsBadge('online', 'WS在線');
             resolve(msg);
           }
           // 若已經在地圖中，重新 join
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
               x: GS?.player?.x,
               y: GS?.player?.y,
               hp: GS?.player?.hp,
               maxHp: GS?.player?.hpMax,
               mp: GS?.player?.mp,
               maxMp: GS?.player?.mpMax,
               nation: GS?.player?.nation || '',
             });
             console.log('[GAME-WS] auth_ok 後自動 join_map, mapId=' + currentMapId + ', playerId=' + myPlayerId);
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
        if (msg.entities && Array.isArray(msg.entities) && typeof window.handleAOIEnter === 'function') {
          window.handleAOIEnter(msg.entities);
        }
        break;
      case 'aoi_update':
        if (msg.entities && Array.isArray(msg.entities) && typeof window.handleAOIUpdate === 'function') {
          window.handleAOIUpdate(msg.entities);
        }
        break;
      case 'aoi_leave':
        if (msg.ids && Array.isArray(msg.ids) && typeof window.handleAOILeave === 'function') {
          window.handleAOILeave(msg.ids);
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

  // ========== Long-Poll 循環 ==========
  function startPollLoop() {
    if (pollRunning) return;
    pollRunning = true;
    pollLoop();
  }

  function pollLoop() {
    if (status !== STATUS.ONLINE || !currentMapId) {
      pollRunning = false;
      return;
    }
    pollAbortController = new AbortController();
    const since = Date.now();
    const url = serverUrl + '/api/mp/poll?map=' + encodeURIComponent(currentMapId)
      + '&server=' + encodeURIComponent(currentServerId || 'zeus')
      + '&charIdx=' + currentCharIdx
      + '&since=' + since;

    fetch(url, {
      method: 'GET',
      headers: getAuthHeader(),
      signal: pollAbortController.signal,
      credentials: 'omit',
    })
    .then(r => r.json())
    .then(data => {
      if (data && data.ok && data.events) {
        handlePollEvents(data.events);
        // v2.8.0：處理 LP poll 返回的完整 players 快照（確保新加入/已離開玩家同步）
        if (data.players && Array.isArray(data.players)) {
          handlePlayerSnapshot(data.players);
        }
        // v2.7.3：long-poll 也推送 AI 快照（GM 調整 aiCount 時 LP 玩家同步生效）
        if (data.ais && Array.isArray(data.ais) && typeof window.setServerAIs === 'function') {
          window.setServerAIs(data.ais, currentServerId, currentMapId);
        }
        if (data.broadcasts && data.broadcasts.length) {
          // 全服廣播處理
          data.broadcasts.forEach(b => {
            if (b.type === 'gm_broadcast' && onChatMessage) {
              try {
                onChatMessage({
                  name: '【系統公告】',
                  text: b.text || '',
                  channel: 'system',
                  system: true,
                });
              } catch(e) {}
            }
          });
        }
      }
       reconnectDelay = 1000; // 重置退避
        // v2.8.0：自適應輪詢 — 有事件則快輪，空回應則逐步拉長
        const hasEvents = data.events && data.events.length > 0;
        adjustPollInterval(hasEvents);
        // 繼續下一輪
        if (pollRunning) setTimeout(pollLoop, _lpPollInterval);
    })
    .catch(err => {
      if (err.name === 'AbortError') {
        pollRunning = false;
        return;
      }
      console.warn('[Multi] poll 失敗:', err.message);
      // 退避重連
      if (pollRunning) {
        if (status === STATUS.ONLINE) setStatus(STATUS.RECONNECTING);
        setTimeout(pollLoop, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 8000);
      }
    });
  }

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
      if (ent.id === mySocketId) return;
      seen.add(ent.id);
      addOrUpdateRemotePlayer(ent);
    });
    for (const id of remotePlayers.keys()) {
      if (!seen.has(id)) removeRemotePlayer(id);
    }
  }

  function handlePlayerMove(data) {
    if (data.id === mySocketId) return;
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
    if (ent.id === mySocketId) return;
    let p = remotePlayers.get(ent.id);
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

  function buildRemotePlayerDOM(p) {
    if (typeof document === 'undefined') return;
    const worldLayer = document.getElementById('world-layer');
    if (!worldLayer) return;

    const elDiv = document.createElement('div');
    elDiv.className = 'world-unit remote-player mp-player idle';
    elDiv.dataset.id = 'mp_' + p.id;
    elDiv.dataset.remoteId = p.id;
    elDiv.dataset.mpId = p.id;

    const s = getSpriteForRemote(p);
    const isImg = !!(s && s.useImg);
    const glow = s?.glow || '#ffe090';
    const filter = `drop-shadow(0 0 4px ${glow}) drop-shadow(0 2px 3px rgba(0,0,0,0.8))`;

    // 國家敵我判定
    const myNation = (typeof window.GS !== 'undefined') ? (GS.nation || null) : null;
    const isEnemy = p.nation && myNation && p.nation !== myNation;
    if (isEnemy) elDiv.classList.add('enemy-ai');

    const nameColor = isEnemy ? '#ff8080' : '#80d0ff';
    const hpColor = isEnemy ? '#ff5050' : '#50c8ff';

    // 國旗
    let flagImg = '';
    if (typeof window.NATIONS !== 'undefined' && typeof window.safeFlagImg === 'function' && p.nation) {
      const n = NATIONS.find(nn => nn.id === p.nation);
      if (n) flagImg = safeFlagImg(p.nation, 12);
    }

    const w = 64, h = 80;
    const coverMode = s?.coverMode ? 'sprite-cover-mode' : '';
    const multiFrame = s?.multiFrame ? 'sprite-multi-frame' : '';

    const onErrorStr = (typeof window.handleImgError === 'function')
      ? 'handleImgError(this)'
      : '';

    let walkImgs = '';
    if (isImg && s.walk) {
      walkImgs += `<img class="unit-sprite-img sprite-frame-walk sprite-frame-walk-1" src="${s.walk}" style="filter:${filter};display:none" alt="" onerror="${onErrorStr}"/>`;
      if (s.walk2) walkImgs += `<img class="unit-sprite-img sprite-frame-walk sprite-frame-walk-2" src="${s.walk2}" style="filter:${filter};display:none" alt="" onerror="${onErrorStr}"/>`;
      if (s.walk3) walkImgs += `<img class="unit-sprite-img sprite-frame-walk sprite-frame-walk-3" src="${s.walk3}" style="filter:${filter};display:none" alt="" onerror="${onErrorStr}"/>`;
      if (s.walk4) walkImgs += `<img class="unit-sprite-img sprite-frame-walk sprite-frame-walk-4" src="${s.walk4}" style="filter:${filter};display:none" alt="" onerror="${onErrorStr}"/>`;
    }

    elDiv.innerHTML = `
      <div class="unit-info">
        <div class="unit-hp-bar"><div class="unit-hp-fill" style="width:100%;background:${hpColor}"></div></div>
        <div class="unit-name" style="color:${nameColor};font-size:10px;display:flex;align-items:center;justify-content:center;gap:2px">${flagImg}<span>${escapeHtml(p.name)}</span></div>
        <div class="unit-level-tag" style="display:none">Lv.${p.level}</div>
      </div>
      <div class="unit-sprite-wrap ${coverMode} ${multiFrame}" style="width:${w}px;height:${h}px;background:radial-gradient(ellipse at 50% 70%, rgba(100,70,40,0.25), transparent 70%);">
        ${isImg ? `
          <img class="unit-sprite-img sprite-frame-idle" src="${s.idle}" style="filter:${filter}" alt="" loading="lazy" onerror="${onErrorStr}"/>
          ${walkImgs}
          <div class="unit-sprite-tomb" style="display:none"></div>
          <div class="dust-particles"></div>
        ` : `
          <div class="unit-sprite-emoji" style="color:${s?.color || '#c0a060'};font-size:52px;filter:${filter}">&#9876;</div>
        `}
      </div>
      <div class="unit-shadow"></div>
    `;

    worldLayer.appendChild(elDiv);
    p.el = elDiv;

    if (typeof window.initUnitAnimState === 'function') {
      try { initUnitAnimState('mp_' + p.id); } catch (e) { /* ignore */ }
    }
    if (typeof window.positionUnit === 'function') {
      try { positionUnit(elDiv, p.x, p.y, 'hero'); } catch (e) { /* ignore */ }
    } else {
      elDiv.style.left = (p.x - w / 2) + 'px';
      elDiv.style.bottom = p.y + 'px';
    }
    if (p.dir === -1) elDiv.classList.add('face-left');
  }

  function refreshRemotePlayerVisual(p) {
    if (!p.el) return;
    if (p.el.parentNode) {
      p.el.remove();
      p.el = null;
    }
    buildRemotePlayerDOM(p);
  }

  // ========== 每幀內插 ==========
  function updateRemotePlayers(dt) {
    if (remotePlayers.size === 0) return;
    const lerpFactor = 1 - Math.pow(0.001, dt);

    for (const p of remotePlayers.values()) {
      if (!p.el) continue;

      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.5) {
        p.x += dx * lerpFactor;
        p.y += dy * lerpFactor;
        if (Math.abs(dx) > 1) {
          const newDir = dx > 0 ? 1 : -1;
          if (newDir !== p.dir) {
            p.dir = newDir;
            p.el.classList.toggle('face-left', p.dir === -1);
          }
        }
        if (dist > 4 && !p._wasWalking) {
          p.el.classList.remove('idle');
          p.el.classList.add('walking');
          p._wasWalking = true;
        }
      } else {
        if (p._wasWalking) {
          p.el.classList.remove('walking');
          p.el.classList.add('idle');
          p._wasWalking = false;
        }
      }

      if (typeof window.positionUnit === 'function') {
        try { positionUnit(p.el, p.x, p.y, 'hero'); } catch (e) { /* ignore */ }
      } else {
        p.el.style.left = (p.x - 32) + 'px';
        p.el.style.bottom = p.y + 'px';
      }

      if (typeof window.applyUnitAnimFrame === 'function') {
        try {
          const state = p._wasWalking ? 'walking' : 'idle';
          applyUnitAnimFrame(p.el, 'mp_' + p.id, state);
        } catch (e) { /* ignore */ }
      }
    }
  }

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
    const transport = useWebSocket ? 'WS' : (pollingActive ? 'LP' : '?');
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
      const info = [
        '===== 網路診斷 =====',
        '狀態: ' + _wsBadgeLabel,
        '傳輸: ' + _wsTransport,
        '在線人數: ' + _wsOnlineCount,
        'WS已連線: ' + (wsConnected ? '是' : '否'),
        'WS使用中: ' + (useWebSocket ? '是' : '否'),
        'Long-Poll使用中: ' + (pollingActive ? '是' : '否'),
        '伺服器URL: ' + (serverUrl || '未設定'),
        'Token長度: ' + (authToken ? authToken.length : 0),
        'WS失敗原因: ' + (_wsFailureReason || '無'),
        '當前地圖: ' + (currentMapId || '無'),
        '我的PlayerID: ' + (myPlayerId || '無'),
        '遠端玩家數: ' + (remotePlayers ? remotePlayers.size : 0),
        '',
        '提示: 如果顯示LP但WS應該可用，請檢查console中[GAME-WS]日誌',
      ].join('\n');
      alert(info);
    } catch(e) {
      alert('網路診斷錯誤: ' + e.message);
    }
  }

   // ========== 暴露到全域 ==========
  window.MultiplayerClient = MultiplayerClient;

  // 頁面關閉/刷新前主動斷線
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      try { MultiplayerClient.disconnect(); } catch (e) { /* ignore */ }
    });
  }
})();

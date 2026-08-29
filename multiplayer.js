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

  const remotePlayers = new Map();
  let pollAbortController = null;
  let pollRunning = false;
  let reconnectDelay = 1000;
  let lastPollTime = 0;
  let lastUpdateTime = 0;
  const UPDATE_THROTTLE = 50; // 50ms 節流發位置

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
      return fetch(serverUrl + '/api/health')
        .then(r => r.json())
        .then(data => {
          if (data && data.status === 'online') {
            setStatus(STATUS.ONLINE);
            console.info('[Multi] 伺服器連線成功:', data.version, 'WS=', data.webSocket || data.socketIo);
            // v2.7.2：若伺服器支援 WebSocket，優先連 WS（失敗自動 fallback long-poll）
            if (data.webSocket || data.socketIo) {
              tryWebSocket().catch(e => {
                console.warn('[Multi] WebSocket 連線失敗，降級 long-poll:', e.message);
                useWebSocket = false;
                startPollLoop();
              });
            } else {
              // 沒有 WS 支援，直接 long-poll
              startPollLoop();
            }
            // 若已有玩家資料，自動 join
            if (typeof window.GS !== 'undefined' && GS.player && GS.player.name && GS.currentMap) {
              return MultiplayerClient.joinWorld();
            }
            return null;
          } else {
            setStatus(STATUS.ERROR);
            throw new Error('伺服器狀態異常');
          }
        })
        .catch(err => {
          console.warn('[Multi] 連線失敗:', err.message);
          setStatus(STATUS.ERROR);
          throw err;
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
      const serverId = opts.serverId || 'zeus';
      currentServerId = serverId;
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
          // v2.7.2：同步伺服器級 AI 列表（權威）
          if (data.ais && Array.isArray(data.ais) && typeof window.setServerAIs === 'function') {
            window.setServerAIs(data.ais, serverId, mapId);
          }
          setStatus(STATUS.ONLINE);
          // v2.7.2：WS 模式下不啟動 long-poll（WS 已處理所有事件）
          if (!useWebSocket) {
            startPollLoop();
          }
          // 若 WS 已連線，也 join_map
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
            });
          }
          console.info('[Multi] 加入地圖 ' + mapId + '，在線 ' + ((data.others||[]).length+1) + ' 人');
          return data;
        } else {
          throw new Error(data.error || '加入失敗');
        }
      }).catch(err => {
        console.warn('[Multi] joinWorld 失敗:', err.message);
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

      // 加入新地圖
      return apiPost('/api/mp/join', {
        mapId,
        serverId: 'zeus',
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

    // 每幀更新遠端玩家位置（內插）
    tick(dt) {
      if (status !== STATUS.ONLINE || remotePlayers.size === 0) return;
      try { updateRemotePlayers(dt); } catch (e) { console.error('[Multi] tick error:', e); }
    },

    _getRemotePlayers() { return remotePlayers; },
    _getWebSocket() { return ws; },
    get isWebSocket() { return useWebSocket; },
  };

  // ========== v2.7.2：WebSocket 連線（優先通道，失敗降級 long-poll） ==========
  function wsSend(msg) {
    if (!ws || ws.readyState !== 1) return false;
    try {
      ws.send(JSON.stringify(msg));
      return true;
    } catch(e) { return false; }
  }

  function tryWebSocket() {
    return new Promise((resolve, reject) => {
      if (typeof WebSocket === 'undefined') {
        reject(new Error('瀏覽器不支援 WebSocket'));
        return;
      }
      const wsUrl = serverUrl.replace(/^http/, 'ws') + '/';
      try {
        ws = new WebSocket(wsUrl);
      } catch(e) {
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
        console.log('[WS] 已連接，發送 auth...');
        wsSend({
          type: 'auth',
          token: authToken,
          name: GS?.player?.name || 'Player',
          classId: GS?.player?.classId || 'warrior',
          level: GS?.player?.level || 1,
        });
      };

      ws.onmessage = (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch(e) { return; }
        if (!msg || !msg.type) return;

        if (msg.type === 'auth_ok') {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            useWebSocket = true;
            wsConnected = true;
            wsReconnectDelay = 1000;
            console.log('[WS] 認證成功，account=', msg.account);
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
            });
          }
          return;
        }

        if (msg.type === 'auth_fail') {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            reject(new Error(msg.error || '認證失敗'));
          }
          return;
        }

        // 其他事件走統一處理
        handleWsMessage(msg);
      };

      ws.onerror = (err) => {
        console.warn('[WS] 錯誤');
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error('WebSocket 連線錯誤'));
        }
      };

      ws.onclose = () => {
        console.log('[WS] 連線關閉');
        wsConnected = false;
        if (useWebSocket && status === STATUS.ONLINE) {
          // 意外斷線：嘗試重連，或降級 long-poll
          console.warn('[WS] 線中斷，降級 long-poll 並嘗試重連');
          useWebSocket = false;
          startPollLoop();
          scheduleWsReconnect();
        }
      };
    });
  }

  function scheduleWsReconnect() {
    if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
    wsReconnectTimer = setTimeout(() => {
      if (status !== STATUS.ONLINE) return;
      tryWebSocket()
        .then(() => {
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
          // 切回 WS 模式，停止 long-poll
          useWebSocket = true;
          if (pollAbortController) {
            try { pollAbortController.abort(); } catch(e) {}
            pollAbortController = null;
          }
          pollRunning = false;
        })
        .catch(() => {
          wsReconnectDelay = Math.min(wsReconnectDelay * 2, 15000);
          scheduleWsReconnect();
        });
    }, wsReconnectDelay);
  }

  function handleWsMessage(msg) {
    switch (msg.type) {
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
        // 進入地圖時的初始狀態
        if (msg.players && Array.isArray(msg.players)) {
          msg.players.forEach(p => {
            if (p.playerId !== myPlayerId) {
              addOrUpdateRemotePlayer({
                id: p.playerId || p.wsId,
                name: p.name,
                class: p.classId,
                level: p.level,
                x: p.x, y: p.y, dir: p.dir,
                transform: p.transformId,
              });
            }
          });
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
      // 繼續下一輪
      if (pollRunning) setTimeout(pollLoop, 50);
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
      }
    }
  }

  // ========== 工具：清空遠端玩家 ==========
  function clearAllRemotePlayers() {
    for (const [id, p] of remotePlayers) {
      if (p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el);
    }
    remotePlayers.clear();
  }

  // ========== 遠端玩家管理 ==========
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
    elDiv.className = 'world-unit remote-player idle';
    elDiv.dataset.id = 'mp_' + p.id;
    elDiv.dataset.remoteId = p.id;

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

  // ========== 暴露到全域 ==========
  window.MultiplayerClient = MultiplayerClient;

  // 頁面關閉/刷新前主動斷線
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      try { MultiplayerClient.disconnect(); } catch (e) { /* ignore */ }
    });
  }
})();

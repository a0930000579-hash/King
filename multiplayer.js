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
  let currentCharIdx = 0;
  let currentWorldW = 2496;
  let currentWorldH = 1664;

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
      clearAllRemotePlayers();
      myPlayerId = null;
      reconnectDelay = 1000;
      setStatus(STATUS.CONNECTING);

      // 用 health 檢查伺服器是否活著
      return fetch(serverUrl + '/api/health')
        .then(r => r.json())
        .then(data => {
          if (data && data.status === 'online') {
            setStatus(STATUS.ONLINE);
            console.info('[Multi] 伺服器連線成功:', data.version);
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
          apiPost('/api/mp/leave', { mapId: currentMapId, charIdx: currentCharIdx });
        } catch(e) {}
      }
      if (pollAbortController) {
        try { pollAbortController.abort(); } catch(e) {}
        pollAbortController = null;
      }
      pollRunning = false;
      clearAllRemotePlayers();
      myPlayerId = null;
      currentMapId = null;
      setStatus(STATUS.OFFLINE);
    },

    // 加入世界（從 auth token 推斷帳號）
    joinWorld(opts) {
      opts = opts || {};
      currentCharIdx = opts.charIdx ?? (GS.currentCharIdx ?? 0);
      const mapId = opts.mapId || GS.currentMap || 'village_01';
      return apiPost('/api/mp/join', {
        mapId,
        serverId: opts.serverId || 'zeus',
        charIdx: currentCharIdx,
      }).then(data => {
        if (data.ok) {
          myPlayerId = data.playerId;
          currentMapId = mapId;
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
          setStatus(STATUS.ONLINE);
          startPollLoop();
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
      apiPost('/api/mp/update', {
        mapId: currentMapId,
        charIdx: currentCharIdx,
        x: sPos.x,
        y: sPos.y,
        dir: dir,
      }).catch(() => {
        // 失敗不影響
      });
    },

    // 回報血量變化
    reportHp(hp, maxHp) {
      if (status !== STATUS.ONLINE || !currentMapId) return;
      apiPost('/api/mp/update', {
        mapId: currentMapId,
        charIdx: currentCharIdx,
        hp, maxHp,
      }).catch(() => {});
    },

    // 回報變身變化
    reportTransform(transformId) {
      if (status !== STATUS.ONLINE || !currentMapId) return;
      apiPost('/api/mp/update', {
        mapId: currentMapId,
        charIdx: currentCharIdx,
        transformId,
      }).catch(() => {});
    },

    sendChat(text, channel) {
      if (status !== STATUS.ONLINE || !currentMapId) return;
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
  };

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

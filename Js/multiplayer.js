/* ============================================================
   君主之刃 · 多人連線客戶端 (Socket.IO v4)
   設計原則：
     1. 絕不影響單機遊戲 — socket.io 載入失敗 / 連線失敗時，完全靜音退回單機
     2. 玩家可在設定面板輸入伺服器位址，存 localStorage
     3. 座標系統：伺服器世界為 0~2048，本機世界依地圖尺寸動態對應
     4. 遠端玩家僅做視覺同步，不參與本機戰鬥與掉落結算
   ============================================================ */

(function () {
  'use strict';

  // 狀態列舉
  const STATUS = {
    OFFLINE: 'offline',       // 未連線（預設 / 關閉多人）
    LOADING: 'loading',       // 正在載入 socket.io
    CONNECTING: 'connecting', // 正在連線伺服器
    ONLINE: 'online',         // 已連線
    RECONNECTING: 'reconnecting', // 斷線重連中
    ERROR: 'error',           // 連線錯誤
  };

  const MOVE_THROTTLE_MS = 100;
  const SERVER_WORLD_SIZE = 2048; // 伺服器世界座標 0~2048
  const STORAGE_KEY = 'mp_server_url';

  // 狀態
  let socket = null;
  let status = STATUS.OFFLINE;
  let mySocketId = null;
  let lastMoveEmitAt = 0;
  let lastSentX = null;
  let lastSentY = null;
  let lastSentDir = null;

  // 遠端玩家池
  const remotePlayers = new Map(); // key: socketId
  let currentMapId = null;
  let currentWorldW = 2496;
  let currentWorldH = 1664;

  // 狀態改變回調（給 game.js 更新 UI）
  let onStatusChange = null;
  // 聊天訊息回調
  let onChatMessage = null;
  // 怪物傷害回調
  let onMonsterDamage = null;
  // 怪物擊殺回調
  let onMonsterKilled = null;
  // 獎勵回調
  let onGainReward = null;

  // ========== 座標轉換 ==========
  function worldToServer(x, y) {
    const sx = (x / currentWorldW) * SERVER_WORLD_SIZE;
    const sy = (y / currentWorldH) * SERVER_WORLD_SIZE;
    return { x: Math.round(sx * 10) / 10, y: Math.round(sy * 10) / 10 };
  }
  function serverToWorld(x, y) {
    const wx = (x / SERVER_WORLD_SIZE) * currentWorldW;
    const wy = (y / SERVER_WORLD_SIZE) * currentWorldH;
    return { x: wx, y: wy };
  }

  // ========== 工具 ==========
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function loadScript(src, timeoutMs) {
    return new Promise((resolve, reject) => {
      try {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        let done = false;
        const t = setTimeout(() => {
          if (done) return;
          done = true;
          reject(new Error('timeout: ' + src));
        }, timeoutMs || 8000);
        s.onload = () => {
          if (done) return;
          done = true;
          clearTimeout(t);
          resolve();
        };
        s.onerror = () => {
          if (done) return;
          done = true;
          clearTimeout(t);
          reject(new Error('load failed: ' + src));
        };
        document.head.appendChild(s);
      } catch (e) { reject(e); }
    });
  }

  // ========== 狀態管理 ==========
  function setStatus(newStatus) {
    if (status === newStatus) return;
    status = newStatus;
    if (onStatusChange) {
      try { onStatusChange(status); } catch (e) { console.error('[Multi] status cb error:', e); }
    }
  }

  // ========== 公開 API ==========
  const MultiplayerClient = {
    get status() { return status; },
    get myId() { return mySocketId; },
    get connected() { return status === STATUS.ONLINE; },
    STATUS: STATUS,

    // 從 localStorage 讀取伺服器位址
    getSavedServerUrl() {
      try { return localStorage.getItem(STORAGE_KEY) || ''; } catch (e) { return ''; }
    },
    saveServerUrl(url) {
      try { localStorage.setItem(STORAGE_KEY, url || ''); } catch (e) { /* ignore */ }
    },

    setStatusCallback(cb) { onStatusChange = typeof cb === 'function' ? cb : null; },
    setChatCallback(cb) { onChatMessage = typeof cb === 'function' ? cb : null; },
    setMonsterDamageCallback(cb) { onMonsterDamage = typeof cb === 'function' ? cb : null; },
    setMonsterKilledCallback(cb) { onMonsterKilled = typeof cb === 'function' ? cb : null; },
    setGainRewardCallback(cb) { onGainReward = typeof cb === 'function' ? cb : null; },

    // 設定當前世界尺寸（用於座標轉換）
    setWorldSize(w, h) {
      currentWorldW = w || 2496;
      currentWorldH = h || 1664;
    },

    // 連線到指定伺服器（玩家按下連線時呼叫）
    connect(serverUrl) {
      const url = (serverUrl || '').trim();
      if (!url) {
        setStatus(STATUS.ERROR);
        return Promise.reject(new Error('伺服器位址為空'));
      }
      // 保存位址
      MultiplayerClient.saveServerUrl(url);
      // 如果已連線或連線中，先斷開
      if (socket) {
        try { socket.disconnect(); } catch (e) { /* ignore */ }
        socket = null;
      }
      clearAllRemotePlayers();
      mySocketId = null;
      setStatus(STATUS.LOADING);

      // 先嘗試從伺服器載入 socket.io client
      const clientUrl = url.replace(/\/+$/, '') + '/socket.io/socket.io.js';
      return loadScript(clientUrl, 8000)
        .catch(() => {
          // 失敗則用 CDN 備援
          console.info('[Multi] origin socket.io load failed, trying CDN');
          if (typeof window.io === 'function') return;
          return loadScript('https://cdn.socket.io/4.7.5/socket.io.min.js', 8000);
        })
        .then(() => {
          if (typeof window.io !== 'function') {
            throw new Error('socket.io 載入失敗');
          }
          doConnect(url);
        })
        .catch(err => {
          console.warn('[Multi] connect init error:', err);
          setStatus(STATUS.ERROR);
          throw err;
        });
    },

    // 手動斷線
    disconnect() {
      if (socket) {
        try { socket.disconnect(); } catch (e) { /* ignore */ }
        socket = null;
      }
      clearAllRemotePlayers();
      mySocketId = null;
      setStatus(STATUS.OFFLINE);
    },

    // 玩家建立後進入世界
    joinWorld(playerInfo) {
      if (!socket || status !== STATUS.ONLINE) return;
      try {
        socket.emit('join_world', {
          name: playerInfo.name || 'Player',
          class: playerInfo.classId || 'warrior',
          level: playerInfo.level || 1,
        });
      } catch (e) { /* ignore */ }
    },

    // 進入地圖
    enterMap(mapId, channel, worldW, worldH) {
      if (worldW != null) currentWorldW = worldW;
      if (worldH != null) currentWorldH = worldH;
      currentMapId = mapId || null;
      // 切換地圖時清空本地遠端玩家
      clearAllRemotePlayers();
      if (!socket || status !== STATUS.ONLINE) return;
      try {
        socket.emit('enter_map', {
          mapId: mapId || 'village',
          channel: channel || 0,
        });
      } catch (e) { /* ignore */ }
    },

    // 玩家移動（節流 ~100ms）
    reportMove(x, y, dir) {
      if (!socket || status !== STATUS.ONLINE) return;
      const now = Date.now();
      if (now - lastMoveEmitAt < MOVE_THROTTLE_MS) return;
      const dirN = (dir === 'left' || dir === -1) ? -1 : 1;
      if (lastSentX === x && lastSentY === y && lastSentDir === dirN) return;
      lastMoveEmitAt = now;
      lastSentX = x;
      lastSentY = y;
      lastSentDir = dirN;
      const sPos = worldToServer(x, y);
      try {
        socket.emit('move', { x: sPos.x, y: sPos.y, dir: dirN });
      } catch (e) { /* ignore */ }
    },

    // 玩家等級/變身/國家變更時同步
    updateProfile(playerInfo) {
      if (!socket || status !== STATUS.ONLINE) return;
      try {
        socket.emit('update_profile', {
          name: playerInfo.name,
          class: playerInfo.classId,
          level: playerInfo.level,
          transform: playerInfo.transformId || null,
          country: playerInfo.nation || null,
        });
      } catch (e) { /* ignore */ }
    },

    // 發送聊天
    sendChat(text, channel) {
      if (!socket || status !== STATUS.ONLINE) return false;
      const ch = channel || 'world';
      try {
        socket.emit('chat', { channel: ch, text: String(text || '').slice(0, 200) });
        return true;
      } catch (e) { return false; }
    },

    // 攻擊怪物
    attackMonster(monsterId, skillId) {
      if (!socket || status !== STATUS.ONLINE) return;
      try {
        socket.emit('attack_monster', {
          monsterId: monsterId,
          skillId: skillId || 'basic_attack',
        });
      } catch (e) { /* ignore */ }
    },

    // 每幀更新遠端玩家位置（內插）與渲染
    tick(dt) {
      if (status !== STATUS.ONLINE || remotePlayers.size === 0) return;
      try { updateRemotePlayers(dt); } catch (e) { console.error('[Multi] tick error:', e); }
    },

    _getRemotePlayers() { return remotePlayers; },
  };

  // ========== 實際連線 ==========
  function doConnect(url) {
    try {
      socket = window.io(url, {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1500,
        reconnectionDelayMax: 8000,
        timeout: 12000,
      });
    } catch (e) {
      console.warn('[Multi] io() failed:', e);
      setStatus(STATUS.ERROR);
      return;
    }

    setStatus(STATUS.CONNECTING);

    socket.on('connect', () => {
      mySocketId = socket.id;
      setStatus(STATUS.ONLINE);
      console.info('[Multi] connected, id=' + mySocketId);
      // 若玩家已建立，重新 join
      if (typeof window.GS !== 'undefined' && window.GS.player && window.GS.player.name) {
        MultiplayerClient.joinWorld({
          name: GS.player.name,
          classId: GS.player.classId,
          level: GS.player.level,
        });
        if (GS.currentMap) {
          MultiplayerClient.enterMap(GS.currentMap, 0, currentWorldW, currentWorldH);
        }
      }
    });

    socket.on('disconnect', (reason) => {
      const wasOnline = status === STATUS.ONLINE;
      mySocketId = null;
      clearAllRemotePlayers();
      if (wasOnline) {
        // 斷線了，socket.io 會自動重連
        setStatus(STATUS.RECONNECTING);
      }
      console.info('[Multi] disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Multi] connect_error:', err?.message || err);
      // Render 免費版冷啟動時常見，顯示連線中
      if (status === STATUS.CONNECTING || status === STATUS.LOADING) {
        // 保持 CONNECTING 狀態讓使用者知道還在嘗試
      } else if (status === STATUS.ONLINE) {
        setStatus(STATUS.RECONNECTING);
      } else {
        setStatus(STATUS.ERROR);
      }
    });

    socket.on('reconnect', (attempt) => {
      console.info('[Multi] reconnected after', attempt, 'attempts');
      // connect 事件也會觸發，這裡不設 status
    });

    socket.on('reconnect_attempt', (attempt) => {
      console.info('[Multi] reconnect attempt', attempt);
      if (status !== STATUS.RECONNECTING) setStatus(STATUS.RECONNECTING);
    });

    // ========== 伺服器事件 ==========
    socket.on('map_state', (data) => {
      if (!data || !Array.isArray(data.entities)) return;
      handleMapState(data.entities, data.monsters);
    });

    socket.on('player_move', (data) => {
      if (!data || !data.id) return;
      handlePlayerMove(data);
    });

    socket.on('player_left', (data) => {
      if (!data || !data.id) return;
      removeRemotePlayer(data.id);
    });

    socket.on('player_joined', (data) => {
      if (!data || !data.id) return;
      addOrUpdateRemotePlayer(data);
    });

    socket.on('player_profile', (data) => {
      if (!data || !data.id) return;
      const p = remotePlayers.get(data.id);
      if (!p) return;
      if (data.name != null) p.name = data.name;
      if (data.class != null) p.classId = data.class;
      if (data.level != null) p.level = data.level;
      if (data.transform != null) p.transformId = data.transform;
      if (data.country != null) p.nation = data.country;
      if (p.el) refreshRemotePlayerVisual(p);
    });

    socket.on('chat', (data) => {
      if (!data) return;
      if (onChatMessage) {
        try {
          onChatMessage({
            name: data.name || '匿名',
            text: data.text || '',
            channel: data.channel || 'world',
            country: data.country || null,
          });
        } catch (e) { console.error('[Multi] chat cb error:', e); }
      }
    });

    socket.on('monster_damage', (data) => {
      if (!data) return;
      if (onMonsterDamage) {
        try {
          const wPos = serverToWorld(data.x || 0, data.y || 0);
          onMonsterDamage({
            monsterId: data.monsterId,
            damage: data.damage || 0,
            isCrit: !!data.isCrit,
            x: wPos.x,
            y: wPos.y,
            attackerName: data.attackerName || '',
          });
        } catch (e) { console.error('[Multi] monster_damage cb error:', e); }
      }
    });

    socket.on('monster_killed', (data) => {
      if (!data) return;
      if (onMonsterKilled) {
        try {
          const wPos = serverToWorld(data.x || 0, data.y || 0);
          onMonsterKilled({
            monsterId: data.monsterId,
            x: wPos.x,
            y: wPos.y,
            killerName: data.killerName || '',
          });
        } catch (e) { console.error('[Multi] monster_killed cb error:', e); }
      }
    });

    socket.on('gain_reward', (data) => {
      if (!data) return;
      if (onGainReward) {
        try { onGainReward(data); } catch (e) { console.error('[Multi] gain_reward cb error:', e); }
      }
    });
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
      if (socket) { try { socket.disconnect(); } catch (e) { /* ignore */ } }
    });
  }
})();

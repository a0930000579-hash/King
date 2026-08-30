/*
 * v2.7.3：零依賴 WebSocket 伺服器（RFC 6455）+ AI 權威持久化
 * 用 Node 原生 http + crypto，不需要 socket.io / ws 套件，避免 npm install 佔空間
 *
 * 功能：
 *  - 多人 presence / 移動 / 聊天（按 serverId:mapId 隔離）
 *  - 伺服器級 AI 廣播（權威生成、GM 調整數量即時生效、持久化重啟不變）
 *  - GM 廣播與設定推送
 *  - Long-Poll 回調（AI 變動時通知 LP 玩家）
 */

const crypto = require('crypto');

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function createWsServer(httpServer) {
  const clients = new Map(); // wsId -> { socket, account, name, serverId, mapId, playerId, ... }
  let nextWsId = 1;
  // v2.7.6：握手統計與最後錯誤（給 /api/diag 診斷用）
  let _handshakeOk = false;
  let _lastError = null;

  // 地圖狀態：key = "serverId:mapId" -> Map(wsId -> client)
  const mapStates = new Map();
  // AI 狀態：key = "serverId:mapId" -> Map(aiId -> aiData)
  const aiStates = new Map();
  // 哪些地圖的 AI 已從持久化載入（避免重複載入）
  const aiLoaded = new Set();
  // AI 持久化介面（由外部注入）
  let aiPersistence = null;
  // Long-Poll 廣播回調（通知 LP 玩家 AI 變動）
  let lpAIBroadcast = null;

  // v2.7.3：設定 AI 持久化
  function setAIPersistence(p) { aiPersistence = p; }

  // v2.7.3：設定 long-poll AI 廣播回調
  function setLPAIBroadcast(fn) { lpAIBroadcast = typeof fn === 'function' ? fn : null; }

  function mapKey(serverId, mapId) {
    return (serverId || 'zeus') + ':' + (mapId || 'default');
  }

  function getMapState(serverId, mapId) {
    const k = mapKey(serverId, mapId);
    if (!mapStates.has(k)) mapStates.set(k, new Map());
    return mapStates.get(k);
  }

  function getAIState(serverId, mapId) {
    const k = mapKey(serverId, mapId);
    if (!aiStates.has(k)) aiStates.set(k, new Map());
    return aiStates.get(k);
  }

  // 廣播到指定地圖
  function broadcastToMap(serverId, mapId, message, exceptWsId) {
    const mapState = getMapState(serverId, mapId);
    for (const [wsId, client] of mapState) {
      if (wsId === exceptWsId) continue;
      sendJson(client.socket, message);
    }
  }

  // 廣播 AI 快照到地圖內所有人（WS + LP）
  function broadcastAISnapshot(serverId, mapId) {
    const aiState = getAIState(serverId, mapId);
    const snapshot = Array.from(aiState.values());
    const msg = { type: 'ai_snapshot', serverId, mapId, ais: snapshot, time: Date.now() };
    broadcastToMap(serverId, mapId, msg);
    // v2.7.3：也通知 long-poll 玩家
    if (lpAIBroadcast) {
      try { lpAIBroadcast(serverId, mapId, snapshot); } catch(e) {}
    }
  }

  // ========== AI 權威生成 ==========
  // 根據伺服器設定的 aiCount，在指定地圖生成/銷毀 AI
  // v2.7.3：用確定性種子（serverId + mapId）+ 持久化，重啟 AI id/數量不變

  // 簡單偽隨機（seeded）—— 用 serverId+mapId 當種子，確保同服同圖 AI 一致
  function seededRandom(seedStr) {
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
      h ^= seedStr.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    let s = h >>> 0;
    return function() {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const AI_CLASSES = ['warrior', 'mage', 'archer', 'rogue', 'paladin', 'warlock'];
  const AI_NAMES = ['艾倫', '麗娜', '索爾', '凱特', '布萊恩', '索菲', '雷克斯',
                    '艾琳', '馬克', '珍妮', '湯姆', '凱文', '蘿西', '迪克',
                    '漢斯', '安娜', '彼得', '露西', '傑克', '艾米'];
  const AI_NATIONS = ['liang', 'wei', 'shu', 'wu', 'qun'];

  function generateAI(serverId, mapId, idx, initLevel) {
    const rng = seededRandom(`${serverId}:${mapId}:ai:${idx}`);
    const classId = AI_CLASSES[Math.floor(rng() * AI_CLASSES.length)];
    const nameIdx = Math.floor(rng() * AI_NAMES.length);
    const name = AI_NAMES[nameIdx] + '·AI';
    const nationIdx = Math.floor(rng() * AI_NATIONS.length);
    const nation = AI_NATIONS[nationIdx];
    // 等級：initLevel 為基礎，浮動 ±0~2（受 idx 影響，穩定）
    const level = Math.max(1, Math.floor(initLevel + Math.floor(rng() * 3)));
    const x = Math.floor(150 + rng() * 1700);
    const y = Math.floor(150 + rng() * 1100);
    const dirs = ['up', 'down', 'left', 'right'];
    const dir = dirs[Math.floor(rng() * 4)];
    return {
      id: `ai_${serverId}_${mapId}_${idx + 1}`,
      name,
      classId,
      level,
      nation,
      x, y, dir,
      hp: 100,
      maxHp: 100,
      isAI: true,
      serverId,
      mapId,
      createdAt: Date.now(),
    };
  }

  function adjustAICount(serverId, mapId, targetCount, opts = {}) {
    const aiState = getAIState(serverId, mapId);
    targetCount = Math.max(0, Math.floor(targetCount));

    // v2.7.5：forceReset 模式 → 清空全部後重新生成
    if (opts.forceReset) {
      aiState.clear();
      const initLv = opts.initLevel != null ? parseInt(opts.initLevel) : 1;
      for (let i = 0; i < targetCount; i++) {
        const ai = generateAI(serverId, mapId, i, initLv);
        aiState.set(ai.id, ai);
      }
      if (aiPersistence && aiPersistence.save) {
        try { aiPersistence.save(serverId, mapId, Array.from(aiState.values())); } catch(e) {}
      }
      broadcastAISnapshot(serverId, mapId);
      return aiState.size;
    }

    const current = aiState.size;
    if (targetCount < current) {
      // 刪除多餘的 AI（從後往前刪）
      let toRemove = current - targetCount;
      const ids = Array.from(aiState.keys()).sort().reverse();
      for (const id of ids) {
        if (toRemove <= 0) break;
        aiState.delete(id);
        toRemove--;
      }
    } else if (targetCount > current) {
      // 生成新 AI（用確定性函式，確保同一服同圖同序號 AI 一致）
      const initLv = opts.initLevel != null ? parseInt(opts.initLevel) : 1;
      for (let i = current; i < targetCount; i++) {
        const ai = generateAI(serverId, mapId, i, initLv);
        aiState.set(ai.id, ai);
      }
    }

    // 持久化
    if (aiPersistence && aiPersistence.save) {
      try {
        aiPersistence.save(serverId, mapId, Array.from(aiState.values()));
      } catch(e) {}
    }

    // 廣播給當前地圖玩家（WS + LP）
    broadcastAISnapshot(serverId, mapId);
    return aiState.size;
  }

  // AI 簡單移動（每 1 秒微調位置，約 1Hz 漫步；戰鬥時由 combat tick 接管，~8Hz 廣播）
  const AI_WANDER_INTERVAL = 1000; // ms
  setInterval(() => {
    for (const [key, aiState] of aiStates) {
      const [serverId, mapId] = key.split(':');
      let changed = false;
      for (const ai of aiState.values()) {
        if (ai.dead) continue;
        if (ai.targetUid) continue; // 戰鬥中由 combat tick 控移動
        if (Math.random() < 0.4) {
          ai.x += (Math.random() - 0.5) * 60;
          ai.y += (Math.random() - 0.5) * 60;
          ai.x = Math.max(50, Math.min(2400, ai.x));
          ai.y = Math.max(50, Math.min(1600, ai.y));
          changed = true;
        }
      }
      if (changed) {
        // 增量推送（只有變動的 AI）
        const updates = Array.from(aiState.values());
        broadcastToMap(serverId, mapId, {
          type: 'ai_update',
          serverId, mapId,
          ais: updates,
          time: Date.now(),
        });
      }
    }
  }, AI_WANDER_INTERVAL);

  // ========== WebSocket 協議 ==========
  function acceptUpgrade(req, socket, head) {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      _lastError = 'missing Sec-WebSocket-Key header';
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }
    const accept = crypto.createHash('sha1')
      .update(key + WS_GUID)
      .digest('base64');

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      'Sec-WebSocket-Accept: ' + accept + '\r\n' +
      '\r\n'
    );
    _handshakeOk = true;
    _lastError = null;

    const wsId = nextWsId++;
    const client = {
      wsId,
      socket,
      account: null,
      playerId: null,
      name: 'Player',
      serverId: null,
      mapId: null,
      classId: 'warrior',
      level: 1,
      buffer: Buffer.alloc(0),
      authenticated: false,
    };
    clients.set(wsId, client);

    socket.on('data', (chunk) => {
      client.buffer = Buffer.concat([client.buffer, chunk]);
      processWsBuffer(client);
    });

    socket.on('close', () => {
      handleDisconnect(client);
    });

    socket.on('error', () => {
      handleDisconnect(client);
    });
  }

  function processWsBuffer(client) {
    while (client.buffer.length >= 2) {
      const buf = client.buffer;
      const opcode = buf[0] & 0x0F;
      const masked = (buf[1] & 0x80) !== 0;
      let payloadLen = buf[1] & 0x7F;
      let offset = 2;

      if (payloadLen === 126) {
        if (buf.length < 4) return;
        payloadLen = buf.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (buf.length < 10) return;
        payloadLen = Number(buf.readBigUInt64BE(2));
        offset = 10;
      }

      let maskKey = null;
      if (masked) {
        if (buf.length < offset + 4) return;
        maskKey = buf.slice(offset, offset + 4);
        offset += 4;
      }

      if (buf.length < offset + payloadLen) return;

      const payload = buf.slice(offset, offset + payloadLen);
      let decoded = payload;
      if (masked && maskKey) {
        decoded = Buffer.alloc(payloadLen);
        for (let i = 0; i < payloadLen; i++) {
          decoded[i] = payload[i] ^ maskKey[i % 4];
        }
      }

      client.buffer = buf.slice(offset + payloadLen);

      // 0x8 = close, 0x9 = ping, 0xA = pong, 0x1 = text
      if (opcode === 0x8) {
        sendFrame(client.socket, 0x8, Buffer.alloc(0));
        client.socket.end();
        return;
      } else if (opcode === 0x9) {
        sendFrame(client.socket, 0xA, decoded);
        continue;
      } else if (opcode === 0x1) {
        let msg;
        try {
          msg = JSON.parse(decoded.toString('utf8'));
        } catch (e) {
          continue;
        }
        handleMessage(client, msg);
      }
    }
  }

  function sendFrame(socket, opcode, payload) {
    const len = payload.length;
    let header;
    if (len < 126) {
      header = Buffer.alloc(2);
      header[0] = 0x80 | opcode;
      header[1] = len;
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x80 | opcode;
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x80 | opcode;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    try {
      socket.write(Buffer.concat([header, payload]));
    } catch (e) {}
  }

  function sendJson(socket, obj) {
    const data = Buffer.from(JSON.stringify(obj), 'utf8');
    sendFrame(socket, 0x1, data);
  }

  // ========== 訊息處理 ==========
  function handleMessage(client, msg) {
    if (!msg || typeof msg !== 'object' || !msg.type) return;

    switch (msg.type) {
      case 'auth':
        handleAuth(client, msg);
        break;
      case 'join_map':
        handleJoinMap(client, msg);
        break;
      case 'move':
        handleMove(client, msg);
        break;
      case 'chat':
        handleChat(client, msg);
        break;
      case 'update_profile':
        handleUpdateProfile(client, msg);
        break;
      case 'ping':
        sendJson(client.socket, { type: 'pong', time: Date.now() });
        break;
      // v2.7.5：玩家攻擊伺服器 AI（伺服器權威扣血）
      case 'attack':
        if (client.authenticated && client.mapId && client.serverId) {
          const targetId = msg.targetId;
          const dmg = Math.max(0, parseInt(msg.damage) || 0);
          if (targetId && dmg > 0) {
            damageAI(client.serverId, client.mapId, targetId, dmg, client.playerId || client.account);
          }
        }
        break;
      default:
        break;
    }
  }

  function handleAuth(client, msg) {
    // 簡單 token 校驗（與 long-poll 共用 verifyToken）
    const token = msg.token || '';
    const account = global._wsVerifyToken ? global._wsVerifyToken(token) : null;
    if (account) {
      client.account = account;
      client.authenticated = true;
      client.name = msg.name || account;
      client.classId = msg.classId || 'warrior';
      client.level = msg.level || 1;
      sendJson(client.socket, { type: 'auth_ok', account, wsId: client.wsId });
    } else {
      sendJson(client.socket, { type: 'auth_fail', error: 'token 無效' });
    }
  }

  function handleJoinMap(client, msg) {
    if (!client.authenticated) return;
    const serverId = msg.serverId || 'zeus';
    const mapId = msg.mapId || 'village_01';

    // 離開舊地圖
    if (client.mapId && client.serverId) {
      const oldKey = mapKey(client.serverId, client.mapId);
      const oldState = mapStates.get(oldKey);
      if (oldState) {
        oldState.delete(client.wsId);
        broadcastToMap(client.serverId, client.mapId, {
          type: 'player_leave',
          wsId: client.wsId,
          playerId: client.playerId,
          time: Date.now(),
        });
      }
    }

    client.serverId = serverId;
    client.mapId = mapId;
    client.playerId = msg.playerId || (client.account + ':' + (msg.charIdx || 0));

    const mapState = getMapState(serverId, mapId);
    mapState.set(client.wsId, client);

    // v2.7.2：第一次有人進地圖時，按伺服器設定生成 AI（權威）
    const aiState = getAIState(serverId, mapId);
    if (aiState.size === 0 && _serverAIConfigProvider) {
      try {
        const cfg = _serverAIConfigProvider(serverId) || {};
        const cnt = cfg.aiCount != null ? parseInt(cfg.aiCount) : 8;
        const lv = cfg.initLevel != null ? parseInt(cfg.initLevel) : 1;
        if (cnt > 0) adjustAICount(serverId, mapId, cnt, { initLevel: lv });
      } catch(e) { console.warn('[WS] 載入伺服器AI設定失敗:', e.message); }
    }

    // 回傳當前地圖玩家列表 + AI 快照
    const others = [];
    for (const [wid, c] of mapState) {
      if (wid !== client.wsId) {
        others.push({
          wsId: wid,
          playerId: c.playerId,
          name: c.name,
          classId: c.classId,
          level: c.level,
          x: c.x || 1024,
          y: c.y || 1024,
          dir: c.dir || 'down',
        });
      }
    }

    const ais = Array.from(aiState.values());

    sendJson(client.socket, {
      type: 'map_state',
      serverId, mapId,
      players: others,
      ais,
      time: Date.now(),
    });

    // 通知其他人有人加入
    broadcastToMap(serverId, mapId, {
      type: 'player_join',
      wsId: client.wsId,
      playerId: client.playerId,
      name: client.name,
      classId: client.classId,
      level: client.level,
      x: client.x || 1024,
      y: client.y || 1024,
      dir: client.dir || 'down',
      time: Date.now(),
    }, client.wsId);
  }

  function handleMove(client, msg) {
    if (!client.authenticated || !client.mapId) return;
    client.x = msg.x != null ? msg.x : client.x;
    client.y = msg.y != null ? msg.y : client.y;
    client.dir = msg.dir || client.dir;
    // 廣播給同地圖其他人（節流在客戶端做）
    broadcastToMap(client.serverId, client.mapId, {
      type: 'player_move',
      wsId: client.wsId,
      playerId: client.playerId,
      x: client.x,
      y: client.y,
      dir: client.dir,
      time: Date.now(),
    }, client.wsId);
  }

  function handleChat(client, msg) {
    if (!client.authenticated || !client.mapId) return;
    const text = String(msg.text || '').slice(0, 200);
    if (!text) return;
    const payload = {
      type: 'chat',
      wsId: client.wsId,
      playerId: client.playerId,
      name: client.name,
      channel: msg.channel || 'map',
      text,
      time: Date.now(),
    };
    if (msg.channel === 'world') {
      // 世界頻道：全服
      for (const [wsId, c] of clients) {
        if (c.serverId === client.serverId && c.authenticated) {
          sendJson(c.socket, payload);
        }
      }
    } else {
      broadcastToMap(client.serverId, client.mapId, payload);
    }
  }

  function handleUpdateProfile(client, msg) {
    if (!client.authenticated) return;
    if (msg.name != null) client.name = msg.name;
    if (msg.classId != null) client.classId = msg.classId;
    if (msg.level != null) client.level = msg.level;
    if (msg.transformId !== undefined) client.transformId = msg.transformId || null;
    if (client.mapId) {
      broadcastToMap(client.serverId, client.mapId, {
        type: 'player_profile',
        wsId: client.wsId,
        playerId: client.playerId,
        name: client.name,
        classId: client.classId,
        level: client.level,
        transformId: client.transformId,
        time: Date.now(),
      });
    }
  }

  function handleDisconnect(client) {
    clients.delete(client.wsId);
    if (client.mapId && client.serverId) {
      const mapState = getMapState(client.serverId, client.mapId);
      mapState.delete(client.wsId);
      broadcastToMap(client.serverId, client.mapId, {
        type: 'player_leave',
        wsId: client.wsId,
        playerId: client.playerId,
        time: Date.now(),
      });
    }
  }

  // GM 廣播
  function gmBroadcast(text) {
    const msg = { type: 'gm_broadcast', text, time: Date.now() };
    for (const [wsId, c] of clients) {
      if (c.authenticated) sendJson(c.socket, msg);
    }
  }

  // GM 調整 AI 數量（對指定 server 的所有地圖生效，或指定 map）
  function setAICountForServer(serverId, targetCount, opts = {}) {
    const affected = [];
    for (const [key, aiState] of aiStates) {
      const [srv, map] = key.split(':');
      if (srv !== serverId) continue;
      if (opts.mapId && map !== opts.mapId) continue;
      adjustAICount(serverId, map, targetCount, opts);
      affected.push(map);
    }
    // 如果這伺服器還沒有任何地圖的 AI 狀態，預設為 village 生成
    if (affected.length === 0 && !opts.mapId) {
      adjustAICount(serverId, 'village', targetCount, opts);
      affected.push('village');
    }
    return { affected, count: targetCount };
  }

  // 取得目前線上人數
  function getOnlineCount() {
    let n = 0;
    for (const c of clients.values()) {
      if (c.authenticated) n++;
    }
    return n;
  }

  function getOnlinePlayers() {
    const list = [];
    for (const c of clients.values()) {
      if (c.authenticated) {
        list.push({
          wsId: c.wsId,
          account: c.account,
          name: c.name,
          serverId: c.serverId,
          mapId: c.mapId,
          level: c.level,
          transport: 'websocket',
        });
      }
    }
    return list;
  }

  // 玩家進入地圖時確保 AI 已生成（若該地圖從無人到有人）
  let _serverAIConfigProvider = null; // (serverId) => { aiCount, initLevel }
  function setServerAIConfigProvider(fn) { _serverAIConfigProvider = fn; }

  async function ensureAIForMap(serverId, mapId, aiCount, initLevel) {
    const k = mapKey(serverId, mapId);
    const aiState = getAIState(serverId, mapId);

    // v2.7.3：先嘗試從持久化載入（重啟不變）
    if (!aiLoaded.has(k) && aiPersistence && aiPersistence.load) {
      try {
        const saved = aiPersistence.load(serverId, mapId);
        if (Array.isArray(saved) && saved.length > 0) {
          aiState.clear();
          saved.forEach(ai => aiState.set(ai.id, ai));
          aiLoaded.add(k);
          console.log(`[AI] 從持久化載入 ${serverId}:${mapId}，共 ${saved.length} 個 AI`);
          return aiState.size;
        }
      } catch(e) { console.warn('[AI] 持久化載入失敗:', e.message); }
      aiLoaded.add(k); // 標記已嘗試載入（不論成敗）
    }

    if (aiState.size === 0 && aiCount > 0) {
      adjustAICount(serverId, mapId, aiCount, { initLevel });
    }
    return aiState.size;
  }

  // ========== v2.7.5：AI 戰鬥系統（伺服器權威） ==========
  //  - AI 戰鬥 tick 125ms（8Hz），廣播節流在 8~10Hz
  //  - 玩家攻擊 AI 由伺服器扣血並廣播給所有玩家
  //  - AI 死亡後掉落經驗/金幣（廣播），10 秒後重生
  const AI_COMBAT_INTERVAL = 125; // ms  v2.7.5：500 → 125（8Hz）
  const AI_BROADCAST_INTERVAL = 125; // ms  快照廣播節流（8~10Hz）
  const AI_ATTACK_RANGE = 90; // 像素
  const AI_AGGRO_RANGE = 180;
  const AI_RESPAWN_TIME = 10000; // ms
  const aiDeathTimers = new Map(); // aiId -> timeout

  function getMapPlayers(serverId, mapId) {
    // 回傳所有在該地圖的玩家（WS + LP 合併去重）
    const wsPlayers = new Map();
    const wsMap = mapStates.get(mapKey(serverId, mapId));
    if (wsMap) {
      for (const c of wsMap.values()) {
        if (c.playerId) wsPlayers.set(c.playerId, c);
      }
    }
    // LP 玩家（由 server.cjs 透過回調注入）
    if (typeof _getLpMapPlayers === 'function') {
      const lpMap = _getLpMapPlayers(serverId, mapId);
      if (lpMap) {
        for (const [pid, p] of lpMap) {
          if (!wsPlayers.has(pid)) wsPlayers.set(pid, p);
        }
      }
    }
    return wsPlayers;
  }
  let _getLpMapPlayers = null;
  function setLpMapPlayersProvider(fn) { _getLpMapPlayers = typeof fn === 'function' ? fn : null; }

  function dist2(x1, y1, x2, y2) {
    const dx = x1 - x2, dy = y1 - y2;
    return dx * dx + dy * dy;
  }

  // 玩家對 AI 造成傷害（伺服器權威）
  function damageAI(serverId, mapId, aiId, dmg, attackerId) {
    const aiState = getAIState(serverId, mapId);
    const ai = aiState.get(aiId);
    if (!ai) return null;
    if (ai.dead) return null;
    ai.hp = Math.max(0, ai.hp - dmg);
    // 廣播 AI 狀態更新（血條）
    broadcastToMap(serverId, mapId, {
      type: 'ai_damaged',
      aiId,
      hp: ai.hp,
      maxHp: ai.maxHp,
      damage: dmg,
      attackerId,
      time: Date.now(),
    });
    // 通知 LP 通道
    if (lpAIBroadcast) {
      try { lpAIBroadcast(serverId, mapId, Array.from(aiState.values())); } catch(e) {}
    }
    if (ai.hp <= 0) {
      ai.dead = true;
      ai.deadAt = Date.now();
      // 廣播死亡
      broadcastToMap(serverId, mapId, {
        type: 'ai_killed',
        aiId,
        killerId: attackerId,
        expReward: Math.floor((ai.level || 1) * 20),
        goldReward: Math.floor((ai.level || 1) * 5),
        respawnIn: AI_RESPAWN_TIME,
        time: Date.now(),
      });
      // 重生定時器
      if (aiDeathTimers.has(aiId)) clearTimeout(aiDeathTimers.get(aiId));
      const t = setTimeout(() => {
        ai.hp = ai.maxHp;
        ai.dead = false;
        ai.x = 150 + Math.random() * 1700;
        ai.y = 150 + Math.random() * 1100;
        aiDeathTimers.delete(aiId);
        broadcastAISnapshot(serverId, mapId);
        broadcastToMap(serverId, mapId, {
          type: 'ai_respawn',
          aiId,
          x: ai.x, y: ai.y,
          time: Date.now(),
        });
      }, AI_RESPAWN_TIME);
      aiDeathTimers.set(aiId, t);
    }
    return ai;
  }

  // AI 攻擊玩家（伺服器權威）
  function aiAttackPlayer(serverId, mapId, ai, playerId, dmg) {
    broadcastToMap(serverId, mapId, {
      type: 'ai_attack',
      aiId: ai.id,
      targetId: playerId,
      damage: dmg,
      aiX: ai.x, aiY: ai.y,
      time: Date.now(),
    });
    // LP 通道轉發（讓 LP 玩家也收到 AI 攻擊）
    if (typeof _lpForwardEvent === 'function') {
      try {
        _lpForwardEvent(serverId, mapId, {
          type: 'ai_attack',
          aiId: ai.id,
          targetId: playerId,
          damage: dmg,
          aiX: ai.x, aiY: ai.y,
          time: Date.now(),
        });
      } catch(e) {}
    }
  }
  let _lpForwardEvent = null;
  function setLpForwardEvent(fn) { _lpForwardEvent = typeof fn === 'function' ? fn : null; }

  // AI 戰鬥 tick：每 AI_COMBAT_INTERVAL 執行一次；廣播節流在 AI_BROADCAST_INTERVAL
  const _aiBroadcastTimes = new Map(); // key -> lastBroadcastTs
  setInterval(() => {
    for (const [key, aiState] of aiStates) {
      const [serverId, mapId] = key.split(':');
      const players = getMapPlayers(serverId, mapId);
      let changed = false;
      for (const ai of aiState.values()) {
        if (ai.dead) continue;
        // 沒玩家就只有漫步（由 wander tick 負責，這裡跳過省運算）
        if (players.size === 0) continue;
        // 找最近的敵對玩家
        let nearestPlayer = null;
        let nearestDist2 = AI_AGGRO_RANGE * AI_AGGRO_RANGE;
        for (const [pid, p] of players) {
          const px = p.x != null ? p.x : 400;
          const py = p.y != null ? p.y : 400;
          const d2 = dist2(ai.x, ai.y, px, py);
          if (d2 < nearestDist2) {
            nearestDist2 = d2;
            nearestPlayer = { id: pid, x: px, y: py };
          }
        }
        if (!nearestPlayer) continue;
        const now = Date.now();
        if (nearestDist2 <= AI_ATTACK_RANGE * AI_ATTACK_RANGE) {
          if (!ai._lastAttack || now - ai._lastAttack > 1500) {
            ai._lastAttack = now;
            const baseAtk = 5 + (ai.level || 1) * 2;
            const dmg = Math.max(1, Math.floor(baseAtk * (0.8 + Math.random() * 0.4)));
            aiAttackPlayer(serverId, mapId, ai, nearestPlayer.id, dmg);
          }
        } else {
          const dist = Math.sqrt(nearestDist2);
          const speed = 120 + (ai.level || 1) * 2; // 像素/秒
          const moveDist = speed * (AI_COMBAT_INTERVAL / 1000);
          const ratio = Math.min(1, moveDist / dist);
          ai.x += (nearestPlayer.x - ai.x) * ratio;
          ai.y += (nearestPlayer.y - ai.y) * ratio;
          if (Math.abs(nearestPlayer.x - ai.x) > Math.abs(nearestPlayer.y - ai.y)) {
            ai.dir = nearestPlayer.x > ai.x ? 'right' : 'left';
          } else {
            ai.dir = nearestPlayer.y > ai.y ? 'down' : 'up';
          }
          changed = true;
        }
      }
      // 節流廣播：滿 AI_BROADCAST_INTERVAL 且有變動才推
      const lastBc = _aiBroadcastTimes.get(key) || 0;
      if (changed && Date.now() - lastBc >= AI_BROADCAST_INTERVAL) {
        _aiBroadcastTimes.set(key, Date.now());
        broadcastToMap(serverId, mapId, {
          type: 'ai_update',
          serverId, mapId,
          ais: Array.from(aiState.values()),
          time: Date.now(),
        });
      }
    }
  }, AI_COMBAT_INTERVAL);

  // 取得指定地圖的 AI 列表（給 long-poll 用）
  function getAIList(serverId, mapId) {
    const aiState = getAIState(serverId, mapId);
    return Array.from(aiState.values());
  }

  return {
    acceptUpgrade,
    adjustAICount,
    setAICountForServer,
    gmBroadcast,
    getOnlineCount,
    getOnlinePlayers,
    ensureAIForMap,
    setServerAIConfigProvider,
    setAIPersistence,
    setLPAIBroadcast,
    setLpMapPlayersProvider,
    setLpForwardEvent,
    getAIList,
    getMapPlayers,
    damageAI,
    broadcastToMap,
    broadcastAISnapshot,
    get clientCount() { return clients.size; },
    get authenticatedCount() { return getOnlineCount(); },
    get handshakeOk() { return _handshakeOk; },
    get lastError() { return _lastError; },
    get totalConnections() { return clients.size; },
  };
}

module.exports = { createWsServer };

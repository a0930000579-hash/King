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
const { createAIEngine } = require('./ai-engine.cjs');

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function createWsServer(httpServer) {
  const clients = new Map(); // wsId -> { socket, account, name, serverId, mapId, playerId, ... }
  let nextWsId = 1;
  // v2.7.6：握手統計與最後錯誤（給 /api/diag 診斷用）
  let _handshakeOk = false;
  let _lastError = null;
  // v2.7.10：WS 健康度統計
  let _lastCloseCode = null;
  let _lastCloseReason = '';
  let _totalConnections = 0;
  let _keepaliveEnabled = true;
  const KEEPALIVE_INTERVAL_MS = 20000; // 20 秒主動 ping，打穿 ~60s idle 的代理
  const KEEPALIVE_TIMEOUT_MS = 60000;  // 60 秒沒收到 pong 視為斷線

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
  // v2.8.0：正常玩家風格中文名（2~6字，無·AI後綴，像真玩家）
  const AI_NAMES = [
    // 2 字
    '劍影', '夜闌', '楓林', '蕭辰', '凌霄', '風殤', '雲逍', '雷震',
    '龍吟', '虎嘯', '鳳舞', '月寒', '星魂', '寒鋒', '墨塵', '玉瑤',
    // 3 字
    '劍無痕', '楓林晚', '夜闌珊', '蕭别离', '凌雲霄', '風滿樓', '雲中鶴', '雷震天',
    '龍傲天', '虎嘯生', '月如霜', '星辰變', '寒江雪', '墨青衣', '玉玲瓏', '金不換',
    // 4 字
    '劍影無痕', '夜闌人靜', '楓林向晚', '蕭瑟秋風', '凌霄之巔', '風起雲湧', '雲淡風輕', '雷霆萬鈞',
    '龍躍淵渟', '月下獨酌', '寒芒乍現', '墨染青衣', '金戈鐵馬', '白衣卿相', '青衫磊落', '紫氣東來',
  ];
  const AI_NATIONS = ['liang', 'wei', 'shu', 'wu', 'qun'];

  // v2.7.8：完整 AI 數值（對齊客戶端本地 AI）
  function calcBaseStats(classId, level) {
    level = Math.max(1, level);
    const bases = {
      warrior: { hp: 120, atk: 8, def: 6, speed: 60 },
      mage:    { hp: 80,  atk: 12, def: 3, speed: 55 },
      archer:  { hp: 90,  atk: 10, def: 4, speed: 65 },
      rogue:   { hp: 95,  atk: 11, def: 4, speed: 70 },
      paladin: { hp: 130, atk: 7,  def: 8, speed: 55 },
      warlock: { hp: 85,  atk: 11, def: 4, speed: 58 },
    };
    const b = bases[classId] || bases.warrior;
    const lv = level - 1;
    return {
      hpMax: Math.floor(b.hp + lv * 18),
      atk:   Math.floor(b.atk + lv * 2.2),
      def:   Math.floor(b.def + lv * 1.2),
      speed: b.speed + lv * 0.5,
    };
  }

  function generateAI(serverId, mapId, idx, initLevel) {
    const rng = seededRandom(`${serverId}:${mapId}:ai:${idx}`);
    const classId = AI_CLASSES[Math.floor(rng() * AI_CLASSES.length)];
    const nameIdx = Math.floor(rng() * AI_NAMES.length);
    const name = AI_NAMES[nameIdx];
    const nationIdx = Math.floor(rng() * AI_NATIONS.length);
    const nation = AI_NATIONS[nationIdx];
    const level = Math.max(1, Math.floor(initLevel + Math.floor(rng() * 3)));
    const x = Math.floor(150 + rng() * 1700);
    const y = Math.floor(150 + rng() * 1100);
    const stats = calcBaseStats(classId, level);
    const dirs = ['up', 'down', 'left', 'right'];
    const dir = dirs[Math.floor(rng() * 4)];
    return {
      id: `ai_${serverId}_${mapId}_${idx + 1}`,
      uid: `ai_${serverId}_${mapId}_${idx + 1}`, // 客戶端相容
      name,
      classId,
      level,
      nation,
      x, y, dir,
      facing: rng() > 0.5 ? 'right' : 'left',
      hp: stats.hpMax,
      hpMax: stats.hpMax,
      maxHp: stats.hpMax, // 相容舊欄位
      atk: stats.atk,
      def: stats.def,
      speed: stats.speed,
      exp: 0,
      expMax: Math.floor(100 * Math.pow(1.3, level - 1)),
      gold: 50 + Math.floor(rng() * 100),
      isAI: true,
      serverId,
      mapId,
      state: 'wandering',
      targetUid: null,
      targetX: x,
      targetY: y,
      wanderTimer: 2 + rng() * 3,
      attackCooldown: 0,
      attackInterval: 1.2 + rng() * 0.4, // 秒
      dead: false,
      respawnTimer: 0,
      restTimer: 0,
      potions: { hp: 3 + Math.floor(rng() * 2), mp: 2 },
      kills: 0,
      contribution: 0,
      guildId: null,
      power: 0,
      title: '',
      createdAt: Date.now(),
    };
  }

  // v2.8.0：AI 狀態由 aiEngine 統一管理，這裡只做代理
  function getAIState(serverId, mapId) {
    return aiEngine.getAIState(serverId, mapId);
  }

  function adjustAICount(serverId, mapId, targetCount, opts = {}) {
    targetCount = Math.max(0, Math.floor(targetCount));
    const result = aiEngine.adjustCount(serverId, mapId, targetCount, opts);
    // 持久化
    if (aiPersistence && aiPersistence.save) {
      try {
        aiPersistence.save(serverId, mapId, Array.from(aiEngine.getAIState(serverId, mapId).values()));
      } catch(e) {}
    }
    return result;
  }

  // ===== 玩家攻擊 AI（權威扣血）=====
  function damageAI(serverId, mapId, aiId, damage, attackerInfo) {
    return aiEngine.damageAI(serverId, mapId, aiId, damage, attackerInfo);
  }

  // v2.8.0：單一伺服器權威 AI 引擎（取代舊內嵌 tick）
  //  功能：打怪升級、跨圖分布、國家貢獻、PvP、AI互毆、喝藥、死亡重生
  const aiEngine = createAIEngine({
    worldW: 2000,
    worldH: 1400,
    tickInterval: 200,
    broadcastInterval: 200,
  });

  // AI 變動廣播給 WS + LP 玩家
  aiEngine.onAIChange = function(serverId, mapId, aiList) {
    broadcastToMap(serverId, mapId, {
      type: 'ai_update',
      serverId, mapId,
      ais: aiList,
      time: Date.now(),
    });
    // 同步通知 LP
    if (typeof lpAIBroadcast === 'function') {
      try { lpAIBroadcast(serverId, mapId, aiList); } catch(e) {}
    }
  };

  // AI 攻擊玩家 → 廣播給所有玩家
  aiEngine.onAIAttack = function(serverId, mapId, ai, targetPlayerId, damage) {
    broadcastToMap(serverId, mapId, {
      type: 'ai_attack_player',
      serverId, mapId,
      aiId: ai.id,
      aiName: ai.name,
      targetId: targetPlayerId,
      damage,
      time: Date.now(),
    });
    // LP 也轉發
    if (typeof _lpForwardEvent === 'function') {
      try {
        _lpForwardEvent(serverId, mapId, {
          type: 'ai_attack',
          aiId: ai.id, aiName: ai.name,
          targetId: targetPlayerId, damage,
          time: Date.now(),
        });
      } catch(e) {}
    }
  };

  // AI 被殺 → 廣播掉落
  aiEngine.onAIKilled = function(serverId, mapId, deadAI, killer) {
    const goldDrop = Math.floor(deadAI.gold * 0.3) + Math.floor(deadAI.level * 5);
    const expDrop = Math.floor(deadAI.level * 20 + 30);
    broadcastToMap(serverId, mapId, {
      type: 'ai_killed',
      serverId, mapId,
      aiId: deadAI.id,
      aiName: deadAI.name,
      aiLevel: deadAI.level,
      killer: killer || { name: 'Unknown' },
      goldDrop, expDrop,
      time: Date.now(),
    });
  };

  // AI 跨圖移動 → 兩張圖都廣播 AI 更新
  aiEngine.onAIMapChange = function(serverId, oldMapId, newMapId, ai) {
    console.log(`[AI-Migrate] ${ai.name} lv${ai.level} ${oldMapId} → ${newMapId}`);
  };

  // 國家貢獻 → 同步到 DB（有就加，沒有就跳過）
  aiEngine.onContribution = function(serverId, nation, amount, aiName) {
    if (typeof _addNationContribution === 'function') {
      try { _addNationContribution(serverId, nation, amount); } catch(e) {}
    }
  };

  // 玩家列表提供者（雙通道合併）
  aiEngine.getMapPlayers = function(serverId, mapId) {
    return getMapPlayers(serverId, mapId);
  };

  // 啟動 AI 引擎
  aiEngine.start();

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
    _totalConnections++;

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
      // v2.7.10：fragmentation 支援
      fragOpcode: 0,
      fragBuffer: null,
      // v2.7.10：keepalive
      lastPongTime: Date.now(),
      pingTimer: null,
    };
    clients.set(wsId, client);

    socket.on('data', (chunk) => {
      client.buffer = Buffer.concat([client.buffer, chunk]);
      processWsBuffer(client);
    });

    socket.on('close', () => {
      _lastCloseCode = client._closeCode || 1006;
      _lastCloseReason = client._closeReason || '';
      if (client.pingTimer) { clearInterval(client.pingTimer); client.pingTimer = null; }
      handleDisconnect(client);
    });

    socket.on('error', () => {
      if (client.pingTimer) { clearInterval(client.pingTimer); client.pingTimer = null; }
      handleDisconnect(client);
    });

    // v2.7.10：啟動 server 主動 ping keepalive
    if (_keepaliveEnabled) {
      client.pingTimer = setInterval(() => {
        if (client.socket.destroyed) {
          clearInterval(client.pingTimer);
          client.pingTimer = null;
          return;
        }
        // 超過 60 秒沒收到 pong → 視為連線已死
        if (Date.now() - client.lastPongTime > KEEPALIVE_TIMEOUT_MS) {
          clearInterval(client.pingTimer);
          client.pingTimer = null;
          client._closeCode = 1006;
          client._closeReason = 'keepalive timeout';
          try { client.socket.destroy(); } catch(e) {}
          return;
        }
        // 發送 ping（payload 為當前時間戳，供客戶端計算 RTT）
        const pingPayload = Buffer.from(String(Date.now()), 'utf8');
        sendFrame(client.socket, 0x9, pingPayload);
      }, KEEPALIVE_INTERVAL_MS);
    }
  }

  function processWsBuffer(client) {
    while (client.buffer.length >= 2) {
      const buf = client.buffer;
      const fin = (buf[0] & 0x80) !== 0;
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

      // v2.7.10：控制幀（opcode 0x8-0xF）必須 FIN=1 且 payload ≤ 125
      // 0x8 = close, 0x9 = ping, 0xA = pong
      if (opcode === 0x8) {
        // 解析 close code + reason 並 echo 回去
        let closeCode = 1000;
        let closeReason = '';
        if (decoded.length >= 2) {
          closeCode = decoded.readUInt16BE(0);
          if (decoded.length > 2) {
            try { closeReason = decoded.slice(2).toString('utf8'); } catch(e) {}
          }
        }
        client._closeCode = closeCode;
        client._closeReason = closeReason;
        _lastCloseCode = closeCode;
        _lastCloseReason = closeReason;
        // echo close frame（RFC 6455 §5.5.1）
        const echoPayload = Buffer.alloc(2 + Buffer.byteLength(closeReason, 'utf8'));
        echoPayload.writeUInt16BE(closeCode, 0);
        echoPayload.write(closeReason, 2, 'utf8');
        try { sendFrame(client.socket, 0x8, echoPayload); } catch(e) {}
        try { client.socket.end(); } catch(e) {}
        return;
      } else if (opcode === 0x9) {
        // 客戶端 ping → 回 pong（同 payload）
        sendFrame(client.socket, 0xA, decoded);
        continue;
      } else if (opcode === 0xA) {
        // 收到 pong → 更新時間戳
        client.lastPongTime = Date.now();
        continue;
      }

      // v2.7.10：資料幀（text=0x1, binary=0x2, continuation=0x0）
      if (opcode === 0x1 || opcode === 0x2) {
        // 起始幀
        if (fin) {
          // 單幀訊息，直接處理
          if (opcode === 0x1) {
            handleTextMessage(client, decoded);
          } else {
            // binary 幀目前保留（未使用，安全忽略）
          }
        } else {
          // 分片起始：初始化 frag buffer
          client.fragOpcode = opcode;
          client.fragBuffer = Buffer.from(decoded);
        }
      } else if (opcode === 0x0) {
        // 延續幀
        if (!client.fragBuffer) {
          // 沒有起始幀的延續 → 協定錯誤，關閉連線
          const closePayload = Buffer.alloc(2);
          closePayload.writeUInt16BE(1002, 0);
          try { sendFrame(client.socket, 0x8, closePayload); } catch(e) {}
          try { client.socket.end(); } catch(e) {}
          return;
        }
        client.fragBuffer = Buffer.concat([client.fragBuffer, decoded]);
        if (fin) {
          // 最後一幀，組合完畢
          const fullPayload = client.fragBuffer;
          const fullOpcode = client.fragOpcode;
          client.fragBuffer = null;
          client.fragOpcode = 0;
          if (fullOpcode === 0x1) {
            handleTextMessage(client, fullPayload);
          }
          // binary 分片同樣忽略
        }
      }
      // 其他 opcode 保留（忽略）
    }
  }

  function handleTextMessage(client, buf) {
    let msg;
    try {
      msg = JSON.parse(buf.toString('utf8'));
    } catch (e) {
      return;
    }
    handleMessage(client, msg);
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

    // v2.7.9：第一次有人進地圖時，依伺服器設定確保 AI 存在（持久化優先 + 舊格式遷移）
    //  與 LP 的 ensureAIForMap 走同一套邏輯，避免 WS/LP 行為不一致
    const aiState = getAIState(serverId, mapId);
    if (aiState.size === 0) {
      let cnt = 8, lv = 1;
      if (_serverAIConfigProvider) {
        try {
          const cfg = _serverAIConfigProvider(serverId) || {};
          cnt = cfg.aiCount != null ? parseInt(cfg.aiCount) : 8;
          lv = cfg.initLevel != null ? parseInt(cfg.initLevel) : 1;
        } catch(e) { console.warn('[WS] 載入伺服器AI設定失敗:', e.message); }
      }
      if (cnt > 0) {
        ensureAIForMap(serverId, mapId, cnt, lv).catch(() => {});
      }
    }

    // 回傳當前地圖玩家列表 + AI 快照
    // v2.8.0：合併 WS + LP 玩家，確保雙通道互通
    const others = [];
    const seenIds = new Set();
    for (const [wid, c] of mapState) {
      if (wid !== client.wsId && c.playerId) {
        seenIds.add(c.playerId);
        others.push({
          wsId: wid,
          playerId: c.playerId,
          name: c.name,
          classId: c.classId,
          level: c.level,
          x: c.x || 1024,
          y: c.y || 1024,
          dir: c.dir || 'down',
          transformId: c.transformId,
          transport: 'websocket',
        });
      }
    }
    // 加入 LP 玩家
    if (typeof _getLpMapPlayers === 'function') {
      try {
        const lpMap = _getLpMapPlayers(serverId, mapId);
        if (lpMap) {
          for (const [pid, p] of lpMap) {
            if (seenIds.has(pid)) continue; // 重複跳過
            if (pid === client.playerId) continue;
            others.push({
              playerId: pid,
              name: p.name || 'Player',
              classId: p.classId || 'warrior',
              level: p.level || 1,
              x: p.x != null ? p.x : 1024,
              y: p.y != null ? p.y : 1024,
              dir: p.dir || 'down',
              hp: p.hp,
              transformId: p.transformId,
              transport: 'longpoll',
            });
          }
        }
      } catch(e) { console.warn('[WS] 取得 LP 玩家列表失敗:', e.message); }
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
      transformId: client.transformId,
      time: Date.now(),
    }, client.wsId);
    // v2.7.9：WS 玩家加入也通知 LP 玩家（雙通道同屏）
    if (typeof _lpForwardEvent === 'function') {
      try {
        _lpForwardEvent(client.serverId, client.mapId, {
          type: 'join',
          playerId: client.playerId,
          state: {
            playerId: client.playerId,
            name: client.name,
            classId: client.classId,
            level: client.level,
            x: client.x, y: client.y, dir: client.dir,
            transformId: client.transformId,
          },
          time: Date.now(),
        });
      } catch(e) {}
    }
  }

  function handleMove(client, msg) {
    if (!client.authenticated || !client.mapId) return;
    client.x = msg.x != null ? msg.x : client.x;
    client.y = msg.y != null ? msg.y : client.y;
    client.dir = msg.dir || client.dir;
    if (msg.hp != null) client.hp = msg.hp;
    if (msg.transformId !== undefined) client.transformId = msg.transformId || null;
    // 廣播給同地圖 WS 玩家
    broadcastToMap(client.serverId, client.mapId, {
      type: 'player_move',
      wsId: client.wsId,
      playerId: client.playerId,
      name: client.name,
      classId: client.classId,
      level: client.level,
      x: client.x,
      y: client.y,
      dir: client.dir,
      hp: client.hp,
      transformId: client.transformId,
      time: Date.now(),
    }, client.wsId);
    // v2.7.9：也通知 LP 玩家（WS↔LP 雙通道同屏）
    if (typeof _lpForwardEvent === 'function') {
      try {
        _lpForwardEvent(client.serverId, client.mapId, {
          type: 'move',
          playerId: client.playerId,
          name: client.name,
          x: client.x, y: client.y, dir: client.dir,
          hp: client.hp, transformId: client.transformId,
          time: Date.now(),
        });
      } catch(e) {}
    }
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
    // v2.8.1：從 aiEngine 拿真實地圖清單（ws-server 自己的 aiStates 已棄用，僅保留舊代碼引用）
    const mapKeys = aiEngine.getAllMapKeys ? aiEngine.getAllMapKeys(serverId) : [];
    for (const mapId of mapKeys) {
      if (opts.mapId && mapId !== opts.mapId) continue;
      adjustAICount(serverId, mapId, targetCount, opts);
      affected.push(mapId);
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
    // v2.8.0：代理到 aiEngine
    // 先嘗試從持久化載入（重啟不變）
    const k = mapKey(serverId, mapId);
    const aiState = aiEngine.getAIState(serverId, mapId);

    if (!aiLoaded.has(k) && aiPersistence && aiPersistence.load) {
      try {
        const saved = aiPersistence.load(serverId, mapId);
        if (Array.isArray(saved) && saved.length > 0) {
          // 舊持久化數據：直接注入 aiEngine（會覆蓋）
          aiState.clear();
          saved.forEach(ai => {
            // 遷移舊格式關鍵欄位（aiEngine 也有自己的預設，但舊持久化可能缺欄位）
            if (ai.maxHp != null && ai.hpMax == null) ai.hpMax = ai.maxHp;
            if (ai.maxHp == null) ai.maxHp = ai.hpMax;
            if (ai.state == null) ai.state = 'wandering';
            if (ai.dead == null) ai.dead = false;
            if (ai.uid == null) ai.uid = ai.id;
            aiState.set(ai.id, ai);
          });
          aiLoaded.add(k);
          console.log(`[AI] 從持久化載入 ${serverId}:${mapId}，共 ${saved.length} 個 AI`);
          // 校準數量
          if (aiCount > 0 && aiState.size !== aiCount) {
            try { aiEngine.adjustCount(serverId, mapId, aiCount, { initLevel }); } catch(e) {}
          }
          return aiState.size;
        }
      } catch(e) { console.warn('[AI] 持久化載入失敗:', e.message); }
      aiLoaded.add(k);
    }

    if (aiState.size === 0 && aiCount > 0) {
      aiEngine.adjustCount(serverId, mapId, aiCount, { initLevel });
    }
    return aiState.size;
  }

  // v2.7.8：完整 AI 行為引擎已遷移至 server/ai-engine.cjs（v2.8.0）
  // 這裡保留舊常數名給可能的外部引用
  const AI_TICK_INTERVAL = 200;
  const AI_COMBAT_INTERVAL_OLD = AI_TICK_INTERVAL;

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

  function dist2_(x1, y1, x2, y2) { // 保留舊版別名
    return dist2(x1, y1, x2, y2);
  }

  // v2.7.8：玩家對 AI 造成傷害 → 走統一 damageAI
  function damageAIOld(serverId, mapId, aiId, dmg, attackerId) {
    return damageAI(serverId, mapId, aiId, dmg, { id: attackerId, name: attackerId });
  }
  // 別名相容
  function legacyDamageAI(serverId, mapId, aiId, dmg, attackerId) {
    return damageAI(serverId, mapId, aiId, dmg, { id: attackerId, name: attackerId });
  }

  // v2.8.0：aiAttackPlayer 已由 aiEngine.onAIAttack 回調處理，保留空函數相容舊引用
  function aiAttackPlayer(serverId, mapId, ai, playerId, dmg) {
    // 空實現：由 aiEngine 自動處理
  }
  let _lpForwardEvent = null;
  function setLpForwardEvent(fn) { _lpForwardEvent = typeof fn === 'function' ? fn : null; }

  // v2.7.8：下方統一 damageAI 已取代舊版
  // 舊 aiAttackPlayer 保留相容（給 tick 引擎呼叫）

  // 取得指定地圖的 AI 列表（給 long-poll 用）
  function getAIList(serverId, mapId) {
    return aiEngine.getAIList(serverId, mapId);
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
    get lastCloseCode() { return _lastCloseCode; },
    get lastCloseReason() { return _lastCloseReason; },
    get totalConnections() { return _totalConnections; },
    get keepaliveIntervalMs() { return KEEPALIVE_INTERVAL_MS; },
    get keepaliveTimeoutMs() { return KEEPALIVE_TIMEOUT_MS; },
    get keepaliveEnabled() { return _keepaliveEnabled; },
  };
}

module.exports = { createWsServer };

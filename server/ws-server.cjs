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
const gameWorld = require('./game-world.cjs');

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

// v3.1.9：全域WS診斷日誌緩衝區（不修改module.exports）
if (!global._wsDiagLogs) global._wsDiagLogs = [];
function _wsLog(msg) {
  const entry = new Date().toISOString() + ' ' + msg;
  global._wsDiagLogs.push(entry);
  if (global._wsDiagLogs.length > 100) global._wsDiagLogs.shift();
  console.log('[WS-DIAG]', msg);
}

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
    // v3.0.0：詳細 log，方便排查 DO App Platform / 反向代理下的 upgrade 問題
    console.log('[WS][upgrade] 開始處理:');
    console.log('[WS][upgrade]   url=', req.url);
    console.log('[WS][upgrade]   method=', req.method);
    console.log('[WS][upgrade]   headers.upgrade=', req.headers['upgrade']);
    console.log('[WS][upgrade]   headers.sec-websocket-version=', req.headers['sec-websocket-version']);
    console.log('[WS][upgrade]   headers.x-forwarded-proto=', req.headers['x-forwarded-proto'] || 'n/a');
    console.log('[WS][upgrade]   remoteAddress=', socket.remoteAddress);
    console.log('[WS][upgrade]   socket.encrypted=', !!socket.encrypted);
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      _lastError = 'missing Sec-WebSocket-Key header';
      console.error('[WS][upgrade] ❌ 缺少 Sec-WebSocket-Key header，回 400');
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }
    const accept = crypto.createHash('sha1')
      .update(key + WS_GUID)
      .digest('base64');

    // v3.0.0：DO App Platform / 反向代理可能需要的 header
    const extraHeaders = [];
    if (req.headers['sec-websocket-protocol']) {
      extraHeaders.push('Sec-WebSocket-Protocol: ' + req.headers['sec-websocket-protocol']);
    }
    const response = 'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      'Sec-WebSocket-Accept: ' + accept + '\r\n' +
      (extraHeaders.length ? extraHeaders.join('\r\n') + '\r\n' : '') +
      '\r\n';
    socket.write(response, () => {
      console.log('[WS][upgrade] ✅ 101 Switching Protocols 已發送, key前6=', key.substring(0,6));
    });
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
      try {
        _wsLog(' 收到 data chunk, 長度=' + chunk.length + ', wsId=' + client.wsId);
        client.buffer = Buffer.concat([client.buffer, chunk]);
        processWsBuffer(client);
      } catch(e) {
        _wsLog('[ERROR]  ❌ data 處理異常:', e.message, e.stack);
      }
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
        _wsLog(' 解析幀: opcode=' + opcode + ' fin=' + fin + ' masked=' + masked + ' payloadLen=' + payloadLen + ' decodedLen=' + decoded.length + ' wsId=' + client.wsId);
        // 起始幀
        if (fin) {
          // 單幀訊息，直接處理
          if (opcode === 0x1) {
            _wsLog(' text frame 前50字=' + decoded.toString('utf8').substring(0, 50));
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
      _wsLog(' ✅ JSON 解析成功, type=' + msg.type + ' wsId=' + client.wsId);
    } catch (e) {
      _wsLog('[ERROR]  ❌ JSON 解析失敗:', e.message, 'buf前50=' + buf.toString('utf8').substring(0, 50), 'wsId=' + client.wsId);
      return;
    }
    try {
      handleMessage(client, msg);
    } catch(e) {
      _wsLog('[ERROR]  ❌ handleMessage 異常:', e.message, e.stack);
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
    try {
      _wsLog(' sendJson: type=' + obj.type + ' socket.writable=' + socket.writable + ' socket.destroyed=' + socket.destroyed);
      const data = Buffer.from(JSON.stringify(obj), 'utf8');
      sendFrame(socket, 0x1, data);
      _wsLog(' sendJson 完成, dataLen=' + data.length);
    } catch(e) {
      _wsLog('[ERROR]  ❌ sendJson 異常:', e.message, e.stack);
    }
  }

  // ========== 訊息處理 ==========
  // v3.2.0：chunk組裝緩衝區
  const chunkBuffers = new Map();

  function handleMessage(client, msg) {
    if (!msg || typeof msg !== 'object') return;

    // v3.2.0：處理分片chunk
    if (msg.t === '__c') {
      const cid = msg.c;
      const idx = msg.i;
      const total = msg.n;
      const data = msg.d || '';
      _wsLog('chunk cid=' + cid + ' idx=' + idx + '/' + total + ' dataLen=' + data.length);
      if (!chunkBuffers.has(cid)) {
        chunkBuffers.set(cid, { parts: new Map(), total: total, received: 0 });
      }
      const buf = chunkBuffers.get(cid);
      if (!buf.parts.has(idx)) {
        buf.parts.set(idx, data);
        buf.received++;
      }
      if (buf.received >= buf.total) {
        let full = '';
        for (let i = 0; i < buf.total; i++) {
          full += buf.parts.get(i) || '';
        }
        chunkBuffers.delete(cid);
        _wsLog('chunk組裝完成 cid=' + cid + ' fullLen=' + full.length);
        try {
          const fullMsg = JSON.parse(full);
          handleMessage(client, fullMsg);
        } catch(e) {
          _wsLog('[ERROR] chunk組裝後JSON失敗: ' + e.message);
        }
      }
      return;
    }

    if (!msg.type) return;
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
      // v3.1.0：客戶端主動要求切換地圖（回城卷軸、NPC 傳送等）
      case 'change_map':
        handleChangeMap(client, msg);
        break;
      default:
        break;
    }
  }

  function handleAuth(client, msg) {
    try {
      _wsLog(' handleAuth 被呼叫, wsId=' + client.wsId + ' hasWsSessionId=' + !!msg.wsSessionId + ' hasSessionId=' + !!msg.sessionId + ' hasToken=' + !!msg.token);
      let account = null;
      // v4.0.1：優先使用登入時返回的短wsSessionId（約24位元組，整個auth訊息<126位元組，不會被proxy截斷）
      if (msg.wsSessionId && global._wsSessions) {
        const sess = global._wsSessions.get(msg.wsSessionId);
        if (sess) {
          account = sess.account;
          global._wsSessions.delete(msg.wsSessionId); // 一次性使用
          _wsLog(' wsSessionId驗證成功 account=' + account);
          console.log('[WS-Auth] wsSessionId驗證成功 account=' + account + ' wsId=' + client.wsId);
        } else {
          _wsLog(' wsSessionId無效或已過期');
          console.log('[WS-Auth] wsSessionId無效或已過期 wsId=' + client.wsId);
        }
      }
      // 後備1：舊版sessionId
      if (!account && msg.sessionId && global._wsSessions) {
        const sess = global._wsSessions.get(msg.sessionId);
        if (sess) {
          account = sess.account;
          global._wsSessions.delete(msg.sessionId);
          _wsLog(' sessionId驗證成功 account=' + account);
        }
      }
      // 後備2：直接token驗證（相容舊版，但token大會被proxy截斷）
      if (!account && msg.token) {
        const token = msg.token || '';
        _wsLog(' token長度=' + token.length + ' (大幀可能被proxy截斷)');
        account = global._wsVerifyToken ? global._wsVerifyToken(token) : null;
        _wsLog(' verifyToken 結果=' + (account || 'null'));
      }
      if (account) {
        client.account = account;
        client.authenticated = true;
        client.name = msg.name || account;
        client.classId = msg.classId || 'warrior';
        client.level = msg.level || 1;
        console.log('[WS][auth] ✅ 認證成功 wsId=', client.wsId, 'account=', account, 'name=', client.name);
        const resp = { type: 'auth_ok', account, wsId: client.wsId, id: client.wsId };
        _wsLog(' 發送 auth_ok, socket.writable=' + client.socket.writable);
        sendJson(client.socket, resp);
        _wsLog(' auth_ok 已發送');
      } else {
        console.warn('[WS][auth] ❌ 認證失敗 wsId=', client.wsId, 'token長度=', (msg.token || '').length, '主動斷線 (code 4001)');
        const resp = { type: 'auth_fail', error: 'token 無效', reason: 'invalid_token' };
        _wsLog(' 發送 auth_fail');
        sendJson(client.socket, resp);
        _wsLog(' auth_fail 已發送');
        // v3.0.0：auth 失敗後主動斷線，避免客戶端卡在「連上了但沒認證」的狀態
        setTimeout(() => {
          try {
            client.socket.end();
            client.socket.destroy();
          } catch(e) {}
        }, 500);
      }
    } catch(e) {
      _wsLog('[ERROR]  ❌ handleAuth 異常:', e.message, e.stack);
      try {
        sendJson(client.socket, { type: 'auth_fail', error: 'server_error', reason: e.message });
      } catch(e2) {}
    }
  }

  function handleJoinMap(client, msg) {
    if (!client.authenticated) return;
    const serverId = msg.serverId || 'zeus';
    const mapId = msg.mapId || 'village_01';

    // 離開舊地圖
    if (client.mapId && client.serverId) {
      gameWorld.playerLeave(client.serverId, client.mapId, client.wsId);
    }

    client.serverId = serverId;
    client.mapId = mapId;
    client.playerId = msg.playerId || (client.account + ':' + (msg.charIdx || 0));

    // v3.0.0：透過 game-world 加入，取得 AOI 快照
    const aiCount = msg.aiCount != null ? msg.aiCount : 8;
    const initLevel = msg.initLevel != null ? msg.initLevel : 1;
    const snapshot = gameWorld.playerJoin(serverId, mapId, client.wsId, {
      account: client.account,
      name: client.name,
      classId: client.classId,
      level: client.level,
      x: msg.x || 400,
      y: msg.y || 400,
      hp: msg.hp,
      maxHp: msg.maxHp,
      mp: msg.mp,
      maxMp: msg.maxMp,
      nation: msg.nation || '',
    }, { aiCount, initLevel });

    // v3.1.0：一併回傳地圖配置（客戶端用於顯示傳送點、地圖尺寸等）
    const mapCfg = gameWorld.getMapConfig ? gameWorld.getMapConfig(mapId) : null;
    const reply = {
      type: 'join_map_ok',
      serverId,
      mapId,
      playerId: client.playerId,
      wsId: client.wsId,
      self: snapshot.self,
      entities: snapshot.entities,
      aoiRadius: snapshot.aoiRadius,
      time: Date.now(),
    };
    if (mapCfg) {
      reply.mapConfig = {
        mapId: mapCfg.mapId,
        name: mapCfg.name,
        width: mapCfg.width,
        height: mapCfg.height,
        background: mapCfg.background,
        teleports: mapCfg.teleports || [],
        npcs: mapCfg.npcs || [],
        type: mapCfg.type,
        bgm: mapCfg.bgm,
      };
    }
    sendJson(client.socket, reply);

    console.log(`[WS] ${client.account} 加入 ${serverId}/${mapId}, wsId=${client.wsId}, 初始實體數=${snapshot.entities.length}`);
  }

  // v3.1.0：客戶端主動切換地圖
  function handleChangeMap(client, msg) {
    if (!client.authenticated || !client.mapId || !client.serverId) return;
    const targetMap = msg.targetMap;
    if (!targetMap) return;

    const targetX = msg.targetX != null ? msg.targetX : null;
    const targetY = msg.targetY != null ? msg.targetY : null;
    const fromMap = client.mapId;

    const result = gameWorld.playerChangeMap(
      client.serverId, fromMap, targetMap, client.wsId, targetX, targetY
    );

    if (result.success) {
      // 更新 client 狀態
      client.mapId = targetMap;
      const payload = {
        type: 'map_change',
        fromMap,
        targetMap,
        targetX: result.snapshot.self.x,
        targetY: result.snapshot.self.y,
        mapConfig: result.targetMapConfig ? {
          mapId: result.targetMapConfig.mapId,
          name: result.targetMapConfig.name,
          width: result.targetMapConfig.width,
          height: result.targetMapConfig.height,
          background: result.targetMapConfig.background,
          teleports: result.targetMapConfig.teleports || [],
          npcs: result.targetMapConfig.npcs || [],
          type: result.targetMapConfig.type,
          bgm: result.targetMapConfig.bgm,
        } : null,
        self: result.snapshot.self,
        entities: result.snapshot.entities,
        aoiRadius: result.snapshot.aoiRadius,
        time: Date.now(),
      };
      sendJson(client.socket, payload);
      console.log(`[WS] 玩家 ${client.account} 主動切換地圖 ${fromMap} → ${targetMap}`);
    } else {
      sendJson(client.socket, {
        type: 'change_map_fail',
        targetMap,
        error: result.error || '切換失敗',
        time: Date.now(),
      });
    }
  }

  // 給 game-world 呼叫的廣播函數（被動傳送觸發時由 game-world 直接用 _wsSendToClient）

  function handleMove(client, msg) {
    if (!client.authenticated || !client.mapId) return;
    // v3.0.0：Server Authoritative — 客戶端只發送目標點，伺服器驗證並計算移動
    const x = parseFloat(msg.x);
    const y = parseFloat(msg.y);
    if (isNaN(x) || isNaN(y)) return;
    gameWorld.playerMove(client.serverId, client.mapId, client.wsId, x, y);
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
    if (!client || clients.get(client.wsId) !== client) return;
    clients.delete(client.wsId);
    if (client.mapId && client.serverId) {
      gameWorld.playerLeave(client.serverId, client.mapId, client.wsId);
    }
    console.log(`[WS] 客戶端斷線 wsId=${client.wsId} account=${client.account || '未認證'}`);
  }

  // v3.0.0：單點發送訊息（給 game-world AOI 用）
  function sendToClient(wsId, msg) {
    const client = clients.get(wsId);
    if (!client || !client.socket || client.socket.destroyed) return false;
    try {
      sendJson(client.socket, msg);
      return true;
    } catch(e) {
      return false;
    }
  }

  // GM 廣播（文字）
  function gmBroadcast(text) {
    const msg = { type: 'gm_broadcast', text, time: Date.now() };
    for (const [wsId, c] of clients) {
      if (c.authenticated) sendJson(c.socket, msg);
    }
  }

  // 廣播任意 JSON 給所有已認證客戶端
  function broadcastData(msg) {
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
    // v2.8.2：每次進入都校準數量到 aiCount（不僅首次），確保排行榜與地圖 AI 同步
    //  持久化載入僅供恢復狀態，數量以 GM 設定的 aiCount 為準
    const k = mapKey(serverId, mapId);
    const aiState = aiEngine.getAIState(serverId, mapId);
    const target = Math.max(0, Math.floor(aiCount || 0));

    if (!aiLoaded.has(k) && aiPersistence && aiPersistence.load) {
      try {
        const saved = aiPersistence.load(serverId, mapId);
        if (Array.isArray(saved) && saved.length > 0) {
          aiState.clear();
          saved.forEach(ai => {
            if (ai.maxHp != null && ai.hpMax == null) ai.hpMax = ai.maxHp;
            if (ai.maxHp == null) ai.maxHp = ai.hpMax;
            if (ai.state == null) ai.state = 'wandering';
            if (ai.dead == null) ai.dead = false;
            if (ai.uid == null) ai.uid = ai.id;
            aiState.set(ai.id, ai);
          });
          aiLoaded.add(k);
          console.log(`[AI] 從持久化載入 ${serverId}:${mapId}，共 ${saved.length} 個 AI，目標 aiCount=${target}`);
        } else {
          aiLoaded.add(k);
          console.log(`[AI] ${serverId}:${mapId} 持久化無數據，即將從頭生成 ${target} 個 AI`);
        }
      } catch(e) {
        console.error('[AI] 持久化載入失敗（將從頭生成）:', e.message);
        aiLoaded.add(k);
      }
    }

    // v2.8.2：不論載入結果與當前數量，一律校準到 target
    if (aiState.size !== target) {
      try {
        const before = aiState.size;
        aiEngine.adjustCount(serverId, mapId, target, { initLevel });
        const after = aiState.size;
        console.log(`[AI] ${serverId}:${mapId} 校準 AI 數量：${before} → ${after}（目標 ${target}）`);
        if (after !== target) {
          console.error(`[AI] 校準失敗！預期 ${target} 實際 ${after}，請檢查 aiEngine.adjustCount`);
        }
      } catch(e) {
        console.error(`[AI] 校準 ${serverId}:${mapId} 到 ${target} 個 AI 失敗:`, e.message, e.stack);
      }
    } else {
      console.log(`[AI] ${serverId}:${mapId} AI 數量已正確（${aiState.size}）`);
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
    broadcastData,
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
    sendToClient,
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

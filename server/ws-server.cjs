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
    const name = AI_NAMES[nameIdx] + '·AI';
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

  // ========== v2.7.8：完整 AI 行為引擎 ==========
  // 每 200ms 跑一次 tick（5Hz），對齊本地 AI 行為：
  //   死亡→重生→村莊休息→回戰場→索敵(怪/玩家/敵AI)→追擊→攻擊→掉落→升級→加軍團
  const WORLD_W = 2000;
  const WORLD_H = 1400;
  const AI_TICK_INTERVAL = 200; // ms
  const AI_BROADCAST_INTERVAL = 200; // ms
  const _aiBroadcastTimes = new Map();

  function dist2(x1, y1, x2, y2) {
    const dx = x1 - x2, dy = y1 - y2;
    return dx * dx + dy * dy;
  }

  // ===== v2.7.8：玩家攻擊 AI（權威扣血）=====
  function damageAI(serverId, mapId, aiId, damage, attackerInfo) {
    const aiState = getAIState(serverId, mapId);
    const ai = aiState.get(aiId);
    if (!ai || ai.dead) return { dead: false, hp: 0, damage: 0, killed: false };
    const actualDmg = Math.max(1, Math.floor(damage - ai.def * 0.3));
    ai.hp = Math.max(0, ai.hp - actualDmg);
    let killed = false;
    if (ai.hp <= 0 && !ai.dead) {
      ai.dead = true;
      ai.state = 'dead';
      ai.respawnTimer = 0;
      killed = true;
      const goldDrop = Math.floor(ai.gold * 0.3) + Math.floor(ai.level * 5);
      const expDrop = Math.floor(ai.level * 20 + 30);
      broadcastToMap(serverId, mapId, {
        type: 'ai_killed',
        serverId, mapId,
        aiId: ai.id,
        aiName: ai.name,
        aiLevel: ai.level,
        killer: attackerInfo || { name: 'Player' },
        goldDrop,
        expDrop,
        time: Date.now(),
      });
    }
    return { dead: ai.dead, hp: ai.hp, damage: actualDmg, killed };
  }

  setInterval(() => {
    const dt = AI_TICK_INTERVAL / 1000; // 秒
    for (const [key, aiState] of aiStates) {
      const [serverId, mapId] = key.split(':');
      const players = getMapPlayers(serverId, mapId);
      let changed = false;

      for (const ai of aiState.values()) {
        // ===== 死亡 & 重生 =====
        if (ai.dead) {
          ai.respawnTimer += dt;
          if (ai.respawnTimer > 10 + Math.random() * 10) {
            ai.dead = false;
            ai.state = 'wandering';
            ai.hp = ai.hpMax;
            ai.attackCooldown = 0;
            ai.targetUid = null;
            ai.respawnTimer = 0;
            ai.x = 100 + Math.random() * (WORLD_W - 200);
            ai.y = 100 + Math.random() * (WORLD_H - 200);
            ai.potions = { hp: 3, mp: 2 };
            changed = true;
          }
          continue;
        }

        if (ai.attackCooldown > 0) ai.attackCooldown = Math.max(0, ai.attackCooldown - dt);

        // ===== 索敵：玩家（PvP） =====
        // 只有敵對國家的玩家才會主動攻擊，且在 aggro 範圍內
        let nearestPlayer = null;
        let nearestPlayerDist2 = Infinity;
        const aggroRange = 250;
        for (const [pid, p] of players) {
          const px = p.x != null ? p.x : 400;
          const py = p.y != null ? p.y : 400;
          const hp = p.hp != null ? p.hp : 100;
          if (hp <= 0) continue;
          const d2 = dist2(ai.x, ai.y, px, py);
          if (d2 < aggroRange * aggroRange && d2 < nearestPlayerDist2) {
            // v2.7.8：伺服器端 AI 對所有玩家都主動攻擊（類似怪物 aggro）
            nearestPlayerDist2 = d2;
            nearestPlayer = { id: pid, x: px, y: py, hp };
          }
        }

        // ===== 索敵：其他 AI（AI vs AI）=====
        // 不同國家的 AI 會互相攻擊（一定概率觸發）
        let nearestEnemyAI = null;
        let nearestEnemyAIDist = Infinity;
        if (!nearestPlayer && Math.random() < 0.02) {
          for (const other of aiState.values()) {
            if (other.id === ai.id || other.dead) continue;
            if (other.nation === ai.nation) continue; // 同國不打
            const d = Math.hypot(other.x - ai.x, other.y - ai.y);
            if (d < 200 && d < nearestEnemyAIDist) {
              nearestEnemyAIDist = d;
              nearestEnemyAI = other;
            }
          }
        }

        // ===== 行為決策 =====
        const atkRange = (ai.classId === 'archer' || ai.classId === 'mage' || ai.classId === 'warlock') ? 120 : 40;

        if (nearestPlayer) {
          // 追擊 / 攻擊玩家
          ai.targetUid = 'player_' + nearestPlayer.id;
          const dx = nearestPlayer.x - ai.x;
          const dy = nearestPlayer.y - ai.y;
          const dist = Math.sqrt(nearestPlayerDist2);
          ai.facing = dx >= 0 ? 'right' : 'left';
          if (dist > atkRange) {
            ai.state = 'chasing';
            const moveDist = Math.min(dist - atkRange + 5, ai.speed * dt);
            ai.x += (dx / dist) * moveDist;
            ai.y += (dy / dist) * moveDist;
          } else if (ai.attackCooldown <= 0) {
            ai.state = 'attacking';
            ai.attackCooldown = ai.attackInterval;
            const dmg = Math.max(1, Math.floor(ai.atk * (0.9 + Math.random() * 0.2) * 0.5)); // 玩家有防禦，先減半
            aiAttackPlayer(serverId, mapId, ai, nearestPlayer.id, dmg);
          } else {
            ai.state = 'idle';
          }
          changed = true;
        } else if (nearestEnemyAI) {
          // AI vs AI
          ai.targetUid = nearestEnemyAI.id;
          const dx = nearestEnemyAI.x - ai.x;
          const dy = nearestEnemyAI.y - ai.y;
          const dist = nearestEnemyAIDist;
          ai.facing = dx >= 0 ? 'right' : 'left';
          if (dist > atkRange) {
            ai.state = 'chasing';
            const moveDist = Math.min(dist - atkRange + 5, ai.speed * dt);
            ai.x += (dx / dist) * moveDist;
            ai.y += (dy / dist) * moveDist;
          } else if (ai.attackCooldown <= 0) {
            ai.state = 'attacking';
            ai.attackCooldown = ai.attackInterval;
            const dmg = Math.max(1, Math.floor(ai.atk * (0.9 + Math.random() * 0.2) - nearestEnemyAI.def * 0.5));
            nearestEnemyAI.hp = Math.max(0, nearestEnemyAI.hp - dmg);
            // 反擊
            if (!nearestEnemyAI.targetUid || Math.random() < 0.7) {
              nearestEnemyAI.targetUid = ai.id;
            }
            // 死亡處理
            if (nearestEnemyAI.hp <= 0 && !nearestEnemyAI.dead) {
              nearestEnemyAI.dead = true;
              nearestEnemyAI.state = 'dead';
              nearestEnemyAI.respawnTimer = 0;
              ai.kills++;
              ai.gold += Math.floor(nearestEnemyAI.gold * 0.2);
              const expGain = Math.floor(nearestEnemyAI.level * 5 + 10);
              ai.exp += expGain;
              // AI 升級
              while (ai.exp >= ai.expMax) {
                ai.exp -= ai.expMax;
                ai.level++;
                ai.expMax = Math.floor(ai.expMax * 1.3);
                ai.hpMax += Math.floor(ai.hpMax * 0.08);
                ai.hp = ai.hpMax;
                ai.atk = Math.floor(ai.atk * 1.06);
                ai.def = Math.floor(ai.def * 1.05);
              }
              // 廣播死亡事件
              broadcastToMap(serverId, mapId, {
                type: 'ai_dead',
                serverId, mapId,
                deadId: nearestEnemyAI.id,
                killerId: ai.id,
                killerName: ai.name,
                expGain, goldGain: Math.floor(nearestEnemyAI.gold * 0.2),
                time: Date.now(),
              });
            }
          } else {
            ai.state = 'idle';
          }
          changed = true;
        } else {
          // 閒置 / 巡邏
          ai.targetUid = null;
          ai.state = 'wandering';
          ai.wanderTimer -= dt;
          if (ai.wanderTimer <= 0) {
            ai.wanderTimer = 2 + Math.random() * 3;
            ai.targetX = 50 + Math.random() * (WORLD_W - 100);
            ai.targetY = 50 + Math.random() * (WORLD_H - 100);
          }
          const mdx = ai.targetX - ai.x;
          const mdy = ai.targetY - ai.y;
          const mdist = Math.hypot(mdx, mdy);
          if (mdist > 2) {
            const moveDist = Math.min(mdist, ai.speed * 0.7 * dt); // 巡邏速度 70%
            ai.x += (mdx / mdist) * moveDist;
            ai.y += (mdy / mdist) * moveDist;
            ai.facing = mdx >= 0 ? 'right' : 'left';
            changed = true;
          }
        }

        // 邊界約束
        ai.x = Math.max(20, Math.min(WORLD_W - 20, ai.x));
        ai.y = Math.max(20, Math.min(WORLD_H - 20, ai.y));
      }

      // 節流廣播
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

      // 持久化（每 30 秒一次，這裡簡化為每 tick 有死人才寫）
      // 完整持久化由外部定時器調用 save
    }
  }, AI_TICK_INTERVAL);

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
          saved.forEach(ai => {
            // v2.7.9：舊版持久化格式遷移（補齊 hpMax/atk/def/speed/state 等新欄位）
            //  舊版只有 maxHp 而無 hpMax，也缺 atk/def/speed/attackInterval 等
            if (ai.maxHp != null && ai.hpMax == null) ai.hpMax = ai.maxHp;
            if (ai.hpMax == null) ai.hpMax = 100;
            if (ai.hp == null) ai.hp = ai.hpMax;
            if (ai.atk == null || ai.def == null || ai.speed == null) {
              const stats = calcBaseStats(ai.classId || 'warrior', ai.level || 1);
              if (ai.atk == null) ai.atk = stats.atk;
              if (ai.def == null) ai.def = stats.def;
              if (ai.speed == null) ai.speed = stats.speed;
              if (ai.hpMax == null || ai.hpMax < stats.hpMax) ai.hpMax = stats.hpMax;
              if (ai.hp == null || ai.hp > ai.hpMax) ai.hp = ai.hpMax;
            }
            if (ai.maxHp == null) ai.maxHp = ai.hpMax; // 雙寫相容
            if (ai.attackInterval == null) ai.attackInterval = 1.2 + Math.random() * 0.4;
            if (ai.attackCooldown == null) ai.attackCooldown = 0;
            if (ai.state == null) ai.state = 'wandering';
            if (ai.targetX == null) ai.targetX = ai.x;
            if (ai.targetY == null) ai.targetY = ai.y;
            if (ai.wanderTimer == null) ai.wanderTimer = 2 + Math.random() * 3;
            if (ai.dead == null) ai.dead = false;
            if (ai.respawnTimer == null) ai.respawnTimer = 0;
            if (ai.potions == null) ai.potions = { hp: 3, mp: 2 };
            if (ai.kills == null) ai.kills = 0;
            if (ai.gold == null) ai.gold = 50;
            if (ai.exp == null) ai.exp = 0;
            if (ai.expMax == null) ai.expMax = Math.floor(100 * Math.pow(1.3, (ai.level || 1) - 1));
            if (ai.facing == null) ai.facing = 'right';
            if (ai.uid == null) ai.uid = ai.id;
            if (ai.guildId === undefined) ai.guildId = null;
            if (ai.contribution == null) ai.contribution = 0;
            aiState.set(ai.id, ai);
          });
          aiLoaded.add(k);
          console.log(`[AI] 從持久化載入 ${serverId}:${mapId}，共 ${saved.length} 個 AI（已遷移至 v2.7.9 格式）`);
          // v2.7.9：載入後仍按 GM 設定校準數量（載入不足則補、過多則刪）
          //  避免舊持久化只有 5 隻、GM 設 8 隻，導致 AI:SVR(5) 而非預期值
          if (aiCount > 0 && aiState.size !== aiCount) {
            try {
              adjustAICount(serverId, mapId, aiCount, { initLevel });
            } catch(e) { console.warn('[AI] 載入後校準數量失敗:', e.message); }
          }
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
  // v2.7.8：完整 AI 行為引擎已移至上方 tick 中（5Hz 循環）
  // 這裡保留舊常數名給可能的外部引用
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

  // v2.7.8：下方統一 damageAI 已取代舊版
  // 舊 aiAttackPlayer 保留相容（給 tick 引擎呼叫）

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

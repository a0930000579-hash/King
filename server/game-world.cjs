/**
 * v3.0.0：Server Authoritative Game World
 *
 * 統一管理所有遊戲狀態：玩家、AI、怪物
 * 每張地圖有獨立的 MapWorld，包含：
 *   - entities: Map<id, entity>（玩家/AI/怪物統一管理）
 *   - tick loop: 固定頻率更新 AI 行為、戰鬥、移動
 *   - AOI: 每個玩家的可見範圍，只廣播附近實體
 *   - broadcast: 進入/離開/移動/戰鬥事件
 *
 * 架構：
 *   ws-server.cjs    →  連線管理 + auth + 訊息收發
 *   game-world.cjs   →  遊戲世界狀態 + tick + AOI + 廣播
 *   ai-engine.cjs    →  AI 行為邏輯（複用現有）
 *   db-layer.cjs     →  持久化
 */

const { createAIEngine } = require('./ai-engine.cjs');

// ============================================================
//  常數設定
// ============================================================
const TICK_INTERVAL_MS = 100;       // 遊戲 tick 頻率（10fps 的狀態更新）
const AOI_RADIUS = 800;             // AOI 半徑（px）
const MOVE_SPEED = 180;             // 玩家移動速度 px/s（與客戶端一致）
const BROADCAST_ENTITIES_PER_TICK = true;

// ============================================================
//  全域狀態
// ============================================================
const worlds = new Map();           // mapKey -> MapWorld
let tickTimer = null;

// ============================================================
//  MapWorld：單一地圖的遊戲世界
// ============================================================
class MapWorld {
  constructor(serverId, mapId) {
    this.serverId = serverId;
    this.mapId = mapId;
    this.entities = new Map();      // id -> entity（所有類型：player/ai/monster）
    this.players = new Map();       // wsId -> entity（快速索引）
    this.aiEngine = null;           // 遲延初始化
    this.lastTickTime = Date.now();
    this._aiInitialized = false;
  }

  // 確保 AI 引擎已初始化（第一次有玩家進入時才建立，節省資源）
  ensureAIEngine(aiCount, initLevel) {
    if (this._aiInitialized) return;
    this._aiInitialized = true;
    console.log(`[GameWorld] ${this.mapId}: 初始化伺服器 AI (count=${aiCount}, level=${initLevel})`);
    this.aiEngine = createAIEngine({ serverId: this.serverId });
    // 生成初始 AI
    const aiList = this.aiEngine.ensureMapAI(this.mapId, {
      count: aiCount,
      initLevel,
    });
    for (const ai of aiList) {
      const entity = this._aiToEntity(ai);
      this.entities.set(entity.id, entity);
    }
    // AI 變動回調
    this.aiEngine.onAIChange = (srvId, mpId, aiList) => {
      if (srvId !== this.serverId || mpId !== this.mapId) return;
      // 同步 AI 實體到 entities
      for (const ai of aiList) {
        const eid = 'ai:' + ai.id;
        const existing = this.entities.get(eid);
        if (existing) {
          existing.x = ai.x;
          existing.y = ai.y;
          existing.hp = ai.hp;
          existing.maxHp = ai.maxHp;
          existing.state = ai.state;
          existing.level = ai.level;
        }
      }
    };
    console.log(`[GameWorld] ${this.mapId}: 已有 ${this.entities.size} 個實體 (${aiList.length} AI)`);
  }

  _aiToEntity(ai) {
    return {
      id: 'ai:' + ai.id,
      kind: 'ai',
      uid: ai.id,
      name: ai.name,
      classId: ai.classId || 'warrior',
      level: ai.level || 1,
      x: ai.x,
      y: ai.y,
      hp: ai.hp,
      maxHp: ai.maxHp,
      nation: ai.nation || '',
      state: ai.state || 'idle',
      dir: ai.dir || 'down',
      speed: ai.speed || 120,
      target: ai.target || null,
      lastMoveTime: Date.now(),
    };
  }

  // 玩家加入
  addPlayer(wsId, playerData) {
    const entity = {
      id: 'p:' + wsId,
      kind: 'player',
      wsId,
      account: playerData.account || '',
      name: playerData.name || 'Player',
      classId: playerData.classId || 'warrior',
      level: playerData.level || 1,
      x: playerData.x || 400,
      y: playerData.y || 400,
      hp: playerData.hp || 100,
      maxHp: playerData.maxHp || 100,
      mp: playerData.mp || 50,
      maxMp: playerData.maxMp || 50,
      nation: playerData.nation || '',
      state: 'idle',
      dir: 'down',
      speed: playerData.speed || MOVE_SPEED,
      moveTarget: null,        // {x, y}
      lastMoveTime: Date.now(),
      seenEntities: new Set(), // 當前 AOI 內的實體 id（用於 enter/leave 偵測）
    };
    this.entities.set(entity.id, entity);
    this.players.set(wsId, entity);
    console.log(`[GameWorld] ${this.mapId}: 玩家加入 ${entity.name} (${entity.id}), 總玩家=${this.players.size}`);
    return entity;
  }

  // 玩家離開
  removePlayer(wsId) {
    const entity = this.players.get(wsId);
    if (!entity) return;
    this.entities.delete(entity.id);
    this.players.delete(wsId);
    // 廣播給附近玩家
    this._broadcastLeave(entity.id, wsId);
    console.log(`[GameWorld] ${this.mapId}: 玩家離開 ${entity.name}, 剩餘玩家=${this.players.size}`);
  }

  // 處理玩家移動請求
  handleMove(wsId, x, y) {
    const player = this.players.get(wsId);
    if (!player) return;
    // 簡單邊界檢查（地圖大小假設為 2000x2000，實際可從地圖設定讀取）
    x = Math.max(0, Math.min(2000, x));
    y = Math.max(0, Math.min(2000, y));
    player.moveTarget = { x, y };
    player.state = 'walk';
    player.lastMoveTime = Date.now();
  }

  // tick：更新所有實體狀態
  tick(dt) {
    // 更新 AI 引擎
    if (this.aiEngine && typeof this.aiEngine.tick === 'function') {
      try {
        this.aiEngine.tick(this.mapId, dt);
      } catch(e) {
        // AI tick 錯誤不影響主循環
      }
    }

    // 更新玩家移動（朝目標點移動）
    for (const player of this.players.values()) {
      if (player.moveTarget && player.state === 'walk') {
        const dx = player.moveTarget.x - player.x;
        const dy = player.moveTarget.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 5) {
          player.x = player.moveTarget.x;
          player.y = player.moveTarget.y;
          player.moveTarget = null;
          player.state = 'idle';
        } else {
          const step = (player.speed * dt) / 1000;
          const ratio = Math.min(1, step / dist);
          player.x += dx * ratio;
          player.y += dy * ratio;
          // 更新方向
          if (Math.abs(dx) > Math.abs(dy)) {
            player.dir = dx > 0 ? 'right' : 'left';
          } else {
            player.dir = dy > 0 ? 'down' : 'up';
          }
        }
      }
    }

    // AOI 廣播
    this._broadcastAOI();
  }

  // AOI 廣播：計算每個玩家可見的實體，發送 enter/leave/move
  _broadcastAOI() {
    if (!global._wsSendToClient) return;

    for (const [wsId, player] of this.players) {
      const visibleIds = new Set();
      const enterEntities = [];
      const moveEntities = [];

      // 找出 AOI 範圍內的所有實體
      for (const entity of this.entities.values()) {
        if (entity.id === player.id) continue;
        const dist = Math.hypot(entity.x - player.x, entity.y - player.y);
        if (dist <= AOI_RADIUS) {
          visibleIds.add(entity.id);
          if (player.seenEntities.has(entity.id)) {
            // 已在視野內 → 發送 move（狀態更新）
            moveEntities.push(this._serializeEntity(entity));
          } else {
            // 新進入視野 → 發送 enter
            enterEntities.push(this._serializeEntity(entity));
          }
        }
      }

      // 離開視野的實體
      const leaveIds = [];
      for (const oldId of player.seenEntities) {
        if (!visibleIds.has(oldId)) {
          leaveIds.push(oldId);
        }
      }

      // 更新 seenEntities
      player.seenEntities = visibleIds;

      // 發送事件
      if (enterEntities.length > 0) {
        global._wsSendToClient(wsId, {
          type: 'aoi_enter',
          mapId: this.mapId,
          entities: enterEntities,
          time: Date.now(),
        });
      }
      if (moveEntities.length > 0) {
        global._wsSendToClient(wsId, {
          type: 'aoi_update',
          mapId: this.mapId,
          entities: moveEntities,
          time: Date.now(),
        });
      }
      if (leaveIds.length > 0) {
        global._wsSendToClient(wsId, {
          type: 'aoi_leave',
          mapId: this.mapId,
          ids: leaveIds,
          time: Date.now(),
        });
      }
    }
  }

  _broadcastLeave(leavingId, exceptWsId) {
    if (!global._wsSendToClient) return;
    for (const [wsId, player] of this.players) {
      if (wsId === exceptWsId) continue;
      if (player.seenEntities.has(leavingId)) {
        player.seenEntities.delete(leavingId);
        global._wsSendToClient(wsId, {
          type: 'aoi_leave',
          mapId: this.mapId,
          ids: [leavingId],
          time: Date.now(),
        });
      }
    }
  }

  _serializeEntity(e) {
    return {
      id: e.id,
      kind: e.kind,
      name: e.name,
      classId: e.classId,
      level: e.level,
      x: Math.round(e.x),
      y: Math.round(e.y),
      hp: e.hp,
      maxHp: e.maxHp,
      mp: e.mp,
      maxMp: e.maxMp,
      nation: e.nation,
      state: e.state,
      dir: e.dir,
    };
  }

  // 取得地圖快照（玩家第一次進入時發送）
  getInitialSnapshot(playerWsId) {
    const player = this.players.get(playerWsId);
    if (!player) return { entities: [] };
    const entities = [];
    for (const e of this.entities.values()) {
      if (e.id === player.id) continue;
      const dist = Math.hypot(e.x - player.x, e.y - player.y);
      if (dist <= AOI_RADIUS) {
        entities.push(this._serializeEntity(e));
        player.seenEntities.add(e.id);
      }
    }
    return {
      self: this._serializeEntity(player),
      entities,
      aoiRadius: AOI_RADIUS,
    };
  }
}

// ============================================================
//  對外 API
// ============================================================
function getWorld(serverId, mapId) {
  const key = `${serverId}:${mapId}`;
  if (!worlds.has(key)) {
    worlds.set(key, new MapWorld(serverId, mapId));
    console.log(`[GameWorld] 建立新世界: ${key}, 總世界數=${worlds.size}`);
  }
  return worlds.get(key);
}

// 玩家加入地圖
function playerJoin(serverId, mapId, wsId, playerData, aiConfig) {
  const world = getWorld(serverId, mapId);
  // 確保 AI 已初始化（第一次有人進入時）
  if (aiConfig && aiConfig.aiCount != null) {
    world.ensureAIEngine(
      parseInt(aiConfig.aiCount) || 8,
      parseInt(aiConfig.initLevel) || 1
    );
  }
  const entity = world.addPlayer(wsId, playerData);
  // 返回初始快照
  return world.getInitialSnapshot(wsId);
}

// 玩家離開地圖
function playerLeave(serverId, mapId, wsId) {
  const key = `${serverId}:${mapId}`;
  const world = worlds.get(key);
  if (!world) return;
  world.removePlayer(wsId);
  // 如果地圖空了，銷毀世界（節省資源）
  if (world.players.size === 0) {
    console.log(`[GameWorld] 地圖 ${key} 已空，保留世界（AI 仍在運行）`);
    // 暫不銷毀，避免頻繁重建；如果記憶體壓力大再改
  }
}

// 玩家移動
function playerMove(serverId, mapId, wsId, x, y) {
  const key = `${serverId}:${mapId}`;
  const world = worlds.get(key);
  if (!world) return;
  world.handleMove(wsId, x, y);
}

// 啟動全域 tick
function startTick() {
  if (tickTimer) return;
  let lastTime = Date.now();
  tickTimer = setInterval(() => {
    const now = Date.now();
    const dt = now - lastTime;
    lastTime = now;
    for (const world of worlds.values()) {
      try {
        world.tick(dt);
      } catch(e) {
        console.error('[GameWorld] tick 錯誤:', e.message);
      }
    }
  }, TICK_INTERVAL_MS);
  console.log(`[GameWorld] 全域 tick 已啟動, interval=${TICK_INTERVAL_MS}ms`);
}

// 統計
function getStats() {
  let totalPlayers = 0;
  let totalEntities = 0;
  for (const w of worlds.values()) {
    totalPlayers += w.players.size;
    totalEntities += w.entities.size;
  }
  return {
    worlds: worlds.size,
    totalPlayers,
    totalEntities,
    tickInterval: TICK_INTERVAL_MS,
    aoiRadius: AOI_RADIUS,
  };
}

module.exports = {
  getWorld,
  playerJoin,
  playerLeave,
  playerMove,
  startTick,
  getStats,
  AOI_RADIUS,
  TICK_INTERVAL_MS,
};

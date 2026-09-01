/**
 * v3.1.0：Zone Server 架構 — 多區域遊戲世界
 *
 * 從 v3.0.0 單一 MapWorld 升級為多 Zone 架構：
 *   GameWorld（總管）
 *   └── zones: Map<mapId, Zone>
 *       ├── village: Zone { players, monsters, ais, aiEngine, config, tick }
 *       ├── dark_forest: Zone { ... }
 *       └── ...
 *
 * 每個 Zone 獨立管理：
 *   - 玩家列表（位置 / HP / MP / 狀態 / AOI seenEntities）
 *   - AI 玩家列表（位置 / HP / 等級 / 行為）
 *   - 怪物列表（v3.1 先保留結構，由 ai-engine 負責 AI/怪物邏輯）
 *   - 地圖配置（從 server/maps/map_xxx.json 載入）
 *   - 傳送點偵測（每 tick 檢查玩家是否進入傳送半徑）
 *   - AOI 計算（只在本 zone 內計算）
 *   - tick（移動、戰鬥、AI 行為）
 *
 * 地圖切換流程（伺服器端）：
 *   1. Zone.tick 中檢查玩家是否進入 teleports[].radius
 *   2. 進入 → 從目前 zone 移除 → 加入目標 zone → 發送 map_change 事件
 *   3. 原 zone 附近玩家收到 aoi_leave，新 zone 附近玩家收到 aoi_enter
 *   4. WebSocket 連線不斷線，玩家物件從一個 zone 移到另一個 zone
 */

const fs = require('fs');
const path = require('path');
const { createAIEngine } = require('./ai-engine.cjs');

// ============================================================
//  常數設定
// ============================================================
const TICK_INTERVAL_MS = 100;

// v4.1.8：診斷日誌（寫入 global._wsDiagLogs，可通過 /api/ws-diag 查看）
function _diagLog(msg) {
  try {
    if (!global._wsDiagLogs) global._wsDiagLogs = [];
    global._wsDiagLogs.push(new Date().toISOString() + '  ' + msg);
    if (global._wsDiagLogs.length > 200) global._wsDiagLogs.shift();
  } catch(e) {}
}
const AOI_RADIUS = 800;
const MOVE_SPEED = 180;
const TELEPORT_COOLDOWN_MS = 3000; // 傳送冷卻，避免來回彈跳

// ============================================================
//  地圖配置載入
// ============================================================
const MAPS_DIR = path.join(__dirname, 'maps');
const mapConfigs = {}; // mapId -> config object

function loadMapConfigs() {
  if (!fs.existsSync(MAPS_DIR)) {
    console.warn('[GameWorld] maps 目錄不存在，跳過載入');
    return;
  }
  const files = fs.readdirSync(MAPS_DIR).filter(f => f.startsWith('map_') && f.endsWith('.json'));
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(MAPS_DIR, file), 'utf8');
      const cfg = JSON.parse(raw);
      mapConfigs[cfg.mapId] = cfg;
    } catch (e) {
      console.error(`[GameWorld] 載入地圖配置失敗 ${file}:`, e.message);
    }
  }
  console.log(`[GameWorld] 已載入 ${Object.keys(mapConfigs).length} 張地圖配置`);
}

function getMapConfig(mapId) {
  return mapConfigs[mapId] || null;
}

// ============================================================
//  全域狀態
// ============================================================
const gameWorlds = new Map(); // serverId -> GameWorld
let tickTimer = null;

// ============================================================
//  Zone：單一地圖的遊戲區域
// ============================================================
class Zone {
  constructor(serverId, mapId, config) {
    this.serverId = serverId;
    this.mapId = mapId;
    this.config = config || {
      mapId, name: mapId, width: 2000, height: 2000,
      teleports: [], monsterSpawns: [], npcs: [],
    };
    this.entities = new Map();    // id -> entity（玩家/AI/怪物統一）
    this.players = new Map();     // wsId -> entity（快速索引）
    this.aiEngine = null;
    this._aiInitialized = false;
    this.lastTickTime = Date.now();
    this._teleportCooldowns = new Map(); // wsId -> lastTeleportTime
  }

  get width() { return this.config.width || 2000; }
  get height() { return this.config.height || 2000; }

  // ===== AI 引擎初始化（遲延） =====
  ensureAIEngine(aiCount, initLevel) {
    if (this._aiInitialized) return;
    this._aiInitialized = true;
    console.log(`[Zone] ${this.mapId}: 初始化伺服器 AI (count=${aiCount}, level=${initLevel})`);
    this.aiEngine = createAIEngine({ serverId: this.serverId });
    const aiList = this.aiEngine.ensureMapAI(this.mapId, {
      count: aiCount,
      initLevel,
    });
    for (const ai of aiList) {
      const entity = this._aiToEntity(ai);
      this.entities.set(entity.id, entity);
    }
    this.aiEngine.onAIChange = (srvId, mpId, aiList) => {
      if (srvId !== this.serverId || mpId !== this.mapId) return;
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
    console.log(`[Zone] ${this.mapId}: 已有 ${this.entities.size} 個實體 (${aiList.length} AI)`);
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

  // ===== 玩家加入 =====
  addPlayer(wsId, playerData) {
    const entity = {
      id: 'p:' + wsId,
      kind: 'player',
      wsId,
      account: playerData.account || '',
      name: playerData.name || 'Player',
      classId: playerData.classId || 'warrior',
      level: playerData.level || 1,
      x: playerData.x != null ? playerData.x : (this.config.spawn?.x || 400),
      y: playerData.y != null ? playerData.y : (this.config.spawn?.y || 400),
      hp: playerData.hp || 100,
      maxHp: playerData.maxHp || 100,
      mp: playerData.mp || 50,
      maxMp: playerData.maxMp || 50,
      nation: playerData.nation || '',
      state: 'idle',
      dir: 'down',
      speed: playerData.speed || MOVE_SPEED,
      moveTarget: null,
      lastMoveTime: Date.now(),
      seenEntities: new Set(),
    };
    this.entities.set(entity.id, entity);
    this.players.set(wsId, entity);
    console.log(`[Zone] ${this.mapId}: 玩家加入 ${entity.name} (${entity.id}), 總玩家=${this.players.size}`);
    _diagLog(`[Zone-AOI] 玩家加入 mapId=${this.mapId} wsId=${wsId} entityId=${entity.id} name=${entity.name} 總玩家=${this.players.size} 總實體=${this.entities.size}`);
    return entity;
  }

  // ===== 玩家離開（從本 zone 移除，廣播 aoi_leave） =====
  removePlayer(wsId) {
    const entity = this.players.get(wsId);
    if (!entity) return null;
    this.entities.delete(entity.id);
    this.players.delete(wsId);
    this._broadcastLeave(entity.id, wsId);
    console.log(`[Zone] ${this.mapId}: 玩家離開 ${entity.name}, 剩餘玩家=${this.players.size}`);
    return entity;
  }

  // ===== 玩家移動請求 =====
  handleMove(wsId, x, y) {
    const player = this.players.get(wsId);
    if (!player) return;
    x = Math.max(0, Math.min(this.width, x));
    y = Math.max(0, Math.min(this.height, y));
    player.moveTarget = { x, y };
    player.state = 'walk';
    player.lastMoveTime = Date.now();
  }

  // ===== 傳送點偵測：回傳需要傳送的玩家列表 =====
  checkTeleports() {
    const teleports = this.config.teleports || [];
    if (teleports.length === 0) return [];
    const results = [];
    const now = Date.now();
    for (const [wsId, player] of this.players) {
      // 冷卻檢查
      const lastTp = this._teleportCooldowns.get(wsId) || 0;
      if (now - lastTp < TELEPORT_COOLDOWN_MS) continue;
      for (const tp of teleports) {
        const dist = Math.hypot(player.x - tp.x, player.y - tp.y);
        if (dist <= tp.radius) {
          results.push({ wsId, player, teleport: tp });
          this._teleportCooldowns.set(wsId, now);
          break;
        }
      }
    }
    return results;
  }

  // ===== tick =====
  tick(dt) {
    // AI 引擎更新
    if (this.aiEngine && typeof this.aiEngine.tick === 'function') {
      try {
        this.aiEngine.tick(this.mapId, dt);
      } catch (e) {
        // AI tick 錯誤不影響主循環
      }
    }

    // 玩家移動
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

  // ===== AOI 廣播 =====
  _broadcastAOI() {
    if (!global._wsSendToClient) return;

    for (const [wsId, player] of this.players) {
      const visibleIds = new Set();
      const enterEntities = [];
      const moveEntities = [];
      let checkedCount = 0;

      for (const entity of this.entities.values()) {
        if (entity.id === player.id) continue;
        checkedCount++;
        const dist = Math.hypot(entity.x - player.x, entity.y - player.y);
        if (dist <= AOI_RADIUS) {
          visibleIds.add(entity.id);
          if (player.seenEntities.has(entity.id)) {
            moveEntities.push(this._serializeEntity(entity));
          } else {
            enterEntities.push(this._serializeEntity(entity));
          }
        }
      }

      const leaveIds = [];
      for (const oldId of player.seenEntities) {
        if (!visibleIds.has(oldId)) leaveIds.push(oldId);
      }

      player.seenEntities = visibleIds;

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
      // v4.1.8：診斷日誌（每10次tick輸出一次，避免日誌過多）
      if (!this._aoiLogCounter) this._aoiLogCounter = 0;
      this._aoiLogCounter++;
      if (this._aoiLogCounter % 50 === 0) {
        _diagLog(`[Zone-AOI] 廣播 mapId=${this.mapId} wsId=${wsId} playerId=${player.id} 檢查實體=${checkedCount} enter=${enterEntities.length} move=${moveEntities.length} leave=${leaveIds.length} 總玩家=${this.players.size} 總實體=${this.entities.size}`);
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

  // 廣播某玩家進入 AOI 給附近已存在的玩家
  broadcastEnter(enteringEntity) {
    if (!global._wsSendToClient) {
      console.log('[GameWorld-AOI] ❌ _wsSendToClient未定義，無法發送aoi_enter');
      return;
    }
    const serialized = this._serializeEntity(enteringEntity);
    console.log('[GameWorld-AOI] 📡 broadcastEnter: 新玩家 ' + enteringEntity.id + ' 進入地圖 ' + this.mapId + '，當前在線玩家數=' + this.players.size);
    let sentCount = 0;
    for (const [wsId, player] of this.players) {
      if (wsId === enteringEntity.wsId) {
        console.log('[GameWorld-AOI]   - 跳過自己 wsId=' + wsId);
        continue;
      }
      const dist = Math.hypot(player.x - enteringEntity.x, player.y - enteringEntity.y);
      console.log('[GameWorld-AOI]   - 玩家 ' + player.id + ' wsId=' + wsId + ' 距離=' + Math.round(dist) + ' AOI_RADIUS=' + AOI_RADIUS);
      if (dist <= AOI_RADIUS) {
        player.seenEntities.add(enteringEntity.id);
        global._wsSendToClient(wsId, {
          type: 'aoi_enter',
          mapId: this.mapId,
          entities: [serialized],
          time: Date.now(),
        });
        sentCount++;
        console.log('[GameWorld-AOI]   ✅ 已發送aoi_enter給 wsId=' + wsId + ' 玩家=' + player.id);
      } else {
        console.log('[GameWorld-AOI]   - 距離超過AOI範圍，不發送');
      }
    }
    console.log('[GameWorld-AOI] 📡 broadcastEnter完成，共發送給 ' + sentCount + ' 個玩家');
    _diagLog(`[Zone-AOI] broadcastEnter mapId=${this.mapId} 新玩家=${enteringEntity.id} 在線玩家=${this.players.size} 發送給=${sentCount}人`);
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

  // ===== 初始快照 =====
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
//  GameWorld：單一伺服器下的所有 zone
// ============================================================
class GameWorld {
  constructor(serverId) {
    this.serverId = serverId;
    this.zones = new Map(); // mapId -> Zone
  }

  // 取得或建立 zone
  getZone(mapId) {
    if (!this.zones.has(mapId)) {
      const config = getMapConfig(mapId);
      const zone = new Zone(this.serverId, mapId, config);
      this.zones.set(mapId, zone);
      console.log(`[GameWorld] ${this.serverId}: 建立 zone ${mapId}, 總 zones=${this.zones.size}`);
    }
    return this.zones.get(mapId);
  }

  // 玩家加入指定 zone
  playerJoin(mapId, wsId, playerData, aiConfig) {
    console.log('[GameWorld] 🎮 playerJoin被呼叫: mapId=' + mapId + ' wsId=' + wsId + ' account=' + (playerData?.account || 'unknown'));
    const zone = this.getZone(mapId);
    console.log('[GameWorld] 🎮 取得zone: ' + mapId + '，zone內玩家數=' + zone.players.size);
    if (aiConfig && aiConfig.aiCount != null) {
      zone.ensureAIEngine(
        parseInt(aiConfig.aiCount) || 8,
        parseInt(aiConfig.initLevel) || 1
      );
    }
    const entity = zone.addPlayer(wsId, playerData);
    console.log('[GameWorld] 🎮 玩家已加入zone: ' + entity.id + '，加入後zone內玩家數=' + zone.players.size);
    // 廣播給附近已存在的玩家
    zone.broadcastEnter(entity);
    const snapshot = zone.getInitialSnapshot(wsId);
    console.log('[GameWorld] 🎮 初始快照: entities數=' + snapshot.entities.length + ' self=' + JSON.stringify(snapshot.self).substring(0, 100));
    return snapshot;
  }

  // 玩家離開指定 zone
  playerLeave(mapId, wsId) {
    const zone = this.zones.get(mapId);
    if (!zone) return;
    zone.removePlayer(wsId);
  }

  // 玩家移動
  playerMove(mapId, wsId, x, y) {
    const zone = this.zones.get(mapId);
    if (!zone) return;
    zone.handleMove(wsId, x, y);
  }

  // 地圖切換（從 fromMap 移到 toMap）
  // 回傳 { success, targetZone, snapshot } 或 { success: false, error }
  playerChangeMap(fromMap, toMap, wsId, targetX, targetY) {
    const fromZone = this.zones.get(fromMap);
    if (!fromZone) return { success: false, error: '來源地圖不存在' };

    const targetConfig = getMapConfig(toMap);
    if (!targetConfig) return { success: false, error: '目標地圖不存在' };

    const player = fromZone.players.get(wsId);
    if (!player) return { success: false, error: '玩家不在來源地圖' };

    // 1. 從來源 zone 移除（會廣播 aoi_leave 給附近玩家）
    fromZone.removePlayer(wsId);

    // 2. 準備加入目標 zone 的玩家資料
    const playerData = {
      account: player.account,
      name: player.name,
      classId: player.classId,
      level: player.level,
      x: targetX != null ? targetX : (targetConfig.spawn?.x || 400),
      y: targetY != null ? targetY : (targetConfig.spawn?.y || 400),
      hp: player.hp,
      maxHp: player.maxHp,
      mp: player.mp,
      maxMp: player.maxMp,
      nation: player.nation,
      speed: player.speed,
    };

    // 3. 加入目標 zone
    const toZone = this.getZone(toMap);
    // 確保目標 zone 的 AI 已初始化（如果有 AI 的話）
    if (fromZone.aiEngine && !toZone._aiInitialized) {
      // 從來源 zone 繼承 AI 數量/等級設定（或用預設）
      const aiCount = 8;
      const initLevel = targetConfig.levelMin || 1;
      toZone.ensureAIEngine(aiCount, initLevel);
    }
    const newEntity = toZone.addPlayer(wsId, playerData);
    // 廣播給目標 zone 附近玩家
    toZone.broadcastEnter(newEntity);

    // 4. 回傳目標 zone 的初始快照（給 map_change 事件用）
    const snapshot = toZone.getInitialSnapshot(wsId);
    return {
      success: true,
      targetZone: toZone,
      targetMapConfig: targetConfig,
      snapshot,
    };
  }

  // 全域 tick：對每個 zone 獨立 tick，並檢查傳送點
  tick(dt) {
    for (const zone of this.zones.values()) {
      try {
        // 先檢查傳送點（在 tick 移動之前）
        const teleportResults = zone.checkTeleports();
        for (const { wsId, player, teleport } of teleportResults) {
          const result = this.playerChangeMap(
            zone.mapId, teleport.targetMap, wsId,
            teleport.targetX, teleport.targetY
          );
          if (result.success && global._wsSendToClient) {
            global._wsSendToClient(wsId, {
              type: 'map_change',
              fromMap: zone.mapId,
              targetMap: teleport.targetMap,
              targetX: teleport.targetX,
              targetY: teleport.targetY,
              mapConfig: {
                mapId: result.targetMapConfig.mapId,
                name: result.targetMapConfig.name,
                width: result.targetMapConfig.width,
                height: result.targetMapConfig.height,
                background: result.targetMapConfig.background,
                teleports: result.targetMapConfig.teleports || [],
                npcs: result.targetMapConfig.npcs || [],
                type: result.targetMapConfig.type,
                bgm: result.targetMapConfig.bgm,
              },
              self: result.snapshot.self,
              entities: result.snapshot.entities,
              aoiRadius: result.snapshot.aoiRadius,
              time: Date.now(),
            });
            console.log(`[GameWorld] 玩家 ${player.name} 從 ${zone.mapId} 傳送到 ${teleport.targetMap}`);
          } else if (!result.success) {
            console.warn(`[GameWorld] 傳送失敗: ${result.error}`);
          }
        }

        // 再執行 zone tick（移動 + AOI）
        zone.tick(dt);
      } catch (e) {
        console.error(`[GameWorld] zone ${zone.mapId} tick 錯誤:`, e.message);
      }
    }
  }

  // 統計
  getStats() {
    let totalPlayers = 0;
    let totalEntities = 0;
    for (const z of this.zones.values()) {
      totalPlayers += z.players.size;
      totalEntities += z.entities.size;
    }
    return {
      zones: this.zones.size,
      totalPlayers,
      totalEntities,
    };
  }
}

// ============================================================
//  對外 API（維持 v3.0.0 的介面簽名，向後相容）
// ============================================================
function getWorld(serverId, mapId) {
  if (!gameWorlds.has(serverId)) {
    gameWorlds.set(serverId, new GameWorld(serverId));
    console.log(`[GameWorld] 建立新世界: ${serverId}`);
  }
  const gw = gameWorlds.get(serverId);
  // v3.0.0 相容：回傳 zone 物件（有 addPlayer/handleMove 等方法）
  return gw.getZone(mapId);
}

function getGameWorld(serverId) {
  if (!gameWorlds.has(serverId)) {
    gameWorlds.set(serverId, new GameWorld(serverId));
  }
  return gameWorlds.get(serverId);
}

// 玩家加入地圖
function playerJoin(serverId, mapId, wsId, playerData, aiConfig) {
  const gw = getGameWorld(serverId);
  return gw.playerJoin(mapId, wsId, playerData, aiConfig);
}

// 玩家離開地圖
function playerLeave(serverId, mapId, wsId) {
  const gw = gameWorlds.get(serverId);
  if (!gw) return;
  gw.playerLeave(mapId, wsId);
}

// 玩家移動
function playerMove(serverId, mapId, wsId, x, y) {
  const gw = gameWorlds.get(serverId);
  if (!gw) return;
  gw.playerMove(mapId, wsId, x, y);
}

// 玩家主動切換地圖（由 WS message 觸發，例如回城卷軸）
function playerChangeMap(serverId, fromMap, toMap, wsId, targetX, targetY) {
  const gw = gameWorlds.get(serverId);
  if (!gw) return { success: false, error: '伺服器不存在' };
  return gw.playerChangeMap(fromMap, toMap, wsId, targetX, targetY);
}

// 啟動全域 tick
function startTick() {
  if (tickTimer) return;
  loadMapConfigs();
  let lastTime = Date.now();
  tickTimer = setInterval(() => {
    const now = Date.now();
    const dt = now - lastTime;
    lastTime = now;
    for (const gw of gameWorlds.values()) {
      try {
        gw.tick(dt);
      } catch (e) {
        console.error('[GameWorld] tick 錯誤:', e.message);
      }
    }
  }, TICK_INTERVAL_MS);
  console.log(`[GameWorld] 全域 tick 已啟動, interval=${TICK_INTERVAL_MS}ms, 地圖數=${Object.keys(mapConfigs).length}`);
}

// 統計
function getStats() {
  let totalZones = 0;
  let totalPlayers = 0;
  let totalEntities = 0;
  for (const gw of gameWorlds.values()) {
    const s = gw.getStats();
    totalZones += s.zones;
    totalPlayers += s.totalPlayers;
    totalEntities += s.totalEntities;
  }
  return {
    worlds: gameWorlds.size,
    totalZones,
    totalPlayers,
    totalEntities,
    tickInterval: TICK_INTERVAL_MS,
    aoiRadius: AOI_RADIUS,
    mapConfigs: Object.keys(mapConfigs).length,
  };
}

// v4.1.9：診斷用，取得所有世界
function _getAllWorlds() {
  return gameWorlds;
}

module.exports = {
  getWorld,
  getGameWorld,
  _getAllWorlds,
  getMapConfig,
  playerJoin,
  playerLeave,
  playerMove,
  playerChangeMap,
  startTick,
  getStats,
  AOI_RADIUS,
  TICK_INTERVAL_MS,
  loadMapConfigs,
  Zone,
  GameWorld,
};

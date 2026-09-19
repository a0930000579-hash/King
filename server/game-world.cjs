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
const { createAIEngine, calcBaseStats } = require('./ai-engine.cjs');

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
const AOI_LEAVE_RADIUS = 900; // v4.4.22：AOI 遲滯 — 進入 800、離開 900，消除邊界反覆 enter/leave
const MOVE_SPEED = 180;
const TELEPORT_COOLDOWN_MS = 3000; // 傳送冷卻，避免來回彈跳
// v4.5.0：怪物移動 aoi_update 節流門檻（ms）。hp/state 變更仍即時，不受此限制。
const MONSTER_MOVE_BC_MS = 600; // v4.4.22：怪物/AI 移動廣播節流（ms），hp/state 變更仍即時
const MOVE_QUANTUM_PX = 6;      // v4.4.22：位移未超過此 px 不視為移動變化（過濾巡邏抖動）

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
    this._monsterEntities = new Map(); // monsterUid -> entity（怪物實體鏡像索引）
    this.lastTickTime = Date.now();
    this._teleportCooldowns = new Map(); // wsId -> lastTeleportTime
    // v4.5.0：從地圖設定 npcs[] 建立靜態 NPC 實體（固定座標，無移動）
    this._buildNpcEntities();
  }

  // ===== 建立 NPC 實體（kind:'npc'，靜態） =====
  // 來源：this.config.npcs[] = [{ npcId, x, y, name }]
  //  id 命名：'n:' + mapId + ':' + npcIdx；type=npcId；npcType=npcId
  _buildNpcEntities() {
    const npcs = this.config.npcs || [];
    npcs.forEach((npc, idx) => {
      const entity = {
        id: `n:${this.mapId}:${idx}`,
        kind: 'npc',
        name: npc.name || npc.npcId || 'NPC',
        classId: null,
        level: 1,
        x: Math.round(npc.x || 0),
        y: Math.round(npc.y || 0),
        hp: 100000,
        maxHp: 100000,
        mp: 0,
        maxMp: 0,
        nation: '',
        state: 'idle',
        dir: 'down',
        type: npc.npcId || ('npc_' + idx),
        npcType: npc.npcId || null,
      };
      this.entities.set(entity.id, entity);
    });
    if (npcs.length > 0) {
      console.log(`[Zone] ${this.mapId}: 建立 ${npcs.length} 個靜態 NPC 實體`);
    }
  }

  get width() { return this.config.width || 2000; }
  get height() { return this.config.height || 2000; }

  // ===== AI 引擎初始化（遲延） =====
  ensureAIEngine(aiCount, initLevel) {
    if (this._aiInitialized) return;
    this._aiInitialized = true;
    console.log(`[Zone] ${this.mapId}: 初始化伺服器 AI (count=${aiCount}, level=${initLevel})`);
    this.aiEngine = createAIEngine({ serverId: this.serverId });
    // v4.2.0 修復：ai-engine.cjs 沒有 ensureMapAI，改用 adjustCount + getAIList
    try {
      if (typeof this.aiEngine.start === 'function') this.aiEngine.start();
      this.aiEngine.adjustCount(this.serverId, this.mapId, aiCount, { initLevel, forceReset: true });
    } catch(e) {
      console.warn(`[Zone] ${this.mapId}: adjustCount 失敗（不影響玩家加入）:`, e.message);
    }
    let aiList = [];
    try {
      aiList = this.aiEngine.getAIList(this.serverId, this.mapId) || [];
    } catch(e) {
      console.warn(`[Zone] ${this.mapId}: getAIList 失敗:`, e.message);
    }
    for (const ai of aiList) {
      const entity = this._aiToEntity(ai);
      this.entities.set(entity.id, entity);
    }
    // v4.5.0：把 ai-engine 生成的怪物包成 kind:'monster' 實體放入 entities
    try {
      this._syncMonsters(0);
    } catch(e) {
      console.warn(`[Zone] ${this.mapId}: _syncMonsters 失敗（不影響玩家）:`, e.message);
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

  // v4.5.0：把一隻 ai-engine 怪物包成 Zone 實體（kind:'monster'）
  //  entity id = 'm:' + mapId + ':' + (idx+1)；monsterUid 指回 ai-engine 原始怪物 id
  _monsterToEntity(mon, idx) {
    return {
      id: `m:${this.mapId}:${idx + 1}`,
      kind: 'monster',
      monsterUid: mon.uid || mon.id,
      name: mon.name || mon.type,
      classId: null,
      level: mon.level || 1,
      x: Math.round(mon.x),
      y: Math.round(mon.y),
      hp: mon.hp,
      maxHp: mon.hpMax || mon.maxHp || mon.hp,
      mp: 0,
      maxMp: 0,
      nation: '',
      state: mon.dead ? 'dead' : (mon.state || 'idle'),
      dir: 'down',
      type: mon.type,
      npcType: null,
      speed: mon.speed || 40,
    };
  }

  // v4.5.0：怪物伺服端權威 — 閒置巡邏 / 被打追擊 / 死亡重生，並鏡像進 entities
  //  在 aiEngine.tick() 之後呼叫（此時怪物重生/AI 打擊已生效）
  _syncMonsters(dtMs) {
    if (!this.aiEngine || typeof this.aiEngine.getMonsterList !== 'function') return;
    let list;
    try { list = this.aiEngine.getMonsterList(this.serverId, this.mapId) || []; }
    catch(e) { return; }
    const dt = Math.max(0, dtMs || 0) / 1000; // 秒
    const LEASH = 240;        // 追擊脫離距離（離駐地太遠就放棄）
    const CHASE_SPEED = 50;   // 追擊速度 px/s
    const WANDER_SPEED = 12;  // 巡邏速度 px/s（放慢，避免客戶端插值追趕疲勞）
    const HOME_R = 110;       // 巡邏半徑（圍繞駐地，幅度小）

    list.forEach((mon, idx) => {
      const eid = `m:${this.mapId}:${idx + 1}`;
      let entity = this.entities.get(eid);

      // ---- 死亡：不從 entities 刪除，只標 dead / hp=0，由 aoi_update 廣播屍體 ----
      if (mon.dead) {
        if (!entity) {
          entity = this._monsterToEntity(mon, idx);
          this.entities.set(eid, entity);
          this._monsterEntities.set(mon.uid, entity);
        } else {
          entity.x = Math.round(mon.x);
          entity.y = Math.round(mon.y);
          entity.hp = 0;
          entity.maxHp = mon.hpMax || entity.maxHp;
          entity.state = 'dead';
          entity.type = mon.type;
          entity.name = mon.name || entity.name;
          entity.level = mon.level || entity.level;
        }
        return;
      }

      // ---- 活著的怪物：巡邏 / 追擊 ----
      // 1) 決定目標點
      let tx = mon.wanderX, ty = mon.wanderY;
      let chasing = false;
      if (mon.aggroUid && mon.aggroTimer > 0) {
        const tgt = this.players.get(this._wsIdByPlayerId(mon.aggroUid));
        if (tgt) {
          const dHome = Math.hypot(tgt.x - (mon.homeX ?? mon.x), tgt.y - (mon.homeY ?? mon.y));
          if (dHome <= LEASH) { tx = tgt.x; ty = tgt.y; chasing = true; }
          else mon.aggroTimer = 0; // 追出脫離範圍 → 放棄
        }
      }
      // 2) 巡邏換點
      if (!chasing) {
        mon.wanderTimer -= dt;
        if (mon.wanderTimer <= 0) {
          mon.wanderTimer = 2 + Math.random() * 3;
          const hx = mon.homeX ?? mon.x, hy = mon.homeY ?? mon.y;
          mon.wanderX = Math.max(40, Math.min(this.width - 40, hx + (Math.random() - 0.5) * HOME_R * 2));
          mon.wanderY = Math.max(40, Math.min(this.height - 40, hy + (Math.random() - 0.5) * HOME_R * 2));
          tx = mon.wanderX; ty = mon.wanderY;
        }
      }
      // 3) 移動一步
      const mdx = tx - mon.x, mdy = ty - mon.y;
      const mdist = Math.hypot(mdx, mdy);
      let moved = false;
      if (mdist > 6) {
        const speed = chasing ? CHASE_SPEED : WANDER_SPEED;
        const step = Math.min(mdist, speed * dt);
        mon.x += (mdx / mdist) * step;
        mon.y += (mdy / mdist) * step;
        if (Math.abs(mdx) > Math.abs(mdy)) mon.dir = mdx >= 0 ? 'right' : 'left';
        else mon.dir = mdy >= 0 ? 'down' : 'up';
        moved = true;
      }
      // 邊界 + 駐地軟束縛（非追擊時離駐地太遠則拉回）
      mon.x = Math.max(20, Math.min(this.width - 20, mon.x));
      mon.y = Math.max(20, Math.min(this.height - 20, mon.y));
      if (!chasing) {
        const hx = mon.homeX ?? mon.x, hy = mon.homeY ?? mon.y;
        const dh = Math.hypot(mon.x - hx, mon.y - hy);
        if (dh > HOME_R) {
          mon.x += (hx - mon.x) * 0.1;
          mon.y += (hy - mon.y) * 0.1;
        }
      }

      // 4) 鏡像進 entities
      if (!entity) {
        entity = this._monsterToEntity(mon, idx);
        this.entities.set(eid, entity);
        this._monsterEntities.set(mon.uid, entity);
      } else {
        entity.x = Math.round(mon.x);
        entity.y = Math.round(mon.y);
        entity.hp = mon.hp;
        entity.maxHp = mon.hpMax || entity.maxHp;
        entity.state = moved ? 'walk' : 'idle';
        entity.type = mon.type;
        entity.name = mon.name || entity.name;
        entity.level = mon.level || entity.level;
      }
    });
  }

  // 依 player id（實體 id）反查 wsId（玩家實體 id == playerId）
  _wsIdByPlayerId(playerId) {
    for (const [wsId, p] of this.players) {
      if (p.id === playerId) return wsId;
    }
    return null;
  }

  // ===== 隨機出生點：基於spawn點在±100範圍內生成10個隨機點 =====
  _getRandomSpawn(playerData, forceRandom) {
    const baseX = this.config.spawn?.x || 400;
    const baseY = this.config.spawn?.y || 400;
    // 只有非強制（如移動/恢復）且客戶端給了有效坐標時才沿用；首次加入一律伺服器隨機
    if (!forceRandom && playerData.x != null && playerData.y != null) {
      return { x: playerData.x, y: playerData.y };
    }
    // v4.4.10：生成至少12個候選隨機點（±180），優先選擇離已有玩家最遠的點，避免重疊
    const existing = [...this.players.values()].map(p => ({ x: p.x, y: p.y }));
    const spawnPoints = [];
    for (let i = 0; i < 12; i++) {
      const offsetX = (Math.random() - 0.5) * 360;
      const offsetY = (Math.random() - 0.5) * 360;
      spawnPoints.push({
        x: Math.max(60, Math.min((this.width||2000) - 60, Math.round(baseX + offsetX))),
        y: Math.max(60, Math.min((this.height||2000) - 60, Math.round(baseY + offsetY))),
      });
    }
    // 為每個候選點計算與最近已有玩家的距離，取最遠者
    let chosen = spawnPoints[0];
    if (existing.length) {
      let bestScore = -1;
      for (const sp of spawnPoints) {
        let nearest = Infinity;
        for (const e of existing) {
          const d = (sp.x-e.x)*(sp.x-e.x) + (sp.y-e.y)*(sp.y-e.y);
          if (d < nearest) nearest = d;
        }
        if (nearest > bestScore) { bestScore = nearest; chosen = sp; }
      }
    } else {
      chosen = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
    }
    console.log(`[Zone-Spawn] ${this.mapId}: 隨機出生點 (${chosen.x}, ${chosen.y})，基點(${baseX},${baseY})，候選12，在線玩家${existing.length}`);
    return chosen;
  }

  // ===== 玩家加入 =====
  addPlayer(wsId, playerData) {
    // v4.4.10：首次加入伺服器權威強制隨機出生（忽略客戶端坐標，避免全員重疊同一點）
    const spawnPos = this._getRandomSpawn(playerData, true);
    const entity = {
      id: playerData.id || ('p:' + wsId),  // v4.2.0：優先使用客戶端playerId，保持兩端一致
      kind: 'player',
      wsId,
      account: playerData.account || '',
      name: playerData.name || 'Player',
      classId: playerData.classId || 'warrior',
      level: playerData.level || 1,
      x: spawnPos.x,
      y: spawnPos.y,
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
    // v4.5.0：斷線廣播失敗不得影響移除流程
    try { this._broadcastLeave(entity.id, wsId); } catch (e) {
      console.error(`[Zone] ${this.mapId}: _broadcastLeave 異常（已忽略）:`, e.message);
    }
    console.log(`[Zone] ${this.mapId}: 玩家離開 ${entity.name}, 剩餘玩家=${this.players.size}`);
    return entity;
  }

  // ===== 玩家移動請求 =====
  // v4.4.19 server 權威單位軟碰撞：玩家不得與其他玩家/AI 重疊站位。
  // 只移動玩家本身，其他玩家與 AI 視為障礙（AI 位置由 ai-engine 每 tick 同步，推 AI 會被覆蓋）。
  _separatePlayer(player) {
    const MIN_D = 42; // 兩單位中心最小間距（世界座標，約兩個腳底碰撞圓直徑）
    for (let iter = 0; iter < 2; iter++) {
      for (const other of this.entities.values()) {
        if (other === player || other.id === player.id) continue;
        if (other.x == null || other.y == null) continue;
        if (other.hp != null && other.hp <= 0) continue; // 死亡單位不擋
        let dx = player.x - other.x;
        let dy = player.y - other.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= MIN_D * MIN_D) continue;
        let d = Math.sqrt(d2);
        if (d < 0.001) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d = Math.hypot(dx, dy) || 1; }
        const push = (MIN_D - d) / d;
        player.x += dx * push;
        player.y += dy * push;
      }
    }
    player.x = Math.max(16, Math.min(this.width - 16, player.x));
    player.y = Math.min(this.height - 16, Math.max(16, player.y));
  }

  handleMove(wsId, x, y) {
    const player = this.players.get(wsId);
    if (!player) return null;
    x = Math.max(0, Math.min(this.width, x));
    y = Math.max(0, Math.min(this.height, y));
    // v4.3.6：直接設置位置（技術文檔第一階段：先不用插值，確保基本同步）
    player.x = x;
    player.y = y;
    player.moveTarget = null;
    player.state = 'walk';
    player.lastMoveTime = Date.now();
    this._separatePlayer(player); // v4.4.19：落地即分離，避免點擊穿人
    return player;
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
        // v4.2.0：ai-engine 的 tick 是全域驅動，不帶參數
        this.aiEngine.tick();
      } catch (e) {
        // AI tick 錯誤不影響主循環
      }
    }

    // v4.5.0：怪物伺服端權威移動/重生，並鏡像進 entities（在 aiEngine.tick 之後）
    try {
      this._syncMonsters(dt);
    } catch (e) {}

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

    // v4.4.19：移動插值後統一做單位分離，行走過程也不重疊（玩家間對稱互推、玩家避開 AI）
    for (const player of this.players.values()) {
      this._separatePlayer(player);
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
      if (!player._lastSent) player._lastSent = new Map(); // entityId -> {fp, t}

      for (const entity of this.entities.values()) {
        try {
        if (entity.id === player.id) continue;
        // v4.5.0 防禦：跳過座標不完整的殘留實體，避免 NaN/undefined 傳播
        if (!entity || typeof entity.x !== 'number' || typeof entity.y !== 'number' ||
            !isFinite(entity.x) || !isFinite(entity.y) ||
            typeof player.x !== 'number' || typeof player.y !== 'number') continue;
        checkedCount++;
        let ser;
        try { ser = this._serializeEntity(entity); } catch (e) { continue; }
        const dist = Math.hypot(entity.x - player.x, entity.y - player.y);
        const alreadySeen = player.seenEntities.has(entity.id);
        // v4.4.22 AOI 遲滯：在 800 內才 enter；已見者在 900 內仍保持可見，避免邊界抖動
        const visibleNow = (dist <= AOI_RADIUS) || (alreadySeen && dist <= AOI_LEAVE_RADIUS);
        if (visibleNow) {
          visibleIds.add(entity.id);
          // v4.4.22 降載：指紋用量子化座標（過濾巡邏抖動），hp/state 變更仍即時；
          //  怪物/AI 移動另加時間門檻；aoi_update 只送動態欄位（id/x/y/hp/maxHp/state/dir）。
          if (player.seenEntities.has(entity.id)) {
            const qx = Math.round(ser.x / MOVE_QUANTUM_PX) * MOVE_QUANTUM_PX;
            const qy = Math.round(ser.y / MOVE_QUANTUM_PX) * MOVE_QUANTUM_PX;
            const fp = qx + '|' + qy + '|' + ser.hp + '|' + ser.maxHp + '|' + ser.state + '|' + (ser.dir || '');
            const last = player._lastSent.get(entity.id);
            const fpChanged = !last || last.fp !== fp;
            const now = Date.now();
            let include = fpChanged;
            if (!include && (entity.kind === 'monster' || entity.kind === 'ai')) {
              if (!last || (now - (last.t || 0)) >= MONSTER_MOVE_BC_MS) include = true;
            }
            if (include) {
              // 只送動態欄位（client 已有 enter 時的完整實體，依 id merge）
              moveEntities.push({
                id: ser.id, x: ser.x, y: ser.y, hp: ser.hp,
                maxHp: ser.maxHp, state: ser.state, dir: ser.dir,
              });
              player._lastSent.set(entity.id, { fp, t: now });
            }
          } else {
            enterEntities.push(ser);
            player._lastSent.set(entity.id, {
              fp: ser.x + '|' + ser.y + '|' + ser.hp + '|' + ser.maxHp + '|' + ser.state + '|' + (ser.dir || ''),
              t: Date.now(),
            });
          }
        }
        } catch (e) {
          console.error('[BC-ERR] entity=' + (entity && entity.id) + ' err=' + e.message);
        }
      }

      const leaveIds = [];
      for (const oldId of player.seenEntities) {
        if (!visibleIds.has(oldId)) {
          leaveIds.push(oldId);
          player._lastSent.delete(oldId);
        }
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
      // v4.5.0：擴充怪物/NPC 辨識（玩家/AI 為 null）
      type: e.type || null,       // 怪物=monster type key；NPC=npcId；玩家/ai 空
      npcType: e.npcType || null, // NPC 細類（選用）
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
    // v4.2.0：AI初始化失敗不應阻擋玩家加入
    if (aiConfig && aiConfig.aiCount != null) {
      try {
        zone.ensureAIEngine(
          parseInt(aiConfig.aiCount) || 8,
          parseInt(aiConfig.initLevel) || 1
        );
      } catch(e) {
        console.warn('[GameWorld] ensureAIEngine 失敗（不影響玩家加入）:', e.message);
        _diagLog('[GameWorld-AOI] ⚠️ ensureAIEngine失敗 mapId=' + mapId + ' 錯誤=' + e.message + '（玩家仍會加入）');
      }
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
    if (!zone) return null;
    return zone.handleMove(wsId, x, y);
  }
  
  // v4.3.7：根據wsId獲取玩家
  getPlayerByWsId(mapId, wsId) {
    const zone = this.zones.get(mapId);
    if (!zone) return null;
    return zone.players.get(wsId) || null;
  }
  
  // v4.3.7：根據playerId獲取玩家
  getPlayerById(mapId, playerId) {
    const zone = this.zones.get(mapId);
    if (!zone) return null;
    for (const p of zone.players.values()) {
      if (p.id === playerId) return p;
    }
    return null;
  }

  // v4.5.0：依實體 id 取得任一實體（玩家/AI/怪物/NPC）
  getEntityById(mapId, entityId) {
    const zone = this.zones.get(mapId);
    if (!zone) return null;
    return zone.entities.get(entityId) || null;
  }

  // v4.5.0：攻擊怪物後立即同步怪物狀態並觸發 AOI 廣播（降低延遲）
  syncMonstersNow(mapId) {
    const zone = this.zones.get(mapId);
    if (!zone) return;
    try { zone._syncMonsters(0); } catch(e) {}
    try { zone._broadcastAOI(); } catch(e) {}
  }

  // v4.5.0：玩家攻擊怪物（權威）。必須用 zone 自己的 aiEngine 實例
  //  （怪物由該 engine 生成/持有；ws-server 另有獨立 engine 實例，不可混用）
  //  attacker 為玩家實體；回傳 damageMonster 結果或 null（無效目標）
  playerAttackMonster(mapId, attacker, targetEntityId) {
    const zone = this.zones.get(mapId);
    if (!zone || !attacker) return null;
    const target = zone.entities.get(targetEntityId);
    if (!target || target.kind !== 'monster') return null;
    if (!zone.aiEngine || typeof zone.aiEngine.damageMonster !== 'function') return null;
    const AOI_R = AOI_RADIUS;
    const dist = Math.hypot(attacker.x - target.x, attacker.y - target.y);
    if (dist > AOI_R) return { error: 'out_of_range' };
    const baseAtk = computePlayerAtk(attacker.classId, attacker.level);
    const r = zone.aiEngine.damageMonster(this.serverId, mapId, target.monsterUid, baseAtk, { id: attacker.id, name: attacker.name });
    // 同步怪物 hp/state 並經 aoi_update 廣播給附近所有人
    try { zone._syncMonsters(0); } catch(e) {}
    try { zone._broadcastAOI(); } catch(e) {}
    return r;
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
    // v4.2.5：隨機出生點（10個隨機點）
    let _targetSpawnX, _targetSpawnY;
    if (targetX != null && targetY != null) {
      _targetSpawnX = targetX;
      _targetSpawnY = targetY;
    } else {
      const _baseX = targetConfig.spawn?.x || 400;
      const _baseY = targetConfig.spawn?.y || 400;
      const _spawns = [];
      for (let i = 0; i < 10; i++) {
        _spawns.push({
          x: Math.max(50, Math.min(targetConfig.width - 50, Math.round(_baseX + (Math.random() - 0.5) * 200))),
          y: Math.max(50, Math.min(targetConfig.height - 50, Math.round(_baseY + (Math.random() - 0.5) * 200))),
        });
      }
      const _chosen = _spawns[Math.floor(Math.random() * _spawns.length)];
      _targetSpawnX = _chosen.x;
      _targetSpawnY = _chosen.y;
    }
    const playerData = {
      account: player.account,
      name: player.name,
      classId: player.classId,
      level: player.level,
      x: _targetSpawnX,
      y: _targetSpawnY,
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
      // v4.4.20：無玩家的地圖直接凍結，不跑 AI / 尋路 / 怪物 / AOI，
      //  避免 17 張地圖每 100ms 全數空轉，顯著降低伺服器 CPU 與手機端同步負擔。
      //  玩家進入時 playerJoin/playerChangeMap 會 ensureAIEngine 並恢復。
      if (!zone.players || zone.players.size === 0) continue;
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
  if (!gw) return null;
  return gw.playerMove(mapId, wsId, x, y);
}

function getPlayerByWsId(serverId, mapId, wsId) {
  const gw = gameWorlds.get(serverId);
  if (!gw) return null;
  return gw.getPlayerByWsId(mapId, wsId);
}

function getPlayerById(serverId, mapId, playerId) {
  const gw = gameWorlds.get(serverId);
  if (!gw) return null;
  return gw.getPlayerById(mapId, playerId);
}

// v4.5.0：依實體 id 取得實體（攻擊怪物路由用）
function getEntityById(serverId, mapId, entityId) {
  const gw = gameWorlds.get(serverId);
  if (!gw) return null;
  return gw.getEntityById(mapId, entityId);
}

// v4.5.0：攻擊怪物後立即同步並廣播
function syncMonstersNow(serverId, mapId) {
  const gw = gameWorlds.get(serverId);
  if (!gw) return;
  gw.syncMonstersNow(mapId);
}

// v4.5.0：玩家攻擊怪物（由 ws-server 呼叫，傳入攻擊者實體）
function playerAttackMonster(serverId, mapId, attacker, targetEntityId) {
  const gw = gameWorlds.get(serverId);
  if (!gw) return null;
  return gw.playerAttackMonster(mapId, attacker, targetEntityId);
}

// v4.5.0：玩家基礎攻擊力（伺服端權威計算，與 ai-engine calcBaseStats 同源，確保兩端一致）
//  classId+level 決定 atk，外加等級微幅成長；預設 warrior/1 ≈ 8
function computePlayerAtk(classId, level) {
  try {
    const s = calcBaseStats(classId || 'warrior', Math.max(1, level || 1));
    return s.atk;
  } catch (e) {
    return 8;
  }
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
  getPlayerByWsId,
  getPlayerById,
  getEntityById,
  syncMonstersNow,
  playerAttackMonster,
  computePlayerAtk,
  startTick,
  getStats,
  AOI_RADIUS,
  TICK_INTERVAL_MS,
  loadMapConfigs,
  Zone,
  GameWorld,
};

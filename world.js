/**
 * world.js — 世界狀態管理
 * 職責：玩家、地圖頻道(Channel)、AOI附近實體廣播
 * 設計：記憶體運作（MVP），介面刻意做成與未來 Redis/Postgres 可替換。
 */

const MAX_PER_CHANNEL = parseInt(process.env.MAX_PER_CHANNEL || '60', 10);

// 你的遊戲地圖清單（與 game.js 的 map 對應）；bot 會在這些地圖出沒
const MAP_IDS = [
  'village', 'forest', 'cave_dungeon', 'door', 'castle',
  'desert', 'battlefield', 'volversis', 'hell', 'bridge',
  'volvul', 'tower_jingle'
];

class World {
  constructor(io) {
    this.io = io;
    /** @type {Map<string, Player>} socketId -> player */
    this.players = new Map();
    /** @type {Map<string, Set<string>>} "mapId:channel" -> socketIds */
    this.channels = new Map();
    /** @type {Map<string, any>} 怪物/掉落等伺服器託管實體（MVP先留空間） */
    this.entities = new Map();
  }

  _key(mapId, channel) { return `${mapId}:${channel}`; }

  /** 加入一個地圖頻道；自動分流，回傳實際進入的 channel 編號 */
  joinChannel(player, mapId, preferred = 0) {
    this.leaveChannel(player);
    let channel = preferred;
    // 自動找一個還沒滿的頻道
    for (let c = preferred; c < 20; c++) {
      const set = this.channels.get(this._key(mapId, c));
      if (!set || set.size < MAX_PER_CHANNEL) { channel = c; break; }
    }
    const key = this._key(mapId, channel);
    if (!this.channels.has(key)) this.channels.set(key, new Set());
    this.channels.get(key).add(player.id);
    player.mapId = mapId;
    player.channel = channel;
    return channel;
  }

  leaveChannel(player) {
    if (player.mapId == null) return;
    const key = this._key(player.mapId, player.channel);
    const set = this.channels.get(key);
    if (set) {
      set.delete(player.id);
      if (set.size === 0) this.channels.delete(key);
    }
  }

  addPlayer(player) { this.players.set(player.id, player); }
  removePlayer(id) {
    const p = this.players.get(id);
    if (p) { this.leaveChannel(p); this.players.delete(id); }
    return p;
  }
  getPlayer(id) { return this.players.get(id); }

  /** 移動並做最基本的伺服器端驗證（速度上限、邊界） */
  movePlayer(id, x, y) {
    const p = this.players.get(id);
    if (!p) return false;
    if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) return false;
    // 邊界（世界2048）
    x = Math.max(0, Math.min(2048, x));
    y = Math.max(0, Math.min(2048, y));
    // 防瞬移：單次位移上限（10Hz下，速度外掛也拉不開）
    if (p.x != null) {
      const dx = x - p.x, dy = y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 200) return false; // 單封包超過200世界單位視為瞬移（容許網路延遲）
    }
    p.x = x; p.y = y; p.moving = true;
    return true;
  }

  /** 取得某玩家所在頻道的所有玩家（含自己標記用） */
  channelMates(player) {
    const set = this.channels.get(this._key(player.mapId, player.channel));
    if (!set) return [];
    return [...set].map(id => this.players.get(id)).filter(Boolean);
  }

  /** 10Hz 對每個頻道廣播快照（附近實體清單） */
  broadcastTick() {
    for (const [key, set] of this.channels) {
      const mates = [...set].map(id => this.players.get(id)).filter(Boolean);
      if (mates.length === 0) continue;
      // 輕量序列化（只帶客戶端渲染需要的欄位）
      const list = mates.map(p => ({
        id: p.id, name: p.name, class: p.class, level: p.level,
        x: Math.round(p.x), y: Math.round(p.y),
        dir: p.dir || 1, moving: !!p.moving,
        transform: p.transform || null, country: p.country || null,
        isBot: !!p.isBot
      }));
      const [mapId, ch] = key.split(':');
      // 合併伺服器託管怪物（由 combat.js 註冊 provider）
      let monsters = [];
      if (typeof this.monsterProvider === 'function') {
        monsters = this.monsterProvider(mapId) || [];
      }
      this.io.to(`chan:${key}`).emit('map_state', {
        mapId, channel: Number(ch), entities: list, monsters, ts: Date.now()
      });
      mates.forEach(p => { p.moving = false; });
    }
  }

  onlineCount() { return this.players.size; }
}

module.exports = { World, MAP_IDS, MAX_PER_CHANNEL };

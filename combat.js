/**
 * combat.js — 伺服器權威戰鬥（MVP）
 * 職責：
 *  - 怪物由伺服器生成、託管，所有玩家看到同一隻、同血量
 *  - 玩家攻擊 -> 伺服器驗證距離/冷卻 -> 算傷害 -> 廣播血量/死亡
 *  - 死亡 -> 經驗/金幣/掉落歸攻擊者 -> 排程重生
 * 傷害公式先給通用版，正式版把你的 game.js 公式搬進 calcDamage() 即可。
 */

// 各地圖怪物表（等級、強度）。正式版對齊你的 game.js 怪物資料。
const MONSTER_TABLE = {
  village:     [{ type:'slime',  name:'史萊姆', lv:1,  hp:60,  atk:6,  exp:12,  gold:[5,15] }],
  forest:      [{ type:'wolf',   name:'野狼',   lv:5,  hp:160, atk:14, exp:30,  gold:[15,40] },
                { type:'goblin', name:'哥布林', lv:7,  hp:220, atk:18, exp:42,  gold:[20,55] }],
  cave_dungeon:[{ type:'skeleton',name:'骷髏兵', lv:12, hp:420, atk:30, exp:80,  gold:[40,90] }],
  desert:      [{ type:'scorpion',name:'沙蠍',   lv:18, hp:700, atk:48, exp:140, gold:[70,150] }],
  castle:      [{ type:'guard',  name:'禁衛軍',  lv:25, hp:1100,atk:70, exp:240, gold:[120,260] }],
  hell:        [{ type:'demon',  name:'惡魔',    lv:35, hp:2000,atk:110,exp:500, gold:[250,500] }]
};
const DEFAULT_MONSTER = { type:'rogue', name:'流浪怪', lv:3, hp:100, atk:9, exp:20, gold:[8,25] };
const RESPAWN_MS = 8000;       // 重生時間
const ATTACK_RANGE = 170;      // 攻擊距離（世界單位）
const ATTACK_CD_MS = 900;      // 攻擊冷卻
const DROP_RATE = 0.18;        // 道具掉落率

function rand(a,b){ return a + Math.random()*(b-a); }
function randInt(a,b){ return Math.floor(rand(a,b+1)); }

class CombatManager {
  constructor(world, io) {
    this.world = world; this.io = io;
    /** @type {Map<string, any>} monsterId -> monster */
    this.monsters = new Map();
    this.lastAttack = new Map(); // playerId -> ts
    this._seq = 0;
    this._spawnAll();
    // 註冊給 world 廣播用
    world.monsterProvider = (mapId) => this.monstersOf(mapId);
    // 怪物回血/重生迴圈（5Hz）
    this.timer = setInterval(()=>this._tick(), 200);
  }

  _newId(){ return 'm_' + (++this._seq) + '_' + Math.random().toString(36).slice(2,6); }

  _spawnAll() {
    for (const [mapId, list] of Object.entries(MONSTER_TABLE)) {
      // 每張地圖放 6 隻（隨機選表中種類）
      for (let i=0;i<6;i++) this._spawnOne(mapId);
    }
  }

  _spawnOne(mapId) {
    const list = MONSTER_TABLE[mapId] || [DEFAULT_MONSTER];
    const tpl = list[Math.floor(Math.random()*list.length)];
    const m = {
      id: this._newId(), mapId,
      type: tpl.type, name: tpl.name, level: tpl.lv,
      x: Math.round(350 + Math.random()*1300),
      y: Math.round(350 + Math.random()*1300),
      hp: tpl.hp, maxHp: tpl.hp, atk: tpl.atk,
      exp: tpl.exp, gold: tpl.gold,
      alive: true, respawnAt: 0
    };
    this.monsters.set(m.id, m);
    return m;
  }

  monstersOf(mapId) {
    const out = [];
    for (const m of this.monsters.values()) {
      if (m.mapId === mapId && m.alive) {
        out.push({ id:m.id, type:m.type, name:m.name, level:m.level,
          x:m.x, y:m.y, hp:Math.max(0,m.hp), maxHp:m.maxHp });
      }
    }
    return out;
  }

  _tick() {
    const now = Date.now();
    for (const m of this.monsters.values()) {
      if (!m.alive && now >= m.respawnAt) {
        // 重生：換位置、回滿血
        m.alive = true;
        m.hp = m.maxHp;
        m.x = Math.round(350 + Math.random()*1300);
        m.y = Math.round(350 + Math.random()*1300);
        this._room(m.mapId).emit('monster_respawn', { id:m.id, x:m.x, y:m.y, hp:m.hp, maxHp:m.maxHp });
      }
    }
  }

  _room(mapId){
    // 怪物全頻道可見（MVP）；正式可依頻道分流
    const room = this.io;
    return { emit:(ev,data)=>{
      for (const [k,set] of this.world.channels) if (k.startsWith(mapId+':')) this.io.to('chan:'+k).emit(ev,data);
    }};
  }

  /** 玩家攻擊怪物 —— 伺服器權威判定 */
  attackMonster(player, monsterId, skillId='basic') {
    const m = this.monsters.get(monsterId);
    if (!m || !m.alive || m.mapId !== player.mapId) return { ok:false, error:'invalid_target' };

    // 冷卻
    const now = Date.now();
    const last = this.lastAttack.get(player.id) || 0;
    if (now - last < ATTACK_CD_MS) return { ok:false, error:'cooldown' };

    // 距離驗證（玩家位置以伺服器狀態為準）
    const dist = Math.hypot(player.x - m.x, player.y - m.y);
    if (dist > ATTACK_RANGE) return { ok:false, error:'out_of_range', dist:Math.round(dist) };
    this.lastAttack.set(player.id, now);

    // 傷害（通用公式；正式版換成你的素質/技能公式）
    const { dmg, crit } = this.calcDamage(player, m, skillId);
    m.hp -= dmg;

    const payload = { monsterId, hp:Math.max(0,m.hp), maxHp:m.maxHp, dmg, crit, by:player.id, byName:player.name };
    this._broadcastMap(player.mapId, 'monster_damage', payload);

    // 死亡
    if (m.hp <= 0) {
      m.alive = false;
      m.respawnAt = now + RESPAWN_MS;
      const gold = randInt(m.gold[0], m.gold[1]);
      const drop = Math.random() < DROP_RATE ? this._rollDrop(m.level) : null;
      const result = {
        monsterId, killerId:player.id, killerName:player.name,
        exp:m.exp, gold, drop, x:m.x, y:m.y
      };
      this._broadcastMap(player.mapId, 'monster_killed', result);
      // 只告訴攻擊者他獲得什麼（真玩家 id === socket.id，會進自己的私人房間）
      if (!player.isBot) this.io.to(player.id).emit('gain_reward', { exp:m.exp, gold, drop });
      return { ok:true, killed:true, exp:m.exp, gold, drop };
    }
    return { ok:true, dmg, hp:m.hp, crit };
  }

  _socketOf(player){ return player.socketId || player.id; }

  calcDamage(player, monster, skillId) {
    const base = (player.level||1) * 8 + (skillId!=='basic'?45:18);
    const variance = 0.85 + Math.random()*0.3;
    let dmg = Math.round(base * variance);
    const crit = Math.random() < 0.18;
    if (crit) dmg = Math.round(dmg * 1.8);
    return { dmg, crit };
  }

  _rollDrop(level) {
    const pool = ['equip_sword','equip_helm','equip_armor','scroll_enchant','potion_hp'];
    const itemId = pool[Math.floor(Math.random()*pool.length)];
    return { itemId, qty:1 };
  }

  _broadcastMap(mapId, ev, data){
    for (const [k] of this.world.channels) if (k.startsWith(mapId+':')) this.io.to('chan:'+k).emit(ev,data);
  }

  stop(){ clearInterval(this.timer); }
}

module.exports = { CombatManager, MONSTER_TABLE };

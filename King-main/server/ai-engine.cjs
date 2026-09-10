/*
 * v2.8.0：單一伺服器權威 AI 行為引擎
 * 功能：主動打怪 / 獲經驗升級 / 隨等級換圖 / 國家貢獻 / 敵對玩家PvP / AI互毆 / 死亡重生 / 喝藥
 * 所有 AI 行為由伺服器 tick 驅動，客戶端僅渲染
 */

'use strict';

// ===== 地圖階層（AI 升級後自動換圖的路徑） =====
const MAP_TIERS = [
  { map: 'village',           levelMin: 1,  levelMax: 1,  safe: true  },
  { map: 'gludin_field',      levelMin: 1,  levelMax: 5,  safe: false },
  { map: 'dark_forest',       levelMin: 5,  levelMax: 15, safe: false },
  { map: 'graveyard',         levelMin: 15, levelMax: 30, safe: false },
  { map: 'red_desert',        levelMin: 30, levelMax: 50, safe: false },
  { map: 'dark_cave',         levelMin: 50, levelMax: 70, safe: false },
  { map: 'dragon_lair',       levelMin: 65, levelMax: 85, safe: false },
];

// 中文名詞庫（2~6字，正常玩家風格）
const AI_SURNAMES = ['劍','夜','楓','蕭','凌','風','雲','雷','龍','虎','鳳','月','星','寒','墨','玉','金','銀','赤','青','紫','白','黑','孤','狂','浪','俠','夢','殤','霜'];
const AI_GIVEN1 = ['影','闌','林','無','痕','雪','塵','鋒','寒','月','辰','星','雨','霄','凡','清','玄','蒼','玉','靈','魂','斷','絕','飛','翔','鳴','嘯','破','滅'];
const AI_GIVEN2 = ['無痕','晚','殤','雪','塵','風','寒','月','辰','星','霄','凡','清','玄','蒼','玉','靈','魂','飛','翔','鳴','嘯','破','滅','影','闌','林','鋒','雨'];

function generateChineseName(rng) {
  // 2~4 字中文名，隨機長度
  const len = 2 + Math.floor(rng() * 3); // 2, 3, 4
  const surname = AI_SURNAMES[Math.floor(rng() * AI_SURNAMES.length)];
  if (len === 2) {
    return surname + AI_GIVEN1[Math.floor(rng() * AI_GIVEN1.length)];
  } else if (len === 3) {
    return surname + AI_GIVEN2[Math.floor(rng() * AI_GIVEN2.length)];
  } else {
    // 4字：姓 + 雙字名
    const g1 = AI_GIVEN1[Math.floor(rng() * AI_GIVEN1.length)];
    const g2 = AI_GIVEN2[Math.floor(rng() * AI_GIVEN2.length)];
    return surname + g1 + g2;
  }
}

// 國家列表
const NATIONS = ['liang', 'wei', 'shu', 'wu', 'qun'];

// 職業
const CLASSES = ['warrior', 'mage', 'archer', 'rogue', 'paladin', 'warlock'];

// 職業基礎屬性
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

// ===== 偽隨機 =====
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

// ===== 生成單一 AI =====
function generateAI(serverId, mapId, idx, initLevel) {
  const rng = seededRandom(`${serverId}:${mapId}:ai:${idx}:v280`);
  const classId = CLASSES[Math.floor(rng() * CLASSES.length)];
  // v2.8.0：正常中文名（非·AI後綴）
  const name = generateChineseName(rng);
  const nation = NATIONS[Math.floor(rng() * NATIONS.length)];
  const level = Math.max(1, Math.floor(initLevel + Math.floor(rng() * 3)));
  const x = Math.floor(200 + rng() * 1600);
  const y = Math.floor(200 + rng() * 1000);
  const stats = calcBaseStats(classId, level);
  const dirs = ['up', 'down', 'left', 'right'];
  const dir = dirs[Math.floor(rng() * 4)];
  return {
    id: `ai_${serverId}_${mapId}_${idx + 1}`,
    uid: `ai_${serverId}_${mapId}_${idx + 1}`,
    name,
    classId,
    level,
    nation,
    x, y, dir,
    facing: rng() > 0.5 ? 'right' : 'left',
    hp: stats.hpMax,
    hpMax: stats.hpMax,
    maxHp: stats.hpMax,
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
    attackInterval: 1.2 + rng() * 0.4,
    dead: false,
    respawnTimer: 0,
    restTimer: 0,
    potions: { hp: 3 + Math.floor(rng() * 2), mp: 2 },
    kills: 0,
    contribution: 0,
    guildId: null,
    power: 0,
    title: '',
    // v2.8.0 新增
    contributionTimer: 30 + rng() * 30, // 首次貢獻計時
    hpPotionCooldown: 0,
    moveTargetMap: null, // 換圖目標
    createdAt: Date.now(),
  };
}

// ===== 怪物定義（伺服器端精簡版，給 AI 打） =====
// 每張圖的怪物由 AI 引擎自己生成並 tick
function createMonster(monsterType, level, mapId, idx) {
  const rng = seededRandom(`${mapId}:monster:${monsterType}:${idx}`);
  const baseHp = 20 + level * 12;
  const baseAtk = 3 + level * 1.8;
  const baseDef = 1 + level * 0.8;
  return {
    id: `mon_${mapId}_${monsterType}_${idx}`,
    uid: `mon_${mapId}_${monsterType}_${idx}`,
    type: monsterType,
    name: monsterType,
    level,
    hp: baseHp,
    hpMax: baseHp,
    maxHp: baseHp,
    atk: baseAtk,
    def: baseDef,
    speed: 30 + level * 0.5,
    x: 200 + Math.floor(rng() * 1600),
    y: 200 + Math.floor(rng() * 1000),
    dead: false,
    respawnTimer: 0,
    attackCooldown: 0,
    targetUid: null,
    state: 'idle',
  };
}

// ===== AI 引擎工廠 =====
function createAIEngine(options = {}) {
  const WORLD_W = options.worldW || 2000;
  const WORLD_H = options.worldH || 1400;
  const TICK_INTERVAL = options.tickInterval || 200; // ms
  const BROADCAST_INTERVAL = options.broadcastInterval || 200; // ms

  // 狀態：key = "serverId:mapId"
  const aiStates = new Map();
  const monsterStates = new Map(); // 伺服器端怪物（AI 打）
  const broadcastTimes = new Map();

  // 回調
  let onAIChange = null;      // (serverId, mapId, aiList) => void
  let onMonsterChange = null; // (serverId, mapId, monsterList) => void
  let onAIAttack = null;      // (serverId, mapId, ai, targetId, damage) => void
  let onAIKilled = null;      // (serverId, mapId, ai, killer) => void
  let onMonsterKilled = null; // (serverId, mapId, monster, ai) => void
  let onContribution = null;  // (serverId, nation, amount, aiName) => void
  let onAIMapChange = null;   // (serverId, oldMapId, newMapId, ai) => void
  let getMapPlayers = null;   // (serverId, mapId) => Map(playerId, {x,y,hp,nation,...})

  function mapKey(s, m) { return s + ':' + m; }

  function getAIState(s, m) {
    const k = mapKey(s, m);
    if (!aiStates.has(k)) aiStates.set(k, new Map());
    return aiStates.get(k);
  }

  function getMonsterState(s, m) {
    const k = mapKey(s, m);
    if (!monsterStates.has(k)) monsterStates.set(k, new Map());
    return monsterStates.get(k);
  }

  // ===== 確保地圖有怪物（AI 首次進入時自動生成）=====
  // v2.8.1：怪物類型按地圖等級階層匹配，全部類型與客戶端 MONSTER_SPRITES 一致
  const monstersSpawned = new Set(); // 已生成怪物的地圖 key
  function ensureMonsters(serverId, mapId) {
    const k = mapKey(serverId, mapId);
    if (monstersSpawned.has(k)) return;
    monstersSpawned.add(k);
    const monsterState = getMonsterState(serverId, mapId);
    // 找出此圖的等級區間
    const tier = MAP_TIERS.find(t => t.map === mapId) || MAP_TIERS[1];
    const baseLv = Math.max(1, tier.levelMin);
    // 按等級選怪物類型池（與客戶端 MONSTER_SPRITES 完全對應，避免顯示 ?）
    let typePool;
    if (baseLv <= 2) typePool = ['slime', 'wolf', 'goblin'];
    else if (baseLv <= 5) typePool = ['goblin', 'skeleton', 'wolf', 'bat'];
    else if (baseLv <= 15) typePool = ['goblin', 'skeleton', 'orc', 'spider', 'shaman', 'lizardman'];
    else if (baseLv <= 30) typePool = ['skeleton', 'orc', 'zombie', 'ghost', 'lizardman', 'ogre'];
    else if (baseLv <= 50) typePool = ['orc', 'scorpion', 'stone_golem', 'ogre', 'lizardman', 'bandit'];
    else if (baseLv <= 70) typePool = ['stone_golem', 'troll', 'demon', 'darkmage', 'ogre'];
    else typePool = ['dragon', 'bone_dragon', 'demon', 'troll', 'hydra', 'lich'];
    // 生成 15 隻怪，等級圍繞 baseLv 浮動
    const count = 15;
    for (let i = 0; i < count; i++) {
      const typeIdx = Math.floor(Math.random() * typePool.length);
      const lv = Math.max(1, baseLv + Math.floor(Math.random() * 4) - 1);
      const mon = createMonster(typePool[typeIdx], lv, mapId, i + Math.floor(Math.random() * 10000));
      monsterState.set(mon.id, mon);
    }
  }

  function dist2(x1, y1, x2, y2) {
    const dx = x1 - x2, dy = y1 - y2;
    return dx * dx + dy * dy;
  }

  // ===== 根據等級找適合地圖 =====
  function findMapForLevel(level, currentMap) {
    // 找 level 落在 [levelMin, levelMax) 區間的戰鬥圖
    let best = null;
    for (const t of MAP_TIERS) {
      if (t.safe) continue;
      if (level >= t.levelMin && level < t.levelMax) {
        best = t.map;
        break;
      }
    }
    if (!best) {
      // 超出最高級圖，留在最高級
      best = MAP_TIERS[MAP_TIERS.length - 1].map;
    }
    return best;
  }

  // ===== AI 換圖 =====
  function moveAIToMap(ai, oldMapId, newMapId, serverId) {
    const oldKey = mapKey(serverId, oldMapId);
    const newKey = mapKey(serverId, newMapId);
    const oldState = aiStates.get(oldKey);
    if (oldState) oldState.delete(ai.id);

    ai.mapId = newMapId;
    ai.x = 300 + Math.random() * 400;
    ai.y = 300 + Math.random() * 400;
    ai.state = 'wandering';
    ai.targetUid = null;
    ai.wanderTimer = 2 + Math.random() * 3;

    const newState = getAIState(serverId, newMapId);
    newState.set(ai.id, ai);

    if (onAIMapChange) {
      try { onAIMapChange(serverId, oldMapId, newMapId, ai); } catch(e) {}
    }
    // 觸發兩張圖的廣播
    triggerBroadcast(serverId, oldMapId);
    triggerBroadcast(serverId, newMapId);
  }

  // ===== 升級檢查 =====
  function checkLevelUp(ai, serverId, mapId) {
    let leveled = false;
    while (ai.exp >= ai.expMax) {
      ai.exp -= ai.expMax;
      ai.level++;
      ai.expMax = Math.floor(ai.expMax * 1.3);
      const stats = calcBaseStats(ai.classId, ai.level);
      ai.hpMax = stats.hpMax;
      ai.hp = ai.hpMax;
      ai.atk = stats.atk;
      ai.def = stats.def;
      ai.speed = stats.speed;
      leveled = true;
    }
    // 升級後檢查是否該換圖
    if (leveled) {
      const targetMap = findMapForLevel(ai.level, mapId);
      if (targetMap !== mapId) {
        // 小概率觸發換圖（不是每級都換，避免過於頻繁）
        if (Math.random() < 0.3) {
          moveAIToMap(ai, mapId, targetMap, serverId);
          return true; // AI 已不在此圖
        }
      }
    }
    return false;
  }

  // ===== 國家貢獻 =====
  function addContribution(ai, serverId) {
    const amount = Math.floor(10 + ai.level * 2 + Math.random() * 20);
    ai.contribution += amount;
    ai.gold = Math.max(0, ai.gold - Math.floor(amount * 0.5));
    if (onContribution) {
      try { onContribution(serverId, ai.nation, amount, ai.name); } catch(e) {}
    }
  }

  // ===== 觸發廣播 =====
  function triggerBroadcast(serverId, mapId) {
    if (!onAIChange) return;
    const aiState = getAIState(serverId, mapId);
    try { onAIChange(serverId, mapId, Array.from(aiState.values())); } catch(e) {}
  }

  // ===== AI 攻擊怪物 =====
  function aiAttackMonster(ai, monster, serverId, mapId) {
    const dmg = Math.max(1, Math.floor(ai.atk * (0.9 + Math.random() * 0.2) - monster.def * 0.5));
    monster.hp = Math.max(0, monster.hp - dmg);
    if (monster.hp <= 0 && !monster.dead) {
      monster.dead = true;
      monster.respawnTimer = 0;
      ai.kills++;
      const expGain = Math.floor(monster.level * 8 + 20);
      const goldGain = Math.floor(monster.level * 3 + 5 + Math.random() * 10);
      ai.exp += expGain;
      ai.gold += goldGain;
      if (onMonsterKilled) {
        try { onMonsterKilled(serverId, mapId, monster, ai, expGain, goldGain); } catch(e) {}
      }
      // 升級 + 換圖檢查
      const moved = checkLevelUp(ai, serverId, mapId);
      if (moved) return; // AI 已換圖
    }
  }

  // ===== 怪物攻擊 AI =====
  function monsterAttackAI(monster, ai) {
    if (monster.attackCooldown > 0) return;
    monster.attackCooldown = 1.2 + Math.random() * 0.4;
    const dmg = Math.max(1, Math.floor(monster.atk * (0.9 + Math.random() * 0.2) - ai.def * 0.4));
    ai.hp = Math.max(0, ai.hp - dmg);
    if (ai.hp <= 0 && !ai.dead) {
      ai.dead = true;
      ai.state = 'dead';
      ai.respawnTimer = 0;
      if (onAIKilled) {
        try { onAIKilled(ai.serverId, ai.mapId, ai, { name: monster.name, type: 'monster' }); } catch(e) {}
      }
    }
  }

  // ===== AI 喝藥 =====
  function tryDrinkPotion(ai) {
    if (ai.hpPotionCooldown > 0) return false;
    if (ai.hp / ai.hpMax > 0.35) return false; // 35% 以下才喝
    if ((ai.potions?.hp || 0) <= 0) return false;
    ai.potions.hp--;
    ai.hp = Math.min(ai.hpMax, ai.hp + Math.floor(ai.hpMax * 0.4));
    ai.hpPotionCooldown = 8; // 8秒CD
    return true;
  }

  // ===== 主要 tick =====
  let tickTimer = null;

  function start() {
    if (tickTimer) return;
    tickTimer = setInterval(tick, TICK_INTERVAL);
  }

  function stop() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  }

  function tick() {
    const dt = TICK_INTERVAL / 1000;

    for (const [key, aiState] of aiStates) {
      const [serverId, mapId] = key.split(':');
      const monsterState = getMonsterState(serverId, mapId);
      const players = getMapPlayers ? getMapPlayers(serverId, mapId) : new Map();
      let changed = false;

      // ===== 怪物重生 =====
      for (const mon of monsterState.values()) {
        if (mon.dead) {
          mon.respawnTimer += dt;
          if (mon.respawnTimer > 15 + Math.random() * 15) {
            mon.dead = false;
            mon.hp = mon.hpMax;
            mon.attackCooldown = 0;
            mon.targetUid = null;
            mon.x = 200 + Math.random() * 1600;
            mon.y = 200 + Math.random() * 1000;
            mon.state = 'idle';
          }
          continue;
        }
        if (mon.attackCooldown > 0) mon.attackCooldown -= dt;
      }

      // ===== AI 行為 =====
      for (const ai of aiState.values()) {
        // 死亡 & 重生
        if (ai.dead) {
          ai.respawnTimer += dt;
          if (ai.respawnTimer > 10 + Math.random() * 10) {
            ai.dead = false;
            ai.state = 'wandering';
            ai.hp = ai.hpMax;
            ai.attackCooldown = 0;
            ai.targetUid = null;
            ai.respawnTimer = 0;
            ai.x = 200 + Math.random() * 1600;
            ai.y = 200 + Math.random() * 1000;
            ai.potions = { hp: 3, mp: 2 };
            ai.hpPotionCooldown = 0;
            changed = true;
          }
          continue;
        }

        if (ai.attackCooldown > 0) ai.attackCooldown -= dt;
        if (ai.hpPotionCooldown > 0) ai.hpPotionCooldown -= dt;

        // 喝藥檢查
        tryDrinkPotion(ai);

        // ===== 國家貢獻（定期） =====
        ai.contributionTimer -= dt;
        if (ai.contributionTimer <= 0) {
          ai.contributionTimer = 60 + Math.random() * 60; // 60~120秒一次
          if (ai.gold > 20) {
            addContribution(ai, serverId);
          }
        }

        const atkRange = (ai.classId === 'archer' || ai.classId === 'mage' || ai.classId === 'warlock') ? 120 : 40;

        // ===== 優先級 1：玩家 PvP（敵對國家 + aggro 範圍） =====
        let nearestPlayer = null;
        let nearestPlayerDist2 = Infinity;
        const aggroRange = 200;
        for (const [pid, p] of players) {
          const px = p.x != null ? p.x : 400;
          const py = p.y != null ? p.y : 400;
          const hp = p.hp != null ? p.hp : 100;
          if (hp <= 0) continue;
          const pNation = p.nation || null;
          // 敵對國家才主動攻擊（無國家則都攻擊）
          if (pNation && pNation === ai.nation) continue;
          const d2 = dist2(ai.x, ai.y, px, py);
          if (d2 < aggroRange * aggroRange && d2 < nearestPlayerDist2) {
            nearestPlayerDist2 = d2;
            nearestPlayer = { id: pid, x: px, y: py, hp };
          }
        }

        // ===== 優先級 2：怪物 PvE =====
        let nearestMonster = null;
        let nearestMonsterDist2 = Infinity;
        if (!nearestPlayer) {
          const huntRange = 300; // 狩獵半徑
          for (const mon of monsterState.values()) {
            if (mon.dead) continue;
            // 只打等級相當的怪（±5級）
            if (Math.abs(mon.level - ai.level) > 8) continue;
            const d2 = dist2(ai.x, ai.y, mon.x, mon.y);
            if (d2 < huntRange * huntRange && d2 < nearestMonsterDist2) {
              nearestMonsterDist2 = d2;
              nearestMonster = mon;
            }
          }
        }

        // ===== 優先級 3：其他 AI（AI vs AI，低概率觸發） =====
        let nearestEnemyAI = null;
        let nearestEnemyAIDist = Infinity;
        if (!nearestPlayer && !nearestMonster && Math.random() < 0.015) {
          for (const other of aiState.values()) {
            if (other.id === ai.id || other.dead) continue;
            if (other.nation === ai.nation) continue;
            const d = Math.hypot(other.x - ai.x, other.y - ai.y);
            if (d < 180 && d < nearestEnemyAIDist) {
              nearestEnemyAIDist = d;
              nearestEnemyAI = other;
            }
          }
        }

        // ===== 行為決策 =====
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
            const dmg = Math.max(1, Math.floor(ai.atk * (0.9 + Math.random() * 0.2) * 0.5));
            if (onAIAttack) {
              try { onAIAttack(serverId, mapId, ai, nearestPlayer.id, dmg); } catch(e) {}
            }
          } else {
            ai.state = 'idle';
          }
          changed = true;
        } else if (nearestMonster) {
          // 打怪
          ai.targetUid = nearestMonster.id;
          const dx = nearestMonster.x - ai.x;
          const dy = nearestMonster.y - ai.y;
          const dist = Math.sqrt(nearestMonsterDist2);
          ai.facing = dx >= 0 ? 'right' : 'left';
          if (dist > atkRange) {
            ai.state = 'chasing';
            const moveDist = Math.min(dist - atkRange + 5, ai.speed * dt);
            ai.x += (dx / dist) * moveDist;
            ai.y += (dy / dist) * moveDist;
          } else if (ai.attackCooldown <= 0) {
            ai.state = 'attacking';
            ai.attackCooldown = ai.attackInterval;
            aiAttackMonster(ai, nearestMonster, serverId, mapId);
            // 怪物反擊
            if (!nearestMonster.dead) {
              monsterAttackAI(nearestMonster, ai);
            }
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
            if (!nearestEnemyAI.targetUid || Math.random() < 0.7) {
              nearestEnemyAI.targetUid = ai.id;
            }
            if (nearestEnemyAI.hp <= 0 && !nearestEnemyAI.dead) {
              nearestEnemyAI.dead = true;
              nearestEnemyAI.state = 'dead';
              nearestEnemyAI.respawnTimer = 0;
              ai.kills++;
              ai.gold += Math.floor(nearestEnemyAI.gold * 0.2);
              const expGain = Math.floor(nearestEnemyAI.level * 5 + 10);
              ai.exp += expGain;
              checkLevelUp(ai, serverId, mapId);
              if (onAIKilled) {
                try { onAIKilled(serverId, mapId, nearestEnemyAI, { name: ai.name, id: ai.id }); } catch(e) {}
              }
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
            ai.wanderTimer = 3 + Math.random() * 5;
            ai.targetX = 100 + Math.random() * (WORLD_W - 200);
            ai.targetY = 100 + Math.random() * (WORLD_H - 200);
          }
          const mdx = ai.targetX - ai.x;
          const mdy = ai.targetY - ai.y;
          const mdist = Math.hypot(mdx, mdy);
          if (mdist > 2) {
            const moveDist = Math.min(mdist, ai.speed * 0.6 * dt);
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
      const lastBc = broadcastTimes.get(key) || 0;
      if (changed && Date.now() - lastBc >= BROADCAST_INTERVAL) {
        broadcastTimes.set(key, Date.now());
        triggerBroadcast(serverId, mapId);
      }
    }
  }

  // ===== 外部 API =====
  return {
    generateAI,
    calcBaseStats,
    findMapForLevel,
    MAP_TIERS,

    getAIState,
    getMonsterState,

    // 回調設置
    set onAIChange(fn) { onAIChange = typeof fn === 'function' ? fn : null; },
    set onMonsterChange(fn) { onMonsterChange = typeof fn === 'function' ? fn : null; },
    set onAIAttack(fn) { onAIAttack = typeof fn === 'function' ? fn : null; },
    set onAIKilled(fn) { onAIKilled = typeof fn === 'function' ? fn : null; },
    set onMonsterKilled(fn) { onMonsterKilled = typeof fn === 'function' ? fn : null; },
    set onContribution(fn) { onContribution = typeof fn === 'function' ? fn : null; },
    set onAIMapChange(fn) { onAIMapChange = typeof fn === 'function' ? fn : null; },
    set getMapPlayers(fn) { getMapPlayers = typeof fn === 'function' ? fn : null; },

    // AI 管理
    adjustCount(serverId, mapId, targetCount, opts = {}) {
      const aiState = getAIState(serverId, mapId);
      targetCount = Math.max(0, Math.floor(targetCount));

      if (opts.forceReset) {
        aiState.clear();
        const initLv = opts.initLevel != null ? parseInt(opts.initLevel) : 1;
        for (let i = 0; i < targetCount; i++) {
          const ai = generateAI(serverId, mapId, i, initLv);
          aiState.set(ai.id, ai);
        }
        // v2.8.0：同時生成伺服器端怪物（給 AI 打，使其能升級）
        ensureMonsters(serverId, mapId);
        triggerBroadcast(serverId, mapId);
        return aiState.size;
      }

      const current = aiState.size;
      if (targetCount < current) {
        let toRemove = current - targetCount;
        const ids = Array.from(aiState.keys()).sort().reverse();
        for (const id of ids) {
          if (toRemove <= 0) break;
          aiState.delete(id);
          toRemove--;
        }
      } else if (targetCount > current) {
        const initLv = opts.initLevel != null ? parseInt(opts.initLevel) : 1;
        for (let i = current; i < targetCount; i++) {
          const ai = generateAI(serverId, mapId, i, initLv);
          aiState.set(ai.id, ai);
        }
        // v2.8.0：確保伺服器端怪物存在（AI 首次進入此圖時生成）
        ensureMonsters(serverId, mapId);
      }
      triggerBroadcast(serverId, mapId);
      return aiState.size;
    },

    getAIList(serverId, mapId) {
      return Array.from(getAIState(serverId, mapId).values());
    },
    // v2.8.1：取得指定 server 下所有有 AI 的地圖 id（給 GM 動態調 AI 數用）
    getAllMapKeys(serverId) {
      const result = [];
      for (const key of aiStates.keys()) {
        const [srv, map] = key.split(':');
        if (srv === serverId) result.push(map);
      }
      return result;
    },

    // 玩家攻擊 AI
    damageAI(serverId, mapId, aiId, damage, attackerInfo) {
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
        if (onAIKilled) {
          try { onAIKilled(serverId, mapId, ai, attackerInfo || { name: 'Player' }); } catch(e) {}
        }
        triggerBroadcast(serverId, mapId);
        return { dead: true, hp: 0, damage: actualDmg, killed, goldDrop, expDrop };
      }
      return { dead: false, hp: ai.hp, damage: actualDmg, killed: false };
    },

    start,
    stop,
    tick, // 手動觸發（測試用）
  };
}

module.exports = { createAIEngine, generateChineseName, MAP_TIERS, calcBaseStats };

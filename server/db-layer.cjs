/**
 * 資料存儲層（v2.3.0）
 *
 * 兩種後端，自動選擇：
 *   1. Postgres：當 process.env.DATABASE_URL 存在時啟用（線上部署 / 跨設備共享 / 重啟不丟失）
 *   2. JSON 檔案：預設離線模式（本機開發 / 無 DATABASE_URL 時）
 *
 * 用法：
 *   const db = require('./db-layer.cjs');
 *   await db.init();
 *   const acc = await db.getAccount(account);
 *   ...
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ==================== 後端選擇 ====================
let backend = 'json';
let pgPool = null;
let lastError = null;

// migrationsReady: schema 初始化完成的 promise
// 所有 pg 查詢函數進入前都 await 它，避免 bgInit 還在建表時請求進來報 relation does not exist
let _migrationsResolve = null;
const migrationsReady = new Promise(resolve => { _migrationsResolve = resolve; });
async function ensureSchema() {
  if (backend !== 'postgres') return;
  await migrationsReady;
}

async function init() {
  lastError = null;
  if (process.env.DATABASE_URL) {
    console.log('[DB] 偵測到 DATABASE_URL，嘗試連接 PostgreSQL...');
    // 嘗試載入 pg 模組（若未安裝，明確報錯並退回 JSON）
    let Pool;
    try {
      const pg = require('pg');
      Pool = pg.Pool;
    } catch (e) {
      lastError = 'pg 模組未安裝：' + e.message + '。請確認 package.json 已包含 pg 依賴並執行 npm install。';
      console.error('========================================');
      console.error('[DB][嚴重] 無法載入 pg 模組（PostgreSQL 驅動）');
      console.error('[DB] 錯誤：', e.message);
      console.error('[DB] 原因：package.json 缺少 pg 依賴，或 npm install 未執行');
      console.error('[DB] 處理：已自動退回 JSON 檔案模式');
      console.error('[DB] 修復：在專案根目錄執行 → npm install pg@^8.12.0');
      console.error('========================================');
      backend = 'json';
      return 'json';
    }

    try {
      pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
      console.log('[DB] 建立連線池，執行 SELECT 1 連通測試...');
      await pgPool.query('SELECT 1'); // 測試連線
      console.log('[DB] SELECT 1 通過');
      await initPgSchema();
      backend = 'postgres';
      _migrationsResolve(true); // 解鎖所有等待 schema 的請求
      console.log('[DB] 使用 PostgreSQL 後端：', process.env.DATABASE_URL.replace(/:.*@/, ':***@'));
      return 'postgres';
    } catch (e) {
      const msg = e.message || String(e) || '未知錯誤';
      const code = e.code || '';
      lastError = msg + (code ? ' (code=' + code + ')' : '');
      console.error('========================================');
      console.error('[DB][嚴重] PostgreSQL 連線失敗，退回 JSON 檔案模式');
      console.error('[DB] 錯誤訊息：', msg);
      if (code) console.error('[DB] 錯誤代碼：', code);
      if (e.detail) console.error('[DB] 細節：', e.detail);
      console.error('[DB] 已自動退回 JSON 檔案模式');
      console.error('========================================');
      if (pgPool) { try { pgPool.end(); } catch (_) {} pgPool = null; }
      backend = 'json';
      _migrationsResolve(false); // 失敗也解鎖，讓呼叫端落到 json 分支
      return 'json';
    }
  } else {
    console.log('[DB] 未設 DATABASE_URL，使用 JSON 檔案模式（離線）');
    backend = 'json';
    _migrationsResolve(false);
    return 'json';
  }
}

function getBackend() { return backend; }
function getLastError() { return lastError; }
function getMigrationsPromise() { return migrationsReady; }

/**
 * 自動建立 GM 帳號（冪等，upsert）
 * 只有 postgres 模式且 schema 就緒後才呼叫；JSON 模式由 server 端自己處理。
 */
async function ensureGMAccount(gmAccount, gmPasswordHash) {
  if (backend !== 'postgres') return false;
  await ensureSchema();
  try {
    await pgPool.query(
      `INSERT INTO accounts (account, password_hash, is_gm)
       VALUES ($1, $2, true)
       ON CONFLICT (account) DO UPDATE SET is_gm = true, password_hash = EXCLUDED.password_hash`,
      [gmAccount, gmPasswordHash]
    );
    console.log('[DB] GM 帳號已確保存在:', gmAccount);
    return true;
  } catch (e) {
    console.error('[DB] 建立 GM 帳號失敗:', e.message);
    return false;
  }
}

// ==================== JSON 後端（舊有實作包裝） ====================
function jsonPath(name) { return path.join(DATA_DIR, name); }

function loadJSON(name, fallback) {
  try {
    const p = jsonPath(name);
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (e) {
    console.error('[DB] JSON 讀取失敗:', name, e.message);
    return fallback;
  }
}

function saveJSON(name, data) {
  const p = jsonPath(name);
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, p);
}

// ==================== Postgres Schema ====================
async function initPgSchema() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS accounts (
      account VARCHAR(64) PRIMARY KEY,
      password_hash VARCHAR(128) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_gm BOOLEAN NOT NULL DEFAULT FALSE,
      meta JSONB NOT NULL DEFAULT '{}'::jsonb
    )`,
    `CREATE TABLE IF NOT EXISTS characters (
      id SERIAL PRIMARY KEY,
      account VARCHAR(64) NOT NULL REFERENCES accounts(account) ON DELETE CASCADE,
      server_id VARCHAR(64) NOT NULL,
      char_idx INTEGER NOT NULL,
      name VARCHAR(32),
      class_id VARCHAR(32),
      level INTEGER DEFAULT 1,
      save_data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(account, server_id, char_idx)
    )`,
    `CREATE TABLE IF NOT EXISTS bug_reports (
      id VARCHAR(64) PRIMARY KEY,
      account VARCHAR(64),
      version VARCHAR(32),
      description TEXT,
      player JSONB DEFAULT '{}'::jsonb,
      device JSONB DEFAULT '{}'::jsonb,
      page_url TEXT,
      errors JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS account_shared (
      account VARCHAR(64) PRIMARY KEY REFERENCES accounts(account) ON DELETE CASCADE,
      owned_transforms JSONB NOT NULL DEFAULT '[]'::jsonb,
      owned_heroes JSONB NOT NULL DEFAULT '[]'::jsonb,
      owned_pets JSONB NOT NULL DEFAULT '[]'::jsonb,
      warehouse JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS warehouse_logs (
      id BIGSERIAL PRIMARY KEY,
      account VARCHAR(64) NOT NULL,
      char_idx INTEGER NOT NULL,
      server_id VARCHAR(64) NOT NULL,
      action VARCHAR(16) NOT NULL,
      item_id VARCHAR(64) NOT NULL,
      item_name VARCHAR(128),
      count INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_warehouse_logs_account ON warehouse_logs(account)`,
    `CREATE TABLE IF NOT EXISTS gm_action_logs (
      id BIGSERIAL PRIMARY KEY,
      gm_account VARCHAR(64) NOT NULL,
      target_account VARCHAR(64),
      action VARCHAR(64) NOT NULL,
      detail JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_gm_logs_created ON gm_action_logs(created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS announcements (
      id SERIAL PRIMARY KEY,
      type VARCHAR(32) NOT NULL DEFAULT 'marquee',
      title VARCHAR(256),
      content TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      priority INTEGER NOT NULL DEFAULT 0,
      start_at TIMESTAMPTZ,
      end_at TIMESTAMPTZ,
      created_by VARCHAR(64),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS game_config (
      key VARCHAR(64) PRIMARY KEY,
      value JSONB NOT NULL,
      updated_by VARCHAR(64),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS castle_states (
      castle_id VARCHAR(64) PRIMARY KEY,
      owner_nation VARCHAR(64),
      owner_legion VARCHAR(64),
      siege_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      siege_start_hour INTEGER DEFAULT 20,
      siege_duration_min INTEGER DEFAULT 60,
      next_siege_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS custom_items (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      type VARCHAR(32) NOT NULL,
      rarity VARCHAR(16) NOT NULL DEFAULT 'common',
      class_restriction VARCHAR(32),
      level_require INTEGER DEFAULT 1,
      stats JSONB DEFAULT '{}'::jsonb,
      icon_path VARCHAR(256),
      price INTEGER DEFAULT 0,
      description TEXT,
      custom BOOLEAN NOT NULL DEFAULT TRUE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by VARCHAR(64),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_characters_server ON characters(server_id)`,
    `CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name)`,
    `CREATE INDEX IF NOT EXISTS idx_bug_reports_created ON bug_reports(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(active, type)`,
  ];
  for (const sql of statements) {
    try { await pgPool.query(sql); }
    catch (e) { console.error('[DB] schema init warn:', e.message); }
  }
  // 預設攻城戰數據（僅首次插入）
  try {
    await pgPool.query(`
      INSERT INTO castle_states (castle_id, owner_nation, siege_start_hour, siege_duration_min)
      VALUES
        ('gludio', 'kent', 20, 60),
        ('oren',   'oren', 20, 60),
        ('dion',   'dion', 20, 60),
        ('giran',  'aden', 20, 60),
        ('aden',   'aden', 20, 60)
      ON CONFLICT (castle_id) DO NOTHING
    `);
  } catch (e) { console.warn('[DB] castle seed 跳過:', e.message); }
  // 預設遊戲參數
  try {
    await pgPool.query(`
      INSERT INTO game_config (key, value)
      VALUES
        ('exp_rate', to_jsonb(1.0::float)),
        ('gold_rate', to_jsonb(1.0::float)),
        ('drop_rate', to_jsonb(1.0::float)),
        ('class_change_cost', to_jsonb(3600)),
        ('warehouse_max_slots', to_jsonb(200))
      ON CONFLICT (key) DO NOTHING
    `);
  } catch (e) { console.warn('[DB] config seed 跳過:', e.message); }
  console.log('[DB] Schema 初始化完成');
}

// ==================== 帳號 API ====================
async function getAccount(account) {
  if (backend === 'postgres') {
    await ensureSchema();
    const { rows } = await pgPool.query(
      'SELECT account, password_hash, created_at, is_gm, meta FROM accounts WHERE account = $1',
      [account]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      account: r.account,
      passwordHash: r.password_hash,
      createdAt: r.created_at.toISOString ? r.created_at.toISOString() : r.created_at,
      isGM: r.is_gm,
      meta: r.meta || {},
    };
  } else {
    const accounts = loadJSON('accounts.json', {});
    return accounts[account] || null;
  }
}

async function createAccount(account, passwordHash, isGM) {
  if (backend === 'postgres') {
    await ensureSchema();
    try {
      await pgPool.query(
        'INSERT INTO accounts (account, password_hash, is_gm) VALUES ($1, $2, $3)',
        [account, passwordHash, !!isGM]
      );
      return true;
    } catch (e) {
      if (e.code === '23505') return false; // duplicate
      throw e;
    }
  } else {
    const accounts = loadJSON('accounts.json', {});
    if (accounts[account]) return false;
    accounts[account] = {
      account, passwordHash,
      createdAt: new Date().toISOString(),
      isGM: !!isGM,
      characters: {},
    };
    saveJSON('accounts.json', accounts);
    return true;
  }
}

async function updatePassword(account, passwordHash) {
  if (backend === 'postgres') {
    await ensureSchema();
    await pgPool.query('UPDATE accounts SET password_hash = $1 WHERE account = $2', [passwordHash, account]);
  } else {
    const accounts = loadJSON('accounts.json', {});
    if (accounts[account]) {
      accounts[account].passwordHash = passwordHash;
      saveJSON('accounts.json', accounts);
    }
  }
}

async function getCharacterCount(account, serverId) {
  if (backend === 'postgres') {
    await ensureSchema();
    const { rows } = await pgPool.query(
      'SELECT COUNT(*)::int AS cnt FROM characters WHERE account = $1 AND server_id = $2',
      [account, serverId]
    );
    return rows[0].cnt;
  } else {
    const accounts = loadJSON('accounts.json', {});
    const acc = accounts[account];
    if (!acc || !acc.characters) return 0;
    const chars = acc.characters[serverId] || [];
    // v2.5.7：只數非空槽位（已刪除的 null 不計入）
    let cnt = 0;
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      if (!c) continue;
      const p = c.player || c;
      if (p && p.name) cnt++;
    }
    return cnt;
  }
}

async function listCharacters(account, serverId) {
  if (backend === 'postgres') {
    await ensureSchema();
    const { rows } = await pgPool.query(
      `SELECT char_idx, name, class_id, level, save_data, created_at, updated_at
       FROM characters WHERE account = $1 AND server_id = $2 ORDER BY char_idx ASC`,
      [account, serverId]
    );
    // v2.5.7：返回 3 個槽位的完整陣列，空槽為 null，確保前端索引正確對齊
    const maxSlots = 3;
    const byIdx = {};
    rows.forEach(r => { byIdx[r.char_idx] = r; });
    const result = [];
    for (let i = 0; i < maxSlots; i++) {
      const r = byIdx[i];
      if (!r) { result.push(null); continue; }
      const sd = r.save_data || {};
      const p = sd.player || {};
      if (!p.name && !r.name) { result.push(null); continue; }
      result.push({
        idx: i,
        name: p.name || r.name || '',
        level: p.level || r.level || 1,
        classId: p.classId || r.class_id || 'warrior',
        className: p.className || '',
        nation: sd.nation || null,
        nationName: sd.nationName || '',
      });
    }
    return result;
  } else {
    const accounts = loadJSON('accounts.json', {});
    const acc = accounts[account];
    if (!acc) return [];
    const chars = (acc.characters && acc.characters[serverId]) || [];
    // v2.5.7：返回 3 個槽位的完整陣列，空槽為 null，確保前端索引正確對齊
    const maxSlots = 3;
    const result = [];
    for (let i = 0; i < maxSlots; i++) {
      const c = chars[i];
      if (!c) { result.push(null); continue; }
      // saveData 可能是 { player: { name, classId, ... } } 或扁平 { name, classId, ... }
      const p = c.player || c;
      if (!p || !p.name) { result.push(null); continue; }
      result.push({
        idx: i,
        name: p.name || '',
        level: p.level || 1,
        classId: p.classId || 'warrior',
        className: p.className || '',
        nation: c.nation || p.nation || null,
        nationName: c.nationName || p.nationName || '',
      });
    }
    return result;
  }
}

async function getCharacter(account, serverId, charIdx) {
  if (backend === 'postgres') {
    await ensureSchema();
    const { rows } = await pgPool.query(
      'SELECT save_data FROM characters WHERE account = $1 AND server_id = $2 AND char_idx = $3',
      [account, serverId, charIdx]
    );
    if (rows.length === 0) return null;
    const sd = rows[0].save_data || {};
    // v2.5.0：確保返回完整存檔結構（新創角僅有基礎欄）
    if (sd.player && typeof sd.player === 'object') return sd;
    return {
      player: {
        name: sd.name || '',
        classId: sd.classId || 'warrior',
        level: sd.level || 1,
        exp: sd.exp || 0,
        hp: 100, mp: 80, maxHp: 100, maxMp: 80,
        atk: 10, def: 5, spd: 1, crit: 5, hit: 95, dodge: 5,
        x: 0, y: 0, direction: 'down',
      },
      resources: { gold: 0, gem: 0 },
      inventory: [],
      ownedHeroes: [],
      ownedPets: [],
      ownedTransforms: [],
      equipment: {},
      ...sd,
    };
  } else {
    const data = loadJSON('accounts.json', {});
    const acc = data[account];
    if (!acc || !acc.characters || !acc.characters[serverId]) return null;
    const raw = acc.characters[serverId][charIdx];
    if (!raw) return null;
    // v2.5.0：確保返回完整存檔結構（新創角僅有 name/classId 等基礎欄）
    if (raw.player && typeof raw.player === 'object') return raw;
    return {
      player: {
        name: raw.name || '',
        classId: raw.classId || 'warrior',
        level: raw.level || 1,
        exp: raw.exp || 0,
        hp: 100, mp: 80, maxHp: 100, maxMp: 80,
        atk: 10, def: 5, spd: 1, crit: 5, hit: 95, dodge: 5,
        x: 0, y: 0, direction: 'down',
      },
      resources: { gold: 0, gem: 0 },
      inventory: [],
      ownedHeroes: [],
      ownedPets: [],
      ownedTransforms: [],
      equipment: {},
      name: raw.name,
      classId: raw.classId,
      level: raw.level || 1,
      createdAt: raw.createdAt || Date.now(),
    };
  }
}

async function checkNameUnique(name, serverId) {
  if (backend === 'postgres') {
    await ensureSchema();
    const { rows } = await pgPool.query(
      `SELECT COUNT(*)::int AS cnt FROM characters
       WHERE server_id = $1 AND (name = $2 OR (save_data->'player'->>'name') = $2)`,
      [serverId, name]
    );
    return rows[0].cnt === 0;
  } else {
    const accounts = loadJSON('accounts.json', {});
    for (const accName in accounts) {
      const acc = accounts[accName];
      const chars = (acc.characters && acc.characters[serverId]) || [];
      for (const ch of chars) {
        if (ch && (ch.name === name || (ch.player && ch.player.name === name))) return false;
      }
    }
    return true;
  }
}

async function createCharacter(account, serverId, charIdx, name, classId, saveData) {
  // v2.5.0：無論是否有傳入 saveData，一律存完整結構（player/resources/inventory/…）
  // 確保 GET /api/characters/:idx 直接返回可進遊戲的完整存檔
  const baseAttrs = {
    warrior: { hp: 120, mp: 60, atk: 12, def: 8, spd: 1, crit: 5, hit: 95, dodge: 5 },
    mage:    { hp: 80,  mp: 120, atk: 8,  def: 4, spd: 1, crit: 8, hit: 95, dodge: 6 },
    archer:  { hp: 90,  mp: 80,  atk: 14, def: 5, spd: 2, crit: 12, hit: 98, dodge: 8 },
    rogue:   { hp: 85,  mp: 70,  atk: 13, def: 4, spd: 2, crit: 15, hit: 96, dodge: 12 },
    paladin: { hp: 140, mp: 90,  atk: 10, def: 12, spd: 1, crit: 3, hit: 95, dodge: 3 },
    warlock: { hp: 95,  mp: 110, atk: 11, def: 5, spd: 1, crit: 7, hit: 95, dodge: 5 },
  };
  const cls = baseAttrs[classId] || baseAttrs.warrior;
  const fullSave = {
    player: {
      name,
      classId,
      level: 1,
      exp: 0,
      hp: cls.hp, mp: cls.mp, maxHp: cls.hp, maxMp: cls.mp,
      atk: cls.atk, def: cls.def, spd: cls.spd,
      crit: cls.crit, hit: cls.hit, dodge: cls.dodge,
      x: 0, y: 0, direction: 'down',
    },
    resources: { gold: 0, gem: 0 },
    inventory: [],
    ownedHeroes: [],
    ownedPets: [],
    ownedTransforms: [],
    equipment: {},
    bagMaxSlots: 30,
    enhanceTickets: 0,
    killCount: 0,
    currentMap: null,
    nation: null,
    siegeStats: {},
    rankings: {},
    createdAt: Date.now(),
  };
  // 如果傳入了 saveData，合併覆蓋
  const finalSave = saveData && typeof saveData === 'object' && Object.keys(saveData).length > 0
    ? { ...fullSave, ...saveData }
    : fullSave;

  if (backend === 'postgres') {
    await ensureSchema();
    await pgPool.query(
      `INSERT INTO characters (account, server_id, char_idx, name, class_id, level, save_data)
       VALUES ($1, $2, $3, $4, $5, 1, $6)
       ON CONFLICT (account, server_id, char_idx) DO UPDATE
         SET name = EXCLUDED.name, class_id = EXCLUDED.class_id,
             save_data = EXCLUDED.save_data, updated_at = NOW()`,
      [account, serverId, charIdx, name, classId, finalSave]
    );
    return true;
  } else {
    const accounts = loadJSON('accounts.json', {});
    const acc = accounts[account];
    if (!acc) return false;
    if (!acc.characters) acc.characters = {};
    if (!acc.characters[serverId]) acc.characters[serverId] = [];
    acc.characters[serverId][charIdx] = finalSave;
    saveJSON('accounts.json', accounts);
    return true;
  }
}

async function saveCharacter(account, serverId, charIdx, saveData) {
  if (backend === 'postgres') {
    await ensureSchema();
    await pgPool.query(
      `INSERT INTO characters (account, server_id, char_idx, name, class_id, level, save_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (account, server_id, char_idx) DO UPDATE
         SET save_data = EXCLUDED.save_data,
             name = COALESCE(EXCLUDED.save_data->'player'->>'name', EXCLUDED.name),
             class_id = COALESCE(EXCLUDED.save_data->'player'->>'classId', EXCLUDED.class_id),
             level = COALESCE((EXCLUDED.save_data->'player'->>'level')::int, EXCLUDED.level),
             updated_at = NOW()`,
      [
        account, serverId, charIdx,
        saveData?.player?.name || '',
        saveData?.player?.classId || 'warrior',
        saveData?.player?.level || 1,
        saveData || {},
      ]
    );
    return true;
  } else {
    const accounts = loadJSON('accounts.json', {});
    const acc = accounts[account];
    if (!acc) return false;
    if (!acc.characters) acc.characters = {};
    if (!acc.characters[serverId]) acc.characters[serverId] = [];
    if (saveData === null || saveData === undefined) {
      // 刪除：設為 null 並壓縮陣列（移除空槽）
      acc.characters[serverId][charIdx] = null;
      // 從末尾清掉 null，保持陣列緊湊但保留 idx 對應
    } else {
      acc.characters[serverId][charIdx] = saveData;
    }
    saveJSON('accounts.json', accounts);
    return true;
  }
}

async function deleteAccount(account) {
  if (backend === 'postgres') {
    await ensureSchema();
    await pgPool.query('DELETE FROM accounts WHERE account = $1', [account]);
    return true;
  } else {
    const accounts = loadJSON('accounts.json', {});
    if (!accounts[account]) return false;
    delete accounts[account];
    saveJSON('accounts.json', accounts);
    return true;
  }
}

async function addBugReport(report) {
  if (backend === 'postgres') {
    await ensureSchema();
    await pgPool.query(
      `INSERT INTO bug_reports (id, account, version, description, player, device, page_url, errors)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        report.id, report.account || null, report.version || '',
        report.description || '', report.player || {}, report.device || {},
        report.pageUrl || '', report.errors || [],
      ]
    );
    return report.id;
  } else {
    const list = loadJSON('bug-reports.json', []);
    list.unshift(report);
    if (list.length > 5000) list.length = 5000;
    saveJSON('bug-reports.json', list);
    return report.id;
  }
}

// ==================== 帳號級共享（變身/英雄/守護/倉庫） ====================
async function getAccountShared(account) {
  if (backend === 'postgres') {
    await ensureSchema();
    const { rows } = await pgPool.query(
      'SELECT owned_transforms, owned_heroes, owned_pets, warehouse FROM account_shared WHERE account = $1',
      [account]
    );
    if (rows.length === 0) {
      // 首次：自動建立空紀錄
      await pgPool.query(
        'INSERT INTO account_shared (account) VALUES ($1) ON CONFLICT DO NOTHING',
        [account]
      );
      return { ownedTransforms: [], ownedHeroes: [], ownedPets: [], warehouse: [] };
    }
    const r = rows[0];
    return {
      ownedTransforms: r.owned_transforms || [],
      ownedHeroes: r.owned_heroes || [],
      ownedPets: r.owned_pets || [],
      warehouse: r.warehouse || [],
    };
  } else {
    const data = loadJSON('account-shared.json', {});
    const d = data[account] || { ownedTransforms: [], ownedHeroes: [], ownedPets: [], warehouse: [] };
    return d;
  }
}

async function saveAccountShared(account, patch) {
  if (backend === 'postgres') {
    await ensureSchema();
    const sets = [];
    const params = [account];
    let idx = 2;
    if ('ownedTransforms' in patch) {
      sets.push(`owned_transforms = ${idx}`); params.push(patch.ownedTransforms); idx++;
    }
    if ('ownedHeroes' in patch) {
      sets.push(`owned_heroes = ${idx}`); params.push(patch.ownedHeroes); idx++;
    }
    if ('ownedPets' in patch) {
      sets.push(`owned_pets = ${idx}`); params.push(patch.ownedPets); idx++;
    }
    if ('warehouse' in patch) {
      sets.push(`warehouse = ${idx}`); params.push(patch.warehouse); idx++;
    }
    if (sets.length === 0) return;
    sets.push('updated_at = NOW()');
    const colNames = Object.keys(patch).map(k =>
      k === 'ownedTransforms' ? 'owned_transforms' :
      k === 'ownedHeroes' ? 'owned_heroes' :
      k === 'ownedPets' ? 'owned_pets' : k
    ).join(', ');
    const placeholders = params.slice(1).map((_, i) => '$' + (i + 2)).join(', ');
    await pgPool.query(
      `INSERT INTO account_shared (account, ${colNames}, updated_at)
       VALUES ($1, ${placeholders}, NOW())
       ON CONFLICT (account) DO UPDATE SET ${sets.join(', ')}`,
      params
    );
  } else {
    const data = loadJSON('account-shared.json', {});
    if (!data[account]) data[account] = { ownedTransforms: [], ownedHeroes: [], ownedPets: [], warehouse: [] };
    Object.assign(data[account], patch);
    saveJSON('account-shared.json', data);
  }
}

// 倉庫存入/取出
async function warehouseDeposit(account, serverId, charIdx, item) {
  const shared = await getAccountShared(account);
  const wh = shared.warehouse || [];
  const existing = wh.find(i => i.id === item.id);
  if (existing) {
    existing.count = (existing.count || 0) + (item.count || 1);
  } else {
    wh.push({ ...item, count: item.count || 1 });
  }
  await saveAccountShared(account, { warehouse: wh });
  if (backend === 'postgres') {
    await pgPool.query(
      `INSERT INTO warehouse_logs (account, char_idx, server_id, action, item_id, item_name, count)
       VALUES ($1, $2, $3, 'deposit', $4, $5, $6)`,
      [account, charIdx, serverId, item.id, item.name || '', item.count || 1]
    );
  }
  return true;
}

async function warehouseWithdraw(account, serverId, charIdx, itemId, count) {
  const shared = await getAccountShared(account);
  const wh = shared.warehouse || [];
  const idx = wh.findIndex(i => i.id === itemId);
  if (idx < 0) throw new Error('倉庫沒有此道具');
  const existing = wh[idx];
  const take = Math.min(count || 1, existing.count || 0);
  if (take <= 0) throw new Error('數量不足');
  existing.count -= take;
  if (existing.count <= 0) wh.splice(idx, 1);
  await saveAccountShared(account, { warehouse: wh });

  // v2.5.0：取出後加進該角色 saveData 的 inventory（堆疊規則：可堆疊道具疊加，不可堆疊新建）
  const saveData = await getCharacter(account, serverId, charIdx);
  if (saveData) {
    if (!saveData.inventory) saveData.inventory = [];
    const inv = saveData.inventory;
    // 可堆疊：消耗品 / 材料 / 藥水（type 為 consumable/material 或 stackable=true）
    const isStackable = existing.type === 'consumable' || existing.type === 'material' ||
                        existing.itemType === 'consumable' || existing.itemType === 'material' ||
                        existing.stackable === true;
    const itemToAdd = { ...existing, count: take };
    if (isStackable) {
      const found = inv.find(i => i.id === itemId);
      if (found) {
        found.count = (found.count || 0) + take;
      } else {
        inv.push(itemToAdd);
      }
    } else {
      // 不可堆疊：每件獨立 slot
      inv.push(itemToAdd);
    }
    await saveCharacter(account, serverId, charIdx, saveData);
  }

  if (backend === 'postgres') {
    await pgPool.query(
      `INSERT INTO warehouse_logs (account, char_idx, server_id, action, item_id, item_name, count)
       VALUES ($1, $2, $3, 'withdraw', $4, $5, $6)`,
      [account, charIdx, serverId, itemId, existing.name || '', take]
    );
  }
  return { item: existing, count: take };
}

// ==================== GM 操作日誌 ====================
async function logGMAction(gmAccount, targetAccount, action, detail) {
  if (backend === 'postgres') {
    await ensureSchema();
    try {
      await pgPool.query(
        'INSERT INTO gm_action_logs (gm_account, target_account, action, detail) VALUES ($1, $2, $3, $4)',
        [gmAccount, targetAccount || null, action, detail || {}]
      );
    } catch (e) { console.warn('[GM] log 寫入失敗:', e.message); }
  } else {
    const list = loadJSON('gm-action-logs.json', []);
    list.unshift({ gmAccount, targetAccount, action, detail, createdAt: new Date().toISOString() });
    if (list.length > 2000) list.length = 2000;
    saveJSON('gm-action-logs.json', list);
  }
}

async function listGMLogs(limit) {
  if (backend === 'postgres') {
    await ensureSchema();
    const { rows } = await pgPool.query(
      'SELECT id, gm_account, target_account, action, detail, created_at FROM gm_action_logs ORDER BY created_at DESC LIMIT $1',
      [limit || 50]
    );
    return rows.map(r => ({
      id: r.id, gmAccount: r.gm_account, targetAccount: r.target_account,
      action: r.action, detail: r.detail, createdAt: r.created_at
    }));
  } else {
    const list = loadJSON('gm-action-logs.json', []);
    return list.slice(0, limit || 50);
  }
}

// ==================== 公告 ====================
async function listAnnouncements(type) {
  if (backend === 'postgres') {
    await ensureSchema();
    const { rows } = type
      ? await pgPool.query(
          'SELECT id, type, title, content, priority, created_at FROM announcements WHERE active = true AND type = $1 ORDER BY priority DESC, created_at DESC',
          [type]
        )
      : await pgPool.query(
          'SELECT id, type, title, content, active, priority, created_at FROM announcements ORDER BY active DESC, priority DESC, created_at DESC LIMIT 100'
        );
    return rows.map(r => ({ ...r, createdAt: r.created_at }));
  } else {
    const data = loadJSON('announcements.json', []);
    return type ? data.filter(a => a.active !== false && a.type === type) : list.slice(0, 100);
  }
}

async function createAnnouncement(data, gmAccount) {
  if (backend === 'postgres') {
    await ensureSchema();
    const { rows } = await pgPool.query(
      `INSERT INTO announcements (type, title, content, active, priority, start_at, end_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, type, title, content, active, priority, created_at`,
      [data.type || 'marquee', data.title || '', data.content || '',
       data.active !== false, data.priority || 0,
       data.startAt || null, data.endAt || null, gmAccount || null]
    );
    return rows[0];
  } else {
    const list = loadJSON('announcements.json', []);
    const item = { id: Date.now(), ...data, createdAt: new Date().toISOString(), createdBy: gmAccount };
    list.unshift(item);
    saveJSON('announcements.json', list);
    return item;
  }
}

async function updateAnnouncement(id, data, gmAccount) {
  if (backend === 'postgres') {
    await ensureSchema();
    const sets = [];
    const params = [];
    let idx = 1;
    if ('title' in data) { sets.push(`title = ${idx}`); params.push(data.title); idx++; }
    if ('content' in data) { sets.push(`content = ${idx}`); params.push(data.content); idx++; }
    if ('active' in data) { sets.push(`active = ${idx}`); params.push(data.active); idx++; }
    if ('priority' in data) { sets.push(`priority = ${idx}`); params.push(data.priority); idx++; }
    if ('type' in data) { sets.push(`type = ${idx}`); params.push(data.type); idx++; }
    sets.push(`updated_at = NOW()`);
    params.push(Number(id));
    await pgPool.query(`UPDATE announcements SET ${sets.join(', ')} WHERE id = ${idx}`, params);
    return true;
  } else {
    const list = loadJSON('announcements.json', []);
    const i = list.findIndex(a => String(a.id) === String(id));
    if (i >= 0) { list[i] = { ...list[i], ...data, updatedAt: new Date().toISOString() }; saveJSON('announcements.json', list); }
    return true;
  }
}

async function deleteAnnouncement(id) {
  if (backend === 'postgres') {
    await ensureSchema();
    await pgPool.query('DELETE FROM announcements WHERE id = $1', [Number(id)]);
  } else {
    const list = loadJSON('announcements.json', []);
    const i = list.findIndex(a => String(a.id) === String(id));
    if (i >= 0) { list.splice(i, 1); saveJSON('announcements.json', list); }
  }
  return true;
}

// ==================== 遊戲參數 ====================
async function getGameConfig(key) {
  if (backend === 'postgres') {
    await ensureSchema();
    const { rows } = await pgPool.query(
      'SELECT key, value FROM game_config' + (key ? ' WHERE key = $1' : ''),
      key ? [key] : []
    );
    if (key) return rows.length > 0 ? rows[0].value : null;
    const out = {};
    rows.forEach(r => { out[r.key] = r.value; });
    return out;
  } else {
    const cfg = loadJSON('game-config.json', {
      exp_rate: 1.0, gold_rate: 1.0, drop_rate: 1.0,
      class_change_cost: 3600, warehouse_max_slots: 200,
    });
    if (key) return cfg[key] ?? null;
    return cfg;
  }
}

async function setGameConfig(key, value, gmAccount) {
  if (backend === 'postgres') {
    await ensureSchema();
    await pgPool.query(
      `INSERT INTO game_config (key, value, updated_by, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [key, value, gmAccount || null]
    );
  } else {
    const cfg = loadJSON('game-config.json', {});
    cfg[key] = value;
    saveJSON('game-config.json', cfg);
  }
  return true;
}

// ==================== 攻城戰設定 ====================
async function getCastleStates() {
  if (backend === 'postgres') {
    await ensureSchema();
    const { rows } = await pgPool.query('SELECT * FROM castle_states ORDER BY castle_id');
    return rows.map(r => ({
      castleId: r.castle_id, ownerNation: r.owner_nation, ownerLegion: r.owner_legion,
      siegeEnabled: r.siege_enabled, siegeStartHour: r.siege_start_hour,
      siegeDurationMin: r.siege_duration_min, nextSiegeAt: r.next_siege_at,
    }));
  } else {
    return loadJSON('castle-states.json', [
      { castleId: 'gludio', ownerNation: 'kent', siegeEnabled: true, siegeStartHour: 20, siegeDurationMin: 60 },
      { castleId: 'oren',   ownerNation: 'oren', siegeEnabled: true, siegeStartHour: 20, siegeDurationMin: 60 },
      { castleId: 'dion',   ownerNation: 'dion', siegeEnabled: true, siegeStartHour: 20, siegeDurationMin: 60 },
      { castleId: 'giran',  ownerNation: 'aden', siegeEnabled: true, siegeStartHour: 20, siegeDurationMin: 60 },
      { castleId: 'aden',   ownerNation: 'aden', siegeEnabled: true, siegeStartHour: 20, siegeDurationMin: 60 },
    ]);
  }
}

async function updateCastleState(castleId, patch, gmAccount) {
  if (backend === 'postgres') {
    await ensureSchema();
    const sets = [];
    const params = [];
    let idx = 1;
    if ('ownerNation' in patch) { sets.push(`owner_nation = $${idx}`); params.push(patch.ownerNation); idx++; }
    if ('ownerLegion' in patch) { sets.push(`owner_legion = $${idx}`); params.push(patch.ownerLegion); idx++; }
    if ('siegeEnabled' in patch) { sets.push(`siege_enabled = $${idx}`); params.push(patch.siegeEnabled); idx++; }
    if ('siegeStartHour' in patch) { sets.push(`siege_start_hour = $${idx}`); params.push(patch.siegeStartHour); idx++; }
    if ('siegeDurationMin' in patch) { sets.push(`siege_duration_min = $${idx}`); params.push(patch.siegeDurationMin); idx++; }
    sets.push('updated_at = NOW()');
    params.push(castleId);
    const whereIdx = idx;
    // 先用 ON CONFLICT upsert 更簡單可靠
    const colNames = Object.keys(patch).map(k =>
      k === 'ownerNation' ? 'owner_nation' :
      k === 'ownerLegion' ? 'owner_legion' :
      k === 'siegeEnabled' ? 'siege_enabled' :
      k === 'siegeStartHour' ? 'siege_start_hour' :
      k === 'siegeDurationMin' ? 'siege_duration_min' : k
    ).join(', ');
    const excluded = Object.keys(patch).map(k => {
      const col = k === 'ownerNation' ? 'owner_nation' :
                  k === 'ownerLegion' ? 'owner_legion' :
                  k === 'siegeEnabled' ? 'siege_enabled' :
                  k === 'siegeStartHour' ? 'siege_start_hour' :
                  k === 'siegeDurationMin' ? 'siege_duration_min' : k;
      return col + ' = EXCLUDED.' + col;
    }).join(', ');
    const placeholders = params.slice(0, -1).map((_, i) => '$' + (i + 1)).join(', ');
    await pgPool.query(
      `INSERT INTO castle_states (castle_id, ${colNames}, updated_at)
       VALUES ($${whereIdx}, ${placeholders}, NOW())
       ON CONFLICT (castle_id) DO UPDATE SET ${excluded}, updated_at = NOW()`,
      params
    );
  } else {
    const list = loadJSON('castle-states.json', []);
    const i = list.findIndex(c => c.castleId === castleId);
    if (i >= 0) list[i] = { ...list[i], ...patch };
    else list.push({ castleId, ...patch });
    saveJSON('castle-states.json', list);
  }
  return true;
}

// ==================== 自定義道具/裝備 ====================
async function listCustomItems(type) {
  if (backend === 'postgres') {
    await ensureSchema();
    const { rows } = type
      ? await pgPool.query('SELECT * FROM custom_items WHERE active = true AND type = $1 ORDER BY created_at DESC', [type])
      : await pgPool.query('SELECT * FROM custom_items WHERE active = true ORDER BY type, created_at DESC');
    return rows.map(mapItemRow);
  } else {
    const list = loadJSON('custom-items.json', []);
    return type ? list.filter(i => i.type === type && i.active) : list.filter(i => i.active);
  }
}

function mapItemRow(r) {
  return {
    id: r.id, name: r.name, type: r.type, rarity: r.rarity,
    classRestriction: r.class_restriction, levelRequire: r.level_require,
    stats: r.stats || {}, iconPath: r.icon_path, price: r.price,
    description: r.description, custom: r.custom, active: r.active,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

async function upsertCustomItem(item, gmAccount) {
  if (backend === 'postgres') {
    await ensureSchema();
    await pgPool.query(
      `INSERT INTO custom_items (id, name, type, rarity, class_restriction, level_require, stats, icon_path, price, description, created_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, type = EXCLUDED.type, rarity = EXCLUDED.rarity,
         class_restriction = EXCLUDED.class_restriction, level_require = EXCLUDED.level_require,
         stats = EXCLUDED.stats, icon_path = EXCLUDED.icon_path, price = EXCLUDED.price,
         description = EXCLUDED.description, updated_at = NOW()`,
      [item.id, item.name, item.type, item.rarity || 'common',
       item.classRestriction || null, item.levelRequire || 1,
       item.stats || {}, item.iconPath || '', item.price || 0,
       item.description || '', gmAccount || null]
    );
    return true;
  } else {
    const list = loadJSON('custom-items.json', []);
    const i = list.findIndex(x => x.id === item.id);
    if (i >= 0) list[i] = { ...list[i], ...item, updatedAt: new Date().toISOString() };
    else list.push({ ...item, custom: true, active: true, createdAt: new Date().toISOString() });
    saveJSON('custom-items.json', list);
    return true;
  }
}

async function deleteCustomItem(id) {
  if (backend === 'postgres') {
    await ensureSchema();
    await pgPool.query('UPDATE custom_items SET active = false WHERE id = $1', [id]);
  } else {
    const list = loadJSON('custom-items.json', []);
    const i = list.findIndex(x => x.id === id);
    if (i >= 0) { list[i].active = false; saveJSON('custom-items.json', list); }
  }
  return true;
}

// ==================== 玩家搜尋（供 GM 使用） ====================
async function searchPlayers(keyword, limit) {
  if (backend === 'postgres') {
    await ensureSchema();
    const kw = `%${keyword || ''}%`;
    const { rows } = await pgPool.query(
      `SELECT a.account, a.created_at, a.is_gm, c.name AS char_name, c.class_id, c.level
       FROM accounts a
       LEFT JOIN characters c ON c.account = a.account
       WHERE a.account ILIKE $1 OR c.name ILIKE $1
       ORDER BY a.created_at DESC
       LIMIT $2`,
      [kw, limit || 50]
    );
    return rows.map(r => ({
      account: r.account, createdAt: r.created_at, isGM: r.is_gm,
      charName: r.char_name, classId: r.class_id, level: r.level
    }));
  } else {
    const accounts = loadJSON('accounts.json', {});
    const list = [];
    for (const acc in accounts) {
      if (keyword && acc.indexOf(keyword) === -1) continue;
      const a = accounts[acc];
      const chars = a.characters || {};
      for (const srv in chars) {
        for (const c of chars[srv] || []) {
          if (!c) continue;
          if (keyword && c.name && c.name.indexOf(keyword) === -1) continue;
          list.push({
            account: acc, isGM: !!a.isGM,
            charName: c.name || c.player?.name || '',
            classId: c.classId || c.player?.classId || '',
            level: c.level || c.player?.level || 1,
          });
          if (list.length >= (limit || 50)) return list;
        }
      }
      if (!chars || Object.keys(chars).length === 0) {
        list.push({ account: acc, isGM: !!a.isGM, charName: '', classId: '', level: 0 });
      }
    }
    return list.slice(0, limit || 50);
  }
}

module.exports = {
  init,
  getBackend,
  getLastError,
  getMigrationsPromise,
  ensureGMAccount,
  // 帳號
  getAccount,
  createAccount,
  deleteAccount,
  updatePassword,
  searchPlayers,
  // 角色
  listCharacters,
  getCharacter,
  getCharacterCount,
  checkNameUnique,
  createCharacter,
  saveCharacter,
  // Bug
  addBugReport,
  // 帳號級共享
  getAccountShared,
  saveAccountShared,
  warehouseDeposit,
  warehouseWithdraw,
  // GM 日誌
  logGMAction,
  listGMLogs,
  // 公告
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  // 遊戲參數
  getGameConfig,
  setGameConfig,
  // 攻城戰
  getCastleStates,
  updateCastleState,
  // 自定義道具
  listCustomItems,
  upsertCustomItem,
  deleteCustomItem,
};

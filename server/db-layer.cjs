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

const DATA_DIR = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ==================== 後端選擇 ====================
let backend = 'json';
let pgPool = null;

async function init() {
  if (process.env.DATABASE_URL) {
    try {
      const { Pool } = require('pg');
      pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
      await pgPool.query('SELECT 1'); // 測試連線
      await initPgSchema();
      backend = 'postgres';
      console.log('[DB] 使用 PostgreSQL 後端：', process.env.DATABASE_URL.replace(/:.*@/, ':***@'));
      return 'postgres';
    } catch (e) {
      console.error('[DB] PostgreSQL 連線失敗，退回 JSON 檔案模式：', e.message);
      if (pgPool) { try { pgPool.end(); } catch (_) {} pgPool = null; }
      backend = 'json';
      return 'json';
    }
  } else {
    console.log('[DB] 使用 JSON 檔案模式（離線）');
    backend = 'json';
    return 'json';
  }
}

function getBackend() { return backend; }

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
    `CREATE INDEX IF NOT EXISTS idx_characters_server ON characters(server_id)`,
    `CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name)`,
    `CREATE INDEX IF NOT EXISTS idx_bug_reports_created ON bug_reports(created_at DESC)`,
  ];
  for (const sql of statements) {
    try { await pgPool.query(sql); }
    catch (e) { console.error('[DB] schema init warn:', e.message); }
  }
  console.log('[DB] Schema 初始化完成');
}

// ==================== 帳號 API ====================
async function getAccount(account) {
  if (backend === 'postgres') {
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
    const { rows } = await pgPool.query(
      'SELECT COUNT(*)::int AS cnt FROM characters WHERE account = $1 AND server_id = $2',
      [account, serverId]
    );
    return rows[0].cnt;
  } else {
    const accounts = loadJSON('accounts.json', {});
    const acc = accounts[account];
    if (!acc || !acc.characters) return 0;
    return (acc.characters[serverId] || []).length;
  }
}

async function listCharacters(account, serverId) {
  if (backend === 'postgres') {
    const { rows } = await pgPool.query(
      `SELECT char_idx, name, class_id, level, save_data, created_at, updated_at
       FROM characters WHERE account = $1 AND server_id = $2 ORDER BY char_idx ASC`,
      [account, serverId]
    );
    return rows.map(r => ({
      idx: r.char_idx,
      name: r.save_data?.player?.name || r.name || '',
      level: r.save_data?.player?.level || r.level || 1,
      classId: r.save_data?.player?.classId || r.class_id || 'warrior',
      className: r.save_data?.player?.className || '',
      nation: r.save_data?.nation || null,
      nationName: r.save_data?.nationName || '',
    }));
  } else {
    const accounts = loadJSON('accounts.json', {});
    const acc = accounts[account];
    if (!acc) return [];
    const chars = (acc.characters && acc.characters[serverId]) || [];
    return chars.map((c, i) => ({
      idx: i,
      name: c.player?.name || c.name || '',
      level: c.player?.level || c.level || 1,
      classId: c.player?.classId || c.classId || 'warrior',
      className: c.player?.className || '',
      nation: c.nation || null,
      nationName: c.nationName || '',
    }));
  }
}

async function getCharacter(account, serverId, charIdx) {
  if (backend === 'postgres') {
    const { rows } = await pgPool.query(
      'SELECT save_data FROM characters WHERE account = $1 AND server_id = $2 AND char_idx = $3',
      [account, serverId, charIdx]
    );
    return rows.length > 0 ? rows[0].save_data : null;
  } else {
    const accounts = loadJSON('accounts.json', {});
    const acc = accounts[account];
    if (!acc) return null;
    const chars = (acc.characters && acc.characters[serverId]) || [];
    return chars[charIdx] || null;
  }
}

async function checkNameUnique(name, serverId) {
  if (backend === 'postgres') {
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
  if (backend === 'postgres') {
    await pgPool.query(
      `INSERT INTO characters (account, server_id, char_idx, name, class_id, level, save_data)
       VALUES ($1, $2, $3, $4, $5, 1, $6)
       ON CONFLICT (account, server_id, char_idx) DO UPDATE
         SET name = EXCLUDED.name, class_id = EXCLUDED.class_id,
             save_data = EXCLUDED.save_data, updated_at = NOW()`,
      [account, serverId, charIdx, name, classId, saveData || {}]
    );
    return true;
  } else {
    const accounts = loadJSON('accounts.json', {});
    const acc = accounts[account];
    if (!acc) return false;
    if (!acc.characters) acc.characters = {};
    if (!acc.characters[serverId]) acc.characters[serverId] = [];
    acc.characters[serverId][charIdx] = saveData || {
      name, classId, level: 1, createdAt: Date.now(),
    };
    saveJSON('accounts.json', accounts);
    return true;
  }
}

async function saveCharacter(account, serverId, charIdx, saveData) {
  if (backend === 'postgres') {
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
    acc.characters[serverId][charIdx] = saveData;
    saveJSON('accounts.json', accounts);
    return true;
  }
}

async function addBugReport(report) {
  if (backend === 'postgres') {
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

module.exports = {
  init,
  getBackend,
  // 帳號
  getAccount,
  createAccount,
  updatePassword,
  // 角色
  listCharacters,
  getCharacter,
  getCharacterCount,
  checkNameUnique,
  createCharacter,
  saveCharacter,
  // Bug
  addBugReport,
};

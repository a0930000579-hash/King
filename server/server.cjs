/**
 *   君主之刃 v2.6.0 · 正式營運後端伺服器
 *
 * 功能：
 *   1. 靜態檔案服務（承接舊版）
 *   2. 帳號系統：註冊 / 登入（密碼 sha256 雜湊）/ 角色存檔
 *   3. Socket.IO 多人連線伺服器：移動同步 / 聊天 / 戰鬥廣播
 *   4. GM 後台 API
 *   5. Bug 回報 API（向後相容）
 *
 * 資料庫：預設 JSON 檔案（單機）；設 DATABASE_URL 環境變數則切換 Postgres（跨設備共享）
 *   - data/accounts.json  帳號資料
 *   - data/characters.json 角色存檔
 *   - data/bug-reports.json Bug 回報
 *
 * 啟動：node server/server.cjs（根目錄 npm start 亦可）
 */

// v2.7.6：隨包 vendor 依賴解析（零 npm install）
//  - 標準 node_modules 樹狀結構在 server/vendor/node_modules/（含 pg 完整遞迴依賴）
//  - 加入 globalPaths 讓 Node 原生解析器自動向上找，pg 內部巢狀 require('pg-types') 等都能解析
//  - 保留舊 flat vendor/ 作為 fallback，向後相容
const Module = require('module');
const path = require('path');
const vendorDir = path.resolve(__dirname, 'vendor');
const vendorNodeModules = path.join(vendorDir, 'node_modules');
// 注入 globalPaths：所有模組的 require 都會經過這裡
if (Array.isArray(Module.globalPaths) && !Module.globalPaths.includes(vendorNodeModules)) {
  Module.globalPaths.unshift(vendorNodeModules);
}
// 同時把 vendorDir 也加入 fallback（舊 flat 結構相容）
if (Array.isArray(Module.globalPaths) && !Module.globalPaths.includes(vendorDir)) {
  Module.globalPaths.push(vendorDir);
}
// 額外補丁：若某些情境 globalPaths 沒生效（極端 Node 版本），再保留 _resolveFilename fallback
const origResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  try {
    return origResolve.call(this, request, parent, isMain, options);
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      try {
        return origResolve.call(this, path.join(vendorNodeModules, request), parent, isMain, options);
      } catch (_) {
        try {
          return origResolve.call(this, path.join(vendorDir, request), parent, isMain, options);
        } catch (__) {
          throw e;
        }
      }
    }
    throw e;
  }
};

const http = require('http');
const fs = require('fs');
const url = require('url');
const crypto = require('crypto');

// Socket.IO 動態載入（若環境有安裝則啟用多人連線，否則維持單機）
let io = null;
let socketIoInstalled = false;
try {
  const { Server } = require('socket.io');
  socketIoInstalled = true;
  console.log('[Socket.IO] 偵測到 socket.io，多人連線已啟用');
} catch (e) {
  console.log('[Socket.IO] 未偵測到 socket.io，以單機模式執行');
}

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(__dirname, '..', 'data');
const ROOT_DIR = path.resolve(__dirname, '..');
const ASSETS_DIR = path.resolve(ROOT_DIR, 'assets');
const MAPS_DIR = path.resolve(__dirname, 'maps');
const PUBLIC_MAPS_DIR = path.resolve(ASSETS_DIR, 'maps');
const MAX_BODY_SIZE = 2 * 1024 * 1024; // 2MB
const GM_ACCOUNT = '19811013';
const GM_PASSWORD = process.env.GM_PASSWORD || '19811013';

// v2.7.3：伺服器實例標識（兩支手機比對是否連到同 process）
const SERVER_INSTANCE_ID = 'srv_' + crypto.randomBytes(6).toString('hex') + '_' + process.pid;
const SERVER_START_TIME = Date.now();

// v2.7.3：AI 持久化目錄（伺服器重啟後 AI id/數量/等級一致）
const AI_DATA_DIR = path.join(DATA_DIR, 'ai');
try { if (!fs.existsSync(AI_DATA_DIR)) fs.mkdirSync(AI_DATA_DIR, { recursive: true }); } catch(e) {}

// ========== 資產掃描（大小寫對照表，供大小寫不同的請求做備查） ==========
function buildAssetIndex(dir) {
  const map = new Map(); // 小寫路徑 -> 真實相對路徑
  if (!fs.existsSync(dir)) return map;
  function walk(current, rel) {
    let entries;
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch (e) { return; }
    for (const ent of entries) {
      const full = path.join(current, ent.name);
      const r = rel ? rel + '/' + ent.name : ent.name;
      if (ent.isDirectory()) {
        walk(full, r);
      } else {
        map.set(r.toLowerCase(), r);
      }
    }
  }
  walk(dir, '');
  return map;
}
 let assetIndex = buildAssetIndex(ASSETS_DIR);
 // v3.1.1：清理 manifest 中磁碟不存在的條目（舊資料夾刪除後殘留的引用）
 //  不修改原始檔案，只在記憶體中過濾，提供給 /api/diag 和 /assets/assets-manifest.json 用
 let cleanedManifest = null;
 let cleanedManifestMissing = 0;
 let cleanedManifestOriginal = 0;
 // v3.1.2：從磁碟重新生成 manifest（只包含實際存在的檔案）
 //  解決 manifest 引用已刪除資料夾（transform_old / 12_map_old 等）的問題
 let regeneratedManifest = null;
 function regenerateManifestFromDisk() {
   const result = {};
   let count = 0;
   function walk(dir, relBase) {
     let entries;
     try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch(e) { return; }
     for (const ent of entries) {
       const full = path.join(dir, ent.name);
       const rel = relBase ? relBase + '/' + ent.name : ent.name;
       if (ent.isDirectory()) {
         // 跳過 zips 資料夾（更新包）和 data 資料夾
         if (ent.name === 'zips' || ent.name === 'data') continue;
         walk(full, rel);
       } else {
         // 只加入圖片/音訊/字型/json 等資源檔
         const ext = path.extname(ent.name).toLowerCase();
         const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp',
                              '.mp3', '.wav', '.ogg', '.m4a',
                              '.ttf', '.otf', '.woff', '.woff2',
                              '.json', '.mp4', '.webm'];
         if (allowedExts.includes(ext) || ent.name.endsWith('-manifest.json')) {
           // key 用檔名（不含副檔名），value 用相對於 ROOT_DIR 的路徑
           const key = ent.name.replace(/\.[^.]+$/, '');
           const value = 'assets/' + rel;
           // 避免重複 key（罕見）
           if (!result[key]) {
             result[key] = value;
           } else {
             // 同名檔用完整路徑當 key
             result['assets/' + rel] = value;
           }
           count++;
         }
       }
     }
   }
   if (fs.existsSync(ASSETS_DIR)) {
     walk(ASSETS_DIR, '');
   }
   regeneratedManifest = result;
   console.log('[Manifest] 從磁碟重新生成完成: 總共 ' + count + ' 個檔案');
   // v3.1.2：將重新生成的 manifest 寫回磁碟（替換舊檔案）
   //  確保客戶端拿到的就是最新、無失效引用的版本
   try {
     const manifestPath = path.join(ASSETS_DIR, 'assets-manifest.json');
     const sorted = {};
     Object.keys(result).sort().forEach(function(k) { sorted[k] = result[k]; });
     fs.writeFileSync(manifestPath, JSON.stringify(sorted, null, 2), 'utf8');
     console.log('[Manifest] 已寫入 assets-manifest.json, 共 ' + Object.keys(sorted).length + ' 項');
   } catch(e) {
     console.warn('[Manifest] 寫入失敗:', e.message);
   }
   return result;
 }
 function cleanManifest() {
   const manifestPath = path.join(ASSETS_DIR, 'assets-manifest.json');
   if (!fs.existsSync(manifestPath)) { cleanedManifest = null; return; }
   try {
     const raw = fs.readFileSync(manifestPath, 'utf8');
     const m = JSON.parse(raw);
     cleanedManifestOriginal = Object.keys(m).length;
     const clean = {};
     let missing = 0;
     for (const key of Object.keys(m)) {
       const v = m[key];
       // 檔案可能在 ASSETS_DIR 下或 ROOT_DIR 下，都檢查
       const p1 = path.join(ASSETS_DIR, v);
       const p2 = path.join(ROOT_DIR, v);
       if (fs.existsSync(p1) || fs.existsSync(p2)) {
         clean[key] = v;
       } else {
         missing++;
       }
     }
     cleanedManifest = clean;
     cleanedManifestMissing = missing;
     console.log('[Manifest] 清理完成: 原始 ' + cleanedManifestOriginal + ' 項 → 清理後 ' + Object.keys(clean).length + '項 (移除 ' + missing + ' 項不存在的引用)');
   } catch(e) {
     console.warn('[Manifest] 清理失敗:', e.message);
     cleanedManifest = null;
   }
 }
 cleanManifest();
 regenerateManifestFromDisk();
 // v3.1.3：regenerate 完成後，清理後的 manifest 等同 regenerated（全部磁碟存在）
 //  確保 /api/diag 中的 manifestMissingOnDisk 反映真實情況（=0）
 cleanedManifest = regeneratedManifest;
 cleanedManifestMissing = 0;
 cleanedManifestOriginal = Object.keys(regeneratedManifest || {}).length;

 // v3.1.3：把地圖配置複製到公開目錄 assets/maps/，讓客戶端可直接 fetch
 //  與 /api/map/:mapId 形成雙重備份，確保一定能讀到地圖配置
 (function copyMapsToPublic() {
   try {
     if (!fs.existsSync(MAPS_DIR)) { console.log('[Maps] MAPS_DIR 不存在，跳過複製'); return; }
     if (!fs.existsSync(PUBLIC_MAPS_DIR)) fs.mkdirSync(PUBLIC_MAPS_DIR, { recursive: true });
     const files = fs.readdirSync(MAPS_DIR).filter(f => f.endsWith('.json'));
     let copied = 0;
     for (const f of files) {
       const src = path.join(MAPS_DIR, f);
       const dst = path.join(PUBLIC_MAPS_DIR, f);
       try {
         fs.copyFileSync(src, dst);
         copied++;
       } catch(e) { console.warn('[Maps] 複製失敗:', f, e.message); }
     }
     console.log('[Maps] 已複製 ' + copied + ' 個地圖配置到 assets/maps/');
   } catch(e) {
     console.warn('[Maps] 複製地圖配置失敗:', e.message);
   }
 })();
 function countFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
    for (const ent of entries) {
      if (ent.isDirectory()) walk(path.join(d, ent.name));
      else n++;
    }
  }
  walk(dir);
  return n;
}

// 確保 data 目錄存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ========== 資料存儲層（v2.3.4：Postgres / JSON 自動切換） ==========
const db = require('./db-layer.cjs');
// 密碼雜湊
function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd + '::sword_lineage_v2_salt').digest('hex');
}
// 產生 token
function genToken(account) {
  const rand = crypto.randomBytes(16).toString('hex');
  const ts = Date.now();
  const payload = Buffer.from(JSON.stringify({ a: account, t: ts, r: rand })).toString('base64');
  const sig = crypto.createHash('sha256').update(payload + '::token_secret_v2').digest('hex').slice(0, 16);
  return payload + '.' + sig;
}
function verifyToken(token) {
  try {
    const [payload, sig] = token.split('.');
    const expected = crypto.createHash('sha256').update(payload + '::token_secret_v2').digest('hex').slice(0, 16);
    if (sig !== expected) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    // 7 天過期
    if (Date.now() - data.t > 7 * 24 * 3600 * 1000) return null;
    return data.a;
  } catch (e) { return null; }
}

// ========== 線上玩家狀態（Socket.IO 用） ==========
const onlinePlayers = new Map(); // socketId -> { account, name, serverId, mapId, ... }


// ========== Long-Poll 多人連線狀態 ==========
// v2.4.0：零依賴 HTTP long-polling 實現真·多人同步
// v2.6.0：按 serverId 隔離（不同伺服器完全獨立世界）
const MP_POLL_TIMEOUT = 25000; // 25s long-poll 超時
const MP_IDLE_TIMEOUT = 30000; // 30s 沒 update 踢離線
const MP_MAX_PLAYERS_PER_MAP = 200;

/** 地圖玩家狀態：key = "serverId:mapId" -> Map(playerId -> state) */
const mpMapStates = new Map();
/** 等待中的 poll 請求：key = "serverId:mapId" -> [{ res, since, playerId }] */
const mpPollWaiters = new Map();
/** 每個 server 的線上玩家計數：serverId -> number */
const mpServerPlayers = new Map();
/** 全服廣播歷史（最新 50 條） */
const mpBroadcasts = [];

function mpKey(serverId, mapId) {
  return (serverId || 'default') + ':' + (mapId || 'default');
}

function getMapState(serverId, mapId) {
  const key = mpKey(serverId, mapId);
  if (!mpMapStates.has(key)) mpMapStates.set(key, new Map());
  return mpMapStates.get(key);
}

// v2.7.9：事件佇列模型，確保 long-poll 絕不漏事件
//  - 每張 map 維護一個 events 陣列（append-only，定期裁掉 5 秒以上的舊事件）
//  - notifyMapUpdate 改成 append 事件並喚醒所有 waiters
//  - poll 回應時：drain queue（since 之後的所有事件）+ 完整 players/ais 快照
//  - 客戶端以快照為真相、事件僅用於插值補償
const mpEventQueues = new Map(); // key -> [{...event}]
function getEventQueue(serverId, mapId) {
  const key = mpKey(serverId, mapId);
  let q = mpEventQueues.get(key);
  if (!q) { q = []; mpEventQueues.set(key, q); }
  return q;
}

function notifyMapUpdate(serverId, mapId, event) {
  const key = mpKey(serverId, mapId);
  const q = getEventQueue(serverId, mapId);
  q.push(event);
  // 簡易裁減：超過 200 筆時刪掉舊的一半（避免記憶體無限長）
  if (q.length > 200) q.splice(0, q.length - 200);
  // 喚醒所有在此等待的 long-poll
  const waiters = mpPollWaiters.get(key) || [];
  const currentAIs = wsServer.getAIList(serverId, mapId);
  const now = Date.now();
  const bcasts = mpBroadcasts.filter(b => b.time > now - 5000);
  // 取得當前地圖所有玩家狀態（快照）
  const mapState = mpMapStates.get(key) || new Map();
  const players = [];
  for (const [pid, s] of mapState) players.push(s);
  const stillWaiting = [];
  for (const w of waiters) {
    // 收集 since 之後的所有事件
    const since = w.since || 0;
    const evts = [];
    for (let i = q.length - 1; i >= 0; i--) {
      if ((q[i].time || 0) <= since) break;
      // 自己的 move 事件不推回給自己
      if (q[i].playerId === w.playerId && q[i].type === 'move') continue;
      evts.unshift(q[i]);
    }
    if (evts.length > 0) {
      // 有新事件，立即回應
      try {
        w.res.end(JSON.stringify({
          ok: true,
          events: evts,
          ais: currentAIs,
          players,
          broadcasts: bcasts,
          time: now,
          timeout: false,
        }));
      } catch(e) {}
    } else {
      stillWaiting.push(w);
    }
  }
  mpPollWaiters.set(key, stillWaiting);
}

function mpCleanupIdle() {
  const now = Date.now();
  const serverCounts = {};
  for (const [key, players] of mpMapStates) {
    const [srvId] = key.split(':');
    for (const [pid, p] of players) {
      if (now - p.lastUpdate > MP_IDLE_TIMEOUT) {
        players.delete(pid);
        notifyMapUpdate(srvId, key.slice(srvId.length + 1), { type: 'leave', playerId: pid, time: now });
      } else {
        serverCounts[srvId] = (serverCounts[srvId] || 0) + 1;
      }
    }
    // 空的地圖狀態清理
    if (players.size === 0) mpMapStates.delete(key);
  }
  recomputeMpServerCounts();
}

/** 重新計算每個 server 的線上人數（從 mpMapStates 合計） */
function recomputeMpServerCounts() {
  const serverCounts = {};
  for (const [key, players] of mpMapStates) {
    const srvId = key.split(':')[0];
    serverCounts[srvId] = (serverCounts[srvId] || 0) + players.size;
  }
  mpServerPlayers.clear();
  for (const [srvId, count] of Object.entries(serverCounts)) {
    mpServerPlayers.set(srvId, count);
  }
  // v2.7.0：同步 onlinePlayers（只保留活躍的 long-poll + socket 玩家）
  // 從 mpMapStates 收集所有活躍 long-poll 玩家
  const lpPlayers = new Set();
  for (const [key, players] of mpMapStates) {
    const srvId = key.split(':')[0];
    const mapId = key.split(':').slice(1).join(':');
    for (const [pid, st] of players) {
      lpPlayers.add(pid);
      const acc = pid.split(':')[0];
      // 更新或新增
      if (!onlinePlayers.has(pid)) {
        onlinePlayers.set(pid, {
          socketId: 'lp:' + pid,
          account: acc,
          name: st.name || acc,
          serverId: srvId,
          mapId,
          level: st.level || 1,
          transport: 'long-poll',
        });
      } else {
        const p = onlinePlayers.get(pid);
        p.lastSeen = Date.now();
        if (st.name) p.name = st.name;
        if (st.level) p.level = st.level;
      }
    }
  }
  // 清除已經不在 map 裡的 long-poll 玩家（socket 的由 socket 事件管理）
  for (const [k, v] of onlinePlayers) {
    if (v.transport === 'long-poll' && !lpPlayers.has(k)) {
      onlinePlayers.delete(k);
    }
  }
}
setInterval(mpCleanupIdle, 5000);

// ========== 多人連線 API 處理 ==========
async function handleMpApi(req, res, pathname, query, account) {
  if (!account) { sendJson(res, 401, { error: '未登入' }); return; }

  // POST /api/mp/join 加入世界（帶 serverId，按伺服器隔離）
  if (req.method === 'POST' && pathname === '/api/mp/join') {
    const body = await parseJsonBody(req);
    const mapId = body.mapId || 'village_01';
    const serverId = body.serverId || 'zeus';
    const charIdx = body.charIdx ?? 0;
    // v2.8.1：確保 playerId 以 token 帳號為前綴（防止 token 被替換後冒用其他帳號的 playerId）
    //  body 若有 playerId 僅作為 client 偵錯用，正式以 token + charIdx 為準
    if (!account) { sendJson(res, 401, { error: '未登入' }); return; }
    try {
      // 校驗伺服器存在且狀態為 open
      const srv = await db.getServer(serverId);
      if (!srv) { sendJson(res, 404, { error: '伺服器不存在' }); return; }
      if (srv.status !== 'open') { sendJson(res, 403, { error: '伺服器未開放', status: srv.status }); return; }
      
      const charData = await db.getCharacter(account, serverId, charIdx);
      if (!charData || (!charData.save_data && !charData.player && !charData.name)) { sendJson(res, 404, { error: '角色不存在' }); return; }
      const sd = charData.save_data || charData;
      const playerId = account + ':' + charIdx;
      const state = {
        playerId,
        account,
        charIdx,
        serverId,
        name: sd.player ? sd.player.name : account,
        level: sd.player ? sd.player.level : 1,
        classId: sd.player ? sd.player.classId : 'warrior',
        mapId,
        x: sd.player ? sd.player.x || 400 : 400,
        y: sd.player ? sd.player.y || 400 : 400,
        dir: sd.player ? sd.player.dir || 'down' : 'down',
        hp: sd.player ? sd.player.hp || 100 : 100,
        maxHp: sd.player ? sd.player.maxHp || 100 : 100,
        transformId: sd.transformId || null,
        lastUpdate: Date.now(),
      };
      const mapState = getMapState(serverId, mapId);
      if (mapState.size >= MP_MAX_PLAYERS_PER_MAP) { sendJson(res, 503, { error: '地圖已滿' }); return; }
      mapState.set(playerId, state);
      // v2.7.0：同步到全服線上列表（給 GM 概況用）
      onlinePlayers.set(playerId, {
        socketId: 'lp:' + playerId,
        account,
        name: state.name,
        serverId,
        mapId,
        level: state.level,
        lastSeen: Date.now(),
        transport: 'long-poll',
      });
      recomputeMpServerCounts();
      notifyMapUpdate(serverId, mapId, { type: 'join', playerId, state, time: Date.now() });
      // v2.8.0：LP 玩家加入也通知 WS 玩家（雙通道同屏，修復兩機互看不見）
      if (wsServer && wsServer.broadcastToMap) {
        try {
          wsServer.broadcastToMap(serverId, mapId, {
            type: 'player_join',
            playerId: playerId,
            name: state.name,
            classId: state.classId,
            level: state.level,
            x: state.x, y: state.y, dir: state.dir,
            hp: state.hp, maxHp: state.maxHp,
            transformId: state.transformId,
            transport: 'longpoll',
            time: Date.now(),
          });
        } catch(e) { console.warn('[LP→WS] join 廣播失敗:', e.message); }
      }
      // 返回當前地圖所有玩家（不含自己）
      const others = [];
      for (const [pid, s] of mapState) {
        if (pid !== playerId) others.push(s);
      }
      // v2.7.3：先確保 AI 已生成（同步等待，從持久化載入或按設定生成），再返回
      //  避免第一個玩家拿到空 AI、第二個玩家才有（偽線上症狀的主因）
      // v2.7.9：不論現有多少 AI，一律 ensureAIForMap 校準到 GM 設定的 aiCount
      //  （舊版只有 ais.length===0 才呼叫，導致載入 5 隻就永遠補不到 8）
      try {
        const srv = await db.getServer(serverId);
        let cnt = 8, lv = 1, source = 'default';
        if (srv) {
          cnt = srv.aiCount != null ? parseInt(srv.aiCount) : 8;
          lv = srv.initLevel != null ? parseInt(srv.initLevel) : 1;
          source = 'server_config';
        }
        const before = wsServer.getAIList(serverId, mapId).length;
        await wsServer.ensureAIForMap(serverId, mapId, cnt, lv);
        ais = wsServer.getAIList(serverId, mapId);
        console.log(`[Join-AI] ${serverId}:${mapId} aiCount=${cnt}（來源:${source}） 載入前=${before} → 載入後=${ais.length}`);
      } catch(e) {
        console.warn('[Join] AI 初始化失敗:', e.message);
        ais = wsServer.getAIList(serverId, mapId);
      }
      sendJson(res, 200, { ok: true, playerId, players: others, others, ais, mapId, serverId, instanceId: SERVER_INSTANCE_ID, time: Date.now() });
    } catch(e) {
      sendJson(res, 500, { error: e.message });
    }
    return;
  }

  // POST /api/mp/leave 離開
  if (req.method === 'POST' && pathname === '/api/mp/leave') {
    const body = await parseJsonBody(req);
    const mapId = body.mapId;
    const serverId = body.serverId || 'zeus';
    const charIdx = body.charIdx ?? 0;
    const playerId = account + ':' + charIdx;
    const key = mpKey(serverId, mapId);
    if (mapId && mpMapStates.has(key)) {
      mpMapStates.get(key).delete(playerId);
      notifyMapUpdate(serverId, mapId, { type: 'leave', playerId, time: Date.now() });
      // v2.8.0：LP 玩家離開也通知 WS 玩家（雙向同步）
      if (wsServer && wsServer.broadcastToMap) {
        try {
          wsServer.broadcastToMap(serverId, mapId, {
            type: 'player_leave',
            playerId: playerId,
            transport: 'longpoll',
            time: Date.now(),
          });
        } catch(e) {}
      }
    }
    // v2.7.0：從線上列表移除
    onlinePlayers.delete(playerId);
    recomputeMpServerCounts();
    sendJson(res, 200, { ok: true });
    return;
  }

  // POST /api/mp/update 上傳自身狀態
  // v2.8.0：同時支援 /api/mp/move（客戶端約定別名）與 /api/mp/update
  if (req.method === 'POST' && (pathname === '/api/mp/update' || pathname === '/api/mp/move')) {
    const body = await parseJsonBody(req);
    const mapId = body.mapId;
    const serverId = body.serverId || 'zeus';
    const charIdx = body.charIdx ?? 0;
    const playerId = account + ':' + charIdx;
    if (!mapId) { sendJson(res, 400, { error: '缺少 mapId' }); return; }
    const mapState = getMapState(serverId, mapId);
    const state = mapState.get(playerId);
    if (!state) { sendJson(res, 401, { error: '未加入此地圖，請先 join' }); return; }
    // 更新狀態
    if (body.x != null) state.x = body.x;
    if (body.y != null) state.y = body.y;
    if (body.dir != null) state.dir = body.dir;
    if (body.hp != null) state.hp = body.hp;
    if (body.transformId != null) state.transformId = body.transformId;
    state.lastUpdate = Date.now();
    // 廣播給其他 LP 玩家
    notifyMapUpdate(serverId, mapId, {
      type: 'move',
      playerId,
      name: state.name,
      x: state.x, y: state.y, dir: state.dir,
      hp: state.hp, transformId: state.transformId,
      time: Date.now(),
    });
    // v2.7.9：也廣播給 WS 玩家（LP↔WS 雙通道同屏）
    if (wsServer && wsServer.broadcastToMap) {
      try {
        wsServer.broadcastToMap(serverId, mapId, {
          type: 'player_move',
          playerId,
          name: state.name,
          classId: state.classId,
          level: state.level,
          x: state.x, y: state.y, dir: state.dir,
          hp: state.hp,
          transformId: state.transformId,
          time: Date.now(),
          transport: 'longpoll',
        });
      } catch(e) {}
    }
    sendJson(res, 200, { ok: true, time: Date.now() });
    return;
  }

  // GET /api/mp/poll long-poll 拉取更新（按 serverId 隔離）
  // v2.7.9：事件佇列模型 — 以 since 為游標，回傳其後所有累積事件 + 完整快照
  if (req.method === 'GET' && pathname === '/api/mp/poll') {
    const mapId = query.mapId || query.map;
    const serverId = query.serverId || query.server || 'zeus';
    const charIdx = query.charIdx ? parseInt(query.charIdx) : 0;
    const playerId = account + ':' + charIdx;
    const since = query.since ? parseInt(query.since) : 0;
    if (!mapId) { sendJson(res, 400, { error: '缺少 map' }); return; }
    const key = mpKey(serverId, mapId);

    const buildResponse = (timeout) => {
      const q = getEventQueue(serverId, mapId);
      const now = Date.now();
      const events = [];
      // 收集 since 之後的所有事件（跳過自己的 move）
      for (let i = 0; i < q.length; i++) {
        const e = q[i];
        if ((e.time || 0) <= since) continue;
        if (e.playerId === playerId && e.type === 'move') continue;
        events.push(e);
      }
      const bcasts = mpBroadcasts.filter(b => b.time > since);
      const currentAIs = wsServer.getAIList(serverId, mapId);
      const mapState = mpMapStates.get(key) || new Map();
      const players = [];
      for (const [pid, s] of mapState) {
        if (pid !== playerId) players.push(s);
      }
      try {
        res.end(JSON.stringify({
          ok: true,
          events,
          players,
          ais: currentAIs,
          broadcasts: bcasts,
          time: now,
          timeout: !!timeout,
        }));
      } catch(e) {}
    };

    const q = getEventQueue(serverId, mapId);
    // 若已經有 since 之後的新事件，立即回傳不等待
    const hasNew = q.some(e => (e.time || 0) > since && !(e.playerId === playerId && e.type === 'move'));
    if (hasNew) {
      buildResponse(false);
      return;
    }

    // 否則進入等待佇列
    if (!mpPollWaiters.has(key)) mpPollWaiters.set(key, []);
    const waiters = mpPollWaiters.get(key);
    const entry = { res, since, playerId, startTime: Date.now() };
    waiters.push(entry);
    // 超時回應（帶最新快照，讓客戶端保持同步）
    setTimeout(() => {
      const idx = waiters.indexOf(entry);
      if (idx >= 0) {
        waiters.splice(idx, 1);
        buildResponse(true);
      }
    }, MP_POLL_TIMEOUT);
    // 有新廣播也立刻回
    if (mpBroadcasts.some(b => b.time > since)) {
      const idx = waiters.indexOf(entry);
      if (idx >= 0) {
        waiters.splice(idx, 1);
        buildResponse(false);
      }
    }
    return;
  }

  // POST /api/mp/chat 聊天
  if (req.method === 'POST' && pathname === '/api/mp/chat') {
    const body = await parseJsonBody(req);
    const mapId = body.mapId;
    const serverId = body.serverId || 'zeus';
    const charIdx = body.charIdx ?? 0;
    const playerId = account + ':' + charIdx;
    const channel = body.channel || 'map';
    const text = (body.text || '').slice(0, 200);
    if (!mapId || !text) { sendJson(res, 400, { error: '參數錯誤' }); return; }
    const mapState = getMapState(serverId, mapId);
    const state = mapState.get(playerId);
    if (!state) { sendJson(res, 401, { error: '未加入' }); return; }
    const chatEvent = {
      type: 'chat',
      playerId,
      name: state.name,
      channel,
      text,
      time: Date.now(),
    };
    notifyMapUpdate(serverId, mapId, chatEvent);
    sendJson(res, 200, { ok: true });
    return;
  }

  // POST /api/mp/attack 廣播攻擊動畫
  if (req.method === 'POST' && pathname === '/api/mp/attack') {
    const body = await parseJsonBody(req);
    const mapId = body.mapId;
    const serverId = body.serverId || 'zeus';
    const charIdx = body.charIdx ?? 0;
    const playerId = account + ':' + charIdx;
    const targetId = body.targetId;
    if (!mapId) { sendJson(res, 400, { error: '缺少 mapId' }); return; }
    const mapState = getMapState(serverId, mapId);
    if (!mapState.has(playerId)) { sendJson(res, 401, { error: '未加入' }); return; }
    // v2.7.5：伺服器端 AI 傷害權威處理（targetId 若為 AI 則扣血並廣播）
    const dmg = Math.max(0, Math.floor(body.damage || 0));
    const isAI = targetId && targetId.startsWith && targetId.startsWith('ai_');
    if (isAI && wsServer && typeof wsServer.damageAI === 'function') {
      wsServer.damageAI(serverId, mapId, targetId, dmg, playerId);
    }
    notifyMapUpdate(serverId, mapId, {
      type: 'attack',
      playerId,
      targetId,
      skillId: body.skillId || 0,
      damage: dmg,
      isAITarget: isAI,
      time: Date.now(),
    });
    sendJson(res, 200, { ok: true, serverAuthoritative: isAI });
    return;
  }

  sendJson(res, 404, { error: '未知 API' });
}

// ========== MIME 類型 ==========
function getMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.zip': 'application/zip',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.cjs': 'application/javascript; charset=utf-8',
  };
  return map[ext] || 'application/octet-stream';
}

// ========== HTTP 工具 ==========
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) { reject(new Error('payload too large')); req.destroy(); return; }
      body += chunk;
    });
    req.on('end', () => {
      if (!body) { resolve({}); return; }
      try { resolve(JSON.parse(body)); }
      catch (e) { reject(new Error('invalid json')); }
    });
    req.on('error', reject);
  });
}
function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', Buffer.byteLength(body));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!res.getHeader('Access-Control-Allow-Origin')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-dev-password');
  }
  res.writeHead(status);
  res.end(body);
}

// ========== 身分驗證 ==========
async function getAuthAccount(req) {
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Bearer ')) return null;
  const acc = verifyToken(auth.slice(7));
  if (!acc) return null;
  // 封禁檢查：被 ban 帳號直接失效
  const accData = await db.getAccount(acc);
  if (!accData || accData.banned || (accData.meta && accData.meta.banned)) return null;
  return acc;
}

// ========== 靜態檔案 ==========
function serveStatic(req, res, pathname) {
  if (pathname.includes('..') || pathname.startsWith('/data/') || pathname.startsWith('/server/') ||
      pathname.startsWith('/.git/') || pathname.startsWith('/.agent/') || pathname.startsWith('/.spark/')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  let decoded = decodeURIComponent(pathname);
  let filePath = path.join(ROOT_DIR, decoded);

  if (pathname === '/gm' || pathname === '/gm/') {
    filePath = path.join(ROOT_DIR, 'gm.html');
  } else if (pathname === '/' || pathname === '') {
    filePath = path.join(ROOT_DIR, 'index.html');
  }

  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch (e) { /* ignore */ }

  // v2.4.0-patch：檔案不存在時，若為 /assets/* 則嘗試大小寫對照表備查
  if (!fs.existsSync(filePath) && decoded.toLowerCase().startsWith('/assets/')) {
    const rel = decoded.slice(8).toLowerCase(); // 去掉 /assets/
    const real = assetIndex.get(rel);
    if (real) {
      filePath = path.join(ASSETS_DIR, real);
    }
  }

  if (!fs.existsSync(filePath)) {
    // API 路徑 404 → 回 JSON；靜態頁 404 → 回 HTML
    if (pathname.startsWith('/api/')) {
      return sendJson(res, 404, { error: 'API Not Found' });
    }
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<!DOCTYPE html><html><head><meta charset="utf-8"><title>404</title></head><body>Not Found</body></html>');
    return;
  }

  try {
    const stat = fs.statSync(filePath);
    const mime = getMime(filePath);
    // v2.4.0：HTML/JS/CSS/JSON/manifest 一律 no-cache，避免手機/CDN舊快取導致版本不一致
    const isStaticAsset = pathname.endsWith('.png') || pathname.endsWith('.jpg') || pathname.endsWith('.jpeg') || pathname.endsWith('.gif') || pathname.endsWith('.webp') || pathname.endsWith('.svg') || pathname.endsWith('.mp3') || pathname.endsWith('.wav') || pathname.endsWith('.ogg') || pathname.endsWith('.mp4') || pathname.endsWith('.woff') || pathname.endsWith('.woff2') || pathname.endsWith('.ttf');
    const headers = {
      'Content-Type': mime,
      'Content-Length': stat.size,
      'Cache-Control': isStaticAsset ? 'public, max-age=86400' : 'no-cache, no-store, must-revalidate, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Pragma': 'no-cache',
      'Expires': '0',
    };
    // 隱藏原始碼下載：以不易猜到的檔名提供，並強制下載
    if (pathname === '/mb-src-q7x2k9.zip') {
      headers['Content-Disposition'] = 'attachment; filename="monarch-blade-v2.1.2-source.zip"';
      headers['Content-Type'] = 'application/zip';
      headers['X-Accel-Buffering'] = 'yes';
    }
    // v2.4.0：分卷資產 + 程式碼小包，直接可下載
    const dlFiles = {
      '/game-code.zip': 'monarch-blade-v2.6.0-code.zip',
      '/game-code-2.6.0.zip': 'monarch-blade-v2.6.0-code.zip',
      '/update-2.6.0-code.zip': 'update-2.6.0-code.zip',
      '/game-code-2.5.9.zip': 'monarch-blade-v2.5.9-code.zip',
      '/update-2.5.9-code.zip': 'update-2.5.9-code.zip',
      '/game-code-2.5.8.zip': 'monarch-blade-v2.5.8-code.zip',
      '/update-2.5.8-code.zip': 'update-2.5.8-code.zip',
      '/game-code-2.5.7.zip': 'monarch-blade-v2.5.7-code.zip',
      '/update-2.5.7-classassets.zip': 'update-2.5.7-classassets.zip',
      '/update-2.5.7-code.zip': 'update-2.5.7-code.zip',
      '/game-code-2.5.6.zip': 'monarch-blade-v2.5.6-code.zip',
      '/assets-part1.zip': 'monarch-blade-v2.5.6-assets-part1.zip',
      '/assets-part2.zip': 'monarch-blade-v2.5.6-assets-part2.zip',
    };
    if (dlFiles[pathname]) {
      headers['Content-Disposition'] = 'attachment; filename="' + dlFiles[pathname] + '"';
      headers['Content-Type'] = 'application/zip';
      headers['X-Accel-Buffering'] = 'yes';
    }
    if (pathname === '/PARTS-MANIFEST.txt') {
      headers['Content-Disposition'] = 'attachment; filename="PARTS-MANIFEST-v2.5.6.txt"';
    }
    res.writeHead(200, headers);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on('error', () => { res.writeHead(500); res.end('Internal Server Error'); });
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
}

// ========== API 處理 ==========
async function handleApi(req, res, pathname, query) {
  // CORS
  const origin = req.headers.origin || '';
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-dev-password');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // === 健康檢查（永遠回 JSON 200）===
  // 用於前端連線判定：確認此伺服器真的是 monarch-blade 營運伺服器
  if (req.method === 'GET' && pathname === '/api/health') {
    const assetCount = assetIndex.size;
    const backend = db.getBackend();
    const dbErr = db.getLastError ? db.getLastError() : null;
    // v3.0.0：線上人數明細（WS + LP 分開計，總數去重）
    let wsCount = 0, lpCount = 0;
    try { wsCount = (wsServer && typeof wsServer.getOnlineCount === 'function') ? wsServer.getOnlineCount() : 0; } catch(e) {}
    try { lpCount = onlinePlayers ? onlinePlayers.size : 0; } catch(e) {}
    const uniqueAccounts = new Set();
    try {
      if (wsServer && typeof wsServer.getOnlinePlayers === 'function') {
        for (const c of wsServer.getOnlinePlayers()) { if (c.account) uniqueAccounts.add(c.account); }
      }
    } catch(e) {}
    for (const p of onlinePlayers.values()) { uniqueAccounts.add(p.account); }
    const onlineCount = uniqueAccounts.size;

     return sendJson(res, 200, {
       status: 'online',
       server: 'monarch-blade',
      version: '4.1.8',
      build: '4.1.8-2609012300',
      buildId: '4.1.8-2609012300',
      instanceId: SERVER_INSTANCE_ID,
      startTime: SERVER_START_TIME,
      time: Date.now(),
      socketIo: false,
      webSocket: true,
      wsTransportPath: '/',
      longPoll: true,
      wsCount,
      lpCount,
      onlineCount,
      dbBackend: backend,
      dbError: dbErr,
      assetCount: assetCount,
      assetsReady: assetCount > 100,
    });
  }

  // === 多人連線 API（long-poll，v2.4.0）===
  if (pathname.startsWith('/api/mp/')) {
    // v3.5.2：公開的HTTP認證端點（使用parseJsonBody，增加詳細日誌）
    if (req.method === 'POST' && pathname === '/api/mp/auth') {
      console.log('[AUTH-HTTP] 收到請求, method=' + req.method + ' path=' + pathname);
      try {
        const data = await parseJsonBody(req);
        console.log('[AUTH-HTTP] 解析body成功, token長度=' + (data.token ? data.token.length : 0));
        const token = data.token || '';
        const account = global._wsVerifyToken ? global._wsVerifyToken(token) : null;
        console.log('[AUTH-HTTP] verifyToken結果=' + (account || 'null'));
        if (!account) {
          console.log('[AUTH-HTTP] 返回401 token無效');
          sendJson(res, 401, { error: 'token無效', ok: false });
          return;
        }
        const sessionId = 's' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
        if (!global._wsSessions) global._wsSessions = new Map();
        global._wsSessions.set(sessionId, {
          account: account,
          name: data.name || 'Player',
          classId: data.classId || 'warrior',
          level: data.level || 1,
          createdAt: Date.now(),
        });
        setTimeout(() => { if (global._wsSessions) global._wsSessions.delete(sessionId); }, 10 * 60 * 1000);
        console.log('[AUTH-HTTP] 成功 account=' + account + ' sessionId=' + sessionId);
        sendJson(res, 200, { ok: true, sessionId: sessionId });
        return;
      } catch(e) {
        console.log('[AUTH-HTTP] 異常: ' + e.message);
        sendJson(res, 400, { error: e.message, ok: false });
        return;
      }
    }
    const account = await getAuthAccount(req);
    await handleMpApi(req, res, pathname, query, account);
    return;
  }

   // v3.1.3：地圖配置 API — 讀取 server/maps/map_${mapId}.json
   //  解決地圖配置放在 server/maps/ 非公開目錄，客戶端 fetch 不到的問題
   if (req.method === 'GET' && pathname.startsWith('/api/map/')) {
     const mapId = pathname.substring('/api/map/'.length).replace(/[^a-zA-Z0-9_-]/g, '');
     if (!mapId) {
       res.statusCode = 400;
       res.end(JSON.stringify({ error: 'mapId 為空' }));
       return;
     }
     const mapPath = path.join(MAPS_DIR, 'map_' + mapId + '.json');
     if (!fs.existsSync(mapPath)) {
       res.statusCode = 404;
       res.setHeader('Content-Type', 'application/json; charset=utf-8');
       res.end(JSON.stringify({ error: '地圖不存在: ' + mapId }));
       return;
     }
     try {
       const raw = fs.readFileSync(mapPath, 'utf8');
       res.statusCode = 200;
       res.setHeader('Content-Type', 'application/json; charset=utf-8');
       res.setHeader('Cache-Control', 'public, max-age=3600');
       res.end(raw);
     } catch(e) {
       res.statusCode = 500;
       res.end(JSON.stringify({ error: '讀取地圖失敗: ' + e.message }));
     }
     return;
   }

   // 診斷 API：回傳 cwd / 資產路徑 / 檔案數 / manifest 核對 / 樣本檔存在性，方便 DO 上除錯
   // GET /api/ws-diag — WS 診斷日誌（v3.1.9，讀取全域緩衝區）
  if (req.method === 'GET' && pathname === '/api/ws-diag') {
    try {
      const logs = global._wsDiagLogs || [];
      sendJson(res, 200, { ok: true, logs: logs.slice(-50), count: logs.length });
    } catch(e) {
      sendJson(res, 500, { error: e.message });
    }
    return;
  }

  if (req.method === 'GET' && pathname === '/api/diag') {
    const sampleRel = '1YPfWK8cKg.png';
    const samplePath = path.join(ASSETS_DIR, sampleRel);
    const sampleExists = fs.existsSync(samplePath);
    // 巢狀子資料夾樣本（deep sample）
    const deepSampleRel = 'class/warrior/attack.jpg';
    const deepSamplePath = path.join(ASSETS_DIR, deepSampleRel);
    const deepSampleExists = fs.existsSync(deepSamplePath);
    const hashSampleRel = 'boss/0yfRk9msfe.jpg'; // manifest 中典型 hash 檔
    const hashSamplePath = path.join(ASSETS_DIR, hashSampleRel);
    const hashSampleExists = fs.existsSync(hashSamplePath);

     // manifest 核對（使用清理後的版本）
     let manifestReferenced = 0;
     let manifestMissingOnDisk = 0;
     let manifestOriginal = 0;
     let manifestMissingSamples = [];
     const manifestPath = path.join(ASSETS_DIR, 'assets-manifest.json');
     let manifestExistsOnDisk = fs.existsSync(manifestPath);
     let manifestLoadedOk = false;
     let manifestSize = 0;
     let clientAssetBase = '/assets/ (相對)';
     let manifestCleanedCount = 0;
     try {
       if (manifestExistsOnDisk) {
         const raw = fs.readFileSync(manifestPath, 'utf8');
         manifestSize = raw.length;
         const m = JSON.parse(raw);
         manifestLoadedOk = true;
         manifestReferenced = Object.keys(m).length;
         manifestOriginal = manifestReferenced;
         // v3.1.1：使用已清理的 manifest 統計
         if (cleanedManifest) {
           manifestCleanedCount = Object.keys(cleanedManifest).length;
           manifestMissingOnDisk = manifestOriginal - manifestCleanedCount;
         } else {
           for (const key of Object.keys(m)) {
             const v = m[key];
             const full = path.join(ROOT_DIR, v);
             if (!fs.existsSync(full)) {
               manifestMissingOnDisk++;
               if (manifestMissingSamples.length < 10) manifestMissingSamples.push(v);
             }
           }
         }
         // 收集缺失樣本
         if (cleanedManifest && manifestMissingOnDisk > 0 && manifestMissingSamples.length === 0) {
           const cleanSet = new Set(Object.keys(cleanedManifest));
           let count = 0;
           for (const key of Object.keys(m)) {
             if (!cleanSet.has(key)) {
               manifestMissingSamples.push(m[key]);
               if (++count >= 10) break;
             }
           }
         }
       }
     } catch (e) {
       manifestLoadedOk = false;
     }

    // v2.7.3：實例與多人連線概況
    const uptime = Date.now() - SERVER_START_TIME;
    const serverSummaries = {};
    try {
      // 遍歷 WS 端所有活躍地圖
      const wsOnline = wsServer.getOnlinePlayers();
      const serverMapCounts = {}; // serverId -> { online, maps: { mapId: { players, ais } } }
      for (const p of wsOnline) {
        if (!serverMapCounts[p.serverId]) serverMapCounts[p.serverId] = { online: 0, maps: {} };
        serverMapCounts[p.serverId].online++;
        if (!serverMapCounts[p.serverId].maps[p.mapId]) {
          serverMapCounts[p.serverId].maps[p.mapId] = { wsPlayers: 0, lpPlayers: 0, aiCount: 0 };
        }
        serverMapCounts[p.serverId].maps[p.mapId].wsPlayers++;
      }
      // LP 玩家（從 mpMapStates 數）
      for (const [key, state] of mpMapStates.entries()) {
        const [srv, mapId] = key.split(':');
        if (!serverMapCounts[srv]) serverMapCounts[srv] = { online: 0, maps: {} };
        if (!serverMapCounts[srv].maps[mapId]) {
          serverMapCounts[srv].maps[mapId] = { wsPlayers: 0, lpPlayers: 0, aiCount: 0 };
        }
        serverMapCounts[srv].maps[mapId].lpPlayers = state.size;
        serverMapCounts[srv].online += state.size;
      }
      // AI 數（從 wsServer 取）
      for (const [srv, info] of Object.entries(serverMapCounts)) {
        for (const mapId of Object.keys(info.maps)) {
          info.maps[mapId].aiCount = wsServer.getAIList(srv, mapId).length;
        }
        info.totalPlayers = info.online;
        serverSummaries[srv] = info;
      }
    } catch(e) { /* 忽略彙整錯誤 */ }

    return sendJson(res, 200, {
      version: '2.7.3',
      build: '2.7.3-2608292300',
      buildId: '2.7.3-2608292300',
       version: '2.8.1',
       build: '2.8.1-2608302000',
       buildId: '2.8.2-2608302300',
       instanceId: SERVER_INSTANCE_ID,
       startTime: SERVER_START_TIME,
       uptimeMs: uptime,
       uptime: Math.floor(uptime / 1000) + 's',
       cwd: process.cwd(),
       serverFile: __filename,
       rootDir: ROOT_DIR,
       assetsRoot: ASSETS_DIR,
       assetsExists: fs.existsSync(ASSETS_DIR),
       assetFileCount: assetIndex.size,
       dbBackend: db.getBackend(),
       dbError: db.getLastError ? db.getLastError() : null,
       sampleAsset: '/assets/' + sampleRel,
       sampleAssetExists: sampleExists,
       deepSampleAsset: '/assets/' + deepSampleRel,
       deepSampleAssetExists: deepSampleExists,
       hashSampleAsset: '/assets/' + hashSampleRel,
       hashSampleAssetExists: hashSampleExists,
       clientAssetBase: clientAssetBase,
        manifestPath: manifestPath,
        manifestExistsOnDisk: manifestExistsOnDisk,
        manifestLoadedOk: manifestLoadedOk,
        manifestSizeBytes: manifestSize,
        manifestReferenced: manifestReferenced,
        manifestOriginalCount: manifestOriginal,
        manifestCleanedCount: manifestCleanedCount,
        manifestMissingOnDisk: manifestMissingOnDisk,
        manifestRegeneratedCount: regeneratedManifest ? Object.keys(regeneratedManifest).length : 0,
       manifestMissingSamples: manifestMissingSamples,
       dataDir: DATA_DIR,
       dataDirExists: fs.existsSync(DATA_DIR),
       aiDataDir: AI_DATA_DIR,
       port: PORT,
       nodeVersion: process.version,
       platform: process.platform,
       listenHost: '0.0.0.0',
        wsClientCount: wsServer.clientCount,
        wsAuthenticatedCount: wsServer.authenticatedCount,
        wsHandshakeOk: wsServer.handshakeOk !== false,
        wsLastError: wsServer.lastError || null,
        wsLastCloseCode: wsServer.lastCloseCode || null,
        wsLastCloseReason: wsServer.lastCloseReason || '',
        wsTotalConnections: wsServer.totalConnections || 0,
        wsKeepaliveEnabled: wsServer.keepaliveEnabled !== false,
        wsKeepaliveIntervalMs: wsServer.keepaliveIntervalMs || 0,
        wsKeepaliveTimeoutMs: wsServer.keepaliveTimeoutMs || 0,
        upgradeHandlerRegistered: true,
        wsUpgradeRequestCount: global._wsUpgradeCount || 0,
        wsUpgradeErrorCount: global._wsUpgradeErrors || 0,
       wsTransportPath: '/',
      servers: serverSummaries,
    });
  }

  // 自體檢查 API：免登入，伺服器端實跑 6 項檢查並回報 JSON
  if (req.method === 'GET' && pathname === '/api/selftest') {
    const checks = [];
    const overallStart = Date.now();

    // 1. server 基本資訊
    try {
      const t0 = Date.now();
      checks.push({
        name: 'server',
        pass: true,
        detail: { version: '2.7.0', uptimeMs: Math.floor(process.uptime() * 1000), platform: process.platform, nodeVersion: process.version, pid: process.pid },
        ms: Date.now() - t0,
      });
    } catch(e) {
      checks.push({ name: 'server', pass: false, detail: { error: e.message }, ms: 0 });
    }

    // 2. static / assets
    try {
      const t0 = Date.now();
      const assetsReady = fs.existsSync(ASSETS_DIR) && assetIndex.size > 0;
      const manifestPath = path.join(ASSETS_DIR, 'assets-manifest.json');
      const manifestExists = fs.existsSync(manifestPath);
      let manifestOk = false;
      let manifestRef = 0;
      let manifestMissing = 0;
      if (manifestExists) {
        try {
          const m = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          manifestRef = Object.keys(m).length;
          for (const k of Object.keys(m)) {
            if (!fs.existsSync(path.join(ROOT_DIR, m[k]))) manifestMissing++;
          }
          manifestOk = manifestMissing === 0;
        } catch(e) {}
      }
      checks.push({
        name: 'static',
        pass: assetsReady && manifestOk,
        detail: { assetCount: assetIndex.size, assetsDir: ASSETS_DIR, assetsReady, manifestExists, manifestReferenced: manifestRef, manifestMissing },
        ms: Date.now() - t0,
      });
    } catch(e) {
      checks.push({ name: 'static', pass: false, detail: { error: e.message }, ms: 0 });
    }

    // 3. db roundtrip：寫 temp → 讀 → 刪
    try {
      const t0 = Date.now();
      const backend = db.getBackend();
      const tempAcc = 'selftest_' + Math.random().toString(36).slice(2, 10);
      const tempPw = 'test_' + Math.random().toString(36).slice(2, 10);
      const wrote = await db.createAccount(tempAcc, hashPassword(tempPw), false);
      const readBack = wrote ? await db.getAccount(tempAcc) : null;
      const readOk = readBack && readBack.account === tempAcc;
      const deleted = readOk ? await db.deleteAccount(tempAcc) : false;
      const verifyDeleted = deleted ? !(await db.getAccount(tempAcc)) : false;
      const pass = wrote && readOk && deleted && verifyDeleted;
      const warning = backend === 'json' ? '使用 JSON 檔案後端（本機持久層）' : null;
      checks.push({
        name: 'db',
        pass,
        detail: { backend, wrote, readOk, deleted, verifyDeleted, warning },
        ms: Date.now() - t0,
      });
    } catch(e) {
      checks.push({ name: 'db', pass: false, detail: { error: e.message }, ms: 0 });
    }

    // 4. multiplayer long-poll 雙 client 同步測試
    try {
      const t0 = Date.now();
      const testMap = 'selftest_map_' + Math.random().toString(36).slice(2, 8);
      const testServer = 'zeus';
      const playerA = 'selftest_A_' + Math.random().toString(36).slice(2, 8);
      const playerB = 'selftest_B_' + Math.random().toString(36).slice(2, 8);

      const mapState = getMapState(testServer, testMap);
      // A 加入
      const stateA = {
        playerId: 'selftest:A', account: playerA, charIdx: 0,
        name: '測試A', level: 1, classId: 'warrior',
        mapId: testMap, x: 100, y: 100, dir: 'down', hp: 100, maxHp: 100,
        transformId: null, lastUpdate: Date.now(),
      };
      mapState.set('selftest:A', stateA);

      // B 加入
      const stateB = {
        playerId: 'selftest:B', account: playerB, charIdx: 0,
        name: '測試B', level: 1, classId: 'mage',
        mapId: testMap, x: 200, y: 200, dir: 'down', hp: 100, maxHp: 100,
        transformId: null, lastUpdate: Date.now(),
      };
      mapState.set('selftest:B', stateB);

      // 模擬 B 的 long-poll：建立一個 fake response
      let pollResult = null;
      const fakeRes = {
        end(data) {
          pollResult = data;
          return true;
        },
        setHeader() {},
        writeHead() {},
        write() {},
        getHeader() { return undefined; },
      };
      if (!mpPollWaiters.has(mpKey(testServer, testMap))) mpPollWaiters.set(mpKey(testServer, testMap), []);
      mpPollWaiters.get(mpKey(testServer, testMap)).push({
        res: fakeRes, since: 0, playerId: 'selftest:B', startTime: Date.now(),
      });

      // A 更新位置
      stateA.x = 512;
      stateA.y = 388;
      stateA.dir = 'left';
      stateA.lastUpdate = Date.now();
      notifyMapUpdate(testServer, testMap, {
        type: 'move',
        playerId: 'selftest:A',
        x: 512, y: 388, dir: 'left',
        hp: 100, transformId: null,
        time: Date.now(),
      });

      // 檢查 B 是否收到事件
      let receivedMove = false;
      let moveX = 0, moveY = 0, moveDir = '';
      if (pollResult) {
        try {
          const data = JSON.parse(pollResult);
          const events = data.events || [];
          const moveEvt = events.find(e => e.type === 'move' && e.playerId === 'selftest:A');
          if (moveEvt) {
            receivedMove = true;
            moveX = moveEvt.x;
            moveY = moveEvt.y;
            moveDir = moveEvt.dir;
          }
        } catch(e) {}
      }

      // 清理：兩人離開地圖
      mapState.delete('selftest:A');
      mapState.delete('selftest:B');
      notifyMapUpdate(testServer, testMap, { type: 'leave', playerId: 'selftest:A', time: Date.now() });
      notifyMapUpdate(testServer, testMap, { type: 'leave', playerId: 'selftest:B', time: Date.now() });
      if (mapState.size === 0) mpMapStates.delete(testMap);

      const pass = receivedMove && moveX === 512 && moveY === 388 && moveDir === 'left';
      checks.push({
        name: 'multiplayer',
        pass,
        detail: { testMap, receivedMove, moveX, moveY, moveDir, expectedX: 512, expectedY: 388, expectedDir: 'left' },
        ms: Date.now() - t0,
      });
    } catch(e) {
      checks.push({ name: 'multiplayer', pass: false, detail: { error: e.message, stack: e.stack?.split('\n')[0] }, ms: 0 });
    }

    // 5. auth roundtrip：註冊 temp → 登入 → /me → 刪除
    try {
      const t0 = Date.now();
      const tempAcc = 'selftest_auth_' + Math.random().toString(36).slice(2, 10);
      const tempPw = 'pw_' + Math.random().toString(36).slice(2, 12);

      // 註冊
      const registered = await db.createAccount(tempAcc, hashPassword(tempPw), false);

      // 登入（比對密碼）
      let loginOk = false;
      let token = null;
      if (registered) {
        const acc = await db.getAccount(tempAcc);
        if (acc && acc.passwordHash === hashPassword(tempPw)) {
          loginOk = true;
          token = genToken(tempAcc);
        }
      }

      // /me 等效：從 token 解析帳號並驗證存在
      let meOk = false;
      let meAccount = null;
      if (loginOk && token) {
        const decoded = verifyToken(token);
        if (decoded) {
          const acc2 = await db.getAccount(decoded);
          if (acc2) { meOk = true; meAccount = acc2.account; }
        }
      }

      // 刪除
      const deleted = meOk ? await db.deleteAccount(tempAcc) : false;
      const verifyDeleted = deleted ? !(await db.getAccount(tempAcc)) : false;

      const pass = registered && loginOk && meOk && meAccount === tempAcc && deleted && verifyDeleted;
      checks.push({
        name: 'auth',
        pass,
        detail: { account: tempAcc, registered, loginOk, meOk, meAccount, deleted, verifyDeleted, tokenIssued: !!token },
        ms: Date.now() - t0,
      });
    } catch(e) {
      checks.push({ name: 'auth', pass: false, detail: { error: e.message }, ms: 0 });
    }

    const allPass = checks.every(c => c.pass);
    const totalMs = Date.now() - overallStart;
    const passed = checks.filter(c => c.pass).length;
    const failed = checks.filter(c => !c.pass).length;

    return sendJson(res, 200, {
      ok: allPass,
      version: '2.5.8',
      build: '2.5.8-2608281900',
      buildId: '2.5.8-2608281900',
      timestamp: new Date().toISOString(),
      totalMs,
      summary: { total: checks.length, passed, failed },
      checks,
    });
  }


  // === 帳號相關 ===
  // POST /api/auth/register
  if (req.method === 'POST' && pathname === '/api/auth/register') {
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const account = String(body.account || '').trim();
    const password = String(body.password || '');

  if (account.length < 4 || account.length > 20) return sendJson(res, 400, { error: '帳號長度需 4-20 字元' });
    if (password.length < 6) return sendJson(res, 400, { error: '密碼至少 6 位' });
    if (!/^[a-zA-Z0-9_]+$/.test(account)) return sendJson(res, 400, { error: '帳號只能包含英數字與底線' });

    const existing = await db.getAccount(account);
    if (existing) return sendJson(res, 409, { error: '帳號已存在' });

    const ok = await db.createAccount(account, hashPassword(password), account === GM_ACCOUNT);
    if (!ok) return sendJson(res, 409, { error: '帳號已存在' });

    const acc = await db.getAccount(account);
    const token = genToken(account);
    console.log('[Auth] 註冊成功:', account);
    return sendJson(res, 201, { ok: true, account });
  }

  // POST /api/auth/login
  if (req.method === 'POST' && pathname === '/api/auth/login') {
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const account = String(body.account || '').trim();
    const password = String(body.password || '');

    const acc = await db.getAccount(account);
    if (!acc) return sendJson(res, 401, { error: '帳號或密碼錯誤' });
    if (acc.banned || (acc.meta && acc.meta.banned)) {
      return sendJson(res, 403, { error: '帳號已被封鎖，請聯繫客服' });
    }
    const expectedHash = acc.passwordHash;
    const inputHash = hashPassword(password);
    if (expectedHash !== inputHash) {
      // 向後兼容：舊版可能存明碼（僅開發期數據）
      if (password === expectedHash) {
        await db.updatePassword(account, inputHash);
      } else {
        return sendJson(res, 401, { error: '帳號或密碼錯誤' });
      }
    }

    const token = genToken(account);
    // v4.0.1：生成短wsSessionId用於WebSocket認證（避免大幀被proxy截斷）
    const wsSessionId = 'ws' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    if (!global._wsSessions) global._wsSessions = new Map();
    global._wsSessions.set(wsSessionId, { account: account, createdAt: Date.now() });
    setTimeout(() => { if (global._wsSessions) global._wsSessions.delete(wsSessionId); }, 10 * 60 * 1000);
    console.log('[Auth] 登入成功:', account, 'wsSessionId:', wsSessionId);
    // v4.0.2：把token存入全域快取，供shortToken認證時比對
    if (!global._wsAccountTokens) global._wsAccountTokens = new Map();
    global._wsAccountTokens.set(account, token);
    return sendJson(res, 200, {
      ok: true,
      token,
      wsSessionId,
      account,
      isGM: !!acc.isGM,
    });
  }

  // GET /api/auth/me
  if (req.method === 'GET' && pathname === '/api/auth/me') {
    const accName = await getAuthAccount(req);
    if (!accName) return sendJson(res, 401, { error: '未登入' });
    const acc = await db.getAccount(accName);
    if (!acc) return sendJson(res, 401, { error: '帳號不存在' });
    const charCount = await db.getCharacterCount(accName, 'zeus');
    return sendJson(res, 200, {
      ok: true,
      account: acc.account,
      isGM: !!acc.isGM,
      createdAt: acc.createdAt,
      characterCount: charCount,
    });
  }

  // === 伺服器列表（公開 API，僅回傳 GM 建立的伺服器）===
  if (req.method === 'GET' && pathname === '/api/servers') {
    try {
      const list = await db.listServers();
      // 計算線上人數（long-poll 地圖狀態）
      const onlineCount = {};
      for (const [mapId, players] of mpMapStates) {
        for (const [pid, p] of players) {
          const srvId = p.serverId || (pid.split(':')[0] + ':default');
          // 從 pid 推算 serverId 不可靠，這裡用 mpMapStatesByServer 替代
        }
      }
      const servers = list.map(s => ({
        id: s.id,
        name: s.name,
        status: s.status, // open / preparing / closed
        desc: s.status === 'open' ? '開放 · 順暢' : s.status === 'preparing' ? '準備中 · 即將開放' : '維護中',
        online: s.status === 'open',
        players: (mpServerPlayers.get(s.id) || 0),
        maxPlayers: s.maxPlayers,
        aiCount: s.aiCount,
        initLevel: s.initLevel,
        info: s.info || '',
      }));
      return sendJson(res, 200, { ok: true, servers });
    } catch(e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // === 角色存檔 ===
  // GET /api/characters?server=xxx
  if (req.method === 'GET' && pathname === '/api/characters') {
    const accName = await getAuthAccount(req);
    if (!accName) return sendJson(res, 401, { error: '未登入' });
    const serverId = query.server || 'zeus';
    const chars = await db.listCharacters(accName, serverId);
    return sendJson(res, 200, { ok: true, characters: chars });
  }

  // GET /api/characters/list?server=xxx（明確 list 路由，避免與 idx 衝突）
  if (req.method === 'GET' && pathname === '/api/characters/list') {
    const accName = await getAuthAccount(req);
    if (!accName) return sendJson(res, 401, { error: '未登入' });
    const serverId = query.server || 'zeus';
    const chars = await db.listCharacters(accName, serverId);
    return sendJson(res, 200, { ok: true, characters: chars });
  }

  // GET /api/characters/:idx?server=xxx（讀取單一角色完整存檔）
  // v2.5.6：前端創角後 / 選角時必須靠這支載入 saveData 進遊戲
  if (req.method === 'GET' && /^\/api\/characters\/\d+$/.test(pathname)) {
    const accName = await getAuthAccount(req);
    if (!accName) return sendJson(res, 401, { error: '未登入' });
    const charIdx = parseInt(pathname.split('/').pop(), 10);
    const serverId = query.server || 'zeus';
    const saveData = await db.getCharacter(accName, serverId, charIdx);
    if (!saveData) return sendJson(res, 404, { error: '角色不存在' });
    return sendJson(res, 200, { ok: true, saveData, charIdx, serverId });
  }

  // GET /api/characters/check-name?name=xxx&server=xxx
  if (req.method === 'GET' && pathname === '/api/characters/check-name') {
    const accName = await getAuthAccount(req);
    if (!accName) return sendJson(res, 401, { error: '未登入' });
    const name = query.name || '';
    const serverId = query.server || 'zeus';
    if (!name) return sendJson(res, 400, { error: '名稱不可為空' });
    const available = await db.checkNameUnique(name, serverId);
    return sendJson(res, 200, { available, name });
  }

  // POST /api/characters/create
  if (req.method === 'POST' && pathname === '/api/characters/create') {
    const accName = await getAuthAccount(req);
    if (!accName) return sendJson(res, 401, { error: '未登入' });
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const name = String(body.name || '').trim();
    const classId = String(body.classId || 'warrior');
    const serverId = String(body.server || 'zeus');
    if (name.length < 2 || name.length > 10)
      return sendJson(res, 400, { error: '名稱長度需 2-10 字元' });
    const validClasses = ['warrior','paladin','rogue','archer','mage','warlock'];
    if (!validClasses.includes(classId))
      return sendJson(res, 400, { error: '無效的職業' });
    // 名稱重複檢查
    const unique = await db.checkNameUnique(name, serverId);
    if (!unique) return sendJson(res, 409, { error: '此名稱已被使用' });
    const charCount = await db.getCharacterCount(accName, serverId);
    if (charCount >= 3) return sendJson(res, 409, { error: '角色數已達上限（3 個）' });
    // v2.5.8：找到第一個空槽位作為新角色索引（刪除後可能有中間空槽）
    const charList = await db.listCharacters(accName, serverId);
    let slotIdx = 0;
    for (let i = 0; i < 3; i++) {
      if (!charList[i]) { slotIdx = i; break; }
      if (i === 2) slotIdx = 3; // 不應該到這裡
    }
    const newChar = {
      name, classId, level: 1, exp: 0, created: true, createdAt: Date.now(),
    };
    await db.createCharacter(accName, serverId, slotIdx, name, classId, newChar);
    return sendJson(res, 201, { ok: true, idx: slotIdx, character: newChar });
  }

  // POST /api/characters/save
  if (req.method === 'POST' && pathname === '/api/characters/save') {
    const accName = await getAuthAccount(req);
    if (!accName) return sendJson(res, 401, { error: '未登入' });
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const serverId = body.serverId || 'zeus';
    const charIdx = body.charIdx != null ? body.charIdx : 0;
    const saveData = body.saveData || {};
    await db.saveCharacter(accName, serverId, charIdx, saveData);
    return sendJson(res, 200, { ok: true, savedAt: new Date().toISOString() });
  }

  // POST /api/characters/delete（v2.4.0：角色選擇頁刪除角色）
  if (req.method === 'POST' && pathname === '/api/characters/delete') {
    const accName = await getAuthAccount(req);
    if (!accName) return sendJson(res, 401, { error: '未登入' });
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const serverId = body.server || 'zeus';
    const charIdx = body.charIdx != null ? body.charIdx : 0;
    // 二次驗證：name 與存檔中的名稱一致才刪
    const existing = await db.getCharacter(accName, serverId, charIdx);
    if (!existing) return sendJson(res, 404, { error: '角色不存在' });
    if (body.name && existing.name && body.name !== existing.name) {
      return sendJson(res, 400, { error: '角色名稱不符' });
    }
    // 直接覆蓋為 null / 刪除紀錄
    await db.saveCharacter(accName, serverId, charIdx, null);
    return sendJson(res, 200, { ok: true, deleted: charIdx });
  }

  // === Bug 回報（向後相容） ===
  // POST /api/bug-report
  if (req.method === 'POST' && pathname === '/api/bug-report') {
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const report = {
      id: body.id || ('br_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
      createdAt: body.createdAt || new Date().toISOString(),
      version: body.version || '',
      description: String(body.description || '').slice(0, 2000),
      player: body.player || {},
      device: body.device || {},
      pageUrl: body.pageUrl || '',
      errors: Array.isArray(body.errors) ? body.errors.slice(0, 20) : [],
      account: (await getAuthAccount(req)) || null,
    };
    await db.addBugReport(report);
    return sendJson(res, 201, { ok: true, id: report.id });
  }
  // GET /api/bug-report/ping
  if (req.method === 'GET' && pathname === '/api/bug-report/ping') {
    return sendJson(res, 200, { ok: true, service: 'mmo-server', version: '2.0.0' });
  }

  // === GM API 驗證 ===
  async function verifyGM(req) {
    const acc = await getAuthAccount(req);
    if (!acc) return false;
    const a = await db.getAccount(acc);
    return !!(a && a.isGM);
  }

  // GET /api/bug-report/list
  if (req.method === 'GET' && (pathname === '/api/bug-report/list' || pathname === '/api/bug-report')) {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    // JSON 模式直接讀檔；Postgres 模式查詢最新 500 筆
    let list = [];
    if (db.getBackend() === 'postgres') {
      try {
        const { rows } = await pgPool.query(
          'SELECT id, account, version, description, player, device, page_url, errors, created_at FROM bug_reports ORDER BY created_at DESC LIMIT 500'
        );
        list = rows.map(r => ({
          id: r.id, account: r.account, version: r.version,
          description: r.description, player: r.player || {},
          device: r.device || {}, pageUrl: r.page_url || '',
          errors: r.errors || [], createdAt: r.created_at,
        }));
      } catch (e) { console.error('[GM] bug list error:', e.message); list = []; }
    } else {
      const f = path.join(DATA_DIR, 'bug-reports.json');
      if (fs.existsSync(f)) {
        try { list = JSON.parse(fs.readFileSync(f, 'utf-8')); } catch(_) { list = []; }
      }
    }
    return sendJson(res, 200, { ok: true, list });
  }
  // DELETE /api/bug-report/:id
  if (req.method === 'DELETE' && pathname.startsWith('/api/bug-report/')) {
    const id = decodeURIComponent(pathname.slice('/api/bug-report/'.length));
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    if (db.getBackend() === 'postgres') {
      try { await pgPool.query('DELETE FROM bug_reports WHERE id = $1', [id]); }
      catch (e) { return sendJson(res, 500, { error: e.message }); }
    } else {
      const f = path.join(DATA_DIR, 'bug-reports.json');
      let list = [];
      if (fs.existsSync(f)) { try { list = JSON.parse(fs.readFileSync(f, 'utf-8')); } catch(_) {} }
      const idx = list.findIndex(r => r.id === id);
      if (idx === -1) return sendJson(res, 404, { error: 'not found' });
      list.splice(idx, 1);
      fs.writeFileSync(f, JSON.stringify(list, null, 2));
    }
    return sendJson(res, 200, { ok: true });
  }
  // POST /api/bug-report/clear
  if (req.method === 'POST' && pathname === '/api/bug-report/clear') {
    let body = {};
    try { body = await parseJsonBody(req); } catch (e) { /* ignore */ }
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    if (db.getBackend() === 'postgres') {
      try { await pgPool.query('DELETE FROM bug_reports'); }
      catch (e) { return sendJson(res, 500, { error: e.message }); }
    } else {
      const f = path.join(DATA_DIR, 'bug-reports.json');
      fs.writeFileSync(f, '[]');
    }
    return sendJson(res, 200, { ok: true });
  }

  // ===== v2.5.8：資料庫管理（危險區塊） =====

  // GET /api/gm/admin/stats - 各表筆數統計
  if (req.method === 'GET' && pathname === '/api/gm/admin/stats') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    try {
      const stats = await db.getStats();
      // v3.0.0：線上人數去重計算（WS + LP 同一帳號只算一次），附加明細
      let wsCount = 0, lpCount = 0;
      try { wsCount = (wsServer && typeof wsServer.getOnlineCount === 'function') ? wsServer.getOnlineCount() : 0; } catch(e) {}
      try { lpCount = onlinePlayers ? onlinePlayers.size : 0; } catch(e) {}
      const uniqueAccounts = new Set();
      try {
        if (wsServer && typeof wsServer.getOnlinePlayers === 'function') {
          for (const c of wsServer.getOnlinePlayers()) { if (c.account) uniqueAccounts.add(c.account); }
        }
      } catch(e) {}
      for (const p of onlinePlayers.values()) { uniqueAccounts.add(p.account); }
      const onlineCount = uniqueAccounts.size;
      const totalAccounts = stats.accounts != null ? stats.accounts : 0;
      return sendJson(res, 200, {
        ok: true,
        stats,
        backend: db.getBackend(),
        onlineCount,
        wsCount,
        lpCount,
        totalAccounts,
      });
    } catch (e) {
      console.error('[GM] admin/stats 失敗:', e.message);
      return sendJson(res, 500, { error: e.message });
    }
  }

  // POST /api/gm/admin/reset-all - 全部重置（清空所有遊戲資料）
  if (req.method === 'POST' && pathname === '/api/gm/admin/reset-all') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    let body = {};
    try { body = await parseJsonBody(req); } catch (e) { body = {}; }
    const gmAcc = await getAuthAccount(req);
    const keepCustomItems = body.keepCustomItems !== false;
    try {
      const counts = await db.resetAll({ keepCustomItems });
      // 重置後重新 seed GM 帳號
      if (db.getBackend() === 'postgres') {
        await db.ensureGMAccount(GM_ACCOUNT, hashPassword(GM_PASSWORD));
      } else {
        await db.createAccount(GM_ACCOUNT, hashPassword(GM_PASSWORD), true);
      }
      // 寫入 GM 操作日誌（重置後 DB 已可用）
      await db.logGMAction(gmAcc, null, 'reset_all', {
        keepCustomItems,
        counts,
      });
      return sendJson(res, 200, { ok: true, counts, keepCustomItems });
    } catch (e) {
      console.error('[GM] reset-all 失敗:', e.message, e.stack);
      return sendJson(res, 500, { error: e.message });
    }
  }

  // POST /api/gm/admin/reset-characters - 只清角色
  if (req.method === 'POST' && pathname === '/api/gm/admin/reset-characters') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    const gmAcc = await getAuthAccount(req);
    try {
      const counts = await db.resetCharacters();
      await db.logGMAction(gmAcc, null, 'reset_characters', { counts });
      return sendJson(res, 200, { ok: true, counts });
    } catch (e) {
      console.error('[GM] reset-characters 失敗:', e.message);
      return sendJson(res, 500, { error: e.message });
    }
  }

  // POST /api/gm/admin/reset-logs - 清空日誌
  if (req.method === 'POST' && pathname === '/api/gm/admin/reset-logs') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    const gmAcc = await getAuthAccount(req);
    try {
      const counts = await db.resetLogs();
      // 重置日誌後留一條本次操作記錄
      await db.logGMAction(gmAcc, null, 'reset_logs', { counts });
      return sendJson(res, 200, { ok: true, counts });
    } catch (e) {
      console.error('[GM] reset-logs 失敗:', e.message);
      return sendJson(res, 500, { error: e.message });
    }
  }

  // POST /api/gm/admin/clear-leaderboard - 清空排行榜
  if (req.method === 'POST' && pathname === '/api/gm/admin/clear-leaderboard') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    const gmAcc = await getAuthAccount(req);
    try {
      const counts = await db.clearLeaderboard();
      // 廣播給所有線上玩家：排行榜已清空
      if (wsServer && wsServer.broadcastData) {
        wsServer.broadcastData({ type: 'leaderboard_cleared', time: Date.now() });
      }
      await db.logGMAction(gmAcc, null, 'clear_leaderboard', { counts });
      return sendJson(res, 200, { ok: true, counts });
    } catch (e) {
      console.error('[GM] clear-leaderboard 失敗:', e.message);
      return sendJson(res, 500, { error: e.message });
    }
  }

  // ===== v2.6.0：GM 伺服器管理 =====

  // GET /api/gm/server/list - 列出所有伺服器
  if (req.method === 'GET' && pathname === '/api/gm/server/list') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    try {
      const list = await db.listServers();
      // 附加線上人數
      const withOnline = list.map(s => ({
        ...s,
        onlineCount: mpServerPlayers.get(s.id) || 0,
      }));
      return sendJson(res, 200, { ok: true, servers: withOnline });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // POST /api/gm/server/create - 新增伺服器
  if (req.method === 'POST' && pathname === '/api/gm/server/create') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const gmAcc = await getAuthAccount(req);
    try {
      const srv = await db.createServer(body);
      await db.logGMAction(gmAcc, null, 'server_create', { id: srv.id, name: srv.name });
      return sendJson(res, 200, { ok: true, server: srv });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // POST /api/gm/server/update - 更新伺服器
  if (req.method === 'POST' && pathname === '/api/gm/server/update') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const id = body.id;
    if (!id) return sendJson(res, 400, { error: '缺少 id' });
    const gmAcc = await getAuthAccount(req);
    try {
      const srv = await db.updateServer(id, body);
      await db.logGMAction(gmAcc, null, 'server_update', { id, changes: Object.keys(body).filter(k => k !== 'id') });
      // v2.7.2：修改 aiCount / initLevel 後立即套用並廣播給在線玩家
      if (body.aiCount != null || body.initLevel != null) {
        const aiCount = srv.aiCount != null ? parseInt(srv.aiCount) : 8;
        const initLevel = srv.initLevel != null ? parseInt(srv.initLevel) : 1;
        const result = wsServer.setAICountForServer(id, aiCount, { initLevel });
        console.log(`[GM AI] 伺服器 ${id} AI 數量調整為 ${aiCount}，影響 ${result.affected.length} 張地圖`);
      }
      // v2.7.2：狀態改變時廣播給 WS 玩家
      if (body.status) {
        wsServer.broadcastToMap(id, null, {
          type: 'server_status',
          serverId: id,
          status: body.status,
          time: Date.now(),
        });
      }
      return sendJson(res, 200, { ok: true, server: srv });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // POST /api/gm/server/delete - 刪除伺服器
  if (req.method === 'POST' && pathname === '/api/gm/server/delete') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const id = body.id;
    if (!id) return sendJson(res, 400, { error: '缺少 id' });
    const gmAcc = await getAuthAccount(req);
    try {
      await db.deleteServer(id);
      await db.logGMAction(gmAcc, null, 'server_delete', { id });
      return sendJson(res, 200, { ok: true });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // POST /api/gm/server/toggle - 切換狀態（open/preparing/closed）
  if (req.method === 'POST' && pathname === '/api/gm/server/toggle') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const id = body.id;
    const status = body.status;
    if (!id || !status) return sendJson(res, 400, { error: '缺少參數' });
    if (!['open', 'preparing', 'closed'].includes(status)) return sendJson(res, 400, { error: '狀態無效' });
    const gmAcc = await getAuthAccount(req);
    try {
      const srv = await db.updateServer(id, { status });
      await db.logGMAction(gmAcc, null, 'server_toggle', { id, status });
      return sendJson(res, 200, { ok: true, server: srv });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // POST /api/gm/server/reset-ai - 重置指定伺服器的 AI（清空持久化並重新生成）
  if (req.method === 'POST' && pathname === '/api/gm/server/reset-ai') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const id = body.id;
    if (!id) return sendJson(res, 400, { error: '缺少伺服器 id' });
    const gmAcc = await getAuthAccount(req);
    try {
      // 清空持久化檔案
      if (aiPersistence && aiPersistence.clearByServer) {
        aiPersistence.clearByServer(id);
      }
      // 取得最新設定
      const srv = await db.getServer(id);
      const aiCount = srv ? (srv.aiCount != null ? parseInt(srv.aiCount) : 8) : 8;
      const initLevel = srv ? (srv.initLevel != null ? parseInt(srv.initLevel) : 1) : 1;
      // 強制重設所有活躍地圖的 AI
      const result = wsServer.setAICountForServer(id, aiCount, { initLevel, forceReset: true });
      await db.logGMAction(gmAcc, null, 'server_reset_ai', { id, aiCount, initLevel, mapsReset: result.affected ? result.affected.length : 0 });
      return sendJson(res, 200, { ok: true, aiCount, initLevel, mapsReset: result.affected ? result.affected.length : 0 });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // POST /api/gm/admin/reset-ai-all - 重置全部伺服器 AI（清除所有 data/ai 檔）
  if (req.method === 'POST' && pathname === '/api/gm/admin/reset-ai-all') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    const gmAcc = await getAuthAccount(req);
    try {
      if (aiPersistence && aiPersistence.clearAll) aiPersistence.clearAll();
      // 重新載入所有伺服器 AI（從 DB 設定）
      const servers = await db.listServers();
      let totalMaps = 0;
      for (const srv of servers) {
        const aiCount = srv.aiCount != null ? parseInt(srv.aiCount) : 8;
        const initLevel = srv.initLevel != null ? parseInt(srv.initLevel) : 1;
        const r = wsServer.setAICountForServer(srv.id, aiCount, { initLevel, forceReset: true });
        totalMaps += r.affected ? r.affected.length : 0;
      }
      await db.logGMAction(gmAcc, null, 'admin_reset_ai_all', { serverCount: servers.length, totalMaps });
      return sendJson(res, 200, { ok: true, serverCount: servers.length, totalMaps });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // GET /api/gm/online - GM 查看線上玩家（WS + LP 合併，去重）
  if (req.method === 'GET' && pathname === '/api/gm/online') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    const seen = new Map(); // playerId -> entry
    // 1. LP 玩家
    for (const p of onlinePlayers.values()) {
      seen.set(p.account + ':' + (p.charIdx ?? 0), {
        socketId: p.socketId,
        account: p.account,
        name: p.name,
        serverId: p.serverId,
        mapId: p.mapId,
        level: p.level,
        transport: 'longpoll',
      });
    }
    // 2. WS 玩家（優先覆蓋，因為 WS 是主通道）
    try {
      if (wsServer && typeof wsServer.getOnlinePlayers === 'function') {
        const wsList = wsServer.getOnlinePlayers() || [];
        for (const c of wsList) {
          if (!c.account) continue;
          const pid = c.playerId || (c.account + ':' + (c.charIdx ?? 0));
          seen.set(pid, {
            socketId: 'ws:' + c.wsId,
            account: c.account,
            name: c.name,
            serverId: c.serverId,
            mapId: c.mapId,
            level: c.level,
            transport: 'websocket',
          });
        }
      }
    } catch(e) { console.warn('[GM] online WS 列表取得失敗:', e.message); }
    const list = Array.from(seen.values());
    return sendJson(res, 200, { ok: true, players: list, count: list.length });
  }

  // POST /api/gm/kick - GM 踢人
  if (req.method === 'POST' && pathname === '/api/gm/kick') {
    if (!verifyGM(req)) return sendJson(res, 403, { error: 'unauthorized' });
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const targetId = body.socketId;
    if (io && targetId) {
      const targetSocket = io.sockets.sockets.get(targetId);
      if (targetSocket) targetSocket.disconnect(true);
    }
    return sendJson(res, 200, { ok: true });
  }

  // POST /api/gm/adjust - GM 調整資源(金幣/鑽石)等
  if (req.method === 'POST' && pathname === '/api/gm/adjust') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const targetAccount = String(body.account || '');
    const serverId = body.serverId || 'zeus';
    const charIdx = body.charIdx != null ? parseInt(body.charIdx) : 0;
    const action = body.action || '';
    const value = body.value;
    const itemId = body.itemId;
    const itemCount = body.count || 1;
    const mapId = body.mapId;

    const acc = await db.getAccount(targetAccount);
    if (!acc) return sendJson(res, 404, { error: '帳號不存在' });
    let saveData = (await db.getCharacter(targetAccount, serverId, charIdx)) || {};

    // 確保 resources 存在
    if (!saveData.resources) saveData.resources = { gold: 0, gem: 0 };
    if (!saveData.player) saveData.player = { level: 1 };
    if (!saveData.inventory) saveData.inventory = [];

    switch (action) {
      case 'addGold':
        saveData.resources.gold = (saveData.resources.gold || 0) + (parseInt(value) || 0);
        break;
      case 'setGold':
        saveData.resources.gold = parseInt(value) || 0;
        break;
      case 'addGem':
        saveData.resources.gem = (saveData.resources.gem || 0) + (parseInt(value) || 0);
        break;
      case 'setGem':
        saveData.resources.gem = parseInt(value) || 0;
        break;
      case 'setLevel':
        const lv = Math.max(1, Math.min(99, parseInt(value) || 1));
        saveData.player.level = lv;
        saveData.player.expMax = Math.floor(100 * Math.pow(1.3, lv - 1));
        saveData.player.exp = 0;
        break;
      case 'giveItem':
        if (!itemId) return sendJson(res, 400, { error: '缺少 itemId' });
        const inv = saveData.inventory;
        let found = false;
        for (let i = 0; i < inv.length; i++) {
          if (inv[i] && inv[i].id === itemId && inv[i].stackable !== false) {
            inv[i].count = (inv[i].count || 1) + (parseInt(itemCount) || 1);
            found = true;
            break;
          }
        }
        if (!found) {
          inv.push({
            id: itemId, name: itemId, type: 'consumable',
            itemType: 'consumable', rarity: 'green',
            count: parseInt(itemCount) || 1,
          });
        }
        break;
      case 'addTransform':
        if (!itemId) return sendJson(res, 400, { error: '缺少 itemId (transformId)' });
        if (!saveData.transforms) saveData.transforms = [];
        if (!saveData.transforms.find(t => t && t.id === itemId)) {
          saveData.transforms.push({
            id: itemId,
            name: body.itemName || itemId,
            unlocked: true,
            level: 1,
          });
        }
        break;
      case 'removeTransform':
        if (!itemId) return sendJson(res, 400, { error: '缺少 itemId (transformId)' });
        if (saveData.transforms) {
          saveData.transforms = saveData.transforms.filter(t => !(t && t.id === itemId));
        }
        break;
      case 'addHero':
        if (!itemId) return sendJson(res, 400, { error: '缺少 itemId (heroId)' });
        if (!saveData.ownedHeroes) saveData.ownedHeroes = [];
        if (!saveData.ownedHeroes.find(h => h && h.id === itemId)) {
          saveData.ownedHeroes.push({
            id: itemId,
            name: body.itemName || itemId,
            level: 1,
            star: 1,
          });
        }
        break;
      case 'removeHero':
        if (!itemId) return sendJson(res, 400, { error: '缺少 itemId (heroId)' });
        if (saveData.ownedHeroes) {
          saveData.ownedHeroes = saveData.ownedHeroes.filter(h => !(h && h.id === itemId));
        }
        break;
      case 'setExp':
        if (!saveData.player) saveData.player = { level: 1, exp: 0 };
        saveData.player.exp = parseInt(value) || 0;
        break;
      case 'teleport':
        if (mapId) saveData.currentMap = mapId;
        break;
      default:
        return sendJson(res, 400, { error: '未知 action' });
    }

    await db.saveCharacter(targetAccount, serverId, charIdx, saveData);

    // 若玩家線上，透過 socket 廣播 gm_update 通知客戶端刷新
    if (io) {
      for (const [sid, p] of onlinePlayers) {
        if (p.account === targetAccount && p.serverId === serverId) {
          io.to(sid).emit('gm_update', { action, value, itemId, count: itemCount, mapId });
          break;
        }
      }
    }

    return sendJson(res, 200, { ok: true, action, resources: saveData.resources, level: saveData.player?.level });
  }

  // POST /api/gm/login — GM 獨立登入
  if (req.method === 'POST' && pathname === '/api/gm/login') {
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const account = String(body.account || '').trim();
    const password = String(body.password || '');
    if (!account || !password) return sendJson(res, 400, { error: '缺少帳號或密碼' });

    const acc = await db.getAccount(account);
    if (!acc) return sendJson(res, 401, { error: '帳號或密碼錯誤' });
    const inputHash = hashPassword(password);
    if (acc.passwordHash !== inputHash && password !== acc.passwordHash) {
      return sendJson(res, 401, { error: '帳號或密碼錯誤' });
    }
    if (!acc.isGM) return sendJson(res, 403, { error: '非 GM 帳號' });

    const gmToken = genToken(account);
    console.log('[GM] GM 登入成功:', account);
    return sendJson(res, 200, {
      ok: true,
      token: gmToken,
      account,
      isGM: true,
    });
  }

  // GET /api/gm/players — 玩家搜尋清單
  if (req.method === 'GET' && pathname === '/api/gm/players') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    const search = String(query.search || '').trim().toLowerCase();
    const page = Math.max(1, parseInt(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize) || 20));

    let allAccounts = [];
    if (db.getBackend() === 'postgres') {
      try {
        const { rows } = await pgPool.query(
          'SELECT account, created_at, is_gm FROM accounts ORDER BY created_at DESC'
        );
        allAccounts = rows.map(r => ({
          account: r.account,
          createdAt: r.created_at && r.created_at.toISOString ? r.created_at.toISOString() : r.created_at,
          isGM: !!r.is_gm,
        }));
      } catch (e) { console.error('[GM] players list pg error:', e.message); }
    } else {
      const f = path.join(DATA_DIR, 'accounts.json');
      let accounts = {};
      if (fs.existsSync(f)) {
        try { accounts = JSON.parse(fs.readFileSync(f, 'utf-8')); } catch(_) { accounts = {}; }
      }
      for (const accName in accounts) {
        const a = accounts[accName];
        allAccounts.push({
          account: a.account,
          createdAt: a.createdAt,
          isGM: !!a.isGM,
        });
      }
      allAccounts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // 模糊搜尋
    if (search) {
      allAccounts = allAccounts.filter(a => a.account.toLowerCase().includes(search));
    }

    const total = allAccounts.length;
    const start = (page - 1) * pageSize;
    const pageItems = allAccounts.slice(start, start + pageSize);

    // 為每個帳號計算角色數
    const list = [];
    for (const a of pageItems) {
      const charCount = await db.getCharacterCount(a.account, 'zeus');
      list.push({
        account: a.account,
        isGM: a.isGM,
        createdAt: a.createdAt,
        characterCount: charCount,
      });
    }

    return sendJson(res, 200, {
      ok: true,
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  }

  // GET /api/gm/player/:account — 玩家詳細資料
  if (req.method === 'GET' && pathname.startsWith('/api/gm/player/')) {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    const targetAccount = decodeURIComponent(pathname.slice('/api/gm/player/'.length));
    const acc = await db.getAccount(targetAccount);
    if (!acc) return sendJson(res, 404, { error: '帳號不存在' });

    const serverId = 'zeus';
    const charCount = await db.getCharacterCount(targetAccount, serverId);
    const characters = [];
    for (let i = 0; i < charCount; i++) {
      const saveData = await db.getCharacter(targetAccount, serverId, i);
      if (saveData) {
        characters.push({
          charIdx: i,
          name: (saveData.player && saveData.player.name) || '',
          level: (saveData.player && saveData.player.level) || 1,
          classId: (saveData.player && saveData.player.classId) || 'warrior',
          saveData: saveData,
        });
      }
    }

    return sendJson(res, 200, {
      ok: true,
      account: {
        account: acc.account,
        isGM: !!acc.isGM,
        createdAt: acc.createdAt,
      },
      characters,
      characterCount: characters.length,
    });
  }

  // POST /api/gm/give-all — 全服發放獎勵
  if (req.method === 'POST' && pathname === '/api/gm/give-all') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const type = body.type; // gem | gold | item
    const amount = parseInt(body.amount) || 0;
    const itemId = body.itemId;
    const itemName = body.itemName || itemId;

    if (!type || (type !== 'item' && amount <= 0)) {
      return sendJson(res, 400, { error: '參數錯誤' });
    }
    if (type === 'item' && !itemId) {
      return sendJson(res, 400, { error: '缺少 itemId' });
    }

    let grantedCount = 0;
    const serverId = 'zeus';

    if (db.getBackend() === 'postgres') {
      try {
        const { rows } = await pgPool.query(
          'SELECT DISTINCT account FROM characters WHERE server_id = $1',
          [serverId]
        );
        const accounts = rows.map(r => r.account);
        for (const acc of accounts) {
          const charCnt = await db.getCharacterCount(acc, serverId);
          for (let i = 0; i < charCnt; i++) {
            const saveData = await db.getCharacter(acc, serverId, i);
            if (!saveData) continue;
            if (!saveData.resources) saveData.resources = { gold: 0, gem: 0 };
            if (type === 'gem') {
              saveData.resources.gem = (saveData.resources.gem || 0) + amount;
            } else if (type === 'gold') {
              saveData.resources.gold = (saveData.resources.gold || 0) + amount;
            } else if (type === 'item') {
              if (!saveData.inventory) saveData.inventory = [];
              const inv = saveData.inventory;
              let found = false;
              for (let j = 0; j < inv.length; j++) {
                if (inv[j] && inv[j].id === itemId && inv[j].stackable !== false) {
                  inv[j].count = (inv[j].count || 1) + amount;
                  found = true;
                  break;
                }
              }
              if (!found) {
                inv.push({
                  id: itemId, name: itemName, type: 'consumable',
                  itemType: 'consumable', rarity: 'green',
                  count: amount || 1,
                });
              }
            }
            await db.saveCharacter(acc, serverId, i, saveData);
            grantedCount++;
          }
        }
      } catch (e) {
        console.error('[GM] give-all pg error:', e.message);
        return sendJson(res, 500, { error: e.message });
      }
    } else {
      // JSON 模式：遍歷 accounts.json
      const f = path.join(DATA_DIR, 'accounts.json');
      const accounts = JSON.parse(fs.readFileSync(f, 'utf-8') || '{}');
      for (const accName in accounts) {
        const acc = accounts[accName];
        const chars = (acc.characters && acc.characters[serverId]) || [];
        for (let i = 0; i < chars.length; i++) {
          if (!chars[i]) continue;
          if (!chars[i].resources) chars[i].resources = { gold: 0, gem: 0 };
          if (type === 'gem') {
            chars[i].resources.gem = (chars[i].resources.gem || 0) + amount;
          } else if (type === 'gold') {
            chars[i].resources.gold = (chars[i].resources.gold || 0) + amount;
          } else if (type === 'item') {
            if (!chars[i].inventory) chars[i].inventory = [];
            const inv = chars[i].inventory;
            let found = false;
            for (let j = 0; j < inv.length; j++) {
              if (inv[j] && inv[j].id === itemId && inv[j].stackable !== false) {
                inv[j].count = (inv[j].count || 1) + amount;
                found = true;
                break;
              }
            }
            if (!found) {
              inv.push({
                id: itemId, name: itemName, type: 'consumable',
                itemType: 'consumable', rarity: 'green',
                count: amount || 1,
              });
            }
          }
          grantedCount++;
        }
      }
      fs.writeFileSync(f, JSON.stringify(accounts, null, 2));
    }

    console.log('[GM] 全服發放: type=' + type + ', amount=' + amount + ', 發放角色數=' + grantedCount);
    return sendJson(res, 200, { ok: true, type, amount, grantedCount });
  }

  // POST /api/gm/broadcast — 全服廣播
  if (req.method === 'POST' && pathname === '/api/gm/broadcast') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const text = String(body.text || '').trim();
    const btype = body.type || 'system';
    if (!text) return sendJson(res, 400, { error: '缺少 text' });

    const broadcast = {
      id: 'bc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      type: btype,
      text,
      time: Date.now(),
    };

    // 存入全服廣播歷史
    mpBroadcasts.push(broadcast);
    while (mpBroadcasts.length > 50) mpBroadcasts.shift();

    // 持久化到 broadcasts.json
    try {
      const bfile = path.join(DATA_DIR, 'broadcasts.json');
      let history = [];
      if (fs.existsSync(bfile)) {
        try { history = JSON.parse(fs.readFileSync(bfile, 'utf-8')); } catch(_) { history = []; }
      }
      history.push(broadcast);
      while (history.length > 200) history.shift();
      fs.writeFileSync(bfile, JSON.stringify(history, null, 2));
    } catch (e) {
      console.error('[GM] 廣播持久化失敗:', e.message);
    }

    // 透過 long-poll 通知所有線上玩家
    for (const [mapId, waiters] of mpPollWaiters) {
      for (const w of waiters) {
        try {
          w.res.end(JSON.stringify({ ok: true, events: [], broadcasts: [broadcast], time: Date.now() }));
        } catch(e) {}
      }
      mpPollWaiters.set(mapId, []);
    }

    // Socket.IO / WebSocket 也廣播（v2.7.2：wsServer 零依賴）
    wsServer.gmBroadcast(broadcast.text, btype);

    console.log('[GM] 全服廣播: [' + btype + '] ' + text);
    return sendJson(res, 200, { ok: true, broadcast });
  }

  // ==================== v2.5.6 新增 GM API ====================

  // GET /api/gm/logs — GM 操作日誌
  if (req.method === 'GET' && pathname === '/api/gm/logs') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    const limit = Math.min(200, parseInt(query.limit) || 50);
    const list = await db.listGMLogs(limit);
    return sendJson(res, 200, { ok: true, list });
  }

  // GET /api/gm/announcements — 公告列表
  if (req.method === 'GET' && pathname === '/api/gm/announcements') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    const list = await db.listAnnouncements();
    return sendJson(res, 200, { ok: true, list });
  }

  // POST /api/gm/announcements — 新增公告
  if (req.method === 'POST' && pathname === '/api/gm/announcements') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const gmAcc = await getAuthAccount(req);
    const item = await db.createAnnouncement(body, gmAcc);
    await db.logGMAction(gmAcc, null, 'announcement_create', { type: body.type, title: body.title });
    return sendJson(res, 200, { ok: true, item });
  }

  // PUT /api/gm/announcements/:id — 更新公告
  if (req.method === 'PUT' && pathname.startsWith('/api/gm/announcements/')) {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    const id = pathname.slice('/api/gm/announcements/'.length);
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const gmAcc = await getAuthAccount(req);
    await db.updateAnnouncement(id, body, gmAcc);
    await db.logGMAction(gmAcc, null, 'announcement_update', { id });
    return sendJson(res, 200, { ok: true });
  }

  // DELETE /api/gm/announcements/:id — 下架/刪除公告
  if (req.method === 'DELETE' && pathname.startsWith('/api/gm/announcements/')) {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    const id = pathname.slice('/api/gm/announcements/'.length);
    const gmAcc = await getAuthAccount(req);
    await db.deleteAnnouncement(id);
    await db.logGMAction(gmAcc, null, 'announcement_delete', { id });
    return sendJson(res, 200, { ok: true });
  }

  // GET /api/announcements/active — 玩家端讀取有效公告（不需GM）
  if (req.method === 'GET' && pathname === '/api/announcements/active') {
    const type = query.type || 'marquee';
    const list = await db.listAnnouncements(type);
    return sendJson(res, 200, { ok: true, list });
  }

  // GET /api/gm/config — 遊戲參數
  if (req.method === 'GET' && pathname === '/api/gm/config') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    const cfg = await db.getGameConfig();
    return sendJson(res, 200, { ok: true, config: cfg });
  }

  // POST /api/gm/config — 設定遊戲參數
  if (req.method === 'POST' && pathname === '/api/gm/config') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const gmAcc = await getAuthAccount(req);
    const { key, value } = body;
    if (!key) return sendJson(res, 400, { error: '缺少 key' });
    await db.setGameConfig(key, value, gmAcc);
    await db.logGMAction(gmAcc, null, 'config_update', { key, value });
    return sendJson(res, 200, { ok: true, key, value });
  }

  // GET /api/gm/castles — 攻城戰設定列表
  if (req.method === 'GET' && pathname === '/api/gm/castles') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    const list = await db.getCastleStates();
    return sendJson(res, 200, { ok: true, list });
  }

  // POST /api/gm/castles/:id — 更新攻城戰設定
  if (req.method === 'POST' && pathname.startsWith('/api/gm/castles/')) {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    const castleId = decodeURIComponent(pathname.slice('/api/gm/castles/'.length));
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const gmAcc = await getAuthAccount(req);
    await db.updateCastleState(castleId, body, gmAcc);
    await db.logGMAction(gmAcc, null, 'castle_update', { castleId, ...body });
    return sendJson(res, 200, { ok: true });
  }

  // GET /api/gm/items — 自定義道具/裝備列表
  if (req.method === 'GET' && pathname === '/api/gm/items') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    const list = await db.listCustomItems(query.type);
    return sendJson(res, 200, { ok: true, list });
  }

  // POST /api/gm/items — 新增/更新道具
  if (req.method === 'POST' && pathname === '/api/gm/items') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    if (!body.id || !body.name || !body.type) return sendJson(res, 400, { error: '缺少 id/name/type' });
    const gmAcc = await getAuthAccount(req);
    await db.upsertCustomItem(body, gmAcc);
    await db.logGMAction(gmAcc, null, 'item_upsert', { id: body.id, name: body.name });
    return sendJson(res, 200, { ok: true });
  }

  // DELETE /api/gm/items/:id — 刪除(停用)道具
  if (req.method === 'DELETE' && pathname.startsWith('/api/gm/items/')) {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    const id = decodeURIComponent(pathname.slice('/api/gm/items/'.length));
    const gmAcc = await getAuthAccount(req);
    await db.deleteCustomItem(id);
    await db.logGMAction(gmAcc, null, 'item_delete', { id });
    return sendJson(res, 200, { ok: true });
  }

  // POST /api/gm/kick/ban — 封鎖/解封帳號
  if (req.method === 'POST' && pathname === '/api/gm/ban') {
    if (!(await verifyGM(req))) return sendJson(res, 403, { error: 'unauthorized' });
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const target = body.account;
    if (!target) return sendJson(res, 400, { error: '缺少 account' });
    const acc = await db.getAccount(target);
    if (!acc) return sendJson(res, 404, { error: '帳號不存在' });
    const isUnban = body.unban === true || body.unban === 'true' || body.action === 'unban';
    const newMeta = { ...(acc.meta || {}) };
    if (isUnban) {
      delete newMeta.banned;
      delete newMeta.banReason;
      delete newMeta.bannedAt;
    } else {
      newMeta.banned = true;
      newMeta.banReason = body.reason || '';
      newMeta.bannedAt = new Date().toISOString();
    }
    if (db.getBackend() === 'postgres') {
      const pool = await getPgPool();
      await pool.query('UPDATE accounts SET meta = $1 WHERE account = $2', [newMeta, target]);
    } else {
      const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'accounts.json'), 'utf-8') || '{}');
      if (data[target]) { data[target].meta = newMeta; fs.writeFileSync(path.join(DATA_DIR, 'accounts.json'), JSON.stringify(data, null, 2)); }
    }
    const gmAcc = await getAuthAccount(req);
    await db.logGMAction(gmAcc, target, isUnban ? 'unban' : 'ban', { reason: body.reason });
    return sendJson(res, 200, { ok: true, banned: !isUnban });
  }

  // ==================== 玩家端倉庫 API ====================

  // GET /api/warehouse — 讀取帳號級共享倉庫
  if (req.method === 'GET' && pathname === '/api/warehouse') {
    const acc = await getAuthAccount(req);
    if (!acc) return sendJson(res, 401, { error: '未登入' });
    const shared = await db.getAccountShared(acc);
    return sendJson(res, 200, { ok: true, warehouse: shared.warehouse || [] });
  }

  // POST /api/warehouse/deposit — 存入倉庫
  if (req.method === 'POST' && pathname === '/api/warehouse/deposit') {
    const acc = await getAuthAccount(req);
    if (!acc) return sendJson(res, 401, { error: '未登入' });
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const { serverId, charIdx, item } = body;
    if (!item || !item.id) return sendJson(res, 400, { error: '缺少 item' });
    try {
      await db.warehouseDeposit(acc, serverId || 'zeus', charIdx || 0, item);
      // 同時從角色背包扣除（客戶端同步負責）
      const shared = await db.getAccountShared(acc);
      return sendJson(res, 200, { ok: true, warehouse: shared.warehouse || [] });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // POST /api/warehouse/withdraw — 取出倉庫
  if (req.method === 'POST' && pathname === '/api/warehouse/withdraw') {
    const acc = await getAuthAccount(req);
    if (!acc) return sendJson(res, 401, { error: '未登入' });
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const { serverId, charIdx, itemId, count } = body;
    if (!itemId) return sendJson(res, 400, { error: '缺少 itemId' });
    try {
      const result = await db.warehouseWithdraw(acc, serverId || 'zeus', charIdx || 0, itemId, count || 1);
      const shared = await db.getAccountShared(acc);
      return sendJson(res, 200, { ok: true, warehouse: shared.warehouse || [], item: result.item, count: result.count });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // GET /api/account/shared — 帳號級共享數據（變身/英雄/守護/倉庫）
  if (req.method === 'GET' && pathname === '/api/account/shared') {
    const acc = await getAuthAccount(req);
    if (!acc) return sendJson(res, 401, { error: '未登入' });
    const shared = await db.getAccountShared(acc);
    return sendJson(res, 200, { ok: true, shared });
  }

  // POST /api/account/shared — 同步帳號級共享數據（保存時）
  if (req.method === 'POST' && pathname === '/api/account/shared') {
    const acc = await getAuthAccount(req);
    if (!acc) return sendJson(res, 401, { error: '未登入' });
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const patch = {};
    if ('ownedTransforms' in body) patch.ownedTransforms = body.ownedTransforms;
    if ('ownedHeroes' in body) patch.ownedHeroes = body.ownedHeroes;
    if ('ownedPets' in body) patch.ownedPets = body.ownedPets;
    if (Object.keys(patch).length > 0) {
      await db.saveAccountShared(acc, patch);
    }
    return sendJson(res, 200, { ok: true });
  }

  // GET /api/game-config — 玩家端讀取遊戲參數（倍率、轉職費等）
  if (req.method === 'GET' && pathname === '/api/game-config') {
    const cfg = await db.getGameConfig();
    return sendJson(res, 200, { ok: true, config: cfg });
  }

  // POST /api/gm/class-change — GM 協助轉職(免費) 或 玩家付費轉職
  // 玩家付費轉職：自己呼叫，扣除鑽石 3600 後切換職業
  if (req.method === 'POST' && pathname === '/api/characters/change-class') {
    const acc = await getAuthAccount(req);
    if (!acc) return sendJson(res, 401, { error: '未登入' });
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const { serverId, charIdx, newClassId, isGM } = body;
    if (!newClassId) return sendJson(res, 400, { error: '缺少 newClassId' });
    const validClasses = ['warrior', 'paladin', 'rogue', 'archer', 'mage', 'warlock'];
    if (!validClasses.includes(newClassId)) return sendJson(res, 400, { error: '無效職業' });

    // 讀角色存檔
    const saveData = await db.getCharacter(acc, serverId || 'zeus', charIdx || 0);
    if (!saveData) return sendJson(res, 404, { error: '角色不存在' });

    // 付費驗證：非GM需扣鑽石
    if (!isGM) {
      const gem = (saveData.resources && saveData.resources.gem) || 0;
      // 從 game_config 取價格，預設 3600
      let cost = 3600;
      try {
        const cfgCost = await db.getGameConfig('class_change_cost');
        if (cfgCost != null) cost = Number(cfgCost) || 3600;
      } catch (_) {}
      if (gem < cost) return sendJson(res, 400, { error: '鑽石不足，轉職需要 ' + cost + ' 鑽石', cost });
      if (!saveData.resources) saveData.resources = { gold: 0, gem: 0 };
      saveData.resources.gem = gem - cost;
    }

    // 更新職業
    if (!saveData.player) saveData.player = {};
    saveData.player.classId = newClassId;
    // 同步刷新基礎屬性（按新職業重新計算）
    await db.saveCharacter(acc, serverId || 'zeus', charIdx || 0, saveData);

    return sendJson(res, 200, {
      ok: true,
      newClassId,
      gem: saveData.resources?.gem || 0,
      saveData,
    });
  }


  return sendJson(res, 404, { error: 'not found' });
}

// ========== HTTP 伺服器 ==========
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || '/';
  const query = parsed.query || {};

  if (pathname.startsWith('/api/')) {
    try {
      await handleApi(req, res, pathname, query);
    } catch (e) {
      console.error('[API] 未處理錯誤:', e);
      sendJson(res, 500, { error: 'internal server error' });
    }
    return;
  }

  // /selftest 人類可讀 HTML 頁面（免登入，快速證明這是真遊戲伺服器）
  if (req.method === 'GET' && (pathname === '/selftest' || pathname === '/selftest.html')) {
    const html = `<!DOCTYPE html>
<html lang=\"zh-Hant\">
<head>
<meta charset=\"UTF-8\" />
<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
<title>伺服器自體檢查 · 君主之刃 v2.5.6</title>
<meta name=\"creative-medium\" content=\"other\" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang TC', 'Microsoft JhengHei', sans-serif;
    background: #0f0f1a;
    color: #e0e0e8;
    min-height: 100vh;
    padding: 24px 16px;
  }
  .wrap { max-width: 640px; margin: 0 auto; }
  .header { text-align: center; margin-bottom: 24px; }
  .title { font-size: 24px; font-weight: 700; color: #ffd700; margin-bottom: 4px; letter-spacing: 1px; }
  .subtitle { font-size: 13px; color: #8888aa; }
  .card { background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
  .overall { text-align: center; padding: 28px 20px; }
  .overall .status { font-size: 48px; font-weight: 800; margin-bottom: 8px; }
  .overall.pass .status { color: #3ddc97; text-shadow: 0 0 20px rgba(61,220,151,0.4); }
  .overall.fail .status { color: #ff6b6b; text-shadow: 0 0 20px rgba(255,107,107,0.4); }
  .overall .meta { font-size: 13px; color: #8888aa; }
  .check-row { display: flex; align-items: center; padding: 14px 0; border-bottom: 1px solid #2a2a4a; }
  .check-row:last-child { border-bottom: none; }
  .check-icon { font-size: 22px; width: 36px; text-align: center; margin-right: 12px; flex-shrink: 0; }
  .check-icon.pass { color: #3ddc97; }
  .check-icon.fail { color: #ff6b6b; }
  .check-body { flex: 1; min-width: 0; }
  .check-name { font-size: 15px; font-weight: 600; color: #e0e0e8; margin-bottom: 4px; }
  .check-detail { font-size: 12px; color: #8888aa; font-family: ui-monospace, 'SF Mono', Menlo, monospace; word-break: break-all; line-height: 1.5; }
  .check-ms { font-size: 12px; color: #6666aa; margin-left: 12px; flex-shrink: 0; }
  .btn { display: block; width: 100%; padding: 14px; background: linear-gradient(135deg, #ffd700, #ff9500); color: #1a1a2e; border: none; border-radius: 10px; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 16px; letter-spacing: 1px; }
  .btn:active { transform: scale(0.98); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .footer { text-align: center; font-size: 11px; color: #555577; margin-top: 20px; }
  .loading { display: inline-block; width: 20px; height: 20px; border: 3px solid #2a2a4a; border-top-color: #ffd700; border-radius: 50%; animation: spin 0.8s linear infinite; vertical-align: middle; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
<div class=\"wrap\">
  <div class=\"header\">
    <div class=\"title\">&#9876; 君主之刃 · 伺服器自體檢查</div>
    <div class=\"subtitle\">v2.5.6 · 即時驗證伺服器與遊戲功能</div>
  </div>
  <div class=\"card overall\" id=\"overall\">
    <div class=\"status\"><span class=\"loading\"></span></div>
    <div class=\"meta\">檢查中，請稍候…</div>
  </div>
  <div class=\"card\" id=\"checks\">
    <div style=\"text-align:center;color:#6666aa;font-size:13px;\">載入中…</div>
  </div>
  <button class=\"btn\" id=\"retryBtn\" onclick=\"runTest()\">重新檢查</button>
  <div class=\"footer\">君主之刃 v2.5.6 · 伺服器自體檢查</div>
</div>
<script>
async function runTest() {
  var overall = document.getElementById('overall');
  var checksEl = document.getElementById('checks');
  var btn = document.getElementById('retryBtn');
  btn.disabled = true;
  overall.className = 'card overall';
  overall.innerHTML = '<div class=\"status\"><span class=\"loading\"></span></div><div class=\"meta\">檢查中，請稍候…</div>';
  checksEl.innerHTML = '<div style=\"text-align:center;color:#6666aa;font-size:13px;\">載入中…</div>';
  try {
    var res = await fetch('/api/selftest?_=' + Date.now(), { cache: 'no-store' });
    var data = await res.json();
    if (data.ok) {
      overall.className = 'card overall pass';
      overall.innerHTML = '<div class=\"status\">&#9989; 全部通過</div>' +
        '<div class=\"meta\">' + data.summary.passed + ' / ' + data.summary.total + ' 項 · 總耗時 ' + data.totalMs + ' ms · ' + data.timestamp + '</div>';
    } else {
      overall.className = 'card overall fail';
      overall.innerHTML = '<div class=\"status\">&#10060; 部分失敗</div>' +
        '<div class=\"meta\">' + data.summary.passed + ' / ' + data.summary.total + ' 項通過 · 總耗時 ' + data.totalMs + ' ms</div>';
    }
    var html = '';
    for (var i = 0; i < data.checks.length; i++) {
      var c = data.checks[i];
      var icon = c.pass ? '&#9989;' : '&#10060;';
      var iconCls = c.pass ? 'pass' : 'fail';
      var detail = '';
      if (c.detail) {
        var d = c.detail;
        var parts = [];
        if (d.version) parts.push('version=' + d.version);
        if (d.platform) parts.push('platform=' + d.platform);
        if (d.nodeVersion) parts.push('node=' + d.nodeVersion);
        if (d.uptimeMs != null) parts.push('uptime=' + (d.uptimeMs/1000).toFixed(1) + 's');
        if (d.assetCount != null) parts.push('assets=' + d.assetCount);
        if (d.manifestReferenced != null) parts.push('manifest=' + d.manifestReferenced);
        if (d.manifestMissing != null) parts.push('missing=' + d.manifestMissing);
        if (d.backend) parts.push('backend=' + d.backend);
        if (d.warning) parts.push('warning=' + d.warning);
        if (d.receivedMove != null) parts.push('moveReceived=' + d.receivedMove);
        if (d.moveX != null) parts.push('pos=(' + d.moveX + ',' + d.moveY + ')');
        if (d.account) parts.push('account=' + d.account);
        if (d.registered != null) parts.push('reg=' + d.registered);
        if (d.loginOk != null) parts.push('login=' + d.loginOk);
        if (d.deleted != null) parts.push('deleted=' + d.deleted);
        if (d.error) parts.push('error=' + d.error);
        detail = parts.join(' · ');
      }
      html += '<div class=\"check-row\">' +
        '<div class=\"check-icon ' + iconCls + '\">' + icon + '</div>' +
        '<div class=\"check-body\">' +
        '<div class=\"check-name\">' + c.name + '</div>' +
        '<div class=\"check-detail\">' + (detail || '-') + '</div>' +
        '</div>' +
        '<div class=\"check-ms\">' + c.ms + 'ms</div>' +
        '</div>';
    }
    checksEl.innerHTML = html;
  } catch(e) {
    overall.className = 'card overall fail';
    overall.innerHTML = '<div class=\"status\">&#10060; 連線失敗</div><div class=\"meta\">' + e.message + '</div>';
    checksEl.innerHTML = '<div style=\"text-align:center;color:#ff6b6b;font-size:13px;\">無法連線到伺服器</div>';
  } finally {
    btn.disabled = false;
  }
}
runTest();
</script>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.writeHead(200);
    res.end(html);
    return;
  }

  serveStatic(req, res, pathname);
});

// ========== v2.7.2：零依賴 WebSocket 多人連線 ==========
const { createWsServer } = require('./ws-server.cjs');
const wsServer = createWsServer(server);
const gameWorld = require('./game-world.cjs');

// v3.0.0：註冊全域 _wsSendToClient，供 game-world 做 AOI 單點廣播
global._wsSendToClient = function(wsId, msg) {
  return wsServer.sendToClient(wsId, msg);
};

// v3.0.0：啟動 game-world 全域 tick（Server Authoritative）
gameWorld.startTick();
console.log('[Server] v3.0.0 Server Authoritative Game World 已啟動');

// 讓 ws 模組能用 verifyToken
global._wsVerifyToken = verifyToken;

// v2.7.3：注入 long-poll AI 廣播回調（AI 變動時喚醒 poll waiters）
wsServer.setLPAIBroadcast((serverId, mapId, ais) => {
  const key = mpKey(serverId, mapId);
  const waiters = mpPollWaiters.get(key);
  if (!waiters || waiters.length === 0) return;
  // 立即喚醒所有等待中的 poll，帶最新 AI 列表
  const snapshot = [...ais];
  const now = Date.now();
  const bcasts = mpBroadcasts.filter(b => b.time > now - 5000);
  while (waiters.length > 0) {
    const w = waiters.shift();
    try {
      w.res.end(JSON.stringify({
        ok: true,
        events: [],
        broadcasts: bcasts,
        ais: snapshot,
        time: now,
        aiUpdated: true,
      }));
    } catch(e) {}
  }
});

// v2.7.3：注入伺服器 AI 持久化函式（重啟後 AI 不變）
const aiPersistence = {
  load(serverId, mapId) {
    const f = path.join(AI_DATA_DIR, `${serverId}_${mapId}.json`);
    try {
      if (fs.existsSync(f)) {
        const data = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (Array.isArray(data)) return data;
      }
    } catch(e) { console.warn('[AI Persist] 載入失敗', serverId, mapId, e.message); }
    return null;
  },
  save(serverId, mapId, aiList) {
    const f = path.join(AI_DATA_DIR, `${serverId}_${mapId}.json`);
    try {
      fs.writeFileSync(f, JSON.stringify(aiList), 'utf8');
    } catch(e) { console.warn('[AI Persist] 保存失敗', serverId, mapId, e.message); }
  },
  delete(serverId, mapId) {
    const f = path.join(AI_DATA_DIR, `${serverId}_${mapId}.json`);
    try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch(e) {}
  },
  clearByServer(serverId) {
    try {
      const files = fs.readdirSync(AI_DATA_DIR);
      const prefix = serverId + '_';
      for (const f of files) {
        if (f.startsWith(prefix) && f.endsWith('.json')) {
          try { fs.unlinkSync(path.join(AI_DATA_DIR, f)); } catch(e) {}
        }
      }
    } catch(e) { console.warn('[AI Persist] clearByServer 失敗', e.message); }
  },
  clearAll() {
    try {
      const files = fs.readdirSync(AI_DATA_DIR);
      for (const f of files) {
        if (f.endsWith('.json')) {
          try { fs.unlinkSync(path.join(AI_DATA_DIR, f)); } catch(e) {}
        }
      }
    } catch(e) { console.warn('[AI Persist] clearAll 失敗', e.message); }
  },
};
wsServer.setAIPersistence(aiPersistence);

// v2.7.5：注入 LP 玩家提供者（讓 WS 端能取得 LP 玩家用於 AI 索敵）
wsServer.setLpMapPlayersProvider((serverId, mapId) => {
  const key = mpKey(serverId, mapId);
  const ms = mpMapStates.get(key);
  return ms || null;
});

// v2.7.5：AI 攻擊事件轉發到 LP 通道
wsServer.setLpForwardEvent((serverId, mapId, event) => {
  try {
    notifyMapUpdate(serverId, mapId, event);
  } catch(e) {}
});

// v2.7.3：注入伺服器 AI 設定提供者（從 DB 讀真實設定）
wsServer.setServerAIConfigProvider(async (serverId) => {
  try {
    const srv = await db.getServer(serverId);
    if (srv) {
      return {
        aiCount: srv.aiCount != null ? parseInt(srv.aiCount) : 8,
        initLevel: srv.initLevel != null ? parseInt(srv.initLevel) : 1,
        status: srv.status || 'open',
      };
    }
  } catch(e) {}
  return { aiCount: 8, initLevel: 1, status: 'open' };
});

 server.on('upgrade', (req, socket, head) => {
   const upgradeHeader = (req.headers['upgrade'] || '').toLowerCase();
   const ts = new Date().toISOString();
   console.log('[WS][upgrade] ' + ts + ' 收到 upgrade 請求:');
   console.log('[WS][upgrade]   url=', req.url);
   console.log('[WS][upgrade]   method=', req.method);
   console.log('[WS][upgrade]   upgrade=', upgradeHeader);
   console.log('[WS][upgrade]   x-forwarded-proto=', req.headers['x-forwarded-proto'] || 'n/a');
   console.log('[WS][upgrade]   x-forwarded-for=', req.headers['x-forwarded-for'] || 'n/a');
   console.log('[WS][upgrade]   sec-websocket-key=', req.headers['sec-websocket-key'] ? '(存在, 長度=' + req.headers['sec-websocket-key'].length + ')' : '缺失');
   console.log('[WS][upgrade]   sec-websocket-version=', req.headers['sec-websocket-version'] || 'n/a');
   console.log('[WS][upgrade]   connection=', req.headers['connection'] || 'n/a');
   // v3.1.1：累計 upgrade 請求數（診斷用）
   global._wsUpgradeCount = (global._wsUpgradeCount || 0) + 1;
   if (upgradeHeader === 'websocket') {
     console.log('[WS][upgrade] ✅ 是 WebSocket upgrade，交給 wsServer.acceptUpgrade 處理');
     try {
       wsServer.acceptUpgrade(req, socket, head);
     } catch(e) {
       console.error('[WS][upgrade] ❌ acceptUpgrade 丟出異常:', e.message, e.stack);
       global._wsUpgradeErrors = (global._wsUpgradeErrors || 0) + 1;
       try {
         socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
         socket.destroy();
       } catch(_) {}
     }
   } else {
     console.warn('[WS][upgrade] ⚠️ upgrade header 不是 websocket (實際值: "' + upgradeHeader + '"), url=' + req.url);
     try {
       socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
       socket.destroy();
     } catch(_) {}
   }
 });

// ========== v2.7.3：伺服器級 AI（權威生成 + GM 聯動 + 持久化） ==========
//  所有地圖的 AI 由伺服器統一管理，客戶端只負責渲染
//  GM 修改 aiCount 後立即增減 AI 並廣播給在線玩家（WS + LP 雙通道）
//  AI 狀態持久化到 data/ai/{serverId}_{mapId}.json，重啟不變

/**
 * 根據伺服器設定調整 AI 數量（對所有已活躍地圖生效）
 */
function applyServerAISettings(serverId) {
  db.getServer(serverId).then(srv => {
    if (!srv) return;
    const aiCount = srv.aiCount != null ? parseInt(srv.aiCount) : 8;
    const initLevel = srv.initLevel != null ? parseInt(srv.initLevel) : 1;
    wsServer.setAICountForServer(serverId, aiCount, { initLevel });
  }).catch(() => {});
}

// 新玩家 join 地圖時，若該地圖還沒有 AI 就生成
const _origHandleMpApi = handleMpApi;
async function handleMpApiWithAI(req, res, pathname, query, account) {
  // 攔截 join：加入地圖前確保 AI 存在
  if (req.method === 'POST' && pathname === '/api/mp/join') {
    const serverId = query.serverId || 'zeus';
    // 等 join 處理完再 ensure AI（先讓玩家加入，再同步 AI）
    // 這裡用 wrap 的方式太複雜，改在 join API 內直接呼叫
  }
  return _origHandleMpApi(req, res, pathname, query, account);
}
// 暫時先不替換 handleMpApi，直接在 join 的 notify 後補 AI 廣播
// 更簡單：在 /api/mp/join 的回傳裡加 ais 欄位

// v2.7.2：WebSocket + 伺服器 AI 已在上方 ws-server.cjs 實作

// ========== 初始化 GM 帳號 ==========
async function initGM() {
  // Postgres 模式：用 db.ensureGMAccount 做 upsert（冪等，schema 就緒後才執行）
  if (db.getBackend() === 'postgres') {
    const hash = hashPassword(GM_PASSWORD);
    await db.ensureGMAccount(GM_ACCOUNT, hash);
    console.log('[Auth] GM 帳號已確保 (postgres):', GM_ACCOUNT);
    return;
  }
  // JSON 模式沿用既有邏輯
  const existing = await db.getAccount(GM_ACCOUNT);
  if (!existing) {
    await db.createAccount(GM_ACCOUNT, hashPassword(GM_PASSWORD), true);
    console.log('[Auth] 已建立 GM 帳號:', GM_ACCOUNT);
  }
}
// 啟動：立即 listen，DB 與 GM 帳號初始化在背景非同步進行（絕不阻塞服務）
// 理由：DigitalOcean / Render 等平台 readiness probe 要先 8080 通，DB 連線失敗不能害死網頁伺服器
(function bootstrap() {
  // 先建立資產索引（同步、不會失敗）
  assetIndex = buildAssetIndex(ASSETS_DIR);
  const assetCount = assetIndex.size;

  // 全局防崩：任何未捕獲異步錯誤都記 log 但不讓 process 死掉
  process.on('uncaughtException', (err) => {
    console.error('========================================');
    console.error('[FATAL][uncaughtException]', err.message || err);
    console.error(err.stack || String(err));
    console.error('[Server] 已攔截，程序繼續運行');
    console.error('========================================');
  });
  process.on('unhandledRejection', (reason, promise) => {
    console.error('========================================');
    console.error('[FATAL][unhandledRejection]', reason && reason.message ? reason.message : String(reason));
    if (reason && reason.stack) console.error(reason.stack);
    console.error('[Server] 已攔截，程序繼續運行');
    console.error('========================================');
  });

  // 立即 listen，不 await 任何 DB 操作
  server.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log('  君主之刃 v2.6.0 · 正式營運伺服器');
    console.log('========================================');
    console.log('  服務位址: http://0.0.0.0:' + PORT + ' (所有介面)');
    console.log('  工作目錄: ' + process.cwd());
    console.log('  專案根:   ' + ROOT_DIR);
    console.log('  資產目錄: ' + ASSETS_DIR);
    console.log('  資產檔數: ' + assetCount + (assetCount < 100 ? '  [警告] 資產數過少，可能 assets 未正確部署' : ''));
    console.log('  資料後端: ' + db.getBackend() + ' (DB 初始化進行中，稍後會更新)');
    console.log('  多人連線: WebSocket + Long-Poll 雙通道 (v2.7.3 AI 權威持久化)');
    console.log('  GM 帳號: ' + GM_ACCOUNT + ' (密碼請透過 GM_PASSWORD 環境變數設定)');
    if (GM_PASSWORD === '19811013') {
      console.log('  [警告] GM 使用預設密碼，強烈建議營運後立即修改！');
    }
    if (assetCount < 100) {
      console.log('  [警告] 偵測到資產不足，請確認 assets-part1.zip 與 assets-part2.zip 已解壓至');
      console.log('         專案根目錄（與 server/、index.html 同層）。');
      console.log('         診斷: GET /api/diag');
    }
    console.log('  API:');
    console.log('    POST /api/auth/register       註冊');
    console.log('    POST /api/auth/login          登入');
    console.log('    GET  /api/auth/me             目前身分');
    console.log('    GET  /api/servers             伺服器列表');
    console.log('    GET  /api/characters          角色列表');
    console.log('    POST /api/characters/save     存檔');
    console.log('    POST /api/bug-report          提交 Bug');
    console.log('    GET  /api/health              健康檢查 (含資產數)');
    console.log('    GET  /api/diag                部署診斷 (資產路徑/檔數/樣本)');
    console.log('========================================');
  });

  // 背景非同步初始化 DB + GM 帳號（失敗也不影響服務）
  (async function bgInit() {
    try {
      await db.init();
    } catch (e) {
      console.error('[Bootstrap] db.init 拋出未預期錯誤（已攔截，不影響服務）:', e.message);
    }
    try {
      await initGM();
    } catch (e) {
      console.error('[Bootstrap] initGM 拋出未預期錯誤（已攔截，不影響服務）:', e.message);
    }
    // 重掃資產索引（init 前後若有變動）
    try { assetIndex = buildAssetIndex(ASSETS_DIR); } catch (_) {}
    console.log('[Bootstrap] 背景初始化完成，目前後端:', db.getBackend());
  })();
})();

// 優雅關閉
process.on('SIGINT', () => {
  console.log('\n[Server] 正在關閉...');
  server.close(() => {
    console.log('[Server] 已關閉');
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000);
});

module.exports = server;

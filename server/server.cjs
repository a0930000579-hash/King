/**
 * 君主之刃 v2.0 · 正式營運後端伺服器
 *
 * 功能：
 *   1. 靜態檔案服務（承接舊版）
 *   2. 帳號系統：註冊 / 登入（密碼 sha256 雜湊）/ 角色存檔
 *   3. Socket.IO 多人連線伺服器：移動同步 / 聊天 / 戰鬥廣播
 *   4. GM 後台 API
 *   5. Bug 回報 API（向後相容）
 *
 * 資料庫：JSON 檔案持久化（無需外部資料庫，輕量部署）
 *   - data/accounts.json  帳號資料
 *   - data/characters.json 角色存檔
 *   - data/bug-reports.json Bug 回報
 *
 * 啟動：node server/server.cjs
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
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
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const ROOT_DIR = path.resolve(__dirname, '..');
const MAX_BODY_SIZE = 2 * 1024 * 1024; // 2MB
const DEV_PASSWORD = process.env.DEV_PASSWORD || 'owner2026';
const GM_ACCOUNT = '19811013';
const GM_PASSWORD = '19811013';

// 確保 data 目錄存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ========== 資料存取工具 ==========
function loadJSON(filename, defaultValue) {
  try {
    const f = path.join(DATA_DIR, filename);
    if (!fs.existsSync(f)) return defaultValue;
    const raw = fs.readFileSync(f, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('[DB] 讀取失敗', filename, ':', e.message);
    return defaultValue;
  }
}
function saveJSON(filename, data) {
  try {
    const f = path.join(DATA_DIR, filename);
    const tmp = f + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, f);
    return true;
  } catch (e) {
    console.error('[DB] 寫入失敗', filename, ':', e.message);
    return false;
  }
}

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

// ========== 伺服器清單 ==========
const SERVERS = [
  { id: 'justice', name: '正義伺服器', desc: '新手推薦 · 和平環境', status: 'smooth', online: true },
  { id: 'evil', name: '邪惡伺服器', desc: '高手雲集 · 自由 PVP', status: 'busy', online: true },
  { id: 'chaos', name: '混亂伺服器', desc: '熱血對戰 · 滿員警戒', status: 'full', online: true },
];

// ========== 線上玩家狀態（Socket.IO 用） ==========
const onlinePlayers = new Map(); // socketId -> { account, name, serverId, mapId, ... }

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
function getAuthAccount(req) {
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7));
}

// ========== 靜態檔案 ==========
function serveStatic(req, res, pathname) {
  if (pathname.includes('..') || pathname.startsWith('/data/') || pathname.startsWith('/server/') ||
      pathname.startsWith('/.git/') || pathname.startsWith('/.agent/') || pathname.startsWith('/.spark/')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  let filePath = path.join(ROOT_DIR, decodeURIComponent(pathname));

  if (pathname === '/' || pathname === '') {
    filePath = path.join(ROOT_DIR, 'index.html');
  }

  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch (e) { /* ignore */ }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }

  try {
    const stat = fs.statSync(filePath);
    const mime = getMime(filePath);
    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': stat.size,
      'Cache-Control': pathname.endsWith('.zip') ? 'no-cache' : 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    });
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

    const accounts = loadJSON('accounts.json', {});
    if (accounts[account]) return sendJson(res, 409, { error: '帳號已存在' });

    accounts[account] = {
      account,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      isGM: account === GM_ACCOUNT,
      characters: {}, // serverId -> [ {...saveData} ]
    };
    saveJSON('accounts.json', accounts);

    console.log('[Auth] 新帳號註冊:', account);
    return sendJson(res, 201, { ok: true, account });
  }

  // POST /api/auth/login
  if (req.method === 'POST' && pathname === '/api/auth/login') {
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const account = String(body.account || '').trim();
    const password = String(body.password || '');

    const accounts = loadJSON('accounts.json', {});
    const acc = accounts[account];
    if (!acc) return sendJson(res, 401, { error: '帳號或密碼錯誤' });
    if (acc.passwordHash !== hashPassword(password)) {
      // 檢查 GM 預設帳號（首次）
      if (account === GM_ACCOUNT && password === GM_PASSWORD) {
        // 正常，直接通過（上面 hash 比對已失敗，這裡單獨處理明碼比對）
        acc.passwordHash = hashPassword(password); // 更新為 hash
        saveJSON('accounts.json', accounts);
      } else {
        return sendJson(res, 401, { error: '帳號或密碼錯誤' });
      }
    }

    const token = genToken(account);
    console.log('[Auth] 登入成功:', account);
    return sendJson(res, 200, {
      ok: true,
      token,
      account,
      isGM: !!acc.isGM,
    });
  }

  // GET /api/auth/me
  if (req.method === 'GET' && pathname === '/api/auth/me') {
    const accName = getAuthAccount(req);
    if (!accName) return sendJson(res, 401, { error: '未登入' });
    const accounts = loadJSON('accounts.json', {});
    const acc = accounts[accName];
    if (!acc) return sendJson(res, 401, { error: '帳號不存在' });
    return sendJson(res, 200, {
      ok: true,
      account: acc.account,
      isGM: !!acc.isGM,
      createdAt: acc.createdAt,
      characterCount: Object.keys(acc.characters || {}).reduce((sum, k) => sum + (acc.characters[k] || []).length, 0),
    });
  }

  // === 伺服器列表 ===
  if (req.method === 'GET' && pathname === '/api/servers') {
    const list = SERVERS.map(s => ({
      ...s,
      players: Array.from(onlinePlayers.values()).filter(p => p.serverId === s.id).length,
    }));
    return sendJson(res, 200, { ok: true, servers: list });
  }

  // === 角色存檔 ===
  // GET /api/characters?server=xxx
  if (req.method === 'GET' && pathname === '/api/characters') {
    const accName = getAuthAccount(req);
    if (!accName) return sendJson(res, 401, { error: '未登入' });
    const serverId = query.server || 'justice';
    const accounts = loadJSON('accounts.json', {});
    const acc = accounts[accName];
    if (!acc) return sendJson(res, 401, { error: '帳號不存在' });
    const chars = (acc.characters && acc.characters[serverId]) || [];
    // 只回傳基本資訊，不回傳完整存檔
    const list = chars.map((c, i) => ({
      idx: i,
      name: c.player?.name || c.name || '',
      level: c.player?.level || c.level || 1,
      classId: c.player?.classId || c.classId || 'warrior',
      className: c.player?.className || c.className || '戰士',
      nation: c.nation || null,
      nationName: c.nationName || '',
    }));
    return sendJson(res, 200, { ok: true, characters: list });
  }

  // GET /api/characters/:idx?server=xxx
  if (req.method === 'GET' && pathname.startsWith('/api/characters/')) {
    const accName = getAuthAccount(req);
    if (!accName) return sendJson(res, 401, { error: '未登入' });
    const idxStr = pathname.slice('/api/characters/'.length);
    const idx = parseInt(idxStr);
    if (isNaN(idx)) return sendJson(res, 400, { error: '無效索引' });
    const serverId = query.server || 'justice';
    const accounts = loadJSON('accounts.json', {});
    const acc = accounts[accName];
    if (!acc) return sendJson(res, 401, { error: '帳號不存在' });
    const chars = (acc.characters && acc.characters[serverId]) || [];
    if (!chars[idx]) return sendJson(res, 404, { error: '角色不存在' });
    return sendJson(res, 200, { ok: true, saveData: chars[idx] });
  }

  // GET /api/characters/check-name?name=xxx&server=xxx
  // 檢查角色名是否重複（同一伺服器全局唯一）
  if (req.method === 'GET' && pathname === '/api/characters/check-name') {
    const name = query.name || '';
    const serverId = query.server || 'justice';
    if (!name) return sendJson(res, 400, { error: '名稱不可為空' });
    const accounts = loadJSON('accounts.json', {});
    let conflict = false;
    for (const accName in accounts) {
      const acc = accounts[accName];
      const chars = (acc.characters && acc.characters[serverId]) || [];
      for (const ch of chars) {
        if (ch && ch.name === name) { conflict = true; break; }
      }
      if (conflict) break;
    }
    return sendJson(res, 200, { available: !conflict, name: name });
  }

  // POST /api/characters/save（存檔）
  if (req.method === 'POST' && pathname === '/api/characters/save') {
    const accName = getAuthAccount(req);
    if (!accName) return sendJson(res, 401, { error: '未登入' });
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const serverId = body.serverId || 'justice';
    const charIdx = body.charIdx != null ? body.charIdx : 0;
    const saveData = body.saveData || {};
    const accounts = loadJSON('accounts.json', {});
    const acc = accounts[accName];
    if (!acc) return sendJson(res, 401, { error: '帳號不存在' });
    if (!acc.characters) acc.characters = {};
    if (!acc.characters[serverId]) acc.characters[serverId] = [];
    acc.characters[serverId][charIdx] = saveData;
    saveJSON('accounts.json', accounts);
    return sendJson(res, 200, { ok: true, savedAt: new Date().toISOString() });
  }

  // === Bug 回報（向後相容） ===
  // POST /api/bug-report
  if (req.method === 'POST' && pathname === '/api/bug-report') {
    let body;
    try { body = await parseJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
    const list = loadJSON('bug-reports.json', []);
    const now = new Date().toISOString();
    const report = {
      id: body.id || ('br_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
      createdAt: body.createdAt || now,
      version: body.version || '',
      description: String(body.description || '').slice(0, 2000),
      player: body.player || {},
      device: body.device || {},
      pageUrl: body.pageUrl || '',
      errors: Array.isArray(body.errors) ? body.errors.slice(0, 20) : [],
      account: getAuthAccount(req) || null,
    };
    list.unshift(report);
    if (list.length > 5000) list.length = 5000;
    saveJSON('bug-reports.json', list);
    return sendJson(res, 201, { ok: true, id: report.id });
  }
  // GET /api/bug-report/ping
  if (req.method === 'GET' && pathname === '/api/bug-report/ping') {
    return sendJson(res, 200, { ok: true, service: 'mmo-server', version: '2.0.0' });
  }

  // === GM API ===
  function verifyDevPassword(req, query, body) {
    const pwd =
      (req.headers && req.headers['x-dev-password']) ||
      (query && query.pwd) ||
      (body && body.pwd) || '';
    return String(pwd) === DEV_PASSWORD;
  }
  function verifyGM(req) {
    const acc = getAuthAccount(req);
    if (!acc) return false;
    const accounts = loadJSON('accounts.json', {});
    return !!(accounts[acc] && accounts[acc].isGM);
  }

  // GET /api/bug-report/list
  if (req.method === 'GET' && (pathname === '/api/bug-report/list' || pathname === '/api/bug-report')) {
    if (!verifyDevPassword(req, query, null) && !verifyGM(req)) {
      return sendJson(res, 403, { error: 'unauthorized' });
    }
    const list = loadJSON('bug-reports.json', []);
    return sendJson(res, 200, { ok: true, list });
  }
  // DELETE /api/bug-report/:id
  if (req.method === 'DELETE' && pathname.startsWith('/api/bug-report/')) {
    const id = decodeURIComponent(pathname.slice('/api/bug-report/'.length));
    if (!verifyDevPassword(req, query, null) && !verifyGM(req)) {
      return sendJson(res, 403, { error: 'unauthorized' });
    }
    const list = loadJSON('bug-reports.json', []);
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) return sendJson(res, 404, { error: 'not found' });
    list.splice(idx, 1);
    saveJSON('bug-reports.json', list);
    return sendJson(res, 200, { ok: true });
  }
  // POST /api/bug-report/clear
  if (req.method === 'POST' && pathname === '/api/bug-report/clear') {
    let body = {};
    try { body = await parseJsonBody(req); } catch (e) { /* ignore */ }
    if (!verifyDevPassword(req, query, body) && !verifyGM(req)) {
      return sendJson(res, 403, { error: 'unauthorized' });
    }
    saveJSON('bug-reports.json', []);
    return sendJson(res, 200, { ok: true });
  }

  // GET /api/gm/online - GM 查看線上玩家
  if (req.method === 'GET' && pathname === '/api/gm/online') {
    if (!verifyGM(req)) return sendJson(res, 403, { error: 'unauthorized' });
    const list = Array.from(onlinePlayers.values()).map(p => ({
      socketId: p.socketId,
      account: p.account,
      name: p.name,
      serverId: p.serverId,
      mapId: p.mapId,
      level: p.level,
    }));
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

  serveStatic(req, res, pathname);
});

// ========== Socket.IO 多人連線 ==========
if (socketIoInstalled) {
  try {
    const { Server } = require('socket.io');
    io = new Server(server, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
      maxHttpBufferSize: 1e6,
    });

    // 每張地圖的狀態（怪物位置等）
    const mapStates = new Map(); // mapId -> { monsters: Map }

    io.on('connection', (socket) => {
      console.log('[IO] 連線:', socket.id);

      // 玩家資料
      const player = {
        socketId: socket.id,
        account: null,
        name: 'Player',
        class: 'warrior',
        level: 1,
        serverId: null,
        mapId: null,
        channel: 0,
        x: 1024, y: 1024, dir: 1,
        transform: null,
        country: null,
      };

      socket.on('join_world', (data) => {
        player.name = data.name || 'Player';
        player.class = data.class || 'warrior';
        player.level = data.level || 1;
        onlinePlayers.set(socket.id, player);
        console.log('[IO] 加入世界:', player.name, socket.id);
      });

      socket.on('enter_map', (data) => {
        // 離開舊地圖
        if (player.mapId) {
          socket.leave('map:' + player.mapId);
          socket.to('map:' + player.mapId).emit('player_left', { socketId: socket.id });
        }
        player.mapId = data.mapId || 'village';
        player.channel = data.channel || 0;
        if (!player.serverId) player.serverId = 'justice';
        socket.join('map:' + player.mapId);

        // 廣播給地圖內其他人
        socket.to('map:' + player.mapId).emit('player_joined', {
          socketId: socket.id,
          name: player.name,
          class: player.class,
          level: player.level,
          x: player.x, y: player.y, dir: player.dir,
          transform: player.transform,
          country: player.country,
        });

        // 把當前地圖內的玩家列表發送給新進者
        const playersOnMap = [];
        for (const [sid, p] of onlinePlayers) {
          if (p.mapId === player.mapId && sid !== socket.id) {
            playersOnMap.push({
              socketId: sid,
              name: p.name,
              class: p.class,
              level: p.level,
              x: p.x, y: p.y, dir: p.dir,
              transform: p.transform,
              country: p.country,
            });
          }
        }
        socket.emit('map_state', { players: playersOnMap });
        console.log('[IO] 進入地圖:', player.name, '→', player.mapId);
      });

      socket.on('move', (data) => {
        if (!player.mapId) return;
        player.x = data.x || 0;
        player.y = data.y || 0;
        player.dir = data.dir || 1;
        // 廣播給同地圖其他玩家
        socket.to('map:' + player.mapId).emit('player_move', {
          socketId: socket.id,
          x: player.x,
          y: player.y,
          dir: player.dir,
        });
      });

      socket.on('update_profile', (data) => {
        if (data.name != null) player.name = data.name;
        if (data.class != null) player.class = data.class;
        if (data.level != null) player.level = data.level;
        if (data.transform !== undefined) player.transform = data.transform || null;
        if (data.country !== undefined) player.country = data.country || null;
        if (player.mapId) {
          socket.to('map:' + player.mapId).emit('player_profile', {
            socketId: socket.id,
            name: player.name,
            class: player.class,
            level: player.level,
            transform: player.transform,
            country: player.country,
          });
        }
      });

      socket.on('chat', (data) => {
        const text = String(data.text || '').slice(0, 200);
        if (!text) return;
        const channel = data.channel || 'world';
        const payload = {
          socketId: socket.id,
          name: player.name,
          level: player.level,
          text,
          channel,
          time: Date.now(),
        };
        if (channel === 'world' || channel === 'map') {
          // 世界頻道：廣播給所有線上玩家
          if (channel === 'world') {
            io.emit('chat', payload);
          } else {
            socket.to('map:' + player.mapId).emit('chat', payload);
            socket.emit('chat', payload);
          }
        } else {
          socket.emit('chat', payload);
        }
      });

      socket.on('attack_monster', (data) => {
        if (!player.mapId) return;
        // 廣播給同地圖其他玩家（視覺同步）
        socket.to('map:' + player.mapId).emit('monster_damage', {
          socketId: socket.id,
          monsterId: data.monsterId,
          skillId: data.skillId,
          damage: 0,
        });
      });

      socket.on('disconnect', () => {
        console.log('[IO] 斷線:', player.name, socket.id);
        if (player.mapId) {
          socket.to('map:' + player.mapId).emit('player_left', { socketId: socket.id });
        }
        onlinePlayers.delete(socket.id);
      });
    });

    console.log('[Socket.IO] 多人連線伺服器就緒');
  } catch (e) {
    console.error('[Socket.IO] 初始化失敗:', e.message);
    socketIoInstalled = false;
  }
}

// ========== 初始化 GM 帳號 ==========
function initGM() {
  const accounts = loadJSON('accounts.json', {});
  if (!accounts[GM_ACCOUNT]) {
    accounts[GM_ACCOUNT] = {
      account: GM_ACCOUNT,
      passwordHash: hashPassword(GM_PASSWORD),
      createdAt: new Date().toISOString(),
      isGM: true,
      characters: {},
    };
    saveJSON('accounts.json', accounts);
    console.log('[Auth] 已建立 GM 帳號:', GM_ACCOUNT);
  }
}
initGM();

// ========== 啟動 ==========
server.listen(PORT, () => {
  console.log('========================================');
  console.log('  君主之刃 v2.0 · 正式營運伺服器');
  console.log('========================================');
  console.log('  服務位址: http://localhost:' + PORT);
  console.log('  資料目錄: ' + DATA_DIR);
  console.log('  多人連線: ' + (socketIoInstalled ? '已啟用 (Socket.IO)' : '未啟用 (單機模式)'));
  console.log('  GM 帳號: ' + GM_ACCOUNT + ' / ' + GM_PASSWORD);
  console.log('  API:');
  console.log('    POST /api/auth/register       註冊');
  console.log('    POST /api/auth/login          登入');
  console.log('    GET  /api/auth/me             目前身分');
  console.log('    GET  /api/servers             伺服器列表');
  console.log('    GET  /api/characters          角色列表');
  console.log('    POST /api/characters/save     存檔');
  console.log('    POST /api/bug-report          提交 Bug');
  console.log('========================================');
});

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

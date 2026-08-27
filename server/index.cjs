/**
 * 君主之刃 · Bug 回報後端 API（輕量內聯實現）
 *
 * 不依賴任何 npm 套件，使用 Node.js 原生 http 模組 + fs 持久化存儲。
 * 資料以 JSON 檔案形式保存於 data/bug-reports.json，重啟伺服器不丟失。
 *
 * 對接前端 bug-report.js 已預留的 API 介面：
 *   GET    /api/bug-report/ping       後端存活偵測
 *   POST   /api/bug-report            提交一筆 Bug 回報
 *   GET    /api/bug-report/list       取得全部回報列表（需密碼）
 *   GET    /api/bug-report            同 list（需密碼）
 *   DELETE /api/bug-report/:id        刪除單筆（需密碼）
 *   POST   /api/bug-report/clear      清空全部（需密碼）
 *
 * 同時 serve 根目錄靜態檔案
 *
 * 啟動：node server/index.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'bug-reports.json');
const DEV_PASSWORD = process.env.DEV_PASSWORD || 'owner2026';
const ROOT_DIR = path.resolve(__dirname, '..');
const MAX_BODY_SIZE = 2 * 1024 * 1024; // 2MB

// 確保 data 目錄存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ===== 資料存取 =====
function loadReports() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('[DB] 讀取失敗:', e.message);
    return [];
  }
}

function saveReports(list) {
  try {
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(list, null, 2), 'utf8');
    fs.renameSync(tmp, DATA_FILE);
    return true;
  } catch (e) {
    console.error('[DB] 寫入失敗:', e.message);
    return false;
  }
}

// ===== 工具 =====
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
  };
  return map[ext] || 'application/octet-stream';
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
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
  // 確保 CORS header 一定有（OPTIONS 走前面的 handleApi 邏輯，這裡補一般回應）
  if (!res.getHeader('Access-Control-Allow-Origin')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-dev-password');
  }
  res.writeHead(status);
  res.end(body);
}

function verifyPassword(req, query, body) {
  // 優先從 header 讀（前端新邏輯），其次 query，最後 body（向後相容）
  const pwd = 
    (req.headers && req.headers['x-dev-password']) ||
    (query && query.pwd) ||
    (body && body.pwd) ||
    '';
  return String(pwd) === DEV_PASSWORD;
}

// ===== 靜態檔案服務 =====
function serveStatic(req, res, pathname) {
  // 安全：禁止路徑穿越
  if (pathname.includes('..') || pathname.startsWith('/data/') || pathname.startsWith('/server/') || pathname.startsWith('/.git/') || pathname.startsWith('/.agent/') || pathname.startsWith('/.spark/') || pathname.startsWith('/tmp/')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  let filePath = path.join(ROOT_DIR, decodeURIComponent(pathname));

  // 根路徑 → index.html
  if (pathname === '/' || pathname === '') {
    filePath = path.join(ROOT_DIR, 'index.html');
  }

  // 如果是目錄，試著加 index.html
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch (e) { /* ignore */ }

  // 不存在 → 404
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
    stream.on('error', () => {
      res.writeHead(500);
      res.end('Internal Server Error');
    });
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
}

// ===== API 處理 =====
async function handleApi(req, res, pathname, query) {
  // CORS：允許跨網域請求（遊戲前端與後端部署在不同網域）
  const origin = req.headers.origin || '';
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-dev-password');
  res.setHeader('Access-Control-Max-Age', '86400');

  // 預檢請求
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // POST /api/bug-report — 提交
  if (req.method === 'POST' && pathname === '/api/bug-report') {
    let body;
    try { body = await parseJsonBody(req); }
    catch (e) { return sendJson(res, 400, { error: e.message }); }

    const now = new Date().toISOString();
    const id = body.id || ('br_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
    const player = body.player || {};
    const device = body.device || {};
    const errors = Array.isArray(body.errors) ? body.errors.slice(0, 20) : [];

    const report = {
      id,
      createdAt: body.createdAt || now,
      version: body.version || '',
      description: String(body.description || '').slice(0, 2000),
      player: {
        name: player.name || '',
        level: player.level || 1,
        classId: player.classId || player.class || '',
        mapId: player.mapId || '',
      },
      device: {
        userAgent: device.userAgent || '',
        platform: device.platform || '',
        language: device.language || '',
        screen: device.screen || '',
        viewport: device.viewport || '',
        isMobile: !!device.isMobile,
        isIOS: !!device.isIOS,
      },
      pageUrl: body.pageUrl || '',
      errors: errors,
    };

    const list = loadReports();
    list.unshift(report);
    if (list.length > 5000) list.length = 5000; // 上限保護
    saveReports(list);

    return sendJson(res, 201, { ok: true, id });
  }

  // GET /api/bug-report/ping — 存活偵測
  if (req.method === 'GET' && pathname === '/api/bug-report/ping') {
    return sendJson(res, 200, { ok: true, service: 'bug-report', version: '1.0.0' });
  }

  // GET /api/bug-report/list 或 GET /api/bug-report — 列表
  if (req.method === 'GET' && (pathname === '/api/bug-report/list' || pathname === '/api/bug-report')) {
    if (!verifyPassword(req, query, null)) {
      return sendJson(res, 403, { error: 'unauthorized' });
    }
    const list = loadReports();
    return sendJson(res, 200, { ok: true, list });
  }

  // POST /api/bug-report/clear — 清空
  if (req.method === 'POST' && pathname === '/api/bug-report/clear') {
    let body = {};
    try { body = await parseJsonBody(req); } catch (e) { /* ignore */ }
    if (!verifyPassword(req, query, body)) {
      return sendJson(res, 403, { error: 'unauthorized' });
    }
    saveReports([]);
    return sendJson(res, 200, { ok: true });
  }

  // DELETE /api/bug-report/:id — 刪除單筆
  if (req.method === 'DELETE' && pathname.startsWith('/api/bug-report/')) {
    const id = decodeURIComponent(pathname.slice('/api/bug-report/'.length));
    if (!id || id === '') {
      return sendJson(res, 400, { error: 'missing id' });
    }
    if (!verifyPassword(req, query, null)) {
      return sendJson(res, 403, { error: 'unauthorized' });
    }
    const list = loadReports();
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) {
      return sendJson(res, 404, { error: 'not found' });
    }
    list.splice(idx, 1);
    saveReports(list);
    return sendJson(res, 200, { ok: true });
  }

  // GET /api/bug-report/stats — 統計
  if (req.method === 'GET' && pathname === '/api/bug-report/stats') {
    const list = loadReports();
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = list.filter((r) => (r.createdAt || '').slice(0, 10) === today).length;
    return sendJson(res, 200, { ok: true, total: list.length, today: todayCount });
  }

  // 其他 API 路徑
  return sendJson(res, 404, { error: 'not found' });
}

// ===== 主伺服器 =====
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || '/';
  const query = parsed.query || {};

  // API 請求
  if (pathname.startsWith('/api/')) {
    try {
      await handleApi(req, res, pathname, query);
    } catch (e) {
      console.error('[API] 未處理錯誤:', e);
      sendJson(res, 500, { error: 'internal server error' });
    }
    return;
  }

  // 靜態檔案
  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log('========================================');
  console.log('  君主之刃 · Bug 回報後端 API');
  console.log('========================================');
  console.log('  服務位址: http://localhost:' + PORT);
  console.log('  資料檔案: ' + DATA_FILE);
  console.log('  開發者密碼: ' + DEV_PASSWORD);
  console.log('  API 文件:');
  console.log('    POST   /api/bug-report        提交回報');
  console.log('    GET    /api/bug-report/ping   存活偵測');
  console.log('    GET    /api/bug-report/list   列表 (需密碼)');
  console.log('    DELETE /api/bug-report/:id    刪除 (需密碼)');
  console.log('    POST   /api/bug-report/clear  清空 (需密碼)');
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

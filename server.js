/**
 * server.js — 暗黑天堂MMORPG 多人連線伺服器
 * --------------------------------------------------
 * 本機測試：npm install && npm start  →  http://localhost:3000/demo.html
 * Heroku  ：自動讀 process.env.PORT，直接 git push 即可
 * 零外部依賴：記憶體運作，不需先裝資料庫就能跑（資料庫為日後擴充）。
 */

const path = require('path');
const http = require('http');
const fs = require('fs');
const express = require('express');
const { Server } = require('socket.io');

const { World } = require('./world');
const { BotManager } = require('./bot');
const { CombatManager } = require('./combat');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 1e6
});

// Heroku 需要信任 proxy
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
// /api 跨域（遊戲前端放在別的網域也要能回報Bug）
app.use('/api', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,x-dev-password');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.static(__dirname));

// ============ Bug 回報後台（JSON 檔持久化，零外部依賴）============
const DATA_DIR = path.join(__dirname, 'data');
const BUG_FILE = path.join(DATA_DIR, 'bug-reports.json');
const DEV_PASSWORD = process.env.DEV_PASSWORD || 'owner2026';
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
function loadBugs() {
  try { return JSON.parse(fs.readFileSync(BUG_FILE, 'utf8')); }
  catch (e) { return []; }
}
function saveBugs(arr) {
  try { fs.writeFileSync(BUG_FILE, JSON.stringify(arr.slice(-5000), null, 0)); }
  catch (e) { console.error('[bug] 寫入失敗', e.message); }
}
const isDev = (req) =>
  (req.header('x-dev-password') || req.query.key || '') === DEV_PASSWORD;

app.get('/api/bug-report/ping', (req, res) => res.json({ ok: true }));
app.post('/api/bug-report', (req, res) => {
  const b = req.body || {};
  const list = loadBugs();
  const rec = {
    id: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    version: String(b.version || ''), mapId: String(b.mapId || ''),
    name: String(b.name || ''), level: b.level || null, class: String(b.class || ''),
    ua: String(b.ua || ''), platform: String(b.platform || ''),
    screen: String(b.screen || ''), errors: Array.isArray(b.errors) ? b.errors.slice(-30) : [],
    text: String(b.text || '').slice(0, 4000),
    ts: Date.now()
  };
  list.push(rec); saveBugs(list);
  res.json({ ok: true, id: rec.id });
});
app.get('/api/bug-report/list', (req, res) => {
  if (!isDev(req)) return res.status(401).json({ ok: false, error: 'bad_password' });
  res.json({ ok: true, reports: loadBugs().sort((a, b) => b.ts - a.ts) });
});
app.delete('/api/bug-report/:id', (req, res) => {
  if (!isDev(req)) return res.status(401).json({ ok: false, error: 'bad_password' });
  saveBugs(loadBugs().filter(x => x.id !== req.params.id));
  res.json({ ok: true });
});
app.post('/api/bug-report/clear', (req, res) => {
  if (!isDev(req)) return res.status(401).json({ ok: false, error: 'bad_password' });
  saveBugs([]); res.json({ ok: true });
});

// 健康檢查（Heroku / 監控用）
app.get('/health', (req, res) => {
  res.json({ ok: true, online: world.onlineCount(), uptime: process.uptime() });
});

const world = new World(io);
const botCount = parseInt(process.env.BOT_COUNT || '20', 10);
const bots = botCount > 0 ? new BotManager(world, io, botCount) : null;
const combat = new CombatManager(world, io);

// ---- Socket 連線處理 ----
io.on('connection', (socket) => {
  console.log('[+] 連線', socket.id, '線上', world.onlineCount());

  // 進入世界（角色基本資料由客戶端提供；正式版應向資料庫/JWT驗證）
  socket.on('join_world', (data = {}, ack) => {
    const player = {
      id: socket.id,
      name: String(data.name || '冒險者').slice(0, 12),
      class: data.class || 'warrior',
      level: data.level || 1,
      x: 1024, y: 1024, dir: 1, moving: false,
      transform: data.transform || null,
      country: data.country || null,
      isBot: false
    };
    world.addPlayer(player);
    socket.join('world');
    if (typeof ack === 'function') ack({ ok: true, id: socket.id });
  });

  // 進入地圖頻道
  socket.on('enter_map', (data = {}, ack) => {
    const p = world.getPlayer(socket.id);
    if (!p) return ack && ack({ ok: false, error: 'not_joined' });
    const mapId = data.mapId || 'village';
    const ch = world.joinChannel(p, mapId, data.channel || 0);
    // Socket.IO room 機制：只跟同一頻道的人收發
    [...socket.rooms].forEach(r => { if (r.startsWith('chan:')) socket.leave(r); });
    socket.join(`chan:${mapId}:${ch}`);
    socket.to(`chan:${mapId}:${ch}`).emit('player_joined', { id: p.id, name: p.name });
    if (typeof ack === 'function') ack({ ok: true, mapId, channel: ch });
  });

  // 移動意圖（伺服器驗證後納入狀態，10Hz 廣播）
  socket.on('move', (data = {}) => {
    world.movePlayer(socket.id, data.x, data.y);
    const p = world.getPlayer(socket.id);
    if (p && data.dir) p.dir = data.dir;
  });

  // 面向
  socket.on('face', (data = {}) => {
    const p = world.getPlayer(socket.id);
    if (p) p.dir = data.dir || 1;
  });

  // 攻擊/技能（MVP：先廣播給同頻道播放特效；傷害判定待接戰鬥系統）
  socket.on('attack', (data = {}) => {
    const p = world.getPlayer(socket.id);
    if (!p) return;
    socket.to(`chan:${p.mapId}:${p.channel}`).emit('attack_fx', {
      from: socket.id, skillId: data.skillId || 'basic',
      tx: data.tx, ty: data.ty, dir: p.dir
    });
  });

  // 攻擊怪物（伺服器權威：驗證距離/冷卻、算傷害、掉落）
  socket.on('attack_monster', (data = {}, ack) => {
    const p = world.getPlayer(socket.id);
    if (!p) return ack && ack({ ok:false, error:'not_joined' });
    const res = combat.attackMonster(p, data.monsterId, data.skillId || 'basic');
    if (typeof ack === 'function') ack(res);
  });

  // 聊天
  socket.on('chat', (data = {}, ack) => {
    const p = world.getPlayer(socket.id);
    if (!p) return;
    const text = String(data.text || '').slice(0, 120).trim();
    if (!text) return;
    const channel = ['world','guild','country','whisper'].includes(data.channel) ? data.channel : 'world';
    io.to(`chan:${p.mapId}:${p.channel}`).emit('chat', {
      channel, name: p.name, text, ts: Date.now()
    });
    if (typeof ack === 'function') ack({ ok: true });
  });

  // 斷線
  socket.on('disconnect', () => {
    const p = world.removePlayer(socket.id);
    if (p) {
      socket.to(`chan:${p.mapId}:${p.channel}`).emit('player_left', { id: socket.id });
    }
    console.log('[-] 斷線', socket.id, '線上', world.onlineCount());
  });
});

// 10Hz 廣播迴圈
setInterval(() => world.broadcastTick(), 100);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log(' 暗黑天堂MMORPG 伺服器已啟動');
  console.log(' 本機測試: http://localhost:' + PORT + '/demo.html');
  console.log(' 正式遊戲: 把檔案放到 public/ 後連 http://localhost:' + PORT + '/');
  console.log(' AI玩家數:', botCount);
  console.log('========================================');
});

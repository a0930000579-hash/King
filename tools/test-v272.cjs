#!/usr/bin/env node
/**
 * v2.7.2 完整 headless 驗證腳本
 *  涵蓋：創角不崩潰、WebSocket 雙向 presence/移動/聊天、
 *        伺服器 AI 一致、跨服隔離、斷線移除、
 *        GM AI 數量聯動(8→3→5)、真系列入帳重登仍在
 */

const http = require('http');
const crypto = require('crypto');

const BASE = process.argv[2] || 'http://localhost:3000';
const WS_BASE = BASE.replace(/^http/, 'ws');
const SERVER_ID = 'zeus';
const SERVER2_ID = 'apollo';
const MAP_ID = 'village_01';

let pass = 0, fail = 0;
function assert(name, cond, detail = '') {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (detail ? ' — ' + detail : '')); }
}

function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers.Authorization = 'Bearer ' + token;
    if (body) {
      const b = JSON.stringify(body);
      opts.headers['Content-Length'] = Buffer.byteLength(b);
    }
    const req = http.request(opts, res => {
      let d = '';
      res.setEncoding('utf8');
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch (e) { resolve({ error: 'parse: ' + d.slice(0, 200), raw: d }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.setTimeout(8000, () => { req.destroy(new Error('timeout')); });
    req.end();
  });
}

async function registerAndLogin(prefix) {
  const rnd = Math.floor(Math.random() * 90000) + 10000;
  const acc = prefix + rnd;
  await api('POST', '/api/auth/register', { account: acc, password: 'Test1234' });
  const login = await api('POST', '/api/auth/login', { account: acc, password: 'Test1234' });
  return { account: acc, token: login.token };
}

// 原生 WebSocket 用 http upgrade 自己做（零依賴）
function wsConnect(path, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(WS_BASE + path);
    const key = crypto.randomBytes(16).toString('base64');

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + (url.search || ''),
      method: 'GET',
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        'Sec-WebSocket-Key': key,
        'Sec-WebSocket-Version': '13',
      },
    };

    const req = http.request(options);
    req.on('upgrade', (res, socket, head) => {
      const ws = {
        socket,
        _buffer: Buffer.alloc(0),
        _onmessage: null,
        _onclose: null,
        readyState: 1,
        send(obj) {
          const data = Buffer.from(JSON.stringify(obj), 'utf8');
          const len = data.length;
          let header;
          if (len < 126) {
            header = Buffer.alloc(2);
            header[0] = 0x81;
            header[1] = 0x80 | len;
          } else {
            header = Buffer.alloc(4);
            header[0] = 0x81;
            header[1] = 0x80 | 126;
            header.writeUInt16BE(len, 2);
          }
          const maskKey = crypto.randomBytes(4);
          const masked = Buffer.alloc(len);
          for (let i = 0; i < len; i++) masked[i] = data[i] ^ maskKey[i % 4];
          try { socket.write(Buffer.concat([header, maskKey, masked])); } catch(e) {}
        },
        close() {
          try {
            const closeFrame = Buffer.from([0x88, 0x00]);
            socket.write(closeFrame);
            socket.end();
          } catch(e) {}
        },
        set onmessage(fn) { this._onmessage = fn; },
        set onclose(fn) { this._onclose = fn; },
      };

      function processBuffer() {
        while (ws._buffer.length >= 2) {
          const b = ws._buffer;
          const opcode = b[0] & 0x0F;
          let payloadLen = b[1] & 0x7F;
          let offset = 2;
          if (payloadLen === 126) {
            if (b.length < 4) return;
            payloadLen = b.readUInt16BE(2);
            offset = 4;
          } else if (payloadLen === 127) {
            if (b.length < 10) return;
            payloadLen = Number(b.readBigUInt64BE(2));
            offset = 10;
          }
          if (b.length < offset + payloadLen) return;

          const payload = b.slice(offset, offset + payloadLen);
          ws._buffer = b.slice(offset + payloadLen);

          if (opcode === 0x8) {
            ws.readyState = 3;
            if (ws._onclose) ws._onclose();
            return;
          } else if (opcode === 0x9) {
            try {
              const pong = Buffer.alloc(2 + payload.length);
              pong[0] = 0x8A;
              pong[1] = payload.length;
              payload.copy(pong, 2);
              socket.write(pong);
            } catch(e) {}
          } else if (opcode === 0x1) {
            let msg;
            try { msg = JSON.parse(payload.toString('utf8')); } catch(e) { msg = { raw: payload.toString('utf8') }; }
            ws.messageQueue.push(msg);
            // 只保留最近 200 筆
            if (ws.messageQueue.length > 200) ws.messageQueue.shift();
            if (ws._onmessage) ws._onmessage({ data: msg });
          }
        }
      }

      ws.messageQueue = [];
      socket.on('data', chunk => {
        ws._buffer = Buffer.concat([ws._buffer, chunk]);
        try { processBuffer(); } catch(e) { console.error('ws parse err:', e.message); }
      });
      socket.on('close', () => {
        ws.readyState = 3;
        if (ws._onclose) ws._onclose();
      });
      socket.on('error', () => { ws.readyState = 3; });

      resolve(ws);
    });

    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(new Error('ws connect timeout')); });
    req.end();
  });
}

function wsWaitFor(ws, predicate, timeout = 5000) {
  return new Promise((resolve, reject) => {
    // 先檢查已緩衝的訊息
    for (const m of ws.messageQueue) {
      if (predicate(m)) {
        resolve(m);
        return;
      }
    }
    const timer = setTimeout(() => {
      ws.onmessage = oldHandler;
      reject(new Error('timeout waiting for ws event'));
    }, timeout);
    const oldHandler = ws.onmessage;
    ws.onmessage = (ev) => {
      if (predicate(ev.data)) {
        clearTimeout(timer);
        ws.onmessage = oldHandler;
        if (oldHandler) oldHandler(ev);
        resolve(ev.data);
      } else if (oldHandler) {
        oldHandler(ev);
      }
    };
  });
}

function wsCollectFor(ws, ms, filterFn) {
  return new Promise(resolve => {
    const collected = [];
    const old = ws.onmessage;
    ws.onmessage = (ev) => {
      if (!filterFn || filterFn(ev.data)) collected.push(ev.data);
      if (old) old(ev);
    };
    setTimeout(() => {
      ws.onmessage = old;
      resolve(collected);
    }, ms);
  });
}

(async () => {
console.log('');
console.log('=== v2.7.2 完整驗證 ===');
console.log('  server:', BASE);
console.log('');

// ---------- 0. health ----------
console.log('[0] /api/health');
const h = await api('GET', '/api/health');
assert('health status=online', h.status === 'online');
assert('health version=2.7.2', h.version === '2.7.2');
assert('health webSocket=true', h.webSocket === true);
assert('health socketIo=true', h.socketIo === true);
assert('health longPoll=true', h.longPoll === true);
console.log('');

// ---------- 1. 註冊登入 + 創角 ----------
console.log('[1] 註冊/登入/創角（alice/bob）');
const alice = await registerAndLogin('alice_');
const bob = await registerAndLogin('bob_');
assert('alice 登入成功', !!alice.token);
assert('bob 登入成功', !!bob.token);

const createA = await api('POST', '/api/characters/create',
  { name: '愛麗絲', classId: 'warrior', server: SERVER_ID }, alice.token);
const createB = await api('POST', '/api/characters/create',
  { name: '鮑伯', classId: 'mage', server: SERVER_ID }, bob.token);
assert('alice 創角 ok', createA.ok && createA.idx != null);
assert('bob 創角 ok', createB.ok && createB.idx != null);
assert('創角回傳 character 物件', !!createA.character);
assert('character.classId 正確', createA.character?.classId === 'warrior');
console.log('  創角回傳 character:', JSON.stringify(createA.character));
console.log('');

// ---------- 2. WebSocket presence ----------
console.log('[2] WebSocket 連線 + 同服同圖 presence');
const wsA = await wsConnect('/', alice.token);
wsA.send({ type: 'auth', token: alice.token, name: '愛麗絲', classId: 'warrior', level: 1 });
const authA = await wsWaitFor(wsA, m => m.type === 'auth_ok');
assert('alice WS auth_ok', authA.type === 'auth_ok');

const wsB = await wsConnect('/', bob.token);
wsB.send({ type: 'auth', token: bob.token, name: '鮑伯', classId: 'mage', level: 1 });
const authB = await wsWaitFor(wsB, m => m.type === 'auth_ok');
assert('bob WS auth_ok', authB.type === 'auth_ok');

wsA.send({ type: 'join_map', serverId: SERVER_ID, mapId: MAP_ID, playerId: alice.account + ':0', name: '愛麗絲', classId: 'warrior', level: 1, charIdx: 0 });
const mapStateA = await wsWaitFor(wsA, m => m.type === 'map_state');
assert('A map_state 正常', mapStateA.type === 'map_state');
assert('A 單獨時無其他玩家', mapStateA.players.length === 0);
assert('A 看到伺服器 AI > 0', Array.isArray(mapStateA.ais) && mapStateA.ais.length > 0);
const aiListA = mapStateA.ais;
console.log(`    A 看到伺服器 AI: ${aiListA.length} 隻`);
console.log(`    AI id 範例: ${aiListA.slice(0,3).map(a=>a.id).join(', ')}`);

wsB.send({ type: 'join_map', serverId: SERVER_ID, mapId: MAP_ID, playerId: bob.account + ':0', name: '鮑伯', classId: 'mage', level: 1, charIdx: 0 });
const mapStateB = await wsWaitFor(wsB, m => m.type === 'map_state');
assert('B 看到 A 在列表中', mapStateB.players.some(p => p.name === '愛麗絲'));
assert('B 看到相同數量 AI', mapStateB.ais.length === aiListA.length);

const aiIdsA = aiListA.map(a => a.id).sort().join(',');
const aiIdsB = mapStateB.ais.map(a => a.id).sort().join(',');
assert('兩客戶端 AI id 完全一致', aiIdsA === aiIdsB);

const joinEvt = await wsWaitFor(wsA, m => m.type === 'player_join' && m.name === '鮑伯');
assert('A 收到 B 的 player_join', !!joinEvt);
assert('player_join 含 classId=mage', joinEvt.classId === 'mage');
console.log('');

// ---------- 3. 移動同步 ----------
console.log('[3] 即時移動同步');
const moveTo = { x: 700, y: 600, dir: 'right' };
wsB.send({ type: 'move', x: moveTo.x, y: moveTo.y, dir: moveTo.dir });
const moveEvt = await wsWaitFor(wsA, m => m.type === 'player_move' && m.x === 700);
assert('A 收到 B 的移動座標 (700,600)', moveEvt && moveEvt.x === 700 && moveEvt.y === 600);
console.log(`    B 移動前初始位置 (1024,1024)`);
console.log(`    B 發送 move → (${moveTo.x}, ${moveTo.y})`);
console.log(`    A 收到 player_move → x=${moveEvt?.x}, y=${moveEvt?.y}, dir=${moveEvt?.dir}`);
console.log('');

// ---------- 4. 聊天互通 ----------
console.log('[4] 聊天互通');
wsA.send({ type: 'chat', text: '哈囉我是愛麗絲', channel: 'map' });
const chatEvt = await wsWaitFor(wsB, m => m.type === 'chat' && m.text === '哈囉我是愛麗絲');
assert('B 收到 A 的聊天', chatEvt && chatEvt.text === '哈囉我是愛麗絲');
assert('聊天含發送者姓名', chatEvt.name === '愛麗絲');
console.log(`    A → map: "哈囉我是愛麗絲"`);
console.log(`    B 收到: [${chatEvt.name}] ${chatEvt.text}`);
console.log('');

// ---------- 5. 跨服隔離 ----------
console.log('[5] 跨 serverId 隔離');
const srv2Create = await api('POST', '/api/characters/create',
  { name: '鮑伯二號', classId: 'rogue', server: SERVER2_ID }, bob.token);
assert('bob 在 server2 創角 ok', srv2Create.ok);

wsB.send({ type: 'join_map', serverId: SERVER2_ID, mapId: MAP_ID, playerId: bob.account + ':1', name: '鮑伯二號', classId: 'rogue', level: 1, charIdx: 1 });
const leaveEvt = await wsWaitFor(wsA, m => m.type === 'player_leave', 3000);
assert('B 切 server 後 A 收到 player_leave', !!leaveEvt);
console.log(`    B 切到 ${SERVER2_ID} → A 收到 player_leave: ${leaveEvt.playerId}`);

wsB.send({ type: 'chat', text: '我在另一個伺服器', channel: 'map' });
const crossChat = await wsCollectFor(wsA, 800, m => m.type === 'chat' && m.text === '我在另一個伺服器');
assert('跨伺服器聊天隔離（A 收不到）', crossChat.length === 0);

const srv2MapState = await wsWaitFor(wsB, m => m.type === 'map_state' && m.serverId === SERVER2_ID, 5000);
assert('B 在 server2 取得 map_state', !!srv2MapState);
const firstAi1 = aiListA[0]?.id || '';
const firstAi2 = srv2MapState.ais[0]?.id || '';
assert('B 在 server2 取得的 map_state.serverId=' + SERVER2_ID, srv2MapState.serverId === SERVER2_ID);
assert('兩伺服器 AI id 池獨立', firstAi1 !== firstAi2 && firstAi2.includes(SERVER2_ID));
console.log(`    server1 AI id 樣本: ${firstAi1}`);
console.log(`    server2 AI id 樣本: ${firstAi2}`);
console.log('');

// ---------- 6. 斷線移除 ----------
console.log('[6] 一方斷線 → 另一方 presence 移除');
wsB.close();
const discEvt = await wsWaitFor(wsA, m => m.type === 'player_leave', 5000);
assert('A 收到 B 的斷線離開事件', !!discEvt);
console.log(`    B 關閉 WS → A 收到 player_leave (playerId=${discEvt?.playerId})`);
console.log('');

// ---------- 7. GM AI 聯動 ----------
console.log('[7] GM AI 數量聯動：8 → 3 → 5（重連持久）');
const gmLogin = await api('POST', '/api/auth/login', { account: '19811013', password: '19811013' });
const gmToken = gmLogin.token;
assert('GM 登入成功', !!gmToken);

const beforeN = aiListA.length;
console.log(`    初始 AI 數量: ${beforeN}`);

const upd3 = await api('POST', '/api/gm/server/update',
  { id: SERVER_ID, aiCount: 3 }, gmToken);
assert('GM 更新 aiCount→3 成功', upd3.ok && upd3.server.aiCount === 3);

const ai3 = await wsWaitFor(wsA, m => (m.type === 'ai_update' || m.type === 'ai_snapshot') && m.ais && m.ais.length <= 3, 5000);
assert('GM 改 8→3 後 AI=3', ai3 && ai3.ais.length === 3);
console.log(`    GM 設定 aiCount=3 → 場上 AI=${ai3.ais.length}`);

const upd5 = await api('POST', '/api/gm/server/update',
  { id: SERVER_ID, aiCount: 5 }, gmToken);
assert('GM 更新 aiCount→5 成功', upd5.ok && upd5.server.aiCount === 5);

const ai5 = await wsWaitFor(wsA, m => (m.type === 'ai_update' || m.type === 'ai_snapshot') && m.ais && m.ais.length === 5, 5000);
assert('GM 改 3→5 後 AI=5', ai5 && ai5.ais.length === 5);
console.log(`    GM 設定 aiCount=5 → 場上 AI=${ai5.ais.length}`);

// 重連持久驗證
wsA.close();
await new Promise(r => setTimeout(r, 500));
const wsA2 = await wsConnect('/', alice.token);
wsA2.send({ type: 'auth', token: alice.token, name: '愛麗絲', classId: 'warrior', level: 1 });
await wsWaitFor(wsA2, m => m.type === 'auth_ok');
wsA2.send({ type: 'join_map', serverId: SERVER_ID, mapId: MAP_ID, playerId: alice.account + ':0', name: '愛麗絲', classId: 'warrior', level: 1, charIdx: 0 });
const msRe = await wsWaitFor(wsA2, m => m.type === 'map_state');
assert('重連後 AI 仍為 5（持久）', msRe.ais.length === 5);
console.log(`    A 斷線重連 → 看到 AI=${msRe.ais.length}（持久化確認）`);

wsA2.close();
console.log('');

// ---------- 8. 真系列入帳 ----------
console.log('[8] 真系列（金變）入帳 + 重登仍在');
const addTf = await api('POST', '/api/gm/adjust',
  { account: alice.account, action: 'addTransform', serverId: SERVER_ID, charIdx: 0,
    itemId: 't_emperor', itemName: '帝王（真·金）' }, gmToken);
assert('GM 加金變 t_emperor 成功', addTf.ok);

const cd1 = await api('GET', '/api/characters/0?server=' + SERVER_ID, null, alice.token);
assert('存檔含 transforms 陣列', cd1.saveData && Array.isArray(cd1.saveData.transforms));
const has1 = cd1.saveData.transforms?.some(t => t.id === 't_emperor');
assert('初次讀取含 t_emperor', has1 === true);
console.log(`    初次 transforms: ${cd1.saveData.transforms?.map(t=>t.id).join(', ')}`);

const relog = await api('POST', '/api/auth/login', { account: alice.account, password: 'Test1234' });
assert('重登成功', !!relog.token);
const cd2 = await api('GET', '/api/characters/0?server=' + SERVER_ID, null, relog.token);
const has2 = cd2.saveData.transforms?.some(t => t.id === 't_emperor');
assert('重登後 t_emperor 仍在', has2 === true);
console.log(`    重登 transforms: ${cd2.saveData.transforms?.map(t=>t.id).join(', ')}`);

const addTf2 = await api('POST', '/api/gm/adjust',
  { account: alice.account, action: 'addTransform', serverId: SERVER_ID, charIdx: 0,
    itemId: 't_wolf', itemName: '戰狼' }, gmToken);
assert('GM 加普通變身 t_wolf 成功', addTf2.ok);
const cd3 = await api('GET', '/api/characters/0?server=' + SERVER_ID, null, relog.token);
const hasWolf = cd3.saveData.transforms?.some(t => t.id === 't_wolf');
assert('普通變身 t_wolf 也入帳', hasWolf === true);
console.log('');

// ---------- 9. Long-Poll fallback ----------
console.log('[9] Long-Poll 降級備援');
const lpJoin = await api('POST', '/api/mp/join',
  { mapId: MAP_ID, serverId: SERVER_ID, charIdx: 0 }, alice.token);
assert('long-poll join 成功', lpJoin.ok);
assert('long-poll 回傳伺服器 AI（與 WS 一致 5 隻）', lpJoin.ais?.length === 5);
console.log(`    LP join 後 AI: ${lpJoin.ais?.length} 隻`);
await api('POST', '/api/mp/leave', { mapId: MAP_ID, serverId: SERVER_ID, charIdx: 0 }, alice.token);
console.log('');

// ---------- 10. GM 三頁迴歸 ----------
console.log('[10] GM 三頁迴歸');
const g1 = await api('GET', '/api/gm/online', null, gmToken);
assert('GM 線上玩家 API 正常', g1 && Array.isArray(g1.players));
const g2 = await api('GET', '/api/gm/server/list', null, gmToken);
assert('GM 伺服器列表 OK', g2.ok && Array.isArray(g2.servers));
const g3 = await api('GET', '/api/gm/players?page=1', null, gmToken);
assert('GM 玩家列表 OK', g3.ok);
console.log('');

// ---------- 總結 ----------
console.log('========================================');
console.log(`  總結果：${pass} 通過 / ${fail} 失敗`);
console.log('========================================');

process.exit(fail > 0 ? 1 : 0);
})().catch(e => {
  console.error('測試崩潰:', e.message);
  console.error(e.stack);
  process.exit(2);
});

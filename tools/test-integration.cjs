#!/usr/bin/env node
/**
 * 完整 v2.7.0 整合驗證腳本
 * - health 版本
 * - 靜態資產 HTTP 200 抽樣
 * - GM 三頁（概況 / 伺服器 / 玩家）
 * - 雙客戶端聯機 presence
 * - 音檔 200
 */

const http = require('http');
const BASE = process.argv[2] || 'http://localhost:3000';
const SERVER_ID = 'zeus';
const MAP_ID = 'village_01';

let pass = 0, fail = 0;
function assert(name, cond, detail = '') {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + ' ' + detail); }
}

function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const opts = {
      hostname: url.hostname, port: url.port,
      path: url.pathname + url.search, method,
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
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch (e) { resolve({ status: res.statusCode, body: { error: 'parse: ' + d.slice(0, 100) } }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.setTimeout(5000, () => req.destroy(new Error('timeout')));
    req.end();
  });
}

function httpGet(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const req = http.request({
      hostname: url.hostname, port: url.port,
      path: url.pathname + url.search, method: 'GET',
    }, res => {
      let size = 0;
      res.on('data', c => size += c.length);
      res.on('end', () => resolve({ status: res.statusCode, size }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error('timeout')));
    req.end();
  });
}

async function registerAndLogin(prefix) {
  const rnd = Math.floor(Math.random() * 90000) + 10000;
  const account = (prefix + rnd).slice(0, 20);
  const password = 'Test1234';
  const reg = await api('POST', '/api/auth/register', { account, password });
  if (!reg.body.ok) throw new Error(prefix + ' 註冊失敗: ' + (reg.body.error || ''));
  const login = await api('POST', '/api/auth/login', { account, password });
  if (!login.body.ok) throw new Error(prefix + ' 登入失敗: ' + (login.body.error || ''));
  return { account, token: login.body.token };
}

(async () => {
  console.log('=== v2.7.0 整合驗證 ===');
  console.log('server:', BASE);

  try {
    // 1. health
    console.log('\n[1] Health / 版本');
    const h = await api('GET', '/api/health');
    assert('health 200', h.status === 200, 'status=' + h.status);
    assert('version = 2.7.0', h.body.version === '2.7.0', 'version=' + (h.body.version || '?'));
    assert('資產就緒', h.body.assetsReady === true);

    // 2. 靜態頁面
    console.log('\n[2] 靜態頁面 HTTP 200');
    const pages = ['/', '/index.html', '/gm.html', '/diag.html', '/game-bundle.html'];
    for (const p of pages) {
      const r = await httpGet(p);
      assert(`${p} 200`, r.status === 200, 'status=' + r.status + ' size=' + r.size);
    }

    // 3. 音檔
    console.log('\n[3] 音檔 HTTP 200');
    const audios = [
      'assets/audio/bgm/village.wav',
      'assets/audio/bgm/battle.wav',
      'assets/audio/bgm/siege.wav',
      'assets/audio/sfx/slash.wav',
      'assets/audio/sfx/hit.wav',
      'assets/audio/sfx/arrow.wav',
      'assets/audio/sfx/spell.wav',
      'assets/audio/sfx/levelup.wav',
      'assets/audio/sfx/death.wav',
      'assets/audio/sfx/gate_break.wav',
    ];
    for (const a of audios) {
      const r = await httpGet('/' + a);
      assert(`${a} 200`, r.status === 200, 'status=' + r.status + ' size=' + r.size);
    }

    // 4. 登入 / 角色流程
    console.log('\n[4] 帳號流程（註冊→登入→選服→選角→進遊戲）');
    const a = await registerAndLogin('qa_');
    assert('註冊+登入', !!a.token);

    const srvList = await api('GET', '/api/servers');
    assert('伺服器列表非空', Array.isArray(srvList.body.servers) && srvList.body.servers.length > 0);

    const charName = 'QA角色' + Math.floor(Math.random() * 90000 + 10000);
    const ch = await api('POST', '/api/characters/create', {
      server: SERVER_ID, name: charName, classId: 'warrior',
    }, a.token);
    assert('建立角色', ch.body.ok || (ch.body.id != null), JSON.stringify(ch.body).slice(0, 80));

    const chList = await api('GET', '/api/characters?server=' + SERVER_ID, null, a.token);
    assert('角色列表有角色', Array.isArray(chList.body.characters) && chList.body.characters.length > 0);

    // 5. 雙客戶端 presence
    console.log('\n[5] 雙客戶端聯機 presence');
    const b = await registerAndLogin('qb_');
    const nameB = 'QB玩家' + Math.floor(Math.random() * 90000 + 10000);
    await api('POST', '/api/characters/create', {
      server: SERVER_ID, name: nameB, classId: 'rogue',
    }, b.token);

    const jA = await api('POST', '/api/mp/join', {
      serverId: SERVER_ID, name: charName, mapId: MAP_ID,
      x: 1200, y: 800, classId: 'warrior', level: 1,
    }, a.token);
    assert('A 加入 mp', jA.body.ok && jA.body.playerId);

    const jB = await api('POST', '/api/mp/join', {
      serverId: SERVER_ID, name: nameB, mapId: MAP_ID,
      x: 1300, y: 850, classId: 'rogue', level: 1,
    }, b.token);
    assert('B 加入 mp', jB.body.ok && jB.body.playerId);

    const bSawA = (jB.body.others || []).find(p => p.name === charName);
    assert('B 看到 A', !!bSawA, 'others=' + (jB.body.others || []).map(p => p.name).join(','));

    const jA2 = await api('POST', '/api/mp/join', {
      serverId: SERVER_ID, name: charName, mapId: MAP_ID,
      x: 1250, y: 820, classId: 'warrior', level: 1,
    }, a.token);
    const aSawB = (jA2.body.others || []).find(p => p.name === nameB);
    assert('A 看到 B', !!aSawB);

    // 6. GM 三頁
    console.log('\n[6] GM 三頁驗證');
    const gm = await api('POST', '/api/auth/login', {
      account: '19811013', password: '19811013',
    });
    const gmToken = gm.body.token;
    assert('GM 登入', !!gmToken);

    const online = await api('GET', '/api/gm/online', null, gmToken);
    assert('GM 概況：線上 >= 2', (online.body.count || 0) >= 2,
      'count=' + online.body.count + ' players=' + (online.body.players || []).length);

    const srvs = await api('GET', '/api/gm/server/list', null, gmToken);
    assert('GM 伺服器列表 > 0', (srvs.body.servers || []).length > 0);
    const zeus = (srvs.body.servers || []).find(s => s.id === SERVER_ID);
    assert('GM zeus 線上數 > 0', zeus && (zeus.onlineCount || 0) > 0,
      'onlineCount=' + (zeus && zeus.onlineCount));

    const players = await api('GET', '/api/gm/players?page=1&pageSize=20', null, gmToken);
    assert('GM 玩家總數 > 0', (players.body.total || 0) > 0);
    assert('GM 玩家列表非空', Array.isArray(players.body.list) && players.body.list.length > 0);
    assert('GM 玩家有帳號+時間', (players.body.list || []).some(p => p.account && p.createdAt));

    // 伺服器 CRUD
    const srvId = 'qa_' + Date.now();
    const cr = await api('POST', '/api/gm/server/create', {
      id: srvId, name: 'QA測試服', status: 'preparing', aiCount: 2,
      initLevel: 5, maxPlayers: 50, info: 'QA test',
    }, gmToken);
    assert('GM 新增伺服器', cr.body.ok && cr.body.server);

    const up = await api('POST', '/api/gm/server/update', {
      id: srvId, name: 'QA改名', maxPlayers: 30,
    }, gmToken);
    assert('GM 編輯伺服器', up.body.ok);

    const tg = await api('POST', '/api/gm/server/toggle', {
      id: srvId, status: 'closed',
    }, gmToken);
    assert('GM 切換伺服器狀態', tg.body.ok);

    const dl = await api('POST', '/api/gm/server/delete', { id: srvId }, gmToken);
    assert('GM 刪除伺服器', dl.body.ok);

    // 清理
    await api('POST', '/api/mp/leave', { serverId: SERVER_ID, mapId: MAP_ID }, a.token);
    await api('POST', '/api/mp/leave', { serverId: SERVER_ID, mapId: MAP_ID }, b.token);

  } catch (e) {
    console.error('\n[ERROR]', e.message);
    fail++;
  }

  console.log('\n=== 整合驗證結果：' + pass + ' 通過, ' + fail + ' 失敗 ===');
  process.exit(fail > 0 ? 1 : 0);
})();

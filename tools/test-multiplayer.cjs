#!/usr/bin/env node
/**
 * Headless 雙客戶端聯機驗證腳本（純 http 模組）
 * 驗證：同 serverId 雙客戶端 presence 互見、GM 三頁正確
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
        catch (e) { resolve({ error: 'parse: ' + d.slice(0, 100) }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.setTimeout(5000, () => { req.destroy(new Error('timeout')); });
    req.end();
  });
}

async function registerAndLogin(prefix) {
  const rnd = Math.floor(Math.random() * 90000) + 10000;
  const account = (prefix + rnd).slice(0, 20);
  const password = 'Test1234';
  const reg = await api('POST', '/api/auth/register', { account, password });
  if (!reg.ok) throw new Error(prefix + ' 註冊失敗: ' + (reg.error || JSON.stringify(reg)));
  const login = await api('POST', '/api/auth/login', { account, password });
  if (!login.ok) throw new Error(prefix + ' 登入失敗: ' + (login.error || ''));
  return { account, token: login.token };
}

(async () => {
  console.log('=== 雙客戶端聯機 + GM 驗證 ===');
  console.log('server:', BASE);

  try {
    // 0. health
    const health = await api('GET', '/api/health');
    assert('health / version 2.7.0',
      health.status === 'online' && health.version === '2.7.0',
      'version=' + (health.version || '?'));

    // 1. 註冊 + 登入
    console.log('\n[1] 註冊 + 登入');
    const a = await registerAndLogin('mpA');
    const b = await registerAndLogin('mpB');
    assert('A token 取得', !!a.token);
    assert('B token 取得', !!b.token);

    // 2. 建立角色
    console.log('\n[2] 建立角色');
    const nameA = '玩A' + Math.floor(Math.random() * 90000 + 10000);
    const nameB = '玩B' + Math.floor(Math.random() * 90000 + 10000);
    const charA = await api('POST', '/api/characters/create', {
      server: SERVER_ID, name: nameA, classId: 'warrior',
    }, a.token);
    const charB = await api('POST', '/api/characters/create', {
      server: SERVER_ID, name: nameB, classId: 'rogue',
    }, b.token);
    assert('A 角色建立', charA.ok || (charA.id != null), JSON.stringify(charA).slice(0, 80));
    assert('B 角色建立', charB.ok || (charB.id != null), JSON.stringify(charB).slice(0, 80));

    // 3. A 先加入 → B 加入 → B 應在 others 看到 A
    console.log('\n[3] presence 雙向可見');
    const joinA = await api('POST', '/api/mp/join', {
      serverId: SERVER_ID, name: nameA, mapId: MAP_ID,
      x: 1200, y: 800, classId: 'warrior', level: 1,
    }, a.token);
    assert('A 加入 mp', joinA.ok && joinA.playerId, JSON.stringify(joinA).slice(0, 80));

    const joinB = await api('POST', '/api/mp/join', {
      serverId: SERVER_ID, name: nameB, mapId: MAP_ID,
      x: 1300, y: 850, classId: 'rogue', level: 1,
    }, b.token);
    assert('B 加入 mp', joinB.ok && joinB.playerId, JSON.stringify(joinB).slice(0, 80));

    // B 看到 A（join 返回的 others）
    const bOthers = joinB.others || [];
    const bSawA = bOthers.find(p => p.name === nameA);
    assert('B 看到 A（join others 列表）', !!bSawA,
      'others=' + bOthers.map(p => p.name).join(','));

    // A 再 join 一次（重新進入），此時 others 應有 B
    const joinA2 = await api('POST', '/api/mp/join', {
      serverId: SERVER_ID, name: nameA, mapId: MAP_ID,
      x: 1250, y: 820, classId: 'warrior', level: 1,
    }, a.token);
    const aOthers = joinA2.others || [];
    const aSawB = aOthers.find(p => p.name === nameB);
    assert('A 看到 B（二次 join others 列表）', !!aSawB,
      'others=' + aOthers.map(p => p.name).join(','));

    // 4. 位置更新可見
    console.log('\n[4] 位置同步');
    const upA = await api('POST', '/api/mp/update', {
      serverId: SERVER_ID, mapId: MAP_ID,
      x: 1250, y: 820, dir: 'down', state: 'walk', hp: 100, mp: 50,
    }, a.token);
    const upB = await api('POST', '/api/mp/update', {
      serverId: SERVER_ID, mapId: MAP_ID,
      x: 1320, y: 860, dir: 'left', state: 'idle', hp: 90, mp: 40,
    }, b.token);
    assert('A 位置上傳', upA.ok || !upA.error, JSON.stringify(upA).slice(0, 60));
    assert('B 位置上傳', upB.ok || !upB.error, JSON.stringify(upB).slice(0, 60));

    // 5. GM 三頁驗證
    console.log('\n[5] GM 三頁驗證');
    const gmLogin = await api('POST', '/api/auth/login', {
      account: '19811013', password: '19811013',
    });
    const gmToken = gmLogin.token;
    assert('GM 登入 token', !!gmToken);

    // 概況：線上人數
    const onlineRes = await api('GET', '/api/gm/online', null, gmToken);
    const onlineCount = onlineRes.count ||
      (onlineRes.players && onlineRes.players.length) || 0;
    assert('GM 概況：線上玩家 >= 2', onlineCount >= 2,
      'count=' + onlineCount + ' / players=' + (onlineRes.players || []).length);

    // 伺服器管理
    const srvRes = await api('GET', '/api/gm/server/list', null, gmToken);
    const servers = srvRes.servers || [];
    const zeus = servers.find(s => s.id === SERVER_ID);
    assert('GM 伺服器列表含 zeus', !!zeus, 'total=' + servers.length);
    if (zeus) {
      assert('zeus 線上數 > 0', (zeus.onlineCount || 0) > 0,
        'onlineCount=' + zeus.onlineCount);
    }

    // 玩家管理
    const plRes = await api('GET', '/api/gm/players?page=1&pageSize=20', null, gmToken);
    const plTotal = plRes.total || 0;
    const plList = plRes.list || [];
    assert('GM 玩家總數 > 0', plTotal > 0, 'total=' + plTotal);
    assert('GM 玩家列表非空', plList.length > 0, 'len=' + plList.length);
    assert('GM 玩家有註冊時間', plList.some(p => p.createdAt));
    assert('GM 玩家有帳號', plList.some(p => p.account));

    // 6. 伺服器增刪改（CRUD）
    console.log('\n[6] 伺服器 CRUD 驗證');
    const newSrv = await api('POST', '/api/gm/server/create', {
      id: 'test_' + Date.now(), name: '測試伺服器',
      status: 'preparing', aiCount: 3, initLevel: 10, maxPlayers: 100, info: 'CRUD 測試',
    }, gmToken);
    assert('GM 新增伺服器', newSrv.ok && newSrv.server, JSON.stringify(newSrv).slice(0, 100));
    const srvId = newSrv.server ? newSrv.server.id : null;

    if (srvId) {
      const updSrv = await api('POST', '/api/gm/server/update', {
        id: srvId, name: '改名後伺服器', maxPlayers: 50,
      }, gmToken);
      assert('GM 編輯伺服器', updSrv.ok && updSrv.server,
        JSON.stringify(updSrv).slice(0, 100));

      const toggleSrv = await api('POST', '/api/gm/server/toggle', {
        id: srvId, status: 'closed',
      }, gmToken);
      assert('GM 切換伺服器狀態', toggleSrv.ok && toggleSrv.server,
        JSON.stringify(toggleSrv).slice(0, 100));

      const delSrv = await api('POST', '/api/gm/server/delete', {
        id: srvId,
      }, gmToken);
      assert('GM 刪除伺服器', delSrv.ok, JSON.stringify(delSrv).slice(0, 80));
    }

    // 7. 離開
    console.log('\n[7] 清理');
    await api('POST', '/api/mp/leave', { serverId: SERVER_ID, mapId: MAP_ID }, a.token);
    await api('POST', '/api/mp/leave', { serverId: SERVER_ID, mapId: MAP_ID }, b.token);

  } catch (e) {
    console.error('\n[ERROR]', e.message);
    console.error(e.stack);
    fail++;
  }

  console.log('\n=== 結果：' + pass + ' 通過, ' + fail + ' 失敗 ===');
  process.exit(fail > 0 ? 1 : 0);
})();

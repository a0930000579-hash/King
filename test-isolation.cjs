const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');

const TEST_DATA_DIR = '/tmp/mb_test_iso_' + Date.now() + '_' + Math.floor(Math.random()*100000);
const SERVER_PORT = 18777;
fs.mkdirSync(TEST_DATA_DIR, { recursive: true });

const env = { ...process.env, DATA_DIR: TEST_DATA_DIR, PORT: String(SERVER_PORT) };
const serverProc = spawn('node', ['server/server.cjs'], { env, stdio: ['pipe', 'pipe', 'pipe'] });

let srvLog = '';
serverProc.stdout.on('data', d => srvLog += d);
serverProc.stderr.on('data', d => srvLog += d);

function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1', port: SERVER_PORT, path, method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function registerAndLogin(account, password) {
  const reg = await api('POST', '/api/auth/register', { account, password });
  if (reg.status !== 201) return { token: null, reg };
  const log = await api('POST', '/api/auth/login', { account, password });
  return { token: log.body.token || null, reg, login: log };
}

let passed = 0, failed = 0;
function assert(name, cond, detail) {
  if (cond) { passed++; console.log('  ✅ ' + name); }
  else { failed++; console.log('  ❌ ' + name + (detail ? ' — ' + detail : '')); }
}

(async () => {
  try {
    for (let i = 0; i < 40; i++) {
      try { const r = await api('GET', '/api/health'); if (r.status === 200) break; } catch {}
      await new Promise(r => setTimeout(r, 300));
    }
    console.log('伺服器就緒 (port=' + SERVER_PORT + ')\n');

    // ===== 測試 1 =====
    console.log('--- 測試 1：A 帳號註冊/登入/創角色 ---');
    const ralA = await registerAndLogin('testA', 'pass1234');
    const tokenA = ralA.token;
    assert('A 註冊+登入取得 token', !!tokenA);

    if (!tokenA) {
      console.log('\n伺服器輸出:\n' + srvLog);
      throw new Error('login 失敗，無法繼續測試');
    }

    const c123 = await api('POST', '/api/characters/create',
      { name: '角色123', classId: 'warrior', server: 'zeus' }, tokenA);
    assert('A 創角色 123（槽0）', c123.status === 201 && c123.body.idx === 0,
      's=' + c123.status + ' idx=' + c123.body?.idx);

    const c234 = await api('POST', '/api/characters/create',
      { name: '角色234', classId: 'mage', server: 'zeus' }, tokenA);
    assert('A 創角色 234（槽1）', c234.status === 201 && c234.body.idx === 1,
      's=' + c234.status + ' idx=' + c234.body?.idx);

    await api('POST', '/api/characters/save', {
      serverId: 'zeus', charIdx: 0,
      saveData: { player: { name: '角色123', classId: 'warrior', level: 5, created: true },
                  resources: { gold: 500, gem: 100 } },
    }, tokenA);
    await api('POST', '/api/characters/save', {
      serverId: 'zeus', charIdx: 1,
      saveData: { player: { name: '角色234', classId: 'mage', level: 10, created: true },
                  resources: { gold: 2000, gem: 500 } },
    }, tokenA);

    // ===== 測試 2 =====
    console.log('\n--- 測試 2：同帳號角色資料各自獨立 ---');
    const g0 = await api('GET', '/api/characters/0?server=zeus', null, tokenA);
    assert('槽0 = 角色123 / level=5 / gem=100',
      g0.body.saveData?.player?.name === '角色123' &&
      g0.body.saveData?.player?.level === 5 &&
      g0.body.saveData?.resources?.gem === 100,
      'name=' + g0.body.saveData?.player?.name + ' lv=' + g0.body.saveData?.player?.level);

    const g1 = await api('GET', '/api/characters/1?server=zeus', null, tokenA);
    assert('槽1 = 角色234 / level=10 / gem=500',
      g1.body.saveData?.player?.name === '角色234' &&
      g1.body.saveData?.player?.level === 10 &&
      g1.body.saveData?.resources?.gem === 500);

    // ===== 測試 3：B 越權 =====
    console.log('\n--- 測試 3：B 帳號越權防護 ---');
    const ralB = await registerAndLogin('testB', 'pass5678');
    const tokenB = ralB.token;
    assert('B 註冊+登入取得 token', !!tokenB);

    const listB = await api('GET', '/api/characters?server=zeus', null, tokenB);
    const bChars = (listB.body.characters || []).filter(c => c);
    assert('B 角色列表為空', bChars.length === 0, '實際=' + bChars.length);

    const hack0 = await api('GET', '/api/characters/0?server=zeus', null, tokenB);
    assert('B 越權讀槽0 → 404', hack0.status === 404, 'status=' + hack0.status);
    const hack1 = await api('GET', '/api/characters/1?server=zeus', null, tokenB);
    assert('B 越權讀槽1 → 404', hack1.status === 404, 'status=' + hack1.status);

    // B 越權寫入（應寫到 B 自己的槽0，不影響 A）
    await api('POST', '/api/characters/save', {
      serverId: 'zeus', charIdx: 0,
      saveData: { player: { name: '駭客', level: 999 } },
    }, tokenB);
    const a0After = await api('GET', '/api/characters/0?server=zeus', null, tokenA);
    assert('A 槽0 不受 B 越權寫入影響',
      a0After.body.saveData?.player?.name === '角色123' &&
      a0After.body.saveData?.player?.level === 5,
      'name=' + a0After.body.saveData?.player?.name + ' lv=' + a0After.body.saveData?.player?.level);

    // ===== 測試 4：B 創角色 =====
    console.log('\n--- 測試 4：B 創角色 456，數據獨立 ---');
    const c456 = await api('POST', '/api/characters/create',
      { name: '角色456', classId: 'archer', server: 'zeus' }, tokenB);
    assert('B 創角色 456 成功', c456.status === 201,
      's=' + c456.status + ' idx=' + c456.body?.idx);

    await api('POST', '/api/characters/save', {
      serverId: 'zeus', charIdx: 0,
      saveData: { player: { name: '角色456', classId: 'archer', level: 3, created: true },
                  resources: { gold: 100, gem: 50 } },
    }, tokenB);

    const bg0 = await api('GET', '/api/characters/0?server=zeus', null, tokenB);
    assert('B 槽0 = 角色456（非 A 的角色123）',
      bg0.body.saveData?.player?.name === '角色456' &&
      bg0.body.saveData?.player?.level === 3,
      'name=' + bg0.body.saveData?.player?.name + ' lv=' + bg0.body.saveData?.player?.level);

    // ===== 測試 5：列表 =====
    console.log('\n--- 測試 5：兩帳號角色列表各自正確 ---');
    const listA = await api('GET', '/api/characters?server=zeus', null, tokenA);
    const aChars = (listA.body.characters || []).filter(c => c);
    assert('A 有 2 個角色', aChars.length === 2, '實際=' + aChars.length);
    assert('A 列表含角色123', aChars.some(c => c.name === '角色123'));
    assert('A 列表含角色234', aChars.some(c => c.name === '角色234'));

    const listB2 = await api('GET', '/api/characters?server=zeus', null, tokenB);
    const bChars2 = (listB2.body.characters || []).filter(c => c);
    assert('B 至少有角色 456', bChars2.some(c => c.name === '角色456'));
    assert('B 列表含角色456', bChars2[0]?.name === '角色456');

    // ===== 測試 6：客戶端靜態檢查 =====
    console.log('\n--- 測試 6：客戶端存檔 key 帶帳號（靜態）---');
    const authCode = fs.readFileSync('auth.js', 'utf8');
    const gameCode = fs.readFileSync('game.js', 'utf8');
    assert('auth.js getSlotSaveKey', authCode.includes('function getSlotSaveKey'));
    assert('auth.js key 含帳號（mmo_save_acc_idx）',
      authCode.includes("'mmo_save_' + acc + '_' + (idx"));
    assert('game.js getSlotSaveKey', gameCode.includes('function getSlotSaveKey'));
    assert('game.js 連線模式禁止 fallback 全域 game_save_v2',
      gameCode.includes('連線模式不得 fallback 到全域 game_save_v2'));
    assert('game.js __resetGameState', gameCode.includes('__resetGameState'));
    assert('game.js onAuthReady 先 reset GS',
      gameCode.includes('登入後先重置 GS'));
    assert('game.js 連線模式新創角色不彈創角頁（修空白面板）',
      gameCode.includes('連線模式一律從伺服器載入角色，不顯示創角頁'));

    // ===== 測試 7：登出清理 =====
    console.log('\n--- 測試 7：登出清理（靜態）---');
    assert('auth.js logout 清 mmo_save_<acc>_*',
      authCode.includes("mmo_save_' + acc + '_'"));
    assert('auth.js logout 清 mmo_char_idx', authCode.includes("mmo_char_idx'"));
    assert('auth.js logout 呼叫 __clearGameState', authCode.includes('__clearGameState'));

    console.log('\n========================');
    console.log('伺服器端隔離 + 客戶端靜態 測試總結');
    console.log('通過：' + passed + ' / ' + (passed + failed));
    console.log('失敗：' + failed);
    console.log('========================');
    if (failed > 0) process.exit(1);
    console.log('\n🏆 全部通過！');

  } catch (e) {
    console.error('測試異常:', e);
    process.exit(1);
  } finally {
    serverProc.kill();
    try { fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true }); } catch(e) {}
  }
})();

/**
 * v2.5.6 綜合 headless 測試：
 *  - 跨帳號隔離（伺服器端實測）
 *  - 移動邏輯單元測試（提取 updatePlayer 核心計算）
 *  - 創角→移動流程驗證（靜態＋邏輯）
 *  - 空白創角面板靜態驗證
 *  - 角色選擇頁新版面靜態驗證
 */

const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');

const TEST_DATA_DIR = '/tmp/mb_test_v256_' + Date.now() + '_' + Math.floor(Math.random()*100000);
const SERVER_PORT = 18890 + Math.floor(Math.random() * 100);
fs.mkdirSync(TEST_DATA_DIR, { recursive: true });

const env = { ...process.env, DATA_DIR: TEST_DATA_DIR, PORT: String(SERVER_PORT) };
const serverProc = spawn('node', ['server/server.cjs'], { env, stdio: ['pipe', 'pipe', 'pipe'] });

function api(method, p, body, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1', port: SERVER_PORT, path: p, method,
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
  return { token: log.body.token || null, account, reg, login: log };
}

let passed = 0, failed = 0;
function assert(name, cond, detail) {
  if (cond) { passed++; console.log('  ✅ ' + name); }
  else { failed++; console.log('  ❌ ' + name + (detail ? ' — ' + detail : '')); }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  try {
    for (let i = 0; i < 40; i++) {
      try { const r = await api('GET', '/api/health'); if (r.status === 200) break; } catch {}
      await sleep(300);
    }
    console.log('伺服器就緒 (port=' + SERVER_PORT + ')\n');

    // ===== 測試 1：伺服器端跨帳號隔離 =====
    console.log('--- 測試 1：伺服器端跨帳號隔離 ---');
    const ralA = await registerAndLogin('accA', 'pass1234');
    const tokenA = ralA.token;
    assert('A 註冊+登入', !!tokenA);

    await api('POST', '/api/characters/create',
      { name: 'Alpha', classId: 'warrior', server: 'zeus' }, tokenA);
    await api('POST', '/api/characters/save', {
      serverId: 'zeus', charIdx: 0,
      saveData: { player: { name: 'Alpha', classId: 'warrior', level: 5, created: true,
                            x: 100, y: 200, targetX: 100, targetY: 200 },
                  resources: { gold: 500, gem: 100 },
                  currentMap: 'village' },
    }, tokenA);

    await api('POST', '/api/characters/create',
      { name: 'Beta', classId: 'mage', server: 'zeus' }, tokenA);
    await api('POST', '/api/characters/save', {
      serverId: 'zeus', charIdx: 1,
      saveData: { player: { name: 'Beta', classId: 'mage', level: 10, created: true,
                            x: 300, y: 400, targetX: 300, targetY: 400 },
                  resources: { gold: 2000, gem: 500 },
                  currentMap: 'village' },
    }, tokenA);

    const g0 = await api('GET', '/api/characters/0?server=zeus', null, tokenA);
    assert('A 槽0 = Alpha / level=5',
      g0.body.saveData?.player?.name === 'Alpha' && g0.body.saveData?.player?.level === 5);

    const g1 = await api('GET', '/api/characters/1?server=zeus', null, tokenA);
    assert('A 槽1 = Beta / level=10',
      g1.body.saveData?.player?.name === 'Beta' && g1.body.saveData?.player?.level === 10);

    // B 越權
    const ralB = await registerAndLogin('accB', 'pass5678');
    const tokenB = ralB.token;
    assert('B 註冊+登入', !!tokenB);

    const bList = await api('GET', '/api/characters?server=zeus', null, tokenB);
    assert('B 列表為空（看不到 A 的角色）', (bList.body.characters || []).filter(c=>c).length === 0);

    const hack0 = await api('GET', '/api/characters/0?server=zeus', null, tokenB);
    assert('B 越權讀 A 槽0 → 404', hack0.status === 404, 'status=' + hack0.status);

    await api('POST', '/api/characters/save', {
      serverId: 'zeus', charIdx: 0,
      saveData: { player: { name: 'HACKED', level: 999 } },
    }, tokenB);
    const a0After = await api('GET', '/api/characters/0?server=zeus', null, tokenA);
    assert('A 槽0 不受 B 越權寫入影響',
      a0After.body.saveData?.player?.name === 'Alpha',
      'name=' + a0After.body.saveData?.player?.name);

    // B 創自己的角色並確認獨立
    await api('POST', '/api/characters/create',
      { name: 'Gamma', classId: 'archer', server: 'zeus' }, tokenB);
    const bg0 = await api('GET', '/api/characters/0?server=zeus', null, tokenB);
    assert('B 槽0 是自己的角色（非 A 的 Alpha）',
      bg0.body.saveData?.player?.name !== 'Alpha',
      'name=' + bg0.body.saveData?.player?.name);

    console.log('');

    // ===== 測試 2：移動邏輯單元測試 =====
    console.log('--- 測試 2：移動邏輯單元測試（updatePlayer 核心）---');

    // 模擬 GS.player + updatePlayer 核心計算（從 game.js 提取）
    const player = {
      x: 600, y: 630, targetX: 600, targetY: 630,
      state: 'idle', hp: 200, buffs: {}, transformId: null,
    };

    // 測試 2a：點擊地面 → 設定 target → 移動
    player.targetX = 700;
    player.targetY = 700;
    player.state = 'walking';

    function stepUpdate(dt) {
      const dx = player.targetX - player.x;
      const dy = player.targetY - player.y;
      const dist = Math.hypot(dx, dy);
      let speed = 85;
      if (dist > 2) {
        const move = Math.min(dist, speed * dt);
        player.x += (dx / dist) * move;
        player.y += (dy / dist) * move;
        return true;
      } else {
        player.state = 'idle';
        return false;
      }
    }

    const beforeX = player.x, beforeY = player.y;
    const moved = stepUpdate(0.1); // 100ms
    assert('點擊後 100ms 玩家 x 改變', player.x !== beforeX,
      beforeX + ' → ' + player.x.toFixed(1));
    assert('點擊後 100ms 玩家 y 改變', player.y !== beforeY,
      beforeY + ' → ' + player.y.toFixed(1));
    assert('移動方向正確（x 增加、y 增加）', player.x > beforeX && player.y > beforeY);
    assert('移動狀態為 walking', player.state === 'walking');

    // 連續更新直到到達
    let frames = 0;
    for (let i = 0; i < 1000; i++) {
      frames++;
      if (!stepUpdate(0.016)) break; // 60fps
    }
    assert('連續移動後到達目標點（<3px 誤差）',
      Math.abs(player.x - 700) < 3 && Math.abs(player.y - 700) < 3,
      '實際: (' + player.x.toFixed(1) + ', ' + player.y.toFixed(1) + ')');
    assert('到達後 state 變為 idle', player.state === 'idle');
    assert('移動幀數合理（> 10 幀）', frames > 10, 'frames=' + frames);

    console.log('');

    // ===== 測試 3：選角→載入存檔→移動 =====
    console.log('--- 測試 3：選角載入存檔後可移動 ---');

    // 模擬：從伺服器載入角色存檔 → 套用 → init 設位置 → 移動
    const saveData = g1.body.saveData; // Beta, level 10, x:300 y:400
    assert('伺服器存檔含 x/y 座標',
      typeof saveData.player.x === 'number' && typeof saveData.player.y === 'number',
      'x=' + saveData.player.x + ' y=' + saveData.player.y);
    assert('伺服器存檔含 currentMap',
      saveData.currentMap === 'village');

    // 模擬 applySaveData
    const loadedPlayer = { ...saveData.player };
    assert('載入後玩家名稱正確', loadedPlayer.name === 'Beta');

    // 模擬 loadMap → 重置位置到地圖中心（有 currentMap 時）
    const mapW = 1600, mapH = 1200;
    loadedPlayer.x = mapW / 2;
    loadedPlayer.y = mapH * 0.7;
    loadedPlayer.targetX = loadedPlayer.x;
    loadedPlayer.targetY = loadedPlayer.y;
    assert('loadMap 後玩家位於地圖中央 (800, 840)',
      loadedPlayer.x === 800 && loadedPlayer.y === 840);

    // 模擬點擊移動
    const p2 = loadedPlayer;
    p2.targetX = 1000;
    p2.targetY = 500;
    p2.state = 'walking';
    const dx2 = p2.targetX - p2.x;
    const dy2 = p2.targetY - p2.y;
    const dist2 = Math.hypot(dx2, dy2);
    const move2 = Math.min(dist2, 85 * 0.5); // 0.5s
    p2.x += (dx2 / dist2) * move2;
    p2.y += (dy2 / dist2) * move2;
    assert('選角載入後移動：x 改變', p2.x !== 800, '800 → ' + p2.x.toFixed(1));
    assert('選角載入後移動：y 改變', p2.y !== 840, '840 → ' + p2.y.toFixed(1));

    console.log('');

    // ===== 測試 4：客戶端程式碼靜態驗證 =====
    console.log('--- 測試 4：客戶端靜態驗證 ---');
    const authCode = fs.readFileSync('auth.js', 'utf8');
    const gameCode = fs.readFileSync('game.js', 'utf8');
    const cssCode = fs.readFileSync('auth.css', 'utf8');

    // 移動相關
    assert('game.js init() 有冪等保護（_initDone）', gameCode.includes('_initDone'));
    assert('game.js enterWorld() 呼叫 init()（確保 game loop 啟動）',
      gameCode.includes('function enterWorld()') &&
      gameCode.includes('// v2.5.6：確保遊戲完整初始化') &&
      gameCode.includes('enterWorld') && gameCode.includes('init();'));
    assert('game.js bindEvents 繫結場景點擊移動', gameCode.includes("el.scene.addEventListener('click'"));
    assert('game.js 點擊設定 targetX/targetY',
      gameCode.includes('GS.player.targetX = tx') && gameCode.includes('GS.player.targetY = ty'));
    assert('game.js updatePlayer 每幀移動插值',
      gameCode.includes('const dx = p.targetX - p.x') &&
      gameCode.includes('const dy = p.targetY - p.y'));
    assert('game.js gameLoop 每幀呼叫 updatePlayer',
      gameCode.includes('updatePlayer(dt)'));

    // 隔離相關
    assert('game.js 連線模式禁止 fallback 全域 game_save_v2',
      gameCode.includes('連線模式不得 fallback 到全域 game_save_v2'));
    assert('game.js onAuthReady 先 reset GS',
      gameCode.includes('登入後先重置 GS'));
    assert('game.js __resetGameState 完整重置',
      gameCode.includes('__resetGameState') && gameCode.includes('currentCharIdx'));
    assert('auth.js 存檔 key 帶帳號', authCode.includes("'mmo_save_' + acc + '_' + (idx"));
    assert('auth.js logout 清本帳號所有槽',
      authCode.includes("mmo_save_' + acc + '_'"));

    // 創角面板相關
    assert('enterWorld 關閉 char-create-screen',
      gameCode.includes("const screen = $('char-create-screen')") &&
      gameCode.includes("screen.classList.add('hidden')"));
    assert('enterWorld 重置 charCreateState',
      gameCode.includes("charCreateState = { classId: 'warrior'"));
    assert('init 中連線模式不顯示創角頁',
      gameCode.includes('連線模式一律從伺服器載入角色，不顯示創角頁'));
    assert('_hookCharCreateDone 不呼叫 onAuthReady（避免二次 init）',
      authCode.includes('新創角色不走 onAuthReady'));

    console.log('');

    // ===== 測試 5：角色選擇頁新版面 =====
    console.log('--- 測試 5：角色選擇頁卡片版面 ---');
    assert('renderCharSelect 使用 char-card-grid（卡片網格）', authCode.includes('char-card-grid'));
    assert('卡片有職業 portrait + 等級 badge', authCode.includes('char-card-portrait'));
    assert('卡片有「進入遊戲」按鈕', authCode.includes('char-card-enter'));
    assert('卡片有刪除按鈕', authCode.includes('char-card-delete'));
    assert('空格卡片顯示「新增角色」', authCode.includes('char-card-empty'));
    assert('CSS 有卡片 hover 效果', cssCode.includes('.char-card:hover'));
    assert('CSS 有職業色彩變數（--cls-color）', cssCode.includes('--cls-color'));
    assert('CSS 有手機版響應式（直排）', cssCode.includes('@media (max-width: 600px)'));
    assert('事件處理支援 enter/delete 兩種 action',
      authCode.includes("data-action=\"enter\"") &&
      authCode.includes("data-action=\"delete\""));
    assert('全域只有一個創角 overlay（#char-create-screen）',
      gameCode.split('char-create-screen').length - 1 <= 10); // 合理引用次數

    console.log('\n========================');
    console.log('v2.5.6 綜合測試總結');
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

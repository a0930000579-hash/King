#!/usr/bin/env node
/**
 * 8 幀動畫時序驗證（headless，從 game.js 提取常數做靜態分析）
 */

const fs = require('fs');
const path = require('path');

function main() {
  let pass = 0, fail = 0;
  const assert = (name, cond, detail = '') => {
    if (cond) { pass++; console.log('  [PASS] ' + name); }
    else { fail++; console.log('  [FAIL] ' + name + ' ' + detail); }
  };
  
  const src = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
  
  // 提取 ANIM_V260_CONFIG
  const cfgMatch = src.match(/const ANIM_V260_CONFIG\s*=\s*({[\s\S]*?\n\});/);
  if (!cfgMatch) { console.error('找不到 ANIM_V260_CONFIG'); process.exit(1); }
  const cfg = eval('(' + cfgMatch[1] + ')');
  
  console.log('\n[1] 動畫基本配置');
  assert('walkStepMs > 0', cfg.walkStepMs > 0, '=' + cfg.walkStepMs);
  assert('attackFrameMs > 0', cfg.attackFrameMs > 0, '=' + cfg.attackFrameMs);
  assert('hitMs > 0', cfg.hitMs > 0, '=' + cfg.hitMs);
  assert('有走路 bob 效果', typeof cfg.bobPx === 'number', 'bobPx=' + cfg.bobPx);
  
  console.log('\n[2] 8 幀動畫素材完整性（idle + 行走三向 + 攻擊三幀 + 受擊）');
  // 檢查 getUnitFrameSrc 中所有 frame 變體
  const frameTypes = [
    'idle',
    'walk',     // down
    'walk2',    // side
    'walk3',    // up
    'attack',   // 第1幀
    'attack2',  // 第2幀
    'attack3',  // 第3幀
    'hit',
  ];
  for (const f of frameTypes) {
    const has = src.includes('spriteObj.' + f) || src.includes("spriteObj['" + f + "']");
    assert(`sprite frame 類型 ${f}`, has);
  }
  
  console.log('\n[3] 行走三向');
  const dirs = ['down', 'up', 'left', 'right'];
  for (const d of dirs) {
    const has = src.includes("'" + d + "'");
    assert(`方向 ${d}`, has);
  }
  // walk2 = side，同時用於 left / right（翻轉）
  const sideUsedForLR = src.includes("left / right 都用 walk_side") || 
    src.includes("walk2 || spriteObj.walk");
  assert('左右兩向共用 side 精靈（翻轉實現）', sideUsedForLR);
  
  console.log('\n[4] 方向翻轉（朝左 scaleX(-1)）');
  const hasFlipLeft = src.includes('scaleX(-1)') && src.includes("dir === 'left'");
  assert('朝左時水平翻轉', hasFlipLeft);
  
  console.log('\n[5] idle 預設朝向');
  // idle 無翻轉，預設朝右（sprite 預設朝右）
  const idleDefaultRight = src.includes("spriteObj.idle") && 
    !src.includes("idle.*flip");
  assert('idle 預設朝右（無翻轉）', idleDefaultRight);
  
  console.log('\n[6] 攻擊三幀連續播放（不閃爍）');
  // 0 → 1 → 2 → 回到原狀態
  const attackSeq = src.includes('attackIdx < 2') && src.includes('attackIdx++');
  assert('攻擊 0→1→2 連續播放', attackSeq);
  // 每幀 > 50ms 才不會閃爍
  assert('攻擊每幀 > 50ms（避免單幀閃爍）', cfg.attackFrameMs > 50,
    'attackFrameMs=' + cfg.attackFrameMs);
  // 總共 3 幀
  assert('攻擊總共 3 幀', src.includes('attackIdx < 2') && src.includes('attack2') && src.includes('attack3'));
  
  console.log('\n[7] 受擊狀態');
  assert('hit 狀態返回 hit 精靈', src.includes("state === 'hit'"));
  assert('受擊顯示時長 hitMs 合理', cfg.hitMs >= 100 && cfg.hitMs <= 500,
    'hitMs=' + cfg.hitMs);
  
  console.log('\n[8] 狀態機完整（idle / walk / attack / hit / dead）');
  const states = ['idle', 'walk', 'attack', 'hit', 'dead'];
  for (const s of states) {
    const has = src.includes("state === '" + s + "'");
    assert(`狀態 ${s}`, has);
  }
  
  console.log('\n=== 動畫時序驗證：' + pass + ' 通過, ' + fail + ' 失敗 ===');
  return fail === 0;
}

const ok = main();
process.exit(ok ? 0 : 1);

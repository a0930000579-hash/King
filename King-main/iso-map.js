// ============================================================
// Isometric Siege Map - 等角投影 2.5D 攻城戰地圖
// 使用 Canvas 2D API 繪製菱形網格、建築物與地形
// ============================================================

const ISO = {
  TILE_W: 64,          // tile 寬（2:1 等角比例）
  TILE_H: 32,          // tile 高
  MAP_W: 30,           // 地圖寬（格數）
  MAP_H: 30,           // 地圖高（格數）
  canvas: null,
  ctx: null,
  camX: 0,             // 相機中心 tile x
  camY: 0,             // 相機中心 tile y
  zoom: 1,
  tiles: [],           // 2D 陣列：{ type, walkable, variant }
  buildings: [],       // 建築物：{ type, gx, gy, w, h, hp, hpMax, destroyed }
  scepter: null,       // 權杖：{ gx, gy, glowPhase }
  castleCenter: { x: 15, y: 8 }, // 城堡中心（tile 座標）
  gateOpen: false,
  towers: [],          // 守護塔
  // 拖拽
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragCamX: 0,
  dragCamY: 0,
};

// Tile 類型：grass/dirt/stone/path/water
const TILE_TYPES = {
  grass: { base: '#3a4a2a', light: '#4a5a36', dark: '#2a3820', accent: '#5a6a40' },
  dirt:  { base: '#5a4632', light: '#6e5840', dark: '#3e2f22', accent: '#7a6448' },
  stone: { base: '#5a5448', light: '#706a5c', dark: '#3e3a30', accent: '#686254' },
  path:  { base: '#8a7050', light: '#a08664', dark: '#6a5438', accent: '#9a7e5c' },
  sand:  { base: '#a08860', light: '#b89c74', dark: '#826c4c', accent: '#b09468' },
  water: { base: '#2a4a5a', light: '#3a6070', dark: '#18323c', accent: '#4a7484' },
};

// 初始化等角地圖
function initIsoMap(canvas) {
  ISO.canvas = canvas;
  ISO.ctx = canvas.getContext('2d');
  resizeIsoCanvas();
  generateSiegeMap();
  bindIsoInput();
}

function resizeIsoCanvas() {
  const c = ISO.canvas;
  const dpr = window.devicePixelRatio || 1;
  const rect = c.getBoundingClientRect();
  c.width = rect.width * dpr;
  c.height = rect.height * dpr;
  ISO.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ISO.viewW = rect.width;
  ISO.viewH = rect.height;
}

// 生成攻城戰地圖
function generateSiegeMap() {
  const W = ISO.MAP_W, H = ISO.MAP_H;
  ISO.tiles = [];
  for (let y = 0; y < H; y++) {
    const row = [];
    for (let x = 0; x < W; x++) {
      row.push({ type: 'grass', walkable: true, variant: Math.floor(Math.random() * 4) });
    }
    ISO.tiles.push(row);
  }

  // 中央城堡區：石磚地面
  const cx = ISO.castleCenter.x;
  const cy = ISO.castleCenter.y;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx;
      const dy = y - cy;
      // 泥土路：從南方入口延伸到城門
      if (x >= cx - 1 && x <= cx + 1 && y > cy + 4 && y < H - 1) {
        ISO.tiles[y][x].type = 'path';
      }
      // 城堡外圍：泥土
      if (Math.abs(dx) < 10 && Math.abs(dy) < 6 && y > cy - 1) {
        ISO.tiles[y][x].type = 'dirt';
      }
      // 城堡內：石磚
      if (Math.abs(dx) < 6 && Math.abs(dy) < 4 && y < cy + 1) {
        ISO.tiles[y][x].type = 'stone';
      }
      // 城堡中央廣場
      if (Math.abs(dx) < 3 && Math.abs(dy) < 2) {
        ISO.tiles[y][x].type = 'stone';
      }
    }
  }

  // 建築物：城牆包圍城堡
  ISO.buildings = [];
  // 北牆
  ISO.buildings.push({ type: 'wall_n', gx: cx - 6, gy: cy - 4, w: 13, h: 1, hp: 9999, hpMax: 9999, destroyed: false });
  // 南牆左段
  ISO.buildings.push({ type: 'wall_s', gx: cx - 6, gy: cy + 1, w: 5, h: 1, hp: 9999, hpMax: 9999, destroyed: false });
  // 南牆右段
  ISO.buildings.push({ type: 'wall_s', gx: cx + 2, gy: cy + 1, w: 5, h: 1, hp: 9999, hpMax: 9999, destroyed: false });
  // 西牆
  ISO.buildings.push({ type: 'wall_w', gx: cx - 6, gy: cy - 3, w: 1, h: 5, hp: 9999, hpMax: 9999, destroyed: false });
  // 東牆
  ISO.buildings.push({ type: 'wall_e', gx: cx + 6, gy: cy - 3, w: 1, h: 5, hp: 9999, hpMax: 9999, destroyed: false });
  // 城門（可破壞）
  ISO.buildings.push({ type: 'gate', gx: cx - 1, gy: cy + 1, w: 3, h: 1, hp: 1000, hpMax: 1000, destroyed: false, id: 'main_gate' });
  // 守護塔 x2
  ISO.buildings.push({ type: 'tower', gx: cx - 4, gy: cy - 2, w: 2, h: 2, hp: 800, hpMax: 800, destroyed: false, id: 'tower_l' });
  ISO.buildings.push({ type: 'tower', gx: cx + 3, gy: cy - 2, w: 2, h: 2, hp: 800, hpMax: 800, destroyed: false, id: 'tower_r' });
  // 城堡主樓
  ISO.buildings.push({ type: 'castle', gx: cx - 2, gy: cy - 4, w: 5, h: 3, hp: 9999, hpMax: 9999, destroyed: false });
  // 城內房屋
  ISO.buildings.push({ type: 'house', gx: cx - 5, gy: cy - 1, w: 2, h: 2, hp: 9999, hpMax: 9999, destroyed: false });
  ISO.buildings.push({ type: 'house', gx: cx + 3, gy: cy - 1, w: 2, h: 2, hp: 9999, hpMax: 9999, destroyed: false });

  // 設定不可通行
  for (const b of ISO.buildings) {
    for (let y = b.gy; y < b.gy + b.h; y++) {
      for (let x = b.gx; x < b.gx + b.w; x++) {
        if (y >= 0 && y < H && x >= 0 && x < W) {
          ISO.tiles[y][x].walkable = false;
        }
      }
    }
  }
}

// tile 座標 → 畫面座標（等角投影）
function isoToScreen(gx, gy) {
  const tw = ISO.TILE_W * ISO.zoom;
  const th = ISO.TILE_H * ISO.zoom;
  const sx = (gx - gy) * tw / 2 + ISO.viewW / 2 - (ISO.camX - ISO.camY) * tw / 2;
  const sy = (gx + gy) * th / 2 + ISO.viewH / 3 - (ISO.camX + ISO.camY) * th / 2;
  return { x: sx, y: sy };
}

// 畫面座標 → tile 座標
function screenToIso(sx, sy) {
  const tw = ISO.TILE_W * ISO.zoom;
  const th = ISO.TILE_H * ISO.zoom;
  const ox = sx - ISO.viewW / 2 + (ISO.camX - ISO.camY) * tw / 2;
  const oy = sy - ISO.viewH / 3 + (ISO.camX + ISO.camY) * th / 2;
  const gx = Math.floor(ox / tw + oy / th);
  const gy = Math.floor(oy / th - ox / tw);
  return { x: gx, y: gy };
}

// 繪製單個菱形 tile
function drawTile(ctx, gx, gy, tile) {
  const tw = ISO.TILE_W * ISO.zoom;
  const th = ISO.TILE_H * ISO.zoom;
  const p = isoToScreen(gx, gy);
  const type = TILE_TYPES[tile.type] || TILE_TYPES.grass;
  const v = tile.variant;

  // 菱形底色
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - th / 2);
  ctx.lineTo(p.x + tw / 2, p.y);
  ctx.lineTo(p.x, p.y + th / 2);
  ctx.lineTo(p.x - tw / 2, p.y);
  ctx.closePath();

  // 漸層：上亮下暗，製造立體感
  const grad = ctx.createLinearGradient(p.x, p.y - th / 2, p.x, p.y + th / 2);
  grad.addColorStop(0, type.light);
  grad.addColorStop(0.5, type.base);
  grad.addColorStop(1, type.dark);
  ctx.fillStyle = grad;
  ctx.fill();

  // 細部紋理：隨機小點、小草、石頭
  if (tile.type === 'grass') {
    ctx.fillStyle = type.accent;
    for (let i = 0; i < 3; i++) {
      const rx = ((gx * 31 + gy * 17 + i * 53) % 100) / 100 - 0.5;
      const ry = ((gx * 29 + gy * 13 + i * 41) % 100) / 100 - 0.3;
      const px = p.x + rx * tw * 0.8;
      const py = p.y + ry * th * 0.8;
      ctx.beginPath();
      ctx.arc(px, py, 1 * ISO.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (tile.type === 'stone') {
    ctx.strokeStyle = type.dark;
    ctx.lineWidth = 0.5 * ISO.zoom;
    // 石磚縫隙
    ctx.beginPath();
    ctx.moveTo(p.x - tw * 0.25, p.y - th * 0.15);
    ctx.lineTo(p.x + tw * 0.25, p.y - th * 0.15);
    ctx.moveTo(p.x - tw * 0.3, p.y + th * 0.1);
    ctx.lineTo(p.x + tw * 0.3, p.y + th * 0.1);
    ctx.moveTo(p.x - tw * 0.15, p.y - th * 0.15);
    ctx.lineTo(p.x - tw * 0.15, p.y + th * 0.1);
    ctx.moveTo(p.x + tw * 0.15, p.y - th * 0.15);
    ctx.lineTo(p.x + tw * 0.15, p.y + th * 0.1);
    ctx.stroke();
  } else if (tile.type === 'dirt') {
    ctx.fillStyle = type.accent;
    for (let i = 0; i < 2; i++) {
      const rx = ((gx * 23 + gy * 19 + i * 37) % 100) / 100 - 0.5;
      const ry = ((gx * 17 + gy * 29 + i * 43) % 100) / 100 - 0.3;
      const px = p.x + rx * tw * 0.7;
      const py = p.y + ry * th * 0.7;
      ctx.beginPath();
      ctx.arc(px, py, 1.5 * ISO.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (tile.type === 'path') {
    ctx.fillStyle = type.dark;
    for (let i = 0; i < 3; i++) {
      const rx = ((gx * 37 + gy * 11 + i * 29) % 100) / 100 - 0.5;
      const ry = ((gx * 13 + gy * 23 + i * 31) % 100) / 100 - 0.3;
      const px = p.x + rx * tw * 0.7;
      const py = p.y + ry * th * 0.7;
      ctx.fillRect(px - 1 * ISO.zoom, py - 0.5 * ISO.zoom, 2 * ISO.zoom, 1 * ISO.zoom);
    }
  }

  ctx.restore();
}

// 繪製建築物（等角立體）
function drawBuilding(ctx, b) {
  const tw = ISO.TILE_W * ISO.zoom;
  const th = ISO.TILE_H * ISO.zoom;
  const topLeft = isoToScreen(b.gx, b.gy);
  const bottomRight = isoToScreen(b.gx + b.w, b.gy + b.h);

  if (b.destroyed) {
    // 廢墟：繪製殘骸
    drawRubble(ctx, topLeft, bottomRight, b.type);
    return;
  }

  switch (b.type) {
    case 'wall_n':
    case 'wall_s':
      drawWallH(ctx, b);
      break;
    case 'wall_e':
    case 'wall_w':
      drawWallV(ctx, b);
      break;
    case 'gate':
      drawGate(ctx, b);
      break;
    case 'tower':
      drawTower(ctx, b);
      break;
    case 'castle':
      drawCastleMain(ctx, b);
      break;
    case 'house':
      drawHouse(ctx, b);
      break;
  }
}

function drawWallH(ctx, b) {
  const tw = ISO.TILE_W * ISO.zoom;
  const th = ISO.TILE_H * ISO.zoom;
  const wallH = 40 * ISO.zoom;
  const top = isoToScreen(b.gx, b.gy);
  const right = isoToScreen(b.gx + b.w, b.gy);
  const left = isoToScreen(b.gx, b.gy + b.h);

  // 牆身正面（梯形）
  ctx.save();
  const baseY = top.y + th / 2;
  const topY = baseY - wallH;

  // 頂部梯形（城垛）
  ctx.beginPath();
  ctx.moveTo(top.x, topY);
  ctx.lineTo(right.x, topY + (right.y - top.y) * 0.3);
  ctx.lineTo(right.x, right.y + th / 2 - wallH * 0.15);
  ctx.lineTo(left.x, left.y - wallH * 0.15);
  ctx.lineTo(left.x, topY + (left.y - top.y) * 0.3);
  ctx.closePath();

  const grad = ctx.createLinearGradient(top.x, topY, top.x, baseY);
  grad.addColorStop(0, '#6a6050');
  grad.addColorStop(0.5, '#504638');
  grad.addColorStop(1, '#3a3226');
  ctx.fillStyle = grad;
  ctx.fill();

  // 石塊紋理
  ctx.strokeStyle = '#2a2418';
  ctx.lineWidth = 0.8 * ISO.zoom;
  ctx.beginPath();
  for (let i = 0; i < b.w; i++) {
    const p1 = isoToScreen(b.gx + i, b.gy);
    const p2 = isoToScreen(b.gx + i + 1, b.gy);
    const midX = (p1.x + p2.x) / 2;
    ctx.moveTo(midX, topY + 8 * ISO.zoom);
    ctx.lineTo(midX, baseY - 4 * ISO.zoom);
  }
  // 橫向縫
  for (let r = 1; r < 3; r++) {
    const ry = topY + wallH * r / 3;
    ctx.moveTo(top.x, ry);
    ctx.lineTo(right.x, ry + (right.y - top.y) * 0.1);
  }
  ctx.stroke();

  // 城垛（crenellations）
  ctx.fillStyle = '#5a5042';
  for (let i = 0; i < b.w * 2; i++) {
    const cx1 = top.x + (right.x - top.x) * (i / (b.w * 2));
    const cx2 = top.x + (right.x - top.x) * ((i + 0.6) / (b.w * 2));
    const cy = topY - 6 * ISO.zoom;
    const cyb = topY + 2 * ISO.zoom;
    ctx.beginPath();
    ctx.moveTo(cx1, cyb);
    ctx.lineTo((cx1 + cx2) / 2, cy);
    ctx.lineTo(cx2, cyb);
    ctx.closePath();
    ctx.fill();
  }

  // 陰影
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(
    (top.x + right.x) / 2,
    baseY + 4 * ISO.zoom,
    (right.x - top.x) / 2 * 0.9,
    4 * ISO.zoom,
    0, 0, Math.PI * 2
  );
  ctx.fill();
  ctx.restore();
}

function drawWallV(ctx, b) {
  const tw = ISO.TILE_W * ISO.zoom;
  const th = ISO.TILE_H * ISO.zoom;
  const wallH = 40 * ISO.zoom;
  const top = isoToScreen(b.gx, b.gy);
  const bottom = isoToScreen(b.gx + b.w, b.gy + b.h);
  const right = isoToScreen(b.gx + b.w, b.gy);

  ctx.save();
  const baseY = top.y + th / 2;
  const topY = baseY - wallH;

  // 牆身（菱形頂 + 側面）
  ctx.beginPath();
  // 左側面
  ctx.moveTo(top.x, topY);
  ctx.lineTo(top.x, bottom.y - wallH * 0.15);
  ctx.lineTo(bottom.x, bottom.y + th / 2 - wallH * 0.15);
  ctx.lineTo(bottom.x, topY + (bottom.y - top.y));
  ctx.closePath();
  const gradL = ctx.createLinearGradient(top.x, topY, bottom.x, bottom.y);
  gradL.addColorStop(0, '#4a4234');
  gradL.addColorStop(1, '#2e281e');
  ctx.fillStyle = gradL;
  ctx.fill();

  // 頂部
  ctx.beginPath();
  ctx.moveTo(top.x, topY);
  ctx.lineTo(right.x, topY + (right.y - top.y) * 0.3);
  ctx.lineTo(bottom.x, topY + (bottom.y - top.y));
  ctx.lineTo(top.x + (bottom.x - right.x), topY + (bottom.y - right.y));
  ctx.closePath();
  ctx.fillStyle = '#60564a';
  ctx.fill();

  // 石塊紋理
  ctx.strokeStyle = '#1e1a12';
  ctx.lineWidth = 0.7 * ISO.zoom;
  ctx.stroke();

  // 城垛
  ctx.fillStyle = '#5a5042';
  for (let i = 0; i < b.h * 2; i++) {
    const p = isoToScreen(b.gx, b.gy + i * 0.5);
    const px = p.x;
    const py = topY + (p.y - top.y);
    ctx.beginPath();
    ctx.ellipse(px, py - 6 * ISO.zoom, 4 * ISO.zoom, 2 * ISO.zoom, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 陰影
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(bottom.x, bottom.y + 4 * ISO.zoom, tw * 0.3, th * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGate(ctx, b) {
  const tw = ISO.TILE_W * ISO.zoom;
  const th = ISO.TILE_H * ISO.zoom;
  const top = isoToScreen(b.gx, b.gy);
  const right = isoToScreen(b.gx + b.w, b.gy);
  const left = isoToScreen(b.gx, b.gy + b.h);
  const gateH = 32 * ISO.zoom;
  const baseY = top.y + th / 2;

  ctx.save();
  // 門拱
  const archTopY = baseY - gateH;
  const cx = (top.x + right.x) / 2;
  const w2 = (right.x - top.x) / 2 * 0.7;

  // 木門
  const woodGrad = ctx.createLinearGradient(cx, archTopY, cx, baseY);
  woodGrad.addColorStop(0, '#6a4828');
  woodGrad.addColorStop(0.5, '#4a3018');
  woodGrad.addColorStop(1, '#2a1a0a');
  ctx.fillStyle = woodGrad;

  ctx.beginPath();
  ctx.moveTo(cx - w2, baseY);
  ctx.lineTo(cx - w2, archTopY + gateH * 0.3);
  ctx.quadraticCurveTo(cx, archTopY - gateH * 0.1, cx + w2, archTopY + gateH * 0.3);
  ctx.lineTo(cx + w2, baseY);
  ctx.closePath();
  ctx.fill();

  // 木門條紋
  ctx.strokeStyle = '#2a1a0a';
  ctx.lineWidth = 1 * ISO.zoom;
  for (let i = -3; i <= 3; i++) {
    const lx = cx + i * (w2 / 4);
    ctx.beginPath();
    ctx.moveTo(lx, baseY - 2 * ISO.zoom);
    ctx.lineTo(lx, archTopY + gateH * 0.25);
    ctx.stroke();
  }

  // 金屬飾條
  ctx.fillStyle = '#c0a050';
  ctx.fillRect(cx - w2 * 0.9, baseY - 6 * ISO.zoom, w2 * 1.8, 2 * ISO.zoom);
  ctx.fillRect(cx - w2 * 0.9, archTopY + gateH * 0.5, w2 * 1.8, 2 * ISO.zoom);

  // 門環
  ctx.beginPath();
  ctx.arc(cx, baseY - gateH * 0.4, 3 * ISO.zoom, 0, Math.PI * 2);
  ctx.strokeStyle = '#c0a050';
  ctx.lineWidth = 1.5 * ISO.zoom;
  ctx.stroke();

  // HP 條
  if (b.hp < b.hpMax) {
    const barW = w2 * 2;
    const barH = 3 * ISO.zoom;
    const by = archTopY - 8 * ISO.zoom;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(cx - barW / 2, by, barW, barH);
    ctx.fillStyle = '#d04040';
    ctx.fillRect(cx - barW / 2, by, barW * (b.hp / b.hpMax), barH);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 0.5 * ISO.zoom;
    ctx.strokeRect(cx - barW / 2, by, barW, barH);
  }

  ctx.restore();
}

function drawTower(ctx, b) {
  const tw = ISO.TILE_W * ISO.zoom;
  const th = ISO.TILE_H * ISO.zoom;
  const top = isoToScreen(b.gx, b.gy);
  const right = isoToScreen(b.gx + b.w, b.gy);
  const left = isoToScreen(b.gx, b.gy + b.h);
  const bottom = isoToScreen(b.gx + b.w, b.gy + b.h);
  const cx = (top.x + bottom.x) / 2;
  const baseY = bottom.y - th / 2;
  const towerH = 70 * ISO.zoom;
  const topY = baseY - towerH;

  ctx.save();
  // 塔身
  ctx.beginPath();
  ctx.moveTo(top.x, topY + towerH * 0.15);
  ctx.lineTo(right.x, topY + towerH * 0.2);
  ctx.lineTo(right.x, baseY - towerH * 0.1);
  ctx.lineTo(bottom.x, baseY);
  ctx.lineTo(left.x, baseY - towerH * 0.05);
  ctx.lineTo(left.x, topY + towerH * 0.1);
  ctx.closePath();
  const tGrad = ctx.createLinearGradient(top.x, topY, bottom.x, baseY);
  tGrad.addColorStop(0, '#6a6050');
  tGrad.addColorStop(0.5, '#4a4234');
  tGrad.addColorStop(1, '#2e281e');
  ctx.fillStyle = tGrad;
  ctx.fill();
  ctx.strokeStyle = '#1a1610';
  ctx.lineWidth = 1 * ISO.zoom;
  ctx.stroke();

  // 塔頂（圓錐）
  ctx.beginPath();
  ctx.moveTo(cx, topY - towerH * 0.25);
  ctx.lineTo(left.x, topY + towerH * 0.1);
  ctx.lineTo(bottom.x, topY + towerH * 0.2);
  ctx.lineTo(right.x, topY + towerH * 0.15);
  ctx.closePath();
  const rGrad = ctx.createRadialGradient(cx, topY, 0, cx, topY, towerH * 0.4);
  rGrad.addColorStop(0, '#8a2020');
  rGrad.addColorStop(1, '#501010');
  ctx.fillStyle = rGrad;
  ctx.fill();
  ctx.stroke();

  // 窗戶
  ctx.fillStyle = '#1a1208';
  ctx.fillRect(cx - 2 * ISO.zoom, topY + towerH * 0.35, 4 * ISO.zoom, 8 * ISO.zoom);
  ctx.fillRect(top.x + (right.x - top.x) * 0.3, topY + towerH * 0.5, 3 * ISO.zoom, 6 * ISO.zoom);
  ctx.fillRect(left.x + (bottom.x - left.x) * 0.3, topY + towerH * 0.55, 3 * ISO.zoom, 6 * ISO.zoom);

  // 城垛
  ctx.fillStyle = '#5a5042';
  for (let i = 0; i < 4; i++) {
    const t = i / 4;
    const px = top.x + (right.x - top.x) * t;
    const py = topY + towerH * 0.15 - 4 * ISO.zoom;
    ctx.beginPath();
    ctx.ellipse(px, py, 3 * ISO.zoom, 1.5 * ISO.zoom, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 陰影
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(bottom.x, baseY + 4 * ISO.zoom, tw * 0.6, th * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // HP 條
  if (b.hp < b.hpMax) {
    const barW = tw * 0.8;
    const barH = 4 * ISO.zoom;
    const by = topY - towerH * 0.35;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(cx - barW / 2, by, barW, barH);
    ctx.fillStyle = '#d04040';
    ctx.fillRect(cx - barW / 2, by, barW * (b.hp / b.hpMax), barH);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 0.5 * ISO.zoom;
    ctx.strokeRect(cx - barW / 2, by, barW, barH);
  }

  ctx.restore();
}

function drawCastleMain(ctx, b) {
  const tw = ISO.TILE_W * ISO.zoom;
  const th = ISO.TILE_H * ISO.zoom;
  const top = isoToScreen(b.gx, b.gy);
  const right = isoToScreen(b.gx + b.w, b.gy);
  const left = isoToScreen(b.gx, b.gy + b.h);
  const bottom = isoToScreen(b.gx + b.w, b.gy + b.h);
  const cx = (top.x + bottom.x) / 2;
  const baseY = bottom.y - th / 2;
  const castleH = 90 * ISO.zoom;
  const topY = baseY - castleH;

  ctx.save();
  // 主體：梯形城堡
  ctx.beginPath();
  ctx.moveTo(top.x + tw * 0.15, topY + castleH * 0.25);
  ctx.lineTo(right.x - tw * 0.15, topY + castleH * 0.3);
  ctx.lineTo(right.x, baseY - castleH * 0.1);
  ctx.lineTo(bottom.x, baseY);
  ctx.lineTo(left.x, baseY - castleH * 0.08);
  ctx.lineTo(top.x + tw * 0.05, topY + castleH * 0.2);
  ctx.closePath();
  const cGrad = ctx.createLinearGradient(top.x, topY, bottom.x, baseY);
  cGrad.addColorStop(0, '#706050');
  cGrad.addColorStop(0.5, '#504232');
  cGrad.addColorStop(1, '#30261a');
  ctx.fillStyle = cGrad;
  ctx.fill();
  ctx.strokeStyle = '#1a140e';
  ctx.lineWidth = 1 * ISO.zoom;
  ctx.stroke();

  // 中央高塔
  const twrH = castleH * 0.6;
  const twrTop = topY - twrH * 0.3;
  ctx.beginPath();
  ctx.moveTo(cx - tw * 0.4, topY + castleH * 0.1);
  ctx.lineTo(cx + tw * 0.4, topY + castleH * 0.1);
  ctx.lineTo(cx + tw * 0.35, twrTop + twrH * 0.2);
  ctx.lineTo(cx, twrTop);
  ctx.lineTo(cx - tw * 0.35, twrTop + twrH * 0.2);
  ctx.closePath();
  const twGrad = ctx.createLinearGradient(cx - tw * 0.4, twrTop, cx + tw * 0.4, topY + castleH * 0.1);
  twGrad.addColorStop(0, '#7a6a58');
  twGrad.addColorStop(1, '#4a3c2c');
  ctx.fillStyle = twGrad;
  ctx.fill();
  ctx.stroke();

  // 中央塔尖（金色）
  ctx.beginPath();
  ctx.moveTo(cx, twrTop - twrH * 0.25);
  ctx.lineTo(cx - tw * 0.25, twrTop + twrH * 0.1);
  ctx.lineTo(cx + tw * 0.25, twrTop + twrH * 0.1);
  ctx.closePath();
  const gGrad = ctx.createLinearGradient(cx, twrTop - twrH * 0.25, cx, twrTop + twrH * 0.1);
  gGrad.addColorStop(0, '#ffe080');
  gGrad.addColorStop(0.5, '#e0b040');
  gGrad.addColorStop(1, '#a07820');
  ctx.fillStyle = gGrad;
  ctx.fill();
  ctx.strokeStyle = '#604010';
  ctx.stroke();

  // 窗戶/拱門
  ctx.fillStyle = '#1a1008';
  for (let i = 0; i < 3; i++) {
    const wx = left.x + (bottom.x - left.x) * (0.3 + i * 0.2);
    const wy = baseY - castleH * 0.4;
    ctx.fillRect(wx - 3 * ISO.zoom, wy, 6 * ISO.zoom, 12 * ISO.zoom);
  }
  for (let i = 0; i < 3; i++) {
    const wx = top.x + (right.x - top.x) * (0.25 + i * 0.25);
    const wy = topY + castleH * 0.5;
    ctx.fillRect(wx - 2.5 * ISO.zoom, wy, 5 * ISO.zoom, 10 * ISO.zoom);
  }

  // 城垛
  ctx.fillStyle = '#6a5c4c';
  for (let i = 0; i < 5; i++) {
    const t = i / 5;
    const px = top.x + (right.x - top.x) * t + tw * 0.1;
    const py = topY + castleH * 0.25 - 5 * ISO.zoom;
    ctx.beginPath();
    ctx.ellipse(px, py, 4 * ISO.zoom, 2 * ISO.zoom, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 陰影
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(bottom.x, baseY + 6 * ISO.zoom, tw * 1.2, th * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawHouse(ctx, b) {
  const tw = ISO.TILE_W * ISO.zoom;
  const th = ISO.TILE_H * ISO.zoom;
  const top = isoToScreen(b.gx, b.gy);
  const right = isoToScreen(b.gx + b.w, b.gy);
  const left = isoToScreen(b.gx, b.gy + b.h);
  const bottom = isoToScreen(b.gx + b.w, b.gy + b.h);
  const cx = (top.x + bottom.x) / 2;
  const baseY = bottom.y - th / 2;
  const houseH = 35 * ISO.zoom;
  const topY = baseY - houseH;

  ctx.save();
  // 牆身
  ctx.beginPath();
  ctx.moveTo(top.x + tw * 0.1, topY + houseH * 0.3);
  ctx.lineTo(right.x - tw * 0.1, topY + houseH * 0.35);
  ctx.lineTo(right.x, baseY - houseH * 0.1);
  ctx.lineTo(bottom.x, baseY);
  ctx.lineTo(left.x, baseY - houseH * 0.08);
  ctx.lineTo(top.x, topY + houseH * 0.25);
  ctx.closePath();
  const hGrad = ctx.createLinearGradient(top.x, topY, bottom.x, baseY);
  hGrad.addColorStop(0, '#7a5a3a');
  hGrad.addColorStop(0.5, '#5a3a20');
  hGrad.addColorStop(1, '#3a2410');
  ctx.fillStyle = hGrad;
  ctx.fill();
  ctx.strokeStyle = '#1a1008';
  ctx.lineWidth = 0.8 * ISO.zoom;
  ctx.stroke();

  // 屋頂
  ctx.beginPath();
  ctx.moveTo(top.x - tw * 0.05, topY + houseH * 0.3);
  ctx.lineTo(right.x + tw * 0.05, topY + houseH * 0.35);
  ctx.lineTo(cx, topY - houseH * 0.1);
  ctx.closePath();
  const rGrad = ctx.createLinearGradient(cx, topY - houseH * 0.1, cx, topY + houseH * 0.35);
  rGrad.addColorStop(0, '#8a2828');
  rGrad.addColorStop(1, '#501818');
  ctx.fillStyle = rGrad;
  ctx.fill();
  ctx.stroke();

  // 門
  ctx.fillStyle = '#3a2410';
  ctx.fillRect(cx - 4 * ISO.zoom, baseY - 12 * ISO.zoom, 8 * ISO.zoom, 12 * ISO.zoom);
  ctx.fillStyle = '#c0a050';
  ctx.fillRect(cx - 1 * ISO.zoom, baseY - 8 * ISO.zoom, 2 * ISO.zoom, 2 * ISO.zoom);

  // 窗
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(top.x + tw * 0.3, topY + houseH * 0.55, 6 * ISO.zoom, 8 * ISO.zoom);

  // 陰影
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(bottom.x, baseY + 3 * ISO.zoom, tw * 0.5, th * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawRubble(ctx, topLeft, bottomRight, type) {
  const cx = (topLeft.x + bottomRight.x) / 2;
  const cy = (topLeft.y + bottomRight.y) / 2;
  ctx.save();
  ctx.fillStyle = '#3a3026';
  for (let i = 0; i < 6; i++) {
    const rx = cx + (Math.random() - 0.5) * 60 * ISO.zoom;
    const ry = cy + (Math.random() - 0.5) * 20 * ISO.zoom;
    const r = (3 + Math.random() * 4) * ISO.zoom;
    ctx.beginPath();
    ctx.ellipse(rx, ry, r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// 繪製權杖（金色發光）
function drawScepter(ctx) {
  if (!ISO.scepter) return;
  const p = isoToScreen(ISO.scepter.gx + 0.5, ISO.scepter.gy + 0.5);
  const phase = ISO.scepter.glowPhase;
  const glow = 0.5 + 0.3 * Math.sin(phase);

  ctx.save();
  // 光暈
  const grad = ctx.createRadialGradient(p.x, p.y - 10 * ISO.zoom, 0, p.x, p.y - 10 * ISO.zoom, 30 * ISO.zoom);
  grad.addColorStop(0, `rgba(255,220,100,${glow})`);
  grad.addColorStop(0.5, `rgba(255,180,60,${glow * 0.5})`);
  grad.addColorStop(1, 'rgba(255,140,20,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(p.x, p.y - 10 * ISO.zoom, 30 * ISO.zoom, 0, Math.PI * 2);
  ctx.fill();

  // 權杖本體（簡單幾何）
  ctx.fillStyle = '#e0b040';
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - 22 * ISO.zoom);
  ctx.lineTo(p.x + 5 * ISO.zoom, p.y - 14 * ISO.zoom);
  ctx.lineTo(p.x + 3 * ISO.zoom, p.y - 2 * ISO.zoom);
  ctx.lineTo(p.x - 3 * ISO.zoom, p.y - 2 * ISO.zoom);
  ctx.lineTo(p.x - 5 * ISO.zoom, p.y - 14 * ISO.zoom);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#806020';
  ctx.lineWidth = 1 * ISO.zoom;
  ctx.stroke();

  // 權杖頂端寶石
  const gemGrad = ctx.createRadialGradient(p.x, p.y - 24 * ISO.zoom, 0, p.x, p.y - 24 * ISO.zoom, 6 * ISO.zoom);
  gemGrad.addColorStop(0, '#ffffa0');
  gemGrad.addColorStop(0.5, '#ffc040');
  gemGrad.addColorStop(1, '#a06010');
  ctx.fillStyle = gemGrad;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - 30 * ISO.zoom);
  ctx.lineTo(p.x + 5 * ISO.zoom, p.y - 24 * ISO.zoom);
  ctx.lineTo(p.x, p.y - 18 * ISO.zoom);
  ctx.lineTo(p.x - 5 * ISO.zoom, p.y - 24 * ISO.zoom);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// 繪製角色/單位點（用於調試，實際單位由 DOM 渲染）
function drawEntityMarker(ctx, gx, gy, color, label) {
  const p = isoToScreen(gx, gy);
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 5 * ISO.zoom, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1 * ISO.zoom;
  ctx.stroke();
  if (label) {
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, p.x, p.y - 8 * ISO.zoom);
  }
  ctx.restore();
}

// 主渲染函數
function renderIsoMap() {
  if (!ISO.ctx) return;
  const ctx = ISO.ctx;
  ctx.clearRect(0, 0, ISO.viewW, ISO.viewH);

  // 天空背景
  const skyGrad = ctx.createLinearGradient(0, 0, 0, ISO.viewH);
  skyGrad.addColorStop(0, '#1a121a');
  skyGrad.addColorStop(0.5, '#2a1e24');
  skyGrad.addColorStop(1, '#1a1418');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, ISO.viewW, ISO.viewH);

  // 繪製可見範圍內的 tiles（由後往前：y 小的先畫）
  const visible = getVisibleTileRange();
  for (let y = visible.y0; y <= visible.y1; y++) {
    for (let x = visible.x0; x <= visible.x1; x++) {
      if (y >= 0 && y < ISO.MAP_H && x >= 0 && x < ISO.MAP_W) {
        drawTile(ctx, x, y, ISO.tiles[y][x]);
      }
    }
  }

  // 建築物按 y 排序（深度排序）
  const sortedBuildings = [...ISO.buildings].sort((a, b) => (a.gy + a.h) - (b.gy + b.h));
  for (const b of sortedBuildings) {
    drawBuilding(ctx, b);
  }

  // 權杖
  drawScepter(ctx);
}

function getVisibleTileRange() {
  // 根據相機位置與縮放，計算可見 tile 範圍
  const margin = 3;
  const halfTilesX = Math.ceil(ISO.viewW / (ISO.TILE_W * ISO.zoom)) + margin;
  const halfTilesY = Math.ceil(ISO.viewH / (ISO.TILE_H * ISO.zoom)) + margin;
  return {
    x0: Math.floor(ISO.camX - halfTilesX),
    x1: Math.ceil(ISO.camX + halfTilesX),
    y0: Math.floor(ISO.camY - halfTilesY),
    y1: Math.ceil(ISO.camY + halfTilesY),
  };
}

// 輸入綁定：滑鼠拖曳 + 觸控
function bindIsoInput() {
  const c = ISO.canvas;
  if (!c) return;

  const getPos = (e) => {
    const rect = c.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  };

  const startDrag = (e) => {
    ISO.isDragging = true;
    const p = getPos(e);
    ISO.dragStartX = p.x;
    ISO.dragStartY = p.y;
    ISO.dragCamX = ISO.camX;
    ISO.dragCamY = ISO.camY;
  };
  const moveDrag = (e) => {
    if (!ISO.isDragging) return;
    e.preventDefault();
    const p = getPos(e);
    const dx = p.x - ISO.dragStartX;
    const dy = p.y - ISO.dragStartY;
    const tw = ISO.TILE_W * ISO.zoom;
    const th = ISO.TILE_H * ISO.zoom;
    // 螢幕位移 → tile 位移
    const dgx = dx / tw + dy / th;
    const dgy = dy / th - dx / tw;
    ISO.camX = ISO.dragCamX - dgx;
    ISO.camY = ISO.dragCamY - dgy;
    clampCamera();
  };
  const endDrag = () => { ISO.isDragging = false; };

  c.addEventListener('mousedown', startDrag);
  c.addEventListener('mousemove', moveDrag);
  c.addEventListener('mouseup', endDrag);
  c.addEventListener('mouseleave', endDrag);
  c.addEventListener('touchstart', startDrag, { passive: false });
  c.addEventListener('touchmove', moveDrag, { passive: false });
  c.addEventListener('touchend', endDrag);

  // 滾輪縮放
  c.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    ISO.zoom = Math.max(0.5, Math.min(2.5, ISO.zoom * delta));
  }, { passive: false });

  // 視窗縮放
  window.addEventListener('resize', () => {
    resizeIsoCanvas();
  });
}

function clampCamera() {
  ISO.camX = Math.max(-5, Math.min(ISO.MAP_W + 5, ISO.camX));
  ISO.camY = Math.max(-5, Math.min(ISO.MAP_H + 5, ISO.camY));
}

// 設定相機跟隨 tile 位置
function setIsoCamera(gx, gy) {
  ISO.camX = gx;
  ISO.camY = gy;
  clampCamera();
}

// 將 DOM 單位定位到等角地圖上的某個 tile 位置
function isoDomPosition(gx, gy, offsetY = 0) {
  const p = isoToScreen(gx, gy);
  return { left: p.x, top: p.y + offsetY };
}

// A* 尋路（網格型）
function findIsoPath(sx, sy, tx, ty) {
  if (sx < 0 || sx >= ISO.MAP_W || sy < 0 || sy >= ISO.MAP_H) return [];
  if (tx < 0 || tx >= ISO.MAP_W || ty < 0 || ty >= ISO.MAP_H) return [];

  const key = (x, y) => y * ISO.MAP_W + x;
  const openSet = new Map();
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();

  const start = key(sx, sy);
  gScore.set(start, 0);
  fScore.set(start, heuristic(sx, sy, tx, ty));
  openSet.set(start, { x: sx, y: sy, f: fScore.get(start) });

  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];

  let iterations = 0;
  const maxIter = 500;

  while (openSet.size > 0 && iterations < maxIter) {
    iterations++;
    // 找 fScore 最小的
    let currentKey = null;
    let currentNode = null;
    let minF = Infinity;
    for (const [k, n] of openSet) {
      if (n.f < minF) { minF = n.f; currentKey = k; currentNode = n; }
    }
    if (!currentNode) break;

    if (currentNode.x === tx && currentNode.y === ty) {
      // 重建路徑
      const path = [];
      let ck = currentKey;
      while (ck !== undefined) {
        const [cy, cx] = [Math.floor(ck / ISO.MAP_W), ck % ISO.MAP_W];
        path.unshift({ x: cx, y: cy });
        ck = cameFrom.get(ck);
      }
      return path;
    }

    openSet.delete(currentKey);

    for (const [dx, dy] of dirs) {
      const nx = currentNode.x + dx;
      const ny = currentNode.y + dy;
      if (nx < 0 || nx >= ISO.MAP_W || ny < 0 || ny >= ISO.MAP_H) continue;
      if (!ISO.tiles[ny][nx].walkable) continue;
      // 對角移動需檢查兩側是否可行走
      if (dx !== 0 && dy !== 0) {
        if (!ISO.tiles[currentNode.y][currentNode.x + dx].walkable) continue;
        if (!ISO.tiles[currentNode.y + dy][currentNode.x].walkable) continue;
      }
      const nk = key(nx, ny);
      const step = (dx !== 0 && dy !== 0) ? 1.414 : 1;
      const tentative = (gScore.get(currentKey) || 0) + step;
      if (tentative < (gScore.get(nk) || Infinity)) {
        cameFrom.set(nk, currentKey);
        gScore.set(nk, tentative);
        const f = tentative + heuristic(nx, ny, tx, ty);
        fScore.set(nk, f);
        openSet.set(nk, { x: nx, y: ny, f });
      }
    }
  }

  return [];
}

function heuristic(x1, y1, x2, y2) {
  const dx = Math.abs(x1 - x2);
  const dy = Math.abs(y1 - y2);
  return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy);
}

// 工具：破壞建築物
function destroyBuilding(id) {
  const b = ISO.buildings.find(x => x.id === id);
  if (!b) return;
  b.destroyed = true;
  // 開放對應 tile 可行走
  for (let y = b.gy; y < b.gy + b.h; y++) {
    for (let x = b.gx; x < b.gx + b.w; x++) {
      if (y >= 0 && y < ISO.MAP_H && x >= 0 && x < ISO.MAP_W) {
        ISO.tiles[y][x].walkable = true;
      }
    }
  }
}

// 工具：設定建築物 HP
function setBuildingHp(id, hp) {
  const b = ISO.buildings.find(x => x.id === id);
  if (!b) return;
  b.hp = Math.max(0, hp);
  if (b.hp <= 0 && !b.destroyed) {
    destroyBuilding(id);
  }
}

// 掉落權杖
function dropScepter(gx, gy) {
  ISO.scepter = { gx, gy, glowPhase: 0 };
}

// 每幀更新（權杖發光動畫）
function updateIsoMap(dt) {
  if (ISO.scepter) {
    ISO.scepter.glowPhase += dt * 3;
  }
}

// 全局暴露
Object.assign(window, {
  ISO, initIsoMap, renderIsoMap, updateIsoMap,
  isoToScreen, screenToIso, setIsoCamera,
  findIsoPath, destroyBuilding, setBuildingHp,
  dropScepter, generateSiegeMap, isoDomPosition,
});

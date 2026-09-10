/*
 * v2.8.0：裝備圖標 SVG 動態生成器
 * 解決舊版拼貼問題（銅戒指有戒指+項鍊、皮手套有頭盔+手套等）
 * 每件裝備「單一干淨」圖標，部位 × 品質各自一張
 * 品質越高越華麗：外框光暈 / 紋飾 / 光點漸增
 */

(function() {
  'use strict';

  const RARITY_COLORS = {
    white:  { outer: '#e8e8e8', inner: '#ffffff', glow: 'rgba(255,255,255,0.3)', accent: '#c0c0c0' },
    green:  { outer: '#4ade80', inner: '#86efac', glow: 'rgba(74,222,128,0.5)', accent: '#22c55e' },
    blue:   { outer: '#60a5fa', inner: '#93c5fd', glow: 'rgba(96,165,250,0.55)', accent: '#3b82f6' },
    red:    { outer: '#f87171', inner: '#fca5a5', glow: 'rgba(248,113,113,0.6)', accent: '#ef4444' },
    purple: { outer: '#c084fc', inner: '#d8b4fe', glow: 'rgba(192,132,252,0.65)', accent: '#a855f7' },
    gold:   { outer: '#fbbf24', inner: '#fde047', glow: 'rgba(251,191,36,0.8)', accent: '#f59e0b' },
  };

  const RARITY_NAMES = {
    white: '普通', green: '精良', blue: '稀有', red: '史詩', purple: '傳說', gold: '神話'
  };

  // 13 個部位的簡潔 SVG 圖形（單一物件，不拼貼）
  // 坐標系：64x64 viewBox
  const PART_SHAPES = {
    // 劍/武器
    sword: (c) => `
      <g transform="translate(32,32)">
        <!-- 劍身 -->
        <rect x="-3" y="-22" width="6" height="32" rx="2" fill="url(#bladeGrad-${c})" stroke="${c.outer}" stroke-width="0.8"/>
        <!-- 劍尖 -->
        <polygon points="-3,-22 0,-28 3,-22" fill="url(#tipGrad-${c})" stroke="${c.outer}" stroke-width="0.5"/>
        <!-- 劍格 -->
        <rect x="-10" y="10" width="20" height="4" rx="1" fill="${c.accent}" stroke="${c.outer}" stroke-width="0.5"/>
        <!-- 剑柄 -->
        <rect x="-2.5" y="14" width="5" height="10" rx="1" fill="#7c5a3a" stroke="#5a3d25" stroke-width="0.5"/>
        <!-- 劍首 -->
        <circle cx="0" cy="26" r="3" fill="${c.accent}" stroke="${c.outer}" stroke-width="0.5"/>
      </g>
    `,
    // 盾牌
    shield: (c) => `
      <g transform="translate(32,32)">
        <path d="M0,-24 L16,-16 L16,4 L0,26 L-16,4 L-16,-16 Z" fill="url(#shieldGrad-${c})" stroke="${c.outer}" stroke-width="1.2"/>
        <path d="M0,-18 L12,-12 L12,2 L0,20 L-12,2 L-12,-12 Z" fill="none" stroke="${c.accent}" stroke-width="0.8" opacity="0.7"/>
        <!-- 中央徽章 -->
        <circle cx="0" cy="2" r="6" fill="${c.accent}" stroke="${c.outer}" stroke-width="0.6"/>
        <path d="M-2,2 L0,5 L4,-2" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    `,
    // 頭盔
    helmet: (c) => `
      <g transform="translate(32,32)">
        <!-- 盔體 -->
        <path d="M-18,0 Q-18,-22 0,-24 Q18,-22 18,0 Z" fill="url(#helmGrad-${c})" stroke="${c.outer}" stroke-width="1"/>
        <!-- 護頰 -->
        <path d="M-18,0 L-16,12 L-8,16 L-8,4 Z" fill="url(${c.accent}${'0.2'.padStart(2,'0')})" stroke="${c.outer}" stroke-width="0.6"/>
        <path d="M18,0 L16,12 L8,16 L8,4 Z" fill="url(${c.accent}${'0.2'.padStart(2,'0')})" stroke="${c.outer}" stroke-width="0.6"/>
        <!-- 盔頂裝飾 -->
        <rect x="-1.5" y="-28" width="3" height="6" fill="${c.accent}" stroke="${c.outer}" stroke-width="0.4"/>
        <circle cx="0" cy="-30" r="2" fill="${c.accent}" stroke="${c.outer}" stroke-width="0.4"/>
        <!-- 面甲縫 -->
        <line x1="0" y1="-24" x2="0" y2="-5" stroke="${c.outer}" stroke-width="0.5" opacity="0.5"/>
      </g>
    `,
    // 鎧甲/衣服
    armor: (c) => `
      <g transform="translate(32,32)">
        <!-- 身體 -->
        <path d="M-16,-18 L-20,-8 L-16,22 L16,22 L20,-8 L16,-18 Z" fill="url(#armorGrad-${c})" stroke="${c.outer}" stroke-width="1"/>
        <!-- 肩甲 -->
        <ellipse cx="-17" cy="-14" rx="7" ry="5" fill="${c.accent}" stroke="${c.outer}" stroke-width="0.6" transform="rotate(-20 -17 -14)"/>
        <ellipse cx="17" cy="-14" rx="7" ry="5" fill="${c.accent}" stroke="${c.outer}" stroke-width="0.6" transform="rotate(20 17 -14)"/>
        <!-- 領子 -->
        <path d="M-6,-18 L0,-8 L6,-18 Z" fill="${c.accent}" stroke="${c.outer}" stroke-width="0.5"/>
        <!-- 腰帶 -->
        <rect x="-16" y="6" width="32" height="5" fill="${c.accent}" stroke="${c.outer}" stroke-width="0.5"/>
        <rect x="-3" y="6" width="6" height="5" fill="${c.inner}" stroke="${c.outer}" stroke-width="0.4"/>
      </g>
    `,
    // 靴子
    boots: (c) => `
      <g transform="translate(32,32)">
        <!-- 左靴 -->
        <path d="M-14,-10 L-14,8 L-18,8 L-18,16 L-2,16 L-2,8 L-6,8 L-6,-10 Z" fill="url(#bootGrad-${c})" stroke="${c.outer}" stroke-width="0.8"/>
        <!-- 右靴 -->
        <path d="M2,-10 L2,8 L-2,8 L-2,16 L14,16 L14,8 L10,8 L10,-10 Z" fill="url(#bootGrad-${c})" stroke="${c.outer}" stroke-width="0.8"/>
        <!-- 靴筒花紋 -->
        <line x1="-14" y1="-2" x2="-6" y2="-2" stroke="${c.accent}" stroke-width="0.8" opacity="0.6"/>
        <line x1="2" y1="-2" x2="10" y2="-2" stroke="${c.accent}" stroke-width="0.8" opacity="0.6"/>
        <!-- 鞋底 -->
        <rect x="-18" y="14" width="16" height="3" fill="${c.outer}" rx="1"/>
        <rect x="2" y="14" width="12" height="3" fill="${c.outer}" rx="1"/>
      </g>
    `,
    // 手套
    gloves: (c) => `
      <g transform="translate(32,32)">
        <!-- 左手套 -->
        <path d="M-16,-6 L-16,12 L-8,16 L-2,12 L-2,-6 Z" fill="url(#gloveGrad-${c})" stroke="${c.outer}" stroke-width="0.8"/>
        <!-- 手指 -->
        <rect x="-15" y="-12" width="4" height="8" rx="2" fill="url(#gloveGrad-${c})" stroke="${c.outer}" stroke-width="0.6"/>
        <rect x="-10" y="-14" width="4" height="10" rx="2" fill="url(#gloveGrad-${c})" stroke="${c.outer}" stroke-width="0.6"/>
        <rect x="-5" y="-12" width="4" height="8" rx="2" fill="url(#gloveGrad-${c})" stroke="${c.outer}" stroke-width="0.6"/>
        <!-- 右手套 -->
        <path d="M2,-6 L2,12 L10,16 L16,12 L16,-6 Z" fill="url(#gloveGrad-${c})" stroke="${c.outer}" stroke-width="0.8"/>
        <rect x="3" y="-12" width="4" height="8" rx="2" fill="url(#gloveGrad-${c})" stroke="${c.outer}" stroke-width="0.6"/>
        <rect x="8" y="-14" width="4" height="10" rx="2" fill="url(#gloveGrad-${c})" stroke="${c.outer}" stroke-width="0.6"/>
        <rect x="13" y="-12" width="4" height="8" rx="2" fill="url(#gloveGrad-${c})" stroke="${c.outer}" stroke-width="0.6"/>
        <!-- 護腕 -->
        <rect x="-17" y="-6" width="15" height="4" rx="1" fill="${c.accent}" stroke="${c.outer}" stroke-width="0.5"/>
        <rect x="2" y="-6" width="15" height="4" rx="1" fill="${c.accent}" stroke="${c.outer}" stroke-width="0.5"/>
      </g>
    `,
    // 腰帶
    belt: (c) => `
      <g transform="translate(32,32)">
        <!-- 帶身 -->
        <rect x="-24" y="-5" width="48" height="12" rx="2" fill="url(#beltGrad-${c})" stroke="${c.outer}" stroke-width="0.8"/>
        <!-- 帶扣 -->
        <rect x="-8" y="-9" width="16" height="20" rx="3" fill="${c.accent}" stroke="${c.outer}" stroke-width="1"/>
        <!-- 帶扣內飾 -->
        <rect x="-5" y="-5" width="10" height="12" rx="1" fill="none" stroke="${c.inner}" stroke-width="0.8" opacity="0.8"/>
        <circle cx="0" cy="1" r="2" fill="${c.inner}"/>
        <!-- 帶孔 -->
        <circle cx="12" cy="1" r="1" fill="${c.outer}"/>
        <circle cx="16" cy="1" r="1" fill="${c.outer}"/>
        <circle cx="-12" cy="1" r="1" fill="${c.outer}"/>
      </g>
    `,
    // 披風
    cape: (c) => `
      <g transform="translate(32,32)">
        <!-- 披風本體（透視角度） -->
        <path d="M-18,-18 Q-22,10 -14,24 L0,18 L14,24 Q22,10 18,-18 Q0,-24 -18,-18 Z" fill="url(#capeGrad-${c})" stroke="${c.outer}" stroke-width="1"/>
        <!-- 領子 -->
        <path d="M-14,-18 Q0,-26 14,-18 L10,-12 Q0,-18 -10,-12 Z" fill="${c.accent}" stroke="${c.outer}" stroke-width="0.6"/>
        <!-- 披風紋路 -->
        <path d="M-10,-10 Q-12,8 -8,20" fill="none" stroke="${c.accent}" stroke-width="0.8" opacity="0.5"/>
        <path d="M10,-10 Q12,8 8,20" fill="none" stroke="${c.accent}" stroke-width="0.8" opacity="0.5"/>
        <path d="M0,-12 Q-1,8 0,18" fill="none" stroke="${c.accent}" stroke-width="0.6" opacity="0.4"/>
        <!-- 扣環 -->
        <circle cx="0" cy="-14" r="3" fill="${c.accent}" stroke="${c.outer}" stroke-width="0.6"/>
      </g>
    `,
    // 護腿/褲子
    pants: (c) => `
      <g transform="translate(32,32)">
        <!-- 左腿 -->
        <path d="M-14,-18 L-8,-18 L-6,22 L-14,22 L-16,8 Z" fill="url(#pantsGrad-${c})" stroke="${c.outer}" stroke-width="0.8"/>
        <!-- 右腿 -->
        <path d="M8,-18 L14,-18 L16,8 L14,22 L6,22 Z" fill="url(#pantsGrad-${c})" stroke="${c.outer}" stroke-width="0.8"/>
        <!-- 腰帶線 -->
        <rect x="-15" y="-18" width="30" height="4" fill="${c.accent}" stroke="${c.outer}" stroke-width="0.5"/>
        <!-- 膝蓋裝甲 -->
        <ellipse cx="-10" cy="4" rx="5" ry="4" fill="${c.accent}" stroke="${c.outer}" stroke-width="0.5"/>
        <ellipse cx="10" cy="4" rx="5" ry="4" fill="${c.accent}" stroke="${c.outer}" stroke-width="0.5"/>
        <!-- 中央縫 -->
        <line x1="0" y1="-14" x2="0" y2="-4" stroke="${c.outer}" stroke-width="0.4" opacity="0.5"/>
      </g>
    `,
    // 戒指
    ring: (c) => `
      <g transform="translate(32,32)">
        <!-- 戒指環 -->
        <ellipse cx="0" cy="4" rx="12" ry="14" fill="none" stroke="${c.accent}" stroke-width="6"/>
        <ellipse cx="0" cy="4" rx="12" ry="14" fill="none" stroke="${c.outer}" stroke-width="1"/>
        <!-- 戒指內圈（高光） -->
        <ellipse cx="-3" cy="0" rx="7" ry="8" fill="none" stroke="${c.inner}" stroke-width="0.8" opacity="0.6"/>
        <!-- 寶石 -->
        <polygon points="0,-14 -5,-6 5,-6" fill="${c.inner}" stroke="${c.outer}" stroke-width="0.8"/>
        <polygon points="0,-14 -3,-10 3,-10" fill="white" opacity="0.5"/>
        <!-- 底座 -->
        <rect x="-6" y="-6" width="12" height="4" rx="1" fill="${c.accent}" stroke="${c.outer}" stroke-width="0.5"/>
      </g>
    `,
    // 項鍊
    necklace: (c) => `
      <g transform="translate(32,32)">
        <!-- 項鍊鏈 -->
        <path d="M-18,-16 Q0,4 18,-16" fill="none" stroke="${c.accent}" stroke-width="2.5"/>
        <path d="M-18,-16 Q0,4 18,-16" fill="none" stroke="${c.outer}" stroke-width="0.6" opacity="0.5"/>
        <!-- 吊墜 -->
        <polygon points="0,24 -8,8 8,8" fill="${c.inner}" stroke="${c.outer}" stroke-width="1"/>
        <polygon points="0,24 -3,14 3,14" fill="white" opacity="0.4"/>
        <!-- 吊墜紋路 -->
        <line x1="0" y1="10" x2="0" y2="22" stroke="${c.outer}" stroke-width="0.5" opacity="0.5"/>
        <!-- 鏈子環扣 -->
        <circle cx="0" cy="6" r="3" fill="${c.accent}" stroke="${c.outer}" stroke-width="0.6"/>
      </g>
    `,
  };

  // 部位別名映射
  const PART_ALIAS = {
    weapon: 'sword', bow: 'sword', staff: 'sword',
    ring1: 'ring', ring2: 'ring', accessory: 'ring',
  };

  // 品質裝飾層級（越高越華麗）
  const RARITY_DECORATIONS = {
    white:  0, // 基礎外框
    green:  1, // +內框紋
    blue:   2, // +角飾
    red:    3, // +光點
    purple: 4, // +符文圈
    gold:   5, // +全光暈 + 特效
  };

  function generateEquipIconSVG(part, rarity) {
    const c = RARITY_COLORS[rarity] || RARITY_COLORS.white;
    const p = PART_ALIAS[part] || part;
    const shape = PART_SHAPES[p] || PART_SHAPES.sword;
    const deco = RARITY_DECORATIONS[rarity] != null ? RARITY_DECORATIONS[rarity] : 0;

    let decorations = '';

    // 品質 1+：內框紋
    if (deco >= 1) {
      decorations += `
        <rect x="6" y="6" width="52" height="52" rx="8" fill="none" stroke="${c.inner}" stroke-width="0.6" opacity="0.6"/>
      `;
    }

    // 品質 2+：四角飾
    if (deco >= 2) {
      decorations += `
        <polygon points="4,4 10,4 4,10" fill="${c.accent}" opacity="0.7"/>
        <polygon points="60,4 54,4 60,10" fill="${c.accent}" opacity="0.7"/>
        <polygon points="4,60 10,60 4,54" fill="${c.accent}" opacity="0.7"/>
        <polygon points="60,60 54,60 60,54" fill="${c.accent}" opacity="0.7"/>
      `;
    }

    // 品質 3+：光點
    if (deco >= 3) {
      decorations += `
        <circle cx="12" cy="12" r="1.5" fill="${c.inner}" opacity="0.9">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="52" cy="14" r="1.2" fill="${c.inner}" opacity="0.8">
          <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2.5s" repeatCount="indefinite"/>
        </circle>
        <circle cx="14" cy="52" r="1" fill="${c.inner}" opacity="0.7">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="1.8s" repeatCount="indefinite"/>
        </circle>
      `;
    }

    // 品質 4+：符文圈
    if (deco >= 4) {
      decorations += `
        <circle cx="32" cy="32" r="28" fill="none" stroke="${c.accent}" stroke-width="0.5" stroke-dasharray="2,3" opacity="0.5">
          <animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="20s" repeatCount="indefinite"/>
        </circle>
      `;
    }

    // 品質 5：全光暈 + 額外特效
    let outerGlow = '';
    if (deco >= 5) {
      outerGlow = `
        <defs>
          <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      `;
      decorations += `
        <circle cx="32" cy="32" r="26" fill="none" stroke="${c.inner}" stroke-width="0.4" opacity="0.3">
          <animate attributeName="r" values="24;28;24" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" repeatCount="indefinite"/>
        </circle>
        <!-- 頂部光芒 -->
        <path d="M32,2 L30,8 L32,6 L34,8 Z" fill="${c.inner}" opacity="0.9">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite"/>
        </path>
      `;
    }

    // 各種漸變定義
    const gradients = `
      <linearGradient id="bladeGrad-${c.outer}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${c.inner}"/>
        <stop offset="50%" stop-color="white" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="${c.inner}"/>
      </linearGradient>
      <linearGradient id="tipGrad-${c.outer}" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="${c.inner}"/>
        <stop offset="100%" stop-color="white" stop-opacity="0.8"/>
      </linearGradient>
      <linearGradient id="shieldGrad-${c.outer}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c.inner}"/>
        <stop offset="50%" stop-color="${c.accent}" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="${c.inner}"/>
      </linearGradient>
      <linearGradient id="helmGrad-${c.outer}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${c.inner}"/>
        <stop offset="100%" stop-color="${c.accent}" stop-opacity="0.6"/>
      </linearGradient>
      <linearGradient id="armorGrad-${c.outer}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${c.accent}" stop-opacity="0.4"/>
        <stop offset="30%" stop-color="${c.inner}"/>
        <stop offset="70%" stop-color="${c.inner}"/>
        <stop offset="100%" stop-color="${c.accent}" stop-opacity="0.4"/>
      </linearGradient>
      <linearGradient id="bootGrad-${c.outer}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${c.inner}"/>
        <stop offset="100%" stop-color="${c.accent}" stop-opacity="0.7"/>
      </linearGradient>
      <linearGradient id="gloveGrad-${c.outer}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${c.inner}"/>
        <stop offset="100%" stop-color="${c.accent}" stop-opacity="0.6"/>
      </linearGradient>
      <linearGradient id="beltGrad-${c.outer}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${c.inner}"/>
        <stop offset="100%" stop-color="${c.accent}" stop-opacity="0.8"/>
      </linearGradient>
      <linearGradient id="capeGrad-${c.outer}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${c.accent}" stop-opacity="0.5"/>
        <stop offset="50%" stop-color="${c.inner}"/>
        <stop offset="100%" stop-color="${c.accent}" stop-opacity="0.5"/>
      </linearGradient>
      <linearGradient id="pantsGrad-${c.outer}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${c.inner}"/>
        <stop offset="100%" stop-color="${c.accent}" stop-opacity="0.5"/>
      </linearGradient>
    `;

    const filterAttr = deco >= 5 ? 'filter="url(#goldGlow)"' : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    ${gradients}
    ${outerGlow}
    <!-- 外框光暈漸變 -->
    <radialGradient id="frameGlow-${c.outer}" cx="50%" cy="50%" r="50%">
      <stop offset="70%" stop-color="${c.glow}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${c.glow}"/>
    </radialGradient>
  </defs>
  <!-- 背景 -->
  <rect x="2" y="2" width="60" height="60" rx="10" fill="#1a1410"/>
  <!-- 品質光暈背景 -->
  <rect x="2" y="2" width="60" height="60" rx="10" fill="url(#frameGlow-${c.outer})"/>
  ${decorations}
  <!-- 部位圖形 -->
  <g ${filterAttr}>
    ${shape(c)}
  </g>
  <!-- 外框 -->
  <rect x="2" y="2" width="60" height="60" rx="10" fill="none" stroke="${c.outer}" stroke-width="2"/>
</svg>`;
  }

  // ===== 道具圖標（體驗券/卷軸/藥水/寶石） =====
  const ITEM_SHAPES = {
    // 體驗券（券狀，有角色剪影）
    ticket: (c, subtype) => `
      <g transform="translate(32,32)">
        <!-- 券底 -->
        <rect x="-20" y="-22" width="40" height="44" rx="3" fill="#f5e6c8" stroke="${c.outer}" stroke-width="1.2"/>
        <!-- 券邊鋸齒 -->
        <path d="M-20,-18 L-16,-22 L-12,-18 L-8,-22 L-4,-18 L0,-22 L4,-18 L8,-22 L12,-18 L16,-22 L20,-18" fill="none" stroke="${c.outer}" stroke-width="0.8"/>
        <path d="M-20,18 L-16,22 L-12,18 L-8,22 L-4,18 L0,22 L4,18 L8,22 L12,18 L16,22 L20,18" fill="none" stroke="${c.outer}" stroke-width="0.8"/>
        <!-- 中央角色剪影 -->
        <polygon points="0,-12 -5,8 5,8" fill="${c.accent}" opacity="0.6"/>
        <circle cx="0" cy="-16" r="4" fill="${c.accent}" opacity="0.5"/>
        <!-- 文字標示 -->
        <text x="0" y="16" text-anchor="middle" font-size="6" fill="${c.outer}" font-weight="bold">體驗券</text>
      </g>
    `,
    // 卷軸
    scroll: (c) => `
      <g transform="translate(32,32)">
        <!-- 卷軸本體 -->
        <rect x="-16" y="-18" width="32" height="36" rx="2" fill="#f0e0b8" stroke="${c.outer}" stroke-width="1"/>
        <!-- 卷軸兩端 -->
        <ellipse cx="-16" cy="0" rx="4" ry="18" fill="#d4a048" stroke="${c.outer}" stroke-width="0.8"/>
        <ellipse cx="16" cy="0" rx="4" ry="18" fill="#d4a048" stroke="${c.outer}" stroke-width="0.8"/>
        <!-- 文字線條 -->
        <line x1="-10" y1="-8" x2="10" y2="-8" stroke="${c.outer}" stroke-width="0.8" opacity="0.5"/>
        <line x1="-10" y1="-2" x2="10" y2="-2" stroke="${c.outer}" stroke-width="0.8" opacity="0.5"/>
        <line x1="-10" y1="4" x2="6" y2="4" stroke="${c.outer}" stroke-width="0.8" opacity="0.5"/>
        <line x1="-10" y1="10" x2="8" y2="10" stroke="${c.outer}" stroke-width="0.8" opacity="0.5"/>
        <!-- 封印 -->
        <circle cx="0" cy="0" r="5" fill="${c.accent}" stroke="${c.outer}" stroke-width="0.6"/>
      </g>
    `,
    // 藥水
    potion: (c, color) => `
      <g transform="translate(32,32)">
        <!-- 瓶身 -->
        <path d="M-8,-6 Q-10,4 -8,18 L8,18 Q10,4 8,-6 Z" fill="url(#potionGrad-${c.outer})" stroke="${c.outer}" stroke-width="1"/>
        <!-- 瓶頸 -->
        <rect x="-4" y="-16" width="8" height="12" rx="1" fill="rgba(200,220,240,0.6)" stroke="${c.outer}" stroke-width="0.8"/>
        <!-- 瓶塞 -->
        <rect x="-5" y="-20" width="10" height="5" rx="1" fill="#8b6f47" stroke="${c.outer}" stroke-width="0.6"/>
        <!-- 液體高光 -->
        <ellipse cx="-3" cy="6" rx="2" ry="6" fill="white" opacity="0.35"/>
        <!-- 藥水顏色 -->
        <defs>
          <linearGradient id="potionGrad-${c.outer}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${color || c.accent}" stop-opacity="0.8"/>
            <stop offset="50%" stop-color="${color || c.inner}" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="${color || c.accent}" stop-opacity="0.8"/>
          </linearGradient>
        </defs>
      </g>
    `,
    // 寶石
    gem: (c, color) => `
      <g transform="translate(32,32)">
        <polygon points="0,-18 -12,-4 -8,16 8,16 12,-4" fill="${color || c.inner}" stroke="${c.outer}" stroke-width="1"/>
        <polygon points="0,-18 -6,-4 0,6 6,-4" fill="white" opacity="0.4"/>
        <polygon points="-12,-4 -8,16 0,6" fill="${c.accent}" opacity="0.5"/>
        <polygon points="12,-4 8,16 0,6" fill="${c.accent}" opacity="0.3"/>
      </g>
    `,
  };

  function generateItemIconSVG(type, rarity, subtype) {
    const c = RARITY_COLORS[rarity] || RARITY_COLORS.white;
    const shape = ITEM_SHAPES[type] || ITEM_SHAPES.scroll;
    const deco = RARITY_DECORATIONS[rarity] != null ? RARITY_DECORATIONS[rarity] : 0;

    let decorations = '';
    if (deco >= 2) {
      decorations += `<rect x="6" y="6" width="52" height="52" rx="8" fill="none" stroke="${c.inner}" stroke-width="0.5" opacity="0.5"/>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <radialGradient id="itemBg-${c.outer}" cx="50%" cy="50%" r="50%">
      <stop offset="70%" stop-color="${c.glow}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${c.glow}"/>
    </radialGradient>
  </defs>
  <rect x="2" y="2" width="60" height="60" rx="10" fill="#1a1410"/>
  <rect x="2" y="2" width="60" height="60" rx="10" fill="url(#itemBg-${c.outer})"/>
  ${decorations}
  ${shape(c, subtype)}
  <rect x="2" y="2" width="60" height="60" rx="10" fill="none" stroke="${c.outer}" stroke-width="2"/>
</svg>`;
  }

  // ===== 輸出 API =====
  window.EquipIconGenerator = {
    generateEquipIconSVG,
    generateItemIconSVG,
    RARITY_COLORS,
    RARITY_NAMES,
    PART_SHAPES: Object.keys(PART_SHAPES),
    RARITY_DECORATIONS,

    // 取得裝備 icon 的 data URL
    getEquipIconURL(part, rarity) {
      const svg = generateEquipIconSVG(part, rarity);
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    },

    // 取得道具 icon 的 data URL
    getItemIconURL(type, rarity, subtype) {
      const svg = generateItemIconSVG(type, rarity, subtype);
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    },

    // 生成所有部位×品質的裝備圖標（用於預熱或導出）
    generateAllEquipIcons() {
      const parts = Object.keys(PART_SHAPES);
      const rarities = Object.keys(RARITY_COLORS);
      const result = {};
      for (const p of parts) {
        result[p] = {};
        for (const r of rarities) {
          result[p][r] = this.getEquipIconURL(p, r);
        }
      }
      return result;
    },
  };
})();

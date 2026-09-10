/*
 * v2.8.0：NPC / 怪物頭像 SVG 補圖生成器
 * 為所有缺失的 NPC、怪物頭像生成統一風格的 SVG 佔位圖
 * 解決 manifest missing 和運行時 "?" 問題
 */

(function() {
  'use strict';

  // NPC 類型對應的視覺風格
  const NPC_STYLES = {
    shop:          { title: '商', color: '#d4a048', accent: '#f5d78e', bg: '#3d2e1a' },
    blacksmith:    { title: '鐵', color: '#b07030', accent: '#e8a050', bg: '#3a2518' },
    warehouse:     { title: '倉', color: '#8060a0', accent: '#b090d0', bg: '#2a1f3a' },
    quest:         { title: '任', color: '#40a070', accent: '#70d0a0', bg: '#1a3028' },
    premium_shop:  { title: '奢', color: '#d0a030', accent: '#ffd700', bg: '#3d2e10' },
    inn:           { title: '旅', color: '#c06060', accent: '#f09090', bg: '#3a1f1f' },
    bulletin:      { title: '佈', color: '#7080a0', accent: '#a0b0d0', bg: '#1f2535' },
    dungeon_master:{ title: '副本', color: '#9050c0', accent: '#c080f0', bg: '#2a1a3a' },
    main_quest:    { title: '主線', color: '#40b0a0', accent: '#70e0d0', bg: '#153530' },
    arena_master:  { title: '競', color: '#c04040', accent: '#ff6060', bg: '#3a1515' },
    witch:         { title: '巫', color: '#a040d0', accent: '#d070ff', bg: '#2a1035' },
    guard:         { title: '衛', color: '#5080c0', accent: '#80b0f0', bg: '#1a253a' },
    healer:        { title: '祭', color: '#f0e080', accent: '#fff0a0', bg: '#3a3520' },
    wizard:        { title: '法', color: '#4060d0', accent: '#7090ff', bg: '#151f3a' },
    postman:       { title: '郵', color: '#60a050', accent: '#90d080', bg: '#1f301a' },
    trader:        { title: '商', color: '#d08030', accent: '#ffb060', bg: '#3a2510' },
    npc_priest:    { title: '祭司', color: '#f0e080', accent: '#fff0a0', bg: '#3a3520' },
    npc_shop:      { title: '雜貨', color: '#d4a048', accent: '#f5d78e', bg: '#3d2e1a' },
    npc_blacksmith:{ title: '鐵匠', color: '#b07030', accent: '#e8a050', bg: '#3a2518' },
    npc_warehouse: { title: '倉庫', color: '#8060a0', accent: '#b090d0', bg: '#2a1f3a' },
    npc_quest:     { title: '任務', color: '#40a070', accent: '#70d0a0', bg: '#1a3028' },
    npc_luxury:    { title: '高級', color: '#d0a030', accent: '#ffd700', bg: '#3d2e10' },
    npc_inn:       { title: '旅館', color: '#c06060', accent: '#f09090', bg: '#3a1f1f' },
    npc_board:     { title: '佈告', color: '#7080a0', accent: '#a0b0d0', bg: '#1f2535' },
    npc_dungeon:   { title: '副本', color: '#9050c0', accent: '#c080f0', bg: '#2a1a3a' },
    npc_arena:     { title: '競技', color: '#c04040', accent: '#ff6060', bg: '#3a1515' },
    npc_witch:     { title: '女巫', color: '#a040d0', accent: '#d070ff', bg: '#2a1035' },
    npc_guard:     { title: '護衛', color: '#5080c0', accent: '#80b0f0', bg: '#1a253a' },
    npc_healer:    { title: '治療', color: '#f0e080', accent: '#fff0a0', bg: '#3a3520' },
    npc_wizard:    { title: '法師', color: '#4060d0', accent: '#7090ff', bg: '#151f3a' },
    npc_postman:   { title: '郵差', color: '#60a050', accent: '#90d080', bg: '#1f301a' },
    npc_merchant_new: { title: '商人', color: '#d08030', accent: '#ffb060', bg: '#3a2510' },
  };

  // 怪物類型風格
  const MONSTER_STYLES = {
    goblin:     { title: '哥', color: '#60a040', accent: '#90d070', bg: '#1f3015', eyes: '#ff4040' },
    skeleton:   { title: '骷', color: '#e0e0c0', accent: '#fffde0', bg: '#2a2a20', eyes: '#ff0000' },
    orc:        { title: '獸', color: '#806040', accent: '#b09070', bg: '#2a1f15', eyes: '#ffaa00' },
    scorpion:   { title: '蠍', color: '#c06030', accent: '#f09060', bg: '#301a10', eyes: '#ffff00' },
    bat:        { title: '蝠', color: '#503070', accent: '#9070b0', bg: '#1a1028', eyes: '#ff0000' },
    wolf:       { title: '狼', color: '#706060', accent: '#a09090', bg: '#252020', eyes: '#ffcc00' },
    slime:      { title: '史', color: '#40c080', accent: '#80ffb0', bg: '#153025', eyes: '#000000' },
    ghost:      { title: '幽', color: '#a0c0e0', accent: '#d0e8ff', bg: '#1a2535', eyes: '#00ffff' },
    spider:     { title: '蛛', color: '#702020', accent: '#b04040', bg: '#2a1010', eyes: '#ff0000' },
    lizardman:  { title: '蜥', color: '#408060', accent: '#70b090', bg: '#152a20', eyes: '#ffcc00' },
    ogre:       { title: '魔', color: '#804030', accent: '#c07060', bg: '#2a1510', eyes: '#ff3000' },
    stone_golem:{ title: '石', color: '#808090', accent: '#b0b0c0', bg: '#252530', eyes: '#ffcc00' },
    demon:      { title: '惡', color: '#c02020', accent: '#ff5050', bg: '#300808', eyes: '#ffff00' },
    lich:       { title: '巫', color: '#8040c0', accent: '#c080ff', bg: '#201035', eyes: '#00ff00' },
    cerberus:   { title: '犬', color: '#502020', accent: '#904040', bg: '#200808', eyes: '#ff0000' },
    death_knight:{title: '死', color: '#303040', accent: '#8080a0', bg: '#0a0a15', eyes: '#ff0000' },
    dragon:     { title: '龍', color: '#c04020', accent: '#ff8040', bg: '#30100a', eyes: '#ffff00' },
    bone_dragon:{ title: '骨', color: '#d0d0b0', accent: '#fff0d0', bg: '#252520', eyes: '#ff0000' },
    griffin:    { title: '獅', color: '#d0a030', accent: '#ffd700', bg: '#302510', eyes: '#ff6000' },
    armored_bear:{title: '熊', color: '#604030', accent: '#a08070', bg: '#201510', eyes: '#ff3000' },
    chimera:    { title: '奇', color: '#906030', accent: '#d0a060', bg: '#2a1a10', eyes: '#ff0040' },
    hydra:      { title: '蛇', color: '#208060', accent: '#60c0a0', bg: '#0a2520', eyes: '#ffff00' },
    naga:       { title: '娜', color: '#40a090', accent: '#80e0d0', bg: '#10302a', eyes: '#ffcc00' },
    lava_golem: { title: '岩', color: '#d04020', accent: '#ff8040', bg: '#301008', eyes: '#ffff00' },
    monster_direwolf:   { title: '狼', color: '#604030', accent: '#a08070', bg: '#201510', eyes: '#ff2000' },
    monster_scorpion:   { title: '蠍', color: '#b05020', accent: '#e08050', bg: '#2a1508', eyes: '#ffcc00' },
    monster_hellhound:  { title: '獄', color: '#501010', accent: '#a03030', bg: '#1a0505', eyes: '#ff0000' },
    monster_braindevil: { title: '腦', color: '#a03060', accent: '#e06090', bg: '#2a0a18', eyes: '#ffff00' },
    monster_gargoyle:   { title: '像', color: '#606070', accent: '#9090a0', bg: '#202028', eyes: '#ffcc00' },
    monster_wraith:     { title: '魂', color: '#7090b0', accent: '#a0c0e0', bg: '#15202a', eyes: '#00ffff' },
    spider_queen:       { title: '后', color: '#802050', accent: '#c05080', bg: '#200815', eyes: '#ff0066' },
  };

  // 職業頭像風格
  const CLASS_STYLES = {
    warrior: { title: '騎', color: '#c04030', accent: '#f08070', bg: '#2a1010' },
    mage:    { title: '法', color: '#4060c0', accent: '#7090ff', bg: '#101a30' },
    archer:  { title: '精', color: '#40a050', accent: '#70d080', bg: '#102a15' },
    rogue:   { title: '暗', color: '#603080', accent: '#9060b0', bg: '#1a0a25' },
    paladin: { title: '聖', color: '#d0a030', accent: '#ffd700', bg: '#2a2008' },
    warlock: { title: '幻', color: '#a030c0', accent: '#d070f0', bg: '#20082a' },
    knight:  { title: '騎', color: '#c04030', accent: '#f08070', bg: '#2a1010' },
    sorcerer:{ title: '幻', color: '#a030c0', accent: '#d070f0', bg: '#20082a' },
    assassin:{ title: '暗', color: '#603080', accent: '#9060b0', bg: '#1a0a25' },
  };

  function generatePortraitSVG(style, size) {
    size = size || 64;
    const s = style || { title: '?', color: '#888', accent: '#aaa', bg: '#222' };
    const hasEyes = s.eyes !== undefined;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">
  <defs>
    <radialGradient id="portBg-${s.title}" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="${s.accent}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${s.bg}"/>
    </radialGradient>
    <radialGradient id="portGlow-${s.title}" cx="50%" cy="50%" r="50%">
      <stop offset="70%" stop-color="${s.color}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${s.color}" stop-opacity="0.4"/>
    </radialGradient>
  </defs>
  <!-- 背景 -->
  <circle cx="32" cy="32" r="30" fill="url(#portBg-${s.title})"/>
  <circle cx="32" cy="32" r="30" fill="url(#portGlow-${s.title})"/>
  <!-- 圓形邊框 -->
  <circle cx="32" cy="32" r="30" fill="none" stroke="${s.color}" stroke-width="2.5"/>
  ${hasEyes ? `
  <!-- 怪物眼睛 -->
  <ellipse cx="24" cy="28" rx="4" ry="5" fill="${s.eyes}">
    <animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite"/>
  </ellipse>
  <ellipse cx="40" cy="28" rx="4" ry="5" fill="${s.eyes}">
    <animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite"/>
  </ellipse>
  <!-- 瞳孔 -->
  <circle cx="24" cy="29" r="1.5" fill="#000"/>
  <circle cx="40" cy="29" r="1.5" fill="#000"/>
  ` : ''}
  <!-- 標題文字 -->
  <text x="32" y="48" text-anchor="middle" font-size="${s.title.length > 2 ? 11 : 16}" fill="${s.accent}" font-weight="bold" font-family="sans-serif" filter="drop-shadow(0 1px 1px rgba(0,0,0,0.8))">
    ${s.title}
  </text>
  <!-- 裝飾環 -->
  <circle cx="32" cy="32" r="26" fill="none" stroke="${s.accent}" stroke-width="0.6" stroke-dasharray="3,5" opacity="0.5"/>
</svg>`;
  }

  function npcPortraitToDataURL(npcType, size) {
    const style = NPC_STYLES[npcType] || NPC_STYLES[npcType + ''] || { title: '?', color: '#888', accent: '#aaa', bg: '#222' };
    const svg = generatePortraitSVG(style, size);
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function monsterPortraitToDataURL(monsterType, size) {
    const style = MONSTER_STYLES[monsterType] || { title: monsterType ? monsterType.charAt(0) : '怪', color: '#666', accent: '#999', bg: '#222', eyes: '#ff4040' };
    const svg = generatePortraitSVG(style, size);
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function classPortraitToDataURL(classId, size) {
    const style = CLASS_STYLES[classId] || { title: '?', color: '#888', accent: '#aaa', bg: '#222' };
    const svg = generatePortraitSVG(style, size);
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // ===== 運行時補圖：掛鉤到 handleImgError =====
  //  在 game.js 的 fallback 最後一層，嘗試用 SVG 補圖
  function installRuntimeFallback() {
    if (typeof window === 'undefined') return;

    // 監聽所有 img 的 error 事件，最後兜底嘗試 SVG 補圖
    document.addEventListener('error', function(e) {
      const target = e.target;
      if (!(target instanceof HTMLImageElement)) return;
      if (target.dataset.svgFallback === 'done') return;

      // 檢查是否是 NPC / 怪物 / 職業頭像
      const src = target.src || '';
      const alt = target.alt || '';

      // 推斷類型
      let svgUrl = null;

      // NPC：類名或路徑包含 npc
      const npcMatch = src.match(/npc_(\w+)/) || (target.closest && target.closest('[data-npc-id]')?.dataset.npcId);
      if (npcMatch) {
        const npcType = typeof npcMatch === 'string' ? npcMatch : npcMatch[1];
        svgUrl = npcPortraitToDataURL(npcType);
      }

      // 怪物
      if (!svgUrl) {
        for (const mType of Object.keys(MONSTER_STYLES)) {
          if (src.indexOf(mType) !== -1) {
            svgUrl = monsterPortraitToDataURL(mType);
            break;
          }
        }
      }

      // 職業
      if (!svgUrl) {
        for (const cType of Object.keys(CLASS_STYLES)) {
          if (src.indexOf(cType) !== -1) {
            svgUrl = classPortraitToDataURL(cType);
            break;
          }
        }
      }

      // 兜底：通用頭像
      if (!svgUrl) {
        svgUrl = npcPortraitToDataURL('shop');
      }

      if (svgUrl) {
        target.dataset.svgFallback = 'done';
        target.style.visibility = 'visible';
        target.style.opacity = '1';
        target.src = svgUrl;
      }
    }, true); // capture 階段，在 handleImgError 之前或之後
  }

  // ===== 導出 =====
  window.PortraitGenerator = {
    generatePortraitSVG,
    npcPortraitToDataURL,
    monsterPortraitToDataURL,
    classPortraitToDataURL,
    installRuntimeFallback,
    NPC_STYLES: Object.keys(NPC_STYLES),
    MONSTER_STYLES: Object.keys(MONSTER_STYLES),
    CLASS_STYLES: Object.keys(CLASS_STYLES),
  };
})();

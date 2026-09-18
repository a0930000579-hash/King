/*
 * v4.4.21：NPC / 怪物 / 職業頭像「光柵 PNG」補圖生成器（嚴禁 SVG）
 * 所有兜底頭像一律以離屏 Canvas 繪製後輸出 image/png data URI，
 * 暗黑奇幻金屬風：深色圓底 + 金屬邊框 + 類別圖案（不使用任何文字/中文站位字）。
 */

(function() {
  'use strict';

  // NPC 類型對應的視覺配色
  const NPC_STYLES = {
    shop:           { color: '#d4a048', accent: '#f5d78e', bg: '#3d2e1a' },
    blacksmith:     { color: '#b07030', accent: '#e8a050', bg: '#3a2518' },
    warehouse:      { color: '#8060a0', accent: '#b090d0', bg: '#2a1f3a' },
    quest:          { color: '#40a070', accent: '#70d0a0', bg: '#1a3028' },
    premium_shop:   { color: '#d0a030', accent: '#ffd700', bg: '#3d2e10' },
    inn:            { color: '#c06060', accent: '#f09090', bg: '#3a1f1f' },
    bulletin:       { color: '#7080a0', accent: '#a0b0d0', bg: '#1f2535' },
    dungeon_master: { color: '#9050c0', accent: '#c080f0', bg: '#2a1a3a' },
    main_quest:     { color: '#40b0a0', accent: '#70e0d0', bg: '#153530' },
    arena_master:   { color: '#c04040', accent: '#ff6060', bg: '#3a1515' },
    witch:          { color: '#a040d0', accent: '#d070ff', bg: '#2a1035' },
    guard:          { color: '#5080c0', accent: '#80b0f0', bg: '#1a253a' },
    healer:         { color: '#f0e080', accent: '#fff0a0', bg: '#3a3520' },
    wizard:         { color: '#4060d0', accent: '#7090ff', bg: '#151f3a' },
    postman:        { color: '#60a050', accent: '#90d080', bg: '#1f301a' },
    trader:         { color: '#d08030', accent: '#ffb060', bg: '#3a2510' },
    npc_priest:     { color: '#f0e080', accent: '#fff0a0', bg: '#3a3520' },
    npc_shop:       { color: '#d4a048', accent: '#f5d78e', bg: '#3d2e1a' },
    npc_blacksmith: { color: '#b07030', accent: '#e8a050', bg: '#3a2518' },
    npc_warehouse:  { color: '#8060a0', accent: '#b090d0', bg: '#2a1f3a' },
    npc_quest:      { color: '#40a070', accent: '#70d0a0', bg: '#1a3028' },
    npc_luxury:     { color: '#d0a030', accent: '#ffd700', bg: '#3d2e10' },
    npc_inn:        { color: '#c06060', accent: '#f09090', bg: '#3a1f1f' },
    npc_board:      { color: '#7080a0', accent: '#a0b0d0', bg: '#1f2535' },
    npc_dungeon:    { color: '#9050c0', accent: '#c080f0', bg: '#2a1a3a' },
    npc_arena:      { color: '#c04040', accent: '#ff6060', bg: '#3a1515' },
    npc_witch:      { color: '#a040d0', accent: '#d070ff', bg: '#2a1035' },
    npc_guard:      { color: '#5080c0', accent: '#80b0f0', bg: '#1a253a' },
    npc_healer:     { color: '#f0e080', accent: '#fff0a0', bg: '#3a3520' },
    npc_wizard:     { color: '#4060d0', accent: '#7090ff', bg: '#151f3a' },
    npc_postman:    { color: '#60a050', accent: '#90d080', bg: '#1f301a' },
    npc_merchant_new: { color: '#d08030', accent: '#ffb060', bg: '#3a2510' },
  };

  // 怪物類型配色（eyes 存在＝怪物，畫魔眼/角）
  const MONSTER_STYLES = {
    goblin:      { color: '#60a040', accent: '#90d070', bg: '#1f3015', eyes: '#ff4040' },
    skeleton:    { color: '#e0e0c0', accent: '#fffde0', bg: '#2a2a20', eyes: '#ff0000' },
    orc:         { color: '#806040', accent: '#b09070', bg: '#2a1f15', eyes: '#ffaa00' },
    scorpion:    { color: '#c06030', accent: '#f09060', bg: '#301a10', eyes: '#ffff00' },
    bat:         { color: '#503070', accent: '#9070b0', bg: '#1a1028', eyes: '#ff0000' },
    wolf:        { color: '#706060', accent: '#a09090', bg: '#252020', eyes: '#ffcc00' },
    slime:       { color: '#40c080', accent: '#80ffb0', bg: '#153025', eyes: '#000000' },
    ghost:       { color: '#a0c0e0', accent: '#d0e8ff', bg: '#1a2535', eyes: '#00ffff' },
    spider:      { color: '#702020', accent: '#b04040', bg: '#2a1010', eyes: '#ff0000' },
    lizardman:   { color: '#408060', accent: '#70b090', bg: '#152a20', eyes: '#ffcc00' },
    ogre:        { color: '#804030', accent: '#c07060', bg: '#2a1510', eyes: '#ff3000' },
    stone_golem: { color: '#808090', accent: '#b0b0c0', bg: '#252530', eyes: '#ffcc00' },
    demon:       { color: '#c02020', accent: '#ff5050', bg: '#300808', eyes: '#ffff00' },
    lich:        { color: '#8040c0', accent: '#c080ff', bg: '#201035', eyes: '#00ff00' },
    cerberus:    { color: '#502020', accent: '#904040', bg: '#200808', eyes: '#ff0000' },
    death_knight:{ color: '#303040', accent: '#8080a0', bg: '#0a0a15', eyes: '#ff0000' },
    dragon:      { color: '#c04020', accent: '#ff8040', bg: '#30100a', eyes: '#ffff00' },
    bone_dragon: { color: '#d0d0b0', accent: '#fff0d0', bg: '#252520', eyes: '#ff0000' },
    griffin:     { color: '#d0a030', accent: '#ffd700', bg: '#302510', eyes: '#ff6000' },
    armored_bear:{ color: '#604030', accent: '#a08070', bg: '#201510', eyes: '#ff3000' },
    chimera:     { color: '#906030', accent: '#d0a060', bg: '#2a1a10', eyes: '#ff0040' },
    hydra:       { color: '#208060', accent: '#60c0a0', bg: '#0a2520', eyes: '#ffff00' },
    naga:        { color: '#40a090', accent: '#80e0d0', bg: '#10302a', eyes: '#ffcc00' },
    lava_golem:  { color: '#d04020', accent: '#ff8040', bg: '#301008', eyes: '#ffff00' },
    monster_direwolf:   { color: '#604030', accent: '#a08070', bg: '#201510', eyes: '#ff2000' },
    monster_scorpion:   { color: '#b05020', accent: '#e08050', bg: '#2a1508', eyes: '#ffcc00' },
    monster_hellhound:  { color: '#501010', accent: '#a03030', bg: '#1a0505', eyes: '#ff0000' },
    monster_braindevil: { color: '#a03060', accent: '#e06090', bg: '#2a0a18', eyes: '#ffff00' },
    monster_gargoyle:   { color: '#606070', accent: '#9090a0', bg: '#202028', eyes: '#ffcc00' },
    monster_wraith:     { color: '#7090b0', accent: '#a0c0e0', bg: '#15202a', eyes: '#00ffff' },
    spider_queen:       { color: '#802050', accent: '#c05080', bg: '#200815', eyes: '#ff0066' },
  };

  // 職業頭像配色（畫雙劍/頭盔）
  const CLASS_STYLES = {
    warrior:  { color: '#c04030', accent: '#f08070', bg: '#2a1010' },
    mage:     { color: '#4060c0', accent: '#7090ff', bg: '#101a30' },
    archer:   { color: '#40a050', accent: '#70d080', bg: '#102a15' },
    rogue:    { color: '#603080', accent: '#9060b0', bg: '#1a0a25' },
    paladin:  { color: '#d0a030', accent: '#ffd700', bg: '#2a2008' },
    warlock:  { color: '#a030c0', accent: '#d070f0', bg: '#20082a' },
    knight:   { color: '#c04030', accent: '#f08070', bg: '#2a1010' },
    sorcerer: { color: '#a030c0', accent: '#d070f0', bg: '#20082a' },
    assassin: { color: '#603080', accent: '#9060b0', bg: '#1a0a25' },
  };

  // ===== 光柵繪製（Canvas → PNG data URI），不含任何文字 =====
  function drawEmblem(ctx, s, kind) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (kind === 'monster') {
      ctx.strokeStyle = s.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(22, 20); ctx.quadraticCurveTo(16, 10, 20, 8);
      ctx.moveTo(42, 20); ctx.quadraticCurveTo(48, 10, 44, 8);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath(); ctx.ellipse(25, 30, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(39, 30, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = s.eyes || '#ff3030';
      ctx.shadowBlur = 8;
      ctx.fillStyle = s.eyes || '#ff3030';
      ctx.beginPath(); ctx.ellipse(25, 30, 2.6, 3.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(39, 30, 2.6, 3.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = s.accent;
      ctx.beginPath(); ctx.moveTo(28, 42); ctx.lineTo(30, 48); ctx.lineTo(32, 42); ctx.fill();
      ctx.beginPath(); ctx.moveTo(36, 42); ctx.lineTo(34, 48); ctx.lineTo(32, 42); ctx.fill();
    } else if (kind === 'class') {
      ctx.strokeStyle = s.accent;
      ctx.lineWidth = 3;
      ctx.shadowColor = s.accent; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.moveTo(20, 44); ctx.lineTo(44, 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(44, 44); ctx.lineTo(20, 20); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(18, 40); ctx.lineTo(24, 46); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(46, 40); ctx.lineTo(40, 46); ctx.stroke();
      ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.arc(32, 32, 3.2, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.shadowColor = s.accent; ctx.shadowBlur = 8;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.moveTo(32, 18); ctx.lineTo(44, 32); ctx.lineTo(32, 46); ctx.lineTo(20, 32);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = s.accent; ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = s.bg;
      ctx.beginPath(); ctx.arc(32, 32, 4.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function generatePortraitPNG(style, kind, size) {
    size = size || 64;
    const s = style || { color: '#888888', accent: '#aaaaaa', bg: '#222222' };
    const scale = size / 64;
    let canvas;
    try {
      canvas = document.createElement('canvas');
    } catch (e) {
      return '';
    }
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    ctx.beginPath(); ctx.arc(32, 32, 30, 0, Math.PI * 2); ctx.clip();

    const g = ctx.createRadialGradient(32, 22, 4, 32, 32, 34);
    g.addColorStop(0, s.bg);
    g.addColorStop(1, '#0c0a08');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);

    const rg = ctx.createRadialGradient(32, 32, 20, 32, 32, 32);
    rg.addColorStop(0.6, 'rgba(0,0,0,0)');
    rg.addColorStop(1, s.color);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = rg; ctx.fillRect(0, 0, 64, 64);
    ctx.globalAlpha = 1;

    drawEmblem(ctx, s, kind);

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = s.color;
    ctx.beginPath(); ctx.arc(32, 32, 30, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = s.accent;
    ctx.setLineDash([3, 5]);
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.arc(32, 32, 26, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    return canvas.toDataURL('image/png');
  }

  function npcPortraitToDataURL(npcType, size) {
    const style = NPC_STYLES[npcType] || NPC_STYLES[npcType + ''] || { color: '#888888', accent: '#aaaaaa', bg: '#222222' };
    return generatePortraitPNG(style, 'npc', size);
  }

  function monsterPortraitToDataURL(monsterType, size) {
    const style = MONSTER_STYLES[monsterType] || { color: '#666666', accent: '#999999', bg: '#222222', eyes: '#ff4040' };
    return generatePortraitPNG(style, 'monster', size);
  }

  function classPortraitToDataURL(classId, size) {
    const style = CLASS_STYLES[classId] || { color: '#888888', accent: '#aaaaaa', bg: '#222222' };
    return generatePortraitPNG(style, 'class', size);
  }

  // ===== 運行時補圖：img error 最後一層兜底（輸出光柵 PNG，無文字） =====
  function installRuntimeFallback() {
    if (typeof window === 'undefined') return;
    document.addEventListener('error', function(e) {
      const target = e.target;
      if (!(target instanceof HTMLImageElement)) return;
      if (target.dataset.pngFallback === 'done') return;

      const src = target.src || '';
      let url = null;

      const npcRaw = (target.closest && target.closest('[data-npc-id]') && target.closest('[data-npc-id]').dataset.npcId) || null;
      const npcMatch = src.match(/npc_(\w+)/) || (npcRaw ? [null, npcRaw] : null);
      if (npcMatch) {
        const npcType = typeof npcMatch === 'string' ? npcMatch : npcMatch[1];
        url = npcPortraitToDataURL(npcType);
      }

      if (!url) {
        for (const mType of Object.keys(MONSTER_STYLES)) {
          if (src.indexOf(mType) !== -1) { url = monsterPortraitToDataURL(mType); break; }
        }
      }

      if (!url) {
        for (const cType of Object.keys(CLASS_STYLES)) {
          if (src.indexOf(cType) !== -1) { url = classPortraitToDataURL(cType); break; }
        }
      }

      if (!url) url = npcPortraitToDataURL('shop');

      if (url) {
        target.dataset.pngFallback = 'done';
        target.style.visibility = 'visible';
        target.style.opacity = '1';
        target.src = url;
      }
    }, true);
  }

  window.PortraitGenerator = {
    generatePortraitPNG,
    npcPortraitToDataURL,
    monsterPortraitToDataURL,
    classPortraitToDataURL,
    installRuntimeFallback,
    NPC_STYLES: Object.keys(NPC_STYLES),
    MONSTER_STYLES: Object.keys(MONSTER_STYLES),
    CLASS_STYLES: Object.keys(CLASS_STYLES),
  };
})();

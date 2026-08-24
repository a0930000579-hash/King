/* ============================================================
   君主之刃 · 自由移動 MMORPG - 主逻辑 v3
   ============================================================ */

(() => {
'use strict';

// ==================== 精灵图资源 ====================
// ==================== 精灵图资源（暗黑奇幻风格，emoji + CSS 光晕，100% 透明背景） ====================
// 所有单位统一使用 emoji + 金光/血光/死光等 CSS 滤镜渲染，完全无白底
const SPRITE = {
  // ========== 玩家職業 ==========
  warrior: { 
    idle: 'assets/warrior/idle.png',
    walk: 'assets/warrior/walk.png',
    walk2: 'assets/warrior/walk2.png',
    walk3: 'assets/warrior/walk3.png',
    walk4: 'assets/warrior/walk4.png',
    attack: 'assets/warrior/attack.png',
    attack2: 'assets/warrior/attack2.png',
    hit: 'assets/warrior/hit.png',
    color: '#c03020', glow: '#ff7040', useImg: true,
    multiFrame: true, // 启用多帧动画
    coverMode: true, // 使用 object-fit:cover 显示竖版图
    slashColor: '#ffd880',
  },
  mage: {
    idle: 'assets/mage/idle.png',
    walk: 'assets/mage/walk.png',
    walk2: 'assets/mage/walk2.png',
    walk3: 'assets/mage/walk3.png',
    walk4: 'assets/mage/walk4.png',
    attack: 'assets/mage/attack.png',
    attack2: 'assets/mage/attack2.png',
    hit: 'assets/mage/hit.png',
    color: '#8040c0', glow: '#c080ff', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#80c0ff',
  },
  archer: {
    idle: 'assets/archer/idle.png',
    walk: 'assets/archer/walk.png',
    walk2: 'assets/archer/walk2.png',
    walk3: 'assets/archer/walk3.png',
    walk4: 'assets/archer/walk4.png',
    attack: 'assets/archer/attack.png',
    attack2: 'assets/archer/attack2.png',
    hit: 'assets/archer/hit.png',
    color: '#408040', glow: '#80c060', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#a0ff80',
  },
  rogue: {
    idle: 'assets/rogue/idle.png',
    walk: 'assets/rogue/walk.png',
    walk2: 'assets/rogue/walk2.png',
    walk3: 'assets/rogue/walk3.png',
    walk4: 'assets/rogue/walk4.png',
    attack: 'assets/rogue/attack.png',
    attack2: 'assets/rogue/attack2.png',
    hit: 'assets/rogue/hit.png',
    color: '#602030', glow: '#a04060', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#ff6060',
  },
  paladin: {
    idle: 'assets/paladin/idle.png',
    walk: 'assets/paladin/walk.png',
    walk2: 'assets/paladin/walk2.png',
    walk3: 'assets/paladin/walk3.png',
    walk4: 'assets/paladin/walk4.png',
    attack: 'assets/paladin/attack.png',
    attack2: 'assets/paladin/attack2.png',
    hit: 'assets/paladin/hit.png',
    color: '#e0c060', glow: '#fff0a0', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#ffffff',
  },
  warlock: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd2udyyco_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd2udyyco_ve_miaoda',
    color: '#602080', glow: '#a060e0', useImg: true
  },
  // ========== 變身形態（8幀完整動畫） ==========
  // ---------- 金色神話 ----------
  death_knight: {
    idle: 'https://aka.doubaocdn.com/s/sZCb8OB6bL',
    walk: 'https://aka.doubaocdn.com/s/sZCb8OB6bL',
    walk2: 'https://aka.doubaocdn.com/s/kjXnwP6c6Q',
    walk3: 'https://aka.doubaocdn.com/s/9L5kJRdXkU',
    walk4: 'https://aka.doubaocdn.com/s/GsVeRxnwhk',
    attack: 'https://aka.doubaocdn.com/s/95MOzrPXE4',
    attack2: 'https://aka.doubaocdn.com/s/5V9228QzVY',
    hit: 'https://aka.doubaocdn.com/s/QUmDnQmu2V',
    color: '#2a2030', glow: '#60ff60', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#60ff80',
  },
  ishti: {
    idle: 'https://aka.doubaocdn.com/s/3bD1z9o8eg',
    walk: 'https://aka.doubaocdn.com/s/3bD1z9o8eg',
    walk2: 'https://aka.doubaocdn.com/s/Bb4unEW6Or',
    walk3: 'https://aka.doubaocdn.com/s/5qCBEK1sLt',
    walk4: 'https://aka.doubaocdn.com/s/PblYU3LYWK',
    attack: 'https://aka.doubaocdn.com/s/IVTvgZd0UQ',
    attack2: 'https://aka.doubaocdn.com/s/LPEiyQx9Rw',
    hit: 'https://aka.doubaocdn.com/s/tYgMztu4TJ',
    color: '#508070', glow: '#80d0b0', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#a0ffd0',
  },
  reya: {
    idle: 'https://aka.doubaocdn.com/s/fyAgs0rT2U',
    walk: 'https://aka.doubaocdn.com/s/fyAgs0rT2U',
    walk2: 'https://aka.doubaocdn.com/s/ipvu758c68',
    walk3: 'https://aka.doubaocdn.com/s/rUNpaVcNTV',
    walk4: 'https://aka.doubaocdn.com/s/JopDfIOw63',
    attack: 'https://aka.doubaocdn.com/s/JXKMtQDjka',
    attack2: 'https://aka.doubaocdn.com/s/teo6Rq0FDT',
    hit: 'https://aka.doubaocdn.com/s/twKeG7UsnN',
    color: '#402030', glow: '#ff70a0', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#ff90c0',
  },
  baphomet: {
    idle: 'https://aka.doubaocdn.com/s/8KOIwItpMd',
    walk: 'https://aka.doubaocdn.com/s/8KOIwItpMd',
    walk2: 'https://aka.doubaocdn.com/s/IRN6nMGdEI',
    walk3: 'https://aka.doubaocdn.com/s/TzCUCDhjcu',
    walk4: 'https://aka.doubaocdn.com/s/6PUkZUgPkd',
    attack: 'https://aka.doubaocdn.com/s/nYsO49hDwZ',
    attack2: 'https://aka.doubaocdn.com/s/p930ZQKLDY',
    hit: 'https://aka.doubaocdn.com/s/JktTBAZnKa',
    color: '#501060', glow: '#c060ff', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#c080ff',
  },
  // ---------- 紫色傳說 ----------
  demon_hunter: {
    idle: 'https://aka.doubaocdn.com/s/X25020KITK',
    walk: 'https://aka.doubaocdn.com/s/X25020KITK',
    walk2: 'https://aka.doubaocdn.com/s/cUjFPtZ0qW',
    walk3: 'https://aka.doubaocdn.com/s/tVVnum1RHF',
    walk4: 'https://aka.doubaocdn.com/s/UNXOnnvtkr',
    attack: 'https://aka.doubaocdn.com/s/oDD0P2I05N',
    attack2: 'https://aka.doubaocdn.com/s/oDD0P2I05N',
    hit: 'https://aka.doubaocdn.com/s/libIUSPFdr',
    color: '#701a1a', glow: '#e04040', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#ff8060',
  },
  illusionist: {
    idle: 'https://aka.doubaocdn.com/s/hkUGU9PcrJ',
    walk: 'https://aka.doubaocdn.com/s/hkUGU9PcrJ',
    walk2: 'https://aka.doubaocdn.com/s/8hLX21hIX7',
    walk3: 'https://aka.doubaocdn.com/s/VIhy8YlPG3',
    walk4: 'https://aka.doubaocdn.com/s/fo7IkKOdCV',
    attack: 'https://aka.doubaocdn.com/s/DQ2zKd6PlE',
    attack2: 'https://aka.doubaocdn.com/s/DQ2zKd6PlE',
    hit: 'https://aka.doubaocdn.com/s/ymSWLgEVKA',
    color: '#6040a0', glow: '#a080ff', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#c0a0ff',
  },
  anubis: {
    idle: 'https://aka.doubaocdn.com/s/MD0YV0uUp3',
    walk: 'https://aka.doubaocdn.com/s/MD0YV0uUp3',
    walk2: 'https://aka.doubaocdn.com/s/77Di514UHF',
    walk3: 'https://aka.doubaocdn.com/s/UHhTcjVpkB',
    walk4: 'https://aka.doubaocdn.com/s/EesMLrHMPq',
    attack: 'https://aka.doubaocdn.com/s/qzfRRcBskj',
    attack2: 'https://aka.doubaocdn.com/s/qzfRRcBskj',
    hit: 'https://aka.doubaocdn.com/s/hFbVk7Wv8K',
    color: '#303020', glow: '#e0c060', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#ffd880',
  },
  chaos_knight: {
    idle: 'https://aka.doubaocdn.com/s/ZOAUXTCkwq',
    walk: 'https://aka.doubaocdn.com/s/ZOAUXTCkwq',
    walk2: 'https://aka.doubaocdn.com/s/sXiSWjgOUW',
    walk3: 'https://aka.doubaocdn.com/s/1mwrtdUjUW',
    walk4: 'https://aka.doubaocdn.com/s/EVisbZLQtX',
    attack: 'https://aka.doubaocdn.com/s/fOknq8rtA6',
    attack2: 'https://aka.doubaocdn.com/s/tIU5IOjXsC',
    hit: 'https://aka.doubaocdn.com/s/pr2EY6HfKb',
    color: '#302030', glow: '#a04060', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#c06060',
  },
  shadow_assassin: {
    idle: 'https://aka.doubaocdn.com/s/iY86u9q36V',
    walk: 'https://aka.doubaocdn.com/s/iY86u9q36V',
    walk2: 'https://aka.doubaocdn.com/s/IgQ8xDV3U4',
    walk3: 'https://aka.doubaocdn.com/s/3qi2k1tCkD',
    walk4: 'https://aka.doubaocdn.com/s/VMWbMkUyXH',
    attack: 'https://aka.doubaocdn.com/s/L0GFiAC4BR',
    attack2: 'https://aka.doubaocdn.com/s/xpE72e816U',
    hit: 'https://aka.doubaocdn.com/s/JHRLHgLeB7',
    color: '#202030', glow: '#6060a0', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#8080d0',
  },
  holy_envoy: {
    idle: 'https://aka.doubaocdn.com/s/UZK9QQSG8O',
    walk: 'https://aka.doubaocdn.com/s/UZK9QQSG8O',
    walk2: 'https://aka.doubaocdn.com/s/Qph4YNxnpW',
    walk3: 'https://aka.doubaocdn.com/s/IpcEagfwmT',
    walk4: 'https://aka.doubaocdn.com/s/aNZwWxt8wX',
    attack: 'https://aka.doubaocdn.com/s/VQQHfjBleU',
    attack2: 'https://aka.doubaocdn.com/s/Ffq0Ozp9WT',
    hit: 'https://aka.doubaocdn.com/s/WJDNaGLHAt',
    color: '#c0a040', glow: '#fff0a0', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#ffffff',
  },
  divine_envoy: {
    idle: 'https://aka.doubaocdn.com/s/K5xHlNU28s',
    walk: 'https://aka.doubaocdn.com/s/K5xHlNU28s',
    walk2: 'https://aka.doubaocdn.com/s/tfleZSU2QM',
    walk3: 'https://aka.doubaocdn.com/s/XqAIeRurL0',
    walk4: 'https://aka.doubaocdn.com/s/tyr9eGSGRp',
    attack: 'https://aka.doubaocdn.com/s/8neMJjtvhr',
    attack2: 'https://aka.doubaocdn.com/s/FizXHwVIDs',
    hit: 'https://aka.doubaocdn.com/s/NsjVkvEGJF',
    color: '#d0c080', glow: '#fff8c0', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#fff8d0',
  },
  // ---------- 紅色史詩 ----------
  balrog: {
    idle: 'https://aka.doubaocdn.com/s/tdkg3als9P',
    walk: 'https://aka.doubaocdn.com/s/tdkg3als9P',
    walk2: 'https://aka.doubaocdn.com/s/K9NBB7cGSb',
    walk3: 'https://aka.doubaocdn.com/s/YzTgNSPMxr',
    walk4: 'https://aka.doubaocdn.com/s/a9s53qaahR',
    attack: 'https://aka.doubaocdn.com/s/s88OAtsBTM',
    attack2: 'https://aka.doubaocdn.com/s/UkrwvfPntT',
    hit: 'https://aka.doubaocdn.com/s/rU1ioEhNRd',
    color: '#601010', glow: '#ff6030', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#ff9040',
  },
  dark_knight_red: {
    idle: 'https://aka.doubaocdn.com/s/MGWIDhAmHM',
    walk: 'https://aka.doubaocdn.com/s/MGWIDhAmHM',
    walk2: 'https://aka.doubaocdn.com/s/dr9VJVQW76',
    walk3: 'https://aka.doubaocdn.com/s/tjZe2VQqCV',
    walk4: 'https://aka.doubaocdn.com/s/i4rVzQcOe5',
    attack: 'https://aka.doubaocdn.com/s/BODZUpyXSI',
    attack2: 'https://aka.doubaocdn.com/s/je8dqUMZZI',
    hit: 'https://aka.doubaocdn.com/s/nqcRUI3qJU',
    color: '#201028', glow: '#ff3030', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#ff4040',
  },
  dark_mage_red: {
    idle: 'https://aka.doubaocdn.com/s/zrnCCihNJt',
    walk: 'https://aka.doubaocdn.com/s/zrnCCihNJt',
    walk2: 'https://aka.doubaocdn.com/s/BiBfVufViZ',
    walk3: 'https://aka.doubaocdn.com/s/nIVWCJVzvT',
    walk4: 'https://aka.doubaocdn.com/s/kfSS24e8lc',
    attack: 'https://aka.doubaocdn.com/s/YifczyXetY',
    attack2: 'https://aka.doubaocdn.com/s/DCr5DPCmxk',
    hit: 'https://aka.doubaocdn.com/s/CRvwT4vtVx',
    color: '#300040', glow: '#c040ff', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#d060ff',
  },
  dark_sorcerer: {
    idle: 'https://aka.doubaocdn.com/s/gZssWp0Yaq',
    walk: 'https://aka.doubaocdn.com/s/gZssWp0Yaq',
    walk2: 'https://aka.doubaocdn.com/s/iTVLHzirHU',
    walk3: 'https://aka.doubaocdn.com/s/FfzUQzcUjH',
    walk4: 'https://aka.doubaocdn.com/s/Ni2RrhDZ1j',
    attack: 'https://aka.doubaocdn.com/s/8hb1wWKeFd',
    attack2: 'https://aka.doubaocdn.com/s/yzizeV2vZe',
    hit: 'https://aka.doubaocdn.com/s/9j6fRyQNOL',
    color: '#401050', glow: '#ff50c0', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#ff80d0',
  },
  dark_assassin_red: {
    idle: 'https://aka.doubaocdn.com/s/ZOURHhq9xO',
    walk: 'https://aka.doubaocdn.com/s/ZOURHhq9xO',
    walk2: 'https://aka.doubaocdn.com/s/8UiDnbHq3e',
    walk3: 'https://aka.doubaocdn.com/s/UGv0OG7wbW',
    walk4: 'https://aka.doubaocdn.com/s/KXQqHrFfFL',
    attack: 'https://aka.doubaocdn.com/s/EIpWEIeVMj',
    attack2: 'https://aka.doubaocdn.com/s/WaGtGiouSs',
    hit: 'https://aka.doubaocdn.com/s/9dOsER3iAQ',
    color: '#101018', glow: '#ff2060', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#ff4080',
  },
  ghost_archer: {
    idle: 'https://aka.doubaocdn.com/s/P9nRBRY0yz',
    walk: 'https://aka.doubaocdn.com/s/P9nRBRY0yz',
    walk2: 'https://aka.doubaocdn.com/s/3jWWxnd4sb',
    walk3: 'https://aka.doubaocdn.com/s/T6U5hG7RQH',
    walk4: 'https://aka.doubaocdn.com/s/X6JwwPTJvv',
    attack: 'https://aka.doubaocdn.com/s/Z6uaGG4xJS',
    attack2: 'https://aka.doubaocdn.com/s/oqrXlRj3Z5',
    hit: 'https://aka.doubaocdn.com/s/AKVEuZjd4f',
    color: '#203040', glow: '#60c0ff', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#80e0ff',
  },
  silver_knight_galahad: {
    idle: 'https://aka.doubaocdn.com/s/LEtxcl2amQ',
    walk: 'https://aka.doubaocdn.com/s/LEtxcl2amQ',
    walk2: 'https://aka.doubaocdn.com/s/1BinCuwimp',
    walk3: 'https://aka.doubaocdn.com/s/vaVKLURbXq',
    walk4: 'https://aka.doubaocdn.com/s/VlwJcbZBZg',
    attack: 'https://aka.doubaocdn.com/s/c2pcXyCAoC',
    attack2: 'https://aka.doubaocdn.com/s/UBsEfc2hXx',
    hit: 'https://aka.doubaocdn.com/s/MwmmkPb6gf',
    color: '#c0c0e0', glow: '#fff0a0', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#ffffff',
  },

  // ---------- 藍色稀有（新變身） ----------
  frost_knight: {
    idle: 'https://aka.doubaocdn.com/s/AXY4DIQe2G',
    walk: 'https://aka.doubaocdn.com/s/AXY4DIQe2G',
    walk2: 'https://aka.doubaocdn.com/s/G3QcnMpuCP',
    walk3: 'https://aka.doubaocdn.com/s/ef7gCUKojx',
    walk4: 'https://aka.doubaocdn.com/s/KfG4vGHfBg',
    attack: 'https://aka.doubaocdn.com/s/F9QCsN3SUJ',
    attack2: 'https://aka.doubaocdn.com/s/DagRO0Zu0O',
    hit: 'https://aka.doubaocdn.com/s/GP2tFT10gV',
    color: '#204060', glow: '#60c0ff', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#80d0ff',
  },
  berserker_blue: {
    idle: 'https://aka.doubaocdn.com/s/WoJbCl806L',
    walk: 'https://aka.doubaocdn.com/s/WoJbCl806L',
    walk2: 'https://aka.doubaocdn.com/s/lJuFzWMxAU',
    walk3: 'https://aka.doubaocdn.com/s/0behWSGxwq',
    walk4: 'https://aka.doubaocdn.com/s/hZVlq8jqks',
    attack: 'https://aka.doubaocdn.com/s/il72r9FzSj',
    attack2: 'https://aka.doubaocdn.com/s/D6U5t601Rd',
    hit: 'https://aka.doubaocdn.com/s/RuWfBBWE3q',
    color: '#304060', glow: '#70a0ff', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#90b0ff',
  },
  frost_mage: {
    idle: 'https://aka.doubaocdn.com/s/5S1tUIsls4',
    walk: 'https://aka.doubaocdn.com/s/5S1tUIsls4',
    walk2: 'https://aka.doubaocdn.com/s/4im8YcndVt',
    walk3: 'https://aka.doubaocdn.com/s/yavRrKoSfb',
    walk4: 'https://aka.doubaocdn.com/s/MwULW9MFX6',
    attack: 'https://aka.doubaocdn.com/s/OncrG5zfYk',
    attack2: 'https://aka.doubaocdn.com/s/J9PLJTHNOp',
    hit: 'https://aka.doubaocdn.com/s/4FHggRV3UL',
    color: '#203060', glow: '#80c0ff', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#a0d0ff',
  },
  lightning_mage: {
    idle: 'https://aka.doubaocdn.com/s/Ke1R2tYyYi',
    walk: 'https://aka.doubaocdn.com/s/Ke1R2tYyYi',
    walk2: 'https://aka.doubaocdn.com/s/i9ohDah6fK',
    walk3: 'https://aka.doubaocdn.com/s/1yaLUBo60m',
    walk4: 'https://aka.doubaocdn.com/s/Jf0iOCYab0',
    attack: 'https://aka.doubaocdn.com/s/qdmsMhWgqS',
    attack2: 'https://aka.doubaocdn.com/s/vnhVMY1Mbl',
    hit: 'https://aka.doubaocdn.com/s/zZYmJKREfl',
    color: '#302060', glow: '#a080ff', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#b090ff',
  },
  elf_archer_blue: {
    idle: 'https://aka.doubaocdn.com/s/DA1JiUu25C',
    walk: 'https://aka.doubaocdn.com/s/DA1JiUu25C',
    walk2: 'https://aka.doubaocdn.com/s/mKkn8z5w9j',
    walk3: 'https://aka.doubaocdn.com/s/QzBWNKPsY4',
    walk4: 'https://aka.doubaocdn.com/s/boUCARKlUK',
    attack: 'https://aka.doubaocdn.com/s/uzOCokO05x',
    attack2: 'https://aka.doubaocdn.com/s/L2mcusQPUi',
    hit: 'https://aka.doubaocdn.com/s/lVvCMQkXCa',
    color: '#205060', glow: '#60e0d0', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#80f0e0',
  },
  wind_walker: {
    idle: 'https://aka.doubaocdn.com/s/A9YN2hiCuY',
    walk: 'https://aka.doubaocdn.com/s/A9YN2hiCuY',
    walk2: 'https://aka.doubaocdn.com/s/BxhqoNBsy9',
    walk3: 'https://aka.doubaocdn.com/s/DInQE4sGfT',
    walk4: 'https://aka.doubaocdn.com/s/k5L5nRvfAz',
    attack: 'https://aka.doubaocdn.com/s/RPBVhIBi7V',
    attack2: 'https://aka.doubaocdn.com/s/RPBVhIBi7V',
    hit: 'https://aka.doubaocdn.com/s/A9YN2hiCuY',
    color: '#206040', glow: '#80e0a0', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#a0f0c0',
  },
  silver_knight_blue: {
    idle: 'https://aka.doubaocdn.com/s/wLT8tzjGBp',
    walk: 'https://aka.doubaocdn.com/s/wLT8tzjGBp',
    walk2: 'https://aka.doubaocdn.com/s/YxXoXhdLmS',
    walk3: 'https://aka.doubaocdn.com/s/cN3E5Nquah',
    walk4: 'https://aka.doubaocdn.com/s/ci6rXRx8DG',
    attack: 'https://aka.doubaocdn.com/s/OSap9erVl0',
    attack2: 'https://aka.doubaocdn.com/s/QRytegQ1Oe',
    hit: 'https://aka.doubaocdn.com/s/JIGsfqs5tQ',
    color: '#c0c0d8', glow: '#e0e8ff', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#f0f0ff',
  },
  temple_knight: {
    idle: 'https://aka.doubaocdn.com/s/nPAX4om6CQ',
    walk: 'https://aka.doubaocdn.com/s/nPAX4om6CQ',
    walk2: 'https://aka.doubaocdn.com/s/72qwU65Xsa',
    walk3: 'https://aka.doubaocdn.com/s/UNCvpUlZe3',
    walk4: 'https://aka.doubaocdn.com/s/BG9V2u0zRc',
    attack: 'https://aka.doubaocdn.com/s/IVxWqYtCFv',
    attack2: 'https://aka.doubaocdn.com/s/9aJxLBlYSk',
    hit: 'https://aka.doubaocdn.com/s/bSTo2dlMbK',
    color: '#d0c080', glow: '#ffe8a0', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#fff0c0',
  },
  shadow_assassin_blue: {
    idle: 'https://aka.doubaocdn.com/s/cRVH78jrX4',
    walk: 'https://aka.doubaocdn.com/s/cRVH78jrX4',
    walk2: 'https://aka.doubaocdn.com/s/owA0PPIkhb',
    walk3: 'https://aka.doubaocdn.com/s/rCn1Xg8QwR',
    walk4: 'https://aka.doubaocdn.com/s/QO6k6TReK3',
    attack: 'https://aka.doubaocdn.com/s/uiC3MCWbCM',
    attack2: 'https://aka.doubaocdn.com/s/3E5L92SGX8',
    hit: 'https://aka.doubaocdn.com/s/FEaYTU3HUH',
    color: '#202030', glow: '#6080c0', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#80a0e0',
  },
  poison_blade: {
    idle: 'https://aka.doubaocdn.com/s/qRmnQyhsHF',
    walk: 'https://aka.doubaocdn.com/s/qRmnQyhsHF',
    walk2: 'https://aka.doubaocdn.com/s/IIMkBDTmaj',
    walk3: 'https://aka.doubaocdn.com/s/RBtLFeKz3n',
    walk4: 'https://aka.doubaocdn.com/s/StSWxwsuyL',
    attack: 'https://aka.doubaocdn.com/s/uQMK2b8OQV',
    attack2: 'https://aka.doubaocdn.com/s/DEI5Znr00s',
    hit: 'https://aka.doubaocdn.com/s/mO6nx6RVMn',
    color: '#204020', glow: '#80d060', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#a0e080',
  },
  gargoyle: {
    idle: 'https://aka.doubaocdn.com/s/Qz5xkyMung',
    walk: 'https://aka.doubaocdn.com/s/Qz5xkyMung',
    walk2: 'https://aka.doubaocdn.com/s/SiOQl1qSHv',
    walk3: 'https://aka.doubaocdn.com/s/FXdRQ4zYcV',
    walk4: 'https://aka.doubaocdn.com/s/kgBNXt4Xoo',
    attack: 'https://aka.doubaocdn.com/s/vQNYtfo6e9',
    attack2: 'https://aka.doubaocdn.com/s/gLa19G08zS',
    hit: 'https://aka.doubaocdn.com/s/PABlGUtHZI',
    color: '#404050', glow: '#a0a0c0', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#c0c0d0',
  },
  werewolf: {
    idle: 'https://aka.doubaocdn.com/s/GMxsqLaCGt',
    walk: 'https://aka.doubaocdn.com/s/GMxsqLaCGt',
    walk2: 'https://aka.doubaocdn.com/s/q3MAJiktJq',
    walk3: 'https://aka.doubaocdn.com/s/P8x4odPP2g',
    walk4: 'https://aka.doubaocdn.com/s/xipd7571LS',
    attack: 'https://aka.doubaocdn.com/s/qaasdrxeR4',
    attack2: 'https://aka.doubaocdn.com/s/Z3K4JEOsj7',
    hit: 'https://aka.doubaocdn.com/s/khEwYymEiA',
    color: '#503020', glow: '#c08060', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#e0a080',
  },

  // ---------- 綠色精良（新變身） ----------
  forest_guardian: {
    idle: 'https://aka.doubaocdn.com/s/1daCVmkSeg',
    walk: 'https://aka.doubaocdn.com/s/1daCVmkSeg',
    walk2: 'https://aka.doubaocdn.com/s/7rkggQtVva',
    walk3: 'https://aka.doubaocdn.com/s/7EMmttpXtt',
    walk4: 'https://aka.doubaocdn.com/s/rUD0POkJta',
    attack: 'https://aka.doubaocdn.com/s/rFGDkDOZRB',
    attack2: 'https://aka.doubaocdn.com/s/0yfRk9msfe',
    hit: 'https://aka.doubaocdn.com/s/u8C4FDxAzq',
    color: '#205030', glow: '#60c080', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#80e0a0',
  },
  wind_spirit: {
    idle: 'https://aka.doubaocdn.com/s/jkm5kDZZyi',
    walk: 'https://aka.doubaocdn.com/s/jkm5kDZZyi',
    walk2: 'https://aka.doubaocdn.com/s/s1b9NsVUNP',
    walk3: 'https://aka.doubaocdn.com/s/rY6t9P8rRQ',
    walk4: 'https://aka.doubaocdn.com/s/u5eemtHJJk',
    attack: 'https://aka.doubaocdn.com/s/Vn6NQ5HTfP',
    attack2: 'https://aka.doubaocdn.com/s/C3VstdT6dQ',
    hit: 'https://aka.doubaocdn.com/s/n7NjzUEXzg',
    color: '#80c0c0', glow: '#c0f0f0', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#e0ffff',
  },
  green_dragon: {
    idle: 'https://aka.doubaocdn.com/s/Pl4PBEqsvs',
    walk: 'https://aka.doubaocdn.com/s/Pl4PBEqsvs',
    walk2: 'https://aka.doubaocdn.com/s/CH3Wf8rqcv',
    walk3: 'https://aka.doubaocdn.com/s/324delxMNK',
    walk4: 'https://aka.doubaocdn.com/s/jsmfG7UE6X',
    attack: 'https://aka.doubaocdn.com/s/StVW9D5cG3',
    attack2: 'https://aka.doubaocdn.com/s/KGGg348qE0',
    hit: 'https://aka.doubaocdn.com/s/lyhUAf9LY1',
    color: '#204020', glow: '#80d060', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#a0e080',
  },
  druid: {
    idle: 'https://aka.doubaocdn.com/s/g5u2Sq5agH',
    walk: 'https://aka.doubaocdn.com/s/g5u2Sq5agH',
    walk2: 'https://aka.doubaocdn.com/s/8uoto9Z1wj',
    walk3: 'https://aka.doubaocdn.com/s/y1G12v4mDa',
    walk4: 'https://aka.doubaocdn.com/s/3eq3rAYEYV',
    attack: 'https://aka.doubaocdn.com/s/pFJT2Xc5o8',
    attack2: 'https://aka.doubaocdn.com/s/Qd4BJClvxa',
    hit: 'https://aka.doubaocdn.com/s/UdeJSiOwgC',
    color: '#405020', glow: '#a0c060', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#c0e080',
  },
  treant: {
    idle: 'https://aka.doubaocdn.com/s/BIuGGAsYZh',
    walk: 'https://aka.doubaocdn.com/s/BIuGGAsYZh',
    walk2: 'https://aka.doubaocdn.com/s/vlURIemaSk',
    walk3: 'https://aka.doubaocdn.com/s/GI7RvSykGX',
    walk4: 'https://aka.doubaocdn.com/s/RqzkY6gSAe',
    attack: 'https://aka.doubaocdn.com/s/q2rm4wKK3M',
    attack2: 'https://aka.doubaocdn.com/s/F6ctRUeEtA',
    hit: 'https://aka.doubaocdn.com/s/fNqR5LHWx6',
    color: '#403020', glow: '#80a050', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#a0c070',
  },

  // ---------- 白色普通（新變身） ----------
  white_dragon: {
    idle: 'https://aka.doubaocdn.com/s/APDWUGWZVw',
    walk: 'https://aka.doubaocdn.com/s/APDWUGWZVw',
    walk2: 'https://aka.doubaocdn.com/s/bYD7aJdZCZ',
    walk3: 'https://aka.doubaocdn.com/s/EHH32Fvnw1',
    walk4: 'https://aka.doubaocdn.com/s/01wfNPiTXP',
    attack: 'https://aka.doubaocdn.com/s/PL5FOn3oK3',
    attack2: 'https://aka.doubaocdn.com/s/UfxwzeARpf',
    hit: 'https://aka.doubaocdn.com/s/UIynvopITS',
    color: '#e0e8f0', glow: '#ffffff', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#ffffff',
  },
  angel_white: {
    idle: 'https://aka.doubaocdn.com/s/NaPbNp9c1V',
    walk: 'https://aka.doubaocdn.com/s/NaPbNp9c1V',
    walk2: 'https://aka.doubaocdn.com/s/GUlp5Qy6iw',
    walk3: 'https://aka.doubaocdn.com/s/5UMFE65Hny',
    walk4: 'https://aka.doubaocdn.com/s/hbuS4nnQI2',
    attack: 'https://aka.doubaocdn.com/s/0UZceLNR6V',
    attack2: 'https://aka.doubaocdn.com/s/kUFVQVjTCS',
    hit: 'https://aka.doubaocdn.com/s/3ygE66VdLj',
    color: '#f0f0e8', glow: '#fff8c0', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#ffffff',
  },
  unicorn: {
    idle: 'https://aka.doubaocdn.com/s/a8JCQmVVNT',
    walk: 'https://aka.doubaocdn.com/s/a8JCQmVVNT',
    walk2: 'https://aka.doubaocdn.com/s/f8JFmtkifj',
    walk3: 'https://aka.doubaocdn.com/s/8dvXmhS5c7',
    walk4: 'https://aka.doubaocdn.com/s/HzkkhZbJQy',
    attack: 'https://aka.doubaocdn.com/s/FOIte0Nrnl',
    attack2: 'https://aka.doubaocdn.com/s/2lE46ur5Jl',
    hit: 'https://aka.doubaocdn.com/s/1OVUePiezR',
    color: '#f8f0f8', glow: '#ffe0ff', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#ffffff',
  },
  holy_spirit: {
    idle: 'https://aka.doubaocdn.com/s/TLuUdtTRPo',
    walk: 'https://aka.doubaocdn.com/s/TLuUdtTRPo',
    walk2: 'https://aka.doubaocdn.com/s/JcezH6rVhY',
    walk3: 'https://aka.doubaocdn.com/s/gnxhj1r7Tr',
    walk4: 'https://aka.doubaocdn.com/s/8IDPqcesFo',
    attack: 'https://aka.doubaocdn.com/s/aNWVrFpkQ7',
    attack2: 'https://aka.doubaocdn.com/s/DGdNzHjEpE',
    hit: 'https://aka.doubaocdn.com/s/wZ2LHv5DEE',
    color: '#e8f0f8', glow: '#c0e0ff', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#f0f8ff',
  },
  white_wolf: {
    idle: 'https://aka.doubaocdn.com/s/dPBulifvdn',
    walk: 'https://aka.doubaocdn.com/s/dPBulifvdn',
    walk2: 'https://aka.doubaocdn.com/s/vtUUJB7bTi',
    walk3: 'https://aka.doubaocdn.com/s/Atwxnpfckc',
    walk4: 'https://aka.doubaocdn.com/s/ysMOfAVZc0',
    attack: 'https://aka.doubaocdn.com/s/tjFKwAE5pk',
    attack2: 'https://aka.doubaocdn.com/s/ekiTVHnUBx',
    hit: 'https://aka.doubaocdn.com/s/ohKPiheUuX',
    color: '#d8d8e0', glow: '#e8e8f0', useImg: true,
    multiFrame: true, coverMode: true,
    slashColor: '#f0f0f8',
  },

  // ========== 怪物 ==========
  goblin: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrebzbxgbq_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrebzbxgbq_ve_miaoda',
    color: '#508040', glow: '#80c060', useImg: true
  },
  skeleton: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreczux4ao_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreczux4ao_ve_miaoda',
    color: '#e0e0d0', glow: '#ffffff', useImg: true
  },
  orc: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrecod3ydi_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrecod3ydi_ve_miaoda',
    color: '#608040', glow: '#a0c060', useImg: true
  },
  slime: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd24hpgdo_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd24hpgdo_ve_miaoda',
    color: '#40a060', glow: '#80e0a0', useImg: true
  },
  spider: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreb7vlsgq_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreb7vlsgq_ve_miaoda',
    color: '#402020', glow: '#804040', useImg: true
  },
  scorpion: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreacgyqdo_ve_miaoda',
    color: '#a06020', glow: '#ff9040', useImg: true
  },
  bat: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd25ssaao_ve_miaoda',
    color: '#604060', glow: '#a080c0', useImg: true
  },
  monsterwolf: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd7rqfobi_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd7rqfobi_ve_miaoda',
    color: '#505060', glow: '#a0a0c0', useImg: true
  },
  ghost: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkread3d2eg_ve_miaoda',
    color: '#a0b0d0', glow: '#d0e0f0', useImg: true
  },
  troll: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreb7m4ibg_ve_miaoda',
    color: '#608040', glow: '#90c060', useImg: true
  },
  demon: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd6zdu4ei_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd6zdu4ei_ve_miaoda',
    color: '#c03030', glow: '#ff6040', useImg: true
  },
  dragon: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreacphggg_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreacphggg_ve_miaoda',
    color: '#d08020', glow: '#ffb060', useImg: true
  },
  shaman: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd7t3t6ko_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd7t3t6ko_ve_miaoda',
    color: '#608040', glow: '#90c060', useImg: true
  },
  bandit: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd4brrcsq_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd4brrcsq_ve_miaoda',
    color: '#804020', glow: '#c08040', useImg: true
  },
  zombie: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd3b5jgii_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd3b5jgii_ve_miaoda',
    color: '#608060', glow: '#90b080', useImg: true
  },
  darkmage: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreacxtmgg_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreacxtmgg_ve_miaoda',
    color: '#6040a0', glow: '#a080e0', useImg: true
  },
  // ========== Boss ==========
  boss_goblin:  { idle: '👺', attack: '💥', color: '#a04020', glow: '#ff7040', boss: true },
  boss_troll:   { idle: '👹', attack: '💥', color: '#608040', glow: '#90c060', boss: true },
  boss_lich:    { idle: '💀', attack: '✨', color: '#8040a0', glow: '#c080e0', boss: true },
  boss_scorpion:{ idle: '🦂', attack: '💥', color: '#a06020', glow: '#d09040', boss: true },
  boss_bat:     { idle: '🦇', attack: '💥', color: '#802040', glow: '#ff4060', boss: true },
  boss_orc:     { idle: '👹', attack: '💥', color: '#a04020', glow: '#ff7040', boss: true },
  boss_ghost:   { idle: '👻', attack: '💀', color: '#6060a0', glow: '#a0a0ff', boss: true },
  boss_demon:   { idle: '😈', attack: '🔥', color: '#c02020', glow: '#ff5050', boss: true },
  boss_dragon:  { idle: '🐉', attack: '💥', color: '#e09010', glow: '#ffc040', boss: true },
  shaman: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrbyz6ssai_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrbyz6ssai_ve_miaoda',
    color: '#608040', glow: '#90c060', useImg: true
  },
  bandit: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrb2g4hwbq_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrb2g4hwbq_ve_miaoda',
    color: '#804020', glow: '#c08040', useImg: true
  },
  zombie: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrb2trecbq_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrb2trecbq_ve_miaoda',
    color: '#608060', glow: '#90b080', useImg: true
  },
  darkmage: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrbyu7xcag_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrbyu7xcag_ve_miaoda',
    color: '#6040a0', glow: '#a080e0', useImg: true
  },
  // ========== Boss ==========
  boss_goblin: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreeyoo6hq_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreeyoo6hq_ve_miaoda',
    color: '#a04020', glow: '#ff7040', boss: true, useImg: true
  },
  boss_troll: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreb7m4ibg_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreb7m4ibg_ve_miaoda',
    color: '#608040', glow: '#90c060', boss: true, useImg: true
  },
  boss_lich: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkredbr4oeo_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkredbr4oeo_ve_miaoda',
    color: '#8040a0', glow: '#c080e0', boss: true, useImg: true
  },
  boss_scorpion: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreacgyqdo_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreacgyqdo_ve_miaoda',
    color: '#a06020', glow: '#d09040', boss: true, useImg: true
  },
  boss_bat: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd25ssaao_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd25ssaao_ve_miaoda',
    color: '#802040', glow: '#ff4060', boss: true, useImg: true
  },
  boss_orc: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd3d7j6pq_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd3d7j6pq_ve_miaoda',
    color: '#a04020', glow: '#ff7040', boss: true, useImg: true
  },
  boss_ghost: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkread3d2eg_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkread3d2eg_ve_miaoda',
    color: '#6060a0', glow: '#a0a0ff', boss: true, useImg: true
  },
  boss_demon: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreezckefq_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreezckefq_ve_miaoda',
    color: '#c02020', glow: '#ff5050', boss: true, useImg: true
  },
  boss_dragon: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreacphggg_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreacphggg_ve_miaoda',
    color: '#e09010', glow: '#ffc040', boss: true, useImg: true
  },
  // ========== NPC ==========
  npc_blacksmith: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrectd3ogg_ve_miaoda',
    color: '#c08040', glow: '#ffc080', npc: true, useImg: true
  },
  npc_shop: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrefqrgmdq_ve_miaoda',
    color: '#a08060', glow: '#d0b080', npc: true, useImg: true
  },
  npc_luxury: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd67aq2ci_ve_miaoda',
    color: '#b080c0', glow: '#e0b0ff', npc: true, useImg: true
  },
  npc_warehouse: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkree664wgo_ve_miaoda',
    color: '#a08060', glow: '#d0b080', npc: true, useImg: true
  },
  npc_quest: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreecj3cfi_ve_miaoda',
    color: '#4080c0', glow: '#80b0ff', npc: true, useImg: true
  },
  npc_inn: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreczuaehq_ve_miaoda',
    color: '#d06040', glow: '#ffa080', npc: true, useImg: true
  },
  npc_priest: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd6eez2eo_ve_miaoda',
    color: '#f0e0b0', glow: '#fff8d0', npc: true, useImg: true
  },
  npc_dungeon: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrebvwrajo_ve_miaoda',
    color: '#604080', glow: '#a080c0', npc: true, useImg: true
  },
  npc_board: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrehajimao_ve_miaoda',
    color: '#806040', glow: '#c0a070', npc: true, useImg: true
  },
  npc_guard: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreecj3cfi_ve_miaoda',
    color: '#a08050', glow: '#d0b070', npc: true, useImg: true
  },
  npc_healer: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd6eez2eo_ve_miaoda',
    color: '#f0e0b0', glow: '#fff8d0', npc: true, useImg: true
  },
  npc_wizard: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrebvwrajo_ve_miaoda',
    color: '#8060e0', glow: '#c0a0ff', npc: true, useImg: true
  },
  // ========== 英雄 ==========
  hero_knight: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrb2tol2gi_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrb2tol2gi_ve_miaoda',
    color: '#c0a060', glow: '#ffe090', useImg: true
  },
  hero_archer: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrb2xfi6fq_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrb2xfi6fq_ve_miaoda',
    color: '#60b060', glow: '#a0e090', useImg: true
  },
  hero_assassin: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrb2mtywho_ve_miaoda',
    attack: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrb2mtywho_ve_miaoda',
    color: '#a04060', glow: '#ff7090', useImg: true
  },
  // ========== 寵物 ==========
  pet_fox: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrefkve2fg_ve_miaoda',
    color: '#e06040', glow: '#ff9060', useImg: true
  },
  pet_wolf: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkredgan6ag_ve_miaoda',
    color: '#a0a0c0', glow: '#c0e0ff', useImg: true
  },
  pet_rabbit: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreduxggio_ve_miaoda',
    color: '#f0c0e0', glow: '#ffe0f0', useImg: true
  },
  pet_cat: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkregoykcfq_ve_miaoda',
    color: '#a08060', glow: '#d0b080', useImg: true
  },
  pet_crow: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreaq3qomg_ve_miaoda',
    color: '#8060a0', glow: '#c0a0e0', useImg: true
  },
  pet_fairy: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkregzahuho_ve_miaoda',
    color: '#80e0a0', glow: '#c0ffd0', useImg: true
  },
  pet_phoenix: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrefq7fwai_ve_miaoda',
    color: '#ff6020', glow: '#ffa060', useImg: true
  },
  pet_wolf_ice: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrefmiwqlo_ve_miaoda',
    color: '#80c0e0', glow: '#c0e8ff', useImg: true
  },
  pet_unicorn: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreauduybg_ve_miaoda',
    color: '#f0e0ff', glow: '#fff0ff', useImg: true
  },
  pet_panther: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrebbrhgbg_ve_miaoda',
    color: '#603080', glow: '#a060d0', useImg: true
  },
  pet_thunder: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreelduido_ve_miaoda',
    color: '#f0e040', glow: '#fff890', useImg: true
  },
  pet_turtle: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd7gxhmqi_ve_miaoda',
    color: '#60a060', glow: '#90d090', useImg: true
  },
  pet_tiger: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreerfeigo_ve_miaoda',
    color: '#e0a030', glow: '#ffd060', useImg: true
  },
  pet_panda: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrefkve2gg_ve_miaoda',
    color: '#606070', glow: '#b0b0c0', useImg: true
  },
  pet_dragon: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreerfeiho_ve_miaoda',
    color: '#e08030', glow: '#ffb060', useImg: true
  },
  pet_phoenix_legend: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkregtzsyaq_ve_miaoda',
    color: '#ff6020', glow: '#ffa060', useImg: true
  },
  pet_dragon_legend: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd6ajukei_ve_miaoda',
    color: '#d0a020', glow: '#ffe060', useImg: true
  },
  pet_ghost: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkregzahugo_ve_miaoda',
    color: '#a0b0d0', glow: '#d0e0f0', useImg: true
  },
  pet_babydragon: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreb556oei_ve_miaoda',
    color: '#ff8030', glow: '#ffc060', useImg: true
  },
  pet_golddragon: {
    idle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrd7ll3wai_ve_miaoda',
    color: '#ffd040', glow: '#fff080', useImg: true
  },

};

// 生成精靈圖 HTML（暗黑風格，統一大小，透明背景）
function spriteHTML(key, opts = {}) {
  const s = SPRITE[key];
  if (!s) return `<div class="sprite-unit" style="font-size:24px">❓</div>`;
  const size = opts.size || (s.boss ? 64 : s.npc ? 40 : 44);
  const state = opts.state || 'idle'; // idle / attack / dead
  const color = s.color || '#c0a060';
  const glow = s.glow || '#ffe090';
  const classes = [
    'sprite-unit',
    s.boss ? 'sprite-boss' : '',
    s.npc ? 'sprite-npc' : '',
    s.useImg ? 'sprite-img' : '',
    state === 'attack' ? 'sprite-attack' : '',
    state === 'dead' ? 'sprite-dead' : '',
  ].filter(Boolean).join(' ');

  if (state === 'dead') {
    // 死亡：顯示墳墓，原角色淡出
    return `<div class="${classes}" style="width:${size}px;height:${size}px">
      <div class="sprite-tomb" style="font-size:${Math.floor(size * 0.7)}px">🪦</div>
    </div>`;
  }

  if (s.useImg) {
    const src = state === 'attack' ? (s.attack || s.idle) : s.idle;
    const filter = `drop-shadow(0 0 6px ${glow}) drop-shadow(0 3px 3px rgba(0,0,0,0.7))`;
    return `<div class="${classes}" style="width:${size}px;height:${size}px">
      <img src="${src}" style="width:100%;height:100%;object-fit:contain;display:block;filter:${filter}" alt="sprite"/>
    </div>`;
  }

  // emoji 精靈
  const emoji = state === 'attack' ? (s.attack || s.idle) : s.idle;
  const fs = Math.floor(size * 0.85);
  const filter = `drop-shadow(0 0 4px ${glow}) drop-shadow(0 2px 2px rgba(0,0,0,0.8))`;
  return `<div class="${classes}" style="width:${size}px;height:${size}px;font-size:${fs}px;color:${color};filter:${filter}">${emoji}</div>`;
}

// 用於UI顯示的精靈HTML（暗黑風格，透明背景）
function spriteEmojiHTML(spriteObj, size = 40) {
  const s = (typeof spriteObj === 'object' && spriteObj && spriteObj.idle) ? spriteObj : SPRITE.warrior;
  if (s.useImg) {
    const filter = `drop-shadow(0 0 4px ${s.glow || '#ffe090'}) drop-shadow(0 2px 2px rgba(0,0,0,0.8))`;
    return `<div class="sprite-emoji-ui sprite-img" style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center">
      <img src="${s.idle}" style="width:100%;height:100%;object-fit:contain;display:block;filter:${filter}" alt="sprite"/>
    </div>`;
  }
  const fs = Math.floor(size * 0.75);
  const filter = `drop-shadow(0 0 4px ${s.glow || '#ffe090'}) drop-shadow(0 2px 2px rgba(0,0,0,0.8))`;
  return `<div class="sprite-emoji-ui" style="width:${size}px;height:${size}px;font-size:${fs}px;color:${s.color || '#c0a060'};filter:${filter};display:flex;align-items:center;justify-content:center">${s.idle || '⚔️'}</div>`;
}

// 秒数格式化为 mm:ss 或 h:mm:ss
function formatTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  if (sec < 60) return sec + '秒';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}分${s}秒`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}小時${mm}分`;
}

// 获取技能栏裝備的技能列表（兼容旧接口：仅返回技能槽位的技能，道具槽位返回 null）
function getBarSkills() {
  const arr = [];
  for (let i = 0; i < 8; i++) {
    const slot = GS.quickBar[i];
    if (slot && slot.type === 'skill') {
      const cls = CLASSES[GS.player.classId];
      arr.push(cls?.allSkills?.[slot.skillIndex] || null);
    } else {
      arr.push(null);
    }
  }
  return arr;
}
function getBarSkill(idx) {
  const slot = GS.quickBar[idx];
  if (!slot || slot.type !== 'skill') return null;
  const cls = CLASSES[GS.player.classId];
  return cls?.allSkills?.[slot.skillIndex] || null;
}
function findSkillIndex(cls, skillId) {
  return cls.allSkills.findIndex(s => s.id === skillId);
}

// ==================== 通用快捷栏 ====================
// GS.quickBar[i] = null | { type: 'skill', skillIndex: number } | { type: 'item', itemId: string }
function initQuickBar() {
  if (GS.quickBar && GS.quickBar.length === 8) return;
  // 初始快捷欄：自動放入普攻 + 第一個攻擊技能，確保自動戰鬥有技可用
  const cls = CLASSES[GS.player?.classId || 'warrior'];
  const skills = cls?.allSkills || [];
  const normalIdx = skills.findIndex(s => s.id === 'normal');
  // 找第一個非普攻、learnLevel=1 的攻擊技能
  let firstSkillIdx = skills.findIndex((s, i) => i > 0 && (s.learnLevel || 1) <= 1 && s.type !== 'buff' && s.type !== 'heal' && s.type !== 'summon');
  if (firstSkillIdx < 0) firstSkillIdx = skills.findIndex((s, i) => i > 0);
  const bar = [null, null, null, null, null, null, null, null];
  if (normalIdx >= 0) bar[0] = { type: 'skill', skillIndex: normalIdx };
  if (firstSkillIdx >= 0) bar[1] = { type: 'skill', skillIndex: firstSkillIdx };
  GS.quickBar = bar;
}

function setQuickBarSlot(idx, slotData) {
  if (idx < 0 || idx > 7) return;
  GS.quickBar[idx] = slotData || null;
  updateSkillBar();
}

function useQuickBarSlot(idx) {
  const slot = GS.quickBar[idx];
  if (!slot) return;
  if (slot.type === 'skill') {
    castSkill(idx);
  } else if (slot.type === 'item') {
    useConsumable(slot.itemId);
  }
}

// ==================== 快捷栏設定 ====================
function openQuickBarSettings() {
  const list = $('quickbar-config-list');
  if (!list) return;
  const cls = CLASSES[GS.player.classId];
  const allSkills = cls?.allSkills || [];
  const consumables = (GS.inventory || []).filter(i => i.itemType === 'consumable' && i.count > 0);
  list.innerHTML = GS.quickBar.map((slot, idx) => {
    const slotName = slot
      ? (slot.type === 'skill' ? `⚔ ${allSkills[slot.skillIndex]?.name || '技能'}` : `🧪 ${slot.itemId}`)
      : '（空）';
    return `
      <div class="quickbar-setting-row" data-slot="${idx}">
        <span class="quickbar-setting-key">${idx + 1}</span>
        <span class="quickbar-setting-name">${slotName}</span>
        <div style="display:flex;gap:4px">
          <select class="quickbar-setting-select" data-slot="${idx}">
            <option value="">-- 技能 --</option>
            ${allSkills.map((s, i) => `<option value="skill_${i}" ${slot?.type === 'skill' && slot.skillIndex === i ? 'selected' : ''}>${s.name}</option>`).join('')}
            <option value="">-- 道具 --</option>
            ${consumables.map(c => `<option value="item_${c.id}" ${slot?.type === 'item' && slot.itemId === c.id ? 'selected' : ''}>${c.name} (${c.count})</option>`).join('')}
            <option value="clear" ${!slot ? 'selected' : ''}>清空</option>
          </select>
        </div>
      </div>
    `;
  }).join('');
  // 绑定 select 事件
  list.querySelectorAll('.quickbar-setting-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const slotIdx = parseInt(sel.dataset.slot, 10);
      const val = sel.value;
      if (val === 'clear' || val === '') {
        setQuickBarSlot(slotIdx, val === '' ? null : null);
      } else if (val.startsWith('skill_')) {
        const skillIdx = parseInt(val.substring(6), 10);
        setQuickBarSlot(slotIdx, { type: 'skill', skillIndex: skillIdx });
      } else if (val.startsWith('item_')) {
        const itemId = val.substring(5);
        setQuickBarSlot(slotIdx, { type: 'item', itemId });
      }
      // 刷新显示
      openQuickBarSettings();
    });
  });
  $('quickbar-settings-modal').classList.add('open');
}
function closeQuickBarSettings() {
  $('quickbar-settings-modal').classList.remove('open');
}

// 使用消耗品道具
function useConsumable(itemId) {
  const p = GS.player;
  if (p.hp <= 0) return;
  const item = GS.inventory.find(i => i.id === itemId && i.itemType === 'consumable');
  if (!item || item.count <= 0) {
    addLog('system', '该道具数量不足');
    return;
  }
  // 執行效果
  if (item.effect?.bagExpand) {
    const curMax = GS.bagMaxSlots || BAG_BASE_SLOTS;
    if (curMax >= BAG_MAX_SLOTS) {
      addLog('system', '背包已達最大容量（200格）');
      return;
    }
    GS.bagMaxSlots = curMax + 1;
    addLog('system', `使用【${item.name}】：背包容量 ${curMax} → ${curMax + 1}`);
    showFloatingText('背包+1!', '#c0a0ff');
  }
  if (item.effect?.hp) {
    const healAmt = Math.floor(item.effect.hp);
    p.hp = Math.min(getTotalHpMax(), p.hp + healAmt);
    showDamage(p.x, p.y - 55, healAmt, 'heal');
    addLog('heal', `使用【${item.name}】：恢復 ${healAmt} 生命`);
    if (window.AudioSystem) AudioSystem.sfxPotion();
  }
  if (item.effect?.mp) {
    const mpAmt = Math.floor(item.effect.mp);
    p.mp = Math.min(getTotalMpMax(), p.mp + mpAmt);
    showDamage(p.x, p.y - 40, mpAmt, 'mp');
    addLog('heal', `使用【${item.name}】：恢復 ${mpAmt} 魔力`);
  }
  if (item.effect?.atkSpeed) {
    addBuff('atkspd', item.name, `攻擊速度 +${item.effect.atkSpeed}%`, item.effect.duration || 60, { atkSpeedPct: item.effect.atkSpeed });
    const d = item.effect.duration || 60;
    addLog('buff', `使用【${item.name}】：攻擊速度 +${item.effect.atkSpeed}%，持續 ${d >= 60 ? (d/60 >= 60 ? (d/3600).toFixed(1)+'小時' : Math.floor(d/60)+'分鐘') : d+'秒'}`);
  }
  if (item.effect?.atk) {
    addBuff('atkpot', item.name, `攻擊力 +${item.effect.atk}%`, item.effect.duration || 60, { atk: item.effect.atk });
    const d = item.effect.duration || 60;
    addLog('buff', `使用【${item.name}】：攻擊力 +${item.effect.atk}%，持續 ${d >= 60 ? (d/60 >= 60 ? (d/3600).toFixed(1)+'小時' : Math.floor(d/60)+'分鐘') : d+'秒'}`);
  }
  if (item.effect?.moveSpeed) {
    addBuff('movespd', item.name, `移動速度 +${item.effect.moveSpeed}%`, item.effect.duration || 120, { walkSpeedPct: item.effect.moveSpeed });
    const d = item.effect.duration || 120;
    addLog('buff', `使用【${item.name}】：移動速度 +${item.effect.moveSpeed}%，持續 ${d >= 60 ? (d/60 >= 60 ? (d/3600).toFixed(1)+'小時' : Math.floor(d/60)+'分鐘') : d+'秒'}`);
  }
  if (!item.effect?.hp && !item.effect?.mp && !item.effect?.atkSpeed && !item.effect?.atk && !item.effect?.moveSpeed) {
    addLog('system', `使用了【${item.name}】`);
  }
  // 减少数量
  item.count -= 1;
  if (item.count <= 0) {
    const idx = GS.inventory.findIndex(i => i.id === itemId);
    if (idx >= 0) GS.inventory.splice(idx, 1);
    // 快捷栏对应格子变空
    for (let i = 0; i < 8; i++) {
      if (GS.quickBar[i]?.type === 'item' && GS.quickBar[i].itemId === itemId) {
        // 保留格子，等下一次点击会报数量不足
      }
    }
  }
  updateSkillBar();
  updateUI();
}

// ==================== 自動道具系統 ====================
// 渲染設置面板中的自動道具8欄位
function renderAutoItemsGrid() {
  const grid = document.getElementById('auto-items-grid');
  if (!grid) return;
  grid.innerHTML = GS.autoItems.map((slot, idx) => {
    const catalog = AUTO_ITEMS_CATALOG;
    const options = `<option value="">-- 選擇道具 --</option>` +
      catalog.map(it => `<option value="${it.id}" ${slot.itemId === it.id ? 'selected' : ''}>${it.name}</option>`).join('');
    const catItem = catalog.find(c => c.id === slot.itemId);
    const needThreshold = catItem?.threshold;
    const isBuff = catItem?.type === 'buff';
    const iconUrl = catItem ? (ITEM_ICONS[catItem.icon] || '') : '';
     return `
       <div class="auto-item-slot" data-slot-idx="${idx}" style="background:linear-gradient(135deg, rgba(30,22,14,0.85), rgba(18,12,6,0.9));border:1px solid var(--gold-dark);border-radius:6px;padding:4px 6px;display:flex;align-items:center;gap:4px;width:100%;box-sizing:border-box">
         <!-- 序號 -->
         <span style="font-size:9px;color:var(--gold);font-weight:700;min-width:12px;text-align:center;flex-shrink:0">${idx+1}</span>
         <!-- 圖標 -->
         <div style="width:20px;height:20px;border-radius:4px;background:rgba(0,0,0,0.5);border:1px solid rgba(240,192,64,0.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden">
           ${iconUrl ? `<img src="${iconUrl}" style="width:14px;height:14px;object-fit:contain;display:block"/>` : '<span style="font-size:10px;color:#555">?</span>'}
         </div>
         <!-- 下拉選擇 -->
         <select class="auto-item-select" data-idx="${idx}" style="flex:1;min-width:0;padding:2px 14px 2px 2px;font-size:9px;background:rgba(0,0,0,0.6);border:1px solid var(--gold-dark);border-radius:3px;color:var(--parchment-light);font-family:inherit;cursor:pointer">
           ${options}
         </select>
         <!-- 使用開關 -->
         <div style="display:flex;align-items:center;gap:2px;flex-shrink:0">
           <span style="font-size:8px;color:var(--parchment-dark)">用</span>
           <label class="toggle-switch" style="width:20px;height:11px;margin:0">
             <input type="checkbox" class="auto-use-toggle" data-idx="${idx}" ${slot.autoUse ? 'checked' : ''}>
             <span class="toggle-slider"></span>
           </label>
         </div>
         <!-- 購買開關 -->
         <div style="display:flex;align-items:center;gap:2px;flex-shrink:0">
           <span style="font-size:8px;color:var(--parchment-dark)">買</span>
           <label class="toggle-switch" style="width:20px;height:11px;margin:0">
             <input type="checkbox" class="auto-buy-toggle" data-idx="${idx}" ${slot.autoBuy ? 'checked' : ''}>
             <span class="toggle-slider"></span>
           </label>
         </div>
         <!-- 閾值（HP/MP 類顯示，buff 類顯示提示） -->
         ${needThreshold ? `
           <div style="display:flex;align-items:center;gap:2px;flex-shrink:0;min-width:52px">
             <input type="range" class="threshold-slider" data-idx="${idx}" min="10" max="90" value="${slot.threshold || 30}" style="width:32px;height:2px;accent-color:var(--gold);flex-shrink:0">
             <span class="threshold-val" data-idx="${idx}" style="font-size:8px;color:var(--gold-bright);min-width:18px;text-align:right">${slot.threshold || 30}%</span>
           </div>
         ` : (isBuff ? `
           <span style="font-size:7px;color:var(--parchment-dark);flex-shrink:0;max-width:42px;line-height:1.1">buff續用</span>
         ` : '')}
       </div>
     `;
  }).join('');
  // 綁定事件
  grid.querySelectorAll('.auto-item-select').forEach(sel => {
    sel.addEventListener('change', e => {
      const idx = parseInt(e.target.dataset.idx, 10);
      const newId = e.target.value;
      const catItem = AUTO_ITEMS_CATALOG.find(c => c.id === newId);
      // 更新當前欄位數據
      GS.autoItems[idx].itemId = newId;
      if (catItem && catItem.threshold) {
        // 若為HP/MP類，保留閾值（或預設）
        if (!GS.autoItems[idx].threshold) {
          GS.autoItems[idx].threshold = catItem.type === 'hp' ? 30 : 20;
        }
      } else {
        GS.autoItems[idx].threshold = 0;
      }
      // 重新渲染該欄位
      renderAutoItemsGrid();
    });
  });
  grid.querySelectorAll('.auto-use-toggle').forEach(tog => {
    tog.addEventListener('change', e => {
      const idx = parseInt(e.target.dataset.idx, 10);
      GS.autoItems[idx].autoUse = e.target.checked;
    });
  });
  grid.querySelectorAll('.auto-buy-toggle').forEach(tog => {
    tog.addEventListener('change', e => {
      const idx = parseInt(e.target.dataset.idx, 10);
      GS.autoItems[idx].autoBuy = e.target.checked;
    });
  });
  grid.querySelectorAll('.threshold-slider').forEach(sl => {
    sl.addEventListener('input', e => {
      const idx = parseInt(e.target.dataset.idx, 10);
      const val = parseInt(e.target.value, 10);
      GS.autoItems[idx].threshold = val;
      const valSpan = grid.querySelector(`.threshold-val[data-idx="${idx}"]`);
      if (valSpan) valSpan.textContent = val + '%';
    });
  });
}

// 保存自動道具配置（關閉面板時調用，主要為了日誌提示）
function saveAutoItemsConfig() {
  addLog('system', '自動道具配置已保存');
}

// 取得背包中某道具數量
function getItemCountInInventory(itemId) {
  if (!itemId) return 0;
  const it = GS.inventory.find(i => i.id === itemId);
  return it ? (it.count || 0) : 0;
}

// 打開快捷欄配置彈窗
let quickBarEditSlot = -1;
function openQuickBarPicker(slotIdx) {
  quickBarEditSlot = slotIdx;
  const cls = CLASSES[GS.player.classId];
  const skills = cls?.allSkills || [];
  const consumables = GS.inventory.filter(i => i.itemType === 'consumable' && i.count > 0);
  
  const current = GS.quickBar[slotIdx];
  const html = `
    <div class="quickbar-picker" id="quickbar-picker">
      <div class="quickbar-picker-header">
        <span>設定快捷栏 ${slotIdx + 1} 号格</span>
        <button class="qb-picker-close" id="qb-picker-close">✕</button>
      </div>
      <div class="qb-picker-section">
        <div class="qb-picker-title">技能</div>
        <div class="qb-picker-grid">
          ${skills.map((s, i) => {
            return `
            <div class="qb-picker-item ${current?.type === 'skill' && current.skillIndex === i ? 'selected' : ''}" data-qb-skill="${i}" title="${s.name}${s.desc ? ' - ' + s.desc : ''}">
              <div class="qb-picker-icon" style="${getSkillIconBgStyle(s)}"><div style="width:22px;height:22px">${getSkillSVG(s)}</div></div>
              <div class="qb-picker-name">${s.name}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="qb-picker-section">
        <div class="qb-picker-title">消耗品</div>
        <div class="qb-picker-grid">
          ${consumables.length === 0 ? '<div style="color:var(--parchment-dark);font-size:11px;padding:8px">暫無消耗品</div>' : consumables.map(item => {
            let iconUrl = ITEM_ICON_MAP.default;
            if (item.id && ITEM_ICONS[item.id]) iconUrl = ITEM_ICONS[item.id];
            else if (item.id?.includes('hp')) iconUrl = ITEM_ICON_MAP.potion_hp;
            else if (item.id?.includes('mp')) iconUrl = ITEM_ICON_MAP.potion_mp;
            else if (item.itemType === 'consumable') iconUrl = ITEM_ICON_MAP.potion_hp;
            else if (item.itemType === 'scroll') iconUrl = ITEM_ICON_MAP.scroll;
            else if (item.itemType === 'gem') iconUrl = ITEM_ICON_MAP.gem;
            return `
            <div class="qb-picker-item ${current?.type === 'item' && current.itemId === item.id ? 'selected' : ''}" data-qb-item="${item.id}" title="${item.name}">
              <div class="qb-picker-icon"><img src="${iconUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:4px"/></div>
              <div class="qb-picker-name">${item.name} ×${item.count}</div>
            </div>
          `;}).join('')}
        </div>
      </div>
      <div class="qb-picker-footer">
        <button class="qb-clear-btn" id="qb-clear-btn">清空該格</button>
      </div>
    </div>
  `;
  
  // 移除旧的
  const old = document.getElementById('quickbar-picker-overlay');
  if (old) old.remove();
  
  const overlay = document.createElement('div');
  overlay.id = 'quickbar-picker-overlay';
  overlay.className = 'qb-picker-overlay';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
  
  // 事件
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeQuickBarPicker();
  });
  overlay.querySelector('#qb-picker-close').addEventListener('click', closeQuickBarPicker);
  overlay.querySelectorAll('[data-qb-skill]').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.qbSkill);
      setQuickBarSlot(quickBarEditSlot, { type: 'skill', skillIndex: idx });
      closeQuickBarPicker();
    });
  });
  overlay.querySelectorAll('[data-qb-item]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.qbItem;
      setQuickBarSlot(quickBarEditSlot, { type: 'item', itemId: id });
      closeQuickBarPicker();
    });
  });
  overlay.querySelector('#qb-clear-btn').addEventListener('click', () => {
    setQuickBarSlot(quickBarEditSlot, null);
    closeQuickBarPicker();
  });
}

function closeQuickBarPicker() {
  const overlay = document.getElementById('quickbar-picker-overlay');
  if (overlay) overlay.remove();
  quickBarEditSlot = -1;
}

// 變身精灵图映射（类型key -> sprite，用于属性类型展示，全部指向战士8帧占位）
const TRANSFORM_SPRITES = {
  str: SPRITE.warrior,
  vit: SPRITE.paladin,
  agi: SPRITE.rogue,
  int: SPRITE.mage,
  luk: SPRITE.rogue,
};

// 獲取變身圖標（根據typeKey/spriteKey，優先用英雄/職業圖資）
function getTransformIcon(iconKey) {
  // 先按原始key找SPRITE，找不到再去掉t_前綴找，再找不到fallback戰士
  if (iconKey && SPRITE[iconKey]) return SPRITE[iconKey].idle;
  if (iconKey) {
    const key = iconKey.replace(/^t_/, '');
    if (SPRITE[key]) return SPRITE[key].idle;
  }
  return SPRITE.warrior.idle;
}

// ==================== 职业定义 ====================
const CLASSES = {
  warrior: {
    id: 'warrior', name: '戰士', desc: '高血量高防禦，重甲雙手武器，近戰物理', race: 'human',
    sprite: SPRITE.warrior, atkType: 'melee',
    baseStats: { atk: 18, def: 12, hpMax: 260, mpMax: 80, crit: 4, critDmg: 150 },
    allSkills: [
      { id: 'normal',   name: '普通攻擊', icon: '⚔️', cd: 0,    type: 'single', dmgMult: 1,    effect: 'slash', learnLevel: 1, category: 'basic' },
      { id: 'charge',   name: '衝鋒斬',   icon: '🗡️', cd: 5,    type: 'single', dmgMult: 1.8,  effect: 'slash', range: 100, desc: '衝向敵人造成180%傷害', learnLevel: 1, category: 'attack' },
      { id: 'whirl',    name: '旋風斬',   icon: '🌀', cd: 8,    type: 'aoe',    dmgMult: 1.2,  effect: 'whirlwind', aoeRadius: 50, desc: '周圍敵人受到120%傷害', learnLevel: 5, category: 'aoe' },
      { id: 'warcry',   name: '戰吼',     icon: '📣', cd: 20,   type: 'buff',   dmgMult: 0,    effect: 'holy', desc: '提升攻擊30%持續10秒', learnLevel: 10, category: 'buff' },
      { id: 'shield',   name: '盾擊',     icon: '🛡️', cd: 7,    type: 'single', dmgMult: 1.3,  effect: 'slash', desc: '盾牌猛擊造成130%傷害並眩暈1秒', learnLevel: 15, category: 'control' },
      { id: 'bash',     name: '致命一擊', icon: '💥', cd: 12,   type: 'single', dmgMult: 2.5,  effect: 'slash', desc: '造成250%暴擊傷害', learnLevel: 25, category: 'attack' },
      { id: 'stomp',    name: '震地擊',   icon: '💢', cd: 14,   type: 'aoe',    dmgMult: 1.5,  effect: 'whirlwind', aoeRadius: 60, desc: '震擊地面造成範圍傷害並減速', learnLevel: 35, category: 'aoe' },
      { id: 'rage',     name: '狂暴',     icon: '🔥', cd: 30,   type: 'buff',   dmgMult: 0,    effect: 'holy', desc: '攻擊+50%防禦-20%持續15秒', learnLevel: 50, category: 'buff' },
      { id: 'execute',  name: '斬殺',     icon: '⚔️', cd: 18,   type: 'single', dmgMult: 3,    effect: 'slash', desc: '目標血量低於30%時造成300%傷害', learnLevel: 65, category: 'attack' },
      { id: 'swordstorm', name: '劍刃風暴', icon: '🌪️', cd: 40, type: 'aoe',    dmgMult: 2,    effect: 'whirlwind', aoeRadius: 80, desc: '召喚劍刃風暴造成200%範圍傷害', learnLevel: 80, category: 'aoe' },
    ],
    skillBar: [0, 1, 2, 3, 4, 5, 6, 7],
    skillPoints: 0,
  },
  mage: {
    id: 'mage', name: '法師', desc: '高魔法低血量，法袍法杖，遠程魔法AOE', race: 'human',
    sprite: SPRITE.mage, atkType: 'ranged',
    baseStats: { atk: 22, def: 3, hpMax: 150, mpMax: 180, crit: 10, critDmg: 160 },
    allSkills: [
      { id: 'normal',   name: '魔彈術',   icon: '✦',  cd: 0,    type: 'single', dmgMult: 1,    effect: 'fireball', learnLevel: 1, category: 'basic' },
      { id: 'fireball', name: '火球術',   icon: '🔥', cd: 4,    type: 'single', dmgMult: 2,    effect: 'fireball', range: 140, desc: '發射火球造成200%傷害', learnLevel: 1, category: 'attack' },
      { id: 'iceSpear', name: '冰錐術',   icon: '❄️', cd: 6,    type: 'single', dmgMult: 1.6,  effect: 'slash', range: 130, desc: '冰錐刺穿敵人造成160%傷害並減速', learnLevel: 5, category: 'control' },
      { id: 'meteor',   name: '隕石術',   icon: '☄️', cd: 15,   type: 'aoe',    dmgMult: 2.5,  effect: 'meteor', aoeRadius: 60, desc: '天降隕石範圍250%傷害', learnLevel: 15, category: 'aoe' },
      { id: 'lightning',name: '閃電鏈',   icon: '⚡', cd: 7,    type: 'aoe',    dmgMult: 1.4,  effect: 'fireball', aoeRadius: 80, desc: '閃電鏈跳躍攻擊', learnLevel: 10, category: 'aoe' },
      { id: 'frostnova',name: '冰霜新星', icon: '🧊', cd: 10,   type: 'aoe',    dmgMult: 1.2,  effect: 'slash', aoeRadius: 65, desc: '周圍敵人凍結並受到120%傷害', learnLevel: 25, category: 'control' },
      { id: 'manashield',name:'魔法護盾', icon: '🔮', cd: 20,   type: 'buff',   dmgMult: 0,    effect: 'holy', desc: '吸收30%傷害持續10秒', learnLevel: 20, category: 'buff' },
      { id: 'firestorm',name: '烈焰風暴', icon: '🌋', cd: 25,   type: 'aoe',    dmgMult: 1.8,  effect: 'meteor', aoeRadius: 70, desc: '召喚烈焰風暴持續燃燒', learnLevel: 40, category: 'aoe' },
      { id: 'polymorph',name: '變形術',   icon: '🐸', cd: 18,   type: 'control',dmgMult: 0.5,  effect: 'fireball', desc: '變形敵人3秒並造成少量傷害', learnLevel: 55, category: 'control' },
      { id: 'arcane',   name: '奧術爆發', icon: '💠', cd: 35,   type: 'single', dmgMult: 3.5,  effect: 'fireball', desc: '積蓄奧術能量造成350%傷害', learnLevel: 80, category: 'attack' },
    ],
    skillBar: [0, 1, 2, 3, 4, 5, 6, 7],
    skillPoints: 0,
  },
  archer: {
    id: 'archer', name: '弓箭手', desc: '高敏捷高暴擊，皮甲弓箭，遠程物理', race: 'elf',
    sprite: SPRITE.archer, atkType: 'ranged',
    baseStats: { atk: 18, def: 5, hpMax: 180, mpMax: 100, crit: 18, critDmg: 170 },
    allSkills: [
      { id: 'normal',   name: '普通射擊', icon: '🏹', cd: 0,    type: 'single', dmgMult: 1,    effect: 'arrow', learnLevel: 1, category: 'basic' },
      { id: 'multi',    name: '多重射擊', icon: '🎯', cd: 5,    type: 'multi',  dmgMult: 0.7,  effect: 'arrow', range: 150, count: 3, desc: '射出3箭各造成70%傷害', learnLevel: 1, category: 'attack' },
      { id: 'pierce',   name: '穿透箭',   icon: '➳',  cd: 7,    type: 'single', dmgMult: 1.8,  effect: 'arrow', range: 180, desc: '強力一擊造成180%傷害', learnLevel: 5, category: 'attack' },
      { id: 'arrowRain',name: '箭雨',     icon: '🌧️', cd: 14,   type: 'aoe',    dmgMult: 1.4,  effect: 'arrow', aoeRadius: 55, desc: '箭雨覆蓋區域140%傷害', learnLevel: 15, category: 'aoe' },
      { id: 'trap',     name: '陷阱',     icon: '🕸️', cd: 10,   type: 'control',dmgMult: 1,    effect: 'arrow', desc: '設置陷阱定身敵人2秒', learnLevel: 10, category: 'control' },
      { id: 'concshot', name: '震盪射擊', icon: '💫', cd: 8,    type: 'single', dmgMult: 1.2,  effect: 'arrow', range: 130, desc: '擊退並造成120%傷害', learnLevel: 20, category: 'control' },
      { id: 'critical', name: '致命瞄準', icon: '🎯', cd: 18,   type: 'buff',   dmgMult: 0,    effect: 'arrow', desc: '下次攻擊必定暴擊,暴傷+100%', learnLevel: 30, category: 'buff' },
      { id: 'rapid',    name: '急速射擊', icon: '💨', cd: 25,   type: 'buff',   dmgMult: 0,    effect: 'arrow', desc: '攻速+80%持續8秒', learnLevel: 45, category: 'buff' },
      { id: 'eagle',    name: '鷹眼',     icon: '🦅', cd: 30,   type: 'single', dmgMult: 3,    effect: 'arrow', range: 200, desc: '遠距離狙擊造成300%傷害', learnLevel: 65, category: 'attack' },
      { id: 'volley',   name: '箭雨連天', icon: '🏹', cd: 40,   type: 'aoe',    dmgMult: 2.2,  effect: 'arrow', aoeRadius: 70, desc: '萬箭齊發造成220%範圍傷害', learnLevel: 80, category: 'aoe' },
    ],
    skillBar: [0, 1, 2, 3, 4, 5, 6, 7],
    skillPoints: 0,
  },
  rogue: {
    id: 'rogue', name: '盜賊', desc: '高攻速高閃避，輕甲雙持匕首，近戰爆發', race: 'elf',
    sprite: SPRITE.rogue, atkType: 'melee',
    baseStats: { atk: 20, def: 4, hpMax: 160, mpMax: 90, crit: 22, critDmg: 180 },
    allSkills: [
      { id: 'normal',   name: '普通攻擊', icon: '🗡️', cd: 0,    type: 'single', dmgMult: 1,    effect: 'slash', learnLevel: 1, category: 'basic' },
      { id: 'shadow',   name: '暗影突襲', icon: '👤', cd: 5,    type: 'single', dmgMult: 1.9,  effect: 'shadow', range: 100, desc: '暗影位移並造成190%傷害', learnLevel: 1, category: 'attack' },
      { id: 'poison',   name: '毒刃',     icon: '☠️', cd: 8,    type: 'dot',    dmgMult: 0.8,  effect: 'shadow', desc: '毒素持續8秒傷害', learnLevel: 5, category: 'attack' },
      { id: 'dodge',    name: '迴避',     icon: '💨', cd: 18,   type: 'buff',   dmgMult: 0,    effect: 'shadow', desc: '3秒內閃避所有攻擊', learnLevel: 15, category: 'buff' },
      { id: 'backstab', name: '背刺',     icon: '🔪', cd: 10,   type: 'single', dmgMult: 2.2,  effect: 'slash', desc: '背後攻擊造成220%傷害必定暴擊', learnLevel: 10, category: 'attack' },
      { id: 'vanish',   name: '消失',     icon: '👻', cd: 25,   type: 'buff',   dmgMult: 0,    effect: 'shadow', desc: '隱身5秒並恢復15%生命', learnLevel: 25, category: 'buff' },
      { id: 'cripple',  name: '致殘',     icon: '🦵', cd: 12,   type: 'control',dmgMult: 1.1,  effect: 'slash', desc: '致殘敵人降低移動速度60%', learnLevel: 20, category: 'control' },
      { id: 'envenom',  name: '劇毒',     icon: '☠️', cd: 20,   type: 'dot',    dmgMult: 1.5,  effect: 'shadow', desc: '劇毒持續10秒高傷害', learnLevel: 40, category: 'attack' },
      { id: 'assassinate',name:'暗殺',   icon: '💀', cd: 35,   type: 'single', dmgMult: 4,    effect: 'shadow', desc: '致命一擊造成400%傷害', learnLevel: 65, category: 'attack' },
      { id: 'dance',    name: '刀刃之舞', icon: '💫', cd: 30,   type: 'aoe',    dmgMult: 2,    effect: 'slash', aoeRadius: 60, desc: '刀刃狂舞造成200%範圍傷害', learnLevel: 80, category: 'aoe' },
    ],
    skillBar: [0, 1, 2, 3, 4, 5, 6, 7],
    skillPoints: 0,
  },
  paladin: {
    id: 'paladin', name: '聖騎士', desc: '均衡型，鎧甲盾牌+單手錘，近戰+治療', race: 'human',
    sprite: SPRITE.paladin, atkType: 'melee',
    baseStats: { atk: 15, def: 10, hpMax: 240, mpMax: 120, crit: 5, critDmg: 145 },
    allSkills: [
      { id: 'normal',   name: '神聖擊',   icon: '✨', cd: 0,    type: 'single', dmgMult: 1,    effect: 'holy', learnLevel: 1, category: 'basic' },
      { id: 'holyhit',  name: '制裁',     icon: '🔨', cd: 5,    type: 'single', dmgMult: 1.7,  effect: 'holy', range: 80, desc: '神聖之力造成170%傷害', learnLevel: 1, category: 'attack' },
      { id: 'heal',     name: '治療光環', icon: '💚', cd: 10,   type: 'heal',   healAmt: 0.3, effect: 'heal', desc: '恢復30%最大生命', learnLevel: 5, category: 'heal' },
      { id: 'shield',   name: '聖盾',     icon: '🛡️', cd: 25,   type: 'buff',   dmgMult: 0,    effect: 'holy', desc: '8秒內減傷50%', learnLevel: 10, category: 'buff' },
      { id: 'judgment', name: '神聖審判', icon: '⚖️', cd: 12,   type: 'single', dmgMult: 2,    effect: 'holy', desc: '審判敵人造成200%神聖傷害', learnLevel: 15, category: 'attack' },
      { id: 'holylight',name: '聖光',     icon: '💛', cd: 18,   type: 'heal',   healAmt: 0.5, effect: 'heal', desc: '聖光恢復50%最大生命', learnLevel: 25, category: 'heal' },
      { id: 'avenger',  name: '復仇者之盾', icon: '🛡️', cd: 15, type: 'aoe',    dmgMult: 1.3,  effect: 'holy', aoeRadius: 50, desc: '復仇之盾彈射攻擊周圍敵人', learnLevel: 20, category: 'aoe' },
      { id: 'consecrate',name:'奉獻',    icon: '🔆', cd: 20,   type: 'aoe',    dmgMult: 1.1,  effect: 'holy', aoeRadius: 60, desc: '神聖領域持續傷害敵人', learnLevel: 35, category: 'aoe' },
      { id: 'guardian', name: '守護祝福', icon: '👼', cd: 30,   type: 'buff',   dmgMult: 0,    effect: 'holy', desc: '防禦+50%生命+30%持續12秒', learnLevel: 55, category: 'buff' },
      { id: 'holywrath',name: '神聖憤怒', icon: '☀️', cd: 40,   type: 'aoe',    dmgMult: 2.5,  effect: 'holy', aoeRadius: 80, desc: '神聖憤怒降臨造成250%範圍傷害', learnLevel: 80, category: 'aoe' },
    ],
    skillBar: [0, 1, 2, 3, 4, 5, 6, 7],
    skillPoints: 0,
  },
  warlock: {
    id: 'warlock', name: '術士', desc: '持續傷害，暗袍魔法書，遠程暗影魔法', race: 'undead',
    sprite: SPRITE.warlock, atkType: 'ranged',
    baseStats: { atk: 19, def: 4, hpMax: 170, mpMax: 150, crit: 7, critDmg: 155 },
    allSkills: [
      { id: 'normal',   name: '暗影箭',   icon: '🌑', cd: 0,    type: 'single', dmgMult: 1,    effect: 'shadow', learnLevel: 1, category: 'basic' },
      { id: 'corrupt',  name: '腐蝕術',   icon: '🦠', cd: 6,    type: 'dot',    dmgMult: 0.6,  effect: 'shadow', duration: 10, desc: '持續10秒腐蝕傷害', learnLevel: 1, category: 'attack' },
      { id: 'drain',    name: '生命汲取', icon: '🩸', cd: 8,    type: 'drain',  dmgMult: 1.5,  effect: 'shadow', range: 120, desc: '造成傷害並回復生命', learnLevel: 5, category: 'attack' },
      { id: 'summon',   name: '召喚惡魔', icon: '👹', cd: 30,   type: 'summon', dmgMult: 0,    effect: 'shadow', desc: '召喚惡魔助戰20秒', learnLevel: 10, category: 'summon' },
      { id: 'curse',    name: '詛咒',     icon: '💀', cd: 10,   type: 'debuff', dmgMult: 0,    effect: 'shadow', desc: '降低敵人防禦30%持續8秒', learnLevel: 15, category: 'control' },
      { id: 'siphon',   name: '靈魂吸取', icon: '👻', cd: 12,   type: 'drain',  dmgMult: 2,    effect: 'shadow', range: 110, desc: '吸取靈魂造成200%傷害並回復', learnLevel: 20, category: 'attack' },
      { id: 'bane',     name: '劇毒災禍', icon: '☠️', cd: 18,   type: 'dot',    dmgMult: 1,    effect: 'shadow', duration: 15, desc: '劇毒災禍持續15秒傷害', learnLevel: 30, category: 'attack' },
      { id: 'darkglow', name: '暗影爆發', icon: '🌑', cd: 22,   type: 'aoe',    dmgMult: 1.6,  effect: 'shadow', aoeRadius: 60, desc: '暗影能量爆發造成範圍傷害', learnLevel: 40, category: 'aoe' },
      { id: 'sacrifice',name: '黑暗獻祭', icon: '🕯️', cd: 30,   type: 'buff',   dmgMult: 0,    effect: 'shadow', desc: '消耗20%生命換取60%攻擊持續15秒', learnLevel: 55, category: 'buff' },
      { id: 'infernal', name: '地獄火',   icon: '😈', cd: 45,   type: 'aoe',    dmgMult: 2.8,  effect: 'meteor', aoeRadius: 70, desc: '召喚地獄火砸向敵人造成280%傷害', learnLevel: 80, category: 'aoe' },
    ],
    skillBar: [0, 1, 2, 3, 4, 5, 6, 7],
    skillPoints: 0,
  },
};

// ==================== 地圖 ====================
const MAP_BG_VILLAGE  = '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkq57bnqcoi_ve_miaoda';
const MAP_BG_ELF      = '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkq6dgpaoci_ve_miaoda';
const MAP_BG_SWAMP    = '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkq6ivjsmio_ve_miaoda';
const MAP_BG_DARKFOREST = '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkq6irizcgg_ve_miaoda';
const MAP_BG_DEADDESERT = '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkq6e5eqgcq_ve_miaoda';
const MAP_BG_VOLCANO    = '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkq6mpmrkki_ve_miaoda';
const MAP_BG_SIEGE    = '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkq54xbzcgo_ve_miaoda';

// 技能图标精灵图（两套）
// Sheet1: 4列×4行 = 战士(4) + 法师(4) + 弓箭手(4) + 盗贼(4)
const SKILL_ICON_SHEET1 = '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkq6q6wywgq_ve_miaoda';
// Sheet2: 4列×2行 = 圣骑(4) + 术士(4)
const SKILL_ICON_SHEET2 = '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkq6rungqhi_ve_miaoda';

// 技能类型 → 图标 [sheet, row, col]
// Sheet1 (4列×4行): row0=战士系, row1=法师系, row2=弓箭手系, row3=盗贼系
// Sheet2 (4列×2行): row0=圣骑系, row1=术士系
const SKILL_ICON_MAP = {
  // ===== 战士 row0 (剑击/巨斧/盾/战吼) =====
  slash:      [0, 0, 0],
  charge:     [0, 0, 0],
  execute:    [0, 0, 0],
  bash:       [0, 0, 0],
  normal:     [0, 0, 0],
  basic:      [0, 0, 0],
  single:     [0, 0, 0],
  attack:     [0, 0, 0],
  axe:        [0, 0, 1],
  whirl:      [0, 0, 1],
  swordstorm: [0, 0, 1],
  aoe:        [0, 0, 1],
  shield:     [0, 0, 2],
  stomp:      [0, 0, 2],
  warcry:     [0, 0, 3],
  rage:       [0, 0, 3],
  buff:       [0, 0, 3],
  focus:      [0, 0, 3],
  buffAtk:    [0, 0, 3],

  // ===== 法师 row1 (火球/冰锥/闪电/奥术) =====
  fireball:   [0, 1, 0],
  firestorm:  [0, 1, 0],
  meteor:     [0, 1, 3],
  ice:        [0, 1, 1],
  iceSpear:   [0, 1, 1],
  frostnova:  [0, 1, 1],
  polymorph:  [0, 1, 1],
  lightning:  [0, 1, 2],
  thunder:    [0, 1, 2],
  manashield: [0, 1, 2],
  arcane:     [0, 1, 3],
  control:    [0, 1, 1],

  // ===== 弓箭手 row2 (箭矢/多重/箭雨/陷阱) =====
  arrow:      [0, 2, 0],
  pierce:     [0, 2, 0],
  concshot:   [0, 2, 0],
  critical:   [0, 2, 0],
  multi:      [0, 2, 1],
  arrowRain:  [0, 2, 2],
  trap:       [0, 2, 3],

  // ===== 盗贼 row3 (匕首/暗影/毒/閃避) =====
  dagger:     [0, 3, 0],
  backstab:   [0, 3, 0],
  shadow:     [0, 3, 1],
  stealth:    [0, 3, 1],
  poison:     [0, 3, 2],
  dot:        [0, 3, 2],
  curse:      [0, 3, 2],
  drain:      [0, 3, 3],
  dodge:      [0, 3, 3],
  evasion:    [0, 3, 3],

  // ===== 圣骑 sheet2 row0 (圣光/圣盾/治疗/审判) =====
  // 4个图标：col0=圣光(十字光), col1=圣盾, col2=治疗/爱心, col3=审判/锤
  holy:       [1, 0, 0],
  holylight:  [1, 0, 0],   // 圣光治疗 - 光
  bless:      [1, 0, 0],   // 祝福 - 光
  holyhit:    [1, 0, 3],   // 制裁（神圣打击）- 审判锤
  holyshield: [1, 0, 1],   // 圣盾 - 盾
  shield_pal: [1, 0, 1],
  heal:       [1, 0, 2],   // 治疗 - 爱心/十字
  healAmt:    [1, 0, 2],
  judgment:   [1, 0, 3],   // 审判 - 锤
  hammer:     [1, 0, 3],
  avenger:    [1, 0, 1],   // 复仇者之盾 - 盾
  consecrate: [1, 0, 0],   // 奉献 - 光
  guardian:   [1, 0, 1],   // 守護祝福 - 盾
  holywrath:  [1, 0, 3],   // 神圣愤怒 - 锤
  stun:       [1, 0, 3],

  // ===== 术士 sheet2 row1 (骷髅/毒雾/献祭/召喚) =====
  summon:     [1, 1, 3],
  summonSkel: [1, 1, 3],
  summonDemon:[1, 1, 3],
  skeleton:   [1, 1, 0],
  deathknight:[1, 1, 0],
  corrupt:    [1, 1, 1],   // 腐蚀术 - 毒雾
  poisonfog:  [1, 1, 1],
  plague:     [1, 1, 1],
  bane:       [1, 1, 1],   // 剧毒灾祸 - 毒雾
  sacrifice:  [1, 1, 2],   // 黑暗献祭 - 献祭
  offering:   [1, 1, 2],
  siphon:     [1, 1, 0],   // 灵魂吸取 - 骷髅
  darkglow:   [1, 1, 3],   // 暗影爆发 - 召喚/恶魔
  infernal:   [1, 1, 3],   // 地狱火 - 恶魔
};

// 根据技能和职业获取图标 [sheet, row, col]
function getSkillIconPos(skill) {
  if (!skill) return [0, 0, 0];
  // 按优先级：skill.id > skill.category > skill.effect > skill.type
  const keys = [skill.id, skill.effect, skill.category, skill.type];
  for (const k of keys) {
    if (k && SKILL_ICON_MAP[k]) return SKILL_ICON_MAP[k];
  }
  return [0, 0, 0];
}

// 技能SVG图标库（暗黑风格，stroke + fill混合）
const SKILL_SVG_MAP = {
  // 通用
  slash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/></svg>`,
  fire: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2s4 4 4 8a4 4 0 01-8 0c0-2 1-3 1-3s-3 3-3 6a6 6 0 0012 0c0-5-6-11-6-11z"/></svg>`,
  ice: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19M7 3l3 3M17 3l-3 3M7 21l3-3M17 21l-3-3M3 7l3 3M3 17l3-3M21 7l-3 3M21 17l-3-3"/></svg>`,
  lightning: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>`,
  poison: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c3 4 5 7 5 11a5 5 0 01-10 0c0-4 2-7 5-11z"/><circle cx="9" cy="14" r="1.2" fill="currentColor"/><circle cx="14" cy="16" r="1" fill="currentColor"/></svg>`,
  holy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>`,
  dark: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>`,
  heal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 10-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z"/></svg>`,
  buff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M8 7h9v9"/><path d="M17 7L7 17"/></svg>`,
  dagger: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l4 4-9 9-3 3-3-3 3-3 9-9z"/><path d="M17 7l3-3M6 18l3 3"/></svg>`,
  summon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>`,
  whirlwind: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8a7 7 0 0114 0M4 14a6 6 0 0112 0M7 20a4 4 0 0110 0"/></svg>`,
  meteor: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="18" r="3"/><path d="M14 4l8 8-8 8-8-8 8-8z" opacity="0.3"/><path d="M22 2l-6 6"/></svg>`,
  debuff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>`,
  stun: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"><path d="M12 2l2.4 6.4L21 10l-5.4 3.2L18 20l-6-3.6L6 20l2.4-6.8L3 10l6.6-1.6L12 2z"/></svg>`,
  dash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  magic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4v6M12 7h6"/><circle cx="12" cy="16" r="6"/><circle cx="12" cy="16" r="2.5" fill="currentColor"/></svg>`,
  crit: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"><polygon points="12,2 15,9 22,9 16,14 18,21 12,17 6,21 8,14 2,9 9,9"/></svg>`,
  potion_hp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6v4H9z"/><path d="M10 6v2h4V6"/><path d="M7 8h10v12a4 4 0 01-4 4h-2a4 4 0 01-4-4V8z"/><path d="M7 14h10" style="opacity:0.3"/></svg>`,
  potion_mp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6v4H9z"/><path d="M10 6v2h4V6"/><path d="M7 8h10v12a4 4 0 01-4 4h-2a4 4 0 01-4-4V8z"/><path d="M10 18l3-4 3 2 3-3" style="opacity:0.5"/></svg>`,
  scroll: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h14l2 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V5z"/><path d="M4 5l2-2h12l2 2"/><path d="M7 10h10M7 14h6"/></svg>`,
  gem: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l9 8-9 12L3 10z"/><path d="M3 10h18"/><path d="M12 2v8"/></svg>`,
  coin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 9h8M8 12h8M8 15h6"/></svg>`,
  default: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v.01M12 16v.01"/></svg>`,
};

// 暗黑天堂W 風格技能圖標圖片（替代SVG/emoji）
const SKILL_IMG_MAP = {
  slash:       '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrevfed6ai_ve_miaoda',
  fire:        '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrevfed6ai_ve_miaoda',
  ice:         '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreufq2oai_ve_miaoda',
  lightning:   '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreufq2oai_ve_miaoda',
  poison:      '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrevrqimio_ve_miaoda',
  holy:        '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkres45tybi_ve_miaoda',
  dark:        '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreozwbsdq_ve_miaoda',
  heal:        '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkres45tybi_ve_miaoda',
  shield:      '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkres45tybi_ve_miaoda',
  arrow:       '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrevrqimio_ve_miaoda',
  dagger:      '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrewoxxoeq_ve_miaoda',
  dash:        '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrewoxxoeq_ve_miaoda',
  summon:      '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreozwbsdq_ve_miaoda',
  whirlwind:   '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrevfed6ai_ve_miaoda',
  meteor:      '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreufq2oai_ve_miaoda',
  buff:        '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkres45tybi_ve_miaoda',
  debuff:      '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreozwbsdq_ve_miaoda',
  stun:        '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrevfed6ai_ve_miaoda',
  magic:       '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreufq2oai_ve_miaoda',
  crit:        '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrevfed6ai_ve_miaoda',
  default:     '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrevfed6ai_ve_miaoda',
};

// 技能图标映射（按id > effect > element > category > type优先级）
const SKILL_ICON_KEY_MAP = {
  slash: 'slash', power_strike: 'slash', heavy_strike: 'slash',
  fireball: 'fire', meteor: 'fire', fire_blast: 'fire',
  ice_lance: 'ice', frost_nova: 'ice', blizzard: 'ice',
  lightning: 'lightning', chain_lightning: 'lightning', thunder_strike: 'lightning',
  poison_arrow: 'poison', deadly_poison: 'poison', poison_blade: 'poison',
  holy_smite: 'holy', judgment: 'holy', divine_shield: 'shield', healing_light: 'heal',
  shadow_bolt: 'dark', life_drain: 'dark', dark_curse: 'debuff',
  summon_skeleton: 'summon', summon_demon: 'summon',
  arrow_shot: 'arrow', multi_shot: 'arrow', piercing: 'arrow',
  backstab: 'dagger', shadow_step: 'dash', evasion: 'dash',
  whirlwind: 'whirlwind', shield_bash: 'shield',
  heal: 'heal', buff: 'buff', debuff: 'debuff', stun: 'stun',
  // 按元素
  fire: 'fire', ice: 'ice', lightning: 'lightning', poison: 'poison',
  holy: 'holy', dark: 'dark', physical: 'slash',
  // 按类型
  melee: 'slash', magic: 'magic', ranged: 'arrow', support: 'heal',
  single: 'slash', multi: 'arrow', aoe: 'whirlwind',
  summon: 'summon', buff: 'buff', heal: 'heal',
};

const SKILL_BG_MAP = {
  slash: 'linear-gradient(135deg, #8b4513, #cd853f)',
  fire: 'linear-gradient(135deg, #cc2200, #ff8844)',
  ice: 'linear-gradient(135deg, #2266cc, #88ccff)',
  lightning: 'linear-gradient(135deg, #ccaa00, #ffee66)',
  poison: 'linear-gradient(135deg, #226622, #66aa44)',
  holy: 'linear-gradient(135deg, #ccaa44, #ffee99)',
  dark: 'linear-gradient(135deg, #442266, #8866cc)',
  physical: 'linear-gradient(135deg, #8b4513, #cd853f)',
  magic: 'linear-gradient(135deg, #4422cc, #8866ff)',
  ranged: 'linear-gradient(135deg, #228844, #66cc88)',
  support: 'linear-gradient(135deg, #6688cc, #aaccff)',
};
function getSkillIconBgStyle(skill) {
  if (!skill) return 'background:#1a120a;';
  const key = SKILL_ICON_KEY_MAP[skill.id] || SKILL_ICON_KEY_MAP[skill.effect] || SKILL_ICON_KEY_MAP[skill.element] || SKILL_ICON_KEY_MAP[skill.category] || SKILL_ICON_KEY_MAP[skill.type] || 'slash';
  const img = SKILL_IMG_MAP[key] || SKILL_IMG_MAP.default;
  return `background-image:url(${img});background-size:cover;background-position:center;background-color:#1a120a;--icon-key:"${key}";`;
}
function getSkillIconHTML(skill, size = 32) {
  const style = getSkillIconBgStyle(skill);
  return `<div style="width:${size}px;height:${size}px;border-radius:4px;${style}"></div>`;
}

// 取技能圖標圖片（替代原SVG圖標）
function getSkillSVG(skill) {
  // 回傳一個 <img> 標籤形式的字符串，保持外部調用不變
  const key = skill ? (SKILL_ICON_KEY_MAP[skill.id] || SKILL_ICON_KEY_MAP[skill.effect] || SKILL_ICON_KEY_MAP[skill.element] || SKILL_ICON_KEY_MAP[skill.category] || SKILL_ICON_KEY_MAP[skill.type] || 'slash') : 'slash';
  const img = SKILL_IMG_MAP[key] || SKILL_IMG_MAP.default;
  return `<img src="${img}" style="width:100%;height:100%;object-fit:cover;display:block" alt="skill"/>`;
}

// 世界尺寸（匹配背景图尺寸，确保摄像机滚动範圍内都有内容）
const WORLD_W = 2496;
const WORLD_H = 1664;

const SAFE_MAPS = {
  village: {
    id: 'village', name: '古魯丁村莊', type: 'safe', level: 1,
    bg: MAP_BG_VILLAGE,
    npcs: [
      { id: 'blacksmith', name: '鐵匠',       x: 200, y: 680, icon: '⚒️' },
      { id: 'shop',       name: '雜貨商人',   x: 480, y: 640, icon: '🏪' },
      { id: 'warehouse',  name: '倉庫管理員', x: 340, y: 820, icon: '📦' },
      { id: 'inn',        name: '旅館老闆娘', x: 620, y: 760, icon: '🏨' },
      { id: 'bulletin',   name: '佈告欄',     x: 780, y: 660, icon: '📋' },
      { id: 'quest',      name: '任務官',     x: 920, y: 720, icon: '📜', quest: true },
      { id: 'dungeon_master', name: '副本管理員', x: 1120, y: 760, icon: '🗝️' },
      { id: 'premium_shop',   name: '高級商人', x: 1000, y: 860, icon: '💎' },
      { id: 'main_quest', name: '大祭司',     x: 700, y: 880, icon: '👑', quest: true, mainQuest: true },
    ],
    nearField: 'gludin_field', castle: 'gludio',
  },
  forest_village: {
    id: 'forest_village', name: '精靈村莊', type: 'safe', level: 5,
    bg: MAP_BG_ELF,
    npcs: [
      { id: 'shop',       name: '雜貨商人',   x: 230, y: 660, icon: '🏪' },
      { id: 'blacksmith', name: '精靈鐵匠',   x: 1000, y: 700, icon: '⚒️' },
      { id: 'warehouse',  name: '倉庫管理員', x: 380, y: 840, icon: '📦' },
      { id: 'inn',        name: '樹屋旅館',   x: 560, y: 720, icon: '🏨' },
      { id: 'bulletin',   name: '佈告欄',     x: 700, y: 660, icon: '📋' },
      { id: 'quest',      name: '精靈長老',   x: 850, y: 780, icon: '🧙', quest: true },
      { id: 'dungeon_master', name: '森林嚮導', x: 1120, y: 840, icon: '🗝️' },
      { id: 'premium_shop',   name: '高級商人', x: 940, y: 880, icon: '💎' },
      { id: 'main_quest', name: '長老議員',   x: 660, y: 900, icon: '🌳', quest: true, mainQuest: true },
    ],
    nearField: 'dark_forest', castle: 'oren',
  },
  graveyard_village: {
    id: 'graveyard_village', name: '亡者驿站', type: 'safe', level: 15,
    bg: MAP_BG_DARKFOREST,
    npcs: [
      { id: 'shop',       name: '補給商人',   x: 240, y: 720, icon: '🏪' },
      { id: 'blacksmith', name: '鐵匠',       x: 980, y: 720, icon: '⚒️' },
      { id: 'warehouse',  name: '倉庫管理員', x: 420, y: 860, icon: '📦' },
      { id: 'inn',        name: '破舊旅館',   x: 580, y: 780, icon: '🏨' },
      { id: 'bulletin',   name: '佈告欄',     x: 740, y: 700, icon: '📋' },
      { id: 'quest',      name: '守墓人',     x: 860, y: 820, icon: '⚰️', quest: true },
      { id: 'dungeon_master', name: '墓地守護者', x: 1100, y: 880, icon: '🗝️' },
      { id: 'premium_shop',   name: '高級商人', x: 1020, y: 740, icon: '💎' },
      { id: 'main_quest', name: '亡靈法師',   x: 520, y: 700, icon: '💀', quest: true, mainQuest: true },
    ],
    nearField: 'graveyard', castle: 'dion',
  },
  desert_village: {
    id: 'desert_village', name: '沙漠绿洲', type: 'safe', level: 30,
    bg: MAP_BG_DEADDESERT,
    npcs: [
      { id: 'shop',       name: '沙漠商人',   x: 260, y: 740, icon: '🏪' },
      { id: 'blacksmith', name: '鐵匠',       x: 960, y: 700, icon: '⚒️' },
      { id: 'warehouse',  name: '駱駝管理員', x: 440, y: 860, icon: '📦' },
      { id: 'inn',        name: '綠洲旅館',   x: 600, y: 780, icon: '🏨' },
      { id: 'bulletin',   name: '佈告欄',     x: 750, y: 720, icon: '📋' },
      { id: 'quest',      name: '商隊隊長',   x: 880, y: 840, icon: '🐪', quest: true },
      { id: 'dungeon_master', name: '副本管理員', x: 1120, y: 780, icon: '🗝️' },
      { id: 'premium_shop',   name: '高級珠寶商', x: 1040, y: 880, icon: '💎' },
      { id: 'main_quest', name: '沙漠先知',   x: 560, y: 900, icon: '🔮', quest: true, mainQuest: true },
    ],
    nearField: 'red_desert', castle: 'giran',
  },
  cave_village: {
    id: 'cave_village', name: '洞窟前哨', type: 'safe', level: 50,
    bg: MAP_BG_DARKFOREST,
    npcs: [
      { id: 'shop',       name: '補給官',     x: 220, y: 720, icon: '🏪' },
      { id: 'blacksmith', name: '鐵匠',       x: 980, y: 740, icon: '⚒️' },
      { id: 'warehouse',  name: '倉庫管理員', x: 400, y: 860, icon: '📦' },
      { id: 'inn',        name: '前哨營地',   x: 540, y: 760, icon: '🏨' },
      { id: 'bulletin',   name: '佈告欄',     x: 700, y: 700, icon: '📋' },
      { id: 'quest',      name: '冒險團長',   x: 820, y: 820, icon: '⚔️', quest: true },
      { id: 'dungeon_master', name: '洞窟導遊', x: 1100, y: 840, icon: '🗝️' },
      { id: 'premium_shop',   name: '高級裝備商', x: 960, y: 880, icon: '💎' },
      { id: 'main_quest', name: '遠古守護者', x: 640, y: 900, icon: '🗿', quest: true, mainQuest: true },
    ],
    nearField: 'dark_cave', castle: 'aden',
  },
};

const BATTLE_MAPS = {
  gludin_field: {
    id: 'gludin_field', name: '古魯丁野外', type: 'battle',
    bg: MAP_BG_SWAMP,
    levelMin: 1, levelMax: 5, nearVillage: 'village', castle: 'gludio',
    monsters: [
      { type: 'goblin', name: '哥布林', level: 3, count: 10 },
      { type: 'goblin', name: '哥布林弓手', level: 5, count: 8 },
      { type: 'skeleton', name: '小骷髏兵', level: 4, count: 8 },
      { type: 'orc', name: '哥布林巡邏兵', level: 6, count: 5 },
    ],
    boss: { type: 'orc', name: '哥布林王', level: 10, hpMult: 8, atkMult: 2, respawn: 1800, x: 1800, y: 600, tier: 'normal' },
  },
  dark_forest: {
    id: 'dark_forest', name: '暗黑森林', type: 'battle',
    bg: MAP_BG_DARKFOREST,
    levelMin: 5, levelMax: 15, nearVillage: 'forest_village', castle: 'oren',
    monsters: [
      { type: 'goblin', name: '森林哥布林', level: 8, count: 8 },
      { type: 'skeleton', name: '枯木骷髏', level: 12, count: 8 },
      { type: 'bat', name: '森林蝙蝠', level: 10, count: 7 },
      { type: 'orc', name: '小树精', level: 14, count: 6 },
      { type: 'goblin', name: '森林哥布林長', level: 11, count: 4 },
    ],
    boss: { type: 'orc', name: '森林巨魔', level: 20, hpMult: 10, atkMult: 2.5, respawn: 1800, x: 1900, y: 700, tier: 'normal' },
  },
  graveyard: {
    id: 'graveyard', name: '亡者墓地', type: 'battle',
    bg: MAP_BG_SWAMP,
    levelMin: 15, levelMax: 30, nearVillage: 'graveyard_village', castle: 'dion',
    monsters: [
      { type: 'skeleton', name: '骷髏弓手', level: 20, count: 8 },
      { type: 'orc', name: '食尸鬼', level: 25, count: 7 },
      { type: 'skeleton', name: '亡灵骑士', level: 28, count: 6 },
      { type: 'bat', name: '幽灵蝙蝠', level: 22, count: 7 },
      { type: 'orc', name: '食屍鬼王', level: 30, count: 4 },
    ],
    boss: { type: 'skeleton', name: '死亡领主', level: 35, hpMult: 12, atkMult: 3, respawn: 2700, x: 1850, y: 650, tier: 'normal' },
  },
  red_desert: {
    id: 'red_desert', name: '赤焰沙漠', type: 'battle',
    bg: MAP_BG_DEADDESERT,
    levelMin: 30, levelMax: 50, nearVillage: 'desert_village', castle: 'giran',
    monsters: [
      { type: 'orc', name: '兽人戰士', level: 35, count: 8 },
      { type: 'scorpion', name: '沙漠蝎', level: 32, count: 7 },
      { type: 'orc', name: '兽人队長', level: 40, count: 6 },
      { type: 'scorpion', name: '毒蝎王', level: 45, count: 5 },
      { type: 'skeleton', name: '沙漠亡靈', level: 38, count: 7 },
      { type: 'orc', name: '沙盜', level: 42, count: 4 },
    ],
    boss: { type: 'scorpion', name: '蝎王', level: 55, hpMult: 15, atkMult: 3.5, respawn: 3600, x: 2000, y: 750, tier: 'advanced' },
  },
  dark_cave: {
    id: 'dark_cave', name: '幽暗洞窟', type: 'battle',
    bg: MAP_BG_DARKFOREST,
    levelMin: 50, levelMax: 80, nearVillage: 'cave_village', castle: 'aden',
    monsters: [
      { type: 'bat', name: '洞窟蝙蝠', level: 55, count: 8 },
      { type: 'orc', name: '地底兽人', level: 60, count: 7 },
      { type: 'skeleton', name: '黑暗骷髏', level: 65, count: 7 },
      { type: 'orc', name: '地底魔王', level: 70, count: 5 },
      { type: 'scorpion', name: '巨岩蝎', level: 58, count: 6 },
      { type: 'bat', name: '深淵蝙蝠', level: 72, count: 4 },
    ],
    boss: { type: 'bat', name: '深渊蝙蝠王', level: 80, hpMult: 20, atkMult: 4, respawn: 3600, x: 2100, y: 800, tier: 'advanced' },
  },
};

// 攻城区域地圖（每个城堡一张独立地圖，只有宣戰时才能攻擊）
const SIEGE_MAPS = {
  siege_gludio: {
    id: 'siege_gludio', name: '古魯丁城·攻城戰', type: 'castle_siege',
    bg: MAP_BG_SIEGE,
    levelMin: 1, levelMax: 99, castle: 'gludio',
    monsters: [], // 攻城战由 enterSiegeScene 动态生成守卫
  },
  siege_oren: {
    id: 'siege_oren', name: '歐瑞城·攻城戰', type: 'castle_siege',
    bg: MAP_BG_SIEGE,
    levelMin: 5, levelMax: 99, castle: 'oren',
    monsters: [],
  },
  siege_dion: {
    id: 'siege_dion', name: '狄恩城·攻城戰', type: 'castle_siege',
    bg: MAP_BG_SIEGE,
    levelMin: 15, levelMax: 99, castle: 'dion',
    monsters: [],
  },
  siege_giran: {
    id: 'siege_giran', name: '奇岩城·攻城戰', type: 'castle_siege',
    bg: MAP_BG_SIEGE,
    levelMin: 30, levelMax: 99, castle: 'giran',
    monsters: [],
  },
  siege_aden: {
    id: 'siege_aden', name: '亞丁城·攻城戰', type: 'castle_siege',
    bg: MAP_BG_SIEGE,
    levelMin: 50, levelMax: 99, castle: 'aden',
    monsters: [],
  },
};

function getAllMaps() { return { ...SAFE_MAPS, ...BATTLE_MAPS, ...SIEGE_MAPS }; }

// 怪物精灵图映射
const MONSTER_SPRITES = {
  goblin: SPRITE.goblin,
  skeleton: SPRITE.skeleton,
  orc: SPRITE.orc,
  scorpion: SPRITE.scorpion,
  bat: SPRITE.bat,
  wolf: SPRITE.wolf,
  slime: SPRITE.slime,
  ghost: SPRITE.ghost,
  spider: SPRITE.spider,
  shaman: SPRITE.shaman,
  bandit: SPRITE.bandit,
  zombie: SPRITE.zombie,
  darkmage: SPRITE.darkmage,
  // 新增怪物
  troll:   SPRITE.troll,
  demon:   SPRITE.demon,
  dragon:  SPRITE.dragon,
  // 新增變種（用現有精靈+濾鏡區分）
  darkorc:  SPRITE.orc,
  icewolf:  SPRITE.wolf,
  poisonSpider: SPRITE.spider,
  firebat:  SPRITE.bat,
  elderShaman: SPRITE.shaman,
  banditBoss: SPRITE.bandit,
  skeletonWarrior: SPRITE.skeleton,
  zombies: SPRITE.zombie,
  darkSorcerer: SPRITE.darkmage,
  ghostLord: SPRITE.ghost,
  eliteGoblin: SPRITE.goblin,
  royalScorpion: SPRITE.scorpion,
  goldenSlime: SPRITE.slime,
};

// ==================== 國家/公会/城堡 ====================
const NATIONS = [
  { id: 'kent',   name: '肯特王國',  flag: 'red-lion',  desc: '西部強國，騎兵精銳，驍勇善戰' },
  { id: 'oren',   name: '歐瑞聯盟',  flag: 'blue-hawk', desc: '精靈之城，魔法聞名，崇尚自然' },
  { id: 'dion',   name: '狄恩公國',  flag: 'green-sword', desc: '貿易樞紐，商業發達，傭兵雲集' },
  { id: 'aden',   name: '亞丁帝國',  flag: 'gold-crown', desc: '中央王都，大陸中心，最強帝國' },
];

// 國家國旗圖資（暗黑天堂風格）
const NATION_FLAGS = {
  kent:  '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfkbmmmbi_ve_miaoda', // 紅金獅
  oren:  '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfhuxlkbq_ve_miaoda', // 藍銀鷹
  dion:  '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrffmdt4ei_ve_miaoda', // 綠交叉劍
  aden:  '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfkbmmmci_ve_miaoda', // 金皇冠
};

// CSS 繪製國旗 fallback（圖片加載失敗時備用：彩色小圓點）
function getNationFlagHTML(nationId) {
  const map = {
    kent: `<div style="width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 30% 30%,#ff6060,#a01010);border:1px solid #c02020"></div>`,
    oren: `<div style="width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 30% 30%,#60a0ff,#103080);border:1px solid #4080ff"></div>`,
    dion: `<div style="width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 30% 30%,#60d060,#106020);border:1px solid #40c060"></div>`,
    aden: `<div style="width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 30% 30%,#ffd060,#a07010);border:1px solid #ffc040"></div>`,
  };
  return map[nationId] || map.kent;
}

// 安全國旗圖片標籤：加載失敗時自動替換為CSS小圓點
function safeFlagImg(nationId, size = 14) {
  const src = NATION_FLAGS[nationId] || NATION_FLAGS.kent;
  const dotColor = {
    kent: '#c02020', oren: '#4080ff', dion: '#40c060', aden: '#ffc040'
  }[nationId] || '#c02020';
  // 用一個span包裹img，onerror替換為背景色小圓點
  return `<span class="name-flag-img" style="width:${size}px;height:${size}px;border-radius:50%;display:inline-block;vertical-align:middle;margin-right:3px;border:1px solid rgba(240,192,64,0.5);background:${dotColor};overflow:hidden;flex-shrink:0"><img src="${src}" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.parentNode.style.background='${dotColor}';this.remove()" alt=""/></span>`;
}

// 取得某國家的國王（預設由第一軍團軍團長擔任）
function getNationKing(nationId) {
  const firstGuild = AI_GUILDS.find(g => g.nation === nationId && g.id.endsWith('1')) || AI_GUILDS.find(g => g.nation === nationId);
  if (!firstGuild) return { name: '—', isPlayer: false };
  // 如果第一軍團有玩家軍團長，則玩家為國王
  if (firstGuild.hasPlayerJoined && firstGuild.isPlayerLeader) {
    return { name: firstGuild.leader, isPlayer: true, legionId: firstGuild.id };
  }
  return { name: firstGuild.leader, isPlayer: false, legionId: firstGuild.id };
}

// 國家等級系統：按國家總貢獻值決定等級（最高10級），每級解鎖新軍團
const NATION_LEVEL_CONFIG = [
  { level: 1,  needContrib: 0,       maxGuilds: 1,  bonus: { atk: 2,  def: 2,  hpMax: 20 } },
  { level: 2,  needContrib: 200000,  maxGuilds: 2,  bonus: { atk: 4,  def: 4,  hpMax: 50 } },
  { level: 3,  needContrib: 600000,  maxGuilds: 3,  bonus: { atk: 6,  def: 6,  hpMax: 90 } },
  { level: 4,  needContrib: 1400000, maxGuilds: 4,  bonus: { atk: 9,  def: 9,  hpMax: 140 } },
  { level: 5,  needContrib: 2800000, maxGuilds: 5,  bonus: { atk: 12, def: 12, hpMax: 200 } },
  { level: 6,  needContrib: 5000000, maxGuilds: 6,  bonus: { atk: 16, def: 16, hpMax: 280 } },
  { level: 7,  needContrib: 8500000, maxGuilds: 7,  bonus: { atk: 20, def: 20, hpMax: 370 } },
  { level: 8,  needContrib: 14000000,maxGuilds: 8,  bonus: { atk: 25, def: 25, hpMax: 480 } },
  { level: 9,  needContrib: 22000000,maxGuilds: 9,  bonus: { atk: 30, def: 30, hpMax: 600 } },
  { level: 10, needContrib: 35000000,maxGuilds: 10, bonus: { atk: 40, def: 40, hpMax: 800 } },
];

function getNationTotalContribution(nationId) {
  // 國家總貢獻 = 所有屬於該國的AI真實貢獻累積 + 玩家真實貢獻
  let total = 0;
  GLOBAL_AI_POOL.forEach(ai => {
    if (ai.nation === nationId) {
      total += Math.floor(ai.contribution || 0);
    }
  });
  if (GS.nation === nationId) total += (GS.nationContribution || 0);
  return Math.floor(total);
}

function getNationLevelInfo(nationId) {
  const total = getNationTotalContribution(nationId);
  let cur = NATION_LEVEL_CONFIG[0];
  let next = NATION_LEVEL_CONFIG[1];
  for (let i = 0; i < NATION_LEVEL_CONFIG.length; i++) {
    if (total >= NATION_LEVEL_CONFIG[i].needContrib) {
      cur = NATION_LEVEL_CONFIG[i];
      next = NATION_LEVEL_CONFIG[i + 1] || null;
    }
  }
  const progress = next ? Math.max(0, Math.min(100, ((total - cur.needContrib) / (next.needContrib - cur.needContrib)) * 100)) : 100;
  return { level: cur.level, totalContrib: total, current: cur, next, progress };
}

// 取得某國家的可用軍團列表（按國家等級解鎖：Lv.1解鎖第一軍團...Lv.10解鎖第十軍團）
function getNationAvailableGuilds(nationId) {
  const lvInfo = getNationLevelInfo(nationId);
  const all = AI_GUILDS.filter(g => g.nation === nationId);
  // 國家等級 = 已解鎖軍團數（Lv.1解鎖1個，Lv.10解鎖10個）
  const unlockedCount = Math.min(10, lvInfo.level);
  return all.slice(0, unlockedCount);
}

// 預設 AI 公會（每個國家10個軍團，共40個，名稱固定為第N軍團）
const AI_GUILDS = (
  (() => {
    const nations = ['kent','oren','dion','aden'];
    const leaderNames = {
      kent:  ['鐵鋒','赤焰','鋼拳','銀鷹','疾風','雷電','血刃','蒼狼','殘月','霸皇'],
      oren:  ['夜梟','青霜','月影','星語','森守','碧波','靈風','羽落','銀輝','秘境'],
      dion:  ['狂刀','紅塵','金鱗','鐵血','風雲','烈日','蒼穹','百戰','無雙','奇謀'],
      aden:  ['破曉','劍心','墨淵','瑤光','紫電','白虹','霜華','龍淵','鳳翼','天樞'],
    };
    const notices = {
      kent:  [
        '以武立盟，凡犯我者，雖遠必誅。',
        '黑旗所指，寸草不生。',
        '鐵血男兒，橫掃八方。',
        '忠誠為本，榮耀為先。',
        '疾風迅雷，勢如破竹。',
        '雷霆一擊，萬夫莫當。',
        '血染戰場，魂歸故土。',
        '蒼狼嘯月，殺機畢露。',
        '殘月如鉤，殺敵如麻。',
        '霸者無敵，皇圖霸業。',
      ],
      oren:  [
        '月夜之下，我們守護自然。',
        '追求魔法極致的法師同盟。',
        '月影婆娑，精靈之舞。',
        '星辰指引，魔法永恆。',
        '森林之靈，與我同在。',
        '碧波盪漾，心靈澄淨。',
        '靈風習習，箭無虛發。',
        '羽毛輕盈，心念堅定。',
        '銀輝灑落，真理顯現。',
        '秘境深處，智慧之源。',
      ],
      dion:  [
        '刀在人在，刀亡人亡。',
        '誠信為本，利通四海。',
        '金鱗豈是池中物。',
        '鐵血商團，有求必應。',
        '風雲際會，一飛沖天。',
        '烈日炎炎，商路迢迢。',
        '蒼穹之下，皆是吾土。',
        '百戰歸來，金甲猶在。',
        '無雙國士，舉世無雙。',
        '奇謀百出，戰無不勝。',
      ],
      aden:  [
        '帝國先鋒，雷霆萬鈞。',
        '榮耀即吾命，騎士精神永存。',
        '影中行者，取人頭顱。',
        '新銳之師，前途無量。',
        '紫電橫空，氣貫長虹。',
        '白虹貫日，一擊必殺。',
        '霜華千裡，凜然正氣。',
        '龍淵九淵，深藏不露。',
        '鳳翼九天，翱翔寰宇。',
        '天樞在上，帝國永昌。',
      ],
    };
    const list = [];
    let idx = 1;
    for (const nid of nations) {
      for (let i = 1; i <= 10; i++) {
        list.push({
          id: 'g' + idx,
          name: `第${['一','二','三','四','五','六','七','八','九','十'][i-1]}軍團`,
          nation: nid,
          leader: '系統暫代',
          level: 1,
          members: 0,
          castle: null,
          funds: 0,
          notice: notices[nid][i-1],
          skillLevels: { atk: 0, def: 0, hp: 0 },
          hasHumanLeader: false,
          applications: [],
          order: i,
        });
        idx++;
      }
    }
    return list;
  })()
);

// 取得某公会的真實成員數（從AI池統計）
function getGuildMemberCount(guildId) {
  if (!guildId) return 0;
  // 玩家創建的公會
  if (GS.guild && GS.guild.id === guildId && GS.guild.isPlayerGuild) {
    const base = GS.guild.membersData?.length || 0;
    const aiCount = GLOBAL_AI_POOL.filter(ai => ai.guildId === guildId && !(GS.guild.membersData || []).find(b => b.name === ai.name)).length;
    return base + aiCount;
  }
  // AI公會
  const g = AI_GUILDS.find(x => x.id === guildId);
  if (!g) return 0;
  let count = GLOBAL_AI_POOL.filter(ai => ai.guildId === guildId).length;
  const playerInGuild = GS.guild && GS.guild.id === guildId;
  if (playerInGuild) count++;
  // 若軍團長不在AI池且不是玩家，補1人（邊界情況）
  const leaderInPool = GLOBAL_AI_POOL.find(ai => ai.guildId === guildId && ai.name === g.leader);
  const leaderIsPlayer = playerInGuild && GS.guild.role === 'leader';
  if (!leaderInPool && !leaderIsPlayer && g.leader) count++;
  return count;
}

// 取得某公会的成員列表（玩家公会/AI公会通用）
function getGuildMembers(guildId) {
  if (!guildId) return [];
  // 玩家創建的公会：從GS.guild.membersData 加上 GLOBAL_AI_POOL 裡同公会的AI
  if (GS.guild && GS.guild.id === guildId && GS.guild.isPlayerGuild) {
    const base = GS.guild.membersData || [];
    const aiMembers = GLOBAL_AI_POOL.filter(ai => ai.guildId === guildId && !base.find(b => b.name === ai.name))
      .map(ai => ({
        name: ai.name,
        role: '團員',
        level: ai.level,
        classId: ai.classId,
        online: ai.state !== 'dead',
        contribution: Math.floor(ai.level * 3 + Math.random() * 20),
        isAI: true,
      }));
    return [...base, ...aiMembers];
  }
  // AI公会：從全局AI池中取得該公会的AI成員 + 玩家（若已加入）
  const g = AI_GUILDS.find(x => x.id === guildId);
  if (!g) return [];
  const aiMembers = GLOBAL_AI_POOL.filter(ai => ai.guildId === guildId)
    .map(ai => ({
      name: ai.name,
      role: ai.name === g.leader ? '軍團長' : '團員',
      level: ai.level,
      classId: ai.classId,
      online: ai.state !== 'dead',
      contribution: Math.floor(ai.level * 5 + Math.random() * 20),
      isAI: true,
    }));
  // 加上玩家（如果在該公会）
  if (GS.guild && GS.guild.id === guildId) {
    const playerRole = GS.guild.role === 'leader' ? '軍團長' : (GS.guild.role === 'officer' ? '副軍團長' : (GS.guild.role === 'elite' ? '精英團員' : '團員'));
    aiMembers.unshift({
      name: GS.player.name,
      role: playerRole,
      level: GS.player.level,
      classId: GS.player.classId,
      online: true,
      contribution: GS.guild.myContribution || 0,
      isAI: false,
    });
  }
  // 若AI会长不在AI池（邊界情況），單獨補上一行
  if (!aiMembers.find(m => m.role === '軍團長') && g.leader) {
    aiMembers.unshift({
      name: g.leader,
      role: '軍團長',
      level: g.level * 10,
      classId: 'warrior',
      online: true,
      contribution: 999,
      isAI: true,
    });
  }
  return aiMembers;
}

// 敏感詞檢查（簡易版）
const SENSITIVE_WORDS = ['管理员GM', '系统', '官方', 'GM', '客服', '外挂', '作弊', '傻逼', '操你', '去死'];
function validateGuildName(name) {
  const n = name.trim();
  if (n.length < 2 || n.length > 10) return '公會名称需 2-10 字';
  for (const w of SENSITIVE_WORDS) {
    if (n.includes(w)) return '公會名称包含敏感詞，請更换';
  }
  // 檢查是否與AI公会重名
  if (AI_GUILDS.some(g => g.name === n)) return '该名称已被占用，請更换';
  return null;
}

// 加入 AI 軍團（第一個人類玩家自動成為軍團長）
function joinAIGuild(guildId) {
  const g = AI_GUILDS.find(x => x.id === guildId);
  if (!g) return false;
  if (GS.guild) return false; // 已在公会
  // 等級限制：需達到 10 級才能加入軍團
  if ((GS.player.level || 1) < 10) {
    addLog('system', '需要達到 Lv.10 才能加入軍團');
    return false;
  }
  const hasHumanBefore = GLOBAL_AI_POOL.some(ai => false); // 占位：目前AI池都是AI
  // 檢查是否已有玩家擔任軍團長（從AI軍團數據）
  const wasHumanLed = !!g.hasHumanLeader;
  // 加入
  GS.guild = {
    id: g.id,
    name: g.name,
    level: g.level,
    role: 'member',
    nation: g.nation,
    castles: g.castle ? [g.castle] : [],
    funds: g.funds || 0,
    myContribution: 0,
    todayDonatedGold: 0,
    todayDonatedGem: 0,
    skillLevels: { ...(g.skillLevels || {}) },
    weeklyKills: 0,
    notice: g.notice || '',
    isAIGuild: true,
    leader: g.leader,
    hasHumanLeader: wasHumanLed,
  };
  GS.guildId = g.id;
  GS.legionId = g.id; // 兼容字段名
  // 如果是第一個人類玩家加入AI軍團，自動成為軍團長
  if (!wasHumanLed) {
    g.hasHumanLeader = true;
    GS.guild.role = 'leader';
    GS.guild.originalAIIeader = g.leader; // 保存原AI軍團長
    g.leader = GS.player.name; // AI軍團數據中的軍團長也更新為玩家
    addLog('system', `【軍團】你是第一位加入【${g.name}】的人類玩家，自動成為軍團長！`);
  } else {
    addLog('system', `加入了公會：${g.name}`);
  }
  return true;
}

const CASTLES = [
  { id: 'gludio', name: '古魯丁城堡', nation: 'kent', region: '古魯丁', level: 1, recLevel: '10-20', taxRate: 5,  owner: null, ownerGuildId: null, ownerName: 'NPC無主', hp: 1200, hpMax: 1200, defenders: 6 },
  { id: 'oren',   name: '歐瑞城堡',   nation: 'oren', region: '歐瑞',   level: 2, recLevel: '20-35', taxRate: 6,  owner: null, ownerGuildId: null, ownerName: 'NPC無主', hp: 1800, hpMax: 1800, defenders: 8 },
  { id: 'dion',   name: '狄恩城堡',   nation: 'dion', region: '狄恩',   level: 3, recLevel: '35-50', taxRate: 7,  owner: null, ownerGuildId: null, ownerName: 'NPC無主', hp: 2200, hpMax: 2200, defenders: 9 },
  { id: 'giran',  name: '奇岩城堡',   nation: 'dion', region: '奇岩',   level: 4, recLevel: '50-65', taxRate: 8,  owner: null, ownerGuildId: null, ownerName: 'NPC無主', hp: 2600, hpMax: 2600, defenders: 12 },
  { id: 'aden',   name: '亞丁城堡',   nation: 'aden', region: '亞丁',   level: 5, recLevel: '65-80', taxRate: 10, owner: null, ownerGuildId: null, ownerName: 'NPC無主', hp: 3200, hpMax: 3200, defenders: 15 },
];

// ==================== 國家系统 ====================
// 官職等級（中世纪风格，按貢獻度+戰力综合排名）
const NOBILITY_RANKS = [
  { key: 'king',       name: '國王',       count: 1,  minRank: 1,  iconKey: 'crown',    atkBonus: 10, defBonus: 10, hpBonus: 200, color: '#ffd040' },
  { key: 'prince',     name: '親王',       count: 2,  minRank: 2,  iconKey: 'castle',   atkBonus: 6,  defBonus: 6,  hpBonus: 120, color: '#e0a020' },
  { key: 'duke',       name: '公爵',       count: 2,  minRank: 4,  iconKey: 'office',   atkBonus: 5,  defBonus: 5,  hpBonus: 100, color: '#c08020' },
  { key: 'marquess',   name: '侯爵',       count: 3,  minRank: 6,  iconKey: 'shield',   atkBonus: 4,  defBonus: 4,  hpBonus: 80,  color: '#b06010' },
  { key: 'earl',       name: '伯爵',       count: 4,  minRank: 9,  iconKey: 'sword',    atkBonus: 3,  defBonus: 3,  hpBonus: 60,  color: '#a05000' },
  { key: 'viscount',   name: '子爵',       count: 5,  minRank: 13, iconKey: 'sword',    atkBonus: 2,  defBonus: 2,  hpBonus: 40,  color: '#804000' },
  { key: 'baron',      name: '男爵',       count: 8,  minRank: 18, iconKey: 'skill',    atkBonus: 1,  defBonus: 1,  hpBonus: 20,  color: '#603000' },
  { key: 'paladin',    name: '聖騎士',     count: 10, minRank: 26, iconKey: 'shield',   atkBonus: 1,  defBonus: 2,  hpBonus: 15,  color: '#504030' },
  { key: 'knight',     name: '騎士',       count: 20, minRank: 36, iconKey: 'sword',    atkBonus: 1,  defBonus: 1,  hpBonus: 10,  color: '#403020' },
  { key: 'royalguard', name: '皇家護衛',   count: 30, minRank: 56, iconKey: 'shield',   atkBonus: 0,  defBonus: 1,  hpBonus: 10,  color: '#302010' },
];

// 國家技能树（被动加成，用貢獻值加点）
const NATION_SKILL_TREE = [
  { id: 'atk',    name: '攻無不克', desc: '攻擊+',        iconKey: 'sword',  color: '#ff6040', baseValue: 1, perLevel: 1, maxLevel: 20, costBase: 50000,  costGrow: 1.2, statKey: 'atk' },
  { id: 'def',    name: '堅不可摧', desc: '防禦+',        iconKey: 'shield', color: '#60a0ff', baseValue: 1, perLevel: 1, maxLevel: 20, costBase: 50000,  costGrow: 1.2, statKey: 'def' },
  { id: 'hp',     name: '生命源泉', desc: '生命上限+%',   iconKey: 'treasury', color: '#ff4060', baseValue: 1, perLevel: 1, maxLevel: 20, costBase: 50000,  costGrow: 1.2, statKey: 'hpPct' },
  { id: 'crit',   name: '致命一擊', desc: '暴擊率+%',     iconKey: 'war',    color: '#ffa020', baseValue: 0.5, perLevel: 0.5, maxLevel: 15, costBase: 80000,  costGrow: 1.25, statKey: 'crit' },
  { id: 'critdmg',name: '毀天滅地', desc: '暴擊傷害+%',   iconKey: 'war',    color: '#ffd040', baseValue: 2, perLevel: 2, maxLevel: 15, costBase: 80000,  costGrow: 1.25, statKey: 'critDmg' },
  { id: 'exp',    name: '經驗加成', desc: '經驗獲取+%',   iconKey: 'scroll', color: '#80ff80', baseValue: 2, perLevel: 2, maxLevel: 15, costBase: 100000, costGrow: 1.3, statKey: 'expPct' },
  { id: 'drop',   name: '寶物獵人', desc: '掉寶率+%',     iconKey: 'gem',    color: '#c080ff', baseValue: 1, perLevel: 1, maxLevel: 10, costBase: 120000, costGrow: 1.35, statKey: 'dropPct' },
];

// 预设軍團（每个國家若干，替代原公会）
const NATION_LEGIONS_TEMPLATE = [
  { name: '黑鹰軍團',    motto: '黑鹰所指，无堅不摧' },
  { name: '血色十字军',  motto: '以血铸魂，以劍立國' },
  { name: '苍穹骑士團',  motto: '苍穹之下，正义長存' },
  { name: '暗夜行者',    motto: '阴影之中，死神降临' },
  { name: '狮心骑士團',  motto: '勇者之心，狮王之魂' },
  { name: '黄金雄狮',    motto: '金色之光，帝國之魂' },
];

// 捐献配置
const DONATION_CONFIG = {
  gold: [
    { amount: 1000,   contribution: 10,  dailyLimit: 10 },
    { amount: 5000,   contribution: 55,  dailyLimit: 5 },
    { amount: 10000,  contribution: 120, dailyLimit: 3 },
  ],
  gem: [
    { amount: 10,   contribution: 50,  dailyLimit: 20 },
    { amount: 50,   contribution: 280, dailyLimit: 10 },
    { amount: 100,  contribution: 600, dailyLimit: 5 },
  ],
};

// 攻城战時間限制（秒）
const SIEGE_DURATION = 20 * 60;

// ==================== 召喚池/宠物池 ====================
const SUMMON_POOL = [
  // ===== 白色 9个 =====
  { id: 's1', name: '新兵劍士', rarity: 'white', sprite: SPRITE.warrior, role: 'dps', classId: 'warrior', race: 'human',
    stats: { atk: 5, def: 2, hpMax: 30, crit: 2, critDmg: 10 },
    skill: { name: '重擊', desc: '對敵人造成120%攻擊傷害', dmgMult: 1.2, cd: 4 } },
  { id: 's2', name: '見习弓手', rarity: 'white', sprite: SPRITE.archer, role: 'dps', classId: 'archer', race: 'elf',
    stats: { atk: 4, def: 1, hpMax: 25, crit: 5, critDmg: 15 },
    skill: { name: '穿透箭', desc: '射出穿透箭造成130%傷害', dmgMult: 1.3, cd: 5 } },
  { id: 's3', name: '學徒法师', rarity: 'white', sprite: SPRITE.mage, role: 'dps', classId: 'mage', race: 'human',
    stats: { atk: 6, def: 1, hpMax: 20, crit: 3, critDmg: 20 },
    skill: { name: '火球术', desc: '發射火球造成140%傷害', dmgMult: 1.4, cd: 4 } },
  { id: 's4', name: '村護卫', rarity: 'white', sprite: SPRITE.paladin, role: 'tank', classId: 'paladin', race: 'human',
    stats: { atk: 3, def: 5, hpMax: 60, crit: 1, critDmg: 10 },
    skill: { name: '盾擊', desc: '造成80%傷害並嘲讽敌人', dmgMult: 0.8, cd: 3 } },
  { id: 's5', name: '流浪祭司', rarity: 'white', sprite: SPRITE.paladin, role: 'support', classId: 'paladin', race: 'human',
    stats: { atk: 3, def: 3, hpMax: 40, crit: 2, critDmg: 10 },
    skill: { name: '治愈术', desc: '恢復主人15%最大生命', healPct: 0.15, cd: 8 } },
  { id: 's6', name: '新手盗贼', rarity: 'white', sprite: SPRITE.rogue, role: 'dps', classId: 'rogue', race: 'elf',
    stats: { atk: 4, def: 1, hpMax: 22, crit: 6, critDmg: 15 },
    skill: { name: '背刺', desc: '造成120%攻擊傷害', dmgMult: 1.2, cd: 3 } },
  { id: 's7', name: '見习术士', rarity: 'white', sprite: SPRITE.warlock, role: 'dps', classId: 'warlock', race: 'darkelf',
    stats: { atk: 5, def: 1, hpMax: 24, crit: 3, critDmg: 18 },
    skill: { name: '暗影箭', desc: '射出暗影箭造成130%傷害', dmgMult: 1.3, cd: 4 } },
  { id: 's8', name: '民兵戰士', rarity: 'white', sprite: SPRITE.warrior, role: 'dps', classId: 'warrior', race: 'human',
    stats: { atk: 4, def: 3, hpMax: 40, crit: 2, critDmg: 10 },
    skill: { name: '橫斬', desc: '對敵人造成110%攻擊傷害', dmgMult: 1.1, cd: 3 } },
  { id: 's9', name: '森林弓手', rarity: 'white', sprite: SPRITE.archer, role: 'dps', classId: 'archer', race: 'elf',
    stats: { atk: 5, def: 2, hpMax: 28, crit: 7, critDmg: 15 },
    skill: { name: '急速射擊', desc: '射出两箭每箭70%傷害', dmgMult: 0.7, hits: 2, cd: 4 } },
  { id: 's32', name: '鐵匠學徒', rarity: 'white', sprite: SPRITE.warrior, role: 'tank', classId: 'warrior', race: 'dwarf',
    stats: { atk: 3, def: 4, hpMax: 50, crit: 1, critDmg: 8 },
    skill: { name: '鐵錘猛擊', desc: '重擊敵人造成130%傷害', dmgMult: 1.3, cd: 4 } },
  { id: 's33', name: '街頭鬥士', rarity: 'white', sprite: SPRITE.rogue, role: 'dps', classId: 'rogue', race: 'human',
    stats: { atk: 5, def: 2, hpMax: 30, crit: 5, critDmg: 12 },
    skill: { name: '組合拳', desc: '連續出拳2次每次65%傷害', dmgMult: 0.65, hits: 2, cd: 3 } },
  // ===== 绿色 7个 =====
  { id: 's10', name: '精英戰士', rarity: 'green', sprite: SPRITE.warrior, role: 'dps', classId: 'warrior', race: 'human',
    stats: { atk: 10, def: 5, hpMax: 80, crit: 4, critDmg: 15 },
    skill: { name: '狂暴打擊', desc: '造成160%攻擊傷害', dmgMult: 1.6, cd: 4 } },
  { id: 's11', name: '游侠', rarity: 'green', sprite: SPRITE.archer, role: 'dps', classId: 'archer', race: 'elf',
    stats: { atk: 12, def: 3, hpMax: 60, crit: 8, critDmg: 20 },
    skill: { name: '多重射擊', desc: '射出3箭每箭60%傷害', dmgMult: 0.6, hits: 3, cd: 5 } },
  { id: 's12', name: '元素师', rarity: 'green', sprite: SPRITE.mage, role: 'dps', classId: 'mage', race: 'human',
    stats: { atk: 14, def: 2, hpMax: 50, crit: 5, critDmg: 25 },
    skill: { name: '闪電链', desc: '闪電链造成150%傷害', dmgMult: 1.5, cd: 4 } },
  { id: 's13', name: '聖殿骑士', rarity: 'green', sprite: SPRITE.paladin, role: 'tank', classId: 'paladin', race: 'human',
    stats: { atk: 8, def: 15, hpMax: 200, crit: 2, critDmg: 15 },
    skill: { name: '神聖護盾', desc: '给主人加盾吸收20%傷害', shieldPct: 0.2, cd: 10 } },
  { id: 's14', name: '暗夜刺客', rarity: 'green', sprite: SPRITE.rogue, role: 'dps', classId: 'rogue', race: 'elf',
    stats: { atk: 16, def: 3, hpMax: 55, crit: 12, critDmg: 25 },
    skill: { name: '毒刃', desc: '造成150%傷害並附加持續毒伤', dmgMult: 1.5, dot: { type: 'poison', dmg: 3, duration: 5 }, cd: 5 } },
  { id: 's15', name: '暗影术士', rarity: 'green', sprite: SPRITE.warlock, role: 'dps', classId: 'warlock', race: 'darkelf',
    stats: { atk: 15, def: 3, hpMax: 55, crit: 6, critDmg: 22 },
    skill: { name: '腐蚀术', desc: '暗影腐蚀造成160%傷害', dmgMult: 1.6, cd: 4 } },
  { id: 's16', name: '戰鬥祭司', rarity: 'green', sprite: SPRITE.paladin, role: 'support', classId: 'paladin', race: 'human',
    stats: { atk: 9, def: 8, hpMax: 100, crit: 3, critDmg: 15 },
    skill: { name: '聖光术', desc: '造成120%傷害並治疗主人', dmgMult: 1.2, healPct: 0.1, cd: 6 } },
  { id: 's34', name: '精靈遊俠', rarity: 'green', sprite: SPRITE.archer, role: 'dps', classId: 'archer', race: 'elf',
    stats: { atk: 13, def: 4, hpMax: 65, crit: 10, critDmg: 18 },
    skill: { name: '精靈射擊', desc: '精準射擊造成170%傷害', dmgMult: 1.7, cd: 4 } },
  { id: 's35', name: '矮人守衛', rarity: 'green', sprite: SPRITE.warrior, role: 'tank', classId: 'warrior', race: 'dwarf',
    stats: { atk: 10, def: 12, hpMax: 150, crit: 2, critDmg: 10 },
    skill: { name: '盾牆', desc: '提升防禦並反擊', shieldPct: 0.25, cd: 8 } },
  // ===== 蓝色 6个 =====
  { id: 's17', name: '劍聖', rarity: 'blue', sprite: SPRITE.windsword, role: 'dps', classId: 'warrior', race: 'human',
    stats: { atk: 28, def: 6, hpMax: 120, crit: 10, critDmg: 25 },
    skill: { name: '劍氣斩', desc: '劍氣造成180%範圍傷害', dmgMult: 1.8, aoe: true, cd: 6 } },
  { id: 's18', name: '暗影刺客', rarity: 'blue', sprite: SPRITE.shadowassassin, role: 'dps', classId: 'rogue', race: 'elf',
    stats: { atk: 30, def: 4, hpMax: 90, crit: 15, critDmg: 30 },
    skill: { name: '致命背刺', desc: '造成200%暴擊傷害', dmgMult: 2.0, cd: 6 } },
  { id: 's19', name: '银甲骑士', rarity: 'blue', sprite: SPRITE.silverknight, role: 'tank', classId: 'paladin', race: 'human',
    stats: { atk: 15, def: 25, hpMax: 350, crit: 3, critDmg: 15 },
    skill: { name: '嘲諷怒吼', desc: '嘲諷全體敵人並提升自身防禦', dmgMult: 0.8, cd: 8 } },
  { id: 's20', name: '冰霜法师', rarity: 'blue', sprite: SPRITE.frostmage, role: 'dps', classId: 'mage', race: 'human',
    stats: { atk: 32, def: 4, hpMax: 80, crit: 8, critDmg: 30 },
    skill: { name: '冰锥术', desc: '冰锥造成200%傷害並减速', dmgMult: 2.0, cd: 5 } },
  { id: 's21', name: '疾风行者', rarity: 'blue', sprite: SPRITE.windwalker, role: 'dps', classId: 'rogue', race: 'elf',
    stats: { atk: 26, def: 5, hpMax: 100, crit: 18, critDmg: 28 },
    skill: { name: '疾风斩', desc: '快速连擊3次每次80%傷害', dmgMult: 0.8, hits: 3, cd: 5 } },
  { id: 's22', name: '大魔導师', rarity: 'blue', sprite: SPRITE.mage, role: 'dps', classId: 'mage', race: 'human',
    stats: { atk: 35, def: 3, hpMax: 70, crit: 7, critDmg: 35 },
    skill: { name: '火球连弹', desc: '连續發射3枚火球每枚70%傷害', dmgMult: 0.7, hits: 3, cd: 6 } },
  { id: 's36', name: '格鬥大師', rarity: 'blue', sprite: SPRITE.rogue, role: 'dps', classId: 'rogue', race: 'human',
    stats: { atk: 28, def: 7, hpMax: 110, crit: 14, critDmg: 25 },
    skill: { name: '連環踢', desc: '快速腳踢4次每次55%傷害', dmgMult: 0.55, hits: 4, cd: 5 } },
  { id: 's37', name: '聖殿祭司', rarity: 'blue', sprite: SPRITE.paladin, role: 'support', classId: 'paladin', race: 'human',
    stats: { atk: 18, def: 12, hpMax: 180, crit: 4, critDmg: 15 },
    skill: { name: '神聖領域', desc: '治療主人20%生命並加護盾', healPct: 0.2, shieldPct: 0.15, cd: 9 } },
  // ===== 红色 5个 =====
  { id: 's23', name: '死亡骑士', rarity: 'red', sprite: SPRITE.deathknight, role: 'dps', classId: 'warrior', race: 'undead',
    stats: { atk: 60, def: 15, hpMax: 250, crit: 12, critDmg: 40 },
    skill: { name: '死亡风暴', desc: '死亡风暴造成220%範圍傷害', dmgMult: 2.2, aoe: true, cd: 7 } },
  { id: 's24', name: '惡魔猎手', rarity: 'red', sprite: SPRITE.demonhunter, role: 'dps', classId: 'rogue', race: 'demon',
    stats: { atk: 70, def: 10, hpMax: 200, crit: 20, critDmg: 45 },
    skill: { name: '惡魔之怒', desc: '惡魔之力造成250%暴擊傷害', dmgMult: 2.5, cd: 7 } },
  { id: 's25', name: '暗影领主', rarity: 'red', sprite: SPRITE.darklord, role: 'dps', classId: 'warlock', race: 'darkelf',
    stats: { atk: 65, def: 8, hpMax: 180, crit: 15, critDmg: 50 },
    skill: { name: '暗影爆發', desc: '暗影能量爆發造成280%範圍傷害', dmgMult: 2.8, aoe: true, cd: 8 } },
  { id: 's26', name: '炎龍骑士', rarity: 'red', sprite: SPRITE.dragonknight, role: 'tank', classId: 'warrior', race: 'human',
    stats: { atk: 45, def: 35, hpMax: 500, crit: 8, critDmg: 25 },
    skill: { name: '龍炎冲擊', desc: '龍焰冲擊造成200%範圍傷害', dmgMult: 2.0, aoe: true, cd: 7 } },
  { id: 's27', name: '鳳凰戰神', rarity: 'red', sprite: SPRITE.phoenixgod, role: 'dps', classId: 'warrior', race: 'human',
    stats: { atk: 75, def: 12, hpMax: 220, crit: 18, critDmg: 40 },
    skill: { name: '鳳凰涅槃', desc: '火焰爆發造成260%傷害並恢復生命', dmgMult: 2.6, healPct: 0.15, cd: 8 } },
  { id: 's39', name: '闇夜君主', rarity: 'red', sprite: SPRITE.darklord, role: 'dps', classId: 'warlock', race: 'darkelf',
    stats: { atk: 68, def: 10, hpMax: 200, crit: 14, critDmg: 48 },
    skill: { name: '闇夜降臨', desc: '暗影領域造成250%範圍傷害並降低敵人防禦', dmgMult: 2.5, aoe: true, cd: 8 } },
  { id: 's40', name: '聖光守護者', rarity: 'red', sprite: SPRITE.paladin, role: 'tank', classId: 'paladin', race: 'human',
    stats: { atk: 40, def: 40, hpMax: 600, crit: 5, critDmg: 20 },
    skill: { name: '聖光護盾', desc: '給主人加護盾吸收30%傷害並回血', shieldPct: 0.3, healPct: 0.1, cd: 9 } },
  // ===== 红色新增（新8帧图资） =====
  { id: 's41', name: '黑暗騎士', rarity: 'red', spriteKey: 'dark_knight_red', role: 'dps', classRestriction: ['warrior'], race: 'demon',
    stats: { atk: 68, def: 18, hpMax: 280, crit: 14, critDmg: 45 },
    skill: { name: '闇黑斬擊', desc: '黑暗之力揮出240%傷害並吸取生命', dmgMult: 2.4, lifestealPct: 0.15, cd: 7 } },
  { id: 's42', name: '黑暗法師', rarity: 'red', spriteKey: 'dark_mage_red', role: 'dps', classRestriction: ['mage'], race: 'undead',
    stats: { atk: 80, def: 6, hpMax: 170, crit: 16, critDmg: 55 },
    skill: { name: '靈魂彈幕', desc: '召喚靈魂造成280%範圍傷害', dmgMult: 2.8, aoe: true, cd: 8 } },
  { id: 's43', name: '黑魔導', rarity: 'red', spriteKey: 'dark_sorcerer', role: 'dps', classRestriction: ['mage','warlock'], race: 'demon',
    stats: { atk: 85, def: 8, hpMax: 190, crit: 18, critDmg: 52 },
    skill: { name: '虛空咒', desc: '虛空深淵造成300%範圍傷害並降低敵人防禦', dmgMult: 3.0, aoe: true, cd: 9 } },
  { id: 's44', name: '黑暗刺客', rarity: 'red', spriteKey: 'dark_assassin_red', role: 'dps', classRestriction: ['rogue'], race: 'demon',
    stats: { atk: 78, def: 8, hpMax: 180, crit: 24, critDmg: 60 },
    skill: { name: '影襲', desc: '暗影疾襲造成260%暴擊傷害', dmgMult: 2.6, cd: 6 } },
  { id: 's45', name: '幽冥弓箭手', rarity: 'red', spriteKey: 'ghost_archer', role: 'dps', classRestriction: ['archer'], race: 'undead',
    stats: { atk: 72, def: 7, hpMax: 160, crit: 20, critDmg: 50 },
    skill: { name: '亡靈箭雨', desc: '亡靈之箭造成250%範圍傷害', dmgMult: 2.5, aoe: true, cd: 7 } },
  { id: 's46', name: '銀騎士蓋拉德', rarity: 'red', spriteKey: 'silver_knight_galahad', role: 'tank', classRestriction: ['paladin'], race: 'human',
    stats: { atk: 50, def: 38, hpMax: 550, crit: 6, critDmg: 22 },
    skill: { name: '聖潔守護', desc: '聖光護盾吸收25%傷害並治療20%生命', shieldPct: 0.25, healPct: 0.2, cd: 9 } },
  // ===== 紫色 3个 =====
  { id: 's28', name: '龍骑士', rarity: 'purple', sprite: SPRITE.purpledragon, role: 'tank', classId: 'warrior', race: 'dragon',
    stats: { atk: 80, def: 50, hpMax: 700, crit: 10, critDmg: 30 },
    skill: { name: '龍息吐纳', desc: '龍焰造成250%範圍傷害', dmgMult: 2.5, aoe: true, cd: 8 } },
  { id: 's29', name: '大魔導士', rarity: 'purple', sprite: SPRITE.archmage, role: 'dps', classId: 'mage', race: 'human',
    stats: { atk: 120, def: 15, hpMax: 280, crit: 15, critDmg: 50 },
    skill: { name: '陨石术', desc: '天降陨石造成300%範圍傷害', dmgMult: 3.0, aoe: true, cd: 9 } },
  { id: 's30', name: '鳳凰戰神', rarity: 'purple', sprite: SPRITE.phoenixgod, role: 'dps', classId: 'warrior', race: 'divine',
    stats: { atk: 130, def: 20, hpMax: 320, crit: 22, critDmg: 45 },
    skill: { name: '鳳凰烈焰', desc: '鳳凰之焰造成280%傷害並治疗', dmgMult: 2.8, healPct: 0.2, cd: 9 } },
  // ===== 金色 1个 =====
  { id: 's31', name: '絕對者', rarity: 'gold', sprite: SPRITE.absolute, role: 'dps', classId: 'warrior', race: 'divine',
    stats: { atk: 200, def: 60, hpMax: 1000, crit: 25, critDmg: 60 },
    skill: { name: '神聖裁决', desc: '絕對之力造成350%範圍傷害並全治疗', dmgMult: 3.5, aoe: true, healPct: 0.3, cd: 10 } },
  { id: 's38', name: '創世神', rarity: 'gold', sprite: SPRITE.archmage, role: 'dps', classId: 'mage', race: 'divine',
    stats: { atk: 220, def: 50, hpMax: 900, crit: 20, critDmg: 70 },
    skill: { name: '創世之雷', desc: '雷霆萬鈞造成400%範圍傷害', dmgMult: 4.0, aoe: true, cd: 12 } },
];

const PET_POOL = [
  // ===== 白色 10个 =====
  { id: 'p1', name: '小狐狸', rarity: 'white', spriteKey: 'pet_fox', desc: '灵巧的小狐狸',
    stats: { atk: 3, def: 1, hpMax: 10, crit: 2, critDmg: 5 } },
  { id: 'p2', name: '小野狼', rarity: 'white', spriteKey: 'pet_wolf', desc: '嗅觉敏锐的野狼',
    stats: { atk: 4, def: 1, hpMax: 8, crit: 3, critDmg: 5 } },
  { id: 'p3', name: '小兔子', rarity: 'white', spriteKey: 'pet_rabbit', desc: '跳得飞快的兔子',
    stats: { atk: 1, def: 2, hpMax: 15, crit: 1, critDmg: 3 } },
  { id: 'p4', name: '小猫咪', rarity: 'white', spriteKey: 'pet_fox', desc: '柔软又敏捷',
    stats: { atk: 2, def: 1, hpMax: 10, crit: 5, critDmg: 8 } },
  { id: 'p5', name: '小乌鸦', rarity: 'white', spriteKey: 'pet_crow', desc: '帶來厄運的乌鸦',
    stats: { atk: 3, def: 1, hpMax: 6, crit: 4, critDmg: 10 } },
  { id: 'p6', name: '小熊猫', rarity: 'white', spriteKey: 'pet_panda', desc: '萌萌的小熊猫',
    stats: { atk: 2, def: 3, hpMax: 20, crit: 1, critDmg: 5 } },
  { id: 'p7', name: '小乌龜', rarity: 'white', spriteKey: 'pet_turtle', desc: '慢吞吞的小乌龜',
    stats: { atk: 1, def: 5, hpMax: 25, crit: 1, critDmg: 3 } },
  { id: 'p8', name: '小老虎', rarity: 'white', spriteKey: 'pet_tiger', desc: '威风的小老虎',
    stats: { atk: 4, def: 2, hpMax: 12, crit: 3, critDmg: 8 } },
  { id: 'p9', name: '小火龍', rarity: 'white', spriteKey: 'pet_dragon', desc: '可愛的小火龍',
    stats: { atk: 5, def: 1, hpMax: 8, crit: 2, critDmg: 10 } },
  { id: 'p10', name: '小幽灵', rarity: 'white', spriteKey: 'pet_ghost', desc: '調皮的小幽灵',
    stats: { atk: 3, def: 1, hpMax: 10, crit: 3, critDmg: 8 } },
  // ===== 绿色 7个 =====
  { id: 'p11', name: '森林精灵', rarity: 'green', spriteKey: 'pet_fairy', desc: '森林中的小精灵',
    stats: { atk: 8, def: 2, hpMax: 25, crit: 3, critDmg: 10 } },
  { id: 'p12', name: '火焰鳥', rarity: 'green', spriteKey: 'pet_phoenix', desc: '浴火的猛禽',
    stats: { atk: 10, def: 1, hpMax: 18, crit: 5, critDmg: 12 } },
  { id: 'p13', name: '冰晶狼', rarity: 'green', spriteKey: 'pet_wolf_ice', desc: '寒冰之力的守護',
    stats: { atk: 7, def: 8, hpMax: 35, crit: 2, critDmg: 8 } },
  { id: 'p14', name: '独角兽', rarity: 'green', spriteKey: 'pet_unicorn', desc: '纯洁的聖兽',
    stats: { atk: 6, def: 6, hpMax: 40, crit: 3, critDmg: 10 } },
  { id: 'p15', name: '黑豹', rarity: 'green', spriteKey: 'pet_panther', desc: '夜色中的猎手',
    stats: { atk: 9, def: 3, hpMax: 25, crit: 10, critDmg: 18 } },
  { id: 'p16', name: '雷鳥', rarity: 'green', spriteKey: 'pet_thunder', desc: '雷霆之力的神鳥',
    stats: { atk: 12, def: 2, hpMax: 20, crit: 6, critDmg: 15 } },
  { id: 'p17', name: '小青龍', rarity: 'green', spriteKey: 'pet_babydragon', desc: '年幼的青龍',
    stats: { atk: 11, def: 4, hpMax: 28, crit: 4, critDmg: 15 } },
  // ===== 蓝色 5个 =====
  { id: 'p18', name: '玄武', rarity: 'blue', spriteKey: 'pet_turtle', desc: '堅不可摧的神龜',
    stats: { atk: 8, def: 25, hpMax: 80, crit: 1, critDmg: 8 } },
  { id: 'p19', name: '九尾狐', rarity: 'blue', spriteKey: 'pet_fox', desc: '狡诈而強大',
    stats: { atk: 18, def: 5, hpMax: 40, crit: 10, critDmg: 22 } },
  { id: 'p20', name: '炎龍', rarity: 'blue', spriteKey: 'pet_dragon', desc: '烈焰之龍',
    stats: { atk: 22, def: 6, hpMax: 45, crit: 6, critDmg: 20 } },
  { id: 'p21', name: '冰狼', rarity: 'blue', spriteKey: 'pet_wolf_ice', desc: '極地冰原之王',
    stats: { atk: 20, def: 8, hpMax: 50, crit: 8, critDmg: 18 } },
  { id: 'p22', name: '黑豹王', rarity: 'blue', spriteKey: 'pet_panther', desc: '黑暗森林之王',
    stats: { atk: 25, def: 5, hpMax: 35, crit: 15, critDmg: 25 } },
  // ===== 红色 4个 =====
  { id: 'p23', name: '炎魔', rarity: 'red', spriteKey: 'pet_phoenix', desc: '烈焰地狱的惡魔',
    stats: { atk: 45, def: 6, hpMax: 60, crit: 12, critDmg: 25 } },
  { id: 'p24', name: '冰霜巨兽', rarity: 'red', spriteKey: 'pet_wolf_ice', desc: '極地冰封巨灵',
    stats: { atk: 20, def: 40, hpMax: 150, crit: 3, critDmg: 12 } },
  { id: 'p25', name: '死神', rarity: 'red', spriteKey: 'pet_ghost', desc: '亡灵軍團统帅',
    stats: { atk: 40, def: 20, hpMax: 100, crit: 15, critDmg: 30 } },
  { id: 'p26', name: '火鳳凰', rarity: 'red', spriteKey: 'pet_phoenix_legend', desc: '浴火重生的神鳥',
    stats: { atk: 35, def: 12, hpMax: 120, crit: 10, critDmg: 25 } },
  // ===== 紫色 3个 =====
  { id: 'p27', name: '太古巨龍', rarity: 'purple', spriteKey: 'pet_dragon', desc: '上古巨龍',
    stats: { atk: 70, def: 30, hpMax: 200, crit: 15, critDmg: 35 } },
  { id: 'p28', name: '混沌魔王', rarity: 'purple', spriteKey: 'pet_ghost', desc: '混沌深渊的主宰',
    stats: { atk: 85, def: 18, hpMax: 160, crit: 20, critDmg: 40 } },
  { id: 'p29', name: '创世神兽', rarity: 'purple', spriteKey: 'pet_golddragon', desc: '開天辟地的神兽',
    stats: { atk: 65, def: 45, hpMax: 280, crit: 18, critDmg: 35 } },
  // ===== 金色 1个 =====
  { id: 'p30', name: '永恒神龍', rarity: 'gold', spriteKey: 'pet_golddragon', desc: '凌驾一切的永恒神龍',
    stats: { atk: 150, def: 55, hpMax: 450, crit: 30, critDmg: 55 } },
  // 新增守護寵物（補充10種）
  { id: 'p31', name: '小刺蝟', rarity: 'white', spriteKey: 'pet_fox', desc: '可愛的小刺蝟',
    stats: { atk: 2, def: 3, hpMax: 18, crit: 2, critDmg: 5 } },
  { id: 'p32', name: '小企鵝', rarity: 'white', spriteKey: 'pet_rabbit', desc: '呆萌的小企鵝',
    stats: { atk: 1, def: 4, hpMax: 22, crit: 1, critDmg: 4 } },
  { id: 'p33', name: '雪原狐', rarity: 'green', spriteKey: 'pet_fox', desc: '來自雪原的靈狐',
    stats: { atk: 9, def: 3, hpMax: 30, crit: 6, critDmg: 12 } },
  { id: 'p34', name: '熔岩犬', rarity: 'green', spriteKey: 'pet_wolf', desc: '熔岩深處的獵犬',
    stats: { atk: 11, def: 2, hpMax: 25, crit: 5, critDmg: 15 } },
  { id: 'p35', name: '月精靈', rarity: 'blue', spriteKey: 'pet_fairy', desc: '月光下的精靈',
    stats: { atk: 22, def: 5, hpMax: 70, crit: 8, critDmg: 20 } },
  { id: 'p36', name: '雷霆獸', rarity: 'blue', spriteKey: 'pet_thunder', desc: '雷電之力的野獸',
    stats: { atk: 28, def: 4, hpMax: 60, crit: 10, critDmg: 25 } },
  { id: 'p37', name: '地獄犬', rarity: 'red', spriteKey: 'pet_wolf_ice', desc: '地獄守門之犬',
    stats: { atk: 45, def: 12, hpMax: 150, crit: 12, critDmg: 35 } },
  { id: 'p38', name: '翠玉龍', rarity: 'red', spriteKey: 'pet_dragon', desc: '翠綠之龍',
    stats: { atk: 40, def: 20, hpMax: 200, crit: 8, critDmg: 28 } },
  { id: 'p39', name: '星雲精靈', rarity: 'purple', spriteKey: 'pet_fairy', desc: '星雲中誕生的精靈',
    stats: { atk: 80, def: 15, hpMax: 260, crit: 15, critDmg: 40 } },
  { id: 'p40', name: '黃金鳳凰', rarity: 'gold', spriteKey: 'pet_phoenix_legend', desc: '至高無上的黃金鳳凰',
    stats: { atk: 180, def: 50, hpMax: 500, crit: 25, critDmg: 60 } },
];

// ==================== 變身池（抽卡用） ====================
const TRANSFORM_POOL = [
  // ===== 金色神話（4張） =====
  { id: 't_death_knight', name: '死亡騎士', rarity: 'gold', spriteKey: 'death_knight',
    classRestriction: ['warrior', 'paladin', 'rogue'],
    desc: '死亡的代言者，揮舞符文大劍的不死統帥',
    stats: { atk: 220, def: 120, hpMax: 700, mpMax: 150, crit: 12, critDmg: 35, hit: 10, walkSpeedPct: 23, atkSpeedPct: 25 } },
  { id: 't_ishti', name: '伊詩蒂', rarity: 'gold', spriteKey: 'ishti',
    classRestriction: 'archer',
    desc: '叢林中的精靈神射手，百步穿楊無一虛發',
    stats: { atk: 240, def:  70, hpMax: 500, crit: 18, critDmg: 38, hit: 12, walkSpeedPct: 25, atkSpeedPct: 27 } },
  { id: 't_reya', name: '雷雅', rarity: 'gold', spriteKey: 'reya',
    classRestriction: 'rogue',
    desc: '暗夜中的精靈刺客，閃電般的致命一擊',
    stats: { atk: 280, def:  60, hpMax: 480, crit: 22, critDmg: 45, dodge:  8, walkSpeedPct: 28, atkSpeedPct: 30 } },
  { id: 't_baphomet', name: '巴風特', rarity: 'gold', spriteKey: 'baphomet',
    classRestriction: ['mage', 'warlock'],
    desc: '深淵君主，操控黑暗魔法的惡魔領主',
    stats: { atk: 260, def:  80, hpMax: 550, mpMax: 280, crit: 15, critDmg: 40, hit:  8, walkSpeedPct: 22, atkSpeedPct: 24 } },

  // ===== 紫色傳說（7張） =====
  { id: 't_demon_hunter', name: '獵魔手', rarity: 'purple', spriteKey: 'demon_hunter',
    classRestriction: 'archer',
    desc: '狩獵惡魔的精銳射手，箭無虛發',
    stats: { atk: 130, def: 25, hpMax: 250, crit: 12, critDmg: 25, hit: 8, walkSpeedPct: 15, atkSpeedPct: 18 } },
  { id: 't_illusionist', name: '幻術師', rarity: 'purple', spriteKey: 'illusionist',
    classRestriction: ['mage', 'warlock'],
    desc: '操控幻術的法師，真假難辨',
    stats: { atk: 135, def: 20, hpMax: 230, mpMax: 160, crit: 10, critDmg: 22, walkSpeedPct: 14, atkSpeedPct: 16 } },
  { id: 't_anubis', name: '阿努比斯', rarity: 'purple', spriteKey: 'anubis',
    classRestriction: 'mage',
    desc: '死亡之神的化身，掌控亡靈與審判',
    stats: { atk: 140, def: 25, hpMax: 240, mpMax: 180, crit: 11, critDmg: 24, walkSpeedPct: 13, atkSpeedPct: 15 } },
  { id: 't_chaos_knight', name: '混沌騎士', rarity: 'purple', spriteKey: 'chaos_knight',
    classRestriction: 'warrior',
    desc: '混沌陣營的重裝騎士，力量壓倒一切',
    stats: { atk: 120, def: 55, hpMax: 420, mpMax: 50, crit: 6, critDmg: 18, hit: 5, walkSpeedPct: 13, atkSpeedPct: 15 } },
  { id: 't_shadow_assassin', name: '暗影刺客', rarity: 'purple', spriteKey: 'shadow_assassin',
    classRestriction: 'rogue',
    desc: '潛伏暗影中的殺手，一擊必殺',
    stats: { atk: 125, def: 18, hpMax: 220, crit: 18, critDmg: 30, dodge: 6, walkSpeedPct: 18, atkSpeedPct: 20 } },
  { id: 't_holy_envoy', name: '聖使', rarity: 'purple', spriteKey: 'holy_envoy',
    classRestriction: 'paladin',
    desc: '聖光的使者，神聖之力守護正義',
    stats: { atk: 110, def: 60, hpMax: 480, mpMax: 80, crit: 5, critDmg: 15, hit: 6, walkSpeedPct: 12, atkSpeedPct: 14 } },
  { id: 't_divine_envoy', name: '神使', rarity: 'purple', spriteKey: 'divine_envoy',
    classRestriction: null,
    desc: '神之使者，全職業皆可感召其力量',
    stats: { atk: 100, def: 40, hpMax: 350, mpMax: 120, crit: 8, critDmg: 20, hit: 5, dodge: 3, walkSpeedPct: 14, atkSpeedPct: 16 } },

  // ===== 紅色史詩（7張） =====
  { id: 't_balrog', name: '炎魔', rarity: 'red', spriteKey: 'balrog',
    classRestriction: null,
    desc: '來自深淵的火焰惡魔，焚盡一切',
    stats: { atk: 180, def: 45, hpMax: 380, mpMax: 100, crit: 10, critDmg: 28, hit: 6, walkSpeedPct: 16, atkSpeedPct: 18 } },
  { id: 't_dark_knight_red', name: '黑暗騎士', rarity: 'red', spriteKey: 'dark_knight_red',
    classRestriction: 'warrior',
    desc: '墮落的黑暗騎士，揮舞魔劍斬殺一切',
    stats: { atk: 120, def: 35, hpMax: 300, mpMax: 40, crit: 7, critDmg: 20, hit: 5, walkSpeedPct: 12, atkSpeedPct: 13 } },
  { id: 't_dark_mage_red', name: '黑暗法師', rarity: 'red', spriteKey: 'dark_mage_red',
    classRestriction: 'mage',
    desc: '操控黑暗魔法的法師，汲取亡靈之力',
    stats: { atk: 110, def: 18, hpMax: 170, mpMax: 220, crit: 8, critDmg: 20, walkSpeedPct: 10, atkSpeedPct: 12 } },
  { id: 't_dark_sorcerer', name: '黑魔導', rarity: 'red', spriteKey: 'dark_sorcerer',
    classRestriction: ['mage', 'warlock'],
    desc: '最強黑魔導士，深淵奧義的掌握者',
    stats: { atk: 115, def: 16, hpMax: 160, mpMax: 240, crit: 9, critDmg: 22, walkSpeedPct: 11, atkSpeedPct: 13 } },
  { id: 't_dark_assassin_red', name: '黑暗刺客', rarity: 'red', spriteKey: 'dark_assassin_red',
    classRestriction: 'rogue',
    desc: '來自深淵的刺客，暗影中的致命一擊',
    stats: { atk: 115, def: 15, hpMax: 180, crit: 15, critDmg: 26, dodge: 5, walkSpeedPct: 17, atkSpeedPct: 19 } },
  { id: 't_ghost_archer', name: '幽冥弓箭手', rarity: 'red', spriteKey: 'ghost_archer',
    classRestriction: 'archer',
    desc: '幽冥的靈魂射手，箭矢穿靈奪魂',
    stats: { atk: 110, def: 20, hpMax: 180, crit: 12, critDmg: 24, hit: 8, walkSpeedPct: 14, atkSpeedPct: 16 } },
  { id: 't_silver_knight_galahad', name: '銀騎士蓋拉德', rarity: 'red', spriteKey: 'silver_knight_galahad',
    classRestriction: 'paladin',
    desc: '聖銀騎士團團長，以聖光守護王國',
    stats: { atk: 95, def: 65, hpMax: 400, mpMax: 60, crit: 5, critDmg: 18, hit: 6, walkSpeedPct: 11, atkSpeedPct: 12 } },

  // ===== 藍色稀有（12張） =====
  { id: 't_frost_knight', name: '冰霜騎士', rarity: 'blue', spriteKey: 'frost_knight',
    classRestriction: 'warrior',
    desc: '凍結一切的冰霜騎士，揮舞寒冰利刃',
    stats: { atk: 80, def: 35, hpMax: 220, mpMax: 50, crit: 5, critDmg: 15, hit: 4, walkSpeedPct: 10, atkSpeedPct: 10 } },
  { id: 't_berserker_blue', name: '狂戰士', rarity: 'blue', spriteKey: 'berserker_blue',
    classRestriction: 'warrior',
    desc: '憤怒的狂戰士，戰鬥中越戰越狂',
    stats: { atk: 95, def: 20, hpMax: 200, crit: 7, critDmg: 18, hit: 5, walkSpeedPct: 11, atkSpeedPct: 12 } },
  { id: 't_frost_mage', name: '冰霜法師', rarity: 'blue', spriteKey: 'frost_mage',
    classRestriction: 'mage',
    desc: '操控寒冰魔法的法師，冰封萬物',
    stats: { atk: 90, def: 15, hpMax: 140, mpMax: 180, crit: 6, critDmg: 16, walkSpeedPct: 9, atkSpeedPct: 10 } },
  { id: 't_lightning_mage', name: '雷電法師', rarity: 'blue', spriteKey: 'lightning_mage',
    classRestriction: 'mage',
    desc: '召喚雷電的法師，閃電劈敵',
    stats: { atk: 95, def: 12, hpMax: 130, mpMax: 200, crit: 8, critDmg: 18, walkSpeedPct: 10, atkSpeedPct: 12 } },
  { id: 't_elf_archer_blue', name: '精靈射手', rarity: 'blue', spriteKey: 'elf_archer_blue',
    classRestriction: 'archer',
    desc: '精靈族的神射手，箭無虛發',
    stats: { atk: 85, def: 18, hpMax: 150, crit: 10, critDmg: 20, hit: 7, walkSpeedPct: 12, atkSpeedPct: 13 } },
  { id: 't_wind_walker', name: '風行者', rarity: 'blue', spriteKey: 'wind_walker',
    classRestriction: ['archer', 'rogue'],
    desc: '疾風般的遊俠，身形敏捷箭術精湛',
    stats: { atk: 75, def: 20, hpMax: 160, crit: 9, critDmg: 19, dodge: 5, walkSpeedPct: 15, atkSpeedPct: 14 } },
  { id: 't_silver_knight_blue', name: '白銀騎士', rarity: 'blue', spriteKey: 'silver_knight_blue',
    classRestriction: 'paladin',
    desc: '身披銀白鎧甲的騎士，以聖光守護正義',
    stats: { atk: 70, def: 40, hpMax: 240, mpMax: 60, crit: 4, critDmg: 14, hit: 5, walkSpeedPct: 9, atkSpeedPct: 9 } },
  { id: 't_temple_knight', name: '聖殿騎士', rarity: 'blue', spriteKey: 'temple_knight',
    classRestriction: 'paladin',
    desc: '聖殿的守護者，神聖之力賜予其堅毅與勇氣',
    stats: { atk: 65, def: 45, hpMax: 260, mpMax: 80, crit: 3, critDmg: 12, hit: 4, walkSpeedPct: 8, atkSpeedPct: 8 } },
  { id: 't_shadow_assassin_blue', name: '暗影刺客', rarity: 'blue', spriteKey: 'shadow_assassin_blue',
    classRestriction: 'rogue',
    desc: '潛伏暗影的刺客，出手悄無聲息',
    stats: { atk: 85, def: 15, hpMax: 140, crit: 11, critDmg: 22, dodge: 4, walkSpeedPct: 14, atkSpeedPct: 15 } },
  { id: 't_poison_blade', name: '毒刃', rarity: 'blue', spriteKey: 'poison_blade',
    classRestriction: 'rogue',
    desc: '淬毒的利刃，一擊即中必死無疑',
    stats: { atk: 80, def: 18, hpMax: 150, crit: 9, critDmg: 20, dodge: 6, walkSpeedPct: 13, atkSpeedPct: 13 } },
  { id: 't_gargoyle', name: '石像鬼', rarity: 'blue', spriteKey: 'gargoyle',
    classRestriction: null,
    desc: '石頭鑄成的守衛，堅硬如岩石',
    stats: { atk: 60, def: 50, hpMax: 280, mpMax: 30, crit: 2, critDmg: 10, hit: 3, walkSpeedPct: 6, atkSpeedPct: 7 } },
  { id: 't_werewolf', name: '狼人', rarity: 'blue', spriteKey: 'werewolf',
    classRestriction: null,
    desc: '月光下的野獸，狂暴嗜血',
    stats: { atk: 90, def: 22, hpMax: 200, crit: 8, critDmg: 18, hit: 6, walkSpeedPct: 13, atkSpeedPct: 14 } },

  // ===== 綠色精良（5張） =====
  { id: 't_forest_guardian', name: '森林守護者', rarity: 'green', spriteKey: 'forest_guardian',
    classRestriction: null,
    desc: '森林的守護精靈，以自然之力庇護萬物',
    stats: { atk: 45, def: 20, hpMax: 140, mpMax: 60, crit: 3, critDmg: 10, hit: 3, walkSpeedPct: 6, atkSpeedPct: 6 } },
  { id: 't_wind_spirit', name: '風精靈', rarity: 'green', spriteKey: 'wind_spirit',
    classRestriction: null,
    desc: '清風化身的精靈，敏捷而飄逸',
    stats: { atk: 40, def: 12, hpMax: 100, mpMax: 80, crit: 5, critDmg: 12, dodge: 4, walkSpeedPct: 10, atkSpeedPct: 10 } },
  { id: 't_green_dragon', name: '綠龍', rarity: 'green', spriteKey: 'green_dragon',
    classRestriction: null,
    desc: '森林中的年輕龍族，噴吐毒霧',
    stats: { atk: 55, def: 25, hpMax: 160, mpMax: 50, crit: 4, critDmg: 12, hit: 4, walkSpeedPct: 7, atkSpeedPct: 7 } },
  { id: 't_druid', name: '德魯伊', rarity: 'green', spriteKey: 'druid',
    classRestriction: null,
    desc: '自然的使者，操縱植物與野獸之力',
    stats: { atk: 42, def: 18, hpMax: 130, mpMax: 100, crit: 3, critDmg: 10, hit: 3, walkSpeedPct: 6, atkSpeedPct: 6 } },
  { id: 't_treant', name: '樹人', rarity: 'green', spriteKey: 'treant',
    classRestriction: null,
    desc: '古老樹木甦醒而成的守衛，堅硬無比',
    stats: { atk: 35, def: 30, hpMax: 180, mpMax: 20, crit: 2, critDmg: 8, hit: 2, walkSpeedPct: 4, atkSpeedPct: 5 } },

  // ===== 白色普通（5張） =====
  { id: 't_white_dragon', name: '白龍', rarity: 'white', spriteKey: 'white_dragon',
    classRestriction: null,
    desc: '聖潔的白龍，象徵純淨與祥瑞',
    stats: { atk: 25, def: 12, hpMax: 80, mpMax: 30, crit: 2, critDmg: 6, hit: 2, walkSpeedPct: 4, atkSpeedPct: 4 } },
  { id: 't_angel_white', name: '天使', rarity: 'white', spriteKey: 'angel_white',
    classRestriction: null,
    desc: '神聖的天使，帶來光明與祝福',
    stats: { atk: 20, def: 10, hpMax: 70, mpMax: 50, crit: 1, critDmg: 5, hit: 2, walkSpeedPct: 3, atkSpeedPct: 3 } },
  { id: 't_unicorn', name: '獨角獸', rarity: 'white', spriteKey: 'unicorn',
    classRestriction: null,
    desc: '神秘的獨角獸，高貴而優雅',
    stats: { atk: 22, def: 11, hpMax: 75, mpMax: 40, crit: 2, critDmg: 6, dodge: 2, walkSpeedPct: 5, atkSpeedPct: 4 } },
  { id: 't_holy_spirit', name: '聖靈', rarity: 'white', spriteKey: 'holy_spirit',
    classRestriction: null,
    desc: '純粹的聖靈之體，輕盈飄渺',
    stats: { atk: 18, def: 8, hpMax: 60, mpMax: 60, crit: 1, critDmg: 5, hit: 1, walkSpeedPct: 4, atkSpeedPct: 3 } },
  { id: 't_white_wolf', name: '白狼', rarity: 'white', spriteKey: 'white_wolf',
    classRestriction: null,
    desc: '雪原中的白狼，敏銳而迅捷',
    stats: { atk: 28, def: 9, hpMax: 65, mpMax: 10, crit: 3, critDmg: 7, hit: 2, walkSpeedPct: 6, atkSpeedPct: 6 } },
];

// 判斷職業限制是否匹配（支持 string / string[] / null）
function isClassRestrictionMatched(restriction, playerClass) {
  if (!restriction) return true; // null/空 表示通用
  if (Array.isArray(restriction)) return restriction.indexOf(playerClass) >= 0;
  return restriction === playerClass;
}

// 變身抽卡（消耗鑽石）
function doTransformGacha(mode) {
  // mode: 'single' | 'ten' | 'big'
  if (window.AudioSystem) AudioSystem.sfxGacha();
  let actualCount, cost, guaranteedMin;
  if (mode === 'big') { actualCount = 35; cost = GACHA_COST_BIG; guaranteedMin = 2; /* blue */ }
  else if (mode === 'ten') { actualCount = 11; cost = GACHA_COST_TEN; guaranteedMin = 1; /* green */ }
  else { actualCount = 1; cost = GACHA_COST_SINGLE; guaranteedMin = 0; }
  if (GS.resources.gem < cost) {
    alert('鑽石不足！');
    return [];
  }
  GS.resources.gem -= cost;
  const results = [];
  const rarityRank = { white: 0, green: 1, blue: 2, red: 3, purple: 4, gold: 5 };
  if (!GS.ownedTransforms) GS.ownedTransforms = [];
  for (let i = 0; i < actualCount; i++) {
    let rarity = rollRarity();
    // 最後一張保底
    if (i === actualCount - 1 && guaranteedMin > 0) {
      const hasGood = results.some(r => rarityRank[r.rarity] >= guaranteedMin);
      if (!hasGood) rarity = rarityOrderArr[guaranteedMin];
    }
    const candidates = TRANSFORM_POOL.filter(t => t.rarity === rarity);
    const item = candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : TRANSFORM_POOL[0];
    const withType = { ...item, type: 'transform' };
    withType._isNew = !GS.ownedTransforms.find(t => t.id === item.id);
    results.push(withType);
    // 加入已擁有列表（去重）
    if (!GS.ownedTransforms.find(t => t.id === item.id)) {
      GS.ownedTransforms.push({ id: item.id, name: item.name, rarity: item.rarity, unlocked: true });
      addLog('system', `解鎖新變身：${item.name}（${RARITY_CONFIG[item.rarity]?.name || item.rarity}）`);
    }
  }
  updateUI();
  // 史詩以上全服公告
  announceGachaResults(results, '變身');
  return results;
}

// ==================== 稀有度配置 ====================
const RARITY_CONFIG = {
  white:  { order: 0, name: '普通', color: '#aaaaaa', glow: 'rgba(170,170,170,0.5)' },
  green:  { order: 1, name: '精良', color: '#60d060', glow: 'rgba(96,208,96,0.6)' },
  blue:   { order: 2, name: '稀有', color: '#60a0ff', glow: 'rgba(96,160,255,0.6)' },
  red:    { order: 3, name: '史詩', color: '#e05050', glow: 'rgba(224,80,80,0.6)' },
  purple: { order: 4, name: '傳說', color: '#c060ff', glow: 'rgba(192,96,255,0.6)' },
  gold:   { order: 5, name: '神話', color: '#ffcc40', glow: 'rgba(255,204,64,0.7)' },
};
// 國家旗幟 / 軍團徽章 / 國家 Tab 圖資
const NATION_TAB_ICONS = {
  office: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfgcyuadw_ve_miaoda', // 官職頭盔
  legion: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfdqqacds_ve_miaoda', // 軍團徽章
  castle: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrffy7a4cw_ve_miaoda', // 城堡
  donate: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfdnbcygu_ve_miaoda', // 捐獻錢袋
  skill:  '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfgii4ocw_ve_miaoda', // 技能樹
  sword:  '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrgfjm22sw_ve_miaoda', // 劍
  shield: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrglc2tmlw_ve_miaoda', // 盾
  crown:  '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrgnkrywaw_ve_miaoda', // 王冠
  gem:    '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfex8k9fu_ve_miaoda', // 寶石
  scroll: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfs7r3qws_ve_miaoda', // 卷軸
  members:'/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrgmr7pucs_ve_miaoda', // 成員
  war:    '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrgkym66hs_ve_miaoda', // 宣戰
  treasury:'/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrgkf6f2bw_ve_miaoda', // 國庫
};

const RARITY_ORDER = ['white', 'green', 'blue', 'red', 'purple', 'gold'];

// ==================== 道具 / 裝備圖資配置 ====================
// 自動道具可選目錄（與遊戲內道具ID一致，用於設置面板下拉選擇）
const AUTO_ITEMS_CATALOG = [
  // HP 藥水
  { id: 'hp1',         name: '小型生命藥水', icon: 'hp1',    type: 'hp', rarity: 'white', price: 40,  threshold: true  },
  { id: 'hp2',         name: '中型生命藥水', icon: 'hp2',    type: 'hp', rarity: 'green', price: 120, threshold: true  },
  { id: 'hp3',         name: '大型生命藥水', icon: 'hp3',    type: 'hp', rarity: 'blue',  price: 300, threshold: true  },
  { id: 'hp_potion',   name: 'HP藥水',       icon: 'hp1',    type: 'hp', rarity: 'white', price: 40,  threshold: true  },
  // MP 藥水
  { id: 'mp1',         name: '小型魔力藥水', icon: 'mp1',    type: 'mp', rarity: 'white', price: 60,  threshold: true  },
  { id: 'mp2',         name: '中型魔力藥水', icon: 'mp2',    type: 'mp', rarity: 'green', price: 180, threshold: true  },
  { id: 'mp3',         name: '大型魔力藥水', icon: 'mp3',    type: 'mp', rarity: 'blue',  price: 400, threshold: true  },
  { id: 'mp_potion',   name: 'MP藥水',       icon: 'mp1',    type: 'mp', rarity: 'white', price: 60,  threshold: true  },
  // Buff 藥水
  { id: 'spd1',        name: '加速藥水',     icon: 'spd1',   type: 'buff', rarity: 'blue', price: 400, threshold: false, buffKey: 'atkspd' },
  { id: 'spd2',        name: '狂暴藥水',     icon: 'spd2',   type: 'buff', rarity: 'red',  price: 800, threshold: false, buffKey: 'atkpot' },
  { id: 'move1',       name: '行走加速藥水', icon: 'move1',  type: 'buff', rarity: 'green', price: 200, threshold: false, buffKey: 'movespd' },
  // 卷軸
  { id: 'town_scroll', name: '回城卷軸',     icon: 'teleport', type: 'scroll', rarity: 'green', price: 150, threshold: false },
];

const ITEM_ICONS = {
  // 藥水
  hp1: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkre6rzvuuu_ve_miaoda',
  hp2: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfai2wohu_ve_miaoda',
  hp3: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkre7ldugrs_ve_miaoda',
  mp1: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfbebe2cs_ve_miaoda',
  mp2: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkre6sdzwfw_ve_miaoda',
  mp3: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrew2vdilu_ve_miaoda',
  spd1: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfb3dtmyg_ve_miaoda',
  spd2: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfa6aaafi_ve_miaoda',
  move1: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfb6yoycg_ve_miaoda',
  mgem: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrezgwcqbi_ve_miaoda',
  teleport: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkre45m5ubg_ve_miaoda',
  enhance_ticket: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkre3ofscho_ve_miaoda',
  chest: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkre5cpgsao_ve_miaoda',
  tscroll: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfs7r3qws_ve_miaoda', // 變身卷軸
  // 新增道具（不重複現有）
  hp4: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkre7ldugrs_ve_miaoda', // 高級生命藥水
  mp4: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrew2vdilu_ve_miaoda', // 高級魔力藥水
  atk_potion: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfa6aaafi_ve_miaoda', // 力量藥水
  def_potion: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfb3dtmyg_ve_miaoda', // 防禦藥水
  crit_potion: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrezgwcqbi_ve_miaoda', // 暴擊藥水
  revive_scroll: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkre45m5ubg_ve_miaoda', // 復活卷軸
  escape_scroll: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfb6yoycg_ve_miaoda', // 脫身卷軸
  enhance_stone: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkre3ofscho_ve_miaoda', // 強化石
  bless_stone: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkre5cpgsao_ve_miaoda', // 祝福石
  crystal_frag: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfbebe2cs_ve_miaoda', // 靈魂水晶碎片
  gold_coin: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrew2vdilu_ve_miaoda', // 金幣袋
  gem_bag: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkre6rzvuuu_ve_miaoda', // 鑽石袋
  dungeon_key: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkre6sdzwfw_ve_miaoda', // 副本鑰匙
  treasure_key: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfai2wohu_ve_miaoda', // 寶箱鑰匙
  quest_scroll: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkre7ldugrs_ve_miaoda', // 任務卷軸
  ancient_book: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfs7r3qws_ve_miaoda', // 遠古書籍
  monster_eye: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkre3ggryag_ve_miaoda', // 怪物之眼
  dragon_scale: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkre7ci4cii_ve_miaoda', // 龍鱗
  // 裝備類型通用圖資
  weapon: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkreyaga6gi_ve_miaoda',
  armor: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkre7ci4cii_ve_miaoda',
  helmet: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkre3ggryag_ve_miaoda',
  ring: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkre7f33iei_ve_miaoda',
  gem: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfa6t3kig_ve_miaoda',
};

// 獲取道具圖資 URL（道具ID優先，裝備按類型回落）
function getItemIconUrl(item) {
  if (!item) return ITEM_ICONS.chest;
  if (item.id && ITEM_ICONS[item.id]) return ITEM_ICONS[item.id];
  if (item.id && item.id.startsWith('hp')) return ITEM_ICONS.hp2;
  if (item.id && item.id.startsWith('mp')) return ITEM_ICONS.mp2;
  if (item.type && ITEM_ICONS[item.type]) return ITEM_ICONS[item.type];
  if (item.itemType === 'consumable') return ITEM_ICONS.hp2;
  return ITEM_ICONS.chest;
}

// ==================== 裝備配置 ====================
const EQUIP_SLOTS = [
  { id: 'helmet',  name: '頭盔',   pos: 'top-center' },
  { id: 'necklace', name: '項鍊',  pos: 'neck' },
  { id: 'weapon',  name: '武器',   pos: 'left-hand' },
  { id: 'armor',   name: '鎧甲',   pos: 'chest' },
  { id: 'cape',    name: '披風',   pos: 'back' },
  { id: 'gloves',  name: '手套',   pos: 'gloves' },
  { id: 'pants',   name: '護腿',   pos: 'legs' },
  { id: 'ring1',   name: '戒指1',  pos: 'ring-left' },
  { id: 'ring2',   name: '戒指2',  pos: 'ring-right' },
  { id: 'belt',    name: '腰帶',   pos: 'waist' },
  { id: 'boots',   name: '靴子',   pos: 'feet' },
];

// 裝備部位對應圖標（暗黑天堂風）
const EQUIP_ICON_MAP = {
  helmet:   '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfj7i7aho_ve_miaoda', // 頭盔
  armor:    '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfj7i7ago_ve_miaoda', // 鎧甲
  weapon:   '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfjwe3khg_ve_miaoda', // 武器
  necklace: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfjfxl2bi_ve_miaoda', // 項鍊
  ring:     '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfhczsqag_ve_miaoda', // 戒指
  ring1:    '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfhczsqag_ve_miaoda', // 戒指
  ring2:    '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfhczsqag_ve_miaoda',
  boots:    '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfexej6gi_ve_miaoda', // 靴子
  gloves:   '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfec7nuci_ve_miaoda', // 手套
  belt:     '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfjadsadi_ve_miaoda', // 腰帶
  cape:     '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrffprd4fo_ve_miaoda', // 披風
  pants:    '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfrk3g6fs_ve_miaoda', // 護腿
};

// 道具/消耗品圖標
// 道具/消耗品圖標
const ITEM_ICON_MAP = {
  potion_hp: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfkn7dqso_ve_miaoda', // 紅藥
  potion_mp: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfjhiwibi_ve_miaoda', // 藍藥
  scroll:    '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfjvprofq_ve_miaoda', // 卷軸
  gem:       '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfhczsqag_ve_miaoda', // 寶石（暫用戒指圖）
  default:   '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfkn7dqso_ve_miaoda',
};

// 取得裝備圖標 URL（按類型）
function getEquipIcon(type) {
  return EQUIP_ICON_MAP[type] || EQUIP_ICON_MAP.weapon;
}

const EQUIP_TYPES = {
  weapon:    { name: '武器',   slot: 'weapon' },
  armor:     { name: '鎧甲',   slot: 'armor' },
  helmet:    { name: '頭盔',   slot: 'helmet' },
  boots:     { name: '靴子',   slot: 'boots' },
  accessory: { name: '飾品',   slot: 'accessory' },
};

const EQUIP_POOL = [
  // 武器
  { id: 'w1', type: 'weapon', name: '破旧短劍', rarity: 'white',  baseStats: { atk: 5 } },
  { id: 'w2', type: 'weapon', name: '精铁長劍', rarity: 'green',  baseStats: { atk: 12 } },
  { id: 'w3', type: 'weapon', name: '烈焰刀', rarity: 'blue',    baseStats: { atk: 25, crit: 3 } },
  { id: 'w4', type: 'weapon', name: '寒冰戰斧', rarity: 'blue',  baseStats: { atk: 28, critDmg: 10 } },
  { id: 'w5', type: 'weapon', name: '炼狱魔劍', rarity: 'red',   baseStats: { atk: 50, crit: 5, critDmg: 15 } },
  { id: 'w6', type: 'weapon', name: '龍鳞之刃', rarity: 'purple', baseStats: { atk: 90, crit: 8, critDmg: 20 } },
  { id: 'w7', type: 'weapon', name: '诸神黄昏', rarity: 'gold',  baseStats: { atk: 160, crit: 15, critDmg: 30 } },
  // 护甲
  { id: 'a1', type: 'armor', name: '布甲', rarity: 'white',     baseStats: { def: 3, hpMax: 20 } },
  { id: 'a2', type: 'armor', name: '皮甲', rarity: 'green',     baseStats: { def: 8, hpMax: 40 } },
  { id: 'a3', type: 'armor', name: '锁子甲', rarity: 'blue',    baseStats: { def: 15, hpMax: 80 } },
  { id: 'a4', type: 'armor', name: '板甲', rarity: 'red',       baseStats: { def: 30, hpMax: 150 } },
  { id: 'a5', type: 'armor', name: '龍鳞铠', rarity: 'purple',  baseStats: { def: 55, hpMax: 280 } },
  { id: 'a6', type: 'armor', name: '神聖戰甲', rarity: 'gold',  baseStats: { def: 100, hpMax: 500, atk: 20 } },
  // 头盔
  { id: 'h1', type: 'helmet', name: '皮帽', rarity: 'white',    baseStats: { def: 2, hpMax: 10 } },
  { id: 'h2', type: 'helmet', name: '铁盔', rarity: 'green',    baseStats: { def: 5, hpMax: 25 } },
  { id: 'h3', type: 'helmet', name: '骑士盔', rarity: 'blue',   baseStats: { def: 10, hpMax: 60 } },
  { id: 'h4', type: 'helmet', name: '智者冠', rarity: 'red',    baseStats: { def: 15, hpMax: 80, atk: 8 } },
  { id: 'h5', type: 'helmet', name: '王者冕', rarity: 'purple', baseStats: { def: 30, hpMax: 150, crit: 5 } },
  // 鞋子
  { id: 'b1', type: 'boots', name: '布鞋', rarity: 'white',     baseStats: { def: 1, hpMax: 5 } },
  { id: 'b2', type: 'boots', name: '皮靴', rarity: 'green',     baseStats: { def: 3, hpMax: 15 } },
  { id: 'b3', type: 'boots', name: '疾风靴', rarity: 'blue',    baseStats: { def: 6, crit: 3 } },
  { id: 'b4', type: 'boots', name: '暗夜之靴', rarity: 'red',   baseStats: { def: 12, crit: 8, critDmg: 10 } },
  { id: 'b5', type: 'boots', name: '神行戰靴', rarity: 'purple',baseStats: { def: 20, crit: 12, critDmg: 15 } },
  { id: 'b6', type: 'boots', name: '風神之靴', rarity: 'gold',  baseStats: { def: 35, crit: 18, critDmg: 25, hpMax: 200 } },
  // 护腿
  { id: 'p1', type: 'pants', name: '布裤', rarity: 'white',     baseStats: { def: 2, hpMax: 8 } },
  { id: 'p2', type: 'pants', name: '皮裤', rarity: 'green',     baseStats: { def: 5, hpMax: 20 } },
  { id: 'p3', type: 'pants', name: '锁子腿甲', rarity: 'blue',  baseStats: { def: 10, hpMax: 45 } },
  { id: 'p4', type: 'pants', name: '板甲護腿', rarity: 'red',   baseStats: { def: 20, hpMax: 100 } },
  { id: 'p5', type: 'pants', name: '龍鱗護腿', rarity: 'purple',baseStats: { def: 38, hpMax: 220 } },
  { id: 'p6', type: 'pants', name: '黃金戰裙', rarity: 'gold',  baseStats: { def: 65, hpMax: 400, atk: 10 } },
  // 手套
  { id: 'g1', type: 'gloves', name: '布手套', rarity: 'white',  baseStats: { def: 1, atk: 1 } },
  { id: 'g2', type: 'gloves', name: '皮手套', rarity: 'green',  baseStats: { def: 2, atk: 3 } },
  { id: 'g3', type: 'gloves', name: '鐵護手', rarity: 'blue',   baseStats: { def: 5, atk: 8, crit: 2 } },
  { id: 'g4', type: 'gloves', name: '力量之握', rarity: 'red',  baseStats: { def: 10, atk: 18, crit: 5 } },
  { id: 'g5', type: 'gloves', name: '毀滅手甲', rarity: 'purple',baseStats: { def: 18, atk: 35, crit: 10 } },
  { id: 'g6', type: 'gloves', name: '創世之握', rarity: 'gold', baseStats: { def: 30, atk: 60, crit: 15, critDmg: 20 } },
  // 项链
  { id: 'n1', type: 'necklace', name: '铜项链', rarity: 'white', baseStats: { hpMax: 10 } },
  { id: 'n2', type: 'necklace', name: '银项链', rarity: 'green', baseStats: { hpMax: 30, def: 2 } },
  { id: 'n3', type: 'necklace', name: '金護符', rarity: 'blue',  baseStats: { atk: 8, def: 4, hpMax: 50 } },
  { id: 'n4', type: 'necklace', name: '智慧项链', rarity: 'red', baseStats: { atk: 15, critDmg: 10, hpMax: 80 } },
  { id: 'n5', type: 'necklace', name: '龍魂項鍊', rarity: 'purple', baseStats: { atk: 25, critDmg: 20, hpMax: 150 } },
  { id: 'n6', type: 'necklace', name: '永恆墜飾', rarity: 'gold', baseStats: { atk: 45, critDmg: 30, hpMax: 300, def: 15 } },
  // 戒指
  { id: 'r1', type: 'ring', name: '铜戒指', rarity: 'white',    baseStats: { atk: 2 } },
  { id: 'r2', type: 'ring', name: '银戒指', rarity: 'green',    baseStats: { atk: 5, def: 2 } },
  { id: 'r3', type: 'ring', name: '紅寶石戒指', rarity: 'blue', baseStats: { atk: 12, crit: 3 } },
  { id: 'r4', type: 'ring', name: '龍魂戒指', rarity: 'red',    baseStats: { atk: 25, crit: 6, critDmg: 12 } },
  { id: 'r5', type: 'ring', name: '破魔戒指', rarity: 'purple', baseStats: { atk: 40, crit: 10, critDmg: 18 } },
  { id: 'r6', type: 'ring', name: '永恆之戒', rarity: 'gold',   baseStats: { atk: 70, crit: 15, critDmg: 25, def: 10 } },
  // 披风
  { id: 'c1', type: 'cape', name: '布披风', rarity: 'white',    baseStats: { def: 2, hpMax: 10 } },
  { id: 'c2', type: 'cape', name: '皮披风', rarity: 'green',    baseStats: { def: 5, hpMax: 25 } },
  { id: 'c3', type: 'cape', name: '魔法斗篷', rarity: 'blue',   baseStats: { def: 10, hpMax: 50, atk: 5 } },
  { id: 'c4', type: 'cape', name: '龍翼披风', rarity: 'red',    baseStats: { def: 20, hpMax: 120, atk: 12, crit: 3 } },
  { id: 'c5', type: 'cape', name: '鳳凰披風', rarity: 'purple', baseStats: { def: 35, hpMax: 250, atk: 20, crit: 5 } },
  { id: 'c6', type: 'cape', name: '不朽斗篷', rarity: 'gold',   baseStats: { def: 60, hpMax: 450, atk: 30, crit: 10 } },
  // 腰带
  { id: 'w1', type: 'belt', name: '布腰帶', rarity: 'white',    baseStats: { hpMax: 8 } },
  { id: 'w2', type: 'belt', name: '皮腰帶', rarity: 'green',    baseStats: { hpMax: 20, def: 2 } },
  { id: 'w3', type: 'belt', name: '铁腰甲', rarity: 'blue',     baseStats: { hpMax: 50, def: 6 } },
  { id: 'w4', type: 'belt', name: '力量腰帶', rarity: 'red',    baseStats: { hpMax: 100, def: 12, atk: 8 } },
  { id: 'w5', type: 'belt', name: '巨龍腰帶', rarity: 'purple', baseStats: { hpMax: 200, def: 22, atk: 15 } },
  { id: 'w6', type: 'belt', name: '神王腰帶', rarity: 'gold',   baseStats: { hpMax: 380, def: 40, atk: 25, crit: 5 } },
  // 饰品（兼容旧数据）
  { id: 'acc1', type: 'accessory', name: '铜戒指', rarity: 'white', baseStats: { atk: 2 } },
  { id: 'acc2', type: 'accessory', name: '银项链', rarity: 'green', baseStats: { atk: 5, def: 2 } },
  { id: 'c3', type: 'accessory', name: '金護符', rarity: 'blue',  baseStats: { atk: 10, def: 5, hpMax: 30 } },
  { id: 'c4', type: 'accessory', name: '紅寶石', rarity: 'red',   baseStats: { atk: 20, crit: 5, critDmg: 10 } },
  { id: 'c5', type: 'accessory', name: '龍之心', rarity: 'purple', baseStats: { atk: 40, def: 20, hpMax: 100 } },
  { id: 'c6', type: 'accessory', name: '世界樹之種', rarity: 'gold', baseStats: { atk: 60, def: 35, hpMax: 250, crit: 10 } },
];

// ==================== 裝備圖鑑·組合系統（66 種） ====================
// 分六大類：武器(15) / 防具(15) / 飾品(10) / 同品質套裝(12) / Boss掉落(8) / 全收藏(6)
const EQUIP_COMBOS = [
  // ===== 武器收集組合（15） =====
  { id: 'wc_white',  name: '初心兵器',   category: 'weapon', rarity: 'white',  items: ['w1'], stats: { atk: 2 }, desc: '白品武器' },
  { id: 'wc_green',  name: '綠鋒雙刃',   category: 'weapon', rarity: 'green',  items: ['w2'], stats: { atk: 5, hit: 2 }, desc: '綠品武器' },
  { id: 'wc_blue',   name: '藍焰兵器譜', category: 'weapon', rarity: 'blue',   items: ['w3','w4'], stats: { atk: 10, crit: 3 }, desc: '藍品武器×2' },
  { id: 'wc_red',    name: '煉獄魔刃',   category: 'weapon', rarity: 'red',    items: ['w5'], stats: { atk: 20, crit: 5, critDmg: 8 }, desc: '紅品武器' },
  { id: 'wc_purple', name: '龍鱗之鋒',   category: 'weapon', rarity: 'purple', items: ['w6'], stats: { atk: 35, crit: 7, critDmg: 12 }, desc: '紫品武器' },
  { id: 'wc_gold',   name: '諸神黃昏',   category: 'weapon', rarity: 'gold',   items: ['w7'], stats: { atk: 60, crit: 10, critDmg: 20 }, desc: '金品武器' },
  { id: 'wc_fire',   name: '熾焰雙刃',   category: 'weapon', rarity: 'blue',   items: ['w3','w5'], stats: { atk: 15, crit: 4 }, desc: '火焰系列武器' },
  { id: 'wc_ice',    name: '寒冰系列',   category: 'weapon', rarity: 'blue',   items: ['w4','w6'], stats: { atk: 18, critDmg: 10 }, desc: '寒冰系列武器' },
  { id: 'wc_blademaster', name: '劍士成長路', category: 'weapon', rarity: 'green', items: ['w1','w2','w3'], stats: { atk: 8, hit: 3 }, desc: '初→中→高劍士武器' },
  { id: 'wc_berserk', name: '狂戰兵器譜', category: 'weapon', rarity: 'red',    items: ['w4','w5','w6'], stats: { atk: 25, crit: 6, critDmg: 10 }, desc: '狂戰系武器×3' },
  { id: 'wc_ranged', name: '遠程神兵',   category: 'weapon', rarity: 'purple', items: ['w3','w6','w7'], stats: { atk: 30, crit: 8, critDmg: 15 }, desc: '強力遠程武器' },
  { id: 'wc_dual',   name: '雙刀之魂',   category: 'weapon', rarity: 'red',    items: ['w2','w5','w6'], stats: { atk: 22, crit: 7, atkSpeed: 3 }, desc: '雙刀流武器' },
  { id: 'wc_holy',   name: '聖潔聖劍',   category: 'weapon', rarity: 'purple', items: ['w2','w5','w7'], stats: { atk: 28, critDmg: 12, hpMax: 50 }, desc: '聖劍系列' },
  { id: 'wc_allblue',name: '藍級武器大全', category: 'weapon', rarity: 'blue', items: ['w3','w4'], stats: { atk: 12, crit: 5 }, desc: '全部藍品武器' },
  { id: 'wc_master', name: '武器大師',   category: 'weapon', rarity: 'gold',   items: ['w1','w2','w3','w4','w5','w6','w7'], stats: { atk: 50, crit: 12, critDmg: 25 }, desc: '全部7種武器' },

  // ===== 防具收集組合（15） =====
  { id: 'ac_white',  name: '初心護甲',   category: 'armor',  rarity: 'white',  items: ['a1','h1','b1','p1','g1'], stats: { def: 5, hpMax: 30 }, desc: '全部白品防具' },
  { id: 'ac_green',  name: '冒險者套裝', category: 'armor',  rarity: 'green',  items: ['a2','h2','b2','p2','g2'], stats: { def: 10, hpMax: 80 }, desc: '全部綠品防具' },
  { id: 'ac_blue',   name: '騎士團鎧甲', category: 'armor',  rarity: 'blue',   items: ['a3','h3','b3','p3','g3'], stats: { def: 20, hpMax: 150, evasion: 2 }, desc: '全部藍品防具' },
  { id: 'ac_red',    name: '將軍戰鎧',   category: 'armor',  rarity: 'red',    items: ['a4','h4','b4','p4','g4'], stats: { def: 35, hpMax: 250, crit: 5 }, desc: '全部紅品防具' },
  { id: 'ac_purple', name: '龍鱗戰鎧',   category: 'armor',  rarity: 'purple', items: ['a5','h5','b5','p5','g5'], stats: { def: 55, hpMax: 450, crit: 8, critDmg: 10 }, desc: '全部紫品防具' },
  { id: 'ac_gold',   name: '神聖套裝',   category: 'armor',  rarity: 'gold',   items: ['a6','b6','p6','g6'], stats: { def: 80, hpMax: 700, atk: 15, crit: 15 }, desc: '全部金品防具' },
  { id: 'ac_heavy',  name: '重甲鬥士',   category: 'armor',  rarity: 'blue',   items: ['a3','p3','h3'], stats: { def: 25, hpMax: 120 }, desc: '重裝三件套' },
  { id: 'ac_light',  name: '輕裝遊俠',   category: 'armor',  rarity: 'green',  items: ['a2','b2','p2'], stats: { def: 8, evasion: 3, moveSpeed: 2 }, desc: '輕甲三件套' },
  { id: 'ac_cloth',  name: '法袍系列',   category: 'armor',  rarity: 'blue',   items: ['a1','h1','g1','c3'], stats: { mpMax: 50, def: 10 }, desc: '法系防具套' },
  { id: 'ac_cape',   name: '披風收藏家', category: 'armor',  rarity: 'blue',   items: ['c1','c2','c3'], stats: { hpMax: 60, def: 12 }, desc: '初→中→高披風' },
  { id: 'ac_belt',   name: '腰甲強化',   category: 'armor',  rarity: 'red',    items: ['w3','w4'], stats: { hpMax: 100, def: 10 }, desc: '藍紅腰甲' },
  { id: 'ac_dragon', name: '巨龍守護',   category: 'armor',  rarity: 'purple', items: ['a5','p5','g5','c5'], stats: { def: 50, hpMax: 400, atk: 20 }, desc: '龍鱗系防具' },
  { id: 'ac_immortal',name: '不朽戰鎧',  category: 'armor',  rarity: 'gold',   items: ['a6','c6'], stats: { def: 60, hpMax: 500, atk: 25 }, desc: '不朽鎧甲' },
  { id: 'ac_boots',  name: '疾風戰靴',   category: 'armor',  rarity: 'blue',   items: ['b2','b3','b4'], stats: { moveSpeed: 5, evasion: 4, def: 10 }, desc: '靴子三件套' },
  { id: 'ac_full',   name: '全身鎧甲',   category: 'armor',  rarity: 'purple', items: ['a5','h5','b5','p5','g5','c5'], stats: { def: 70, hpMax: 600, crit: 10 }, desc: '六件套紫裝' },

  // ===== 飾品收集組合（10） =====
  { id: 'jc_white',  name: '銅質飾品',   category: 'accessory', rarity: 'white',  items: ['r1','n1'], stats: { atk: 2, hpMax: 15 }, desc: '白品飾品×2' },
  { id: 'jc_green',  name: '銀質套飾',   category: 'accessory', rarity: 'green',  items: ['r2','n2'], stats: { atk: 5, hpMax: 40, def: 3 }, desc: '綠品飾品×2' },
  { id: 'jc_blue',   name: '寶石飾品',   category: 'accessory', rarity: 'blue',   items: ['r3','n3'], stats: { atk: 15, hpMax: 60, crit: 3 }, desc: '藍品飾品×2' },
  { id: 'jc_red',    name: '龍魂飾品',   category: 'accessory', rarity: 'red',    items: ['r4','n4'], stats: { atk: 25, critDmg: 12, hpMax: 100 }, desc: '紅品飾品×2' },
  { id: 'jc_purple', name: '破魔套飾',   category: 'accessory', rarity: 'purple', items: ['r5','n5'], stats: { atk: 40, critDmg: 25, hpMax: 180, crit: 8 }, desc: '紫品飾品×2' },
  { id: 'jc_gold',   name: '永恆套飾',   category: 'accessory', rarity: 'gold',   items: ['r6','n6'], stats: { atk: 70, critDmg: 30, hpMax: 300, def: 15, crit: 10 }, desc: '金品飾品×2' },
  { id: 'jc_dualring', name: '雙戒指陣', category: 'accessory', rarity: 'red',    items: ['r1','r2','r3','r4'], stats: { atk: 20, crit: 8, critDmg: 10 }, desc: '四色戒指' },
  { id: 'jc_necklace', name: '頸飾收藏家', category: 'accessory', rarity: 'purple', items: ['n1','n2','n3','n4','n5'], stats: { hpMax: 200, critDmg: 20, atk: 20 }, desc: '5款項鍊' },
  { id: 'jc_allring', name: '戒指大全',  category: 'accessory', rarity: 'gold',   items: ['r1','r2','r3','r4','r5','r6'], stats: { atk: 80, crit: 20, critDmg: 35, def: 10 }, desc: '全部戒指' },
  { id: 'jc_king',   name: '王者飾品',   category: 'accessory', rarity: 'gold',   items: ['r6','n6','h5'], stats: { atk: 50, hpMax: 350, crit: 12, critDmg: 25 }, desc: '王者飾品三件套' },

  // ===== 同品質套裝組合（12） =====
  { id: 'qc_white',  name: '初心者全套', category: 'quality', rarity: 'white',  items: ['w1','a1','h1','b1','p1','g1'], stats: { atk: 3, def: 5, hpMax: 50 }, desc: '全套白品裝備' },
  { id: 'qc_green',  name: '冒險者全套', category: 'quality', rarity: 'green',  items: ['w2','a2','h2','b2','p2','g2'], stats: { atk: 8, def: 10, hpMax: 100, mpMax: 20 }, desc: '全套綠品裝備' },
  { id: 'qc_blue',   name: '精英全套',   category: 'quality', rarity: 'blue',   items: ['w3','a3','h3','b3','p3','g3'], stats: { atk: 15, def: 20, hpMax: 180, crit: 5 }, desc: '全套藍品裝備' },
  { id: 'qc_red',    name: '英雄全套',   category: 'quality', rarity: 'red',    items: ['w5','a4','h4','b4','p4','g4'], stats: { atk: 30, def: 35, hpMax: 300, crit: 8, critDmg: 15 }, desc: '全套紅品裝備' },
  { id: 'qc_purple', name: '傳說全套',   category: 'quality', rarity: 'purple', items: ['w6','a5','h5','b5','p5','g5'], stats: { atk: 50, def: 55, hpMax: 500, crit: 12, critDmg: 20 }, desc: '全套紫品裝備' },
  { id: 'qc_gold',   name: '神話全套',   category: 'quality', rarity: 'gold',   items: ['w7','a6','b6','p6','g6','c6'], stats: { atk: 100, def: 80, hpMax: 800, crit: 20, critDmg: 35 }, desc: '全套金品裝備' },
  { id: 'qc_white_cape', name: '白品披風套', category: 'quality', rarity: 'white', items: ['c1','n1','r1'], stats: { hpMax: 25, atk: 2 }, desc: '白品披風+飾品' },
  { id: 'qc_green_set',  name: '綠品披風套', category: 'quality', rarity: 'green', items: ['c2','n2','r2'], stats: { hpMax: 50, def: 5, atk: 5 }, desc: '綠品披風+飾品' },
  { id: 'qc_blue_set',   name: '藍品披風套', category: 'quality', rarity: 'blue',  items: ['c3','n3','r3'], stats: { hpMax: 100, atk: 12, def: 10, crit: 3 }, desc: '藍品披風+飾品' },
  { id: 'qc_red_set',    name: '紅品披風套', category: 'quality', rarity: 'red',   items: ['c4','n4','r4'], stats: { hpMax: 180, atk: 25, critDmg: 12, crit: 5 }, desc: '紅品披風+飾品' },
  { id: 'qc_purple_set', name: '紫品披風套', category: 'quality', rarity: 'purple', items: ['c5','n5','r5'], stats: { hpMax: 300, atk: 45, critDmg: 25, crit: 10 }, desc: '紫品披風+飾品' },
  { id: 'qc_gold_set',   name: '金品披風套', category: 'quality', rarity: 'gold',  items: ['c6','n6','r6'], stats: { hpMax: 500, atk: 70, critDmg: 35, def: 20, crit: 15 }, desc: '金品披風+飾品' },

  // ===== Boss 掉落組合（8） =====
  { id: 'bc_goblin', name: '哥布林王寶物', category: 'boss', rarity: 'green',  items: ['w2','a2','h2'], stats: { atk: 10, def: 8, hpMax: 60 }, desc: '哥布林王掉落套' },
  { id: 'bc_orc',    name: '獸人統帥鎧甲', category: 'boss', rarity: 'blue',   items: ['w3','a3','p3'], stats: { atk: 15, def: 15, hpMax: 100 }, desc: '獸人首領掉落套' },
  { id: 'bc_skeleton', name: '亡靈法師袍', category: 'boss', rarity: 'blue',  items: ['a3','n3','c3'], stats: { mpMax: 100, atk: 12, def: 10 }, desc: '亡靈法師掉落套' },
  { id: 'bc_scorpion', name: '毒蠍之尾',  category: 'boss', rarity: 'red',    items: ['w5','r4','b4'], stats: { atk: 25, crit: 8, critDmg: 15 }, desc: '巨蠍王掉落套' },
  { id: 'bc_bat',    name: '暗夜蝙蝠翼',   category: 'boss', rarity: 'red',    items: ['b4','c4','g4'], stats: { evasion: 8, moveSpeed: 5, crit: 6 }, desc: '吸血蝙蝠王掉落套' },
  { id: 'bc_demon',  name: '惡魔領主鎧甲', category: 'boss', rarity: 'purple', items: ['w6','a5','h5'], stats: { atk: 45, def: 40, hpMax: 200, crit: 10 }, desc: '惡魔領主掉落套' },
  { id: 'bc_dragon', name: '巨龍之寶',     category: 'boss', rarity: 'purple', items: ['w6','a5','n5','r5'], stats: { atk: 55, def: 35, hpMax: 250, critDmg: 25, crit: 12 }, desc: '巨龍掉落套' },
  { id: 'bc_ghost',  name: '死亡領主遺物', category: 'boss', rarity: 'gold',   items: ['w7','a6','n6','c6'], stats: { atk: 80, def: 50, hpMax: 400, critDmg: 35, crit: 18 }, desc: '死亡領主掉落套' },

  // ===== 全收藏組合（6） =====
  { id: 'fc_weapon', name: '武器收藏家',   category: 'full', rarity: 'purple', items: ['w1','w2','w3','w4','w5','w6','w7'], stats: { atk: 60, crit: 15, critDmg: 25 }, desc: '收集全部7把武器' },
  { id: 'fc_armor',  name: '鎧甲收藏家',   category: 'full', rarity: 'purple', items: ['a1','a2','a3','a4','a5','a6'], stats: { def: 50, hpMax: 400 }, desc: '收集全部鎧甲' },
  { id: 'fc_accessory', name: '飾品收藏家', category: 'full', rarity: 'purple', items: ['r1','r2','r3','r4','r5','r6','n1','n2','n3','n4','n5','n6'], stats: { atk: 60, hpMax: 300, crit: 12, critDmg: 20, mpMax: 100 }, desc: '收集全部戒指項鍊' },
  { id: 'fc_boots',  name: '靴子收藏家',   category: 'full', rarity: 'blue',   items: ['b1','b2','b3','b4','b5','b6'], stats: { moveSpeed: 8, evasion: 10, crit: 8 }, desc: '收集全部靴子' },
  { id: 'fc_cape',   name: '披風收藏家',   category: 'full', rarity: 'blue',   items: ['c1','c2','c3','c4','c5','c6'], stats: { hpMax: 200, def: 30, atk: 15 }, desc: '收集全部披風' },
  { id: 'fc_legend', name: '裝備圖鑑大師', category: 'full', rarity: 'gold',   items: ['w7','a6','g6','b6','p6','c6','n6','r6'], stats: { atk: 100, def: 80, hpMax: 800, crit: 25, critDmg: 40, mpMax: 200 }, desc: '收集全部頂級金裝' },
];
const EQUIP_COMBOS_COUNT = EQUIP_COMBOS.length; // 66

// ===== 裝備圖鑑提交制系統 =====
// 每個組合的每件裝備需要提交指定數量（2-6件），提交後裝備被消耗

// 根據品質與組合大小生成每件裝備所需提交數量
// 用於顯示進度，例如 0/2、1/3
function getEquipSubmitCount(combo, itemId) {
  // 基礎：白/綠=2，藍/紅=3，紫=3-4，金=2
  const rarityCount = {
    white: 2, green: 2, blue: 3, red: 3, purple: 4, gold: 2
  };
  const base = rarityCount[combo.rarity] || 2;
  // 組合越大每件需要的越少（總量大致均衡）
  const len = combo.items.length;
  if (len <= 1) return base + 2;       // 單件：多2件
  if (len <= 2) return base + 1;       // 雙件：多1件
  if (len <= 4) return base;           // 3-4件：基礎
  if (len <= 6) return Math.max(2, base - 1); // 5-6件：少1件
  return Math.max(2, base - 2);         // 7件以上：少2件
}

// 取得某組合某件裝備的已提交數量
function getComboItemProgress(comboId, itemId) {
  if (!GS.equipComboProgress) GS.equipComboProgress = {};
  if (!GS.equipComboProgress[comboId]) GS.equipComboProgress[comboId] = {};
  return GS.equipComboProgress[comboId][itemId] || 0;
}

// 設置某組合某件裝備的提交數量
function setComboItemProgress(comboId, itemId, count) {
  if (!GS.equipComboProgress) GS.equipComboProgress = {};
  if (!GS.equipComboProgress[comboId]) GS.equipComboProgress[comboId] = {};
  GS.equipComboProgress[comboId][itemId] = count;
}

// 計算某組合整體進度
function getEquipComboProgress(combo) {
  let have = 0;
  let total = 0;
  for (const itemId of combo.items) {
    const need = getEquipSubmitCount(combo, itemId);
    const cur = getComboItemProgress(combo.id, itemId);
    have += Math.min(cur, need);
    total += need;
  }
  return { have, total, complete: have >= total };
}

// 提交一件裝備到指定組合的指定裝備槽
// 返回：{ success, submitted, comboComplete }
function submitEquipToCombo(comboId, itemId, amount = 1) {
  const combo = EQUIP_COMBOS.find(c => c.id === comboId);
  if (!combo) return { success: false, reason: '組合不存在' };
  if (!combo.items.includes(itemId)) return { success: false, reason: '該組合不需要此裝備' };
  if (GS.equipCombosDone?.[comboId]) return { success: false, reason: '組合已完成' };
  
  const need = getEquipSubmitCount(combo, itemId);
  const cur = getComboItemProgress(comboId, itemId);
  if (cur >= need) return { success: false, reason: '此裝備已提交滿' };
  
  // 查找背包中符合的裝備
  const bagItems = GS.inventory.filter(i => i.id === itemId && i.itemType === 'equipment');
  let available = 0;
  bagItems.forEach(i => available += (i.count || 1));
  if (available <= 0) return { success: false, reason: '背包中沒有此裝備' };
  
  const canSubmit = Math.min(amount, need - cur, available);
  if (canSubmit <= 0) return { success: false, reason: '無法提交' };
  
  // 從背包移除
  let remaining = canSubmit;
  for (let i = GS.inventory.length - 1; i >= 0 && remaining > 0; i--) {
    const it = GS.inventory[i];
    if (it.id === itemId && it.itemType === 'equipment') {
      const cnt = it.count || 1;
      if (cnt <= remaining) {
        GS.inventory.splice(i, 1);
        remaining -= cnt;
      } else {
        it.count = cnt - remaining;
        remaining = 0;
      }
    }
  }
  
  const newCount = cur + (canSubmit - remaining);
  setComboItemProgress(comboId, itemId, newCount);
  
  const wasDone = !!GS.equipCombosDone?.[comboId];
  let comboComplete = false;
  const prog = getEquipComboProgress(combo);
  if (prog.complete && !wasDone) {
    if (!GS.equipCombosDone) GS.equipCombosDone = {};
    GS.equipCombosDone[comboId] = true;
    comboComplete = true;
    addLog('system', `📜 裝備圖鑑：完成組合【${combo.name}】！`);
    const rc = RARITY_CONFIG[combo.rarity] || RARITY_CONFIG.white;
    showFloatingText(`套裝完成: ${combo.name}`, rc.color || '#ffd040');
    calcCP();
  }
  
  return { success: true, submitted: canSubmit - remaining, comboComplete };
}

// 一鍵提交某組合所有可提交的裝備
function quickSubmitCombo(comboId) {
  const combo = EQUIP_COMBOS.find(c => c.id === comboId);
  if (!combo) return 0;
  if (GS.equipCombosDone?.[comboId]) return 0;
  
  let totalSubmitted = 0;
  let completed = false;
  for (const itemId of combo.items) {
    const need = getEquipSubmitCount(combo, itemId);
    const cur = getComboItemProgress(comboId, itemId);
    if (cur >= need) continue;
    const result = submitEquipToCombo(comboId, itemId, need - cur);
    if (result.success) {
      totalSubmitted += result.submitted;
      if (result.comboComplete) { completed = true; break; }
    }
  }
  return { totalSubmitted, completed };
}

// 取得裝備圖鑑組合加成總值（已完成才生效）
function getEquipComboBonus() {
  const bonus = {};
  if (!GS.equipCombosDone) return bonus;
  for (const combo of EQUIP_COMBOS) {
    if (GS.equipCombosDone[combo.id]) {
      for (const s in combo.stats) bonus[s] = (bonus[s] || 0) + combo.stats[s];
    }
  }
  return bonus;
}

// 獲得裝備時不再自動記錄（改為手動提交制）
function recordEquipToCodex(itemId) {
  // 空函數：保留調用點不報錯，實際改為手動提交制
}

// ==================== 宝物配置 ====================
const TREASURE_POOL = [
  { id: 't1', name: '生命寶珠', rarity: 'blue',  icon: '🔮', desc: '增加最大生命值',   stats: { hpMax: 100 } },
  { id: 't2', name: '力量徽記', rarity: 'blue',  icon: '💪', desc: '增加攻擊力',       stats: { atk: 15 } },
  { id: 't3', name: '守護盾章', rarity: 'blue',  icon: '🛡️', desc: '增加防禦力',       stats: { def: 10 } },
  { id: 't4', name: '命運之眼', rarity: 'red',   icon: '👁️', desc: '增加暴擊',         stats: { crit: 8, critDmg: 15 } },
  { id: 't5', name: '龍晶', rarity: 'red',      icon: '💎', desc: '全屬性提升',         stats: { atk: 20, def: 15, hpMax: 200 } },
  { id: 't6', name: '遠古魔法書', rarity: 'purple', icon: '📕', desc: '大幅提升攻擊',    stats: { atk: 50, crit: 10 } },
  { id: 't7', name: '贤者之石', rarity: 'purple', icon: '💠', desc: '大幅提升生存',    stats: { def: 40, hpMax: 500 } },
  { id: 't8', name: '世界树之心', rarity: 'gold', icon: '🌳', desc: '傳說中的至寶',    stats: { atk: 100, def: 60, hpMax: 1000, crit: 15, critDmg: 30 } },
];

// ==================== 合成配置 ====================
const SYNTHESIS_RATES = {
  white:  0.50,   // 白合绿 50%
  green:  0.30,   // 绿合蓝 30%
  blue:   0.15,   // 蓝合红 15%
  red:    0.05,   // 红合紫 5%
  purple: 0.005,  // 紫合金 0.5%
};
const SYNTHESIS_COST = 4; // 每次合成需要4张卡牌
const MAX_ENHANCE_TICKETS = 5; // 最多使用5张強化券
const ENHANCE_TICKET_COST = 10; // 強化券价格（鑽石）
const ENHANCE_TICKET_BOOST = 0.2; // 每张提升20%当前概率

const RARITY_NAME = { white:'白', green:'綠', blue:'藍', purple:'紫', red:'紅', gold:'金' };
const RARITY_COLOR = { white:'#ccc', green:'#60d060', blue:'#60a0ff', purple:'#c080ff', red:'#ff6060', gold:'#f0c040' };

const TRANSFORM_TYPES = [
  { key: 'str', name: '狂戰士', sprite: SPRITE.berserker, stats: { atk: 12 } },
  { key: 'vit', name: '守護者', sprite: SPRITE.guardian, stats: { hpMax: 20, def: 8 } },
  { key: 'agi', name: '疾风者', sprite: SPRITE.windwalk, stats: { crit: 20, atk: 5 } },
  { key: 'int', name: '魔導士', sprite: SPRITE.archmage, stats: { atk: 8, crit: 10 } },
  { key: 'luk', name: '幸運者', sprite: SPRITE.fortune, stats: { critDmg: 30, atk: 6 } },
];

// ==================== 游戏状态 ====================
const GS = {
  player: {
    name: '測試',
    classId: 'warrior',
    level: 1, exp: 0, expMax: 100,
    x: 200, y: 260, targetX: 200, targetY: 260,
    hp: 200, hpMax: 200,
    mp: 100, mpMax: 100,
    state: 'idle', facing: 'right',
    attackCooldown: 0,
    skillCooldowns: [0,0,0,0,0,0,0,0],
    hitTimer: 0,
    transformId: null,
    buffs: {},
  },
  resources: { gold: 300000, gem: 300000 },
  currentMap: 'village',
  monsters: [],
  summons: [],
  ownedHeroes: [],
  ownedPets: [],
  equippedHeroId: null,
  equippedPetId: null,
  equipment: {}, // { weapon, armor, accessory, boots, helmet }
  inventory: [], // { id, type, rarity, name, count, ... }
  bagMaxSlots: 60, // 背包容量（初始60，可擴充至200）
  enhanceTickets: 0, // 強化提升券数量
  bagPage: { tab: 'all', page: 0 },
  transforms: [],
  autoMode: false,
  autoSkillEnabled: true,
  autoPotionEnabled: true,
  autoMpEnabled: true,
  autoBuyPotion: true,
  // 自動道具配置：8個欄位，每個可選道具、設閾值、開啟自動使用/購買
  autoItems: [
    { id: 'slot_1', itemId: 'hp1',        autoUse: true,  autoBuy: true,  threshold: 30 },
    { id: 'slot_2', itemId: 'mp1',        autoUse: true,  autoBuy: true,  threshold: 20 },
    { id: 'slot_3', itemId: '',           autoUse: false, autoBuy: false, threshold: 50 },
    { id: 'slot_4', itemId: '',           autoUse: false, autoBuy: false, threshold: 50 },
    { id: 'slot_5', itemId: '',           autoUse: false, autoBuy: false, threshold: 50 },
    { id: 'slot_6', itemId: '',           autoUse: false, autoBuy: false, threshold: 50 },
    { id: 'slot_7', itemId: '',           autoUse: false, autoBuy: false, threshold: 50 },
    { id: 'slot_8', itemId: '',           autoUse: false, autoBuy: false, threshold: 50 },
  ],
  autoPvpMode: 'counter', // counter | active | off
  killCount: 0,
  targetMonsterUid: null,
  targetAiUid: null,
  paused: false,
  quest: { current: 0, total: 5, name: '討伐哥布林' },
  heroPageTab: 'transform',
  gachaPageTab: 'hero',
  shopTab: 'consumable',
  menuPage: null,
  nation: 'kent',
  guild: null, // 保留字段兼容
  guildId: null,
  // 國家系统
  nationContribution: 0,     // 个人貢獻值
  nationSkillLevels: {},     // 技能树加点 { atk: 1, def: 0, ... }
  todayDonatedGold: 0,       // 今日金幣捐献
  todayDonatedGem: 0,        // 今日鑽石捐献
  legionId: null,            // 玩家所在軍團ID
  legionRank: null,          // 軍團内官職
  nationTab: 'members',      // 國家頁默認Tab
  membersSubTab: 'power',    // 成員列表子分頁
  transformRarity: 'all',    // 變身頁篩選
  heroRarity: 'all',         // 英雄頁篩選
  petRarity: 'all',          // 守護頁篩選
  castleTreasuries: {}, // castleId -> accumulatedTax (金币)
  gemTaxPool: {},       // castleId -> accumulatedGemTax (钻石)
  siegeStats: {},       // 玩家攻城战统计：{ castleId: { kills:0, deaths:0 } }
  weeklyTaxSettled: 0,  // 上次每周结算时间戳
  warDeclareDate: '',   // 今日宣战计数所属日期
  warDeclareCount: 0,   // 今日宣战次数
  siege: {
    active: false, castle: null, phase: 'idle',
    gateHp: 1000, gateMax: 1000,
    defenders: [],
    attackers: [],
  },
  // 宣戰状态：{ castleId, declaredAt } 表示对某城堡已宣戰
  warDeclared: null,
  // 宣戰冷卻：castleId -> 冷卻结束時間戳
  warCooldowns: {},
  // AI 玩家列表
  aiPlayers: [],
  // 排行榜缓存
  rankings: { level: [], power: [], wealth: [], kills: [] },
};

// 全局变量
let worldLayer, damageLayer, effectLayer, sceneBg, npcLayer;
let worldW, worldH;
let lastTime = 0;

// ==================== 相机系统（地圖滚动 / 缩放 / 迷你地圖）====================
const CAMERA = {
  x: 0, y: 0,              // 相机左上角坐标
  zoom: 1,                 // 缩放比例
  zoomMin: 0.6, zoomMax: 1.8,
  targetZoom: 1,
  worldWidth: WORLD_W,     // 世界宽度（匹配背景图）
  worldHeight: WORLD_H,    // 世界高度（匹配背景图）
  followPlayer: true,      // 镜头跟随玩家
  edgeScroll: true,
  edgeMargin: 80,          // 边缘滚动触发距離
  scrollSpeed: 3,          // 边缘滚动速度
};

// 每单位独立的动画帧状态（消除全局帧导致的抖动）
let unitAnimState = new Map(); // uid -> { frame, timer, breathPhase }

const FRAME_DURATIONS = { idle: 0.18, walking: 0.08, attacking: 0.07 };
// 呼吸/走路上下起伏幅度（像素）
const BREATH_AMPLITUDE = 1.2;  // 待机呼吸起伏
const WALK_BOUNCE_AMPLITUDE = 2.5; // 走路上下起伏

let monsterUidCounter = 1;
let summonedDemon = null;

// 攻城战场景标记
let inSiegeScene = false;

  // DOM 缓存
  let $ = id => document.getElementById(id);
  let el = {};

// ==================== 初始化 ====================
function init() {
  // 缓存 DOM
  el = {
    scene: $('battle-scene'),
    worldLayer: $('world-layer'), damageLayer: $('damage-layer'),
    effectLayer: $('effect-layer'), sceneBg: $('scene-bg'), npcLayer: $('npc-layer'),
    playerLevel: $('player-level'), expPct: $('exp-pct'),
    hpFill: $('hp-fill'), mpFill: $('mp-fill'),
    hpText: $('hp-text'), mpText: $('mp-text'),
    miniAtk: $('mini-atk'), miniDef: $('mini-def'), cpValue: $('cp-value'),
    gemCount: $('gem-count'), locationName: $('location-name'),
    autoBtn: $('auto-btn'), autoLabel: $('auto-label'),
    targetDisplay: $('target-display'), targetName: $('target-name'), targetHpFill: $('target-hp-fill'),
    killCount: $('kill-count'),
    logContent: $('log-content'), battleLogScroll: $('battle-log-scroll'),
    chatInput: $('chat-input'), chatSendBtn: $('chat-send-btn'), chatInputRow: $('chat-input-row'), logToggleBtn: $('log-toggle-btn'),
    sidePage: $('side-page'), pageTitle: $('page-title'), pageContent: $('page-content'), backBtn: $('back-btn'),
    buffBar: $('buff-bar'),
    mapBtn: $('map-btn'), mapModal: $('map-modal'), mapClose: $('map-close'),
    safeMapList: $('safe-map-list'), battleMapList: $('battle-map-list'),
    gachaModal: $('gacha-modal'), gachaResult: $('gacha-result'), gachaClose: $('gacha-close'),
    settingsPanel: $('settings-panel'),
    heroSlotEmpty: $('hero-slot-empty'), heroSlotFilled: $('hero-slot-filled'), heroSlotImg: $('hero-slot-img'),
    petSlotEmpty: $('pet-slot-empty'), petSlotFilled: $('pet-slot-filled'), petSlotEmoji: $('pet-slot-emoji'),
    sideMenu: $('side-menu'), sideMenuOverlay: $('side-menu-overlay'), sideMenuClose: $('side-menu-close'),
    menuBtn: $('menu-btn'),
    skillBar: $('skill-bar'),
    siegeModal: $('siege-modal'), siegeClose: $('siege-close'),
    siegeTitle: $('siege-title'), siegeBattlefield: $('siege-battlefield'),
    siegeArmy: $('siege-army'), siegeDefenders: $('siege-defenders'),
    siegeAttacker: $('siege-attacker'), siegeDefendersLeft: $('siege-defenders-left'),
    siegeGateHp: $('siege-gate-hp'), gateHpFill: $('gate-hp-fill'),
    castleLordName: $('castle-lord-name'),
    classSelectModal: $('class-select-modal'),
    questCurrent: $('quest-current'), questName: $('quest-name'), questTotal: $('quest-total'),
    // 相机/迷你地圖/缩放
    minimapCanvas: $('minimap-canvas'), minimapTitle: $('minimap-title'),
    zoomInBtn: $('zoom-in'), zoomOutBtn: $('zoom-out'), zoomResetBtn: $('zoom-reset'),
    // 攻城战全屏场景
    siegeScene: $('siege-scene'),
    siegeSceneBg: $('siege-scene-bg'),
    siegeStructures: $('siege-structures'),
    siegeWorldLayer: $('siege-world-layer'),
    siegeDamageLayer: $('siege-damage-layer'),
    siegeEffectLayer: $('siege-effect-layer'),
    siegeNpcLayer: $('siege-npc-layer'),
    siegeHudTitle: $('siege-hud-title'),
    siegeHudPhase: $('siege-hud-phase'),
    siegeRetreatBtn: $('siege-retreat-btn'),
    siegeSkillBar: $('siege-skill-bar'),
    siegeMinimapCanvas: $('siege-minimap-canvas'),
    siegeResultModal: $('siege-result-modal'),
    siegeResultTitle: $('siege-result-title'),
    siegeResultDesc: $('siege-result-desc'),
    siegeResultRewards: $('siege-result-rewards'),
    siegeResultBtn: $('siege-result-btn'),
  };

  worldLayer = el.worldLayer;
  damageLayer = el.damageLayer;
  effectLayer = el.effectLayer;
  sceneBg = el.sceneBg;
  npcLayer = el.npcLayer;

  worldW = el.scene.clientWidth;
  worldH = el.scene.clientHeight;

  if (!GS.ownedTransforms) GS.ownedTransforms = [];
  // 存檔兼容：過濾掉不在新卡池裡的舊變身ID（卡池大換血時避免殘留舊卡報錯）
  const validTransformIds = new Set(TRANSFORM_POOL.map(t => t.id));
  const beforeLen = GS.ownedTransforms.length;
  GS.ownedTransforms = GS.ownedTransforms.filter(t => validTransformIds.has(t.id));
  if (GS.player?.transformId && !validTransformIds.has(GS.player.transformId)) {
    GS.player.transformId = null;
    if (GS.transformEndTime) GS.transformEndTime = 0;
  }
  if (GS.ownedTransforms.length !== beforeLen) {
    console.log(`[存檔兼容] 清理了 ${beforeLen - GS.ownedTransforms.length} 張舊變身卡（新卡池共 ${TRANSFORM_POOL.length} 張）`);
  }
  initBuffs();
  initEquipment();
  initCastles();
  initClass();
  initQuickBar();
  enhanceNations();
  increaseMonsterCount();

  // 新手自動加入國家與軍團（確保攻城戰/軍團功能可直接體驗）
  try {
    if (!GS.nation) {
      GS.nation = 'kent';
      addLog('system', '你自動加入了【肯特王國】');
    }
    if (!GS.legionId && !GS.guildId) {
      // 找到肯特王國的第一個可用軍團，玩家擔任軍團長
      const nationGuilds = AI_GUILDS.filter(g => g.nation === GS.nation);
      if (nationGuilds.length > 0) {
        const g = nationGuilds[0];
        GS.guild = {
          id: g.id,
          name: g.name,
          level: g.level,
          role: 'leader',
          nation: g.nation,
          castles: g.castle ? [g.castle] : [],
          funds: g.funds || 0,
          myContribution: 500,
          todayDonatedGold: 0,
          todayDonatedGem: 0,
        };
        GS.guildId = g.id;
        GS.legionId = g.id;
        g.leader = GS.player.name;
        g.hasHumanLeader = true;
        addLog('system', `你成為【${g.name}】軍團長！可在國家→城堡頁宣戰攻城`);
      }
    }
  } catch (e) {
    console.warn('[Init] 自動加入軍團失敗:', e);
  }

  // 提前初始化全局 AI 池（不依賴戰鬥地圖）
  try {
    initGlobalAIPool();
    console.log('[Init] 全局AI池已在啟動時初始化，數量:', GLOBAL_AI_POOL.length);
    // 列印各地圖 AI 數量
    const mapCounts = {};
    GLOBAL_AI_POOL.forEach(a => { mapCounts[a.mapId] = (mapCounts[a.mapId] || 0) + 1; });
    console.log('[Init] 各地圖AI數量:', mapCounts);
  } catch (e) {
    console.error('[Init] AI池初始化失敗:', e);
  }

  // === 全局事件委托：城堡宣战按钮兜底（确保动态渲染后仍能点击）===
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-castle-action="declare"]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    console.log('[Siege] 全局委托：宣战按钮被点击');
    declareSiegeWar(btn.dataset.castleId);
  });
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-castle-action="enter-siege"]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    console.log('[Siege] 全局委托：进入攻城战场按钮');
    enterSiegeBattle(btn.dataset.castleId);
  });

  // 绑定事件
  bindEvents();

  // 載入地圖
  loadMap('village');

  GS.player.x = worldW / 2;
  GS.player.y = worldH * 0.75;
  GS.player.targetX = GS.player.x;
  GS.player.targetY = GS.player.y;

  createPlayerSprite();
  updateUI();
  updateSlotDisplay();
  updateSkillBar();

  // 精靈初始化（直接更新，不再走 canvas 去背）
  updatePlayerSprite();

  // 調試：列印5職業精靈圖資訊，驗證職業映射
  if (window.__debugClassSprites) window.__debugClassSprites();

  // 調試：驗證5個職業切換後，實際img src是否正確
  (function() {
    const classes = ['warrior', 'mage', 'archer', 'rogue', 'paladin'];
    console.log('========== 5職業切換-實際img src測試 ==========');
    const unit = worldLayer.querySelector('.world-unit.hero');
    const origClass = GS.player.classId;
    const origTf = GS.player.transformId;
    classes.forEach(cls => {
      GS.player.classId = cls;
      GS.player.transformId = null;
      updatePlayerSprite();
      const idleImg = unit.querySelector('.sprite-frame-idle');
      const walk1 = unit.querySelector('.sprite-frame-walk-1');
      console.log(`[${cls}] idle.src=${idleImg?.src?.split('/').slice(-2).join('/')} walk1.src=${walk1?.src?.split('/').slice(-2).join('/')}`);
    });
    // 恢復
    GS.player.classId = origClass;
    GS.player.transformId = origTf;
    updatePlayerSprite();
    console.log('恢復後classId:', GS.player.classId);
    console.log('===============================================');
  })();

  addLog('system', '欢迎來到君主之刃的世界！');
  addLog('system', '點擊地面移動，點擊菜單按鈕查看國家/軍團/城堡。');

  // 显示角色創建界面
  showCharCreate();

  requestAnimationFrame(gameLoop);
}

function worldMaxW() { return Math.max(worldW, CAMERA.worldWidth); }
function worldMaxH() { return Math.max(worldH, CAMERA.worldHeight); }

// ==================== AI 玩家系统 ====================
// AI 玩家：自動移動、打怪、拾取掉落、敌对阵营会攻擊玩家
// AI 名字：隨機 2-6 個繁體中文字，運行時動態生成，不重複
const AI_NAME_CHARS = [
  // 常用武俠/玄幻風繁體字（分類便於組合，但隨機抽取）
  '冷', '夜', '殘', '霜', '赤', '孤', '劍', '風', '墨', '青',
  '白', '玄', '朱', '蒼', '破', '絕', '驚', '碧', '紫', '紅',
  '金', '玉', '瑤', '天', '流', '落', '寒', '烈', '飛', '御',
  '凌', '踏', '刀', '槍', '弓', '琴', '棋', '書', '畫', '詩',
  '狂', '血', '毒', '影', '龍', '鳳', '虎', '鶴', '狼', '鷹',
  '月', '星', '雨', '雪', '雷', '山', '海', '火', '冥', '闇',
  '黎', '黃', '朝', '暮', '鐵', '石', '無', '雙', '涯', '浪',
  '俠', '癡', '尊', '霸', '王', '魂', '魄', '靈', '韻', '聖',
  '狂', '殺', '嘯', '舞', '壽', '痕', '隕', '嘯', '飄', '動',
  '崩', '靜', '幽冥', '鋒', '梟', '陽', '刃', '焰', '鈴', '淵',
  '武', '穹', '曉', '塵', '鴻', '落', '電', '冥', '塵', '衣',
  '鐵', '烏', '衡', '光', '璇', '璣', '雲', '霞', '鴻', '霜',
  '雷', '風', '霄', '雪', '心', '刀', '槍', '弓', '靈', '韻',
  '聖', '狂', '姬', '淵', '鳴', '嘯', '啼', '舞', '壽', '痕',
  '隕', '落', '嘯', '飄', '動', '崩', '嘯', '靜', '舞', '冥',
  '夜', '明', '昏', '陽', '光', '星', '焰', '冰', '疾', '蒼',
  '烈', '飛', '伏', '靈', '玄', '金', '銀', '牛', '石', '無',
  '雙', '涯', '子', '客', '癡', '尊', '主', '者', '師', '帝',
  '皇', '侯', '相', '將', '軍', '俠', '盜', '賊', '王', '聖',
  '賢', '愚', '智', '勇', '仁', '義', '禮', '信', '忠', '孝',
];
let _aiNameCounter = 0;
const _usedAINames = new Set();

// 生成隨機 2-6 字繁體 AI 名字，保證不重複
function generateRandomAIName() {
  // 權重：2字最多，依次遞減，6字最少
  const roll = Math.random();
  let len = 2;
  if (roll < 0.40) len = 2;
  else if (roll < 0.70) len = 3;
  else if (roll < 0.88) len = 4;
  else if (roll < 0.96) len = 5;
  else len = 6;

  // 敏感詞過濾
  const sensitive = ['傻逼', '操你', '去死', '傻瓜', '白痴', '智障', '垃圾', '废物', '贱人', '狗娘', '龟孙', '王八蛋', '他妈的', 'fuck'];
  const chars = AI_NAME_CHARS;
  const total = chars.length;
  let attempts = 0;
  while (attempts < 500) {
    attempts++;
    let name = '';
    for (let i = 0; i < len; i++) {
      name += chars[Math.floor(Math.random() * total)];
    }
    // 跳過敏感詞或已使用的名字
    let bad = false;
    for (const w of sensitive) { if (name.includes(w)) { bad = true; break; } }
    if (bad) continue;
    if (!_usedAINames.has(name)) {
      _usedAINames.add(name);
      return name;
    }
  }
  // 兜底：用編號保證不重複
  _aiNameCounter++;
  const fallback = '俠客' + _aiNameCounter;
  _usedAINames.add(fallback);
  return fallback;
}
const AI_CLASS_IDS = ['warrior', 'mage', 'archer', 'rogue', 'paladin', 'warlock'];

// ==================== 全局 AI 玩家池（跨地圖常駐，最多 90） ====================
const MAX_AI_PLAYERS = 90;
const ACTIVE_AI_COUNT = 30;  // 活躍AI數量（真實模擬+渲染）
const BACKGROUND_AI_UPDATE_INTERVAL = 30; // 背景AI批量更新間隔（秒）
const GLOBAL_AI_POOL = []; // 全局 AI 池，跨地圖存在
let aiUidCounter = 1;

let _aiPoolInitDone = false;
let _aiPoolInitPromise = null;
let _backgroundAITimer = 0;

// 取得活躍AI列表
function getActiveAI() { return GLOBAL_AI_POOL.filter(a => a.isActive); }
// 取得背景AI列表
function getBackgroundAI() { return GLOBAL_AI_POOL.filter(a => !a.isActive); }
// Fisher-Yates 洗牌
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function initGlobalAIPool() {
  // 防重复创建：已达到上限或已初始化完成则直接返回
  if (_aiPoolInitDone || GLOBAL_AI_POOL.length >= MAX_AI_PLAYERS) return;
  // 正在初始化中，避免重入
  if (_aiPoolInitPromise) return;
  
  const allMaps = getAllMaps();
  const battleMaps = Object.values(allMaps)
    .filter(m => m.type === 'battle')
    .sort((a, b) => (a.levelMin || 1) - (b.levelMin || 1));
  if (battleMaps.length === 0) { _aiPoolInitDone = true; return; }

  const mapCount = battleMaps.length;
  const perMap = Math.floor(MAX_AI_PLAYERS / mapCount);
  const remainder = MAX_AI_PLAYERS - perMap * mapCount;

  // 預先計算所有待生成AI的規格（純數據，不創建對象）
  const pendingSpecs = [];
  battleMaps.forEach((map, mi) => {
    const count = perMap + (mi < remainder ? 1 : 0);
    for (let i = 0; i < count; i++) {
      if (pendingSpecs.length >= MAX_AI_PLAYERS) break;
      const lMin = map.levelMin || 1;
      const lMax = map.levelMax || 10;
      let aiMin, aiMax;
      if (lMax <= 10) { aiMin = 1; aiMax = 5; }
      else if (lMax <= 20) { aiMin = 3; aiMax = 8; }
      else if (lMax <= 40) { aiMin = 6; aiMax = 12; }
      else { aiMin = 10; aiMax = 15; }
      const aiLevel = aiMin + Math.floor(Math.random() * (aiMax - aiMin + 1));
      const nation = NATIONS[Math.floor(Math.random() * NATIONS.length)].id;
      pendingSpecs.push({ level: aiLevel, nation, mapId: map.id });
    }
  });

  // 分幀創建 AI 對象：每帧 5 個，約 18 帧完成
  const BATCH_PER_FRAME = 5;
  let idx = 0;
  _aiPoolInitPromise = true;
  
  function createBatch() {
    const end = Math.min(idx + BATCH_PER_FRAME, pendingSpecs.length);
    for (; idx < end; idx++) {
      const spec = pendingSpecs[idx];
      const ai = createAIPlayer(spec.level, spec.nation, spec.mapId);
      GLOBAL_AI_POOL.push(ai);
    }
    if (idx < pendingSpecs.length) {
      requestAnimationFrame(createBatch);
    } else {
      _aiPoolInitDone = true;
      _aiPoolInitPromise = null;
      console.log(`[AI System] 全局AI池初始化完成，共 ${GLOBAL_AI_POOL.length} 個AI，分布在 ${mapCount} 張地圖（分幀創建）`);
      const byMap = {};
      GLOBAL_AI_POOL.forEach(a => { byMap[a.mapId] = (byMap[a.mapId] || 0) + 1; });
      console.log('[AI System] 各地圖AI數量:', byMap);
      // 等級統計
      const byMapLevels = {};
      GLOBAL_AI_POOL.forEach(a => {
        byMap[a.mapId] = (byMap[a.mapId] || 0) + 1;
        if (!byMapLevels[a.mapId]) byMapLevels[a.mapId] = { min: Infinity, max: 0, sum: 0, count: 0 };
        const s = byMapLevels[a.mapId];
        s.min = Math.min(s.min, a.level); s.max = Math.max(s.max, a.level);
        s.sum += a.level; s.count++;
      });
      console.log('[AI System] 各地圖AI數量 & 等級區間:');
      for (const mid in byMap) {
        const s = byMapLevels[mid];
        console.log(`  - ${mid}: ${byMap[mid]} 個, Lv.${s.min}-${s.max}, 平均 ${(s.sum/s.count).toFixed(1)}`);
      }
      const byNation = {};
      GLOBAL_AI_POOL.forEach(a => { byNation[a.nation] = (byNation[a.nation] || 0) + 1; });
      console.log('[AI System] 各國AI數量:', byNation);
      // 生成完後立即更新排行榜，確保有數據顯示
      try {
        updateRankings();
        console.log('[Rankings] 排行榜已根據AI池數據初始化');
      } catch (e) {
        console.warn('[Rankings] 排行榜初始化失敗:', e);
      }
      // 隨機選取 ACTIVE_AI_COUNT 個 AI 設為活躍狀態
      shuffle(GLOBAL_AI_POOL);
      for (let i = 0; i < ACTIVE_AI_COUNT && i < GLOBAL_AI_POOL.length; i++) {
        GLOBAL_AI_POOL[i].isActive = true;
      }
      console.log(`[AI System] 活躍AI=${ACTIVE_AI_COUNT} 個, 背景AI=${GLOBAL_AI_POOL.length - ACTIVE_AI_COUNT} 個`);
    }
  }
  requestAnimationFrame(createBatch);
}

function getAIPlayersOnCurrentMap() {
  // 只有活躍AI才會出現在當前地圖（背景AI不渲染、不戰鬥）
  const result = GLOBAL_AI_POOL.filter(ai => ai.isActive && ai.mapId === GS.currentMap && ai.state !== 'dead');
  if (window.__debugAI) {
    console.log('[AI Filter] currentMap=' + GS.currentMap + ', on-map count=' + result.length +
      ' / total=' + GLOBAL_AI_POOL.length +
      ' | all mapIds: ' + [...new Set(GLOBAL_AI_POOL.map(a => a.mapId))].join(', '));
  }
  return result;
}

function createAIPlayer(level, nationId, mapId) {
  const clsId = AI_CLASS_IDS[Math.floor(Math.random() * AI_CLASS_IDS.length)];
  const cls = CLASSES[clsId];
  // 動態生成隨機繁體名字（2-6字，不重複）
  const name = generateRandomAIName();
  const nation = nationId || NATIONS[Math.floor(Math.random() * NATIONS.length)].id;

  // AI 按指定等級初始化，基礎屬性按職業計算（和玩家完全一致）
  const startLevel = Math.max(1, Math.floor(level || 1));
  const baseStats = cls?.baseStats || { atk: 18, def: 8, hpMax: 200, mpMax: 100 };
  let baseHp = baseStats.hpMax || 200;
  let baseMp = baseStats.mpMax || 100;
  let baseAtk = baseStats.atk || 18;
  let baseDef = baseStats.def || 8;
  let expMax = 100;
  // 按等級增長屬性（與玩家升級曲線一致：hp+8%、atk+6%、def+5%、expMax*1.3）
  for (let lv = 1; lv < startLevel; lv++) {
    baseHp = Math.floor(baseHp * 1.08);
    baseAtk = Math.floor(baseAtk * 1.06);
    baseDef = Math.floor(baseDef * 1.05);
    expMax = Math.floor(expMax * 1.3);
  }

  // 初始基礎裝備（白色品質，和新玩家一致：武器+鎧甲，其餘部位為空）
  const equipment = {
    helmet: null, necklace: null, cape: null,
    gloves: null, pants: null, belt: null,
    boots: null, ring1: null, ring2: null,
  };
  equipment.weapon = {
    id: 'w_ai_' + aiUidCounter,
    name: '破舊短劍',
    type: 'weapon',
    rarity: 'white',
    level: 1,
    baseStats: { atk: 5 },
  };
  equipment.armor = {
    id: 'a_ai_' + aiUidCounter,
    name: '布甲',
    type: 'armor',
    rarity: 'white',
    level: 1,
    baseStats: { def: 3, hpMax: 20 },
  };

  // 基礎技能（2 個：普攻 + 1 個職業基礎主動技能，learnLevel=1）
  const skills = {};
  const clsSkills = cls?.allSkills || [];
  const basicSkill = clsSkills.find(s => s.category === 'basic' && s.learnLevel <= 1);
  if (basicSkill) {
    skills[basicSkill.id] = { id: basicSkill.id, level: 1, unlockLevel: basicSkill.learnLevel || 1 };
  }
  const activeSkill = clsSkills.find(s => s.category === 'attack' && s.learnLevel <= 1 && s.id !== basicSkill?.id)
    || clsSkills.find(s => s.learnLevel <= 1 && s.effect && s.effect !== 'basic_attack' && s.id !== basicSkill?.id);
  if (activeSkill) {
    skills[activeSkill.id] = { id: activeSkill.id, level: 1, unlockLevel: activeSkill.learnLevel || 1 };
  }

  // 初始 AI 為 1 級：基礎裝備、無英雄、無守護、無變身、初始資源與玩家一致
  const ai = {
    uid: 'ai' + (aiUidCounter++),
    name, classId: clsId, nation,
    level: startLevel, sprite: cls.sprite,
    mapId: mapId || 'gludin_field',
    x: 100 + Math.random() * ((CAMERA.worldWidth || 2496) - 200),
    y: 100 + Math.random() * ((CAMERA.worldHeight || 1664) - 200),
    targetX: 0, targetY: 0,
    hp: baseHp, hpMax: baseHp,
    mp: baseMp, mpMax: baseMp,
    atk: baseAtk, def: baseDef,
    state: 'wandering',
    facing: 'right',
    attackCooldown: 0,
    attackInterval: 1.4 + Math.random() * 0.4,
    wanderTimer: Math.random() * 3,
    hitTimer: 0,
    targetUid: null,
    kills: 0,
    gold: 300000,    // 初始金幣與玩家一致
    gem: 300000,     // 初始鑽石與玩家一致
    exp: 0,          // 初始經驗為0
    expMax,          // 對應等級的升級經驗
    contribution: 0, // 國家貢獻（真實累積）
    equipment,       // 白色基礎裝備
    hero: null,      // 初始無英雄
    guardian: null,  // 初始無守護
    transformId: null, // 初始無變身
    potions: { hp: 2, mp: 1 }, // 初始藥水
    guildId: null,   // 初始無軍團（需達到10級才能加入）
    online: Math.random() > 0.3, // 70% 上線率模擬
    offlineTimer: Math.random() * 600, // 下線/上線狀態切換計時器
    isActive: false, // 是否為活躍AI（真實模擬+渲染），預設為背景AI
    el: null,
    respawnTimer: 0,
    heroCooldown: 0,
    homeMapId: mapId || 'gludin_field',
    homeX: 0, homeY: 0,
    skills,          // 2個基礎技能
  };
  // 計算戰鬥力
  ai.power = calcAIPower(ai);
  // 記錄初始家園座標（低血量時回村補給的參考點）
  ai.homeX = ai.x;
  ai.homeY = ai.y;
  ai.targetX = ai.x; ai.targetY = ai.y;
  return ai;
}

// ==================== 稅收系統 ====================
const TAX_POOL_RATE = 0.10; // 全服消費的 10% 進入稅收池

// 從消費中抽取稅收（金幣和鑽石）到全局稅收池
function collectTax(goldAmount, gemAmount, mapId) {
  if ((!goldAmount || goldAmount <= 0) && (!gemAmount || gemAmount <= 0)) return;
  const allMaps = getAllMaps();
  const map = allMaps[mapId || GS.currentMap];
  if (!map) return;
  // 找到該地圖所屬城堡（若存在）
  let targetCastle = null;
  if (map.castle) {
    targetCastle = CASTLES.find(c => c.id === map.castle);
  } else {
    // 非城堡區域：按城堡等級比例分配給所有有主城堡
    const ownedCastles = CASTLES.filter(c => c.ownerGuildId || c.owner);
    if (ownedCastles.length === 0) return;
    const totalLv = ownedCastles.reduce((s, c) => s + c.level, 0);
    ownedCastles.forEach(c => {
      const ratio = c.level / totalLv;
      if (goldAmount > 0) {
        const tax = Math.floor(goldAmount * TAX_POOL_RATE * ratio);
        if (!GS.castleTreasuries[c.id]) GS.castleTreasuries[c.id] = 0;
        GS.castleTreasuries[c.id] += tax;
      }
      if (gemAmount > 0) {
        const tax = Math.floor(gemAmount * TAX_POOL_RATE * ratio);
        if (!GS.gemTaxPool) GS.gemTaxPool = {};
        if (!GS.gemTaxPool[c.id]) GS.gemTaxPool[c.id] = 0;
        GS.gemTaxPool[c.id] += tax;
      }
    });
    return;
  }
  if (!targetCastle) return;
  if (goldAmount > 0) {
    const tax = Math.floor(goldAmount * TAX_POOL_RATE);
    if (!GS.castleTreasuries[targetCastle.id]) GS.castleTreasuries[targetCastle.id] = 0;
    GS.castleTreasuries[targetCastle.id] += tax;
  }
  if (gemAmount > 0) {
    const tax = Math.floor(gemAmount * TAX_POOL_RATE);
    if (!GS.gemTaxPool) GS.gemTaxPool = {};
    if (!GS.gemTaxPool[targetCastle.id]) GS.gemTaxPool[targetCastle.id] = 0;
    GS.gemTaxPool[targetCastle.id] += tax;
  }
}

// 計算玩家在某城堡的綜合貢獻度（用於每週稅收分配）
function calcPlayerContributionScore(nationId) {
  const base = GS.nationContribution || 0;
  let siegeKills = 0;
  let siegeDeaths = 0;
  if (GS.siegeStats) {
    for (const cid in GS.siegeStats) {
      siegeKills += GS.siegeStats[cid].kills || 0;
      siegeDeaths += GS.siegeStats[cid].deaths || 0;
    }
  }
  // 貢獻度：基礎貢獻 + 擊殺*20 + 死亡*2
  return base + siegeKills * 20 + siegeDeaths * 2;
}

// 每週稅收結算：按綜合貢獻度均分給該城堡所屬國家的國民
function settleWeeklyTax() {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  if (GS.weeklyTaxSettled && now - GS.weeklyTaxSettled < weekMs) return; // 未到結算時間
  GS.weeklyTaxSettled = now;

  NATIONS.forEach(nation => {
    const nationCastles = CASTLES.filter(c => c.nation === nation.id);
    let totalGold = 0;
    let totalGem = 0;
    nationCastles.forEach(c => {
      totalGold += GS.castleTreasuries?.[c.id] || 0;
      totalGem += GS.gemTaxPool?.[c.id] || 0;
    });
    if (totalGold <= 0 && totalGem <= 0) return;

    // 計算該國家所有國民的綜合貢獻度總和
    const citizens = getNationCitizens(nation.id);
    let totalScore = 0;
    const scores = [];
    citizens.forEach(c => {
      let score;
      if (c.isPlayer) {
        score = calcPlayerContributionScore(nation.id);
      } else {
        score = (c.contribution || 0) + Math.floor(Math.random() * 50);
      }
      scores.push({ id: c.id || c.uid, score, isPlayer: c.isPlayer });
      totalScore += score;
    });

    if (totalScore <= 0) return;

    // 按比例分配（玩家直接加到賬戶）
    scores.forEach(s => {
      const ratio = s.score / totalScore;
      const goldShare = Math.floor(totalGold * ratio);
      const gemShare = Math.floor(totalGem * ratio);
      if (s.isPlayer) {
        if (goldShare > 0) {
          GS.resources.gold += goldShare;
          addLog('system', `💰 每週稅收結算：獲得 ${goldShare.toLocaleString()} 金幣`);
        }
        if (gemShare > 0) {
          GS.resources.gem += gemShare;
          addLog('system', `💎 每週稅收結算：獲得 ${gemShare} 鑽石`);
        }
      }
    });

    // 結算後清空稅收池
    nationCastles.forEach(c => {
      if (GS.castleTreasuries) GS.castleTreasuries[c.id] = 0;
      if (GS.gemTaxPool) GS.gemTaxPool[c.id] = 0;
    });
  });

  addLog('system', '📅 每週稅收已結算，按貢獻度分配至各國國民');
}

function calcAIPower(ai) {
  let atk = ai.atk, def = ai.def, hp = ai.hpMax;
  for (const s in ai.equipment) {
    const eq = ai.equipment[s];
    const bs = eq?.baseStats || {};
    atk += Number(bs.atk) || 0;
    def += Number(bs.def) || 0;
    hp += Number(bs.hpMax) || 0;
  }
  // 英雄加成
  if (ai.hero) {
    const hs = ai.hero.stats || {};
    atk += Number(hs.atk) || 0;
    def += Number(hs.def) || 0;
    hp += Number(hs.hpMax) || 0;
  }
  return Math.floor(atk * 2 + def * 1.5 + hp * 0.1);
}

function getAITotalAtk(ai) {
  let a = Number(ai.atk) || 0;
  for (const s in ai.equipment) {
    const eq = ai.equipment[s];
    const bs = eq?.baseStats || {};
    a += Number(bs.atk) || 0;
  }
  if (ai.hero) a += Number(ai.hero.stats?.atk) || 0;
  return Math.floor(a);
}
function getAITotalDef(ai) {
  let d = Number(ai.def) || 0;
  for (const s in ai.equipment) {
    const eq = ai.equipment[s];
    const bs = eq?.baseStats || {};
    d += Number(bs.def) || 0;
  }
  if (ai.hero) d += Number(ai.hero.stats?.def) || 0;
  return Math.floor(d);
}
function getAITotalHpMax(ai) {
  let h = Number(ai.hpMax) || 0;
  for (const s in ai.equipment) {
    const eq = ai.equipment[s];
    const bs = eq?.baseStats || {};
    h += Number(bs.hpMax) || 0;
  }
  if (ai.hero) h += Number(ai.hero.stats?.hpMax) || 0;
  return Math.floor(h);
}

// ==================== AI 輪替機制 ====================
// 玩家切換地圖時，隨機替換 10 個活躍/背景 AI，並重新分配當前地圖的活躍 AI 數量

function rotateActiveAI() {
  const active = GLOBAL_AI_POOL.filter(a => a.isActive);
  const bg = GLOBAL_AI_POOL.filter(a => !a.isActive);
  if (active.length === 0 || bg.length === 0) return;

  // 隨機選 10 個活躍 AI 轉為背景
  shuffle(active);
  const toBg = active.slice(0, Math.min(10, active.length));
  // 隨機選 10 個背景 AI 轉為活躍
  shuffle(bg);
  const toActive = bg.slice(0, toBg.length);

  const allMaps = getAllMaps();
  const battleMaps = Object.values(allMaps).filter(m => m.type === 'battle');

  toBg.forEach(ai => {
    ai.isActive = false;
    // 移除 DOM
    if (ai.el) { ai.el.remove(); ai.el = null; }
    // 重置狀態
    ai.state = 'wandering';
    ai.targetUid = null;
  });

  toActive.forEach(ai => {
    ai.isActive = true;
    // 隨機分配到一張戰鬥地圖
    const map = battleMaps[Math.floor(Math.random() * battleMaps.length)];
    ai.mapId = map.id;
    const w = map.w || WORLD_W || 2496;
    const h = map.h || WORLD_H || 1664;
    ai.x = 100 + Math.random() * (w - 200);
    ai.y = 100 + Math.random() * (h - 200);
    ai.targetX = ai.x; ai.targetY = ai.y;
    ai.state = 'wandering';
    ai.targetUid = null;
    ai.hp = ai.hpMax; ai.mp = ai.mpMax;
    ai.hitTimer = 0; ai.attackCooldown = 0;
  });

  console.log(`[AI Rotate] 輪替完成：${toActive.length} 背景→活躍, ${toBg.length} 活躍→背景`);
}

// 確保當前地圖有 20-30 個活躍 AI（不足則從其他地圖調動）
function assignActiveAIToCurrentMap() {
  const allMaps = getAllMaps();
  const map = allMaps[GS.currentMap];
  if (!map || map.type !== 'battle') return;

  const activeAI = getActiveAI();
  const currentMapActive = activeAI.filter(a => a.mapId === GS.currentMap);
  const otherMapActive = activeAI.filter(a => a.mapId !== GS.currentMap);

  // 目標：20-30 個，取隨機值
  const target = 20 + Math.floor(Math.random() * 11); // 20~30
  const need = target - currentMapActive.length;

  if (need > 0 && otherMapActive.length > 0) {
    shuffle(otherMapActive);
    const moveCount = Math.min(need, otherMapActive.length);
    const w = map.w || WORLD_W || 2496;
    const h = map.h || WORLD_H || 1664;
    for (let i = 0; i < moveCount; i++) {
      const ai = otherMapActive[i];
      ai.mapId = GS.currentMap;
      ai.x = 100 + Math.random() * (w - 200);
      ai.y = 100 + Math.random() * (h - 200);
      ai.targetX = ai.x; ai.targetY = ai.y;
      ai.state = 'wandering';
      ai.targetUid = null;
    }
    console.log(`[AI Assign] 從其他地圖調動 ${moveCount} 個活躍AI到 ${map.name}，當前地圖共 ${currentMapActive.length + moveCount} 個`);
  } else if (need < 0) {
    // 太多了，把多餘的移到其他地圖
    shuffle(currentMapActive);
    const removeCount = -need;
    const battleMaps = Object.values(allMaps).filter(m => m.type === 'battle' && m.id !== GS.currentMap);
    for (let i = 0; i < removeCount; i++) {
      const ai = currentMapActive[i];
      const otherMap = battleMaps[Math.floor(Math.random() * battleMaps.length)];
      ai.mapId = otherMap.id;
      if (ai.el) { ai.el.remove(); ai.el = null; }
    }
    console.log(`[AI Assign] 移出 ${removeCount} 個活躍AI到其他地圖，當前地圖剩 ${currentMapActive.length - removeCount} 個`);
  }
}

function spawnAIPlayers() {
  try {
    // 確保全AI池已初始化
    initGlobalAIPool();
    // 等待AI池初始化完成（異步情況下延遲生成）
    if (!_aiPoolInitDone) {
      setTimeout(() => spawnAIPlayers(), 200);
      return;
    }
    // 地圖切換時輪替 10 個 AI
    rotateActiveAI();
    // 確保當前地圖有 20-30 個活躍 AI
    assignActiveAIToCurrentMap();
    // 只渲染當前地圖的活躍 AI
    const currentMapAI = getAIPlayersOnCurrentMap();
    GS.aiPlayers = currentMapAI;
    // 分幀創建：每帧最多 10 個，避免一次性 DOM 操作阻塞主線程
    const BATCH = 10;
    let idx = 0;
    function spawnBatch() {
      const end = Math.min(idx + BATCH, currentMapAI.length);
      for (; idx < end; idx++) {
        const ai = currentMapAI[idx];
        if (ai.el) ai.el.remove();
        ai.el = null;
        if (ai.state !== 'dead') {
          createAISprite(ai);
        }
      }
      if (idx < currentMapAI.length) {
        requestAnimationFrame(spawnBatch);
      } else {
        console.log(`[AI] 當前地圖 ${GS.currentMap} 生成 ${currentMapAI.length} 個AI（分幀完成）`);
      }
    }
    spawnBatch();
  } catch (e) {
    console.error('[AI] spawnAIPlayers 失敗:', e);
    GS.aiPlayers = [];
  }
}

function createAISprite(ai) {
  const elDiv = document.createElement('div');
  elDiv.className = 'world-unit ai-player idle';
  elDiv.dataset.id = ai.uid;
  const isEnemy = ai.nation && GS.nation && ai.nation !== GS.nation;
  if (isEnemy) elDiv.classList.add('enemy-ai');
  const s = ai.sprite || SPRITE.warrior;
  const isImg = !!s.useImg;
  const filter = `drop-shadow(0 0 4px ${s.glow || '#ffe090'}) drop-shadow(0 2px 3px rgba(0,0,0,0.8))`;
  // 名字標籤：國旗+名稱
  const n = NATIONS.find(nn => nn.id === ai.nation);
  const flagImg = n ? safeFlagImg(ai.nation, 12) : '';
  const nameEl = document.createElement('div');
  nameEl.className = 'unit-info';
  nameEl.innerHTML = `
    <div class="unit-hp-bar"><div class="unit-hp-fill" style="width:100%;background:${isEnemy ? '#ff5050' : '#50c8ff'}"></div></div>
    <div class="unit-name" style="color:${isEnemy ? '#ff8080' : '#80d0ff'};font-size:10px">${flagImg}${ai.name}</div>
    <div class="unit-level-tag" style="display:none"></div>
  `;
  elDiv.appendChild(nameEl);
  // 精灵图（真實圖片優先，emoji 備用）
  const wrap = document.createElement('div');
  wrap.className = 'unit-sprite-wrap';
  wrap.style.width = '48px';
  wrap.style.height = '56px';
  if (isImg) {
    const imgIdle = document.createElement('img');
    imgIdle.className = 'unit-sprite-img sprite-frame-idle';
    imgIdle.src = s.idle;
    imgIdle.style.filter = filter;
    imgIdle.alt = '';
    imgIdle.loading = 'lazy';
    wrap.appendChild(imgIdle);
    const tomb = document.createElement('div');
    tomb.className = 'unit-sprite-tomb';
    tomb.textContent = '🪦';
    tomb.style.display = 'none';
    wrap.appendChild(tomb);
  } else {
    const emoji = document.createElement('div');
    emoji.className = 'unit-sprite-emoji';
    emoji.textContent = s.idle || '⚔️';
    emoji.dataset.spriteIdle = s.idle || '⚔️';
    emoji.dataset.spriteAttack = s.attack || s.idle || '⚔️';
    emoji.dataset.spriteDead = '🪦';
    emoji.style.color = s.color || '#c0a060';
    emoji.style.fontSize = '36px';
    emoji.style.filter = filter;
    wrap.appendChild(emoji);
  }
  elDiv.appendChild(wrap);
  // 阴影
  const shadow = document.createElement('div');
  shadow.className = 'unit-shadow';
  elDiv.appendChild(shadow);
  // 点击攻擊 AI 玩家
  elDiv.addEventListener('click', e => {
    e.stopPropagation();
    onAIPlayerClick(ai);
  });
  worldLayer.appendChild(elDiv);
  positionUnit(elDiv, ai.x, ai.y, 'hero');
  ai.el = elDiv;
  return elDiv;
}

// ==================== AI 玩家点击 & 受伤 ====================
function onAIPlayerClick(ai) {
  if (ai.hp <= 0 || ai.state === 'dead') return;
  const allMaps = getAllMaps();
  if (allMaps[GS.currentMap]?.type === 'safe') return;
  // 设为攻擊目標，走过去攻擊
  GS.targetAiUid = ai.uid;
  const cls = CLASSES[GS.player.classId];
  const range = cls.atkType === 'ranged' ? 120 : 40;
  const dx = ai.x - GS.player.x;
  const dy = ai.y - GS.player.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) {
    const ratio = (dist - range + 5) / dist;
    GS.player.targetX = GS.player.x + dx * ratio;
    GS.player.targetY = GS.player.y + dy * ratio;
  }
  GS.player.state = 'walking';
  GS.player.facing = dx >= 0 ? 'right' : 'left';
  // AI 被攻擊后反击
  ai.targetUid = 'player';
  ai.state = 'chasing';
}

function dealDamageToAIPlayer(ai, dmg, damageType, skill, effectType) {
  if (!ai || ai.hp <= 0) return;
  const isCrit = damageType === 'crit' || Math.random() < 0.05;
  const finalDmg = isCrit ? Math.floor(dmg * 1.5) : dmg;
  ai.hp = Math.max(0, ai.hp - finalDmg);
  ai.hitTimer = 0.3;
  ai.targetUid = 'player';
  ai.state = 'chasing';
  showDamage(ai.x, ai.y - 50, finalDmg, isCrit ? 'crit' : 'normal');
  if (ai.el) {
    const hpFill = ai.el.querySelector('.unit-hp-fill');
    if (hpFill) hpFill.style.width = (ai.hp / ai.hpMax * 100) + '%';
  }
  addLog(isCrit ? 'crit' : 'damage',
    `你對【${ai.name}】造成 ${finalDmg} 傷害${isCrit ? '（暴擊）' : ''}${skill?.name ? ' · ' + skill.name : ''}`);
  if (ai.hp <= 0) {
    ai.state = 'dead';
    // PVP擊殺AI玩家：只給予極少量經驗，不掉落金幣/道具
    const exp = Math.min(10, Math.max(5, ai.level));
    GS.player.exp += exp;
    addLog('pvp', `擊敗了 ${ai.name}（PVP），獲得 ${exp} 經驗`);
    onAIPlayerDead(ai);
    checkLevelUp();
    updateUI();
  }
}

function damageAIPlayer(ai, dmg, source) {
  if (ai.hp <= 0) return;
  ai.hp = Math.max(0, ai.hp - dmg);
  ai.hitTimer = 0.3;
  showDamage(ai.x, ai.y - 50, dmg, source === 'crit' ? 'crit' : 'normal');
  // 更新血条
  if (ai.el) {
    const hpFill = ai.el.querySelector('.unit-hp-fill');
    if (hpFill) hpFill.style.width = (ai.hp / ai.hpMax * 100) + '%';
  }
  // 被攻擊后反击玩家
  if (source !== 'player' && ai.targetUid !== 'player') {
    ai.targetUid = 'player';
  }
  // 血量低于 30% 时逃跑
  if (ai.hp / ai.hpMax < 0.3 && ai.state !== 'fleeing') {
    ai.state = 'fleeing';
    ai.targetUid = null;
    // 选一个地圖边缘的逃跑方向
    const edge = Math.floor(Math.random() * 4);
    const w = worldMaxW(), h = worldMaxH();
    if (edge === 0) { ai.targetX = 30; ai.targetY = Math.random() * h; }
    else if (edge === 1) { ai.targetX = w - 30; ai.targetY = Math.random() * h; }
    else if (edge === 2) { ai.targetX = Math.random() * w; ai.targetY = 30; }
    else { ai.targetX = Math.random() * w; ai.targetY = h - 30; }
  }
  if (ai.hp <= 0) onAIPlayerDead(ai);
}

// 顯示死亡提示彈窗
function showDeathNotice(killer, lostExp, lostLevel, isAIKiller) {
  const overlay = document.createElement('div');
  overlay.className = 'death-notice-overlay';
  const lossText = lostExp > 0
    ? `<div class="death-loss">損失 ${formatNumber(lostExp)} 經驗${lostLevel > 0 ? '（降級）' : ''}</div>`
    : '';
  const killerLabel = isAIKiller ? `${killer}` : `【${killer}】`;
  overlay.innerHTML = `
    <div class="death-notice-box">
      <div class="death-title">你被 ${killerLabel} 擊倒了</div>
      ${lossText}
      <div class="death-countdown">正在復活... <span id="death-countdown-num">3</span>s</div>
    </div>
  `;
  document.body.appendChild(overlay);
  // 倒數顯示
  let sec = 3;
  const tick = () => {
    const num = overlay.querySelector('#death-countdown-num');
    if (num) num.textContent = sec;
    sec--;
    if (sec >= 0) setTimeout(tick, 1000);
  };
  setTimeout(tick, 0);
  // 3 秒後自動消失
  setTimeout(() => {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.5s';
    setTimeout(() => overlay.remove(), 500);
  }, 3000);
}

// 玩家死亡复活逻辑（被AI玩家或怪物击杀都走这里）
function onPlayerDead() {
  const p = GS.player;
  if (p.state === 'dead') return; // 避免重复触发
  p.state = 'dead';
  addLog('system', '你倒下了...');
  if (window.AudioSystem) AudioSystem.sfxDeath();
  if (GS.autoMode) {
    GS.autoMode = false;
    const autoLabel = $('auto-label');
    if (autoLabel) autoLabel.textContent = '自動';
    const autoBtn = $('auto-btn');
    if (autoBtn) autoBtn.classList.remove('active');
  }
  // 死亡經驗损失：30级以上地圖死亡损失当前等級5%經驗，可降级
  const allMaps = getAllMaps();
  const curMap = allMaps[GS.currentMap];
  let lostExp = 0;
  let lostLevel = 0;
  if (curMap && (curMap.levelMin >= 30 || (curMap.levelMin < 30 && curMap.levelMax > 30 && p.level >= 30))) {
    if (p.level >= 30) {
      const expNeeded = getExpForLevel(p.level);
      lostExp = Math.floor(p.exp);
      const fivePercent = Math.floor(expNeeded * 0.05);
      lostExp = Math.max(fivePercent, Math.floor(p.exp * 0.05));
      if (lostExp > p.exp) {
        const deficit = lostExp - p.exp;
        if (p.level > 1) {
          p.level -= 1;
          lostLevel = 1;
          const prevExp = getExpForLevel(p.level);
          p.exp = Math.max(0, prevExp - deficit);
          addLog('system', `你因死亡而降級了！當前等級：${p.level}`);
        } else {
          lostExp = p.exp;
          p.exp = 0;
        }
      } else {
        p.exp -= lostExp;
      }
      addLog('system', `死亡損失經驗：-${formatNumber(lostExp)}`);
      calcCP();
    }
  }
  // 顯示死亡提示彈窗：你被【XXX】擊倒了
  const killer = p.lastKiller || '未知敵人';
  const isAIKiller = /\[AI\]/.test(killer);
  showDeathNotice(killer, lostExp, lostLevel, isAIKiller);
  // 3秒后复活回到出生点/村莊，恢复50%血量
  setTimeout(() => {
    const hpMax = getTotalHpMax();
    p.hp = Math.floor(hpMax * 0.5);
    p.state = 'idle';
    // 回城复活
    const safeMap = SAFE_MAPS['village'] ? 'village' : Object.keys(SAFE_MAPS)[0];
    if (GS.currentMap !== safeMap) {
      loadMap(safeMap);
      const msg = lostExp > 0
        ? `你已復活回到古魯丁村莊。死亡損失：${formatNumber(lostExp)} 經驗${lostLevel > 0 ? '（降級）' : ''}`
        : '你已復活，回到了古魯丁村莊。';
      addLog('system', msg);
      if (lostExp > 0) showDamage(p.x, p.y - 60, `-${formatNumber(lostExp)} EXP`, 'heal');
    } else {
      // 已经在村莊，回到村莊中心
      const map = getAllMaps()[safeMap];
      if (map) {
        p.x = map.w / 2;
        p.y = map.h * 0.7;
        p.targetX = p.x;
        p.targetY = p.y;
      }
      addLog('system', '你已復活。');
    }
    updateUI();
    renderPlayer();
  }, 3000);
}

function onAIPlayerDead(ai) {
  ai.state = 'dead';
  if (ai.el) ai.el.classList.add('dead');
  GS.player.kills = (GS.player.kills || 0) + 1;
  // PVP擊殺AI玩家：僅給予極少量經驗，不掉落金幣、道具和裝備
  const exp = Math.min(10, Math.max(5, ai.level));
  GS.player.exp += exp;
  addLog('pvp', `擊敗了 ${ai.name}（PVP），獲得 ${exp} 經驗`);
  showDamage(ai.x, ai.y - 60, '+' + exp + ' EXP', 'heal');
  // 1.5 秒后移除DOM，由 updateGlobalAIGrowth 的 respawnTimer 统一复活（避免两套逻辑冲突）
  setTimeout(() => {
    if (ai.el) { ai.el.remove(); ai.el = null; }
    const idx = GS.aiPlayers.indexOf(ai);
    if (idx > -1) GS.aiPlayers.splice(idx, 1);
    // 啟動復活計時（統一由 updateGlobalAIGrowth 處理）
    ai.respawnTimer = 0;
  }, 1500);
}

// AI 被另一個 AI 擊殺（與玩家擊殺處理類似，但不給玩家獎勵）
function onAIPlayerKilledByAI(victim, killer) {
  victim.state = 'dead';
  if (victim.el) victim.el.classList.add('dead');
  setTimeout(() => {
    if (victim.el) { victim.el.remove(); victim.el = null; }
    const idx = GS.aiPlayers.indexOf(victim);
    if (idx > -1) GS.aiPlayers.splice(idx, 1);
    victim.respawnTimer = 0;
  }, 1500);
}

function updateAIPlayers(dt) {
  if (!GS.aiPlayers || GS.aiPlayers.length === 0) return;
  const allMaps = getAllMaps();
  const map = allMaps[GS.currentMap];
  if (!map || map.type !== 'battle') return;
  GS.aiPlayers.forEach(ai => {
    if (ai.state === 'dead') {
      ai.respawnTimer = (ai.respawnTimer || 0) + dt;
      if (ai.respawnTimer > 30) {
        // 活躍 AI 復活：原地圖復活
        ai.state = 'wandering';
        ai.hp = ai.hpMax;
        ai.mp = ai.mpMax;
        ai.attackCooldown = 0;
        ai.hitTimer = 0;
        ai.targetUid = null;
        ai.respawnTimer = 0;
        ai.x = 100 + Math.random() * ((CAMERA.worldWidth || 2496) - 200);
        ai.y = 100 + Math.random() * ((CAMERA.worldHeight || 1664) - 200);
        ai.targetX = ai.x; ai.targetY = ai.y;
        try { createAISprite(ai); } catch (e) { /* ignore */ }
      }
      return;
    }
    if (ai.hitTimer > 0) ai.hitTimer -= dt;
    if (ai.attackCooldown > 0) ai.attackCooldown -= dt;

    // ===== AI 心跳檢測 =====
    ai._heartbeat = (ai._heartbeat || 0) + dt;
    ai._lastState = ai._lastState || ai.state;
    ai._lastX = ai._lastX ?? ai.x;
    ai._lastY = ai._lastY ?? ai.y;
    if (ai._heartbeat > 5) {
      // 每5秒檢查一次：狀態沒變化且位置沒動 → 重置
      const moved = Math.hypot(ai.x - ai._lastX, ai.y - ai._lastY);
      const stuck = moved < 5 && ai.state !== 'idle' && ai.state !== 'village_resting';
      if (stuck || ai.state === 'dead') {
        // 重置狀態
        ai.state = 'wandering';
        ai.targetUid = null;
        ai.targetX = 50 + Math.random() * (worldMaxW() - 100);
        ai.targetY = 80 + Math.random() * (worldMaxH() - 160);
      }
      ai._heartbeat = 0;
      ai._lastX = ai.x;
      ai._lastY = ai.y;
    }

    // ===== AI 村莊補給邏輯 =====
    // 血量低於50%時嘗試喝藥水；藥水用完則返回村莊
    const hpRatio = ai.hp / ai.hpMax;
    const mpRatio = ai.mp / ai.mpMax;
    if (ai.state !== 'returning_to_village' && ai.state !== 'village_resting') {
      if (ai.potions == null) ai.potions = { hp: 3, mp: 2 };
      // 血量低時喝紅水（戰鬥中更積極）
      const inCombat = ai.targetUid && ai.state !== 'wandering';
      const hpThreshold = inCombat ? 0.5 : 0.35;
      if (hpRatio < hpThreshold && (ai.potions.hp || 0) > 0) {
        ai.potions.hp--;
        ai.hp = Math.min(ai.hpMax, ai.hp + ai.hpMax * 0.4);
        showDamage(ai.x, ai.y - 60, '+' + Math.floor(ai.hpMax * 0.4), 'heal');
        if (ai.el) {
          const hpBar = ai.el.querySelector('.unit-hp-fill');
          if (hpBar) hpBar.style.width = (ai.hp / ai.hpMax * 100) + '%';
        }
      }
      // 藍量低時喝藍水
      if (mpRatio < 0.3 && (ai.potions.mp || 0) > 0) {
        ai.potions.mp--;
        ai.mp = Math.min(ai.mpMax, ai.mp + ai.mpMax * 0.5);
      }
      // 沒藥水且血量低 → 返回村莊
      if (hpRatio < 0.25 && (ai.potions.hp || 0) <= 0) {
        ai.state = 'returning_to_village';
        ai.targetUid = null;
        const allMaps = getAllMaps();
        const bm = allMaps[ai.mapId || GS.currentMap];
        const villageId = bm?.nearVillage || 'village';
        ai.tempVillageId = villageId;
        ai.targetX = worldMaxW() / 2 + (Math.random() - 0.5) * 200;
        ai.targetY = 60;
      }
    }

    // 返回村莊狀態：走到地圖上方後切換到村莊並休息
    if (ai.state === 'returning_to_village') {
      if (ai.y <= 70) {
        // 從戰鬥地圖離開，轉移到村莊
        const allMaps = getAllMaps();
        const villageId = ai.tempVillageId || 'village';
        if (ai.mapId === GS.currentMap && ai.el) {
          ai.el.remove(); ai.el = null;
        }
        ai.mapId = 'village_' + villageId; // 標記在村莊
        ai.state = 'village_resting';
        ai.restTimer = 5 + Math.random() * 5; // 休息5-10秒
        ai.x = 200 + Math.random() * 800;
        ai.y = 600 + Math.random() * 300;
      }
      return; // 其餘行為跳過
    }

    // 村莊休息狀態：計時結束後返回戰鬥地圖
    if (ai.state === 'village_resting') {
      ai.restTimer -= dt;
      // 慢慢回血
      ai.hp = Math.min(ai.hpMax, ai.hp + ai.hpMax * 0.15 * dt);
      if (ai.restTimer <= 0) {
        // 補給完畢，重新出發
        ai.potions = { hp: 3 + Math.floor(Math.random() * 2), mp: 1 };
        ai.state = 'wandering';
        ai.targetUid = null;
        // 回到原戰鬥地圖
        const allMaps = getAllMaps();
        const battleMaps = Object.values(allMaps).filter(m => m.type === 'battle');
        migrateAIToAppropriateMap(ai, battleMaps);
      }
      return;
    }
    // 找最近的怪物作为目標（優先選擇等級相近的怪物，避開強敵）
    let bestTarget = null;
    let bestScore = -Infinity;
    const viewRange = 260;
    GS.monsters.forEach(m => {
      if (m.hp <= 0) return;
      const d = Math.hypot(m.x - ai.x, m.y - ai.y);
      if (d > viewRange) return;
      // 等級差距評分：越接近越好，差距大扣分
      const lvDiff = Math.abs((m.level || 1) - ai.level);
      // 首領級怪物（高5級以上）視為強敵，優先避開
      const isBoss = (m.level || 1) > ai.level + 4;
      if (isBoss && hpRatio > 0.5) return; // 血量高時不惹Boss
      let score = -d * 0.1 - lvDiff * 30;
      if (isBoss) score -= 500;
      // 同級或低級怪優先
      if (lvDiff <= 2) score += 100;
      if (score > bestScore) { bestScore = score; bestTarget = m; }
    });
    // 找最近的敵對 AI 玩家（不同國家優先攻擊）
    let nearestEnemyAI = null;
    let nearestEnemyAIDist = Infinity;
    let enemyAIScore = -Infinity;
    GS.aiPlayers.forEach(other => {
      if (other.uid === ai.uid || other.hp <= 0 || other.state === 'dead') return;
      const sameNation = other.nation === ai.nation;
      const sameGuild = other.guildId && ai.guildId && other.guildId === ai.guildId;
      if (sameGuild) return; // 同公会不打
      const d = Math.hypot(other.x - ai.x, other.y - ai.y);
      if (d > 200) return;
      // 不同國家優先攻擊
      let score = -d * 0.1;
      if (!sameNation) score += 200; // 敵國加分很多
      else score -= 100; // 同國扣分
      if (score > enemyAIScore) { enemyAIScore = score; nearestEnemyAI = other; nearestEnemyAIDist = d; }
    });
    // 协助攻擊：附近同國AI正在戰鬥時，加入協助
    GS.aiPlayers.forEach(other => {
      if (other.uid === ai.uid || other.hp <= 0 || other.state === 'dead') return;
      if (other.nation !== ai.nation) return;
      if (other.guildId && ai.guildId && other.guildId !== ai.guildId) return;
      const d = Math.hypot(other.x - ai.x, other.y - ai.y);
      if (d < 150 && other.targetUid && !ai.targetUid && Math.random() < 0.4) {
        ai.targetUid = other.targetUid;
      }
    });
    // 敌对阵营 AI 会攻擊玩家（一定概率触发 PvP）
    const isEnemy = ai.nation && GS.nation && ai.nation !== GS.nation;
    if (isEnemy && Math.random() < 0.003) {
      const pDist = Math.hypot(GS.player.x - ai.x, GS.player.y - ai.y);
      if (pDist < 250) ai.targetUid = 'player';
    }
    // 優先攻擊敵對AI（距離近且評分高）
    if (nearestEnemyAI && nearestEnemyAIDist < 180 && enemyAIScore > 0 && Math.random() < 0.015) {
      ai.targetUid = 'ai_' + nearestEnemyAI.uid;
    }
    if (bestTarget && ai.targetUid !== 'player' && !ai.targetUid?.startsWith('ai_')) {
      ai.targetUid = bestTarget.uid;
    }
    // 行为逻辑
    if (ai.targetUid === 'player') {
      const p = GS.player;
      const dx = p.x - ai.x;
      const dy = p.y - ai.y;
      const dist = Math.hypot(dx, dy);
      const range = CLASSES[ai.classId]?.atkType === 'ranged' ? 120 : 40;
      ai.facing = dx >= 0 ? 'right' : 'left';
      if (dist > range) {
        ai.state = 'chasing';
        const ratio = (dist - range + 5) / dist;
        ai.targetX = ai.x + dx * ratio;
        ai.targetY = ai.y + dy * ratio;
      } else if (ai.attackCooldown <= 0 && p.hp > 0) {
        ai.state = 'attacking';
        ai.attackCooldown = ai.attackInterval;
        const dmg = Math.max(1, Math.floor(getAITotalAtk(ai) * (0.9 + Math.random() * 0.2) - getTotalDef() * 0.5));
        p.hp = Math.max(0, p.hp - dmg);
        showDamage(p.x, p.y - 58, dmg, 'normal');
        // 記錄攻擊者（用於死亡提示）
        const aiNation = (ai.nation && NATIONS.find(n => n.id === ai.nation)?.name) || '';
        p.lastKiller = aiNation ? `${aiNation}·${ai.name}` : ai.name;
        // 自動模式下被AI攻擊 → 自動反击
        if (GS.autoMode && p.hp > 0 && ai.hp > 0 && ai.state !== 'dead') {
          GS.targetAiUid = ai.uid;
          GS.targetMonsterUid = null;
        }
        if (p.hp <= 0) onPlayerDead();
      } else {
        ai.state = 'idle';
      }
    } else if (ai.targetUid && typeof ai.targetUid === 'string' && ai.targetUid.startsWith('ai_')) {
      // AI vs AI PvP
      const targetUid = ai.targetUid.substring(3);
      const target = GS.aiPlayers.find(a => a.uid === targetUid && a.hp > 0 && a.state !== 'dead');
      if (!target) { ai.targetUid = null; ai.state = 'wandering'; }
      else {
        const dx = target.x - ai.x;
        const dy = target.y - ai.y;
        const dist = Math.hypot(dx, dy);
        const range = CLASSES[ai.classId]?.atkType === 'ranged' ? 120 : 40;
        ai.facing = dx >= 0 ? 'right' : 'left';
        if (dist > range) {
          ai.state = 'chasing';
          const ratio = (dist - range + 5) / dist;
          ai.targetX = ai.x + dx * ratio;
          ai.targetY = ai.y + dy * ratio;
        } else if (ai.attackCooldown <= 0) {
          ai.state = 'attacking';
          ai.attackCooldown = ai.attackInterval;
          const dmg = Math.max(1, Math.floor(getAITotalAtk(ai) * (0.9 + Math.random() * 0.2) - getAITotalDef(target) * 0.5));
          target.hp = Math.max(0, target.hp - dmg);
          showDamage(target.x, target.y - 50, dmg, 'normal');
          target.hitTimer = 0.2;
          if (target.el) {
            target.el.classList.add('hit');
            setTimeout(() => { if (target.el) target.el.classList.remove('hit'); }, 200);
            const hpBar = target.el.querySelector('.unit-hp-fill');
            if (hpBar) hpBar.style.width = (target.hp / target.hpMax * 100) + '%';
          }
          // 反擊
          if (!target.targetUid || Math.random() < 0.7) {
            target.targetUid = 'ai_' + ai.uid;
          }
          if (target.hp <= 0) {
            ai.kills++;
            ai.gold += Math.floor(target.gold * 0.2);
            onAIPlayerKilledByAI(target, ai);
          }
        } else {
          ai.state = 'idle';
        }
      }
    } else if (ai.targetUid && bestTarget) {
      const m = bestTarget;
      const dx = m.x - ai.x;
      const dy = m.y - ai.y;
      const dist = Math.hypot(dx, dy);
      const range = CLASSES[ai.classId]?.atkType === 'ranged' ? 120 : 40;
      ai.facing = dx >= 0 ? 'right' : 'left';
      if (dist > range) {
        ai.state = 'chasing';
        const ratio = (dist - range + 5) / dist;
        ai.targetX = ai.x + dx * ratio;
        ai.targetY = ai.y + dy * ratio;
      } else if (ai.attackCooldown <= 0) {
        ai.state = 'attacking';
        ai.attackCooldown = ai.attackInterval;
        // AI 使用技能（30% 概率觸發技能）
        const aiCls = CLASSES[ai.classId];
        let skillDmg = 0;
        let usedSkill = false;
        if (aiCls?.skills && ai.level >= 5 && Math.random() < 0.3) {
          const availableSkills = aiCls.skills.filter(s => !s.learnLevel || ai.level >= s.learnLevel);
          if (availableSkills.length > 0) {
            const skill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
            const mult = skill.dmgMult || 1;
            skillDmg = getAITotalAtk(ai) * mult;
            usedSkill = true;
            // 技能特效文字
            const hpBar = ai.el?.querySelector('.unit-hp-fill');
            if (window.AudioSystem) AudioSystem.sfxHit && AudioSystem.sfxHit();
          }
        }
        const defVal = Number(m.def) || 0;
        const dr = Math.min(0.75, defVal * 0.005);
        const baseAtk = usedSkill ? skillDmg : getAITotalAtk(ai);
        const dmg = Math.max(1, Math.floor(baseAtk * (1 - dr) * (0.9 + Math.random() * 0.2)));
        m.hp = Math.max(0, m.hp - dmg);
        showDamage(m.x, m.y - 50, dmg, usedSkill ? 'crit' : 'normal');
        m.aggroed = true;
        const mEl = worldLayer.querySelector(`[data-id="${m.uid}"]`);
        if (mEl) mEl.querySelector('.unit-hp-fill').style.width = (m.hp / m.hpMax * 100) + '%';
        if (m.hp <= 0) {
          ai.kills++;
          // AI獲得經驗和金幣
          const expGain = Math.floor(m.level * 5 + 10);
          ai.exp += expGain;
          ai.gold += Math.floor(m.level * 3 + 5);
          // AI升級
          while (ai.exp >= ai.expMax) {
            ai.exp -= ai.expMax;
            ai.level++;
            ai.expMax = Math.floor(ai.expMax * 1.3);
            const hpGain = Math.floor(ai.hpMax * 0.08);
            ai.hpMax += hpGain;
            ai.hp = ai.hpMax;
            ai.atk = Math.floor(ai.atk * 1.06);
            ai.def = Math.floor(ai.def * 1.05);
            ai.power = Math.floor(ai.atk * 2 + ai.def * 1.5 + ai.hpMax * 0.1);
            // 升級時隨機捐獻國家貢獻（每次升級捐一部分金幣換取貢獻）
            if (ai.gold > 50 && Math.random() < 0.5) {
              const donateGold = Math.min(Math.floor(ai.gold * 0.15), 200);
              if (donateGold > 0) {
                ai.gold -= donateGold;
                ai.contribution = (ai.contribution || 0) + Math.floor(donateGold / 10);
              }
            }
            // 10 級以上有概率加入軍團（只能加入國家等級已解鎖的軍團）
            if (ai.level >= 10 && !ai.guildId && Math.random() < 0.2) {
              const availableGuilds = getNationAvailableGuilds(ai.nation);
              if (availableGuilds.length > 0) {
                const chosen = availableGuilds[Math.floor(Math.random() * availableGuilds.length)];
                ai.guildId = chosen.id;
                // 第一個加入軍團的 AI 擔任軍團長（若當前軍團長為系統暫代）
                if (chosen.leader === '系統暫代') {
                  chosen.leader = ai.name;
                }
              }
            }
            // 30 級解鎖英雄助戰
            if (ai.level >= 30 && !ai.hero) {
              ai.hero = {
                id: 'ai_hero_' + ai.uid,
                name: '侍從·' + ai.name,
                rarity: ai.level >= 50 ? 'purple' : 'blue',
                level: Math.floor(ai.level * 0.6),
                classId: ai.classId,
                stats: {
                  atk: Math.floor(ai.atk * 0.3),
                  def: Math.floor(ai.def * 0.2),
                  hpMax: Math.floor(ai.hpMax * 0.2),
                },
              };
              ai.power = calcAIPower(ai);
            }
          }
          onMonsterDead(m);
        }
      } else {
        ai.state = 'idle';
      }
    } else {
      // 游荡
      ai.state = 'wandering';
      ai.wanderTimer -= dt;
      if (ai.wanderTimer <= 0) {
        ai.wanderTimer = 2 + Math.random() * 3;
        ai.targetX = 50 + Math.random() * (worldMaxW() - 100);
        ai.targetY = 80 + Math.random() * (worldMaxH() - 160);
      }
    }
    // 移動
    const speed = 60 + ai.level * 0.5;
    const mdx = ai.targetX - ai.x;
    const mdy = ai.targetY - ai.y;
    const mdist = Math.hypot(mdx, mdy);
    if (mdist > 2) {
      const moveDist = Math.min(mdist, speed * dt);
      ai.x += mdx / mdist * moveDist;
      ai.y += mdy / mdist * moveDist;
      ai.facing = mdx >= 0 ? 'right' : 'left';
    }
    // 更新 DOM
    if (ai.el) {
      positionUnit(ai.el, ai.x, ai.y, 'hero');
      // 視口外AI跳過classList操作（CSS動畫已暫停），進一步減少DOM訪問
      if (!ai.el._offscreen) {
        // 朝向：只有變化時才切換
        if (ai._lastFacing !== ai.facing) {
          ai.el.classList.toggle('face-left', ai.facing === 'left');
          ai.el.classList.toggle('face-right', ai.facing === 'right');
          ai._lastFacing = ai.facing;
        }
        // 狀態：只有變化時才改classList，避免每幀重設
        const baseState = ai.state === 'chasing' || ai.state === 'wandering' ? 'walking' : ai.state;
        const hitState = ai.hitTimer > 0 ? 'hit' : '';
        const fullState = hitState ? baseState + '+' + hitState : baseState;
        if (ai._renderState !== fullState) {
          ai.el.classList.remove('idle', 'walking', 'attacking', 'chasing', 'wandering', 'hit', 'dead');
          ai.el.classList.add(baseState);
          if (hitState) ai.el.classList.add('hit');
          ai._renderState = fullState;
          // 重新觸發攻擊動畫
          if (baseState === 'attacking') {
            const wrap = ai.el.querySelector('.unit-sprite-wrap');
            if (wrap) {
              wrap.style.animation = 'none';
              void wrap.offsetWidth;
              wrap.style.animation = '';
            }
          }
        }
      }
    }
  });
}

// ==================== 全局 AI 更新（跨地圖，所有AI都會成長、換地圖、用技能藥水） ====================
// 背景AI批量更新計時器已移到 _backgroundAITimer

function updateGlobalAIGrowth(dt) {
  _backgroundAITimer += dt;
  if (_backgroundAITimer < BACKGROUND_AI_UPDATE_INTERVAL) return;
  _backgroundAITimer = 0;

  const allMaps = getAllMaps();
  const battleMaps = Object.values(allMaps).filter(m => m.type === 'battle');
  if (battleMaps.length === 0) return;

  // 只更新背景 AI（60個），活躍 AI 由戰鬥模擬實時處理
  const bgAI = GLOBAL_AI_POOL.filter(a => !a.isActive);

  bgAI.forEach(ai => {
    // 死亡的背景 AI 也正常復活
    if (ai.state === 'dead') {
      ai.respawnTimer = (ai.respawnTimer || 0) + BACKGROUND_AI_UPDATE_INTERVAL;
      if (ai.respawnTimer > 30) {
        ai.state = 'wandering';
        ai.hp = ai.hpMax;
        ai.mp = ai.mpMax;
        ai.respawnTimer = 0;
      }
      return;
    }

    // 模擬掛機打怪獲得經驗和金幣（30秒累積量）
    const expGain = Math.floor((5 + ai.level * 2) * 10); // 約10倍於每3秒
    ai.exp += expGain;
    ai.gold += Math.floor(ai.level * 1.5 * 10);

    // 升級
    let leveledUp = false;
    while (ai.exp >= ai.expMax) {
      ai.exp -= ai.expMax;
      ai.level++;
      ai.expMax = Math.floor(ai.expMax * 1.3);
      const hpGain = Math.floor(ai.hpMax * 0.08);
      ai.hpMax += hpGain;
      ai.hp = ai.hpMax;
      ai.atk = Math.floor(ai.atk * 1.06);
      ai.def = Math.floor(ai.def * 1.05);
      leveledUp = true;
    }

    // 達到10級自動加入軍團
    if (ai.level >= 10 && !ai.guildId && Math.random() < 0.3) {
      const availableGuilds = getNationAvailableGuilds(ai.nation);
      if (availableGuilds.length > 0) {
        const chosen = availableGuilds[Math.floor(Math.random() * availableGuilds.length)];
        ai.guildId = chosen.id;
        if (chosen.leader === '系統暫代') {
          chosen.leader = ai.name;
        }
      }
    }

    // 隨機捐獻金幣給國家/軍團
    if (Math.random() < 0.2) {
      const donate = Math.floor(ai.gold * 0.05);
      if (donate > 0) {
        ai.gold -= donate;
        ai.contribution += donate;
      }
    }

    // 根據等級更換練功地圖
    if (leveledUp) maybeMigrateAI(ai, battleMaps);

    // 更新戰力（確保排行榜數據真實）
    ai.power = Math.floor(ai.atk * 2 + ai.def * 1.5 + ai.hpMax * 0.1);
  });

  console.log(`[AI BG] 背景AI批量更新完成，共 ${bgAI.length} 個`);
}

// AI 根據當前等級檢查是否需要換地圖
function maybeMigrateAI(ai, battleMaps) {
  if (Math.random() > 0.15) return; // 15%概率檢查，不是每次都換
  const curMap = battleMaps.find(m => m.id === ai.mapId);
  if (!curMap) {
    migrateAIToAppropriateMap(ai, battleMaps);
    return;
  }
  // 等級超出地圖上限太多，或低於地圖下限太多 → 換地圖
  if (ai.level > curMap.levelMax + 5 || ai.level < curMap.levelMin - 2) {
    migrateAIToAppropriateMap(ai, battleMaps);
  }
}

// 將AI移動到適合其等級的地圖
function migrateAIToAppropriateMap(ai, battleMaps) {
  // 找最適合的地圖：等級區間包含AI等級的優先，否則找最近的
  let best = null;
  let bestScore = -Infinity;
  battleMaps.forEach(m => {
    if (ai.level >= m.levelMin && ai.level <= m.levelMax) {
      // 在區間內，優先級最高，離中心越近越好
      const center = (m.levelMin + m.levelMax) / 2;
      const score = 1000 - Math.abs(ai.level - center);
      if (score > bestScore) { bestScore = score; best = m; }
    }
  });
  if (!best) {
    // 不在任何區間，找最近的
    battleMaps.forEach(m => {
      const score = -Math.min(Math.abs(ai.level - m.levelMin), Math.abs(ai.level - m.levelMax));
      if (score > bestScore) { bestScore = score; best = m; }
    });
  }
  if (best && best.id !== ai.mapId) {
    // 如果在當前地圖顯示中，先移除舊DOM并从当前列表移除
    if (ai.mapId === GS.currentMap) {
      if (ai.el) { ai.el.remove(); ai.el = null; }
      const idx = (GS.aiPlayers || []).indexOf(ai);
      if (idx > -1) GS.aiPlayers.splice(idx, 1);
    }
    const newW = best.w || WORLD_W;
    const newH = best.h || WORLD_H;
    ai.mapId = best.id;
    ai.x = 100 + Math.random() * Math.max(200, newW - 200);
    ai.y = 120 + Math.random() * Math.max(200, newH - 240);
    ai.targetUid = null;
    ai.state = 'wandering';
    // 如果剛好移到玩家當前地圖，重新建立精靈并加入当前列表
    if (ai.mapId === GS.currentMap) {
      createAISprite(ai);
      if (!GS.aiPlayers) GS.aiPlayers = [];
      if (GS.aiPlayers.indexOf(ai) === -1) GS.aiPlayers.push(ai);
    }
  }
}

// ==================== 排行榜系统 ====================
function updateRankings() {
  const entries = [];
  // 玩家数据
  const playerPower = Math.floor(getTotalAtk() + getTotalDef() + getTotalHpMax() * 0.1 + (getTotalCrit() || 0) * 2);
  entries.push({
    isPlayer: true,
    name: GS.player.name,
    level: GS.player.level,
    power: playerPower,
    wealth: GS.resources?.gold || 0,
    kills: GS.player.kills || 0,
    contrib: GS.nationContribution || 0,
    nationId: GS.nation || null,
    nation: GS.nation ? NATIONS.find(n => n.id === GS.nation)?.name : '無',
    guildId: GS.guild?.id || null,
    guild: GS.guild?.name || '散人',
    classId: GS.player.classId,
  });
  // 全服AI玩家數據（真實數據，200個跨地圖AI全數上榜）
  if (GLOBAL_AI_POOL && GLOBAL_AI_POOL.length > 0) {
     GLOBAL_AI_POOL.forEach(ai => {
       entries.push({
         isPlayer: false,
         name: ai.name,
         level: ai.level,
         power: ai.power || Math.floor((ai.atk || 0) * 2 + (ai.def || 0) * 1.5 + (ai.hpMax || 0) * 0.1),
         gold: ai.gold || 0,
         kills: ai.pvpKills || ai.kills || 0,
         contrib: Math.floor(ai.contribution || 0),
         nationId: ai.nation || null,
         nation: NATIONS.find(n => n.id === ai.nation)?.name || '無',
         guildId: ai.guildId || null,
         guild: AI_GUILDS.find(g => g.id === ai.guildId)?.name || '散人',
         classId: ai.classId,
       });
     });
  }
  // 根據各維度取前50名
  GS.rankings.level = [...entries].sort((a, b) => b.level - a.level).slice(0, 50);
  GS.rankings.power = [...entries].sort((a, b) => b.power - a.power).slice(0, 50);
  GS.rankings.kills = [...entries].sort((a, b) => b.kills - a.kills).slice(0, 50);
  // 軍團榜：按軍團總戰力排序（彙編所有成員戰力）
  const guildMap = {};
  entries.forEach(e => {
    if (!e.guildId) return;
    if (!guildMap[e.guildId]) {
      const g = AI_GUILDS.find(gg => gg.id === e.guildId);
      guildMap[e.guildId] = {
        guildId: e.guildId,
        name: g?.name || e.guild || '未知軍團',
        nation: e.nation,
        nationId: e.nationId,
        totalPower: 0,
        members: 0,
        level: g?.level || 1,
      };
    }
    guildMap[e.guildId].totalPower += e.power || 0;
    guildMap[e.guildId].members++;
  });
  GS.rankings.guild = Object.values(guildMap).sort((a, b) => b.totalPower - a.totalPower).slice(0, 20);
  // 國家榜：按國家總貢獻/總戰力排序
  const nationMap = {};
  entries.forEach(e => {
    if (!e.nationId) return;
    if (!nationMap[e.nationId]) {
      const n = NATIONS.find(nn => nn.id === e.nationId);
      nationMap[e.nationId] = {
        nationId: e.nationId,
        name: n?.name || '未知',
        flag: n?.flag || '',
        totalPower: 0,
        members: 0,
        totalContrib: 0,
      };
    }
    nationMap[e.nationId].totalPower += e.power || 0;
    nationMap[e.nationId].members++;
    nationMap[e.nationId].totalContrib += e.contrib || 0;
  });
  GS.rankings.nation = Object.values(nationMap).sort((a, b) => b.totalContrib + b.totalPower * 0.01 - (a.totalContrib + a.totalPower * 0.01));
}

// 取得某國家可用公民（真實玩家+AI玩家，10級以上）
function getNationCitizens(nationId) {
  const list = [];
  // 真實玩家
  if (GS.nation === nationId) {
    const playerPower = Math.floor(getTotalAtk() + getTotalDef() + getTotalHpMax() * 0.1 + (getTotalCrit() || 0) * 2);
    list.push({
      isPlayer: true,
      name: GS.player.name,
      level: GS.player.level,
      power: playerPower,
      contribution: GS.nationContribution || 0,
      kills: GS.player.kills || 0,
      online: true,
      classId: GS.player.classId,
    });
  }
  // GLOBAL_AI_POOL 中的真實 AI
  if (GLOBAL_AI_POOL && GLOBAL_AI_POOL.length > 0) {
    GLOBAL_AI_POOL.filter(ai => ai.nation === nationId).forEach(ai => {
      const pwr = ai.power || Math.floor((ai.atk || 0) * 2 + (ai.def || 0) * 1.5 + (ai.hpMax || 0) * 0.1);
      list.push({
        isPlayer: false,
        name: ai.name,
        level: ai.level || 1,
        power: pwr,
        contribution: Math.floor(ai.contribution || 0),
        kills: ai.kills || 0,
        online: ai.state !== 'dead' && ai.mapId,
        classId: ai.classId || 'warrior',
      });
    });
  }
  return list;
}

function getNationKingInfo(nationId) {
  const citizens = getNationCitizens(nationId).filter(c => c.level >= 10);
  if (citizens.length === 0) return { name: '虛位以待', power: 0, level: 1 };
  citizens.sort((a, b) => b.power - a.power);
  return citizens[0];
}

function getNationCitizenCount(nationId) {
  return getNationCitizens(nationId).length;
}

// 取得排行榜屬性加成（根據玩家當前各榜排名）
function getRankBonus() {
  const bonus = { atk: 0, def: 0, hpMax: 0, crit: 0, expRate: 0 };
  if (!GS.rankings) return bonus;
  // 用基礎屬性計算（避免與 getTotalAtk 等函數互相遞歸）
  const baseAtk = Number(GS.player.atk) || 0;
  const baseDef = Number(GS.player.def) || 0;
  const baseHp = Number(GS.player.hpMax) || 100;
  // 等級榜前10：經驗加成 5%~20%（第1名20%，第10名5%，線性遞減）
  const lvIdx = (GS.rankings.level || []).findIndex(e => e.isPlayer);
  if (lvIdx >= 0 && lvIdx < 10) bonus.expRate = 20 - lvIdx * 1.6;
  // 戰力榜前10：攻擊加成 2%~10%
  const pwIdx = (GS.rankings.power || []).findIndex(e => e.isPlayer);
  if (pwIdx >= 0 && pwIdx < 10) bonus.atk = Math.floor(baseAtk * (0.1 - pwIdx * 0.009));
  // PVP榜前10：暴擊加成 1%~5%
  const klIdx = (GS.rankings.kills || []).findIndex(e => e.isPlayer);
  if (klIdx >= 0 && klIdx < 10) bonus.crit = 5 - klIdx * 0.4;
  // 軍團榜前3：軍團成員防禦加成
  if (GS.guild?.id) {
    const glIdx = (GS.rankings.guild || []).findIndex(g => g.guildId === GS.guild.id);
    if (glIdx === 0) bonus.def = Math.floor(baseDef * 0.08);
    else if (glIdx === 1) bonus.def = Math.floor(baseDef * 0.05);
    else if (glIdx === 2) bonus.def = Math.floor(baseDef * 0.03);
  }
  // 國家榜第1：全國成員HP加成 10%
  if (GS.nation) {
    const natIdx = (GS.rankings.nation || []).findIndex(n => n.nationId === GS.nation);
    if (natIdx === 0) bonus.hpMax = Math.floor(baseHp * 0.1);
  }
  return bonus;
}

function renderRankingPage() {
  try {
    if (!GS.rankings) GS.rankings = { level: [], power: [], kills: [], guild: [], nation: [] };
    if (!GS.rankings.level || GS.rankings.level.length === 0) updateRankings();
  const rankIconSVG = {
    level:  '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#f0c040" stroke-width="1.5" fill="rgba(240,192,64,0.25)"/></svg>',
    power:  '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L3 14H11L10 22L21 10H13V2Z" stroke="#f0c040" stroke-width="1.5" fill="rgba(240,192,64,0.25)"/></svg>',
    kills:  '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.5 3L4 6l7 7-7 7 2.5 3 8-8 4 1 3-1-1-3 1-4-4-1-8 8Z" stroke="#f0c040" stroke-width="1.2" fill="rgba(240,192,64,0.2)"/></svg>',
    guild:  '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 21V9L12 3L21 9V21H14V14H10V21H3Z" stroke="#f0c040" stroke-width="1.3" fill="rgba(240,192,64,0.25)"/></svg>',
    nation: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 21V3H19C19 3 19.5 7 17 9C14.5 11 19 12 19 14C19 16 17 17 15 16C13 15 11 17 9 17C7 17 5 16 5 21Z" stroke="#f0c040" stroke-width="1.4" fill="rgba(240,192,64,0.25)"/><line x1="5" y1="3" x2="5" y2="21" stroke="#f0c040" stroke-width="1.4"/></svg>',
  };
  const tabs = [
    { key: 'level', label: '等級榜' },
    { key: 'power', label: '戰力榜' },
    { key: 'kills', label: 'PVP榜' },
    { key: 'guild', label: '軍團榜' },
    { key: 'nation', label: '國家榜' },
  ];
  const currentTab = GS.rankingTab || 'level';
  const list = (GS.rankings[currentTab] || []).slice(0, 20);

  // 頭像（根據職業選擇對應職業精靈圖或文字縮寫）
  const avatarFor = (name, classId, isPlayer) => {
    const classColor = { warrior: '#d07040', mage: '#6090ff', archer: '#60c060', rogue: '#c0a040', paladin: '#f0d080', warlock: '#a060e0' };
    const color = classColor[classId] || '#909090';
    if (isPlayer) {
      return `<div style="width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg, rgba(60,40,20,0.9), rgba(20,10,5,0.95));display:flex;align-items:center;justify-content:center;color:${color};font-weight:700;font-size:13px;border:1px solid var(--gold)">${name ? name.substring(0, 1) : '?'}</div>`;
    }
    return `<div style="width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg, rgba(40,30,18,0.9), rgba(15,10,5,0.9));display:flex;align-items:center;justify-content:center;color:${color};font-weight:600;font-size:12px;border:1px solid rgba(240,192,64,0.3)">${name ? name.substring(0, 1) : '?'}</div>`;
  };

      try { el.sidePage.classList.add('ranking-page'); } catch(e) {}

  // 羊皮紙風格榜單行渲染
  const renderRow = (e, i, type) => {
    const rank = i + 1;
    const isTop3 = rank <= 3;
    const rankColor = rank === 1 ? '#ffd040' : (rank === 2 ? '#d0d0d0' : (rank === 3 ? '#c08040' : '#a09080'));
    if (type === 'guild') {
      return `
        <div class="ranking-row ${isTop3 ? 'rank-' + rank : ''} ${e.isPlayer ? 'me-row' : ''}" style="background:linear-gradient(90deg, rgba(80,60,30,0.35), rgba(50,35,15,0.2));border:1px solid rgba(240,192,64,0.2);border-radius:6px;margin-bottom:4px;padding:6px 10px">
          <div class="ranking-rank" style="color:${rankColor};font-weight:900;text-shadow:0 1px 2px #000;min-width:28px">${rank}</div>
          <div class="ranking-avatar" style="width:30px;height:30px;display:flex;align-items:center;justify-content:center"><img src="${NATION_TAB_ICONS.castle}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;border:1px solid rgba(240,192,64,0.3)"/></div>
          <div class="ranking-name" style="flex:1;min-width:0">
            <div class="rn-name" style="color:#f0e8d0;font-weight:700;font-size:12px">${e.name}</div>
            <div class="rn-meta" style="font-size:9px;color:#a09080;margin-top:1px">${e.nation || '無'} · ${e.members}人 · Lv.${e.level}</div>
          </div>
          <div class="ranking-value" style="color:#f0c040;font-weight:800;font-size:12px">${e.totalPower?.toLocaleString() || 0}戰</div>
        </div>
      `;
    }
    if (type === 'nation') {
      return `
        <div class="ranking-row ${isTop3 ? 'rank-' + rank : ''}" style="background:linear-gradient(90deg, rgba(80,60,30,0.35), rgba(50,35,15,0.2));border:1px solid rgba(240,192,64,0.2);border-radius:6px;margin-bottom:4px;padding:6px 10px">
          <div class="ranking-rank" style="color:${rankColor};font-weight:900;text-shadow:0 1px 2px #000;min-width:28px">${rank}</div>
          <div class="ranking-avatar" style="width:30px;height:30px;display:flex;align-items:center;justify-content:center"><img src="${NATION_FLAGS[e.nationId] || NATION_FLAGS.kent}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;border:1px solid rgba(240,192,64,0.4)"/></div>
          <div class="ranking-name" style="flex:1;min-width:0">
            <div class="rn-name" style="color:#f0e8d0;font-weight:700;font-size:12px">${e.name}</div>
            <div class="rn-meta" style="font-size:9px;color:#a09080;margin-top:1px">${e.members}名國民 · 總貢獻 ${e.totalContrib?.toLocaleString() || 0}</div>
          </div>
          <div class="ranking-value" style="color:#f0c040;font-weight:800;font-size:12px">${e.totalPower?.toLocaleString() || 0}戰</div>
        </div>
      `;
    }
    // 個人榜（等級/戰力/PVP）
    const valField = type === 'level' ? 'level' : (type === 'power' ? 'power' : 'kills');
    const valSuffix = type === 'level' ? '' : (type === 'power' ? '' : '');
    const valLabel = type === 'level' ? 'Lv.' : (type === 'power' ? '' : '擊殺 ');
    // 敵我識別
    let foeTag = '';
    if (e.isPlayer) {
      foeTag = '<span style="color:#ffd860;font-weight:700;margin-left:4px">【我】</span>';
    } else if (e.nationId && GS.nation && e.nationId === GS.nation) {
      foeTag = '<span style="color:#70b8ff;font-weight:600;margin-left:4px">【友軍】</span>';
    } else if (e.nationId && GS.nation) {
      foeTag = '<span style="color:#ff7070;font-weight:600;margin-left:4px">【敵軍】</span>';
    }
    return `
      <div class="ranking-row ${isTop3 ? 'rank-' + rank : ''} ${e.isPlayer ? 'me-row' : ''}" style="background:linear-gradient(90deg, rgba(80,60,30,0.35), rgba(50,35,15,0.2));border:1px solid rgba(240,192,64,0.2);border-radius:6px;margin-bottom:4px;padding:6px 10px">
        <div class="ranking-rank" style="color:${rankColor};font-weight:900;text-shadow:0 1px 2px #000;min-width:28px;font-size:13px">${rank}</div>
        <div class="ranking-avatar" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:transparent;border:none">${avatarFor(e.name, e.classId, e.isPlayer)}</div>
        <div class="ranking-name" style="flex:1;min-width:0">
          <div class="rn-name" style="color:#f0e8d0;font-weight:700;font-size:12px">${e.name}${e.isPlayer ? '<span style="font-size:8px;background:var(--gold);color:#000;padding:0 4px;border-radius:3px;margin-left:4px;font-weight:700">我</span>' : ''}</div>
          <div class="rn-meta" style="font-size:9px;color:#a09080;margin-top:1px">${e.nation || '散人'} · Lv.${e.level} · ${e.guild || '無'}${foeTag}</div>
        </div>
        <div class="ranking-value" style="color:#f0c040;font-weight:800;font-size:12px">${valLabel}${e[valField]?.toLocaleString() || 0}${valSuffix}</div>
      </div>
    `;
  };

  // 我的排名
  let myRow = null;
  let myRank = -1;
  if (currentTab === 'guild') {
    if (GS.guild?.id) {
      myRank = (GS.rankings.guild || []).findIndex(g => g.guildId === GS.guild.id);
      myRow = myRank >= 0 ? GS.rankings.guild[myRank] : null;
    }
  } else if (currentTab === 'nation') {
    if (GS.nation) {
      myRank = (GS.rankings.nation || []).findIndex(n => n.nationId === GS.nation);
      myRow = myRank >= 0 ? GS.rankings.nation[myRank] : null;
    }
  } else {
    const allList = GS.rankings[currentTab] || [];
    myRank = allList.findIndex(e => e.isPlayer);
    myRow = myRank >= 0 ? allList[myRank] : null;
  }
  const bonus = getRankBonus();
  const bonusTexts = [];
  if (bonus.expRate > 0) bonusTexts.push(`經驗+${bonus.expRate.toFixed(1)}%`);
  if (bonus.atk > 0) bonusTexts.push(`攻擊+${bonus.atk}`);
  if (bonus.crit > 0) bonusTexts.push(`暴擊+${bonus.crit.toFixed(1)}%`);
  if (bonus.def > 0) bonusTexts.push(`防禦+${bonus.def}`);
  if (bonus.hpMax > 0) bonusTexts.push(`HP+${bonus.hpMax}`);

  return `
    <div style="background:linear-gradient(180deg, rgba(90,65,30,0.3), rgba(60,40,18,0.2));border:1px solid rgba(240,192,64,0.3);border-radius:8px;padding:6px;margin-bottom:10px">
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:2px">
        ${tabs.map(t => `
          <button class="ranking-tab ${currentTab === t.key ? 'active' : ''}" data-tab="${t.key}" style="padding:6px 2px;font-size:10px;background:${currentTab === t.key ? 'linear-gradient(180deg, rgba(240,192,64,0.2), rgba(240,192,64,0.05))' : 'transparent'};border:1px solid ${currentTab === t.key ? 'rgba(240,192,64,0.6)' : 'rgba(240,192,64,0.15)'};border-radius:4px;color:${currentTab === t.key ? '#ffe090' : '#a09080'};cursor:pointer;font-weight:600">
            <div style="width:22px;height:22px;margin:0 auto 2px;">${rankIconSVG[t.key]}</div>
            <div>${t.label}</div>
          </button>
        `).join('')}
      </div>
    </div>
    ${bonusTexts.length > 0 ? `
      <div style="margin-bottom:8px;padding:6px 10px;background:linear-gradient(90deg, rgba(100,80,30,0.5), rgba(60,40,15,0.3));border:1px solid rgba(240,192,64,0.4);border-radius:6px;font-size:10px;color:#ffe090;text-align:center">
        排行榜加成：${bonusTexts.join(' · ')}
      </div>
    ` : ''}
    <div class="ranking-list" style="max-height:48vh;overflow-y:auto;padding-right:2px">
      ${list.map((e, i) => renderRow(e, i, currentTab)).join('')}
      ${list.length === 0 ? '<div style="text-align:center;padding:40px;color:#7a6a6a;font-size:12px">暫無排行數據</div>' : ''}
    </div>
     ${myRow ? `
       <div style="margin-top:10px;padding:8px 10px;background:linear-gradient(90deg, rgba(120,90,30,0.5), rgba(80,55,20,0.3));border:1px solid rgba(240,192,64,0.6);border-radius:8px;box-shadow:0 0 10px rgba(240,192,64,0.2)">
         <div style="display:flex;align-items:center;gap:8px">
           <div style="width:28px;text-align:center;font-weight:900;color:#ffd040;font-size:14px;text-shadow:0 1px 2px #000">${myRank >= 0 ? myRank + 1 : '未'}</div>
           <div style="width:28px;height:28px;border-radius:50%;border:1px solid rgba(240,192,64,0.4);background:linear-gradient(135deg, rgba(40,30,15,0.9), rgba(15,10,5,0.9));display:flex;align-items:center;justify-content:center;color:#f0d080;font-weight:700;font-size:12px">${GS.player.name.substring(0, 1)}</div>
           <div style="flex:1;min-width:0">
             <div style="font-size:11px;color:#f0e8d0;font-weight:700">${GS.player.name}（我）</div>
             <div style="font-size:9px;color:#a09080;margin-top:1px">Lv.${GS.player.level} · ${GS.guild?.name || '無'}</div>
           </div>
           <div style="font-size:12px;font-weight:800;color:#ffd040">
             ${currentTab === 'level' ? 'Lv.' + myRow.level : ''}
             ${currentTab === 'power' ? myRow.power?.toLocaleString() + ' 戰' : ''}
             ${currentTab === 'kills' ? myRow.kills + ' 擊殺' : ''}
             ${currentTab === 'guild' ? myRow.totalPower?.toLocaleString() + ' 戰' : ''}
             ${currentTab === 'nation' ? myRow.totalPower?.toLocaleString() + ' 戰' : ''}
           </div>
         </div>
       </div>
     ` : ''}
  `;
  } catch(e) {
    console.error('renderRankingPage error:', e);
    return `<div style="padding:20px;text-align:center;color:#ff8080">排行榜資料載入失敗，請重試</div>`;
  }
}

// ==================== 國家/公会/城堡系统增强 ====================
function enhanceNations() {
  // 给國家添加敌对关系（默认互相对立）
  NATIONS.forEach((n, i) => {
    n.relations = NATIONS.map((m, j) => ({
      nationId: m.id,
      status: i === j ? 'ally' : 'enemy',
    }));
  });
  // 新服初始：所有城堡為 NPC 無主狀態，不通過預設分配
  // 城堡需通過後續攻城戰由軍團爭奪佔領
}

// 获取某國家的国王公会（擁有城堡数最多的公会）
function getNationKingGuild(nationId) {
  const nationGuilds = AI_GUILDS.filter(g => g.nation === nationId && g.castle);
  // 玩家公会也算
  if (GS.guild && GS.guild.nation === nationId && GS.guild.castles && GS.guild.castles.length > 0) {
    nationGuilds.push({ id: 'player', name: GS.guild.name, level: GS.guild.level, castles: GS.guild.castles.length, isPlayer: true, leader: GS.player.name });
  }
  if (nationGuilds.length === 0) return null;
  // 按城堡数排序，最多者为王
  nationGuilds.sort((a, b) => {
    const ca = a.castles ? (Array.isArray(a.castles) ? a.castles.length : 1) : (a.castle ? 1 : 0);
    const cb = b.castles ? (Array.isArray(b.castles) ? b.castles.length : 1) : (b.castle ? 1 : 0);
    return cb - ca;
  });
  return nationGuilds[0];
}

function renderNationPageEnhanced() {
  const myNation = NATIONS.find(n => n.id === GS.nation);

  if (!myNation) {
    return `
      <div style="text-align:center;padding:20px 12px;border-bottom:2px solid var(--gold-dark);margin-bottom:12px;background:linear-gradient(180deg, rgba(40,28,14,0.9), rgba(20,14,8,0.9))">
        <div style="width:64px;height:64px;margin:0 auto;border-radius:50%;border:2px solid var(--gold);background:linear-gradient(135deg, rgba(30,20,10,0.9), rgba(15,10,5,0.95));display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 0 16px rgba(240,192,64,0.3)"><img src="${NATION_TAB_ICONS.castle}" style="width:100%;height:100%;object-fit:cover;display:block"/></div>
        <div class="nation-name" style="font-size:18px;color:var(--gold-bright);margin-top:8px">選擇你的國家</div>
        <div style="font-size:11px;color:var(--parchment-dark);margin-top:6px">加入國家後可獲取官職、參與國家技能樹、組建軍團攻城</div>
      </div>
      <div class="bag-section-title">四大王國</div>
      <div style="display:flex;flex-direction:column;gap:10px;padding:0 4px">
        ${NATIONS.map(n => `
          <div class="nation-select-card" style="padding:14px;border:1px solid var(--gold-dark);border-radius:10px;background:linear-gradient(135deg, rgba(40,28,16,0.7), rgba(20,14,8,0.5));position:relative">
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:52px;height:52px;border-radius:50%;border:2px solid var(--gold-dark);background:linear-gradient(135deg, rgba(30,20,10,0.9), rgba(15,10,5,0.95));display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:inset 0 0 6px rgba(0,0,0,0.5)"><img src="${NATION_FLAGS[n.id]}" style="width:100%;height:100%;object-fit:cover;display:block"/></div>
              <div style="flex:1">
                <div style="font-weight:700;color:var(--gold-bright);font-size:15px;margin-bottom:3px">${n.name}</div>
                <div style="font-size:11px;color:var(--parchment-dark);line-height:1.4">${n.desc}</div>
              </div>
            </div>
            <button class="castle-card-btn join-nation-btn" data-nation="${n.id}" style="width:100%;padding:8px;font-size:13px;margin-top:10px;font-weight:600">加入國家</button>
          </div>
        `).join('')}
      </div>
    `;
  }

  const activeTab = GS.nationTab || 'members';
  const tabs = [
    { key: 'members',  name: '成員', iconKey: 'office' },
    { key: 'nobility', name: '官職', iconKey: 'legion' },
    { key: 'legion',   name: '軍團', iconKey: 'castle' },
    { key: 'castles',  name: '城堡', iconKey: 'castle' },
    { key: 'treasury', name: '國庫', iconKey: 'donate' },
    { key: 'skills',   name: '技能樹', iconKey: 'skill' },
  ];

  const tabContent = {
    members:    renderMembersTab(myNation),
    nobility:   renderNobilityTab(myNation),
    legion:     renderLegionTab(myNation),
    castles:    renderCastleTab(myNation),
    treasury:   renderDonateTab(myNation),
    skills:     renderNationSkillsTab(myNation),
  };

  // 取得國王（戰力最高或貢獻最高的10級以上玩家/AI）
  const kingEntry = getNationKingInfo(myNation.id);
  const citizenCount = getNationCitizenCount(myNation.id);
  const castleCount = CASTLES.filter(c => c.nation === myNation.id && c.ownerGuildId).length;

  return `
    <!-- 國家主頁頭部：大國旗 + 名稱 + 國王 -->
    <div class="nation-header-banner" style="position:relative;padding:18px 14px 16px;background:linear-gradient(180deg, rgba(60,40,20,0.8), rgba(20,14,8,0.5));border-bottom:2px solid var(--gold-dark);overflow:hidden">
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 30%, rgba(240,192,64,0.12), transparent 60%);pointer-events:none"></div>
      <div style="display:flex;align-items:center;gap:14px;position:relative">
        <div class="nation-big-flag" style="width:72px;height:72px;border-radius:50%;border:3px solid var(--gold-bright);background:linear-gradient(135deg, rgba(30,20,10,0.9), rgba(15,10,5,0.95));display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 0 20px rgba(240,192,64,0.5), inset 0 0 10px rgba(0,0,0,0.6);flex-shrink:0">
          <img src="${NATION_FLAGS[myNation.id] || NATION_FLAGS.kent}" style="width:100%;height:100%;object-fit:cover;display:block"/>
        </div>
        <div style="flex:1;min-width:0">
          <div class="nation-name" style="font-size:20px;font-weight:900;color:var(--gold-bright);text-shadow:0 2px 8px rgba(0,0,0,0.8), 0 0 12px rgba(240,192,64,0.4);letter-spacing:1px">${myNation.name}</div>
          <div style="font-size:11px;color:var(--parchment-dark);margin-top:3px;line-height:1.4">${myNation.desc}</div>
          <div style="display:flex;gap:10px;margin-top:8px;font-size:10px;color:var(--parchment-light)">
             <span style="display:flex;align-items:center;gap:4px"><span style="width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;border-radius:50%;border:1px solid var(--gold-dark)"><img src="${NATION_TAB_ICONS.legion}" style="width:100%;height:100%;object-fit:cover;display:block"/></span> 成員 <b style="color:var(--gold-bright)">${citizenCount}</b></span>
             <span style="display:flex;align-items:center;gap:4px"><span style="width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;border-radius:50%;border:1px solid var(--gold-dark)"><img src="${NATION_TAB_ICONS.castle}" style="width:100%;height:100%;object-fit:cover;display:block"/></span> 城堡 <b style="color:var(--gold-bright)">${castleCount}</b></span>
           </div>
        </div>
      </div>
      <!-- 國王資訊 -->
      <div class="nation-king-row" style="margin-top:14px;padding:10px 12px;background:linear-gradient(135deg, rgba(80,50,20,0.8), rgba(30,18,10,0.7));border:1.5px solid var(--gold);border-radius:10px;display:flex;align-items:center;gap:10px;box-shadow:0 0 14px rgba(240,192,64,0.25), inset 0 0 10px rgba(240,192,64,0.08)">
        <div style="width:44px;height:44px;border-radius:50%;border:2px solid #ffd040;background:radial-gradient(circle, #ffd04033, transparent 70%);display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(255,208,64,0.5);overflow:hidden"><img src="/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrgfjm22sw_ve_miaoda" style="width:130%;height:130%;object-fit:cover;display:block;transform:scale(1.15)"/></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:10px;color:var(--gold-bright);font-weight:700">當前國王</div>
          <div style="font-size:14px;font-weight:800;color:var(--gold-bright);text-shadow:0 1px 3px #000">${kingEntry.name}</div>
          <div style="font-size:10px;color:var(--parchment-dark);margin-top:1px">戰力 ${kingEntry.power || 0} · Lv.${kingEntry.level || 1}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:9px;color:var(--parchment-dark)">國家等級</div>
          <div style="font-size:18px;font-weight:900;color:var(--gold-bright);text-shadow:0 1px 3px #000">Lv.${getNationLevelInfo(myNation.id).level}</div>
        </div>
      </div>
      <!-- 詔書 -->
      <div class="nation-decree" style="margin-top:10px;padding:10px 12px;background:linear-gradient(135deg, rgba(40,28,18,0.9), rgba(20,14,8,0.8));border:1px solid var(--gold-dark);border-radius:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:11px;font-weight:700;color:var(--gold-bright);display:flex;align-items:center;gap:4px"><span style="width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;border-radius:50%;border:1px solid var(--gold-dark)"><img src="${NATION_TAB_ICONS.skill}" style="width:100%;height:100%;object-fit:cover;display:block"/></span> 國王詔書</span>
          <span style="font-size:9px;color:var(--parchment-dark)">${kingEntry.name} 頒布</span>
        </div>
        <div style="font-size:11px;color:var(--parchment-light);line-height:1.6">${myNation.decree || '為了國家的榮耀，全體國民團結一致，共創輝煌！'}</div>
      </div>
      <!-- 功能入口網格 -->
      <div class="nation-entry-grid" style="margin-top:12px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
        ${[
          { key: 'nobility', name: '官職',   icon: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrgfjm22sw_ve_miaoda' },
          { key: 'members',  name: '成員',   icon: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrglc2tmlw_ve_miaoda' },
          { key: 'legion',   name: '軍團',   icon: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrgmr7pucs_ve_miaoda' },
          { key: 'castle',   name: '城堡',   icon: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrggcscsgs_ve_miaoda' },
          { key: 'treasury', name: '國庫',   icon: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrgkf6f2bw_ve_miaoda' },
          { key: 'skills',   name: '技能樹', icon: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrgnkrywaw_ve_miaoda' },
          { key: 'donate',   name: '貢獻',   icon: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrggfwmcou_ve_miaoda' },
        ].map(e => `
          <button class="nation-entry-btn" data-nation-entry="${e.key}" style="padding:10px 4px;background:linear-gradient(180deg, rgba(50,35,18,0.9), rgba(25,16,8,0.95));border:1px solid var(--gold-dark);border-radius:8px;color:var(--parchment-light);font-size:10px;font-weight:600;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;box-shadow:inset 0 0 6px rgba(240,192,64,0.08)">
            <span style="width:28px;height:28px;border-radius:50%;overflow:hidden;border:1.5px solid var(--gold-dark);background:#0f0a05;display:flex;align-items:center;justify-content:center;box-shadow:0 0 8px rgba(240,192,64,0.2)"><img src="${e.icon}" style="width:130%;height:130%;object-fit:cover;display:block;transform:scale(1.15)"/></span>
            <span>${e.name}</span>
          </button>
        `).join('')}
      </div>
    </div>
    ${renderNationLevelBar(myNation.id)}
    <div class="nation-tab-bar" style="display:flex;border-bottom:1px solid rgba(240,192,64,0.2)" role="tablist">
      ${tabs.map(t => `
        <button class="nation-tab-btn ${activeTab === t.key ? 'active' : ''}" data-nation-tab="${t.key}" style="flex:1;padding:10px 4px;font-size:11px;background:transparent;border:none;color:${activeTab === t.key ? 'var(--gold-bright)' : 'var(--parchment-dark)'};border-bottom:2px solid ${activeTab === t.key ? 'var(--gold-bright)' : 'transparent'};cursor:pointer;font-weight:600;transition:all 0.2s">
          ${t.name}
        </button>
      `).join('')}
    </div>
    <div class="nation-tab-content" style="padding:10px 8px">
      ${tabContent[activeTab] || ''}
    </div>
  `;
}

// 國家等級進度條渲染
function renderNationLevelBar(nationId) {
  const info = getNationLevelInfo(nationId);
  const bonus = info.current.bonus;
  const nextNeed = info.next ? (info.next.needContrib - info.totalContrib).toLocaleString() : '已滿級';
  return `
    <div style="margin-top:10px;padding:8px 10px;background:linear-gradient(135deg, rgba(40,25,10,0.9), rgba(20,14,8,0.7));border:1px solid var(--gold-dark);border-radius:8px;text-align:left">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:11px;color:var(--gold-bright);font-weight:700">國家等級 Lv.${info.level}</span>
        <span style="font-size:9px;color:var(--parchment-dark)">總貢獻：${info.totalContrib.toLocaleString()}</span>
      </div>
      <div style="height:8px;background:rgba(0,0,0,0.5);border-radius:4px;overflow:hidden;border:1px solid rgba(240,192,64,0.3)">
        <div style="height:100%;width:${info.progress}%;background:linear-gradient(90deg, #8b6520, #f0c040, #ffe090);box-shadow:0 0 6px rgba(240,192,64,0.6);transition:width 0.5s ease"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--parchment-dark);margin-top:3px">
        <span>Lv.${info.level} 加成：攻+${bonus.atk} 防+${bonus.def} HP+${bonus.hpMax}</span>
        <span>${info.next ? '距下一級 ' + nextNeed : '已達最高等級'}</span>
      </div>
    </div>
  `;
}

// 宣戰Tab：選擇敵國城堡發動攻城戰
function renderWarDeclareTab(nation) {
  const myLegion = GS.legionId || GS.guildId ? AI_GUILDS.find(g => g.id === (GS.legionId || GS.guildId)) : null;
  const isKing = nation && getNationKingInfo(nation.id)?.name === GS.player.name;
  const isLeader = myLegion && GS.guild && GS.guild.role === 'leader';
  const canDeclare = isKing || isLeader;
  const dailyLimit = isKing ? 2 : (isLeader ? 1 : 0);
  const todayDeclared = (GS.warDeclareCount || 0);
  const remainDeclare = Math.max(0, dailyLimit - todayDeclared);

  const enemyCastles = CASTLES.filter(c => c.nation !== nation.id);
  const ownCastles = CASTLES.filter(c => c.nation === nation.id);
  const allTargets = [...enemyCastles, ...ownCastles.filter(c => !c.ownerGuildId)];

  const now = Date.now();

  return `
    <div style="margin-bottom:10px;padding:10px 12px;background:linear-gradient(135deg, rgba(80,40,20,0.7), rgba(40,20,10,0.5));border:1px solid var(--gold-dark);border-radius:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:12px;font-weight:700;color:var(--gold-bright)">攻城宣戰</span>
        <span style="font-size:10px;color:${remainDeclare > 0 ? '#80ff90' : '#ff8080'}">今日剩餘 ${remainDeclare}/${dailyLimit} 次</span>
      </div>
      <div style="font-size:10px;color:var(--parchment-dark);line-height:1.5">
        ${isKing ? '👑 你是國王，每天可發動 2 次攻城戰' : (isLeader ? '⚔ 你是軍團長，每天可發動 1 次攻城戰' : '❌ 僅國王與軍團長可宣戰')}
      </div>
    </div>
    <div class="bag-section-title">可宣戰城堡</div>
    <div style="display:flex;flex-direction:column;gap:8px;padding:2px 0;margin-bottom:10px">
      ${allTargets.length === 0 ? '<div style="text-align:center;padding:20px;color:var(--parchment-dark);font-size:11px">暫無可宣戰的城堡</div>' : ''}
      ${allTargets.map(c => {
        const cnation = NATIONS.find(n => n.id === c.nation);
        const isMine = !!( (GS.legionId || GS.guildId) && c.ownerGuildId === (GS.legionId || GS.guildId) );
        const hasOwner = !!(c.owner || c.ownerGuildId);
        const onCool = GS.warCooldowns?.[c.id] && GS.warCooldowns[c.id] > now;
        const remain = onCool ? Math.ceil((GS.warCooldowns[c.id] - now) / 1000) : 0;
        const isWarDeclared = GS.warDeclared?.castleId === c.id;
        const disabled = !canDeclare || remainDeclare <= 0 || onCool || isWarDeclared || isMine;
        return `
          <div class="castle-card" style="padding:10px;border:1px solid var(--gold-dark);border-radius:8px;background:linear-gradient(180deg, rgba(40,28,16,0.7), rgba(20,14,8,0.85))">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
              <div>
                <div style="font-weight:700;color:var(--gold-bright);font-size:13px">${c.name}</div>
                <div style="font-size:10px;color:var(--parchment-dark);margin-top:2px">${cnation?.name || '中立'} · Lv.${c.level} · 税率 ${c.taxRate}%</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:9px;color:${isMine ? '#80ff90' : (hasOwner ? '#ff8080' : '#f0c040')};font-weight:600">
                  ${isMine ? '我方佔領' : (hasOwner ? '敵方佔領' : '無主之地')}
                </div>
                <div style="font-size:8px;color:var(--parchment-dark);margin-top:1px">${c.ownerName || '—'}</div>
              </div>
            </div>
            <div style="height:4px;background:rgba(0,0,0,0.4);border-radius:2px;margin-bottom:6px;overflow:hidden">
              <div style="height:100%;width:${(c.hp / c.hpMax) * 100}%;background:linear-gradient(90deg,#ff6060,#f0c040);border-radius:2px"></div>
            </div>
            <div style="font-size:9px;color:var(--parchment-dark);margin-bottom:6px;display:flex;justify-content:space-between">
              <span>城防 ${c.hp.toLocaleString()}/${c.hpMax.toLocaleString()}</span>
              <span>守军 ${c.defenders}人</span>
            </div>
            <button class="castle-card-btn declare-war-btn" onclick="event.stopPropagation(); window.declareSiegeWar && window.declareSiegeWar('${c.id}')"
                    style="width:100%;padding:6px;font-size:11px;${disabled ? 'opacity:0.5;cursor:default' : ''}"
                    ${disabled ? 'disabled' : ''}>
              ${isWarDeclared ? '⚔ 已宣戰' : (onCool ? `冷卻 ${formatTime(remain)}` : (isMine ? '己方城堡' : (canDeclare && remainDeclare > 0 ? '⚔ 宣戰攻城' : '無法宣戰')))}
            </button>
          </div>
        `;
      }).join('')}
    </div>
    <div style="font-size:10px;color:var(--parchment);line-height:1.6;padding:8px;border:1px solid rgba(240,192,64,0.2);border-radius:6px;background:rgba(0,0,0,0.2)">
      <div style="color:var(--gold-bright);font-weight:700;margin-bottom:4px;font-size:11px">攻城規則</div>
      • 國王每天 2 次、軍團長每天 1 次宣戰機會<br>
      • 宣戰後可從城堡列表或世界地圖進入攻城戰場<br>
      • 限時 20 分鐘：擊破城門 → 摧毀守護塔 → 拾取權杖取勝<br>
      • 拾取權杖的軍團長成為新城主，城堡易主後重新計時 20 分鐘<br>
      • 佔領城堡後可收取該區域稅收<br>
      • 未宣戰玩家進入城堡地圖無法攻擊城門/守護塔
    </div>
  `;
}

// 城堡Tab（國家系统内）：5座城堡列表、占领状态、宣戰入口（简化版）
function renderCastleTab(nation) {
  const myLegion = GS.legionId || GS.guildId ? AI_GUILDS.find(g => g.id === (GS.legionId || GS.guildId)) : null;
  const isKing = nation && getNationKingInfo(nation.id)?.name === GS.player.name;
  const isLeader = myLegion && GS.guild && GS.guild.role === 'leader';
  const canDeclare = isKing || isLeader;
  const dailyLimit = isKing ? 2 : (isLeader ? 1 : 0);
  // 兼容舊字段 warDeclareCount，也支持新字段
  const todayDeclared = (GS.siegeWarDeclareCount !== undefined) ? GS.siegeWarDeclareCount : (GS.warDeclareCount || 0);
  const remainDeclare = Math.max(0, dailyLimit - todayDeclared);
  const now = Date.now();

  // 當前活躍的攻城戰（siegeWar）
  const activeSiege = GS.siegeWar && GS.siegeWar.status === 'active' && GS.siegeWar.endTime > now ? GS.siegeWar : null;

  const renderCard = (c) => {
    const myLegionId = GS.legionId || GS.guildId || null;
    const isMine = !!(myLegionId && c.ownerGuildId === myLegionId);
    const hasOwner = !!(c.owner || c.ownerGuildId);
    const isActiveSiege = activeSiege && activeSiege.castleId === c.id;
    // 按鈕狀態
    let btnHtml = '';
    if (isMine) {
      btnHtml = `<button class="castle-card-btn" style="width:100%;padding:5px;font-size:10px;opacity:0.7" disabled>我方佔領</button>`;
    } else if (isActiveSiege) {
      btnHtml = `<button class="castle-card-btn" onclick="event.stopPropagation(); window.enterSiegeBattle && window.enterSiegeBattle('${c.id}')" style="width:100%;padding:6px;font-size:11px;font-weight:700;background:linear-gradient(180deg,#b02020,#700808);border:1px solid #e04040;color:#ffe0e0;cursor:pointer;text-shadow:0 1px 2px rgba(0,0,0,0.6)">⚔ 進入攻城戰場</button>`;
    } else if (!canDeclare) {
      btnHtml = `<button class="castle-card-btn" style="width:100%;padding:5px;font-size:10px;opacity:0.5" disabled>僅軍團長可宣戰</button>`;
    } else if (remainDeclare <= 0) {
      btnHtml = `<button class="castle-card-btn" style="width:100%;padding:5px;font-size:10px;opacity:0.5" disabled>今日次數已用完</button>`;
    } else {
      btnHtml = `<button class="castle-card-btn declare-war-btn" onclick="event.stopPropagation(); window.declareSiegeWar && window.declareSiegeWar('${c.id}')" style="width:100%;padding:6px;font-size:11px;font-weight:700;background:linear-gradient(180deg,#d4a020,#8a6520);border:1px solid #f0c040;color:#fff;cursor:pointer;text-shadow:0 1px 2px rgba(0,0,0,0.6)">⚔ 宣戰攻城</button>`;
    }
    return `
      <div class="castle-card" style="padding:10px 12px;border:1px solid var(--gold-dark);border-radius:8px;background:linear-gradient(135deg, rgba(40,28,16,0.85), rgba(20,14,8,0.9));margin-bottom:10px;box-shadow:inset 0 0 8px rgba(0,0,0,0.4)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;gap:8px">
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;color:var(--gold-bright);font-size:14px;text-shadow:0 1px 2px rgba(0,0,0,0.8)">${c.name}</div>
            <div style="font-size:10px;color:var(--parchment-dark);margin-top:2px">Lv.${c.level} · 推薦 ${c.recLevel || '--'}級</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:10px;color:${isMine ? '#70ff80' : (hasOwner ? '#ff9090' : '#f0c040')};font-weight:600">
              ${isMine ? '我方佔領' : (hasOwner ? c.ownerName + ' 佔領' : 'NPC無主')}
            </div>
            <div style="font-size:9px;color:var(--parchment-dark);margin-top:1px">稅率 ${c.taxRate}%</div>
          </div>
        </div>
        <div style="height:4px;background:rgba(0,0,0,0.5);border-radius:2px;margin-bottom:6px;overflow:hidden">
          <div style="height:100%;width:${(c.hp / c.hpMax) * 100}%;background:linear-gradient(90deg,#ff6060,#f0c040);border-radius:2px"></div>
        </div>
        <div style="font-size:10px;color:var(--parchment-dark);margin-bottom:8px">
          城防 ${c.hp.toLocaleString()}/${c.hpMax.toLocaleString()} · 守軍 ${c.defenders} 人
        </div>
        ${btnHtml}
      </div>
    `;
  };

  return `
    <div style="margin-bottom:10px;padding:10px 12px;background:linear-gradient(135deg, rgba(60,40,20,0.6), rgba(30,20,10,0.4));border:1px solid var(--gold-dark);border-radius:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:12px;font-weight:700;color:var(--gold-bright)">🏰 城堡列表</span>
        <span style="font-size:10px;color:${remainDeclare > 0 ? '#80ff90' : '#ff8080'};font-weight:600">今日剩餘 ${remainDeclare}/${dailyLimit} 次</span>
      </div>
      <div style="font-size:10px;color:var(--parchment-dark);line-height:1.4">
        ${isKing ? '👑 你是國王' : (isLeader ? '⚔ 你是軍團長' : (myLegion ? '普通團員' : '未加入軍團'))} · 對無主或敵方城堡宣戰，20分鐘內佔領取勝
      </div>
    </div>
    <div style="display:flex;flex-direction:column">
      ${CASTLES.map(c => renderCard(c)).join('')}
    </div>
    <div style="margin-top:12px;font-size:10px;color:var(--parchment);line-height:1.7;padding:10px;border:1px solid rgba(240,192,64,0.2);border-radius:8px;background:rgba(0,0,0,0.25)">
      <div style="color:var(--gold-bright);font-weight:700;margin-bottom:5px;font-size:11px">攻城規則</div>
      • 軍團長/國王可宣戰，每日 ${dailyLimit} 次<br>
      • 宣戰後點擊「進入攻城戰場」參戰<br>
      • 擊破城門 → 摧毀守護塔 → 拾取權杖取勝<br>
      • 限時 20 分鐘，時間到未取勝則失敗<br>
      • 佔領後收取該區域稅收
    </div>
  `;
}

// 成員Tab：列表式排名
function renderMembersTab(nation) {
  const citizens = getNationCitizens(nation.id);
  // 按戰力排序
  citizens.sort((a, b) => b.power - a.power);
  const myRank = citizens.findIndex(c => c.isPlayer) + 1;
  const displayList = citizens.slice(0, 50);

  const rankColors = ['#f0c040', '#c0c0d0', '#d4a060']; // 金/銀/銅
  return `
    <div class="members-sub-tabs" style="display:flex;gap:4px;margin-bottom:10px;border-bottom:1px solid rgba(240,192,64,0.15);padding-bottom:6px">
      ${[
        { key: 'power', name: '戰力' },
        { key: 'kills', name: '殲敵' },
        { key: 'contrib', name: '建設' },
        { key: 'loss', name: '戰損' },
      ].map(t => `
        <button class="members-sub-tab ${GS.membersSubTab === t.key ? 'active' : ''}" data-members-sub="${t.key}" style="flex:1;padding:6px 4px;font-size:10px;background:${GS.membersSubTab === t.key ? 'linear-gradient(180deg, rgba(80,50,20,0.9), rgba(40,25,10,0.95))' : 'transparent'};border:1px solid ${GS.membersSubTab === t.key ? 'var(--gold-bright)' : 'var(--gold-dark)'};color:${GS.membersSubTab === t.key ? 'var(--gold-bright)' : 'var(--parchment-dark)'};border-radius:6px;cursor:pointer;font-weight:600">
          ${t.name}
        </button>
      `).join('')}
    </div>
    <div class="members-list" style="display:flex;flex-direction:column;gap:4px;max-height:360px;overflow-y:auto">
      ${displayList.map((c, i) => {
        const rank = i + 1;
        const isTop = rank <= 3;
        const rankColor = isTop ? rankColors[rank - 1] : 'var(--parchment-dark)';
        const rankAssign = getRankAssignment(nation.id, citizens, i);
        const cls = CLASSES[c.classId] || CLASSES.warrior;
        const rankIconUrl = isTop ? NATION_TAB_ICONS.crown : null;
        return `
          <div class="member-row ${c.isPlayer ? 'me' : ''}" style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:linear-gradient(90deg, rgba(50,35,20,0.7), rgba(30,20,10,0.5));border:1px solid ${c.isPlayer ? 'var(--gold-bright)' : 'var(--gold-dark)'};border-radius:6px">
            <div class="member-rank" style="width:28px;text-align:center;font-weight:900;color:${rankColor};font-size:13px;flex-shrink:0;text-shadow:${isTop ? '0 0 6px ' + rankColor : 'none'}">${isTop ? '<span style="display:inline-block;width:16px;height:16px;vertical-align:middle"><img src="' + rankIconUrl + '" style="width:100%;height:100%;object-fit:contain;display:block;filter:drop-shadow(0 0 3px ' + rankColor + ')"/></span>' : rank}</div>
            <div class="member-avatar" style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg, #3a2a18, #1a1008);border:1.5px solid ${rankAssign?.color || '#666'};display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;position:relative">${spriteEmojiHTML(cls.sprite, 20)}<div class="member-avatar-rank-badge" style="position:absolute;bottom:-2px;right:-2px;width:14px;height:14px;border-radius:50%;background:linear-gradient(135deg, #3a2a18, #1a1008);border:1px solid ${rankAssign?.color || '#666'};display:flex;align-items:center;justify-content:center"><img src="${NATION_TAB_ICONS[rankAssign?.iconKey] || NATION_TAB_ICONS.sword}" style="width:70%;height:70%;object-fit:contain;display:block"/></div></div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:700;color:var(--parchment-light);display:flex;align-items:center;gap:4px">
                ${c.name}
                ${c.online ? '<span style="width:6px;height:6px;border-radius:50%;background:#50ff80;box-shadow:0 0 4px #50ff80"></span>' : '<span style="font-size:9px;color:var(--parchment-dark)">離線</span>'}
              </div>
              <div style="font-size:10px;color:${rankAssign?.color || '#999'};margin-top:1px">${rankAssign?.name || '無官職'}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:11px;font-weight:700;color:var(--gold-bright)">${c.power || 0}</div>
              <div style="font-size:9px;color:var(--parchment-dark)">Lv.${c.level}</div>
            </div>
          </div>
        `;
      }).join('')}
      ${displayList.length === 0 ? '<div style="text-align:center;padding:30px;color:var(--parchment-dark);font-size:12px">暫無成員數據</div>' : ''}
    </div>
    <div class="my-rank-footer" style="margin-top:10px;padding:10px 12px;background:linear-gradient(90deg, rgba(80,50,20,0.8), rgba(40,25,10,0.7));border:1.5px solid var(--gold);border-radius:8px;display:flex;align-items:center;gap:10px;box-shadow:0 0 10px rgba(240,192,64,0.2)">
      <div style="width:28px;text-align:center;font-weight:900;color:var(--gold-bright);font-size:14px">#${myRank || '-'}</div>
      <div style="flex:1;font-size:11px;color:var(--parchment-light)">我的排名</div>
      <div style="font-size:12px;font-weight:700;color:var(--gold-bright)">${GS.player.level}級</div>
    </div>
  `;
}

function getRankAssignment(nationId, citizens, idx) {
  // 10級以下無官職
  const c = citizens[idx];
  if (!c || c.level < 10) return { name: '無官職', color: '#888', iconKey: 'sword' };
  // 從高級官職往下分配
  let remaining = idx;
  for (const rank of NOBILITY_RANKS) {
    if (remaining < rank.count) return rank;
    remaining -= rank.count;
  }
  return { name: '平民', color: '#888', iconKey: 'sword' };
}

// 官職Tab：旗帜式卡片布局（前三名更大更醒目）
function renderNobilityTab(nation) {
  const citizens = getNationCitizens(nation.id).filter(c => c.level >= 10);
  citizens.sort((a, b) => b.power - a.power);

  if (citizens.length === 0) {
    return `<div style="text-align:center;padding:40px 20px;color:var(--parchment-dark);font-size:12px">
      暫無 10 級以上國民<br>
      <div style="font-size:10px;margin-top:6px;opacity:0.7">官職僅授予 Lv.10 以上玩家</div>
    </div>`;
  }

  // 分配官職
  const rankAssignments = [];
  let idx = 0;
  NOBILITY_RANKS.forEach(rank => {
    for (let i = 0; i < rank.count && idx < citizens.length; i++, idx++) {
      rankAssignments.push({ ...citizens[idx], rankKey: rank.key, rankInfo: rank });
    }
  });

  const myRankEntry = rankAssignments.find(r => r.isPlayer);
  const myRank = myRankEntry?.rankInfo;
  const king = rankAssignments.find(r => r.rankKey === 'king') || { rankInfo: NOBILITY_RANKS[0], name: '虛位以待' };

  // 按品級分組展示：國王居中，親王/公爵在兩側，其餘下方
  const groups = {
    king:   rankAssignments.filter(r => r.rankKey === 'king'),
    high:   rankAssignments.filter(r => ['prince','duke','marquess'].includes(r.rankKey)),
    mid:    rankAssignments.filter(r => ['earl','viscount','baron'].includes(r.rankKey)),
    low:    rankAssignments.filter(r => ['paladin','knight','royalguard'].includes(r.rankKey)),
  };

  const renderFlag = (entry, size='md') => {
    const ri = entry.rankInfo;
    const sizeMap = { lg: 72, md: 50, sm: 36, xs: 28 };
    const s = sizeMap[size] || 50;
    const iconKey = ri.iconUrl || 'sword';
    const iconUrl = NATION_TAB_ICONS[iconKey] || NATION_TAB_ICONS.sword;
    return `
      <div class="noble-flag rarity-${entry.rankKey || 'white'}" style="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:6px 4px 8px;background:linear-gradient(180deg, ${ri.color}44 0%, rgba(30,20,10,0.95) 45%, rgba(20,14,8,0.98) 100%);border:1.5px solid ${ri.color};border-radius:8px 8px 4px 4px;box-shadow:0 0 14px ${ri.color}55, inset 0 0 8px ${ri.color}22;min-height:${s * 1.5}px;width:${s * 1.1}px">
        <div style="width:100%;height:3px;background:linear-gradient(90deg, transparent, ${ri.color}, transparent)"></div>
        <div style="width:${Math.floor(s*0.7)}px;height:${Math.floor(s*0.7)}px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:radial-gradient(circle, ${ri.color}33, transparent 70%);margin-top:4px;overflow:hidden;border:1.5px solid ${ri.color}">
          <img src="${iconUrl}" style="width:75%;height:75%;object-fit:contain;display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.8))"/>
        </div>
        <div style="text-align:center">
          <div style="font-size:${size==='lg' ? 12 : 10}px;font-weight:700;color:${ri.color};line-height:1.2">${ri.name}</div>
          <div style="font-size:${size==='lg' ? 10 : 8}px;color:var(--parchment-light);margin-top:2px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 2px">${entry.name || '虛位以待'}</div>
          ${entry.online !== undefined ? `<div style="font-size:7px;color:${entry.online ? '#50ff80' : 'var(--parchment-dark)'};margin-top:1px">${entry.online ? '在線' : '離線'}</div>` : ''}
        </div>
        ${entry.isPlayer ? '<div style="position:absolute;top:2px;right:2px;background:var(--gold);color:#000;font-size:7px;padding:0 3px;border-radius:3px;font-weight:700">我</div>' : ''}
      </div>
    `;
  };

  return `
    <div style="margin-bottom:12px;padding:12px;background:linear-gradient(135deg, rgba(80,50,20,0.7), rgba(40,25,10,0.5));border:2px solid var(--gold-dark);border-radius:10px;display:flex;align-items:center;gap:12px;box-shadow:inset 0 0 20px rgba(240,192,64,0.1)">
      <div style="width:48px;height:48px;border-radius:8px;background:linear-gradient(180deg, ${myRank?.color || '#666'}44, #0a0604);border:2px solid ${myRank?.color || '#666'};display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px ${myRank?.color || '#666'}55;overflow:hidden">
        <img src="${myRank ? (NATION_TAB_ICONS[myRank.iconKey] || NATION_TAB_ICONS.sword) : NATION_TAB_ICONS.sword}" style="width:65%;height:65%;object-fit:contain;display:block"/>
      </div>
      <div style="flex:1">
        <div style="font-size:10px;color:var(--parchment-dark)">我的官職</div>
        <div style="font-size:16px;font-weight:700;color:${myRank?.color || '#ccc'};text-shadow:0 1px 3px rgba(0,0,0,0.8)">${myRank?.name || (GS.player.level < 10 ? '無官職（需10級）' : '平民')}</div>
        <div style="font-size:10px;color:var(--parchment-dark);margin-top:2px">攻擊+${myRank?.atkBonus || 0} · 防禦+${myRank?.defBonus || 0} · 生命+${myRank?.hpBonus || 0}</div>
      </div>
    </div>
    <!-- 國王大旗 -->
    <div style="display:flex;justify-content:center;margin-bottom:14px">
      ${groups.king.length > 0 ? renderFlag(groups.king[0], 'lg') : `
        <div style="width:80px;height:110px;border:2px dashed #666;border-radius:8px 8px 4px 4px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#666;gap:4px">
          <div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:1px solid #555"><img src="${NATION_TAB_ICONS.crown}" style="width:70%;height:70%;object-fit:contain;display:block;opacity:0.6"/></div>
          <div style="font-size:10px">國王虛位</div>
          <div style="font-size:9px;opacity:0.7">有待賢能</div>
        </div>
      `}
    </div>
    <!-- 高級官職 -->
    <div class="nobility-high-row" style="display:flex;justify-content:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
      ${groups.high.map(e => renderFlag(e, 'md')).join('')}
      ${groups.high.length === 0 ? '<div style="font-size:10px;color:#666;padding:20px">高級官職虛位以待</div>' : ''}
    </div>
    <!-- 中級官職 -->
    <div class="nobility-mid-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px">
      ${groups.mid.map(e => renderFlag(e, 'sm')).join('')}
    </div>
    <!-- 低級官職 -->
    <div class="nobility-low-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-bottom:10px">
      ${groups.low.map(e => renderFlag(e, 'xs')).join('')}
    </div>
    <div style="text-align:center;font-size:10px;color:var(--parchment-dark)">共 ${citizens.length} 名 Lv.10+ 國民 · 按戰力排名授官</div>
  `;
}

// 生成國家虚拟国民（带貢獻度、戰力、职业）
function generateNationCitizens(nation) {
  const cached = window._nationCitizens?.[nation.id];
  if (cached) return cached;
  if (!window._nationCitizens) window._nationCitizens = {};
  
  const count = 80 + Math.floor(Math.random() * 40);
  const list = [];
  // 玩家加入
  list.push({
    id: 'player',
    uid: 'player',
    name: GS.player.name,
    classId: GS.player.classId,
    level: GS.player.level,
    contribution: GS.nationContribution || 0,
    power: Math.floor((GS.player.level || 1) * 100 + (GS.nationContribution || 0) * 0.5),
    isPlayer: true,
  });
  // AI 国民
  const nationGuilds = AI_GUILDS.filter(g => g.nation === nation.id);
  const citizenNames = new Set();
  for (let i = 0; i < count; i++) {
    let name = generateRandomAIName();
    // 国民名字允許與AI玩家重複（不同名稱池），但同一國不重複
    let attempts = 0;
    while (citizenNames.has(name) && attempts < 50) {
      name = generateRandomAIName();
      attempts++;
    }
    citizenNames.add(name);
    const level = 5 + Math.floor(Math.random() * 50);
    const contrib = Math.floor(level * (5 + Math.random() * 15));
    const classIds = ['warrior', 'mage', 'archer', 'rogue', 'priest'];
    list.push({
      id: 'citizen_' + i,
      uid: 'citizen_' + i,
      name: name + (Math.random() > 0.7 ? '·' + Math.floor(Math.random() * 999) : ''),
      classId: classIds[Math.floor(Math.random() * classIds.length)],
      level,
      contribution: contrib,
      power: Math.floor(level * 80 + contrib * 0.3 + Math.random() * 500),
      isPlayer: false,
    });
  }
  window._nationCitizens[nation.id] = list;
  return list;
}

// 軍團Tab（固定軍團，玩家只能加入，不能創建）
function renderLegionTab(nation) {
  const lvInfo = getNationLevelInfo(nation.id);
  const availableGuilds = getNationAvailableGuilds(nation.id);
  const allGuilds = AI_GUILDS.filter(g => g.nation === nation.id);
  const hasLegion = !!(GS.legionId || GS.guildId);
  const myLegion = hasLegion ? allGuilds.find(g => g.id === (GS.legionId || GS.guildId)) : null;

  if (hasLegion && myLegion) {
    const allMembers = getGuildMembers(myLegion.id);
    const members = allMembers.slice(0, 50);
    return `
      <div style="padding:14px;border:1px solid var(--gold-dark);border-radius:10px;background:linear-gradient(135deg, rgba(60,40,20,0.7), rgba(20,14,8,0.5));margin-bottom:10px;box-shadow:inset 0 0 20px rgba(240,192,64,0.1)">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg, rgba(30,22,14,0.9), rgba(15,10,6,0.95));display:flex;align-items:center;justify-content:center;border:2px solid var(--gold);overflow:hidden;box-shadow:0 0 12px rgba(240,192,64,0.4)"><img src="${NATION_TAB_ICONS.legion}" style="width:100%;height:100%;object-fit:cover;display:block"/></div>
          <div style="flex:1">
            <div style="font-size:16px;font-weight:700;color:var(--gold-bright);text-shadow:0 1px 2px #000">${myLegion.name}</div>
             <div style="font-size:10px;color:var(--parchment-dark);margin-top:2px">Lv.${myLegion.level} · ${getGuildMemberCount(myLegion.id)}名團員 · 軍團長：${myLegion.leader}</div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--parchment-light);margin-top:10px;padding:8px 10px;background:rgba(0,0,0,0.35);border-radius:6px;border-left:3px solid var(--gold-dark);line-height:1.4">「${myLegion.notice || '以武立盟，凡犯我者雖遠必誅。'}」</div>
        <div style="display:flex;gap:6px;margin-top:10px">
          <div style="flex:1;text-align:center;padding:6px;background:rgba(0,0,0,0.3);border-radius:4px">
            <div style="font-size:12px;font-weight:700;color:var(--gold-bright)">${myLegion.funds?.toLocaleString() || 0}</div>
            <div style="font-size:9px;color:var(--parchment-dark)">軍團資金</div>
          </div>
          <div style="flex:1;text-align:center;padding:6px;background:rgba(0,0,0,0.3);border-radius:4px">
            <div style="font-size:12px;font-weight:700;color:#80c0ff">${getGuildMemberCount(myLegion.id)}</div>
             <div style="font-size:9px;color:var(--parchment-dark)">團員數</div>
          </div>
          <div style="flex:1;text-align:center;padding:6px;background:rgba(0,0,0,0.3);border-radius:4px">
            <div style="font-size:12px;font-weight:700;color:#80ff90">Lv.${myLegion.level}</div>
            <div style="font-size:9px;color:var(--parchment-dark)">軍團等級</div>
          </div>
        </div>
      </div>
      <div class="bag-section-title" style="margin-bottom:6px">軍團團員（${allMembers.length}人）</div>
      <div class="legion-members-list" style="display:flex;flex-direction:column;gap:4px;margin-bottom:10px;max-height:320px;overflow-y:auto;padding-right:2px">
        ${members.map((m, i) => {
          const cls = CLASSES[m.classId] || CLASSES.warrior;
          const roleColor = i === 0 ? '#ffd040' : (i <= 2 ? '#c0a0ff' : 'var(--parchment-dark)');
          const power = m.power || Math.floor((m.level || 1) * 50 + 20);
          return `
          <div class="legion-member-row ${m.isPlayer ? 'me' : ''}" style="display:flex;align-items:center;gap:8px;padding:7px 9px;background:linear-gradient(90deg, rgba(40,28,16,${i < 3 ? 0.7 : 0.5}), rgba(20,14,8,0.3));border-radius:6px;border:1px solid ${m.isPlayer ? 'var(--gold-bright)' : 'rgba(240,192,64,0.15)'};box-shadow:${m.isPlayer ? '0 0 8px rgba(240,192,64,0.3)' : 'none'}">
            <div class="member-avatar" style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg, #3a2a18, #1a1008);border:1.5px solid ${roleColor};display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;position:relative">${spriteEmojiHTML(cls.sprite, 20)}${m.isPlayer ? '<div style="position:absolute;bottom:-2px;right:-2px;background:var(--gold);color:#000;font-size:7px;padding:0 3px;border-radius:3px;font-weight:700;line-height:1.3">我</div>' : ''}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:700;color:var(--parchment-light);display:flex;align-items:center;gap:4px">
                ${m.name || '-'}
                ${m.online ? '<span style="width:6px;height:6px;border-radius:50%;background:#50ff80;box-shadow:0 0 4px #50ff80;flex-shrink:0"></span>' : ''}
              </div>
              <div style="font-size:9px;color:${roleColor};margin-top:1px;font-weight:600">${m.role || '團員'}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:10px;font-weight:700;color:var(--gold-bright)">${power}</div>
              <div style="font-size:9px;color:var(--parchment-dark)">Lv.${m.level || 1}</div>
            </div>
          </div>
        `;}).join('')}
        ${members.length === 0 ? '<div style="text-align:center;padding:20px;color:var(--parchment-dark);font-size:11px">暫無團員</div>' : ''}
      </div>
      <button class="castle-card-btn leave-legion-btn" style="width:100%;padding:8px;font-size:12px;background:rgba(120,40,40,0.6);border-color:#a04040;color:#ffb0b0">退出軍團</button>
    `;
  }

  return `
      <div style="margin-bottom:10px;padding:10px 12px;background:linear-gradient(135deg, rgba(40,28,14,0.7), rgba(20,14,8,0.5));border:1px solid var(--gold-dark);border-radius:8px">
        <div style="font-size:13px;font-weight:700;color:var(--gold-bright);margin-bottom:4px">加入軍團</div>
      <div style="font-size:10px;color:var(--parchment-dark);line-height:1.4">加入軍團後可參與攻城戰、組織軍團戰，與戰友並肩作戰</div>
      <div style="font-size:9px;color:#80c0ff;margin-top:6px">國家 Lv.${lvInfo.level}：已解鎖 ${availableGuilds.length}/${allGuilds.length} 個軍團</div>
    </div>
    ${GS.player.level < 10 ? `<div style="padding:12px;text-align:center;color:#ff9060;font-size:11px;background:rgba(120,50,20,0.3);border:1px solid #a05020;border-radius:8px;margin-bottom:10px">
      需要達到 Lv.10 才能加入軍團（當前 Lv.${GS.player.level}）
    </div>` : ''}
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px">
      ${availableGuilds.map((g, i) => `
        <div style="padding:10px 12px;border:1px solid var(--gold-dark);border-radius:8px;background:linear-gradient(135deg, rgba(40,28,16,0.6), rgba(20,14,8,0.4));display:flex;align-items:center;gap:12px;box-shadow:0 2px 6px rgba(0,0,0,0.4), inset 0 0 10px rgba(240,192,64,0.05)">
          <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg, rgba(30,22,14,0.9), rgba(15,10,6,0.95));display:flex;align-items:center;justify-content:center;border:1.5px solid var(--gold-dark);overflow:hidden"><img src="${NATION_TAB_ICONS.legion}" style="width:100%;height:100%;object-fit:cover;display:block"/></div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700;color:var(--gold-bright);text-shadow:0 1px 2px #000">${g.name}</div>
            <div style="font-size:10px;color:var(--parchment-dark);margin-top:1px">Lv.${g.level} · ${getGuildMemberCount(g.id)}人 · 軍團長：${g.leader}</div>
            <div style="font-size:9px;color:var(--parchment-dark);margin-top:1px;opacity:0.85">${g.notice || ''}</div>
          </div>
          ${GS.player.level < 10 ? `<div style="padding:6px 10px;font-size:10px;color:var(--parchment-dark);background:rgba(0,0,0,0.3);border-radius:4px;border:1px solid rgba(240,192,64,0.1)">Lv.10解鎖</div>` : `<button class="castle-card-btn join-legion-btn" data-legion="${g.id}" style="padding:6px 14px;font-size:11px;background:linear-gradient(135deg, #8b6520, #5a3a10)">申請加入</button>`}
        </div>
      `).join('')}
      ${allGuilds.slice(availableGuilds.length).map((g, i) => `
        <div style="padding:10px 12px;border:1px solid rgba(120,100,70,0.3);border-radius:8px;background:linear-gradient(135deg, rgba(30,22,12,0.4), rgba(15,10,5,0.2));display:flex;align-items:center;gap:12px;opacity:0.5">
          <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg, rgba(20,15,8,0.6), rgba(10,8,4,0.4));display:flex;align-items:center;justify-content:center;border:1px solid rgba(100,80,50,0.3);overflow:hidden"><img src="${NATION_TAB_ICONS.legion}" style="width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(1) brightness(0.4)"/></div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700;color:#8a7a60;text-shadow:0 1px 2px #000">${g.name}</div>
            <div style="font-size:10px;color:#6a5a45;margin-top:1px">國家 Lv.${availableGuilds.length + i + 1} 解鎖</div>
          </div>
          <button disabled style="padding:6px 14px;font-size:11px;background:rgba(60,50,35,0.5);border:1px solid rgba(120,100,70,0.3);border-radius:4px;color:#6a5a45;cursor:not-allowed">未開放</button>
        </div>
      `).join('')}
    </div>
    ${allGuilds.length > availableGuilds.length ? `
      <div style="text-align:center;font-size:10px;color:var(--parchment-dark);padding:8px;background:rgba(0,0,0,0.2);border-radius:4px;border:1px dashed rgba(240,192,64,0.2)">
        還有 ${allGuilds.length - availableGuilds.length} 個軍團未解鎖，提升國家等級可解鎖更多軍團
      </div>
    ` : ''}
  `;
}

// 捐献Tab
function renderDonateTab(nation) {
  const todayGold = GS.todayDonatedGold || 0;
  const todayGem = GS.todayDonatedGem || 0;
  const dailyGoldLimit = 100000;
  const dailyGemLimit = 500;

  return `
    <div style="margin-bottom:12px;padding:10px 12px;background:linear-gradient(135deg, rgba(60,40,20,0.6), rgba(30,20,10,0.4));border:1px solid var(--gold-dark);border-radius:8px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11px;color:var(--parchment-dark)">當前貢獻值</span>
        <span style="font-size:18px;font-weight:700;color:var(--gold-bright)">${GS.nationContribution || 0}</span>
      </div>
      <div style="margin-top:6px;height:4px;background:rgba(0,0,0,0.3);border-radius:2px;overflow:hidden">
        <div style="height:100%;width:${Math.min(100, (GS.nationContribution || 0) / 100)}%;background:linear-gradient(90deg, var(--gold-dark), var(--gold-bright))"></div>
      </div>
    </div>

    <div class="bag-section-title">金幣捐獻</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px">
      ${DONATION_CONFIG.gold.map(d => {
        const remaining = d.dailyLimit - Math.floor(todayGold / d.amount);
        const disabled = remaining <= 0;
        return `
          <button class="donate-btn ${disabled ? 'disabled' : ''}" data-donate="gold:${d.amount}:${d.contribution}" ${disabled ? 'disabled' : ''} style="padding:10px 4px;background:linear-gradient(135deg, rgba(80,60,20,0.6), rgba(40,30,10,0.4));border:1px solid var(--gold-dark);border-radius:6px;color:var(--parchment-light);cursor:pointer;text-align:center">
            <div style="font-size:13px;font-weight:700;color:var(--gold-bright)">${d.amount.toLocaleString()}</div>
            <div style="font-size:9px;color:var(--parchment-dark);margin:2px 0">金幣</div>
            <div style="font-size:10px;color:#80ff80">+${d.contribution}貢獻</div>
            <div style="font-size:8px;color:var(--parchment-dark);margin-top:2px">剩餘 ${Math.max(0, remaining)}次</div>
          </button>
        `;
      }).join('')}
    </div>

    <div class="bag-section-title">鑽石捐獻</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
      ${DONATION_CONFIG.gem.map(d => {
        const remaining = d.dailyLimit - Math.floor(todayGem / d.amount);
        const disabled = remaining <= 0;
        return `
          <button class="donate-btn ${disabled ? 'disabled' : ''}" data-donate="gem:${d.amount}:${d.contribution}" ${disabled ? 'disabled' : ''} style="padding:10px 4px;background:linear-gradient(135deg, rgba(80,60,100,0.4), rgba(40,30,60,0.3));border:1px solid #9070c0;border-radius:6px;color:var(--parchment-light);cursor:pointer;text-align:center">
            <div style="font-size:13px;font-weight:700;color:#c0a0ff;display:flex;align-items:center;justify-content:center;gap:4px"><span style="width:14px;height:14px;display:inline-block;overflow:hidden;border-radius:50%;border:1px solid #a070d0"><img src="${NATION_TAB_ICONS.gem}" style="width:100%;height:100%;object-fit:cover;display:block"/></span> ${d.amount}</div>
            <div style="font-size:9px;color:var(--parchment-dark);margin:2px 0">鑽石</div>
            <div style="font-size:10px;color:#80ff80">+${d.contribution}貢獻</div>
            <div style="font-size:8px;color:var(--parchment-dark);margin-top:2px">剩餘 ${Math.max(0, remaining)}次</div>
          </button>
        `;
      }).join('')}
    </div>
    <div style="margin-top:8px;font-size:9px;color:var(--parchment-dark);text-align:center">貢獻值用於國家技能樹加點</div>
  `;
}

// 國家技能树Tab
function renderNationSkillsTab(nation) {
  return `
    <div style="margin-bottom:10px;padding:8px 10px;background:rgba(40,28,14,0.5);border:1px solid var(--gold-dark);border-radius:6px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:11px;color:var(--parchment-dark)">可用貢獻值</span>
      <span style="font-size:15px;font-weight:700;color:var(--gold-bright)">${GS.nationContribution || 0}</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px">
      ${NATION_SKILL_TREE.map(skill => {
        const level = GS.nationSkillLevels?.[skill.id] || 0;
        const nextCost = Math.floor(skill.costBase * Math.pow(skill.costGrow, level));
        const isMax = level >= skill.maxLevel;
        const currentVal = level > 0 ? (skill.baseValue + (level - 1) * skill.perLevel).toFixed(1) : '0';
        const nextVal = isMax ? '-' : (skill.baseValue + level * skill.perLevel).toFixed(1);
        return `
          <div class="nation-skill-row" data-skill-id="${skill.id}" style="display:flex;align-items:center;gap:8px;padding:8px;background:rgba(30,22,14,0.5);border:1px solid rgba(240,192,64,0.2);border-radius:6px">
             <div style="width:36px;height:36px;border-radius:6px;background:linear-gradient(135deg, ${skill.color}33, ${skill.color}11);border:1px solid ${skill.color}66;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden"><img src="${NATION_TAB_ICONS[skill.iconKey] || NATION_TAB_ICONS.skill}" style="width:70%;height:70%;object-fit:contain;display:block;filter:drop-shadow(0 0 3px ${skill.color})"/></div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:12px;font-weight:600;color:var(--parchment-light)">${skill.name}</span>
                <span style="font-size:10px;color:${skill.color};font-weight:700">Lv.${level}/${skill.maxLevel}</span>
              </div>
              <div style="font-size:9px;color:var(--parchment-dark);margin-top:2px">${skill.desc}${currentVal}% → ${nextVal}%</div>
              <div style="height:3px;background:rgba(0,0,0,0.3);border-radius:2px;margin-top:4px;overflow:hidden">
                <div style="height:100%;width:${(level / skill.maxLevel * 100).toFixed(0)}%;background:${skill.color}"></div>
              </div>
            </div>
            <button class="nation-skill-up-btn" data-skill-up="${skill.id}" ${isMax ? 'disabled' : ''} style="padding:5px 10px;font-size:10px;background:${isMax ? '#444' : 'linear-gradient(135deg, #8b6520, #5a3a10)'};border:1px solid ${isMax ? '#666' : 'var(--gold-dark)'};color:${isMax ? '#888' : 'var(--gold-bright)'};border-radius:4px;cursor:${isMax ? 'default' : 'pointer'};font-weight:600;white-space:nowrap">
              ${isMax ? '已滿級' : `${nextCost}貢獻`}
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// 國家信息Tab
function renderNationInfoTab(nation) {
  const nationCastles = CASTLES.filter(c => c.nation === nation.id);
  const nationGuilds = AI_GUILDS.filter(g => g.nation === nation.id);
  const enemies = NATIONS.filter(n => n.id !== nation.id);

  return `
    <div class="bag-section-title" style="display:flex;align-items:center;gap:6px"><span style="width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;border-radius:50%;border:1px solid var(--gold-dark)"><img src="${NATION_TAB_ICONS.castle}" style="width:100%;height:100%;object-fit:cover;display:block"/></span> 國家城堡（${nationCastles.length}座）</div>
    <div style="display:flex;flex-direction:column;gap:5px;margin-bottom:12px">
      ${nationCastles.map(c => `
        <div style="padding:7px 10px;border:1px solid var(--gold-dark);border-radius:6px;background:rgba(30,22,14,0.5);display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:11px;font-weight:600;color:var(--parchment-light)">${c.name}</div>
            <div style="font-size:9px;color:var(--parchment-dark)">Lv.${c.level} · 税率 ${c.taxRate}%</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:9px;color:${c.owner ? '#80ff90' : '#ff8080'}">${c.owner ? '已占領' : '無主'}</div>
            <div style="font-size:8px;color:var(--parchment-dark)">${c.ownerName}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="bag-section-title" style="display:flex;align-items:center;gap:6px"><span style="width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;border-radius:50%;border:1px solid var(--gold-dark)"><img src="${NATION_TAB_ICONS.legion}" style="width:100%;height:100%;object-fit:cover;display:block"/></span> 國家軍團（${nationGuilds.length}個）</div>
    <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:12px;max-height:140px;overflow-y:auto">
      ${nationGuilds.map(g => `
        <div style="padding:5px 8px;border-bottom:1px solid rgba(240,192,64,0.1);display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:10px;font-weight:600;color:var(--parchment-light)">${g.name}</span>
           <span style="font-size:9px;color:${g.castle ? '#f0c040' : 'var(--parchment-dark)'}">${g.castle ? '有城堡' : `${g.members}人`}</span>
        </div>
      `).join('')}
    </div>

    <div class="bag-section-title" style="display:flex;align-items:center;gap:6px"><span style="width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;border-radius:50%;border:1px solid var(--gold-dark)"><img src="${NATION_TAB_ICONS.war}" style="width:100%;height:100%;object-fit:cover;display:block"/></span> 國家關係</div>
    <div style="display:flex;flex-direction:column;gap:3px;margin-bottom:12px">
      ${enemies.map(n => `
        <div style="display:flex;justify-content:space-between;padding:5px 8px;background:rgba(80,20,20,0.2);border-radius:4px;border:1px solid rgba(255,80,80,0.2)">
          <span style="font-size:10px;color:var(--parchment-light)">${n.flag} ${n.name}</span>
          <span style="font-size:10px;color:#ff6060;font-weight:600">⚔ 敌对</span>
        </div>
      `).join('')}
    </div>

    <button class="castle-card-btn leave-nation-btn" style="width:100%;padding:8px;font-size:12px;background:rgba(120,40,40,0.6)">退出國家</button>
  `;
}

function renderGuildPageEnhanced() {
  const hasGuild = !!GS.guild;

  if (!hasGuild) {
    // 未加入公會：顯示國家所有軍團，未達國家等級的顯示鎖定
    const nationLv = GS.nation ? getNationLevelInfo(GS.nation).level : 0;
    const nationGuilds = GS.nation
      ? AI_GUILDS.filter(g => g.nation === GS.nation).sort((a,b) => a.order - b.order)
      : [];
    return `
      <div style="text-align:center;padding:14px 12px;border-bottom:1px solid var(--gold-dark);margin-bottom:12px;background:linear-gradient(180deg, rgba(40,25,10,0.5), rgba(20,12,5,0.3))">
        <div style="width:48px;height:48px;margin:0 auto 4px;border-radius:50%;border:2px solid var(--gold-dark);background:radial-gradient(circle, rgba(30,22,14,0.9), rgba(15,10,6,0.95));display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 0 12px rgba(240,192,64,0.25)"><img src="${NATION_TAB_ICONS.legion}" style="width:100%;height:100%;object-fit:cover;display:block"/></div>
        <div class="nation-name" style="font-size:16px;color:var(--gold-bright)">尚未加入軍團</div>
        <div style="font-size:11px;color:var(--parchment-dark);margin-top:4px">
          ${GS.nation ? `國家等級 Lv.${nationLv}，已解鎖 ${Math.min(10,nationLv)} / 10 軍團` : '請先加入國家才能加入軍團'}
        </div>
      </div>
      ${GS.nation ? `
        <div class="bag-section-title" style="margin-top:8px;display:flex;align-items:center;gap:6px"><span style="width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;border-radius:50%;border:1px solid var(--gold-dark)"><img src="${NATION_TAB_ICONS.scroll}" style="width:100%;height:100%;object-fit:cover;display:block"/></span> 國家軍團列表</div>
        <div style="display:flex;flex-direction:column;gap:6px;max-height:55vh;overflow-y:auto;padding:2px">
          ${nationGuilds.map(g => {
            const unlocked = nationLv >= g.order;
            const members = getGuildMembers(g.id);
            const isFull = members.length >= (g.level * 10 + 10);
            return `
            <div class="guild-list-card ${unlocked ? '' : 'guild-locked'}">
              <div class="guild-list-icon"><img src="${unlocked ? NATION_TAB_ICONS.legion : NATION_TAB_ICONS.castle}" style="width:100%;height:100%;object-fit:cover;display:block;${unlocked ? '' : 'filter:grayscale(1) brightness(0.3)'}"/></div>
              <div class="guild-list-info">
                <div class="guild-list-name">${g.name}</div>
                <div class="guild-list-desc">
                  ${unlocked
                    ? `軍團長：${g.leader} · Lv.${g.level} · ${g.members || members.length}人`
                    : `國家 Lv.${g.order} 解鎖`
                  }
                </div>
                <div class="guild-list-notice" style="font-size:9px;color:var(--parchment-dark);margin-top:2px;opacity:0.8">${g.notice || ''}</div>
              </div>
              ${unlocked
                ? `<button class="guild-apply-btn ${isFull ? 'full' : ''}" data-guild-apply="${g.id}" ${isFull ? 'disabled' : ''}>
                    ${isFull ? '滿員' : '加入'}
                  </button>`
                : `<button class="guild-apply-btn full" disabled>未開放</button>`
              }
            </div>`;
          }).join('')}
        </div>
      ` : `
        <div style="text-align:center;padding:40px 20px;color:var(--parchment-dark);font-size:12px;line-height:1.8">
          <div style="width:48px;height:48px;margin:0 auto 10px;border-radius:50%;border:2px solid var(--gold-dark);background:radial-gradient(circle, rgba(30,22,14,0.9), rgba(15,10,6,0.95));display:flex;align-items:center;justify-content:center;overflow:hidden"><img src="${NATION_TAB_ICONS.castle}" style="width:100%;height:100%;object-fit:cover;display:block;opacity:0.7"/></div>
          請先前往「國家」頁面加入一個國家，<br>然後加入軍團。
        </div>
      `}
    `;
  }

  // ===== 已加入公会 =====
  const myGuild = GS.guild;
  const tab = GS.guildTab || 'members';
  const gLevel = myGuild.level || 1;
  const myContribution = myGuild.myContribution || 0;
  const todayDonatedGold = myGuild.todayDonatedGold || 0;
  const todayDonatedGem = myGuild.todayDonatedGem || 0;
  const dailyGoldLimit = 10000;
  const dailyGemLimit = 50;
  const isLeader = myGuild.role === 'leader';
  const isOfficer = myGuild.role === 'officer';
  const canManage = isLeader || isOfficer;
  const roleText = isLeader ? '軍團長' : (isOfficer ? '副軍團長' : '團員');
  const roleColor = isLeader ? '#f0c040' : (isOfficer ? '#80d4ff' : '#c0a070');
  const members = getGuildMembers(myGuild.id);
  const apps = (myGuild.applications && myGuild.applications.length) ? myGuild.applications : [];

  const skillTree = [
    { id: 'atk',   name: '攻擊強化', iconKey: 'sword',   desc: '攻擊力 +2% / 級', max: 10, reqLevel: 1, baseCost: 50 },
    { id: 'def',   name: '防禦強化', iconKey: 'shield',  desc: '防禦力 +2% / 級', max: 10, reqLevel: 1, baseCost: 50 },
    { id: 'hp',    name: '生命強化', iconKey: 'treasury', desc: '生命上限 +3% / 級', max: 10, reqLevel: 2, baseCost: 80 },
    { id: 'crit',  name: '暴擊強化', iconKey: 'war',     desc: '暴擊率 +1% / 級',  max: 5,  reqLevel: 3, baseCost: 100 },
    { id: 'cdmg',  name: '暴傷強化', iconKey: 'skill',   desc: '暴擊傷害 +5% / 級', max: 10, reqLevel: 4, baseCost: 120 },
    { id: 'exp',   name: '經驗加成', iconKey: 'scroll',  desc: '打怪經驗 +5% / 級', max: 5,  reqLevel: 2, baseCost: 150 },
    { id: 'drop',  name: '掉寶加成', iconKey: 'gem',     desc: '掉落率 +3% / 級',   max: 5,  reqLevel: 5, baseCost: 200 },
  ];

  const tabs = [
    { key: 'members', label: '團員', iconKey: 'members' },
    { key: 'skills',  label: '技能樹', iconKey: 'skill' },
    { key: 'donate',  label: '貢獻', iconKey: 'donate' },
    { key: 'info',    label: '資訊', iconKey: 'office' },
  ];

  const mySkillLevels = myGuild.skillLevels || {};
  const maxMembers = gLevel * 10 + 10;

  return `
    <div class="guild-header-card">
      <div class="guild-header-icon"><img src="${NATION_TAB_ICONS.legion}" style="width:100%;height:100%;object-fit:cover;display:block"/></div>
      <div class="guild-header-info">
        <div class="guild-header-name">${myGuild.name}</div>
        <div class="guild-header-meta">
          Lv.${gLevel} · ${members.length} / ${maxMembers} 團員
        </div>
      </div>
      <div class="guild-header-role" style="color:${roleColor}">${roleText}</div>
    </div>

    <div style="display:flex;gap:3px;margin-bottom:10px" class="guild-tab-bar">
      ${tabs.map(t => `
        <button class="guild-tab ${tab === t.key ? 'active' : ''}" data-guild-tab="${t.key}">${t.label}</button>
      `).join('')}
    </div>

    ${tab === 'members' ? `
      <div class="guild-sub-header">
        <span>團員列表 · 共 ${members.length} 人</span>
        ${canManage && apps.length > 0 ? `<span class="guild-app-badge">${apps.length} 申請</span>` : ''}
      </div>
      <div class="guild-members-list">
        ${members.map((m, i) => {
          const roleClass = m.role === '軍團長' ? 'leader' : (m.role === '副軍團長' ? 'officer' : 'member');
          const className = CLASSES[m.classId]?.name || '—';
          const canKick = canManage && m.name !== GS.player.name && m.role !== '軍團長';
          const canPromote = isLeader && m.name !== GS.player.name && m.role === '團員';
          return `
          <div class="guild-member-row">
            <div class="guild-member-left">
              <div class="guild-member-avatar" style="filter:drop-shadow(0 0 4px ${SPRITE[m.classId || 'warrior']?.glow || '#ffe090'});width:34px;height:34px;border-radius:50%;border:1.5px solid var(--gold-dark);overflow:hidden;display:flex;align-items:center;justify-content:center;background:#0a0604">
                 <img src="${SPRITE[m.classId || 'warrior']?.idle || NATION_TAB_ICONS.sword}" style="width:80%;height:80%;object-fit:cover;display:block"/>
               </div>
               <div class="guild-member-info">
                 <div class="guild-member-name">
                   <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${m.online ? '#50ff80' : '#666'};box-shadow:${m.online ? '0 0 4px #50ff80' : 'none'};margin-right:4px;vertical-align:middle"></span> ${m.name}
                  ${!m.isAI ? '<span class="guild-human-tag">玩家</span>' : ''}
                </div>
                <div class="guild-member-desc">
                  ${className} · Lv.${m.level} · 貢獻 ${m.contribution || 0}
                </div>
              </div>
            </div>
            <div class="guild-member-role role-${roleClass}">${m.role}</div>
            ${canManage && (canKick || canPromote) ? `
              <div class="guild-member-actions">
                ${canPromote ? `<button class="guild-act-btn" data-promote="${m.name}">升副</button>` : ''}
                ${canKick ? `<button class="guild-act-btn danger" data-kick="${m.name}">踢除</button>` : ''}
              </div>
            ` : ''}
          </div>`;
        }).join('')}
      </div>
      ${canManage && apps.length > 0 ? `
         <div class="guild-sub-header" style="margin-top:12px;display:flex;align-items:center;gap:6px"><span style="width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;border-radius:50%;border:1px solid var(--gold-dark)"><img src="${NATION_TAB_ICONS.members}" style="width:100%;height:100%;object-fit:cover;display:block"/></span> 入會申請</div>
        <div class="guild-apps-list">
          ${apps.map(app => `
            <div class="guild-app-row">
              <div class="guild-app-name">${app.name} <span style="font-size:9px;color:var(--parchment-dark)">Lv.${app.level || '?'}</span></div>
              <div style="display:flex;gap:4px">
                <button class="guild-act-btn" data-app-accept="${app.name}">通過</button>
                <button class="guild-act-btn danger" data-app-reject="${app.name}">拒絕</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    ` : ''}

    ${tab === 'skills' ? `
      <div class="guild-skills-header">
        <div>當前貢獻值：<span style="color:var(--gold-bright);font-weight:700;font-size:16px">${myContribution}</span></div>
        <div style="font-size:10px;color:var(--parchment-dark)">軍團 Lv.${gLevel} · 需升級解鎖高級技能</div>
      </div>
      <div class="guild-skill-list">
        ${skillTree.map(s => {
          const curLv = mySkillLevels[s.id] || 0;
          const locked = gLevel < s.reqLevel;
          const maxed = curLv >= s.max;
          const cost = s.baseCost * (curLv + 1);
          const canLearn = !locked && !maxed && myContribution >= cost;
          return `
            <div class="guild-skill-card ${locked ? 'locked' : ''}">
              <div class="guild-skill-icon"><img src="${NATION_TAB_ICONS[s.iconKey] || NATION_TAB_ICONS.skill}" style="width:70%;height:70%;object-fit:contain;display:block;filter:drop-shadow(0 0 3px rgba(240,192,64,0.4))"/></div>
              <div class="guild-skill-body">
                <div class="guild-skill-name">
                  ${s.name}
                  <span class="guild-skill-level">Lv.${curLv}/${s.max}</span>
                </div>
                <div class="guild-skill-desc">${s.desc}</div>
                <div class="guild-skill-progress">
                  <div class="guild-skill-progress-fill" style="width:${(curLv / s.max) * 100}%"></div>
                </div>
              </div>
              <button class="guild-skill-btn ${!canLearn ? 'disabled' : ''}" data-skill-id="${s.id}" ${!canLearn ? 'disabled' : ''}>
                ${locked ? `需Lv.${s.reqLevel}` : (maxed ? '滿級' : `${cost}貢獻`)}
              </button>
            </div>
          `;
        }).join('')}
      </div>
    ` : ''}

    ${tab === 'donate' ? `
      <div class="guild-donate-header">
        <div>當前貢獻值</div>
        <div class="guild-donate-value">${myContribution}</div>
      </div>

      <div class="guild-donate-card gold">
        <div class="guild-donate-card-header">
          <div class="guild-donate-card-title" style="display:flex;align-items:center;gap:6px"><span style="width:16px;height:16px;display:inline-block;overflow:hidden;border-radius:50%;border:1px solid #d4a050"><img src="${NATION_TAB_ICONS.treasury}" style="width:100%;height:100%;object-fit:cover;display:block"/></span> 金幣捐獻</div>
          <div class="guild-donate-rate">1000 金幣 = 1 貢獻</div>
        </div>
        <div class="guild-donate-progress-wrap">
          <div class="guild-donate-progress">
            <div class="guild-donate-progress-fill gold" style="width:${Math.min(100, todayDonatedGold / dailyGoldLimit * 100)}%"></div>
          </div>
          <div class="guild-donate-count">今日 ${todayDonatedGold} / ${dailyGoldLimit}</div>
        </div>
        <div class="guild-donate-btns">
          <button class="guild-donate-btn" data-donate-type="gold" data-amount="1000" ${todayDonatedGold + 1000 > dailyGoldLimit ? 'disabled' : ''}>捐 1,000</button>
          <button class="guild-donate-btn" data-donate-type="gold" data-amount="5000" ${todayDonatedGold + 5000 > dailyGoldLimit ? 'disabled' : ''}>捐 5,000</button>
          <button class="guild-donate-btn" data-donate-type="gold" data-amount="10000" ${todayDonatedGold + 10000 > dailyGoldLimit ? 'disabled' : ''}>捐 10,000</button>
        </div>
      </div>

      <div class="guild-donate-card gem">
        <div class="guild-donate-card-header">
          <div class="guild-donate-card-title" style="display:flex;align-items:center;gap:6px"><span style="width:16px;height:16px;display:inline-block;overflow:hidden;border-radius:50%;border:1px solid #a070d0"><img src="${NATION_TAB_ICONS.gem}" style="width:100%;height:100%;object-fit:cover;display:block"/></span> 鑽石捐獻</div>
          <div class="guild-donate-rate">1 鑽石 = 5 貢獻</div>
        </div>
        <div class="guild-donate-progress-wrap">
          <div class="guild-donate-progress">
            <div class="guild-donate-progress-fill gem" style="width:${Math.min(100, todayDonatedGem / dailyGemLimit * 100)}%"></div>
          </div>
          <div class="guild-donate-count">今日 ${todayDonatedGem} / ${dailyGemLimit}</div>
        </div>
        <div class="guild-donate-btns">
          <button class="guild-donate-btn gem" data-donate-type="gem" data-amount="10" ${todayDonatedGem + 10 > dailyGemLimit ? 'disabled' : ''}><span style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;overflow:hidden;border:1px solid #a070d0;vertical-align:middle;margin-right:4px"><img src="${NATION_TAB_ICONS.gem}" style="width:100%;height:100%;object-fit:cover;display:block"/></span>10</button>
          <button class="guild-donate-btn gem" data-donate-type="gem" data-amount="30" ${todayDonatedGem + 30 > dailyGemLimit ? 'disabled' : ''}><span style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;overflow:hidden;border:1px solid #a070d0;vertical-align:middle;margin-right:4px"><img src="${NATION_TAB_ICONS.gem}" style="width:100%;height:100%;object-fit:cover;display:block"/></span>30</button>
          <button class="guild-donate-btn gem" data-donate-type="gem" data-amount="50" ${todayDonatedGem + 50 > dailyGemLimit ? 'disabled' : ''}><span style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;overflow:hidden;border:1px solid #a070d0;vertical-align:middle;margin-right:4px"><img src="${NATION_TAB_ICONS.gem}" style="width:100%;height:100%;object-fit:cover;display:block"/></span>50</button>
        </div>
      </div>

       <div class="guild-donate-tip">
         每日凌晨重置捐獻上限 · 鑽石捐獻更划算
       </div>
    ` : ''}

    ${tab === 'info' ? `
      <div class="guild-info-card">
        <div class="guild-info-row">
          <span>公会名稱</span><span style="color:var(--gold-bright);font-weight:700">${myGuild.name}</span>
        </div>
        <div class="guild-info-row">
          <span>當前軍團長</span><span>${myGuild.isAIGuild && !myGuild.hasHumanLeader ? (myGuild.leader || '—') + ' (AI)' : (myGuild.leader || GS.player.name)}</span>
        </div>
        <div class="guild-info-row">
          <span>公会等級</span><span style="color:var(--gold-bright)">Lv.${gLevel}</span>
        </div>
        <div class="guild-info-row">
          <span>團員數量</span><span>${members.length} / ${maxMembers}</span>
        </div>
        <div class="guild-info-row">
          <span>公会資金</span><span style="color:#f0c040">💰 ${(myGuild.funds || 0).toLocaleString()} 金幣</span>
        </div>
        <div class="guild-info-row">
          <span>占領城堡</span><span>${myGuild.castles?.length ? myGuild.castles.length + ' 座' : '無'}</span>
        </div>
      </div>

      <div class="guild-notice-card">
        <div class="guild-notice-title">📜 公会公告</div>
        <div class="guild-notice-text" id="guild-notice-display">${myGuild.notice || '暫無公告，團結一致，共創輝煌！'}</div>
        ${isLeader ? `
          <div style="margin-top:6px;display:flex;gap:6px">
            <button class="guild-notice-edit-btn" id="guild-notice-edit">✏️ 編輯公告</button>
          </div>
        ` : ''}
      </div>

      ${isLeader ? `
        <div class="bag-section-title" style="margin-top:14px">👑 会长管理</div>
        <div class="guild-manager-grid">
          <button class="guild-manager-btn" id="guild-levelup-btn">
            <div class="guild-manager-icon">⬆️</div>
            <div class="guild-manager-text">
              <div>升級公会</div>
              <div style="font-size:9px;opacity:0.75">💰 ${(gLevel * 5000).toLocaleString()} 金幣</div>
            </div>
          </button>
          <button class="guild-manager-btn" id="guild-transfer-btn">
            <div class="guild-manager-icon">👑</div>
            <div class="guild-manager-text">
              <div>轉讓会长</div>
              <div style="font-size:9px;opacity:0.75">選擇繼任者</div>
            </div>
          </button>
        </div>
      ` : ''}

      <div style="margin-top:16px;text-align:center">
        <button class="guild-leave-btn" id="guild-leave-btn">
          ${isLeader ? '🏚️ 解散公會' : '🚪 退出'}
        </button>
      </div>
    ` : ''}
  `;
}

// ==================== 怪物数量与重生优化 ====================
// 每张地圖怪物数量倍增，快速重生
const MONSTER_RESPAWN_TIME = 15; // 秒
function increaseMonsterCount() {
  const allMaps = getAllMaps();
  Object.values(allMaps).forEach(map => {
    if (map.type === 'battle' && map.monsters) {
      let total = 0;
      map.monsters.forEach(spec => {
        spec.count = Math.max(spec.count * 3, 8); // 至少 8 只
        total += spec.count;
      });
      // 确保每张战斗地图至少 30 只怪物
      if (total < 30 && map.monsters.length > 0) {
        const boost = Math.ceil((30 - total) / map.monsters.length);
        map.monsters.forEach(spec => { spec.count += boost; });
      }
    }
  });
}

function checkMonsterRespawn(dt) {
  if (!GS._monsterRespawnTimers) GS._monsterRespawnTimers = [];
  // 减少存活怪物检查，如果数量低于预期则补充
  const allMaps = getAllMaps();
  const map = allMaps[GS.currentMap];
  if (!map || map.type !== 'battle') return;
  const expectedTotal = map.monsters.reduce((s, m) => s + m.count, 0);
  const aliveCount = GS.monsters.filter(m => m.hp > 0 && !m.isBoss).length;
  if (aliveCount < expectedTotal && Math.random() < dt * 0.3) {
    // 随机补一只
    const specs = map.monsters.filter(s => {
      const cur = GS.monsters.filter(m => m.hp > 0 && m.type === s.type).length;
      return cur < s.count;
    });
    if (specs.length > 0) {
      const spec = specs[Math.floor(Math.random() * specs.length)];
      const levelJitter = Math.floor(Math.random() * 3);
      createMonster(spec.type, spec.name, spec.level + levelJitter, Math.random() > 0.5 ? 'aggro' : 'passive');
    }
  }
}


function initClass() {
  const cls = CLASSES[GS.player.classId];
  // 应用职业基础屬性
  for (const k in cls.baseStats) {
    if (k === 'hpMax') GS.player.hpMax = cls.baseStats.hpMax;
    else if (k in GS.player) GS.player[k] = cls.baseStats[k];
  }
  GS.player.hp = GS.player.hpMax;
}

// 變身稀有度分级配置：等級段 -> 稀有度
const TRANSFORM_RARITY_TIERS = [
  { min: 5,  max: 15, rarity: 'white',  rarityName: '普通', color: '#d0d0d0' },
  { min: 16, max: 30, rarity: 'green',  rarityName: '優秀', color: '#60d080' },
  { min: 31, max: 45, rarity: 'blue',   rarityName: '稀有', color: '#60a0ff' },
  { min: 46, max: 49, rarity: 'red',    rarityName: '史詩', color: '#ff6060' },
  { min: 50, max: 60, rarity: 'purple', rarityName: '傳奇', color: '#c080ff' },
  { min: 61, max: 75, rarity: 'gold',   rarityName: '神話', color: '#ffd870' },
];

// 變身形态（每个稀有度等級段3种）
const TRANSFORM_FORMS = [
  // 白色（Lv.5-15）
  { id: 't_wolf',      name: '戰狼',     tier: 5,  rarity: 'white',  typeKey: 'agi', sprite: 'wolf',   stats: { atk: 5,  def: 3,  hpMax: 20,  crit: 1 } },
  { id: 't_guardian',  name: '守衛',     tier: 10, rarity: 'white',  typeKey: 'vit', sprite: 'guardian', stats: { atk: 3,  def: 8,  hpMax: 50,  crit: 0 } },
  { id: 't_berserker', name: '狂戰士',   tier: 15, rarity: 'white',  typeKey: 'str', sprite: 'berserker', stats: { atk: 10, def: 2,  hpMax: 15,  crit: 2 } },
  // 绿色（Lv.16-30）
  { id: 't_blade',     name: '利刃劍士', tier: 18, rarity: 'green',  typeKey: 'str', sprite: 'windsword', stats: { atk: 20, def: 5,  hpMax: 40,  crit: 3 } },
  { id: 't_shadow',    name: '暗影刺客', tier: 24, rarity: 'green',  typeKey: 'agi', sprite: 'shadowassassin',  stats: { atk: 18, def: 3,  hpMax: 25,  crit: 8 } },
  { id: 't_knight',    name: '銀甲騎士', tier: 30, rarity: 'green',  typeKey: 'vit', sprite: 'silverknight',  stats: { atk: 12, def: 15, hpMax: 100, crit: 1 } },
  // 蓝色（Lv.31-45）
  { id: 't_fireknight',name: '炎龍騎士', tier: 35, rarity: 'blue',   typeKey: 'str', sprite: 'dragonknight', stats: { atk: 40, def: 10, hpMax: 80,  crit: 5 } },
  { id: 't_ice_mage',  name: '冰霜法師', tier: 40, rarity: 'blue',   typeKey: 'int', sprite: 'frostmage',  stats: { atk: 50, def: 5,  hpMax: 60,  crit: 6 } },
  { id: 't_windwalker',name: '疾風行者', tier: 45, rarity: 'blue',   typeKey: 'agi', sprite: 'windwalker',  stats: { atk: 35, def: 8,  hpMax: 70,  crit: 12 } },
  // 红色（Lv.46-49）
  { id: 't_deathknight', name: '死亡騎士', tier: 46, rarity: 'red',  typeKey: 'str', sprite: 'deathknight', stats: { atk: 70, def: 20, hpMax: 150, crit: 8 } },
  { id: 't_demon',    name: '惡魔獵手',   tier: 48, rarity: 'red',   typeKey: 'agi', sprite: 'demonhunter', stats: { atk: 80, def: 15, hpMax: 120, crit: 15 } },
  { id: 't_darklord', name: '暗影領主',   tier: 49, rarity: 'red',   typeKey: 'int', sprite: 'darklord',  stats: { atk: 90, def: 10, hpMax: 100, crit: 10 } },
  // 紫色（Lv.50-60）
  { id: 't_dragonknight', name: '龍騎士',  tier: 50, rarity: 'purple', typeKey: 'str', sprite: 'purpledragon', stats: { atk: 120, def: 30, hpMax: 250, crit: 12 } },
  { id: 't_archmage',    name: '大魔導師', tier: 55, rarity: 'purple', typeKey: 'int', sprite: 'archmage',  stats: { atk: 150, def: 15, hpMax: 180, crit: 15 } },
  { id: 't_phoenix',     name: '鳳凰戰神', tier: 60, rarity: 'purple', typeKey: 'str', sprite: 'phoenixgod', stats: { atk: 180, def: 25, hpMax: 300, crit: 18 } },
  // 金色（Lv.61-75）
  { id: 't_emperor',   name: '帝王',      tier: 65, rarity: 'gold',   typeKey: 'str', sprite: 'emperor', stats: { atk: 250, def: 50, hpMax: 500, crit: 20 } },
  { id: 't_godofwar',  name: '戰神',      tier: 70, rarity: 'gold',   typeKey: 'str', sprite: 'warlord', stats: { atk: 300, def: 40, hpMax: 450, crit: 25 } },
  { id: 't_absolute',  name: '絕對者',    tier: 75, rarity: 'gold',   typeKey: 'str', sprite: 'absolute', stats: { atk: 400, def: 60, hpMax: 600, crit: 30 } },
];

function initTransforms() {
  const cls = CLASSES[GS.player.classId];
  if (!cls) return;
  const playerLv = GS.player.level || 1;
  GS.transforms = TRANSFORM_FORMS.map(form => {
    const tierInfo = TRANSFORM_RARITY_TIERS.find(t => t.rarity === form.rarity);
    const unlocked = playerLv >= form.tier;
    return {
      id: form.id,
      name: form.name,
      tier: form.tier,
      rarity: form.rarity,
      rarityName: tierInfo ? tierInfo.rarityName : '普通',
      typeKey: form.typeKey,
      spriteKey: form.sprite,
      classId: cls.id,
      stats: { ...form.stats },
      unlocked,
      cost: form.tier * 500,
    };
  });
  // 如果当前裝備的變身不存在或未解锁，清空
  if (GS.player.transformId) {
    const t = GS.transforms.find(x => x.id === GS.player.transformId);
    if (!t || !t.unlocked) GS.player.transformId = null;
  }
}

// 升級后刷新變身解锁状态（不重建整个数组，避免重置已裝備的變身）
function refreshTransformUnlocks() {
  if (!GS.transforms || !GS.transforms.length) return;
  const playerLv = GS.player.level || 1;
  let newlyUnlocked = [];
  GS.transforms.forEach(t => {
    if (!t.unlocked && playerLv >= t.tier) {
      t.unlocked = true;
      newlyUnlocked.push(t);
    }
  });
  newlyUnlocked.forEach(t => {
    addLog('system', `✨ 解锁新變身：${t.name}（${t.rarityName}）`);
  });
}

function initEquipment() {
  GS.equipment = {
    weapon:   { id: 'w1', type: 'weapon',  name: '破旧短劍', rarity: 'white', baseStats: { atk: 5 } },
    armor:    { id: 'a1', type: 'armor',   name: '布甲',     rarity: 'white', baseStats: { def: 3, hpMax: 20 } },
    helmet:   null, necklace: null, cape: null,
    gloves:   null, pants: null, belt: null,
    boots:    null, ring1: null, ring2: null,
  };
  GS.inventory = [
    { id: 'hp1', name: '小型生命藥水', type: 'consumable', itemType: 'consumable', rarity: 'white', icon: ITEM_ICONS.hp1, count: 5, effect: { hp: 50 } },
    { id: 'mp1', name: '小型魔力藥水', type: 'consumable', itemType: 'consumable', rarity: 'white', icon: ITEM_ICONS.mp1, count: 3, effect: { mp: 30 } },
    { id: 'mgem', name: '魔法寶石', type: 'consumable', itemType: 'consumable', rarity: 'blue', icon: ITEM_ICONS.mgem, count: 10, effect: {} },
  ];
}

function initCastles() {
  CASTLES.forEach(c => {
    GS.castleTreasuries[c.id] = 0;
  });
}

// ==================== 精灵图 HTML（单张图 + CSS 动画模式） ====================
// 每个角色使用单张完整角色图，通过 CSS 动画实现待机呼吸、行走弹跳、攻擊冲刺、受击闪白晃动、死亡倒地
// 彻底避免多帧堆叠问题
function buildSpriteHTML(spriteObj, kind, lean) {
  const size = SPRITE_SIZE[kind] || SPRITE_SIZE.hero;
  const s = typeof spriteObj === 'object' && spriteObj ? spriteObj : SPRITE.goblin;
  const color = s.color || '#c0a060';
  const glow = s.glow || '#ffe090';
  const fontSize = Math.floor(Math.min(size.w, size.h) * 0.8);
  // 初始职业/怪物/NPC 不发光，仅品質系统通过CSS class加光
  const baseFilter = 'drop-shadow(0 2px 3px rgba(0,0,0,0.8))';
  const isImg = !!s.useImg;
  const idleSrc = isImg ? s.idle : '';
  const multiFrame = !!s.multiFrame;
  const coverMode = !!s.coverMode;
  const emojiIdle = s.idle || '⚔️';
  const emojiAttack = s.attack || s.idle || '⚔️';
  // lean 模式：AI/怪物/召唤只用 1 张图（idle）+ CSS 动画，大幅减少 DOM
  // 只有玩家/英雄/变身用完整8帧结构
  if (lean && isImg) {
    return `
      <div class="unit-info">
        <div class="unit-hp-bar"><div class="unit-hp-fill" style="width:100%"></div></div>
        <div class="unit-name"></div>
        <div class="unit-level-tag"></div>
      </div>
      <div class="unit-sprite-wrap ${coverMode ? 'sprite-cover-mode' : ''}" style="width:${size.w}px;height:${size.h}px">
        <img class="unit-sprite-img sprite-frame-idle" src="${idleSrc}" style="filter:${baseFilter}" alt="" loading="lazy"/>
        <div class="unit-sprite-tomb" style="display:none">🪦</div>
        <div class="slash-effect"></div>
      </div>
      <div class="unit-shadow"></div>
    `;
  }
  // 完整模式：8帧结构（玩家/英雄/变身）
  const attackSrc = isImg ? (s.attack || s.idle) : '';
  const attack2Src = isImg ? (s.attack2 || s.attack || s.idle) : '';
  const walkSrc = isImg ? (s.walk || s.idle) : '';
  const walk2Src = isImg ? (s.walk2 || s.walk || s.idle) : '';
  const walk3Src = isImg ? (s.walk3 || s.walk || s.idle) : '';
  const walk4Src = isImg ? (s.walk4 || s.walk || s.idle) : '';
  const hitSrc = isImg ? (s.hit || s.idle) : '';
  return `
    <div class="unit-info">
      <div class="unit-hp-bar"><div class="unit-hp-fill" style="width:100%"></div></div>
      ${kind === 'hero' ? '<div class="unit-mp-bar"><div class="unit-mp-fill" style="width:100%"></div></div>' : ''}
      <div class="unit-name"></div>
      <div class="unit-level-tag"></div>
    </div>
    <div class="unit-sprite-wrap ${coverMode ? 'sprite-cover-mode' : ''} ${multiFrame ? 'sprite-multi-frame' : ''}" style="width:${size.w}px;height:${size.h}px">
      ${isImg ? `
        <img class="unit-sprite-img sprite-frame-idle" src="${idleSrc}" style="filter:${baseFilter}" alt=""/>
        <img class="unit-sprite-img sprite-frame-walk sprite-frame-walk-1" src="${walkSrc}" style="filter:${baseFilter};display:none" alt=""/>
        <img class="unit-sprite-img sprite-frame-walk sprite-frame-walk-2" src="${walk2Src}" style="filter:${baseFilter};display:none" alt=""/>
        <img class="unit-sprite-img sprite-frame-walk sprite-frame-walk-3" src="${walk3Src}" style="filter:${baseFilter};display:none" alt=""/>
        <img class="unit-sprite-img sprite-frame-walk sprite-frame-walk-4" src="${walk4Src}" style="filter:${baseFilter};display:none" alt=""/>
        <img class="unit-sprite-img sprite-frame-attack sprite-frame-attack-1" src="${attackSrc}" style="filter:${baseFilter};display:none" alt=""/>
        <img class="unit-sprite-img sprite-frame-attack sprite-frame-attack-2" src="${attack2Src}" style="filter:${baseFilter};display:none" alt=""/>
        <img class="unit-sprite-img sprite-frame-hit" src="${hitSrc}" style="filter:${baseFilter};display:none" alt=""/>
        <div class="unit-sprite-tomb">🪦</div>
        <div class="slash-effect"></div>
        <div class="dust-particles"></div>
      ` : `
        <div class="unit-sprite-emoji" data-sprite-idle="${emojiIdle}" data-sprite-attack="${emojiAttack}" data-sprite-dead="🪦" style="color:${color};font-size:${fontSize}px;filter:${baseFilter}">${emojiIdle}</div>
      `}
    </div>
    <div class="transform-aura" style="visibility:hidden;opacity:0;pointer-events:none;position:absolute;top:0;left:0;width:100%;height:100%;z-index:1;overflow:visible">
      <img class="effect-img effect-magic-circle" src="" alt=""/>
      <div class="aura-lightning l1"></div><div class="aura-lightning l2"></div><div class="aura-lightning l3"></div>
      <img class="effect-img effect-burst effect-burst-main" src="" alt=""/>
      <img class="effect-img effect-burst effect-burst-2" src="" alt=""/>
      <div class="aura-wave"></div>
      <div class="aura-pulse"></div>
      <div class="aura-particles"></div>
    </div>
    <div class="unit-shadow"></div>
  `;
}

// 单张图模式：无需帧切换，动画全部由 CSS 类驱动
function setSpriteFrame(spriteEl, frameIdx, frameCount) {
  // 空函数：保留接口兼容，但不再做帧切换
  // 所有动画通过 .world-unit 的 idle/walking/attacking/hit/dead 类由 CSS 驱动
}

const SPRITE_SIZE = { hero: { w: 64, h: 80 }, enemy: { w: 50, h: 56 }, summon: { w: 46, h: 52 } };

// 初始化单位动画状态（8帧多帧模式：walk 4帧循环，attack 2帧序列，idle单帧呼吸，hit单帧）
function initUnitAnimState(uid) {
  unitAnimState.set(uid, {
    breathPhase: Math.random() * Math.PI * 2,
    animFrame: 0,        // 当前帧索引
    animTimer: 0,        // 当前帧剩余时间
    lastState: 'idle',   // 上一状态，用于状态切换时重置帧
  });
}

// 8帧动画每帧时长(ms)：walk每帧150ms，attack1=150/attack2=200，hit=200
const ANIM_FRAME_DURATIONS = {
  walk: [150, 150, 150, 150],  // 共600ms循环
  attack: [150, 200],          // 共350ms（最后一帧后回到之前状态）
  hit: [200],
};

// 切換精靈姿態：idle / walk / attacking / hit / dead 多種狀態
// 8帧模式下，帧由 unitAnimState.animFrame 驱动（gameLoop每帧调用updateAnimFrames）
function applyUnitAnimFrame(unitEl, uid, state) {
  const anim = unitAnimState.get(uid);
  // 真實圖片精靈：切換顯示的img幀
  const imgIdle = unitEl.querySelector('.sprite-frame-idle');
  if (imgIdle) {
    const walkFrames = unitEl.querySelectorAll('.sprite-frame-walk');
    const attackFrames = unitEl.querySelectorAll('.sprite-frame-attack');
    const imgHit = unitEl.querySelector('.sprite-frame-hit');
    const tomb = unitEl.querySelector('.unit-sprite-tomb');
    const isDead = state === 'dead';
    const isAttack = state === 'attacking' || state === 'casting';
    const isWalk = state === 'walking' || state === 'chasing' || state === 'wandering';
    const isHit = state === 'hit';

    // 隐藏所有帧
    imgIdle.style.display = 'none';
    walkFrames.forEach(img => img.style.display = 'none');
    attackFrames.forEach(img => img.style.display = 'none');
    if (imgHit) imgHit.style.display = 'none';
    if (tomb) tomb.style.display = 'none';

    // 优先顺序：dead > hit > attack > walk > idle
    if (isDead) {
      if (tomb) tomb.style.display = 'flex';
    } else if (isHit) {
      if (imgHit) imgHit.style.display = 'block';
    } else if (isAttack) {
      const idx = anim ? Math.min(anim.animFrame, attackFrames.length - 1) : 0;
      if (attackFrames[idx]) attackFrames[idx].style.display = 'block';
      else if (attackFrames[0]) attackFrames[0].style.display = 'block';
    } else if (isWalk && walkFrames.length > 0) {
      const idx = anim ? (anim.animFrame % walkFrames.length) : 0;
      if (walkFrames[idx]) walkFrames[idx].style.display = 'block';
      else walkFrames[0].style.display = 'block';
    } else {
      imgIdle.style.display = 'block';
    }
    return;
  }
  // emoji 精靈：改文字
  const emojiEl = unitEl.querySelector('.unit-sprite-emoji');
  if (!emojiEl) return;
  let emoji;
  if (state === 'dead') emoji = emojiEl.dataset.spriteDead || '🪦';
  else if (state === 'attacking' || state === 'casting') emoji = emojiEl.dataset.spriteAttack || emojiEl.dataset.spriteIdle;
  else emoji = emojiEl.dataset.spriteIdle || '⚔️';
  if (emojiEl.textContent !== emoji) emojiEl.textContent = emoji;
}

// ==================== 职业選擇 ====================
// ==================== 角色創建系統 ====================
const CHAR_CREATE_STATS = {
  str: { name: '力量', base: 10 },
  dex: { name: '敏捷', base: 10 },
  con: { name: '體質', base: 10 },
  int: { name: '智力', base: 10 },
  wis: { name: '智慧', base: 10 },
  cha: { name: '魅力', base: 10 },
};
const CHAR_CREATE_TOTAL_POINTS = 30;
const CHAR_MIN_STAT = 5;
const CHAR_MAX_STAT = 20;

let charCreateState = {
  stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  classId: 'warrior',
  name: '',
};

// 職業對應的屬性傾向（用於重置基礎值，不一定全部用完30點）
const CLASS_STAT_PREFS = {
  warrior: { str: 15, con: 13, dex: 11, int: 8,  wis: 8,  cha: 5  },
  mage:    { int: 15, wis: 13, con: 10, str: 7,  dex: 8,  cha: 7  },
  archer:  { dex: 15, str: 11, con: 10, int: 8,  wis: 8,  cha: 8  },
  rogue:   { dex: 15, cha: 12, str: 10, con: 9,  int: 9,  wis: 5  },
  paladin: { str: 13, con: 14, cha: 11, wis: 8,  int: 7,  dex: 7  },
  warlock: { int: 13, wis: 14, cha: 10, con: 9,  str: 6,  dex: 8  },
};

function showCharCreate() {
  // 重置為默認值（戰士的屬性傾向）
  charCreateState = {
    stats: { ...CLASS_STAT_PREFS.warrior },
    classId: 'warrior',
    name: '',
  };
  const screen = $('char-create-screen');
  if (screen) screen.classList.remove('hidden');
  initCharCreateUI();
}

function initCharCreateUI() {
  // 職業列表
  const classList = $('cc-class-list');
  if (classList) {
    classList.innerHTML = '';
    // 6 個職業按順序
    const classOrder = ['warrior', 'mage', 'archer', 'rogue', 'paladin', 'warlock'];
    const classIcons = { warrior: '⚔️', mage: '🔮', archer: '🏹', rogue: '🗡️', paladin: '🛡️', warlock: '💀' };
    classOrder.forEach(cid => {
      const cls = CLASSES[cid];
      if (!cls) return;
      const sp = SPRITE[cid] || SPRITE.warrior;
      const spriteHTML = sp.useImg && sp.idle
        ? `<img src="${sp.idle}" style="width:100%;height:100%;object-fit:contain;display:block;filter:drop-shadow(0 0 4px ${sp.glow || '#ffd870'})"/>`
        : `<span style="font-size:28px">${classIcons[cid] || '⚔️'}</span>`;
      const item = document.createElement('div');
      item.className = 'cc-class-item' + (cid === charCreateState.classId ? ' active' : '');
      item.dataset.classId = cid;
      item.innerHTML = `
        <div class="cc-class-icon">${spriteHTML}</div>
        <div class="cc-class-info">
          <div class="cc-class-item-name">${cls.name}</div>
          <div class="cc-class-item-desc">${cls.desc || ''}</div>
        </div>
      `;
      item.addEventListener('click', () => {
        charCreateState.classId = cid;
        // 切換職業時重置為該職業的屬性傾向
        charCreateState.stats = { ...CLASS_STAT_PREFS[cid] };
        classList.querySelectorAll('.cc-class-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const classNameEl = $('cc-current-class');
        if (classNameEl) classNameEl.textContent = cls.name;
        updateCCStatsDisplay();
        updateCCSprite();
      });
      classList.appendChild(item);
    });
  }
  // 屬性加減按鈕
  document.querySelectorAll('.cc-stat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.cc-stat-row');
      if (!row) return;
      const stat = row.dataset.stat;
      const action = btn.dataset.action;
      const current = charCreateState.stats[stat];
      const remaining = getCCRemainingPoints();
      if (action === 'plus') {
        if (remaining <= 0) return;
        if (current >= CHAR_MAX_STAT) return;
        charCreateState.stats[stat] = current + 1;
      } else {
        if (current <= CHAR_MIN_STAT) return;
        charCreateState.stats[stat] = current - 1;
      }
      updateCCStatsDisplay();
    });
  });
  // 隨機分配
  const diceBtn = $('cc-dice-btn');
  if (diceBtn) diceBtn.addEventListener('click', randomizeCCStats);
  // 確認按鈕
  const confirmBtn = $('cc-confirm-btn');
  if (confirmBtn) confirmBtn.addEventListener('click', confirmCharCreate);
  // 名稱輸入
  const nameInput = $('cc-name-input');
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      charCreateState.name = nameInput.value.trim();
    });
  }
  updateCCStatsDisplay();
  updateCCSprite();
  const classNameEl = $('cc-current-class');
  if (classNameEl) classNameEl.textContent = CLASSES[charCreateState.classId].name;
}

function getCCRemainingPoints() {
  let used = 0;
  for (const s in charCreateState.stats) {
    used += charCreateState.stats[s] - CHAR_CREATE_STATS[s].base;
  }
  return CHAR_CREATE_TOTAL_POINTS - used;
}

function updateCCStatsDisplay() {
  for (const stat in charCreateState.stats) {
    const valEl = $('cc-stat-' + stat);
    if (valEl) valEl.textContent = charCreateState.stats[stat];
  }
  const remainEl = $('cc-points-remain');
  if (remainEl) remainEl.textContent = getCCRemainingPoints();
}

function updateCCSprite() {
  const spriteEl = $('cc-character-sprite');
  if (!spriteEl) return;
  const cls = CLASSES[charCreateState.classId];
  const spriteKey = charCreateState.classId;
  const sp = SPRITE[spriteKey] || SPRITE.warrior;
  const glow = sp.glow || '#ffd870';
  const filter = `drop-shadow(0 0 12px ${glow}) drop-shadow(0 4px 6px rgba(0,0,0,0.8))`;
  if (sp.useImg && sp.idle) {
    spriteEl.innerHTML = `<img src="${sp.idle}" style="width:100%;height:100%;object-fit:contain;display:block;filter:${filter}" alt="${cls.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/><div class="cc-sprite-fallback" style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:48px">⚔️</div>`;
  } else {
    const icon = { warrior: '⚔️', mage: '🔮', archer: '🏹', rogue: '🗡️', paladin: '🛡️', warlock: '💀' }[spriteKey] || '⚔️';
    spriteEl.innerHTML = `<div style="font-size:56px;filter:${filter}">${icon}</div>`;
  }
  const nameEl = $('cc-current-class');
  if (nameEl) nameEl.textContent = cls.name;
}

function randomizeCCStats() {
  // 先重置為基礎值
  for (const s in charCreateState.stats) {
    charCreateState.stats[s] = CHAR_CREATE_STATS[s].base;
  }
  // 隨機分配剩餘點數
  let remaining = CHAR_CREATE_TOTAL_POINTS;
  const statKeys = Object.keys(charCreateState.stats);
  while (remaining > 0) {
    const key = statKeys[Math.floor(Math.random() * statKeys.length)];
    if (charCreateState.stats[key] < CHAR_MAX_STAT) {
      charCreateState.stats[key]++;
      remaining--;
    }
  }
  updateCCStatsDisplay();
}

function confirmCharCreate() {
  const name = charCreateState.name.trim();
  if (!name) {
    alert('請輸入角色名稱');
    return;
  }
  if (name.length < 2 || name.length > 10) {
    alert('角色名稱長度需為 2-10 個字');
    return;
  }
  if (getCCRemainingPoints() > 0) {
    if (!confirm(`還有 ${getCCRemainingPoints()} 點屬性點未分配，確定要開始遊戲嗎？`)) return;
  }
  // 設置玩家名稱與職業
  GS.player.name = name;
  GS.player.classId = charCreateState.classId;
  const cls = CLASSES[charCreateState.classId];
  console.log('[confirmCharCreate] 选择职业:', charCreateState.classId, '| name:', name, '| 类对象:', cls ? cls.name : 'NULL');
  console.log('[confirmCharCreate] 2. el.topName存在:', !!el.topName, '| el.classBadge存在:', !!el.classBadge);
  // 根據屬性調整初始屬性
  const s = charCreateState.stats;
  const strBonus = (s.str - 10) * 1.5;
  const conBonus = (s.con - 10) * 8;
  const dexBonus = (s.dex - 10) * 0.5;
  const intBonus = (s.int - 10) * 0.5;
  GS.player.atk = Math.floor(Number(cls.baseStats.atk) + strBonus);
  GS.player.def = Math.floor(Number(cls.baseStats.def) + dexBonus * 0.5);
  GS.player.hpMax = Math.floor(Number(cls.baseStats.hpMax) + conBonus);
  GS.player.hp = GS.player.hpMax;
  GS.player.crit = Math.floor(Number(cls.baseStats.crit || 5) + dexBonus * 0.3);
  // 保存六維屬性
  GS.player.baseStats6 = { ...charCreateState.stats };
  // 關閉創建界面
  const screen = $('char-create-screen');
  if (screen) screen.classList.add('hidden');
  // 更新介面
  if (el.topName) el.topName.textContent = name;
  if (el.classBadge) el.classBadge.textContent = cls.name;
  console.log('[confirmCharCreate] 3. 调用updatePlayerSprite');
  updatePlayerSprite();
  console.log('[confirmCharCreate] 4. updatePlayerSprite完成');
  updateTransformVisual();
  updateUI();
  updateSkillBar();
  updateSlotDisplay();
  const topAvatarEl = $('top-avatar');
  if (topAvatarEl) {
    topAvatarEl.innerHTML = spriteEmojiHTML(cls.sprite, 36);
  }
  console.log('[confirmCharCreate] 5. 完成，即将addLog');
  addLog('system', `歡迎來到君主之刃，${name}！`);
  addLog('system', '點擊地面移動，點擊菜單按鈕查看國家/公會/城堡。');
  
  // 初始化音频系统（用户交互后才能启动 AudioContext）
  if (window.AudioSystem) {
    AudioSystem.init();
    AudioSystem.ensureRunning();
    AudioSystem.startMusic(GS.currentMap);
  }
  
  // 全局AI池初始化（遊戲開始後，try-catch防止失敗崩潰）
  setTimeout(() => {
    try {
      initGlobalAIPool();
    } catch(e) {
      console.error('[AI System] AI初始化失敗，已跳過：', e);
      addLog('system', '⚠ AI玩家系統初始化異常，已跳過');
    }
  }, 1000);

  // 如果还没選擇國家，显示國家選擇界面
  if (!GS.nation) {
    showNationSelect();
  }
}

function showNationSelect() {
  let modal = document.getElementById('nation-select-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'nation-select-modal';
    modal.className = 'nation-select-modal';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="nation-select-inner">
      <div class="nation-select-title">選擇你的國家</div>
      <div class="nation-select-subtitle">每個國家都有獨特的歷史與盟友</div>
      <div class="nation-select-grid">
        ${NATIONS.map(n => {
          const dotBg = { kent: 'radial-gradient(circle at 30% 30%,#ff6060,#a01010)', oren: 'radial-gradient(circle at 30% 30%,#60a0ff,#103080)', dion: 'radial-gradient(circle at 30% 30%,#60d060,#106020)', aden: 'radial-gradient(circle at 30% 30%,#ffd060,#a07010)' }[n.id];
          const borderColor = { kent: '#c02020', oren: '#4080ff', dion: '#40c060', aden: '#ffc040' }[n.id];
          return `
          <div class="nation-card" data-nation="${n.id}">
            <div class="nation-card-flag" data-flag="${n.id}" style="width:64px;height:64px;margin:0 auto;border-radius:50%;border:2px solid rgba(240,192,64,0.5);overflow:hidden;box-shadow:0 0 12px rgba(240,192,64,0.3);background:${dotBg};border-color:${borderColor}"></div>
            <div class="nation-card-name">${n.name}</div>
            <div class="nation-card-desc">${n.desc}</div>
          </div>`;
        }).join('')}
      </div>
      <button class="nation-select-skip" id="nation-select-skip">暫不選擇，稍後再加入</button>
    </div>
  `;
  // 動態注入國旗圖片，失敗則保留CSS背景圓點
  modal.querySelectorAll('[data-flag]').forEach(div => {
    const nid = div.dataset.flag;
    const img = new Image();
    img.src = NATION_FLAGS[nid] || NATION_FLAGS.kent;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
    img.onload = () => { div.innerHTML = ''; div.appendChild(img); };
    img.onerror = () => { /* 保留 CSS 背景圓點 */ };
  });
  modal.style.display = 'flex';

  modal.querySelectorAll('.nation-card').forEach(card => {
    card.addEventListener('click', () => {
      const nid = card.dataset.nation;
      const nation = NATIONS.find(n => n.id === nid);
      if (nation) {
        GS.nation = nid;
        addLog('system', `你加入了【${nation.name}】！`);
        modal.style.display = 'none';
        updateUI();
      }
    });
  });
  const skipBtn = modal.querySelector('#nation-select-skip');
  if (skipBtn) skipBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    addLog('system', '你可以在侧边選單「國家」页面中随时選擇加入國家。');
  });
}

function showClassSelect() {
  const grid = $('class-grid');
  grid.innerHTML = '';
  Object.values(CLASSES).forEach(cls => {
    const card = document.createElement('div');
    card.className = 'class-card';
    card.dataset.class = cls.id;
    card.innerHTML = `
      <div class="class-sprite arch-sprite-frame rarity-white" style="width:56px;height:72px">${spriteEmojiHTML(cls.sprite, 60)}</div>
      <div class="class-name">${cls.name}</div>
      <div class="class-desc">${cls.desc}</div>
    `;
    card.addEventListener('click', () => selectClass(cls.id));
    grid.appendChild(card);
  });
  el.classSelectModal.classList.add('open');
}

function selectClass(classId) {
  const cls = CLASSES[classId];
  GS.player.classId = classId;
  GS.player.transformId = null;
  // 应用职业基础屬性
  for (const k in cls.baseStats) {
    if (k === 'hpMax') { GS.player.hpMax = cls.baseStats.hpMax; GS.player.hp = cls.baseStats.hpMax; }
    else if (k in GS.player) GS.player[k] = cls.baseStats[k];
  }
  el.classSelectModal.classList.remove('open');
  updatePlayerSprite();
  updateTransformVisual();
  updateUI();
  updateSkillBar();
  // 顶部头像：用背景图裁剪左上角第一帧
  const topAvatarEl = $('top-avatar');
  if (topAvatarEl) {
    topAvatarEl.innerHTML = spriteEmojiHTML(cls.sprite, 36);
  }
  if (el.classBadge) el.classBadge.textContent = cls.name;
  addLog('system', `選擇了${cls.name}职业！`);
}

// 金/紫變身新精靈圖（帶閃電冒煙效果）
// ==================== 玩家渲染 ====================
function getPlayerSprite() {
  try {
    // 變身狀態：直接從 SPRITE 取變身專屬圖資
    if (GS.player?.transformId) {
      const tf = TRANSFORM_POOL.find(t => t.id === GS.player.transformId);
      if (tf && tf.spriteKey) {
        const spriteKey = tf.spriteKey.replace(/^t_/, '');
        const s = SPRITE[spriteKey];
        if (s) {
          console.log('[getPlayerSprite] 变身:', tf.name, '| sprite:', spriteKey);
          return s;
        }
        // fallback: 舊式 getTransformSprite
        const s2 = getTransformSprite(tf.spriteKey);
        if (s2) return s2;
      }
    }
    // 职业映射：完全走 resolveClassId → SPRITE 显式映射，绝不静默fallback
    const rawClassId = GS.player?.classId;
    const cls = resolveClassId(rawClassId);
    const sp = SPRITE[cls];
    console.log('[getPlayerSprite] SPRITE DEBUG',
                'rawClassId=', rawClassId,
                '| type=', typeof rawClassId,
                '| cls=', cls,
                '| SPRITE keys sample:', Object.keys(SPRITE).slice(0, 10),
                '| SPRITE[cls]存在:', !!sp,
                '| idle:', sp?.idle);
    if (!sp) {
      console.warn('[getPlayerSprite] 未找到职业精灵:', cls, 'classId原始值:', rawClassId, 'fallback到warrior');
      return SPRITE.warrior;
    }
    return sp;
  } catch(e) {
    console.warn('[getPlayerSprite] 异常:', e);
    return SPRITE.warrior;
  }
}

// 調試用：測試5個職業精靈圖是否正確加載
window.__debugClassSprites = function() {
  const classes = ['warrior', 'mage', 'archer', 'rogue', 'paladin'];
  console.log('========== DEBUG: 5職業精靈圖測試 ==========');
  classes.forEach(cls => {
    const sp = SPRITE[cls];
    console.log(`[${cls}] 存在:${!!sp} multiFrame:${sp?.multiFrame} coverMode:${sp?.coverMode}`);
    console.log(`  idle: ${sp?.idle}`);
    console.log(`  walk: ${sp?.walk}`);
    console.log(`  attack: ${sp?.attack}`);
    console.log(`  hit: ${sp?.hit}`);
  });
  // 當前玩家職業
  console.log('當前玩家 classId:', GS.player?.classId, '| 解析後:', resolveClassId(GS.player?.classId));
  const ps = getPlayerSprite();
  console.log('getPlayerSprite 返回:', ps?.idle?.split('/').slice(-2).join('/'), '| walk:', ps?.walk?.split('/').slice(-2).join('/'));
  console.log('============================================');
};

// 測試：強制切換職業並檢查實際img src
window.__debugSwitchAndVerify = function(clsId) {
  console.log(`========== 切換到 ${clsId} 測試 ==========`);
  GS.player.classId = clsId;
  GS.player.transformId = null;
  updatePlayerSprite();
  const unit = worldLayer.querySelector('.world-unit.hero');
  const imgs = unit.querySelectorAll('img.unit-sprite-img');
  console.log(`img 數量: ${imgs.length}`);
  imgs.forEach((img, i) => {
    console.log(`  [${i}] ${img.className}: src=${img.src.split('/').slice(-2).join('/')}`);
  });
  const idleImg = unit.querySelector('.sprite-frame-idle');
  console.log(`idle顯示狀態: display=${getComputedStyle(idleImg).display}`);
  console.log(`idle real src: ${idleImg.src}`);
  console.log('============================================');
};

// 职业ID归一化：数字/字符串/别名 → 标准字符串ID
// 注意：如果传入值无效仍返回 'warrior'，但会打warn日志便于排查
function resolveClassId(id) {
  if (!id && id !== 0) {
    console.warn('[resolveClassId] classId为空，fallback到warrior');
    return 'warrior';
  }
  // 数字ID → 字符串ID（兼容旧存档/服务端下发）
  if (typeof id === 'number') {
    const numMap = { 0: 'warrior', 1: 'mage', 2: 'archer', 3: 'rogue', 4: 'paladin', 5: 'warlock' };
    const mapped = numMap[id];
    if (!mapped) console.warn('[resolveClassId] 未知数字classId:', id);
    return mapped || 'warrior';
  }
  const s = String(id).trim().toLowerCase();
  if (!s) {
    console.warn('[resolveClassId] classId字符串为空，fallback到warrior');
    return 'warrior';
  }
  const alias = {
    // 标准ID
    'warrior': 'warrior',
    'mage': 'mage',
    'archer': 'archer',
    'rogue': 'rogue',
    'paladin': 'paladin',
    'warlock': 'warlock',
    // 常见别名
    'assassin': 'rogue',
    'knight': 'paladin',
    'priest': 'paladin',
    'wizard': 'mage',
    'bowman': 'archer',
    'thief': 'rogue',
    'swordman': 'warrior',
    'swordsman': 'warrior',
  };
  const mapped = alias[s];
  if (!mapped) {
    console.warn('[resolveClassId] 未知职业ID:', s, '原始值:', id);
    return 'warrior';
  }
  return mapped;
}

// 根據變身spriteKey取得對應SPRITE物件
function getTransformSprite(spriteKey) {
  // 根據 spriteKey 直接從 SPRITE 取（新架構：變身 spriteKey 與 SPRITE key 一一對應）
  const s = SPRITE[spriteKey];
  if (s) return s;
  // 向後兼容：去掉 t_ 前綴再試一次
  const key2 = spriteKey.replace(/^t_/, '');
  return SPRITE[key2] || null;
}

function createPlayerSprite() {
  const src = getPlayerSprite();
  const elUnit = document.createElement('div');
  elUnit.className = 'world-unit hero idle';
  elUnit.dataset.id = 'player';
  elUnit.innerHTML = buildSpriteHTML(src, 'hero');
  // 填充名字和等級：國旗在名稱左側
  const info = elUnit.querySelector('.unit-info');
  const nameEl = info.querySelector('.unit-name');
  const nation = NATIONS.find(nn => nn.id === GS.nation);
  const flagImg = nation ? safeFlagImg(nation.id, 14) : '';
  nameEl.innerHTML = `${flagImg}${GS.player.name}`;
  info.querySelector('.unit-level-tag').style.display = 'none';
  // 國家 + 公会标识
  const tag = document.createElement('div');
  tag.className = 'unit-guild-tag';
  tag.innerHTML = getUnitGuildBadgeHTML(GS.nation, GS.guild?.name || null);
  elUnit.insertBefore(tag, elUnit.firstChild);
  worldLayer.appendChild(elUnit);
  positionUnit(elUnit, GS.player.x, GS.player.y, 'hero');
  initUnitAnimState('player');
  updateTransformVisual();
  updateLevelGlow();
}

// 生成國家+公会标识HTML
function getUnitGuildBadgeHTML(nationId, guildName, guildRole) {
  const n = NATIONS.find(nn => nn.id === nationId);
  const flag = n ? n.flag : '';
  const guild = guildName ? guildName.substring(0, 2) : '';
  const roleBadge = guildRole && guildRole !== '成員' ? guildRole.substring(0, 1) : '';
  let html = '';
  if (flag) {
    html += `<span class="badge-flag" title="${n ? n.name : ''}">${flag}</span>`;
  }
  if (guild) {
    html += `<span class="badge-guild" title="${guildName}${roleBadge ? '·' + guildRole : ''}">${guild}${roleBadge ? '<span class="badge-role">' + roleBadge + '</span>' : ''}</span>`;
  }
  return html;
}

function updatePlayerBadge() {
  // 玩家頭頂不顯示國家/公會標籤；國旗已整合在名字旁
  const unit = worldLayer.querySelector('.world-unit.hero');
  if (!unit) return;
  const tag = unit.querySelector('.unit-guild-tag');
  if (tag) tag.remove();
}

function updatePlayerSprite() {
  const spriteObj = getPlayerSprite();
  const unit = worldLayer.querySelector('.world-unit.hero');
  if (!unit || !spriteObj) return;
  const s = typeof spriteObj === 'object' && spriteObj ? spriteObj : SPRITE.warrior;
  // debug：打印当前职业与实际加载的图资
  console.log('[updatePlayerSprite] classId:', GS.player.classId,
              '| typeof:', typeof GS.player.classId,
              '| resolve:', resolveClassId(GS.player.classId),
              '| idle:', s.idle?.split('/').slice(-2).join('/'),
              '| walk:', s.walk?.split('/').slice(-2).join('/'),
              '| attack:', s.attack?.split('/').slice(-2).join('/'));
  
  if (s.useImg && s.idle) {
    // 圖片精靈模式：更新img的src
    const spriteWrap = unit.querySelector('.unit-sprite-wrap');
    const multiFrame = !!s.multiFrame;
    const coverMode = !!s.coverMode;
    if (spriteWrap) {
      spriteWrap.classList.toggle('sprite-multi-frame', multiFrame);
      spriteWrap.classList.toggle('sprite-cover-mode', coverMode);
    }
    // 检查是否已有8帧结构（通过walk2判断）
    const has8Frames = unit.querySelector('.sprite-frame-walk-2');
    if (spriteWrap && !has8Frames) {
      // 重新建立精靈容器為8帧圖片模式（保留光環 DOM，避免變身位移）
      const baseFilter = 'drop-shadow(0 2px 3px rgba(0,0,0,0.8))';
      const auraHTML = `
        <div class="transform-aura" style="visibility:hidden;opacity:0;pointer-events:none;position:absolute;top:0;left:0;width:100%;height:100%;z-index:1;overflow:visible">
          <img class="effect-img effect-magic-circle" src="" alt=""/>
          <div class="aura-lightning l1"></div><div class="aura-lightning l2"></div><div class="aura-lightning l3"></div>
          <img class="effect-img effect-burst effect-burst-main" src="" alt=""/>
          <img class="effect-img effect-burst effect-burst-2" src="" alt=""/>
          <div class="aura-wave"></div>
          <div class="aura-pulse"></div>
          <div class="aura-particles"></div>
        </div>`;
      spriteWrap.innerHTML = auraHTML + `
        <img class="unit-sprite-img sprite-frame-idle" src="${s.idle}" style="filter:${baseFilter}" alt=""/>
        <img class="unit-sprite-img sprite-frame-walk sprite-frame-walk-1" src="${s.walk || s.idle}" style="filter:${baseFilter};display:none" alt=""/>
        <img class="unit-sprite-img sprite-frame-walk sprite-frame-walk-2" src="${s.walk2 || s.walk || s.idle}" style="filter:${baseFilter};display:none" alt=""/>
        <img class="unit-sprite-img sprite-frame-walk sprite-frame-walk-3" src="${s.walk3 || s.walk || s.idle}" style="filter:${baseFilter};display:none" alt=""/>
        <img class="unit-sprite-img sprite-frame-walk sprite-frame-walk-4" src="${s.walk4 || s.walk || s.idle}" style="filter:${baseFilter};display:none" alt=""/>
        <img class="unit-sprite-img sprite-frame-attack sprite-frame-attack-1" src="${s.attack || s.idle}" style="filter:${baseFilter};display:none" alt=""/>
        <img class="unit-sprite-img sprite-frame-attack sprite-frame-attack-2" src="${s.attack2 || s.attack || s.idle}" style="filter:${baseFilter};display:none" alt=""/>
        <img class="unit-sprite-img sprite-frame-hit" src="${s.hit || s.idle}" style="filter:${baseFilter};display:none" alt=""/>
        <div class="unit-sprite-tomb">🪦</div>
        <div class="slash-effect"></div>
        <div class="dust-particles"></div>
      `;
    } else if (has8Frames) {
      // 已有8帧结构，更新各帧src
      const imgIdle = unit.querySelector('.sprite-frame-idle');
      const walkImgs = unit.querySelectorAll('.sprite-frame-walk');
      const attackImgs = unit.querySelectorAll('.sprite-frame-attack');
      const imgHit = unit.querySelector('.sprite-frame-hit');
      if (imgIdle) imgIdle.src = s.idle;
      const walkSrcs = [s.walk, s.walk2, s.walk3, s.walk4];
      walkImgs.forEach((img, i) => { img.src = walkSrcs[i] || s.walk || s.idle; });
      const atkSrcs = [s.attack, s.attack2];
      attackImgs.forEach((img, i) => { img.src = atkSrcs[i] || s.attack || s.idle; });
      if (imgHit) imgHit.src = s.hit || s.idle;
    }
    const emojiEl = unit.querySelector('.unit-sprite-emoji');
    if (emojiEl) emojiEl.remove();
  } else {
    // emoji 模式
    const emojiEl = unit.querySelector('.unit-sprite-emoji');
    if (emojiEl) {
      emojiEl.textContent = s.idle || '⚔️';
      emojiEl.dataset.spriteIdle = s.idle || '⚔️';
      emojiEl.dataset.spriteAttack = s.attack || s.idle || '⚔️';
      emojiEl.dataset.spriteDead = '🪦';
      emojiEl.style.color = s.color || '#c0a060';
      emojiEl.style.filter = `drop-shadow(0 0 4px ${s.glow || '#ffe090'}) drop-shadow(0 2px 3px rgba(0,0,0,0.8))`;
    }
  }
  const topAvatarEl = el.topAvatar;
  if (topAvatarEl) topAvatarEl.innerHTML = spriteEmojiHTML(spriteObj, 36);
  // 注意：變身只替換圖片 src，不調用 positionUnit 以避免位移
  updateTransformVisual();
}

// 更新變身视觉效果（僅切換 CSS class，不增刪 DOM）
function updateTransformVisual() {
  const unit = worldLayer.querySelector('.world-unit.hero');
  if (!unit) return;
  // 清除所有變身相关 class
  [
    'transform-str','transform-vit','transform-agi','transform-int','transform-luk',
    'transform-rarity-white','transform-rarity-green','transform-rarity-blue',
    'transform-rarity-red','transform-rarity-purple','transform-rarity-gold',
  ].forEach(c => unit.classList.remove(c));

  const tf = TRANSFORM_POOL.find(t => t.id === GS.player.transformId);
  const aura = unit.querySelector('.transform-aura');
  if (tf) {
    // 加品質光環 class
    unit.classList.add('transform-rarity-' + tf.rarity);
    // 光環用 visibility 切換，避免 display 變化導致佈局重排
    if (aura) {
      aura.style.visibility = 'visible';
      aura.style.opacity = '0.9';
      // 同步品級 class 到 aura 上便於 CSS 控制
      aura.className = 'transform-aura transform-rarity-' + tf.rarity;
      // 特效圖片 src 切換（閃電光環 + 魔法陣）
      const lightningSrc = tf.rarity === 'gold' ? 'https://aka.doubaocdn.com/s/Bm7QnJD8GM' : (tf.rarity === 'purple' ? 'https://aka.doubaocdn.com/s/38AbJxx35a' : '');
      aura.querySelectorAll('.effect-burst').forEach(img => { img.src = lightningSrc; });
      aura.querySelectorAll('.effect-magic-circle').forEach(img => { img.src = 'https://aka.doubaocdn.com/s/JnjUPjCz1B'; });
      // 啟動上升粒子生成器
      startAuraParticles(tf.rarity);
    }
    // 神話變身時給場景加金光閃爍
    if (tf.rarity === 'gold' && el.sceneBg) {
      el.scene.classList.add('gold-mythic-flash');
    } else if (el.scene) {
      el.scene.classList.remove('gold-mythic-flash');
    }
  } else {
    // 沒變身，隱藏光環（visibility:hidden + opacity:0，完全不影響文檔流）
    if (aura) {
      aura.style.visibility = 'hidden';
      aura.style.opacity = '0';
      aura.className = 'transform-aura';
      aura.querySelectorAll('.effect-burst, .effect-magic-circle').forEach(img => { img.src = ''; });
    }
    if (el.scene) el.scene.classList.remove('gold-mythic-flash');
    stopAuraParticles();
  }

  // 攻城战场景也更新（如果有玩家单位）——同樣只切 class
  if (el.siegeWorldLayer) {
    const siegeUnit = el.siegeWorldLayer.querySelector('.world-unit.hero');
    if (siegeUnit) {
      ['transform-rarity-white','transform-rarity-green','transform-rarity-blue',
       'transform-rarity-red','transform-rarity-purple','transform-rarity-gold',
      ].forEach(c => siegeUnit.classList.remove(c));
      const siegeAura = siegeUnit.querySelector('.transform-aura');
      if (tf && tf.unlocked) {
        siegeUnit.classList.add('transform-rarity-' + tf.rarity);
        if (siegeAura) {
          siegeAura.style.visibility = 'visible';
          siegeAura.style.opacity = '0.9';
          siegeAura.className = 'transform-aura transform-rarity-' + tf.rarity;
          const lightningSrc = tf.rarity === 'gold' ? 'https://aka.doubaocdn.com/s/Bm7QnJD8GM' : (tf.rarity === 'purple' ? 'https://aka.doubaocdn.com/s/38AbJxx35a' : '');
          siegeAura.querySelectorAll('.effect-burst').forEach(img => { img.src = lightningSrc; });
          siegeAura.querySelectorAll('.effect-magic-circle').forEach(img => { img.src = 'https://aka.doubaocdn.com/s/JnjUPjCz1B'; });
        }
      } else {
        if (siegeAura) {
          siegeAura.style.visibility = 'hidden';
          siegeAura.style.opacity = '0';
          siegeAura.className = 'transform-aura';
          siegeAura.querySelectorAll('.effect-burst, .effect-magic-circle').forEach(img => { img.src = ''; });
        }
      }
    }
  }

  // 變身前後強制重新定位，確保位置完全一致
  if (GS.player) {
    positionUnit(unit, GS.player.x, GS.player.y, 'hero');
  }
  // console.log('[Transform] 變身狀態:', tf ? tf.id : '無', '單位位置:', unit.getBoundingClientRect());
}

// 變身上升粒子生成器
let auraParticleTimer = null;
function startAuraParticles(rarity) {
  stopAuraParticles();
  const unit = worldLayer.querySelector('.world-unit.hero');
  if (!unit) return;
  const container = unit.querySelector('.aura-particles');
  if (!container) return;
  const interval = rarity === 'purple' ? 220 : 350;
  auraParticleTimer = setInterval(() => {
    if (!container.isConnected) { stopAuraParticles(); return; }
    const p = document.createElement('div');
    p.className = 'aura-particle';
    const left = 20 + Math.random() * 60;
    const size = 2 + Math.random() * 4;
    const delay = Math.random() * 0.5;
    p.style.left = left + '%';
    p.style.bottom = '15%';
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.animationDelay = delay + 's';
    container.appendChild(p);
    setTimeout(() => { if (p.parentNode) p.remove(); }, rarity === 'purple' ? 2300 : 3000);
  }, interval);
}
function stopAuraParticles() {
  if (auraParticleTimer) {
    clearInterval(auraParticleTimer);
    auraParticleTimer = null;
  }
}

// 根据等級設定精灵图发光效果（8档）
function updateLevelGlow() {
  const unit = worldLayer.querySelector('.world-unit.hero');
  if (!unit) return;
  const lv = GS.player.level;
  // 清除所有发光等級 class
  unit.classList.remove('level-glow', 'lv11', 'lv21', 'lv31', 'lv41', 'lv51', 'lv71', 'lv91');
  if (lv >= 11) unit.classList.add('level-glow');
  if (lv >= 11 && lv < 21) unit.classList.add('lv11');
  else if (lv >= 21 && lv < 31) unit.classList.add('lv21');
  else if (lv >= 31 && lv < 41) unit.classList.add('lv31');
  else if (lv >= 41 && lv < 51) unit.classList.add('lv41');
  else if (lv >= 51 && lv < 71) unit.classList.add('lv51');
  else if (lv >= 71 && lv < 91) unit.classList.add('lv71');
  else if (lv >= 91) unit.classList.add('lv91');
  // 更新AI玩家发光
  if (GS.aiPlayers) {
    GS.aiPlayers.forEach(ai => {
      if (!ai.el) return;
      ai.el.classList.remove('level-glow', 'lv11', 'lv21', 'lv31', 'lv41', 'lv51', 'lv71', 'lv91');
      if (ai.level >= 11) ai.el.classList.add('level-glow');
      const al = ai.level;
      if (al >= 11 && al < 21) ai.el.classList.add('lv11');
      else if (al >= 21 && al < 31) ai.el.classList.add('lv21');
      else if (al >= 31 && al < 41) ai.el.classList.add('lv31');
      else if (al >= 41 && al < 51) ai.el.classList.add('lv41');
      else if (al >= 51 && al < 71) ai.el.classList.add('lv51');
      else if (al >= 71 && al < 91) ai.el.classList.add('lv71');
      else if (al >= 91) ai.el.classList.add('lv91');
    });
  }
}

function positionUnit(el, x, y, kind) {
  const size = SPRITE_SIZE[kind] || SPRITE_SIZE.hero;
  // 脚底对齐：精灵图底部 = 地面 y
  el.style.left = (x - size.w / 2) + 'px';
  el.style.top = (y - size.h) + 'px';
  // 視口剔除：屏幕外單位暫停CSS動畫，節省GPU
  // worldW/worldH 是scene的client寬高（即視口大小）
  const margin = 100; // 邊界緩衝，避免邊緣閃爍
  const zoom = CAMERA.zoom || 1;
  const sx = (x - CAMERA.x) * zoom;
  const sy = (y - CAMERA.y) * zoom;
  const vw = worldW || 800;
  const vh = worldH || 600;
  const offscreen = sx < -margin || sx > vw + margin || sy < -margin || sy > vh + margin;
  if (offscreen !== el._offscreen) {
    el.classList.toggle('offscreen', offscreen);
    el._offscreen = offscreen;
  }
}

function renderPlayer() {
  const p = GS.player;
  const unit = worldLayer.querySelector('.world-unit.hero');
  if (!unit) return;
  const hpPct = Math.max(0, (p.hp / getTotalHpMax()) * 100);
  const hpFill = unit.querySelector('.unit-hp-fill');
  if (hpFill) hpFill.style.width = hpPct + '%';
  // MP 條更新
  const mpPct = Math.max(0, (p.mp / getTotalMpMax()) * 100);
  const mpFill = unit.querySelector('.unit-mp-fill');
  if (mpFill) mpFill.style.width = mpPct + '%';
  // 更新等級标签
  const lvTag = unit.querySelector('.unit-level-tag');
  if (lvTag) lvTag.textContent = 'Lv.' + p.level;
  // 更新名字旁國旗（加入國家後刷新）
  updatePlayerNameFlag();
  positionUnit(unit, p.x, p.y, 'hero');
  unit.classList.toggle('face-left', p.facing === 'left');
  unit.classList.remove('idle','walking','attacking','casting','hit','dead');
  if (p.hitTimer > 0) unit.classList.add('hit');
  else unit.classList.add(p.state);
  // 应用帧动画
  applyUnitAnimFrame(unit, 'player', p.state);
}

// 更新玩家名字旁國旗
function updatePlayerNameFlag() {
  const unit = worldLayer.querySelector('.world-unit.hero');
  if (!unit) return;
  const nameEl = unit.querySelector('.unit-name');
  if (!nameEl) return;
  const nation = NATIONS.find(nn => nn.id === GS.nation);
  const flagImg = nation ? safeFlagImg(nation.id, 13) : '';
  nameEl.innerHTML = `${flagImg}<span style="vertical-align:middle">${GS.player.name}</span>`;
  nameEl.style.display = 'flex';
  nameEl.style.alignItems = 'center';
  nameEl.style.justifyContent = 'center';
  nameEl.style.gap = '2px';
}

// ==================== 地圖系统 ====================
function loadMap(mapId) {
  const allMaps = getAllMaps();
  const map = allMaps[mapId];
  if (!map) return;

  // 切出城堡地圖时清理攻城战状态和元素
  const curMap = allMaps[GS.currentMap];
  if (curMap?.type === 'castle_siege' && map.type !== 'castle_siege') {
    cleanupCastleSiege();
  }

  GS.currentMap = mapId;

  // 切换背景音乐
  if (window.AudioSystem) AudioSystem.changeMapMusic(mapId);

  // 确保攻城战场景隐藏（旧系统遗留清理）
  if (el.siegeScene) el.siegeScene.style.display = 'none';
  if (el.scene) el.scene.style.visibility = 'visible';

  sceneBg.style.backgroundImage = `url(${map.bg})`;
  sceneBg.style.backgroundRepeat = 'no-repeat';
  el.locationName.textContent = map.name;
  if (el.minimapTitle) el.minimapTitle.textContent = map.name;

  // 清空AI玩家DOM（彻底清除旧地图AI，避免残留死图）
  GS.aiPlayers.forEach(ai => { if (ai.el) { ai.el.remove(); ai.el = null; } });
  GS.aiPlayers = [];
  GS.targetAiUid = null;
  // 双重保险：直接清除DOM中所有AI玩家元素
  if (worldLayer) {
    worldLayer.querySelectorAll('.world-unit.ai-player').forEach(el => el.remove());
  }

  // 清空怪物
  GS.monsters.forEach(m => {
    const elDiv = worldLayer.querySelector(`[data-id="${m.uid}"]`);
    if (elDiv) elDiv.remove();
  });
  GS.monsters = [];
  GS.targetMonsterUid = null;
  GS.targetAiUid = null;

  // 清空召喚
  document.querySelectorAll('.world-unit.summon').forEach(el => el.remove());
  summonedDemon = null;

  // NPC
  renderNPCs(map);

  // 戰鬥地圖生成怪物 + AI 玩家
  if (map.type === 'battle') {
    console.log('[loadMap] 開始生成怪物...');
    const t0 = performance.now();
    spawnMonsters();
    console.log(`[loadMap] 怪物生成完成，耗時 ${(performance.now() - t0).toFixed(0)}ms，共 ${GS.monsters.length} 隻`);
    const t1 = performance.now();
    spawnAIPlayers();
    console.log(`[loadMap] AI生成完成，耗時 ${(performance.now() - t1).toFixed(0)}ms，共 ${GS.aiPlayers.length} 個`);
  }

  // 城堡地圖：根据是否宣戰生成攻城战元素
  if (map.type === 'castle_siege') {
    const castleId = map.castle;
    const castle = CASTLES.find(c => c.id === castleId);
    if (castle) {
      if (GS.siegeWar && GS.siegeWar.castleId === castleId && GS.siegeWar.status === 'active' && GS.siegeWar.endTime > Date.now()) {
        // 已宣戰：生成攻城战元素（城门、守護塔、守军、权杖）
        startCastleSiegeOnMap(castle);
      } else {
        // 未宣戰：只能参观，显示提示
        addLog('system', `你來到了${map.name}（城堡區域）。未宣戰狀態下無法攻擊，只能參觀。`);
      }
    }
  }

  // 玩家重置位置（世界中心偏下）
  GS.player.x = CAMERA.worldWidth / 2;
  GS.player.y = CAMERA.worldHeight * 0.7;
  GS.player.targetX = GS.player.x;
  GS.player.targetY = GS.player.y;
  GS.player.state = 'idle';
  GS.autoMode = false;
  el.autoBtn.classList.remove('active');
  el.autoLabel.textContent = '自動';
  renderPlayer();
}

function renderNPCs(map) {
  npcLayer.innerHTML = '';
  if (!map.npcs) return;
  // NPC id 到 SPRITE key 的映射
  const npcSpriteMap = {
    shop: 'npc_shop',
    blacksmith: 'npc_blacksmith',
    warehouse: 'npc_warehouse',
    quest: 'npc_quest',
    premium_shop: 'npc_luxury',
    inn: 'npc_inn',
    bulletin: 'npc_board',
    dungeon_master: 'npc_dungeon',
    main_quest: 'npc_priest',
    arena_master: 'npc_arena',
    witch: 'npc_witch',
    guard: 'npc_guard',
    healer: 'npc_healer',
    wizard: 'npc_wizard',
    postman: 'npc_postman',
  };
  map.npcs.forEach(npc => {
    const elDiv = document.createElement('div');
    elDiv.className = 'npc-unit';
    elDiv.dataset.npcId = npc.id;
    elDiv.style.left = npc.x + 'px';
    elDiv.style.top = (npc.y - 56) + 'px';
    const spriteKey = npcSpriteMap[npc.id] || 'npc_shop';
    const sp = SPRITE[spriteKey] || { idle: npc.icon || '🧙', color: '#c0a060', glow: '#ffe090' };
    const isImg = !!sp.useImg;
    const filter = `drop-shadow(0 0 5px ${sp.glow || '#ffe090'}) drop-shadow(0 2px 3px rgba(0,0,0,0.8))`;
    const spriteHTML = isImg
      ? `<img class="npc-sprite-img" src="${sp.idle}" alt="${npc.name}" style="width:100%;height:100%;object-fit:contain;display:block;filter:${filter}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/><div class="npc-sprite-fallback" style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:32px">${npc.icon || '🧙'}</div>`
      : `<div style="font-size:32px;line-height:48px;filter:${filter};color:${sp.color || '#c0a060'}">${npc.icon || '🧙'}</div>`;
    elDiv.innerHTML = `
      <div class="npc-sprite">
        ${npc.quest ? '<div class="npc-quest-mark">!</div>' : ''}
        ${spriteHTML}
      </div>
      <div class="npc-name">${npc.name}</div>
    `;
    elDiv.addEventListener('click', () => {
      if (npc.id === 'shop') openSidePage('shop');
      else if (npc.id === 'blacksmith') {
        const hasWeapon = GS.equipment.weapon;
        const cost = hasWeapon ? (GS.equipment.weapon.level || 0) * 500 + 200 : 0;
        alert(`鐵匠鋪\n\n當前武器：${hasWeapon ? GS.equipment.weapon.name + ' +' + (GS.equipment.weapon.level || 0) : '未裝備'}\n強化費用：${cost} 金幣\n\n（強化功能即將開放）`);
      }
      else if (npc.id === 'warehouse') openSidePage('bag');
      else if (npc.id === 'quest') {
        if (GS.quest.current >= GS.quest.total) {
          const gold = 500, exp = 200;
          if (confirm(`任務完成！\n擊殺哥布林 ${GS.quest.current}/${GS.quest.total}\n\n獎勵：${gold} 金幣、${exp} 經驗\n\n是否領取獎勵？`)) {
            GS.resources.gold += gold;
            GS.player.exp += exp;
            GS.quest.current = 0; GS.quest.total = 5;
            el.questCurrent.textContent = '0'; el.questTotal.textContent = '5';
            addLog('system', `✅ 完成任務「${GS.quest.name}」，獲得 ${gold} 金幣、${exp} 經驗`);
            updateUI();
          }
        } else {
          alert(`任務官：前往野外討伐 ${GS.quest.total} 隻哥布林吧！\n\n進度：${GS.quest.current}/${GS.quest.total}`);
        }
      }
      else if (npc.id === 'premium_shop') {
        alert(`高級商人\n\n這裡販售稀有裝備與高級消耗品\n（高級商店功能即將開放）`);
      }
      else if (npc.id === 'inn') {
        if (GS.player.hp >= getTotalHpMax()) {
          alert('旅館老板娘：你的體力飽滿，不需要休息哦~');
        } else if (GS.resources.gold < 100) {
          alert('旅館老板娘：休息需要 100 金幣，你攜帶的金幣不足。');
        } else if (confirm('旅館老板娘：休息一晚需要 100 金幣，是否要休息？')) {
          GS.resources.gold -= 100;
          GS.player.hp = getTotalHpMax();
          GS.player.mp = (CLASSES[GS.player.classId]?.mpMax || 100);
          addLog('system', '🏨 在旅館休息，體力魔力完全恢復');
          updateUI();
          renderPlayer();
        }
      }
      else if (npc.id === 'bulletin') {
        alert(`📋 村莊佈告欄\n\n• 古魯丁野外出現大量哥布林，冒險者請注意安全\n• 鐵匠鋪現已開放強化業務\n• 公會招募中，詳情請至國家管理處查詢\n• 深淵蝙蝠王出沒幽暗洞窟，請高級冒險者前往討伐`);
      }
      else if (npc.id === 'dungeon_master') {
        alert(`🗝️ 副本管理員\n\n• 試煉之塔（Lv.20+）\n• 無限之塔（Lv.40+）\n• 夢幻之島（Lv.60+）\n\n（副本功能即將開放）`);
      }
      else if (npc.id === 'main_quest') {
        const mq = GS.mainQuest || { chapter: 1, step: 0 };
        const titles = [
          '第一章：覺醒',
          '第二章：命運的齒輪',
          '第三章：黑暗降臨',
        ];
        const steps = [
          '與大祭司對話，了解你的使命',
          '擊敗 10 隻哥布林（證明你的實力）',
          '前往古魯丁城堡覲見領主',
          '收集 5 個骷髏骨頭',
          '擊敗森林巨魔',
        ];
        const curTitle = titles[mq.chapter - 1] || titles[0];
        const curStep = steps[mq.step] || steps[steps.length - 1];
        if (mq.step === 0) {
          if (confirm(`👑 ${npc.name}：年輕的冒險者，你終於來了。\n\n【主線】${curTitle}\n目標：${curStep}\n\n是否接受這個神聖的使命？`)) {
            GS.mainQuest = { chapter: 1, step: 1 };
            addLog('system', `📜 接受主線任務：${curTitle}`);
          }
        } else {
          alert(`主線進度：${curTitle}\n當前任務：${curStep}\n\n（主線任務系統逐步開放中）`);
        }
      }
      else alert(npc.name + '：你好，冒险者！');
    });
    npcLayer.appendChild(elDiv);
  });
}

function renderMapModal() {
  const pl = GS.player.level;
  el.safeMapList.innerHTML = '';
  el.battleMapList.innerHTML = '';
  const siegeList = $('siege-map-list');
  if (siegeList) siegeList.innerHTML = '';
  Object.values(SAFE_MAPS).forEach(map => {
    const current = GS.currentMap === map.id;
    el.safeMapList.appendChild(buildMapCard(map, current, true));
  });
  Object.values(BATTLE_MAPS).forEach(map => {
    const unlocked = pl >= map.levelMin;
    const current = GS.currentMap === map.id;
    el.battleMapList.appendChild(buildMapCard(map, current, false, !unlocked));
  });
  if (siegeList) {
    Object.values(SIEGE_MAPS).forEach(map => {
      const lvUnlocked = pl >= map.levelMin;
      const warReady = GS.siegeWar && GS.siegeWar.status === 'active' && GS.siegeWar.castleId === map.castle && GS.siegeWar.endTime > Date.now();
      const current = GS.currentMap === map.id;
      const isSiege = true;
      const locked = !lvUnlocked || !warReady;
      const card = buildMapCard(map, current, false, locked, isSiege);
      if (locked && lvUnlocked && !warReady) {
        // 等级够但未宣战：显示提示
        const tip = document.createElement('div');
        tip.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.55);color:#ffd080;font-size:10px;font-weight:600;pointer-events:none;text-shadow:0 1px 2px #000';
        tip.innerHTML = '<div style=\'font-size:18px;margin-bottom:4px\'>🔒</div><div>需先宣戰</div><div style=\'font-size:9px;color:#c0a070;margin-top:2px\'>前往 國家→城堡</div>';
        card.appendChild(tip);
      }
      siegeList.appendChild(card);
    });
  }
}

function buildMapCard(map, current, isSafe, locked, isSiege) {
  const card = document.createElement('div');
  card.className = `map-card ${current ? 'current' : ''} ${locked ? 'locked' : ''} ${isSiege ? 'siege-map-card' : ''}`;
  card.dataset.map = map.id;
  const lvlText = isSafe ? '安全區' : (isSiege ? '攻城戰' : `Lv.${map.levelMin}-${map.levelMax}`);
  card.innerHTML = `
    <div class="map-card-bg" style="background-image:url(${map.bg})"></div>
    <div class="map-card-info">${map.name}</div>
    <div class="map-card-level">${lvlText}</div>
  `;
  if (!locked) {
    card.addEventListener('click', () => {
      loadMap(map.id);
      closeMapModal();
      addLog('system', `你來到了${map.name}`);
    });
  }
  return card;
}

function openMapModal() { renderMapModal(); el.mapModal.classList.add('open'); }
function closeMapModal() { el.mapModal.classList.remove('open'); }

// ==================== 怪物生成 ====================
function spawnMonsters() {
  const allMaps = getAllMaps();
  const map = allMaps[GS.currentMap];
  if (!map || map.type !== 'battle') return;

  // 收集所有待生成的怪物規格（一次性計算，後續分幀創建）
  const pending = [];
  let aggroCountPool = 1 + Math.floor(Math.random() * 3); // 1-3 主動
  map.monsters.forEach(spec => {
    for (let i = 0; i < spec.count; i++) {
      const levelJitter = Math.floor(Math.random() * 3);
      const level = spec.level + levelJitter;
      const isAggro = aggroCountPool > 0 && Math.random() > 0.5;
      if (isAggro) aggroCountPool--;
      pending.push({ type: spec.type, name: spec.name, level, behavior: isAggro ? 'aggro' : 'passive' });
    }
  });

  // 分幀創建：每帧最多 8 只，避免一次性 DOM 操作阻塞
  const BATCH = 8;
  let idx = 0;
  function spawnBatch() {
    const end = Math.min(idx + BATCH, pending.length);
    for (; idx < end; idx++) {
      const p = pending[idx];
      createMonster(p.type, p.name, p.level, p.behavior);
    }
    if (idx < pending.length) {
      requestAnimationFrame(spawnBatch);
    } else {
      // 全部生成完畢再生成 Boss
      if (map.boss) spawnMapBoss(map);
      console.log(`[Monster] 當前地圖生成 ${GS.monsters.length} 隻怪物（分幀完成）`);
    }
  }
  spawnBatch();
}

// Boss 系统：每张地圖一个 Boss，有重生時間
const bossState = {}; // mapId -> { respawnAt, spawned }

function spawnMapBoss(map) {
  const bs = bossState[map.id];
  if (bs && bs.respawnAt && Date.now() < bs.respawnAt) return; // 冷卻中
  if (bs?.spawned) return;

  const boss = map.boss;
  const m = createMonster(boss.type, boss.name, boss.level, 'aggro');
  m.isBoss = true;
  m.sprite = SPRITE['boss_' + boss.type] || SPRITE.boss_demon;
  m.hpMax = Math.floor(m.hpMax * boss.hpMult);
  m.hp = m.hpMax;
  m.atk = Math.floor(m.atk * boss.atkMult);
  m.def = Math.floor(m.def * 2);
  m.x = boss.x;
  m.y = boss.y;
  m.targetX = m.x; m.targetY = m.y;
  m.bossRespawn = boss.respawn;
  m.bossSkills = {
    aoe: { cd: 0, maxCd: 12, name: '範圍衝擊', radius: 80, dmgMult: 1.5, type: 'aoe' },
    charge: { cd: 0, maxCd: 18, name: '衝鋒', radius: 25, dmgMult: 2, type: 'charge' },
    summon: { cd: 0, maxCd: 30, name: '召喚小怪', type: 'summon', count: 3 },
    rage: { cd: 0, maxCd: 45, name: '狂暴', type: 'rage', duration: 15, atkMult: 1.8, spdMult: 1.5 },
  };
  m.bossSkillState = { warning: null, warningTimer: 0, rageUntil: 0 };
  if (window.AudioSystem) AudioSystem.sfxBossAppear();
  const elDiv = worldLayer.querySelector(`[data-id="${m.uid}"]`);
  if (elDiv) {
    elDiv.classList.add('boss-unit');
    // Boss 精靈放大 1.5 倍（僅放大精靈容器，不改變單位定位）
    const spriteWrap = elDiv.querySelector('.unit-sprite-wrap');
    if (spriteWrap) {
      const baseW = SPRITE_SIZE.enemy?.w || 50;
      const baseH = SPRITE_SIZE.enemy?.h || 56;
      const scale = 1.5;
      spriteWrap.style.width = (baseW * scale) + 'px';
      spriteWrap.style.height = (baseH * scale) + 'px';
      spriteWrap.style.marginLeft = -(baseW * scale - baseW) / 2 + 'px';
      spriteWrap.style.marginTop = -(baseH * scale - baseH) + 'px';
    }
    // Boss 血條加寬加醒目（比例縮小但仍比普通怪物醒目）
    const hpBar = elDiv.querySelector('.unit-hp-bar');
    if (hpBar) {
      hpBar.style.width = '70px';
      hpBar.style.height = '6px';
      hpBar.style.marginTop = '-2px';
      hpBar.style.border = '1.5px solid #ff6030';
      hpBar.style.boxShadow = '0 0 6px rgba(255,80,40,0.8)';
    }
    // 添加BOSS皇冠頭銜
    const nameTag = elDiv.querySelector('.unit-name');
    if (nameTag) {
      nameTag.innerHTML = '👑 ' + nameTag.textContent;
      nameTag.style.fontSize = '13px';
      nameTag.style.color = '#ffb040';
      nameTag.style.textShadow = '0 0 6px rgba(255,150,40,0.9), 0 1px 2px #000';
      nameTag.style.fontWeight = '800';
    }
    positionUnit(elDiv, m.x, m.y, 'enemy');
    updateMonsterRender(m);
  }
  bossState[map.id] = { respawnAt: 0, spawned: true, uid: m.uid };
  addLog('system', `⚠️ 【BOSS】${boss.name} 出現了！`);
}

function onBossKilled(mapId, boss) {
  const respawnSec = boss.respawn || 1800;
  bossState[mapId] = { respawnAt: Date.now() + respawnSec * 1000, spawned: false };
  addLog('system', `擊敗了 ${boss.name}！重生時間：${respawnSec}秒`);
}

function getBossRespawnTime(mapId) {
  const bs = bossState[mapId];
  if (!bs || !bs.respawnAt) return 0;
  return Math.max(0, Math.floor((bs.respawnAt - Date.now()) / 1000));
}

// 游戏循环中检查Boss重生
function checkBossRespawn() {
  const map = getAllMaps()[GS.currentMap];
  if (!map?.boss) return;
  const bs = bossState[GS.currentMap];
  if (!bs || bs.spawned) return;
  if (bs.respawnAt && Date.now() >= bs.respawnAt) {
    spawnMapBoss(map);
  }
}

function createMonster(type, name, level, behavior = 'passive') {
  const baseHp = 40 + level * 12;
  const baseAtk = 4 + level * 1.2;
  const sprite = MONSTER_SPRITES[type] || SPRITE.goblin;
  // 全地圖尺寸隨機生成（使用世界地圖大小，避免容器未測寬時擠在一起）
  const mapW = CAMERA.worldWidth || WORLD_W || 2496;
  const mapH = CAMERA.worldHeight || WORLD_H || 1664;
  const minDist = 60; // 怪物間最小距離
  let mx = 0, my = 0;
  // 活動範圍：以生成位置為中心，半徑 80-150 像素內隨機遊蕩
  // 距離檢測優化：只檢查最近生成的最多 20 隻怪物，避免 O(n²) 生成阻塞
  const checkStart = Math.max(0, GS.monsters.length - 20);
  const checkEnd = GS.monsters.length;
  let attempts = 0;
  const maxAttempts = 20;
  while (attempts < maxAttempts) {
    mx = 80 + Math.random() * (mapW - 160);
    my = 80 + Math.random() * (mapH - 160);
    let ok = true;
    for (let i = checkStart; i < checkEnd; i++) {
      const other = GS.monsters[i];
      if (!other || other.isBoss) continue;
      const dx = other.x - mx, dy = other.y - my;
      // 用曼哈頓距離快速過濾（比 hypot 快）
      if (Math.abs(dx) < minDist && Math.abs(dy) < minDist) {
        if (dx * dx + dy * dy < minDist * minDist) { ok = false; break; }
      }
    }
    if (ok) break;
    attempts++;
  }
  // 最後手段：隨機位置（避免全部怪物擠在一起）
  if (attempts >= maxAttempts) {
    mx = 80 + Math.random() * (mapW - 160);
    my = 80 + Math.random() * (mapH - 160);
  }
  const m = {
    uid: 'm' + (monsterUidCounter++),
    type, name, level, sprite, behavior,
    x: mx,
    y: my,
    targetX: 0, targetY: 0,
    hp: baseHp, hpMax: baseHp,
    atk: baseAtk, def: 2 + level * 0.4,
    state: 'idle',
    facing: Math.random() > 0.5 ? 'left' : 'right',
    attackCooldown: Math.random() * 2,
    attackInterval: 1.6 + Math.random() * 0.5,
    wanderTimer: 0,
    hitTimer: 0,
    aggroed: behavior === 'aggro',
    dots: [],
  };
  // 活動範圍：以生成位置為中心，半徑 80-150 像素內隨機遊蕩
  m.homeX = m.x;
  m.homeY = m.y;
  m.wanderRadius = 80 + Math.random() * 70;
  m.targetX = m.x; m.targetY = m.y;
  GS.monsters.push(m);
  createMonsterSprite(m);
  return m;
}

function createMonsterSprite(m) {
  const elDiv = document.createElement('div');
  elDiv.className = `world-unit enemy idle ${m.isBoss ? 'boss-unit ' : ''}${m.behavior === 'passive' ? 'passive' : 'aggro'}`;
  elDiv.dataset.id = m.uid;
  elDiv.innerHTML = buildSpriteHTML(m.sprite, 'enemy', true);
  // 填充名字（等級已隱藏，僅顯示名稱）
  const info = elDiv.querySelector('.unit-info');
  info.querySelector('.unit-name').textContent = m.name;
  const lvTag = info.querySelector('.unit-level-tag');
  if (lvTag) lvTag.style.display = 'none';
  elDiv.addEventListener('click', e => { e.stopPropagation(); onMonsterClick(m); });
  worldLayer.appendChild(elDiv);
  positionUnit(elDiv, m.x, m.y, 'enemy');
  m.el = elDiv;
  // 怪物/AI使用單張圖+CSS動畫，不需要JS幀切換，節省CPU
  // 只有玩家/英雄/變身才走 initUnitAnimState 8幀模式
}

function updateMonsterRender(m) {
  const elDiv = m.el || worldLayer.querySelector(`[data-id="${m.uid}"]`);
  if (!elDiv) return;
  if (!m.el) m.el = elDiv; // 回退填充緩存
  const hpPct = Math.max(0, (m.hp / m.hpMax) * 100);
  // HP bar 優化：只有變化超過1%才更新，減少style設置
  if (!m._lastHpPct || Math.abs(m._lastHpPct - hpPct) >= 0.5) {
    const hpFill = elDiv._hpFill || elDiv.querySelector('.unit-hp-fill');
    if (hpFill) {
      elDiv._hpFill = hpFill;
      hpFill.style.width = hpPct + '%';
    }
    m._lastHpPct = hpPct;
  }
  // 攻城战建筑使用特殊定位
  if (m.isSiegeStructure) {
    positionSiegeStructure(elDiv, m.x, m.y, m.structureType);
    // 城门损坏视觉效果
    if (m.type === 'gate' && hpPct < 50) elDiv.classList.add('damaged');
    else elDiv.classList.remove('damaged');
  } else {
    positionUnit(elDiv, m.x, m.y, 'enemy');
  }
  elDiv.classList.toggle('face-left', m.facing === 'left');
  elDiv.classList.toggle('targeted', GS.targetMonsterUid === m.uid);
  // 狀態類切換：只有狀態變化時才改classList，避免每幀重設
  const newState = m.hp <= 0 ? 'dead' : (m.hitTimer > 0 ? 'hit' : m.state);
  if (m._renderState !== newState) {
    elDiv.classList.remove('idle','walking','attacking','casting','hit','dead','chasing','wandering');
    if (newState === 'chasing' || newState === 'wandering') elDiv.classList.add('walking');
    else elDiv.classList.add(newState);
    m._renderState = newState;
    // 重新觸發攻擊動畫（移除再加，讓CSS動畫重新播放）
    if (newState === 'attacking') {
      const wrap = elDiv.querySelector('.unit-sprite-wrap');
      if (wrap) {
        wrap.style.animation = 'none';
        // 強制重排
        void wrap.offsetWidth;
        wrap.style.animation = '';
      }
    }
  }
  // 建築不播動畫也不更新幀（CSS類已足夠）
}

// ==================== 点击怪物 ====================
function onMonsterClick(m) {
  if (m.hp <= 0) return;
  const allMaps = getAllMaps();
  const curMap = allMaps[GS.currentMap];

  // 安全地圖无法攻擊
  if (curMap?.type === 'safe') return;

  // 城堡地圖未宣戰状态无法攻擊（参观模式）
  if (curMap?.type === 'castle_siege' && !castleSiegeActive) {
    const castleName = CASTLES.find(c => c.id === curMap.castle)?.name || '该城堡';
    addLog('system', `未宣戰，無法攻擊。請先到城堡頁面對【${castleName}】宣戰。`);
    return;
  }

  // 攻城战建筑点击：直接作为目標
  GS.targetMonsterUid = m.uid;
  if (m.behavior === 'passive') m.aggroed = true;
  // 走过去
  const cls = CLASSES[GS.player.classId];
  const range = cls.atkType === 'ranged' ? 120 : 40;
  const dx = m.x - GS.player.x;
  const dy = m.y - GS.player.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) {
    const ratio = (dist - range + 5) / dist;
    GS.player.targetX = GS.player.x + dx * ratio;
    GS.player.targetY = GS.player.y + dy * ratio;
  }
  GS.player.state = 'walking';
  GS.player.facing = dx >= 0 ? 'right' : 'left';
}

// ==================== 召喚英雄 ====================
function createSummonSprite(s) {
  const elDiv = document.createElement('div');
  elDiv.className = 'world-unit summon idle';
  elDiv.dataset.id = s.id;
  elDiv.innerHTML = buildSpriteHTML(s.sprite, 'summon', true);
  const info = elDiv.querySelector('.unit-info');
  info.querySelector('.unit-name').textContent = s.name;
  info.querySelector('.unit-level-tag').textContent = '';
  worldLayer.appendChild(elDiv);
  positionUnit(elDiv, s.x, s.y, 'summon');
  initUnitAnimState(s.id);
  return elDiv;
}

function updateSummonRender(s) {
  const elDiv = worldLayer.querySelector(`[data-id="${s.id}"]`);
  if (!elDiv) return;
  elDiv.style.display = s.active ? '' : 'none';
  if (!s.active) return;
  const hpPct = Math.max(0, (s.hp / s.hpMax) * 100);
  const hpFill = elDiv.querySelector('.unit-hp-fill');
  if (hpFill) hpFill.style.width = hpPct + '%';
  positionUnit(elDiv, s.x, s.y, 'summon');
  elDiv.classList.toggle('face-left', s.facing === 'left');
  elDiv.classList.remove('idle','walking','attacking','hit','dead');
  if (s.hp <= 0) elDiv.classList.add('dead');
  else elDiv.classList.add(s.state);
  // 应用帧动画
  applyUnitAnimFrame(elDiv, s.id, s.hp <= 0 ? 'dead' : s.state);
}

// ==================== 动画更新 (单图模式) ====================
// 单张图 + CSS 动画模式：所有动画通过 CSS 类（idle/walking/attacking/hit/dead）驱动
// 无需 JS 帧切换，此处保留接口兼容
// 8帧多帧动画驱动：walk 4帧循环 / attack 2帧序列 / hit 1帧定时
function updateSpriteFrames(dt) {
  const dtMs = dt * 1000;
  // 玩家（唯一走8幀JS驅動的單位）
  if (worldLayer && GS.player) {
    const unit = worldLayer.querySelector('.world-unit.hero');
    if (unit) updateUnitAnimFrame('player', GS.player.state, unit);
  }
  // 怪物：使用單張圖+CSS動畫，完全跳過JS幀切換，節省大量CPU
  // AI玩家：使用單張圖+CSS動畫，完全跳過JS幀切換
  // 召喚：使用單張圖+CSS動畫，跳過JS幀切換
  // （如需召喚也走8幀，可自行開啟下面區塊）
  // if (GS.summons && worldLayer) {
  //   for (const s of GS.summons) {
  //     const el = worldLayer.querySelector(`[data-id="summon-${s.id}"]`);
  //     if (el) updateUnitAnimFrame('summon-' + s.id, s.state || 'idle', el);
  //   }
  // }

  function updateUnitAnimFrame(uid, state, unitEl) {
    const anim = unitAnimState.get(uid);
    if (!anim) return;
    // 判断状态类别
    let category;
    if (state === 'dead') category = 'dead';
    else if (state === 'hit') category = 'hit';
    else if (state === 'attacking' || state === 'casting') category = 'attack';
    else if (state === 'walking' || state === 'chasing' || state === 'wandering') category = 'walk';
    else category = 'idle';

    // 状态切换时重置帧和计时器
    if (anim.lastCategory !== category) {
      anim.lastCategory = category;
      anim.animFrame = 0;
      if (category === 'walk') anim.animTimer = ANIM_FRAME_DURATIONS.walk[0];
      else if (category === 'attack') anim.animTimer = ANIM_FRAME_DURATIONS.attack[0];
      else if (category === 'hit') anim.animTimer = ANIM_FRAME_DURATIONS.hit[0];
      else anim.animTimer = 0;
      applyUnitAnimFrame(unitEl, uid, state);
      return;
    }

    // idle/dead 无帧切换
    if (category === 'idle' || category === 'dead') return;

    // 倒计时
    anim.animTimer -= dtMs;
    if (anim.animTimer > 0) return;

    // 进入下一帧
    if (category === 'walk') {
      anim.animFrame = (anim.animFrame + 1) % 4;
      anim.animTimer = ANIM_FRAME_DURATIONS.walk[anim.animFrame];
    } else if (category === 'attack') {
      if (anim.animFrame < ANIM_FRAME_DURATIONS.attack.length - 1) {
        anim.animFrame++;
        anim.animTimer = ANIM_FRAME_DURATIONS.attack[anim.animFrame];
      } else {
        // 最后一帧播放完，由上层逻辑切回其他状态；这里保持最后一帧直到状态改变
        anim.animTimer = 99999;
      }
    } else if (category === 'hit') {
      // hit播放完保持到状态改变
      anim.animTimer = 99999;
    }
    applyUnitAnimFrame(unitEl, uid, state);
  }
}

// 攻擊动画：单图模式下通过 CSS .attacking 类实现冲刺缩放
// 只需在动画结束后移除 attacking 类即可
function playAttackAnim(unitEl, onComplete, opts = {}) {
  if (unitEl) {
    unitEl.classList.add('attack-dash');
    // 挥砍弧线特效 + 职业颜色
    const slash = unitEl.querySelector('.slash-effect');
    if (slash) {
      slash.classList.remove('slash-play');
      // 设置职业色
      const color = opts.slashColor || '#ffd880';
      slash.style.borderColor = color;
      slash.style.boxShadow = `0 0 10px ${color}, 0 0 20px ${color}80, inset 0 0 8px ${color}b0`;
      slash.style.filter = `drop-shadow(0 0 4px ${color})`;
      // 强制重绘以重启动画
      void slash.offsetWidth;
      slash.classList.add('slash-play');
    }
    // 武器发光效果
    const wrap = unitEl.querySelector('.unit-sprite-wrap');
    if (wrap) {
      wrap.classList.remove('attack-glow');
      void wrap.offsetWidth;
      wrap.classList.add('attack-glow');
      setTimeout(() => wrap.classList.remove('attack-glow'), 350);
    }
    setTimeout(() => unitEl.classList.remove('attack-dash'), 350);
  }
  // CSS 动画自動播放，0.35s 后触发回调
  setTimeout(() => {
    if (onComplete) onComplete();
  }, 350);
}

// 生成脚下灰尘粒子（移动时）
let dustSpawnTimer = 0;
function updateDustParticles(dt) {
  dustSpawnTimer -= dt;
  if (dustSpawnTimer > 0) return;
  const p = GS.player;
  if (p.hp <= 0) return;
  if (p.state !== 'walking') return;
  dustSpawnTimer = 0.3; // 每300ms生成一个
  const unit = worldLayer.querySelector('.world-unit.hero');
  if (!unit) return;
  const dustWrap = unit.querySelector('.dust-particles');
  if (!dustWrap) return;
  const dust = document.createElement('div');
  dust.className = 'dust-particle';
  // 随机偏移
  const offsetX = (Math.random() - 0.5) * 20;
  dust.style.left = (50 + offsetX / 64 * 100) + '%';
  dust.style.bottom = '8%';
  dustWrap.appendChild(dust);
  setTimeout(() => { if (dust.parentNode) dust.remove(); }, 600);
}

// ==================== 玩家更新 ====================
function updatePlayer(dt) {
  const p = GS.player;
  if (p.hp <= 0) { p.state = 'dead'; return; }

  // buff 計時
  for (const key in p.buffs) {
    const b = p.buffs[key];
    if (typeof b === 'object' && b.duration !== undefined) {
      b.duration -= dt;
      if (b.duration <= 0) delete p.buffs[key];
    } else if (typeof b === 'number') {
      // 舊格式兼容：數字即剩餘秒數
      p.buffs[key] -= dt;
      if (p.buffs[key] <= 0) delete p.buffs[key];
    }
  }

  // MP 自動恢復（每秒恢復 2% 最大魔力）
  const mpMax = getTotalMpMax();
  if (p.mp < mpMax) {
    p.mp = Math.min(mpMax, p.mp + mpMax * 0.02 * dt);
  }

  // 移動
  const dx = p.targetX - p.x;
  const dy = p.targetY - p.y;
  const dist = Math.hypot(dx, dy);
  let speed = 85;
  // 計算移動速度加成
  let moveSpdBonus = 0;
  for (const key in p.buffs) {
    const b = p.buffs[key];
    if (typeof b === 'object' && b.type === 'moveSpeed') moveSpdBonus += b.value;
  }
  // 變身移動速度加成
  const tfInfo = TRANSFORM_POOL.find(t => t.id === p.transformId);
  if (tfInfo?.stats?.walkSpeedPct) moveSpdBonus += tfInfo.stats.walkSpeedPct;
  if (moveSpdBonus > 0) speed *= (1 + moveSpdBonus / 100);
  if (p.buffs.windwalk) speed *= 1.3;

  if (dist > 2) {
    const move = Math.min(dist, speed * dt);
    let newX = p.x + (dx / dist) * move;
    let newY = p.y + (dy / dist) * move;
    // 攻城战围墙碰撞检测
    if (castleSiegeActive) {
      const collision = checkSiegeWallCollision(newX, newY);
      if (collision) {
        // 尝试只在X或Y方向移动（贴墙滑行）
        const tryX = checkSiegeWallCollision(newX, p.y);
        const tryY = checkSiegeWallCollision(p.x, newY);
        if (!tryX) { newX = newX; newY = p.y; }
        else if (!tryY) { newX = p.x; newY = newY; }
        else { newX = p.x; newY = p.y; p.targetX = p.x; p.targetY = p.y; }
      }
    }
    p.x = newX;
    p.y = newY;
    if (p.state !== 'attacking' && p.hitTimer <= 0 && p.state !== 'casting') p.state = 'walking';
    p.facing = dx >= 0 ? 'right' : 'left';
  } else {
    if (p.state === 'walking') p.state = 'idle';
  }

  if (p.hitTimer > 0) p.hitTimer -= dt;
  if (p.attackCooldown > 0) p.attackCooldown -= dt;

  // 技能冷卻
  for (let i = 0; i < 8; i++) {
    p.skillCooldowns[i] = Math.max(0, p.skillCooldowns[i] - dt);
  }
  updateSkillCdDisplay();

  // 屏幕震動
  updateScreenShake(dt);

  // 自動戰鬥
  if (GS.autoMode) {
    autoCombat(dt);
  } else {
    // 手动模式：锁定目標后自動走到射程内普攻
    manualCombat(dt);
  }

  // 自動喝水 / 回魔
  if (p.hp > 0) {
    const hpMax = getTotalHpMax();
    const mpMax = getTotalMpMax();
    const hpPct = p.hp / hpMax;
    const mpPct = p.mp / mpMax;
    const now = Date.now();
    const activeBuffs = GS.activeBuffs || [];

    // 新自動道具系統：遍歷8個欄位，按規則自動使用
    if (!p.autoItemCd) p.autoItemCd = 0;
    if (p.autoItemCd <= 0 && GS.autoItems) {
      let used = false;
      for (const slot of GS.autoItems) {
        if (!slot.autoUse || !slot.itemId) continue;
        const catItem = AUTO_ITEMS_CATALOG.find(c => c.id === slot.itemId);
        if (!catItem) continue;
        // 檢查背包是否有該道具
        const invItem = GS.inventory.find(i => i.id === slot.itemId && (i.count || 0) > 0);
        if (!invItem) continue;

        if (catItem.type === 'hp') {
          // HP 低於閾值時使用
          const threshold = (slot.threshold || 30) / 100;
          if (hpPct < threshold) {
            useConsumable(slot.itemId);
            used = true;
            break;
          }
        } else if (catItem.type === 'mp') {
          // MP 低於閾值時使用
          const threshold = (slot.threshold || 20) / 100;
          if (mpPct < threshold) {
            useConsumable(slot.itemId);
            used = true;
            break;
          }
        } else if (catItem.type === 'buff') {
          // buff 類：對應 buff 不存在或將於5秒內消失時自動續用
          const buffKey = catItem.buffKey;
          const buff = activeBuffs.find(b => b.type === buffKey);
          if (!buff || (buff.endTime - now) < 5000) {
            useConsumable(slot.itemId);
            used = true;
            break;
          }
        }
        // scroll 類不自動使用（需玩家手動）
      }
      if (used) p.autoItemCd = 2;
    }
    p.autoItemCd = Math.max(0, (p.autoItemCd || 0) - dt);

    // 自動購買：按欄位檢查，道具不足且金幣足夠時購買補充
    if (!p.autoBuyCd) p.autoBuyCd = 0;
    if (p.autoBuyCd <= 0 && GS.autoItems) {
      for (const slot of GS.autoItems) {
        if (!slot.autoBuy || !slot.itemId) continue;
        const catItem = AUTO_ITEMS_CATALOG.find(c => c.id === slot.itemId);
        if (!catItem) continue;
        const count = getItemCountInInventory(slot.itemId);
        // HP/MP 類低於 2 瓶就補 5 瓶；buff/scroll 類低於 1 個就補 3 個
        const minStock = (catItem.type === 'hp' || catItem.type === 'mp') ? 2 : 1;
        const buyCount = (catItem.type === 'hp' || catItem.type === 'mp') ? 5 : 3;
        if (count < minStock) {
          const totalCost = catItem.price * buyCount;
          if (GS.resources.gold >= totalCost) {
            addItemToInventory({
              id: catItem.id,
              name: catItem.name,
              itemType: 'consumable',
              rarity: catItem.rarity,
              icon: ITEM_ICONS[catItem.icon] || '',
              count: buyCount,
            });
            GS.resources.gold -= totalCost;
            addLog('system', `自動購買 ${catItem.name} × ${buyCount}，花費 ${totalCost} 金幣`);
            p.autoBuyCd = 15;
            break;
          }
        }
      }
    }
    p.autoBuyCd = Math.max(0, (p.autoBuyCd || 0) - dt);

    // 兼容舊版 autoPotionEnabled / autoMpEnabled 開關（保持向後兼容）
    // 舊開關僅作為顯示，真正邏輯已遷移到 autoItems 配置
  }
}

function findNearestMonster() {
  const p = GS.player;
  let best = null, bestD = Infinity;
  GS.monsters.forEach(m => {
    if (m.hp <= 0) return;
    const d = Math.hypot(m.x - p.x, m.y - p.y);
    if (d < bestD) { bestD = d; best = m; }
  });
  return best;
}

// 手动模式戰鬥：玩家锁定目標后自動走到射程内并普攻
function manualCombat(dt) {
  const p = GS.player;
  if (p.hp <= 0) return;
  if (p.state === 'attacking' || p.state === 'casting') return;

  // 没有手动锁定目標则不攻擊
  let target = null;
  let isAITarget = false;
  if (GS.targetMonsterUid) {
    target = GS.monsters.find(m => m.uid === GS.targetMonsterUid && m.hp > 0);
    if (!target) GS.targetMonsterUid = null;
  }
  if (!target && GS.targetAiUid && GS.aiPlayers) {
    const ai = GS.aiPlayers.find(a => a.uid === GS.targetAiUid && a.hp > 0 && a.state !== 'dead');
    if (ai) { target = ai; isAITarget = true; }
    else GS.targetAiUid = null;
  }
  if (!target) return;

  const cls = CLASSES[p.classId];
  const range = cls.atkType === 'ranged' ? 120 : 40;
  const tDist = Math.hypot(target.x - p.x, target.y - p.y);

  if (tDist > range + 10) {
    // 走过去
    const tdx = target.x - p.x;
    const tdy = target.y - p.y;
    const ratio = (tDist - range + 5) / tDist;
    p.targetX = p.x + tdx * ratio;
    p.targetY = p.y + tdy * ratio;
    if (p.state !== 'attacking' && p.state !== 'casting') p.state = 'walking';
    p.facing = target.x >= p.x ? 'right' : 'left';
  } else {
    // 在射程内，普攻
    p.targetX = p.x; p.targetY = p.y;
    p.facing = target.x >= p.x ? 'right' : 'left';
    if (p.attackCooldown <= 0) {
      // 職業特效顏色
      const classColors = { warrior: '#ff7050', mage: '#60a0ff', archer: '#60e080', assassin: '#c080ff', paladin: '#ffd060', priest: '#a0ffff' };
      const atkColor = classColors[cls.key] || '#ffdd80';
      const atkType = cls.atkType === 'ranged' ? 'arrow' : 'slash';
      if (isAITarget) {
        dealDamageToAIPlayer(target, calcPlayerDamage(), 'normal');
      } else {
        dealDamage(target, calcPlayerDamage(), 'normal');
      }
      spawnEffect(atkType, target.x, target.y - 28, { direction: p.facing, classColor: atkColor });
      if (window.AudioSystem) AudioSystem.sfxNormalAttack(p.classId);
      p.attackCooldown = cls.atkInterval || 1.0;
      p.state = 'attacking';
      setTimeout(() => {
        if (p.state === 'attacking') p.state = 'idle';
      }, 300);
    }
  }
}

function autoCombat(dt) {
  const p = GS.player;
  if (p.hp <= 0) return;
  if (p.state === 'attacking' || p.state === 'casting') return;

  const cls = CLASSES[p.classId];
  const range = cls.atkType === 'ranged' ? 120 : 40;

  // 先嘗試攻擊已鎖定的 AI 目標（PvP）
  let target = null;
  let isAITarget = false;
  if (GS.autoPvpMode === 'active' || GS.autoPvpMode === 'counter') {
    if (GS.targetAiUid && GS.aiPlayers) {
      const ai = GS.aiPlayers.find(a => a.uid === GS.targetAiUid && a.hp > 0 && a.state !== 'dead');
      if (ai) { target = ai; isAITarget = true; }
    }
    // 主動模式：自動尋找範圍內敵國玩家
    if (!target && GS.autoPvpMode === 'active' && GS.aiPlayers) {
      const pvpRange = 180;
      for (const ai of GS.aiPlayers) {
        if (ai.hp <= 0 || ai.state === 'dead') continue;
        if (ai.nation === GS.nation) continue; // 同國不打
        const d = Math.hypot(ai.x - p.x, ai.y - p.y);
        if (d < pvpRange) { target = ai; isAITarget = true; break; }
      }
    }
  }

  // 沒有 PvP 目標 → 找怪物
  if (!target) {
    if (!GS.targetMonsterUid || !GS.monsters.find(m => m.uid === GS.targetMonsterUid && m.hp > 0)) {
      const n = findNearestMonster();
      if (n) GS.targetMonsterUid = n.uid;
      else {
        // 沒有目標就在附近隨機走動
        p.state = 'walking';
        p.wanderTimer = (p.wanderTimer || 3) - dt;
        if (p.wanderTimer <= 0) {
          p.wanderTimer = 3 + Math.random() * 4;
          p.targetX = Math.max(60, Math.min(worldMaxW() - 60, p.x + (Math.random() - 0.5) * 200));
          p.targetY = Math.max(100, Math.min(worldMaxH() - 60, p.y + (Math.random() - 0.5) * 200));
        }
        return;
      }
    }
    target = GS.monsters.find(m => m.uid === GS.targetMonsterUid && m.hp > 0);
    if (!target) return;
  }

  const tDist = Math.hypot(target.x - p.x, target.y - p.y);
  if (tDist > range + 10) {
    // 走过去
    const tdx = target.x - p.x;
    const tdy = target.y - p.y;
    const ratio = (tDist - range + 5) / tDist;
    p.targetX = p.x + tdx * ratio;
    p.targetY = p.y + tdy * ratio;
    p.state = 'walking';
  } else {
    // 在射程內
    p.facing = target.x >= p.x ? 'right' : 'left';
    p.targetX = p.x; p.targetY = p.y;

    // 自動技能：先遍歷快捷欄；若快捷欄無技能，則遍歷所有已學習技能
    if (GS.autoSkillEnabled !== false) {
      let casted = false;
      // 第一階段：快捷欄技能
      for (let i = 0; i < 8; i++) {
        const slot = GS.quickBar[i];
        if (!slot || slot.type !== 'skill') continue;
        if (p.skillCooldowns[i] > 0) continue;
        const skillIdx = slot.skillIndex;
        const skill = cls?.allSkills?.[skillIdx];
        if (!skill) continue;
        if (skill.id === 'normal') continue;
        if (skill.learnLevel && p.level < skill.learnLevel) continue;
        const mpCost = skill.mpCost || Math.max(5, Math.floor((skill.cd || 3) * 2 + (skill.dmgMult || 1) * 5));
        if (p.mp < mpCost) continue;
        const isUltimate = (skill.cd >= 30 && (skill.dmgMult || 0) >= 2) || skill.id === 'summon' || skill.id === 'infernal';
        if (isUltimate) {
          const gemItem = GS.inventory.find(ii => ii.id === 'mgem' && ii.itemType === 'consumable');
          if (!gemItem || gemItem.count <= 0) continue;
        }
        console.log('[AutoSkill] 快捷欄施放:', skill.name, '槽位:', i);
        castSkill(i);
        casted = true;
        break;
      }
      // 第二階段：若快捷欄沒放出技能，遍歷已學習技能直接施放
      if (!casted) {
        const allSkills = cls?.allSkills || [];
        // 初始化技能冷卻字典（以 skillId 為鍵）
        if (!p.skillCdById) p.skillCdById = {};
        for (let si = 0; si < allSkills.length; si++) {
          const skill = allSkills[si];
          if (!skill || skill.id === 'normal') continue;
          if (skill.learnLevel && p.level < skill.learnLevel) continue;
          const cdKey = 's_' + skill.id;
          if ((p.skillCdById[cdKey] || 0) > 0) continue;
          const mpCost = skill.mpCost || Math.max(5, Math.floor((skill.cd || 3) * 2 + (skill.dmgMult || 1) * 5));
          if (p.mp < mpCost) continue;
          const isUltimate = (skill.cd >= 30 && (skill.dmgMult || 0) >= 2) || skill.id === 'summon' || skill.id === 'infernal';
          if (isUltimate) {
            const gemItem = GS.inventory.find(ii => ii.id === 'mgem' && ii.itemType === 'consumable');
            if (!gemItem || gemItem.count <= 0) continue;
          }
          // 將技能臨時放入一個空快捷欄位再施放（為了複用 castSkill 邏輯）
          let emptySlot = -1;
          for (let k = 0; k < 8; k++) { if (!GS.quickBar[k]) { emptySlot = k; break; } }
          if (emptySlot < 0) emptySlot = 7;
          GS.quickBar[emptySlot] = { type: 'skill', skillIndex: si };
          p.skillCooldowns[emptySlot] = 0; // 重置該槽冷卻
          console.log('[AutoSkill] 已學習技能施放:', skill.name, '臨時槽:', emptySlot);
          castSkill(emptySlot);
          casted = true;
          break;
        }
      }
      if (casted) return;
    }
    // 普攻
    if (p.attackCooldown <= 0) {
      doPlayerNormalAttack(target, isAITarget);
    }
  }
}

// 玩家普攻
function doPlayerNormalAttack(target, isAITarget) {
  const p = GS.player;
  if (p.hp <= 0) return;
  p.state = 'attacking';
  p.attackCooldown = p.attackInterval || 1.0;
  const atkVal = getTotalAtk();
  const defVal = (isAITarget ? getAITotalDef(target) : (Number(target.def) || 0));
  const dr = Math.min(0.75, defVal * 0.005);
  const isCrit = Math.random() < (getTotalCrit() || 0) / 100;
  let dmg = Math.max(1, Math.floor(atkVal * (1 - dr) * (0.9 + Math.random() * 0.2)));
  if (isCrit) dmg = Math.floor(dmg * (1.5 + (getTotalCritDmg() || 50) / 100));

  if (isAITarget) {
    target.hp = Math.max(0, target.hp - dmg);
    showDamage(target.x, target.y - 50, dmg, isCrit ? 'crit' : 'normal');
    target.hitTimer = 0.2;
    if (target.el) {
      target.el.classList.add('hit');
      setTimeout(() => { if (target.el) target.el.classList.remove('hit'); }, 150);
      const hpBar = target.el.querySelector('.unit-hp-fill');
      if (hpBar) hpBar.style.width = (target.hp / target.hpMax * 100) + '%';
    }
    // 被動反擊：目標若是AI且未鎖定玩家，開始反擊
    if (Math.random() < 0.8) target.targetUid = 'player';
    addLog('damage-dealt', `【${target.name}】受到你的攻擊，造成 ${dmg} 傷害${isCrit ? '（暴擊）' : ''}`);
    if (target.hp <= 0) {
      // PVP擊殺AI：僅給予極少量經驗，不掉落金幣/道具/裝備
      const exp = Math.min(10, Math.max(5, target.level));
      GS.player.exp += exp;
      addLog('kill', `擊敗【${target.name}】（PVP），獲得 ${exp} 經驗`);
      onAIPlayerDead(target);
    }
  } else {
    target.hp = Math.max(0, target.hp - dmg);
    showDamage(target.x, target.y - 50, dmg, isCrit ? 'crit' : 'normal');
    target.aggroed = true;
    const mEl = worldLayer.querySelector(`[data-id="${target.uid}"]`);
    if (mEl) mEl.querySelector('.unit-hp-fill').style.width = (target.hp / target.hpMax * 100) + '%';
    addLog('damage-dealt', `【${target.name}】受到你的攻擊，造成 ${dmg} 傷害${isCrit ? '（暴擊）' : ''}`);
    if (target.hp <= 0) {
      const expGain = Math.floor(target.level * 5 + 10);
      const goldGain = Math.floor(target.level * 3 + 5);
      GS.player.exp += expGain;
      GS.resources.gold += goldGain;
      p.kills = (p.kills || 0) + 1;
      addLog('kill', `擊敗【${target.name}】，獲得 ${expGain} 經驗，${goldGain} 金幣`);
      onMonsterDead(target);
    }
  }

  // 屏幕輕微震動
  shakeScreen(0.3, 2);
  // 普攻特效（揮砍／射擊／施法）
  playNormalAttackEffect(p, target);

  // 動畫計時：短暫進入攻擊狀態後恢復
  setTimeout(() => {
    if (p.state === 'attacking') p.state = 'idle';
  }, 300);
}

// 普攻視覺特效
function playNormalAttackEffect(p, target) {
  if (!el.effectLayer) return;
  const cls = CLASSES[p.classId];
  const effect = document.createElement('div');
  effect.style.position = 'absolute';
  effect.style.left = (target.x - 25) + 'px';
  effect.style.top = (target.y - 35) + 'px';
  effect.style.width = '50px';
  effect.style.height = '50px';
  effect.style.pointerEvents = 'none';
  effect.style.zIndex = '50';
  if (cls.atkType === 'ranged') {
    // 射擊光線：從玩家到目標
    const line = document.createElement('div');
    const dx = target.x - p.x, dy = target.y - p.y;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    line.style.position = 'absolute';
    line.style.left = p.x + 'px';
    line.style.top = (p.y - 28) + 'px';
    line.style.width = len + 'px';
    line.style.height = '2px';
    line.style.background = 'linear-gradient(90deg, transparent, #ffe080, #fff8d0, #ffe080, transparent)';
    line.style.transformOrigin = 'left center';
    line.style.transform = `rotate(${angle}deg)`;
    line.style.boxShadow = '0 0 6px rgba(255,220,120,0.8)';
    line.style.animation = 'arrowLineFx 0.25s ease-out forwards';
    line.style.pointerEvents = 'none';
    line.style.zIndex = '49';
    el.effectLayer.appendChild(line);
    setTimeout(() => line.remove(), 300);
    effect.style.background = 'radial-gradient(circle, #fff0a0 0%, #ff9040 40%, transparent 70%)';
    effect.style.borderRadius = '50%';
    effect.style.animation = 'rangedHit 0.3s ease-out forwards';
    effect.style.boxShadow = '0 0 12px rgba(255,200,80,0.9)';
  } else if (cls.atkType === 'magic') {
    effect.style.background = 'radial-gradient(circle, #a0d0ff 0%, #4080ff 40%, transparent 70%)';
    effect.style.borderRadius = '50%';
    effect.style.animation = 'magicHit 0.35s ease-out forwards';
    effect.style.boxShadow = '0 0 14px rgba(100,160,255,0.9)';
  } else {
    // 近戰揮砍：弧形閃光 + 粒子
    effect.innerHTML = `<svg viewBox="0 0 50 50" style="width:100%;height:100%">
      <path d="M5 42 Q 25 5 45 42" stroke="#fff8d0" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M10 40 Q 25 10 40 40" stroke="#ffd060" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.7"/>
    </svg>`;
    effect.style.animation = 'slashHit 0.28s ease-out forwards';
    effect.style.filter = 'drop-shadow(0 0 6px rgba(255,240,160,0.9))';
  }
  el.effectLayer.appendChild(effect);
  setTimeout(() => effect.remove(), 400);
  // 命中火花粒子
  spawnHitSparks(target.x, target.y - 30, cls.sprite?.slashColor || '#fff0a0');
}

// 命中火花粒子
function spawnHitSparks(x, y, color) {
  if (!el.effectLayer) return;
  const count = 6;
  for (let i = 0; i < count; i++) {
    const spark = document.createElement('div');
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    const dist = 8 + Math.random() * 18;
    const size = 3 + Math.random() * 4;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 5;
    spark.style.cssText = `
      position: absolute;
      left: ${x - size / 2}px;
      top: ${y - size / 2}px;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: radial-gradient(circle, #fff 0%, ${color} 40%, transparent 70%);
      box-shadow: 0 0 ${size * 2}px ${color};
      pointer-events: none;
      z-index: 55;
      --dx: ${dx}px;
      --dy: ${dy}px;
      animation: sparkBurst 0.45s ease-out forwards;
    `;
    el.effectLayer.appendChild(spark);
    setTimeout(() => spark.remove(), 500);
  }
}

// 命中火花粒子
function spawnHitSparks(x, y, color) {
  if (!el.effectLayer) return;
  const count = 6;
  for (let i = 0; i < count; i++) {
    const spark = document.createElement('div');
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    const dist = 8 + Math.random() * 18;
    const size = 3 + Math.random() * 4;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 5;
    spark.style.cssText = `
      position: absolute;
      left: ${x - size / 2}px;
      top: ${y - size / 2}px;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: radial-gradient(circle, #fff 0%, ${color} 40%, transparent 70%);
      box-shadow: 0 0 ${size * 2}px ${color};
      pointer-events: none;
      z-index: 55;
      --dx: ${dx}px;
      --dy: ${dy}px;
      animation: sparkBurst 0.45s ease-out forwards;
    `;
    el.effectLayer.appendChild(spark);
    setTimeout(() => spark.remove(), 500);
  }
}

// 變身爆發特效（光环扩散 + 屏幕闪光）
function triggerTransformBurst(rarity) {
  if (!el.effectLayer || !GS.player) return;
  const p = GS.player;
  const color = rarity === 'gold' ? '#ffd880' : (rarity === 'purple' ? '#c080ff' : '#80c0ff');
  // 屏幕闪光
  if (el.scene) {
    el.scene.classList.add('transform-burst-flash');
    el.scene.style.setProperty('--burst-color', color + '30');
    setTimeout(() => el.scene.classList.remove('transform-burst-flash'), 600);
  }
  // 同心光环扩散 3层
  for (let i = 0; i < 3; i++) {
    const ring = document.createElement('div');
    const size = 80 + i * 30;
    ring.style.cssText = `
      position: absolute;
      left: ${p.x - size / 2}px;
      top: ${p.y - 30 - size / 2}px;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: 3px solid ${color};
      box-shadow: 0 0 20px ${color}, inset 0 0 20px ${color}80;
      pointer-events: none;
      z-index: 60;
      animation: burstRingExpand 0.8s ease-out ${i * 0.12}s forwards;
    `;
    el.effectLayer.appendChild(ring);
    setTimeout(() => ring.remove(), 1000 + i * 100);
  }
  // 粒子爆发
  for (let i = 0; i < 16; i++) {
    const pt = document.createElement('div');
    const angle = (Math.PI * 2 / 16) * i;
    const dist = 40 + Math.random() * 40;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 20;
    const sz = 4 + Math.random() * 5;
    pt.style.cssText = `
      position: absolute;
      left: ${p.x - sz / 2}px;
      top: ${p.y - 30 - sz / 2}px;
      width: ${sz}px;
      height: ${sz}px;
      border-radius: 50%;
      background: radial-gradient(circle, #fff 0%, ${color} 50%, transparent 80%);
      box-shadow: 0 0 10px ${color};
      pointer-events: none;
      z-index: 61;
      --dx: ${dx}px;
      --dy: ${dy}px;
      animation: sparkBurst 0.9s ease-out forwards;
    `;
    el.effectLayer.appendChild(pt);
    setTimeout(() => pt.remove(), 1000);
  }
  shakeScreen(rarity === 'gold' ? 1.5 : 1, 0.4);
}

// 屏幕震動
let shakeTimer = 0, shakeIntensity = 0;
function shakeScreen(intensity, duration) {
  shakeIntensity = Math.max(shakeIntensity, intensity);
  shakeTimer = Math.max(shakeTimer, duration);
}
function updateScreenShake(dt) {
  if (shakeTimer <= 0) {
    if (el.sceneBg && el.sceneBg.style.transform !== 'translate(0,0)') {
      el.sceneBg.style.transform = '';
      if (el.worldLayer) el.worldLayer.style.transform = '';
      if (el.npcLayer) el.npcLayer.style.transform = '';
    }
    return;
  }
  shakeTimer -= dt;
  const i = shakeIntensity * (shakeTimer > 0 ? 1 : 0);
  const dx = (Math.random() - 0.5) * i * 4;
  const dy = (Math.random() - 0.5) * i * 4;
  const t = `translate(${dx}px, ${dy}px)`;
  if (el.sceneBg) el.sceneBg.style.transform = t;
  if (el.worldLayer) el.worldLayer.style.transform = t;
  if (el.npcLayer) el.npcLayer.style.transform = t;
}

// ==================== 技能系统 ====================
function castSkill(idx) {
  const p = GS.player;
  const skill = getBarSkill(idx);
  if (!skill) return;
  if (p.skillCooldowns[idx] > 0) return;
  if (p.hp <= 0) return;
  // MP 檢查（普通攻擊不消耗MP）
  const mpCost = skill.mpCost || (skill.id === 'normal' ? 0 : Math.max(5, Math.floor(skill.cd * 2 + (skill.dmgMult || 1) * 5)));
  if (skill.id !== 'normal' && mpCost > 0 && p.mp < mpCost) {
    addLog('system', `魔力不足！【${skill.name}】需要 ${mpCost} MP`);
    showFloatingText('MP不足!', '#5090ff');
    return;
  }
  if (skill.id !== 'normal' && mpCost > 0) {
    p.mp = Math.max(0, p.mp - mpCost);
  }

  // 魔法寶石消耗：終極技能需要消耗魔法寶石
  if (skill.id !== 'normal') {
    const isUltimate = (skill.cd >= 30 && (skill.dmgMult || 0) >= 2) || skill.id === 'summon' || skill.id === 'infernal';
    if (isUltimate) {
      const gemItem = GS.inventory.find(i => i.id === 'mgem' && i.itemType === 'consumable');
      if (!gemItem || gemItem.count <= 0) {
        addLog('system', `魔法寶石不足！【${skill.name}】需要消耗1顆魔法寶石`);
        showFloatingText('寶石不足!', '#80c0ff');
        p.mp = Math.min(getTotalMpMax(), p.mp + mpCost); // 退還MP
        return;
      }
      gemItem.count -= 1;
      if (gemItem.count <= 0) {
        const idx = GS.inventory.indexOf(gemItem);
        if (idx >= 0) GS.inventory.splice(idx, 1);
      }
      addLog('skill', `消耗 1 顆魔法寶石施放【${skill.name}】`);
    }
  }

  // 判断技能类型
  // 技能施放：屏幕閃光（按元素顏色）
  const skillElemMap = { fire: 'rgba(255,120,40,0.35)', ice: 'rgba(100,180,255,0.35)', lightning: 'rgba(255,255,150,0.4)', holy: 'rgba(255,240,180,0.4)', dark: 'rgba(160,80,220,0.4)', poison: 'rgba(100,220,100,0.35)', heal: 'rgba(150,255,180,0.3)', slash: 'rgba(255,200,120,0.25)', arrow: 'rgba(200,220,255,0.2)', whirlwind: 'rgba(180,200,255,0.3)', shadow: 'rgba(160,80,220,0.4)', meteor: 'rgba(255,100,30,0.45)', fireball: 'rgba(255,120,40,0.35)' };
  const elemType = skill.effect || 'slash';
  const flashColor = skillElemMap[elemType] || 'rgba(255,200,120,0.25)';
  if (skill.id !== 'normal') {
    spawnScreenFlash(flashColor, 0.25);
    // 技能震動（AOE 更強）
    if (skill.type === 'aoe') shakeScreen(0.6, 0.2);
    else if (skill.cd >= 12) shakeScreen(0.3, 0.15);
  }

  if (skill.type === 'buff') {
    // 自身buff
    p.state = 'casting';
    const unit = worldLayer.querySelector('.world-unit.hero');
    playAttackAnim(unit, () => {
      p.state = 'idle';
    });
    spawnEffect(skill.effect, p.x, p.y - 28);
    addBuff(skill.id, { name: skill.desc });
    p.skillCooldowns[idx] = skill.cd;
    addLog('skill-buff', `你施放了【${skill.name}】對【自身】增加【${skill.desc || '強化效果'}】`);
    if (window.AudioSystem) AudioSystem.sfxSkill(skill.id, p.classId);
    return;
  }

  if (skill.type === 'heal') {
    p.state = 'casting';
    const unit = worldLayer.querySelector('.world-unit.hero');
    playAttackAnim(unit, () => { p.state = 'idle'; });
    spawnEffect('heal', p.x, p.y - 28);
    const healAmt = Math.floor(getTotalHpMax() * (skill.healAmt || 0.3));
    p.hp = Math.min(getTotalHpMax(), p.hp + healAmt);
    showDamage(p.x, p.y - 55, healAmt, 'heal');
    p.skillCooldowns[idx] = skill.cd;
    addLog('skill-buff', `你施放了【${skill.name}】對【自身】增加【血量 +${healAmt}】`);
    updateUI();
    if (window.AudioSystem) AudioSystem.sfxSkill(skill.id, p.classId);
    return;
  }

  if (skill.type === 'summon') {
    p.state = 'casting';
    const unit = worldLayer.querySelector('.world-unit.hero');
    playAttackAnim(unit, () => { p.state = 'idle'; });
    spawnEffect('shadow', p.x + 30, p.y - 20);
    summonDemon();
    p.skillCooldowns[idx] = skill.cd;
    addLog('system', `【${skill.name}】：召喚惡魔助戰！`);
    return;
  }

  // 目標类技能：需要目標（怪物或 AI 玩家）
  let target = GS.monsters.find(m => m.uid === GS.targetMonsterUid && m.hp > 0);
  let isAITarget = false;
  if (!target && GS.targetAiUid && GS.aiPlayers) {
    const ai = GS.aiPlayers.find(a => a.uid === GS.targetAiUid && a.hp > 0);
    if (ai) { target = ai; isAITarget = true; }
  }
  if (!target) return;

  const dist = Math.hypot(target.x - p.x, target.y - p.y);
  const castRange = skill.range || (cls.atkType === 'ranged' ? 140 : 40);
  if (dist > castRange) return;

  p.state = 'attacking';
  p.facing = target.x >= p.x ? 'right' : 'left';
  const unit = worldLayer.querySelector('.world-unit.hero');
  if (window.AudioSystem) AudioSystem.sfxSkill(skill.id, p.classId);

  playAttackAnim(unit, () => {
    p.state = 'idle';
    // 傷害结算
    const totalAtk = getTotalAtk();
    let baseDmg = totalAtk * (skill.dmgMult || 1);

    if (skill.type === 'single') {
      dealSkillDamage(target, baseDmg, skill.effect, skill);
    } else if (skill.type === 'multi') {
      const arrowCount = skill.count || 3;
      // 多重射击：每发造成 dmgMult 倍率的傷害（独立计算，每发都有独立判定）
      for (let i = 0; i < arrowCount; i++) {
        setTimeout(() => {
          // 目標可能已死，换附近目標
          const liveTarget = GS.monsters.find(m => m.uid === target.uid && m.hp > 0)
            || GS.monsters.find(m => m.hp > 0 && Math.hypot(m.x - p.x, m.y - p.y) < 200);
          if (liveTarget) {
            dealSkillDamage(liveTarget, baseDmg, skill.effect, skill);
            spawnEffect('arrow', liveTarget.x, liveTarget.y - 28);
          }
        }, i * 120);
      }
    } else if (skill.type === 'aoe') {
      // AOE：对範圍内所有怪物和敌方 AI 玩家造成傷害
      GS.monsters.forEach(m => {
        if (m.hp <= 0) return;
        const d = Math.hypot(m.x - target.x, m.y - target.y);
        if (d <= (skill.aoeRadius || 50)) {
          dealSkillDamage(m, baseDmg, skill.effect, skill, true);
        }
      });
      if (GS.aiPlayers) {
        GS.aiPlayers.forEach(ai => {
          if (ai.hp <= 0 || ai.state === 'dead') return;
          const d = Math.hypot(ai.x - target.x, ai.y - target.y);
          if (d <= (skill.aoeRadius || 50)) {
            damageAIPlayer(ai, baseDmg, 'aoe');
          }
        });
      }
    } else if (skill.type === 'dot') {
      dealSkillDamage(target, baseDmg, skill.effect, skill);
      target.dots.push({
        id: skill.id, name: skill.name,
        dmg: Math.floor(baseDmg * 0.3),
        duration: skill.duration || 8, tickTimer: 0,
      });
      addLog('skill', `${target.name} 受到【${skill.name}】持續傷害`);
    } else if (skill.type === 'drain') {
      const dealt = dealSkillDamage(target, baseDmg, skill.effect, skill);
      const heal = Math.floor(dealt * 0.5);
      p.hp = Math.min(getTotalHpMax(), p.hp + heal);
      showDamage(p.x, p.y - 55, heal, 'heal');
      updateUI();
    }
  });

  p.skillCooldowns[idx] = skill.cd;
}

function dealSkillDamage(target, baseDmg, effectType, skill, isAoe) {
  // 攻城区域地圖：未在攻城战中时所有对怪物的傷害无效
  const allMaps = getAllMaps();
  const curMap = allMaps[GS.currentMap];
  if (curMap?.type === 'castle_siege' && !castleSiegeActive) {
    return;
  }
  // AI 玩家目標走单独傷害函数
  if (target && target.uid && target.uid.startsWith && target.uid.startsWith('ai')) {
    damageAIPlayer(target, baseDmg, 'normal');
    return baseDmg;
  }
  const p = GS.player;
  const atkVal = Number(baseDmg) || 0;
  const defVal = Number(target.def) || 0;
  // 防禦按比例减伤：每点防禦减少约0.5%傷害，最多减伤75%
  const dr = Math.min(0.75, defVal * 0.005);
  let dmg = Math.max(1, atkVal * (1 - dr));
  dmg = Math.floor(dmg * (0.9 + Math.random() * 0.2));
  const critVal = Number(getTotalCrit()) || 0;
  const isCrit = critVal > 0 && Math.random() * 100 < critVal;
  if (isCrit) {
    const cdVal = Number(getTotalCritDmg()) || 150;
    dmg = Math.floor(dmg * (cdVal / 100));
  }
  if (isNaN(dmg) || dmg < 1) dmg = 1;

  // 戰吼buff & 攻擊力加成buff
  let atkBuffPct = 0;
  for (const key in p.buffs) {
    const b = p.buffs[key];
    if (typeof b === 'object' && b.type === 'atkPct') atkBuffPct += b.value;
  }
  if (p.buffs.warcry) atkBuffPct += 30; // 舊格式兼容
  if (atkBuffPct > 0) dmg = Math.floor(dmg * (1 + atkBuffPct / 100));

  target.hp = Math.max(0, target.hp - dmg);
  target.hitTimer = 0.3;
  if (target.behavior === 'passive') target.aggroed = true;
  showDamage(target.x, target.y - 50, dmg, isCrit ? 'crit' : 'normal');

  // 特效：根据技能类型 + 是否暴擊
  if (isCrit) {
    // 暴擊：大爆炸 + 屏幕震动 + 元素特效 + 紅色屏幕閃光
    spawnEffect(effectType, target.x, target.y - 28, { particles: 12, shake: 10 });
    spawnEffect('fire', target.x, target.y - 28, { isCrit: true, shakeIntensity: 8 });
    spawnScreenFlash('rgba(255,60,40,0.4)', 0.2);
    shakeScreen(0.8, 0.2);
    if (window.AudioSystem) AudioSystem.sfxCrit();
  } else {
    spawnEffect(effectType, target.x, target.y - 28);
  }

  addLog('skill-damage',
    `你施放了【${skill?.name || '攻擊'}】對【${target.name}】造成 ${dmg} 傷害${isCrit ? '（暴擊）' : ''}`);
  updateMonsterRender(target);
  if (target.hp <= 0) onMonsterDead(target);
  return dmg;
}

function addBuff(buffId, buffDesc) {
  const p = GS.player;
  if (!p.buffs) p.buffs = {};
  // 直接存buff信息：{ type, value, duration, name }
  p.buffs[buffId] = {
    type: buffDesc.type || 'atkPct',
    value: buffDesc.value || 0,
    duration: buffDesc.duration || 10,
    name: buffDesc.name || buffId,
  };
  if (buffId === 'warcry') p.buffs.warcry = { type: 'atkPct', value: 30, duration: 10, name: '戰吼' };
  if (buffId === 'dodge') p.buffs.dodge = { type: 'dodge', value: 100, duration: 3, name: '閃避' };
  if (buffId === 'shield') p.buffs.shield = { type: 'shield', value: 100, duration: 8, name: '聖盾' };
  addLog('skill-buff', `你施放了【${buffDesc.name || buffId}】，效果已生效`);
}

function summonDemon() {
  if (summonedDemon) {
    // 刷新存在時間
    summonedDemon.duration = 20;
    return;
  }
  const s = {
    id: 'demon', name: '召喚惡魔', sprite: SPRITE.warlock,
    x: GS.player.x + 25, y: GS.player.y + 12,
    targetX: 0, targetY: 0,
    hp: 150, hpMax: 150,
    atk: getTotalAtk() * 0.5,
    active: true,
    state: 'idle', facing: 'right',
    attackCooldown: 0, role: 'dps',
    duration: 20, isDemon: true,
  };
  s.targetX = s.x; s.targetY = s.y;
  GS.summons.push(s);
  summonedDemon = s;
  createSummonSprite(s);
}

function updateSkillBar() {
  const btns = el.skillBar.querySelectorAll('.skill-btn');
  btns.forEach((btn, i) => {
    const slot = GS.quickBar ? GS.quickBar[i] : null;
    const iconDiv = btn.querySelector('.skill-icon');
    const countEl = btn.querySelector('.skill-count');
    if (!iconDiv) return;

    if (!slot) {
      iconDiv.textContent = '';
      iconDiv.style.cssText = 'background:none;';
      btn.title = '空（右键設定）';
      btn.classList.add('empty');
      if (countEl) countEl.textContent = '';
    } else if (slot.type === 'skill') {
      const cls = CLASSES[GS.player.classId];
      const s = cls?.allSkills?.[slot.skillIndex];
      if (s) {
        iconDiv.innerHTML = getSkillSVG(s);
        iconDiv.style.cssText = getSkillIconBgStyle(s) + ';display:flex;align-items:center;justify-content:center;border-radius:4px;';
        btn.title = `${s.name}${s.desc ? ' - ' + s.desc : ''}${s.cd ? ' (CD:' + s.cd + 's)' : ''}`;
        btn.classList.remove('empty');
      } else {
        iconDiv.innerHTML = getSkillSVG({id:'default'});
        iconDiv.style.cssText = 'background:rgba(20,14,8,0.9);display:flex;align-items:center;justify-content:center;border-radius:4px;opacity:0.5;';
        btn.title = '未知技能';
        btn.classList.add('empty');
      }
      if (countEl) countEl.textContent = '';
    } else if (slot.type === 'item') {
      const item = GS.inventory.find(it => it.id === slot.itemId);
      const count = item ? item.count : 0;
      // 根據道具類型顯示圖資
      let itemIconKey = 'default';
      if (item) {
        if (item.id && item.id.includes('hp')) itemIconKey = 'potion_hp';
        else if (item.id && (item.id.includes('mp') || item.id.includes('mana'))) itemIconKey = 'potion_mp';
        else if (item.itemType === 'consumable') itemIconKey = 'potion_hp';
        else if (item.itemType === 'scroll') itemIconKey = 'scroll';
        else if (item.itemType === 'gem') itemIconKey = 'gem';
        else if (item.icon === '💎') itemIconKey = 'gem';
      }
      const iconUrl = ITEM_ICON_MAP[itemIconKey] || ITEM_ICON_MAP.default;
      iconDiv.innerHTML = `<img src="${iconUrl}" style="width:26px;height:26px;object-fit:cover;display:block;border-radius:4px"/>`;
      iconDiv.style.cssText = 'background:rgba(20,14,8,0.9);display:flex;align-items:center;justify-content:center;border-radius:4px;';
      btn.title = item ? `${item.name} ×${count}（點擊使用）` : '道具已用完';
      btn.classList.toggle('empty', count <= 0);
      if (countEl) countEl.textContent = count > 0 ? count : '';
    }
  });
  // 同步攻城战技能栏
  if (el.siegeSkillBar) updateSiegeSkillBar();
}

function updateSkillCdDisplay() {
  const cds = GS.player.skillCooldowns;
  for (let i = 0; i < 8; i++) {
    const btn = el.skillBar.querySelector(`[data-skill="${i}"]`);
    const cdEl = $('skill-cd-' + i);
    if (!btn || !cdEl) continue;
    const slot = GS.quickBar ? GS.quickBar[i] : null;
    if (slot?.type === 'skill' && cds[i] > 0) {
      btn.classList.add('cooling');
      cdEl.textContent = Math.ceil(cds[i]);
    } else {
      btn.classList.remove('cooling');
      cdEl.textContent = '';
    }
  }
  // 攻城战技能栏同步
  if (el.siegeSkillBar) {
    for (let i = 0; i < 8; i++) {
      const btn = el.siegeSkillBar.querySelector(`[data-skill="${i}"]`);
      const cdEl = $('siege-skill-cd-' + i);
      if (!btn || !cdEl) continue;
      const slot = GS.quickBar ? GS.quickBar[i] : null;
      if (slot?.type === 'skill' && cds[i] > 0) {
        btn.classList.add('cooling');
        cdEl.textContent = Math.ceil(cds[i]);
      } else {
        btn.classList.remove('cooling');
        cdEl.textContent = '';
      }
    }
  }
}

// 攻城战场景技能栏同步更新
function updateSiegeSkillBar() {
  if (!el.siegeSkillBar) return;
  const btns = el.siegeSkillBar.querySelectorAll('.skill-btn');
  btns.forEach((btn, i) => {
    const slot = GS.quickBar ? GS.quickBar[i] : null;
    const iconDiv = btn.querySelector('.skill-icon');
    const countEl = btn.querySelector('.skill-count');
    if (!iconDiv) return;

    if (!slot) {
      iconDiv.textContent = '';
      iconDiv.style.cssText = 'background:none;';
      btn.title = '空';
      btn.classList.add('empty');
      if (countEl) countEl.textContent = '';
    } else if (slot.type === 'skill') {
      const cls = CLASSES[GS.player.classId];
      const s = cls?.allSkills?.[slot.skillIndex];
      if (s) {
        iconDiv.innerHTML = `<div style="width:24px;height:24px">${getSkillSVG(s)}</div>`;
        iconDiv.style.cssText = getSkillIconBgStyle(s);
        btn.title = s.name;
        btn.classList.remove('empty');
      } else {
        iconDiv.innerHTML = '<div style="font-size:18px;color:#f88">?</div>';
        iconDiv.style.cssText = 'background:none;';
        btn.classList.add('empty');
      }
      if (countEl) countEl.textContent = '';
    } else if (slot.type === 'item') {
      const item = GS.inventory.find(it => it.id === slot.itemId);
      const count = item ? item.count : 0;
      let itemIconKey = 'default';
      if (item) {
        if (item.id && item.id.includes('hp')) itemIconKey = 'potion_hp';
        else if (item.id && (item.id.includes('mp') || item.id.includes('mana'))) itemIconKey = 'potion_mp';
        else if (item.itemType === 'consumable') itemIconKey = 'potion_hp';
        else if (item.icon === '💎') itemIconKey = 'gem';
      }
      const svg = SKILL_SVG_MAP[itemIconKey] || SKILL_SVG_MAP.default;
      const color = item?.rarity === 'rare' ? '#60a0ff' : (item?.rarity === 'epic' ? '#c080ff' : '#ff6060');
      iconDiv.innerHTML = `<div style="width:22px;height:22px;color:${color}">${svg}</div>`;
      iconDiv.style.cssText = 'background:rgba(30,20,10,0.9);display:flex;align-items:center;justify-content:center;border-radius:4px;';
      btn.title = item ? `${item.name} ×${count}` : '道具已用完';
      btn.classList.toggle('empty', count <= 0);
      if (countEl) countEl.textContent = count > 0 ? count : '';
    }
  });
}

// ==================== 怪物更新 ====================
function updateMonsters(dt) {
  const p = GS.player;
  GS.monsters.forEach(m => {
    if (m.hp <= 0) return;
    // 攻城战建筑不参与怪物AI（由 updateSiege 处理）
    if (m.isSiegeStructure) {
      if (m.hitTimer > 0) m.hitTimer -= dt;
      updateMonsterRender(m);
      return;
    }
    // 攻城战守卫未激活时不更新
    if (m.isSiegeDefender && !m.active) {
      updateMonsterRender(m);
      return;
    }
    if (m.hitTimer > 0) m.hitTimer -= dt;
    m.attackCooldown = Math.max(0, m.attackCooldown - dt);

    // DOT 傷害
    if (m.dots.length > 0) {
      m.dots.forEach(dot => {
        dot.tickTimer -= dt;
        dot.duration -= dt;
        if (dot.tickTimer <= 0) {
          dot.tickTimer = 1;
          m.hp = Math.max(0, m.hp - dot.dmg);
          showDamage(m.x, m.y - 50, dot.dmg, 'normal');
          updateMonsterRender(m);
          if (m.hp <= 0) onMonsterDead(m);
        }
      });
      m.dots = m.dots.filter(dot => dot.duration > 0);
    }
    if (m.hp <= 0) return;

    const dx = p.x - m.x;
    const dy = p.y - m.y;
    const dist = Math.hypot(dx, dy);

    // ========== BOSS 技能系統 ==========
    if (m.isBoss && m.bossSkills && p.hp > 0) {
      const bs = m.bossSkillState || {};
      // 冷卻倒數
      for (const sk in m.bossSkills) {
        m.bossSkills[sk].cd = Math.max(0, m.bossSkills[sk].cd - dt);
      }
      // 狂暴狀態剩餘時間
      if (bs.rageUntil && Date.now() > bs.rageUntil) {
        bs.rageUntil = 0;
      }
      const enraged = bs.rageUntil > 0;
      const atkMult = enraged ? 1.8 : 1;
      const spdMult = enraged ? 1.5 : 1;

      // 預警中：等待預警結束後釋放
      if (bs.warning) {
        bs.warningTimer -= dt;
        // 更新預警示意圈
        let warnEl = worldLayer.querySelector(`.boss-warn[data-uid="${m.uid}"]`);
        if (!warnEl) {
          warnEl = document.createElement('div');
          warnEl.className = 'boss-warn';
          warnEl.dataset.uid = m.uid;
          warnEl.style.left = bs.warning.x + 'px';
          warnEl.style.top = bs.warning.y + 'px';
          warnEl.style.width = bs.warning.radius * 2 + 'px';
          warnEl.style.height = bs.warning.radius * 2 + 'px';
          worldLayer.appendChild(warnEl);
        } else {
          warnEl.style.left = (bs.warning.type === 'charge' ? (m.x + (p.x - m.x) * 0.6) : bs.warning.x) + 'px';
          warnEl.style.top = (bs.warning.type === 'charge' ? (m.y + (p.y - m.y) * 0.6) : bs.warning.y) + 'px';
        }
        if (bs.warningTimer <= 0) {
          // 釋放技能
          const warn = bs.warning;
          if (warn.type === 'aoe') {
            // 檢查玩家是否在範圍內
            const pd = Math.hypot(p.x - warn.x, p.y - warn.y);
            if (pd <= warn.radius) {
              damagePlayer(m.atk * warn.dmgMult * atkMult, m.name);
              screenShake(8);
            }
            spawnEffect('fire', warn.x, warn.y, { particles: 20, shake: 10 });
            spawnEffect('whirlwind', warn.x, warn.y, { shake: 6 });
            addLog('system', `⚠️ BOSS【${m.name}】釋放【${warn.name}】！`);
          } else if (warn.type === 'charge') {
            const tx = warn.x, ty = warn.y;
            // 衝鋒：沿直線傷害
            const pd = Math.hypot(p.x - tx, p.y - ty);
            if (pd <= warn.radius + 40) {
              damagePlayer(m.atk * warn.dmgMult * atkMult, m.name);
              screenShake(12);
            }
            for (let i = 0; i < 15; i++) {
              const f = i / 14;
              const sx = m.x + (tx - m.x) * f;
              const sy = m.y + (ty - m.y) * f;
              spawnEffect('fire', sx, sy, { particles: 3 });
            }
            addLog('system', `⚠️ BOSS【${m.name}】發動【${warn.name}】！`);
          } else if (warn.type === 'summon') {
            // 召喚小怪
            const map = getAllMaps()[GS.currentMap];
            for (let i = 0; i < (warn.count || 3); i++) {
              const sm = createMonster(m.type, '召喚小兵', Math.max(1, m.level - 3), 'aggro');
              sm.x = m.x + (Math.random() - 0.5) * 120;
              sm.y = m.y + (Math.random() - 0.5) * 120;
              sm.summonedByBoss = m.uid;
              const smEl = worldLayer.querySelector(`[data-id="${sm.uid}"]`);
              if (smEl) {
                smEl.style.left = sm.x + 'px';
                smEl.style.top = sm.y + 'px';
                updateMonsterRender(sm);
              }
            }
            spawnEffect('dark', m.x, m.y - 20, { particles: 20, shake: 6 });
            addLog('system', `⚠️ BOSS【${m.name}】【${warn.name}】！`);
          } else if (warn.type === 'rage') {
            bs.rageUntil = Date.now() + warn.duration * 1000;
            spawnEffect('fire', m.x, m.y - 30, { isCrit: true, shakeIntensity: 12 });
            addLog('system', `🔥 BOSS【${m.name}】進入【${warn.name}】狀態！攻擊與速度大幅提升！`);
          }
          // 清理預警
          if (warnEl) warnEl.remove();
          bs.warning = null;
          m.attackCooldown = m.attackInterval * (enraged ? 0.6 : 1);
        }
      } else if (dist < 200 && canSee) {
        // 不在預警中，嘗試釋放技能（按優先級）
        const hpPct = m.hp / m.hpMax;
        const skills = m.bossSkills;
        // 狂暴：血量低於30% 且 冷卻完成
        if (skills.rage && skills.rage.cd <= 0 && hpPct < 0.3 && !enraged) {
          bs.warning = { type: 'rage', name: skills.rage.name, x: m.x, y: m.y, radius: 60, duration: skills.rage.duration };
          bs.warningTimer = 2;
          skills.rage.cd = skills.rage.maxCd;
        }
        // 召喚：血量低於50% 且 CD完成
        else if (skills.summon && skills.summon.cd <= 0 && hpPct < 0.5) {
          bs.warning = { type: 'summon', name: skills.summon.name, x: m.x, y: m.y, radius: 60, count: skills.summon.count };
          bs.warningTimer = 1.5;
          skills.summon.cd = skills.summon.maxCd;
        }
        // 衝鋒：中距離
        else if (skills.charge && skills.charge.cd <= 0 && dist > 50 && dist < 180) {
          const tx = p.x, ty = p.y;
          bs.warning = { type: 'charge', name: skills.charge.name, x: tx, y: ty, radius: skills.charge.radius, dmgMult: skills.charge.dmgMult };
          bs.warningTimer = 1.2;
          skills.charge.cd = skills.charge.maxCd;
        }
        // AOE：近距離
        else if (skills.aoe && skills.aoe.cd <= 0 && dist < 120) {
          bs.warning = { type: 'aoe', name: skills.aoe.name, x: p.x, y: p.y, radius: skills.aoe.radius, dmgMult: skills.aoe.dmgMult };
          bs.warningTimer = 1.5;
          skills.aoe.cd = skills.aoe.maxCd;
        }
      }
    }

    const canSee = m.aggroed || (dist < 200 && m.behavior === 'aggro');
    const canAttack = m.behavior === 'aggro' || m.aggroed;

    if (canSee && canAttack && p.hp > 0) {
      if (dist > 36) {
        const speed = m.behavior === 'aggro' ? 42 : 35;
        m.x += (dx / dist) * speed * dt;
        m.y += (dy / dist) * speed * dt;
        m.state = 'walking';
        m.facing = dx >= 0 ? 'right' : 'left';
      } else {
        m.state = 'idle';
        if (m.attackCooldown <= 0) {
          m.state = 'attacking';
          playAttackAnim(m.el, () => { doMonsterAttack(m); m.state = 'idle'; });
          m.attackCooldown = m.attackInterval;
        }
      }
    } else {
      // 巡逻：限制在活動範圍內
      m.wanderTimer -= dt;
      if (m.wanderTimer <= 0) {
        const r = m.wanderRadius || 100;
        m.targetX = m.homeX + (Math.random() - 0.5) * r * 2;
        m.targetY = m.homeY + (Math.random() - 0.5) * r * 1.5;
        m.targetX = Math.max(30, Math.min(worldW - 30, m.targetX));
        m.targetY = Math.max(70, Math.min(worldH - 40, m.targetY));
        m.wanderTimer = 3 + Math.random() * 3;
      }
      const tdx = m.targetX - m.x;
      const tdy = m.targetY - m.y;
      const tdist = Math.hypot(tdx, tdy);
      if (tdist > 2) {
        const speed = 20;
        m.x += (tdx / tdist) * speed * dt;
        m.y += (tdy / tdist) * speed * dt;
        m.state = 'walking';
        m.facing = tdx >= 0 ? 'right' : 'left';
      } else {
        m.state = 'idle';
      }
    }
    // 優化：視口外的怪物不更新DOM渲染（CSS已暫停動畫），節省大量樣式計算
    if (m.el && !m.el._offscreen) {
      updateMonsterRender(m);
    } else if (m.el) {
      // 仍然更新位置（只有位置變化超過閾值才設style，進一步減少回流）
      if (Math.abs(m.x - (m._lastRenderX || 0)) > 1 || Math.abs(m.y - (m._lastRenderY || 0)) > 1) {
        positionUnit(m.el, m.x, m.y, 'enemy');
        m._lastRenderX = m.x;
        m._lastRenderY = m.y;
      }
    } else {
      // 還沒緩存m.el時嘗試一次（非常罕見）
      updateMonsterRender(m);
    }
  });
}

function damagePlayer(dmg, sourceName) {
  const p = GS.player;
  if (p.hp <= 0) return;
  if (p.buffs.dodge && typeof p.buffs.dodge === 'object' && p.buffs.dodge.type === 'dodge' && Math.random() < 0.8) {
    showDamage(p.x, p.y - 55, 'MISS', 'miss');
    return;
  }
  // 舊格式兼容
  if (p.buffs.dodge && typeof p.buffs.dodge === 'number' && Math.random() < 0.8) {
    showDamage(p.x, p.y - 55, 'MISS', 'miss');
    return;
  }
  const pDef = Number(getTotalDef()) || 0;
  const dr = Math.min(0.75, pDef * 0.005);
  dmg = Math.max(1, dmg * (1 - dr));
  dmg = Math.floor(dmg * (0.9 + Math.random() * 0.2));
  if (isNaN(dmg) || dmg < 1) dmg = 1;
  const hasShield = (typeof p.buffs.shield === 'object' && p.buffs.shield.type === 'shield') || typeof p.buffs.shield === 'number';
  if (hasShield) dmg = Math.floor(dmg * 0.5);
  p.hp = Math.max(0, p.hp - dmg);
  p.hitTimer = 0.3;
  showDamage(p.x, p.y - 58, dmg, 'normal');
  if (sourceName) addLog('damage-taken', `受到【${sourceName}】的攻擊，造成 ${dmg} 傷害`);
  if (p.hp <= 0) {
    p.lastKiller = sourceName || '未知';
    p.state = 'dead';
    addLog('system', '你倒下了...');
    setTimeout(() => {
      p.hp = getTotalHpMax();
      p.mp = getTotalMpMax();
      loadMap('village');
      addLog('system', '你已復活，回到了村莊。');
    }, 2000);
  }
  updateUI();
  renderPlayer();
}
function doMonsterAttack(m) {
  const p = GS.player;
  damagePlayer(m.atk, m.name);
}

function onMonsterDead(m) {
  if (window.AudioSystem) AudioSystem.sfxKillMonster();
  // 攻城战建筑/守卫死亡特殊处理：无經驗、无金幣、推进攻城战阶段
  if (m.isSiegeStructure || m.isSiegeDefender) {
    GS.targetMonsterUid = null;
    // 推进攻城战阶段（城门破→守護塔，守護塔破→城主，城主亡→权杖，权杖破→胜利）
    if (m.isSiegeStructure) {
      handleSiegeUnitDeath(m);
    }
    setTimeout(() => {
      const el = worldLayer.querySelector(`[data-id="${m.uid}"]`);
      if (el) el.remove();
    }, 800);
    return;
  }
  GS.killCount++;
  el.killCount.textContent = GS.killCount;
  if (!GS.player.kills) GS.player.kills = 0;
  GS.player.kills++;
  // 記入怪物圖鑑
  if (!GS.killedMonsters) GS.killedMonsters = [];
  if (!GS.killedMonsters.includes(m.type)) {
    GS.killedMonsters.push(m.type);
  }

  // Boss 死亡处理
  if (m.isBoss) {
    const map = getAllMaps()[GS.currentMap];
    if (map?.boss) onBossKilled(GS.currentMap, map.boss);
  }
  const exp = m.level * 10;
  let gold = m.level * 5 + Math.floor(Math.random() * 5);
  GS.player.exp += exp;

  // 城堡税收
  const allMaps = getAllMaps();
  const map = allMaps[GS.currentMap];
  if (map?.castle) {
    const castle = CASTLES.find(c => c.id === map.castle);
    if (castle && castle.owner === 'player') {
      const tax = Math.floor(gold * castle.taxRate / 100);
      GS.castleTreasuries[castle.id] += tax;
      gold -= tax;
    }
  }
  GS.resources.gold += gold;
  addLog('loot', `擊敗 ${m.name}，獲得 ${exp} 經驗，${gold} 金幣`);
  if (window.AudioSystem) AudioSystem.sfxCoin();

  // 裝備/宝物掉落
  const drops = rollDrops(m);
  drops.forEach(item => {
    addToInventory(item, 1);
    showDamage(m.x, m.y - 70, `+${item.name}`, 'heal');
    addLog('loot', `🎁 獲得 ${RARITY_CONFIG[item.rarity].name}【${item.name}】`);
  });

  while (GS.player.exp >= GS.player.expMax) {
    GS.player.exp -= GS.player.expMax;
    GS.player.level++;
    GS.player.expMax = Math.floor(GS.player.expMax * 1.3);
    // 等級屬性提升按职业
    const cls = CLASSES[GS.player.classId];
    GS.player.hpMax += Math.floor(cls.baseStats.hpMax * 0.08);
    GS.player.atk += Math.floor(cls.baseStats.atk * 0.06);
    GS.player.def += Math.floor(cls.baseStats.def * 0.05);
    GS.player.hp = GS.player.hpMax;
    addLog('system', `🎉 升級！達到 Lv.${GS.player.level}`);
    if (window.AudioSystem) AudioSystem.sfxLevelUp();
    // 刷新變身解锁状态（等級提升可能解锁新變身）

  }

  if (m.type === 'goblin') {
    GS.quest.current = Math.min(GS.quest.total, GS.quest.current + 1);
    el.questCurrent.textContent = GS.quest.current;
  }

  setTimeout(() => {
    const el = worldLayer.querySelector(`[data-id="${m.uid}"]`);
    if (el) el.remove();
    GS.monsters = GS.monsters.filter(x => x.uid !== m.uid);
    if (GS.targetMonsterUid === m.uid) GS.targetMonsterUid = null;
    if (allMaps[GS.currentMap]?.type === 'battle' && GS.monsters.length < 6) {
      setTimeout(() => respawnMonster(), 4000);
    }
  }, 1200);
  updateUI();
}

// ==================== 裝備/宝物掉落系统 ====================
function rollDrops(m) {
  const drops = [];
  const level = m.level || 1;

  // 普通裝備掉落概率（随等級提升而降低，越高等級越稀有）
  let equipChance;
  if (level <= 10) equipChance = 0.30;
  else if (level <= 20) equipChance = 0.24;
  else if (level <= 30) equipChance = 0.18;
  else if (level <= 50) equipChance = 0.12;
  else equipChance = 0.075;
  if (Math.random() < equipChance) {
    const equip = rollEquipment(level);
    if (equip) drops.push(equip);
  }

  // 道具掉落（藥水/卷軸/強化石）
  const itemChance = Math.min(0.5, 0.15 + level * 0.008);
  if (Math.random() < itemChance) {
    const item = rollConsumableDrop(level, m.isBoss);
    if (item) drops.push(item);
  }

  // 宝物掉落（更低概率）
  const treasureChance = Math.min(0.1, 0.01 + level * 0.003);
  if (Math.random() < treasureChance) {
    const treasure = rollTreasure(level);
    if (treasure) drops.push(treasure);
  }

  // BOSS 掉落一件高品質裝備（機率較高但非100%，等級越高機率略降）
  if (m.isBoss) {
    const bossEquipChance = level <= 20 ? 0.85 : level <= 40 ? 0.75 : 0.65;
    if (Math.random() < bossEquipChance) {
      const equip = rollEquipment(level, 'blue');
      if (equip) drops.push(equip);
    }
    if (Math.random() < 0.3) {
      const treasure = rollTreasure(level, 'red');
      if (treasure) drops.push(treasure);
    }
    // Boss必掉神秘寶箱（低級機率，高級必掉）
    if (level >= 30 || Math.random() < 0.5) {
      drops.push({ id: 'mystery_chest', name: '神秘寶箱', type: 'consumable', itemType: 'treasure', rarity: 'purple', icon: ITEM_ICONS.chest, count: 1, desc: '隨機開出道具或裝備' });
    }
  }

  return drops;
}

// 掉落道具按等級分配
function rollConsumableDrop(level, isBoss) {
  // 低級（1-15）：白綠裝備 + 小型藥水
  // 中級（15-30）：藍裝備 + 中型藥水 + 初級強化石
  // 高級（30-50）：紅裝備 + 高級藥水 + 中級強化石 + 卷軸
  // 頂級（50+）：紫金裝備 + 高級強化石 + 各類卷軸
  const pool = [];
  // 藥水類（各等級都掉）
  if (level < 10) {
    pool.push({ item: { id: 'hp1', name: '小型生命藥水', type: 'consumable', itemType: 'consumable', rarity: 'white', icon: ITEM_ICONS.hp1, effect: { hp: 50 } }, w: 40 });
    pool.push({ item: { id: 'mp1', name: '小型魔力藥水', type: 'consumable', itemType: 'consumable', rarity: 'white', icon: ITEM_ICONS.mp1, effect: { mp: 30 } }, w: 20 });
  } else if (level < 25) {
    pool.push({ item: { id: 'hp2', name: '中型生命藥水', type: 'consumable', itemType: 'consumable', rarity: 'green', icon: ITEM_ICONS.hp2, effect: { hp: 200 } }, w: 35 });
    pool.push({ item: { id: 'mp2', name: '中型魔力藥水', type: 'consumable', itemType: 'consumable', rarity: 'green', icon: ITEM_ICONS.mp2, effect: { mp: 100 } }, w: 20 });
    pool.push({ item: { id: 'move1', name: '行走加速藥水', type: 'consumable', itemType: 'consumable', rarity: 'green', icon: ITEM_ICONS.move1, effect: { moveSpeed: 20, duration: 3600 } }, w: 8 });
    pool.push({ item: { id: 'town_scroll', name: '回城卷軸', type: 'consumable', itemType: 'consumable', rarity: 'green', icon: ITEM_ICONS.teleport, effect: { teleport: 'town' } }, w: 5 });
    pool.push({ item: { id: 'enhance_stone_low', name: '初級強化石', type: 'consumable', itemType: 'material', rarity: 'white', icon: ITEM_ICONS.enhance_stone, effect: { enhance: [1,3] } }, w: 12 });
  } else if (level < 45) {
    pool.push({ item: { id: 'hp4', name: '體力藥水', type: 'consumable', itemType: 'consumable', rarity: 'blue', icon: ITEM_ICONS.hp3, effect: { hp: 500 } }, w: 25 });
    pool.push({ item: { id: 'mp4', name: '高級魔力藥水', type: 'consumable', itemType: 'consumable', rarity: 'blue', icon: ITEM_ICONS.mp3, effect: { mp: 200 } }, w: 15 });
    pool.push({ item: { id: 'spd1', name: '加速藥水', type: 'consumable', itemType: 'consumable', rarity: 'blue', icon: ITEM_ICONS.spd1, effect: { atkSpeed: 20, moveSpeed: 20, duration: 1800 } }, w: 10 });
    pool.push({ item: { id: 'enhance_stone_mid', name: '中級強化石', type: 'consumable', itemType: 'material', rarity: 'green', icon: ITEM_ICONS.bless_stone, effect: { enhance: [4,6] } }, w: 15 });
    pool.push({ item: { id: 'mgem', name: '魔法寶石', type: 'consumable', itemType: 'material', rarity: 'blue', icon: ITEM_ICONS.mgem, effect: {} }, w: 10 });
    pool.push({ item: { id: 'town_scroll', name: '回城卷軸', type: 'consumable', itemType: 'consumable', rarity: 'green', icon: ITEM_ICONS.teleport, effect: { teleport: 'town' } }, w: 5 });
  } else {
    pool.push({ item: { id: 'hp4', name: '體力藥水', type: 'consumable', itemType: 'consumable', rarity: 'blue', icon: ITEM_ICONS.hp3, effect: { hp: 500 } }, w: 20 });
    pool.push({ item: { id: 'mp4', name: '高級魔力藥水', type: 'consumable', itemType: 'consumable', rarity: 'blue', icon: ITEM_ICONS.mp3, effect: { mp: 200 } }, w: 12 });
    pool.push({ item: { id: 'spd2', name: '狂暴藥水', type: 'consumable', itemType: 'consumable', rarity: 'red', icon: ITEM_ICONS.spd2, effect: { atkSpeed: 30, moveSpeed: 30, duration: 1800 } }, w: 8 });
    pool.push({ item: { id: 'enhance_stone_high', name: '高級強化石', type: 'consumable', itemType: 'material', rarity: 'blue', icon: ITEM_ICONS.crystal_frag, effect: { enhance: [7,9] } }, w: 12 });
    pool.push({ item: { id: 'revive_scroll', name: '復活卷軸', type: 'consumable', itemType: 'consumable', rarity: 'red', icon: ITEM_ICONS.revive_scroll, effect: { revive: true } }, w: 5 });
     pool.push({ item: { id: 'tscroll', name: '變身卷軸', type: 'consumable', itemType: 'consumable', rarity: 'purple', icon: ITEM_ICONS.tscroll, effect: {} }, w: 3 });
     pool.push({ item: { id: 'mgem', name: '魔法寶石', type: 'consumable', itemType: 'material', rarity: 'blue', icon: ITEM_ICONS.mgem, effect: {} }, w: 10 });
     pool.push({ item: { id: 'bag_expand_scroll', name: '背包擴充卷', type: 'consumable', itemType: 'consumable', rarity: 'purple', icon: ITEM_ICONS.quest_scroll, effect: { bagExpand: true } }, w: 1 });
   }
  // Boss加碼：增加高級道具權重
  if (isBoss) {
    pool.push({ item: { id: 'enhance_stone_high', name: '高級強化石', type: 'consumable', itemType: 'material', rarity: 'blue', icon: ITEM_ICONS.crystal_frag, effect: { enhance: [7,9] } }, w: 20 });
    pool.push({ item: { id: 'revive_scroll', name: '復活卷軸', type: 'consumable', itemType: 'consumable', rarity: 'red', icon: ITEM_ICONS.revive_scroll, effect: { revive: true } }, w: 15 });
  }
  if (pool.length === 0) return null;
  const total = pool.reduce((a,b) => a + b.w, 0);
  let r = Math.random() * total;
  for (const p of pool) {
    r -= p.w;
    if (r <= 0) return p.item;
  }
  return pool[0].item;
}

function rollEquipment(level, minRarity) {
  // 根据等級决定最高可掉落稀有度
  let maxRarity = 'white';
  if (level >= 5) maxRarity = 'green';
  if (level >= 15) maxRarity = 'blue';
  if (level >= 30) maxRarity = 'red';
  if (level >= 50) maxRarity = 'purple';
  if (level >= 80) maxRarity = 'gold';

  if (minRarity) {
    const minIdx = RARITY_ORDER.indexOf(minRarity);
    const maxIdx = RARITY_ORDER.indexOf(maxRarity);
    if (maxIdx < minIdx) maxRarity = minRarity;
  }

  // 抽取稀有度（低概率出高稀有度）
  const rarity = rollRarity(maxRarity);

  // 从对应稀有度的裝備中随机选一个
  const candidates = EQUIP_POOL.filter(e => e.rarity === rarity);
  if (candidates.length === 0) {
    const fallback = EQUIP_POOL.filter(e => e.rarity === 'white');
    return { ...fallback[0], itemType: 'equipment' };
  }
  return { ...candidates[Math.floor(Math.random() * candidates.length)], itemType: 'equipment' };
}

function rollTreasure(level, minRarity) {
  let maxRarity = 'blue';
  if (level >= 20) maxRarity = 'red';
  if (level >= 40) maxRarity = 'purple';
  if (level >= 70) maxRarity = 'gold';
  if (minRarity) {
    const minIdx = RARITY_ORDER.indexOf(minRarity);
    const maxIdx = RARITY_ORDER.indexOf(maxRarity);
    if (maxIdx < minIdx) maxRarity = minRarity;
  }
  const rarity = rollRarity(maxRarity);
  const candidates = TREASURE_POOL.filter(t => t.rarity === rarity);
  if (candidates.length === 0) return null;
  return { ...candidates[Math.floor(Math.random() * candidates.length)], itemType: 'treasure' };
}

function rollRarity(maxRarity) {
  const maxIdx = RARITY_ORDER.indexOf(maxRarity);
  // 从最高稀有度往下按概率抽取（史詩/傳說/神話 掉落率減半）
  const weights = [100, 40, 15, 2.5, 0.75, 0.15]; // 白绿蓝红紫金（红/紫/金减半）
  const valid = weights.slice(0, maxIdx + 1);
  const total = valid.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = valid.length - 1; i >= 0; i--) {
    r -= valid[i];
    if (r <= 0) return RARITY_ORDER[i];
  }
  return RARITY_ORDER[0];
}

// ==================== 背包系统 ====================
const BAG_BASE_SLOTS = 60;   // 初始背包容量
const BAG_MAX_SLOTS = 200;   // 背包最大容量
const BAG_EXPAND_COST = 100; // 擴充卷軸鑽石價

function addToInventory(item, count) {
  count = count || 1;
  const existing = GS.inventory.find(i => i.id === item.id && i.itemType === item.itemType);
  if (existing) {
    existing.count = (existing.count || 1) + count;
  } else {
    // 新物品需要占用一格：檢查背包容量
    const maxSlots = GS.bagMaxSlots || BAG_BASE_SLOTS;
    if (GS.inventory.length >= maxSlots) {
      addLog('system', `背包已滿，無法獲得【${item.name}】！`);
      showFloatingText('背包已滿!', '#ff6040');
      return false;
    }
    GS.inventory.push({ ...item, count: count });
  }
  // 裝備自動記入圖鑑
  if (item.itemType === 'equipment') recordEquipToCodex(item.id);
  updateUI();
  return true;
}

function removeFromInventory(itemId, itemType, count) {
  count = count || 1;
  const idx = GS.inventory.findIndex(i => i.id === itemId && i.itemType === itemType);
  if (idx < 0) return false;
  GS.inventory[idx].count -= count;
  if (GS.inventory[idx].count <= 0) GS.inventory.splice(idx, 1);
  updateUI();
  return true;
}

function getInventoryByCategory(category) {
  if (category === 'all') return GS.inventory;
  const typeMap = {
    equipment: 'equipment',
    consumable: 'consumable',
    card: 'card',
    treasure: 'treasure',
    material: 'material',
  };
  return GS.inventory.filter(i => i.itemType === typeMap[category]);
}

// 裝備穿戴
function equipItem(item) {
  if (item.itemType !== 'equipment') return;
  let slot = item.type;
  // 飾品類型自動分配到 ring1 / ring2 空位
  if (slot === 'accessory') {
    if (!GS.equipment.ring1) slot = 'ring1';
    else if (!GS.equipment.ring2) slot = 'ring2';
    else {
      // 都有裝備，替換 ring1
      slot = 'ring1';
    }
  }
  const oldEquip = GS.equipment[slot];
  if (oldEquip) {
    addToInventory(oldEquip, 1);
  }
  GS.equipment[slot] = { ...item };
  removeFromInventory(item.id, item.itemType, 1);
  recordEquipToCodex(item.id);
  // 重新計算戰力
  calcCP();
  updateUI();
}

// 卸下裝備
function unequipItem(slot) {
  const item = GS.equipment[slot];
  if (!item) return;
  addToInventory(item, 1);
  delete GS.equipment[slot];
  calcCP();
  updateUI();
}

// ========== 裝備詳情彈窗 ==========
function openEquipDetailModal(slotId) {
  const slotInfo = EQUIP_SLOTS.find(e => e.id === slotId);
  const eq = GS.equipment[slotId];
  const body = $('equip-detail-body');
  if (!body) return;
  const slotIconUrl = s => getEquipIcon(s);

  if (eq) {
    const rc = RARITY_CONFIG[eq.rarity] || RARITY_CONFIG.white;
    const statNameMap = { atk: '攻擊力', def: '防禦力', hpMax: '最大生命', crit: '暴擊率', critDmg: '暴擊傷害' };
    const statRows = Object.entries(eq.baseStats || {}).map(([k, v]) => {
      return `<div class="equip-detail-stat-row">
        <span class="stat-name">${statNameMap[k] || k}</span>
        <span class="stat-value">+${v}${k === 'crit' || k === 'critDmg' ? '%' : ''}</span>
      </div>`;
    }).join('');
    body.innerHTML = `
      <div class="equip-detail-header">
        <div class="equip-detail-icon" style="display:flex;align-items:center;justify-content:center"><img src="${eq.icon || slotIconUrl(slotId)}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;display:block"/></div>
        <div class="equip-detail-name">${eq.name}</div>
        <div class="equip-detail-rarity" style="color:${rc.color};text-shadow:0 0 8px ${rc.color}">${rc.name}</div>
      </div>
      <div class="equip-detail-stats">${statRows || '<div style="text-align:center;color:#888;font-size:11px">無附加屬性</div>'}</div>
      <div class="equip-detail-desc">${eq.desc || '一件品質精良的裝備。'}</div>
      <div class="equip-detail-actions">
        <button class="equip-detail-btn secondary" id="equip-detail-unequip">卸下</button>
        <button class="equip-detail-btn" id="equip-detail-close-btn">確定</button>
      </div>
    `;
    body.querySelector('#equip-detail-unequip').addEventListener('click', () => {
      unequipItem(slotId);
      closeEquipDetailModal();
      // 刷新人物頁
      if (el.pageContent && el.sidePage?.classList.contains('open') && GS.heroPageTab === 'equip') {
        el.pageContent.innerHTML = renderHeroPage();
        bindPageEvents('hero');
      }
    });
    body.querySelector('#equip-detail-close-btn').addEventListener('click', closeEquipDetailModal);
  } else {
    // 找背包中可裝備到此部位的
    const candidates = GS.inventory.filter(it => it.itemType === 'equipment' && it.type === slotId);
    body.innerHTML = `
      <div class="equip-detail-header">
        <div class="equip-detail-icon" style="opacity:0.5;display:flex;align-items:center;justify-content:center"><img src="${slotIconUrl(slotId)}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;display:block;filter:grayscale(0.5)"/></div>
        <div class="equip-detail-name" style="color:#aaa">${slotInfo?.name || slotId}</div>
        <div class="equip-detail-rarity" style="color:#888">未裝備</div>
      </div>
      <div class="empty-slot-actions">
        <div class="empty-desc">背包中可裝備數量：<b style="color:#d4a020">${candidates.length}</b> 件</div>
        <button class="go-bag-btn" id="equip-detail-go-bag">前往背包</button>
      </div>
      <div class="equip-detail-actions" style="margin-top:16px">
        <button class="equip-detail-btn secondary" id="equip-detail-close-btn">關閉</button>
      </div>
    `;
    body.querySelector('#equip-detail-go-bag').addEventListener('click', () => {
      closeEquipDetailModal();
      GS.bagPage = { tab: 'equipment' };
      el.pageContent.innerHTML = renderBagPage();
      bindBagPageEvents();
      $('page-title').textContent = '背包';
    });
    body.querySelector('#equip-detail-close-btn').addEventListener('click', closeEquipDetailModal);
  }
  $('equip-detail-modal').classList.add('open');
}
function closeEquipDetailModal() {
  $('equip-detail-modal').classList.remove('open');
}

// 从裝備获取的总屬性
function getEquipStats() {
  const stats = { atk: 0, def: 0, hpMax: 0, crit: 0, critDmg: 0 };
  Object.values(GS.equipment).forEach(eq => {
    if (!eq?.baseStats) return;
    Object.keys(stats).forEach(key => {
      stats[key] += Number(eq.baseStats[key]) || 0;
    });
  });
  return stats;
}

function respawnMonster() {
  const allMaps = getAllMaps();
  const map = allMaps[GS.currentMap];
  if (!map || map.type !== 'battle') return;
  if (GS.monsters.length >= 8) return;
  const spec = map.monsters[Math.floor(Math.random() * map.monsters.length)];
  const level = spec.level + Math.floor(Math.random() * 3);
  const isAggro = Math.random() > 0.6;
  createMonster(spec.type, spec.name, level, isAggro ? 'aggro' : 'passive');
}

// ==================== 召喚更新 ====================
function updateSummons(dt) {
  const target = GS.monsters.find(m => m.uid === GS.targetMonsterUid && m.hp > 0)
    || GS.monsters.find(m => m.hp > 0);

  GS.summons.forEach(s => {
    if (!s.active || s.hp <= 0) return;
    s.attackCooldown = (s.attackCooldown || 0) - dt;
    if (s.isDemon) {
      s.duration -= dt;
      if (s.duration <= 0) {
        s.active = false;
        const el = worldLayer.querySelector(`[data-id="${s.id}"]`);
        if (el) el.remove();
        summonedDemon = null;
        addLog('system', '召喚惡魔消失了');
        return;
      }
    }

    if (target && GS.autoMode) {
      const dx = target.x - s.x;
      const dy = target.y - s.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 36) {
        const speed = 60;
        s.x += (dx / dist) * speed * dt;
        s.y += (dy / dist) * speed * dt;
        s.state = 'walking';
        s.facing = dx >= 0 ? 'right' : 'left';
      } else {
        s.state = 'idle';
        if (s.attackCooldown <= 0) {
          s.state = 'attacking';
          const sEl = worldLayer.querySelector(`[data-id="${s.id}"]`);
          playAttackAnim(sEl, () => {
            const dmg = Math.floor(s.atk * (0.9 + Math.random() * 0.2));
            target.hp = Math.max(0, target.hp - dmg);
            target.hitTimer = 0.3;
            showDamage(target.x, target.y - 50, dmg, 'normal');
            updateMonsterRender(target);
            if (target.hp <= 0) onMonsterDead(target);
            s.state = 'idle';
          });
          s.attackCooldown = 1.3;
        }
      }
    } else {
      const dx = GS.player.x - s.x + 25;
      const dy = GS.player.y - s.y + 10;
      const dist = Math.hypot(dx, dy);
      if (dist > 45) {
        const speed = 70;
        s.x += (dx / dist) * speed * dt;
        s.y += (dy / dist) * speed * dt;
        s.state = 'walking';
        s.facing = dx >= 0 ? 'right' : 'left';
      } else {
        s.state = 'idle';
      }
    }
    updateSummonRender(s);
  });
}

// ==================== 飘字 / 特效 ====================
function showDamage(x, y, value, type) {
  const el = document.createElement('div');
  el.className = 'damage-number dmg-num ' + (type || 'normal');
  el.textContent = value;
  // 傷害数字以x为中心向左右两侧轻微偏移
  el.style.left = x + 'px';
  el.style.top = (y - 10) + 'px';
  el.style.transform = 'translateX(-50%)';
  damageLayer.appendChild(el);
  // 普通命中也有轻微震屏+闪光
  if (type === 'normal' && el.scene) {
    el.scene.classList.remove('hit-shake');
    void el.scene.offsetWidth;
    el.scene.classList.add('hit-shake');
    setTimeout(() => el.scene.classList.remove('hit-shake'), 200);
    // 命中闪光
    const flash = document.createElement('div');
    flash.className = 'hit-flash';
    flash.style.left = (x - 20) + 'px';
    flash.style.top = (y - 20) + 'px';
    effectLayer.appendChild(flash);
    setTimeout(() => flash.remove(), 200);
  }
  setTimeout(() => el.remove(), type === 'crit' ? 1400 : 900);
}

function showFloatingText(text, color) {
  const el = document.createElement('div');
  el.className = 'damage-number dmg-num mp-text';
  el.textContent = text;
  el.style.color = color || '#fff';
  el.style.fontSize = '13px';
  el.style.fontWeight = '700';
  el.style.left = GS.player.x + 'px';
  el.style.top = (GS.player.y - 70) + 'px';
  el.style.transform = 'translateX(-50%)';
  el.style.textShadow = '0 0 4px #000, 0 1px 2px #000';
  damageLayer.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// 屏幕閃光特效（技能施放、暴擊、Boss 技能）
function spawnScreenFlash(color, duration) {
  if (!el.scene) return;
  const flash = document.createElement('div');
  flash.className = 'screen-flash-effect';
  flash.style.background = color;
  flash.style.animationDuration = (duration || 0.2) + 's';
  el.scene.appendChild(flash);
  setTimeout(() => flash.remove(), (duration || 0.2) * 1000 + 20);
}

function spawnEffect(type, x, y, opts = {}) {
  // 元素类型映射到特效分类
  const ELEMENT_MAP = {
    fire: 'fire', fireball: 'fire', meteor: 'fire', fire_blast: 'fire',
    ice: 'ice', frost: 'ice', ice_lance: 'ice', frost_nova: 'ice', blizzard: 'ice',
    lightning: 'lightning', thunder: 'lightning', chain_lightning: 'lightning', thunder_strike: 'lightning',
    holy: 'holy', judgment: 'holy', holy_smite: 'holy', divine_shield: 'holy', healing_light: 'heal',
    dark: 'dark', shadow: 'dark', shadow_bolt: 'dark', life_drain: 'dark', dark_curse: 'dark',
    poison: 'poison', toxic: 'poison', deadly_poison: 'poison', poison_arrow: 'poison', poison_blade: 'poison',
    heal: 'heal', healing: 'heal',
    slash: 'slash', physical: 'slash', melee: 'slash', power_strike: 'slash', heavy_strike: 'slash',
    arrow: 'arrow', ranged: 'arrow', arrow_shot: 'arrow', multi_shot: 'arrow',
    whirlwind: 'whirlwind', aoe: 'whirlwind',
    summon: 'dark', buff: 'holy', shield: 'holy',
  };
  const elem = ELEMENT_MAP[type] || 'slash';

  // 暴擊大爆炸 + 屏幕震动 + 大量粒子
  if (opts.isCrit) {
    const boom = document.createElement('div');
    boom.className = 'crit-big-boom';
    boom.style.left = x + 'px';
    boom.style.top = y + 'px';
    effectLayer.appendChild(boom);
    setTimeout(() => boom.remove(), 500);
    // 強化屏幕震动（暴擊专用强烈版）
    if (el.scene) {
      el.scene.style.animation = 'none';
      el.scene.offsetHeight;
      el.scene.classList.remove('crit-screen-shake');
      void el.scene.offsetWidth;
      el.scene.classList.add('crit-screen-shake');
      setTimeout(() => el.scene.classList.remove('crit-screen-shake'), 450);
    }
    // 暴擊闪光叠加
    if (el.scene) {
      const flash = document.createElement('div');
      flash.className = 'crit-flash-overlay';
      el.scene.appendChild(flash);
      setTimeout(() => flash.remove(), 300);
    }
    // 暴擊附加28个粒子（更大範圍）
    for (let i = 0; i < 28; i++) {
      const p = document.createElement('div');
      p.className = 'fx-particle';
      const angle = (i / 28) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 70 + Math.random() * 60;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist - 10;
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.background = 'radial-gradient(circle, #fff0a0, #ff8020 60%, #c02010)';
      p.style.boxShadow = '0 0 14px rgba(255,200,60,1)';
      p.style.width = (8 + Math.random() * 10) + 'px';
      p.style.height = p.style.width;
      p.style.setProperty('--tx', tx + 'px');
      p.style.setProperty('--ty', ty + 'px');
      p.style.animation = 'fxFireParticlePro 0.8s ease-out forwards';
      effectLayer.appendChild(p);
      setTimeout(() => p.remove(), 800);
    }
    return;
  }

  // 挥砍/普通攻擊：弧形光效 + 冲击波纹（按职业区分颜色）
  if (elem === 'slash' || elem === 'arrow') {
    const arc = document.createElement('div');
    arc.className = 'slash-arc';
    arc.style.left = x + 'px';
    arc.style.top = y + 'px';
    if (opts.direction === 'left') arc.style.transform = 'translate(-50%,-50%) scaleX(-1) rotate(-30deg)';
    // 職業顏色：戰士紅/法師藍/弓箭手綠/刺客紫/聖騎金
    const classColor = opts.classColor || (elem === 'arrow' ? '#60e080' : '#ff8060');
    arc.style.background = `radial-gradient(ellipse at center, ${classColor}22, ${classColor}55 40%, transparent 70%)`;
    arc.style.boxShadow = `0 0 20px ${classColor}, inset 0 0 12px ${classColor}`;
    arc.style.borderColor = classColor;
    effectLayer.appendChild(arc);
    setTimeout(() => arc.remove(), 300);
    const ripple = document.createElement('div');
    ripple.className = 'hit-ripple';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.style.borderColor = classColor;
    ripple.style.boxShadow = `0 0 12px ${classColor}`;
    effectLayer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 350);
    // 命中閃光粒子（8 個）
    for (let i = 0; i < 8; i++) {
      const p = document.createElement('div');
      p.className = 'fx-particle';
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 20 + Math.random() * 25;
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.background = `radial-gradient(circle, #fff, ${classColor})`;
      p.style.boxShadow = `0 0 8px ${classColor}`;
      p.style.width = (3 + Math.random() * 4) + 'px';
      p.style.height = p.style.width;
      p.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
      p.style.animation = 'fxSpark 0.5s ease-out forwards';
      effectLayer.appendChild(p);
      setTimeout(() => p.remove(), 500);
    }
    return;
  }

  // 治疗/护盾：光环 + 粒子上升
  if (elem === 'heal') {
    const elDiv = document.createElement('div');
    elDiv.className = 'skill-effect heal-effect';
    elDiv.style.left = x + 'px';
    elDiv.style.top = y + 'px';
    effectLayer.appendChild(elDiv);
    setTimeout(() => elDiv.remove(), 900);
    // 上升粒子
    for (let i = 0; i < 6; i++) {
      const p = document.createElement('div');
      p.className = 'fx-particle';
      p.style.left = (x + (Math.random() - 0.5) * 30) + 'px';
      p.style.top = y + 'px';
      p.style.background = 'radial-gradient(circle, #b0ffb0, #40c060)';
      p.style.boxShadow = '0 0 6px rgba(120,255,140,0.7)';
      p.style.animation = `fxHolyParticle ${0.6 + Math.random() * 0.4}s ease-out forwards`;
      p.style.setProperty('--tx', '0px');
      p.style.setProperty('--ty', (-30 - Math.random() * 30) + 'px');
      effectLayer.appendChild(p);
      setTimeout(() => p.remove(), 1000);
    }
    return;
  }

  // 旋风斩：金色圆环 + 内圈粒子
  if (elem === 'whirlwind') {
    const elDiv = document.createElement('div');
    elDiv.className = 'skill-effect whirlwind-effect';
    elDiv.style.left = x + 'px';
    elDiv.style.top = y + 'px';
    effectLayer.appendChild(elDiv);
    setTimeout(() => elDiv.remove(), 600);
    return;
  }

  // 元素技能：三层结构（光圈 + 粒子 + 闪光）
  const wrapper = document.createElement('div');
  wrapper.className = 'fx-' + elem;
  wrapper.style.position = 'absolute';
  wrapper.style.left = x + 'px';
  wrapper.style.top = y + 'px';
  wrapper.style.pointerEvents = 'none';

  // 底层：光圈
  const ring = document.createElement('div');
  ring.className = 'fx-ring';
  ring.style.width = (opts.size || 100) + 'px';
  ring.style.height = (opts.size || 100) + 'px';
  wrapper.appendChild(ring);

  // 顶层：闪光
  const flash = document.createElement('div');
  flash.className = 'fx-flash';
  flash.style.width = (opts.size ? opts.size * 0.7 : 70) + 'px';
  flash.style.height = (opts.size ? opts.size * 0.7 : 70) + 'px';
  wrapper.appendChild(flash);

  effectLayer.appendChild(wrapper);

  // 中层：粒子（从中心向四周扩散，数量更多更密）
  const pCount = opts.particles || 14;
  for (let i = 0; i < pCount; i++) {
    const p = document.createElement('div');
    p.className = 'fx-particle';
    const angle = (i / pCount) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 30 + Math.random() * 25;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist - 10;
    p.style.left = '50%';
    p.style.top = '50%';
    p.style.setProperty('--tx', tx + 'px');
    p.style.setProperty('--ty', ty + 'px');
    p.style.width = (5 + Math.random() * 5) + 'px';
    p.style.height = p.style.width;
    wrapper.appendChild(p);
    // 单个粒子移除
    setTimeout(() => p.remove(), 800);
  }

  // 元素技能触发轻微屏幕震动
  if (opts.shake) screenShake(opts.shake);

  // 整体移除
  setTimeout(() => wrapper.remove(), 900);
}

// 屏幕震动
function screenShake(intensity = 6) {
  if (!el.scene) return;
  el.scene.style.animation = 'none';
  el.scene.offsetHeight; // 触发reflow
  el.scene.style.setProperty('--shake-int', intensity + 'px');
  el.scene.classList.remove('screen-shake');
  // 用内联样式适配强度
  const style = document.createElement('style');
  const id = 'shake-style-' + Date.now();
  style.id = id;
  style.textContent = `
    @keyframes screenShakeDyn {
      0%, 100% { transform: translate(0, 0); }
      10% { transform: translate(${-intensity}px, ${intensity * 0.5}px); }
      20% { transform: translate(${intensity * 0.8}px, ${-intensity * 0.8}px); }
      30% { transform: translate(${-intensity * 0.7}px, ${intensity * 0.7}px); }
      40% { transform: translate(${intensity}px, ${-intensity * 0.5}px); }
      50% { transform: translate(${-intensity * 0.5}px, ${intensity * 0.5}px); }
      60% { transform: translate(${intensity * 0.6}px, ${-intensity * 0.3}px); }
      70% { transform: translate(${-intensity * 0.4}px, ${intensity * 0.2}px); }
      80% { transform: translate(${intensity * 0.3}px, ${-intensity * 0.3}px); }
      90% { transform: translate(${-intensity * 0.2}px, ${intensity * 0.1}px); }
    }
  `;
  document.head.appendChild(style);
  el.scene.style.animation = 'screenShakeDyn 0.4s ease-out';
  setTimeout(() => {
    el.scene.style.animation = '';
    style.remove();
  }, 400);
}

function validatePlayerName(name) {
  if (!name) return '名称不能為空';
  const trimmed = name.trim();
  if (trimmed.length < 2) return '名称至少2個字符';
  if (trimmed.length > 12) return '名称最多12個字符';
  if (hasSensitiveWord(trimmed)) return '名称包含敏感詞，請修改';
  if (/[<>&"'\n\r]/.test(trimmed)) return '名称包含非法字符';
  return null;
}

function validateGuildName(name) {
  const err = validatePlayerName(name);
  if (err) return err;
  if (name.trim().length > 10) return '公會名称最多10個字符';
  return null;
}

// ==================== 总屬性 ====================
// ==================== 羁绊系统 ====================
// 计算当前出战英雄与玩家的羁绊加成倍率
// 同职业：+10% (1.1) / 同种族：+10% (1.1) / 双羁绊：+25% (1.25) 并解锁合击技能
function getHeroBondBonus() {
  const hero = GS.ownedHeroes.find(h => h.id === GS.equippedHeroId);
  if (!hero) return { mult: 1, sameClass: false, sameRace: false, doubleBond: false, comboSkill: false };
  const playerClass = GS.player.classId;
  const playerRace = CLASSES[playerClass]?.race || 'human';
  const heroData = SUMMON_POOL.find(s => s.id === hero.id) || hero;
  const heroClass = heroData.classId || hero.classId;
  const heroRace = heroData.race || hero.race || 'human';
  const sameClass = heroClass === playerClass;
  const sameRace = heroRace === playerRace;
  let mult = 1;
  if (sameClass && sameRace) mult = 1.25;
  else if (sameClass) mult = 1.1;
  else if (sameRace) mult = 1.1;
  return {
    mult,
    sameClass,
    sameRace,
    doubleBond: sameClass && sameRace,
    comboSkill: sameClass && sameRace,
  };
}

function getGuildSkillBonus() {
  if (!GS.guild || !GS.guild.skillLevels) return { atk: 0, def: 0, hpMax: 0, crit: 0, critDmg: 0, expRate: 0, dropRate: 0 };
  const lv = GS.guild.skillLevels;
  return {
    atk: (lv.atk || 0) * 3,
    def: (lv.def || 0) * 3,
    hpMax: (lv.hp || 0) * 20,
    crit: (lv.crit || 0) * 2,
    critDmg: (lv.cdmg || 0) * 3,
    expRate: (lv.exp || 0) * 5, // 每級+5%
    dropRate: (lv.drop || 0) * 5,
  };
}

function getTotalAtk() {
  let atk = Number(GS.player.atk) || 0;
  for (const slot in GS.equipment) {
    const eq = GS.equipment[slot];
    const s = eq?.baseStats || eq?.stats;
    if (s?.atk) atk += Number(s.atk) || 0;
  }
  const tfInfo = TRANSFORM_POOL.find(t => t.id === GS.player.transformId);
  if (tfInfo?.stats?.atk) atk += Number(tfInfo.stats.atk) || 0;
  const pet = GS.ownedPets.find(p => p.id === GS.equippedPetId);
  if (pet?.stats?.atk) atk += Number(pet.stats.atk) || 0;
  const hero = GS.ownedHeroes.find(h => h.id === GS.equippedHeroId);
  if (hero?.stats?.atk) atk += Number(hero.stats.atk) || 0;
  // 羁绊加成：英雄提供的攻擊屬性部分享受羁绊倍率
  if (hero?.stats?.atk) {
    const bond = getHeroBondBonus();
    atk += Number(hero.stats.atk) * (bond.mult - 1) || 0;
  }
  atk += getGuildSkillBonus().atk;
  const cb = getCollectionBonus();
  atk += cb.atk || 0;
  if (cb.atkPct) atk = atk * (1 + cb.atkPct / 100);
  const ecb = getEquipComboBonus();
  atk += ecb.atk || 0;
  const rb = getRankBonus();
  atk += rb.atk || 0;
  if (isNaN(atk)) atk = 0;
  return atk;
}
function getTotalDef() {
  let def = Number(GS.player.def) || 0;
  for (const slot in GS.equipment) {
    const eq = GS.equipment[slot];
    const s = eq?.baseStats || eq?.stats;
    if (s?.def) def += Number(s.def) || 0;
  }
  const tfInfo = TRANSFORM_POOL.find(t => t.id === GS.player.transformId);
  if (tfInfo?.stats?.def) def += Number(tfInfo.stats.def) || 0;
  const pet = GS.ownedPets.find(p => p.id === GS.equippedPetId);
  if (pet?.stats?.def) def += Number(pet.stats.def) || 0;
  const hero = GS.ownedHeroes.find(h => h.id === GS.equippedHeroId);
  if (hero?.stats?.def) def += Number(hero.stats.def) || 0;
  // 羁绊加成
  if (hero?.stats?.def) {
    const bond = getHeroBondBonus();
    def += Number(hero.stats.def) * (bond.mult - 1) || 0;
  }
  def += getGuildSkillBonus().def;
  const cb = getCollectionBonus();
  def += cb.def || 0;
  if (cb.defPct) def = def * (1 + cb.defPct / 100);
  const ecb = getEquipComboBonus();
  def += ecb.def || 0;
  const rb = getRankBonus();
  def += rb.def || 0;
  if (isNaN(def)) def = 0;
  return def;
}
function getTotalHpMax() {
  let hp = Number(GS.player.hpMax) || 100;
  for (const slot in GS.equipment) {
    const eq = GS.equipment[slot];
    const s = eq?.baseStats || eq?.stats;
    if (s?.hpMax) hp += Number(s.hpMax) || 0;
  }
  const tfInfo = TRANSFORM_POOL.find(t => t.id === GS.player.transformId);
  if (tfInfo?.stats?.hpMax) hp += Number(tfInfo.stats.hpMax) || 0;
  const pet = GS.ownedPets.find(p => p.id === GS.equippedPetId);
  if (pet?.stats?.hpMax) hp += Number(pet.stats.hpMax) || 0;
  const hero = GS.ownedHeroes.find(h => h.id === GS.equippedHeroId);
  if (hero?.stats?.hpMax) hp += Number(hero.stats.hpMax) || 0;
  // 羁绊加成
  if (hero?.stats?.hpMax) {
    const bond = getHeroBondBonus();
    hp += Number(hero.stats.hpMax) * (bond.mult - 1) || 0;
  }
  hp += getGuildSkillBonus().hpMax;
  const cb = getCollectionBonus();
  hp += cb.hpMax || 0;
  const ecb = getEquipComboBonus();
  hp += ecb.hpMax || 0;
  const rb = getRankBonus();
  hp += rb.hpMax || 0;
  if (isNaN(hp)) hp = 100;
  return hp;
}
function getTotalMpMax() {
  let mp = Number(GS.player.mpMax) || 100;
  for (const slot in GS.equipment) {
    const eq = GS.equipment[slot];
    const s = eq?.baseStats || eq?.stats;
    if (s?.mpMax) mp += Number(s.mpMax) || 0;
  }
  const tfInfo = TRANSFORM_POOL.find(t => t.id === GS.player.transformId);
  if (tfInfo?.stats?.mpMax) mp += Number(tfInfo.stats.mpMax) || 0;
  const ecb = getEquipComboBonus();
  mp += ecb.mpMax || 0;
  if (isNaN(mp)) mp = 100;
  return mp;
}
function getTotalCrit() {
  let c = Number(GS.player.crit) || 0;
  for (const slot in GS.equipment) {
    const eq = GS.equipment[slot];
    const s = eq?.baseStats || eq?.stats;
    if (s?.crit) c += Number(s.crit) || 0;
  }
  const tfInfo = TRANSFORM_POOL.find(t => t.id === GS.player.transformId);
  if (tfInfo?.stats?.crit) c += Number(tfInfo.stats.crit) || 0;
  const pet = GS.ownedPets.find(p => p.id === GS.equippedPetId);
  if (pet?.stats?.crit) c += Number(pet.stats.crit) || 0;
  const hero = GS.ownedHeroes.find(h => h.id === GS.equippedHeroId);
  if (hero?.stats?.crit) c += Number(hero.stats.crit) || 0;
  // 羁绊加成
  if (hero?.stats?.crit) {
    const bond = getHeroBondBonus();
    c += Number(hero.stats.crit) * (bond.mult - 1) || 0;
  }
  c += getGuildSkillBonus().crit;
  const cb = getCollectionBonus();
  c += cb.crit || 0;
  if (cb.critPct) c = c * (1 + cb.critPct / 100);
  const ecb = getEquipComboBonus();
  c += ecb.crit || 0;
  const rb = getRankBonus();
  c += rb.crit || 0;
  if (isNaN(c)) c = 0;
  return c;
}
function getTotalCritDmg() {
  let cd = Number(GS.player.critDmg) || 150;
  for (const slot in GS.equipment) {
    const eq = GS.equipment[slot];
    const s = eq?.baseStats || eq?.stats;
    if (s?.critDmg) cd += Number(s.critDmg) || 0;
  }
  const tfInfo = TRANSFORM_POOL.find(t => t.id === GS.player.transformId);
  if (tfInfo?.stats?.critDmg) cd += Number(tfInfo.stats.critDmg) || 0;
  const pet = GS.ownedPets.find(p => p.id === GS.equippedPetId);
  if (pet?.stats?.critDmg) cd += Number(pet.stats.critDmg) || 0;
  const hero = GS.ownedHeroes.find(h => h.id === GS.equippedHeroId);
  if (hero?.stats?.critDmg) cd += Number(hero.stats.critDmg) || 0;
  // 羁绊加成
  if (hero?.stats?.critDmg) {
    const bond = getHeroBondBonus();
    cd += Number(hero.stats.critDmg) * (bond.mult - 1) || 0;
  }
  cd += getGuildSkillBonus().critDmg;
  const cb = getCollectionBonus();
  cd += cb.critDmg || 0;
  if (cb.critDmgPct) cd = cd * (1 + cb.critDmgPct / 100);
  const ecb = getEquipComboBonus();
  cd += ecb.critDmg || 0;
  if (isNaN(cd)) cd = 150;
  return cd;
}

// 計算裝備評分（用於比較裝備好壞）
function calcEquipScore(item) {
  const bs = item.baseStats || {};
  const rarityBonus = { white:0, green:10, blue:30, red:80, purple:180, gold:400 };
  const base = (bs.atk || 0) * 10 + (bs.def || 0) * 5 + (bs.hpMax || 0) * 0.5 + (bs.crit || 0) * 8 + (bs.critDmg || 0) * 2;
  const rarity = rarityBonus[item.rarity] || 0;
  return base + rarity;
}
function calcCP() {
  const atk = getTotalAtk() || 0;
  const def = getTotalDef() || 0;
  const hp = getTotalHpMax() || 100;
  const crit = getTotalCrit() || 0;
  const cd = getTotalCritDmg() || 150;
  const cp = Math.floor(atk * 10 + def * 5 + hp * 0.5 + crit * 8 + cd * 2);
  return isNaN(cp) ? 100 : cp;
}

// ==================== UI ====================
function updateUI() {
  el.playerLevel.textContent = GS.player.level;
  const expPct = Math.min(100, (GS.player.exp / GS.player.expMax) * 100);
  if (el.expPct) el.expPct.textContent = Math.floor(expPct) + '%';
  el.gemCount.textContent = GS.resources.gem.toLocaleString();
  // HP/MP 條
  const hpMax = getTotalHpMax();
  const mpMax = getTotalMpMax();
  if (el.hpFill) el.hpFill.style.width = Math.max(0, Math.min(100, (GS.player.hp / hpMax) * 100)) + '%';
  if (el.mpFill) el.mpFill.style.width = Math.max(0, Math.min(100, (GS.player.mp / mpMax) * 100)) + '%';
  if (el.hpText) el.hpText.textContent = Math.floor(Math.min(GS.player.hp, hpMax)).toLocaleString() + '/' + Math.floor(hpMax).toLocaleString();
  if (el.mpText) el.mpText.textContent = Math.floor(Math.min(GS.player.mp, mpMax)).toLocaleString() + '/' + Math.floor(mpMax).toLocaleString();
  if (el.miniAtk) el.miniAtk.textContent = Math.floor(getTotalAtk());
  if (el.miniDef) el.miniDef.textContent = Math.floor(getTotalDef());
  if (el.cpValue) el.cpValue.textContent = calcCP().toLocaleString();
  try { updatePlayerBadge(); } catch(e) {}
  try { renderBuffBar && renderBuffBar(); } catch(e) {}
}

function updateSlotDisplay() {
  const hero = GS.ownedHeroes.find(h => h.id === GS.equippedHeroId);
  const heroSlot = $('hero-slot');
  if (hero) {
    el.heroSlotEmpty.style.display = 'none';
    el.heroSlotFilled.style.display = 'flex';
    if (heroSlot) {
      const rarity = hero.rarity || 'white';
      heroSlot.className = 'log-bar-slot hero-slot rarity-badge rarity-' + rarity;
      // 重新構建內容（保留標籤）
      heroSlot.innerHTML = `
        <div class="slot-filled">${spriteEmojiHTML(hero.sprite, 44)}</div>
        <div class="log-bar-slot-label">英雄</div>
      `;
    }
  } else {
    el.heroSlotEmpty.style.display = 'flex';
    el.heroSlotFilled.style.display = 'none';
    if (heroSlot) heroSlot.className = 'log-bar-slot hero-slot';
  }
  const pet = GS.ownedPets.find(p => p.id === GS.equippedPetId);
  const petSlot = $('pet-slot');
  if (pet) {
    el.petSlotEmpty.style.display = 'none';
    el.petSlotFilled.style.display = 'flex';
    const rarity = pet.rarity || 'white';
    if (petSlot) petSlot.className = 'log-bar-slot pet-slot rarity-badge rarity-' + rarity;
    // 守護精靈圖
    let petSpriteHtml = '';
    if (pet.sprite && pet.sprite.useImg) {
      petSpriteHtml = `<img src="${pet.sprite.idle}" style="width:40px;height:40px;object-fit:contain;display:block;border-radius:6px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.6))"/>`;
    } else if (pet.spriteKey && SPRITE[pet.spriteKey]) {
      petSpriteHtml = spriteEmojiHTML(SPRITE[pet.spriteKey], 40);
    } else {
      petSpriteHtml = `<div style="font-size:22px;line-height:1">${pet.icon || '🐾'}</div>`;
    }
    petSlot.innerHTML = `
      <div class="slot-filled">${petSpriteHtml}</div>
      <div class="log-bar-slot-label">守護</div>
    `;
  } else {
    el.petSlotEmpty.style.display = 'flex';
    el.petSlotFilled.style.display = 'none';
    if (petSlot) petSlot.className = 'log-bar-slot pet-slot';
  }
}

// 戰鬥日誌 + 聊天（多Tab）
function escapeHTML(str) {
  return String(str).replace(/[&<>"]/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
  })[s]);
}
const LOG_MAX_LINES = 100;
const chatMessages = { battle: [], general: [], guild: [], nation: [] };
let currentLogTab = 'battle';
let logExpanded = false;

function addLog(type, msg, channel) {
  const ch = channel || 'battle';
  chatMessages[ch].push({ type, msg, time: Date.now() });
  if (chatMessages[ch].length > LOG_MAX_LINES) chatMessages[ch].shift();
  if (currentLogTab === ch) {
    renderLogLines(ch);
  }
}

function renderLogLines(channel) {
  if (!el.logContent) return;
  const list = chatMessages[channel] || [];
  el.logContent.innerHTML = list.map(m => `<div class="log-line ${m.type}">${escapeHTML(m.msg)}</div>`).join('');
  el.battleLogScroll.scrollTop = el.battleLogScroll.scrollHeight;
}

function switchLogTab(tab) {
  currentLogTab = tab;
  document.querySelectorAll('.log-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.logTab === tab);
  });
  const isBattle = tab === 'battle';
  if (el.chatInputRow) el.chatInputRow.style.display = isBattle ? 'none' : 'flex';
  renderLogLines(tab);
}

function toggleLogExpand() {
  logExpanded = !logExpanded;
  const bar = document.getElementById('battle-log-bar');
  if (bar) bar.classList.toggle('log-expanded', logExpanded);
  if (el.logToggleBtn) el.logToggleBtn.textContent = logExpanded ? '▴' : '▾';
  el.battleLogScroll.scrollTop = el.battleLogScroll.scrollHeight;
}

function sendChatMessage() {
  const input = el.chatInput;
  const txt = (input.value || '').trim();
  if (!txt) return;
  const ch = currentLogTab;
  addLog('chat', `【${GS.player.name}】：${txt}`, ch);
  input.value = '';
  // AI 玩家根據內容回應
  if (GLOBAL_AI_POOL && GLOBAL_AI_POOL.length > 0 && Math.random() < 0.55) {
    setTimeout(() => {
      const onlineAIs = GLOBAL_AI_POOL.filter(a => a.online);
      if (onlineAIs.length === 0) return;
      const ai = onlineAIs[Math.floor(Math.random() * onlineAIs.length)];
      const reply = generateAIReply(txt, ch, ai);
      if (reply) addLog('chat-ai', reply, ch);
    }, 800 + Math.random() * 2500);
  }
}

// 根據場景和內容生成 AI 回話
function generateAIReply(playerMsg, channel, ai) {
  const msg = playerMsg.toLowerCase();
  const mapType = MAPS[GS.currentMap]?.type || 'safe';
  // 不同 AI 性格
  const personalities = [
    { type: '熱血', prefix: ['', '哈哈 ', '對啊 ', '其實 ', '衝啊！'], emoji: '⚔' },
    { type: '內斂', prefix: ['', '嗯 ', '...', '也就那樣 ', ''] , emoji: '🍃' },
    { type: '傲嬌', prefix: ['', '切 ', '哼 ', '隨便啦 ', '才不是'] , emoji: '💢' },
    { type: '開朗', prefix: ['', '加油！', '一起吧！', '太好了', '萬歲！'] , emoji: '✨' },
    { type: '商人', prefix: ['', '要不要交易？', '便宜賣你', '這價格很划算'] , emoji: '💰' },
    { type: '老司機', prefix: ['', '聽我說', '當年啊', '年輕時', '我跟你講'] , emoji: '🎩' },
  ];
  const pIdx = (ai.uid.charCodeAt(2) + ai.uid.charCodeAt(4)) % personalities.length;
  const personality = personalities[pIdx];
  ai._personality = personality.type;
  const nationFlag = getNationFlag(ai.nation);
  // 根據玩家內容匹配回話
  const matchers = [
    { kw: ['一起','組隊','組','打副本','副本','刷怪','練'],
      reps: ['好啊我也在找隊', '加我一個', '走啊一起刷', '我也想去', '等我補個藥', '組滿出發', '我在門口等'] },
    { kw: ['藥水','紅水','藍水','補藥','道具'],
      reps: ['雜貨店有賣', '我有多餘的可以交易', '記得帶夠再出門', '高級藥水在高級商人那', '紅水準備好再出門'] },
    { kw: ['裝備','武器','武器強化','強化','合成'],
      reps: ['強化看臉啊', '鐵匠鋪強化比較穩', '白裝可以合成綠裝', '4張同品質可以合成更高', '強化+7就很難了'] },
    { kw: ['變身','變身卷','抽卡','召喚','英雄','守護'],
      reps: ['變身抽卡很看臉', '我上次十連就保底', '金色變身太帥了', '守護寵物加屬性很有用', '30+5抽保底藍比較划算'] },
    { kw: ['軍團','公會','幫派','加入','招募','收人'],
      reps: ['找個強軍團比較好', '軍團技能很重要', '我們軍團還在收人', '軍團長要帶攻城戰', '軍團福利不錯'] },
    { kw: ['國家','攻城','攻城戰','宣戰','打城','國戰'],
      reps: ['攻城戰超刺激', '記得參加國家戰', '為了國家榮譽！', '我們國家最近很強', '今晚攻城戰加油'] },
    { kw: ['等級','升級','練功','衝等','幾級','lv','等級'],
      reps: ['慢慢練不急', '我卡在這級很久了', '高級圖經驗多', '組隊練比較快', '升級難啊'] },
    { kw: ['交易','賣','買','收','多少錢','價格'],
      reps: ['這個價格有點高', '可以便宜點嗎', '我有現貨要嗎', '市場價大概就這樣', '貨比三家不吃虧'] },
    { kw: ['pvp','打架','pk','單挑','切磋'],
      reps: ['來啊誰怕誰', '我裝備還沒換好', '等我練練再說', '輸了別哭啊', '公平競技'] },
    { kw: ['你好','哈摟','hi','hello','大家好','安安','嗨'],
      reps: ['你好呀', '安安', '哈摟', '嗨', '歡迎～', '很高興認識你'] },
    { kw: ['謝謝','感謝','thx','thanks','3q'],
      reps: ['不客氣', '小事一樁', '應該的', '下次換你幫我', '有緣再會'] },
    { kw: ['再見','bye','拜拜','掰掰','下線','先閃'],
      reps: ['再見', '明天見', '注意身體', '晚安～', '下次再一起玩'] },
  ];
  for (const m of matchers) {
    if (m.kw.some(k => msg.includes(k))) {
      const rep = m.reps[Math.floor(Math.random() * m.reps.length)];
      const pre = personality.prefix[Math.floor(Math.random() * personality.prefix.length)];
      return `${nationFlag}【${ai.name}】：${pre}${rep}`;
    }
  }
  // 無關鍵字時根據場景回話
  const scenePool = {
    safe: ['村裡今天挺熱鬧的', '你也在村裡啊', '要去哪裡練功呀', '最近撿到什麼好東西嗎', '雜貨店新貨看了嗎', '今天天氣不錯'],
    field: ['這邊怪還不少', '小心別引太多', '組個隊比較安全', '這區掉寶率還行', '我快沒藥水了得回城', '經驗還不錯'],
    dungeon: ['副本裡要小心', '前面可能有BOSS', '跟緊別落單', '打完記得撿寶', '這副本獎勵不錯', '陷阱很多'],
  };
  const pool = scenePool[mapType] || scenePool.safe;
  const rep = pool[Math.floor(Math.random() * pool.length)];
  const pre = personality.prefix[Math.floor(Math.random() * personality.prefix.length)];
  return `${nationFlag}【${ai.name}】：${pre}${rep}`;
}

// 國家國旗
function getNationFlag(nation) {
  const flags = {
    '紅國': '🔴', '藍國': '🔵', '綠國': '🟢', '黃國': '🟡',
    'red': '🔴', 'blue': '🔵', 'green': '🟢', 'yellow': '🟡',
  };
  return flags[nation] || '⚪';
}

// 觸發系統事件時的 AI 聊天反應
function triggerAIChatOnEvent(eventType, data) {
  if (!GS.aiPlayers || GS.aiPlayers.length === 0) return;
  if (Math.random() > 0.4) return; // 40% 概率有AI回應
  setTimeout(() => {
    const ai = GS.aiPlayers[Math.floor(Math.random() * GS.aiPlayers.length)];
    const nationFlag = getNationFlag(ai.nation);
    let msg = '';
    const ch = eventType === 'siege' ? 'nation' : 'general';
    switch(eventType) {
      case 'levelup':
        msg = ['恭喜升級！', '厲害啊', '加油繼續衝', '等級高了組個隊'][Math.floor(Math.random()*4)];
        break;
      case 'gacha':
        msg = ['運氣不錯啊', '羨慕...', '我也想抽', '這波血賺'][Math.floor(Math.random()*4)];
        break;
      case 'siege':
        msg = ['攻城戰開始了！', '大家衝啊', '為了國家！', '守住城門'][Math.floor(Math.random()*4)];
        break;
      case 'rare_drop':
        msg = ['好東西！', '運氣真好', '賣多少？', '羨慕'][Math.floor(Math.random()*4)];
        break;
      default:
        return;
    }
    addLog('chat-ai', `${nationFlag}【${ai.name}】：${msg}`, ch);
  }, 500 + Math.random() * 2000);
}

// 定期讓 AI 隨機發送聊天訊息
let aiChatTimer = 0;
function tickAIChat(dt) {
  if (!GLOBAL_AI_POOL || GLOBAL_AI_POOL.length === 0) return;
  aiChatTimer += dt;
  const interval = 40 + Math.random() * 50; // 40~90 秒一次，避免刷屏
  if (aiChatTimer >= interval) {
    aiChatTimer = 0;
    const channels = ['general', 'general', 'general', 'guild', 'nation']; // general 频道更频繁
    const ch = channels[Math.floor(Math.random() * channels.length)];
    // 從全局在線 AI 中隨機選一個
    const onlineAIs = GLOBAL_AI_POOL.filter(a => a.online);
    if (onlineAIs.length === 0) return;
    const ai = onlineAIs[Math.floor(Math.random() * onlineAIs.length)];
    const mapType = MAPS[GS.currentMap]?.type || 'safe';
    const isSiege = !!GS.siegeActive;
    const nationFlag = getNationFlag(ai.nation);
    // 多樣化消息池
    const msgs = {
      general: {
        safe: [
          '有人一起組隊刷怪嗎？', '剛剛在雜貨店補了一堆藥水', '村裡今天人好多',
          '鐵匠鋪今天人氣不錯', '誰有多餘的強化石？', '路過幫頂～',
          '裝備終於強化成功了', '誰知道哪裡掉寶率高', '今天運氣不錯撿了綠裝',
          '準備出城練功了', '回村補給一下', '有人交易嗎？', '好無聊有人聊天嗎',
          '練功練到快睡著', '這遊戲真耐玩', '終於攢夠錢買新裝備了',
          '低價出售綠色武器', '收藍裝防具有的密', '尋找固定隊友',
          '新手求帶', '有人打過深淵副本嗎', 'PVP有人切磋嗎',
        ],
        field: [
          '這邊怪好多小心', '剛剛差點死掉', '誰來幫個忙',
          '這區經驗還不錯', '掉了個綠裝哈哈', '藥水快沒了得回城',
          '有隊友嗎？單刷有點累', '小心精英怪很痛', '組隊效率高很多',
          '今天的運氣還行', '這地方挺危險的', '又升一級了！',
          '這裡Boss刷新了快來', '組個5人隊穩穩刷', '裝備耐久快沒了',
        ],
        dungeon: [
          '副本裡好黑啊', '前面好像有BOSS', '跟緊別走丟',
          '這副本獎勵真不錯', '打完這場回城修裝', '小心地上的陷阱',
          '誰帶夠藥水了？', '終於到最後一層了', '期待BOSS掉好東西',
          '需要補個治療職', '輸出不夠啊', '這Boss機制好難',
        ],
        siege: [
          '攻城戰開始了！', '大家衝啊！', '守住城門！',
          '敵人來了準備戰鬥', '為了國家的榮譽', '支援東門！',
          '把他們趕出去', '勝利就在眼前', '不要退後！',
          '南門快撐不住了', '醫療兵在哪裡', '衝鋒！',
        ],
      },
      guild: [
        '軍團貢獻我又衝了一波', '大家加油升軍團等級', '軍團技能點了嗎？',
        '晚上軍團戰見！', '軍團長在嗎？', '有人一起打軍團副本嗎',
        '今天軍團任務做了嗎', '記得領軍團獎勵', '我們軍團越來越強了',
        '新成員歡迎加入', '軍團倉庫有新貨', '一起衝軍團排名',
        '軍團招募活躍玩家', '軍團副本八點開打', '軍團長換人了？',
      ],
      nation: [
        '我們國家越來越強了', '期待下一場攻城戰', '大家記得領國家獎勵',
        '為了榮譽！', '國家貢獻大家一起衝', '有誰要加入國家軍團嗎',
        '今晚攻城戰別遲到', '我們的國家技能很強', '團結一致！',
        '國家排名又上升了', '為國爭光', '一起守護家園',
        '招募新血加入國家軍團', '敵國又在挑釁了', '國家商店更新了',
      ],
    };
    let pool;
    if (ch === 'general') {
      const scene = isSiege ? 'siege' : (mapType === 'dungeon' ? 'dungeon' : mapType === 'field' ? 'field' : 'safe');
      pool = msgs.general[scene] || msgs.general.safe;
    } else {
      pool = msgs[ch] || msgs.general.safe;
    }
    const msg = pool[Math.floor(Math.random() * pool.length)];
    addLog('chat-ai', `${nationFlag}【${ai.name}】：${msg}`, ch);
  }
}

// AI 回應玩家聊天（關鍵詞匹配）
function triggerAIReply(playerMsg, channel) {
  if (!GLOBAL_AI_POOL || GLOBAL_AI_POOL.length === 0) return;
  const replyChance = 0.35; // 35% 概率回應
  if (Math.random() > replyChance) return;

  // 關鍵詞 -> 回應池
  const replyPatterns = [
    { kw: ['你好','嗨','hi','hello','大家好','有人嗎','在嗎'],
      reps: ['你好呀～','嗨！','有人在的～','你好，有什麼事嗎？','歡迎光臨～'] },
    { kw: ['組隊','一起','帶我','求帶','新手','刷怪','練功','副本'],
      reps: ['我也在找隊友', '組我一個！', '什麼副本？', '新手慢慢來就好', '我來帶你飛', '你在哪張地圖？'] },
    { kw: ['多少錢','價格','收購','出售','賣','買','交易'],
      reps: ['這個價格有點貴', '我有一個你要嗎？', '便宜點唄', '成交！', '這個不錯'] },
    { kw: ['攻城','宣戰','城堡','打城','守城','城門'],
      reps: ['為了國家！', '今晚攻城別遲到', '守住！', '我也參加', '走，攻城去！', '敵人來了嗎？'] },
    { kw: ['軍團','公會','加入','招募'],
      reps: ['我們軍團歡迎你', '軍團福利很好', '軍團長很nice', '趕緊加入吧！', '軍團戰很刺激'] },
    { kw: ['裝備','強化','武器','防具'],
      reps: ['強化看臉啊', '這裝備不錯', '哪裡掉的？', '我也想換裝備', '強化失敗好幾次了'] },
    { kw: ['變身','變身卷','抽卡','召喚','英雄','守護'],
      reps: ['變身抽卡很看臉', '我上次十連就保底', '金色變身太帥了', '守護寵物加屬性很有用', '30+5抽保底藍比較划算'] },
    { kw: ['謝謝','感謝','多謝','辛苦了'],
      reps: ['不客氣～', '應該的', '小事小事', '一起加油！', '嘻嘻'] },
    { kw: ['再見','拜拜','bye','下線','睡覺'],
      reps: ['再見～', '晚安', '明天見', '一路順風', '下次再一起玩！'] },
  ];

  let replies = null;
  for (const p of replyPatterns) {
    if (p.kw.some(k => playerMsg.toLowerCase().includes(k.toLowerCase()))) {
      replies = p.reps;
      break;
    }
  }
  if (!replies) {
    // 未匹配到，用通用回應
    replies = ['哈哈', '原來如此', '有道理', '贊同', '真的嗎', '不錯哦'];
  }

  const reply = replies[Math.floor(Math.random() * replies.length)];
  // 延遲 1-3 秒回應，更自然
  const delay = 1000 + Math.random() * 2000;
  setTimeout(() => {
    const onlineAIs = GLOBAL_AI_POOL.filter(a => a.online);
    if (onlineAIs.length === 0) return;
    const ai = onlineAIs[Math.floor(Math.random() * onlineAIs.length)];
    const nationFlag = getNationFlag(ai.nation);
    addLog('chat-ai', `${nationFlag}【${ai.name}】：${reply}`, channel || 'general');
  }, delay);
}

// 推送全服事件給 AI 聊天系統（AI 可以回應）
function pushAIChatEvent(eventType, data) {
  if (!GLOBAL_AI_POOL || GLOBAL_AI_POOL.length === 0) return;
  // 只有抽卡 / 重要事件才觸發 AI 回應
  if (eventType !== 'gacha') return;
  const onlineAIs = GLOBAL_AI_POOL.filter(a => a.online);
  if (onlineAIs.length === 0) return;
  // 根據品質決定回應數量：金 2-3個、紫 1-2個、紅 0-1個
  let replyCount = 0;
  if (data.rarity === 'gold') replyCount = 2 + Math.floor(Math.random() * 2);
  else if (data.rarity === 'purple') replyCount = 1 + Math.floor(Math.random() * 2);
  else replyCount = Math.random() < 0.5 ? 1 : 0;
  if (replyCount <= 0) return;
  const replyPool = {
    gold: [
      `哇！${data.player} 抽到神話了！太歐了吧！`,
      `羨慕啊...神話級別的${data.label}`,
      `這運氣也太好，神話【${data.item}】！`,
      `歐皇！神話都能抽到`,
      `我也想要神話${data.label}...`,
      `大佬帶帶！`,
    ],
    purple: [
      `不錯啊，傳說級${data.label}`,
      `運氣可以，傳說【${data.item}】`,
      `恭喜恭喜！`,
      `這波不虧`,
      `我也想抽傳說`,
    ],
    red: [
      `史詩，還行吧`,
      `可以了，史詩算不錯`,
      `史詩已經很強了`,
      `恭喜恭喜`,
    ],
  };
  const pool = replyPool[data.rarity] || replyPool.red;
  // 隨機選不同 AI 回應
  const shuffled = [...onlineAIs].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(replyCount, shuffled.length); i++) {
    const ai = shuffled[i];
    const reply = pool[Math.floor(Math.random() * pool.length)];
    const delay = (1 + Math.random() * 3) * 1000 + i * 800;
    setTimeout(() => {
      const nationFlag = getNationFlag(ai.nation);
      addLog('chat-ai', `${nationFlag}【${ai.name}】：${reply}`, 'general');
    }, delay);
  }
}

// ==================== 抽卡 ====================
const GACHA_COST_SINGLE = 120;
const GACHA_COST_TEN = 1200;
const GACHA_COST_BIG = 3600; // 30+5抽

function rollRarity() {
  // 抽卡：史詩以上掉落率減半（紅/紫/金）
  const w = { white: 50, green: 30, blue: 14, purple: 0.9, red: 1.5, gold: 0.1 };
  const total = Object.values(w).reduce((a,b) => a+b, 0);
  let r = Math.random() * total;
  for (const [rarity, weight] of Object.entries(w)) {
    r -= weight;
    if (r <= 0) return rarity;
  }
  return 'white';
}

function pickFromPool(pool, rarity) {
  const items = pool.filter(i => i.rarity === rarity);
  if (items.length === 0) {
    const order = ['gold','purple','red','blue','green','white'];
    const idx = order.indexOf(rarity);
    for (let i = idx + 1; i < order.length; i++) {
      const fb = pool.filter(x => x.rarity === order[i]);
      if (fb.length > 0) return fb[Math.floor(Math.random() * fb.length)];
    }
  }
  return items[Math.floor(Math.random() * items.length)];
}

// 品質中文名（用於卡牌標籤）
const RARITY_CN = { white:'普通', green:'高級', blue:'稀有', red:'史詩', purple:'傳說', gold:'神話' };

// 抽卡史詩以上全服公告
function announceGachaResults(results, label) {
  const rarityRank = { white: 0, green: 1, blue: 2, red: 3, purple: 4, gold: 5 };
  const highRarity = ['red', 'purple', 'gold'];
  // 只公告最高品質的那幾個，避免重複刷屏
  const seen = {};
  results.forEach(r => {
    if (!highRarity.includes(r.rarity)) return;
    // 同一品質同名只公告一次（十連可能出多個同樣的）
    const key = r.rarity + '_' + r.id;
    if (seen[key]) return;
    seen[key] = true;
    const rc = RARITY_CONFIG[r.rarity];
    let prefix, color, icon, weight;
    if (r.rarity === 'gold') {
      prefix = '👑 恭喜'; color = '#ffcc40'; icon = '👑'; weight = '900';
    } else if (r.rarity === 'purple') {
      prefix = '★ 恭喜'; color = '#c060ff'; icon = '★'; weight = '800';
    } else {
      prefix = '⚔ 恭喜'; color = '#e05050'; icon = '⚔'; weight = '700';
    }
    const msg = `${prefix}【${GS.player.name}】召喚出${rc.name}【${r.name}】！`;
    // 發送到戰鬥頻道 + 一般頻道（帶特殊樣式）
    const typeClass = r.rarity === 'gold' ? 'gacha-gold' : r.rarity === 'purple' ? 'gacha-purple' : 'gacha-red';
    addLog(typeClass, msg, 'battle');
    addLog(typeClass, msg, 'general');
    // 金卡：屏幕閃光提示
    if (r.rarity === 'gold') spawnScreenFlash('rgba(255,220,100,0.45)', 0.5);
    // 推送到 AI 聊天系統（AI 可以回應）
    if (typeof pushAIChatEvent === 'function') {
      pushAIChatEvent('gacha', { player: GS.player.name, rarity: r.rarity, rarityName: rc.name, item: r.name, label });
    }
  });
}

function doGacha(pool, count, mode) {
  // mode: 'single' | 'ten' | 'big' (30+5)
  if (window.AudioSystem) AudioSystem.sfxGacha();
  let cost, actualCount, guaranteedMin;
  if (mode === 'big') { cost = GACHA_COST_BIG; actualCount = 35; guaranteedMin = 2; /* blue */ }
  else if (mode === 'ten') { cost = GACHA_COST_TEN; actualCount = 11; guaranteedMin = 1; /* green */ }
  else { cost = GACHA_COST_SINGLE; actualCount = 1; guaranteedMin = 0; }
  if (GS.resources.gem < cost) { alert('鑽石不足！'); return []; }
  GS.resources.gem -= cost;
  collectTax(0, cost);
  const results = [];
  const rarityRank = { white: 0, green: 1, blue: 2, red: 3, purple: 4, gold: 5 };
  for (let i = 0; i < actualCount; i++) {
    let rarity = rollRarity();
    // 最後一張保底
    if (i === actualCount - 1 && guaranteedMin > 0) {
      const hasGood = results.some(r => rarityRank[r.rarity] >= guaranteedMin);
      if (!hasGood) rarity = rarityOrderArr[guaranteedMin];
    }
    results.push(pickFromPool(pool, rarity));
  }
  const ownedList = pool === SUMMON_POOL ? GS.ownedHeroes : GS.ownedPets;
  // 標記是否為首次獲得（先比對當前擁有列表，再加入）
  results.forEach(item => { item._isNew = !ownedList.find(o => o.id === item.id); });
  results.forEach(item => {
    const existing = ownedList.find(o => o.id === item.id);
    if (existing) { existing.level = (existing.level || 1) + 1; }
    else { ownedList.push({ ...item, level: 1 }); }
  });
  updateUI();
  updateSlotDisplay();
  // 史詩以上全服公告
  announceGachaResults(results, pool === SUMMON_POOL ? '英雄' : '寵物');
  return results;
}

const rarityOrderArr = ['white','green','blue','red','purple','gold'];

function showGachaResults(results, poolType) {
  el.gachaResult.innerHTML = '';
  const count = results.length;
  let gridClass = 'single';
  if (count === 11) gridClass = 'ten-pull';
  else if (count === 35) gridClass = 'big-pull';
  else if (count > 1) gridClass = 'multi';
  el.gachaResult.className = 'gacha-result ' + gridClass;

  // 最高品質用於整體背景光效
  const rarityOrder = ['white','green','blue','red','purple','gold'];
  let topRarity = 'white';
  results.forEach(r => { if (rarityOrder.indexOf(r.rarity) > rarityOrder.indexOf(topRarity)) topRarity = r.rarity; });

  // 放射光線背景
  const rayBg = document.createElement('div');
  rayBg.className = 'gacha-ray-bg rarity-' + topRarity;
  el.gachaResult.appendChild(rayBg);

  // 粒子效果容器
  const particles = document.createElement('div');
  particles.className = 'gacha-particles';
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('span');
    p.className = 'gacha-particle rarity-' + topRarity;
    p.style.left = (Math.random() * 100) + '%';
    p.style.top = (Math.random() * 100) + '%';
    p.style.animationDelay = (Math.random() * 2) + 's';
    p.style.setProperty('--size', (4 + Math.random() * 6) + 'px');
    particles.appendChild(p);
  }
  el.gachaResult.appendChild(particles);

  // 標題
  const title = document.createElement('div');
  title.className = 'gacha-result-title';
  if (topRarity === 'gold') title.innerHTML = '✨ 神話降臨 ✨';
  else if (topRarity === 'purple') title.innerHTML = '⭐ 傳說召喚 ⭐';
  else if (topRarity === 'red') title.innerHTML = '史詩收穫';
  else title.innerHTML = '召喚結果';
  el.gachaResult.appendChild(title);

  // 提示文字
  const hint = document.createElement('div');
  hint.className = 'gacha-flip-hint';
  hint.textContent = '點擊卡牌翻開，或點擊下方「全部翻開」';
  el.gachaResult.appendChild(hint);

  // 卡牌容器（全部背面朝上）
  const cardsWrap = document.createElement('div');
  cardsWrap.className = 'gacha-cards-grid ' + gridClass;

  results.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'gacha-flip-card rarity-' + item.rarity;
    card.dataset.idx = idx;

    let spriteHTML;
    if (poolType === 'hero') {
      spriteHTML = `<div class="gacha-sprite">${spriteEmojiHTML(item.sprite, 64)}</div>`;
    } else if (poolType === 'pet') {
      const petSprite = SPRITE[item.spriteKey] || { idle: '🐾', color: '#c0a060', glow: '#ffe090' };
      spriteHTML = `<div class="gacha-sprite gacha-pet-sprite">${spriteEmojiHTML(petSprite, 56)}</div>`;
    } else if (poolType === 'transform') {
      const iconUrl = getTransformIcon(item.spriteKey);
      const rc = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.white;
      spriteHTML = `<div class="gacha-sprite gacha-transform-sprite"><img src="${iconUrl}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:3px solid ${rc.color};box-shadow:0 0 12px ${rc.glow}"/></div>`;
    }
    let typeLabel = '英雄';
    if (poolType === 'pet') typeLabel = '守護寵物';
    if (poolType === 'transform') typeLabel = item.type || '變身';

    const isNew = item._isNew;

    card.innerHTML = `
      <div class="gacha-flip-inner">
        <div class="gacha-flip-back">
          <div class="card-back-pattern"></div>
          <div class="card-back-emblem"></div>
          <div class="card-back-runes">MYSTERY</div>
        </div>
        <div class="gacha-flip-front">
          <div class="gacha-card-inner">
            <div class="gacha-card-top">
              <span class="gacha-card-rarity-label">${RARITY_CN[item.rarity] || item.rarity}</span>
              ${isNew ? '<span class="gacha-new-tag">NEW</span>' : ''}
            </div>
            <div class="gacha-card-art">
              ${spriteHTML}
            </div>
            <div class="gacha-card-name">${item.name}</div>
            <div class="gacha-card-type">${typeLabel}</div>
          </div>
          <div class="gacha-card-glow"></div>
        </div>
      </div>
    `;
    // 點擊翻開
    card.addEventListener('click', () => {
      if (!card.classList.contains('flipped')) {
        card.classList.add('flipped');
        if (window.AudioSystem) AudioSystem.sfxFlip && AudioSystem.sfxFlip();
        checkAllFlipped();
      }
    });
    cardsWrap.appendChild(card);
  });
  el.gachaResult.appendChild(cardsWrap);

  // 底部按鈕列
  const bottomBar = document.createElement('div');
  bottomBar.className = 'gacha-result-bottom';
  bottomBar.innerHTML = `
    <button class="gacha-flip-all-btn" id="gacha-flip-all">
      全部翻開
    </button>
    <button class="gacha-close-btn" id="gacha-close-result" style="display:none">
      確認 · 全部獲得
    </button>
  `;
  el.gachaResult.appendChild(bottomBar);

  const flipAllBtn = bottomBar.querySelector('#gacha-flip-all');
  const closeBtn = bottomBar.querySelector('#gacha-close-result');

  flipAllBtn.addEventListener('click', () => {
    const cards = cardsWrap.querySelectorAll('.gacha-flip-card');
    cards.forEach((card, i) => {
      setTimeout(() => {
        if (!card.classList.contains('flipped')) card.classList.add('flipped');
        if (i === cards.length - 1) {
          setTimeout(() => {
            flipAllBtn.style.display = 'none';
            closeBtn.style.display = 'block';
          }, 300);
        }
      }, i * 200);
    });
  });

  function checkAllFlipped() {
    const cards = cardsWrap.querySelectorAll('.gacha-flip-card');
    const flipped = cardsWrap.querySelectorAll('.gacha-flip-card.flipped');
    if (flipped.length === cards.length) {
      setTimeout(() => {
        flipAllBtn.style.display = 'none';
        closeBtn.style.display = 'block';
      }, 300);
    }
  }

  closeBtn.addEventListener('click', () => {
    el.gachaModal.classList.remove('open');
  });

  el.gachaModal.classList.add('open');
}

// ==================== 圖鑑系統（英雄 / 寵物 / 裝備 / 道具 / 怪物）+ 蒐藏獎勵 ====================
let codexTab = 'hero'; // hero / pet / transform / equip / item / monster
let codexRarityFilter = 'all';
let codexMainTab = 'codex'; // codex / collection
let codexCollectTab = 'cards'; // cards / effects / sets
let equipComboCatFilter = 'all';
let equipComboStatFilter = [];

// 蒐藏獎勵配置：每達成一定收集數量，獲得屬性加成
const COLLECTION_REWARDS = {
  hero: [
    { count: 5,  stats: { atkPct: 1 },  name: '英雄蒐藏·初階 (+1%攻擊)' },
    { count: 10, stats: { atkPct: 2 },  name: '英雄蒐藏·中階 (+2%攻擊)' },
    { count: 15, stats: { atkPct: 3 },  name: '英雄蒐藏·高階 (+3%攻擊)' },
    { count: 20, stats: { atkPct: 4 },  name: '英雄蒐藏·巔峰 (+4%攻擊)' },
  ],
  pet: [
    { count: 5,  stats: { defPct: 1 },  name: '寵物蒐藏·初階 (+1%防禦)' },
    { count: 10, stats: { defPct: 2 },  name: '寵物蒐藏·中階 (+2%防禦)' },
    { count: 15, stats: { defPct: 3 },  name: '寵物蒐藏·高階 (+3%防禦)' },
    { count: 20, stats: { defPct: 4 },  name: '寵物蒐藏·巔峰 (+4%防禦)' },
  ],
  transform: [
    { count: 5,  stats: { critDmg: 5 },   name: '變身蒐藏·初階 (+5%暴傷)' },
    { count: 10, stats: { critDmg: 10 },  name: '變身蒐藏·中階 (+10%暴傷)' },
    { count: 15, stats: { critDmg: 15 },  name: '變身蒐藏·高階 (+15%暴傷)' },
    { count: 20, stats: { critDmg: 20 },  name: '變身蒐藏·巔峰 (+20%暴傷)' },
  ],
  equip: [
    { count: 10,  stats: { hpMax: 10 }, name: '裝備蒐藏·初階 (+10HP)' },
    { count: 20,  stats: { hpMax: 30 }, name: '裝備蒐藏·中階 (+30HP)' },
    { count: 30,  stats: { hpMax: 60 }, name: '裝備蒐藏·高階 (+60HP)' },
  ],
  item: [
    { count: 10, stats: { dropPct: 1 }, name: '道具蒐藏·初階 (+1%掉寶率)' },
    { count: 20, stats: { dropPct: 2 }, name: '道具蒐藏·中階 (+2%掉寶率)' },
    { count: 30, stats: { dropPct: 3 }, name: '道具蒐藏·高階 (+3%掉寶率)' },
  ],
  monster: [
    { count: 10, stats: { expPct: 1 }, name: '怪物圖鑑·初階 (+1%經驗)' },
    { count: 20, stats: { expPct: 2 }, name: '怪物圖鑑·中階 (+2%經驗)' },
    { count: 30, stats: { expPct: 3 }, name: '怪物圖鑑·高階 (+3%經驗)' },
  ],
};

// 套裝效果：收集同一品質全部英雄/守護/變身/裝備給予額外加成
const SET_REWARDS = {
  hero: {
    white:  { stats: { hpMax: 50 },       name: '英雄白裝套 · +50HP' },
    green:  { stats: { atkPct: 2 },       name: '英雄綠裝套 · +2%攻擊' },
    blue:   { stats: { defPct: 5 },       name: '英雄藍裝套 · +5%防禦' },
    red:    { stats: { crit: 5 },         name: '英雄紅裝套 · +5%暴擊' },
    purple: { stats: { critDmg: 10 },     name: '英雄紫裝套 · +10%暴傷' },
    gold:   { stats: { allPct: 10 },      name: '英雄金裝套 · +10%全屬性' },
  },
  pet: {
    white:  { stats: { mpMax: 20 },       name: '守護白裝套 · +20MP' },
    green:  { stats: { evasion: 1 },      name: '守護綠裝套 · +1%閃避' },
    blue:   { stats: { defPct: 3 },       name: '守護藍裝套 · +3%防禦' },
    red:    { stats: { atkPct: 3 },       name: '守護紅裝套 · +3%攻擊' },
    purple: { stats: { critDmg: 5 },      name: '守護紫裝套 · +5%暴傷' },
    gold:   { stats: { allPct: 5 },       name: '守護金裝套 · +5%全屬性' },
  },
  transform: {
    white:  { stats: { atkSpeed: 1 },     name: '變身白裝套 · +1%攻速' },
    green:  { stats: { moveSpeed: 2 },    name: '變身綠裝套 · +2%移速' },
    blue:   { stats: { atkPct: 3 },       name: '變身藍裝套 · +3%攻擊' },
    red:    { stats: { crit: 5 },         name: '變身紅裝套 · +5%暴擊' },
    purple: { stats: { critDmg: 8 },      name: '變身紫裝套 · +8%暴傷' },
    gold:   { stats: { allPct: 8 },       name: '變身金裝套 · +8%全屬性' },
  },
  equip: {
    white:  { stats: { hpMax: 30 },       name: '裝備白套 · +30HP' },
    green:  { stats: { defPct: 2 },       name: '裝備綠套 · +2%防禦' },
    blue:   { stats: { atkPct: 3 },       name: '裝備藍套 · +3%攻擊' },
    red:    { stats: { hpMax: 200, defPct: 5 }, name: '裝備紅套 · +200HP +5%防' },
    purple: { stats: { crit: 5, critDmg: 10 }, name: '裝備紫套 · +5%暴 +10%暴傷' },
    gold:   { stats: { allPct: 10 },      name: '裝備金套 · +10%全屬性' },
  },
};

// 取得某分類某品質的總數與已收集數
function getSetProgress(cat, rarity) {
  let total = 0, owned = 0;
  let pool = [];
  if (cat === 'hero') pool = SUMMON_POOL;
  else if (cat === 'pet') pool = PET_POOL;
  else if (cat === 'transform') pool = TRANSFORM_POOL;
  else if (cat === 'equip') pool = EQUIP_POOL;
  const totalItems = pool.filter(x => x.rarity === rarity);
  total = totalItems.length;
  if (cat === 'hero') owned = (GS.ownedHeroes || []).filter(h => h.rarity === rarity).length;
  else if (cat === 'pet') owned = (GS.ownedPets || []).filter(p => p.rarity === rarity).length;
  else if (cat === 'transform') owned = (GS.ownedTransforms || []).filter(t => t.rarity === rarity).length;
  else if (cat === 'equip') {
    const ids = new Set();
    (GS.inventory || []).filter(i => i.itemType === 'equipment').forEach(i => ids.add(i.id));
    for (const slot in (GS.equipment || {})) {
      const eq = GS.equipment[slot];
      if (eq?.id) ids.add(eq.id);
    }
    owned = totalItems.filter(t => ids.has(t.id)).length;
  }
  return { total, owned, complete: total > 0 && owned >= total };
}

// 計算蒐藏總屬性加成
function getCollectionBonus() {
  const bonus = { atk: 0, def: 0, hpMax: 0, crit: 0, critDmg: 0, mpMax: 0, evasion: 0, atkSpeed: 0, moveSpeed: 0, atkPct: 0, defPct: 0, expPct: 0, dropPct: 0, allPct: 0 };
  for (const cat in COLLECTION_REWARDS) {
    const rewards = COLLECTION_REWARDS[cat];
    const count = getCollectionCount(cat);
    rewards.forEach(r => {
      if (count >= r.count) {
        for (const s in r.stats) bonus[s] = (bonus[s] || 0) + r.stats[s];
      }
    });
  }
  // 套裝獎勵
  for (const cat in SET_REWARDS) {
    for (const rarity in SET_REWARDS[cat]) {
      const prog = getSetProgress(cat, rarity);
      if (prog.complete) {
        const s = SET_REWARDS[cat][rarity].stats;
        for (const k in s) bonus[k] = (bonus[k] || 0) + s[k];
      }
    }
  }
  return bonus;
}

function getCollectionCount(cat) {
  if (cat === 'hero') return GS.ownedHeroes?.length || 0;
  if (cat === 'pet')  return GS.ownedPets?.length || 0;
  if (cat === 'transform') return GS.ownedTransforms?.length || 0;
  if (cat === 'monster') return GS.killedMonsters?.length || 0;
  if (cat === 'equip') {
    const ids = new Set();
    // 已蒐集裝備 = 背包裝備 + 已穿戴裝備
    GS.inventory?.filter(i => i.itemType === 'equipment').forEach(i => ids.add(i.id));
    for (const slot in (GS.equipment || {})) {
      const eq = GS.equipment[slot];
      if (eq?.id) ids.add(eq.id);
    }
    return ids.size;
  }
  if (cat === 'item') {
    const ids = new Set();
    GS.inventory?.forEach(i => {
      if (i.itemType === 'consumable' || i.itemType === 'material' || i.itemType === 'treasure' || i.itemType === 'gem') {
        ids.add(i.id);
      }
    });
    return ids.size;
  }
  return 0;
}

function openCodexPage() {
  closeSideMenu();
  closeSidePage();
  // 先移除舊的，確保每次打開都是全新狀態
  const old = document.getElementById('codex-overlay');
  if (old) old.remove();
  let html;
  try {
    html = renderCodexFullPage();
    if (!html || html.trim().length === 0) {
      html = '<div style="color:gold;padding:40px;">圖鑑頁面渲染為空</div>';
    }
  } catch(e) {
    html = '<div style="color:#ff6b6b;padding:40px;">圖鑑渲染錯誤：' + (e.message || e) + '</div>';
  }
  const overlay = document.createElement('div');
  overlay.id = 'codex-overlay';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
  // 延遲綁定事件
  requestAnimationFrame(() => bindCodexOverlayEvents());
}

function renderCodexPage() {
  const tabs = [
    { key: 'hero',      name: '英雄' },
    { key: 'pet',       name: '守護' },
    { key: 'transform', name: '變身' },
    { key: 'equip',     name: '裝備' },
    { key: 'item',      name: '道具' },
    { key: 'monster',   name: '怪物' },
  ];
  const rarityList = ['all', ...RARITY_ORDER];

  let gridHtml = '';
  let totalCount = 0;
  let ownedCount = 0;

  if (codexTab === 'hero' || codexTab === 'pet') {
    const pool = codexTab === 'hero' ? SUMMON_POOL : PET_POOL;
    const ownedList = codexTab === 'hero' ? GS.ownedHeroes : GS.ownedPets;
    const ownedIds = new Set(ownedList.map(o => o.id));
    const filtered = codexRarityFilter === 'all' ? pool : pool.filter(i => i.rarity === codexRarityFilter);
    totalCount = pool.length;
    ownedCount = ownedList.length;
    gridHtml = `<div class="codex-grid">
      ${filtered.map(item => {
        const owned = ownedIds.has(item.id);
        const rarity = item.rarity;
        const rarityInfo = RARITY_CONFIG[rarity];
        const sprite = codexTab === 'hero'
          ? (item.sprite ? spriteEmojiHTML(item.sprite, 72) : '')
          : (item.spriteKey ? spriteEmojiHTML(SPRITE[item.spriteKey], 72) : '');
        return `
          <div class="codex-card rarity-${rarity} ${owned ? '' : 'locked'}" data-id="${item.id}" data-type="${codexTab}">
            <div class="codex-card-inner">
              <div class="codex-card-sprite">${owned ? sprite : '<div style="font-size:48px;filter:grayscale(1) brightness(0.4)">❓</div>'}</div>
              <div class="codex-card-name">${owned ? item.name : '???'}</div>
              <div class="codex-card-rarity" style="color:${rarityInfo.color}">${rarityInfo.name}</div>
            </div>
            <div class="codex-card-glow"></div>
          </div>
        `;
      }).join('')}
    </div>`;
  } else if (codexTab === 'transform') {
    const pool = TRANSFORM_POOL;
    const ownedList = GS.ownedTransforms || [];
    const ownedIds = new Set(ownedList.map(o => o.id));
    const filtered = codexRarityFilter === 'all' ? pool : pool.filter(i => i.rarity === codexRarityFilter);
    totalCount = pool.length;
    ownedCount = ownedList.length;
    gridHtml = `<div class="codex-grid codex-grid-5">
      ${filtered.map(item => {
        const owned = ownedIds.has(item.id);
        const rarity = item.rarity;
        const rarityInfo = RARITY_CONFIG[rarity];
        return `
          <div class="codex-card rarity-${rarity} ${owned ? '' : 'locked'}" data-id="${item.id}" data-type="transform">
            <div class="codex-card-inner">
              <div class="codex-card-sprite" style="padding:4px">
                <img src="${getTransformIcon(item.spriteKey)}" style="width:100%;height:100%;object-fit:cover;display:block;filter:${owned ? 'none' : 'grayscale(1) brightness(0.3)'};border-radius:4px"/>
              </div>
              <div class="codex-card-name">${owned ? item.name : '???'}</div>
              <div class="codex-card-rarity" style="color:${owned ? rarityInfo.color : '#555'};font-size:9px">${rarityInfo.name || ''}</div>
            </div>
            <div class="codex-card-glow"></div>
          </div>
        `;
      }).join('')}
    </div>`;
  } else if (codexTab === 'equip') {
    const pool = EQUIP_POOL;
    totalCount = pool.length;
    const equipIds = new Set();
    GS.inventory?.filter(i => i.itemType === 'equipment').forEach(i => equipIds.add(i.id));
    for (const slot in (GS.equipment || {})) {
      const eq = GS.equipment[slot];
      if (eq?.id) equipIds.add(eq.id);
    }
    ownedCount = equipIds.size;
    const filtered = codexRarityFilter === 'all' ? pool : pool.filter(i => i.rarity === codexRarityFilter);
    gridHtml = `<div class="codex-grid">
      ${filtered.map(item => {
        const owned = equipIds.has(item.id);
        const rarity = item.rarity;
        const rarityInfo = RARITY_CONFIG[rarity];
        const borderColor = rarityInfo?.color || '#999';
        const typeName = EQUIP_TYPES[item.type]?.name || item.type;
        const iconUrl = ITEM_ICONS[item.type] || ITEM_ICONS.weapon;
        return `
          <div class="codex-card rarity-${rarity} ${owned ? '' : 'locked'}" data-id="${item.id}" data-type="equip">
            <div class="codex-card-inner">
              <div class="codex-card-sprite" style="padding:6px">
                <img src="${iconUrl}" style="width:100%;height:100%;object-fit:contain;display:block;filter:${owned ? 'none' : 'grayscale(1) brightness(0.4)'};border-radius:6px"/>
              </div>
              <div class="codex-card-name">${owned ? item.name : '???'}</div>
              <div class="codex-card-rarity" style="color:${owned ? rarityInfo.color : '#555'}">${typeName}</div>
            </div>
            <div class="codex-card-glow"></div>
          </div>
        `;
      }).join('')}
    </div>`;
  } else if (codexTab === 'item') {
    const items = [
      { id: 'hp1',   name: '小型生命藥水', rarity: 'white',  icon: ITEM_ICONS.hp1 },
      { id: 'hp2',   name: '中型生命藥水', rarity: 'green',  icon: ITEM_ICONS.hp2 },
      { id: 'hp3',   name: '大型生命藥水', rarity: 'blue',   icon: ITEM_ICONS.hp3 },
      { id: 'mp1',   name: '小型魔力藥水', rarity: 'white',  icon: ITEM_ICONS.mp1 },
      { id: 'mp2',   name: '中型魔力藥水', rarity: 'green',  icon: ITEM_ICONS.mp2 },
      { id: 'mp3',   name: '大型魔力藥水', rarity: 'blue',   icon: ITEM_ICONS.mp3 },
      { id: 'spd1',  name: '加速藥水',     rarity: 'blue',   icon: ITEM_ICONS.spd1 },
      { id: 'spd2',  name: '狂暴藥水',     rarity: 'red',    icon: ITEM_ICONS.spd2 },
      { id: 'move1', name: '行走加速藥水',     rarity: 'green',  icon: ITEM_ICONS.move1 },
      { id: 'mgem',  name: '魔法寶石',     rarity: 'blue',   icon: ITEM_ICONS.mgem },
      { id: 'teleport', name: '傳送卷軸',  rarity: 'green',  icon: ITEM_ICONS.teleport },
      { id: 'enhance',  name: '強化提升券', rarity: 'purple', icon: ITEM_ICONS.enhance_ticket },
      { id: 'chest',    name: '神秘寶箱',   rarity: 'purple', icon: ITEM_ICONS.chest },
    ];
    totalCount = items.length;
    const ownedIds = new Set(GS.inventory?.filter(i => i.itemType === 'consumable').map(i => i.id) || []);
    ownedCount = items.filter(i => ownedIds.has(i.id)).length;
    gridHtml = `<div class="codex-grid">
      ${items.map(item => {
        const owned = ownedIds.has(item.id);
        const rarityInfo = RARITY_CONFIG[item.rarity];
        return `
          <div class="codex-card rarity-${item.rarity} ${owned ? '' : 'locked'}" data-id="${item.id}" data-type="item">
            <div class="codex-card-inner">
              <div class="codex-card-sprite" style="padding:6px">
                <img src="${item.icon}" style="width:100%;height:100%;object-fit:contain;display:block;filter:${owned ? 'none' : 'grayscale(1) brightness(0.4)'};border-radius:6px"/>
              </div>
              <div class="codex-card-name">${owned ? item.name : '???'}</div>
              <div class="codex-card-rarity" style="color:${owned ? rarityInfo.color : '#555'}">${rarityInfo.name}</div>
            </div>
            <div class="codex-card-glow"></div>
          </div>
        `;
      }).join('')}
    </div>`;
  } else if (codexTab === 'monster') {
    const monsters = [
      { id: 'goblin',   name: '哥布林',       rarity: 'white',  spriteKey: 'goblin' },
      { id: 'slime',    name: '史萊姆',       rarity: 'white',  spriteKey: 'slime' },
      { id: 'spider',   name: '巨蛛',         rarity: 'white',  spriteKey: 'spider' },
      { id: 'orc',      name: '獸人戰士',     rarity: 'green',  spriteKey: 'orc' },
      { id: 'skeleton', name: '骷髏兵',       rarity: 'green',  spriteKey: 'skeleton' },
      { id: 'scorpion', name: '巨蠍',         rarity: 'blue',   spriteKey: 'scorpion' },
      { id: 'bat',      name: '吸血蝙蝠',     rarity: 'blue',   spriteKey: 'bat' },
      { id: 'demon',    name: '惡魔',         rarity: 'red',    spriteKey: 'demon' },
      { id: 'zombie',   name: '殭屍',         rarity: 'green',  spriteKey: 'zombie' },
      { id: 'dragon',   name: '巨龍',         rarity: 'purple', spriteKey: 'dragon' },
      { id: 'boss_orc', name: '哥布林王',     rarity: 'red',    spriteKey: 'boss_orc', boss: true },
      { id: 'boss_demon', name: '惡魔領主',   rarity: 'purple', spriteKey: 'boss_demon', boss: true },
    ];
    totalCount = monsters.length;
    const killedIds = new Set(GS.killedMonsters || []);
    ownedCount = monsters.filter(m => killedIds.has(m.id)).length;
    gridHtml = `<div class="codex-grid">
      ${monsters.map(m => {
        const owned = killedIds.has(m.id);
        const rarityInfo = RARITY_CONFIG[m.rarity];
        const sprite = SPRITE[m.spriteKey];
        const hasImg = sprite?.useImg;
        const spriteHtml = owned
          ? (hasImg
             ? `<img src="${sprite.idle}" style="width:100%;height:100%;object-fit:contain;display:block;border-radius:6px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.6))"/>`
             : `<div style="font-size:40px;color:${sprite?.color || '#ccc'};filter:drop-shadow(0 0 4px ${sprite?.glow || 'rgba(0,0,0,0.5)'})">${sprite?.idle || '👹'}</div>`)
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:44px;color:#444">❓</div>`;
        return `
          <div class="codex-card rarity-${m.rarity} ${owned ? '' : 'locked'}" data-id="${m.id}" data-type="monster">
            <div class="codex-card-inner">
              <div class="codex-card-sprite" style="padding:4px">${spriteHtml}</div>
              <div class="codex-card-name">${owned ? m.name : '???'}</div>
              <div class="codex-card-rarity" style="color:${owned ? rarityInfo.color : '#555'}">${owned ? (m.boss ? 'BOSS' : '怪物') : '未發現'}</div>
            </div>
            <div class="codex-card-glow"></div>
          </div>
        `;
      }).join('')}
    </div>`;
  }

  // 蒐藏獎勵展示
  let rewardHtml = '';
  const rewards = COLLECTION_REWARDS[codexTab];
  if (rewards) {
    const count = getCollectionCount(codexTab);
    rewardHtml = `<div style="margin-bottom:10px;padding:10px 12px;background:linear-gradient(135deg, rgba(60,40,20,0.6), rgba(30,20,10,0.4));border:1px solid var(--gold-dark);border-radius:8px">
      <div style="font-size:12px;font-weight:700;color:var(--gold-bright);margin-bottom:6px">📚 蒐藏獎勵</div>
      <div style="display:flex;flex-direction:column;gap:4px">
        ${rewards.map(r => {
          const achieved = count >= r.count;
          const statsStr = Object.entries(r.stats).map(([k, v]) => {
             const nameMap = { atk: '攻擊', def: '防禦', hpMax: '生命', crit: '暴擊', critDmg: '暴傷', mpMax: '魔力' };
            return `${nameMap[k] || k}+${v}`;
          }).join(' ');
          return `<div style="font-size:10px;display:flex;justify-content:space-between;align-items:center;padding:4px 8px;border-radius:4px;background:${achieved ? 'rgba(100,80,30,0.4)' : 'rgba(0,0,0,0.2)'};color:${achieved ? 'var(--gold-bright)' : 'var(--parchment-dark)'}">
            <span>${r.name} (${r.count}件)</span>
            <span>${statsStr}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  // 蒐藏主分頁
  if (codexMainTab === 'collection') {
    return renderCollectionPage();
  }

  return `
    <div class="codex-main-tabs">
      <button class="codex-main-tab ${codexMainTab === 'codex' ? 'active' : ''}" data-main-tab="codex">圖鑑</button>
      <button class="codex-main-tab ${codexMainTab === 'collection' ? 'active' : ''}" data-main-tab="collection">蒐藏</button>
    </div>
    <div class="codex-tabs" style="font-size:10px">
      ${tabs.map(t => `
        <button class="codex-tab ${codexTab === t.key ? 'active' : ''}" data-tab="${t.key}" style="padding:6px 4px">${t.name}</button>
      `).join('')}
    </div>
    <div class="codex-stats">
      已蒐集：<span style="color:var(--gold)">${ownedCount}</span> / ${totalCount}
      <div class="codex-progress-bar">
        <div class="codex-progress-fill" style="width:${totalCount > 0 ? (ownedCount / totalCount * 100).toFixed(1) : 0}%"></div>
      </div>
    </div>
    ${rewardHtml}
    <div class="codex-rarity-filter">
      ${rarityList.map(r => `
        <button class="rarity-filter-btn ${codexRarityFilter === r ? 'active' : ''} rarity-${r}" data-rarity="${r}">
          ${r === 'all' ? '全部' : RARITY_CONFIG[r].name}
        </button>
      `).join('')}
    </div>
    ${gridHtml}
  `;
}

function renderCollectionPage() {
  // 計算總蒐藏進度
  const cats = [
    { key: 'hero',      name: '英雄蒐藏', icon: '⚔️' },
    { key: 'pet',       name: '守護蒐藏', icon: '🐾' },
    { key: 'transform', name: '變身蒐藏', icon: '✨' },
    { key: 'equip',     name: '裝備蒐藏', icon: '🛡️' },
    { key: 'item',      name: '道具蒐藏', icon: '🧪' },
    { key: 'monster',   name: '怪物圖鑑', icon: '👹' },
  ];
  const catTotal = { hero: SUMMON_POOL.length, pet: PET_POOL.length, transform: TRANSFORM_POOL.length, equip: EQUIP_POOL.length, item: 13, monster: 12 };
  let totalOwned = 0, totalAll = 0;
  cats.forEach(c => { const cnt = getCollectionCount(c.key); const tot = catTotal[c.key] || 0; totalOwned += cnt; totalAll += tot; });
  const totalPct = totalAll > 0 ? ((totalOwned / totalAll) * 100).toFixed(1) : 0;

  const subTabs = [
    { key: 'cards', name: '收集進度' },
    { key: 'effects', name: '收藏品效果' },
    { key: 'sets', name: '完成收藏' },
    { key: 'equip_combos', name: '裝備套圖鑑' },
  ];

  let content = '';
  if (codexCollectTab === 'cards') {
    content = `<div class="collection-cards-list">
      ${cats.map(c => {
        const cnt = getCollectionCount(c.key);
        const tot = catTotal[c.key] || 0;
        const pct = tot > 0 ? (cnt / tot * 100).toFixed(0) : 0;
        const rewards = COLLECTION_REWARDS[c.key] || [];
        const curReward = rewards.filter(r => cnt >= r.count).pop();
        const nextReward = rewards.find(r => cnt < r.count);
        const statNames = { atkPct: '攻擊%', defPct: '防禦%', hpMax: 'HP', crit: '暴擊', critDmg: '暴傷', mpMax: '魔力', dropPct: '掉寶率%', expPct: '經驗%' };
        const curStatStr = curReward ? Object.entries(curReward.stats).map(([k,v]) => `${statNames[k]||k}+${v}`).join(' ') : '—';
        const nextStatStr = nextReward ? Object.entries(nextReward.stats).map(([k,v]) => `${statNames[k]||k}+${v}`).join(' ') : '已滿';
        return `
          <div class="collection-category-card" data-col-cat="${c.key}">
            <div class="ccat-header">
              <div class="ccat-icon">${c.icon}</div>
              <div class="ccat-info">
                <div class="ccat-name">${c.name}</div>
                <div class="ccat-count">${cnt} / ${tot} <span class="ccat-pct">(${pct}%)</span></div>
              </div>
            </div>
            <div class="ccat-progress"><div class="ccat-progress-fill" style="width:${pct}%"></div></div>
            <div class="ccat-reward-row">
              <div class="ccat-reward cur"><span class="cr-label">當前效果</span><span class="cr-val">${curStatStr}</span></div>
              <div class="ccat-reward next"><span class="cr-label">下一階段</span><span class="cr-val">${nextStatStr}</span></div>
            </div>
          </div>`;
      }).join('')}
    </div>`;
  } else if (codexCollectTab === 'effects') {
    // 計算各屬性的總加成與上限
    const statInfo = [];
    const bonus = getCollectionBonus();
    const statNames = {
      atkPct: '近距離傷害', defPct: '遠距離傷害', hpMax: '最大生命', crit: '暴擊率',
      critDmg: '暴擊傷害', mpMax: '最大魔力', dropPct: '道具掉落率', expPct: '經驗值獲得',
      atk: '攻擊力', def: '防禦力',
    };
    // 每個類別計算各屬性已達成/最大
    const summary = {};
    for (const cat in COLLECTION_REWARDS) {
      const rewards = COLLECTION_REWARDS[cat];
      const count = getCollectionCount(cat);
      rewards.forEach(r => {
        for (const s in r.stats) {
          if (!summary[s]) summary[s] = { cur: 0, max: 0, cats: [] };
          summary[s].max += r.stats[s];
          if (count >= r.count) summary[s].cur += r.stats[s];
        }
      });
    }
    content = `<div class="collection-effects-list">
      ${Object.entries(summary).map(([stat, info]) => {
        const pct = info.max > 0 ? (info.cur / info.max * 100).toFixed(0) : 0;
        const isPct = stat.includes('Pct') || stat === 'crit' || stat === 'critDmg';
        const valStr = isPct ? `+${info.cur}% / +${info.max}%` : `+${info.cur} / +${info.max}`;
        return `
          <div class="effect-row">
            <div class="effect-name">${statNames[stat] || stat}</div>
            <div class="effect-val" style="color:var(--gold-bright)">${valStr}</div>
            <div class="effect-bar"><div class="effect-bar-fill" style="width:${pct}%"></div></div>
          </div>`;
      }).join('')}
    </div>`;
  } else if (codexCollectTab === 'sets') {
    // 完成收藏套裝：① 階段收藏 ② 品質套裝（同一品質全部收集）
    let allSets = [];
    // 1. 階段收藏
    for (const cat in COLLECTION_REWARDS) {
      const rewards = COLLECTION_REWARDS[cat];
      const count = getCollectionCount(cat);
      const catName = cats.find(c => c.key === cat)?.name || cat;
      rewards.forEach((r, idx) => {
        allSets.push({ cat, name: r.name, count: r.count, stats: r.stats, achieved: count >= r.count, catName, idx, type: 'stage' });
      });
    }
    // 2. 品質套裝（英雄 / 守護 / 變身 / 裝備）
    const setCats = ['hero', 'pet', 'transform', 'equip'];
    const rarityOrder = ['white', 'green', 'blue', 'red', 'purple', 'gold'];
    setCats.forEach(cat => {
      const catName = cats.find(c => c.key === cat)?.name || cat;
      rarityOrder.forEach(rarity => {
        if (!SET_REWARDS[cat]?.[rarity]) return;
        const prog = getSetProgress(cat, rarity);
        const r = SET_REWARDS[cat][rarity];
        allSets.push({
          cat, name: r.name, rarity,
          stats: r.stats, achieved: prog.complete,
          catName, owned: prog.owned, total: prog.total, type: 'set'
        });
      });
    });
    const achievedCount = allSets.filter(s => s.achieved).length;
    const statNames = { atkPct: '攻擊+', defPct: '防禦+', hpMax: 'HP+', crit: '暴擊+', critDmg: '暴傷+', mpMax: '魔力+', dropPct: '掉寶+', expPct: '經驗+', evasion: '閃避+', atkSpeed: '攻速+', moveSpeed: '移速+', allPct: '全屬性+' };
    content = `
      <div style="margin-bottom:12px;text-align:center">
        <div style="font-size:12px;color:var(--parchment-dark)">已完成收藏套裝</div>
        <div style="font-size:28px;font-weight:900;color:var(--gold-bright);text-shadow:0 0 10px rgba(240,192,64,0.5)">${achievedCount} / ${allSets.length}</div>
      </div>
      <div class="collection-sets-grid">
        ${allSets.map(s => {
          const statStr = Object.entries(s.stats).map(([k,v]) => `${statNames[k]||k}${v}${k.includes('Pct')||k==='allPct'?'%':''}`).join(' ');
          const reqText = s.type === 'stage'
            ? `收集 ${s.count} 件 · ${s.catName}`
            : `${s.owned} / ${s.total} · ${s.catName}${RARITY_CONFIG[s.rarity]?.name || ''}`;
          return `
            <div class="collection-set-card ${s.achieved ? 'achieved' : ''} rarity-${s.rarity || 'white'}">
              <div class="cset-icon">${s.achieved ? '🏆' : '🔒'}</div>
              <div class="cset-name">${s.name}</div>
              <div class="cset-stat">${statStr}</div>
              <div class="cset-req">${reqText}</div>
            </div>`;
        }).join('')}
      </div>`;
  } else if (codexCollectTab === 'equip_combos') {
    // 裝備圖鑑組合系統（66 種）- 提交制
    const comboCats = [
      { key: 'all',        name: '全部' },
      { key: 'weapon',     name: '武器組合' },
      { key: 'armor',      name: '防具組合' },
      { key: 'accessory',  name: '飾品組合' },
      { key: 'quality',    name: '同品質' },
      { key: 'boss',       name: 'Boss套' },
      { key: 'full',       name: '全收藏' },
      { key: 'done',       name: '已完成' },
    ];
    // 右側屬性篩選
    const statFilters = ['atk', 'def', 'hpMax', 'mpMax', 'hit', 'evasion', 'crit', 'critDmg', 'atkSpeed', 'moveSpeed'];
    const statFilterLabels = { atk: '攻擊', def: '防禦', hpMax: 'HP', mpMax: 'MP', hit: '命中', evasion: '閃避', crit: '暴擊', critDmg: '暴傷', atkSpeed: '攻速', moveSpeed: '移速' };
    if (typeof equipComboCatFilter === 'undefined') equipComboCatFilter = 'all';
    if (typeof equipComboStatFilter === 'undefined') equipComboStatFilter = [];
    let filtered = equipComboCatFilter === 'all' ? EQUIP_COMBOS
      : equipComboCatFilter === 'done' ? EQUIP_COMBOS.filter(c => GS.equipCombosDone?.[c.id])
      : EQUIP_COMBOS.filter(c => c.category === equipComboCatFilter);
    // 屬性篩選
    if (equipComboStatFilter.length > 0) {
      filtered = filtered.filter(c => equipComboStatFilter.some(sf => c.stats[sf] !== undefined));
    }
    const statNames = { atk: '攻擊', def: '防禦', hpMax: '生命', mpMax: '魔力', crit: '暴擊', critDmg: '暴傷', evasion: '閃避', hit: '命中', moveSpeed: '移速', atkSpeed: '攻速' };
    const doneCount = EQUIP_COMBOS.filter(c => GS.equipCombosDone?.[c.id]).length;

    content = `
      <div class="equip-codex-layout" style="display:flex;gap:10px;height:100%">
        <!-- 左側分類欄 -->
        <div class="equip-codex-sidebar" style="width:100px;flex-shrink:0;display:flex;flex-direction:column;gap:4px;padding:8px 4px;background:rgba(20,14,8,0.7);border-radius:8px;border:1px solid rgba(240,192,64,0.15);overflow-y:auto">
          <div style="font-size:11px;color:var(--gold-bright);font-weight:700;text-align:center;margin-bottom:4px;padding:4px 0;border-bottom:1px solid rgba(240,192,64,0.2)">分類</div>
          ${comboCats.map(c => `
            <button class="equip-codex-cat-btn ${equipComboCatFilter === c.key ? 'active' : ''}" data-combo-cat="${c.key}" style="width:100%;padding:6px 4px;font-size:10px;border-radius:5px;border:1px solid ${equipComboCatFilter === c.key ? 'var(--gold-bright)' : 'rgba(240,192,64,0.15)'};background:${equipComboCatFilter === c.key ? 'linear-gradient(180deg, rgba(80,50,20,0.95), rgba(40,25,10,0.95))' : 'transparent'};color:${equipComboCatFilter === c.key ? 'var(--gold-bright)' : 'var(--parchment-dark)'};cursor:pointer;font-weight:600;text-align:left;padding-left:8px;transition:all 0.15s">${c.name}</button>
          `).join('')}
          <div style="flex:1"></div>
          <div style="font-size:10px;color:var(--parchment-dark);text-align:center;padding:4px;border-top:1px solid rgba(240,192,64,0.1)">
            <div style="font-size:9px">已完成</div>
            <div style="font-size:16px;font-weight:900;color:var(--gold-bright);text-shadow:0 0 6px rgba(240,192,64,0.5)">${doneCount}/${EQUIP_COMBOS_COUNT}</div>
          </div>
        </div>
        <!-- 中間：組合列表 -->
        <div class="equip-combos-list" style="flex:1;display:flex;flex-direction:column;gap:12px;overflow-y:auto;padding-right:4px;min-width:0">
          ${filtered.length === 0 ? '<div style="padding:30px;text-align:center;color:var(--parchment-dark);font-size:12px">暫無符合條件的組合</div>' : filtered.map(combo => {
            const prog = getEquipComboProgress(combo);
            const rc = RARITY_CONFIG[combo.rarity] || RARITY_CONFIG.white;
            const pct = prog.total > 0 ? (prog.have / prog.total * 100).toFixed(0) : 0;
            const statStr = Object.entries(combo.stats).map(([k, v]) => `${statNames[k] || k}+${v}`).join(' ');
            // 計算是否有可提交的裝備
            let canSubmitAny = false;
            if (!prog.complete) {
              for (const itemId of combo.items) {
                const need = getEquipSubmitCount(combo, itemId);
                const cur = getComboItemProgress(combo.id, itemId);
                if (cur < need) {
                  const bagItems = GS.inventory.filter(i => i.id === itemId && i.itemType === 'equipment');
                  let avail = 0; bagItems.forEach(i => avail += (i.count || 1));
                  if (avail > 0) { canSubmitAny = true; break; }
                }
              }
            }
            return `
              <div class="equip-combo-card ${prog.complete ? 'achieved' : ''} rarity-${combo.rarity}" data-combo-id="${combo.id}" style="padding:12px 14px;border-radius:10px;border:1.5px solid ${prog.complete ? rc.color : 'rgba(240,192,64,0.2)'};background:linear-gradient(135deg, ${prog.complete ? 'rgba(80,50,20,0.7)' : 'rgba(40,28,16,0.55)'}, rgba(20,14,8,0.5));box-shadow:${prog.complete ? `0 0 12px ${rc.glow || rc.color}40, inset 0 0 20px ${rc.color}15` : 'inset 0 0 15px rgba(0,0,0,0.3)'};position:relative">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px">
                  <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1">
                    <div style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;background:${prog.complete ? rc.color : 'rgba(0,0,0,0.5)'};color:#fff;flex-shrink:0;box-shadow:0 0 6px ${rc.color};border:1.5px solid ${rc.color}">${prog.complete ? '✓' : prog.total}</div>
                    <div style="font-size:13px;font-weight:700;color:${prog.complete ? rc.color : 'var(--gold-bright)'};text-shadow:0 1px 2px rgba(0,0,0,0.8);white-space:normal;word-break:break-all;line-height:1.2">${combo.name}</div>
                    ${prog.complete ? '<div style="font-size:9px;padding:2px 6px;background:rgba(80,220,100,0.2);color:#70ff80;border-radius:10px;border:1px solid rgba(100,255,120,0.4);font-weight:700;flex-shrink:0">已完成</div>' : `<div style="font-size:9px;padding:2px 6px;background:${rc.color}20;color:${rc.color};border-radius:10px;border:1px solid ${rc.color}60;font-weight:700;flex-shrink:0">${rc.name || ''}</div>`}
                  </div>
                  <div style="font-size:11px;font-weight:700;color:${prog.complete ? '#70ff80' : 'var(--parchment-dark)'};flex-shrink:0">${prog.have}/${prog.total}</div>
                </div>
                <!-- 裝備槽列表 -->
                <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;align-items:center">
                  ${combo.items.map(eid => {
                    const eq = EQUIP_POOL.find(e => e.id === eid);
                    const need = getEquipSubmitCount(combo, eid);
                    const cur = getComboItemProgress(combo.id, eid);
                    const filled = cur >= need;
                    const eqType = eq?.type || 'weapon';
                    const iconUrl = eq ? getEquipIcon(eqType) : EQUIP_ICON_MAP.weapon;
                    const eqRc = RARITY_CONFIG[eq?.rarity || 'white'] || {};
                    // 計算背包中可用數量
                    const bagItems = GS.inventory.filter(i => i.id === eid && i.itemType === 'equipment');
                    let avail = 0; bagItems.forEach(i => avail += (i.count || 1));
                    const canSubmit = !filled && avail > 0 && !prog.complete;
                    return `
                      <div class="equip-slot ${filled ? 'filled' : canSubmit ? 'available' : 'empty'}" data-combo-id="${combo.id}" data-item-id="${eid}" title="${eq?.name || eid} (${cur}/${need})" style="width:42px;height:42px;border-radius:6px;border:2px solid ${filled ? eqRc.color : canSubmit ? '#80d0ff' : 'rgba(120,100,80,0.4)'};background:${filled ? 'rgba(60,40,20,0.7)' : 'rgba(20,14,8,0.8)'};display:flex;align-items:center;justify-content:center;position:relative;cursor:${canSubmit ? 'pointer' : 'default'};box-shadow:${filled ? `0 0 6px ${eqRc.color}60, inset 0 0 8px ${eqRc.color}30` : canSubmit ? '0 0 6px rgba(120,200,255,0.4)' : 'none'};transition:all 0.15s" onmouseover="${canSubmit ? "this.style.boxShadow='0 0 10px rgba(120,200,255,0.8);this.style.borderColor='#a0e0ff'" : ''}" onmouseout="${canSubmit ? "this.style.boxShadow='0 0 6px rgba(120,200,255,0.4)';this.style.borderColor='#80d0ff'" : ''}">
                        <img src="${iconUrl}" style="width:72%;height:72%;object-fit:contain;display:block;filter:${filled ? 'none' : 'grayscale(1) brightness(0.4)'};opacity:${filled ? '1' : '0.6'}" alt=""/>
                        <div style="position:absolute;bottom:-2px;right:-2px;background:${filled ? eqRc.color : 'rgba(60,50,40,0.9)'};color:${filled ? '#fff' : 'var(--parchment-dark)'};font-size:9px;font-weight:700;padding:1px 3px;border-radius:3px;line-height:1;border:1px solid ${filled ? eqRc.color : 'rgba(120,100,80,0.3)'}">${cur}/${need}</div>
                      </div>`;
                  }).join('')}
                </div>
                <!-- 進度條 -->
                <div style="position:relative;height:5px;background:rgba(0,0,0,0.5);border-radius:3px;overflow:hidden;margin-bottom:6px">
                  <div style="position:absolute;left:0;top:0;bottom:0;width:${pct}%;background:linear-gradient(90deg, ${rc.color}, ${rc.glow || rc.color});transition:width 0.3s"></div>
                </div>
                <!-- 底部：獎勵 + 提交按鈕 -->
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
                  <div style="font-size:10px;color:${prog.complete ? '#90ffb0' : 'var(--parchment-dark)'};line-height:1.3">
                    ${statStr}
                  </div>
                  ${prog.complete
                    ? `<div style="font-size:10px;color:#70ff80;font-weight:700;flex-shrink:0">✓ 屬性已生效</div>`
                    : `<button class="combo-submit-btn" data-quick-submit="${combo.id}" ${canSubmitAny ? '' : 'disabled'} style="padding:4px 10px;font-size:10px;font-weight:700;border-radius:4px;border:1px solid ${canSubmitAny ? 'var(--gold-bright)' : 'rgba(120,100,80,0.3)'};background:${canSubmitAny ? 'linear-gradient(180deg, #d4a020, #8a6520)' : 'rgba(60,50,40,0.5)'};color:${canSubmitAny ? '#fff' : 'rgba(200,180,150,0.4)'};cursor:${canSubmitAny ? 'pointer' : 'not-allowed'};text-shadow:0 1px 2px rgba(0,0,0,0.6);flex-shrink:0">${canSubmitAny ? '一鍵提交' : '缺裝備'}</button>`
                  }
                </div>
              </div>`;
          }).join('')}
        </div>
        <!-- 右側：屬性篩選 -->
        <div class="equip-codex-stats" style="width:72px;flex-shrink:0;display:flex;flex-direction:column;gap:3px;padding:6px 4px;background:rgba(20,14,8,0.7);border-radius:8px;border:1px solid rgba(240,192,64,0.15);overflow-y:auto">
          <div style="font-size:10px;color:var(--gold-bright);font-weight:700;text-align:center;margin-bottom:3px;padding:3px 0;border-bottom:1px solid rgba(240,192,64,0.2)">屬性篩選</div>
          ${statFilters.map(sf => {
            const active = equipComboStatFilter.includes(sf);
            return `
              <label class="stat-filter-item" style="display:flex;align-items:center;gap:5px;padding:4px 6px;font-size:10px;border-radius:4px;cursor:pointer;color:${active ? 'var(--gold-bright)' : 'var(--parchment-dark)'};background:${active ? 'rgba(80,50,20,0.6)' : 'transparent'};border:1px solid ${active ? 'var(--gold-bright)' : 'transparent'};transition:all 0.15s" onmouseover="this.style.background='rgba(80,50,20,0.4)'" onmouseout="this.style.background='${active ? 'rgba(80,50,20,0.6)' : 'transparent'}'">
                <input type="checkbox" data-stat-filter="${sf}" ${active ? 'checked' : ''} style="width:11px;height:11px;accent-color:var(--gold-bright);margin:0"/>
                <span style="flex:1">${statFilterLabels[sf] || sf}</span>
              </label>
            `;
          }).join('')}
          <div style="flex:1"></div>
          <button class="stat-filter-reset" data-stat-clear="1" style="padding:4px;font-size:9px;border-radius:4px;border:1px solid rgba(240,192,64,0.3);background:rgba(60,45,25,0.5);color:var(--parchment-dark);cursor:pointer">清除篩選</button>
        </div>
      </div>`;
  }

  return `
    <div class="codex-main-tabs">
      <button class="codex-main-tab ${codexMainTab === 'codex' ? 'active' : ''}" data-main-tab="codex">圖鑑</button>
      <button class="codex-main-tab ${codexMainTab === 'collection' ? 'active' : ''}" data-main-tab="collection">蒐藏</button>
    </div>
    <div class="collection-header">
      <div class="collection-total-label">總蒐藏進度</div>
      <div class="collection-total-num">${totalPct}%</div>
      <div class="collection-total-bar"><div class="collection-total-fill" style="width:${totalPct}%"></div></div>
      <div class="collection-total-sub">${totalOwned} / ${totalAll} 件</div>
    </div>
    <div class="collection-sub-tabs">
      ${subTabs.map(t => `<button class="collection-sub-tab ${codexCollectTab === t.key ? 'active' : ''}" data-col-sub="${t.key}">${t.name}</button>`).join('')}
    </div>
    <div class="collection-content">
      ${content}
    </div>
  `;
}

function showCodexDetail(id, type) {
  let item, owned, spriteHtml = '', stats = {}, skill = {}, rarity = 'white';
  const nameMap = { atk: '攻擊力', def: '防禦力', hpMax: '生命值', crit: '暴擊率', critDmg: '暴擊傷害', mpMax: '魔力', hit: '命中', dodge: '閃躲', walkSpeedPct: '移動速度%', atkSpeedPct: '攻擊速度%', expPct: '經驗加成%', dropPct: '掉寶率', shield: '護盾值', hpRegen: '生命回復', mpRegen: '魔力回復' };

  if (type === 'hero') {
    item = SUMMON_POOL.find(i => i.id === id);
    owned = GS.ownedHeroes.find(o => o.id === id);
    if (!item) return;
    rarity = item.rarity;
    stats = item.stats || {};
    skill = item.skill || {};
    spriteHtml = owned && item.sprite ? spriteEmojiHTML(item.sprite, 120) : '';
  } else if (type === 'pet') {
    item = PET_POOL.find(i => i.id === id);
    owned = GS.ownedPets.find(o => o.id === id);
    if (!item) return;
    rarity = item.rarity;
    stats = item.stats || {};
    spriteHtml = owned && item.spriteKey ? spriteEmojiHTML(SPRITE[item.spriteKey], 120) : '';
  } else if (type === 'transform') {
    item = TRANSFORM_POOL.find(i => i.id === id);
    if (!GS.ownedTransforms) GS.ownedTransforms = [];
    owned = GS.ownedTransforms.find(o => o.id === id);
    if (!item) return;
    rarity = item.rarity;
    stats = item.stats || {};
    const iconUrl = getTransformIcon(item.spriteKey);
    const rc = RARITY_CONFIG[rarity] || RARITY_CONFIG.white;
    spriteHtml = owned
      ? `<img src="${iconUrl}" style="width:100px;height:100px;object-fit:cover;border-radius:8px;border:3px solid ${rc.color};box-shadow:0 0 15px ${rc.glow}"/>`
      : `<div style="width:100px;height:100px;background:#222;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#555;font-size:32px">?</div>`;
  } else if (type === 'equip') {
    item = EQUIP_POOL.find(i => i.id === id);
    const equipIds = new Set();
    GS.inventory?.filter(i => i.itemType === 'equipment').forEach(i => equipIds.add(i.id));
    for (const slot in (GS.equipment || {})) {
      const eq = GS.equipment[slot];
      if (eq?.id) equipIds.add(eq.id);
    }
    owned = equipIds.has(id);
    if (!item) return;
    rarity = item.rarity;
    stats = item.baseStats || item.stats || {};
    const iconUrl = EQUIP_ICON_MAP[item.type] || ITEM_ICONS.weapon;
    spriteHtml = owned
      ? `<img src="${iconUrl}" style="width:80px;height:80px;object-fit:contain;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.6))"/>`
      : `<div style="width:80px;height:80px;background:#222;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#555;font-size:32px">?</div>`;
  } else if (type === 'item') {
    const itemList = [
      { id: 'hp1', name: '小型生命藥水', rarity: 'white',  icon: ITEM_ICONS.hp1,   desc: '恢復少量生命' },
      { id: 'hp2', name: '中型生命藥水', rarity: 'green',  icon: ITEM_ICONS.hp2,   desc: '恢復中等生命' },
      { id: 'hp3', name: '大型生命藥水', rarity: 'blue',   icon: ITEM_ICONS.hp3,   desc: '恢復大量生命' },
      { id: 'mp1', name: '小型魔力藥水', rarity: 'white',  icon: ITEM_ICONS.mp1,   desc: '恢復少量魔力' },
      { id: 'mp2', name: '中型魔力藥水', rarity: 'green',  icon: ITEM_ICONS.mp2,   desc: '恢復中等魔力' },
      { id: 'mp3', name: '大型魔力藥水', rarity: 'blue',   icon: ITEM_ICONS.mp3,   desc: '恢復大量魔力' },
      { id: 'spd1', name: '加速藥水',   rarity: 'blue',   icon: ITEM_ICONS.spd1,  desc: '攻擊速度提升' },
      { id: 'spd2', name: '狂暴藥水',   rarity: 'red',    icon: ITEM_ICONS.spd2,  desc: '攻擊速度與攻擊力提升' },
      { id: 'move1', name: '行走加速藥水',  rarity: 'green',  icon: ITEM_ICONS.move1, desc: '移動速度提升' },
      { id: 'mgem',  name: '魔法寶石',  rarity: 'blue',   icon: ITEM_ICONS.mgem,  desc: '強力技能必備消耗品' },
      { id: 'teleport', name: '傳送卷軸', rarity: 'green', icon: ITEM_ICONS.teleport, desc: '瞬間移動至指定地點' },
      { id: 'enhance', name: '強化提升券', rarity: 'purple', icon: ITEM_ICONS.enhance_ticket, desc: '提升合成成功率' },
      { id: 'chest', name: '神秘寶箱',   rarity: 'purple', icon: ITEM_ICONS.chest,   desc: '打開獲得隨機獎勵' },
      { id: 'tscroll', name: '變身卷軸', rarity: 'purple', icon: ITEM_ICONS.tscroll, desc: '使用可變身4小時' },
    ];
    item = itemList.find(i => i.id === id);
    const ownedIds = new Set(GS.inventory?.filter(i => i.itemType === 'consumable').map(i => i.id) || []);
    owned = ownedIds.has(id);
    if (!item) return;
    rarity = item.rarity;
    spriteHtml = owned
      ? `<img src="${item.icon}" style="width:80px;height:80px;object-fit:contain;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.6))"/>`
      : `<div style="width:80px;height:80px;background:#222;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#555;font-size:32px">?</div>`;
  } else if (type === 'monster') {
    const monsters = [
      { id: 'goblin',   name: '哥布林',       rarity: 'white',  spriteKey: 'goblin' },
      { id: 'slime',    name: '史萊姆',       rarity: 'white',  spriteKey: 'slime' },
      { id: 'spider',   name: '巨蛛',         rarity: 'white',  spriteKey: 'spider' },
      { id: 'orc',      name: '獸人戰士',     rarity: 'green',  spriteKey: 'orc' },
      { id: 'skeleton', name: '骷髏兵',       rarity: 'green',  spriteKey: 'skeleton' },
      { id: 'scorpion', name: '巨蠍',         rarity: 'blue',   spriteKey: 'scorpion' },
      { id: 'bat',      name: '吸血蝙蝠',     rarity: 'blue',   spriteKey: 'bat' },
      { id: 'demon',    name: '惡魔',         rarity: 'red',    spriteKey: 'demon' },
      { id: 'zombie',   name: '殭屍',         rarity: 'green',  spriteKey: 'zombie' },
      { id: 'dragon',   name: '巨龍',         rarity: 'purple', spriteKey: 'dragon' },
      { id: 'boss_orc', name: '哥布林王',     rarity: 'red',    spriteKey: 'boss_orc', boss: true },
      { id: 'boss_demon', name: '惡魔領主',   rarity: 'purple', spriteKey: 'boss_demon', boss: true },
    ];
    item = monsters.find(m => m.id === id);
    const killedIds = new Set(GS.killedMonsters || []);
    owned = killedIds.has(id);
    if (!item) return;
    rarity = item.rarity;
    const sp = SPRITE[item.spriteKey];
    if (sp?.useImg && sp.idle && owned) {
      spriteHtml = `<img src="${sp.idle}" style="height:100px;object-fit:contain;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.6))"/>`;
    } else {
      spriteHtml = '<div style="font-size:48px;color:#555">?</div>';
    }
  }

  if (!item) return;
  const rarityInfo = RARITY_CONFIG[rarity] || RARITY_CONFIG.white;
  const statRows = Object.keys(stats).length > 0
    ? Object.entries(stats).map(([k, v]) => {
        const n = nameMap[k] || k;
        const pct = (k === 'crit' || k === 'critDmg') ? '%' : '';
        return `<div class="stat-row"><span>${n}</span><span>${v}${pct}</span></div>`;
      }).join('')
    : '';

  const modal = document.createElement('div');
  modal.className = 'codex-detail-modal';
  let actionBtn = '';
  if (owned && type === 'hero') {
    actionBtn = `<button class="codex-equip-btn" ${GS.equippedHeroId === id ? 'disabled' : ''} data-action="hero-equip">${GS.equippedHeroId === id ? '已出戰' : '出戰'}</button>`;
  } else if (owned && type === 'pet') {
    actionBtn = `<button class="codex-equip-btn" ${GS.equippedPetId === id ? 'disabled' : ''} data-action="pet-equip">${GS.equippedPetId === id ? '已出戰' : '出戰'}</button>`;
  } else if (owned && type === 'transform') {
    const scrollCount = (GS.inventory?.find(i => i.id === 'tscroll')?.count) || 0;
    const currentlyActive = GS.player.transformId === id;
    actionBtn = currentlyActive
      ? `<button class="codex-equip-btn" disabled style="background:linear-gradient(180deg,#d4a020,#a07010);color:#fff;border-color:#f0c040;text-shadow:0 1px 2px rgba(0,0,0,0.6)">✦ 變身中 ✦</button>`
      : `<button class="codex-equip-btn" ${scrollCount > 0 ? '' : 'disabled'} data-action="transform-use">使用卷軸變身 (${scrollCount})</button>`;
  }

  modal.innerHTML = `
    <div class="codex-detail-inner rarity-${rarity}">
      <button class="codex-detail-close">×</button>
      <div class="codex-detail-sprite">${spriteHtml}</div>
      <div class="codex-detail-name">${owned ? item.name : '???'}</div>
      <div class="codex-detail-rarity" style="color:${rarityInfo.color}">${rarityInfo.name}${type === 'monster' && item.boss ? ' · BOSS' : ''}</div>
      ${owned ? `
        <div class="codex-detail-desc">${item.desc || ''}</div>
        ${statRows ? `<div class="codex-detail-stats">${statRows}</div>` : ''}
        ${skill && skill.name ? `
          <div class="codex-detail-skill">
            <div class="skill-name">${skill.name}</div>
            <div class="skill-desc">${skill.desc || ''}</div>
          </div>
        ` : ''}
        ${actionBtn}
      ` : `
        <div class="codex-detail-locked">尚未獲得</div>
      `}
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  modal.querySelector('.codex-detail-close').addEventListener('click', () => modal.remove());

  const actBtn = modal.querySelector('[data-action]');
  if (actBtn && owned) {
    actBtn.addEventListener('click', () => {
      const action = actBtn.dataset.action;
      if (action === 'hero-equip') {
        equipHero(id); actBtn.textContent = '已出戰'; actBtn.disabled = true;
      } else if (action === 'pet-equip') {
        GS.equippedPetId = id; updateSlotDisplay(); actBtn.textContent = '已出戰'; actBtn.disabled = true;
      } else if (action === 'transform-use') {
        if (useTransformScroll(id)) { actBtn.textContent = '變身中'; actBtn.disabled = true; }
      }
      updateUI();
      setTimeout(() => { modal.remove(); renderCodexPage(); }, 400);
    });
  }
}

// ==================== 圖鑑獨立Overlay渲染 ====================
function renderCodexFullPage() {
  const headerHtml = `
    <div class="ov-header">
      <button class="ov-back-btn" id="codex-overlay-close">←</button>
      <div class="ov-title">圖鑑</div>
      <div style="width:36px"></div>
    </div>
    <div class="ov-content">
      ${renderCodexPage()}
    </div>
  `;
  return headerHtml;
}

function bindCodexOverlayEvents() {
  const overlay = document.getElementById('codex-overlay');
  if (!overlay) return;
  const closeBtn = overlay.querySelector('#codex-overlay-close');
  if (closeBtn) closeBtn.addEventListener('click', () => {
    overlay.remove();
    // 確保關閉後殘留的side-page完全隱藏，避免出現空白頁
    if (el.sidePage) { el.sidePage.classList.remove('open'); el.sidePage.style.display = 'none'; }
  });
  
  overlay.querySelectorAll('[data-main-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      codexMainTab = btn.dataset.mainTab;
      overlay.innerHTML = renderCodexFullPage();
      bindCodexOverlayEvents();
    });
  });
  overlay.querySelectorAll('[data-col-sub]').forEach(btn => {
    btn.addEventListener('click', () => {
      codexCollectTab = btn.dataset.colSub;
      overlay.innerHTML = renderCodexFullPage();
      bindCodexOverlayEvents();
    });
  });
  overlay.querySelectorAll('.codex-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      codexTab = btn.dataset.tab; codexRarityFilter = 'all';
      overlay.innerHTML = renderCodexFullPage();
      bindCodexOverlayEvents();
    });
  });
  overlay.querySelectorAll('.rarity-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      codexRarityFilter = btn.dataset.rarity;
      overlay.innerHTML = renderCodexFullPage();
      bindCodexOverlayEvents();
    });
  });
  overlay.querySelectorAll('.codex-card').forEach(card => {
    card.addEventListener('click', () => showCodexDetail(card.dataset.id, card.dataset.type));
  });
  // 裝備套圖鑑：分類按鈕
  overlay.querySelectorAll('[data-combo-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      equipComboCatFilter = btn.dataset.comboCat;
      overlay.innerHTML = renderCodexFullPage();
      bindCodexOverlayEvents();
    });
  });
  // 裝備套圖鑑：裝備槽點擊提交
  overlay.querySelectorAll('.equip-slot[data-item-id]').forEach(slot => {
    slot.addEventListener('click', e => {
      e.stopPropagation();
      const comboId = slot.dataset.comboId;
      const itemId = slot.dataset.itemId;
      const result = submitEquipToCombo(comboId, itemId, 1);
      if (result.success) {
        if (result.comboComplete) addLog('system', `✨ 組合完成！屬性加成已生效`);
        overlay.innerHTML = renderCodexFullPage();
        bindCodexOverlayEvents();
        updateUI();
      } else {
        showFloatingText(result.reason || '無法提交', '#ff8080');
      }
    });
  });
  // 裝備套圖鑑：一鍵提交
  overlay.querySelectorAll('[data-quick-submit]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const comboId = btn.dataset.quickSubmit;
      const result = quickSubmitCombo(comboId);
      if (result.totalSubmitted > 0) {
        if (result.completed) addLog('system', `✨ 組合完成！屬性加成已生效`);
        overlay.innerHTML = renderCodexFullPage();
        bindCodexOverlayEvents();
        updateUI();
      } else {
        showFloatingText('沒有可提交的裝備', '#ff8080');
      }
    });
  });
  // 裝備套圖鑑：屬性篩選
  overlay.querySelectorAll('[data-stat-filter]').forEach(cb => {
    cb.addEventListener('change', () => {
      const stat = cb.dataset.statFilter;
      if (!equipComboStatFilter) equipComboStatFilter = [];
      if (cb.checked) {
        if (!equipComboStatFilter.includes(stat)) equipComboStatFilter.push(stat);
      } else {
        equipComboStatFilter = equipComboStatFilter.filter(s => s !== stat);
      }
      overlay.innerHTML = renderCodexFullPage();
      bindCodexOverlayEvents();
    });
  });
  // 裝備套圖鑑：清除篩選
  overlay.querySelectorAll('[data-stat-clear]').forEach(btn => {
    btn.addEventListener('click', () => {
      equipComboStatFilter = [];
      overlay.innerHTML = renderCodexFullPage();
      bindCodexOverlayEvents();
    });
  });
}

// ==================== 合成獨立Overlay渲染 ====================
function renderSynthFullPage() {
  return `
    <div class="ov-header">
      <button class="ov-back-btn" id="synth-overlay-close">←</button>
      <div class="ov-title">合成</div>
      <div style="width:36px"></div>
    </div>
    <div class="ov-content">
      ${renderSynthPageHTML()}
    </div>
  `;
}

function bindSynthOverlayEvents() {
  const overlay = document.getElementById('synth-overlay');
  if (!overlay) return;
  const closeBtn = overlay.querySelector('#synth-overlay-close');
  if (closeBtn) closeBtn.addEventListener('click', closeSynthOverlay);
  
  // 切換分頁
  overlay.querySelectorAll('.synth-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      synthTab = btn.dataset.tab;
      overlay.innerHTML = renderSynthFullPage();
      bindSynthOverlayEvents();
    });
  });
  // 品質選擇
  overlay.querySelectorAll('.synth-rarity-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      synthRarity = btn.dataset.rarity;
      synthBoosters = 0;
      overlay.innerHTML = renderSynthFullPage();
      bindSynthOverlayEvents();
    });
  });
  // 強化券增減
  overlay.querySelectorAll('.synth-booster-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.action;
      if (act === 'inc' && synthBoosters < 5) synthBoosters++;
      if (act === 'dec' && synthBoosters > 0) synthBoosters--;
      overlay.innerHTML = renderSynthFullPage();
      bindSynthOverlayEvents();
    });
  });
  const doBtn = overlay.querySelector('#synth-do-btn');
  if (doBtn) doBtn.addEventListener('click', () => doSynthesizeInOverlay());
}

function doSynthesizeInOverlay() {
  const overlay = document.getElementById('synth-overlay');
  const pool = synthTab === 'hero' ? SUMMON_POOL : synthTab === 'pet' ? PET_POOL : TRANSFORM_POOL;
  const ownedList = synthTab === 'hero' ? GS.ownedHeroes : synthTab === 'pet' ? GS.ownedPets : (GS.ownedTransforms || []);
  const nextRarityIdx = RARITY_ORDER.indexOf(synthRarity) + 1;
  if (nextRarityIdx >= RARITY_ORDER.length) return;
  const nextRarity = RARITY_ORDER[nextRarityIdx];
  const sameRarity = ownedList.filter(o => o.rarity === synthRarity);
  if (sameRarity.length < 4) { alert('材料不足，需要4張同品質卡'); return; }
  const gemCost = synthBoosters * 10;
  if (gemCost > GS.resources.gem) { alert('鑽石不足'); return; }
  GS.resources.gem -= gemCost;
  const baseRate = SYNTH_BASE_RATES[synthRarity + '-' + nextRarity];
  const rate = Math.min(0.99, baseRate * Math.pow(1.2, synthBoosters));
  // 扣除4張
  const toRemove = sameRarity.slice(0, 4);
  toRemove.forEach(item => {
    const idx = ownedList.findIndex(o => o.id === item.id);
    if (idx >= 0) ownedList.splice(idx, 1);
  });
  const success = Math.random() < rate;
  let resultItem = null;
  if (success) {
    const candidates = pool.filter(i => i.rarity === nextRarity);
    if (candidates.length > 0) {
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      const existing = ownedList.find(o => o.id === picked.id);
      if (existing) { existing.level = (existing.level || 1) + 1; }
      else { ownedList.push({ ...picked, level: 1 }); }
      resultItem = picked;
      // 蒐藏刷新
    }
  }
  synthBoosters = 0;
  updateUI();
  updateSlotDisplay();
  showSynthResultOverlay(success, resultItem, nextRarity);
}

function showSynthResultOverlay(success, item, nextRarity) {
  const modal = document.createElement('div');
  modal.className = 'synth-result-modal';
  const rarityInfo = RARITY_CONFIG[nextRarity];
  const sprite = item ? ((synthTab === 'hero' && item.sprite) ? spriteEmojiHTML(item.sprite, 100)
    : (synthTab === 'pet' && item.spriteKey ? spriteEmojiHTML(SPRITE[item.spriteKey], 100)
      : (item.spriteKey ? `<img src="${getTransformIcon(item.spriteKey)}" style="width:100px;height:100px;object-fit:cover;border-radius:8px"/>` : ''))) : '';
  modal.innerHTML = `
    <div class="synth-result-inner ${success ? 'success' : 'fail'}">
      <div class="synth-result-title">${success ? '🎉 合成成功！' : '💔 合成失敗'}</div>
      ${success && item ? `
        <div class="synth-result-sprite rarity-${nextRarity}">${sprite}</div>
        <div class="synth-result-name">${item.name}</div>
        <div class="synth-result-rarity" style="color:${rarityInfo.color}">${rarityInfo.name}</div>
      ` : `<div class="synth-result-fail-text">材料已消失…</div>`}
      <button class="synth-result-close" id="synth-result-ok-btn">確定</button>
    </div>
  `;
  document.body.appendChild(modal);
  const close = () => {
    modal.remove();
    const overlay = document.getElementById('synth-overlay');
    if (overlay) { overlay.innerHTML = renderSynthFullPage(); bindSynthOverlayEvents(); }
  };
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  modal.querySelector('#synth-result-ok-btn').addEventListener('click', close);
}

// ==================== 變身功能 ====================
// 取得變身剩餘時間（毫秒）
function getTransformRemaining() {
  if (!GS.transformEndTime || !GS.player.transformId) return 0;
  return Math.max(0, GS.transformEndTime - Date.now());
}
// 格式化變身剩餘時間
function formatTransformTime(ms) {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}時${String(mm).padStart(2,'0')}分`;
  }
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
// 啟動變身（直接使用，不需卷軸）
function activateTransform(tfId) {
  if (!GS.ownedTransforms) return false;
  const tf = GS.ownedTransforms.find(t => t.id === tfId);
  if (!tf) return false;
  // 职业限制校验：仅通用变身或本职业变身可用
  const playerCls = resolveClassId(GS.player.classId);
  if (!isClassRestrictionMatched(tf.classRestriction, playerCls)) {
    const clsName = Array.isArray(tf.classRestriction)
      ? tf.classRestriction.map(c => CLASSES[c]?.name || c).join('/')
      : (CLASSES[tf.classRestriction]?.name || tf.classRestriction);
    addLog('system', `【${tf.name}】為 ${clsName} 專用變身，當前職業無法使用`);
    return false;
  }
  GS.player.transformId = tfId;
  GS.transformEndTime = Date.now() + 4 * 60 * 60 * 1000; // 4小時
  addLog('system', `啟動變身【${tf.name}】，持續 4 小時`);
  if (window.AudioSystem) AudioSystem.sfxTransform();
  // 添加變身buff
  addTransformBuff();
  // 刷新角色外觀
  updatePlayerSprite();
  // 變身爆發特效
  triggerTransformBurst(tf.rarity);
  calcCP();
  updateRankings();
  updateUI();
  return true;
}

// 刷新玩家sprite外觀（變身切換、地圖切換後調用）
function refreshPlayerSprite() {
  const unit = worldLayer?.querySelector('.world-unit.hero');
  if (!unit) return;
  const spriteObj = getPlayerSprite();
  const spriteEl = unit.querySelector('.sprite');
  if (!spriteEl || !spriteObj) return;
  const imgEl = spriteEl.querySelector('img');
  if (imgEl && spriteObj.useImg) {
    imgEl.src = spriteObj.idle;
    spriteEl.dataset.spriteIdle = spriteObj.idle;
    spriteEl.dataset.spriteAttack = spriteObj.attack || spriteObj.idle;
  }
  // 更新光環
  updateTransformVisual();
}
// 舊函數別名（向後兼容）
function useTransformScroll(tfId) { return activateTransform(tfId); }

// 檢查變身是否到期
// ==================== Buff 系統 ====================
const BUFF_ICONS = {
  transform:  '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrgnianeeg_ve_miaoda',
  atkspd:     '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrgyn27sli_ve_miaoda',
  movespd:    '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrgx6ejygg_ve_miaoda',
  exp:        '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrgyumjgag_ve_miaoda',
  drop:       '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrg2chcolq_ve_miaoda',
  shield:     '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrg5b5ssco_ve_miaoda',
  atkpot:     '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrgyrnfyci_ve_miaoda',
  defpot:     '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrgzhmdgdg_ve_miaoda',
  berserk:    '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrg42s6ggo_ve_miaoda',
  dodge:      '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrgxgcxmcg_ve_miaoda',
};

// 初始化 activeBuffs
function initBuffs() {
  if (!GS.activeBuffs) GS.activeBuffs = [];
}

// 添加 buff（同類型刷新）
function addBuff(type, name, desc, durationSec, stats) {
  if (!GS.activeBuffs) GS.activeBuffs = [];
  const endTime = Date.now() + durationSec * 1000;
  // 同類型刷新時間
  const existing = GS.activeBuffs.find(b => b.type === type);
  if (existing) {
    existing.endTime = endTime;
    existing.desc = desc || existing.desc;
    existing.name = name || existing.name;
    existing.stats = stats || existing.stats;
  } else {
    GS.activeBuffs.push({
      id: 'buff_' + type + '_' + Date.now(),
      type, name, desc,
      icon: BUFF_ICONS[type] || BUFF_ICONS.shield,
      endTime,
      stats: stats || {},
    });
  }
  renderBuffBar();
}

// 移除 buff
function removeBuff(type) {
  if (!GS.activeBuffs) return;
  const idx = GS.activeBuffs.findIndex(b => b.type === type);
  if (idx >= 0) {
    GS.activeBuffs.splice(idx, 1);
    renderBuffBar();
  }
}

// 格式化剩餘時間
function formatBuffTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s >= 3600) return Math.floor(s / 3600) + 'h';
  if (s >= 60) return Math.floor(s / 60) + 'm';
  return s + 's';
}

// 檢查並清理過期 buff
function tickBuffs() {
  if (!GS.activeBuffs || GS.activeBuffs.length === 0) return;
  const now = Date.now();
  let changed = false;
  for (let i = GS.activeBuffs.length - 1; i >= 0; i--) {
    if (GS.activeBuffs[i].endTime <= now) {
      GS.activeBuffs.splice(i, 1);
      changed = true;
    }
  }
  if (changed) renderBuffBar();
}

// 渲染 buff 欄
function renderBuffBar() {
  if (!el.buffBar) return;
  if (!GS.activeBuffs || GS.activeBuffs.length === 0) {
    el.buffBar.innerHTML = '';
    return;
  }
  const now = Date.now();
  el.buffBar.innerHTML = GS.activeBuffs.map(b => {
    const remain = Math.max(0, b.endTime - now);
    const timeStr = formatBuffTime(remain);
    const title = `${b.name}\n${b.desc}\n剩餘：${formatBuffTimeDetail(remain)}`;
    return `
      <div class="buff-icon" data-buff-type="${b.type}" title="${title}">
        <img src="${b.icon}" alt="${b.name}"/>
        <span class="buff-icon-time">${timeStr}</span>
      </div>
    `;
  }).join('');
  
  // 點擊事件
  el.buffBar.querySelectorAll('.buff-icon').forEach(icon => {
    icon.addEventListener('click', () => {
      const type = icon.dataset.buffType;
      const buff = GS.activeBuffs?.find(b => b.type === type);
      if (buff) showBuffDetail(buff);
    });
  });
}

function formatBuffTimeDetail(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}小時${m}分${sec}秒`;
  if (m > 0) return `${m}分${sec}秒`;
  return `${sec}秒`;
}

// buff 詳情彈窗
function showBuffDetail(buff) {
  const remain = Math.max(0, buff.endTime - Date.now());
  const statsStr = buff.stats && Object.keys(buff.stats).length > 0
    ? '<div style="margin-top:6px;color:var(--gold)">' + Object.entries(buff.stats).map(([k, v]) => {
        const nameMap = { atk: '攻擊', def: '防禦', hpMax: '生命', atkSpeedPct: '攻速', walkSpeedPct: '移速', crit: '暴擊', critDmg: '暴傷', expPct: '經驗', dropPct: '掉寶率', dodge: '閃躲', shield: '護盾值' };
        const label = nameMap[k] || k;
        const val = (typeof v === 'number' && v < 1 && k.includes('Pct')) ? (v * 100).toFixed(0) + '%' : v;
        return `<span style="margin-right:8px">${label}+${val}</span>`;
      }).join('') + '</div>'
    : '';
  const html = `
    <div class="modal-overlay" id="buff-detail-modal" style="z-index:500">
      <div class="modal-content" style="width:280px;background:linear-gradient(180deg, #2a1f15, #150d08);border:2px solid var(--gold-dark);border-radius:10px;padding:16px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <img src="${buff.icon}" style="width:40px;height:40px;border-radius:6px;border:2px solid var(--gold)"/>
          <div style="font-size:15px;font-weight:700;color:var(--gold-bright)">${buff.name}</div>
        </div>
        <div style="font-size:12px;color:var(--parchment-light);line-height:1.6">${buff.desc || ''}</div>
        ${statsStr}
        <div style="margin-top:10px;font-size:11px;color:var(--parchment-dark)">剩餘時間：<span style="color:var(--gold-bright)">${formatBuffTimeDetail(remain)}</span></div>
        <button class="modal-close-btn" id="buff-detail-close" style="margin-top:12px;width:100%;padding:8px;background:linear-gradient(180deg, #5a3a1a, #2a1a0a);border:1px solid var(--gold);color:var(--gold-bright);border-radius:6px;cursor:pointer;font-family:inherit">確定</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  const modal = $('buff-detail-modal');
  if (modal) {
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    const closeBtn = $('buff-detail-close');
    if (closeBtn) closeBtn.addEventListener('click', () => modal.remove());
  }
}

// 變身 buff 管理
function addTransformBuff() {
  const tf = TRANSFORM_POOL.find(t => t.id === GS.player.transformId);
  if (!tf) return;
  const remainSec = getTransformRemaining() / 1000;
  if (remainSec <= 0) return;
  const statDesc = Object.entries(tf.stats || {}).map(([k, v]) => {
    const nameMap = { atk: '攻擊', def: '防禦', hpMax: '生命', mpMax: '魔力', crit: '暴擊', critDmg: '暴傷', walkSpeedPct: '移速', atkSpeedPct: '攻速', dodge: '閃躲', hit: '命中' };
    return `${nameMap[k] || k}+${v}`;
  }).join(' ');
  addBuff('transform', `變身·${tf.name}`, `變身為【${tf.name}】，獲得強大力量。${statDesc}`, remainSec, tf.stats || {});
}

function removeTransformBuff() {
  removeBuff('transform');
}

function checkTransformExpiry() {
  if (!GS.player?.transformId) return;
  if (!GS.transformEndTime || Date.now() > GS.transformEndTime) {
    const tf = TRANSFORM_POOL.find(t => t.id === GS.player.transformId);
    GS.player.transformId = null;
    GS.transformEndTime = null;
    if (tf) addLog('system', `變身【${tf.name}】已到期，恢復原狀態`);
    removeTransformBuff();
    updatePlayerSprite();
    calcCP();
    updateUI();
  }
}

// ==================== 合成模组 ====================
const SYNTH_BASE_RATES = {
  'white-green': 0.50,
  'green-blue': 0.30,
  'blue-red': 0.15,
  'red-purple': 0.05,
  'purple-gold': 0.005,
};

let synthTab = 'hero'; // hero / pet / transform
let synthRarity = 'white'; // 待合成的品質（4张此品質 → 升一级）
let synthBoosters = 0; // 強化券数量 0-5

function openSynthPage() {
  closeSideMenu();
  closeSidePage();
  // 先移除舊的，確保每次打開都是全新狀態
  const old = document.getElementById('synth-overlay');
  if (old) old.remove();
  let html;
  try {
    html = renderSynthFullPage();
    if (!html || html.trim().length === 0) {
      html = '<div style="color:gold;padding:40px;">合成頁面渲染為空</div>';
    }
  } catch(e) {
    html = '<div style="color:#ff6b6b;padding:40px;">合成渲染錯誤：' + (e.message || e) + '</div>';
  }
  const overlay = document.createElement('div');
  overlay.id = 'synth-overlay';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
  // 延遲綁定事件
  requestAnimationFrame(() => bindSynthOverlayEvents());
}

function closeSynthOverlay() {
  const o = document.getElementById('synth-overlay');
  if (o) o.remove();
  // 確保關閉後殘留的side-page完全隱藏，避免出現空白頁
  if (el.sidePage) { el.sidePage.classList.remove('open'); el.sidePage.style.display = 'none'; }
}

function renderSynthPageHTML() {
  const pool = synthTab === 'hero' ? SUMMON_POOL : synthTab === 'pet' ? PET_POOL : TRANSFORM_POOL;
  const ownedList = synthTab === 'hero' ? GS.ownedHeroes : synthTab === 'pet' ? GS.ownedPets : (GS.ownedTransforms || []);
  const nextRarityIdx = RARITY_ORDER.indexOf(synthRarity) + 1;
  const nextRarity = RARITY_ORDER[nextRarityIdx];
  const canSynth = nextRarityIdx < RARITY_ORDER.length;

  // 统计各品質数量（按id计数，重复=多张）
  const rarityCount = {};
  RARITY_ORDER.forEach(r => { rarityCount[r] = 0; });
  ownedList.forEach(o => { rarityCount[o.rarity] = (rarityCount[o.rarity] || 0) + 1; });

  const matCount = rarityCount[synthRarity] || 0;
  const canAffordMat = matCount >= 4;
  const canAffordBoosters = synthBoosters * 10 <= GS.resources.gem;

  const baseRate = canSynth ? SYNTH_BASE_RATES[synthRarity + '-' + nextRarity] : 0;
  const rate = baseRate * Math.pow(1.2, synthBoosters);
  const finalRate = Math.min(0.99, rate);

  return `
    <div class="synth-tabs">
      <button class="synth-tab ${synthTab === 'hero' ? 'active' : ''}" data-tab="hero">英雄合成</button>
      <button class="synth-tab ${synthTab === 'pet' ? 'active' : ''}" data-tab="pet">守護合成</button>
      <button class="synth-tab ${synthTab === 'transform' ? 'active' : ''}" data-tab="transform">變身合成</button>
    </div>

    <div class="synth-rarity-select">
      <div class="synth-section-title">選擇合成品質</div>
      <div class="synth-rarity-list">
        ${RARITY_ORDER.slice(0, 5).map(r => `
          <button class="synth-rarity-btn ${synthRarity === r ? 'active' : ''} rarity-${r}" data-rarity="${r}">
            <span>${RARITY_CONFIG[r].name}</span>
            <span class="synth-count">×${rarityCount[r] || 0}</span>
          </button>
        `).join('')}
      </div>
    </div>

    <div class="synth-main">
      <div class="synth-materials">
        <div class="synth-mat-title">材料（4張${RARITY_CONFIG[synthRarity].name}）</div>
        <div class="synth-mat-slots">
          ${[0,1,2,3].map(i => {
            const filled = i < matCount;
            return `
              <div class="synth-slot rarity-${synthRarity} ${filled ? 'filled' : 'empty'}">
                ${filled ? '✦' : '+'}
              </div>
            `;
          }).join('')}
        </div>
        <div class="synth-mat-info">擁有：${matCount} 張</div>
      </div>

      <div class="synth-arrow">➜</div>

      <div class="synth-result">
        <div class="synth-mat-title">結果（${canSynth ? RARITY_CONFIG[nextRarity].name : '最高品質'}）</div>
        <div class="synth-result-card rarity-${nextRarity || 'gold'}">
          <div class="synth-result-icon">✦</div>
          <div class="synth-result-name">隨機${canSynth ? RARITY_CONFIG[nextRarity].name : ''}卡</div>
        </div>
      </div>
    </div>

    <div class="synth-prob-section">
      <div class="synth-section-title">成功機率</div>
      <div class="synth-prob-bar">
        <div class="synth-prob-fill" style="width:${(finalRate * 100).toFixed(1)}%; background:linear-gradient(90deg, ${RARITY_CONFIG[nextRarity || 'gold'].color}, ${RARITY_CONFIG[synthRarity].color})"></div>
      </div>
      <div class="synth-prob-text">
        <span class="synth-base-rate">基礎：${(baseRate * 100).toFixed(1)}%</span>
        <span class="synth-boost-text">+${synthBoosters}張強化券 → ${(finalRate * 100).toFixed(2)}%</span>
      </div>

      <div class="synth-booster-section">
        <div class="synth-booster-label">強化提升券（每張提升20%機率，乘法，最多5張，10鑽石/張）</div>
        <div class="synth-booster-controls">
          <button class="synth-booster-btn" data-action="dec">−</button>
          <div class="synth-booster-count">${synthBoosters} / 5</div>
          <button class="synth-booster-btn" data-action="inc">+</button>
          <div class="synth-booster-cost" style="display:flex;align-items:center;gap:4px"><span style="width:14px;height:14px;display:inline-block;overflow:hidden;border-radius:50%;border:1px solid #a070d0"><img src="${NATION_TAB_ICONS.gem}" style="width:100%;height:100%;object-fit:cover;display:block"/></span>${synthBoosters * 10}</div>
        </div>
      </div>
    </div>

    <button class="synth-main-btn ${canAffordMat && canSynth ? '' : 'disabled'}" id="synth-do-btn">
      ${canSynth ? '開始合成' : '已是最高品質'}
    </button>
    <div class="synth-warning">失敗時材料全部消失</div>
  `;
}

function bindSynthEvents() {
  el.pageContent.querySelectorAll('.synth-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      synthTab = btn.dataset.tab;
      el.pageContent.innerHTML = renderSynthPageHTML();
      bindSynthEvents();
    });
  });
  el.pageContent.querySelectorAll('.synth-rarity-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      synthRarity = btn.dataset.rarity;
      synthBoosters = 0;
      el.pageContent.innerHTML = renderSynthPageHTML();
      bindSynthEvents();
    });
  });
  el.pageContent.querySelectorAll('.synth-booster-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.action;
      if (act === 'inc' && synthBoosters < 5) synthBoosters++;
      if (act === 'dec' && synthBoosters > 0) synthBoosters--;
      el.pageContent.innerHTML = renderSynthPageHTML();
      bindSynthEvents();
    });
  });
  const doBtn = el.pageContent.querySelector('#synth-do-btn');
  if (doBtn) {
    doBtn.addEventListener('click', () => doSynthesize());
  }
}

// 舊函數別名（向後兼容）
function renderSynthPage() {
  el.pageContent.innerHTML = renderSynthPageHTML();
  bindSynthEvents();
}

function doSynthesize() {
  const pool = synthTab === 'hero' ? SUMMON_POOL : PET_POOL;
  const ownedList = synthTab === 'hero' ? GS.ownedHeroes : GS.ownedPets;
  const nextRarityIdx = RARITY_ORDER.indexOf(synthRarity) + 1;
  if (nextRarityIdx >= RARITY_ORDER.length) return;
  const nextRarity = RARITY_ORDER[nextRarityIdx];

  // 统计当前品質的数量
  const sameRarity = ownedList.filter(o => o.rarity === synthRarity);
  if (sameRarity.length < 4) { alert('材料不足，需要4張同品質卡'); return; }

  // 扣除強化券鑽石
  const gemCost = synthBoosters * 10;
  if (gemCost > GS.resources.gem) { alert('鑽石不足'); return; }
  GS.resources.gem -= gemCost;

  // 计算概率
  const baseRate = SYNTH_BASE_RATES[synthRarity + '-' + nextRarity];
  const rate = Math.min(0.99, baseRate * Math.pow(1.2, synthBoosters));

  // 扣除4张材料（先删数量最少的id，保证多样性尽量保留，简单起见删前4个）
  const toRemove = sameRarity.slice(0, 4);
  toRemove.forEach(item => {
    const idx = ownedList.findIndex(o => o.id === item.id);
    if (idx >= 0) ownedList.splice(idx, 1);
  });

  // 判断是否成功
  const success = Math.random() < rate;

  let resultItem = null;
  if (success) {
    // 随机獲得下一品質的卡
    const candidates = pool.filter(i => i.rarity === nextRarity);
    if (candidates.length > 0) {
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      // 已经有的就叠level，没有的加进去
      const existing = ownedList.find(o => o.id === picked.id);
      if (existing) {
        existing.level = (existing.level || 1) + 1;
      } else {
        ownedList.push({ ...picked, level: 1 });
      }
      resultItem = picked;
    }
  }

  synthBoosters = 0;
  updateUI();
  updateSlotDisplay();

  // 显示结果
  showSynthResult(success, resultItem, nextRarity);
}

function showSynthResult(success, item, nextRarity) {
  const modal = document.createElement('div');
  modal.className = 'synth-result-modal';
  const rarityInfo = RARITY_CONFIG[nextRarity];
  const sprite = item ? (synthTab === 'hero'
    ? (item.sprite ? spriteEmojiHTML(item.sprite, 100) : '')
    : (item.spriteKey ? spriteEmojiHTML(SPRITE[item.spriteKey], 100) : '')) : '';

  modal.innerHTML = `
    <div class="synth-result-inner ${success ? 'success' : 'fail'}">
      <div class="synth-result-title">${success ? '🎉 合成成功！' : '💔 合成失敗'}</div>
      ${success && item ? `
        <div class="synth-result-sprite rarity-${nextRarity}">${sprite}</div>
        <div class="synth-result-name">${item.name}</div>
        <div class="synth-result-rarity" style="color:${rarityInfo.color}">${rarityInfo.name}</div>
      ` : `
        <div class="synth-result-fail-text">材料已消失…</div>
      `}
      <button class="synth-result-close">确定</button>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener('click', e => { if (e.target === modal) { modal.remove(); renderSynthPage(); } });
  modal.querySelector('.synth-result-close').addEventListener('click', () => { modal.remove(); renderSynthPage(); });
}

function equipHero(heroId) {
  GS.equippedHeroId = heroId;
  // 清掉现有召喚（恶魔除外）
  GS.summons = GS.summons.filter(s => s.isDemon && summonedDemon);
  document.querySelectorAll('.world-unit.summon').forEach(elDiv => {
    if (elDiv.dataset.id !== 'demon') elDiv.remove();
  });
  const hero = GS.ownedHeroes.find(h => h.id === heroId);
  if (hero) {
    // 英雄按職業映射到對應8帧職業圖資，品質通過CSS drop-shadow區分
    const clsId = resolveClassId(hero.classId || 'warrior');
    const baseSprite = SPRITE[clsId] || SPRITE.warrior;
    const rarity = hero.rarity || 'white';
    const rarityGlow = {
      white: 'rgba(255,255,255,0.3)',
      green: 'rgba(100,220,120,0.6)',
      blue: 'rgba(90,160,255,0.6)',
      red: 'rgba(255,90,90,0.6)',
      purple: 'rgba(190,110,255,0.7)',
      gold: 'rgba(255,210,80,0.8)',
    };
    const heroSprite = {
      ...baseSprite,
      color: baseSprite.color,
      glow: rarityGlow[rarity] || rarityGlow.white,
    };
    const summon = {
      id: hero.id, name: hero.name, sprite: heroSprite,
      rarity: rarity, classId: clsId, isHero: true,
      x: GS.player.x + 25, y: GS.player.y + 12,
      targetX: 0, targetY: 0,
      hp: 150 + (hero.stats.atk || 0) * 2 + (hero.stats.hpMax || 0),
      hpMax: 150 + (hero.stats.atk || 0) * 2 + (hero.stats.hpMax || 0),
      atk: hero.stats.atk || 10,
      active: true, state: 'idle', facing: 'right',
      attackCooldown: 0, role: hero.role,
    };
    summon.targetX = summon.x; summon.targetY = summon.y;
    GS.summons.push(summon);
    const el = createSummonSprite(summon);
    // 加品质光晕class
    if (el) el.classList.add('hero-unit', 'rarity-' + rarity);
    addLog('system', `${hero.name} 出戰！`);
  }
  updateSlotDisplay();
}

function equipPet(petId) {
  GS.equippedPetId = petId;
  const pet = GS.ownedPets.find(p => p.id === petId);
  if (pet) addLog('system', `守護寵物：${pet.name}`);
  updateUI();
  updateSlotDisplay();
}

// ==================== 侧边页面 ====================
function openSidePage(page) {
  console.log('openSidePage:', page);
  if (!el.sidePage) { console.error('sidePage element not found'); return; }
  el.pageTitle.textContent = getPageTitle(page);
  el.pageContent.innerHTML = renderPage(page);
  el.sidePage.classList.add('open');
  el.sidePage.style.display = 'flex';
  // 確保內容區域有最小高度
  if (el.pageContent) el.pageContent.style.minHeight = '100vh';
  console.log('sidePage opened, innerHTML length:', el.pageContent?.innerHTML?.length || 0);
  bindPageEvents(page);
}
function closeSidePage() {
  if (!el.sidePage) return;
  el.sidePage.classList.remove('open');
  el.sidePage.style.display = 'none';
}
function getPageTitle(p) { return { hero: '人物', bag: '背包', gacha: '召喚', shop: '商店', dungeon: '副本', codex: '圖鑑' }[p] || getMenuPageTitle(p.replace('menu_', '')) || p; }

function renderPage(page) {
  // 選單项（带 menu_ 前缀）
  if (page.startsWith('menu_')) {
    return renderMenuPage(page.substring(5));
  }
  switch(page) {
    case 'hero': return renderHeroPage();
    case 'bag': return renderBagPage();
    case 'gacha': return renderGachaPage();
    case 'shop': return renderShopPage();
    case 'dungeon': return renderDungeonPage();
    case 'codex': return renderCodexPage();
    case 'synth': return renderSynthPageHTML();
    default: return '';
  }
}

function renderHeroPage() {
  const p = GS.player;
  const cls = CLASSES[p.classId];
  const expPct = (p.exp / p.expMax * 100).toFixed(2);
  const hpMax = getTotalHpMax();
  const mpMax = getTotalMpMax();
  const def = Math.floor(getTotalDef());
  const evasion = Math.floor(5 + p.level * 0.8);
  const magLv = Math.floor(p.level / 10) + 1;
  const extraMp = cls.id === 'mage' ? Math.floor(p.level * 0.5) : 0;

  // 六维
  const stats6 = {
    str: 10 + Math.floor(p.level * 0.6) + Math.floor(cls.baseStats.atk / 3),
    dex: 10 + Math.floor(p.level * 0.5) + Math.floor(cls.baseStats.atk / 4),
    con: 10 + Math.floor(p.level * 0.7) + Math.floor(cls.baseStats.hpMax / 20),
    int: 10 + Math.floor(p.level * 0.4) + (cls.id === 'mage' ? 8 : 0),
    men: 10 + Math.floor(p.level * 0.3) + (cls.id === 'priest' ? 6 : 0),
    cha: 8 + Math.floor(p.level * 0.2),
  };

  // 屬性抗性（地水火风）
  const resistances = {
    earth: Math.floor(p.level * 0.2) + (GS.equipment.armor?.baseStats?.def || 0),
    water: Math.floor(p.level * 0.2) + (cls.id === 'mage' ? 5 : 0),
    fire:  Math.floor(p.level * 0.15) + (cls.id === 'warrior' ? 3 : 0),
    wind:  Math.floor(p.level * 0.25) + (cls.id === 'rogue' ? 5 : 0),
  };

  // 負重
  const weight = 30;
  const weightMax = 50 + stats6.str * 3;
  const weightPct = Math.min(100, Math.floor(weight / weightMax * 100));

  const tabs = [
    { key: 'stats',     name: '屬性', icon: '📊' },
    { key: 'equip',     name: '裝備', icon: '⚔️' },
    { key: 'transform', name: '變身', icon: '✨' },
    { key: 'skills',    name: '技能', icon: '📖' },
    { key: 'heroes',    name: '英雄', icon: '🛡️' },
    { key: 'pets',      name: '守護', icon: '🐾' },
  ];
  const activeTab = GS.heroPageTab || 'stats';

  let panel = '';
  if (activeTab === 'stats') panel = renderStatsTabPanel(stats6, resistances, { expPct, hpMax, mpMax, def, evasion, magLv, extraMp, weight, weightMax });
  else if (activeTab === 'equip') panel = renderEquipTabPanel();
  else if (activeTab === 'transform') panel = renderTransformPanel();
  else if (activeTab === 'skills') panel = renderSkillsPanel();
  else if (activeTab === 'heroes') panel = renderHeroesPanel();
  else if (activeTab === 'pets') panel = renderPetsPanel();

  return `
    <div class="char-single-page">
      <!-- 角色頭部資訊 -->
      <div class="char-header-card">
        <div class="char-header-sprite">${spriteEmojiHTML(cls.sprite, 56)}</div>
        <div class="char-header-info">
          <div class="char-header-name">${p.name}</div>
          <div class="char-header-meta">
            <span class="char-header-class">${cls.name}</span>
            <span class="char-header-level">Lv. ${p.level}</span>
          </div>
          <div class="char-header-exp">
            <div class="char-exp-bar-mini">
              <div class="char-exp-fill" style="width:${expPct}%"></div>
            </div>
            <span class="char-exp-text-mini">EXP ${Math.floor(p.exp)}/${Math.floor(p.expMax)}</span>
          </div>
        </div>
      </div>

      <!-- 分頁標籤 -->
      <div class="char-tab-bar">
        ${tabs.map(t => `
          <button class="char-tab-btn ${activeTab === t.key ? 'active' : ''}" data-hero-tab="${t.key}">
            <span class="char-tab-icon">${t.icon}</span>
            <span class="char-tab-label">${t.name}</span>
          </button>
        `).join('')}
      </div>

      <!-- 分頁內容 -->
      <div class="char-tab-content">
        ${panel}
      </div>
    </div>
  `;
}

// ========== 屬性分頁 ==========
function renderStatsTabPanel(stats6, resistances, info) {
  const p = GS.player;
  const atk = getTotalAtk();
  const weightPct = Math.min(100, Math.floor(info.weight / info.weightMax * 100));
  const critRate = Math.floor(5 + stats6.dex * 0.3);
  const critDmg = Math.floor(150 + stats6.str * 2);
  const accuracy = Math.floor(80 + stats6.dex * 1.2);
  return `
    <!-- 基礎戰鬥屬性 -->
    <div class="char-tab-section">
      <div class="char-tab-section-title">基礎屬性</div>
      <div class="char-stat-grid">
        <div class="char-stat-item"><span class="stat-label">等級</span><span class="stat-val">${Math.floor(p.level)}</span></div>
        <div class="char-stat-item"><span class="stat-label">攻擊力</span><span class="stat-val atk">${Math.floor(atk)}</span></div>
        <div class="char-stat-item"><span class="stat-label">防禦力</span><span class="stat-val def">${Math.floor(info.def)}</span></div>
        <div class="char-stat-item"><span class="stat-label hp">體力</span><span class="stat-val">${Math.floor(p.hp)} / ${Math.floor(info.hpMax)}</span></div>
        <div class="char-stat-item"><span class="stat-label mp">魔力</span><span class="stat-val">${Math.floor(p.mp||0)} / ${Math.floor(info.mpMax)}</span></div>
        <div class="char-stat-item"><span class="stat-label">迴避率</span><span class="stat-val">${Math.floor(info.evasion)}%</span></div>
        <div class="char-stat-item"><span class="stat-label">暴擊率</span><span class="stat-val">${Math.floor(critRate)}%</span></div>
        <div class="char-stat-item"><span class="stat-label">暴擊傷害</span><span class="stat-val">${Math.floor(critDmg)}%</span></div>
        <div class="char-stat-item"><span class="stat-label">命中率</span><span class="stat-val">${Math.floor(accuracy)}%</span></div>
        <div class="char-stat-item"><span class="stat-label">負重</span><span class="stat-val">${Math.floor(info.weight)} / ${Math.floor(info.weightMax)}</span></div>
      </div>
    </div>

    <!-- 六維屬性 -->
    <div class="char-tab-section">
      <div class="char-tab-section-title">六維屬性</div>
      <div class="char-stat-grid">
        <div class="char-stat-item"><span class="stat-label">力量 STR</span><span class="stat-val str">${stats6.str}</span></div>
        <div class="char-stat-item"><span class="stat-label">敏捷 DEX</span><span class="stat-val dex">${stats6.dex}</span></div>
        <div class="char-stat-item"><span class="stat-label">體質 CON</span><span class="stat-val con">${stats6.con}</span></div>
        <div class="char-stat-item"><span class="stat-label">智力 INT</span><span class="stat-val int">${stats6.int}</span></div>
        <div class="char-stat-item"><span class="stat-label">精神 MEN</span><span class="stat-val men">${stats6.men}</span></div>
        <div class="char-stat-item"><span class="stat-label">魅力 CHA</span><span class="stat-val cha">${stats6.cha}</span></div>
      </div>
    </div>

    <!-- 魔法 -->
    <div class="char-tab-section">
      <div class="char-tab-section-title">魔法</div>
      <div class="char-stat-grid">
        <div class="char-stat-item"><span class="stat-label">魔法等級</span><span class="stat-val">${info.magLv}</span></div>
        <div class="char-stat-item"><span class="stat-label">額外魔力</span><span class="stat-val">+${info.extraMp}</span></div>
      </div>
    </div>

    <!-- 屬性抗性 -->
    <div class="char-tab-section">
      <div class="char-tab-section-title">屬性抗性</div>
      <div class="char-stat-grid">
        <div class="char-stat-item"><span class="stat-label">地 屬性</span><span class="stat-val">${resistances.earth}%</span></div>
        <div class="char-stat-item"><span class="stat-label">水 屬性</span><span class="stat-val">${resistances.water}%</span></div>
        <div class="char-stat-item"><span class="stat-label">火 屬性</span><span class="stat-val">${resistances.fire}%</span></div>
        <div class="char-stat-item"><span class="stat-label">風 屬性</span><span class="stat-val">${resistances.wind}%</span></div>
      </div>
    </div>
  `;
}

// ========== 裝備分頁 ==========
function renderEquipTabPanel() {
  const slotIconUrl = s => getEquipIcon(s);
  const slotName = s => EQUIP_SLOTS.find(e => e.id === s)?.name || s;
  const getSlot = (slot) => {
    const eq = GS.equipment[slot];
    if (eq) {
      const rc = RARITY_CONFIG[eq.rarity] || RARITY_CONFIG.white;
      return `<div class="equip-slot-card has-item rarity-${eq.rarity}" data-equip-slot="${slot}" style="border-color:${rc.color}">
        <div class="equip-slot-icon" style="display:flex;align-items:center;justify-content:center"><img src="${eq.icon || slotIconUrl(slot)}" style="width:36px;height:36px;object-fit:cover;border-radius:6px;display:block"/></div>
        <div class="equip-slot-name">${eq.name}</div>
        <div class="equip-slot-rarity" style="color:${rc.color}">${rc.name}</div>
      </div>`;
    }
    return `<div class="equip-slot-card empty" data-equip-slot="${slot}">
      <div class="equip-slot-icon" style="display:flex;align-items:center;justify-content:center;opacity:0.5"><img src="${slotIconUrl(slot)}" style="width:32px;height:32px;object-fit:cover;border-radius:6px;display:block;filter:grayscale(0.5)"/></div>
      <div class="equip-slot-name">${slotName(slot)}</div>
      <div class="equip-slot-empty-text">未裝備</div>
    </div>`;
  };
  return `
    <!-- 角色居中 + 左右裝備槽 -->
    <div class="equip-layout">
      <div class="equip-col equip-col-left">
        <div class="equip-slot-item" data-equip-slot="helmet">${getSlot('helmet')}</div>
        <div class="equip-slot-item" data-equip-slot="necklace">${getSlot('necklace')}</div>
        <div class="equip-slot-item" data-equip-slot="armor">${getSlot('armor')}</div>
        <div class="equip-slot-item" data-equip-slot="gloves">${getSlot('gloves')}</div>
        <div class="equip-slot-item" data-equip-slot="boots">${getSlot('boots')}</div>
      </div>
      <div class="equip-col equip-col-center">
        <div class="equip-character-art">${spriteEmojiHTML(CLASSES[GS.player.classId].sprite, 110)}</div>
        <div class="equip-equipped-count">共 ${Object.values(GS.equipment).filter(e=>e).length} / 11 件已裝備</div>
      </div>
      <div class="equip-col equip-col-right">
        <div class="equip-slot-item" data-equip-slot="weapon">${getSlot('weapon')}</div>
        <div class="equip-slot-item" data-equip-slot="ring1">${getSlot('ring1')}</div>
        <div class="equip-slot-item" data-equip-slot="cape">${getSlot('cape')}</div>
        <div class="equip-slot-item" data-equip-slot="belt">${getSlot('belt')}</div>
        <div class="equip-slot-item" data-equip-slot="ring2">${getSlot('ring2')}</div>
      </div>
    </div>
    <div style="text-align:center;color:var(--parchment-dark);font-size:10px;margin-top:8px">
      點擊裝備欄查看詳情 · 點擊道具欄裝備/卸下
    </div>
  `;
}

function renderTransformPanel() {
  const p = GS.player;
  if (!GS.ownedTransforms) GS.ownedTransforms = [];
  const ownedCount = GS.ownedTransforms.length;
  const currentTfId = p.transformId;
  const currentTf = TRANSFORM_POOL.find(t => t.id === currentTfId);
  const remaining = getTransformRemaining();

  const rarityList = [
    { key: 'all',    name: '全部',   color: '#c8b48a' },
    { key: 'gold',   name: '神話',   color: '#f0c040' },
    { key: 'purple', name: '傳說',   color: '#c080ff' },
    { key: 'red',    name: '史詩',   color: '#ff6060' },
    { key: 'blue',   name: '稀有',   color: '#60a0ff' },
    { key: 'green',  name: '高級',   color: '#60d060' },
    { key: 'white',  name: '普通',   color: '#cccccc' },
  ];
  const selRarity = GS.transformRarity || 'all';

  let displayPool = TRANSFORM_POOL.filter(t => isClassRestrictionMatched(t.classRestriction, playerCls));
  if (selRarity !== 'all') displayPool = displayPool.filter(t => t.rarity === selRarity);
  const rarityOrder = ['gold','purple','red','blue','green','white'];
  displayPool = [...displayPool].sort((a,b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));
  // 可用變身總數（當前職業 + 通用）
  const playerCls = resolveClassId(p.classId);
  const availableTotal = TRANSFORM_POOL.filter(t => isClassRestrictionMatched(t.classRestriction, playerCls)).length;

  const currentRc = currentTf ? (RARITY_CONFIG[currentTf.rarity] || RARITY_CONFIG.white) : null;

  const bannerHtml = `
    <div class="transform-top-banner">
      <div class="tf-banner-left">
        ${currentTf ? `
          <div class="tf-banner-avatar rarity-${currentTf.rarity}">
            <img src="${getTransformIcon(currentTf.spriteKey)}" style="width:100%;height:100%;object-fit:cover"/>
          </div>
        ` : `
          <div class="tf-banner-avatar tf-banner-avatar-empty">?</div>
        `}
        <div class="tf-banner-info">
          <div class="tf-banner-state">${currentTf ? '變身中' : '未變身'}</div>
          <div class="tf-banner-name" style="color:${currentRc?.color || '#c8b48a'}">${currentTf ? currentTf.name : '請選擇變身形態'}</div>
          <div class="tf-banner-sub">
            ${currentTf
               ? `剩餘時間：<span id="transform-remain-time" style="color:var(--gold-bright)">${formatTransformTime(remaining)}</span>`
               : `<span style="color:var(--parchment-dark)">點擊已擁有的變身卡直接啟動，每次持續 4 小時</span>`
            }
          </div>
        </div>
      </div>
      <div class="tf-banner-right">
        <div class="tf-count-num">${ownedCount}<span style="font-size:12px;opacity:.6">/${availableTotal}</span></div>
        <div class="tf-count-label">已獲得</div>
      </div>
    </div>
  `;

  const gridHtml = `
    <div class="transform-layout">
      <div class="transform-filter-bar">
        ${rarityList.map(r => {
          const active = selRarity === r.key;
          const cnt = r.key === 'all' ? ownedCount : GS.ownedTransforms.filter(t => t.rarity === r.key).length;
          return `
            <button class="tf-filter-btn ${active ? 'active' : ''} rarity-${r.key}" data-tf-filter="${r.key}" style="--rarity-color:${r.color}">
              <span class="tf-filter-name">${r.name}</span>
              <span class="tf-filter-count">${cnt}</span>
            </button>
          `;
        }).join('')}
      </div>
      <div class="transform-grid-col">
        ${displayPool.length === 0 ? `<div style="text-align:center;padding:40px 10px;color:#7a6a6a;font-size:12px">此品質暫無變身形態</div>` : ''}
        <div class="transform-grid tf-grid-3col">
          ${displayPool.map(t => {
            const owned = !!GS.ownedTransforms.find(x => x.id === t.id);
            const equipped = currentTfId === t.id;
            const rc = RARITY_CONFIG[t.rarity] || RARITY_CONFIG.white;
            // 職業限制判定
            // 職業限制判定（支持字符串或陣列）
            const classLocked = !isClassRestrictionMatched(t.classRestriction, playerCls);
            const classRestrictName = t.classRestriction
              ? (Array.isArray(t.classRestriction)
                  ? t.classRestriction.map(c => CLASSES[c]?.name || c).join('/')
                  : (CLASSES[t.classRestriction]?.name || t.classRestriction))
              : '通用';
            const statText = Object.entries(t.stats || {}).map(([k, v]) => {
              const nameMap = {
                atk: '攻擊', def: '防禦', hpMax: 'HP', mpMax: 'MP',
                crit: '暴擊', critDmg: '暴傷', atkSpeed: '攻速', atkSpeedPct: '攻速',
                moveSpeed: '移速', moveSpeedPct: '移速', hit: '命中', evasion: '閃躲',
                hpPct: '生命', mpPct: '魔力', defPct: '防禦', atkPct: '攻擊'
              };
              const pctKeys = ['atkSpeedPct','moveSpeedPct','hpPct','mpPct','defPct','atkPct','crit','critDmg','evasion','hit'];
              const suffix = pctKeys.includes(k) ? '%' : '';
              return `${nameMap[k] || k}+${v}${suffix}`;
            }).join(' ');
            return `
              <div class="tf-card rarity-badge rarity-${t.rarity} ${equipped ? 'equipped' : ''} ${owned ? '' : 'locked-silhouette'} ${classLocked ? 'class-locked' : ''}" data-tf-card="${t.id}">
                ${equipped ? '<div class="card-top-tag">已變身</div>' : ''}
                <div class="tf-card-icon">
                  <img src="${getTransformIcon(t.spriteKey)}" style="width:100%;height:100%;object-fit:contain"/>
                  ${classLocked ? `<div class="tf-class-lock" title="僅限${classRestrictName}使用"><span>🔒</span><em>${classRestrictName}專用</em></div>` : ''}
                </div>
                <div class="tf-card-name">${t.name}${!t.classRestriction ? ' <span style="font-size:9px;color:#f0c060">(通用)</span>' : ''}</div>
                <div class="tf-card-rarity" style="color:${rc.color}">${rc.name}</div>
                <div class="tf-card-stats">${statText}</div>
                ${classLocked ? `<div class="tf-class-locked-tip">${classRestrictName}專用</div>` : ''}
                ${!classLocked && owned && !equipped ? `
                  <button class="tf-use-btn" data-use-transform-id="${t.id}">啟動變身</button>
                ` : ''}
                ${!classLocked && !owned ? `<div class="tf-locked-hint">未獲得</div>` : ''}
                ${!classLocked && equipped ? `
                  <button class="tf-use-btn tf-cancel-btn" data-cancel-transform>解除變身</button>
                ` : ''}
                ${!classLocked && !owned ? '<div class="tf-locked-mask">未獲得</div>' : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
    <div style="padding:6px 8px 8px;font-size:10px;color:var(--parchment-dark);text-align:center;line-height:1.6">
      點擊已擁有的變身卡直接啟動，每次變身持續 4 小時<br>
      變身期間獲得該形態的屬性加成，時間到後自動解除，可隨時手動解除變身
    </div>
  `;

  return bannerHtml + gridHtml;
}

function renderTransformCardsForRarity(rarityTier) {
  const list = GS.transforms.filter(t => t.rarity === rarityTier.rarity);
  const cls = CLASSES[GS.player.classId];
  const p = GS.player;
  // 类型视觉滤镜
  const typeFilters = {
    str: 'hue-rotate(-15deg) saturate(1.4) brightness(1.08) contrast(1.1)',
    vit: 'hue-rotate(200deg) saturate(1.3) brightness(0.95) contrast(1.1)',
    agi: 'hue-rotate(100deg) saturate(1.2) brightness(1.1) contrast(1.05)',
    int: 'hue-rotate(260deg) saturate(1.5) brightness(1.05) contrast(1.1)',
    luk: 'hue-rotate(50deg) saturate(1.3) brightness(1.15) contrast(1.05)',
  };

  if (list.length === 0) {
    return `<div style="text-align:center;padding:40px 20px;color:var(--parchment-dark);font-size:12px">此品質暫無變身形態</div>`;
  }

  return list.map(t => {
    const equipped = GS.player.transformId === t.id;
    const locked = !t.unlocked;
    const canUnlock = locked && p.level >= t.tier && (GS.resources?.gem || 0) >= t.cost;
    const playerCls = resolveClassId(p.classId);
    const classLocked = !isClassRestrictionMatched(t.classRestriction, playerCls);
    const classRestrictName = t.classRestriction
      ? (Array.isArray(t.classRestriction)
          ? t.classRestriction.map(c => CLASSES[c]?.name || c).join('/')
          : (CLASSES[t.classRestriction]?.name || t.classRestriction))
      : '';
    const filter = typeFilters[t.typeKey] || '';
    const statText = Object.entries(t.stats).map(([k, v]) => {
      const nameMap = {
        atk: '攻擊', def: '防禦', hpMax: 'HP', mpMax: 'MP',
        crit: '暴擊', critDmg: '暴傷', atkSpeed: '攻速', atkSpeedPct: '攻速',
        moveSpeed: '移速', moveSpeedPct: '移速', hit: '命中', evasion: '閃躲',
        hpPct: '生命', mpPct: '魔力', defPct: '防禦', atkPct: '攻擊'
      };
      const pctKeys = ['atkSpeedPct','moveSpeedPct','hpPct','mpPct','defPct','atkPct','crit','critDmg','evasion','hit'];
      const suffix = pctKeys.includes(k) ? '%' : '';
      return `${nameMap[k] || k}+${v}${suffix}`;
    }).join(' ');
    return `
      <div class="transform-card rarity-badge rarity-${t.rarity} ${equipped ? 'equipped' : ''} ${locked ? 'locked' : ''} ${classLocked ? 'class-locked' : ''}" data-transform-id="${t.id}">
        <div class="transform-card-icon-wrap">
          <div class="arch-sprite-frame rarity-${t.rarity}" style="width:52px;height:68px">
            <div class="transform-card-icon" style="filter:${filter};display:flex;align-items:flex-end;justify-content:center;width:100%;height:100%">${spriteEmojiHTML(cls.sprite, 40)}</div>
          </div>
          ${classLocked ? `<div class="transform-class-lock" title="僅限${classRestrictName}使用"><span>🔒</span><em>${classRestrictName}專用</em></div>` : ''}
        </div>
        <div class="transform-card-name">${t.name}</div>
        <div class="transform-card-rarity" style="color:${rarityTier.color};font-size:10px;margin:2px 0">${t.rarityName} · Lv.${t.tier}解鎖</div>
        <div class="transform-card-stats">${statText}</div>
        ${equipped ? '<div class="transform-card-equipped-tag">裝備中</div>' : ''}
        ${classLocked ? `<div class="transform-class-locked-tip">${classRestrictName}專用</div>` : locked ? `
          <button class="transform-unlock-btn ${canUnlock ? '' : 'disabled'}" data-unlock-id="${t.id}">
            ${p.level < t.tier ? `需 Lv.${t.tier}` : `🔓 ${t.cost}鑽`}
          </button>
        ` : (equipped ? '' : '<button class="transform-equip-btn" data-equip-id="' + t.id + '">裝備</button>')}
      </div>
    `;
  }).join('');
}

function renderSkillsPanel() {
  const cls = CLASSES[GS.player.classId];
  const allSkills = cls.allSkills || [];
  const playerLevel = GS.player.level;
  const skillPoints = cls.skillPoints || 0;
  const barSkills = (cls.skillBar || []).map(i => allSkills[i]);
  const categoryNames = { basic: '基础', attack: '攻擊', aoe: '範圍', control: '控制', heal: '治疗', buff: '增益', summon: '召喚', dot: '持續' };

  return `
    <div class="skills-panel">
      <div class="bag-section-title">技能裝備欄（共8格 · 按 1-8 釋放）</div>
      <div class="skill-equip-bar">
        ${Array.from({length: 8}, (_, i) => {
          const s = barSkills[i];
          if (s) {
            const bgStyle = getSkillIconBgStyle(s);
            return `<div class="skill-slot equipped" data-bar-idx="${i}" draggable="true">
              <div class="skill-slot-icon" style="${bgStyle}"><div style="width:22px;height:22px">${getSkillSVG(s)}</div></div>
              <div class="skill-slot-name">${s.name}</div>
              <div class="skill-slot-key">${i+1}</div>
            </div>`;
          }
          return `<div class="skill-slot empty" data-bar-idx="${i}" draggable="false">
            <div class="skill-slot-key">${i+1}</div>
          </div>`;
        }).join('')}
      </div>
      <div style="font-size:10px;color:var(--parchment-dark);text-align:center;margin:4px 0 12px">拖動技能到格子即可裝備，同欄內可交換位置</div>

      <div class="bag-section-title">可学习技能（${allSkills.length}个）</div>
      <div style="font-size:11px;color:var(--parchment-dark);margin-bottom:8px">
        技能点：<span style="color:var(--gold-bright);font-weight:700">${skillPoints}</span> · 
        自動學習達到等級的技能
      </div>
      <div class="skill-learn-list">
        ${allSkills.map((s, idx) => {
          const unlocked = playerLevel >= (s.learnLevel || 1);
          const equipped = (cls.skillBar || []).includes(idx);
          const slotPos = (cls.skillBar || []).indexOf(idx);
          const category = categoryNames[s.category] || s.category || '';
          const level = s.level || 1;
          const iconBgStyle = getSkillIconBgStyle(s);
          return `
            <div class="skill-learn-item ${unlocked ? 'unlocked' : 'locked'} ${equipped ? 'equipped' : ''}"
                 data-skill-idx="${idx}" draggable="${unlocked}">
              <div class="skill-learn-icon" style="${iconBgStyle}"><div style="width:24px;height:24px">${getSkillSVG(s)}</div></div>
              <div class="skill-learn-info">
                <div class="skill-learn-name">
                  ${s.name}
                  <span class="skill-cat-tag">${category}</span>
                  ${equipped ? `<span class="skill-equipped-tag">已裝備 (${slotPos+1})</span>` : ''}
                </div>
                <div class="skill-learn-desc">${s.desc || ''}</div>
                <div class="skill-learn-meta">
                  <span>傷害：${(s.dmgMult * 100).toFixed(0)}%</span>
                  ${s.cd ? `<span>CD：${s.cd}s</span>` : ''}
                  <span>需求等級：${s.learnLevel || 1}</span>
                  <span>等級：Lv.${level}</span>
                </div>
                ${unlocked && !equipped ? `
                  <div class="skill-learn-actions">
                    <button class="skill-equip-btn" data-equip-skill="${idx}">裝備到技能欄</button>
                    <button class="skill-upgrade-btn" data-upgrade-skill="${idx}">升級 (500金)</button>
                  </div>` : ''}
                ${!unlocked ? `<div style="color:#888;font-size:10px;margin-top:4px">🔒 达到 ${s.learnLevel} 級解锁</div>` : ''}
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

function renderStatsPanel() {
  const p = GS.player;
  const stats = [
    { label: '職業', value: CLASSES[p.classId].name },
    { label: '等級', value: p.level },
    { label: '生命', value: Math.floor(getTotalHpMax()).toLocaleString() },
    { label: '攻擊', value: Math.floor(getTotalAtk()).toLocaleString() },
    { label: '防禦', value: Math.floor(getTotalDef()).toLocaleString() },
    { label: '命中率', value: Math.floor(getTotalCrit() * 0.3 + 85) + '%' },
    { label: '暴擊率', value: Math.floor(getTotalCrit()) + '%' },
    { label: '暴擊傷害', value: Math.floor(getTotalCritDmg()) + '%' },
    { label: '戰力', value: calcCP().toLocaleString() },
  ];
  return `<div class="stats-grid">${stats.map(s => `
    <div class="stat-item"><span class="stat-label">${s.label}</span><span class="stat-value">${s.value}</span></div>
  `).join('')}</div>`;
}

function renderEquipPanel() {
  const slots = EQUIP_SLOTS.map(slotInfo => {
    const slot = slotInfo.id;
    const eq = slot === 'ring1' || slot === 'ring2' ? GS.equipment[slot] : GS.equipment[slot];
    const iconUrl = getEquipIcon(slot);
    if (eq && eq.name) {
      const level = eq.level || 0;
      return `
        <div class="equip-slot-item has-item rarity-${eq.rarity}" data-equip-slot="${slot}">
          <div class="equip-slot-level-badge">+${level}</div>
          <div class="equip-slot-icon" style="display:flex;align-items:center;justify-content:center"><img src="${eq.icon || iconUrl}" style="width:32px;height:32px;object-fit:cover;border-radius:6px;display:block"/></div>
          <div class="equip-slot-name">${eq.name}</div>
        </div>
      `;
    }
    return `
      <div class="equip-slot-item" data-equip-slot="${slot}">
        <div class="equip-slot-icon" style="opacity:0.5;display:flex;align-items:center;justify-content:center"><img src="${iconUrl}" style="width:28px;height:28px;object-fit:cover;border-radius:6px;display:block;filter:grayscale(0.5)"/></div>
        <div class="equip-slot-empty-text">${slotInfo.name}</div>
      </div>
    `;
  }).join('');

  return `<div class="equip-slots-grid">${slots}</div>`;
}

function renderHeroesPanel() {
  const rarityList = [
    { key: 'all',    name: '全部',   color: '#c8b48a' },
    { key: 'gold',   name: '神話',   color: '#f0c040' },
    { key: 'purple', name: '傳說',   color: '#c080ff' },
    { key: 'red',    name: '史詩',   color: '#ff6060' },
    { key: 'blue',   name: '稀有',   color: '#60a0ff' },
    { key: 'green',  name: '高級',   color: '#60d060' },
    { key: 'white',  name: '普通',   color: '#cccccc' },
  ];
  const selRarity = GS.heroRarity || 'all';
  const ownedCount = GS.ownedHeroes.length;

  let displayPool = GS.ownedHeroes;
  if (selRarity !== 'all') displayPool = displayPool.filter(h => h.rarity === selRarity);
  const rarityOrder = ['gold','purple','red','blue','green','white'];
  displayPool = [...displayPool].sort((a,b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));

  if (ownedCount === 0) {
    return `<div style="text-align:center;padding:40px 20px;color:var(--parchment-dark)">
      <div style="font-size:40px;margin-bottom:10px">🗡️</div>
      <div style="font-size:13px;margin-bottom:8px">尚未獲得英雄</div>
      <div style="font-size:11px;opacity:0.7">前往「召喚」页面抽取英雄吧！</div>
    </div>`;
  }
  return `
    <div style="font-size:11px;color:var(--parchment-dark);margin-bottom:8px">
      已擁有 ${ownedCount} 名英雄，点击可出战
    </div>
    <div class="transform-layout">
      <div class="transform-filter-bar">
        ${rarityList.map(r => {
          const active = selRarity === r.key;
          const cnt = r.key === 'all' ? ownedCount : GS.ownedHeroes.filter(h => h.rarity === r.key).length;
          return `
            <button class="tf-filter-btn ${active ? 'active' : ''} rarity-${r.key}" data-hero-filter="${r.key}" style="--rarity-color:${r.color}">
              <span class="tf-filter-name">${r.name}</span>
              <span class="tf-filter-count">${cnt}</span>
            </button>
          `;
        }).join('')}
      </div>
      <div class="transform-grid-col">
        ${displayPool.length === 0 ? `<div style="text-align:center;padding:40px 10px;color:#7a6a6a;font-size:12px">此品質暫無英雄</div>` : ''}
        <div class="transform-grid tf-grid-3col">
          ${displayPool.map(h => {
            const s = h.stats || {};
            const equipped = GS.equippedHeroId === h.id;
            const rc = RARITY_CONFIG[h.rarity] || RARITY_CONFIG.white;
            const heroData = SUMMON_POOL.find(x => x.id === h.id) || h;
            const hClass = heroData.classId || 'warrior';
            const hRace = heroData.race || 'human';
            const cls = CLASSES[hClass];
            const raceNames = { human: '人类', elf: '精灵', orc: '兽人', undead: '亡灵' };
            const playerClass = GS.player.classId;
            const playerRace = CLASSES[playerClass]?.race || 'human';
            const sameClass = hClass === playerClass;
            const sameRace = hRace === playerRace;
            const doubleBond = sameClass && sameRace;
            let bondText = '';
            let bondColor = 'var(--parchment-dark)';
            if (doubleBond) { bondText = '雙羈絆'; bondColor = '#ff80ff'; }
            else if (sameClass) { bondText = '同職業'; bondColor = '#80ff80'; }
            else if (sameRace) { bondText = '同種族'; bondColor = '#80c0ff'; }
            else { bondText = '無羈絆'; }
            return `
              <div class="tf-card rarity-badge rarity-${h.rarity || 'white'} ${equipped ? 'equipped' : ''}" data-hero-id="${h.id}">
                ${equipped ? '<div class="card-top-tag">已召喚</div>' : ''}
                <div class="tf-card-icon">
                  <img src="${SPRITE[h.sprite]?.idle || ''}" style="width:100%;height:100%;object-fit:contain" onerror="this.style.display='none'"/>
                </div>
                <div class="tf-card-name" style="font-size:9px">${h.name}</div>
                <div style="font-size:8px;color:${rc.color};margin:1px 0">${rc.name}</div>
                <div style="font-size:7px;color:var(--parchment-dark);line-height:1.2">攻${s.atk||0} 防${s.def||0}</div>
                <div style="font-size:7px;color:${bondColor};margin-top:1px;font-weight:600">${bondText}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
    <div style="margin-top:10px;text-align:center">
      <button class="shop-item-buy" style="width:auto;padding:5px 16px;font-size:11px" id="hero-synth-btn">
        🧪 英雄合成
      </button>
    </div>
  `;
}

function renderPetsPanel() {
  const rarityList = [
    { key: 'all',    name: '全部',   color: '#c8b48a' },
    { key: 'gold',   name: '神話',   color: '#f0c040' },
    { key: 'purple', name: '傳說',   color: '#c080ff' },
    { key: 'red',    name: '史詩',   color: '#ff6060' },
    { key: 'blue',   name: '稀有',   color: '#60a0ff' },
    { key: 'green',  name: '高級',   color: '#60d060' },
    { key: 'white',  name: '普通',   color: '#cccccc' },
  ];
  const selRarity = GS.petRarity || 'all';
  const ownedCount = GS.ownedPets.length;

  let displayPool = GS.ownedPets;
  if (selRarity !== 'all') displayPool = displayPool.filter(p => p.rarity === selRarity);
  const rarityOrder = ['gold','purple','red','blue','green','white'];
  displayPool = [...displayPool].sort((a,b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));

  if (ownedCount === 0) {
    return `<div style="text-align:center;padding:40px 20px;color:var(--parchment-dark)">
      <div style="font-size:40px;margin-bottom:10px">🐾</div>
      <div style="font-size:13px;margin-bottom:8px">尚未獲得守護寵物</div>
      <div style="font-size:11px;opacity:0.7">前往「召喚」页面抽取宠物吧！</div>
    </div>`;
  }
  return `
    <div style="font-size:11px;color:var(--parchment-dark);margin-bottom:8px">
      已擁有 ${ownedCount} 只守護宠物，点击切换守護
    </div>
    <div class="transform-layout">
      <div class="transform-filter-bar">
        ${rarityList.map(r => {
          const active = selRarity === r.key;
          const cnt = r.key === 'all' ? ownedCount : GS.ownedPets.filter(p => p.rarity === r.key).length;
          return `
            <button class="tf-filter-btn ${active ? 'active' : ''} rarity-${r.key}" data-pet-filter="${r.key}" style="--rarity-color:${r.color}">
              <span class="tf-filter-name">${r.name}</span>
              <span class="tf-filter-count">${cnt}</span>
            </button>
          `;
        }).join('')}
      </div>
      <div class="transform-grid-col">
        ${displayPool.length === 0 ? `<div style="text-align:center;padding:40px 10px;color:#7a6a6a;font-size:12px">此品質暫無守護寵物</div>` : ''}
        <div class="transform-grid tf-grid-3col">
          ${displayPool.map(pet => {
            const s = pet.stats || {};
            const equipped = GS.equippedPetId === pet.id;
            const rc = RARITY_CONFIG[pet.rarity] || RARITY_CONFIG.white;
            const spKey = pet.spriteKey;
            const hasImg = SPRITE[spKey]?.useImg && SPRITE[spKey]?.idle;
            return `
              <div class="tf-card rarity-badge rarity-${pet.rarity || 'white'} ${equipped ? 'equipped' : ''}" data-pet-id="${pet.id}">
                ${equipped ? '<div class="card-top-tag">守護中</div>' : ''}
                <div class="tf-card-icon">
                  ${hasImg ? `<img src="${SPRITE[spKey].idle}" style="width:100%;height:100%;object-fit:contain"/>` : `<div style="font-size:20px;padding-top:4px">${SPRITE[spKey]?.idle || '🐾'}</div>`}
                </div>
                <div class="tf-card-name" style="font-size:9px">${pet.name}</div>
                <div style="font-size:8px;color:${rc.color};margin:1px 0">${rc.name}</div>
                <div style="font-size:7px;color:var(--parchment-dark);line-height:1.2">攻${s.atk||0} 防${s.def||0}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
    <div style="margin-top:10px;text-align:center">
      <button class="shop-item-buy" style="width:auto;padding:5px 16px;font-size:11px" id="pet-synth-btn">
        🧪 守護合成
      </button>
    </div>
  `;
}

// ==================== 背包页面（新分类系统）====================
const BAG_CATEGORIES = [
  { key: 'all',       name: '全部',    icon: '📦' },
  { key: 'equipment', name: '裝備',    icon: '⚔️' },
  { key: 'consumable',name: '消耗品',  icon: '🧪' },
  { key: 'card',      name: '卡牌',    icon: '🃏' },
  { key: 'treasure',  name: '寶物',    icon: '💎' },
  { key: 'material',  name: '材料',    icon: '🔧' },
];

function renderBagPage() {
  const activeTab = GS.bagPage?.tab || 'all';
  const items = getInventoryByCategory(activeTab);

  // 品質配置
  const rarityColors = {
    common:    '#a0a0a0',
    white:     '#d0d0d0',
    green:     '#40c060',
    blue:      '#4090ff',
    rare:      '#4090ff',
    red:       '#ff4040',
    epic:      '#c060ff',
    purple:    '#c060ff',
    gold:      '#ffd040',
    legend:    '#ffd040',
  };

  return `
    <div class="bag-currency-bar" style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:linear-gradient(90deg, rgba(40,28,14,0.8), rgba(25,18,8,0.6));border-bottom:1px solid rgba(240,192,64,0.2);margin-bottom:4px">
      <div style="display:flex;align-items:center;gap:6px;flex:1">
        <div style="width:24px;height:24px;border-radius:50%;border:1px solid #d4a020;display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 0 6px rgba(240,192,64,0.4)">
          <img src="${ITEM_ICONS.gold_coin}" style="width:100%;height:100%;object-fit:cover;display:block"/>
        </div>
        <div>
          <div style="font-size:10px;color:var(--parchment-dark);line-height:1">金幣</div>
          <div style="font-size:14px;font-weight:800;color:#ffd860;text-shadow:0 1px 2px #000;line-height:1.2">${GS.resources.gold.toLocaleString()}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex:1;justify-content:flex-end">
        <div>
          <div style="font-size:10px;color:var(--parchment-dark);line-height:1;text-align:right">鑽石</div>
          <div style="font-size:14px;font-weight:800;color:#80d4ff;text-shadow:0 1px 2px #000;line-height:1.2">${GS.resources.gem.toLocaleString()}</div>
        </div>
        <div style="width:24px;height:24px;border-radius:50%;border:1px solid #6080d0;display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 0 6px rgba(128,160,255,0.4)">
          <img src="${ITEM_ICONS.gem}" style="width:100%;height:100%;object-fit:cover;display:block"/>
        </div>
      </div>
    </div>
    <div class="bag-top-tabs" style="display:flex;gap:2px;padding:4px;background:rgba(20,14,8,0.6);border-bottom:1px solid rgba(240,192,64,0.2);margin-bottom:8px">
      ${BAG_CATEGORIES.map(c => `
        <button class="bag-tab-btn ${activeTab === c.key ? 'active' : ''}" data-bag-tab="${c.key}" style="flex:1;padding:8px 2px;font-size:11px;background:${activeTab === c.key ? 'linear-gradient(180deg, rgba(240,192,64,0.2), rgba(240,192,64,0.05))' : 'transparent'};border:1px solid ${activeTab === c.key ? 'var(--gold-dark)' : 'transparent'};border-bottom:none;color:${activeTab === c.key ? 'var(--gold-bright)' : 'var(--parchment-dark)'};border-radius:4px 4px 0 0;cursor:pointer;font-weight:600">
          ${c.icon}<br/><span style="font-size:9px">${c.name}</span>
        </button>
      `).join('')}
    </div>
    <!-- 背包容量顯示 -->
    <div style="display:flex;align-items:center;gap:8px;padding:4px 8px;margin:0 4px 6px;background:linear-gradient(90deg, rgba(40,28,16,0.6), rgba(25,18,10,0.4));border:1px solid rgba(240,192,64,0.2);border-radius:6px">
      <div style="flex:1">
        <div style="font-size:10px;color:var(--parchment-dark);margin-bottom:2px">背包容量</div>
        <div style="position:relative;height:8px;background:rgba(0,0,0,0.5);border-radius:4px;overflow:hidden;border:1px solid rgba(240,192,64,0.2)">
          <div style="position:absolute;left:0;top:0;bottom:0;width:${Math.min(100, GS.inventory.length / (GS.bagMaxSlots || BAG_BASE_SLOTS) * 100)}%;background:linear-gradient(90deg, #8b6520, #f0c040)"></div>
        </div>
      </div>
      <div style="font-size:12px;font-weight:700;color:var(--gold-bright);text-shadow:0 1px 2px #000">${GS.inventory.length}/${GS.bagMaxSlots || BAG_BASE_SLOTS}</div>
      ${(GS.bagMaxSlots || BAG_BASE_SLOTS) < BAG_MAX_SLOTS ? `<button class="bag-expand-btn" style="padding:4px 8px;font-size:10px;font-weight:700;background:linear-gradient(180deg, #6040c0, #302080);border:1px solid #8060ff;color:#e0d0ff;border-radius:4px;cursor:pointer;white-space:nowrap">擴充+1</button>` : ''}
    </div>
    <div class="bag-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:5px;padding:4px;padding-bottom:70px">
      ${items.length === 0
        ? `<div style="grid-column:1/-1;text-align:center;color:var(--parchment-dark);font-size:11px;padding:30px 10px">暫無${BAG_CATEGORIES.find(c=>c.key===activeTab)?.name||'物品'}</div>`
        : items.map((item, idx) => {
          const rc = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.white;
          const borderColor = rarityColors[item.rarity] || '#d0d0d0';
          const isNew = GS.newItems?.includes(item.id + '|' + item.itemType);
          const isEquip = item.itemType === 'equipment';
          let iconHtml = '';
          if (isEquip) {
            const iconUrl = getEquipIcon(item.type === 'accessory' ? 'ring1' : item.type);
            iconHtml = `<img src="${iconUrl}" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:4px"/>`;
          } else if (item.itemType === 'consumable') {
            const iconUrl = getItemIconUrl(item);
            iconHtml = `<img src="${iconUrl}" style="width:100%;height:100%;object-fit:contain;display:block;border-radius:4px"/>`;
          } else if (item.itemType === 'material') {
            iconHtml = `<div style="width:22px;height:22px;border-radius:3px;background:linear-gradient(135deg, ${borderColor}88, ${borderColor}33);border:1px solid ${borderColor}66"></div>`;
          } else {
            const iconUrl = getItemIconUrl(item);
            iconHtml = `<img src="${iconUrl}" style="width:100%;height:100%;object-fit:contain;display:block;border-radius:4px"/>`;
          }
          const displayName = item.name && item.name.length > 4 ? item.name.slice(0, 4) : (item.name || '');
          return `
            <div class="bag-cell rarity-${item.rarity || 'common'}" data-bag-item-id="${item.id}" data-bag-item-type="${item.itemType}"
                 style="position:relative;aspect-ratio:1;border:2px solid ${borderColor};border-radius:6px;background:linear-gradient(180deg, rgba(30,22,14,0.9), rgba(15,10,6,0.95));display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;box-shadow:inset 0 0 8px ${borderColor}22">
              ${isNew ? '<div style="position:absolute;top:2px;right:2px;width:8px;height:8px;border-radius:50%;background:#ff4040;box-shadow:0 0 4px #ff4040"></div>' : ''}
              <div style="flex:1;display:flex;align-items:center;justify-content:center;width:80%;height:80%">${iconHtml}</div>
              ${displayName ? `<div style="font-size:8px;color:${rc.color};text-shadow:0 1px 2px #000;padding:1px 0;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:90%;text-align:center">${displayName}</div>` : ''}
              ${item.count > 1 ? `<span style="position:absolute;bottom:1px;right:3px;font-size:9px;font-weight:700;color:#fff;text-shadow:0 1px 2px #000">${item.count}</span>` : ''}
            </div>`;
        }).join('')
      }
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;margin-top:6px;border-top:1px solid rgba(240,192,64,0.2);background:rgba(20,14,8,0.4)">
      <div style="font-size:10px;color:var(--parchment-dark)">
        物品：${items.length}/${20 + Math.floor((GS.player.level || 1) * 0.5)} 格
      </div>
      <div style="display:flex;gap:6px">
        <button class="bag-use-all-btn" style="padding:6px 10px;font-size:10px;background:linear-gradient(135deg, #608040, #3a5a20);border:1px solid #80a060;color:#d0ffb0;border-radius:4px;cursor:pointer;font-weight:600" data-one-click-equip>⚔ 一鍵穿戴</button>
        <button class="bag-use-all-btn" style="padding:6px 10px;font-size:10px;background:linear-gradient(135deg, #8b6520, #5a3a10);border:1px solid var(--gold-dark);color:var(--gold-bright);border-radius:4px;cursor:pointer;font-weight:600">⚡ 一鍵使用</button>
      </div>
    </div>
  `;
}

// ==================== 背包事件 ====================
function bindBagPageEvents() {
  const page = el.pageContent;
  if (!page) return;

  // 背包分类tab
  page.querySelectorAll('[data-bag-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!GS.bagPage) GS.bagPage = {};
      GS.bagPage.tab = btn.dataset.bagTab;
      page.innerHTML = renderBagPage();
      bindBagPageEvents();
    });
  });

  // 背包擴充按鈕（調用商店購買路徑，花鑽石直接擴充）
  const expandBtn = page.querySelector('.bag-expand-btn');
  if (expandBtn) expandBtn.addEventListener('click', () => {
    if (useBagExpandScroll(true)) {
      page.innerHTML = renderBagPage();
      bindBagPageEvents();
    }
  });

  // 道具点击显示详情
  page.querySelectorAll('[data-bag-item-id]').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.bagItemId;
      const type = item.dataset.bagItemType;
      const invItem = GS.inventory.find(i => i.id === id && i.itemType === type);
      if (invItem) showItemDetail(invItem);
    });
  });

  // 一鍵穿戴：自動比較並穿戴背包中最高級的裝備
  const oneClickEquipBtn = page.querySelector('[data-one-click-equip]');
  if (oneClickEquipBtn) oneClickEquipBtn.addEventListener('click', () => {
    const equipments = GS.inventory.filter(i => i.itemType === 'equipment');
    if (equipments.length === 0) { alert('背包中沒有可穿戴的裝備'); return; }
    // 按裝備部位分組，每組選最高品質（裝備等級）的
    const slotBests = {};
    equipments.forEach(item => {
      const slot = item.type;
      const cur = slotBests[slot];
      const itemScore = calcEquipScore(item);
      const curScore = cur ? calcEquipScore(cur) : -1;
      if (itemScore > curScore) slotBests[slot] = item;
    });
    let equippedCount = 0;
    Object.entries(slotBests).forEach(([slot, item]) => {
      const current = GS.equipment[slot];
      const curScore = current ? calcEquipScore(current) : 0;
      const itemScore = calcEquipScore(item);
      if (itemScore > curScore) {
        equipItem(item);
        equippedCount++;
      }
    });
    if (equippedCount === 0) { alert('沒有比當前穿戴更好的裝備'); return; }
    addLog('system', `一鍵穿戴了 ${equippedCount} 件裝備`);
    page.innerHTML = renderBagPage();
    bindBagPageEvents();
    updateUI();
  });

  // 一键使用：自動使用所有消耗品中的藥水类
  const useAllBtn = page.querySelector('.bag-use-all-btn');
  if (useAllBtn) useAllBtn.addEventListener('click', () => {
    const consumables = GS.inventory.filter(i => i.itemType === 'consumable' && i.effect && i.count > 0);
    if (consumables.length === 0) { alert('没有可使用的消耗品'); return; }
    let usedCount = 0;
    consumables.forEach(item => {
      if (item.effect?.hp && GS.player.hp < getTotalHpMax()) {
        useConsumable(item.id);
        usedCount++;
      }
    });
    if (usedCount === 0) { alert('血量已满，无需使用藥水'); return; }
    addLog('system', `一键使用了 ${usedCount} 件消耗品`);
    page.innerHTML = renderBagPage();
    bindBagPageEvents();
    updateUI();
  });
}

// ==================== 卡牌合成系统 ====================
function openSynthesisPage(poolType) {
  // poolType: 'hero' 或 'pet'
  const pool = poolType === 'hero' ? SUMMON_POOL : PET_POOL;
  const owned = poolType === 'hero' ? GS.ownedHeroes : GS.ownedPets;
  const title = poolType === 'hero' ? '英雄合成' : '守護合成';

  // 当前可用于合成的稀有度（至少4张相同稀有度）
  const rarityCounts = {};
  owned.forEach(card => {
    if (!rarityCounts[card.rarity]) rarityCounts[card.rarity] = 0;
    rarityCounts[card.rarity] += 1;
  });

  let html = `
    <div class="synthesis-page">
      <div class="bag-section-title">${title}</div>
      <div style="font-size:11px;color:var(--parchment-dark);margin-bottom:12px;line-height:1.6">
        ${SYNTHESIS_COST}张相同稀有度卡牌可合成高一级稀有度随机卡牌<br>
        強化提升券：每張提升當前概率的 20%（最多${MAX_ENHANCE_TICKETS}張）<br>
        當前強化券：<span style="color:var(--gold-bright);font-weight:700">${GS.enhanceTickets || 0}</span> 張<br>
        公式：最终概率 = 基础概率 × (1 + 0.2 × 使用张数)
      </div>
      <div class="synthesis-rate-list">
        ${RARITY_ORDER.slice(0, -1).map(r => {
          const nextR = RARITY_ORDER[RARITY_ORDER.indexOf(r) + 1];
          const count = rarityCounts[r] || 0;
          const baseRate = SYNTHESIS_RATES[r] * 100;
          const canSynth = count >= SYNTHESIS_COST;
          // 计算用 0-5 张券对应的概率
          const rateList = Array.from({length: MAX_ENHANCE_TICKETS + 1}, (_, i) => {
            const fr = baseRate * (1 + ENHANCE_TICKET_BOOST * i);
            return Math.min(99, fr).toFixed(baseRate < 1 ? 3 : 1);
          });
          return `
            <div class="synthesis-rate-item ${canSynth ? 'can-synth' : 'cant-synth'}">
              <div class="synthesis-rate-from">
                <span class="synthesis-rate-badge" style="background:${RARITY_CONFIG[r].color}">${RARITY_CONFIG[r].name} ×${SYNTHESIS_COST}</span>
                → ${RARITY_CONFIG[nextR].name} 随机
              </div>
              <div class="synthesis-rate-info">
                <span>基础概率 ${baseRate.toFixed(baseRate < 1 ? 2 : 0)}%</span>
                <span>可用 ${count} 张</span>
              </div>
              <button class="shop-item-buy" style="width:auto;padding:4px 12px;font-size:11px"
                      data-synth-rarity="${r}" data-synth-pool="${poolType}"
                      ${canSynth ? '' : 'disabled style="opacity:0.4;cursor:not-allowed"'}>
                合成
              </button>
            </div>`;
        }).join('')}
      </div>
    </div>
  `;

  el.pageTitle.textContent = title;
  el.pageContent.innerHTML = html;
  bindSynthesisEvents(poolType);
}

function bindSynthesisEvents(poolType) {
  el.pageContent.querySelectorAll('[data-synth-rarity]').forEach(btn => {
    btn.addEventListener('click', () => {
      const rarity = btn.dataset.synthRarity;
      const pool = btn.dataset.synthPool;
      doSynthesis(rarity, pool);
    });
  });
}

function doSynthesis(rarity, poolType) {
  const pool = poolType === 'hero' ? SUMMON_POOL : PET_POOL;
  const owned = poolType === 'hero' ? GS.ownedHeroes : GS.ownedPets;

  // 检查数量
  const sameRarity = owned.filter(c => c.rarity === rarity);
  if (sameRarity.length < SYNTHESIS_COST) {
    alert(`${RARITY_CONFIG[rarity].name}卡牌不足${SYNTHESIS_COST}張`);
    return;
  }

  // 使用強化券選擇
  let tickets = 0;
  const maxTickets = Math.min(MAX_ENHANCE_TICKETS, GS.enhanceTickets || 0);
  if (maxTickets > 0) {
    const input = prompt(`使用多少張強化提升券？（0-${maxTickets}）\n每張提升當前成功率的 20%`);
    const n = parseInt(input);
    if (!isNaN(n) && n > 0) tickets = Math.min(maxTickets, Math.max(0, n));
  }

  // 计算概率
  const baseRate = SYNTHESIS_RATES[rarity];
  const totalRate = baseRate * (1 + tickets * ENHANCE_TICKET_BOOST);
  const finalRate = Math.min(0.99, totalRate); // 最高99%

  // 消耗卡牌
  const toRemove = sameRarity.slice(0, SYNTHESIS_COST);
  toRemove.forEach(card => {
    const idx = owned.findIndex(o => o.id === card.id);
    if (idx >= 0) owned.splice(idx, 1);
  });
  // 消耗強化券
  GS.enhanceTickets = (GS.enhanceTickets || 0) - tickets;

  // 判定
  const nextRarity = RARITY_ORDER[RARITY_ORDER.indexOf(rarity) + 1];
  const candidates = pool.filter(p => p.rarity === nextRarity);

  if (Math.random() < finalRate && candidates.length > 0) {
    const newCard = { ...candidates[Math.floor(Math.random() * candidates.length)] };
    owned.push(newCard);
    const rc = RARITY_CONFIG[nextRarity];
    alert(`🎉 合成成功！\n獲得【${rc.name}】${newCard.name}！\n\n成功率：${(finalRate * 100).toFixed(2)}%`);
  } else {
    alert(`💔 合成失敗\n消耗了 ${SYNTHESIS_COST} 張${RARITY_CONFIG[rarity].name}卡牌${tickets > 0 ? ' 和 ' + tickets + '張強化券' : ''}\n\n成功率：${(finalRate * 100).toFixed(2)}%`);
  }

  updateUI();
  openSynthesisPage(poolType);
}

// ==================== 商城（強化提升券）====================
function buyEnhanceTicket(amount) {
  amount = amount || 1;
  const cost = amount * ENHANCE_TICKET_COST;
  if (GS.resources.gem < cost) { alert('鑽石不足！'); return; }
  GS.resources.gem -= cost;
  GS.enhanceTickets = (GS.enhanceTickets || 0) + amount;
  addLog('shop', `購買了 ${amount} 張強化提升券`);
  updateUI();
}
function showItemDetail(item) {
  const rc = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.white;
  const s = item.baseStats || item.stats || {};
  const statsText = Object.entries(s).map(([k, v]) => {
    const names = { atk: '攻擊', def: '防禦', hpMax: '生命', crit: '暴擊率', critDmg: '暴擊傷害' };
    return `${names[k] || k} +${v}${k === 'crit' || k === 'critDmg' ? '%' : ''}`;
  }).join(' · ');

  const isEquipment = item.itemType === 'equipment';
  const isTreasure = item.itemType === 'treasure';
  const isCard = item.itemType === 'card';

  // 取得圖標：優先用 item.icon URL，其次用類型
  let iconHtml = '';
  if (item.icon && typeof item.icon === 'string' && item.icon.startsWith('/')) {
    iconHtml = `<img src="${item.icon}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;display:block"/>`;
  } else if (isEquipment) {
    iconHtml = `<img src="${getEquipIcon(item.type === 'accessory' ? 'ring1' : item.type)}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;display:block"/>`;
  } else {
    iconHtml = `<img src="${ITEM_ICON_MAP.default}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;display:block"/>`;
  }

  let detailHtml = `
    <div class="item-detail-modal" id="item-detail-modal" style="position:absolute;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:200">
      <div class="item-detail-inner" style="background:linear-gradient(180deg, rgba(40,28,18,0.98), rgba(20,14,8,0.98));border:3px solid ${rc.color};border-radius:12px;padding:24px;max-width:320px;width:90%;text-align:center;box-shadow:0 0 30px ${rc.glow}">
        <div style="display:flex;justify-content:center;margin-bottom:10px">${iconHtml}</div>
        <div style="font-size:16px;font-weight:700;color:${rc.color};margin-bottom:4px;text-shadow:0 1px 3px #000">${item.name}</div>
        <div style="font-size:11px;color:${rc.color};margin-bottom:8px;font-weight:600">${rc.name}</div>
        ${statsText ? `<div style="font-size:12px;color:var(--parchment-light);margin-bottom:8px;line-height:1.8">${statsText}</div>` : ''}
        ${item.desc ? `<div style="font-size:11px;color:var(--parchment-dark);margin-bottom:8px;font-style:italic">"${item.desc}"</div>` : ''}
        ${item.skill ? `<div style="font-size:11px;color:var(--gold-bright);margin-bottom:8px;background:rgba(240,192,64,0.1);padding:6px;border-radius:4px">技能：${item.skill.name} - ${item.skill.desc}</div>` : ''}
        <div style="font-size:10px;color:var(--parchment-dark);margin-bottom:12px">
          ${isEquipment ? `部位：${EQUIP_SLOTS.find(s => s.id === item.type)?.name || (item.type === 'accessory' ? '飾品' : item.type)}` : ''}
          ${isTreasure ? '類型：寶物' : ''}
          ${isCard ? '類型：卡牌' : ''}
          ${item.count > 1 ? ` · 數量：${item.count}` : ''}
        </div>
        <div style="display:flex;gap:8px;justify-content:center">
          ${isEquipment ? `<button class="shop-item-buy" style="width:auto;padding:6px 16px" id="item-detail-equip-btn">裝備</button>` : ''}
          ${isCard ? `<button class="shop-item-buy" style="width:auto;padding:6px 16px;background:linear-gradient(180deg,#a060ff,#6030a0);border-color:#a060ff" id="item-detail-synth-btn">合成</button>` : ''}
          <button class="shop-item-buy" style="width:auto;padding:6px 16px;background:linear-gradient(180deg,#555,#333);border-color:#777" id="item-detail-close-btn" onclick="document.getElementById('item-detail-modal').remove()">關閉</button>
        </div>
      </div>
    </div>
  `;

  const container = el.pageContent;
  if (!container) return;

  // 移除旧弹窗
  const old = document.getElementById('item-detail-modal');
  if (old) old.remove();

  const wrapper = document.createElement('div');
  wrapper.innerHTML = detailHtml;
  container.appendChild(wrapper.firstElementChild);

  // 裝備按钮
  const equipBtn = document.getElementById('item-detail-equip-btn');
  if (equipBtn) {
    equipBtn.onclick = () => {
      equipItem(item);
      document.getElementById('item-detail-modal').remove();
      // 刷新背包页面
      el.pageContent.innerHTML = renderBagPage();
      bindBagPageEvents();
    };
  }

  // 合成按钮
  const synthBtn = document.getElementById('item-detail-synth-btn');
  if (synthBtn) {
    synthBtn.onclick = () => {
      document.getElementById('item-detail-modal').remove();
      openSynthesisPage(item.itemType);
    };
  }

  // 点击背景關閉
  document.getElementById('item-detail-modal').addEventListener('click', e => {
    if (e.target.id === 'item-detail-modal') {
      document.getElementById('item-detail-modal').remove();
    }
  });
}

function renderGachaPage() {
  const activeTab = GS.gachaPageTab || 'hero';
  let pool, ownedList;
  if (activeTab === 'hero') { pool = SUMMON_POOL; ownedList = GS.ownedHeroes; }
  else if (activeTab === 'pet') { pool = PET_POOL; ownedList = GS.ownedPets; }
  else { pool = TRANSFORM_POOL; ownedList = GS.ownedTransforms || []; }
  const ownedIds = new Set(ownedList.map(x => x.id));
  const rarityOrder = ['gold','purple','red','blue','green','white'];
  const sortedPool = [...pool].sort((a,b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));
  const ownedCount = ownedIds.size;
  const totalCount = pool.length;
  const titles = {
    hero:      { title: '英雄召喚',   desc: '召喚強力英雄助你作戰', btn: '查看全部英雄' },
    pet:       { title: '守護召喚',   desc: '召喚守護寵物提供屬性加成', btn: '查看全部寵物' },
    transform: { title: '變身召喚',   desc: '獲得強大變身形態，戰力飆升', btn: '查看全部變身' },
  };
  const t = titles[activeTab] || titles.hero;
  const costSingle = GACHA_COST_SINGLE;
  const costTen    = GACHA_COST_TEN;
  const costBig    = GACHA_COST_BIG;
  return `
    <div class="gacha-header-banner">
      <div class="gacha-banner-title">${t.title}</div>
      <div class="gacha-banner-desc">${t.desc}</div>
    </div>
    <div class="gacha-pool-tabs">
      <button class="gacha-pool-tab ${activeTab === 'hero' ? 'active' : ''}" data-gacha-pool="hero">⚔ 英雄池</button>
      <button class="gacha-pool-tab ${activeTab === 'pet' ? 'active' : ''}" data-gacha-pool="pet">🐾 守護池</button>
      <button class="gacha-pool-tab ${activeTab === 'transform' ? 'active' : ''}" data-gacha-pool="transform">🔥 變身池</button>
    </div>
    <div class="rarity-bar">
      <div class="rarity-item white">普通<br>50%</div>
      <div class="rarity-item green">高級<br>30%</div>
      <div class="rarity-item blue">稀有<br>14%</div>
      <div class="rarity-item red">史詩<br>3%</div>
      <div class="rarity-item purple">傳說<br>1.8%</div>
      <div class="rarity-item gold">神話<br>0.2%</div>
    </div>
    <div class="gacha-buttons">
      <button class="gacha-btn-main" id="gacha-single">
        <span>單抽</span>
        <span class="gacha-cost">💎 ${costSingle}</span>
      </button>
      <button class="gacha-btn-main ten-pull" id="gacha-ten">
        <span>十連 <span class="gacha-bonus-tag">+1</span></span>
        <span class="gacha-cost">💎 ${costTen}</span>
      </button>
      <button class="gacha-btn-main big-pull" id="gacha-big">
        <span>30+5 <span class="gacha-bonus-tag blue-tag">保底藍</span></span>
        <span class="gacha-cost">💎 ${costBig}</span>
      </button>
    </div>
    <div style="font-size:10px;color:var(--parchment-dark);text-align:center;line-height:1.6;margin-bottom:10px">
      十連抽必得綠色及以上 · 30+5抽必得稀有及以上<br>
      擁有鑽石：<span style="color:#80d4ff;font-weight:700">💎 ${GS.resources.gem.toLocaleString()}</span>
    </div>

    <!-- 圖鑑網格 -->
    <div class="gacha-collection-header">
      <span>圖鑑進度</span>
      <span class="gacha-collection-count">${ownedCount} / ${totalCount}</span>
    </div>
    <div class="gacha-collection-grid">
      ${sortedPool.map(item => {
        const owned = ownedIds.has(item.id);
        let spriteHtml;
        if (activeTab === 'transform') {
          spriteHtml = `<img src="${getTransformIcon(item.spriteKey)}" style="max-width:36px;max-height:36px;object-fit:contain;border-radius:4px;filter:${owned ? 'none' : 'grayscale(1) brightness(0.4)'};display:block;flex-shrink:0"/>`;
        } else if (activeTab === 'hero') {
          spriteHtml = spriteEmojiHTML(item.sprite, 32);
        } else {
          spriteHtml = `<div style="font-size:28px;filter:${owned ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' : 'grayscale(1) opacity(0.3)'}">${item.icon || '❓'}</div>`;
        }
        return `
        <div class="gacha-col-item rarity-${item.rarity} ${owned ? 'owned' : 'locked'}">
          <div class="gacha-col-icon">${spriteHtml}</div>
          <div class="gacha-col-name">${owned ? item.name : '???'}</div>
        </div>`;
      }).join('')}
    </div>
    <div style="text-align:center;margin-top:10px">
      <button class="gacha-unlock-all-btn" id="gacha-unlock-all">${t.btn}</button>
    </div>
  `;
}

function renderShopPage() {
  const activeTab = GS.shopTab || 'consumable';
  const shopItems = {
    consumable: [
      { id: 'hp1', name: '小型生命藥水', desc: '恢復50點生命', price: 50, icon: ITEM_ICONS.hp1, currency: 'gold', rarity: 'white', effect: { hp: 50 } },
      { id: 'hp2', name: '中型生命藥水', desc: '恢復200點生命', price: 200, icon: ITEM_ICONS.hp2, currency: 'gold', rarity: 'green', effect: { hp: 200 } },
      { id: 'hp4', name: '體力藥水', desc: '恢復500點生命', price: 500, icon: ITEM_ICONS.hp3, currency: 'gold', rarity: 'blue', effect: { hp: 500 } },
      { id: 'mp1', name: '小型魔力藥水', desc: '恢復30點魔力', price: 75, icon: ITEM_ICONS.mp1, currency: 'gold', rarity: 'white', effect: { mp: 30 } },
      { id: 'mp2', name: '中型魔力藥水', desc: '恢復100點魔力', price: 250, icon: ITEM_ICONS.mp2, currency: 'gold', rarity: 'green', effect: { mp: 100 } },
      { id: 'mp4', name: '高級魔力藥水', desc: '恢復200點魔力', price: 800, icon: ITEM_ICONS.mp3, currency: 'gold', rarity: 'blue', effect: { mp: 200 } },
      { id: 'spd1', name: '加速藥水', desc: '攻擊速度+20%、移動速度+20%，持續30分鐘', price: 400, icon: ITEM_ICONS.spd1, currency: 'gold', rarity: 'blue', effect: { atkSpeed: 20, moveSpeed: 20, duration: 1800 } },
      { id: 'spd2', name: '狂暴藥水', desc: '攻擊速度+30%、移動速度+30%，持續30分鐘', price: 800, icon: ITEM_ICONS.spd2, currency: 'gold', rarity: 'red', effect: { atkSpeed: 30, moveSpeed: 30, duration: 1800 } },
      { id: 'move1', name: '行走加速藥水', desc: '移動速度+20%，持續1小時', price: 200, icon: ITEM_ICONS.move1, currency: 'gold', rarity: 'green', effect: { moveSpeed: 20, duration: 3600 } },
      { id: 'mgem', name: '魔法寶石', desc: '強力技能必備消耗品', price: 1000, icon: ITEM_ICONS.mgem, currency: 'gold', rarity: 'blue', effect: {} },
      { id: 'town_scroll', name: '回城卷軸', desc: '立刻傳送回村莊', price: 500, icon: ITEM_ICONS.teleport, currency: 'gold', rarity: 'green', effect: { teleport: 'town' } },
      { id: 'enhance_stone_low', name: '初級強化石', desc: '強化裝備+1~+3', price: 5000, icon: ITEM_ICONS.enhance_stone, currency: 'gold', rarity: 'white', effect: { enhance: [1,3] } },
      { id: 'enhance_stone_mid', name: '中級強化石', desc: '強化裝備+4~+6', price: 50, icon: ITEM_ICONS.bless_stone, currency: 'gem', rarity: 'green', effect: { enhance: [4,6] } },
      { id: 'enhance_stone_high', name: '高級強化石', desc: '強化裝備+7~+9', price: 200, icon: ITEM_ICONS.crystal_frag, currency: 'gem', rarity: 'blue', effect: { enhance: [7,9] } },
    ],
    gem: [
      { id: 'exp_potion', name: '經驗藥水', desc: '立刻獲得1000經驗', price: 120, icon: ITEM_ICONS.hp3, currency: 'gem' },
      { id: 'gold_pouch', name: '金幣袋', desc: '獲得10000金幣', price: 100, icon: ITEM_ICONS.enhance_ticket, currency: 'gem' },
      { id: 'enhance_ticket', name: '強化提升券', desc: '提升合成成功率20%', price: ENHANCE_TICKET_COST, icon: ITEM_ICONS.enhance_ticket, currency: 'gem', type: 'enhance_ticket' },
      { id: 'mgem_gem', name: '魔法寶石×10', desc: '強力技能消耗品', price: 150, icon: ITEM_ICONS.mgem, currency: 'gem', count: 10 },
      { id: 'exp_boost_scroll', name: '經驗加成卷軸', desc: '30分鐘內經驗獲得+50%', price: 100, icon: ITEM_ICONS.quest_scroll, currency: 'gem', type: 'consumable', effect: { expBoost: 50, duration: 1800 } },
      { id: 'drop_boost_scroll', name: '掉寶加成卷軸', desc: '30分鐘內掉寶率+50%', price: 100, icon: ITEM_ICONS.treasure_key, currency: 'gem', type: 'consumable', effect: { dropBoost: 50, duration: 1800 } },
      { id: 'mystery_chest', name: '神秘寶箱', desc: '隨機開出道具或裝備', price: 100, icon: ITEM_ICONS.chest, currency: 'gem', type: 'consumable', effect: { mysteryChest: true } },
      { id: 'revive_gem', name: '復活卷軸', desc: '死亡後原地復活', price: 50, icon: ITEM_ICONS.revive_scroll, currency: 'gem', type: 'consumable', effect: { revive: true } },
      { id: 'bag_expand', name: '背包擴充卷', desc: '使用後背包容量+1格（最多200格）', price: 100, icon: ITEM_ICONS.quest_scroll, currency: 'gem', type: 'bag_expand' },
    ],
    equip: [
      { id: 'w1', name: '精鋼劍', desc: '攻擊+15', price: 5000, icon: ITEM_ICONS.weapon, rarity: 'rare', slot: 'weapon', currency: 'gold', stats: { atk: 15 } },
    ],
  };
  const tabs = [
    { key: 'consumable', name: '消耗品' },
    { key: 'equip', name: '裝備' },
    { key: 'gem', name: '鑽石商店' },
  ];
  const items = shopItems[activeTab] || [];
  const renderIcon = (url) => `<img src="${url}" style="width:100%;height:100%;object-fit:contain;display:block" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" alt=""/><div class="item-icon-fallback" style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:24px;color:#c0a060">◆</div>`;
  
  // 取得當前選擇數量（預設1）
  if (!GS.shopQty) GS.shopQty = {};
  
  return `
    <div class="shop-tab-bar" style="display:flex;gap:2px;margin-bottom:12px;border-bottom:1px solid rgba(240,192,64,0.15);padding-bottom:8px">
      ${tabs.map(t => `<button class="shop-tab ${activeTab === t.key ? 'active' : ''}" data-shop-tab="${t.key}" style="flex:1;padding:10px 4px;font-size:13px;background:${activeTab === t.key ? 'linear-gradient(180deg, rgba(80,50,20,0.9), rgba(40,25,10,0.95))' : 'transparent'};border:1px solid ${activeTab === t.key ? 'var(--gold-bright)' : 'var(--gold-dark)'};color:${activeTab === t.key ? 'var(--gold-bright)' : 'var(--parchment-dark)'};border-radius:6px;cursor:pointer;font-weight:600">${t.name}</button>`).join('')}
    </div>
    <div class="shop-list" style="display:flex;flex-direction:column;gap:6px;max-height:calc(100vh - 340px);overflow-y:auto;padding-right:4px">
      ${items.map(item => {
        const qty = GS.shopQty?.[item.id] || 1;
        const totalPrice = item.price * qty;
        const currencyIcon = item.currency === 'gem' ? ITEM_ICONS.gem : ITEM_ICONS.gold_coin;
        const currencyColor = item.currency === 'gem' ? '#c0a0ff' : '#f0c040';
        return `
          <div class="shop-item-row" data-shop-item="${item.id}" data-tab="${activeTab}" style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:linear-gradient(90deg, rgba(40,28,16,0.85), rgba(25,18,10,0.7));border:1px solid rgba(240,192,64,0.25);border-radius:8px;box-shadow:inset 0 0 20px rgba(0,0,0,0.3)">
            <!-- 左側：商品圖標 -->
            <div class="shop-item-icon-wrap" style="width:52px;height:52px;border-radius:8px;border:2px solid var(--gold-dark);background:radial-gradient(circle at 50% 40%, rgba(30,22,14,0.95), rgba(10,7,4,0.98));display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.6), inset 0 0 8px rgba(240,192,64,0.15)">
              ${renderIcon(item.icon)}
            </div>
            <!-- 中間：商品名稱 + 描述 + 價格 -->
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;font-weight:700;color:var(--gold-bright);text-shadow:0 1px 3px rgba(0,0,0,0.8);margin-bottom:3px">${item.name}</div>
              <div style="font-size:11px;color:var(--parchment-dark);line-height:1.3;margin-bottom:5px">${item.desc}</div>
              <div style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:${currencyColor};text-shadow:0 1px 2px rgba(0,0,0,0.8)">
                <span style="width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;border-radius:50%;border:1px solid ${currencyColor}80;flex-shrink:0"><img src="${currencyIcon}" style="width:100%;height:100%;object-fit:cover;display:block"/></span>
                <span>${item.price.toLocaleString()} <span style="font-size:10px;font-weight:500;color:var(--parchment-dark)">/ 個</span></span>
              </div>
            </div>
            <!-- 右側：數量選擇器 + 購買按鈕 -->
            <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
              <!-- 數量選擇器：− 數量 + MAX -->
              <div class="shop-qty-row" style="display:flex;align-items:center;gap:0;overflow:hidden;border-radius:6px;border:1px solid var(--gold-dark);background:rgba(0,0,0,0.4)">
                <button class="shop-qty-btn minus" data-shop-qty="minus:${item.id}" style="width:32px;height:28px;background:linear-gradient(180deg, rgba(60,40,20,0.8), rgba(30,20,10,0.9));border:none;border-right:1px solid rgba(240,192,64,0.2);color:var(--gold-bright);font-size:18px;cursor:pointer;font-weight:700;line-height:1">−</button>
                <span class="shop-qty-num" style="width:44px;text-align:center;font-size:15px;font-weight:700;color:var(--parchment-light);background:rgba(0,0,0,0.3);height:28px;display:flex;align-items:center;justify-content:center;border-right:1px solid rgba(240,192,64,0.2)">${qty}</span>
                <button class="shop-qty-btn plus" data-shop-qty="plus:${item.id}" style="width:32px;height:28px;background:linear-gradient(180deg, rgba(60,40,20,0.8), rgba(30,20,10,0.9));border:none;border-right:1px solid rgba(240,192,64,0.2);color:var(--gold-bright);font-size:18px;cursor:pointer;font-weight:700;line-height:1">+</button>
                <button class="shop-qty-btn max" data-shop-qty="max:${item.id}" style="padding:0 10px;height:28px;background:linear-gradient(180deg, rgba(100,70,30,0.9), rgba(60,40,15,0.95));border:none;color:var(--gold-bright);font-size:12px;cursor:pointer;font-weight:700;letter-spacing:1px">MAX</button>
              </div>
              <!-- 購買按鈕 -->
              <button class="shop-item-buy" data-buy-id="${item.id}" data-buy-tab="${activeTab}" data-buy-qty="${qty}" style="padding:8px 14px;font-size:13px;font-weight:700;background:linear-gradient(180deg, #8b6520, #5a3a10);border:1px solid var(--gold);color:var(--gold-bright);border-radius:6px;cursor:pointer;text-shadow:0 1px 2px rgba(0,0,0,0.8);box-shadow:0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,220,120,0.3);white-space:nowrap;min-width:100px;display:flex;align-items:center;justify-content:center;gap:4px">
                <span style="width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center"><img src="${currencyIcon}" style="width:100%;height:100%;object-fit:contain;display:block"/></span>
                <span>${totalPrice.toLocaleString()}</span>
              </button>
            </div>
          </div>
        `;
      }).join('')}
      ${items.length === 0 ? '<div style="padding:40px;text-align:center;color:#7a6a6a;font-size:13px">暫無商品</div>' : ''}
    </div>
  `;
}

function renderDungeonPage() {
  const dungeons = [
    { name: '哥布林巢穴', level: 10, icon: '🕳️', status: '開放' },
    { name: '亡者密室', level: 25, icon: '💀', status: '開放' },
    { name: '沙漠遗迹', level: 40, icon: '🏛️', status: '未解锁' },
    { name: '龍焰洞窟', level: 60, icon: '🐉', status: '未解锁' },
  ];
  return `
    <div class="bag-section-title" style="margin-bottom:10px">副本列表</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${dungeons.map(d => `
        <div class="shop-item" style="flex-direction:row;justify-content:flex-start;text-align:left">
          <div class="shop-item-icon" style="margin-right:12px">${d.icon}</div>
          <div style="flex:1">
            <div class="shop-item-name" style="text-align:left">${d.name}</div>
            <div class="shop-item-desc" style="text-align:left">推荐等級：Lv.${d.level}</div>
          </div>
          <button class="shop-item-buy" style="width:auto;padding:6px 14px"
                  ${d.status === '未解锁' ? 'disabled style="opacity:0.5;cursor:default"' : ''}>
            ${d.status}
          </button>
        </div>
      `).join('')}
    </div>
  `;
}

// ==================== 页面事件 ====================
function bindPageEvents(page) {
  el.backBtn.onclick = closeSidePage;

  if (page === 'hero') {
    el.pageContent.querySelectorAll('[data-hero-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        GS.heroPageTab = tab.dataset.heroTab;
        el.pageContent.innerHTML = renderHeroPage();
        bindPageEvents('hero');
      });
    });

    // 人物介面裝備槽：點擊顯示裝備詳情彈窗
    el.pageContent.querySelectorAll('[data-equip-slot]').forEach(slot => {
      slot.addEventListener('click', () => {
        const slotId = slot.dataset.equipSlot;
        openEquipDetailModal(slotId);
      });
    });

    // 英雄品質篩選
    el.pageContent.querySelectorAll('[data-hero-filter]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        GS.heroRarity = btn.dataset.heroFilter;
        el.pageContent.innerHTML = renderHeroPage();
        bindPageEvents('hero');
      });
    });
    // 守護品質篩選
    el.pageContent.querySelectorAll('[data-pet-filter]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        GS.petRarity = btn.dataset.petFilter;
        el.pageContent.innerHTML = renderHeroPage();
        bindPageEvents('hero');
      });
    });

    el.pageContent.querySelectorAll('[data-hero-id]').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.heroId;
        if (GS.equippedHeroId === id) {
          GS.equippedHeroId = null;
          GS.summons = GS.summons.filter(s => s.isDemon && summonedDemon);
          document.querySelectorAll('.world-unit.summon').forEach(elDiv => {
            if (elDiv.dataset.id !== 'demon') elDiv.remove();
          });
        } else equipHero(id);
        updateSlotDisplay();
        el.pageContent.innerHTML = renderHeroPage();
        bindPageEvents('hero');
      });
    });
    el.pageContent.querySelectorAll('[data-pet-id]').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.petId;
        GS.equippedPetId = GS.equippedPetId === id ? null : id;
        equipPet(GS.equippedPetId);
        el.pageContent.innerHTML = renderHeroPage();
        bindPageEvents('hero');
      });
    });

    // 英雄合成按钮
    const heroSynthBtn = document.getElementById('hero-synth-btn');
    if (heroSynthBtn) {
      heroSynthBtn.addEventListener('click', () => { openSynthesisPage('hero'); });
    }
    // 宠物合成按钮
    const petSynthBtn = document.getElementById('pet-synth-btn');
    if (petSynthBtn) {
      petSynthBtn.addEventListener('click', () => { openSynthesisPage('pet'); });
    }

    // 技能面板：裝備技能到技能栏
    el.pageContent.querySelectorAll('[data-equip-skill]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const skillIdx = parseInt(btn.dataset.equipSkill);
        const cls = CLASSES[GS.player.classId];
        if (!cls.skillBar) cls.skillBar = [];
        // 找到第一个空格（8格内）
        let emptySlot = cls.skillBar.findIndex(i => i === null || i === undefined || i < 0);
        if (emptySlot === -1 && cls.skillBar.length < 8) {
          emptySlot = cls.skillBar.length;
          cls.skillBar.push(skillIdx);
        } else if (emptySlot !== -1) {
          cls.skillBar[emptySlot] = skillIdx;
        } else {
          // 8格都满了，替换最后一个
          if (!confirm('技能栏已满，是否替换最後一個技能？')) return;
          cls.skillBar[7] = skillIdx;
        }
        updateSkillBar();
        updateSiegeSkillBar();
        el.pageContent.innerHTML = renderHeroPage();
        bindPageEvents('hero');
      });
    });

    // 技能面板：升級技能
    el.pageContent.querySelectorAll('[data-upgrade-skill]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const skillIdx = parseInt(btn.dataset.upgradeSkill);
        const cls = CLASSES[GS.player.classId];
        const skill = cls.allSkills[skillIdx];
        if (!skill) return;
        const cost = 500 * (skill.level || 1);
        if (GS.resources.gold < cost) { alert('金幣不足'); return; }
        GS.resources.gold -= cost;
        skill.level = (skill.level || 1) + 1;
        // 提升傷害
        const upgradeMult = 1.15;
        if (skill.dmgMult) skill.dmgMult = Math.round(skill.dmgMult * upgradeMult * 100) / 100;
        if (skill.healAmt) skill.healAmt = Math.round(skill.healAmt * upgradeMult * 100) / 100;
        addLog('system', `✨ ${skill.name} 升至 Lv.${skill.level}！`);
        updateUI();
        updateSkillBar();
        el.pageContent.innerHTML = renderHeroPage();
        bindPageEvents('hero');
      });
    });

    // 技能拖动：拖拽源和目標
    let draggedSkillIdx = null;
    let draggedBarIdx = null;
    el.pageContent.querySelectorAll('.skill-learn-item[draggable="true"]').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        draggedSkillIdx = parseInt(item.dataset.skillIdx);
        draggedBarIdx = null;
        e.dataTransfer.effectAllowed = 'copy';
      });
    });
    el.pageContent.querySelectorAll('.skill-slot[draggable="true"]').forEach(slot => {
      slot.addEventListener('dragstart', (e) => {
        draggedBarIdx = parseInt(slot.dataset.barIdx);
        draggedSkillIdx = null;
        e.dataTransfer.effectAllowed = 'move';
      });
    });
    el.pageContent.querySelectorAll('.skill-slot').forEach(slot => {
      slot.addEventListener('dragover', (e) => { e.preventDefault(); });
      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetIdx = parseInt(slot.dataset.barIdx);
        const cls = CLASSES[GS.player.classId];
        if (!cls.skillBar) cls.skillBar = [0,1,2,3,4,5,6,7];
        if (draggedSkillIdx !== null) {
          // 从技能列表拖入：裝備
          cls.skillBar[targetIdx] = draggedSkillIdx;
        } else if (draggedBarIdx !== null && draggedBarIdx !== targetIdx) {
          // 同栏内交换位置
          const temp = cls.skillBar[targetIdx];
          cls.skillBar[targetIdx] = cls.skillBar[draggedBarIdx];
          cls.skillBar[draggedBarIdx] = temp;
        }
        updateSkillBar();
        updateSiegeSkillBar();
        el.pageContent.innerHTML = renderHeroPage();
        bindPageEvents('hero');
      });
    });
  }

  if (page === 'gacha') {
    el.pageContent.querySelectorAll('[data-gacha-pool]').forEach(tab => {
      tab.addEventListener('click', () => {
        GS.gachaPageTab = tab.dataset.gachaPool;
        el.pageContent.innerHTML = renderGachaPage();
        bindPageEvents('gacha');
      });
    });
    const singleBtn = el.pageContent.querySelector('#gacha-single');
    if (singleBtn) singleBtn.addEventListener('click', () => {
      let results, poolType;
      if (GS.gachaPageTab === 'transform') {
        results = doTransformGacha('single');
        poolType = 'transform';
      } else {
        const pool = GS.gachaPageTab === 'hero' ? SUMMON_POOL : PET_POOL;
        results = doGacha(pool, 1, 'single');
        poolType = GS.gachaPageTab;
      }
      if (results.length) showGachaResults(results, poolType);
      el.pageContent.innerHTML = renderGachaPage();
      bindPageEvents('gacha');
    });
    const tenBtn = el.pageContent.querySelector('#gacha-ten');
    if (tenBtn) tenBtn.addEventListener('click', () => {
      let results, poolType;
      if (GS.gachaPageTab === 'transform') {
        results = doTransformGacha('ten');
        poolType = 'transform';
      } else {
        const pool = GS.gachaPageTab === 'hero' ? SUMMON_POOL : PET_POOL;
        results = doGacha(pool, 10, 'ten');
        poolType = GS.gachaPageTab;
      }
      if (results.length) showGachaResults(results, poolType);
      el.pageContent.innerHTML = renderGachaPage();
      bindPageEvents('gacha');
    });
    const bigBtn = el.pageContent.querySelector('#gacha-big');
    if (bigBtn) bigBtn.addEventListener('click', () => {
      let results, poolType;
      if (GS.gachaPageTab === 'transform') {
        results = doTransformGacha('big');
        poolType = 'transform';
      } else {
        const pool = GS.gachaPageTab === 'hero' ? SUMMON_POOL : PET_POOL;
        results = doGacha(pool, 30, 'big');
        poolType = GS.gachaPageTab;
      }
      if (results.length) showGachaResults(results, poolType);
      el.pageContent.innerHTML = renderGachaPage();
      bindPageEvents('gacha');
    });
    const unlockAllBtn = el.pageContent.querySelector('#gacha-unlock-all');
    if (unlockAllBtn) unlockAllBtn.addEventListener('click', () => {
      let pool, owned, label;
      if (GS.gachaPageTab === 'transform') {
        pool = TRANSFORM_POOL;
        owned = GS.ownedTransforms || [];
        label = '變身';
      } else {
        pool = GS.gachaPageTab === 'hero' ? SUMMON_POOL : PET_POOL;
        owned = GS.gachaPageTab === 'hero' ? GS.ownedHeroes : GS.ownedPets;
        label = GS.gachaPageTab === 'hero' ? '英雄' : '寵物';
      }
      alert(`已獲得 ${owned.length} / ${pool.length} 個${label}`);
    });
  }

  if (page === 'shop') {
    el.pageContent.querySelectorAll('[data-shop-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        GS.shopTab = tab.dataset.shopTab;
        el.pageContent.innerHTML = renderShopPage();
        bindPageEvents('shop');
      });
    });
    el.pageContent.querySelectorAll('[data-buy-id]').forEach(btn => {
      btn.addEventListener('click', () => handleShopBuy(btn.dataset.buyId, btn.dataset.buyTab, Number(btn.dataset.buyQty) || 1));
    });
    // 數量選擇器
    el.pageContent.querySelectorAll('[data-shop-qty]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [action, itemId] = btn.dataset.shopQty.split(':');
        if (!GS.shopQty) GS.shopQty = {};
        let qty = GS.shopQty[itemId] || 1;
        if (action === 'plus') qty = Math.min(99, qty + 1);
        else if (action === 'minus') qty = Math.max(1, qty - 1);
        else if (action === 'max') qty = 99;
        GS.shopQty[itemId] = qty;
        // 只刷新該行，而非整頁
        const row = btn.closest('.shop-item-row');
        const qtyEl = row?.querySelector('.shop-qty-num');
        if (qtyEl) qtyEl.textContent = qty;
        const buyBtn = row?.querySelector('[data-buy-id]');
        if (buyBtn) {
          buyBtn.dataset.buyQty = qty;
          // 取得價格並重新計算
          const tab = buyBtn.dataset.buyTab;
          const shopItems = {
            consumable: [
              { id: 'hp1', price: 50 }, { id: 'hp2', price: 200 }, { id: 'hp4', price: 500 },
              { id: 'mp1', price: 75 }, { id: 'mp2', price: 250 }, { id: 'mp4', price: 800 },
              { id: 'spd1', price: 400 }, { id: 'spd2', price: 50, currency: 'gem' }, { id: 'move1', price: 200 },
              { id: 'mgem', price: 1000 }, { id: 'town_scroll', price: 500 },
              { id: 'enhance_stone_low', price: 5000 }, { id: 'enhance_stone_mid', price: 50, currency: 'gem' },
              { id: 'enhance_stone_high', price: 200, currency: 'gem' },
            ],
            gem: [
              { id: 'exp_potion', price: 120, currency: 'gem' },
              { id: 'gold_pouch', price: 100, currency: 'gem' },
              { id: 'enhance_ticket', price: ENHANCE_TICKET_COST, currency: 'gem' },
              { id: 'mgem_gem', price: 150, currency: 'gem' },
              { id: 'exp_boost_scroll', price: 100, currency: 'gem' },
              { id: 'drop_boost_scroll', price: 100, currency: 'gem' },
              { id: 'mystery_chest', price: 100, currency: 'gem' },
              { id: 'revive_gem', price: 50, currency: 'gem' },
              { id: 'bag_expand', price: 100, currency: 'gem' },
            ],
            equip: [
              { id: 'w1', price: 5000 },
            ],
          };
          const tabItems = shopItems[tab] || [];
          const target = tabItems.find(x => x.id === itemId);
          if (target) {
            buyBtn.textContent = `購買 ${(target.price * qty).toLocaleString()}`;
          }
        }
      });
    });
  }

  if (page === 'bag') {
    bindBagPageEvents();
  }

  if (page === 'codex') {
    el.pageContent.querySelectorAll('[data-main-tab]').forEach(btn => {
      btn.addEventListener('click', () => { codexMainTab = btn.dataset.mainTab; el.pageContent.innerHTML = renderCodexPage(); bindPageEvents('codex'); });
    });
    el.pageContent.querySelectorAll('[data-col-sub]').forEach(btn => {
      btn.addEventListener('click', () => { codexCollectTab = btn.dataset.colSub; el.pageContent.innerHTML = renderCollectionPage(); bindPageEvents('codex'); });
    });
    el.pageContent.querySelectorAll('.codex-tab').forEach(btn => {
      btn.addEventListener('click', () => { codexTab = btn.dataset.tab; codexRarityFilter = 'all'; el.pageContent.innerHTML = renderCodexPage(); bindPageEvents('codex'); });
    });
    el.pageContent.querySelectorAll('.rarity-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => { codexRarityFilter = btn.dataset.rarity; el.pageContent.innerHTML = renderCodexPage(); bindPageEvents('codex'); });
    });
    // 裝備組合分類篩選
    el.pageContent.querySelectorAll('[data-combo-cat]').forEach(btn => {
      btn.addEventListener('click', () => { equipComboCatFilter = btn.dataset.comboCat; el.pageContent.innerHTML = renderCollectionPage(); bindPageEvents('codex'); });
    });
    // 裝備槽：點擊提交
    el.pageContent.querySelectorAll('.equip-slot[data-item-id]').forEach(slot => {
      slot.addEventListener('click', e => {
        e.stopPropagation();
        const comboId = slot.dataset.comboId;
        const itemId = slot.dataset.itemId;
        const result = submitEquipToCombo(comboId, itemId, 1);
        if (result.success) {
          if (result.comboComplete) addLog('system', `✨ 組合完成！屬性加成已生效`);
          el.pageContent.innerHTML = renderCollectionPage();
          bindPageEvents('codex');
          updateUI();
        } else {
          showFloatingText(result.reason || '無法提交', '#ff8080');
        }
      });
    });
    // 一鍵提交按鈕
    el.pageContent.querySelectorAll('[data-quick-submit]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const comboId = btn.dataset.quickSubmit;
        const result = quickSubmitCombo(comboId);
        if (result.totalSubmitted > 0) {
          if (result.completed) addLog('system', `✨ 組合完成！屬性加成已生效`);
          el.pageContent.innerHTML = renderCollectionPage();
          bindPageEvents('codex');
          updateUI();
        } else {
          showFloatingText('沒有可提交的裝備', '#ff8080');
        }
      });
    });
    // 屬性篩選
    el.pageContent.querySelectorAll('[data-stat-filter]').forEach(cb => {
      cb.addEventListener('change', () => {
        const stat = cb.dataset.statFilter;
        if (!equipComboStatFilter) equipComboStatFilter = [];
        if (cb.checked) {
          if (!equipComboStatFilter.includes(stat)) equipComboStatFilter.push(stat);
        } else {
          equipComboStatFilter = equipComboStatFilter.filter(s => s !== stat);
        }
        el.pageContent.innerHTML = renderCollectionPage();
        bindPageEvents('codex');
      });
    });
    // 清除屬性篩選
    el.pageContent.querySelectorAll('[data-stat-clear]').forEach(btn => {
      btn.addEventListener('click', () => {
        equipComboStatFilter = [];
        el.pageContent.innerHTML = renderCollectionPage();
        bindPageEvents('codex');
      });
    });
    el.pageContent.querySelectorAll('.codex-card').forEach(card => {
      card.addEventListener('click', () => {
        showCodexDetail(card.dataset.id, card.dataset.type);
      });
    });
  }

  // 合成頁面事件
  if (page === 'synth') {
    try { bindSynthEvents(); } catch(e) { console.warn('bindSynthEvents error:', e); }
  }

  // 人物面板變身Tab：補充變身卡片事件（切換分頁後重新綁定）
  if (page === 'hero') {
    try { bindTransformCardEvents(); } catch (e) { console.warn('bindTransformCardEvents error:', e); }
  }

  // 選單项（menu_ 前缀）委托给 bindMenuPageEvents
  if (page.startsWith('menu_')) {
    bindMenuPageEvents(page.substring(5));
  }
}

function bindTransformCardEvents() {
  // 品質篩選按鈕
  el.pageContent.querySelectorAll('[data-tf-filter]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      GS.transformRarity = btn.dataset.tfFilter;
      el.pageContent.innerHTML = renderHeroPage();
      bindPageEvents('hero');
    });
  });
  // 啟動變身按鈕（直接啟動，不需卷軸）
  el.pageContent.querySelectorAll('[data-use-transform-id]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const tid = btn.dataset.useTransformId;
      if (activateTransform(tid)) {
        el.pageContent.innerHTML = renderTransformPanel();
        bindTransformCardEvents();
        renderPlayer();
      }
    });
  });
  // 解除變身
  const cancelBtn = el.pageContent.querySelector('[data-cancel-transform]');
  if (cancelBtn) cancelBtn.addEventListener('click', e => {
    e.stopPropagation();
      if (GS.player.transformId) {
        const tf = TRANSFORM_POOL.find(t => t.id === GS.player.transformId);
        GS.player.transformId = null;
        GS.transformEndTime = null;
        addLog('system', `手動解除變身【${tf?.name || ''}】`);
        removeTransformBuff();
        updatePlayerSprite();
        calcCP();
        updateRankings();
        updateUI();
        renderPlayer();
        el.pageContent.innerHTML = renderTransformPanel();
        bindTransformCardEvents();
      }
  });
  // 變身卡片點擊（顯示詳情）
  el.pageContent.querySelectorAll('[data-tf-card]').forEach(card => {
    card.addEventListener('click', e => {
      const tid = card.dataset.tfCard;
      const tf = TRANSFORM_POOL.find(t => t.id === tid);
      if (!tf) return;
      const rc = RARITY_CONFIG[tf.rarity] || RARITY_CONFIG.white;
      const statText = Object.entries(tf.stats || {}).map(([k, v]) => {
        const nameMap = { atk: '攻擊', def: '防禦', hpMax: '生命', crit: '暴擊率', critDmg: '暴擊傷害', mpMax: '魔力' };
        return `${nameMap[k] || k} +${v}${k === 'crit' || k === 'critDmg' ? '%' : ''}`;
      }).join(' · ');
      const owned = !!GS.ownedTransforms.find(x => x.id === tid);
      const equipped = GS.player.transformId === tid;
      let detailHtml = `
        <div class="item-detail-modal" id="transform-detail-modal" style="position:absolute;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:200">
          <div class="item-detail-inner" style="background:linear-gradient(180deg, rgba(40,28,18,0.98), rgba(20,14,8,0.98));border:3px solid ${rc.color};border-radius:12px;padding:24px;max-width:320px;width:90%;text-align:center;box-shadow:0 0 30px ${rc.glow}">
            <div style="display:flex;justify-content:center;margin-bottom:10px"><img src="${getTransformIcon(tf.spriteKey)}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:2px solid ${rc.color}"/></div>
            <div style="font-size:16px;font-weight:700;color:${rc.color};margin-bottom:4px;text-shadow:0 1px 3px #000">${tf.name}</div>
            <div style="font-size:11px;color:${rc.color};margin-bottom:8px;font-weight:600">${rc.name} · ${tf.type}</div>
            <div style="font-size:12px;color:var(--parchment-light);margin-bottom:8px;line-height:1.8">${statText}</div>
            <div style="font-size:11px;color:var(--parchment-dark);margin-bottom:12px;font-style:italic">「${tf.desc}」</div>
            <div style="font-size:10px;color:var(--parchment-dark);margin-bottom:12px">變身持續 4 小時，時間到自動解除</div>
            <div style="display:flex;gap:8px;justify-content:center">
              ${!owned
                ? '<button class="shop-item-buy" style="width:auto;padding:6px 16px;background:linear-gradient(180deg,#555,#333);border-color:#777;opacity:0.5;cursor:not-allowed" disabled>未獲得</button>'
                : equipped
                  ? '<button class="shop-item-buy" style="width:auto;padding:6px 16px;background:linear-gradient(180deg,#555,#333);border-color:#777" id="tf-detail-cancel">解除變身</button>'
                  : '<button class="shop-item-buy" style="width:auto;padding:6px 16px" id="tf-detail-use">啟動變身</button>'
              }
              <button class="shop-item-buy" style="width:auto;padding:6px 16px;background:linear-gradient(180deg,#555,#333);border-color:#777" id="tf-detail-close">關閉</button>
            </div>
          </div>
        </div>
      `;
      const old = document.getElementById('transform-detail-modal');
      if (old) old.remove();
      const wrapper = document.createElement('div');
      wrapper.innerHTML = detailHtml;
      el.pageContent.appendChild(wrapper.firstElementChild);
      const useBtn = document.getElementById('tf-detail-use');
      if (useBtn) useBtn.onclick = () => {
        if (activateTransform(tid)) {
          document.getElementById('transform-detail-modal').remove();
          el.pageContent.innerHTML = renderTransformPanel();
          bindTransformCardEvents();
          renderPlayer();
        }
      };
      const cancelBtn2 = document.getElementById('tf-detail-cancel');
      if (cancelBtn2) cancelBtn2.onclick = () => {
        GS.player.transformId = null;
        GS.transformEndTime = null;
        addLog('system', '手動解除變身');
        removeTransformBuff();
        calcCP();
        document.getElementById('transform-detail-modal').remove();
        el.pageContent.innerHTML = renderTransformPanel();
        bindTransformCardEvents();
        renderPlayer();
        updateUI();
      };
      const closeBtn = document.getElementById('tf-detail-close');
      if (closeBtn) closeBtn.onclick = () => document.getElementById('transform-detail-modal').remove();
    });
  });
}

// 使用背包擴充卷：+1格，最多200格
function useBagExpandScroll(fromShop = false) {
  const curMax = GS.bagMaxSlots || BAG_BASE_SLOTS;
  if (curMax >= BAG_MAX_SLOTS) {
    alert('背包已達最大容量（200格）');
    return false;
  }
  if (fromShop) {
    // 商店購買：直接扣鑽石 +1
    if (GS.resources.gem < BAG_EXPAND_COST) {
      alert('鑽石不足');
      return false;
    }
    GS.resources.gem -= BAG_EXPAND_COST;
    GS.bagMaxSlots = curMax + 1;
    addLog('shop', `背包擴充 +1 格（${curMax} → ${curMax + 1}）`);
    showFloatingText('背包+1!', '#c0a0ff');
    return true;
  }
  // 從背包使用擴充卷道具
  const scroll = GS.inventory.find(i => i.id === 'bag_expand_scroll' && i.itemType === 'consumable');
  if (!scroll || scroll.count <= 0) {
    alert('背包擴充卷不足');
    return false;
  }
  scroll.count -= 1;
  if (scroll.count <= 0) {
    const idx = GS.inventory.indexOf(scroll);
    if (idx >= 0) GS.inventory.splice(idx, 1);
  }
  GS.bagMaxSlots = curMax + 1;
  addLog('system', `使用背包擴充卷，容量 +1（${curMax} → ${curMax + 1}）`);
  showFloatingText('背包+1!', '#c0a0ff');
  updateUI();
  return true;
}

function handleShopBuy(id, tab, qty = 1) {
  if (tab === 'gem') {
    if (id === 'exp_potion') {
      buyGemItem(120 * qty, () => {
        GS.player.exp += 1000 * qty;
        while (GS.player.exp >= GS.player.expMax) {
          GS.player.exp -= GS.player.expMax;
          GS.player.level++;
          GS.player.expMax = Math.floor(GS.player.expMax * 1.3);
          GS.player.hpMax += 15;
          GS.player.mpMax = Math.floor((GS.player.mpMax || 100) * 1.1);
          GS.player.atk += 2;
          GS.player.def += 1;
          GS.player.hp = GS.player.hpMax;
          GS.player.mp = GS.player.mpMax;
        }
        addLog('system', `使用經驗藥水 ×${qty}，獲得 ${1000*qty} 經驗！`);
      });
    } else if (id === 'gold_pouch') {
      buyGemItem(100 * qty, () => { GS.resources.gold += 10000 * qty; addLog('system', `獲得 ${(10000*qty).toLocaleString()} 金幣！`); });
    } else if (id === 'enhance_ticket') {
      buyEnhanceTicket(qty);
    } else if (id === 'mgem_gem') {
      buyGemItem(150 * qty, () => {
        addToInventory({ id: 'mgem', name: '魔法寶石', type: 'consumable', itemType: 'consumable', rarity: 'blue', icon: ITEM_ICONS.mgem, count: 10 * qty, effect: {} }, 10 * qty);
        addLog('shop', `購買魔法寶石 ×${10*qty}`);
      });
    } else if (id === 'exp_boost_scroll') {
      buyGemItem(100 * qty, () => {
        GS.expBoostUntil = Date.now() + 1800 * 1000 * qty;
        addLog('shop', `購買經驗加成卷軸 ×${qty}`);
      });
    } else if (id === 'drop_boost_scroll') {
      buyGemItem(100 * qty, () => {
        GS.dropBoostUntil = Date.now() + 1800 * 1000 * qty;
        addLog('shop', `購買掉寶加成卷軸 ×${qty}`);
      });
    } else if (id === 'mystery_chest') {
      buyGemItem(100 * qty, () => {
        addToInventory({ id: 'mystery_chest', name: '神秘寶箱', type: 'consumable', itemType: 'consumable', rarity: 'red', icon: ITEM_ICONS.chest, count: qty, effect: { mysteryChest: true } }, qty);
        addLog('shop', `購買神秘寶箱 ×${qty}`);
      });
    } else if (id === 'revive_gem') {
      buyGemItem(50 * qty, () => {
        addToInventory({ id: 'revive_gem', name: '復活卷軸', type: 'consumable', itemType: 'consumable', rarity: 'purple', icon: ITEM_ICONS.revive_scroll, count: qty, effect: { revive: true } }, qty);
        addLog('shop', `購買復活卷軸 ×${qty}`);
      });
    } else if (id === 'bag_expand') {
      buyGemItem(100 * qty, () => {
        const curMax = GS.bagMaxSlots || BAG_BASE_SLOTS;
        const canAdd = Math.min(qty, BAG_MAX_SLOTS - curMax);
        if (canAdd <= 0) { alert('背包已達最大容量'); return; }
        GS.bagMaxSlots = curMax + canAdd;
        addLog('shop', `購買背包擴充卷 ×${canAdd}，容量 ${curMax} → ${curMax + canAdd}`);
        showFloatingText(`背包+${canAdd}!`, '#c0a0ff');
      });
    }
  } else if (tab === 'consumable') {
    const itemDefs = {
      hp1:  { id: 'hp1',   name: '小型生命藥水', rarity: 'white', price: 50,   effect: { hp: 50 } },
      hp2:  { id: 'hp2',   name: '中型生命藥水', rarity: 'green', price: 200,  effect: { hp: 200 } },
      mp1:  { id: 'mp1',   name: '小型魔力藥水', rarity: 'white', price: 75,   effect: { mp: 30 } },
      mp2:  { id: 'mp2',   name: '中型魔力藥水', rarity: 'green', price: 250,  effect: { mp: 100 } },
      spd1: { id: 'spd1',  name: '加速藥水',     rarity: 'blue',  price: 400,  effect: { atkSpeed: 20, moveSpeed: 20, duration: 1800 } },
      spd2: { id: 'spd2',  name: '狂暴藥水',     rarity: 'red',   price: 800,  effect: { atkSpeed: 30, moveSpeed: 30, duration: 1800 } },
      move1:{ id: 'move1', name: '行走加速藥水',     rarity: 'green', price: 200,  effect: { moveSpeed: 20, duration: 120 } },
      mgem: { id: 'mgem',  name: '魔法寶石',     rarity: 'blue',  price: 1000, effect: {} },
    };
    const def = itemDefs[id];
    if (!def) return;
    const totalPrice = def.price * qty;
    if (GS.resources.gold < totalPrice) { alert('金幣不足'); return; }
    GS.resources.gold -= totalPrice;
    collectTax(totalPrice, 0);
    const itemIcon = {
      hp1: ITEM_ICONS.hp1, hp2: ITEM_ICONS.hp2 || ITEM_ICONS.hp1,
      mp1: ITEM_ICONS.mp1, mp2: ITEM_ICONS.mp2 || ITEM_ICONS.mp1,
      spd1: ITEM_ICONS.spd1, spd2: ITEM_ICONS.spd2, move1: ITEM_ICONS.move1,
      mgem: ITEM_ICONS.mgem, tscroll: ITEM_ICONS.tscroll,
    }[id] || ITEM_ICONS.hp1;
    addToInventory({
      id: def.id, name: def.name, type: 'consumable', itemType: 'consumable',
      rarity: def.rarity, icon: itemIcon, count: qty, effect: def.effect || {},
    }, qty);
    // 自動放入快捷欄空槽（如果尚未裝備過同類道具）
    const alreadyOnBar = GS.quickBar.some(s => s && s.type === 'item' && s.itemId === def.id);
    if (!alreadyOnBar) {
      const emptyIdx = GS.quickBar.findIndex(s => s == null);
      if (emptyIdx >= 0) {
        setQuickBarSlot(emptyIdx, { type: 'item', itemId: def.id });
      }
    }
    addLog('shop', `購買了【${def.name}】 ×${qty}`);
  } else if (tab === 'equip') {
    addLog('system', '裝備購買成功！');
  }
  updateUI();
}

function buyGemItem(cost, onBuy) {
  if (GS.resources.gem < cost) { alert('鑽石不足！'); return; }
  GS.resources.gem -= cost;
  onBuy();
  updateUI();
}

// ==================== 侧边選單 ====================
function openSideMenu() {
  el.sideMenu.classList.add('open');
  el.sideMenuOverlay.classList.add('open');
}
function closeSideMenu() {
  el.sideMenu.classList.remove('open');
  el.sideMenuOverlay.classList.remove('open');
}

function openMenuPage(page) {
  closeSideMenu();
  openSidePage('menu_' + page);
  el.pageTitle.textContent = getMenuPageTitle(page);
  if (page === 'ranking') updateRankings();
  el.pageContent.innerHTML = renderMenuPage(page);
  bindMenuPageEvents(page);
}

function getMenuPageTitle(page) {
  return { nation: '國家', class: '職業', ranking: '排行榜', guild: '軍團' }[page] || page;
}

function renderMenuPage(page) {
  switch(page) {
    case 'nation': return renderNationPageEnhanced();
    case 'guild': return renderGuildPageEnhanced();
    case 'class': return renderClassSelectPage();
    case 'ranking': return renderRankingPage();
    default: return '';
  }
}

function renderNationPage() {
  const myNation = NATIONS.find(n => n.id === GS.nation);
  return `
    <div class="nation-banner" style="${myNation ? '' : 'background:linear-gradient(135deg, rgba(60,42,26,0.9), rgba(30,20,12,0.9));border-color:var(--gold-dark)'}">
      <div class="nation-name">${myNation ? myNation.name : '未加入國家'}</div>
      <div class="nation-title">${myNation ? myNation.desc : '選擇一個國家加入'}</div>
    </div>
    <div class="bag-section-title">國家列表</div>
    <div class="guild-list">
      ${NATIONS.map(n => `
        <div class="guild-card" data-nation="${n.id}">
          <div class="guild-card-icon">${n.flag}</div>
          <div class="guild-card-info">
            <div class="guild-card-name">${n.name}</div>
            <div class="guild-card-desc">${n.desc}</div>
          </div>
          <button class="castle-card-btn" style="${GS.nation === n.id ? 'background:gray;border-color:gray' : ''}">
            ${GS.nation === n.id ? '已加入' : '加入'}
          </button>
        </div>
      `).join('')}
    </div>
  `;
}

function renderGuildPage() {
  const hasGuild = !!GS.guild;
  const fakeMembers = [
    { name: '赤焰骑士', role: '會長' },
    { name: '暗夜刺客', role: '副會長' },
    { name: '聖光使者', role: '成員' },
    { name: '元素法师', role: '成員' },
    { name: '疾风弓手', role: '成員' },
  ];
  return `
    <div class="nation-banner" style="${hasGuild ? '' : 'background:linear-gradient(135deg, rgba(60,42,26,0.9), rgba(30,20,12,0.9));border-color:var(--gold-dark)'}">
      <div class="nation-name">${hasGuild ? GS.guild.name : '尚未加入公會'}</div>
      <div class="nation-title">${hasGuild ? `等級 ${GS.guild.level} · 成員 ${GS.guild.members}人` : '創建或加入一個公會'}</div>
    </div>
    ${hasGuild ? `
      <div class="bag-section-title">公会成員</div>
      <div class="member-list">
        ${fakeMembers.map(m => `
          <div class="member-item">
            <span class="member-name">${m.name}</span>
            <span class="member-role">${m.role}</span>
          </div>
        `).join('')}
      </div>
      <div class="bag-section-title" style="margin-top:12px">公会技能</div>
      <div class="stats-grid">
        <div class="stat-item"><span class="stat-label">攻擊加成</span><span class="stat-value">+10%</span></div>
        <div class="stat-item"><span class="stat-label">生命加成</span><span class="stat-value">+10%</span></div>
        <div class="stat-item"><span class="stat-label">經驗加成</span><span class="stat-value">+15%</span></div>
        <div class="stat-item"><span class="stat-label">金幣加成</span><span class="stat-value">+10%</span></div>
      </div>
    ` : `
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
        <button class="castle-card-btn" style="width:100%;padding:8px;font-size:12px" id="create-guild-btn">創建公会 (1,000鑽石)</button>
        <div style="font-size:11px;color:var(--parchment-dark);text-align:center">或在「國家」页面加入</div>
      </div>
    `}
  `;
}

function renderCastlePage() {
  const myGuild = GS.guild;
  const isLeader = myGuild && myGuild.role === 'leader';

  return `
    <div style="text-align:center;padding:12px;border-bottom:1px solid var(--gold-dark);margin-bottom:10px">
      <div style="font-size:22px;margin-bottom:4px">🏰</div>
      <div class="nation-name">城堡列表</div>
      <div style="font-size:10px;color:var(--parchment-dark);margin-top:2px">
        ${isLeader ? '👑 你是會長，可對无主或敌國城堡宣戰' : '占领城堡的公會會長可收取區域税收'}
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;padding:4px 2px">
      ${CASTLES.map(c => {
        const nation = NATIONS.find(n => n.id === c.nation);
        // 正確判斷佔領狀態：
        // - 玩家有公会 且 城堡所屬公会 = 玩家公会 → 我方
        // - 有其他擁有者 → 敵方/其他公会
        // - 無擁有者 → 無主
        const myGuildId = GS.guild ? (GS.guild.id || 'player_guild') : null;
        const isMine = !!(myGuildId && c.ownerGuildId === myGuildId);
        const hasOwner = !!(c.owner || c.ownerGuildId);
        const isAIOwned = hasOwner && !isMine;
        const now = Date.now();
        const onCool = GS.warCooldowns?.[c.id] && GS.warCooldowns[c.id] > now;
        const remain = onCool ? Math.ceil((GS.warCooldowns[c.id] - now) / 1000) : 0;
        const isWarDeclared = GS.warDeclared?.castleId === c.id;
        return `
          <div class="castle-card" style="padding:12px;border:2px solid var(--gold-dark);border-radius:8px;background:linear-gradient(180deg, rgba(40,28,16,0.85), rgba(20,14,8,0.9))">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
              <div>
                <div style="font-weight:700;color:var(--gold-bright);font-size:14px">${c.name}</div>
                <div style="font-size:10px;color:var(--parchment-dark);margin-top:2px">
                  ${nation ? nation.flag + ' ' + nation.name : ''} · Lv.${c.level} · 税率 ${c.taxRate}%
                </div>
              </div>
              <div style="text-align:right">
                <div style="font-size:10px;color:${isMine ? '#80ff90' : (isAIOwned ? '#ff8080' : '#f0c040')};font-weight:600">
                  ${isMine ? '🏰 我方占领' : (isAIOwned ? '⚔ 敌方占领' : '🆓 无主之地')}
                </div>
                <div style="font-size:9px;color:var(--parchment-dark);margin-top:1px">${c.ownerName}</div>
              </div>
            </div>
            <div style="height:4px;background:rgba(0,0,0,0.4);border-radius:2px;margin-bottom:6px;overflow:hidden">
              <div style="height:100%;width:${(c.hp / c.hpMax) * 100}%;background:linear-gradient(90deg,#ff6060,#f0c040);border-radius:2px"></div>
            </div>
            <div style="font-size:10px;color:var(--parchment-dark);margin-bottom:8px">
              城防：${c.hp.toLocaleString()} / ${c.hpMax.toLocaleString()} · 守军 ${c.defenders} 人
            </div>
            ${isMine ? `
              <button class="castle-card-btn" data-siege="${c.id}" data-action="collect" style="width:100%;padding:6px;font-size:11px">
                💰 领取税收（${GS.castleTreasuries?.[c.id] || 0} 金幣）
              </button>
            ` : `
              <button class="castle-card-btn ${onCool || !isLeader || isWarDeclared ? '' : 'declare-war-btn'}" 
                      data-siege="${c.id}" data-action="declare"
                      style="width:100%;padding:6px;font-size:11px;${onCool || !isLeader || isWarDeclared ? 'opacity:0.5;cursor:default' : ''}"
                      ${onCool || !isLeader || isWarDeclared ? 'disabled' : ''}>
                ${isWarDeclared ? '⚔ 已宣戰' : (onCool ? `冷卻中 ${formatTime(remain)}` : (isLeader ? '⚔ 宣戰攻城' : '仅會長可宣戰'))}
              </button>
            `}
          </div>
        `;
      }).join('')}
    </div>
    <div style="margin-top:14px;font-size:11px;color:var(--parchment);line-height:1.6;padding:10px;border:1px solid rgba(240,192,64,0.2);border-radius:6px;background:rgba(0,0,0,0.2)">
      <div style="color:var(--gold-bright);font-weight:700;margin-bottom:4px">💡 攻城战规则</div>
      • 公会会长可对无主或敌方城堡宣戰<br>
      • 宣戰后传送至攻城战场，限时 20 分鐘<br>
      • 击破城门 → 消灭守军 → 击败城主即占领成功<br>
      • 守城方在時間内守住则防守成功<br>
      • 占领后会长成为城主，收取区域税收<br>
      • 同一國家内，擁有最多城堡的公会会长成为国王
    </div>
  `;
}

function renderClassSelectPage() {
  return `
    <div class="bag-section-title">選擇职业</div>
    <div class="class-grid" id="class-select-grid-page">
      ${Object.values(CLASSES).map(cls => `
        <div class="class-card ${GS.player.classId === cls.id ? 'current' : ''}" data-class="${cls.id}"
             style="${GS.player.classId === cls.id ? 'border-color:var(--gold-bright);box-shadow:0 0 12px rgba(240,192,64,0.5)' : ''}">
          <div class="class-sprite">${spriteEmojiHTML(cls.sprite, 48)}</div>
          <div class="class-name">${cls.name}</div>
          <div class="class-desc">${cls.desc}</div>
        </div>
      `).join('')}
    </div>
    <div style="margin-top:12px;font-size:11px;color:var(--parchment-dark);text-align:center">
      当前职业：<span style="color:var(--gold-bright);font-weight:700">${CLASSES[GS.player.classId].name}</span>
    </div>
  `;
}


function bindMenuPageEvents(page) {
  if (page === 'nation') {
    // Tab 切换
    el.pageContent.querySelectorAll('[data-nation-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        GS.nationTab = btn.dataset.nationTab;
        el.pageContent.innerHTML = renderMenuPage('nation');
        bindMenuPageEvents('nation');
      });
    });

    // 功能入口網格按鈕
    el.pageContent.querySelectorAll('[data-nation-entry]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.nationEntry;
        const tabMap = { members:'members', nobility:'nobility', legion:'legion', castles:'castles', war:'war', treasury:'treasury', skills:'skills' };
        if (tabMap[key]) {
          GS.nationTab = tabMap[key];
          el.pageContent.innerHTML = renderMenuPage('nation');
          bindMenuPageEvents('nation');
        } else if (key === 'castle') {
          GS.nationTab = 'castles';
          el.pageContent.innerHTML = renderMenuPage('nation');
          bindMenuPageEvents('nation');
        } else if (key === 'war') {
          GS.nationTab = 'castles';
          el.pageContent.innerHTML = renderMenuPage('nation');
          bindMenuPageEvents('nation');
        } else if (key === 'donate') {
          GS.nationTab = 'treasury';
          el.pageContent.innerHTML = renderMenuPage('nation');
          bindMenuPageEvents('nation');
        }
      });
    });

    // 成員子分頁切換
    el.pageContent.querySelectorAll('[data-members-sub]').forEach(btn => {
      btn.addEventListener('click', () => {
        GS.membersSubTab = btn.dataset.membersSub;
        el.pageContent.innerHTML = renderMenuPage('nation');
        bindMenuPageEvents('nation');
      });
    });

    // 加入國家按钮（未加入时）
    el.pageContent.querySelectorAll('.join-nation-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const nid = btn.dataset.nation;
        if (!nid) return;
        GS.nation = nid;
        GS.nationContribution = GS.nationContribution || 0;
        GS.nationSkillLevels = GS.nationSkillLevels || {};
        const n = NATIONS.find(nn => nn.id === nid);
        addLog('system', `加入了 ${n.name}`);
        updatePlayerBadge();
        el.pageContent.innerHTML = renderMenuPage('nation');
        bindMenuPageEvents('nation');
      });
    });

    // 退出國家按钮
    const leaveBtn = el.pageContent.querySelector('.leave-nation-btn');
    if (leaveBtn) leaveBtn.addEventListener('click', () => {
      if (!confirm('确定要退出當前國家吗？所有貢獻值与技能树加點將清空！')) return;
      GS.nation = null;
      GS.legionId = null;
      GS.nationContribution = 0;
      GS.nationSkillLevels = {};
      // 清除公民缓存
      window._nationCitizens = null;
      addLog('system', '已退出國家');
      updatePlayerBadge();
      updateUI();
      el.pageContent.innerHTML = renderMenuPage('nation');
      bindMenuPageEvents('nation');
    });

    // 申请加入軍團
    el.pageContent.querySelectorAll('.join-legion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const lid = btn.dataset.legion;
        if (!lid) return;
        if (GS.legionId) { alert('你已在軍團中'); return; }
        const legion = AI_GUILDS.find(g => g.id === lid);
        if (!legion) return;
        GS.legionId = lid;
        // 同步 GS.guild 數據（用於攻城戰判斷、職位顯示）
        // 玩家加入軍團後自動成為軍團長（替換 AI 軍團長），保證玩家有宣戰/管理等權限
        const wasAIGuild = !legion.hasPlayerJoined;
        legion.leader = GS.player.name;
        legion.hasPlayerJoined = true;
        legion.isPlayerLeader = true;
        GS.guild = {
          id: legion.id,
          name: legion.name,
          level: legion.level,
          role: 'leader',
          nation: legion.nation,
          castles: legion.castle ? [legion.castle] : [],
          funds: legion.funds || 0,
          myContribution: 0,
          skillLevels: { ...(legion.skillLevels || {}) },
          isAIGuild: true,
          leader: legion.leader,
          hasHumanLeader: !!legion.hasPlayerJoined,
        };
        GS.guildId = legion.id;
        if (wasAIGuild) {
          addLog('system', `加入了軍團【${legion.name}】，你成為了軍團長！`);
        } else {
          addLog('system', `加入了軍團：${legion.name}，你是軍團長`);
        }
        el.pageContent.innerHTML = renderMenuPage('nation');
        bindMenuPageEvents('nation');
      });
    });

    // 創建軍團
    const createLegionBtn = el.pageContent.querySelector('.create-legion-btn');
    if (createLegionBtn) createLegionBtn.addEventListener('click', () => {
      if (!GS.nation) { alert('請先加入國家'); return; }
      if (GS.legionId) { alert('你已在軍團中，請先退出再創建'); return; }
      if (GS.resources.gem < 10000) { alert('鑽石不足，創建軍團需要 10,000 鑽石'); return; }
      const name = prompt('输入軍團名称（2-10字）：', '我的軍團');
      if (!name || !name.trim()) return;
      if (!confirm(`確定花費 10,000 鑽石創建軍團「${name.trim()}」？`)) return;
      GS.resources.gem -= 10000;
      GS.legionId = 'player_legion_' + Date.now();
      GS.guildId = GS.legionId;
      GS.guild = {
        id: GS.legionId,
        name: name.trim(),
        level: 1,
        role: 'leader',
        nation: GS.nation,
        castles: [],
        funds: 10000,
        myContribution: 0,
        todayDonatedGold: 0,
        todayDonatedGem: 0,
        skillLevels: {},
        weeklyKills: 0,
        notice: '團结一心，共圖霸业！',
        isAIGuild: false,
        isPlayerGuild: true,
        leader: GS.player.name,
      };
      // 加入AI公会列表
      AI_GUILDS.push({
        id: GS.legionId,
        name: name.trim(),
        nation: GS.nation,
        leader: GS.player.name,
        level: 1,
        members: 1,
        castle: null,
        funds: 10000,
        notice: '團结一心，共圖霸业！',
        skillLevels: {},
        isPlayerLegion: true,
      });
      addLog('system', `🏰 創建了軍團：${name.trim()}`);
      updateUI();
      el.pageContent.innerHTML = renderMenuPage('nation');
      bindMenuPageEvents('nation');
    });

    // 退出軍團
    const leaveLegionBtn = el.pageContent.querySelector('.leave-legion-btn');
    if (leaveLegionBtn) leaveLegionBtn.addEventListener('click', () => {
      if (!confirm('确定要退出軍團吗？')) return;
      GS.legionId = null;
      GS.guildId = null;
      GS.guild = null;
      addLog('system', '已退出軍團');
      el.pageContent.innerHTML = renderMenuPage('nation');
      bindMenuPageEvents('nation');
    });

    // 城堡Tab：宣戰按鈕（簡化版）
    el.pageContent.querySelectorAll('[data-castle-action="declare"]').forEach(btn => {
      btn.addEventListener('click', () => {
        console.log('[Siege] 宣战按钮被点击');
        const cid = btn.dataset.castleId;
        if (!cid) return;
        const castle = CASTLES.find(c => c.id === cid);
        if (!castle) return;
        console.log('[Siege] 目标城堡:', castle);
        const myNation = NATIONS.find(n => n.id === GS.nation);
        const kingName = myNation ? getNationKingInfo(myNation.id)?.name : null;
        const isKing = kingName === GS.player.name;
        const myLegion = (GS.legionId || GS.guildId) ? AI_GUILDS.find(g => g.id === (GS.legionId || GS.guildId)) : null;
        const isLeader = myLegion && GS.guild && GS.guild.role === 'leader';
        console.log('[Siege] 权限检查: nation=', GS.nation, 'legionId=', GS.legionId, 'guild=', GS.guild, 'isKing=', isKing, 'isLeader=', isLeader);

        // 權限檢查
        if (!isKing && !isLeader) {
          console.log('[Siege] 权限不足');
          alert('僅國王與軍團長可宣戰\n\n提示：加入軍團後自動成為軍團長');
          return;
        }
        if (castle.ownerGuildId === (GS.legionId || GS.guildId)) { alert('不能攻擊己方城堡！'); return; }

        // 每日次數檢查
        const today = new Date().toDateString();
        if (GS.siegeWarDate !== today) {
          GS.siegeWarDate = today;
          GS.siegeWarDeclareCount = 0;
        }
        const dailyLimit = isKing ? 2 : 1;
        const remain = Math.max(0, dailyLimit - (GS.siegeWarDeclareCount || 0));
        console.log('[Siege] 次数检查: today=' + today + ' count=' + GS.siegeWarDeclareCount + ' remain=' + remain + ' dailyLimit=' + dailyLimit);
        if (remain <= 0) { alert(`今日宣戰次數已用完（${isKing ? '國王每天2次' : '軍團長每天1次'}）`); return; }

        // 已有活躍攻城戰則提示
        const now = Date.now();
        if (GS.siegeWar && GS.siegeWar.status === 'active' && GS.siegeWar.endTime > now) {
          if (!confirm(`已有對【${CASTLES.find(c => c.id === GS.siegeWar.castleId)?.name}】的攻城戰正在進行，取消並改為對【${castle.name}】宣戰？`)) return;
        } else {
          if (!confirm(`確認對【${castle.name}】宣戰？\n宣戰後持續 20 分鐘，擊破城門→摧毀守護塔→拾取權杖取勝。`)) return;
        }

        // 設置新的攻城戰狀態
        GS.siegeWar = {
          castleId: cid,
          attackerGuild: GS.guild?.name || '玩家軍團',
          startTime: now,
          endTime: now + 20 * 60 * 1000,
          status: 'active',
          phase: 'gate',
        };
        GS.siegeWarDeclareCount = (GS.siegeWarDeclareCount || 0) + 1;

        console.log('[Siege] 宣战成功！siegeWar=', GS.siegeWar, '剩余次数:', dailyLimit - GS.siegeWarDeclareCount);
        addLog('system', `⚔ 宣戰成功！前往【${castle.name}】攻城戰場，20分鐘內佔領取勝！`);
        addLog('siege', `⚔️ 宣戰成功！目標：${castle.name}`);
        showFloatingText('宣戰成功！', '#ff8040');
        el.pageContent.innerHTML = renderMenuPage('nation');
        bindMenuPageEvents('nation');
      });
    });

    // 城堡Tab：领取税收
    el.pageContent.querySelectorAll('[data-castle-action="collect"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cid = btn.dataset.castleId;
        if (!cid) return;
        const amount = GS.castleTreasuries?.[cid] || 0;
        if (amount <= 0) { alert('暂无可领取的税收'); return; }
        GS.resources.gold += amount;
        GS.castleTreasuries[cid] = 0;
        addLog('system', `💰 领取城堡税收 ${amount.toLocaleString()} 金幣`);
        updateUI();
        el.pageContent.innerHTML = renderMenuPage('nation');
        bindMenuPageEvents('nation');
      });
    });

    // 城堡Tab：进入攻城战场
    el.pageContent.querySelectorAll('[data-castle-action="enter-siege"]').forEach(btn => {
      btn.addEventListener('click', () => {
        console.log('[Siege] 点击进入攻城战场按钮');
        const cid = btn.dataset.castleId;
        if (!cid) return;
        const siegeMapId = 'siege_' + cid;
        const allMaps = getAllMaps();
        console.log('[Siege] 加载地图:', siegeMapId, '存在:', !!allMaps[siegeMapId]);
        if (!allMaps[siegeMapId]) { alert('找不到該城堡的攻城戰場'); return; }
        closeMapModal?.();
        // 關閉菜單並進入地圖
        const sidePage = document.getElementById('side-page');
        if (sidePage) sidePage.classList.remove('open');
        loadMap(siegeMapId);
      });
    });

    // 捐献
    el.pageContent.querySelectorAll('.donate-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const data = btn.dataset.donate; // 'gold:1000:10'
        if (!data) return;
        const [type, amountStr, contribStr] = data.split(':');
        const amount = parseInt(amountStr);
        const contrib = parseInt(contribStr);
        if (type === 'gold') {
          if (GS.resources.gold < amount) { alert('金幣不足'); return; }
          GS.resources.gold -= amount;
          GS.todayDonatedGold = (GS.todayDonatedGold || 0) + amount;
        } else {
          if (GS.resources.gem < amount) { alert('鑽石不足'); return; }
          GS.resources.gem -= amount;
          GS.todayDonatedGem = (GS.todayDonatedGem || 0) + amount;
        }
        GS.nationContribution = (GS.nationContribution || 0) + contrib;
        // 同步到公民列表（玩家貢獻值更新）
        if (window._nationCitizens && GS.nation) {
          const list = window._nationCitizens[GS.nation];
          if (list) {
            const me = list.find(c => c.isPlayer);
            if (me) {
              me.contribution = GS.nationContribution;
              me.power = Math.floor(me.level * 100 + me.contribution * 0.5);
            }
          }
        }
        addLog('system', `捐献 ${amount} ${type === 'gold' ? '金幣' : '鑽石'}，獲得 ${contrib} 貢獻值`);
        updateUI();
        el.pageContent.innerHTML = renderMenuPage('nation');
        bindMenuPageEvents('nation');
      });
    });

    // 技能树加点
    el.pageContent.querySelectorAll('[data-skill-up]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sid = btn.dataset.skillUp;
        const skill = NATION_SKILL_TREE.find(s => s.id === sid);
        if (!skill) return;
        const levels = GS.nationSkillLevels || {};
        const curLv = levels[sid] || 0;
        if (curLv >= skill.maxLevel) { alert('已满級'); return; }
        const cost = Math.floor(skill.costBase * Math.pow(skill.costGrow, curLv));
        if ((GS.nationContribution || 0) < cost) { alert(`貢獻值不足，需要 ${cost} 貢獻值`); return; }
        GS.nationContribution -= cost;
        levels[sid] = curLv + 1;
        GS.nationSkillLevels = levels;
        addLog('system', `✨ 國家技能【${skill.name}】升級到 Lv.${curLv + 1}！`);
        updateUI();
        el.pageContent.innerHTML = renderMenuPage('nation');
        bindMenuPageEvents('nation');
      });
    });
  }
  if (page === 'guild') {
    // Tab 切換
    el.pageContent.querySelectorAll('[data-guild-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        GS.guildTab = tab.dataset.guildTab;
        el.pageContent.innerHTML = renderMenuPage('guild');
        bindMenuPageEvents('guild');
      });
    });

    // ===== 未加入公会：創建公会按鈕 =====
    const createBtn = el.pageContent.querySelector('#guild-create-btn');
    if (createBtn) createBtn.addEventListener('click', () => {
      if (!GS.nation) { alert('請先加入國家'); return; }
      if (GS.resources.gem < 1000) { alert('鑽石不足，創建公會需要 1,000 鑽石'); return; }
      const name = prompt('輸入公會名稱（2-10字）：', '我的公會');
      if (!name || !name.trim()) return;
      const err = validateGuildName(name);
      if (err) { alert(err); return; }
      if (!confirm(`確定花費 1,000 鑽石創建公會「${name.trim()}」？\n創建後你將自動成為會長。`)) return;
      GS.resources.gem -= 1000;
      GS.guild = {
        id: 'player_guild_' + Date.now(),
        name: name.trim(),
        level: 1,
        role: 'leader',
        nation: GS.nation,
        castles: [],
        funds: 10000,
        myContribution: 10,
        todayDonatedGold: 0,
        todayDonatedGem: 0,
        skillLevels: {},
        weeklyKills: 0,
        notice: '團結一致，共創輝煌！',
        applications: [],
        isPlayerGuild: true,
        leader: GS.player.name,
        membersData: [
          { name: GS.player.name, role: '會長', level: GS.player.level, online: true, contribution: 10, classId: GS.player.classId },
        ],
      };
      GS.guildId = GS.guild.id;
      // 隨機 1/3 無公会的AI加入玩家創建的公会
      const guildlessAI = GLOBAL_AI_POOL.filter(ai => !ai.guildId && ai.level >= 10);
      const joinCount = Math.max(2, Math.floor(guildlessAI.length / 3));
      const shuffled = [...guildlessAI].sort(() => Math.random() - 0.5);
      const newMembers = shuffled.slice(0, Math.min(joinCount, 30));
      newMembers.forEach(ai => {
        ai.guildId = GS.guild.id;
        GS.guild.membersData.push({
          name: ai.name,
          role: '團員',
          level: ai.level,
          online: ai.state !== 'dead',
          contribution: Math.floor(ai.level * 3),
          classId: ai.classId,
          isAI: true,
        });
      });
      addLog('system', `🏰 創建了公會：${name.trim()}（${newMembers.length} 名AI慕名加入）`);
      updateUI();
      updatePlayerBadge();
      el.pageContent.innerHTML = renderMenuPage('guild');
      bindMenuPageEvents('guild');
    });

    // ===== 未加入公会：申請加入AI公会 =====
    el.pageContent.querySelectorAll('[data-guild-apply]').forEach(btn => {
      btn.addEventListener('click', () => {
        const gid = btn.dataset.guildApply;
        const g = AI_GUILDS.find(gg => gg.id === gid);
        if (!g) return;
        // AI公会自動審核：立即通過
        if (!confirm(`申請加入【${g.name}】，AI會長將自動審核，確定申請？`)) return;
        const ok = joinAIGuild(gid);
        if (ok) {
          addLog('system', `✅ 已加入公會：${g.name}`);
          updateUI();
          updatePlayerBadge();
          el.pageContent.innerHTML = renderMenuPage('guild');
          bindMenuPageEvents('guild');
        }
      });
    });

    // ===== 已加入公会：捐獻按鈕 =====
    el.pageContent.querySelectorAll('.guild-donate-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!GS.guild) return;
        const type = btn.dataset.donateType;
        const amount = Number(btn.dataset.amount) || 0;
        if (!amount) return;
        const g = GS.guild;
        const dailyGoldLimit = 10000;
        const dailyGemLimit = 50;
        if (type === 'gold') {
          if ((g.todayDonatedGold || 0) + amount > dailyGoldLimit) { alert('今日金幣捐獻已達上限'); return; }
          if (GS.resources.gold < amount) { alert('金幣不足'); return; }
          const contribGain = Math.floor(amount / 1000);
          if (contribGain <= 0) { alert('捐獻額度過小'); return; }
          GS.resources.gold -= amount;
          g.todayDonatedGold = (g.todayDonatedGold || 0) + amount;
          g.funds = (g.funds || 0) + amount;
          g.myContribution = (g.myContribution || 0) + contribGain;
          addLog('system', `💰 捐獻 ${amount.toLocaleString()} 金幣，獲得 ${contribGain} 貢獻值`);
        } else {
          if ((g.todayDonatedGem || 0) + amount > dailyGemLimit) { alert('今日鑽石捐獻已達上限'); return; }
          if (GS.resources.gem < amount) { alert('鑽石不足'); return; }
          const contribGain = amount * 5;
          GS.resources.gem -= amount;
          g.todayDonatedGem = (g.todayDonatedGem || 0) + amount;
          g.funds = (g.funds || 0) + amount * 100;
          g.myContribution = (g.myContribution || 0) + contribGain;
          addLog('system', `💎 捐獻 ${amount} 鑽石，獲得 ${contribGain} 貢獻值`);
        }
        updateUI();
        el.pageContent.innerHTML = renderMenuPage('guild');
        bindMenuPageEvents('guild');
      });
    });

    // ===== 已加入公会：技能樹加點 =====
    el.pageContent.querySelectorAll('.guild-skill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!GS.guild) return;
        const sid = btn.dataset.skillId;
        if (!sid) return;
        const skillDefs = [
          { id: 'atk',   name: '攻擊強化', max: 10, reqLevel: 1, baseCost: 50 },
          { id: 'def',   name: '防禦強化', max: 10, reqLevel: 1, baseCost: 50 },
          { id: 'hp',    name: '生命強化', max: 10, reqLevel: 2, baseCost: 80 },
          { id: 'crit',  name: '暴擊強化', max: 5,  reqLevel: 3, baseCost: 100 },
          { id: 'cdmg',  name: '暴傷強化', max: 10, reqLevel: 4, baseCost: 120 },
          { id: 'exp',   name: '經驗加成', max: 5,  reqLevel: 2, baseCost: 150 },
          { id: 'drop',  name: '掉寶加成', max: 5,  reqLevel: 5, baseCost: 200 },
        ];
        const def = skillDefs.find(s => s.id === sid);
        if (!def) return;
        const levels = GS.guild.skillLevels || {};
        const curLv = levels[sid] || 0;
        if (curLv >= def.max) { alert('已滿級'); return; }
        if ((GS.guild.level || 1) < def.reqLevel) { alert(`需要公會等級 Lv.${def.reqLevel}`); return; }
        const cost = def.baseCost * (curLv + 1);
        if ((GS.guild.myContribution || 0) < cost) { alert(`貢獻值不足，需要 ${cost} 貢獻值`); return; }
        if (!confirm(`花費 ${cost} 貢獻值升級【${def.name}】至 Lv.${curLv + 1}？`)) return;
        GS.guild.myContribution -= cost;
        levels[sid] = curLv + 1;
        GS.guild.skillLevels = levels;
        // 同步到AI公会數據（如果是AI公会）
        if (GS.guild.isAIGuild) {
          const ag = AI_GUILDS.find(x => x.id === GS.guild.id);
          if (ag) ag.skillLevels = { ...levels };
        }
        addLog('system', `✨ 公會技能【${def.name}】升級到 Lv.${curLv + 1}！`);
        updateUI();
        el.pageContent.innerHTML = renderMenuPage('guild');
        bindMenuPageEvents('guild');
      });
    });

    // ===== 会长：升級公会 =====
    const levelupBtn = el.pageContent.querySelector('#guild-levelup-btn');
    if (levelupBtn) levelupBtn.addEventListener('click', () => {
      if (!GS.guild || GS.guild.role !== 'leader') return;
      const g = GS.guild;
      const cost = (g.level || 1) * 5000;
      if ((g.funds || 0) < cost) { alert(`公會資金不足，升級需要 ${cost.toLocaleString()} 金幣資金`); return; }
      if (!confirm(`確定花費 ${cost.toLocaleString()} 金幣資金將公會升級到 Lv.${(g.level || 1) + 1}？`)) return;
      g.funds -= cost;
      g.level = (g.level || 1) + 1;
      // 同步AI公会
      if (g.isAIGuild) {
        const ag = AI_GUILDS.find(x => x.id === g.id);
        if (ag) { ag.level = g.level; ag.funds = g.funds; }
      }
      addLog('system', `⬆️ 公會升級到 Lv.${g.level}！解鎖更多技能樹節點。`);
      updateUI();
      el.pageContent.innerHTML = renderMenuPage('guild');
      bindMenuPageEvents('guild');
    });

    // ===== 会长：轉讓会长 =====
    const transferBtn = el.pageContent.querySelector('#guild-transfer-btn');
    if (transferBtn) transferBtn.addEventListener('click', () => {
      if (!GS.guild || GS.guild.role !== 'leader') return;
      const members = getGuildMembers(GS.guild.id).filter(m => m.name !== GS.player.name);
      if (members.length === 0) { alert('沒有其他成員可以轉讓會長'); return; }
      const names = members.map(m => m.name).join('、');
      const target = prompt(`請輸入要轉讓的成員名稱：\n當前成員：${names}`, members[0].name);
      if (!target) return;
      const m = members.find(x => x.name === target.trim());
      if (!m) { alert('未找到該成員'); return; }
      if (!confirm(`確定將會長之位轉讓給「${m.name}」？轉讓後你將變為成員。`)) return;
      GS.guild.role = 'member';
      GS.guild.leader = m.name;
      // 同步玩家公会成員數據
      if (GS.guild.isPlayerGuild && GS.guild.membersData) {
        GS.guild.membersData = GS.guild.membersData.map(x => {
          if (x.name === GS.player.name) return { ...x, role: '成員' };
          if (x.name === m.name) return { ...x, role: '會長' };
          return x;
        });
      }
      // 同步AI公会
      if (GS.guild.isAIGuild) {
        const ag = AI_GUILDS.find(x => x.id === GS.guild.id);
        if (ag) ag.leader = m.name;
      }
      addLog('system', `👑 會長之位已轉讓給 ${m.name}`);
      updatePlayerBadge();
      el.pageContent.innerHTML = renderMenuPage('guild');
      bindMenuPageEvents('guild');
    });

    // ===== 編輯公告 =====
    const noticeEditBtn = el.pageContent.querySelector('#guild-notice-edit');
    if (noticeEditBtn) noticeEditBtn.addEventListener('click', () => {
      if (!GS.guild || GS.guild.role !== 'leader') return;
      const newNotice = prompt('輸入新的公會公告：', GS.guild.notice || '');
      if (newNotice === null) return;
      GS.guild.notice = newNotice.trim();
      if (GS.guild.isAIGuild) {
        const ag = AI_GUILDS.find(x => x.id === GS.guild.id);
        if (ag) ag.notice = newNotice.trim();
      }
      addLog('system', '📜 已更新公會公告');
      el.pageContent.innerHTML = renderMenuPage('guild');
      bindMenuPageEvents('guild');
    });

    // ===== 踢除成員 =====
    el.pageContent.querySelectorAll('[data-kick]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!GS.guild) return;
        const canManage = GS.guild.role === 'leader' || GS.guild.role === 'officer';
        if (!canManage) return;
        const targetName = btn.dataset.kick;
        if (!confirm(`確定踢除「${targetName}」？`)) return;
        if (GS.guild.isPlayerGuild && GS.guild.membersData) {
          GS.guild.membersData = GS.guild.membersData.filter(m => m.name !== targetName);
        }
        // AI成員：從AI公会移除（只影響展示數據，不從GLOBAL_AI_POOL刪除）
        addLog('system', `👢 已踢除成員：${targetName}`);
        el.pageContent.innerHTML = renderMenuPage('guild');
        bindMenuPageEvents('guild');
      });
    });

    // ===== 任命副会长 =====
    el.pageContent.querySelectorAll('[data-promote]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!GS.guild || GS.guild.role !== 'leader') return;
        const targetName = btn.dataset.promote;
        if (!confirm(`確定任命「${targetName}」為副會長？`)) return;
        if (GS.guild.isPlayerGuild && GS.guild.membersData) {
          GS.guild.membersData = GS.guild.membersData.map(m =>
            m.name === targetName ? { ...m, role: '副會長' } : m
          );
        }
        addLog('system', `⚔️ 已任命 ${targetName} 為副會長`);
        el.pageContent.innerHTML = renderMenuPage('guild');
        bindMenuPageEvents('guild');
      });
    });

    // ===== 退出/解散公会 =====
    const leaveBtn = el.pageContent.querySelector('#guild-leave-btn');
    if (leaveBtn) leaveBtn.addEventListener('click', () => {
      if (!GS.guild) return;
      const isLeader = GS.guild.role === 'leader';
      if (isLeader) {
        const members = getGuildMembers(GS.guild.id).filter(m => m.name !== GS.player.name);
        if (members.length > 0) {
          if (!confirm('作為會長解散公會將清除所有數據，確定繼續？')) return;
        } else {
          if (!confirm('確定解散公會？你是唯一成員。')) return;
        }
        // 如果是AI公会且有人類会长，解散後把会长還給AI
        if (GS.guild.isAIGuild) {
          const ag = AI_GUILDS.find(x => x.id === GS.guild.id);
          if (ag && GS.guild.originalAIIeader) ag.leader = GS.guild.originalAIIeader;
          if (ag) ag.hasHumanLeader = false;
        }
        GS.guild = null;
        GS.guildId = null;
        addLog('system', '🏚️ 公會已解散');
      } else {
        if (!confirm('確定退出公會？貢獻值將被清除。')) return;
        GS.guild = null;
        GS.guildId = null;
        addLog('system', '🚪 退出了公會');
      }
      updateUI();
      updatePlayerBadge();
      el.pageContent.innerHTML = renderMenuPage('guild');
      bindMenuPageEvents('guild');
    });
  }
  if (page === 'ranking') {
    el.pageContent.querySelectorAll('.ranking-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        GS.rankingTab = tab.dataset.tab;
        updateRankings();
        el.pageContent.innerHTML = renderMenuPage('ranking');
        bindMenuPageEvents('ranking');
      });
    });
  }
  if (page === 'castle') {
    el.pageContent.querySelectorAll('[data-siege]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cid = btn.dataset.siege;
        const action = btn.dataset.action;
        const castle = CASTLES.find(c => c.id === cid);
        if (!castle) return;

        if (action === 'collect') {
          // 城主：领取税收
          const tax = GS.castleTreasuries[cid] || 0;
          if (tax > 0) {
            if (confirm(`领取税收：${tax} 金幣？`)) {
              GS.resources.gold += tax;
              GS.castleTreasuries[cid] = 0;
              addLog('system', `💰 领取了 ${tax} 金幣城堡税收！`);
              updateUI();
              el.pageContent.innerHTML = renderMenuPage('castle');
              bindMenuPageEvents('castle');
            }
          } else {
            alert('當前没有可领取的税收');
          }
          return;
        }

        // 宣戰流程
        if (!GS.guild) {
          alert('請先創建或加入一個公會');
          return;
        }
        if (GS.guild.role !== 'leader') {
          alert('只有公會會長才能宣戰！');
          return;
        }

        const now = Date.now();
        if (GS.nationLeavePenaltyUntil && GS.nationLeavePenaltyUntil > now) {
          const remain = Math.ceil((GS.nationLeavePenaltyUntil - now) / 1000);
          const d = Math.floor(remain / 86400);
          const h = Math.floor((remain % 86400) / 3600);
          const m = Math.floor((remain % 3600) / 60);
          alert(`退出國家懲罚期内，无法宣戰攻城。\n剩余：${d}天${h}小時${m}分鐘`);
          return;
        }
        if (GS.warCooldowns?.[cid] && GS.warCooldowns[cid] > now) {
          const remain = Math.ceil((GS.warCooldowns[cid] - now) / 1000);
          alert(`宣戰冷卻中，剩余 ${formatTime(remain)}`);
          return;
        }
        if (GS.warDeclared?.castleId === cid) {
          if (confirm('已對该城堡宣戰。是否立即前往攻城戰场？')) {
            loadMap('siege_' + cid);
            closeSidePage();
          }
          return;
        }
        if (GS.warDeclared) {
          if (!confirm(`已有對【${CASTLES.find(c => c.id === GS.warDeclared.castleId)?.name}】的宣戰，取消並改為對【${castle.name}】宣戰？`)) return;
        }
        const confirmMsg = `【攻城宣戰確認】\n\n目標：${castle.name}\n所属：${NATIONS.find(n => n.id === castle.nation)?.name || '未知'}\n城堡等級：Lv.${castle.level}\n守军：${castle.defenders} 人\n税率獎勵：${castle.taxRate}%\n\n限时 20 分鐘，擊破城門 → 摧毁守護塔 → 取得权杖即占领成功。\n\n确定宣戰？`;
        if (!confirm(confirmMsg)) return;

        GS.warDeclared = { castleId: cid, declaredAt: now };
        addLog('system', `⚔️ 公會【${GS.guild.name}】對【${castle.name}】發起宣戰！`);
        closeSidePage();
        // 直接传送到对应攻城区域地圖并进入攻城战
        loadMap('siege_' + cid);
      });
    });
  }
  if (page === 'class') {
    el.pageContent.querySelectorAll('[data-class]').forEach(card => {
      card.addEventListener('click', () => {
        if (confirm(`确定切换职业為 ${CLASSES[card.dataset.class].name}？`)) {
          selectClass(card.dataset.class);
          el.pageContent.innerHTML = renderMenuPage('class');
          bindMenuPageEvents('class');
        }
      });
    });
  }
}

// ==================== 攻城战系统（城堡地圖内嵌版）====================
// 攻城战元素（城门、守護塔、守军、权杖）直接作为怪物/NPC层元素放在城堡地圖上
// 宣戰后进入城堡地圖 → 自動生成攻城战元素；切出地圖 → 自動清理

let castleSiegeActive = false;
let castleSiegeCastle = null;
let castleSiegeTimer = null;
let castleSiegeTimeLeft = 0; // 秒
let castleSiegePhase = 'gate'; // gate -> tower -> scepter -> victory
let castleSiegeGate = null;
let castleSiegeTowers = [];
let castleSiegeLord = null;
let castleSiegeScepter = null;

// 在城堡地圖上启动攻城战（生成城门、守護塔、守军、权杖）
function startCastleSiegeOnMap(castle) {
  castleSiegeActive = true;
  castleSiegeCastle = castle;
  castleSiegePhase = 'gate';
  // 计算剩余时间（根据 GS.siegeWar.endTime，避免重进地图重置倒计时）
  const now = Date.now();
  const remainingMs = Math.max(0, (GS.siegeWar?.endTime || (now + SIEGE_DURATION * 1000)) - now);
  castleSiegeTimeLeft = Math.ceil(remainingMs / 1000);
  console.log('[Siege] 启动攻城战，剩余时间:', castleSiegeTimeLeft, '秒 (', Math.floor(castleSiegeTimeLeft/60), '分', castleSiegeTimeLeft%60, '秒)');
  castleSiegeGate = null;
  castleSiegeTowers = [];
  castleSiegeLord = null;
  castleSiegeScepter = null;
  GS._siegeDefenderCount = 0;

  addLog('siege', `⚔️ 攻城戰開始！目標：${castle.name}`);
  addLog('siege', `⏱️ 限时 20 分鐘，擊破城門 → 摧毁守護塔 → 奪取权杖`);
  addLog('siege', `🛡 擊敗守城衛兵後即可攻擊城門`);

  // 绑定撤退按钮
  const retreatBtn = document.getElementById('siege-retreat-btn');
  if (retreatBtn) {
    retreatBtn.onclick = () => {
      if (confirm('確定撤退？撤退後攻城戰將結束，城堡歸防守方所有。')) {
        endCastleSiege('defeat');
        // 傳送回安全區
        const safeMaps = Object.keys(SAFE_MAPS);
        if (safeMaps.length > 0) loadMap(safeMaps[0]);
      }
    };
  }

  // 生成守城NPC（城門內外都有）
  spawnSiegeDefenders(castle);

  // 生成围墙视觉（左右两侧 + 后方 + 城门两侧）
  renderSiegeWalls();

  // 生成城门（作为"特殊怪物"，大血量）
  const gateY = CAMERA.worldHeight * 0.32 - 40; // 城门底部与围墙底部对齐
  const gate = createSiegeStructure({
    id: 'siege_gate',
    name: '城門',
    type: 'gate',
    x: CAMERA.worldWidth / 2,
    y: gateY,
    hpMax: 10000,
    atk: 0,
    def: 20 + castle.level * 2,
    level: castle.level * 5,
  });
  castleSiegeGate = gate;
  GS.monsters.push(gate);
  renderMonsterUnit(gate);

  // 启动倒计时
  if (castleSiegeTimer) clearInterval(castleSiegeTimer);
  castleSiegeTimer = setInterval(() => {
    castleSiegeTimeLeft--;
    if (castleSiegeTimeLeft <= 0) {
      // 時間到，守城方成功
      endCastleSiege('defeat');
    }
    updateSiegeHUD();
  }, 1000);

  updateSiegeHUD();
}

// 拾取權杖：只有軍團長能拾取，拾取後城堡易主並重新計時
function handlePickupScepter() {
  if (!castleSiegeActive || castleSiegePhase !== 'scepter') return;
  const myLegion = GS.legionId ? AI_GUILDS.find(g => g.id === GS.legionId) : null;
  const isLeader = myLegion && GS.guild && GS.guild.role === 'leader';
  const isKing = GS.nation && getNationKingInfo(GS.nation)?.name === GS.player.name;

  if (!isLeader && !isKing) {
    addLog('siege', '❌ 僅軍團長或國王可拾取權杖！');
    return;
  }

  // 易主：更新城堡所屬
  const castle = castleSiegeCastle;
  if (castle) {
    castle.ownerGuildId = GS.legionId || GS.guildId || 'player_guild';
    castle.ownerName = GS.guild?.name || GS.player.name;
    castle.ownerNation = GS.nation;
    castle.owner = 'player';
  }

  addLog('siege', `👑 權杖已被【${GS.guild?.name || GS.player.name}】拾取！`);
  addLog('system', `🏰 【${castle?.name || '城堡'}】易主！新城主：${GS.guild?.name || GS.player.name}`);

  // 清除守城NPC並重新生成守軍（新守方）
  GS.monsters = GS.monsters.filter(m => !m.isSiegeDefender && !m.isSiegeStructure);
  document.querySelectorAll('.siege-defender').forEach(el => el.remove());

  // 重新生成守方守城NPC
  spawnSiegeDefenders(castle);

  // 易主後重新計時 20 分鐘（防守方守衛）
  castleSiegeTimeLeft = SIEGE_DURATION;
  castleSiegePhase = 'defending';
  if (GS.siegeWar) {
    GS.siegeWar.endTime = Date.now() + SIEGE_DURATION * 1000;
    GS.siegeWar.phase = 'defending';
    GS.siegeWar.defender = GS.guild?.name || GS.player.name;
  }
  addLog('siege', `🛡 進入防守階段！新守方需堅守 20 分鐘`);

  // 清理權杖
  if (castleSiegeScepter?.el) castleSiegeScepter.el.remove();
  castleSiegeScepter = null;

  updateSiegeHUD();
}

// 創建攻城战建筑单位（怪物结构，但外形是建筑）
function createSiegeStructure(opts) {
  const uid = 'siege_' + opts.id + '_' + Date.now();
  const m = {
    uid,
    name: opts.name,
    type: opts.type || 'structure',
    x: opts.x,
    y: opts.y,
    hp: opts.hpMax,
    hpMax: opts.hpMax,
    atk: opts.atk || 0,
    def: opts.def || 0,
    level: opts.level || 1,
    state: 'idle',
    isSiegeStructure: true,
    attackCd: 0,
    respawn: 0,
    speed: 0,
    structureType: opts.type || 'gate',
    behavior: 'passive',
  };
  return m;
}

// 渲染攻城战建筑单位
function renderMonsterUnit(m) {
  if (!m || m.isSiegeStructure) {
    // 攻城建筑单独渲染（如果是建筑）
    if (m?.isSiegeStructure) {
      renderSiegeStructureVisual(m);
    }
    return;
  }
  // 普通怪物由spawnMonsters处理，这里留空兼容
}

// 攻城建築圖資（暗黑中世紀風格）
const SIEGE_ASSETS = {
  gate: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrhtmz4icw_ve_miaoda',
  tower: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrhpm4bqju_ve_miaoda',
  scepter: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrhmx5xqeu_ve_miaoda',
};

// 攻城建筑视觉（城门/塔/权杖）
function renderSiegeStructureVisual(m) {
  const elDiv = document.createElement('div');
  elDiv.className = 'world-unit siege-structure';
  elDiv.dataset.id = m.uid;

  let content = '';
  if (m.type === 'gate') {
    elDiv.style.cssText = `position:absolute;left:${m.x - 80}px;top:${m.y - 60}px;width:160px;height:120px;pointer-events:auto;cursor:pointer;z-index:15;`;
    content = `
      <div style="width:100%;height:100%;position:relative;">
        <img src="${SIEGE_ASSETS.gate}" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:8px;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.8));"/>
      </div>
      <div style="position:absolute;bottom:-18px;left:15%;right:15%;height:10px;background:rgba(0,0,0,0.8);border:1px solid #555;border-radius:5px;">
        <div class="unit-hp-fill" style="height:100%;background:linear-gradient(90deg,#ff4040,#ff8040);border-radius:4px;width:100%;transition:width 0.3s;"></div>
      </div>
      <div style="position:absolute;bottom:-34px;left:0;right:0;text-align:center;color:#fff;font-size:11px;font-weight:700;text-shadow:1px 1px 3px #000, 0 0 4px #000;">${m.name} Lv.${m.level}</div>`;
  } else if (m.type === 'tower') {
    elDiv.style.cssText = `position:absolute;left:${m.x - 50}px;top:${m.y - 70}px;width:100px;height:140px;pointer-events:auto;cursor:pointer;z-index:15;`;
    content = `
      <div style="width:100%;height:100%;position:relative;">
        <img src="${SIEGE_ASSETS.tower}" style="width:100%;height:100%;object-fit:contain;display:block;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.8));"/>
      </div>
      <div style="position:absolute;bottom:-6px;left:15%;right:15%;height:8px;background:rgba(0,0,0,0.8);border:1px solid #555;border-radius:4px;">
        <div class="unit-hp-fill" style="height:100%;background:linear-gradient(90deg,#ff4040,#ff8040);border-radius:3px;width:100%;transition:width 0.3s;"></div>
      </div>
      <div style="position:absolute;bottom:-22px;left:0;right:0;text-align:center;color:#fff;font-size:10px;font-weight:700;text-shadow:1px 1px 3px #000;">${m.name}</div>`;
  } else if (m.type === 'scepter') {
    elDiv.style.cssText = `position:absolute;left:${m.x - 30}px;top:${m.y - 30}px;width:60px;height:60px;pointer-events:auto;cursor:pointer;z-index:20;`;
    content = `
      <div style="width:100%;height:100%;animation:scepter-glow 1.5s ease-in-out infinite alternate;">
        <img src="${SIEGE_ASSETS.scepter}" style="width:100%;height:100%;object-fit:contain;display:block;filter:drop-shadow(0 0 10px #ffd040) drop-shadow(0 0 20px rgba(255,208,64,0.5));"/>
      </div>
      <div style="position:absolute;top:-18px;left:0;right:0;text-align:center;color:#ffd040;font-size:10px;font-weight:800;text-shadow:0 0 6px #ffd040, 1px 1px 2px #000;animation:scepter-glow 1.5s ease-in-out infinite alternate;">權杖</div>`;
    elDiv.addEventListener('click', () => {
      if (castleSiegePhase === 'scepter') {
        handlePickupScepter();
      }
    });
  } else if (m.type === 'lord') {
    elDiv.style.cssText = `position:absolute;left:${m.x - 40}px;top:${m.y - 60}px;width:80px;height:120px;pointer-events:none;`;
    content = `
      <div style="width:100%;height:100%;position:relative;">
        <img src="${SIEGE_ASSETS.tower}" style="width:100%;height:100%;object-fit:contain;display:block;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.8)) hue-rotate(-15deg) brightness(1.1);"/>
        <div style="position:absolute;top:8px;left:50%;transform:translateX(-50%);width:24px;height:24px;background:radial-gradient(circle,#ffd040,#a06010);border-radius:50%;border:2px solid #8b6520;box-shadow:0 0 8px #ffd040;"></div>
      </div>
      <div style="position:absolute;bottom:-6px;left:10%;right:10%;height:8px;background:rgba(0,0,0,0.8);border:1px solid #555;border-radius:4px;">
        <div class="unit-hp-fill" style="height:100%;background:linear-gradient(90deg,#ff4040,#ff8040);border-radius:3px;width:100%;transition:width 0.3s;"></div>
      </div>
      <div style="position:absolute;bottom:-22px;left:0;right:0;text-align:center;color:#ffd040;font-size:10px;font-weight:800;text-shadow:1px 1px 3px #000;">${m.name}</div>`;
  }
  elDiv.innerHTML = content;
  worldLayer.appendChild(elDiv);
  m.el = elDiv;
  // 攻城建筑点击：选中为攻击目标（权杖除外，有单独拾取处理）
  elDiv.addEventListener('click', e => {
    e.stopPropagation();
    if (m.type === 'scepter') return;
    if (castleSiegeActive) {
      onMonsterClick(m);
    }
  });
  return elDiv;
}

// 更新攻城战HUD
function updateSiegeHUD() {
  const hud = document.getElementById('siege-hud');
  const titleEl = document.getElementById('siege-hud-title');
  const phaseEl = document.getElementById('siege-hud-phase');
  if (!hud) return;
  if (!castleSiegeActive) {
    // 隐藏攻城战HUD
    const curMap = getAllMaps()[GS.currentMap];
    if (!curMap || curMap.type !== 'castle_siege') {
      hud.style.display = 'none';
      return;
    }
    if (!GS.siegeWar || GS.siegeWar.status !== 'active') {
      hud.style.display = 'none';
      return;
    }
  }
  hud.style.display = 'flex';
  const m = Math.floor(castleSiegeTimeLeft / 60);
  const s = castleSiegeTimeLeft % 60;
  const phaseText = { gate: '第一階段：擊破城門', tower: '第二階段：摧毀守護塔', scepter: '第三階段：奪取權杖', defending: '防守階段：守護城堡', victory: '勝利！' }[castleSiegePhase] || '';
  if (titleEl) titleEl.textContent = `${castleSiegeCastle?.name || ''} 攻城戰 ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  if (phaseEl) phaseEl.textContent = phaseText;
}

// 攻城战围墙视觉渲染（暗黑中世纪石墙风格）
function renderSiegeWalls() {
  const W = CAMERA.worldWidth;
  const H = CAMERA.worldHeight;
  const castleLeft = W * 0.15;
  const castleRight = W * 0.85;
  const castleTop = H * 0.02;
  const castleBottom = H * 0.32;
  const wallThickness = 20;
  const gateX = W / 2;
  const gateWidth = 120;

  const wallStyle = (w, h, left, top, rotate = 0) => `
    position:absolute;left:${left}px;top:${top}px;width:${w}px;height:${h}px;z-index:5;pointer-events:none;
    background: linear-gradient(180deg, #3a3028 0%, #2a2018 50%, #1a1410 100%);
    border: 2px solid #4a3c30;
    border-radius: 4px;
    box-shadow: inset 0 2px 4px rgba(255,255,255,0.1), inset 0 -4px 8px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.8);
  `;

  // 左墙
  const leftWall = document.createElement('div');
  leftWall.className = 'siege-wall siege-wall-left';
  leftWall.style.cssText = wallStyle(wallThickness, castleBottom - castleTop, castleLeft, castleTop);
  // 城垛效果
  leftWall.innerHTML = '<div style="position:absolute;right:-4px;top:8px;width:8px;height:12px;background:#4a3c30;border-radius:2px;"></div><div style="position:absolute;right:-4px;top:28px;width:8px;height:12px;background:#4a3c30;border-radius:2px;"></div><div style="position:absolute;right:-4px;top:48px;width:8px;height:12px;background:#4a3c30;border-radius:2px;"></div><div style="position:absolute;right:-4px;top:68px;width:8px;height:12px;background:#4a3c30;border-radius:2px;"></div>';
  worldLayer.appendChild(leftWall);

  // 右墙
  const rightWall = document.createElement('div');
  rightWall.className = 'siege-wall siege-wall-right';
  rightWall.style.cssText = wallStyle(wallThickness, castleBottom - castleTop, castleRight - wallThickness, castleTop);
  rightWall.innerHTML = '<div style="position:absolute;left:-4px;top:8px;width:8px;height:12px;background:#4a3c30;border-radius:2px;"></div><div style="position:absolute;left:-4px;top:28px;width:8px;height:12px;background:#4a3c30;border-radius:2px;"></div><div style="position:absolute;left:-4px;top:48px;width:8px;height:12px;background:#4a3c30;border-radius:2px;"></div><div style="position:absolute;left:-4px;top:68px;width:8px;height:12px;background:#4a3c30;border-radius:2px;"></div>';
  worldLayer.appendChild(rightWall);

  // 后墙
  const backWall = document.createElement('div');
  backWall.className = 'siege-wall siege-wall-back';
  backWall.style.cssText = wallStyle(castleRight - castleLeft, wallThickness, castleLeft, castleTop);
  worldLayer.appendChild(backWall);

  // 城门左侧墙
  const frontLeft = document.createElement('div');
  frontLeft.className = 'siege-wall siege-wall-front-left';
  frontLeft.style.cssText = wallStyle(gateX - gateWidth / 2 - castleLeft, wallThickness, castleLeft, castleBottom);
  worldLayer.appendChild(frontLeft);

  // 城门右侧墙
  const frontRight = document.createElement('div');
  frontRight.className = 'siege-wall siege-wall-front-right';
  frontRight.style.cssText = wallStyle(castleRight - (gateX + gateWidth / 2), wallThickness, gateX + gateWidth / 2, castleBottom);
  worldLayer.appendChild(frontRight);

  // 城门柱子（两侧装饰柱）
  const pillarStyle = (left, top) => `
    position:absolute;left:${left}px;top:${top}px;width:28px;height:50px;z-index:6;pointer-events:none;
    background: linear-gradient(180deg, #4a3c30 0%, #3a2c20 50%, #2a1c10 100%);
    border: 2px solid #5a4c3c;
    border-radius: 4px 4px 2px 2px;
    box-shadow: inset 0 2px 4px rgba(255,255,255,0.15), 0 4px 10px rgba(0,0,0,0.8);
  `;
  const leftPillar = document.createElement('div');
  leftPillar.className = 'siege-wall-pillar siege-wall-pillar-left';
  leftPillar.style.cssText = pillarStyle(gateX - gateWidth / 2 - 14, castleBottom - 30);
  worldLayer.appendChild(leftPillar);
  const rightPillar = document.createElement('div');
  rightPillar.className = 'siege-wall-pillar siege-wall-pillar-right';
  rightPillar.style.cssText = pillarStyle(gateX + gateWidth / 2 - 14, castleBottom - 30);
  worldLayer.appendChild(rightPillar);
}

// 移除攻城战围墙视觉
function removeSiegeWalls() {
  document.querySelectorAll('.siege-wall, .siege-wall-pillar').forEach(el => el.remove());
}

// 攻城战单位死亡处理（在monster死亡时调用）
function handleSiegeUnitDeath(m) {
  if (!castleSiegeActive) return;
  // 城门被击破 → 生成守護塔 + 守军
  if (m.type === 'gate') {
    castleSiegePhase = 'tower';
    addLog('siege', '🏰 城門被擊破！守護塔和守卫出現了！');
    // 生成2座守護塔
    const castle = castleSiegeCastle;
    for (let i = 0; i < 2; i++) {
      const tower = createSiegeStructure({
        id: 'tower_' + i,
        name: '守護塔',
        type: 'tower',
        x: CAMERA.worldWidth / 2 + (i === 0 ? -150 : 150),
        y: CAMERA.worldHeight * 0.2,
        hpMax: 5000,
        atk: 50 + castle.level * 5,
        def: 10 + castle.level,
        level: castle.level * 5 + 5,
      });
      castleSiegeTowers.push(tower);
      GS.monsters.push(tower);
      renderSiegeStructureVisual(tower);
    }
    // 生成守军（普通怪物守卫）
    spawnSiegeDefenders(castle);
    updateSiegeHUD();
    return true;
  }
  // 守護塔被摧毁 → 检查是否所有塔都没了
  if (m.type === 'tower') {
    const alive = castleSiegeTowers.filter(t => t.hp > 0);
    if (alive.length === 0) {
      castleSiegePhase = 'scepter';
      addLog('siege', '🗼 所有守護塔被摧毁！城主和权杖出現了！');
      // 生成城主和权杖
      const castle = castleSiegeCastle;
      const lord = createSiegeStructure({
        id: 'castle_lord',
        name: '城主',
        type: 'lord',
        x: CAMERA.worldWidth / 2,
        y: CAMERA.worldHeight * 0.15,
        hpMax: 3000 + castle.level * 800,
        atk: 100 + castle.level * 10,
        def: 20 + castle.level * 3,
        level: castle.level * 5 + 10,
      });
      castleSiegeLord = lord;
      GS.monsters.push(lord);
      renderSiegeStructureVisual(lord);
      // 权杖（可拾取，击败城主后出现）
      updateSiegeHUD();
    }
    return true;
  }
  // 城主被击败 → 生成权杖
  if (m.type === 'lord') {
    addLog('siege', '👑 城主被擊败！奪取权杖即可占领城堡！');
    const castle = castleSiegeCastle;
    const scepter = createSiegeStructure({
      id: 'scepter',
      name: '权杖',
      type: 'scepter',
      x: CAMERA.worldWidth / 2,
      y: CAMERA.worldHeight * 0.12,
      hpMax: 500,
      atk: 0,
      def: 0,
      level: 1,
    });
    castleSiegeScepter = scepter;
    GS.monsters.push(scepter);
    renderSiegeStructureVisual(scepter);
    return true;
  }
  // 权杖被夺取 → 胜利
  if (m.type === 'scepter') {
    endCastleSiege('victory');
    return true;
  }
  return false;
}

// 生成守军
function spawnSiegeDefenders(castle) {
  // 三種守軍類型：守衛（近戰）、弓箭手（遠程）、法師（魔法）
  const defenderTypes = [
    { type: 'guard_sword',  name: '城堡守衛',  sprite: 'guardian', role: 'melee',  ratio: 0.5 },
    { type: 'guard_archer', name: '城堡弓箭手', sprite: 'archer',   role: 'ranged', ratio: 0.3 },
    { type: 'guard_mage',   name: '城堡法師',  sprite: 'mage',     role: 'magic',  ratio: 0.2 },
  ];
  const totalCount = 4 + castle.level * 2; // 根據城堡等級

  for (let i = 0; i < totalCount; i++) {
    // 按比例隨機選擇類型
    const r = Math.random();
    let cum = 0;
    let dType = defenderTypes[0];
    for (const dt of defenderTypes) {
      cum += dt.ratio;
      if (r < cum) { dType = dt; break; }
    }

    // 守軍分佈在城門內外
    const inFrontOfGate = Math.random() < 0.4; // 40% 在城門外
    const baseX = CAMERA.worldWidth / 2;
    const baseY = inFrontOfGate ? CAMERA.worldHeight * 0.4 : CAMERA.worldHeight * 0.22;

    const guard = {
      uid: 'defender_' + i + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name: dType.name,
      type: 'siege_defender',
      defenderType: dType.type,
      spriteKey: dType.sprite,
      role: dType.role,
      x: baseX + (Math.random() - 0.5) * 350,
      y: baseY + (Math.random() - 0.5) * 100,
      hp: 200 + castle.level * 80,
      hpMax: 200 + castle.level * 80,
      atk: 20 + castle.level * 5,
      def: 8 + castle.level * 2,
      level: castle.level * 4 + 1,
      state: 'idle',
      attackCd: 0,
      attackCooldown: 0,
      attackInterval: dType.role === 'magic' ? 2.0 : (dType.role === 'ranged' ? 1.6 : 1.2),
      respawn: 0,
      respawnTime: 30, // 30秒復活
      speed: dType.role === 'melee' ? 55 : 40,
      isSiegeDefender: true,
      behavior: 'aggressive',
      active: true,
      facing: 'left',
      hitTimer: 0,
      dots: [],
      targetUid: null,
      homeX: 0,
      homeY: 0,
    };
    guard.homeX = guard.x;
    guard.homeY = guard.y;
    GS.monsters.push(guard);
    renderSiegeDefenderSprite(guard);
  }
  if (!GS._siegeDefenderCount) GS._siegeDefenderCount = 0;
  GS._siegeDefenderCount += totalCount;
  console.log(`[Siege] 生成 ${totalCount} 名守城NPC`);
}

// 渲染守城NPC精靈
function renderSiegeDefenderSprite(guard) {
  const elDiv = document.createElement('div');
  elDiv.className = 'world-unit enemy siege-defender';
  elDiv.dataset.id = guard.uid;
  elDiv.style.cssText = `position:absolute;left:${guard.x - 20}px;top:${guard.y - 45}px;width:40px;height:50px;z-index:10;`;

  // 根據職業使用對應精靈
  const sp = SPRITE[guard.spriteKey] || SPRITE.warrior;
  const emojiChar = guard.role === 'melee' ? '⚔' : (guard.role === 'ranged' ? '🏹' : '🔮');
  const colorClass = guard.role === 'melee' ? '#c04040' : (guard.role === 'ranged' ? '#40c060' : '#8060ff');

  elDiv.innerHTML = `
    <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
      <div style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.8));color:${colorClass}">${emojiChar}</div>
    </div>
    <div class="unit-info" style="position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);width:44px;">
      <div class="unit-hp" style="width:100%;height:4px;background:rgba(0,0,0,0.7);border:1px solid #333;border-radius:2px;">
        <div class="unit-hp-fill" style="width:100%;height:100%;background:linear-gradient(90deg,#ff4040,#ff8040);border-radius:1px;"></div>
      </div>
      <div class="unit-name" style="font-size:8px;color:#fff;text-align:center;text-shadow:1px 1px 2px #000;margin-top:1px;white-space:nowrap;">${guard.name} Lv.${guard.level}</div>
    </div>`;
  worldLayer.appendChild(elDiv);
  guard.el = elDiv;
  // 守軍點擊：選中為攻擊目標
  elDiv.addEventListener('click', e => {
    e.stopPropagation();
    if (castleSiegeActive) {
      onMonsterClick(guard);
    }
  });
}

// 结束攻城战
// 攻城战围墙碰撞检测
// 围墙形成U形包围城堡区域：左右两侧墙 + 后方墙，前方（南侧）留城门
function checkSiegeWallCollision(px, py) {
  if (!castleSiegeActive || !castleSiegeCastle) return false;
  const W = CAMERA.worldWidth;
  const H = CAMERA.worldHeight;
  // 围墙范围：城堡区域在地图上半部分
  const castleLeft = W * 0.15;
  const castleRight = W * 0.85;
  const castleTop = H * 0.02;
  const castleBottom = H * 0.32; // 城门位置
  const wallThickness = 20;
  const playerRadius = 18;

  // 城门位置和宽度（只有未被破坏时才阻挡）
  const gateX = W / 2;
  const gateWidth = 120;
  const gateBroken = castleSiegeGate && castleSiegeGate.hp <= 0;

  // 左墙：castleLeft 处，从 top 到 castleBottom
  if (px > castleLeft - playerRadius && px < castleLeft + wallThickness + playerRadius &&
      py > castleTop && py < castleBottom + playerRadius) {
    return 'left_wall';
  }
  // 右墙：castleRight 处
  if (px > castleRight - wallThickness - playerRadius && px < castleRight + playerRadius &&
      py > castleTop && py < castleBottom + playerRadius) {
    return 'right_wall';
  }
  // 后墙：castleTop 处，从 castleLeft 到 castleRight
  if (py > castleTop - playerRadius && py < castleTop + wallThickness + playerRadius &&
      px > castleLeft && px < castleRight) {
    return 'back_wall';
  }
  // 前方墙（城门所在）：castleBottom 处
  if (py > castleBottom - playerRadius && py < castleBottom + wallThickness + playerRadius &&
      px > castleLeft && px < castleRight) {
    // 检查是否在城门范围内
    if (!gateBroken && px > gateX - gateWidth / 2 && px < gateX + gateWidth / 2) {
      return 'gate';
    }
    // 城门两侧的墙仍然阻挡（除非城门破了，城门破了整段都不挡）
    if (gateBroken) return false;
    // 城门两侧墙
    if (px < gateX - gateWidth / 2 || px > gateX + gateWidth / 2) {
      return 'front_wall';
    }
  }
  return false;
}

// 攻城战每帧tick（倒计时HUD由setInterval驱动，此处留作扩展）
function updateCastleSiegeTick(dt) {
  if (!castleSiegeActive) return;
  // 检查玩家死亡
  if (GS.player.hp <= 0) endCastleSiege('defeat');
}

function endCastleSiege(result) {
  if (castleSiegeTimer) { clearInterval(castleSiegeTimer); castleSiegeTimer = null; }

  if (result === 'victory') {
    addLog('siege', '🎉 攻城戰胜利！占领了城堡！');
    if (castleSiegeCastle && GS.guild) {
      castleSiegeCastle.owner = 'player';
      castleSiegeCastle.ownerGuildId = GS.legionId || GS.guildId || GS.guild.id;
      castleSiegeCastle.ownerName = GS.guild.name;
      castleSiegeCastle.ownerNation = GS.nation;
      GS.castleTreasuries[castleSiegeCastle.id] = 0;
      addLog('system', `🏰 公會【${GS.guild.name}】占领了【${castleSiegeCastle.name}】！`);
      console.log('[Siege] 攻城战胜利，城堡归属更新:', castleSiegeCastle);
    }
  } else {
    addLog('siege', '💔 攻城戰失敗，時間耗尽。');
  }

  // 清理攻城战状态
  if (GS.siegeWar) {
    GS.siegeWar.status = result === 'victory' ? 'victory' : 'defeat';
    GS.siegeWar.endTime = Date.now();
  }
  castleSiegeActive = false;
  castleSiegePhase = 'idle';
  castleSiegeCastle = null;
  castleSiegeGate = null;
  castleSiegeTowers = [];
  castleSiegeLord = null;
  castleSiegeScepter = null;

  // 隐藏HUD
  const hud = document.getElementById('siege-hud');
  if (hud) hud.style.display = 'none';

  // 移除围墙视觉
  removeSiegeWalls();

  // 弹窗显示结果
  showSiegeResult(result);
}

function showSiegeResult(result) {
  if (!el.siegeResultModal) return;
  el.siegeResultTitle.textContent = result === 'victory' ? '🎉 攻城胜利！' : '💔 攻城失敗';
  el.siegeResultDesc.textContent = result === 'victory'
    ? `成功占领 ${castleSiegeCastle?.name || '城堡'}！每日可领取税收。`
    : `時間耗尽，未能占领 ${castleSiegeCastle?.name || '城堡'}。`;
  el.siegeResultModal.classList.add('open');
}

// 撤退（玩家离开城堡地圖时自動清理）
function cleanupCastleSiege() {
  if (!castleSiegeActive) return;
  if (castleSiegeTimer) { clearInterval(castleSiegeTimer); castleSiegeTimer = null; }
  castleSiegeActive = false;
  castleSiegePhase = 'idle';
  castleSiegeCastle = null;
  castleSiegeGate = null;
  castleSiegeTowers = [];
  castleSiegeLord = null;
  castleSiegeScepter = null;
  if (el.siegeHudTitle) el.siegeHudTitle.textContent = '';
  if (el.siegeHudPhase) el.siegeHudPhase.textContent = '';
  // 攻城战怪物在loadMap清空时会被一起清理
  const hud = document.getElementById('siege-hud');
  if (hud) hud.style.display = 'none';
}

// 旧入口已废弃：统一通过新城堡地圖路径（loadMap + startCastleSiegeOnMap）
function enterSiegeScene(castle) {
  if (!castle) return;
  const now = Date.now();
  if (!GS.siegeWar || GS.siegeWar.castleId !== castle.id || GS.siegeWar.status !== 'active' || GS.siegeWar.endTime <= now) {
    GS.siegeWar = {
      castleId: castle.id,
      attackerGuild: GS.guild?.name || '玩家軍團',
      startTime: now,
      endTime: now + 20 * 60 * 1000,
      status: 'active',
      phase: 'gate',
    };
  }
  loadMap('siege_' + castle.id);
}



// ==================== 相机 / 迷你地圖 / 缩放 ====================
// ==================== 当前目標显示 ====================
function updateTargetDisplay() {
  if (!el.targetDisplay) return;
  let target = null;
  let name = '';
  let hp = 0, hpMax = 0;
  // 优先当前目標怪物
  if (GS.targetMonsterUid) {
    const m = GS.monsters.find(x => x.uid === GS.targetMonsterUid && x.hp > 0);
    if (m) { target = m; name = m.name; hp = m.hp; hpMax = m.hpMax; }
  }
  // 或当前目標AI玩家
  if (!target && GS.targetAiUid) {
    const ai = GS.aiPlayers.find(a => a.uid === GS.targetAiUid && a.hp > 0 && a.state !== 'dead');
    if (ai) { target = ai; name = ai.name; hp = ai.hp; hpMax = ai.hpMax; }
  }
  if (!target) {
    el.targetDisplay.style.display = 'none';
    return;
  }
  el.targetDisplay.style.display = 'block';
  el.targetName.textContent = name + ' (Lv.' + target.level + ')';
  const pct = Math.max(0, Math.min(100, (hp / hpMax) * 100));
  el.targetHpFill.style.width = pct + '%';
}

function updateCamera() {
  // 镜头跟随玩家
  const c = CAMERA;
  const p = GS.player;

  // 平滑缩放
  if (Math.abs(c.zoom - c.targetZoom) > 0.005) {
    c.zoom += (c.targetZoom - c.zoom) * 0.1;
  } else {
    c.zoom = c.targetZoom;
  }

  // 世界宽度（根据地圖和缩放计算可视範圍）
  const map = getAllMaps()[GS.currentMap];
  const worldWidth = Math.max(worldW, c.worldWidth);
  const worldHeight = Math.max(worldH, c.worldHeight);

  // 目標相机位置（以玩家为中心）
  let targetCamX = p.x - worldW / 2 / c.zoom;
  let targetCamY = p.y - worldH / 2 / c.zoom;

  // 限制在世界範圍内
  const maxCamX = worldWidth - worldW / c.zoom;
  const maxCamY = worldHeight - worldH / c.zoom;
  targetCamX = Math.max(0, Math.min(maxCamX, targetCamX));
  targetCamY = Math.max(0, Math.min(maxCamY, targetCamY));

  // 平滑跟随
  c.x += (targetCamX - c.x) * 0.08;
  c.y += (targetCamY - c.y) * 0.08;

  // 应用到 world 层
  applyCameraTransform();
}

function applyCameraTransform() {
  const c = CAMERA;
  // 对世界层应用位移和缩放
  const layers = [worldLayer, npcLayer, damageLayer, effectLayer];
  layers.forEach(layer => {
    if (!layer) return;
    layer.style.transform = `translate(${-c.x * c.zoom}px, ${-c.y * c.zoom}px) scale(${c.zoom})`;
    layer.style.transformOrigin = '0 0';
  });
  // background 也跟随：与世界坐标1:1对应，滚动完全同步
  if (sceneBg) {
    sceneBg.style.backgroundSize = `${c.worldWidth * c.zoom}px ${c.worldHeight * c.zoom}px`;
    sceneBg.style.backgroundPosition = `${-c.x * c.zoom}px ${-c.y * c.zoom}px`;
    sceneBg.style.backgroundRepeat = 'no-repeat';
  }
}

function setZoom(zoom) {
  const c = CAMERA;
  c.targetZoom = Math.max(c.zoomMin, Math.min(c.zoomMax, zoom));
}

function zoomIn() { setZoom(CAMERA.targetZoom * 1.2); }
function zoomOut() { setZoom(CAMERA.targetZoom / 1.2); }
function zoomReset() { CAMERA.targetZoom = 1; }

// 迷你地圖绘制
function updateMinimap() {
  const canvas = el.minimapCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // 背景
  const map = getAllMaps()[GS.currentMap];
  const bgColor = map?.type === 'safe' ? '#2a4a2a' : (map?.type === 'castle_siege' ? '#3a2418' : '#4a3a2a');
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);

  // 地圖边界
  ctx.strokeStyle = 'rgba(240,192,64,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

  // 计算坐标缩放
  const worldW_ = Math.max(worldW, CAMERA.worldWidth);
  const worldH_ = Math.max(worldH, CAMERA.worldHeight);
  const sx = w / worldW_;
  const sy = h / worldH_;

  // 画怪物点
  GS.monsters.forEach(m => {
    if (m.hp <= 0) return;
    if (m.isSiegeStructure) return; // 建筑另外画
    if (m.isBoss) {
      // Boss：大尺寸红色骷髅标记
      ctx.fillStyle = '#ff2020';
      ctx.strokeStyle = '#ffd060';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(m.x * sx, m.y * sy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Boss名字
      ctx.fillStyle = '#ff6060';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BOSS', m.x * sx, m.y * sy - 7);
    } else {
      ctx.fillStyle = m.behavior === 'aggro' ? '#ff6060' : '#d0a040';
      ctx.beginPath();
      ctx.arc(m.x * sx, m.y * sy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Boss重生倒计时（如果Boss在冷卻中）
  const mapObj = getAllMaps()[GS.currentMap];
  if (mapObj?.boss) {
    const bs = bossState[GS.currentMap];
    if (bs && !bs.spawned && bs.respawnAt > Date.now()) {
      const remain = Math.ceil((bs.respawnAt - Date.now()) / 1000);
      const mins = Math.floor(remain / 60);
      const secs = remain % 60;
      const bx = mapObj.boss.x * sx;
      const by = mapObj.boss.y * sy;
      ctx.fillStyle = 'rgba(255,100,100,0.4)';
      ctx.strokeStyle = 'rgba(255,100,100,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bx, by, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ff8080';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${mins}:${secs < 10 ? '0' : ''}${secs}`, bx, by - 6);
    }
  }

  // 画 NPC
  if (map?.npcs) {
    map.npcs.forEach(npc => {
      ctx.fillStyle = '#80d4ff';
      ctx.fillRect(npc.x * sx - 1.5, npc.y * sy - 1.5, 3, 3);
    });
  }

  // 画玩家（带朝向三角）
  const p = GS.player;
  const px = p.x * sx, py = p.y * sy;
  ctx.fillStyle = '#60ff80';
  ctx.beginPath();
  ctx.arc(px, py, 3, 0, Math.PI * 2);
  ctx.fill();
  // 朝向指示
  ctx.strokeStyle = '#60ff80';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const dirX = p.facing === 'right' ? 5 : -5;
  ctx.moveTo(px, py);
  ctx.lineTo(px + dirX, py);
  ctx.stroke();

  // 画召喚英雄
  GS.summons.forEach(s => {
    if (!s.active) return;
    ctx.fillStyle = '#80d4ff';
    ctx.beginPath();
    ctx.arc(s.x * sx, s.y * sy, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ==================== 主循环 ====================
function gameLoop(ts) {
  try {
  if (!lastTime) lastTime = ts;
  let dt = (ts - lastTime) / 1000;
  lastTime = ts;
  if (dt > 0.1) dt = 0.1;

  if (!GS.paused) {
    try { updatePlayer(dt); } catch (e) { console.error('updatePlayer error:', e); }
    try { updateMonsters(dt); } catch (e) { console.error('updateMonsters error:', e); }
    try { updateAIPlayers(dt); } catch (e) { console.error('updateAIPlayers error:', e); }
    try { updateGlobalAIGrowth(dt); } catch (e) { console.error('updateGlobalAIGrowth error:', e); }
    try { checkMonsterRespawn(dt); } catch (e) { console.error('checkMonsterRespawn error:', e); }
    try { updateSummons(dt); } catch (e) { console.error('updateSummons error:', e); }
    try { renderPlayer(); } catch (e) { console.error('renderPlayer error:', e); }

    // 攻城战更新（城堡地圖内进行）
    if (castleSiegeActive) {
      try { updateCastleSiegeTick(dt); } catch (e) { console.error('castleSiege tick error:', e); }
    }

    if (GS.player.hp > 0 && GS.player.hp < getTotalHpMax() && GS.player.state === 'idle') {
      GS.player.hp = Math.min(getTotalHpMax(), GS.player.hp + getTotalHpMax() * 0.005 * dt);
    }

    // Boss重生检查
    try { checkBossRespawn(); } catch (e) { console.error('checkBossRespawn error:', e); }

    // AI 隨機聊天
    try { tickAIChat(dt); } catch (e) { /* ignore */ }

    // 每週稅收結算檢查
    try { settleWeeklyTax(); } catch (e) { /* ignore */ }
  }

  try { updateSpriteFrames(dt); } catch (e) { console.error('updateSpriteFrames error:', e); }
  try { updateDustParticles(dt); } catch (e) { console.error('updateDustParticles error:', e); }
  try { checkTransformExpiry && checkTransformExpiry(); } catch(e) {}
  try { tickBuffs && tickBuffs(); } catch(e) {}
  try { updateCamera(); } catch (e) { console.error('updateCamera error:', e); }
  try { updateMinimap(); } catch (e) { console.error('updateMinimap error:', e); }
  try { updateTargetDisplay(); } catch (e) { console.error('updateTargetDisplay error:', e); }
  } catch (e) {
    console.error('gameLoop FATAL error:', e);
  }
  requestAnimationFrame(gameLoop);
}

// ==================== 事件 ====================
// 点击场景地面移動（手动操作）
function onSceneClick(e) {
  if (GS.player.hp <= 0) return;
  // 安全区或 UI 层拦截直接返回（e.target 为 UI 元素时由冒泡阻止）
  const allMaps = getAllMaps();
  const curMap = allMaps[GS.currentMap];
  if (!curMap) return;
  
  // 自動模式下不响应手动点击移動（自動戰鬥接管）
  if (GS.autoMode) return;
  
  // 屏幕坐标 → 世界坐标
  const rect = e.currentTarget.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;
  const worldX = screenX / CAMERA.zoom + CAMERA.x;
  const worldY = screenY / CAMERA.zoom + CAMERA.y;
  
  // 限制在世界範圍内
  const w = worldMaxW(), h = worldMaxH();
  const tx = Math.max(20, Math.min(w - 20, worldX));
  const ty = Math.max(20, Math.min(h - 20, worldY));
  
  GS.player.targetX = tx;
  GS.player.targetY = ty;
  if (GS.player.state !== 'attacking' && GS.player.state !== 'casting') {
    GS.player.state = 'walking';
  }
  GS.player.facing = tx >= GS.player.x ? 'right' : 'left';
  // 清除手动攻擊目標
  GS.targetMonsterUid = null;
  GS.targetAiUid = null;
  
  // 显示点击效果
  showClickEffect(tx, ty);
}

function showClickEffect(wx, wy) {
  const fx = document.createElement('div');
  fx.style.cssText = `position:absolute;left:${wx-15}px;top:${wy-15}px;width:30px;height:30px;border:2px solid rgba(255,220,120,0.9);border-radius:50%;box-shadow:0 0 10px rgba(255,200,80,0.8);pointer-events:none;z-index:100;animation:click-ripple 0.6s ease-out forwards`;
  effectLayer.appendChild(fx);
  setTimeout(() => fx.remove(), 600);
}

function switchLanguage(lang) {
  if (!LANG || !LANG[lang]) lang = 'zh-CN';
  CURRENT_LANG = lang;
  // 更新按鈕樣式
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === lang);
  });
  // 更新頂部UI文字
  const cpLabel = document.querySelector('.cp-label');
  if (cpLabel) cpLabel.textContent = t('combatPower');
  const autoLabel = el.autoLabel;
  if (autoLabel && !GS.autoMode) autoLabel.textContent = t('auto') || '自動';
  const locationNameEl = el.locationName;
  if (locationNameEl) {
    const map = getAllMaps()[GS.currentMap];
    if (map) locationNameEl.textContent = map.name;
  }
  // 更新玩家名字上方class badge 等保留原職業名
  try { localStorage.setItem('game_lang', lang); } catch(e) {}
}

function bindEvents() {
  // 场景点击
  el.scene.addEventListener('click', e => {
    if (e.target.closest('.side-btn') || e.target.closest('.auto-btn')
        || e.target.closest('.quest-tracker') || e.target.closest('.kill-counter')
        || e.target.closest('.world-unit') || e.target.closest('.npc-unit')
        || e.target.closest('.skill-bar') || e.target.closest('.minimap')
        || e.target.closest('.zoom-controls')) return;
    const rect = el.scene.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    // 屏幕坐标 -> 世界坐标（考虑相机偏移和缩放）
    const worldX = (screenX / CAMERA.zoom) + CAMERA.x;
    const worldY = (screenY / CAMERA.zoom) + CAMERA.y;
    // 限制在世界範圍内
    const maxX = Math.max(worldW, CAMERA.worldWidth) - 10;
    const maxY = Math.max(worldH, CAMERA.worldHeight) - 30;
    const tx = Math.max(10, Math.min(maxX, worldX));
    const ty = Math.max(50, Math.min(maxY, worldY));
    GS.player.targetX = tx;
    GS.player.targetY = ty;
    if (GS.player.state !== 'attacking' && GS.player.state !== 'casting') {
      GS.player.state = 'walking';
    }
    GS.player.facing = worldX >= GS.player.x ? 'right' : 'left';
    // 手动模式下点击地面取消锁定目標
    if (!GS.autoMode) {
      GS.targetMonsterUid = null;
      GS.targetAiUid = null;
    }
    // 显示点击涟漪效果
    showClickEffect(tx, ty);
  });

  // 自動戰鬥按钮
  el.autoBtn.addEventListener('click', () => {
    const allMaps = getAllMaps();
    if (allMaps[GS.currentMap]?.type === 'safe') {
      alert('安全區域無法自動戰鬥，請先前往野外地圖');
      return;
    }
    GS.autoMode = !GS.autoMode;
    if (GS.autoMode) {
      el.autoBtn.classList.add('active');
      el.autoLabel.textContent = '自動中';

      const first = findNearestMonster();
      if (first) GS.targetMonsterUid = first.uid;
    } else {
      el.autoBtn.classList.remove('active');
      el.autoLabel.textContent = '自動';
      updateUI();
    }
  });

  // 自動技能開關按鈕
  const autoSkillBtn = $('auto-skill-btn');
  const autoSkillLabel = $('auto-skill-label');
  if (autoSkillBtn && autoSkillLabel) {
    // 預設開啟
    if (GS.autoSkillEnabled === undefined) GS.autoSkillEnabled = true;
    if (GS.autoSkillEnabled) {
      autoSkillBtn.classList.add('active');
      autoSkillLabel.textContent = '自動技 開';
    } else {
      autoSkillLabel.textContent = '自動技 關';
    }
    autoSkillBtn.addEventListener('click', () => {
      GS.autoSkillEnabled = !GS.autoSkillEnabled;
      if (GS.autoSkillEnabled) {
        autoSkillBtn.classList.add('active');
        autoSkillLabel.textContent = '自動技 開';
        addLog('system', '⚡ 自動技能已開啟');
      } else {
        autoSkillBtn.classList.remove('active');
        autoSkillLabel.textContent = '自動技 關';
        addLog('system', '⚡ 自動技能已關閉，僅普攻');
      }
    });
  }

  // 底部导航
  document.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      openSidePage(btn.dataset.page);
    });
  });

  // 戰鬥日誌 Tab 切換
  document.querySelectorAll('.log-tab[data-log-tab]').forEach(tab => {
    tab.addEventListener('click', () => switchLogTab(tab.dataset.logTab));
  });
  if (el.logToggleBtn) {
    el.logToggleBtn.addEventListener('click', toggleLogExpand);
  }
  if (el.chatSendBtn) {
    el.chatSendBtn.addEventListener('click', sendChatMessage);
  }
  if (el.chatInput) {
    el.chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') sendChatMessage();
    });
  }

  // 地圖
  el.mapBtn.addEventListener('click', openMapModal);
  el.mapClose.addEventListener('click', closeMapModal);
  el.mapModal.addEventListener('click', e => { if (e.target === el.mapModal) closeMapModal(); });

  // 裝備詳情彈窗
  $('equip-detail-close').addEventListener('click', closeEquipDetailModal);
  $('equip-detail-modal').addEventListener('click', e => {
    if (e.target.id === 'equip-detail-modal') closeEquipDetailModal();
  });

  // 設定
  $('settings-btn').addEventListener('click', () => {
    const nameInput = $('player-name-input');
    if (nameInput) nameInput.value = GS.player.name;
    // 同步toggle状态
    const afToggle = $('auto-fight-toggle');
    if (afToggle) afToggle.checked = !!GS.autoMode;
    const asToggle = $('auto-skill-toggle');
    if (asToggle) asToggle.checked = !!GS.autoSkillEnabled;
    const apToggle = $('auto-potion-toggle');
    if (apToggle) apToggle.checked = !!GS.autoPotionEnabled;
    const amToggle = $('auto-mp-toggle');
    if (amToggle) amToggle.checked = !!GS.autoMpEnabled;
    const abpToggle = $('auto-buy-potion-toggle');
    if (abpToggle) abpToggle.checked = !!GS.autoBuyPotion;
    // 同步 PVP 模式
    document.querySelectorAll('.pvp-mode-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.pvpMode === GS.autoPvpMode);
    });
    // 同步音频状态
    if (window.AudioSystem) {
      const ac = AudioSystem.getConfig();
      const sfxTog = $('sfx-toggle');
      if (sfxTog) sfxTog.checked = ac.sfxEnabled;
      const musicTog = $('music-toggle');
      if (musicTog) musicTog.checked = ac.musicEnabled;
      const sfxVol = $('sfx-volume');
      if (sfxVol) sfxVol.value = Math.round(ac.sfxVolume * 100);
      const sfxVolVal = $('sfx-volume-value');
      if (sfxVolVal) sfxVolVal.textContent = Math.round(ac.sfxVolume * 100);
      const musicVol = $('music-volume');
      if (musicVol) musicVol.value = Math.round(ac.musicVolume * 100);
      const musicVolVal = $('music-volume-value');
      if (musicVolVal) musicVolVal.textContent = Math.round(ac.musicVolume * 100);
    }
    // 渲染自動道具欄位
    renderAutoItemsGrid();
    el.settingsPanel.classList.add('open');
  });
  // 侧边選單設定按钮
  const menuSettingsBtn = $('menu-settings-btn');
  if (menuSettingsBtn) menuSettingsBtn.addEventListener('click', () => {
    closeSideMenu();
    const nameInput = $('player-name-input');
    if (nameInput) nameInput.value = GS.player.name;
    const afToggle = $('auto-fight-toggle');
    if (afToggle) afToggle.checked = !!GS.autoMode;
    const asToggle = $('auto-skill-toggle');
    if (asToggle) asToggle.checked = !!GS.autoSkillEnabled;
    const apToggle = $('auto-potion-toggle');
    if (apToggle) apToggle.checked = !!GS.autoPotionEnabled;
    const amToggle = $('auto-mp-toggle');
    if (amToggle) amToggle.checked = !!GS.autoMpEnabled;
    if (window.AudioSystem) {
      const ac = AudioSystem.getConfig();
      const sfxTog = $('sfx-toggle');
      if (sfxTog) sfxTog.checked = ac.sfxEnabled;
      const musicTog = $('music-toggle');
      if (musicTog) musicTog.checked = ac.musicEnabled;
      const sfxVol = $('sfx-volume');
      if (sfxVol) sfxVol.value = Math.round(ac.sfxVolume * 100);
      const sfxVolVal = $('sfx-volume-value');
      if (sfxVolVal) sfxVolVal.textContent = Math.round(ac.sfxVolume * 100);
      const musicVol = $('music-volume');
      if (musicVol) musicVol.value = Math.round(ac.musicVolume * 100);
      const musicVolVal = $('music-volume-value');
      if (musicVolVal) musicVolVal.textContent = Math.round(ac.musicVolume * 100);
    }
    // 渲染自動道具欄位
    renderAutoItemsGrid();
    el.settingsPanel.classList.add('open');
  });
  // 圖鑑
  const codexBtn = $('menu-codex-btn');
  if (codexBtn) codexBtn.addEventListener('click', openCodexPage);
  // 合成
  const synthBtn = $('menu-synth-btn');
  if (synthBtn) synthBtn.addEventListener('click', openSynthPage);
  el.settingsPanel.addEventListener('click', e => {
    if (e.target === el.settingsPanel) el.settingsPanel.classList.remove('open');
  });
  // 設置面板關閉按鈕
  const settingsCloseBtn = $('settings-close-btn');
  if (settingsCloseBtn) settingsCloseBtn.addEventListener('click', () => {
    el.settingsPanel.classList.remove('open');
  });
  // 自動道具：設置面板關閉時統一保存一次
  if (settingsCloseBtn) settingsCloseBtn.addEventListener('click', saveAutoItemsConfig);
  // 自動戰鬥 toggle
  const afToggle = $('auto-fight-toggle');
  if (afToggle) afToggle.addEventListener('change', () => {
    const on = afToggle.checked;
    GS.autoMode = on;
    const autoBtn = $('auto-btn');
    const autoLabel = $('auto-label');
    if (autoBtn) autoBtn.classList.toggle('active', on);
    if (autoLabel) autoLabel.textContent = on ? '自動中' : '自動';
    addLog('system', on ? '已開啟自動掛機' : '已切換為手動操作');
  });
  // 自動技能 toggle
  const asToggle = $('auto-skill-toggle');
  if (asToggle) asToggle.addEventListener('change', () => {
    GS.autoSkillEnabled = asToggle.checked;
    const autoSkillBtn = $('auto-skill-btn');
    if (autoSkillBtn) autoSkillBtn.classList.toggle('active', GS.autoSkillEnabled);
    addLog('system', GS.autoSkillEnabled ? '自動技能已開啟' : '自動技能已關閉');
  });
  // 自動喝水 toggle
  const apToggle = $('auto-potion-toggle');
  if (apToggle) apToggle.addEventListener('change', () => {
    GS.autoPotionEnabled = apToggle.checked;
    addLog('system', GS.autoPotionEnabled ? '自動喝水已開啟' : '自動喝水已關閉');
  });
  // 自動回魔 toggle
  const amToggle = $('auto-mp-toggle');
  if (amToggle) amToggle.addEventListener('change', () => {
    GS.autoMpEnabled = amToggle.checked;
    addLog('system', GS.autoMpEnabled ? '自動回魔已開啟' : '自動回魔已關閉');
  });
  // 自動購買藥水 toggle
  const abpToggle = $('auto-buy-potion-toggle');
  if (abpToggle) abpToggle.addEventListener('change', () => {
    GS.autoBuyPotion = abpToggle.checked;
    addLog('system', GS.autoBuyPotion ? '自動購買藥水已開啟' : '自動購買藥水已關閉');
  });
  // PVP 模式按鈕
  document.querySelectorAll('.pvp-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.pvpMode;
      GS.autoPvpMode = mode;
      document.querySelectorAll('.pvp-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.pvpMode === mode));
      const labels = { counter: '被動反擊', active: '主動攻擊', off: '不參與' };
      addLog('system', `PVP 模式：${labels[mode] || mode}`);
    });
  });
  // 音效開關
  const sfxToggle = $('sfx-toggle');
  if (sfxToggle) sfxToggle.addEventListener('change', () => {
    if (window.AudioSystem) AudioSystem.setSfxEnabled(sfxToggle.checked);
    addLog('system', sfxToggle.checked ? '音效已開啟' : '音效已關閉');
  });
  // 音樂開關
  const musicToggle = $('music-toggle');
  if (musicToggle) musicToggle.addEventListener('change', () => {
    if (window.AudioSystem) AudioSystem.setMusicEnabled(musicToggle.checked);
    addLog('system', musicToggle.checked ? '背景音樂已開啟' : '背景音樂已關閉');
  });
  // 音效音量滑桿
  const sfxVolumeSlider = $('sfx-volume');
  const sfxVolumeValue = $('sfx-volume-value');
  if (sfxVolumeSlider) sfxVolumeSlider.addEventListener('input', () => {
    const val = parseInt(sfxVolumeSlider.value, 10);
    if (sfxVolumeValue) sfxVolumeValue.textContent = val;
    if (window.AudioSystem) AudioSystem.setSfxVolume(val / 100);
  });
  // 音樂音量滑桿
  const musicVolumeSlider = $('music-volume');
  const musicVolumeValue = $('music-volume-value');
  if (musicVolumeSlider) musicVolumeSlider.addEventListener('input', () => {
    const val = parseInt(musicVolumeSlider.value, 10);
    if (musicVolumeValue) musicVolumeValue.textContent = val;
    if (window.AudioSystem) AudioSystem.setMusicVolume(val / 100);
  });
  const changeNameBtn = $('change-name-btn');
  if (changeNameBtn) changeNameBtn.addEventListener('click', () => {
    const input = $('player-name-input');
    const newName = input?.value || '';
    const err = validatePlayerName(newName);
    if (err) { alert(err); return; }
    const oldName = GS.player.name;
    GS.player.name = newName.trim();
    addLog('system', `角色名已從「${oldName}」改為「${GS.player.name}」`);
    updateUI();
    // 更新角色名显示
    const info = document.querySelector('.player .unit-info .unit-name');
    if (info) info.textContent = GS.player.name;
    if (el.topName) el.topName.textContent = GS.player.name;
  });
  // 快捷栏設定按钮
  const qsBtn = $('quickbar-settings-btn');
  if (qsBtn) qsBtn.addEventListener('click', openQuickBarSettings);
  const qsClose = $('quickbar-settings-close');
  if (qsClose) qsClose.addEventListener('click', closeQuickBarSettings);
  const qsModal = $('quickbar-settings-modal');
  if (qsModal) qsModal.addEventListener('click', e => { if (e.target === qsModal) closeQuickBarSettings(); });
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang || 'zh-CN';
      switchLanguage(lang);
    });
  });

  // 抽卡结果關閉
  el.gachaClose.addEventListener('click', () => el.gachaModal.classList.remove('open'));
  el.gachaModal.addEventListener('click', e => {
    if (e.target === el.gachaModal) el.gachaModal.classList.remove('open');
  });

  // 英雄/守護槽
  $('hero-slot').addEventListener('click', () => {
    GS.heroPageTab = 'heroes';
    openSidePage('hero');
  });
  $('pet-slot').addEventListener('click', () => {
    GS.heroPageTab = 'pets';
    openSidePage('hero');
  });

  // 背包按钮
  $('bag-btn').addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    openSidePage('bag');
  });

  // 侧边選單
  el.menuBtn.addEventListener('click', openSideMenu);
  el.sideMenuClose.addEventListener('click', closeSideMenu);
  el.sideMenuOverlay.addEventListener('click', closeSideMenu);
  document.querySelectorAll('.side-menu-item').forEach(item => {
    item.addEventListener('click', () => openMenuPage(item.dataset.menu));
  });

  // 技能栏点击
  el.skillBar.querySelectorAll('.skill-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.skill);
      useQuickBarSlot(idx);
    });
    // 右键 / 长按 打开配置
    btn.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      const idx = parseInt(btn.dataset.skill);
      openQuickBarPicker(idx);
    });
    // 长按（移動端）
    let pressTimer = null;
    btn.addEventListener('touchstart', e => {
      const idx = parseInt(btn.dataset.skill);
      pressTimer = setTimeout(() => {
        openQuickBarPicker(idx);
        pressTimer = null;
      }, 600);
    }, { passive: true });
    btn.addEventListener('touchend', () => {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    });
    btn.addEventListener('touchmove', () => {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    });
  });

  // 键盘快捷栏 1-8
  document.addEventListener('keydown', e => {
    if (e.key >= '1' && e.key <= '8') {
      useQuickBarSlot(parseInt(e.key) - 1);
    }
  });

  // 攻城战關閉
  el.siegeClose.addEventListener('click', () => {
    el.siegeModal.classList.remove('open');
    GS.siege.active = false;
    // 刷新城堡页面
  });

  // resize
  window.addEventListener('resize', () => {
    worldW = el.scene.clientWidth;
    worldH = el.scene.clientHeight;
  });

  // 缩放控制按钮
  if (el.zoomInBtn) el.zoomInBtn.addEventListener('click', zoomIn);
  if (el.zoomOutBtn) el.zoomOutBtn.addEventListener('click', zoomOut);
  if (el.zoomResetBtn) el.zoomResetBtn.addEventListener('click', zoomReset);

  // 攻城战撤退按钮（新城堡地圖用）
  if (el.siegeRetreatBtn) el.siegeRetreatBtn.addEventListener('click', () => {
    if (!castleSiegeActive) return;
    if (confirm('确定要撤退吗？攻城戰將失敗。')) {
      endCastleSiege('defeat');
    }
  });

  // 鼠标滚轮缩放
  el.scene.addEventListener('wheel', e => {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  }, { passive: false });
}

// 選擇最近的怪物作为目標
function selectNearestTarget() {
  const p = GS.player;
  let nearest = null;
  let minDist = Infinity;
  GS.monsters.forEach(m => {
    if (m.hp <= 0 || m.isDead) return;
    const d = Math.hypot(m.x - p.x, m.y - p.y);
    if (d < minDist) { minDist = d; nearest = m; }
  });
  if (nearest) {
    GS.targetMonsterUid = nearest.uid;
    GS.targetAiUid = null;
    updateTargetDisplay();
  }
}

// 在多个目標间切换（按距離排序，循环切换）
function switchTarget() {
  const p = GS.player;
  const alive = GS.monsters.filter(m => m.hp > 0 && !m.isDead)
    .map(m => ({ m, d: Math.hypot(m.x - p.x, m.y - p.y) }))
    .sort((a, b) => a.d - b.d);
  if (alive.length === 0) return;
  if (!GS.targetMonsterUid) {
    GS.targetMonsterUid = alive[0].m.uid;
  } else {
    const curIdx = alive.findIndex(x => x.m.uid === GS.targetMonsterUid);
    const nextIdx = (curIdx + 1) % alive.length;
    GS.targetMonsterUid = alive[nextIdx].m.uid;
  }
  GS.targetAiUid = null;
  updateTargetDisplay();
}

// 全局按鈕點擊音效（事件委託）
document.addEventListener('click', (e) => {
  if (!window.AudioSystem) return;
  // 首次交互时恢复 AudioContext
  AudioSystem.ensureRunning();
  const target = e.target.closest('button, .toggle-switch, .lang-btn, .nav-btn, .menu-btn, .gacha-btn, .tab-btn, .close-btn, .ov-back-btn');
  if (target) {
    AudioSystem.sfxClick();
  }
}, true);

// ===== 全局可用：宣战 & 进入攻城战场（供事件委托调用） =====
window.declareSiegeWar = function(castleId) {
  console.log('[Siege] declareSiegeWar 调用，castleId=', castleId);
  if (!castleId) return;
  const castle = CASTLES.find(c => c.id === castleId);
  if (!castle) { console.log('[Siege] 城堡不存在'); return; }
  const myNation = NATIONS.find(n => n.id === GS.nation);
  const kingName = myNation ? getNationKingInfo(myNation.id)?.name : null;
  const isKing = kingName === GS.player.name;
  const myLegionId = GS.legionId || GS.guildId;
  const myLegion = myLegionId ? AI_GUILDS.find(g => g.id === myLegionId) : null;
  const isLeader = myLegion && GS.guild && GS.guild.role === 'leader';
  console.log('[Siege] 权限: isKing=', isKing, 'isLeader=', isLeader, 'guild=', GS.guild, 'legionId=', myLegionId);
  if (!isKing && !isLeader) {
    showSiegeAlert('僅國王與軍團長可宣戰\n\n提示：加入軍團後自動成為軍團長');
    return;
  }
  if (castle.ownerGuildId === myLegionId) { showSiegeAlert('不能攻擊己方城堡！'); return; }
  // 每日次數
  const today = new Date().toDateString();
  if (GS.siegeWarDate !== today) { GS.siegeWarDate = today; GS.siegeWarDeclareCount = 0; }
  const dailyLimit = isKing ? 2 : 1;
  const remain = Math.max(0, dailyLimit - (GS.siegeWarDeclareCount || 0));
  console.log('[Siege] 剩余次数:', remain, '/', dailyLimit);
  if (remain <= 0) { showSiegeAlert(`今日宣戰次數已用完（${isKing ? '國王每天2次' : '軍團長每天1次'}）`); return; }
  const now = Date.now();
  let msg;
  let override = false;
  if (GS.siegeWar && GS.siegeWar.status === 'active' && GS.siegeWar.endTime > now) {
    const curName = CASTLES.find(c => c.id === GS.siegeWar.castleId)?.name || '';
    msg = `已有對【${curName}】的攻城戰正在進行，取消並改為對【${castle.name}】宣戰？`;
    override = true;
  } else {
    msg = `確認對【${castle.name}】宣戰？\n宣戰後持續 20 分鐘，擊破城門→摧毀守護塔→拾取權杖取勝。`;
  }
  showSiegeConfirm(msg, () => doDeclareSiege(castleId, override));
};

function doDeclareSiege(castleId, override) {
  const castle = CASTLES.find(c => c.id === castleId);
  if (!castle) return;
  const now = Date.now();
  GS.siegeWar = {
    castleId: castleId,
    attackerGuild: GS.guild?.name || '玩家軍團',
    startTime: now,
    endTime: now + 20 * 60 * 1000,
    status: 'active',
    phase: 'gate',
  };
  GS.siegeWarDeclareCount = (GS.siegeWarDeclareCount || 0) + 1;
  console.log('[Siege] 宣战成功！siegeWar=', GS.siegeWar);
  addLog('system', `⚔ 宣戰成功！前往【${castle.name}】攻城戰場，20分鐘內佔領取勝！`);
  addLog('siege', `⚔️ 宣戰成功！目標：${castle.name}`);
  showFloatingText('宣戰成功！', '#ff8040');
  // 重新渲染
  if (el.pageContent) {
    el.pageContent.innerHTML = renderMenuPage('nation');
    bindMenuPageEvents('nation');
  }
}

// 自製確認/提示彈窗（避免原生 confirm/alert 被阻止）
function showSiegeConfirm(message, onConfirm) {
  const overlay = document.createElement('div');
  overlay.id = 'siege-confirm-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:99999;font-family:sans-serif';
  const box = document.createElement('div');
  box.style.cssText = 'background:linear-gradient(180deg,#3a2818,#1e140a);border:2px solid #c89040;border-radius:10px;padding:20px 24px;min-width:280px;max-width:400px;color:#f5e6c8;box-shadow:0 8px 30px rgba(0,0,0,0.8)';
  const msgEl = document.createElement('div');
  msgEl.style.cssText = 'white-space:pre-wrap;font-size:14px;line-height:1.6;margin-bottom:18px;text-align:center';
  msgEl.textContent = message;
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:12px;justify-content:center';
  const okBtn = document.createElement('button');
  okBtn.textContent = '確認';
  okBtn.style.cssText = 'padding:8px 20px;background:linear-gradient(180deg,#d4a020,#8a6520);border:1px solid #f0c040;color:#fff;font-weight:700;border-radius:6px;cursor:pointer;font-size:14px';
  okBtn.onclick = (e) => { e.stopPropagation(); overlay.remove(); onConfirm && onConfirm(); };
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '取消';
  cancelBtn.style.cssText = 'padding:8px 20px;background:linear-gradient(180deg,#555,#222);border:1px solid #777;color:#ccc;font-weight:700;border-radius:6px;cursor:pointer;font-size:14px';
  cancelBtn.onclick = (e) => { e.stopPropagation(); overlay.remove(); };
  btnRow.appendChild(okBtn);
  btnRow.appendChild(cancelBtn);
  box.appendChild(msgEl);
  box.appendChild(btnRow);
  overlay.appendChild(box);
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
  setTimeout(() => okBtn.focus(), 10);
}
function showSiegeAlert(message) {
  const overlay = document.createElement('div');
  overlay.id = 'siege-alert-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:99999;font-family:sans-serif';
  const box = document.createElement('div');
  box.style.cssText = 'background:linear-gradient(180deg,#3a2818,#1e140a);border:2px solid #c89040;border-radius:10px;padding:20px 24px;min-width:240px;max-width:360px;color:#f5e6c8;box-shadow:0 8px 30px rgba(0,0,0,0.8)';
  const msgEl = document.createElement('div');
  msgEl.style.cssText = 'white-space:pre-wrap;font-size:14px;line-height:1.6;margin-bottom:18px;text-align:center';
  msgEl.textContent = message;
  const okBtn = document.createElement('button');
  okBtn.textContent = '確定';
  okBtn.style.cssText = 'display:block;margin:0 auto;padding:8px 24px;background:linear-gradient(180deg,#d4a020,#8a6520);border:1px solid #f0c040;color:#fff;font-weight:700;border-radius:6px;cursor:pointer;font-size:14px';
  okBtn.onclick = (e) => { e.stopPropagation(); overlay.remove(); };
  box.appendChild(msgEl);
  box.appendChild(okBtn);
  overlay.appendChild(box);
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
  setTimeout(() => okBtn.focus(), 10);
}

window.enterSiegeBattle = function(castleId) {
  console.log('[Siege] enterSiegeBattle 调用，castleId=', castleId);
  if (!castleId) return;
  const siegeMapId = 'siege_' + castleId;
  const allMaps = getAllMaps();
  if (!allMaps[siegeMapId]) { alert('找不到該城堡的攻城戰場'); return; }
  closeMapModal?.();
  const sidePage = document.getElementById('side-page');
  if (sidePage) sidePage.classList.remove('open');
  loadMap(siegeMapId);
};

window.addEventListener('load', init);

// ========== 測試鉤子（用於preflight驗證職業切換） ==========
window.__debugCreateChar = function(classId, name) {
  if (!name) name = '測試' + classId;
  // 先重置charCreateState為該職業屬性傾向
  if (window.__resetCharCreateStats) window.__resetCharCreateStats(classId);
  charCreateState.classId = classId;
  charCreateState.name = name;
  // 直接強行調用confirmCharCreate
  confirmCharCreate();
  const unit = worldLayer.querySelector('.world-unit.hero');
  const idleImg = unit?.querySelector('.sprite-frame-idle');
  const walk1 = unit?.querySelector('.sprite-frame-walk-1');
  return {
    classId: GS.player.classId,
    idle: idleImg?.src?.split('/').slice(-2).join('/'),
    walk1: walk1?.src?.split('/').slice(-2).join('/'),
  };
};
window.__debugVerifyAllClasses = function() {
  const classes = ['warrior','mage','archer','rogue','paladin'];
  const results = {};
  classes.forEach(cls => {
    const r = window.__debugCreateChar(cls);
    results[cls] = r;
  });
  console.log('========== 5職業創建-結果 ==========', results);
  return results;
};

})();

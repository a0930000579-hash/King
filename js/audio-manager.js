// ========== 音效管理系統（音檔播放模式） ==========
// BGM：HTML5 Audio 循環播放
// 戰鬥音效：HTML5 Audio 物件池播放音檔
// 首次使用者互動後解鎖音訊播放

const AudioManager = (() => {
  const AUDIO_VERSION = 'v5';

  // ========== BGM 檔案 URL ==========
  const BGM_URLS = {
    village: 'https://aka.doubaocdn.com/s/l2XjNd5AUm?v=' + AUDIO_VERSION,
    battle:  'https://aka.doubaocdn.com/s/UpWL2dPAVj?v=' + AUDIO_VERSION,
    siege:   'https://aka.doubaocdn.com/s/qcJzYgilvz?v=' + AUDIO_VERSION,
  };

  // ========== SFX 音效檔案 URL ==========
  const SFX_URLS = {
    slash:     'https://aka.doubaocdn.com/s/oS1d4hMpjd?v=' + AUDIO_VERSION,  // 近戰攻擊
    spell:     'https://aka.doubaocdn.com/s/bAjRcT9pYU?v=' + AUDIO_VERSION,  // 法術施放
    arrow:     'https://aka.doubaocdn.com/s/8xn9JbEggi?v=' + AUDIO_VERSION,  // 弓箭射擊
    hit:       'https://aka.doubaocdn.com/s/JYX4uK7GLU?v=' + AUDIO_VERSION,  // 受擊命中
    death:     'https://aka.doubaocdn.com/s/MKsNQTmTGd?v=' + AUDIO_VERSION,  // 死亡
    levelup:   'https://aka.doubaocdn.com/s/fre0af1kVd?v=' + AUDIO_VERSION,  // 升級
    gate_break:'https://aka.doubaocdn.com/s/3L0wL6IhE0?v=' + AUDIO_VERSION,  // 城門破壞
  };

  // ========== 配置 ==========
  const config = {
    sfxEnabled: true,
    musicEnabled: true,
    sfxVolume: 0.4,
    musicVolume: 0.25,
  };

  function loadConfig() {
    try {
      const saved = localStorage.getItem('gameAudioConfig');
      if (saved) Object.assign(config, JSON.parse(saved));
    } catch (e) {}
  }

  function saveConfig() {
    try {
      localStorage.setItem('gameAudioConfig', JSON.stringify(config));
    } catch (e) {}
  }

  // ========== BGM ==========
  let bgmAudio = null;
  let currentBgmType = null;

  function initBgm() {
    if (bgmAudio) return;
    bgmAudio = new Audio();
    bgmAudio.loop = true;
    bgmAudio.volume = config.musicVolume;
  }

  // ========== SFX 音效物件池 ==========
  const POOL_SIZE = 4; // 每種音效的物件池大小
  const sfxPools = {};

  function initSfxPools() {
    for (const key in SFX_URLS) {
      sfxPools[key] = [];
      for (let i = 0; i < POOL_SIZE; i++) {
        const a = new Audio(SFX_URLS[key]);
        a.preload = 'auto';
        a.volume = config.sfxVolume;
        sfxPools[key].push(a);
      }
      console.log('[AudioManager] SFX 已載入:', key, 'URL:', SFX_URLS[key]);
    }
  }

  function playSfxFromPool(key, volMultiplier = 1) {
    if (!config.sfxEnabled) return;
    const pool = sfxPools[key];
    if (!pool) {
      console.warn('[AudioManager] 未知音效:', key);
      return;
    }
    // 找一個閒置的 Audio 物件
    let audio = null;
    for (let i = 0; i < pool.length; i++) {
      if (pool[i].paused || pool[i].ended) {
        audio = pool[i];
        break;
      }
    }
    // 都在播放中 → 重置第一個
    if (!audio) {
      audio = pool[0];
      try { audio.pause(); } catch(e) {}
      try { audio.currentTime = 0; } catch(e) {}
    }
    audio.volume = config.sfxVolume * volMultiplier;
    const p = audio.play();
    if (p && p.then) {
      p.catch(err => {
        // 忽略自動播放限制錯誤
      });
    }
    return audio;
  }

  // ========== 首次互動解鎖 ==========
  let unlocked = false;

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    initBgm();
    initSfxPools();
  }

  function ensureUnlocked() {
    if (!unlocked) unlock();
  }

  // ========== BGM 播放 ==========
  function playBgm(type) {
    if (!config.musicEnabled) return;
    ensureUnlocked();
    if (currentBgmType === type && bgmAudio && !bgmAudio.paused) return;

    const url = BGM_URLS[type];
    if (!url) {
      console.warn('[AudioManager] 未知 BGM 類型:', type);
      return;
    }

    initBgm();

    // 淡出舊音樂
    if (bgmAudio && !bgmAudio.paused && currentBgmType !== type) {
      fadeOutBgm(0.5, () => {
        startNewBgm(type, url);
      });
    } else {
      startNewBgm(type, url);
    }
  }

  function startNewBgm(type, url) {
    currentBgmType = type;
    bgmAudio.src = url;
    bgmAudio.volume = 0;
    console.log('[AudioManager] 播放 BGM:', type, 'URL:', url);
    const p = bgmAudio.play();
    if (p && p.then) {
      p.then(() => {
        fadeInBgm(1.0, config.musicVolume);
      }).catch(err => {
        console.warn('[AudioManager] BGM 播放失敗:', type, err);
      });
    }
  }

  function stopBgm() {
    if (!bgmAudio) return;
    fadeOutBgm(0.8, () => {
      try { bgmAudio.pause(); } catch(e) {}
      currentBgmType = null;
    });
  }

  function fadeInBgm(duration, targetVol) {
    const start = performance.now();
    const startVol = bgmAudio.volume;
    function step(now) {
      const t = Math.min(1, (now - start) / (duration * 1000));
      bgmAudio.volume = startVol + (targetVol - startVol) * t;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function fadeOutBgm(duration, callback) {
    const start = performance.now();
    const startVol = bgmAudio.volume;
    function step(now) {
      const t = Math.min(1, (now - start) / (duration * 1000));
      bgmAudio.volume = Math.max(0, startVol * (1 - t));
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        if (callback) callback();
      }
    }
    requestAnimationFrame(step);
  }

  // ========== 根據地圖類型選擇 BGM ==========
  function getBgmTypeForMap(mapId) {
    const id = (mapId || '').toLowerCase();
    if (id.includes('siege') || id.includes('castle')) return 'siege';
    let map = null;
    if (typeof getAllMaps === 'function') {
      const allMaps = getAllMaps();
      map = allMaps[mapId];
    }
    if (map?.type === 'safe') return 'village';
    if (map?.type === 'castle_siege') return 'siege';
    return 'battle';
  }

  function startMusic(mapId) {
    const type = getBgmTypeForMap(mapId);
    playBgm(type);
  }

  function changeMapMusic(mapId) {
    startMusic(mapId);
  }

  // ========== 職業/技能到音效的映射 ==========
  function sfxNormalAttack(classId) {
    if (!config.sfxEnabled) return;
    ensureUnlocked();
    if (classId === 'mage' || classId === 'priest') {
      playSfxFromPool('spell');
    } else if (classId === 'archer') {
      playSfxFromPool('arrow');
    } else {
      playSfxFromPool('slash');
    }
  }

  function sfxSkill(skillId, classId) {
    if (!config.sfxEnabled) return;
    ensureUnlocked();
    if (skillId === 'arrow_rain' || classId === 'archer') {
      playSfxFromPool('arrow');
    } else if (classId === 'warrior' || skillId === 'slash' || skillId === 'whirlwind') {
      playSfxFromPool('slash');
    } else {
      playSfxFromPool('spell');
    }
  }

  function sfxCrit() {
    // 暴擊：命中音效 + 1.5倍音量
    playSfxFromPool('hit', 1.5);
  }

  function sfxHit() { playSfxFromPool('hit'); }
  function sfxDeath() { playSfxFromPool('death'); }
  function sfxLevelUp() { playSfxFromPool('levelup'); }
  function sfxKillMonster() { playSfxFromPool('death'); }
  function sfxBossAppear() { playSfxFromPool('spell'); }

  // 兼容 API（不播放 UI 點擊音效）
  function sfxClick() { /* 已移除 UI 點擊音效 */ }
  function sfxCoin() { playSfxFromPool('hit'); }
  function sfxGacha() { playSfxFromPool('spell'); }
  function sfxTransform() { playSfxFromPool('spell'); }
  function sfxPotion() { playSfxFromPool('hit'); }
  function sfxTest() { playSfxFromPool('slash'); }
  function sfxFlip() { playSfxFromPool('hit'); }

  // ========== 控制接口 ==========
  function setSfxEnabled(enabled) {
    config.sfxEnabled = enabled;
    saveConfig();
  }
  function setMusicEnabled(enabled) {
    config.musicEnabled = enabled;
    if (!enabled) {
      stopBgm();
    } else if (currentBgmType) {
      playBgm(currentBgmType);
    }
    saveConfig();
  }
  function setSfxVolume(v) {
    config.sfxVolume = Math.max(0, Math.min(1, v));
    // 更新所有音效物件的音量
    for (const key in sfxPools) {
      sfxPools[key].forEach(a => { a.volume = config.sfxVolume; });
    }
    saveConfig();
  }
  function setMusicVolume(v) {
    config.musicVolume = Math.max(0, Math.min(1, v));
    if (bgmAudio) bgmAudio.volume = config.musicVolume;
    saveConfig();
  }
  function getConfig() { return { ...config }; }

  function stopMusic() { stopBgm(); }

  // ========== 初始化 ==========
  loadConfig();

  // 全局首次點擊/按鍵解鎖
  function handleFirstInteraction() {
    unlock();
    document.removeEventListener('click', handleFirstInteraction, true);
    document.removeEventListener('keydown', handleFirstInteraction, true);
    document.removeEventListener('touchstart', handleFirstInteraction, true);
  }
  document.addEventListener('click', handleFirstInteraction, true);
  document.addEventListener('keydown', handleFirstInteraction, true);
  document.addEventListener('touchstart', handleFirstInteraction, true);

  console.log('[Audio] System initialized, sfx mode: audio-file, version: ' + AUDIO_VERSION);

  return {
    // 核心
    unlock,
    ensureRunning: unlock,
    init: unlock,
    // 音效
    sfxNormalAttack,
    sfxSkill,
    sfxCrit,
    sfxKillMonster,
    sfxLevelUp,
    sfxCoin,
    sfxGacha,
    sfxTransform,
    sfxPotion,
    sfxClick,
    sfxHit,
    sfxTest,
    sfxDeath,
    sfxBossAppear,
    sfxFlip,
    // 音樂
    startMusic,
    stopMusic,
    changeMapMusic,
    getMusicThemeForMap: getBgmTypeForMap,
    // 控制
    setSfxEnabled,
    setMusicEnabled,
    setSfxVolume,
    setMusicVolume,
    getConfig,
    // 直接播放
    playSfx: (key, volMult) => {
      if (!config.sfxEnabled) return;
      ensureUnlocked();
      switch (key) {
        case 'slash': playSfxFromPool('slash', volMult || 1); break;
        case 'spell': playSfxFromPool('spell', volMult || 1); break;
        case 'arrow': playSfxFromPool('arrow', volMult || 1); break;
        case 'hit': playSfxFromPool('hit', volMult || 1); break;
        case 'death': playSfxFromPool('death', volMult || 1); break;
        case 'levelup': playSfxFromPool('levelup', volMult || 1); break;
        case 'crit': sfxCrit(); break;
        case 'gate_break': playSfxFromPool('gate_break', volMult || 1); break;
      }
    },
    playBgm,
  };
})();

// 掛載到 window
window.AudioManager = AudioManager;

// 覆蓋 window.AudioSystem，讓所有舊的 AudioSystem.xxx 調用都使用新系統
(function() {
  const original = window.AudioSystem;
  window._originalAudioSystem = original;
  window.AudioSystem = AudioManager;
})();

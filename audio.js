// 游戏音频系统 - 使用 HTML5 Audio 播放外部音频文件
// 所有音效和背景音乐均为预录音频文件，不使用 Web Audio 合成

const AudioSystem = (() => {
  // ========== 音效 / BGM URL（全部 v5 版本）==========
  const AUDIO_URLS = {
    sfx: {
      melee:     'https://aka.doubaocdn.com/s/oS1d4hMpjd?v=5',   // 近戰攻擊
      spell:     'https://aka.doubaocdn.com/s/bAjRcT9pYU?v=5',   // 法術
      arrow:     'https://aka.doubaocdn.com/s/8xn9JbEggi?v=5',   // 弓箭
      hit:       'https://aka.doubaocdn.com/s/JYX4uK7GLU?v=5',   // 命中 / 受擊
      death:     'https://aka.doubaocdn.com/s/MKsNQTmTGd?v=5',   // 死亡
      levelup:   'https://aka.doubaocdn.com/s/fre0af1kVd?v=5',   // 升級
      gatebreak: 'https://aka.doubaocdn.com/s/3L0wL6IhE0?v=5',   // 城門破壞
      // 以下複用現有音效（從通用集合中選最接近的）
      crit:      'https://aka.doubaocdn.com/s/oS1d4hMpjd?v=5',   // 暴擊（複用近戰）
      coin:      'https://aka.doubaocdn.com/s/JYX4uK7GLU?v=5',   // 金幣（複用命中）
      gacha:     'https://aka.doubaocdn.com/s/fre0af1kVd?v=5',   // 抽卡（複用升級）
      transform: 'https://aka.doubaocdn.com/s/bAjRcT9pYU?v=5',   // 變身（複用法術）
      potion:    'https://aka.doubaocdn.com/s/JYX4uK7GLU?v=5',   // 藥水（複用命中）
      boss:      'https://aka.doubaocdn.com/s/3L0wL6IhE0?v=5',   // Boss登場（複用城門破壞）
    },
    bgm: {
      village:  'https://aka.doubaocdn.com/s/l2XjNd5AUm?v=5',    // 村莊
      battle:   'https://aka.doubaocdn.com/s/UpWL2dPAVj?v=5',    // 戰鬥
      siege:    'https://aka.doubaocdn.com/s/qcJzYgilvz?v=5',    // 攻城
    }
  };

  // ========== 配置 ==========
  const config = {
    sfxEnabled: true,
    musicEnabled: true,
    sfxVolume: 0.6,
    musicVolume: 0.5,
  };

  function loadConfig() {
    try {
      const saved = localStorage.getItem('gameAudioConfig');
      if (saved) {
        const c = JSON.parse(saved);
        // 只保留已知字段，避免舊版本雜項污染
        if ('sfxEnabled' in c) config.sfxEnabled = c.sfxEnabled;
        if ('musicEnabled' in c) config.musicEnabled = c.musicEnabled;
        if ('sfxVolume' in c) config.sfxVolume = c.sfxVolume;
        if ('musicVolume' in c) config.musicVolume = c.musicVolume;
      }
    } catch (e) {}
  }

  function saveConfig() {
    try {
      localStorage.setItem('gameAudioConfig', JSON.stringify(config));
    } catch (e) {}
  }

  // ========== 音效池（避免重複創建 Audio 物件）==========
  const sfxPool = {};
  const POOL_SIZE = 6; // 每個音效最多同時併發數

  function ensureSfxPool(name) {
    if (sfxPool[name]) return;
    const url = AUDIO_URLS.sfx[name];
    if (!url) return;
    sfxPool[name] = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const a = new Audio(url);
      a.preload = 'auto';
      a.volume = config.sfxVolume;
      sfxPool[name].push(a);
    }
  }

  function playSfxFromPool(name, volumeOverride = null) {
    if (!config.sfxEnabled) return;
    if (!initialized) init();
    if (!initialized) return; // 仍未初始化（用戶未交互）
    ensureSfxPool(name);
    const pool = sfxPool[name];
    if (!pool) return;
    // 找一個閒置的 Audio
    let audio = pool.find(a => a.paused || a.ended);
    if (!audio) {
      // 都在播放，取最舊的那個重置
      audio = pool[0];
      try { audio.pause(); audio.currentTime = 0; } catch (e) {}
    }
    audio.volume = volumeOverride !== null ? volumeOverride : config.sfxVolume;
    audio.play().catch(() => { /* 播放失敗靜默處理 */ });
  }

  // ========== BGM ==========
  let bgmAudio = null;
  let currentBgmName = null;

  function startBgm(name) {
    if (!config.musicEnabled) return;
    if (!initialized) init();
    if (!initialized) return;
    const url = AUDIO_URLS.bgm[name];
    if (!url) return;
    if (currentBgmName === name && bgmAudio && !bgmAudio.paused) return;

    // 停止舊的
    if (bgmAudio) {
      try { bgmAudio.pause(); } catch (e) {}
      bgmAudio = null;
    }

    bgmAudio = new Audio(url);
    bgmAudio.loop = true;
    bgmAudio.volume = config.musicVolume;
    currentBgmName = name;
    console.log('[Audio] Playing BGM:', name, url);
    bgmAudio.play().catch(() => {
      // 自動播放被阻止，等待首次用戶交互
      const resume = () => {
        if (bgmAudio) bgmAudio.play().catch(() => {});
        document.removeEventListener('pointerdown', resume);
        document.removeEventListener('keydown', resume);
      };
      document.addEventListener('pointerdown', resume, { once: true });
      document.addEventListener('keydown', resume, { once: true });
    });
  }

  function stopBgm() {
    if (bgmAudio) {
      try { bgmAudio.pause(); } catch (e) {}
      bgmAudio = null;
    }
    currentBgmName = null;
  }

  // ========== 初始化 ==========
  let initialized = false;

  function init() {
    if (initialized) return;
    // 用戶首次交互後才能建立 Audio
    initialized = true;

    // 預先建立各種音效的 Audio 池
    Object.keys(AUDIO_URLS.sfx).forEach(name => ensureSfxPool(name));

    console.log('[Audio] All audio URLs updated to v5');
    Object.entries(AUDIO_URLS.sfx).forEach(([k, v]) => {
      console.log(`[Audio] SFX ${k}: ${v}`);
    });
    Object.entries(AUDIO_URLS.bgm).forEach(([k, v]) => {
      console.log(`[Audio] BGM ${k}: ${v}`);
    });
  }

  // 首次用戶交互時自動初始化
  function ensureRunning() {
    if (!initialized) init();
  }

  // 綁定一次性交互事件，自動初始化
  function bindAutoInit() {
    const handler = () => {
      if (!initialized) init();
    };
    document.addEventListener('pointerdown', handler, { once: true });
    document.addEventListener('keydown', handler, { once: true });
    document.addEventListener('touchstart', handler, { once: true });
  }
  bindAutoInit();

  // ========== 各類音效接口（保持與 game.js 調用一致）==========

  function sfxNormalAttack(classId = 'warrior') {
    const meleeClasses = ['warrior', 'paladin', 'rogue', 'assassin'];
    const rangedClasses = ['archer'];
    const magicClasses = ['mage', 'warlock', 'elf_mage', 'dark_elf'];
    if (meleeClasses.includes(classId)) {
      playSfxFromPool('melee');
    } else if (rangedClasses.includes(classId)) {
      playSfxFromPool('arrow');
    } else if (magicClasses.includes(classId)) {
      playSfxFromPool('spell');
    } else {
      playSfxFromPool('melee');
    }
  }

  function sfxSkill(skillId, classId) {
    // 法術系技能播放法術音效，其他播放近戰
    const magicClasses = ['mage', 'warlock', 'elf_mage', 'dark_elf'];
    if (magicClasses.includes(classId)) {
      playSfxFromPool('spell');
    } else if (classId === 'archer') {
      playSfxFromPool('arrow');
    } else {
      playSfxFromPool('melee');
    }
  }

  function sfxCrit() { playSfxFromPool('crit'); }
  function sfxHit() { playSfxFromPool('hit'); }
  function sfxDeath() { playSfxFromPool('death'); }
  function sfxLevelUp() { playSfxFromPool('levelup'); }
  function sfxCoin() { playSfxFromPool('coin'); }
  function sfxGacha() { playSfxFromPool('gacha'); }
  function sfxTransform() { playSfxFromPool('transform'); }
  function sfxPotion() { playSfxFromPool('potion'); }
  function sfxKillMonster() { playSfxFromPool('hit'); }
  function sfxBossAppear() { playSfxFromPool('boss'); }
  function sfxTest() { playSfxFromPool('melee'); }
  function sfxClick() { return; } // UI 點擊音效完全移除

  // 通用播放（用於城門破壞等特殊音效）
  function playSfx(name) {
    if (AUDIO_URLS.sfx[name]) {
      playSfxFromPool(name);
    } else {
      // 直接當作完整音效名嘗試
      playSfxFromPool(name);
    }
  }

  // ========== 地圖對應 BGM ==========
  function getMusicThemeForMap(mapId) {
    // 根據地圖 id 回傳 BGM 名稱
    if (!mapId) return 'village';
    if (mapId.startsWith('siege_')) return 'siege';
    if (mapId.includes('battle') || mapId.includes('hunt') || mapId.includes('dungeon') || mapId.includes('cave')) return 'battle';
    return 'village';
  }

  function startMusic(mapId) {
    const theme = getMusicThemeForMap(mapId);
    if (theme === currentBgmName && bgmAudio && !bgmAudio.paused) return;
    startBgm(theme);
  }

  function stopMusic() { stopBgm(); }

  function changeMapMusic(mapId) {
    if (currentBgmName && bgmAudio && !bgmAudio.paused) {
      stopBgm();
      setTimeout(() => startMusic(mapId), 300);
    } else {
      startMusic(mapId);
    }
  }

  // ========== 控制接口 ==========
  function setSfxEnabled(enabled) {
    config.sfxEnabled = enabled;
    saveConfig();
  }

  function setMusicEnabled(enabled) {
    config.musicEnabled = enabled;
    if (enabled) {
      if (typeof GS !== 'undefined' && GS.currentMap) {
        startMusic(GS.currentMap);
      }
    } else {
      stopBgm();
    }
    saveConfig();
  }

  function setSfxVolume(vol) {
    config.sfxVolume = Math.max(0, Math.min(1, vol));
    // 更新所有音效池的音量
    Object.values(sfxPool).forEach(pool => {
      pool.forEach(a => { a.volume = config.sfxVolume; });
    });
    saveConfig();
  }

  function setMusicVolume(vol) {
    config.musicVolume = Math.max(0, Math.min(1, vol));
    if (bgmAudio) bgmAudio.volume = config.musicVolume;
    saveConfig();
  }

  function getConfig() {
    return { ...config };
  }

  // ========== 啟動 ==========
  loadConfig();

  return {
    init,
    ensureRunning,
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
    playSfx,
    // 音樂
    startMusic,
    stopMusic,
    changeMapMusic,
    getMusicThemeForMap,
    // 控制
    setSfxEnabled,
    setMusicEnabled,
    setSfxVolume,
    setMusicVolume,
    getConfig,
  };
})();

window.AudioSystem = AudioSystem;

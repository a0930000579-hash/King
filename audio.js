// 游戏音频系统 - 使用 Web Audio API 生成所有音效和背景音乐
// 所有声音均由 OscillatorNode / GainNode / BufferSourceNode 等合成，无外部音频文件

const AudioSystem = (() => {
  let ctx = null;
  let masterGain = null;
  let sfxGain = null;
  let musicGain = null;
  
  // 当前背景音乐相关
  let currentMusicType = null;
  let musicNodes = [];
  let musicTimer = null;
  let musicStarted = false;
  
  // 配置（从 localStorage 读取，默认开启）
  const config = {
    sfxEnabled: true,
    musicEnabled: true,
    sfxVolume: 0.7,
    musicVolume: 0.4,
  };
  // 从 localStorage 加载配置
  function loadConfig() {
    try {
      const saved = localStorage.getItem('gameAudioConfig');
      if (saved) {
        const c = JSON.parse(saved);
        Object.assign(config, c);
      }
    } catch (e) {}
  }
  
  function saveConfig() {
    try {
      localStorage.setItem('gameAudioConfig', JSON.stringify(config));
    } catch (e) {}
  }

  // 初始化 AudioContext（需要用户交互后调用，避免浏览器自动播放限制）
  function init() {
    if (ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      
      masterGain = ctx.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(ctx.destination);
      
      sfxGain = ctx.createGain();
      sfxGain.gain.value = config.sfxEnabled ? config.sfxVolume : 0;
      sfxGain.connect(masterGain);
      
      musicGain = ctx.createGain();
      musicGain.gain.value = config.musicEnabled ? config.musicVolume : 0;
      musicGain.connect(masterGain);
    } catch (e) {
      console.warn('Web Audio not supported', e);
    }
  }

  // 确保 ctx 已启动（用户第一次交互后调用 resume）
  function ensureRunning() {
    if (!ctx) init();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  // ============ 工具函数 ============
  
  // 创建包络（ADSR，但多用于快速衰减的攻击音）
  function envGain(dest, attack, decay, sustain, release, peak = 1) {
    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(peak, now + attack);
    g.gain.linearRampToValueAtTime(peak * sustain, now + attack + decay);
    g.connect(dest);
    return { node: g, release: (r = release) => {
      const t = ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + r);
      setTimeout(() => g.disconnect(), r * 1000 + 50);
    }};
  }

  // 生成白噪声 buffer
  function createNoiseBuffer(duration = 1) {
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * duration);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  // 快速包络音（短促冲击）
  function quickImpact(freqStart, freqEnd, duration, type = 'sine', volume = 0.5, dest) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(volume, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(g);
    g.connect(dest || sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // ============ 音效：普通攻击 ============
  function sfxNormalAttack(classId = 'warrior') {
    if (!config.sfxEnabled || !ctx) return;
    ensureRunning();
    
    switch (classId) {
      case 'warrior':
      case 'paladin':
        // 金属斩击声
        quickImpact(1800, 400, 0.08, 'sawtooth', 0.15);
        quickImpact(3000, 1200, 0.06, 'square', 0.08);
        // 加一点噪声模拟刀锋划过
        noiseBurst(0.05, 2000, 8000, 0.1);
        break;
      case 'mage':
      case 'warlock':
        // 魔法飞弹
        quickImpact(800, 200, 0.12, 'sine', 0.2);
        quickImpact(1200, 400, 0.1, 'triangle', 0.12);
        break;
      case 'archer':
        // 弓箭射击：弓弦+箭矢飞行
        quickImpact(600, 150, 0.15, 'triangle', 0.2);
        noiseBurst(0.1, 1500, 4000, 0.08, 'highpass');
        break;
      case 'rogue':
      case 'assassin':
        // 匕首快速切割
        quickImpact(2500, 800, 0.05, 'sawtooth', 0.12);
        noiseBurst(0.04, 3000, 6000, 0.08);
        break;
      default:
        quickImpact(1200, 300, 0.08, 'sawtooth', 0.15);
    }
  }

  // 噪声爆破音
  function noiseBurst(duration, freqLow, freqHigh, volume = 0.2, filterType = 'bandpass', dest) {
    if (!ctx) return;
    const buf = createNoiseBuffer(duration);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    
    let filter;
    if (filterType === 'bandpass') {
      filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = (freqLow + freqHigh) / 2;
      filter.Q.value = 1;
    } else if (filterType === 'highpass') {
      filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = freqLow;
    } else {
      filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = freqHigh;
    }
    
    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(volume, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    src.connect(filter);
    filter.connect(g);
    g.connect(dest || sfxGain);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  // ============ 音效：技能释放 ============
  function sfxSkill(skillId, classId) {
    if (!config.sfxEnabled || !ctx) return;
    ensureRunning();
    
    const cls = classId || 'warrior';
    
    // 按职业分类技能音效
    switch (cls) {
      case 'warrior':
        // 沉重的金属挥砍
        quickImpact(400, 80, 0.2, 'sawtooth', 0.2);
        quickImpact(200, 50, 0.25, 'square', 0.15);
        noiseBurst(0.15, 100, 2000, 0.12, 'lowpass');
        break;
      case 'mage':
        // 魔法能量爆发
        quickImpact(300, 1200, 0.3, 'sine', 0.18);
        quickImpact(600, 2000, 0.25, 'triangle', 0.15);
        // 闪光音
        setTimeout(() => {
          quickImpact(2000, 800, 0.1, 'sine', 0.12);
        }, 150);
        break;
      case 'archer':
        // 弓弦释放+多箭
        quickImpact(700, 200, 0.12, 'triangle', 0.2);
        noiseBurst(0.15, 2000, 5000, 0.1, 'highpass');
        setTimeout(() => {
          quickImpact(900, 250, 0.1, 'triangle', 0.12);
        }, 80);
        break;
      case 'rogue':
      case 'assassin':
        // 快速匕首连击
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            quickImpact(2000, 600, 0.04, 'sawtooth', 0.12);
            noiseBurst(0.03, 2500, 5000, 0.06);
          }, i * 50);
        }
        break;
      case 'paladin':
        // 神圣钟声+光环
        quickImpact(800, 400, 0.5, 'sine', 0.18);
        quickImpact(1200, 600, 0.4, 'sine', 0.12);
        quickImpact(1600, 800, 0.3, 'sine', 0.08);
        break;
      case 'warlock':
        // 暗影低语
        noiseBurst(0.4, 100, 800, 0.15, 'lowpass');
        quickImpact(150, 80, 0.5, 'sawtooth', 0.1);
        quickImpact(300, 150, 0.4, 'triangle', 0.08);
        break;
      case 'priest':
        // 治疗音
        quickImpact(400, 800, 0.3, 'sine', 0.18);
        quickImpact(600, 1200, 0.25, 'sine', 0.12);
        break;
      default:
        quickImpact(800, 200, 0.2, 'sine', 0.18);
    }
  }

  // ============ 音效：暴击 ============
  function sfxCrit() {
    if (!config.sfxEnabled || !ctx) return;
    ensureRunning();
    // 更响亮的冲击+金属回响
    quickImpact(600, 100, 0.25, 'sawtooth', 0.28);
    quickImpact(150, 50, 0.3, 'square', 0.2);
    noiseBurst(0.2, 200, 3000, 0.18, 'bandpass');
    // 金属回响
    setTimeout(() => {
      quickImpact(1200, 600, 0.15, 'sine', 0.1);
    }, 30);
  }

  // ============ 音效：击杀怪物 ============
  function sfxKillMonster() {
    if (!config.sfxEnabled || !ctx) return;
    ensureRunning();
    // 低沉的击杀音效
    quickImpact(200, 60, 0.3, 'sawtooth', 0.2);
    quickImpact(100, 40, 0.35, 'square', 0.15);
    noiseBurst(0.25, 80, 800, 0.12, 'lowpass');
  }

  // ============ 音效：升级 ============
  function sfxLevelUp() {
    if (!config.sfxEnabled || !ctx) return;
    ensureRunning();
    // 欢快的上升音阶 (C Major 琶音)
    const notes = [523, 659, 784, 1047, 1319]; // C5 E5 G5 C6 E6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        quickImpact(freq, freq * 1.05, 0.15, 'sine', 0.18);
        quickImpact(freq * 2, freq * 2, 0.1, 'sine', 0.06);
      }, i * 70);
    });
    // 结尾闪光
    setTimeout(() => {
      quickImpact(2000, 1000, 0.2, 'sine', 0.12);
    }, notes.length * 70 + 50);
  }

  // ============ 音效：金币 ============
  function sfxCoin() {
    if (!config.sfxEnabled || !ctx) return;
    ensureRunning();
    // 清脆的金币声 - 高频短促
    quickImpact(1800, 1200, 0.08, 'square', 0.12);
    quickImpact(2400, 1800, 0.06, 'sine', 0.1);
    setTimeout(() => {
      quickImpact(1600, 1000, 0.07, 'triangle', 0.08);
    }, 40);
  }

  // ============ 音效：抽卡 ============
  function sfxGacha() {
    if (!config.sfxEnabled || !ctx) return;
    ensureRunning();
    // 神秘魔法音效 - 上升和弦
    const notes = [220, 277, 330, 440, 554]; // A3 C#4 E4 A4 C#5 神秘小调
    notes.forEach((freq, i) => {
      setTimeout(() => {
        quickImpact(freq, freq * 1.5, 0.4, 'sine', 0.1);
      }, i * 80);
    });
    setTimeout(() => {
      quickImpact(880, 1760, 0.3, 'sine', 0.15);
      quickImpact(1320, 2640, 0.25, 'triangle', 0.1);
    }, notes.length * 80);
  }

  // ============ 音效：变身 ============
  function sfxTransform() {
    if (!config.sfxEnabled || !ctx) return;
    ensureRunning();
    // 史诗级变身音效 - 上升和弦+能量爆发
    const chords = [
      [131, 165, 196], // C3 E3 G3
      [175, 220, 262], // F3 A3 C4
      [196, 247, 294], // G3 B3 D4
      [262, 330, 392], // C4 E4 G4
    ];
    chords.forEach((chord, ci) => {
      setTimeout(() => {
        chord.forEach(freq => {
          quickImpact(freq, freq * 1.2, 0.5, 'sawtooth', 0.08);
          quickImpact(freq * 2, freq * 2.2, 0.3, 'sine', 0.06);
        });
      }, ci * 120);
    });
    // 能量爆发
    setTimeout(() => {
      noiseBurst(0.4, 100, 5000, 0.2, 'bandpass');
      quickImpact(100, 2000, 0.5, 'sawtooth', 0.15);
    }, chords.length * 120);
  }

  // ============ 音效：喝药水 ============
  function sfxPotion() {
    if (!config.sfxEnabled || !ctx) return;
    ensureRunning();
    // 饮水声 - 气泡音
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        quickImpact(300 + Math.random() * 200, 100, 0.06, 'sine', 0.1);
      }, i * 40);
    }
    noiseBurst(0.2, 200, 800, 0.08, 'lowpass');
  }

  // ============ 音效：按钮点击 ============
  function sfxClick() {
    if (!config.sfxEnabled || !ctx) return;
    ensureRunning();
    quickImpact(800, 500, 0.05, 'square', 0.12);
  }

  // ============ 音效：死亡 ============
  function sfxDeath() {
    if (!config.sfxEnabled || !ctx) return;
    ensureRunning();
    // 低沉下降音
    quickImpact(200, 50, 0.8, 'sawtooth', 0.25);
    quickImpact(100, 30, 1, 'sine', 0.15);
    noiseBurst(0.6, 50, 500, 0.15, 'lowpass');
  }

  // ============ 音效：Boss出现 ============
  function sfxBossAppear() {
    if (!config.sfxEnabled || !ctx) return;
    ensureRunning();
    // 威严号角
    const notes = [220, 277, 330, 277, 220, 165, 220];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        quickImpact(freq, freq * 1.02, 0.4, 'sawtooth', 0.2);
        quickImpact(freq / 2, freq / 2 * 1.02, 0.4, 'square', 0.12);
      }, i * 150);
    });
    // 低频轰鸣
    noiseBurst(1.5, 50, 200, 0.15, 'lowpass');
  }

  // ============ 背景音乐系统 ============
  
  // 音乐主题 - 各地图风格不同，使用不同的音阶、音色和节奏
  const MUSIC_THEMES = {
    village: {
      name: 'village',
      type: 'safe',
      scale: [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25], // C大调
      tempo: 0.7, // 每分钟节拍换算成秒
      melodyType: 'harp',
      drumType: 'soft',
      mood: 'peaceful',
    },
    lowBattle: {
      name: 'lowBattle',
      type: 'battle',
      scale: [220, 246.94, 261.63, 293.66, 329.63, 349.23, 392, 440], // A小调
      tempo: 0.5,
      melodyType: 'strings',
      drumType: 'medium',
      mood: 'adventure',
    },
    midBattle: {
      name: 'midBattle',
      type: 'battle',
      scale: [196, 220, 233.08, 261.63, 293.66, 311.13, 349.23, 392], // G小调
      tempo: 0.38,
      melodyType: 'brass',
      drumType: 'heavy',
      mood: 'tense',
    },
    highBattle: {
      name: 'highBattle',
      type: 'battle',
      scale: [174.61, 196, 207.65, 233.08, 261.63, 277.18, 311.13, 349.23], // F小调 史诗
      tempo: 0.32,
      melodyType: 'epic',
      drumType: 'war',
      mood: 'epic',
    },
    castle: {
      name: 'castle',
      type: 'siege',
      scale: [164.81, 185, 196, 220, 246.94, 261.63, 293.66, 329.63], // E小调 庄严
      tempo: 0.4,
      melodyType: 'horn',
      drumType: 'war',
      mood: 'majestic',
    },
    boss: {
      name: 'boss',
      type: 'boss',
      scale: [138.59, 155.56, 164.81, 185, 196, 220, 233.08, 261.63], // C#小调 紧张
      tempo: 0.25,
      melodyType: 'boss',
      drumType: 'boss',
      mood: 'intense',
    },
  };

  // 根据地图 ID 获取音乐主题
  function getMusicThemeForMap(mapId) {
    const id = (mapId || '').toLowerCase();
    
    // 攻城战地图
    if (id.includes('siege') || id.includes('castle')) return MUSIC_THEMES.castle;
    
    // 尝试通过 getAllMaps 获取地图信息
    let map = null;
    if (typeof getAllMaps === 'function') {
      const allMaps = getAllMaps();
      map = allMaps[mapId];
    }
    
    // 安全地图：村庄
    if (map?.type === 'safe') return MUSIC_THEMES.village;
    if (id.includes('village') || id.includes('town') || id.includes('city')) return MUSIC_THEMES.village;
    
    // 战斗地图：按等级分级
    if (map?.type === 'battle') {
      const levelMin = map.levelMin || 1;
      const levelMax = map.levelMax || 10;
      const avgLevel = (levelMin + levelMax) / 2;
      if (avgLevel >= 50) return MUSIC_THEMES.highBattle;
      if (avgLevel >= 20) return MUSIC_THEMES.midBattle;
      return MUSIC_THEMES.lowBattle;
    }
    
    // 攻城地图
    if (map?.type === 'castle_siege') return MUSIC_THEMES.castle;
    
    // 根据地图ID关键词大致推断
    if (id.includes('dragon') || id.includes('valley') || id.includes('cave') || id.includes('desert')) return MUSIC_THEMES.highBattle;
    if (id.includes('forest') || id.includes('graveyard') || id.includes('swamp')) return MUSIC_THEMES.midBattle;
    if (id.includes('field') || id.includes('plain') || id.includes('grass')) return MUSIC_THEMES.lowBattle;
    
    return MUSIC_THEMES.village;
  }

  // 生成旋律音符序列（伪随机但符合音阶）
  function generateMelody(theme, barLen = 8) {
    const scale = theme.scale;
    const notes = [];
    // 使用简单的模式生成，避免完全随机
    const patterns = [
      [0, 2, 4, 2, 5, 4, 2, 0],
      [4, 2, 0, 2, 4, 5, 7, 5],
      [0, 4, 2, 5, 4, 7, 5, 4],
      [7, 5, 4, 2, 0, 2, 4, 5],
      [2, 4, 5, 7, 5, 4, 2, 0],
      [0, 1, 2, 4, 5, 4, 2, 1],
    ];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    for (let i = 0; i < barLen; i++) {
      const idx = pattern[i % pattern.length];
      notes.push(scale[idx % scale.length]);
    }
    return notes;
  }

  // 生成低音线
  function generateBass(theme, barLen = 8) {
    const scale = theme.scale;
    const bassNotes = [];
    // 根音进行：I - VI - IV - V
    const progression = [0, 5, 3, 4];
    for (let i = 0; i < barLen; i++) {
      const idx = progression[Math.floor(i / 2) % progression.length];
      bassNotes.push(scale[idx] / 2);
    }
    return bassNotes;
  }

  // 播放一个音符
  function playNote(freq, startTime, duration, type = 'sine', volume = 0.1, dest) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    
    // ADSR
    const attack = 0.02;
    const decay = 0.1;
    const sustain = 0.7;
    const release = 0.05;
    
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(volume, startTime + attack);
    g.gain.linearRampToValueAtTime(volume * sustain, startTime + attack + decay);
    g.gain.setValueAtTime(volume * sustain, startTime + duration - release);
    g.gain.linearRampToValueAtTime(0, startTime + duration);
    
    osc.connect(g);
    g.connect(dest || musicGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
    musicNodes.push(osc);
  }

  // 播放鼓点
  function playDrum(startTime, type = 'kick', volume = 0.1) {
    if (!ctx) return;
    if (type === 'kick') {
      // 底鼓：低频快速下降
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, startTime);
      osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.15);
      g.gain.setValueAtTime(0, startTime);
      g.gain.linearRampToValueAtTime(volume, startTime + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
      osc.connect(g);
      g.connect(musicGain);
      osc.start(startTime);
      osc.stop(startTime + 0.2);
      musicNodes.push(osc);
    } else if (type === 'snare') {
      // 军鼓：噪声+中频
      noiseBurstAtTime(startTime, 0.1, 1500, 4000, volume * 0.8, 'highpass');
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 200;
      g.gain.setValueAtTime(0, startTime);
      g.gain.linearRampToValueAtTime(volume * 0.5, startTime + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
      osc.connect(g);
      g.connect(musicGain);
      osc.start(startTime);
      osc.stop(startTime + 0.12);
      musicNodes.push(osc);
    } else if (type === 'hihat') {
      // 镲：高频噪声
      noiseBurstAtTime(startTime, 0.05, 6000, 12000, volume * 0.4, 'highpass');
    }
  }

  // 指定时间播放噪声
  function noiseBurstAtTime(startTime, duration, freqLow, freqHigh, volume, filterType) {
    if (!ctx) return;
    const buf = createNoiseBuffer(duration + 0.1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    
    const filter = ctx.createBiquadFilter();
    filter.type = filterType === 'highpass' ? 'highpass' : 
                   filterType === 'lowpass' ? 'lowpass' : 'bandpass';
    filter.frequency.value = filterType === 'bandpass' ? (freqLow + freqHigh) / 2 : 
                             filterType === 'highpass' ? freqLow : freqHigh;
    
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(volume, startTime + 0.002);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    src.connect(filter);
    filter.connect(g);
    g.connect(musicGain);
    src.start(startTime);
    src.stop(startTime + duration + 0.02);
    musicNodes.push(src);
  }

  // 播放一段完整音乐小节
  function playBar(theme, startTime) {
    if (!ctx || !config.musicEnabled) return;
    
    const tempo = theme.tempo; // 每拍秒数
    const beats = 8;
    const melody = generateMelody(theme, beats);
    const bass = generateBass(theme, beats);
    
    // 根据旋律类型选择音色
    let melodyType = 'sine';
    let melodyVol = 0.08;
    let bassType = 'sine';
    let bassVol = 0.06;
    
    switch (theme.melodyType) {
      case 'harp': // 竖琴 - 村庄
        melodyType = 'triangle';
        melodyVol = 0.1;
        bassType = 'sine';
        bassVol = 0.05;
        break;
      case 'strings': // 弦乐 - 低级战斗
        melodyType = 'sawtooth';
        melodyVol = 0.07;
        bassType = 'sawtooth';
        bassVol = 0.05;
        break;
      case 'brass': // 铜管 - 中级
        melodyType = 'square';
        melodyVol = 0.06;
        bassType = 'square';
        bassVol = 0.05;
        break;
      case 'epic': // 史诗 - 高级
        melodyType = 'sawtooth';
        melodyVol = 0.08;
        bassType = 'sawtooth';
        bassVol = 0.06;
        break;
      case 'horn': // 号角 - 城堡
        melodyType = 'square';
        melodyVol = 0.07;
        bassType = 'square';
        bassVol = 0.05;
        break;
      case 'boss': // Boss
        melodyType = 'sawtooth';
        melodyVol = 0.09;
        bassType = 'sawtooth';
        bassVol = 0.07;
        break;
      default:
        melodyType = 'sine';
    }
    
    // 播放旋律
    for (let i = 0; i < beats; i++) {
      const t = startTime + i * tempo;
      // 长音少一点，短音多一点
      const noteLen = tempo * 0.9;
      playNote(melody[i], t, noteLen, melodyType, melodyVol);
      // 副旋律（高八度），仅在部分拍子上
      if (i % 2 === 0 && theme.mood !== 'peaceful') {
        playNote(melody[i] * 2, t, noteLen * 0.6, 'sine', melodyVol * 0.3);
      }
    }
    
    // 播放低音
    for (let i = 0; i < beats; i++) {
      const t = startTime + i * tempo;
      if (i % 2 === 0) {
        playNote(bass[i], t, tempo * 1.8, bassType, bassVol);
      }
    }
    
    // 鼓点
    if (theme.drumType !== 'soft') {
      for (let i = 0; i < beats; i++) {
        const t = startTime + i * tempo;
        // 底鼓在1,3,5,7拍 (偶数索引)
        if (i % 2 === 0) {
          const kickVol = theme.drumType === 'war' || theme.drumType === 'boss' ? 0.12 : 0.08;
          playDrum(t, 'kick', kickVol);
        }
        // 军鼓在2,4,6,8拍
        if (i % 2 === 1 && theme.drumType !== 'soft') {
          const snareVol = theme.drumType === 'boss' ? 0.08 : 0.05;
          playDrum(t, 'snare', snareVol);
        }
        // hihat 每拍
        if (theme.drumType === 'heavy' || theme.drumType === 'war' || theme.drumType === 'boss') {
          playDrum(t, 'hihat', 0.03);
          // 反拍
          playDrum(t + tempo / 2, 'hihat', 0.02);
        }
      }
    } else {
      // soft模式：轻柔的鼓声
      for (let i = 0; i < beats; i++) {
        const t = startTime + i * tempo;
        if (i % 4 === 0) {
          playDrum(t, 'kick', 0.04);
        }
      }
    }
    
    // Boss音乐：额外的低沉音效
    if (theme.type === 'boss') {
      noiseBurstAtTime(startTime, tempo * 4, 60, 300, 0.04, 'lowpass');
    }
    
    return beats * tempo;
  }

  // 开始播放背景音乐
  function startMusic(mapId) {
    if (!ctx || !config.musicEnabled) return;
    ensureRunning();
    
    const theme = getMusicThemeForMap(mapId);
    if (theme.name === currentMusicType && musicStarted) return; // 相同主题不重启
    
    // 停止旧音乐
    stopMusic();
    
    currentMusicType = theme.name;
    musicStarted = true;
    
    // 淡入
    const targetVol = config.musicVolume;
    musicGain.gain.setValueAtTime(0, ctx.currentTime);
    musicGain.gain.linearRampToValueAtTime(targetVol, ctx.currentTime + 1.5);
    
    // 循环播放音乐小节
    function loopBar() {
      if (!musicStarted || !config.musicEnabled) return;
      const now = ctx.currentTime;
      const barDuration = playBar(theme, now + 0.05);
      if (!barDuration) return;
      musicTimer = setTimeout(loopBar, barDuration * 1000 - 50);
    }
    loopBar();
  }

  // 停止背景音乐
  function stopMusic() {
    musicStarted = false;
    if (musicTimer) {
      clearTimeout(musicTimer);
      musicTimer = null;
    }
    // 淡出
    if (musicGain && ctx) {
      const now = ctx.currentTime;
      const current = musicGain.gain.value;
      musicGain.gain.cancelScheduledValues(now);
      musicGain.gain.setValueAtTime(current, now);
      musicGain.gain.linearRampToValueAtTime(0, now + 0.8);
    }
    // 清理节点
    setTimeout(() => {
      musicNodes.forEach(n => {
        try { n.stop(); n.disconnect(); } catch (e) {}
      });
      musicNodes = [];
    }, 1000);
    currentMusicType = null;
  }

  // 切换地图时换音乐（带淡入淡出）
  function changeMapMusic(mapId) {
    if (!config.musicEnabled) return;
    if (currentMusicType && musicStarted) {
      // 先淡出旧音乐
      stopMusic();
      setTimeout(() => {
        startMusic(mapId);
      }, 800);
    } else {
      startMusic(mapId);
    }
  }

  // ============ 控制接口 ============
  
  function setSfxEnabled(enabled) {
    config.sfxEnabled = enabled;
    if (sfxGain) {
      sfxGain.gain.value = enabled ? config.sfxVolume : 0;
    }
    saveConfig();
  }
  
  function setMusicEnabled(enabled) {
    config.musicEnabled = enabled;
    if (musicGain && ctx) {
      const now = ctx.currentTime;
      const target = enabled ? config.musicVolume : 0;
      musicGain.gain.cancelScheduledValues(now);
      musicGain.gain.setValueAtTime(musicGain.gain.value, now);
      musicGain.gain.linearRampToValueAtTime(target, now + 0.5);
    }
    if (enabled && !musicStarted && typeof GS !== 'undefined') {
      startMusic(GS.currentMap);
    }
    if (!enabled) {
      stopMusic();
    }
    saveConfig();
  }
  
  function setSfxVolume(vol) {
    config.sfxVolume = Math.max(0, Math.min(1, vol));
    if (sfxGain && config.sfxEnabled) {
      sfxGain.gain.value = config.sfxVolume;
    }
    saveConfig();
  }
  
  function setMusicVolume(vol) {
    config.musicVolume = Math.max(0, Math.min(1, vol));
    if (musicGain && config.musicEnabled) {
      musicGain.gain.value = config.musicVolume;
    }
    saveConfig();
  }
  
  function getConfig() {
    return { ...config };
  }

  // 初始化
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
    sfxDeath,
    sfxBossAppear,
    // 音乐
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

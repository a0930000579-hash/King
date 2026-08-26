// ==================== 變身抽卡系統 ====================
// 30種變身形態（每品質5種），採抽卡獲取模式

const TRANSFORM_ICONS = {
  // 白色 5種
  wolf:      '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfq7ekgbw_ve_miaoda',
  guardian:  '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfrpna4bw_ve_miaoda',
  berserker: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfrci5egw_ve_miaoda',
  goblin:    '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfs7mfuhu_ve_miaoda',
  skeleton:  '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfsl32kdu_ve_miaoda',
  // 綠色 5種
  blade:     '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfs34tstw_ve_miaoda',
  shadow:    '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrftp3eqpu_ve_miaoda',
  knight:    '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrftm5eshw_ve_miaoda',
  elfranger: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfpvoqecu_ve_miaoda',
  dwarf:     '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfqj3ioew_ve_miaoda',
  // 藍色 5種
  fireknight:  '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfo6tm2du_ve_miaoda',
  icemage:     '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfoee3uaw_ve_miaoda',
  windwalker:  '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfrk26ybs_ve_miaoda',
  paladin:     '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrftm5eshw_ve_miaoda',
  orcshaman:   '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfqh7dkfw_ve_miaoda',
  // 紅色 5種
  deathknight: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfs5eiyru_ve_miaoda',
  demonhunter: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrftnde4bs_ve_miaoda',
  darklord:    '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfrob2acs_ve_miaoda',
  vampire:     '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfqjgryaw_ve_miaoda',
  darkmage:    '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfrob2acs_ve_miaoda',
  // 紫色 5種
  dragonknight: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfrowjojs_ve_miaoda',
  archmage:     '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfrzafyjw_ve_miaoda',
  phoenix:      '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfroybqlu_ve_miaoda',
  lichking:     '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfree5wmw_ve_miaoda',
  darkangel:    '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfnkcb4ru_ve_miaoda',
  // 金色 5種
  emperor:    '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfrzafykw_ve_miaoda',
  godofwar:   '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfroybqku_ve_miaoda',
  absolute:   '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfqip3wes_ve_miaoda',
  golddragon: '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrftfgucbs_ve_miaoda',
  saint:      '/spark/app/app_17ch22wujxs/runtime/api/v1/storage/object/bucket_aadkq5g4dkmew_static/static%2Faadkrfrewywhu_ve_miaoda',
};

const TRANSFORM_POOL = [
  // ===== 白色（普通）5種 =====
  { id: 'tf_wolf',      name: '銀月戰狼',   rarity: 'white',  iconKey: 'wolf',      type: '力量型', desc: '來自森林的強大戰狼，具備鋒利的爪牙',     stats: { atk: 5,  def: 3,  hpMax: 20,  crit: 1 } },
  { id: 'tf_guardian',  name: '王庭守衛',   rarity: 'white',  iconKey: 'guardian',  type: '體質型', desc: '忠誠的王庭守衛，精通防禦格擋',         stats: { atk: 3,  def: 8,  hpMax: 50,  crit: 0 } },
  { id: 'tf_berserker', name: '野蠻戰士',   rarity: 'white',  iconKey: 'berserker', type: '力量型', desc: '來自北方蠻族的狂暴戰士',               stats: { atk: 10, def: 2,  hpMax: 15,  crit: 2 } },
  { id: 'tf_goblin',    name: '哥布林薩滿', rarity: 'white',  iconKey: 'goblin',    type: '智力型', desc: '會使用原始法術的哥布林薩滿',           stats: { atk: 4,  def: 2,  hpMax: 18,  mpMax: 20 } },
  { id: 'tf_skeleton',  name: '骷髏戰士',   rarity: 'white',  iconKey: 'skeleton',  type: '敏捷型', desc: '從墓地復活的不死骷髏，行動迅速',       stats: { atk: 6,  def: 2,  hpMax: 25,  crit: 3 } },

  // ===== 綠色（高級）5種 =====
  { id: 'tf_blade',      name: '利刃劍士',  rarity: 'green',  iconKey: 'blade',      type: '力量型', desc: '雙刀如風的劍客，揮舞之間敵首落地',   stats: { atk: 20, def: 5,  hpMax: 40,  crit: 3 } },
  { id: 'tf_shadow',     name: '暗影刺客',  rarity: 'green',  iconKey: 'shadow',     type: '敏捷型', desc: '行走在陰影中的暗殺者',               stats: { atk: 18, def: 3,  hpMax: 25,  crit: 8 } },
  { id: 'tf_silverknt',  name: '銀甲騎士',  rarity: 'green',  iconKey: 'knight',     type: '體質型', desc: '身披銀甲的正義騎士',                 stats: { atk: 12, def: 15, hpMax: 100, crit: 1 } },
  { id: 'tf_elfranger',  name: '精靈遊俠',  rarity: 'green',  iconKey: 'elfranger',  type: '敏捷型', desc: '精靈族的森林守護者，箭無虛發',       stats: { atk: 16, def: 4,  hpMax: 35,  crit: 6 } },
  { id: 'tf_dwarfsmith', name: '矮人鐵匠',  rarity: 'green',  iconKey: 'dwarf',      type: '體質型', desc: '矮人鐵匠，揮動戰錘有萬鈞之力',       stats: { atk: 14, def: 12, hpMax: 80,  crit: 2 } },

  // ===== 藍色（稀有）5種 =====
  { id: 'tf_fireknight', name: '炎龍騎士',  rarity: 'blue',   iconKey: 'fireknight', type: '力量型', desc: '駕馭火焰的龍騎士，劍尖淬煉龍炎',     stats: { atk: 40, def: 10, hpMax: 80,  crit: 5 } },
  { id: 'tf_icemage',    name: '冰霜法師',  rarity: 'blue',   iconKey: 'icemage',    type: '智力型', desc: '操控寒冰元素的大法師',               stats: { atk: 50, def: 5,  hpMax: 60,  crit: 6 } },
  { id: 'tf_windranger', name: '疾風行者',  rarity: 'blue',   iconKey: 'windwalker', type: '敏捷型', desc: '疾風般的射手，箭如流星',             stats: { atk: 35, def: 8,  hpMax: 70,  crit: 12 } },
  { id: 'tf_holypaladin',name: '聖殿騎士',  rarity: 'blue',   iconKey: 'paladin',    type: '體質型', desc: '擁有神聖力量的聖殿騎士',             stats: { atk: 25, def: 20, hpMax: 120, crit: 2 } },
  { id: 'tf_orcshaman',  name: '獸人薩滿',  rarity: 'blue',   iconKey: 'orcshaman',  type: '智力型', desc: '掌握元素之力的獸人薩滿',             stats: { atk: 38, def: 6,  hpMax: 65,  mpMax: 40 } },

  // ===== 紅色（史詩）5種 =====
  { id: 'tf_deathknight', name: '死亡騎士', rarity: 'red',    iconKey: 'deathknight', type: '力量型', desc: '從深淵歸來的亡靈騎士，揮動符文之刃', stats: { atk: 70, def: 20, hpMax: 150, crit: 8 } },
  { id: 'tf_demonhunter', name: '惡魔獵手', rarity: 'red',    iconKey: 'demonhunter', type: '敏捷型', desc: '背負詛咒的惡魔獵殺者',               stats: { atk: 80, def: 15, hpMax: 120, crit: 15 } },
  { id: 'tf_darklord',    name: '暗影領主', rarity: 'red',    iconKey: 'darklord',    type: '智力型', desc: '統御黑暗的領主，操控死亡法術',       stats: { atk: 90, def: 10, hpMax: 100, crit: 10 } },
  { id: 'tf_vampirelord', name: '吸血鬼領主',rarity: 'red',    iconKey: 'vampire',     type: '敏捷型', desc: '永生的吸血鬼領主，吸血自療',         stats: { atk: 75, def: 12, hpMax: 130, crit: 12 } },
  { id: 'tf_darkarchmage',name: '黑暗大法師',rarity: 'red',   iconKey: 'darkmage',    type: '智力型', desc: '墮入黑暗的強大魔法師',               stats: { atk: 95, def: 8,  hpMax: 90,  mpMax: 60 } },

  // ===== 紫色（傳說）5種 =====
  { id: 'tf_dragonknight', name: '紫龍騎士', rarity: 'purple', iconKey: 'dragonknight', type: '力量型', desc: '與紫龍簽訂契約的傳奇騎士',         stats: { atk: 120, def: 30, hpMax: 250, crit: 12 } },
  { id: 'tf_archmage',     name: '大魔導師', rarity: 'purple', iconKey: 'archmage',     type: '智力型', desc: '掌握奧義法則的偉大魔法師',         stats: { atk: 150, def: 15, hpMax: 180, crit: 15 } },
  { id: 'tf_phoenixgod',   name: '鳳凰戰神', rarity: 'purple', iconKey: 'phoenix',      type: '力量型', desc: '浴火重生的鳳凰轉生，不死不滅',     stats: { atk: 180, def: 25, hpMax: 300, crit: 18 } },
  { id: 'tf_lichking',     name: '巫妖王',   rarity: 'purple', iconKey: 'lichking',     type: '智力型', desc: '統領亡靈大軍的不死巫王',           stats: { atk: 160, def: 20, hpMax: 220, crit: 10 } },
  { id: 'tf_darkangel',    name: '黑暗天使', rarity: 'purple', iconKey: 'darkangel',    type: '敏捷型', desc: '墮落的天使，揮舞黑翼之劍',         stats: { atk: 140, def: 22, hpMax: 200, crit: 20 } },

  // ===== 金色（神話）5種 =====
  { id: 'tf_emperor',      name: '黃金帝王', rarity: 'gold',   iconKey: 'emperor',     type: '力量型', desc: '統一大陸的傳奇帝王，威壓四方',     stats: { atk: 250, def: 50, hpMax: 500, crit: 20 } },
  { id: 'tf_godofwar',     name: '戰神阿瑞斯',rarity: 'gold',  iconKey: 'godofwar',    type: '力量型', desc: '戰爭之神的化身，戰無不勝',         stats: { atk: 300, def: 40, hpMax: 450, crit: 25 } },
  { id: 'tf_absolute',     name: '絕對者',   rarity: 'gold',   iconKey: 'absolute',    type: '智力型', desc: '超越凡俗的絕對存在',               stats: { atk: 400, def: 60, hpMax: 600, crit: 30 } },
  { id: 'tf_golddragon',   name: '黃金聖龍', rarity: 'gold',   iconKey: 'golddragon',  type: '力量型', desc: '神聖的黃金龍族，至高無上的力量',   stats: { atk: 350, def: 55, hpMax: 550, crit: 22 } },
  { id: 'tf_saint',        name: '神聖大天使',rarity: 'gold',  iconKey: 'saint',       type: '體質型', desc: '來自天界的聖大天使，守護眾生',     stats: { atk: 220, def: 80, hpMax: 700, crit: 15 } },
];

const TRANSFORM_GACHA_COST_SINGLE = 120;
const TRANSFORM_GACHA_COST_TEN = 1200;
const TRANSFORM_SCROLL_PRICE = 100; // 鑽石
const TRANSFORM_DURATION = 30 * 60; // 30分鐘（秒）

// 變身抽卡（與英雄池相同概率）
function rollTransformRarity() {
  const w = { white: 50, green: 30, blue: 14, purple: 1.8, red: 3, gold: 0.2 };
  const total = Object.values(w).reduce((a,b) => a+b, 0);
  let r = Math.random() * total;
  for (const [rarity, weight] of Object.entries(w)) {
    r -= weight;
    if (r <= 0) return rarity;
  }
  return 'white';
}

function pickTransform(rarity) {
  const items = TRANSFORM_POOL.filter(t => t.rarity === rarity);
  if (items.length === 0) {
    const order = ['gold','purple','red','blue','green','white'];
    const idx = order.indexOf(rarity);
    for (let i = idx + 1; i < order.length; i++) {
      const fb = TRANSFORM_POOL.filter(x => x.rarity === order[i]);
      if (fb.length > 0) return fb[Math.floor(Math.random() * fb.length)];
    }
  }
  return items[Math.floor(Math.random() * items.length)];
}

function doTransformGacha(count) {
  const cost = count === 10 ? TRANSFORM_GACHA_COST_TEN : TRANSFORM_GACHA_COST_SINGLE;
  if (GS.resources.gem < cost) { alert('鑽石不足！'); return []; }
  GS.resources.gem -= cost;
  const results = [];
  const actualCount = count === 10 ? 11 : count;
  for (let i = 0; i < actualCount; i++) {
    let rarity = rollTransformRarity();
    if (count === 10 && i === actualCount - 1) {
      const order = ['white','green','blue','purple','red','gold'];
      const hasGood = results.some(r => order.indexOf(r.rarity) > 0);
      if (!hasGood) rarity = 'green';
    }
    results.push(pickTransform(rarity));
  }
  // 加入已擁有列表（重複的變身轉換為碎片/金幣？此處採累計擁有方式）
  results.forEach(t => {
    if (!GS.ownedTransforms) GS.ownedTransforms = [];
    if (!GS.ownedTransforms.find(o => o.id === t.id)) {
      GS.ownedTransforms.push({ id: t.id, name: t.name, rarity: t.rarity, level: 1 });
    }
  });
  updateUI();
  return results;
}

// 取得變身圖標
function getTransformIcon(iconKey) {
  return TRANSFORM_ICONS[iconKey] || TRANSFORM_ICONS.wolf;
}

// 使用變身卷軸
function useTransformScroll(transformId) {
  if (!GS.ownedTransforms?.find(t => t.id === transformId)) {
    alert('尚未擁有此變身形態');
    return false;
  }
  const scrollItem = GS.inventory?.find(i => i.id === 'tscroll' && i.itemType === 'consumable');
  if (!scrollItem || scrollItem.count < 1) {
    alert('變身卷軸不足！可在商城購買');
    return false;
  }
  removeFromInventory('tscroll', 'consumable', 1);
  // 設置變身
  const tf = TRANSFORM_POOL.find(t => t.id === transformId);
  if (!tf) return false;
  GS.player.transformId = transformId;
  GS.transformEndTime = Date.now() + TRANSFORM_DURATION * 1000;
  // 變身特效
  triggerTransformEffect(tf);
  addLog('system', `✨ 使用變身卷軸，變身為【${tf.name}】！持續30分鐘`);
  calcCP();
  updateUI();
  return true;
}

// 變身特效（螢幕閃光+光环爆發）
function triggerTransformEffect(tf) {
  try {
    const rc = RARITY_CONFIG[tf.rarity] || RARITY_CONFIG.white;
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;background:radial-gradient(circle, ${rc.glow} 0%, transparent 70%);z-index:9999;pointer-events:none;animation:transformFlash 1.2s ease-out forwards;`;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 1300);
  } catch(e) {}
}

// 檢查變身是否到期
function checkTransformExpiry() {
  if (GS.player?.transformId && GS.transformEndTime && Date.now() > GS.transformEndTime) {
    const tf = TRANSFORM_POOL.find(t => t.id === GS.player.transformId);
    GS.player.transformId = null;
    GS.transformEndTime = null;
    if (tf) addLog('system', `變身【${tf.name}】時間已到，恢復原狀態`);
    calcCP();
    updateUI();
  }
}

// 取得當前變身剩餘時間（秒）
function getTransformRemaining() {
  if (!GS.player?.transformId || !GS.transformEndTime) return 0;
  return Math.max(0, Math.floor((GS.transformEndTime - Date.now()) / 1000));
}

// 格式化剩餘時間
function formatTransformTime(sec) {
  if (sec <= 0) return '已結束';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2,'0')}`;
}

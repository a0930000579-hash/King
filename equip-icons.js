/*
 * v4.5.21：裝備/道具圖標（去 SVG 化，全部真實 PNG/JPG 檔）
 *  - getEquipIconURL(part, rarity)  → assets/equip/icon_<part>_<rarity>.jpg
 *  - getItemIconURL(type, rarity, subtype) → assets/item/icon_<subtype>.jpg
 * 部位 × 品質各自一張，暗黑金屬風，永不缺圖（缺圖退回中性佔位）。
 * 保留既有 API 名稱，game.js 呼叫點無需改。
 */

(function() {
  'use strict';

  const RARITY_NAMES = {
    white: '普通', green: '精良', blue: '稀有', red: '史詩', purple: '傳說', gold: '神話'
  };

  // 部位別名（與舊 PART_ALIAS 對齊）
  const PART_ALIAS = {
    weapon: 'sword',
    ring1: 'ring', ring2: 'ring', accessory: 'ring',
  };

  // 既有 equip 圖標檔名（assets/equip/icon_<part>_<rarity>.jpg，90 張已存在）
  const PARTS = ['sword','shield','helmet','armor','boots','gloves','belt','cape',
                 'pants','ring','necklace','bow','staff','dagger','weapon'];
  const RARITIES = ['white','green','blue','red','purple','gold'];

  function normPart(part) {
    return PART_ALIAS[part] || part;
  }

  // 中性佔位（缺圖時）：用 PIL 產的通用劍
  const FALLBACK = 'assets/equip/icon_sword_white.jpg';

  function getEquipIconURL(part, rarity) {
    const p = normPart(part);
    const r = RARITIES.includes(rarity) ? rarity : 'white';
    const path = `assets/equip/icon_${p}_${r}.jpg`;
    return path;
  }

  // 道具圖標映射（assets/item/ 下既有檔；缺圖退回卷軸佔位）
  const ITEM_MAP = {
    scroll: 'assets/item/icon_enhance_scroll.jpg',
    ticket: 'assets/item/icon_enhance_scroll.jpg',
    potion: 'assets/item/icon_potion_hp.jpg',
    gem: 'assets/item/icon_soul_gem.jpg',
  };
  const ITEM_FALLBACK = 'assets/item/icon_enhance_scroll.jpg';

  function getItemIconURL(type, rarity, subtype) {
    // 優先用 subtype 指定的檔名
    if (subtype) {
      const p = `assets/item/icon_${subtype}.jpg`;
      return p;
    }
    return ITEM_MAP[type] || ITEM_FALLBACK;
  }

  window.EquipIconGenerator = {
    RARITY_NAMES,
    PARTS,
    RARITIES,
    getEquipIconURL,
    getItemIconURL,
    // 相容舊 API（回傳 PNG 路徑，不再產 SVG）
    generateEquipIconSVG: function(part, rarity) { return getEquipIconURL(part, rarity); },
    generateItemIconSVG: function(type, rarity, subtype) { return getItemIconURL(type, rarity, subtype); },
    getEquipIconURLLegacy: getEquipIconURL,
  };
})();

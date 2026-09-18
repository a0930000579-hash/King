/* ============================================================
 * King · UI 圖標庫（v4.5.21，去 SVG 化）
 * 全部圖標為真實 PNG 檔（暗黑奇幻金屬風：深褐圓底 + 古金 #f3d27a 圖形）。
 *  - KING_ICONS.uri(name)   回傳 PNG 相對路徑字串（<img src> 用）
 *  - KING_ICONS.icon(name)  回傳完整 <img src="..."> 字串
 *  - KING_ICONS.svg(name)   相容舊呼叫：回傳 <img> 字串（不再是 SVG）
 *  - KING_ICONS.paint(root) 把 [data-king-img="name"] 填成 <img>
 * key 名稱與舊版完全一致，game.js 既有呼叫點無需改 key。
 * 缺圖自動退回通用 bag 圖，永不顯示「?」。
 * ============================================================ */
(function () {
  'use strict';

  // key → PNG 檔名（assets/ui/icon_<key>.png，由 gen_ui_icons.py 產出）
  var PATH = 'assets/ui/';
  var FALLBACK = 'bag';

  // 完整 key 清單（與舊 LINE + NPC_SYM 對齊，另補 sword/lightning/ice/heal/arrow/person/dungeon/summon/scroll/potion）
  var KEYS = [
    // 主選單
    'nation','warehouse','codex','synth','auction','settings','ranking',
    // 國家功能
    'nobility','members','legion','castle','treasury','skill','donate',
    // 排行榜分頁
    'level','power','kills',
    // 通用
    'back','close','quest','bag','star','shop','shield',
    // 戰鬥/技能/道具
    'sword','lightning','ice','heal','arrow','person','dungeon','summon','scroll','potion',
    // NPC 徽章
    'npc_shop','npc_luxury','npc_warehouse','npc_quest','npc_inn','npc_priest',
    'npc_dungeon','npc_board','npc_guard','npc_healer','npc_wizard','npc_postman',
    'npc_blacksmith','npc_arena','npc_witch','npc_merchant_new'
  ];
  var map = Object.create(null);
  KEYS.forEach(function (k) { map[k] = PATH + 'icon_' + k + '.png'; });

  function uri(name) {
    return map[name] || map[FALLBACK];
  }

  function icon(name, size, extraStyle) {
    var src = uri(name);
    var sz = size ? ('width:' + size + 'px;height:' + size + 'px;') : '';
    var extra = extraStyle || '';
    return '<img src="' + src + '" style="' + sz + 'object-fit:contain;display:inline-block;vertical-align:middle;' + extra + '" alt="" loading="lazy"/>';
  }

  // 相容舊呼叫：svg() 過回傳 SVG 字串，今改回 <img> 字串（仍是合法 HTML innerHTML）
  function svg(name, size, color) {
    return icon(name, size || 22, '');
  }

  // 把 [data-king-img="name"] 佔位元素填成 <img>
  function paint(root) {
    (root || document).querySelectorAll('[data-king-img]').forEach(function (el) {
      if (el.getAttribute('data-king-img-painted') === '1') return;
      var n = el.getAttribute('data-king-img');
      var sz = el.getAttribute('data-king-size') || 22;
      el.outerHTML = icon(n, sz, 'display:inline-block;vertical-align:middle;');
    });
    // 舊 [data-king-icon] 向後相容
    (root || document).querySelectorAll('[data-king-icon]').forEach(function (el) {
      if (el.getAttribute('data-king-painted') === '1') return;
      var n = el.getAttribute('data-king-icon');
      var sz = el.getAttribute('data-icon-size') || 22;
      el.innerHTML = icon(n, sz);
      el.setAttribute('data-king-painted', '1');
    });
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { paint(document); });
    } else {
      paint(document);
    }
  }

  window.KING_ICONS = {
    uri: uri,
    icon: icon,
    svg: svg,
    paint: paint,
    map: map,
    LINE: map,
    NPC_SYM: map
  };
})();

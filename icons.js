/* ============================================================
 * King · 程序化 SVG 圖標庫（v4.4.20）
 * 零生圖額度、不依賴外部 CDN / manifest，永不顯示「?」缺圖。
 *  - KING_ICONS.svg(name, size)  內聯 SVG（按鈕/選單用，currentColor 金色）
 *  - KING_ICONS.uri(name)        data:image/svg+xml（<img src> 用，NPC 金屬徽章）
 * 暗黑奇幻金屬風：古金 #d4af37 / 亮金 #f3d27a，深鐵底。
 * ============================================================ */
(function () {
  'use strict';

  // ---- 內聯線性圖標（24x24，stroke 為主，跟隨 currentColor）----
  var LINE = {
    // 主選單
    nation:    '<path d="M4 9l8-5 8 5v9H4z"/><path d="M8.5 18v-5h7v5"/><circle cx="12" cy="10.5" r="1.6"/>',
    warehouse: '<path d="M4 9l8-4 8 4v9H4z"/><path d="M4 9.5h16"/><path d="M12 9.5V18"/><path d="M9.5 13h5"/>',
    codex:     '<path d="M5 5h11a2 2 0 012 2v12H7a2 2 0 00-2 2z"/><path d="M18 7v12"/><path d="M8.5 9h6M8.5 12h6M8.5 15h4"/>',
    synth:     '<path d="M14 4l6 6-3 3-6-6z"/><path d="M11 7L5 13a3.2 3.2 0 004.5 4.5L15.5 11"/><path d="M4 20l3-1"/>',
    auction:   '<path d="M12 4v16M7 8l5-4 5 4"/><path d="M5 13h14l-1.5 7h-11z"/><path d="M9 16h6"/>',
    settings:  '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.2 2.2M16.8 16.8L19 19M19 5l-2.2 2.2M7.2 16.8L5 19"/>',
    ranking:   '<path d="M7 4h10v4a5 5 0 01-10 0z"/><path d="M7 5H4v1a3 3 0 003 3M17 5h3v1a3 3 0 01-3 3"/><path d="M12 13v4M9 21h6M10 17h4l.6 4H9.4z"/>',
    // 國家功能鍵
    nobility:  '<path d="M12 3l2.2 4.6 5 .7-3.6 3.5.9 5L12 14.4 7.5 16.8l.9-5L4.8 8.3l5-.7z"/><circle cx="12" cy="10" r="1.4"/>',
    members:   '<circle cx="9" cy="9" r="3"/><path d="M3.5 19a5.5 5.5 0 0111 0"/><path d="M16 6.2a3 3 0 010 5.6M17.5 19a5.5 5.5 0 00-3-4.9"/>',
    legion:    '<path d="M12 3l7 2.5v5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V5.5z"/><path d="M12 8v9M9 11l3-3 3 3"/>',
    castle:    '<path d="M4 20V9h3V6h3v3h4V6h3v3h3v11z"/><path d="M4 13h16M10 20v-4h4v4"/>',
    treasury:  '<rect x="4" y="8" width="16" height="12" rx="1.5"/><path d="M4 12h16M12 8v12"/><circle cx="12" cy="12" r="1.8"/>',
    skill:     '<path d="M12 21V9"/><path d="M12 9C9 9 6.5 7 6.5 4.5 9.5 5 12 6.5 12 9zM12 9c3 0 5.5-2 5.5-4.5C14.5 5 12 6.5 12 9z"/><path d="M12 14c-2 0-3.8-1.2-4.5-3 2 .3 3.8 1 4.5 3zM12 14c2 0 3.8-1.2 4.5-3-.3 2-1 3-4.5 3z"/>',
    donate:    '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5c-1.6 1.8-3 3-3 4.6a3 3 0 006 0c0-1.6-1.4-2.8-3-4.6z"/>',
    // 排行榜分頁
    level:     '<path d="M5 19l5-9 3 4 2-2 4 7z"/><path d="M5 19h14"/>',
    power:     '<path d="M14.5 3.5L6 12.5h5L9.5 20.5 18 11h-5z"/>',
    kills:     '<path d="M6 4l12 16M18 4L6 20" stroke-width="0"/><path d="M14.5 3.5L5 13h4l-1 7 9.5-9.5h-4z"/>',
    // 通用
    back:      '<path d="M15 5l-7 7 7 7"/>',
    close:     '<path d="M6 6l12 12M18 6L6 18"/>',
    quest:     '<path d="M6 3h9l3 3v15H6z"/><path d="M10 9l1.5 1.5L14 8M10 14h4"/>',
    bag:       '<path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 016 0"/>',
    star:      '<path d="M12 3l2.4 5 5.6.8-4 4 1 5.6L12 16l-5 2.4 1-5.6-4-4 5.6-.8z"/>',
    shop:      '<path d="M4 9l1.5-4h13L20 9M4 9v9h16V9M4 9h16"/><path d="M9 18v-5h6v5"/>',
    shield:    '<path d="M12 3l7 2.5v5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V5.5z"/>'
  };

  function svg(name, size, color) {
    var body = LINE[name] || LINE.star;
    var c = color || '#f0c040';
    var s = size || 22;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s +
      '" fill="none" stroke="' + c + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:block">' +
      body + '</svg>';
  }

  // ---- NPC 金屬徽章（用於 <img src>，自帶深鐵圓底＋古金符號）----
  // symbol 為 24x24 的 SVG path 主體（fill 古金）
  var NPC_SYM = {
    npc_shop:        '<path d="M4 9l1.5-4h13L20 9c0 1.6-1.3 2.4-2.5 2.4S15 10.6 15 9c0 1.6-1.3 2.4-2.5 2.4S10 10.6 10 9c0 1.6-1.3 2.4-2.5 2.4S5 10.6 5 9h1zm1.5 4v6h13v-6c-1.4.5-3 .2-4-.7-1.3 1-3.2 1-4.5 0-1 .9-2.6 1.2-4 .7zm4 2h5v4h-5z"/>',
    npc_luxury:      '<path d="M12 3l7 6-7 11L5 9z"/><path d="M5 9h14M9 9l3 11 3-11"/>',
    npc_warehouse:   '<path d="M4 9l8-4 8 4v9H4z"/><path d="M4 9.5h16M12 9.5V18"/><path d="M9 13h5" stroke="#1c1408"/>',
    npc_quest:       '<path d="M7 3h10l2 2.5L17 8h-3l-2-2-2 2H7z"/><path d="M7 8h10v13H7z"/><path d="M10 12h4M10 15h4"/>',
    npc_inn:         '<path d="M5 20V10l7-5 7 5v10"/><path d="M5 13h14M12 13v7"/><path d="M8 13V8h8v5" opacity="0.6"/>',
    npc_priest:      '<path d="M12 3v18M7 7h10"/><circle cx="12" cy="12" r="8.2" fill="none"/><path d="M5 12h14" opacity="0.5"/>',
    npc_dungeon:     '<path d="M12 3a9 9 0 019 9v8h-5v-6a4 4 0 00-8 0v6H3v-8a9 9 0 019-9z"/>',
    npc_board:       '<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M8 9h8M8 12.5h8M8 16h5"/>',
    npc_guard:       '<path d="M12 3l6 2v5c0 3.6-2.4 6.4-6 7.6C8.4 16.4 6 13.6 6 10V5z"/><path d="M12 8v8M9 11l3-3 3 3"/>',
    npc_healer:      '<circle cx="12" cy="12" r="8.2" fill="none"/><path d="M12 7v10M7 12h10"/>',
    npc_wizard:      '<path d="M9 4l6 0-2 6h-2z"/><path d="M8 10h8l2 10H6z"/><path d="M12 10v10"/>',
    npc_postman:     '<rect x="4" y="6" width="16" height="12" rx="1.5"/><path d="M4 7.5l8 6 8-6"/>',
    npc_blacksmith:  '<path d="M14 4l6 6-2.5 2.5L11.5 6.5z"/><path d="M11.5 6.5L5 13a3 3 0 004 4l6.5-6.5"/><path d="M4 20l2.5-1"/>',
    npc_arena:       '<path d="M6 4l12 16M18 4L6 20" stroke="#f3d27a" stroke-width="2.4"/><circle cx="12" cy="12" r="9" fill="none" opacity="0.4"/>',
    npc_witch:       '<path d="M9 4h6l-1 6h-4z"/><path d="M7.5 10h9L18 20H6z"/><path d="M10 14h4"/>',
    npc_merchant_new:'<path d="M12 4v15M7 8l5-4 5 4"/><path d="M5 12h14l-1.4 7H6.4z"/>'
  };

  function badgeUri(key) {
    var fillSym = NPC_SYM[key];
    var strokeSym = !fillSym ? LINE[key] : '';
    var inner;
    if (fillSym) {
      inner = '<g transform="translate(20,22) scale(1.0)" fill="#f3d27a" stroke="#8a6a1f" stroke-width="0.6" stroke-linejoin="round">' + fillSym + '</g>';
    } else {
      inner = '<g transform="translate(20,22) scale(1.0)" fill="none" stroke="#f3d27a" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (strokeSym || LINE.star) + '</g>';
    }
    var svgText =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 72">' +
      '<defs>' +
        '<radialGradient id="g" cx="50%" cy="38%" r="70%">' +
          '<stop offset="0%" stop-color="#3a2c16"/><stop offset="70%" stop-color="#211708"/><stop offset="100%" stop-color="#120c04"/>' +
        '</radialGradient>' +
        '<linearGradient id="r" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#f3d27a"/><stop offset="55%" stop-color="#d4af37"/><stop offset="100%" stop-color="#8a6a1f"/>' +
        '</linearGradient>' +
      '</defs>' +
      // 金屬圓底
      '<circle cx="32" cy="34" r="27" fill="url(#g)" stroke="url(#r)" stroke-width="2.5"/>' +
      '<circle cx="32" cy="34" r="22" fill="none" stroke="#d4af37" stroke-opacity="0.35" stroke-width="1"/>' +
      inner +
      // 底部小尖（金屬吊墜感）
      '<path d="M32 60l-4 5h8z" fill="url(#r)" opacity="0.9"/>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
  }

  // 快取 data URI
  var _uriCache = {};
  function uri(name) {
    if (!_uriCache[name]) _uriCache[name] = badgeUri(name);
    return _uriCache[name];
  }

  // 自動把 [data-king-icon="name"] 元素填充為內聯 SVG（供靜態 HTML 選單使用）
  function paint(root) {
    (root || document).querySelectorAll('[data-king-icon]').forEach(function (el) {
      if (el.getAttribute('data-icon-painted') === '1') return;
      var n = el.getAttribute('data-king-icon');
      var sz = el.getAttribute('data-icon-size') || 22;
      el.innerHTML = svg(n, sz);
      el.setAttribute('data-icon-painted', '1');
    });
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { paint(document); });
    } else {
      paint(document);
    }
  }

  window.KING_ICONS = { svg: svg, uri: uri, paint: paint, LINE: LINE, NPC_SYM: NPC_SYM };
})();

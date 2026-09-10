/* ============================================================
   King · 精靈 Foot Anchor 執行時歸一化（解決「跑圖 / 比例跑掉」）
   原因：同一角色各幀原圖內，角色主體的位置/大小/腳底並未對齊，
        CSS 用「圖片底邊」object-position:bottom 對齊，切幀時角色
        就會上下跳、忽大忽小（跑圖）。
   做法：每張 .unit-sprite-img 載入後，用離屏 canvas 量「角色主體」
        邊界（投影密度法濾除外圍零散墨漬），再以 transform 把：
        主體水平中心 → 容器水平中心；主體腳底 → 容器底；
        主體高度統一為容器的固定比例。所有幀因此共用同一錨點、
        同一顯示大小，切幀不再漂移。不改原圖、不耗生圖額度。
   ============================================================ */
(function () {
  'use strict';
  var TARGET_H_RATIO = 0.94;   // 角色主體統一佔容器高度 94%
  var ALPHA_TH = 40;           // 主體不透明閾值
  var DENS = 0.02;             // 行/列密度閾值（濾零散雜點）

  // 密度投影找主體區間：以中心為種子向兩側擴展，跨越有限空洞
  function span(cnt, thr, maxGap) {
    var n = cnt.length, lo = (n / 2) | 0, hi = lo, gap = 0, x;
    for (x = lo - 1; x >= 0; x--) {
      if (cnt[x] > thr) { lo = x; gap = 0; }
      else { gap++; if (gap > maxGap) break; }
    }
    gap = 0;
    for (x = hi + 1; x < n; x++) {
      if (cnt[x] > thr) { hi = x; gap = 0; }
      else { gap++; if (gap > maxGap) break; }
    }
    if (cnt[lo] <= thr) { // 中心落在空洞，退回全域最密區間
      var bestL = 0, best = -1, run = 0, start = 0;
      for (x = 0; x < n; x++) {
        if (cnt[x] > thr) { if (run === 0) start = x; run++; if (run > best) { best = run; bestL = start; } }
        else run = 0;
      }
      lo = bestL; hi = bestL + Math.max(best - 1, 0);
    }
    return [lo, hi];
  }

  function bodyBox(img) {
    var W = img.naturalWidth, H = img.naturalHeight;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, W, H);
    var d = ctx.getImageData(0, 0, W, H).data;
    var row = new Int32Array(H);
    for (var y = 0; y < H; y++) {
      var rc = 0, base = y * W * 4;
      for (var x = 0; x < W; x++) if (d[base + x * 4 + 3] > ALPHA_TH) rc++;
      row[y] = rc;
    }
    var ys = span(row, W * DENS, H * 0.03), t = ys[0], b = ys[1];
    if (b <= t) return null;
    var col = new Int32Array(W);
    for (var yy = t; yy <= b; yy++) {
      var bb = yy * W * 4;
      for (var xx = 0; xx < W; xx++) if (d[bb + xx * 4 + 3] > ALPHA_TH) col[xx]++;
    }
    var xs = span(col, (b - t) * DENS, W * 0.03);
    return { l: xs[0], r: xs[1], t: t, b: b };
  }

  function normalize(img) {
    if (img.__anchorDone) return;
    var W = img.naturalWidth, H = img.naturalHeight;
    if (!W || !H) return;
    var wrap = (img.closest && img.closest('.unit-sprite-wrap')) || img.parentElement;
    var cw = wrap ? wrap.clientWidth : 0, ch = wrap ? wrap.clientHeight : 0;
    if (!cw || !ch) { // 尚未佈局，下一幀重試一次
      requestAnimationFrame(function () { img.__anchorDone = false; normalize(img); });
      return;
    }
    var box;
    try { box = bodyBox(img); } catch (e) { return; }
    if (!box) { img.__anchorDone = true; return; }
    var bw = box.r - box.l, bh = box.b - box.t;
    if (bw <= 2 || bh <= 2) { img.__anchorDone = true; return; }
    var k = Math.min(cw / W, ch / H);          // object-fit:contain 縮放比
    var s = (ch * TARGET_H_RATIO) / (bh * k);  // 統一主體高度
    var cx = (box.l + box.r) / 2, foot = box.b;
    var tx = cw / 2 - s * cx * k;              // 主體中心 → 容器中心
    var ty = ch - s * foot * k;                // 主體腳底 → 容器底
    // 統一用 contain + 左上對齊，映射可預測（覆蓋怪物 cover 裁切，比例不再跑）
    img.style.objectFit = 'contain';
    img.style.objectPosition = '0% 0%';
    img.style.transformOrigin = '0 0';
    // 錨點用 CSS 變量傳遞，最終 transform 由 CSS 組裝（面向左翻轉由 CSS 疊加，動態轉向也能響應）
    img.style.setProperty('--ax', tx.toFixed(2) + 'px');
    img.style.setProperty('--ay', ty.toFixed(2) + 'px');
    img.style.setProperty('--as', s.toFixed(4));
    img.classList.add('anchor-normalized');
    // 透明 PNG 關閉有害的 screen 混合（避免黑盔甲被弄透）
    var alpha = 0;
    try {
      var cc = document.createElement('canvas'); cc.width = 48; cc.height = 48;
      var cx2 = cc.getContext('2d'); cx2.drawImage(img, 0, 0, 48, 48);
      var dd = cx2.getImageData(0, 0, 48, 48).data;
      for (var i = 3; i < dd.length; i += 4) if (dd[i] < 250) alpha++;
      if (alpha / (48 * 48) > 0.15 && wrap) wrap.classList.add('sprite-has-alpha');
    } catch (e) {}
    img.__anchorDone = true;
  }

  // load 不冒泡，用捕獲階段全局接管精靈圖（含動態生成幀）。
  // 本版只錨定 .unit-sprite-img（玩家/英雄/變身）；方向層 .dir-sprite 結構不同先不介入，避免回歸。
  function isSprite(t) {
    return t && t.tagName === 'IMG' && t.classList && t.classList.contains('unit-sprite-img');
  }
  document.addEventListener('load', function (e) {
    if (isSprite(e.target)) { try { normalize(e.target); } catch (_) {} }
  }, true);
  // 對載入快取、load 事件已過的圖，補一輪
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('img.unit-sprite-img').forEach(function (im) {
      if (im.complete && im.naturalWidth) { try { normalize(im); } catch (_) {} }
    });
  });
  if (window) window.KingAnchorNormalize = normalize;
})();

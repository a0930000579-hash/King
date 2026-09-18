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
  var PROBE_MAX = 128;         // 量測降採樣最長邊（效能：手機上不對原圖全畫素掃描）
  var boxCache = Object.create(null); // 同一 src 只量一次，多單位共用

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
    var key = img.currentSrc || img.src || (W + 'x' + H);
    if (boxCache[key]) return boxCache[key];
    // 降採樣到最長邊 PROBE_MAX，像素量降數百倍，邊界精度仍足夠
    var scale = Math.min(1, PROBE_MAX / Math.max(W, H));
    var sw = Math.max(1, Math.round(W * scale)), sh = Math.max(1, Math.round(H * scale));
    var c = document.createElement('canvas'); c.width = sw; c.height = sh;
    var ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, sw, sh);
    var d = ctx.getImageData(0, 0, sw, sh).data;
    var row = new Int32Array(sh);
    for (var y = 0; y < sh; y++) {
      var rc = 0, base = y * sw * 4;
      for (var x = 0; x < sw; x++) if (d[base + x * 4 + 3] > ALPHA_TH) rc++;
      row[y] = rc;
    }
    var ys = span(row, sw * DENS, sh * 0.03), t = ys[0], b = ys[1];
    if (b <= t) { boxCache[key] = null; return null; }
    var col = new Int32Array(sw);
    for (var yy = t; yy <= b; yy++) {
      var bb = yy * sw * 4;
      for (var xx = 0; xx < sw; xx++) if (d[bb + xx * 4 + 3] > ALPHA_TH) col[xx]++;
    }
    var xs = span(col, (b - t) * DENS, sw * 0.03);
    // 小圖邊界 → 原圖座標
    var inv = 1 / scale;
    var box = {
      l: Math.round(xs[0] * inv), r: Math.round(xs[1] * inv),
      t: Math.round(t * inv), b: Math.round(b * inv)
    };
    boxCache[key] = box;
    return box;
  }

  function normalize(img) {
    if (!img.naturalWidth) return;
    var W = img.naturalWidth, H = img.naturalHeight;
    if (!W || !H) return;
    // v4.4.21：src 變更（變身/職業切換只換 img.src、重用同一 img 元素）時必須重新量測，
    //   否則新精靈沿用舊 --ax → 主體偏離 wrap 中心，而兄弟層光環固定在幾何中心，
    //   看起來「光環在人物左側」。記住已量測的 srcKey，src 變了就重測。
    var srcKey = img.currentSrc || img.src || (W + 'x' + H);
    if (img.__anchorDone && img.__anchorSrc === srcKey) return;
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
    var axPx = tx.toFixed(2) + 'px', ayPx = ty.toFixed(2) + 'px', asV = s.toFixed(4);
    img.style.setProperty('--ax', axPx);
    img.style.setProperty('--ay', ayPx);
    img.style.setProperty('--as', asV);
    // v4.4.21：同組變數廣播到 wrap 與 .world-unit 祖先。
    //   光環 .transform-aura 是 wrap 的兄弟、與 wrap 同為 .world-unit 子節點，
    //   靠 CSS 變數向下繼承即可讀到同一組 --ax/--ay/--as，與人物共享同一腳底錨點座標系，
    //   移動/攻擊/受擊/變身全程不跑版。
    if (wrap) {
      wrap.style.setProperty('--ax', axPx);
      wrap.style.setProperty('--ay', ayPx);
      wrap.style.setProperty('--as', asV);
      var unit = wrap.closest ? wrap.closest('.world-unit') : null;
      if (unit) {
        unit.style.setProperty('--ax', axPx);
        unit.style.setProperty('--ay', ayPx);
        unit.style.setProperty('--as', asV);
      }
    }
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
    img.__anchorSrc = srcKey;
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

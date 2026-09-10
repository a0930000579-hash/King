/* ============================================================
   King · Sprite Atlas 播放器（天堂式 2.5D：8 方向 × 多動作幀）
   規格對齊《King 2.5D／8幀 Sprite／壓縮最佳化》：
   - 一隻角色 = 一張 Atlas 圖（WebP lossless / PNG-Indexed）+ 一份 JSON
   - row = 方向(0..7: N,NE,E,SE,S,SW,W,NW)，col = 動作幀
   - Foot Anchor（anchorX=0.5 / anchorY=1.0，腳底對齊世界座標）
   - Trim 透明空白 + offset，避免逐幀漂移
   - E/NE/SE 由 W/NW/SW 水平鏡像而來（美術只需畫 5 個方向即可覆蓋 8 向）
   - Render FPS（60）與動畫 FPS（walk 10 / attack 12…）分離
   - Server 只傳 x/y/direction/action，frame 完全由客戶端本地播放
   ============================================================ */
(function (global) {
  'use strict';

  // 方向索引：0 N,1 NE,2 E,3 SE,4 S,5 SW,6 W,7 NW
  var MIRROR_MAP = { 2: 6, 1: 7, 3: 5 }; // E<-W, NE<-NW, SE<-SW（水平鏡像）
  var DIR_ORDER = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  function SpriteAtlas(json, image) {
    this.meta = json.meta || {};
    this.anims = json.animations || {};
    this.layout = json.layout || 'rows_dir_cols_frame';
    // 固定格尺寸（固定格 sheet）；若給 frames[] 則以 trim 框為準
    this.fw = this.meta.frameWidth || 96;
    this.fh = this.meta.frameHeight || 128;
    this.dirs = this.meta.directions || 8;
    this.anchorX = (this.meta.anchorX == null ? 0.5 : this.meta.anchorX);
    this.anchorY = (this.meta.anchorY == null ? 1.0 : this.meta.anchorY);
    this.frames = json.frames || null; // 可選：trim 框 {x,y,w,h,offX,offY}
    this.sheetLayout = json.sheetLayout || null; // 可選：多動作單圖時各動作起始列
    this.image = image || null;
    this.animStart = {}; // 每個 action 的起始時間，用於非循環動作
  }

  // 載入：base 例如 'assets/atlas/warrior' -> warrior.json + warrior.webp（失敗退回 .png）
  SpriteAtlas.load = function (base) {
    return fetch(base + '.json', { cache: 'force-cache' })
      .then(function (r) { if (!r.ok) throw new Error('atlas json 404: ' + base); return r.json(); })
      .then(function (json) {
        var imgName = (json.meta && json.meta.image) || (base.split('/').pop() + '.webp');
        var imgUrl = base.replace(/[^/]+$/, '') + imgName;
        return new Promise(function (resolve, reject) {
          var img = new Image();
          img.onload = function () { resolve(new SpriteAtlas(json, img)); };
          img.onerror = function () {
            // webp 失敗嘗試 png
            var png = imgUrl.replace(/\.webp$/i, '.png');
            if (png !== imgUrl) {
              var img2 = new Image();
              img2.onload = function () { json.meta = json.meta || {}; json.meta.image = png.split('/').pop(); resolve(new SpriteAtlas(json, img2)); };
              img2.onerror = function () { reject(new Error('atlas image fail: ' + imgUrl)); };
              img2.src = png;
            } else { reject(new Error('atlas image fail: ' + imgUrl)); }
          };
          img.src = imgUrl;
        });
      });
  };

  SpriteAtlas.prototype._resolveDir = function (dir) {
    dir = ((dir | 0) + 8) % 8;
    var mirror = false, srcDir = dir;
    if (MIRROR_MAP[dir] != null) { srcDir = MIRROR_MAP[dir]; mirror = true; }
    return { dir: srcDir, mirror: mirror };
  };

  // 動作是否存在
  SpriteAtlas.prototype.hasAction = function (action) { return !!this.anims[action]; };

  // 依「動作 + 方向 + 動畫時間」取得該時刻應繪的幀
  // actionTimeMs: 該動作已持續時間（呼叫端維護），回傳裁剪框與錨點偏移
  SpriteAtlas.prototype.getFrame = function (action, dir, actionTimeMs) {
    var anim = this.anims[action] || this.anims.idle;
    if (!anim) return null;
    var nFrames = anim.frames || 8, fps = anim.fps || 10;
    var idx;
    if (anim.loop === false) {
      idx = Math.min(nFrames - 1, Math.floor(actionTimeMs / (1000 / fps)));
    } else {
      idx = Math.floor(actionTimeMs / (1000 / fps)) % nFrames;
    }
    var rd = this._resolveDir(dir == null ? 4 : dir);
    var sx, sy, sw, fh = this.fh, fw = this.fw, offX = 0, offY = 0;
    if (this.frames && this.frames[action] && this.frames[action][rd.dir] && this.frames[action][rd.dir][idx]) {
      var f = this.frames[action][rd.dir][idx]; // trim 框
      sx = f.x; sy = f.y; sw = f.w; fh = f.h; offX = f.offX || 0; offY = f.offY || 0;
    } else {
      // 固定格：col=幀，row=動作起始列 + 方向（多動作單圖）；無偏移時 row=方向
      var rowOff = (this.sheetLayout && this.sheetLayout.actionRowOffset && this.sheetLayout.actionRowOffset[action]) || 0;
      sx = idx * fw; sy = (rowOff + rd.dir) * fh; sw = fw;
    }
    return { sx: sx, sy: sy, sw: sw, sh: fh, offX: offX, offY: offY, mirror: rd.mirror, frame: idx, dir: rd.dir, action: action };
  };

  // Canvas 繪製：以「腳底錨點 = 世界座標 (wx,wy)」貼圖
  SpriteAtlas.prototype.draw = function (ctx, action, dir, actionTimeMs, wx, wy, scale) {
    if (!this.image) return false;
    var f = this.getFrame(action, dir, actionTimeMs);
    if (!f) return false;
    scale = scale || 1;
    var dw = f.sw * scale, dh = f.sh * scale;
    // 腳底對齊：drawX = wx - anchorX*寬 + offX；drawY = wy - 高 + offY
    var dx = wx - this.anchorX * dw + f.offX * scale;
    var dy = wy - dh + f.offY * scale;
    ctx.save();
    if (this.meta.pixelated) { ctx.imageSmoothingEnabled = false; }
    if (f.mirror) {
      // 水平鏡像：以腳底中軸翻轉
      ctx.translate(wx, 0); ctx.scale(-1, 1); ctx.translate(-wx, 0);
    }
    ctx.drawImage(this.image, f.sx, f.sy, f.sw, f.sh, dx, dy, dw, dh);
    ctx.restore();
    return true;
  };

  // DOM 模式：回傳 background 定位（供 div 精靈使用），鏡像用 transform
  SpriteAtlas.prototype.domStyle = function (action, dir, actionTimeMs) {
    var f = this.getFrame(action, dir, actionTimeMs);
    if (!f) return null;
    return {
      backgroundImage: "url('" + ((this.meta && this.meta.image) || '') + "')",
      width: f.sw + 'px', height: f.sh + 'px',
      backgroundPosition: (-f.sx) + 'px ' + (-f.sy) + 'px',
      transform: f.mirror ? 'scaleX(-1)' : 'none'
    };
  };

  SpriteAtlas.DIR_ORDER = DIR_ORDER;
  SpriteAtlas.MIRROR_MAP = MIRROR_MAP;
  global.SpriteAtlas = SpriteAtlas;
})(typeof window !== 'undefined' ? window : globalThis);

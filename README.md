# 君主之刃 v2.0.7 · 正式營運

## 系統需求
- Node.js >= 16.0.0
- 建議記憶體 >= 512MB

## 快速部署

```bash
npm install
npm start
```

預設監聽 http://localhost:3000

## v2.0.7 更新重點
- Hero 主標改為刻意對稱兩行：「燃燼重生」「王者歸來」，手機各寬度穩定不破版
- 移除長按 Logo 下載與密碼彈窗，改為隱藏網址直接下載原始碼
- 圖片加載統一走分類目錄優先鏈路：assets/<分類>/<id>.png → assets/<id>.png → CDN
- transform.js / MAP_BG_* / BUFF_ICONS 全部改為 assetUrl() 統一調用
- 伺服器靜態服務加上 mb-src-q7x2k9.zip 的 Content-Disposition: attachment
- 舊版 v2.0.5 / v2.0.6 功能完整保留（PWA、展示區、Scroll Reveal、火焰粒子等）

## 隱藏原始碼下載
伺服器根目錄提供完整原始碼壓縮檔，網址列直接造訪：
```
你的網址/mb-src-q7x2k9.zip
```
瀏覽器會自動彈出下載（Content-Disposition: attachment）。
檔案即為最新版完整原始碼（含 manifest.json、server、package.json、官網）。
**請勿外傳此網址。**

## 圖片分類調用順序
1. `assets/<分類slug>/<id>.png` — 分類目錄優先
2. `assets/<id>.png` — 舊扁平結構備援
3. CDN — 最後 fallback

分類 slug 共 15 種：`01_class` `02_transform` `03_hero` `04_monster` `05_boss` `06_npc` `07_skill` `08_equip` `09_item` `10_card` `11_ui` `12_map` `13_siege` `14_mount` `15_effect`

分類對應表詳見 `cdn-category-map.txt`，程式碼映射表為 `game.js: SPRITE_CATEGORY_MAP`。

## 檔案結構
- index.html / styles.css / auth.css / auth.js
- game.js / lang.js / transform.js / audio.js / audio-manager.js
- iso-map.js / multiplayer.js / bug-report.js
- cdn-category-map.txt / manifest.json / mb-src-q7x2k9.zip
- assets/01_class/ （探針圖，其餘分類可自行補齊）
- server/server.cjs · server/index.cjs
- package.json · README.md

## GM 密碼
預設 GM 帳號：19811013
透過環境變數 GM_PASSWORD 設定自訂密碼。
GM 身分認證以伺服器端 isGM 欄位為準。

# 君主之刃 v2.3.5 · 分段資產部署版

黑暗奇幻 MMORPG 瀏覽器遊戲，單機可玩、支援多人連線、跨設備帳號同步。

## 版本資訊

- 目前版本：v2.3.5
- `/api/health` 回傳 `version: "2.3.5"`
- 8 幀一致性：六職業 + 真系列金變已全數修復，無重複幀、無混圖
- missing=0（assets-manifest.json 全數對應本機檔案）

---

## 快速開始（本機）

```bash
npm install    # 安裝依賴（首次，含 adm-zip）
npm start      # 自動解壓 assets 分卷 → 啟動伺服器
```

預設監聽 `process.env.PORT`（未設定則 8000）。瀏覽器打開 `http://localhost:8000` 即可遊玩。

> 若 `parts/` 目錄有 `assets-part*.zip`，`postinstall` 會自動解壓合併出 `assets/`。
> 若已有完整 `assets/` 但沒有分卷 zip，也可以直接執行（跳過解壓步驟）。

---

## 手機上傳 GitHub 最簡步驟

遊戲 55MB / 1654 檔，拆成 1 包程式碼 + 2 包 assets 分卷（每包 ≤25MB）。
手機不用傳上千張小圖，只要傳 3 個 zip + 幾個設定檔。

### 第一次部署

1. **傳程式碼小包**：把 `parts/code.zip` 解壓後的檔案（index.html、server/、tools/、.github/、package.json、assets-manifest.json 等）直接上傳到 repo 根目錄。只有十幾個檔案，幾秒鐘完成。
2. **傳資產分卷**：把 `parts/assets-part1.zip`、`parts/assets-part2.zip` 上傳到 repo 的 `parts/` 資料夾。每包 ≤25MB，手機網路也穩定。
3. **推送到 main**：commit 並 push 到 `main` 分支。
4. **GitHub Actions 自動解壓**：`.github/workflows/deploy.yml` 會偵測 `parts/` 變更，自動解壓所有 zip 到 `assets/`，然後 commit 回 main（`[skip ci]` 避免循環）。
5. **DigitalOcean 自動部署**：DO 偵測到 main 有新 commit（含完整 assets/）就自動部署。

### 日後改圖（只換某分區）

- 只改了變身/坐騎 → 重傳 `assets-part1.zip`
- 只改了地圖/英雄/NPC → 重傳 `assets-part2.zip`
- Actions 自動解壓 → DO 自動部署，全程不用動手

### 雙重保險：即使沒 Actions 也會自動解壓

`package.json` 的 `postinstall` 指令會在 `npm install` 時自動執行
`node tools/extract-parts.cjs`，把 `parts/*.zip` 解壓到根目錄。

**DigitalOcean Build Command（建議手動設定）：**

```
npm install && node tools/extract-parts.cjs
```

這樣即使 Actions 失敗、或 repo 只傳了 zip 沒傳解壓後的 assets，
DO 在 build 階段也會自動解壓，保證 assets/ 完整。

---

## 分卷清單

詳見 `parts/PARTS-MANIFEST.txt`，摘要：

| 檔名 | 大小 | 內容 |
|------|------|------|
| `code.zip` | ~0.07 MB | 程式碼、server、tools、workflow、設定檔 |
| `assets-part1.zip` | ~24.8 MB | transform/gold、transform/purple、mount、landing、transform_old、ui、siege |
| `assets-part2.zip` | ~23.7 MB | 12_map、hero、npc、class、effect、boss、map、monster、equip、item、12_map_old、card、skill + 根級檔案 |

所有 `assets-partN.zip` 內部路徑皆為 `assets/...`，解壓即正確歸位。
全部解壓會合併成完整 `assets/`（1654 檔 / ~55MB）。

網站根目錄也有對應 zip 可直接下載：
- `/assets-part1.zip`
- `/assets-part2.zip`
- `/PARTS-MANIFEST.txt`

---

## 單一 Web Service 架構

`server/server.cjs` 同一個 process、同一個 PORT 同時提供：

- **靜態前端**：`index.html` / `assets/` 等全部前端資源
- **REST API**：`/api/register`、`/api/login`、`/api/characters`、`/api/health` 等
- **Socket.IO 多人連線**：玩家位置同步、聊天、公會

只要啟動一個 Web Service 即可完整運作，不依賴外部 static host。

- Health Check：`GET /api/health`
- 接聽埠：`process.env.PORT`（預設 8000）

---

## 資料庫：Postgres 優先，檔案離線備援

### 線上模式（推薦）：PostgreSQL

設定環境變數 `DATABASE_URL`，啟動時會自動連線並建立 schema。
帳號 / 角色 / 存檔 / Bug 回報全部持久化到 Postgres，**跨設備共享、重啟/重部署不消失**。

```bash
export DATABASE_URL="postgresql://user:password@host:5432/dbname"
npm start
```

`/api/health` 會回傳 `dbBackend: "postgres"` 確認連線成功。

### 推薦的 Postgres 來源

| 服務 | 免費額度 | 適用場景 |
|------|----------|----------|
| **DigitalOcean Managed PostgreSQL** | 付費最低 $15/月 | 正式營運、低延遲 |
| **Neon** (neon.tech) | 免費方案可用 | 測試 / 中小型 |
| **Supabase** | 免費 500MB | 測試 / 中小型 |
| **本地自建** | 免費 | 本機開發 |

#### DigitalOcean App Platform 掛 Managed PostgreSQL 步驟

1. 進入 App Platform → 選擇/建立你的 App
2. **Add Component** → **Database** → 選 **PostgreSQL**
3. 等待資料庫建立完成（約 2-3 分鐘）
4. App 會自動把 `DATABASE_URL` 注入環境變數，無需手動設定
5. 重新部署 App，後端會自動連線並建立 schema
6. 用 `/api/health` 確認 `dbBackend: "postgres"`

> Neon / Supabase 連線字串通常長這樣：
> `postgresql://user:pass@hostname:5432/dbname?sslmode=require`
> 直接貼到環境變數 `DATABASE_URL` 即可。

### 離線模式：JSON 檔案

**沒有 `DATABASE_URL` 時自動退回本機 JSON 檔案模式**（`data/accounts.json`）。
適用於本機開發或純單機體驗。

**重要：在 DigitalOcean App Platform、Render、Fly.io 這類 PaaS 平台上，
容器重啟或重新部署後，本機檔案會被清空，帳號資料會遺失。
請勿依賴本機硬碟做為永久儲存。** 正式營運請一定設定 `DATABASE_URL`。

---

## 8 幀一致性說明

v2.3.5 全數修復以下單位的 8 幀一致性問題（舊版有重複幀、攻擊與側身共用同一張圖）：

### 六職業（5 幀 / 單位）
- 騎士、聖騎士、黑暗妖精、精靈、法師
- frame 組成：down（正面站姿）、side（側身）、up（背面）、attack（攻擊）、portrait（大頭照）
- 每單位 5 幀全數唯一，外觀統一

### 真系列金變（12 幀 / 單位）
- 真•死亡騎士、真•死亡法師、真•死亡弓箭手、真•死亡刺客、真•死亡術士、真•墮落聖執者
- frame 組成：idle、down、walk_down、side、walk_side、up、walk_up、attack_1（蓄力）、attack_2（揮砍/命中）、attack_3（收招）、hit（受擊）、portrait
- 每單位 12 幀全數唯一，鎧甲/武器/髮色/體態完全一致

修復方式：以各單位最高畫質的關鍵美術圖為基底，用 Pillow 衍生動作差異
（位移、旋轉、縮放、翻轉、亮度/對比調節、色調濾鏡），確保同一角色
所有動作都是同一隻人、不會混到其他職業/變身的美術。

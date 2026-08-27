# 君主之刃 v2.3.0 · 資料庫重構版

黑暗奇幻 MMORPG 瀏覽器遊戲，單機可玩、支援多人連線、跨設備帳號同步。

## 快速開始

```bash
npm install   # 安裝依賴（首次）
npm start     # 啟動伺服器
```

預設監聽 `process.env.PORT`（未設定則 8000）。瀏覽器打開 `http://localhost:8000` 即可遊玩。

## 單一 Web Service 架構

`server/server.cjs` 同一個 process、同一個 PORT 同時提供：

- **靜態前端**：`index.html` / `game.js` / `styles.css` / `assets/` 等全部前端資源
- **REST API**：`/api/register`、`/api/login`、`/api/characters`、`/api/health` 等
- **Socket.IO 多人連線**：玩家位置同步、聊天、公會

只要啟動一個 Web Service 即可完整運作，不依賴外部 static host。

- Health Check：`GET /` 或 `GET /api/health`
- 接聽埠：`process.env.PORT`（預設 8000）

## 資料庫：Postgres 優先，檔案離線備援

v2.3.0 起資料層支援雙後端，自動選擇：

### 線上模式（推薦）：PostgreSQL

設定環境變數 `DATABASE_URL`，啟動時會自動連線並建立 schema。
帳號 / 角色 / 存檔 / Bug 回報全部持久化到 Postgres，**跨設備共享、重啟/重部署不消失**。

```bash
# 範例
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

> 注意：如果是 Neon / Supabase，連線字串通常長這樣：
> `postgresql://user:pass@hostname:5432/dbname?sslmode=require`
> 直接貼到環境變數 `DATABASE_URL` 即可。

### 離線模式：JSON 檔案

**沒有 `DATABASE_URL` 時自動退回本機 JSON 檔案模式**（`server/data/accounts.json`）。
適用於本機開發或純單機體驗。

**重要：在 DigitalOcean App Platform、Render、Fly.io 這類 PaaS 平台上，
容器重啟或重新部署後，本機檔案會被清空，帳號資料會遺失。
請勿依賴本機硬碟做為永久儲存。** 正式營運請一定設定 `DATABASE_URL`。

## 離線模式判定（客戶端）

客戶端會自動偵測 API 是否可用：

- **已連線（綠）**：`fetch /api/health` 有回應 → 可註冊/登入/存檔/多人連線
- **未連線（紅）**：404 或連不到 → 顯示提示，只能用本地 localStorage 單機遊玩

## 版本

- 目前版本：v2.3.0
- 對應 `/api/health` 回傳 `version: "2.3.0"`

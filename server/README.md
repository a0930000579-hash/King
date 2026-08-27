# 君主之刃 v2.0.9 · 正式營運

## 系統需求
- Node.js >= 16.0.0

## 快速部署（單一 Web Service）

```bash
npm install
npm start
```

預設監聽 `http://localhost:3000`，可透過環境變數 `PORT` 指定連接埠：
```bash
PORT=8080 npm start
```

## 單一 Process 架構

**同一個 Node process、同一個 PORT** 同時提供三種服務：

| 服務 | 路徑 | 說明 |
|------|------|------|
| 靜態前端 | `/` (GET) | index.html / js / css / assets |
| REST API | `/api/*` | 註冊、登入、角色建立/查詢/存檔 |
| Socket.IO | 同 PORT 升級 | 多人連線同步（需安裝 socket.io） |

- Health check 路徑：`GET /`（回應 index.html，狀態 200）
- 部署在 DigitalOcean / Render / Railway 等平台時，只需建立一個 **Web Service**，啟動指令 `npm start`，對外開放同一個 PORT 即可。
- 無需獨立的 static hosting / CDN，全部由同一個 process 承載。

## Socket.IO 選擇性啟用

若環境有安裝 `socket.io`（`npm install socket.io`），自動啟用多人連線；未安裝時以單機模式執行，不影響單機遊玩。

## 資料持久化注意事項

預設使用檔案式儲存（`data/accounts.json`、`data/characters.json`、`data/bug-reports.json`）。

### 檔案式儲存的限制

- **容器重啟會清空**：在 Docker / 無狀態平台（Heroku、部分 DigitalOcean App Platform 方案等）中，容器重啟或重新部署時，`data/` 目錄會丟失，所有帳號與角色會消失。
- **水平擴展不適用**：若跑多個 instance，每個 instance 有各自的 `data/`，資料不同步。

### 持久化建議

| 方案 | 說明 |
|------|------|
| 掛持久磁碟 | DigitalOcean Volumes / Render Disk / EBS 等，把 `data/` 目錄掛到持久儲存體 |
| 接外部資料庫 | 把 accounts / characters 遷移到 PostgreSQL / MongoDB / Redis |
| 物件儲存 | 定期把 data/*.json 備份到 S3 / Spaces |

若要持久保存玩家資料，**請勿使用檔案式儲存直接上線**，請掛載持久磁碟或替換為外部資料庫。

## v2.0.9 更新重點

- 修復進世界黑屏：init 全域錯誤提示浮層、assets-manifest 載入與刷新機制
- 離線模式修復：API 成功/失敗追蹤連線狀態，創角失敗不再直接進入遊戲
- 創角頁精簡化：職業選擇 + 角色立繪 + 簡短說明 + 名稱輸入，初始能力值摺疊
- 版權改名：亞丁大陸 → 奧丁大陸，天堂地名 → 北歐神話原創名
- 圖檔 manifest 支援：`/assets/assets-manifest.json`

## 隱藏原始碼下載

```
你的網址/mb-src-q7x2k9.zip
```

## assets-manifest 格式

扁平 JSON 物件：`{ 圖片id: "相對於assets/的子路徑" }`

範例：
```json
{
  "EH6NSfRHy5": "01_class/EH6NSfRHy5.png",
  "aadkq57bnqcoi_ve_miaoda": "12_map/aadkq57bnqcoi_ve_miaoda.png"
}
```

assetUrl(id) 解析優先順序：
1. `manifest[id]` 路徑（若 manifest 已載入且有此 id）
2. `assets/<分類slug>/<id>.png`（SPRITE_CATEGORY_MAP 查分類）
3. `assets/<id>.png`（扁平 fallback）
4. CDN（aka.doubaocdn.com/s/<id>）

manifest 缺失時自動 fallback 到分類目錄邏輯，不影響遊戲運作。

## 離線模式判定

- `fetch /api/*` 有回應（含 4xx/5xx）→ **已連線**（綠色）
- `fetch /api/*` 網路錯誤 / 404 → **未連線伺服器**（紅色），提示「需以 Web Service 部署（npm start）」
- 單純靜態站部署（只有 index.html/js/css）時，前端會顯示未連線並阻止創建角色

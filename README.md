# 君主之刃 v2.0.2 · 正式營運全棧版

## 遊戲名稱
君主之刃（LINEAGE OF SWORDS）v2.0.2

## 技術架構
- **前端**：HTML5 + CSS3 + Vanilla JavaScript（無框架），Canvas 2D 渲染
- **後端**：Node.js 原生 http 模組 + Socket.IO v4（輕量、無外部資料庫）
- **資料庫**：JSON 檔案持久化（data/ 目錄）
- **部署**：DigitalOcean App Platform / 任何 Node 環境 / 純靜態 CDN

## 檔案結構
```
sword-lineage-v2.0.2/
├── index.html          # HTML 本體
├── styles.css          # 遊戲樣式
├── auth.css            # 帳號系統樣式
├── game.js             # 遊戲主邏輯
├── auth.js             # 帳號 / 登入 / 註冊 / 伺服器選擇 / GM 面板
├── lang.js             # 語系檔
├── iso-map.js          # 等距地圖系統
├── sprite_object.js    # 精靈 / 物件系統
├── audio.js            # 音訊基礎模組
├── audio-manager.js    # 音訊管理員
├── transform.js        # 變換工具函式
├── multiplayer.js      # 多人連線用戶端（Socket.IO）
├── bug-report.js       # Bug 回報與開發者後台
├── package.json        # 專案設定（含 start 與 socket.io 依賴）
├── server/
│   └── server.cjs      # 後端主伺服器（靜態服務 + 帳號 API + Socket.IO）
└── data/
    ├── accounts.json   # 帳號資料（自動建立）
    └── bug-reports.json # Bug 回報（自動建立）
```

## 快速啟動（本機）

### 全棧模式（推薦，可多人連線）

1. 安裝 Node.js 18+
2. 進入專案目錄：
   ```bash
   npm install
   npm start
   ```
3. 瀏覽器開啟 http://localhost:3000
4. 註冊帳號 → 選伺服器 → 創角 → 開始遊戲
5. 兩支手機連同一個 IP/網址、登入不同帳號 → 進入同一世界（多人連線）

## v2.0.2 更新項目
- 開啟 app 一律先顯示官方首頁，禁止自動跳轉 / 自動闖關
- 登入 / 註冊失敗不再自動切離線，留在表單提示錯誤
- 設定頁新增「登出 / 返回首頁」按鈕
- 首頁密技下載改為原生 a[download] 大按鈕，相容內嵌瀏覽器
- 創角頁重製為天堂經典樣式（職業列 / 立繪 / 真變身展示 / 重複確認）
- 取消手動配點，改為系統依職業自動分配初始屬性

## 部署到 DigitalOcean App Platform

1. 把整個專案 push 到 GitHub
2. App Platform 新建 Web Service，選你的 repo
3. 設定：
   - **Build Command**: `npm install`
   - **Run Command**: `npm start`
   - **HTTP Port**: App Platform 自動注入（程式已支援 process.env.PORT）
4. 環境變數（選擇性）：
   - NODE_ENV=production
   - DEV_PASSWORD=你的密碼（開發者後台密碼，預設 owner2026）
5. Persistent Volume（建議，永久保存帳號資料）：
   - Mount Path: /app/data（視 App Platform 實際 root 調整）
   - Size: 1 GB 就夠

# 君主之刃 v2.0.6 · 正式營運

## 系統需求
- Node.js >= 16.0.0
- 建議記憶體 >= 512MB

## 快速部署

```bash
npm install
npm start
```

預設監聽 http://localhost:3000

## v2.0.6 更新重點
- 隱藏下載通道修復：長按Logo全平台可靠觸發，加上「另開新視窗」備援下載
- Hero主標優化：字級/間距縮小，手機一行呈現不破版
- 拿掉「第二章」字樣，副標改為「君主之刃 · 烈焰傳說 全新登場」
- PWA 安裝：版本標籤改為「下載遊戲」按鈕，支援 Android/Chrome 直接安裝、iOS 加入主畫面引導
- 官網動畫強化：火焰餘燼粒子、Hero 呼吸脈動、標題漸入、按鈕 hover 光流
- 新增遊戲展示區：變身圖鑑自動輪播、亞丁大陸場景全景 banner
- Scroll Reveal：捲動時元素漸入，更有層次感

## 檔案結構
- index.html / styles.css / auth.css / auth.js
- game.js / lang.js / transform.js / audio.js / audio-manager.js
- iso-map.js / multiplayer.js / bug-report.js
- cdn-category-map.txt / manifest.json
- server/server.cjs · server/index.cjs
- package.json · README.md

## GM 密碼
預設 GM 帳號：19811013
透過環境變數 GM_PASSWORD 設定自訂密碼。
GM 身分認證以伺服器端 isGM 欄位為準。

## 開發者通道
在官方網頁首頁，長按左上角 Logo 持續 2 秒 → 輸入密碼 owner2026 → 下載原始碼 ZIP。
（長按支援：滑鼠左鍵、iOS Safari、Android Chrome、內嵌瀏覽器）

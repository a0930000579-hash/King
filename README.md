# 暗黑天堂MMORPG 完整原始碼

## 遊戲名稱
暗黑天堂MMORPG（君主之刃 · 自由移動 MMORPG）

## 遊戲版本
v1.4.1-cdn

## 技術架構
- 純前端 HTML5 + CSS3 + Vanilla JavaScript（無框架）
- Canvas 2D 渲染場景 / 精靈
- 無後端依賴，單機運行

## 圖資來源
- 線上模式（預設）：圖片從 CDN（aka.doubaocdn.com）載入，http(s) 部署時自動優先 CDN
- 離線模式：將圖片放入 `assets/` 資料夾，並於遊戲設定中開啟「離線模式」
- CDN 容錯：本地圖片 404 時自動退回 CDN；CDN 也失敗才顯示占位

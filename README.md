# 君主之刃 v2.0.8 · 正式營運

## 系統需求
- Node.js >= 16.0.0

## 快速部署
```bash
npm install
npm start
```
預設監聽 http://localhost:3000

## v2.0.8 更新重點
- 修復嚴重阻塞 bug：新帳號登入選伺服器後「創建角色」不再直接跳進空世界
- 新增 auth 端角色建立頁（六職業選擇、命名、重複確認、初始能力值、最強變身展示）
- 修復底部導航每顆按鈕文字重複（圓鈕內 + 下方各一次）
- 圖片加載鏈路統一：assets/<分類>/<id>.png → assets/<id>.png → CDN（本地優先）
- 新增 15 個圖片分類資料夾（01_class ~ 15_effect）
- transform.js / MAP_BG_* / BUFF_ICONS 全部改為 assetUrl() 統一調用
- 隱藏原始碼下載網址：/mb-src-q7x2k9.zip

## 隱藏原始碼下載
```
你的網址/mb-src-q7x2k9.zip
```
Content-Disposition: attachment，直接下載。

## v2.0.8 創角流程修復說明
- 根因：v2.0.5/v2.0.6 重構 auth 後，char 頁的「創建新角色」直接呼叫 startGameWithNewChar() 進遊戲
  但此時 GS.player.created 仍為 false，game.js 會顯示舊版 char-create-screen，
  但舊版頁面在 auth-overlay 之下、且 auth 把 overlay hidden 時還沒跑 init 流程，導致全黑。
- 修法：char 頁點擊創建新角色 → 切換到 auth 端的 charCreate view（完整創角頁）
  → 命名 + 重複確認 → 創建角色寫入 localStorage('mmo_new_char') → startGameCommon()
  → game.js onAuthReady 讀 mmo_new_char 並設置 GS.player.created=true → init() 正常跑
  → 有 created=true，不會再彈舊版創角頁，直接進世界看到地圖、角色、NPC。

## 圖片分類調用順序
assets/<分類slug>/<id>.png → assets/<id>.png → CDN
15 分類：01_class, 02_transform, 03_hero, 04_monster, 05_boss, 06_npc, 07_skill,
        08_equip, 09_item, 10_card, 11_ui, 12_map, 13_siege, 14_mount, 15_effect


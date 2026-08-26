# 暗黑天堂MMORPG — 多人連線伺服器

Node.js + Socket.IO。**本機可直接測、Heroku 一鍵部署、零資料庫依賴就能先跑**（記憶體運作；資料庫日後再加）。

---

## A. 本機單機測試（3 分鐘看到真人同步）

需求：安裝 [Node.js 18+](https://nodejs.org)。

```bash
cd mmorpg-server
npm install
npm start
```

看到「伺服器已啟動」後：

1. 瀏覽器打開 `http://localhost:3000/demo.html`
2. **再開一個分頁、同一網址**（或用另一支手機連你電腦IP）
3. 在其中一個分頁點畫面移動 → 另一個分頁會看到角色即時走過去
4. 也會看到 20 個 AI 玩家在各地圖走動、聊天

> 這證明多人同步是真的：不是單機假AI，是透過伺服器廣播。

關閉：`Ctrl+C`。

---

## B. Heroku 一鍵 / 指令部署

### 方式1：一鍵部署按鈕（推到 GitHub 後）

1. 把整個 `mmorpg-server` 資料夾推到你的 GitHub 倉庫
2. 在 GitHub README 貼上這個按鈕（網址換成你的倉庫）：

```markdown
[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/你的帳號/mmorpg-server)
```

3. 點按鈕 → 登入 Heroku → 它會自動裝依賴、用 `Procfile` 啟動、設定好 AI 數量 → 拿到線上網址，完成。

### 方式2：指令部署

```bash
cd mmorpg-server
git init && git add . && git commit -m "mmorpg server"
heroku create 你的伺服器名字
git push heroku main
heroku open
```

完成後網址為 `https://你的伺服器名字.herokuapp.com/demo.html`。

> 免費方案夠測試；正式營運建議付費 dyno + 之後加 Heroku Postgres / Heroku Redis。

---

## C. 把你的正式遊戲接上去（重要）

1. 把遊戲的 `index.html`、`css/`、`js/`、`assets/` 全部複製到本專案的 **`public/`** 資料夾（覆蓋預設 index.html）。
2. 在你的 `index.html` 的 `</body>` 前加入：

```html
<script src="/socket.io/socket.io.js"></script>
```

3. 在 `js/game.js` 開頭建立連線（其餘遊戲邏輯先不動）：

```js
const NET = (() => {
  const sock = io();
  const others = new Map();
  sock.on('connect', () => {
    sock.emit('join_world', { name: player.name, class: player.class, level: player.level });
    sock.emit('enter_map', { mapId: currentMapId, channel: 0 });
  });
  // 玩家移動時送意圖
  function sendMove(x, y, dir){ sock.emit('move', { x, y, dir }); }
  // 收到附近所有人的狀態 → 在你的渲染迴圈把 others 畫出來
  sock.on('map_state', ({entities}) => {
    // entities: [{id,name,class,level,x,y,dir,moving,transform,country,isBot}]
    window.__netEntities = entities;
  });
  sock.on('player_left', ({id}) => {});
  return { sock, sendMove };
})();
```

4. 在你原本「移動」的程式碼裡，每次位置更新呼叫 `NET.sendMove(x,y,dir)`；
   在「畫面渲染」迴圈，把 `window.__netEntities` 裡不是自己的實體，用你現有的精靈圖畫出來（取代現在的前端假AI）。
5. 攻擊、聊天、進地圖比照 `server.js` 支援的事件送（`attack` / `chat` / `enter_map`）。

> 目前伺服器已實作：連線、頻道分流、移動同步、AI bot、聊天、攻擊特效廣播。
> 戰鬥傷害判定、背包/強化/攻城的伺服器化，是下一階段（見技術文件 P0/P1）。

---

## D. 環境變數（可選）

| 變數 | 預設 | 說明 |
|---|---|---|
| `PORT` | 3000 | Heroku 自動給，本機不用設 |
| `BOT_COUNT` | 20 | 伺服器AI玩家數，真人多了可設 0 |
| `MAX_PER_CHANNEL` | 60 | 每地圖每頻道人數上限 |

---

## E. 目錄結構

```
mmorpg-server/
├── server.js          主伺服器（Express + Socket.IO + 10Hz廣播）
├── package.json       依賴
├── Procfile           Heroku 啟動命令
├── app.json           Heroku 一鍵部署設定
├── lib/
│   ├── world.js       玩家/頻道/AOI/移動驗證
│   └── bot.js         伺服器端AI玩家
└── public/
    ├── index.html     入口（正式遊戲覆蓋此檔）
    ├── demo.html      雙人同步測試頁
    └── assets/        你的遊戲圖檔放這裡
```

## F. 下一步建議順序

1. 先照 A 確認兩個分頁能同步 ✅
2. 照 C 把正式遊戲接上，看到真人在你的村莊走
3. 戰鬥伺服器化（怪物託管、傷害判定）
4. 帳號 + PostgreSQL（角色存雲端）
5. 軍團/攻城/稅收伺服器化 + Redis 排行榜

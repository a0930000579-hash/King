/**
 * bot.js — 伺服器端 AI 玩家（MVP）
 * 真人上線後，這些 bot 對客戶端來說跟真人一模一樣（isBot 僅供除錯）。
 * 行為：隨機分散各地圖、隨機走動、偶爾聊天、等級緩慢成長。
 * 未來可換成行為樹（打怪/回村/加軍團），對接點都在 update()。
 */

const SURNAMES = ['影','夜','血','蒼','銀','闇','炎','霜','龍','聖','幽','冥','熾','雷','玄'];
const GIVEN = ['無雙','殘月','狂刀','流星','疾風','破軍','千刃','孤星','戰魂','幽冥','傲天','問天','絕影','紅蓮','蒼穹','行者','弒神','歸來','劍客','法師'];
const CLASSES = ['warrior','mage','archer','priest','assassin','paladin'];
const BOT_CHAT = ['有人一起練嗎','收強化卷','這邊怪好多','剛剛打到紫裝！','有人要組隊打城嗎','掛機中勿擾','金幣真難賺','誰看到Boss了','這伺服器不錯','加油衝等'];

function randName(used) {
  for (let i = 0; i < 50; i++) {
    const n = SURNAMES[Math.floor(Math.random()*SURNAMES.length)] +
              GIVEN[Math.floor(Math.random()*GIVEN.length)];
    if (!used.has(n)) { used.add(n); return n; }
  }
  return '玩家' + Math.floor(Math.random()*9000+1000);
}

class BotManager {
  constructor(world, io, count = 20) {
    this.world = world; this.io = io;
    this.bots = new Map();
    this.usedNames = new Set();
    this.maps = require('./world').MAP_IDS;
    this.spawn(count);
    // 每2.5秒讓bot走動
    this.moveTimer = setInterval(() => this.wander(), 2500);
    // 每8~14秒bot聊天
    this.chatTimer = setInterval(() => this.chat(), 9000);
  }

  spawn(count) {
    for (let i = 0; i < count; i++) this._one();
  }

  _one() {
    const id = 'bot_' + Math.random().toString(36).slice(2, 9);
    const mapId = this.maps[Math.floor(Math.random()*this.maps.length)];
    const bot = {
      id, name: randName(this.usedNames),
      class: CLASSES[Math.floor(Math.random()*CLASSES.length)],
      level: 1 + Math.floor(Math.random()*15),
      x: 300 + Math.random()*1400, y: 300 + Math.random()*1400,
      dir: 1, moving: false, transform: null,
      country: ['justice','evil'][Math.random()<0.5?0:1],
      isBot: true
    };
    this.world.addPlayer(bot);
    this.world.joinChannel(bot, mapId, 0);
    this.io.to('chan:' + bot.mapId + ':' + bot.channel).emit('player_joined', { id: bot.id, name: bot.name });
    this.bots.set(id, bot);
  }

  wander() {
    for (const bot of this.bots.values()) {
      // 偶爾換地圖（解決「bot都跟著玩家」：bot本來就分散且會自己遷徙）
      if (Math.random() < 0.06) {
        const newMap = this.maps[Math.floor(Math.random()*this.maps.length)];
        this.world.leaveChannel(bot);
        this.world.joinChannel(bot, newMap, 0);
      }
      const nx = bot.x + (Math.random()-0.5)*220;
      const ny = bot.y + (Math.random()-0.5)*220;
      bot.dir = nx >= bot.x ? 1 : -1;
      this.world.movePlayer(bot.id, nx, ny);
    }
  }

  chat() {
    const arr = [...this.bots.values()];
    if (!arr.length) return;
    const bot = arr[Math.floor(Math.random()*arr.length)];
    const text = BOT_CHAT[Math.floor(Math.random()*BOT_CHAT.length)];
    this.io.to('chan:' + bot.mapId + ':' + bot.channel).emit('chat', {
      channel: 'world', name: bot.name, text, ts: Date.now()
    });
  }

  stop() { clearInterval(this.moveTimer); clearInterval(this.chatTimer); }
}

module.exports = { BotManager };

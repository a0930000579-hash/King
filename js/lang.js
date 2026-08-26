/* ============================================
   君主之刃 · 多语言文本
   zh-CN / zh-TW / en-US
   ============================================ */

// 当前语言（全局变量，供 lang.js 和 game.js 共享）
var CURRENT_LANG = 'zh-TW';

const LANG = {
  'zh-CN': {
    // 顶部状态栏
    combatPower: '戰力',
    level: 'Lv.',
    location: '古鲁丁村庄',
    
    // 战斗日志
    battleLog: '戰斗記錄',
    enterArea: '進入 {location} 區域，戰斗開始！',
    monstersAppear: '{count} 只怪物出現了！',
    monsterDefeated: '{monster} 被擊败！获得 {gold} 金币，{exp} 經验',
    questComplete: '任務完成：{quest}！获得 {gold} 金币，{exp} 經验',
    levelUp: '🎉 升級！达到 {level} 級！戰力提升！',
    autoOn: '已開啟自動掛機',
    autoOff: '已切换為手動操作',
    memberDown: '{name} 倒下了！',
    memberRevive: '{name} 重新加入戰斗！',
    boughtItem: '购买了 {item}',
    summonWaiting: '召唤冷却中',
    goldDropped: '金币 +{amount}',
    
    // 技能名
    skills: {
      basic: '普攻',
      whirlwind: '旋风斩',
      fireball: '火球术',
      heal: '治愈术',
      thunder: '雷霆一擊'
    },
    
    // 战斗日志句式
    dealDamage: '{attacker} 使用 {skill} 對 {target} 造成 {dmg} 伤害',
    dealDamageCrit: '{attacker} 使用 {skill} 【暴擊】對 {target} 造成 {dmg} 伤害',
    autoDamage: '{attacker} 對 {target} 造成 {dmg} 伤害',
    autoDamageCrit: '{attacker} 【暴擊】對 {target} 造成 {dmg} 伤害',
    enemyDamage: '{attacker} 對 {target} 造成 {dmg} 伤害',
    healLog: '{target} 恢復了 {amount} 點生命',
    
    // 任务
    questTracker: '任務',
    questTypes: {
      main: '主线',
      daily: '日常',
      event: '活動'
    },
    questNames: [
      '讨伐哥布林', '清剿兽人据點', '讨伐亡灵军團',
      '荒野狩猎', '地下城探险', '迷雾森林试炼',
      '古代遗迹探索', '骷髅墓地', '黑森林深處'
    ],
    questDescs: [
      '在古鲁丁村外讨伐 5 只哥布林',
      '清剿兽人据點的守卫',
      '讨伐復活的亡灵军團',
      '前往荒野狩猎野兽',
      '探索地下城中的秘密',
      '穿越迷雾森林的试炼',
      '探索古代遗迹中的寶物',
      '清理骷髅墓地的亡灵',
      '深入黑森林調查异常'
    ],
    
    // 底部导航
    nav: {
      battle: '戰斗',
      hero: '英雄',
      dungeon: '副本',
      quest: '任務',
      guild: '公會',
      shop: '商店'
    },
    
    // 英雄页
    hero: '英雄',
    stats: '属性',
    equipment: '装備',
    partyMembers: '队伍成员',
    hp: '生命',
    mp: '魔法',
    atk: '攻擊',
    def: '防御',
    crit: '暴擊率',
    critDmg: '暴擊伤害',
    class: '职业',
    
    // 装备槽
    equipSlots: {
      weapon: '武器',
      shield: '盾牌',
      helmet: '頭盔',
      armor: '铠甲',
      boots: '靴子',
      ring: '戒指',
      necklace: '项链',
      cape: '披风'
    },
    
    // 角色定位
    roles: {
      tank: '坦克',
      dps: '输出',
      healer: '治疗'
    },
    
    // 副本
    dungeon: '副本',
    recommendedCP: '推荐戰力',
    dungeons: [
      { name: '哥布林巢穴', diff: '普通' },
      { name: '黑暗矿洞', diff: '精英' },
      { name: '亡灵古堡', diff: '困难' },
      { name: '龍骨荒野', diff: '史诗' },
      { name: '深渊之眼', diff: '传說' }
    ],
    enterDungeon: '進入副本：{name}',
    dungeonComingSoon: '副本功能開發中，敬請期待！',
    
    // 公会
    guild: '公會',
    guildName: '烈焰军團',
    guildLevel: '公會等級 {level} · {cur}/{max} 人',
    totalCP: '總戰力',
    rank: '排名',
    guildMembers: '公會成员',
    guildRoles: {
      leader: '會長',
      vice: '副會長',
      elite: '精英',
      member: '成员'
    },
    
    // 商店
    shop: '商店',
    buy: '购买',
    buySuccess: '购买成功：{item}',
    notEnoughGold: '金币不足！',
    shopTabs: {
      consumable: '消耗品',
      equip: '装備',
      gem: '寶石',
      vip: 'VIP'
    },
    shopItems: {
      consumable: [
        { name: '大型血瓶', price: 500 },
        { name: '大型蓝瓶', price: 400 },
        { name: '經验药水', price: 2000 },
        { name: '回城卷轴', price: 100 },
        { name: '戰力祝福', price: 5000 },
        { name: '神秘寶箱', price: 10000 }
      ],
      equip: [
        { name: '精英長劍', price: 50000 },
        { name: '精钢盾牌', price: 45000 },
        { name: '板甲護胸', price: 80000 },
        { name: '黄金頭盔', price: 65000 }
      ],
      gem: [
        { name: '紅寶石 LV1', price: 3000 },
        { name: '蓝寶石 LV1', price: 3000 },
        { name: '绿寶石 LV1', price: 2500 },
        { name: '金寶石 LV1', price: 5000 }
      ],
      vip: [
        { name: '青铜月卡', price: 300 },
        { name: '白银月卡', price: 980 },
        { name: '黄金月卡', price: 2980 },
        { name: '至尊年卡', price: 29800 }
      ]
    },
    
    // 设置
    settings: '設置',
    language: '語言',
    settingsComingSoon: '設置功能開發中...',
    
    // 角色名
    partyNames: [
      '赤焰骑士', '月影法师', '聖堂骑士', '森林游侠', '聖光祭司'
    ],
    partyClasses: ['劍士', '法师', '骑士', '弓手', '祭司'],
    
    // 怪物名
    monsters: {
      goblin: '哥布林',
      orc: '兽人戰士',
      skeleton: '骷髅弓手'
    },
    
    // 杂项
    auto: '自動',
    autoOnLabel: '自動中',
    manual: '手動',
    goldGain: '+{amount}/秒',
    
    // 变身系统
    transformSystem: '變身系统',
    transformLevel: '級',
    transformLocked: '等級不足，尚未解锁此等級段',
    transformTypes: {
      str: '力量型',
      vit: '体质型',
      agi: '敏捷型',
      int: '智力型',
      luk: '幸運型'
    },
    transformName: '{tier}級·{type}',
    transformDesc: '{tier}級解锁的{type}變身形態，提供独特的属性加成效果。',
    transformUnlock: '🎉 解锁新變身：{name}！',
    transformEquip: '装備變身：{name}',
    transformEquipped: '已装備',
    equipTransform: '装備',
    unlockTransform: '解锁 {cost}',
    noTransformEquipped: '未装備變身，點擊下方選择一個',
    unlocked: '已解锁',
    
    // 召唤英雄
    summonHeroes: '召唤英雄',
    summonTip: '點擊頭像可切换上阵状態，最多可同时出戰 4 名召唤英雄',
    summonDeploy: '{name} 出戰！',
    summonRecall: '{name} 已召回',
    summonDamage: '{attacker} 對 {target} 造成 {dmg} 伤害',
    summonDamageCrit: '{attacker} 【暴擊】對 {target} 造成 {dmg} 伤害',
    
    // 战斗相关
    targetChange: '切换目标：{target}',
    castSkill: '{attacker} 施放 {skill} 對 {target} 造成 {dmg} 伤害',
    castAOE: '{attacker} 施放 {skill}，對范圍内敌人造成伤害',
    playerDown: '你倒下了...正在復活中',
    playerRevive: '你已復活，重返戰场！',
  },
  
  'zh-TW': {
    // 頂部狀態欄
    combatPower: '戰力',
    level: 'Lv.',
    location: '古魯丁村莊',
    
    // 戰鬥日誌
    battleLog: '戰鬥記錄',
    enterArea: '進入 {location} 區域，戰鬥開始！',
    monstersAppear: '{count} 隻怪物出現了！',
    monsterDefeated: '{monster} 被擊敗！獲得 {gold} 金幣，{exp} 經驗',
    questComplete: '任務完成：{quest}！獲得 {gold} 金幣，{exp} 經驗',
    levelUp: '🎉 升級！達到 {level} 級！戰力提升！',
    autoOn: '已開啟自動掛機',
    autoOff: '已切換為手動操作',
    memberDown: '{name} 倒下了！',
    memberRevive: '{name} 重新加入戰鬥！',
    boughtItem: '購買了 {item}',
    summonWaiting: '召喚冷卻中',
    goldDropped: '金幣 +{amount}',
    
    // 技能名
    skills: {
      basic: '普攻',
      whirlwind: '旋風斬',
      fireball: '火球術',
      heal: '治癒術',
      thunder: '雷霆一擊'
    },
    
    // 戰鬥日誌句式
    dealDamage: '{attacker} 使用 {skill} 對 {target} 造成 {dmg} 傷害',
    dealDamageCrit: '{attacker} 使用 {skill} 【暴擊】對 {target} 造成 {dmg} 傷害',
    autoDamage: '{attacker} 對 {target} 造成 {dmg} 傷害',
    autoDamageCrit: '{attacker} 【暴擊】對 {target} 造成 {dmg} 傷害',
    enemyDamage: '{attacker} 對 {target} 造成 {dmg} 傷害',
    healLog: '{target} 恢復了 {amount} 點生命',
    
    // 任務
    questTracker: '任務',
    questTypes: {
      main: '主線',
      daily: '日常',
      event: '活動'
    },
    questNames: [
      '討伐哥布林', '清剿獸人據點', '討伐亡靈軍團',
      '荒野狩獵', '地下城探險', '迷霧森林試煉',
      '古代遺跡探索', '骷髏墓地', '黑森林深處'
    ],
    questDescs: [
      '在古魯丁村外討伐 5 隻哥布林',
      '清剿獸人據點的守衛',
      '討伐復活的亡靈軍團',
      '前往荒野狩獵野獸',
      '探索地下城中的秘密',
      '穿越迷霧森林的試煉',
      '探索古代遺跡中的寶物',
      '清理骷髏墓地的亡靈',
      '深入黑森林調查異常'
    ],
    
    // 底部導航
    nav: {
      battle: '戰鬥',
      hero: '英雄',
      dungeon: '副本',
      quest: '任務',
      guild: '公會',
      shop: '商店'
    },
    
    // 英雄頁
    hero: '英雄',
    stats: '屬性',
    equipment: '裝備',
    partyMembers: '隊伍成員',
    hp: '生命',
    mp: '魔法',
    atk: '攻擊',
    def: '防禦',
    crit: '暴擊率',
    critDmg: '暴擊傷害',
    class: '職業',
    
    // 裝備槽
    equipSlots: {
      weapon: '武器',
      shield: '盾牌',
      helmet: '頭盔',
      armor: '鎧甲',
      boots: '靴子',
      ring: '戒指',
      necklace: '項鍊',
      cape: '披風'
    },
    
    // 角色定位
    roles: {
      tank: '坦克',
      dps: '輸出',
      healer: '治療'
    },
    
    // 副本
    dungeon: '副本',
    recommendedCP: '推薦戰力',
    dungeons: [
      { name: '哥布林巢穴', diff: '普通' },
      { name: '黑暗礦洞', diff: '精英' },
      { name: '亡靈古堡', diff: '困難' },
      { name: '龍骨荒野', diff: '史詩' },
      { name: '深淵之眼', diff: '傳說' }
    ],
    enterDungeon: '進入副本：{name}',
    dungeonComingSoon: '副本功能開發中，敬請期待！',
    
    // 公會
    guild: '公會',
    guildName: '烈焰軍團',
    guildLevel: '公會等級 {level} · {cur}/{max} 人',
    totalCP: '總戰力',
    rank: '排名',
    guildMembers: '公會成員',
    guildRoles: {
      leader: '會長',
      vice: '副會長',
      elite: '精英',
      member: '成員'
    },
    
    // 商店
    shop: '商店',
    buy: '購買',
    buySuccess: '購買成功：{item}',
    notEnoughGold: '金幣不足！',
    shopTabs: {
      consumable: '消耗品',
      equip: '裝備',
      gem: '寶石',
      vip: 'VIP'
    },
    shopItems: {
      consumable: [
        { name: '大型血瓶', price: 500 },
        { name: '大型藍瓶', price: 400 },
        { name: '經驗藥水', price: 2000 },
        { name: '回城卷軸', price: 100 },
        { name: '戰力祝福', price: 5000 },
        { name: '神秘寶箱', price: 10000 }
      ],
      equip: [
        { name: '精英長劍', price: 50000 },
        { name: '精鋼盾牌', price: 45000 },
        { name: '板甲護胸', price: 80000 },
        { name: '黃金頭盔', price: 65000 }
      ],
      gem: [
        { name: '紅寶石 LV1', price: 3000 },
        { name: '藍寶石 LV1', price: 3000 },
        { name: '綠寶石 LV1', price: 2500 },
        { name: '金寶石 LV1', price: 5000 }
      ],
      vip: [
        { name: '青銅月卡', price: 300 },
        { name: '白銀月卡', price: 980 },
        { name: '黃金月卡', price: 2980 },
        { name: '至尊年卡', price: 29800 }
      ]
    },
    
    // 設置
    settings: '設置',
    language: '語言',
    settingsComingSoon: '設置功能開發中...',
    
    // 角色名
    partyNames: [
      '赤焰騎士', '月影法師', '聖堂騎士', '森林遊俠', '聖光祭司'
    ],
    partyClasses: ['劍士', '法師', '騎士', '弓手', '祭司'],
    
    // 怪物名
    monsters: {
      goblin: '哥布林',
      orc: '獸人戰士',
      skeleton: '骷髏弓手'
    },
    
    // 變身系統
    transformSystem: '變身系統',
    transformLevel: '級',
    transformLocked: '等級不足，尚未解鎖此等級段',
    transformTypes: {
      str: '力量型',
      vit: '體質型',
      agi: '敏捷型',
      int: '智力型',
      luk: '幸運型'
    },
    transformName: '{tier}級·{type}',
    transformDesc: '{tier}級解鎖的{type}變身形態，提供獨特的屬性加成效果。',
    transformUnlock: '🎉 解鎖新變身：{name}！',
    transformEquip: '裝備變身：{name}',
    transformEquipped: '已裝備',
    equipTransform: '裝備',
    unlockTransform: '解鎖 {cost}',
    noTransformEquipped: '未裝備變身，點擊下方選擇一個',
    unlocked: '已解鎖',
    noTransformEquipped: '未裝備變身，點擊下方選擇一個',
    unlocked: '已解鎖',
    
    // 召喚英雄
    summonHeroes: '召喚英雄',
    summonTip: '點擊頭像可切換上陣狀態，最多可同時出戰 4 名召喚英雄',
    summonDeploy: '{name} 出戰！',
    summonRecall: '{name} 已召回',
    summonDamage: '{attacker} 對 {target} 造成 {dmg} 傷害',
    summonDamageCrit: '{attacker} 【暴擊】對 {target} 造成 {dmg} 傷害',
    
    // 戰鬥相關
    targetChange: '切換目標：{target}',
    castSkill: '{attacker} 施放 {skill} 對 {target} 造成 {dmg} 傷害',
    castAOE: '{attacker} 施放 {skill}，對範圍內敵人造成傷害',
    playerDown: '你倒下了...正在復活中',
    playerRevive: '你已復活，重返戰場！',
    
    // 雜項
    auto: '自動',
    autoOnLabel: '自動中',
    manual: '手動',
    goldGain: '+{amount}/秒'
  },

  'en-US': {
    // Top bar
    combatPower: 'CP',
    level: 'Lv.',
    location: 'Gludin Village',
    
    // Battle log
    battleLog: 'Battle Log',
    enterArea: 'Entered {location}. Battle begins!',
    monstersAppear: '{count} monsters appear!',
    monsterDefeated: '{monster} defeated! +{gold} gold, +{exp} exp',
    questComplete: 'Quest Complete: {quest}! +{gold} gold, +{exp} exp',
    levelUp: '🎉 Level Up! Now level {level}! CP increased!',
    autoOn: 'Auto-battle enabled',
    autoOff: 'Switched to manual mode',
    memberDown: '{name} has fallen!',
    memberRevive: '{name} returns to battle!',
    boughtItem: 'Purchased {item}',
    summonWaiting: 'Summon CD',
    goldDropped: 'Gold +{amount}',
    
    // Skills
    skills: {
      basic: 'Basic',
      whirlwind: 'Whirlwind',
      fireball: 'Fireball',
      heal: 'Heal',
      thunder: 'Thunder'
    },
    
    // Battle log patterns
    dealDamage: '{attacker} uses {skill} on {target} for {dmg} dmg',
    dealDamageCrit: '{attacker} CRIT with {skill} on {target} for {dmg} dmg',
    autoDamage: '{attacker} hits {target} for {dmg} dmg',
    autoDamageCrit: '{attacker} CRITS {target} for {dmg} dmg',
    enemyDamage: '{attacker} hits {target} for {dmg} dmg',
    healLog: '{target} healed for {amount} HP',
    
    // Quest
    questTracker: 'Quest',
    questTypes: {
      main: 'Main',
      daily: 'Daily',
      event: 'Event'
    },
    questNames: [
      'Goblin Hunt', 'Orc Outpost', 'Undead Legion',
      'Wild Hunt', 'Dungeon Explorer', 'Misty Forest Trial',
      'Ancient Ruins', 'Skeleton Graveyard', 'Deep Black Forest'
    ],
    questDescs: [
      'Defeat 5 goblins outside Gludin',
      'Clear the orc outpost guards',
      'Defeat the resurrected undead legion',
      'Hunt beasts in the wilderness',
      'Explore secrets in the dungeon',
      'Traverse the Misty Forest trial',
      'Explore treasures in ancient ruins',
      'Clear undead in skeleton graveyard',
      'Investigate anomalies in Black Forest'
    ],
    
    // Bottom nav
    nav: {
      battle: 'Battle',
      hero: 'Hero',
      dungeon: 'Dungeon',
      quest: 'Quest',
      guild: 'Guild',
      shop: 'Shop'
    },
    
    // Hero page
    hero: 'Hero',
    stats: 'Stats',
    equipment: 'Equipment',
    partyMembers: 'Party Members',
    hp: 'HP',
    mp: 'MP',
    atk: 'ATK',
    def: 'DEF',
    crit: 'Crit Rate',
    critDmg: 'Crit Dmg',
    class: 'Class',
    
    // Equip slots
    equipSlots: {
      weapon: 'Weapon',
      shield: 'Shield',
      helmet: 'Helmet',
      armor: 'Armor',
      boots: 'Boots',
      ring: 'Ring',
      necklace: 'Necklace',
      cape: 'Cape'
    },
    
    // Roles
    roles: {
      tank: 'Tank',
      dps: 'DPS',
      healer: 'Healer'
    },
    
    // Dungeon
    dungeon: 'Dungeon',
    recommendedCP: 'Rec. CP',
    dungeons: [
      { name: 'Goblin Lair', diff: 'Normal' },
      { name: 'Dark Mine', diff: 'Elite' },
      { name: 'Undead Castle', diff: 'Hard' },
      { name: 'Dragonbone Wilds', diff: 'Epic' },
      { name: 'Abyssal Eye', diff: 'Legendary' }
    ],
    enterDungeon: 'Enter dungeon: {name}',
    dungeonComingSoon: 'Dungeon feature coming soon!',
    
    // Guild
    guild: 'Guild',
    guildName: 'Flame Legion',
    guildLevel: 'Guild Lv.{level} · {cur}/{max} members',
    totalCP: 'Total CP',
    rank: 'Rank',
    guildMembers: 'Members',
    guildRoles: {
      leader: 'Leader',
      vice: 'Vice',
      elite: 'Elite',
      member: 'Member'
    },
    
    // Shop
    shop: 'Shop',
    buy: 'Buy',
    buySuccess: 'Purchased: {item}',
    notEnoughGold: 'Not enough gold!',
    shopTabs: {
      consumable: 'Consumables',
      equip: 'Equipment',
      gem: 'Gems',
      vip: 'VIP'
    },
    shopItems: {
      consumable: [
        { name: 'Large HP Potion', price: 500 },
        { name: 'Large MP Potion', price: 400 },
        { name: 'EXP Potion', price: 2000 },
        { name: 'Teleport Scroll', price: 100 },
        { name: 'Power Blessing', price: 5000 },
        { name: 'Mystery Chest', price: 10000 }
      ],
      equip: [
        { name: 'Elite Longsword', price: 50000 },
        { name: 'Steel Shield', price: 45000 },
        { name: 'Plate Armor', price: 80000 },
        { name: 'Golden Helmet', price: 65000 }
      ],
      gem: [
        { name: 'Ruby LV1', price: 3000 },
        { name: 'Sapphire LV1', price: 3000 },
        { name: 'Emerald LV1', price: 2500 },
        { name: 'Topaz LV1', price: 5000 }
      ],
      vip: [
        { name: 'Bronze Monthly', price: 300 },
        { name: 'Silver Monthly', price: 980 },
        { name: 'Gold Monthly', price: 2980 },
        { name: 'Supreme Annual', price: 29800 }
      ]
    },
    
    // Settings
    settings: 'Settings',
    language: 'Language',
    settingsComingSoon: 'Settings coming soon...',
    
    // Party names
    partyNames: [
      'Flame Knight', 'Moon Mage', 'Templar', 'Forest Ranger', 'Light Priest'
    ],
    partyClasses: ['Warrior', 'Mage', 'Knight', 'Archer', 'Priest'],
    
    // Monster names
    monsters: {
      goblin: 'Goblin',
      orc: 'Orc Warrior',
      skeleton: 'Skeleton Archer'
    },
    
    // Transform system
    transformSystem: 'Transform System',
    transformLevel: 'Lv',
    transformLocked: 'Level too low for this tier',
    transformTypes: {
      str: 'Strength',
      vit: 'Vitality',
      agi: 'Agility',
      int: 'Intelligence',
      luk: 'Luck'
    },
    transformName: 'Lv.{tier} {type}',
    transformDesc: '{type} form unlocked at level {tier}. Offers unique stat bonuses.',
    transformUnlock: '🎉 New transform unlocked: {name}!',
    transformEquip: 'Equipped: {name}',
    transformEquipped: 'Equipped',
    equipTransform: 'Equip',
    unlockTransform: 'Unlock {cost}',
    noTransformEquipped: 'No transform equipped. Tap one below.',
    unlocked: 'Unlocked',
    
    // Summon heroes
    summonHeroes: 'Summon Heroes',
    summonTip: 'Toggle summon deployment. Max 4 summons in battle.',
    summonDeploy: '{name} deployed!',
    summonRecall: '{name} recalled.',
    summonDamage: '{attacker} hits {target} for {dmg} dmg',
    summonDamageCrit: '{attacker} CRITS {target} for {dmg} dmg',
    
    // Combat
    targetChange: 'Target: {target}',
    castSkill: '{attacker} casts {skill} on {target} for {dmg} dmg',
    castAOE: '{attacker} casts {skill}, hitting all nearby enemies',
    playerDown: 'You have fallen... reviving',
    playerRevive: 'You have returned to battle!',
    
    // Misc
    auto: 'Auto',
    autoOnLabel: 'Auto On',
    manual: 'Manual',
    goldGain: '+{amount}/s'
  }
};

// 语言工具函数
function t(key) {
  const lang = LANG[CURRENT_LANG] || LANG['zh-CN'];
  const parts = key.split('.');
  let result = lang;
  for (const p of parts) {
    if (result && typeof result === 'object') {
      result = result[p];
    } else {
      return key;
    }
  }
  return result !== undefined ? result : key;
}

function tf(key, vars) {
  let str = t(key);
  if (vars) {
    for (const k in vars) {
      str = str.replace('{' + k + '}', vars[k]);
    }
  }
  return str;
}

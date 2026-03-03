const GAME_VERSION = '0.13.4';
const VERSION_HISTORY = [
    { version: '0.13.4', date: '2026-03-03', summary: '让技能伤害与治疗随单位 ATK 和等级成长，并为失衡实验体补上图鉴技能信息。' },
    { version: '0.13.3', date: '2026-03-03', summary: '将图鉴中的属性克制区改为节点箭头式关系图，并整理宠物条目的属性展示，移除重复文案。' },
    { version: '0.13.2', date: '2026-03-03', summary: '将图鉴中的属性克制区重构为更清晰的单向箭头图，替换原先较杂乱的环形箭头布局。' },
    { version: '0.13.1', date: '2026-03-03', summary: '强化 Boss 数值与技能层级，调整宠物技能伤害曲线，取消普攻属性判定，并在图鉴大全中加入属性克制图与属性颜色标记。' },
    { version: '0.13.0', date: '2026-03-03', summary: '重构第一章主线节奏，加入村庄调查解谜、代理人守门战、实验室门禁谜题与内部失衡实验体 Boss。' },
    { version: '0.12.1', date: '2026-03-03', summary: '重构图鉴大全交互为居中弹窗，整合技能升级信息，并为不同稀有度增加独立颜色标记。' },
    { version: '0.12.0', date: '2026-03-03', summary: '新增剧情获得的图鉴大全，收录宠物、人物与敌对单位，并按遭遇与捕获逐步解锁条目。' },
    { version: '0.11.2', date: '2026-03-03', summary: '新增开发者专用的 NPC 对话与任务总表文档，汇总当前主线、支线和村庄对话实现。' },
    { version: '0.11.1', date: '2026-03-03', summary: '重做“桥边异响”支线引导，补上村长确认环节，并按阶段显示明确的下一步操作。' },
    { version: '0.11.0', date: '2026-03-03', summary: '重构风纹大陆世界观，明确三大势力动机，并将“微风村附近的异常核心”写入第一章伏笔。' },
    { version: '0.10.1', date: '2026-03-03', summary: '将商店入口收回村庄集市区域，并把休息调整为前三次免费、后续递增收费。' },
    { version: '0.10.0', date: '2026-03-03', summary: '加入双界面风格、技能悬停说明、技能总览与按等级节点解锁技能。' },
    { version: '0.9.3', date: '2026-03-02', summary: '修复日志队列下的按钮卡死问题，并加入返回主菜单与保存提示。' },
    { version: '0.9.2', date: '2026-03-02', summary: '加入日志队列与战斗节奏延迟，降低日志瞬时刷屏问题。' },
    { version: '0.9.1', date: '2026-03-02', summary: '修复等级与 MP 显示、旧存档数值归一化、状态面板重构，并加入更新日志体系。' },
    { version: '0.9.0', date: '2026-03-02', summary: '完成第一章基础闭环、扩展宠物图鉴与属性克制。' }
];

// ========== 游戏数据常量 ==========

const CURRENCY_NAME = '风纹币';
const RARITY_ORDER = ['普通', '稀有', '超稀有', '极品', '神兽'];
const TYPE_LIST = ['火', '水', '草', '普通', '飞行', '虫', '电', '机械'];
const TYPE_CHART = {
    '火': { strongAgainst: ['草', '虫'], weakAgainst: ['水'] },
    '水': { strongAgainst: ['火'], weakAgainst: ['草', '电'] },
    '草': { strongAgainst: ['水'], weakAgainst: ['火', '虫'] },
    '普通': { strongAgainst: [], weakAgainst: [] },
    '飞行': { strongAgainst: ['草', '虫'], weakAgainst: ['电'] },
    '虫': { strongAgainst: ['草'], weakAgainst: ['火', '飞行'] },
    '电': { strongAgainst: ['飞行', '水'], weakAgainst: ['草'] },
    '机械': { strongAgainst: [], weakAgainst: [] }
};

const STARTER_GIFT = {
    money: 20,
    human: { '普通球': 2 },
    pet: { '树果': 2 },
    special: {}
};

const DEFAULT_INVENTORY = {
    human: {},
    pet: {},
    special: {}
};

const BALL_DATA = {
    '普通球': { price: 10, startRate: 0.7, decay: 0.15, description: '最常见的捕获球，适合普通野宠。' },
    '中级球': { price: 22, startRate: 0.82, decay: 0.13, description: '做工更扎实，对稀有宠物更有效。' },
    '高级球': { price: 45, startRate: 0.9, decay: 0.1, description: '能在战斗中稳定压制野性反抗。' },
    '特级球': { price: 80, startRate: 0.96, decay: 0.07, description: '专为高阶个体设计的精工捕获球。' },
    '大师球': { price: 160, startRate: 1.0, decay: 0.02, description: '极其稀有，几乎能锁定任何目标。' },
    '究极球': { price: 250, startRate: 1.0, decay: 0, description: '传说中的终极工艺，理论上不会失手。' }
};

const HUMAN_ITEM_DATA = {
    '绷带': { price: 8, description: '人类专用，恢复主角 12 HP。', hp: 12, mp: 0 },
    '灵息药': { price: 10, description: '人类专用，恢复主角 8 MP。', hp: 0, mp: 8 }
};

const PET_ITEM_DATA = {
    '树果': { price: 6, description: '宠物专用，恢复主宠 10 HP。', hp: 10, mp: 0 },
    '灵芽露': { price: 9, description: '宠物专用，恢复主宠 8 MP。', hp: 0, mp: 8 }
};
const SHOP_ITEMS = [
    { name: '绷带', price: HUMAN_ITEM_DATA['绷带'].price, description: HUMAN_ITEM_DATA['绷带'].description },
    { name: '灵息药', price: HUMAN_ITEM_DATA['灵息药'].price, description: HUMAN_ITEM_DATA['灵息药'].description },
    { name: '树果', price: PET_ITEM_DATA['树果'].price, description: PET_ITEM_DATA['树果'].description },
    { name: '灵芽露', price: PET_ITEM_DATA['灵芽露'].price, description: PET_ITEM_DATA['灵芽露'].description },
    { name: '普通球', price: BALL_DATA['普通球'].price, description: BALL_DATA['普通球'].description },
    { name: '中级球', price: BALL_DATA['中级球'].price, description: BALL_DATA['中级球'].description },
    { name: '高级球', price: BALL_DATA['高级球'].price, description: BALL_DATA['高级球'].description },
    { name: '特级球', price: BALL_DATA['特级球'].price, description: BALL_DATA['特级球'].description },
    { name: '大师球', price: BALL_DATA['大师球'].price, description: BALL_DATA['大师球'].description },
    { name: '究极球', price: BALL_DATA['究极球'].price, description: BALL_DATA['究极球'].description }
];

const PET_MARKET = [
    { name: '大牙鼠', price: 80, description: '便宜耐用，适合新手补位。' },
    { name: '草跳兔', price: 95, description: '速度很快，适合消耗与游击。' },
    { name: '咕咕鸟', price: 120, description: '速度很快，适合抢先手。' },
    { name: '森叶鹿', price: 160, description: '森林中的回复型宠物，适合稳扎稳打。', requiresForest: true }
];

const QUESTS = {
    chief_patrol: {
        title: '巡草委托',
        giver: '村长',
        description: '替村里清理回声草丛的骚动，击败 3 只草丛野宠。',
        reward: { money: 60, items: { '中级球': 1 } }
    },
    zhangsan_fruit: {
        title: '树果代采',
        giver: '张三',
        description: '张三腰伤犯了，想请你交来 2 颗树果。',
        reward: { money: 35, items: { '普通球': 2 } }
    },
    lisi_capture: {
        title: '收容计划',
        giver: '李四',
        description: '李四想观察普通稀有度的野宠行为，请你捕获 1 只普通品质宠物。',
        reward: { money: 90, items: { '高级球': 1, '普通球': 2 } }
    }
};


const MONSTER_DEX = {
    '火尾狐': { id: '#001', rarity: '稀有', type: '火', stats: { hp: 20, mp: 12, atk: 6, spd: 6 }, skills: ['抓击', '火焰爪', '小火花'], habitat: '初始三选一', capturable: false, note: '御三家之一，擅长快速火属性压制。' },
    '水泡蛙': { id: '#002', rarity: '稀有', type: '水', stats: { hp: 25, mp: 12, atk: 5, spd: 5 }, skills: ['撞击', '水弹', '水枪'], habitat: '初始三选一', capturable: false, note: '御三家之一，数值均衡。' },
    '叶芽兽': { id: '#003', rarity: '稀有', type: '草', stats: { hp: 22, mp: 13, atk: 5, spd: 4 }, skills: ['藤鞭', '根系抓', '生机'], habitat: '初始三选一', capturable: false, note: '御三家之一，兼具回复与控制。' },
    '大牙鼠': { id: '#004', rarity: '普通', type: '普通', stats: { hp: 18, mp: 6, atk: 4, spd: 4 }, skills: ['咬住', '聚气', '猛击'], habitat: '回声草丛', capturable: true, note: '最常见的草丛野宠，攻击朴素但数量多。' },
    '咕咕鸟': { id: '#005', rarity: '稀有', type: '飞行', stats: { hp: 16, mp: 10, atk: 5, spd: 7 }, skills: ['啄击', '顺风', '风切'], habitat: '回声草丛', capturable: true, note: '高速型飞行宠物，适合先手压制。' },
    '电气菇': { id: '#007', rarity: '超稀有', type: '电/草', stats: { hp: 18, mp: 14, atk: 6, spd: 6 }, skills: ['电击', '麻痹粉', '雷霆冲'], habitat: '呢喃森林', capturable: true, note: '稀有林间异种，兼具控场与爆发。' },
    '草跳兔': { id: '#008', rarity: '普通', type: '草', stats: { hp: 19, mp: 8, atk: 5, spd: 6 }, skills: ['飞踢', '叶刃', '小恢复'], habitat: '回声草丛', capturable: true, note: '速度型草宠，适合消耗战。' },
    '灰羽鸦': { id: '#009', rarity: '普通', type: '飞行', stats: { hp: 17, mp: 8, atk: 5, spd: 6 }, skills: ['啄击', '扰乱', '俯冲'], habitat: '回声草丛', capturable: true, note: '草丛空中干扰者。' },
    '小甲壳虫': { id: '#010', rarity: '普通', type: '虫', stats: { hp: 22, mp: 6, atk: 4, spd: 4 }, skills: ['撞击', '硬壳', '虫咬'], habitat: '回声草丛', capturable: true, note: '低速高耐久。' },
    '水纹龟': { id: '#011', rarity: '普通', type: '水', stats: { hp: 24, mp: 7, atk: 4, spd: 3 }, skills: ['水弹', '防御姿态', '潮汐拍'], habitat: '回声草丛', capturable: true, note: '草丛里的慢速肉盾。' },
    '森叶鹿': { id: '#012', rarity: '普通', type: '草', stats: { hp: 23, mp: 8, atk: 5, spd: 4 }, skills: ['藤刺', '守护', '治愈气息'], habitat: '呢喃森林', capturable: true, note: '森林的回复型单位。' },
    '森林蛛': { id: '#013', rarity: '普通', type: '虫', stats: { hp: 20, mp: 9, atk: 5, spd: 5 }, skills: ['蛛网', '毒刺', '潜伏'], habitat: '呢喃森林', capturable: true, note: '控制流宠物。' },
    '烈风隼': { id: '#014', rarity: '超稀有', type: '飞行', stats: { hp: 18, mp: 12, atk: 7, spd: 8 }, skills: ['风刃', '急袭', '暴风'], habitat: '回声草丛', capturable: true, note: '当前版本最快单位。' },
    '炽尾蜥': { id: '#015', rarity: '超稀有', type: '火', stats: { hp: 21, mp: 13, atk: 7, spd: 5 }, skills: ['火焰冲', '灼烧', '炎爆'], habitat: '呢喃森林', capturable: true, note: '森林深处火系变种。' },
    '星纹鹿王': { id: '#016', rarity: '极品', type: '草', stats: { hp: 28, mp: 18, atk: 8, spd: 6 }, skills: ['星辉冲', '森之庇护', '枝影束缚'], habitat: '呢喃森林（极低概率）', capturable: true, captureRequirement: '究极球', note: '第一章隐藏 Boss 级捕获宠，需要特殊规格的封印手段。' },
    '棱镜机偶': { id: '#017', rarity: '极品', type: '机械', stats: { hp: 26, mp: 14, atk: 8, spd: 5 }, skills: ['电击', '防御姿态', '雷霆冲'], habitat: '森林实验室外围', capturable: false, note: '幻梦乐园布置在实验室外围的机械宠物，负责门禁压制与近距离镇场。' }
};
const STORY_STEPS = {
    INTRO: 'intro',
    CHOOSE_CLASS: 'choose_class',
    CHOOSE_PET: 'choose_pet',
    READY_FOR_FIRST_HUNT: 'ready_for_first_hunt',
    LINXIAO_PENDING: 'linxiao_pending',
    LINXIAO_CHOICE: 'linxiao_choice',
    VILLAGE_INVESTIGATION: 'village_investigation',
    FOREST_UNLOCKED: 'forest_unlocked',
    FOREST_CLEARED: 'forest_cleared',
    LAB_DOOR_UNLOCKED: 'lab_door_unlocked',
    CHAPTER_ONE_COMPLETE: 'chapter_one_complete'
};

function createInitialProgress() {
    return {
        chapter: 1,
        storyStep: STORY_STEPS.INTRO,
        currentArea: 'village',
        partyMode: 'solo',
        mapsUnlocked: {
            village: true,
            grassland: true,
            forest: false
        },
        counters: {
            grasslandExplorations: 0,
            grasslandWins: 0,
            forestWins: 0,
            restsTaken: 0,
            capturesTotal: 0,
            capturesByRarity: {
                '普通': 0,
                '稀有': 0,
                '超稀有': 0,
                '极品': 0,
                '神兽': 0
            }
        },
        questStates: {
            chief_patrol: 'available',
            zhangsan_fruit: 'available',
            lisi_capture: 'available'
        },
        encyclopedia: {
            obtained: false,
            seenPets: {},
            seenCharacters: {}
        },
        flags: {
            talkedToVillageChief: false,
            classSelected: false,
            petSelected: false,
            firstBattleDone: false,
            linxiaoMet: false,
            linxiaoDefeated: false,
            linxiaoChoiceResolved: false,
            linxiaoJoined: false,
            linxiaoDeclined: false,
            forestEncounterDone: false,
            laboratoryFound: false,
            investigationBriefed: false,
            lisiObservationSolved: false,
            marketSupplySolved: false,
            bridgeClueConfirmed: false,
            agentDefeated: false,
            labDoorUnlocked: false,
            innerLabSeen: false,
            chapter1Completed: false,
            soloRewardGranted: false
        }
    };
}

const EXP_SYSTEM = {
    expToLevel: (level) => Math.floor(12 + (level - 1) * 6),
    playerGrowth: {
        '战士': { hp: 5, mp: 2, atk: 2, spd: 1 },
        '弓兵': { hp: 3, mp: 2, atk: 2, spd: 2 },
        '魔法师': { hp: 4, mp: 4, atk: 2, spd: 1 },
        '牧师': { hp: 4, mp: 4, atk: 1, spd: 1 }
    },
    petGrowth: {
        hp: 3,
        mp: 2,
        atk: 1,
        spd: 1
    }
};

const SKILL_UNLOCK_LEVELS = [1, 3, 6, 10];

const CLASS_SKILL_PLANS = {
    '战士': [
        { level: 1, skill: '重击', category: '职业' },
        { level: 3, skill: '盾墙', category: '职业' },
        { level: 6, skill: '怒吼', category: '职业' },
        { level: 10, skill: '破阵冲锋', category: '职业' }
    ],
    '弓兵': [
        { level: 1, skill: '连射', category: '职业' },
        { level: 3, skill: '刺破', category: '职业' },
        { level: 6, skill: '捕猎陷阱', category: '职业' },
        { level: 10, skill: '骤雨箭幕', category: '职业' }
    ],
    '魔法师': [
        { level: 1, skill: '元素灼烧', category: '职业' },
        { level: 3, skill: '奥术屏障', category: '职业' },
        { level: 6, skill: '属性吸收', category: '职业' },
        { level: 10, skill: '共鸣过载', category: '职业' }
    ],
    '牧师': [
        { level: 1, skill: '治愈', category: '职业' },
        { level: 3, skill: '祈祷', category: '职业' },
        { level: 6, skill: '神圣庇护', category: '职业' },
        { level: 10, skill: '晨光祷言', category: '职业' }
    ]
};

const PET_SKILL_PLANS = {
    '火尾狐': [
        { level: 1, skill: '火焰爪', category: '属性' },
        { level: 3, skill: '小火花', category: '进阶' },
        { level: 6, skill: '炎尾突袭', category: '进阶' },
        { level: 10, skill: '赤焰穿林', category: '终阶' }
    ],
    '水泡蛙': [
        { level: 1, skill: '水弹', category: '属性' },
        { level: 3, skill: '水枪', category: '进阶' },
        { level: 6, skill: '涡流护幕', category: '进阶' },
        { level: 10, skill: '潮鸣奔涌', category: '终阶' }
    ],
    '叶芽兽': [
        { level: 1, skill: '藤鞭', category: '属性' },
        { level: 3, skill: '根系抓', category: '进阶' },
        { level: 6, skill: '生机', category: '进阶' },
        { level: 10, skill: '蔓生领域', category: '终阶' }
    ],
    '大牙鼠': [
        { level: 1, skill: '咬住', category: '属性' },
        { level: 3, skill: '聚气', category: '进阶' },
        { level: 6, skill: '猛击', category: '进阶' },
        { level: 10, skill: '乱牙突进', category: '终阶' }
    ],
    '咕咕鸟': [
        { level: 1, skill: '啄击', category: '属性' },
        { level: 3, skill: '顺风', category: '进阶' },
        { level: 6, skill: '风切', category: '进阶' },
        { level: 10, skill: '翔羽急坠', category: '终阶' }
    ],
    '电气菇': [
        { level: 1, skill: '电击', category: '属性' },
        { level: 3, skill: '麻痹粉', category: '进阶' },
        { level: 6, skill: '雷霆冲', category: '进阶' },
        { level: 10, skill: '过载孢爆', category: '终阶' }
    ],
    '草跳兔': [
        { level: 1, skill: '叶刃', category: '属性' },
        { level: 3, skill: '飞踢', category: '进阶' },
        { level: 6, skill: '小恢复', category: '进阶' },
        { level: 10, skill: '翠跃回旋', category: '终阶' }
    ],
    '灰羽鸦': [
        { level: 1, skill: '啄击', category: '属性' },
        { level: 3, skill: '扰乱', category: '进阶' },
        { level: 6, skill: '俯冲', category: '进阶' },
        { level: 10, skill: '影羽俯掠', category: '终阶' }
    ],
    '小甲壳虫': [
        { level: 1, skill: '虫咬', category: '属性' },
        { level: 3, skill: '硬壳', category: '进阶' },
        { level: 6, skill: '甲壳冲锋', category: '进阶' },
        { level: 10, skill: '甲壳反震', category: '终阶' }
    ],
    '水纹龟': [
        { level: 1, skill: '水弹', category: '属性' },
        { level: 3, skill: '防御姿态', category: '进阶' },
        { level: 6, skill: '潮汐拍', category: '进阶' },
        { level: 10, skill: '深潮护壳', category: '终阶' }
    ],
    '森叶鹿': [
        { level: 1, skill: '藤刺', category: '属性' },
        { level: 3, skill: '守护', category: '进阶' },
        { level: 6, skill: '治愈气息', category: '进阶' },
        { level: 10, skill: '林息回环', category: '终阶' }
    ],
    '森林蛛': [
        { level: 1, skill: '毒刺', category: '属性' },
        { level: 3, skill: '蛛网', category: '进阶' },
        { level: 6, skill: '潜伏', category: '进阶' },
        { level: 10, skill: '缠茧伏袭', category: '终阶' }
    ],
    '烈风隼': [
        { level: 1, skill: '风刃', category: '属性' },
        { level: 3, skill: '急袭', category: '进阶' },
        { level: 6, skill: '暴风', category: '进阶' },
        { level: 10, skill: '天穹裂袭', category: '终阶' }
    ],
    '炽尾蜥': [
        { level: 1, skill: '火焰冲', category: '属性' },
        { level: 3, skill: '灼烧', category: '进阶' },
        { level: 6, skill: '炎爆', category: '进阶' },
        { level: 10, skill: '焦土烈啮', category: '终阶' }
    ],
    '星纹鹿王': [
        { level: 1, skill: '星辉冲', category: '属性' },
        { level: 3, skill: '森之庇护', category: '进阶' },
        { level: 6, skill: '枝影束缚', category: '进阶' },
        { level: 10, skill: '星林圣裁', category: '终阶' }
    ],
    '棱镜机偶': [
        { level: 1, skill: '电击', category: '属性' },
        { level: 3, skill: '防御姿态', category: '进阶' },
        { level: 6, skill: '雷霆冲', category: '进阶' },
        { level: 10, skill: '过载孢爆', category: '终阶' }
    ]
};

function getUnlockedSkills(plan, level = 1) {
    return (plan || []).filter((entry) => level >= entry.level).map((entry) => entry.skill);
}

function getClassSkillsByLevel(className, level = 1) {
    return getUnlockedSkills(CLASS_SKILL_PLANS[className], level);
}

function getPetSkillsByLevel(petName, level = 1) {
    return getUnlockedSkills(PET_SKILL_PLANS[petName], level);
}

const CLASSES = {
    '战士': { hp: 34, mp: 8, atk: 8, spd: 5, skills: getClassSkillsByLevel('战士', 1), skillPlan: CLASS_SKILL_PLANS['战士'] },
    '弓兵': { hp: 24, mp: 10, atk: 7, spd: 8, skills: getClassSkillsByLevel('弓兵', 1), skillPlan: CLASS_SKILL_PLANS['弓兵'] },
    '魔法师': { hp: 26, mp: 16, atk: 10, spd: 4, skills: getClassSkillsByLevel('魔法师', 1), skillPlan: CLASS_SKILL_PLANS['魔法师'] },
    '牧师': { hp: 28, mp: 18, atk: 5, spd: 5, skills: getClassSkillsByLevel('牧师', 1), skillPlan: CLASS_SKILL_PLANS['牧师'] }
};

const PETS = {
    '火尾狐': { type: '火', rarity: '稀有', hp: 20, mp: 12, atk: 6, spd: 6, skills: getPetSkillsByLevel('火尾狐', 1), skillPlan: PET_SKILL_PLANS['火尾狐'] },
    '水泡蛙': { type: '水', rarity: '稀有', hp: 25, mp: 12, atk: 5, spd: 5, skills: getPetSkillsByLevel('水泡蛙', 1), skillPlan: PET_SKILL_PLANS['水泡蛙'] },
    '叶芽兽': { type: '草', rarity: '稀有', hp: 22, mp: 13, atk: 5, spd: 4, skills: getPetSkillsByLevel('叶芽兽', 1), skillPlan: PET_SKILL_PLANS['叶芽兽'] },
    '大牙鼠': { type: '普通', rarity: '普通', hp: 18, mp: 6, atk: 4, spd: 4, skills: getPetSkillsByLevel('大牙鼠', 1), skillPlan: PET_SKILL_PLANS['大牙鼠'] },
    '咕咕鸟': { type: '飞行', rarity: '稀有', hp: 16, mp: 10, atk: 5, spd: 7, skills: getPetSkillsByLevel('咕咕鸟', 1), skillPlan: PET_SKILL_PLANS['咕咕鸟'] },
    '电气菇': { type: '电/草', rarity: '超稀有', hp: 18, mp: 14, atk: 6, spd: 6, skills: getPetSkillsByLevel('电气菇', 1), skillPlan: PET_SKILL_PLANS['电气菇'] },
    '草跳兔': { type: '草', rarity: '普通', hp: 19, mp: 8, atk: 5, spd: 6, skills: getPetSkillsByLevel('草跳兔', 1), skillPlan: PET_SKILL_PLANS['草跳兔'] },
    '灰羽鸦': { type: '飞行', rarity: '普通', hp: 17, mp: 8, atk: 5, spd: 6, skills: getPetSkillsByLevel('灰羽鸦', 1), skillPlan: PET_SKILL_PLANS['灰羽鸦'] },
    '小甲壳虫': { type: '虫', rarity: '普通', hp: 22, mp: 6, atk: 4, spd: 4, skills: getPetSkillsByLevel('小甲壳虫', 1), skillPlan: PET_SKILL_PLANS['小甲壳虫'] },
    '水纹龟': { type: '水', rarity: '普通', hp: 24, mp: 7, atk: 4, spd: 3, skills: getPetSkillsByLevel('水纹龟', 1), skillPlan: PET_SKILL_PLANS['水纹龟'] },
    '森叶鹿': { type: '草', rarity: '普通', hp: 23, mp: 8, atk: 5, spd: 4, skills: getPetSkillsByLevel('森叶鹿', 1), skillPlan: PET_SKILL_PLANS['森叶鹿'] },
    '森林蛛': { type: '虫', rarity: '普通', hp: 20, mp: 9, atk: 5, spd: 5, skills: getPetSkillsByLevel('森林蛛', 1), skillPlan: PET_SKILL_PLANS['森林蛛'] },
    '烈风隼': { type: '飞行', rarity: '超稀有', hp: 18, mp: 12, atk: 7, spd: 8, skills: getPetSkillsByLevel('烈风隼', 1), skillPlan: PET_SKILL_PLANS['烈风隼'] },
    '炽尾蜥': { type: '火', rarity: '超稀有', hp: 21, mp: 13, atk: 7, spd: 5, skills: getPetSkillsByLevel('炽尾蜥', 1), skillPlan: PET_SKILL_PLANS['炽尾蜥'] },
    '星纹鹿王': { type: '草', rarity: '极品', hp: 28, mp: 18, atk: 8, spd: 6, skills: getPetSkillsByLevel('星纹鹿王', 1), skillPlan: PET_SKILL_PLANS['星纹鹿王'], requiredBall: '究极球' },
    '棱镜机偶': { type: '机械', rarity: '极品', hp: 34, mp: 18, atk: 10, spd: 7, level: 6, skills: getPetSkillsByLevel('棱镜机偶', 6), skillPlan: PET_SKILL_PLANS['棱镜机偶'] }
};

const ENCOUNTER_POOLS = {
    grassland: [
        { name: '大牙鼠', weight: 20 },
        { name: '草跳兔', weight: 18 },
        { name: '灰羽鸦', weight: 16 },
        { name: '小甲壳虫', weight: 14 },
        { name: '水纹龟', weight: 12 },
        { name: '咕咕鸟', weight: 12 },
        { name: '烈风隼', weight: 8 }
    ],
    forest: [
        { name: '森叶鹿', weight: 26 },
        { name: '森林蛛', weight: 24 },
        { name: '电气菇', weight: 16 },
        { name: '炽尾蜥', weight: 10 },
        { name: '星纹鹿王', weight: 2 }
    ]
};

const ENEMIES = {
    '实验机器人': {
        type: '机械',
        rarity: '极品',
        level: 5,
        hp: 34,
        mp: 16,
        atk: 9,
        spd: 6,
        skills: ['电击', '麻痹粉', '雷霆冲'],
        captureable: false
    },
    '失衡实验体': {
        type: '草/电',
        rarity: '极品',
        level: 8,
        hp: 58,
        mp: 26,
        atk: 13,
        spd: 9,
        skills: ['枝影束缚', '雷霆冲', '过载孢爆', '星林圣裁'],
        captureable: false
    }
};

const NPC_CHARACTERS = {
    '林晓': {
        class: '弓兵',
        hp: 22,
        mp: 12,
        atk: 7,
        spd: 8,
        skills: getClassSkillsByLevel('弓兵', 1),
        pet: '咕咕鸟',
        description: '你幼年时最要好的玩伴，嘴上爱逞强，心里却比谁都护短。'
    },
    '幻梦乐园代理人': {
        class: '魔法师',
        hp: 38,
        mp: 24,
        atk: 11,
        spd: 8,
        level: 6,
        skills: getClassSkillsByLevel('魔法师', 6),
        pet: '棱镜机偶',
        description: '奉命守在实验室外围的乐园代理人，相信风纹必须被设计、被规训，才能换来安全。'
    }
};

const SKILL_DATA = {
    '重击': { damage: 7, mpCost: 0, type: '普通', desc: '沉肩发力，朴实而狠。' },
    '盾墙': { damage: 0, mpCost: 3, type: '普通', desc: '稳住架势，本回合获得额外减伤。' },
    '怒吼': { damage: 0, mpCost: 4, type: '普通', desc: '吼声振奋全队，临时提速。' },
    '破阵冲锋': { damage: 11, mpCost: 5, type: '普通', desc: '踏步破阵，直接撕开对手前线。' },
    '连射': { damage: 8, mpCost: 0, type: '普通', desc: '连发两箭，打乱敌人节奏。' },
    '刺破': { damage: 6, mpCost: 2, type: '普通', desc: '瞄准关节与空隙，拖慢目标动作。' },
    '捕猎陷阱': { damage: 0, mpCost: 3, type: '普通', desc: '布下陷阱，为后续攻击制造机会。' },
    '骤雨箭幕': { damage: 10, mpCost: 5, type: '飞行', desc: '箭矢像骤雨一样压向目标，几乎不给喘息。' },
    '元素灼烧': { damage: 9, mpCost: 4, desc: '借由绑定宠物的属性引燃元素。' },
    '奥术屏障': { damage: 0, mpCost: 5, desc: '用法阵撑起薄而坚韧的护壁。' },
    '属性吸收': { damage: -4, mpCost: 4, desc: '抽取逸散元素，修补自身伤势。' },
    '共鸣过载': { damage: 12, mpCost: 6, desc: '把积蓄的法力一次性压缩后爆开，换来高额伤害。' },
    '治愈': { damage: -5, mpCost: 4, desc: '轻声祈祷，使伤口慢慢闭合。' },
    '祈祷': { damage: 0, mpCost: 5, desc: '为全队披上一层稳固的祝福。' },
    '神圣庇护': { damage: 0, mpCost: 6, desc: '在危急前留下一道最后的保险。' },
    '晨光祷言': { damage: -8, mpCost: 6, desc: '引来柔和晨光，大幅抚平一名同伴的伤势。' },
    '抓击': { damage: 3, mpCost: 0, type: '普通', desc: '普通攻击。' },
    '火焰爪': { damage: 5, mpCost: 3, type: '火', desc: '指尖火光舔过敌人的防线。' },
    '小火花': { damage: 7, mpCost: 4, type: '火', desc: '吐出火星，有概率灼伤对手。' },
    '炎尾突袭': { damage: 7, mpCost: 4, type: '火', desc: '燃起尾焰后短促突进，把火线甩到目标身上。' },
    '赤焰穿林': { damage: 10, mpCost: 6, type: '火', desc: '拖着长尾烈焰穿过战场，一击烧穿防线。' },
    '撞击': { damage: 3, mpCost: 0, type: '普通', desc: '普通攻击。' },
    '水弹': { damage: 5, mpCost: 3, type: '水', desc: '凝水成珠，击打目标。' },
    '水枪': { damage: 7, mpCost: 4, type: '水', desc: '高压水流直线贯穿。' },
    '涡流护幕': { damage: 0, mpCost: 4, type: '水', desc: '在身周卷起小型水幕，减轻即将到来的冲击。' },
    '潮鸣奔涌': { damage: 10, mpCost: 6, type: '水', desc: '把积水压成一道奔潮，裹着轰鸣撞向敌人。' },
    '藤鞭': { damage: 4, mpCost: 3, type: '草', desc: '抽出带刺藤蔓袭击目标。' },
    '根系抓': { damage: 6, mpCost: 4, type: '草', desc: '根须缠住敌人，拖缓脚步。' },
    '生机': { damage: -3, mpCost: 3, type: '草', desc: '借草木之息回复自己。' },
    '蔓生领域': { damage: 8, mpCost: 6, type: '草', desc: '大片藤蔓从脚下爆开，把目标困在不断挤压的绿墙里。' },
    '咬住': { damage: 2, mpCost: 0, type: '普通', desc: '普通攻击。' },
    '聚气': { damage: 0, mpCost: 2, type: '普通', desc: '收束气息，等待下一次爆发。' },
    '猛击': { damage: 6, mpCost: 0, type: '普通', desc: '普通的重型扑击。' },
    '乱牙突进': { damage: 8, mpCost: 4, type: '普通', desc: '一边撕咬一边猛冲，凶狠到近乎不讲道理。' },
    '啄击': { damage: 4, mpCost: 2, type: '飞行', desc: '飞行属性攻击。' },
    '顺风': { damage: 0, mpCost: 3, type: '飞行', desc: '借风调整身位，提高闪避。' },
    '风切': { damage: 8, mpCost: 4, type: '飞行', desc: '将风压压成锋刃。' },
    '翔羽急坠': { damage: 9, mpCost: 5, type: '飞行', desc: '借高空俯冲把羽锋和速度同时砸进目标。' },
    '虫咬': { damage: 4, mpCost: 2, type: '虫', desc: '虫属性攻击。' },
    '吐丝': { damage: 0, mpCost: 2, type: '虫', desc: '吐出黏丝，拖慢目标。' },
    '甲壳冲锋': { damage: 7, mpCost: 4, type: '虫', desc: '硬壳顶撞，进攻与防御并行。' },
    '甲壳反震': { damage: 8, mpCost: 5, type: '虫', desc: '用厚甲硬吃冲击后顺势弹回，适合近身硬碰。' },
    '电击': { damage: 5, mpCost: 3, type: '电', desc: '放出短促而猛烈的电流。' },
    '麻痹粉': { damage: 0, mpCost: 4, type: '电', desc: '粉末附着神经，使行动迟滞。' },
    '雷霆冲': { damage: 8, mpCost: 5, type: '电', desc: '将电流包裹全身后猛扑。' },
    '过载孢爆': { damage: 10, mpCost: 6, type: '电', desc: '让孢子群同时过载炸裂，把电流铺满近身空间。' },
    '飞踢': { damage: 5, mpCost: 0, type: '普通', desc: '跃起后借势踢击。' },
    '叶刃': { damage: 6, mpCost: 3, type: '草', desc: '凝出叶锋划开目标防线。' },
    '小恢复': { damage: -4, mpCost: 3, type: '草', desc: '借草息略微恢复伤势。' },
    '翠跃回旋': { damage: 8, mpCost: 5, type: '草', desc: '高速折返后以旋身叶锋切入，是标准游击杀招。' },
    '扰乱': { damage: 0, mpCost: 2, type: '飞行', desc: '绕着目标急旋，扰乱其动作。' },
    '俯冲': { damage: 7, mpCost: 3, type: '飞行', desc: '自上而下扑击目标。' },
    '影羽俯掠': { damage: 9, mpCost: 5, type: '飞行', desc: '借阴影隐住轮廓，再用一记急掠撕开目标。' },
    '硬壳': { damage: 0, mpCost: 2, type: '虫', desc: '收紧甲壳，准备抗下重击。' },
    '防御姿态': { damage: 0, mpCost: 2, type: '水', desc: '缩起四肢，稳稳守住阵脚。' },
    '潮汐拍': { damage: 7, mpCost: 3, type: '水', desc: '裹着潮声拍向敌人。' },
    '深潮护壳': { damage: -6, mpCost: 5, type: '水', desc: '深吸水汽并缩入硬壳，一边回复一边稳住阵脚。' },
    '藤刺': { damage: 5, mpCost: 3, type: '草', desc: '连生的藤刺从地面突起。' },
    '守护': { damage: 0, mpCost: 3, type: '草', desc: '垂下叶幕，为自己争取喘息。' },
    '治愈气息': { damage: -5, mpCost: 4, type: '草', desc: '吐出柔和气息，修复伤势。' },
    '林息回环': { damage: -7, mpCost: 6, type: '草', desc: '把林间生机卷成一圈回环，持续把伤势往回拉。' },
    '蛛网': { damage: 0, mpCost: 2, type: '虫', desc: '铺开黏网限制目标行动。' },
    '毒刺': { damage: 6, mpCost: 3, type: '虫', desc: '刺肢闪电般刺出。' },
    '潜伏': { damage: 0, mpCost: 3, type: '虫', desc: '沉入阴影，等待反击时机。' },
    '缠茧伏袭': { damage: 9, mpCost: 5, type: '虫', desc: '先用丝束缚再近身穿刺，是森林蛛的终结动作。' },
    '风刃': { damage: 6, mpCost: 3, type: '飞行', desc: '卷出锐利风刃。' },
    '急袭': { damage: 7, mpCost: 3, type: '飞行', desc: '以极快速度压近目标。' },
    '暴风': { damage: 9, mpCost: 5, type: '飞行', desc: '掀起猛烈风压席卷前方。' },
    '天穹裂袭': { damage: 11, mpCost: 6, type: '飞行', desc: '从高空垂直切落，速度快到像把天空撕开。' },
    '火焰冲': { damage: 6, mpCost: 3, type: '火', desc: '裹火撞向目标。' },
    '灼烧': { damage: 8, mpCost: 4, type: '火', desc: '留下持续发烫的灼痕。' },
    '炎爆': { damage: 9, mpCost: 5, type: '火', desc: '引爆积蓄的火元素。' },
    '焦土烈啮': { damage: 11, mpCost: 6, type: '火', desc: '把灼热咬合力与爆燃一并压上，是纯粹的火系重击。' },
    '星辉冲': { damage: 8, mpCost: 5, type: '草', desc: '裹着星纹光屑向前冲撞。' },
    '森之庇护': { damage: -6, mpCost: 5, type: '草', desc: '调动林中生机，回复全队伤势。' },
    '枝影束缚': { damage: 6, mpCost: 4, type: '草', desc: '枝影交错，将目标牢牢缠住。' },
    '星林圣裁': { damage: 12, mpCost: 7, type: '草', desc: '把星纹与森林气息一并压下，是鹿王级别的裁断。' }
};

function buildSkillCompendium() {
    const entries = [];

    Object.keys(CLASS_SKILL_PLANS).forEach((className) => {
        entries.push({
            ownerType: '角色',
            ownerName: className,
            baseAction: '普攻',
            baseDescription: '基础攻击，伤害约为 ATK 的 75%，不消耗 MP。',
            skills: CLASS_SKILL_PLANS[className].map((entry) => ({
                level: entry.level,
                skill: entry.skill,
                ...SKILL_DATA[entry.skill]
            }))
        });
    });

    Object.keys(PET_SKILL_PLANS).forEach((petName) => {
        const pet = PETS[petName] || {};
        entries.push({
            ownerType: '宠物',
            ownerName: petName,
            baseAction: '普攻',
            baseDescription: pet.type
                ? `基础攻击，伤害约为 ATK 的 75%，常规出手时按 ${pet.type} 系作战。`
                : '基础攻击，伤害约为 ATK 的 75%。',
            skills: PET_SKILL_PLANS[petName].map((entry) => ({
                level: entry.level,
                skill: entry.skill,
                ...SKILL_DATA[entry.skill]
            }))
        });
    });

    return entries;
}

const SKILL_COMPENDIUM = buildSkillCompendium();

const ENCYCLOPEDIA_RARITY_GUIDE = [
    { rarity: '普通', description: '最常见的风纹个体，生态稳定，常作为新手观察与训练对象。' },
    { rarity: '稀有', description: '较少自然出现，通常拥有更鲜明的属性特征或更完整的战斗轮廓。' },
    { rarity: '超稀有', description: '常伴随异常风纹环境出现，个体特征强，遭遇概率明显偏低。' },
    { rarity: '极品', description: '接近区域顶点的个体，往往会影响一整片生态或承担特殊剧情定位。' },
    { rarity: '神兽', description: '当前章节尚未出现，通常指与大陆级风纹传说直接相关的存在。' }
];

const ENCYCLOPEDIA_CHARACTER_ENTRIES = [
    {
        id: 'chief',
        order: 1,
        name: '村长',
        role: '微风村长者',
        group: '村庄 NPC',
        unlockHint: '与村长交谈后解锁。',
        description: '守着微风村旧传统的长者，口风稳，判断也稳。他把村子的安宁看得比一切都重。'
    },
    {
        id: 'zhangsan',
        order: 2,
        name: '张三',
        role: '晒谷人',
        group: '村庄 NPC',
        unlockHint: '在老井边与张三交谈后解锁。',
        description: '说话带着烟火气的村民，总把“过日子”看得比“闯世界”更重要，却也看得出你坐不住。'
    },
    {
        id: 'lisi',
        order: 3,
        name: '李四',
        role: '观察记录员',
        group: '村庄 NPC',
        unlockHint: '在磨坊前与李四交谈后解锁。',
        description: '喜欢记录风纹兽行为的小心观察者，希望靠一点点积累，把村外生态整理成能被看懂的知识。'
    },
    {
        id: 'ahe',
        order: 4,
        name: '阿禾',
        role: '杂货铺老板',
        group: '村庄 NPC',
        unlockHint: '在集市长棚与阿禾交谈后解锁。',
        description: '算盘拨得很快，脑子也快。对他来说，冒险不是热血，而是准备、成本和活着回来。'
    },
    {
        id: 'qushen',
        order: 5,
        name: '曲婶',
        role: '宠物市集老板',
        group: '村庄 NPC',
        unlockHint: '在集市长棚与曲婶交谈后解锁。',
        description: '把每一只小家伙都当成“暂时还没遇到同行者”的生命，不喜欢别人把宠物只当成货物。'
    },
    {
        id: 'granny_moss',
        order: 6,
        name: '苔婆婆',
        role: '采药老人',
        group: '村庄 NPC',
        unlockHint: '在老井边与苔婆婆交谈后解锁。',
        description: '总能先从风声和夜里的细响里察觉村子的变化。看起来絮叨，实则比很多人都敏锐。'
    },
    {
        id: 'ferryman_bo',
        order: 7,
        name: '摆渡伯',
        role: '桥边守望者',
        group: '村庄 NPC',
        unlockHint: '在溪桥外缘与摆渡伯交谈后解锁。',
        description: '守着溪桥和风灯的老人，见惯了村口进出的人和物，因此也更能分辨什么“不像是村里的东西”。'
    },
    {
        id: 'linxiao',
        order: 8,
        name: '林晓',
        role: '试炼对手 / 可选伙伴',
        group: '关键人物',
        className: '弓兵',
        petName: '咕咕鸟',
        unlockHint: '在草丛中与林晓完成比试后解锁。',
        description: '你的青梅玩伴，张扬、直率，战斗时却比平时更冷静。愿不愿同行，会改变你第一章之后的旅途节奏。'
    },
    {
        id: 'dreamland_agent',
        order: 9,
        name: '幻梦乐园代理',
        role: '乐园前哨人员',
        group: '势力人物',
        className: '魔法师',
        petName: '棱镜机偶',
        unlockHint: '在森林实验室听见对方发言后解锁。',
        description: '幻梦乐园埋在森林深处的代理声音。语气温和，却把“设计自然”当成理所当然的事。'
    },
    {
        id: 'inner_aberration',
        order: 10,
        name: '失衡实验体',
        role: '内部 Boss / 失败造物',
        group: '敌对单位',
        enemyKey: '失衡实验体',
        unlockHint: '在实验室深处遭遇失衡实验体后解锁。',
        description: '风纹压缩实验失控后诞生的异常生命。它不再像被驯服的宠物，更像把整座实验室怨气和风纹残响一起吞进去的活灾害。'
    }
];

function safeDexId(rawId) {
    return Number.parseInt(String(rawId || '').replace(/[^0-9]/g, ''), 10) || 999;
}

function buildPetEncyclopediaEntries() {
    return Object.keys(MONSTER_DEX)
        .sort((left, right) => safeDexId(MONSTER_DEX[left]?.id) - safeDexId(MONSTER_DEX[right]?.id))
        .map((name, index) => ({
            key: name,
            order: index + 1,
            ...MONSTER_DEX[name]
        }));
}

const ENCYCLOPEDIA_PET_ENTRIES = buildPetEncyclopediaEntries();

const WORLD_LORE = {
    worldName: '风纹大陆',
    windMark: {
        title: '风纹',
        subtitle: '它不是风，而是世界呼吸留下的痕迹。',
        description: '大陆上的生命共享一种不可见能量。火是躁动的风纹，水是沉静的风纹，草是生长的风纹，电是断裂的风纹，飞行是漂浮的风纹，虫是群集的风纹。风纹兽并非普通野兽，而是风纹在生命体内凝成的回响。'
    },
    legend: {
        title: '古老传说',
        description: '数百年前，风曾停止过整整一天。那一天草不动，水不流，火不燃。异象结束后，第一批风纹兽出现在草丛里，人类自此学会与它们共生，也学会利用它们。'
    },
    ages: [
        { name: '共生时代', description: '人类与风纹兽协作生活，村庄围绕风纹生态建立。微风村正是这个时代留下的遗址型聚落。' },
        { name: '利用时代', description: '城市发现风纹兽可以转化为能源，捕获装置与风纹工业由此诞生。' },
        { name: '失衡时代（现在）', description: '风纹流动开始异常，草丛出现倒流风纹，森林里出现未记录的变异种。你所在的微风村仍活在共生时代的影子里，而外界已进入利用时代。' }
    ],
    factions: [
        {
            name: '幻梦乐园合伙人',
            alias: 'Dreamland Consortium',
            belief: '秩序比自然更安全。',
            description: '他们是大陆最成功的娱乐企业，用风纹兽做表演、能源展示与幻象投影，主张“风纹需要被设计”。他们正在研究稳定风纹流动、人工循环与可控型宠物。',
            hidden: '森林实验室正在尝试把风纹压缩成恒定能源核心，副作用是属性紊乱、草丛风声异变与双属性变种。实验主管已经怀疑这不是控制，而是在堆积灾难。'
        },
        {
            name: '齿轮会',
            alias: 'Gear Faction',
            belief: '真正稳定的是机械，而不是风纹。',
            description: '他们是工业自治联盟，主张人类必须摆脱对风纹兽的依赖，研究机械宠物装甲、替代驱动与战斗外骨骼。',
            hidden: '他们之所以极端机械化，并不是单纯贪婪，而是害怕风纹拥有意志。机甲首领赫曼见过“风停下的那一天”，因此选择压制一切未知。'
        },
        {
            name: '盗猎星团',
            alias: 'Poacher Nebula',
            belief: '风纹不是神授，它是有限资源。',
            description: '他们是跨大陆势力，表面收购稀有宠物，实则来自“无风之地”。在那个地方，风纹已经枯竭，生态崩塌，他们更像是幸存者而非单纯掠夺者。',
            hidden: '他们检测到风纹大陆的流动正向某个核心点聚集，而那个核心点就在微风村附近。'
        }
    ],
    currentScope: '当前游戏内容仍只实现第一章：微风村、回声草丛、呢喃森林与森林实验室。第二章及之后的势力冲突目前只以前置伏笔形式出现。'
};

const NARRATIVE = {
    intro: {
        opening: '风从田埂尽头缓缓卷来，带着潮湿泥土与野花混杂的气味。你站在微风村的石路中央，耳边是鸡鸣、木轮和远处溪流的叮咚声。村里的老人说，这不是普通的风，而是世界呼吸留下的风纹。这个仍守着共生时代习惯的小村，正被一股陌生而失衡的流动悄悄包围。',
        chiefGreeting: '<strong>村长</strong>：“你总算醒了。最近回声草丛那边不太安宁，夜里有灯火，白天有惊叫，连平时胆小的大牙鼠都开始成群乱窜。草叶摆动的方向都不对了，像是风纹在倒流。”',
        classPrompt: '村长把手杖点在石砖上，像是为你的旅途敲响第一记钟声。出发之前，你得先决定自己要以什么姿态面对这片世界。',
        petSelection: '<strong>村长</strong>：“守护村子的三只幼灵都在这儿了。它们不会替你作决定，但会陪你把决定走到底。”',
        readyMessage: '村口的风把草叶吹得簌簌作响。你知道，是时候离开安全的石路，去真正碰一碰这片草丛里的未知了。',
        starterGift: '<strong>村长</strong>把一个旧皮袋和两枚擦得发亮的普通球塞到你手里：“路还长，别硬撑。这 20 枚风纹币、两颗树果和两枚普通球，先替你挡掉开头最笨的失误。”'
    },
    hub: {
        title: '=== 微风村 ===',
        description: '屋檐下挂着晾干的草药，磨坊的木轮在溪边慢慢转动。村里人见你回来，会停下手里的活跟你打声招呼。这里不大，却像一只稳稳托住你的手。',
        restMessage: '你在井边洗净尘土，又在旧木椅上坐了片刻，风把一路紧绷的疲倦吹散了。',
        healedMessage: '体力与魔力都恢复到了最佳状态。'
    },
    explore: {
        title: '=== 回声草丛 ===',
        description: '草茎高过小腿，叶片边缘还挂着细碎露珠。每走一步，前方都会传来细微回响，像有什么东西也在另一边悄悄移动。偶尔有一阵风逆着草叶的纹理掠过去，让你意识到这里的风纹流动正在失衡。',
        encounter: '脚边的草叶忽然炸开，一只 <strong>{{enemy}}</strong> 带着警惕与敌意冲了出来。',
        foundItem: '你拨开一簇被露水压弯的草，下面静静躺着 <strong>{{item}}</strong>。',
        nothing: '你停下呼吸听了一会儿，只有风声和昆虫振翅的细响在草叶间来回穿梭。'
    },
    forest: {
        title: '=== 呢喃森林 ===',
        description: '树冠遮住了天光，只剩一条条冷绿色的缝隙落在泥地上。空气像浸过水一样沉，脚步声在林间会被放大，又很快被黑暗吞掉。这里的风纹不像村外草地那样温顺，而像被什么力量压缩后强行困在了树影里。',
        encounter: '枯叶堆里猛地翻起一道影子，<strong>{{enemy}}</strong> 带着尖锐的嘶鸣扑了上来。',
        foundItem: '潮湿树根旁的空隙里，你摸到了 <strong>{{item}}</strong>。',
        nothing: '林中短暂地安静下来，安静得仿佛连你的心跳都能被树干听见。'
    },
    story: {
        firstBattleVictory: '第一次真正的战斗结束时，你忽然意识到，脚下这条路不再只是孩子气的出走，而是已经开始慢慢长成一场冒险。',
        linxiaoMeet: '<strong>林晓</strong>从草坡后翻身跳下，肩上挂着旧弓，笑意仍和小时候一样张扬：“我就知道会在这里撞见你。村里都说你要出门冒险了，我可不能让你一个人把风头全抢走。”',
        linxiaoChallenge: '<strong>林晓</strong>抬手拨了拨额前碎发，故作轻松地挑眉：“先打一场。赢了我再决定，是笑你两句，还是陪你走远一点。”',
        linxiaoBossStart: '=== 林晓的试炼战 ===',
        linxiaoDefeat: '<strong>林晓</strong>喘着气笑起来：“行，是你赢。你比我想的还要更像个真正的冒险者。”',
        linxiaoOffer: '<strong>林晓</strong>看向你身后的草海，语气少见地认真：“要不要让我一起走？两个人走会稳一点，但真要各自赌命时，你也得自己想清楚。”',
        investigationIntro: '<strong>村长</strong>在你们两人做出决定后沉默了片刻，才缓缓开口：“草丛乱成这样，森林里又冒出不该有的金属门。先别急着往深处扎。把村里的线索都拢一拢，别让自己像没头苍蝇一样撞进去。”',
        investigationBrief: '新的目标：在村里完成调查。去磨坊前找李四分析异常记录，再去集市长棚追查外来采购。桥边那条线如果查完，会成为更扎实的旁证。',
        soloChoice: '你决定独自前行。林晓没有拦你，只把一枚磨得温热的铜色徽记塞进你掌心：“既然要一个人扛，就把这点好运也带上。”',
        duoChoice: '你朝林晓伸出了手。他咧嘴一笑，把弓往肩上一甩：“好，那从今天起，危险一人一半，热闹也是。”',
        soloReward: '你获得了 <strong>孤行者徽记</strong> 与 40 风纹币。今后单人战斗会获得额外经验与赏金，但你也将独自承担全部压力。',
        duoPenalty: '林晓加入队伍。双人队伍更稳，但战斗经验会被平分，额外赏金也会减少。',
        forestUnlocked: '你把村里的几条线索拼起来后，结论已经无法回避：呢喃森林深处真的藏着一处人造设施。村长命人重新清理了通往森林的小路，而你知道，这一回你不是在冒险，而是在往真相里走。',
        forestBattleIntro: '盘根后的阴影忽然向下垂落，一只森林蛛借着细丝无声逼近，足肢敲得枯叶发出细密的沙沙声。',
        forestBattleVictory: '击退森林蛛后，前方一小片缠藤忽然晃动起来。你拨开枯枝，发现藤幕后藏着一扇钉满铆钉的旧金属门。门边还残留着人造轨道与拖拽痕，像有什么大型装置被反复推进又拖回。',
        labDiscovery: '你顺着门外的电缆和压痕一路看过去，确认这里不是废弃猎屋，而是一处仍在运转的实验设施。门禁槽位旁刻着三组陌生纹印，像是在等一名知道答案的人来开启。',
        dreamlandAgent: '<strong>幻梦乐园代理人</strong>从林影后走出，手套上还沾着未擦净的导电粉末：“到这里为止。你们村子守着旧时代的共生故事太久了，所以才看不懂眼前这一步有多必要。风纹会失控，自然也会失控。我们只是比你们更早承认这一点。”',
        agentBossStart: '=== 森林实验室外围战 ===',
        agentDefeat: '<strong>幻梦乐园代理人</strong>在破碎的光幕前后退半步，声音第一次发紧：“你闯得进外门，也未必承受得住里面的东西。那已经不是乐园能完全控制的样本了。”他丢下一张带裂痕的门卡，带着残余的设备数据匆匆撤离了林间。',
        doorPuzzleIntro: '门卡贴上门禁后，老旧面板亮了一下，却没有立刻开启。屏幕上跳出的是三行校验提示：风之痕、元素序、齿纹比对。看来就算拿到门卡，也仍然需要正确理解这里的逻辑。',
        doorPuzzleSolved: '最后一道校验通过时，门后的锁舌一节节退开。压抑已久的冷气混着焦糊、机油和腐败的气味一起涌出来，像整座设施终于肯把里面的真相吐给你看。',
        innerLabDiscovery: '实验室内部并不像想象中那样秩序井然。代替而来的是翻倒的器械、爆开的培养管、被踩碎的记录板，以及几具再也没有起身的研究人员遗骸。墙面上布满焦痕，像有什么东西曾在这里疯狂撞击。某间观察室的玻璃从内侧整个炸裂，拖行的血迹和青绿色孢粉一路延伸到最深处。残存终端反复闪着同一句报错：<strong>核心压缩失衡，样本脱离收束。</strong>',
        innerBossIntro: '最深处的收束仓前，一团扭曲的枝影和电弧缓缓抬起了头。它本该是什么已经看不出来了，只剩下被强行压缩又反噬四散的风纹在体内暴走。那不是被驯化的宠物，而是实验失败后留在这里的活灾害。',
        innerBossStart: '=== 失衡实验体 ===',
        innerBossDefeat: '失衡实验体终于在一阵撕裂般的尖啸后崩散倒地，缠在它身上的电弧一截截熄灭。你在碎裂的收束仓下找到一枚微微发亮的棱形碎片，它冷得像一小块凝固星光。终端残屏也在这时重新跳出一行警报：风纹浓度异常上升，源头指向微风村。',
        chapterComplete: '第一章结束。你带着 <strong>星光碎片</strong> 返回村庄，知道自己已经不可能再退回平静的昨天。微风村也许不是边缘地带，而是整场风纹失衡真正开始收束的地方。',
        nextChapterLocked: '第二章尚未开放。当前可玩内容仍限制在第一章，但“风纹异常的核心靠近微风村”与大陆三大势力的动机，已经作为后续主线正式埋下。实验室残屏最后闪过的远程回执只有一句话：“确认目标区域。准备回收。”'
    },
    village: {
        chiefQuestOffer: '<strong>村长</strong>：“回声草丛再这么闹下去，孩子们连放风筝都不敢去了。帮我清一清那里的野宠吧。”',
        chiefQuestDone: '<strong>村长</strong>笑着点头：“草丛的动静果然小下来了。不过有件事怪得很，几拨野宠逃窜的方向都像是在躲同一个东西。你把这点也记在心里。”',
        zhangsanQuestOffer: '<strong>张三</strong>捂着腰叹气：“我今天实在爬不上坡了。你要是顺路，帮我带两颗树果回来，我给你算跑腿钱。”',
        zhangsanQuestDone: '<strong>张三</strong>接过树果，脸上总算有了笑纹：“这下能给家里那只老宠物熬点果浆了。前两天连它都不肯往森林那边去，像是那边的风里混了铁味。”',
        lisiQuestOffer: '<strong>李四</strong>抱着一叠观察笔记，小声说：“我想研究普通野宠的习性，但我自己一靠近它们就跑。你能不能替我抓一只回来？还有，我想请你帮我核一条判断。”',
        lisiQuestDone: '<strong>李四</strong>几乎是扑上来接过记录板：“太好了，这下我的数据终于不是白纸了。它们不是单纯受惊，是被同一股扰动赶着动起来的。”',
        storeGreeting: '<strong>杂货铺老板阿禾</strong>把算盘拨得噼啪作响：“出门在外，缺的不是胆子，是准备。看看要带点什么。”',
        petMarketGreeting: '<strong>宠物行老板曲婶</strong>靠在木栏边冲你招手：“捡漏、收养、换手，我这儿都有。只要你养得起，就别让小家伙们空着笼子。”'
    },
    combat: {
        start: '=== 战斗开始！ ===',
        turnOrderPrefix: '回合顺序：',
        turnPrefix: '=== {{name}} 的回合 ===',
        victory: '=== 战斗胜利！ ===',
        defeat: '=== 战斗失败…… ===',
        defeatMessage: '视线一黑后，你在村口的长椅上醒来。有人替你包好了伤，也替你把散落的行囊捡了回来。',
        newRound: '--- 新的一轮开始 ---',
        critical: '暴击！',
        expGain: '获得 {{exp}} 经验值。',
        moneyGain: '获得 {{money}} 风纹币。',
        itemGain: '获得 1 个{{item}}。',
        captureFail: '精灵球剧烈晃动后弹开了，目标挣脱了束缚。',
        captureSuccess: '球体咔哒一声锁紧，野宠被成功收容。',
        allyLight: '伙伴之光触发：林晓用箭势压住了战场，你方全体本回合伤害提升。',
        noMp: '魔力不足，技能没有办法顺利施放。'
    }
};

const VILLAGE_AREAS = {
    square: {
        title: '村口广场',
        description: '石砖被来往脚步磨得发亮，晒谷架和风车影子斜斜压在地上。孩子们追着纸风筝跑，老人们则坐在树荫下，看你来来回回地折腾。'
    },
    well: {
        title: '老井边',
        description: '井绳摩擦井沿，发出轻微而规律的吱呀声。木桶边总有两三只饮水的小宠物，见人靠近也不急着逃。'
    },
    mill: {
        title: '磨坊前',
        description: '溪水带着凉气绕过磨坊木轮，空气里是谷壳、湿木和草药一起蒸开的味道。这里是村里最像“生活”本身的地方。'
    },
    market: {
        title: '集市长棚',
        description: '长棚下挂着风干鱼、草药束和各色小挂件，讨价还价的声音一阵高一阵低，像一首永远唱不完的日常小调。'
    },
    bridge: {
        title: '溪桥外缘',
        description: '木桥通向村外的小坡，桥板被溪雾泡得微微发白。站在这里能看见草丛尽头，也能看见村子仍旧安稳地亮着。'
    }
};

const VILLAGE_DIALOGUES = {
    chief: [
        '<strong>村长</strong>眯着眼望向田埂尽头：“年轻人出村，总以为前方是惊天动地的大事。可真把人撑起来的，往往是回头时还有一盏灯在等。”',
        '<strong>村长</strong>慢慢扶正手杖：“别把自己当成英雄，也别把自己看得太轻。你只要每次都比昨天更敢往前一步，就已经够了。”',
        '<strong>村长</strong>忽然笑了笑：“等你以后走得更远，再回来看这些石板路，说不定会发现它们比你想得更重要。”'
    ],
    zhangsan: [
        '<strong>张三</strong>一边晒谷一边咂嘴：“我年轻时也想过出门闯。后来发现，人啊，不一定非得走远，能把眼前日子过热乎也是本事。”',
        '<strong>张三</strong>把木叉往肩上一扛：“不过你不一样。你眼神里有股坐不住的劲，像是风一吹就要往村外跑。”'
    ],
    lisi: [
        '<strong>李四</strong>翻着记录本，声音压得很低：“野宠其实没那么神秘。它们也有习惯，有脾气，有喜欢晒太阳和不喜欢淋雨的时候。”',
        '<strong>李四</strong>抬头看你一眼：“你要是能多带些观察回来，我也许真能整理出一本像样的村外图鉴。”'
    ],
    ahe: [
        '<strong>阿禾</strong>把算盘拨得飞快：“冒险这回事，说白了就是把准备做在危险前头。药、球、绳子、备用火种，少一个都容易出事。”',
        '<strong>阿禾</strong>挑了挑眉：“当然，真要没钱也别硬撑，先活着回来，再谈下次出门。”'
    ],
    qushen: [
        '<strong>曲婶</strong>摸着笼门上的铜扣：“小家伙们可不是货物，它们只是暂时还没遇上愿意同行的人。你要买，就得养；你要养，就得负责。”',
        '<strong>曲婶</strong>朝你点点头：“真要说谁配得上谁，不是看价钱，是看谁肯在危险里也不丢下对方。”'
    ],
    granny_moss: [
        '<strong>苔婆婆</strong>蹲在井边洗草药，手背皱得像老树皮：“最近桥那头夜里总有冷风灌进来，吹得我骨头缝里都发酸。风里像夹着细碎的金属响。”',
        '<strong>苔婆婆</strong>把一小束薄荷递给你：“你若有空，替我去桥边看看。不是大事也好，至少让我这把老骨头少猜几宿。”',
        '<strong>苔婆婆</strong>眯眼看着你：“年轻人啊，有时候不是为了奖赏去做事，而是为了让夜里能睡得踏实。”'
    ],
    ferryman_bo: [
        '<strong>摆渡伯</strong>倚着桥栏，脚边放着一盏旧风灯：“前几天夜里桥下卡了不少漂木，我清的时候看见一块带齿纹的铁片，不像村里东西。”',
        '<strong>摆渡伯</strong>把铁片在手里翻了个面：“你要查，我可以把它给你。但你最好先问过村长，他比我更懂这东西该不该往上报。”'
    ]
};







const GAME_VERSION = '0.9.3';
const VERSION_HISTORY = [
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
        reward: { money: 90, items: { '高级球': 1 }, special: { '怪兽图鉴': 1 } }
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
    '星纹鹿王': { id: '#016', rarity: '极品', type: '草', stats: { hp: 28, mp: 18, atk: 8, spd: 6 }, skills: ['星辉冲', '森之庇护', '枝影束缚'], habitat: '呢喃森林（极低概率）', capturable: true, captureRequirement: '究极球', note: '第一章隐藏 Boss 级捕获宠，需要特殊规格的封印手段。' }
};
const STORY_STEPS = {
    INTRO: 'intro',
    CHOOSE_CLASS: 'choose_class',
    CHOOSE_PET: 'choose_pet',
    READY_FOR_FIRST_HUNT: 'ready_for_first_hunt',
    LINXIAO_PENDING: 'linxiao_pending',
    LINXIAO_CHOICE: 'linxiao_choice',
    FOREST_UNLOCKED: 'forest_unlocked',
    FOREST_CLEARED: 'forest_cleared',
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

const CLASSES = {
    '战士': { hp: 34, mp: 8, atk: 8, spd: 5, skills: ['重击', '盾墙', '怒吼'] },
    '弓兵': { hp: 24, mp: 10, atk: 7, spd: 8, skills: ['连射', '刺破', '捕猎陷阱'] },
    '魔法师': { hp: 26, mp: 16, atk: 10, spd: 4, skills: ['元素灼烧', '奥术屏障', '属性吸收'] },
    '牧师': { hp: 28, mp: 18, atk: 5, spd: 5, skills: ['治愈', '祈祷', '神圣庇护'] }
};

const PETS = {
    '火尾狐': { type: '火', rarity: '稀有', hp: 20, mp: 12, atk: 6, spd: 6, skills: ['抓击', '火焰爪', '小火花'] },
    '水泡蛙': { type: '水', rarity: '稀有', hp: 25, mp: 12, atk: 5, spd: 5, skills: ['撞击', '水弹', '水枪'] },
    '叶芽兽': { type: '草', rarity: '稀有', hp: 22, mp: 13, atk: 5, spd: 4, skills: ['藤鞭', '根系抓', '生机'] },
    '大牙鼠': { type: '普通', rarity: '普通', hp: 18, mp: 6, atk: 4, spd: 4, skills: ['咬住', '聚气', '猛击'] },
    '咕咕鸟': { type: '飞行', rarity: '稀有', hp: 16, mp: 10, atk: 5, spd: 7, skills: ['啄击', '顺风', '风切'] },
    '电气菇': { type: '电/草', rarity: '超稀有', hp: 18, mp: 14, atk: 6, spd: 6, skills: ['电击', '麻痹粉', '雷霆冲'] },
    '草跳兔': { type: '草', rarity: '普通', hp: 19, mp: 8, atk: 5, spd: 6, skills: ['飞踢', '叶刃', '小恢复'] },
    '灰羽鸦': { type: '飞行', rarity: '普通', hp: 17, mp: 8, atk: 5, spd: 6, skills: ['啄击', '扰乱', '俯冲'] },
    '小甲壳虫': { type: '虫', rarity: '普通', hp: 22, mp: 6, atk: 4, spd: 4, skills: ['撞击', '硬壳', '虫咬'] },
    '水纹龟': { type: '水', rarity: '普通', hp: 24, mp: 7, atk: 4, spd: 3, skills: ['水弹', '防御姿态', '潮汐拍'] },
    '森叶鹿': { type: '草', rarity: '普通', hp: 23, mp: 8, atk: 5, spd: 4, skills: ['藤刺', '守护', '治愈气息'] },
    '森林蛛': { type: '虫', rarity: '普通', hp: 20, mp: 9, atk: 5, spd: 5, skills: ['蛛网', '毒刺', '潜伏'] },
    '烈风隼': { type: '飞行', rarity: '超稀有', hp: 18, mp: 12, atk: 7, spd: 8, skills: ['风刃', '急袭', '暴风'] },
    '炽尾蜥': { type: '火', rarity: '超稀有', hp: 21, mp: 13, atk: 7, spd: 5, skills: ['火焰冲', '灼烧', '炎爆'] },
    '星纹鹿王': { type: '草', rarity: '极品', hp: 28, mp: 18, atk: 8, spd: 6, skills: ['星辉冲', '森之庇护', '枝影束缚'], requiredBall: '究极球' }
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
        hp: 30,
        mp: 12,
        atk: 7,
        spd: 5,
        skills: ['电击', '麻痹粉'],
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
        skills: ['连射', '刺破', '捕猎陷阱'],
        pet: '咕咕鸟',
        description: '你幼年时最要好的玩伴，嘴上爱逞强，心里却比谁都护短。'
    }
};

const SKILL_DATA = {
    '重击': { damage: 7, mpCost: 0, type: '普通', desc: '沉肩发力，朴实而狠。' },
    '盾墙': { damage: 0, mpCost: 3, type: '普通', desc: '稳住架势，本回合获得额外减伤。' },
    '怒吼': { damage: 0, mpCost: 4, type: '普通', desc: '吼声振奋全队，临时提速。' },
    '连射': { damage: 8, mpCost: 0, type: '普通', desc: '连发两箭，打乱敌人节奏。' },
    '刺破': { damage: 6, mpCost: 2, type: '普通', desc: '瞄准关节与空隙，拖慢目标动作。' },
    '捕猎陷阱': { damage: 0, mpCost: 3, type: '普通', desc: '布下陷阱，为后续攻击制造机会。' },
    '元素灼烧': { damage: 9, mpCost: 4, desc: '借由绑定宠物的属性引燃元素。' },
    '奥术屏障': { damage: 0, mpCost: 5, desc: '用法阵撑起薄而坚韧的护壁。' },
    '属性吸收': { damage: -4, mpCost: 4, desc: '抽取逸散元素，修补自身伤势。' },
    '治愈': { damage: -5, mpCost: 4, desc: '轻声祈祷，使伤口慢慢闭合。' },
    '祈祷': { damage: 0, mpCost: 5, desc: '为全队披上一层稳固的祝福。' },
    '神圣庇护': { damage: 0, mpCost: 6, desc: '在危急前留下一道最后的保险。' },
    '抓击': { damage: 3, mpCost: 0, type: '普通', desc: '普通攻击。' },
    '火焰爪': { damage: 5, mpCost: 3, type: '火', desc: '指尖火光舔过敌人的防线。' },
    '小火花': { damage: 5, mpCost: 4, type: '火', desc: '吐出火星，有概率灼伤对手。' },
    '撞击': { damage: 3, mpCost: 0, type: '普通', desc: '普通攻击。' },
    '水弹': { damage: 5, mpCost: 3, type: '水', desc: '凝水成珠，击打目标。' },
    '水枪': { damage: 5, mpCost: 4, type: '水', desc: '高压水流直线贯穿。' },
    '藤鞭': { damage: 4, mpCost: 3, type: '草', desc: '抽出带刺藤蔓袭击目标。' },
    '根系抓': { damage: 4, mpCost: 4, type: '草', desc: '根须缠住敌人，拖缓脚步。' },
    '生机': { damage: -3, mpCost: 3, type: '草', desc: '借草木之息回复自己。' },
    '咬住': { damage: 2, mpCost: 0, type: '普通', desc: '普通攻击。' },
    '聚气': { damage: 0, mpCost: 2, type: '普通', desc: '收束气息，等待下一次爆发。' },
    '猛击': { damage: 6, mpCost: 0, type: '普通', desc: '普通的重型扑击。' },
    '啄击': { damage: 3, mpCost: 2, type: '飞行', desc: '飞行属性攻击。' },
    '顺风': { damage: 0, mpCost: 3, type: '飞行', desc: '借风调整身位，提高闪避。' },
    '风切': { damage: 6, mpCost: 4, type: '飞行', desc: '将风压压成锋刃。' },
    '虫咬': { damage: 4, mpCost: 2, type: '虫', desc: '虫属性攻击。' },
    '吐丝': { damage: 0, mpCost: 2, type: '虫', desc: '吐出黏丝，拖慢目标。' },
    '甲壳冲锋': { damage: 7, mpCost: 4, type: '虫', desc: '硬壳顶撞，进攻与防御并行。' },
    '电击': { damage: 5, mpCost: 3, type: '电', desc: '放出短促而猛烈的电流。' },
    '麻痹粉': { damage: 0, mpCost: 4, type: '电', desc: '粉末附着神经，使行动迟滞。' },
    '雷霆冲': { damage: 8, mpCost: 5, type: '电', desc: '将电流包裹全身后猛扑。' },
    '飞踢': { damage: 4, mpCost: 0, type: '普通', desc: '跃起后借势踢击。' },
    '叶刃': { damage: 6, mpCost: 3, type: '草', desc: '凝出叶锋划开目标防线。' },
    '小恢复': { damage: -4, mpCost: 3, type: '草', desc: '借草息略微恢复伤势。' },
    '扰乱': { damage: 0, mpCost: 2, type: '飞行', desc: '绕着目标急旋，扰乱其动作。' },
    '俯冲': { damage: 6, mpCost: 3, type: '飞行', desc: '自上而下扑击目标。' },
    '硬壳': { damage: 0, mpCost: 2, type: '虫', desc: '收紧甲壳，准备抗下重击。' },
    '防御姿态': { damage: 0, mpCost: 2, type: '水', desc: '缩起四肢，稳稳守住阵脚。' },
    '潮汐拍': { damage: 6, mpCost: 3, type: '水', desc: '裹着潮声拍向敌人。' },
    '藤刺': { damage: 5, mpCost: 3, type: '草', desc: '连生的藤刺从地面突起。' },
    '守护': { damage: 0, mpCost: 3, type: '草', desc: '垂下叶幕，为自己争取喘息。' },
    '治愈气息': { damage: -5, mpCost: 4, type: '草', desc: '吐出柔和气息，修复伤势。' },
    '蛛网': { damage: 0, mpCost: 2, type: '虫', desc: '铺开黏网限制目标行动。' },
    '毒刺': { damage: 5, mpCost: 3, type: '虫', desc: '刺肢闪电般刺出。' },
    '潜伏': { damage: 0, mpCost: 3, type: '虫', desc: '沉入阴影，等待反击时机。' },
    '风刃': { damage: 6, mpCost: 3, type: '飞行', desc: '卷出锐利风刃。' },
    '急袭': { damage: 7, mpCost: 3, type: '飞行', desc: '以极快速度压近目标。' },
    '暴风': { damage: 9, mpCost: 5, type: '飞行', desc: '掀起猛烈风压席卷前方。' },
    '火焰冲': { damage: 6, mpCost: 3, type: '火', desc: '裹火撞向目标。' },
    '灼烧': { damage: 7, mpCost: 4, type: '火', desc: '留下持续发烫的灼痕。' },
    '炎爆': { damage: 9, mpCost: 5, type: '火', desc: '引爆积蓄的火元素。' },
    '星辉冲': { damage: 8, mpCost: 5, type: '草', desc: '裹着星纹光屑向前冲撞。' },
    '森之庇护': { damage: -6, mpCost: 5, type: '草', desc: '调动林中生机，回复全队伤势。' },
    '枝影束缚': { damage: 6, mpCost: 4, type: '草', desc: '枝影交错，将目标牢牢缠住。' }
};

const NARRATIVE = {
    intro: {
        opening: '风从田埂尽头缓缓卷来，带着潮湿泥土与野花混杂的气味。你站在微风村的石路中央，耳边是鸡鸣、木轮和远处溪流的叮咚声。这个村子像一段被遗忘的旧梦，安静地把你重新接回了怀里。',
        chiefGreeting: '<strong>村长</strong>：“你总算醒了。最近回声草丛那边不太安宁，夜里有灯火，白天有惊叫，连平时胆小的大牙鼠都开始成群乱窜。”',
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
        description: '草茎高过小腿，叶片边缘还挂着细碎露珠。每走一步，前方都会传来细微回响，像有什么东西也在另一边悄悄移动。',
        encounter: '脚边的草叶忽然炸开，一只 <strong>{{enemy}}</strong> 带着警惕与敌意冲了出来。',
        foundItem: '你拨开一簇被露水压弯的草，下面静静躺着 <strong>{{item}}</strong>。',
        nothing: '你停下呼吸听了一会儿，只有风声和昆虫振翅的细响在草叶间来回穿梭。'
    },
    forest: {
        title: '=== 呢喃森林 ===',
        description: '树冠遮住了天光，只剩一条条冷绿色的缝隙落在泥地上。空气像浸过水一样沉，脚步声在林间会被放大，又很快被黑暗吞掉。',
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
        soloChoice: '你决定独自前行。林晓没有拦你，只把一枚磨得温热的铜色徽记塞进你掌心：“既然要一个人扛，就把这点好运也带上。”',
        duoChoice: '你朝林晓伸出了手。他咧嘴一笑，把弓往肩上一甩：“好，那从今天起，危险一人一半，热闹也是。”',
        soloReward: '你获得了 <strong>孤行者徽记</strong> 与 40 风纹币。今后单人战斗会获得额外经验与赏金，但你也将独自承担全部压力。',
        duoPenalty: '林晓加入队伍。双人队伍更稳，但战斗经验会被平分，额外赏金也会减少。',
        forestUnlocked: '村口通往呢喃森林的小路被重新清理出来了。更深的阴影、更重的风险，也在那边等着你。',
        forestBattleIntro: '盘根后的阴影忽然向下垂落，一只森林蛛借着细丝无声逼近，足肢敲得枯叶发出细密的沙沙声。',
        forestBattleVictory: '击退森林蛛后，前方一小片缠藤忽然晃动起来。你拨开枯枝，发现藤幕后藏着一扇钉满铆钉的旧金属门。',
        labDiscovery: '那扇门后并不是猎人小屋，而是一条带着机油味与消毒水味的狭窄通道。墙上暗淡的灯管闪了两下，像是有东西刚刚苏醒。',
        dreamlandAgent: '<strong>幻梦乐园代理</strong>的声音从深处传来，轻飘飘得近乎温柔：“欢迎，误入者。既然已经走到这里，总该见见我们为这个世界准备的新秩序。”',
        robotDefeat: '最后一束火花熄灭后，实验室终于安静下来。你在碎裂的金属板下拾起一枚微微发亮的棱形碎片，它冷得像一小块凝固星光。',
        chapterComplete: '第一章结束。你带着 <strong>星光碎片</strong> 返回村庄，知道自己已经不可能再退回平静的昨天。',
        nextChapterLocked: '第二章尚未开放，但第一章主线、经济、任务与捕获系统已经形成完整闭环。'
    },
    village: {
        chiefQuestOffer: '<strong>村长</strong>：“回声草丛再这么闹下去，孩子们连放风筝都不敢去了。帮我清一清那里的野宠吧。”',
        chiefQuestDone: '<strong>村长</strong>笑着点头：“草丛的动静果然小下来了。这份谢礼你拿着，别推辞。”',
        zhangsanQuestOffer: '<strong>张三</strong>捂着腰叹气：“我今天实在爬不上坡了。你要是顺路，帮我带两颗树果回来，我给你算跑腿钱。”',
        zhangsanQuestDone: '<strong>张三</strong>接过树果，脸上总算有了笑纹：“这下能给家里那只老宠物熬点果浆了。”',
        lisiQuestOffer: '<strong>李四</strong>抱着一叠观察笔记，小声说：“我想研究普通野宠的习性，但我自己一靠近它们就跑。你能不能替我抓一只回来？”',
        lisiQuestDone: '<strong>李四</strong>几乎是扑上来接过记录板：“太好了，这下我的数据终于不是白纸了。”',
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







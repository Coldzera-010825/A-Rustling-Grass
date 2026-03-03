// ========== 游戏状态机引擎 ==========

let logArea;
let buttonsArea;
let teamInfo;
let actionHelpArea;
let uiModeToggleButton;
let dexModal;
let dexModalContent;
let currentSaveSlot = null;
let logQueue = [];
let isLogProcessing = false;
let pendingButtonsData = null;
let lastButtonsData = null;
let logIdleCallbacks = [];
const UI_MODE_STORAGE_KEY = 'arg_ui_mode';

function safeNumber(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function formatValue(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function getCurrentGameVersion() {
    return VERSION_HISTORY?.[0]?.version || GAME_VERSION;
}

function loadUiModePreference() {
    try {
        const savedMode = localStorage.getItem(UI_MODE_STORAGE_KEY);
        return savedMode === 'ops' ? 'ops' : 'field';
    } catch (error) {
        return 'field';
    }
}

function persistUiModePreference(mode) {
    try {
        localStorage.setItem(UI_MODE_STORAGE_KEY, mode);
    } catch (error) {
        // Ignore localStorage failures and keep the current in-memory mode.
    }
}

function applyUiMode(mode = loadUiModePreference()) {
    const safeMode = mode === 'ops' ? 'ops' : 'field';
    document.body.dataset.uiMode = safeMode;
    if (uiModeToggleButton) {
        uiModeToggleButton.textContent = safeMode === 'ops' ? '切换到冒险视图' : '切换到作业台视图';
    }
}

function toggleUiMode() {
    const nextMode = document.body.dataset.uiMode === 'ops' ? 'field' : 'ops';
    persistUiModePreference(nextMode);
    applyUiMode(nextMode);
}

function createInitialGameState() {
    return {
        phase: 'init',
        player: null,
        pet: null,
        petReserve: [],
        party: [],
        inventory: createInventoryTemplate(),
        money: 0,
        combatState: null,
        nextPetUid: 1,
        progress: createInitialProgress()
    };
}

let gameState = createInitialGameState();
function createInventoryTemplate() {
    return {
        human: { ...(DEFAULT_INVENTORY.human || {}) },
        pet: { ...(DEFAULT_INVENTORY.pet || {}) },
        special: { ...(DEFAULT_INVENTORY.special || {}) }
    };
}

function getItemBucket(itemName) {
    if (BALL_DATA[itemName]) return 'human';
    if (['树果', '灵芽露'].includes(itemName)) return 'pet';
    if (['带齿铁片', '溪桥护符', '孤行者徽记', '星光碎片', '怪兽图鉴', '实验门卡'].includes(itemName)) return 'special';
    return 'human';
}

function normalizeInventory(rawInventory) {
    const inventory = createInventoryTemplate();
    if (!rawInventory) return inventory;
    if (rawInventory.human || rawInventory.pet || rawInventory.special) {
        inventory.human = { ...(rawInventory.human || {}) };
        inventory.pet = { ...(rawInventory.pet || {}) };
        inventory.special = { ...(rawInventory.special || {}) };
        return inventory;
    }
    Object.keys(rawInventory).forEach((itemName) => {
        addItemToInventory(inventory, itemName, rawInventory[itemName]);
    });
    return inventory;
}

function getInventoryCount(itemName) {
    const bucket = getItemBucket(itemName);
    return gameState.inventory[bucket][itemName] || 0;
}

function addItemToInventory(targetInventory, itemName, amount = 1) {
    const bucket = getItemBucket(itemName);
    targetInventory[bucket][itemName] = (targetInventory[bucket][itemName] || 0) + amount;
}

function addInventoryItem(itemName, amount = 1) {
    addItemToInventory(gameState.inventory, itemName, amount);
}

function removeInventoryItem(itemName, amount = 1) {
    const bucket = getItemBucket(itemName);
    gameState.inventory[bucket][itemName] = Math.max(0, (gameState.inventory[bucket][itemName] || 0) - amount);
}

function getUnitSkillPlan(unit) {
    if (!unit) return [];
    if (unit.isPet) {
        return PET_SKILL_PLANS[unit.name] || [];
    }
    return CLASS_SKILL_PLANS[unit.class] || [];
}

function getUnlockedSkillsForUnit(unit) {
    if (!unit) return [];
    const plan = getUnitSkillPlan(unit);
    if (plan.length === 0) {
        return Array.isArray(unit.skills) ? [...unit.skills] : [];
    }
    if (unit.isPet) {
        return getPetSkillsByLevel(unit.name, safeNumber(unit.level, 1));
    }
    return getClassSkillsByLevel(unit.class, safeNumber(unit.level, 1));
}

function syncUnitSkills(unit) {
    if (!unit) return;
    unit.skills = getUnlockedSkillsForUnit(unit);
}

function getBasicAttackDescription(unit) {
    const roleLabel = unit?.isPet ? '宠物普攻' : '角色普攻';
    const typeLabel = '基础普攻统一按普通属性判定，不消耗 MP。';
    return `${roleLabel}，伤害约为 ATK 的 75%。${typeLabel}`;
}

function getTypeBadgeClass(typeName) {
    return {
        '火': 'type-fire',
        '水': 'type-water',
        '草': 'type-grass',
        '普通': 'type-normal',
        '飞行': 'type-flying',
        '虫': 'type-bug',
        '电': 'type-electric',
        '机械': 'type-mechanical'
    }[typeName] || 'type-normal';
}

function renderTypeBadges(typeValue = '') {
    return parseTypeParts(typeValue).map((typeName) => `<span class="type-badge ${getTypeBadgeClass(typeName)}">${typeName}</span>`).join('');
}

function getSkillDescription(skillName) {
    const skill = SKILL_DATA[skillName];
    if (!skill) return '暂无技能说明。';
    const parts = [];
    if (skill.type) parts.push(`属性：${skill.type}`);
    parts.push(`MP：${safeNumber(skill.mpCost, 0)}`);
    if (skill.damage > 0) parts.push(`效果：造成 ${skill.damage} 点基础伤害`);
    if (skill.damage < 0) parts.push(`效果：恢复 ${Math.abs(skill.damage)} 点生命`);
    if (skill.damage === 0) parts.push('效果：功能型技能');
    parts.push(skill.desc);
    return parts.join('｜');
}

function getUnitSkillEntries(unit) {
    const plan = getUnitSkillPlan(unit);
    return (plan || []).map((entry) => ({
        level: entry.level,
        skill: entry.skill,
        description: getSkillDescription(entry.skill)
    }));
}

const NPC_TO_ENCYCLOPEDIA_ENTRY = {
    chief: 'chief',
    zhangsan: 'zhangsan',
    lisi: 'lisi',
    ahe: 'ahe',
    qushen: 'qushen',
    granny_moss: 'granny_moss',
    ferryman_bo: 'ferryman_bo'
};

function ensureEncyclopediaState(progress = gameState.progress) {
    if (!progress.encyclopedia) {
        progress.encyclopedia = {
            obtained: false,
            seenPets: {},
            seenCharacters: {}
        };
    }
    if (!progress.encyclopedia.seenPets) progress.encyclopedia.seenPets = {};
    if (!progress.encyclopedia.seenCharacters) progress.encyclopedia.seenCharacters = {};
    if (getInventoryCount('怪兽图鉴') > 0) {
        progress.encyclopedia.obtained = true;
    }
    return progress.encyclopedia;
}

function hasEncyclopediaAccess() {
    return !!ensureEncyclopediaState().obtained;
}

function markPetSeen(petName) {
    if (!petName || !MONSTER_DEX[petName]) return;
    ensureEncyclopediaState().seenPets[petName] = true;
}

function markCharacterSeen(entryId) {
    if (!entryId) return;
    ensureEncyclopediaState().seenCharacters[entryId] = true;
}

function syncEncyclopediaDiscoveries() {
    ensureEncyclopediaState();
    if (gameState.pet) markPetSeen(gameState.pet.name);
    gameState.petReserve.forEach((pet) => markPetSeen(pet.name));
    gameState.party.forEach((member) => {
        if (member.pet) markPetSeen(member.pet.name);
    });
    Object.keys(NPC_TO_ENCYCLOPEDIA_ENTRY).forEach((npcId) => {
        if (safeNumber(gameState.progress?.villageTalkIndex?.[npcId], 0) > 0) {
            markCharacterSeen(NPC_TO_ENCYCLOPEDIA_ENTRY[npcId]);
        }
    });
    if (gameState.progress?.flags?.linxiaoMet || gameState.progress?.flags?.linxiaoDefeated) {
        markCharacterSeen('linxiao');
    }
    if (gameState.progress?.flags?.laboratoryFound) {
        markCharacterSeen('dreamland_agent');
    }
    if (gameState.progress?.flags?.agentDefeated) {
        markPetSeen('棱镜机偶');
    }
    if (gameState.progress?.flags?.chapter1Completed) {
        markCharacterSeen('inner_aberration');
    }
}

function grantEncyclopedia() {
    const encyclopedia = ensureEncyclopediaState();
    if (encyclopedia.obtained) return false;
    encyclopedia.obtained = true;
    addInventoryItem('怪兽图鉴', 1);
    syncEncyclopediaDiscoveries();
    return true;
}

function setActionHelp(text = '将鼠标悬停到技能按钮上，可以在这里查看说明。') {
    if (!actionHelpArea) return;
    actionHelpArea.innerHTML = text;
}

function closeDexModal() {
    if (!dexModal) return;
    dexModal.style.display = 'none';
}

function handleDexOverlayClick(event) {
    if (event.target === dexModal) {
        closeDexModal();
    }
}

function getRestCost() {
    const restsTaken = safeNumber(gameState.progress?.counters?.restsTaken, 0);
    if (restsTaken < 3) return 0;
    return 8 + (restsTaken - 3) * 4;
}

function beginVillageInvestigationPhase() {
    gameState.progress.storyStep = STORY_STEPS.VILLAGE_INVESTIGATION;
    if (!gameState.progress.flags.investigationBriefed) {
        gameState.progress.flags.investigationBriefed = true;
        addLog(NARRATIVE.story.investigationIntro, 'dialogue');
        addLog(NARRATIVE.story.investigationBrief, 'sys');
    }
}

function hasRequiredInvestigationClues() {
    return !!(gameState.progress.flags.lisiObservationSolved && gameState.progress.flags.marketSupplySolved);
}

function checkVillageInvestigationProgress() {
    if (!gameState.progress.flags.linxiaoChoiceResolved || gameState.progress.mapsUnlocked.forest) return;
    if (!hasRequiredInvestigationClues()) return;
    unlockForest();
}

function showInvestigationStatus() {
    const remaining = [];
    if (!gameState.progress.flags.lisiObservationSolved) remaining.push('去磨坊前和李四分析异常记录');
    if (!gameState.progress.flags.marketSupplySolved) remaining.push('去集市长棚追查异常采购');
    if (!gameState.progress.flags.bridgeClueConfirmed) remaining.push('可选：继续整理桥边异响的旁证');
    addLog('=== 调查线索 ===', 'sys');
    addLog(remaining.join('；'), 'sys');
    setButtons(getHubButtons());
}

function runLisiObservationPuzzle() {
    addLog('<strong>李四</strong>摊开记录本：“我连续几天记了草丛里的动静，但越看越不像自然迁徙。你帮我判断一下，哪种情况最像是同一股外力在驱赶它们？”', 'dialogue');
    setButtons([
        {
            text: '草叶被踩弯了一整片',
            action: () => resolveLisiObservationPuzzle(false),
            helpText: '这更像单纯有东西经过。'
        },
        {
            text: '不同属性的野宠同时朝同一方向逃窜',
            action: () => resolveLisiObservationPuzzle(true),
            helpText: '这更像同一股异常在挤压它们的活动范围。'
        },
        {
            text: '一只宠物停在原地发呆',
            action: () => resolveLisiObservationPuzzle(false),
            helpText: '单个个体异常，不足以解释整片区域的同步紊乱。'
        }
    ]);
}

function resolveLisiObservationPuzzle(isCorrect) {
    if (!isCorrect) {
        addLog('<strong>李四</strong>摇了摇头：“那更像普通痕迹。真正怪的地方在于，本来不会一起行动的种类，最近都在躲同一个方向。”', 'dialogue');
        runAfterLogs(() => runLisiObservationPuzzle(), 120);
        return;
    }
    gameState.progress.flags.lisiObservationSolved = true;
    addLog('<strong>李四</strong>眼睛一下亮了：“对，就是这个。不同属性、不同习性的野宠同时朝同一边退，这不是自然受惊，是有人在那一头持续制造扰动。”', 'dialogue');
    addLog('你整理出了第一条主线线索：草丛异常不是偶发骚动，而是来自森林深处的持续压迫。', 'heal');
    checkVillageInvestigationProgress();
    setButtons([
        { text: '继续留在磨坊前', action: () => visitVillageArea('mill') },
        { text: '回村庄主界面', action: enterHub }
    ]);
}

function runMarketSupplyPuzzle() {
    addLog('<strong>阿禾</strong>和<strong>曲婶</strong>把最近几笔古怪交易都报给了你：绝缘布、冷却药剂、机油、固定铆钉，还有专门压制高能宠物用的扣具。两人都觉得，那不像普通旅人会买的东西。', 'dialogue');
    addLog('你需要判断：这些采购组合最像什么人的补给清单？', 'sys');
    setButtons([
        {
            text: '路过的旅人',
            action: () => resolveMarketSupplyPuzzle(false),
            helpText: '旅人不会特意成批准备维护和压制设备。'
        },
        {
            text: '设施维护与实验队',
            action: () => resolveMarketSupplyPuzzle(true),
            helpText: '这些东西更像在维持某种电力、门禁或收束装置。'
        },
        {
            text: '普通猎户',
            action: () => resolveMarketSupplyPuzzle(false),
            helpText: '猎户会买绳网和干粮，不会这样成套购买导电与冷却物资。'
        }
    ]);
}

function resolveMarketSupplyPuzzle(isCorrect) {
    if (!isCorrect) {
        addLog('<strong>阿禾</strong>敲了敲算盘：“不像。真是旅人或猎户，买不了这么齐的维护物资。”<strong>曲婶</strong>也皱眉补了一句：“尤其是那批压制扣具，像是专门给不好控制的家伙准备的。”', 'dialogue');
        runAfterLogs(() => runMarketSupplyPuzzle(), 120);
        return;
    }
    gameState.progress.flags.marketSupplySolved = true;
    addLog('<strong>阿禾</strong>把账册一合：“对，我也是这么想的。”<strong>曲婶</strong>轻轻点头：“有人在森林里养着或关着什么，而且不想让它失控。”', 'dialogue');
    addLog('你整理出了第二条主线线索：森林里的异常背后，很可能有一支仍在运转的实验或维护队伍。', 'heal');
    checkVillageInvestigationProgress();
    setButtons([
        { text: '继续留在集市长棚', action: () => visitVillageArea('market') },
        { text: '回村庄主界面', action: enterHub }
    ]);
}

function startProxyBattle() {
    addLog(NARRATIVE.story.agentBossStart, 'combat');
    startCombat('幻梦乐园代理人', { area: 'forest', encounterType: 'boss', isBoss: true, storyEvent: 'proxyBoss' });
}

function startLaboratoryDoorPuzzle() {
    if (gameState.progress.flags.labDoorUnlocked) {
        enterInnerLaboratory();
        return;
    }
    addLog(NARRATIVE.story.doorPuzzleIntro, 'sys');
    addLog('第一道校验：<strong>“看不见，吹不散；会走，却不是风。”</strong>', 'sys');
    setButtons([
        { text: '回答：风纹', action: () => resolveDoorRiddleOne(true) },
        { text: '回答：雾', action: () => resolveDoorRiddleOne(false) },
        { text: '回答：回声', action: () => resolveDoorRiddleOne(false) }
    ]);
}

function resolveDoorRiddleOne(isCorrect) {
    if (!isCorrect) {
        addLog('门禁面板发出一声低沉的拒绝音。你想起村里老人说过，那并不是风，而是世界呼吸留下的痕迹。', 'sys');
        runAfterLogs(() => startLaboratoryDoorPuzzle(), 120);
        return;
    }
    addLog('第一道校验通过。面板继续亮起第二行：<strong>“躁动、沉静、生长，应按何种元素顺序排列？”</strong>', 'sys');
    setButtons([
        { text: '火 / 水 / 草', action: () => resolveDoorRiddleTwo(true) },
        { text: '草 / 火 / 水', action: () => resolveDoorRiddleTwo(false) },
        { text: '电 / 水 / 草', action: () => resolveDoorRiddleTwo(false) }
    ]);
}

function resolveDoorRiddleTwo(isCorrect) {
    if (!isCorrect) {
        addLog('面板上的元素序列重新归零。你回想起村里关于风纹的说法：火是躁动，水是沉静，草是生长。', 'sys');
        runAfterLogs(() => startLaboratoryDoorPuzzle(), 120);
        return;
    }
    const bridgeBonus = gameState.progress.flags.bridgeClueConfirmed
        ? '你还顺手把桥边那枚带齿铁片按进了最后的纹槽，大小和齿距恰好吻合。'
        : '你用门卡裂开的齿纹在槽位上比了比，终于勉强对上最后的机械校验。';
    addLog(bridgeBonus, 'sys');
    gameState.progress.flags.labDoorUnlocked = true;
    gameState.progress.storyStep = STORY_STEPS.LAB_DOOR_UNLOCKED;
    addLog(NARRATIVE.story.doorPuzzleSolved, 'heal');
    setButtons([
        { text: '进入实验室深处', action: enterInnerLaboratory },
        { text: '先撤回村庄', action: enterHub }
    ]);
}

function enterInnerLaboratory() {
    gameState.progress.flags.innerLabSeen = true;
    addLog(NARRATIVE.story.innerLabDiscovery, 'sys');
    addLog(NARRATIVE.story.innerBossIntro, 'dialogue');
    setButtons([
        { text: '迎战失衡实验体', action: startInnerBossBattle },
        { text: '暂时撤出实验室', action: enterHub }
    ]);
}

function startInnerBossBattle() {
    addLog(NARRATIVE.story.innerBossStart, 'combat');
    markCharacterSeen('inner_aberration');
    startCombat('失衡实验体', { area: 'forest', encounterType: 'enemy', storyEvent: 'innerBoss' });
}

function getBridgeMysteryActionText() {
    const stage = safeNumber(gameState.progress?.flags?.bridgeMysteryStage, 0);
    switch (stage) {
        case 1:
            return '检查桥边风里的异响';
        case 2:
            return '先拿铁片去问村长';
        case 3:
            return '比对铁片与桥边痕迹';
        case 4:
            return '桥边线索已确认';
        default:
            return '查看桥边异样';
    }
}

function resetLogSystem() {
    logQueue = [];
    isLogProcessing = false;
    pendingButtonsData = null;
    lastButtonsData = null;
    logIdleCallbacks = [];
}

function getLogDelay(type = 'normal') {
    const delays = {
        normal: 520,
        sys: 480,
        dialogue: 720,
        combat: 760,
        damage: 700,
        heal: 620
    };
    return delays[type] || delays.normal;
}

function appendLogEntry(text, type = 'normal') {
    if (!logArea) return;
    const div = document.createElement('div');
    div.className = 'log-entry';
    if (type === 'sys') div.classList.add('log-sys');
    if (type === 'dialogue') div.classList.add('log-dialogue');
    if (type === 'combat') div.classList.add('log-combat');
    if (type === 'damage') div.classList.add('log-damage');
    if (type === 'heal') div.classList.add('log-heal');
    div.innerHTML = text;
    logArea.appendChild(div);
    logArea.scrollTop = logArea.scrollHeight;
}

function showWaitingButtons() {
    if (!buttonsArea) return;
    buttonsArea.innerHTML = '';
    const button = document.createElement('button');
    button.innerText = '日志播放中...';
    button.disabled = true;
    button.className = 'log-wait-button';
    buttonsArea.appendChild(button);
    setActionHelp('日志尚在播放，当前操作按钮会在文本滚动结束后恢复。');
}

function renderButtons(buttonsData) {
    if (!buttonsArea) return;
    lastButtonsData = buttonsData;
    buttonsArea.innerHTML = '';
    buttonsData.forEach((btn) => {
        const button = document.createElement('button');
        button.innerText = btn.text;
        if (btn.disabled) button.disabled = true;
        if (btn.className) button.className = btn.className;
        const helpText = btn.helpText || '';
        if (helpText) {
            button.addEventListener('mouseenter', () => setActionHelp(helpText));
            button.addEventListener('focus', () => setActionHelp(helpText));
            button.addEventListener('mouseleave', () => setActionHelp());
            button.addEventListener('blur', () => setActionHelp());
        }
        button.onclick = () => {
            Array.from(buttonsArea.querySelectorAll('button')).forEach((node) => {
                node.disabled = true;
            });
            setActionHelp('正在处理你的选择...');
            btn.action();
        };
        buttonsArea.appendChild(button);
    });
    setActionHelp();
}

function flushPendingButtons() {
    if (!pendingButtonsData) return;
    const buttonsData = pendingButtonsData;
    pendingButtonsData = null;
    renderButtons(buttonsData);
}

function restoreLastButtons() {
    if (!lastButtonsData || !buttonsArea) return;
    renderButtons(lastButtonsData);
}

function resolveLogIdle() {
    if (logQueue.length > 0 || isLogProcessing) return;
    if (pendingButtonsData) {
        flushPendingButtons();
    } else {
        restoreLastButtons();
    }
    const callbacks = [...logIdleCallbacks];
    logIdleCallbacks = [];
    callbacks.forEach((callback) => callback());
}

function processLogQueue() {
    if (!logArea || isLogProcessing) return;
    if (logQueue.length === 0) {
        resolveLogIdle();
        return;
    }

    isLogProcessing = true;
    const entry = logQueue.shift();
    appendLogEntry(entry.text, entry.type);
    window.setTimeout(() => {
        isLogProcessing = false;
        if (logQueue.length > 0) {
            processLogQueue();
            return;
        }
        resolveLogIdle();
    }, getLogDelay(entry.type));
}

function isLogBusy() {
    return isLogProcessing || logQueue.length > 0;
}

function runAfterLogs(callback, extraDelay = 0) {
    if (typeof callback !== 'function') return;
    if (!isLogBusy()) {
        if (extraDelay > 0) {
            window.setTimeout(callback, extraDelay);
            return;
        }
        callback();
        return;
    }

    logIdleCallbacks.push(() => {
        if (extraDelay > 0) {
            window.setTimeout(callback, extraDelay);
            return;
        }
        callback();
    });
}

function addLog(text, type = 'normal') {
    logQueue.push({ text, type });
    processLogQueue();
}

function setButtons(buttonsData, options = {}) {
    if (options.immediate || !isLogBusy()) {
        pendingButtonsData = null;
        renderButtons(buttonsData);
        return;
    }

    pendingButtonsData = buttonsData;
    showWaitingButtons();
}

function promptReturnToMainMenu() {
    closeDexModal();
    const shouldSave = currentSaveSlot !== null && confirm(`返回主菜单前是否保存游戏？
选择“确定”将保存后返回，选择“取消”将直接返回。`);
    if (shouldSave) {
        saveCurrentGame({ silent: true });
    }
    resetLogSystem();
    if (logArea) logArea.innerHTML = '';
    showMainMenu();
}

function updateUI() {
    if (gameState.phase === 'combat' && gameState.combatState) {
        updateCombatUI();
        return;
    }
    updateNormalUI();
}

function renderBar(label, value, maxValue, className) {
    const safeMax = Math.max(1, maxValue || 1);
    const width = Math.max(0, Math.min(100, (value / safeMax) * 100));
    return `
        <div class="stat-item"><strong>${label}:</strong> ${value}/${safeMax}</div>
        <div class="${className}-bar-container"><div class="${className}-bar-fill" style="width:${width}%"></div></div>
    `;
}

function updateNormalUI() {
    const progress = gameState.progress;
    let html = `<div class="status-version">版本 ${getCurrentGameVersion()}</div>`;

    const renderUnitCard = (title, unit, options = {}) => {
        if (!unit) return '';
        const expNeeded = EXP_SYSTEM.expToLevel(safeNumber(unit.level, 1));
        const roleMeta = options.isPet
            ? `${unit.type} / ${unit.rarity}`
            : `${unit.class}`;
        const accentClass = options.isPet ? 'pet' : 'player';
        return `
            <section class="status-card ${accentClass}">
                <div class="status-card-header">
                    <div>
                        <div class="status-title">${title}</div>
                        <div class="status-subtitle">${unit.name} · ${roleMeta}</div>
                    </div>
                    <span class="status-pill level">Lv.${safeNumber(unit.level, 1)}</span>
                </div>
                <div class="status-grid">
                    <div class="status-metric hp"><span class="metric-label">HP</span><span class="metric-value">${formatValue(unit.hp)}/${formatValue(unit.maxHp, 1)}</span></div>
                    <div class="status-metric mp"><span class="metric-label">MP</span><span class="metric-value">${formatValue(unit.mp)}/${formatValue(unit.maxMp, 1)}</span></div>
                    <div class="status-metric exp"><span class="metric-label">EXP</span><span class="metric-value">${formatValue(unit.exp)}/${expNeeded}</span></div>
                    <div class="status-metric stat"><span class="metric-label">ATK/SPD</span><span class="metric-value">${formatValue(unit.atk)}/${formatValue(unit.spd)}</span></div>
                </div>
            </section>
        `;
    };

    if (gameState.player) {
        html += renderUnitCard('主角', gameState.player, { isPet: false });
    }

    if (gameState.pet) {
        html += renderUnitCard('主宠', gameState.pet, { isPet: true });
    }

    html += `
        <section class="status-card neutral compact-card">
            <div class="status-card-header">
                <div class="status-title">队伍概况</div>
                <span class="status-pill ${progress.partyMode === 'duo' ? 'duo' : 'solo'}">${progress.partyMode === 'duo' ? '双人同行' : '单人独行'}</span>
            </div>
            <div class="status-inline-row">
                <span class="status-chip money">${CURRENCY_NAME} ${formatValue(gameState.money)}</span>
                <span class="status-chip chapter">第 ${formatValue(progress.chapter, 1)} 章</span>
                <span class="status-chip progress">草丛探索 ${formatValue(progress.counters.grasslandExplorations)} 次</span>
                <span class="status-chip progress">已捕获 ${formatValue(progress.counters.capturesTotal)} 只</span>
            </div>
        </section>
    `;

    if (gameState.party.length > 0) {
        html += '<section class="status-card neutral"><div class="status-card-header"><div class="status-title">同行成员</div></div>';
        gameState.party.forEach((member) => {
            html += renderUnitCard(`伙伴`, member, { isPet: false });
            if (member.pet) {
                html += renderUnitCard(`${member.name}的宠物`, member.pet, { isPet: true });
            }
        });
        html += '</section>';
    }

    const renderInventoryGroup = (title, className, items) => {
        if (items.length === 0) {
            return `<div class="inventory-group ${className}"><div class="inventory-title">${title}</div><div class="inventory-empty">暂无</div></div>`;
        }
        return `<div class="inventory-group ${className}"><div class="inventory-title">${title}</div>${items.map((item) => `<div class="inventory-line"><span>${item.name}</span><span>x${item.count}</span></div>`).join('')}</div>`;
    };

    const humanItems = Object.keys(gameState.inventory.human).filter((item) => gameState.inventory.human[item] > 0).map((item) => ({ name: item, count: gameState.inventory.human[item] }));
    const petItems = Object.keys(gameState.inventory.pet).filter((item) => gameState.inventory.pet[item] > 0).map((item) => ({ name: item, count: gameState.inventory.pet[item] }));
    const specialItems = Object.keys(gameState.inventory.special).filter((item) => gameState.inventory.special[item] > 0).map((item) => ({ name: item, count: gameState.inventory.special[item] }));

    html += `
        <section class="status-card neutral compact-card">
            <div class="status-card-header"><div class="status-title">背包</div></div>
            ${renderInventoryGroup('人类道具', 'human', humanItems)}
            ${renderInventoryGroup('宠物道具', 'pet', petItems)}
            ${renderInventoryGroup('特殊物品', 'special', specialItems)}
        </section>
    `;

    html += '<section class="status-card neutral compact-card"><div class="status-card-header"><div class="status-title">后备宠物</div></div>';
    if (gameState.petReserve.length === 0) {
        html += '<div class="inventory-empty">暂无</div>';
    } else {
        gameState.petReserve.forEach((pet, index) => {
            html += `<div class="reserve-line"><span>${index + 1}. ${pet.name}</span><span class="status-pill rarity">${pet.rarity}</span><span class="status-pill level">Lv.${safeNumber(pet.level, 1)}</span></div>`;
        });
    }
    html += '</section>';

    html += '<section class="status-card neutral compact-card"><div class="status-card-header"><div class="status-title">任务与进度</div></div>';
    const activeQuests = Object.keys(progress.questStates).filter((questId) => ['accepted', 'completed'].includes(progress.questStates[questId]));
    if (activeQuests.length === 0) {
        html += '<div class="inventory-empty">当前没有进行中的委托</div>';
    } else {
        activeQuests.forEach((questId) => {
            html += `<div class="quest-line"><span>${QUESTS[questId].title}</span><span>${getQuestProgressText(questId)}</span></div>`;
        });
    }
    html += `<div class="status-inline-row"><span class="status-chip progress">阶段 ${progress.storyStep}</span></div>`;
    html += '</section>';

    teamInfo.innerHTML = html;
}

function startGame() {
    gameState.phase = 'hub';
    gameState.progress.storyStep = STORY_STEPS.INTRO;
    addLog(NARRATIVE.intro.opening);
    setButtons([{ text: '与村长交谈', action: talkToVillageChief }]);
    updateUI();
}

function talkToVillageChief() {
    gameState.progress.flags.talkedToVillageChief = true;
    gameState.progress.storyStep = STORY_STEPS.CHOOSE_CLASS;
    addLog(NARRATIVE.intro.chiefGreeting, 'dialogue');
    addLog(NARRATIVE.intro.classPrompt, 'sys');
    setButtons([
        { text: '战士', action: () => selectClass('战士') },
        { text: '弓兵', action: () => selectClass('弓兵') },
        { text: '魔法师', action: () => selectClass('魔法师') },
        { text: '牧师', action: () => selectClass('牧师') }
    ]);
}

function selectClass(className) {
    const stats = CLASSES[className];
    gameState.player = {
        id: 'player-main',
        name: '玩家',
        class: className,
        hp: stats.hp,
        maxHp: stats.hp,
        mp: stats.mp,
        maxMp: stats.mp,
        atk: stats.atk,
        spd: stats.spd,
        skills: [],
        level: 1,
        exp: 0,
        isPlayer: true,
        isEnemy: false,
        team: 'ally'
    };
    syncUnitSkills(gameState.player);
    gameState.progress.flags.classSelected = true;
    gameState.progress.storyStep = STORY_STEPS.CHOOSE_PET;
    addLog(`你选择了 <strong>${className}</strong>。`, 'sys');
    addLog(NARRATIVE.intro.petSelection, 'dialogue');
    setButtons([
        { text: '火尾狐', action: () => selectPet('火尾狐') },
        { text: '水泡蛙', action: () => selectPet('水泡蛙') },
        { text: '叶芽兽', action: () => selectPet('叶芽兽') }
    ]);
    updateUI();
}

function selectPet(petName) {
    gameState.pet = createPetInstance(petName);
    gameState.pet.owner = '玩家';
    markPetSeen(petName);
    gameState.progress.flags.petSelected = true;
    gameState.progress.storyStep = STORY_STEPS.READY_FOR_FIRST_HUNT;
    addLog(`你把 <strong>${petName}</strong> 抱进怀里。它先是警惕地看着你，随后轻轻碰了碰你的手背，算是默认了这段同路。`, 'sys');
    addLog(NARRATIVE.intro.starterGift, 'dialogue');
    gameState.money += STARTER_GIFT.money;
    Object.keys(STARTER_GIFT.human).forEach((itemName) => addInventoryItem(itemName, STARTER_GIFT.human[itemName]));
    Object.keys(STARTER_GIFT.pet).forEach((itemName) => addInventoryItem(itemName, STARTER_GIFT.pet[itemName]));
    Object.keys(STARTER_GIFT.special).forEach((itemName) => addInventoryItem(itemName, STARTER_GIFT.special[itemName]));
    addLog(NARRATIVE.intro.readyMessage, 'sys');
    updateUI();
    runAfterLogs(() => enterHub(), 120);
}

function createPetInstance(petName) {
    const template = PETS[petName];
    const uid = `pet-${gameState.nextPetUid}`;
    gameState.nextPetUid += 1;
    const pet = {
        uid,
        id: uid,
        name: petName,
        type: template.type,
        rarity: template.rarity,
        hp: template.hp,
        maxHp: template.hp,
        mp: template.mp,
        maxMp: template.mp,
        atk: template.atk,
        spd: template.spd,
        skills: [],
        level: 1,
        exp: 0,
        isPet: true,
        isEnemy: false,
        owner: null,
        team: 'ally'
    };
    syncUnitSkills(pet);
    return pet;
}

function createNpcPartyMember(name) {
    const template = NPC_CHARACTERS[name];
    const member = {
        id: `npc-${name}`,
        name,
        class: template.class,
        hp: template.hp,
        maxHp: template.hp,
        mp: template.mp,
        maxMp: template.mp,
        atk: template.atk,
        spd: template.spd,
        skills: [],
        level: 1,
        exp: 0,
        isEnemy: false,
        team: 'ally',
        pet: (() => {
            const pet = createPetInstance(template.pet);
            pet.owner = name;
            return pet;
        })()
    };
    syncUnitSkills(member);
    return member;
}

function ensureVillageState() {
    if (gameState.progress.villageTalkIndex === undefined) {
        gameState.progress.villageTalkIndex = {};
    }
    if (gameState.progress.flags.bridgeMysteryStage === undefined) {
        gameState.progress.flags.bridgeMysteryStage = 0;
    }
    if (gameState.progress.flags.bridgeCharmGranted === undefined) {
        gameState.progress.flags.bridgeCharmGranted = false;
    }
    if (gameState.progress.flags.lisiObservationSolved === undefined) {
        gameState.progress.flags.lisiObservationSolved = false;
    }
    if (gameState.progress.flags.marketSupplySolved === undefined) {
        gameState.progress.flags.marketSupplySolved = false;
    }
    if (gameState.progress.flags.bridgeClueConfirmed === undefined) {
        gameState.progress.flags.bridgeClueConfirmed = false;
    }
    if (gameState.progress.flags.bridgeCharmGranted) {
        gameState.progress.flags.bridgeClueConfirmed = true;
    }
    if (gameState.progress.flags.investigationBriefed === undefined) {
        gameState.progress.flags.investigationBriefed = false;
    }
    if (gameState.progress.flags.agentDefeated === undefined) {
        gameState.progress.flags.agentDefeated = false;
    }
    if (gameState.progress.flags.labDoorUnlocked === undefined) {
        gameState.progress.flags.labDoorUnlocked = false;
    }
    if (gameState.progress.flags.innerLabSeen === undefined) {
        gameState.progress.flags.innerLabSeen = false;
    }
}

function enterHub() {
    gameState.phase = 'hub';
    gameState.progress.currentArea = 'village';
    ensureVillageState();
    refreshQuestStates();
    addLog(NARRATIVE.hub.title, 'sys');
    addLog(NARRATIVE.hub.description);
    updateUI();
    setButtons(getHubButtons());
}

function getHubButtons() {
    const buttons = [];
    const flags = gameState.progress.flags;
    const restCost = getRestCost();

    if (gameState.player && gameState.pet) {
        buttons.push({ text: '浏览村庄', action: browseVillage });
        buttons.push({ text: '探索回声草丛', action: exploreGrassland });
        if (gameState.progress.mapsUnlocked.forest) {
            buttons.push({ text: '进入呢喃森林', action: exploreForest });
        }
        buttons.push({ text: '使用道具', action: openItemMenu });
        buttons.push({ text: '更换主宠', action: openPetSwitchMenu, disabled: gameState.petReserve.length === 0 });
    }

    if (flags.linxiaoDefeated && !flags.linxiaoChoiceResolved) {
        buttons.unshift({ text: '回应林晓', action: offerLinxiaoChoice });
    }
    if (flags.linxiaoChoiceResolved && !gameState.progress.mapsUnlocked.forest) {
        buttons.unshift({ text: '整理调查线索', action: showInvestigationStatus });
    }

    buttons.push({
        text: restCost === 0 ? '休息（恢复HP/MP，免费）' : `休息（恢复HP/MP，${restCost} ${CURRENCY_NAME}）`,
        action: rest,
        helpText: restCost === 0
            ? `当前属于新手保护，第 ${safeNumber(gameState.progress?.counters?.restsTaken, 0) + 1} 次休息免费。前三次免费。`
            : `本次休息需要 ${restCost} ${CURRENCY_NAME}，之后每休息一次都会继续涨价。`
    });
    buttons.push({ text: '查看状态', action: viewStatus });
    buttons.push({ text: '保存游戏', action: saveCurrentGame, className: 'save-game-btn' });
    return buttons;
}

function rest() {
    const restCost = getRestCost();
    if (restCost > 0 && gameState.money < restCost) {
        addLog(`你摸了摸钱袋，发现还差 ${restCost - gameState.money} ${CURRENCY_NAME}，暂时付不起这次休息费用。`, 'sys');
        updateUI();
        setButtons(getHubButtons());
        return;
    }

    if (restCost > 0) {
        gameState.money -= restCost;
        addLog(`你支付了 ${restCost} ${CURRENCY_NAME}，在村里的长椅与热汤之间把体力慢慢补了回来。`, 'sys');
    } else {
        addLog(NARRATIVE.hub.restMessage, 'sys');
    }
    healRosterToFull();
    gameState.progress.counters.restsTaken = safeNumber(gameState.progress.counters.restsTaken, 0) + 1;
    addLog(NARRATIVE.hub.healedMessage, 'heal');
    updateUI();
    setButtons(getHubButtons());
}

function healRosterToFull() {
    if (gameState.player) {
        gameState.player.hp = gameState.player.maxHp;
        gameState.player.mp = gameState.player.maxMp;
    }
    if (gameState.pet) {
        gameState.pet.hp = gameState.pet.maxHp;
        gameState.pet.mp = gameState.pet.maxMp;
    }
    gameState.party.forEach((member) => {
        member.hp = member.maxHp;
        member.mp = member.maxMp;
        if (member.pet) {
            member.pet.hp = member.pet.maxHp;
            member.pet.mp = member.pet.maxMp;
        }
    });
    gameState.petReserve.forEach((pet) => {
        pet.hp = pet.maxHp;
        pet.mp = pet.maxMp;
    });
}

function viewStatus() {
    addLog('=== 当前状态 ===', 'sys');
    if (gameState.player) {
        addLog(`玩家 ${gameState.player.class} Lv.${safeNumber(gameState.player.level, 1)} | HP ${formatValue(gameState.player.hp)}/${formatValue(gameState.player.maxHp, 1)} | MP ${formatValue(gameState.player.mp)}/${formatValue(gameState.player.maxMp, 1)} | ATK ${formatValue(gameState.player.atk)} | SPD ${formatValue(gameState.player.spd)}`);
    }
    if (gameState.pet) {
        addLog(`主宠 ${gameState.pet.name} Lv.${safeNumber(gameState.pet.level, 1)} (${gameState.pet.rarity}) | HP ${formatValue(gameState.pet.hp)}/${formatValue(gameState.pet.maxHp, 1)} | MP ${formatValue(gameState.pet.mp)}/${formatValue(gameState.pet.maxMp, 1)}`);
    }
    addLog(`当前持有 ${CURRENCY_NAME}: ${gameState.money}`);
    addLog(`队伍模式: ${gameState.progress.partyMode === 'duo' ? '双人同行，经验减半' : '单人独行，经验与赏金加成'}`);
    const reserveNames = gameState.petReserve.map((pet) => `${pet.name}(${pet.rarity})`).join('、') || '无';
    addLog(`后备宠物: ${reserveNames}`);
}
function browseVillage() {
    ensureVillageState();
    addLog('<strong>你沿着石板路慢慢逛起了微风村。</strong>', 'sys');
    setButtons([
        { text: '去村口广场', action: () => visitVillageArea('square') },
        { text: '去老井边', action: () => visitVillageArea('well') },
        { text: '去磨坊前', action: () => visitVillageArea('mill') },
        { text: '去集市长棚', action: () => visitVillageArea('market') },
        { text: '去溪桥外缘', action: () => visitVillageArea('bridge') },
        { text: '返回村庄主界面', action: enterHub }
    ]);
}

function visitVillageArea(areaId) {
    const area = VILLAGE_AREAS[areaId];
    gameState.progress.currentArea = areaId;
    addLog(`=== ${area.title} ===`, 'sys');
    addLog(area.description);

    const buttons = [];
    if (areaId === 'square') {
        buttons.push({ text: '和村长聊聊', action: () => talkVillageNpc('chief') });
        if (gameState.progress.flags.bridgeMysteryStage === 2) {
            buttons.push({ text: '把带齿铁片拿给村长看', action: () => talkVillageNpc('chief') });
        }
        if (gameState.progress.flags.bridgeMysteryStage === 4) {
            buttons.push({ text: '向村长汇报桥边线索', action: () => talkVillageNpc('chief') });
        }
        buttons.push({ text: '询问巡草委托', action: () => interactWithQuestNpc('chief_patrol') });
    }
    if (areaId === 'well') {
        buttons.push({ text: '和张三聊聊', action: () => talkVillageNpc('zhangsan') });
        buttons.push({ text: '和苔婆婆说话', action: () => talkVillageNpc('granny_moss') });
        buttons.push({ text: '询问树果委托', action: () => interactWithQuestNpc('zhangsan_fruit') });
    }
    if (areaId === 'mill') {
        buttons.push({ text: '和李四聊聊', action: () => talkVillageNpc('lisi') });
        buttons.push({ text: '询问收容计划', action: () => interactWithQuestNpc('lisi_capture') });
        if (gameState.progress.flags.linxiaoChoiceResolved && !gameState.progress.flags.lisiObservationSolved) {
            buttons.push({ text: '分析异常记录', action: runLisiObservationPuzzle });
        }
    }
    if (areaId === 'market') {
        buttons.push({ text: '和阿禾闲聊', action: () => talkVillageNpc('ahe') });
        buttons.push({ text: '和曲婶闲聊', action: () => talkVillageNpc('qushen') });
        buttons.push({ text: '进入杂货铺', action: openGeneralStore });
        buttons.push({ text: '进入宠物市集', action: openPetMarket });
        if (gameState.progress.flags.linxiaoChoiceResolved && !gameState.progress.flags.marketSupplySolved) {
            buttons.push({ text: '追查异常采购', action: runMarketSupplyPuzzle });
        }
    }
    if (areaId === 'bridge') {
        buttons.push({ text: '和摆渡伯说话', action: () => talkVillageNpc('ferryman_bo') });
        buttons.push({ text: getBridgeMysteryActionText(), action: advanceBridgeMystery });
    }

    buttons.push({ text: '继续逛村子', action: browseVillage });
    buttons.push({ text: '返回村庄主界面', action: enterHub });
    setButtons(buttons);
}

function talkVillageNpc(npcId) {
    ensureVillageState();
    markCharacterSeen(NPC_TO_ENCYCLOPEDIA_ENTRY[npcId]);
    const bridgeStage = safeNumber(gameState.progress.flags.bridgeMysteryStage, 0);

    if (npcId === 'chief' && bridgeStage === 2) {
        addLog('<strong>村长</strong>接过带齿铁片，眉头一下皱紧了：“这不是桥上的旧物，倒像是森林那边某种装置上掉下来的。你再去桥边看看，把铁片和那里的痕迹仔细对一对，回来告诉我结果。”', 'dialogue');
        addLog('新的目标：回到溪桥外缘，比对铁片与桥边残留痕迹。', 'sys');
        gameState.progress.flags.bridgeMysteryStage = 3;
        setButtons([
            { text: '立刻去溪桥外缘', action: () => visitVillageArea('bridge') },
            { text: '继续逛村子', action: browseVillage },
            { text: '返回村庄主界面', action: enterHub }
        ]);
        return;
    }

    if (npcId === 'chief' && bridgeStage === 4) {
        addLog('<strong>村长</strong>听完你的比对结果后神色沉了下来：“看来那些人已经不只是在森林里活动了。这事你记一功，村子会记得。”', 'dialogue');
        gameState.progress.flags.bridgeClueConfirmed = true;
        if (!gameState.progress.flags.bridgeCharmGranted) {
            gameState.progress.flags.bridgeCharmGranted = true;
            gameState.money += 55;
            addInventoryItem('溪桥护符', 1);
            addLog('你完成了村庄支线“桥边异响”，获得 <strong>溪桥护符</strong> 与 55 风纹币。', 'heal');
        } else {
            addLog('桥边的线索已经整理完毕，这件事暂时告一段落。', 'sys');
        }
        gameState.progress.flags.bridgeMysteryStage = 5;
        updateUI();
        setButtons([
            { text: '继续逛村子', action: browseVillage },
            { text: '返回村庄主界面', action: enterHub }
        ]);
        return;
    }

    const lines = VILLAGE_DIALOGUES[npcId] || [];
    const talkIndex = gameState.progress.villageTalkIndex[npcId] || 0;
    const line = lines[Math.min(talkIndex, Math.max(0, lines.length - 1))];
    if (line) {
        addLog(line, 'dialogue');
    }
    gameState.progress.villageTalkIndex[npcId] = talkIndex + 1;

    if (npcId === 'granny_moss' && gameState.progress.flags.bridgeMysteryStage === 0) {
        addLog('你记下了“桥边有金属响”的线索。看起来这件小事值得顺手查一查。', 'sys');
        addLog('新的目标：去溪桥外缘找摆渡伯，问问夜里的金属响。', 'sys');
        gameState.progress.flags.bridgeMysteryStage = 1;
    }

    if (npcId === 'ferryman_bo' && gameState.progress.flags.bridgeMysteryStage === 1) {
        addLog('摆渡伯把那片带齿纹的铁片交给了你。冰冷的边缘上还沾着一点黑色油污。', 'sys');
        addLog('新的目标：去村口广场找村长确认这块铁片的来路。', 'sys');
        addInventoryItem('带齿铁片', 1);
        gameState.progress.flags.bridgeMysteryStage = 2;
    }

    setButtons([
        { text: '继续听他说', action: () => talkVillageNpc(npcId) },
        { text: '在附近再看看', action: () => visitVillageArea(gameState.progress.currentArea) },
        { text: '返回逛村子', action: browseVillage }
    ]);
}

function advanceBridgeMystery() {
    ensureVillageState();
    const stage = gameState.progress.flags.bridgeMysteryStage;

    if (stage === 0) {
        addLog('你在桥边站了一会儿，只听见溪水和风。也许先问问村里人会更有头绪。', 'sys');
    } else if (stage === 1) {
        addLog('桥板缝里夹着几根断草和一点黑灰，但还不足以说明什么。你想起苔婆婆提到过夜里的金属响，也许该去问问常年守在这里的摆渡伯。', 'sys');
    } else if (stage === 2) {
        addLog('你已经拿到了带齿铁片。与其在桥边瞎猜，不如先把它交给村长确认来路。', 'sys');
    } else if (stage === 3) {
        addLog('你把带齿铁片压在掌心仔细摩挲，终于确认它和森林实验室门上的铆齿纹路几乎一致。看来那股异响并不是村里旧桥自己发出来的。', 'sys');
        addLog('新的目标：回到村口广场，把比对结果告诉村长。', 'sys');
        gameState.progress.flags.bridgeMysteryStage = 4;
    } else if (stage === 4) {
        addLog('桥边的痕迹你已经确认清楚了。现在该回去向村长汇报，不需要继续在这里反复检查。', 'sys');
    } else if (stage === 5) {
        addLog('桥边重新恢复了平静。至少眼下，村子暂时还是安全的。', 'sys');
    } else {
        addLog('<strong>村长</strong>看过铁片后神色沉了下来：“看来那些人已经不只是在森林里活动了。这事你记一功，村子会记得。”', 'dialogue');
        addLog('桥边支线状态异常，请重新进入村庄界面。', 'sys');
    }

    updateUI();
    setButtons([
        { text: '继续留在桥边', action: () => visitVillageArea('bridge') },
        { text: '返回逛村子', action: browseVillage },
        { text: '回村庄主界面', action: enterHub }
    ]);
}


function openMonsterDex() {
    if (gameState.phase === 'combat') {
        addLog('战斗中暂时无法展开图鉴大全，请在回到探索或村庄后查看。', 'sys');
        return;
    }
    if (!hasEncyclopediaAccess()) {
        addLog('你还没有拿到图鉴大全。先推进第一章，在与林晓的比试结束后再来查看。', 'sys');
        return;
    }
    if (!dexModalContent || !dexModal) return;

    syncEncyclopediaDiscoveries();
    const encyclopedia = ensureEncyclopediaState();

    const renderPetEntry = (entry) => {
        const unlocked = !!encyclopedia.seenPets[entry.key];
        if (!unlocked) {
            return `
                <div class="dex-entry locked">
                    <div class="dex-entry-head">
                        <span class="dex-code">${entry.id}</span>
                        <strong>???</strong>
                    </div>
                    <div class="dex-meta-line">状态：未记录</div>
                    <div class="dex-body">尚未获得该宠物的观察资料。捕获、拥有或在战斗中遭遇后会解锁这一页。</div>
                </div>
            `;
        }
        const captureText = entry.capturable
            ? (entry.captureRequirement ? `可捕获，需要 ${entry.captureRequirement}` : '可捕获')
            : '不可捕获';
        const skillPlan = getUnitSkillEntries({ isPet: true, name: entry.key });
        const skillsHtml = skillPlan.map((skill) => `
            <div class="dex-skill-line">
                <span class="dex-skill-level">Lv.${skill.level}</span>
                <span class="dex-skill-name">${skill.skill}</span>
                <span class="dex-skill-desc">${skill.description}</span>
            </div>
        `).join('');
        return `
            <div class="dex-entry">
                <div class="dex-entry-head">
                    <span class="dex-code">${entry.id}</span>
                    <strong>${entry.key}</strong>
                    <span class="status-pill rarity rarity-${entry.rarity}">${entry.rarity}</span>
                    ${renderTypeBadges(entry.type)}
                </div>
                <div class="dex-meta-line">出没地：${entry.habitat}｜${captureText}</div>
                <div class="dex-stats">HP ${entry.stats.hp} / MP ${entry.stats.mp} / ATK ${entry.stats.atk} / SPD ${entry.stats.spd}</div>
                <div class="dex-body">${entry.note}</div>
                <div class="dex-subtitle">技能记录</div>
                ${skillsHtml}
            </div>
        `;
    };

    const renderCharacterEntry = (entry) => {
        const unlocked = !!encyclopedia.seenCharacters[entry.id];
        if (!unlocked) {
            return `
                <div class="dex-entry locked">
                    <div class="dex-entry-head">
                        <span class="dex-code">人物 ${String(entry.order).padStart(2, '0')}</span>
                        <strong>???</strong>
                    </div>
                    <div class="dex-meta-line">归类：未确认</div>
                    <div class="dex-body">${entry.unlockHint}</div>
                </div>
            `;
        }
        return `
            <div class="dex-entry">
                <div class="dex-entry-head">
                    <span class="dex-code">人物 ${String(entry.order).padStart(2, '0')}</span>
                    <strong>${entry.name}</strong>
                    <span class="status-pill level">${entry.group}</span>
                </div>
                <div class="dex-meta-line">定位：${entry.role}${entry.className ? `｜职业：${entry.className}` : ''}${entry.petName ? `｜搭档：${entry.petName}` : ''}</div>
                <div class="dex-body">${entry.description}</div>
                ${entry.className ? `
                    <div class="dex-subtitle">技能记录</div>
                    ${getUnitSkillEntries({ class: entry.className }).map((skill) => `
                        <div class="dex-skill-line">
                            <span class="dex-skill-level">Lv.${skill.level}</span>
                            <span class="dex-skill-name">${skill.skill}</span>
                            <span class="dex-skill-desc">${skill.description}</span>
                        </div>
                    `).join('')}
                ` : ''}
            </div>
        `;
    };

    const rarityHtml = ENCYCLOPEDIA_RARITY_GUIDE.map((entry) => `
        <div class="dex-rarity-line">
            <span class="status-pill rarity rarity-${entry.rarity}">${entry.rarity}</span>
            <span>${entry.description}</span>
        </div>
    `).join('');

    const typeChartOrder = ['火', '水', '草', '电', '飞行', '虫', '机械', '普通'];
    const typeChartHtml = typeChartOrder.map((typeName) => {
        const chart = TYPE_CHART[typeName];
        const strongHtml = chart.strongAgainst.length > 0
            ? chart.strongAgainst.map((targetName) => renderTypeBadges(targetName)).join('')
            : '<span class="dex-arrow-empty">无明显克制</span>';
        const weakHtml = chart.weakAgainst.length > 0
            ? chart.weakAgainst.map((targetName) => renderTypeBadges(targetName)).join('')
            : '<span class="dex-arrow-empty">无明显受阻</span>';
        return `
            <div class="dex-arrow-card">
                <div class="dex-arrow-row">
                    <div class="dex-arrow-source">${renderTypeBadges(typeName)}</div>
                    <div class="dex-arrow-symbol">→</div>
                    <div class="dex-arrow-targets">${strongHtml}</div>
                    <div class="dex-arrow-label">克制</div>
                </div>
                <div class="dex-arrow-row secondary">
                    <div class="dex-arrow-source">${renderTypeBadges(typeName)}</div>
                    <div class="dex-arrow-symbol">→</div>
                    <div class="dex-arrow-targets">${weakHtml}</div>
                    <div class="dex-arrow-label">受阻</div>
                </div>
            </div>
        `;
    }).join('');

    dexModalContent.innerHTML = `
        <div class="status-version">版本 ${getCurrentGameVersion()}</div>
        <section class="status-card neutral dex-card">
            <div class="status-card-header">
                <div>
                    <div class="status-title">图鉴大全</div>
                    <div class="status-subtitle">技能、稀有度、人物定位和遭遇记录都整合在这里。</div>
                </div>
                <span class="status-pill duo">已解锁 ${Object.keys(encyclopedia.seenPets).length + Object.keys(encyclopedia.seenCharacters).length}</span>
            </div>
            <div class="dex-section">
                <div class="dex-section-title">稀有度说明</div>
                ${rarityHtml}
            </div>
            <div class="dex-section">
                <div class="dex-section-title">属性克制图</div>
                ${typeChartHtml}
            </div>
            <div class="dex-section">
                <div class="dex-section-title">宠物图鉴</div>
                ${ENCYCLOPEDIA_PET_ENTRIES.map(renderPetEntry).join('')}
            </div>
            <div class="dex-section">
                <div class="dex-section-title">人物与敌对单位</div>
                ${ENCYCLOPEDIA_CHARACTER_ENTRIES.map(renderCharacterEntry).join('')}
            </div>
        </section>
    `;
    dexModal.style.display = 'flex';
}

function openItemMenu() {
    addLog('你翻开行囊，检查人类用品和宠物用品的余量。', 'sys');
    setButtons([
        { text: '使用人类道具', action: openHumanItemMenu },
        { text: '使用宠物道具', action: openPetItemMenu },
        { text: '返回村庄主界面', action: enterHub }
    ]);
}

function openHumanItemMenu() {
    const items = Object.keys(gameState.inventory.human).filter((itemName) => (gameState.inventory.human[itemName] || 0) > 0 && HUMAN_ITEM_DATA[itemName]);
    if (items.length === 0) {
        addLog('你手头没有可直接给主角使用的人类道具。', 'sys');
        openItemMenu();
        return;
    }

    const buttons = items.map((itemName) => ({
        text: `${itemName} x${gameState.inventory.human[itemName]}`,
        action: () => useHumanItem(itemName)
    }));
    buttons.push({ text: '返回道具菜单', action: openItemMenu });
    setButtons(buttons);
}

function openPetItemMenu() {
    const items = Object.keys(gameState.inventory.pet).filter((itemName) => (gameState.inventory.pet[itemName] || 0) > 0 && PET_ITEM_DATA[itemName]);
    if (items.length === 0) {
        addLog('你手头没有可直接给宠物使用的宠物道具。', 'sys');
        openItemMenu();
        return;
    }

    const buttons = items.map((itemName) => ({
        text: `${itemName} x${gameState.inventory.pet[itemName]}`,
        action: () => usePetItem(itemName)
    }));
    buttons.push({ text: '返回道具菜单', action: openItemMenu });
    setButtons(buttons);
}

function useHumanItem(itemName) {
    const item = HUMAN_ITEM_DATA[itemName];
    if (!item || getInventoryCount(itemName) <= 0) {
        openHumanItemMenu();
        return;
    }

    const oldHp = gameState.player.hp;
    const oldMp = gameState.player.mp;
    if (item.hp) gameState.player.hp = Math.min(gameState.player.maxHp, gameState.player.hp + item.hp);
    if (item.mp) gameState.player.mp = Math.min(gameState.player.maxMp, gameState.player.mp + item.mp);
    removeInventoryItem(itemName, 1);
    addLog(`你使用了 <strong>${itemName}</strong>。玩家状态变为 HP ${oldHp}→${gameState.player.hp}，MP ${oldMp}→${gameState.player.mp}。`, 'heal');
    updateUI();
    openHumanItemMenu();
}

function usePetItem(itemName) {
    const item = PET_ITEM_DATA[itemName];
    if (!item || !gameState.pet || getInventoryCount(itemName) <= 0) {
        openPetItemMenu();
        return;
    }

    const oldHp = gameState.pet.hp;
    const oldMp = gameState.pet.mp;
    if (item.hp) gameState.pet.hp = Math.min(gameState.pet.maxHp, gameState.pet.hp + item.hp);
    if (item.mp) gameState.pet.mp = Math.min(gameState.pet.maxMp, gameState.pet.mp + item.mp);
    removeInventoryItem(itemName, 1);
    addLog(`你把 <strong>${itemName}</strong> 喂给了 ${gameState.pet.name}。它的状态变为 HP ${oldHp}→${gameState.pet.hp}，MP ${oldMp}→${gameState.pet.mp}。`, 'heal');
    updateUI();
    openPetItemMenu();
}
function randomFromArray(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function randomWeightedEncounter(areaKey) {
    const pool = ENCOUNTER_POOLS[areaKey] || [];
    const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight <= 0) return null;
    let roll = Math.random() * totalWeight;
    for (const entry of pool) {
        roll -= entry.weight;
        if (roll <= 0) return entry.name;
    }
    return pool[pool.length - 1]?.name || null;
}

function exploreGrassland() {
    gameState.phase = 'explore';
    gameState.progress.currentArea = 'grassland';
    gameState.progress.counters.grasslandExplorations += 1;
    refreshQuestStates();
    addLog(NARRATIVE.explore.title, 'sys');
    addLog(NARRATIVE.explore.description);

    if (!gameState.progress.flags.firstBattleDone) {
        const enemyType = randomFromArray(['大牙鼠', '草跳兔', '灰羽鸦']);
        addLog(NARRATIVE.explore.encounter.replace('{{enemy}}', enemyType), 'combat');
        startCombat(enemyType, { area: 'grassland', encounterType: 'wild', storyEvent: 'firstWildBattle' });
        return;
    }

    if (!gameState.progress.flags.linxiaoMet && gameState.progress.counters.grasslandExplorations >= 3) {
        triggerLinxiaoEvent();
        return;
    }

    const roll = Math.random();
    if (roll < 0.6) {
        const enemyType = randomWeightedEncounter('grassland') || '大牙鼠';
        addLog(NARRATIVE.explore.encounter.replace('{{enemy}}', enemyType), 'combat');
        startCombat(enemyType, { area: 'grassland', encounterType: 'wild' });
        return;
    }

    if (roll < 0.85) {
        const foundItem = Math.random() < 0.7 ? '树果' : '普通球';
        addInventoryItem(foundItem, 1);
        addLog(NARRATIVE.explore.foundItem.replace('{{item}}', foundItem), 'sys');
        refreshQuestStates();
        updateUI();
        setButtons([
            { text: '继续探索草丛', action: exploreGrassland },
            { text: '返回村庄', action: enterHub }
        ]);
        return;
    }

    addLog(NARRATIVE.explore.nothing);
    setButtons([
        { text: '继续探索草丛', action: exploreGrassland },
        { text: '返回村庄', action: enterHub }
    ]);
}

function triggerLinxiaoEvent() {
    gameState.progress.flags.linxiaoMet = true;
    gameState.progress.storyStep = STORY_STEPS.LINXIAO_PENDING;
    markCharacterSeen('linxiao');
    addLog(NARRATIVE.story.linxiaoMeet, 'dialogue');
    addLog(NARRATIVE.story.linxiaoChallenge, 'dialogue');
    setButtons([
        { text: '接受比试', action: startLinxiaoBattle },
        { text: '先回村整备', action: enterHub }
    ]);
}

function startLinxiaoBattle() {
    addLog(NARRATIVE.story.linxiaoBossStart, 'combat');
    startCombat('林晓', { area: 'grassland', encounterType: 'boss', isBoss: true, storyEvent: 'linxiaoBoss' });
}

function offerLinxiaoChoice() {
    gameState.progress.storyStep = STORY_STEPS.LINXIAO_CHOICE;
    addLog(NARRATIVE.story.linxiaoOffer, 'dialogue');
    setButtons([
        { text: '邀请林晓同行', action: acceptLinxiaoPartnership },
        { text: '坚持独行', action: declineLinxiaoPartnership }
    ]);
}

function acceptLinxiaoPartnership() {
    if (!gameState.progress.flags.linxiaoJoined) {
        gameState.party = [createNpcPartyMember('林晓')];
    }
    gameState.progress.partyMode = 'duo';
    gameState.progress.flags.linxiaoChoiceResolved = true;
    gameState.progress.flags.linxiaoJoined = true;
    gameState.progress.flags.linxiaoDeclined = false;
    addLog(NARRATIVE.story.duoChoice, 'dialogue');
    addLog(NARRATIVE.story.duoPenalty, 'sys');
    beginVillageInvestigationPhase();
    updateUI();
    runAfterLogs(() => enterHub(), 140);
}

function declineLinxiaoPartnership() {
    gameState.party = [];
    gameState.progress.partyMode = 'solo';
    gameState.progress.flags.linxiaoChoiceResolved = true;
    gameState.progress.flags.linxiaoDeclined = true;
    gameState.progress.flags.linxiaoJoined = false;
    addLog(NARRATIVE.story.soloChoice, 'dialogue');
    if (!gameState.progress.flags.soloRewardGranted) {
        addInventoryItem('孤行者徽记', 1);
        gameState.money += 40;
        gameState.progress.flags.soloRewardGranted = true;
        addLog(NARRATIVE.story.soloReward, 'sys');
    }
    beginVillageInvestigationPhase();
    updateUI();
    runAfterLogs(() => enterHub(), 140);
}

function unlockForest() {
    if (!gameState.progress.mapsUnlocked.forest) {
        gameState.progress.mapsUnlocked.forest = true;
        gameState.progress.storyStep = STORY_STEPS.FOREST_UNLOCKED;
        addLog(NARRATIVE.story.forestUnlocked, 'heal');
    }
}

function exploreForest() {
    if (!gameState.progress.mapsUnlocked.forest) {
        addLog('现在还不能进入呢喃森林。', 'sys');
        enterHub();
        return;
    }

    gameState.phase = 'explore';
    gameState.progress.currentArea = 'forest';
    addLog(NARRATIVE.forest.title, 'sys');
    addLog(NARRATIVE.forest.description);

    if (!gameState.progress.flags.forestEncounterDone) {
        addLog(NARRATIVE.story.forestBattleIntro, 'combat');
        startCombat('森林蛛', { area: 'forest', encounterType: 'wild', storyEvent: 'forestFirstBattle' });
        return;
    }

    if (!gameState.progress.flags.laboratoryFound || !gameState.progress.flags.agentDefeated || !gameState.progress.flags.labDoorUnlocked || !gameState.progress.flags.innerLabSeen) {
        triggerLaboratoryEvent();
        return;
    }
    if (!gameState.progress.flags.chapter1Completed) {
        enterInnerLaboratory();
        return;
    }

    const roll = Math.random();
    if (roll < 0.55) {
        const enemyType = randomWeightedEncounter('forest') || '森叶鹿';
        addLog(NARRATIVE.forest.encounter.replace('{{enemy}}', enemyType), 'combat');
        startCombat(enemyType, { area: 'forest', encounterType: 'wild' });
        return;
    }

    if (roll < 0.8) {
        const foundItem = Math.random() < 0.5 ? '树果' : '中级球';
        addInventoryItem(foundItem, 1);
        addLog(NARRATIVE.forest.foundItem.replace('{{item}}', foundItem), 'sys');
        updateUI();
        setButtons([
            { text: '继续探索森林', action: exploreForest },
            { text: '返回村庄', action: enterHub }
        ]);
        return;
    }

    addLog(NARRATIVE.forest.nothing);
    setButtons([
        { text: '继续探索森林', action: exploreForest },
        { text: '返回村庄', action: enterHub }
    ]);
}

function triggerLaboratoryEvent() {
    if (!gameState.progress.flags.laboratoryFound) {
        gameState.progress.flags.laboratoryFound = true;
        markCharacterSeen('dreamland_agent');
        addLog(NARRATIVE.story.labDiscovery, 'sys');
    }
    if (!gameState.progress.flags.agentDefeated) {
        addLog(NARRATIVE.story.dreamlandAgent, 'dialogue');
        setButtons([
            { text: '挑战代理人', action: startProxyBattle },
            { text: '先撤回村庄', action: enterHub }
        ]);
        return;
    }
    if (!gameState.progress.flags.labDoorUnlocked) {
        startLaboratoryDoorPuzzle();
        return;
    }
    enterInnerLaboratory();
}

function startRobotBattle() {
    startInnerBossBattle();
}

function interactWithQuestNpc(questId) {
    refreshQuestStates();
    const quest = QUESTS[questId];
    const state = gameState.progress.questStates[questId];

    switch (questId) {
        case 'chief_patrol':
            addLog(NARRATIVE.village.chiefQuestOffer, 'dialogue');
            break;
        case 'zhangsan_fruit':
            addLog(NARRATIVE.village.zhangsanQuestOffer, 'dialogue');
            break;
        case 'lisi_capture':
            addLog(NARRATIVE.village.lisiQuestOffer, 'dialogue');
            break;
        default:
            break;
    }

    if (state === 'available') {
        addLog(`委托内容：${quest.description}`, 'sys');
        setButtons([
            { text: '接受委托', action: () => acceptQuest(questId) },
            { text: '暂不接取', action: enterHub }
        ]);
        return;
    }

    if (state === 'accepted') {
        addLog(`当前进度：${getQuestProgressText(questId)}`, 'sys');
        setButtons([{ text: '返回村庄事务', action: enterHub }]);
        return;
    }

    if (state === 'completed') {
        addLog(`委托已完成：${quest.title}`, 'heal');
        setButtons([
            { text: '领取报酬', action: () => claimQuestReward(questId) },
            { text: '稍后再领', action: enterHub }
        ]);
        return;
    }

    addLog('这份委托你已经处理完了。', 'sys');
    setButtons([{ text: '返回村庄事务', action: enterHub }]);
}

function acceptQuest(questId) {
    gameState.progress.questStates[questId] = 'accepted';
    addLog(`你接受了委托：<strong>${QUESTS[questId].title}</strong>。`, 'heal');
    updateUI();
    runAfterLogs(() => enterHub(), 120);
}

function getQuestProgressText(questId) {
    const counters = gameState.progress.counters;
    switch (questId) {
        case 'chief_patrol':
            return `${Math.min(counters.grasslandWins, 3)}/3 只草丛野宠已击败`;
        case 'zhangsan_fruit':
            return `${Math.min(getInventoryCount('树果'), 2)}/2 颗树果已备齐`;
        case 'lisi_capture':
            return `${Math.min(counters.capturesByRarity['普通'], 1)}/1 只普通品质宠物已捕获`;
        default:
            return '未知任务';
    }
}

function isQuestComplete(questId) {
    const counters = gameState.progress.counters;
    switch (questId) {
        case 'chief_patrol':
            return counters.grasslandWins >= 3;
        case 'zhangsan_fruit':
            return getInventoryCount('树果') >= 2;
        case 'lisi_capture':
            return counters.capturesByRarity['普通'] >= 1;
        default:
            return false;
    }
}

function refreshQuestStates() {
    Object.keys(gameState.progress.questStates).forEach((questId) => {
        if (gameState.progress.questStates[questId] === 'accepted' && isQuestComplete(questId)) {
            gameState.progress.questStates[questId] = 'completed';
        }
    });
}
function claimQuestReward(questId) {
    if (!isQuestComplete(questId)) {
        addLog('委托条件还没有完成。', 'sys');
        enterHub();
        return;
    }

    if (questId === 'zhangsan_fruit') {
        removeInventoryItem('树果', 2);
    }

    const reward = QUESTS[questId].reward;
    if (reward.money) {
        gameState.money += reward.money;
        addLog(`获得 ${reward.money} ${CURRENCY_NAME}。`, 'heal');
    }
    if (reward.items) {
        Object.keys(reward.items).forEach((itemName) => {
            addInventoryItem(itemName, reward.items[itemName]);
            addLog(`获得 ${itemName} x${reward.items[itemName]}。`, 'heal');
        });
    }
    if (reward.special) {
        Object.keys(reward.special).forEach((itemName) => {
            addInventoryItem(itemName, reward.special[itemName]);
            addLog(`获得 ${itemName} x${reward.special[itemName]}。`, 'heal');
        });
    }

    gameState.progress.questStates[questId] = 'claimed';
    switch (questId) {
        case 'chief_patrol':
            addLog(NARRATIVE.village.chiefQuestDone, 'dialogue');
            break;
        case 'zhangsan_fruit':
            addLog(NARRATIVE.village.zhangsanQuestDone, 'dialogue');
            break;
        case 'lisi_capture':
            addLog(NARRATIVE.village.lisiQuestDone, 'dialogue');
            break;
        default:
            break;
    }

    updateUI();
    runAfterLogs(() => enterHub(), 120);
}

function openGeneralStore() {
    addLog(NARRATIVE.village.storeGreeting, 'dialogue');
    const buttons = SHOP_ITEMS.map((item) => ({
        text: `${item.name} - ${item.price} ${CURRENCY_NAME}`,
        action: () => buyStoreItem(item.name)
    }));
    buttons.push({ text: '离开杂货铺', action: enterHub });
    setButtons(buttons);
}

function buyStoreItem(itemName) {
    const item = SHOP_ITEMS.find((entry) => entry.name === itemName);
    if (!item) return;
    if (gameState.money < item.price) {
        addLog(`你的${CURRENCY_NAME}不够。`, 'sys');
        openGeneralStore();
        return;
    }

    gameState.money -= item.price;
    addInventoryItem(itemName, 1);
    addLog(`你购买了 <strong>${itemName}</strong>。`, 'heal');
    updateUI();
    openGeneralStore();
}

function openPetMarket() {
    addLog(NARRATIVE.village.petMarketGreeting, 'dialogue');
    const buttons = PET_MARKET.filter((entry) => !entry.requiresForest || gameState.progress.mapsUnlocked.forest)
        .map((entry) => ({
            text: `${entry.name} - ${entry.price} ${CURRENCY_NAME}`,
            action: () => buyPetFromMarket(entry.name)
        }));
    buttons.push({ text: '离开宠物市集', action: enterHub });
    setButtons(buttons);
}

function buyPetFromMarket(petName) {
    const entry = PET_MARKET.find((item) => item.name === petName);
    if (!entry) return;
    if (gameState.money < entry.price) {
        addLog(`你的${CURRENCY_NAME}不够。`, 'sys');
        openPetMarket();
        return;
    }

    gameState.money -= entry.price;
    addPetToReserve(petName, 'market');
    addLog(`曲婶把 <strong>${petName}</strong> 的牵绳递给了你。小家伙先绕着你转了一圈，才算正式认主。`, 'heal');
    updateUI();
    openPetMarket();
}

function addPetToReserve(petName, source = 'capture') {
    const pet = createPetInstance(petName);
    pet.owner = null;
    gameState.petReserve.push(pet);
    markPetSeen(petName);
    if (source === 'capture') {
        gameState.progress.counters.capturesTotal += 1;
        gameState.progress.counters.capturesByRarity[pet.rarity] += 1;
        refreshQuestStates();
    }
    updateUI();
    return pet;
}

function openPetSwitchMenu() {
    if (gameState.petReserve.length === 0) {
        addLog('你暂时没有可以替换的后备宠物。', 'sys');
        enterHub();
        return;
    }

    addLog('你把后备宠物的名牌逐一摊开，开始考虑下一段路由谁上场。', 'sys');
    const buttons = gameState.petReserve.map((pet, index) => ({
        text: `${pet.name} (${pet.rarity})`,
        action: () => switchActivePet(index)
    }));
    buttons.push({ text: '取消更换', action: enterHub });
    setButtons(buttons);
}

function switchActivePet(index) {
    const selected = gameState.petReserve.splice(index, 1)[0];
    if (gameState.pet) {
        gameState.pet.owner = null;
        gameState.petReserve.push(gameState.pet);
    }
    selected.owner = '玩家';
    gameState.pet = selected;
    addLog(`你让 <strong>${gameState.pet.name}</strong> 站到了身边。它抖了抖身上的毛与叶片，显然早就等不及要上场了。`, 'heal');
    updateUI();
    runAfterLogs(() => enterHub(), 100);
}

function gainExp(amount, options = {}) {
    if (!gameState.player) return;

    const profile = getRewardProfile();
    const multiplier = options.multiplier !== undefined ? options.multiplier : profile.expMultiplier;
    const finalExp = Math.max(1, Math.floor(amount * multiplier));
    addLog(NARRATIVE.combat.expGain.replace('{{exp}}', finalExp), 'sys');

    gameState.player.exp += finalExp;
    checkLevelUp(gameState.player, true);

    if (gameState.pet) {
        gameState.pet.exp += finalExp;
        checkLevelUp(gameState.pet, false);
    }

    gameState.party.forEach((member) => {
        member.exp += finalExp;
        checkLevelUp(member, true);
        if (member.pet) {
            member.pet.exp += finalExp;
            checkLevelUp(member.pet, false);
        }
    });

    updateUI();
}

function checkLevelUp(unit, isPlayerUnit) {
    let expNeeded = EXP_SYSTEM.expToLevel(unit.level);
    while (unit.exp >= expNeeded) {
        unit.exp -= expNeeded;
        unit.level += 1;

        const growthTemplate = isPlayerUnit ? EXP_SYSTEM.playerGrowth[unit.class] : EXP_SYSTEM.petGrowth;
        const growth = growthTemplate || { hp: 3, mp: 2, atk: 1, spd: 1 };
        unit.maxHp = Math.max(1, safeNumber(unit.maxHp, unit.hp || growth.hp || 1));
        unit.maxMp = Math.max(0, safeNumber(unit.maxMp, unit.mp || growth.mp || 0));
        unit.hp = safeNumber(unit.hp, unit.maxHp);
        unit.mp = safeNumber(unit.mp, unit.maxMp);
        unit.atk = safeNumber(unit.atk, 0);
        unit.spd = safeNumber(unit.spd, 0);
        const missingHp = Math.max(0, unit.maxHp - unit.hp);
        const oldMaxHp = unit.maxHp;
        const oldMaxMp = unit.maxMp;

        unit.maxHp += growth.hp;
        unit.maxMp += growth.mp;
        unit.atk += growth.atk;
        unit.spd += growth.spd;

        unit.hp = Math.min(unit.maxHp, unit.hp + growth.hp + Math.ceil(missingHp / 2));
        unit.mp = unit.maxMp;

        addLog(`<strong>${unit.name}</strong> 升到了 ${unit.level} 级。`, 'heal');
        addLog(`HP上限 ${oldMaxHp} → ${unit.maxHp}，MP上限 ${oldMaxMp} → ${unit.maxMp}。升级后 MP 已回满，HP 恢复了损失值的一半。`, 'sys');
        const previousSkills = new Set(unit.skills || []);
        syncUnitSkills(unit);
        const unlockedNow = (unit.skills || []).filter((skillName) => !previousSkills.has(skillName));
        unlockedNow.forEach((skillName) => {
            addLog(`<strong>${unit.name}</strong> 领悟了新技能 <strong>${skillName}</strong>。`, 'heal');
            addLog(getSkillDescription(skillName), 'sys');
        });

        expNeeded = EXP_SYSTEM.expToLevel(unit.level);
    }
}

function getRewardProfile() {
    if (gameState.progress.partyMode === 'duo') {
        return { expMultiplier: 0.5, moneyMultiplier: 0.85 };
    }
    return { expMultiplier: 1.35, moneyMultiplier: 1.25 };
}

function mergeProgress(progress) {
    const base = createInitialProgress();
    if (!progress) return base;

    return {
        ...base,
        ...progress,
        mapsUnlocked: {
            ...base.mapsUnlocked,
            ...(progress.mapsUnlocked || {})
        },
        counters: {
            ...base.counters,
            ...(progress.counters || {}),
            capturesByRarity: {
                ...base.counters.capturesByRarity,
                ...((progress.counters && progress.counters.capturesByRarity) || {})
            }
        },
        questStates: {
            ...base.questStates,
            ...(progress.questStates || {})
        },
        encyclopedia: {
            ...base.encyclopedia,
            ...(progress.encyclopedia || {}),
            seenPets: {
                ...base.encyclopedia.seenPets,
                ...((progress.encyclopedia && progress.encyclopedia.seenPets) || {})
            },
            seenCharacters: {
                ...base.encyclopedia.seenCharacters,
                ...((progress.encyclopedia && progress.encyclopedia.seenCharacters) || {})
            }
        },
        flags: {
            ...base.flags,
            ...(progress.flags || {})
        }
    };
}

function normalizeActorRecord(unit, fallback = {}) {
    if (!unit) return null;
    const normalized = {
        ...fallback,
        ...unit
    };
    normalized.level = Math.max(1, safeNumber(normalized.level, 1));
    normalized.exp = Math.max(0, safeNumber(normalized.exp, 0));
    normalized.maxHp = Math.max(1, safeNumber(normalized.maxHp, normalized.hp ?? fallback.maxHp ?? 1));
    normalized.maxMp = Math.max(0, safeNumber(normalized.maxMp, normalized.mp ?? fallback.maxMp ?? 0));
    normalized.hp = Math.max(0, Math.min(normalized.maxHp, safeNumber(normalized.hp, normalized.maxHp)));
    normalized.mp = Math.max(0, Math.min(normalized.maxMp, safeNumber(normalized.mp, normalized.maxMp)));
    normalized.atk = Math.max(0, safeNumber(normalized.atk, fallback.atk ?? 0));
    normalized.spd = Math.max(0, safeNumber(normalized.spd, fallback.spd ?? 0));
    syncUnitSkills(normalized);
    return normalized;
}

function normalizePlayerRecord(player) {
    if (!player) return null;
    const classTemplate = CLASSES[player.class] || { hp: 1, mp: 0, atk: 0, spd: 0, skills: [] };
    return normalizeActorRecord(player, {
        id: 'player-main',
        name: '玩家',
        class: player.class,
        maxHp: classTemplate.hp,
        maxMp: classTemplate.mp,
        hp: classTemplate.hp,
        mp: classTemplate.mp,
        atk: classTemplate.atk,
        spd: classTemplate.spd,
        skills: [],
        isPlayer: true,
        isEnemy: false,
        team: 'ally'
    });
}

function normalizePetRecord(pet) {
    if (!pet) return null;
    const template = PETS[pet.name];
    const basePet = createPetInstance(pet.name);
    return normalizeActorRecord({
        ...basePet,
        ...template,
        ...pet
    }, basePet);
}

function normalizePartyMemberRecord(member) {
    if (!member) return null;
    const classTemplate = CLASSES[member.class] || { hp: 1, mp: 0, atk: 0, spd: 0, skills: [] };
    const normalizedMember = normalizeActorRecord(member, {
        id: member.id || `npc-${member.name}`,
        name: member.name,
        class: member.class,
        maxHp: classTemplate.hp,
        maxMp: classTemplate.mp,
        hp: classTemplate.hp,
        mp: classTemplate.mp,
        atk: classTemplate.atk,
        spd: classTemplate.spd,
        skills: [],
        isEnemy: false,
        team: 'ally'
    });
    normalizedMember.pet = normalizePetRecord(member.pet);
    if (normalizedMember.pet) {
        normalizedMember.pet.owner = member.name;
    }
    return normalizedMember;
}

function saveCurrentGame(options = {}) {
    if (currentSaveSlot === null) {
        addLog('错误：未选择存档位。', 'sys');
        return;
    }

    const saveData = {
        slot: currentSaveSlot,
        timestamp: new Date().toLocaleString('zh-CN'),
        player: gameState.player ? { ...gameState.player } : null,
        pet: gameState.pet ? { ...gameState.pet } : null,
        petReserve: gameState.petReserve.map((pet) => ({ ...pet })),
        party: gameState.party.map((member) => ({ ...member, pet: member.pet ? { ...member.pet } : null })),
        inventory: { ...gameState.inventory },
        money: gameState.money,
        phase: gameState.phase,
        nextPetUid: gameState.nextPetUid,
        progress: mergeProgress(gameState.progress)
    };

    localStorage.setItem(`save_slot_${currentSaveSlot}`, JSON.stringify(saveData));
    if (!options.silent) {
        addLog('游戏已保存。', 'heal');
    }
}

function loadGame(slot) {
    const saveData = localStorage.getItem(`save_slot_${slot}`);
    if (!saveData) {
        alert('存档不存在！');
        return;
    }

    const data = JSON.parse(saveData);
    currentSaveSlot = slot;
    gameState = createInitialGameState();
    gameState.player = normalizePlayerRecord(data.player);
    gameState.pet = normalizePetRecord(data.pet);
    if (gameState.pet) gameState.pet.owner = '玩家';
    gameState.petReserve = (data.petReserve || []).map((pet) => normalizePetRecord(pet));
    gameState.party = (data.party || []).map((member) => normalizePartyMemberRecord(member)).filter(Boolean);
    gameState.inventory = normalizeInventory(data.inventory);
    gameState.money = typeof data.money === 'number' ? data.money : 0;
    gameState.phase = 'hub';
    gameState.nextPetUid = safeNumber(data.nextPetUid, 1);
    gameState.progress = mergeProgress(data.progress);
    syncEncyclopediaDiscoveries();

    hideAllMenus();
    document.getElementById('game-container').style.display = 'flex';
    initDomRefs();
    resetLogSystem();
    logArea.innerHTML = '';
    addLog('=== 游戏已加载 ===', 'sys');
    addLog(`存档位 ${slot} 已载入。`, 'sys');
    refreshQuestStates();
    enterHub();
}
const MAX_SAVE_SLOTS = 10;

function deleteSave(slot, event) {
    event.stopPropagation();
    if (confirm(`确定要删除存档 ${slot} 吗？`)) {
        localStorage.removeItem(`save_slot_${slot}`);
        showLoadGameMenu();
    }
}

function getSaveData(slot) {
    const saveData = localStorage.getItem(`save_slot_${slot}`);
    return saveData ? JSON.parse(saveData) : null;
}

function showMainMenu() {
    hideAllMenus();
    document.getElementById('main-menu').style.display = 'flex';
}

function showNewGameMenu() {
    hideAllMenus();
    const menu = document.getElementById('save-slot-menu');
    const list = document.getElementById('saveSlotList');
    list.innerHTML = '';

    for (let i = 1; i <= MAX_SAVE_SLOTS; i += 1) {
        const saveData = getSaveData(i);
        const slotDiv = document.createElement('div');
        slotDiv.className = 'save-slot' + (saveData ? '' : ' empty');

        if (saveData) {
            slotDiv.innerHTML = `
                <div class="save-slot-header">
                    <span class="save-slot-title">存档 ${i}</span>
                    <span class="save-slot-time">${saveData.timestamp}</span>
                </div>
                <div class="save-slot-info">
                    ${saveData.player ? `${saveData.player.class} Lv.${saveData.player.level}` : '未开始'} |
                    ${saveData.money !== undefined ? `${saveData.money} ${CURRENCY_NAME}` : '0'} |
                    ${saveData.pet ? `${saveData.pet.name} Lv.${saveData.pet.level}` : '无主宠'}
                </div>
                <button class="delete-save-btn" onclick="deleteSave(${i}, event)">删除</button>
            `;
            slotDiv.onclick = () => {
                if (confirm(`存档 ${i} 已有数据，确定要覆盖吗？`)) {
                    startNewGame(i);
                }
            };
        } else {
            slotDiv.innerHTML = `
                <div class="save-slot-title">存档 ${i}</div>
                <div class="save-slot-info">--- 空存档 ---</div>
            `;
            slotDiv.onclick = () => startNewGame(i);
        }

        list.appendChild(slotDiv);
    }

    menu.style.display = 'flex';
}

function showLoadGameMenu() {
    hideAllMenus();
    const menu = document.getElementById('load-game-menu');
    const list = document.getElementById('loadSlotList');
    list.innerHTML = '';
    let hasAnySave = false;

    for (let i = 1; i <= MAX_SAVE_SLOTS; i += 1) {
        const saveData = getSaveData(i);
        if (!saveData) continue;

        hasAnySave = true;
        const slotDiv = document.createElement('div');
        slotDiv.className = 'save-slot';
        slotDiv.innerHTML = `
            <div class="save-slot-header">
                <span class="save-slot-title">存档 ${i}</span>
                <span class="save-slot-time">${saveData.timestamp}</span>
            </div>
            <div class="save-slot-info">
                ${saveData.player ? `${saveData.player.class} Lv.${saveData.player.level}` : '未开始'} |
                ${saveData.money !== undefined ? `${saveData.money} ${CURRENCY_NAME}` : '0'} |
                ${saveData.pet ? `${saveData.pet.name} Lv.${saveData.pet.level}` : '无主宠'}
            </div>
            <button class="delete-save-btn" onclick="deleteSave(${i}, event)">删除</button>
        `;
        slotDiv.onclick = () => loadGame(i);
        list.appendChild(slotDiv);
    }

    if (!hasAnySave) {
        list.innerHTML = '<div class="save-slot empty"><div class="save-slot-info">暂无存档</div></div>';
    }

    menu.style.display = 'flex';
}

function showAbout() {
    hideAllMenus();
    renderAboutContent();
    document.getElementById('about-menu').style.display = 'flex';
}

function hideAllMenus() {
    closeDexModal();
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('save-slot-menu').style.display = 'none';
    document.getElementById('load-game-menu').style.display = 'none';
    document.getElementById('about-menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'none';
}

function startNewGame(slot) {
    currentSaveSlot = slot;
    gameState = createInitialGameState();
    hideAllMenus();
    document.getElementById('game-container').style.display = 'flex';
    initEngine();
}

function syncVersionLabels() {
    const menuVersion = document.getElementById('gameVersionLabel');
    const aboutVersion = document.getElementById('aboutVersionLabel');
    const toolbarVersion = document.getElementById('toolbarVersionLabel');
    if (menuVersion) menuVersion.textContent = `Version ${getCurrentGameVersion()}`;
    if (aboutVersion) aboutVersion.textContent = `版本: ${getCurrentGameVersion()}`;
    if (toolbarVersion) toolbarVersion.textContent = `控制台 ${getCurrentGameVersion()}`;
}

function renderAboutContent() {
    const aboutContent = document.getElementById('aboutContent');
    if (!aboutContent) return;

    const agesHtml = (WORLD_LORE.ages || []).map((age) => `
        <div class="about-lore-item">
            <div class="about-lore-title">${age.name}</div>
            <div class="about-lore-text">${age.description}</div>
        </div>
    `).join('');

    const factionsHtml = (WORLD_LORE.factions || []).map((faction) => `
        <div class="about-faction-card">
            <div class="about-faction-head">
                <strong>${faction.name}</strong>
                <span>${faction.alias}</span>
            </div>
            <div class="about-lore-text">${faction.description}</div>
            <div class="about-faction-belief">理念：${faction.belief}</div>
            <div class="about-faction-hidden">${faction.hidden}</div>
        </div>
    `).join('');

    const historyHtml = VERSION_HISTORY.map((entry) => `
        <div class="about-changelog-item">
            <div class="about-changelog-head">
                <span class="about-changelog-version">v${entry.version}</span>
                <span class="about-changelog-date">${entry.date}</span>
            </div>
            <div class="about-changelog-summary">${entry.summary}</div>
        </div>
    `).join('');

    aboutContent.innerHTML = `
        <p><strong>A Rustling Grass</strong></p>
        <p>一款发生在 ${WORLD_LORE.worldName} 的文字冒险 RPG 游戏</p>
        <p>${WORLD_LORE.windMark.title} 不是风，而是世界呼吸留下的痕迹。玩家从微风村出发，在第一章中接触风纹失衡的最初征兆。</p>
        <p id="aboutVersionLabel" style="margin-top: 20px;">版本: ${getCurrentGameVersion()}</p>
        <div class="about-lore-block">
            <h3>${WORLD_LORE.windMark.title}</h3>
            <div class="about-lore-quote">${WORLD_LORE.windMark.subtitle}</div>
            <div class="about-lore-text">${WORLD_LORE.windMark.description}</div>
        </div>
        <div class="about-lore-block">
            <h3>${WORLD_LORE.legend.title}</h3>
            <div class="about-lore-text">${WORLD_LORE.legend.description}</div>
        </div>
        <div class="about-lore-block">
            <h3>三个时代</h3>
            ${agesHtml}
        </div>
        <div class="about-lore-block">
            <h3>三大势力</h3>
            ${factionsHtml}
        </div>
        <div class="about-lore-block">
            <h3>当前可玩范围</h3>
            <div class="about-lore-text">${WORLD_LORE.currentScope}</div>
        </div>
        <div class="about-changelog">
            <h3>更新日志</h3>
            ${historyHtml}
        </div>
    `;
}

function initDomRefs() {
    logArea = document.getElementById('logArea');
    buttonsArea = document.getElementById('buttonsArea');
    teamInfo = document.getElementById('teamInfo');
    actionHelpArea = document.getElementById('actionHelp');
    uiModeToggleButton = document.getElementById('uiModeToggleButton');
    dexModal = document.getElementById('dexModal');
    dexModalContent = document.getElementById('dexModalContent');
    syncVersionLabels();
    renderAboutContent();
    applyUiMode(loadUiModePreference());
    setActionHelp();
}

function initEngine() {
    initDomRefs();
    resetLogSystem();
    if (logArea) logArea.innerHTML = '';
    if (!logArea || !buttonsArea || !teamInfo) {
        console.error('Failed to initialize game UI');
        return;
    }
    logArea.innerHTML = '';
    startGame();
}

function completeChapterOne() {
    gameState.progress.storyStep = STORY_STEPS.CHAPTER_ONE_COMPLETE;
    gameState.progress.flags.chapter1Completed = true;
    addLog(NARRATIVE.story.chapterComplete, 'heal');
    addLog(NARRATIVE.story.nextChapterLocked, 'sys');
    updateUI();
    setButtons([
        { text: '返回村庄', action: enterHub },
        { text: '保存游戏', action: saveCurrentGame, className: 'save-game-btn' }
    ]);
}

function handleStoryCombatVictory(context) {
    if (!context || !context.storyEvent) {
        if (context && context.area === 'forest') {
            setButtons([
                { text: '继续探索森林', action: exploreForest },
                { text: '返回村庄', action: enterHub }
            ]);
        } else {
            setButtons([
                { text: '继续探索草丛', action: exploreGrassland },
                { text: '返回村庄', action: enterHub }
            ]);
        }
        return;
    }

    switch (context.storyEvent) {
        case 'firstWildBattle':
            gameState.progress.flags.firstBattleDone = true;
            addLog(NARRATIVE.story.firstBattleVictory, 'sys');
            setButtons([
                { text: '继续探索草丛', action: exploreGrassland },
                { text: '返回村庄', action: enterHub }
            ]);
            break;
        case 'linxiaoBoss':
            gameState.progress.flags.linxiaoDefeated = true;
            markCharacterSeen('linxiao');
            if (grantEncyclopedia()) {
                addLog('<strong>林晓</strong>把一本边角磨旧的册子抛给了你：“这是我和李四一起整理的图鉴底本。你之后见过的宠物、人物和敌人，都会慢慢被记进去。”', 'dialogue');
                addLog('你获得了 <strong>图鉴大全</strong>。已遭遇过的对象会立刻补登记，之后的新遭遇也会继续写入。', 'heal');
            }
            addLog(NARRATIVE.story.linxiaoDefeat, 'dialogue');
            addLog(NARRATIVE.story.linxiaoOffer, 'dialogue');
            offerLinxiaoChoice();
            break;
        case 'proxyBoss':
            gameState.progress.flags.agentDefeated = true;
            markCharacterSeen('dreamland_agent');
            markPetSeen('棱镜机偶');
            if (getInventoryCount('实验门卡') === 0) {
                addInventoryItem('实验门卡', 1);
            }
            addLog(NARRATIVE.story.agentDefeat, 'dialogue');
            setButtons([
                { text: '检查实验室门禁', action: startLaboratoryDoorPuzzle },
                { text: '先返回村庄', action: enterHub }
            ]);
            break;
        case 'forestFirstBattle':
            gameState.progress.flags.forestEncounterDone = true;
            gameState.progress.storyStep = STORY_STEPS.FOREST_CLEARED;
            addLog(NARRATIVE.story.forestBattleVictory, 'sys');
            setButtons([
                { text: '调查金属门', action: triggerLaboratoryEvent },
                { text: '返回村庄', action: enterHub }
            ]);
            break;
        case 'innerBoss':
            addInventoryItem('星光碎片', 1);
            markCharacterSeen('inner_aberration');
            addLog(NARRATIVE.story.innerBossDefeat, 'sys');
            completeChapterOne();
            break;
        default:
            setButtons([{ text: '返回村庄', action: enterHub }]);
            break;
    }

    refreshQuestStates();
    updateUI();
}

function handleStoryCombatDefeat(context) {
    if (context && context.storyEvent === 'linxiaoBoss') {
        addLog('林晓收起弓，拍了拍你的肩：“没关系，下次再打。真要一起走，总得先把脚步站稳。”', 'dialogue');
    }
    runAfterLogs(() => enterHub(), 180);
}

window.addEventListener('DOMContentLoaded', () => {
    syncVersionLabels();
    renderAboutContent();
    showMainMenu();
});













// ========== 游戏状态机引擎 ==========

let logArea;
let buttonsArea;
let teamInfo;
let currentSaveSlot = null;

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
    if (itemName === '树果') return 'pet';
    if (['带齿铁片', '溪桥护符', '孤行者徽记', '星光碎片', '怪兽图鉴'].includes(itemName)) return 'special';
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

function addLog(text, type = 'normal') {
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

function setButtons(buttonsData) {
    buttonsArea.innerHTML = '';
    buttonsData.forEach((btn) => {
        const button = document.createElement('button');
        button.innerText = btn.text;
        button.onclick = btn.action;
        if (btn.disabled) button.disabled = true;
        if (btn.className) button.className = btn.className;
        buttonsArea.appendChild(button);
    });
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
    let html = '';

    if (gameState.player) {
        const expNeeded = EXP_SYSTEM.expToLevel(gameState.player.level);
        html += `<div class="stat-item"><strong>玩家 - ${gameState.player.class}</strong></div>`;
        html += `<div class="stat-item"><strong>HP:</strong> ${gameState.player.hp}/${gameState.player.maxHp}</div>`;
        html += `<div class="stat-item"><strong>MP:</strong> ${gameState.player.mp}/${gameState.player.maxMp}</div>`;
        html += `<div class="stat-item"><strong>ATK:</strong> ${gameState.player.atk} | <strong>SPD:</strong> ${gameState.player.spd}</div>`;
        html += `<div class="stat-item"><strong>EXP:</strong> ${gameState.player.exp}/${expNeeded}</div>`;
    }

    if (gameState.pet) {
        const expNeeded = EXP_SYSTEM.expToLevel(gameState.pet.level);
        html += `<div class="stat-item" style="margin-top:10px;"><strong>主宠:</strong> ${gameState.pet.name} (${gameState.pet.type} / ${gameState.pet.rarity})</div>`;
        html += `<div class="stat-item"><strong>HP:</strong> ${gameState.pet.hp}/${gameState.pet.maxHp}</div>`;
        html += `<div class="stat-item"><strong>MP:</strong> ${gameState.pet.mp}/${gameState.pet.maxMp}</div>`;
        html += `<div class="stat-item"><strong>ATK:</strong> ${gameState.pet.atk} | <strong>SPD:</strong> ${gameState.pet.spd}</div>`;
        html += `<div class="stat-item"><strong>EXP:</strong> ${gameState.pet.exp}/${expNeeded}</div>`;
    }

    html += `<div style="margin-top:12px;"><strong>队伍模式:</strong> ${progress.partyMode === 'duo' ? '双人同行' : '单人独行'}</div>`;
    if (gameState.party.length > 0) {
        html += '<div style="margin-top:10px;"><strong>同行成员:</strong></div>';
        gameState.party.forEach((member) => {
            const memberExpNeeded = EXP_SYSTEM.expToLevel(member.level);
            html += `<div class="stat-item">• ${member.name} (${member.class}) HP ${member.hp}/${member.maxHp} | MP ${member.mp}/${member.maxMp} | EXP ${member.exp}/${memberExpNeeded}</div>`;
            if (member.pet) {
                const memberPetExpNeeded = EXP_SYSTEM.expToLevel(member.pet.level);
                html += `<div class="stat-item">  ↳ ${member.pet.name} (${member.pet.rarity}) HP ${member.pet.hp}/${member.pet.maxHp} | MP ${member.pet.mp}/${member.pet.maxMp} | EXP ${member.pet.exp}/${memberPetExpNeeded}</div>`;
            }
        });
    }

    html += `<div style="margin-top:12px;"><strong>${CURRENCY_NAME}:</strong> ${gameState.money}</div>`;
    html += '<div style="margin-top:10px;"><strong>人类道具:</strong></div>';
    const humanItems = Object.keys(gameState.inventory.human).filter((item) => gameState.inventory.human[item] > 0);
    html += humanItems.length === 0 ? '<div class="stat-item">• 暂无</div>' : humanItems.map((item) => `<div class="stat-item">• ${item} x${gameState.inventory.human[item]}</div>`).join('');
    html += '<div style="margin-top:10px;"><strong>宠物道具:</strong></div>';
    const petItems = Object.keys(gameState.inventory.pet).filter((item) => gameState.inventory.pet[item] > 0);
    html += petItems.length === 0 ? '<div class="stat-item">• 暂无</div>' : petItems.map((item) => `<div class="stat-item">• ${item} x${gameState.inventory.pet[item]}</div>`).join('');
    html += '<div style="margin-top:10px;"><strong>特殊物品:</strong></div>';
    const specialItems = Object.keys(gameState.inventory.special).filter((item) => gameState.inventory.special[item] > 0);
    html += specialItems.length === 0 ? '<div class="stat-item">• 暂无</div>' : specialItems.map((item) => `<div class="stat-item">• ${item} x${gameState.inventory.special[item]}</div>`).join('');

    html += '<div style="margin-top:10px;"><strong>后备宠物:</strong></div>';
    if (gameState.petReserve.length === 0) {
        html += '<div class="stat-item">• 暂无</div>';
    } else {
        gameState.petReserve.forEach((pet, index) => {
            html += `<div class="stat-item">• ${index + 1}. ${pet.name} (${pet.rarity}) Lv.${pet.level}</div>`;
        });
    }

    html += '<div style="margin-top:10px;"><strong>任务:</strong></div>';
    const activeQuests = Object.keys(progress.questStates).filter((questId) => ['accepted', 'completed'].includes(progress.questStates[questId]));
    if (activeQuests.length === 0) {
        html += '<div class="stat-item">• 当前没有进行中的委托</div>';
    } else {
        activeQuests.forEach((questId) => {
            html += `<div class="stat-item">• ${QUESTS[questId].title} - ${getQuestProgressText(questId)}</div>`;
        });
    }

    html += '<div style="margin-top:10px;"><strong>进度:</strong></div>';
    html += `<div class="stat-item">章节: 第${progress.chapter}章</div>`;
    html += `<div class="stat-item">阶段: ${progress.storyStep}</div>`;
    html += `<div class="stat-item">草丛探索: ${progress.counters.grasslandExplorations} 次</div>`;
    html += `<div class="stat-item">已捕获宠物: ${progress.counters.capturesTotal} 只</div>`;

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
        skills: [...stats.skills],
        level: 1,
        exp: 0,
        isPlayer: true,
        isEnemy: false,
        team: 'ally'
    };
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
    setTimeout(enterHub, 400);
}

function createPetInstance(petName) {
    const template = PETS[petName];
    const uid = `pet-${gameState.nextPetUid}`;
    gameState.nextPetUid += 1;
    return {
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
        skills: [...template.skills],
        level: 1,
        exp: 0,
        isPet: true,
        isEnemy: false,
        owner: null,
        team: 'ally'
    };
}

function createNpcPartyMember(name) {
    const template = NPC_CHARACTERS[name];
    return {
        id: `npc-${name}`,
        name,
        class: template.class,
        hp: template.hp,
        maxHp: template.hp,
        mp: template.mp,
        maxMp: template.mp,
        atk: template.atk,
        spd: template.spd,
        skills: [...template.skills],
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

    if (gameState.player && gameState.pet) {
        buttons.push({ text: '浏览村庄', action: browseVillage });
        buttons.push({ text: '探索回声草丛', action: exploreGrassland });
        if (gameState.progress.mapsUnlocked.forest) {
            buttons.push({ text: '进入呢喃森林', action: exploreForest });
        }
        buttons.push({ text: '杂货铺', action: openGeneralStore });
        buttons.push({ text: '宠物市集', action: openPetMarket });
        buttons.push({ text: '使用道具', action: openItemMenu });
        buttons.push({ text: '更换主宠', action: openPetSwitchMenu, disabled: gameState.petReserve.length === 0 });
        if (getInventoryCount('怪兽图鉴') > 0) {
            buttons.push({ text: '查看图鉴', action: openMonsterDex });
        }
    }

    if (flags.linxiaoDefeated && !flags.linxiaoChoiceResolved) {
        buttons.unshift({ text: '回应林晓', action: offerLinxiaoChoice });
    }

    buttons.push({ text: '休息（恢复HP/MP）', action: rest });
    buttons.push({ text: '查看状态', action: viewStatus });
    buttons.push({ text: '保存游戏', action: saveCurrentGame, className: 'save-game-btn' });
    return buttons;
}

function rest() {
    addLog(NARRATIVE.hub.restMessage, 'sys');
    healRosterToFull();
    addLog(NARRATIVE.hub.healedMessage, 'heal');
    updateUI();
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
        addLog(`玩家 ${gameState.player.class} | HP ${gameState.player.hp}/${gameState.player.maxHp} | MP ${gameState.player.mp}/${gameState.player.maxMp} | ATK ${gameState.player.atk} | SPD ${gameState.player.spd}`);
    }
    if (gameState.pet) {
        addLog(`主宠 ${gameState.pet.name} (${gameState.pet.rarity}) | HP ${gameState.pet.hp}/${gameState.pet.maxHp} | MP ${gameState.pet.mp}/${gameState.pet.maxMp}`);
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
    }
    if (areaId === 'market') {
        buttons.push({ text: '和阿禾闲聊', action: () => talkVillageNpc('ahe') });
        buttons.push({ text: '和曲婶闲聊', action: () => talkVillageNpc('qushen') });
        buttons.push({ text: '进入杂货铺', action: openGeneralStore });
        buttons.push({ text: '进入宠物市集', action: openPetMarket });
    }
    if (areaId === 'bridge') {
        buttons.push({ text: '和摆渡伯说话', action: () => talkVillageNpc('ferryman_bo') });
        buttons.push({ text: '查看桥边异样', action: advanceBridgeMystery });
    }

    buttons.push({ text: '继续逛村子', action: browseVillage });
    buttons.push({ text: '返回村庄主界面', action: enterHub });
    setButtons(buttons);
}

function talkVillageNpc(npcId) {
    ensureVillageState();
    const lines = VILLAGE_DIALOGUES[npcId] || [];
    const talkIndex = gameState.progress.villageTalkIndex[npcId] || 0;
    const line = lines[Math.min(talkIndex, Math.max(0, lines.length - 1))];
    if (line) {
        addLog(line, 'dialogue');
    }
    gameState.progress.villageTalkIndex[npcId] = talkIndex + 1;

    if (npcId === 'granny_moss' && gameState.progress.flags.bridgeMysteryStage === 0) {
        addLog('你记下了“桥边有金属响”的线索。看起来这件小事值得顺手查一查。', 'sys');
        gameState.progress.flags.bridgeMysteryStage = 1;
    }

    if (npcId === 'ferryman_bo' && gameState.progress.flags.bridgeMysteryStage === 1) {
        addLog('摆渡伯把那片带齿纹的铁片交给了你。冰冷的边缘上还沾着一点黑色油污。', 'sys');
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
        addLog('桥板缝里夹着几根断草和一点黑灰，但还不足以说明什么。你想起苔婆婆提到过夜里的金属响。', 'sys');
    } else if (stage === 2) {
        addLog('你把带齿铁片压在掌心仔细摩挲，终于确认它和森林实验室门上的铆齿纹路几乎一致。看来那股异响并不是村里旧桥自己发出来的。', 'sys');
        gameState.progress.flags.bridgeMysteryStage = 3;
    } else if (stage === 3) {
        addLog('<strong>村长</strong>看过铁片后神色沉了下来：“看来那些人已经不只是在森林里活动了。这事你记一功，村子会记得。”', 'dialogue');
        if (!gameState.progress.flags.bridgeCharmGranted) {
            gameState.progress.flags.bridgeCharmGranted = true;
            gameState.money += 55;
            addInventoryItem('溪桥护符', 1);
            addLog('你完成了村庄支线“桥边异响”，获得 <strong>溪桥护符</strong> 与 55 风纹币。', 'heal');
        } else {
            addLog('桥边的线索已经整理完毕，这件事暂时告一段落。', 'sys');
        }
        gameState.progress.flags.bridgeMysteryStage = 4;
    } else {
        addLog('桥边重新恢复了平静。至少眼下，村子暂时还是安全的。', 'sys');
    }

    updateUI();
    setButtons([
        { text: '继续留在桥边', action: () => visitVillageArea('bridge') },
        { text: '返回逛村子', action: browseVillage },
        { text: '回村庄主界面', action: enterHub }
    ]);
}


function openMonsterDex() {
    addLog('=== 怪兽图鉴 ===', 'sys');
    Object.keys(MONSTER_DEX).forEach((name) => {
        const entry = MONSTER_DEX[name];
        addLog(`<strong>${entry.id} ${name}</strong> | 稀有度: ${entry.rarity} | 属性: ${entry.type}`, 'sys');
        addLog(`能力: HP ${entry.stats.hp} / MP ${entry.stats.mp} / ATK ${entry.stats.atk} / SPD ${entry.stats.spd}`, 'sys');
        addLog(`技能: ${entry.skills.join('、')}`, 'sys');
        addLog(`出没地: ${entry.habitat} | ${entry.capturable ? '可捕获' : '不可捕获'} | ${entry.note}`, 'dialogue');
    });
    setButtons([
        { text: '返回村庄主界面', action: enterHub },
        { text: '查看状态', action: viewStatus }
    ]);
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

function exploreGrassland() {
    gameState.phase = 'explore';
    gameState.progress.currentArea = 'grassland';
    gameState.progress.counters.grasslandExplorations += 1;
    refreshQuestStates();
    addLog(NARRATIVE.explore.title, 'sys');
    addLog(NARRATIVE.explore.description);

    if (!gameState.progress.flags.firstBattleDone) {
        const enemyType = randomFromArray(['大牙鼠', '咕咕鸟']);
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
        const enemyType = Math.random() < 0.7 ? '大牙鼠' : '咕咕鸟';
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
    unlockForest();
    updateUI();
    setTimeout(enterHub, 500);
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
    unlockForest();
    updateUI();
    setTimeout(enterHub, 500);
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
        startCombat('长角虫', { area: 'forest', encounterType: 'wild', storyEvent: 'forestFirstBattle' });
        return;
    }

    if (!gameState.progress.flags.laboratoryFound) {
        triggerLaboratoryEvent();
        return;
    }

    if (!gameState.progress.flags.chapter1Completed) {
        startRobotBattle();
        return;
    }

    const roll = Math.random();
    if (roll < 0.55) {
        const enemyType = Math.random() < 0.75 ? '长角虫' : '电气菇';
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
    gameState.progress.flags.laboratoryFound = true;
    addLog(NARRATIVE.story.labDiscovery, 'sys');
    addLog(NARRATIVE.story.dreamlandAgent, 'dialogue');
    setButtons([
        { text: '深入实验室', action: startRobotBattle },
        { text: '先撤回村庄', action: enterHub }
    ]);
}

function startRobotBattle() {
    startCombat('实验机器人', { area: 'forest', encounterType: 'enemy', storyEvent: 'robotBattle' });
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
    setTimeout(enterHub, 350);
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
    setTimeout(enterHub, 350);
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
    setTimeout(enterHub, 300);
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

        const growth = isPlayerUnit ? EXP_SYSTEM.playerGrowth[unit.class] : EXP_SYSTEM.petGrowth;
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
        flags: {
            ...base.flags,
            ...(progress.flags || {})
        }
    };
}

function normalizePetRecord(pet) {
    if (!pet) return null;
    const template = PETS[pet.name];
    return {
        ...createPetInstance(pet.name),
        ...template,
        ...pet,
        skills: pet.skills ? [...pet.skills] : [...template.skills]
    };
}

function saveCurrentGame() {
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
    addLog('游戏已保存。', 'heal');
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
    gameState.player = data.player || null;
    gameState.pet = normalizePetRecord(data.pet);
    if (gameState.pet) gameState.pet.owner = '玩家';
    gameState.petReserve = (data.petReserve || []).map((pet) => normalizePetRecord(pet));
    gameState.party = (data.party || []).map((member) => ({
        ...member,
        pet: normalizePetRecord(member.pet)
    }));
    gameState.inventory = normalizeInventory(data.inventory);
    gameState.money = typeof data.money === 'number' ? data.money : 0;
    gameState.phase = 'hub';
    gameState.nextPetUid = data.nextPetUid || 1;
    gameState.progress = mergeProgress(data.progress);

    hideAllMenus();
    document.getElementById('game-container').style.display = 'flex';
    initDomRefs();
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
    document.getElementById('about-menu').style.display = 'flex';
}

function hideAllMenus() {
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

function initDomRefs() {
    logArea = document.getElementById('logArea');
    buttonsArea = document.getElementById('buttonsArea');
    teamInfo = document.getElementById('teamInfo');
}

function initEngine() {
    initDomRefs();
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
            addLog(NARRATIVE.story.linxiaoDefeat, 'dialogue');
            addLog(NARRATIVE.story.linxiaoOffer, 'dialogue');
            offerLinxiaoChoice();
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
        case 'robotBattle':
            addInventoryItem('星光碎片', 1);
            addLog(NARRATIVE.story.robotDefeat, 'sys');
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
    setTimeout(enterHub, 700);
}

window.addEventListener('DOMContentLoaded', () => {
    showMainMenu();
});













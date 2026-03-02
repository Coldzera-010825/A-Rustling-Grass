// ========== 战斗系统 ==========

function createEnemyUnit(encounterId, options = {}) {
    if (options.isBoss && encounterId === '林晓') {
        const linxiaoData = NPC_CHARACTERS['林晓'];
        const linxiaoPetData = PETS[linxiaoData.pet];
        return [
            {
                id: 'enemy-linxiao',
                name: '林晓',
                class: linxiaoData.class,
                hp: linxiaoData.hp,
                maxHp: linxiaoData.hp,
                mp: linxiaoData.mp,
                maxMp: linxiaoData.mp,
                atk: linxiaoData.atk,
                spd: linxiaoData.spd,
                skills: [...linxiaoData.skills],
                isEnemy: true,
                team: 'enemy'
            },
            {
                id: 'enemy-linxiao-pet',
                name: linxiaoData.pet,
                type: linxiaoPetData.type,
                rarity: linxiaoPetData.rarity,
                hp: linxiaoPetData.hp,
                maxHp: linxiaoPetData.hp,
                mp: linxiaoPetData.mp,
                maxMp: linxiaoPetData.mp,
                atk: linxiaoPetData.atk,
                spd: linxiaoPetData.spd,
                skills: [...linxiaoPetData.skills],
                isEnemy: true,
                isPet: true,
                owner: '林晓',
                team: 'enemy'
            }
        ];
    }

    const enemyData = ENEMIES[encounterId] || PETS[encounterId];
    if (!enemyData) {
        throw new Error(`Unknown enemy: ${encounterId}`);
    }

    return [{
        id: `enemy-${encounterId}`,
        name: encounterId,
        type: enemyData.type,
        rarity: enemyData.rarity,
        hp: enemyData.hp,
        maxHp: enemyData.hp,
        mp: enemyData.mp,
        maxMp: enemyData.mp,
        atk: enemyData.atk,
        spd: enemyData.spd,
        skills: [...enemyData.skills],
        isEnemy: true,
        isPet: !!PETS[encounterId],
        captureable: enemyData.captureable !== false && !!PETS[encounterId],
        team: 'enemy'
    }];
}

function buildCombatAllies() {
    const allies = [];

    if (gameState.player) {
        allies.push({ ...gameState.player, id: 'ally-player', isEnemy: false, team: 'ally' });
    }
    if (gameState.pet) {
        allies.push({ ...gameState.pet, id: 'ally-main-pet', isEnemy: false, team: 'ally', owner: '玩家', isPet: true });
    }

    gameState.party.forEach((member, index) => {
        allies.push({
            ...member,
            id: `ally-member-${index}`,
            isEnemy: false,
            team: 'ally'
        });
        if (member.pet) {
            allies.push({
                ...member.pet,
                id: `ally-member-${index}-pet`,
                isEnemy: false,
                team: 'ally',
                owner: member.name,
                isPet: true
            });
        }
    });

    return allies;
}

function updateCombatUI() {
    const cs = gameState.combatState;
    let html = '<h4>战斗中</h4>';

    const renderUnit = (unit, isActive) => {
        const hpPercent = Math.max(0, (unit.hp / Math.max(1, unit.maxHp)) * 100);
        const mpPercent = Math.max(0, (unit.mp / Math.max(1, unit.maxMp)) * 100);
        return `
            <div class="combat-unit ${isActive ? 'active' : ''}">
                <strong>${unit.name}</strong> (${unit.type || unit.class || '单位'})
                <div class="hp-bar-container"><div class="hp-bar-fill" style="width:${hpPercent}%"></div><div class="hp-bar-text">HP ${unit.hp}/${unit.maxHp}</div></div>
                <div class="mp-bar-container"><div class="mp-bar-fill" style="width:${mpPercent}%"></div><div class="hp-bar-text">MP ${unit.mp}/${unit.maxMp}</div></div>
                <div style="font-size:11px;">ATK:${unit.atk} SPD:${unit.spd}</div>
            </div>
        `;
    };

    html += '<div class="stat-item"><strong>我方:</strong></div>';
    cs.allies.forEach((unit) => {
        html += renderUnit(unit, cs.currentUnit && cs.currentUnit.id === unit.id);
    });

    html += '<div class="stat-item" style="margin-top:10px;"><strong>敌方:</strong></div>';
    cs.enemies.forEach((unit) => {
        html += renderUnit(unit, cs.currentUnit && cs.currentUnit.id === unit.id);
    });

    if (cs.context.captureAllowed) {
        const enemy = cs.enemies.find((unit) => unit.hp > 0);
        if (enemy) {
            html += `<div class="stat-item" style="margin-top:8px;"><strong>捕获目标:</strong> ${enemy.name} (${enemy.rarity})</div>`;
        }
    }

    teamInfo.innerHTML = html;
}

function startCombat(encounterId, options = {}) {
    gameState.phase = 'combat';

    const allies = buildCombatAllies();
    const enemies = createEnemyUnit(encounterId, options);
    gameState.combatState = {
        allies,
        enemies,
        turnOrder: [],
        currentTurnIndex: 0,
        currentUnit: null,
        allyLightActive: false,
        allyLightConsumed: false,
        context: {
            encounterId,
            area: options.area || 'grassland',
            encounterType: options.encounterType || 'wild',
            isBoss: !!options.isBoss,
            storyEvent: options.storyEvent || null,
            captureAllowed: options.encounterType === 'wild' && !options.isBoss && !!PETS[encounterId]
        }
    };

    calculateTurnOrder();
    addLog(NARRATIVE.combat.start, 'combat');
    addLog(`${NARRATIVE.combat.turnOrderPrefix}${gameState.combatState.turnOrder.map((unit) => unit.name).join(' → ')}`, 'sys');
    updateUI();
    executeTurn();
}

function calculateTurnOrder() {
    const cs = gameState.combatState;
    const aliveUnits = [...cs.allies, ...cs.enemies].filter((unit) => unit.hp > 0);
    aliveUnits.sort((a, b) => {
        if (b.spd !== a.spd) return b.spd - a.spd;
        if (a.isEnemy !== b.isEnemy) return a.isEnemy ? 1 : -1;
        return a.name.localeCompare(b.name, 'zh-CN');
    });
    cs.turnOrder = aliveUnits;
    if (cs.currentTurnIndex >= cs.turnOrder.length) {
        cs.currentTurnIndex = 0;
    }
}

function executeTurn() {
    const cs = gameState.combatState;
    if (!cs) return;
    if (cs.turnOrder.length === 0) {
        calculateTurnOrder();
    }

    const unit = cs.turnOrder[cs.currentTurnIndex];
    if (!unit || unit.hp <= 0) {
        nextTurn();
        return;
    }

    cs.currentUnit = unit;
    updateUI();
    addLog(NARRATIVE.combat.turnPrefix.replace('{{name}}', unit.name), 'combat');

    if (unit.isEnemy) {
        setTimeout(() => enemyAI(unit), 450);
        return;
    }

    showCombatOptions(unit);
}

function showCombatOptions(unit) {
    const buttons = [{ text: `普通攻击`, action: () => useBasicAttack(unit), className: 'skill-button' }];

    unit.skills.forEach((skillName) => {
        const skill = SKILL_DATA[skillName];
        const costLabel = skill.mpCost > 0 ? ` [MP ${skill.mpCost}]` : '';
        buttons.push({
            text: `${skillName}${costLabel}`,
            action: () => useSkill(unit, skillName),
            className: 'skill-button',
            disabled: unit.mp < skill.mpCost
        });
    });

    if (canAttemptCapture()) {
        buttons.push({ text: '投掷精灵球', action: () => openCaptureMenu(unit) });
    }

    buttons.push({ text: '返回村庄', action: fleeToVillage });
    setButtons(buttons);
}

function canAttemptCapture() {
    const cs = gameState.combatState;
    if (!cs || !cs.context.captureAllowed) return false;
    return cs.enemies.some((enemy) => enemy.hp > 0 && enemy.captureable);
}

function useBasicAttack(attacker) {
    const cs = gameState.combatState;
    if (!cs || !cs.currentUnit || cs.currentUnit.id !== attacker.id) return;
    const targets = attacker.isEnemy ? cs.allies.filter((unit) => unit.hp > 0) : cs.enemies.filter((unit) => unit.hp > 0);
    const target = chooseTarget(targets, { damage: attacker.atk }, attacker);
    const damage = Math.max(1, Math.floor(attacker.atk * 0.75));
    addLog(`<strong>${attacker.name}</strong> 发动了普通攻击。`, 'combat');
    target.hp = Math.max(0, target.hp - damage);
    addLog(`→ <strong>${target.name}</strong> 受到 ${damage} 点伤害！(剩余HP: ${target.hp})`, 'damage');
    handleLinkedDefeat(target);
    maybeTriggerAllyLight(attacker, target);
    updateUI();
    if (!checkCombatEnd()) {
        setTimeout(nextTurn, 300);
    }
}

function useSkill(attacker, skillName) {
    const cs = gameState.combatState;
    if (!cs || !cs.currentUnit || cs.currentUnit.id !== attacker.id) return;

    const skill = SKILL_DATA[skillName];
    if (!skill) {
        nextTurn();
        return;
    }
    if (attacker.mp < skill.mpCost) {
        addLog(NARRATIVE.combat.noMp, 'sys');
        showCombatOptions(attacker);
        return;
    }

    let targets;
    if (skill.damage < 0) {
        targets = attacker.isEnemy ? cs.enemies.filter((unit) => unit.hp > 0) : cs.allies.filter((unit) => unit.hp > 0);
    } else {
        targets = attacker.isEnemy ? cs.allies.filter((unit) => unit.hp > 0) : cs.enemies.filter((unit) => unit.hp > 0);
    }

    if (targets.length === 0) {
        nextTurn();
        return;
    }

    attacker.mp -= skill.mpCost;
    const target = chooseTarget(targets, skill, attacker);
    addLog(`<strong>${attacker.name}</strong> 使用了 <strong>${skillName}</strong>！`, 'combat');
    if (skill.damage > 0) {
        let damage = skill.damage;
        if (cs.allyLightActive && !attacker.isEnemy) {
            damage += 2;
        }
        if (Math.random() < 0.15) {
            damage = Math.floor(damage * 1.5);
            addLog(NARRATIVE.combat.critical, 'damage');
        }
        target.hp = Math.max(0, target.hp - damage);
        addLog(`→ <strong>${target.name}</strong> 受到 ${damage} 点伤害！(剩余HP: ${target.hp})`, 'damage');
        handleLinkedDefeat(target);
    } else if (skill.damage < 0) {
        const heal = -skill.damage;
        target.hp = Math.min(target.maxHp, target.hp + heal);
        addLog(`→ <strong>${target.name}</strong> 恢复了 ${heal} HP！(当前HP: ${target.hp})`, 'heal');
    } else {
        addLog(`→ ${skill.desc}`, 'sys');
    }

    maybeTriggerAllyLight(attacker, target);
    updateUI();
    if (!checkCombatEnd()) {
        setTimeout(nextTurn, 300);
    }
}

function chooseTarget(targets, skill, attacker) {
    if (!targets || targets.length === 0) return null;
    if (skill.damage < 0) {
        return targets.reduce((lowest, unit) => (unit.hp / unit.maxHp < lowest.hp / lowest.maxHp ? unit : lowest), targets[0]);
    }
    if (attacker.isEnemy) {
        return targets[Math.floor(Math.random() * targets.length)];
    }
    return targets.reduce((lowestHp, unit) => (unit.hp < lowestHp.hp ? unit : lowestHp), targets[0]);
}

function maybeTriggerAllyLight(attacker, target) {
    const cs = gameState.combatState;
    if (attacker.isEnemy || !gameState.progress.flags.linxiaoJoined || cs.allyLightConsumed) {
        return;
    }

    const playerUnit = cs.allies.find((unit) => unit.name === '玩家' && !unit.isPet);
    if (!playerUnit) return;

    const lowHealth = playerUnit.hp > 0 && playerUnit.hp <= Math.floor(playerUnit.maxHp * 0.35);
    const enemyDefeated = target && target.isEnemy && target.hp === 0;
    if ((lowHealth || enemyDefeated) && Math.random() < 0.2) {
        cs.allyLightActive = true;
        cs.allyLightConsumed = true;
        addLog(NARRATIVE.combat.allyLight, 'heal');
    }
}

function handleLinkedDefeat(unit) {
    const cs = gameState.combatState;
    if (!cs || unit.hp > 0 || unit.isPet) return;
    const group = unit.isEnemy ? cs.enemies : cs.allies;
    const linkedPet = group.find((candidate) => candidate.isPet && candidate.owner === unit.name && candidate.hp > 0);
    if (linkedPet) {
        linkedPet.hp = 0;
        addLog(`→ <strong>${linkedPet.name}</strong> 因主人倒下而退场。`, 'damage');
    }
}

function openCaptureMenu(unit) {
    const availableBalls = Object.keys(BALL_DATA).filter((ballName) => getInventoryCount(ballName) > 0);
    if (availableBalls.length === 0) {
        addLog('背包里已经没有可用的精灵球了。', 'sys');
        showCombatOptions(unit);
        return;
    }

    const buttons = availableBalls.map((ballName) => ({
        text: `${ballName} x${getInventoryCount(ballName)}`,
        action: () => attemptCapture(unit, ballName),
        className: 'skill-button'
    }));
    buttons.push({ text: '返回技能菜单', action: () => showCombatOptions(unit) });
    setButtons(buttons);
}

function calculateCaptureChance(enemy, ballName) {
    const ball = BALL_DATA[ballName];
    const rarityIndex = RARITY_ORDER.indexOf(enemy.rarity || '普通');
    const baseChance = ball.startRate - ball.decay * Math.max(0, rarityIndex);
    const missingHpRatio = 1 - (enemy.hp / Math.max(1, enemy.maxHp));
    const hpBonus = missingHpRatio * 0.2;
    return Math.max(0.03, Math.min(1, baseChance + hpBonus));
}

function attemptCapture(unit, ballName) {
    const cs = gameState.combatState;
    if (!cs || !cs.currentUnit || cs.currentUnit.id !== unit.id) return;

    const enemy = cs.enemies.find((target) => target.hp > 0 && target.captureable);
    if (!enemy) {
        addLog('当前没有可以捕获的目标。', 'sys');
        showCombatOptions(unit);
        return;
    }

    removeInventoryItem(ballName, 1);
    addLog(`<strong>${unit.name}</strong> 抛出了 <strong>${ballName}</strong>！`, 'combat');
    const chance = calculateCaptureChance(enemy, ballName);

    if (Math.random() <= chance) {
        addLog(NARRATIVE.combat.captureSuccess, 'heal');
        addPetToReserve(enemy.name, 'capture');
        const exp = 6 + Math.floor(Math.random() * 4);
        gainExp(exp, { multiplier: getRewardProfile().expMultiplier * 0.8 });
        const moneyGain = Math.max(3, Math.floor(10 * getRewardProfile().moneyMultiplier));
        gameState.money += moneyGain;
        addLog(NARRATIVE.combat.moneyGain.replace('{{money}}', moneyGain), 'heal');
        cs.enemies.forEach((target) => {
            target.hp = 0;
        });
        gameState.combatState = null;
        gameState.phase = 'explore';
        updateUI();
        if (cs.context.area === 'forest') {
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

    addLog(NARRATIVE.combat.captureFail, 'damage');
    updateUI();
    setTimeout(nextTurn, 300);
}

function enemyAI(enemy) {
    const availableSkills = enemy.skills.filter((skillName) => {
        const skill = SKILL_DATA[skillName];
        return skill && enemy.mp >= skill.mpCost;
    });

    if (availableSkills.length === 0) {
        useBasicAttack(enemy);
        return;
    }

    const skillName = availableSkills[Math.floor(Math.random() * availableSkills.length)];
    useSkill(enemy, skillName);
}

function nextTurn() {
    const cs = gameState.combatState;
    if (!cs) return;

    cs.currentTurnIndex += 1;
    if (cs.currentTurnIndex >= cs.turnOrder.length) {
        cs.currentTurnIndex = 0;
        calculateTurnOrder();
        addLog(NARRATIVE.combat.newRound, 'sys');
    }
    executeTurn();
}

function syncCombatRoster() {
    const cs = gameState.combatState;
    if (!cs) return;

    const playerInCombat = cs.allies.find((unit) => unit.name === '玩家' && !unit.isPet);
    const playerPetInCombat = cs.allies.find((unit) => unit.owner === '玩家' && unit.isPet);

    if (playerInCombat && gameState.player) {
        gameState.player.hp = Math.max(0, playerInCombat.hp);
        gameState.player.mp = Math.max(0, playerInCombat.mp);
    }
    if (playerPetInCombat && gameState.pet) {
        gameState.pet.hp = Math.max(0, playerPetInCombat.hp);
        gameState.pet.mp = Math.max(0, playerPetInCombat.mp);
    }

    gameState.party.forEach((member) => {
        const memberUnit = cs.allies.find((unit) => unit.name === member.name && !unit.isPet);
        const petUnit = cs.allies.find((unit) => unit.owner === member.name && unit.isPet);
        if (memberUnit) {
            member.hp = Math.max(0, memberUnit.hp);
            member.mp = Math.max(0, memberUnit.mp);
        }
        if (member.pet && petUnit) {
            member.pet.hp = Math.max(0, petUnit.hp);
            member.pet.mp = Math.max(0, petUnit.mp);
        }
    });
}

function grantBattleRewards(context) {
    const exp = 8 + Math.floor(Math.random() * 5);
    gainExp(exp);

    if (context.encounterType === 'wild') {
        if (context.area === 'grassland') {
            gameState.progress.counters.grasslandWins += 1;
        }
        if (context.area === 'forest') {
            gameState.progress.counters.forestWins += 1;
        }
    }

    const moneyGain = Math.max(5, Math.floor((12 + Math.floor(Math.random() * 8)) * getRewardProfile().moneyMultiplier));
    gameState.money += moneyGain;
    addLog(NARRATIVE.combat.moneyGain.replace('{{money}}', moneyGain), 'heal');

    if (Math.random() < 0.65) {
        addInventoryItem('树果', 1);
        addLog(NARRATIVE.combat.itemGain.replace('{{item}}', '树果'), 'sys');
    }
    if (Math.random() < 0.35) {
        addInventoryItem('普通球', 1);
        addLog(NARRATIVE.combat.itemGain.replace('{{item}}', '普通球'), 'sys');
    }
    refreshQuestStates();
}

function checkCombatEnd() {
    const cs = gameState.combatState;
    const alliesAlive = cs.allies.some((unit) => unit.hp > 0 && (!unit.isPet || unit.owner));
    const enemiesAlive = cs.enemies.some((unit) => unit.hp > 0);

    if (!enemiesAlive) {
        addLog(NARRATIVE.combat.victory, 'combat');
        syncCombatRoster();
        grantBattleRewards(cs.context);
        gameState.combatState = null;
        gameState.phase = 'explore';
        updateUI();
        handleStoryCombatVictory(cs.context);
        return true;
    }

    if (!alliesAlive) {
        addLog(NARRATIVE.combat.defeat, 'combat');
        addLog(NARRATIVE.combat.defeatMessage, 'sys');
        healRosterToFull();
        gameState.combatState = null;
        gameState.phase = 'hub';
        updateUI();
        handleStoryCombatDefeat(cs.context);
        return true;
    }

    return false;
}

function fleeToVillage() {
    addLog('你带着队伍迅速撤离了战场，草叶和枯枝在脚下被踩得一阵乱响。', 'sys');
    healRosterToFull();
    gameState.combatState = null;
    gameState.phase = 'hub';
    updateUI();
    enterHub();
}


// ========== 战斗系统 ==========

function getWildEncounterLevel(area = 'grassland') {
    const playerLevel = Math.max(1, safeNumber(gameState.player?.level, 1));
    if (gameState.progress?.partyMode === 'duo') {
        const multiplier = area === 'forest' ? 2 : 1.5;
        return Math.max(1, Math.ceil(playerLevel * multiplier));
    }
    return playerLevel;
}

function buildScaledPetCombatData(petName, level) {
    const template = PETS[petName];
    if (!template) return null;
    const normalizedLevel = Math.max(1, safeNumber(level, 1));
    const levelOffset = Math.max(0, normalizedLevel - 1);
    return {
        type: template.type,
        rarity: template.rarity,
        hp: template.hp + safeNumber(EXP_SYSTEM.petGrowth?.hp, 0) * levelOffset,
        mp: template.mp + safeNumber(EXP_SYSTEM.petGrowth?.mp, 0) * levelOffset,
        atk: template.atk + safeNumber(EXP_SYSTEM.petGrowth?.atk, 0) * levelOffset,
        spd: template.spd + safeNumber(EXP_SYSTEM.petGrowth?.spd, 0) * levelOffset,
        skills: getPetSkillsByLevel(petName, normalizedLevel),
        level: normalizedLevel,
        captureable: template.captureable !== false,
        requiredBall: template.requiredBall || null
    };
}

function createEnemyUnit(encounterId, options = {}) {
    if (options.isBoss && NPC_CHARACTERS[encounterId]) {
        const bossData = NPC_CHARACTERS[encounterId];
        const companionData = PETS[bossData.pet] || ENEMIES[bossData.pet];
        const bossUnits = [
            {
                id: `enemy-${encounterId}`,
                name: encounterId,
                class: bossData.class,
                hp: bossData.hp,
                maxHp: bossData.hp,
                mp: bossData.mp,
                maxMp: bossData.mp,
                atk: bossData.atk,
                spd: bossData.spd,
                skills: [...bossData.skills],
                level: bossData.level || 1,
                isEnemy: true,
                team: 'enemy'
            },
            {
                id: `enemy-${bossData.pet}`,
                name: bossData.pet,
                type: companionData.type,
                rarity: companionData.rarity,
                hp: companionData.hp,
                maxHp: companionData.hp,
                mp: companionData.mp,
                maxMp: companionData.mp,
                atk: companionData.atk,
                spd: companionData.spd,
                skills: [...companionData.skills],
                level: companionData.level || 1,
                isEnemy: true,
                isPet: true,
                owner: encounterId,
                team: 'enemy'
            }
        ];
        bossUnits.forEach((unit) => syncUnitSkills(unit));
        return bossUnits;
    }

    const enemyData = ENEMIES[encounterId] || PETS[encounterId];
    if (!enemyData) {
        throw new Error(`Unknown enemy: ${encounterId}`);
    }

    const scaledLevel = options.encounterType === 'wild'
        ? getWildEncounterLevel(options.area)
        : Math.max(1, safeNumber(options.enemyLevel, enemyData.level || 1));
    const resolvedData = PETS[encounterId]
        ? buildScaledPetCombatData(encounterId, scaledLevel)
        : {
            ...enemyData,
            level: scaledLevel
        };

    const enemyUnits = [{
        id: `enemy-${encounterId}`,
        name: encounterId,
        type: resolvedData.type,
        rarity: resolvedData.rarity,
        hp: resolvedData.hp,
        maxHp: resolvedData.hp,
        mp: resolvedData.mp,
        maxMp: resolvedData.mp,
        atk: resolvedData.atk,
        spd: resolvedData.spd,
        skills: [...resolvedData.skills],
        level: resolvedData.level || 1,
        isEnemy: true,
        isPet: !!PETS[encounterId],
        captureable: resolvedData.captureable !== false && !!PETS[encounterId],
        requiredBall: resolvedData.requiredBall || null,
        team: 'enemy'
    }];
    enemyUnits.forEach((unit) => syncUnitSkills(unit));
    return enemyUnits;
}

function parseTypeParts(typeValue) {
    if (!typeValue) return [];
    return String(typeValue).split('/').map((part) => part.trim()).filter(Boolean);
}

function getTypeMultiplier(attackType, defendType) {
    if (!attackType || !defendType || !TYPE_CHART[attackType]) return 1;
    const targetTypes = parseTypeParts(defendType);
    if (targetTypes.length === 0) return 1;
    return targetTypes.reduce((multiplier, targetType) => {
        if (TYPE_CHART[attackType].strongAgainst.includes(targetType)) return multiplier * 1.5;
        if (TYPE_CHART[attackType].weakAgainst.includes(targetType)) return multiplier * 0.75;
        return multiplier;
    }, 1);
}

function logTypeEffect(attackType, targetType, multiplier) {
    if (!attackType || !targetType || multiplier === 1) return;
    if (multiplier > 1) {
        addLog(`→ 属性克制：${attackType} 对 ${targetType} 更有效。`, 'damage');
        return;
    }
    addLog(`→ 属性受阻：${attackType} 对 ${targetType} 效果较弱。`, 'sys');
}

function resolveAttackType(attacker, skill = null) {
    if (skill && skill.type) return skill.type;
    return '普通';
}

function applyTypeDamage(baseDamage, attacker, target, skill = null) {
    const attackType = resolveAttackType(attacker, skill);
    const multiplier = getTypeMultiplier(attackType, target.type);
    const finalDamage = Math.max(1, Math.floor(baseDamage * multiplier));
    logTypeEffect(attackType, target.type, multiplier);
    return finalDamage;
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

function getCombatEffectTier(amount) {
    if (amount >= 10) return 'heavy';
    if (amount >= 6) return 'medium';
    return 'light';
}

function triggerCombatUnitEffect(unit, kind, amount) {
    if (!unit) return;
    const effectToken = `${Date.now()}-${Math.random()}`;
    unit.uiEffect = {
        token: effectToken,
        kind,
        amount,
        tier: getCombatEffectTier(Math.abs(amount))
    };
    updateUI();
    window.setTimeout(() => {
        if (unit.uiEffect && unit.uiEffect.token === effectToken) {
            delete unit.uiEffect;
            updateUI();
        }
    }, 950);
}

function updateCombatUI() {
    const cs = gameState.combatState;
    let html = '<h4>战斗中</h4>';

    const renderUnit = (unit, isActive) => {
        const effect = unit.uiEffect;
        const effectClass = effect ? ` effect-${effect.kind} effect-${effect.tier}` : '';
        const effectHtml = effect
            ? `<div class="combat-float ${effect.kind === 'heal' ? 'heal' : 'damage'} ${effect.tier}">${effect.kind === 'heal' ? '+' : '-'}${Math.abs(effect.amount)}</div>`
            : '';
        return `
            <div class="combat-unit ${isActive ? 'active' : ''}${effectClass}">
                ${effectHtml}
                <div class="combat-unit-head">
                    <strong>${unit.name}</strong> (${unit.type || unit.class || '单位'}) <span class="combat-level">Lv.${safeNumber(unit.level, 1)}</span>
                </div>
                <div class="combat-stat-row">
                    <span class="combat-stat-pill hp">HP ${formatValue(unit.hp)}/${formatValue(unit.maxHp, 1)}</span>
                    <span class="combat-stat-pill mp">MP ${formatValue(unit.mp)}/${formatValue(unit.maxMp, 1)}</span>
                </div>
                <div class="combat-stat-row compact">
                    <span class="combat-stat-pill">ATK ${formatValue(unit.atk)}</span>
                    <span class="combat-stat-pill">SPD ${formatValue(unit.spd)}</span>
                </div>
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
    if (PETS[encounterId]) {
        markPetSeen(encounterId);
    }
    if (options.isBoss && encounterId === '林晓') {
        markCharacterSeen('linxiao');
        markPetSeen(NPC_CHARACTERS['林晓']?.pet);
    }
    if (options.isBoss && encounterId === '幻梦乐园代理人') {
        markCharacterSeen('dreamland_agent');
        markPetSeen(NPC_CHARACTERS['幻梦乐园代理人']?.pet);
    }
    if (encounterId === '实验机器人') {
        markCharacterSeen('lab_robot');
    }
    if (encounterId === '失衡实验体') {
        markCharacterSeen('inner_aberration');
    }

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
    runAfterLogs(() => executeTurn(), 120);
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
        runAfterLogs(() => enemyAI(unit), 160);
        return;
    }

    runAfterLogs(() => showCombatOptions(unit), 80);
}

function showCombatOptions(unit) {
    const buttons = [{
        text: '普通攻击',
        action: () => useBasicAttack(unit),
        className: 'skill-button',
        helpText: getBasicAttackDescription(unit)
    }];

    unit.skills.forEach((skillName) => {
        const skill = SKILL_DATA[skillName];
        const costLabel = skill.mpCost > 0 ? ` [MP ${skill.mpCost}]` : '';
        buttons.push({
            text: `${skillName}${costLabel}`,
            action: () => useSkill(unit, skillName),
            className: 'skill-button',
            disabled: unit.mp < skill.mpCost,
            helpText: getSkillDescription(skillName, unit)
        });
    });

    if (canAttemptCapture()) {
        buttons.push({ text: '投掷精灵球', action: () => openCaptureMenu(unit), helpText: '从背包里选择捕获球。目标越残血、球等级越高，成功率越高。' });
    }

    if (!unit.isPet) {
        buttons.push({ text: '使用道具', action: () => openCombatItemMenu(unit), helpText: '从背包选择恢复道具给己方单位使用。' });
    }

    buttons.push({ text: '返回村庄', action: fleeToVillage, helpText: '立即脱离战斗并回到村庄，队伍会被恢复。' });
    setButtons(buttons);
}

function canAttemptCapture() {
    const cs = gameState.combatState;
    if (!cs || !cs.context.captureAllowed) return false;
    if (gameState.petReserve.length >= getPetBagCapacity()) return false;
    return cs.enemies.some((enemy) => enemy.hp > 0 && enemy.captureable);
}

function useBasicAttack(attacker) {
    const cs = gameState.combatState;
    if (!cs || !cs.currentUnit || cs.currentUnit.id !== attacker.id) return;
    const targets = attacker.isEnemy ? cs.allies.filter((unit) => unit.hp > 0) : cs.enemies.filter((unit) => unit.hp > 0);
    const target = chooseTarget(targets, { damage: attacker.atk }, attacker);
    const baseDamage = Math.max(1, Math.floor(attacker.atk * 0.75));
    addLog(`<strong>${attacker.name}</strong> 发动了普通攻击。`, 'combat');
    const damage = applyTypeDamage(baseDamage, attacker, target);
    target.hp = Math.max(0, target.hp - damage);
    triggerCombatUnitEffect(target, 'damage', damage);
    addLog(`→ <strong>${target.name}</strong> 受到 ${damage} 点伤害！(剩余HP: ${target.hp})`, 'damage');
    handleLinkedDefeat(target);
    maybeTriggerAllyLight(attacker, target);
    updateUI();
    if (!checkCombatEnd()) {
        runAfterLogs(() => nextTurn(), 140);
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
    attacker.mp = safeNumber(attacker.mp, 0);
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

    attacker.mp = Math.max(0, safeNumber(attacker.mp, 0) - safeNumber(skill.mpCost, 0));
    const target = chooseTarget(targets, skill, attacker);
    addLog(`<strong>${attacker.name}</strong> 使用了 <strong>${skillName}</strong>！`, 'combat');
    if (skill.damage > 0) {
        let damage = getScaledSkillAmount(skill, attacker) ?? skill.damage;
        if (cs.allyLightActive && !attacker.isEnemy) {
            damage += 2;
        }
        damage = applyTypeDamage(damage, attacker, target, skill);
        if (Math.random() < 0.15) {
            damage = Math.floor(damage * 1.5);
            addLog(NARRATIVE.combat.critical, 'damage');
        }
        target.hp = Math.max(0, target.hp - damage);
        triggerCombatUnitEffect(target, 'damage', damage);
        addLog(`→ <strong>${target.name}</strong> 受到 ${damage} 点伤害！(剩余HP: ${target.hp})`, 'damage');
        handleLinkedDefeat(target);
    } else if (skill.damage < 0) {
        const heal = getScaledSkillAmount(skill, attacker) ?? -skill.damage;
        target.hp = Math.min(target.maxHp, target.hp + heal);
        triggerCombatUnitEffect(target, 'heal', heal);
        addLog(`→ <strong>${target.name}</strong> 恢复了 ${heal} HP！(当前HP: ${target.hp})`, 'heal');
    } else {
        addLog(`→ ${skill.desc}`, 'sys');
    }

    maybeTriggerAllyLight(attacker, target);
    updateUI();
    if (!checkCombatEnd()) {
        runAfterLogs(() => nextTurn(), 140);
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
    if (gameState.petReserve.length >= getPetBagCapacity()) {
        addLog(`你的宠物背包已经满了。当前容量 ${gameState.petReserve.length}/${getPetBagCapacity()}。`, 'sys');
        showCombatOptions(unit);
        return;
    }
    const availableBalls = Object.keys(BALL_DATA).filter((ballName) => getInventoryCount(ballName) > 0);
    if (availableBalls.length === 0) {
        addLog('背包里已经没有可用的精灵球了。', 'sys');
        showCombatOptions(unit);
        return;
    }

    const buttons = availableBalls.map((ballName) => ({
        text: `${ballName} x${getInventoryCount(ballName)}`,
        action: () => attemptCapture(unit, ballName),
        className: 'skill-button',
        helpText: `${ballName}：${BALL_DATA[ballName].description}`
    }));
    buttons.push({ text: '返回技能菜单', action: () => showCombatOptions(unit), helpText: '回到当前单位的攻击与技能菜单。' });
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

    if (enemy.requiredBall && ballName !== enemy.requiredBall) {
        addLog(`<strong>${enemy.name}</strong> 的星纹防护过于强烈，必须使用 <strong>${enemy.requiredBall}</strong> 才有机会封印。`, 'sys');
        showCombatOptions(unit);
        return;
    }

    removeInventoryItem(ballName, 1);
    addLog(`<strong>${unit.name}</strong> 抛出了 <strong>${ballName}</strong>！`, 'combat');
    const chance = calculateCaptureChance(enemy, ballName);

    if (Math.random() <= chance) {
        addLog(NARRATIVE.combat.captureSuccess, 'heal');
        addPetToReserve(enemy.name, 'capture', Math.max(1, Math.floor(safeNumber(enemy.level, 1) / 2)));
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
    runAfterLogs(() => nextTurn(), 140);
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
    runAfterLogs(() => executeTurn(), 100);
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
    runAfterLogs(() => enterHub(), 120);
}

function openCombatItemMenu(unit) {
    const humanItems = Object.keys(HUMAN_ITEM_DATA).filter((itemName) => getInventoryCount(itemName) > 0);
    const petItems = Object.keys(PET_ITEM_DATA).filter((itemName) => getInventoryCount(itemName) > 0);

    if (humanItems.length === 0 && petItems.length === 0) {
        addLog('背包里没有可用的恢复道具。', 'sys');
        showCombatOptions(unit);
        return;
    }

    const buttons = [];

    if (humanItems.length > 0) {
        humanItems.forEach((itemName) => {
            const itemData = HUMAN_ITEM_DATA[itemName];
            buttons.push({
                text: `${itemName} x${getInventoryCount(itemName)} [人类]`,
                action: () => selectCombatItemTarget(unit, itemName, 'human'),
                className: 'skill-button',
                helpText: `${itemData.description}（HP+${itemData.hp || 0} MP+${itemData.mp || 0}）`
            });
        });
    }

    if (petItems.length > 0) {
        petItems.forEach((itemName) => {
            const itemData = PET_ITEM_DATA[itemName];
            buttons.push({
                text: `${itemName} x${getInventoryCount(itemName)} [宠物]`,
                action: () => selectCombatItemTarget(unit, itemName, 'pet'),
                className: 'skill-button',
                helpText: `${itemData.description}（HP+${itemData.hp || 0} MP+${itemData.mp || 0}）`
            });
        });
    }

    buttons.push({ text: '返回技能菜单', action: () => showCombatOptions(unit), helpText: '回到当前单位的攻击与技能菜单。' });
    setButtons(buttons);
}

function selectCombatItemTarget(user, itemName, itemType) {
    const cs = gameState.combatState;
    if (!cs) return;

    const targets = cs.allies.filter((ally) => {
        if (ally.hp <= 0) return false;
        if (itemType === 'human') return !ally.isPet;
        if (itemType === 'pet') return ally.isPet;
        return false;
    });

    if (targets.length === 0) {
        addLog(itemType === 'human' ? '没有可用的人类目标。' : '没有可用的宠物目标。', 'sys');
        showCombatOptions(user);
        return;
    }

    if (targets.length === 1) {
        useCombatItem(user, itemName, targets[0]);
        return;
    }

    const buttons = targets.map((target) => ({
        text: `${target.name} (HP:${target.hp}/${target.maxHp} MP:${target.mp}/${target.maxMp})`,
        action: () => useCombatItem(user, itemName, target),
        className: 'skill-button',
        helpText: `对 ${target.name} 使用 ${itemName}`
    }));

    buttons.push({ text: '返回道具菜单', action: () => openCombatItemMenu(user), helpText: '回到道具选择菜单。' });
    setButtons(buttons);
}

function useCombatItem(user, itemName, target) {
    const cs = gameState.combatState;
    if (!cs || !cs.currentUnit || cs.currentUnit.id !== user.id) return;

    const itemData = HUMAN_ITEM_DATA[itemName] || PET_ITEM_DATA[itemName];
    if (!itemData) {
        addLog('道具数据错误。', 'sys');
        showCombatOptions(user);
        return;
    }

    removeInventoryItem(itemName, 1);
    addLog(`<strong>${user.name}</strong> 对 <strong>${target.name}</strong> 使用了 <strong>${itemName}</strong>！`, 'combat');

    if (itemData.hp > 0) {
        const healAmount = itemData.hp;
        const actualHeal = Math.min(healAmount, target.maxHp - target.hp);
        target.hp = Math.min(target.maxHp, target.hp + healAmount);
        triggerCombatUnitEffect(target, 'heal', actualHeal);
        addLog(`→ <strong>${target.name}</strong> 恢复了 ${actualHeal} HP！(当前HP: ${target.hp})`, 'heal');
    }

    if (itemData.mp > 0) {
        const mpAmount = itemData.mp;
        const actualMpRestore = Math.min(mpAmount, target.maxMp - target.mp);
        target.mp = Math.min(target.maxMp, target.mp + mpAmount);
        if (actualMpRestore > 0) {
            addLog(`→ <strong>${target.name}</strong> 恢复了 ${actualMpRestore} MP！(当前MP: ${target.mp})`, 'heal');
        }
    }

    updateUI();
    if (!checkCombatEnd()) {
        runAfterLogs(() => nextTurn(), 140);
    }
}


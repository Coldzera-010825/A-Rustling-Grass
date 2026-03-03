# Developer NPC And Quest Reference

Version: `0.11.2`

Purpose: this file is for developers only. It summarizes the NPC dialogue inventory, main story beats, village commissions, and the current side-quest flow implemented in the game. Nothing here is automatically shown to players in-game.

## 1. Scope

Current playable scope is still limited to Chapter One:

- Breeze Village / 微风村
- Echo Grassland / 回声草丛
- Whispering Forest / 呢喃森林
- Forest laboratory event
- Village commissions
- Bridge-side side quest

## 2. Village NPC Dialogue Table

| NPC ID | Display Name | Location | Dialogue Count | Dialogue Summary | Related System |
|---|---|---|---:|---|---|
| `chief` | 村长 | 村口广场 | 3 regular lines + bridge branch dialogue | Talks about departure, growth, village values; also handles `巡草委托`; also confirms bridge clue and gives bridge reward in the branch flow | Main story, commission, bridge side quest |
| `zhangsan` | 张三 | 老井边 | 2 | Everyday life, staying or leaving the village, encourages player temperamentally | `树果代采` |
| `lisi` | 李四 | 磨坊前 | 2 | Observation of wild pets, field notes, monster research | `收容计划` |
| `ahe` | 阿禾 | 集市长棚 | 2 | Resource preparation, consumables, survival planning | General store flavor |
| `qushen` | 曲婶 | 集市长棚 | 2 | Pet care responsibility and partner values | Pet market flavor |
| `granny_moss` | 苔婆婆 | 老井边 | 3 | Mentions metal sounds in the wind near the bridge and asks player to check | Starts bridge side quest |
| `ferryman_bo` | 摆渡伯 | 溪桥外缘 | 2 | Mentions driftwood and a toothed metal fragment under the bridge | Advances bridge side quest |

## 3. Village Dialogue Lines

### `chief` / 村长

1. 年轻人出村，总以为前方是惊天动地的大事。可真把人撑起来的，往往是回头时还有一盏灯在等。
2. 别把自己当成英雄，也别把自己看得太轻。你只要每次都比昨天更敢往前一步，就已经够了。
3. 等你以后走得更远，再回来看这些石板路，说不定会发现它们比你想得更重要。

Bridge branch additions:

- Stage 2: examines the toothed fragment and tells the player to go back to the bridge to compare traces.
- Stage 4: listens to the report, confirms outside activity is leaking toward the village, and grants reward.

### `zhangsan` / 张三

1. 我年轻时也想过出门闯。后来发现，人啊，不一定非得走远，能把眼前日子过热乎也是本事。
2. 不过你不一样。你眼神里有股坐不住的劲，像是风一吹就要往村外跑。

### `lisi` / 李四

1. 野宠其实没那么神秘。它们也有习惯，有脾气，有喜欢晒太阳和不喜欢淋雨的时候。
2. 你要是能多带些观察回来，我也许真能整理出一本像样的村外图鉴。

### `ahe` / 阿禾

1. 冒险这回事，说白了就是把准备做在危险前头。药、球、绳子、备用火种，少一个都容易出事。
2. 当然，真要没钱也别硬撑，先活着回来，再谈下次出门。

### `qushen` / 曲婶

1. 小家伙们可不是货物，它们只是暂时还没遇上愿意同行的人。你要买，就得养；你要养，就得负责。
2. 真要说谁配得上谁，不是看价钱，是看谁肯在危险里也不丢下对方。

### `granny_moss` / 苔婆婆

1. 最近桥那头夜里总有冷风灌进来，吹得我骨头缝里都发酸。风里像夹着细碎的金属响。
2. 你若有空，替我去桥边看看。不是大事也好，至少让我这把老骨头少猜几宿。
3. 年轻人啊，有时候不是为了奖赏去做事，而是为了让夜里能睡得踏实。

### `ferryman_bo` / 摆渡伯

1. 前几天夜里桥下卡了不少漂木，我清的时候看见一块带齿纹的铁片，不像村里东西。
2. 你要查，我可以把它给你。但你最好先问过村长，他比我更懂这东西该不该往上报。

## 4. Main Story Flow Table

| Story Step | Trigger | Current Content |
|---|---|---|
| `INTRO` | New game start | Opening text, village wake-up, talk to village chief |
| `CHOOSE_CLASS` | Talk to village chief | Select one of four classes |
| `CHOOSE_PET` | After class selection | Select starter pet |
| `READY_FOR_FIRST_HUNT` | After starter selection | Enter village hub and unlock early exploration |
| First wild battle | First grassland exploration | Forced early battle tutorial-style encounter |
| `LINXIAO_PENDING` | Grassland exploration count >= 3 and not yet met | Lin Xiao introduction and duel invitation |
| `LINXIAO_CHOICE` | After defeating Lin Xiao | Decide duo partnership or solo path |
| `FOREST_UNLOCKED` | After Lin Xiao branch choice | Whispering Forest unlocked |
| `FOREST_CLEARED` | First forest battle victory | Laboratory entrance discovery |
| Laboratory event | Choose to investigate | Dreamland proxy dialogue and robot battle |
| `CHAPTER_ONE_COMPLETE` | Robot battle victory | Obtain starlight fragment, reveal Breeze Village as a suspicious focal point, lock later chapters |

## 5. Main Story NPC/Encounter List

| Character / Encounter | Role in Chapter One | Notes |
|---|---|---|
| 村长 | Opening guide, world hint, village elder authority | Gives main starting direction |
| 林晓 | Friendly rival and branch point | Can become party member or be declined |
| 幻梦乐园代理 | First direct antagonist voice | Frames Dreamland as “order over nature” |
| 实验机器人 | Chapter One final fight | Guards forest lab |

## 6. Village Commission Table

| Quest ID | Title | Giver | Location | Objective | Completion Condition | Reward |
|---|---|---|---|---|---|---|
| `chief_patrol` | 巡草委托 | 村长 | 村口广场 | 清理草丛骚动 | Defeat 3 grassland wild enemies | 60 风纹币 + 1 `中级球` |
| `zhangsan_fruit` | 树果代采 | 张三 | 老井边 | 帮张三带回树果 | Hold at least 2 `树果` | 35 风纹币 + 2 `普通球` |
| `lisi_capture` | 收容计划 | 李四 | 磨坊前 | 捕获一只普通品质宠物供研究 | Capture at least 1 pet of rarity `普通` | 90 风纹币 + 1 `高级球` + 1 `怪兽图鉴` |

## 7. Bridge Side Quest: `桥边异响`

This is a manually staged village side quest implemented through `bridgeMysteryStage`.

| Stage | Trigger / Player Step | What Happens | Next Expected Action |
|---|---|---|---|
| `0` | Player has not talked to 苔婆婆 | Checking the bridge only gives a generic “ask around first” message | Talk to 苔婆婆 |
| `1` | Talk to 苔婆婆 | The bridge metal-sound clue is recorded | Go to 溪桥外缘 and talk to 摆渡伯 |
| `2` | Talk to 摆渡伯 after stage 1 | Receive `带齿铁片` | Go to 村口广场 and show it to 村长 |
| `3` | Talk to 村长 after stage 2 | Chief confirms it is suspicious and asks player to compare traces back at the bridge | Return to bridge and compare marks |
| `4` | Use bridge action after stage 3 | Player confirms the fragment matches lab-like marks | Return to 村长 and report |
| `5` | Talk to 村长 after stage 4 | Quest resolves; player gets `溪桥护符` and 55 风纹币 | Quest complete |

Reward:

- `溪桥护符`
- 55 风纹币

## 8. Current Village Area Interaction Map

| Area ID | Display Area | Available NPC / Function |
|---|---|---|
| `square` | 村口广场 | 村长, 巡草委托, bridge report / confirmation when relevant |
| `well` | 老井边 | 张三, 苔婆婆, 树果代采 |
| `mill` | 磨坊前 | 李四, 收容计划 |
| `market` | 集市长棚 | 阿禾, 曲婶, 杂货铺, 宠物市集 |
| `bridge` | 溪桥外缘 | 摆渡伯, bridge side-quest stage action |

## 9. Developer Notes

- All dialogue and quest logic summarized here is derived from the current implementation in `js/data.js` and `js/engine.js`.
- The file is intentionally documentation-only and is not wired into the game UI.
- If future versions add more NPCs or chapter-specific branches, append them here instead of exposing raw quest logic to players.

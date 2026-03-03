# A Rustling Grass / 微风草丛

当前版本 / Current Version: `0.13.3`

《微风草丛》是一款持续迭代中的文字驱动回合制 RPG。玩家从微风村出发，选择职业与初始宠物，在草丛、森林与实验室线索之间推进第一章剧情，进行探索、战斗、捕获、调查与解谜。

A Rustling Grass is an actively evolving text-driven turn-based RPG. You begin in Breeze Village, choose a class and starter companion, and progress through Chapter One with exploration, battles, creature capture, investigation, and light puzzle-solving.

## 运行方式 / How to Run

直接打开 `index.html` 即可开始游戏。

Open `index.html` in a browser to start the game.

## 当前开发状态 / Current Development Status

项目仍在持续更新中，当前版本不是最终正式版。游玩过程中仍可能遇到平衡调整、流程细化或未完全展开的后续章节内容。

This project is still under active development. You may still encounter balance tuning, flow revisions, or later-chapter content that is only partially implemented.

## 当前第一章结构 / Current Chapter One Structure

- 微风村开局，选择职业与初始宠物。
- 回声草丛初战后，第三次探索会触发林晓试炼战。
- 击败林晓后获得图鉴大全，并进入村庄调查阶段。
- 村庄内需要完成调查解谜，包括李四的异常记录判断、集市长棚的异常采购推理，以及桥边异响支线旁证。
- 呢喃森林解锁后，会先遭遇幻梦乐园代理人与机械宠物“棱镜机偶”。
- 获得实验门卡后，还需通过实验室门禁谜题。
- 实验室内部会进入灾变现场，并遭遇第一章内部 Boss“失衡实验体”。

## 近期关键更新 / Recent Major Updates

### 0.13.3 Encyclopedia Layout Refresh

- The type matchup area now uses a node-and-arrow relationship graphic closer to classic monster-collection encyclopedia layouts.
- Pet entries now place color-coded type badges alongside rarity in the same header row.
- Repeated type text was removed from the pet details block to keep encyclopedia entries cleaner.

### 0.13.1 Combat and Encyclopedia Polish

- Boss units in Chapter One were strengthened with higher stats and stronger skill layers.
- Several pet skills were rebalanced so later unlocks no longer cost more MP for the same damage.
- Pet basic attacks now use neutral normal damage instead of inheriting elemental typing.
- The encyclopedia now includes a type matchup chart and color-coded type markers.

### 0.13.0 Chapter One Rebuild

- Chapter One pacing was rebuilt around village investigation, gated forest access, a proxy gatekeeper battle, and a lab door puzzle.
- The lab interior now presents a collapsed disaster scene instead of a clean facility.
- The final encounter of Chapter One is now the inner boss `失衡实验体`, replacing the old single-stage robot climax.

### 0.12.x Encyclopedia Update

- The old skill compendium was merged into the central encyclopedia modal.
- Encyclopedia entries now unlock progressively based on encounters, captures, dialogue, and story battles.
- Pet entries, character entries, rarity descriptions, and skill unlock levels are now unified in one place.

### 0.11.0 World Rebuild

- The macro setting was rebuilt around **Windmark Continent** and **Wind Mark**.
- Breeze Village is now explicitly framed as a surviving coexistence-era village.
- Dreamland Consortium, Gear Faction, and Poacher Nebula now anchor the long-term plot.

## 可玩范围 / Playable Scope

当前可玩内容仍限制在第一章。第二章及之后的势力冲突目前以前置伏笔形式存在。

Playable content is still limited to Chapter One. Later chapters currently exist as foreshadowing only.

## 更新记录 / Changelog

详细更新记录见 [CHANGELOG.md](CHANGELOG.md)。

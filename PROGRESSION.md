# Progression

Caleb, 2026-10-18: "Right at the game, you're gonna go to the planet, which will give you what race you are, and
give you different names for ships, which will each start with a different level 1 loadout. I need you to design
different loadouts for each planet for capital, cruiser, and fighter ships. The player will start out with a cruiser
ship. While progressing through the levels, will be able to start adding fighter ships to his cruiser bay to deploy
in combat. As he progresses through the levels, he will also get more options to unlock and purchase new technology."

Every number on this page is a **FIRST PASS**, for Caleb to reshape. The code is in `src/lib/progression/`.

## Faction start

**New game** opens a screen with seven home planets. Each card shows the planet, the race, a line on how its ships
fight, its three ship classes and its cruiser's level-1 loadout. Picking one:

- makes that nation the player's (`setPlayerNation` in `lib/nations.ts`; its patrols turn friendly and Earth's turn
  hostile unless Earth was picked), saved with the game;
- names the ship after the race: "Quirite Corvus", "Selenite Lamp", "Human Pathfinder";
- starts the player at home in that race's level-1 cruiser. Earth starts exactly where main always has. Every other
  race starts just outside its own patrol ring, on the side facing Earth, nose to its planet (`homeSpawn`);
- starts 100 credits, level 1, an empty bay.

Starting a new game replaces the saved one; the start screen says so when there is one.

Race names come from the races branch (`claude/races-fe3f3b`, 95c3dbf). **Ship class names are placeholders**, taken
from LORE.md's descriptions of each race's ships, because races has not named classes yet.

| Home | Race | Capital | Cruiser (player) | Fighter | Doctrine (from LORE.md) |
|---|---|---|---|---|---|
| Earth | Humans | Metropolis | Pathfinder | Sparrow | The largest navy; a little of everything |
| Moon | Selenitai | Treasury | Lamp | Needle | Scholars; bright ships of mirrors: lasers, drones, jamming |
| Mercury | Hemerodromoi | Hoplon | Wedge | Aspis | Spartans; shield-first ships flown point-first, in phalanx |
| Venus | Nephelai | Palatine | Dromon | Jewel | Byzantine court; ornate, afraid of falling: shields, flares, fire |
| Mars | Quirites | Rostrata | Corvus | Velite | Roman legions; standard, armoured, kinetic, in numbers |
| Jupiter | Diadochoi | Tessarakonteres | Sarissa | Hetairos | Successor kings; spinal railguns, companions armed to the teeth |
| Saturn | Autochthones | Trireme | Raider | Glider | Far democracy; spare long-range raiders: rails, mines, jamming, repair |

## The 21 level-1 loadouts

Slots (FIRST PASS): capital 4 weapons, 2 defence, 2 support; cruiser 2, 1, 1; fighter 2, 1, 0. A cruiser or fighter
starts with tier-1 tech only; a capital may carry tier 2. No two races share a loadout for any ship type (tested).

Weapons are arsenal's ten munitions and the shields are its four (`claude/arsenal-33bf3e`, 49536e2), by their real ids.
Armour, drones, countermeasures and the targeting computer are placeholder ids until arsenal commits them.

| Race | Capital | Cruiser | Fighter |
|---|---|---|---|
| Humans | Pulse, Seeker, Rail, Flak · Armour, Deflector · Repair drone, Targeting computer | Pulse, Seeker · Deflector · Targeting computer | Pulse, Rail · Armour |
| Selenitai | Plasma, Pulse, Pulse, Seeker · Deflector, Capacitor · Attack drone, Jammer | Pulse, Pulse · Deflector · Repair drone | Pulse, Pulse · Deflector |
| Hemerodromoi | Rail, Flak, Flak, Seeker · Bi-facet, Heavy plating · Repair drone, Flares | Rail, Flak · Bi-facet · Flares | Flak, Pulse · Bi-facet |
| Nephelai | Swarm, Plasma, Flak, Pulse · Capacitor, Deflector · Jammer, Chaff | Flak, Seeker · Deflector · Flares | Flak, Flak · Deflector |
| Quirites | Rail, Rail, Flak, Seeker · Heavy plating, Armour · Targeting computer, Chaff | Rail, Seeker · Armour · Targeting computer | Rail, Flak · Armour |
| Diadochoi | Rail, Plasma, Swarm, Seeker · Heavy plating, Deflector · Attack drone, Targeting computer | Rail, Seeker · Deflector · Targeting computer | Seeker, Seeker · Armour |
| Autochthones | Rail, Mine, Seeker, Pulse · Deflector, Armour · Jammer, Repair drone | Rail, Flak · Deflector · Jammer | Pulse, Seeker · Deflector |

Why each looks the way it does: the Selenitai are the only cruiser with a drone and fly pure energy weapons; the
Hemerodromoi carry the bi-facet shield (a front shield for a ship flown point-first) and flak for the phalanx; the
Nephelai fear falling, so shields and flares, and flak for Greek fire; the Quirites carry the most hull and fire
control; the Diadochoi mount the spinal railgun and give their companions double missile racks; the Autochthones
raid far from home with rails, mines, a jammer and a repair drone.

**What a loadout does in the engine today.** Every nation's patrol ships fly their race's cruiser loadout: their hit
points are 100 + armour + shield, and their missile-dodge chance is 35% plus their flares, jammer and chaff, less heavy
plating. The player's cruiser fires only the weapons it carries: bolts and beams fire as main's laser and missiles and
mines as main's missile, until arsenal's munitions fly (so the Selenite Lamp has no missile until it buys one). The
HUD names the munition ("Railgun"). Bay fighters fight with their race's fighter loadout (below).

## Levels

Experience to reach level L: **50 × L × (L − 1)**. Each level asks for 100 more than the one before. Level 10 is the
top.

| Level | Total XP | Bay slots | Tech tier on sale | What opens |
|---|---|---|---|---|
| 1 | 0 | 0 | 1 | Your race's cruiser, tier-1 tech |
| 2 | 100 | 1 | 1 | The fighter bay, with a free fighter |
| 3 | 300 | 1 | 2 | Tier-2 tech |
| 4 | 600 | 2 | 2 | Second bay slot |
| 5 | 1,000 | 2 | 3 | Tier-3 tech |
| 6 | 1,500 | 3 | 3 | Third bay slot |
| 7 | 2,100 | 3 | 4 | Tier-4 tech |
| 8 | 2,800 | 4 | 4 | Fourth bay slot |
| 9 | 3,600 | 4 | 4 | Nothing yet |
| 10 | 4,500 | 4 | 4 | Nothing yet (room for a capital-ship command) |

Experience comes from kills only (any kill by the player or a wingman): capital 200, cruiser 40, fighter 15. Main's
patrol ships have no type yet, so every kill counts as a cruiser until ship types merges: three kills to level 2.

## The fighter bay

- The cruiser's bay has as many slots as the level allows (table above). The first fighter is given free when the
  first slot opens at level 2; more are bought in the Shipyard for 150 credits each, one per open slot.
- **B** launches the next docked fighter; **V** recalls every fighter out. Neither key clashes with F, E, G, M, N, R,
  X, W/A/S/D, Q, 1, 2, Space, Shift or Esc. The pilot panel has Launch and Recall buttons for touch.
- A launched fighter is a wingman with three behaviours (`lib/progression/wingman.ts`):
  - **escort**: holds a formation slot beside and a little behind the player (alternating right and left);
  - **attack**: when the player has a target, it circles that ship 2.5 units off and fires three shots a second inside
    14 units. The target is the player's missile lock, or else the last ship the player hit, held while it lives;
  - **return**: when recalled, flies back and docks within 0.3 units.
- A fighter's guns are its race's fighter loadout at a quarter of a cruiser's strength (arsenal's `scaleMunition`
  idea). A Human Sparrow does about 31 damage a second: a 200-point Selenite patrol dies in 6.5 s.
- Fighters are not lost: enemies do not shoot yet. Docked fighters persist with the save; fighters out when you save
  come back docked.

## Unlock and purchase (FIRST PASS economy)

All of it is in one table, `ECONOMY` in `src/lib/progression/economy.ts`. Credits come from kills; nothing else earns
or spends yet: no trading, mining or markets.

| What | Number |
|---|---|
| Starting credits | 100 |
| Credits per kill | capital 120, cruiser 25, fighter 10 |
| XP per kill | capital 200, cruiser 40, fighter 15 |
| Bay fighter | 150 (the first is free) |
| Resale | 50% (not used: nothing sells yet) |

| Tier | Opens at | Module (price in credits) |
|---|---|---|
| 1 | level 1 | Pulse laser 60, Seeker missile 80, Railgun 110, Flak 70, Deflector shield 90, Bi-facet shield 100, Armour plating 80, Repair drone 120, Decoy flares 90, Jammer 110, Targeting computer 100 |
| 2 | level 3 | Plasma bolt 220, Swarm missiles 240, Proximity mine 200, Capacitor shield 230, Heavy plating 260, Chaff 200, Attack drone 300 |
| 3 | level 5 | Ion shot 420, Beam laser 450, Hardened shield 520, Point-defence drone 480 |
| 4 | level 7 | Torpedo 900 |

**Shipyard** (pause menu): the cruiser's slots, the hold, the bay and the tech list. Buying a module puts it in a free
slot of its kind, or in the hold when the slots are full; a slot's **Swap** list fits a module from the hold and puts
the old one back in the hold. Locked tech shows the level that opens it. The stations branch has an Upgrade
placeholder; this screen belongs there once it lands.

## Saving

`GameData.progress` (`lib/store.ts`) holds the nation, XP, credits, kills, the fit, the hold, the bay's fighters and
every purchase. It is saved on every change (a kill, a purchase), not only with **Save journey**. A save from before
progression has no `progress` and loads as a Human (Earth) pilot at level 1. A saved fit that names a module that no
longer exists, or does not fit a cruiser, is replaced by the race's own loadout.

## Placeholders waiting on other branches

All in `src/lib/progression/refs.ts`, so each merge is a swap there.

| What | Waiting on | Now |
|---|---|---|
| Ship class names (21) | races | Taken from LORE.md's ship descriptions |
| Earth's race name "Humans" | races | Races keeps Earth human but gives it no entry in `RACES` |
| Armour, heavy plating, three drones, flares, chaff, jammer, targeting computer ids | arsenal (`modules.ts`, `tech.ts`) | `PLACEHOLDER:` ids |
| How munitions fire | arsenal (combat) | Mapped onto main's laser and missile (`ENGINE_WEAPON`) |
| `ShipType`, kill types | ship types (336ace1) | Same union, copied; every kill counts as a cruiser (`craftType`) |
| Shipyard as a station screen | stations and moons | A pause-menu panel |

## Files

New: `src/lib/progression/refs.ts`, `catalog.ts`, `levels.ts`, `economy.ts`, `progress.ts`, `wingman.ts`,
`progression.test.ts`; `src/components/StartScreen.tsx`, `PilotHud.tsx`, `Shipyard.tsx`, `wingmen.ts`;
`PROGRESSION.md`.

Changed: `src/lib/nations.ts` (`PLAYER_NATION` is now `let`, plus `setPlayerNation`), `src/lib/store.ts`
(`progress` in `GameData` and `migrate`), `src/components/combat.ts` (patrols carry their race's cruiser loadout;
`maxHp`, `dodge`; kills reported through `hooks.onKill`; `lastHit`, `root` and `damage` exposed),
`src/components/Voyage.tsx` (an optional `hooks` prop: attach, per-frame update, extra keys, the carried weapons and
their names), `src/components/GameView.tsx` (start screen, pilot panel, shipyard, the hooks), `src/App.tsx`
(`onProgress`), `src/styles.css` (one block at the end), `SPEC.md`, `THREAD-LOG.md`.

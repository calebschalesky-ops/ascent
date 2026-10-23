# Gameplay: what the player touches

Written 2026-10-20 against `claude/integration-3` @ 91bf274 (worktree `.claude/worktrees/integration-3`). Design only:
no source file was edited.

**Status: phase 1 and phase 2 written, 2026-10-20.** Phase 2 is built on `endgame/00-system.md` and the seven house files. `TIMELINE.md` (final, 1,580 lines) is folded in; P2.9 lists what it changed.

## How this was checked

- **Code.** Every claim below cites the file it came from. Paths are relative to the integration-3 worktree.
- **Live, 2026-10-20.** Dev server from `.claude/launch.json` "ascent-integration-3" (it came up on 5398, not 5396,
  because 5396 was taken). The pane was hidden, so I clicked through the opening (Humans, default pilot, default
  ship), skipped the shakedown, and called hooks from `window.__voyage` instead of flying. Three claims were checked
  live: the drone swarm launches at level 1, `fleet.takeCommand()` refuses at level 1, and an infantry order at Earth
  answers "No site here to land on". Everything else is from code and is marked that way.
- **First two hours.** I did not play two hours. "Touched in the first two hours" is an estimate: the XP curve
  (`src/lib/progression/levels.ts`: 50 × L × (L − 1)) and kill rewards (`src/lib/progression/economy.ts`: cruiser 40 XP,
  fighter 15) put a player who fights steadily at about level 3 to 5 after two hours, with no director pushing fights
  at them. That level band decides most of the answers below.

## Corrections to the 2026-10-20 player notes

`PLAYER-NOTES-2026-10-20.md` is mostly right. Four things in it are wrong or out of date once the code is read:

1. **Drones have an unlock: none is needed.** The player carries 16 drones from the first second: 6 explosive, 5 shield,
   5 laser-focus (`src/components/swarms.ts:42`, `PLAYER_RACK`). Hotbar slot 5 picks them, 5 again cycles the role, right
   click launches or recalls (`src/components/Voyage.tsx:831`). Seen live: after `selectSlot(4)` and a right-click,
   the explosive rack read 6 of 6 flying. The problem is that nothing tells the player this, not that it is locked.
2. **Boarding is open at level 1, by accident.** Until fleet command's flagship replaces it, the player nation's own
   capital ship is drafted as a "stand-in escort" that follows the player and launches boarders
   (`src/components/boarding.ts:123-129`). So B (the bound key; see 4) boards a locked cruiser or capital ship if that
   escort is within 250 ship lengths and the target's shield is under 25% (`SPEC.md`, "Drill boarders").
   `INTEGRATION-REPORT-2.md` line 144 saw one boarder launched this way and shot down. No player will find it.
3. **The destroyer exists for enemies only.** Enemy shipyards build destroyers (`src/lib/conquest/state.ts:93`) and
   navies fly them. The player has no route: the only player-side destroyer is the dev proving range
   (`src/components/duel.ts`, `window.__voyage.duel`). Fleet command's "Commander" rank (level 9 and a destroyer) is
   defined (`src/lib/fleet/command.ts`) but nothing sells or hands over a destroyer.
4. **The shakedown teaches keys that no longer do what it says.** The tutorial text (`src/lib/opening/tutorial.ts:45-55`)
   was written before the controls rebind (`src/components/controls/bindings.ts:18-26`). Read from code, not seen on
   screen:

   | Tutorial says | `bindings.ts` default |
   |---|---|
   | Shift to boost | Shift is thrust down; boost is Control |
   | G to change weapon | G is autopilot; weapons are 1–4, F swaps |
   | M map, N computer, R route | M opens nav; R is stance |
   | Space engages autopilot | Space is thrust up; autopilot is G |
   | L docks | Enter docks; L does nothing from the keyboard |

   The same drift is in `SPEC.md` and `INTEGRATION-REPORT-2.md` ("T boards", "7/8/9/0 drones"): T is now fleet
   command, B boards, and drones are slot 5 (`SPEC.md`, "Drone swarms", already says slot 5). The tutorial may check
   actions rather than keys, so a player could pass a step while reading wrong instructions. That needs one live run
   to confirm.

## Inventory

One row per system. "Reach" is what a player has to do today. "2 h?" is whether a first-time player touches it in
the first two hours: **yes**, **maybe** (reachable, never shown), **no** (gated past level 5 or not reachable).

| System | What it does | Reach today | 2 h? |
|---|---|---|---|
| The opening | People, pilot, ship, then an 11-step shakedown and a goal card | New game | yes |
| Races and portraits | Seven peoples, painted heads, a codex | Opening step 1; "Peoples of the System" on the title | yes |
| Weapons and munitions | 10 munitions with lock rules, ammo, energy | Hotbar 1–4; two fitted at start | yes, two of ten |
| Targeting and locks | Lead cross, held locks, brackets | Fire and hold on a target | yes |
| Shields | Facet shields with regen and a held forward block | Right click with a gun slot | yes, the block is untaught |
| Countermeasures | Flares, chaff, jammer | Q or slot 9, if fitted | maybe |
| Shop and loadout | Buy modules by tier, fit slots | Pause menu, Shipyard; E for loadout | yes, and it reads as downgrades |
| Drone swarms | Three racks, three roles | Slot 5, right click, from minute one | maybe |
| Wingman fighters | Bay fighters fly with you | Level 2 gives one free; slot 6 or B/V in ext | yes, if level 2 |
| Infantry carrier | Lands troops on a site and takes it | Level 3; slot 7, right click, near a site | maybe |
| Conquest sites | Capture by holding, income, production | Arrive at a rival world; shoot and hold | maybe |
| Enemy navies and patrols | Patrol rings, alert range, fight back | Fly within alert range or shoot one | yes |
| Stations: docking and repair | Berth on the god armour, repair free | Enter near a berth (tutorial teaches L) | yes |
| Stations: defence | Guns, hangar, mines, raise the world | Shoot a station | maybe |
| Stations: market | Shows prices, buys and sells nothing | Docked screen | sees it, cannot use it |
| God armour | A megastructure over each world: collision, berths, set pieces | Fly to any home world | yes, as scenery |
| Moons | Major moons as destinations, the rest as rocks | Nav map | maybe |
| Atmospheres and low flight | Entry, air flight model, ground | Enter near a body | maybe |
| Drill boarders | Board and capture cruisers and capitals | B on a lock, via the stand-in escort | no in practice |
| Destroyer | A hull between cruiser and capital | Enemy only | no |
| Fleet command | Wings, six orders, tactical view, capital ship | Level 10, then a button | no |
| Capital ship | The player's flagship | Fleet command's "Take command" | no |
| Motivation director | Raids, rival commander, crisis | Not wired | no |
| Death | Respawn near Earth, repaired | Lose your hull | yes, costs nothing |

### The opening

What it does: three setup screens (people, pilot, ship), then an 11-step shakedown flight (throttle, steer, boost, laser,
switch, lock, map, autopilot, dock, repair, undock: `src/lib/opening/tutorial.ts:45-55`), then a goal card. Seen live:
the ship screen shows the hull's damage, shield and lock bonus ("159 damage/s · 100 shield · locks 20% faster") and two
level-1 weapon choices; skipping the tutorial asks once more ("Skip the rest?").

The goal is a stand-in: fly to your people's first rival and kill three of their ships (`src/lib/opening/goal.ts:58-74`).
Its reason text per people is good and is the only story in flight. After it, nothing follows.

2 h: yes. Everyone sees it.

### Races and portraits

What it does: seven peoples with demonyms, governments, ship names and doctrine (`src/lib/races.ts`,
`src/lib/nations.ts`), painted heads (`src/components/codex/art/Portrait.tsx`) shown in the opening, the flight HUD and
the codex (`src/components/codex/RaceCodex.tsx`). Each people has its own level-1 loadout for each hull
(`src/lib/progression/catalog.ts`, `LOADOUTS`) and its own boarder, carrier and destroyer names.

2 h: yes for one people. The other six are met as enemies, by colour and name on the overview. Their doctrine (what
makes Mercury's flak fleet differ from Mars's railguns) is in the loadout tables, so it shows up in fights, but nothing
names it to the player.

### Weapons, munitions, targeting

What it does: ten munitions (`src/lib/munitions.ts`), each with a lock rule (none, optional, required), ammo or energy
cost; the player's capacitor; the lead cross and held locks (`src/components/arsenal.ts`, `src/components/Voyage.tsx`
`barSlots`). Right click with a lock weapon draws it like a bow; with a gun it holds the forward shield
(`src/components/Voyage.tsx:820-827`).

Reach: two weapons fitted at the start, hotbar 1–4 (`src/components/controls/hotbarSlots.ts`). The other eight cost
₡60–₡900 and open by tier at levels 1, 3, 5 and 7 (`levels.ts`, `UNLOCKS`; `economy.ts`, `prices`).

2 h: two of ten for sure. Tier 2 (plasma, swarm missiles, mines) at level 3, if the player saves ₡200–240 at ₡25 a
cruiser. Tier 3 and 4 no. The block and the bow draw are not in the tutorial.

The shop problem the notes found is real: every later gun shows a lower dps than the ₡60 pulse laser
(`catalog.ts`: pulse 84, plasma 64, ion 45, beam 45, torpedo 55), and every later shield a lower capacity than the
tier-1 deflector.

### Shields and countermeasures

What it does: shields per facet with regeneration (`src/lib/shields.ts`); deflector, bi-facet, capacitor, hardened.
Countermeasures: flares, chaff, jammer, on Q or slot 9 (`hotbarSlots.ts`; `bindings.ts`, `counter: 'KeyQ'`).

Reach: a shield is fitted at the start. A countermeasure only if the loadout has one. Of the seven starting cruisers,
only Mercury's and Venus's (flares) and Saturn's (jammer) carry one (`catalog.ts`, `LOADOUTS`).

2 h: shields yes, passively. Countermeasures maybe, and only once enemy missiles land, which needs a fight the player
starts.

### Drone swarms

What it does: three racks of one role each. Explosive drones hunt in a pack, shield drones form a bubble or wall,
laser-focus drones converge their beams (`SPEC.md`, "Drone swarms"; `src/lib/swarm/`). Enemy carriers launch their own
when provoked (`swarms.ts:105`). Point defence and flak thin them.

Reach: from minute one, slot 5 (see corrections). The slot shows the role and "6/6".

2 h: maybe. It is on the hotbar but the tutorial skips slots 5–9, and slot 5 reads as a label, not a thing to try.

### Wingman fighters

What it does: bay fighters launch, fly with the player, shoot, come home (`src/components/wingmen.ts`,
`src/lib/progression/wingman.ts`).

Reach: level 2 opens bay slot 1 and puts a free fighter in it (`levels.ts`; `economy.ts`: "first fighter comes free").
More at levels 4, 6, 8 at ₡150 each from the Shipyard (`src/components/Shipyard.tsx:45-47`). Launch and recall from
slot 6 (`Voyage.tsx:832`).

2 h: yes if the player reaches level 2, which the first goal is built to do. The level-up toast says "Bay slot 1 open"
(`levels.ts`, `unlocksBetween`) but not how to launch.

### Infantry carrier

What it does: a carrier with six squads flies to a site, descends, unloads, fights the garrison, holds, and leaves
one squad as garrison (`src/lib/infantry/carrier.ts:23-37`). It refuses a landing that would cost 80% of its hull on
the way down. Enemy worlds send carriers to retake sites (`src/components/infantry.ts`, header). Squads refill for
credits when docked.

Reach: level 3 for one carrier, level 6 for two (`carrier.ts:77`); the first is free, later ones ₡300
(`infantry.ts:32`, `COMMISSION`). Slot 7, right click, near a site that can be taken (`Voyage.tsx:833`). Seen live at
level 1 at Earth: "No site here to land on" (the site check comes before the level check, so a level-1 player at
Mars would get "Infantry carriers open at level 3").

2 h: maybe. Level 3 is in range, but the player must be at a rival world, near a takeable site, with slot 7 picked,
and know to right-click. Nothing points there.

### Conquest sites and resources

What it does: each world has a capital, cities, forts, a shipyard, a foundry, works and batteries
(`CONQUEST.md` 2.1; `src/lib/conquest/sites.ts`). Batteries halve damage to every other site; forts block cities. Held
sites pay credits per minute of flight time; works produce one of seven resources; worlds trade, so taking a supplier
starves another world's production (`CONQUEST.md` 3, 4). Shipyards and foundries rebuild a broken patrol in 12–16
minutes. Holding the capital with no fort standing controls the world: its ships stand down and become the player's
garrison, and every other world mobilises 20% faster (`CONQUEST.md` 5, 6).

Reach: fly to a rival world. Sites are drawn where they stand (`src/components/conquest.ts`); the arrival card lists
them (`src/components/GameView.tsx` `card`, `ConquestHud.tsx`). Taking one means shooting it to zero and holding, or
landing infantry.

2 h: maybe. The card at Mars says "0 of 11 sites" and lists resources with no hint of what to do (player notes,
section 3). The rules are deep and fair; the player is told none of them.

### Enemy navies and patrols

What it does: each world's ships fly a patrol ring; they engage when the player comes within alert range (12 in
`src/lib/aiKnobs.ts`) or hits or locks one, and go home when the player has been gone a while
(`src/components/enemyAI.ts`, header). They fire through the same munitions and shields as the player
(`src/components/arsenal.ts`, header).

2 h: yes, but only when the player goes to them. Nothing comes to the player (see the director).

### Stations

Docking and repair: berths are hardpoints on the god armour (`src/lib/megastructure/hardpoints.ts`); the autopilot flies
into the cradle; docked, the station screen offers repair, free for now (`src/components/StationScreen.tsx:56`).
2 h: yes, the tutorial does it.

Defence: a provoked station fires its guns, launches fighters from its hangar mouth, lays mines, mends, and raises the
other stations of its world (`src/components/stationDefense.ts`, header; alert ladder in `STATIONS.md` 5.1). 2 h: maybe,
if the player shoots a rival station.

Market: the docked screen shows what the station deals in and its sell and buy prices, and closes while the station
fights. It says "Trading opens when there is a hold to carry goods in" (`StationScreen.tsx:81-88`). Nothing can be
bought or sold. `economy.ts` header: "nothing else (no trading, mining or markets yet)". 2 h: the player sees it and
cannot use it.

Civic systems: tiers, power, four meters (government, military, religion, economy) in `src/lib/station/civic.ts`.
Shown on the station screen; the player cannot change them. 2 h: seen, not touched.

### God armour

What it does: a megastructure over each home world, after its god (`GOD-ARMOUR.md`): Gaia's vault, Selene's veil, the
Kerykeion, Aphrodite's shell, the Ancile, the Talons of Zeus, the Harpe. It collides (`Voyage.tsx:905-932`,
`armourCollide`), holds the berths, carries set pieces (Earth's shipyard ring, Mars's spears to its moon forts:
`src/lib/megastructure/setpieces.ts`), and has hardpoints for turrets, point defence, shield emitters, minelayers,
hangars, markets, temples, reactors and sensors (`hardpoints.ts:28-31`). The station guns sit on provisional mounts,
not yet on these (`stationDefense.ts`, header).

2 h: yes, as scenery and as the thing you dock on. There is no fight against the armour itself: no "stage 2", no
hardpoint the player is asked to break.

### Moons

What it does: major moons are full bodies and destinations; hundreds of small ones are instanced rocks, true to scale
(`src/components/moonScene.ts`, `src/lib/moons.ts`, `src/lib/moonData.ts`). Some conquest sites sit on moons
(`CONQUEST.md` 2.1, "surface or moon").

2 h: maybe. A player who opens the nav map can fly to one. Nothing sends them.

### Atmospheres and low flight

What it does: entering a body's air swaps the flight model (level with the ground, airspeed limits, buffet, crush
depth on the giants, entry glow) and streams the ground (`src/components/planet/planetAir.ts`,
`src/lib/atmosphere.ts`). All seven bodies have a row in `ATMO`; dodging is off in air (`Voyage.tsx`, "No dodge in
air").

Reach: Enter near a body (`bindings.ts`, `enter: 'Enter'`; `Voyage.tsx:1849-1853`).

2 h: maybe. Not in the tutorial. Surface sites (cities, forts, foundries) give a reason to go down, but the player is
not told that either.

### Drill boarders

What it does: a boarder flies at 30 L/s with 20 s of fuel, is shot at by point defence, deflects off a shield above
25%, drills for 2.5 s, then its troops fight the crew. A captured ship changes side, escorts the player, is saved as a
prize and pays like a kill. Enemy capitals board the player's ships (`SPEC.md`, "Drill boarders";
`src/lib/boarding/`; `src/components/boarding.ts`).

Reach: B on a held lock of a cruiser or capital, from a friendly capital within 250 L with boarders left
(`src/lib/boarding/enemy.ts:23-33`). Today that capital is the home navy's stand-in escort (corrections, 2). With
fleet command it should be the player's flagship.

2 h: no in practice. The key is untaught, the shield must be stripped first, and the escort is not shown as the
player's.

### Destroyer

What it does: a hull longer and leaner than the cruiser, three turrets, a short engine bank, a two-slot hangar
(`DESTROYER.md`; `src/components/space/destroyers.ts`; `src/lib/destroyer.ts`). One loadout per people
(`catalog.ts`, `LOADOUTS[n].destroyer`).

Reach: none for the player. Fleet command's "Commander" rank needs level 9 and a destroyer
(`src/lib/fleet/command.ts`, `RANKS`), and nothing provides one. Enemies fly them.

2 h: no.

### Fleet command and the capital ship

What it does: wings, six orders (attack, defend, follow, hold, path, recall), formations, stances, a tactical view,
and a capital ship whose bay launches 2 cruisers and 8 fighters at Captain (`FLEET-COMMAND.md`;
`src/lib/fleet/command.ts`; `src/components/fleet/fleetRuntime.ts`; `src/components/fleet/TacticalView.tsx`).

Reach: level 10 (`command.ts:58`, `canCommand`), then the "Take command of a capital ship" button in the tactical view,
which only shows at level 10 (`TacticalView.tsx:252-257`). T then opens command mode (`bindings.ts`, `command: 'KeyT'`;
`Voyage.tsx`, "Fleet command needs a capital ship"). Seen live: `takeCommand()` returns false at level 1. Level 10 is
4,500 XP, about 112 cruiser kills.

2 h: no.

### Progression

What it does: ten levels; bay slots at 2, 4, 6, 8; tech tiers at 1, 3, 5, 7; levels 9 and 10 open "Nothing yet"
(`levels.ts`, `UNLOCKS`). Kills pay XP and credits; a world's rebuilt ships pay half (`CONQUEST.md` 7). Held sites pay
income.

2 h: levels 2 to about 5. The rungs a player sees are bay slots and tiers, and the tiers read as worse.

### The motivation director

What it does, on paper: decides when the system pushes back: counter-offensives, rebellions, a rival commander
(nemesis) who escapes and returns, coalitions and their raids, a calm-breaker raid, and an endgame crisis with a
warning (`src/lib/motivation/director.ts`, header). Tested in a simulator (`src/lib/motivation/sim.ts`;
`MOTIVATION.md` 8).

Reach: none. No component imports `src/lib/motivation/` (grep of `src/components`, `App.tsx`, `main.tsx` on
2026-10-20). `goal.ts` names itself the seam where it should plug in.

2 h: no.

### Death

What it does: hull at zero shows "SHIP LOST · respawning near Earth (placeholder)" and the ship comes back at the
start, refitted (`Voyage.tsx:173`, `Voyage.tsx:1361-1371`). `arsenal.ts` header: "no lore, no penalty".

2 h: yes, and it costs nothing.

## What phase 1 says the design has to fix

These are the gaps phase 2 has to give a reason and a moment to. They are findings, not the design.

1. **Nothing comes to the player.** Every fight is one the player starts. The director exists and is unwired.
2. **Three systems are on the hotbar with no prompt**: drones (slot 5, open now), infantry (slot 7, level 3), and the
   block and draw on right click. They need an in-world event that hands them over, not a level.
3. **Three systems have no route at all**: the destroyer, the capital ship before level 10, and boarding as a thing
   the player owns. The levels in the upgrade brief (wingman 2, drones 3, boarding 4, destroyer 6, fleet command 8,
   capital 9–10) need a matching event each, because today only the wingman's has one (the level-2 toast).
4. **The tier numbers go down** (`catalog.ts`), so the shop teaches the player that upgrading is a mistake.
5. **Markets, civic meters and god-armour hardpoints are displayed and inert.** Each needs a verb before it needs a
   reason.
6. **The tutorial's key text is stale** (corrections, 4), and the keys for slots 5–9 are never taught.
7. **Death is free**, so nothing in phase 2's 5-minute fight can have stakes until it costs something.

## Phase 2: the design

Written 2026-10-20 from `endgame/00-system.md`, the seven house files in `endgame/`, `ENDGAME.md`, `FEUDS.md` and
`MOTIVATION.md` (integration-3 worktree), then checked against the final `TIMELINE.md`. What the timeline changed is
in P2.9.

Every number here is first pass, for Palamedes. Times are from the first undock. Where this design changes a ruling
or a brief, it says so and says why.

### P2.1 What the design rests on

Three assumptions. If one is wrong, the sections that name it need redoing.

1. **The XP curve is `MOTIVATION.md` 2.1's new one** (level 10 at 16,000 XP, Renown after), not today's
   (`levels.ts`, 4,500). On today's curve, conquest pays level 10 before the second world falls (`MOTIVATION.md`
   2.1), so every level gate below would land too early.
2. **Your house's own capital ship flies with you from minute one.** The code does this already as a stand-in
   (`boarding.ts:123-129`). This design makes it canon: the house flagship escorts its new captain, lends boarders,
   and is the ship you take command of later. It gives four rungs one continuous thread.
3. **The pace is `00-system.md` 13's `paceGuess`**: world 2 at 0:40, world 3 at 1:30, world 4 at 2:30, world 5 at
   3:30, the drop at 4:45, the end at 5:20. That is about 30–60 minutes per world.

### P2.2 The loop at three scales

#### The 5-minute fight: a raid

The unit of play. It comes to you: the director deals it (`00-system.md` 2.1; `FEUDS.md` 5, "your blood enemy raids
you on a clock").

| Minute | What happens | Systems used |
|---|---|---|
| 0:00 | A card: the raiders' captain on the channel, portrait and one line, and a beacon on the map | director, portraits, nav |
| 0:30 | Contact. Their seekers lock you; you hear the lock tone | enemy AI, targeting, locks |
| 1:00 | You flare or chaff the first missile, block a burst on right click, lead your guns onto a fighter | countermeasures, shields and block, weapons |
| 1:30 | Your wingman and your drones go in. Shield drones wall the side the missiles come from | wingmen, drone swarm |
| 3:00 | A raider's shield is stripped and it limps. You can kill it for pay, or board it from the house flagship and keep it | ion or any gun, drill boarders |
| 4:00 | The last one runs. A cruiser that escapes is rebuilt by its world's yard as a levy (`CONQUEST.md` 7) | conquest production |
| 5:00 | Reward card, then the relax gap (`relax`, 3 minutes) | progression, director |

**Why the player wants to fight it.** The raider is not random. It flies the colours on your goal card, and its feud has a dated
start: Earth and Mars since the Secession War (4402–4419), the Moon and Venus since the Nika Burning (4791), Mars and
Jupiter in the Fifth Belt War since 5961 (`TIMELINE.md` 11). From world 3 it is the rival's own people,
and at world 3 the rival themselves. A raid you ignore costs income at the site it hits (`rivalRaidIncomePct`).
Losing has to cost something too: see GP-15.

#### The 30-minute operation: take a world

The unit of progress. The order is `CONQUEST.md` 5's: break the patrol, then the batteries, the shipyard and foundry,
the works, the forts and the capital. This design puts a system on each step.

| Minutes | Step | Systems used | Why the lore makes you want it |
|---|---|---|---|
| 0–6 | **Break the patrol** in orbit | weapons, locks, wingmen, drones, boarding | It is the fleet that raided you; its captain is on the card |
| 6–11 | **Knock out the batteries.** On a home world they are gun hardpoints on the god armour (`hardpoints.ts`), so this teaches Katabasis stage 2 small | god armour, station defence | Every other site takes half damage while a battery stands (`CONQUEST.md` 2.1) |
| 11–16 | **Take or wreck the shipyard and foundry**, so the patrol stops coming back | conquest sites, boarding (a yard's slip ship), destroyer | A held shipyard finishes the ship on its slip for you (rung 6, P2.4) |
| 16–20 | **Take the works you want.** Each one cuts somebody's trade | conquest resources, markets | Taking Titan's methane slows every navy that burns it (`CONQUEST.md` 1); you sell the stockpile at a market |
| 20–27 | **The forts, from the air.** Fly low under the guns and land infantry | atmosphere and low flight, moons (Phobos and Deimos are Mars's forts), infantry carrier | No city can be taken while a fort stands |
| 27–32 | **Hold the capital** while the relief fleet (`counter`) arrives | infantry, fleet command, shields | Then, from world 3, chains or broken (BEAT-3A) |
| after | **Set the garrison**: the world's own navy stands down and becomes yours (`CONQUEST.md` 5); give it orders | fleet command | It is what keeps the rival's raid at world 3 from burning your yard |

The world panel shows the caste line and its breaking point from the first approach (`ENDGAME.md` 3, "the player
sees the choice coming"). That is the reason the operation has weight before world 3: you can see whose world you are
about to own, and what they want.

#### The multi-hour campaign: seven capitals

The beats come from `00-system.md` 3, at the `paceGuess` times. Each beat is where a group of systems peaks.

| Time | Worlds held | Beat | Systems that peak |
|---|---|---|---|
| 0:00–0:40 | 1 | The feud war (`FEUDS.md`) | guns, drones, wingmen, boarding, first sites |
| 0:40 | 2 | First world taken | infantry, atmosphere, fleet command (the first garrison), markets |
| ~1:30 | 2→3 | Capital ship (rung 9) just before the Reckoning | capital ship, fleet command in full |
| 1:30 | 3 | **The Reckoning**: chains or broken, the drift, the rival's raid | fleet command (defending away from you), the world panel, the rival |
| 2:30 | 4 | **The Stirring**: fuses on chained worlds, gifts from broken ones | infantry as garrisons, unique ships from the gifts, markets (overseers, SYS-05) |
| 3:30 | 5 | **The Last Alliance**: the Grand Armada, the betrayal | your home's god armour and station defence, fleet command, Mercury contracts at the market, torpedoes on capital ships |
| 4:45 | 6 | **The Katabasis** on the last capital | everything, in order: the fleet, the armour, the drop, the palace |
| 5:20 | 7 | The ending | portraits, the world records, the slideshow |

**Why the player wants all seven.** It is the only win (`FEUDS.md` 1). Holding all seven is the stated goal, but the
pull is the people: the rival who keeps getting away, the ally who will sell you, the caste on each world whose fate
the player sets. The ending's name is set by the broken count, so the player plays toward the ending they want.

### P2.3 Every system: a lore reason and a moment

"First moment" is where a player meets it. "Endgame moment" is where it matters most. Rungs are in P2.4.

| System | Lore reason | First moment | Endgame moment |
|---|---|---|---|
| **The opening** | Year 6000, three thousand years after the Charter of the Apoikiai (3000), and the three-thousandth Founding Day falls in the first hours of play (`TIMELINE.md` 9) | The goal card names your blood enemy and why (`goal.ts`, `WHY`); inside two hours, Founding Day (SYS-11): light a lamp back to Earth or not | The ending's title line repeats the year (`00-system.md` 8.1) |
| **Races and portraits** | Every caste was edited, and every edit shows in a face | Your own pilot; the raid captain's face on the first raid card | The rival's portrait on the ending screen (`00-system.md` 8.1 step 3) |
| **Pulse, seeker, rail, flak** (tier 1) | Each house's doctrine (`catalog.ts`, `LOADOUTS`): Mercury's flak walls, Mars's railguns | The first raid | Always the backbone |
| **Plasma, swarm missiles** (tier 2) | Hull-breakers for the cruisers that come with the second raid lane | Rung 3: the first raid with a cruiser in it | Breaking a world's rebuilt navy |
| **Proximity mine** (tier 2) | Raiders chase. Saturn's Paralos raid at long range and turn for home (`saturn.md` F); Lakedaimon is a moving target you pursue (`mercury.md` F) | A raid that runs and comes back: drop mines on the line they take home | The Mercury drop, where the King of the Field's escorts chase your carriers along the rail |
| **Ion shot** (tier 3) | Boarding needs a ship's shield under 25% (`SPEC.md`, "Drill boarders"). The ion is the boarder's key | Rung 4, the first boarding: a card says "strip her shield" | Capturing the rival's flagship (`ENDGAME.md` 4, "capture him") |
| **Beam laser** (tier 3) | Shield emitters on the god armour are small and still: the beam holds on them | First battery or armour emitter | Katabasis stage 2 |
| **Torpedo** (tier 4) | Built to kill capital ships | The first enemy capital you meet, in a world's home fleet | The Grand Armada's capital ships, and Katabasis stage 1, which ends when the capital dies |
| **Targeting and locks** | Unchanged from the tutorial | Shakedown step 6 | Lock the rival's flagship for the boarders |
| **Shields and the block** | Your house's shield (deflector, bi-facet, capacitor or hardened) is part of its doctrine | First raid, taught by the card: "right click holds the shield forward" | "The gates open": your home's shields go dark, and yours are all that is left (`00-system.md` 5.5) |
| **Countermeasures** | Mercury, Venus and Saturn fly flares and jammers because they never win a straight fight (`catalog.ts`) | First enemy seeker lock | Venus's Siphons in the boarding fights (`venus.md` A) |
| **Drone swarm** | The houses that can't spend crews spend drones | Rung 3: an enemy carrier's swarm hits you, then your yard fits your racks | Shield drones over carriers in the drop |
| **Wingman fighters** | Your house sends its new captain a wing. How it sends it depends on the house (P2.5) | Rung 2, after the first raid | "Every wingman that ally gave you turns hostile" (`00-system.md` 5.5). Gifted wingmen are the betrayal's knife |
| **Drill boarders** | Taking a ship whole is worth more than burning it, and the Campus Martius teaches boarding first (`mars.md` E) | Rung 4: a crippled raider, and the house flagship offers a boarder | **Taking the rival's flagship** (`ENDGAME.md` 4); the Mars drop through the rock (`mars.md` F) |
| **Infantry carrier** | Forts and capitals fall to troops, not guns | Rung 5: the first fort | **The Katabasis drop** (stage 3) and the palace hold (stage 4) |
| **Destroyer** | The fast hull for answering raids across your worlds: three turrets, a short engine bank, two hangar slots (`DESTROYER.md`) | Rung 6: the ship on the slip of the first shipyard you take | Running between burning worlds at the Stirring; enemy destroyers in Katabasis stage 1 |
| **Fleet command** | **How you hold your worlds while you are away** | Rung 8: your first world's navy stands down and asks for orders | The Grand Armada, and splitting the coalition (`00-system.md` 4.3) |
| **Capital ship** | The house flagship that escorted you since minute one is handed to you | Rung 9: the mission "Take command" | The rival's flagship and yours in the Grand Armada; drill boarders launch from it |
| **Conquest sites** | Each world's arsenal (`CONQUEST.md` 1) | The first rival patrol's home world | The capital site is Katabasis stage 4, the palace |
| **Resources and trade** | Every navy burns someone else's fuel. Saturn starves you at the Reckoning rather than raiding (`saturn.md` A) | Taking the first works cuts a rival's supply | Kill the Holkas tankers and the alliance's cruisers go home (`saturn.md` A) |
| **Markets** | **Mercury's contracts are paid here**, and so are truces, overseers and fuel | Rung 7: sell your first stockpile, then hire your first Mercury company | Outbid the alliance's pool for Mercury's companies (`mercury.md` A) |
| **Stations: dock and repair** | Your house's station is home | Shakedown | Holding your home station against the Grand Armada for `homeHold` minutes |
| **Station defence** | A station raises its whole world when provoked (`STATIONS.md` 5.1) | Shooting the first rival station brings its fighters out | "The gates open": your own station's guns go quiet |
| **Civic meters** | The station's government, military, religion and economy readings (`civic.ts`) show what the world will do | The world panel at your first held world | The fuse at the Stirring; the Moon's religion reading is the Sacred War |
| **God armour** | Each house built a god over its world (`GOD-ARMOUR.md`) | Batteries on its hardpoints at the first home world you attack | **Katabasis stage 2 of every last capital**; your own armour at the Last Alliance |
| **Moons** | Half the capitals are on moons: Kallistopolis on Callisto, Astu on Titan; Mars's forts are Phobos and Deimos; Io is Jupiter's breaking point (`jupiter.md` C) | Mars's moon forts, or Titan if you go for Saturn first | Callisto and Titan drops |
| **Atmospheres and low flight** | Forts and cities are on the ground | Rung 5: the first fort | The drop: Earth's tether, Venus's acid clouds, Titan's methane sea (house files, F) |
| **Enemy AI and patrols** | Standings decide who shoots (`FEUDS.md` 2) | The first raid | Coalition cohesion: blood enemies inside the alliance will not cover each other |
| **The director** | The story is the houses moving, not a script (`FEUDS.md` intro) | The first raid inside 60 s | Every beat |
| **Death** | A captain who loses a ship answers for it | First death in a raid | Exile when your home falls (`00-system.md` 7) |
| **Progression and the shop** | The yard fits what the war has taught it | Rung 2 | Renown past level 10 |

### P2.4 The unlock ladder

Fitted to the upgrade brief (wingman 2, drones 3, boarding 4, destroyer 6, fleet command 8, capital ship 9–10). Two
changes, both said in the "Change" column. Times use the new curve (`MOTIVATION.md` 2.1: level 2 at ~0:03, 3 at
~0:10, 4 at ~0:13, 5 at ~0:19, 6 at ~0:25, 7 at ~0:30, 8 at ~0:55, 9 at ~1:35, 10 at ~2:25).

**Each rung needs a level and an event.** The level says you are ready; the event hands the thing over in the
fiction. If the event has already happened when the level arrives, the rung opens at once. If the level arrives first,
the director deals the event within `rungEventDelay` minutes (proposed: 3). No rung opens on a toast alone.

| Rung | Level | Lands | What opens | The in-world event that introduces it | Change from the brief |
|---|---|---|---|---|---|
| 1 | 1 | 0:00 | Cruiser, two guns, shield, the house flagship as escort | The shakedown, then the first raid inside 60 s: two blood-enemy fighters, winnable (`FEUDS.md` 5) | Replaces the "break a navy" goal (`goal.ts`) |
| 2 | 2 | ~0:03 | **Wingman** (one bay fighter) | The first raid is beaten. The flagship's deck sends you a pilot, by name | none |
| 3 | 3 | ~0:10 | **Drone racks** (16 drones), tier-2 tech | The second raid brings a cruiser with a drone swarm. After it, your yard fits your racks: "you've seen theirs" | Drones are open at level 1 in code (`swarms.ts:42`); hide slot 5 until here |
| 4 | 4 | ~0:13 | **Drill boarders**, launched from the house flagship | A raider limps with its shield gone. The flagship's captain asks if you want her whole | none. Boarding stays on the flagship (assumption 2) until rung 9 |
| 5 | 5 | ~0:19 | **Infantry carrier**, tier-3 tech | The first fort on a rival world blocks a city. The carrier comes down from the flagship | **Moved from 3 to 5** (`carrier.ts:77`). At 3 the player has no fort to land on, and nothing in the first 10 minutes needs troops |
| 6 | 6 | ~0:25 | **Destroyer**, as a hull you can fly | You take or wreck a rival shipyard. The ship on its slip is yours; or, at level 7 without one, your home yard delivers it | none |
| 7 | 7 | ~0:30 | **Markets trade**; tier-4 tech | Your first held works fills a stockpile. A station offers to buy it; a Mercury factor offers a company | new rung, in the empty gap at 7 |
| 8 | 8 | ~0:55 or first world | **Fleet command** over your bay, destroyer, prizes and garrisons | The first world you control: its navy stands down and its admiral asks for orders (`CONQUEST.md` 5) | Opens at level 8 **or on first world controlled, whichever comes first**. At `paceGuess` the first world falls at ~0:40, and its garrison needs orders then, not 15 minutes later |
| 9 | 9 | ~1:35 | **The capital ship**: the house flagship becomes yours | Mission "Take command": escort the flagship home through a raid, about 6 minutes (`MOTIVATION.md` 2.3). Needs one world controlled and a helium-3 source (`CONQUEST.md` 6) | 9, not 10: the Reckoning lands at ~1:30, and the rival's raid at world 3 needs a capital ship to answer |
| 10 | 10 | ~2:25 | **Admiral**: the armada cap, more wings | Three worlds held, the Reckoning. Your house names you its admiral because it is now at war with everyone | none |
| — | 10+ | from ~2:45 | **Renown**: +5 command points a step | Each world taken after the Reckoning | `MOTIVATION.md` 2.1 |

**Tier numbers.** Tier tech stays at 1, 3, 5, 7. Each tier must beat the tier below **on the number the screen
shows for its job** (GP-04): the torpedo's anti-capital damage, the ion's shield damage, the plasma's hull damage. The
Shipyard leads with that number, not with general dps.

**The house flagship's arc** is the thread through rungs 1, 2, 4, 5 and 9. It escorts you, sends your wingman, lends
your boarders, carries your first troops, and then it is yours. Its captain is a named character with a portrait who
hands you the ship at rung 9. If the flagship dies before rung 9, the house sends a new one (`yardCycle`), and the
captain's death is a card.

### P2.5 Per-house play

Each house differs in three places: the first hour (who comes for you, and how your house hands over rungs 2–5), the
rival you meet, and the endgame (what breaking costs you, and who is likely to betray you). Sources: `FEUDS.md` 4;
each house file's sections A, D and E; `00-system.md` 1.2.

#### Earth (Humans)

- **Loaded in 6000** (`TIMELINE.md` 9): the naval share (5995), a member nation ready to walk out with its ships; the Ark turning in Dry Dock One since 5982.
- **First hour.** Undock at Pharos. Two Martian fighters inside the minute (`FEUDS.md` 4). The Moon is Friendly and
  Venus courts you, so the first hour has one enemy and two friends to try trading with. The flagship is a Metropolis
  carrier, and the wingman at rung 2 flies under the flag of a League member nation, not Earth's. When the League
  argues (`earth-ev-2`), that wingman can leave with its nation.
- **The rival:** the Legate, a Campus Martius graduate, flagship *Fides* (`mars.md` E).
- **Natural first target:** Mars, the blood enemy, or Saturn, which ignores Earth (`00-system.md` 11.1).
- **Endgame.** Breaking costs Medium. Breaking Earth itself is the Ark reveal: the "only free people" built a caste in
  secret (`ENDGAME.md` 2). The likely betrayer is the Moon, which betrays with your own station's founding codes
  (`moon.md` A).

#### The Moon (Selenitai)

- **Loaded in 6000:** two houses in arrears at Pytho (5993) and Mars's unpaid answer (5997). The vault vote is the first-hour background.
- **First hour.** Nephelan raiders. You have the smallest navy and the best protection: anyone who attacks you
  calls a Sacred War on themselves (`FEUDS.md` 3). The Moon's first hour is the only one where the player calls
  allies before fighting. The Phylakterion trains officers to command other people's ships (`moon.md` E), so the rung-2
  wingman is **borrowed** from a Friendly house's Sacred War contingent and goes home if that house cools.
- **The rival:** the Drungarios of the Magnaura, flagship *Chrysotriklinos* (`venus.md` E).
- **Endgame.** Medium price, plus: breaking any world costs Moon income as depositors pull out, and breaking the Moon
  ends Sacred War protection for good (`moon.md` D). Taking the Moon as somebody else is the hardest diplomatic
  problem in the game (`FEUDS.md` 3).

#### Mercury (Hemerodromoi)

- **Loaded in 6000:** nine bad kilometres of rail ahead of Lakedaimon (5999), and two of your own companies on opposite contracts. Your home's breaking point is already close when you undock.
- **First hour.** No blood enemy. The first raid is a **contract**: a company hired against you by whoever bid first,
  under the Lochagos of another house's choosing. Mercury is the hard mode (`FEUDS.md` 4). The rung-2 wingman is a
  hired Aspis on a term, and it renews at the market. Mercury reaches rung 7's market in the first ten minutes,
  because renting out your own companies is how Mercury earns (`mercury.md` A).
- **The rival:** from the school of whichever house first contracts against you (`ENDGAME.md` 4).
- **Endgame.** High price, and the ephors put your King of the Field on trial (`mercury.md` D). Mercury is the
  easiest house to come back from exile with: hired-out companies keep paying.

#### Venus (Nephelai)

- **Loaded in 6000:** Chrysopolis losing lift (5999), an Autokrator of ninety-five with no co-emperor (5966), and the first Green–Blue race since the Burning proposed (5999).
- **First hour.** Selenite-paid raiders under a Mercury flag, and Jupiter's crown rivalry on the side. Venus pays,
  marries or bribes before it fights (`venus.md` A), so a Venus start opens with credits to spend at the market and a
  weaker fleet. The rung-2 wingman is a Smaragdos painted by the family that paid for it, and the family wants
  something back.
- **The rival:** the Hieromnemon of the Phylakterion, flagship *Kastalia* (`moon.md` E).
- **Endgame.** High price; every break fires the court revolt (VEN-05). Breaking Venus gives the Aerobatai, the best
  pilots in the system (`venus.md` D). At the Katabasis, cutting the envelope wins at once and drops the city into
  the heat (`venus.md` F).

#### Mars (Quirites)

- **Loaded in 6000:** Legate Asper's three headcount legions on the Ceres line (5994), and a consul's draft treaty calling the Secession a mistake (5998).
- **First hour.** A war on two fronts from the first minute: Earth's raiders and the belt war with Jupiter, which is
  already burning (`FEUDS.md` 4). Mars is the fastest start to rung 4: the Campus Martius teaches boarding first
  (`mars.md` E), and Mars's cruisers are Corvus boarding cruisers. **Mars boards at level 3** and gets drones at 4.
- **The rival:** a Royal Pages graduate (`jupiter.md` E) or a Strategeion one (`earth.md` E). The files disagree; see
  the contradictions.
- **Endgame.** Low price. Breaking Mars gives the Headcount Cohort: every drill boarder drills 25% faster for the rest
  of the game (`mars.md` D). Chained Mars needs the largest garrison of any capital (4).

#### Jupiter (Diadochoi)

- **Loaded in 6000:** the wedding talks (5996), Lykon on the Io Prison-fort (5996), and Callisto escorts at Titan since 5990.
- **First hour.** The belt war with Mars, already burning, and no safe ally (`FEUDS.md` 4). The player is one of two
  crowns (`jupiter.md` A). The rung-2 wingman is a Companion, a noble who flies a Hetairos because flying the fighters
  is what the nobility does, and who wants a title for it. A natural first target is Saturn, the "cousins"
  (`00-system.md` 11.2).
- **The rival:** the Legate of the Campus Martius (`mars.md` E).
- **Endgame.** High price; JUP-E5 court revolt and home income −15% until your next world (`jupiter.md` D). Breaking
  Jupiter makes Io walk out under the false heir, a third crown (`ENDGAME.md` 2).

#### Saturn (Autochthones)

- **Loaded in 6000:** the fuel vote against Earth (5988), Jovian escorts at Titan (5990), and the birth files on the relays.
- **First hour.** No blood enemy; Jupiter and Mars both press Titan (`FEUDS.md` 4). The first raid comes from
  whichever claim house the director picks. Saturn starves others before it fights them (`saturn.md` A), so the Saturn
  start reaches rung 7 early: it sells fuel. The rung-2 wingman is a Glaux glider whose pilot was chosen by lot.
- **The rival:** undefined in the files (see the contradictions). Proposed: the Royal Pages, since Jupiter's claim on
  Titan is the louder one.
- **Endgame.** Low price. Breaking Saturn gives two Holkas tankers that refuel your fleet (`saturn.md` D). Saturn is
  the one house that votes on betraying you in public, and you get one card to argue (SAT-G6).

### P2.6 The director's count: held against turned

The message from the parent session: `director.ts` counts worlds turned (held minus your home), so its coalition
fires at 3 held and its crisis at 5, while `ENDGAME.md` puts the coalition (the Last Alliance) at 5 held.

Read from code (`src/lib/motivation/tables.ts:218,225`; `director.ts:57,95`): `coalitionAt: 2` turned and
`crisisAtTurned: 4` turned, so 3 held and 5 held. `00-system.md` 2.4 already maps them that way: the code's
`coalition` is the Reckoning's drift and raid lanes, and the code's `crisis` is the Grand Armada. **The numbers
agree. The names don't**, and that will mislead whoever wires it. Two more mismatches:

1. `director.ts:57` announces the crisis the moment `turned` reaches 4. `00-system.md` 3.3 wants a `marchWarning`
   countdown (12 minutes) before the Armada arrives.
2. `turned` counts worlds held minus home. A vassal counts as held (`FEUDS.md` 1), and in exile your home is not
   held, so `held − 1` is wrong in both cases.

The fix is in GP-02: the director counts `held` (capitals plus vassals) and `broken` directly. Rename `coalition` to
`reckoning` (at 3 held) and `crisis` to `lastAlliance` (at 5 held, with the warning). Keep the "coalition" name only
for the Grand Armada's members and their cohesion (`00-system.md` 4).

### P2.7 Work packages

Each package has its files, what done means, and what it waits on. **[feuds]**, **[upgrades]** and **[screen]**
mark the packages that refine one of the three proposed briefs. Those packages should be folded into the brief they
name, not dispatched alongside it. Unmarked packages are new work.

**Order.** Wave A makes the first hour work. Wave B makes the first operation work. Wave C makes the campaign work.
Packages within a wave can run in parallel unless one says it waits on another.

#### Wave A: the first hour

**GP-01 Standings and feuds** [feuds]
- Files: new `src/lib/diplomacy/standings.ts` (+ test); `src/components/enemyAI.ts`.
- Done: a 7×7 table with `FEUDS.md` 3's starting values and `CONTRACT.md`'s bands; blood feuds locked; Hostile and
  Blood fleets engage on sight, Wary shadow, Friendly and Allied hold fire (`FEUDS.md` 6.2). A test proves every
  start's blood enemy.
- Waits on: nothing.

**GP-02 The director, wired** [feuds]
- Files: `src/lib/motivation/director.ts`, `tables.ts`; `src/components/GameView.tsx`; `src/lib/opening/goal.ts`.
- Done: the director runs on flight time from `GameView`. It counts `held` and `broken` (P2.6), and the code's
  `coalition`/`crisis` are renamed `reckoning`/`lastAlliance`, with the march warning. The first raid (two
  blood-enemy fighters) arrives inside 60 s of the first undock and replaces the stand-in goal. Seen in the browser,
  pane visible.
- Waits on: GP-01.

**GP-03 Numbers that only go up** [upgrades]
- Files: `src/lib/progression/levels.ts`, `economy.ts`, `catalog.ts`; `src/components/Shipyard.tsx`.
- Done: the `MOTIVATION.md` 2.1 curve and kill pay. Every tier beats the tier below on the number it shows for its
  job (P2.4). The first purchase is affordable after 2–3 kills. Palamedes's sim proves both.
- Waits on: nothing.

**GP-04 The hotbar and the tutorial tell the truth** [screen]
- Files: `src/lib/opening/tutorial.ts`; `src/components/controls/Hotbar.tsx`, `hotbarSlots.ts`; `Voyage.tsx`
  (`barSlots`).
- Done: tutorial text reads its keys from `bindings.ts`, so it can't drift again (phase 1, correction 4). A slot shows
  only once its rung is open. A slot that just opened pulses once, with a one-line hint naming its key.
- Waits on: GP-05 for the rung list (can start with today's gates).

**GP-15a Death costs something**
- Files: `src/components/Voyage.tsx:1361-1371`; `src/components/arsenal.ts`; `src/lib/progression/progress.ts`.
- Done: losing the ship loses the fighters and drones that were out, the troops aboard, and `deathCreditsPct` of
  credits (proposed: 10%). You respawn at your nearest held station, not "near Earth"
  (`INTEGRATION-REPORT-2.md` decision 1). **Caleb's call on the size.**
- Waits on: nothing.

#### Wave B: the first operation

**GP-05 Rungs as events** [upgrades]
- Files: new `src/lib/campaign/rungs.ts` (+ test); `src/lib/fleet/command.ts` (`RANKS`); `src/lib/infantry/carrier.ts:77`.
- Done: P2.4's table as data. Each rung has a level, an event card and an opener. The director deals the event if the
  level comes first. Infantry moves to rung 5. Fleet command opens on level 8 or the first world controlled. The
  capital ship opens at level 9 with the "Take command" mission. Per-house variants (Mars boards at 3) are rows.
- Waits on: GP-02, GP-03.

**GP-06 The house flagship**
- Files: `src/components/boarding.ts:123-129`; `src/components/fleet/fleetRuntime.ts` (`takeCommand`, `setRank`).
- Done: the stand-in escort is canon: it is named, follows you, launches your boarders (rung 4) and carries your first
  carrier (rung 5). "Take command" hands it over without respawning a new hull. It is replaced if it dies.
- Waits on: GP-05.

**GP-07 The player's destroyer**
- Files: `src/lib/fleet/command.ts` (Commander rank); `fleetRuntime.ts`; `Shipyard.tsx`; `src/lib/conquest/state.ts:93`.
- Done: taking or wrecking a shipyard site hands over the destroyer on its slip, and the home yard does it at level
  7 otherwise. The player can switch hulls at a station. Fleet command's two-wing Commander rank works on it.
- Waits on: GP-05.

**GP-08 Fleet command without a capital ship**
- Files: `fleetRuntime.ts`; `src/components/Voyage.tsx` (the `command` action, "Fleet command needs a capital ship");
  `TacticalView.tsx:252-257`.
- Done: T opens command mode over the bay, destroyer, prizes and every controlled world's garrison from rung 8. A
  garrison holds its world on a `defend` order while you are away, and a raid on it shows on the tactical view.
- Waits on: GP-05, GP-07.

**GP-09 Markets with verbs**
- Files: `src/components/StationScreen.tsx:81-88`; `src/lib/station/civic.ts`; `src/lib/progression/economy.ts`.
- Done: sell a held works' stockpile at a station that buys it (no hauling in version 1). Hire and renew a Mercury
  company (`mercury.md` A's lochos and mora, terms, outbid, the Skytale tell). Buy a truce. Pay overseers (SYS-05).
  Each verb shows its price.
- Waits on: GP-01 (truce and contract prices read standings).

**GP-10 The world panel**
- Files: `src/components/ConquestHud.tsx`; `GameView.tsx` (`card`); new `src/lib/endgame/houses.ts`.
- Done: every capital's panel shows its caste, its work and its breaking point from the first approach (`ENDGAME.md`
  2). Held worlds show unrest, garrison and the fuse. The station civic meters feed it: government is unrest,
  military is garrison, religion is the Sacred War status, economy is income.
- Waits on: GP-11's house records.

#### Wave C: the campaign

**GP-11 The endgame as data**
- Files: new `src/lib/endgame/` (records, cards, effects, + tests).
- Done: `00-system.md` 13 and every house file's section I as typed records. Every card in the `CONTRACT.md` format
  parses. Every effect in `CONTRACT.md`'s vocabulary plus `00-system.md` 12's new effects has an implementation. A
  test checks every house has every field.
- Waits on: nothing. It can start in wave A.

**GP-12 Chains or broken, the Reckoning and the Stirring**
- Files: `src/lib/endgame/`; `director.ts`; `GameView.tsx`; a new prompt component.
- Done: BEAT-3A, 3B and 4A play. The house price tiers apply (`00-system.md` 1.2). Breaking points queue in the
  one crisis slot with staggered fuses. A world that breaks itself counts and pays half.
- Waits on: GP-02, GP-10, GP-11.

**GP-13 The rival**
- Files: `src/components/codex/art/Portrait.tsx` and the race-art pipeline; `src/lib/endgame/`; `director.ts`
  (`nemesis`).
- Done: one rival per game, rolled from the house file's names, with a portrait, a named flagship and scene lines at
  worlds 3, 5 and 6. `nemesisEscapes` is at least 2. Killed, captured or turned, each with its rule.
- Waits on: GP-11, GP-12.

**GP-14 The Last Alliance and the betrayal**
- Files: `director.ts`; `src/lib/fleet/`; `src/components/stationDefense.ts`; `src/lib/endgame/`.
- Done: the Grand Armada forms from every unbeaten house at 5 held, with cohesion and its seven events
  (`00-system.md` 4.2). The betrayer is picked by 5.1's rule, and its tells fire from world 4. "The gates open" turns
  off home station guns and turns gifted wingmen. Mercury joins by bid, and the Moon leaves if fired near Pytho.
- Waits on: GP-08, GP-09, GP-12, GP-13.

**GP-15b Exile**
- Files: `src/lib/endgame/`; `GameView.tsx`; conquest state.
- Done: losing your home moves you to the strongest held world. The rival governs your home and changes it
  (`00-system.md` 7.2). Retaking it is a short Katabasis. Holding nothing ends on the rival's screen.
- Waits on: GP-14, GP-16.

**GP-16 The Katabasis runner**
- Files: new `src/lib/endgame/katabasis.ts`; `src/components/armourScene.ts`, `src/lib/megastructure/hardpoints.ts`
  (emitters and gun hardpoints become targets that break and regrow); `planetAir.ts`; `infantry.ts`; `boarding.ts`.
- Done: the four stages and the retreat rule (`00-system.md` 6) run on one generic capital. Stage 2 is real armour
  sections over a landing cell. Stage 3 runs carriers and boarders through the air in a window. Stage 4 is a hold
  timer.
- Waits on: GP-06, GP-08, GP-11. This is the biggest package. Split it by stage if one session can't hold it.

**GP-17 The seven twists**
- Files: `src/lib/endgame/katabasis.ts` (one variant per house); the scenes the twist needs.
- Done: each house file's section F playable: Earth's tether, Pytho's Sacred War waves, Lakedaimon's moving rail,
  Venus's envelope, Mars's true boss and lava tubes, Callisto's domes (fought at Jupiter's armour first), Astu's
  methane sea. One per session.
- Waits on: GP-16.

**GP-18 The ending screens**
- Files: a new ending component; `src/lib/endgame/`.
- Done: `00-system.md` 8: title, the slideshow in order, the rival, the count, continue. The rival's version runs on
  game over.
- Waits on: GP-11, GP-13.

**GP-19 The pace, simulated**
- Files: `src/lib/motivation/sim.ts`; `integration/` reports.
- Done: Palamedes runs the rung table (P2.4) and `paceGuess` through the simulator for all seven starts and reports
  every rung or beat that lands outside its window.
- Waits on: GP-03 and GP-05. Re-run after each wave.

**Dependencies, in one line each.** A: GP-01 → GP-02. GP-03, GP-04, GP-15a and GP-11 are free. B: GP-05 needs A, then
GP-06, GP-07 and GP-09 run in parallel; GP-08 waits on GP-07; GP-10 waits on GP-11. C: GP-12 → GP-13 → GP-14 → GP-15b.
GP-16 → GP-17. GP-18 needs GP-13. GP-20 (the belt front, P2.9) joins wave A after GP-02.

### P2.8 Contradictions and gaps found

1. **Destroyer class names.** `src/lib/destroyer.ts:69-77` names one for every house (Harrier, Theoris, Dory,
   Chelandion, Liburna, Hemiolia, Pentekontor), marked as proposals. Three house files contradict it:
   - `mars.md` F: "LORE.md has no Martian destroyer class name".
   - `mercury.md` F: Mercury's destroyer has "no class name yet".
   - `venus.md` A: Venus has no destroyer class, so "two Siphon fire ships fill that slot". The code calls Venus's
     destroyer the Chelandion.
2. **Dory and Liburna are used twice.** Dory is both Mercury's boarder (`src/lib/boarding/spec.ts:79`) and Mercury's
   destroyer. Liburna is both Mars's destroyer and a Mars troop-carrier hull name (`src/lib/infantry/names.ts:23`).
3. **Who is a Mars player's rival.** `earth.md` E says a Mars player meets the Strategeion's Navarch. `jupiter.md` E
   says a Mars player's rival comes from the Royal Pages. Both are marked default. Caleb picks one, or the game rolls
   between Mars's two blood enemies.
4. **Saturn has no rival.** The rival comes from your blood enemy, or for Mercury from the first house to contract on
   you (`ENDGAME.md` 4). Saturn has no blood enemy and no contract rule. P2.5 proposes the Royal Pages.
5. **Earth's rival and the default Human pilot have the same name.** `earth.md` E rolls the Navarch from four names,
   one of them Amara Okafor. That is also the default pilot an Earth player gets in the opening (seen live on
   2026-10-20). Only non-Earth players meet the Navarch, so it never collides in one game, but the same name means
   two different people. Drop it from one list.
6. **The director's names** (P2.6): the code's "coalition" at 3 held is the Reckoning, not the Last Alliance.

7. **Earth's goal card says "Senate".** `src/lib/opening/goal.ts:33` has the League voting "in the Senate". The Senate
   is Mars's; Earth's chamber is the Synedrion (`earth.md`; `TIMELINE.md` 9). GP-02 replaces the stand-in goal, so fix
   it there.
8. **Venus's second city.** `src/lib/conquest/sites.ts:113` calls it Blachernae. LORE.md, `venus.md` and `TIMELINE.md`
   call it Chrysopolis, and `venus.md` F moves the capital there if the envelope is cut. `TIMELINE.md` 13.8 leaves it
   for Caleb. GP-10 and GP-17 both need the answer.

### P2.9 What TIMELINE.md changed

Checked 2026-10-20 against the final `TIMELINE.md` (1,580 lines), sections 9 (the board in 6000), 11 (feuds and
hooks), 12 (changes to LORE.md) and 13 (contradictions). The three [timeline] markers are filled. Five changes to the
design:

1. **Each start now has its hooks loaded on day one.** The board in 6000 dates every crisis hook to the last fifty
   years, so each house's first hour gets a background card from its own home (P2.5, "Loaded in 6000"). The sharpest
   are Mercury and Venus: their own breaking points (the rail and Chrysopolis) are already close when you undock.
   These go in GP-02's first-hour deck. The director deals them as house cards, not crises, until the Stirring.
2. **The feuds have ages, and the raid card says them.** Earth–Mars dates from 4402–4419, Moon–Venus from 4791, and
   Mars–Jupiter has been the Fifth Belt War since 5961. The first raid card names the feud and its year (P2.2).
3. **The belt war needs a place.** `TIMELINE.md` 9 puts the Fifth Belt War on the Ceres line, and Earth–Mars raids
   "across the Clarke Belt and off Phobos" (section 11). No file under `src/lib` mentions Ceres (grep, 2026-10-20), so a
   Mars or Jupiter start has no front to fly to. This is new package GP-20, below. It refines the feuds brief.
4. **Founding Day is a first-session moment.** SYS-11 fires inside the first two hours (`00-system.md` 9), and the
   timeline makes it the three-thousandth. It is now the opening's endgame-facing moment (P2.3).
5. **Capital site names are districts.** CONQUEST's capital sites (the Quirinal, the Pnyx, the Omphalos) are districts
   inside the LORE capitals (`TIMELINE.md` 13.8). GP-10's world panel shows both: "the Quirinal, Urbs Arsia".

**The "changes to LORE.md" section (`TIMELINE.md` 12) against the work packages.** None of its 19 changes alters a
package's files, order or definition of done. All 19 are edits to LORE.md's prose: dates, the Founding's three
thousand years, the order of the Sundering, calendars. Two feed text that packages display: the year line on the
ending title (GP-18) and Founding Day (change 18, "since 4655", matching SYS-11). The LORE.md edits themselves are a
doc task for whoever owns LORE.md, not a build package, so they are not listed in P2.7.

**GP-20 The belt front** [feuds]
- Files: `src/lib/bodies.ts` or `src/lib/nav.ts` (a Ceres destination); `src/lib/conquest/sites.ts` (the Ceres line's
  docks as sites); `src/lib/motivation/director.ts` (the Mars–Jupiter war raids there).
- Done: Ceres and the belt docks are a place on the nav map. The Mars–Jupiter war moves its frontier there without the
  player (`FEUDS.md` 5). Asper's legions hold the inner docks. A Mars or Jupiter start's first raid comes from that
  front. Scale it on `claude/real-scale` if that branch has merged.
- Waits on: GP-01, GP-02.

**Unchanged by the timeline:** the unlock ladder, the three-scale loop and the director reconciliation. Contradictions
3 and 4 (the Mars player's rival, Saturn's missing rival) are not settled by the timeline either. Its rival entries use
the title and no pronoun, which matches GP-13.

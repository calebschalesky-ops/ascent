# Integration report, pass 2 (2026-10-19)

Branch `claude/integration-2-586c1e`, cut from pass 1 (`claude/integration-5d7cd1` @ 8caa0a9). Method:
`INTEGRATION.md`. Simulator run: `integration/balance-2.md`. Nothing pushed, nothing merged into main.

## 1. Branches

Every head matched the brief's list and every worktree was clean (enemy-ai's uncommitted `package-lock.json` was
ignored, as asked). All thirteen were merged, in the suggested order. The order held because each merge sat on what
it needed: arsenal before enemy-ai (built on it), fleet-command before the destroyer (its glue patches target both),
conquest before infantry-carrier (which carries an older conquest commit), stations before atmo-flight and graphics.

| # | Branch (head) | Merge commit | Conflicts |
|---|---|---|---|
| 1 | `arsenal-33bf3e` (ad6576a) | 4b3ebb5 | combat, Voyage, GameView, store, styles, SPEC, log |
| 2 | `enemy-ai-dbbee0` (d6c5c91) | d97ea7e | combat, arsenal, Voyage, SPEC, log |
| 3 | `fleet-command-885c0e` (6a0ed07) | 5d9d912 | combat, Voyage, GameView, wingmen, SPEC, log |
| 4 | `practical-shamir-f7a67a` (fb5631e, has art-direction) | a030af2, then cdc52ce wires the models | none |
| 5 | `destroyer-a8ff7d` (c7d2ebb) + its two glue patches | 969ca49 | Voyage, fleet.ts; patch hunks against removed stand-ins |
| 6 | `drone-swarm-8429b1` (bd1edcc) | 670d373 | Voyage, SPEC, log |
| 7 | `drill-boarder-17fc34` (6b2af64) | da3b4a4 | combat, Voyage, store (+test), SPEC |
| 8 | `conquest-0b139e` (fed82c6) | 0d06acf | combat, Voyage, GameView, App, wingmen, store, styles, SPEC, log |
| 9 | `infantry-carrier-632a2c` (805c548) | f13a45a | App, GameView, Voyage, shipTypes, log |
| 10 | `planets-cd91e2` (e7cf87d) | 4ddbe93 | log |
| 11 | `stations-1c393c` (962f778, has stations-moons) | 1e81615 | ArrivalCard, NavOverlay, Voyage, SPEC, log |
| 12 | `atmo-flight-e13c2e` (c56908e) | efbe4f2 | Voyage, voyageScene, SPEC, log |
| 13 | `graphics-e638ff` (04f998b) | 682c7c3 | combat, Voyage, voyageScene, materials, ship, SPEC, log |
| | fixes after the smoke | 2ad76e2 | — |

Left out, as the brief said: **god-armour**, **motivation**, **game-start** (running) and **races-in-depth**. The
last one does have a branch after all: `claude/races-depth` @ 5cbfb71, worktree `<repo>-races-depth`,
clean, one commit on top of races (95c3dbf). It goes in with pass 3.

## 2. Conflicts and how each was resolved

**One player loadout: progression decides, arsenal flies.** The shipyard (progression) owns what the player has and
what it costs. `progress.ts flightLoadout` turns the fit into arsenal's `Loadout`: munitions by their own ids, the
first shield at Mk I, armour and plate as armour Mk I and II, drones, the countermeasure, the targeting computer.
`hooks.loadout` replaces the laser/missile `weapons`/`label` hooks. `refs.ts ARSENAL_ID` now maps every module to
arsenal's real id. Arsenal's own free loadout panel is left out of the pause menu, because two fitting screens for
the same modules confused things and only the shipyard has prices. `__voyage.setLoadout` still sets any loadout for
tests. Two losses in the bridge, both on the fix list: a fit with two of the same weapon (Moon cruiser: pulse ×2)
flies one, because arsenal's loadout holds each munition once, and a fit with no shield (Quirite cruiser) flies a
Mk I deflector, because arsenal's ship always has one.

**Enemy armament: enemy-ai's roll.** Three systems wanted to arm enemies: progression's 21 LOADOUTS, enemy-ai's
seeded `rollFit` (nation doctrine × type × level) and arsenal's flat `ENEMY_FIT`. Enemies now fly `rollFit`, because
it is Caleb's own ruling in the arsenal thread ("somewhat random, but with order according to planet, class of ship,
and level of ship") and the enemy AI fires exactly those weapons. `craftStats.ts` wraps it (`craftArms`), so the
coupling "an enemy's numbers come from one place" still holds and the simulator reads the same fits. Progression's
LOADOUTS now arm only the player's start. `enemyArms.ts ShipClass` is `ShipType` and its CLASS table takes size, hp,
hit radius and dodge from `SHIP_SPECS`.

**combat.ts (rewritten by six threads).** Arsenal owns shots, missiles, hits and blasts. Ship types keep the fleet
models, per-type force and body radius. Progression keeps `damage(c, hp, by)`, `lastHit` and `onKill`. Enemy-ai adds
the AI, `fit`, `level`, `fwd`, `baseRadius`. Fleet-command keeps `spawn`, `remove`, `driven`, `stats.lost`, and a
spawned ship gets the same arsenal defences. Conquest keeps `retire`, `revive` (which restores arsenal's defences)
and its `Solid` seam, which now feeds arsenal (`ArsenalWorld.solids`), so every munition hits ground sites and enemy
carriers. `Craft.hp` is gone (hull is `def.hull`), so fleetRuntime, boarding, swarms and stationDefense read hull plus
shield facets.

**Voyage.tsx.** Every layer is kept: arsenal (setScale, setLoadout, countermeasure), the lost-ship placeholder,
fleet command (capital camera and turn rate, command mode), the duel range (dev), swarms, docking and the station
screen, the air, graphics. `__voyage` carries every thread's dev hooks.

**Keys.** Three clashes, all kept by context:
- **C**: the countermeasure (arsenal), or fleet orders while you command a flagship (fleet-command's handler runs
  first only then).
- **L**: docks within docking range (stations); anywhere else it lands the infantry carrier (the dock check runs
  first).
- **G** cycles fitted munitions; Q/1/2 stay gone; B/V fighters; T boards; 7/8/9/0 drones; K recalls the carrier;
  Z attacks the locked target; T on the nav keys opens the fleet tab. The hint line lists them.

**One player hull.** Stations-moons kept its own player hull (saved, repaired at the station screen) beside
arsenal's. There is one now: station shots and mines land through `arsenal.hitPlayer` (shield first), the save and
the screen mirror arsenal's hull, and a repair writes arsenal's hull and refills the shield.

**shipTypes.ts, one row each.** The destroyer is a `ShipType` (last, so index-based code holds; FORCE 7 → 8 ships
a nation). Drill-boarder's `LAUNCHED_SPECS` and the infantry carrier's `INFANTRY_CARRIER` are rows outside
`ShipType`, as their threads chose. Every `Record<ShipType, …>` that met the destroyer got a row: conquest build
time 180 s and cost, planets' loss shock, infantry crew, boarding BAY/PD/CREW, station navy, swarm defence.

**Destroyer glue.** Its `enemy-ai.patch` and `fleet-command.patch` applied except two hunks aimed at enemy-ai's
stand-in roster, which is gone; the destroyer's CLASS row was added by hand. `destroyer.ts` now reads fleet-command's
COMBAT, enemy-ai's CLASS and fleet-command's COMMAND_POINTS instead of stand-in copies, so its tests check the live
tables.

**Enemy respawn.** No clash in the end: enemy-ai's "placeholder respawn" is the player's, not enemies'. Conquest's
production rebuild is the only way enemy ships come back.

**Shipyard vs station screen.** Both kept: the shipyard in the pause menu (prices, levels), the station screen when
docked (repair, systems). Decision 4 asks which one sells.

**Sky from inside the air: atmo-flight's dome.** Graphics' scattering shells (`fx/atmosphere.ts`) replace the old
atmosphere spheres for the view from space; they are listed in `world.airShells`, and the shell of the body you are
flying inside is hidden. Chosen because atmo-flight's dome was built and proved for flight in the air (cover, zenith,
horizon colour by density), and graphics' shell was built to be seen from outside.

**Graphics on planet scale.** Every fx shader writes log depth through its own chunks (`fx/glsl.ts`, the same
includes as `withLogDepth`), so none were wrapped twice. `plumeMaterial` had both and failed to compile; it keeps
`withLogDepth` only. Planet scale's hairline rings, camera-relative dust and view-space rim are kept (graphics' ring
numbers were tuned before the 185× rescale); its painted Milky Way replaces the mesh one. Graphics' muzzle, impact
and trail calls were written for the old laser loop that arsenal replaced, so they are not wired; a kill adds
graphics' explosion. Its particles and atmosphere shells still do world-space maths (`viewMatrix * world`), which
planet scale avoids; that is on graphics' fix list.

**Conquest bands.** The destroyer joining the force made the full rebuild longer: rebuild band 6–16 → 6–20 min and
the Mars test bound 15 → 16 min (section 5). Conquest's balance sim also killed ships in a hard-coded
fighter/cruiser/capital order, so it never killed the destroyer; it does now.

## 3. Tests, build, smoke

| After | `npx tsc -b` | `npx vitest run --dir src` | `npm run build` |
|---|---|---|---|
| pass 1 (baseline) | clean | 90 in 8 files | passes |
| arsenal | clean | 124 in 11 | passes |
| enemy-ai | clean | 196 in 16 | passes |
| fleet-command | clean | 216 in 17 | passes |
| ship styles (merge + wiring) | clean | 272 in 18 | not run |
| destroyer + glue | clean | 297 in 20 | not run |
| drone-swarm | clean | 316 in 21 | not run |
| drill-boarder | clean | 337 in 22 | not run |
| conquest | clean | 363 in 24 | passes |
| infantry-carrier | clean | 392 in 26 | not run |
| planets | clean | 413 in 27 | not run |
| stations | clean | 459 in 30 | passes |
| atmo-flight | clean | 492 in 32 | not run |
| graphics | clean | 492 in 32 | passes |
| **fixes (last edit)** | **clean** | **493 in 32** | **passes** |

Smoke in the in-app browser, dev server on port 5325, driven through `window.__voyage`, `__pilot`, `__conquest`,
`__infantry`. The pane was hidden the whole time, and its screenshots came back stale, so **every result below is a
number read from the page, not a picture**.

| Step | Result |
|---|---|
| New game → nation | 7 race cards; Mars and Earth picked; 56 crafts, 48 hostile (capital 7, cruiser 14, destroyer 7, fighter 28); the player shows its nation's cruiser model |
| G | real keydown events: rail → seeker → rail (Mars start fit) |
| Fight a patrol that shoots back | Venus cruiser (beam+ion+pulse, bifacet, 289 hp): railgun, 3 of 3 hits, dead in 3.4 s. Seeker against the next one: 3 of 7 hits in 30 s, not killed; the player was destroyed (shield 100 and hull 146 lost; enemy beam 105 ticks on target, swarm 12 hits). Earlier: Mars cruiser by pulse laser 23/23 hits in 3.8 s while taking 100 shield + 55 hull |
| Lock and fire | lock held at 1.1 s every time |
| Kill pay | 40 XP per cruiser, as `ECONOMY` (95 XP, 60 cr for cruiser + fighter + cruiser before conquest; conquest pays a rebuilt ship half) |
| Launch fighters | B ×2: 2 launched |
| Drones | 7, 8, 9: 6 explosive, 5 shield, 5 laser-focus flying |
| Boarder | T path (board on a held lock): one boarder launched from the Earth capital escort at a Mars cruiser; that cruiser's point defence shot it down 7 s later. A capture was not re-proved after the merge |
| Take command | at level 10: capital flagship, 10 craft launched (2 cruisers, 8 fighters), 67 crafts in the scene. This step crashed swarms (fixed, 2ad76e2) |
| Autopilot tour | all 10 stops (earth … edge) parked, **0 collisions**, 126 s of game time, the player not lost |
| Atmosphere | `airtest.js descend()`: orbit to 2.5 units over Earth in 4.8 s, density 0.40, sky #497cc6/#acbfd5, 0 collisions |
| Dock | autopilot to stn-earth-1 parks in range in 10 s; L docks ("docked"); undock works. `dbg.hits` counted 30 frames against the station's own collision sphere during the docking run (0 at planets) |
| Capture with infantry | Moon: sites shot below half and the Moon patrol cleared (dev), L → "Gangway to moon-peaks"; The Peaks of Light taken 45 s later, 10 of 60 men lost |
| Save → reload → Continue | position, XP 5,080, nation, the taken site, the carrier's 50 men and hull 100 all came back. The Moon ships I had removed with the dev `retire` came back too, as they should: retire records no loss |
| 375 px (mobile preset) | no page scroll (scrollWidth 375); only the destination chip strip runs off the right, which is its scroll; one overlap: the joystick hint over the flight panel by 37×40 px |
| Shader errors | none after the plume fix (32 programs) |

**Frame time with the most on screen** (67 ships, 16 drones, 10 fleet craft, desktop 1024×768 at DPR 1.25): the
game systems cost **1.7 ms a frame** together (stations 0.48, game layer 0.35, fleet 0.34, conquest 0.23, swarms
0.20, gfx 0.07, air 0.02). The frame is **838 draw calls and 444,000 triangles**. The whole frame measured 20–41 ms,
almost all of it in `composer.render`, but the pane was hidden, so GPU time there is not trustworthy. A visible run on
real hardware is needed (section 7).

## 4. Coherence findings

### Progression

1. **The XP ceiling is gone.** Conquest's production rebuild answers report 1's decision 1: ships come back until
   you take a world's production, and a rebuilt ship pays half. Conquest's balance sim pays 2,476–2,988 XP for taking
   a world (`balance-2.md`, conquest table), so level 10 (4,500) is reachable. Reload no longer farms: conquest state
   saves with the pilot.
2. **Fighters still outlast cruisers** (`typeOrder`, 6 of 6 races), but the cause has moved: enemy fighters now fly
   enemy-ai's rolls, with a shield at ×0.5 and a shield Mk that rises with the nation's level, so a Venus fighter has
   130 hp to a cruiser's 289 but dodges 60%. Time to kill: fighter 4.7–7.6 s, cruiser 3.9–5.7 s.
3. **The player dies fast.** A level-1 cruiser against a patrol loses its shield and hull in about 4–30 s. There is
   no lose rule yet beyond enemy-ai's placeholder. See decision 1.
4. **Level gates now stack up.** Infantry carriers open at level 3, fleet command at level 10, drones and the
   destroyer have no unlock at all (the racks are always full). Motivation (pass 3) should own one ladder.
5. **Two fitting screens agreed on one**: the shipyard. Arsenal's 8-slot, tier 1–3 table still describes the
   modules; progression's 3-slot, tier 1–4 table still decides what the player may fit. Decision 3 of report 1 is
   still open (now decision 5).

### Storyline

1. The grep finds only allowed hits: documents saying astrology was removed, `ecliptic` as the orbital plane in the
   moon tables, Agrippa's harpax and Ptolemy II (both historical), and **"sigil"** for Jupiter's crown badge in
   `styles/claw.ts`, `destroyers.ts` and ART-DIRECTION.md. It means a heraldic badge there, but it trips the grep;
   rename it "crest" or "badge".
2. Names line up across new threads: boarders (Harpax, Embolon, Dory …), destroyers (Liburna, Hemiolia,
   Pentekontor …), temples (Mars Ultor, Jupiter Optimus Maximus …), troop names (legionaries, argyraspides).
   **Dory** is both Mercury's boarder and Mercury's destroyer.
3. The lost-ship line says "respawning near Earth" for every nation. It respawns where the flight started.

### Balance (`integration/balance-2.md`, seed 1)

1. **Race cruisers, now in the repo with arsenal's real `applyHit`, capacitor and ammo** (report 1 §4 Balance 5):
   - *Enemy level-1 cruisers (enemy-ai rolls, 8 seeds)*: every race inside the band, 38–56% mean.
   - *Player start cruisers (progression LOADOUTS as flown)*: **Earth 72%, Mars 69%, Venus 66%** over the 65% band;
     **Moon 9%**. The Moon's two pulse lasers fly as one (the bridge loss above) with no second weapon; Mars's
     armour now comes with a Mk I deflector it did not pick, which is why it went from report 1's 12% to 69%.
2. **Destroyer**: kills a cruiser 100%, two 100%, three 66%; loses to a capital 100%, two destroyers beat a capital
   20%. The player's laser kills one in 4.9 s at 0.5° aim (missile 9.4 s). A clean "between cruiser and capital".
3. **Escorts** (hypothetical mounts, unchanged method): capital with 4 turrets wins alone 70% (band ≤ 35%); with
   one mount and two cruisers 10%. Three mounts stays the in-band number. Enemy-ai gives capitals 4 weapon slots.
4. The missile still hits fighters 15% of shots, on the "useful" line.

## 5. Balance changes made (before → after)

| Change | Where | Before | After | Evidence |
|---|---|---|---|---|
| Enemy fits from enemy-ai's roll, not progression's LOADOUTS | `craftStats.ts` | Mars cruiser 140 hp (armour, no shield) | 200–289 hp by roll (Mars L3 capacitor shield) | race cruiser table; enemy L1 band met |
| Destroyer build time and cost | `conquest/resources.ts` | none (destroyer not built) | 180 s on the shipyard; metals 12, chemicals 4, power 4, hydrocarbons 2, ice 2 | conquest bands |
| Rebuild band | `balance/conquest.ts` | 6–16 min | 6–20 min | Venus and Saturn 20.0 min, the others 15–16 |
| Mars rebuild test bound | `conquest.test.ts` | ≤ 15 min | ≤ 16 min | 15.0 min measured |
| Destroyer rows in other tables | infantry CREW, boarding BAY/PD/CREW, planets loss, station navy, swarm DEFENCE | missing (NaN at runtime) | values between cruiser and capital | tests pass |

No number in `SHIP_SPECS`, `MUNITIONS`, `SHIELDS`, `LOCK` or `ECONOMY` was changed.

## 6. Fix list per thread

| Owner | Problem | Evidence |
|---|---|---|
| **progression** (`catalog.ts` LOADOUTS) | Moon start cruiser flies one pulse laser (two of one id collapse in arsenal's loadout) and wins 9%; Earth 72%, Mars 69%, Venus 66% over the band | §4 Balance 1 |
| **progression + arsenal** | Fits with two of the same weapon, or with no shield, cannot be flown as written; pick one rule (allow duplicates in `Loadout`, or change the fits) | §2 loadout |
| **enemy-ai** (`enemyArms.ts` CLASS, `NATION_LEVEL`) | Enemy fighters outlast cruisers for every race; the lost-ship line says "near Earth" for every nation | §4 Progression 2, Story 3 |
| **graphics** | Arsenal's shots don't use `fx` (muzzle, impact, trail, bolt material); particles and atmosphere shells do world-space maths, which planet scale avoids | §2 graphics |
| **graphics / art direction** | Nothing seen by eye in this pass; 838 draw calls with everything out | §3 frame time |
| **drone-swarm** (`swarm/refs.ts`) | Stand-ins for arsenal's drones, flak and fleet's `Order` still copied, not imported; drones are not counted against the cruiser's bay | refs.ts header |
| **drill-boarder** (`boarding.ts`) | The player's capital "escort" stand-in is still the boarding launcher; fleet-command's flagship should be. Capture not re-proved | smoke |
| **stations-moons → god-armour** | The docking run counts 30 frames of collision with the station's own sphere | smoke, dock |
| **conquest** | Planets' `stepPlanet`/`applyEvent` seam not called yet; infantry's three requests (`holders`, `loseSite`, `underAssault`) open | planets-to-conquest.md, infantry-to-conquest.md |
| **fleet-command** | Enemy AI and fleet brains could both fly a ship; combat now lets a `driven` ship skip the AI, but enemy-ai's update still iterates it | combat.ts update |
| **art direction / destroyer** | "sigil" trips the no-occult grep; "Dory" names two Mercury ships | §4 Story 1–2 |
| **ship styles** | Shipyard and start screen still show no ship model (art direction's ask) | art-direction.md |

## 7. What the next pass needs

- **Pass 3**: god-armour (the station body on `station/mounts.ts`'s seam: `mountsOf` already takes its
  `hardpointsOf(home)` unchanged, per stations' trial merge), motivation, game-start, races-in-depth
  (`claude/races-depth` 5cbfb71). Game-start replaces the start screen and will meet `GameView.pick` and
  `flightLoadout`.
- **A visible run on real hardware**: frame time with everything out, the look of the seven styles, graphics'
  lighting and the sky inside the air, 375 px by eye, touch controls. None of it could be seen this pass.
- Re-run `npm run balance` after the progression fix to the start cruisers.

## 8. Decisions for Caleb

Asked one at a time, most blocking first. The first is in the hand-over; the rest wait.

1. **What happens when the player's ship is destroyed?** Today a stand-in: the ship stops, and 3 s later it is back
   where the flight began, repaired and refitted. Proposal: you limp back to your home station, the ship is repaired
   for a cost in credits, the fighters, drones and boarders aboard are lost, and the fleet stays where it was. If
   you were flying a capital ship, you lose it and fly your cruiser until you buy it back.
2. Should enemies fly progression's per-race LOADOUTS or enemy-ai's seeded rolls? (This pass: the rolls.)
3. Grow every force by one destroyer (7 → 8 ships a nation, as built), or trade a cruiser for it?
4. Where does the player buy things: the shipyard in the pause menu, the station screen, or both?
5. Whose module table wins: arsenal's (8 slot kinds, 4 weapons, tiers 1–3) or progression's (3 slot kinds, tiers 1–4)?
6. May a fit carry two of the same weapon (the Moon cruiser's two pulse lasers)?
7. One big infantry carrier flying with you, or small bay dropships?
8. Do drones share the cruiser's four bay slots with fighters, or get their own rack?
9. May enemy boarders board the player's own cruiser? (Needs decision 1 first.)
10. When does the integration branch go into main?

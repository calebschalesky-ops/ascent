# Integration report, pass 1 (2026-10-18)

Branch `claude/integration-5d7cd1`, cut from main `9e4d39d`. Method: `INTEGRATION.md`. Simulator run:
`integration/balance-1.md`. Nothing pushed, nothing merged into main.

## 1. Branches

When the pass started, three threads had finished (g-key-weapon, targeting, ship-types). While it ran, three more
finished: planet-scale, races and progression. Each of those sessions was idle with a clean worktree and a Done entry
in its thread log, so they were merged as well.

| Branch | State | In this pass |
|---|---|---|
| `claude/ship-types-4d54b4` (336ace1) | finished | merged, `13f81d6` |
| `claude/targeting-2fa0da` (618c62e) | finished | merged, `26eb07a` (conflict in combat.ts) |
| `claude/g-key-weapon-c260c9` (10d646b) | finished | merged, `fb47024` |
| `claude/planet-scale-1e1ecc` (7cfd2cf) | finished during the pass | merged, `f48cc3b` (conflict in nations.ts, two fixes) |
| `claude/races-fe3f3b` (95c3dbf) | finished during the pass | merged, `0e52eeb` |
| `claude/progression-0613e0` (65e9faf) | finished during the pass | merged, `d411065` (conflicts in combat, Voyage, nations, styles) |
| `claude/arsenal-33bf3e` (ad6576a, 7 commits) | session still running | not merged; committed tables read |
| `claude/fleet-command-885c0e` (0c012a2) | running, 9 files uncommitted | not merged |
| `claude/graphics-e638ff` (da97798) | running, 18 files uncommitted | not merged |
| `claude/atmo-flight-e13c2e` (5343d21, includes planet-scale) | running, 5 files uncommitted | not merged |
| `claude/stations-moons-629924` | running, no commits, 17 files uncommitted | not merged; worktree read |
| `claude/art-direction-e63aed` (0103c66) | idle, but its ship-style sibling `claude/practical-shamir-f7a67a` is still running | not merged; pass 2 with its sibling |

Integration commits besides the merges: `f10c6b1` (balance simulator), `9a64f79` (craftStats, simulator reads race
stats), `INTEGRATION.md`, the refs.ts swap, and this report.

## 2. Conflicts and how they were resolved

- **combat.ts, ship-types × targeting: what a hit radius means.** Ship types made `Craft.radius` the whole laser pass
  distance (cruiser 0.705). Targeting made it the ship's body, with each weapon's reach added (bolt +0.2, missile
  +0.3). Taken together they would have counted the reach twice. Resolved: `Craft.radius` is the body,
  `bodyRadius = hitRadius − LASER.radius` (now in `shipTypes.ts`). Laser pass distances equal ship types' table
  exactly, and missiles keep targeting's extra 0.1. Measured in game: capital 0.912, cruiser 0.505, fighter 0.171
  body radius. Ship types' fleet, models and per-type dodge are kept; so are targeting's held lock, lead and measured
  velocity.
- **nations.ts, ship-types × planet-scale: rings.** Planet scale moved patrols to `1.6 × radius + 185`. Ship types
  multiplied that radius by 0.55 for fighters, which put Jupiter's and Saturn's fighters inside the planet (the ring
  test failed). Resolved: the ring factor now scales the **height above the surface**. All ring, clearance and
  spacing tests pass at today's ship size and at 3×.
- **nations.ts, planet-scale's patrol speed (no textual conflict, found by the simulator).** The lap rate was not
  rescaled, so in ship units patrols flew about 5× faster. The missile flies its last 22 units straight, so it
  missed them. Resolved: `patrolSpeed()` keeps each type's pre-scale speed in ship units, which is planet scale's own
  rule ("ships keep their numbers"). Before/after is in section 5.
- **nations.ts, races:** race names (`RACE_NAME`) set on ship types' `force` table.
- **combat.ts, progression:** progression armed the old single patrol type with each race's cruiser loadout. Now
  each ship flies its race's loadout **for its own type** (`loadoutOf(nation, type)`), through the new
  `lib/craftStats.ts`, which combat.ts and the simulator both read. Progression's wingman hooks (`lastHit`, `hooks`,
  `root`, `damage(by)`) are kept. In `wingmen.ts` the wingmen follow the missile lock only once it is fully locked.
- **Voyage.tsx, progression × g-key:** progression brought back Q and 1/2. Per Caleb's G ruling those are dropped:
  G cycles through the weapons the fit carries, and B/V launch and recall fighters. Progression's weapon names now
  show on targeting's weapon line. That line used to print the kill count twice ("1 down · 1 down"); it prints it
  once now.
- **styles.css, SPEC.md, THREAD-LOG.md:** kept both sides. The SPEC nations section now reflects race names, ship
  types and the faction start.
- **progression/refs.ts:** `ShipType` and `SHIP_TYPES` now come from `shipTypes.ts`, as progression's own "on merge"
  note asked.

## 3. Tests, build, smoke

| After | `npx tsc -b` | `npx vitest run` | `npm run build` |
|---|---|---|---|
| main (baseline) | clean | 43 in 4 files | — |
| ship-types | clean | 49 | — |
| targeting + g-key | clean | 59 in 5 files | passes (three.js chunk warning, as before) |
| simulator | clean | 63 in 6 files | passes |
| planet-scale | clean | 65 in 6 files | passes |
| races | clean | 68 in 7 files | — |
| progression + craftStats + refs | clean | **90 in 8 files** | passes |

Smoke, dev server on port 5305, in-app browser, `window.__voyage`. **No screenshots were taken**: every result
below is a number read from the page.

| Check | After targeting + g-key (pre-scale) | After progression (final) |
|---|---|---|
| New game | 49 crafts, 42 hostile; capital 7, cruiser 14, fighter 28 | start screen shows 7 race cards; Earth picked; 49 crafts, 42 hostile; `__pilot` present |
| `fly('mars')` | parked in 9 s, 0 collisions, min gap 2.87 | parked in 9 s, 0 collisions |
| `tour()` | all 10 stops parked, 0 collisions | all 10 stops parked (earth … edge), 0 collisions |
| Laser, Mars cruiser | 9 shots, 9 hits, dead in 1.33 s | 140 hp (Quirite loadout): 12 of 12 hits, dead in 1.78 s |
| Laser, Mars fighter | 3 of 3, dead in 0.45 s | 76 hp: 7 of 7, dead in 1.05 s |
| Missile, Mars cruiser | locked at 1.50 s, 2 of 2 hit, dead in 2.88 s | locked at 1.50 s, 10 fired, 3 hits, 5 dodges, dead in 9.3 s |
| Missile, Mars capital | locked at 1.50 s, 15 of 15 hit, dead in 13.3 s | — |
| Progression | — | 3 kills (cruiser, fighter, cruiser) paid 95 XP and 60 credits: exactly `ECONOMY` by type |
| HUD | weapon line "Laser" | "Pulse laser"; hint "G: switch weapon · B/V: launch/recall fighters" |

## 4. Coherence findings

### Progression

Evidence: `progression/levels.ts`, `economy.ts`, `catalog.ts` as merged, `arsenal-33bf3e:src/lib/modules.ts`, and the
simulator's times to kill.

1. **The world runs out before the levels do.** Enemies never respawn during a flight. Six hostile nations ×
   (capital 200 + 2 cruisers × 40 + 4 fighters × 15 XP) = **2,040 XP** and 1,260 credits (1,360 with the start).
   Level 7 needs 2,100 XP. So **levels 7–10 can't be reached**: tier-4 tech (the torpedo, 900 credits), the fourth
   bay slot and level 10's "room for a capital-ship command" are dead ends. But ships do come back on reload
   (progression's log), and XP is saved, so reloading is an unlimited, risk-free XP farm.
2. **The safest target pays best.** Enemies don't shoot back. From the simulator (0.5° aim, race loadouts): capital
   about 14 s to kill = **14 XP/s and 8.4 credits/s**; cruiser about 4 s = 10 XP/s, 6 credits/s; fighter about 7 s =
   **2 XP/s and 1.5 credits/s**. One capital kill (200 XP) jumps a new player from level 1 to level 2, and the bay
   opens 14 seconds into the game.
3. **Capital ship and armada have no step.** The brief's path is faction start → cruiser → levels → fighter bay →
   capital ship → armada. Progression stops at the bay (level 10 is a placeholder), and fleet command is unmerged and
   has no unlock rule. Nothing gates them yet.
4. **Two module systems disagree.** Arsenal (`modules.ts`): 8 slot kinds, **4 weapon slots**, tiers 1–3. Progression
   (`catalog.ts`): weapon/defence/support, **2 weapon slots** on a cruiser, tiers 1–4. The tiers differ for six
   munitions: rail 3 vs 1, torpedo 3 vs 4, beam 2 vs 3, ion 2 vs 3, mine 1 vs 2, flak 1 vs 1. As a result, four races
   (Mercury, Mars, Jupiter, Saturn) start with arsenal's top-tier railgun at level 1.
5. **Purchases that do nothing yet.** Shields, armour, flares, jammer, chaff and point defence are sold, but nothing
   shoots the player, so they have no effect. Railgun, flak, plasma and the rest fire as the plain laser or missile
   until arsenal merges. Progression's log says so too.
6. Works end to end: faction start, the ship named for its race, kills paying by real ship type (they all counted as
   cruisers before ship types merged), and the bay opening at level 2 with a free fighter.

### Storyline

Evidence: `LORE.md`, `lib/races.ts`, `progression/refs.ts`, arsenal's `munitions.ts`, stations-moons' worktree,
`lib/bodies.ts`.

1. **Astrology and occult check is clean.** The grep in INTEGRATION.md finds only the documents that say these were
   removed (`SPEC.md`, `LORE.md`). The Selenitai's Pythia and Oracle come from historical Greek religion (Delphi),
   not astrology. Saturnalia is a Roman festival. Both fit the rule.
2. **Names agree.** The nations carry race names (Selenitai, Hemerodromoi, Nephelai, Quirites, Diadochoi,
   Autochthones). Progression's placeholder class names come from LORE.md's ship descriptions (Hoplon, Corvus,
   Sarissa, Hetairos, Trireme), and its doctrines match the lore. So do arsenal's enemy fits, for example Mercury's
   hardened shield on "shield-first, sun-facing" ships.
3. **Earth is the odd one out:** its nation is named "Earth" while every other nation is named for its people, and
   its class names (Metropolis, Pathfinder, Sparrow) are placeholders with no lore behind them.
4. **The lore says forces differ; the code makes them identical.** LORE.md has Mars flying fighters "in squadrons of
   eight", Jupiter "a royal flagship many times the size of anything else", and Mercury "round shield" fighters in
   phalanx. In the code every nation has the same 1 / 2 / 4 force, the same three hull models (art direction is on
   it), and the same capital ship size.
5. **Munition and module names are generic sci-fi** (Pulse laser, Railgun slug, Flak burst, Seeker missile). Arsenal
   calls them placeholders. Nothing in them is Greek or Roman.
6. **Moon and Earth are both blue** (Moon `#2f5fc4`, Earth `#3f7fd0`). Hostile Selenite ships wear nearly the colour
   of the player's friendly Earth ships.
7. **Two places to buy things.** Progression's shipyard lives in the pause menu, while stations-moons is building a
   station screen. In the story, a shipyard should be at a station.
8. **Probable typo** in stations-moons' generated `moonData.ts`: "Magaclite" (Jupiter XIX is Megaclite). Check it
   against the JPL table before it merges.

### Balance

Evidence: `integration/balance-1.md` (seed 1; 200 engagements a cell, 400 fights a row). The simulator runs the
game's own `stepMissile`, `wantsDodge`, `intercept`, `sweptHit`, `patrolPos` and `craftStats`. Its unit test checks
it against the in-game proofs (9 laser hits kill a cruiser, 3 a fighter, 15 missiles a capital ship).

1. **Every race's fighter is now harder to kill than its cruiser** (flag `typeOrder`, 6 of 6 races). Race loadouts
   add 40–100 shield and armour to a 36-hp fighter: Selenite fighter 136 hp, 7.6 s to kill, against its cruiser's
   4.1 s. Fighters also pay the least (finding P2). Owner: progression's `LOADOUTS` (fighter defence slot), or a rule
   in `craftStats.ts` that scales loadout hp by hull size. That's a design call, so it's decision 2, not applied.
2. **Planet scale made the missile miss; fixed.** Section 5 has the before and after.
3. **Laser against missile.** With 0.5° aim the laser kills a cruiser in 2.3 s and a fighter in 2.1 s, the missile in
   4.6 s and 7.0 s. Against a capital they are level (12.0 s and 13.9 s). With 1° aim the missile wins everywhere,
   because it homes. That's a healthy role split, so no flag. The missile hits fighters only 15% of the time (60%
   dodge, small hull), right on the "useful" line.
4. **Capital ships need about three weapon mounts.** These fights are hypothetical, since enemies have no guns yet:
   every mount is the player's laser and missile. With one mount, a capital ship is useless even with two cruisers
   escorting it (wins 8% against six fighters). With four (its model has four turrets), it wins alone 57% of the
   time, outside the "only with escorts" band. With **three it is in band: alone 21%, escorted 91%**. That's the
   number for fleet command and arsenal when they give enemies guns.
5. **Race cruisers, preview on unmerged tables.** This ran outside the repo: progression's loadouts fought with
   arsenal's committed `applyHit` and shields, every pair 400 times, both sides firing. Mean win rate: Venus 67%,
   Moon 66%, Earth 65%, Saturn 47%, Jupiter 45%, Mercury 33%, **Mars 12%**. Venus beats Mars 93% of the time and
   Mars beats Venus 5%, far outside the 65% band. The cause: the Quirite cruiser carries armour (+40 hull) and no
   shield, while the others have 70–100 shield that regenerates. The preview also ignores arsenal's capacitor: the
   Moon's two pulse lasers draw 42 energy/s against a Mk I reactor's 30/s, so the Moon is overrated here. Pass 2
   re-runs this inside the repo once arsenal is merged.
6. Mirror fights all sit at 42–54%. Races of the same type are within 1.5× of each other (no `raceSpread` flag).

## 5. Balance changes made (before → after)

| Change | Where | Before | After | Evidence |
|---|---|---|---|---|
| Patrol speed in ship units restored after the 185× rescale | `nations.ts` `patrolSpeed` | cruiser at Mars ~11 u/s (pre-scale ~2) | pre-scale speed in ship units | missile hit on cruiser 55% (pre-scale) → **22%** (scaled, unfixed) → **52%** (fixed); on fighter 16% → 7% → 15%; laser on cruiser 59% → 55% → 59% |
| Ring factor scales height, not radius | `nations.ts` `ringRadius` | fighter ring 0.55 × (1.6 r + 185): inside Jupiter (3,674 < 4,060) and Saturn | r + 0.55 × (0.6 r + 185) | `nations.test.ts` ring and clearance tests: fail → pass |
| Hit radius counted once | `shipTypes.ts` `bodyRadius`, `combat.ts` | reach would be added to ship types' full pass distance (cruiser 0.905) | cruiser 0.705 laser, 0.805 missile | in-game radii 0.912 / 0.505 / 0.171; simulator: 9 hits kill a cruiser |
| Enemy loadout by own type | `craftStats.ts` | every patrol had the race's cruiser loadout | each type its own (capital 1,040–1,100 hp, cruiser 140–200, fighter 76–136) | smoke: Mars cruiser 140 hp, fighter 76 hp |

No number in `SHIP_SPECS`, `LASER`, `MISSILE`, `LOCK` or `ECONOMY` was changed.

## 6. Fix list per thread

| Owner | Problem | Evidence |
|---|---|---|
| **progression** (`progression/catalog.ts` LOADOUTS) | Fighters carry 40–100 defence on a 36-hp hull and outlast cruisers | §4 Balance 1, `typeOrder` flags |
| **progression** (`LOADOUTS.mars.cruiser`) | Quirite cruiser has no shield; wins 12% of race cruiser fights | §4 Balance 5 |
| **progression** (`levels.ts`, `economy.ts`) | Levels 7–10 unreachable without respawn; capital kills pay most for no risk; reload farms XP | §4 Progression 1–2 |
| **progression + arsenal** (`catalog.ts` vs `modules.ts`) | Two slot models and two tier tables for the same modules; agree on one source | §4 Progression 4 |
| **progression** (`refs.ts`) | Earth's class names and the module-id placeholders still to swap when arsenal merges | `refs.ts` header |
| **arsenal** (`munitions.ts`, `tech.ts`) | Moon cruiser's two pulse lasers out-draw a Mk I reactor (42 vs 30 energy/s) | §4 Balance 5 |
| **arsenal + fleet-command** | Enemy weapons: give a capital ship about 3 mounts to fit the escort band | §4 Balance 4, sweep table |
| **fleet-command** | No unlock rule for capital-ship command or the armada; level 10 is a placeholder | §4 Progression 3 |
| **fleet-command / art direction** | Forces and models are identical for every race; lore says otherwise | §4 Story 4 |
| **races** (`bodies.ts` COLOR, LORE.md) | Moon blue too close to Earth blue for friend and foe | §4 Story 6 |
| **races** (`nations.ts` Earth name) | Earth's nation is "Earth" while every other nation is named for its race | §4 Story 3 |
| **stations-moons** | Branched before planet scale: moons, stations and orbits must use `COSMOS` and `withLogDepth` | planet-scale hand-over note |
| **stations-moons** (`moonData.ts`) | "Magaclite" is probably Megaclite | §4 Story 8 |
| **stations-moons + progression** | Shipyard in the pause menu against a station screen; pick one home for buying | §4 Story 7 |
| **graphics, atmo-flight, art direction** | New ShaderMaterials must go through `withLogDepth`; check before merge | INTEGRATION.md couplings |
| **ship-types** (`SPEC.md` table) | The "Ring" column now means a factor on height above the surface | §2 |

## 7. What the next passes need

- **Pass 2**: **arsenal** (it touches combat.ts, Voyage.tsx, weapons.ts, store.ts and GameView.tsx, all already
  carrying targeting and progression, and its loadout overlaps progression's shipyard), then **fleet-command**
  (combat.ts, Voyage.tsx, `space/fleet.ts`, `nations.ts`, `shipTypes.ts`; enemy guns make the escort and race-cruiser
  bands real), then **art-direction** together with **practical-shamir** (ship styles). Then re-run the race cruiser
  round robin inside the repo with arsenal's real `applyHit`.
- **Pass 3**: **stations-moons** (needs to commit, and to move to planet scale first), **graphics** (Voyage.tsx,
  combat.ts, materials.ts, ship.ts, voyageScene.ts), **atmo-flight** (already carries planet-scale; nav.ts,
  nations.ts, Voyage.tsx, store.ts). These are presentation and world work that touch the scene everywhere, so they
  go after the content is settled.
- Every pass: if enemies start shooting, extend `battle.ts` from hypothetical mounts to their real weapons and add the
  player's shield to the simulator.

## 8. Decisions for Caleb

1. Do destroyed enemies come back (and when)? Without that the game tops out at level 6; with reload it's an endless free XP farm.
2. Should fighters carry shields and armour, given that they now outlast cruisers?
3. Whose module table wins: arsenal's (4 weapon slots, 8 slot kinds, tiers 1–3) or progression's (2/1/1 slots, tiers 1–4)?
4. How many guns does each enemy type carry? (The simulator says three mounts for a capital ship.)
5. Keep patrols at their old speed in ship units (as integrated), or let them fly faster and retune the missile?
6. Should munitions keep generic sci-fi names or get Greek and Roman ones?
7. What unlocks the capital ship and the armada, and at what level?
8. Should Earth's nation be named for its people like the others, and should the Moon get a colour further from Earth's blue?
9. Should each race field a different force (Mars squadrons of eight, a giant Jupiter flagship), as LORE.md describes?
10. When does the integration branch go into main?

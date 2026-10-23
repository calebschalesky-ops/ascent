# Stations: the systems

Caleb, 2026-10-19: "I would like another thread that really focuses in on each space station: the defenses it has on
it, the ways it strategically defends Navy attacks, the way it can deploy its own Navy / economy / religion / power /
development / improvement." And 2026-10-18: "These space stations will house ships, and in the case of capital ships,
we'll just have them docked because they'll be so big. This is where you'll be able to dock your ship, repair it,
upgrade it, interact with the economy, etc."

His ruling the same day: each station is huge god-themed armour over its planet. **god-armour** owns the body (shape,
orbit, berths, docking, hardpoint positions). **This thread owns the systems** mounted on it. Every number here is a
FIRST PASS, kept in one table per file under `src/lib/station/`, pure and unit-tested (37 tests).

---

## 1. Who owns what

| Thing | Owner | Where |
|---|---|---|
| The megastructure, its orbit, LOD, collision, berths, docking, hardpoint positions | god-armour | `src/lib/megastructure/hardpoints.ts` (coming) |
| What is fitted on each hardpoint, and how it behaves | **stations** | `src/lib/station/` |
| Sites, resources, production, capture, control | conquest | `src/lib/conquest/` (claude/conquest-0b139e) |
| The four meters (government, military, religion, economy) | planets | `src/lib/planets/meters.ts` (claude/planets-cd91e2) |
| Munitions and shields | arsenal | `munitions.ts`, `shields.ts` (copied here byte for byte) |
| Ship tactics, cover, fire decisions | enemy-ai | `tactics.ts`, `pilot.ts`, `fighterAI.ts` (claude/enemy-ai-dbbee0) |
| Squadrons and orders | fleet command | `src/lib/fleet/` (claude/fleet-command-885c0e) |

**The seam.** `mounts.ts` declares the `Hardpoint` shape (id, station, section, kind, pos, normal, size) and twelve
kinds: `turret`, `pointDefence`, `shieldEmitter`, `minelayer`, `hangar`, `berth`, `mooring`, `drydock`, `market`,
`temple`, `reactor`, `sensor`. Until god-armour publishes its file, `provisionalMounts` puts those kinds on today's
small station model (two sections: the ring and the core). When the real hardpoints land, only `mounts.ts` changes.

---

## 2. Each world's station

Themed on the planet's god (the ruling). Myth and cult only: a temple is a building with a history, a boon is a rule
named for what the god was worshipped for. The look of each station is god-armour's (and the art direction's: Earth's
wheel, the Moon's tholos, Mercury's disc and sunshade, Venus's chandelier, Mars's grey wedge, Jupiter's spiked crown,
Saturn's tower and *bema*). `profiles.ts`:

| World | God | Temple | Boon | Guns (turret / point defence / tier-3 heavy) | Shield | Market | Power | Doctrine |
|---|---|---|---|---|---|---|---|---|
| Earth | Gaia / Terra | Aedes Telluris (Rome, 268 BC) | harvest: market income ×1.2 | pulse / flak / rail | deflector | food | The Grid ×1 | defence in depth |
| Moon | Selene / Luna | Temple of Luna on the Aventine | night watch: sensors ×1.25 | **ion** / flak / plasma | hardened | helium-3 | Peaks of Light ×1 | the sanctuary: disable, don't kill |
| Mercury | Hermes / Mercurius | Aedes Mercurii by the Circus Maximus (495 BC) | messenger: calls at once, launches ×1.5 | pulse / flak / rail | bifacet | power | Mirror Fields ×2.5 | the shield wall |
| Venus | Aphrodite / Venus | Temple of Venus Genetrix (46 BC) | charm: prices 10% better, twice as slow to anger | **beam** / flak / plasma | capacitor | chemicals | imported ×0.6 | the Chain Gate: mines from tier 1 |
| Mars | Ares / Mars | Temple of Mars Ultor (2 BC) | avenger: guns ×1.25 once struck | **plasma** / flak / rail | deflector | metals | imported ×0.5 | the legion: 1.5× fighters |
| Jupiter | Zeus / Jupiter | Jupiter Optimus Maximus (509 BC) | thunderbolt: heavy guns ×1.2 | **rail** / flak / torpedo | hardened | helium-3 | Fusion Halls ×1.5 | outrange them |
| Saturn | Kronos / Saturnus | Temple of Saturn, the aerarium (497 BC) | treasury: development ×1.25 | **seeker** / flak / swarm | deflector | hydrocarbons | Methane Burners ×0.8 | patient and far; mines from tier 1 |

Each also names the conquest orbital sites it hosts (`sites`): Earth hosts Pharos Yard and the two Lagrange Guns, and so
on. With one megastructure per planet, conquest's orbital shipyard and batteries become sections of it.

A boon works only while the temple works (powered, not shot off): put out the temple and the god's favour goes with it.

---

## 3. Development: tiers

`civic.ts` `TIERS`. A tier decides which share of each kind of hardpoint is fitted, the shield's Mk (arsenal's
`makeDefence` tier), each section's structure and what the hangar holds.

| Tier | Guns fitted | Mooring | Mines | Shield Mk | Section structure | Hangar |
|---|---|---|---|---|---|---|
| Outpost | half | none | Venus, Saturn | I | 2,000 | 4 fighters, 1 cruiser |
| **Station** (start) | three quarters | the capital ship | Venus, Saturn | II | 3,000 | 8 fighters, 2 cruisers, 1 capital |
| Citadel | all; every other turret carries the heavy gun | yes | everyone | III | 4,500 | 12 fighters, 3 cruisers, 1 capital |

**Improvement.** Development points accrue at 1 a second × (0.5 + economy/100) × power, only while the station is calm
(× 1.25 under Kronos). The next tier needs 600 (Station) or 1,500 (Citadel) points plus resources (metals 20 and power
10; metals 40, power 20 and helium-3 6). A station the player holds can buy its tier for 1,200 or 3,000 credits
instead. `upgrade()` refits it and keeps its damage as a share.

---

## 4. Power

`civic.ts` `POWER`. The reactors together make what everything fitted would draw at once, × 1.1, × the world's power
richness (conquest's power works there); each working reactor makes its share, so a shot-off reactor costs power. Sized
this way the budget holds however many hardpoints god-armour puts on a structure. Each working mount draws: turret 4, point defence 2, shield emitter 6, minelayer 1, hangar 3, berth 1, mooring 2, drydock 4, market 2,
temple 1, sensor 1. Guns on standby draw a quarter.

- **In a fight** power goes to shields, point defence, the hangar, sensors, then the guns, and the market, drydock and
  berths shut. **In peace** the yard and the market come first.
- Short supply scales a kind's work: a gun at half power fires at half rate; shields at half power regenerate at half.
- Mars and Venus buy their power (LORE.md), and it shows: Mars Station 1 makes about 31 against 34 wanted in peace; in a fight
  its guns get 37% (on god-armour's real structure, 15%: it carries 36 turrets). Mercury has power to spare. Cutting Mercury's exports is a way to weaken Mars's and Venus's guns
  (once conquest's trade drives `richness`).

---

## 5. Defences

`defence.ts`. Guns and shields are arsenal's, by id.

- **Sections** hold the structure and the shields: `makeDefence` with the profile's shield, capacity × 8 and regen × 3
  for a structure this size (a Mk II deflector section: 1,080 shield, 57 a second after 3 s unhit). Hits go through
  arsenal's `applyHit` (pierce, shield/hull multipliers, resistances). A section at or below half its structure is
  **suppressed** (conquest's rule): every mount on it stops.
- **Mounts** have their own small structure (turret 150, point defence 80, others 200) and are not behind the section's
  shield, so aimed fire can strip guns off. A destroyed mount is rebuilt in 240 s while the drydock works (conquest's
  rebuild time).
- **Guns** fire their munition at a quarter of its rate (many guns, not fast ones), times power, with 0.004 rad of
  scatter, leading the target (`weapons.ts` `intercept`). A beam fires as half-second ticks.
- **Line of sight.** A mount sees only the half-space in front of its plating, and never through the planet. A station
  cannot shoot through its own armour or its world; an attacker can use either as cover.
- **Point defence** (flak) takes missiles first, even while the station is only wary, then fighters.
- **Mines** (Venus and Saturn from tier 1, everyone at Citadel): laid ahead of the minelayers while fighting; arsenal's
  mine (8-unit fuse, 12-unit blast, 60 s life).
- **Repair**: shields by arsenal's `regenerate`; structure 1% a second after 45 s unhit (conquest's rule).

### 5.1 The alert ladder

| State | When | What it does |
|---|---|---|
| calm | nothing hostile in sensor range (1,500 units) | market open, development accrues |
| wary | a hostile in range | point defence shoots missiles; everything else holds |
| engaged | an attacker has hit it, or its world's ships near it (once; twice under Aphrodite) | guns fire, the fighter screen launches, market shuts, docking refused, the patrol is called, the other stations hear |
| siege | a section's shield is down, a section is below 75%, or a gun is lost | cruisers launch, the capital ship slips its mooring |
| fallen | every section suppressed | nothing works; conquest can take it |

It stands down after 90 s with no new provocation. **A foreign station does not shoot on sight**: it holds fire until
you attack it or its world's ships near it. So you can still dock at a foreign station you have not attacked.

---

## 6. How it fights a naval attack

`navy.ts`.

1. **Fighter screen.** Engaged, it launches every fighter in its hangar, one per 3 s per working hangar mouth (Hermes
   ×1.5). Launched ships use the wingmen's steering (`progression/wingman.ts` `stepWing`) on a **leash**: they attack
   only a target within 600 units of the station and otherwise hold at the hangar mouth. They fire once a second.
2. **Cruisers and the capital ship.** Under siege the cruisers go out ahead of the remaining fighters (one per 8 s), and
   the moored capital ship slips its mooring and puts itself on the line from the station to the attacker
   (`interpose`, 30% of the way out, never inside the planet).
3. **The planet's navy.** After 5 s engaged (Hermes: at once) it calls its world's patrol: `callNavy` returns fleet
   command's `defend { ward }` order in shape, with the live patrol ships within 4,000 units, nearest first, keeping the
   patrol's capital ship on its ring unless the station is under siege. Integration's patrols still fly on rails, so the
   call is recorded but not yet flown (fleet command's `stepFleet` will fly it).
4. **The other stations of the world** take up the same attacker (`alertSiblings`): they go at least wary and fight
   whoever provoked the first.
5. **Cover.** `stationOccluders` hands the station, its planet and its nearby moons to enemy-ai's cover picker
   (`tactics.ts` `Occluder`, kind 'station': the branch already expects stations through `extraOccluders`), so launched
   cruisers and the patrol fight from behind them once enemy-ai is merged.
6. **Recall.** Calm for 10 s, everything flies home at 100 u/s and docks; a ship lost is gone until conquest builds
   another.

---

## 7. What a station gives its world

`civic.ts` `MOUNT_EFFECT`: each working, powered mount adds to its world's meter targets (planets' `Partial<Meters>`),
capped at 20 a meter (about one city with its buildings). Turret military +0.5, hangar +1, mooring +2 military +1
government, drydock +1 military +0.5 economy, market +4 economy, temple +6 religion +1 government, reactor +1 economy,
and so on. When it falls: military −10, government −5, economy −3 at once. Earth Station 1 at Station tier, measured:
military +9.3, economy +7, religion +6, government +2.

**Market.** Prices are base × (1.25 − economy/200), its own resource at 0.8, Aphrodite's 10% off; it buys back at 70%.
Closed while fighting. It pays its world 20 credits a minute × (0.5 + economy/100) (Gaia × 1.2). The screen shows the
prices; trading itself waits for a cargo hold.

---

## 8. Proved in the browser (dev server on 5331, `__voyage.stations`)

Player: Earth, laser only, no shield (arsenal not merged), hull 100. Target: Mars Station 1, Station tier, 6 plasma
turrets and 3 flak, deflector Mk II.

- **Orbiting attack** (circling at 60 u/s, 130 units out, firing for 26 s): engaged within 7 s; docking refused; market
  shut; Mars Station 2 raised; the Mars patrol called (6 ships for each station). Its turrets fired 19 plasma bolts and hit
  0: slow bolts lead a straight line and miss a ship on a curve. Its fighters fired 37 and hit 19 (2.4 each). The player
  landed 93 hits on the station and 5 on guns; the core section's shield fell to 54%, then regenerated.
- **Holding still** (an earlier build, same guns, 128 units off): turrets hit 14 of 22 (60 points a plasma hit), and the
  player died in about 9 s. One gun was shot off by aimed fire; the station went to siege and launched its capital ship.
  The gun was rebuilt by the drydock 240 s later.
- **Focused fire on the core** (60 units off): the core shield fell and the structure took damage (98.2%). The
  fighter screen then soaked up most bolts, and the capital ship that came out was shot down.
- **Withdrawal** to 2,500 units: the leash held, with no more damage to the player. Structure mended to 100% after 45 s
  unhit. It stood down 90 s after the last hit (market open, docking allowed), and all 12 fighters flew home and docked
  within the next 13 s (24 counting Mars Station 2's).
- **Station screen**, docked at Earth Station 1: Defences (calm, Deflector 100%, 6 × Pulse laser, 3 × Flak burst),
  Market (food ★ 4.8 / 3.36 …), Aedes Telluris with its boon, Power 60 of 34 wanted, Station tier 0 / 1,500 toward
  Citadel, and what it gives Earth's meters.
- **Cost**: the station layer takes 0.75 ms a frame with 26 ships out; the frame was 45 ms in the pane, which is the
  renderer.

### 8.1 On god-armour's real hardpoints (a throwaway trial merge of af55314)

Its `Hardpoint` type plugs into the seam unchanged. Each world's megastructure at Station tier, a provoked player
200 units straight out from a hangar mouth for 20 s:

| World | Sections | Turrets fitted | Power, peace / fight | Guns that could engage | Shots | Launches |
|---|---|---|---|---|---|---|
| Earth | 6 | 21 of 28 | 215 / 110, 215 / 180 | 2 | 68 | 8 |
| Moon | 3 | 21 of 28 | 211 / 107, 211 / 178 | 5 | 40 | 8 |
| Mercury | 4 | 21 of 28 | 539 / 111, 539 / 178 | 6 | 204 | 8 |
| Venus | 4 | 21 of 28 | 129 / 108, 129 / 182 | 4 | 4 | 8 |
| Mars | 4 | 27 of 36 | 140 / 152, 140 / 240 | 2 | 4 | 12 |
| Jupiter | 4 | 30 of 40 | 386 / 122, 386 / 218 | **0** | 0 | 8 |
| Saturn | 6 | 21 of 28 | 177 / 113, 177 / 184 | 4 | 4 | 8 |

The finding: on a structure this big most guns are over the horizon from any one approach, so a gate is thinly
covered. I asked god-armour for a battery of at least 6 turrets and 4 point-defence mounts by each hangar and berth
approach. The trial also found a bug, now fixed: a station needing two provocations (Venus) forgot the first one each
frame. `mountState` and `shieldUp` give god-armour what to light, darken or wreck.

---

## 9. Not done, and known breaks

- **The player cannot die.** At 0 hull nothing happens; stations keep firing. Someone has to own death and respawn.
- **Patrol calls are recorded, not flown**: integration's patrols fly on rails until fleet command and enemy-ai merge.
- **Launched ships are simple**: wingman steering on a leash. enemy-ai's `fighterThink` and `warshipThink` should
  replace it; the capital ship holds its interpose point and does not fire yet.
- **Mines** are laid and go off in the scene, but this run never triggered one (Mars lays none at Station tier).
- **Trade**: prices only; no cargo hold, so nothing can be bought or sold.
- **Conquest**: sections and hosted sites are named, but capture by section is conquest's to wire (see the notes folder).
- **Meters** are computed but not yet fed to planets' `approach` (planets is not merged).
- **Docking** (autopilot, L, save and reload while docked) was not re-proved after the merge: handed to god-armour with
  the step-0 work (commit 24ee3a0).

## 10. Questions for Caleb

1. Should a foreign station hold fire until you attack it or its ships (as built), or shoot on sight at war?
2. Are the gods' temples and boons right (table 2), especially Venus's (the art direction's Byzantine court under
   Aphrodite)?
3. Should a station you take become yours to develop with credits, or stay conquest's site that only pays you?

# Ascent Flight — spec

Working title. A space flight game built on The Ascent's flight engine, with every piece of astrology and lore taken
out. Source: `<local>` at tag `v2-guide` (commit `415e311`), copied unmodified as this repo's
first commit (`f4736cf`) so the diff shows exactly what was removed.

## What the core is

- **Flight.** EVE Online's control model (eve-controls, 2026-10-20; see Controls below): the cursor is always free and
  never turns the ship. Double-click in space and the ship turns that way and holds it; left-drag orbits the camera;
  arrows turn by hand; touch joystick on the left half. W/S throttle (logarithmic, 0.4 to 74,000
  units/s; see Scale; it stays where you leave it); double-tap W or Ctrl or Boost ×2.5; X or Stop; flight assist; invert
  and sensitivity in Settings; a gamepad works too.
- **Controls** (eve-controls, 2026-10-20/21: Caleb, "I want the hotkeys to be like that, not the controls. I want the
  Eve controls"; mc-controls' Minecraft keys kept). Every key is in one table (`src/components/controls/bindings.ts`),
  rebindable in Settings, Key bindings, which also lists the fixed mouse moves; the pause menu lists them all.
  **The mouse never turns the ship**: no pointer lock, the cursor always free. **Mouse:** double-click in space flies
  that way (the ship turns at its own rates and holds it; from a stop the throttle opens to 0.3, about 15 u/s; a stance
  or the autopilot is called off). Left click selects a ship, station, moon or planet; the selected-item panel shows
  name, class and nation, distance, velocity and Approach, Orbit, Keep at range, Lock, Dock or Enter in reach, Fly to,
  Look at. Right click on an object: the same actions as a menu; on empty space, the slot's own right click (gun: the
  forward shield block, front hits −40%, capacitor −80/s; 5–9 deploy or recall). Ctrl+click (or C on the selection)
  locks a hostile ship: up to 3 locks, each building over the munition's lock time within lock range, shown as icons
  at the top; the first held is the active target, clicking an icon makes it active, right-clicking unlocks. The weapon
  in hand's number again (1–4) switches it on at the active target until switched off (guns lead it within the 40° gun
  arc of the nose, else fire along the nose; with no lock a gun fires ahead and a lock-only munition such as the torpedo
  refuses); a click on the active target does the same. Left-drag orbits the camera round the ship (it stays put in the
  world as the ship turns; Alt swings it back behind the nose); right button + wheel or + / − zoom (0.4× to 25×, 1.15× a
  notch); middle click selects under the cursor. The bow draw is gone. **Keys (Minecraft placement):** W/S throttle
  (sticky), A/D strafe, double-tap A/D dodges (18 u/s, 15 energy, 2.5 s), Space/Shift up/down, double-tap W or Ctrl
  boost, X full stop, arrows turn by hand (let go and the heading holds), 1–9 or the wheel the hotbar (1–4 weapons, 5
  swarm, 6 fighters, 7 infantry, 8 repair: locked, 9 countermeasure), F last weapon, R cycles approach, orbit, keep at
  range on the selection (hold R and scroll: distance; orbit speed capped at 2,000 u/s since the worlds grew ×5), the
  overview pinned at the right edge (Settings; unpinned, hold Tab; click a row selects, Ctrl+click locks), Q
  countermeasure, E shipyard, G autopilot, J hyperspace, T fleet command, Z fleet attack, B board, M navigation, Enter
  enter or dock, F1 HUD, F5 orbit camera / cockpit / rear, F11 full screen, Esc menu.
- **Bodies to scale with one another** (Sun 109 Earths across, Jupiter 11, Mars 0.53 …); spacing is not to scale.
- **Fixed layout.** Each body sits at one constant angle on its own ring (`src/lib/bodies.ts` `LAYOUT`). No dates, no
  ephemeris.
- **Orbit** when the engines are off near a body (45 s lap at parking distance, r^1.5 further out).
- **Autopilot and routes.** Paths go around any body in the way, re-planned every second; phases aligning, cruising,
  approaching, parked; the **Grand tour** route visits every body from Earth out to the edge.
- **Navigation screen**: Map (M), Computer (N), Route (R); Esc closes it, then opens the pause menu.
- **Arrival card**: name, radius against Earth's, distance to surface, who holds it, Enter.
- **Entering** a body (E or the Enter button): fly in through a wash of its colour to an empty placeholder room;
  Leave (Esc) puts the ship back where it went in, orbiting.
- **Full screen** (F, the Full button, the pause menu). **Save / Load / Continue**, including while inside a body.
- **Weapons** (added 2026-10-18 at Caleb's request, see below).
- **Nations**: one holds Earth, the Moon and each planet; the player's is the one picked at the start.
- **Progression** (added 2026-10-18, see below and PROGRESSION.md): faction start, 21 loadouts, levels, fighter bay,
  first-pass purchasing.

## Rulings (from the brief)

1. **Planet layout.** Fixed angles: Moon 300°, Mercury 150°, Venus 250°, Sun 58°, Mars 0°, Jupiter 116°, Saturn 200°,
   stars waypoint 30°. Chosen so the straight Mars → Jupiter leg of the Grand tour runs through the Sun (it passes
   about 555 units from the Sun's centre; the Sun is 40,400 in radius) and the autopilot has to detour. Each body keeps its
   ring radius (`VR`) and true relative size (`BODY`).
2. **Names stay plain.** Earth, the Moon and the planets keep their astronomical names. The crystal shells around Earth
   and the light at the rim stay as scenery, unlabelled. The rim is "the edge". Zones read "Near Earth", "Mars's ring",
   "The stars", "The edge".
3. **Arrival card and entering.** Physics only on the card; inside, an empty room that says it is a placeholder.
4. **Colours stay, meanings go.** Each ring keeps its colour as palette (`COLOR`), with no source attached.
5. **Nothing regressed.** Every control in the brief was re-proved in the browser (see THREAD-LOG). Tests that used
   a chart now use the fixed layout plus eight scrambled layouts.
6. **Purely local.** Nothing hosted, published or deployed.

## What was removed, and why

All of it is astrology or lore, which is out of scope for the game.

- `lib/astro.ts` (charts, ephemeris) and the `astronomy-engine` dependency; `lib/symbols.ts` replaced by `lib/bodies.ts`.
- `lib/entities.ts`, `lore.ts`, `avatars.ts`, `seals.ts`, `kamea.ts`, `guide.ts`, `personal.ts`, `moments.ts`,
  `events.ts`, `players.ts`, `uid.ts` and their tests (`astro`, `entities`, `hours`, `kamea`, `lore`, `personal`, `seals`).
- Screens: `Explain`, `GuideView`, `Inhabitant`, `ChartWheel`, `Charts`, `Today`, `SettingsView` (birth data),
  `SphereDisplay` (replaced by `InsideRoom`), `MomentCard` (replaced by `ArrivalCard`), `CosmosView` (replaced by
  `GameView`), `bits.tsx` (player tokens, glyphs).
- Dev seal page and scripts: `dev/seals.html`, `src/dev/sealCompare.tsx`, `scripts/seal-tracer.js`,
  `seals-head.ts.txt`, `seals-to-ts.py`.
- In the scene: the zodiac band and its ticks, sign glyphs and their angels, the rings of names and seals, the
  Paracelsus labels, the planet glyph sprites, the shell labels and "THE ONE". Sprites went from 87 to 10.
- In the UI: the moment chips, the time stepper, the Chart tab and C key, the vices on the sphere banner, the
  Today and Charts tabs, the app tab bar, sign-and-degree readouts (heading is now plain degrees).
- 260 CSS rules that only those screens used.

## Weapons (Caleb, 2026-10-18)

"Lasers that you can shoot with the left click … regular missiles that do a slight homing on the target before getting
close. Then the homing will turn off and just run into it, unless they dodge last second."

- **Left click fires** the selected weapon (held: laser 7 shots/s, missile 1.25/s). **G** cycled the fitted weapons
  (Caleb, 2026-10-18; it replaced Q, 1 and 2; see Arsenal); since mc-controls the hotbar's 1–4 and F pick them. On touch: **Fire** (hold) and a weapon button beside
  Boost and Stop. A mouse click no longer picks a
  body as a target; the chips, the map and the computer still do.
- **Laser**: bolt at 260 units/s plus the ship's speed, 12 damage, 1.6 s life.
- **Missile**: accelerates to 135 units/s, 60 damage. **With a lock** it homes at no more than 1.3 rad/s; at 22 units
  from its target the homing switches off and it flies straight. **Without a lock** it has no target and flies
  straight where the nose pointed.
- **Last-second dodge**: once a missile's homing is off and it is closing, the target rolls once (its type's dodge
  chance; see Ship types) and sidesteps at 14 units/s for 0.6 s, which makes a straight-flying missile miss.
- Hit points and hit radius come from each ship's type (see Ship types). `Craft.radius` is the ship's body radius:
  its type's hit radius less the bolt's 0.2 reach (integration pass 1), so a bolt hits within 0.2 + that radius
  (exactly the type's hit radius) and a missile within 0.3 + it. Hull, armour and shield come from the race's
  loadout for the type, as arsenal's defences (`lib/craftStats.ts craftArms`, integration pass 2). The lock and the lead read the same radius, so bigger
  ships are easier to lock and hit. Shots pass through friendly (Earth) ships. Destroyed ships do not come back yet.
- Maths in `lib/weapons.ts` (unit-tested); scene in `components/combat.ts`.

### Targeting (Caleb, 2026-10-18)

"For both the lasers and the missiles, you should need to acquire a missile lock through holding a certain targeting
system on the enemy ship. For the laser, you should just click and there should be an advanced targeting system that
will show if your line of sight is correct."

Read as: missiles need a lock built by holding the reticle on one ship; the laser needs no lock but gets an aiming aid.

- **Missile lock by holding** (`LOCK` in `lib/weapons.ts`, `stepLock`). Hold the reticle (screen centre, the camera's
  line) on one hostile ship within 400 units for **1.5 s** (`LOCK.time`). "On the ship" means within 3° (`LOCK.cone`)
  or over the ship's body if it looks bigger than that. On screen, with the missile selected: four amber corner
  brackets close in on the ship and a ring fills as the lock builds; at full they turn red and read **LOCKED**. The
  HUD line reads "no lock", "locking Mars nation 60%", or "LOCKED: Mars nation".
  - Off the ship while acquiring: the lock drains at 1.5 per second (a full lock's worth in 0.67 s); once drained it
    can start on another ship. A second ship crossing the reticle does not steal a lock in progress.
  - Once LOCKED it holds while the ship stays within about 11° of the reticle (`LOCK.keep`) and in range; beyond that
    the lock breaks outright. A lock on a ship that dies is dropped.
- **Laser aiming aid** (`intercept`, `boltMiss`). For the locked ship, or else the hostile ship nearest the reticle
  within 20° and the bolt's reach: a **diamond** at the lead point (where a bolt fired now meets the ship, from the
  bolt's speed and the ship's measured velocity) and a small **cross** for the gun's line at that range. The bolts
  leave along the nose, which is not the screen centre (the camera sits behind and above the ship), so the cross is
  the honest "where my shots go": put it on the diamond. Both are amber while a bolt fired now would miss and turn
  **green** when it would pass within the bolt's reach plus the ship's hit radius; the HUD line says "will hit" or
  "will miss".

## Arsenal (Caleb, 2026-10-18)

"Add 10 different types of munitions, as well as different types of shielding technology and other types of space
technology such as drones and other things that you can think of that will improve the possible upgrades."

Research and the reasons for every choice: `RESEARCH-ARSENAL.md`. Names are generic placeholders. **Balance and feel
are Caleb's; prices and how upgrades are earned are the economy, undecided, so every `cost` is null.**

- **Ten munitions** (`lib/munitions.ts`, one table). Each has a damage type (energy, kinetic, explosive, ion), speed,
  life and range, rate, shield and hull multipliers, pierce, blast radius, a lock rule (none, optional, required) and
  lock time, and a cost in ammunition or capacitor energy.

  | Munition | Type | Dmg | Speed | Rate/s | ×Shield | ×Hull | Lock | Cost | Special |
  |---|---|---|---|---|---|---|---|---|---|
  | Pulse laser | energy | 12 | 260 | 7 | 1 | 0.8 | none | 3 energy | the original laser |
  | Beam laser | energy | 45/s | instant, 120 reach | held | 1.2 | 0.6 | none | 24 energy/s | hits while held on target |
  | Plasma bolt | energy | 40 | 110 | 1.6 | 0.5 | 1.5 | none | 12 energy | hull breaker |
  | Railgun slug | kinetic | 70 | 900 | 0.6 | 0.6 | 1.2 | none | 30 rounds + 15 energy | 40% passes the shield |
  | Flak burst | explosive | 30 | 180 | 2.5 | 0.8 | 1 | none | 80 rounds | 4-unit proximity fuse, 7-unit burst, kills missiles |
  | Seeker missile | explosive | 60 | to 135 | 1.25 | 0.8 | 1.2 | optional 1.5 s | 24 | the original missile, dodgeable |
  | Torpedo | explosive | 220 | to 45 | 0.25 | 0.6 | 1.6 | required 3 s | 4 | 10-unit blast |
  | Swarm missiles | explosive | 6×14 | to 120 | 0.5 | 1 | 0.9 | optional 0.8 s | 8 salvos | homes to 4 units: no time to dodge |
  | Ion shot | ion | 30 | 200 | 1.5 | 3 | 0.05 | none | 10 energy | disables 4 s once the shield is down |
  | Proximity mine | explosive | 120 | dropped | 0.5 | 0.9 | 1.3 | none | 10 | arms 1.5 s, 8-unit fuse, 12-unit blast |

- **A hit** (`lib/shields.ts`, `applyHit`): the pierce share goes to the hull; the rest meets the shield at
  damage × shieldMul × (1 − resistance); what the shield cannot hold carries to the hull at hullMul, less armour.
  Area damage is full inside a third of the radius, then falls off linearly (`areaFalloff`). Ion disables a ship whose
  hit side is at zero shield: it stops where it is, cannot dodge or use countermeasures, and its shield does not
  regenerate until it recovers.
- **Shields**, three tiers each (Mk II ×1.35, Mk III ×1.7 capacity and regen): **deflector** (100, 14/s after 3 s),
  **hardened** (80, 6/s after 4 s; resists energy 40%, kinetic 10%, explosive 30%, ion 50%), **bi-facet** (70 front and
  70 rear, 10/s after 2.5 s; a hit lands on the side it came from), **capacitor** (60, 22/s after 2 s; the weapons draw
  on it when the capacitor is empty). Every hit on a shield flashes a bubble in the shield's colour; a disabled ship
  flickers ion blue.
- **Player**: 100 hull plus the fitted shield and armour; a capacitor (reactor Mk I 100, refills 30/s; it does not
  refill while a beam is held); ammunition per fitted weapon. Enemies now fire on the player (see Enemy AI).
- **Enemy fits** (`ENEMY_FIT` in `lib/tech.ts`): Moon deflector; Mercury hardened + flares; Venus bi-facet; Mars
  capacitor + flares; Jupiter hardened + chaff; Saturn deflector + flares; 3 charges each. These are now the doctrines' preferred shield and countermeasure (see Enemy AI); the old wording follows. Equipment only: enemies still
  do not shoot back, and there is no enemy AI. A ship with flares drops one when a missile homing on it comes within
  60 units; a ship with chaff drops a cloud the moment the player locks it, which breaks the lock 80% of the time
  (less with a better targeting computer) and keeps it unlockable for 3 s.
- **Countermeasures** (C, or the touch button): **decoy flares** (6, 1.5 s apart: a homing missile that sees one
  within 40 units ahead takes it 75% of the time, less the firer's seeker grade), **chaff** (4: breaks a lock held on
  the ship; nothing locks the player yet), **jammer** (passive: incoming missiles turn at 60%, locks take 1.6×).
- **Drones** (two slots, they circle the ship): **attack** (shoots the nearest hostile within 60 units, 1.2/s, 6
  damage, leading its shots), **repair** (4 hull and 6 shield a second), **point defence** (3 shots a second at hostile
  missiles within 25 units, 50% each).
- **Other modules**: targeting computer Mk I–III (lock time ×1, ×0.75, ×0.5; seeker grade 0, 0.3, 0.6 against
  decoys; lead reach 20°, 26°, 34°), reactor Mk I–III (100/30, 140/42, 200/60), armour Mk I–II (+40 or +90 hull and
  resistances, kinetic most), afterburner Mk I–III (boost 2.5×, 3.2×, 4×).
- **Upgrades as data** (`lib/modules.ts`): `MODULES`, one row per module with slot, tier, one line of what it changes
  and `cost: null`. `Loadout` is saved in Settings (`settings.loadout`, migrated and sanitised: unknown ids dropped,
  4 weapons, 2 drones, at least one weapon). The **Loadout** screen in the pause menu fits anything now; fitting
  refills shield, capacitor and ammunition. A station's upgrade panel can read the same table.
- **Controls** (before mc-controls; now see Controls under What the core is): G cycled the fitted weapons, C dropped
  the countermeasure (now Q). Left click fires; munitions with a lock rule
  show the lock bracket, bolt-type munitions and the beam show the lead indicator for their own shot speed. The HUD
  shows the munition, rounds left, the lock or the lead, and a second line for shield, hull, energy and countermeasure.
- **Scale**: every distance and speed goes through `scaleMunition`; Voyage calls `combat.arsenal.setScale(SHIP / 0.18)`
  so the arsenal follows the ship's size if planet scale changes `SHIP`.
- **Dev hook** (`window.__voyage`, dev only): `arsenal` (stats per munition, `extra`, `player`, `incoming(range)` for a
  hostile test missile at the player, `hitPlayer(id, amount)`), `setLoadout(l)`, `countermeasure()`.

## Enemy AI (Caleb, 2026-10-18)

"Arm the enemy ships with somewhat random, but with order according to planet, class of ship, and level of ship …
fighter ships should execute complex maneuvers and try and out-evade and shoot at you. Cruiser and capital ships
should try and position and maneuver to outposition you and take advantages … through fleet tactics and the
environment."

Every decision is in a pure, unit-tested lib; the scene (`components/enemyAI.ts`) only flies, fires and draws.
**Every number is a first guess in `lib/aiKnobs.ts`; balance, difficulty and feel are Caleb's.** Distances there are
world units at arsenal scale 1 and are multiplied by the arsenal's scale, so they follow `SHIP`.

- **Armament** (`lib/enemyArms.ts`, `rollFit`): a seeded roll (same nation, class, level and seed → same ship) from
  the munition and module tables. Weighted by the nation's **doctrine**, by **class** (`CLASS_WEAPON`: fighters lead
  with a gun and never carry torpedoes, railguns, beams or flak; cruisers mixed; capital ships lead with a heavy
  weapon and always carry point defence) and by **level** (1–5; module tier cap 1, 2, 2, 3, 3; shield Mk at the cap
  or one below; pilot skill 0.2–0.8). A weapon off the doctrine still turns up now and then (weight 0.15).

  | Nation | Doctrine (placeholder wording) | Weapons it favours | Shield (ENEMY_FIT) | Counter | Drones |
  |---|---|---|---|---|---|
  | Moon | Picket | pulse, flak, mine, seeker | deflector | none or flares | repair, PD |
  | Mercury | Sun-side raiders | plasma, pulse, beam, swarm | hardened | flares | attack |
  | Venus | Shield wall | ion, beam, swarm, pulse | bi-facet | jammer (tier 3) or none | PD, repair |
  | Mars | Missile doctrine | seeker, swarm, torpedo, pulse | capacitor | flares | attack, PD |
  | Jupiter | Heavy line | rail, torpedo, flak, plasma | hardened | chaff | PD |
  | Saturn | Ambush | mine, rail, ion, seeker | deflector | flares, chaff | repair, attack |

  Each doctrine also carries a temper (aggression, standoff ×, cover, Sun) that the AI reads.
- **Ship classes and levels are stand-ins.** `CLASS` mirrors `SHIP_SPECS` on `claude/ship-types-4d54b4` (size, hp,
  hit radius, dodge) and adds flight and slot numbers; the roster is one capital ship, two cruisers and two fighters
  per nation (`STANDIN_ROSTER` in combat.ts); levels are `NATION_LEVEL` (Moon 1 … Jupiter and Saturn 4, capital
  ships +1) until progression decides.
- **When they fight.** Idle is the patrol ring. A nation engages when the player comes within 12 units of any of its
  ships, or hits one, or completes a missile lock on one; it goes home after the player has been 450 units from all
  of them for 8 s, or is lost. `combat.ai.setAttitude(nation, 'neutral')` makes a nation engage only when attacked.
- **Enemy fire** goes through the same munitions and shield/hull split as the player's (× `damageMul` 0.5). Guns
  lead with the intercept maths and scatter by skill; missiles need a lock built on the player (fighters down the
  nose, warships' launchers turn), slower against the player's jammer and broken by the player's chaff; flak shoots
  the player's missiles first. The player's flares, point-defence drone, jammer, chaff, shield and repair drone all
  work against it. Enemy drones work too (repair, point defence, attack).
- **Fighters** (`lib/fighterAI.ts`): approach (straight, round to the six, or out of the Sun), attack (pursuit on
  the lead, boom-and-zoom at full throttle), break off and extend, evade (break turn, barrel roll, jinks) when the
  player is on its six or it is hit; a missile homing on it makes it turn across the missile's line and drop a flare;
  the last-second dodge uses its class's chance (fighter 0.6). Fighters can match 1.15× the player's speed.
- **Cruisers and capital ships** (`lib/warshipAI.ts`, `lib/tactics.ts`): standoff from their weapons' effective
  range, kiting just outside the player's reach when they outrange it; cruisers hold range with turrets on the player
  and back off; capital ships circle broadside on. The fleet plan anchors on the capital ship (or home): capital on
  the line, cruisers on a pincer either side, half the fighters screening the capital until the player comes close.
  Below 30% shield (by doctrine) a warship hides behind a body or another ship until the shield is back to 85%. Ships
  bend away from bodies and never enter them; shots stop at bodies; a ship holds fire if a friendly is in the way.
- **The Sun**: fleets swing their line toward the Sun by doctrine, fighters may come in out of it, and a target within
  0.08 rad of the Sun's disc takes the player twice as long to lock.
- **Ship lost (placeholder)**: hull at zero → "SHIP LOST" on the HUD, the ship stops, 3 s later it is back at the
  start, refitted, with 4 s in which nothing can hurt it. No penalty, no lore: that is Caleb's.
- **HUD**: DISABLED, "being locked" / "LOCKED ON ×n", "MISSILE ×n".
- **Not yet**: stations and asteroids as cover (the `Occluder` kinds and combat's `extraOccluders` hook are ready);
  enemies fighting Earth's ships; real ship models and the ship-types roster.

## Nations (Caleb, 2026-10-18)

"Add a nation that controls each planet. You start on Earth."

- `lib/nations.ts`: Earth (the player's by default; a new game picks, see Progression), Moon, Mercury, Venus, Mars, Jupiter, Saturn. The Sun is held by no one.
- Each non-player nation is named for its race (see Races). Each fields one capital ship, two cruisers and four
  fighters in its colour (see Ship types). Since enemy-ai (integration pass 2) they shoot back (see Enemy AI).
- Not decided, and not invented here: how progress works (expansion, battle, conquest), mining, the economy.
  fighters in its colour (see Ship types). They do not shoot back yet.
- How the nations' worlds are taken, and how their navies come back, is Conquest (below).

## Ship types (Caleb, 2026-10-18)

"A capital ship, which will be much larger than the player ship. I'll say about five times larger. Fighter ships which
will be five times smaller. Then the player ship, and cruise ships, which will be the same type of ship as the player
ship." Read "cruise ships" as cruisers.

- Table in `lib/shipTypes.ts`. Every size is in player-ship lengths, never world units, so rescaling the player ship
  (`SHIP` in `Voyage.tsx`, passed to `createCombat`) carries through to every enemy and its hit radius.
- **First-pass numbers, to be tuned by play:**

  | Type | Length | Hit points | Hit radius | Patrol speed | Ring | Dodge |
  |---|---|---|---|---|---|---|
  | Capital ship | 5× | 900 (75 laser hits, 15 missiles) | 3 lengths | 0 (holds station) | 1.0× patrol radius | 3% |
  | Cruiser | 1× | 100 (9 laser hits) | 1.9 lengths | 1× | 1.45× | 35% |
  | Fighter | 0.2× | 36 (3 laser hits) | 1 length | 1.6× | 0.55× | 60% |

  Hit radius is how close a shot must pass; the cruiser's (0.70 units today) matches the old 0.7 test. Patrol speed
  multiplies the base lap rate. Ring multiplies the patrol's height above the surface (integration pass 1; it multiplied the
  whole radius before planet scale), so the three
  types fly on separate rings, each clear of the surface and inside the orbit zone at every home (tested at today's
  ship scale and at three times it).
- **Force per nation**: 1 capital ship, 2 cruisers, 4 fighters (49 ships, 42 hostile). Earth's are friendly.
- **Models** (`components/space/fleet.ts`): the capital ship is a long armoured wedge with a keel, stepped decks, a
  bridge tower at the stern, four turrets, a nation-coloured light strip down each flank and three engines. The cruiser
  is the player's own ship with its brass repainted in the nation's colour. The fighter is a dart with a bubble canopy,
  delta wings and twin fins. Each is merged into one mesh per material and the capital and fighter share geometry
  across nations: 5 draws a capital ship, 5 a fighter, 10 a cruiser (beacon included).
- The hit test no longer reads `LASER.radius` / `MISSILE.radius`; it uses each ship's own `radius`.

## Scale (Caleb, 2026-10-18)

"Scale planet size as to being absolutely massive and to scale with the ships. Star Wars level."

- **The ratio.** Player ship: hull 2.06 model units nose to engine bells × `SHIP` 0.18 = **0.371 scene units** (measured
  from the model's bounding boxes in the browser). Before: Earth's radius 2 = **5.4 ship lengths**. Now: Earth's radius
  370 = **998 ship lengths** (Sun 40,400 = 109,000; Jupiter 4,060; Mars 197; the Moon 101 = 272). Target was about
  1,000: big enough that a planet fills the sky and a ship is a speck against it, small enough that a trip between planets
  still fits in seconds without the throttle needing more than five decades.
- **Grow the cosmos, not shrink the ships.** `nav.ts` `COSMOS = 185` multiplies every cosmos distance: ring radii (`VR`),
  body sizes (`BODY`), arrival, parking and clearance distances, orbit zones, `LIMIT`, the autopilot's speeds
  (`AUTO.speed` 74,000, `min`, `cornerMin`, `creep`, `parkSpeed`, `viaReach`), `parkSlack`, and the throttle's top
  (`MAX_CRUISE` 74,000; boost ×2.5). Why this way round: one scene unit stays one ship-sized unit, so the ships, the
  camera rig (follow distance 0.85, near plane 0.01), the dust, the weapons (`LASER`, `MISSILE`) and the enemy models all
  keep their numbers and nobody else's files change. Shrinking the ships instead would have put them at 0.002 units,
  inside float precision noise near the edge of the cosmos and below the near plane.
- **Same seconds.** Because every cosmos distance and every open-space speed scale together, the autopilot's flight is
  scale-free: the ETAs, the 45 s orbit lap at the parking distance and the detours are what they were. Turn rates are
  angles and did not change. What does not scale: the 0.6 units/s floor of the speed limit near a surface (so you can
  always creep), and the collision floor, now 0.4% of the radius + 0.5 units (Earth: 2 units, about 5 ship lengths, so
  you can skim the ground; it was 2% + 0.08).
- **Rendering at this size.** The cosmos is 481,000 units across with the camera 0.85 behind a 0.37-unit ship, so the
  renderer uses a **logarithmic depth buffer** (`logarithmicDepthBuffer: true`, far plane 2.2 × `LIMIT`); every custom
  shader writes it through `withLogDepth` in `materials.ts`. Shaders work in **view space** (`modelViewMatrix`, which
  three.js composes on the CPU in double precision) instead of `viewMatrix * modelMatrix`, which in single precision
  shakes a surface 200,000 units from the origin by about 0.016 units. The dust wraps on the CPU and draws relative to
  the camera for the same reason.
- **Close up.** Bodies are three-level LOD spheres: 384 segments near (256 on phones), 96 from 4 radii out, 32 from 30;
  the horizon stays round to under a pixel at the collision floor. Surfaces gain up to 10 extra noise octaves (6 on
  phones) as you come close, each added only while it is bigger than about three pixels, so a far body costs one
  octave. City lights break into specks; craters use a smooth-minimum Worley distance (a plain minimum left straight
  seams across the ground at a few ship lengths up).
- **Rings and patrols.** Each planet's ring is now a hairline instead of a tube 0.08% of the ring radius thick (118
  units at Mars: it read as a pipe a hundred ship lengths wide). Patrols fly at `1.6 × radius + 185` (Mars: 303 above the
  surface; was 2.2 × radius + 3, the same ratio at the old scale), inside where the autopilot parks, so arriving you look
  down on a nation's ships against its planet.
- **Saves.** A saved journey now carries `scale` (= `COSMOS`); one saved before the rescale (no `scale`) is multiplied by
  185 on load, so it comes back in the same place relative to the bodies.
- **Weapons**: no change needed, because the ships did not change size: bolts at 260 units/s live 1.6 s (416 units, about
  1,100 ship lengths), a missile locks within 400 and lets go at 22. For the record: a missile tops out at 135 units/s,
  so one fired while cruising faster than that falls behind (as before the rescale).

### Ships ×5 smaller (Caleb, 2026-10-21)

"The planets don't look life size." They were true in km, but against a 200 m cruiser parked 30,600 km out. Caleb chose
to shrink the ships rather than fake the planets. `bodies.ts` `KM_PER_UNIT = 0.04 / 0.3708`: a scene unit is 108 m, so
the **cruiser is 40 m, a capital ship 200 m, a fighter 8 m**. Every body, orbit, the god armour, berths, sites, terrain
and air stay true in km, which in units is ×5: Earth's radius 59,059 units (159,275 cruiser lengths), 1 AU 1.387e9,
`COSMOS` 29,530. Ships, weapons, combat ranges, the camera rig, the dust and docking keep their units. Everything that
was a world distance written as a plain number now goes through `COSMOS` (the sky sphere `170 × COSMOS`, the armour
entry's speed cap, the stance distance's top, conquest's near-site radius, a station's patrol call reach). Saves carry
`scale`; one written with 200 m ships comes back ×5 about Earth's centre (`migratePos`), the same place against its body.
Frame cost at the same body-relative poses: Earth's arrival point and Jupiter's parking point draw the same calls and
triangles as before; over the armour 290 calls against 272. THREAD-LOG.md, scale-jump-danger, has the full table.

## Races (Caleb, 2026-10-18) — DRAFT

"Develop a race for each planet. That will be an offshoot from the human race that colonized the solar system. We're
going Greek and Roman themes."

- The lore is in **[LORE.md](LORE.md)**: a first draft for Caleb to react to, not canon. Earth stays human. The Moon,
  Mercury, Venus, Mars, Jupiter and Saturn each hold a people descended from Earth's colonists: Selenitai,
  Hemerodromoi, Nephelai, Quirites, Diadochoi, Autochthones. Physical facts come from NASA's fact sheets, cited there.
- History and myth only. No astrology, planetary metals or days, zodiac or Hermetic ideas.
- `lib/races.ts`: id, name, demonym, home and a one-line description per race; `lib/races.test.ts` checks every
  non-player nation has exactly one. `lib/nations.ts` takes its names from it. The arrival card's "Held by" row
  shows the race and its line.
- Not decided: everything in LORE.md's open questions. Ship models, combat and scale are untouched by this.

## Progression (Caleb, 2026-10-18)

"Right at the game, you're gonna go to the planet, which will give you what race you are … The player will start out
with a cruiser ship … adding fighter ships to his cruiser bay … more options to unlock and purchase new technology."

Full rules and tables in **PROGRESSION.md**; code in `src/lib/progression/`.

- **Faction start.** New game → choose a home planet → that nation is the player's (saved), the ship is named for
  the race ("Quirite Corvus"), and the player starts at home in that race's level-1 cruiser. Earth starts where it
  always has.
- **21 level-1 loadouts** (7 races × capital, cruiser, fighter), each following the race's doctrine in LORE.md, built
  from arsenal's ten munitions and four shields by their real ids. Every enemy ship flies its race's loadout for its type (integration pass 1: armour and shield add to the type's hit points, countermeasures to its dodge).
  from arsenal's ten munitions and four shields by their real ids. Each nation's ships fly their race's loadout for their type, added to the type's hit points and dodge (merged with ship types on the fleet-command branch).
- **Levels**: 50 × L × (L − 1) XP for level L, top level 10. XP and credits from kills.
- **Unlocks**: bay slots at levels 2, 4, 6, 8 (the first fighter free); tech tiers 2, 3, 4 at levels 3, 5, 7.
- **Fighter bay**: B launches a fighter, V recalls them. Wingmen escort, attack the player's lock or last-hit target,
  and return to dock.
- **Shipyard** (pause menu): buy and fit tech, buy bay fighters.
- **Economy: FIRST PASS.** Every number (starting credits, kill rewards, prices) is in one table, `ECONOMY` in
  `src/lib/progression/economy.ts`, for Caleb to reshape. No trading, mining or markets.
- **Placeholders** waiting on other branches are all in `src/lib/progression/refs.ts`: ship class names (races),
  armour, drone and countermeasure ids (arsenal), kill types (ship types).
  armour, drone and countermeasure ids (arsenal). Kill types are real now (ship types is merged on the fleet-command branch).

## Fleet command (Caleb, 2026-10-18)

"I want the progression to get to a point where you can command capital ship … add cruisers as well as a lot more
fighters that you can deploy from your capital ship in battle and control their targets, flight paths, defenses,
strategies, missions … building an armada with multiple ships."

Plan, research and build order in **FLEET-COMMAND.md** (sources in FLEET-COMMAND-RESEARCH.md). Brains in
`src/lib/fleet/` (pure, unit-tested); scene in `src/components/fleet/fleetRuntime.ts`; UI in `CommandBar.tsx` and
`TacticalView.tsx`.

- **Ranks** (`lib/fleet/command.ts`), on progression's levels: Pilot (1), Flight lead (2), Squadron leader (8) fly
  the cruiser with progression's bay; **Captain** at level 10 commands a capital ship with a bay of 2 cruisers and 8
  fighters; Commodore and Admiral need a second capital ship and a shipyard (not built). Fleet size is capped in
  command points: fighter 1, cruiser 3, capital 10 (Captain 14, Commodore 38, Admiral 100). The mission "Take
  command" is not built, so level 10 alone opens command for now; the dev build has a test button.
- **Flying the capital ship**: its model replaces the cruiser; the camera sits 4× further back; it turns at 35% of
  the cruiser's rate. Its four turrets fire by themselves (two on point defence). Its hit points stop at 1 (no losing
  state yet).
- **Wings**: launched ships join Cruisers, Alpha, Beta (four each), each on its own station round the flagship.
- **Orders**: Attack (focus fire; obeyed even under hold fire), Defend (escort: answers whoever hit the ward in the
  last 6 s or is going for it), Follow, Hold, Path (drawn waypoints, loop to patrol; the first ship flies over every
  point, the anchor slows into corners and waits for ships keeping station), Recall (dock; the bay refills), Launch.
- **Formations**: wedge (gap 3 lengths), line abreast (4), column (3.5), screen (a ring, 2.5); the gap scales with
  the biggest member and slots keep clear of the leader's hull.
- **Stances** (× gun range: fighter 60 lengths, cruiser 100, capital 160): aggressive looks 2.0 and chases 4.0;
  defensive 1.0 / 1.2; hold fire never picks a target; evasive 0.8 / 0.8 and weaves hardest.
- **Controls**: C command mode (1 All, 2–5 wings; A attack my target, D defend me, F follow, H hold, P path, L launch,
  R recall, V formation, B stance); Z attack my locked target (or form on me); T the Fleet tab, where time runs at ¼
  (Pause and 1× buttons): tap a wing to select it, an enemy to attack it, your ship to defend it; Hold at… and Path
  by taps. Every order is also a button; on a phone the strip folds to one button.
- **Enemies on the same brains**: `fleet.aggro(nation)` turns a nation's patrol loose on the flagship (a test of
  defend; enemy strategy is not designed). Fleet kills earn progression's XP and credits.
- Not built: doctrine, missions, wing split and merge, a second capital ship, transfer flag, bridge camera,
  self-preservation, saving the fleet (a reload starts with a full bay), radio acknowledgements.

## Drone swarms (Caleb, 2026-10-19)

Swarms of one role launched from a carrier's hangar (4 drones a slot: cruiser 16, capital 48). **Explosive** drones hunt
as a pack, encircle out of the target's guns and strike in waves; **shield** drones form a bubble round their ward, or a
wall toward the threat when too few, and take the hits; **laser-focus** drones (arsenal's attack drone) converge every
beam on one point. Point defence and flak thin them. Orders are fleet-command's; hotbar slot 5 (5 again picks the role, right click
launches or recalls; mc-controls) replaced keys 7 / 8 / 9 and 0. Code `src/lib/swarm/`, `src/components/swarms.ts`; design and proofs in DRONE-SWARMS.md.


## Drill boarders (Caleb, 2026-10-19)

"A drill boarding ship, which will be able to be launched from a capital ship at another capital ship or cruiser, and
on impact will drill through and unleash infantry into the internal hull of the ship in order to take control of the
ship rather than just destroy it." Design: DRILL-BOARDER.md.

- **T** boards the ship under the held lock (a cruiser or capital ship), from the nearest friendly capital ship within
  250 L that still has a boarder (4 per capital ship per flight, stand-in until the hangar table lands).
- A boarder flies at 30 L/s with 20 s of fuel. Point defence (hull guns, flak, point-defence drones, split between the
  boarders in range) and the player's lasers shoot boarders down.
- **Shields must be down**: above 25% the boarder is deflected. The drill takes 2.5 s and costs the target 4% of its hit
  points; then the troops fight the crew (stand-in Lanchester model, to be replaced by infantry-carrier's).
- **Captured**: the ship changes side, takes the player's beacon colour, escorts the player and is saved
  (`GameData.prizes`); it pays like a kill. **Repelled**: the boarders are lost, and the crew left standing is what
  the next boarding meets.
- Enemy capital ships board the player's capital ship and prizes whose shields are down; a ship they take lies adrift
  under their colours and can be boarded back.
- Libraries: `src/lib/boarding/` (pure, tested). Scene: `src/components/boarding.ts`, models `space/boarder.ts`.

## Conquest (Caleb, 2026-10-18)

"Conquering each planet … cities, bases, factories etc, mines even on each planet with certain resources that make the
planets useful economically, strategically and militarily. Each planet should be able to produce more of its navy after
you destroy it, until you control the planet or all of its production sites."

Full design in **CONQUEST.md**; rules in `src/lib/conquest/` (pure, tested); scene in `components/conquest.ts`.

- **Sites**: 76 across the seven worlds, each named for its people (Lakedaimon walks Mercury's twilight line,
  Nephelokokkygia rides Venus's cloud layer, Mars has the Quirinal, two castra and the Aqua Borealis, Titan the Pnyx and
  the Kraken Mare wells). Kinds: capital, city, fort, shipyard (orbit), foundry, works (one resource), battery. Surface
  sites turn with their planet; Jupiter's and Saturn's stand on true-scale stand-in moons until stations-moons merges.
- **Resources**: metals, ice, hydrocarbons, power, helium-3, chemicals, food. Works fill a world's stockpile; what it
  does not make it imports from the supplier LORE.md gives it, unless the player has taken that supplier.
- **Production**: a world short of its force (1 / 2 / 4) builds fighters at its foundry (45 s) and cruisers, then the
  capital, at its shipyard (120 s, 480 s), each paid from its stockpile, faster for every world the player controls.
  New ships launch from their site through `combat.revive`. Flight time only.
- **Taking sites**: shots hit sites (`combat.hooks.solids`). Below half structure a site is suppressed; hold within 30
  units of it, with none of its world's ships within 1,000, for its hold time to capture it, or shoot it to nothing to
  wreck it. Batteries halve damage to the rest; cities cannot be wrecked; a city falls only once its forts have.
- **Control**: the capital and every fort taken. The rest surrenders, production stops, its ships stand down.
  Production also stops for good once every shipyard and foundry is taken or wrecked (wrecks are rebuilt only while one
  stands).
- **Pay**: the original force pays full `ECONOMY` rewards, rebuilt ships half; each site pays once; held sites pay
  credits a minute; control pays 500 XP. Capital-ship command (level 8, a controlled world's shipyard, helium-3) and the
  armada (level 10, three worlds) are rules in `unlocks.ts` for fleet command.
- **Save**: `GameData.conquest` (clock, ships alive by type, veterans, lines, stockpiles, every site), written with the
  pilot on every kill, capture and payment and every 5 s of flight. A reload cannot bring a ship back.
- **Screens**: a conquest strip near a world (production lines, sites nearest first with structure, capture and why
  not); the arrival card adds taken, production, navy, makes and imports.
- **Balance**: `src/lib/balance/conquest.ts`, run in `integration/conquest-balance.md`: every world taken in 12–28 min
  by a level-1 pilot, never out-produced; farming a world's rebuilds pays about a tenth of the XP a minute that taking
  it does.
## Race depth (Caleb, 2026-10-19) — DRAFT

"Alongside those races, they each need different types of spaceships, different cultures, bases, and government
types. They need to have artwork and descriptions for each race."

- `lib/races.ts` `PEOPLES`: all seven nations, Earth's humans first (a new game can start as any). Each has a
  government (seven different types: league, oracle-state, diarchy, autocracy, republic, kingdoms, democracy, each
  from a Greek or Roman model: who rules, how power passes, how it goes to war), a culture (customs, belief, arts,
  war and honour, daily life), bases (one capital, a named station for each station on the stations branch with the
  same `stn-<home>-<n>` id, and outposts), ship classes (exactly one capital 5×, cruiser 1× and fighter 0.2×, plus one
  race-only class) and the palette the art uses. `RACES` is unchanged.
- `shipClassOf(nation, type)` and `CLASS_IDS` are what progression swaps its placeholder class names for (LORE.md,
  "For the other threads").
- **Race codex** (`components/codex/`): main menu or pause menu → **Peoples of the System**. A page per people with
  its emblem, a portrait of a typical person, its government, culture, bases with a picture of its home capital, and
  its ships with a line-up plate and true-length strip. Tabs or ← → turn the page; Esc or ✕ closes it (Esc over the
  pause menu closes only the codex). `?codex=<nation>` opens it at load.
- All art is procedural SVG drawn in code (`components/codex/art/`), following ART-DIRECTION.md's shapes, materials and
  engine colours. Images: `shots/codex/`.
- LORE.md carries the same text as the data, plus Earth's section, ship materials under each Look, and open
  questions 11–14.
- Not decided: whether the race-only classes fly; all the open questions in LORE.md.

- `lib/nations.ts`: Earth (the player's), Moon, Mercury, Venus, Mars, Jupiter, Saturn. The Sun is held by no one.
- Names are placeholders ("Mars nation") until the lore is decided. Each has three patrol ships circling its home in
  its colour. They do not shoot back yet.
- Not decided, and not invented here: lore, ship types, how progress works (expansion, battle, conquest), mining,
  the economy.

## Moons (Caleb, 2026-10-18)

"Add every moon to each of the planets scaled properly."

- **Source.** `lib/moonData.ts`, generated from NASA/JPL Solar System Dynamics, read 2026-10-18: orbits from
  "Planetary Satellite Mean Elements" (https://ssd.jpl.nasa.gov/sats/elem/), radii from "Planetary Satellite Physical
  Parameters" (https://ssd.jpl.nasa.gov/sats/phys_par/), and, where that table has no row, the moon's own JPL Horizons
  physical data. Every row JPL lists: Earth 1, Mars 2, Jupiter 115, Saturn 291. Mercury and Venus have none.
- **Radii** are true to scale with the planet (moon km ÷ planet km × the planet's scene radius). JPL gives a radius for
  28 of them in the physical-parameters table and 15 more in Horizons; the other 366 (small irregulars) have none, and
  are drawn at a 2 km placeholder that is not from JPL.
- **Distances are squeezed**, as the planets' spacing is: distance = just outside the planet's orbit zone + planet
  radius × 2 × ln(real distance ÷ the innermost moon's). Order outward is kept; every moon is outside its planet, its
  rings and its orbit zone (so it never crosses a parked or orbiting ship), and inside the edge. Direction is each
  moon's place on its orbit at JPL's epoch, fixed, in the planet's tilted equator (Laplace-frame orbits) or the
  ecliptic. Earth's Moon keeps its existing ring.
- **Major moons** are the ones big enough to see from where a ship parks at the planet (angular diameter at least
  0.1°, about two pixels): Io, Europa, Ganymede, Callisto; Mimas, Enceladus, Tethys, Dione, Rhea, Titan, Iapetus.
  Those are full bodies and destinations (fly to, orbit, arrive, enter, map, computer, route). Phobos and Deimos fail
  the test (from a Mars parking orbit they are 0.031° and 0.015° across). The other 397 are one instanced mesh of
  rocks plus a cloud of points per planet, shown near that planet.

## Stations (Caleb, 2026-10-18)

"A space station or multiple space stations on each planet … These space stations will house ships, and in the case
of capital ships, we'll just have them docked because they'll be so big. This is where you'll be able to dock your
ship, repair it, upgrade it, interact with the economy, etc."

- `lib/stations.ts`: 13 stations, in the holding nation's colour: Earth 2, Moon 1, Mercury 1, Venus 1, Mars 2,
  Jupiter 3, Saturn 3 (a first pass). Each sits halfway between the outermost patrol ring (1.45 × patrol radius, the
  ship-types branch's cruiser ring) and the edge of its home's orbit zone, 22° above or below the plane, hangar facing
  away from home. Fixed places, like the moons. Sizes are in player-ship lengths (footprint 6.6), so a rescale carries.
- **Houses ships**: two cruisers and three fighters in the hangar; one fighter flies out, loops and docks again. One
  capital ship (5 ship lengths) is moored outside on a pylon, too big for the hangar. Stand-in models until the
  ship-types models are merged.
- **Docking**: fly within 2.2 footprints of a station (the autopilot parks inside that) and press **L** or the Dock
  button (also on the arrival card). The ship flies in through the mouth and the station screen opens. **Undock** (Esc
  or the button) puts the ship outside the mouth, nose out. Stations are solid, hold no orbit, and cannot be entered
  with E.
- **Station screen**: Repair (the player ship now has a hull, 100 points; nothing damages it yet except by hand;
  repairs are free), Hangar, and two labelled placeholders, **Upgrade** and **Market**, which say what is undecided.
- **Save**: docked state and hull save and load; a saved journey restores docked at the same station.
- Not decided, and not invented: upgrades, prices, goods, any currency or economy, who may dock where (every station
  takes the player for now), what damages the hull.
## Atmospheres and flying low (Caleb, 2026-10-18)

"I want there to be atmospheres on each planet, and I want your ship to be able to enter the atmosphere and fly near
to the surface of the planet."

- **Air on every planet.** `lib/atmosphere.ts` `ATMO`: Earth, Venus, Mars, Jupiter and Saturn as they are in kind
  (Venus thick and yellow, Mars thin with a butterscotch sky and a blue sunset, the giants deep and banded with no
  ground). **The Moon and Mercury have air as a game choice, not physics**: in reality they have only a near-vacuum
  exosphere; here they get a thin grey haze (1% of Earth's density) and a faint rim, because Caleb asked for each
  planet. The Sun has none.
- **Thicker than real, on purpose.** Real Earth air is 0.13% of the radius per scale height; next to ships a thousand to
  an Earth radius that is 16 ship lengths deep. Heights here are fractions of the body's radius R: Earth's air tops out
  at 6% of R (where its blue rim sits from space), scale height 0.75% of R; Venus and Mars 6%, the giants 3.5%, the Moon
  and Mercury 2%. Venus is 6× Earth's density, not the real ~65×, so it can still be flown. Mountains stand up to 1.2%
  of R on Earth (about 12 ship lengths) and 1.5% on Mars. Because everything is relative to R, it carried across the
  planet-scale merge unchanged. Speeds are in ship units (the hull is 0.371).
- **Going in.** Fly down at it. Approaching from space you are slowed to arrive at the top at no more than 220
  units/s (as before, only if your line actually meets it). Crossing the top: a banner ("Into Earth's air"); the space
  flight model hands over to the air model; heating after Sutton–Graves (∝ √density × speed³) lights a plasma sheath at
  the nose and a heat glow at the screen's edges; buffeting shakes the camera; the sky goes from black to the planet's
  colour as the air above you thickens, and the stars fade behind it by day (they come back at night).
- **Flying in air** (`components/planet/planetAir.ts`). Yaw and pitch are held against the local horizon, which is
  carried along as you fly round the planet, so "level" means level with the ground anywhere, and flight assist levels
  you there. Drag rises with density and the square of speed; top speed falls as 1/√density (Earth sea level 25
  units/s, about 67 ship lengths a second; Venus 10; Mars about 180). The ship banks into turns, its velocity follows the
  nose tighter in thick air (like wings), and below the stall speed it sinks slowly (the engines always carry 70% of the
  weight). The air turns with the planet, so you ride along with its spin. All of it blends back to the space model
  toward the top of the air (`airBlend`).
- **Near the ground.** A cube-sphere quadtree of 33×33-vertex patches (17×17 on Battery saver), built in Web Workers
  from one CPU height function per body that collision uses too, swapped in by distance, with skirts so no cracks show
  and horizon culling. Earth: seas (flat, with a sun glint), beaches, plains with forest and field patches, ridged
  mountain ranges with snow. Moon and Mercury: craters. Mars: craters, mesas, ridges, polar caps. Venus: plains and
  ridged highlands. Continents use the same noise as the planet seen from space, so they line up. Patches stream in
  within 30% of a radius; until the six face patches exist, the planet's own sphere stays on screen. Finest vertex
  spacing 0.12 units (0.3 on Battery saver).
- **Ground and warnings.** The hull stops 0.35 units above the ground or sea. Descending, the ship slows so the ground on
  its line is never under 1.2 s away (HUD "slowing near the ground", like "slowing near a surface" in space). PULL UP
  flashes when the ground is within about 2.5 s along your path. HUD: the body's air density, altitude above the
  ground, airspeed, entry heat.
- **Gas giants.** No ground: two drifting, banded cloud decks, a fog that thickens and darkens with depth, and a crush
  depth 1.2% of R below the cloud tops (49 units on Jupiter). The pressure starts pushing at 70% of it; once it beats the
  engines the hull is thrown back up for 1.5 s ("PRESSURE — CLIMB"), and you can never pass the crush depth.
- **Leaving.** Climb out: past 3% above the top the space model returns and speed follows the throttle again. Autopilot
  engaged inside the air first climbs out (nose up 30°, toward its aim). Enter (E) and the placeholder room are
  unchanged and still work from inside the air.
- **Phones.** Battery saver gives coarser patches and fewer levels. Measured in this thread only on a desktop; see the
  thread log.
- **Overlap with the graphics branch.** `claude/graphics-e638ff` adds ray-marched scattering shells that also draw from
  inside (back faces) and replaces the stars and Milky Way with a baked sky. This branch does not touch the space-view
  atmospheres; its inside-the-air sky is `components/planet/sky.ts` (a dome round the camera that covers the background,
  plus a blend-constant fade on the star objects). When the two meet, choose which draws the sky from inside. The Moon
  and Mercury rims here reuse `atmosphereMaterial`.
## Graphics (Caleb, 2026-10-18)

"A massive graphics overhaul that improves the look of the entire game and adds better lighting, particles, and
anything else that cleans up how the game looks and makes the environment look more beautiful."

Audit and before/after frames: `GRAPHICS-AUDIT.md`, `shots/`. New code lives in `src/components/fx/`; the older files
only gained small hooks.

- **Sky** (`fx/sky.ts`): nebulae in four hues (rose, teal, violet, amber) with dark lanes and bright knots, the Milky
  Way with its bulge and dust, and a haze of faint stars, painted once at start into a cube map. It is the background
  and, brightened and clamped, the reflection map for the ship's metal and glass. The old Milky Way mesh and the
  point-dust were removed; the 9,000 star points stay.
- **Lighting**: surfaces get a warm band at the terminator on bodies with air, a cool fill on the night side so it is
  never pure black, and a rim where the limb faces the Sun; Earth's city lights are brighter. Ships: a sky-coloured
  hemisphere fill (cool above, violet below), a soft rim from behind, an engine glow light at the tail, and the sky as
  their environment.
- **Atmospheres** (`fx/atmosphere.ts`): a shell per body with air, ray-marched: blue limb and haze on Earth, thick
  gold haze on Venus, thin salmon on Mars, banded warm glow on Jupiter and Saturn, a red band at the terminator and a
  bright ring when backlit. Sizes come from the body radius and the mesh scale.
- **Sun**: surface brought into range (granulation, cells, orange limb), an animated corona with streamers and
  prominences (`fx/sun.ts`), god rays and a lens flare in post that fade when a body hides the Sun.
- **Post** (`fx/post.ts`, after bloom, before tone mapping): god rays, lens flare (starburst, streak, ghosts, halo),
  chromatic aberration only while boosting, grading (saturation, cool shadows, warm highlights), vignette. Bloom
  retuned for HDR (strength 0.85, radius 0.6, threshold 0.95).
- **Scenery**: the planets' ring tori (which became solid walls when flown close to) are now thin lines; the crystal
  shells show only their far rim and fade out near the camera.
- **Particles and effects** (`fx/particles.ts`, `fx/effects.ts`), callable from anywhere:
  `spawnImpact(pos, {color, scale, normal})`, `spawnExplosion(pos, {color, scale})`,
  `spawnTrail(from, to, {style: 'smoke'|'ion'|'fire', scale})`, `spawnShieldHit(centre, radius, at, {color})`,
  `spawnMuzzle(pos, dir, {color, scale})`. `scale` is the size of the thing involved. Explosions: flash and a light,
  fireball, smoke, sparks, tumbling debris with burning trails, two shockwave rings, embers that linger.
- **Weapons look**: laser bolts are glowing rods with a white core (`fx/bolt.ts`), with a muzzle flash and impact
  sparks; missiles leave smoke; kills explode in the nation's colour.
- **Engines and speed**: exhaust plumes with shock diamonds; ion ribbon trails from each nozzle (fading when seen
  end-on or close to the camera); speed streaks along the motion, longer and bluer at boost (`fx/streaks.ts`).
- **Interface** (`styles-glass.css`, loaded after `styles.css`): glass panels, sans type, cyan readouts and amber
  actions; class names unchanged. Readable at 375 px.
- **Graphics setting**: Battery saver turns off bloom, god rays, flare and chromatic aberration, halves the
  atmosphere samples, spawns about a third of the particles and no debris trails, and keeps pixel ratio 1.
- **For the other branches**: every custom shader includes three.js's logdepthbuf chunks; effects are sized from the
  body or ship they belong to. The flight view's hooks are `FX.createGraphics(...)`, `gfx.update(...)` and
  `gfx.dispose()` in `Voyage.tsx`; the dev hook adds `composer`, `gfx` and `fx`.

## Race depth (Caleb, 2026-10-19) — DRAFT

"Alongside those races, they each need different types of spaceships, different cultures, bases, and government
types. They need to have artwork and descriptions for each race."

- `lib/races.ts` `PEOPLES`: all seven nations, Earth's humans first (a new game can start as any). Each has a
  government (seven different types: league, oracle-state, diarchy, autocracy, republic, kingdoms, democracy, each
  from a Greek or Roman model: who rules, how power passes, how it goes to war), a culture (customs, belief, arts,
  war and honour, daily life), bases (one capital, a named station for each station on the stations branch with the
  same `stn-<home>-<n>` id, and outposts), ship classes (exactly one capital 5×, cruiser 1× and fighter 0.2×, plus one
  race-only class) and the palette the art uses. `RACES` is unchanged.
- `shipClassOf(nation, type)` and `CLASS_IDS` are what progression swaps its placeholder class names for (LORE.md,
  "For the other threads").
- **Race codex** (`components/codex/`): main menu or pause menu → **Peoples of the System**. A page per people with
  its emblem, a portrait of a typical person, its government, culture, bases with a picture of its home capital, and
  its ships with a line-up plate and true-length strip. Tabs or ← → turn the page; Esc or ✕ closes it (Esc over the
  pause menu closes only the codex). `?codex=<nation>` opens it at load.
- All art is procedural SVG drawn in code (`components/codex/art/`), following ART-DIRECTION.md's shapes, materials and
  engine colours. Images: `shots/codex/`.
- LORE.md carries the same text as the data, plus Earth's section, ship materials under each Look, and open
  questions 11–14.
- Not decided: whether the race-only classes fly; all the open questions in LORE.md.

## The opening (Caleb, 2026-10-19)

"Pick your starting faction … Then you customize your avatar character, which is the race of that planet. Then you get
your first ship, which you can customize in a few ways with level 1 tools. And then it takes you on a small tutorial
through what you need to do before launching you at a goal."

- **New game → three screens** (`components/opening/`), every one with Back (and Esc):
  1. **People**: all seven nations. Each shows its pitch, home world, government, its own cruiser turning on a pad
     (the player's first ship, `space/styles/` from the art direction), how it fights, its level-1 fit and its old enemy.
  2. **Pilot**: a portrait of a person of that people (races-depth's procedural SVG portraits, now taking a look):
     name with Suggest (names in each people's own manner), skin, hair or fur, eyes, dress (three per people, from
     LORE.md: League navy, Archivist, the Greens, the Senate, the House of Callisto …) and the people's headwear.
  3. **Ship**: the cruiser in a hangar view you can drag to turn. Its name (free text or suggestions), trim (nation
     colour, cloth or engine colour), hull finish (standard, polished, dark) and its four slots from **tier-1 tools
     only**; the first weapon slot is always a gun. Stats update as you fit.
- **The player flies their nation's cruiser** in the chosen paint (`space/pilotShip.ts`), with plumes in its engine
  colour. A save from before the opening keeps the brass courier.
- **The shakedown flight** (`opening/Shakedown.tsx`, `lib/opening/tutorial.ts`): in the real game, done by doing. Open
  the throttle, steer, boost, laser with the lead (drill buoys keep station off the bow; the ship holds station for the
  drill), G to the missile, lock and fire, M/N/R, autopilot to the home berth, dock, repair (the drill leaves the hull
  at 72), undock. A fit with no missile skips the two missile lessons. Each step ends when the flight shows it was done.
  Back a step, Skip tutorial, and after 45 s on one step, Skip this step. The step is saved, and flight autosaves every
  20 s and when the page is hidden.
- **The launch**: a card with the pilot's portrait and the first goal from `firstGoal(nation)`, the seam the motivation
  plan fills (stand-in: break your people's old enemy's patrol, three ships at their world). Set course flies there; a
  goal line in flight counts the kills.
- **Continue** goes straight to flight: no screens, and no tutorial once it is done or skipped.
- Not decided: the real first goal (motivation), names and choices (LORE.md is a draft), whether the avatar appears
  anywhere but the HUD and the launch card.

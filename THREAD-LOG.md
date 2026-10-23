# Thread log

## 2026-10-20 — wave-a-feuds: GP-01, GP-02, GP-15a (branch claude/wave-a-feuds, from claude/integration-3 @ 91bf274)

The brief: GAMEPLAY.md Wave A packages GP-01 (standings and feuds), GP-02 (the director wired, first raid inside 60 s),
GP-15a (death costs something), and GP-20 (the belt front) if time allowed. Design docs committed first (`688b217`).
Stayed off GP-03's files (levels, economy, catalog, Shipyard) and GP-04's (hotbar, tutorial.ts, Shakedown.tsx).

### Done
- **GP-01** `src/lib/diplomacy/standings.ts` (+ test): a directed 7×7 table, row = how that house regards each column,
  built from LORE.md's "Who stands where" words and FEUDS.md 3. Bands from CONTRACT.md (Hostile ≤ -40, Wary to 19,
  Friendly 20–59, Allied ≥ 60). Blood feuds (Mars–Jupiter, Mars–Earth, Moon–Venus) are locked at -100; claim feuds
  start at -50 and decay back after a truce. `enemyAI.ts` reads the standing toward the player's house each frame:
  Blood/Hostile engage, Wary shadow (close to `AI.shadowRange`, guns cold), Friendly/Allied hold. A hit or lock calls
  `hooks.onProvoke`: Wary drops to Hostile at once, a friend cools by 40 (one offence per 5 s burst).
- **GP-02** `director.ts`: `coalition`→`reckoning` (3 held), `crisis`→`lastAlliance` (5 held) with `marchWarning`
  (12 min); counts `held` and `broken`, not turned. New feud-raid clock: first raid at `DIRECTOR.firstRaid` = 0.6 min
  of flight from the first undock (the clock is held during the shakedown and while docked), then every 6 min after
  the last ended, growing (a cruiser from raid 2). Sentinels are finite so the state saves as JSON
  (`GameData.director`, `GameData.standings`). The sim's routes are unchanged (no raider passed). `goal.ts`: the first
  goal is now "Beat off the <people> raid", 2 fighters, no course; the card names the feud and its year.
  `combat.raid()` spawns raiders the AI adopts as their own always-engaged fleet; raid kills pay in full without
  touching the world's navy. GameView wires it and shows a raid card (captain's portrait, one line, feud).
- **GP-15a**: losing the ship loses the fighters out (`wingmen.lose`), the drones out (Voyage, swarm members flying),
  the squads in docked player carriers, and `DEATH.creditsPct` (10%, **Caleb's call**) of credits; it respawns at the
  nearest station of a world held (capital or controlled), not "near Earth".
- **Found and fixed on the way:** AI fighters capped their chase at the player's gauge speed, which is 0 for a ship
  parked in orbit that is really moving ~115 u/s, so no fighter could ever close on it. They now chase the measured
  velocity. And two kills in one frame both read the old goal (goal stuck at 1/2).

### Proved live (in-app browser, port 5406, pane hidden: frames driven with `__voyage.run`)
- Venus start, tutorial skipped: first raid dealt **35.5 s** after launch, two Selenite fighters 82 units out, raid
  card "The feud: since the Nika Burning, 4791". They closed to ~50 and took shield 100→46 in another run.
- Both raiders killed through `combat.damage` (the kill/pay/goal path, **not aimed fire**): "Goal complete 2/2",
  +30 XP, "Raid beaten", raiders removed, next raid scheduled.
- Venus start: Earth fleet `hold`, 0/8 engaged, no damage; Mercury fleet `shadow`, 8/8 following, no damage; after a
  provoke (what a hit calls) Mercury -20 → -40, `engage`, 90 damage in 8 s.
- Death near Mercury: credits 108 → 98, 6 drones out lost, HUD "SHIP LOST · respawning at your nearest held
  station", back refitted at stn-venus-2.
- Director state survived a reload (1 raid dealt, t carried).

### Only in tests, or not proved
- **"Pane visible" was not met:** this session wasn't open in a window, so the pane couldn't be shown.
- Fighters out and squads aboard lost on death: unit test of `deathCost` only (a level-1 pilot has neither).
- The first raid was never won with aimed fire; only that they fight and that kills resolve it.
- Level 2 after the first raid: the card no longer promises it. Two fighters pay 30 XP and level 2 is at 100; that is
  GP-03's curve.
- Threats other than the feud raid and the two announcements are dealt and logged (`__director.log`), not played:
  Wave B.
- `dominance`, `rank`, `sinceRung`, `broken` are passed as constants (1, 0, 0, 0) until something computes them.
- **GP-20 (the belt front) not started.**

### Checks
tsc clean; vitest 44 files, 600 tests pass; `npm run build` passes. eslint on touched files: 2 errors + 1 warning,
all present at 91bf274 (`useTarget` in Voyage, an unused disable in GameView).

## 2026-10-19 — mc-controls (branch claude/mc-controls, from claude/integration-2-586c1e @ bc3eb85)

Caleb's ask: the cursor's position set the turn rate, so aiming fought the flight; he asked for controls built for a
high-level Minecraft PvP player and approved the plan in full ("All of this sounds good"), throttle sticky, right click
on a gun a forward shield.

### Done, by ruling (one commit per step, in the brief's order)
- **R1 mouse look + R2 Alt freelook** — `59872b5`. **Playable on its own; it fixes the bug: a still mouse is a still
  ship.** Click captures the mouse (pointer lock, raw movement where offered); the mouse moves an aim direction (the
  crosshair) and the ship turns toward it at its own rates (capital ×0.35), camera along the aim. Lock refused: plain
  mousemove drives the aim the same way. Esc (or losing focus) releases the mouse and opens the menu. Keys, gamepad
  and touch keep the old rate steering (the aim rides on the nose). `steer: 'cursor' | 'drag'` removed; old saves migrate
  (`migrateFlight`, tested). `controls/aim.ts`, `controls/pointer.ts`.
- **R3 movement** — `50dffc7`. W/S sticky throttle (ramps as before), A/D strafe, Space/Shift up/down in the ship's frame,
  flight assist damps them; double-tap A/D dodge; double-tap W (held) or Ctrl boost; X full stop. **Off in an
  atmosphere** (planetAir is an aircraft model; strafe/up/down and the dodge do nothing there, the dodge says so). The
  binding table arrived here: every key reads `controls/bindings.ts`. `controls/thrust.ts`.
- **R4 hotbar** — `82b83fe`. Nine slots, bottom centre; 1–4 fitted weapons (empty shown empty), 5 swarm (5 again cycles
  explosive/shield/attack), 6 fighters, 7 infantry, **8 repair: locked** (no repair or shield charge exists in arsenal or
  progression; no numbers invented), 9 countermeasure. Wheel cycles, F swaps to the last weapon, G no longer cycles,
  swarm keys off 7/8/9/0. `controls/hotbarSlots.ts`, `Hotbar.tsx`.
- **R5 + R6 clicks** — `a4f925a`. Left click fires toward the crosshair within a 40° gun arc (outside: along the nose, the
  crosshair reads "out of arc"); lead diamond and will-hit kept. Left click on a missile dumb-fires if it may fly
  unguided, else "Needs a lock". Right click: gun → forward shield block; missile → bow draw (lock builds only while
  drawn, `stepDrawnLock`; release launches guided, early release flies unguided for `optional` munitions or is called
  off for `required`); 5–9 deploy/recall; crosshair on a station or body in range → dock or enter (prompt shows the key).
  On a utility slot the left button keeps firing the weapon in hand. Mouse buttons use mousedown/mouseup so left and
  right can be held together.
- **R7 + R8 + R9 targeting** — `b868325`. Middle click picks the ship under the crosshair, else the body or station (bodies
  also become the autopilot's destination). R taps approach → orbit → keep at range → off; hold R + scroll sets the
  distance; under a stance the mouse swings the guns within the arc; thrust, W/S, X or a stick turn take the ship back;
  HUD line under the crosshair. G with a ship picked is the approach stance. Hold Tab: overview (cursor freed), hostiles
  first, Ships / Everything, LOCKED/locking column from enemy-ai's per-ship lock, click a row to pick. Z and command-mode
  orders use the pick when nothing is locked. `controls/stance.ts`, `Overview.tsx`.
- **R10 the rest** — `ae78e87` (most keys already live from `50dffc7`). F1 hides the HUD, F5 chase / cockpit / rear view,
  F11 the app's full screen; Q, E (shipyard), G, T, Z, B, M, Enter. Collisions resolved below.
- **R11 keybinds** — `656d643`. Settings → Controls → Key bindings: grouped list, click and press a key or mouse button,
  Esc cancels, a key in use leaves the other action unbound, reset to defaults; saved with the flight settings.
- **R12 + R13** — `9e879bd`. Hitmarker X and a quiet tick on a landed shot; red edge (0.35 s) and a camera kick (not on
  low graphics) when hit. One short hint line built from the table; the pause menu has a Controls list.

### Keys that moved (collisions resolved)
Autopilot Space → **G** (Space is thrust up). Weapon cycle G → hotbar 1–4 / F / wheel. Countermeasure C → **Q** (and slot 9).
Fleet command mode C → **T**; the fleet nav tab T → inside command mode's tactical button, or M then its tab. Boarding T →
**B**. Fighters B/V → slot 6 right click (launch, again recalls). Infantry L/K → slot 7 right click. Dock L → right click
on the station (or Enter). Enter a body E → right click on it (or Enter). Swarms 7/8/9/0 → slot 5. Full screen F → **F11**.
Nav tabs N and R → only M (the screen's own tabs). Boost Shift → Ctrl / double-tap W (Shift is thrust down). Throttle on
the wheel → W/S only. Fleet command mode's own letters (a d f h r l v b p and wing digits) are unchanged and still take
the keys while the mode is open; they are not in the binding table.

### Numbers chosen
Mouse: 180° per 1920 px at 100% (slider 10–200%); aim gain 8 /s with 0.2 s lead (just past critical, no overshoot,
~0.8 s to settle a small turn); autopilot takeover after 40 px of mouse travel. Gun arc 40°. Strafe 6 u/s, 14 u/s²,
assist damping 4 /s. Dodge 18 u/s impulse decaying at 4 /s (≈3.4 u, nine ship lengths), 15 energy, 2.5 s cooldown;
double-tap window 0.25 s. Shield block: front arc 60°, −40% damage, −80 energy/s (Mk I lasts 1.25 s), shots fired with it
up wait 1/0.7 as long. Draw time = the munition's lock time × targeting computer (seeker 1.5 s, swarm 0.8 s, torpedo 3 s).
Stance default distance: half the selected weapon's reach from a ship, half the radius from a body's surface; ×1.15 per
notch. Hitmarker 0.12 s, tick 1.9→1.2 kHz 50 ms, kick 0.05 ship lengths decaying 14 /s.
Block proof (`lib/balance/guard.ts`, `guard.test.ts` GUARD_PROOF, Earth start cruiser mirror, 400 fights): no block 47%;
practised tapping 54–56%; frame-perfect 62–63%; holding through shots 43–49%. Swept rate ×0.5/0.7, cut 0.4/0.5,
drain 40/60/80 first.

### Proved, and how
Synthetic input in the in-app browser (pane hidden, frames driven by `__voyage.run`; pointer lock refused under
automation, so the fallback mousemove path and `look.feed` were used): still mouse → yaw rate 0; 320 px → 30° aim, nose
settles ~1 s, no overshoot; Alt + 600 px → camera 56° off, ship unmoved, eases back in 0.6 s; autopilot ignores 30 px,
yields at 80 px; camera centre = aim (0°). Strafe 6.2 u aside, up 6.2 u, dodge 3.2 u, cooldown refuses a second dodge;
double-tap W reaches throttle 0.9 in 2 s with boost FOV. Hotbar keys, F, wheel, empty slot fires nothing. Seeker: no lock
in 2.5 s undrawn, locked after ~1.4 s drawn, release → homing missile and lock cleared, quick release → unguided. Block:
rail hit 25.2 → 15.1 from the front, 25.2 from behind; pulse shots 12 → 9 per 2 s; drained in 1.25 s. Out of arc: bolt
along the nose at 60° off, along the aim at 23°. Swarm launch/recall, right-click dock into Earth's station. Pick, approach
(325 → 208 u and holds), scroll to 137, guns clamp at 40°, orbit holds ~144 u, keep at range backs out 40 → 137, W ends
it; overview rows, filter, click to pick. F1, F5 three modes, M, E, F11 (synthetic and one key press through the pane:
toggles the app's full screen), keybinds (C to stop, Mouse 4 to boost, Esc cancels, reset). Hitmarker, red edge fade,
Controls panel. Screenshots taken of each step (in the session, not committed).
**By hand: nothing yet.** Not at all: real pointer lock and raw mouse feel, desktop Chrome's own F11, the sound,
gamepad and touch after the change (code paths kept, not re-run), a phone, frame rate.

### Checks
`npx tsc -b` clean; `npx vitest run --dir src` 38 files, 534 tests pass (the drone-swarm 8 ms timing test failed once
under load and passed on rerun); `npm run build` built.

### For the integrator
- `Voyage.tsx` grew by ~730 lines net of the move (the logic is in `src/components/controls/`, but its wiring sits in the
  frame and the handlers); game-start's branch rewrites ~500 lines of the same file: expect conflicts there.
- Also touched: `arsenal.ts` (block, hit counters), `combat.ts` (gun line, draw flag, `clearLock`), `planetAir.ts`
  (camera follows a look direction, `up`, rates), `weapons.ts` (`stepDrawnLock`), `store.ts` (flight settings), GameView
  (`onLoadout`, `utility`, Controls panel), `CommandBar.tsx` (key hint), `wingmen.ts` (`utility` hook type).
- game-start's text that the new keys make wrong (`src/lib/opening/tutorial.ts` lines 45–53, `GoalUi.tsx` 28): listed in
  the report.

### Follow-ups
Enemy AI under the same block, dodge and draw rules (not a small change; left out). Swarm launch should aim at the pick.
Extract the remaining wiring from `Voyage.tsx`. The repair slot needs an item and its numbers (Palamedes). Playtest by hand.

## 2026-10-19 — drill-boarder (thread drill-boarder: capital ships board and capture ships)

### Done
- **DRILL-BOARDER.md**: the design. Launch from a capital ship (T on a held lock), flight, interception (point defence
  from hull guns, flak and point-defence drones by arsenal's ids, split between boarders; the player's lasers), the
  shield rule (**shields must be down**: above 25% a boarder is deflected), the 2.5 s drill and 4% breach, the fight
  inside, capture or repel, enemy boarders, a boarder per nation with Greek and Roman names (Breacher, Gnomon, Dory,
  Siphon, Harpax, Embolon, Epibates), saving, and a proposal for what a captured cruiser or capital ship means for
  progression and fleet command.
- `src/lib/shipTypes.ts`: one new table, `LAUNCHED_SPECS.boarder` (size 0.3 L, 60 hp). A separate table, not a fourth
  `ShipType`, so no other file's `Record<ShipType, …>` needs a row (reasons in DRILL-BOARDER.md).
- `src/lib/boarding/` (pure, 20 tests): `spec.ts` numbers and per-nation tilts; `boarder.ts` launch, flight, point
  defence, impact, drill, crew; `troops.ts` the fight inside behind `HullFightModel` (**a local stand-in** for
  infantry-carrier's model; swap `HULL_FIGHT`); `enemy.ts` who launches (line of sight passed in, for enemy-ai's
  `tactics.clearShot`); `prize.ts` saved prizes, migration, escort stations.
- Scene: `components/boarding.ts` (launch, flight, sparks, fight flashes, capture, side change, beacon recolour,
  escorting, enemy launches, lasers hitting enemy boarders), `components/space/boarder.ts` (seven models in the
  nations' silhouettes and colours). `combat.ts`: fleet-command's `driven`/`fwd` fields and its one `update` line,
  same names. `GameView.tsx`: boarding attached beside the wingmen; T key; a capture pays `applyKill`; killing your
  own ship no longer pays. `store.ts`/`App.tsx`: `GameData.prizes`, saved at once. Voyage hint line: "T: board the
  locked ship". SPEC.md section.
- **Proved in the in-app browser** (port 5347, `window.__voyage` and `__pilot.boarding`), Earth pilot at Mars:
  1. *Repelled*: one Breacher (20 marines) at a fresh Quirite Corvus (36 crew, Mars has no shield): launched 120 L
     from the flagship, PD took it 60 → 39 hp, drilled, fought 8 s, repelled with 18.6 crew left.
  2. *Captured*: Corvus damaged to 84/140 (hull 0.6, crew 26.6); Breacher hit, drilled, 20 v 26.6 → captured with
     12.3 marines left; `hostile` false, driven, escorting; prize saved; XP 0 → 40, credits 100 → 125. Repeated after
     the contact fix on Corvus idx 1: captured with 12.3 left, XP 40 → 80; it then held 11.1 L from the player at
     222 L/s while the player orbited 367 L in 2.5 s.
  3. *Shot down*: one Breacher at the Quirite Rostrata (rail, rail, flak: 54 PD dps): 60 → 42 → 13 → shot down 32 L
     short, 6.8 s after launch.
  4. *Enemy boarders*: the Rostrata launched three Harpaxes at the prize: one ran out of fuel (the orbit carried the
     prize away), one was shot down by the flagship's and prize's PD, and one (flagship moved away) drilled in, 25
     legionaries beat 12.3 marines, and the Corvus went back to Mars, adrift; the saved prize list emptied.
  5. *Save and reload*: pause → Save journey; IndexedDB held the prize; reload → Continue: the Corvus came back
     friendly, 78.4/140 hp, 12.3 crew, escorting 11.7 L from the player.
  Screenshots in the notes folder, `drill-boarder-proofs/`.
- `npx tsc -b` clean; `npx vitest run --dir src` 111 tests in 9 files pass; `npm run build` built.

### Broken / not verified
- Found and fixed in the proofs: boarders clamped onto the hit sphere, a hull length off the visible hull (screenshot
  4 shows the old bug); now on the plating (`Hull.skin`, 0.22 × length). An escort also trailed 170 L at orbit speed;
  it now carries the player's measured velocity.
- The base's parking orbit moves the player (and so the escorts) at ~250 L/s round Mars, faster than any boarder:
  the enemy cannot board a prize while the player idles in orbit. Proofs held the player still with a throttle of
  0.0001. Not changed (Voyage's orbit is not this thread's).
- The contact point is fixed in world space, not in the target's frame: a turning ship carries its boarder slightly
  off the hull. Proofs were driven by `__voyage.run` with the pane hidden; the close-ups were rendered by hand and
  shown as an overlay. Not tested on a phone. No T button for touch.
- Infantry and hangar notes (`infantry-interface.md`, `destroyer-hangars.md`) did not exist yet: the fight and the bay
  are stand-ins.
- A prize retaken by the enemy and then reloaded comes back at its patrol with full hit points.

### Next
1. Caleb answers the question in the hand-over (whether the player's own cruiser can be boarded).
2. When infantry-carrier commits `src/lib/infantry/`, plug it into `HullFightModel` and delete `troops.ts`'s stand-in.
3. When fleet-command merges, delete the stand-in escort (`flagship` in boarding.ts) and give prizes a fleet wing.
4. Read `destroyer-hangars.md` into `BAY`. A touch button for T.
## 2026-10-19 — conquest (branch claude/conquest-0b139e, from integration 8caa0a9)

### Done
- **CONQUEST.md**: the design. Seven worlds' sites after LORE.md's peoples (76), seven resources grounded in the real
  bodies, a trade table, navy production from working sites and stockpiles, capture, wreck, repair and rebuild,
  control, rewards and the other nations' reaction, the answer to integration decision 1 (production is the only
  respawn; the state saves with the XP; veterans pay full and levies half), balance bands written before the run, the
  run, ten open questions. SPEC.md has a Conquest section.
- `src/lib/conquest/` (pure): `resources.ts`, `sites.ts`, `anchors.ts`, `state.ts`, `persist.ts`, `rewards.ts`,
  `unlocks.ts`, `conquest.test.ts` (25 tests). `GameData.conquest` in `store.ts`.
- `src/lib/balance/conquest.ts` + test: a level-1 pilot against every world with the real rules and engage.ts kill
  times. The first run flagged the Moon and Venus as untakeable (a contested hold drained faster than their 136-hp
  fighters let it fill). Fixed: a contested hold pauses, fighters take 45 s, imports run at 0.05/s, a capital ship
  needs 24 metals. One band widened with a reason (full rebuild 6–15 → 6–16 min: Venus and Saturn are metal-poor).
  No flags now: `integration/conquest-balance.md`.
- Scene: `components/conquest.ts` (sites drawn and hung in their frames, hits, capture, production, relaunch through
  combat, stand-down on control), `ConquestHud.tsx` (strip and card rows), styles. Small hooks in shared files:
  `combat.ts` (`hooks.solids`, `retire`, `revive`, `time`), `voyageScene.ts` (`bodyFrame`), `wingmen.ts` FlightHooks
  (`scene`, `world`, `geo` in attach; `card`), `Voyage.tsx` (passes them), `ArrivalCard.tsx` (`extra`),
  `GameView.tsx` (state, kills, rewards, saves, `__conquest`), `App.tsx` (`onConquest`).
- `npx tsc -b` clean; `npx vitest run` 116 tests in 10 files; `npm run build` builds.
- Smoke in the in-app browser on **port 5316** (5306 was held by the art-direction session's dev server, left alone).
  Numbers from `__voyage`, `__conquest`, `__pilot`:
  - New game as Earth: 49 crafts, 42 hostile; `fly('mars')` parked in 10 s.
  - Mars's 7 ships destroyed: the veterans paid exactly 340 XP and 210 credits; both lines started. The first fighter
    relaunched at clock 56.5 (45 s later) from the Fabrica (its offset easing from 387 units to 19 onto its ring). A
    levy fighter paid 8 XP.
  - Laser on the Limes Batteries, with the aim corrected for the orbit's drift of 3.5 units a frame: 18 of 18 bolts
    hit, for 216. Two earlier stray hits on the Fabrica did 12 instead of 24 (the battery's half-damage shield).
    Battery wrecked: +60 XP and +10 credits, once.
  - Navalia shot to 1,200 of 2,400 and held while Mars ships lived: the hold stayed 0 and the HUD said "contested:
    their ships are near". Levies killed (36 XP: cruiser 20, two fighters 8 each); the hold filled; captured: +250 XP,
    structure back to 2,400.
  - Fabrica wrecked by lasers. `__conquest.jump(1800)`: 0 launches in 30 min, Fabrica and battery still wrecked, and
    the held shipyard paid 360 credits (12 a minute).
  - Pause → Save journey → page reload → Continue: Mars has 0 ships alive (35 hostile crafts = 42 − 7), 0 veterans,
    the Navalia yours, the Fabrica wrecked, the Limes taken, XP 852 unchanged, clock 2,014.7 → 2,015.2 and running.
  - Arrival card at Mars: "Taken 1 of 11 sites yours, 2 wrecked · Production Stopped for good · Navy 0 capital, 0
    cruisers, 0 fighters · Makes Ice, Metals, Food, Chemicals · Imports Hydrocarbons, Power, Helium-3". HUD strip:
    "Quirites · 3/11 sites · Production stopped for good", sites nearest first with reasons. Screenshots: the card, and
    the Quirinal (dome and columns in Mars red, labelled) with the strip beside it.

### Broken / not verified
- **Control in the browser**: taking a capital and every fort, and ships standing down, is proved by unit tests only.
- **Moon sites** (Jupiter, Saturn) and Lakedaimon's walk along the twilight line were not looked at in the browser.
- Owners never counter-attack captured sites, and enemies still do not shoot, so the balance is for a world that only
  rebuilds. Nothing chases the player: "contested" means a ship of theirs within 1,000 units.
- Capturing needs the ship within 30 units of a site, and a parked ship orbits away from it (3.5 units a frame at
  Mars). In play the player has to hold position with the throttle; whether that feels right is Caleb's to judge.
- The perks marked "designed, not wired" in CONQUEST.md section 6 (shipyard and metals discounts, ice resupply, power
  regen) and the capital-ship and armada steps have rules, but nothing in the engine reads them yet.
- Sites are not navigation destinations: the strip gives each one's distance, but nothing points the way.
- The Mars surface behind the Quirinal screenshot was dark: the camera was over the night side (Mars's LOD checked
  visible at level 0, carrying its 9 surface sites).

### Next
1. Caleb answers CONQUEST.md's open questions, first: can a world be lost back, and should conquered worlds take the
   player's colour?
2. On merge with stations-moons: `anchors.ts` `moonPlace` reads `allMoons()`, and the stand-in spheres go.
3. On merge with fleet-command and enemy AI: launches go through `combat.spawn` if it replaces `revive`; relief fleets
   and counter-attacks; `unlocks.ts` gates the capital-ship and armada steps.
4. Sites as map and route destinations, and an on-screen marker for the nearest one.
## 2026-10-19 — planets (cities, buildings and the four health meters, DRAFT)

### Done
- **PLANETS.md** (DRAFT): the shared model (four meters: government, military, religion, economy; targets and shocks;
  five city types; eleven building types; the lifeline; war, conquest and occupation; the seam with conquest), one
  self-contained section per world (culture, architecture, city types, signature buildings, temperament, starting
  meters) with Greek and Roman sources cited by book and section from memory (not reopened this session), and the
  headless run's numbers. Religion follows Caleb's station ruling: each people worships its planet's god.
- `src/lib/planets/` (pure): `meters.ts`, `buildings.ts`, `worlds.ts`, `state.ts`, `sim.ts`, `planets.test.ts`
  (21 tests). Uses conquest's 79 site ids exactly and adds no site.
- Headless run, 3 cases × 7 worlds; every band in PLANETS.md 3.1 passes. Venus falls to a siege alone (power is its
  lifeline); the Moon never settles under occupation.
- `npx tsc -b` clean; `npx vitest run --dir src` 111 tests in 9 files pass; `npm run build` built; eslint clean on
  `src/lib/planets`.

### Broken / not verified
- **Not wired into conquest**: conquest is uncommitted. The seam (`stepPlanet`, `applyEvent`, `conquestStatus`) and
  the requests are in the notes folder (`planets-to-conquest.md`). The run does not feed effects back into
  production, so sieges in it are slightly pessimistic for the attacker.
- Races-in-depth had published no government types yet; LORE.md's are used. Stations had not replied on the shared
  meters (`planets-stations.md`).
- Nothing on screen: no HUD bars, no arrival-card meters.

### Next
1. Caleb answers PLANETS.md section 5 (first: should a devout conquered world ever settle?).
2. When conquest commits: wire the seam, save `PlanetState` in `GameData.conquest`, rerun conquest's balance bands.
3. When races-in-depth lands: rename governments to its types, keep the mechanics.

## 2026-10-19 — races-depth (governments, cultures, bases, ship classes and art for every people, DRAFT)

Branch `claude/races-depth`, from `claude/races-fe3f3b` (95c3dbf). Caleb: "Alongside those races, they each need
different types of spaceships, different cultures, bases, and government types. They need to have artwork and
descriptions for each race."

### Done
- `lib/races.ts`: `PEOPLES` (seven, Earth included) with government, culture, bases, ship classes, palette;
  `peopleOf`, `shipClassOf`, `CLASS_IDS`, `STATION_COUNT_REF`. `RACES` untouched. Seven placeholder class names
  became Greek (Thesauros, Lampas, Belone, Embolon, Smaragdos, Paralos, Glaux); the rest kept, as ART-DIRECTION.md
  asked. One race-only class each: Ark, Theoros, Skytale, Siphon, Testudo, Helepolis, Holkas.
- `lib/races.test.ts`: 7 new tests (10 in the file): one people per nation; exactly one class per ship type at its
  length, at most one extra; class ids and names unique; seven different government types and every field filled;
  one capital, stations matching the stations branch's ids, an outpost; accent = nation colour; no astrology words.
- `components/codex/`: `RaceCodex.tsx` and four SVG art components (Portrait, Emblem, HomeBase, ShipLineup) plus
  `kit.tsx`. GameView: a "Peoples of the System" button in the main and pause menus; `?codex=<nation>`.
- LORE.md: Earth's section; for each race the government, culture, bases and class table (same words as the data,
  generated from it), a ship-materials line under each Look (asked by art direction), "For the other threads"
  (progression swap table, station names, what changes in ART-DIRECTION.md), open questions 11–14.
- Proved in the in-app browser (dev server on port **5317**; 5307 was held by the art-direction session's image
  receiver): main menu → codex → Esc closes it; New flight → Esc → pause menu → codex → mars tab → → (jupiter) → a
  real Esc keypress closes the codex and leaves the game paused. Screenshots of all seven pages, read after a 1 s wait
  and checked against the tab clicked. At 375 px: page scroll width 375; the tab row scrolls inside itself.
  All 28 pictures rendered to images from the live page's SVG (canvas, 2×) into `shots/codex/`, plus four contact sheets.
- `npx tsc -b` clean; `npx vitest run` 53 tests in 5 files pass; `npm run build` built (the usual >500 kB warning).

### Broken / not verified
- The pane was hidden, so the codex's fade-in animation never ran in it (opacity stuck at 0). Screenshots were taken
  with that animation switched off by a style injected in the test tab only; the shipped CSS keeps the fade.
  Screenshots lagged one frame behind clicks until a 1 s wait was added.
- Bug found and fixed on the way: Esc in the codex over the pause menu also resumed the flight (the flight's own key
  handler saw it). GameView's toggle now closes the codex first.
- The ship drawings are SVG side views from ART-DIRECTION.md's descriptions, not renders of the three.js reference
  models on `claude/practical-shamir-f7a67a`, which are not on this branch. The race-only classes have no 3D model.
- Nothing reads `PEOPLES` in flight yet; the arrival card still shows `RACES`' line.
- `package-lock.json` changed under `npm install` (two lines); left out of the commit.

### Next
1. Caleb reads the codex and LORE.md, and answers open questions 11–14 (Greek class names, race-only ships, Earth as
   a league, the Pythia as scholarship).
2. Progression swaps its placeholder class names (LORE.md table); stations names its stations from `PEOPLES`.
3. Once the styles merge, the codex could show the 3D reference models beside the SVG plates.
## 2026-10-19 — motivation (branch claude/motivation-84a48a, from integration 8caa0a9)

### Done
- **RESEARCH-MOTIVATION.md**: player motivation research. 41 sources opened 2026-10-19 (Ryan/Rigby/Przybylski 2006,
  Schultz 1997, Berridge & Robinson 1998, Kivetz 2006, Kahneman & Tversky 1979, the 2025 Zeigarnik meta-analysis,
  Booth's L4D director, Stellaris and XCOM 2 dev writing, the Nemesis patent, and more). Claims are labelled
  MEASURED / STATED / WEAK, with a "not opened" list, an ethics section, and 20 design principles.
- **MOTIVATION.md**: the plan. Four ladders tied to Earth (pilot level with Renown, technology by research, military
  command Pilot → Admiral, influence Outsider → Metropolis restored), Earth's Works and Holdings as sinks, the reward
  rhythm, achievements, the planet-fall sequence, the director's antagonist moments, four strategies, eleven
  anti-stagnation rules with numbers, three playthrough routes, Earth vs other starts, a hand-off table.
- **src/lib/motivation/** (pure, not wired): `tables.ts`, `ttk.ts` (reads the balance simulator's `engageMany` for
  kill pay), `director.ts`, `sim.ts` (route simulator), `rules.ts`, `report.ts`, `motivation.test.ts` (15 tests).
  `integration/motivation-routes.md` is the run: three routes win in 4.4–4.7 h, every rule passes; the seed sweep is
  60 of 60 runs over two time-to-kill tables.
- Fixes for integration report 1: a new XP curve (level 10 at 16,000, 53–63% of the run), kill pay by time under fire
  (capital 145, cruiser 40, fighter 60), the capital ship at Captain (level 7, a world turned, helium-3, a mission)
  and the armada at Admiral (level 10, three worlds turned).
- `npx tsc -b` clean; `npx vitest run --dir src` 105 tests in 9 files pass; `npm run build` passes.

### Broken / not verified
- The model is a pacing model, not a player: no deaths, 0.5° aim, one route policy. The first playtest sets the scale.
- Numbers mirrored from unmerged threads (conquest's sites and conquest times, planets' resolve, fleet-command's
  ranks) must become imports when those merge.
- Several thresholds changed after the first run, each with its reason in `tables.ts` and MOTIVATION.md 8.3 (length
  band 6–14 → 4–10 h; next-goal keyed to worlds turned, 13/25/45 min; late raid window 9 → 12 min).
- The Nemesis patent's claims were not read in full; the rival design avoids procedural NPC hierarchies as caution only.
- Nothing is wired into the game; the director and the HUD bars need a thread.

### Next
1. Caleb answers: Earth-only start or any of seven homes (MOTIVATION.md 9, question 1).
2. Hand-offs in MOTIVATION.md 10 (also `motivation-handoffs.md` in the notes folder): progression's XP curve and kill
   pay first, then fleet-command's rank table, conquest's home budget and station sections.
3. A thread to wire `director.ts` and the four HUD bars into the game, then a playtest against rules 6.1–6.6.

## 2026-10-18 — races (thread races: a people for each planet, Greek and Roman, DRAFT)

### Done
- **LORE.md** (DRAFT): the Founding, Spreading, Editing and Sundering; a page each for the Selenitai (Moon),
  Hemerodromoi (Mercury), Nephelai (Venus), Quirites (Mars), Diadochoi (Jupiter's moons), Autochthones (Titan); a
  who-stands-where table; ten open questions. Physical facts read this session from NASA's NSSDCA fact sheets and
  NASA Science's Titan page, each cited with its last-updated date. Moon surface gravities worked out from the
  sheets' mass and radius. Facts not read in a primary source (Venus cloud-layer conditions, its acid clouds,
  Jupiter's radiation belts) are marked "outside source". Body changes are labelled grown / chosen / custom.
- `lib/races.ts` + `lib/races.test.ts` (3 tests: one race per non-player nation, none for Earth; homes and names
  match; fields filled, names distinct). `lib/nations.ts`: only the `name` values (now from `RACE_NAME`), its
  import, and the header sentence that said names were placeholders. `ArrivalCard.tsx`: "Held by" shows the race
  name and its one-line description under it.
- Proved in the in-app browser (port 5300): `__voyage.actions.fly('mars')`, `run` 11.6 s: parked at Mars, 0 hits;
  card "Held by: Quirites / A Roman republic of Senate and legions that broke from Earth by war and calls itself the
  true Rome. · To surface 2.6". The HUD lock now reads "locked: Selenitai" (it uses the nation name).
- `npx tsc -b` clean; `npx vitest run` 46 tests in 5 files pass; `npm run build` built (the usual >500 kB chunk
  warning).

### Broken / not verified
- The lore is unread by Caleb; all of it is up for change.
- The pane was hidden: frames were driven by `__voyage.run` with the pixel ratio lowered to 0.25 for speed, then 1
  for the screenshot. A first attempt left the autopilot stuck at speed 0 (after a timed-out `run`); a reload fixed it.
  Not investigated.
- Merge risk: `nations.ts`'s NATIONS line also carries `patrols: 3`, which the ship-types branch may change.

### Next
1. Caleb reads LORE.md and answers the open questions, starting with whether the colonies speak Greek and Latin.

## 2026-10-18 — session 2 (thread g-key-weapon: G switches the weapon)

### Done
- Caleb: "we're going to change how you switch your primary firing weapon to that G key." G now cycles laser and
  missile; Q, 1 and 2 no longer do anything. Left click still fires; the touch weapon button is unchanged. Change is
  the keydown handler and the hint line in `components/Voyage.tsx`, plus SPEC.md's Weapons section. G was free
  (bound keys: F, E, M, N, R, X, W/A/S/D, arrows, Space, Shift, Enter, Esc). G with Ctrl, Cmd or Alt is ignored.
- **Proved in the in-app browser with `__voyage`** (port 5294), New flight, real key presses: start `laser`; G →
  `missile`; G → `laser`; Q → `laser`; 2 → `laser`; G → `missile`; 1 → `missile`; Q → `missile`. Hint reads
  "Left click: fire · G: laser or missile · …". The on-screen weapon button switched missile → laser.
- `tsc -b` clean, 43 tests in 4 files pass, `npm run build` passes.

### Not proved
- Touch devices with a hardware keyboard were not tried. Parallel branches (targeting, ship types, planet scale) were
  not merged here, so G was not checked against any key they add.
## 2026-10-18 — fleet-command (branch claude/fleet-command-885c0e, from ship-types 336ace1; progression merged)

### Done
- Research (30 pages on Homeworld, Sins, X4, EVE, Battlefleet Gothic: Armada, FreeSpace 2, Squadrons, Everspace 2,
  Bannerlord, FTL, Elite; read 2026-10-18) in FLEET-COMMAND-RESEARCH.md; the plan in FLEET-COMMAND.md.
- `src/lib/fleet/`: types, spec (per-type flight and guns, stances, formations), formation slots, target choice,
  steering with planet avoidance, orders and wing anchors, the brain and the fleet step, the rank table. 20 tests.
- `combat.ts`: spawn / remove / damage for ships something else flies (`driven`), beacons on them, a `lost` count.
  `fleet/fleetRuntime.ts`: the flagship, bay, wings and fleet bolts in the scene. `CommandBar.tsx`, `TacticalView.tsx`,
  a Fleet tab in NavOverlay, keys C, Z and T in Voyage, the capital ship's camera and turn rate.
- Merged `claude/progression-0613e0` (65e9faf): ranks now read its level; fleet kills earn its XP; each nation's
  typed ships fly its per-type loadout.
- Proof in the browser (dev server on 5304, `__voyage.run` driving frames), on the merged build:
  - Level 1 pilot: `fleet.takeCommand()` refused (false); the test unlock made the player Captain in a capital ship,
    bay 2 cruisers and 8 fighters, cap 14; Launch put out 10 ships in three wings (Cruisers 2, Alpha 4, Beta 4).
  - **Attack**: all wings on the Moon nation's capital ship (1,060 hp with its loadout): destroyed in 17 s; XP 15 → 270.
    Before the merge, the same order on the 900 hp capital took 27 s (175 shots, 175 hits; hp 855, 705 … 0 every 3 s).
  - **Defend**: all wings defending the flagship, Mercury's 2 cruisers and 4 fighters set on it with the same brains:
    escorts engaged at 1 s, all 6 raiders down in 15 s, flagship 900 → 555.
  - **Path**: Beta's three waypoints drawn by taps on the Fleet tab (through its own tap handler) and sent: the lead
    ship passed them at 0.44, 1.14 and 1.72 ship lengths, then the wing held at the last point (19.5 s, hold fire).
    The first try cut the first corner by 20 lengths; fixed (lead ship flies the anchor; anchor slows into corners).
    Path proved before the progression merge; attack, defend and recall re-proved after it.
  - **Time on the Fleet tab**: 0.25 world seconds per real second.
  - **Formation** (Alpha, four fighters, 8 s each, measured from ship positions): wedge nearest 4.25 lengths, widest
    21.2; line abreast 3.98 / 25.2; column 3.47 / 10.5; screen ring 11.8 / 16.7.
  - **Stance** (Alpha holding, one stationary Mars cruiser placed at 40 and 90 lengths, 5 s each): at 40, hold fire
    0 engaged, 0 damage; evasive 3 engaged; defensive 4 engaged, 70 damage; aggressive 4 engaged. At 90, defensive 0
    engaged (stayed within 8.1 lengths of its post); aggressive 4 engaged and chased out to 134 lengths.
  - **Recall**: all 10 docked in 3 s; bay back to 2 cruisers, 8 fighters.
  - Formation keeping after launch settles to about 1 ship length off-slot within 6 s.
  - 375 px: page width 375; the strip folds to "Fleet · 10"; opened, 44 px buttons in rows that scroll; the Fleet
    tab's map is 359 × 580 with its buttons in one scrolling row.
  - Screenshots seen in the pane: the flight view with the strip and the locked Mars capital ahead of the flagship;
    the Fleet tab with Beta's numbered path; the Fleet tab at 375 px with engagement circles.

### Broken / not verified
- **Not felt.** Whether commanding feels good is Caleb's call.
- Fighters are 0.07 units long and nearly invisible from the capital ship's camera; only their beacons show. Fleet
  bolts live one or two frames at these ranges, so a still rarely catches one.
- One render took about 2 s once (the first frame after a new nation's capital ship appeared; likely a shader
  compile); after that 30 frames took 93 ms.
- The flagship can't be destroyed (hp stops at 1) and does not get its race's loadout bonus (900 hp).
- At Captain, progression's cruiser wingmen are still on B/V beside the new fleet.
- Earth's own patrol ships are drawn in the same blue as the player's fleet on the Fleet tab.
- The fleet is not saved with the journey.

### Next
1. Caleb: hold fire as a stance, or its own switch (FLEET-COMMAND.md section 9)?
2. The mission "Take command"; then doctrine and self-preservation (pull back at low hull).
3. Ship markers on the flight view for fleet ships, and enemies that fight back with the same brains.

## 2026-10-18 — ship-types (enemy ship types: capital ship, cruiser, fighter)

### Done
- `lib/shipTypes.ts`: the type table (size, hit points, hit radius, patrol speed, ring, dodge), all in player-ship
  lengths; first-pass numbers in SPEC.md. `lib/nations.ts`: each nation's `force` (1 capital, 2 cruisers, 4 fighters)
  replaces `patrols: 3`; `patrolPos` takes the type; new `patrolDir`, `ringRadius`, `ringClear`, `shipCount`.
  `patrolRadius` unchanged.
- `components/space/fleet.ts`: capital ship and fighter models, the cruiser as the player's ship in the nation's
  colour, merged by material. `ship.ts`: optional `hull` colour (the player's call is unchanged, still brass),
  `SHIP_MODEL_LENGTH` (2.06), plumes and lights tagged so a copy can merge the rest.
- `combat.ts`: ships built from the table; each `Craft` carries `type`, `radius` (world units) and `maxHp`; the laser
  and missile hit tests use `c.radius`, the dodge roll uses the type's chance, the blast scales with the ship.
  `Voyage.tsx`: one line, `createCombat(..., { uniforms, shipScale: SHIP })`.
- **Proved in the in-app browser** (port 5296, `__voyage`):
  - 49 ships, 42 hostile; every nation: capital 1, cruiser 2, fighter 4. No NaN positions.
  - Bounding-box length along each model's own nose-to-tail axis, exhaust left out, against the player ship's
    (0.3708 units): **capital 5.000×, cruiser 1.000×, fighter 0.200×** (all 7/14/28 identical).
  - Lasers from 10 units, through the real trigger/update/hit code: Venus capital 75 hits in 12.4 s; cruiser 9 hits;
    fighter 3 hits. Missiles from 40 units: Jupiter capital 15 fired, 15 hits, 0 dodges; cruiser 6 fired, 2 hits,
    3 dodges; fighter 10 fired, 1 hit, 6 dodges.
  - Hit radius: a laser passing 0.5 off misses a fighter (r 0.371) and hits a cruiser (r 0.705); 0.9 off misses a
    cruiser and hits a capital ship (r 1.112). 60 laser shots at an Earth cruiser: 100 hp → 100.
  - Screenshot: Earth's capital ship (blue, three engines, bridge tower) beside the player ship near Earth, with an
    Earth cruiser in the distance. No console errors.

### Broken / not verified
- **No fighter close-up.** The live frame loop kept moving the ship between placing it and the capture; fighters are
  proved by numbers only.
- **Not felt, not on a phone.** Whether the capital ship reads as one at play distance, and frame rate with 49 ships
  on a real phone, are untested. Draw calls: 5 per capital ship, 5 per fighter, 10 per cruiser (315 in all).
- Hit radii are generous (a fighter's is 1 player-ship length while its hull is 0.2); first pass, to tune.
- Enemies still do not shoot back or respawn.

### Files touched
`src/lib/shipTypes.ts` (new), `src/lib/shipTypes.test.ts` (new), `src/lib/nations.ts`, `src/lib/nations.test.ts`,
`src/components/space/fleet.ts` (new), `src/components/space/ship.ts`, `src/components/combat.ts`,
`src/components/Voyage.tsx` (one line), `SPEC.md`, `THREAD-LOG.md`.
## 2026-10-18 — thread enemy-ai (enemy armament, enemies shoot back, fighter and fleet AI)

Branch `claude/enemy-ai-dbbee0`, cut from `claude/arsenal-33bf3e` (ad6576a). Caleb: "arm the enemy ships with somewhat
random, but with order according to planet, class of ship, and level of ship … fighter ships should execute complex
maneuvers … cruiser and capital ships should try and position and maneuver to outposition you."

### Done
- `lib/enemyArms.ts` (seeded doctrine roll, stand-in classes and levels), `lib/aiKnobs.ts`, `lib/tactics.ts`,
  `lib/pilot.ts`, `lib/fighterAI.ts`, `lib/warshipAI.ts`, each with tests (159 tests in all).
- `components/enemyAI.ts` (new): alert and calm per nation, the fleet plan, flying, locks on the player, fire, enemy drones.
- `components/arsenal.ts`: enemy bolts, flak, mines, missiles, beams and bursts against the player; player chaff
  breaks enemy locks; ship lost and `respawn()`; enemy stats (`enemy`, `enemyBy`); `testLaunch` dev hook.
- `components/combat.ts`: stand-in roster and rolled fits, hit radius per class, AI-flown ships skip the ring, lock
  slowed in the Sun's glare, provocation on hit or missile lock. `Voyage.tsx`: ship-lost placeholder, HUD warnings.

### Found and fixed in testing
- The start faces the Moon and the old lock code builds a lock with any weapon selected, so "a lock is an attack"
  started a fight at spawn. Now only a lock with a lock-using munition provokes.
- Alert range 90 put the Moon, Mercury and Venus patrols in range of the start; now 12.
- At damage ×1 five level-1 Moon ships killed a stationary player in 1.4 s (their capital's flak did 95). First
  guess now ×0.5.
- A lone cruiser's flank slot was measured from the fleet's centroid, i.e. from itself, so it chased its own slot and
  settled at 212 instead of 300. The fleet line now anchors on the capital ship or home.

### Proved in the in-app browser (`__voyage`, port 5311; 5301 was taken)
- **Doctrine**: cruisers, level 3, seed 0: Mars pulse, seeker, swarm, capacitor Mk 2, flares, attack drone; Jupiter
  pulse, flak, seeker, hardened Mk 2, chaff, PD drone; Venus ion, beam, pulse, bi-facet Mk 2, PD drone; Mercury pulse,
  plasma, beam, hardened Mk 2, flares, attack drone. Venus and Mercury cruisers in the scene (both level 2) differ too.
- **Fighter vs seeker** (Mars fighter, pulse + swarm, level 3; seekers launched by `testLaunch` 54–219 units out):
  9 seekers, 0 hits, 4 last-second dodges, 16 missile-beaming turns, 3 flares used; meanwhile it fired 21 pulse
  shots at the stationary player and hit 18 (126 to the shield).
- **Cruiser standoff** (Jupiter, rail + plasma + torpedo, standoff 300 = cap): 190 → 304 by 13 s, holding 304–309.
  Player charged at 38 u/s: the cruiser backed off at its top speed (38), closing only to 99; when the player stopped
  it opened back to 269. Rail and plasma at 200–300 units: 2 hits in 59 shots.
- **Capital cover** (Jupiter capital, shield held at 10%, player held 90 from Jupiter's centre): cover mode at once,
  behind Jupiter from 1.6 s, then hidden in 283 of 300 steps, sitting 300 out on the cover point. With its shield
  back it left cover. Ship-as-cover is proved in the unit tests only.
- **Flares and point defence** (Mars fleet, player held 120 from Mars, 10 s each):
  no defences: seeker 2/7 hits (67), swarm 24/24 (160), killed; flares + PD drone: seeker 1/13 (36), swarm 14/42 (98),
  flares took 30 missiles, PD 2 kills in 8 shots; a torpedo still hit (176) and killed the pinned player.
- Screenshots in the pane rendered the scene (not black); the fleet was mostly too far off to see.

### Left for Caleb
- Every knob in `lib/aiKnobs.ts`, the doctrines, levels and roster (stand-ins), what losing the ship means.
- Seekers barely touch an evading fighter (0/9); torpedoes one-shot a still player. Balance calls.
- Unproven in the browser: a flown dogfight by hand, mines, enemy beams and ion against the player, Sun approaches.

## 2026-10-18 — thread arsenal (ten munitions, shields, drones, countermeasures, upgrades as data)

Branch `claude/arsenal-33bf3e`, cut from `claude/targeting-2fa0da` (618c62e). Caleb: "do massive research and then
work in development on the weapon system and targeting systems … add 10 different types of munitions, as well as
different types of shielding technology and other types of space technology such as drones."

### Done
- **Research first**: `RESEARCH-ARSENAL.md`, eight games (Elite Dangerous, EVE Online, X4, Star Citizen, FreeSpace 2,
  Freelancer, FTL, Everspace) and the physics (railguns, directed energy, particle beams, EMP, chaff and flares), each
  source with its URL and read date, then what was chosen and why, and the researched candidates not built.
- `lib/munitions.ts` (10 munitions, fire rules, area falloff, salvo, mine and flak fuses, `scaleMunition`),
  `lib/shields.ts` (4 shield technologies × 3 tiers, the shield/hull split, regen, bi-facet sides, armour, ion
  disable, capacitor draw), `lib/tech.ts` (drones, countermeasures, targeting, reactor, armour, engine, enemy fits),
  `lib/modules.ts` (every module as data with tier and `cost: null`, the loadout, sanitising, G cycling). 41 new tests.
- `lib/weapons.ts`: `stepMissile`, `wantsDodge` and `stepLock` take per-munition seeker figures and lock time
  (defaults unchanged, old tests untouched).
- `components/arsenal.ts` (new): fires and moves all ten munitions, the beam, area bursts, shield bubbles and hit
  sparks, the player's capacitor, ammunition and shield, drones, flares and chaff, a hostile test missile (dev hook).
- `components/combat.ts`: the bolt and missile loops moved to arsenal.ts; ships carry a `Defence`, a countermeasure
  and a chaff timer; lock time and range come from the selected munition and targeting computer; chaff can break a
  fresh lock; the lead indicator uses the selected munition's shot speed; disabled ships hold still.
- `components/Voyage.tsx`: the weapon is a `MunitionId`; **G** cycles the fitted weapons (the same keydown line as
  `claude/g-key-weapon-c260c9`), **C** drops the countermeasure; HUD lines for rounds, lock or lead, and shield, hull,
  energy, countermeasure; touch countermeasure button; afterburner sets the boost; `setScale(SHIP / 0.18)`; dev hook.
- `components/LoadoutPanel.tsx` (new), `GameView.tsx` (Loadout button and panel in the pause menu), `lib/store.ts`
  (`settings.loadout`, migrated), `styles.css` (HUD line, loadout screen).
- **Balance change found in testing**: the swarm salvo first homed to 10 units like the seeker, so one 35% dodge roll
  beat all six missiles and it almost never hit. Its homing now holds to 4 units (too late to dodge) and it relies on
  flares being able to take each missile.

### Proved in the in-app browser (`__voyage`, port 5299)
The ship was placed beside one patrol ship and aimed frame by frame; each munition fitted on its own with reactor
Mk III. Shield and hull columns are what that munition did.

| Munition | Target (shield) | Shots | Hits | To shield | To hull | Effect seen |
|---|---|---|---|---|---|---|
| Pulse laser | Moon, deflector 100 | 18 | 17 | 100 | 83.2 | shield first, then 0.8× hull |
| Beam laser | Moon, deflector 100 | held 4 s | on target | 100 | 58 | capacitor 200 → 104; no refill while held |
| Plasma bolt | Venus, bi-facet 70/70 | 6 | 6 | 70 | 150 | all on the rear side (70/0 after); destroyed at 3.6 s |
| Railgun slug | Mercury, hardened 80 | 3 | 3 | 68 | 100.8 | destroyed with 12 shield still up (pierce) |
| Flak burst | Saturn, deflector 100 | 4 | 4 bursts | 92 | 0 | area falloff (23 a burst, not 24) |
| Seeker missile | Venus, bi-facet | 1 | 1 | 48 | 0 | locked at 2.5 s; rear side 70 → 22 |
| Seeker missile | Saturn, deflector + flares | 1 | 0 | 0 | 0 | Saturn dropped a flare; the missile took it |
| Seeker missile | Mars, capacitor + flares | 1 | 0 | 0 | 0 | flare dropped, not taken; ship dodged at the end |
| Torpedo | Moon, deflector 100 | 1 | 3 ships | 227.6 | 85.3 | locked at 4.5 s (3 s lock); blast hit all three Moon ships |
| Swarm missiles | Moon, deflector 100 | 1 salvo | 6 | 84 | 0 | 6 of 6 (twice), after the homing change |
| Swarm missiles | Mercury, hardened + flares | 1 salvo | 0 | 0 | 0 | before the change: one flare took 5 of 6 |
| Ion shot | Venus, bi-facet 70/70 | 4 | 4 | 140 | 3.7 | disabled 4 s: moved 0 in 2 s, shield stayed 0; then moved and regenerated |
| Proximity mine | Saturn, deflector 100 | 1 | 1 | 66.8 | 0 | dropped 14.5 away; burst at arming (1.5 s) with the ship at 7.6 |

- **Player shield**: a 40 hit left 60; still 60 at 2.8 s (3 s delay); 74.5 at 4 s; 100 at 8 s. A hostile test
  missile took 48 off the shield (60 × 0.8), hull untouched.
- **Flares**: dropped (real C key once, `countermeasure()` in the loop) when a hostile test missile was 34 units out:
  4 of 4 missiles took the decoy, nothing reached the shield.
- **Chaff**: Jupiter ship locked by the swarm, dropped chaff at once, lock broken (`chaffBreaks` 1), unlockable 2.8 s.
- **Point-defence drone**: 3 hostile missiles, 3 shots, 2 killed, 1 reached the ship.
- **Repair drone**: a 200 rail hit left shield 28 and hull 4; 2 s later 40 and 12; 7 s later 100 and 32.
- **Attack drone**: 30 units from a Mercury ship, 5 s: 6 shots, 6 hits, 21.6 to its hardened shield (6 × 0.6).
- **Capacitor shield**: beam on reactor Mk I: capacitor 100 → 4 in 4 s, then the shield fed it (60 → 40 → 16) and the
  beam kept firing; released, both refilled. With a deflector the beam stuttered at an empty capacitor instead.
- **Loadout screen**: Menu → Loadout, clicked Railgun: fitted became pulse, seeker, rail (3/4). Resume, then real key
  presses: G → seeker, G → rail, G → pulse; Q, 1 and 2 did nothing; C dropped a flare (6 → 5).
- Screenshots: the HUD, hint line and loadout screen render; the 3D canvas came back black in the pane's screenshots
  (the pane was hidden or the WebGL buffer is not kept), so the shield flash itself was not seen on screen.
- `tsc -b` clean; 87 tests in 7 files pass; `npm run build` passes (output in the report).

### Not proved, or left for Caleb
- Balance and feel are Caleb's. Every number is a first guess on the original laser and missile's scale.
- Costs and how upgrades are earned: empty on purpose (`cost: null`).
- Enemies do not shoot back, so the player's shield, flares, jammer, point defence and repair drone were tried only
  against the dev hook's test missile and test hits. The **jammer** made no difference to a test missile that homes all
  the way in on a stationary ship (5 of 5 hit with and without); its lock-time part has nothing to act on yet. Player
  chaff has nothing to break yet.
- The shield bubble flash and the drones were not seen on screen (black canvas in screenshots).
- Merges: see the merge note in the shared notes folder. `combat.ts` will conflict with ship types (both rewrote the
  bolt and missile loops); `Voyage.tsx` hint line and the Weapons bullet in SPEC.md will conflict with the G-key branch
  (one line each); the boost lines may meet planet scale.

## 2026-10-18 — thread targeting (hold-to-lock missiles, laser lead indicator)

Branch `claude/targeting-2fa0da`. Caleb: "a complete overhaul on the targeting system … acquire a missile lock through
holding a certain targeting system on the enemy ship … for the laser … an advanced targeting system that will show if
your line of sight is correct." Read as two parts: missiles lock by holding the reticle on a ship; the laser needs no
lock and gets a lead indicator that says whether a shot fired now will hit.

### Done
- `lib/weapons.ts`: `LOCK` (time 1.5 s, cone 3°, keep 11°, decay 1.5/s), `stepLock`, `underReticle`, `offAngle`,
  `intercept` (lead point), `boltMiss` (closest pass of a bolt fired now), `SHIP_RADIUS`; `LASER.radius` and
  `MISSILE.radius` are now each weapon's reach added to the ship's own hit radius (totals unchanged at 0.7 and 0.8).
  `MISSILE.lock` (the 24° instant cone) removed. 10 new tests (17 in the file).
- `components/combat.ts`: `findLock` replaced by the held lock (follows the reticle line passed in as `sight`); every
  ship carries `vel` (measured per frame) and `radius`; the lead (`combat.aim`) is computed each frame; a missile gets
  a target only from a held lock and otherwise flies straight.
- `components/Voyage.tsx` (HUD and markers only): passes the camera's line and ship speed to `combat.update`; lock
  bracket with progress (`--k`) and LOCKED; lead diamond and gun cross; HUD weapon line.
- `styles.css`: lock bracket, ring, LOCKED label, lead diamond, gun cross.
- **Proved in the in-app browser with `__voyage`** (port 5295), ship parked ~57 units from Mars ship 13, the reticle
  steered onto it frame by frame:
  - Lock progress 0.58 at 1.0 s, 0.91 at 1.5 s, LOCKED at 1.67 s (it came under the reticle ~0.1 s in). Not before.
  - Held lock: a 6° wobble for 0.5 s kept it; 25° off broke it (id null, progress 0). Re-held 1 s after swinging back:
    0.31, not locked; then 8–11° off for 0.3 s drained it to 0.08.
  - Mid-lock screenshot: amber brackets, ring a fifth full. Locked screenshot: red brackets, "LOCKED".
  - Missiles (Mars ships set to 1000 hp, dodge roll pinned): locked with no dodge, 3 of 3 hit ship 13, turn never
    above 1.30 rad/s; locked with every roll a dodge, 2 of 2 missed (3 dodges each, as all three Mars ships fly within
    22 units of the missile); unlocked, 2 of 2 had target null, never turned, and missed. With the real 35% roll, 6
    locked missiles gave 1 hit, with dodges on every one (each nearby ship rolls).
  - Laser on ship 13 pushed into a 14 u/s sideways slide at ~70 units: aiming at the lead, "will hit" in 18 of 18 and
    30 of 30 frames, 6 of 6 bolts hit each run (run 1: 4 on ship 13, 2 on a neighbour); aiming at the ship itself,
    "will miss" in 17 of 17 frames and 0 of 6 hit. Lead angle there about 3.2°. HUD read "Laser · Mars nation · will
    hit" with `lead-mark hit` and `bore-mark hit` in the DOM.
- `npx tsc -b` clean; `npx vitest run` 53 tests in 4 files; `npm run build` passes (three.js chunk warning as before).

### Broken / not verified
- **No screenshot of the green "will hit" state.** Between the scripted frames and the capture the live loop runs,
  flight assist levels the nose, so captures caught the amber state (diamond with the cross off it). Green is proved
  by the DOM classes and the HUD text read in the same frame, not by a picture.
- **The reticle is not the gun line.** The camera sits behind and above, so the screen-centre circle sits about 6°
  off where bolts go at 57 units. The lock follows the reticle (what the player sees); the laser cross shows the gun
  line. Whether the reticle itself should move to the gun line is Caleb's call.
- **Missile hit rate is low with the real dodge.** Every nearby ship rolls a 35% dodge against each locked missile,
  and a sidestep throws the target off: 1 hit in 6 with real rolls. Tuning, not targeting, but Caleb will feel it.
- Not felt: whether 1.5 s, 3° and 11° feel right is Caleb's to judge. Not tried on touch or gamepad.
- The lead uses the target's velocity measured frame to frame and assumes it holds; patrols curve, so a long shot on
  a turning ship can still miss while green.

### Next
- Caleb plays it and calls the lock time, cone and keep angle; decides on the reticle versus the gun line.
- Merge notes: touched `src/lib/weapons.ts`, `src/lib/weapons.test.ts`, `src/components/combat.ts`,
  `src/components/Voyage.tsx` (HUD and markers, the `Hud` type, and the `combat.update` call only), `src/styles.css`
  (weapons block), `SPEC.md`, `THREAD-LOG.md`. Ship-types work should set `Craft.radius` per type; the lock and the
  lead read it.
## 2026-10-18 — atmo-flight (atmospheres, entry, flying low over the ground)

### Done
- **Research** in `ATMOSPHERE-NOTES.md`: terrain LOD (Ulrich chunked LOD, Strugar CDLOD, Wittens cube-sphere), scattering
  (O'Neil GPU Gems 2, Bruneton, Hillaire), precision (Outerra log depth, three.js, Cesium), NASA fact sheets, the drag
  equation, Sutton–Graves. Each opened and dated; what could not be verified is listed at the end.
- **Maths, unit-tested**: `lib/atmosphere.ts` (density by altitude, the space-to-air blend, drag, lift, heating,
  buffeting, crush depth, sky, pull-up), `lib/terrain.ts` (cube-sphere, quadtree selection, heights and colours per
  body), `lib/noise.ts` (a port of the shaders' simplex noise; it needs the GPU's float32 constants, because in double
  precision 7 × 0.142857142857 floors to 0 and the gradients blow up to ±4.7).
- **Merged `claude/planet-scale-1e1ecc` (7cfd2cf) into this branch** once it committed. One conflict, in voyageScene (the
  body's LOD sphere against this branch's frame hook), resolved by hooking the LOD. Everything here is relative to the
  body's radius or in ship units, so nothing else had to change. **Did not merge `claude/graphics-e638ff`** (based on
  main, not on the rescale, and still running); see SPEC "Overlap with the graphics branch".
- **Proved in the in-app browser** (port 5303; `scripts/airtest.js` drives `__voyage.run` paced to real time; frames are
  read from the canvas in the same task as the render, so they are real; copies in `shots/atmo/`):
  - **Descent into Earth's air from orbit** (day side, nose down 20°). In the air the HUD read "Earth air 0.26 · alt 2.6
    · airspeed 32". Altitude above ground / airspeed / density / sky cover / zenith colour: 18.1 / 119 / 0.0012 / 0.08 /
    #132642 → 4.5 / 15 / 0.08 / 0.44 / #345b94 → 3.9 / 27 / 0.22 / 0.66 / #416eb2 → 2.2 / 29 / 0.28 / 0.72 / #4474ba.
    Entry heat peaked at 64% on a hard entry. 0 ground contacts.
  - **30 s low over Earth**, a terrain-following pilot holding 2.5 above the ground ahead: **0 collisions**. High:
    altitude 0.59 to 5.7, mean airspeed 36.8, 1,105 units covered. Battery saver: 0.94 to 5.69, 38.8, 1,163 units. An
    earlier High run (before tuning) was also 0 collisions over 1,173 units.
  - **Frame time low over terrain** (CPU time of a frame including draw submission, 960×540, pixel ratio 1, desktop with
    16 threads, hidden pane): High median 4.1 ms, p95 6.8, max 148; Battery saver median 3.7, p95 5.9, max 23.7. With
    `gl.finish()` every frame the High median was 10 ms, but in the hidden pane open space alone showed p95 312 ms and one
    6.5 s stall, so the tails belong to the hidden pane, not the ground.
  - **Jupiter**: dived nose down 40° at 80% throttle. Deepest point −48.7 below the cloud tops, which is the crush depth
    exactly; pushed back 3 times (each 20–40 units up). Then **climbed out**: airspeed 23 → 42 → 113 as the air thinned,
    out of the air in about 4 s, and 3 s later in space at 11,908 units/s, exactly what the throttle asks of the space
    model. From low over Earth: out in about 2 s, then 11,690 units/s.
  - **Mars**: 12 s low (after deepening its air, below), 0 collisions.
  - **Enter from inside the air**: the "Inside: Earth" room opened; Leave put the ship back in the air.
  - **Existing checks**: autopilot to Mars parked, 0 collisions, closest 531 units to a surface. **Grand tour parked at
    all ten stops** (earth, moon, mercury, venus, sun, mars, jupiter, saturn, stars, edge), 0 collisions, closest 275,
    and it never entered an atmosphere.
- Fixed along the way: building the nearest patches first starved the middle levels, so the whole face fell back to one
  coarse patch; now ranked by distance over size. Crater noise looks in 8 cells instead of 27 (a Mars patch 380 → 22 ms).
  Mars's air was 7 units deep against 4-unit mountains, so the test ship left the air flying low and hit a ridge; Mars is
  now 6% of R deep with 1.5% relief.

### Broken / not verified
- **How it flies is Caleb's call.** All the flying here was a closed-loop test pilot, not hands.
- **No phone measured.** The Battery saver numbers are from a desktop.
- **Hidden pane**: frame-time tails are unreliable there (see above); no real-time rAF timing was taken.
- **Looks, from the frames**: Earth's plains are smooth green close up (the mottling is subtle); Jupiter's deck bands look
  like ripples seen straight down; Earth's cloud shell (from the space view, at 1.2% of R) reads as a white wall at
  mountain height; patches show facets until the finest level streams in, which lags at full air speed.
- Craters on the Moon, Mercury and Mars are not where the space-view shader puts them (its sin-hash cannot be matched on
  the CPU), so they change as the ground streams in at 30% of a radius. Continents and maria do match.
- Not exercised: low flight on Venus, Saturn, the Moon and Mercury; touch and gamepad in the air; saving inside the air
  (it saves the position; the air is entered again on load).
- After a merge with the graphics branch, its inside-the-air scattering will draw on top of this sky dome until one is
  chosen.

### Next
1. Caleb flies it and says how it feels: the speeds, the brake near the ground, how loud PULL UP is.
2. Pick one inside-the-air sky with the graphics branch.
3. Measure a phone on Battery saver.

## 2026-10-18 — session 1 (thread flight-core: the flight core without the astrology; weapons; nations)

### Done
- New repo from the-ascent tag `v2-guide` (415e311). Commits: the unmodified copy, then the strip, then weapons and
  nations. The-ascent itself was only read (`git archive`), never edited.
- **Baseline** on the unmodified copy (same code as `v2-guide`): 87 sprites, 87 textures, 70 tests in 9 files.
  (Measured on this repo's first commit, not on the-ascent's own dev server, so its working tree was not touched.)
- **Stripped** everything listed in SPEC.md; fixed layout in `lib/bodies.ts`. Now: **10 sprites, 10 textures**
  (Earth and seven body names, two Sun glows); 43 tests in 4 files.
- **Proved in the in-app browser with `__voyage`** (port 5293):
  - Engines off at the start: orbits Earth, distance 12.015 before and after 20 s, nose turned 56.4°, HUD
    "Orbiting Earth · lap 2 m 01 s".
  - W raises throttle to 0.90 in 2 s (speed 196.6), S lowers it to 0.60; Shift: wanted speed 25.2 → 63.1 (×2.5);
    X: speed 0.000, throttle 0. A +56.2°/s, D −43.7°, ←  +43.8°, ↑ pitch +44.5°, ↓ −34.6°.
  - Cursor steering: hovering at 85% across gives stick x 0.97 and a −53.4° turn in 1 s; leaving the canvas zeroes it.
  - Autopilot to Mars: parked in 9 s, 0 collisions, 2.77 from the surface; card "Mars · Radius 3,390 km · 53% of
    Earth's · To surface 2.7".
  - Forced detour (ship on the far side of the Sun from Mars): 2 detour points, closest 111.8 above the Sun's surface,
    parked at Mars in 14 s, 0 collisions.
  - Grand tour from the start: all ten stops parked in order (earth … edge), each opened its own card, phases aligning,
    cruising, approaching, parked all seen, 0 collisions, 109 s. The Mars → Jupiter leg flew a detour point (ruling 1).
  - M, N, R open Map, Computer, Route; Esc closes the navigation screen, the next Esc opens the pause menu, the next
    resumes. F → flight view 1024×768 of a 1024×768 window; F again ends it; the Full button does the same.
  - E at Earth: inside in 4.6 s, room "Inside Earth" with its placeholder line; Esc → back at exactly the entry point;
    HUD "Orbiting Earth", distance 12.015 held.
  - Inside Mars → Menu → Save journey → page reload → Continue: back inside Mars; Esc → ship at (796.325, 0.003, 0.222)
    against the saved (796.325, 0.003, 0.221); HUD "Orbiting Mars · lap 47 s".
  - At 375 px: joystick (touch on the left) gives stick x 1.00 and turns the ship; released on lift; throttle track
    click → 0.68 and speed 39.9; Boost button held: wanted speed 43.4 → 108.6, released on lift; Stop → 0.000.
    Page scroll width 375; the navigation screen 375 wide. Only the destination chips run past 375, inside their own
    horizontally scrolling row (as in The Ascent).
  - **Weapons**: 21 patrol ships (18 hostile). Left mouse down on the canvas sets the trigger, up releases it.
    Lasers at a Mars ship: 6 shots, 6 hits, 100 → 28 hp; held until it died: 1 down, HUD "Laser · locked: Mars nation
    · 1 down". Q → missile, 1 → laser, 2 → missile. Missiles fired 11.5° off the target: 7 fired, 4 hits, 3 dodged at
    the last second, homing turn never above 1.30 rad/s; the Mars patrol was wiped out.
- Grep of `src` for zodiac, the sign names, angel, seal, astrolog, Ptolemy, Lilly, Agrippa, Poimandres, natal, chart,
  ascendant, Hermetic, Chaldean, King scale, Paracelsus, Caleb, Cora, ecliptic, "sphere of", kamea, vice: no hits
  but "cosmos" (a plain word) and `devicePixelRatio`.

### Broken / not verified
- **Not felt.** Whether it still flies as well, and whether the combat feels right, is Caleb's to judge.
- **No visual proof of combat.** The in-app pane was hidden, so screenshots came back stale (frames are only drawn
  when `__voyage.run` drives them). Bolts, missiles, the lock bracket and explosions are proved by numbers only.
- Frame rate on a real phone; true browser full screen and the Escape lock (the in-app pane refuses them).
- Enemy ships do not shoot back, do not respawn, and do not chase. Their dodge is a 35% roll, a number to tune.
- A mouse click no longer picks a body as a target (it fires); chips, the map and the computer still pick.
- The tests use the fixed layout plus eight scrambled ones; `nav.test.ts` "names the sign the nose points into" became
  "reads the angle the nose points to" (sign names are gone). `hours.test.ts` was removed with `astro.ts` (it tested
  planetary hours, which are astrology). No other test was dropped except with the module it tested.
- The preview tool refused to start a server (five-server cap held by other chats), so the dev server ran from Bash.
- Build warns that one chunk is over 500 kB (three.js); as in The Ascent.

### Next
1. Caleb answers: what is the player trying to do?
2. Then, one at a time: what the nations are called and who they are; whether enemies fight back; ship types;
   how progress works (expansion, battle, conquest); mining; the economy.

## 2026-10-18 — progression (branch claude/progression-0613e0, from main 9e4d39d)

### Done
- Faction start, 21 loadouts, levels and unlocks, fighter bay with wingmen, first-pass shipyard and economy. Rules in
  PROGRESSION.md. Commits: dd68bbe (library and tests), f3ce9ec (start screen, HUD, bay, shipyard, wiring), 787b186
  (arsenal's real munition and shield ids), then the docs and a save-repair fix.
- Read before building: races (LORE.md, races.ts; uncommitted at first, then 95c3dbf), arsenal (munitions.ts and
  shields.ts at 49536e2), ship types (shipTypes.ts at 336ace1), the targeting and ship-types hand-over notes.
- **Proved in the in-app browser** (dev server on 5302, `__voyage` and a new `__pilot` dev hook):
  - Start screen with seven race cards (screenshot taken; the pane rendered).
  - **Mars**: ship at (792.66, 0.6, 0.04), 7.3 from Mars, HUD "Mars’s ring"; pilot panel "Quirite Corvus · Level 1 ·
    ₡ 100"; Mars patrols friendly, the other six nations hostile.
  - **Moon**: ship 6.2 from the Moon (orbit zone 12.2); "Selenite Lamp", two lasers, light shield, repair drone;
    asking for the missile was refused (the Lamp carries none). Moon patrols friendly.
  - **Earth** (after the arsenal swap): spawn (6.17, 0.6, 10.29), the same place main starts; "Human Pathfinder ·
    Pulse laser · Seeker missile · Deflector shield · Targeting computer".
  - Three kills → XP 120, level 2, one fighter in the bay; pilot panel "Level 2 · 20/200 XP · ₡ 175 · Bay docked".
    Level-up toast seen on a later level: "Level 3 · Tier-2 tech on sale".
  - **B** launched the fighter; with the player not firing (0 player shots) it attacked the locked Mercury patrol,
    staying 1.9–3.2 units off, 12 shots, 12 hits, killed it in 4.25 s; the kill paid 40 XP. It went on to two more
    locked ships, then fell back to escort 1.5 units from the player. **V**: it returned and docked in 0.2 s.
    After the arsenal swap (fighter guns at a quarter strength): a Human Sparrow killed a 200-point Selenite patrol in
    6.5 s, 20 shots, 20 hits.
  - **Shipyard**: tier-2 tech (then the Pulse laser; under arsenal's ids it is the Plasma bolt) showed "Level 3", disabled. Bought a homing missile: ₡ 250 →
    170, into the hold (both weapon slots full); Swap fitted it in weapon slot 2 and the laser went to the hold;
    the weapon switch then allowed the missile. Screenshot taken.
  - **Save → reload → Continue**: progress identical (nation moon, XP 240, ₡ 170, 6 kills, fit, hold, 1 fighter,
    purchase list); position (−36.22, 1.3, −12.67) → (−36.21, 1.3, −12.68); Moon patrols friendly; B launched the
    fighter again.
  - That dev save then held the earlier placeholder ids (laser, missile); Continue repaired it to the Moon's own
    loadout (this found a bug, fixed and tested: a fit with unknown modules is no longer kept as an empty fit).

### Broken / not verified
- **Not felt.** Loadouts, the curve, the wingmen and the prices are first passes; whether they are fun is Caleb's.
- Munitions other than main's laser and missile do not fly yet: a Railgun fires as the laser (arsenal's job).
  Shields, armour and drones on the player's cruiser do nothing yet (enemies do not shoot); on patrols they add hit
  points and dodge.
- Every kill counts as a cruiser until ship types merges.
- Destroyed ships come back on reload (as on main).
- The pane went hidden for part of the run; numbers were read from `__voyage.run` frames. The start screen, the
  flight view with the pilot panel and the bay, and the shipyard were screenshotted while it showed.
- Merge conflicts to expect: `nations.ts` (ship types replaces `patrols` with `force`; races imports `RACE_NAME`),
  `combat.ts` (ship types and targeting both rework it), `Voyage.tsx` (one optional prop, five small hook lines),
  `store.ts` (planet scale edits it).

### Next
1. Caleb: is a kill the only way to earn XP and credits for now, and is 3 kills to the first fighter the right pace?
2. On merge: swap refs.ts to races' class names, arsenal's module ids, ship types' `ShipType`.
3. Enemies that fight back, so shields, armour and the wingmen's survival matter.


## 2026-10-18 — session 2 (thread planet-scale: planets enormous next to the ships)

Caleb: "scale planet size as to being absolutely massive and to scale with the ships. Star Wars level."
Branch `claude/planet-scale-1e1ecc`. Details and reasons in SPEC.md, "Scale".

### Done
- **Ratio** Earth radius ÷ player ship length: **5.4 before, 998 now** (ship 0.3708 units, measured from the model's
  bounding boxes in the browser; Earth radius 2 → 370). One constant, `nav.ts` `COSMOS = 185`, grows every cosmos
  distance and open-space speed; ships, camera, dust and weapons stay in ship units.
- Logarithmic depth buffer, view-space shaders, camera-relative dust; LOD spheres; close-up surface octaves; hairline
  rings; patrols at 1.6 R + 185; saves carry their scale.
- **Proved in the in-app browser with `__voyage`** (port 5297; the pane was visible, so frames are live):
  - Ship 2.06 model units × 0.18 = 0.3708; Earth 370 → 997.8 ship lengths.
  - Autopilot from the start to Mars: parked in **9.5 s** (was 9 s), **0 collisions**, top speed 50,431, parked 520
    above the surface (Mars radius 196.8), closest pass to any surface 531.
  - Grand tour from the start: all **ten stops parked in order** (earth 7.0 s, moon 11.0, mercury 20.5, venus 29.5,
    sun 39.5, mars 50.0, jupiter 58.0, saturn 69.5, stars 85.5, edge 99.0), **99 s** (was 109), **0 collisions**,
    closest pass 275, up to 2 detour points, phases aligning, cruising, approaching, parked all seen.
  - Edge → Earth on autopilot 12 s; then engines off: distance **1,173.289 → 1,173.266** over 20 s (0.002%),
    nose turned 154°, lap 46.6 s, orbiting Earth.
  - E at Earth: inside in 6.4 s (was 4.6), room "Inside Earth"; Leave → back at exactly the entry point (0.0000);
    orbit distance 1,173.266 held after.
  - Screenshots: Earth filling the view from 164 above it; the day side from 25 above (round horizon, clouds); a Mars
    patrol ship (0.6 units) 8 units off with Mars 310 below; skimming the Moon 3 units up (craters, no seams, no
    facets). One screenshot came back stale (a frame from the start of the flight) and was retaken.
  - No shader failed to compile (27 programs).

### Broken / not verified
- **Not felt.** How it flies at this scale (74,000 units/s top speed, throttle now five decades wide, skimming at
  2 units) is Caleb's call.
- **Phones not tried.** The near LOD is 256 segments and 6 detail octaves on phones, and the log depth buffer turns off
  early depth rejection; the frame rate on a real phone is unmeasured.
- Loading a save from before the rescale (×185 on load) is coded but was not exercised in the browser.
- Entering a body takes 6.4 s instead of 4.6 s (the final stretch has a fixed minimum speed); not tuned.
- The other three sessions' branches (G-key weapon, targeting, ship types) are not merged here; Voyage.tsx edits here
  avoid the keydown handler. New enemy models sized "relative to the player ship" fit this scale as they are.

### Next
1. Caleb flies it and says whether 1,000 ship lengths is massive enough. For more, raise `COSMOS` (370 gives 2,000
   ship lengths; flight times stay the same, but the throttle's range widens and the cosmos grows to 960,000 across).

## 2026-10-19 — destroyer (branch claude/destroyer-a8ff7d, from claude/integration-5d7cd1 8caa0a9)

Caleb asked for a destroyer: between the cruiser and the capital ship in size, faster and more agile than both, lighter
than the capital, out-gunning the cruiser and slightly under the capital, carrying fewer small craft than a cruiser.
Design, numbers and every measurement: **DESTROYER.md**.

### Done
- Hangar table for the other threads, first: `destroyer-hangars.md` (manager's notes folder) and `src/lib/hangars.ts`.
  Capital 12 slots, cruiser 4, destroyer 2, fighter 0; a drone a quarter slot, boarders and dropships two.
  Fleet-command's and progression's bays unchanged.
- Destroyer row in `shipTypes.ts` (2.2 L, 300 hp, hit radius 2.3, dodge 0.38); flight, guns, mass in
  `lib/destroyer.ts` (44 L/s, 1.55 rad/s, 3 turrets, 59.4 dps against the capital's 67.2 and the cruiser's 25).
- Every relation Caleb stated is a test (`destroyer.test.ts`), checked against fleet-command's and enemy-ai's tables.
- A loadout per race (3 weapons, 1 defence, 1 support; 76–88% of its capital's dps), class names per nation, kill
  rewards; one destroyer in every nation's force (8 ships, was 7).
- Seven nation models after the art direction (`space/destroyers.ts`), in the scene on every nation's patrol.
- Fast-hunter brain and flight step (`lib/hunter.ts`), a dev proving range on `__voyage.duel` (`components/duel.ts`).
- Balance simulator: destroyer rows and two bands (beats a cruiser ≥ 80%, a capital ≤ 35%): 100% and 0%.
- Glue patches for enemy-ai (162/162 tests there) and fleet-command (24/24 fleet tests, incl. a Commander rank that
  flies a destroyer) in `integration/destroyer/`.
- Browser (port 5393): sizes 5.0 / 2.2 / 1.0 L; top speed 12 / 44 / 36 L/s and turn 0.30 / 1.55 / 1.30 rad/s
  (capital / destroyer / cruiser); destroyer beats cruiser in 4.3–9.0 s over 12 duels, loses to a capital ship.
- `npx tsc -b`, `npx vitest run --dir src` (108/108), `npm run build` pass.

### Broken / not verified
- No in-flight close-up of an enemy destroyer on patrol (backgrounded pane, turning orbit camera; off-player renders
  came back black). The force was read from `combat.crafts`; the models were shot beside the player.
- Enemy-ai and fleet-command glue tested by unit tests on scratch checkouts only, never in a browser.
- The duel's cruiser brain is a plain stand-in; enemy-ai's cruiser may do better against a destroyer.
- Force size 7 → 8 and the Commander rank are proposals for Caleb.

### Next
1. Integrator: after enemy-ai and fleet-command merge, `git apply integration/destroyer/*.patch`, then swap the
   stand-in copies in `lib/destroyer.ts` for imports.
2. Caleb: the force-size question and how the player gets a destroyer (DESTROYER.md).
3. Fly a destroyer duel with enemy-ai's cruiser brain once both are in one scene.
## 2026-10-19 — thread drone-swarm: swarms of explosive, shield and laser-focus drones

Caleb: drones "unleashed from cruisers and capital ships in swarms", acting "like bees or bird flocks", in three kinds:
explosive (suicide), shielding, and concentrated laser fire. Branch `claude/drone-swarm-8429b1` from integration 8caa0a9.
Design, research and every number: DRONE-SWARMS.md.

### Done
- `src/lib/swarm/` (pure, 19 tests): boids with topological neighbours (7 nearest, spatial hash), structure-of-arrays
  members, launch / recall / dock, losses and reform. Explosive packs encircle and strike in synchronised waves; shield
  drones close a bubble or stand as a wall toward the threat and soak shots, beams and explosive drones; laser-focus
  drones (arsenal's `attack` drone, same id and gun) ring up outside point-defence range and converge every beam on one
  point. Point defence and flak thin swarms. Takes fleet-command's `Order` union unchanged.
- `src/components/swarms.ts`: three InstancedMeshes, one glow cloud and one line batch for every drone in the battle,
  on a floating origin. Player racks on keys 7 / 8 / 9 (0 recalls all), HUD line; hostile capitals and cruisers launch
  by enemy-ai's alert and provoke rules. Voyage: create, two update calls, a key line, `__voyage.swarms` and `geo`.
- Proved in the in-app browser (port 5321): laser focus 42.5 dps from 5 drones with all beams on one point; 6 explosive
  drones on a Moon cruiser, 2 lost to flak, 4 hit; 48 explosive on a capital's guns: streaming in, all 48 shot down; as a
  pack, 33 hit for 990; a hostile shield wall stopped every one of 18 laser bolts (11 of 18 hit without it); a player
  bubble cut damage from 16 laser + 16 explosive drones from 1,813 to 838. 576 drones: swarm 2.4–3.2 ms sim + 0.1–0.2 ms
  draw a frame on High and Battery saver.

### Broken / not verified
- **Whole-frame times**: the pane was hidden all session; frames driven by hand were too noisy on High to give a delta.
  Battery saver: +1.2 to +6.4 ms with 576 drones. Visible-pane and phone frame rates are unmeasured.
- Integration's player has no hull: drone damage to the player is only counted. Hostile swarms target only the player.
- Stand-ins in `lib/swarm/refs.ts` (arsenal ids and numbers, fleet `Order`, hangar slots, enemy defences) until those
  branches merge. Flak against drones uses a 6 L area, not arsenal's 19 L (at 19 L one burst erased a 48-drone pack).
- The player's rack (6 / 5 / 5) assumes all 4 bay slots are drones, at every level; progression gives level 1 no bay.
- Not felt. Citations in DRONE-SWARMS.md are from memory.
- Conflicts to expect: `Voyage.tsx` (import, 4 lines in the loop and key handler, the HUD line).

### Next
1. Caleb: should drones share the cruiser's bay slots with wingmen fighters, or get a rack of their own?
2. On merge: swap `refs.ts` for imports (arsenal, fleet-command, hangars, enemy-ai); route player damage to the hull;
   list racks in fleet-command's command bar.
3. Measure frame rate with the pane visible, and on a phone.
## 2026-10-19 — infantry carrier (branch claude/infantry-carrier-632a2c, from integration 8caa0a9, conquest 0dcc4f3 merged)

### Done
- **Infantry model** `src/lib/infantry/squads.ts`, `fight.ts` (owned here, shared with drill-boarder through
  `infantry-interface.md` in the notes folder, committed first as 870be65): squads (line, shock, guard, militia) with
  strength and morale, site garrisons and hull crews, a deterministic fight with cover, breaking and a forecast.
  Forecast table `integration/infantry-fights.md`.
- **Carrier operation** `src/lib/infantry/carrier.ts`: orders and refusals (conquest's `captureProblem` first, then
  "too hot" and "the garrison would hold"), transit, a 20 s descent under the world's fire, unload, the ground fight,
  the hold by conquest's rule (counted by the troops, handed to `captureStep` whole: see INFANTRY-CARRIER.md 6), one
  squad left as garrison, lift-off; refill for credits; enemy carriers that retake a held site (pending conquest's
  ruling). `persist.ts` reads the save back. Names per nation `names.ts`. Row `INFANTRY_CARRIER` in `shipTypes.ts`.
- **In the game**: `components/space/carrier.ts` (seven nation models), `components/infantry.ts` (scene layer: carriers,
  troops as dots, a screen-size beacon that flickers amber under fire, fire and contest measured, enemy carriers
  launched from their shipyard and shootable), `CarrierHud.tsx`, keys **L** (land at the nearest site that can be
  taken) and **K** (recall), carriers from level 3 (two from 6), `GameData.infantry` saved with conquest, on "Save
  journey" and every 5 s. `window.__infantry` in dev.
- **Tests**: 29 in `src/lib/infantry` (145 in all, `npx vitest run --dir src`).
- **Proved in the in-app browser** (port 5194, `__voyage`, `__infantry`; new game as Earth, level 3–4, at Mars):
  - Refused at the intact Tharsis Mines: "its defences are up: shoot it below half first". Shot to 250/900 with the
    Limes Batteries, both forts and the patrol up: "too hot: its guns would shoot the carrier down (39 a second)".
    Forced anyway: the Gangway descended, hull 320 → 180 → 24 → **lost 17 s after the order**, 5 s into the descent,
    troops and all; the second (Bridgehead, 300 credits) went the same way (`shots/infantry/1-…`).
  - Cleared Mars (patrol of 7 killed, Limes wrecked, forts, foundry, shipyard and mines below half): order accepted;
    descent with hull 320 untouched, mines held at 340/900 (no mending under the landing), troops down, garrison beaten
    in 5.6 s (59.7 of 60 men left against 8.9 standing, 2 squads broken), hold 10 s, **Tharsis Mines yours**: +20
    credits, card "1 of 11 sites yours, 1 wrecked", one line squad (10 men) left as garrison, five squads re-embarked
    (`shots/infantry/2-…`, `3-…`, `4-…`).
  - Save and reload mid-hold: the first try came back 0.8 s behind (Save journey did not save the carriers: fixed in
    `GameView.save`); after the fix, saved at hold 7.62 s with 59.71 v 8.92 men and hull 320, reloaded, Continue: same
    phase and numbers, and the capture completed with the garrison left.
  - Enemy carrier: with the pilot 600 units off, `jump(250)`: Mars's shipyard launched one, it beat the 10-man garrison
    and the mines went back to Mars at 450/900 (half), hold 0, garrison gone; it withdrew.

### Broken / not verified
- **Hangar clash**: destroyer's `destroyer-hangars.md` costs the infantry carrier as a 0.4 L, 2-slot dropship; mine is
  a 2 L hull with six squads that flies with the player's ship ("docked" means that; it is not drawn while docked).
  Noted in `infantry-to-destroyer.md`; Caleb's call.
- The carrier models were not checked by the art direction's 64 px silhouette test, and not seen up close in the
  browser (at 0.74 units long it is a beacon and a label at the ranges tried). No gallery page.
- Fleet command, arsenal, enemy AI and atmo-flight are not merged: no fleet order, no guns or armour of its own, a
  straight-line transit, landing on the top of the site's structure rather than the terrain. Requests and designs in
  INFANTRY-CARRIER.md 10, `infantry-to-fleet.md`.
- Conquest's hold drains anything the player's ship is not in range of, so the troops count the hold themselves; its
  HUD does not show the troops' hold (mine does). `infantry-to-conquest.md` asks for a `holders` hook, a `loseSite`
  rule, and confirmation that a landing stops repair.
- A forced landing has no key (dev hook only). Phones not tried. The HUD lags the state when frames are driven by
  `run()` (it ticks on real time).
- Balance bands were set after the first forecast run, not before.

### Next
1. Caleb: big carrier flying alongside, or small bay dropships (see the question below)?
2. Conquest answers `infantry-to-conquest.md`; then call `captureStep` each frame and drop the troops' own hold count.
3. On merge with arsenal / enemy-ai / atmo-flight / fleet-command: armour and flak, `avoidBodies` routing, terrain
   touchdown and air heating, a `land` order in wings (all designed in INFANTRY-CARRIER.md).
4. A gallery shot of the seven models and the silhouette test.
## 2026-10-18 — thread stations-moons (branch claude/stations-moons-629924, from 9e4d39d)

### Done
- **Moons** from JPL SSD (mean-elements and physical-parameters pages, plus Horizons for 15 radii), read 2026-10-18,
  generated into `lib/moonData.ts`. 11 major moons are destinations; 397 small ones are instanced rocks and points.
- **Stations**: 13, docking (L), station screen with Repair, Hangar, and Upgrade/Market placeholders; docked state
  and hull save and load.
- Files: new `lib/moonData.ts`, `lib/moons.ts`, `lib/moons.test.ts`, `lib/stations.ts`, `lib/stations.test.ts`,
  `lib/world.ts`, `components/moonScene.ts`, `components/stationScene.ts`, `components/StationScreen.tsx`. Hooks in
  `lib/nav.ts` (Dest type, labels, ALL_DESTS, destSphere, orbitZone, DestGeo.kind), `lib/store.ts` (two optional ship
  fields), `components/Voyage.tsx` (world geometry, scene layers, docking, save), `ArrivalCard.tsx`, `NavOverlay.tsx`,
  `navMap.ts` (colours; moons and stations drawn from zoom 3), `styles.css`. `bodies.ts` and `voyageScene.ts` untouched.
- **Proved in the in-app browser** (port 5298, `__voyage`):
  - In the scene: Mars 2 (both rocks), Jupiter 4 bodies + 111 rocks = 115, Saturn 7 + 284 = 291, Earth's Moon 1: the
    JPL counts. Every major moon's radius ÷ its planet's equals km ÷ km to six places (Ganymede 0.037636, Titan
    0.044216, Mimas 0.003404 …); Earth's Moon 0.272704.
  - Autopilot to Titan from Earth: parked 2.21 above the surface (stop 2.06), 0 collisions. To Ganymede from Earth
    Station 1: parked in about 11 s, 2.23 above the surface, 0 collisions.
  - Grand tour from the start: all ten stops parked in order (earth … edge), aligning, cruising, approaching and
    parked all seen, 0 collisions, about 96 s of flight.
  - Stations per nation: Earth 2, Moon 1, Mercury 1, Venus 1, Mars 2, Jupiter 3, Saturn 3.
  - Dock: autopilot to Earth Station 1 parked 4.66 from its centre (dock range 5.38), 0 collisions; L → docking → docked
    after 1.4 s; station screen "Earth Station 1 · Docked · held by Earth (yours)". Hull set to 37 by hand →
    "37 / 100 (37%) · Damage 63 points" → Repair the hull → "100 / 100 (100%) · None". Undock (Esc): ship 3.67 from the
    centre (clear radius 3.06), 0 collisions over the next 3 s.
  - Save while docked (hull set to 55) → IndexedDB holds `docked: "stn-earth-1", hull: 55` → reload → Continue →
    docked at Earth Station 1, station screen open, hull 55 / 100.
  - The computer lists all 34 destinations; the map draws with a moon and a station on the route at zoom 1 and 8.
  - Screenshots (in the worktree's `proof/`, not committed): `station-mars-1.jpg` (Mars Station 1: the hangar mouth
    with its cruisers and fighters, the capital ship moored outside, Mars and Mars Station 2 behind) and
    `jupiter-moons.jpg` (Ganymede, Europa, Jupiter, two Jupiter stations). The pane was hidden, so the pane's own
    screenshots came back stale; these were drawn by calling the renderer directly (no bloom) and read off the canvas.
- `tsc -b`, `vitest` and `npm run build` pass after the last edit.

### Broken / not verified
- **Not seen in motion** by a person: the docking fly-in, the looping fighter, how stations and moons look in play.
- **Scale**: at today's scale a station (6.6 ship lengths across its footprint) is larger than Mars and the Moon. The
  planet-scale branch should fix that; stations and moons are sized against the ship and the planet so they follow.
- Phobos and Deimos are not destinations (the visibility rule); 366 small moons use a 2 km placeholder radius.
- Frame time on a phone not measured. In the hidden pane, flight with drawing switched off ran about 5 ms a frame.
- Driving the frame loop synchronously from the console set off one React "Should not already be working" error; it
  comes from the test harness calling `run` while React renders, not from play.
- Docking is allowed at every nation's station, hostile or not. Nothing damages the hull yet.
- Merges: after ship-types, swap the stand-in housed ships for `space/fleet.ts` models (stationScene `cruiser`,
  `fighterGeo`, `capital`). After planet-scale, re-run `moons.test.ts` and `stations.test.ts`; they check every fit
  against the new geometry.


## 2026-10-19 — stations (branch claude/stations-1c393c, from integration 8caa0a9)

Caleb: "another thread that really focuses in on each space station: the defenses it has on it, the ways it
strategically defends Navy attacks, the way it can deploy its own Navy / economy / religion / power / development /
improvement." Mid-thread ruling: stations are god-themed armour over each planet; **god-armour** owns the body (shape,
orbit, berths, docking), this thread the systems. Design and numbers: `STATIONS.md`.

### Done
- **Step 0** (24ee3a0): merged `claude/stations-moons-629924` onto planet scale. Six conflicts resolved; stations in
  low orbit at 1.2 home radii; autopilot parks at a station within 2 ship lengths and under 4 ship lengths/s; no
  engines-off orbiting beside a station; paths shrink a planet's clearance when a station inside it is the start or end
  (they flew through the planet before); "Magaclite" (JPL's own spelling) corrected to Megaclite. Stopped there by the
  ruling; god-armour built its branch on this commit.
- **Systems** (afc25ce, then later commits), `src/lib/station/`, pure, 38 tests: the hardpoint seam (`mounts.ts`, the
  shape god-armour adopted), per-world profiles themed on each planet's god (temple, boon, arsenal guns and shield,
  market, power, doctrine), tiers and development, the power budget, market prices, contributions to planets' four
  meters, sections and mounts on arsenal's `applyHit`, the alert ladder, line of sight, fire orders, the fighter screen,
  cruisers and the capital ship, the patrol call (fleet command's `defend` in shape), sister stations, cover occluders
  for enemy-ai, and `mountState`/`shieldUp` for god-armour. `munitions.ts` and `shields.ts` are arsenal's ad6576a,
  byte-identical (same blob ids), so they merge cleanly.
- **In the scene** (`components/stationDefense.ts`, station screen): proved in the in-app browser on port 5331 against
  Mars Station 1 (STATIONS.md section 8): engaged within 7 s of the first hit, docking refused, market shut, Mars
  Station 2 raised, Mars patrol called (6 ships each); guns shot off and rebuilt in 240 s; structure damaged and mended
  after 45 s; stood down 90 s after the last hit and all 12 fighters flew home and docked. Station layer 0.75 ms a frame.
- **On god-armour's real hardpoints** (throwaway trial merge of af55314): the seam works unchanged. It found two things,
  both handled: reactors had to scale with the hardpoint count, and a two-provocation station (Venus) never engaged.
- `tsc -b`, `vitest run --dir src` and `npm run build` pass after the last edit.

### Broken / not verified
- The player cannot die: at 0 hull nothing happens and stations keep firing. A stationary player 130 units off Mars
  Station 1 reached 0 in about 9 s; one circling at 60 u/s took no turret hits in 26 s.
- Patrol calls are recorded, not flown (integration's patrols are on rails until fleet command and enemy-ai merge).
- Launched ships use the wingmen's steering on a leash; the capital ship holds its point and does not fire.
- Turret coverage on god-armour's structures is thin at the gates (Jupiter: no gun can reach a ship 200 units off a
  hangar mouth). Asked god-armour for a battery per gate.
- No cargo hold, so the market shows prices but nothing trades. Meters are computed but not fed to planets.
- Docking (autopilot, L, save and reload while docked) was not re-proved after the step-0 merge; handed to god-armour.

### Next
1. Caleb: should a foreign station hold fire until attacked (as built) or shoot on sight at war?
2. Merge god-armour's branch and swap `provisionalMounts` for `hardpointsOf(home)`; one run per world.
3. With enemy-ai and fleet command: launched ships on `fighterThink`/`warshipThink`, the patrol call flown by `stepFleet`.
4. Conquest: production fills hangars, capture by section, live power richness.
## 2026-10-18 — graphics overhaul (thread graphics, branch claude/graphics-e638ff, from main 9e4d39d)

### Done
- Audit first (`GRAPHICS-AUDIT.md`): six true frames of main (start, Mars, Sun, Saturn, the stars, a fight), read off
  the canvas with `toDataURL` in the same task as a forced render (`scripts/shots.js`, receiver on :5309).
- Built `src/components/fx/`: baked nebula sky and reflections, scattering atmospheres, corona, cinematic post (god
  rays, flare, chromatic aberration at boost, grading, vignette), particles, ribbon engine trails, speed streaks,
  laser bolts, and `spawnImpact / spawnExplosion / spawnTrail / spawnShieldHit / spawnMuzzle`. Details in SPEC.md.
- Glass interface in `src/styles-glass.css` (overrides only).
- Flight checks, headless Chrome on the GPU: autopilot to Mars parked in 10 s, 0 collisions, 2.79 from the surface;
  grand tour parked at all ten stops in order (earth … edge) in 117 s, 0 collisions.
- `npx tsc -b` clean; `npx vitest run` 43/43; `npm run build` builds (the usual >500 kB chunk warning).

### Broken / not verified
- **Not felt.** Whether it looks the way Caleb wants is his call. Frames are in `shots/`.
- **Frame times are noisy**: the machine was busy with other sessions; ranges in GRAPHICS-AUDIT.md. No real phone.
- The in-app pane screenshots crop an emulated viewport and, hidden, throttle timers; HUD shots and after frames came
  from headless Chrome (`scripts/hudshot.mjs`, `scripts/cdp.mjs`).
- Explosion shockwave rings are flat discs in a random plane; seen nearly edge-on they read as a thin bar.
- Battery saver still draws the crystal shells and the corona.

### Merge notes
- Hooks: `Voyage.tsx` (import `* as FX`, `createGraphics` after the ship, `gfx.update` after `world.update`,
  `gfx.dispose`, dev hook adds `composer`, `gfx`, `fx`); `voyageScene.ts` (lights, atmospheres, corona, orbit lines,
  shells, removed point-dust and Milky Way mesh); `materials.ts` (`NOISE` exported, Sun surface, the lighting lines
  at the end of the surface shader, crystal shader back-side and near-fade, plume); `ship.ts` (`nozzles`, materials);
  `combat.ts` (bolt look, muzzle, impacts, missile smoke, explosion on kill); `main.tsx` (one import).
- Planet scale: all new shaders carry the logdepthbuf chunks and size from the body radius and mesh scale.
- Ship types: `Ship.nozzles` feeds the trails; new models can return their own.

## god-armour (2026-10-19, `claude/god-armour-ac30e6`)

Caleb's ruling: "huge space stations that almost look like armor covering the planet, themed after each god that the
planet represents." This thread owns the station's body; the stations thread owns its systems. Built on stations'
merge of stations-moons onto planet scale (24ee3a0), not a second merge.

### Done
- **GOD-ARMOUR.md**: per world the god, attributes and iconography with Greek and Roman sources (Hesiod, the Homeric
  Hymns, the Iliad and Odyssey, Ovid's Fasti, Livy, Plutarch, Macrobius, Gellius; the Ara Pacis, the Pompeii shell
  fresco, the Met's Selene sarcophagus), the form, shell radii, thickness and measured coverage. No astrology. Clashes
  with the art direction flagged for Caleb (Mercury's Spartan look against Hermes; Saturn's owl eye; the Moon's Delphi).
- **The seven structures** (`src/lib/megastructure/armour.ts`): one grid and mask per world draws the plates and
  answers collision, so what you see is what you hit. Vault of Gaia 66% coverage, Selene's Veil 37%, Kerykeion 35%,
  Shell of Aphrodite 41%, Ancile 37%, Talons of Zeus 41%, Harpe 33%. Shells at 1.068–1.20 R, above the air (atmo-flight's
  tops), Saturn's under its rings. Fixed to the planet (not turning), so hardpoints never move.
- **`hardpoints.ts`** (the stations interface, published at af55314; note `god-armour-hardpoints.md`): 133–165 typed
  mounts per world with world position, normal, size, section; berths keep the `stn-*` ids; sections for conquest;
  `sectionAt`, `berthOf`, `mooringOf`, `gatePoint`, `sees`. Every gate (berth approach, hangar launch point) has its
  own battery of 6 turrets and 4 point-defence mounts in range and in sight (stations' request). 6 test cases.
- **Scene** (`components/armourScene.ts`, replaces `stationScene.ts`): instanced chamfered plates with procedural
  panel seams, tones and night-side windows (patched built-in material, log depth intact), split into 48 direction
  chunks (24 on Battery saver) culled by frustum and the planet's horizon; mounts, berth cradles, approach beacons and
  moored capital ships merged into two meshes per world; names and berth labels. Battery saver uses a coarser grid.
- **Flight** (`Voyage.tsx`): berths as destinations at their approach points; slow final approach (`nav.ts minSpeed`);
  the autopilot docks itself on arriving; L docks within 14 ship lengths; docking run to the cradle; save and load while
  docked. Plates and mounts collide (from either side). The speed limit sees the shell. Paths never shrink a world's
  clearance into its armour (`DestGeo.shell`), detour points near armour are reached, not cut; the autopilot climbs off
  the plating (or out through a window from under it) before its path; Enter goes down through a window.
- **Merged**: stations' 24ee3a0 (stations-moons on planet scale, Megaclite checked against JPL: JPL's table spells it
  Magaclite; the IAU name, used, is Megaclite).

### Proved in the in-app browser (port 5341, `window.__voyage`, `scripts/armourtest.js`; frames in `shots/armour/`)
- Every structure from approach distance and close in: `shots/armour/<world>-approach.jpg`, `<world>-close.jpg`.
- **Autopilot docking on all seven worlds**, from parked off the far side: docked by itself in 18.4–21.8 s, in the
  cradle (1.4 ship lengths over the pad), **0 armour hits**, closest pass 14.8–25.5 ship lengths over the plating
  (`<world>-docking.jpg`). Every other berth from both sides (24 approaches): 24 docked, 0 hits.
- **Hand docking**: flown on the keys to Ancile Berth 2 (13.4 s), the L prompt came up, docked by L, 0 hits
  (`hand-reach.jpg`).
- **Ramming** the plating at full throttle on all seven: the ship stops on the plate top every time (lowest point
  never under the plating's top).
- **Grand tour** from parked off Earth (Moon … Stars and back to Earth, 9 legs): all parked, 0 armour hits, 0 contacts,
  0 surface hits. Starting instead on Saturn's plating after the ram: 2 pushes over 0.02 ship lengths and 50 resting
  contacts while lifting off, then clean; a second lift-off from the same plating toward Mars: 0 and 0.
- **Save → reload → Continue while docked** (Talons of Zeus Berth 2): IndexedDB holds `docked: "stn-jupiter-2"`; after
  reload, Continue lands docked, 1.4 ship lengths over the cradle, station screen up. Undock: at the approach point, 0 hits.
- **Frame time**, structure filling the view (960×540, frames forced to finish; hidden pane, so absolute times are
  noisy): High, Earth 7.8 ms with armour vs 13.3 without (noise), Mars 9.7 vs 7.5, Jupiter 7.5 vs 12.3, Saturn 13.9 vs
  7.5; the armour adds 70–100k triangles and 8–16 draw calls (Earth 12.4k plates drawn of 27k). Battery saver: 1.8k–3.8k
  plates drawn, +1 to +6 ms over the same view without armour.
- `npx tsc -b`, `npx vitest run --dir src` (12 files, 123 tests) and `npm run build` pass after the last edit.

### Broken / not verified
- **Nobody has flown it by hand on a real screen**; the pane was hidden and every flight was driven through `__voyage`.
- **Frame times** come from a hidden pane: treat them as relative only. No phone measured.
- **Venus from afar** reads a little like a striped melon: the shell's fluting needs a better rim and hinge.
- Plates are flat chamfered boxes with shader panels; up close they are clean blocks, no greebles or modelled detail.
  The god shows in the large shape (mask) and colour, not yet in sculpted detail (no eagle heads on the talons, no
  carved reliefs).
- Mount states (alive, wrecked, shield down) from the stations thread are not yet drawn.
- The scripted Enter descent and docking run ignore collision by design (they follow a cleared line).
- While docked the HUD still offers "Enter <planet>" (from before this thread; not touched).
- The moored capital ships and housed ships are stand-ins, not the nations' models from art direction.

### Next
- Merge order: this branch carries stations' 24ee3a0, so take it before or with `claude/stations-1c393c`.
- Draw stations' `mountState` (dark or wrecked mounts, a section's shield) and conquest's captured sections.
- Swap the stand-in capital ships for `styles/*` models when art direction is merged.
- A modelled detail pass per god (talon tips, the ancile's bosses, the shell's hinge) once Caleb has seen the shapes.
## game-start (2026-10-19) — `claude/game-start-995619`

Caleb: "a start of the game thread that completely looks over the current beginning where you pick your starting
faction … customize your avatar character … your first ship … level 1 tools … a small tutorial … launching you at a
goal." The rules are in SPEC.md, "The opening".

### Brought in (my branch only)
- `claude/practical-shamir-f7a67a` merged: every nation's ship styles and ART-DIRECTION.md (the cruiser is the first
  ship).
- `claude/races-depth` merged: PEOPLES, the codex and its procedural portraits and emblems. Conflicts in GameView,
  SPEC.md and styles.css resolved; the codex buttons are kept in both menus.
- `claude/god-armour-ac30e6` (961f434) merged: berths, L to dock and the station screen's repair, which the dock and
  repair lessons need. Its worktree had uncommitted work; only the commit came over.
- Not merged: arsenal, because it rewrites combat.ts and its module table still disagrees with progression's. The
  opening uses progression's tier-1 modules, as the game does today. Graphics' glass look is copied into
  `src/opening.css`, scoped to the opening, the coach, the launch card, the goal line and the title menu. It is not
  merged.

### Done
- New game → People → Pilot → Ship → shakedown flight → launch card → flying at the first goal. Files:
  `components/opening/` (NewGame, FactionStep, PilotStep, ShipStep, ShipViewer, Shakedown, GoalUi), `lib/opening/`
  (profile, fit, tutorial, goal, 13 tests), `space/pilotShip.ts`, `opening.css`.
- Save: `GameData.pilot`, `.tutorial` and `.goal`, all migrated. An old save has none of them and gets no tutorial.
- Seams in other files: `Voyage.tsx` (VoyageApi probe, setTarget, flyTo, setHull, drill, holdStation; the player's
  model; drill labels in the HUD), `combat.ts` (drill buoys: `addDrill`, `clearDrill`, `drillLeft`; they pay nothing),
  `Portrait.tsx` (an optional look), `PilotHud.tsx` (portrait and ship name), `GameView.tsx`, `App.tsx` (onPatch) and
  `store.ts`. `StartScreen.tsx` is removed; the opening replaces it.
- **Fixed in progression**: `homeSpawn` returned a position already at planet scale but with no `scale`, so Voyage
  scaled it again and every non-Earth new game started at the edge of the system (the ship at x 238,650 with Mars at
  148,000). It now carries `scale: COSMOS`, and the Mars start is 554 from Mars's centre, outside its armour.
- **Played cold in the in-app browser**, with real clicks and keys where the pane allowed:
  - Earth, desktop 1280×800: all 11 steps. Reload on step 4 → Continue → same step, same pilot and ship. Docked at
    Vault of Gaia · Berth 1, hull 72 → Repair → 100, undocked, launch card, Set course for Mars. Reload after launch →
    no tutorial, goal line kept. A Quirite kill counted 1/3; a Nephelan kill did not.
  - Mars, phone 375×812 (touch): every screen; throttle by dragging the bar, steer by thumb, tap Stop, the Fire button,
    the weapon button, ◎ Nav and its tabs, Auto. Docking at Ancile stalled (below) → Skip this step → launch card →
    I'll fly myself. The three screens took 41 s.
  - Saturn, desktop: a fit with no missile (9 steps). Docked at Harpe · Berth 1 after 16 s of autopilot, repaired,
    undocked with Esc, launch → Set course for Jupiter. The screens took 58 s.
  - Earth, phone: renamed the ship (an empty name is blocked with "Your ship needs a name."), Skip tutorial → launch
    in 45 s. Reload → Continue → no tutorial, goal kept.
- `npx tsc -b`, `npx vitest run --dir src` (198 tests) and `npm run build` pass after the last edit.

### How the proof was taken
- The pane drew about 3 frames a second (software WebGL), so game time crawled. Inputs were real where possible:
  clicks, taps, keys, mouse hover and drags. Where an input had to be held and could not be held at 3 fps, the same
  handler was driven from the console: Shift down and up for Boost, pointerdown and pointerup on the canvas or the Fire
  button, the touch joystick's stick, and `__voyage.run` to step frames. Laser and lock aiming were closed by script
  (nose or stick onto the lead).
- Time from New game to launch for a real player is an estimate: about 40–60 s of screens (measured), plus 2–4 min of
  shakedown at 60 fps. Throttle, steer, boost and G take seconds; laser and lock 10–30 s each; the autopilot to the
  berth took 6–16 s of flight (measured). With Skip tutorial: 45 s (measured).

### Broken / not verified
- **Mars docking**: the autopilot to Ancile · Berth 1 took the ship under the armour plating (216 from Mars's centre,
  shell 226), where it crawled at 0.5 u/s, 22–32 short of the approach point. Earth and Saturn docked. Written to
  god-armour in `game-start-to-god-armour.md`. The tutorial's Skip this step gets past it.
- A boost at 1,500 u/s near Mars dived the ship onto the surface under the plating, and climbing out at the
  near-surface speed limit is very slow. Same note.
- Bolts do not inherit an orbit's motion. Round Saturn an idle ship orbits at about 1,240 u/s, faster than a bolt. The
  drill now holds the ship on station, but a real fight while orbiting a giant has the same problem (for arsenal and
  enemy-ai).
- Arrival cards open over the start view at Mars and Saturn, because the ship begins in orbit. A phone player has to
  close the card first.
- Nobody has seen it at 60 fps yet: the feel of each lesson, the coach's timing, the hangar's turn speed.
- Mars has no headwear choice (races-depth draws none for Mars); its dress choice recolours the cloak over the armour.

### Next
- Motivation answers `firstGoal(nation)` (see `game-start-to-motivation.md`); the stand-in's text and target move
  there.
- God-armour fixes the Mars approach; then re-run the Mars shakedown without Skip this step.
- When graphics merges its glass look, `opening.css` can drop its copied tokens.
- At Caleb's first playtest, watch whether 11 steps feel like too many. The cheapest cut is merging steer and boost.

## 2026-10-20 graphics-pass (branch claude/graphics-pass, from integration-3 91bf274)

A full visual look-over, then fixes, worst first. Report: `GRAPHICS-PASS.md` (15 ranked findings). Frames:
`shots/graphics-pass/` (83 before, 61 after, pairs in `sheets/cmp-*.jpg`), taken by `scripts/gp.mjs` + `gpscenes.js`
in headless Chrome on the real GPU against this worktree's dev server (:5410).

### Done (each with a before/after pair)
- The eleven major moons are painted (one shader branch, a look per moon) instead of flat balls.
- God rays and lens flare no longer fire with the Sun behind the camera (it washed the Mercury, Venus, Saturn and
  Earth station views white).
- Site names are sized right and hidden on the far side of the world (they piled up over every home world).
- Mars: separate scuta with lit slits between, heavier gold; the surface butterscotch and rust with dark ground.
- Jupiter: the spires are violet blades with a gold edge again, not neon pillars.
- Venus: the sunward disc no longer burns white.
- Ring lines fade when seen edge-on.
- The seven race heads are painted Gemini portraits (same display size, 3× pixels); the title key art is in
  `public/art`, not wired. Run through Claude in Chrome; record in `GEMINI-PROMPTS.md`.

### Open
- Inside the gas giants and Venus: a flat fog (#8). Moon and Venus armour too close in colour to their worlds (#9).
  Fleet hulls dim at range (#10).
- Screen session: the letterboxed flight view (#13), the title (#12), the hangar backdrop (#11), the docked panel.
- Not seen: boarders (no launcher reachable in this build), Mars low flight, drone swarm look, a phone.
- Gemini refused any attached image on 2026-10-20; prompts went text-only. Re-test costs one chat.

### Checks
tsc -b clean · vitest 586 in 43 files pass · vite build passes. Not merged, not pushed.

## 2026-10-20 graphics-pass-2 (branch claude/graphics-pass-2, from claude/graphics-pass 34b5863)

The three items GRAPHICS-PASS.md left open, each with a before/after pair (`shots/graphics-pass/p2before-*`,
`p2after-*`, sheets `sheets/cmp2-*.jpg`), taken with `scripts/gp.mjs` against this worktree's dev server (:5412,
`ascent-graphics-pass-2` in Desktop launch.json). gp.mjs now writes under its own worktree (ROOT from the script's
path) and takes SAYLEN to print long scene info.

### Done
- #8 Inside Jupiter, Saturn and Venus: three cloud shells per body drawn in the sky dome, banded from each planet's
  colours, shaded by depth and by the layers above; the Sun a softened disc and halo in thick air. The mesh decks and
  the giant's own globe (an opaque floor a few units under the ship, painted flat by the haze) hide once the sky
  closes in. New scenes `sky-<jupiter|saturn|venus>-<up|down>` look through the layers without the HUD.
- #9 Moon armour: deep-blue seams (new optional `ArtStyle.seam`), pale-gold meander on silver, a second meander band.
  Venus armour: gold ribs with emerald enamel between.
- #10 Fleet: `liven()` in fleet.ts on every styled and destroyer template: env at least 0.7, dark hulls lifted toward
  the nation's colour, running lights in the nation's hue along spine and keel. Fallback materials: 35% tint, env 0.7.

### Not done / notes
- The `ladder-*` scene frames Earth's station rather than the ladder (pre-existing); the duel frames carry #10.
- In the HUD frames the 3D view is still the letterboxed card with the planet card over it (screen session's #13).
- No frame-time measurement; the dome adds up to six fbm4 calls a pixel inside Venus and the giants only.

### Checks
tsc -b clean · vitest 586 in 43 files pass · vite build passes. Not merged, not pushed.
## 2026-10-20 — wave-a-screen: GP-04 and player notes 5 (branch claude/wave-a-screen, from integration-3 91bf274)

### What changed
- **The tutorial names the keys that bindings.ts binds.** Each lesson's text holds `{action}` tokens that `howTo()` fills
  from the player's own binds (`lib/opening/tutorial.ts`). A rebind changes the lesson. A test fails if a lesson
  writes a key by hand or names an action that doesn't exist. Fixed per the GAMEPLAY.md corrections table: boost is
  Ctrl (or double-tap W), weapon is 2 (F swaps), nav is M and then the tabs, autopilot is G, docking is Enter. The
  lock lesson was impossible as written: a lock only builds while right click is held. It now says to hold right click
  and let go. The launch card said Space for the autopilot; it now reads the bind as well.
- **New step 7, "Your drones":** 5 picks the 16 drones and right click launches them. The step passes when drones
  are flying (`FlightProbe.dronesOut`). On touch, tapping the picked utility slot again uses it, because touch has no
  right button.
- **Locked hotbar slots read as rewards.** `slotGate()` (`controls/hotbarSlots.ts`) uses today's gates: Gun 3 →
  Destroyer, Gun 4 → Capital, Fighters → Lv 2, Infantry → Lv 3, Repair → Soon, Counter → Shipyard. A slot shows a
  dashed frame, a lock and its tag, and the tooltip says the full line. When a slot opens it pulses once with
  "Fighters open: press 6". GP-05's rung list should replace `slotGate`'s body when it lands; the signature can stay.
- **The flight view fills the window by default** (`.flight-wrap` is fixed, inset 0). "Full" now only asks the
  browser for full screen. The title frame fills the window too; it had kept 176 px for a header that's gone.
- **Panels:** the coach sits above the hotbar row, not on it. The minimap moved below the speed readout, which had
  been drawn behind it. The planet card is a 300 px column under the minimap (it was 400 px from the top, over the
  conquest box), and the conquest box hides while the card is open. On a phone the flight buttons stand above the
  hotbar instead of on its right half, and the goal pill moves under the pilot card.
- **Navy count:** `navyLine()` lists every ship type. Mars reads "8 ships: 1 capital ship, 2 cruisers, 4 fighters,
  1 destroyer" (it said 7 and left out the destroyer).
- Pilot screen: removed the painted head under the portrait (a different face from the pilot, and clicking it did
  nothing). Title: "Working title" removed.

### Proof
- One tutorial run, start to finish, at 1024x768 with frames driven by `__voyage.run`. Each step was passed by doing
  what its text says: W held; mouse turn; Ctrl held; X, then left click only while the cross was green (2 hits);
  2; right click held to LOCKED and released; 5 + right click (2 explosive drones out); M + Computer + Route tabs; G;
  Enter in reach of the berth; Repair (72 → 100); Undock. That reached 12 of 12 and the launch card. Aiming was done
  by script: the nose was put on one drill target or on the lead.
- shots/: `screen-flight-1024x768-*`, `screen-flight-1920x1080`, `screen-tutorial-07-drones-1024x768`,
  `screen-hotbar-fighters-open-pulse`, `screen-mars-panel-1024x768`, `screen-mars-panel-375`, `screen-title-*`,
  `screen-pilot-no-dead-box`. At 375x812, `scrollWidth` is 375.
- tsc clean, vitest 44 files / 589 tests, build OK.

### Not done / for others
- The in-flight and launch-card portrait is a painted head of the nation (`PilotHead`), not the pilot the player made:
  Amara Okafor shows a man's face. It belongs to the art thread, not here.
- At level 2 the fighter slot opens, but in my run it said "none in the bay" because I set XP by hand. A real
  level-up through `progress.ts` should hand over the fighter. Not checked.
- GP-04's "a slot shows only once its rung is open" (hide slot 5 until rung 3) waits on GP-05. Drones are open at
  level 1 in code today, so the tutorial teaches them.
- Holding Ctrl to boost while pressing W hits the browser's Ctrl+W (close tab) in a normal window. The lesson offers
  double-tap W as well, but the default boost bind should probably move off Control. That is Caleb's call.
## 2026-10-20 eve-controls, step 1: E1 + E2 + E3 (branch claude/eve-controls, from claude/graphics-pass 34b5863)

Brief: `Work\PROMPT-eve-controls.md`. Caleb, after playing mc-controls: "I want the hotkeys to be like that, not the
controls. I want the Eve controls." This step takes the mouse off the ship. The Minecraft keys all stay where they were.

### Done
- **E1, the mouse never turns the ship.** `controls/pointer.ts` deleted: no pointer lock, no mouse look, no "click to
  take the controls". The cursor is an ordinary arrow. Alt is no longer freelook: hold it and the camera swings back
  behind the nose (same action id, `freelook`, so the binds table and wave-a-screen's tutorial tokens still resolve).
  `aim.ts` lost `mouseToLook`, `freeLook`, `freeReturn` and their constants; what is left steers to a held heading.
  Settings: `look` (mouse sensitivity) is now the camera drag sensitivity, `invert` flips the drag and the arrows; old
  saves keep their values, no migration needed (fields unchanged, labels changed).
- **E2, orbit camera** (`controls/eve.ts`). Left-drag on empty space orbits the camera round the ship, π/900 rad per
  pixel at sensitivity 1; it stays put in the world while the ship turns (it does turn with the idle orbit round a
  body, as before). Pitch held within ±1.45 rad. Zoom: right button + wheel, or + / − (new actions `zoomIn`, `zoomOut`,
  Equal and Minus), 0.4× to 25× the chase distance, 1.15× a notch. The plain wheel stays on the hotbar. F5: orbit,
  cockpit, rear (the cockpit and rear view look along the nose now, not along the old aim). Touch still trails the nose.
- **E3, double-click in space to fly.** The ship turns toward the clicked direction at its own rates (the capital
  ship's 0.35×) with the old aim law (gain 8, lead 0.2 s) and holds it. From a stop the throttle opens to **0.3 (about
  15 u/s), not full**: full is 74,000 u/s and leaves any fight in a second. Moving, the throttle stays. A stance or the
  autopilot is called off. A ring marks the click for 1.1 s and a dot marks the held heading until the nose is within
  2° of it. W/S, strafe, dodge and boost work on top. Arrows still turn by hand; let go and the ship holds that heading.
- Interim until E4/E6: the guns and the missile lock follow the nose (the reticle sits on the nose's screen point);
  holding the left button still for 0.2 s fires, a quick click does nothing yet (E4 makes it select), a drag never
  fires. Right click (shield, bow draw, deploy, dock) and middle click (pick) are unchanged.
- `codeOf` now maps printed punctuation (= + - _ [ ] ; ' , . / \ `) when a key event carries no code: the in-app
  browser sends `=` and `-` that way, as it does Space.

### Proved
- In the in-app browser on :5433, by hand (real input): hover moves over the view (turn rate stayed at 0, max 5e-15);
  a left-drag (camera yaw +0.36 rad, pitch −0.18 rad, ship turn rate 0, no shot); + ×3 then − (zoom 1 → 0.658 → 0.756);
  a double-click on empty space (throttle 0 → 0.3, ring and heading dot drawn: `shots/eve-e3-double-click-marker.jpg`);
  F5 cycling; Esc opening the menu.
- Synthetic (dispatched events and `__voyage.run`): 40 and 60 mouse moves with movementX/Y (heading error 0, the ship's
  yaw relative to the camera unchanged); a 1.41 rad double-click turn converging 0.96, 0.36, 0.05, 0.006, 0 rad at
  0.5 s steps and stopping; throttle kept at 0.55 when moving; stance and autopilot cleared; strafe 6 u/s on top;
  arrows turning 0.98 rad in 1 s and holding after release; left button held 0.37 s fires, 0.12 s does not, a drag
  does not; right button + 4 notches zooms 1 → 1.75; the plain wheel still moves the hotbar.
- Unit tests: `controls/eve.test.ts` (orbit drag, offset, zoom range, double-click timing, throttle rule, heading
  convergence, capital slower), `bindings.test.ts` (punctuation fallback, zoom binds).
- Not tested: a touch screen and a gamepad (code paths kept; not driven).

### Collisions expected with claude/wave-a-screen (not merged)
- `Voyage.tsx`: separate hunks (theirs: hotbar gate, `pickSlot`, `dronesOut`; mine: pointer, camera, mouse, hint).
  `styles.css`: their `.flight-wrap` removal is three lines above my `.voyage-canvas canvas` cursor change.
- Tutorial text now wrong in both versions: "steer" (point with the mouse, the ship follows the cursor) and "laser"
  (put the small cross on the diamond with the mouse; left click to fire, now hold it).

### Checks
tsc -b clean · vitest 591 in 44 files pass · vite build passes. Not merged, not pushed.

## 2026-10-21 scale-jump-danger: ships ×5 smaller, a hyperspace jump, foreign space that fights (branch claude/scale-jump-danger, from claude/integration-4 2234b7d)

Brief: `PROMPT-scale-jump-danger.md`. Commits: S1-S3 `0fecac2`, J1-J3 `3238fa0`, D1-D3 `0301ef1`.

### S1. Ships ×5 smaller (done, 0fecac2)
`bodies.ts` `KM_PER_UNIT = 0.04 / 0.3708`: cruiser 40 m, capital 200 m, fighter 8 m. Every body, orbit, the armour,
berths, sites, terrain and air stay true in km (×5 in units); ships, weapons, combat ranges, the camera and docking
keep their units. SPEC.md has a "Ships ×5 smaller" section. `art-refit/03-SHIPS.md` (untracked, main checkout) has a
dated note: in game the lengths are ÷5; the image prompts still say the old metres and need ÷5 before the next sheet.

### S2. What follows (done, 0fecac2)
Derived from `KM_PER_UNIT` and so already ×5: `COSMOS` 5,906 → 29,530 (near-body multiplier: arrive/stop/clear,
orbit zones, `AUTO` speeds, `parkSlack`, `MAX_CRUISE`, patrol altitudes, surface margins), `AU` 2.77e8 → 1.387e9,
`HILL`, body radii (Earth 11,812 → 59,059), armour frames and shell/top (Earth shell 20,317 → 101,583; top 13,290 →
66,443), berths (placed by `frame.rOut` + ship lengths), sites, terrain LOD (angular), log-depth far plane
(`1.2 × FARTHEST`, about 2.2e10), the edge and the stars waypoint, the nav map and minimap (log by AU/HILL).

Hard-coded world distances found (audit) and changed:

| Constant | Old | New | Why |
|---|---|---|---|
| `voyageScene.ts` `SKY_R` | 1e6 | `170 × COSMOS` (5.0e6) | stars drew over Jupiter and Saturn from their parking points |
| `Voyage.tsx` armour entry speed cap | 6,000 | `COSMOS` | the entry path is a world distance; 5× slower otherwise |
| `Voyage.tsx` stance distance max | 1e6 | `170 × COSMOS` | the Sun's default stance distance passed the cap |
| `conquest.ts` near-site radius | 4,000 | `0.7 × COSMOS` | labels and hits on sites near the ship |
| `station/navy.ts` `callReach` | 4,000 | `0.7 × COSMOS` | station to patrol ring is a world distance |

Left as ship-scale on purpose: station sensor 1,500 and gun ranges, `DEFENDER.leash`, `aiKnobs` (×k), the drill
range, `HYPER.massLock`. Left and noted (feel changes, not breaks): air speeds against a 5× deeper atmosphere,
infantry carrier speed 45 against 5× longer legs, `SITE_RULES.contest` 1,000, `BATTERY.reach` 400 against 5× wider
cells, `controls/stance.ts` `orbitMax` 400 (eve-controls' file: orbiting a body by stance is 5× slower).
Saves: `migratePos(pos, scale)` (×5 about Earth's centre, which is ×5 from every body's centre since all of them
scale about it); infantry carriers now carry `scale`. A save written at the old scale on this branch's dev server
loaded 6.004 → 6.0075 Earth radii out (it was orbiting); unit tests on five bodies.

### S3. Frame cost (done)
Same body-relative pose, camera on the body, `__voyage.perf(60)`, old scale vs new:

| Place | calls before → after | triangles before → after | systems ms |
|---|---|---|---|
| Earth arrival point | 260 → 260 | 171,687 → 171,687 | 1.4–1.9 → 0.9 |
| Jupiter parking point | 241 → 241 | 443,331 → 443,331 | 1.1 → 1.0 |
| Over Earth's armour (1% R up) | 272 → 290 | 527,779 → 386,977 | 1.5 → 1.1 |

No blow-up: the armour grid is angular, so plates got 5× wider, not 25× more numerous; terrain levels are capped at
16. Shots `01-earth-arrival-before-S1.jpg`, `02-earth-arrival-after-S1.jpg`.

### J1-J3. Hyperspace (done, 3238fa0)
J (bindings `hyperspace`, keybinds page "Ship and fleet"), the HUD's ⟫ Jump button (touch), or the autopilot on any
leg whose body is outside the space you are in. Spool 1.0 s, tunnel 1.6–2.3 s (+0.2 s a decade), exit 0.5 s: 3.8 s
planned to Mars or Saturn, 3.2 s to the Moon. The clock is measured from the jump's first frame, so a stalled frame is
absorbed. Measured real time in the in-app browser: **Earth→Mars 3.80 s and 4.26 s; Earth→Saturn 4.71 s and 3.82 s**
(the slow ones absorbed this pane's ~1 s throttled frames; one earlier run at 4.95 s before the clock change).
Drop point (`lib/hyperspace.ts dropPoint`): over the plating top (set pieces tested point by point with a 3% R pad),
above the air, on the side you came from, outside every hostile's reach × 1.25 + 250 units; else the point of least
intrusion. Arrival altitudes: **Earth 863 km, Mars 1,663 km, Jupiter 9,790 km** (Saturn 78,325 km: its deck and
glass). Arrives stopped, facing the body, the camera behind the nose. Refuses (HUD line): missile lock, docked, in
air or inside a body, mass lock (an armed, weapons-free hostile within 6,000 units, 650 km), already in the body's
space. Autopilot long legs jump; legs inside a space cruise as before (the tutorial's berth leg is unchanged).
Shots `03-jump-mid-tunnel.jpg`, `04-jump-arrival-mars.jpg`.

### D1-D3. Foreign space (done, 0301ef1)
`lib/diplomacy/territory.ts`. A house's space is its home body's orbit zone. Passage: mean of both houses' regard
≥ 20 (the Friendly floor; no pair starts at Allied 60). Blood or Hostile: engaged at once. Else warned on the channel,
weapons free after **15 s** in the space or at once on a shot. Summoned fleets come out however far off and burn in
(`AI.transit`, in the player's frame); the parking orbit stands still with an engaged hostile within 8,000 units
(it was carrying the ship at 20 km/s low over Earth, which no fighter could follow).
**Why the stations were silent:** a hostile player only raised a station to wary, and wary turrets shoot only
missiles; it took a hit from the player to make one fight. Also every station not of the player's house was marked
hostile once, at creation. Now each frame the station reads its house's attitude: at war it fights on sight.
Proved in the browser: Jupiter pilot (new game, real clicks on the Earth chip and Jump) warned on arrival, weapons
free at 15.0 s, first hit 0.7 s later, destroyed in a few seconds; Mars pilot at Earth weapons free on the first
frame, first hit 8.9 s later; Earth pilot at the Moon: passage, no warning, Moon fleet holding, hull untouched;
an Earth berth engaged a Mars ship unprovoked and hit it 12 of 12 at 40 units. Shot `05-jupiter-ship-under-fire-at-earth.jpg`.

### Hand vs synthetic
By hand (real clicks): menus, new game as Jupiter, the Earth chip that engaged the autopilot jump. Synthetic: J and G
as dispatched KeyboardEvents, `__voyage.run` stepping (the pane was hidden or throttled), teleports for the mass lock
and the berth test, a forced `threat.locked` for the missile-lock refusal.

### Not done / follow-ups
- `controls/stance.ts` `orbitMax` 400 should become world-scaled (eve-controls' file).
- Air flight, carriers and the stance orbit now take about 5× longer over the same bodies; balance call.
- Earth from 863 km looking straight down is mostly cloud white; it reads as a white screen until you turn.

### Checks
tsc -b clean · vitest 650 in 50 files pass · vite build passes. Not merged, not pushed.

## 2026-10-21 integration-5: the first fight can be won (branch claude/integration-5, from claude/integration-4 e16c690)

Asked: "organize everything into the game and truly make it a good game." Played integration-4 cold as a new Earth
pilot (dev build, `__voyage.run` stepping; the pane was hidden). Wave A's log already said it: "the first raid was never
won with aimed fire". Measured why, and fixed the five things in the way, in the order they were found.

| # | What was wrong (measured) | Fix |
|---|---|---|
| 1 | The raid fizzled: the idle parking orbit carried the ship 13,700 units in the first second, past the 8,000-unit `fightNear` check, so the orbit spun back up and the raiders fell 150,000 units behind and went home at 8 s. Hull never touched. | `fightNear` counts any live raider at any range; a fight zeroes `orbitK` at once instead of easing it out. Now a passive pilot dies in 26 s. |
| 2 | Guns fired only along the nose (E6 never built), and a cruiser turning 0.9 rad/s can't hold a 2.4 rad/s fighter on its nose. | E4 + E6 (first form): a left click selects the ship under the cursor (same pick the stances and overview use). A selected ship inside a 60° arc (`EVE.gunArc`) and 1.2x weapon range is the guns' target: they fire at its lead, and the missile lock builds on it without the bow-draw. Out of arc the reticle greys (`inArc`). |
| 3 | The first raid sent level-3 Martian fighters (capacitor shields, 15/s regen) at a level-1 pilot. | The first raid only flies level-1 fits (`combat.raid(..., level)`, `craftArms(..., level)`). Later raids are unchanged. |
| 4 | After a death the ship respawned at distance 0 from its station: every shot started inside the station body and was deleted the same frame. | Respawn clear of the station along its berth's outward line (`clearOf`). |
| 5 | Shots couldn't land on a fighter after the x5 shrink: body 0.17 units; homing let go at 22 units; 24/24 seekers missed; tracked bolts missed by a median 12 units because fighters fly constant 2.4 rad/s turns. | Player shots: proximity fuse 0.5 (`FUSE_R`), missiles fuse 1.5 and let go at 6 units (`MISSILE_FUSE`, `PLAYER_LET_GO`; the dodge roll is kept, per Caleb's ruling); the lead solves for acceleration (`trackedGun`); bolts fired at the active target bend toward it at up to 4 rad/s (`GUIDE_TURN`, fire control). |

**Result, the director's real first raid, wiped save, Earth, tutorial skipped:** raid at 34 s; pilot selects the
nearest raider, holds fire and re-points the ship once a second: kills at 4.7 s and 12.2 s, 15 hits in 74 shots,
"GOAL COMPLETE Beat off the Quirite raid 2/2", +30 XP, ₡100 → ₡120. Before: 10 hits in 319 shots, both fighters at full
hull, pilot dead twice.

**Not done / for others:** E5 (context menu), E7, E8 and the lock icon row from the E brief. Seekers still can't catch
a fighter in a turn (1.3 rad/s vs 2.4): that is the design (Caleb: "slight homing"); flak is the anti-fighter weapon.
The first raid may now be too gentle (the pilot took no damage in the winning run); Palamedes's call. Tutorial text
does not yet teach click-to-select. Not hand-flown with a real mouse.

### Checks
tsc -b clean · vitest 655 in 50 files pass (5 new: arc, lead on a circle) · eslint clean on the touched files.
## 2026-10-21 graphics-pass-3 (branch claude/graphics-pass-3-264f8a, from claude/integration-4 e16c690)

Look-over again on integration-4, same method as GRAPHICS-PASS.md; report `GRAPHICS-PASS-3.md` (10 ranked findings,
earlier FIXED items re-checked, handoffs). Dev server :5414, launch entry `ascent-graphics-pass-3`. Most of what
broke came from S1 (a scene unit is 108 m, not 540 m): anything tuned per unit.

### Fixed (pairs in shots/graphics-pass/sheets/cmp3-*.jpg)
- #1 Haze over the ground and the giants' decks per km, not per scene unit (`planetAir.ts` HAZE_PER_KM): the ground
  fogged out past 9 km since S1. `cmp3-haze.jpg`.
- #2 Armour plating adds finer plates as the camera closes in (`armourArt.ts` fineGrid, 16/64/256/1024 per pattern
  unit, faded in by pixel size): from a berth one panel filled the view as a flat polygon. Far views unchanged.
  `cmp3-berths.jpg`, `cmp3-berths2.jpg`.
- #3 Venus's night side: ember glow through the thin deck and gold and emerald cloud-city lamps (`materials.ts`). The
  hero face is on the night side on this build (probe: Sun dot −0.95). `cmp3-venus-night.jpg`.
- #4 Saturn's bands read, albedo ×0.64 (`materials.ts`): the disc burned to a plain cream ball. `cmp3-saturn.jpg`.

### Tooling
`gpscenes.js`: `airAt(id, alt)` poses the ship at a set height in the air (the timed dives never reached it at the new
scale; those frames kept as `p3dive-*`), `berth-<home>` stills (exact before/after), probes `probe-hero|close|duel`.
`gp.mjs` writes a scene's `dump` as JSON. New `scripts/gppair.py` (before|after rows).

### Open / handed off
Open, mine: fighter-duel framing (#6), plain ground in low flight and white haze from altitude (#7), Mercury hero
(#8), Iapetus pose (#9). Harness: the live fight frame now shows the player shot down by foreign space (#5).
Screen session: hangar backdrop and title key art (pass 1 #11, #12) unchanged. Gemini art (pilot heads):
graphics-pass-3 branch, <session>.

### Checks
tsc -b clean · vitest 650 in 50 files pass · vite build passes. Not merged, not pushed.

### integration-5 wrap-up (2026-10-21, on Caleb's wrap-up relayed by "Ascent game team coordination")
State: `claude/integration-5`. Not merged to master, not pushed.
- 999ae2b: the combat fixes (table above). Proved by numbers in the in-app browser (pane hidden, `__voyage.run`
  stepping, dev hooks), plus three screenshots of the raid card, the goal banner and the selected-target label. Not
  hand-flown with a real mouse.
- 0c8a858: merged `claude/specials-spawn` (619b1bf). Conflict in `space/fleet.ts`: specials kept, and so are graphics
  pass 2's `liven` and the destroyer colour.
- 3e0c55a: merged `claude/graphics-pass-3-264f8a` (7f7442e), clean.
- Checks on 3e0c55a: tsc clean · vitest 662 in 51 files pass · `npm run build` OK. Merged smoke: 7 capitals,
  14 cruisers, 28 fighters, 7 destroyers spawned; a level-1 raid of 2 fighters killed at 8.8 s and 11.5 s.

Left undone (one-line briefs):
- Merge `claude/one-look-per-people` @ 40d650f (3 files: opening/profile.ts, opening.test.ts, ART-DIRECTION.md). It
  was checked to be cut from integration-5, but not merged. Add to the merge checklist: no picture of a person whose
  skin is off the races.ts palette table.
- Merge `claude/look-unify` @ 4c6232f, now finished: 11 commits on top of the two already merged.
- Merge `wave-a-upgrades` (GP-03) once its session commits. It is on old base 91bf274, so expect conflicts in
  Shipyard.tsx, munitions.ts and progression/*.
- Merge `claude/eve-controls` @ cb412c2 (E4-E6 done; it never touched eve.ts). The conflicts are 4 hunks, all in
  Voyage.tsx. Its recipe: keep its lock step and `combat.setLock`; feed `trackedGun` the active locked craft (`actCraft`)
  in place of `gunTarget`'s selection, keeping the acceleration estimate and the guide id
  (`tracked.tracking && actCraft ? actCraft.id : undefined`); drop `selectAt` from the empty-space click (its `pickAt`
  handles objects first). One selection path, not two.
  gun) and eve.ts (`trackedGun`, `EVE.gunArc`) should be folded into its selection panel and locks, not duplicated.
- Tune the first raid: a pilot who fights back took no damage while winning. Palamedes: give the raiders a little bite.
- Teach click-to-select in the tutorial: the steer and laser steps don't mention it yet.
- Fast-forward master to the integration branch once Caleb has played it.
## 2026-10-21 eve-controls, steps 2-5: E4-E8 (branch claude/eve-controls, fast-forwarded to e16c690, then 4995ef5)

Caleb on E1-E3, 2026-10-21: "Ship feels much better now that the courser doesn't control direction." E4-E8 went ahead.

### Done
- **E4, select.** Left click on a ship, station, moon or planet selects it (`controls/targets.ts` `pickAlong`: ships within
  1.5× their radius or 0.03 rad of the click, else the nearest body or station the ray passes through). Middle click
  and the pick key select too (a key picks along the nose). The selected-item panel (`controls/SelectedPanel.tsx`,
  above the hotbar) shows name, class and nation, distance, velocity, lock state and the stance, with Approach, Orbit,
  Keep at range (the R stances and their distances), Lock / Unlock, Dock or Enter in reach, Fly to (a ship: turn to it
  as a double-click would; a body or station: the autopilot), Look at (the camera swings to put it behind the ship and
  follows it until the next drag), ✕.
- **E5, the context menu.** Right click on an object: the same actions at the cursor. On empty space the right button
  keeps the slot's own action (gun: shield block, proved held and let go; 5-9: deploy or recall).
- **E6, locks.** Ctrl+click a hostile ship, the panel's Lock, the menu, Ctrl+click an overview row, or C (new `lock`
  bind) on the selection. Up to **3** locks (`TARGETS.cap`), each building over the selected munition's lock time
  (`arsenal.lockTime`) while within the longest fitted lock range; out of range a building lock drains at LOCK.decay,
  a held one breaks; chaff (`arsenal.onLocked`) can break it as it completes. Locks show as icons top right; the first
  held is the active target; click an icon to make it active, click the active one to fire on it, right-click to
  unlock. **Fire:** the weapon in hand's number again switches it on at the active target until pressed again, the
  slot changes or the target is lost (EVE's module button); a click on the active target does the same. Guns lead the
  active target within the 40° gun arc of the nose, else fire along it; with no lock a gun fires ahead; a lock-only
  munition (the torpedo) refuses ("Torpedo needs a lock"). The seeker is lock-optional and flies unguided without one,
  as before. **The bow draw is gone**: right click with a missile slot says how to lock instead; the draw code is inert.
  `combat.ts` gained one additive method, `setLock`, so the arsenal's missiles and the lead marker use the active lock.
  Ctrl+click does not boost: Ctrl's boost waits for Ctrl to be let go after a lock click.
- **E7, overview.** Pinned at the right edge by default (`settings.flight.ovPinned`, a checkbox in Settings); hidden
  while an arrival card is open; unpinned, hold Tab as before. Click a row: select; Ctrl+click: lock (◎ locking,
  ◉ locked in its first column).
- **E8, binds and hints.** New bind `lock` (C). The keybinds page and the controls list show the fixed mouse moves
  (`MOUSE_GESTURES`: double-click, left click, Ctrl+click, right click an object, left-drag, right button + wheel, wheel)
  since a gesture cannot sit in the one-key table; lock rebinds and resets (proved: C → K → reset → C). Hint line,
  controls list, SPEC Controls rewritten. Tutorial (integration-4's wording): laser now "press {slot1} to switch it on",
  lock now "click a drill target, then press {lock} ... then press {slot2} again", dock "right-click the station: Dock";
  `opening.test.ts` expected the old "Hold Right click" and was updated.
- `stance.ts` `orbitMax` 400 → 2,000 for the ×5 worlds (scale-jump-danger).

### Proved
- By hand in the in-app browser (:5433): a click selects (panel shown, `shots/eve-e4-selected-panel.jpg`); a right click
  on a destroyer opens the menu (`shots/eve-e5-context-menu.jpg`) and its Orbit sets the orbit stance; Ctrl+click locks
  a cruiser, the icon fills and reads LOCKED, 1 again switches the laser on (`shots/eve-e6-lock-row-locked-firing.jpg`);
  C locks the selection; clicking a second lock's icon makes it active, a second click fires on it, a right click on the
  other icon unlocks it (`shots/eve-e6-two-locks-active-switch.jpg`); Ctrl+click on an overview row locks, a click selects
  (`shots/eve-e7-pinned-overview.jpg`); the Settings checkbox unpins it and hold Tab shows it; the lock bind rebinds and
  resets (`shots/eve-e8-keybinds-lock-rebind.jpg`).
- Synthetic (`__voyage.eve`, `run`): laser switched on at the active lock with the nose held on it: 20 shots, 17 hits,
  200 → 36.7 hull+shield, in arc; outside the arc it fires along the nose and misses; right click on empty space holds
  the shield and drops it on release, no menu; the torpedo refuses with no lock; a fourth lock is refused at 3; middle
  click selects under the cursor; approach closes to its distance (5.85 → 5.0); Look at centres the target.
- Unit: `targets.test.ts` (picking, cap 3, lock build and active rule, switching only to a held lock, hand-over on
  loss, range and chaff breaks), `store.test.ts` (ovPinned default and migration; a mouse-look save keeps look and
  invert and gains zoom and lock binds).
- Not tested: touch and gamepad; Dock and Enter from the panel (they call the existing startDock / startEntry).

### Found, not mine
- **Idle orbit at real scale throws a stopped ship round a moon at about 8,000 u/s** (271 units a frame at the Moon's
  ring): with the throttle at 0 and no stance the ship cannot sit still beside a fight; any lock then breaks on range.
  The orbit is Voyage's (`orbitBody` / `orbitPeriod`), scale-jump-danger's numbers.
- The pinned overview sits over the conquest panel (`ConquestHud`) near a world; both want the right edge.
- Fly to on a ship 5 units away overshoots: the double-click throttle rule opens to 0.3 (15 u/s). Approach is the
  better command for close ships.

### Collision with claude/integration-5 (@ 6a1df00)
Its integrator committed an interim E4/E6 (`eve.ts` `trackedGun`, 60° arc, acceleration lead, the guns on the
*selected* ship; `selectAt` on left click; the bow draw kept). `git merge-tree` shows 4 conflict hunks in `Voyage.tsx`
only (imports, the weapons block, `combat.trigger`, `combat.update`); `combat.ts` and `eve.ts` merge clean. Recipe:
union the imports; keep this branch's lock step and `setLock`; feed `trackedGun` the **active locked craft**
(`actCraft`) instead of `gunTarget`'s selection, keeping its acceleration estimate; trigger with
`firing || loose || switchedOn` and its extra target id as `tracked.tracking && actCraft ? actCraft.id : undefined`;
keep this branch's sight toward `actCraft` and `draw: drawing || undefined`. Then drop `selectAt` from the empty-space
click path (this branch's `pickAt` already handles objects before it).

### Checks
tsc -b clean · vitest 661 in 51 files pass · vite build passes. Not merged, not pushed.
## ship-loadout-look (2026-10-21, branch `claude/ship-loadout-look` from e16c690)

**Done.** The player's cruiser shows its loadout: ten weapon mounts, shield emitters, drones, countermeasures, sensor
dome, reactor vents, conforming armour and afterburner collars, each nation in its own style. Grammar, Gemini prompts
and results are in `HARDPOINTS.md`; the seven sheets are in `art/hardpoints/`.

| Commit | What | Territory |
|---|---|---|
| 2499695 | `space/hardpoints.ts` + test, `pilotShip.ts` (`loadout` arg, `refit`, `arm`), `ShipViewer.tsx` (`loadout` prop, frames the hull only), dev gallery `hardpoints.html`, sheets, HARDPOINTS.md | mine; builds alone (tsc clean, space tests 79/79) |
| a5d4840 | wiring: `Voyage.tsx` (refit on loadout change and in `__voyage.setLoadout`, arm the selected weapon), `GameView.tsx` (pilot look to the shipyard), `Shipyard.tsx` (fitted cruiser on screen), `progression/progress.ts` (`fitLoadout`), opening `ShipStep`/`FactionStep` | **other threads' files**, written before the territory message; integrator takes or drops it |

**Proved.**
- At a5d4840: tsc clean, vitest --dir src 662/662, build OK, eslint clean on the changed files.
- By eye in the in-app browser:
  - Dev gallery: 7 nations × 4 fits.
  - Ship step: railgun → flak swapped the rails for a turret, live.
  - Flight: a Mk III fit put hex collars on Jupiter's nozzles. The scene's hardpoint meshes went from 9 to 13 on refit,
    checked after a reload.

**Gemini.** All seven sheets were generated in Caleb's Chrome at about 12:40–12:50, before the one-driver rule reached
this thread. I opened six parallel chats in my own tab group. That burst may have contributed to the "unusual
traffic" reCAPTCHA now blocking Gemini. Chrome blocked automatic downloads after the first sheet, so six are
1206×674 preview captures. Chat ids are in GEMINI-QUEUE.md. All tabs are closed.

**Left undone** (each one a brief):
1. **Fire from the mounts.** Return muzzle points from `buildHardpoints`, expose them on PilotShip, and have arsenal
   spawn player shots there instead of `noseOf`. Arsenal is the integrator's file. A session card for it is proposed
   to Caleb.
2. **Full-size sheets.** Once Caleb clears the CAPTCHA and says yes to downloads, download the six originals from
   their chats (ids in GEMINI-QUEUE.md) over `art/hardpoints/<nation>.jpg`. No regeneration.
3. **AI ships show their arms.** Dress hostile and wing cruisers from `enemyArms.ts` with `buildHardpoints`. Measure
   the draw calls first (this adds 9–13 per ship); merge per fleet as `fleet.ts` does.
4. **Capital, destroyer and fighter hardpoints.** The builder takes any model but was only tuned on the seven
   cruisers. Run the gallery on the other types before using it there.
5. **Fittings sheet (optional).** One Gemini sheet per nation for shield emitters, drone cradles, countermeasures,
   sensor dome, reactor vents and armour, if the procedural ones do not satisfy Caleb.
## look-unify (2026-10-21, claude/look-unify, session <session>)

Aesthetic consistency across every screen. Base: e16c690 + graphics-pass-3-264f8a + one-look-per-people (merge 6caad80);
no other merges. Eleven one-finding commits move the parchment-era leftovers onto the glass look: scene and nav-map
labels off IM Fell, hotbar, pilot HUD (also off the Full button), key chips, disabled buttons, tactical view, station
fallback, ~60 literals in styles.css, one token set, serif font imports dropped. Ranked audit, owners and shots:
LOOK-UNIFY.md. Codex art, art-style mix and phone layout are filed on TEAM-BOARD.md for their owners.

### Checks
tsc -b clean · vitest --dir src 651 in 50 files pass · vite build passes. Looked at on screen before and after:
title, codex, settings, opening, flight HUD, pause menu, shipyard, nav map, phone flight. Not seen: station screen,
fleet tactical view. No Gemini used. Not pushed.
## 2026-10-21 graphics-pass-3, race-art half (branch claude/graphics-pass-3, from claude/integration-4 e16c690)

Split with graphics-pass-3-2 (<session>, branch claude/graphics-pass-3-264f8a), which owns the 3D tour,
GRAPHICS-PASS-3.md and the 3D fixes. This half owns Gemini, the painted pilots and the race-art pipeline. Wrapped up on
Caleb's word (via "Ascent game team coordination"), before any images were downloaded.

### Done (499d277 + this entry)
- `lib/raceArt.ts`: `pilotArt(nation, name)` and `pilotSex(name)`. One painted woman and one man per people
  (`races/<people>/pilot-<f|m>.webp`, a 160 x 200 box stored at 3 x). The name picks the face: every offered given
  name is listed; a typed name ending in -a is a woman's; any other typed name is settled by a stable hash. It follows
  "One people, one look" (ART-DIRECTION.md on claude/one-look-per-people 40d650f): swatches are shades of one look,
  so one painting stands for all of them. Tests in raceArt.test.ts.
- `scripts/gemini-clean.mjs`: rules for `pilot-<people>-<f|m>.*` and `leader-<people>.*` (cover-cropped to the leader
  box, Mercury 104 x 230 new); the contact sheet goes to shots/graphics-pass-3/.
- `scripts/gp.mjs`: writes to shots/graphics-pass-3 (OUTDIR to change it). Before shots of the title, codex, opening
  and HUD: shots/graphics-pass-3/before-*.jpg; every painted person: before-race-art-all.jpg.
- GEMINI-PROMPTS.md "Pass 3": attachment re-test (still refused), Gemini will not edit its own image either (re-roll
  with "Create a new image from the same description..., with these changes"), the pilot template, all 14 accepted
  pilots with chat ids, the 8 that drift and are not used, and the queued leader prompts.
- Audit of every painted person against the one-look table: Earth Strategos (fair) and Mars consul (pale) drift; the
  Earth codex head reads light tan next to the sun-browned body; everyone else fits; the title key art has no people.

### Left undone, each with its brief (also first in GEMINI-QUEUE.md)
1. **Download and clean the 14 pilots.** Needs Caleb's yes to download. In gemini.google.com/app/<chat>, the
   download arrow on the image (the 2nd image for mercury-m and saturn-m, the last for jupiter-f); save as
   `gemini-in/pilot-<people>-<f|m>.png` in the worktree; `node scripts/gemini-clean.mjs`; check
   shots/graphics-pass-3/gemini-contact.jpg. Chats: earth f f33981ee8a7fe11d, m c893617300b5a9a4; moon f
   6cf0993f96389ba2, m b8d14a0a7f9a7dd1; mercury f e988f0ae5a500da2, m 0926bb60a6dbd0fa; venus f 348199b04f4f5b09,
   m 9999352ad5ba6274; mars f 0b5e7b71ce404288, m 77f0a15969855bb1; jupiter f 3af1806488109dd2, m 876bfe77846377b6;
   saturn f 39d6389fae599e8c, m e882084ff98bb0aa.
2. **Wire PilotHead to the pilots** once the files exist: `const art = look ? pilotArt(nation, label) :
   RACE_ART[nation].head` (label is the pilot's name in all three callers: PilotHud, LaunchCard, the raid card). Add a
   test that all 14 files exist at 480 x 600. Before/after: shots before-start-earth.jpg (Amara Okafor shows the codex
   man) against a new after-start-earth.jpg, and the launch card.
3. **Earth Strategos repaint** (`leader-earth`): sun-browned #9a6a4a, "the same skin as the pilot"; prompt in
   GEMINI-PROMPTS.md.
4. **Mars consul repaint** (`leader-mars`): olive tan #c48f6a.
5. **Mercury King of the Field** (`leader-mercury`): very dark brown #3a2418; then add
   `leader: { ...img('mercury', 'leader', 104, 230), title: 'The King of the Field' }` to RACE_ART.mercury and drop
   the "drawn pale" flaw line.
6. **Earth codex head repaint** (`earth-portrait`, portrait template): sun-browned #9a6a4a.
7. **Handoff, screen session:** with one look per people, the pilot step could show the painted pilot instead of the
   SVG Portrait (PilotStep.tsx is theirs).

### Blocked
- **2026-10-21 ~12:45 PT: Google reCAPTCHA** ("unusual traffic from your computer network") on opening a new
  Gemini chat, after 26 generations that day. Not solved; Caleb clears it in his Chrome. Re-test: open
  gemini.google.com once.
- Downloads: no yes from Caleb yet; nothing was downloaded.

### Checks
tsc -b clean · vitest --dir src: 650 of 651 pass; the one failure is swarm.test.ts's timing test ("hundreds of drones
... in a few milliseconds") under full-suite load on a shared machine; it passes 19/19 run alone, twice, and that file
is not touched here · vite build passes. Not merged, not pushed.

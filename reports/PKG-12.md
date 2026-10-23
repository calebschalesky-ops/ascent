# PKG-12 report: the tactical view

Seat: Zeuxis with Talos. Branch `claude/pkg-12`, base `claude/game` @ 0cea035. Date 2026-10-21. Port 5212 at
`http://[::1]:5212/?skirmish&probe`, viewport 1024 × 768 (and 375 × 812 for the phone check).

## What I measured

- **EXP-03 steps 1–6, 8, 9 pass on screen**, played in the in-app browser with real key presses (`t`, `Return`) and
  real clicks (roster cards, ships in the battle, the order menu, the selected ship's bar). The pane was hidden, so
  `requestAnimationFrame` did not run: time was stepped with `__probe.advance()` and each screenshot was taken after
  a hand-driven frame. Seed 3 throughout (EXP-03's start state), restarted per maneuver so each shape starts clean.
- **Time scale, read from the probe in both states:** T pressed at 0:03.5 → `state('tactical')` `{on: true,
  timeScale: 0.25}` and `state('battle.timeScale')` 0.25; T again at 0:25.4 → `{on: false, timeScale: 1}`. The battle
  clock kept advancing through both (`timeLog` `[{t: 3, on: true, timeScale: 0.25}, {t: 25.4, on: false, timeScale:
  1}]`, 10 s later t = 35.4). The view never sets 0.
- **Ghost line = flown (step 4):** the flown track's largest distance from the ghost line shown at commit
  (`state('tactical.tracked')`, every step until the flight ended): broadside pass 1.3 m; crossing the line 2.7 m;
  flanking arc 2.1 m; boarding run 0.7 / 5.1 / 2.6 m (carrier, two escorts); defensive wheel 1.3 / 2.2 / 2.5 m;
  fighting withdrawal 1.3 / 2.2 / 2.5 m. Tolerance 50 m (PKG-10's `MAN.previewTolM`).
- **Break-off (step 6):** Pnyx on a broadside pass, at 1:24 a real click on Ganymede and **Attack**: `maneuver
  brokenOff` at 84.3, then heading −0.190 → 1.033 rad over 10 s in even steps of 0.064 rad per 0.5 s. Turn rate ÷
  the ship's own limit (`limitsOf(s, dt).rate`): 1.000 in flight, 1.000 in the 60 s after the break. It turns at its
  limit and never past it: a turn, not a snap.
- **Helm 9 against Helm 3 (step 7, probe, on JSON copies of the live battle, trait set to By-the-book):**

  | Maneuver (ship → target) | ETA H9 / H3 | Flown H9 / H3 | Mean off the plotted course H9 / H3 |
  |---|---|---|---|
  | broadside pass (Agora → Diadem) | 134.0 / 183.3 s | 134.1 / 183.3 s | 45 / 96 m |
  | crossing the line (Agora → Diadem) | 62.3 / 91.5 s | 52.0 (broke off) / 91.6 s | 15 / 146 m |
  | flanking arc (Agora → Diadem) | 30.0 / 35.8 s | 30.0 / 35.8 s | **76 / 43 m** |
  | flanking arc (Agora → Second Crown) | 40.7 / 50.4 s | 40.7 / 50.4 s | **83 / 68 m** |
  | flanking arc (Agora → Sceptre) | 50.0 / 63.2 s | 50.0 / 63.2 s | 98 / 102 m |
  | flanking arc (Pnyx → Diadem) | 38.4 / 47.1 s | 38.4 / 47.1 s | **70 / 42 m** |
  | flanking arc (Stoa → Europa) | 31.4 / 37.6 s | 31.5 / 37.7 s | **82 / 45 m** |

  Helm 9 finishes sooner in all seven. It holds the path tighter on the broadside pass and the crossing, but **not on
  the flanking arc in 4 of 5 live geometries**, by the same measure PKG-10's test uses (mean distance from each
  ghost-line point to the start → waypoint polyline). PKG-10's test passes on its own quiet setup (p3 on e3, aft side
  given). My reading, not proved: on a short arc the high-Helm fillet cuts the corners, and corner-cutting is distance
  from the polyline. That is the sim's and the measure's, not this package's (Requests).
- **Seeing is not knowing (step 2):** at 0:48 on seed 3 the enemy escort Companion (e1) shows starboard **down**
  (his gunners saw a hit go through) while its true `open.starboard` is false and its starboard shield is at 40: it
  recovered and nobody of his has seen it. EXP-05 step 1 on seed 5: Pnyx and Bema focus Sceptre's fore with the guns
  on her from 0:25; she turned and her starboard went down, seen at 0:57.5 (`known.e9.starboard: "down"`; truth
  `open.starboard: true`, shield 0).
- **Bench** (`__probe.bench({frames: 150})`, seed 1, 30 s in, camera reset, normal view, flag on): **130 draw calls,
  71,298 triangles** against 128 / 70,340 (+1.6% / +1.4%; limit +15%). The tactical view's own (same frame, T on):
  **173 calls, 81,750 triangles**, median 10.8 ms per step+render against 6.8–9.2 ms normal. The extra calls are not
  the hologram (grid and table add 2): the tactical camera holds the whole battle, so every hull is in the frustum. The
  first build cost 119 ms a frame because `view.toWorld` updates the battle's matrices on every call and the overlay
  called it ~1,000 times; the projector now reads the battle-to-world matrix once per frame.
- **375 px:** the two lines stand as columns (his on the left), the picker panel and the badge sit at the bottom
  clear of the stacked title and side chips (`phone-375-tactical-columns-ghost-panel.jpg`).
- **Contrast** (tokens on the composited panel ≈ #080a16 and the holotable ≈ #03040a): `--hud` 16.2 / 16.8,
  `--hud-dim` 7.7 / 8.0, `--cyan` 12.2 / 12.6, `--amber` 12.5 / 13.0, `--danger` 7.0 / 7.3, Saturn orange 8.4 / 8.7.
  All clear AA 4.5:1.
- **Console:** `__probe.errors()` empty through every run.

## What I changed

New, mine: `src/battle/view/tactical/`

| File | What |
|---|---|
| `numbers.ts` | `TAC`: 0.25 time, camera pitch and hold, exposure, grid and holotable, icon and arc sizes, staleness fade, path refresh, ghost tolerance. All first-pass, look only except the time scale. |
| `intel.ts` | What his side knows of enemy shields: reads his ships' hits from the log (splash = up, through to the hull = down, stays down until a hit is seen to splash again; never hit = unknown). `shieldArcs()`: his own ships' four sides true (charge and split), the enemy's from that knowledge only. Never reads an enemy's `shields`, `open` or `split`. |
| `paths.ts` | A maneuver's remaining path: PKG-10's pilot flown forward on a JSON copy of the flight's pilot (no RNG, no battle change), cached, re-flown every 3 battle seconds. `distToPath()`. |
| `picker.ts` | The maneuver picker: choose (with or without a target), add or drop ships, target, ghost (`previewManeuver()`, re-plotted every 0.5 battle s and once more at the commit), commit through `command(b, lead, {kind: 'maneuver', name, target, group})`, cancel. Wheel and withdrawal preview before a target (nearest enemy, as the sim does). |
| `overlay.ts` | The SVG overlay: icons by class in the house glow, four shield arcs per ship (length = charge, weight = split; enemy: amber held, red dashed with a breach tick when seen down, faint dotted unknown, held sides fade over 45 s), the ghost line with its ETA and pod-launch marks. `projector()` and `pathD()` (shared with the order lines). |
| `holo.ts` | One grid and one dark holotable disc on the battle's ring plane (hidden, no draw call, while closed) and the exposure turned to 0.38×. |
| `mount.ts` | T on/off, the tactical camera (pitch 1.18, his fleet at the bottom, the enemy at the top, columns on a tall screen, pulled back to hold every ship and the ghost until he moves it), the director paused, the panel and badge, Enter/Esc, the per-step checks (ghost vs flown, turn rate), the Helm probe, `state('tactical')` and the `tactical*` verbs. |
| `ManeuverMenu.tsx` | The six maneuver buttons, mounted in the comms order menu and in the selected ship's bar. |
| `tactical.css` | Tokens only. |
| `tactical.test.ts` | 9 tests: flag, 25%, intel (up/down/recover, enemy-on-enemy teaches nothing), enemy arcs blind to the truth, own arcs true, picker → command → flown within 50 m, Esc orders nothing, six shapes differ, order lines for every kind and the remaining path on the ghost. |

Outside `tactical/`, the lines the package names as mine:

- **`Skirmish.tsx`:** import; `mountTactical(...)` after the director; `tac?.step()` after `director.step`;
  `tac?.reset()` on restart; `tac?.dispose()`; one `act` line routing `tactical*` verbs; the verbs list; and the **T
  case** in the key handler (plain `t`/`T`, only while the flag is on).
- **The order menu's Maneuver lines** in `comms/CommsHud.tsx`: an import and two `<ManeuverMenu …/>` lines, one in the
  order menu (target known: the ghost shows at once) and one in the selected ship's bar (asks for a target click).
- **Order-line drawing, where PKG-09 put it:** `comms/logic.ts` `orderLines(b, all, paths)` and
  `comms/controller.ts` `drawOverlay()`. With `all` (the flag): a maneuver in progress is its remaining path, follow
  the flagship runs to the flagship, hold position is a dashed ring at the station, a withdrawal points 2.5 km along its
  course, and the master of guns' target runs from the flagship. Without it, PKG-09's lines are unchanged (tested).
  `OrderLine.to` became `string | null` with optional `point` and `path`. The probe's `comms.lines` gives a path as its
  point count.
- **One click hook** in `controller.ts`: `ctl.maneuvers?.intercept(id, own)` before select/target, so that while a
  maneuver is being chosen a click on his ship adds or drops it and a click on an enemy targets (or, on the same
  target, commits). The optional `maneuvers` field on `CommsController` carries the hooks.
- **The pause call** in `director/mount.ts`: `pause(on)`. While paused, `step` does nothing, no inset is drawn and a
  camera input takes nothing from the director. `director.ts` is untouched.
- **`src/flags.ts`:** `tactical`, appended, **on**.
- `scene.ts`, the shield shimmer, the css look, `src/battle/sim/**`: untouched.

## Script steps

| Step | Status | Evidence (`shots/pkg-12/`) |
|---|---|---|
| EXP-03 1 (one key; hologram; 25%, never 0) | **pass** | `exp03-step1a-normal-view-1x-seed3.jpg`, `exp03-step1b-T-tactical-25pct-hologram.jpg`; real `t`; probe `timeScale 0.25` |
| EXP-03 2 (four arcs; enemy arcs only what he knows) | **pass** | `exp03-step2-arcs-e1-stbd-seen-down-truth-recovered.jpg`; e1 starboard shown down, truth closed (above); unit test: rewriting every enemy's true shields changes nothing drawn |
| EXP-03 3 (select, broadside pass on an enemy: ghost line and time before commit) | **pass** | `exp03-step3a-order-menu-maneuver-row-pnyx-on-diadem.jpg`, `exp03-step3b-ghost-line-broadside-pass-eta-2m49.jpg`; real clicks: roster Pnyx, Diadem, **Broadside pass**; ETA 2:49 |
| EXP-03 4 (commit; flies the shown path) | **pass** | real `Return`; `exp03-step4-pnyx-flying-remaining-path-90s.jpg`; max 1.3 m from the ghost over 2,700 steps |
| EXP-03 5 (the other five, each ghosted and flown, each a different shape) | **pass** | `exp03-step5a…e-*.jpg`; all from the selected ship's bar + target click; committed by click-the-target-again (crossing) and `Return` (the rest); group ships added by clicking them; max distances above; boarding run launched its pods at 49.6 s (`boardLaunch ordered: true`) |
| EXP-03 6 (cancel halfway with a new order: a short believable turn) | **pass** | `exp03-step6a-pnyx-halfway-broadside-1m24.jpg`, `exp03-step6b-after-attack-order-broke-off-turned-at-limit.jpg`; turn ratio 1.000 |
| EXP-03 7 (probe: Helm 9 sooner and tighter than Helm 3) | **sooner: pass (7 of 7). Tighter: fails on the flanking arc in 4 of 5 live geometries** | table above; `act('tactical.helm', {ship, name, target})` |
| EXP-03 8 (every standing order drawn ship → target) | **pass** | `exp03-step8-order-lines-every-standing-order.jpg`; standing `p1 attack, p2 maneuver, p5 followFlagship, p6 gunsOn, p9 focusSide, p10 holdPosition`, lines for all six (the maneuver as a 120-point path); a withdrawal line was drawn until that ship jumped out |
| EXP-03 9 (close: 1x, never paused) | **pass** | real `t`; `exp03-step9-T-closed-1x-director-back.jpg`; timeScale 1, exposure 1.1 back, camera back to the director's (mode, pitch 0.17), director cutting again |
| EXP-05 1 ("seen as the arc in the tactical view") | **pass** (the arc) | `exp05-step1-seed5-sceptre-stbd-arc-down-breach-tick.jpg`; Sceptre starboard down at 0:57.5 |

Flag `tactical`: **on** (EXP-03 1–6, 8, 9 pass; step 7's open half is the sim's, and the flag does not change it).
Save version: unchanged (the tactical view writes nothing).

## Still broken or not done

- Step 7, the flanking arc: Helm 9 is not tighter by PKG-10's measure in most live geometries (Requests).
- The ghost's ETA label is drawn at the end of the path; when the path leaves the screen the label goes with it. The
  panel carries the same time, so nothing is lost.
- With the tactical camera holding the whole battle, his fleet sits low on a 1024 × 768 screen, partly behind the
  comms ticker and the roster strip, and the crew panel covers the right of the enemy line. The look-at point is
  scene.ts's (the battle's centre); I did not move it.
- The selected ship's bar now wraps to two rows (the six maneuvers), and at 1024 px the second row overlaps PKG-09's
  comms ticker text.
- Arcs are fixed-size screen marks; zoomed far in, they are small against the hull.
- The planet shows beyond the holotable's edge when the camera pulls far back.
- At 25% time the camera's own easing (`CAM.follow`) runs on battle time, so it also follows at a quarter speed.

## Requests

- **PKG-10 / Palamedes (maneuvers):** EXP-03 step 7's "holds the path tighter" for the flanking arc. Either the
  measure (distance to the start → waypoint polyline) should allow for the fillet a good helmsman is meant to cut, or
  the arc's shape at short range should reward Helm. Numbers above; reproduce with `act('tactical.helm', {ship: 'p4',
  name: 'flankingArc', target: 'e2'})` on seed 3 at 0:04.
- **PKG-04's owner (scene.ts):** a way to offset the look-at point (for the HUD) or a per-mode `frameBoth` hold factor
  would let the tactical camera centre the table in the clear part of the screen.
- **PKG-09's owner / PKG-15 (layout):** the selected ship's bar is two rows now; the comms ticker under it may want to
  move up or hide while a ship is selected.

## Assumed, for Caleb to overrule

- `T` as the key (only when no modifier is held).
- The hologram look: dark holotable over the planet and rings, cyan grid at 1 km, ships as glowing outlines by class
  in their house glow, exposure 0.38×.
- The tactical camera: pitched 68° down, his fleet at the bottom and the enemy's at the top (columns on a phone), held
  wide until he moves it.
- Shield arcs: his own in cyan with length = charge and weight = power split; the enemy's in amber when seen holding
  (fading over 45 s), red dashed with a breach tick when seen down, faint dotted when never hit.
- What counts as "seen": a hit by one of his ships that his gunners saw land (splash or through). Nothing else.
- While choosing a maneuver, a click on his own ship adds or drops it from the group; a second click on the target
  commits; Enter commits; Esc cancels.
- The flag on although step 7's flanking-arc half does not hold (it is sim behaviour this flag does not change).

## You cannot prove (from the package)

Whether 25% gives him time to think, and whether the maneuvers look like a navy. Caleb only.

## Evidence

On the branch before merging the tip (commit e7e5e74):

```
2026-10-21T17:22:49-07:00
$ npx tsc -b
tsc exit 0
2026-10-21T17:23:08-07:00
$ npx vitest run
 Test Files  63 passed (63)
      Tests  824 passed (824)
2026-10-21T17:23:47-07:00
$ npx eslint src/battle/view/tactical src/battle/view/comms src/battle/view/director/mount.ts src/battle/view/Skirmish.tsx src/flags.ts
eslint exit 0
$ npm run build
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
build exit 0
$ npm run smoke   (retried while another package held port 5290)
[19.4s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":23,"shots":562,"movedBySide":[11,12],"drawCalls":68}
[24.2s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (24.2s)
```

### Merged result (claude/pkg-12 after `git merge claude/game` @ c1c0c1f, merge commit 41620db)

The merge with PKG-15 conflicted only on the director mount's construction lines (PKG-15 added a `lens` to
`createDirector`; I had added the pause lines beside it): kept both. PKG-15's F6 token test then caught two hex
fallbacks in `tactical/holo.ts`'s token reader; they are now plain greys (`setScalar`), no hex. Looked at on screen
after the merge: `merged-with-pkg15-tactical-ghost-1024.jpg` (T on, 25%, ghost line with ETA, no console errors).

```
2026-10-21T17:30:24-07:00
$ npx tsc -b
tsc exit 0
2026-10-21T17:30:40-07:00
$ npx vitest run
 Test Files  64 passed (64)
      Tests  827 passed (827)
2026-10-21T17:31:15-07:00
$ npx eslint src/battle/view/tactical src/battle/view/comms src/battle/view/director/mount.ts src/battle/view/Skirmish.tsx src/flags.ts
eslint exit 0
2026-10-21T17:31:21-07:00
$ npm run build
  dist/sw.js
  dist/workbox-9c191d2f.js
build exit 0
2026-10-21T17:32:22-07:00
$ npm run smoke
[17.6s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":23,"shots":562,"movedBySide":[11,12],"drawCalls":67}
[22.1s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (22.1s)
```

## Gate (game worktree, after `Merge PKG-12` 96f2f29)

```
$ git -C <game> log --first-parent -3 --oneline
96f2f29 Merge PKG-12: tactical view (T, 25% time, hologram, shield arcs from what his side saw), maneuver picker with ghost lines, order lines for every standing order; flag tactical on
c1c0c1f Merge PKG-15: report evidence
e84e2ab Merge PKG-15: look pass: rim shields, inset bloom, whole-hull close shots, folded crew panel, compact roster, fading log, F6 for the battle view

$ git -C <game> diff --stat 96f2f29^1 96f2f29   (code lines; plus reports/PKG-12.md and 18 screenshots)
 src/battle/view/Skirmish.tsx                       |   9 +-
 src/battle/view/comms/CommsHud.tsx                 |   3 +
 src/battle/view/comms/controller.ts                |  33 +-
 src/battle/view/comms/logic.ts                     |  40 ++-
 src/battle/view/director/mount.ts                  |  10 +-
 src/battle/view/tactical/ManeuverMenu.tsx          |  24 ++
 src/battle/view/tactical/holo.ts                   |  96 +++++
 src/battle/view/tactical/intel.ts                  |  82 +++++
 src/battle/view/tactical/mount.ts                  | 395 +++++++++++++++++++++
 src/battle/view/tactical/numbers.ts                |  58 +++
 src/battle/view/tactical/overlay.ts                | 162 +++++++++
 src/battle/view/tactical/paths.ts                  |  82 +++++
 src/battle/view/tactical/picker.ts                 | 134 +++++++
 src/battle/view/tactical/tactical.css              |  54 +++
 src/battle/view/tactical/tactical.test.ts          | 155 ++++++++
 src/flags.ts                                       |   1 +
 35 files changed, 1540 insertions(+), 12 deletions(-)

2026-10-21T17:32:39-07:00
$ npx tsc -b
tsc exit 0
2026-10-21T17:32:51-07:00
$ npx vitest run
 Test Files  64 passed (64)
      Tests  827 passed (827)
2026-10-21T17:33:26-07:00
$ npm run build
  dist/sw.js
  dist/workbox-9c191d2f.js
build exit 0
2026-10-21T17:34:21-07:00
$ npm run smoke
[13.7s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":23,"shots":562,"movedBySide":[11,12],"drawCalls":67}
[18.3s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (18.3s)
```

Gate: **pass**. The merge lock was free when taken (17:27:14) and is released after this evidence is merged.

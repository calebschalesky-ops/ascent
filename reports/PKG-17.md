# PKG-17: view polish (picking, the help line, engine glow)

Seat: Zeuxis with Talos. Branch `claude/pkg-17`, base `claude/game` @ 6701d3a. Date 2026-10-21. Dev server
`http://[::1]:5217/?skirmish&probe`.

How it was measured: headless Chrome on the real GPU (ANGLE D3D11) over the DevTools protocol, the same way TRC-03
clicked. Clicks are real mouse events (`Input.dispatchMouseEvent`: move, press, release), aimed at the probe's screen
projection of a ship (`__probe.state('comms').screen[id]`). Time paused with `act('time.scale', {scale: 0})` and stepped
with `advance`. The drivers are committed: `shots/pkg-17/clickrate.mjs`, `fastclick.mjs`, `exp06-play.mjs`, `shot.mjs`.

## What I measured

**The ~40% miss rate was mostly not picking.** I re-ran TRC-03's own EXP-06 driver (seed 6, smallest first, unchanged
plan and clicks) and logged what was under the cursor on every miss:

| Run (seed 6, TRC plan) | orders that landed | scene clicks that opened no menu | off the screen | under a panel | on the battle |
|---|---|---|---|---|---|
| base picking (PKG-17 layout) | 52 | 38 | 13 | 25 | **0** |
| PKG-17 picking | 54 | 39 | 13 | 26 | **0** |
| seed 7, PKG-17 picking | 41 | 21 | 21 | 0 | **0** |

The driver aims at an enemy's projection whether or not it is on the screen (x = -127 at seed 7) or under the comms
queue, the answer buttons or the crew panel. No player can click those. Of the clicks that landed on the battle, none
missed in either version. (TRC-03's 34 of 79 and 28 of 71 are the same measure: its driver has no visibility check.)

**What picking did get wrong** (the raycast took the first hull on the ray): a click on a small ship drawn over a bigger
hull nearer the camera picked the big one. Example: seed 6 at 1:30, a click 3 px from Companion's centre picked
Ganymede (the flagship) behind it.

**The bar run.** 40 real-mouse clicks per width on enemy ships, seeds 6, 7, 2, 3, ... at 0:20, 1:00 and 1:30. Each aim
is the probe's projection plus up to 4 px of random offset (repeatable seed). An enemy whose projected centre is off the
screen or under a panel is skipped and counted separately, because nobody can click it.

| | 1280 x 720 | 800 x 600 | enemies skipped (under a panel) 1280 / 800 |
|---|---|---|---|
| before (base picking) | **38/40 (95%)**: 2 small ships picked as the hull behind | **38/40 (95%)**: same | 0 / **48** |
| after, normal view | **40/40 (100%)** | **40/40 (100%)** | 0 / **23** |
| after, tactical view | **40/40 (100%)** | **40/40 (100%)** | 0 / 4 |

Later in the battle, when the fleets bunch (0:30 to 2:00, 80 clicks, 1280): before 67 of 71 clicks that reached the
battle (94.4%; 9 more aimed at panels); after 77/80 (96.3%). The 3 left are pairs whose centres are a few px apart,
where the 4 px offset lands nearer the other ship. The hover ring is what shows him which one he will get.

**Help line (before):** `before-1280-seed6-20s.jpg`: "Drag to turn · wheel to zoom · R to reset" sits on the order bar's
second row and the event log. With a report on top, R answers its third option (TRC03-2). At 800 the whole footer was
hidden, so there was no help line. **Engine glow (before):** one sprite size (6 units) for every class, an escort is
4.5 long: `before-glow-escort-close-seed4-1280.jpg` shows the glow ball as big as the hull. **800 px:** the crew panel
covered the right third of the battle (TRC03-10); 48 enemy positions in the bar run were under a panel.

## What I changed

- **Picking** (`src/battle/view/comms/pick.ts`, new; `comms/controller.ts` `pickAt`): every visible ship is a candidate
  by its projected centre; every hull the ray touches (not only the first) counts as `pickHullPx` (12) away; the nearest
  wins within `pickRadius` (30 px, unchanged). A click on an escort's icon now beats the capital behind it, and a click
  on a capital's long flank still picks the capital. Same function in the normal and the tactical view (both go through
  `pickAt`). Numbers in `comms/numbers.ts` (`pickHullPx`, `hoverRing`), first-pass.
- **Hover ring** (`controller.ts` overlay, `comms.css` `.cx-ring-hover`): the pointer is picked once per overlay frame;
  a thinner ring (12 px, in the colour of the ring it becomes: house for his own, danger for an enemy) and a pointer
  cursor show what a click will pick. The probe reports it as `state('comms').hover`.
- **Help line** (`Skirmish.tsx` hint, `skirmish.css`): it moved to the header between the title and the sides and says
  what the keys do now: "R answers the selected report" when the selected report has a third answer, otherwise "R
  resets the view" (PKG-09's ruling: behaviour unchanged); "Tab next report" only when two reports can be answered; "T
  tactical" when the tactical view is on. Each phrase wraps whole. Phone: "Drag to turn" only, bottom left, clear of
  the Fleet button, hidden while the fleet panel or the end card is open. The report itself already shows the key on
  each answer (`Q`, `E`, `R` chips, `after-help-1280.jpg`).
- **Event log** (`comms.css`): it sat on the order bar too; it now hangs under the header between the queue and the
  picture-in-picture's column.
- **Tactical badge and picker panel** (`tactical.css` layout lines): with the table open the help line steps under the
  badge; while the picker's panel is up (its own keys: Enter, Esc) the help line and the event log give way, so the
  panel keeps its place above the enemy line. Two lines at 761-980 px align right to clear the command meter.
- **Crew panel at 761-980 px** (`comms.css`): tighter chips (12 px, 26 px tall). Enemy positions under a panel at 800 in
  the bar run: 48 before, 23 after.
- **Engine glow** (`scene.ts`): the sprite is `LOOK.engine.perLength` (0.4) of the class length (escort 1.8 units
  against a 4.5 hull; capital 8 against 20), with a floor of `minPx` (3 device px) so a line still reads by its lights
  from across the battle. Still one draw call: the stock points shader reads a per-ship `aSize` attribute
  (`onBeforeCompile`). `after-glow-escort-close-seed4-1280.jpg`.

## Still broken

- **Enemies off the screen or under a panel cannot be ordered against** by click: there is no roster of enemy ships.
  This is what TRC-03's misses were. Requests below.
- At 800 px, 23 enemy positions in the bar run were under a panel (queue left, crew panel right). At 1280 the queue
  covers the left 380 px.
- While the picker's panel is up in the normal view, the help line is hidden (the panel names its own keys).
- EXP-06 s6: two defeats (below). Balance is PKG-16's, not merged into this branch when these were played.

## Script steps

| Step | Result | Evidence |
|---|---|---|
| EXP-06 s6 (ui) playable through the UI: orders land on the ship he clicked | **pass** for the clicking: 105 of 105 orders landed, 0 misses, over two games; **the step itself (enemy breaks, his victory) not reached**: two defeats | `exp06-s6-play-seed6-seen.jsonl`, `-seed7-seen.jsonl`, `-end.jpg` |
| EXP-02 s6 under fast clicking (card, enemy, Attack, no pause) | **pass**: 8 of 8 clicks landed at 1280 and at 800; 7 orders taken, 1 correctly refused ("That ship is not under your command.", Ekklesia had broken) | `fastclick-1280.json`, `fastclick-800.json` |
| EXP-02 s10 under fast clicking (Marine commander, Pods at, Fighter command, Screen) | **pass** at both widths: pods at the target, fighters on Screen | same |
| Bar: >= 95% of 40 real-mouse clicks at 1280 and 800 | **pass**: 40/40 and 40/40 (before 38/40, 38/40); tactical 40/40, 40/40 | `after-*.json`, `before-*.json` |
| Help line true about R and Tab, no overlap at 375, 800, 1280 | **pass**: element boxes measured (below) | `after-help-*.jpg`, `after-tactical-*.jpg`, `after-normal-picker-*.jpg` |
| Engine glow smaller than a small ship's hull in a close shot | **pass** | `before-/after-glow-escort-close-seed4-1280.jpg` |
| No lost passes | full vitest passes (below) | |

**EXP-06 s6, what I ordered and what happened** (plan "seen": TRC-03's smallest-first plan, every ship told to attack
the focus target by roster card, scene click and the menu's Attack; the flagship boards an open side within 4 km; the
focus is the smallest enemy he can see on the battle, not one off the screen or under a panel; when none of theirs is in
sight, the view is reset, standing in for a drag of the camera):

- **Seed 6:** 50 orders, 145 clicks, 0 misses, 7 view resets. His fleet broke at 3:09 (fleet morale 25). Defeat. Enemy
  lost 1, fled 1, captured 1 (2 wrecked by the end); enemy morale 78.1.
- **Seed 7:** 55 orders, 160 clicks, 0 misses. Broke at 3:05 (56% of its strength gone: ships lost 5, fled 4). Defeat.
  Enemy lost 2, captured 2; enemy morale 72.5.
- TRC-03's plan unchanged (targets off the screen included), PKG-17 picking: seed 6 defeat at 4:48 (54 orders landed),
  seed 7 defeat at 3:19 (41).

**Help line boxes** (left, top, right, bottom, px; selected report with three answers, seed 6 at 0:04):

| Width | help line | nearest neighbours |
|---|---|---|
| 1280 x 720 | 162,12,1008,37 (one line) | sides start 1024; queue top 76; event log top 64; order bar top 590 |
| 800 x 600 | 162,12,528,58 (two lines) | sides start 544; queue top 76; order bar top 434; event log hidden (as before, under 980) |
| 375 x 812 | 12,775,263,794 ("Drag to turn") | Fleet button 299,760; queue 128-322 |
| 1280, tactical open | 162,12,1008,67 under the badge 517,12,763,38 | event log hidden while the table is open |
| 800, tactical open | phrases at x >= 223 (y 46-67) and x >= 363 (y 67-88) | command meter 12,76,292,108 |

## Flag, save, bench

Flag: none. Save version: unchanged. Bench, `__probe.bench({frames: 120})`, 1280 x 720 headless real GPU: base 144 draw
calls / 70,594 triangles; after 144 / 70,594 (the engine glow is still one call). Bar: within +15% of 130 / 71,298
(149 calls / 81,993 triangles). Today's base measures 144, not 130, on this machine.

## Requests

- **Daedalus / PKG-09's owner (comms):** a way to order against an enemy he cannot click: off-screen edge markers that
  can be clicked, or the enemy in the order menu's target list. This is what TRC-03's misses were.
- **PKG-11's owner (director):** frame the enemy line clear of the queue (left 280-380 px) and the crew panel; at 800 px
  23 of 63 enemy positions sampled were under a panel.
- **Daedalus:** EXP-06 s6 stays not reached (two defeats); re-play on the game tip once PKG-16's balance is in, with
  `node shots/pkg-17/exp06-play.mjs <seed> seen <out.jsonl>` (dev server on 5217).

## Assumed, for Caleb to overrule

- The hover ring: 12 px, thinner and fainter than the selection and target rings, in the colour it will become.
- A hull under the pointer counts as 12 px away (`pickHullPx`): a small ship whose centre is nearer still wins.
- The help line lives in the header; on a phone it says only "Drag to turn" (no keyboard). It hides while the picker's
  panel is up.
- The event log moved from above the order bar to under the header; it hides while the tactical table or the picker's
  panel is open.
- Engine glow 0.4 of the class length, floor 3 device px.
- The "seen" play plan's camera reset as the stand-in for a player dragging the view back to the fight.

## Evidence

Screenshots, `shots/pkg-17/`: before/after help line `before-{1280,800,375}-seed6-20s.jpg`,
`after-help-{1280,800,375}.jpg`; hover ring `after-hover-enemy-seed6-20s-1280.jpg`,
`after-hover-enemy-tactical-seed6-20s-{1280,800}.jpg`; tactical and picker layouts
`after-tactical-open-seed6-20s-{1280,800,375}.jpg`, `after-tactical-picker-seed6-20s-{1280,800,375}.jpg`,
`after-normal-picker-seed6-20s-{1280,800,375}.jpg`; glow `before-/after-glow-escort-close-seed4-1280.jpg`,
`after-normal-seed4-23s-1280.jpg` (far view, lights still read); EXP-06 ends `exp06-s6-play-seed{6,7}-seen-end.jpg`.
Runs: `before-*.json`, `after-*.json`, `probe-late-1280.json` / `after-late-1280.json`, `fastclick-*.json`,
`exp06-*.jsonl`, `before-exp06-s6-play-seed6-small.jsonl`.

### Merged result (claude/pkg-17 after `git merge claude/game` @ 2f99b0f, merge commit aae3e53)

```
== 2026-10-21T19:34:25-07:00 branch claude/pkg-17 @ aae3e53
== npx tsc -b
tsc exit 0
== npx vitest run
   Duration  68.17s (tests 83%, import 13%, transform 3%)
== npx eslint (PKG-17 files)
eslint exit 0
== npm run build
✓ 301 modules transformed.
✓ built in 33.23s
== npm run smoke
[36.9s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":23,"shots":562,"movedBySide":[11,12],"drawCalls":67} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[41.9s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (41.9s)
== 2026-10-21T19:39:00-07:00 npx vitest run --maxWorkers=4 (amendment A7)
 Test Files  67 passed (67)
      Tests  863 passed (863)
   Duration  67.58s (tests 89%, import 9%, transform 1%)
```

## Gate (game worktree, after `Merge PKG-17` 3a1be08; amendment A7: vitest --maxWorkers=4)

```
== 2026-10-21T19:40:27-07:00 gate in game worktree @ 3a1be08
== npx tsc -b
tsc exit 0
== npx vitest run --maxWorkers=4
 Test Files  67 passed (67)
      Tests  863 passed (863)
   Duration  67.48s (tests 88%, import 10%, transform 1%)
== npm run build
✓ built in 32.61s
build exit 0
== npm run smoke
[36.4s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":23,"shots":562,"movedBySide":[11,12],"drawCalls":67} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[41.7s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (41.7s)
== git log --first-parent -3 (claude/game)
3a1be08 Merge PKG-17: picking by screen distance with a hover ring, a truthful help line, engine glow by hull size
2f99b0f Daedalus: handover to the new session; Phase B filed; SCR-B running
e6e87f5 Revert "Merge PKG-18: maneuvers fly the line, Helm 9 tighter on all six, broadside without the dog-leg, Ligeia"
== git diff --stat 2f99b0f 3a1be08
 shots/pkg-17/probe-tac-1280.json                   |  731 +++++++++++++
 shots/pkg-17/shot.mjs                              |   41 +
 src/battle/view/Skirmish.tsx                       |   21 +-
 src/battle/view/comms/comms.css                    |   12 +-
 src/battle/view/comms/controller.ts                |   43 +-
 src/battle/view/comms/numbers.ts                   |    6 +-
 src/battle/view/comms/pick.test.ts                 |   53 +
 src/battle/view/comms/pick.ts                      |   39 +
 src/battle/view/scene.ts                           |   20 +-
 src/battle/view/skirmish.css                       |   16 +-
 src/battle/view/tactical/tactical.css              |   13 +
 61 files changed, 7760 insertions(+), 19 deletions(-)
```

Lock: taken 19:34:14 (free after PKG-18's), deleted after this report merge.

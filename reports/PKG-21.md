# PKG-21: entry and input (title entry, commits, roster, camera, phone tactical, enemy list, escort warning)

Seat: Talos with Zeuxis. Branch `claude/pkg-21`, launch tip `59003b6`. Played 2026-10-21 21:10 to 2026-10-22 11:50 (the
machine slept in between; Daedalus resumed the package at 02:20). Dev server `npx vite --port 5231 --strictPort --host ::1`,
not 5221: port 5221 was held by a TRC-03 Vite process (`worktrees\trc-03`, pid 57212, started 2026-10-21 16:51) that
is not mine, so I left it running and used 5231.

**How it was measured.** Headless Chrome on the real GPU (ANGLE D3D11) over DevTools, as PKG-17 did. Every click is a
real mouse event (`Input.dispatchMouseEvent` move, press, release) and every key a real key event
(`Input.dispatchKeyEvent`), aimed at DOM elements by their rectangles or at ships by the probe's screen projection.
The probe was used only to step time (`advance`, with `time.scale` 0) and to read state. Driver:
`shots/pkg-21/play.mjs`; one scenario per finding in `shots/pkg-21/scen/`. Every scenario ran on the launch tip code
first (`before-*`) and on the changed code after (`after-*`), same seed (1), same clicks. Each run's raw result is in
`shots/pkg-21/{before,after}-<scenario>-<width>.json` (or quoted below where it only printed).

## What I measured (before) and what I changed

**F-01 (BLOCKER).** Before: the title at `/` offered `New game, Peoples of the System, Settings` at 1280 and 375
(`before-f01-1280-title.jpg`, `before-f01-375-title.jpg`, `before-f01-800.json`). Changed: `src/flags.ts` the
`skirmish` line (`on: true`, note updated); `src/components/GameView.tsx` the `flagOn` import (line 6) and the entry
under *New game* in the title menu (lines 562-563): **Fleet battle**, shown while the flag is on, which opens
`?skirmish` (the voyage save is never touched; `?skirmish` keeps working). After, at 1280, 800 and 375: the menu
reads `New game, Fleet battle, Peoples of the System, Settings`; a real click on *Fleet battle* lands on `/?skirmish`
with `House of Kleisthenes 12/12 · House of Ganymede 12/12` (`after-f01-<w>-title.jpg`, `after-f01-<w>-battle.jpg`).

**F-05 (Boarding run would not commit) and TRC05-7 (the refusal never showed).** Root cause, measured: only the
capital and the carrier have a boarding hangar. For any other ship, PKG-10's plan refuses the Boarding run (`no
boarding hangar in the group`); the picker stayed in its *target* stage with the target set, the Commit button was
disabled, Enter called a commit that returned null, and the panel kept saying "Click an enemy ship for the target".
Before (1280, QA's run-4 clicks: Agora, Boarding run, Herald, Enter, Commit): stage `target` after each, `last` null,
and a pick left open survived the battle's end (`before-f05-1280-*.jpg`; Kleros's Flanking arc was still in the bar
behind DEFEAT in `before-f05-1280-battle-end.jpg`).
Changed (`tactical/picker.ts`, `tactical/mount.ts`, `tactical/ManeuverMenu.tsx`, `tactical/numbers.ts`
`noticeMs`, `tactical/tactical.css`):
- a new picker stage `refused`: target chosen, no ship can fly it. The panel says why in amber ("Agora cannot fly the
  Boarding run: no boarding hangar in the group. Enter or Commit closes this; Esc cancels.").
- Enter, the Commit button and a second click on the target all go through one `commitAndSay`: a ghost commits as
  before; a refusal closes the pick, spends no points, and the reason stays on screen for 4.5 s (`.tac-notice`); with
  no target yet the panel says "Click an enemy ship for the target first." and stays open.
- a maneuver the selected ship can never fly says so on its button ("Boarding run · no hangar", title has the reason);
  it still opens, so the panel can say it too.
- the pick is cancelled the moment the battle has an outcome (in `step()` and on every draw).
- `.tac-panel` sits above the comms queue (at 800 the queue's first card covered the Commit button).
After, 1280 and 800: Agora → stage `refused` with the reason on the panel; Enter → `idle`, notice "Agora cannot fly
the Boarding run: no boarding hangar in the group."; Astu (capital) Boarding run on Herald → ghost 4:04, the **Commit
button** orders it (`order: {kind: maneuver, name: boardingRun, target: e5, side: fore}`); a Flanking arc left open is
gone at DEFEAT (`after-f05-<w>-*.jpg`, `after-f05-<w>.json`). At 800 Herald was under the crew chips, so the target
came from the new enemy list (below): `"heraldUnder":"cx-chips"`, `viaList: "Herald escort · under a panel"`.
Unit tests, one per maneuver kind: `tactical/picker.test.ts` (all six commit and clear; refused Boarding run; no
target; `cannotFly`).

**F-13 (roster reflow).** Before (seed 1, 1280 and 800): Pnyx was taken by 2:45; the cards after it slid left, and a
real click where Bema had been selected **Agora**, and the Flanking arc opened for Agora (`before-f13-<w>.json`,
`before-f13-1280-roster-click.jpg`). Two causes: a captured ship leaves his list, and `rosterOf` sorts out-of-field
ships to the end. Changed: `src/battle/view/input/roster.ts` (new): every card keeps the slot it first had; a ship
that left keeps its slot greyed and disabled, reading "Taken"; a prize takes a new slot at the end. Used in the roster
strip of `comms/CommsHud.tsx` (the `<ul>` map and the card's class/disabled/word lines). The maneuver buttons now get
the ship the bar names (`ManeuverMenu ship=`, `hooks.choose(name, target, ship)`), never a re-read of the selection.
After: `Astu ★, Kleros, Pnyx(out), Bema, Agora, …`; the click at Bema's old x selects **Bema**, the bar says Bema and
the Flanking arc opens for `p3` (Bema), at 1280 and 800 (`after-f13-<w>.json`, `after-f13-<w>-roster-*.jpg`).

**F-12 (Guns on… miss).** Before: armed state was there (button `aria-pressed=true`, the crew-panel line) but a click
on empty sky said nothing, and Esc did not stand it down (`armed` still set after Esc) (`before-f12-<w>.json`).
Changed: `src/battle/view/input/armed.ts` (new): while an order is armed, a banner over the battle "Guns on… click
an enemy ship · Esc stands down" and a crosshair cursor; a click that picks no ship shows "Missed: no ship there.
Click on an enemy ship." at the pointer for 2.2 s, the order stays armed. `Skirmish.tsx` key handler: Esc closes an
armed order or menu first, then clears the selection. After, 1280 and 800: banner on; miss line shown; after Esc
`armed: null`, banner gone (`after-f12-<w>.json`, `after-f12-<w>-armed.jpg`, `-miss.jpg`).

**F-11 (camera tilted on its own; R did not restore it).** I could not make the tactical camera tilt in a do-nothing
run: pitch held 1.18 from 0:05 to 2:00 (24 probe reads). What does tilt it with no drag, measured: a press on the canvas
whose release does not reach the canvas leaves `drag` set, and every hover move then orbits. Before: 25 hover moves
took pitch from 1.18 to **-0.548** (edge-on, QA's picture); R in the tactical view then went to the *normal* opening
framing (pitch 0.17, dist 175), not the tactical one (`before-f11-<w>.json`). Changed (`Skirmish.tsx`): a move with no
button held ends the drag; R, when it is the camera key and the table is open, calls the new `tac.resetView()`
(`mount.ts`: the tactical camera as T set it: pitch 1.18, yaw across the lines, hold-both-fleets distance); outside
the tactical view R is the old reset. After, 1280 and 800: hover moves leave pitch at 1.18; tilted to 0.46 by arrows,
R gives 1.18 / yaw -1.583 / dist 389 (the open view); normal view R gives 0.17 / 0.5 / 175 (`after-f11-<w>.json`).
The `setPointerCapture` page error in both runs comes from the scenario's own synthetic `pointerdown` (pointer id 7 is
not a live pointer), not from the game.
Whether QA's tilt had this cause: **not proven**. It is the one path I found that tilts the view with no drag.

**F-15 (no tactical on a phone).** Before at 375: no button with "Tactical" anywhere. Changed: `mount.ts` adds a
*Tactical* button (`.tac-toggle`) to the stage; `tactical.css` shows it at ≤760 px or on a coarse pointer, bottom
right beside *Fleet*, hidden while the fleet panel or the end card is open; it reads *Close tactical* while open.
`skirmish.css`: the phone help line's right edge moves from 112 px to 210 px to clear it. After at 375: a real tap
opens the table (`on: true`), a second tap closes it, page width 375 (no overflow) (`after-f15-375-*.jpg`).

**PKG-17's request (order an enemy he cannot click).** Before at 800: 7 of 12 enemies were under a panel at 0:20
(`before-orders-800.json`); there was no other way to reach them. Changed: `src/battle/view/input/EnemyList.tsx`
(new), mounted in the roster strip: *Enemy ships 12* opens a list of every enemy in the field, each marked *off
screen* or *under a panel* when it is. A row does what a click on that ship does: target for a maneuver being chosen,
fires an armed crew order, or opens the order menu beside the list with a ship selected. After, 800: Companion (under
the crew chips) picked from the list, menu opened, *Attack* ordered: `order: {kind: attack, target: e1}`
(`after-orders-800-*.jpg`). Same at 1280 and 1244x608 on Ganymede.

**PKG-16's request / TRC05-5 (escort leaves the screen).** Changed: `src/battle/view/input/escort.ts` (new) and one
line in the order menu of `CommsHud.tsx`; the same line in the maneuver panel (`mount.ts`). An escort still screening
the flagship (escort class, standing order follow) shows "Escort leaves the screen: the flagship loses her screen."
in amber before the commit; nothing blocks the order. After: Kleros on Ganymede/Companion shows it, Attack still goes
(`after-orders-<w>-escort-menu.jpg`). A cruiser shows nothing (`input/input.test.ts`).

**TRC05-4 (order bar over the crew panel at 1244x608; Escape).** Before: with Bema selected, the master of guns' button
was under `.cx-orders` (`"clickable": false, "top": "cx-orders"`), and Esc left `p3` selected
(`before-orders-1244-crew-with-selection.jpg`). Changed (`skirmish.css`, desktop only): the order bar stops 316 px
short of the right edge and the crew panel sits above the strip; Esc clears the selection (above). After at 1244x608:
*All guns on Ganymede* clickable, Esc → selection `null` (`after-orders-1244-crew-with-selection.jpg`). Same at 1280
and 800.

**40-click run, as PKG-17's** (`shots/pkg-17/clickrate.mjs 1280 720 normal 40`, `BASE=[::1]:5231`): **40/40 (100%)**,
5 enemies skipped as under a panel (PKG-17 after: 40/40, 0 skipped). Raw: `shots/pkg-21/after-clickrate-1280.json`.
Those 5 can now be ordered from the enemy list.

## Script steps

| Step | Result |
|---|---|
| Phase A done point 1 from the title screen (title entry clicked from `/` at 1280, 800, 375) | pass |
| EXP-03 maneuver commits (all six kinds, unit; Boarding run by Enter and by the Commit button in the UI) | pass |
| EXP-06 step 6: orders land on the ship meant (F-13 slot click; maneuver for the ship the bar names) | pass |
| F-05 bar clears on commit, cancel, battle end | pass |
| F-12 armed state visible; miss says so; Esc stands down | pass |
| F-11 R restores tactical and normal default; no tilt from hover | pass (QA's original trigger not proven, see above) |
| F-15 Tactical button at 375 | pass |
| PKG-17 request: order an enemy under a panel / off screen | pass (under a panel, 800); off screen: wired, list marks it, not exercised (none was off screen at seed 1 0:20) |
| PKG-16 request / TRC05-5: escort warning | pass |
| TRC05-4 layout and Escape at 1244x608 | pass |
| TRC05-7 refusal reason on screen | pass |
| 40-click run at 1280 | pass, 40/40 |

## Flag, save

Flag `skirmish`: **on**. Save: voyage save shape unchanged; the save fixture test passes in the full run.

## Still broken / not mine

- **TRC05-7, pods not launching:** "a boarding-run maneuver flew 4:35 and ended without launching pods". Not
  reproduced or changed here; that is `src/battle/sim/maneuvers/**` (Requests).
- The order bar at 800 now wraps to more rows (it stops short of the crew panel). It covers more of the battle's
  bottom edge while a ship is selected.

## Requests

1. **Sim owner (maneuvers):** TRC05-7's Boarding run that flew to its end without launching pods. Check
   `stepManeuvers` → `launch()` for a run whose board leg is passed while the target side is up (the refusal goes to
   the log as `commsRefused`; whether the comms queue shows it is PKG-22's).
2. **PKG-22 (comms):** I touched `comms/CommsHud.tsx` only in the roster strip and the order menu, as this package
   names them as mine: the imports (4 lines), the `useStableRoster` line, the two `<ManeuverMenu ship=…>` props, the
   `<EnemyList>` line, the roster `<ul>` map (slots, `in-gone`, `disabled`, "Taken"), and the escort warning line.
   `rosterOf` in `comms/logic.ts` still sorts out-of-field ships last; the strip no longer depends on that.
3. **Daedalus:** port 5221 is held by a TRC-03 Vite (pid 57212, since 2026-10-21 16:51). Not mine to stop.

## Assumed, for Caleb to overrule

- The entry is called **Fleet battle** and sits second, under *New game*. It loads the page at `?skirmish`, so the
  browser's Back returns to the title.
- A Boarding run from a ship with no hangar still opens (with "· no hangar" on the button) instead of being greyed
  out, so the reason is said where the pick is made.
- The Tactical button shows on phones and touch screens only; desktop keeps T and the help line.
- A refused maneuver costs nothing and does not go to the captain as an order.

## Evidence

### Acceptance on the merged branch (claude/game @ 5bbedd0 merged into claude/pkg-21 as f7414c6)

```
== 2026-10-22T12:11:55-07:00 acceptance on claude/pkg-21 @ f7414c6 (merged claude/game)
== npx tsc -b
tsc: clean
== npx vitest run --maxWorkers=4
   Start at  12:12:27
   Duration  51.09s (tests 86%, import 10%, transform 3%, worker 1%)

    Isolate  73 workers spawned · ~333ms startup each (spawn + environment, per file)
             at least ~5.75s faster with isolate: false — reuses workers across files instead of one per file

== npm run lint
✖ 18 problems (7 errors, 11 warnings)
  1 error and 1 warning potentially fixable with the `--fix` option.

== npm run build
✓ built in 1m 20s
precache  40 entries (2829.86 KiB)
== npm run smoke
[75.5s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":21,"shots":639,"movedBySide":[11,10],"drawCalls":169} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[81.1s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (81.1s)
== npx vitest run --maxWorkers=4 (summary lines, re-read)
 Test Files  73 passed (73)
      Tests  925 passed (925)
```

Lint: 18 problems (7 errors, 11 warnings), the same 18 as on the launch tip with my changes stashed (all in voyage files: `Voyage.tsx`, `armourScene.ts`, `boarding.ts`, `swarms.ts` and others); none in a file this package touched.

Re-played on the merged code at 1280 (`shots/pkg-21/merged-{f05,orders,f12}-1280.json`): Agora refused with the reason on screen, Astu's Boarding run ordered, the pick gone at DEFEAT; escort warning shown and Attack ordered (`{kind: attack, target: e6}`); guns clickable with a ship selected, Esc clears it; a miss says so, Esc disarms. No page errors.

### Gate (game worktree, after `Merge PKG-21` a04e81b; A7: vitest --maxWorkers=4)

```
== 2026-10-22T12:22:12-07:00 gate in game worktree @ a04e81b
== npx tsc -b
tsc: clean
== npx vitest run --maxWorkers=4
 Test Files  73 passed (73)
      Tests  925 passed (925)
== npm run build
✓ built in 18.36s
precache  40 entries (2829.86 KiB)
== npm run smoke
[20.8s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":21,"shots":639,"movedBySide":[11,10],"drawCalls":169} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[25.7s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (25.7s)
== end 2026-10-22T12:25:07-07:00
== git log --first-parent -3 (claude/game)
a04e81b Merge PKG-21: Fleet battle on the title (skirmish on), maneuver commits and refusals said, stable roster, armed/miss feedback, camera R and stuck-drag fix, phone Tactical, enemy list, escort warning
5bbedd0 Daedalus: A10 (keep-awake, live lock); PKG-19 ruled; PKG-23, PKG-24
8688737 Merge PKG-20: report evidence
== git diff --stat a04e81b^1 a04e81b
 reports/PKG-21.md                                  | 195 ++++++++
 .../pkg-21/after-f11-1280-tactical-after-hover.jpg | Bin 0 -> 166824 bytes
 .../pkg-21/after-f11-800-tactical-after-hover.jpg  | Bin 0 -> 104734 bytes
 .../after-orders-1244-crew-with-selection.jpg      | Bin 0 -> 142619 bytes
 .../after-orders-1280-crew-with-selection.jpg      | Bin 0 -> 171976 bytes
 .../after-orders-800-crew-with-selection.jpg       | Bin 0 -> 95331 bytes
 .../before-f11-1280-tactical-after-hover.jpg       | Bin 0 -> 152529 bytes
 .../pkg-21/before-f11-800-tactical-after-hover.jpg | Bin 0 -> 94626 bytes
 .../pkg-21/before-f13-1280-roster-after-leave.jpg  | Bin 0 -> 166814 bytes
 .../before-orders-1244-crew-with-selection.jpg     | Bin 0 -> 141438 bytes
 .../before-orders-1280-crew-with-selection.jpg     | Bin 0 -> 169986 bytes
 .../before-orders-800-crew-with-selection.jpg      | Bin 0 -> 95991 bytes
 .../merged-orders-1280-crew-with-selection.jpg     | Bin 0 -> 171973 bytes
 src/battle/view/Skirmish.tsx                       |  22 +-
 src/battle/view/comms/CommsHud.tsx                 |  19 +-
 src/battle/view/input/EnemyList.tsx                |  58 +++
 src/battle/view/input/armed.ts                     |  70 +++
 src/battle/view/input/escort.ts                    |  26 +
 src/battle/view/input/input.css                    |  46 ++
 src/battle/view/input/input.test.ts                |  54 +++
 src/battle/view/input/roster.ts                    |  37 ++
 src/battle/view/skirmish.css                       |   9 +-
 src/battle/view/tactical/ManeuverMenu.tsx          |  25 +-
 src/battle/view/tactical/mount.ts                  |  82 +++-
 src/battle/view/tactical/numbers.ts                |   3 +
 src/battle/view/tactical/picker.test.ts            |  66 +++
 src/battle/view/tactical/picker.ts                 |  72 ++-
 src/battle/view/tactical/tactical.css              |  27 ++
 src/battle/view/view.test.ts                       |  10 +-
 src/components/GameView.tsx                        |   3 +
 src/flags.ts                                       |   2 +-
 162 files changed, 1601 insertions(+), 51 deletions(-)
 (plus 131 files under shots/pkg-21/)
```

Lock: taken 12:11 (free when I came to it after PKG-19's and PKG-22's merges), time line rewritten at each gate step, deleted after this evidence merge. Dev server on 5231 stopped, browser tab closed.

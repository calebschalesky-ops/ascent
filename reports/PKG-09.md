# PKG-09: comms UI (report)

Seat: Talos, with Zeuxis's eye for the panel. Branch `claude/pkg-09`, base `claude/game` @ 3dacf09, merged with the game
tip 5c4e71e (PKG-11's director) before the gate. Date 2026-10-21. Port 5209 at `http://[::1]:5209/?skirmish&probe`.

## What I measured

- **Every EXP-02 step but 8 and 9 passes on screen**, played with real clicks and real keys in the in-app browser at
  1024 × 768 (real `q`, `e` and `Tab` key presses all reached the handler; no synthetic event was needed). Seed 2, time
  paused with `act('time.scale', {scale: 0})` and stepped with `advance`, so each screenshot shows one state.
- **EXP-05 on seed 5:** an ordered boarding through an open side, a deflection at a side still up, and a capture that
  turned the cruiser *Sceptre* into a prize in the roster. Steps 5 and 6 have caveats (table).
- **Step 8 does not hold:** the order lands (flagship split port 0.85, engineering answers) and 0.2 s later the flag
  captain re-trims to fore 0.55 on his own (`decision: "shift shield power to fore", why: "Judgement 10"`, t 30.2). That
  is the sim's captain logic, outside my files: see Requests.
- **Bench** (`__probe.bench({frames: 300})`, merged before PKG-11): 128 draw calls, 70,340 triangles against 131 /
  71,508. The order lines and rings are an SVG overlay, so they add no draw call.
- **375 px:** the queue, its answer buttons and the Q/E/R keys are legible; roster and crew fold behind a "Fleet"
  toggle. Contrast, computed from the tokens on the composited panel colour (≈ #090c1a): status text `--hud-dim` 7.4:1,
  urgent text `--hud` on the red-tinted row 11.8:1, the red level word `--danger` on that row 5.1:1, initials `--night`
  on the house orange #ff8a1e about 9:1.
- **Console:** no errors through the whole session; probe `errors: []`.

## What I built

All new, in `src/battle/view/comms/`:

| File | What |
|---|---|
| `logic.ts` | Pure reads of the battle: queue rows (PKG-06 `queue()` plus portrait initials, mood colour, keys only on the selected report, timeout fraction), the roster (one card per own ship, prizes included), the status word as the captain last *reported* it (a hull figure in his own words, Candour-shaped, never the true number), costs, standing order lines, the order menu, the shield split steps. |
| `controller.ts` | Selection, targeting, the order menu, armed crew orders, the `cue('urgent')` stub, picking (raycast on the scene's ship groups, then nearest projected centre within 30 px), the SVG overlay (order lines in house colour, a ring on the selection, a dashed red ring on the target), the probe source `comms`. Every order goes through `command()`, every answer through `answerTop()`, Tab through `tabNext()`. |
| `CommsHud.tsx` | The queue (left), the command meter at its head with the cost under the cursor, the flagship's crew (right), the roster strip and the selected ship's plain orders (bottom), the order menu and the ping menu. |
| `comms.css` | Tokens only. Red urgent, amber decision, grey status. |
| `numbers.ts` | The UI's first-pass numbers (shield step 0.15, floor 0.05, click slop, pick radius, notice time, status rows shown). |
| `comms.view.test.ts` | 8 tests: portraits, keys only on the selected row and the timeout fraction, the roster word is the reported figure, a prize joins the roster, costs match `command()`, an order line stands only while the order does, split steps sum to 1 and keep the floor, the board option only on a ship with pods. |

Outside `comms/`, the lines the package names as mine:

- `Skirmish.tsx`: imports and mount lines (controller made with the view, `refresh()` in `pushHud`, `reset()` on
  restart, `dispose()` on unmount, `<CommsHud>` mounted); the key handler block (Q, E, R, Tab; no modifier keys);
  probe verbs `answer {i}`, `tab`, `select {ship}`, `target {ship}`, `orderUI {ship?, kind, target?, side?, maneuver?,
  task?, shield?, all?}`, `ping {ship}`, all through the controller's own methods.
- `scene.ts`: one line, `camera.userData.shipGroups = () => [...]`, the lookup the picker and the overlay read.
- The merge with PKG-11 conflicted only on mount lines in `Skirmish.tsx` (imports, construction, reset); kept both.

## Script steps

| Step | Status | Evidence |
|---|---|---|
| EXP-02 1 (queue on screen; a report within 30 s with portrait, name, ship, mood, 2–3 answers) | pass | `exp02-step1-queue-urgent-portrait-1024.jpg`; seed 2 at 0:01, Livia Laskaris, Agora, strained, 3 answers |
| EXP-02 2 (urgent red above amber; status folded) | pass | `exp02-step2-urgent-above-decision-status-folded.jpg`; 0:10, two urgents over the decision, flag lieutenant's fold last |
| EXP-02 3 (Q answers the top; captain acknowledges; behaviour changes) | pass | `exp02-step3-after-Q-closed-ack-standfast.jpg`; real `q`: Stand fast, Ekklesia morale 43.2 → 49.2, "Aye. We stand, as best we can."; an order-bearing answer on the same path (click on "Fall back on the flagship"): p8 `order = followFlagship`, stance `follow` |
| EXP-02 4 (Tab, then E answers the second report with its second option) | pass | `exp02-step4a-after-Tab-second-selected.jpg`, `exp02-step4b-after-E-second-answered.jpg`; real `Tab` then `e`: `commsAnswer {report 2, answer 1, "Carry on", by admiral}` |
| EXP-02 5 (probe: an unanswered decision times out; the choice came from Judgement and trait) | pass | `exp02-step5-timeout-captain-chose-carry-on.jpg`; report 18 (shieldDown, Stoa) closed by itself at 48.67 with 6.67 s shown on first sight; `timeoutDecisions`: `choice carryOn, trait Ambitious, why "Judgement 4"`; comms: "No reply from the flagship. Carrying on." |
| EXP-02 6 (select a ship, select an enemy, attack; order line; acknowledgement) | pass | `exp02-step6a-select-kleros-click-europa-order-menu.jpg`, `exp02-step6b-attack-order-line-ack-points-4.jpg`; roster click on Kleros, scene click on Europa, Attack: p1 `attack e11`, line drawn, "Aye, Admiral. Engaging Europa.", points 5 → 4 |
| EXP-02 7 (master of guns: all batteries on a chosen enemy) | pass | `exp02-step7-8-guns-on-europa-all-port-officers-answer.jpg`; flagship `stance.target = e11`, crew guns `on e11`; every flagship shot in the next 4 s at e11 (3 of 3); "Guns on Europa, aye." |
| EXP-02 8 (shields and engineering: everything to port) | wired-but-unproven | same shot: split port 0.85, others 0.05, "Power shifted. The port side is heaviest now."; the flag captain re-trims to fore 0.55 at +0.2 s (Requests) |
| EXP-02 9 (flag captain: a maneuver) | wired-but-unproven (as the package says) | `exp02-step9-helm-cross-their-bow-ack.jpg`; crew `helm = crossBow`, "Crossing their bow, aye. Bringing her round."; nothing flies it yet (EXP-03) |
| EXP-02 10 (pods at a target; fighters screen them) | pass | `exp02-step10a-pods-away-for-europa.jpg`, `exp02-step10b-fighters-tasked.jpg`; `boardLaunch {ship p6, target e11, pods 6, ordered true}`, "Pods away for Europa."; fighter task `screen`, then `escort`, each answered by fighter command (the task is stored; fighters are a later package) |
| EXP-02 11 (cannot steer another ship by hand) | pass | `exp02-step11-drag-and-arrows-turn-camera-only-two-order-lines.jpg`; a real drag starting on Kleros and a real ArrowLeft: orders 32 → 32, every ship heading unchanged, camera yaw changed |
| EXP-02 12 (command points pace orders; refusal with a reason) | pass | `exp02-step12a-meter-cost-under-cursor-not-enough.png` (hover: "costs 1 · not enough" at 0.4), `exp02-step12b-refused-bridge-saturated.jpg`: `commsRefused "The bridge is saturated. 1 needed, 0.4 ready."` in the queue |
| EXP-05 1 (fire on one side; that side falls) | pass | real clicks: Pnyx and Bema focus Sceptre fore at 0:25 plus guns on (`exp05-seed5-step1a-two-ships-focus-sceptre-fore.jpg`); Sceptre turned the fore away (step 2) and her starboard fell to 0 at 0:41. Second run, same seed, orders through `orderUI`: Kleros and Lot focus Europa port, port = 0 at 1:47 |
| EXP-05 2 (probe: the enemy shifts power or turns) | pass | Sceptre split fore 0.55 → starboard 0.55 at 0:36 and heading −2.74 → −0.12 rad over 0:30–0:45 |
| EXP-05 3 (board at a side still up: deflected) | pass | `exp05-seed5-step3a-flagship-board-menu-on-sceptre.jpg`; Astu, Board → Port at 1:05 (port 135): `boardDeflected {group 7, side port}` at 1:24.8; the marine commander's line folds into the flag lieutenant's summary |
| EXP-05 4 (board at the open side: pods cross; marine commander reports) | pass | Kraken Mare, Board → Stbd at 0:41 (starboard 0): `breach {group 5, side starboard, marines 90}` at 1:00; "Kraken Mare has launched boarders at Sceptre.", "Breach on Sceptre. Marines are aboard." Pods lost to point defence seen in the Europa run (`boardLost 15` at 1:56.7); the 2.5 s breach time is not separately measured here |
| EXP-05 5 (the fight inside; enemy gunnery drops) | wired-but-unproven | fight reports reach the fold ("Deck fight on Sceptre. Holding."); Sceptre's shots: 7 in the 10 s before the breach, 8 in the 10 s after, so a drop is not shown by shot count |
| EXP-05 6 (answer a reinforce/pull-back decision) | pass on screen, with a gap | `exp05-seed5-step6-marine-commander-reinforce-pullback.jpg`; the marine commander's row offers Reinforce / Pull back while our marines fight inside; Reinforce at 1:35 launched `{reinforcing: true}`. The queue itself raises no such decision (Requests) |
| EXP-05 7 (the ship strikes and joins his fleet and roster) | pass | `exp05-seed5-step4-7-ordered-board-starboard-captured-prize.jpg`, `exp05-seed5-step7-sceptre-prize-in-roster-house-colours.jpg`; Sceptre `side player, prize true` at 1:21, roster card "Sceptre · prize" in the house colour, header 10/13, crew 60 of 200 |
| EXP-06 2–3 (losses and the flagship's loss seen through reports) | wired-but-unproven | the lines exist (enemy breaks, strikes and "takes … by boarding" in the ticker; "Sceptre is captured." from the marine commander). One attempt on seed 6 on 2026-10-21 (every ship ordered onto the enemy flagship from 0:20) broke our own fleet at 1:45 before any enemy loss; re-test costs one session with a better plan |
| Ping (right-click a card → "Status?") | pass | `ping-rightclick-pnyx-status-sound.jpg`; "Hull 100%. Engaged.", card word "Sound" |
| 375 px | pass | `phone-375-queue-and-keys.jpg`, `phone-375-fleet-toggle-open.jpg` |
| Layout with PKG-11's director | looked at | `merged-with-director-layout-1024.jpg`; the crew panel starts below the picture-in-picture's largest box |

## What is still broken or missing

- EXP-02 8: the flag captain overrides an engineering split within 0.2 s (sim; Requests).
- EXP-05 5: no visible gunnery drop by shot count in one 10 s window.
- EXP-05 6: the queue carries no reinforce/pull-back decision; the buttons live in the marine commander's row.
- The queue is 380 px wide and covers the left of the battle at 1024; a ship there can only be picked from the roster.
- A notice (refusal) shows 4 s; the queue keeps the line, so nothing is lost, but the notice can expire before a look.
- The marine commander once said "We lost the decks on Sceptre. She is taken." for *our* capture (line data, Requests).

## Flag, save

Flag: none added; `skirmish` stays off (the UI shows under `?skirmish` only). Save version: unchanged.

## Requests

- **Captains (PKG-02's `captains.ts`, owner of the shield trims):** while the flagship's engineering has a standing
  `shieldPower` order, the flag captain should not re-trim the split (EXP-02 step 8). Today `decision "shift shield
  power to fore"` lands 0.2 s after the order.
- **PKG-06 comms sim:** a decision report from the marine commander while the player's marines fight inside an enemy
  ship, answers Reinforce (`board` at that target) / Pull back (`pullBack`) / Carry on (EXP-05 step 6), so Q/E/R reach it.
- **PKG-06 / Kalliope lines:** the `captured` marine line for a capture *by* the player read as a loss once ("We lost
  the decks on Sceptre. She is taken."); and the fold repeats "Marines engaged aboard Sceptre." twice in one summary.
- **Daedalus, keys:** R answers the third option only when the selected report has one, otherwise it stays the camera
  reset; Tab is taken by the queue (default prevented), so it no longer moves keyboard focus between buttons.
- **PKG-11 director:** the crew panel clears the picture-in-picture by its numbers (top 92, width clamp 168–380 px at
  30%, 16:10) through `--pip-clear` in `comms.css`; if those numbers change, that line follows.

## Assumed, for Caleb to overrule

- Layout: queue left (380 px), crew panel right under the picture-in-picture, roster strip and the selected ship's plain
  orders along the bottom, the old event ticker between queue and crew (hidden under 980 px).
- Placeholder portraits: initials on the house colour with a ring in the mood colour.
- Right-click on a roster card for "Status?" (a "Status?" button also sits in the selected ship's bar).
- Shield control: a click moves 15% of the split toward a side, shift-click or "All <side>" puts 85% there, "Even"
  resets; the UI never powers a side below 5%.
- Status lines: three shown plus the flag lieutenant's summary; decisions and urgents always shown.
- Mood colours: confident green, steady cyan, strained amber, panicked red, defiant silver.

## Evidence

Acceptance on the merged branch (claude/pkg-09 @ ed7e4f0 = PKG-09 + claude/game @ 5c4e71e), after the last code edit:

```
$ npx tsc -b
2026-10-21T16:23:02-07:00
tsc -b: clean

$ npx eslint src/battle/view/comms src/battle/view/Skirmish.tsx src/battle/view/scene.ts
2026-10-21T16:23:24-07:00
eslint (my files): clean

$ npx vitest run
2026-10-21T16:23:31-07:00
 Test Files  60 passed (60)
      Tests  788 passed (788)
   Start at  16:23:35

$ npm run build (tail)
2026-10-21T16:23:59-07:00
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js

$ npm run smoke (tail)
2026-10-21T16:24:40-07:00
[21.8s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":22,"shots":486,"movedBySide":[11,11],"drawCalls":66} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[26.4s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (26.4s)
```

Bench, in-app pane before the merge: `{"calls":128,"triangles":70340,"geometries":80,"textures":16,"medianMs":32.2,"p95Ms":54.2}`.

Screenshots: `shots/pkg-09/` (24 files, named by step).


## Gate (game worktree, after `Merge PKG-09` 665fc9f)

```
$ git log --first-parent -3 (claude/game)
665fc9f Merge PKG-09: comms UI (queue with Q/E/R/Tab, roster strip, direct orders and order lines, flagship crew panel, command points meter, ping)
5c4e71e Merge PKG-11: report evidence
2180f74 Merge PKG-11: director camera (event shot list, gives way on input, 8 s hand-back, picture-in-picture), director flag on

$ git diff --stat 5c4e71e 665fc9f
 shots/pkg-09/phone-375-fleet-toggle-open.jpg       | Bin 0 -> 56712 bytes
 shots/pkg-09/phone-375-queue-and-keys.jpg          | Bin 0 -> 75847 bytes
 shots/pkg-09/ping-rightclick-pnyx-status-sound.jpg | Bin 0 -> 86287 bytes
 src/battle/view/Skirmish.tsx                       |  32 +-
 src/battle/view/comms/CommsHud.tsx                 | 212 ++++++++++++
 src/battle/view/comms/comms.css                    | 147 ++++++++
 src/battle/view/comms/comms.view.test.ts           | 108 ++++++
 src/battle/view/comms/controller.ts                | 373 +++++++++++++++++++++
 src/battle/view/comms/logic.ts                     | 186 ++++++++++
 src/battle/view/comms/numbers.ts                   |  15 +
 src/battle/view/scene.ts                           |   1 +
 33 files changed, 1219 insertions(+), 3 deletions(-)

$ npx tsc -b
2026-10-21T16:26:38-07:00
tsc -b: clean

$ npx vitest run
2026-10-21T16:27:02-07:00
 Test Files  60 passed (60)
      Tests  788 passed (788)
   Start at  16:27:07

$ npm run build (tail)
2026-10-21T16:27:31-07:00
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js

$ npm run smoke (tail)
2026-10-21T16:28:07-07:00
[18.1s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":22,"shots":486,"movedBySide":[11,11],"drawCalls":66} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[22.7s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (22.7s)
```

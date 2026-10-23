# TRC-03: re-score of every script on `wave-03` (68fb1a4)

Seat: Momus (trace). Date: 2026-10-21. Worktree `trc-03`, branch `claude/trc-03`. Dev server on 5221; browser: my own
headless Chrome at `http://[::1]:5221/?skirmish&probe`, real mouse and key events over the DevTools protocol (the in-app
pane opened hidden and cannot save screenshots; see `shots/trc-03/probe-log.md`). Sims run in Node from the same worktree.
Time taken: about 30 minutes, 16:48 to 17:18 PDT (sims 16:51, browser 16:53–17:10, writing 17:10–17:15, merge and gate 17:15–17:18).

## Regressions (pass at wave-02, not pass now)

1. **WORLD-02 check 7: pass → partial.** Jupiter's mean engagement range beats the Mars-style control on 5 of 10 seeds
   (was 9 of 10). Jupiter's shots now sit at 5.1–6.2 km, and so do the control's (5.1–6.2 km; at wave-02 the control
   fought at 3.8–4.8 km). PKG-08's own merge line (7772a60) says checks 6 and 7 fail after its change.

No other row went backwards. All seven wave-02 passes in EXP-01, EXP-04 s3/s6, EXP-05 s8 and WORLD-01 c1–c6 still pass.

## Scoreboard

| Script | Now | Was (wave-02) | Most important non-pass |
|---|---|---|---|
| EXP-01 fleet battle | 8 / 8 | 7 / 8 | none |
| EXP-02 command through captains | 9 / 12 | 0 / 12 | s8: "all to port" is undone by the flagship's own captain within a second |
| EXP-03 tactical view | 0 / 9 | 0 / 9 | s1: no tactical view; maneuvers have no picker or ghost line on screen |
| EXP-04 film | 6 / 6 | 2 / 6 | none |
| EXP-05 board and capture | 3 / 9 | 1 / 9 | s4: a boarding run at an open side is deflected, because the side regrows during the pods' flight |
| EXP-06 morale, win or lose | 1 / 7 | 0 / 7 | s6: three played battles, three defeats; the enemy never broke |
| WORLD-01 idle battle | 7 / 7 | 6 / 7 | none |
| WORLD-02 decisions not luck | 5 / 7 | 5 / 7 | c7 (regression): Jupiter range no longer beats the control |
| **Total** | **39 / 65** | **21 / 65** | |

Traces: `vision/traces/<script>.md`, each with a **Was (wave-02)** column. Evidence: `shots/trc-03/*.jpg` (34
screenshots), `shots/trc-03/probe-log.md` (P1–P12), `sim-WORLD-01-idle.txt`, `sim-WORLD-01-swap-nerve-judgement.txt`,
`sim-WORLD-02.txt`, the three EXP-06 play logs `exp06-s6-play-*.jsonl` and their driver `exp06-s6-play-driver.mjs.txt`.

## EXP-06 step 6, played for real

Every order went through real clicks: a roster card, the enemy in the scene, the menu button. Time was stepped
while paused.

- **Seed 6, whole fleet on the nearest enemy** (it was Ganymede, their flagship). 16 orders. After 3:25 of the whole fleet
  firing at her, Ganymede's hull was at 88%. His fleet broke at 2:50 (fleet morale 25). Defeat. Enemy lost 1.
- **Seed 6, focus fire smallest first** (Spear, Amalthea, Companion, Herald). 45 orders, 218 clicks. Spear captured,
  Amalthea wrecked, Companion withdrawn, Herald at 50% hull. His fleet broke at 3:54 ("56% of its strength gone"). Defeat.
- **Seed 7, same plan.** 43 orders. Amalthea and Companion captured, Spear struck. Broke at 3:26 (fleet morale 25). Defeat.

Best result: 3 of 12 enemy ships out of the fight. The enemy's side morale moved 2–3 points per loss, recovered, and
ended at 74.6 and 84.9. Both seeds last longer idle (6:15 and 10:30) than played. In the smallest-first runs, 34 of 79
and 28 of 71 scene clicks on a target opened the menu on nothing. Victory has not been reached on screen by any route.

## Non-pass rows by system

**Shields and engineering (EXP-02 s8).** The order is taken, then the flagship captain's own shield logic overrides it
0.9 s later. Port never grows past its cap.

**Helm and maneuvers (built in the sim, missing on screen).** EXP-02 s9 partial: "Cross their bow" is answered and logs a
crossingLine with a 484 s ETA, and the heading does not change for 72 s. EXP-03 s1–s6 missing (no tactical view, picker
or ghost line; the sim flies them, PKG-10 tests). EXP-03 s7 partial: Helm 8 finished a broadside pass 40 s sooner than
Helm 2; "tighter" was not measured here. s8 partial: order lines exist in the 3D view, with no tactical view. s9 blocked.

**Fighters (EXP-02 s10).** Pods launch on order. The fighter task is stored and answered, and no fighters exist to fly it.

**Fire on a side (EXP-05 s1, s2).** "Focus Port" on Sceptre: in 180 s no hit landed on port (fore 8, starboard 7, aft 14).
The enemy turns and shifts power. Its reaction to a side falling is untested, because the side never fell.

**Boarding at an open side (EXP-05 s4, s7).** At the moment the port read 0, the open side regrew to 102 during the 14 s
crossing, and the pods were deflected (twice, two targets). The capture on screen still only comes from unordered
launches.

**Boarding feedback (EXP-05 s5, s9).** Breach and deck fight reach the screen. Gunnery drop not measured. The end screen
still does not weigh a capture against a wreck.

**Morale and the outcome (EXP-06 s1, s2, s3, s5, s6, s7).** No wing morale. Enemy morale barely moves. All 12 ships on the
enemy flagship do 12% hull in 3:25. No ship was ever pinned. No victory. The flagship's loss again came after the break
(4:31 break, 4:43 flagship).

**Sim balance (WORLD-02 c6, c7).** c6 is 7 of 10, and every push was telegraphed: the misses are seeds with no push. c7
is the regression above.

## Defects for Daedalus (MEASURED-HERE)

| ID | Severity | What happened | Width |
|---|---|---|---|
| TRC03-1 | MAJOR | Our marine commander announces our own capture as a loss: "We lost the decks on Second Crown. She is taken." (seed 4, 0:50.9; capture by player) | 1262 |
| TRC03-2 | MAJOR | The help line says "R to reset". With a report on top, R answers its third option (sent Ekklesia back to the flagship) and the camera does not reset | 1262 |
| TRC03-3 | MAJOR | Clicking an enemy ship in the scene misses often: 34 of 79 and 28 of 71 aimed clicks opened no menu | 1262 |
| TRC03-4 | MAJOR | "All port" is overridden by the flagship's own captain within a second | 1262 |
| TRC03-5 | BROKEN | A boarding run ordered at an open side is deflected, because the side regrows before the pods arrive | 1262 |
| TRC03-6 | UNFUN | Giving orders loses sooner than giving none (seeds 6 and 7) | 1262 |
| TRC03-7 | MINOR | The event log prints raw order names: "Astu: aye, launchPods", "Astu: aye, fighters" | 1262 |
| TRC03-8 | MINOR | End screen: headline "fled 4" (at the break), table "Fled 7" (at the end); roster headers read 0/11 and 11/13 after captures | 1262, 375 |
| TRC03-9 | MINOR | The order bar keeps "Kleros → Io" after Kleros broke apart | 1262 |
| TRC03-10 | MINOR | The crew panel covers the right edge of the scene, where several enemy ships sit at the start (seed 2 at 0:20: Herald, Callirrhoe, Spear and Amalthea under it) | 1262 |
| TRC03-11 | MINOR | The end screen is not drawn while time is paused; it appears within 4 s once time runs | 1262 |

Would I hand this to a real player today? No. He can now command (EXP-02 9/12), but he cannot win, and his best play
loses faster than watching.

## Not exercised

Feel checks (Caleb's). Offline / network kill. Two tabs. The title screen without `?skirmish`. Pull back on a deck
fight. The in-app browser pane: I measured on 2026-10-21 by tabs_context that it was hidden, and its screenshots
cannot be written to `shots/`, so every UI step ran in a headless Chrome with trusted CDP input. Re-testing in the pane
costs about 20 calls.

## Requests

None. TRC-03 changes docs and images only.

## Gate evidence


Merge `52eb991` (Merge TRC-03: wave-03 re-score, eight traces, 39/65 (was 21/65), one regression WORLD-02 c7). Lock taken 17:15:39, none present before; released after the gate.

`git log --first-parent -3 --oneline` on claude/game after the merge:
```
52eb991 Merge TRC-03: wave-03 re-score, eight traces, 39/65 (was 21/65), one regression WORLD-02 c7
a09724e Daedalus: wave 4 running
0cea035 Daedalus: PKG-08 verified, wave-03, wave-4 packages
```
`git diff --stat 52eb991^1 52eb991`: 51 files changed, 773 insertions(+), 112 deletions(-) (vision/traces 8, shots/trc-03 42, reports 1: docs, images and logs only).

Gate in the game worktree on 52eb991:
```
Wed Oct 21 17:15:50 PDT 2026
$ npx tsc -b
exit 0
$ npx vitest run
 RUN  v5.0.5 <repo>


 Test Files  62 passed (62)
      Tests  815 passed (815)
   Start at  17:16:15
   Duration  48.99s (tests 85%, import 10%, transform 5%)

exit 0
$ npm run build
precache  40 entries (2752.68 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
exit 0
$ npm run smoke
[1.0s] vite on http://[::1]:5290
[BABEL] Note: The code generator has deoptimised the styling of <temp> as it exceeds the max of 500KB.
[23.8s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":23,"shots":562,"movedBySide":[11,12],"drawCalls":68} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[28.6s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (28.6s)
exit 0
Wed Oct 21 17:18:17 PDT 2026
```

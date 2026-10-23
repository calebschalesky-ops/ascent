# TRC-05: re-score of every Phase A script on the launch tip `ad81038`

Seat: Momus (trace). Date: 2026-10-21. Worktree `trc-05`, branch `claude/trc-05` (from `claude/game` @ ad81038, waves 4
and 5 folded in per A5). Dev server on 5225; browser: my own headless Chrome at `http://[::1]:5225/?skirmish&probe`,
viewport 1262x704 (as TRC-03), real mouse and key events over the DevTools protocol (`shots/trc-05/probe-log.md`). Sims
in Node from the same worktree at 10, 30 and 90 seeds (A8).
Time taken: about 60 minutes of play and writing, 20:15 to 21:12 PDT (sims 20:15–20:27 in the background, browser
20:16–21:08, writing 21:00–21:12), then the merge and gate.

## Regressions (pass at wave-03, not pass now)

1. **WORLD-02 check 3: pass → partial.** Scripted-good beats idle on 8 of 10 and 24 of 30 seeds (bars 8 and 24) but on
   **59 of 90**, bar 72, FAIL on the held-out seeds 31–90. TRC-03 judged it at 10 seeds only; at 10 it still passes.
   This is the number PKG-16 reported and Daedalus ruled a tuned-seed pass (A8), scored half until PKG-19.

No other row went backwards. Every wave-03 pass in the eight scripts still passes.

## Scoreboard

| Script | Now | Was (wave-03) | Most important non-pass |
|---|---|---|---|
| EXP-01 fleet battle | 8 / 8 | 8 / 8 | none |
| EXP-02 command through captains | 11 / 12 | 9 / 12 | s10: fighter command answers "screen" and no fighters exist to fly it |
| EXP-03 tactical view | 9 / 9 | 0 / 9 | none |
| EXP-04 film | 6 / 6 | 6 / 6 | none |
| EXP-05 board and capture | 6 / 9 | 3 / 9 | s1: "Focus Port" on Sceptre landed 36 hits on her aft and 1 on her port |
| EXP-06 morale, win or lose | 3 / 7 | 1 / 7 | s3: the enemy flagship is never taken in play; its fleet-wide drop is only proved in the sim |
| WORLD-01 idle battle | 7 / 7 | 7 / 7 | none (c6 at 90 seeds 74 of 90, bar 72) |
| WORLD-02 decisions not luck | 6 / 7 | 5 / 7 | c3 (regression): 59 of 90 on held-out seeds, bar 72 |
| **Total** | **56 / 65** | **39 / 65** | |

Traces: `vision/traces/<script>.md`, each with a **Was (wave-03)** column. Evidence: `shots/trc-05/*.jpg` (45
screenshots), `shots/trc-05/probe-log.md` (P1–P12), sim tables `sim-WORLD-01-idle-s10.txt`, `-s30.txt`,
`sim-WORLD-01-swap-s10/30/90.txt`, `sim-WORLD-02-s10/30/90.txt` (commands in `run-sims.sh.txt`), the EXP-06 play logs
`exp06-s6-play-*.jsonl`, their driver `exp06-s6-play-driver.mjs.txt`, and the CDP helpers `cdp-helper.mjs.txt`,
`order-ui.sh.txt`.

## World scripts, bar column

| Check | 10 seeds | 30 seeds | 90 seeds |
|---|---|---|---|
| WORLD-01 c1 | 10/10 [10] | 30/30 [30] | 90/90 [90] (swap run) |
| WORLD-01 c2 | 10/10 [10] | 30/30 [30] | 90/90 [90] |
| WORLD-01 c3 | 10/10 [8] | 30/30 [24] | 90/90 [72] |
| WORLD-01 c4 | 10/10 [8] | 30/30 [24] | 90/90 [72] |
| WORLD-01 c5 | 10/10 [10] | 30/30 [30] | 90/90 [90] |
| WORLD-01 c6 swap | 9/10 [8] | 29/30 [24] | **74/90 [72]** |
| WORLD-02 c1 | 10/10 [10] | 30/30 [30] | 90/90 [90] |
| WORLD-02 c2 | 10/10 [8] | 30/30 [24] | 88/90 [72] |
| WORLD-02 c3 | 8/10 [8] | 24/30 [24] | **59/90 [72] FAIL** |
| WORLD-02 c4 | 10/10 [8] | 29/30 [24] | 83/90 [72] |
| WORLD-02 c5 | 10/10 [10] | 30/30 [30] | 90/90 [90] |
| WORLD-02 c6 | 10/10 [8] | 27/30 [24] | 80/90 [72] |
| WORLD-02 c7 | 10/10 [8] | 30/30 [24] | 90/90 [72] |

## EXP-03 step 3b, by eye

`shots/trc-05/exp03-s3-broadside-ghost-before-commit.jpg` (Agora → Herald, seed 3, 0:14): one straight diagonal joins
the run, then the run is parallel to Herald's track about 5.5–6 km off, guns across. No dog-leg back to an entry point.
On this order it goes out on the planet side; a second broadside order from the same seed at 0:03 ran out on the far
side (`exp03-s8-order-lines-tactical.jpg`). The ship flew the ghost within 2.8 m and finished 0.04 s after its eta.

## EXP-06 step 6, played for real

Every order went through real clicks in the tactical view (T): a roster card, the enemy, the menu button. Time was
stepped while paused. With picking by screen distance, **none of the 153 aimed scene clicks missed its target** (TRC-03: 34 of 79 and 28 of 71).

- **Seed 6, escorts kept on their screen** (the four escorts never ordered; everyone else focus-fires the smallest enemy
  class; Astu boards open sides): 39 orders. Spear, Amalthea, Companion, Herald out. His fleet broke at 8:25. Defeat,
  but 2:35 longer than idle (6:02), and 4 enemy out against idle's 2.
- **Seed 7, every ship ordered, escorts too**: 42 orders. Broke at 2:56, defeat at 3:08, sooner than idle (4:11).
- **Seed 7, escorts kept on their screen**: 72 orders, 208 clicks. **Victory at 14:18**: "House of Ganymede broke at
  14:06: fleet morale 25". Enemy lost 5 (Amalthea captured then wrecked, Companion and Basileus wrecked, Io struck,
  Herald and Europa fled before the break), 8 broken; he lost 2. `shots/trc-05/exp06-s6-seed7-keep-escorts-end.jpg`.

This is the first victory reached on screen by any route. It matches PKG-16's finding: the same plan on the same seed
loses in 3:08 when the escorts are sent in and wins when they stay. Nothing on screen tells the player that.

## Non-pass rows by system

**Fighters (EXP-02 s10).** Pods launch on order. The screen task is stored and answered; there are no fighters to fly.

**Fire on a side (EXP-05 s1, s2).** "Focus Port" on Sceptre: in the run, port took 1 hit, aft 36. A side did fall (aft),
not the ordered one. After the aft fell, Sceptre made no decision for 15 s; the side regrew on its own.

**Boarding summary (EXP-05 s9).** The end screen still counts Ships lost and Captured without weighing them, and the
Captured row does not say by or from.

**Morale (EXP-06 s1, s3, s5, s7).** No wing morale. The enemy flagship was never taken in play (it fled with the rest at
the victory). No ship was pinned in four battles, and nothing on screen says how. Losing his own flagship again came
after the break (broke 3:01, Astu fled 3:31).

**Sim balance (WORLD-02 c3).** The regression above.

## Defects for Daedalus (MEASURED-HERE)

| ID | Severity | What happened | Width |
|---|---|---|---|
| TRC05-1 | MAJOR | "Focus Port" on an enemy cruiser lands almost all hits on another side (aft 36, port 1), so the ordered side never falls (seed 5) | 1262 |
| TRC05-2 | MAJOR | Still open from TRC03-2: the help line says "R resets the view", but with a report on top R answers its third option (sent Ekklesia back to the flagship); with no report R does reset | 1262 |
| TRC05-3 | MINOR | Still open from TRC03-7: the event log prints raw order names, "Astu: aye, launchPods", "Astu: aye, board", "Astu: aye, fighters" | 1262 |
| TRC05-4 | MAJOR | At a 1244x608 viewport, with a ship selected, the order bar covers the bottom of the crew panel: "All guns on Io" cannot be clicked, and the bar cannot be dismissed (Escape and outside clicks keep the selection). Clear at 1262x704 | 1244x608 |
| TRC05-5 | UNFUN | Ordering escorts at a target loses sooner than doing nothing (seed 7: 3:08 against idle 4:11), and the same plan with escorts left alone wins. The game never says why; a first-time player orders every ship | 1262 |
| TRC05-6 | MINOR | The marine commander says "We are outnumbered aboard Sceptre, 84 to 80" while the deck fight log has us ahead, 82 v 77 | 1262 |
| TRC05-7 | MINOR | A boarding-run maneuver flew 4:35 and ended without launching pods; Stoa's boarding run was refused ("no boarding hangar in the group") and I did not see that reason on screen | 1262 |
| TRC05-8 | MINOR | Still open from TRC03-8 in part: roster headers read "0/11" and "12/13" after captures; the end table's Captured row does not say by or from | 375, 1262 |

Fixed since TRC-03, re-tested: TRC03-1 (capture announced as a loss: now "Sceptre has struck. She flies our colours
now."), TRC03-3 (scene clicks missing: 0 of 153), TRC03-4 ("All port" undone: held 20 s), TRC03-5 (open-side run
deflected: a run at an open side breached and captured, though the side still regrew during the flight and was knocked
down again before the pods arrived), TRC03-8 headline half (the headline now names the break, not a count).
Not re-tested: TRC03-9 (order bar after a ship breaks apart), TRC03-10 (crew panel covering enemies; the tactical view
gets round it), TRC03-11 (end screen not drawn while paused; I always let time run before the end shot).

Would I hand this to a real player today? No. He can now see the field, plan a maneuver and win, but the one choice that
decides a win (leave the escorts alone) is invisible, and R still answers reports.

## Not exercised

Feel checks (Caleb's). Offline / network kill. Two tabs. The title screen without `?skirmish`. Pull back on a deck fight.
Tactical view at 375 px. The in-app browser pane: every UI step ran in a headless Chrome of mine with trusted CDP input,
so the shots could be saved; re-testing in the pane costs about 20 calls. Morale of the enemy side per loss (I logged
it at the start and the end of the winning game only); a re-play with a per-step log costs one driver edit and 4 minutes.

## Requests

None. TRC-05 changes docs and images only.

## Assumed, for Caleb to overrule

- "Keep escorts on their screen" read as: never give the four escort-class ships an order.
- EXP-03 step 7: "tighter" read as a shorter, straighter path for the same maneuver (3,517 m vs 5,481 m), since following
  error is the same for both helms.
- EXP-05 step 4 scored pass with no pods lost to point defence; the script's "some lost to PD" was not seen.
- WORLD-02 c3 scored partial (passes at 10 and 30, fails at 90) rather than missing or half a point.

## Gate evidence


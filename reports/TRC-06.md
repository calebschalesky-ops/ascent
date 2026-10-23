# TRC-06: re-score of every Phase A script on the launch tip `4b5914c`

Seat: Momus (trace). Date: 2026-10-22. Worktree `trc-06`, branch `claude/trc-06` (from `claude/game` @ 4b5914c: PKG-19,
20, 21, 22, 23 since wave-05). Dev server on 5236; browser: my own headless Chrome at `http://[::1]:5236/`, viewport
1262x704 (as TRC-03 and TRC-05), real mouse and key events over the DevTools protocol (`shots/trc-06/probe-log.md`).
Sims in Node from the same worktree at `--seeds 10` and `--seeds 30 --from 1 / 31 / 61` (A8).
Every play script was started from the title screen at least once ("Fleet battle"): EXP-01, EXP-05's second capture and
the seed 7 victory.
**Time taken:** about 55 minutes, 13:05 to 13:59 PDT: sims 13:06–13:12 in the background; browser 13:07–13:41;
writing 13:25–13:44; waiting on PKG-25's lock 13:45–13:49; merge and two gates 13:49–13:59.

## Regressions (pass at wave-05, not pass now)

1. **WORLD-01 check 6: pass → fail.** Swapping the captains' Nerve and Judgement changes the battle on 9 of 10, 29 of
   1–30, 24 of 31–60 and **23 of 61–90 (bar 24)**. TRC-05 judged it on 1–90 pooled (74 of 90, bar 72; pooled now it is
   76 of 90). The held-out block 61–90 is the judge Daedalus ruled on 2026-10-22 for PKG-19 (29/23/22), so it scores
   FAIL. The code moved too: two of my block counts are one higher than his, after PKG-23's end check.

No other row went backwards. WORLD-02 check 3 went from partial to FAIL by the same ruling, at the same zero points.

## Scoreboard

| Script | Now | Was (wave-05) | Most important non-pass |
|---|---|---|---|
| EXP-01 fleet battle | 8 / 8 | 8 / 8 | none |
| EXP-02 command through captains | 11 / 12 | 11 / 12 | s10: fighter command answers "screen" and no fighters exist to fly it |
| EXP-03 tactical view | 9 / 9 | 9 / 9 | none |
| EXP-04 film | 6 / 6 | 6 / 6 | none |
| EXP-05 board and capture | 6 / 9 | 6 / 9 | s1: "Focus Port" on Sceptre lands 31 hits on her aft and 1 on her port |
| EXP-06 morale, win or lose | 3 / 7 | 3 / 7 | s3: the enemy flagship is never taken in play |
| WORLD-01 idle battle | 6 / 7 | 7 / 7 | c6 (regression): 23 of 30 on held-out seeds 61–90, bar 24 |
| WORLD-02 decisions not luck | 6 / 7 | 6 / 7 | c3: 19 of 30 on 61–90, bar 24 |
| **Total** | **55 / 65** | **56 / 65** | |

Traces: `vision/traces/<script>.md`, each with a **Was (wave-05)** column. Evidence: `shots/trc-06/*.jpg` (67
screenshots), `shots/trc-06/probe-log.md` (A–F, W, R), sim tables `sim-WORLD-0*.txt` (commands in `run-sims.sh.txt`), the
EXP-06 play logs `exp06-s6-play-*.jsonl` and their driver `exp06-s6-play-driver.mjs.txt`, the scenario scripts
`scen/*.mjs.txt`.

## World scripts, bar column

| Check | 10 seeds | 1–30 | 31–60 | 61–90 (judge) |
|---|---|---|---|---|
| WORLD-01 c1 | 10/10 [10] | 30/30 [30] | 30/30 [30] | 30/30 [30] |
| WORLD-01 c2 | 10/10 [10] | 30/30 [30] | 30/30 [30] | 30/30 [30] |
| WORLD-01 c3 | 10/10 [8] | 30/30 [24] | 30/30 [24] | 30/30 [24] |
| WORLD-01 c4 | 10/10 [8] | 30/30 [24] | 30/30 [24] | 30/30 [24] |
| WORLD-01 c5 | 10/10 [10] | 30/30 [30] | 30/30 [30] | 30/30 [30] |
| WORLD-01 c6 swap | 9/10 [8] | 29/30 [24] | 24/30 [24] | **23/30 [24] FAIL** |
| WORLD-02 c1 | 10/10 [10] | 30/30 [30] | 30/30 [30] | 30/30 [30] |
| WORLD-02 c2 | 10/10 [8] | 30/30 [24] | 29/30 [24] | 29/30 [24] |
| WORLD-02 c3 | 10/10 [8] | 29/30 [24] | 25/30 [24] | **19/30 [24] FAIL** |
| WORLD-02 c4 | 10/10 [8] | 28/30 [24] | 25/30 [24] | 24/30 [24] |
| WORLD-02 c5 | 10/10 [10] | 30/30 [30] | 30/30 [30] | 30/30 [30] |
| WORLD-02 c6 | 10/10 [8] | 27/30 [24] | 25/30 [24] | 28/30 [24] |
| WORLD-02 c7 | 10/10 [8] | 30/30 [24] | 30/30 [24] | 30/30 [24] |

Raw rows, pasted from the runner (`shots/trc-06/sim-WORLD-01-swap-s30-from61.txt`, `sim-WORLD-02-s30-from61.txt`):

```
| 6 | swapping player captains' Nerve and Judgement changes the battle | outcome or losses differ by ≥ 25% | 24 of 30 | 23 of 30; mean player ships lost 3.0 → 3.7; outcomes withdrawal 28, victory 1, defeat 1 → withdrawal 28, timeout 2 | FAIL | 24 of 30: FAIL |
| 3 | scripted-good beats idle | outcome rank (victory 2 > withdrawal 1 > defeat 0) higher than idle, or equal and fewer player ships lost | 24 of 30 | 19 of 30; outcomes good withdrawal 12, victory 11, timeout 4, defeat 3 vs idle withdrawal 28, victory 1, defeat 1; lost good 2 2 1 3 2 2 1 4 3 4 2 2 1 1 4 3 7 3 3 4 6 6 3 5 2 3 7 3 2 6 vs idle 2 2 3 3 5 3 4 3 3 3 3 2 4 3 3 3 3 3 4 3 4 4 1 3 2 1 2 3 4 4 | FAIL | 24 of 30: FAIL |
| 4 | scripted-bad does worse than idle | outcome rank lower than idle, or equal and more player ships lost | 24 of 30 | 24 of 30; outcomes bad defeat 11, withdrawal 19 vs idle withdrawal 28, victory 1, defeat 1; … | pass | 24 of 30: pass |
```

## Done point 4 by my own order

Seed 5 at 1262: I clicked the enemy cruiser Sceptre, opened Master of guns and pressed "All guns on Sceptre" (0:01).
At 0:54.8 the card "Sceptre is open on her port side. Pods can go in there." came up with **Q Send the pods**; I pressed
Q. One pod of six was lost to point defence; the marines breached her port at 1:14 and the commander said "It is going
badly on Sceptre. 75 of ours against 88."; I pressed **Q Reinforce**. She struck at 1:37: "Sceptre is ours. Our prize
crew is aboard.", scoreboard "12 + 1 taken". From the title screen on seed 1 the same two orders took her at 2:45 after
a second open-side card, because the reinforcement went at her aft, which was up (TRC06-1).

## EXP-06 step 6, played for real

Every order through real clicks in the tactical view. Plan "keep": the four escorts are never ordered; everyone else
attacks the smallest enemy class first; the flagship boards open sides.
- **Seed 6, escorts left on their screen: VICTORY at 13:20**, "House of Ganymede broke at 13:08: 59% of its strength
  gone" (67 orders, 196 clicks). TRC-05 lost this seed with the same plan.
- **Seed 7, entered from the title screen, escorts left on their screen: VICTORY at 14:19**, "broke at 14:07: fleet
  morale 25" (70 orders, 204 clicks), the same game TRC-05 won.
- Seed 7, every ship ordered, escorts too: defeat at 9:06 (idle ends 4:11; TRC-05's run of this lost at 3:08).

Then I re-ran both wins. **The same plan on the same seed lost when its first order landed one frame (1/30 s) earlier or
later** (TRC06-4): seed 6 first order at 1.100 s withdrawal 6:47, 1.133 VICTORY, 1.167 defeat 7:36, 1.267 drawn at 15:00;
seed 7 1.100 defeat 9:46, 1.133 VICTORY, 1.167 defeat 9:15, 1.233 defeat 11:53. A re-run on the same tick reproduces the
result to the second (two pairs), so it is not noise in my driver; it is the battle. Of 8 distinct starts, 2 won.
`shots/trc-06/exp06-s6-seed6-keep-t1133-end.jpg`, `exp06-s6-seed7-keep-t1133-end.jpg`,
`exp06-s6-seed6-keep-escorts-rerun-defeat.jpg`.

## For Caleb's play card: how long he reads before he can win

Measured (F4): the help line is 15 words. Doing nothing on seed 7, the queue shows 44 cards in the first two minutes, 15
asking for an answer: 221 words in the first game minute and 645 in two. At 1x that is faster than most people read
(around 200–250 words a minute, STANDARD); in the tactical view (T, 25% time) it arrives at about 55 a real minute.
Nothing in the game teaches the plan that won. What he has to know, and where the game says it:
1. Select a ship, click an enemy, press Attack: the menu says it once he clicks.
2. Leave the four escorts alone: only the amber line "Escort leaves the screen" when he orders one.
3. Put the flagship's guns on one ship and press Q when the master of guns says a side is open: the card says it.

Estimate (TASTE, not measured on a person): a 100–150 word card, under a minute to read, plus the help line, gets him to
the plan that won here. Play in the tactical view so the comms can be read. Even then, by TRC06-4, the same plan wins on
some starts and loses on others.

## Re-tests of defects marked fixed by PKG-21 and PKG-22

| Defect | Package | Now | Evidence |
|---|---|---|---|
| QA-05 F-01 no title entry | PKG-21 | fixed | Title "Fleet battle" at 1262 and 375 (A1, A4) |
| QA-05 F-05 Boarding run would not commit | PKG-21 | fixed | Astu Boarding run committed by Enter, eta 4:09 (C2) |
| TRC05-7 refusal not shown | PKG-21 | fixed (first half) | "Stoa cannot fly the Boarding run: no boarding hangar in the group." on the panel and as a notice (C2). Second half still open, below |
| QA-05 F-13 roster reflow | PKG-21 | fixed | Pnyx card stays, greyed "Taken"; click at Bema's place selects Bema (R) |
| QA-05 F-12 armed/miss | PKG-21 | fixed | Banner, "Missed: no ship there.", Esc stands down (R) |
| QA-05 F-11 camera / R | PKG-21 | fixed | R in tactical restores pitch 1.18 / yaw −1.57; hover leaves pitch alone (R) |
| QA-05 F-15 phone tactical | PKG-21 | fixed | Tactical button at 375 opens and closes the table (A4) |
| PKG-17 request: enemy under a panel | PKG-21 | fixed | "Enemy ships 12" list marks "under a panel" (`pkg17-enemy-list.jpg`) |
| TRC05-5 escort warning | PKG-21 | fixed | "Escort leaves the screen: the flagship loses her screen." on Kleros's menu (B3) |
| TRC05-4 order bar at 1244x608, Esc | PKG-21 | fixed | "All guns on Io" clicked at 1244x608 with Bema selected; Esc clears (R) |
| QA-05 F-03 no word that a side is open | PKG-22 | fixed | "Sceptre is open on her port side. Pods can go in there." / "Their port side is down on Sceptre." (E3) |
| QA-05 F-04 / TRC05-2 keys and R | PKG-22 | fixed, one residue | Tab + E answered the highlighted card #9 by id (B1); help line says "R answers the selected report" and R does. Residue TRC06-2 |
| QA-05 F-07 / TRC05-8 capture not told | PKG-22 | fixed | "Sceptre is ours…", headers "12 + 1 taken" / "1 lost to boarders", end row "Enemy ships it captured" (A2, A4, E3) |
| QA-05 F-08 answers don't match | PKG-22 | fixed | Pods card offers "Shields to port"; shield card "Turn a fresh side" (B1) |
| QA-05 F-10 / TRC05-3 raw order names | PKG-22 | fixed, one residue | "aye, guns on target / pods away / boarders away / wings tasked" (B3). Residue TRC06-3 |
| TRC05-6 marine numbers | PKG-22 | fixed | "going badly … 75 of ours against 88", "outnumbered … 45 to 90", "going our way, 90 to 77" (E3) |
| QA-05 F-09 two cards from one captain | PKG-22 | not re-tested | My count grouped cards by ship, and the flagship's officers all report as Astu; re-test costs one driver edit and one game |
| QA-05 F-14 officers after the flagship is lost | PKG-22 | not re-tested | In no battle I played was the flagship lost before the battle ended |
| QA-05 F-06 battle did not end | PKG-23 | fixed | Every battle here ended within 12 s of a break (e.g. 3:49 → 4:01, A4) |

## Defects still open (MEASURED-HERE)

| ID | Severity | What happened | Width |
|---|---|---|---|
| TRC06-4 | MAJOR | The plan that wins seed 6 and seed 7 loses on both when its first order lands one frame earlier or later (8 starts, 2 wins, reproducible per tick). A player cannot learn from a loss that a 1/30 s difference decided. Bears on done point 5 and on For Caleb 13 | 1262 |
| TRC06-1 | MAJOR | Seed 1, Sceptre boarded through her port: "Reinforce" sent the second party at her aft, which was up; it was turned away at 1:39 and the first party had already been thrown off | 1262 |
| TRC05-1 | MAJOR | Still open: "Focus Port" by two ships on Sceptre lands aft 31, fore 6, starboard 3, port 1; the ordered side never falls (seed 5) | 1262 |
| TRC06-2 | MINOR | On a card with two answers the help line still says "R answers the selected report"; R only shows "That report has two answers: Q Carry on, E Withdraw." | 1262 |
| TRC06-3 | MINOR | After "Shields to port" (Ekklesia) and "All port" (Astu) the event log says "aye, shields reset", while the officer says "Power to port" | 1262 |
| TRC05-7 | MINOR | Still open, second half: Astu's Boarding run on Herald kept flying 3:44 after Herald withdrew at 0:29, its line pointing at nothing; the only word was "Astu: order refused (boarders away)" at 1:25; at the run's end it launched unordered at another ship | 1262 |
| (EXP-02 s10) | MAJOR | Fighter command takes "Screen" and no fighters exist to fly it | 1262 |
| (EXP-05 s9) | MINOR | The end table counts wrecks and captures with no worth between them | 1262, 375 |

Would I hand this to a real player today? No. He can find the battle, read his captains, open a side and take a ship
with two keys, and win; but the plan that wins loses when he starts it a frame later, so a loss teaches him nothing.

## Non-pass rows by system

**Fighters (EXP-02 s10).** Pods launch on order; the screen task is stored and answered; there are no fighters.

**Fire on a side (EXP-05 s1, s2).** "Focus Port" lands its hits on the aft (TRC05-1). After the aft fell Sceptre made no
decision for 15 s and the side regrew on its own.

**End summary (EXP-05 s9).** Wrecks and captures are plain counts.

**Morale (EXP-06 s1, s3, s5, s7).** No wing morale. The enemy flagship fled after the break in both victories, never
taken. Pins happen (the enemy pinned two of his ships) but he never pinned one and nothing tells him how. His own
flagship was lost after his fleet broke, not before.

**Never luck (WORLD-01 c6, WORLD-02 c3; TRC06-4).** Both fail on the held-out block 61–90. In play the same plan's result
turns on a single frame.

## Not exercised

Feel checks (Caleb's). Offline / network kill. Two tabs. Pull back on a deck fight. The in-app Browser pane: every UI
step ran in my own headless Chrome with trusted CDP input so the shots could be saved; re-testing in the pane costs
about 20 calls. QA-05 F-09 and F-14 (above). PKG-20's setup registry beyond the default (the default is unchanged: every
battle here was Saturn's rings 12 v 12).

## Requests

None. TRC-06 changes docs and images only.

## Assumed, for Caleb to overrule

- WORLD-01 c6 and WORLD-02 c3 scored on the 61–90 block alone, as Daedalus ruled for PKG-19, not on 1–90 pooled as
  TRC-05 did. Pooled, WORLD-01 c6 would pass (76 of 90, bar 72) and the total would be 56/65.
- "Keep escorts on their screen" read as: never give the four escort-class ships an order.
- A driver plan that clicks every order is "played for real" (as TRC-05).
- The reading estimate is mine, not measured on a person.

## Gate evidence

Lock: PKG-25 held `MERGE.lock` (taken 13:38, live) when I was ready at 13:45; I waited until it was deleted (13:49) and
took it at 13:49:48 with my label, rewriting its time line at each step. My branch took `claude/game` @ fd433ea (PKG-25,
fighter wings) with no conflicts (79bbf71). My merge changes docs and images only: `git diff --stat 79bbf71 31a09b7`
is reports/TRC-06.md, eight vision/traces files and shots/trc-06 (122 files, 3,301 insertions, 119 deletions).

**First gate (on 0831aa6), 13:50–13:55:** `npx tsc -b` exit 0; `npx vitest run --maxWorkers=4` 77 files, 947 passed, 1
skipped, exit 0; `npm run build` exit 0; `npm run smoke`:

```
[1.0s] vite on http://[::1]:5290
SMOKE FAIL: Error: skirmish did not become ready in 60 s
smoke exit 1
```

Smoke is not a test file, so A9 did not apply: I reverted at once (06fd6ff). Then I stopped my own dev server (5236)
and headless Chrome, which had been running the whole session, and ran smoke on the reverted tip: SMOKE PASS (skirmish
60 frames in 28.0 s, voyage 32.8 s). The failure was my own browser load on the machine, not the tip. I re-applied the
merge (31a09b7, a revert of the revert) and ran the whole gate again.

**Second gate (on 31a09b7), 13:56:30–13:59, nothing of mine running:**

```
Thu Oct 22 13:56:30 PDT 2026
tsc exit 0
Thu Oct 22 13:56:53 PDT 2026
 Test Files  77 passed (77)
      Tests  947 passed | 1 skipped (948)
   Duration  64.23s
vitest exit 0
Thu Oct 22 13:58:02 PDT 2026
build exit 0
Thu Oct 22 13:58:49 PDT 2026
[28.4s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":21,"shots":639,"movedBySide":[11,10],"drawCalls":169}
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (33.3s)
smoke exit 0
```

`git log --first-parent -4` on `claude/game` after the merge:

```
31a09b7 2026-10-22 13:56:22 Re-merge TRC-06 (revert 06fd6ff): first gate's smoke timed out under my own browser load; smoke passed on the reverted tip
06fd6ff 2026-10-22 13:55:23 Revert "Merge TRC-06: re-score of every Phase A script on 4b5914c (55/65, wave-05 56/65)"
0831aa6 2026-10-22 13:49:55 Merge TRC-06: re-score of every Phase A script on 4b5914c (55/65, wave-05 56/65)
fd433ea 2026-10-22 13:46:39 Merge PKG-25: report evidence
```

This evidence section is committed on `claude/trc-06` and merged after the gate as a docs-only change, as PKG-25 did.
The scores above are for the launch tip 4b5914c; PKG-25 (fighter wings) landed after it and is not scored here, and it
may change EXP-02 step 10.


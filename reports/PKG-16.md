# PKG-16: decisions matter (Palamedes)

Branch `claude/pkg-16`, base `claude/game` @ 6701d3a. Every figure is MEASURED-HERE (this session, 2026-10-21), Saturn
12 v 12, roster 1 unless named, 15 min max, seeds named. Figures from other reports are labelled MEASURED with the report.

**Result in one line:** with fair rosters on and fifteen shared numbers re-tuned, every bar in the package passes on the
script seeds (WORLD-02 c2 30/30, c3 24/30, c4 29/30, c6 27/30; WORLD-01 c6 29/30; scripted-good wins 9 of 30;
rosters 6 of 8). **The c3 pass is on a knife edge and does not hold on fresh seeds** (section 4): Daedalus should read
section 4 before calling WORLD-02 done.

## 1. What I measured first (claude/game @ 6701d3a, same harness as the runner)

| Run (30 seeds) | c2 | c3 (amended) | c4 (amended) | c6 | W01 c6 | good wins |
|---|---|---|---|---|---|---|
| fair rosters off | 30 | 21 (old measure; Daedalus's figure, matched) | 26 | 22 | 19 | 0 |
| fair rosters on, numbers unchanged | 28 | 18 | 23 | 26 | 25 | 7 |

(MEASURED-HERE. The fair-off row matches Daedalus's 3b85b1b figures exactly: c3 21, c4 26, c6 22, W01 c6 19.)

## 2. What I changed

Code (all in my files; rule-9 lines named):
- `checks.ts`: checks 3 and 4 as amended (`compareOutcome`: outcome rank victory 2 > withdrawal 1 > defeat 0, then
  fewer player ships lost; equal is not better). `OUTCOME_RANK` changed (it is named mine). A "Bar at 30 seeds" column
  (`BAR30`, `bar30Cell`, `formatTable(script, rows, seeds)`) for WORLD-02 c2, c3, c4, c6 and WORLD-01 c6.
- `scripts/sim.mjs`: one line, passes the seed count to `formatTable` so the column prints.
- `index.ts`: one export line extended (`compareOutcome`, `OUTCOME_RANK`).
- `policy-ui-like.ts` (new) + `policies.ts` entry `'player-ui-like'` + `PLAYER_UI` in `numbers.ts`.
- `boarding/boarding.ts capture()`: the capture's morale shock is `lossShock(b, t)` when
  `MORALE.captureShockPerStrength` (now true), else the old flat loop. The import line gains `lossShock`.
- `boarding/boarding.ts captainBoards()` (the unordered-boarding rule): the launcher marine reserve. A captain launches
  on his own only while a full launch (6 × 15 = 90) would still leave `BOARDING.unorderedKeep` (90) spare marines for an
  ordered push. Applies to both sides' carriers and capitals. Ordered boards are untouched.
- `ABILITY.fairRosters: true` (Daedalus's ruling).
- Tests: `pkg16.test.ts` (5 new), a new launcher-reserve test in `boarding.test.ts`, and fixture updates where tests
  hard-coded the 0.5 break share or a carrier with 150 marines: `losses.test.ts` (2 tests), `boarding.test.ts` (1),
  and **`admiral/admiral.test.ts` (1 test fixture, not admiral logic)**: the withdrawal-watch test now wrecks one more
  cruiser so the side is still under the new 0.56 break share. Named here because it sits under `admiral/**`.

### Numbers changed

"Proof" is the same 30-seed run with only that number put back (everything else at the new values); each one breaks a
bar, so none of them is decoration. Full new set: c2 30, c3 24, c4 29, c6 27, c7 30, W01 c6 29, good wins 9.

| Number | Old → new | Why | The sim line that proved it (revert only this, 30 seeds) |
|---|---|---|---|
| `ABILITY.fairRosters` | false → true | Daedalus's ruling; off, good wins 0/30 | off: c3 21, good wins 0 |
| `MORALE.hullLoss` | 37 → 36.2 | | c3 **20**, c2 29 |
| `MORALE.enemyLostPerStrength` | 0.75 → 1.69 | a kill heartens the killer: focused fire pays | c3 **17**, good wins 7 |
| `MORALE.friendLostPerStrength` | 1.5 → 2.21 | a loss shakes the line more | c3 **22** |
| `MORALE.friendLostNearPerStrength` | 2.5 → 2.2 | near and far nearly level now | c4 **23** |
| `MORALE.sideBreakStrength` | 0.5 → 0.56 | a side that is fighting holds a little longer | c3 **22** |
| `MORALE.outnumberedPerS` | 0.25 → 0.73 | being outnumbered (from losses) tells | c3 **22**, c4 **22**, W01 c6 **20**, W01 c1 fails, good wins 2 |
| `MORALE.captureShockPerStrength` | false → true | PKG-14's held-back shock, retried under the new checks: kept | c3 **20**, c4 **22**, good wins 6 |
| `MORALE.fledShock` | 1 → 0.67 | a ship that ran shakes less than one that died | c3 **20**, W01 c1 fails |
| `MORALE.withdrawnShock` | 0.5 → 1.08 | an ordered withdrawal is not free heart | c3 **21**, W01 c6 **23** |
| `MORALE.recoverPerS` | 0.05 → 0.08 | | c3 **21**, W01 c1 fails |
| `ABILITY.breakPer` | 2.5 → 3.66 | Nerve moves the break point more (W01 c6) | c3 **22**, c4 **22**, W01 c6 **21** |
| `ABILITY.moraleStartPer` | 3 → 3.59 | Nerve moves starting morale more (W01 c6) | c3 **19**, c2 27 |
| `ABILITY.nerveLossPer` | 0.06 → 0.08 | Nerve damps losses more (W01 c6) | c3 **13** |
| `BOARDING.unorderedKeep` (new) | 0 → 90 | the launcher marine reserve (Do 2) | c3 **19**, c4 **19**, c6 **20** |
| `BOARDING.marineQuality` | 1.6 → 2.02 | boarding parties decide fights inside | c3 **20**, c2 27 |

How they were found: a seeded random search (about 200 configurations, 30 and 60 seeds each) over the morale, ability
and boarding numbers, then a one-at-a-time revert of every changed number back to its old value. Five numbers the
search had moved went back to their old values because reverting them broke nothing (`flagshipLost`, `prizeCredit`,
`withdrawnLossFrac`, `selfJudgement`, `sideBreak`). The scripted policies and the admiral were never touched.
Labels: the values are MEASURED-HERE; the "why" column is TASTE (it says what each number means to a player, not what the
search optimised).

## 3. Script steps

| Step | Result | Evidence (runner, this branch) |
|---|---|---|
| WORLD-02 c1 | **pass** 10/10, 30/30 | |
| WORLD-02 c2 | **pass** 10/10; **30 seeds 30/30** | enemy 30 |
| WORLD-02 c2, rosters 1–8 (≥ 6 of 8) | **pass**, 6 of 8 | rosters 3 (none 5, enemy 5) and 8 (enemy 5, player 4) split |
| WORLD-02 c3 (amended) | **pass** 8/10; **30 seeds 24/30** (bar 24) | good victory 9, withdrawal 14, timeout 6, defeat 1 vs idle withdrawal 30 |
| WORLD-02 c4 (amended) | **pass** 10/10; **30 seeds 29/30** | bad defeat 7, withdrawal 23 |
| WORLD-02 c5 | **pass** 10/10, 30/30 | |
| WORLD-02 c6 | **pass** 10/10; **30 seeds 27/30** | 53 pushes, lead min 6 s, all visible |
| WORLD-02 c7 | **pass** 10/10, 30/30 | |
| WORLD-01 c1–c5 (idle) | **pass**, 10 and 30 seeds | |
| WORLD-01 c6 (swap) | **pass** 9/10; **30 seeds 29/30** | mean player lost 3.1 → 3.7 |
| EXP-06 s6 in the sim: scripted-good wins outright ≥ 7 of 30 | **pass**, 9 of 30 (5 of 10 on seeds 1–10) | |
| EXP-06 s6 on screen | not built here (headless package; TRC owns the replay) | |
| `player-ui-like` vs idle | measured, section 5 | |

## 4. Still broken: c3 holds on the script seeds, not on fresh ones

Same numbers, seeds the scripts do not use (MEASURED-HERE, harness = the runner's code):

| Seeds | c2 | c3 | c4 | c6 | W01 c6 | good wins |
|---|---|---|---|---|---|---|
| 1–30 (the script) | 30 | **24** | 29 | 27 | 29 | 9 |
| 31–60 | 29 | **20** | 26 | 25 | **23** | 11 |
| 61–90 | 29 | **15** | 28 | 28 | **22** | 7 |

And the fit is sensitive: rounding the new values to one decimal (hullLoss 36, enemyLost 1.7, …) drops c3 to 18/30 and
good's wins to 4 (seeds 1–30). So on fresh seeds, scripted-good beats idle about 60–70% of the time, not 80%.

Why I think it can't be tuned much past that with shared rules (MEASURED-HERE plus inference, labelled): scripted-good
is Jupiter's own plan minus its delays and withdrawals, played against Jupiter, on fair rosters. It is close to a mirror
match, so it wins about a third of the time and times out about a fifth. Idle loses every battle as a withdrawal with
about 3 ships lost. So c3 is decided on the ~45% of seeds where good also withdraws, and there it has to lose fewer
ships than idle, which retreats early. Every number that lets good's losing fleet escape cheaper also lets scripted-bad's
escape cheaper (c4). The search never found a set over 23/30 on c3 that also held c4, at 60 seeds (best: c3 46/60,
c4 49/60). Re-test cost: one 30-seed run is about 12 s on 15 workers.

Options for Daedalus (not mine to choose): accept the script-seed pass; judge c3 on 60–90 seeds and accept ~70%; or
change what scripted-good is (a policy, rule 3 forbids me) so it is clearly better than the admiral's own plan.

## 5. Why playing was worse than idle (TRC-03, EXP-06 s6)

`player-ui-like` (new policy): every 10 s, every ship, flagship included, attacks the enemy nearest our flagship; a ship
already on it is re-ordered at the side facing it. 30 seeds, new numbers (runner output):

| Policy | Outcomes | Player ships lost (mean) | Enemy ships lost | Mean length |
|---|---|---|---|---|
| idle | withdrawal 30 | 3.13 | 1.93 | 402 s |
| player-ui-like | withdrawal 26, defeat 4 | 5.07 | 2.07 | 244 s |

Same seed, outcome first then ships lost: player-ui-like better 1, same 2, **worse 27**. It reproduces TRC-03.

What punishes it, by taking one part of the plan away at a time (30 seeds, fair rosters on, old numbers):

| Variant of player-ui-like | Player lost | Enemy lost | vs idle (better / same / worse) |
|---|---|---|---|
| as played | 4.63 | 2.73 | 2 / 8 / 20 |
| flagship not sent forward | 4.67 | 2.67 | (no better) |
| carriers and capital left alone | 4.53 | 2.53 | (no better) |
| never target their flagship | 4.57 | 2.90 | (no better) |
| attack only, no focus-side re-orders | 4.27 | 2.40 | (no better) |
| captains may board anyone while on an attack order | 4.63 | 2.57 | (no better) |
| **escorts left on their screen** | **3.33** | **3.37** | **17 / 7 / 6** |

With the new numbers: escorts left on their screen gives better 10, same 10, worse 10, and 3 victories, against 1 / 2 /
27 as played.

**Finding: it is the player's choice, not a rule.** The whole loss is the escorts. Ordering a 500-hull escort to
attack sends it to its 3 km preferred range on the target, inside the whole enemy line's lasers, and the escorts die.
Each death is a ship lost and a morale shock. The rest of the plan is level with doing nothing. I left the rule alone:
a screen sent forward should be punished. But TRC-03's player could not see why, so this needs saying on screen
(Requests 1).

## 6. Flag, save

Flag: none. Save version: unchanged (no save shape touched; `BOARDING.unorderedKeep` and the two `MORALE` entries are
numbers only).

## 7. Requests

1. **Comms / view (PKG-17's area, Kalliope's pen):** when the player orders an escort off its screen at a target, the
   escort's captain should say so ("We're your screen, Admiral. Going in leaves the flagship open."), and an escort
   lost on an attack order should be named as such in the loss line. Section 5 is the measurement.
2. **Daedalus:** rule on section 4 (how c3 is judged).
3. **Admiral owner:** `admiral/admiral.test.ts`'s withdrawal-watch fixture now wrecks one more cruiser (`e11`) because
   the break share moved 0.5 → 0.56. No admiral logic changed.
4. `MORALE.friendLost`, `friendLostNear`, `enemyLost` are now read only by the `else` branch of the capture shock. They
   can go once nobody wants the flat shock back.

## 8. Assumed, for Caleb to overrule

- Fair rosters on (Daedalus's ruling).
- Outcome-first checks 3 and 4 (the script as amended).
- **A timeout ranks 1.5**, between withdrawal and victory: the amendment does not rank it, and nobody broke.
- The launcher reserve applies to both sides and to every carrier and capital, flagship included.
- `player-ui-like` is my reading of TRC-03's play logs (`shots/trc-03/exp06-s6-play-*.jsonl`): attack orders on the
  nearest enemy every ~10 s, the flagship included.

## Evidence

Commands on the merged branch (`claude/pkg-16` after `git merge claude/game` @ 620dcd3, merge d28c499), run
2026-10-21 20:00–20:10 -07:00, after the last source edit. The game merge, gate and `git log` follow in the
post-merge evidence commit.

```
2026-10-21T20:00:12-07:00
tsc exit 0
$ npx eslint src/battle/sim
2026-10-21T20:00:23-07:00
lint exit 0
$ npx vitest run --maxWorkers=4 (amendment A7)
2026-10-21T20:02:10-07:00
 Test Files  68 passed (68)
      Tests  874 passed (874)
vitest exit 0
$ npm run build (tail)
2026-10-21T20:02:36-07:00
build exit 0
$ npm run smoke (tail)
2026-10-21T20:03:05-07:00
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (17.4s)
smoke exit 0
```

`npm run sim -- --script WORLD-01 --seeds 10 --variant swap-nerve-judgement`
```
2026-10-21T20:00:28-07:00
| WORLD-01 check | What | Pass range | Seeds needed | Got | Result | Bar at 30 seeds |
|---|---|---|---|---|---|---|
| 1 | battle ends with an outcome | outcome ∈ {victory, defeat, withdrawal} | 10 of 10 | 10 of 10; withdrawal 10 | pass | - |
| 2 | both sides fired and dealt damage by 60 s | damageDealt.player > 0 and damageDealt.enemy > 0 at 60 s | 10 of 10 | 10 of 10; min at 60 s: player 2084, enemy 1807 | pass | - |
| 3 | a boarding attempt happened, unordered | boardingAttempts ≥ 1, none ordered | 8 of 10 | 10 of 10; mean attempts 9.1 (unordered 6.4); captured P 8 E 15 | pass | - |
| 4 | at least one ship broke (fled or struck) | brokenShips ≥ 1 | 8 of 10 | 10 of 10; mean broken 8.3 | pass | - |
| 5 | idle player's captains decided things on timeouts, each with a trait | timeoutDecisions ≥ 3, each with a trait | 10 of 10 | 10 of 10; mean 21.8 per battle, 21.8 of them closing a comms report | pass | - |
| 6 | swapping player captains' Nerve and Judgement changes the battle | outcome or losses differ by ≥ 25% | 8 of 10 | 9 of 10; mean player ships lost 3.5 → 3.2; outcomes withdrawal 10 → withdrawal 9, victory 1 | pass | 24 of 30 (run --seeds 30) |
| 7 | the director keeps filming | shotsPer20s ≥ 1 | seed 1 | needs the view (PKG-03 and later) | not built | - |
WORLD-01: every built check passed (6 pass, 1 not built, 0 not run)
exit 0
```
`npm run sim -- --script WORLD-01 --seeds 30 --variant swap-nerve-judgement`
```
2026-10-21T20:00:53-07:00
| WORLD-01 check | What | Pass range | Seeds needed | Got | Result | Bar at 30 seeds |
|---|---|---|---|---|---|---|
| 1 | battle ends with an outcome | outcome ∈ {victory, defeat, withdrawal} | 30 of 30 | 30 of 30; withdrawal 30 | pass | - |
| 2 | both sides fired and dealt damage by 60 s | damageDealt.player > 0 and damageDealt.enemy > 0 at 60 s | 30 of 30 | 30 of 30; min at 60 s: player 2048, enemy 1678 | pass | - |
| 3 | a boarding attempt happened, unordered | boardingAttempts ≥ 1, none ordered | 24 of 30 | 30 of 30; mean attempts 9.7 (unordered 7.0); captured P 25 E 32 | pass | - |
| 4 | at least one ship broke (fled or struck) | brokenShips ≥ 1 | 24 of 30 | 30 of 30; mean broken 8.7 | pass | - |
| 5 | idle player's captains decided things on timeouts, each with a trait | timeoutDecisions ≥ 3, each with a trait | 30 of 30 | 30 of 30; mean 22.0 per battle, 22.0 of them closing a comms report | pass | - |
| 6 | swapping player captains' Nerve and Judgement changes the battle | outcome or losses differ by ≥ 25% | 24 of 30 | 29 of 30; mean player ships lost 3.1 → 3.7; outcomes withdrawal 30 → withdrawal 29, victory 1 | pass | 24 of 30: pass |
| 7 | the director keeps filming | shotsPer20s ≥ 1 | seed 1 | needs the view (PKG-03 and later) | not built | - |
WORLD-01: every built check passed (6 pass, 1 not built, 0 not run)
exit 0
```
`npm run sim -- --script WORLD-02 --seeds 10`
```
2026-10-21T20:00:36-07:00
| WORLD-02 check | What | Pass range | Seeds needed | Got | Result | Bar at 30 seeds |
|---|---|---|---|---|---|---|
| 1 | same seed, same policy, run twice: identical result | final state hash equal | 10 of 10 | 10 of 10 | pass | - |
| 2 | idle on even fleets: the winner does not swing with the seed | the same winner (or draw) | 8 of 10 | 10 of 10; winner "enemy"; tally enemy 10 | pass | 24 of 30 (run --seeds 30) |
| 3 | scripted-good beats idle | outcome rank (victory 2 > withdrawal 1 > defeat 0) higher than idle, or equal and fewer player ships lost | 8 of 10 | 8 of 10; outcomes good victory 5, withdrawal 5 vs idle withdrawal 10; lost good 2 3 4 3 3 3 2 2 2 1 vs idle 4 3 3 4 4 3 3 3 4 4 | pass | 24 of 30 (run --seeds 30) |
| 4 | scripted-bad does worse than idle | outcome rank lower than idle, or equal and more player ships lost | 8 of 10 | 10 of 10; outcomes bad defeat 3, withdrawal 7 vs idle withdrawal 10; lost bad 9 7 4 5 7 5 5 5 5 5 vs idle 4 3 3 4 4 3 3 3 4 4 | pass | 24 of 30 (run --seeds 30) |
| 5 | the AI admiral uses the player's order set only | every AI order is a player order type (log check) | 10 of 10 | 10 of 10; orders issued 97 85 80 72 121 85 92 92 114 85; kinds attack 796, withdraw 10, focusSide 36, board 29, followFlagship 52; foreign 0 needed, log-foreign 0; stats.orders = admiral's count in 10 of 10 | pass | - |
| 6 | the AI telegraphs a boarding push ≥ 5 s ahead | telegraphLead ≥ 5 s on each push, telegraph visible | 8 of 10 | 10 of 10; seeds with a push 10 of 10; pushes 19; lead min 6 s; visible 19 of 19 | pass | 24 of 30 (run --seeds 30) |
| 7 | Jupiter's mean engagement range beats a Mars-style control | meanRange(jupiter) > meanRange(control), range of every AI shot | 8 of 10 | 10 of 10; shots: jupiter 6057 5046 4841 4857 5833 6105 5407 5759 5621 5124 m; control 2436 2295 2294 2629 2136 2179 2486 2094 2561 2449 m; nearest-foe sample: jupiter 6465 5791 5972 6307 6628 6833 6416 6979 6519 6757, control 3251 2982 3117 3693 3037 2765 3326 3024 3196 2993 | pass | - |
WORLD-02: every built check passed (7 pass, 0 not built, 0 not run)
exit 0
```
`npm run sim -- --script WORLD-02 --seeds 30`
```
2026-10-21T20:01:14-07:00
| WORLD-02 check | What | Pass range | Seeds needed | Got | Result | Bar at 30 seeds |
|---|---|---|---|---|---|---|
| 1 | same seed, same policy, run twice: identical result | final state hash equal | 30 of 30 | 30 of 30 | pass | - |
| 2 | idle on even fleets: the winner does not swing with the seed | the same winner (or draw) | 24 of 30 | 30 of 30; winner "enemy"; tally enemy 30 | pass | 24 of 30: pass |
| 3 | scripted-good beats idle | outcome rank (victory 2 > withdrawal 1 > defeat 0) higher than idle, or equal and fewer player ships lost | 24 of 30 | 24 of 30; outcomes good victory 9, withdrawal 14, timeout 6, defeat 1 vs idle withdrawal 30; lost good 2 3 4 3 3 3 2 2 2 1 5 3 2 2 2 2 2 3 3 2 3 2 5 2 2 3 4 2 3 7 vs idle 4 3 3 4 4 3 3 3 4 4 4 2 3 3 3 5 3 2 3 3 3 5 3 3 1 3 2 2 3 3 | pass | 24 of 30: pass |
| 4 | scripted-bad does worse than idle | outcome rank lower than idle, or equal and more player ships lost | 24 of 30 | 29 of 30; outcomes bad defeat 7, withdrawal 23 vs idle withdrawal 30; lost bad 9 7 4 5 7 5 5 5 5 5 5 5 4 5 5 6 7 6 4 5 5 4 5 5 4 5 7 5 5 6 vs idle 4 3 3 4 4 3 3 3 4 4 4 2 3 3 3 5 3 2 3 3 3 5 3 3 1 3 2 2 3 3 | pass | 24 of 30: pass |
| 5 | the AI admiral uses the player's order set only | every AI order is a player order type (log check) | 30 of 30 | 30 of 30; orders issued 97 85 80 72 121 85 92 92 114 85 108 84 122 99 64 76 123 72 87 78 83 102 84 100 68 94 71 68 86 99; kinds attack 2311, withdraw 30, focusSide 106, board 83, followFlagship 161; foreign 0 needed, log-foreign 0; stats.orders = admiral's count in 30 of 30 | pass | - |
| 6 | the AI telegraphs a boarding push ≥ 5 s ahead | telegraphLead ≥ 5 s on each push, telegraph visible | 24 of 30 | 27 of 30; seeds with a push 27 of 30; pushes 53; lead min 6 s; visible 53 of 53 | pass | 24 of 30: pass |
| 7 | Jupiter's mean engagement range beats a Mars-style control | meanRange(jupiter) > meanRange(control), range of every AI shot | 24 of 30 | 30 of 30; shots: jupiter 6057 5046 4841 4857 5833 6105 5407 5759 5621 5124 4972 5086 5566 5434 5339 5187 5661 5251 4838 5250 5982 5706 6291 5120 5128 5357 5896 4693 5395 5532 m; control 2436 2295 2294 2629 2136 2179 2486 2094 2561 2449 2532 2330 2572 2187 3191 2444 2484 2608 2343 2515 2373 2397 2469 2419 2698 2413 2365 2263 2482 2403 m; nearest-foe sample: jupiter 6465 5791 5972 6307 6628 6833 6416 6979 6519 6757 6306 6204 6643 6226 6621 6083 6444 6492 6106 6371 6390 6700 6789 6845 6223 6710 6891 5618 6558 6288, control 3251 2982 3117 3693 3037 2765 3326 3024 3196 2993 3556 2914 3500 3044 4218 3165 3272 3187 2961 3305 3253 3168 3476 3214 3653 3429 2854 3045 3378 3140 | pass | - |
WORLD-02: every built check passed (7 pass, 0 not built, 0 not run)
exit 0
```
`npm run sim -- --script WORLD-02 --rosters 1-8 --no-write`
```
2026-10-21T20:03:25-07:00
| Roster | Winner tally (seeds 1–10) | Same winner | Check 2 |
|---|---|---|---|
| 1 | 10 of 10; winner "enemy"; tally enemy 10 | 10 of 10 | pass |
| 2 | 10 of 10; winner "enemy"; tally enemy 10 | 10 of 10 | pass |
| 3 | 5 of 10; winner "none"; tally none 5, enemy 5 | 5 of 10 | FAIL |
| 4 | 10 of 10; winner "enemy"; tally enemy 10 | 10 of 10 | pass |
| 5 | 9 of 10; winner "enemy"; tally enemy 9, none 1 | 9 of 10 | pass |
| 6 | 9 of 10; winner "enemy"; tally none 1, enemy 9 | 9 of 10 | pass |
| 7 | 10 of 10; winner "enemy"; tally enemy 10 | 10 of 10 | pass |
| 8 | 5 of 10; winner "enemy"; tally enemy 5, player 4, none 1 | 5 of 10 | FAIL |
rosters holding check 2: 6 of 8
exit 0
```
`npm run sim -- --script WORLD-01 --seeds 30 --policy player-ui-like --no-write` (per-seed lines; the section 5 table
compares them with the idle lines of the WORLD-01 30-seed run above)
```
2026-10-21T20:04:03-07:00
  base seed  1: withdrawal  235 s  lost P 5 (fled 6, wd 1) E 4 (fled 0, wd 0)  broken 7  timeouts 27  self 382  hash 60a2177f7d712c30  488 ms wall
  base seed  2: withdrawal  207 s  lost P 4 (fled 8, wd 0) E 3 (fled 1, wd 0)  broken 11  timeouts 25  self 284  hash ff1aa7efd7de442d  225 ms wall
  base seed  3: withdrawal  148 s  lost P 5 (fled 7, wd 0) E 1 (fled 0, wd 0)  broken 9  timeouts 21  self 264  hash a41219d356082492  155 ms wall
  base seed  4: defeat      248 s  lost P 6 (fled 5, wd 1) E 2 (fled 1, wd 0)  broken 10  timeouts 26  self 348  hash 2e01ce9edf9c1b2a  208 ms wall
  base seed  5: withdrawal  210 s  lost P 5 (fled 6, wd 1) E 1 (fled 0, wd 0)  broken 8  timeouts 26  self 318  hash a17fdef3cdef493f  201 ms wall
  base seed  6: withdrawal  219 s  lost P 5 (fled 6, wd 1) E 3 (fled 0, wd 0)  broken 8  timeouts 29  self 386  hash 81c58fe1fa56bf9f  203 ms wall
  base seed  7: withdrawal  313 s  lost P 5 (fled 6, wd 1) E 3 (fled 0, wd 0)  broken 9  timeouts 36  self 493  hash be9d9d29289be6c8  302 ms wall
  base seed  8: withdrawal  237 s  lost P 5 (fled 7, wd 0) E 2 (fled 1, wd 0)  broken 10  timeouts 28  self 387  hash 5d8824204decb3d9  190 ms wall
  base seed  9: withdrawal  404 s  lost P 6 (fled 5, wd 1) E 4 (fled 1, wd 0)  broken 9  timeouts 34  self 503  hash 32aecf11594d79ff  290 ms wall
  base seed 10: withdrawal  365 s  lost P 4 (fled 7, wd 0) E 1 (fled 1, wd 0)  broken 10  timeouts 25  self 318  hash a76f8c0e8570a2a8  229 ms wall
  base seed 11: withdrawal  168 s  lost P 5 (fled 7, wd 0) E 0 (fled 0, wd 0)  broken 10  timeouts 23  self 295  hash 039671e87daa5a5c  158 ms wall
  base seed 12: withdrawal  211 s  lost P 5 (fled 6, wd 1) E 3 (fled 0, wd 0)  broken 8  timeouts 26  self 327  hash b66ece09b4d3f6be  172 ms wall
  base seed 13: defeat      265 s  lost P 6 (fled 5, wd 1) E 2 (fled 0, wd 0)  broken 8  timeouts 26  self 377  hash 7649197de6219166  214 ms wall
  base seed 14: withdrawal  366 s  lost P 4 (fled 6, wd 1) E 2 (fled 0, wd 0)  broken 8  timeouts 22  self 338  hash 62a3b0e7b8c87afe  224 ms wall
  base seed 15: withdrawal  199 s  lost P 5 (fled 6, wd 1) E 1 (fled 0, wd 0)  broken 8  timeouts 26  self 323  hash c2605786ffe7f510  155 ms wall
  base seed 16: withdrawal  175 s  lost P 5 (fled 7, wd 0) E 1 (fled 0, wd 0)  broken 9  timeouts 25  self 305  hash e8de95226a55492c  158 ms wall
  base seed 17: withdrawal  216 s  lost P 5 (fled 7, wd 0) E 2 (fled 0, wd 0)  broken 9  timeouts 29  self 368  hash baa9b10bc1f30492  178 ms wall
  base seed 18: withdrawal  318 s  lost P 5 (fled 6, wd 1) E 3 (fled 0, wd 1)  broken 8  timeouts 32  self 488  hash 73f9ffb1388c62e7  271 ms wall
  base seed 19: withdrawal  246 s  lost P 6 (fled 6, wd 0) E 2 (fled 0, wd 1)  broken 10  timeouts 24  self 356  hash 91ce2d4ddae6a2c6  205 ms wall
  base seed 20: withdrawal  191 s  lost P 5 (fled 7, wd 0) E 2 (fled 0, wd 0)  broken 10  timeouts 26  self 288  hash c8e2776c84e1aebb  172 ms wall
  base seed 21: withdrawal  219 s  lost P 5 (fled 7, wd 0) E 2 (fled 1, wd 0)  broken 11  timeouts 23  self 376  hash b87d2dc83e8040e2  181 ms wall
  base seed 22: withdrawal  193 s  lost P 4 (fled 8, wd 0) E 1 (fled 0, wd 0)  broken 8  timeouts 31  self 356  hash dfe072dba8e5b72e  176 ms wall
  base seed 23: withdrawal  173 s  lost P 5 (fled 7, wd 0) E 2 (fled 0, wd 0)  broken 8  timeouts 20  self 289  hash 9dec9e8bc13d9983  151 ms wall
  base seed 24: withdrawal  250 s  lost P 5 (fled 6, wd 1) E 3 (fled 0, wd 0)  broken 8  timeouts 26  self 419  hash 9d897aff68ad1293  223 ms wall
  base seed 25: withdrawal  186 s  lost P 5 (fled 7, wd 0) E 1 (fled 0, wd 0)  broken 9  timeouts 26  self 307  hash dd6fd38d827ab9a9  167 ms wall
  base seed 26: defeat      334 s  lost P 6 (fled 6, wd 0) E 3 (fled 3, wd 0)  broken 12  timeouts 38  self 434  hash 693a841379e6a233  256 ms wall
  base seed 27: withdrawal  235 s  lost P 5 (fled 6, wd 1) E 1 (fled 0, wd 0)  broken 7  timeouts 29  self 424  hash d697a7f23afd4390  216 ms wall
  base seed 28: withdrawal  233 s  lost P 5 (fled 6, wd 1) E 2 (fled 1, wd 0)  broken 9  timeouts 26  self 365  hash 6fade767ed56716f  230 ms wall
  base seed 29: withdrawal  274 s  lost P 5 (fled 6, wd 1) E 3 (fled 0, wd 0)  broken 10  timeouts 28  self 395  hash 29c8a6986161c9d2  217 ms wall
  base seed 30: defeat      274 s  lost P 6 (fled 6, wd 0) E 2 (fled 0, wd 0)  broken 8  timeouts 28  self 408  hash fc5b0b94c260049e  221 ms wall
```

Screenshots: none (headless package; no `ui` steps).

## Post-merge evidence (the gate)

Lock taken 2026-10-21T20:00:04-07:00 (none present before). `git -C game merge --no-ff claude/pkg-16` → b994a5d.

`git log --first-parent -3` on claude/game after the merge:
```
b994a5d Merge PKG-16: decisions matter (fair rosters on, outcome-first WORLD-02 c3-4, morale/boarding re-tune, player-ui-like)
620dcd3 Daedalus: PKG-18 verified
1216c04 Merge PKG-18: report evidence (PKG-18R gate)
```
`git diff --stat` of the merge (b994a5d^1..b994a5d, tail):
```
 vision/sims/WORLD-02/seed-28.scripted-good.json    |   1 +
 .../sims/WORLD-02/seed-29.aggressive-admiral.json  |   1 +
 vision/sims/WORLD-02/seed-29.json                  |   1 +
 vision/sims/WORLD-02/seed-29.repeat.json           |   1 +
 vision/sims/WORLD-02/seed-29.scripted-bad.json     |   1 +
 vision/sims/WORLD-02/seed-29.scripted-good.json    |   1 +
 .../sims/WORLD-02/seed-30.aggressive-admiral.json  |   1 +
 vision/sims/WORLD-02/seed-30.json                  |   1 +
 vision/sims/WORLD-02/seed-30.repeat.json           |   1 +
 vision/sims/WORLD-02/seed-30.scripted-bad.json     |   1 +
 vision/sims/WORLD-02/seed-30.scripted-good.json    |   1 +
 223 files changed, 712 insertions(+), 110 deletions(-)
```
Gate, in the game worktree (amendment A7: vitest with --maxWorkers=4):
```
2026-10-21T20:04:35-07:00
tsc exit 0
$ npx vitest run --maxWorkers=4
2026-10-21T20:04:46-07:00
 Test Files  68 passed (68)
      Tests  874 passed (874)
vitest exit 0
$ npm run build
2026-10-21T20:05:12-07:00
build exit 0
$ npm run smoke
2026-10-21T20:05:42-07:00
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (17.4s)
smoke exit 0
```
This section was added after the gate and merged as "Merge PKG-16: report evidence" (report only, gate re-run on it).

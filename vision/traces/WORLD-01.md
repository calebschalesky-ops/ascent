# Trace WORLD-01: Do nothing for the whole battle and still watch a battle play out
Traced by TRC-06 (Momus seat) on the launch tip `4b5914c` (`claude/game`), 2026-10-22 13:06–13:12 PDT. **Was (wave-05)**
is TRC-05's result. Judged per amendment A8 as the TRC-06 package sets it: `--seeds 10`, and `--seeds 30` at `--from 1`,
`31` and `61`; the held-out block 61–90 is the judge for checks whose numbers were tuned on earlier seeds (Daedalus's
PKG-19 ruling, board 2026-10-22 12:15).
Commands (`shots/trc-06/run-sims.sh.txt`), each with `--minutes 15 --no-write`:
- `npm run sim -- --script WORLD-01 --seeds 10 --policy idle` → `sim-WORLD-01-idle-s10.txt`; `--seeds 30 --from 1|31|61` → `sim-WORLD-01-idle-s30-from{1,31,61}.txt`
- the same with `--variant swap-nerve-judgement` → `sim-WORLD-01-swap-s10.txt`, `sim-WORLD-01-swap-s30-from{1,31,61}.txt`

| Check | By | Measured as (sim key) | Pass range | Seeds needed | Was (wave-05) | Result | Evidence / what happened (10 / 1–30 / 31–60 / 61–90, bar in brackets) |
|---|---|---|---|---|---|---|---|
| 1 | end | battle ends with an outcome | outcome ∈ {victory, defeat, withdrawal} | 10 of 10 | pass | pass | 10/10 [10], 30/30, 30/30, 30/30 [30]. Withdrawal 10; 30; 29 + victory 1; 28 + victory 1 + defeat 1. |
| 2 | 60 s | both sides fired and dealt damage | damageDealt.player > 0 and .enemy > 0 | 10 of 10 | pass | pass | 10/10, 30/30 ×3; min at 60 s player 2084 / 2048 / 1941 / 1932, enemy 1807 / 1678 / 1644 / 1559. |
| 3 | end | ≥1 unordered boarding attempt | boardingAttempts ≥ 1 | 8 of 10 | pass | pass | 10/10 [8], 30/30 ×3 [24]; mean 9.1 / 9.7 / 9.6 / 9.7 (unordered 6.4 / 7.0 / 7.1 / 7.3). |
| 4 | end | ≥1 ship broke | brokenShips ≥ 1 | 8 of 10 | pass | pass | 10/10 [8], 30/30 ×3 [24]; mean broken 8.3 / 8.7 / 9.0 / 9.1. |
| 5 | end | timeout decisions with trait | timeoutDecisions ≥ 3, each with a trait | 10 of 10 | pass | pass | 10/10, 30/30 ×3; mean 21.8 / 22.0 / 21.2 / 20.9. Browser seed 1: Ekklesia's report 1 timed out at 11.77, trait Bold, "No reply from the flagship. Carrying on. Should have asked sooner." (`shots/trc-06/exp02-s5-timeout-choice-on-screen-seed1.jpg`). |
| 6 | end | swapping Nerve and Judgement changes the battle | outcome or losses differ by ≥ 25% | 8 of 10 seed pairs | pass | **fail** | **Regression under the per-block judge.** 9/10 [8], 29/30 [24], 24/30 [24] (exactly), **23/30 [24] FAIL on 61–90** (runner: FAIL). Mean lost 3.0 → 3.7 on 61–90. Pooled 1–90 it is 76 of 90 (bar 72), which TRC-05 scored pass at 74 of 90; the block measure is the one Daedalus ruled on 2026-10-22 (PKG-19: 29/23/22 on the three blocks). Two of my block counts are one higher than his (24 and 23); PKG-23's end check (battles end 12 s after a broken side has nothing fighting) landed in between. |
| 7 | end | the director keeps filming | shotsPer20s ≥ 1 (browser, seed 1) | seed 1 | pass | pass | Seed 1 in the browser, untouched to the end (6:17), time stepped in 0.1 s frames: see `shots/trc-06/probe-log.md` W7. The runner prints "not built" (no view). |

Feel checks (Caleb only): not judged here.

**Score 6/7** (wave-05: 7/7). Most important non-pass: check 6 on the held-out block 61–90, 23 of 30 against a bar of
24. Doing nothing still ends the same way: his fleet withdraws on 87 of seeds 1–90, wins 2, and is beaten outright once.

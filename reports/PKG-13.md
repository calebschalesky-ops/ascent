# PKG-13: admiral and fairness (Talos, with Palamedes's rules on numbers)

Branch `claude/pkg-13`, base `claude/game` @ 0cea035, merged with the game tip (PKG-12, 14, 15, TRC-03) before every
figure below unless a row says otherwise. Every number here was produced this session (MEASURED-HERE); seeds named.

**Result in one line:** WORLD-02 passes 7 of 7 on seeds 1–10 with the admiral changes. Fair rosters are built and
tested but ship **switched off** (`ABILITY.fairRosters: false`), because switching them on is what gets scripted-good
its wins (0 → 3 of 10) and it also drops checks 3 and 4 below their bar (to 4 and 7 of 10). Daedalus or Caleb has to
choose which matters more. The switch is a single boolean.

## 1. What I measured first (claude/game @ 0cea035, roster 1)

- Check 6: 7 of 10. Seeds 1, 3 and 9 got no push. Cause: the lane test counted the target as its own escort screen
  (`dist(target, target) = 0`). Jupiter's focus is nearly always an escort, so every open side on that focus was "covered".
  Half the remaining pushes sent 0 boarders. The board orders were refused for no spare marines or for being out of range,
  and they were still counted as "launched".
- Check 7: 5 of 10 (jupiter 5.6 km against control 5.6 km). The `attack` order holds both admirals at their captains'
  `prefRange`, so the two styles converge.
- Scripted-good outright wins: 0 of 10. With *fair rosters on*, mirror matches (Jupiter v Jupiter) still swung from 0
  to 10 wins depending on the roster, and swapping the two sides' captains on roster 1 turned scripted-good from
  0 to 7 victories out of 10. So who commands which hull decides as much as the totals do. Evening only the fleet
  totals was not enough.

## 2. What I changed

| File | Change | Why |
|---|---|---|
| `admiral/admiral.ts` `watch` | Reads `fleetLosses()`: skip a withdrawal if `(strengthLost + ships already leaving + this ship) × withdrawnLossFrac / start ≥ sideBreakStrength` | Request 2 (PKG-08). `MORALE.sideBreakLosses` is no longer read here |
| `admiral.ts` `pushTick` | No boarders go until the telegraph shows (escorts ≥ 100 m closer or a launcher ≥ 10° turned). The admiral holds up to `telegraphHoldS` and then calls the push off. A push whose board orders were all refused gets `launchedAt = null` and status aborted, and the note names each refusal | Request 3, BATTLE-RULES rule 8 |
| `admiral.ts` `jupiterPush` (new) | The target no longer screens itself. A target qualifies only if it is not the flagship and is within `0.95 × launchRange` of a launcher that `cannotBoard()` (boarding's own rule, read only) accepts. Past `pushDecisionS` 120 s with no push yet, any open, clear, reachable side counts, focus first. Retry 10 s after an abort, 45 s after a launch | Request 4: a push in every battle that runs past its decision point |
| `admiral.ts` Mars control | `focusSide` on the *far* side of the nearest enemy instead of `attack`, so its ships fly in through laser range | Check 7. **My call:** the control closes inside the line's range. Jupiter is unchanged and keeps standing at its captains' range |
| `admiral/numbers.ts` | `pushDecisionS 120`, `launchReachFrac 0.95`, `telegraphHoldS 6`, `abortCooldownS 10` (new, first-pass); `maxWithdrawals 3 → 1` | 30 seeds with fair rosters on: check 2 27 v 22 of 30, everything else level |
| `captains.ts` `fairRosters` (new; the roster-generation functions are `generateCaptain`, unchanged, and `fairRosters`) | For each class of hull, each ability's total is equalised across the two sides (tolerance `ABILITY.fairTotalTol` 0). Points move one at a time from a seeded pick of the richer side to the poorer side, kept within 1–10, so fleet totals end up equal too. Each class gets the same traits on both sides, dealt in seeded order. Draws only from the roster stream | Do 2. Per class rather than per fleet because of section 1 |
| `battle.ts` | Two added lines: `import { fairRosters }` and `if (ABILITY.fairRosters) fairRosters(b.ships, roster); // PKG-13` in `createBattle`, before variants | The one call site. It is a rule-9-shaped addition, but it sits in `createBattle`, not `step()` |
| `numbers.ts` `ABILITY` | `fairRosters: false`, `fairTotalTol: 0`, `fairTraits: true` (entries only) | Rule 10 |
| tests | `fair-rosters.test.ts` (4): totals per class and per fleet on rosters 1–8, same traits per class, still varied (> 2 distinct values per ability per side), seeded. `admiral.test.ts` (+2): pushes on ≥ 8 of seeds 1–10, never launched unseen; the watch refuses a withdrawal that would break the side (13/27 lost) and makes it at 6/27 | |

The scripted policies were not touched. `good` keeps the old push rule, cooldown and lane test byte-for-byte, because
everything I added is gated on `style === 'jupiter'`. The one shared change is the status label on a push where every
board order was refused. `boarding/**`, `comms/**`, the shield-trim logic and `view/**` were not touched.

## 3. Script steps (merged result, fair rosters off unless said)

| Step | Result | Evidence |
|---|---|---|
| WORLD-02 check 1 | **pass** 10/10; 30/30 | hashes equal |
| WORLD-02 check 2 | **pass** 10/10; 30/30 | enemy 10 |
| WORLD-02 check 2, rosters 1–8 (≥ 6 of 8, A3) | **pass**, 6 of 8 | rosters 7 and 8 split (table below) |
| WORLD-02 check 3 | **pass** 8/10; **30 seeds 21/30 (bar 24)** | lost good 4 3 1 5 2 3 3 3 2 3 v idle 4 4 3 4 4 5 5 4 4 4 |
| WORLD-02 check 4 | **pass** 9/10; 30 seeds 26/30 | |
| WORLD-02 check 5 | **pass** 10/10; 30/30 | foreign kinds 0 |
| WORLD-02 check 6 | **pass** 8/10 (was 7); **30 seeds 22/30 (bar 24)** | lead min 6 s, visible 27 of 27 at 30 seeds |
| WORLD-02 check 7 | **pass** 10/10 (was 5); 30 seeds 30/30 | jupiter 4.2–6.4 km, control 2.0–2.9 km |
| Admiral pushes in *every* battle past its decision point | **not met**: 8 of 10, 22 of 30 | section 4.2 |
| EXP-06 step 6: scripted-good wins outright ≥ 3 of 10 | **not met with fair rosters off** (0 of 10, 0 of 30); **met with them on** (3 of 10; 7 of 30) | section 4.1 |
| WORLD-01 checks 1–5 (idle) | pass | |
| WORLD-01 check 6 (swap) | **FAIL 7 of 10, already failing on the game tip before my merge** (7 of 10 measured on `claude/game` @ 6f635a6 this session; PKG-14 item 7 recorded 22 → 19/30) | not mine |
| Feel: does the Jupiter admiral feel methodical? | wired-but-unproven (Caleb) | |

Rosters 1–8, check 2 (fair rosters off): 1 enemy 10 · 2 enemy 10 · 3 enemy 10 · 4 enemy 8, none 2 · 5 enemy 10 ·
6 enemy 10 · 7 enemy 6, none 2, player 2 · 8 none 7, enemy 2, player 1.

## 4. Trade-offs I could not tune away (stopped here)

1. **With fair rosters, scripted-good wins but checks 3 and 4 fall.** Merged result with `fairRosters` on, roster 1,
   seeds 1–10: check 3 4/10, check 4 7/10, scripted-good outcomes victory 3, withdrawal 3, timeout 4. Over 30 seeds:
   check 3 10/30, check 4 23/30, check 2 28/30, check 6 26/30, check 7 30/30, victories 7/30. The cause is the measure.
   Checks 3 and 4 count "ships lost" (wrecked, struck, captured), and fled ships do not count. On even fleets a
   scripted-good *victory* often costs more ships than idle's quick break, and idle's fleet mostly flees. Two other
   measures, same runs, 30 seeds: "better outcome, else fewer ships lost" gives check 3 18/30, check 4 23/30. "Net
   strength (enemy lost − player lost)" gives check 3 22/30, check 4 30/30. I searched `maxWithdrawals` 0–3,
   `withdrawMoraleMargin` 4/8, `withdrawHullFrac` 0.2/0.35, `minRangeM` 4000–7000, `openBonus` 4/8, `pushCooldownS`
   45/90 and the normal difficulty 2 s/0.1 against 3 s/0.2, each over 30 seeds. Check 3 stayed between 10 and 21 of 30
   in every case, and none of them held checks 2, 3 and 4 above bar together with ≥ 3 scripted-good wins. The
   scripted policies cannot be tuned (package rule 3), so this has to be ruled on (Requests 1, 2).
2. **A push in every battle: 8 of 10, 22 of 30.** In the missing seeds, the launchers' own captains board without
   orders (PKG-05 `captainBoards`) from 6 s on. By the 120 s decision point they are down to their reserve. Seen on
   seeds 1 and 17: capital 300 → 30 marines by 100 s, carrier 150 → 30. Two fixes I tried: holding the launchers on
   `holdPosition` until the first push (it stops self-boarding) raised check 6 to 28–29/30, but the flagship stayed
   out of the fight, idle beat the admiral 5–7 times in 30 and check 2 fell to 19/30. Bringing the decision point
   forward to 60 s changed nothing (28 v 29 seeds with a push). Both are measured and removed. Re-test costs one
   30-seed run (~70 s) per variant. Other misses are honest aborts: the target captured by a captain first, or the
   side closing again before launch.
3. **Pillar-3 boards and check 7.** Mars now brawls at about 2.4 km. That is the control doing what it is named for,
   not Jupiter changing. If "Mars-style control" should mean something else, check 7 needs a new definition.

## 5. Requests

1. **Daedalus / Caleb: rule on `ABILITY.fairRosters`.** On: even fleets and scripted-good can win, but checks 3 and 4
   as worded fail. Off (shipped): checks 1–7 pass and scripted-good never wins.
2. **Script owner (vision/scripts/WORLD-02.md, `checks.ts`):** if fair rosters go on, consider scoring check 3/4 by
   outcome first and ships lost second, or by net strength. The figures for both are in section 4.1.
3. **boarding (PKG-05/14 owner):** a captain under an `attack` order may board his ordered target without being told.
   That is how a Jupiter push goes missing (4.2). Possible fix: a standing boarding order (`standing.boarding: false` is
   already set for both houses) that also stops a captain's own launch from a launcher his admiral reserves. Or say
   that this is the intended character and lower check 6's "every battle" bar.

## 6. Assumed, for Caleb to overrule

- "Fair" means equal ability totals and the same traits **per class of hull** (and so per fleet), not just equal fleet
  totals. The single-ship classes (flagship capital, carrier) therefore get identical captains on both sides.
- Check 7's control closes on the far side (`focusSide` opposite the facing side). Jupiter itself is not moved.
- `maxWithdrawals` 3 → 1 (TASTE backed by one 30-seed comparison).
- A push whose every board order is refused does not count as launched for check 6.

## How it was measured

`npm run sim` (the PKG-02 runner, unchanged) for every table. Scratch harnesses for the mirror, swap, roster and
alternative-metric runs bundle `src/battle/sim/index.ts` with the repo's esbuild, exactly as the runner does. They are
not committed. Seeds 1–10 and 1–30, roster 1 unless a roster is named, 15 minutes max.

## Evidence

Commands on the merged branch (`claude/pkg-13` after `git merge claude/game`), run 2026-10-21 18:21–18:30 -07:00,
after the last source edit:

```
2026-10-21T18:21:34-07:00
$ npx tsc -b
tsc exit 0

2026-10-21T18:21:45-07:00
$ npx vitest run
 Test Files  66 passed (66)
      Tests  857 passed (857)

2026-10-21T18:22:14-07:00
$ npx eslint src/battle/sim
lint exit 0

2026-10-21T18:22:19-07:00
$ npm run build
PWA v2.0.0
mode      generateSW
precache  40 entries (2792.47 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js

2026-10-21T18:22:47-07:00
$ npm run smoke
[0.4s] vite on http://[::1]:5290
[11.3s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":23,"shots":562,"movedBySide":[11,12],"drawCalls":67}
[15.6s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (15.6s)
```

`npm run sim -- --script WORLD-02 --seeds 10 --minutes 15` (writes `vision/sims/WORLD-02/`):

```
| 1 | same seed, same policy, run twice: identical result | final state hash equal | 10 of 10 | 10 of 10 | pass |
| 2 | idle on even fleets: the winner does not swing with the seed | the same winner (or draw) | 8 of 10 | 10 of 10; winner "enemy"; tally enemy 10 | pass |
| 3 | scripted-good beats idle | player ships lost (good) < (idle) and outcome ≥ idle | 8 of 10 | 8 of 10; lost good 4 3 1 5 2 3 3 3 2 3 vs idle 4 4 3 4 4 5 5 4 4 4; outcomes good withdrawal 10 | pass |
| 4 | scripted-bad does worse than idle | player ships lost (bad) > (idle) | 8 of 10 | 9 of 10; lost bad 6 6 6 6 6 6 5 7 6 7 vs idle 4 4 3 4 4 5 5 4 4 4; outcomes bad withdrawal 8, defeat 2 | pass |
| 5 | the AI admiral uses the player's order set only | every AI order is a player order type (log check) | 10 of 10 | 10 of 10; orders issued 59 102 106 115 113 110 96 138 92 97; kinds attack 940, withdraw 10, focusSide 17, board 15, followFlagship 46; foreign 0 needed, log-foreign 0; stats.orders = admiral's count in 10 of 10 | pass |
| 6 | the AI telegraphs a boarding push ≥ 5 s ahead | telegraphLead ≥ 5 s on each push, telegraph visible | 8 of 10 | 8 of 10; seeds with a push 8 of 10; pushes 10; lead min 6 s; visible 10 of 10 | pass |
| 7 | Jupiter's mean engagement range beats a Mars-style control | meanRange(jupiter) > meanRange(control), range of every AI shot | 8 of 10 | 10 of 10; shots: jupiter 6165 6060 4833 5177 6417 5716 5536 4660 5252 5335 m; control 2655 2643 2289 2010 2572 2229 2417 2227 2467 2559 m | pass |
WORLD-02: every built check passed (7 pass, 0 not built, 0 not run)
```

`--seeds 30 --no-write`: check 3 21 of 30 FAIL, check 4 26 of 30, check 6 22 of 30 FAIL (seeds with a push 22; pushes
27; lead min 6 s; visible 27 of 27), check 7 30 of 30; checks 1, 2, 5 30 of 30. Scripted-good outcomes: withdrawal 30.

`--rosters 1-8 --no-write`: "rosters holding check 2: 6 of 8" (table in section 3).

WORLD-01 `--policy idle`: "every built check passed (5 pass, 1 not built, 1 not run)". `--variant
swap-nerve-judgement`: check 6 "7 of 10; mean player ships lost 4.1 → 4.2" FAIL. The same check on `claude/game`
before my merge: "7 of 10; mean player ships lost 3.7 → 4.3" FAIL.

Fair rosters **on**, merged, same commands (18:09–18:15): WORLD-02 10 seeds checks 1, 2, 5, 6, 7 pass, 3 "4 of 10"
FAIL, 4 "7 of 10" FAIL, "outcomes good victory 3, withdrawal 3, timeout 4". 30 seeds: 2 28, 3 10, 4 23, 6 26, 7 30,
"outcomes good victory 7, withdrawal 15, timeout 8". Rosters: 6 of 8.

Flag: none. Save: unchanged (v1). Screenshots: none (headless package; no `ui` steps).

Gate and merge evidence follow in the next commit.

## Gate and merge evidence

Lock taken 2026-10-21T18:09:13-07:00 by PKG-13 (none was present). Game tip merged into the branch first (5cd7220), then:

```
$ git -C <game> log --first-parent -3 --oneline
bdf7203 Merge PKG-13: Jupiter admiral boards with a visible telegraph and keeps range (WORLD-02 7/7 on 10 seeds); fair rosters built, off pending a ruling
6f635a6 Daedalus: PKG-14 and item 7 verified
86348d3 Merge PKG-14 item 7: a boarding run ordered at a side that is down gets through it unless the defender re-powers that side (Daedalus's ruling; WORLD-01 c6 at 30 seeds 22/30 -> 19/30)

$ git -C <game> diff --stat HEAD^1 HEAD
 vision/sims/WORLD-02/seed-08.scripted-good.json    |   2 +-
 .../sims/WORLD-02/seed-09.aggressive-admiral.json  |   2 +-
 vision/sims/WORLD-02/seed-09.json                  |   2 +-
 vision/sims/WORLD-02/seed-09.repeat.json           |   2 +-
 vision/sims/WORLD-02/seed-09.scripted-bad.json     |   2 +-
 vision/sims/WORLD-02/seed-09.scripted-good.json    |   2 +-
 .../sims/WORLD-02/seed-10.aggressive-admiral.json  |   2 +-
 vision/sims/WORLD-02/seed-10.json                  |   2 +-
 vision/sims/WORLD-02/seed-10.repeat.json           |   2 +-
 vision/sims/WORLD-02/seed-10.scripted-bad.json     |   2 +-
 vision/sims/WORLD-02/seed-10.scripted-good.json    |   2 +-
 58 files changed, 486 insertions(+), 63 deletions(-)

Gate, in the game worktree:
2026-10-21T18:26:30-07:00
$ npx tsc -b
tsc exit 0
2026-10-21T18:26:42-07:00
$ npx vitest run
 Test Files  66 passed (66)
      Tests  857 passed (857)
2026-10-21T18:27:10-07:00
$ npm run build
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
2026-10-21T18:27:39-07:00
$ npm run smoke
[0.5s] vite on http://[::1]:5290
[12.7s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":23,"shots":562,"movedBySide":[11,12],"drawCalls":67} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[17.0s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (17.0s)
```

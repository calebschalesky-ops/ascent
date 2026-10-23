# PKG-07: AI admiral (Talos, numbers by Palamedes's rules)

Branch `claude/pkg-07`, base `claude/game` @ a571a1c. Before the gate I merged it forward twice: to 03fc6c0 (PKG-05
boarding), then to 0e34fb1 (PKG-06 comms, PKG-04 view). Sim
only. No flag. Save shape unchanged: the battle sim is not saved, and `sides[side].admiral` is an optional field that the
admiral creates on its first tick.

## Result in one paragraph

The enemy is now commanded by `admiral-jupiter`, an operations layer that acts every 10 s. It acts only through `order()`
and only with the player's order kinds. On the final merged build (PKG-04, 05 and 06 all in), WORLD-02 checks 1, 2, 4, 5
and 7 pass. **Checks 3 and 6 FAIL.**
- Check 3 (scripted-good beats idle) is 4 of 10.
- Check 6 is 7 of 10. Every push the admiral made led its boarders by at least 6 s, with a visible telegraph, but 3
  seeds had no push at all.

Check 2 holds on 8 of 8 captain rosters against a bar of 6 of 8, and roster 1 stays in the setup. WORLD-01's built
checks all pass (6 of 7). Checks 4 and 6 have moved across the pass line as each package merged in, so read them as
knife-edges (table below).

## What I measured (all MEASURED-HERE, seeded, seeds 1–10, 15 min max, roster 1 unless stated)

| Check | Final merged build (PKG-04, 05, 06 in) | After PKG-05 only | Before any merge |
|---|---|---|---|
| 1 determinism | 10 of 10 hashes equal | 10 of 10 | 10 of 10 |
| 2 idle winner does not swing | 10 of 10 enemy | 10 of 10 | 10 of 10 |
| 3 scripted-good beats idle | **4 of 10, FAIL**. Ships lost, good: 2 2 3 2 2 3 2 3 3 2. Idle: 2 2 2 4 2 4 3 3 3 3 | 5 of 10 | 2 of 10 |
| 4 scripted-bad worse than idle | 8 of 10, pass. Ships lost, bad: 3 3 5 3 3 4 5 5 4 4 | 7 of 10 | 8 of 10 |
| 5 player order set only | 10 of 10. Kinds used: attack 509, followFlagship 26, focusSide 18, board 14, withdraw 10. No foreign kinds; `stats.orders` equals the admiral's own count in 10 of 10 | 10 of 10 | 10 of 10 |
| 6 telegraph >= 5 s before boarders launch | **7 of 10, FAIL**. Pushes in 7 seeds, one each. Every one: lead 6 s, telegraph visible. 3 seeds had no push (a seed with no push counts as a miss) | 8 of 10 | wired-but-unproven (no `board` order) |
| 7 Jupiter range > Mars control | 9 of 10. Mean shot range, Jupiter: 5725 4673 4833 4333 4881 5115 4988 5644 5562 4993 m. Control: 4521 4255 4719 4442 4758 4277 4511 3888 3809 4825 m | 9 of 10 | 10 of 10 |

**WORLD-02 check 2 across rosters (amendment A3), idle player against the admiral, merged build:**

| Roster | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Same winner, of 10 (final build) | 10 | 10 | 10 | 10 | 10 | 10 | 10 | 8 (player 2) |
| After PKG-05 only | 10 | 10 | 10 | 10 | 10 | 10 | 9 | **6** (player 4) |
| Check 2, final | pass | pass | pass | pass | pass | pass | pass | pass |

So 8 of 8 rosters hold, against a bar of 6 of 8. After PKG-05 alone it was 7 of 8. Read this honestly: check 2 is stable
because the admiral beats an idle player in 78 of 80 battles. It says the result is lopsided, not that it is fair.
Roster 8 is the knife-edge. PKG-02 measured its captains winning 7 of 10 for the player against the stand-in, and
boarding plus comms swing it between 2 and 4 player wins of 10. `rosterSeed` stays 1.

**WORLD-01 on the final build** (idle, plus the swap variant): checks 1-6 pass; 7 is not built. After PKG-05 alone, the
admiral's short battles had dropped check 5 (timeout decisions) to a mean of 1.3 a battle. With PKG-06's comms it is
11.9 a battle and passes.

**Battle shape against the admiral (seeds 1-10, final build):** the idle player's side breaks between 1:42 and 2:34
every time, on "6 of 12 ships lost" (once 7). Fled ships count toward that. Against the stand-in it lasted about 5
minutes. Run time in Node is about 0.1-0.4 s per battle.

### How the design moved (measured, reported so nothing is hidden)

I set the check 7 bar before the first run, then changed both the design and the metric after seeing results:

1. **v1.** The line used `focusSide` on the focus target, the target score weighted hull, and range was the distance to
   the nearest foe, sampled each second. Check 7 was 0 of 10. Check 2 on roster 1 was 8 of 10, check 3 was 5 of 10 and
   check 4 was 9 of 10. Cause: `focusSide` sends each ship to a point off the target's side, and when the target turns,
   that point swings round it, through the enemy's laser range.
2. **The metric.** The nearest-foe sample is survivorship-biased. The Mars control's escorts close to 0.5–2 km, die,
   and stop counting, which leaves its line at 6–7 km. I switched check 7 to **the mean range of every shot the AI
   fired**, the `range` field each shot event logs. That is where the fight actually happens. The runner still prints
   the nearest-foe sample next to it. On the merged build that sample also passes, 10 of 10. Before boarding it was 5 of
   10.
3. **v2 to v4, the design.** Targets are scored by the effort needed to break them, from class numbers. The focus side
   follows the side that faces the line. A line ship with an enemy inside 5 km engages that ship, because an `attack`
   order backs a captain off to its preferred range. Finally, the line uses `attack` on the focus instead of
   `focusSide`. A line standing together hits the side of the target that faces it, so the focus is still one side of
   one ship. Shot-range results by version: 4 of 10, then 7 of 10, then 10 of 10. Breakdown by gun at v3: Jupiter's
   destroyers and capital were firing lasers (100–150 shots each), while the control's line fired rails only, at
   6.5–7.5 km.

None of these changes was made for check 2, and I did not choose a roster. Check 2 was measured on rosters 1–8 only on
the final design.

### Seed 1, first 3 minutes, condensed (the admiral's own decision log; orders go out 2 s later, its reaction delay)

```
0:01 focus Ekklesia (escort), fore side
0:11 Ekklesia's port side seen open: shift the focus to it
0:11 Ekklesia's port side is open but 2 escort(s) cover it: no push
0:21 focus Stoa (cruiser), fore side
0:27-0:35 six range-keeping calls: Basileus, Io, Diadem, Second Crown each engage whoever came inside 4.0-5.0 km
0:41 Stoa's fore side is open but 1 escort(s) cover it: no push
1:01 focus Pnyx (cruiser), aft side
1:01 boarding push decided: Pnyx's aft side, launchers Ganymede, Callirrhoe
1:03 TELEGRAPH: escorts forward on Pnyx, 2 launcher(s) turning to its aft side; boarders in 6 s
1:09 BOARD: 2 of 2 launcher(s) send boarders at Pnyx's aft side
1:21 Pnyx's starboard side seen open: shift the focus to it
1:31 focus Kleros (escort), starboard side
1:46 the player's side breaks: 6 of 12 ships lost (outcome withdrawal at 1:58)
```

Whether this feels methodical is for Caleb to judge.

## What I changed

New, in `src/battle/sim/admiral/` (mine):

| File | What |
|---|---|
| `admiral.ts` | The operations layer and its controllers. **Sensors:** it reads its own side's shot events (a hit on the hull means that side is open, a hit on a shield means it is closed) and enemy `shieldDown` events, plus enemy positions, headings, classes and statuses. It never reads an enemy's shields, hull, morale, systems or captain. A test proves this by scrambling all of those, and the decisions come out identical. **Every 10 s:** pick the focus ship (effort to break it, distance from the line, a bonus if it has been seen open), pick its side (the open side if one has been seen, otherwise the side facing the line), and send the line to attack it, with escorts screening the flagship. **Every 2 s:** keep the range (a line ship engages any enemy inside 5 km) and withdraw a ship that is within 8 morale of breaking or under 35% hull. It never withdraws the flagship, never more than 3 ships, and never a ship whose withdrawal would itself break the side. **Boarding push:** only when the focus side has been seen open and no enemy escort is within 2.5 km of the target. Escorts are ordered forward and the launchers to `focusSide` the open side, a `telegraph` event is logged, and `board` goes out 6 s later, after the side is re-checked as still open. Styles: `jupiter`, `mars` (the control, where every ship attacks the nearest enemy), `good`. Also `scriptedBad`. |
| `numbers.ts` | The difficulty knob (reaction delay and mistake rate; Phase A uses `normal`, which is 2 s and 0.1) and every tunable. All first-pass. |
| `state.ts` | `AdmiralState`, plain data on `battle.sides[side].admiral`. |
| `report.ts` | `admiralReport(b, side)`: orders, kinds, foreign kinds, log cross-check, pushes with lead and visibility, shot range, nearest-foe range, and the ops log. |
| `admiral.test.ts` | 10 tests: registry and setup; determinism and a JSON round trip mid-battle; player order kinds only, with `stats.orders` equal to the admiral's count; the source assigns no ship field; enemy shields, hull, morale and captains don't change its decisions; reaction delay; telegraph lead ≥ 5 s and visible; Jupiter's range beats the control on seed 1; flagship never withdrawn; the easy difficulty makes mistakes. |

Registry lines (rule 9):
- `types.ts`: the `telegraph` LogEvent member, and the field `SideState.admiral?` (plus its type import).
- `policies.ts`: four policy entries (`admiral-jupiter`, `aggressive-admiral`, `scripted-good`, `scripted-bad`) and their import.
- `checks.ts`: `World02Extra`, `OUTCOME_RANK`, and rows 3–7, which replace the five `not built` rows only when the runner
  passes the admiral runs. A `wired-but-unproven` status member was added.
- `setups/saturn-12v12.ts`: the `controller` line, `doctrine-concentrate` → `admiral-jupiter` (named mine).

Outside rule 9, flagged:
- `index.ts`: two export lines. It is not on rule 9's list.
- `scripts/sim.mjs`: the package names the runner. For WORLD-02 with `--policy idle` it now runs five sets: idle, a
  repeat of idle, scripted-good, scripted-bad, and idle against `aggressive-admiral`. New options are `--roster N`,
  `--rosters 1-8` and `--enemy NAME`. Each seed file also carries the admiral report.

Sim output: `vision/sims/WORLD-02/seed-NN{,.repeat,.scripted-good,.scripted-bad,.aggressive-admiral}.json`.

## What is still broken

- **Check 6 FAIL (7 of 10).** Each push that happened telegraphed for 6 s and showed it. In 3 seeds no push happened at
  all, because the focus side was never seen open with the lane clear (no enemy escort within 2.5 km). Whether "no push"
  should fail a seed is a reading of the script; I counted it as a miss. `laneClearM` and `telegraphLeadS` are the
  numbers involved, and I did not tune them.
- **Check 3 FAIL (4 of 10).** Scripted-good uses Jupiter's focus and boarding, holds the flagship back and screens it
  with escorts. Two things stop it beating idle. First, the player side breaks on "6 of 12 out" at about 2 minutes either
  way, and ships lost run 1–5, so the strict `<` turns on one ship. Second, idle's own captains already target by
  Judgement. The numbers that decide it: `MORALE.sideBreakLosses` 0.5 (fled ships count as out), the per-ship break
  threshold, and the admiral's strength against an unled side. I did not tune scripted-good to pass. I tried one variant,
  the line using `attack` as Jupiter does: 2 of 10 before boarding, so no better.
- **Check 4 is a knife-edge:** 8 of 10, then 7 of 10 after boarding merged, and 8 of 10 again after comms. Scripted-bad
  is split fire, a board into closed shields every 30 s, and the flagship sent forward against theirs. It loses 3-5
  ships, against idle's 2-4.
- **The admiral does not answer its captains' questions** (`answer()`). A captain's timeout decision (`cover`) can cancel
  a withdraw order, and the admiral then repeats it (seen in seed 1).
- **No real sensor model.** The sim has no fog. The admiral limits itself by hand, and a test enforces it.
- Captains on the AI side still board on their own (PKG-05). Those launches are not admiral pushes and carry no
  telegraph.

## Script steps

| Step | Result |
|---|---|
| WORLD-02 check 1 | pass, 10 of 10 |
| WORLD-02 check 2 | pass, 10 of 10 on roster 1; 8 of 8 rosters (bar 6 of 8) |
| WORLD-02 check 3 | **FAIL**, 4 of 10 (needs 8) |
| WORLD-02 check 4 | pass, 8 of 10 (knife-edge: 7 of 10 on the PKG-05-only build) |
| WORLD-02 check 5 | pass, 10 of 10 |
| WORLD-02 check 6 | **FAIL**, 7 of 10 (needs 8); every push that happened passes |
| WORLD-02 check 7 | pass, 9 of 10 |
| WORLD-01 built checks (idle and swap) | pass (1-6) |

Flag: none. Save version: unchanged. Screenshots: none (headless package, no `ui` steps).

## Evidence (my branch with claude/game @ 0e34fb1 merged in, before the game merge; my last code edit was that merge, 15:47)

```
2026-10-21T15:47:37-07:00  npx tsc -b              -> exit 0
2026-10-21T15:47:54-07:00  npx vitest run          -> Test Files 58 passed (58); Tests 774 passed (774)
2026-10-21T15:48:11-07:00  npx eslint src/battle/sim scripts/sim.mjs -> exit 0 (no output)
2026-10-21T15:48:18-07:00  npm run build           -> files generated dist/sw.js, dist/workbox-9c191d2f.js; exit 0
2026-10-21T15:48:46-07:00  npm run smoke           -> [12.5s] skirmish smoke: ok=true frames=60 ... "shots":486,"movedBySide":[11,11]
                                                      [16.8s] voyage boot: ok=true probe=object errors=0
                                                      SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (16.8s)
2026-10-21T15:49:10-07:00  npm run sim -- --script WORLD-02 --seeds 10 --minutes 15   -> table above; "2 built check(s) FAILED" (3, 6)
2026-10-21T15:49:17-07:00  npm run sim -- --script WORLD-02 --seeds 10 --minutes 15 --rosters 1-8 --no-write -> "rosters holding check 2: 8 of 8"
2026-10-21T15:49:39-07:00  npm run sim -- --script WORLD-01 --seeds 10 --minutes 15 --variant swap-nerve-judgement --no-write
                           -> "WORLD-01: every built check passed (6 pass, 1 not built, 0 not run)"
```

Under a loaded machine (other packages testing at the same time), one full vitest run timed out at 5 s on my JSON
round-trip test and on `src/components/space/hardpoints.test.ts` (not mine). I gave my suite a 60 s budget. A re-run
passed everything.

The gate output after the merge goes in the follow-up commit below.

## Requests

- **Daedalus / Palamedes:** checks 3 and 4 are knife-edges on "ships lost", in a battle that always ends on half the
  fleet out at about 2 minutes. Either the pass measure (for example, enemy ships lost or captured, or the break time)
  or `MORALE.sideBreakLosses` is the lever. That is not mine to change.
- **Daedalus:** check 6 reads "on each AI boarding push". Rule on whether a seed with no push fails, which is how I
  count it, or does not count.
- **index.ts** is not a rule 9 registry. I added two export lines and kept PKG-05's in the merge.

## Assumed, for Caleb to overrule

- **"Methodical range" as numbers:** the line fights from its captains' preferred ranges (6–9 km, railgun range). A ship
  with an enemy inside 5 km engages that enemy to back off. One target at a time, held until it leaves the field.
  Withdraw within 8 morale of breaking or under 35% hull, at most 3 ships. Push only through a side seen open with no
  enemy escort within 2.5 km. A 6 s telegraph.
- **Difficulty `normal`:** 2 s reaction delay and a 10% chance per decision of taking the second-best target. `easy` and
  `hard` exist but are not used.
- **The Mars control** is "every ship, escorts included, attacks the nearest enemy, with no withdrawals and no pushes",
  not a full Mars admiral.
- **Engagement range** means the mean range of the AI's shots.

## Gate (after the merge, in the game worktree)

```
$ git log --first-parent -3 --oneline   (claude/game)
e25ae20 Merge PKG-07: AI admiral (Jupiter, methodical range), scripted policies, WORLD-02 checks 3-7
0e34fb1 Merge PKG-04: report evidence
33c4407 Merge PKG-04: skirmish view on the real engine (simFeed), ship states on screen, end screen, probe order verb

$ git diff --stat e25ae20^1 e25ae20   (vision/sims summarised on the last line)
 reports/PKG-07.md                      | 202 +++++++++++++++++
 scripts/sim.mjs                        |  58 ++++-
 src/battle/sim/admiral/admiral.test.ts | 130 +++++++++++
 src/battle/sim/admiral/admiral.ts      | 396 +++++++++++++++++++++++++++++++++
 src/battle/sim/admiral/index.ts        |   6 +
 src/battle/sim/admiral/numbers.ts      |  93 ++++++++
 src/battle/sim/admiral/report.ts       |  83 +++++++
 src/battle/sim/admiral/state.ts        |  76 +++++++
 src/battle/sim/checks.ts               |  63 +++++-
 src/battle/sim/index.ts                |   2 +
 src/battle/sim/policies.ts             |   5 +
 src/battle/sim/setups/saturn-12v12.ts  |   2 +-
 src/battle/sim/types.ts                |   6 +-
 13 files changed, 1107 insertions(+), 15 deletions(-)
 50 files changed, 50 insertions(+), 20 deletions(-)

2026-10-21T15:51:05-07:00
tsc exit 0
2026-10-21T15:51:16-07:00
 Test Files  58 passed (58)
      Tests  774 passed (774)
2026-10-21T15:51:31-07:00
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
build exit 0
2026-10-21T15:51:58-07:00
[12.5s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":22,"shots":486,"movedBySide":[11,11],"drawCalls":164} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[16.8s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (16.8s)
```

Gate passed: tsc, vitest, build and smoke. Nothing reverted. MERGE.lock deleted after this evidence merge.

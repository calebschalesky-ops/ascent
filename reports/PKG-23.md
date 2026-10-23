# PKG-23 report: tests and the end (Talos)

Branch `claude/pkg-23`, launched at 5bbedd0, game tip merged in at 0fc10f2. 2026-10-22.

## What I measured

- **Which tests are slow.** A full `--maxWorkers=4` run with the JSON reporter, unloaded: 39 tests at 0.5 s or more,
  the slowest balance "writes the report" 15.5 s, conquest 11.3 s, admiral telegraph 10.1 s. Only one test holds a
  wall-clock bar: `swarm.test.ts` "hundreds of drones ... in a few milliseconds" (`ms < 8`). It failed at 8.59 ms in my
  first loaded run, alongside `components/space/hardpoints.test.ts` earth timing out at the 5 s default (6.2 s).
  The "few draw calls" in hardpoints is a mesh count, not a time.
- **F-06, reproduced.** saturn-12v12 seed 3: the player has no active ship at 5:11 (311 s); the battle ran to 491 s,
  the full 180 s `pursuitWindow`. The player's broken ships that could not jump (pinned Fanatics, dead drives) kept the
  side "in the field", so `cleared` never came true. Seed 1 was 29.5 s. That matches QA-05 run 1: 0/11 at 4:16, still
  running at 6:45, and "do-nothing runs ended about 12 s after the break" (12 s = `ESCAPE.jumpSpool`).
- **After the fix**, a probe over every registered setup (22 of them) × seeds 1-10 = 220 battles: the longest gap from
  "a side has no active ship" to the end is 12.0 s. Outcomes: 164 withdrawal, 43 victory, 11 timeout, 2 defeat. The
  probe file was temporary and is not committed.

## What I changed

1. **The end check**, `src/battle/sim/battle.ts` `checkEnd()`, lines 650-653 on the merged branch: a new `spent` term
   (lines 650-652, comment plus one line) and `spent ||` added to the existing end condition (line 653). A broken side
   with no active ship now ends the battle once `ESCAPE.jumpSpool` (12 s) has passed since it broke. Its runners get
   one spool to get out; its stragglers no longer hold the field for 180 s. No new number: it reuses `jumpSpool`.
   `end()` is unchanged, so the loser and outcome rules are the same as before, only reached sooner.
2. **The F-06 test**, new `src/battle/sim/end.test.ts`: seed 3 ends within 15 s of the player losing his last active
   ship, with broken player ships still in the field (the old hang's cause); seeds 1-4 for both sides, whether "no
   active" or "no ship in the field" comes first. With `battle.ts` stashed, both tests fail ("expected 180 to be less
   than or equal to 15"; "seed 1 player: expected 29.47 ..."). With the fix, both pass.
3. **Timeouts** (no assertion deleted, no assertion changed): describe-level `{ timeout: 60_000 }` on the describes
   that hold the slow tests, in maneuvers (all 7), sim (determinism, idle battle), comms (lines, policy), setups
   (registry, headless), boarding (determinism), director, bridge (one break rule), components hardpoints
   (buildHardpoints), planets (headless run), view (sim feed), pkg16 (ui-like), pkg19 (plans), megastructure
   hardpoints. Admiral's existing describe timeout 60 000 → 120 000 (its telegraph tests run 10 s unloaded).
   Explicit per-test timeouts already in the files are left as they were.
4. **The moved bar**: `swarm.test.ts` "performance" is split. The suite keeps "hundreds of drones fly" (≥ 500 flying);
   the `ms < 8` bar is `it.runIf(ASCENT_BENCH)` "bench: ..." and runs only in `npm run bench`.
5. **`scripts/bench.mjs`** and the `bench` line in `package.json`: runs every "bench:" test in its registry list of
   files, one worker, `ASCENT_BENCH=1`; prints the timing and one PASS/FAIL line; non-zero on any failure.

## Script steps

| Step | State |
|---|---|
| 1. Load-proof tests (timeouts, time bar moved to bench, 3 runs under 2 other `npx vitest run`) | pass |
| 2. QA-05 F-06: a side with nothing left ends within 15 s, with a reproducing seed | pass (seed 3) |

Flag state: no flag (the end check is sim behaviour; no UI added). Save version: unchanged (no save shape touched).

## Still broken / not mine

- `npm run lint`: 7 errors, 11 warnings, all in files outside this package (`Voyage.tsx`, `armourScene.ts`,
  `boarding.ts`, `swarms.ts`, ...). None in mine (eslint on my four files: clean).
- One of the two *load* processes (load A, pass 2, a default-width `npx vitest run` with no `--maxWorkers`) exited 1
  during the merged-branch load test; I did not capture which test. The bar is the `--maxWorkers=4` run, which passed 3
  of 3 both times, and A7 already says the full-width run times out under parallel load. Re-test costs one loaded
  full-width run with output kept.

## Requests

- None needed to finish. For Palamedes: `ESCAPE.pursuitWindow` (180 s) now runs only while a broken side still has a
  ship fighting (a captured prize, say). If he wants a pursuit phase back, it needs its own design, not the window.

## Assumed, for Caleb to overrule

- I read "no ship left in the field" as "nothing left fighting": a broken ship that is running counts as gone, as the
  HUD's `alive/total` already shows it. The literal reading (broken ships still count) would not have fixed run 1.
- The grace before the end is one jump spool (12 s), so ships that can jump still get out and count as fled, not lost.
  QA's do-nothing runs already ended about 12 s after the break; this makes every run do that.
- Timeouts are describe-level options rather than one per `it`: the same per-test timeout, one line per describe.

## Evidence

Load test on the merged branch (e28d7d0, game tip 0fc10f2 merged in), each run `npx vitest run --maxWorkers=4`
while two loops of `npx vitest run` ran in the same worktree:

```
=== run 1 2026-10-22 12:41:44 under 2 looping 'npx vitest run' loads
 Test Files  74 passed (74)
      Tests  927 passed | 1 skipped (928)
   Start at  12:41:48
   Duration  138.81s (tests 84%, import 14%, transform 1%, worker 1%)
=== run 2 2026-10-22 12:44:10 under 2 looping 'npx vitest run' loads
 Test Files  74 passed (74)
      Tests  927 passed | 1 skipped (928)
   Start at  12:44:56
   Duration  140.88s (tests 80%, import 18%, transform 2%)
=== run 3 2026-10-22 12:47:17 under 2 looping 'npx vitest run' loads
 Test Files  74 passed (74)
      Tests  927 passed | 1 skipped (928)
   Start at  12:47:23
   Duration  129.41s (tests 84%, import 12%, transform 3%)
load A pass 1 exit 0 12:43:34
load A pass 2 exit 1 12:45:38
load A pass 3 exit 0 12:47:43
load B pass 1 exit 0 12:43:32
load B pass 2 exit 0 12:45:35
load B pass 3 exit 0 12:47:37
load B pass 4 exit 0 12:49:36
```

The same bar on the branch before the game merge (7dd4e35 content), 12:32-12:38: 72 files, 914 passed | 1 skipped,
3 of 3; load A 4 passes and load B 3 passes, all exit 0. (The skipped test is the bench bar.)

Acceptance on the merged branch, 2026-10-22 12:49:41:

```
tsc-exit=0
✖ 18 problems (7 errors, 11 warnings)          (npm run lint: all pre-existing, none in my files)
  dist/sw.js
  dist/workbox-9c191d2f.js                     (npm run build)
[34.0s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":21,"shots":639,"movedBySide":[11,10],"drawCalls":169}
[38.9s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (38.9s)
549 drones flying in 12 swarms: 2.23 ms a step (pure maths, no drawing)
✓ src/lib/swarm/swarm.test.ts > performance > bench: hundreds of drones in a full battle step in a few milliseconds 986ms
bench: PASS · 1 bar(s) · 2.8s
```

F-06 test against the old end check (battle.ts stashed):

```
     × seed 3 (the old 180 s hang) ends within 15 s of the player losing his last active ship 1168ms
     × seeds 1-4: every side that runs out of active ships, or of ships in the field, sees the end within 15 s 953ms
AssertionError: expected 180 to be less than or equal to 15
AssertionError: seed 1 player: expected 29.46666666666664 to be less than or equal to 15
```

No screenshots: this package has no `ui` step; `npm run smoke` is the on-screen boot check.

Lock: `MERGE.lock` was absent; taken 2026-10-22 12:41:34 as PKG-23, time line rewritten at each gate step.
The game-branch log, merge diff stat and gate output follow in the evidence commit below.

## Evidence after the merge

`git log --first-parent -3` on claude/game:

```
69fd1fa 2026-10-22 12:53:36 -0700 Merge PKG-23: load-proof test timeouts, npm run bench, battle ends 12 s after a broken side has nothing fighting (F-06)
0fc10f2 2026-10-22 12:30:18 -0700 Daedalus: PKG-20, PKG-21, PKG-22 verified
ac013d7 2026-10-22 12:25:16 -0700 Merge PKG-21: report evidence
```

`git diff --stat` of the merge (69fd1fa^1..69fd1fa):

```
 package.json                               |   3 +-
 reports/PKG-23.md                          | 133 +++++++++++++++++++++++++++++
 scripts/bench.mjs                          |  31 +++++++
 src/battle/sim/admiral/admiral.test.ts     |   2 +-
 src/battle/sim/battle.ts                   |   5 +-
 src/battle/sim/boarding/boarding.test.ts   |   2 +-
 src/battle/sim/comms/bridge.test.ts        |   2 +-
 src/battle/sim/comms/comms.test.ts         |   4 +-
 src/battle/sim/end.test.ts                 |  45 ++++++++++
 src/battle/sim/maneuvers/maneuvers.test.ts |  14 +--
 src/battle/sim/pkg16.test.ts               |   2 +-
 src/battle/sim/pkg19.test.ts               |   2 +-
 src/battle/sim/setups/setups.test.ts       |   4 +-
 src/battle/sim/sim.test.ts                 |   4 +-
 src/battle/view/director/director.test.ts  |   2 +-
 src/battle/view/view.test.ts               |   2 +-
 src/components/space/hardpoints.test.ts    |   2 +-
 src/lib/megastructure/hardpoints.test.ts   |   2 +-
 src/lib/planets/planets.test.ts            |   2 +-
 src/lib/swarm/swarm.test.ts                |  51 ++++++-----
 20 files changed, 269 insertions(+), 45 deletions(-)
```

Gate in the game worktree:

```
2026-10-22 12:53:44
tsc-exit=0
 Test Files  74 passed (74)
      Tests  927 passed | 1 skipped (928)
   Start at  12:54:56
   Duration  75.88s (tests 86%, import 11%, transform 3%, worker 1%)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
build-exit=0
[40.2s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":21,"shots":639,"movedBySide":[11,10],"drawCalls":169} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[45.4s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (45.4s)
```

Gate passed; the merge stands. MERGE.lock deleted after the evidence merge.

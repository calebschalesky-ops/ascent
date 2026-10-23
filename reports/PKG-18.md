# PKG-18 report: maneuver fixes

Seat: Talos (one name for Kalliope's seat, see "Assumed"). Branch `claude/pkg-18`, base `claude/game` @ 6701d3a,
merged with the tip 1f0a677 (Daedalus board line only, no code). Date 2026-10-21.

**Merge state: NOT merged.** Two gate runs failed on `hardpoints.test.ts` timeouts under machine load (not my files)
and were reverted; see the two Gate sections at the end.

**Result in one line:** Helm 9 now finishes sooner and holds the plotted course tighter than Helm 3 on all six
maneuvers, flown, and is never looser in 684 live geometries (PKG-12's flanking arc case included). The broadside
pass no longer runs back to an entry point. "Kraken Mare" is now "Ligeia".

## What I measured

**The cause of PKG-12's finding.** The PKG-10 pilot flew every leg as a bearing to its end point and, for a good
helmsman, switched to the next waypoint early (a fillet of 0.9 of his turning radius). On a short leg the switch came
before the ship was on the leg at all (a 120-degree corner gives a 958 m turn-in on a cruiser), and from there he
homed straight on the next waypoint: a chord inside the chord. Low Helm turned in late and stayed on the lines. The
measure was fair; the pilot cut corners. Three smaller effects pushed the same way: the sharp-turn slowdown was a
fraction of each captain's own cruise (so Helm 9 turned at a higher speed and a wider radius than Helm 3), there was
no braking before a hold (Helm 9 arrived faster and drifted further while turning to face), and a ship turned to face
while still under way in a hold.

**Sweep, before and after** (scratch harness, preview only, the same measure as the new test: worst distance from any
ghost-line point to the plotted course; seeds 1, 3, 5 at 0, 4 and 20 s of a live battle, both controllers running;
every maneuver; 19 ship groups × 4 targets; Helm 9 vs Helm 3, trait By-the-book):

| | Helm 9 tighter | tie (both within 50 m) | Helm 9 looser | Helm 9 not sooner |
|---|---|---|---|---|
| PKG-10 pilot (6701d3a) | 438 of 684 | 14 | **232** (flanking arc 123, wheel 56, withdrawal 48, boarding run 3, crossing 2) | 0 |
| PKG-18 pilot | **637 of 684** | 47 | **0** | 0 |

**PKG-12's own probe, re-run in the browser** (`act('tactical.helm', …)` on seed 3 at 0:04, its mean measure,
`http://[::1]:5218/?skirmish&probe`): Helm 9 / Helm 3 mean off course, preview ETA.

| Maneuver | PKG-12 (before) | PKG-18 |
|---|---|---|
| broadside pass Agora → Diadem | 45 / 96 m | 4 / 21 m, 132.9 / 178.8 s |
| crossing the line Agora → Diadem | 15 / 146 m | 8 / 114 m, 74.2 / 105.6 s |
| flanking arc Agora → Diadem | **76 / 43 m** | 3 / 4 m, 46.5 / 55.3 s |
| flanking arc Agora → Second Crown | **83 / 68 m** | 0 / 0 m (both on the course), 44.5 / 52.6 s |
| flanking arc Agora → Sceptre | 98 / 102 m | 21 / 31 m, 64.9 / 80.3 s |
| flanking arc Pnyx → Diadem | **70 / 42 m** | 0 / 0 m (both on the course), 45.0 / 53.3 s |
| flanking arc Stoa → Europa | **82 / 45 m** | 4 / 5 m, 47.6 / 56.7 s |

Flown matched preview to the decimal in every flown row (`flownMaxFromGhostM` 0–3 m). `__probe.errors()` empty. The
flanking arcs now take ~8 s longer than PKG-12 measured: ships slow into turns (below).

**Broadside pass detour** (the same sweep, broadside only, 180 cases × 2 helms):

| | worst swing out past max(start, range) from the target's track | worst run back along the pass | cases running back > 200 m |
|---|---|---|---|
| before | 611 m (H9) / 657 m (H3) | **9,112 m** | 56 of 180 |
| after | 282 m / 563 m | **162 m** | 0 of 180 |

The dog-leg in `shots/pkg-12/exp03-step3b-…-2m49.jpg` was the leg back to the entry point at −0.8 × range behind the
beam. After: `shots/pkg-18/exp03-step7-broadside-pass-pnyx-diadem-ghost-3m06.jpg`, the same order (Pnyx → Diadem, seed
3, 0:02 tactical clock): one straight diagonal joining the run at 35°, then the run. It still goes out to range from
the target's track on the planet side, because a pass parallel to the target at range has to be at range; that part
is the shape, not a detour.

**No behaviour change without a maneuver order:** with the old name restored for one run, WORLD-01 hashes for seeds
1–10 equal the baseline exactly (89368da872226c03 … 3e8815e5e00e205f). With "Ligeia" the hashes differ (the name is in
the state) and every outcome, loss, break, timeout and self count is identical.

## What I changed

All in my files.
- `maneuvers/pilot.ts`: the pilot follows each leg as a line. He steers for a point `look` ahead on the line, with
  look = radius × (0.9 + 0.25 × (10 − Helm)): Helm 9 ≈ 1.15 radii, Helm 3 ≈ 2.65. He turns in for the next leg at
  the fillet his Helm anticipates, never before half the current leg is flown. Leg completion is measured along the
  line, so an overshooting ship moves on instead of circling back. He slows into a turn from top speed (bow on course)
  to 0.3 × top at 60° off, a fraction of the class's top speed and the same for every captain, so the better turn
  rate makes the tighter turn. He brakes into a hold over the whole remaining course to it, and in the hold he stops
  before turning to face. The first leg of a course has no line behind it and is still flown as a bearing.
  `PilotLimits` gains `top` and `look` (computed, not saved). `pilotStep`'s signature is unchanged (the view's
  `paths.ts` calls it).
- `maneuvers/shapes.ts` `broadsidePass`: the run's direction is the way that passes the target (if the ship is more
  than a quarter range ahead of or behind the beam), else the way it is heading. The approach joins the run line
  ahead of the ship at no more than 35°, never behind it, never past the beam unless the ship already is. The run
  goes to the far end (at least half a pass length).
- `maneuvers/numbers.ts`: `lookBase`, `lookPer`, `brakeAt`, `brakeFloor`, `brakeAccel`, `filletLegFrac`, `passJoin`,
  `passAbeamMul`, all first-pass; `sharpTurnSpeed` now means a fraction of top speed.
- `setups/saturn-12v12.ts`: "Kraken Mare" → **"Ligeia"** (the player's carrier, p7).
- `maneuvers.test.ts`: PKG-10's three Helm tests replaced by
  - six flown tests, one per maneuver on PKG-10's cases: Helm 9 ETA sooner, flown completion sooner, worst distance
    from the plotted course smaller, and each flown within 50 m of its ghost line;
  - the 684-geometry live sweep: Helm 9 sooner in every one, never looser; a tie is both within `MAN.previewTolM`;
    more than 75% strictly tighter (measured 637);
  - the broadside bound: across 360 cases no ghost-line point swings out past max(start distance, range) from the
    target's track, or runs back along the pass, by more than the ship's turning radius; the last leg runs parallel
    to the target's heading, at range.

**Names checked** (the other 23 against Greek, Roman, Byzantine history and `LORE.md`). Changed: Kraken Mare only (Norse
sea monster, via the Titan sea). Kept: Kleros, Pnyx, Bema, Agora, Astu, Ekklesia, Stoa (Athenian institutions and
places), Thalassa, Hyperion, Phoebe (Greek gods and Titans), Basileus, Second Crown (`LORE.md`), Ganymede,
Callirrhoe, Io, Europa, Amalthea (Greek myth). Lot, Companion, Diadem, Herald, Spear, Sceptre are English words for
Greek things (the Athenian lot, the Macedonian Companions that `LORE.md` itself names, the Hellenistic royal diadem);
I kept them, see "Assumed".

## Script steps

| Script step | State | Evidence |
|---|---|---|
| EXP-03 7: Helm 9 finishes sooner and holds the path tighter than Helm 3, on every one of the six | **pass** (probe step) | six flown tests and the sweep in `maneuvers.test.ts`; PKG-12's probe re-run above |
| EXP-03 4: previews still equal flown paths | **pass** | the six "ghost line is the path flown" tests (≤ 50 m) unchanged and passing; the probe's flown-vs-ghost 0–3 m |
| EXP-03 3 (broadside ghost line without the dog-leg) | sim: **pass** (bound test); on screen: one screenshot, above | `shots/pkg-18/…ghost-3m06.jpg` |

Flag: none. Save version: unchanged (`Battle.v` 1). No saved field added: `PilotState`, `Flight` and `Leg` keep their
shape; a flight saved mid-maneuver resumes under the new steering.

## Still broken or not done

- Ties: in 47 of 684 sweep geometries both helms fly within 50 m of the course (most of them 0–30 m), so neither is
  tighter by an amount that can be seen. The step's "tighter" holds strictly on the six test cases and in 637 of 684.
- Every maneuver takes a little longer than under PKG-10: ships now slow into turns. Helm 9's flanking arcs on seed 3
  went from 30–50 s to 45–65 s.
- The first leg of a course is still a bearing. A ship pointing away from its course swings out by up to a turning
  radius before it is on it (that is the 282 / 563 m broadside swing-out).
- The defensive wheel's ring radius still depends on Helm (1.5 × his turning radius), so a Helm 9 and a Helm 3 wheel
  are not exactly the same geometry. Left as PKG-10 built it.
- `vision/sims/*.json` written by earlier runs still say "Kraken Mare"; I ran the sims with `--no-write`. The next
  run that writes them will say "Ligeia".
- Wall-clock tests in files I do not own fail under load: `hardpoints.test.ts` (two of the seven planets time out at
  5 s, different ones each run) and `swarm.test.ts` "hundreds of drones… in a few milliseconds". They pass alone and
  with `--maxWorkers=4` (66 files / 862 tests, pasted below). With PKG-16 and PKG-17 running, the machine had 78
  node processes.

## Requests

- **Kalliope:** confirm "Ligeia" for the player's carrier (a Siren of Greek myth; `LORE.md` already has Ligeia Mare
  and the Ligeia Rigs on Titan). And rule on the English-word ship names listed above.
- **Palamedes:** the new numbers (`lookBase`/`lookPer`, braking, `passJoin`, the turn taper) are first-pass; whether
  the slower turns cost too much time is yours.
- **Daedalus / the owner of `src/components/space/hardpoints.test.ts`:** this file blocked PKG-18's merge twice. Its
  per-planet tests take 5–10 s inside a full parallel `npx vitest run` and time out at the 5 s default. A per-file
  `testTimeout` (as `maneuvers.test.ts` now has), or a `--maxWorkers` setting for the gate (66 files / 862 tests pass
  with `--maxWorkers=4`), would stop the gate from reverting merges that are fine. `swarm.test.ts` "hundreds of drones…
  in a few milliseconds", `planets.test.ts` "prints the tables", `raceArt.test.ts` "every path exists" and
  `view.test.ts` "ends with an outcome…" failed the same way in the first gate run. Then re-merge PKG-18 (retry steps
  in the second Gate section).

## Assumed, for Caleb to overrule

- "Holds the path tighter" is measured as the worst distance from the ghost line to the plotted course (the start,
  then each waypoint, as straight lines), and a difference inside the ghost line's own 50 m tolerance is a tie.
- A broadside pass on a ship that starts near the target's beam runs the way it is already heading, and a pass may
  start late (joining near the beam) rather than turn back for a full-length run.
- The ship name "Ligeia". The English-word names kept.
- Every number in `maneuvers/numbers.ts`.

## Evidence

Before (claude/game @ 6701d3a, identical code to the tip 1f0a677), 2026-10-21 ~18:40:

```
npm run sim -- --script WORLD-01 --seeds 10 --minutes 15 --no-write
  hashes 1-10: 89368da872226c03 8a9c0bd97d19c5ed 876989f00f78947b b1074b0b56da1fdc 617f665f0e2755b0
               68f1b5deabc7da0a e4f3954b04e702b3 2db0c48c29a6be32 5ac1e1ee55e97037 3e8815e5e00e205f
| 1 | battle ends with an outcome | ... | 10 of 10; withdrawal 10 | pass |
| 2 | both sides fired and dealt damage by 60 s | ... | 10 of 10; min at 60 s: player 1666, enemy 2226 | pass |
| 3 | a boarding attempt happened, unordered | ... | 10 of 10; mean attempts 20.3 (unordered 18.9); captured P 16 E 17 | pass |
| 4 | at least one ship broke (fled or struck) | ... | 10 of 10; mean broken 9.9 | pass |
| 5 | idle player's captains decided things on timeouts, each with a trait | ... | 10 of 10; mean 21.1 per battle, 21.1 of them closing a comms report | pass |
| 6 | swapping ... Nerve and Judgement ... | ... | run with --variant swap-nerve-judgement | not run |
| 7 | the director keeps filming | ... | needs the view (PKG-03 and later) | not built |
WORLD-01: every built check passed (5 pass, 1 not built, 1 not run)
npm run sim -- --script WORLD-02 --seeds 10 --minutes 15 --no-write
| 1 | same seed ... identical result | 10 of 10 | pass |
| 2 | idle on even fleets ... | 10 of 10; winner "enemy"; tally enemy 10 | pass |
| 3 | scripted-good beats idle | 8 of 10; lost good 4 3 1 5 2 3 3 3 2 3 vs idle 4 4 3 4 4 5 5 4 4 4 | pass |
| 4 | scripted-bad does worse than idle | 9 of 10; lost bad 6 6 6 6 6 6 5 7 6 7 vs idle 4 4 3 4 4 5 5 4 4 4 | pass |
| 5 | the AI admiral uses the player's order set only | 10 of 10; ... foreign 0 | pass |
| 6 | the AI telegraphs a boarding push ≥ 5 s ahead | 8 of 10; pushes 10; lead min 6 s; visible 10 of 10 | pass |
| 7 | Jupiter's mean engagement range beats a Mars-style control | 10 of 10 | pass |
WORLD-02: every built check passed (7 pass, 0 not built, 0 not run)
```

After, on the merged result (claude/pkg-18 after `git merge claude/game` @ 1f0a677, merge commit 8271d6c):

```
== 2026-10-21T18:59:24-07:00 npx tsc -b
tsc exit 0
== 2026-10-21T19:00:02-07:00 npx vitest run
     × mercury: fits every weapon on the cruiser, finite, near the hull, in a few draw calls 5597ms
     × venus: fits every weapon on the cruiser, finite, near the hull, in a few draw calls 6819ms
 Test Files  1 failed | 65 passed (66)
      Tests  2 failed | 860 passed (862)
   (hardpoints.test.ts alone, on the same tree, twice: Tests 12 passed (12), 11.2 s)
== 2026-10-21T19:10:13-07:00 npx vitest run --maxWorkers=4
 Test Files  66 passed (66)
      Tests  862 passed (862)
   Duration  111.25s
== 2026-10-21T19:01:25-07:00 npx eslint src/battle/sim
lint exit 0
== 2026-10-21T19:01:44-07:00 npm run build
✓ 300 modules transformed.
✓ built in 53.55s
== 2026-10-21T19:03:56-07:00 npm run smoke
[34.3s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":23,"shots":562,"movedBySide":[11,12],"drawCalls":67}
[38.9s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (38.9s)
== 2026-10-21T19:04:49-07:00 WORLD-01 (--seeds 10 --minutes 15 --no-write)
  hashes 1-10: 1cea5636f642a278 dc97745f880a2157 53e3d730525ec3e4 714709d18d186592 7e5e9be18cfcebc7
               c644879600fc4cae ee868a8795c54642 65e1e54c3bd04615 b31b0932ddce8ae5 2fd2f52dcf4c1e99
  (every other column of every seed row identical to before; with "Kraken Mare" restored: the 10 baseline hashes)
| 1 | ... | 10 of 10; withdrawal 10 | pass |
| 2 | ... | 10 of 10; min at 60 s: player 1666, enemy 2226 | pass |
| 3 | ... | 10 of 10; mean attempts 20.3 (unordered 18.9); captured P 16 E 17 | pass |
| 4 | ... | 10 of 10; mean broken 9.9 | pass |
| 5 | ... | 10 of 10; mean 21.1 per battle, 21.1 of them closing a comms report | pass |
| 6 | ... | run with --variant swap-nerve-judgement | not run |
| 7 | ... | needs the view (PKG-03 and later) | not built |
WORLD-01: every built check passed (5 pass, 1 not built, 1 not run)
== 2026-10-21T19:05:06-07:00 WORLD-02 (--seeds 10 --minutes 15 --no-write)
| 1 | ... | 10 of 10 | pass |
| 2 | ... | 10 of 10; winner "enemy"; tally enemy 10 | pass |
| 3 | ... | 8 of 10; lost good 4 3 1 5 2 3 3 3 2 3 vs idle 4 4 3 4 4 5 5 4 4 4; outcomes good withdrawal 10 | pass |
| 4 | ... | 9 of 10; lost bad 6 6 6 6 6 6 5 7 6 7 vs idle 4 4 3 4 4 5 5 4 4 4; outcomes bad withdrawal 8, defeat 2 | pass |
| 5 | ... | 10 of 10; orders issued 59 102 106 115 113 110 96 138 92 97; ... foreign 0 needed, log-foreign 0 | pass |
| 6 | ... | 8 of 10; seeds with a push 8 of 10; pushes 10; lead min 6 s; visible 10 of 10 | pass |
| 7 | ... | 10 of 10; shots: jupiter 6165 6060 4833 5177 6417 5716 5536 4660 5252 5335 m; control 2655 ... 2559 m | pass |
WORLD-02: every built check passed (7 pass, 0 not built, 0 not run)
```

WORLD-01 and WORLD-02 at `--seeds 10`: no worse than the tip; every number identical.

Diff of the package against the tip (`git diff --stat claude/game...claude/pkg-18` before the report):

```
 shots/pkg-18/exp03-step7-broadside-pass-pnyx-diadem-ghost-3m06.jpg | Bin 0 -> 96068 bytes
 src/battle/sim/maneuvers/maneuvers.test.ts         | 156 +++++++++++++++++----
 src/battle/sim/maneuvers/numbers.ts                |  25 +++-
 src/battle/sim/maneuvers/pilot.ts                  | 103 +++++++++++---
 src/battle/sim/maneuvers/shapes.ts                 |  18 ++-
 src/battle/sim/setups/saturn-12v12.ts              |   2 +-
 6 files changed, 257 insertions(+), 47 deletions(-)
```

Screenshot: `shots/pkg-18/exp03-step7-broadside-pass-pnyx-diadem-ghost-3m06.jpg`.

## Gate, first attempt: failed on load, reverted

`Merge PKG-18` e47d623, gate in the game worktree. tsc, build and smoke passed; `npx vitest run` failed 10 tests in 6
files, every one a 5 s timeout or a wall-clock bar, in a run where the machine was loaded by the parallel threads
(PKG-16, PKG-17; 78 node processes):

```
== 2026-10-21T19:14:33-07:00 npx tsc -b
tsc exit 0
== 2026-10-21T19:15:25-07:00 npx vitest run
     × prints the tables (PLANETS.md 3.2) 6625ms
     × hundreds of drones in a full battle step in a few milliseconds 4738ms
     × ends with an outcome, a reason and each side's tally from summarise() 8436ms
     × every path exists on disk, at the size the table gives 5069ms
     × earth: fits every weapon on the cruiser, finite, near the hull, in a few draw calls 9732ms
     × moon: fits every weapon on the cruiser, finite, near the hull, in a few draw calls 7542ms
     × mercury: fits every weapon on the cruiser, finite, near the hull, in a few draw calls 6752ms
     × venus: fits every weapon on the cruiser, finite, near the hull, in a few draw calls 5653ms
     × broadsidePass: the ghost line is the path flown, and it completes 5466ms
     × flankingArc: the ghost line is the path flown, and it completes 5446ms
 Test Files  6 failed | 60 passed (66)
      Tests  10 failed | 852 passed (862)
== 2026-10-21T19:16:54-07:00 npm run build
✓ built in 41.81s
== 2026-10-21T19:17:57-07:00 npm run smoke
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (44.1s)
```

Reverted at once (98fc43c), lock deleted. The two maneuver tests take 0.9 s and 1.0 s on a quiet run of the same tree
(verbose timings, 19:20); under that load everything ran about 6× slow. The fix in my files: `maneuvers.test.ts` sets
`testTimeout` to 30 s (these tests fly whole battles). The other eight are not mine (Requests). Second attempt: the
branch took the tip (with the revert), reapplied the merge (76684a9), and went through the lock again.

## Gate, second attempt: failed on the same load, reverted

Acceptance on the reapplied branch (7f5076e), 19:22–19:28: tsc clean; vitest 861 of 862, the one failure
`hardpoints.test.ts` "earth … in a few draw calls" at 6551 ms (5 s timeout); lint clean; build; smoke pass; WORLD-01
"every built check passed (5 pass, 1 not built, 1 not run)"; WORLD-02 "every built check passed (7 pass, 0 not built,
0 not run)", the same tables as above. All 25 maneuver tests passed.

`Merge PKG-18` 2d7390c, gate in the game worktree:

```
== 2026-10-21T19:28:47-07:00 npx tsc -b
tsc exit 0
== 2026-10-21T19:29:26-07:00 npx vitest run
     × earth: fits every weapon on the cruiser, finite, near the hull, in a few draw calls 6839ms
     × mercury: fits every weapon on the cruiser, finite, near the hull, in a few draw calls 5303ms
 FAIL  src/components/space/hardpoints.test.ts > buildHardpoints > earth: ...
 FAIL  src/components/space/hardpoints.test.ts > buildHardpoints > mercury: ...
 Test Files  1 failed | 65 passed (66)
      Tests  2 failed | 860 passed (862)
== 2026-10-21T19:30:54-07:00 npm run build
✓ built in 37.69s
== 2026-10-21T19:32:19-07:00 npm run smoke
[33.6s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":23,"shots":562,"movedBySide":[11,12],"drawCalls":67}
[39.0s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (39.0s)
```

Reverted at once (e6e87f5), lock deleted, game worktree clean; its tree equals 1f0a677 (`git diff --stat 1f0a677
HEAD` empty). `git log --first-parent --oneline -4` on `claude/game` after the revert:

```
e6e87f5 Revert "Merge PKG-18: maneuvers fly the line, Helm 9 tighter on all six, broadside without the dog-leg, Ligeia"
2d7390c Merge PKG-18: maneuvers fly the line, Helm 9 tighter on all six, broadside without the dog-leg, Ligeia
98fc43c Revert "Merge PKG-18: maneuvers fly the line, Helm 9 tighter on all six, broadside without the dog-leg, Ligeia"
e47d623 Merge PKG-18: maneuvers fly the line, Helm 9 tighter on all six, broadside without the dog-leg, Ligeia
```

**State: not merged.** The package's own work passes everything; the gate is blocked by `hardpoints.test.ts`, whose
"in a few draw calls" tests run 5–10 s under a full parallel suite on this machine against the 5 s default timeout
(they pass alone: 12 of 12 in 11–18 s for the file, on the branch and on the tip). Not mine to change (rule 1).
Could not merge on 2026-10-21 by two gate runs at 19:15 and 19:29; a retry costs one lock, a branch refresh and one
gate run (about 8 minutes). **To retry:** in this worktree `git merge claude/game`, then `git revert --no-edit
e6e87f5` (the game branch holds a revert of this branch, so a plain merge would bring nothing), re-run acceptance,
then the merge and the gate.

## Gate, third attempt (PKG-18R)

Retry under amendment A7 (gate runs `npx vitest run --maxWorkers=4`). No code changed beyond the merges.

Branch work, in `.claude/worktrees/pkg-18`:

- `git merge claude/game` (tip 99bd496) -> e92d2ed. One conflict: `reports/PKG-18.md` (deleted on the game branch by
  the revert, kept here). With the revert in, the tree equalled the game tip apart from this report, so the "before"
  sims below ran on it.
- `git revert --no-edit e6e87f5` -> 603518a. It also brought back two stale lines into this report from the 2d7390c
  version; 140b80f puts the report back to its 797f76f text. `git diff 797f76f HEAD -- src/battle/sim` empty: the
  maneuver code is byte-for-byte what passed twice before.
- `git diff claude/game --stat` then: the four `src/battle/sim/maneuvers/` files, `saturn-12v12.ts` (1 line,
  "Kraken Mare" -> "Ligeia"), the screenshot, this report.
- Lock taken 19:49 (none existed). The tip had moved to 97dadac (DAEDALUS-BOARD.md, DAEDALUS-LOG.md only); merged
  again -> 6da885a and every acceptance command re-run on that.

Before, the game tip (99bd496 tree), 2026-10-21 19:45:

```
== 2026-10-21T19:45:13-07:00 WORLD-01 before (tip 99bd496)
WORLD-01: setup saturn-12v12, seeds 1–10, 15 min max, player policy idle, enemy admiral-jupiter
  base seed  1: withdrawal  438 s  lost P 4 (fled 7, wd 0) E 0 (fled 0, wd 1)  broken 9  timeouts 25  self 607  hash 89368da872226c03  1467 ms wall
  base seed  2: withdrawal  505 s  lost P 4 (fled 6, wd 1) E 1 (fled 0, wd 0)  broken 9  timeouts 33  self 688  hash 8a9c0bd97d19c5ed  1466 ms wall
  base seed  3: withdrawal  451 s  lost P 3 (fled 7, wd 1) E 3 (fled 0, wd 0)  broken 10  timeouts 28  self 635  hash 876989f00f78947b  1128 ms wall
  base seed  4: withdrawal  476 s  lost P 4 (fled 8, wd 0) E 4 (fled 0, wd 0)  broken 12  timeouts 32  self 911  hash b1074b0b56da1fdc  1363 ms wall
  base seed  5: withdrawal  507 s  lost P 4 (fled 7, wd 0) E 1 (fled 0, wd 0)  broken 10  timeouts 27  self 697  hash 617f665f0e2755b0  1219 ms wall
  base seed  6: withdrawal  395 s  lost P 5 (fled 7, wd 0) E 2 (fled 0, wd 1)  broken 10  timeouts 29  self 886  hash 68f1b5deabc7da0a  1104 ms wall
  base seed  7: withdrawal  335 s  lost P 5 (fled 6, wd 1) E 2 (fled 0, wd 0)  broken 10  timeouts 28  self 669  hash e4f3954b04e702b3  855 ms wall
  base seed  8: withdrawal  451 s  lost P 4 (fled 6, wd 2) E 3 (fled 1, wd 0)  broken 10  timeouts 34  self 909  hash 2db0c48c29a6be32  1092 ms wall
  base seed  9: withdrawal  311 s  lost P 4 (fled 7, wd 1) E 2 (fled 0, wd 0)  broken 9  timeouts 30  self 600  hash 5ac1e1ee55e97037  792 ms wall
  base seed 10: withdrawal  262 s  lost P 4 (fled 8, wd 0) E 1 (fled 0, wd 0)  broken 10  timeouts 28  self 518  hash 3e8815e5e00e205f  678 ms wall
| WORLD-01 check | What | Pass range | Seeds needed | Got | Result |
| 1 | battle ends with an outcome | outcome ∈ {victory, defeat, withdrawal} | 10 of 10 | 10 of 10; withdrawal 10 | pass |
| 2 | both sides fired and dealt damage by 60 s | damageDealt.player > 0 and damageDealt.enemy > 0 at 60 s | 10 of 10 | 10 of 10; min at 60 s: player 1666, enemy 2226 | pass |
| 3 | a boarding attempt happened, unordered | boardingAttempts ≥ 1, none ordered | 8 of 10 | 10 of 10; mean attempts 20.3 (unordered 18.9); captured P 16 E 17 | pass |
| 4 | at least one ship broke (fled or struck) | brokenShips ≥ 1 | 8 of 10 | 10 of 10; mean broken 9.9 | pass |
| 5 | idle player's captains decided things on timeouts, each with a trait | timeoutDecisions ≥ 3, each with a trait | 10 of 10 | 10 of 10; mean 21.1 per battle, 21.1 of them closing a comms report | pass |
| 6 | swapping player captains' Nerve and Judgement changes the battle | outcome or losses differ by ≥ 25% | 8 of 10 | run with --variant swap-nerve-judgement | not run |
| 7 | the director keeps filming | shotsPer20s ≥ 1 | seed 1 | needs the view (PKG-03 and later) | not built |
WORLD-01: every built check passed (5 pass, 1 not built, 1 not run)
== 2026-10-21T19:45:27-07:00 WORLD-02 before (tip 99bd496)
WORLD-02: setup saturn-12v12, seeds 1–10, 15 min max, player policy idle, enemy admiral-jupiter
| WORLD-02 check | What | Pass range | Seeds needed | Got | Result |
| 1 | same seed, same policy, run twice: identical result | final state hash equal | 10 of 10 | 10 of 10 | pass |
| 2 | idle on even fleets: the winner does not swing with the seed | the same winner (or draw) | 8 of 10 | 10 of 10; winner "enemy"; tally enemy 10 | pass |
| 3 | scripted-good beats idle | player ships lost (good) < (idle) and outcome ≥ idle | 8 of 10 | 8 of 10; lost good 4 3 1 5 2 3 3 3 2 3 vs idle 4 4 3 4 4 5 5 4 4 4; outcomes good withdrawal 10 | pass |
| 4 | scripted-bad does worse than idle | player ships lost (bad) > (idle) | 8 of 10 | 9 of 10; lost bad 6 6 6 6 6 6 5 7 6 7 vs idle 4 4 3 4 4 5 5 4 4 4; outcomes bad withdrawal 8, defeat 2 | pass |
| 5 | the AI admiral uses the player's order set only | every AI order is a player order type (log check) | 10 of 10 | 10 of 10; orders issued 59 102 106 115 113 110 96 138 92 97; kinds attack 940, withdraw 10, focusSide 17, board 15, followFlagship 46; foreig
| 6 | the AI telegraphs a boarding push ≥ 5 s ahead | telegraphLead ≥ 5 s on each push, telegraph visible | 8 of 10 | 8 of 10; seeds with a push 8 of 10; pushes 10; lead min 6 s; visible 10 of 10 | pass |
| 7 | Jupiter's mean engagement range beats a Mars-style control | meanRange(jupiter) > meanRange(control), range of every AI shot | 8 of 10 | 10 of 10; shots: jupiter 6165 6060 4833 5177 6417 5716 5536 4660 5252 5335 m; control 2655 2643 2289 2010 2572 2229 2
WORLD-02: every built check passed (7 pass, 0 not built, 0 not run)
```

After, merged 140b80f, 19:46-19:49:

```
== 2026-10-21T19:46:33-07:00 npx tsc -b
tsc exit 0
== 2026-10-21T19:47:05-07:00 npx vitest run --maxWorkers=4
 Test Files  67 passed (67)
      Tests  868 passed (868)
   Duration  55.16s (tests 92%, import 6%, transform 1%)
== 2026-10-21T19:48:05-07:00 npx eslint src/battle/sim
lint exit 0
== 2026-10-21T19:48:10-07:00 npm run build
✓ 301 modules transformed.
✓ built in 17.97s
== 2026-10-21T19:48:49-07:00 npm run smoke
[13.9s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":23,"shots":562,"movedBySide":[11,12],"drawCalls":67}
[18.5s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (18.5s)
== 2026-10-21T19:49:10-07:00 WORLD-01 after (merged 140b80f)
WORLD-01: setup saturn-12v12, seeds 1–10, 15 min max, player policy idle, enemy admiral-jupiter
  base seed  1: withdrawal  438 s  lost P 4 (fled 7, wd 0) E 0 (fled 0, wd 1)  broken 9  timeouts 25  self 607  hash 1cea5636f642a278  718 ms wall
  base seed  2: withdrawal  505 s  lost P 4 (fled 6, wd 1) E 1 (fled 0, wd 0)  broken 9  timeouts 33  self 688  hash dc97745f880a2157  616 ms wall
  base seed  3: withdrawal  451 s  lost P 3 (fled 7, wd 1) E 3 (fled 0, wd 0)  broken 10  timeouts 28  self 635  hash 53e3d730525ec3e4  562 ms wall
  base seed  4: withdrawal  476 s  lost P 4 (fled 8, wd 0) E 4 (fled 0, wd 0)  broken 12  timeouts 32  self 911  hash 714709d18d186592  637 ms wall
  base seed  5: withdrawal  507 s  lost P 4 (fled 7, wd 0) E 1 (fled 0, wd 0)  broken 10  timeouts 27  self 697  hash 7e5e9be18cfcebc7  597 ms wall
  base seed  6: withdrawal  395 s  lost P 5 (fled 7, wd 0) E 2 (fled 0, wd 1)  broken 10  timeouts 29  self 886  hash c644879600fc4cae  477 ms wall
  base seed  7: withdrawal  335 s  lost P 5 (fled 6, wd 1) E 2 (fled 0, wd 0)  broken 10  timeouts 28  self 669  hash ee868a8795c54642  345 ms wall
  base seed  8: withdrawal  451 s  lost P 4 (fled 6, wd 2) E 3 (fled 1, wd 0)  broken 10  timeouts 34  self 909  hash 65e1e54c3bd04615  437 ms wall
  base seed  9: withdrawal  311 s  lost P 4 (fled 7, wd 1) E 2 (fled 0, wd 0)  broken 9  timeouts 30  self 600  hash b31b0932ddce8ae5  381 ms wall
  base seed 10: withdrawal  262 s  lost P 4 (fled 8, wd 0) E 1 (fled 0, wd 0)  broken 10  timeouts 28  self 518  hash 2fd2f52dcf4c1e99  298 ms wall
| WORLD-01 check | What | Pass range | Seeds needed | Got | Result |
| 1 | battle ends with an outcome | outcome ∈ {victory, defeat, withdrawal} | 10 of 10 | 10 of 10; withdrawal 10 | pass |
| 2 | both sides fired and dealt damage by 60 s | damageDealt.player > 0 and damageDealt.enemy > 0 at 60 s | 10 of 10 | 10 of 10; min at 60 s: player 1666, enemy 2226 | pass |
| 3 | a boarding attempt happened, unordered | boardingAttempts ≥ 1, none ordered | 8 of 10 | 10 of 10; mean attempts 20.3 (unordered 18.9); captured P 16 E 17 | pass |
| 4 | at least one ship broke (fled or struck) | brokenShips ≥ 1 | 8 of 10 | 10 of 10; mean broken 9.9 | pass |
| 5 | idle player's captains decided things on timeouts, each with a trait | timeoutDecisions ≥ 3, each with a trait | 10 of 10 | 10 of 10; mean 21.1 per battle, 21.1 of them closing a comms report | pass |
| 6 | swapping player captains' Nerve and Judgement changes the battle | outcome or losses differ by ≥ 25% | 8 of 10 | run with --variant swap-nerve-judgement | not run |
| 7 | the director keeps filming | shotsPer20s ≥ 1 | seed 1 | needs the view (PKG-03 and later) | not built |
WORLD-01: every built check passed (5 pass, 1 not built, 1 not run)
== 2026-10-21T19:49:17-07:00 WORLD-02 after (merged 140b80f)
WORLD-02: setup saturn-12v12, seeds 1–10, 15 min max, player policy idle, enemy admiral-jupiter
| WORLD-02 check | What | Pass range | Seeds needed | Got | Result |
| 1 | same seed, same policy, run twice: identical result | final state hash equal | 10 of 10 | 10 of 10 | pass |
| 2 | idle on even fleets: the winner does not swing with the seed | the same winner (or draw) | 8 of 10 | 10 of 10; winner "enemy"; tally enemy 10 | pass |
| 3 | scripted-good beats idle | player ships lost (good) < (idle) and outcome ≥ idle | 8 of 10 | 8 of 10; lost good 4 3 1 5 2 3 3 3 2 3 vs idle 4 4 3 4 4 5 5 4 4 4; outcomes good withdrawal 10 | pass |
| 4 | scripted-bad does worse than idle | player ships lost (bad) > (idle) | 8 of 10 | 9 of 10; lost bad 6 6 6 6 6 6 5 7 6 7 vs idle 4 4 3 4 4 5 5 4 4 4; outcomes bad withdrawal 8, defeat 2 | pass |
| 5 | the AI admiral uses the player's order set only | every AI order is a player order type (log check) | 10 of 10 | 10 of 10; orders issued 59 102 106 115 113 110 96 138 92 97; kinds attack 940, withdraw 10, focusSide 17, board 15, followFlagship 46; foreig
| 6 | the AI telegraphs a boarding push ≥ 5 s ahead | telegraphLead ≥ 5 s on each push, telegraph visible | 8 of 10 | 8 of 10; seeds with a push 8 of 10; pushes 10; lead min 6 s; visible 10 of 10 | pass |
| 7 | Jupiter's mean engagement range beats a Mars-style control | meanRange(jupiter) > meanRange(control), range of every AI shot | 8 of 10 | 10 of 10; shots: jupiter 6165 6060 4833 5177 6417 5716 5536 4660 5252 5335 m; control 2655 2643 2289 2010 2572 2229 2
WORLD-02: every built check passed (7 pass, 0 not built, 0 not run)
```

Seed rows before vs after: identical in every column except the hash (the "Ligeia" name is in the hashed state; the
after hashes are the same ten as the second attempt's). Check tables identical (`diff` empty).

Re-run on the final pre-merge head 6da885a, under the lock, 19:49-19:51:

```
== 2026-10-21T19:49:58-07:00 npx tsc -b
tsc exit 0
== 2026-10-21T19:50:10-07:00 npx vitest run --maxWorkers=4
 Test Files  67 passed (67)
      Tests  868 passed (868)
   Duration  25.27s (tests 88%, import 9%, transform 2%)
== 2026-10-21T19:50:38-07:00 npx eslint src/battle/sim
lint exit 0
== 2026-10-21T19:50:43-07:00 npm run build
✓ 301 modules transformed.
✓ built in 14.42s
== 2026-10-21T19:51:12-07:00 npm run smoke
[11.6s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":23,"shots":562,"movedBySide":[11,12],"drawCalls":67}
[16.2s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (16.2s)
== 2026-10-21T19:51:31-07:00 WORLD-01
| 1 | battle ends with an outcome | outcome ∈ {victory, defeat, withdrawal} | 10 of 10 | 10 of 10; withdrawal 10 | pass |
| 2 | both sides fired and dealt damage by 60 s | damageDealt.player > 0 and damageDealt.enemy > 0 at 60 s | 10 of 10 | 10 of 10; min at 60 s: player 1666, enemy 2226 | pass |
| 3 | a boarding attempt happened, unordered | boardingAttempts ≥ 1, none ordered | 8 of 10 | 10 of 10; mean attempts 20.3 (unordered 18.9); captured P 16 E 17 | pass |
| 4 | at least one ship broke (fled or struck) | brokenShips ≥ 1 | 8 of 10 | 10 of 10; mean broken 9.9 | pass |
| 5 | idle player's captains decided things on timeouts, each with a trait | timeoutDecisions ≥ 3, each with a trait | 10 of 10 | 10 of 10; mean 21.1 per battle, 21.1 of them closing a comms report 
| 6 | swapping player captains' Nerve and Judgement changes the battle | outcome or losses differ by ≥ 25% | 8 of 10 | run with --variant swap-nerve-judgement | not run |
| 7 | the director keeps filming | shotsPer20s ≥ 1 | seed 1 | needs the view (PKG-03 and later) | not built |
WORLD-01: every built check passed (5 pass, 1 not built, 1 not run)
== 2026-10-21T19:51:36-07:00 WORLD-02
| 1 | same seed, same policy, run twice: identical result | final state hash equal | 10 of 10 | 10 of 10 | pass |
| 2 | idle on even fleets: the winner does not swing with the seed | the same winner (or draw) | 8 of 10 | 10 of 10; winner "enemy"; tally enemy 10 | pass |
| 3 | scripted-good beats idle | player ships lost (good) < (idle) and outcome ≥ idle | 8 of 10 | 8 of 10; lost good 4 3 1 5 2 3 3 3 2 3 vs idle 4 4 3 4 4 5 5 4 4 4; outcomes good withdrawal 10 | pa
| 4 | scripted-bad does worse than idle | player ships lost (bad) > (idle) | 8 of 10 | 9 of 10; lost bad 6 6 6 6 6 6 5 7 6 7 vs idle 4 4 3 4 4 5 5 4 4 4; outcomes bad withdrawal 8, defeat 2 | pass |
| 5 | the AI admiral uses the player's order set only | every AI order is a player order type (log check) | 10 of 10 | 10 of 10; orders issued 59 102 106 115 113 110 96 138 92 97; kinds attack 940, wi
| 6 | the AI telegraphs a boarding push ≥ 5 s ahead | telegraphLead ≥ 5 s on each push, telegraph visible | 8 of 10 | 8 of 10; seeds with a push 8 of 10; pushes 10; lead min 6 s; visible 10 of 10 
| 7 | Jupiter's mean engagement range beats a Mars-style control | meanRange(jupiter) > meanRange(control), range of every AI shot | 8 of 10 | 10 of 10; shots: jupiter 6165 6060 4833 5177 6417 5716 55
WORLD-02: every built check passed (7 pass, 0 not built, 0 not run)
```

`Merge PKG-18` 4b38b44, gate in the game worktree:

```
== 2026-10-21T19:52:14-07:00 npx tsc -b
tsc exit 0
== 2026-10-21T19:52:27-07:00 npx vitest run --maxWorkers=4
 Test Files  67 passed (67)
      Tests  868 passed (868)
   Duration  29.27s (tests 89%, import 8%, transform 2%)
vitest exit 0
== 2026-10-21T19:52:59-07:00 npm run build
✓ 301 modules transformed.
✓ built in 15.17s
build exit 0
== 2026-10-21T19:53:28-07:00 npm run smoke
[12.6s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":23,"shots":562,"movedBySide":[11,12],"drawCalls":67}
[16.9s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (16.9s)
smoke exit 0
```

**State: merged.** Gate passed (tsc, vitest 868/868 with `--maxWorkers=4`, build, smoke). `git log --first-parent
--oneline -3` on `claude/game` after the merge:

```
4b38b44 Merge PKG-18: maneuvers fly the line, Helm 9 tighter on all six, broadside without the dog-leg, Ligeia (PKG-18R, third attempt)
97dadac Daedalus: PKG-17 verified; PKG-18R running
99bd496 Merge SCR-B: Phase B scripts EXP-07..15, WORLD-03..06, inventory (docs only)
```

`git diff --stat 4b38b44^1 4b38b44`:

```
 reports/PKG-18.md                                  | 467 +++++++++++++++++++++
 ...step7-broadside-pass-pnyx-diadem-ghost-3m06.jpg | Bin 0 -> 96068 bytes
 src/battle/sim/maneuvers/maneuvers.test.ts         | 162 +++++--
 src/battle/sim/maneuvers/numbers.ts                |  25 +-
 src/battle/sim/maneuvers/pilot.ts                  | 103 ++++-
 src/battle/sim/maneuvers/shapes.ts                 |  18 +-
 src/battle/sim/setups/saturn-12v12.ts              |   2 +-
 7 files changed, 729 insertions(+), 48 deletions(-)
```

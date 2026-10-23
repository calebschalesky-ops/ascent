# PKG-10 report: maneuvers (sim)

Seat: Talos. Branch `claude/pkg-10`, base `claude/game` @ 3dacf09. Date 2026-10-21.

## What I measured

- **Preview = flown, all six.** For each maneuver, `previewManeuver` was called, the order given, and the battle
  stepped to the end. At every ghost-line point (one a second) the flown ship was within `MAN.previewTolM` = 50 m of
  it, in every test. The preview and the flight run the same pilot over the same plotted course from the same pose,
  so in a battle where nothing damages the ship the distance is 0 m to rounding. The preview leaves `hashState`
  unchanged (tested).
- **The six on seed 3 (EXP-03's start state), enemy idle, guns off:**

  | Maneuver | Ships | ETA | Notes |
  |---|---|---|---|
  | broadside pass | p2 (cruiser) | 202.5 s | in on its beam, run along it at range, out |
  | crossing the line | p4 (cruiser) | 76.3 s | across their bow at range, our side to the far side |
  | flanking arc | p3 (cruiser), aft side | 244.6 s | arc round the target, settle facing it |
  | boarding run | p7 (carrier) + p5, p8 (escorts) | 211.9 s | escorts reach their lead points before the pods launch; pods launch once, at the carrier's closest point, via `board` (`boardLaunch ordered: true`); everyone breaks away |
  | defensive wheel | p2, p3, p4 | 42.0 s | ring turns 75°, each ship ends freshest side to the threat |
  | fighting withdrawal | p2, p3, p4 | 71.7 s | two bounds each, strong beam to the threat, alternate ships cover |

  Every pair of the six comes at least 1 km apart somewhere along the path (tested).
- **Helm 9 against Helm 3** (same cruiser p3, trait set to By-the-book so only Helm differs), preview ETA:
  flanking arc 192.6 s against 258.3 s, broadside pass 141.4 s against 191.7 s, crossing the line 61.6 s against
  97.2 s. Flown completion times are in the same order. In all three, Helm 9 has the smaller mean distance from its
  plotted course (tested). That is what "holds the path tighter" means here.
- **Override:** a broadside pass was cut off halfway by an `attack` order on a ship astern. The heading never changed
  faster than `class turn × Helm multiplier × dt`, either during the maneuver or in the 60 s after the cancel. It did
  turn at the limit (above 0.9 of it), so it is a turn and not a snap. A `maneuver brokenOff` event is logged.
- **Rule 1:** across 6 sample times and 3 guns × 3 targets (more than 20 shots compared), a ship on a maneuver and
  the same ship as a plain copy (maneuver state and order removed, geometry identical) rolled identical `p`, `roll`,
  `hit` and `side`. Why the test is built this way: a cinematic run and a plain run end up in different places, so
  their shot rolls cannot be compared over a whole battle. What can be tested is the claim itself: given the same
  geometry, the maneuver adds nothing to the hit chance. `fire()` is unchanged. Maneuver code never reads or draws
  from the RNG.
- **Determinism:** the same seed with the same maneuver orders gives the same `hashState`. A JSON copy taken
  mid-flight resumes to the identical hash.
- **No behaviour change without an order:** WORLD-01 hashes for seeds 1–10 are identical before and after. The WORLD-02
  tables are identical line for line. A battle with no maneuver order never creates `b.maneuvers` (tested), so the
  save shape is unchanged.

## What I changed

New, mine: `src/battle/sim/maneuvers/`
- `numbers.ts`: `MAN` (every tunable, first-pass) and `SHADE` (trait shading).
- `types.ts`: `ManeuverName`, `Leg`, `Flight`, `ManeuverState`, `ManeuverPreview`.
- `pilot.ts`: flies a plotted course one step at a time, using the same turn rate and acceleration formula as
  standing-orders `move()`. Helm sets cruise speed, how early the helmsman turns in for the next leg (a fillet of
  his turning radius × Helm/10), and how late he re-reads the course (0.35 s × (10 − Helm)).
- `shapes.ts`: the six shapes, each a function of (battle, ships, target, params) returning legs per ship. Captain
  shading: Bold and Glory-hound go straight in (no flanking arc) at 0.85 range. Veteran swings wide (1.4× radius).
  Cautious stands off and swings (1.1×, 1.3×). The default swing is 1.15×.
- `fly.ts`: `startManeuver` (the order), `previewManeuver`, `stepManeuvers` (per tick, after movement), and the helm
  bridge.
- `maneuvers.test.ts`: 20 tests.

Rule-9 registry lines in shared sim files:
- `types.ts`: `'maneuver'` in `OrderKind` and `ORDER_KINDS`, `Order.name` and `Order.group`, `Battle.maneuvers`,
  and a `LogEvent` member `maneuver` (phases start, done, brokenOff; start carries `eta`). The two union/list
  terminators moved onto the new line, which is the usual shape of a union append.
- `orders.ts`: the import and `case 'maneuver': return startManeuver(b, ship, o);`.
- `battle.ts`: the import and **one call line, `stepManeuvers(b);`, directly after the movement loop in `step()`**.
  Ships on a maneuver take their pose from their pilot. Standing-orders `move()` still runs for them, and its result
  is overwritten in the same tick before shields, gunnery and boarding run. That way no existing line had to change.
- `index.ts`: `export * from './maneuvers';`.

**The one named line in `comms/`:** `comms/lines.ts` `DOING` gains `maneuver: 'Maneuvering on {target}'`, the
captain's acknowledgement when `command()` sends a maneuver order to a ship that is not the flagship. Without it the
ack would read the raw kind `maneuver`.

**PKG-06's helm order is flown without touching `comms/`.** `stepManeuvers` reads new `order` events of kind `helm`
from the log (the same cursor pattern comms uses). When the officer accepted the order (the flagship crew's `helm`
equals it), it flies the flagship through the same `fly()` the `maneuver` order uses:

| PKG-06 helm maneuver | Flown as |
|---|---|
| `close` | broadside pass |
| `crossBow` ("bring us across their bow") | crossing the line |
| `freshSide` | defensive wheel (the flagship alone) |
| `openRange` | fighting withdrawal (the flagship alone) |
| `holdStation` | the existing `holdPosition` order |
| `ram` | **refused out loud**: `commsRefused` "Helm: a ram is not in the maneuver library yet. Holding our course." |

The target is what the guns are on, else the flagship's own target, else the nearest enemy.

**Rules kept:**
- Rule 2: every ship that cannot fly an order gets a `commsRefused` with the reason (no ship, wrong side, no enemy
  target, no hangar, flagship target for a boarding run). Pods that cannot launch at the dive point say why.
- Rule 4: any course order (`attack`, `focusSide`, `holdPosition`, `followFlagship`, `withdraw`), a new maneuver, a
  broken ship or a withdrawal stance breaks off the flight. Guns, shields and power orders do not.

## Script steps

| Script step | State | Evidence |
|---|---|---|
| EXP-03 3: ghost line and time to completion before commit | **sim half: pass**. On screen: wired-but-unproven (tactical-view package, next wave) | `previewManeuver` returns `path` per ship, `times`, `eta`, `marks`, `refused`. It is pure and is the flown path. Tests "the six" |
| EXP-03 4: the ship flies the shown path (probe: within a set distance) | **sim: pass** (≤ 50 m). On screen: wired-but-unproven | test "broadsidePass: the ghost line is the path flown" |
| EXP-03 5: the other five, each previewed, flown, a different shape | **sim: pass**. On screen: wired-but-unproven | 6 preview = flown tests, plus "each of the six is a different shape", plus the boarding-run test |
| EXP-03 6: cancel halfway, short believable turn (probe: heading rate within limit) | **sim: pass**. On screen: wired-but-unproven | test "a new order mid-maneuver breaks off…" |
| EXP-03 7: Helm 9 finishes sooner and holds tighter than Helm 3 | **pass** (probe step) | three tests, numbers above |
| EXP-02 9: helm maneuver order flown | **sim: pass** (`command(flag, {kind:'helm', maneuver:'crossBow'})` → flagship flies crossing the line within 50 m of its ghost line, then done; the officer's answer is PKG-06's, already passing). On screen: wired-but-unproven | tests "helm 'bring us across their bow'…" and "every helm maneuver is flown or refused out loud" |
| EXP-03 1, 2, 8, 9 | not mine (tactical view) | |

Flag: none (the package names none; with no maneuver ordered, the sim is byte-identical in behaviour). Save version:
unchanged (`Battle.v` 1; `maneuvers` is optional and absent unless used).

## Still broken / not done

- Screen and ram, the last two of the eight, are not built. Ram is refused out loud.
- Paths are plotted at order time against where the target will be (its velocity × min(time to get there, 30 s)).
  A target that turns away afterwards is not chased. The ship flies the plotted course and then hands back to its
  captain. This is a choice: it is what makes preview = flown exact. Re-plotting mid-flight is a later call.
- The defensive wheel's ring is never tighter than 1.5× a ship's turning radius (900 m minimum). With three cruisers
  in line, the wheel takes 42 s; most of what it shows is the final turn to the fresh side.
- The AI admiral does not use maneuvers. Its order set is unchanged, so WORLD-02 check 5 is unaffected.
- WORLD-02 checks 3 and 6 FAIL, as they did on the tip before this package (identical tables). They are not this
  package's.

## Requests

- None blocking. For the tactical-view package: `previewManeuver(b, ids, name, target, side?)` gives the ghost line.
  `flightOf(b, id)` gives a ship's flight in progress. `maneuver` log events give start (with `eta`), done and
  brokenOff. A group order is `order(b, lead, {kind:'maneuver', name, target, side?, group:[ids]})`.

## Assumed, for Caleb to overrule

- Every path shape (the six functions in `shapes.ts`) and every number in `maneuvers/numbers.ts`.
- The trait shading: Bold and Glory-hound go straight in, Veteran swings wide, Cautious stands off.
- What the helm's six spoken maneuvers fly as (table above). Ram is refused until it is built.
- Whether they look like a navy cannot be proven here (Zeuxis and the director, later).

## Evidence

Baseline on the tip before any change (`claude/game` @ 3dacf09), 2026-10-21T15:59:00-07:00:
- `npm run sim -- --script WORLD-01 --seeds 10 --minutes 15 --no-write`: "WORLD-01: every built check passed
  (5 pass, 1 not built, 1 not run)". Hashes seed 1–10: 87a50104c955225f 51b02141679c9565 bd474ba9c37714ef
  e2d8c02ad1f62ccd 32ff5624e91bbf35 2913fbc80a646053 4c277eac73d20709 a9379a1be03297b7 f4533ce9d9f244ff
  712870ac5b2826d0.
- Same with `--variant swap-nerve-judgement`: "every built check passed (6 pass, 1 not built, 0 not run)".
- `npm run sim -- --script WORLD-02 --seeds 10 --minutes 15 --no-write`: checks 1, 2, 4, 5, 7 pass; 3 FAIL (4 of 10);
  6 FAIL (7 of 10); "WORLD-02: 2 built check(s) FAILED".

On the branch before merging the tip (commit 6574a27; the waypoint rule was refined after, see the merged run below), 2026-10-21T16:10:20-07:00 to 16:13:
```
$ npx tsc -b                      -> exit 0
$ npx vitest run                  -> Test Files 59 passed (59); Tests 794 passed (794)
$ npx eslint src/battle/sim       -> exit 0 (no output)
$ npm run build                   -> built; PWA precache 40 entries
$ npm run smoke                   -> SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (25.1s)
$ npm run sim -- --script WORLD-01 ... --no-write      -> every built check passed (5 pass, 1 not built, 1 not run); hashes identical to baseline, seeds 1-10
$ npm run sim -- --script WORLD-01 ... --variant swap-nerve-judgement -> every built check passed (6 pass, 1 not built, 0 not run)
$ npm run sim -- --script WORLD-02 ... --no-write      -> identical table to baseline: 3 FAIL 4/10, 6 FAIL 7/10, rest pass
```

Merge and gate evidence: below.

### Merged result (claude/pkg-10 after `git merge claude/game` @ 77275a2, commit 03f5af4)

```
2026-10-21T16:29:53-07:00
$ npx tsc -b
exit 0
2026-10-21T16:30:09-07:00
$ npx vitest run
 Test Files  61 passed (61)
      Tests  808 passed (808)
2026-10-21T16:30:28-07:00
$ npx eslint src/battle/sim
exit 0
2026-10-21T16:30:33-07:00
$ npm run build
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
2026-10-21T16:31:02-07:00
$ npm run smoke
[14.6s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":22,"shots":486,"movedBySide":[11,11],"drawCalls":66} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[19.2s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (19.2s)
2026-10-21T16:31:23-07:00
$ WORLD-01
  base seed  1: withdrawal  118 s  lost P 2 (fled 10, wd 0) E 0 (fled 0, wd 0)  broken 10  timeouts 22  self 266  hash 87a50104c955225f  437 ms wall
  base seed  2: withdrawal  120 s  lost P 2 (fled 10, wd 0) E 2 (fled 0, wd 0)  broken 10  timeouts 21  self 260  hash 51b02141679c9565  314 ms wall
  base seed  3: withdrawal  121 s  lost P 2 (fled 10, wd 0) E 1 (fled 0, wd 0)  broken 10  timeouts 19  self 278  hash bd474ba9c37714ef  238 ms wall
  base seed  4: withdrawal  179 s  lost P 4 (fled 8, wd 0) E 3 (fled 0, wd 1)  broken 10  timeouts 22  self 347  hash e2d8c02ad1f62ccd  327 ms wall
  base seed  5: withdrawal  122 s  lost P 2 (fled 10, wd 0) E 1 (fled 0, wd 0)  broken 11  timeouts 16  self 297  hash 32ff5624e91bbf35  225 ms wall
  base seed  6: withdrawal  177 s  lost P 4 (fled 7, wd 1) E 1 (fled 0, wd 0)  broken 11  timeouts 24  self 397  hash 2913fbc80a646053  313 ms wall
  base seed  7: withdrawal  122 s  lost P 3 (fled 9, wd 0) E 1 (fled 0, wd 0)  broken 10  timeouts 22  self 251  hash 4c277eac73d20709  217 ms wall
  base seed  8: withdrawal  167 s  lost P 3 (fled 9, wd 0) E 2 (fled 0, wd 0)  broken 10  timeouts 26  self 362  hash a9379a1be03297b7  270 ms wall
  base seed  9: withdrawal  115 s  lost P 3 (fled 9, wd 0) E 1 (fled 0, wd 0)  broken 11  timeouts 21  self 266  hash f4533ce9d9f244ff  178 ms wall
  base seed 10: withdrawal  156 s  lost P 3 (fled 9, wd 0) E 1 (fled 0, wd 1)  broken 10  timeouts 24  self 354  hash 712870ac5b2826d0  222 ms wall
WORLD-01: every built check passed (5 pass, 1 not built, 1 not run)
2026-10-21T16:31:28-07:00
$ WORLD-01 swap
WORLD-01: every built check passed (6 pass, 1 not built, 0 not run)
2026-10-21T16:31:36-07:00
$ WORLD-02
| 1 | same seed, same policy, run twice: identical result | final state hash equal | 10 of 10 | 10 of 10 | pass |
| 2 | idle on even fleets: the winner does not swing with the seed | the same winner (or draw) | 8 of 10 | 10 of 10; winner "enemy"; tally enemy 10 | pass |
| 3 | scripted-good beats idle | player ships lost (good) < (idle) and outcome ≥ idle | 8 of 10 | 4 of 10; lost good 2 2 3 2 2 3 2 3 3 2 vs idle 2 2 2 4 2 4 3 3 3 3; outcomes good withdrawal 10 | FAIL |
| 4 | scripted-bad does worse than idle | player ships lost (bad) > (idle) | 8 of 10 | 8 of 10; lost bad 3 3 5 3 3 4 5 5 4 4 vs idle 2 2 2 4 2 4 3 3 3 3; outcomes bad withdrawal 10 | pass |
| 5 | the AI admiral uses the player's order set only | every AI order is a player order type (log check) | 10 of 10 | 10 of 10; orders issued 51 66 66 63 52 46 53 62 49 69; kinds attack 509, focusSide 18, board 14, followFlagship 26, withdraw 10; foreign 0 needed, log-foreign 0; stats.orders = admiral's count in 10 of 10 | pass |
| 6 | the AI telegraphs a boarding push ≥ 5 s ahead | telegraphLead ≥ 5 s on each push, telegraph visible | 8 of 10 | 7 of 10; seeds with a push 7 of 10; pushes 7; lead min 6 s; visible 7 of 7 | FAIL |
| 7 | Jupiter's mean engagement range beats a Mars-style control | meanRange(jupiter) > meanRange(control), range of every AI shot | 8 of 10 | 9 of 10; shots: jupiter 5725 4673 4833 4333 4881 5115 4988 5644 5562 4993 m; control 4521 4255 4719 4442 4758 4277 4511 3888 3809 4825 m; nearest-foe sample: jupiter 6355 5986 5860 5915 6305 6050 5945 6180 6176 6248, control 5795 5775 6157 5929 6015 5546 5828 5495 5393 5977 | pass |
WORLD-02: 2 built check(s) FAILED
```

WORLD-01 hashes, seeds 1-10: identical to the baseline. WORLD-02 table: identical to the baseline (3 and 6 FAIL, as before). No worse.

### Gate, in the game worktree after `Merge PKG-10`

```
2026-10-21T16:31:51-07:00
$ npx tsc -b
exit 0
2026-10-21T16:32:06-07:00
$ npx vitest run
 Test Files  61 passed (61)
      Tests  808 passed (808)
2026-10-21T16:32:26-07:00
$ npm run build
  dist/sw.js
  dist/workbox-9c191d2f.js
exit 0
2026-10-21T16:33:03-07:00
$ npm run smoke
[14.2s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":22,"shots":486,"movedBySide":[11,11],"drawCalls":66} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[18.9s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (18.9s)
```

`git log --first-parent -3` on claude/game after the merge:

```
be3b438 Merge PKG-10: maneuvers sim (six shapes, previewManeuver = flown path, maneuver order, helm order flown, override)
77275a2 Merge PKG-09: report evidence
665fc9f Merge PKG-09: comms UI (queue with Q/E/R/Tab, roster strip, direct orders and order lines, flagship crew panel, command points meter, ping)
```

`git diff --stat HEAD^1 HEAD` of the merge:

```
 reports/PKG-10.md                          | 156 ++++++++++++++
 src/battle/sim/battle.ts                   |   2 +
 src/battle/sim/comms/lines.ts              |   1 +
 src/battle/sim/index.ts                    |   1 +
 src/battle/sim/maneuvers/fly.ts            | 196 ++++++++++++++++++
 src/battle/sim/maneuvers/index.ts          |   7 +
 src/battle/sim/maneuvers/maneuvers.test.ts | 318 +++++++++++++++++++++++++++++
 src/battle/sim/maneuvers/numbers.ts        |  80 ++++++++
 src/battle/sim/maneuvers/pilot.ts          | 107 ++++++++++
 src/battle/sim/maneuvers/shapes.ts         | 236 +++++++++++++++++++++
 src/battle/sim/maneuvers/types.ts          |  71 +++++++
 src/battle/sim/orders.ts                   |   3 +
 src/battle/sim/types.ts                    |  16 +-
 13 files changed, 1191 insertions(+), 3 deletions(-)
```

Screenshots: none. Every step in this package is sim-side, and the on-screen halves are wired-but-unproven (the tactical-view package).

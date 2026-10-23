# PKG-05: boarding (Talos)

Branch `claude/pkg-05`, base `claude/game` @ a571a1c (merged forward to e3bd8df before the gate). Sim only: no flag,
save shape unchanged (the battle sim is not saved; `battle.boarding` is an optional field created on the first tick).

## What I measured

- Before: WORLD-01 check 3 "not built". After: **10 of 10 seeds** have an unordered boarding attempt (mean 6.6
  launches a battle, all unordered; 22 captures by the player over the 10 seeds, 0 by the enemy).
- WORLD-01 checks 1, 2, 4 and 6 and WORLD-02 checks 1 and 2 still pass (tables below). Check 6 got stronger:
  mean player ships lost 1.8 → 4.3 under the swap (2.0 → 3.8 before boarding), because Judgement now also decides who
  boards and whether a captain runs the numbers first.
- PKG-02's test "same seed twice … after 15 minutes" **timed out at 5 s on `claude/game` @ e3bd8df itself** in a
  full-suite run on this machine (5673 ms, while three other packages were running). Boarding makes those battles
  about 23% longer (seed 4: 367 s → 452 s of battle); the sim's cost per battle-second is unchanged (about 0.97 ms).
  See "Outside my files".

## What I changed

New, mine: `src/battle/sim/boarding/`: `numbers.ts` (the one table, all first-pass), `types.ts` (pod groups, fights),
`boarding.ts` (launch, cross, deflect, breach, fight, reinforce, pull back, capture, repel, scuttle, gunnery drag,
captains' own launches, capture-aware side break), `masslock.ts`, `summary.ts`, `boarding.test.ts` (20 tests).

Registry lines (rule 9):
- `types.ts`: `'board' | 'pullBack'` in `OrderKind` and `ORDER_KINDS`; `Ship.prize?`, `Ship.capturedFrom?`;
  `Battle.boarding?`; nine `LogEvent` members (`boardLaunch`, `boardDeflected`, `boardLost`, `breach`, `boardFight`,
  `captured`, `repelled`, `scuttled`, `boardPullBack`).
- `orders.ts`: two `case`s (`board`, `pullBack`). A board or pull-back that turns out impossible marks its own `order`
  log entry `ok: false` (`refused()`), since `valid()` has no ship to check a hangar against.
- `battle.ts`: one call line in `step()` (`stepBoarding(b)`, after gunnery) and two imports.
- `summary.ts`: `SideSummary.captured`, `SideSummary.prizeValue`, `Summary.boardingUnordered`.
- `checks.ts`: WORLD-01 check 3 row built. `index.ts`: exports.

Lines the package names as mine (changed, not only added):
- `canJump(s)` → `canJump(s, b?)`: given the battle it also respects mass lock (`massLocked()`).
- `summarise()`: a side's ships are now the ones it **started** with (`capturedFrom ?? side`), and `shipsLost` counts a
  ship lost to capture. Without this a captured enemy ship counted as the player's, and a prize later wrecked counted as
  a player loss: base WORLD-01 showed the player losing 4 ships a battle and check 6 fell to 5 of 10.

How it plays: a carrier or capital with a working hangar launches 6 pods × 15 marines (keeping 30 aboard). Pods fly at
450 m/s to a point 200 m off the aimed side; the target's point defence gets one roll per pod at 2.5 km
(`pdChance() × 0.6`). Arriving on a side that is not open: `boardDeflected`, and the marines go home. Through an open
side: a 2.5 s breach for 1% hull, then the Lanchester fight (`lib/boarding/troops.ts`, imported read-only) at quarter
speed: marines against marines plus a quarter of the crew, quality by trait (Veteran 1.25 and so on); `boardFight`
every 3 s. A boarded ship fires at 0.6 rate. Captured: `captured`, `side` flips, `prize: true`, `capturedFrom`, crew
30%, gunnery 0.6, a prize master from the ship that sent most marines; nobody on its new side keeps it as a target; its
old side loses morale as for a ship lost, and a capture counts toward that side's half-the-fleet break
(`captureSideCheck`, because `sideCheck()` only sees ships still on a side). Repelled: all boarders lost. A losing
Fanatic rolls once (50%) at 45% defenders to scuttle: a wreck, boarders dead. Unled marines cannot board a flagship
(NAVY §3 makes that the admiral's own boarding).

Unordered: every 2 s a hangar ship's captain with Judgement ≥ 5 (Bold, Glory-hound, Ambitious −2; Fanatic −1;
Cautious +2; By-the-book, Pessimist +1; standing orders to board −2) launches at the weakest enemy with an open side
within 9.5 km, or reinforces a fight its side is losing; at Judgement 7+ it first checks it would win (closed-form
Lanchester, pinned to `resolve()` by a test). It records a decision with its trait or ability as the reason. A captain
under an attack order may board only that order's target, so the stand-in enemy doctrine can board; on this roster it
never does (its hangar ships are sent at targets with no open side, or at the flagship).

## Script steps

| Script step | Result | Proved by |
|---|---|---|
| EXP-05 3: board at a side still up, deflected | pass (sim); wired-but-unproven on screen | test "is deflected…"; `boardDeflected` |
| EXP-05 4: cross PD, losses, 2.5 s breach, progress | pass (sim); wired-but-unproven on screen | tests "loses pods…", "point defence draws…", "crosses an open side…"; `boardLost`, `breach`, `boardFight` |
| EXP-05 5: fight inside; enemy gunnery drops | pass (sim); wired-but-unproven on screen | tests "pulls crew off guns…", "won inside…" |
| EXP-05 6: reinforce / pull back | pass (sim) as orders; the comms question is not built | test "reinforced…" (see Requests) |
| EXP-05 7: ship strikes, changes side, joins the fleet | pass (sim); colours and roster on screen are the view's | test "won inside…" (side flipped, `prize: true`) |
| EXP-05 8: captured ship fights at reduced crew | pass | same test: crew 30% of max, gunnery × 0.6 |
| EXP-05 9: a wreck counts for less than a capture | pass | tests "scuttle…", "a capture is worth more…" (`prizeValue` 2 against 0.5 for a cruiser) |
| EXP-06 5: mass lock stops a pinned ship jumping | pass (sim); wired-but-unproven on screen | tests "mass lock…" (capital or destroyer within 3 km; an escort does not lock) |
| WORLD-01 check 3: unordered boarding, 8 of 10 | **pass, 10 of 10** | runner table below |

Flag: none (sim only). Save version: unchanged. Screenshots: none (no UI in this package; `shots/pkg-05/` not made).

## Outside my files

- `src/battle/sim/sim.test.ts`, the end of PKG-02's "same seed twice … 15 minutes" test: a 30 s timeout. It runs three
  full battles and timed out at 5 s on `claude/game` @ e3bd8df without my change (measured above), so no package's gate
  could pass on this machine while others run. One line, test-only. My own two full-battle tests carry 30 s too.

## Still broken / not built

- No question to the admiral for reinforce or pull-back: request handling lives in `battle.ts`'s existing
  `timeoutChoice()`, which is not mine. The sim emits everything the marine commander's reports need.
- The enemy captured 0 in WORLD-01 (above). Whether the AI admiral should push boarding is PKG-07's.
- Mass lock has two rules side by side: `escape()` (PKG-02) still pins on any active enemy within 3 km; `canJump(s, b)`
  pins only on capitals and destroyers (this package's rule). With the same range, everything `canJump` blocks,
  `escape()` blocks too.

## Requests

- **battle.ts owner (PKG-02's line):** make `escape()`'s `locked` line call `massLocked(b, s)` from
  `boarding/masslock.ts`, so escorts and cruisers stop pinning; then re-run WORLD-01.
- **battle.ts owner:** a `'reinforce'` `RequestKind` with a timeout choice, so a marine commander's "need another pod"
  can time out by trait (BRIDGE §7). Until then reinforcing is a captain's own decision or a `board` order.
- **PKG-06 (comms):** events to queue: `boardLaunch`, `boardDeflected`, `boardLost` (n), `breach`, `boardFight`
  (attackers and defenders every 3 s), `captured`, `repelled`, `scuttled`, `boardPullBack`. Pods in flight are
  `battle.boarding.pods` (pos, side, target) for anyone drawing them.
- **PKG-04 (view):** a prize has `prize: true` and its new `side`; draw it in its captor's colours.
- **Palamedes:** every number in `boarding/numbers.ts`. On roster 1 the player captures about 2 ships a battle and the
  enemy none, and the player still withdraws in all 10 seeds.

## Assumed, for Caleb to overrule

- Prize crew: 30% of the ship's crew, and its guns fire at 0.6 rate. A prize master from the ship that sent most of the
  boarders commands it (By-the-book).
- Mass-lock range 3 km, by capitals and destroyers only.
- A losing Fanatic has a 50% chance to scuttle, rolled once when its defenders fall to 45%.
- Deflected boarders return to their ship; on a pull-back, 60% of those still standing get home.
- Unled boarders cannot board a flagship.
- `standing.boarding` (false on both sides of the skirmish) lowers the bar for unordered boarding; it does not forbid it.
- A capture counts as a ship lost for its old side, in `summarise()` and in the half-the-fleet break.

## Evidence (worktree, merged with claude/game @ e3bd8df, before the game merge)

```
2026-10-21T15:29:33-07:00
$ npx tsc -b
tsc: clean (exit 0)
$ npx vitest run
 Test Files  56 passed (56)
      Tests  735 passed (735)
$ npx vitest run src/battle/sim/boarding
 ✓ src/battle/sim/boarding/boarding.test.ts > boarding: orders > adds board and pullBack to the order set; refuses a board from a ship with no boarding hangar or at a flagship 6ms
 ✓ src/battle/sim/boarding/boarding.test.ts > boarding: the six steps > is deflected by a side that is not down, and the marines come back 15ms
 ✓ src/battle/sim/boarding/boarding.test.ts > boarding: the six steps > loses pods to point defence on the way in: those marines are lost 13ms
 ✓ src/battle/sim/boarding/boarding.test.ts > boarding: the six steps > point defence draws from the battle RNG once per pod, with p from pdChance 2ms
 ✓ src/battle/sim/boarding/boarding.test.ts > boarding: the six steps > crosses an open side, breaches in 2.5 s for a little hull, and starts the fight inside 7ms
 ✓ src/battle/sim/boarding/boarding.test.ts > boarding: the six steps > pulls crew off guns while boarded: gunnery drops by crewOffGunsMul 8ms
 ✓ src/battle/sim/boarding/boarding.test.ts > boarding: the six steps > won inside: the ship strikes, flips to the captor, fights on as a prize with a prize crew 8ms
 ✓ src/battle/sim/boarding/boarding.test.ts > boarding: the six steps > repelled: the boarders are lost 9ms
 ✓ src/battle/sim/boarding/boarding.test.ts > boarding: the six steps > reinforced: more pods join the fight in progress; pull-back ends it and brings survivors home 10ms
 ✓ src/battle/sim/boarding/boarding.test.ts > boarding: the six steps > scuttle: a losing Fanatic blows the reactor; a wreck, and the boarders die with it 14ms
 ✓ src/battle/sim/boarding/boarding.test.ts > boarding: the six steps > a capture is worth more than a wreck in the summary 9ms
 ✓ src/battle/sim/boarding/boarding.test.ts > boarding: captains board on their own > a captain with the Judgement to see an open side launches unordered, and says why 4ms
 ✓ src/battle/sim/boarding/boarding.test.ts > boarding: captains board on their own > a captain without it does not (Cautious raises the bar) 8ms
 ✓ src/battle/sim/boarding/boarding.test.ts > boarding: captains board on their own > no open side, no unordered launch 5ms
 ✓ src/battle/sim/boarding/boarding.test.ts > mass lock > an enemy capital or destroyer within range blocks the jump; an escort does not 1ms
 ✓ src/battle/sim/boarding/boarding.test.ts > mass lock > a pinned broken ship does not jump away while locked 20ms
 ✓ src/battle/sim/boarding/boarding.test.ts > boarding: determinism > a battle with boarding in flight round-trips through JSON and carries on identically 889ms
 ✓ src/battle/sim/boarding/boarding.test.ts > boarding: determinism > same seed twice: identical, boarding included 761ms
 ✓ src/battle/sim/boarding/boarding.test.ts > boarding: the captain estimate > wouldCapture agrees with troops.ts resolve() across a grid of fights 3ms
 ✓ src/battle/sim/boarding/boarding.test.ts > boarding: headless > never reads wall time or Math.random 1ms
      Tests  20 passed (20)
$ npx eslint src/battle/sim
lint: clean (exit 0)
$ npm run build
[32m✓ built in 14.74s[39m
precache  40 entries (2600.44 KiB)
$ npm run smoke
[15.0s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":59.999999999999154,"moved":24,"shots":654,"drawCalls":174} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[19.6s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (19.6s)
$ npm run sim -- --script WORLD-01 --seeds 10 --minutes 15 --policy idle --variant swap-nerve-judgement
WORLD-01: setup saturn-12v12, seeds 1–10, 15 min max, player policy idle, enemy doctrine-concentrate, variant swap-nerve-judgement
  base seed  1: withdrawal  167 s  lost P 1 (fled 11, wd 0) E 3 (fled 0, wd 0)  broken 11  timeouts 23  self 361  hash 0054c89df79daf64  456 ms wall
  base seed  2: withdrawal  318 s  lost P 2 (fled 10, wd 0) E 3 (fled 0, wd 0)  broken 10  timeouts 22  self 585  hash 8ab54e5cc5e66159  469 ms wall
  base seed  3: withdrawal  170 s  lost P 1 (fled 10, wd 1) E 2 (fled 0, wd 0)  broken 11  timeouts 20  self 350  hash 6913fa507d3874c9  301 ms wall
  base seed  4: withdrawal  452 s  lost P 2 (fled 10, wd 0) E 4 (fled 0, wd 0)  broken 11  timeouts 22  self 724  hash d3f1b243e1ec8f06  555 ms wall
  base seed  5: withdrawal  401 s  lost P 2 (fled 10, wd 0) E 3 (fled 0, wd 0)  broken 11  timeouts 23  self 656  hash bcf5b1d761a6209a  501 ms wall
  base seed  6: withdrawal  359 s  lost P 2 (fled 10, wd 0) E 2 (fled 1, wd 0)  broken 13  timeouts 23  self 676  hash af46553f9422901a  479 ms wall
  base seed  7: withdrawal  386 s  lost P 2 (fled 10, wd 0) E 5 (fled 0, wd 0)  broken 11  timeouts 22  self 644  hash 8c540f9b0c988aa6  448 ms wall
  base seed  8: withdrawal  377 s  lost P 2 (fled 10, wd 0) E 3 (fled 0, wd 0)  broken 12  timeouts 23  self 558  hash e8c455033bef7250  438 ms wall
  base seed  9: withdrawal  407 s  lost P 2 (fled 10, wd 0) E 3 (fled 0, wd 0)  broken 10  timeouts 24  self 670  hash 3c12eca6681d244e  482 ms wall
  base seed 10: withdrawal  301 s  lost P 2 (fled 10, wd 0) E 4 (fled 0, wd 0)  broken 11  timeouts 22  self 583  hash fb3c84b4621dfb2d  347 ms wall
  swap-nerve-judgement seed  1: withdrawal  173 s  lost P 5 (fled 7, wd 0) E 2 (fled 0, wd 0)  broken 10  timeouts 10  self 337  hash 5458661a2fea3e52  215 ms wall
  swap-nerve-judgement seed  2: withdrawal  471 s  lost P 5 (fled 6, wd 0) E 2 (fled 0, wd 0)  broken 9  timeouts 14  self 667  hash a28aa5e5c43e4dcb  457 ms wall
  swap-nerve-judgement seed  3: withdrawal  241 s  lost P 4 (fled 7, wd 1) E 2 (fled 0, wd 0)  broken 9  timeouts 12  self 535  hash f520cb343ff62a6b  296 ms wall
  swap-nerve-judgement seed  4: withdrawal  240 s  lost P 4 (fled 8, wd 0) E 2 (fled 1, wd 0)  broken 11  timeouts 12  self 488  hash aa1805bc5438eb21  271 ms wall
  swap-nerve-judgement seed  5: withdrawal  178 s  lost P 4 (fled 8, wd 0) E 1 (fled 0, wd 0)  broken 11  timeouts 11  self 353  hash 4cddc9cd9ccf5591  212 ms wall
  swap-nerve-judgement seed  6: withdrawal  273 s  lost P 4 (fled 8, wd 0) E 1 (fled 0, wd 0)  broken 10  timeouts 12  self 504  hash 25c756395411cafc  294 ms wall
  swap-nerve-judgement seed  7: withdrawal  213 s  lost P 4 (fled 8, wd 0) E 0 (fled 0, wd 0)  broken 9  timeouts 12  self 427  hash 69bc795f61f1fc20  239 ms wall
  swap-nerve-judgement seed  8: withdrawal  344 s  lost P 5 (fled 7, wd 0) E 2 (fled 0, wd 0)  broken 8  timeouts 13  self 673  hash ce182e46c342ca23  355 ms wall
  swap-nerve-judgement seed  9: withdrawal  176 s  lost P 4 (fled 8, wd 0) E 0 (fled 0, wd 0)  broken 9  timeouts 11  self 376  hash 4ffc075e69a15149  171 ms wall
  swap-nerve-judgement seed 10: withdrawal  185 s  lost P 4 (fled 8, wd 0) E 2 (fled 0, wd 0)  broken 10  timeouts 10  self 390  hash 6b24467bfbbe946b  179 ms wall
| WORLD-01 check | What | Pass range | Seeds needed | Got | Result |
|---|---|---|---|---|---|
| 1 | battle ends with an outcome | outcome ∈ {victory, defeat, withdrawal} | 10 of 10 | 10 of 10; withdrawal 10 | pass |
| 2 | both sides fired and dealt damage by 60 s | damageDealt.player > 0 and damageDealt.enemy > 0 at 60 s | 10 of 10 | 10 of 10; min at 60 s: player 2206, enemy 4660 | pass |
| 3 | a boarding attempt happened, unordered | boardingAttempts ≥ 1, none ordered | 8 of 10 | 10 of 10; mean attempts 6.6 (unordered 6.6); captured P 22 E 0 | pass |
| 4 | at least one ship broke (fled or struck) | brokenShips ≥ 1 | 8 of 10 | 10 of 10; mean broken 11.1 | pass |
| 5 | idle player's captains decided things on timeouts, each with a trait | timeoutDecisions ≥ 3, each with a trait | 10 of 10 | 10 of 10 (sim only: the comms queue that shows them is a later package; mean 11.3 per battle) | not built |
| 6 | swapping player captains' Nerve and Judgement changes the battle | outcome or losses differ by ≥ 25% | 8 of 10 | 10 of 10; mean player ships lost 1.8 → 4.3; outcomes withdrawal 10 → withdrawal 10 | pass |
| 7 | the director keeps filming | shotsPer20s ≥ 1 | seed 1 | needs the view (PKG-03 and later) | not built |
WORLD-01: every built check passed (5 pass, 2 not built, 0 not run)
$ npm run sim -- --script WORLD-02 --seeds 10 --minutes 15 --policy idle --no-write
WORLD-02: setup saturn-12v12, seeds 1–10, 15 min max, player policy idle, enemy doctrine-concentrate
| WORLD-02 check | What | Pass range | Seeds needed | Got | Result |
|---|---|---|---|---|---|
| 1 | same seed, same policy, run twice: identical result | final state hash equal | 10 of 10 | 10 of 10 | pass |
| 2 | idle on even fleets: the winner does not swing with the seed | the same winner (or draw) | 8 of 10 | 10 of 10; winner "enemy"; tally enemy 10 | pass |
| 3 | scripted-good beats idle | fewer player losses, outcome ≥ idle | 8 of 10 | scripted-good policy and boarding not built | not built |
| 4 | scripted-bad does worse than idle | more player losses | 8 of 10 | scripted-bad policy and boarding not built | not built |
| 5 | the AI admiral uses the player's order set only | every AI order is a player order type | 10 of 10 | AI admiral is a later package (the doctrine stand-in calls order() only) | not built |
| 6 | the AI telegraphs a boarding push ≥ 5 s ahead | telegraphLead ≥ 5 s | 8 of 10 | boarding and AI admiral not built | not built |
| 7 | Jupiter's mean engagement range beats a Mars-style control | meanRange(jupiter) > meanRange(control) | 8 of 10 | AI admiral styles not built | not built |
WORLD-02: every built check passed (2 pass, 5 not built, 0 not run)
```

## Gate (after the merge, in the game worktree)

Merge `690b99c` on `claude/game`. Vitest went from 715 tests in 55 files (game tip e3bd8df) to 735 in 56: the 20 new boarding tests, and nothing lost.

```
$ git log --first-parent -3 --oneline claude/game
690b99c Merge PKG-05: boarding (pods, breach, fight inside, capture/repel/scuttle, prizes), mass lock, unordered boarding
e3bd8df Daedalus: wave 2 running
a571a1c Daedalus: PKG-02 verified, wave-01, wave-2 packages

$ git diff --stat 690b99c^1 690b99c
 src/battle/sim/orders.ts                           |   5 +
 src/battle/sim/sim.test.ts                         |   2 +-
 src/battle/sim/summary.ts                          |  16 +-
 src/battle/sim/types.ts                            |  23 +-
 vision/sims/WORLD-01/seed-01.json                  |   2 +-
 .../WORLD-01/seed-01.swap-nerve-judgement.json     |   2 +-
 vision/sims/WORLD-01/seed-02.json                  |   2 +-
 .../WORLD-01/seed-02.swap-nerve-judgement.json     |   2 +-
 vision/sims/WORLD-01/seed-03.json                  |   2 +-
 .../WORLD-01/seed-03.swap-nerve-judgement.json     |   2 +-
 vision/sims/WORLD-01/seed-04.json                  |   2 +-
 .../WORLD-01/seed-04.swap-nerve-judgement.json     |   2 +-
 vision/sims/WORLD-01/seed-05.json                  |   2 +-
 .../WORLD-01/seed-05.swap-nerve-judgement.json     |   2 +-
 vision/sims/WORLD-01/seed-06.json                  |   2 +-
 .../WORLD-01/seed-06.swap-nerve-judgement.json     |   2 +-
 vision/sims/WORLD-01/seed-07.json                  |   2 +-
 .../WORLD-01/seed-07.swap-nerve-judgement.json     |   2 +-
 vision/sims/WORLD-01/seed-08.json                  |   2 +-
 .../WORLD-01/seed-08.swap-nerve-judgement.json     |   2 +-
 vision/sims/WORLD-01/seed-09.json                  |   2 +-
 .../WORLD-01/seed-09.swap-nerve-judgement.json     |   2 +-
 vision/sims/WORLD-01/seed-10.json                  |   2 +-
 .../WORLD-01/seed-10.swap-nerve-judgement.json     |   2 +-
 34 files changed, 1223 insertions(+), 29 deletions(-)

2026-10-21T15:33:38-07:00
$ npx tsc -b
tsc: clean (exit 0)
$ npx vitest run
 Test Files  56 passed (56)
      Tests  735 passed (735)
$ npm run build
[32m✓ built in 13.52s[39m
precache  40 entries (2600.44 KiB)
build exit 0
$ npm run smoke
[12.2s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":59.999999999999154,"moved":24,"shots":654,"drawCalls":174} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[16.5s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (16.5s)
```

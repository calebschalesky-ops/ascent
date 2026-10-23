# PKG-25: fighters as sim entities (Phase B F1)

Talos, with Palamedes for the numbers. Branch `claude/pkg-25` from `claude/game` @ 212b85b. 2026-10-22.
Dev server: port **5245**, not 5225: 5225 was held by a leftover TRC-05 Vite (`worktrees\trc-05\...\vite.js --port 5225`,
pid 38768), left running, not mine to stop.

## Result

Fighter wings now exist in the battle sim. They ride their hulls, launch when fighter command gives a task, fly escort,
screen or hunt, lose fighters to point defence and to enemy wings, come home to rearm, and are lost with a hull that
dies. Pods en route are now lost to point defence and to enemy fighters. The view draws the wings in the normal and
tactical views behind the `fighters` flag, which is on.

**Phase A is unchanged.** Every Phase A WORLD battle has the same final state hash before and after (292 battles: WORLD-01
seeds 1-10 base and variant, WORLD-02 seeds 1-10 all five sets, WORLD-02 seeds 61-90, WORLD-01 variant seeds 61-90).
The reason: a battle in which nobody orders fighters creates no fighter state and draws nothing, and the fighters'
pass draws come from their own seeded stream (`makeRng(seed ^ 0x6f1c2a77)`, the comms precedent), never the battle's.

The AI admiral's fighter line is built and tested but **switched off** (`FIGHTERS.admiralEscortsPush = false`). Switched
on, it moved WORLD-01 check 6 at seeds 1-10 from 9 of 10 (pass) to **7 of 10 (FAIL)**, and Phase A must not get worse.
Measured 2026-10-22 13:12, `npm run sim -- --script WORLD-01 --seeds 10 --minutes 15 --variant swap-nerve-judgement
--no-write` with the line on; re-test costs one flag flip and that one command.

## Script steps

| Step | Result | Evidence |
|---|---|---|
| Phase A EXP-02 s10: pods at a target, fighter command flies them in | **pass** | Played in the UI on seed 1 at t=20: Marine commander, Pods at Callirrhoe; Fighter command, Escort. Probe at t=29: pods group 2 (p6 to e7, 6 pods) en route, all three player wings `flying` with `escorting: 2`, task `escort`. `shots/pkg-25/exp02-s10-escort-pods-normal.jpg` |
| Phase A EXP-02 s10, the screen the player actually pressed (TRC-05 found it flew nothing) | **pass** | Screen pressed in the UI: wings 1.39 to 1.47 km out from Astu on the line to the nearest enemy (e11 at 6.02 km; wing to e11 4.58 to 4.65 km). `shots/pkg-25/exp02-s10-screen-flown-tactical.jpg`, `screen-flown-tactical-1280.jpg`, `screen-flown-normal-1280.jpg` |
| Phase B EXP-14 s2: screen with fighters, in the sim | **pass (sim)** | 30 seeds: pods aimed at a screened carrier intercepted 18.97 a battle-minute against 6.18 unscreened (table below). Test `escort-table.test.ts` |
| EXP-14 s2 in the UI, screen *a cruiser* | wired-but-unproven | The sim takes the ship to screen (`Order.target`); the fighter-command buttons send no target, so the UI screens the flagship. Request 2 |
| EXP-14 s2, *missiles* intercepted more | not built | Missile interception is the `fire()` point-defence line in `battle.ts`, not mine. Request 1 |
| Inventory: pods en route (boarding escorts) | **pass** | Escort cuts PD on its pods by 40% and enemy passes by 50%; table below |
| Inventory: AI tells (fighters forward with the telegraph) | wired, off | `admiral.ts` line, through `order()` with the player's `fighters` order; test proves it fires at the telegraph when switched on. Off for Phase A (above) |
| WORLD-02 c5 (admiral uses the player's order set) | **pass** | 10 of 10 at seeds 1-10; with the admiral line on it also passed: "kinds ... fighters 10 ... foreign 0" |
| EXP-12 s9 courier | not in scope | Stays with B5, as the package says |

## What changed (files, all named)

- New `src/battle/sim/fighters/`: `fighters.ts` (state, order, flight, passes, attrition, recovery, probe report),
  `numbers.ts` (the one FIGHTERS table, all first-pass), `types.ts`, `index.ts`, `fighters.test.ts` (15 tests),
  `escort-table.test.ts` (the Palamedes table; 6 seeds in the suite, `PKG25_SEEDS=30` for the full one).
- `types.ts` registry lines: `Battle.fighters?`; four `LogEvent` members (`wingLaunch`, `wingHome`, `wingLost`,
  `podIntercept`); the doc line on `Order.task`.
- `battle.ts`: one import, one call line in `step()`: `stepFighters(b)` before `stepBoarding(b)`.
- `orders.ts`: `case 'fighters'` taken out of the shared officer case line and given its own case calling
  `fighterOrder`, which calls `officerOrder` exactly as before and then records the task (and target) for the wings.
  This changes one existing line in a registry file; the package lists `orders.ts` as mine for this.
- `boarding/boarding.ts`: the pdChance line, now `const p = podPdChance(b, g, t)` (same value unless an escort wing is
  on the pods), and its import.
- `admiral/admiral.ts`: the fighter line in `pushTick` (planned to telegraph), lines 356-359, behind
  `FIGHTERS.admiralEscortsPush`, and its import (line 30).
- `index.ts` (sim): `export * from './fighters'`.
- View: new `src/battle/view/fighters.ts` (wing layer: an instanced mesh of fighters in a V and a points layer of
  engine lights with a pixel floor, two draw calls in all, the house glow colour, no colour of its own), new
  `fighters.test.ts`; `scene.ts` three named lines (import, `createWingLayer(battle)`, `wingLayer.place(frame)` in ingest
  and reset); `model.ts` `WingView` and `BattleFrame.wings?`; `simFeed.ts` one import and `wings: wingViews(b, M)` in the
  frame.
- `src/flags.ts`: `fighters` appended, on.
- `src/battle/view/tactical/tactical.test.ts`: its check "the flag is appended at the end of the list" asserted that
  `tactical` is the *last* flag, which no appended flag can pass. Changed to "tactical comes after director". Not my
  file; the minimum that lets the append-only rule hold. Daedalus to overrule.

## The numbers (Palamedes): first table, MEASURED-HERE

`PKG25_SEEDS=30 npx vitest run src/battle/sim/fighters/escort-table.test.ts --silent=false`, 2026-10-22 13:36.
Saturn 12v12, both sides idle, seeds 1-30. At 12 s the attacker's flagship and carrier board the defender's carrier (one
launch each, 12 pods a seed); losses counted for those two groups to 45 s.

| case | pods launched | lost to PD | lost to fighters | lost en route | fraction lost |
|---|---|---|---|---|---|
| PD only, no escort | 360 | 107 | 0 | 107 | 0.297 |
| PD only, escort wing | 360 | 87 | 0 | 87 | 0.242 |
| PD + enemy screen, no escort | 360 | 107 | 209 | 316 | 0.878 |
| PD + enemy screen, escort wing | 360 | 87 | 176 | 263 | 0.731 |

| player carrier | pods launched at it | lost to PD | lost to fighters | intercepted per battle-minute (mean over seeds) |
|---|---|---|---|---|
| unscreened (PD only) | 360 | 102 | 0 | 6.18 |
| screened by fighters | 360 | 102 | 211 | 18.97 |

For Palamedes: **a full screen is too strong (TASTE on the cause, MEASURED-HERE on the size).** Three screening wings each
take a pass at every group: 0.45 a pod each, so 88% of pods die against a screen and an escort only brings it to 73%.
NAVY §2's sequence is "fighters clear the lane, boarders go through": the lane should be clearable. The levers are
`podKillPerCraft`, `taskMul.screen`, one pass per *side* instead of per wing, and `escortDefend`. Not tuned here.

Bench (draw calls, the PKG-17 budget 144 + 15% = 165), `__probe.bench({frames:120})` at 1280 x 720 in the in-app
browser: **139 calls / 69,882 triangles** (no wings out: the layer draws nothing); seed 1 with the player's three wings out
on a screen at 30 s: **141 calls / 70,026 triangles**. Smoke reports 169 draw calls in its own headless run, where no
fighter is ordered, so that number is the base scene's on that GPU, not this package's.

## Phase A WORLD, before and after (both on 212b85b's tip, `--no-write`)

Every seed's state hash is identical before and after in all of these, so the tables are identical row for row.

```
before 2026-10-22T13:08:13  npm run sim -- --script WORLD-01 --seeds 10 --minutes 15 --no-write
WORLD-01: every built check passed (5 pass, 1 not built, 1 not run)
after  2026-10-22T13:34:33  (same)  WORLD-01: every built check passed (5 pass, 1 not built, 1 not run)

before 2026-10-22T13:08:26  ... --variant swap-nerve-judgement
c 6 | 9 of 10; mean player ships lost 3.3 → 3.2; outcomes withdrawal 10 → withdrawal 9, victory 1 | pass
WORLD-01: every built check passed (6 pass, 1 not built, 0 not run)
after  2026-10-22T13:34:41  (same row, same line)

before 2026-10-22T13:08:45  npm run sim -- --script WORLD-02 --seeds 10 --minutes 15 --no-write
WORLD-02: every built check passed (7 pass, 0 not built, 0 not run)
after  2026-10-22T13:34:55  WORLD-02: every built check passed (7 pass, 0 not built, 0 not run)
```

The three parked seed blocks (For Caleb 13; reported, not gating), seeds 61-90:

```
WORLD-02 c3  before 13:14:27  19 of 30 | FAIL     after 13:35:24  19 of 30 | FAIL   (bar 24 of 30)
WORLD-02 c4  before           24 of 30 | pass     after           24 of 30 | pass
WORLD-01 c6  before 13:16:10  23 of 30 | FAIL     after 13:36:35  23 of 30 | FAIL   (bar 24 of 30)
```

With the admiral's fighter line on (13:12-13:14, since switched off): WORLD-02 seeds 1-10 still 7 of 7 (c3 9 of 10);
held-out c3 18, c4 25, W01 c6 24 of 30; WORLD-01 c6 at seeds 1-10 **7 of 10, FAIL**. That last row is why it is off.

## Flag, save

Flag `fighters`: on. It gates drawing only; the sim flies wings whenever fighter command gives a task, flag or no flag
(the sim does not read flags). Save: skirmish saves nothing; no save shape changed.

## Still broken / not done

- Missiles are not intercepted by fighters (Request 1).
- The fighter-command UI has no target, so "screen a cruiser" is sim-only (Request 2).
- `PodGroup.escorts` stays `null`; the escort link lives on the wing (`Wing.escorting`).
- The admiral line is off (above).
- A wing whose hull is gone and finds no other hangar stays out circling: there is no fuel.

## Requests

1. `battle.ts` `fire()` (owner: whoever holds the gunnery lines): the missile point-defence line `const pp = pdChance(tgt)`
   to add the screening wings' chance, so EXP-14 s2's missiles are intercepted more. A helper can live in
   `fighters.ts` next to `podPdChance`.
2. `view/comms/CommsHud.tsx` / `controller.ts`: fighter command Escort and Screen to take a ship (the selected own ship),
   sending `{ kind: 'fighters', task, target }`. The sim already honours `target`.
3. Palamedes: the screen numbers (above) and turning on `FIGHTERS.admiralEscortsPush` once WORLD-01 c6 holds with it.
4. `setups/europa.ts` `needs: ['fighter wings on the carrier (F1)']` can go: the carrier carries two wings.
5. N3 (PKG-26) / `summary.ts`: fighter tallies into `summarise()` if the end screen should show them
   (`fighterReport(b)` has them).

## Assumed, for Caleb to overrule

- A carrier carries 2 wings, a capital 1, nothing else; 6 fighters a wing. VISION §7a says "your flagship's wings";
  NAVY §2 names the carrier.
- Fighter command's task applies to all the side's wings, not only the flagship's own.
- Untasked wings stay aboard: nobody launches fighters until fighter command says so.
- Escort with no pods in flight guards its ship and still takes a pass at enemy pods that come near.
- Dogfights and point defence against wings are steady rates with no dice; only a pass at pods rolls (gunnery-like,
  the Daedalus ruling).
- The `fighters` flag gates drawing, not the sim.

## Evidence (branch, before the merge; post-merge evidence follows in the report-evidence commit)

```
2026-10-22T13:38:23-07:00 npx tsc -b
exit 0

2026-10-22T13:38:52-07:00 npx vitest run --maxWorkers=4
 Test Files  77 passed (77)
      Tests  947 passed | 1 skipped (948)
exit 0

2026-10-22T13:40:09-07:00 npx eslint src/battle/sim src/battle/view/fighters.ts src/battle/view/fighters.test.ts src/battle/view/scene.ts src/battle/view/simFeed.ts src/battle/view/model.ts src/battle/view/tactical/tactical.test.ts src/flags.ts
exit 0

2026-10-22T13:40:22-07:00 npm run build
✓ built in 20.36s
exit 0

2026-10-22T13:41:19-07:00 npm run smoke
[27.8s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":21,"shots":639,"movedBySide":[11,10],"drawCalls":169}
[32.7s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (32.7s)
exit 0

npm run bench (wall-clock bars, PKG-23)
bench: PASS · 1 bar(s) · 2.6s
```

`git merge claude/game` into `claude/pkg-25` at 13:38: "Already up to date" (the game tip is still 212b85b).
MERGE.lock taken 2026-10-22T13:38:16 (none existed).

Screenshots: `shots/pkg-25/exp02-s10-escort-pods-normal.jpg`, `exp02-s10-screen-flown-tactical.jpg`,
`screen-flown-tactical-1280.jpg`, `screen-flown-normal-1280.jpg`.

## Evidence after the merge (game worktree)

```
$ git -C <game> log --first-parent -3 --oneline claude/game
054c1a6 Merge PKG-25: fighter wings as sim entities (escort, screen, hunt), pods lost to PD and fighters
212b85b Daedalus: Phase B wave 1, PKG-25 F1 fighters, PKG-26 N3 morale
4b5914c Daedalus: PKG-23 verified; TRC-06

$ git -C <game> diff --stat 054c1a6^1 054c1a6
 src/battle/view/simFeed.ts                       |   3 +-
 src/battle/view/tactical/tactical.test.ts        |   4 +-
 src/flags.ts                                     |   1 +
 24 files changed, 1130 insertions(+), 7 deletions(-)

Gate, in the game worktree on 054c1a6:
2026-10-22T13:43:15-07:00 npx tsc -b
exit 0
2026-10-22T13:43:41-07:00 npx vitest run --maxWorkers=4
 Test Files  77 passed (77)
      Tests  947 passed | 1 skipped (948)
exit 0
2026-10-22T13:44:52-07:00 npm run build
✓ built in 18.36s
exit 0
2026-10-22T13:45:42-07:00 npm run smoke
[26.9s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":21,"shots":639,"movedBySide":[11,10],"drawCalls":169}
[31.8s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (31.8s)
exit 0
```

This evidence commit merges as "Merge PKG-25: report evidence": it changes this file only, and the full gate is re-run on that merge too.
MERGE.lock: taken 13:38:16, deleted after the evidence merge. Dev server on 5245 stopped and browser tab closed after.

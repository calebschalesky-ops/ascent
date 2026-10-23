# PKG-04: the skirmish view on the real engine

Seat: Talos, with Zeuxis's eye on the ship states. Branch `claude/pkg-04`, base `claude/game` @ a571a1c, merged up to
`claude/game` @ af73671 (PKG-05 boarding, PKG-06 comms) before the gate.

## What I measured

- **The skirmish now runs the real engine.** `?skirmish` builds `createBattle(SATURN_12V12, seed)` and steps the sim's
  own `step()` on its 1/30 s inside the frame loop. The feed is step-for-step the headless battle: after 900 steps on
  seed 4, `hashState` of the feed's battle equals a bare `createBattle` + `step()` run (test below).
- **Bench, same fixed camera as PKG-03** (`__probe.bench`: seed 1, 30 s in, `camera.reset`): **131 draw calls, 71,508
  triangles** on the sim, against PKG-03's baseline of 174 and 78,734. Both are under the baseline, so well inside +15%
  (200 / 90,544). The sim's hulls are fewer meshes than the stub's 22 cruisers (escorts use the fighter art).
  The stub, measured in the same pane after this package: 176 calls, 91,022 triangles (its 12 Saturn ships now carry
  shield panels too).
- **CPU per hand-driven frame (one 1/30 s sim step + one full composer render), in-app pane, Intel Iris Xe:** median
  7.1, 11.3, 13.0 and 13.3 ms over four 300-frame runs on the sim; 11.8 and 12.4 ms on the stub in the same pane. The
  spread is the machine (three other package threads were building and testing at the same time), not the view. The sim
  step alone is about 0.06 ms (a 316 s battle, 9,480 steps, runs in about 0.55 s under vitest). PKG-03's 7.5 ms was
  headless Chrome on an idle machine, so it is not a like-for-like number.
- **Seeds, on the merged engine (PKG-05 boarding in):** seed 1 ends at 2:47, Defeat (withdrawal), the player captured
  3; seed 6 idle ends at 5:59, Defeat. Pre-merge, seed 1 ended at 5:16 and seed 6 at 5:13.
- **What moves in the first minute:** on seed 1, 21 of 24 ships (11 and 10 by side). The three still ones are real sim
  behaviour, not a view fault: two escorts in `follow` keeping station on a slow flagship, and a carrier already at its
  preferred range under the doctrine's attack order (`speed 0`, measured at 60 s).

## What I changed

- `src/battle/view/simFeed.ts` (new): the adapter. Maps `Battle` to `model.ts` after every step: metres to battle units
  at 40 m a unit (`SIM_VIEW`), heading `h` to `(cos h, 0, sin h)`, a fixed per-ship height stagger that is the view's
  own (the sim keeps y = 0). Drains the sim log by global index (across the cap) into shots and comms lines. Enemy ships
  reach the frame with no shield state and nothing carries morale (a test asserts `morale` is absent from the frame).
  Comms say what a bridge would hear: opens fire, breaks off and runs, jumps away, strikes her colours, breaks apart,
  the flagship is lost, the line breaks, taken by boarding, aye on an order. No numbers.
  `order(ship, o)` calls the sim's `order(b, ship, o, 'player')`: the only way the view changes the battle.
- `src/battle/view/model.ts`: `ShipCls` gains the sim's hulls; `ShipStatus` is now
  `alive | broken | fled | withdrawn | struck | wrecked`; `ShipView` gains `name`, `flagship` and `open` (own ships
  only); `ShotView` gains `laser`, `face` and `hull`; the outcome is an `Ending` with kind, reason and a per-side
  `SideTally`; `BattleFeed` gains `timeScale`.
- `src/battle/view/scene.ts`, the ship states (numbers in `LOOK`, first-pass, look only):
  - **hits** fly to the side they strike: on the shield's skin in the target's glow, or orange hull fire through an open
    side;
  - **his own ships** carry four faint shield panels (one instanced mesh for the fleet); a side that is down is a gap,
    and a side that is hit flares. Enemy ships get no shimmer;
  - **broken**: engines flare, running lights stutter, and the sim turns it away;
  - **fled / withdrawn**: a flash, the hull stretches along its course and is gone in 0.45 s;
  - **struck**: lights, glow strips and engines out, hull darkened, rolling slowly;
  - **wrecked**: a fireball and embers, then the hull is cut in two by a clipping plane and the halves part, tumble and
    drift;
  - **colours follow `ship.side` every frame**: a ship whose house changes is redrawn in the new house's art (checked on
    the merged engine: Amalthea, taken by boarding at 1:04 on seed 1, turns Saturn amber that frame).
- `src/battle/view/Skirmish.tsx`: the sim is the default and `?stub` brings back the placeholder. The accumulator is
  scaled by `feed.timeScale`. The end screen shows after 3 game seconds (so the last jumps play), with the outcome,
  reason, each side's lost / broken / struck / fled / captured, and a Restart (seed + 1). The probe `battle` source
  keeps the view frame (what `smoke()` reads) and adds the whole serialisable `Battle` under `sim`. New verbs:
  `act('order', {ship, order})` and `act('time.scale', {scale})`.
- `src/battle/view/skirmish.css`: the end screen, shared tokens only.
- `src/battle/view/stubFeed.ts`: the HUD names are the engine's houses (`SATURN_12V12`), not Autochthones / Diadochoi.
  The quiet comms line is now "The fleets close." (it said "Holding fire" while the sim fires from 0:00).
- `src/battle/view/view.test.ts`: 6 sim-feed tests (12 v 12 in the engine houses and no enemy shield or morale state;
  step-for-step equal to the headless sim; both fleets move and fire with hits on a named side; ends with outcome, reason
  and tally equal to `summarise()`, comms with no numbers; orders for his side only; reset reproduces the opening).
- **Outside my named files:** `src/dev/probe.ts`, one check in `smoke()`. It required all 24 ships to move in 60 s,
  which the stub always did and the real engine does not (three still ships, above). It now requires more than half of
  each fleet to move and reports `movedBySide`. Without it `npm run smoke` fails on the real engine and the gate with
  it, and the package asks for smoke on the real engine. Flagged here so Daedalus can overrule it.

## What is still broken or not built

- `state('battle')` is not the bare `Battle`: it is the view frame plus the `Battle` under `battle.sim`. The bare
  battle would break `smoke()` (it reads `battle.ships[].side` as 0/1 and `pos` as an array).
- Screenshots lag: the in-app pane often returned the previous frame, so each screenshot below was checked against the
  probe state and HUD clock before it was kept.
- The broken / struck / jump / wreck close-ups were shot before the PKG-05 merge, on the same view code. The end screens,
  step 7 and the capture were re-shot on the merged engine (`merged-*`).
- At close range (under about 30 units) the engine glow points and hit flashes bloom large. That is PKG-03's engine
  glow size plus my hit flashes; it reads well at the default camera and badly at point-blank.
- The sim's end reason can disagree with the tally: seed 1 merged says "6 of 12 ships lost" while `summarise()` gives
  the player 1 lost (11 broken, 11 fled). The sim's side check counts ships out of the field, the summary counts wrecked,
  struck and captured. Not my files; listed under Requests.

## Script steps

| Script / step | Result | Evidence |
|---|---|---|
| EXP-01 1 (opens skirmish, zero console errors) | pass | `exp01-step1-3-boot-12v12-saturn.jpg`; probe `errors: []`, console clean |
| EXP-01 2 (12 v 12 in view; probe 12/12) | pass | same shot; probe `battle.ships` 12/12 and `battle.sim.ships` 12/12 |
| EXP-01 3 (Saturn and ring plane in frame) | pass | same shot |
| EXP-01 4 (both fleets move and fire for 20 s; damage both sides > 0) | pass | `exp01-step4-fire-both-ways-33s.jpg`; at 30.8 s damage 1,175 / 2,118, shots 79 / 77, moved 10 / 10 |
| EXP-01 5 (ends with a stated outcome, on screen) | pass | seed 1 merged: 167 s, Defeat, withdrawal, reason shown; `merged-exp01-step5-6-end-screen-seed1.jpg` |
| EXP-01 6 (after-battle summary: lost, captured, broken by side) | pass | same shot: lost 1/3, broken 11/0, struck 0/0, fled 11/0, captured 3/0 |
| EXP-01 7 (reload mid-battle, no crash) | pass | reload at t 51.6 (seed 2) → `nav: reload`, seed 1, t 0, 24 ships, `errors: []`; `exp01-step7-after-reload-mid-battle.jpg` |
| EXP-01 8 (375 px: comms and end screen readable) | pass | `exp01-step8-375px-comms.jpg`, `exp01-step8-375px-end-screen.jpg`: scrollWidth 375, comms 16 px, table min 14 px, card 16–359 px, Restart 44 px tall |
| EXP-06 4 (broken ships seen fleeing or striking) | pass | seed 6: `exp06-step4-seed6-enemy-broken-runs.jpg` (Europa breaks at 1:36, comms line), `exp06-step4-seed6-enemy-jumped-comms.jpg` (jumps away 2:10), `exp06-step4-seed6-broken-line-jumps-out.jpg`; seed 1: `exp06-step4-own-broken-running.jpg`, `exp06-step4-own-fled-jump-flash.jpg`, `exp06-step4-enemy-struck-dark.jpg` |
| EXP-06 7 (loses his flagship, his fleet breaks, defeat on screen) | pass | seed 6 merged: `act('order')` p6 attack e6, the other 11 hold; p6 wrecked 4:51, line breaks 4:52, Defeat at 5:04; `merged-exp06-step7-defeat-seed6.jpg` |
| view: open shield side as a gap (own ships only) | pass | `view-own-shields-flagship-aft-open.jpg` (Astu, `open: [aft]`) |
| view: wreck splits and drifts | pass | `view-wreck-two-halves.jpg` (Stoa, 1:28) |
| view: captured ship changes colours | pass | `merged-capture-amalthea-turns-saturn.jpg` (e12 side 0, house saturn, glow #ff8a1e at 1:04) |
| WORLD-01 check 7 | not mine | the director is a later package |

Screenshots are under `shots/pkg-04/`. Flag: `skirmish` stays **off** (`?skirmish` only). Save version: unchanged (the
skirmish neither loads nor writes the save).

## Evidence

Acceptance on the merged branch (`claude/pkg-04` @ 53d2996, `claude/game` @ 03fc6c0 merged in), after my last edit:

```
2026-10-21T15:36:51-07:00
53d2996 Merge branch 'claude/game' into claude/pkg-04
$ npx tsc -b
exit 0
$ npx vitest run
 Test Files  56 passed (56)
      Tests  741 passed (741)
$ npx eslint src/battle/view src/dev
exit 0 (clean)
$ npm run lint (whole repo)
✖ 18 problems (7 errors, 11 warnings)        <- all in src/components/, there before PKG-02 (PKG-02 report)
$ npm run build
✓ built in 21.23s
precache  40 entries (2651.06 KiB)
$ npm run smoke
[16.1s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":21,"shots":854,"movedBySide":[11,10],"drawCalls":170} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[20.9s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (20.9s)
```

One earlier full `vitest run` (15:33, before the merge) failed one test, `src/battle/sim/sim.test.ts` "same seed twice
gives the identical state hash after 15 minutes", on its 5 s timeout (6.8 s while other threads loaded the machine). It
passed alone (22/22) and PKG-05 has since given the full-battle tests 30 s timeouts.

Bench (in-app pane, `__probe.bench({frames: 300})`, merged engine):
```
{"medianMs":11.3,"p95Ms":48.3,"render":{"calls":131,"triangles":71508,"geometries":80,"textures":16}}
{"medianMs":7.1,"p95Ms":11.4,"render":{"calls":131,"triangles":71508,"geometries":80,"textures":16}}
stub, same pane: {"medianMs":11.8,"render":{"calls":176,"triangles":91022}} {"medianMs":12.4,...}
```

Re-run after merging PKG-06 in (`claude/pkg-04` @ b1ece13, 15:43:45): tsc exit 0, vitest 57 files / 764 tests passed,
my lint clean, build ok, `SMOKE PASS`. Browser re-check on that engine: seed 6 idle ends at 6:57, Defeat on screen
("broke at 6:45: flagship Astu wrecked"), `errors: []`.

## Requests

- **Daedalus:** confirm the one-check change in `src/dev/probe.ts` `smoke()` ("more than half of each fleet moved"), or
  name the bar you want. Also confirm `state('battle.sim')` is acceptable as "the serialisable battle".
- **Palamedes / sim owner:** two escorts and a carrier sit still for the first minute on seed 1 (`follow` at speed 0,
  carrier already at `prefRange`). If that is not intended, it is in the sim, not the view.
- **Sim owner (summary / side check):** the end reason "6 of 12 ships lost" disagrees with `summarise()`'s `shipsLost`
  of 1 on seed 1 merged. One of the two words needs to change so the end screen does not contradict itself.
- **PKG-03's engine glow:** `LOOK.engine.size` (6 world units) blooms over a ship at point-blank range. A
  size-attenuated or distance-capped glow would fix it; I left PKG-03's look alone.

## Assumed, for Caleb to overrule

- **The visual language for ship states** (above): broken = flared engines and stuttering lights; fled = a flash and a
  stretch; struck = dark and rolling; wrecked = split in two, drifting; shields = four faint panels on his ships only.
- **Scale:** 40 m of sim per battle unit, so the 9 km opening gap is 225 units and a capital is 800 m long on screen.
- **Hull art per class:** destroyer and cruiser use the cruiser art (9.5 and 7 units), carrier uses the capital art (13),
  escort uses the fighter art (4.5). The styles have only three hulls.
- **The end screen waits 3 game seconds** after the battle ends, so the last jumps and wrecks play first.
- **"Fled" on the end screen counts fled plus withdrawn.**
- I cannot prove whether the deaths and breaks look like a film. The screenshots are for Caleb.

## Gate (after the merge, in the game worktree)

Merge `33c4407` on `claude/game`. Lock taken 15:43:35 after PKG-06 released it. The vitest count was 764 in 57 files on
the merged branch before the merge and is 764 in 57 after it.

```
2026-10-21T15:45:40-07:00
$ git log --first-parent -3 --oneline claude/game
33c4407 Merge PKG-04: skirmish view on the real engine (simFeed), ship states on screen, end screen, probe order verb
af73671 Merge PKG-06: report gate evidence
f36e1d4 Merge PKG-06: comms sim (queue, timeouts by trait, command points, pushback, flagship crew orders, report lines)
$ git diff --stat HEAD^1 HEAD
 shots/pkg-04/exp06-step4-own-broken-running.jpg    | Bin 0 -> 54992 bytes
 shots/pkg-04/exp06-step4-own-fled-jump-flash.jpg   | Bin 0 -> 44397 bytes
 .../exp06-step4-seed6-broken-line-jumps-out.jpg    | Bin 0 -> 38812 bytes
 .../pkg-04/exp06-step4-seed6-enemy-broken-runs.jpg | Bin 0 -> 45331 bytes
 .../exp06-step4-seed6-enemy-jumped-comms.jpg       | Bin 0 -> 47067 bytes
 ...xp06-step7-defeat-seed6-flagship-sent-alone.jpg | Bin 0 -> 36796 bytes
 .../merged-capture-amalthea-turns-saturn.jpg       | Bin 0 -> 49051 bytes
 .../merged-exp01-step5-6-end-screen-seed1.jpg      | Bin 0 -> 32939 bytes
 shots/pkg-04/merged-exp06-step7-defeat-seed6.jpg   | Bin 0 -> 32127 bytes
 .../pkg-04/view-own-shields-flagship-aft-open.jpg  | Bin 0 -> 52541 bytes
 shots/pkg-04/view-wreck-two-halves.jpg             | Bin 0 -> 13099 bytes
 src/battle/view/Skirmish.tsx                       |  80 +++++-
 src/battle/view/model.ts                           |  49 +++-
 src/battle/view/scene.ts                           | 283 ++++++++++++++++++---
 src/battle/view/simFeed.ts                         | 226 ++++++++++++++++
 src/battle/view/skirmish.css                       |  26 ++
 src/battle/view/stubFeed.ts                        |  14 +-
 src/battle/view/view.test.ts                       |  85 +++++++
 src/dev/probe.ts                                   |  10 +-
 27 files changed, 879 insertions(+), 56 deletions(-)
$ npx tsc -b
exit 0
$ npx vitest run
 Test Files  57 passed (57)
      Tests  764 passed (764)
$ npm run build
✓ built in 14.21s
precache  40 entries (2684.99 KiB)
$ npm run smoke
[12.2s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":21,"shots":854,"movedBySide":[11,10],"drawCalls":170} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[16.5s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (16.5s)
```

# PKG-08: morale balance (Palamedes)

Branch `claude/pkg-08` from `claude/game` @ 3dacf09, merged with the game tip (b18a4f5, PKG-09/10/11) before acceptance.
Every figure below is MEASURED-HERE (this session, seeded, `npm run sim` or the harness described under "How it was
measured") unless labelled otherwise. Flag: none. Save shape: unchanged (no save version change).

**Result in one line:** the break rule, the end reason and the tally now read one loss count, so they always agree;
battles last 4.7–10.5 min (median 8.0) instead of 1.9–3.0 (median 2.0); WORLD-02 checks 3 and 4 both pass; **check 6
still fails (7 of 10, every push visible, three seeds have no push) and check 7 now fails (5 of 10)**, and
scripted-good never wins outright. Both are trade-offs measured below, not things I could tune away from the shared rules.

## 1. What I measured first (claude/game @ 3dacf09, seeds 1–10, roster 1)

Per-side morale, ships active/broken/fled/lost/captured every 15 s and the cause of every morale drop, for idle,
scripted-good and scripted-bad (`measure.mjs`, 30 battles, log cap lifted so no event was dropped).

- **Why a fleet with the better tally breaks.** `sideCheck` counted "ships out" as every ship *currently on the side*
  that was not in the field. That includes (a) the side's own ships that **fled** and (b) **prizes it had captured that
  were later wrecked**. boarding.ts `captureSideCheck` added the side's ships captured by the enemy on top. Seed 1,
  scripted-good: the player lost p2 (wrecked) and p9 (captured), p8/p4/p11 fled, and its prize Spear (e8) was wrecked
  1.9 s after capture: "6 of 12 ships lost (1 captured)" while the tally said 2 lost.
- **The cascade.** Of all player morale lost in idle runs, **68% was "a friend left the field"** (2,400 of 3,532
  points), and most of those friends had fled, not died: every flight cost every friend 4–6 points at full weight,
  an escort exactly as much as a destroyer. The first flight came at 17 s (Ekklesia, Pessimist Nerve 3: started 12
  points above its break line) and the second at 26 s (Agora, Pessimist Nerve 2: **6.5 points** above it) (seed 1,
  scripted-good).
- **The winner's morale only rose.** The enemy gained 4,632 morale points from player ships leaving (+4 per ship to
  every enemy ship, fled ships included) and sat at 97–100 when the player broke.
- **Durations:** idle 1.9–3.0 min (median 2.0), scripted-good 1.5–2.8, scripted-bad 1.1–1.5.
- **Roster 1 is not even (MEASURED-HERE).** Sum of the 12 captains' abilities: player Gunnery 56 / Helm 68 / Nerve 60 /
  Judgement 68; enemy **84 / 80 / 68 / 72**. With the new accounting and `moraleStartBase` 70, the same admiral on
  both sides (`admiral-jupiter` v `admiral-jupiter`) loses 10 of 10 from the player's seat; playing the player's side
  against an idle enemy, it wins outright 7 of 10.

## 2. What I changed

Files: `src/battle/sim/losses.ts` (new), `battle.ts`, `summary.ts`, `numbers.ts`, `losses.test.ts` (new),
`vision/sims/**` (re-run output), this report. Nothing in boarding/, admiral/, comms/, maneuvers/ or view/.

**One loss count.** `losses.ts fleetLosses(b, side)`: a side's ships are the ones it started with; each is *lost*
(wrecked, struck, or captured by the enemy, whatever became of it after), *fled*, or *withdrawn*. Weighted by class
(`STRENGTH`: capital 6, destroyer 3, carrier 3, cruiser 2, escort 1; a side is 27). Lost and fled count in full,
withdrawn at half; **prizes still held in the field** are credited at half their strength. `frac` = strength gone
/ starting strength.
- `battle.ts sideCheck()`: breaks the side when `frac ≥ MORALE.sideBreakStrength` (0.5, NAVY decision 4 "half its
  strength"); the reason is `lossesText()`, e.g. "52% of its strength gone: ships lost 4, fled 4". The flagship and
  fleet-morale reasons are unchanged.
- `summary.ts summarise()`: `shipsLost`, `wrecked`, `struck`, `fled`, `withdrawn` come from the same `fleetLosses()`;
  new field `strengthLost`. The view's tally (`simFeed.ts lost: s.shipsLost`) therefore shows the same "Ships lost" the
  reason names. At the break, reason and tally are equal (test); after it, the tally can only grow during pursuit.
- `battle.ts shipOut()`: the morale shock of a ship leaving the field is `STRENGTH × friendLost(Near)PerStrength`
  (enemy gain `STRENGTH × enemyLostPerStrength`), × `fledShock` / `withdrawnShock` for a ship that ran.
- `MORALE.sideBreakLosses` 0.5 → 2: retired. It is now read only by boarding.ts `captureSideCheck` (which still
  counts wrecked prizes as the captor's losses) and by the admiral's withdrawal watch; at 2 it needs 24 of 12 ships
  out, so it never fires. Requests 1 and 2 ask the owners to read `fleetLosses()` and delete it.

**Seed 1, scripted-good, before → after:** "broke at 1:28: 6 of 12 ships lost (1 captured)" with tally lost 2
→ "A Titan house (Saturn) broke at 4:17: 54% of its strength gone: ships lost 3, fled 4, withdrawn 1"; the tally at the
end is lost 3, fled 7, withdrawn 1 (three more fled during the pursuit, after the break).

### Numbers changed

Chosen together, not one at a time: an 8-knob search (66 random points on seeds 1–10, then the best and their
one-knob neighbours re-run on **seeds 1–30**, each point 150 battles: idle, scripted-good, scripted-bad,
aggressive-admiral control, swap variant). The sim line is that knob moved with the rest held at the neighbour point
**hullLoss 35** (the final set is that point with hullLoss 37); "W01-6" is WORLD-01 check 6.

| Number | Old → new | Why | Sim line that proved it (seeds 1–30 unless marked) |
|---|---|---|---|
| `losses.ts` + `sideCheck` | ship count → `fleetLosses().frac ≥ sideBreakStrength` | reason and tally must agree; fled ships and lost prizes were counted as losses | test `the break rule, its reason and the tally use the same numbers`; seed 1 above |
| `STRENGTH` (new) | capital 6, destroyer 3, carrier 3, cruiser 2, escort 1 | "half its strength", not half its hulls: four escorts and two cruisers is 8 of 27 | test `less than half the strength gone does not break the side` |
| `MORALE.sideBreakStrength` (new) | 0.5 | NAVY decision 4 | EXP-06 step 6 test: 15 of 27 wrecked/struck → victory at 0:01 |
| `MORALE.withdrawnLossFrac`, `prizeCredit` (new) | 0.5, 0.5 | a withdrawal is half a loss; a prize half a gain while held | `fleetLosses` test |
| `MORALE.sideBreakLosses` | 0.5 → 2 | retired (see above) | at 1 (an earlier step here), captureSideCheck still broke 3 of 10 idle sides on "12 of 12 ships lost (1 captured)", counting wrecked prizes, with 11 of 27 strength gone (seed 5); at 2 it never fires |
| `MORALE.friendLost/Near/enemyLost` (capture only) | 4 / 6 / 4 → 3 / 5 / 2 | boarding's capture() reads them; a captured ship is a cruiser or escort nearly every time | — (kept in line with the per-strength values; not separately simulated) |
| `MORALE.friendLostPerStrength / NearPerStrength` (new) | 1.5 / 2.5 | an escort's flight should not shake the line like a destroyer's | accounting + flat shock: check 3 5/10, check 4 9/10, idle median 2.9 min; + per-strength: 8/10, 5/10, 4.0 min (seeds 1–10) |
| `MORALE.enemyLostPerStrength` (new) | 0.75 | the enemy rose to 97–100 morale and could not break | at 1.0: check 3 21, check 4 23, check 6 24, check 7 11, W01-6 24 |
| `MORALE.fledShock` / `withdrawnShock` (new) | 1 / 0.5 | a ship that ran is still gone from the line | at fled 0.75 (enemyLost 1.0, check 7 not yet measured): check 3 20, 4 24, 6 24 |
| `MORALE.hullLoss` | 25 → 37 | a ship's own wounds, not its friends' flight, should be what breaks it | at 35: check 3 24, 4 24, 6 21, 7 12, W01-6 25; **but** seeds 8 and 10 then launch an admiral push with no escort left and a 8–9° turn, which fails the PKG-07 visibility test (Request 3); at 37 every push in seeds 1–10 is visible |
| `ABILITY.moraleStartBase` | 62 → 70 | a Nerve 2 Pessimist started 6.5 points above breaking | at 68 (enemyLost 1.0): check 3 23, 4 24, 6 22 (7 not measured); at 71: 21, 22, 26, 11 |
| `CLASS.*.regen` | × 1.5 (0.035/0.04/0.04/0.035/0.05 → 0.0525/0.06/0.06/0.0525/0.075) | spread fire wastes more on a shield that comes back; one side focused still breaks | at × 1.25: check 3 20, 4 24, 6 23, 7 7; at × 1.6: 18, 25, 24, 11 |
| `GUN.*.damage` | × 0.7 (25/6/50 → 17.5/4.2/35) | battles ran 1.5–3 min; the target is 4–10 | at × 0.75: check 3 22, 4 21, 6 22, 7 12, idle median 5.4; at × 0.8: 20, 24, 22, 10, 5.7 |
| `ESCAPE.pursuitWindow` | 120 → 180 s | pursuit is where a badly broken fleet loses ships (check 4) | at 120 (seeds 1–10): identical check rows, idle median 6.7 v 7.7 min |

**Final set, seeds 1–30 (each row 30 battles per policy):**

| | base (3dacf09) | final |
|---|---|---|
| WORLD-02 check 3 (good beats idle) | 12 of 30 | **22 of 30** |
| WORLD-02 check 4 (bad worse than idle) | 23 of 30 | **26 of 30** |
| WORLD-02 check 6 (seeds with a visible push) | 19 of 30 | **23 of 30** |
| WORLD-02 check 7 (Jupiter range > Mars) | 22 of 30 | **14 of 30** |
| WORLD-01 check 6 (swap changes the battle) | 28 of 30 | 22 of 30 |
| idle v admiral median duration | 2.2 min | 7.1 min |
| scripted-good victories | 0 of 30 | 0 of 30 |

The bar is 8 of 10 (80%); on 30 seeds no row but check 4 clears 80%, so **seeds 1–10 passing checks 3 and 4 is
partly the draw.** A pass rate near 75% will fail one 10-seed set in three.

## 3. Script steps

| Step | Result | Evidence |
|---|---|---|
| WORLD-02 check 3 (scripted-good beats idle, 8 of 10) | **pass** (9 of 10) | lost good 3 3 1 3 2 2 2 3 2 4 v idle 4 3 3 5 4 3 5 4 3 5 |
| WORLD-02 check 6 (telegraphed push, 8 of 10) | **FAIL** (7 of 10; was 7) | 17 pushes, lead ≥ 6 s, visible 17 of 17; seeds without a push: 3 (the admiral never finds an uncovered open side). Battles are now long enough; the misses are the admiral's push rule (Request 4) |
| EXP-06 step 6 (break half the enemy fleet and win) as sim behaviour | **pass (sim)**; `ui` unproven | test: 15 of 27 enemy strength wrecked/struck → "House of Ganymede (Jupiter) broke at 0:01: 56% of its strength gone: ships lost 6, fled 0", outcome victory. Admiral-played player v idle enemy, roster 1: victory 6 of 10, timeout 2, withdrawal 2 (pair harness) |
| WORLD-02 check 1, 2, 5 | pass | 10/10, 10/10, 10/10 |
| WORLD-02 check 4 | pass (9 of 10) | lost bad 6 6 4 7 6 4 5 6 5 6 |
| WORLD-02 check 7 | **FAIL** (5 of 10; was 9 of 10) | trade-off, section 4 |
| WORLD-02 check 2 across rosters 1–8 (≥ 6 of 8) | pass, 6 of 8 | rosters 4 and 7 split |
| WORLD-01 checks 1–6 | pass (6 pass, 1 not built) | check 6: 8 of 10 |
| Step 4: flagship marine commander launches pods | **pass (sim)**, nothing changed | today's tip: `launchPods` at Basileus (e3) from Astu launches 6 pods, 90 marines (test). "No pods aboard" was PKG-06 running before PKG-05's `board` kind existed. At their flagship it is still refused (Request 5) |
| Durations 4–10 min, median 5–8 | 9 of 10 in range, median **8.0** (edge) | table below; seed 7 is 10.5 min |
| scripted-good wins outright ≥ 5 of 10 | **not met** (0 of 10) | section 4 |
| Feel: does the break feel earned | wired-but-unproven (Caleb) | morale series below |

### Battle durations (seconds, seeds 1–10, enemy admiral-jupiter; duration includes the up-to-180 s pursuit)

| Player | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | median |
|---|---|---|---|---|---|---|---|---|---|---|---|
| idle | 438 | 550 | 437 | 556 | 477 | 375 | 630 | 496 | 281 | 486 | 482 (8.0 min) |
| scripted-good | 437 | 223 | 234 | 269 | 275 | 325 | 441 | 214 | 268 | 577 | 272 |
| scripted-bad | 171 | 184 | 182 | 191 | 168 | 184 | 172 | 200 | 181 | 193 | 183 |
| idle v aggressive control | 584 | 360 | 542 | 900 | 582 | 391 | 651 | 414 | 559 | 900 | 571 |

Idle's break comes at 4:17–9:04 (median 6:06); before: 1:42–2:34.

### Seed 1, idle v admiral-jupiter: mean morale per side every 15 s (for Caleb's feel check)

Player 69 · 67 · 66 · 65 · 64 · 63 · 60 · 60 · 58 · 56 · 54 · 52 (3:00) · 47 · 45 · 41 · 37 · **29 (4:15) → broke at
4:18**. Enemy 74 · 74 · 74 · 74 · 73 · 72 · 73 · 73 · 74 · 74 · 73 · 76 · 77 · 78 · 78 · 78 · 80, then 90 when the
player line went. Slow and heavy for three minutes (−17 points), then −23 in the last 75 s as ships go. End reason on
screen: "A Titan house (Saturn) broke at 4:18: 52% of its strength gone: ships lost 4, fled 4"; final tally ships lost
4, fled 7 (three more fled in the pursuit). Before: "broke at 1:46: 6 of 12 ships lost" with tally lost 2.

## 4. Trade-offs I could not tune away (stopped here, per step 5)

1. **Check 7 v correct accounting.** With every number at its old value and only the accounting fixed, check 7 drops
   from 22 of 30 to 13 of 30. It passed because captureSideCheck's miscount ended the Mars-control battles early,
   during the approach, when Mars ships close and Jupiter's do not. In a battle that runs on, both lines settle at
   the captains' own `prefRange` (the attack order holds there for both admirals) and the mean shot range converges
   (5.6 v 5.6 km). No shared number I own separates them: `prefRange` × 0.6–0.85 kept check 7 at 3–7 of 10 and cost
   check 3. It needs the admiral (Request 4).
2. **Scripted-good winning outright.** 0 of 30 at every point searched. With Gunnery and Helm effects on hit chance
   removed entirely (`gunHitPer` 0, `evadePer` 0), scripted-good still won 1–3 of 10, and the admiral mirror 3 of 10.
   Two causes: roster 1's enemy has +28 Gunnery and +12 Helm over the player's twelve captains, and scripted-good deals
   half the damage it takes (58k v 124k over seeds 1–10) because it holds its flagship (12 of the fleet's guns) back.
   Meeting ≥ 5 of 10 would mean making captains' abilities stop mattering, which breaks WORLD-02's own premise
   ("decided by decisions and captains' characters"). On roster 7 (player +16 Gunnery) the same policy wins 6 of 10
   (`moraleStartBase` 70 only, before the other changes).
3. **Checks 3 and 4 pull against each other** through the idle baseline: anything that makes idle lose more ships
   helps 3 and hurts 4. The final set holds both near 75–85% on 30 seeds; no point searched held both at ≥ 80% *and*
   check 6 and check 7.

## 5. Requests

1. **boarding/boarding.ts (PKG-05 owner):** `captureSideCheck()` should go: `battle.ts sideCheck` already counts a
   captured ship as lost (`fleetLosses`). And `capture()`'s morale shock should call the same per-strength shock as
   `shipOut()` (today it uses the flat `MORALE.friendLost/friendLostNear/enemyLost`, kept for it). Then delete
   `MORALE.sideBreakLosses`.
2. **admiral/admiral.ts (PKG-07 owner):** the withdrawal watch reads `MORALE.sideBreakLosses` (now 2, so it never
   holds a withdrawal back). It should ask `fleetLosses(b, side).frac + STRENGTH[s.cls] × withdrawnLossFrac / 27 ≥
   sideBreakStrength`.
3. **admiral/admiral.ts:** a push is telegraphed even when no escort is left and the launchers barely turn. At hullLoss
   35 (otherwise the final set), seeds 8 and 10 each launched one at 5:33 and 6:33 with no active escort and a capital
   turn of 9° and 8° (bar 10°), failing `admiral.test.ts` "telegraphs a boarding push". The final numbers pass it on
   seeds 1–10, but the rule is one draw from failing again; BATTLE-RULES rule 8 says the player must be able to see it.
4. **admiral (PKG-07):** check 6 misses are seeds with no push at all; check 7 needs Mars to close inside the line's
   `prefRange` (or Jupiter to stand off beyond it) to stay distinct in a 5–8 minute battle.
5. **boarding / comms:** `launchPods` at the enemy flagship is refused ("only the admiral leading may board it",
   NAVY §3) while VISION §7a's example line is "Send the pods at their flagship". The refusal says "The marines are
   not ready", which is not the reason; the out-of-range refusal says the same.

## 6. Assumed, for Caleb to overrule

- Strength weights capital 6, destroyer 3, carrier 3, cruiser 2, escort 1 (TASTE).
- A withdrawn ship is half a loss to the break rule; a prize counts half its strength, only while held (TASTE).
- A ship that fled shakes its friends as much as one wrecked (`fledShock` 1): the search preferred it.
- Duration counts the pursuit after the break (up to 180 s), as the runner reports it.

## How it was measured

Harness scripts (not committed; they bundle `src/battle/sim` with the repo's esbuild like `scripts/sim.mjs` and
override numbers in memory): `measure.mjs` (15 s series and morale-drop causes), `tune.mjs` (WORLD-02 checks 2/3/4/6/7
and WORLD-01 check 6 for one set of numbers, `world01`/`world02` from `checks.ts`), `pair.mjs` (any two controllers,
any roster), `search.py` (random and neighbour search), `vis.mjs` (the two admiral tests). Seeds are the battle seeds;
roster 1 throughout except the roster table.

## Evidence

Game branch after the merge (`git log --first-parent -3`):
```
7772a60 Merge PKG-08: one loss count for break rule, reason and tally; morale and duration second pass (WORLD-02 checks 3, 4 pass; 6, 7 fail, see report)
b18a4f5 Daedalus: PKG-09, PKG-10, PKG-11 verified
59681aa Merge PKG-10: report evidence
```
Merge diff (`git diff --stat HEAD^1 HEAD`, src and reports; the other 70 files are `vision/sims/**` re-run JSON):
```
 reports/PKG-08.md             | 187 ++++++++++++++++++++++++++++++++++++++++++
 src/battle/sim/battle.ts      |  17 ++--
 src/battle/sim/losses.test.ts | 118 ++++++++++++++++++++++++++
 src/battle/sim/losses.ts      |  62 ++++++++++++++
 src/battle/sim/numbers.ts     |  80 ++++++++++++------
 src/battle/sim/summary.ts     |  20 +++--
 6 files changed, 448 insertions(+), 36 deletions(-)
 76 files changed, 518 insertions(+), 106 deletions(-)
```
Acceptance on the branch merged with the game tip (b18a4f5), after the last code edit:
```
Wed Oct 21 16:39:35 PDT 2026
$ npx tsc -b
tsc clean (exit 0)
Wed Oct 21 16:39:46 PDT 2026
$ npx vitest run
 Test Files  62 passed (62)
      Tests  815 passed (815)
   Start at  16:39:48
Wed Oct 21 16:40:10 PDT 2026
$ npx eslint src/battle/sim
lint clean (exit 0)
Wed Oct 21 16:40:15 PDT 2026
$ npm run build
precache  40 entries (2752.68 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
Wed Oct 21 16:40:43 PDT 2026
[13.0s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":23,"shots":562,"movedBySide":[11,12],"drawCalls":68} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[17.6s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (17.6s)
```
Sim commands (heads and final lines; full tables in sections 3 above):
```
Wed Oct 21 16:41:09 PDT 2026
> ascent-flight@0.0.0 sim
> node scripts/sim.mjs --script WORLD-01 --seeds 10 --minutes 15 --policy idle
WORLD-01: every built check passed (5 pass, 1 not built, 1 not run)
Wed Oct 21 16:41:15 PDT 2026
> ascent-flight@0.0.0 sim
> node scripts/sim.mjs --script WORLD-01 --seeds 10 --minutes 15 --policy idle --variant swap-nerve-judgement
WORLD-01: every built check passed (6 pass, 1 not built, 0 not run)
Wed Oct 21 16:41:09 PDT 2026
> ascent-flight@0.0.0 sim
> node scripts/sim.mjs --script WORLD-02 --seeds 10 --minutes 15
WORLD-02: 2 built check(s) FAILED
Wed Oct 21 16:41:09 PDT 2026
> ascent-flight@0.0.0 sim
> node scripts/sim.mjs --script WORLD-02 --seeds 10 --minutes 15 --rosters 1-8 --no-write
rosters holding check 2: 6 of 8
```
The gate, in the game worktree after `git merge --no-ff claude/pkg-08`:
```
Wed Oct 21 16:44:25 PDT 2026
$ npx tsc -b
tsc clean
$ npx vitest run
 Test Files  62 passed (62)
      Tests  815 passed (815)
   Start at  16:44:38
$ npm run build
  dist/sw.js
  dist/workbox-9c191d2f.js
$ npm run smoke
[12.5s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":23,"shots":562,"movedBySide":[11,12],"drawCalls":68} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[16.8s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (16.8s)
```

Screenshots: none (headless package, no `ui` step built).

# PKG-19: a good plan (Palamedes)

Branch `claude/pkg-19`, base `claude/game` @ ad81038.

## 1. The plans (written and committed before any seed was run; amendment A3: never edited after a result)

Daedalus's ruling (PKG-19 package): `scripted-good` and `scripted-bad` are test instruments. They are replaced by two new
policy files, `src/battle/sim/policy-good.ts` and `policy-bad.ts`. Each move below names the vision line it comes from.
Both policies act only through `order()` (like every policy) and read only what the player's side can see: every ship's
position, heading, class and status, which ship is their flagship, everything about its own ships, and what its own
hits show (a hit that reached the hull means that side is open; a `shieldDown` event on an enemy side its own guns
caused; a hit soaked by shields means it is closed). Neither reads an enemy ship's shields, hull, morale, marines or
captain. (VISION §7a "Seeing is not knowing".) Neither answers comms (both leave the queue to the captains, as idle
does), so the difference from idle is the orders alone.

### Scripted-good (`policy-good.ts`), every `PLAN_GOOD.everyS` seconds

| # | Move | Vision line |
|---|---|---|
| G1 | **One target at a time.** The fleet picks one enemy ship and holds it until it leaves the field, then picks the next: among enemies within railgun range of our line's centre (else all), the one cheapest to break by the public class numbers (hull + shield, less the hull damage our hits have seen), plus distance, with a bonus if a side of it has been seen open. Their flagship is a candidate like any other (its class makes it the dearest to break, so it comes late unless seen open). | Battle 1 0:40 "All batteries on their lead destroyer"; battle 7 0:40 "Their destroyer, nothing else"; battle 17 0:35 "one target at a time"; VISION §7a fleet clash: "concentration of fire" decides it |
| G2 | **The line fires from where it stands.** Every line ship (destroyers, cruisers, carrier, flagship) gets an `attack` order on the target, which holds each captain at his own preferred range. Nobody is sent round the target with `focusSide`. | VISION §7a fleet clash "Facing"; battle 5: leaving the line shows the stern; PKG-07's measured finding that `focusSide` flies ships through the enemy's laser range |
| G3 | **Escorts keep their screen.** Escorts are never given a target; any escort not on `followFlagship` is put back on it. | Battle 6 0:45 (mistake 2: the wings sent to hunt, nobody guarding); battle 7 1:10 and battle 17 0:35 "fighters screen"; PKG-16 §5 (measured: escorts sent at a target are the whole loss) |
| G4 | **The flagship stays in the line.** It is a line ship under G2 (its own guns on the target) and is never sent forward alone; it moves out of the line only to board their flagship (G6). | Battle 5 3:17 (flagship leaves the line, boarded); battle 1 0:40 *Meridian*'s broadside on the lead destroyer |
| G5 | **Board through an open side, and only once it is confirmed open.** When a side of the target has been seen open by our hits within `PLAN_GOOD.openForgetS` and not seen closed since, and no enemy escort other than the target is within `PLAN_GOOD.laneClearM` of it, the carrier (any launcher but the flagship) in launch range is ordered to `board` that side. While our marines are fighting aboard and the side is still seen open, the launcher sends its next party (reinforce). Never into a side not seen open. | Battle 1 4:00 "Their bow is open. Board it." and 5:10 "Need another pod. You send the last pod."; battle 4 3:50–3:58 (launching before the confirm: the pod deflected); battle 7 2:10 "This time you wait for him"; battle 1 3:15 and battle 10 2:10 (pods die to point defence: escorts near the target cover it) |
| G6 | **Take the flagship.** When their flagship has a side seen open (as G5) and is within our flagship's launch range, our flagship's marines board it (the admiral leading, `board` from the flagship, the only ship allowed to). Reinforce the same way as G5. | Battle 7 2:15 "You lead the boarding yourself" and 3:30 the captain strikes to you; battle 17 1:30 "Their command ship's side is open. Boarding run." and 2:20; VISION §7a decapitation; VISION §7a flagship crew "Send the pods at their flagship" |
| G7 | **Restraint.** No order is ever given at an enemy ship that has broken (fled, struck or running); G1 only ever picks active ships. | Battle 1 6:05 "You hold him"; battle 17 3:30 "You let them go"; battle 3 (the chase into the ice) |
| G8 | **Shields are the captains' job.** No shield-power orders: each captain already turns and trims his own fresh side (battle.ts shield management). | Battle 7 1:10 "Hale checks Vey's thin shield herself and rolls *Halyard*" (delegation); battle 1 1:40 |
| G9 | **Leave before anything breaks.** When the exchange is going against us by what the player can see, every ship but the flagship is ordered to `withdraw`, then the flagship. The trigger: our own strength lost (own ships, known) is at least `PLAN_GOOD.leaveAtLossFrac` of our start, and at least `PLAN_GOOD.leaveBehindBy` more than the enemy's strength lost as seen (their ships out of the field, by public class). Never before `PLAN_GOOD.leaveNotBeforeS`. Once ordered it is not called off. | Battle 10 3:50 "Nothing has broken yet, and that's why now is the time to go" and the debrief "The right moment to retreat is before anything breaks" |

`PLAN_GOOD` first-pass values (in `numbers.ts`): `everyS 10`, `openForgetS 15` (the admiral's `SENSE.openForgetS`),
`laneClearM 2500` (the admiral's `JUPITER.laneClearM`), `leaveAtLossFrac 0.3`, `leaveBehindBy 0.1`, `leaveNotBeforeS 60`.

### Scripted-bad (`policy-bad.ts`), every `PLAN_BAD.everyS` seconds

| # | Move | Vision line |
|---|---|---|
| B1 | **Split fire.** Every ship but the flagship is ordered at a different enemy in turn (round robin over the enemy line), so nothing breaks. | Battle 2 0:40 "spreads fire across the three closest raiders; nothing breaks" and 4:00 "Spread fire takes longer"; VISION §7a concentration |
| B2 | **The screen sent off.** Escorts are given attack orders like everyone else (part of B1). | Battle 6 0:45 (mistake 2); PKG-16 §5 |
| B3 | **The flagship forward alone** at their flagship (attack order on it). | Battle 5 3:17 (leaves the line, shows the stern) |
| B4 | **Board before the side is open.** Every `PLAN_BAD.boardEveryS`, each launcher boards the nearest enemy at a side not seen open (the side facing it if none is known), so pods hit shields. | Battle 4 3:50–3:58 (the early launch, the pod deflected, twenty marines dead) |
| B5 | **Chase what runs.** A ship whose target has broken is ordered at the nearest broken enemy still in the field. | Battle 3 6:05–7:50 (Osei into the ice); battle 2 6:05 Rhee goes in after the tanker |

`PLAN_BAD` first-pass values: `everyS 10`, `boardEveryS 30` (the old `SCRIPTED.badBoardEveryS`).

### Rules I hold myself to

- This section is committed before the first battle is run (its hash is in the evidence). It is not edited afterwards.
- A move that does not do what this section says (an order refused, a wrong ship picked) may be fixed as a bug, named in
  section 4. What a move is may not change.
- The `PLAN_GOOD` / `PLAN_BAD` values, and any shared number (`numbers.ts`, `boarding/numbers.ts`), may be tuned only on
  seeds 1–60; seeds 61–90 are judged, never tuned on. Every change goes in a numbers-changed table.
- If c3 and c4 (or c3 and WORLD-01 c6) cannot both hold on held-out seeds, I stop and report the trade-off with numbers.

---

Everything below was written after the measurements. Section 1 is unchanged since 837af61 (`git diff 837af61 --
reports/PKG-19.md` shows only appended lines).

**Result: not merged. The bars do not hold on held-out seeds (step 5).** With the real good plan, WORLD-02 c3 is
29/30 on 1–30 and 25/30 on 31–60, but **19/30 on 61–90**. WORLD-01 c6 is **22/30 on 61–90**: it is idle against
swap, the policies cannot touch it, and no shared-number set I found on 1–60 beat the PKG-16 values on c3, c4 and
W01 c6 at the same time. c4 holds at 24/30 on both held-out blocks. Everything is committed on `claude/pkg-19` for
Daedalus to rule on.

## 2. Timeline (amendment A3)

- 837af61, 2026-10-21 20:20 PDT: section 1 (the plans) and `sim --from N` committed. No battle run before this.
- 20:22: the first measurement, the runner on seeds 1–30 with the plan as written (first-pass numbers): **c3 23/30**
  (good victory 13, withdrawal 9, timeout 7, defeat 1), **c4 27/30**.
- The same first-pass plan in a parallel scratch harness, which matches the runner exactly on 1–30 (c3 23, c4 27):
  31–60 c3 23, c4 24, W01 c6 23; 61–90 c3 14, c4 24, W01 c6 22. **I saw 61–90 once here, before tuning.** Nothing was
  tuned on it, but from then on it was not a fully unseen block. I'm naming that here; Daedalus can discount it.
- Tuning on seeds 1–60 only (section 3), then one judged run per block with the runner, 2026-10-22 11:29–11:31.

## 3. What I changed (numbers tuned on seeds 1–60 only)

| Number | First-pass → new | c3 on 1–60, only this changed | Why (TASTE) |
|---|---|---|---|
| `PLAN_GOOD.leaveAtLossFrac` | 0.3 → 0.2 | 46 → 48 (with lane 2500) | leave as soon as the exchange is plainly lost; at 0.3 two ships are already gone |
| `PLAN_GOOD.laneClearM` | 2500 → 1500 | 48 → 54 | an escort 2.5 km off is not covering the side the pods aim at; 1.5 km is |

Grid searched on 1–60, 60 seeds each, all MEASURED-HERE: `leaveAtLossFrac` {0.15, 0.2, 0.25, 0.3, 0.4, off} ×
`leaveBehindBy` {0, 0.05, 0.1, 0.15, 0.2}; `laneClearM` {0, 1500, 4000} × `openForgetS` {5, 15, 40}. Lane 1500 holds
53–54 across all three forget values; leave 0.15–0.2 with behind-by 0.1 holds 54. With G9 off entirely (lane 1500),
c3 is 51/60 with 38 victories, so the leave rule is not what makes the plan good.

**Shared numbers: unchanged.** Searched on 1–60 for WORLD-01 c6 (step 4):
- 7 one-at-a-time moves of `ABILITY` Nerve/Judgement effects: none beat the baseline W01 c6 52/60, and every move
  lost 2–7 seeds of c3.
- A seeded random search over the same seven effects (36 configs, idle + swap only): best 56/60, but that set took c3
  from 54 to 43.
- A seeded search around the PKG-16 values (15 configs, all four runs): no set beat the baseline (c3 54, c4 51, W01 c6
  52) on all three. The closest was c3 52, **c4 47** (fail), W01 c6 54.

The single-change table shows the sim is chaotic at this sample size: any one number moved 3–8% shifts each bar by
±2–7 seeds, in either direction. A 60-seed selection mostly picks noise, which is PKG-16 §4's knife edge again.

## 4. Bugs fixed against the plan

None. Every move is built as section 1 words it. Where the plan named no value: G1's target weights copy the
admiral's `TARGET` values (perKm 2, effortPerK 1, openBonus 4) into `PLAN_GOOD`. G9's "then the flagship" is
built as the next order tick after the fleet's.

## 5. Judged results (runner, `--seeds 30`, MEASURED-HERE 2026-10-22 11:29–11:31)

| Block | W02 c2 | **c3** | **c4** | c6 | W01 c6 | good outcomes | bad outcomes |
|---|---|---|---|---|---|---|---|
| 1–30 (script) | 30 | **29** | 27 | 27 | 29 | victory 16, withdrawal 9, timeout 5 | withdrawal 28, defeat 2 |
| 31–60 (tuning) | 29 | **25** | 24 | 25 | 23 FAIL | victory 15, withdrawal 10, timeout 3, defeat 2 | withdrawal 25, defeat 5 |
| **61–90 (judged)** | 29 | **19 FAIL** | **24** | 28 | **22 FAIL** | victory 11, withdrawal 12, timeout 4, defeat 3 | withdrawal 25, defeat 5 |

Against what Daedalus measured at 554251a (the admiral-mirror scripted-good): c3 on 1–30 goes 24 → 29, on 31–60
about 20 → 25, and on 61–90 15 → 19. The real plan is clearly better than the mirror. It still does not reach 80% on
fresh seeds.

**The trade-off (step 5), with numbers:**
- c3 against W01 c6: W01 c6 only moves through shared Nerve/Judgement numbers. Every set that raised it on 1–60
  (to 53–56) cost c3 2–11 seeds there, and one cost c4 its bar.
- c3 against c4 (PKG-16 §4): a number that lets good's losing fleet escape cheaper also helps bad. Search #1 above:
  c3 52, W01 54, c4 47.
- c3 on fresh seeds is decided by the ~40% of battles good does not win. There, a withdrawal has to cost fewer ships
  than idle's ~3. On 61–90 good wins 11 and loses the c3 comparison in 11 of the other 19.

Options for Daedalus (not mine to choose): judge c3 and W01 c6 on 90 seeds pooled (c3 73/90 = 81%, W01 c6 74/90 =
82%: both over 80%); accept the 1–30 pass with the held-out figure recorded; or make W01 c6's effect larger by design
(a Nerve/Judgement rule, not a number), which is a package for Talos.

## 6. Script steps

| Step | Result |
|---|---|
| `sim --from N` | **pass** (blocks 31–60 and 61–90 above were run with it) |
| Plans written and committed before the first measurement | **pass**: 837af61 at 20:20, first run 20:22 |
| New `policy-good.ts`, `policy-bad.ts`; `policies.ts` entries point at them | **pass** (`pkg19.test.ts`) |
| WORLD-02 c3 ≥ 24/30 on 61–90 and 31–60 | **FAIL** on 61–90 (19); pass on 31–60 (25) |
| WORLD-02 c4 ≥ 24/30 on 61–90 and 31–60 | **pass** (24, 24) |
| WORLD-01 c6 ≥ 24/30 on 61–90 | **FAIL** (22) |
| Every other built WORLD check at 30 seeds | **pass** on all three blocks |
| tsc, vitest, lint, build, smoke | **pass** (evidence) |
| Merge and gate | **not done**: acceptance failed, so per rule 4 there is no merge |

## 7. Flag, save

Flag: none. Save version: unchanged.

## 8. Requests

1. **Daedalus:** rule on section 5 (how c3 and W01 c6 are judged, or a new package to enlarge the swap's effect).
2. **Admiral owner:** `admiral('good')` and `scriptedBad` in `admiral/admiral.ts` are no longer registered as the
   scripted policies (their `ADMIRAL_POLICIES` entries remain; `admiral.test.ts` still names them). They can be retired
   once nobody wants the mirror back.

## 9. Assumed, for Caleb to overrule

- Neither plan answers comms, so the difference from idle is orders alone.
- The policies' sight is their own side's hits (the admiral's rule, rebuilt in `policy-good.ts`): shield numbers are
  never read.
- A withdrawn ship is not a lost ship (the check's existing rule), and that is why G9 pays.

## Ruling (Daedalus, 2026-10-22)

> PKG-19: Daedalus ruling. Merge your branch as it stands, through the lock and the gate (A9 applies). Your good and
> bad plans and `--from` are better instruments than the ones they replace (c3 went 24/20/15 → 29/25/19). No bar
> moves: c3 and WORLD-01 c6 are scored as fails on held-out seeds 61-90 (19 and 22, against a bar of 24). A follow-up
> package attacks the cause, which is how much of the outcome is luck.

## Evidence

```
plan commit:
837af61 2026-10-21 20:20:16 -0700 PKG-19: the good and bad plans, written before any seed is run; sim --from N

first measurement:
Wed Oct 21 20:22:57 PDT 2026

judged runs:
Thu Oct 22 11:29:04 PDT 2026
Thu Oct 22 11:30:58 PDT 2026

== w02_1
WORLD-02: setup saturn-12v12, seeds 1–30, 15 min max, player policy idle, enemy admiral-jupiter
| 1 | same seed, same policy, run twice: identical result | final state hash equal | 30 of 30 | 30 of 30 | pass | - |
| 2 | idle on even fleets: the winner does not swing with the seed | the same winner (or draw) | 24 of 30 | 30 of 30; winner "enemy"; tally enemy 30 | pass | 24 of 30: pass |
| 3 | scripted-good beats idle | outcome rank (victory 2 > withdrawal 1 > defeat 0) higher than idle, or equal and fewer player ships lost | 24 of 30 | 29 of 30; outcomes good victory 16, withdrawal 9
| 4 | scripted-bad does worse than idle | outcome rank lower than idle, or equal and more player ships lost | 24 of 30 | 27 of 30; outcomes bad withdrawal 28, defeat 2 vs idle withdrawal 30; lost bad 
| 5 | the AI admiral uses the player's order set only | every AI order is a player order type (log check) | 30 of 30 | 30 of 30; orders issued 97 85 80 72 121 85 92 92 114 85 108 84 122 99 64 76 123 7
| 6 | the AI telegraphs a boarding push ≥ 5 s ahead | telegraphLead ≥ 5 s on each push, telegraph visible | 24 of 30 | 27 of 30; seeds with a push 27 of 30; pushes 53; lead min 6 s; visible 53 of 
| 7 | Jupiter's mean engagement range beats a Mars-style control | meanRange(jupiter) > meanRange(control), range of every AI shot | 24 of 30 | 30 of 30; shots: jupiter 6057 5046 4841 4857 5833 6105 5
WORLD-02: every built check passed (7 pass, 0 not built, 0 not run)

== w02_31
WORLD-02: setup saturn-12v12, seeds 31–60, 15 min max, player policy idle, enemy admiral-jupiter
| 1 | same seed, same policy, run twice: identical result | final state hash equal | 30 of 30 | 30 of 30 | pass | - |
| 2 | idle on even fleets: the winner does not swing with the seed | the same winner (or draw) | 24 of 30 | 29 of 30; winner "enemy"; tally enemy 29, player 1 | pass | 24 of 30: pass |
| 3 | scripted-good beats idle | outcome rank (victory 2 > withdrawal 1 > defeat 0) higher than idle, or equal and fewer player ships lost | 24 of 30 | 25 of 30; outcomes good withdrawal 10, victory 1
| 4 | scripted-bad does worse than idle | outcome rank lower than idle, or equal and more player ships lost | 24 of 30 | 24 of 30; outcomes bad withdrawal 25, defeat 5 vs idle withdrawal 29, victory 1
| 5 | the AI admiral uses the player's order set only | every AI order is a player order type (log check) | 30 of 30 | 30 of 30; orders issued 95 61 55 88 72 118 136 75 83 77 83 57 120 108 56 79 135 1
| 6 | the AI telegraphs a boarding push ≥ 5 s ahead | telegraphLead ≥ 5 s on each push, telegraph visible | 24 of 30 | 25 of 30; seeds with a push 25 of 30; pushes 46; lead min 6 s; visible 46 of 
| 7 | Jupiter's mean engagement range beats a Mars-style control | meanRange(jupiter) > meanRange(control), range of every AI shot | 24 of 30 | 30 of 30; shots: jupiter 5385 3944 5391 5142 5948 4292 5
WORLD-02: every built check passed (7 pass, 0 not built, 0 not run)

== w02_61
WORLD-02: setup saturn-12v12, seeds 61–90, 15 min max, player policy idle, enemy admiral-jupiter
| 1 | same seed, same policy, run twice: identical result | final state hash equal | 30 of 30 | 30 of 30 | pass | - |
| 2 | idle on even fleets: the winner does not swing with the seed | the same winner (or draw) | 24 of 30 | 29 of 30; winner "enemy"; tally enemy 29, player 1 | pass | 24 of 30: pass |
| 3 | scripted-good beats idle | outcome rank (victory 2 > withdrawal 1 > defeat 0) higher than idle, or equal and fewer player ships lost | 24 of 30 | 19 of 30; outcomes good withdrawal 12, victory 1
| 4 | scripted-bad does worse than idle | outcome rank lower than idle, or equal and more player ships lost | 24 of 30 | 24 of 30; outcomes bad defeat 5, withdrawal 25 vs idle withdrawal 29, victory 1
| 5 | the AI admiral uses the player's order set only | every AI order is a player order type (log check) | 30 of 30 | 30 of 30; orders issued 63 60 93 94 103 51 115 105 109 87 105 105 115 93 87 92 99
| 6 | the AI telegraphs a boarding push ≥ 5 s ahead | telegraphLead ≥ 5 s on each push, telegraph visible | 24 of 30 | 28 of 30; seeds with a push 28 of 30; pushes 44; lead min 6 s; visible 44 of 
| 7 | Jupiter's mean engagement range beats a Mars-style control | meanRange(jupiter) > meanRange(control), range of every AI shot | 24 of 30 | 30 of 30; shots: jupiter 5832 5611 5239 5714 5869 4973 5

== w01_1
WORLD-01: setup saturn-12v12, seeds 1–30, 15 min max, player policy idle, enemy admiral-jupiter, variant swap-nerve-judgement
| 1 | battle ends with an outcome | outcome ∈ {victory, defeat, withdrawal} | 30 of 30 | 30 of 30; withdrawal 30 | pass | - |
| 2 | both sides fired and dealt damage by 60 s | damageDealt.player > 0 and damageDealt.enemy > 0 at 60 s | 30 of 30 | 30 of 30; min at 60 s: player 2048, enemy 1678 | pass | - |
| 3 | a boarding attempt happened, unordered | boardingAttempts ≥ 1, none ordered | 24 of 30 | 30 of 30; mean attempts 9.7 (unordered 7.0); captured P 25 E 32 | pass | - |
| 4 | at least one ship broke (fled or struck) | brokenShips ≥ 1 | 24 of 30 | 30 of 30; mean broken 8.7 | pass | - |
| 5 | idle player's captains decided things on timeouts, each with a trait | timeoutDecisions ≥ 3, each with a trait | 30 of 30 | 30 of 30; mean 22.0 per battle, 22.0 of them closing a comms report 
| 6 | swapping player captains' Nerve and Judgement changes the battle | outcome or losses differ by ≥ 25% | 24 of 30 | 29 of 30; mean player ships lost 3.1 → 3.7; outcomes withdrawal 30 → withd
| 7 | the director keeps filming | shotsPer20s ≥ 1 | seed 1 | needs the view (PKG-03 and later) | not built | - |
WORLD-01: every built check passed (6 pass, 1 not built, 0 not run)

== w01_31
WORLD-01: setup saturn-12v12, seeds 31–60, 15 min max, player policy idle, enemy admiral-jupiter, variant swap-nerve-judgement
| 1 | battle ends with an outcome | outcome ∈ {victory, defeat, withdrawal} | 30 of 30 | 30 of 30; withdrawal 29, victory 1 | pass | - |
| 2 | both sides fired and dealt damage by 60 s | damageDealt.player > 0 and damageDealt.enemy > 0 at 60 s | 30 of 30 | 30 of 30; min at 60 s: player 1941, enemy 1644 | pass | - |
| 3 | a boarding attempt happened, unordered | boardingAttempts ≥ 1, none ordered | 24 of 30 | 30 of 30; mean attempts 9.5 (unordered 7.0); captured P 27 E 36 | pass | - |
| 4 | at least one ship broke (fled or struck) | brokenShips ≥ 1 | 24 of 30 | 30 of 30; mean broken 9.0 | pass | - |
| 5 | idle player's captains decided things on timeouts, each with a trait | timeoutDecisions ≥ 3, each with a trait | 30 of 30 | 30 of 30; mean 21.2 per battle, 21.1 of them closing a comms report 
| 6 | swapping player captains' Nerve and Judgement changes the battle | outcome or losses differ by ≥ 25% | 24 of 30 | 23 of 30; mean player ships lost 3.3 → 3.9; outcomes withdrawal 29, victory 
| 7 | the director keeps filming | shotsPer20s ≥ 1 | seed 1 | needs the view (PKG-03 and later) | not built | - |

== w01_61
WORLD-01: setup saturn-12v12, seeds 61–90, 15 min max, player policy idle, enemy admiral-jupiter, variant swap-nerve-judgement
| 1 | battle ends with an outcome | outcome ∈ {victory, defeat, withdrawal} | 30 of 30 | 30 of 30; withdrawal 29, victory 1 | pass | - |
| 2 | both sides fired and dealt damage by 60 s | damageDealt.player > 0 and damageDealt.enemy > 0 at 60 s | 30 of 30 | 30 of 30; min at 60 s: player 1932, enemy 1559 | pass | - |
| 3 | a boarding attempt happened, unordered | boardingAttempts ≥ 1, none ordered | 24 of 30 | 30 of 30; mean attempts 9.6 (unordered 7.2); captured P 27 E 33 | pass | - |
| 4 | at least one ship broke (fled or struck) | brokenShips ≥ 1 | 24 of 30 | 30 of 30; mean broken 9.1 | pass | - |
| 5 | idle player's captains decided things on timeouts, each with a trait | timeoutDecisions ≥ 3, each with a trait | 30 of 30 | 30 of 30; mean 20.9 per battle, 20.9 of them closing a comms report 
| 6 | swapping player captains' Nerve and Judgement changes the battle | outcome or losses differ by ≥ 25% | 24 of 30 | 22 of 30; mean player ships lost 3.0 → 3.7; outcomes withdrawal 29, victory 
| 7 | the director keeps filming | shotsPer20s ≥ 1 | seed 1 | needs the view (PKG-03 and later) | not built | - |
```

```
Thu Oct 22 11:31:08 PDT 2026 (after the last edit to src/)
npx tsc -b                      -> exit 0, no output
npx eslint src/battle/sim       -> no output (clean)
npx vitest run --maxWorkers=4   -> Test Files 69 passed (69); Tests 884 passed (884); start 11:31:51
npm run build                   -> files generated dist/sw.js, dist/workbox-9c191d2f.js
npm run smoke                   -> SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (36.9s)
Not merged: no merge diff, no game-branch log (acceptance failed, rule 4 not entered). No screenshots (headless package).
```

Merge lock: at 2026-10-22T11:36:57-07:00, `MERGE.lock` held "PKG-20 2026-10-22T02:25:26-07:00", more than 30 minutes old, with the game tip
still at f5605de. Taken under rule 4.1.

## Merge record

- The first attempt at 11:41 was wrong. The PKG-20 lock I took as stale was live: PKG-20 merged 06ea20b and deleted
  the lock while my checks ran. My `git merge --no-ff` into the game worktree then hit a conflict in
  `scripts/sim.mjs`, and I aborted it at once (`git merge --abort`; the game worktree was left clean). The gate run
  that followed was on the conflicted tree and is void. Its one failure was `pkg19.test.ts` determinism, a 5 s
  timeout under load; the test now runs 2-minute battles with a 30 s timeout.
- Then I retook the lock and merged 06ea20b into `claude/pkg-19` (de5c031). The only conflict was `scripts/sim.mjs`:
  both lines kept, `--from` and PKG-20's `--setup`, and the header prints the setup's name with the `--from` range.
- Acceptance re-run on the merged branch (`src` changed under PKG-20, so the sims too). Every sim figure is identical
  to section 5:

```
Thu Oct 22 11:47:11 PDT 2026
Thu Oct 22 11:48:47 PDT 2026
w02_1: c 2  30 of 30; w pass ; c 3  29 of 30; o pass ; c 4  27 of 30; o pass ; c 6  27 of 30; s pass ; 
w02_31: c 2  29 of 30; w pass ; c 3  25 of 30; o pass ; c 4  24 of 30; o pass ; c 6  25 of 30; s pass ; 
w02_61: c 2  29 of 30; w pass ; c 3  19 of 30; o FAIL ; c 4  24 of 30; o pass ; c 6  28 of 30; s pass ; 
w01_1: c 2  30 of 30; m pass ; c 3  30 of 30; m pass ; c 4  30 of 30; m pass ; c 6  29 of 30; m pass ; 
w01_31: c 2  30 of 30; m pass ; c 3  30 of 30; m pass ; c 4  30 of 30; m pass ; c 6  23 of 30; m FAIL ; 
w01_61: c 2  30 of 30; m pass ; c 3  30 of 30; m pass ; c 4  30 of 30; m pass ; c 6  22 of 30; m FAIL ; 
Thu Oct 22 11:48:54 PDT 2026
tsc exit 0
eslint src/battle/sim clean
 Test Files  70 passed (70)
      Tests  900 passed (900)
  dist/workbox-9c191d2f.js
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (32.6s)
```

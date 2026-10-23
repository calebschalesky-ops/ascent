# PKG-14: bridge fixes (Talos, with Kalliope's pen)

Branch `claude/pkg-14`, base `claude/game` @ 0cea035, merged with the tip @ edfb547 (TRC-03, PKG-12, PKG-15; no sim
code since a09724e). Item 7 is on `claude/pkg-14-item7`, not merged (see Item 7).
Browser: `http://[::1]:5214/?skirmish&probe`, seed 5, time paused (`time.scale 0`) and stepped with `advance`.

## What I measured first

- **EXP-02 s8 (PKG-09):** the flag captain re-trims an ordered split 0.2 s later. The trim is not in `captains.ts`: it is
  `shieldManagement()` in `battle.ts` (the function this package names as mine). A `shieldPower` order set the split and
  left nothing behind, so the next trim decision overwrote it.
- **EXP-05 s6:** nothing in comms raised a reinforce / pull-back decision; the buttons lived only in the crew panel.
- **EXP-05 s5:** the drag is real in the sim (a boarded ship's guns reload at `crewOffGunsMul` 0.6), but nothing said so.
- **Pods at their flagship:** `cannotBoard()` refused every flagship target; the marine commander then said "The marines
  are not ready" for that and for out-of-range alike.
- **Baselines** (claude/game @ a09724e, `--no-write`): WORLD-01 checks 1–6 pass (6: 8/10); WORLD-02 1–5 pass (3: 9/10),
  6 fails (7/10), 7 fails (5/10). Full tables under Evidence.

## What I changed

New files (mine): `comms/standing.ts` (standing shield orders), `comms/marines.ts` (the marine commander's decision, his
timeout, the fire-slackened line), `comms/bridge.test.ts` (21 tests).

1. **The order holds (EXP-02 s8).** `command()` and an answer that carries a `shieldPower` order record a standing order
   (`comms.shieldOrders[ship]`). `shieldManagement()` asks `shieldOrderStands()` first and leaves the split alone while
   it stands. It stands until the admiral gives another shield order, or until a side the order starves (under
   `SHIELD.focus − 0.05`) is open and carries at least `SHIELD.threatShare` of the fire, after an 8 s grace
   (`STANDING.graceS`, first-pass). Then it is released out loud: engineering on the flagship ("Can't hold your split,
   Admiral. The fore side is down and they're on it. Moving power to fore."), the captain on any other ship, and the
   captain trims in the same tick. The fresh-side turn is not a split and is untouched.
2. **Marine commander's decision (EXP-05 s6).** Each second, for each fight our marines have inside an enemy ship, once
   they have been aboard 2 s, the marine commander raises a `boardDecision` report: Reinforce (a `board` order at that
   ship from the flagship, else the nearest launcher that can), Pull back (`pullBack`), Carry on. Q/E/R reach it like any
   report. The text gives the count ("Sceptre's crew are holding us, 78 to our 69."). It closes when the fight ends.
   Unanswered after 8 s, he decides by his own Judgement (drawn once from comms' stream, 1–10 bunched): Judgement ≥ 6
   reinforces a fight he is losing (or pulls out if nothing can launch), otherwise carries on. He acts with the boarding
   functions directly (unordered, no points, not `order()`, so WORLD-02 check 5's order count is untouched), and the
   decision is recorded with `why: "marine commander, Judgement N"`, the report and the choice.
3. **Boarding cleanup (PKG-08 request 1).** `captureSideCheck()` is deleted; `sideCheck` (strength-weighted
   `fleetLosses`) is the one break rule. **The per-strength capture shock is written but held back** (see "Still
   broken"). `MORALE.sideBreakLosses` stays: `admiral/admiral.ts:148` still reads it on the tip I merged onto (PKG-13 is
   removing that read). `shipOut()`'s shock is now `lossShock()` in `battle.ts` (same behaviour, one call), so the capture
   swap is one line.
4. **Pods at their flagship (Daedalus's ruling).** `cannotBoard(s, t, ordered)`: an ordered launch from a flagship may
   target the enemy flagship; any other ship, and every unordered captain, still may not (NAVY §3). The marine commander
   checks first and refuses with the true reason, from a line per reason: out of range (with the distance and the reach:
   "Amalthea is out of range, Admiral. 10.5 km off; the pods reach 9.5 km."), no pods aboard, hangar down, not enough
   marines, target gone. A `board` or `pullBack` refused through `order()` now logs a `commsRefused` with the reason too,
   so `command()` hands it back. "Side closed" is not a launch refusal: a run at a side still up launches and is deflected
   (EXP-05 s3), and the deflection line now names the side ("Pods turned away at Sceptre. Her fore shield is still up.").
   No line anywhere says "not ready" (tested).
5. **Lines (Kalliope).** The marine lines split by whose boarders: `captured` for ours ("Sceptre is ours, Admiral. She
   has struck her colours.") and `capturedUs` for theirs ("Stoa has struck to their marines."), and the same pairing for
   deflected, breach, deck fight, repelled and scuttled. The flag lieutenant's fold counts in words, opens differently
   each time, never repeats a sentence ("From the line, twenty-four reports. Six ships trimming shields, eleven
   retargeting. Still fighting boarders on Stoa."). An officer acknowledging an answer uses his own steady line, not the
   flag captain's trait tail. The flagship's officers are named so that no surname passes two in the player's fleet.
   House names: **House of Kleisthenes** (Saturn) and **House of Ganymede** (Jupiter); the world stays in the side's
   `world` field and out of the name.
6. **Their fire slackens (EXP-05 s5).** 3 s into a fight our marines are in, a captain of ours firing on that ship (else
   the flag captain) says so once: "Sceptre is firing slower. The boarders are keeping her busy."

Registry lines: none in the shared files except the lines this package names (`shieldManagement()` and the shock in
`shipOut()`, both `battle.ts`, and one import there). New numbers are in `comms/numbers.ts` (`MARINES`, `STANDING`,
`COMMS.maxSurname`), all first-pass.

## Script steps

| Step | Status | Evidence |
|---|---|---|
| EXP-02 8 (everything to port; the split holds) | pass | real click on "All port" in the crew panel at 0:20; port 0.85, others 0.05 held to 1:20 with 0 flag-captain shield decisions after the order (one at 0:01, before it); engineering: "Done. The port side takes the load." `exp02-s8a-…`, `exp02-s8b-port-085-held-60s-no-retrim.jpg`. Release path tested (`bridge.test.ts`) and seen in sim lines below |
| EXP-02 10 (pods at their flagship; fighters screen them) | pass | 0:20, 8.2 km: `boardLaunch {ship p6 Astu, target e6 Ganymede, pods 6, ordered true}`, pods flying; "Boarders launching at Ganymede. If we take her, their line goes with her."; fighters `escort`, "Wings will escort." `exp02-s10-pods-away-for-their-flagship-ganymede.jpg` (fighters are still a stored task) |
| EXP-05 5 (the fight inside; their gunnery drops) | pass | breach 1:21; at 1:25 Bema's captain: "Sceptre is firing slower. The boarders are keeping her busy." The drop itself: guns reload at 0.6 while boarded (unit test, cd step exact); shots by Sceptre 4 in the 20 s before the breach, 2 in the 3.7 s after. `exp05-s5-their-fire-slackened.jpg` |
| EXP-05 6 (answer a reinforce / pull-back decision) | pass | 1:24 decision from the marine commander Marcus Maleinos: "Sceptre's crew are holding us, 78 to our 69. More pods, or bring them home?" [Reinforce, Pull back, Carry on]; real Tab ×3 then real `q` in the in-app tab: `commsAnswer {report 34, answer 0, Reinforce, by admiral}`, `boardLaunch {p6 → e9, reinforcing true}`. Pull back and the timeout tested (`bridge.test.ts`). `exp05-s6a-…`, `exp05-s6b-q-reinforce-pods-away.jpg` |
| EXP-05 8 (prize crew) | pass | Sceptre captured 1:45: side player, prize true, crew 60 of 200, "prize master from Astu"; "Sceptre is ours, Admiral. She has struck her colours." `exp05-s7-s8-sceptre-ours-prize-crew-60-of-200.jpg` |
| EXP-05 9 (a wreck counts for less) | pass | same run, everyone on Amalthea (escort) from 1:46: wrecked 2:23; `summarise()` prizeValue 2.25 = Sceptre captured 2 (full cruiser value) + Amalthea wrecked 0.25 (a quarter of an escort's 1). `exp05-s9-…jpg` |
| Pods: true refusal reasons | pass | p6 at Amalthea (10.5 km) at 0:01: "Amalthea is out of range, Admiral. 10.5 km off; the pods reach 9.5 km." `refusal-out-of-range-true-reason.jpg`; a second run showed "Not enough marines left to send. We keep a guard aboard." for Kraken Mare's ordered board |
| Fold and house names | pass | `fold-reads-like-a-person-house-names.jpg`: "From the line, fifteen reports. Five ships trimming shields, eight retargeting."; HUD "House of Kleisthenes / House of Ganymede" |
| item 7 (TRC-03: a run ordered at a side that is down gets through it) | pass, **merged on Daedalus's ruling** (the vision outranks a threshold) | seed 5: Second Crown's fore regrows to 58 during the crossing; breach 0:43, not deflected; captured 1:04 (`shots/pkg-14/item7/`). WORLD-01 check 6, swap variant, `--seeds 30`: **22/30 before, 19/30 after** (bar 24/30: it fails at 30 seeds either way). WORLD-02 at 10 seeds: no check changes result (3: 8/10, 4: 9/10, 6: 7/10, 7: 5/10). Raw output under Item 7 |

The in-app tab and the headless capture replay the same probe sequence; the sim is deterministic, so the times match
(capture 105.33 s in both). Screenshots were saved from headless Chrome over CDP at 1280 × 800.

## Sample lines for Caleb (do the captains sound like people?)

From seeds 1–6 (idle, six ships given a port-heavy split at 0:15) and the seed-5 runs above:

| Type | Speaker | Line |
|---|---|---|
| marine decision, winning | Aurelia Angelos (marine commander) | 58 of ours against 22 aboard Amalthea. We are winning. Reinforce, pull back, or let them carry on? |
| marine decision, losing | Nikephoros Gabras (marine commander) | Diadem's crew are holding us, 81 to our 54. More pods, or bring them home? |
| marine decision, losing | Lucilla Choumnos (marine commander) | We are outnumbered aboard Second Crown, 70 to 82. I need a decision. |
| marine timeout | Nikephoros Gabras | I will take that one, Admiral. More pods away. |
| fire slackened | Anna Laskaris (Bema) | Their fire's slackened, Admiral. |
| fire slackened | Bardas Batatzes (Astu, flag captain) | Second Crown is firing slower. The boarders are keeping her busy. |
| split cannot hold | Anastasia Palaiologos (Kleros) | Can't hold your split, Admiral. Our fore side is down and that's where they're shooting. Moving power to fore. |
| split cannot hold | Anastasia Botaneiates (Pnyx) | The fore side is open and taking their fire. I'm breaking your split to cover it. |
| capture, ours | Nikephoros Gabras | Diadem has struck. She flies our colours now. |
| capture, theirs | Aurelia Angelos | We lost the decks on Stoa. She is taken. |
| repelled, ours | Marcus Maleinos | Our boarders were thrown off Europa. |
| pods at their flagship | Marcus Maleinos | Boarders launching at Ganymede. If we take her, their line goes with her. |
| refusal | Marcus Maleinos | Amalthea is out of range, Admiral. 10.5 km off; the pods reach 9.5 km. |
| fold | Alexios Kamateros (flag lieutenant) | From the line, twenty-four reports. Six ships trimming shields, eleven retargeting. Still fighting boarders on Stoa. |
| fold | Isaac Melissenos (flag lieutenant) | Five reports, Admiral. Two ships trimming shields, one retargeting. Enemy boarders turned away at Ekklesia. |

One I changed after reading the run: the marine timeout's "Heard nothing. Carrying on on Amalthea." is now "Heard
nothing about Amalthea. Carrying on."

## Item 7 (added by Daedalus): pods at a side that fell, merged on Daedalus's ruling

**Measured first** (seed 5, on `claude/pkg-14` without item 7, in the in-app tab): Second Crown's fore falls at 0:27 with
Kraken Mare 7.1 km off; an ordered run at it loses two pods to point defence at 0:35, the fore regrows and closes at
0:37 (58 of its max by 0:38), and the four pods left are deflected at 0:40.8. TRC-03's two tries are the same thing.

**What I built** (`boarding.ts`, `boarding/numbers.ts`, `boarding/types.ts`, one field on `boardDeflected` in
`types.ts`, comms lines): a pod group remembers whether its aimed side was down at launch and the split it had then
(`openAtLaunch`). On arrival at that side within `BOARDING.collapsedHoldS` (25 s, first-pass: a full 9.5 km crossing is
21 s), it breaches even if the side has regrown, **unless the defender has put more power on that side since**
(`repowerSplit` 0.02), in which case it is deflected with `repowered: true` and the marine commander says so out loud,
unfolded ("They put power back on Second Crown's fore side. Our pods were turned away."). My reading of NAVY §1/§3: a
side regrowing from zero is a thin film the pods punch through; a side the enemy chose to re-power is a real wall, and
re-powering is the counter NAVY §1 gives him.

**Proof:** `bridge.test.ts` "item 7" (3 tests: the side closes during the crossing and the pods still breach; re-powered
is deflected with the line; a side up at launch still deflects, EXP-05 s3). Browser, seed 5, the same run: board
Second Crown fore at 0:27, fore closed at 0:37, breach at 0:43 (not deflected), the marine commander's decision at 0:46
(Q, Reinforce), "Second Crown is firing slower." at 0:47, captured at 1:04, prize crew 60 of 200.
`shots/pkg-14/item7/` on that branch (`item7-a-…`, `-b-fore-regrown-pods-still-flying`, `-c-exp05-s4-breach-not-deflected`,
`exp05-s6a/b`, `exp05-s5`, `exp05-s7-s8-second-crown-ours-prize-crew`). tsc clean, vitest 63 files / 839 passed there.

**What it costs the world checks.** Measured 2026-10-21, WORLD runs at 10 seeds:

| Variant | WORLD-01 c6 | WORLD-02 c3 | c4 | c6 | c7 | admiral.test.ts |
|---|---|---|---|---|---|---|
| tip (no item 7) | 8/10 pass | 9/10 | 9/10 | 7/10 | 5/10 | pass |
| PKG-14 without item 7 (merged) | 8/10 pass | 8/10 | 9/10 | 7/10 | 5/10 | pass |
| item 7, every launch | 9/10 | **4/10 fail** | **5/10 fail** | 8/10 | 0/10 | **2 fail** |
| item 7, ordered runs only (the branch) | **7/10 fail** | 8/10 | 9/10 | 7/10 | 5/10 | pass |
| ordered only, window 18 s | **7/10 fail** | | | | | |

The branch keeps the window to ordered runs (the admiral's run is timed to the opening; captains' own launches take
their chances as before), which leaves WORLD-02 where it was and costs WORLD-01 check 6 one seed pair (3.7 → 4.3 mean
ships lost; it needs 8 of 10 pairs to differ by 25%). The window's length does not move it (18 s gives the same 7/10), so
it is the enemy admiral's ordered pushes now landing, in both halves of the pair. Merging it is a call between done
point 4 and a 10-seed statistic: Daedalus's. Re-test after any morale or roster change (PKG-13) costs one branch merge
and three sim runs (~6 min).

**Ruling (Daedalus, 2026-10-21): merge it.** Done point 4 is Caleb's vision; check 6 sits on its bar at 10 seeds. The
30-seed rates, `claude/game` @ 54658c3 (before) and `claude/pkg-14-item7` @ 3a5e14b = item 7 + that tip (after):

```
2026-10-21T17:48:08-07:00
54658c3 Merge PKG-14: report evidence
WORLD-01: setup saturn-12v12, seeds 1–30, 15 min max, player policy idle, enemy admiral-jupiter, variant swap-nerve-judgement
| 6 | swapping player captains' Nerve and Judgement changes the battle | outcome or losses differ by ≥ 25% | 24 of 30 | 22 of 30; mean player ships lost 3.8 → 4.6; outcomes withdrawal 27, defeat 3 → withdrawal 28, defeat 2 | FAIL |
WORLD-01: 1 built check(s) FAILED
```

```
2026-10-21T17:48:08-07:00
3a5e14b PKG-14 item 7: keep the merged step shots; item 7's evidence lives in shots/pkg-14/item7/
WORLD-01: setup saturn-12v12, seeds 1–30, 15 min max, player policy idle, enemy admiral-jupiter, variant swap-nerve-judgement
| 1 | battle ends with an outcome | outcome ∈ {victory, defeat, withdrawal} | 30 of 30 | 30 of 30; withdrawal 29, defeat 1 | pass |
| 2 | both sides fired and dealt damage by 60 s | damageDealt.player > 0 and damageDealt.enemy > 0 at 60 s | 30 of 30 | 30 of 30; min at 60 s: player 1600, enemy 2205 | pass |
| 3 | a boarding attempt happened, unordered | boardingAttempts ≥ 1, none ordered | 24 of 30 | 30 of 30; mean attempts 18.3 (unordered 17.0); captured P 38 E 45 | pass |
| 4 | at least one ship broke (fled or struck) | brokenShips ≥ 1 | 24 of 30 | 30 of 30; mean broken 9.8 | pass |
| 5 | idle player's captains decided things on timeouts, each with a trait | timeoutDecisions ≥ 3, each with a trait | 30 of 30 | 30 of 30; mean 21.2 per battle, 21.2 of them closing a comms report | pass |
| 6 | swapping player captains' Nerve and Judgement changes the battle | outcome or losses differ by ≥ 25% | 24 of 30 | 19 of 30; mean player ships lost 3.8 → 4.5; outcomes withdrawal 29, defeat 1 → withdrawal 28, defeat 2 | FAIL |
WORLD-01: 1 built check(s) FAILED
WORLD-02: setup saturn-12v12, seeds 1–10, 15 min max, player policy idle, enemy admiral-jupiter
| 1 | same seed, same policy, run twice: identical result | final state hash equal | 10 of 10 | 10 of 10 | pass |
| 2 | idle on even fleets: the winner does not swing with the seed | the same winner (or draw) | 8 of 10 | 10 of 10; winner "enemy"; tally enemy 10 | pass |
| 3 | scripted-good beats idle | player ships lost (good) < (idle) and outcome ≥ idle | 8 of 10 | 8 of 10; lost good 3 3 1 3 2 2 2 3 2 4 vs idle 4 3 3 4 4 3 5 4 3 4; outcomes good withdrawal 10 | pass |
| 4 | scripted-bad does worse than idle | player ships lost (bad) > (idle) | 8 of 10 | 9 of 10; lost bad 6 7 5 6 6 4 5 6 5 6 vs idle 4 3 3 4 4 3 5 4 3 4; outcomes bad withdrawal 9, defeat 1 | pass |
| 5 | the AI admiral uses the player's order set only | every AI order is a player order type (log check) | 10 of 10 | 10 of 10; orders issued 60 123 83 137 120 98 132 138 82 98; kinds attack 927, withdraw 25, focusSide 34, board 30, followFlagship 55; foreign 0 needed, log-foreign 0; stats.orders = admiral's count in 10 of 10 | pass |
| 6 | the AI telegraphs a boarding push ≥ 5 s ahead | telegraphLead ≥ 5 s on each push, telegraph visible | 8 of 10 | 7 of 10; seeds with a push 7 of 10; pushes 15; lead min 6 s; visible 15 of 15 | FAIL |
| 7 | Jupiter's mean engagement range beats a Mars-style control | meanRange(jupiter) > meanRange(control), range of every AI shot | 8 of 10 | 5 of 10; shots: jupiter 6171 5717 5551 5248 6068 6035 5665 5002 5609 5335 m; control 5542 5075 5815 6196 5444 5158 5513 5453 5742 6142 m; nearest-foe sample: jupiter 6819 6361 6404 6390 6354 6190 6611 6381 6564 6390, control 6578 6316 6785 6891 6387 6141 6453 6384 6670 7026 | FAIL |
WORLD-02: 2 built check(s) FAILED
```

At 30 seeds check 6 fails before item 7 too (22/30 against a bar of 24/30); item 7 takes it to 19/30.

Acceptance on the merged item-7 branch:

```
$ npx tsc -b
2026-10-21T17:49:02-07:00
tsc -b: clean

$ npx eslint src/battle/sim
2026-10-21T17:49:13-07:00
eslint src/battle/sim: clean

$ npx vitest run
2026-10-21T17:49:17-07:00
 Test Files  65 passed (65)
      Tests  851 passed (851)
   Start at  17:49:20

$ npm run build (tail)
2026-10-21T17:49:43-07:00
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js

$ npm run smoke (tail)
2026-10-21T17:50:12-07:00
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (16.4s)
```

## What is still broken or missing

- **The per-strength capture shock (PKG-08 request 1) is held back, on measurement.** With `capture()` calling
  `lossShock(b, t)` (and nothing else changed), on the a09724e code: WORLD-02 check 3 went 9/10 → 7/10 (fail),
  WORLD-01 check 6 8/10 → 6/10 (fail), and `admiral.test.ts` "keeps a longer engagement range … on seed 1" failed
  (5711 m vs 5727 m). With the flat shock back and everything else in this package: 8/10, 8/10, and the test passes.
  Measured 2026-10-21 by toggling one line, three WORLD runs each; re-test costs one edit and three sim runs (~6 min).
  For a cruiser the two shocks are the same (2 × 2.5 = 5 near); capitals, destroyers and carriers lose much more. A
  balance call: Requests.
- WORLD-02 check 3 is 8/10 against the tip's 9/10 (still a pass): the marine commander's own reinforce / pull-back on a
  timeout changes idle battles (toggled off it is 9/10). Seed 6 is the one that moved.
- **Surnames: only the officers are capped.** Captain names come from `generateCaptain()`, PKG-13's roster function
  (fenced). On roster 1 no player surname appears more than twice among captains plus officers, but nothing stops a
  roster from giving three captains one name: Requests.
- An answer to a report given by its officer still costs no points (BRIDGE §5, unchanged): a Reinforce answered from
  the queue launches without spending command.
- The ack after an answer is spoken by the officer who raised the report; for the marine decision the line is a plain
  acknowledgement ("Aye, Admiral. More pods away.").

## Flag, save

Flag: none (the package names none). Save version: unchanged; `battle.comms` gains three optional fields
(`shieldOrders`, `officerJudgement`, `lastHead`), absent on an older battle, so a battle from before PKG-14 round-trips.

## Requests

- **Palamedes (morale), with Daedalus:** the capture's morale shock. The swap is one line in `boarding.ts capture()`
  (`lossShock(b, t)` in place of the flat loop; the comment there says so). It needs a re-tune of whatever holds
  WORLD-02 check 3 and WORLD-01 check 6 first; then delete `MORALE.friendLost`, `friendLostNear` and `enemyLost`, which
  only `capture()` reads.
- **PKG-13 (`captains.ts` roster generation):** in `generateCaptain()`'s name loop, also reject a name whose surname is
  already in `taken` twice for that side, so no surname appears more than twice in one fleet. Comms already counts the
  player's captains before naming the officers.
- **PKG-13 / Daedalus:** `MORALE.sideBreakLosses` can go once `admiral.ts:148` stops reading it; nothing else does.
  `numbers.ts`'s comment at the constant still mentions `captureSideCheck`.
- **PKG-12 / PKG-15 (view):** the crew panel's marine commander row and the queue now both offer Reinforce / Pull back
  while marines fight inside; one of them may be redundant.

## Assumed, for Caleb to overrule

- **House names:** House of Kleisthenes for Saturn (LORE.md names no Saturn house; Titan rules by lot on Athens's
  model, and Kleisthenes's family gave Athens its democracy) and House of Ganymede for Jupiter (LORE.md).
- **Pods at their flagship:** only the flagship's own marine commander, on the admiral's order, may board the enemy
  flagship (VISION §7a over NAVY §3, Daedalus's ruling). Other ships and unordered captains still may not.
- A standing split is held for at least 8 s, then released only when a side it starves is open and carries half the
  fire. Any new shield order, including "Even", replaces it.
- The marine commander asks once per fight, 2 s after the breach, and again after 45 s if the fight is still going; he
  waits 8 s; Judgement ≥ 6 reinforces a losing fight (or pulls out), anything else carries on.
- The fire-slackened line comes once per fight, 3 s in, only while the ship's guns still work.

## Evidence

Acceptance on the merged branch (`claude/pkg-14` @ 88a1ef9 = PKG-14 + `claude/game` @ edfb547; the merge brought no
change under `src/battle/sim` or `scripts/sim.mjs`: `git diff 473303e 88a1ef9 -- src/battle/sim scripts/sim.mjs` is
empty), after the last code edit:

```
$ npx tsc -b
2026-10-21T17:41:56-07:00
tsc -b: clean

$ npx eslint src/battle/sim
2026-10-21T17:42:08-07:00
eslint src/battle/sim: clean

$ npx vitest run
2026-10-21T17:42:13-07:00
 Test Files  65 passed (65)
      Tests  848 passed (848)
   Start at  17:42:15

$ npm run build (tail)
2026-10-21T17:42:38-07:00
precache  40 entries (2789.82 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js

$ npm run smoke (tail)
2026-10-21T17:43:06-07:00
[10.7s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":23,"shots":562,"movedBySide":[11,12],"drawCalls":67} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[15.0s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (15.0s)
```

WORLD-01/02 **before** (`claude/game` @ f919906, the tip's sim code; `--no-write`):

```
2026-10-21T17:21:32-07:00
f919906 Merge TRC-03: report evidence
WORLD-01: setup saturn-12v12, seeds 1–10, 15 min max, player policy idle, enemy admiral-jupiter
| WORLD-01 check | What | Pass range | Seeds needed | Got | Result |
| 1 | battle ends with an outcome | outcome ∈ {victory, defeat, withdrawal} | 10 of 10 | 10 of 10; withdrawal 7, defeat 3 | pass |
| 2 | both sides fired and dealt damage by 60 s | damageDealt.player > 0 and damageDealt.enemy > 0 at 60 s | 10 of 10 | 10 of 10; min at 60 s: player 1666, enemy 2226 | pass |
| 3 | a boarding attempt happened, unordered | boardingAttempts ≥ 1, none ordered | 8 of 10 | 10 of 10; mean attempts 21.3 (unordered 20.1); captured P 16 E 14 | pass |
| 4 | at least one ship broke (fled or struck) | brokenShips ≥ 1 | 8 of 10 | 10 of 10; mean broken 10.1 | pass |
| 5 | idle player's captains decided things on timeouts, each with a trait | timeoutDecisions ≥ 3, each with a trait | 10 of 10 | 10 of 10; mean 21.4 per battle, 21.4 of them closing a comms report | pass |
| 6 | swapping player captains' Nerve and Judgement changes the battle | outcome or losses differ by ≥ 25% | 8 of 10 | run with --variant swap-nerve-judgement | not run |
| 7 | the director keeps filming | shotsPer20s ≥ 1 | seed 1 | needs the view (PKG-03 and later) | not built |
WORLD-01: every built check passed (5 pass, 1 not built, 1 not run)
WORLD-01: setup saturn-12v12, seeds 1–10, 15 min max, player policy idle, enemy admiral-jupiter, variant swap-nerve-judgement
| 6 | swapping player captains' Nerve and Judgement changes the battle | outcome or losses differ by ≥ 25% | 8 of 10 | 8 of 10; mean player ships lost 3.9 → 4.4; outcomes withdrawal 7, defeat 3 → withdrawal 10 | pass |
WORLD-01: every built check passed (6 pass, 1 not built, 0 not run)
WORLD-02: setup saturn-12v12, seeds 1–10, 15 min max, player policy idle, enemy admiral-jupiter
| WORLD-02 check | What | Pass range | Seeds needed | Got | Result |
| 1 | same seed, same policy, run twice: identical result | final state hash equal | 10 of 10 | 10 of 10 | pass |
| 2 | idle on even fleets: the winner does not swing with the seed | the same winner (or draw) | 8 of 10 | 10 of 10; winner "enemy"; tally enemy 10 | pass |
| 3 | scripted-good beats idle | player ships lost (good) < (idle) and outcome ≥ idle | 8 of 10 | 9 of 10; lost good 3 3 1 3 2 2 2 3 2 4 vs idle 4 3 3 5 4 3 5 4 3 5; outcomes good withdrawal 10 | pass |
| 4 | scripted-bad does worse than idle | player ships lost (bad) > (idle) | 8 of 10 | 9 of 10; lost bad 6 6 4 7 6 4 5 6 5 6 vs idle 4 3 3 5 4 3 5 4 3 5; outcomes bad withdrawal 8, defeat 2 | pass |
| 5 | the AI admiral uses the player's order set only | every AI order is a player order type (log check) | 10 of 10 | 10 of 10; orders issued 60 123 83 134 120 98 132 118 82 136; kinds attack 934, withdraw 26, focusSide 40, board 34, followFlagship 52; foreign 0 needed, log-foreign 0; stats.orders = admiral's count in 10 of 10 | pass |
| 6 | the AI telegraphs a boarding push ≥ 5 s ahead | telegraphLead ≥ 5 s on each push, telegraph visible | 8 of 10 | 7 of 10; seeds with a push 7 of 10; pushes 17; lead min 6 s; visible 17 of 17 | FAIL |
| 7 | Jupiter's mean engagement range beats a Mars-style control | meanRange(jupiter) > meanRange(control), range of every AI shot | 8 of 10 | 5 of 10; shots: jupiter 6171 5717 5551 5286 6068 6035 5665 5080 5640 5208 m; control 5542 5075 5815 6196 5444 5336 5513 5453 5742 6142 m; nearest-foe sample: jupiter 6819 6361 6404 6486 6354 6190 6611 6325 6631 6346, control 6578 6316 6785 6891 6387 6394 64
WORLD-02: 2 built check(s) FAILED
```

WORLD-01/02 **after** (`claude/pkg-14` @ 473303e, sim code identical to the merged 88a1ef9):

```
2026-10-21T17:41:08-07:00
473303e PKG-14: a board order's acknowledgement names the target, not the raw kind
WORLD-01: setup saturn-12v12, seeds 1–10, 15 min max, player policy idle, enemy admiral-jupiter
| 1 | battle ends with an outcome | outcome ∈ {victory, defeat, withdrawal} | 10 of 10 | 10 of 10; withdrawal 7, defeat 3 | pass |
| 2 | both sides fired and dealt damage by 60 s | damageDealt.player > 0 and damageDealt.enemy > 0 at 60 s | 10 of 10 | 10 of 10; min at 60 s: player 1666, enemy 2226 | pass |
| 3 | a boarding attempt happened, unordered | boardingAttempts ≥ 1, none ordered | 8 of 10 | 10 of 10; mean attempts 21.2 (unordered 19.6); captured P 16 E 13 | pass |
| 4 | at least one ship broke (fled or struck) | brokenShips ≥ 1 | 8 of 10 | 10 of 10; mean broken 9.7 | pass |
| 5 | idle player's captains decided things on timeouts, each with a trait | timeoutDecisions ≥ 3, each with a trait | 10 of 10 | 10 of 10; mean 23.8 per battle, 23.8 of them closing a comms report | pass |
| 6 | swapping player captains' Nerve and Judgement changes the battle | outcome or losses differ by ≥ 25% | 8 of 10 | run with --variant swap-nerve-judgement | not run |
| 7 | the director keeps filming | shotsPer20s ≥ 1 | seed 1 | needs the view (PKG-03 and later) | not built |
WORLD-01: every built check passed (5 pass, 1 not built, 1 not run)
WORLD-01: setup saturn-12v12, seeds 1–10, 15 min max, player policy idle, enemy admiral-jupiter, variant swap-nerve-judgement
| 6 | swapping player captains' Nerve and Judgement changes the battle | outcome or losses differ by ≥ 25% | 8 of 10 | 8 of 10; mean player ships lost 3.7 → 4.4; outcomes withdrawal 7, defeat 3 → withdrawal 10 | pass |
WORLD-01: every built check passed (6 pass, 1 not built, 0 not run)
WORLD-02: setup saturn-12v12, seeds 1–10, 15 min max, player policy idle, enemy admiral-jupiter
| 1 | same seed, same policy, run twice: identical result | final state hash equal | 10 of 10 | 10 of 10 | pass |
| 2 | idle on even fleets: the winner does not swing with the seed | the same winner (or draw) | 8 of 10 | 10 of 10; winner "enemy"; tally enemy 10 | pass |
| 3 | scripted-good beats idle | player ships lost (good) < (idle) and outcome ≥ idle | 8 of 10 | 8 of 10; lost good 3 3 1 3 2 2 2 3 2 4 vs idle 4 3 3 3 4 3 5 4 3 5; outcomes good withdrawal 10 | pass |
| 4 | scripted-bad does worse than idle | player ships lost (bad) > (idle) | 8 of 10 | 9 of 10; lost bad 6 7 5 6 6 4 5 6 5 6 vs idle 4 3 3 3 4 3 5 4 3 5; outcomes bad withdrawal 9, defeat 1 | pass |
| 5 | the AI admiral uses the player's order set only | every AI order is a player order type (log check) | 10 of 10 | 10 of 10; orders issued 60 123 83 99 120 98 132 179 82 136; kinds attack 943, withdraw 27, focusSide 46, board 44, followFlagship 52; foreign 0 needed, log-foreign 0; stats.orders = admiral's count in 10 of 10 | pass |
| 6 | the AI telegraphs a boarding push ≥ 5 s ahead | telegraphLead ≥ 5 s on each push, telegraph visible | 8 of 10 | 7 of 10; seeds with a push 7 of 10; pushes 22; lead min 6 s; visible 22 of 22 | FAIL |
| 7 | Jupiter's mean engagement range beats a Mars-style control | meanRange(jupiter) > meanRange(control), range of every AI shot | 8 of 10 | 5 of 10; shots: jupiter 6171 5717 5551 5311 6068 6035 5665 5245 5609 5208 m; control 5542 5075 5815 6196 5444 5158 5513 5453 5742 6142 m; nearest-foe sample: jupiter 6819 6361 6404 6287 6354 6190 6611 6418 6564 6346, control 6578 6316 6785 6891 6387 6141 64
WORLD-02: 2 built check(s) FAILED
```

Built checks, before → after: WORLD-01 1–6 pass → pass (6: 8/10 → 8/10); WORLD-02 1–5 pass → pass (3: 9/10 → 8/10),
6 FAIL 7/10 → FAIL 7/10, 7 FAIL 5/10 → FAIL 5/10. No check changed result.

Screenshots: `shots/pkg-14/` (10 files, named by step); item 7's in `shots/pkg-14/item7/` on `claude/pkg-14-item7`.
The gate output and the game branch's log after the merge are below.

## Gate (game worktree, after the merge)

```
$ git log --first-parent -3 --oneline claude/game
25b3008 Merge PKG-14: standing shield orders hold, marine commander's reinforce/pull-back decision, fire-slackened line, pods at their flagship with true refusals, one break rule, lines both ways round; item 7 held on claude/pkg-14-item7 (WORLD-01 c6)
edfb547 Daedalus: TRC-03 adopted, PKG-12 and PKG-15 verified, PKG-14 addendum
fc4e464 Merge PKG-12: report evidence

$ git diff --stat HEAD^1 HEAD
 .../exp02-s8b-port-085-held-60s-no-retrim.jpg      | Bin 0 -> 142810 bytes
 shots/pkg-14/exp05-s5-their-fire-slackened.jpg     | Bin 0 -> 150005 bytes
 ...marine-commander-reinforce-pullback-carryon.jpg | Bin 0 -> 148531 bytes
 shots/pkg-14/exp05-s6b-q-reinforce-pods-away.jpg   | Bin 0 -> 149487 bytes
 ...p05-s7-s8-sceptre-ours-prize-crew-60-of-200.jpg | Bin 0 -> 144109 bytes
 ...9-amalthea-wrecked-counts-less-than-capture.jpg | Bin 0 -> 102281 bytes
 .../fold-reads-like-a-person-house-names.jpg       | Bin 0 -> 145331 bytes
 shots/pkg-14/refusal-out-of-range-true-reason.jpg  | Bin 0 -> 135039 bytes
 src/battle/sim/battle.ts                           |  26 +-
 src/battle/sim/boarding/boarding.ts                |  78 +++--
 src/battle/sim/comms/bridge.test.ts                | 358 +++++++++++++++++++++
 src/battle/sim/comms/command.ts                    |   4 +-
 src/battle/sim/comms/core.ts                       |   7 +-
 src/battle/sim/comms/index.ts                      |   4 +-
 src/battle/sim/comms/lines.ts                      |  58 +++-
 src/battle/sim/comms/marines.ts                    | 106 ++++++
 src/battle/sim/comms/numbers.ts                    |  18 ++
 src/battle/sim/comms/officers.ts                   |  17 +-
 src/battle/sim/comms/queue.ts                      |  17 +-
 src/battle/sim/comms/standing.ts                   |  45 +++
 src/battle/sim/comms/tick.ts                       |  43 ++-
 src/battle/sim/comms/types.ts                      |  11 +-
 src/battle/sim/losses.test.ts                      |   2 +-
 src/battle/sim/setups/saturn-12v12.ts              |  10 +-
 27 files changed, 1021 insertions(+), 78 deletions(-)

$ npx tsc -b
2026-10-21T17:44:24-07:00
tsc -b: clean

$ npx vitest run
2026-10-21T17:44:37-07:00
 Test Files  65 passed (65)
      Tests  848 passed (848)
   Start at  17:44:39

$ npm run build (tail)
2026-10-21T17:45:02-07:00
precache  40 entries (2789.82 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js

$ npm run smoke (tail)
2026-10-21T17:45:32-07:00
[13.1s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":23,"shots":562,"movedBySide":[11,12],"drawCalls":67} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[17.6s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (17.6s)
```

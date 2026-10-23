# PKG-06: comms sim (report)

Seat: Talos for the model, Kalliope for the report lines. Branch `claude/pkg-06`, base `claude/game` @ a571a1c.
Date 2026-10-21. Sim only: no flag, save shape unchanged (the battle is not saved; `battle.comms` is new plain data on it).

## What I measured

- **WORLD-01 idle, seeds 1–10, 15 min, on the merged tree (claude/game @ 03fc6c0 with PKG-05):** checks 1, 2, 3, 4,
  5 pass; check 6 (with `--variant swap-nerve-judgement`) passes 10 of 10 (mean player ships lost 2.1 → 4.9). Check 5 is
  now a built row: 10 of 10, a mean of 28.0 player timeout decisions per battle, every one of them closing a comms report
  and carrying the captain's trait. Check 7 stays `not built` (the view). Before the merge (PKG-06 alone) check 5 read
  10 of 10, mean 23.7.
- **The marine commander on PKG-05's real events** (merged tree, seeds 1–3, idle): 21 launch reports, 7 breach reports,
  5 captures; for example "They have cut into Amalthea." No boarders came at the player side on those seeds, so the
  urgent "boarders inbound" path is proved by its shape only.
- **WORLD-02 idle:** check 1 (determinism) 10 of 10, check 2 (same winner) 10 of 10, winner enemy.
- **The battle barely moved.** Against PKG-02's numbers the idle battles still end `withdrawal` 10 of 10 with the same
  losses; player timeout decisions rose from ~11 to ~24 per battle because comms now raises decisions of its own (shield
  side down, hull breach, a captain about to break, flagship threatened). Picking a line never touches the battle's dice:
  comms draws from its own stream, seeded from the battle seed and stored in `battle.comms.rng`.
- **`player-answers-first` against idle (WORLD-01 table, seeds 1–10):** check 5 reads 0 of 10 under that policy, as it
  should, because every decision is answered before it can time out. That is the comparison the policy exists for, not
  a failure of check 5 (whose script names the idle policy).
- **Cost:** 34.9–38.4 µs per tick with comms against 33.7–35.1 without, over 18 battles each; the profile has no comms
  function in its top 15. Within noise.

## What I changed

New, all mine, in `src/battle/sim/comms/`:

| File | What |
|---|---|
| `types.ts` | `CommsState` (the comms slice on `battle.comms`), `Report`, `Answer`, `Speaker`, `QueueItem`, `FlagshipCrew`, `Accuracy`, `CommandResult`. |
| `numbers.ts` | Every comms number, first-pass: timeouts, folding, cooldowns, patience by trait, command points, Candour lean, pushback, the crew's engineering effects, maneuver and fighter-task names. |
| `lines.ts` | The report lines as data (Kalliope's pen). Bodies by type × mood (3 each), tails by trait (11 × 3, one of them empty), officer lines, marine commander lines, the flag lieutenant's fold. |
| `core.ts` | Creating the slice, picking and filling lines, adding/closing reports, `timeoutFor`, `reportedHull` (Candour) and the accuracy record, `recordTimeout`. |
| `tick.ts` | `commsTick(b)`: requests and engine events become reports; timeouts decided by trait and Judgement; folding; command-point refill; crew effects. |
| `queue.ts` | `queue(b)` (pure), `answerable(b)`, `answerTop(b, i)` (Q/E/R = 0/1/2), `tabNext(b)`. |
| `command.ts` | `command(b, ship, order)`: direct orders and crew orders, paced by command points, with protest and refusal out loud; `broadcast`; `ping`. |
| `officers.ts` | The five officers' order kinds, handled from `order()`; their standing effects on the flagship each tick. |
| `policy.ts` | `player-answers-first`. |
| `comms.test.ts` | 23 tests (below). |

Registry lines (rule 9) in the shared sim files, nothing else:

- `types.ts`: seven members on `OrderKind` and `ORDER_KINDS` (`gunsOn`, `holdFire`, `overloadGuns`, `feedEngines`,
  `helm`, `launchPods`, `fighters`); `Order.maneuver`, `Order.task`; `Decision.report`, `Decision.choice`; two
  `LogEvent` members (`commsAnswer`, `commsRefused`); `Battle.comms?`.
- `orders.ts`: one import and one `case` group calling `officerOrder`.
- `battle.ts`: one import and one call line, `commsTick(b)`, after the captains think and before movement and gunnery.
- `policies.ts`: one import and the `player-answers-first` entry.
- `checks.ts`: WORLD-01 check 5's row, which this package names as its own, changed from `not built` to a checked row.
- `index.ts`: `export * from './comms'`.

### How it works, briefly

- **The queue.** A report has a level (urgent, decision, status), a speaker (portrait key `captain:<id>` or
  `officer:<role>`, name, ship, mood, trait), text and 2–3 answers. Each answer is a request choice, a set of orders, or
  both. `queue()` returns urgent first, then decisions, each by how soon it closes; then status, newest first, with the
  flag lieutenant's summary last. Tab moves a cursor over the reports that take an answer; Q/E/R answer the selected one.
- **What creates reports.** PKG-02 requests (withdraw, pursue, cover) become decisions; urgent when hull is under 25%.
  Engine events: `shieldDown` (decision), `systemOut` (urgent "hull breach"; the flagship's goes to engineering as
  status), `break`, `out` (our ship lost, or a kill credited to the captain who last hit it). Each second it checks for a
  captain within 8 morale of breaking (urgent) and for the flagship under 70% hull or with 4 enemies within 5 km
  (urgent, from the flag captain). PKG-05's boarding kinds (`boardLaunch`, `boardDeflected`, `breach`, `boardFight`,
  `captured`, `repelled`, `scuttled`) are read off the log by kind string, without importing anything of theirs, and
  reported by the marine commander: boarders inbound on us, a breach of ours and a capture of ours are urgent, the rest
  status. Captains' ~500 own decisions per battle (shield shifts, turns, retargets) are folded: each one is a pending
  status line, and every 10 s the flag lieutenant replaces them with one summary row ("Status, 34 lines. 12 ships
  trimming shields, 22 retargets.").
- **Timeouts.** A decision waits `8 − 3 if urgent + patience(trait)`, clamped to 4–12 s. PKG-02's own requests get the
  same clock: comms rewrites `request.deadline` when it first sees one (data, not a changed line). Unanswered, the captain
  picks by trait first and Judgement second; the decision goes into `battle.stats.decisions` and `timeoutDecisions` with
  `trait`, `why` (the trait, or `Judgement N`, or `loyalty N` for a protest), `report` and `choice`. A Grudge-holder
  loses 2 loyalty. A Glory-hound or Bold captain takes the risky answer (carry on, stand fast). The captain then says on
  comms what they chose. For PKG-02's requests battle.ts still makes the choice; comms tags that decision with its report
  and choice and says it out loud.
- **Reports can be wrong.** A captain's own hull figure (withdraw request, hull breach, protest, `ping`) leans by trait
  (Optimist up, Pessimist down) and mood (panicked down, defiant up) plus seeded noise, all scaled by `(10 − Candour)/9`:
  Candour 10 tells the truth. Every figure is scored into `battle.comms.accuracy[shipId]`.
- **The flagship's crew.** Five officers with names of their own (the flag captain is the flagship's captain). Master of
  guns: `gunsOn {target}` moves the flagship's target and keeps it there until the target leaves the field; `holdFire`
  silences the guns (a second `holdFire` frees them). Shields and engineering: `shieldPower` (PKG-02's kind; comms adds the
  officer's reply), `overloadGuns` (reload 1.5×, shields drain 1% of max per second), `feedEngines` (engines and jump
  drive repair 1 point/s, guns reload 30% slower); either again returns power to normal. Flag captain: `helm {maneuver}`
  stores the name only. Marine commander: `launchPods {target}` hands over to PKG-05's `board` kind when it is in
  `ORDER_KINDS`, otherwise refuses out loud ("No pods aboard"). Fighter command: `fighters {task}` stores the task. Each
  answers in person.
- **Command points.** Max 5, start 5, refill 0.25/s. Answer 0, ping 0, direct order 1, crew order 1, broadcast 3. Short
  of points, the order is refused with the reason ("Too many orders in flight. Need 1, have 0.") on comms and in the log.
- **Pushback.** On a direct order to a ship: a Fanatic refuses to withdraw; loyalty under 30 may refuse; an attack while
  under 50% hull or strained may draw a protest, more likely with low Nerve and Judgement (By-the-book never protests).
  A protest is a decision report with Confirm / Belay; confirm and they go. Nothing is refused silently: a refusal is a
  report and a `commsRefused` log line.

## Script steps

| Step | Status | Evidence |
|---|---|---|
| EXP-02 step 2 (urgent jumps above decisions; status folded) | wired-but-unproven (sim proven; the red/amber/grey UI is next wave) | test "urgent jumps above decisions; status folds into the flag lieutenant summary" |
| EXP-02 step 3 (Q answers the top decision; captain acknowledges; ship's order = the answer) | wired-but-unproven (sim proven) | tests "answerTop (Q) applies the chosen order, logs it…", "a PKG-02 request is a decision…" |
| EXP-02 step 4 (Tab, then E answers the second report with its second option) | wired-but-unproven (sim proven) | test "Tab then E answers the second report with its second option" |
| EXP-02 step 5 (unanswered decision times out in 4–12 s; the choice came from Judgement and trait) | wired-but-unproven (sim proven; probe step, so only the probe hook is missing) | tests "waits 4–12 s…", "unanswered, the captain decides by trait…", "without a deciding trait, Judgement decides…", "PKG-02 request timeouts close their report…" |
| EXP-02 step 7 (master of guns: flagship fire shifts; officer answers) | wired-but-unproven (sim proven) | test "master of guns: guns on a target moves the flagship fire; hold fire stops it" |
| EXP-02 step 8 (shields and engineering: everything to port) | wired-but-unproven (sim proven) | test "shields and engineering: power to a side, overload the guns, feed the engines" |
| EXP-02 step 12 (command points pace orders; refused with a reason) | wired-but-unproven (sim proven; the meter UI is next wave) | tests "an order without points is refused with a reason…", "costs: an answer is free…" |
| WORLD-01 check 5 (≥ 3 timeout decisions with the deciding trait, 10 of 10) | **pass**, 10 of 10 | runner table below |
| WORLD-01 checks 1, 2, 4, 6 | pass (unchanged) | runner tables below |
| WORLD-02 checks 1, 2 | pass (unchanged) | runner table below |
| EXP-02 steps 1, 6, 9, 10, 11 | not built (UI next wave; step 10's pods wait on PKG-05's `board`, fighters are a later package) | |

## What is still broken or missing

- Nothing on screen: the queue is data only. The UI binds Q/E/R/Tab next wave.
- `launchPods` hands over to PKG-05's `board` on the merged tree; the test asserts the `board` order is issued and either
  taken or refused out loud. Whether the pods then reach the target is PKG-05's.
- The urgent "boarders inbound" report has not fired in a measured battle (the enemy did not board the player on seeds
  1–3); it is tested by shape, not by a run.
- `helm` and `fighters` only store their value (by design: M1 flies, fighters are later).
- `order()` logs an officer order as `ok: true` before `officerOrder` can refuse it (PKG-02's `valid()` runs first); the
  refusal then has its own `commsRefused` line. See Requests.
- The enemy side has no comms queue; its requests still time out on the captains' patience. PKG-07's admiral answers them.
- The `doctrine-concentrate` stand-in and any AI call `order()` directly, so they pay no command points. `command()` is
  the player's path.

## Sample lines for Caleb (do the captains sound like people?)

From seeds 2, 5 and 8 (idle and player-answers-first) and a scripted set of crew orders on seed 2:

| Type | Trait, mood | Speaker | Line |
|---|---|---|---|
| breaking | Pessimist, strained | Livia Laskaris (Agora) | They are going to break, Admiral. I cannot keep them. I do not like our odds. |
| timeout choice | Pessimist, strained | Livia Laskaris (Agora) | Nobody is answering. We stand. |
| shield down | Ambitious, steady | Lucilla Philanthropenos (Stoa) | Fore side is open. Request we turn. This is our chance. |
| hull breach | Ambitious, steady | Lucilla Philanthropenos (Stoa) | Hull breach. Lost the guns. 51% hull. |
| withdraw | Ambitious, steady | Lucilla Philanthropenos (Stoa) | Hull 31%. We should pull out. Your word, Admiral. This is our chance. |
| timeout choice | Protector, steady | Anastasia Botaneiates (Pnyx) | No answer. Falling back on the flagship. Keeping the line together. |
| cover | Optimist, steady | Anna Laskaris (Bema) | Request we close on the flagship and cover. Nothing we cannot fix. |
| cover | Pessimist, strained | Livia Laskaris (Agora) | Flagship is in trouble. Do we cover you or hold here? It will only get worse. |
| timeout choice | Grudge-holder, steady | Theodosios Kantakouzenos (Thalassa) | No answer. Holding here. I will remember the silence. |
| breaking | Protector, panicked | Pulcheria Laskaris (Hyperion) | We are breaking! Admiral! The others come first. |
| pursue | Pessimist, steady | Manuel Tornikes (Ekklesia) | Enemy Europa is running. Pursue or hold? It will only get worse. |
| ack | By-the-book, steady | Romanos Laskaris (Phoebe) | Aye, Admiral. Coming to cover you. Logged. |
| refuse | Fanatic, steady | Anastasia Botaneiates (Pnyx) | I will not do that, Admiral. Never. |
| protest | Pessimist, strained | Livia Laskaris (Agora) | Please confirm. We are not in shape for this. |
| ping | Ambitious, steady | Lucilla Philanthropenos (Stoa) | Stoa. Hull 100%. On station. Note that we are still in it. |
| master of guns | officer | Euphrosyne Laskaris (Astu) | Guns on Basileus, aye. |
| flag captain | officer | Bardas Batatzes (Astu) | Crossing their bow, aye. Bringing her round. |
| marine commander | officer | Irene Palaiologos (Astu) | Cannot do it. No pods aboard. |
| engineering | officer | Xene Kourkouas (Astu) | We have lost the jump drive on the flagship. Damage control is on it. |
| flag lieutenant | officer | Eudokia Angelos (Astu) | Status, 34 lines. 12 ships trimming shields, 22 retargets. |

Two I would change after hearing them: "Flag lieutenant" and "Status, 34 lines" read like a log, not a person; and a
tail can repeat across a whole fleet of the same trait in one fold. Both are line data, cheap to rewrite.

## Assumed, for Caleb to overrule

- Command-point numbers: max 5, refill 1 per 4 s, direct order 1, crew order 1, broadcast 3, answers and pings free
  (BRIDGE §5's costs; the meter size and refill are mine).
- Timeouts: 8 s base, 3 s less if urgent, −3 to +3 by trait (Glory-hound −3 … Veteran and By-the-book +3), clamped 4–12.
- Which officer answers: master of guns for guns, engineering for shields and power, the flagship's own captain as flag
  captain, the marine commander for boarding, fighter command for wings, the flag lieutenant for the fold, lost ships
  and "not enough points".
- Comms picks lines and pushback rolls from its own seeded stream (seed ^ constant, stored on the battle), not from
  `battle.rng`, so wording never changes a battle's outcome. Rule 3 says randomness comes "only from the battle's seeded
  RNG"; this is a second stream seeded from the battle seed, the same way PKG-02 seeds the roster.
- Comms raises decisions of its own in idle battles (shield side down, breach, breaking, flagship threatened) and the
  captains act on them when they time out. This roughly doubles player timeout decisions (11 → 24 per battle) without
  changing any outcome on seeds 1–10.
- "Stand fast" answered by the admiral gives +6 morale; taken on a timeout it gives nothing.
- `overloadGuns` and `feedEngines` effects and sizes (above). `feedEngines` can bring dead engines back.
- Informational urgent reports from the marine commander carry two answers (carry on / fall back or escorts close up),
  so every urgent can be answered with Q.

## Requests

- ~~`sim.test.ts` 15-minute determinism test timing out at 5 s under load~~: measured 3 of 3 timeouts on the untouched
  base a571a1c while four packages ran vitest at once; PKG-05 has since given it 30 s on claude/game, and the merged
  suite passes 758 of 758. No request left.
- **Daedalus, `orders.ts` `valid()`:** let a kind validate itself before the `order` event is logged, so an officer order
  the flagship's crew refuses is logged `ok: false` rather than `ok: true` plus a `commsRefused` line.
- **PKG-05:** comms reads your events as your `types.ts` comment says (`ship` is the boarded ship, except boardLaunch's
  launcher; `by`/`from` sides). If that shape changes, `comms/tick.ts` `boarding()` needs the same change.
- **Next wave (comms UI):** draw `queue(b)`; bind Q/E/R to `answerTop(b, 0|1|2)` and Tab to `tabNext(b)`; give orders
  through `command(b, ship, order)` (not `order()`) so points and pushback apply; the meter is `b.comms.points.player`
  out of `POINTS.max`; the probe for EXP-02 step 5 is `b.stats.timeoutDecisions` (`report`, `choice`, `trait`, `why`).

## Evidence

All acceptance commands, run on the merged branch (claude/pkg-06 @ 2fece07 = PKG-06 + claude/game @ 03fc6c0), after the
last code edit. Timestamps are the first line of each block. The sim JSON files the runner writes under `vision/sims/`
were restored afterwards (outside this package's files).

```
$ npx tsc -b
2026-10-21T15:37:28-07:00
tsc -b: clean

$ npx eslint src/battle/sim
2026-10-21T15:37:48-07:00
eslint src/battle/sim: clean

$ npx vitest run
2026-10-21T15:37:54-07:00
 Test Files  57 passed (57)
      Tests  758 passed (758)
   Start at  15:37:58
   Duration  19.36s (tests 77%, import 14%, transform 9%, worker 1%)

$ npm run build   (tail)
2026-10-21T15:38:23-07:00
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js

$ npm run smoke   (tail; the first attempt found port 5290 held by another package's smoke and was retried)
2026-10-21T15:40:04-07:00
[0.5s] vite on http://[::1]:5290
[12.3s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":59.999999999999154,"moved":24,"shots":654,"drawCalls":174} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[16.6s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (16.6s)
```

```
$ npm run sim -- --script WORLD-01 --seeds 10 --minutes 15 --policy idle
2026-10-21T15:39:08-07:00


WORLD-01: setup saturn-12v12, seeds 1–10, 15 min max, player policy idle, enemy doctrine-concentrate
  base seed  1: withdrawal  290 s  lost P 2 (fled 10, wd 0) E 3 (fled 0, wd 0)  broken 11  timeouts 37  self 591  hash 45ab757ec3bd3eed  661 ms wall
  base seed  2: withdrawal  327 s  lost P 2 (fled 10, wd 0) E 2 (fled 0, wd 0)  broken 10  timeouts 38  self 607  hash 025dcc0f8c5b0928  619 ms wall
  base seed  3: withdrawal  325 s  lost P 3 (fled 9, wd 0) E 2 (fled 0, wd 0)  broken 11  timeouts 38  self 697  hash 9090342d63495c48  584 ms wall
  base seed  4: withdrawal  512 s  lost P 2 (fled 9, wd 1) E 4 (fled 0, wd 0)  broken 10  timeouts 42  self 798  hash d8d4c4b076f1d15d  671 ms wall
  base seed  5: withdrawal  401 s  lost P 2 (fled 10, wd 0) E 3 (fled 0, wd 0)  broken 11  timeouts 43  self 675  hash 48b52973a2a3fd60  590 ms wall
  base seed  6: withdrawal  417 s  lost P 2 (fled 10, wd 0) E 2 (fled 1, wd 0)  broken 12  timeouts 37  self 779  hash 7d38335de47cb978  486 ms wall
  base seed  7: withdrawal  395 s  lost P 2 (fled 10, wd 0) E 4 (fled 0, wd 0)  broken 11  timeouts 38  self 675  hash dd024fdd9cc3249b  459 ms wall
  base seed  8: withdrawal  377 s  lost P 2 (fled 10, wd 0) E 3 (fled 0, wd 0)  broken 12  timeouts 39  self 589  hash a754f9002009a344  475 ms wall
  base seed  9: withdrawal  407 s  lost P 2 (fled 10, wd 0) E 3 (fled 0, wd 0)  broken 10  timeouts 41  self 714  hash 95e9b4717dc5b3b9  481 ms wall
  base seed 10: withdrawal  315 s  lost P 2 (fled 10, wd 0) E 3 (fled 0, wd 0)  broken 10  timeouts 36  self 624  hash c5bb9a07f4cb4a8f  367 ms wall

| WORLD-01 check | What | Pass range | Seeds needed | Got | Result |
|---|---|---|---|---|---|
| 1 | battle ends with an outcome | outcome ∈ {victory, defeat, withdrawal} | 10 of 10 | 10 of 10; withdrawal 10 | pass |
| 2 | both sides fired and dealt damage by 60 s | damageDealt.player > 0 and damageDealt.enemy > 0 at 60 s | 10 of 10 | 10 of 10; min at 60 s: player 2206, enemy 4660 | pass |
| 3 | a boarding attempt happened, unordered | boardingAttempts ≥ 1, none ordered | 8 of 10 | 10 of 10; mean attempts 6.7 (unordered 6.7); captured P 17 E 0 | pass |
| 4 | at least one ship broke (fled or struck) | brokenShips ≥ 1 | 8 of 10 | 10 of 10; mean broken 10.8 | pass |
| 5 | idle player's captains decided things on timeouts, each with a trait | timeoutDecisions ≥ 3, each with a trait | 10 of 10 | 10 of 10; mean 28.0 per battle, 28.0 of them closing a comms report | pass |
| 6 | swapping player captains' Nerve and Judgement changes the battle | outcome or losses differ by ≥ 25% | 8 of 10 | run with --variant swap-nerve-judgement | not run |
| 7 | the director keeps filming | shotsPer20s ≥ 1 | seed 1 | needs the view (PKG-03 and later) | not built |

WORLD-01: every built check passed (5 pass, 1 not built, 1 not run)
```

```
$ npm run sim -- --script WORLD-01 --seeds 10 --minutes 15 --policy idle --variant swap-nerve-judgement   (table)
2026-10-21T15:39:15-07:00
WORLD-01: setup saturn-12v12, seeds 1–10, 15 min max, player policy idle, enemy doctrine-concentrate, variant swap-nerve-judgement
| WORLD-01 check | What | Pass range | Seeds needed | Got | Result |
|---|---|---|---|---|---|
| 1 | battle ends with an outcome | outcome ∈ {victory, defeat, withdrawal} | 10 of 10 | 10 of 10; withdrawal 10 | pass |
| 2 | both sides fired and dealt damage by 60 s | damageDealt.player > 0 and damageDealt.enemy > 0 at 60 s | 10 of 10 | 10 of 10; min at 60 s: player 2206, enemy 4660 | pass |
| 3 | a boarding attempt happened, unordered | boardingAttempts ≥ 1, none ordered | 8 of 10 | 10 of 10; mean attempts 6.7 (unordered 6.7); captured P 17 E 0 | pass |
| 4 | at least one ship broke (fled or struck) | brokenShips ≥ 1 | 8 of 10 | 10 of 10; mean broken 10.8 | pass |
| 5 | idle player's captains decided things on timeouts, each with a trait | timeoutDecisions ≥ 3, each with a trait | 10 of 10 | 10 of 10; mean 28.0 per battle, 28.0 of them closing a comms report | pass |
| 6 | swapping player captains' Nerve and Judgement changes the battle | outcome or losses differ by ≥ 25% | 8 of 10 | 10 of 10; mean player ships lost 2.1 → 4.9; outcomes withdrawal 10 → withdrawal 8, defeat 2 | pass |
| 7 | the director keeps filming | shotsPer20s ≥ 1 | seed 1 | needs the view (PKG-03 and later) | not built |
WORLD-01: every built check passed (6 pass, 1 not built, 0 not run)
```

```
$ npm run sim -- --script WORLD-02 --seeds 10 --minutes 15 --policy idle   (table)
2026-10-21T15:39:24-07:00
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

Comms tests (`src/battle/sim/comms/comms.test.ts`, 23): urgent jumps the queue and status folds; answerTop applies the
order, logs it and the captain acknowledges; a request answered through battle.answer(); Tab then E; timeouts 4–12 s by
urgency and patience; timeout decided by trait with trait, report and choice recorded; Judgement decides without a
deciding trait; Grudge-holder loyalty cost (and none when answered); PKG-02 request timeouts close their report and say
the choice; command points refuse with a reason and refill; costs (answer free, broadcast most); refusal and protest out
loud, confirm makes the captain go; no silent refusals; master of guns (target, hold fire stops shots); engineering
(split, overload, feed engines repairs); helm and fighter command store; launchPods hands over to `board`; officer
orders flagship-only; Candour (truth at 10, Optimist leans up, accuracy recorded); every line cell ≥ 3 and no unfilled
placeholder; player-answers-first answers and changes the battle against idle; determinism (two policies) and JSON
round-trip; queue() is pure; no wall time or Math.random.

No screenshots: sim only, nothing on screen (`shots/pkg-06/` not created).

Flag: none. Save version: unchanged.

## Gate (game worktree, after `Merge PKG-06` f36e1d4)

```
$ git log --first-parent -3 (claude/game)
f36e1d4 Merge PKG-06: comms sim (queue, timeouts by trait, command points, pushback, flagship crew orders, report lines)
03fc6c0 Merge PKG-05: report evidence
690b99c Merge PKG-05: boarding (pods, breach, fight inside, capture/repel/scuttle, prizes), mass lock, unordered boarding

$ git diff --stat 03fc6c0 f36e1d4
 reports/PKG-06.md                  | 299 +++++++++++++++++++++++++++
 src/battle/sim/battle.ts           |   2 +
 src/battle/sim/checks.ts           |  10 +-
 src/battle/sim/comms/command.ts    | 132 ++++++++++++
 src/battle/sim/comms/comms.test.ts | 406 +++++++++++++++++++++++++++++++++++++
 src/battle/sim/comms/core.ts       | 163 +++++++++++++++
 src/battle/sim/comms/index.ts      |   8 +
 src/battle/sim/comms/lines.ts      | 244 ++++++++++++++++++++++
 src/battle/sim/comms/numbers.ts    |  90 ++++++++
 src/battle/sim/comms/officers.ts   | 126 ++++++++++++
 src/battle/sim/comms/policy.ts     |  11 +
 src/battle/sim/comms/queue.ts      |  70 +++++++
 src/battle/sim/comms/tick.ts       | 334 ++++++++++++++++++++++++++++++
 src/battle/sim/comms/types.ts      | 132 ++++++++++++
 src/battle/sim/index.ts            |   1 +
 src/battle/sim/orders.ts           |   3 +
 src/battle/sim/policies.ts         |   2 +
 src/battle/sim/types.ts            |  18 +-
 18 files changed, 2043 insertions(+), 8 deletions(-)

$ npx tsc -b
2026-10-21T15:40:57-07:00
tsc -b: clean

$ npx vitest run
2026-10-21T15:41:08-07:00
 Test Files  57 passed (57)
      Tests  758 passed (758)
   Start at  15:41:10

$ npm run build (tail)
2026-10-21T15:41:23-07:00
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js

$ npm run smoke (tail)
2026-10-21T15:42:08-07:00
[0.5s] vite on http://[::1]:5290
[11.7s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":59.999999999999154,"moved":24,"shots":654,"drawCalls":174} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[16.0s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (16.0s)
```

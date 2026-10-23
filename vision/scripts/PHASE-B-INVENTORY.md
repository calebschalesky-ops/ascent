# Phase B inventory: what the scripts need against what is on the branch
Written by SCR-B for Daedalus, 2026-10-21. Branch `claude/scr-b` at 23858e0 (base `claude/game` @ 98fc43c, Phase A code with PKG-18 reverted). Every cite is a file under `src/battle/` and a function or table in it, found by grep and range reads.

**Scoring.** `exists`: the code that would produce the step is on the branch (proving it is the package's job). `partial`: part of it is, named in the cell. `missing`: nothing yet. The `[probe]` / `[eyes]` / `[both]` tag at the end of each "Player sees" cell in the scripts says how the step is checked: through `window.__probe` (`src/dev/probe.ts`: `state`, `advance`, `act`), by a person looking, or both.

## Totals

| Script | Steps / checks | exists | partial | missing | First score |
|---|---|---|---|---|---|
| EXP-07 boarding over comms | 11 | 1 | 5 | 5 | 1/11 exist |
| EXP-08 scuttle, repelling on the flagship | 13 | 1 | 7 | 5 | 1/13 exist |
| EXP-09 morale breaks a fleet | 11 | 4 | 5 | 2 | 4/11 exist |
| EXP-10 lied to, and catching it | 13 | 4 | 3 | 6 | 4/13 exist |
| EXP-11 intent, amend, pushback | 13 | 0 | 5 | 8 | 0/13 exist |
| EXP-12 bridge staff | 10 | 0 | 2 | 8 | 0/10 exist |
| EXP-13 commodores and defection | 11 | 0 | 2 | 9 | 0/11 exist |
| EXP-14 every maneuver | 11 | 2 | 5 | 4 | 2/11 exist |
| EXP-15 AI admirals of four worlds | 11 | 2 | 5 | 4 | 2/11 exist |
| **Play steps** | **104** | **14** | **39** | **51** | **14/104** |
| WORLD-03 reference battles | 8 | 1 | 3 | 4 | 1/8 exist |
| WORLD-04 collapse on flagship/admiral loss | 11 | 4 | 4 | 3 | 4/11 exist |
| WORLD-05 lies caught by the sensor officer | 9 | 5 | 0 | 4 | 5/9 exist |
| WORLD-06 admiral styles, deliberate mistakes | 10 | 3 | 4 | 3 | 3/10 exist |
| **World checks** | **38** | **13** | **11** | **14** | **13/38** |
| **All** | **142** | **27** | **50** | **65** | **27/142** |

Cross-cutting gaps every script hits: one setup only (`sim/setups/saturn-12v12.ts`, so no second location, roster fixture, reinforcement wave or tanker); no fighters in the sim (`sim/types.ts` BattleClass has none; `Order.task` is "stored; fighters are a later package"); no captain or officer memory (`Captain` in `sim/types.ts` has no log); no captain file UI.

## EXP-07: board a ship and fight it out over comms

| Step | Needs | On the branch | Score |
|---|---|---|---|
| 1 | a second location | only `sim/setups/saturn-12v12.ts` SATURN_12V12 | missing |
| 2 | breach report + Bridge/Reactor/Both decision | breach line `sim/comms/lines.ts` MARINE.boardBreach; no route report type in `sim/comms/types.ts` ReportType | partial |
| 3 | route state and progress reports | `sim/boarding/types.ts` BoardFight has no route or progress; MARINE.boardFight lines are generic | missing |
| 4 | Reactor: slower, blocks a scuttle | none (`sim/boarding/boarding.ts` stepBoarding resolves one Lanchester fight) | missing |
| 5 | Both: split force | none | missing |
| 6 | reinforcement request, Reinforce/Pull back | `sim/comms/marines.ts` marineWatch, marineTimeout; `sim/boarding/boarding.ts` launchBoarding (reinforcing), pullBack | exists |
| 7 | defender chooses to pull crew off guns | automatic for every boarded ship: `boarding.ts` gunneryMul (BOARDING.crewOffGunsMul), defenders (armedCrewFrac); no choice, no report | partial |
| 8 | surrender hail from inside | none | missing |
| 9 | capture, then prize crew size chosen | capture and colour flip `boarding.ts` capture path (prize = true, prize master); size fixed at BOARDING.prizeCrewFrac | partial |
| 10 | prize crew drawn from the captor | prize gunnery `boarding.ts` gunneryMul (prizeGunneryMul); captor's marines and crew are not reduced | partial |
| 11 | summary: prizes, prize crews, prisoners | `sim/boarding/summary.ts` prizeSummary, `sim/losses.ts` fleetLosses; no prisoners, no prize crew | partial |

## EXP-08: scuttle, and repelling a boarding of your flagship

| Step | Needs | On the branch | Score |
|---|---|---|---|
| 1 | enemy captain's trait visible as a warning | `view/tactical/intel.ts` shows shield sides only | missing |
| 2 | route decision with a Fanatic warning | none (see EXP-07 step 2) | missing |
| 3 | officer memory of an overruled warning | none | missing |
| 4 | scuttle charge as a timed urgent | `boarding.ts` stepBoarding scuttle is one roll (BOARDING.scuttleAt, scuttleChance), instant; ReportType `scuttled` after the fact | partial |
| 5 | back to the pods, the blast | `scuttled` event, wreck, MARINE.scuttled lines, `view/director/numbers.ts` BEATS.scuttled; no pod recall under a timer | partial |
| 6 | Reactor route stops a scuttle | none | missing |
| 7 | scuttle outcome by distance and time, not a coin | seeded and repeatable, but a coin (`scuttleChance` 0.5) | partial |
| 8 | sensor officer names a boarding push ≥ 5 s ahead | telegraph event `sim/admiral/admiral.ts` (TELEGRAPH, JUPITER.telegraphLeadS), Mars style is a control (`admiral/state.ts` AdmiralStyle 'mars'); no sensor officer line | partial |
| 9 | marine channel beside the fleet queue | urgent `boardersInbound` (`comms/tick.ts`), MARINE.boardBreachUs/boardFightUs; one queue in `view/comms/CommsHud.tsx` | partial |
| 10 | order gun crews to the decks, master of guns protests | effect automatic (gunneryMul); no order, no protest | partial |
| 11 | a deck choice with a cost in his own people | none | missing |
| 12 | "ship's clear"; fleet morale dips while the flagship is boarded | MARINE.repelledUs; no morale effect from the flagship being boarded (`numbers.ts` MORALE) | partial |
| 13 | fleet timeouts while he looks inward | `comms/core.ts` recordTimeout, `comms/tick.ts` timeouts, `Battle.stats.timeoutDecisions` with trait | exists |

## EXP-09: morale breaks a fleet

| Step | Needs | On the branch | Score |
|---|---|---|---|
| 1 | wings with morale | side morale only (`SideState.morale`); no wings in `sim/types.ts` | missing |
| 2 | one wing wavers first | per-ship `breaking` urgent (`comms/tick.ts`), `captains.ts` breakThreshold; no wing | partial |
| 3 | broken ship runs, spool visible | `battle.ts` breakShip, escape (spool, ESCAPE.jumpSpool), BEATS.break; no spool glow in `view/scene.ts` | partial |
| 4 | pinned, reported, strikes | `battle.ts` escape (massLockRange, strikeWhenPinnedS), `boarding/masslock.ts` massLocked; no "pinned" report | partial |
| 5 | unpinned jumps, counted fled | `battle.ts` escape → shipOut 'fled' | exists |
| 6 | Fanatic never strikes | `battle.ts` breakShip and escape skip Fanatic | exists |
| 7 | admiral taken, collapse, line said | `boarding.ts` capture → MORALE.flagshipLost to every ship; no "admiral is our prisoner" line | partial |
| 8 | admiral as a person apart from the flagship | none (the admiral is the flagship: `battle.ts` "The flagship carries the admiral") | missing |
| 9 | pursue / hold | `battle.ts` breakShip ask(…'pursue'); request kind 'pursue' | exists |
| 10 | own low-Nerve captain warns, breaks sooner | `comms/tick.ts` 'breaking' urgent; `captains.ts` breakThreshold, moraleLossMul by Nerve | exists |
| 11 | end screen counts by kind, cause named | `losses.ts`, `summary.ts`, `battle.ts` end reason; no pinned-then-struck count, no admiral cause | partial |

## EXP-10: lied to, and catching it

| Step | Needs | On the branch | Score |
|---|---|---|---|
| 1 | Optimist overstates shields | `comms/core.ts` reportedHull leans by CANDOUR.trait, but for hull only, not shields | partial |
| 2 | Pessimist understates | same, hull only | partial |
| 3 | honest captain within accurateWithin | reportedHull (Candour 10 = truth), COMMS.accurateWithin | exists |
| 4 | "Status?" shaded, free | `comms/command.ts` ping, POINTS.ping 0 | exists |
| 5 | sensor officer's true figure, contradiction | no sensor officer (`comms/types.ts` OfficerId has none) | missing |
| 6 | own true arcs in the tactical view | `view/tactical/intel.ts` shieldArcs (own ships true) | exists |
| 7 | a check costs time | none | missing |
| 8 | mood moves the shading | CANDOUR.mood in reportedHull | exists |
| 9 | Ambitious claims another's kill | kill credit is always true (`comms/tick.ts` 'kill') | missing |
| 10 | disloyal captain reports less, vaguely | none | missing |
| 11 | captain file with the accuracy record | record kept: `comms/types.ts` Accuracy, CommsState.accuracy; no file on screen | partial |
| 12 | weak sensor officer | none | missing |
| 13 | record carried to the next battle | none; Phase C (captains persist across battles) | missing |

## EXP-11: intent, amend, pushback

| Step | Needs | On the branch | Score |
|---|---|---|---|
| 1 | intent order, 2 points | no `intent` in `types.ts` OrderKind; POINTS has no intent cost | missing |
| 2 | plan said back, ghost line | ghost lines `sim/maneuvers/fly.ts` previewManeuver, `view/tactical/paths.ts`; no plan line | partial |
| 3 | captain adapts the plan | none | missing |
| 4 | poor captain takes the direct route | `maneuvers/numbers.ts` SHADE (Bold, Glory-hound `direct: true`) | partial |
| 5 | missed deadline reported | none | missing |
| 6 | Amend with a condition | `comms/types.ts` Answer has no condition | missing |
| 7 | amend "cover first" | request kind 'cover' exists (`types.ts` RequestKind); no amend | missing |
| 8 | protest, confirm, remembered | `comms/command.ts` pushback 'protest', CommandResult.protest; no memory | partial |
| 9 | Fanatic refuses, Relieve / Let it go | pushback: Fanatic refuses withdraw; no relieve answer | partial |
| 10 | defiance on a denial | none (Glory-hound acts only on a timeout, BRIDGE §4) | missing |
| 11 | back him / order back / relieve | none | missing |
| 12 | initiative, reported after | none (ram not built) | missing |
| 13 | pushback by traits, not dice | trait rules in pushback, but refusal and protest are seeded draws (PUSHBACK.refuseChanceAtZero, protestBase) | partial |

## EXP-12: bridge staff

| Step | Needs | On the branch | Score |
|---|---|---|---|
| 1 | four staff officers with abilities | `comms/types.ts` OfficerId has flagLieutenant, guns, marines (no sensor); abilities only `officerJudgement` for marines | partial |
| 2 | flag lieutenant groups and folds | `comms/tick.ts` fold, `lines.ts` SUMMARY (folds status; does not group duplicates or rank by ability) | partial |
| 3 | weak flag lieutenant buries reports | none | missing |
| 4 | master of guns recommends fleet targets | `gunsOn` is the flagship's own guns (`comms/officers.ts` officerOrder) | missing |
| 5 | weak master of guns | none | missing |
| 6 | jump signature urgent before reinforcements | no reinforcements in any setup | missing |
| 7 | marine commander proposes a launch | marine decisions only once aboard (`comms/marines.ts`) | missing |
| 8 | comms array as a system | `types.ts` SystemId has no comms | missing |
| 9 | courier by fighter | no fighters | missing |
| 10 | staff officer lost to boarders | none | missing |

## EXP-13: commodores and defection

| Step | Needs | On the branch | Score |
|---|---|---|---|
| 1 | promote, squadron | none (grep: no "commodore" or "squadron" in `src/battle`) | missing |
| 2 | squadron traffic filtered | none | missing |
| 3 | one order to a squadron | none | missing |
| 4 | urgent passes through | urgents exist (`comms/tick.ts`); no commodore between | partial |
| 5 | low-Candour commodore hides | none | missing |
| 6 | commodore with an intent | none | missing |
| 7 | relieve a commodore | none | missing |
| 8 | defection signs, sensor watch | none | missing |
| 9 | defection: comms dead, colours change | none (side flips only by capture) | missing |
| 10 | board the defector, crew split | capture flips side (`boarding.ts`); crew loyalty apart from the captain's: none | partial |
| 11 | acting on signs pays | none | missing |

## EXP-14: every maneuver

| Step | Needs | On the branch | Score |
|---|---|---|---|
| 1 | eight in the picker | six: `maneuvers/types.ts` MANEUVER_NAMES, `view/tactical/picker.ts` MANEUVER_LABELS | partial |
| 2 | screen with fighters | no fighters | missing |
| 3 | ram, telegraphed approach | `fly.ts` HELM_MANEUVER.ram = null ("ram is not built") | missing |
| 4 | ram damage, dodge | none | missing |
| 5 | fighting withdrawal, covering in turn | `maneuvers/shapes.ts` fightingWithdrawal (alternate ships hold `cover` legs) | exists |
| 6 | captain picks the maneuver for a plain order | trait shading `shapes.ts` (shadeOf, rangeOf, flankingArc side) and `fly.ts` COURSE_ORDERS; no named maneuver chosen or said | partial |
| 7 | escorts break away in sequence | `shapes.ts` plan 'boardingRun' (escort spread and lead); staggered break-off not confirmed | partial |
| 8 | flag captain ram and hold station on a squadron | HELM_MANEUVER: four mapped, ram null, holdStation = holdPosition | partial |
| 9 | Helm on the new maneuvers | `maneuvers/pilot.ts` limitsOf by Helm (applies to any shape once it exists) | partial |
| 10 | look never changes the result | rule 3 (sim imports nothing from view); `summary.ts` hashState | exists |
| 11 | enemy flies named maneuvers | `admiral/admiral.ts` issues no `maneuver` order (0 hits) | missing |

## EXP-15: AI admirals of four worlds

| Step | Needs | On the branch | Score |
|---|---|---|---|
| 1 | world and difficulty chosen in setup | `admiral/state.ts` AdmiralStyle, `admiral/numbers.ts` DIFFICULTY (easy/normal/hard), PHASE_A_DIFFICULTY; no setup choice | partial |
| 2 | Mars: boards early and often, telegraphed | 'mars' is the aggressive control (`admiral.ts` admiral('mars'), 'aggressive-admiral') | partial |
| 3 | Jupiter: methodical range | `admiral.ts` keepRange, watch; JUPITER table; WORLD-02 check 7 passed 9/10 (reports/PKG-07.md) | exists |
| 4 | Moon: strikes at the flagship | none | missing |
| 5 | Mercury: retreats early | none | missing |
| 6 | a tell per style | boarding-push telegraph only (`admiral.ts`, TELEGRAPH) | partial |
| 7 | sensor officer names the tell | no sensor officer | missing |
| 8 | easy: deliberate mistakes by kind | DIFFICULTY.mistakeRate: random second-best target (`admiral.ts` "mistake: takes …") | partial |
| 9 | easy loses more to scripted-good | the knob exists; never measured (Phase A runs normal only) | partial |
| 10 | AI uses the player's order set | `admiral.ts` through `orders.ts` order(); WORLD-02 check 5 | exists |
| 11 | end screen names the style | none | missing |

## World checks

| Check | On the branch | Score |
|---|---|---|
| W03-1 eight reference setups | one setup | missing |
| W03-2 sound play beats mistake | runner `scripts/sim.mjs`, `sim/policies.ts` POLICIES; none of its 7 policies fit | missing |
| W03-3 decisive event follows decision | none | missing |
| W03-4 across rosters | `captains.ts` fairRosters, `sim/fair-rosters.test.ts` | partial |
| W03-5 winner does not swing | `checks.ts` world02 check 2 pattern | partial |
| W03-6 trait swap changes the event | `battle.ts` VARIANTS (swap-nerve-judgement) pattern | partial |
| W03-7 determinism | `summary.ts` hashState; WORLD-02 check 1 | exists |
| W03-8 map-only facts kept out | none | missing |
| W04-1 flagship capture → strikes in 30 s | MORALE.flagshipLost (35) on capture; never measured | partial |
| W04-2 flagship + admiral → side breaks | no admiral | missing |
| W04-3 admiral alone | no admiral | missing |
| W04-4 no break before half strength | `battle.ts` side check: MORALE.sideBreakStrength 0.5, but also breaks on mean morale < MORALE.sideBreak (25) | partial |
| W04-5 wing breaks first | no wings | missing |
| W04-6 Fanatics never strike | `battle.ts` breakShip, escape | exists |
| W04-7 no jump while locked | `battle.ts` canJump, `boarding/masslock.ts` | exists |
| W04-8 pinned strike more | ESCAPE.strikeWhenPinnedS | exists |
| W04-9 Nerve orders breaking | `captains.ts` breakThreshold, moraleLossMul | exists |
| W04-10 decapitate beats idle | scripted-good exists; no decapitate policy | partial |
| W04-11 across rosters | fairRosters | partial |
| W05-1 low Candour errs more | `comms/core.ts` reportedHull (dishonesty = (10 − Candour)/9) | exists |
| W05-2 traits lean right | CANDOUR.trait | exists |
| W05-3 mood moves it | CANDOUR.mood | exists |
| W05-4 sensor officer near truth | none | missing |
| W05-5 sensor officer catches lies | none | missing |
| W05-6 checking pays | no trust/check policies | missing |
| W05-7 record orders by Candour | `comms/types.ts` Accuracy (reports, accurate, bias, absErr) | exists |
| W05-8 disloyal report less | none | missing |
| W05-9 a line never moves the battle | `comms/types.ts` CommsState.rng ("picking a line never moves the battle's dice") | exists |
| W06-1 classifier tells styles apart | two styles only | missing |
| W06-2 Mars boards most | mars control | partial |
| W06-3 Jupiter longest range | WORLD-02 check 7 | exists |
| W06-4 Moon at the flagship | none | missing |
| W06-5 Mercury leaves first | none | missing |
| W06-6 every main move telegraphed | boarding push only | partial |
| W06-7 easy: named mistakes | mistakeRate, `AdmiralState.mistakes` count | partial |
| W06-8 easy easier for skill | DIFFICULTY table | partial |
| W06-9 no cheating on vision | `admiral/state.ts` SeenShip/SeenSide, `admiral/numbers.ts` SENSE | exists |
| W06-10 same order set | WORLD-02 check 5 | exists |

## Suggested packages, along code lines

Rule 9 registry files: `types.ts`, `orders.ts`, `battle.ts`, `summary.ts`, `checks.ts`, `numbers.ts`, `policies.ts` (all `src/battle/sim/`). "Extends" below means registry lines only; "changes" means an existing line, which needs the package to name that line as its own or a Request.

| Package | Scripts | Own new files (suggested) | Extends (registry) | Changes existing lines in | Collides with |
|---|---|---|---|---|---|
| **S2** setups and rosters (new; Talos + Kalliope) | every script's start state; WORLD-03 rows | `sim/setups/europa-*.ts`, `titan-*.ts`, `phobos-*.ts`, `moon-*.ts`, `mercury-*.ts`, `sim/setups/rosters/*.ts`, reinforcement waves, tankers | `types.ts` BattleSetup fields (reinforcements, body), `checks.ts` rows | none | nobody if first; all others start on it |
| **F1** fighters as sim entities (new; Talos + Palamedes) | EXP-14 s2, EXP-12 s9, boarding escorts, AI tells | `sim/fighters/*.ts` | `types.ts` (a fighter wing type, `Order.task` read), `battle.ts` one step() call, `numbers.ts` entry | `boarding/boarding.ts` pods-en-route losses (pdChance) | N2 (pods en route), M2 (screen), B5 (courier) |
| **N2** boarding as the decider | EXP-07 s2–5, 7–11; EXP-08 s1–7, 10–11 | `sim/boarding/routes.ts`, `scuttle.ts`, `prize.ts`, `crewdeck.ts` | `types.ts` LogEvent members, `summary.ts` prisoners, `battle.ts` call line | `boarding/boarding.ts` stepBoarding scuttle roll (lines 284–290), gunneryMul, capture prize crew (352–363): PKG-05's, so N2 must name them | **B4** (same fight state in `boarding/types.ts` BoardFight; MARINE lines), N3 (capture's flagshipLost lines 343–346) |
| **B4** boarding over comms | EXP-07 s2–3, 6, 8; EXP-08 s2–5, 9, 11 | `sim/comms/boardingTalk.ts` | `comms/types.ts` ReportType members, `lines.ts` MARINE keys (comms/ is not a rule-9 file but is shared) | `comms/marines.ts` marineWatch | **N2**: suggest N2 then B4 on one branch line, or one package |
| **N3** morale and breaking | EXP-09; EXP-08 s12; WORLD-04 | `sim/morale/wings.ts`, `sim/morale/admiral.ts` | `types.ts` (wing ids, `SideState.admiral` person), `numbers.ts` MORALE entries, `summary.ts` counts | `battle.ts` breakShip / side check / escape (550–640) and `boarding.ts` capture lines 343–346 | N2 (capture), AI2 (`admiral/admiral.ts` withdrawal watch reads MORALE.sideBreakLosses), B5 (squadrons vs wings: decide if one thing) |
| **B2** truth and checking | EXP-10; WORLD-05 | `sim/comms/sensor.ts`, `sim/comms/truth.ts`, `view/comms/CaptainFile.tsx` | `comms/types.ts` OfficerId 'sensor', `policies.ts` trust/check entries | `comms/core.ts` reportedHull (hull → shields too), `comms/tick.ts` kill credit | **B5** (OfficerId, staff panel), B3 (captain memory) |
| **B3** intent, amend, pushback | EXP-11 | `sim/comms/intent.ts`, `amend.ts`, `memory.ts` | `types.ts` OrderKind 'intent', `orders.ts` case, `comms/numbers.ts` POINTS.intent | `comms/command.ts` pushback (draws → trait rules) | M2 (intent turns into maneuvers via `maneuvers/shapes.ts` plan), B5 (commodore intents), AI2 (WORLD-06 check 10: AI must use intents too) |
| **B5** bridge staff and commodores | EXP-12, EXP-13 | `sim/comms/staff.ts`, `commodore.ts`, `defection.ts`, `view/comms/StaffPanel.tsx` | `comms/types.ts` OfficerId, `types.ts` SystemId 'comms', `numbers.ts` SYSTEMS_BEHIND entry | `comms/tick.ts` fold, `comms/queue.ts` queue (filter), `view/comms/CommsHud.tsx`, `controller.ts` | B2 (sensor officer), B3 (orders through commodores), N3 (wings) |
| **M2** the rest of the maneuvers | EXP-14 | `sim/maneuvers/ram.ts`, `screen.ts` | `maneuvers/types.ts` MANEUVER_NAMES (union add), `view/tactical/picker.ts` labels | `maneuvers/fly.ts` HELM_MANEUVER `ram: null` line, `shapes.ts` plan switch | F1 (screen needs fighters), B3, AI2 (enemy flies maneuvers: `admiral.ts`) |
| **AI2** admiral styles | EXP-15; WORLD-06 | `sim/admiral/styles/mars.ts`, `moon.ts`, `mercury.ts`, `mistakes.ts` | `admiral/state.ts` AdmiralStyle members, `admiral/numbers.ts` entries, `policies.ts` entries | `admiral/admiral.ts` admiral() dispatch, `scriptedBad`, mistakeRate use | N3, M2, B3 (all change what it may order) |
| **Q-B** | all, cold | `gamestudio\qa\` only | none | none | none |

Suggested order: S2 and F1 first (every script needs a second location; three packages need fighters), then N2 → B4 on one line, N3 beside them, then B2 and B3, then B5 and M2, then AI2, then Q-B. N3 and N2 both edit `boarding.ts` capture: put the flagship-lost lines in N3's name and have N2 leave them.

## Flags for Daedalus

**The vision against itself**
1. VISION §16 Phase B says "AI admiral styles for all seven worlds"; the prompt's done point 7 says "at least four". Scripts follow the prompt.
2. VISION §7a's flagship crew (flag captain/helm, master of guns, shields and engineering, marine commander, fighter command) and BRIDGE §2's staff (flag lieutenant, sensor officer, master of guns, marine commander) are two different lists. Read here as one bridge of seven roles; code has six `OfficerId`s and no sensor officer.
3. NAVY §3 lets only the admiral leading in person board a flagship; VISION §7a has the marine commander "send the pods at their flagship". Already ruled by Daedalus for VISION (`boarding.ts` cannotBoard comment), still on Caleb's list.
4. NAVY §3 makes the scuttle a "may" by a losing Fanatic; BRIDGE §7 and battle 28 make it a 40-second crisis with a choice inside, and a reactor route that stops it. The code's coin (`scuttleChance` 0.5) fits the first and works against "never luck". Scripts take BRIDGE §7.
5. VISION §7 "Losing the flagship or admiral" treats them as two losses; code treats the admiral as the flagship. Nothing in Phase B's done points says how an enemy admiral is lost apart from its ship (EXP-09 s8, WORLD-04 checks 2–3 are `vision silent`).
6. NAVY §1 morale is per ship and per wing; code is per ship and per side. BRIDGE §10 squadrons and NAVY §4 wings may be the same thing; decide before N3 and B5 both build one.

**Needed by a done point, outside Phase B's packages**
7. Fighters: done point 6 (the screen), BRIDGE §8 couriers, and the boarding telegraph all need fighters in the sim; no Phase A or B package owns them. Suggested F1.
8. Locations: done points ask for "more than one location"; only Saturn's rings exists. Terrain effects (Titan haze, Io plumes, ring ice) and fortresses (stations, NAVY §6) are in no Phase B package; reference battles 13, 14, 15 need them and are left out of WORLD-03's eight.
9. Phase C, stopped there: the accuracy record "from past battles" (EXP-10 s13), battle 16's agent intel and battle 14's hidden squadron (map planning), defection driven by an enemy courting a house (intrigue and agents, R25), staff promoted or poached between battles, prisoners, ransoms and dock days. In Phase B these are setup flags or summary lines only.
10. Leading a boarding in person (NAVY decision 1; battles 7, 8, 15) is in no done point, though `BOARDING` has an unused leader quality. Not scripted.
11. Comms warfare (array, jamming, forged reports, couriers; BRIDGE §8, battles 24, 25) is in no done point; EXP-12 s8–9 and WORLD-03 ref-24 script the array and couriers only, for Daedalus to keep or cut.

**Readings assumed**
12. The four worlds for done point 7: Mars, Jupiter, the Moon, Mercury, because Earth needs fortresses, Saturn needs cover terrain, Venus needs swayed captains (agents).
13. "Deliberate mistakes" means mistakes of named, visible kinds, not today's random second-best target.
14. "Never luck" read strictly: decisions that can be modelled as distance, time and strength (the scuttle race, pushback) should be, and seeded draws are kept for gunnery and noise only. This changes Phase A code (pushback, scuttle) and needs Daedalus's ruling.
15. Setups, roster fixtures and policies named in the scripts (`europa-12v11`, `rosters/candour-mix`, `decapitate`, `trust-reports` and the WORLD-03 pairs) are proposed names; none exists.
16. Numbers chosen for bars where the vision gives none: collapse within 20 s / 30 s, Moon fire share ≥ 0.4, sensor catch rate ≥ 0.8, easy ≥ 2 mistakes per battle, error ratio ≥ 3. First pass, for Palamedes.
17. The prompt file (`Work\PROMPT-daedalus-phase-b.md`) is cited as the source, as Phase A cited its prompt; it is not yet filed under `vision/visions/` as the method's step 1 asks. Daedalus's to file.

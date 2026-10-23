# SCR-B: Phase B scripts and inventory
Seat: design (scripts, for Daedalus to review). Branch `claude/scr-b`, base `claude/game` @ 98fc43c. Not merged. 2026-10-21.

## Files written (all under `vision/scripts/`)
| File | What | Steps / checks |
|---|---|---|
| EXP-07.md | done point 1, part 1: routes, progress, reinforcement, crew off guns, prize crew | 11 |
| EXP-08.md | done point 1, part 2: Fanatic scuttle; repelling a boarding of his flagship | 13 |
| EXP-09.md | done point 2: wings waver, strike, run, pinned, admiral taken | 11 |
| EXP-10.md | done point 3: shaded reports, sensor officer, accuracy record | 13 |
| EXP-11.md | done point 4: intent, amend, protest, refusal, initiative | 13 |
| EXP-12.md | done point 5, part 1: bridge staff (plus comms array and courier, to keep or cut) | 10 |
| EXP-13.md | done point 5, part 2: commodores, and a commodore who defects | 11 |
| EXP-14.md | done point 6: screen, ram, fighting withdrawal, captain-chosen maneuvers | 11 |
| EXP-15.md | done point 7: Mars, Jupiter, Moon, Mercury admirals; easy makes named mistakes | 11 |
| WORLD-03.md | done point 8: nine reference-battle rows, sound play against the battle's mistake | 8 |
| WORLD-04.md | collapse on flagship or admiral loss, wings, mass lock, Nerve | 11 |
| WORLD-05.md | lying captains caught by the sensor officer | 9 |
| WORLD-06.md | admiral styles distinguishable; easy admiral's deliberate mistakes | 10 |
| PHASE-B-INVENTORY.md | every step and check against `src/battle/**`, package split, flags | |

**Scripts:** 13 (9 play, 4 world). **Play steps:** 104. **World checks:** 38. Bars use 24 of 30 seeds and, where a setup choice matters, 6 of 8 rosters (A3).

## Inventory totals
Play steps: 14 exist, 39 partial, 51 missing (14/104). World checks: 13 exist, 11 partial, 14 missing (13/38). All: 27/142 exist, 50 partial, 65 missing. Per script in the inventory's first table.

## Flags (full list of 17 in the inventory)
1. VISION §16 says admiral styles for all seven worlds; the prompt says at least four. Scripts follow the prompt; the four assumed are Mars, Jupiter, the Moon and Mercury (Earth needs fortresses, Saturn cover terrain, Venus agents).
2. Fighters are in no package, yet the screen (done point 6), couriers and the boarding telegraph need them. Suggested new package F1. A second location is also in no package: suggested S2 (setups, rosters, reinforcements, tankers).
3. The admiral is coded as the flagship; VISION §7 counts "flagship or admiral" as two losses and nothing says how an enemy admiral is lost apart from his ship.
4. The scuttle is a coin today (`scuttleChance` 0.5); BRIDGE §7 and battle 28 make it a timed crisis with a reactor route that prevents it. Reading "never luck" strictly would also change Phase A's seeded pushback draws: needs a ruling.
5. Phase C, stopped there: accuracy records across battles, map-planned battles 14 and 16, defection caused by agents, prisoners and ransoms.
6. N2 and B4 share the boarding fight state and MARINE lines; N2 and N3 share `boarding.ts` capture lines 343–346. Order them, or name the lines.

## Requests
None. No code or package files touched.

## Assumed, for Caleb to overrule
Every `(assumed)` and `(vision silent)` mark in the scripts, and inventory flags 12–17: the four worlds, "deliberate" meaning named mistake kinds, the strict reading of "never luck", proposed setup/roster/policy names, first-pass numbers in the bars, and the Phase B prompt not yet filed under `vision/visions/`.

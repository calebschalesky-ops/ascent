# WORLD-03: Play at least eight of the reference battles in spirit and get outcomes driven by decisions and captains' characters, never luck
Source: <local> done point 8 (his words, above); VISION §7b; battle-sims/01-17 battles 3, 5, 8, 10, 11–12; 18-23 battle 22; 24-29 battles 24, 27, 28. The battles are examples, not scripts: each row below keeps a battle's situation and its lesson, not its timings or names.
Run: the sim runner, one reference setup per row (`ref-NN`, assumed names), seeds 1–30, rosters 1–8 (amendment A3), max 15 in-game minutes, two named policies per row: the battle's sound play and its mistake
| Ref | Situation (setup) | Sound play | Mistake | The decisive event (sim key) |
| ref-03 | convoy at Saturn's rings, raiders hidden in the ice | `hold-the-ring-edge` | `chase-over-protest` | the chasing ship is captured or lost |
| ref-05 | same, the admiral takes the helm | `stay-admiral` | `helm-shows-stern` | the flagship's rear side falls and it is boarded; fleet timeouts during the helm |
| ref-08 | same, a war house jumps in at 3:00 | `answer-the-jump-urgent` | `board-and-ignore-urgents` | player ships lost |
| ref-10 | attacking a stronger depot | `withdraw-on-signs` | `fight-on` | player ships brought home |
| ref-11 | even line, a Glory-hound defies | `back-the-charge` | `order-him-back` | enemy flagship taken / the defiant ship lost |
| ref-22 | a commodore turns | `act-on-drift` | `ignore-drift` | player shield sides open when the defectors fire |
| ref-24 | the comms array falls | `intents-and-standing-orders` | `direct-orders-only` | player ships lost after the array falls |
| ref-27 | his flagship boarded | `pull-gun-crews-and-reserve` | `leave-guns-manned` | the flagship held |
| ref-28 | a Fanatic's ship | `reactor-first` | `bridge-first` | scuttled with player marines aboard |

| Check | By | Measured as (sim key) | Pass range | Seeds needed |
| 1 | end | rows built: reference setups with both policies registered | rows ≥ 8 | all |
| 2 | end | per row: sound play beats the mistake | outcome rank higher, or equal rank and fewer player ships lost (WORLD-02 amended rule) | 24 of 30, per row, on ≥ 8 rows |
| 3 | end | per row: the decisive event follows the decision | event rate with the mistake ≥ 0.7 and with the sound play ≤ 0.3 | 24 of 30, per row |
| 4 | end | per row: the result holds across rosters (A3) | check 2 passes | 6 of 8 rosters, per row |
| 5 | end | never luck: same row, same policy, the winner does not swing with the seed | the same winner | 24 of 30, per row |
| 6 | end | characters decide: swap the row's key captain's trait (the defiant Glory-hound to By-the-book, the Fanatic to Cautious, the By-the-book to Veteran in ref-24) | the decisive event's rate changes by ≥ 0.4 | 24 of 30 seed pairs |
| 7 | end | determinism: same row, seed and policy run twice | final state hash equal | 30 of 30 |
| 8 | end | no ref setup uses a strategy-map fact the sim cannot hold (ref-14 hidden squadron, ref-16 agent intel) | such rows are given as start state only and counted out of check 1 | all |
Feel checks (Caleb only): playing each one by hand, does he recognise the battle it came from? When he loses one, does he know which decision lost it?

Notes: battles 13 (Io radiation), 14 (Callisto station), 15 (Ganymede station) and 16 (planned on the map) need terrain, fortresses or the strategy map, none of which is in a Phase B package; they are not in the eight. Battle 6 and the convoy rows need tankers (non-combat ships) in a setup.

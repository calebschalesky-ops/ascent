# EXP-02: Command only through captains: the comms queue, direct orders, the flagship's crew
Source: vision/visions/2026-10-21-phase-a-prompt.md, done point 2 ("reports arrive in a comms queue, he answers with one key, gives direct orders to ships, and gives his own flagship's crew orders (guns on a target, maneuver, shields)")
Start state: new skirmish, seed 2
| Step | How | Player does | Player sees (checkable) | Vision ref |
| 1 | ui | Starts the battle | A comms queue on screen; within 30 s at least one report arrives with portrait/name, ship, mood and 2–3 answers | BRIDGE §4 "The queue" |
| 2 | ui | Waits for an urgent report | It is red, jumps above amber decisions; grey status lines are folded into a summary | BRIDGE §4 three levels |
| 3 | ui | Presses Q on the top decision | The report closes; the captain acknowledges on comms; the ship's behaviour changes to match (probe: that ship's order = the chosen answer) | BRIDGE §4 "Answering" (Q/E/R) |
| 4 | ui | Presses Tab, then E | The second report is answered with its second option | BRIDGE §4 |
| 5 | probe | Lets a decision report go unanswered | After its timeout (4–12 s) it closes; comms says what the captain chose; probe shows the choice came from that captain's Judgement and trait, not a coin | BRIDGE §4 "Timeouts", done point 6 |
| 6 | ui | Selects one of his ships (roster strip or click), selects an enemy, chooses "attack" | An order line from his ship to the target; the captain acknowledges, or refuses out loud | §7a "Orders are: choose a ship… a target… what to do"; BRIDGE §12b rule 2 |
| 7 | ui | Orders the master of guns: all batteries on a chosen enemy | The flagship's fire shifts to that target (probe: flagship gun target = it) and the officer answers in person | §7a flagship crew table |
| 8 | ui | Orders shields and engineering: everything to the port shield | The flagship's port side grows and the others shrink (probe: shield power split) | §7a, NAVY §1 |
| 9 | ui | Orders the flag captain/helm a maneuver (e.g. "bring us across their bow") | The flagship flies it (see EXP-03) and the officer answers | §7a |
| 10 | ui | Orders the marine commander to send pods at a target, and fighter command to screen them | Pods launch from the flagship toward it with fighters escorting (probe: boarder craft en route, fighter task = escort) | §7a |
| 11 | ui | Tries to steer any ship other than the flagship by hand | He cannot; only orders move them | done point 2 "only through captains" |
| 12 | ui | Gives several orders in a row | Command points pace them: an order costs points; the meter shows; an order with too few points is refused with a reason (assumed: the vision names command points but no numbers) | §8 "Command points pace orders" |
Feel checks (Caleb only): can he "give a meaningful order every few seconds without taking his eyes off the battle"? Do the captains sound like people?

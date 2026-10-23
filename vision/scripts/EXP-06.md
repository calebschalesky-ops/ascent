# EXP-06: Break the enemy's morale and win, or lose
Source: done point 5 ("Break the enemy's morale and win, or lose, with the outcome decided by decisions and captains' characters, never luck"); NAVY decision 4, §1 morale
Start state: new skirmish, seed 6
| Step | How | Player does | Player sees (checkable) | Vision ref |
| 1 | probe | Reads morale | Every ship has morale 0–100 and every wing too; he sees it only through reports and visible behaviour, not as a number on enemy ships | NAVY §1, pillar 2 |
| 2 | ui | Destroys or captures enemy ships | Enemy morale falls with losses, with being outnumbered, and faster for low-Nerve captains | NAVY §1 morale row |
| 3 | ui | Captures or destroys the enemy flagship | The enemy fleet's morale collapses (probe: every enemy ship's morale drops by a large step the same tick) | VISION §7 "Losing the flagship… breaks a fleet" |
| 4 | ui | Watches broken ships | A broken ship tries to jump away or strikes its colours; comms and the director show it | NAVY §1 |
| 5 | ui | Pins a broken ship | Mass lock stops a pinned ship jumping away (assumed: within a set range of his ships) | VISION §7 "Mass lock" |
| 6 | ui | Breaks half the enemy fleet | The enemy fleet breaks; the battle ends in his victory | NAVY decision 4 |
| 7 | ui | In a second run (seed 6), plays badly: loses his flagship | His own fleet breaks; the battle ends in defeat, shown on screen | done point 5 "or lose" |
Feel checks (Caleb only): does the break feel earned, "slow and heavy at first, then sudden when one line breaks"?

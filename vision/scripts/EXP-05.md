# EXP-05: Open a shield side, board an enemy ship, capture it
Source: done point 4 ("Open a shield side, board an enemy ship and capture it (it changes to his colours)"); NAVY §1, §3
Start state: new skirmish, seed 5
| Step | How | Player does | Player sees (checkable) | Vision ref |
| 1 | ui | Orders two ships (or the master of guns) to fire on one side of an enemy cruiser | That side's shield falls (seen as the arc in the tactical view; reported by his captain, maybe wrongly); probe: that side = 0 | NAVY §1 "four facings" |
| 2 | probe | Checks the enemy shifts power | The enemy captain shifts power toward the threatened side or turns a fresh side (probe: shield power changed or heading changed) | NAVY §1 counter |
| 3 | ui | Orders a boarding run at a side that is still up | The pods are deflected; comms reports it (probe: boarder outcome = deflected) | NAVY §3 step 1 |
| 4 | ui | Orders a boarding run at the open side | Pods cross; some may be lost to point defence; breach takes about 2.5 s; marine commander reports progress | NAVY §3 steps 2–3, BRIDGE §7 |
| 5 | ui | Watches the fight inside | Reports of the fight; the enemy's gunnery drops while it is boarded | NAVY §3 steps 4–5 |
| 6 | ui | Answers a reinforce/pull-back decision | Reinforcing sends more pods; pulling back ends it | NAVY §3 step 5 |
| 7 | ui | Wins the fight inside | The ship strikes its colours and changes to his house colours; it joins his fleet and the roster (probe: side flipped, prize = true) | done point 4 |
| 8 | probe | Checks the captured ship | It needs a prize crew: it fights at reduced crew (assumed reading of "prize crews") | NAVY §3 step 6, VISION §7 |
| 9 | probe | Destroys a different enemy instead | A wreck: nothing to capture, and it counts for less than a capture in the end summary | pillar 3 |
Feel checks (Caleb only): is the moment of capture a moment? Does boarding feel like the decisive action?

# EXP-10: Be lied to and catch it (done point 3)
Source: <local> done point 3 ("Be lied to and catch it: a captain's report shades the truth by Candour and mood; the sensor officer gives the true picture; each captain's file keeps a report-accuracy record."); BRIDGE §2, §3; VISION §7a "Seeing is not knowing"
Start state: new skirmish at Saturn's rings, seed 10, player roster fixed: one Optimist at Candour 2, one Pessimist at Candour 3, one honest captain at Candour 9, the rest drawn (fixture `rosters/candour-mix`, assumed)
| Step | How | Player does | Player sees (checkable) | Vision ref |
| 1 | ui | Lets the Optimist's ship take fire on one side | His report says "shields holding" while that side is near a third [both]; probe: reported figure − true ≥ 0.2 | BRIDGE §3 Optimist |
| 2 | ui | Lets the Pessimist's ship take light fire | "We're being torn apart" with half the shields up [both]; probe: reported − true ≤ −0.2 | BRIDGE §3 Pessimist |
| 3 | probe | Compares the honest captain | Her figures land within `COMMS.accurateWithin` of the truth | BRIDGE §3 "An honest, steady captain reports what they see" |
| 4 | ui | Asks the Optimist "Status?" | The answer is shaded the same way, and costs no points [both] | BRIDGE §4 "Asking" |
| 5 | ui | Asks the sensor officer about that ship | The sensor officer gives the real figure and says it contradicts the captain ("Her port side is at 20%, not holding") [both]; probe: sensor figure within 0.05 of the truth | BRIDGE §2 sensor officer; §3 "You can check" |
| 6 | ui | Checks it himself in the tactical view | His own ship's true shield arcs are drawn [eyes] | BRIDGE §3 "a look in the tactical view yourself" |
| 7 | probe | Asks the sensor officer twice in a row | A check costs time: the answer comes after a delay, one check at a time (assumed: the vision says checking "costs time and attention" and gives no figure) | BRIDGE §3 |
| 8 | ui | Watches the Optimist's mood fall to strained, then panicked | The shading changes with mood [both]; probe: the report's lean moves with mood | BRIDGE §3 "Their Candour and mood decide" |
| 9 | ui | Watches a kill near an Ambitious captain | The Ambitious captain claims a kill another ship made; the sensor officer or the flag lieutenant's summary gives the real credit [both] | BRIDGE §3 Ambitious |
| 10 | probe | Watches a captain with loyalty under 30 | Reports less often and later, with a vague position ("On station") | BRIDGE §3 "A disloyal captain… reports less and later"; battle 22 |
| 11 | ui | Opens the Optimist's captain file | A report-accuracy record for this battle: reports made, how many were accurate, which way he leans [both]; probe `accuracy[ship]` matches the file | BRIDGE §3; VISION §8 |
| 12 | probe | A weak sensor officer in the same battle | Misses or is slow to contradict (blind spots; probe: lower catch rate or longer delay than a strong one) | BRIDGE §2 "When they are weak" |
| 13 | probe | Starts a second battle with the same captains | The file still holds the first battle's record (Phase C: needs captains carried across battles; vision: "from past battles". Stops here; in Phase B the record covers one battle) | BRIDGE §3 last line |
Feel checks (Caleb only): "whom do you trust?" Does catching a lie feel like skill, not bookkeeping?

# EXP-13: Promote a commodore who filters a squadron's reports, and catch one who turns (done point 5, part 2)
Source: <local> done point 5 ("promote a commodore who filters a squadron's reports"); BRIDGE §6 "Defection", §10; VISION §7a "Squadrons carry orders"; battle-sims/18-23 battle 22 (example, not a script)
Start state: new skirmish at Titan, seed 13, 14 v 12; one player captain is Ambitious with loyalty flat at 52 and her house marked as courted by the enemy (setup `titan-14v12-defector`, assumed: in a skirmish, "courted by the enemy" is a setup flag; the agents behind it are later work)
| Step | How | Player does | Player sees (checkable) | Vision ref |
| 1 | ui | Promotes a captain to commodore and gives her 3 ships | A squadron with a commodore, shown in the roster [both]; probe `squadrons[]` (vision silent on when: assumed before the battle and in it) | BRIDGE §10 |
| 2 | ui | Watches the queue | That squadron's routine traffic stops coming to him; the commodore passes on what matters in her own words and Candour [both]; probe: status reports from squadron ships to the admiral = 0, commodore summaries ≥ 1 per 30 s | BRIDGE §10 |
| 3 | ui | Gives the squadron one order | All its ships act on it; the commodore passes it on [both] | VISION §7a "Squadrons carry orders to several ships at once" |
| 4 | ui | Lets a squadron ship take a hull breach | The urgent still reaches him, through the honest commodore [both] | BRIDGE §4 urgent |
| 5 | probe | Same seed, a commodore at Candour 2 | A squadron ship's shield failure is passed on late or not at all; the sensor officer still shows it | BRIDGE §10 "A bad one hides problems" |
| 6 | ui | Gives a commodore an intent ("keep their capitals busy") | The squadron runs on it without further orders [both] | battle 27; BRIDGE §5 |
| 7 | ui | Relieves a commodore mid-battle | Her squadron's traffic comes back to him [both] (assumed) | BRIDGE §9 "relieve" |
| 8 | ui | Watches the defector-to-be | Short reports ("On station"); the sensor officer, told to watch her, reports her squadron drifting toward the enemy with no order [both] | BRIDGE §6 "Signs come first"; battle 22 |
| 9 | ui | Waits | Her channel goes dead; her squadron turns its broadsides on his line and changes to the enemy's colours together; the ships she picked go with her [both] | BRIDGE §6 "cut comms and turn"; battle 22 |
| 10 | ui | Boards the defector's flagship through the side that faced him | Part of her crew fights her marines; on capture she is a prisoner and the ship is back in his colours [both] (assumed: a crew's loyalty is held apart from its captain's) | battle 22 "A defector's crew is not the defector" |
| 11 | probe | Same seed, acting on the drift report (shields turned, a squadron wheeled) against not acting | The first broadside lands on raised shields (no side fails) when he acted, on bare sides when he did not | battle 22 |
Feel checks (Caleb only): does a 14-ship fleet feel lighter to run with commodores? Was the defection fair: could he have seen it coming?

# Trace EXP-05: Open a shield side, board an enemy ship, capture it
Traced by TRC-06 (Momus seat) on the launch tip `4b5914c`, 2026-10-22, seed 5 (seed 1 from the title screen for the
second capture), `http://[::1]:5236/`, real clicks and keys over CDP. Evidence: `shots/trc-06/`,
`shots/trc-06/probe-log.md` (E). **Was (wave-05)** is TRC-05's result. New since wave-05: PKG-22 (the master of guns
reports a side our hits went through, with "Send the pods / Keep firing"; capture cards; the marine commander's words
follow the deck count).

**Done point 4 by my own order, twice.** (a) Seed 5: at 0:01 I clicked Sceptre in the scene, Master of guns → "All
guns on Sceptre". At 0:54.8 the card "Sceptre is open on her port side. Pods can go in there." (Q Send the pods / E Keep
firing); I pressed Q. Pods away, one of six lost to point defence, breach on her port at 1:14.3 with 75 marines, then "It
is going badly on Sceptre. 75 of ours against 88. Reinforce or pull them out?"; I pressed Q (Reinforce). Captured at
1:37.4: "Sceptre is ours. Our prize crew is aboard.", scoreboard "12 + 1 taken" and "1 lost to boarders". (b) Seed 1,
entered from the title screen: the same two orders at 0:01; card at 0:56.3 "Their port side is down on Sceptre. Our
rounds are going through to the hull."; Q. Three of six pods lost, 45 marines against 90; "We are outnumbered aboard
Sceptre, 45 to 90."; Q (Reinforce). The reinforcement went at her **aft**, which was up, and was turned away at 1:39; the
first party was thrown off (TRC06-1). A second card at 2:11.8 "Sceptre is open on her starboard side."; Q; breach 2:31.6
with 90 against 77; left to the captain; captured at 2:45. `shots/trc-06/dp4-s5b-open-card.jpg`,
`dp4-s5b-captured.jpg`, `dp4-s1-title-open-card.jpg`, `dp4-s1-title-captured.jpg`.

| Step | How | Player does | Player sees (checkable) | Vision ref | Was (wave-05) | Result | Evidence / what happened |
|---|---|---|---|---|---|---|---|
| 1 | ui | Orders fire on one side of an enemy cruiser | That side falls; probe side = 0 | NAVY §1 | partial | partial | Pnyx and Bema "Focus" → "Port" on Sceptre (e9) at 0:10 in the tactical view: hits by them aft 31, fore 6, starboard 3, port 1; the aft fell (63.1 and 76.1), port never did (E1). TRC05-1 still open. `shots/trc-06/exp05-s1a-focus-port-sceptre.jpg`. The guns-on-target route above does open a side and tells the player which. |
| 2 | probe | Checks the enemy shifts power | Enemy shifts power or turns a fresh side | NAVY §1 | partial | partial | Sceptre: 42.4 power to starboard and fore turned to Stoa; 56.4 power aft. After the aft fell at 63.1 no decision of hers in the next 15 s; the aft read 0 → 41 by 90 on its own (E1). |
| 3 | ui | Orders a boarding run at a side still up | Pods deflected; comms reports it | NAVY §3 s1 | pass | pass | Tactical view, Astu → Second Crown → Board · Stbd (starboard 135) at 0:43.3: deflected 59.3; "Pods turned away at Second Crown. Her starboard shield is still up." inside the flag lieutenant's summary card (E2). `shots/trc-06/exp05-s3-board-stbd-up-deflected.jpg` |
| 4 | ui | Orders a boarding run at the open side | Pods cross, some lost to PD, breach ~2.5 s, marine commander reports | NAVY §3 s2–3 | pass | pass | Seed 5 above: "Send the pods" at 0:54.8 → 6 pods, 90 marines at the port; 1 pod (15) lost to point defence at 1:05.6; breach port 1:14.3 (breachLeft 2.5); "Our boarders are through on Sceptre." (E3). First sight in this project of pods lost to PD in play. |
| 5 | ui | Watches the fight inside | Reports of the fight; enemy gunnery drops while boarded | NAVY §3 s4–5 | pass | pass | Deck count every 3 s (75 v 88 → 38 v 31); Pnyx: "Sceptre is firing slower. The boarders are keeping her busy." (E3) |
| 6 | ui | Answers reinforce/pull-back | Reinforce sends pods; pull-back ends it | NAVY §3 s5 | pass | pass | "It is going badly on Sceptre. 75 of ours against 88. Reinforce or pull them out?" Reinforce / Pull back / Carry on; real `q`: boardLaunch reinforcing true, ordered true (E3). Pull back not pressed. The words now follow the count (TRC05-6 fixed); see TRC06-1 for where the reinforcement goes. |
| 7 | ui | Wins the fight inside | Strikes colours, changes to his colours, joins fleet and roster; side flipped, prize true | done point 4 | pass | pass | Captured 1:37.4 {by player, from enemy}: side player, prize true; card "Sceptre is ours. Our prize crew is aboard. The board shows House of Kleisthenes at 13: 12 + 1 taken."; log "House of Kleisthenes takes Sceptre by boarding" (E3). `shots/trc-06/dp4-s5b-captured.jpg` |
| 8 | probe | Checks the captured ship | Fights at reduced crew | NAVY §3 s6 | pass | pass | Sceptre after capture: active, crew 58/200, marines 81 (E3); seed 1 capture: crew 60/200. |
| 9 | probe | Destroys a different enemy instead | A wreck; counts for less than a capture in the end summary | pillar 3 | partial | partial | The end table still lists Ships lost and "Enemy ships it captured" as plain counts with no worth to weigh one against the other (`shots/trc-06/exp01-s5-s6-end-screen-seed1.jpg`). Sim test "a capture is worth more than a wreck in the summary". |

Feel checks (Caleb only): not judged here.

**Score 6/9** (wave-05: 6/9). Most important non-pass: step 1, "Focus Port" still lands its hits on the aft. The
capture by the player's own order now works from the title screen with two keys.

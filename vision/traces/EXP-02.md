# Trace EXP-02: Command only through captains: the comms queue, direct orders, the flagship's crew
Traced by TRC-06 (Momus seat) on the launch tip `4b5914c`, 2026-10-22, seed 2 (seed 1 for step 5),
`http://[::1]:5236/?skirmish`, real clicks and keys over CDP, time stepped with `__probe.advance()` while paused.
Evidence: `shots/trc-06/`, `shots/trc-06/probe-log.md` (B). **Was (wave-05)** is TRC-05's result.

First-time player: with a report waiting, the help line now reads "Drag to turn · wheel to zoom · R answers the selected
report · T tactical"; with none, "R resets the view". The key does what the line says, except on a card with two
answers (TRC06-2).

| Step | How | Player does | Player sees (checkable) | Vision ref | Was (wave-05) | Result | Evidence / what happened |
|---|---|---|---|---|---|---|---|
| 1 | ui | Starts the battle | A comms queue on screen; within 30 s a report with portrait/name, ship, mood and 2–3 answers | BRIDGE §4 | pass | pass | 0:10: URGENT Nikephoros Gabras · Astu · steady, "Enemy pods closing on Ekklesia. They are aiming at her port.", Q Shields to port / E Carry on / R Fall back on the flagship; DECISION Manuel Tornikes · Ekklesia, "Port side is open. Request we turn." (B1). `shots/trc-06/exp02-s1-s2-queue-seed2-0m10.jpg` |
| 2 | ui | Waits for an urgent report | Red, above amber; grey folded into a summary | BRIDGE §4 | pass | pass | URGENT above DECISION; STATUS "Admiral, thirty-three reports since the last. Eleven ships trimming shields, twenty-two retargeting." folds the line traffic. Same shot. |
| 3 | ui | Presses Q on the top decision | Report closes; captain acknowledges; ship's order = the answer | BRIDGE §4 | pass | pass | Real `q`: report 2 answered "Shields to port" by the admiral; Ekklesia's split fore 0.55 → port 0.55; card "Understood. Power to port." The event log says "Ekklesia: aye, shields reset" (TRC06-3) (B1). `shots/trc-06/exp02-s3-after-Q.jpg` |
| 4 | ui | Presses Tab, then E | Second report answered with its second option | BRIDGE §4 | pass | pass | 0:26.5: two urgent cards (#7 Ekklesia, #9 Astu). Real `Tab` moved Q/E/R to #9; real `e`: commsAnswer report 9, answer 1 "Carry on", by admiral (B1). `shots/trc-06/exp02-s4a-after-Tab.jpg`, `-s4b-after-E.jpg` |
| 5 | probe | Lets a decision report go unanswered | Closes after 4–12 s; comms says what the captain chose; choice from Judgement and trait | BRIDGE §4, done point 6 | pass | pass | Seed 1 report 1 (Ekklesia) open 5.9 → closed 11.77 by timeout (5.9 s): "shieldDown: Carry on", trait Bold; on screen "No reply from the flagship. Carrying on. Should have asked sooner." (B2) `shots/trc-06/exp02-s5-timeout-choice-on-screen-seed1.jpg` |
| 6 | ui | Selects a ship, selects an enemy, chooses "attack" | Order line; captain acknowledges or refuses | §7a; BRIDGE §12b | pass | pass | Roster card Kleros, scene click on Io, menu shows "Escort leaves the screen: the flagship loses her screen." (PKG-21), Attack: order attack e10, line p1→e10, points 5 → 4.1, "Understood. Engaging Io. Watching our flanks.", log "Kleros: aye, engaging" (B3). `shots/trc-06/exp02-s6a-kleros-selected-enemy-clicked-menu.jpg`, `-s6b-attack-order-line-ack.jpg` |
| 7 | ui | Orders the master of guns: all batteries on an enemy | Flagship fire shifts; officer answers in person | §7a | pass | pass | "All guns on Io": guns mode on, target e10; next 3 of 3 flagship shots at Io; "All batteries on Io. Firing."; log "Astu: aye, guns on target" (B3). `shots/trc-06/exp02-s7-guns-on-io.jpg` |
| 8 | ui | Orders shields and engineering: everything to port | Port grows, others shrink | §7a, NAVY §1 | pass | pass | "All port" at 0:16: split port 0.85, port 720 → 1684 in 4.5 s and 4080 at 0:36, the other three 240. Log "Astu: aye, shields reset" (TRC06-3) (B3). `shots/trc-06/exp02-s8-all-port.jpg` |
| 9 | ui | Orders the helm a maneuver | Flagship flies it; officer answers | §7a | pass | pass | Flag captain "Cross their bow" at 0:36: "Helm answering. Crossing their bow."; heading −0.56 → −1.28 in 10 s, then holds; order maneuver crossingLine on Io (B3). `shots/trc-06/exp02-s9-helm-cross-their-bow.jpg` |
| 10 | ui | Orders marines to send pods, fighters to screen them | Pods launch with fighter escort | §7a | partial | partial | "Pods at Io" at 1:12: 6 pods, 90 marines in flight at Io's port, "Our pods are away from Astu, bound for Io."; "Screen": "Wings tasked to screen, aye.", task screen, and the pod group's `escorts` is null: no fighters exist to fly it. The log words are fixed: "aye, pods away", "aye, boarders away", "aye, wings tasked" (B3). `shots/trc-06/exp02-s10-pods-fighters-screen.jpg` |
| 11 | ui | Tries to steer a non-flagship ship by hand | He cannot; only orders move them | done point 2 | pass | pass | A real drag starting on Pnyx and two ArrowLeft: 12 headings unchanged, orders 8 → 8, camera director → player, nothing selected (B4). `shots/trc-06/exp02-s11-drag-on-pnyx-turns-camera-only.jpg` |
| 12 | ui | Gives several orders in a row | Points pace orders; meter shows; refusal with reason | §8 | pass | pass | Hold clicks on Kleros: 5 → 4 → 3 → 2 → 1 → 0, then "Not enough command points: 1 needed, 0.1 ready." (B4). `shots/trc-06/exp02-s12-points-spent-refusal.jpg` |

Feel checks (Caleb only): not judged here.

**Score 11/12** (wave-05: 11/12). Most important non-pass: step 10, fighters still have no craft to fly a screen.

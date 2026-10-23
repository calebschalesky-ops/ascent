# Trace EXP-06: Break the enemy's morale and win, or lose
Traced by TRC-06 (Momus seat) on the launch tip `4b5914c`, 2026-10-22, seeds 6 and 7, `http://[::1]:5236/` (one game
entered from the title screen), real clicks over CDP in the tactical view. Evidence: `shots/trc-06/`,
`shots/trc-06/probe-log.md` (F), play logs `shots/trc-06/exp06-s6-play-*.jsonl`, driver
`shots/trc-06/exp06-s6-play-driver.mjs.txt` (TRC-05's, plus a title-screen start, per-loss morale, pins, and an exact
start tick). **Was (wave-05)** is TRC-05's result.

| Step | How | Player does | Player sees (checkable) | Vision ref | Was (wave-05) | Result | Evidence / what happened |
|---|---|---|---|---|---|---|---|
| 1 | probe | Reads morale | Every ship and every wing 0–100; not shown as a number on enemy ships | NAVY §1, pillar 2 | partial | partial | Seed 6 at 0:30: ship morale player 38–88, enemy 57–92; sides 69.4 / 71.8; no wing object in the sim; the word "morale" is not on the page until the end card (F1). |
| 2 | ui | Destroys or captures enemy ships | Enemy morale falls with losses, odds, low Nerve | NAVY §1 | pass | pass | Seed 7, escorts kept on their screen, logged at each loss: enemy side 72.6 (Spear out, 0:45) → 70.0 → 67.1 → 62.6 (Basileus, 5:53) → 61.4 (Io struck, 12:23) → 51.8 → 40.0 → 32.5 → 26.7 → 24.6 at the break (14:07) (F2). Slow for twelve minutes, then gone in ninety seconds. Low Nerve not separated per captain. |
| 3 | ui | Captures or destroys the enemy flagship | Every enemy ship's morale drops in the same tick | VISION §7 | partial | partial | Not reached by play: in both victories Ganymede fled after the enemy had broken (flagshipLost 13:20 and 14:19, after sideBroken). Sim test "losing the flagship drops every ship's morale in one tick". |
| 4 | ui | Watches broken ships | Broken ship jumps or strikes; comms and director show it | NAVY §1 | pass | pass | Seed 7 victory: Io struck 12:23, seven enemy ships fled; end log lines "… jumps away" (F2; `shots/trc-06/exp01-s8-375-end-screen.jpg` for the log lines). |
| 5 | ui | Pins a broken ship | Mass lock stops the jump | VISION §7 | partial | partial | First pins seen in play: seed 7 with every ship ordered, the enemy pinned his Ekklesia at 1:03 and Agora at 3:51 (Agora was then taken at 4:06). He never pinned an enemy ship, and nothing on screen says how (F2). |
| 6 | ui | Breaks half the enemy fleet | Enemy breaks; his victory | NAVY decision 4 | pass | pass | **Played for real, every order by real clicks in the tactical view, no missed click on a target in 10 of 11 games (7 misses in the 11th).** Plan "keep": the four escorts never ordered, everyone else on the smallest enemy class first, the flagship boards open sides. **Seed 6: VICTORY 13:20**, "House of Ganymede broke at 13:08: 59% of its strength gone: ships lost 4, fled 5" (67 orders, 196 clicks; at wave-05 this seed lost). **Seed 7, entered from the title screen: VICTORY 14:19**, "House of Ganymede broke at 14:07: fleet morale 25" (70 orders, 204 clicks). Both re-played and reproduced to the second when the first order lands on the same tick (`exp06-s6-play-seed{6,7}-keep-t1133.jsonl`). `shots/trc-06/exp06-s6-seed6-keep-t1133-end.jpg`, `exp06-s6-seed7-keep-t1133-end.jpg`. Seed 7 with escorts ordered too: defeat 9:06 (51 orders; idle seed 7 ends 4:11). **But see TRC06-4:** the same plan with the first order one frame earlier or later lost on both seeds. |
| 7 | ui | Second run, plays badly: loses his flagship | His fleet breaks; defeat on screen | done point 5 | partial | partial | Seed 6, Astu → Ganymede Attack and Flag captain "Close" at 0:00.6: DEFEAT on screen, "House of Kleisthenes broke at 3:26: fleet morale 23"; Astu fled at 3:38, after the break, not before it (F3). `shots/trc-06/exp06-s7-seed6-flagship-into-ganymede.jpg` |

Feel checks (Caleb only): not judged here.

**Score 3/7** (wave-05: 3/7). Most important non-pass: step 3, the enemy flagship is never taken in play. Most important
finding: the winning plan is not a plan a player can repeat; which second it starts on decides it (TRC06-4).

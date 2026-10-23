# Trace EXP-01: Fight a 12-v-12 fleet battle at one body
Traced by TRC-06 (Momus seat) on the launch tip `4b5914c` (`claude/game`), 2026-10-22, dev server
`http://[::1]:5236/`, entered from the title screen ("Fleet battle"), own headless Chrome driven with real mouse and key
events over CDP (viewport 1262x704 except where noted). Evidence: `shots/trc-06/`, probe readings in
`shots/trc-06/probe-log.md` (section letters). **Was (wave-05)** is TRC-05's result for the row.

| Step | How | Player does | Player sees (checkable) | Vision ref | Was (wave-05) | Result | Evidence / what happened |
|---|---|---|---|---|---|---|---|
| 1 | ui | Opens the game and chooses Skirmish (title screen entry, or `?skirmish` while there is none) | A skirmish setup or battle screen loads, zero console errors | VISION §16 Phase A "a skirmish mode" | pass | pass | `http://[::1]:5236/`: title menu "New game, Fleet battle, Peoples of the System, Settings"; a real click on **Fleet battle** loads `/?skirmish`, seed 1, `errors()` [], no console errors (A1). `shots/trc-06/exp01-s1-title-1262.jpg`, `shots/trc-06/exp01-s1-s3-title-to-battle.jpg`. Flag `skirmish` on (PKG-21). |
| 2 | ui | Starts the battle | 12 ships on his side and 12 on the enemy's, in view; probe `battle.ships` count by side = 12/12 | done point 1 | pass | pass | Scoreboard "House of Kleisthenes 12/12", "House of Ganymede 12/12"; probe 12/12 (A1). Same shot. |
| 3 | ui | Looks around | The battle is at Saturn's rings: the planet and ring plane are in frame | done point 1, §7a | pass | pass | Saturn and its rings in frame, both lines visible on the ring plane. Same shot. |
| 4 | ui | Watches 20 s | Both fleets move and fire; fire crosses between lines; probe damage by both sides > 0 | §7a | pass | pass | Seed 1 at 0:20: dealt player 730, enemy 452; 99 shots; 12/12 (A1). `shots/trc-06/exp01-s4-seed1-20s.jpg` |
| 5 | probe | Advance until the battle ends (max 15 min) | The battle ends with a stated outcome, shown on screen | done point 5 | pass | pass | Seed 1 ends 6:17, withdrawal, "DEFEAT", "House of Kleisthenes broke at 6:05: fleet morale 24" (A2). `shots/trc-06/exp01-s5-s6-end-screen-seed1.jpg` |
| 6 | ui | Reads the end screen | An after-battle summary: ships lost, captured, broken, on each side | NAVY §7 | pass | pass | Ships lost 3/1, Broken 9/0, Struck 1/0, Fled 9/1, **Enemy ships it captured** 1/1 (PKG-22 renamed the row, so it now says who took whom); Restart. Same shot. |
| 7 | ui | Reloads the page mid-battle | No crash; skirmish start or resumable state | method F4 | pass | pass | Seed 1 at 0:30, reload `/?skirmish`: battle t 0.5, seed 1, `errors()` [] (A3). `shots/trc-06/exp01-s7-after-reload-mid-battle.jpg` |
| 8 | ui | Narrows the window to 375 px | The comms queue and end screen are readable | done bar 4 | pass | pass | 375x812 from the title: menu fits (scrollWidth 375), "Fleet battle" tap lands on the battle; at 0:12 an URGENT card with three keyed answers over two STATUS cards, "Tactical" and "Fleet" buttons; end screen fits, scrollWidth 375 (A4). Headers now read "0/11 · 1 lost to boarders" and "12/13 · 12 + 1 taken". `shots/trc-06/exp01-s8-375-title.jpg`, `-mid-battle-queue.jpg`, `-end-screen.jpg` |

Feel checks (Caleb only): not judged here.

**Score 8/8** (wave-05: 8/8). Most important non-pass: none. Seen: the end table's Broken 8 / Struck 1 / Fled 9 at 375
(seed 2) does not add up for a reader, because Fled counts ships that withdrew in good order as well as broken ones.

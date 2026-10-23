# EXP-01: Fight a 12-v-12 fleet battle at one body
Source: vision/visions/2026-10-21-phase-a-prompt.md, done point 1 (his words: "Fight a 12-v-12 fleet battle at one body (Saturn's rings or Jupiter's moons).")
Start state: new skirmish, `?skirmish`, seed 1, player = a Saturn house fleet, enemy = a Jupiter house fleet under one AI admiral
| Step | How | Player does | Player sees (checkable) | Vision ref |
| 1 | ui | Opens the game and chooses Skirmish (title screen entry, or `?skirmish` while there is none) | A skirmish setup or battle screen loads, zero console errors | VISION §16 Phase A "a skirmish mode" |
| 2 | ui | Starts the battle | 12 ships on his side and 12 on the enemy's, in view; probe `battle.ships` count by side = 12/12 | done point 1 |
| 3 | ui | Looks around | The battle is at Saturn's rings: the planet and ring plane are in frame (assumed: Saturn, not Jupiter's moons) | done point 1, §7a "Fighting in terrain" |
| 4 | ui | Watches 20 s | Both fleets move and fire; fire crosses between lines; probe shows damage dealt by both sides > 0 | §7a "You see the whole battle" |
| 5 | probe | Advance until the battle ends (max 15 in-game minutes) | The battle ends with a stated outcome (victory, defeat, or a side withdrawn), shown on screen | done point 5 |
| 6 | ui | Reads the end screen | An after-battle summary: ships lost, captured, broken, on each side | NAVY §7 (after the battle) (assumed shape) |
| 7 | ui | Reloads the page mid-battle | The game does not crash; it returns to the skirmish start or a resumable state (vision silent: resume vs restart) | method F4 |
| 8 | ui | Narrows the window to 375 px | The comms queue and end screen are readable (assumed: Phase A is desktop-first; legibility only) | daedalus charter, done bar 4 |
Feel checks (Caleb only): "an awesome navy battle"; does 12 v 12 read as two fleets, not a swarm?

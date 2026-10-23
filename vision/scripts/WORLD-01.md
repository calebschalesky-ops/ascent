# WORLD-01: Do nothing for the whole battle and still watch a battle play out, decided by captains' traits and standing orders
Source: done point 6 (his words, above); battle-sims/01-17 battle 2 "The same battle, and you do nothing"
Run: the sim runner, 12 v 12 at Saturn's rings, seeds 1–10, max 15 in-game minutes, player policy: idle
| Check | By | Measured as (sim key) | Pass range | Seeds needed |
| 1 | end | battle ends with an outcome (not a timeout with both fleets intact) | outcome ∈ {victory, defeat, withdrawal} | 10 of 10 |
| 2 | 60 s | both sides have fired and dealt damage | damageDealt.player > 0 and damageDealt.enemy > 0 | 10 of 10 |
| 3 | end | at least one boarding attempt happened, by either side, with nobody ordering it | boardingAttempts ≥ 1 | 8 of 10 |
| 4 | end | at least one ship broke (fled or struck) | brokenShips ≥ 1 | 8 of 10 |
| 5 | end | idle player's captains decided things: timeout decisions recorded with the deciding captain's trait | timeoutDecisions ≥ 3, each with a trait | 10 of 10 |
| 6 | end | changing captains' traits changes the battle: run seeds 1–10 again with the player's captains' Nerve and Judgement swapped high↔low | the outcome or the losses differ by ≥ 25% in mean ships lost | 8 of 10 seed pairs differ |
| 7 | end | the director keeps filming: shot log has ≥ 1 shot per 20 s | shotsPer20s ≥ 1 (needs the view; checked in the browser on seed 1 only) | seed 1 |
Feel checks (Caleb only): does doing nothing look like watching his captains fight, not like a frozen game?

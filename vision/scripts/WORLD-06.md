# WORLD-06: AI admirals of four worlds can be told apart, telegraph their moves, and the low difficulty makes deliberate mistakes
Source: <local> done point 7; VISION §9; WORLD-02 checks 5–7 (Phase A, Jupiter only)
Run: the sim runner, each style (mars, jupiter, moon, mercury: assumed four) at its own setup and on `saturn-12v12`, seeds 1–30, rosters 1–8 (A3), difficulties easy and normal, player policies: idle, scripted-good
| Check | By | Measured as (sim key) | Pass range | Seeds needed |
| 1 | end | styles are distinguishable: a nearest-centroid classifier on four measures (mean engagement range, boarding pushes per minute, share of fire at the player flagship, time of first withdrawal) names the style | correct | 24 of 30 per style; 6 of 8 rosters |
| 2 | end | Mars boards most | boarding pushes per battle ≥ 2 × Jupiter's | 24 of 30 |
| 3 | end | Jupiter fights longest | mean range > Mars | 24 of 30 |
| 4 | end | the Moon goes for the flagship | share of its fire at the player flagship ≥ 0.4, others ≤ 0.15 | 24 of 30 |
| 5 | end | Mercury leaves first | first withdrawal time < every other style's | 24 of 30 |
| 6 | end | every main move is telegraphed: boarding push, flagship salvo, withdrawal | tell ≥ 5 s before the move; a seed with no move counts as a miss | 8 of 10 per style |
| 7 | end | easy makes deliberate mistakes: logged mistakes of named kinds (board a closed side, flagship unscreened, late reserve) | easy ≥ 2 per battle, normal ≤ 0.5, each tied to a logged order | 24 of 30 |
| 8 | end | easy is easier for skill, not luck | scripted-good's outcome rank against easy > against normal | 24 of 30 |
| 9 | end | no cheating: no AI order acts on an enemy side its sensors have not seen | such orders | 0 of all runs |
| 10 | end | the same order set as the player's, Phase B kinds included | every AI order kind ∈ `ORDER_KINDS` | 10 of 10 |
Feel checks (Caleb only): with names hidden, can he tell which world he is fighting within two minutes?

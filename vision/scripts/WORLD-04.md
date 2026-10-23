# WORLD-04: Taking the enemy flagship or admiral collapses their fleet; morale breaks fleets, not luck
Source: <local> done point 2 ("taking the enemy flagship or admiral collapses their fleet"); VISION §7 "Morale ends battles"; NAVY decision 4, §1, §4
Run: the sim runner, `saturn-12v12` and `europa-12v12-wings`, seeds 1–30, rosters 1–8 (A3), max 15 in-game minutes, player policies: idle, scripted-good, `decapitate` (board the enemy flagship first, assumed policy)
| Check | By | Measured as (sim key) | Pass range | Seeds needed |
| 1 | capture + 30 s | after the enemy flagship is captured, enemy ships struck or fled | ≥ 3, or the side broken | 24 of 30 runs where it was captured |
| 2 | capture + 60 s | after flagship and admiral are both taken, the enemy side breaks | `sides.enemy.broken` = true | 24 of 30 |
| 3 | end | the admiral's loss counts on its own: a variant where the admiral is lost and the flagship is not | mean morale drop ≥ the flagship-only drop (vision silent on how; assumed) | 10 of 10 |
| 4 | end | no early break: without flagship or admiral loss, a side breaks only after half its strength is gone | broken with strength lost < 0.5 | 0 runs |
| 5 | end | wings: when one wing loses two ships, that wing breaks (or its morale is the lowest) before the fleet breaks | wing first | 24 of 30 runs where a wing lost two |
| 6 | end | Fanatics never strike | struck ships with a Fanatic captain | 0 of all runs |
| 7 | end | mass lock: a broken ship never jumps while an armed enemy is in lock range | jumps while locked | 0 of all runs |
| 8 | end | pinned broken ships strike more than free ones | struck share, pinned > unpinned | 24 of 30 |
| 9 | end | Nerve decides who breaks first | median `brokenAt` of Nerve ≤ 3 earlier than Nerve ≥ 7 | 24 of 30 |
| 10 | end | decapitate beats idle | outcome rank higher, or equal rank and fewer ships lost | 24 of 30 |
| 11 | end | A3: check 1 across rosters | check 1 passes | 6 of 8 rosters |
Feel checks (Caleb only): does the collapse after taking their admiral feel like the battle ending, not like numbers ticking down?

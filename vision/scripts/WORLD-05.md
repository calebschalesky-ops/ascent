# WORLD-05: Lying captains are caught by the sensor officer's picture
Source: <local> done point 3 ("a captain's report shades the truth by Candour and mood; the sensor officer gives the true picture; each captain's file keeps a report-accuracy record"); BRIDGE §2, §3
Run: the sim runner, `saturn-12v12` with `rosters/candour-mix`, seeds 1–30, rosters 1–8 (A3), max 15 in-game minutes, player policies: `trust-reports` (acts on captains' figures only), `check-sensor` (acts on the sensor officer's figure when it contradicts), idle (assumed policies)
| Check | By | Measured as (sim key) | Pass range | Seeds needed |
| 1 | end | low Candour lies more: mean absolute report error, Candour ≤ 3 against Candour ≥ 8 | ratio ≥ 3 | 10 of 10 |
| 2 | end | traits lean the right way | mean bias: Optimist > 0, Pessimist < 0 | 24 of 30 |
| 3 | end | mood moves it: the same captain's error when panicked against when steady | panicked error > steady error | 24 of 30 |
| 4 | end | the sensor officer is near the truth for ships in his view (sensor ability ≥ 7) | reports within 0.05 of truth | ≥ 95% of reports, 10 of 10 |
| 5 | end | the sensor officer catches a lie: of captain reports off by ≥ 0.2, the share he contradicts within 10 s | strong (≥ 7) ≥ 0.8; weak (≤ 3) ≤ 0.5 | 8 of 10 |
| 6 | end | checking pays: `check-sensor` against `trust-reports` | outcome rank higher, or equal rank and fewer player ships lost | 24 of 30; 6 of 8 rosters |
| 7 | end | the record knows who lies: per captain, accurate share against Candour | rank correlation ≥ 0.6 | 8 of 10 |
| 8 | end | disloyal captains report less: reports per minute, loyalty < 30 against ≥ 60 | lower | 8 of 10 |
| 9 | end | choosing a line never moves the battle: comms on and off | battle state hash equal | 10 of 10 |
Feel checks (Caleb only): when he trusts the wrong captain and loses a ship, does he feel he should have checked?

# WORLD-02: The outcome is decided by decisions and captains' characters, never luck
Source: done point 5 ("with the outcome decided by decisions and captains' characters, never luck"); VISION §9 (the AI admiral uses the same orders and rules, Jupiter: methodical range, readable moves)
Run: the sim runner, 12 v 12 at Saturn's rings, seeds 1–10, max 15 in-game minutes, policies: idle, scripted-good, scripted-bad (named below)
- `scripted-good`: focus fire on one side of one ship at a time, board through the open side, protect the flagship (the battle 1 plan in battle-sims/01-17).
- `scripted-bad`: split fire across all targets, board into closed shields, send the flagship forward alone.
| Check | By | Measured as (sim key) | Pass range | Seeds needed |
| 1 | end | same seed, same policy, run twice: identical result (determinism) | final state hash equal | 10 of 10 |
| 2 | end | idle on even fleets: the outcome does not swing with the seed | the same winner (or draw) | 8 of 10 |
| 3 | end | scripted-good beats idle | outcome rank (victory 2 > withdrawal 1 > defeat 0) higher than idle's, or equal rank and fewer player ships lost (amended 2026-10-21, see below) | 8 of 10; also 24 of 30 |
| 4 | end | scripted-bad does worse than idle | outcome rank lower than idle's, or equal rank and more player ships lost (amended 2026-10-21) | 8 of 10; also 24 of 30 |
| 5 | end | the AI admiral (Jupiter, methodical range) uses the player's order set only | every AI order is one of the player's order types (log check) | 10 of 10 |
| 6 | end | the AI telegraphs a boarding push: fighters forward and/or capitals turning ≥ 5 s before its boarders launch | telegraphLead ≥ 5 s on each AI boarding push | 8 of 10 |
| 7 | end | Jupiter style shows: the AI's mean engagement range is longer than a Mars-style control run | meanRange(jupiter) > meanRange(aggressive control) | 8 of 10 |
Feel checks (Caleb only): when he loses, does he know why? Does the Jupiter admiral feel methodical?

Amended 2026-10-21 by Daedalus (checks 3, 4): the first wording compared ships lost even when the outcomes differed, so a
good player who fought on and won scored worse than an idle fleet that retreated early (PKG-13: with fair rosters,
scripted-good won 3 of 10 and failed check 3 at 4 of 10). Done point 5 is "win or lose… decided by decisions": the
outcome comes first. Checks 2, 3, 4 and 6 are also judged at 30 seeds (bar 24 of 30), because 10-seed runs flip on
one seed.

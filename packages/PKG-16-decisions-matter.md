# PKG-16-decisions-matter
Label: PKG-16 · Kind / seat: build / **Palamedes** (read `<local>`) · Base:
claude/game @ <launch prompt> · Port: none (headless) · Worktree `pkg-16`

Makes these steps pass (bars at 30 seeds, 24 of 30, unless stated): WORLD-02 checks 2 (rosters 6 of 8), 3, 4, 6 under
the **amended** checks 3–4 (`vision/scripts/WORLD-02.md`, amended 2026-10-21: outcome rank first, ships lost second);
WORLD-01 check 6 (swapping the player captains' Nerve and Judgement changes the battle); EXP-06 step 6 in the sim
(scripted-good wins outright on ≥ 7 of 30 seeds). Keep every other built WORLD check passing.
Read first: `reports/PKG-13.md` (fair rosters, the 30-seed rates), `reports/PKG-14.md` (the held-back capture shock,
WORLD-01 c6 at 30 seeds), `reports/PKG-08.md`, `reports/TRC-03.md` (EXP-06 s6: three real-click games, all defeats;
playing broke the fleet sooner than idle).

## Rulings you build on (Daedalus, 2026-10-21)
- **Fair rosters on.** Set `ABILITY.fairRosters: true`. Done point 5 is "win or lose, decided by decisions and
  captains' characters, never luck"; with rosters off a good player wins 0 of 30. Caleb may overrule.
- **WORLD-02 checks 3 and 4 rank the outcome first** (the script is amended; implement the new measure in `checks.ts`,
  your rows).

## Measured by Daedalus on claude/game @ 3b85b1b
- WORLD-01 c6 (swap variant) 19 of 30 (bar 24): captains' characters don't move the battle enough at scale.
- PKG-13 at 30 seeds, fair off: c3 21/30, c4 26/30, c6 22/30; a push happened in 22 of 30 (captains spend the
  launchers' marines on their own boardings first).

## Do
1. Implement the amended checks 3–4 and a `--seeds 30` bar column in the runner output.
2. Fair rosters on; then tune the shared rules (not the policies, not the admiral's logic) so the bars above hold.
   Levers that are yours: trait and ability effects in `numbers.ts` (WORLD-01 c6: Nerve and Judgement must visibly
   change who breaks and when), the capture morale shock (PKG-14 held the per-strength version back because it dropped
   c3 and c6: retry it under the new checks and keep whichever the sims prove), the launcher marine reserve (the
   admiral's carrier keeps a boarding party for its own push instead of feeding captains' unordered boardings:
   `boarding/numbers.ts` and the unordered-boarding rule in `boarding/**`, named in the report).
3. **Why playing is worse than idle (TRC-03 EXP-06 s6):** add a `player-ui-like` policy that issues what TRC-03's player
   did (attack and focus-side orders every ~10 s on the nearest enemy, the flagship sent forward to lead), measure it
   against idle on 30 seeds, and find what in the rules punishes it (orders breaking formation? losing the screen?).
   Fix the rule if it is a rule; report it if it is the player's choice (that is fair: the game should punish a bad
   plan, but a reasonable one should not do worse than nothing).
4. Do not tune the scripted policies or the admiral to pass. If two bars can't both hold, stop and report the trade-off
   with numbers.

Files you own: `src/battle/sim/numbers.ts`, `src/battle/sim/captains.ts` (fair-roster switch and trait effects),
`src/battle/sim/checks.ts` (checks 3–4 and the 30-seed column), `scripts/sim.mjs` (the column), `boarding/numbers.ts`,
the unordered-boarding rule in `boarding/**`, the capture-shock line in `battle.ts`, `policies.ts` (the new policy
entry), `vision/sims/**`, tests.
Must not touch: `maneuvers/**` and the setup's ship names (PKG-18, running now), `admiral/**` logic, `comms/**`,
`src/battle/view/**` (PKG-17), everything else beyond rule-9 lines.
Flag: none. Save: unchanged.
Assumed, for Caleb to overrule: fair rosters; the outcome-first checks.
Acceptance: tsc; vitest; lint `src/battle/sim/**`; build; smoke; WORLD-01 idle + swap and WORLD-02 at `--seeds 10` and
`--seeds 30`; `--rosters 1-8`; the `player-ui-like` vs idle table; scripted-good outcome tally at 30 seeds. Report
`reports/PKG-16.md` with a numbers-changed table (old → new → why → the sim line that proved it).

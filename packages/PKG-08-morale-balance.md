# PKG-08-morale-balance
Label: PKG-08 · Kind / seat: build / **Palamedes** (read `<local>`: prove every
change by the sim, never by feel) · Base: claude/game @ <launch prompt> · Port: none (headless) · Worktree `pkg-08`

Makes these steps pass: WORLD-02 check 3 (scripted-good beats idle, 8 of 10) and check 6 (a telegraphed AI boarding
push in 8 of 10 seeds); EXP-06 step 6 (break half the enemy fleet and win) as sim behaviour; keeps every other built
WORLD-01/02 check passing. Scripts: `vision/scripts/WORLD-01.md`, `WORLD-02.md`, `EXP-06.md`.

Why (measured by Daedalus on claude/game @ f8c0735, 2026-10-21):
- **The player cannot win.** WORLD-02: scripted-good ends in withdrawal on 10 of 10 seeds; idle on 10 of 10; the
  admiral beats idle in 78 of 80 roster battles (`reports/PKG-07.md`).
- **A fleet that is winning breaks.** Seed 1 on screen: the player captured 3 and lost 1, the enemy lost 3, and the
  player's fleet "broke at 2:35: 6 of 12 ships lost", 11 fled; Defeat at 2:47 (`shots/pkg-04/merged-exp01-step5-6-end-screen-seed1.jpg`).
  The end reason's "6 of 12 lost" disagrees with the tally's "1 lost".
- **Battles are over in ~2–3 minutes,** too fast for an AI boarding push in 3 of 10 seeds (WORLD-02 check 6: every
  push that happened telegraphed 6 s ahead; the misses are seeds where none happened before the break).

Vision: NAVY-DESIGN.md decision 4 ("A fleet that loses its flagship or admiral, or loses half its strength, tries to
run") and §1 morale row; VISION.md §7a "Fleet clash: slow and heavy at first, then sudden when one line breaks";
battle-sims/BATTLE-RULES.md rule 8 ("Nothing is luck… anything that goes wrong must have had a cause the player could
have seen"); battle-sims/01-17 battle 1 (`<repo>\battle-sims\01-17-reviewed-with-caleb.md`
lines 19–85): a well-played convoy battle runs about 7:30.

## What to do
1. **Measure first:** for seeds 1–10, idle and scripted-good, print per-side morale, ships active/broken/fled/lost/
   captured every 15 s, and what drove each morale drop. Find why a side with the better material breaks.
2. **Fix the accounting:** "strength lost" for the break rule counts what the fleet has actually lost (wrecked,
   struck, captured by the enemy, fled), weighted by class, and credits prizes it has taken. One definition, used by
   the break rule, the end reason and the tally, so they always agree.
3. **Tune to targets (numbers in `numbers.ts`, first-pass → second-pass, each change logged with its sim result):**
   idle-vs-admiral battles last 4–10 minutes (median 5–8); scripted-good beats idle (check 3, 8 of 10) and wins
   outright (victory) on ≥ 5 of 10; scripted-bad does worse than idle (check 4, 8 of 10 still); the admiral launches a
   telegraphed push in ≥ 8 of 10 seeds (check 6); check 2 still holds on ≥ 6 of 8 rosters; WORLD-01 check 6 still
   differs. Morale "slow and heavy, then sudden": report the per-side morale series for seed 1.
4. **The flagship's marine commander can launch pods** (§7a: "Send the pods at their flagship"): the capital flagship
   carries pods in the setup data (`setups/saturn-12v12.ts` ship entries and the boarding numbers' per-class pod
   counts). PKG-06 reports "Cannot do it. No pods aboard" today.
5. Do not tune the scripted policies or the admiral's logic to pass; tune the shared rules. If a target can't be met
   without breaking another, stop and report the trade-off with numbers.

Files you own: the morale/break/outcome code in `src/battle/sim/battle.ts` (name the functions you change in the
report), `src/battle/sim/numbers.ts`, `src/battle/sim/boarding/numbers.ts` (pod counts only),
`src/battle/sim/summary.ts` (reason/tally agreement), `src/battle/sim/setups/saturn-12v12.ts` (ship entries, not the
controller line), `vision/sims/**` re-run output, tests for what you change.
Must not touch: `src/battle/sim/maneuvers/**` (PKG-10, running now; it adds rule-9 lines to the shared sim files: keep
both on conflict), `src/battle/sim/admiral/**`, `comms/**` logic, `src/battle/view/**`, everything else.
Flag: none. Save shape: unchanged.
You cannot prove: whether the break feels earned (report seed 1's morale series and end screen reason for Caleb).
Acceptance: `npx tsc -b`; `npx vitest run`; lint on `src/battle/sim/**`; `npm run build`; `npm run smoke`; `npm run sim
-- --script WORLD-01 --seeds 10 --minutes 15 --policy idle` and the swap variant; `npm run sim -- --script WORLD-02
--seeds 10 --minutes 15` (all checks) and `--rosters 1-8 --no-write`; a table of battle durations. Report
`reports/PKG-08.md` (with a "numbers changed" table: old → new → why → the sim line that proved it).

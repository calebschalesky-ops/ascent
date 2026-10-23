# PKG-13-admiral-and-fairness
Label: PKG-13 · Kind / seat: build / Talos with Palamedes's rules (read `<local>`,
`palamedes.md`) · Base: claude/game @ <launch prompt> · Port: none (headless) · Worktree `pkg-13`

Makes these steps pass: WORLD-02 check 6 (a telegraphed AI boarding push, 8 of 10 seeds) and check 7 (Jupiter's
engagement range longer than the aggressive control, 8 of 10), keeping 1–5 passing; EXP-06 step 6 reachable by a
player who plays well (scripted-good wins outright on ≥ 3 of 10 seeds).
Script `vision/scripts/WORLD-02.md`. Read first: `reports/PKG-08.md` sections 4 and 5 (requests 2, 3, 4 are yours),
`reports/PKG-07.md`.

Why (measured by Daedalus on claude/game @ 68fb1a4, 2026-10-21): WORLD-02 check 6 7/10 (the misses are seeds where
the admiral never pushed), check 7 5/10 (it passed before only because of a loss miscount PKG-08 fixed); scripted-good
wins 0 of 30, because roster 1's enemy captains carry +28 Gunnery over the player's ("idle on **even** fleets", the
script says; the fleets are not even).

Vision: VISION.md §9 (methodical range; readable telegraphed pushes; no cheating), BATTLE-RULES.md rule 8 (anything
that goes wrong must have had a cause the player could have seen), pillar 3 (fleets are won by boarding: a Jupiter
admiral still boards, methodically).

## Do
1. **Admiral (requests 2–4 of PKG-08):** the withdrawal watch reads the new strength-weighted `fleetLosses`, not
   `MORALE.sideBreakLosses`; a push is never launched without a visible telegraph (at least one escort forward or a
   capital turn ≥ the bar; if neither is possible, no push); the admiral commits a boarding push in every battle that
   lasts past its decision point, once a side is open and its lane is judged clear. Make Jupiter's range distinct from
   the Mars-style control inside a 5–8 minute battle (Jupiter stands off beyond the line's preferred range, or the
   control closes inside it: your call, said in the report).
2. **Fair rosters:** captain generation gives both sides the same total of each ability within a tolerance (e.g. ±5
   across the fleet), still varied ship by ship and still seeded. Then re-measure check 2 on rosters 1–8 (bar 6 of 8,
   A3) and check 3/4. Do not pick a roster after seeing it.
3. Do not tune the scripted policies to pass.

Files you own: `src/battle/sim/admiral/**`, the roster-generation function(s) in `src/battle/sim/captains.ts` (name
them), `vision/sims/WORLD-02/**`, tests.
Must not touch: the shield-trim logic in `captains.ts` (PKG-14 is changing it now), `boarding/**`, `comms/**`, setups'
house names (PKG-14), `src/battle/view/**` (PKG-12, PKG-15), everything else beyond rule-9 lines.
Flag: none. Save: unchanged.
Assumed, for Caleb to overrule: what "fair" means (equal ability totals per side).
Acceptance: tsc; vitest; lint `src/battle/sim/**`; build; smoke; `npm run sim -- --script WORLD-02 --seeds 10 --minutes
15` (all 7) and also `--seeds 30` for 3, 4, 6, 7 (report the 30-seed rates); `--rosters 1-8 --no-write`; WORLD-01 idle
and swap; scripted-good outcome tally. Report `reports/PKG-13.md`.

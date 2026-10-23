# PKG-24-luck-audit
Label: PKG-24 · Kind / seat: build / **Palamedes** (read `<local>`) · Base:
`claude/game` @ <launch tip> · Port: none (headless) · Worktree `pkg-24`

Phase A done point 5: "win or lose, decided by decisions and captains' characters, **never luck**". Makes these pass on
held-out seeds 61-90 (amendment A8; tune on 1-60 only): WORLD-02 c3 ≥ 24/30, c4 ≥ 24/30, WORLD-01 c6 ≥ 24/30, every
other built WORLD check still passing at 30 seeds. Read first: `reports/PKG-19.md` (the plans, the three seed blocks:
c3 29 / 25 / 19, W01 c6 29 / 23 / 22), `reports/PKG-16.md` sections 4-5.

## Measured
- With a real good plan, a good fleet still loses to doing nothing on about a third of held-out seeds. Two identical
  do-nothing runs end at 6:17 and 4:01 (QA-05). The spread across blocks (29, 25, 19) is wider than a plain 80% rate
  would give. Inference: seeded draws decide too much.

## Ruling you build on (Daedalus, 2026-10-21, board "Phase B" rulings)
A decision the vision gives a rule for runs on that rule, not a draw. Seeded draws stay for gunnery spread and small
noise. Examples already ruled: the scuttle is BRIDGE §7's timed crisis (`scuttleChance` 0.5 is a coin); captains'
pushback follows BRIDGE §1 trait rules.

## Do
1. **Audit first, change nothing:** list every seeded draw in `src/battle/sim/**` (file, line, what it decides). For
   each, run WORLD-02 c3 and WORLD-01 c6 on seeds 1-60 with that one draw pinned to its mean (or most likely branch),
   and table how much each moves the outcome spread. Commit the table before any change.
2. Replace the draws that move outcomes most, largest first, with the rule the vision gives (cite the line). Where the
   vision is silent, cut the draw's range instead and say so. Stop when the bars hold on 61-90, or when no draw left
   moves them, and report.
3. Draws inside `src/battle/sim/comms/**` belong to PKG-22 (running now): measure them, but put any change under
   Requests unless PKG-22 has merged when you reach it (then they are yours).
Files you own: every seeded-draw line you change in `src/battle/sim/**` outside `comms/**` (name each), `numbers.ts`,
`boarding/numbers.ts`, `vision/sims/**`, tests. Must not touch: `policy-good.ts`, `policy-bad.ts` (the instruments
stay fixed), `admiral/**` decision logic beyond its draw lines, `src/battle/view/**`, `setups/**`.
Flag: none. Save: unchanged.
Acceptance: tsc; `npx vitest run --maxWorkers=4`; lint `src/battle/sim/**`; build; smoke; WORLD-01 swap and WORLD-02 at
`--seeds 30 --from 1`, `31`, `61`; the audit table's commit older than the first change. Report `reports/PKG-24.md` with
the audit table and a numbers-changed table (old → new → vision line → the sim line that proved it).

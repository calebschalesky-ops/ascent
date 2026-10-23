# PKG-19-good-plan
Label: PKG-19 · Kind / seat: build / **Palamedes** (read `<local>`) · Base:
`claude/game` @ <launch tip> · Port: none (headless) · Worktree `pkg-19`

Makes these pass, judged on **held-out seeds** (amendment A8): WORLD-02 check 3 (good beats idle) and check 4 (bad worse
than idle) at 24 of 30 on seeds 61-90 **and** on 31-60; WORLD-01 check 6 (swap Nerve and Judgement) 24 of 30 on 61-90.
Every other built WORLD check keeps passing at 30 seeds. Read first: `reports/PKG-16.md` sections 4 and 5.

## Measured by Daedalus on claude/game @ 554251a (re-run in verify)
- WORLD-02 c3: 24/30 on seeds 1-30, 59/90 on 1-90 (so 35/60 on 31-90). c4 83/90. WORLD-01 c6: 29/30 on 1-30; PKG-16
  measured 23 and 22 on 31-60 and 61-90.
- Cause (PKG-16, accepted): scripted-good is Jupiter's own plan minus its delays, played against Jupiter: a near-mirror,
  so it cannot show that a good plan beats doing nothing.

## Ruling (Daedalus, 2026-10-21)
`scripted-good` and `scripted-bad` are test instruments, not the game. You may replace them (rule 3 of PKG-16 is lifted
for these two policies only), on one condition: **write the plan first.** Before running any seed, write in your report
what the good plan does and the vision line each move comes from (VISION §7a, BRIDGE §12b, the sound plays of battles
1, 2, 4, 7, 17 in `battle-sims/01-17-reviewed-with-caleb.md`: e.g. focus one enemy side, keep escorts on their screen,
board through an open side, take the flagship). The bad plan likewise (the mistakes those battles name). Commit that
section before the first measurement; never edit it after seeing a result (amendment A3). Then measure.

## Do
1. Add `--from N` to `scripts/sim.mjs` (first seed; default 1), so held-out blocks are one command.
2. Write the plans (above), commit, then build them as new policy files; point the two `policies.ts` entries at them.
3. Measure c3, c4 on 1-30, 31-60, 61-90. If c3 still fails on held-out seeds with a real good plan, that is a finding
   about the rules: you may then tune shared numbers (`numbers.ts`, `boarding/numbers.ts`) on seeds 1-60 only, judged
   on 61-90, and give a numbers-changed table. Never tune on 61-90.
4. WORLD-01 c6 the same way: trait effects in `numbers.ts`, tuned on 1-60, judged on 61-90.
5. If two bars can't both hold on held-out seeds, stop and report the trade-off with numbers.

Files you own: `scripts/sim.mjs` (the flag), new `src/battle/sim/policy-good.ts`, `policy-bad.ts`, the two
`scripted-good` / `scripted-bad` lines in `policies.ts`, `numbers.ts` and `boarding/numbers.ts` (step 3-4 only),
`vision/sims/**`, tests. Must not touch: `admiral/**` logic (Jupiter's own plan stays), `src/battle/view/**`,
`setups/**` (PKG-20), everything else beyond rule-9 lines.
Flag: none. Save: unchanged.
Acceptance: tsc; `npx vitest run --maxWorkers=4`; lint `src/battle/sim/**`; build; smoke; WORLD-01 swap and WORLD-02 at
`--seeds 30` with `--from 1`, `31`, `61`; the plan section's commit hash older than the first measurement. Report
`reports/PKG-19.md`.

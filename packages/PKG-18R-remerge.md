# PKG-18R-remerge
Label: PKG-18R · Kind / seat: build (merge retry) / Talos (read `<local>`) · Base:
`claude/pkg-18` @ 797f76f · Port: none · Worktree `.claude/worktrees/pkg-18` (exists; reuse it)

PKG-18's work passed its own acceptance twice and was reverted twice by the gate (98fc43c, e6e87f5) on timeouts in
`hardpoints.test.ts` under parallel load, a file it does not own. Daedalus ruled that a gate fault (amendment A7,
`<local>`): the gate now runs `npx vitest run --maxWorkers=4`.
Read `reports/PKG-18.md` on `claude/pkg-18` (its two Gate sections and Requests) and `HOUSE-RULES.md` rule 4.

## Do
1. In the pkg-18 worktree, merge the current `claude/game` tip into `claude/pkg-18` (it will include PKG-17 and maybe
   PKG-16 by then; conflicts only in PKG-18's own files or registry lines, else stop and report blocked).
   **The game tip carries the revert e6e87f5, so that merge removes PKG-18's work from the branch.** Then run
   `git revert --no-edit e6e87f5` on `claude/pkg-18` to put it back, and check `git diff claude/game --stat` shows
   PKG-18's maneuver files and the setup name line before going on.
2. Re-run PKG-18's acceptance on the merged result: tsc; `npx vitest run --maxWorkers=4`; lint `src/battle/sim/**`;
   build; smoke; WORLD-01/02 built checks at `--seeds 10`, before (game tip) and after (merged), pasted.
3. Merge through the lock and the amended gate (HOUSE-RULES rule 4). On a gate failure, revert at once as rule 4 says.
4. Append a "Gate, third attempt (PKG-18R)" section to `reports/PKG-18.md` with the raw output, and commit it before
   the merge.

Files you own: none new. You change no code beyond the merge itself and conflict lines in PKG-18's own files
(`src/battle/sim/maneuvers/**`, the ship-name strings in `src/battle/sim/setups/saturn-12v12.ts`).
Acceptance: as step 2, plus the gate passing. Report: the appended section in `reports/PKG-18.md`.

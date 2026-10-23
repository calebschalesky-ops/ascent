# House rules: every build thread on Ascent Flight reads this

From `<local>` section 10, plus Ascent specifics. Kept by Daedalus.

## Where things are

- **Repo:** `<repo>`. **Game branch:** `claude/game`. **Game worktree:**
  `<repo>` (the only place merges, `MERGE.lock` and reverts happen).
- **Your worktree:** `.claude/worktrees/pkg-NN` on branch `claude/pkg-NN`, made by Daedalus before you start. It has a
  `node_modules` junction to the main checkout's; do not run `npm install`/`npm ci` (it would write through the
  junction into everyone's modules). If you need a new dependency, write it under Requests and stop on that part.
- **Vision documents are untracked files in the main checkout**, read them by absolute path:
  `<repo>\VISION.md`, `NAVY-DESIGN.md`, `BRIDGE-DESIGN.md`, `battle-sims\*.md`. Never edit,
  copy or commit them. Read by section (`grep -n '^#'` first), not whole.
- **Commands:** `npx tsc -b`, `npx vitest run`, `npm run lint`, `npm run build`. Baseline on `claude/game` @ ed63d04,
  2026-10-21 14:27: tsc clean, vitest 51 files / 662 tests passed.

## Standing rules (Caleb's; never bent)

- Local only: nothing pushed, hosted or merged to `master`.
- **Never use port 5293** (Caleb's own server and save). Your dev server runs on the port your package names
  (`npx vite --port <port> --strictPort --host ::1`) and you open it at `http://[::1]:<port>/` so test saves never
  touch Caleb's `localhost` origin.
- No Red Rising names (names come from Greek, Roman, Byzantine history and `LORE.md`). Each people has one look
  (`ART-DIRECTION.md`). The Ascent repo (`Work\the-ascent`) is read-only. No astrology or occult meaning.
- Stay in Phase A: no strategy map, economy, power, government or dynasty.
- Gemini: you do not drive it. Need painted art? Add a request to `GEMINI-QUEUE.md` (main checkout) and use a
  code-drawn placeholder.

## The rules

1. **Stay in your files.** Need someone else's? Write the change you need under "Requests" in your report and keep
   going on what you own. Two threads each adding a line to a registry list (including `package.json` scripts) is the
   one conflict anyone may resolve, by keeping both lines.
2. **Prove it on screen.** Tests are not enough. Play your `ui` steps in the browser: open your own tab
   (`tabs_create`), never drive another agent's tab. When the pane is hidden `requestAnimationFrame` is paused: step
   time with `window.__probe.advance()` (once it exists) or by calling the frame function by hand. WebGL may screenshot
   black in a hidden pane; render by hand and read the canvas. The harness sends Space as an empty key: use a
   synthetic `KeyboardEvent` for space-bar tests.
3. **Ship it safe.** New systems behind your flag in `src/flags.ts` (the file is created by the first package that
   needs it; append-only list), on only if your steps pass. Changed save shape: bump the version, add the migration,
   the fixture test passes. New UI uses the shared tokens; no raw colours or fonts outside them except in art files.
   **Battle sim code under `src/battle/sim/` imports nothing from three.js, React, the DOM or `src/components/`, and
   draws randomness only from the battle's seeded RNG.**
4. **Merge yourself, through the lock and the gate.** When your acceptance passes:
   1. Take the lock: create `MERGE.lock` in the game worktree containing your label and the time. If it exists and is
      under 30 minutes old, wait 2 minutes and retry. Older: take it only if the game worktree shows no merge in progress (`git status`) and no commit newer than the lock's time; otherwise wait (amendment A10). Note it in your report. While you hold the lock, rewrite its time line at each gate step.
   2. In your worktree, merge the current game tip into your branch (`git merge claude/game`). Resolve conflicts in
      your own files and registry lists only. Any other conflict: delete the lock and report blocked.
   3. Re-run every acceptance command on the merged result.
   4. `git -C <game worktree> merge --no-ff claude/pkg-NN -m "Merge PKG-NN: <one line>"`.
   5. **The gate**, in the game worktree: `npx tsc -b`, `npx vitest run --maxWorkers=4` (amendment A7, 2026-10-21: the full-width run times out under parallel load), `npm run build`, and, once `smoke` exists
      (after PKG-03 lands), `npm run smoke`. If the only failures are in test files your merge did not change, re-run exactly those files alone (`npx vitest run <files> --maxWorkers=1`); all pass = load fault, the merge stands, paste both runs (amendment A9). Otherwise, if any fails, revert your merge at once
      (`git -C <game worktree> revert -m 1 --no-edit HEAD`), delete the lock, and report failed with the output.
   6. Delete `MERGE.lock`. Then report.
   Do not leave the game worktree dirty: no untracked files, no edits. Build output (`dist/`) is ignored.
5. **Report shape:** commit `reports/PKG-NN.md` on your branch before the merge: what you measured, what you changed,
   what is still broken; one row per script step in your package (pass / wired-but-unproven / not built); flag state;
   save version; the evidence block (`git log --first-parent -3` on the game branch after the merge, `git diff --stat`
   of your merge, the raw test, lint, tsc and gate output with a timestamp newer than your last edit, screenshot
   paths under `shots/pkg-NN/`). A report with no pasted output is not a report. Add "Requests" and "Assumed, for
   Caleb to overrule" sections.
6. **Then close.** Stop your dev server, close your browser tab, write nothing else, and end with the short final
   message your launch prompt asked for.
7. **A negative finding is a measurement.** "Could not do X on <date> by <methods>; re-test costs <n> calls." Never
   "X is impossible."
8. **Batch independent reads and edits into one message. Read file ranges, not whole files.**
9. **Shared sim files are registries (from wave 2).** Several packages extend `src/battle/sim/` at once. In
   `types.ts`, `orders.ts`, `battle.ts`, `summary.ts`, `checks.ts`, `numbers.ts` and `policies.ts`, add only: a member
   to a union or `ORDER_KINDS`, a field to an interface, a `case` to `order()`'s switch, one call line in `step()`'s
   per-tick sequence (calling a function that lives in your own new file), an entry in a numbers table, a check row, a
   policy entry. Put the logic in your own new files. A conflict made only of such lines is resolved by keeping both.
   Changing an existing line in those files is not a registry line: write it under Requests instead, unless your
   package names that line as yours.
10. **Numbers are data.** Every tunable number goes in your system's one numbers table, marked first-pass, for
   Palamedes to prove by sim.

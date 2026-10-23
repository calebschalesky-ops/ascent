# PKG-23-tests-and-end
Label: PKG-23 · Kind / seat: build / **Talos** (read `<local>`) · Base: `claude/game`
@ <launch tip> · Port: none · Worktree `pkg-23`

1. **Load-proof tests** (amendments A7, A9): the gate reverted three good merges on load. Every test that asserts a
   wall-clock time or runs long (named so far: `hardpoints.test.ts`, swarm performance, view "ends with an outcome",
   maneuvers, admiral, sim battles; find the rest by running the suite under load) either gets a per-test timeout that
   fits a loaded machine, or moves its time bar out of vitest into a `npm run bench` script (registry line in
   `package.json`). No assertion is deleted: a moved bar still runs in `bench`.
   Bar: the full suite passes 3 times in a row with `--maxWorkers=4` **while** two other `npx vitest run` processes run
   on the same machine (paste all three).
2. **QA-05 F-06:** a battle where one side has no ship left in the field (all lost, captured, fled or struck) ends with
   an outcome within 15 s, every time; a test with a seed that reproduces the old hang if you can find one (QA saw it
   in 1 of 4 runs: run 1, `qa/WAVE-05.md`).
Files you own: test files (timeouts and moved bars only), `scripts/bench.mjs`, the `bench` line in `package.json`,
the end check in `src/battle/sim/battle.ts` (name the lines; rule 9). Must not touch anything else.
Acceptance: tsc; the 3-run load test; `npm run bench` passes quiet; build; smoke. Report `reports/PKG-23.md`.

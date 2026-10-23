# PKG-01-merge-backlog
Label: PKG-01 (session title prefix, branch `claude/pkg-01`, report heading)
Kind / seat: build / Talos (read `<local>` first; its fence paths are for gamestudio, yours are below)
Base: claude/game @ <measured at dispatch, in the launch prompt>
Port: 5201. Worktree: `<repo>`
Makes these steps pass: none directly. It is the method's foundation step "merge finished branches first" so the game
Caleb plays carries the finished work before Phase A lands on top (METHOD §3 "Foundation order").
Why: four finished branches sit unmerged (TEAM-BOARD.md in the main checkout, "Finished, waiting for the integrator").
The integrator session is idle and Caleb ruled: "don't wait for the integration thread."

## What to merge, in this order (each one: merge into `claude/pkg-01`, then tsc + vitest before the next)
1. `claude/eve-controls` @ cb412c2 (E4–E8; 2 commits ahead of integration-5). Known: 4 hunks in `Voyage.tsx` against
   integration-5; the recipe is in integration-5's THREAD-LOG.md (search "eve-controls merge recipe") and TEAM-BOARD
   "Requests". Follow that recipe, folding in select-and-track (`trackedGun` aimed at the active lock).
2. `claude/ship-loadout-look` @ 5eb3f30 (3 ahead). Coordinator test-merged clean onto 6a1df00. Its commit a5d4840
   (24 lines of wiring in Voyage/GameView/Shipyard/progress.ts) is kept separate "to take or drop": **take it** unless
   it conflicts with step 1's result in a way you cannot resolve inside those 24 lines; then drop it and say why.
   `Shipyard.tsx` is held by the running Wave A session (<session>): if a5d4840 touches it, take it anyway (that
   session's branch is behind and will merge onto ours later), and list it under Requests.
3. `claude/look-unify` @ 4c6232f (15 ahead; also carries `one-look-per-people` @ 40d650f, so do not merge that one
   separately). Report: `LOOK-UNIFY.md` on that branch.
4. `claude/graphics-pass-3` @ 42f265f (2 ahead): the painted-pilot picker code and gemini-clean rules, no images.
Before each: check the tip hash still matches; if it moved, merge the new tip and say so.
Do NOT merge: `wave-a-upgrades` (its session is still running, uncommitted), `specials-spawn` and
`graphics-pass-3-264f8a` (already in), or anything else.

Files you own: conflict resolution in any file these four branches touch. You author no new features.
Files you must not touch: `src/battle/**`, `src/flags.ts`, `src/App.tsx` beyond what a merge brings, and
`DAEDALUS-*.md`, `vision/`, `packages/`, `HOUSE-RULES.md`.
Flag: none (these are finished, already-proved branches).
Save shape: if any branch bumped the save version, keep its migration; say which in the report.
Decided for you: one merge commit per branch on `claude/pkg-01` (so a bad one can be found), then the whole branch
merges into `claude/game` through the lock as one `--no-ff` merge.
You cannot prove: whether the controls feel right after the merge (Caleb's call).

Acceptance commands: after all four, in your worktree: `npx tsc -b` clean; `npx vitest run` has no failures (record
the new counts; nothing that passed on the base may fail); `npm run lint` (report count vs base, do not fix
pre-existing ones); `npm run build`. Then in the browser on `http://[::1]:5201/`: start a new game, fly, fire, open
the shipyard view, and screenshot; zero new console errors; E4–E8 keys respond as eve-controls' report says
(find the report on that branch and check its key list).
Report: `reports/PKG-01.md`, shape in `HOUSE-RULES.md`, with a row per merged branch: merged / dropped (why) /
conflicts and how resolved.

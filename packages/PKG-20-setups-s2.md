# PKG-20-setups-s2
Label: PKG-20 · Kind / seat: build / Talos with Kalliope for names (read `<local>`,
`kalliope.md`) · Base: `claude/game` @ <launch tip> · Port: 5220 at `http://[::1]:5220/?skirmish` · Worktree `pkg-20`

Phase B's package **S2** (`vision/scripts/PHASE-B-INVENTORY.md`, "Suggested packages"; rulings on the board, section
"Phase B"). Phase B done points need "fleet battles at more than one location"; only `saturn-12v12` exists. Makes
these start states exist: every `Start state:` line in `vision/scripts/EXP-07.md`..`EXP-15.md` and every setup named in
`WORLD-03.md`..`WORLD-06.md` (list them first; build each one a script names, nothing else).

## Do
1. A setup registry: `?skirmish&setup=<id>` picks a setup (default stays `saturn-12v12`, unchanged and still the
   smoke's); the runner takes `--setup <id>`.
2. The named setups as data in `src/battle/sim/setups/*.ts` (body, positions, fleets, wings where a script names them,
   reinforcement waves as data a later package fires). At least Europa (Jupiter) and one more body. Rosters as fixtures
   in `setups/rosters/` (`candour-mix` and the others the scripts name), fair-roster rule kept.
3. The scene draws the setup's body (reuse the voyage game's planet art; one people, one look; no new painted art: a
   need goes in `GEMINI-QUEUE.md`).
4. Names: houses and ships from Greek, Roman, Byzantine history and `LORE.md`; no Red Rising names (Kalliope's call;
   list every new name).
Not yours: fighters (F1), boarding, morale, admiral styles (other packages build what fills these setups).

Files you own: new files in `src/battle/sim/setups/**` (not `saturn-12v12.ts`), the setup registry, the `setup` param
in `Skirmish.tsx` (name the lines), the body line in `src/battle/view/scene.ts` (name it), `scripts/sim.mjs` `--setup`
flag only (PKG-19 adds `--from` in the same file: registry rule, keep both), `types.ts` BattleSetup fields (rule 9),
tests, `shots/pkg-20/**`. Must not touch: `numbers.ts`, `policies.ts`, `policy-*.ts` (PKG-19), `checks.ts`.
Flag: none (the default setup is unchanged). Save: skirmish saves nothing.
Acceptance: tsc; `npx vitest run --maxWorkers=4`; lint; build; smoke; each new setup runs headless 3 seeds to an
outcome (`npm run sim -- --setup <id> --seeds 3`); each opens on screen with its body (screenshot, 1280 and 375);
saturn-12v12 WORLD-01/02 at `--seeds 10` identical before and after. Report `reports/PKG-20.md`.

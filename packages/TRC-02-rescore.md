# TRC-02-rescore
Label: TRC-02 · Kind / seat: trace / Momus (read `<local>`; its fence paths are for
gamestudio; you write only `vision/traces/` here) · Base: tag `wave-02` (detached worktree `trc-02`) · Port: 5220 at
`http://[::1]:5220/`

## Job
Replay **every** script on the tag `wave-02` and write one trace per script: `vision/traces/<script>.md` = the
script's table plus a **Result** column per step/check: `pass` (did it, saw it: screenshot path or sim output path),
`partial` (what happened instead), `missing` (the system does not exist), `contradicts` (the game does something the
vision rules against: quote the vision line), `blocked` (an earlier step failed: name it). Then a two-line summary per
script: score and the most important non-pass.

Scripts: `vision/scripts/EXP-01.md` … `EXP-06.md`, `WORLD-01.md`, `WORLD-02.md` in the game worktree
(`<repo>`), read them from there.

## How
- Play scripts: dev server in your worktree (`npx vite --port 5220 --strictPort --host ::1`), open
  `http://[::1]:5220/?skirmish&probe` in your own tab. Setup and readings through `window.__probe` (`seed`, `advance`,
  `state`); steps marked `ui` through real clicks and keys with a screenshot. A `ui` step done through `act()` is not a
  pass. The pane may be hidden: `advance()` renders frames by hand.
- World scripts: `npm run sim -- --script WORLD-01 --seeds 10 --minutes 15 --policy idle --no-write` (and the swap
  variant), `npm run sim -- --script WORLD-02 --seeds 10 --minutes 15 --no-write`; quote the tables.
- Reading code to guess a result is not a trace. Where the UI for a step does not exist yet, the row is `missing` even
  if the sim does it; say "sim does it (test name)" in the note.
- Be a first-time player where the script says `ui`: if you can't tell what to press, that is a finding.

Files you own: `vision/traces/**`, `shots/trc-02/**`. You commit them on branch `claude/trc-02` (Daedalus made it from
`wave-02`) and merge into `claude/game` through the lock (HOUSE-RULES rule 4; your change is docs and images only,
the gate still runs).
Must not touch: anything else.
Acceptance: eight trace files, every row has a Result, every pass has a path. Report `reports/TRC-02.md`: the
scoreboard (script: passes/total), the list of non-pass rows grouped by system, time taken.

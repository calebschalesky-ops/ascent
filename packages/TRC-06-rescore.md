# TRC-06-rescore
Label: TRC-06 · Kind / seat: trace / Momus (read `<local>`; you write only
`vision/traces/` and `shots/trc-06/`) · Base: `claude/game` @ <launch tip> (branch `claude/trc-06`) · Port: 5236 at
`http://[::1]:5236/`

Same job and rules as `packages/TRC-05-rescore.md` (read it and `reports/TRC-05.md`), on the launch tip. Every Phase A
script: EXP-01..06, WORLD-01, WORLD-02. Column **Was (wave-05)** with TRC-05's result per row; regressions first.
- New since wave-05: PKG-19 (good/bad plans, `--from`), PKG-20 (setup registry; default unchanged), PKG-21 (title-screen
  "Fleet battle", skirmish flag on, input fixes, enemy list, escort warning), PKG-22 (open-side reports, keys answer the
  card on screen, capture cards, matching answers), PKG-23 (battle ends when a broken side has nothing fighting).
- **Start every play script from the title screen** (`http://[::1]:5236/`, click "Fleet battle"), not `?skirmish`, at
  least once; Caleb will.
- World scripts at `--seeds 30 --from 1`, `31`, `61` (amendment A8) and `--seeds 10`. Paste the bar column.
- Re-test every TRC-05 and QA-05 defect marked fixed by PKG-21 or PKG-22 (their reports list them): fixed / not.
- Play EXP-06 step 6 for real at least twice (seeds 6 and 7), escorts left on their screen in one; and done point 4 by
  your own order (open a side, send the pods, capture). Say what you ordered and what happened.
- Note how long a first-time player would need to read before they can win; that goes in Caleb's play card.
Report `reports/TRC-06.md`: scoreboard, regressions, defects still open, non-pass rows by system, time taken. Commit on
`claude/trc-06`; merge through the lock and gate (`HOUSE-RULES.md` rule 4, A9, A10; delete only your own lock).

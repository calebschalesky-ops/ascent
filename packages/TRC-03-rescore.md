# TRC-03-rescore
Label: TRC-03 · Kind / seat: trace / Momus (read `<local>`; you write only
`vision/traces/` and `shots/trc-03/`) · Base: tag `wave-03` (branch `claude/trc-03`) · Port: 5221 at
`http://[::1]:5221/`

Same job and rules as `packages/TRC-02-rescore.md` (read it: every script, a Result per row, `ui` steps through the
real UI, world scripts through the runner, no reading code to guess), on tag `wave-03`. Differences:
- Overwrite `vision/traces/<script>.md` with this wave's result, and add a column **Was (wave-02)** with TRC-02's
  result for that row, so regressions (pass → anything else) are visible. List every regression first in the report.
- The UI now has the comms queue (Q/E/R, Tab), the roster strip, direct orders by clicking an enemy, the flagship crew
  panel, the command meter (PKG-09); the directing camera and PiP (PKG-11); maneuvers in the sim only (PKG-10: their
  on-screen picker and ghost lines are not built yet, so EXP-03 rows stay `missing` on screen).
- Play EXP-06 step 6 for real at least twice (seeds 6 and 7): try to win by breaking half the enemy fleet through the
  UI. Say what you did and what happened.
Report `reports/TRC-03.md`: scoreboard, regressions, non-pass rows grouped by system, time taken.

# TRC-05-rescore
Label: TRC-05 · Kind / seat: trace / Momus (read `<local>`; you write only
`vision/traces/` and `shots/trc-05/`) · Base: `claude/game` @ <launch tip> (branch `claude/trc-05`) · Port: 5225 at
`http://[::1]:5225/?skirmish`

Same job and rules as `packages/TRC-03-rescore.md` and `TRC-02-rescore.md` (read both), on the launch tip. This rescore
folds wave 4's (amendment A5), so it replays **every** Phase A script: EXP-01..06, WORLD-01, WORLD-02. Differences:
- Column **Was (wave-03)** with TRC-03's result per row; list every regression first.
- New since wave 3: tactical view (T), maneuver picker and ghost lines (PKG-12), bridge fixes and boarding through an
  open side (PKG-14), look pass (PKG-15), the admiral and fair rosters (PKG-13, PKG-16), picking by screen distance
  with a hover ring and a new help line (PKG-17), maneuvers fly the line (PKG-18).
- World scripts at `--seeds 10` and `--seeds 30`, and WORLD-02 and WORLD-01 swap also at `--seeds 90` (amendment A8:
  seeds 31-90 are the held-out judge for checks whose numbers were tuned on 1-30). Paste the bar column.
- EXP-03 step 3b by eye: does the broadside-pass ghost line run parallel to the target line, guns trained across, or
  does it still head off toward the planet side? Screenshot.
- Play EXP-06 step 6 for real at least twice (seeds 6 and 7). Keep escorts on their screen in one of the games
  (PKG-16 found ordering them off it is what loses). Say what you ordered and what happened.
Report `reports/TRC-05.md`: scoreboard, regressions, non-pass rows grouped by system, time taken. Commit on
`claude/trc-05` and merge through the lock and gate (`HOUSE-RULES.md` rule 4).

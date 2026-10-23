# SCR-B-phase-b-scripts
Label: SCR-B · Kind / seat: design (scripts, for Daedalus to review) · Base: claude/game @ 98fc43c · Port: none ·
Worktree `.claude/worktrees/scr-b` on `claude/scr-b`

Caleb handed over Phase B on 2026-10-21: `<local>` (read it whole, 87 lines).
It runs under the method's process, not the prompt's own process lines (no integrator, no TEAM-BOARD); Phase A is
still finishing on `claude/game`. Your job is method step 1 for Phase B: turn its eight "done" points into scripts,
then score them against the code that exists. You write no code and no package files.

## Read first (by section; `grep -n '^#'` before reading any big file)
- Method step 1 (script formats): `<local>` lines 195-241.
- Templates, copy their shape exactly: `vision/scripts/EXP-05.md`, `vision/scripts/EXP-06.md`, `vision/scripts/WORLD-02.md`
  (in your worktree). Phase A scripts are EXP-01..06 and WORLD-01..02: don't repeat their steps; Phase B steps may
  build on them.
- Vision (untracked, main checkout, absolute paths, never edit/copy/commit): `<repo>\VISION.md`
  sections 1a, 2 (rulings), 7, 7a, 7b, 8, 9, 16 (Phase B rows), 19; `NAVY-DESIGN.md` sections 3, 4, 6; `BRIDGE-DESIGN.md`
  sections 1-8, 10, 12b; `battle-sims/01-17-reviewed-with-caleb.md` battles 3, 5, 6, 8, 10-16, and from the newer
  files the commodore defection, the Fanatic scuttle, comms destroyed, repelling a boarding of your own flagship.
  The battle-sims are examples, not scripts.

## Do
1. **Play scripts** `vision/scripts/EXP-07.md` onward, one per Phase B done point 1-7 (split a point if it is too
   big to walk in one sitting; keep the done point's number in each title). Each step is a thing a tester does and
   sees on screen, with the vision line it comes from cited (file + section). Mark which steps can be checked through
   the probe (`window.__probe`) and which need eyes.
2. **World scripts** `vision/scripts/WORLD-03.md` onward for what a headless sim must show: done point 8 (at least
   eight reference battles "in spirit", outcomes driven by decisions and captains' characters, never luck), morale
   collapse on flagship/admiral loss, lying captains caught by the sensor officer's picture, AI admiral styles being
   distinguishable and the low difficulty making deliberate mistakes. Each check gets a measurable bar and seed count
   (Phase A uses 8 of 10 at 10 seeds, 24 of 30 at 30 seeds; setup choices across 8 values, amendment A3).
3. **Inventory** `vision/scripts/PHASE-B-INVENTORY.md`: for every step and check, what already exists on this branch
   under `src/battle/**` (grep it; cite file and function), scored `exists`, `partial`, or `missing`; a first score
   per script (`EXP-07: 2/9 exist`); and a suggested split of the work into packages along code lines (the prompt's
   N2, N3, B2, B3, B4, B5, M2, AI2, Q-B are a starting point; say where a package would collide with another on the
   same files, and which shared sim files each would extend, see `HOUSE-RULES.md` rule 9).
4. **Flags for Daedalus** at the end of the inventory: anywhere the vision contradicts itself, anything a done point
   needs that falls in Phase C (strategy map, economy, power, government, dynasty: out of scope, say so and stop
   there), and every reading you had to assume.

Rules: no Red Rising names in any example you write; each people has one look. Touch nothing outside
`vision/scripts/**` and this package's own report. Commit on `claude/scr-b` (message "SCR-B: ...") and **do not merge**;
Daedalus reviews and merges it. Write the report as `reports/SCR-B.md` (files written, script count, step count,
inventory totals, flags). Final message at most 15 lines: result, scripts and step counts, inventory score, top 3
flags, commit hash.

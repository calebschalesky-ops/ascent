# PKG-10-maneuvers-sim
Label: PKG-10 · Kind / seat: build / Talos (read `<local>`) · Base: claude/game @
<launch prompt> · Port: none (headless) · Worktree `pkg-10`

Makes these steps pass (sim side, by tests and the runner): EXP-03 steps 4, 5, 6, 7 as flown paths; the data the
ghost line needs for step 3 (`previewManeuver` returns the path and its time to completion); EXP-02 step 9 (the
helm's maneuver is flown). On-screen ghost lines are the tactical-view package next wave: report those halves as
wired-but-unproven. Scripts: `vision/scripts/EXP-03.md`, `EXP-02.md`.

Vision: BRIDGE-DESIGN.md §12b (the three layers; the eight named maneuvers; the five rules: the look never changes the
result, every order is carried out or refused out loud, the ghost line before it runs, override any time with a short
believable turn, your own ship is yours); VISION.md §8 "Maneuvers (R6)". Absolute path
`<repo>\BRIDGE-DESIGN.md`, lines 253–297.

## Build, in `src/battle/sim/maneuvers/**` (new)
- **The first six maneuvers** as shaped paths a ship flies: broadside pass, crossing the line, flanking arc (onto a
  chosen weak side), boarding run (escorts lead, carrier dives, pods launch at the closest point via PKG-05's `board`,
  escorts break away), defensive wheel (a group rotates so a fresh side faces the threat), fighting withdrawal (back
  away strong side forward, covering in turn). Each is a function of (battle, ship or group, target, params) → a path
  (points with times) inside the ship's turn and acceleration limits.
- **The captain chooses how:** Helm sets tightness and speed (Helm 9 finishes sooner and holds the path tighter than
  Helm 3; a test proves it), traits shade the choice (a Bold captain goes straight in, a Veteran swings wide onto the
  open side) per §12b's example.
- **`previewManeuver(battle, shipIds, name, target)`** → `{ path: V3[] per ship, eta }`, pure (no state change), the
  same path the ship will then fly: a test asserts the flown track stays within a set distance of the preview.
- **Orders:** add `maneuver` (`{kind:'maneuver', name, target, side?}`) to `ORDER_KINDS`/`order()`; make PKG-06's
  `helm {maneuver}` officer order fly the flagship's maneuver through the same code (read where PKG-06 stores it;
  if wiring it needs a changed line in `comms/`, it is yours, one line, named in the report).
- **Override:** a new order mid-maneuver breaks off with a short turn within the ship's turn-rate limit (test: heading
  rate never exceeds the limit on a cancel).
- **Rule 1:** the maneuver changes position and timing only through the same movement limits; hit chance stays
  gunnery × range × facing. A test: the same seed with a maneuver order flown "cinematic" vs plain produces the same
  hit rolls given the same geometry (or explain why the test is different).
- Movement hook: one call line in `step()` (rule 9) so a ship on a maneuver follows its path instead of steering.
- Numbers in `src/battle/sim/maneuvers/numbers.ts`.

Files you own: `src/battle/sim/maneuvers/**`, rule-9 lines in the shared sim files, one named line in `comms/` if
needed, tests.
Must not touch: morale/break/outcome code, `numbers.ts` existing entries, `summary.ts`, the setup (PKG-08, running:
it is changing those; on conflict keep both of any rule-9 lines), `admiral/**`, `src/battle/view/**` (PKG-09, PKG-11),
everything else.
Flag: none. Save shape: unchanged.
Assumed, for Caleb to overrule: path shapes and the trait shading.
You cannot prove: whether they look like a navy (Zeuxis and the director, later).
Acceptance: tsc; vitest (one test per maneuver; preview = flown; Helm tight vs loose; cancel turn limit; determinism);
lint `src/battle/sim/**`; build; smoke; WORLD-01 and WORLD-02 built checks no worse than the tip you merge onto (run
both before and after, paste both). Report `reports/PKG-10.md`.

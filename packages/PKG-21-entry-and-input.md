# PKG-21-entry-and-input
Label: PKG-21 · Kind / seat: build / Talos with Zeuxis (read `<local>`, `zeuxis.md`)
· Base: `claude/game` @ <launch tip> · Port: 5221 at `http://[::1]:5221/` · Worktree `pkg-21`

Makes these pass: Phase A done point 1 from the title screen; EXP-03 maneuver commits; EXP-06 step 6 orders land on
the ship meant. Read first: `qa/WAVE-05.md` (QA-05, Momus cold play on ad81038; findings by number, repro steps, shots in `shots/qa-05/`). Each finding below must be re-played through the real UI after your fix, at 1280 and 800 (375 where named), with a before and after screenshot.

## Ruling (Daedalus, 2026-10-21)
F-01 is a BLOCKER: done point 1 is "Caleb can open the build and fight", and the play card will send him to the title
screen. Turn the `skirmish` flag **on** and add a title-screen entry ("Fleet battle" or the house wording) that opens
the skirmish. `?skirmish` keeps working. The voyage game is unchanged otherwise.

## Do
1. **F-01** title entry + flag on (`src/flags.ts` line, the entry lines in `src/components/GameView.tsx`: name them).
2. **F-05** Boarding run (and every maneuver) commits on Enter and on the Commit button; the picker bar clears on
   commit, cancel, and battle end. A test per maneuver kind.
3. **F-13** the roster does not reflow under the cursor when a ship leaves (a gone ship keeps its slot, greyed, or
   selection follows the ship, not the slot); the selected ship and the ship a maneuver opens for are always the same.
4. **F-12** a miss on "Guns on…" gives feedback (the armed state is visible until a pick or Esc; a miss says so).
5. **F-11** R (when it is the camera key) restores the default tactical and normal views from any angle; the view
   never tilts on its own.
6. **F-15** at 375 px a visible Tactical button opens the tactical view.
7. **PKG-17's request:** order an enemy that is off screen or under a panel (an enemy roster strip or a target list
   the order menu can pick from).
8. **PKG-16's request:** ordering an escort off its screen shows a one-line warning on the order ("Escort leaves the
   screen") before commit; nothing blocks it.

Files you own: `src/flags.ts` (skirmish line), the title-entry lines in `GameView.tsx`, `src/battle/view/tactical/**`,
`src/battle/view/director/**`, `camera.ts`, the roster strip and order menu (name the files), the escort warning,
`Skirmish.tsx` lines for the above (name them; PKG-20 adds `setup` lines in the same file: keep both),
`src/battle/view/*.css`, tests, `shots/pkg-21/**`.
Must not touch: `src/battle/view/comms/**` and `src/battle/sim/comms/**` (PKG-22), `src/battle/sim/**` (PKG-19,
PKG-20, PKG-23), `scene.ts` body line (PKG-20).
Flag: `skirmish` on. Save: voyage save unchanged (fixture test passes).
Acceptance: tsc; `npx vitest run --maxWorkers=4`; lint; build; smoke; the title entry clicked from `/` at 1280 and
375; each finding re-played (shots); a 40-click run as PKG-17's at 1280. Report `reports/PKG-21.md`.

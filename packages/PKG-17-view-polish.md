# PKG-17-view-polish
Label: PKG-17 · Kind / seat: build / Zeuxis with Talos (read `<local>`, `talos.md`) ·
Base: claude/game @ <launch prompt> · Port: 5217 at `http://[::1]:5217/` · Worktree `pkg-17`

Makes these steps pass: EXP-06 step 6 playable through the UI (orders land on the ship he clicked); EXP-02 steps 6, 10
hold under fast clicking; no lost passes. Read first: `reports/TRC-03.md` (EXP-06 s6 "about 40% of my clicks on
enemy ships missed"; MAJOR "R answers the top report while the help line says it resets the view"),
`reports/PKG-15.md` Requests (engine glow), `reports/PKG-12.md`, `reports/PKG-09.md`.

## Measured (TRC-03 on wave-03; Daedalus on PKG-12's shots)
- ~40% of clicks on enemy ships missed (TRC-03, real mouse events in headless Chrome).
- The help line says R resets the view; R answers a report's third option when one exists (PKG-09's ruling stands:
  keep the behaviour, fix what the screen says, and show the key on the report itself).
- In close shots the engine glow on small ships is as big as the hull (PKG-15).
- At 800 px the help line overlaps the maneuver bar (`shots/pkg-12/exp03-step3b-ghost-line-broadside-pass-eta-2m49.jpg`).

## Do
1. **Picking:** a click within a generous screen-space radius of a ship's icon or hull picks the nearest ship (screen
   distance, not mesh raycast only), in both the normal and tactical views, with a hover highlight so he sees what
   he'll pick. Bar: ≥ 95% of 40 scripted real-mouse clicks on enemy ships at 1280 and 800 px pick the intended ship
   (a test drives them through the probe's screen projection; report the rate before and after).
2. The help line tells the truth about R and Tab, and doesn't overlap anything at 375, 800, 1280 px.
3. Engine glow scales with hull size (a small ship's glow smaller than its hull in a close shot).
4. Play EXP-06 step 6 for real on seeds 6 and 7 through the UI after the fix (whether he wins depends on PKG-16's
   balance, running now; report what happened, win or not, and what you ordered).

Files you own: the picking code (wherever PKG-09/PKG-12 put it; name it), the help line, engine glow in `scene.ts`,
`src/battle/view/**/*.css` layout lines, tests, `shots/pkg-17/**`.
Must not touch: `src/battle/sim/**` (PKG-16, PKG-18), everything else.
Flag: none. Save: unchanged. Bench: within +15% of 130 draw calls / 71,298 triangles (normal view).
Acceptance: tsc; vitest (the picking test; the F6 test); lint (your files); build; smoke. Browser: the click-rate run
at both widths, the help line at three widths, a close shot of a small ship, EXP-06 s6 attempts; screenshots. Report
`reports/PKG-17.md`.

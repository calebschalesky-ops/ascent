# PKG-11-director-camera
Label: PKG-11 · Kind / seat: build / Zeuxis with Talos (read `<local>`, `talos.md`) ·
Base: claude/game @ <launch prompt> · Port: 5211 at `http://[::1]:5211/` · Worktree `pkg-11`

Makes these steps pass: EXP-04 steps 1–6; WORLD-01 check 7 (shot log ≥ 1 shot per 20 s on seed 1, in the browser).
Script: `vision/scripts/EXP-04.md`, `WORLD-01.md`. Read first: `reports/PKG-04.md` (scene, simFeed, events).

Vision: VISION.md §7a "You see the whole battle" (the game is the director: wide shots that show the shape of the
battle, then closer on what matters, a boarding run, a flagship turning, a line breaking, then wide again; the player
takes the camera at any moment and it gives way at once; big moments elsewhere as picture-in-picture rather than
pulling the camera away); BRIDGE-DESIGN.md §12b rule 1 (the look never changes the result); battle-sims/BATTLE-RULES.md
rule 1. Absolute paths in `<repo>\`. Every frame should look like art (pillar 7).

## Build, in `src/battle/view/director/**` (new) and `src/battle/view/camera.ts` (yours this wave)
- **A shot list driven by battle events** (read `battle.log` and ship states; never write the sim): wide (both fleets
  framed, the ring plane and Saturn composed), medium on a group, close on a subject (a ship whose side opened, a
  boarding run, a breach, a capture, a flagship turning, a ship breaking or wrecked). Shot lengths and transitions
  (cut vs slow move) as data in `director/numbers.ts`. Wide again between beats. A shot log `{t, kind, subject,
  reason}` exposed to the probe (`state('director')`).
- **Gives way at once:** any player camera input (drag, wheel, keys in `camera.ts`) switches to the player camera on
  that frame (probe: mode = player on the input frame). Hand-back after idle (assumed 8 s, a number in data) with a
  slow move, never a jump cut away from what he chose.
- **Picture-in-picture:** while the player holds the camera, a big moment elsewhere (breach, capture, wreck, a
  flagship falling) opens a small inset view rendered from a second camera for a few seconds; his camera does not
  move. A second render pass at small size; keep within the bench budget.
- **The look never changes the result:** a test or probe run: seed 4 run with director on vs player camera fixed →
  identical `hashState`.
- Probe: `act('camera', {...})` for player input; `state('director')` for the log and mode.

Files you own: `src/battle/view/director/**`, `src/battle/view/camera.ts`, the call/mount lines for them in
`Skirmish.tsx` and `scene.ts` (append lines only; PKG-09 owns the key handler block in `Skirmish.tsx` this wave: if
you need a key, use the camera's own listener in `camera.ts`), `shots/pkg-11/**`.
Must not touch: `src/battle/view/comms/**` (PKG-09), `src/battle/sim/**` (PKG-08, PKG-10), everything else.
Flag: `director` in `src/flags.ts` (append), on in your merge if EXP-04 steps pass. Save shape: unchanged.
Bench: draw calls/triangles within +15% of 131 / 71,508 without PiP; with PiP open, report the cost (allowed to
exceed by the inset's own pass, say how much).
Assumed, for Caleb to overrule: 8 s hand-back; shot lengths; PiP size and corner.
You cannot prove: "like the best space battle in a film" (screenshots and a sequence of frames for Caleb).
Acceptance: tsc; vitest; lint (your files); build; smoke. Browser: EXP-04 steps 1–6 on seed 4 (render frames by hand
with `advance()` if the pane is hidden; save a strip of 8 frames across 60 s of director play to `shots/pkg-11/`);
WORLD-01 check 7 on seed 1. Report `reports/PKG-11.md`.

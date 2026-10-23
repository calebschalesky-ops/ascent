# PKG-04-sim-to-view
Label: PKG-04 · Kind / seat: build / Talos, with Zeuxis's eye (read `<local>`, `zeuxis.md`)
Base: claude/game @ <in the launch prompt> · Port: 5204 at `http://[::1]:5204/` · Worktree `.claude/worktrees/pkg-04`

Makes these steps pass: EXP-01 steps 2, 4, 5, 6 (and re-proves 1, 3, 7, 8 on the real engine); EXP-06 step 4 (broken
ships seen fleeing or striking), step 7 (a defeat shown on screen); WORLD-01 check 7 is NOT yours (the director is a
later package).
Scripts: `vision/scripts/EXP-01.md`, `EXP-06.md`. Reports to read first: `reports/PKG-02.md` ("Requests: View
adapter"), `reports/PKG-03.md`.

Why: the skirmish view runs on `stubFeed.ts`; the real engine (`src/battle/sim/`, PKG-02) runs headless. Nothing the
engine does reaches the screen.

## Build
1. `src/battle/view/simFeed.ts`: run `createBattle(SATURN_12V12, seed)` and `step()` on a fixed 1/30 s timestep from
   the frame loop (accumulator; time scale field, default 1, so the tactical view can set 0.25 later), and map
   `Battle` → your `model.ts` each frame. Ring plane XZ in metres; heading forward = (cos h, 0, sin h). Replace
   `stubFeed` as the default; keep the stub behind `?stub` for comparison only.
2. **What the player sees of ship state, without numbers inside enemy ships** (VISION §7a "Seeing is not knowing"):
   hits flash on the shield side they strike; an open side shows as a visible gap in a ship's shield shimmer only for
   his own ships (enemy sides: only the hit flash); a broken ship turns away and runs; `fled`/`withdrawn` jumps out
   with a flash; `struck` goes dark with its lights off; `wrecked` breaks apart and drifts. Ship colours follow
   `ship.side` every frame, so a captured ship changes colours the moment boarding flips it (PKG-05 is building
   capture now; you need do nothing for it except read `side` live).
3. **The end screen:** when `battle.outcome` is set, an overlay with the outcome and its reason, and per side: ships
   lost, broken, struck, fled, captured (read `summarise()`; show "captured" as 0 until PKG-05 lands). A Restart button
   (new seed). Legible at 375 px.
4. **Probe source:** register the battle with the probe (`registerProbeSource`): `state('battle')` returns the
   serialisable battle; `seed(n)` restarts on seed n; `advance({seconds})` steps the sim and renders; `act('order',
   {ship, order})` calls `order()` for the player's side, the same call the UI will use. `smoke()` now runs on the real
   engine.
5. Remove the misleading opening lines from the stub (the HUD's two names "Autochthones / Diadochoi" must match the
   engine's houses: read `SATURN_12V12`).

Files you own: `src/battle/view/**`, `src/dev/probeSources.ts` (registration lines), `shots/pkg-04/**`.
Must not touch: `src/battle/sim/**` (PKG-05, PKG-06, PKG-07 are editing it now: import only from
`src/battle/sim/index.ts`), `src/App.tsx`, `src/flags.ts`, everything else.
Flag: `skirmish` stays off (no title entry yet). Save shape: unchanged.
Bench: within PKG-03's baseline +15% draw calls/triangles (baseline 174 draw calls, 78,734 triangles at its fixed
camera). Report before/after and median CPU ms including the sim step.
Decided for you: the sim steps on a fixed 1/30 s inside the render loop; the view never mutates `Battle` except by
`order()`.
Assumed, for Caleb to overrule: the visual language for broken / struck / wrecked / fled (above).
You cannot prove: whether the deaths and breaks look like a film (screenshots to Caleb).
Acceptance: `npx tsc -b`; `npx vitest run`; lint clean in your files; `npm run build`; `npm run smoke` (on the real
engine now). Browser `http://[::1]:5204/?skirmish&probe`: EXP-01 steps 1–8 and EXP-06 steps 4 and 7 (seed 6; you may
use `act('order')` to send the flagship forward alone so it is lost, as setup), each with a screenshot (render by hand
if the pane is hidden). Report `reports/PKG-04.md` per HOUSE-RULES.

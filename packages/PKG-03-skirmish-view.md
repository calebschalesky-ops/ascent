# PKG-03-skirmish-view
Label: PKG-03 (session title prefix, branch `claude/pkg-03`, report heading)
Kind / seat: build / Talos for the probe and the mode, Zeuxis's eye for the scene (read
`<local>` and `zeuxis.md`; their fence paths are for gamestudio, yours are below)
Base: claude/game @ <measured at dispatch, in the launch prompt>
Port: 5203, at `http://[::1]:5203/`. Worktree: `<repo>`

Makes these steps pass: EXP-01 steps 1, 3, 7, 8 (with the stub); F1 (the probe) and the `smoke` gate for every later
merge. Lays EXP-01 step 2 and EXP-04 step 3 for wiring (wired-but-unproven until the sim lands).
Scripts: `vision/scripts/EXP-01.md`, `EXP-04.md` in the game worktree.

Why: Phase A is "a skirmish mode… at one body, no strategy map" (VISION.md §16). The method needs a probe so tracers
can drive the battle without clicking a real-time 3D game by screenshot (METHOD §3 F1), and a `smoke` command as the
merge gate (HOUSE-RULES 4.5). Neither exists: the only test hook today is `window.__voyage.duel`.

Vision: VISION.md §7a "You see the whole battle" and §12 (look and feel); `ART-DIRECTION.md` (one people, one look).
Absolute paths in `<repo>\`. Read by section.

## What to build
1. **The skirmish mode, behind its own entry.** `src/App.tsx`: if the URL has `?skirmish` render `<Skirmish />`
   instead of the voyage game (a small branch at the top; nothing else in App changes; Caleb's save is not loaded or
   written in skirmish). Create `src/flags.ts` (an append-only list of `{name, on, note}`; `skirmish` ships **off**;
   when off, there is no title-screen entry yet, but `?skirmish` still loads it for testing).
2. **The scene, `src/battle/view/**`:** a three.js scene at Saturn's rings: the planet and ring plane in frame (reuse
   the existing planet/ring rendering by read-only import if it can stand alone; otherwise draw your own and say so),
   24 ships drawn with the existing ship art (`components/space/ship.ts` and `space/styles/*`, read-only import) in
   each house's colours (Saturn vs Jupiter, from `lib/nations.ts`/`races.ts`). Gunfire tracers between ships. A simple
   player camera (orbit/drag/zoom). Every frame should look like art: Saturn's light, the ring plane, long lines of
   warships.
3. **A view-model boundary you own:** `src/battle/view/model.ts` defines what the view reads each frame (ships: id,
   side, cls, pos, heading, alive/broken/struck, colours; shots this frame; events). Feed it now from
   `src/battle/view/stubFeed.ts`, a placeholder that moves two 12-ship lines toward each other and fires. **PKG-02 is
   building the real engine in `src/battle/sim/**` right now; do not read, import or create anything there.** The
   next wave writes the adapter sim → model.
4. **The probe (F1), `src/dev/probe.ts`:** `window.__probe` exists in dev builds and when the URL has `?probe`, and is
   absent from a production build without `?probe` (prove by grepping `dist/` for a probe-only marker string). Surface:
   `keys()`, `state(path?)`, `seed(n)`, `advance({seconds})` (steps the battle on a fixed timestep **and renders a
   frame by hand**, so it works with the pane hidden), `act(verb, args)` (calls the same command layer the UI calls;
   for now camera verbs), `flags()`/`flag(name,on)`, `smoke()`. Register battle state through a small registry so
   the sim can plug in next wave without editing probe internals (`registerProbeSource(name, getter)`).
5. **`smoke()` and `npm run smoke`:** `smoke()` boots the skirmish, advances 60 s, returns `{ok, errors[], frames}`.
   `npm run smoke` is a Node script (`scripts/smoke.mjs`) that starts Vite on port **5290** with `--host ::1`, opens
   `http://[::1]:5290/?skirmish&probe` in headless Chrome (start from `scripts/cdp.mjs`, which already drives Chrome
   over CDP; read it first), calls `__probe.smoke()`, also opens the voyage game at `http://[::1]:5290/?probe` and
   checks it boots with zero console errors, prints the result, exits non-zero on failure, and always kills what it
   started. Add `"smoke": "node scripts/smoke.mjs"` to `package.json` (append-only line; PKG-02 is adding `test` and
   `sim`; keep both if you collide).
6. **Readable at 375 px:** whatever HUD text you add is legible at 375 px wide.

Files you own: `src/battle/view/**`, `src/dev/probe.ts` (and `src/dev/probe*.ts`), `src/flags.ts`, the `?skirmish`
branch in `src/App.tsx`, `scripts/smoke.mjs`, the `smoke` line in `package.json`, `shots/pkg-03/**`.
Files you must not touch: `src/battle/sim/**` (PKG-02, running), `Voyage.tsx`, `GameView.tsx`, `combat.ts`,
`controls/**`, `Shipyard.tsx`, `munitions.ts`, `progression/**`, `space/**` (read-only imports only), everything else.
Flag: `skirmish`, ships off (the title entry is a later package). Your steps are proved via `?skirmish`.
Save shape: unchanged; skirmish neither loads nor writes the voyage save.
Bench: record draw calls and triangles (`renderer.info`) for the 24-ship scene at a fixed camera, and median CPU ms over
300 hand-driven frames, as the first baseline for F5. Report only.
Decided for you: the URL branch in App.tsx, not a GameView change; port 5290 belongs to the gate.
Assumed, for Caleb to overrule: Saturn's rings, not Jupiter's moons; Saturn house vs Jupiter house.
You cannot prove: whether it looks like a film (screenshots go to Caleb).

Acceptance commands: `npx tsc -b`; `npx vitest run` (no new failures; counts); `npm run lint` (no new errors in your
files); `npm run build` then grep `dist/` for the probe marker (absent); `npm run smoke` passes and prints its result.
Browser at `http://[::1]:5203/?skirmish&probe`: EXP-01 steps 1, 3, 7, 8 played and screenshotted (render by hand
if the pane is hidden); probe `state('battle.ships')` returns 24 ships, 12 per side; `advance({seconds:20})` moves
them and returns. Then `http://[::1]:5203/` still boots the voyage game with zero console errors.
Report: `reports/PKG-03.md`, shape in `HOUSE-RULES.md`.

# PKG-03: skirmish view, probe (F1) and the smoke gate

Seat: Talos (probe, mode, gate) with Zeuxis's eye on the scene. Branch `claude/pkg-03`, base `claude/game` @ 4cffbb4,
merged up to `claude/game` @ d5f567b (PKG-01) before the gate.

## What I measured

- The 24-ship scene, fixed camera (seed 1, 30 s in, `camera.reset`), 1280x720, headless Chrome on the real GPU
  (ANGLE D3D11, Intel Iris Xe): **174 draw calls, 78,734 triangles** (`renderer.info`, all composer passes counted),
  43 geometries, 16 textures.
- **Median CPU 7.5 ms, p95 13.9 ms** per hand-driven frame (one 1/30 s step + one full composer render), over 300 frames
  (`__probe.bench({frames:300})`). First baseline for F5. Report only.
- `__probe.smoke()`: 24 ships, 12/12 by side, all 24 moved, 654 shots in 60 s, 60 frames rendered, zero errors.
- Production build: `grep -rl 'ascent-probe:dev-only' dist` → 0 files; `grep -rl '__probe' dist` → 0 files.

## What I changed

- `src/flags.ts` (new, append-only): `skirmish`, **off**. `flagOn`, `setFlag` (page-only, nothing saved).
- `src/App.tsx`: the old `App` is now `VoyageApp`, unchanged; a new default `App` renders `<Skirmish />` when the URL
  has `?skirmish`. Next to it, one line: `if (import.meta.env.DEV) import('./dev/probe')` installs the probe.
- `src/battle/view/model.ts`: the view-model boundary. `BattleFrame { t, seed, sides, ships[], shots[], events[], outcome? }`,
  `ShipView { id, side, house, cls, pos, heading, status: alive|broken|struck|destroyed, colours }`, `ShotView`,
  `BattleFeed { reset, step, frame }`. Plain data, no three.js.
- `src/battle/view/stubFeed.ts`: the placeholder feed. Two lines of 12 (one capital each), Saturn's Autochthones vs
  Jupiter's Diadochoi, parallel courses, close from 240 to an 80-unit stand-off, fire from 200. Seeded (mulberry32), no
  damage. Every number in one `STUB` table, first-pass.
- `src/battle/view/scene.ts`: three.js scene. Saturn, rings and stars are the voyage scene's own `surfaceMaterial('saturn')`,
  `ringMaterial`, `starField` (read-only import; they stood alone, no copy). Ships are `styledModel` + `liven` from
  `space/fleet.ts` (read-only), one template per house and class, cloned. Running lights recoloured to each people's glow,
  plus one engine-glow point per ship (one draw call): Saturn amber, Jupiter magenta. Tracers and hit flashes are two
  instanced meshes. Bloom + ACES. Numbers in `LOOK`.
- `src/battle/view/camera.ts`: orbit/zoom/focus/reset rig and the command layer (`camera.orbit|zoom|focus|reset`). Pointer
  drag, wheel and arrow/+/-/R keys call the same commands the probe's `act` calls. `mode` is `director` until the player
  touches it, then `player` on the input frame (laid for EXP-04 step 3). While in `director` the camera only pulls back
  enough to hold both fleets; there is no director yet.
- `src/battle/view/Skirmish.tsx` + `skirmish.css`: the mode. Fixed 1/30 s timestep on rAF, HUD (title, clock, side
  counts with house colour, a 4-line comms queue, controls hint) in shared tokens only. Registers probe sources `battle`,
  `camera`, `render` and the driver.
- `src/dev/probeSources.ts`: `registerProbeSource(name, getter)` and `registerProbeDriver(d)`; both return an unregister.
  The sim's adapter plugs in here next wave without touching probe internals.
- `src/dev/probe.ts`: `window.__probe` with `keys`, `state(path?)`, `seed`, `advance({seconds})` (steps and renders one
  frame by hand), `act`, `flags`, `flag`, `smoke`, plus `bench` and `errors`. Marker `PROBE_MARKER`.
- `scripts/smoke.mjs` + `"smoke": "node scripts/smoke.mjs"`: Vite in-process on `[::1]:5290` (cache in the OS temp dir,
  not through the shared `node_modules`), headless Chrome over CDP, `__probe.smoke()` on `/?skirmish&probe`, then the
  voyage game on `/?probe` with zero console/log/uncaught errors, prints `SMOKE PASS|FAIL`, exits non-zero on failure,
  always kills Chrome (`taskkill /T`) and closes Vite. Failure path tested: bad Chrome path → `SMOKE FAIL`, exit 1, port
  5290 free afterwards.
- `src/battle/view/view.test.ts`: 6 tests (feed shape, closing and firing, seed determinism, camera commands, flags,
  probe registry).

## What is still broken or not built

- No damage, no end, no outcome: EXP-01 steps 4-6 need the sim (PKG-02).
- `?probe` on a **production** build does nothing. The package asked for both "exists with `?probe`" and "absent from
  `dist/` by marker grep"; those cannot both hold, so I kept the grep proof and made the probe dev-only. The smoke gate
  runs on the dev server, so it is unaffected.
- `App.tsx` still constructs `IdbStore` at module load in skirmish mode (that opens the IndexedDB database; it never
  loads or writes the save). Moving it would change a line outside the branch I own.
- Step 7 screenshot is from the in-app pane (not saved to a file); its proof is the pasted probe output below.

## Script steps

| Step | Result | Evidence |
|---|---|---|
| EXP-01 1 (opens skirmish, zero console errors) | pass | `shots/pkg-03/exp01-step1-boot.png`; pane: `errors: []`, console clean |
| EXP-01 2 (12 v 12 in view, probe 12/12) | wired-but-unproven | probe `battle.ships` 24, 12/12 and both lines in frame at start, but "starts the battle" waits on the sim |
| EXP-01 3 (Saturn and ring plane in frame) | pass | `shots/pkg-03/exp01-step3-saturn-rings-20s.png`, `exp01-player-camera-40s.png` |
| EXP-01 7 (reload mid-battle, no crash) | pass | pane: reload at t=20.4 → `nav: reload`, back at the start, 24 ships, `errors: []` |
| EXP-01 8 (375 px readable) | pass (with the stub) | `shots/pkg-03/exp01-step8-375px.png`: comms 16 px, no horizontal scroll (scrollWidth 375). End screen not built |
| EXP-04 3 (director gives way on input frame) | wired-but-unproven | drag in pane → `camera.mode: player` same frame; no director exists to give way |
| F1 probe | pass | below |
| smoke gate | pass | below |

Flag: `skirmish` ships **off**. Save version: unchanged (skirmish neither loads nor writes the save).

## Evidence

Acceptance on the merged branch (`claude/pkg-03` @ 0874edb = PKG-03 + `claude/game` @ d5f567b), after my last code edit:

```
2026-10-21T14:52:50-07:00
$ npx tsc -b
(exit 0)
$ npx vitest run
 Test Files  54 passed (54)
      Tests  693 passed (693)
   Start at  14:53:03
   Duration  11.14s (tests 75%, import 20%, transform 5%, worker 1%)
$ npm run lint (summary; errors are all outside PKG-03 files)
   955:17  error  React Hook "useTarget" is called in function "clickDown" ... react-hooks/rules-of-hooks      (Voyage.tsx)
  1897:20  error  React Hook "useTarget" is called in function "frame" ...     react-hooks/rules-of-hooks      (Voyage.tsx)
  55:7   error  'p' is never reassigned. Use 'const' instead  prefer-const                                   (armourScene.ts)
  82:33  error  Expected an assignment or function call ...  @typescript-eslint/no-unused-expressions         (armourScene.ts)
  93:55  error  Expected an assignment or function call ...  @typescript-eslint/no-unused-expressions         (armourScene.ts)
  91:7  error  't' is assigned a value but never used  @typescript-eslint/no-unused-vars                      (boarding.ts)
  326:22  error  'ry' is never reassigned. Use 'const' instead  prefer-const                                  (swarms.ts)
✖ 18 problems (7 errors, 11 warnings)
$ npx eslint src/battle src/dev/probe.ts src/dev/probeSources.ts src/flags.ts src/App.tsx scripts/smoke.mjs
(exit 0, no output)
$ npm run build   → files generated, dist/sw.js
marker files in dist: 0
__probe files in dist: 0
$ npm run smoke
[0.4s] vite on http://[::1]:5290
[10.2s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":59.999999999999154,"moved":24,"shots":654,"drawCalls":174} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[14.5s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (14.5s)
```

Vitest before PKG-03 on 4cffbb4: 51 files / 662 tests; with PKG-03 alone: 52 / 668 (+1 file, +6 tests); merged with
PKG-01: 54 / 693, no failures. Lint was 7 errors before and after; none in PKG-03 files.

In-app browser at `http://[::1]:5203/?skirmish&probe` (pane hidden, rAF paused, so time stepped by the probe):

```
seed(1); state('battle.ships') → 24, bySide [12,12]
advance({seconds:20}) → {t: 20.000000000000153, steps: 600, frames: 1}; 24 of 24 moved; shotsFired 168
render → {calls: 174, triangles: 79130, tracers: 10, flashes: 12, lost: false}; errors []
drag on canvas → camera {mode: "player", yaw: -0.424, pitch: -0.058, dist: 202.6}
location.reload() at t=20.4 → {nav: "reload", t: 2 (after advance 2), ships: 24, mode: "director", errors: []}
http://[::1]:5203/ → voyage title (New game / Peoples of the System / Settings), __probe object, errors [], console: no errors
```

Bench (`__probe.bench({frames:300})`, 1280x720 headless):
`{"frames":300,"render":{"calls":174,"triangles":78734,"geometries":43,"textures":16},"medianMs":7.5,"p95Ms":13.9}`

Screenshots: `shots/pkg-03/exp01-step1-boot.png`, `exp01-step3-saturn-rings-20s.png`, `exp01-player-camera-40s.png`,
`exp01-step8-375px.png`.

Gate output and `git log --first-parent -3` on `claude/game` after the merge: section "Gate" at the end.

## Requests

- **PKG-02 / next wave:** write `src/battle/view/simFeed.ts` implementing `BattleFeed` over the sim, and swap
  `createStubFeed` for it in `Skirmish.tsx` (one line). Register sim internals with `registerProbeSource('sim', ...)`.
- **Daedalus:** confirm the dev-only probe (see "still broken"); if `?probe` must work on a production build, the
  marker-grep acceptance has to change to "present but inert".
- **Whoever owns `App.tsx` line `const store = new IdbStore()`:** make it lazy if skirmish must not even open the DB.

## Assumed, for Caleb to overrule

- Saturn's rings, not Jupiter's moons; Saturn house (Autochthones) vs Jupiter house (Diadochoi).
- The ship hulls keep the voyage game's look (house colour via `liven`); what tells the two lines apart is the lights:
  Saturn amber, Jupiter magenta, from each people's palette glow. Line-ahead on parallel courses, broadsides across.
- Battle scale: cruiser 7 units, capital 20, 14 between ships in a line, Saturn 300 units in radius, battle over the B ring.
- Cannot prove whether it looks like a film: screenshots are for Caleb.

## Gate (after the merge, in the game worktree)

```
$ git log --first-parent -3 --oneline claude/game
af5dc43 Merge PKG-03: skirmish view at Saturn's rings, dev probe (F1), npm run smoke gate
d5f567b Merge PKG-01: merge backlog (eve-controls, ship-loadout-look, look-unify, graphics-pass-3)
6eb7f42 Daedalus: wave 1 dispatched
$ git diff --stat d5f567b af5dc43
 package.json                                  |   3 +-
 reports/PKG-03.md                             | 146 ++++++++++
 scripts/smoke.mjs                             | 142 ++++++++++
 shots/pkg-03/exp01-player-camera-40s.png      | Bin 0 -> 811293 bytes
 shots/pkg-03/exp01-step1-boot.png             | Bin 0 -> 493418 bytes
 shots/pkg-03/exp01-step3-saturn-rings-20s.png | Bin 0 -> 651677 bytes
 shots/pkg-03/exp01-step8-375px.png            | Bin 0 -> 235727 bytes
 src/App.tsx                                   |  12 +-
 src/battle/view/Skirmish.tsx                  | 194 ++++++++++++++
 src/battle/view/camera.ts                     | 111 ++++++++
 src/battle/view/model.ts                      |  66 +++++
 src/battle/view/scene.ts                      | 371 ++++++++++++++++++++++++++
 src/battle/view/skirmish.css                  |  33 +++
 src/battle/view/stubFeed.ts                   | 155 +++++++++++
 src/battle/view/view.test.ts                  |  88 ++++++
 src/dev/probe.ts                              | 132 +++++++++
 src/dev/probeSources.ts                       |  40 +++
 src/flags.ts                                  |  20 ++
 18 files changed, 1511 insertions(+), 2 deletions(-)
2026-10-21T14:54:16-07:00
$ npx tsc -b
(exit 0)
$ npx vitest run
 Test Files  54 passed (54)
      Tests  693 passed (693)
$ npm run build
(exit 0)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
$ npm run smoke

[0.5s] vite on http://[::1]:5290
[11.9s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":59.999999999999154,"moved":24,"shots":654,"drawCalls":174} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[16.2s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (16.2s)
(exit 0)
```

This section is a follow-up commit merged as its own `Merge PKG-03: report evidence`, gated again.

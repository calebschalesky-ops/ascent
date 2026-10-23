# PKG-11: the director camera

Seat: Zeuxis with Talos. Branch `claude/pkg-11`, base `claude/game` @ 3dacf09, merged up to `claude/game` @ 8cf3c41
(TRC-02 and its scoreboard) before the gate.

## What I measured

- **Seed 4, hands off, first 60 s (browser, `state('director')`):** 12 shots, 5 wide and 7 close. The log:
  0:00 wide "opening: both fleets"; 0:08 close e4 "boarding run: Astu on Second Crown"; 0:13 wide; 0:21 close p8
  "Ekklesia: fore shield down"; 0:26 close e4 "boarders breach Second Crown, fore side"; 0:31 wide; 0:39 close e6 "the
  flagship Ganymede turns"; 0:43 close e4 "Second Crown taken by boarding"; 0:49 wide; 0:51 close e4 "Second Crown
  breaks apart"; 0:57 wide; 0:59 close p9 "boarders breach Stoa, fore side". The browser log is identical to the
  vitest run of the same seed.
- **Gives way on the input frame:** `act('camera', {yaw: 0.25})` at 0:09 returns `mode: player`, and
  `state('camera.mode')` and `state('director').mode` both read `player` before any step. A real drag on the canvas
  (`left_click_drag` 400,300 to 470,320) at 0:23 with time paused: mode `player`, `modeLog` entry at t 23.2, no step in
  between. His camera starts on the director's subject (`focus: e4`, the ship that close shot was on) and its look-at
  point eases there rather than snapping.
- **Hand-back:** 16 half-second steps after the input, yaw 1.331 and distance 334.6 never changed. The director took
  the camera back at t 17.03 (input at 9.00, so 8.03 s), logged "no camera input for 8 s", and opened a wide shot with
  `transition: move` at his own yaw: distance 334.6, 331.9 (0.1 s), 329.3, 310.4, 299.4 ... a slow pull, not a cut.
- **Picture-in-picture:** holding the camera from 0:05 (a touch every 4 s, zoomed in, turned away), the breach on
  Second Crown at 0:26.4 opened an inset ("boarders breach Second Crown, fore side", 5 s). Over those 22 s (about 660 steps) his yaw,
  pitch and distance changed only on his own inputs (`moved: 0`). Full seed 4 battle with one input every 70 s: 1 inset.
- **The look never changes the result, in the browser:** seed 4 to the end with the director on and the camera taken
  every 70 s, against seed 4 with the flag off and `camera.reset` (player camera fixed): both `hashState`
  `8461c4809554a758`, both end at 179.27 s, withdrawal. Same test in vitest over 15 minutes of steps.
- **WORLD-01 check 7, seed 1 idle, browser:** battle ends at 1:58 (withdrawal); 22 shots (11 wide, 2 medium, 9 close),
  **3.73 shots per 20 s**, longest gap 8.03 s.
- **Bench** (`__probe.bench({frames: 300})`, its fixed `camera.reset` camera, seed 1 at 30 s), no inset:
  **128 draw calls, 70,340 triangles** with the director on and the same with it off, against 131 / 71,508 (bar:
  151 / 82,234). With the director's own camera on seed 1 at 0:30 (a wide shot): 163 calls, 79,028 triangles. That is
  the angle (more of the fleets and their fire in frame), not a pass; PKG-04's smoke saw 170 calls on the default view.
- **Inset cost:** the same frame with the inset open vs closed: **+59 draw calls (126 to 185) and +58,610 triangles
  (70,448 to 129,058)**, i.e. one more pass of the whole scene (Saturn's 160x96 sphere and the rings are most of the
  triangles). CPU per hand-rendered frame with the inset open 12.9 and 25.5 ms, closed 20.4 and 21.9 ms (median of
  120): the machine's noise (other threads building) is larger than the inset, so I cannot give a CPU figure.

## What I changed

- `src/battle/view/director/director.ts` (new): the director, plain maths, no three.js or DOM. Reads the sim log by
  global index across its cap (as simFeed does) and the view frame. Beats: captured, flagship lost, breach, wrecked,
  side broken (a medium on the broken line), struck, boarding run (framed on raider and target together), scuttled,
  repelled, break, a flagship turning (from the frame's headings), a shield side down (his own ships only), and the
  first hit through to an enemy's hull on a side (how an enemy's open side shows: VISION §7a "Seeing is not knowing").
  Shot logic: wide, then the best beat (or, with none, a medium on the group round the ship taking most hits), then
  wide again; a beat of priority 8+ may cut into a shot after its minimum hold; a shot whose subject jumps away ends.
  Close shots stand three-quarter from astern; held shots drift slowly. The shot log `{t, kind, subject, group, reason,
  transition, prio}` plus mode log, inset log, pending beats, `shotsPer20s` and `maxGap` are `state('director')`.
- `src/battle/view/director/numbers.ts` (new): every number above (shot lengths, minimum holds, cut vs move per pair,
  easing, framing, the 8 s hand-back, inset size/corner/life, beat priorities), first-pass.
- `src/battle/view/director/mount.ts` (new): wires it to the rig, the scene and the probe; the inset is a second
  `renderer.render` of the same scene from a second camera, scissored into the top-right corner after the main frame,
  under a DOM frame with a caption. It sits below the side chips (measured each frame; they stack at 375 px). A big
  moment already on his screen (inside 80% of the frame and within 14 ship lengths) opens no inset.
- `src/battle/view/director/director.css` (new): the inset frame, shared tokens only. Caption 14 px, two lines at most.
- `src/battle/view/director/director.test.ts` (new): 6 tests (EXP-04 1-2, 3-4, 5, 6; WORLD-01 7; flag off).
- `src/battle/view/camera.ts`: every verb goes through `take()`: counts `inputs`, sets mode `player`, and calls the
  rig's `onTake` (the director names its subject as `focus` and the next `snap` keeps the look-at point, so the input
  frame never jumps). New verb `camera` (`{yaw, pitch, zoom, ship}`) for the probe. New `aimRig()`; `eyeOf` exported.
- `src/battle/view/scene.ts` (appended lines only): `scene`, `toWorld()`, `aim()` and an `afterRender` list on the
  view, one call line after `composer.render()`.
- `src/battle/view/Skirmish.tsx` (appended lines only): import, mount, `director.step(f, DT)` after `view.ingest`,
  `director.reset()` after `view.reset`, `director.dispose()` in cleanup. No change to the key handler block.
- `src/flags.ts`: `director`, appended, **on**.

## What is still broken or not built

- The inset has no bloom (it is a plain render pass; the main frame goes through the composer), so engine glows and
  fire read flatter in it than on the main screen. Running it through a second small composer would cost more again.
- Close shots on capitals sometimes crop a big hull at the frame edge (strip frame 07); `close.k` is first-pass.
- A boarding run is filmed as raider and target together, because pods in flight are not drawn by the view (PKG-04);
  when the two are far apart that "close" shot is wide-ish (strip frame 02).
- `scene.ts` `frameBoth` still runs while the director films; the director overwrites the rig after it every step, so
  it is dead work in director mode, not a fight. Removing it is a change to an existing line, so I left it.
- With the pane hidden, `ResizeObserver` did not fire after a viewport change until a screenshot was taken, so the
  canvas kept its old size for a while (PKG-04's resize path, not the director). The 375 px check was taken after it
  resized.

## Script steps

| Script / step | Result | Evidence |
|---|---|---|
| EXP-04 1 (60 s hands off: ≥3 shots, ≥1 wide, ≥2 closer) | pass | 12 shots, 5 wide, 7 close (log above); strip `shots/pkg-11/exp04-strip-01..08-*.jpg` |
| EXP-04 2 (each close shot names its subject event) | pass | every close entry has `subject` and `reason`: boarding run, shield down, breach, flagship turns, captured, breaks apart |
| EXP-04 3 (player input: mode = player on the input frame) | pass | probe `act('camera')` and a real canvas drag, both with no step between input and read |
| EXP-04 4 (director takes back after ~8 s idle) | pass | input 9.00, hand-back 17.03, slow move (distances above) |
| EXP-04 5 (big moment elsewhere = inset, his camera does not move) | pass | breach 0:26.4 inset; `moved: 0`; `exp04-step5-pip-breach-seed4-27s.jpg`, `exp04-step5-pip-800px-with-hud.jpg`, `exp04-step5-pip-375px-with-hud.jpg` |
| EXP-04 6 (same seed, different camera use, identical outcome) | pass | browser and vitest: `hashState` 8461c4809554a758 both ways |
| WORLD-01 check 7 (seed 1: ≥1 shot per 20 s) | pass | 3.73 per 20 s, max gap 8.03 s, 22 shots over 1:58 |
| Feel: "like the best space battle in a film" | not provable by me | the 8-frame strip and inset shots are for Caleb |

Flag: `director` **on**. Save version: unchanged (the director neither reads nor writes the save).

## Evidence

Acceptance on the merged branch (`claude/pkg-11` @ 607f6ab, `claude/game` @ 8cf3c41 merged in), after my last edit:

```
2026-10-21T16:14:27-07:00
607f6ab Merge branch 'claude/game' into claude/pkg-11
$ npx tsc -b
exit 0
$ npx vitest run
 Test Files  59 passed (59)
      Tests  780 passed (780)
$ npx eslint src/battle/view src/flags.ts
exit 0 (clean)
$ npm run lint (whole repo)
✖ 18 problems (7 errors, 11 warnings)      <- all in src/components/, the same 18 PKG-02 and PKG-04 recorded
$ npm run build
✓ built in 15.12s
precache  40 entries (2708.41 KiB)
$ npm run smoke
[14.5s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":22,"shots":486,"movedBySide":[11,11],"drawCalls":66} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[19.0s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (19.0s)
```

One earlier `npm run smoke` (16:10, before the second merge) failed to start: port 5290 was in use (another thread's
smoke at the same moment). It passed on the retry and again above.

Bench (in-app pane, 800x600):
```
director on : {"frames":300,"medianMs":14.3,"p95Ms":40.3,"render":{"calls":128,"triangles":70340,"geometries":80,"textures":16}}
director off: {"frames":300,"medianMs":17.7,"p95Ms":35.6,"render":{"calls":128,"triangles":70340,"geometries":80,"textures":16}}
inset open / closed, same frame: calls 185 / 126, triangles 129058 / 70448
```

Screenshots, `shots/pkg-11/`: `exp04-strip-01-seed4-4s-wide.jpg` to `exp04-strip-08-seed4-53_5s-close.jpg` (canvas
read back by hand, 1280x960, captioned with clock, shot kind, transition and reason),
`exp04-step5-pip-breach-seed4-27s.jpg`, `exp04-step5-pip-800px-with-hud.jpg`, `exp04-step5-pip-375px-with-hud.jpg`
(pane screenshots with the HUD; 375 px: no horizontal scroll, inset 168x105 below the chips).

## Requests

- **PKG-04's owner / Daedalus:** `scene.ts` `frameBoth` could return early when the director is filming (one changed
  line). Harmless as it is.
- **View owner:** boarding pods in flight are not drawn; a boarding run would film far better if they were.

## Assumed, for Caleb to overrule

- **Hand-back after 8 s** of no camera input, with a slow move out from his own angle (not back to the director's).
- **Shot lengths:** wide 8 s, medium 6 s, close 5.5 s; a priority-8+ moment (capture, flagship lost, breach, wreck,
  line breaking) may cut in after 2.5-3 s. Cuts into close shots, slow moves into wide and medium.
- **The inset:** top-right below the side chips, 30% of the width (168-380 px), 16:10, open 5 s, for a capture, a
  breach, a wreck, a ship striking, a flagship falling.
- **What counts as a "side opened" on an enemy ship:** the first hit through to her hull on that side, not her shield
  state, which the player is never shown.

## Gate (after the merge, in the game worktree)

Merge `2180f74` on `claude/game`. Lock taken 16:14:19 (free after TRC-02). vitest was 780 tests in 59 files on the
merged branch before the merge and is 780 in 59 after it.

```
2026-10-21T16:17:57-07:00
$ git log --first-parent -3 --oneline claude/game
2180f74 Merge PKG-11: director camera (event shot list, gives way on input, 8 s hand-back, picture-in-picture), director flag on
8cf3c41 Daedalus: TRC-02 scoreboard adopted
adb62a0 Merge TRC-02: report evidence
$ git diff --stat HEAD^1 HEAD
 reports/PKG-11.md                                 | 149 ++++++++
 shots/pkg-11/exp04-step5-pip-375px-with-hud.jpg   | Bin 0 -> 34626 bytes
 shots/pkg-11/exp04-step5-pip-800px-with-hud.jpg   | Bin 0 -> 54205 bytes
 shots/pkg-11/exp04-step5-pip-breach-seed4-27s.jpg | Bin 0 -> 169513 bytes
 shots/pkg-11/exp04-strip-01-seed4-4s-wide.jpg     | Bin 0 -> 140034 bytes
 shots/pkg-11/exp04-strip-02-seed4-10_5s-close.jpg | Bin 0 -> 171878 bytes
 shots/pkg-11/exp04-strip-03-seed4-17s-wide.jpg    | Bin 0 -> 167429 bytes
 shots/pkg-11/exp04-strip-04-seed4-23s-close.jpg   | Bin 0 -> 125434 bytes
 shots/pkg-11/exp04-strip-05-seed4-28_5s-close.jpg | Bin 0 -> 152867 bytes
 shots/pkg-11/exp04-strip-06-seed4-41_5s-close.jpg | Bin 0 -> 152686 bytes
 shots/pkg-11/exp04-strip-07-seed4-46s-close.jpg   | Bin 0 -> 112984 bytes
 shots/pkg-11/exp04-strip-08-seed4-53_5s-close.jpg | Bin 0 -> 124954 bytes
 src/battle/view/Skirmish.tsx                      |   5 +
 src/battle/view/camera.ts                         |  62 +++-
 src/battle/view/director/director.css             |  15 +
 src/battle/view/director/director.test.ts         | 116 ++++++
 src/battle/view/director/director.ts              | 415 ++++++++++++++++++++++
 src/battle/view/director/mount.ts                 |  93 +++++
 src/battle/view/director/numbers.ts               |  79 ++++
 src/battle/view/scene.ts                          |  18 +
 src/flags.ts                                      |   1 +
 21 files changed, 943 insertions(+), 10 deletions(-)
$ npx tsc -b
exit 0
$ npx vitest run
 Test Files  59 passed (59)
      Tests  780 passed (780)
$ npm run build
✓ built in 16.99s
precache  40 entries (2708.41 KiB)
exit 0
$ npm run smoke
[20.7s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":22,"shots":486,"movedBySide":[11,11],"drawCalls":66} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[25.3s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (25.3s)
```

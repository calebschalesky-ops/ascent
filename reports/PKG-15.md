# PKG-15: the look pass on the battle view

Seat: Zeuxis. Branch `claude/pkg-15`, base `claude/game` @ 0cea035, merged up to `claude/game` @ 52eb991 (TRC-03) before
the gate. Date 2026-10-21. Dev server `http://[::1]:5215/?skirmish&probe`.

How the pictures were taken: headless Chrome on the real GPU (ANGLE D3D11) over the DevTools protocol, page at the named
size, time paused with `act('time.scale', {scale: 0})` and stepped with `advance`, then a full-page screenshot with the
HUD. The same states were opened in the in-app browser (1280 x 800 and the 375 px mobile preset); the crew chip was
opened there with a real click. Before = this branch's base, after = this branch, same seed, same step, same size.

## What I measured

- **Shields (before):** `before-shield-capital-seed4-23s-1280.jpg`, `before-shield-cruiser-seed4-23s-1280.jpg`: every
  one of his ships sits inside a filled orange shell (additive, double-sided, so the back wall doubles the front), and a
  struck side lights a whole quarter-shell over the bloom threshold. On a cruiser the hull is behind a tinted ball.
- **Inset (before):** a plain `renderer.render` straight to the screen. No bloom, and it skipped the composer's output
  pass, so the rings and Saturn come out darker and a different tone from the main view (`pipcmp` below).
- **Close-shot framing (before), measured, not eyeballed:** for every 0.5 s of director-filmed close shots on seeds 4
  and 1 (two minutes each), the angle from the camera axis to each end of each subject hull (pos +/- heading x
  length/2), as a fraction of the lens's narrower half-angle (1.0 = on the frame edge):

  | Size | Seed 4 close frames | cropped (>0.95) | worst | Seed 1 close frames | cropped | worst |
  |---|---|---|---|---|---|---|
  | 375 x 812, before | 106 | **29** | 1.82 | 103 | **33** | 1.92 |
  | 375 x 812, after | 106 | **0** | 0.80 | 103 | **0** | 0.74 |
  | 1280 x 800, before | 106 | 0 | 0.88 | 103 | 0 | 0.93 |
  | 1280 x 800, after | 106 | 0 | 0.72 | 103 | 0 | 0.73 |
  | 800 x 600, after | 106 | 0 | 0.72 | 103 | 0 | 0.73 |

  The crops were pair shots (a boarding run: Ganymede, a capital, on Ekklesia, an escort) on an upright phone, where
  the horizontal angle is under half the vertical. At 1280 the subject was never cut, but a pair came to 0.93.
- **HUD (before), 800 x 600:** `before-normal-seed4-23s-800.jpg`, `before-pip-seed4-32s-800.jpg`: the queue (380 px of
  800) and the crew panel (300 px, all five officers open, a scrollbar) leave about a 120 px column of battle between
  them; the roster cards are 150 px each, three text lines.
- **Bench**, `__probe.bench({frames: 300})` (seed 1 at 30 s, `camera.reset`), headless real GPU, 1280 x 800:

  | | draw calls | triangles | bar (+15% of 128 / 70,340) |
  |---|---|---|---|
  | base today (before) | 138 | 72,014 | 147 / 80,891 |
  | after | 137 | 67,502 | within |

  The base already reads 138, not the 128 in the package: the game tip has moved since PKG-11 measured it.
- **Inset cost**, seed 4 at 32 s with the player holding the camera (breach inset open), same frame rendered with the
  inset and without (`flag('director', false)`, `advance(0)`, which draws without stepping):

  | | inset open | inset closed | the inset costs |
  |---|---|---|---|
  | before (plain pass) | 176 calls / 94,738 tri | 116 / 36,344 | +60 calls / +58,394 tri |
  | after (own bloom + output) | 188 / 85,728 | 115 / 31,832 | +73 calls / +53,896 tri |

  The bloom adds 13 draw calls to the inset (luminosity, 5 mip blurs each way, composite, output) at 128 px
  resolution; its fill is the inset's area only (targets sized to the inset). CPU per frame: 3.1 to 5.9 ms closed/open
  on the first run, 20 to 35 ms on later runs while four other threads were building and testing; the machine's noise
  is larger than the inset, so I give no CPU figure.
- **Contrast** of what I recoloured, computed with the WCAG formula over the worst background in these shots (the lit
  ring, about rgb(215, 200, 170), under `--glass-strong`): chip text `--hud` on a folded chip 14.6:1, on an open
  (house-tinted) chip 9.5:1; roster card name `--hud` 12.3:1; card status words `--good` 12.1, `--cyan` 9.2, `--amber`
  9.5, `--danger` 5.3; `--hud-dim` on the panel 5.9. All clear AA 4.5:1.
- **375 px:** no horizontal scroll (`scrollWidth` 375); queue text 15 px; Q/E keys on the top report; the Fleet toggle
  opens the roster and the folded crew chips (`after-phone-fleet-open-seed2-30s-375.jpg`).

## What I changed

- `scene.ts`, shield panel material only: a `ShaderMaterial` that lights each panel by how edge-on it is to the eye
  (fresnel, `rimPow` 3), almost clear across its face (`fill` 0.03 of the rim), and fading at its own borders (`edge`
  0.22 of its surface coordinates), front faces only. The four sides read as four seams of light; a struck side flares
  bright (`hitGlow` 3.2, over the bloom threshold), the rest stay faint (`base` 0.45, under it). Numbers in `LOOK.shield`,
  first-pass. The panel mesh is 10 x 8 segments (was 8 x 8). Enemy ships still get no shimmer (VISION 7a).
- `director/mount.ts`, the PiP render pass: the inset now renders through its own small `EffectComposer` (render pass
  from the inset camera, `UnrealBloomPass` with `LOOK.bloom`'s strength, radius and threshold at `DIRECTOR.pip.bloomRes`
  128 px, `OutputPass`), sized to the inset and drawn into its viewport and scissor. Disposed with the director. Also
  passes the main camera's lens to the director.
- `director/director.ts`, the framing function only (`goalFor`) plus a `lens` option and a `fit()` helper: a close
  shot stands back at least far enough for the subject's whole hull (for a pair or group: the group's radius plus half
  the longest hull) to fill no more than `close.fill` 0.7 of the lens's narrower angle; a medium shot the same at
  `medium.fill` 0.85 within `medium.max`. The inset uses its own lens (fov 40, 16:10). Nothing else in the director
  moved (beats, shot list, hand-back, inset logic are PKG-11's and unchanged; no pause call was there to keep yet).
- `director/numbers.ts`: `close.fill`, `medium.fill`, `lens` (default 46 deg, 16:10), `pip.bloomRes`.
- `comms/CommsHud.tsx`, the crew panel's layout only: it folds to five officer chips (Flag captain, Master of guns,
  Shields and engineering, Marine commander, Fighter command); a chip opens that officer's controls, one at a time;
  the officer an armed order belongs to stays open while it waits for its target. No order, menu or logic line changed.
- `comms/comms.css`: queue width `clamp(280px, 30vw, 380px)` (280 at 800 px, 380 at 1280); the folded crew panel sizes
  to its chips; roster cards are one compact pill (26 px portrait, name over the captain's word; the class moved to the
  card's title tooltip); the event ticker follows the queue's width. Tokens only.
- `skirmish.css`: a line in the event log fades 6 s after it lands (1.2 s fade). New news re-renders the list and
  brings the last lines back.
- `f6.test.ts` (new): F6 for the battle view. Reads every `.css`, `.ts`, `.tsx` under `src/battle/view/` from disk and
  fails on a raw hex colour (`#rgb` to `#rrggbbaa`, or a six-digit `0x` literal in code), an `rgb()`/`hsl()` literal
  in a stylesheet, a `font-family`/`fontFamily` that is not `var(--...)`, or a `font:` shorthand naming a face.
  Comments are stripped first. Exempt, with its reason: `scene.ts` (3D scene art). A third test plants each kind of
  raw value (built from parts so the file holds none) and checks the token forms pass.

## Before / after (all in `shots/pkg-15/`)

| Screen | Before | After |
|---|---|---|
| Shields, close on Astu (capital) 1280 | `before-shield-capital-seed4-23s-1280.jpg` | `after-shield-capital-seed4-23s-1280.jpg` |
| Shields, close on Stoa (cruiser) 1280 | `before-shield-cruiser-seed4-23s-1280.jpg` | `after-shield-cruiser-seed4-23s-1280.jpg` |
| Normal, director 1280 / 800 | `before-normal-seed4-23s-1280.jpg`, `before-normal-seed1-30s-1280.jpg`, `before-normal-seed4-23s-800.jpg` | `after-normal-...` (same names) |
| Comms open (ship selected, order menu on an enemy) 1280 / 800 | `before-comms-seed2-30s-1280.jpg`, `-800.jpg` | `after-comms-seed2-30s-1280.jpg`, `-800.jpg` |
| Crew panel | in every before shot (always open) | folded in every after shot; opened: `after-crew-engineering-open-seed2-30s-1280.jpg`, `-800.jpg` |
| PiP (breach on Second Crown, player camera) 1280 / 800 | `before-pip-seed4-32s-1280.jpg`, `-800.jpg` | `after-pip-seed4-32s-1280.jpg`, `-800.jpg` |
| End screen 1280 / 375 | `before-end-seed1-1280.jpg`, `before-phone-end-seed1-375.jpg` | `after-end-seed1-1280.jpg`, `after-phone-end-seed1-375.jpg` |
| 375 px | `before-phone-seed2-30s-375.jpg`, `before-phone-pip-seed4-32s-375.jpg` | `after-phone-seed2-30s-375.jpg`, `after-phone-pip-seed4-32s-375.jpg`, `after-phone-fleet-open-seed2-30s-375.jpg` |
| Event log faded (8.5 s after the last line) | n/a | `after-log-faded-8s-seed2-30s-1280.jpg` |

## Script steps

The package adds no script step; it must keep the game's passes and close the look rows and F6.

| Item | Result | Evidence |
|---|---|---|
| Shields: thin, mostly clear, four sides, hit side bright, hull reads first | pass on screen | shield pairs above |
| Inset: same post as the main view | pass | PiP pairs; inset +73 calls with bloom |
| HUD density at 800 and 1280: crew folds to five chips, log fades, roster compact, queue legible at 375 | pass on screen | 800/1280/375 pairs, crew-open shots, log-faded shot |
| Close shots frame the whole hull | pass, measured | 62 cropped close frames at 375 px before, 0 after; worst 0.80 of the half-angle |
| F6 for the battle view | pass, and fails on a planted hex | vitest output below |
| Walk every battle screen before and after | done | table above |
| Bench within +15% of 128 / 70,340 | pass | 137 / 67,502 |
| Smoke, tsc, vitest, lint (my files), build | pass | below |
| "Looks like the best space battle in a film" | not provable by me | the pairs are for Caleb |

Flag: none (the look is not a system; it is on for everyone). Save version: unchanged (nothing here touches the save).

## What is still broken

- **Engine glows** are a constant 6-unit sprite per ship, so in a close shot on a small hull the glow is a ball as big
  as the ship (visible in both shield pairs). It is the engines' points material, not the shield; I left it inside
  this package's line and name it here. A size scaled by class would fix it.
- The **hint line** ("Drag to turn ...") does not fade with the log: it is one element in `Skirmish.tsx` with no key,
  outside my files.
- The **end card** appears only once the HUD catches up after the outcome (stepping 5 s more); with `advance` alone
  the end frame shows the log without the card. Same on the base; not mine.
- The PiP's bloom uses the main view's threshold at 128 px; a very bright breach flash reads a little larger in the
  inset than on the main screen.

## Requests

- **PKG-12 (tactical view):** F6 scans all of `src/battle/view/**`, including `tactical/`. Hologram colours either come
  from the tokens (or the ship side's glow passed in from the frame) or the file goes into `EXEMPT` in
  `src/battle/view/f6.test.ts` with its reason, if it is 3D art like `scene.ts`.
- **View owner / Daedalus:** engine glow size by class (`LOOK.engine.size` times the class length) so close shots on
  escorts are not a glow ball.
- **Skirmish.tsx owner:** key the hint `<p>` on the camera mode (`key={hud.cameraMode}`) and it will fade with the log
  and come back when the player takes the camera.

## Assumed, for Caleb to overrule

- Shields: a rim of light, not a bubble; quiet sides below the bloom, a struck side above it.
- The crew panel starts folded every battle; one officer open at a time.
- The event log fades after 6 s; the comms queue keeps everything that needs an answer.
- Queue 30% of the width (280-380 px); roster cards drop the class line.
- Close shots never let the subject's hull fill more than 70% of the narrower angle.

## Evidence

Merge: `e84e2ab Merge PKG-15: ...` on `claude/game` (base for the merge: f919906, TRC-03's evidence merge).

`git log --first-parent -3 --oneline claude/game` after the merge:
```
e84e2ab Merge PKG-15: look pass: rim shields, inset bloom, whole-hull close shots, folded crew panel, compact roster, fading log, F6 for the battle view
f919906 Merge TRC-03: report evidence
52eb991 Merge TRC-03: wave-03 re-score, eight traces, 39/65 (was 21/65), one regression WORLD-02 c7
```

`git diff --stat HEAD^1 HEAD -- src` of the merge (plus 30 screenshots under `shots/pkg-15/` and this report):
```
 src/battle/view/comms/CommsHud.tsx   |  17 ++++--
 src/battle/view/comms/comms.css      |  33 +++++++++---
 src/battle/view/director/director.ts |  28 +++++++---
 src/battle/view/director/mount.ts    |  20 +++++--
 src/battle/view/director/numbers.ts  |  17 +++---
 src/battle/view/f6.test.ts           | 100 +++++++++++++++++++++++++++++++++++
 src/battle/view/scene.ts             |  36 +++++++++++--
 src/battle/view/skirmish.css         |   5 +-
 8 files changed, 224 insertions(+), 32 deletions(-)
```

F6 fails on a planted raw hex (one line `.planted { color: #ff00aa; }` appended to `comms/comms.css`, then removed):
```
Wed Oct 21 17:15:53 PDT 2026
     × no raw colour or typeface in src/battle/view/** outside the exempt art files 17ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
+   "comms/comms.css:165 raw hex colour: .planted { color: #ff00aa; }",
      Tests  1 failed | 2 passed (3)
```

Acceptance on the branch after merging the game tip (last source edit 17:15; all runs after it):
```
Wed Oct 21 17:21:29 PDT 2026
tsc exit 0
Wed Oct 21 17:21:43 PDT 2026
 Test Files  63 passed (63)
      Tests  818 passed (818)
vitest exit 0
Wed Oct 21 17:22:17 PDT 2026
lint exit 0
Wed Oct 21 17:22:23 PDT 2026
✓ built in 14.35s
build exit 0
Wed Oct 21 17:22:57 PDT 2026
[17.3s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":23,"shots":562,"movedBySide":[11,12],"drawCalls":67} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[22.8s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (22.8s)
smoke exit 0
```
Lint covered my files: `scene.ts`, `f6.test.ts`, `director/`, `comms/CommsHud.tsx` (eslint does not lint CSS here).

## Gate (game worktree, after `e84e2ab`)
```
Wed Oct 21 17:23:36 PDT 2026
tsc exit 0
 Test Files  63 passed (63)
      Tests  818 passed (818)
vitest exit 0
✓ built in 15.64s
build exit 0
[14.5s] skirmish smoke: ok=true frames=60 checks={"ships":24,"bySide":[12,12],"t":60,"moved":23,"shots":562,"movedBySide":[11,12],"drawCalls":67} gpu=ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A6) Direct3D11 vs_5_0 ps_5_0, D3D11)
[19.1s] voyage boot: ok=true probe=object errors=0
SMOKE PASS: skirmish pass (60 frames, 60 s), voyage pass (19.1s)
smoke exit 0
```

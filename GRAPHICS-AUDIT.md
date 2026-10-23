# Graphics audit — 2026-10-18 (branch graphics, from main 9e4d39d)

Frames are true canvas reads, not pane screenshots: `scripts/shots.js` poses the ship through `window.__voyage`,
drives a frame with `run()`, reads `renderer.domElement.toDataURL()` in the same task and posts the JPEG to a small
local receiver. All at 1280×720, pixel ratio 1. Files: `shots/before-*.jpg` (and `shots/after-*.jpg` once built).

Machine: Intel Iris Xe (integrated), Chrome/ANGLE D3D11, in the Claude app's browser pane.

## Baseline frame time (main, before any change)

Mean of 120 frames drawn back to back, each followed by a 1-pixel `readPixels` so the GPU work is counted. Includes the
game's own per-frame simulation.

| Setting | Near Earth, 1280×720 | Near Mars, 1280×720 | Near Earth, phone 375×812 |
|---|---|---|---|
| High | 28.2 ms | 22.8 ms | 43.0 ms (at 2× = 750×1624) |
| Battery saver | 18.1 ms | 13.8 ms | 12.3 ms (at 1×) |

## Frame by frame

### 1. The start near Earth (`before-start.jpg`)
- Earth itself is the best thing on screen: lit day side, city lights, clouds. But the atmosphere is a faint additive
  rim; no blue limb, no haze over the disc, no warm band at the terminator.
- The three crystal shells read as glass bubbles laid over everything, with hard white circle lines through the middle
  of the frame. The planets' ring tori stack into a bundle of coloured stripes across the horizon.
- The ship is flat brass: no rim light, nothing coloured to reflect (the environment map is a grey room), engine
  nozzles are pale grey-blue discs, the exhaust is a thin wisp.
- Sky: a few dots and a faint Milky Way. Mostly flat navy.
- **Change:** atmosphere scattering shell; shells fade near the camera and become faint iridescent edges; the ring
  tori become thin glowing orbit lines; a baked nebula sky that is also the ship's reflection map; engine glow light.

### 2. Approaching Mars (`before-mars.jpg`)
- The worst frame. Mars's ring torus is a solid red slab across the screen (the torus tube is 0.64 units thick, about
  twice the ship's length), and Jupiter's ring is a purple slab above it.
- Mars has no atmosphere to speak of, a hard terminator, flat-looking colour.
- **Change:** orbit lines instead of tori; a thin dusty-salmon atmosphere on Mars; surface lighting with a soft
  terminator and a cool fill on the night side so it is not pure black.

### 3. Beside the Sun (`before-sun.jpg`)
- A white disc. The surface shader has granulation and limb darkening but the exposure burns it all out. The glow is
  a smooth radial gradient. No corona, no flare, no rays. The ship in front is washed out to a beige silhouette.
- **Change:** bring the surface into range so granulation and the orange limb show; an animated corona with
  streamers; god rays and lens flare from the Sun in post; ship backlit with a rim.

### 4. Saturn's rings (`before-saturn.jpg`)
- The best gas giant, but flat: no atmosphere glow, the rings are lit but dull, and the blue ring torus cuts across.
- **Change:** banded golden atmosphere glow, ring forward-scatter (bright when backlit), richer ring colour, orbit lines.

### 5. Out among the stars (`before-stars.jpg`)
- A muddy brown-grey wash fills half the frame (the edge's rim shader seen from inside, plus the Milky Way), and the
  rest is black with dots.
- **Change:** the baked nebula sky (several hues, dust lanes, bright knots) so the far reaches are the most colourful
  place, not the dullest; the edge's wash becomes a clean warm glow only near the rim.

### 6. Laser and missile fight (`before-fight.jpg`)
- Laser bolts are invisible at this range (0.05-unit boxes). A missile is a small orange dot. Kills are a single
  expanding sprite. Enemy ships are small flat cones. The red torus slab again.
- **Change:** bolts with a white core and coloured halo; muzzle flash; impact sparks; missile smoke trail and flame;
  explosions with a flash, fireball, debris, shockwave ring and embers; shield-hit ripple; all as reusable functions
  (`spawnImpact`, `spawnExplosion`, `spawnTrail`, `spawnShieldHit`) in `src/components/fx/`.

## Across every frame
- Post: bloom is gentle and nothing else. Add colour grading, a subtle vignette, god rays and lens flare from the Sun,
  chromatic aberration only while boosting.
- Speed: dust points do not stretch; add streaks along the motion, stronger at boost.
- Interface: parchment-and-serif styling from The Ascent. Move the HUD, menus and cards to a cleaner glass look that
  matches the new scene, keeping 375 px readable.
- Every heavy piece (god rays, flare, chromatic aberration, atmosphere sample count, particle budget, bloom) follows
  Settings → Graphics.

## After (built)

Frames: `shots/before-after.jpg` (each row: before | after), `shots/after-*.jpg`, `shots/after-sheet.jpg`,
extras `shots/after-extras-sheet.jpg` (boost with streaks and chromatic aberration, missile smoke, shield hit),
Battery saver `shots/low-sheet.jpg`, interface `shots/hud-desktop.png`, `shots/hud-phone.png`, `shots/hud-phone-menu.png`.
After frames were taken in headless Chrome on the same Iris Xe GPU (`scripts/cdp.mjs`), because the hidden browser
pane began throttling timers; the before frames came from the pane. Same GPU, same resolution, same poses.

## Frame time, before and after (median ms per frame, 1280×720 at ratio 1 unless noted)

Both builds measured in the same headless harness, alternating baseline / overhaul, twice each. The machine was
shared with several other sessions building and running at the same time, so single numbers swing a lot; the ranges
are the two runs.

| View | High, before | High, after | Battery saver, before | Battery saver, after |
|---|---|---|---|---|
| Start near Earth | 76–77 | 52–93 | 100–110 | 41–69 |
| Mars | 39–63 | 13–25 | 15–41 | 24–27 |
| Sun | 40–55 | 15–33 | 47–59 | 42–52 |
| Saturn | 59 | 22–23 | 58–60 | 23–28 |
| The stars | 65–77 | 36–37 | 16–42 | 12 |
| Fight (after a kill) | 43–73 | 28–45 | 13–64 | 22–27 |
| Phone view (High 750×1624, Saver 375×812) | 91–136 | 54–75 | 10–46 | 19–22 |

Reading: the overhaul is no slower than main in most views and faster in several, because the solid orbit tori and
double-sided crystal shells it replaced were expensive. A quieter earlier run in the pane (before any trimming) gave
main 28 ms / overhaul 25 ms near Earth at High. Not measured: a real phone.

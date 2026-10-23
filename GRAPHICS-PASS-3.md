# Graphics pass 3: the look-over again, on integration-4 (2026-10-21)

Branch `claude/graphics-pass-3-264f8a`, cut from `claude/integration-4` at e16c690. That build includes eve-controls
(orbit camera), wave-a-screen (the flight view fills the window) and scale-jump-danger (ships ×5 smaller against the
world, hyperspace, foreign space that fights). Judged against Caleb's bar: every frame should look like art;
colourful, ordered, hand-coloured, never flat.

Same method as `GRAPHICS-PASS.md`: `scripts/gp.mjs` drives headless Chrome on the real GPU against this worktree's
dev server (:5414, launch entry `ascent-graphics-pass-3`). 94 before frames `p3before-*`, contact sheets
`sheets/p3b-*.jpg`; after frames `p3after-*`; before/after pairs `sheets/cmp3-*.jpg` (left before, right after, made
with the new `scripts/gppair.py`). All in `shots/graphics-pass/`.

**The big change on this build is scale.** S1 made a scene unit 108 m instead of 540 m. The world stayed true in km,
so it is 5× bigger in units; ships, the camera and anything tuned "per unit" did not change. Most of what broke below
broke for that reason, in the game and in the harness.

## Harness changes (tooling, mine)

- **Air and sky scenes are posed, not dived.** The old `dropInto` flew down from a fixed fraction of R for a few
  seconds. At the new scale that is 5× too far, so the first tour's air frames are in orbit or high in the haze
  (`p3dive-*`, kept for the record: Jupiter at 20,211 units up, cover 0.045). `airAt(id, alt)` in `gpscenes.js`
  puts the ship at a set height above the ground (or a giant's cloud tops) on the day side. It holds that height for
  a few real-time seconds so the ground streams in. The same place every run, whatever the scale. Earth 400 and 3
  units, Mars/Moon/Mercury 3, Venus 4, giants 1.
- **Berth stills** (`berth-<home>`): the old `close-*` camera as a beauty frame, so before and after match exactly.
  The live `close-*` frames don't: the orbit camera and the ship's lap put the view somewhere different each run.
- **Probes** (`probe-hero`, `probe-close`, `probe-duel`): JSON dumps (gp.mjs now writes `r.dump`). Used for: how lit
  each hero face is, what object fills a screen point, and what the duel root holds.

## Ranked findings

Each finding gives the frames, what is wrong, why, the file, and whose it is. **FIXED** items have a pair.

### 1. Inside every atmosphere the ground fogs out into a white wall (poor light) — FIXED
`p3before-air-earth-low`, `-air-moon`, `-air-mercury`, `-air-mars`, `-sky-venus-down` → `p3after-*`, `sheets/cmp3-haze.jpg`.
The haze over the ground and the giants' decks is `0.012 × √density` **per scene unit**: 1/e at about 80 units.
That was 43 km; after S1 it is 9 km. Flying low over Earth you saw green for a few hundred metres, then a white wall
with mountain silhouettes in it. The Moon and Mercury became flat pale plains.
**Fix (`planet/planetAir.ts`):** `HAZE_PER_KM × KM_PER_UNIT`, so the visibility in km is what pass 1 tuned, at any
scale. Low over Earth the slopes and the horizon now come through.
Still plain, and left open: the ground itself at 3 units up is one colour per slope (vertex colour plus a ±28% fine
noise), and from 400 units up Earth's lower half is still a pale haze, because the haze colour is the horizon's
near-white. Bluer aerial haze and some hue mottling in `terrainMesh.ts` are the next step (finding 7).

### 2. Close to the god-armour, plates are huge flat polygons (too plain, clunky) — FIXED
`p3before-close-saturn` (a flat yellow triangle filling a third of the view), `-station-earth` (a flat pale-blue
wedge), `-close-mars`, `berth-jupiter` (a flat purple sheet) → `sheets/cmp3-berths.jpg`, `cmp3-berths2.jpg`
(exact pairs), `cmp3-armour-close.jpg` (live, not exact).
The probe hit armour meshes at 500–3,000 units. The armour grid is angular in planet radii, so S1 made every panel
5× wider. A Saturn panel is now 9,700 units (1,050 km); its quarter sub-panel is 2,400 units. From a berth, tens of
units off, a single sub-panel or a lit ember strip fills the screen as one flat colour.
**Fix (`armourArt.ts`):** `fineGrid()` in the shared pattern GLSL keeps adding plating: seam grids at 16, 64, 256
and 1,024 per pattern unit, a tone per plate, a little bump. Each level fades in only once its plates are several
pixels wide, so hero and approach views are unchanged. Panels get the full grid; lit strips (`PAT.glow`) break into
tiled light panels with dark mullions; smooth metal and glass get half-strength. No textures, no triangles.
Known small fault: at some angles a faint dark diagonal follows a triangle edge, where the derivatives jump
(`berth-jupiter` after, lower left).

### 3. Venus's night side is a black disc (flat, a hole in the picture) — FIXED
`p3before-hero-venus`, `-approach-venus` → `sheets/cmp3-venus-night.jpg`.
`probe-hero`: on this build the Sun is behind Venus from the reference-sheet face (dot −0.95; pass 2 had it lit).
The hero face is fixed to the armour, so its light follows the planet's spin and the date. The deck had no night
term at all, so the emerald ribs framed nothing.
**Fix (`space/materials.ts`, VENUS):** through the existing night-glow path, a dim ember glow seeps up through the
thin parts of the deck, and gold lamp clusters (one in five emerald) show the Nephelai's floating cities in the
cloud bands, as Earth's city lights do. It reads as a dark world, not a lava one (the first try was too strong and
was cut to a third). The day side is unchanged.

### 4. Saturn burns to a plain cream ball (poor light, too plain) — FIXED
`p3before-hero-saturn`, `-approach-saturn` → `sheets/cmp3-saturn.jpg`.
Gold at about 0.85 linear under 1.55× light is far over the bloom threshold, and the butter bands were mixed in at
0.45. In the approach view the disc is white with a glow; in the hero view, a cream ball beside a rich ring and
deck. Same fault as Venus in pass 1 (#6).
**Fix (`space/materials.ts`, SATURN):** albedo ×0.64, butter belts at 0.75, a tawny belt pair each side of the
bright equator, stronger fine streaks. Bands now read in both views; the moons beside it (Iapetus frame) are
unchanged.

### 5. The live fight frame shows the player shot down (harness) — not fixed, harness
`p3before-fight-live`, `-fight-missile`: "SHIP LOST", pink bolt streams across the left third.
D1-D3 made foreign space fight: the scene poses the Earth ship behind a Saturn cruiser in Venus's space, and it is
killed during the 2.2 s of firing. The scene needs a home-space foe, or a hold on hostility (`gpscenes.js`). The
bolt streams themselves look as before.

### 6. Fighter duels frame the far ship as a dot (harness) — not fixed
`p3before-duel-fighter-*` (also in pass 2's frames). A fighter is 0.05 units in radius, so 2.6 radii puts the camera
right on top of it. The near plane is 0.01, so it isn't clipping. A larger minimum distance made it worse (tried and
reverted). The fix is to frame both ships' combined bounds; left for the next pass. Cruiser, destroyer and capital
duels read.

### 7. Low flight: the ground is plain and Earth from altitude is milk-white (too plain) — open, mine
`p3after-air-earth-low`, `-air-earth-high`, `-air-mars`, `-air-moon`. After #1 the ground shows, but it is one hue
per slope: Mars a flat orange, the Moon flat bone. From 400 units up, the haze colour (the horizon's near-white) turns
Earth's lower half pale. Next: tint distant haze toward the zenith blue with height, and add a mid-scale hue mottle
(rock, dust, vegetation) to `terrainMesh.ts`. Not done: it is a design pass of its own, and #1–#4 were cheaper per
frame fixed.

### 8. Mercury is the plainest hero (too plain) — open, mine
`p3before-hero-mercury`: a dark grey cratered ball with brown wings, the least coloured of the seven. Mercury is
grey; the art could still give it a warm terminator, or a hot sunward rim, or brighter ray craters. `space/materials.ts`.

### 9. Iapetus shows one face (too plain) — open, mine
`p3before-moon-iapetus`: from the scene's camera, only the bright face shows, a plain ivory ball. Its two-tone style
is real but on the far side. A pose question as much as an art one (`gpscenes.js` could pick the leading face).

### 10. The orbit camera puts the ship anywhere in the live frames — note, eve-controls
`approach-venus` (the ship side-on across the planet), `close-*`: under eve-controls the camera orbits freely and
keeps its offset, so the live frames frame the ship differently each run. No defect; it means live frames can no
longer be paired exactly, which is why the berth stills were added.

## Earlier passes' FIXED items, re-checked on this build

| # | Item | Holds? | Frames |
|---|---|---|---|
| 1 | Moons painted | Holds. Io, Europa, Ganymede, Callisto, Titan, Enceladus all read; Iapetus see #9 above | `sheets/p3b-moon.jpg` |
| 2 | No Sun glare from behind the camera | Holds: the station views (`station-earth`, `-mars`) don't burn. The starbursts in `close-venus` and `stars` sit on the Sun or a berth light in view, not mid-frame | `p3b-close.jpg`, `p3b-misc2.jpg` |
| 3 | Site labels | Holds: small, facing side only (`hero-earth`, `ladder-*` top) | `p3b-hero.jpg` |
| 4 | Mars shields with lit slits | Holds | `p3before-hero-mars` |
| 5 | Jupiter spires not neon | Holds; the arcs between tips are still bright magenta, as intended | `p3before-hero-jupiter` |
| 6 | Venus not white from the sunward side | Holds by construction (deck 0.5); this build's hero face is on the night side, see #3 above | — |
| 7 | Ring hairlines fade edge-on | Holds partly, as pass 1 said: faint coloured lines still cross the hero frames (`hero-earth` left) | `p3b-hero.jpg` |
| 8 | Cloud layers inside the giants and Venus | Holds once the ship is actually in the air (harness fix above); same layers as pass 2 | `sheets/cmp3-p2-vs-p3-sky.jpg`, `p3a-sky.jpg` |
| 9 | Moon blue seams, Venus emerald ribs | Holds | `p3before-hero-moon`, `-hero-venus` |
| 10 | Fleet hulls lit, running lights | Holds on cruisers, destroyers and capitals (`p3b-duel-capital.jpg`); fighters unjudged (#6) | `p3b-duel-*.jpg` |
| 13 | Flight view fills the window | **Fixed by the wave-a-screen merge:** every live frame is full-window now, HUD over the view | every `p3before-approach-*` |
| 15 | Painted race heads | Holds (codex frames) | `p3b-misc3.jpg` |

What integration-4's merges changed in the frames: the full window (#13 fixed); the orbit camera (finding 10); and
S1's scale (findings 1, 2, and the harness air dives). The hyperspace and territory work adds the channel warnings
seen in the Saturn/Jupiter frames, and the lost ship in the fight frame (#5).

## Handoffs (not this session's files)

- **Gemini art: graphics-pass-3 branch** (<session>): painted pilot heads for the player's own pilot (pass 1
  #14), the image-attachment re-test, `gemini-clean.mjs` runs. Split agreed with that session and af-graphics;
  nothing of mine touches the race-art pipeline.
- **Screen session** (CSS, opening components, title, hangar): pass 1's #11 (hangar backdrop) and #12 (title key
  art) are still as they were: `p3before-opening-hangar` is a ship on a grey disc in an empty box, and
  `p3before-title` is a card on flat navy, with `public/art/title-keyart.webp` still unwired. The docked-station
  screen is unchanged. `dock-mars` didn't dock in this run (autoDock returned `docked: false`), so the frame is an
  approach.
- **Game rules / balance** (not graphics, seen in passing): at the new scale a dive into a giant from its air's top
  takes about 100 s at entry speed. Earth's descent from 1.1 R didn't reach 500 units in 40 s. scale-jump-danger
  already lists air flight as 5× longer.

## Frame cost

- #1: one uniform's value, no cost.
- #2: in the armour fragment shader, up to four extra grid levels; each is skipped (`break`) once the level is too
  fine, so far views pay one loop test. Draw calls unchanged.
- #3, #4: a few more noise calls in the Venus and Saturn surface shaders, on screen-sized discs.
- No frame-time measurement this pass: the machine was shared with other sessions.

## Files changed

`src/components/planet/planetAir.ts` (#1), `src/components/armourArt.ts` (#2), `src/components/space/materials.ts`
(#3 Venus night, #4 Saturn bands). Tooling: `scripts/gpscenes.js` (airAt, berth stills, probes), `scripts/gp.mjs`
(probe dumps), `scripts/gppair.py` (new). Shots under `shots/graphics-pass/` (`p3before-*`, `p3after-*`,
`p3dive-*`, `sheets/p3b-*`, `p3a-*`, `cmp3-*`).

## Checks

tsc -b clean · vitest 650 in 50 files pass · vite build passes. Not merged, not pushed.

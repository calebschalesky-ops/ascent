# Graphics pass: a look at every place, ranked, and what was fixed (2026-10-20)

Branch `claude/graphics-pass` from `claude/integration-3` (91bf274). Judged against Caleb's bar: every frame should
look like art; colourful, ordered, hand-coloured; never flat, plain or mismatched.

## How the frames were taken

`scripts/gp.mjs <prefix> [scenes]` drives headless Chrome on the real GPU (Iris Xe, ANGLE D3D11) over CDP against this
worktree's dev server (:5410, launch entry `ascent-graphics-pass`). It plays the title, codex and opening by clicking,
launches the shakedown, skips the tutorial, then runs the scenes in `scripts/gpscenes.js`: every home world's hero
view, approach and berth view; the Sun, the stars, the edge; eleven major moons; two stations and a docking; descents
into six bodies; each house's four hulls in a line; four duels per hull class between houses; the live fight near
Mars; missiles, drones, the nav map. 83 before frames, 61 after. All in `shots/graphics-pass/`
(`before-*.jpg`, `after-*.jpg`), with contact sheets and side-by-side pairs in `shots/graphics-pass/sheets/`
(`cmp-*.jpg`: left before, right after).

Two kinds of frame. **Live** frames (`approach-*`, `close-*`, `station-*`, `air-*`, `fight-*`, `swarm`, `nav`, UI) are
page screenshots of the running game, HUD and all. **Beauty** frames (`hero-*`, `moon-*`, `ladder-*`, `duel-*`, `sun`)
pose the camera and read the canvas in the same task. A harness fault, found mid-pass: the beauty frames rendered
without the per-frame graphics update, so the post pass kept the last live frame's Sun, and some *before* beauty frames
show god-ray streaks the game would not have drawn there (`before-moon-callisto`, `-ganymede`, `-enceladus`,
`-titan`, `before-hero-saturn`). The harness now sets the Sun from the shooting camera (`patchSun` in gpscenes.js).
The live frames were never affected, and they show the real glare bug (#2).

**Not seen, with the reason:** boarders (no boarding launcher is reachable from `__voyage.ext` in this build:
`ext` has update/key/dispose only); Mars low flight (the scripted dive never entered the thin air in 20 s; the frame
shows orbit); the inside of a station (docking opens a UI panel, there is no interior scene); drone swarms (the frame
was taken but the 13 drones are specks at that range, so the swarm look is unjudged); a phone screen.

## Ranked findings

Each: place, frames, what's wrong, the fix. **Fixed** items have a before/after pair.

### 1. The eleven major moons are flat single-colour balls (poor design, too simple for the background) — FIXED
`before-moon-*.jpg`, `sheets/b-moons.jpg` → `after-moon-*.jpg`, `sheets/cmp-moons.jpg`, `sheets/a-moons.jpg`.
Io, Europa, Ganymede, Callisto, Titan and the rest were `MeshStandardMaterial` spheres of one tint, the plainest thing
in a painted sky full of nebulae, armoured planets and a cratered Moon. Destinations you fly to looked like
placeholders.
**Fix:** a `MOONLET` branch of the planets' own surface shader (`space/materials.ts`, `moonletMaterial`), with three
colours and a style per moon in `moonScene.ts`: Io's sulphur with dark calderas, red rings and glowing vents;
Europa's white shell and rust lineae; Ganymede's dark and grooved bright terrain; Callisto's dark crust with bright
craters; Titan's orange smog with a blue limb and soft terminator; Enceladus's white with blue tiger stripes;
Iapetus's two faces; cratered ice for Mimas, Tethys, Dione, Rhea. Albedo held under the bloom threshold (0.62) so
ice reads as a world, not a lamp. Same draw calls as before.

### 2. Sun glare where there is no Sun: rays and starburst out of whatever is straight ahead (poor light) — FIXED
`before-close-mercury`, `-close-saturn`, `-close-venus`, `-station-earth` → `after-*`, `sheets/cmp-4.jpg`.
With the Sun **behind** the camera, `fx/post.ts` decided "in front" from `project()`'s z, which mirrors a point
behind the camera onto the screen. The god rays and lens flare then fired from the middle of the frame and burned
station views at Mercury, Venus, Saturn and Earth to white.
**Fix:** test the Sun in view space (`z < 0`) before projecting. One line, live everywhere.

### 3. Site names pile up over every home world (clunky, disordered) — FIXED
`before-hero-earth`, `-hero-mars`, `-hero-mercury`, `-approach-moon` → `after-*`, `sheets/cmp-labels.jpg`.
"The Metropolis", "Pharos Yard", "Castra…", "The Treasury" in serif sprites several times the size of the planet's
own name, overlapping each other and drawn for sites on the far side of the world, straight through the planet.
Cause: `conquest.ts` hung a screen-sized sprite on a scaled site, so the site's scale multiplied the label (the beacon
next to it already undid this).
**Fix:** divide the label's scale by the site's; show a name only on the side of the world facing the ship.

### 4. Mars: the shield wall reads as one flat red band, and the planet as an orange Moon (mismatch with its sheet) — FIXED
`before-hero-mars`, `-approach-mars` → `after-*`, `sheets/cmp-3.jpg` (top row); reference `art-refit/refs/mars.webp`.
The sheet draws separate tall curved scuta with gold rims and bosses and blue light between them. In game the 22
shields overlapped (half-width over half the pitch) with a 2% bulge, so the ring was one red slab with gold dots. The
surface was a saturated orange with Moon-strength craters, and the hero view faces Amazonis, where none of the named
dark lands are.
**Fix (`armourArt.ts` mars):** each shield 84% of its pitch, so a lit slit shows between neighbours; bulge ×2.5; gold
rims, spina and boss about 1.5× heavier; slit light its own cooler, dimmer look (at the rail's 3.4 the slits bloomed
into white bars). **Surface:** butterscotch-and-rust palette, a broad dark mottle so every face has dark ground,
craters half as deep.

### 5. Jupiter's lightning spires are neon pillars (poor light) — FIXED
`before-hero-jupiter` → `after-hero-jupiter`, `sheets/cmp-3.jpg` (middle row).
The bolt inlaid down each spire used the arcs' glow (3.4) across most of the blade's face, so the sixteen spires
bloomed into magenta tubes and hid the violet blades and gold edges the sheet shows.
**Fix:** the inlay is narrower and has its own glow (1.25); the arcs between the tips keep theirs. Violet, gold and
magenta now each read.

### 6. Venus burns white from the sunward side (poor light) — FIXED
`before-hero-venus` → `after-hero-venus`, `sheets/cmp-venus.jpg`.
The cloud deck at 0.74 albedo under a 2.0-strength scattering shell with 0.9 haze over the ground left a white disc
with nothing on it; the hanging lamps and the deck's streaks were gone.
**Fix:** deck albedo 0.5 with a little more sulphur; shell strength 1.25, Mie 0.45, haze 0.5 (`fx/atmosphere.ts`).

### 7. Ring lines stack into rainbow stripes across most frames (clunky, disordered) — FIXED (partly)
`before-hero-earth`, `-start-earth`, `-ladder-*` → `after-*`, `sheets/cmp-rings.jpg`.
The seven ring hairlines lie in one plane. From anywhere near that plane, which is where the ship is most of the
time, they bundle into a stack of coloured stripes through planets and ships.
**Fix:** each ring's opacity follows how high above its nearest stretch the camera sits (`voyageScene.ts`); edge-on
it drops to 12%. Hero views are clean. In flight a faint band remains along the horizon line; good enough to leave.

### 8. Inside the giants and Venus there is nothing to look at (too simple for its background) — FIXED, pass 2
`after-air-jupiter`, `-air-saturn`, `-air-venus`.
A flat cream fog with the ship in it. No cloud decks below, no towers of cloud, no sun disc, no depth. Earth's low
flight has terrain and reads; the gas giants do not.
**Fix (next pass, `planet/sky.ts` + `planetAir.ts`):** two or three cloud layers as large soft billboards or a
raymarched band at fixed altitudes, coloured from the planet's own bands (rust and cream for Jupiter, butter and gold
for Saturn), a sun disc with a halo through the haze, darkening with depth. Not attempted here: it is the biggest
single piece and the rest of the list was cheaper per frame fixed.
**Done (pass 2, `claude/graphics-pass-2`):** the cause was two things. The cloud-deck meshes sat 40+ units off, where the
giant's haze (visibility about 40 units) had already turned them cream; and a few units under the ship the giant's own
opaque globe filled the lower half of the view in the same flat colour. Now the sky dome draws three cloud shells per
body by meeting each view ray with them (`CLOUD_LAYERS` in `sky.ts`): Jupiter cirrus / cream-and-rust cloud tops / a
dark deep deck, Saturn high haze / butter-and-gold tops / deep deck, Venus upper haze / sulphur deck / lower deck.
Banded about the planet's own axis, streamed along the bands, undersides darker with lit edges toward the Sun, each
layer shaded by those above it, and dimmer the deeper the camera is in a giant. The Sun's disc softens into a halo in
thick air. Once the sky has closed in (cover > 0.5), the mesh decks and the giant's globe are hidden and the dome stands
for them. Frames: `sheets/cmp2-air-*.jpg`; looking up and down, `sheets/p2-sky-inside.jpg` (scenes `sky-<body>-up|down`).
Cost: one full-screen pass of up to six fbm4 calls a pixel, inside Venus and the giants only.

### 9. The Moon's and Venus's god-armour are single-colour shells (too plain against their worlds) — FIXED, pass 2
`after-hero-moon`, `after-hero-venus`.
The Moon's half-shell is pale grey tile on a grey moon; Venus's is mustard ribs on a cream world. Each structure
nearly matches its planet, so it reads as a second planet rather than armour. Earth, Mars, Jupiter and Saturn have
a contrast colour (blue, crimson, violet, the lit wall) and look like art.
**Fix (`armourArt.ts` moon(), venus()):** give the Selenite shell its sheet's deep blue in the panel seams and
silver-gold meander bands; give the Venus ribs emerald enamel between gold ribs, as the people's own palette does
(their portrait and codex are green and gold).
**Done (pass 2):** `ArtStyle` takes an optional `seam` colour: panel seams are filled with it, a little wider, faintly
lit, and a trace of it stays in the far average. The Moon uses the sheet's deep blue for seams; its meander keys are
now pale gold on silver; a second meander band between deep-blue fillets runs inside the blue band. Venus's fans are
polished gold ribs with emerald enamel between them and dark gold grooves. Frames: `sheets/cmp2-hero-moon.jpg`,
`cmp2-hero-venus.jpg`. The Venus ref sheet's fans are all gold; the emerald between the ribs follows this report's
call, made for contrast against the cream world.

### 10. Hulls are small and dim against the sky in fights (poor light) — FIXED, pass 2
`after-duel-*`, `after-ladder-*`.
The fleet hulls (`space/fleet.ts`) use one dark grey with an 18% nation tint and env 0.35. At fighting range a
fighter is a grey sliver lit mostly by its engine. Cruisers and capitals read; fighters and destroyers of the darker
houses (Saturn, Jupiter) disappear into the nebula.
**Fix:** raise the nation tint to ~35% and envMapIntensity to ~0.7, and add a thin emissive running-light strip in
the nation colour along each hull's spine, so a hull reads at any range by colour as well as shape.
**Done (pass 2):** the duel and fleet ships are mostly the styled models (`styles/kit.ts`) and the destroyers, not
`nationMaterials`, so the fix is `liven()` in `fleet.ts`, run once on each template: hull, panel and accent take at
least 0.7 of the environment; a hull darker than 6% luminance (Saturn's, Jupiter's) is lifted a third of the way to its
nation's colour with a faint glow of it; and running lights in the nation's hue (dark colours scaled up to full
strength, so the bloom shows the colour, not white) are set on the hull along the spine and keel by raycasting down
the centreline. The fallback `nationMaterials` take the 35% tint and env 0.7 as written. Lighter houses keep their
art-directed hull colours. Frames: `sheets/cmp2-duel-*.jpg`, `cmp2-ladder-*.jpg` (the ladder scene frames Earth's
station, not the ladder; the capital's new spine lights are visible in it).

### 11. Inside the hangar the ship sits on a grey disc in an empty box (too simple) — SCREEN SESSION
`before-opening-hangar`, `before-opening-people-mars`. `ShipViewer.tsx` is an opening component. Handoff below.

### 12. The title screen is a card on flat navy (plain) — SCREEN SESSION, art supplied
`before-title`. Gemini key art is now at `public/art/title-keyart.webp` (1920 × 1080, armoured worlds, brass ships, a
calm upper middle for the name). Not wired; handoff below.

### 13. The flight view is a letterboxed card, not the whole window — SCREEN SESSION
Every live frame (`before-start-earth` and on): at 1280 × 720 the 3D view fills about two thirds of the window height
inside a rounded card, with an empty starfield band below. The same layout is in pass-3's shots at 1440 × 900. A
flight game should own the window. Handoff below.

### 14. The pilot step's painted-vs-drawn mismatch — SCREEN SESSION / race art
`after-opening-pilot`: the player's own pilot is a flat cartoon SVG (PilotHead) beside the people's painted head
(now a Gemini portrait). The two styles side by side read as mismatched. Fix needs a painted pilot set (skin × hair
× eyes), which is a Gemini job of 30+ images; not run.

### 15. The race heads were soft crops from the reference sheets — FIXED with Gemini
`sheets/heads-before.jpg` → `sheets/heads-after.jpg`, `sheets/cmp-codex.jpg`.
Each head in the codex, pilot step and flight HUD was a 108–166 px crop of a 1024 × 572 sheet. Now a painted
head-and-shoulders portrait per people, cropped to the same box and stored at 3× for sharp screens. Display sizes are
unchanged (the table in `lib/raceArt.ts`), so no layout moved. `raceArt.test.ts` now accepts a whole multiple of the
display size.

## What waits on Gemini

Ran today, through Claude in Chrome, on Caleb's signed-in Gemini (record in `GEMINI-PROMPTS.md`):
- seven race portraits, accepted, in the game;
- the title key art, accepted, in `public/art`, not wired.

Not run, and worth running next:
- **Painted pilot heads** for the player's own pilot (#14).
- **Codex home-world art** to replace the procedural `HomeBase` thumbnails, if Caleb wants the codex fully painted.

Measured today, as a dated finding: Gemini on this account refused every prompt with an image attached ("Sorry, I
can't edit images for you yet"), 3 tries on 2026-10-20 (two people sheets, one planet sheet, in chat and in Create
image). The prompts were rewritten as text-only with the sheet's description in words. Re-test costs one chat.

## Handoffs (not this session's files)

For the **screen session** (styles*.css, opening components, title):
- #13: let the flight view fill the window; the HUD overlays it.
- #12: put `public/art/title-keyart.webp` behind the title card (cover, darkened ~30% at the centre).
- #11: the hangar viewer wants a backdrop: the key art blurred, or a nation-coloured gradient and a lit floor.
- The docked station screen (`before-dock-mars`) is a red panel over black; no picture of the station at all.

## Frame cost

The moons add no draw calls (one mesh each, as before) and a longer fragment shader on screen-small discs. Ring
fading is seven opacity writes a frame. No measurement of frame time was taken this pass; the headless runs were
shared with other sessions on the same machine.

## Files changed

`space/materials.ts` (moon shader, Mars palette, Venus deck), `moonScene.ts`, `Voyage.tsx` (one argument),
`fx/post.ts`, `fx/atmosphere.ts`, `conquest.ts` (labels only), `armourArt.ts` (Mars, Jupiter), `voyageScene.ts`
(ring fade), `public/races/*/head.webp`, `public/art/title-keyart.webp`, `lib/raceArt.test.ts`, scripts
`gp.mjs`, `gpscenes.js`, `gpsheet.py`, `gemini-clean.mjs`.

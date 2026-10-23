# Hardpoints: the ship shows what it carries (2026-10-21)

Caleb, 2026-10-21: "if you have railguns equipped, your ship will look different. If you have missiles equipped, your
ship will look different." This thread's job is ship design, customisation detail, and making each weapon match its
ship.

## The rule

**Every fitted module puts hardware on the hull, and the hardware's shape says what it is in every nation.** A railgun
is always two long rails, a missile rack is always a box of round cells, whoever built it. The **nation decides the
material and the shape language** (Earth's turned brass, Jupiter's violet facets, Mars's grey slabs), and **the
glow is the colour of what the weapon fires**, so the hardware lights up in the same colour as its shots.

## The weapon grammar (the same for all seven nations)

| Weapon | Hardware | Where it sits |
|---|---|---|
| Pulse laser | a low turret with twin short barrels | spine, then belly |
| Beam laser | one focusing lens in a heavy collar, no barrel | nose, then belly |
| Plasma bolt | one fat short barrel wrapped in glowing coil rings | spine, then belly |
| Railgun | two long parallel rails with a glowing conductor between, run fore and aft past the nose | flanks (a pair), then spine |
| Flak | a squat turret with four stubby barrels in a square | spine, then belly, then flanks |
| Seeker missile | a box launcher with a 2×3 grid of round cell doors | flanks (a pair) |
| Torpedo | one large tube under the hull, the warhead's nose showing | belly |
| Swarm missiles | a flat honeycomb launcher of small hexagonal cells | flanks, then spine |
| Ion shot | a short barrel through three stacked ring coils | spine, then belly |
| Proximity mine | a rear-facing rack with a row of round mines | tail |

Fittings: shield (emitter pylons, one per tier, in the shield's colour), drones (a cradle with the drone docked in it),
countermeasure (flare strips, chaff pods or a jammer mast), targeting computer (a sensor dome under the nose, bigger
per Mk), reactor (glowing vents along the spine, brighter per Mk), armour (extra plate slabs on the flanks), engine
(afterburner collars on each nozzle, one ring per Mk).

## Gemini sheets

One sheet per nation: the cruiser it flies, and the ten weapons drawn in its style. Saved to `art/hardpoints/`.
Jupiter first, as the ships were.

### Shared block (every prompt starts with this)

```
Concept art weapons sheet for a space strategy game: one spaceship and the ten weapon mounts it can be fitted with, all in the same style. 16:9 landscape, plain flat dark slate-grey background #2a2f3a, a faint thin grid. No text, no letters, no numbers, no labels, no logos, no watermark anywhere.

LAYOUT: Top left, a large hero view of ONE single ship at a three-quarter angle from above and in front, fitted with two long railgun rails along its flanks and two missile box launchers. Top right, the same ship side-on, nose pointing left. Below, two rows of five equal square panels, each showing ONE weapon mount close up at a three-quarter angle, sitting on a small patch of the ship's own hull plating, with a tiny human figure for scale. Panel order, left to right, top row then bottom row:
1. twin-barrel laser turret: a low turret with two short parallel barrels
2. beam laser: a single round focusing lens in a heavy collar, glowing, no barrel
3. plasma cannon: one fat short barrel wrapped in four glowing magnetic coil rings
4. railgun: two long parallel rails with a glowing conductor strip between them, a capacitor block at the back
5. flak turret: a squat turret with four stubby barrels in a square
6. missile launcher: a box with a 2-by-3 grid of round cell doors, one door open showing a warhead tip
7. torpedo tube: one very large tube, a heavy torpedo nose just showing at its mouth
8. swarm launcher: a flat honeycomb panel of many small hexagonal cells
9. ion cannon: a short barrel running through three stacked ring coils crackling with blue-white light
10. mine layer: a rear-facing rack holding a row of round spiked mines
Every mount is built in the ship's own materials and shape language below, so it clearly belongs to this ship and no other. Only the parts that fire glow.
```

### Jupiter (the Diadochoi): *Sarissa*

```
STYLE: premium stylized sci-fi key art, painterly lighting, strong rim light from one sun, soft bloom only on glowing parts. Hellenistic royal warship fused with hard engineering: every part a hook, a blade or a talon, sharp flat facets, nothing round, near-black purple metal and violet plate lit from inside by thin glowing magenta seams. Even the round parts (lens, coils, cells, mines) are cut as faceted polygons with talon-like brackets. Not cute, not cartoon, not toy-like, not photoreal. An original design.

THE SHIP: the SARISSA, a cruiser: a long narrow faceted spine, diamond in cross-section, a pointed prow, two small five-segment claws curling forward at the bow, one raked blade crest toward the stern with violet slit windows at its foot, three hexagonal engines at the stern glowing magenta.

COLORS: hull near-black purple #24133a, plates violet #4a2a78, accent violet #7442ad, seams and glow hot magenta #ff2fd0. Weapon glows: railgun blue-white, plasma green, ion pale blue, everything else magenta.
```

### Earth (Humans): *Pathfinder*

```
STYLE: premium stylized sci-fi key art, painterly lighting, strong rim light from one sun, soft bloom only on glowing parts. Today's navies and space agencies grown up: smooth lathed curves, turned rings, panel bands, rivet lines, brushed brass and gunmetal, blue bands and blue navigation lights. Honest and a little old-fashioned, like a brass naval instrument. Turrets are low domes like a modern warship's gun mounts. Not cute, not cartoon, not toy-like, not photoreal. An original design.

THE SHIP: the PATHFINDER, a cruiser: a brass lathed cigar hull with a gunmetal band, a dark-blue bubble canopy near the nose, a pair of swept trapezoid wings, gunmetal engine nacelles with brass rings under the wing roots, a shallow V of two tail fins, blue engine bells.

COLORS: hull brushed brass #c9a14a, panels gunmetal #3a3f48, accent blue #3f7fd0. Weapon glows: railgun blue-white, plasma green, ion pale blue, everything else blue-white.
```

### Moon (the Selenitai): *Lampas*

```
STYLE: premium stylized sci-fi key art, painterly lighting, strong rim light from one sun, soft bloom only on glowing parts. The temple at Delphi as a warship: white marble ceramic, polished silver and mirrors, thin fluted columns, open frames, laurel and carved bands, no armour plate at all. The light is the weapon: barrels are slender fluted columns, mounts sit on small round column bases, lenses are polished mirrors set in silver. Elegant and severe. Not cute, not cartoon, not toy-like, not photoreal. An original design.

THE SHIP: the LAMPAS, a cruiser: a narrow white chamfered hull with a ring of eight small mirror petals at the bow angled forward like a lamp's reflector, a glowing pale-blue point at the centre of the petals, and a small glowing silver ring for an engine at the stern.

COLORS: hull white marble ceramic #e6e3da, panels polished silver #b8c0cc, accent blue #2f5fc4. Weapon glows: railgun blue-white, plasma green, ion pale blue, everything else pale blue.
```

### Mercury (the Hemerodromoi): *Embolon*

```
STYLE: premium stylized sci-fi key art, painterly lighting, harsh bright rim light from a huge nearby sun, soft bloom only on glowing parts. Spartan hoplite warship: thick, short, heavy, domed and riveted, dark bronze and black iron with a raised gold rim on every edge. Every mount sits behind its own small round domed shield plate with a gold rim, like a hoplite's shield. Heavy and blunt. Not cute, not cartoon, not toy-like, not photoreal. An original design.

THE SHIP: the EMBOLON, a cruiser: a blunt wedge flown point-first, with a large domed bronze shield plate at the point, wider than the hull so from the front the ship is one disc, a raised gold rim and a single gold chevron on the shield, black iron flanks, a slit window on the spine behind the shield, two short wide white-gold engines.

COLORS: hull dark bronze #5a3d22, panels black iron #151210, accent gold #e3c52c. Weapon glows: railgun blue-white, plasma green, ion pale blue, everything else white-gold.
```

### Venus (the Nephelai): *Dromon*

```
STYLE: premium stylized sci-fi key art, soft painterly lighting through golden haze, soft bloom only on glowing parts. A Byzantine court warship: rounded, gilded, ornamented, gold leaf, green glass and enamel, filigree bands, nothing with a hard edge. Weapons hide: each mount is set in a gold-rimmed onion-dome housing or behind enamelled panels that open, barrels are short and gold, missile cells are framed like icon panels. Rich, regal, never soft or cute. Not cartoon, not toy-like, not photoreal. An original design.

THE SHIP: the DROMON, a cruiser: a gold teardrop hull with a green glass dome on top, four gilded fins set in an X at the stern, two of them painted with enamel icon panels framed in gold, a long soft emerald-green engine glow.

COLORS: hull gold leaf #c9a227, glass green #0f4a33, accent emerald #1d8f5c. Weapon glows: railgun blue-white, plasma green, ion pale blue, everything else green.
```

### Mars (the Quirites): *Corvus*

```
STYLE: premium stylized sci-fi key art, painterly lighting, strong cold rim light from one sun, soft bloom only on glowing parts. A Roman legion's warship in a cold industrial empire style: flat faceted planes, hard edges, trenches, rows of small greebled details, cold mid-grey steel with darker grey panels, white lights in rows. Mars red only as one thin stripe, never more. Turrets are flat boxy slabs with hard chamfers. One plan from every yard. Not cute, not cartoon, not toy-like, not photoreal. An original design, not a copy of any film ship.

THE SHIP: the CORVUS, a cruiser: a flat dagger wedge, its boarding bridge a spiked boom folded along the spine, a single boxy tower block toward the stern with a lit window bar, a thin red stripe down each side of the prow, a flat bank of small square-cut ice-white engine nozzles at the stern.

COLORS: hull cold grey steel #8a8f96, panels darker grey #5d6269, accent red #cc2131 (sparing). Weapon glows: railgun blue-white, plasma green, ion pale blue, everything else red.
```

### Saturn (the Autochthones): *Paralos*

```
STYLE: premium stylized sci-fi key art, painterly lighting, dim cold rim light from a very distant sun, warm bloom only on glowing parts. An ancient Athenian galley fused with hard engineering: spare, long, light and tensioned, matte black composite and dark indigo, thin oar-like fins, a painted eye on the bow, few lights except amber running lights. Mounts are long and slim, barrels run out like oars or a ram, launchers are long low boxes. Ancient and quiet. Not cute, not cartoon, not toy-like, not photoreal, no violet. An original design.

THE SHIP: the PARALOS, a cruiser: a long low matte black hull with a ram at the bow, a painted eye on each side of the ram, a dark canopy behind the eyes, a long gun run out along the ram, thin black oar-fins along each flank, and a thin amber engine with a very long plume.

COLORS: hull matte black #16161e, panels dark indigo #2a2850, accent indigo #33307a, running lights amber #ffb347. Weapon glows: railgun blue-white, plasma green, ion pale blue, everything else amber.
```

## Results (2026-10-21)

**Sheets:** all seven accepted, in `art/hardpoints/<nation>.jpg`. Every sheet drew the ten mounts in the asked order,
in that nation's materials. Jupiter was run first as the test and needed no change to the shared block.
- Misses: Mars drew eleven panels (flak and the missile box twice, one in red). Mercury put no hoplite shield in
  front of its turrets (bronze domes with gold rims instead); the build keeps a small one, as the prompt asked.
- The six files after Jupiter's are screen captures of Gemini's 1024-px preview (1206×674), not the 1376-px download:
  Chrome blocked automatic downloads after the first. The full-size originals stay in Gemini's chat history.

**Built** (`src/components/space/hardpoints.ts`):
- Every slot shows on the hull: ten weapons, shield emitters (one per Mk), drone cradles, flare strips, chaff pods or a
  jammer mast, a sensor dome (bigger per Mk), reactor vents, conforming armour plates (two rows at Mk II), and
  afterburner collars (Mk II and III).
- Mounts snap to the hull by ray cast. A zone with no hull near it is skipped, never guessed.
- One mesh per material: a fully fitted cruiser adds 9 to 13 draw calls, on the player's ship only.
- The selected weapon's hardware glows brighter (×2.4). Every glow breathes, and the ion coils flicker.

**Wired:**
- In flight: refits when the loadout changes (the shipyard, the pause menu, and the `__voyage.setLoadout` dev hook).
- The people screen shows each nation's starting fit. The ship step refits live as you change slots.
- The shipyard now shows your cruiser as it is fitted. The hangar camera frames the hull alone, so fitting rails
  does not zoom out.

**Proof:**
- `npx tsc -b` clean. `npx vitest run --dir src`: 662/662. `npm run build` OK. eslint clean on the changed files.
- `hardpoints.test.ts` (12 cases):
  - Every four-weapon fit of the ten gets distinct zones.
  - All seven cruisers build finite hardware within a quarter-hull of the hull in ≤16 meshes.
  - A railgun fit and a missile fit differ.
  - Refit replaces the hardware and does not pile it up.
- Seen in the in-app browser: `hardpoints.html` (dev gallery, 7 nations × 4 fits; `?n=mars` for one nation), the
  ship step (railgun → flak swapped the rails for a turret live), and flight (a Mk III fit put hex collars on
  Jupiter's nozzles; the scene's hardpoint meshes went from 9 to 13 on refit).

**Not done / found:**
- Shots still leave from the nose (`arsenal.noseOf`), not from the mounts. Firing from the hardware is arsenal's
  file and its own package.
- AI ships do not show their arms. `enemyArms.ts` knows them, so the same builder could dress them, but at a
  draw-call cost per ship that needs measuring first.
- The chase camera sits behind and above, so flank and belly hardware is mostly seen in the hangar and in turns.

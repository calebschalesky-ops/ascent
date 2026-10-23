# Ascent Flight — art direction

> 2026-10-18, branch `claude/art-direction-e63aed`. The look and style of every nation's ships, stations, engines and
> weapons fire. Races follow `LORE.md` on `claude/races-fe3f3b` (DRAFT); class names follow progression's
> `src/lib/progression/refs.ts` (PLACEHOLDER). If the lore moves, this file follows it.
>
> Reference builds of all seven styles (a capital ship, a cruiser and a fighter each) are in `src/components/space/styles/`,
> keyed by nation in `STYLES`, and on show at `/gallery.html` in the dev server. Images: `shots/art-*.jpg`.

## The rule

**Seven nations, seven silhouettes.** A player who sees a black shape against a planet must be able to say whose
ship it is before any colour reaches them. Then the colour confirms it. Every nation differs in all six of these:

| | Earth | Moon | Mercury | Venus | Mars | Jupiter | Saturn |
|---|---|---|---|---|---|---|---|
| **People** | Humans | Selenitai | Hemerodromoi | Nephelai | Quirites | Diadochoi | Autochthones |
| **Culture drawn on** | today's navies and space agencies | Delphi, the temple | Sparta, the hoplite | Byzantium, the court | Rome, the legion → **galactic-empire style** | Hellenistic kings → **clawed violet-empire style** | Athens, the trireme |
| **Silhouette** | lathed cigar, swept wings | long open colonnade, needle | disc / round shield | teardrop and dome | flat dagger-wedge; ball and hex panels | crescent claws, raked spines | long thin spine, banks of oar-fins |
| **Hull language** | smooth turned curves, panel bands | straight columns, open frames, no armour | thick, domed, riveted rims | rounded, gilded, ornament | flat faceted planes, hard edges, trenches | sharp facets, hooks, talons, nothing rounded | spare, light, tensioned, wings |
| **Materials** | brushed brass, gunmetal | white marble ceramic, polished silver, mirror | dark bronze, black iron, gold rims | gold leaf, green glass, enamel | cold mid-grey steel, darker grey panels | near-black purple metal, violet plate | matte black composite, indigo |
| **Hull base** | `#c9a14a` brass + `#3a3f48` | `#e6e3da` + `#b8c0cc` silver | `#5a3d22` bronze + `#151210` | `#c9a227` gold + `#0f4a33` glass | `#8a8f96` + `#5d6269` | `#24133a` + `#4a2a78` | `#16161e` + `#2a2850` |
| **Accent (nation colour)** | `#3f7fd0` | `#2f5fc4` | `#e3c52c` | `#1d8f5c` | `#cc2131` | `#7442ad` | `#33307a` |
| **Accent use** | blue bands, nav lights | blue halo on the lamp ring, inlay | gold rim on every shield | green glass domes, enamel | **sparing**: one red stripe, red markings only | lit seams in magenta `#ff2fd0` over violet | amber `#ffb347` running lights, painted owl-eye |
| **Engine glow** | blue core to white (today's plume) | silver-white ring, pale blue halo | white-gold, hot, short and wide | emerald green, soft, long | cold ice-white with cyan `#bfefff`, many small nozzles in a flat bank | magenta to violet `#ff3df0`→`#8a2be2`, flickering | amber-orange, thin, very long |
| **Weapon bolt colour** | blue-white | pale blue | gold | green | red | magenta | amber |
| **Markings** | a blue band, hull numbers | a laurel ring, a carved inscription band | a single gold chevron on each shield | gold filigree bands, painted icon panels | a red bar and a white numeral; no emblem | a four-pointed crown sigil (four crowns of the founders) | a painted eye on the bow |

Colour checks, so two nations never blur:
- **Blues.** Earth, Moon and Saturn all carry blue accents. They are told apart by hull: brass (Earth), white (Moon),
  black (Saturn); and by engine glow: blue (Earth), silver ring (Moon), amber (Saturn).
- **Cold engines.** Moon and Mars both run pale. Moon's glow is one ring; Mars's is a flat bank of small square-cut
  nozzles. Never give Mars a single big round plume.
- **Purples.** Jupiter owns purple. Saturn's indigo stays dark and is lit only by amber, never violet.

## One people, one look

Caleb's ruling, 2026-10-21: there are many peoples, and each one looks unmistakably like itself. A people is never
several races in one. Inside a people there is variation (age, build, a shade lighter or darker, a scar), never a
vast difference: no pale people with a dark member, no dark people with a pale one, no blond in a black-haired people.
This binds every picture of a person in the game: Gemini sheets and portraits, the codex, leaders, the avatar
creator, comms heads, crowds, and any figure that shows up later in 3D.

| People | Skin (races.ts `palette.skin`) | Hair | Eyes |
|---|---|---|---|
| Humans (Earth) | sun-browned `#9a6a4a` | dark brown to black | brown |
| Selenitai (Moon) | pale cream `#e9dccb` | silver-white | ice blue |
| Hemerodromoi (Mercury) | very dark brown `#3a2418` | black, cropped | amber-gold |
| Nephelai (Venus) | warm tan `#d9b08c`, pearly sheen | dark brown | green |
| Quirites (Mars) | olive tan `#c48f6a` | black | dark, large pupils |
| Diadochoi (Jupiter) | very pale violet-white `#e8e2f0` | silver-white | violet, very large |
| Autochthones (Saturn) | warm tan `#b9a48e` | dark-brown fur ruff | near-black, very large |

How it is held:
- **Code.** `src/lib/opening/profile.ts` offers only shades of that one look; `opening.test.ts` fails any skin swatch
  more than 32 per channel from the people's `palette.skin`. Grey hair is the only age change.
- **Art.** Every Gemini prompt for a person names that people's skin, hair and eye colour in words and hex, for
  *every* figure on the sheet, leaders and older figures included ("the same skin as the pilot"). A sheet or portrait
  whose second figure drifts (Mercury's pale King of the Field, Earth's fair Strategos, Mars's pale consul) is not
  used until it is repainted.

## What we take, and what we do not

Caleb asked for two looks from films and a TV series. We take the **style** and build our own ships:

- **Mars: galactic-empire style.** In the spirit of the Imperial ships in *Star Wars*: grey dagger-wedge capital ships
  with stepped decks and a command tower at the stern, ball-cockpit fighters with flat six-sided wing panels, cold grey
  with sparing accents, built identical in vast numbers.
- **Jupiter: clawed violet-empire style.** In the spirit of the Galra empire in *Voltron: Legendary Defender*:
  angular, aggressive purple hulls, glowing magenta and violet seams, sharp clawed forms.

Not allowed, anywhere: their names (no "Star Destroyer", "TIE", "Galra", "Zarkon"), their logos or emblems, and copies
of particular ships. No twin sensor globes on the tower, no spoked round cockpit window, no copied cockpit bubble, no
Galra crest. Our ships carry our names (the Roman and Greek class names) and our own sigils. If a part only makes sense
as a quotation, leave it out.

## Why Mars and Jupiter

The two planets suggested for these looks fit the lore, and the lore fits them back. **Confirmed.**

- **Mars → galactic-empire style.** LORE.md's Quirites are Rome: legions of citizen soldiers, ships "practical,
  standard, built in numbers… built to the same plan in every yard", a "long ram-prowed hull", fighters "plain, cheap
  and in squadrons of eight… one looks like the next". That is the look itself: one grey wedge from every shipyard, a
  ram-like dagger prow, swarms of identical fighters. The Republic that fears a king while building an empire's navy is
  the same story the films tell, so the look carries a plot of its own. Mars's red goes on as the sparing accent.
- **Jupiter → clawed violet-empire style.** The Diadochoi are warrior kings: "huge and proud" ships, a royal flagship
  "many times the size of anything else, with a throne room", purple-dyed cloaks, crowns carved on everything. Jupiter's
  nation colour is already violet. A conquering royal house in purple with glowing seams is that look.
- **Their rivalry reads on screen.** Mars and Jupiter are each other's great enemy (LORE.md). Cold grey planes against
  glowing purple claws: the two navies are opposites in shape, colour and light, so a battle between them is easy to
  follow.

## How a modeller builds these

Conventions, as in `src/components/space/ship.ts` and ship types' `space/fleet.ts`:
- Nose toward **−z**, up **+y**. Model in units where the **capital ship is about 10 long, the cruiser about 2, the
  fighter about 2** before fitting; `fleet.ts` scales each to its world length (capital 5×, cruiser 1×, fighter 0.2× the
  player ship).
- Tag every mesh `userData.role`: `hull`, `panel` (second hull tone), `accent` (nation colour), `glow` (engines and lit
  seams, unlit, bright enough for bloom), `glass`, `lit` (windows). One material per role per nation, merged by role, so
  49 ships stay cheap on a phone.
- Angular styles (Mars, Jupiter, Mercury's rims) use **flat-shaded faceted geometry**: `ConvexGeometry` from point
  lists, or `ExtrudeGeometry` with bevel off. Round styles (Earth, Venus) use `LatheGeometry` and spheres with smooth
  normals. Moon and Saturn use thin cylinders and boxes.
- A silhouette test: render the model black on white at 64 px. If it could be another nation's, change the shape, not
  the colour.
- Each style's **cruiser is the player's ship when the player flies that nation**. Caleb confirmed this on 2026-10-18
  (open question 1).

All seven styles are built, capital ship, cruiser and fighter: `styles/navy.ts` (Earth), `temple.ts` (Moon), `phalanx.ts`
(Mercury), `court.ts` (Venus), `imperial.ts` (Mars), `claw.ts` (Jupiter), `trireme.ts` (Saturn). `STYLES[nation]` gives
each one's names, materials and builders. The silhouette rule is tested for all three kinds:
`styles/silhouette.ts` draws each model black at 48 px from above, the side and the front, and `styles.test.ts` fails
if any two nations' ships overlap by more than 0.8 in one view or 0.6 on average.

---

## Earth — Humans: "Metropolis" navy

Today's navies and space agencies, grown up. Readable, honest, a little old-fashioned. The player's brass courier is
the root of the whole line.

- **Capital, *Metropolis*.** Built: `buildNavyCapital()`. A long lathed cylinder hull (LatheGeometry, radius 0.9 over length 10) with three
  turned bands (steel tori). A flattened carrier deck on top (a box 1.6 × 0.15 × 6), a short boxy island to starboard
  at z +2. Two swept wing-radiators per side (thin extruded quads, brass). Four round engine bells in a square at the
  stern, blue plumes. Hull numbers in white on the deck.
- **Cruiser, *Pathfinder*.** `ship.ts` as it is: the brass courier. Built as a role-tagged copy: `buildNavyCruiser()`.
- **Fighter, *Sparrow*.** Built: `buildNavyFighter()`. A small lathed body (half the courier's girth), one swept wing pair, a single engine, a
  bubble canopy. A miniature courier.
- **Station.** A ring-and-spoke wheel in brushed steel with blue window bands; the hangar is a plain square bay.

## Moon — Selenitai: the temple fleet

Delphi. Ships built as offerings: tall thin columns that could not stand under Earth's weight, white and silver,
open to space. No armour plate at all; it is beauty and mirrors.

- **Capital, *Treasury*.** Built: `buildTempleCapital()`. A colonnade: two rows of 9 thin white columns (cylinders r 0.08, length 1.6, standing on
  ±y) between a top and bottom plinth (long thin boxes 1.6 × 0.12 × 10). Between the columns, sealed vaults (silver
  boxes 0.5 × 0.9 × 0.6, every other bay). A triangular pediment at the bow (extruded triangle). One silver mirror ring
  at the stern (torus r 1.0) with the pale blue halo glowing inside it: the engine.
- **Cruiser, *Lamp*.** Built: `buildTempleCruiser()`, the petals open between them so the front reads as a flower. A narrow white hull (box 0.25 × 0.25 × 2, chamfered) with a ring of 8 small mirror panels at
  the bow, angled forward like a lamp's reflector. Engine: a small glowing ring.
- **Fighter, *Needle*.** Built: `buildTempleFighter()`. A white needle (cone r 0.08, length 2) with four folded fins at the back, swept flat along
  the shaft. More lance than plane. A blue point of light at the tip.
- **Station.** A tholos: a round temple, a ring of columns round a domed core, open to space, a silver dish on top.
- Marking: a laurel ring (a torus of small leaf boxes) on the bow; a band of carved lettering (a strip of tiny `panel`
  boxes).

## Mercury — Hemerodromoi: the phalanx

Sparta. Everything faces the Sun behind a great shield. The silhouette is a circle. Heavy, dark bronze, short.

- **Capital, *Hoplon*.** Built: `buildPhalanxCapital()`. A round domed heat shield (a sphere cap, r 4, depth 1.2, dark bronze) faces forward. Behind
  it, smaller than the shield so the shield hides it from the front, a short drum hull (cylinder r 1.6, length 4; built at 6.6 so the ship is about 9 long, as the others are) with
  gun blisters round its rim. A raised gold rim on the shield (torus). Two thick, short engine bells, white-gold.
- **Cruiser, *Wedge*.** Built: `buildPhalanxCruiser()`, the shield wider than the hull so from the front it is one disc. A blunt wedge with a domed shield plate at the point, flown point-first. Bronze, black
  flanks, gold edge.
- **Fighter, *Aspis*.** Built: `buildPhalanxFighter()`. A small round shield (a shallow disc, r 1) with one gun barrel through the middle and a
  single engine behind. Flown in tight rows, so from the front a squadron is a wall of discs.
- **Station.** Low and heavy on a disc, nothing taller than it needs to be; mirrored sunshade facing the Sun.
- Marking: a single gold chevron on each shield (an original mark; not the historical Lambda).

## Venus — Nephelai: the cloud court

Byzantium. Ships that float and impress: domes inside domes, gold on everything, green glass. Nothing has a hard edge.

- **Capital, *Palatine*.** Built: `buildCourtCapital()`. A floating palace: a wide teardrop hull (LatheGeometry) under a large green-glass dome
  (sphere cap, `glass` tinted `#1d8f5c`), four small gold onion domes round it, a gold lifting-envelope ring (torus)
  round the waist. A chapel spire at the stern. Long soft green plumes.
- **Cruiser, *Dromon*.** Built: `buildCourtCruiser()`, the fins in an X. A teardrop with gilded fins, two of them painted with icon panels (accent quads framed in
  gold).
- **Fighter, *Jewel*.** Built: `buildCourtFighter()`; `courtMaterials(accent, hueShift)` for the family hue. A faceted gem body (an octahedron, scaled 1 × 0.6 × 2) set in a gold claw mount, two small
  curled fins. Each pilot's family paints its own: allow a per-ship hue shift ±15° around the green.
- **Station.** A chandelier: domes stacked and hung from a lifting envelope.
- Marking: gold filigree bands (thin tori) on every dome.

## Mars — Quirites: galactic-empire style (signature)

Rome's legions in grey. One plan from every yard. Flat faceted planes, hard edges, trenches, rows of small details.
Cold grey; Mars red only as a thin stripe or a numeral. Lights are white, engines ice-white.

- **Capital, *Rostrata*.** Built: `buildImperialCapital()`.
  - Hull: a flat dagger-wedge, the ram prow at the nose, 10 long and 6.4 wide at the stern. A `ConvexGeometry` over a
    diamond cross-section: a sharp edge at mid-height running from the nose to the stern corners, a top ridge rising
    to 0.75 at the stern, a shallower bottom to −0.5.
  - Decks: three stepped slabs climbing toward the stern along the ridge (each a convex trapezoid, narrower and
    shorter than the one under it). Rows of small `panel` boxes on each deck.
  - Command tower: a narrow neck at the stern, a wide flat bridge bar across it (`lit` windows along its front),
    two upright sensor vanes. **Not** twin globes.
  - Trench: a dark `panel` strip along each flank edge.
  - Hangar: a dark recessed bay under the belly, a third of the way back.
  - Engines: a stern block with three large and four small square-cut nozzles in a flat bank, ice-white glow.
  - Mars red: one thin stripe down each side of the prow, a numeral plate on the tower.
- **Cruiser, *Corvus*.** Built: `buildImperialCruiser()`. A smaller wedge (the capital's hull at a fifth of the length, stretched to 1:2.5), its
  boarding bridge (the *corvus*) a spiked boom folded along the spine, a single tower block. Same greys.
- **Fighter, *Velite*.** Built: `buildImperialFighter()`.
  - A ball cockpit (sphere r 0.33, grey) with an octagonal window (`glass`) facing forward and a framed rim.
  - Two short struts out to the sides, each ending in a flat **six-sided wing panel** standing upright (in the y–z
    plane), dark `panel` grey with six raised ribs from the centre to the corners and a grey frame.
  - Ours, not a copy: the panels lean in 8° at the top, each carries a thin red rib on its outer face, the struts have
    a square pylon block, and there are two small ice-white nozzles under the rear of the ball.
- **Station.** A flat grey wedge-platform with a central tower and a hangar slot along one edge; grey everywhere,
  white lights in rows.
- Marking: a red bar and a white numeral. No emblem or crest.

## Jupiter — Diadochoi: clawed violet-empire style (signature)

Warrior kings of the outer dark. Everything is a hook, a blade or a talon. Near-black purple metal and violet plate,
lit from within by thin magenta seams. Nothing is round.

- **Capital, *Tessarakonteres*.** Built: `buildClawCapital()`.
  - Spine: a long faceted lozenge (`ConvexGeometry`), 10 long, tall in section, a pointed prow.
  - Claws: two crescent arms grow from the hull's flanks near the stern and sweep forward and inward, past the prow,
    to two talons that nearly meet in front of it. Each arm is six faceted segments along an arc, thinner toward the
    tip.
  - Crest: three raked blades along the spine, tallest in the middle, and a ventral keel blade.
  - The throne room: a violet-lit window band (`glow`) across the top, set forward.
  - Seams: magenta `glow` lines along each claw's inner edge and along both flanks.
  - The crown: a four-pointed `accent` sigil on the crest.
  - Engines: five nozzles in an arrowhead at the stern, magenta to violet.
- **Cruiser, *Sarissa*.** Built: `buildClawCruiser()`. A long faceted spine with a spinal gun as long as the hull (a thin box running out past the
  prow), two small claws at the bow, magenta seams.
- **Fighter, *Hetairos*.** Built: `buildClawFighter()`.
  - A narrow faceted fuselage with a needle prow and a slit cockpit lit violet.
  - Two forward-swept wings that hook down at their tips like talons, magenta along the leading edge.
  - Two raked tail spikes, one magenta engine.
- **Station.** A spiked crown: a dark core ring with four great upswept prongs (the four crowns), violet window bands,
  magenta seams.
- Marking: the four-pointed crown sigil in `accent` violet.

## Saturn — Autochthones: the trireme fleet

Athens, far out and plain. Spare, long and quiet, built to last the trip. A thin spine with rows of fins, like oars.
Matte black, indigo, a few amber lights. The darkest fleet: in Saturn's light (0.011 of Earth's) you see it by its
running lights.

- **Capital, *Trireme*.** Built: `buildTriremeCapital()`. A long thin black spine (box 0.6 × 0.5 × 10) with three banks of small engines down each
  side (three rows of 8, amber), and long thin radiator fins standing out like oars (boxes 0.03 × 0.02 × 1.2, angled
  back). A ram at the bow and a painted eye on each side of it. Indigo panels.
- **Cruiser, *Raider*.** Built: `buildTriremeCruiser()`. A black hull with three fuel tanks along its spine (cylinders), low and long.
- **Fighter, *Glider*.** Built: `buildTriremeFighter()`. High-aspect glider wings (span 3 against a body of 1.6), a slim pod, a small booster
  engine. More sailplane than warplane.
- **Station.** A tall thin tower with an open hall at the top (a *bema*), wings of solar fins, amber lights.
- Marking: a painted eye on the bow (`accent` iris on a pale `panel` disc).

---

## Engine plumes and lit seams (for graphics)

The plume shader in `space/materials.ts` (`plumeMaterial`) is one blue for everyone. Give it a nation colour pair
(core, tail) and a shape (length, width), from the table at the top:

| Nation | Core | Tail | Shape |
|---|---|---|---|
| Earth | `#ffffff` | `#2659ff` | as today |
| Moon | `#ffffff` | `#9ab8ff` | a ring, short |
| Mercury | `#fff6d0` | `#ffb000` | short, wide |
| Venus | `#e8fff0` | `#1dbf6c` | soft, long |
| Mars | `#ffffff` | `#bfefff` | short, many small nozzles |
| Jupiter | `#ffd0ff` | `#8a2be2` | flicker, medium |
| Saturn | `#fff0d0` | `#ff8a1e` | thin, very long |

Jupiter's seams and Mars's windows want bloom; the other nations' should not glow much beyond their engines.

## Threads and what each is asked (2026-10-18)

The guardrail hook blocked direct messages from this session (it ran in bypass mode), so these directions sit in the
shared notes folder as `art-direction.md`, for Caleb to send or the threads to read.

| Thread | Asked |
|---|---|
| races | Put each race's ship look into LORE.md (link here); confirm Mars and Jupiter. |
| ship types | One template set per nation, not one shared capital and fighter; use `styles/` for Mars and Jupiter. |
| fleet command | Draw every fleet ship through `fleet.make` so armadas show their nation's style. |
| progression | Keep the class names; the shipyard and start screen should show the nation's model. |
| stations and moons | One station style per nation, as in each section above. |
| graphics | Plume and bolt colours per nation; bloom for Jupiter's seams. |
| integrator | Add the silhouette and colour rules to its coherence checks. |

## Open questions for Caleb

1. **Cruisers.** *Answered 2026-10-18:* each nation has its own cruiser, as sketched in its section, and the player
   flies their nation's. Earth's stays the brass courier.
2. **How close to the films?** The reference builds are clearly in the spirit of both, and clearly not copies. Do you
   want them closer, or further away?
3. **Mars's red.** The galactic-empire look is grey with almost no colour. Is a thin red stripe enough for Mars, or do
   you want the red stronger so the nation colour reads at a distance?
4. **Earth.** Is the player's brass courier the right root for all of Earth's navy, or should Earth have a look of its
   own and the courier be just one ship?

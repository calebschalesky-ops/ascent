# God armour: a megastructure over each world

> 2026-10-19, branch `claude/god-armour-ac30e6`. Caleb's ruling: "this station should be large enough that the orbit
> of the planet almost looks like it's covering a large portion of the planet. I want huge space stations that almost
> look like armor covering the planet, themed after each god that the planet represents."
>
> This thread owns the station's **body**: its shape, orbit, size, berths, hardpoint positions, collision and frame
> time. The **stations** thread owns its **systems** (defences, navy, economy, religion, power), which mount on the
> hardpoints in `src/lib/megastructure/hardpoints.ts`.

## The rule on gods

Each world's structure is built for the god the planet is named after, from Greek and Roman myth and cult: the god's
attributes, sacred animals, temples and stories, with the source for each. **No astrology:** no zodiac, no planetary
"influences" or rulerships, no correspondences between planets and metals, days, temperaments or anything else. A
planet carries its god's name because the Romans named it so; that is the only link used here.

Greek and Roman gods are not the same god under two names. Where the Roman cult differs from the Greek myth (Mars from
Ares above all), both are given and the structure says which it draws on.

## How every structure is built (one model for all seven)

- A structure is one or more **shells** round the planet, between an inner and an outer radius just above the air.
  The air's top is at 1.06 R on the rocky worlds and 1.035 R on the giants (`atmosphere.ts` on `claude/atmo-flight-e13c2e`),
  so the lowest plate is clear of it everywhere and atmo-flight's terrain and sky are untouched underneath.
- Each shell is a grid of **plates**: rings of equal angular height, each ring cut into near-square cells. A god's
  **mask** says which cells carry a plate and of what kind (plain, raised, trench, lit). The mask draws the god's
  shape: a shield, a shell, talons, a sickle. The rest is open, so the planet shows through.
- The **same mask** draws the plates and answers "is there plate here?" for collision, so what you see is exactly
  what you hit.
- The structure is fixed to the planet's centre in the planet's tilted frame and **does not turn** with the planet's
  display spin. Hardpoints therefore have one fixed world position each; nothing needs a pose over time.
- Each shell is an axis (the **pole** it is built round) and a reference direction. Shield-like shapes face the inner
  system (the way a ship from Earth arrives); belt and talon shapes use the planet's own spin axis.
- **Coverage** is the fraction of the sphere's area under plate, measured from the mask (`armour.test.ts`).

## The seven

Radii are in planet radii (R). Altitude is the plating's inner radius minus 1. Ship lengths (SL) are the player's
cruiser: 0.371 scene units. Coverage is measured, not estimated (`npx vitest run --dir src`, `armour.test.ts`).

| World | God | Structure | Shell (R) | Plating thickness | Coverage | Built round |
|---|---|---|---|---|---|---|
| Earth | Gaia / Terra (Tellus) | The Vault of Gaia | 1.118–1.13 | 12 SL | 66% | spin axis |
| Moon | Selene / Luna | Selene's Veil | 1.18–1.20 | 5 SL | 37% | facing Earth |
| Mercury | Hermes / Mercury | The Kerykeion | 1.17–1.19 | 8 SL | 35% | spin axis |
| Venus | Aphrodite / Venus | The Shell of Aphrodite | 1.118–1.13 | 11 SL | 41% | facing Earth |
| Mars | Ares / Mars | The Ancile | 1.125–1.14 | 8 SL | 37% | facing Earth |
| Jupiter | Zeus / Jupiter | The Talons of Zeus | 1.068–1.08 | 131 SL | 41% | spin axis |
| Saturn | Kronos / Saturn | The Harpe | 1.068–1.08 | 109 SL | 33% | spin axis, under the rings |

"Facing Earth" means the shape is centred on the side that faces Earth, the way a ship from home arrives. A third of a
sphere's area is most of the face you see from one side: the Ancile and the Shell fill most of the visible disc.

### Earth: Gaia (Roman Terra Mater, Tellus) — *The Vault of Gaia*

- **Who she is.** Earth herself, the first to come into being after Chaos (Hesiod, *Theogony* 116–118), "mother of
  all", who feeds everything on land and sea (*Homeric Hymn* 30, *To Earth the Mother of All*). Rome worshipped her as
  Tellus, with a temple on the Esquiline (Livy 2.41.11) and the Sementivae sowing feast she shared with Ceres (Ovid,
  *Fasti* 1.657–704). On the Ara Pacis Augustae (13–9 BC) a seated mother with two infants, fruit in her lap, cattle and
  sheep at her feet is usually read as Tellus.
- **Iconography used.** Hesiod says Gaia "first bore starry Ouranos, equal to herself, to cover her on every side"
  (*Theogony* 126–127). That is the armour: a vault the size of the sky, all the way round. Fruit and grain (the Ara
  Pacis lap, the Sementivae) go on as terraced garden plates; the cornucopia's spiral shapes the berths.
- **Form.** A lattice shell over the **whole globe**: a net of struts with large open windows between them, so Earth's
  blue shows through every cell. Three broad solid belts (the "equal to herself" vault) cross the poles at 60° to each
  other. Garden terraces (green-gold plates) fill some windows. Earth's art direction: brushed brass and gunmetal with
  blue window bands.

### Moon: Selene (Roman Luna) — *Selene's Veil*

- **Who she is.** Daughter of Hyperion and Theia, sister of Helios and Eos (Hesiod, *Theogony* 371–374). She drives
  her chariot across the night with long-maned horses, a golden crown shining from her head, after bathing in Ocean
  (*Homeric Hymn* 32). Her love Endymion sleeps forever on Latmos (Apollonius, *Argonautica* 4.57–58). Rome had a
  temple of Luna on the Aventine (Livy 40.2.2; Tacitus, *Annals* 15.41).
- **Iconography used.** The **crescent** she wears, and the **veil** that billows in an arch over her head as she
  comes down to Endymion on Roman sarcophagi (for example the Selene and Endymion sarcophagus, Metropolitan Museum of
  Art 47.100.4, about AD 200–220). The billowing arch is called *velificatio*.
- **Form.** A crescent of plating over the Earthward face, its horns reaching round the limb, and a thinner arched band
  (the veil) sweeping over the pole above it, with a wavy hem. The Moon nation's art direction is Delphi: white marble
  and silver, colonnades, open frames, so the crescent's outer edge is a colonnade of white piers.

### Mercury: Hermes (Roman Mercurius) — *The Kerykeion*

- **Who he is.** Messenger of the gods, guide and god of traders and travellers. Apollo gives him the golden
  three-leafed staff (*Homeric Hymn* 4, *To Hermes*, 529–532); his golden sandals carry him over sea and land (*Odyssey*
  5.44–46). Rome dedicated a temple to Mercury by the Circus Maximus in 495 BC and gave the merchants' guild to it
  (Livy 2.21.7, 2.27.5); Roman statues give him a purse.
- **Iconography used.** The **kerykeion** (Latin *caduceus*), the herald's staff topped with two snakes, as on Attic
  vases; the **wings** of his sandals and hat; the **purse** of trade.
- **Form.** A straight meridian band from pole to pole (the staff), with two counter-wound helical bands (the snakes)
  coiling round the planet across it, crossing four times. A fan of feather plates spreads at the north pole (the
  wings). Markets sit where the snakes cross. Mercury's art direction is Spartan: dark bronze shields with gold rims,
  so the bands are built of overlapping round shield plates. **Flagged to Caleb** below.

### Venus: Aphrodite (Roman Venus) — *The Shell of Aphrodite*

- **Who she is.** Born from the sea foam off Cythera and come ashore on Cyprus (Hesiod, *Theogony* 188–200); dressed and
  crowned by the Horai on landing (*Homeric Hymn* 6). Her birds are doves, her plants myrtle and roses. Rome honoured
  her as Venus Genetrix, mother of the Julian line, with Caesar's temple in his forum (dedicated 46 BC).
- **Iconography used.** Aphrodite rising from the sea (*Anadyomene*) and **Venus in the shell**, as in the fresco of
  the House of Venus in the Shell at Pompeii (II.3.3). The shell is ancient, not Botticelli's.
- **Form.** A scallop shell over the Earthward hemisphere: fluted ribs fanning from a hinge, a scalloped rim, the open
  shell cupping the planet's cloud deck like a pearl. A ring of small dove-wing plates around the hinge. Venus's art
  direction is the Byzantine court: gold leaf and green glass. The ribs are gold, the gaps between them green glass.

### Mars: Ares (Roman Mars) — *The Ancile*

- **Who he is.** Ares is war's violence, "bane of mortals" (*Iliad* 5.31), with his sons Phobos and Deimos, Fear and
  Rout (*Iliad* 4.440, 15.119; Hesiod, *Theogony* 933–936), the names of Mars's two moons. The Roman Mars is graver: a
  father of Rome through Romulus, Mars Ultor with his temple in the Forum of Augustus (2 BC). His **ancile**, the shield
  that fell from the sky under Numa, was copied eleven times so it could not be stolen, and the Salii carried all
  twelve in procession (Ovid, *Fasti* 3.259–392; Plutarch, *Numa* 13). His spears were kept in the Regia (Aulus
  Gellius 4.6.2).
- **Iconography used.** The **ancile**, a figure-eight shield with a waist, and the **hasta**, the spear.
- **Form.** A huge figure-eight shield over the Earthward face, made of dagger-wedge plates laid in chevrons and cut by
  long trenches, with a spear band running pole to pole behind it. The twelve anciles become twelve shield-emitter
  bosses. Mars's art direction is galactic-empire style: cold grey faceted planes, trenches, sparing red. The god's
  shield and spear fit inside that look; nothing is rounded except the shield's two lobes.

### Jupiter: Zeus (Roman Iuppiter) — *The Talons of Zeus*

- **Who he is.** King of gods and men. The Cyclopes gave him the thunderbolt (Hesiod, *Theogony* 139–141, 501–506);
  the eagle is the bird dearest to him (*Iliad* 24.310–316); his oak spoke at Dodona (*Odyssey* 14.327–328). Rome's
  greatest temple was Jupiter Optimus Maximus on the Capitol, dedicated in 509 BC (Livy 2.8.6–8), and the eagle
  (*aquila*) was the legion's standard.
- **Iconography used.** The **eagle's talons** and the **thunderbolt**.
- **Form.** Four great curved talons reach down from a spiked crown at the north pole, past the equator, gripping the
  planet. A zigzag channel of light, the thunderbolt, runs down each talon. Jupiter's art direction is clawed
  violet-empire style: near-black purple plate, magenta seams, hooks and talons, nothing rounded, and its station was
  already "a spiked crown with four great upswept prongs". The eagle's talons are that crown's prongs grown down over
  the planet, so the god and the look agree.

### Saturn: Kronos (Roman Saturnus) — *The Harpe*

- **Who he is.** Kronos took the adamant sickle (*harpe*) his mother Gaia made and cut down Ouranos (Hesiod,
  *Theogony* 160–182); his reign was the golden age (*Works and Days* 109–126). Roman Saturn was a god of sowing; his
  temple in the Forum held the state treasury, the *aerarium* (Macrobius, *Saturnalia* 1.8.3), and his statue's feet
  were bound in wool, loosed at the Saturnalia (Macrobius, *Saturnalia* 1.8.5).
- **Iconography used.** The **sickle**, and the **treasury**.
- **Form.** A belt round the equator, under the rings (the rings start at 1.24 R; the belt is at 1.06–1.08 R), with
  sickle blades curving up from it toward both poles like a crown of hooks. The treasury, a market vault, sits on the
  belt. Saturn's art direction is Athens and the trireme: matte black and indigo, spare and tensioned, amber running
  lights. The blades are long and thin like oar-banks.

## Flagged to Caleb (not chosen alone)

1. **Mercury's nation is Spartan, its god is Hermes.** The art direction made Mercury's people hoplites (bronze round
   shields). Hermes is a messenger and trader, not a warrior. I built the kerykeion out of bronze shield plates so both
   show. The alternative is lighter Hermes-only plating (gold, wings) that drops the Spartan look on the station.
2. **Saturn's markings are an owl eye**, which is Athena's bird, not Kronos's. The armour doesn't use the eye; the
   ships still do.
3. **The Moon's art direction is Delphi**, which is Apollo's sanctuary, Selene's brother-in-law at most. The colonnade
   piers keep the look; the crescent and veil carry the god.
4. **Mars and Jupiter**: no clash found. The figure-eight ancile on a grey wedge-plated body and Zeus's talons as the
   violet crown's prongs both sit inside the looks Caleb confirmed.

## Berths, hardpoints and sections

- **Berths** are docking cradles on the outer face. Each has an **approach point** 12 SL straight out from the plate.
  The autopilot flies to the approach point (routes keep 2 SL above the plating), parks within 2 SL of it, then a short
  docking run takes the ship down the berth's normal into the cradle. L docks by hand from within 14 SL of the
  approach point. A capital ship is moored alongside each berth. The berth ids are the old station ids
  (`stn-earth-1` …), so saves, the station screen and the stations thread keep working.
- **Batteries**: every gate (each berth's approach point, and each hangar's launch point 200 units out) has its own
  6 turrets and 4 point-defence mounts within 400 units that can see it (in front of their own plating, not behind
  the planet). The rest of the guns spread over the long faces. Asked for by the stations thread, which measured that
  evenly spread guns left Jupiter's hangars with none in reach.
- **Hardpoints**: every mount point, typed (`turret`, `pointDefence`, `shieldEmitter`, `minelayer`, `hangar`, `berth`,
  `mooring`, `drydock`, `market`, `temple`, `reactor`, `sensor`), with a world position, an outward normal, a size in
  ship lengths and a section. All on plated cells.
- **Sections**: each structure is cut into sections by angle round its pole, so conquest can take it a section at a
  time; `sectionAt` says which section a point on the armour belongs to.

## Measured

From the tests and the in-app browser on 2026-10-19 (details and caveats in THREAD-LOG.md; frames in `shots/armour/`):

- Coverage as in the table; 5,655 (Mercury) to 27,038 (Earth) plates on High, a quarter of that on Battery saver.
- Mounts per world: 133–165 (Mars 157 with its twelve ancile bosses; Jupiter 165).
- Autopilot docking on all seven worlds and at every other berth from both sides: all docked, 0 armour hits, closest
  pass 14.7 ship lengths over the plating. Hand docking with L: docked, 0 hits. Ramming at full throttle: stopped on the
  plate top on all seven. Grand tour: 0 hits. Save and reload while docked: lands docked.
- Up close the armour adds 70–100k triangles and 8–16 draw calls a frame (plates split into direction chunks and
  culled at the planet's horizon). Times from a hidden pane are noisy; no phone measured.

# The destroyer

> Branch `claude/destroyer-a8ff7d`, cut from `claude/integration-5d7cd1`, 2026-10-19. Design first, then what was
> built and what was measured. Numbers are a first pass, to be tuned by play.

## What Caleb asked for

> "a destroyer. It will be between the size of a capital and a cruiser. And will be faster, more maneuverable, and
> lighter than a capital ship, obviously with slightly less firepower, but it will be larger than a cruiser. Faster
> than a cruiser and more agile than a cruiser, as well as having superior firepower. The only area a cruiser
> outclasses a destroyer is in how many fighters and drones it can hold, as cruisers carry more smaller ships, whereas
> destroyers cut down on smaller ships for more guns, speed, and agility."

Every relation in that is a unit test (`src/lib/destroyer.test.ts`) that fails if a later edit to any ship's numbers
breaks it:

| Caleb's relation | Checked against | Test |
|---|---|---|
| larger than a cruiser, smaller than a capital | size, hit radius, the size ladder | `is larger than a cruiser and smaller than a capital ship` |
| lighter than a capital | mass; and hit points, every race | `is lighter than a capital ship`, `every race’s destroyer loadout …` |
| faster than both | top speed and acceleration in fleet-command's and enemy-ai's tables; patrol speed | `is faster than both …` |
| more agile than both | turn rate in both tables; missile dodge | `is more agile than both …` |
| more firepower than a cruiser, slightly less than a capital | hull guns (dps), weapon slots, every race's loadout dps (≥ 70% of its capital's) | `out-guns the cruiser …`, `every race’s destroyer loadout …` |
| fewer small craft than a cruiser | hangar slots and per-craft capacity | `carries fewer small craft than a cruiser …` |

The flight trial and enemy-ai and fleet-command glue carry the same relations in their own tests (below).

## The numbers

**Size: 2.2 player-ship lengths.** Between the cruiser (1) and the capital ship (5), at their geometric mean
(√5 = 2.24, rounded down): each step up the ladder is the same ×2.2–2.3 in length, so by volume the destroyer is about
eleven cruisers and the capital ship about eleven destroyers. A linear midpoint (3) would have made it look like a small
capital ship next to a big one; 2.2 reads as its own class next to both.

`src/lib/shipTypes.ts`, the destroyer row (last in `SHIP_TYPES`, so code and tests that index the first three keep
working):

| | Capital | **Destroyer** | Cruiser | Fighter |
|---|---:|---:|---:|---:|
| size (L) | 5 | **2.2** | 1 | 0.2 |
| hp (hull) | 900 | **300** | 100 | 36 |
| hit radius (L) | 3 | **2.3** | 1.9 | 1 |
| patrol speed | 0 | **1.25** | 1 | 1.6 |
| patrol ring | 1 | **1.22** | 1.45 | 0.55 |
| dodge | 0.03 | **0.38** | 0.35 | 0.6 |

`src/lib/destroyer.ts` `HULL` (fleet-command's units: L/s, rad/s); capital, cruiser and fighter are copied from
fleet-command's `COMBAT` as stand-ins:

| | Capital | **Destroyer** | Cruiser | Fighter |
|---|---:|---:|---:|---:|
| top speed (L/s) | 12 | **44** | 36 | 60 |
| acceleration (L/s²) | 6 | **34** | 30 | 80 |
| turn (rad/s) | 0.3 | **1.55** | 1.3 | 2.6 |
| mass (cruisers) | 150 | **8** | 1 | 0.01 |
| guns × rate × damage | 4 × 1.2 × 14 | **3 × 1.8 × 11** | 1 × 2.5 × 10 | 1 × 3 × 5 |
| firepower (dps) | 67.2 | **59.4 (88%)** | 25 | 15 |
| gun arc | turrets | **turrets** | 0.2 rad nose | 0.25 rad nose |
| range (L) | 160 | **120** | 100 | 60 |
| command points | 10 | **5** | 3 | 1 |

Enemy-ai's own table (`CLASS`, world units) gets a destroyer row too: speed 46 (capital 16, cruiser 38), accel 20
(5, 16), turn 1.1 (0.3, 0.9), four weapon slots weighted to rails, beams and plasma with no torpedoes. Rolled over every
nation and 40 seeds its guns average **215 dps against the capital ship's 218 and the cruiser's 181**.

**Weapon mounts:** three turrets (two dorsal, one forward or ventral, depending on the nation's model), all-round arcs.

### Hangars: the one thing the cruiser wins

`src/lib/hangars.ts`, and `destroyer-hangars.md` in the manager's notes folder for the other threads. One slot holds a
fighter; a drone takes a quarter, a drill boarder or a dropship two. (A dropship is a one-squad lander nobody has built;
infantry-carrier's carrier is a 2 L ship of its own with no hangar and is never carried in a bay.)

| Hull | Slots | Fighters | Drones | Boarders / dropships |
|---|---:|---:|---:|---:|
| Capital | 12 | 12 (fleet-command's Captain flies 8) | 48 | 6 |
| Cruiser | 4 | 4 (progression's bay at level 8) | 16 | 2 |
| **Destroyer** | **2** | **2** | **8** | **1** |
| Fighter | 0 | – | – | – |

Fleet-command's bays and progression's bay are kept as they are: nothing changes for them.

### A loadout per race (progression's catalogue style)

Slots: 3 weapons, 1 defence, 1 support (cruiser 2/1/1, capital 4/2/2); level-1 tier 2.

| Race | Destroyer (class name) | Weapons | Defence | Support | dps | of its capital's |
|---|---|---|---|---|---:|---:|
| Humans | *Harrier* | pulse, pulse, seeker | deflector | targeting computer | 243 | 88% |
| Selenitai | *Theoris* | pulse, pulse, plasma | deflector | attack drone | 244 | 76% |
| Hemerodromoi | *Dory* | flak, flak, pulse | bi-facet | flares | 234 | 88% |
| Nephelai | *Chelandion* | flak, pulse, swarm | capacitor | chaff | 201 | 76% |
| Quirites | *Liburna* | rail, flak, seeker | armour | targeting computer | 192 | 82% |
| Diadochoi | *Hemiolia* | rail, plasma, seeker | deflector | targeting computer | 181 | 77% |
| Autochthones | *Pentekontor* | rail, seeker, pulse | deflector | jammer | 201 | 77% |

Every one is above its race's cruiser. Hit points with the fit: 340 (Mars) to 400 (Earth, Moon, Jupiter, Saturn); their
capital ships carry 1,040–1,100. Kill rewards: 90 xp, 55 credits (cruiser 40/25, capital 200/120).

**Class names** are proposals, each a fast warship of the culture the race is drawn on (LORE.md has none yet):
*Theoris* (the sacred envoy ship a Greek city sent to Delphi), *Dory* (the hoplite's spear, carried ahead of the
shield), *Chelandion* (the Byzantine fast galley), *Liburna* (the light Roman warship), *Hemiolia* (the fast
Hellenistic warship of kings and pirates), *Pentekontor* (the fifty-oared ship before the trireme), and *Harrier* for
Earth's navy. They are in `DESTROYER_NAME`, read by progression's `refs.ts` and shown on the start screen.

### Enemy destroyers in the force tables

`FORCE` is now **1 capital, 1 destroyer, 2 cruisers, 4 fighters**: every nation fields one destroyer, so a force is
8 ships, not 7. **This changes force sizes (a proposal for Caleb):** 49 enemy ships become 56. The alternative, if he
wants the count held, is to trade one of the two cruisers for the destroyer. The tests that pinned 7 now pin 8.

### How the player gets one (proposal)

A rank between the cruiser and the capital ship, in fleet-command's ladder: **Commander, level 9 and a destroyer**
(bought at a shipyard or handed over by a mission). It flies a destroyer with a two-fighter bay (fewer than the
cruiser's four at level 8: the trade for guns and speed), a cap of 6 command points and two wings. Level 9 in
progression's table currently opens nothing, so the step fits: Pilot (1) → Flight lead (2) → Squadron leader (8) →
**Commander (9, destroyer)** → Captain (10, capital ship). The rank is in the fleet-command patch; progression's level
table is not touched.

### Models per nation

`src/components/space/destroyers.ts`, after ART-DIRECTION.md (`claude/art-direction-e63aed`): each nation's
silhouette, hull language and colours at destroyer proportions (longer and leaner than the cruiser, three turrets, a
short fast engine bank, no hangar deck). Merged by material, so each costs a handful of draw calls.

| Nation | Silhouette |
|---|---|
| Earth | the navy's lathed brass cigar, banded, swept wings, twin blue engines |
| Moon | a short open colonnade on a needle keel, a mirror lamp ring at the bow, a silver ring engine |
| Mercury | an oval bronze heat shield with a gold rim and chevron, the hull behind it, a spear-gun run out ahead |
| Venus | a long gold teardrop, two green-glass domes, X fins with enamel icon panels |
| Mars | the grey imperial dagger-wedge, narrow, stepped decks, bridge bar, one thin red stripe each side, a flat bank of square ice-white nozzles |
| Jupiter | a faceted violet spine with two short claws at the bow, raked crest blades, magenta seams, the crown sigil |
| Saturn | a long black spine with two banks of oar-fins, fuel tanks, a painted eye, amber running lights |

`shots/destroyer-seven-nations.png` shows all seven side by side in the game's scene;
`shots/destroyer-ladder-mars.jpg` the Mars capital ship, destroyer, cruiser and fighter.

## What was built, where

| Piece | Where |
|---|---|
| Ship-type row, `FORCE` | `src/lib/shipTypes.ts` |
| Flight, guns, mass, enemy-ai copy, command points, names | `src/lib/destroyer.ts` |
| Hangars | `src/lib/hangars.ts` |
| Caleb's relations as tests | `src/lib/destroyer.test.ts` |
| Loadouts, slots, tier, rewards, names | `src/lib/progression/{catalog,economy,refs}.ts` |
| Flight step and the fast-hunter brain (run, circle out of the prey's nose, break off) | `src/lib/hunter.ts`, tested in `hunter.test.ts` |
| Models | `src/components/space/destroyers.ts`, wired in `space/fleet.ts` |
| In the scene | nation patrols carry their destroyer (`combat.ts` builds every type in `FORCE`) |
| Proving range (dev only) | `src/components/duel.ts`, on `window.__voyage.duel` |
| Balance simulator rows and bands | `src/lib/balance/report.ts`; output `integration/balance-destroyer.md` |
| Enemy-ai glue | `integration/destroyer/enemy-ai.patch` (against `claude/enemy-ai-dbbee0` d6c5c91) |
| Fleet-command glue | `integration/destroyer/fleet-command.patch` (against `claude/fleet-command-885c0e` 6a0ed07) |

### Enemy-ai and fleet-command: patches, not merges

The shared rules say read those branches and don't merge them, and integration has neither yet. So the glue is two
patches, each made and tested on a scratch checkout of that branch's tip:

- **enemy-ai.patch**: `destroyer` in `ShipClass` and `CLASS`, its weapon wants, a `turret` arc, a `hunt` role in the
  fleet plan (no slot: it hunts on its own), and a destroyer branch in `warshipThink`: run in flat out, then circle the
  player at speed, turning away from the player's nose. Knobs `minStandoff.destroyer`, `huntOrbit`, `huntSpeed`.
  The stand-in roster gets one destroyer. **162 of 162 tests pass** on that branch with it, including three new ones:
  the hunter stays within 1.3 × its standoff, never rams, and sits in the player's nose cone under 15% of the time;
  it out-runs and out-turns both classes; its rolled guns land between the cruiser's and the capital's.
- **fleet-command.patch** (only `lib/fleet` and `components/fleet`): the destroyer's `COMBAT` row and preferences,
  5 command points, the Commander rank, `destroyer: 0` in every bay, a "Destroyers" wing name, the hunter in the
  brain, and a dart glyph in the tactical view. **All 24 fleet tests pass**, four of them new: destroyers out-run and
  out-gun cruisers there too; an attack order sends a destroyer wing after the named ship past a nearer decoy and kills
  it inside 30 s; one destroyer beats one cruiser in at least 5 of 6 fleet-brain duels; the Commander rank.
  Checked with the destroyer row stubbed into that branch's `shipTypes.ts` and progression files; the stubs are not in
  the patch (four of that branch's own count tests fail under the stubs, the same four this branch updates).

Apply each after its branch is merged into integration (`git apply integration/destroyer/<name>.patch`), then delete
enemy-ai's stand-in copy in `lib/destroyer.ts` (`ENEMY_AI_CLASS`) and fleet-command's (`HULL` capital, cruiser and
fighter rows; `COMMAND_POINTS`) in favour of imports.

## Measured

### Balance simulator (`npm run balance`, seed 1, 400 fights a row)

The simulator is abstract: hit rates from the engagement model, hit points from the type table, no speed or agility.
"3 turrets" uses `CAPITAL_TURRETS` (capital 4, destroyer 3, everything else 1).

| Fight | Destroyer wins (3 turrets) | (one mount each) |
|---|---:|---:|
| destroyer vs cruiser | **100%**, 0.6 s | 100%, 2.0 s |
| destroyer vs 2 cruisers | **100%**, 1.4 s | 4% |
| destroyer vs 3 cruisers | **63%** (31% lose, 6% both die) | 0% |
| destroyer vs capital | **0%** (capital 100%) | 0% |
| 2 destroyers vs capital | 16% (capital 70%) | 100% |
| destroyer vs 4 fighters | 10% (fighters 87%) | 0% |
| destroyer vs destroyer | 33% / 39% / 28% both die (mirror in band) | 49% / 45% |

Bands added, both met: a destroyer beats a cruiser at least 80% of the time, and a capital ship at most 35%. No
destroyer flags; the nine flags in the run are the ones integration already had (fighter loadouts, escorts). Against
the player (0.5° aim): a bare destroyer hull dies to the laser in 4.9 s, inside the 4–20 s band added for it (a
cruiser's band is 1.5–6 s, a capital ship's 10–45 s); with each race's fit, 5.8–6.8 s by laser and 11–19 s by missile.

### In the game (`window.__voyage` on port 5393, in-app browser)

**Sizes,** measured off the meshes in the scene (`duel.sizes()`): capital 1.854 units = **5.0 L**, destroyer
0.8158 = **2.2 L**, cruiser 0.3708 = **1.0 L**, fighter 0.0742 = 0.2 L. Destroyer : cruiser **2.2**; capital : destroyer
**2.27**.

**Flight trials** (`duel.trial`, one ship from rest flat out, then a half turn, frame by frame at 30 fps):

| | Top speed (L/s) | Half turn (s) | Turn rate (rad/s) |
|---|---:|---:|---:|
| Capital | 12 | 10.33 | 0.30 |
| **Destroyer** | **44** | **2.00** | **1.55** |
| Cruiser | 36 | 2.40 | 1.30 |

**Destroyer against cruiser** (`duel.start`, each on `lib/hunter.ts` with its `HULL` guns, the race's hit points with
its fit, 1σ 0.02 rad aim error, starting 1.6 × the destroyer's range apart):

| Seed | Destroyer | Cruiser | Result |
|---|---|---|---|
| 1, 2, 3 | Mars *Liburna* 340 hp | Jupiter *Sarissa* 200 hp | destroyer wins in 7.4, 7.2, 9.0 s, ending on 320 hp; it hit 19 of 29–38 shots, the cruiser 2 of 3 |
| 1, 2, 3 | Jupiter, Moon, Mercury | Mars cruiser 140 hp | destroyer wins in 4.3, 5.5, 7.0 s, losing 20 hp; 13 hits of 14–28 shots, the cruiser 2 of 3 |

The cruiser fires only 3 shots in a fight: the destroyer circles it out of its 0.2 rad nose cone faster than it can
turn. Controls on the same range: cruiser against cruiser runs 120 s without a kill (both 10–11 hits of 12), and
**destroyer against capital ship loses every time** (Mars or Jupiter, three seeds: dead in 9.6–10.9 s, the capital on
61–74% of its hit points), except once when it broke off at 20% and got away. So it hunts cruisers and runs from
capital ships, as described.

**Enemy destroyers in the force:** every nation's patrol carries one (`combat.crafts`): Earth 400 hp, Moon 400,
Mercury 370, Venus 360, Mars 340, Jupiter 400, Saturn 400, each 0.653 units hit radius. Mars's force read in flight at
Mars: capital 1,040 hp, destroyer 340, cruisers 140 and 140, fighters 76 × 4.

Screenshots: `shots/destroyer-seven-nations.png`, `shots/destroyer-ladder-mars.jpg`, `shots/destroyer-duel-in-scene.jpg`
and `shots/destroyer-duel-zoom.png` (the duel in the live scene beside the player: at game scale the ships are small
specks at 9 units).

## Not done, not verified

- **No in-flight close-up of a patrolling enemy destroyer.** The pane was backgrounded (frames advance only on
  `run()`), the orbit camera turns between frames, and renders from a second camera far from the player came back
  black. The Mars force was read from the game's own data instead, and the models were shot in the scene beside the
  player.
- **Enemy-ai and fleet-command glue not seen in a browser**: tested by their own unit tests only, on scratch checkouts.
- **The duel's cruiser brain is plain** (point and shoot, close to 60% range): it is the stand-in until enemy-ai's
  warship brain flies cruisers in the same scene. The destroyer's advantage over a cruiser may shrink against
  enemy-ai's cruiser, which backs off to hold its standoff.
- **Not felt.** Whether a 44 L/s, 1.55 rad/s destroyer feels right to fight is Caleb's call.
- **Hangars are a table, not a mechanic,** until the boarder, dropship and swarm threads launch craft.

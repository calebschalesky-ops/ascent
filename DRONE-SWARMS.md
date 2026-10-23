# Drone swarms

> Thread drone-swarm, branch `claude/drone-swarm-8429b1`, cut from integration 8caa0a9, 2026-10-19.
> Caleb: "drones, which will be able to be unleashed from cruisers and capital ships in swarms and act kind of like bees
> or bird flocks working together depending on their function. There will be explosive drones that suicide into things.
> There will be shielding drones, and there will be drones that concentrate laser fire."

Code: `src/lib/swarm/` (pure, 19 tests) and `src/components/swarms.ts` (the scene). Every number is a first pass, to be
tuned by play.

## 1. What a swarm is

A **swarm** is up to a few hundred drones of **one role**, carried in one ship's hangar, launched together and given
orders together. Three roles:

| Role | Id | What it does | Its counter |
|---|---|---|---|
| Explosive | `explosive` (new) | Hunts as a pack, encircles the target out of its guns' reach, then every drone dives in at once and bursts on the hull (30 damage over 2.5 L each) | Point defence and flak, and a shield screen |
| Shield | `shield` (new) | Forms a closed **bubble** round its ward, or, when too few to close one, a **wall** between the ward and the threat. Each drone's field (2 L) stops bolts, missiles, beams and explosive drones; the drone takes the damage | Concentrated laser fire burns through it; explosive drones trade one for one |
| Laser focus | `attack` (arsenal's attack drone) | Rings up at 60% of its beam range (97 L, outside point-defence range) square to the line of fire, and lays every beam on **one point** of the hull. Converged beams burn harder: up to +50% once 12 meet | Flak (60 L) cannot reach the ring; a hostile shield wall soaks the beams |

**Arsenal's drones.** Arsenal's single drones stay as they are: support modules fitted in a slot, orbiting the ship
(`lib/tech.ts`). The swarm's laser-focus member *is* arsenal's attack drone, with the same id (`attack`), the same gun
(6 damage at 1.2 a second = 7.2 per second) and the same range (60 units = 162 L), flying in a flock and firing as a
beam. Arsenal's point-defence drone's range and rate are the swarm's point-defence numbers. Nothing is duplicated:
the stand-ins in `lib/swarm/refs.ts` are copies with their source commit, to be swapped for imports on merge.

**Sizes.** A drone is 0.1 L (half a fighter, no cockpit), so the hangar table (`destroyer-hangars.md`) puts four in a
slot: a **cruiser carries 16, a capital 48**, a destroyer 8. The player's cruiser racks 6 explosive, 5 shield and 5
laser drones (`PLAYER_RACK`); a hostile capital 16 shield and 32 explosive; a hostile cruiser 16 laser.

## 2. What the flocking is built on

| Source | What it says | What the swarm takes |
|---|---|---|
| Reynolds, "Flocks, herds and schools: a distributed behavioral model", SIGGRAPH 1987 | Three local rules (separation, alignment, cohesion) give a flock with no leader | The core step in `flock()`; a fourth term seeks each member's own goal |
| Reynolds, "Steering behaviors for autonomous characters", GDC 1999 | Seek, arrive, pursue with lead, steering as desired velocity minus current | Goal seeking with arrival; explosive drones lead a moving target |
| Ballerini et al., "Interaction ruling animal collective behavior depends on topological rather than metric distance", PNAS 2008 (starlings, StarFlag) | Each starling tracks its 6 to 7 nearest neighbours, whatever the distance; this keeps a flock cohesive when density changes | Each drone steers by its **7 nearest** (6 for shield drones), found in a spatial hash |
| Couzin et al., "Collective memory and spatial sorting in animal groups", J. Theor. Biol. 2002 | Zones of repulsion, orientation and attraction; changing their widths turns a swarm into a torus (milling) or a parallel group | Per-role weights: explosive drones loose (separation 3 L), shield drones tight and slot-bound, laser drones milling on a slowly turning ring |
| Vicsek et al., "Novel type of phase transition in a system of self-driven particles", PRL 1995 | Order parameter: the mean of the unit headings (polarisation) | The test measures it: 0.99 in transit |
| Muro et al., "Wolf-pack (*Canis lupus*) hunting strategies emerge from simple rules in computational simulations", Behavioural Processes 2011 | Two rules (close to a safe distance from the prey; move away from the other wolves) make a pack encircle its prey | **Explosive drones**: stalk on a sphere 85 L out (outside point defence and flak), spread to stations over the whole sphere, then strike from every side at once |
| Ono et al., "Unusual thermal defence by a honeybee against mass attack by hornets", Nature 1995 | Japanese honeybees mass round a hornet and raise its temperature past what it survives; no single bee could | **Laser focus**: many weak beams on one point, with a bonus for converging (`FOCUS_BONUS`) |
| Honeybee sting autotomy (the worker dies when she stings; a colony defends by sacrifice) | Defence by expendable members | Explosive drones are spent, not lost: the stats count them apart |
| Kastberger et al., "Social waves in giant honeybees repel hornets", PLoS ONE 2008 (*Apis dorsata* shimmering) | The surface layer of a nest moves as one sheet to turn a predator | **Shield drones**: a sheet of plates on a sphere or a disc that turns toward the threat at a limited rate |
| Seeley, *Honeybee Democracy* (2010); Beekman et al. 2006 on swarm guidance | A few informed bees ("streakers") steer a whole swarm in flight | Swarm-level goals (an order) steer everyone through a few goal points; the flock carries the rest |
| Reynolds, "Big fast crowds on PS3", 2006 (bin lattice) | Spatial bins make neighbour search linear in the number of agents | A 4,096-bucket spatial hash, rebuilt each step |

Citations are from memory (author, venue, year), not re-fetched in this session. Check them before anything public.

## 3. How a step works (`lib/swarm/swarm.ts`, `battle.ts`)

1. **Bay.** Members leave at 10 a second out of the back of the carrier. A recalled drone that reaches its carrier
   docks: back in the bay, repaired, ready to launch again. A carrier destroyed takes the drones still in its bay.
2. **Brain.** From the order, each flying member gets a goal point:
   - explosive, attack order: stations on a sphere round the target (greedy nearest assignment); members work round
     the sphere, never across it. When 75% are on the ring (or after 8 s), those on the ring become a **wave**: the
     farthest sets a time on target and the nearer ones slow so the wave lands together. Latecomers stalk and form
     the next wave, so a pack launched from a moving carrier does not trickle in to die.
   - shield: a Fibonacci-lattice bubble at the ward's radius + 2.5 L when the fields cover ≥ 90% of it, else a sunflower
     disc on the threat side. The threat is the nearest hostile drone, else the nearest hostile ship.
   - laser, attack order: a ring at the standoff, square to the line to the target, turning slowly; every beam ends on
     one aim point, on the hull facing the ring.
   - escorts (defend, follow): a loose shell round the ward; explosive drones dive on hostile drones inside 80 L; laser
     drones burn the nearest hostile drone in range.
3. **Flock.** Separation, alignment, cohesion and goal over the 7 nearest, a per-member weave so the swarm shimmers,
   acceleration and speed limits **relative to the frame** (the ward's or target's velocity), so a bubble keeps up with
   a ship at 400 L/s. The goal error is taken from where the member will be after the step, so slots on a moving ward
   are met, not overrun by a frame. A diving drone stops flocking and homes straight in.
4. **Battle.** Explosive contact is **swept** over the step (at 30 frames a second a diving drone covers more than a
   capital's radius per frame). Beams and shots crossing a hostile shield field hit the shield drone instead. Every
   armed ship fires point defence (50% hit, 10 damage, 67 L) and flak (30 over 6 L, armed beyond 12 L off its hull,
   out to 60 L, scattered with range) at the nearest hostile drone.
5. **Reform.** Slots go by rank among the living each step, so when members die the rest close up; a bubble that
   loses too many becomes a wall.

Members are flat typed arrays (Float64 positions: Float32 would round a drone's position by more than its length far
from the Sun).

## 4. Orders: fleet command and enemy AI

- **Fleet command.** A swarm takes fleet-command's `Order` union unchanged (`follow`, `hold`, `attack`, `defend`,
  `path`, `recall`; copy in `refs.ts`). `swarms.order(role, order)` is the call a command bar makes. Shield drones on an
  attack order screen their own carrier from the target. Until fleet-command merges, the player has keys: **7**
  explosive, **8** shield, **9** laser (a press launches at the locked or aimed ship, or to guard the player; a second
  press recalls), **0** recalls all. The HUD's weapon line shows racks that are out ("Shield 4/5 out").
- **Enemy AI.** A hostile carrier launches when the player comes within 160 L or its nation is hit (enemy-ai's
  `alertRange` and `provokeNation`), and recalls after 8 s beyond 600 L (`disengageRange`, `calmTime`). Its hangar
  follows enemy-ai's drone slots by class. Hostile capitals and cruisers carry point defence and flak (`DEFENCE`,
  standing in for enemy-ai's rolled fits).

## 5. Proofs

### Unit tests (`npx vitest run src/lib/swarm`, 19 tests)

| Test | Result |
|---|---|
| Transit, 48 explosive | polarisation 0.99, closest pair 0.57 L, spread 17.5 L |
| Pack of 16 vs an undefended cruiser | 16 blasts within 0.00 s of each other, 480 damage |
| 48 explosive vs a capital (4 PD + 2 flak) | undefended 48 hit, 1,440 damage; **as a pack 37 hit, 11 shot down** (PD 6, flak 5); **streaming in 0 hit, 48 shot down**; at 30 fps 37 hit; from a carrier crossing at 150 L/s 29 hit |
| 16-drone bubble round a cruiser | 98% of shots from all round stopped |
| 6 left after 10 killed | wall: 100% stopped from the threat side, 0% from behind |
| 16 explosive vs a cruiser in a 16-drone bubble | all 16 stopped at the field, 15 damage to the hull |
| 16 laser drones vs a capital | first beam at 2.6 s, 173 dps on one point (one drone: 7.2), 0 lost to its point defence |
| 16 laser vs a cruiser in a bubble | the shield drones burn first; damage gets through only as they fall |
| 552 drones in 12 swarms, full battle | 1.5 ms a step (maths only, Node) |

### In the game (`window.__voyage.swarms`, dev server on port 5321, integration's Moon and Mercury patrols)

| What | Numbers |
|---|---|
| **Laser focus**, player rack (5) on the Moon's capital | approach 2 s, then 5 beams, every end on one point (spread 0.000), ring 96.7 L off, **42.5 dps** (formula: 42.5), 0 drones lost though the capital fired point defence |
| **Explosive**, player rack (6) on a Moon cruiser (1 PD, 1 flak) | 2 lost to flak, 4 hit: hull 200 → 80 |
| **Thinned by PD and flak**, 48 explosive on a capital (4 PD + 2 flak) | **streaming in: 0 hit, all 48 shot down** (PD 34 of 83 shots, flak 14 in 20 bursts); **as a pack** (Mercury's capital): 2 waves, **33 hit for 990 damage**, 15 shot down (PD 7, flak 8) |
| **Shield, hostile**: 16 drones round the Moon's capital vs the player's laser | without: 11 of 18 bolts hit, 132 damage. With (a wall: 16 is too few to close a bubble round a capital): **0 of 18 reached the hull**, 14 stopped, 2 shield drones lost |
| **Shield, player**: 16 hostile laser + 16 explosive drones on the player, 14 s | no shield 1,813 damage; the 5-drone rack 1,404 (3 drones burnt); a 16-drone bubble **838**, re-forming from bubble to wall as 5 died |
| **Largest swarm on screen**: 576 drones (12 × 48) | 3 instanced meshes + 1 glow cloud + 1 line batch. Swarm simulation **2.4–3.2 ms** a frame, drawing **0.1–0.2 ms**, on both High (1.25×, bloom, 1240×660) and Battery saver (1×, no bloom, 992×528) |

Whole-frame times are **not trustworthy here**: the Browser pane was hidden the whole session (the session window was
not open), so frames were driven by hand (`__voyage.run`) with a 1-pixel `readPixels` to make the GPU finish. Paired
runs with and without the 576 drones gave Battery saver 12.8–22 ms without and 14–27.8 ms with (+1.2 to +6.4 ms); High
was too noisy to separate (−11 to +19 ms between pairs, 18–54 ms frames). The swarm's own cost above is stable.

Screenshots: `shots/swarm-576-shield-plates.jpg` (hex shield plates round the player with the drone glow beyond),
`shots/swarm-shield-bubble-moon.png` (the bubble against the Moon).

## 6. Not done, and why

- **Felt.** Whether any of it is fun, and whether 16 drones on a cruiser reads as a swarm, is Caleb's.
- **Frame rate on a visible pane and on a phone**: not measured (above).
- **Player hull**: integration's player has no hit points, so damage to the player is counted (`stats.playerDamage`)
  and nothing more. Arsenal and enemy-ai give the player a hull; on merge, route those events to it.
- **Hostile drones target only the player**, not the player's wingmen or Earth's patrols (their damage is not applied
  to Earth ships, so progression does not pay out for enemy kills).
- **Fleet-command's command bar and tactical view** are not on this branch; swarms take its orders through
  `swarms.order` and the keys. On merge: list each rack as a wing entry.
- **Models per nation**: drones are tinted with the nation's accent and shaped by role (dart, hex plate, arsenal's
  octahedron); no per-nation silhouettes. At 0.1 L they are a few pixels across at fighting range; the glow carries them.
- **Bay slots shared with fighters**: progression's bay opens 0 → 4 slots by level, for fighters. The rack here assumes
  the cruiser's 4 slots are all drones. Which one wins is the question for Caleb.

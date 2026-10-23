# Real scale: plan

Written 2026-10-20 against `claude/integration-3` at 5faede6 and `claude/mc-controls` at 0137a4a, before merge pass 3
finished. Code was read from git objects, not from the integration worktree, because the worktree was mid-merge.
Follows BRIEF-real-scale.md. Branch to cut: `claude/real-scale` from the finished `claude/integration-3`.

## 0. Two corrections to the brief's numbers

1. **A scene unit is not the cruiser.** SPEC.md "Scale" and `Voyage.tsx` `SHIP = 0.18`: the player cruiser is
   **0.3708 scene units** long. With the cruiser at 200 m, **1 scene unit = 0.5394 km**. Earth's radius today is 370
   units (998 ship lengths). That 998 is the brief's "about 998 units". The brief's numbers are in ship lengths, so
   in scene units:

   | | km | scene units | today | factor |
   |---|---|---|---|---|
   | Earth radius | 6,371 | 11,812 | 370 | 31.9 |
   | Earth–Sun (1 AU) | 1.496e8 | 2.774e8 | 83,250 | 3,332 |
   | Sun–Saturn (9.54 AU) | 1.427e9 | 2.645e9 | — | — |

   The sizes factor (31.9) matches the brief. The distances are about 2.7 times smaller than the brief's figures,
   because those figures count ship lengths. I keep the scene unit as it is, so ships, weapons, the camera rig, dust and
   every ship-scale number stay the same.
2. **The cosmos is geocentric today.** Earth sits at the origin. Each planet, and the Sun, sits on its own crystal
   ring around Earth (`bodies.ts` LAYOUT, `voyageScene.ts` "the seven rings"). The rings come in Ptolemaic order: Moon,
   Mercury, Venus, Sun, Mars, Jupiter, Saturn. True distances can't keep that order. Venus comes as close as 0.28 AU,
   Mars at opposition 0.52 AU, both nearer than the Sun. The brief asks for **true orbital radii**, and its Saturn
   figure is Saturn's distance *from the Sun*. So the planets go **heliocentric**: the Sun sits 1 AU from Earth at its
   LAYOUT angle (58°), and every planet orbits the Sun at its true semi-major axis.
   **Load-bearing assumption:** Caleb wants physical truth over the Ptolemaic rings. If he wants the rings kept, only
   the Moon and the Sun can be true, and step 3 changes. The rest of the plan doesn't change.

## 1. Where everything goes

- **Earth stays at the world origin.** The world origin no longer matters for precision (section 2), so this choice
  only keeps old code and saves simple.
- **Sun:** `onEcl(58°, 1 AU)`, as today's angle. **Planets:** at `sun + onEcl(L, a)` with true `a` (Mercury 0.387,
  Venus 0.723, Mars 1.524, Jupiter 5.203, Saturn 9.537 AU). `L` = today's LAYOUT angle, now read as a heliocentric
  longitude. The resulting distances from Earth: Venus 0.33 AU, Mercury 1.06, Mars 2.22, Jupiter 5.80, Saturn 8.77.
  Venus is near inferior conjunction, a nice sight from home. The Mars→Jupiter leg passes 1.18 AU from the Sun, so
  that detour is gone. That is fine: the detour tested the planner, and the planner's tests use their own layouts.
- **Moon:** `MOON_ROWS` Earth row, a = 384,400 km = 712,700 units (60 Earth radii), at its LAYOUT angle 300°.
- **Moons:** `moons.ts` `moonDistance` stops log-squeezing. Distance = `aKm / KM_PER_UNIT` from the planet's centre,
  in the direction it already computes. `moonSize` is already true-to-planet. `SPREAD` and `innerRadius` are deleted.
  Io lands at 6 R from Jupiter, inside Jupiter's orbit zone. `orbitBody` already picks the nearest surface, so that
  is fine. The `seenFromPark` major-moon test needs re-running and may move ids between major and minor. Any id that
  leaves `MAJOR_MOONS` stays a valid Dest via a sanitiser, so saves don't break.
- **Stars and the edge** are game constructs with no real value. Ratios are kept against Saturn: the stars waypoint
  sits at 1.15 × Saturn's orbit (11.0 AU from the Sun), and the edge is a sphere **centred on the Sun** at 1.3 × (12.4 AU).
  The card text says so.
- **The crystal shells** (water, air, fire) stay around Earth at 2, 3 and 4.5 Earth radii, as today. **The seven
  rings** become each body's true orbit line around the Sun (the Moon's around Earth). The translucent ring spheres
  are dropped: at real size each one would be a 2e9-unit sphere drawn every frame for nothing.
- **Zones:** `zoneOf(r)` becomes `zoneOf(pos, geo)`: the body whose region holds you (its orbit zone, then its well,
  section 4), else the nearest body's ring name. `SphereId` and `SPHERE_NAMES` are unchanged.

## 2. Precision: floating origin

Positions are already JS doubles everywhere (THREE.Vector3, V3). Three.js already composes `modelViewMatrix` on the
CPU in doubles. What breaks at 2.6e9 units, where a float32 step is 256 units, is anything that reaches the GPU as an
absolute world value:

| What | Where | At Saturn today it would be off by |
|---|---|---|
| `modelMatrix`, `cameraPosition`, `vWorld` | `fx/atmosphere.ts` 46–91, `fx/effects.ts` 60–70 | 256 units: the atmosphere shimmers |
| world-space uniforms: `uSun`, streaks `uCam` | `voyageScene.ts` 240, `fx/streaks.ts` 39/69, `planetAir.ts` 492 | 256 units |
| instance matrices written in world space | `fleet/fleetRuntime.ts` bolts, `fx/effects.ts` chunks, `swarms.ts` (3 meshes), `moonScene.ts` rocks | 256 units: bolts, debris and drones jump |
| Points written in world space | `swarms.ts`, `infantry.ts`, `moonScene.ts` point clouds | 256 units |
| big meshes whose vertices are far from their origin | orbit lines (r ≈ 2.6e9), the edge rim, the star field, Saturn's rings (2.45e5), armour merged per world (2.5e5 at Saturn) | lines 256; rings 0.016; armour 0.016, which is 9 px at 2 units range |

**The fix: a render origin, `src/components/space/origin.ts`.**
- `O` = the camera's absolute position, taken once per frame after the camera rig has moved and before any world
  uniform is written.
- `renderRebased(draw)`: set `scene.position = −O` and `camera.position −= O`, update the world matrices, run `draw()`
  (the composer, so post passes are covered), then restore both. After that, `scene.updateMatrixWorld()` runs once
  more, so raycasts (`Voyage.tsx`, one Raycaster) and the 14 `getWorldPosition` calls between frames read absolute
  matrices. **Cost to measure:** this second matrix walk. If it costs more than 0.3 ms, the fallback keeps the scene
  rebased between frames instead. The Raycaster then takes `ray.origin −= O`, and the 14 `getWorldPosition` sites get
  `+O`. Those sites are armourScene 2, conquest 1, duel 2, atmosphere 1, planetAir 7 and swarms 1.
- `worldUniform(vec3)`: a registry of uniforms that hold world positions. Updaters write the absolute value, and the
  rebase writes `abs − O` just before the draw. Registered: `u.uSun`, the streaks' `uCam`, and planetAir's sun
  direction source. The dust needs nothing: it uses only `mat3(viewMatrix)`, and its modulo already runs in doubles.
- `anchorInstances(mesh, A)`: an instanced mesh or point cloud gets `mesh.position = A` and has `−A` subtracted from
  each instance translation before it goes into the Float32Array. Moving things use `A = O`. Static ones use the owning
  body's centre: moon rocks and point clouds per planet. That covers 5 instanced sites and 3 point sites.
- **Orbit lines:** one coarse full loop per orbit (512 segments, origin at the orbit's centre) for the map-like view.
  Plus one **near arc**, rebuilt each frame on the CPU in doubles around the camera's closest point on the orbit,
  camera-relative, 64 vertices. That is 2 draw calls per orbit, 8 orbits.
- **Sky:** the star field and the edge's glow become camera-locked (a group whose position copies `O` each frame,
  drawn first, no depth write), at radius 1e6. They no longer sit at a real radius.
- **Armour tiles:** section 5.
- **Saturn's rings:** one RingGeometry split into 32 angular tiles, each with its origin at its own centre (32 draw
  calls, frustum-culled per tile, so 8 to 12 in view up close). Alternative if draw calls bite: one mesh, plus a
  near tile rebuilt around the camera, as with the orbit lines.
- **Depth:** the log depth buffer stays. Far plane = 2.2 × the edge's farthest point from Earth (about 8.3e9).
  Relative depth step ≈ ln(far)/2²⁴ ≈ 1.4e-6, so plating 2 units away resolves to 3e-6 units. No z-fighting
  change worth acting on.
- **Planet spheres need nothing.** Their geometry is scale-invariant: radius ×32, the collision floor ×32 (0.4 %·R),
  segments the same, so the view at the floor looks the same as today. Float32 error at Jupiter's floor is 0.01 units
  against 520 units of range, and at Earth 0.002 against 47.

**Proof (step 1):**
- A vitest, `origin.test.ts`, emulates the GPU path with `Math.fround` on the matrix and the vertex. For a hull
  vertex and a plate vertex 2 units from the camera, at 10 km (18.5 units) from a plate and at 1e9 units from the
  Sun, with the camera stepped by 1e-3 units for 100 frames, it asserts screen jitter **< 0.05 px at 1080p**. It also
  asserts that the old absolute path fails the same check, so the test proves it can see the bug.
- In the browser: `window.__voyage.precision()` puts the ship at both places and logs the projected positions of
  fixed vertices over 120 frames. Plus a still at each place.

## 3. Constants: what COSMOS becomes

`COSMOS` stays as the **near-body multiplier**, raised from 185 to `RE_UNITS / 2` = **5,906**. It still multiplies
everything that was scaled "so a trip takes the same seconds" around a body: arrive, stop, clear, orbit zones, the
autopilot's speeds, `parkSlack`, `MAX_CRUISE`, patrol heights (`nations.ts`), the `0.4 * COSMOS` surface margin
(`Voyage.tsx` 1116). Approach, parking, orbiting and patrols near a body then take the same seconds as today, now at
true size. New constants in `bodies.ts`:

- `KM_PER_UNIT = 0.2 / 0.3708`
- `ORBIT_AU` (planets), `AU_UNITS`
- `BODY[p] = RADIUS_KM[p] / KM_PER_UNIT`

`VR` stops being "rings". It keeps `earth`, `water`, `air`, `fire` (Earth-relative, × COSMOS) and drops the planet
entries. Each caller of `VR.<planet>` moves to `destGeometry()` positions: navMap 10 uses, voyageScene, nav.ts,
NavOverlay 1. `LIMIT` becomes the edge sphere (centre, radius).

What does **not** scale: ship speeds in a fight, weapons, the 0.6 units/s creep floor, docking (BERTH, in ship
lengths), the camera rig. The throttle's range grows from about 5 decades to about 6.5, because `MAX_CRUISE` grows
×32. The log throttle absorbs that, but the HUD's speed readout needs a unit switch: units/s, then km/s, then c.

## 4. Hyperdrive

**Model.** Three states: `spool` → `jump` → `drop`. All pure, in `src/lib/hyperdrive.ts`, tested without three.js,
and the frame loop flies by the same function, as autopilot does with `flightTime`.
- **Spool:** `SPOOL = 2.0 s` holding course. Taking a hit or a hostile entering mass-lock range cancels it, with a
  1.5 s cooldown.
- **Jump:** speed grows `v' = k·v` from the entry speed, capped at `V_CAP`, and brakes on `want = rem · g`, the
  same braking-on-its-momentum shape as the autopilot. That gives a peak of about `D/(1/k + 1/g)` and a jump time of
  about `ln(Vpeak/v0)/k + ln(Vpeak/v_exit)/g`. Logarithmic in distance, so Mars and Saturn come out close together,
  as they are today.
- **Drop:** at the destination's **well edge**, at `v_exit = AUTO.speed` (the near-body cruise), then the ordinary
  autopilot finishes the approach.
- **Wells:** `well(b) = 12 × radius` for planets and moons, and the Sun likewise (0.056 AU). Entering any well that
  isn't the start's drops you out. So the route planner plans jump legs around wells with the existing `planPath`,
  using `clear = well`. Earth's well (142k units) doesn't reach the Moon (713k), so Earth→Moon is a short jump or a
  sub-light cruise, whichever `planLeg` finds quicker.

**Fights still happen:**
1. **Mass lock:** no spool, and an instant drop, within `LOCK = 6,000 units` (3,200 km) of any hostile armed ship, or
   within 4 s of taking damage.
2. **Wells:** every arrival ends in the destination's well, at ship speed, and the patrols fly inside it.
3. **Interdiction:** a world held by a hostile nation has a well of 3× (36 R) for ships not allied to it. Its armour's
   sensor hardpoints are the stated reason. So arriving at an enemy world, you cross its patrol ring at ship speed.

The exact numbers are Palamedes's to tune by sim. These are starting values.

**Tuning targets** (simulated today with nav.ts's own `flightTime` profile, park to park, without the align turn):
**Earth→Mars 9.2 s, Earth→Saturn 9.3 s.** Target: each within ±15 %, including spool and both in-well legs. Starting
values: `k = g = 2 /s`, `SPOOL = 2 s`. That gives a jump of about 5.6 s for Mars (2.22 AU) and 6.9 s for Saturn
(8.77 AU), before the in-well legs. Expect to trim `SPOOL` to 1.5 s or raise `k` to fit. `V_CAP` is tuned last,
only if Saturn runs long. A vitest pins both times, and the report records both measured in the browser.

**Controls.** A new action `hyperdrive`, default **KeyH** (free in `DEFAULT_BINDS`). It goes in the "Movement" group
of `ACTION_GROUPS` as "Hyperdrive: spool and jump to the target (press again to drop out)", so the keybinds page
gets it for free. All nine hotbar slots are spoken for, and slot 8 is held for Palamedes's repair charge. So the
hyperdrive is **a tenth cell beside the hotbar** in `Hotbar.tsx`, not a numbered slot. It shows the drive state: ready, spooling with a ring
filling, jumping, mass-locked, cooling. `hotbarSlots.ts` stays nine slots. No target means a jump along the nose,
which drops at the first well or on a second press. Autopilot uses the drive on its own for any leg where
`planLeg` finds the jump quicker.

## 5. Armour: plate count stays bounded

The grid is **angular** (`ArmourSpec.cell` in degrees: Earth 1°, Mercury 0.6°, ...), so the **cell count does not
change with radius**. ×32 radius means each plate is 32× wider, not 1,000× more plates. Earth's 1° cell goes from
6.5 units (17 ship lengths) to 206 units (560 ship lengths, 110 km). Hardpoint counts are fixed per world
(`hardpoints.ts` `counts`), and their sizes are in ship lengths. So instance and vertex counts stay where they are.

Two changes:
1. **Tiles for precision.** `armourScene.ts` builds one merged mesh per world, with vertices local to the planet's
   centre: 2.5e5 at Saturn, which is 0.016-unit jitter. Split it by grid section and ring band into tiles of at most
   about 20° of arc (32 to 64 per world), each with its origin at its own centroid. The existing horizon cull runs per
   tile. Within a world that's 15 to 30 drawn up close against today's 1, and only the near world draws.
   **Budget: ≤ 40 armour draw calls at any position.**
2. **Detail near the ship.** A 560-ship-length plate seen from 2 units away is a flat wall. Add procedural panel
   lines, rivets and greebles in the armour material (`armourArt.ts` `armourMaterial`). They're sampled in tile-local
   coordinates, faded in by distance, and cost no geometry. If that reads flat in the shots, add one instanced
   **detail patch**: 3 × 3 cells around the ship's nearest cell, 8 × 8 sub-panels each, 576 instances, rebuilt only
   when the nearest cell changes. Bounded by construction.

Collision (`armourPush`, `segmentHitsArmour`) is angular and radius-relative, so it carries over. The `step` sizes
passed to `segmentHitsArmour` need checking: if a step is in scene units it becomes ×32 too coarse or too fine.

## 6. Every file to change

| Step | File | Change |
|---|---|---|
| 1 | `components/space/origin.ts` (new) + test | render origin, `worldUniform`, `anchorInstances`, the fround jitter test |
| 1 | `components/Voyage.tsx` | render through `renderRebased`; take `O` after the camera rig; `__voyage.precision()` |
| 1 | `fx/atmosphere.ts`, `fx/effects.ts`, `fx/streaks.ts`, `planet/planetAir.ts`, `voyageScene.ts` | world uniforms through the registry |
| 1 | `fleet/fleetRuntime.ts`, `fx/effects.ts`, `swarms.ts`, `moonScene.ts`, `infantry.ts` | anchored instances and points |
| 2 | `lib/bodies.ts` | `KM_PER_UNIT`, `ORBIT_AU`, true radii |
| 2 | `lib/nav.ts` | `COSMOS` 5,906; `BODY` from km; `VR` trimmed; `destGeometry` heliocentric; `zoneOf(pos)`; `LIMIT` → edge |
| 2 | `armourScene.ts`, `armourArt.ts` | tiles, near detail |
| 2 | `lib/megastructure/*.ts` | check `segmentHitsArmour` steps and any absolute unit |
| 2 | `lib/nations.ts`, `lib/stations.ts`, `lib/world.ts` | check the COSMOS-relative numbers; moon arrive/stop use COSMOS |
| 2 | `lib/store.ts`, `Voyage.tsx` save/load | `scale: 'real-1'`; migrate (below) |
| 3 | `lib/moons.ts` | true distances; re-derive `MAJOR_MOONS` by `seenFromPark` |
| 3 | `voyageScene.ts` | orbit lines (coarse + near arc), sky locked to the camera, far-body beacons, LOD hides sub-pixel bodies |
| 3 | `navMap.ts`, `NavOverlay.tsx` | log-radius map centred on the Sun with a zoom-to-body inset; the minimap centred on the ship, log-scaled; footnote text |
| 3 | `lib/nav.ts` | `planRoute` with jump legs; tests re-pinned |
| 4 | `lib/hyperdrive.ts` (new) + test | spool, jump, wells, lock, interdiction, `jumpTime` |
| 4 | `controls/bindings.ts`, `controls/Hotbar.tsx`, `Voyage.tsx` | `hyperdrive` action (KeyH), the drive cell, frame-loop states, FX |

Not touched: `src/components/space/styles/`, `ShipLineup.tsx` (ship-art's). Nothing in this plan needs them.

**Far bodies (step 3):** one Points object of **beacons**, one per body. Each sits camera-relative along the body's
direction at radius 1e6, sized `max(true angular size, 3 px)`, with brightness from the body's apparent magnitude. The
labels already exist. A body's mesh LOD gets an empty level beyond the distance where it's under 2 px. Saturn at 8.8
AU is 0.0026° across, so its mesh isn't drawn from Earth at all. That **lowers** draw calls in open space. The Sun
keeps its real disc (0.53° from Earth) plus the existing glow sprites.

**Save migration (step 2):** an old save's `ship.pos` is in the old geocentric layout, so scaling it won't do. Take
the body whose old orbit zone held the ship. Keep the offset from that body in radii, and rebuild it at the body's new
position and size. If no body held the ship, put it at the nearest body's park point. Route and target ids carry over
as they are. Every other saved position in `store.ts` gets the same treatment; the audit is in step 2. Test: a pass-2
save loads parked at the same body, on the same side.

## 7. Proof plan (step 5, unchanged from the brief)

Baseline to beat: game systems 1.7 ms/frame, 838 draw calls (pass 2). Budget: **≤ 2.0 ms and ≤ 900 calls** at each
shot. Shots go in `shots/real-scale/`: low over Earth, approaching Jupiter, Saturn's rings close up, a jump, the nav
map. Each gets ms, draw calls and the travel times. In-app browser: scripts fetched with `cache: "reload"`; if the pane is hidden,
drive `window.__voyage.run` by hand; close the planet card before each shot.

## 8. Risks I can see now

- **The geocentric → heliocentric switch is the big one** (section 0.2). It changes the map, the card text and the
  "spheres" fiction. It needs Caleb's eye even though the brief rules on it.
- The rebase second matrix walk (section 2): measure before keeping it.
- `MAJOR_MOONS` may change membership at true distances. Saves are covered by the sanitiser, but codex and
  conquest references to a moon id need a grep.
- Hyperdrive numbers are first guesses until simulated.

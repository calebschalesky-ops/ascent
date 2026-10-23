# Infantry carrier

Caleb, 2026-10-19: "a infantry carrier, which will carry infantry units onto the ground to take control of ground
sites once other defenses are cleared out."

Thread `infantry-carrier`, branch `claude/infantry-carrier-632a2c`, cut from integration 8caa0a9, with conquest
(`claude/conquest-0b139e`, 0dcc4f3) merged in because taking a site needs its rules. Every number is a **FIRST PASS**
and lives in one table: `SQUADS` and `INFANTRY` (`src/lib/infantry/squads.ts`), `CARRIER` and `ENEMY`
(`src/lib/infantry/carrier.ts`), the `INFANTRY_CARRIER` row (`src/lib/shipTypes.ts`).

## 1. The idea

Shooting a site below half structure suppresses it, but somebody still has to walk in. The player's ship can hold a
site from the air (conquest's rule, unchanged). The carrier is the other way: it lands troops, they fight the
garrison, and the site changes hands by conquest's capture rule while the player's ship is elsewhere. The catch is
the landing: a carrier coming down is slow and big, every gun of the world can reach it, and it carries six squads
the player paid for. So the order is always: break the patrol, wreck the batteries, suppress the forts, suppress the
target, then land.

## 2. The ship (one row in `shipTypes.ts`)

| | Infantry carrier | for scale: cruiser (player) | capital |
|---|---|---|---|
| Length (player-ship lengths) | **2** | 1 | 5 |
| Hull | **320** | 100 | 900 |
| Hit radius | 2.2 | 1.9 | 3 |
| Patrol speed / ring / dodge (if a world fields one) | 0.6 / 1.2 / 0.05 | 1 / 1.45 / 0.35 | 0 / 1 / 0.03 |
| Transit speed | 45 units/s (a middling throttle) | | |
| Bays | **6 squads** (about 60 men) | | |
| Guns | none of its own in this version (see 10) | | |

The row is `INFANTRY_CARRIER`, kept out of `ShipType`/`SHIP_SPECS`: adding a fourth type there makes `FORCE`,
conquest's production tables and the patrol rings grow a carrier, and that is the integrator's call across the four
new-hull threads (destroyer, drone swarm, drill boarder, carrier).

**Not a bay craft.** At twice the player ship's length it fits no hangar. "Docked" in the code means **flying with the
player's ship** (it keeps station on it, out of sight in this version, and refills there). The destroyer thread's
`destroyer-hangars.md` costs an "infantry carrier (dropship)" at 2 slots, up to 0.4 L: a different, smaller craft.
The two readings disagree; `infantry-to-destroyer.md` says so, and it is the question for Caleb at the end. If he
wants bay dropships, the same infantry model and landing code serve a 1-squad dropship: only `CARRIER.bays`, the row's
size and hull, and the docked behaviour change.

**Armour and arsenal ids.** Arsenal's `Armour` (`{ hull, resist }`) and `makeDefence` are not merged on this branch.
Designed: the carrier fits arsenal's `deflector` shield and heavy armour (hull +120, resist kinetic 0.3), and two
`flak` mounts for point defence while landing. Not wired: until arsenal merges, its 320 hull is the whole defence.

## 3. The infantry model (shared with the drill boarder)

`src/lib/infantry/squads.ts` and `fight.ts`; the contract for other threads is `infantry-interface.md` in the notes
folder.

- A **squad** is `{ kind, nation, men, morale, state }`. Kinds: **line** (10 men, fire 1, toughness 1, morale 0.7,
  40 credits), **shock** (8, 1.5, 1.5, 0.85, 90 credits), **guard** (10, 1.2, 1.25, 0.9: forts, palaces, flagships),
  **militia** (12, 0.55, 0.8, 0.5: townsfolk and crews).
- **Strength** = men / full squad. **Morale** 0–1; at 0.2 a squad **breaks**: it stops fighting and lives (attackers
  re-embark, defenders surrender).
- **A fight** (`stepFight`): each side's fire = men × fire × (0.5 + 0.5 × morale); casualties = the other side's fire
  × 0.01 × dt, × the defenders' **cover** when they are hit, spread by size and divided by toughness. Losses cost
  morale (1.4 per full squad lost), being out-fired costs 0.005 a second per unit of the ratio over 1, out-firing
  regains 0.003. No defender fighting: the attack wins. No attacker fighting, or 600 s: the defence holds.
- **Cover**: capital 0.7, city 0.75, fort 0.55, shipyard and foundry 0.8, works 0.9, a hull's corridors 0.8.
- **Garrisons** (`garrisonFor`): capital 3 guard + 2 line + 2 militia; city 2 line + 3 militia; fort 3 guard + 1
  line; shipyard 1 guard + 2 line; foundry 2 line + 1 militia; works 1 line + 1 militia; battery none. Shelling
  kills some: the share left is 0.25 + 0.75 × structure share, so a suppressed site keeps about 60%. The planets
  thread's military multiplier can scale it.
- **Crews** (`crewFor`, a default for the drill boarder): capital 2 guard + 2 line + 2 militia; cruiser 1 line + 1
  militia; fighter one pilot.
- Pure and deterministic: a fight saved mid-way fights on to the same end after reload (tested).

The table of forecasts the numbers were tuned on is `integration/infantry-fights.md`. Bands it meets:

| Band (set after the first run, not before it: check them by play) | Result |
|---|---|
| A full carrier takes any suppressed site except a capital in under 60 s | works 7 s, foundry 12, shipyard 18, fort 43, city 18 (6 line) |
| A full carrier of line squads cannot take an intact fort, capital or city without luck | fort intact: 6 line win in 94 s with 35 of 60 left (costly); capital intact: 6 line **lose**; city intact: 4 line lose |
| A suppressed capital needs a full carrier | 4 line lose, 6 line win (66 s), 6 shock win (40 s) |
| Shock troops are worth their price | 4 shock take a suppressed fort with 26 of 32 left; 4 line with 21 of 40 |
| Fights are long enough to watch, short enough not to wait | 5–120 s |

## 4. Orders

The player's carriers come with progression: **one from level 3, two from level 6** (`carrierSlots`). The first is
free; each one after (to replace a lost one) costs **300 credits** with its troops. A carrier with the player's ship
refills its bays from the player's credits (40 a line squad, by the men missing).

- **L** in the cockpit: the nearest site of the world the ship is at that can be held gets a carrier (one waiting, else
  one with the player's ship). **K**: every carrier out returns to the player's ship.
- **Through fleet command**: fleet-command (`claude/fleet-command-885c0e`) is not merged; its `Order` union has no
  landing. Requested in `infantry-to-fleet.md`: an order `{ kind: 'land'; site: string }` for a wing whose members are
  carriers, which calls `orderLanding` and hands the carrier to `stepCarrier` until it is back in standby. Until then
  the cockpit keys are the order.
- `window.__infantry` (dev): `order(siteId, force)`, `recall()`, `problem(siteId)`, `view()`, `state`, `jump(s)`.

**Refusals** (`landingProblem`, shown as "Gangway refused: …"), in this order:

1. conquest's rules (`captureProblem`): not theirs; a battery ("cannot be held: destroy it"); a city or capital while
   a fort stands ("its forts still stand"); not suppressed ("its defences are up: shoot it below half first");
2. **too hot**: the fire it would take on the way down (20 s) and unloading (6 s) is at least 0.8 of its hull;
3. **the garrison would hold**: `forecast` of the squads aboard against the garrison says the defence wins.

The player can **force** a landing past 2 and 3 (`order(id, true)`; no key yet), never past conquest's rules except
"not suppressed".

## 5. Descent and landing

Phases: `docked → transit → descent → unload → fight → hold → lift → standby` (or `return → docked`, or `lost`).

- **Transit** at 45 units/s to a point 60 units above the site (straight line; see 10).
- **Descent** 20 s down the site's surface normal to the top of its structure, then **unload** 6 s (ramp down).
- **Fire** reaching it (`landingFire`, hit points a second): every working battery of the world **8**, every other
  working fort **5** (their guns cover the sky, so only during the descent), the target itself while it works **4**,
  each hostile ship within conquest's contest range (1,000 units) **3**. An intact Mars with its patrol up: 39 a
  second, which kills a carrier in 8 s. With the batteries wrecked, the forts and target suppressed and the patrol
  dead: 0.
- From the moment the carrier starts down, the site counts as under attack (its `lastHit` is kept current), so it does
  not mend above half while the troops are coming. A site that had already mended before they landed cannot be held:
  the troops pull out ("shell it again") rather than hold for ever.

## 6. The ground fight and the capture

On unloading, the squads fight `garrisonOf(site)` with the site's cover. The scene draws both sides as dots round the
site (a dot about two men, in each nation's colour), and the HUD shows hull, men against men and the balance of fire.

- **Won**: the troops hold the site. The hold is **conquest's rule, counted by the troops**: it runs while
  `captureProblem` (in range: true) allows, pauses while the owner's ships are near, drains at 2× otherwise. When it
  reaches the site kind's hold time (works 10 s, foundry 15, fort and city 20, shipyard 25, capital 30), the whole hold
  is handed to conquest's `captureStep` in one call, which checks the rule again and does the capture, the reward and
  the world's control exactly as for the player's ship. **One squad stays as the site's garrison**; the rest re-embark.
- **Lost**: the survivors re-embark (broken squads rally aboard) and the carrier lifts off.
- Lift 10 s, then it waits 60 units above the site for the next order.

Why the troops count the hold rather than calling `captureStep` each frame: conquest's scene layer drains any hold the
player's ship is not in range of, every frame, at twice the fill rate. Request 1 in `infantry-to-conquest.md` asks for
a hook so troops count as in range; then the carrier calls `captureStep` each frame and the HUD's hold bar shows it.

## 7. Enemy carriers

A world not yet controlled, with a working shipyard, sends a carrier (four line squads) every 240 s at the player's
site of that world with the smallest garrison, if the player's ship is not within 400 units of it. It launches from the
shipyard, lands the same way, and fights the player's garrison squad there. If it wins the site **goes back to its
world** at half structure with no hold: the player must take it again (`retake`, pending conquest's ruling on
counter-attacks, request 2). The garrison's own guns (4 a second) fire on it while it lands, and the player's shots hit
it (it is one of combat's solids). A repulsed or victorious enemy carrier withdraws to its yard (out of play).

Enemy-ai (`claude/enemy-ai-dbbee0`) is not merged here; once it is, the enemy carrier's transit should route with its
`avoidBodies` and its approach should prefer `bestCover`, and its launch should follow `tactics.ts`'s role choice. Its
decision (`enemyTarget`) is pure and tested so that swap is local.

## 8. The look and the names

`src/components/space/carrier.ts`: one model per nation round a common troop bay with a drop ramp, keeping each
nation's silhouette and palette from ART-DIRECTION.md: Earth a lathed brass cigar with swept wings and a blue band;
the Moon an open white colonnade with a lamp ring; Mercury a bronze shield disc with a gold rim and chevron; Venus a
gold teardrop with a green glass dome; Mars a flat grey wedge, one red stripe, a stern tower and a flat bank of small
nozzles; Jupiter a violet spine with crescent claws and magenta seams; Saturn a black spine with banks of oar-fins and
a painted eye. Meshes carry `userData.role`. A screen-size beacon (blue for the player, red for an enemy) marks it at
any range and flickers amber while guns reach it.

Names (`src/lib/infantry/names.ts`), Greek and Roman history only:

| Nation | Carrier class | Why | Troops | Hulls in turn |
|---|---|---|---|---|
| Earth | Gangway (PLACEHOLDER, as Earth's other classes) | the gangway a landing party goes down | Marines | Gangway, Bridgehead, Shore Party, Foothold |
| Moon (Selenitai) | Theoris | the sacred ship that carried a city's embassy to Delphi | Temple Wardens | Theoris, Paralos, Delia, Pythias |
| Mercury (Hemerodromoi) | Enomotia | the smallest Spartan unit, a band bound by oath | Spartiates | Enomotia, Lochos, Mora, Pentekostys |
| Venus (Nephelai) | Chelandion | the Byzantine horse and troop transport galley | Skoutatoi | Chelandion, Ousiakos, Pamphylos, Thema |
| Mars (Quirites) | Actuaria | the navis actuaria, Rome's quick troop transport | Legionaries | Actuaria, Ponto, Corbita, Liburna |
| Jupiter (Diadochoi) | Hippagogos | the Hellenistic horse-transport ship | Pezhetairoi | Hippagogos, Basilis, Syntagma, Taxis |
| Saturn (Autochthones) | Stratiotis | Athens's troop trireme | Epibatai | Stratiotis, Salaminia, Hoplitagogos, Epibates |

## 9. Save

`GameData.infantry` (`InfantryState`): every carrier (phase, hull, position, height, squads, the fight mid-fight, the
hold), the garrisons by site, each world's carrier cooldown. Saved with conquest on every carrier event, every 5 s of
flight and on "Save journey"; read back by `migrateInfantry`, which drops unknown sites and phases and clamps numbers.

## 10. Not built (first version)

- No guns of its own and no arsenal defence (section 2): arsenal is not merged.
- Transit is a straight line at a fixed speed; it does not steer round bodies (enemy-ai's `avoidBodies`) and does not
  use atmo-flight's air (`claude/atmo-flight-e13c2e`: density, heating, terrain height). Designed for when it merges:
  descent speed capped by `maxAirspeed(density)`, a plasma glow from `plasmaGlow`, touchdown at `groundHeight` rather
  than the top of the site's structure. On the gas giants' cloud-layer sites the carrier "lands" on the platform.
- Orbit sites (shipyards) are boarded the same way as ground sites (the carrier docks rather than descends; the numbers
  are the same).
- Squads bought singly, shock squads from a shop, and squad veterancy.
- Moving garrison squads between sites; reinforcing a garrison.

## Open questions for Caleb

1. Should a lost site be retaken by enemy carriers at all (built, pending conquest's counter-attack ruling), or should
   taken sites stay taken?
2. Is one carrier at level 3 and two at level 6 right, or should carriers be bought at a held shipyard like the armada?
3. Should the player be able to force a landing from the cockpit (it is in the dev hook only)?
4. Earth's carrier and troop names are placeholders like Earth's other classes. Names you want?

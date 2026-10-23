# Conquest

Caleb, 2026-10-18: "Another part of the gameplay quest is going to be conquering each planet. Which means there are
going to need to be cities, bases, factories etc, mines even on each planet with certain resources that make the
planets useful economically, strategically and militarily. Each planet should be able to produce more of its navy
after you destroy it, until you control the planet or all of its production sites."

This is the design. Every number is a **FIRST PASS** and lives in one table in `src/lib/conquest/` so it can be
reshaped. The rules are pure and unit-tested there; the scene and the screens sit on top
(`src/components/conquest.ts`, `ConquestHud.tsx`, the arrival card). The balance simulator
(`src/lib/balance/conquest.ts`) proves the bands in section 9 and `integration/conquest-balance.md` holds its run.

It also answers integration report 1, decision 1: destroyed enemies now come back, but only from production, and
production is something the player can take away.

Physical facts come from LORE.md's sources (NASA fact sheets, read 2026-10-18) unless marked "outside source". History
and myth only: no astrology, planetary metals or occult correspondences.

---

## 1. The idea in one paragraph

Each world is a nation's home and its arsenal. Its **sites** (cities, forts, an orbital shipyard, a foundry, mines and
works, gun batteries) turn **resources** into **ships**. Kill a world's patrol and its shipyard and foundry start
rebuilding it, as fast as their working sites and their stockpiles allow. To stop that you either take the world
(its capital city, once its forts have fallen) or take or wreck every production site. Sites you take pay you, and
the worlds trade with each other, so taking one world can starve another: take Titan's methane wells and every
navy that burns Saturn's hydrocarbons slowly stops building fighters.

---

## 2. Sites

### 2.1 Kinds

| Kind | Where | Structure | Hold to capture | Can be wrecked | When it works for its owner | When it is yours (per minute) | XP the first time it is taken or wrecked |
|---|---|---|---|---|---|---|---|
| **Capital city** | surface, cloud layer or a moon | 3,000 | 30 s | no | seat of government: the world is controlled by whoever holds it (with the forts) | 40 credits | 400 |
| **City** | as above | 1,500 | 20 s | no | people, trade | 20 credits | 150 |
| **Fort** | surface or moon | 1,800 | 20 s | yes | garrison: while any fort is the owner's, no city can be taken | 5 credits | 200 |
| **Shipyard** | orbit | 2,400 | 25 s | yes | builds cruisers and capital ships | 12 credits | 250 |
| **Foundry** | surface or moon | 1,400 | 15 s | yes | builds fighters | 10 credits | 150 |
| **Works** (mine, well, scoop, array) | anywhere | 900 | 10 s | yes | produces one resource | 6 × its richness | 80 |
| **Battery** | orbit or surface | 1,000 | cannot be held | yes | its guns: every other site of the world takes half damage while any battery stands | — | 60 |

- **Structure** is a site's hit points. Bolts and missiles hit sites as they hit ships (the site's hit radius is its
  size). A site at or below half structure is **suppressed**: it stops working, and it can be captured.
- **Capture** (taking it whole): fly within the site's size plus 30 units (about 80 ship lengths) while it is
  suppressed and **uncontested** (no live ship of its owner within 1,000 units, about 2,700 ship lengths) and hold
  there. Progress fills over the hold time. While the owner's ships are near it only pauses (the landing party digs in);
  leaving, or letting the site mend above half, drains it at twice the rate it fills. A city or the
  capital cannot be taken while any of its world's forts is still its owner's.
- **Wreck** (destroying it): shoot it to zero. A wrecked site works for no one. Cities and the capital cannot be
  wrecked: below a quarter of their structure they take no more damage. The game never bombs a city flat.
- **Repair**: a damaged site its owner still holds mends 1% of its structure a second, starting 45 s after it was
  last hit. A wrecked site is rebuilt by its owner in 240 s of flight time, **but only while the owner still holds a
  working shipyard or foundry on that world**. So wrecking a world's production one site at a time is undone; wreck or
  take all of it and nothing comes back.
- **Paid once**: the first time a site is taken, captured or wrecked, it pays its XP and credits (`KINDS` in
  `sites.ts`: credits 10 to 150, plus the Moon's treasuries). Never again, whatever happens to it later.
- **Captured** sites come back to full structure, work for you (income, section 4) and stay yours. In this first
  version owners do not counter-attack (enemies do not fight yet); that waits for enemy AI and fleet command.

### 2.2 Where sites sit

A site sits **on the surface** (it turns with its planet), **in the cloud layer** (Venus's cities, the gas giants'
scoops, just above the cloud tops), **in orbit** (shipyards, batteries, ring harvesters: fixed, between the fighter and
capital patrol rings, so arriving you fly through the yard), **on a moon** (Jupiter's and Saturn's peoples live on
moons), or, once, **on the twilight line** (Mercury's walking city, which stays in the twilight while the planet turns
under it).

Moons: Jupiter's Io, Europa, Ganymede and Callisto and Saturn's Titan and Enceladus are real destinations on the
`stations-moons` branch, which is not merged. Until it is, `src/lib/conquest/anchors.ts` puts a true-scale stand-in
moon at a fixed place outside each planet's orbit zone, ordered outward by real distance. On merge, the anchor reads
`allMoons()` from `lib/world.ts` instead; the site table does not change.

### 2.3 The seven worlds

Each world has one capital, one shipyard, one foundry, at least one fort, and the works its body can really support.
Richness multiplies a works' output (1 = the base rate, 0.1 a second). Names follow the people in LORE.md.

**Earth — the Metropolis (humans).** The mother city, the largest and oldest industry, fed by its own oceans and
fields. Imports helium-3 from the Moon and hydrocarbons from Titan (its oil is long gone).

| Site | Kind | Where | Makes |
|---|---|---|---|
| The Metropolis | capital | surface | |
| Port Charter, the old treaty port | city | surface | |
| Charter Guard | fort | surface | |
| Pharos Yard (named for the lighthouse of Alexandria) | shipyard | orbit | |
| The Old Foundries | foundry | surface | |
| The Breadbasket | works | surface | food ×2 |
| The Desalinators | works | coast | ice (water) ×1.5 |
| The Deep Mines | works | surface | metals ×1 |
| The Refineries | works | surface | chemicals ×1 |
| The Grid | works | surface | power ×1 |
| Lagrange Guns, two | battery | orbit | |

**The Moon — the Selenitai (Delphi).** A temple-state of scholars on the oldest colony. The Moon has no air and
little but rock and ice, but it is the system's helium-3 mine: the solar wind has soaked its regolith in it for billions
of years (outside source, widely reported), and its polar craters hold water ice in permanent shadow (outside source).

| Site | Kind | Where | Makes |
|---|---|---|---|
| The Omphalos, with the Hall of Answers, roof open to the Earth | capital | near-side surface | |
| Treasury Row, the nations' vaults under the crust | city | surface | a one-off **600 credits** the first time it is taken (the treasuries) |
| The Temenos Wall, the sacred precinct's garrison | fort | surface | |
| Lamp Yard | shipyard | orbit | |
| The Mirror Works | foundry | surface | |
| Tranquillity Ovens, baking helium-3 out of mare regolith | works | surface | helium-3 ×1.5 |
| Shackleton Cold Traps | works | south pole | ice ×1 |
| Imbrium Pits (titanium and iron from ilmenite) | works | surface | metals ×1 |
| The Peaks of Light, polar summits in near-constant sun | works | north pole | power ×1 |
| The Amphictyon Guns | battery | orbit | |

Imports food from Earth, hydrocarbons from Titan, chemicals from Venus.

**Mercury — the Hemerodromoi (Sparta).** Sunlight 6.674 × Earth's: the richest power in the system. Mercury's iron
core is a huge share of the planet (outside source), and its polar craters keep ice in shadow (outside source,
MESSENGER).

| Site | Kind | Where | Makes |
|---|---|---|---|
| **Lakedaimon**, the walking city on rails | capital | **on the twilight line**: it never stops, and the planet turns under it | |
| The Perioikoi Rail-towns | city | surface | |
| The Agoge, where every child is trained | fort | surface | |
| Thermopylae Line, at the dawn edge | fort | surface | |
| Hoplon Yard, in the planet's shadow | shipyard | orbit | |
| The Rail Forges | foundry | surface | |
| The Day-side Mirror Fields | works | day side | power ×2.5 |
| Caloris Iron Pits | works | surface | metals ×1.5 |
| The Polar Cold Traps | works | north pole | ice ×0.5 |
| Shield-wall Batteries, two | battery | orbit | |

Imports hydrocarbons from Titan, chemicals and food from Venus, helium-3 from the Moon. Exports power (Venus, Mars) and
metals (Venus).

**Venus — the Nephelai (Byzantium).** Everything lives in the cloud layer at 50–55 km. The clouds are sulphuric acid
(outside source): the system's chemical works. Water is the scarcest thing on Venus, and LORE.md has them buying power
from Mercury.

| Site | Kind | Where | Makes |
|---|---|---|---|
| Nephelokokkygia, the palace city under its lifting envelope | capital | cloud layer | |
| Blachernae, the second city | city | cloud layer | |
| The Varangian Station (the Autokrator's foreign guard) | fort | cloud layer | |
| Golden Horn Yard | shipyard | orbit | |
| The Greek Fire Works | foundry | cloud layer | |
| The Acid Skimmers | works | cloud layer | chemicals ×2 |
| The Cloud Orchards | works | cloud layer | food ×1.5 |
| The Descent: heat-proof dredges let down to the 464 °C ground; to be sent down is a sentence | works | surface | metals ×0.5 |
| The Chain Gate (as across the Golden Horn) | battery | orbit | |

Imports power and metals from Mercury, ice from Europa, helium-3 from the Moon, hydrocarbons from Titan.

**Mars — the Quirites (Rome).** Two legions, aqueducts of polar ice, iron everywhere (the red is iron oxide; outside
source) and the belt beyond. Sunlight 0.431 × Earth's: they buy power.

| Site | Kind | Where | Makes |
|---|---|---|---|
| The Quirinal, seat of the Senate | capital | surface | |
| Colonia Tharsis | city | surface | |
| Castra Prima | fort | surface | |
| Castra Secunda | fort | surface | |
| The Navalia (the Roman naval yards) | shipyard | orbit | |
| The Fabrica (Rome's state arms factories) | foundry | surface | |
| Aqua Borealis, the aqueduct from the north polar cap | works | north | ice ×1.5 |
| Tharsis Mines | works | surface | metals ×1.5 |
| The Dome Fields | works | surface | food ×1 |
| The Perchlorate Works (Martian soil is rich in perchlorate; outside source) | works | surface | chemicals ×1 |
| The Limes Batteries | battery | orbit | |

Imports power from Mercury, helium-3 from the Moon, hydrocarbons from Titan. Exports metals to Earth.

**Jupiter — the Diadochoi (the successor kings).** On the moons. Sunlight 0.037 × Earth's: their power is fusion,
burning the helium-3 their scoops take from Jupiter's air. Europa is ice; Io, the prison, is sulphur (outside source:
Io's volcanoes).

| Site | Kind | Where | Makes |
|---|---|---|---|
| The Basileia of Callisto, the royal capital | capital | Callisto | |
| The Court of Ganymede | city | Ganymede | |
| The Companions' Barracks | fort | Ganymede | |
| The Io Prison-fort | fort | Io | |
| The Royal Yard, where the great flagships are laid down | shipyard | Jupiter orbit | |
| The Ganymede Forges | foundry | Ganymede | |
| The Cloud-top Scoops | works | Jupiter, cloud tops | helium-3 ×2 |
| The Europa Ice Quarries | works | Europa | ice ×2 |
| The Io Sulphur Pits, worked by prisoners | works | Io | chemicals ×1.5 |
| The Fusion Halls | works | Ganymede | power ×1.5 |
| Callisto Regolith Mines | works | Callisto | metals ×0.75 |
| Sarissa Batteries, two | battery | Jupiter orbit | |

Imports food and hydrocarbons from Titan. Exports ice (Venus), metals and chemicals (Saturn).

**Saturn — the Autochthones (Athens).** On Titan: thick nitrogen air, methane seas. Their wealth is the hydrocarbon
seas, sold to everyone.

| Site | Kind | Where | Makes |
|---|---|---|---|
| The Pnyx, the hill where the Ekklesia meets | capital | Titan | |
| Piraeus, the harbour on Kraken Mare | city | Titan | |
| The Long Walls, joining the Pnyx to Piraeus | fort | Titan | |
| The Ship Sheds (the Athenian *neosoikoi*) | shipyard | Saturn orbit | |
| The Kerameikos Works | foundry | Titan | |
| The Kraken Mare Wells | works | Titan | hydrocarbons ×2.5 |
| The Ligeia Vat-farms | works | Titan | food ×1 |
| The Ring Harvesters | works | Saturn's rings | ice ×2 |
| The Enceladus Geyser Taps | works | Enceladus | ice ×1 |
| The Saturn Scoops | works | Saturn, cloud tops | helium-3 ×1 |
| The Methane Burners (methane with oxygen split from ice) | works | Titan | power ×0.8 |
| The Owl Batteries | battery | Saturn orbit | |

Imports metals and chemicals from Jupiter. Exports hydrocarbons to all six other worlds and food to Jupiter.

---

## 3. Resources

Seven. A works site adds its resource to its owner's stockpile at **0.1 a second × richness**. A stockpile holds at
most 40 of each and a world starts half full.

| Resource | Where it really comes from | Economic (yours) | Strategic | Military (what builds need it) |
|---|---|---|---|---|
| **Metals** | iron, titanium, nickel: Mercury's core, Mars, the Moon's ilmenite, Earth | sells (works income) | hull repair (designed, below) | every hull |
| **Ice** | water: Earth's oceans, Mars's caps, Europa, Saturn's rings, Enceladus, polar craters | sells | air, water and reaction mass for range and resupply | crews of cruisers and capitals |
| **Hydrocarbons** | Titan's methane and ethane seas | sells | fuel; whoever holds Titan holds every fighter line that burns it | fighters, cruisers |
| **Power** | sunlight (Mercury 6.7×, the Moon's peaks), fusion (Jupiter) | sells | runs factories; shields and energy weapons (designed) | cruisers, capitals |
| **Helium-3** | the Moon's regolith; Jupiter's and Saturn's air | sells | fusion drives | **capital ships only, and a hard requirement** |
| **Chemicals** | Venus's acid clouds, Io's sulphur, Mars's perchlorates | sells | propellant and explosives | munitions for cruisers and capitals |
| **Food** | Earth's fields, Venus's orchards, Titan's vats, Mars's domes | sells | crews | capital ships' crews |

### 3.1 Trade

A world with no working works of a resource imports it from one supplier at **0.05 a second**, as long as the
supplier world is not controlled by the player (a world that makes a resource also falls back on importing it if its
works are all down: Venus buys Mercury's metal when the Descent is wrecked) and the importer is not **blockaded** (the player in its orbit zone
with none of its ships alive). Suppliers follow LORE.md:

| Importer | Imports (supplier) |
|---|---|
| Earth | helium-3 (Moon), hydrocarbons (Saturn) |
| Moon | food (Earth), hydrocarbons (Saturn), chemicals (Venus) |
| Mercury | hydrocarbons (Saturn), chemicals (Venus), food (Venus), helium-3 (Moon) |
| Venus | power (Mercury), metals (Mercury), ice (Jupiter), helium-3 (Moon), hydrocarbons (Saturn) |
| Mars | power (Mercury), helium-3 (Moon), hydrocarbons (Saturn) |
| Jupiter | food (Saturn), hydrocarbons (Saturn) |
| Saturn | metals (Jupiter), chemicals (Jupiter) |

A resource a world neither makes nor can import is **cut off**: once its stockpile is spent, nothing that needs it
can be built. Taking the Moon cuts helium-3 to Earth, Mercury, Venus and Mars, so after their stock runs out none of
them can lay down a capital ship. Taking Titan does the same to fighters and cruisers everywhere but Saturn. Every
link the player cuts by taking a supplier pays the player **5 credits a minute** in tolls.

---

## 4. Navy production

### 4.1 What a world builds

A world keeps its patrol at full strength: its **force** (1 capital, 2 cruisers, 4 fighters, `FORCE` in
`shipTypes.ts`). When it is short, two lines work in parallel:

- the **foundry line** builds fighters;
- the **shipyard line** builds cruisers first, then the capital ship.

| Ship | Build time (one working site) | Cost |
|---|---|---|
| Fighter | 45 s | metals 2, hydrocarbons 1 |
| Cruiser | 120 s | metals 6, hydrocarbons 2, chemicals 2, power 2, ice 1 |
| Capital | 480 s | metals 24, helium-3 6, power 8, chemicals 6, ice 4, food 4 |

- A line starts a ship only when the stockpile covers its whole cost (paid at the start). A ship already started is
  finished even if the stock then runs dry.
- A line's speed is the number of its owner's working sites of that kind (a suppressed, captured or wrecked site does
  not count), times **1 + 0.2 for every world the player controls** (the other nations mobilise; section 6).
- A finished ship **launches from its site**: it appears at the shipyard or foundry and eases out onto its patrol
  ring, so the player sees where reinforcements come from.
- Production runs on **flight time** only: the game clock advances while flying, not while paused, in a menu or with
  the game closed.

### 4.2 When it stops

A world stops producing for good when **either**:

1. the player **controls** it (section 5), or
2. it has **no production site left**: every shipyard and foundry is the player's or wrecked. Wrecks are only rebuilt
   while one stands, so this is permanent.

It stops building one kind of ship when that line has no working site, or when a resource the ship needs is cut off
and spent. Suppressing a site pauses its line while it is suppressed, so a siege slows a world before it falls.

---

## 5. Control

A world is **controlled** by the player when the player holds its **capital** and **no fort is still its owner's**
(each fort captured or wrecked). Controlling it:

- every site its owner still held surrenders to the player (wrecks stay wrecks);
- its production stops and its stockpile is the player's (it becomes income);
- the ships of that world still alive **stand down**: they stop being hostile and keep their patrol as the player's
  garrison. A conquered world's navy is the start of the player's own (see 7);
- the arrival card says "Held by: you (taken from the Quirites)".

The player's own home world is never a conquest target and pays nothing: the player is its pilot, not its ruler.

Sequence on a typical world: break the patrol, knock out the batteries, then take or wreck the shipyard and foundry
(production stops), then the works you want (income, and cutting other worlds' imports), then the forts, then the
capital. A player can also go straight for forts and capital with reinforcements arriving the whole time.

---

## 6. What it gives the player, and how the others react

| Reward | Rule |
|---|---|
| **Income** | Each site you hold pays its credits per minute of flight time (table 2.1); works pay 6 × richness; each cut trade link pays 5. A controlled Mars pays about 150 a minute. |
| **XP and credits for taking sites** | Paid the first time each site is taken (table 2.1), never again. Controlling a world pays **500 XP** once. Treasury Row pays 600 credits once. |
| **The capital-ship step** | Open when you are level 8 or higher, control a world with a shipyard you hold, and hold a helium-3 source (a helium-3 works, or control of the Moon, Jupiter or Saturn). The level-10 placeholder in PROGRESSION.md becomes this. |
| **The armada step** | Open at level 10 with three worlds controlled. |
| **A garrison** | The ships of a world you take stand down and patrol for you. |
| **Designed, not yet wired** (they need arsenal and stations): | a held shipyard sells bay fighters at 25% off; held metals works cut module prices 10% (to 30%); held ice gives free resupply at that world's stations; held power raises shield regeneration 10%. |

**The other nations react.** For every world the player controls, every other world's lines build 20% faster
(mobilisation). Taking a supplier cuts trade (3.1). Designed for when enemies fight and fleets move (enemy AI, fleet
command): the conquered world's old enemy (LORE.md: Mars and Jupiter, the Moon and Venus) offers a truce, and the
others send a relief fleet to the world under siege.

---

## 7. Respawn and the economy (decision 1)

Integration report 1: "Destroyed enemies never come back, so the game tops out at level 6; reloading farms free XP."

- **Production is the only way a ship comes back.** Nothing respawns on a timer or on reload.
- **The state survives save and reload.** `GameData.conquest` holds the game clock, each world's live ships by type,
  its veterans, its build lines, its stockpile and every site's structure, owner, capture progress and whether it
  has been taken before. It is written **in the same save as the XP and credits** on every kill, capture and income
  payment, so a reload cannot bring a ship back without also taking its XP back. On load, combat builds every
  nation's ships and stands down, silently, those the save says are dead.
- **Veterans and levies.** Each world's original force are veterans and pay the full `ECONOMY` rewards. Ships it
  builds are levies (fresh crews) and pay **half**. The veteran count is saved, so a reload does not refill it.
- **Bounded by production.** A world can only pay out what it can build. A fully working world rebuilds its whole
  force in 12–16 minutes; farming its rebuilds pays 12–20 XP a minute, while taking it pays 100–200 XP a minute (the
  simulator's numbers are in section 9).
- **No idle farming.** The clock and income only run in flight, and the clock is saved, so closing the game does not
  build ships or pay income.
- **The top is reachable.** Taking the six other worlds whole, original navies included, pays at least 14,800 XP
  (simulator); level 10 needs 4,500. No farming is needed.

---

## 8. What is built in this first version

`src/lib/conquest/` (pure, tested):

- `resources.ts`: the resources, ship costs and build times.
- `sites.ts`: site kinds, the seven worlds' sites, the trade table.
- `anchors.ts`: where a site sits (surface direction, altitude, moon stand-ins).
- `state.ts`: the conquest state, production, damage, repair, capture, control, income, kills and rewards.
- `persist.ts`: reading a saved state and repairing what it can.
- `unlocks.ts`: the capital-ship and armada steps.
- `conquest.test.ts`.

On top:

- `components/conquest.ts`: every site drawn at its place (structures in the nation's colour with a beacon; surface
  sites turn with their planet), bolts and missiles hitting them, capture by holding, ships relaunching from their
  site through `combat.ts`, and kills, captures and income fed back to the save.
- `components/ConquestHud.tsx`: near a world, a strip of its sites (state, structure, capture), what it is building
  and its lines; and labelled markers on screen.
- The **arrival card** shows who holds the world, its production (building what, how far along, or "stopped"), its
  sites taken out of the total and its resources.
- `__conquest` (dev only) for tests: the state, `site(id)`, `hit`, `jump(seconds)`.

---

## 9. Balance bands (written before the run)

The simulator plays a level-1 pilot (laser and missile, 0.5° aim, the times to kill measured by `engage.ts` against
each race's loadout) against each world, using the real production, repair and capture code. Enemies still do not
shoot back, so these are the bands for a world that only rebuilds.

| Band | Limit |
|---|---|
| Time to conquer each world, level-1 pilot, solo | 8–30 min of flight |
| A world cannot out-produce a level-1 pilot | the pilot's kill capacity ≥ 2 × the world's production (ship hit points per minute) |
| Window after the patrol dies | ≥ 30 s before the first replacement launches |
| Full rebuild of a wiped force at an intact world | 6–16 min (written as 6–15; widened after the first run: the two metal-poor worlds, Venus and Saturn, take 16, which is the design) |
| All production sites taken or wrecked | 0 launches in the next 30 min |
| Helium-3 cut off and spent | 0 capital ships |
| Farming is worse than conquering | XP per minute farming a world's rebuilds ≤ 0.6 × XP per minute taking it |
| Taking a world pays | credits per minute from a controlled world ≥ 1.5 × credits per minute from farming it |
| The top level is reachable without farming | one-time XP from all six worlds and their original navies ≥ 4,500 |

---

### 9.1 The run (`integration/conquest-balance.md`, seed fixed)

`CONQUEST_OUT=integration/conquest-balance.md npx vitest run src/lib/balance/conquest.test.ts`. Assumptions: 8 s to find
each ship, 75.6 damage a second on a site, 30 s between sites (90 s to or between moons), every live ship cleared first,
and the pilot out of range of its site while chasing one (so the hold drains). No flags.

| World | Conquer (min) | Ships killed (veteran + levy) | XP/min taking | Farm XP/min | Farm busy | First launch (s) | Full rebuild (min) | Held income (cr/min) |
|---|---|---|---|---|---|---|---|---|
| Earth | 14.5 | 7 + 9 | 180 | 20.2 | 41% | 45 | 12.0 | 126 |
| Moon | 13.1 | 7 + 8 | 187 | 20.2 | 48% | 45 | 12.0 | 114 |
| Mercury | 14.1 | 7 + 9 | 188 | 20.2 | 43% | 45 | 12.0 | 119 |
| Venus | 12.4 | 7 + 8 | 192 | 12.5 | 40% | 45 | 16.0 | 111 |
| Mars | 13.5 | 7 + 7 | 197 | 20.2 | 40% | 45 | 12.0 | 122 |
| Jupiter | 27.9 | 7 + 13 | 103 | 17.0 | 36% | 45 | 13.3 | 139 |
| Saturn | 23.4 | 7 + 11 | 113 | 12.5 | 40% | 45 | 16.0 | 137 |

Every world: 0 launches in the 30 minutes after its shipyard and foundry fall; 0 capital ships with helium-3 cut.
What the first run changed: the Moon and Venus could not be taken at all. Their fighters (136 hit points) take 16 s
each to kill and came every 40 s, and a contested hold drained, so a 25 s shipyard hold never finished. Fixes: a
contested hold pauses instead of draining, the pilot takes the foundry before the shipyard, fighters take 45 s, and
imports run at 0.05 a second with a capital ship needing 24 metals (30 before), so the metal-poor worlds rebuild in 16
minutes rather than 18 and 20.

## Open questions for Caleb

1. Should owners counter-attack captured sites (once enemies fight), and can a world be lost back?
2. Should conquered worlds become the player's own nation, or a separate "player-held" faction with its own colour?
3. Is half pay for levies right, or should rebuilt ships pay nothing until a world is fully rebuilt?
4. Should production run while the game is closed (a real-time world), or only in flight as built?
5. Should cities really be untouchable, or can a city be razed at a cost (other nations' anger)?
6. Should the player be able to buy ships at a held shipyard (the armada), and with which resources?
7. Do you want the player to haul resources (a trader's game) or only collect income as built?
8. Should Mercury's walking city be catchable on foot (landing), or only from the air as built?
9. Are the site names right for each people, especially Earth's (still placeholders: Metropolis, Port Charter)?
10. Should taking a supplier make its customers hostile to each other (Mars and Venus fighting over Mercury's power)?

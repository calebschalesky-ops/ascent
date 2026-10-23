# Planets: the ground, its cities, and the health of each world

> **DRAFT, 2026-10-19**, thread `planets`, branch `claude/planets-cd91e2`. For Caleb to react to; nothing here is
> canon. Every number is a **FIRST PASS** and lives in one table in `src/lib/planets/`.
> History, myth and cult only: no astrology, planetary metals or occult correspondences.

Caleb, 2026-10-19: "The main things I want to focus on … is the planets, both the culture, architecture, city types,
building types, the mechanics of each, how they each contribute to the health of that planet's government, military,
religion, etc."

Caleb's station ruling the same day: each planet's station is a huge armour megastructure themed on the planet's god
(Terra/Gaia, Selene, Hermes, Aphrodite, Ares/Mars, Zeus, Kronos), built by the **god-armour** thread. The station is
orbital and belongs to god-armour (its body) and stations (its systems). **This file is the ground**: the cities,
the buildings in them and the four meters. Each people's religion below is its planet's god, so the ground and the
armour overhead agree.

**How it fits with the other threads.**

- **Conquest** (`CONQUEST.md`, `claude/conquest-0b139e`, uncommitted when this was written) owns the *sites*: the
  capital, a city, forts, a shipyard, a foundry, works and batteries on each world, how they are damaged, captured and
  wrecked, and how they rebuild the navy. **This layer adds nothing to that list.** It puts a city type and buildings
  inside conquest's sites, reads what each site is doing, and hands conquest back multipliers on its own rates. At
  meters of 50 every multiplier is exactly 1, so conquest's balance is untouched by an ordinary world.
- **Races-in-depth** has not published government types yet. The governments below are LORE.md's (Delphi's college,
  Sparta's two kings and ephors, the Byzantine Autokrator, the Roman Senate, the Hellenistic kings, the Athenian
  assembly). When races-in-depth lands, its types replace these names; the mechanics stay.
- **Stations** and **god-armour**: shared meters proposed in the notes folder (`planets-stations.md`).

Contents: 1. the shared model · 2. the seven worlds (self-contained, one each) · 3. the headless run · 4. code ·
5. open questions.

---

## 1. The shared model

### 1.1 Four meters

Every world has the same four, each 0–100, where **50 is ordinary**. Few meters, one clear job each.

| Meter | What it is | Its effect in play (all exactly 1 at 50) |
|---|---|---|
| **Government** | Whether the rulers are obeyed: legitimacy and order. | **Capture resistance**: the hold time to capture a site × (0.75 + G/200), from 0.75 to 1.25. **Unrest** below 50 (next row). |
| **Military** | The world's capacity to fight and replace: crews, training, yards. | **Navy rebuild**: conquest's line speed × (0.5 + M/100). **Repair**: site mending × (0.5 + M/100). |
| **Religion** | How strongly the people hold to their god and festivals. | **Steadiness**: shocks to government and military × (1.25 − R/200), so a devout world takes a blow better. Under occupation it turns against the occupier (1.6). |
| **Economy** | Trade, food, money, workshops. | **Works output**: conquest's 0.1/s × richness × (0.5 + E/100). **Prices** at the world's shops × (1.25 − E/200). **Income** to the player from a world they control × (0.5 + E/100). |

**Unrest** is not a fifth meter; it falls out of government: 0 at government 50 and above, rising to 1 at
government 10. Unrest means strikes: works output and income × (1 − 0.5 × unrest), navy rebuild × (1 − 0.3 × unrest).

Considered and left out: **population** (it would only scale economy, which already does that job), **stability**
(that is government), **tech** (a slow economy-driven tech tier is a good later meter, but it needs arsenal's tiers to
mean anything; open question 3).

### 1.2 How a meter moves

Each meter drifts toward a **target** and closes half the gap every **3 minutes** of flight time (a people's
temperament can speed or slow one meter). On top of that, losses hit as **shocks**: instant drops.

**Target** = the people's own base + what every **working** site and building gives + the situation:

| Situation | Effect on targets |
|---|---|
| Under attack (a hostile ship in the orbit zone) | the rally: military +10, religion +5, economy −10 (some peoples rally differently) |
| Blockaded (conquest: the player in orbit, none of the world's ships alive) | economy −15 |
| Each resource cut off (needed, neither made nor imported, stock spent) | economy −5 |
| Hunger | government −0.5 for every point economy is below 40 |
| The lifeline lost (1.5) | government −15, economy −20, while it is lost |

The base is set so that a world at peace with every site working sits exactly at its **starting meters** (the
numbers in each world's section). So peace is steady, and any change is the player's doing.

**Shocks** (each scaled by the people's temperament; government and military shocks also by religion's steadiness):

| What happens | Shock |
|---|---|
| A fighter lost | military −1 |
| A cruiser lost | military −3, government −1 |
| The capital ship lost | military −10, government −5 |
| A battery lost (captured or wrecked) | military −3 |
| Works lost | economy −3 |
| Foundry lost | government −3, military −5 |
| Shipyard or fort lost | government −5, military −8 |
| City lost | government −10, economy −5 |
| Capital lost | government −35, religion −5 |
| The lifeline goes down | government −15, economy −15 |

A **suppressed** site (conquest: at half structure) stops giving its targets but causes no shock; only losing it does.

### 1.3 City types

Conquest gives each world one capital and one city. Each has one of five city types, which say what it holds:

| City type | Core buildings | Its job |
|---|---|---|
| **Seat** | palace or council, temple | the capital where government lives or dies |
| **Court** | palace, games, treasury | a royal or imperial court city: ceremony, money, favour |
| **Market** | market, treasury | a port or trading city: the economy's heart |
| **Sanctuary** | sanctuary, temple | a holy city: religion first, pilgrims' money second |
| **Colony** | market, barracks | a planted town of settlers or veterans by the works |

### 1.4 Building types and what each gives

Every site gives a little just by working, and every building inside it adds its type's effect. Each world's
signature buildings are these eleven types under their own names (a few are stronger or weaker than the type; their
numbers are in their world's table).

**Sites** (conquest's kinds), while working:

| Site | Gives |
|---|---|
| Capital | government +10 |
| City | economy +5 |
| Fort | military +10 |
| Shipyard | military +8, economy +2 |
| Foundry | military +5, economy +2 |
| Works | economy +3 × richness (at most +6) |
| Battery | military +3 |

**Buildings:**

| Type | Gives | What it is |
|---|---|---|
| **Palace** | government +12 | the seat of whoever rules |
| **Council** | government +8, religion +2 | where the ruled are heard: senate, assembly, college |
| **Temple** | religion +10 | the god of the world and its festivals |
| **Sanctuary** | religion +15, economy +4 | a great shrine others visit and pay |
| **Games** | government +5, religion +3, economy −2 | theatre, hippodrome, arena: content people, at a cost |
| **Market** | economy +10 | agora, forum, harbour |
| **Treasury** | economy +6, government +4 | mint and vaults |
| **Academy** | economy +4, government +3 | schools, libraries, archives |
| **Barracks** | military +10 | training and housing soldiers and crews |
| **Walls** | military +6, government +2 | fortifications |
| **Lifeline** | economy +6, government +4 | what keeps the people alive here (1.5) |

### 1.5 The lifeline

Every colony except Earth lives inside one machine that its world's physics demands. Lose it and the world is in
mortal danger, whatever else is standing. It is the one building a player can aim for to crack a world without
fighting through its forts.

| World | Lifeline | Why this one |
|---|---|---|
| Earth | none | the only world where people live in the open |
| Moon | the Cold Traps (Shackleton works) | water and air from polar ice; nothing else on the Moon gives them |
| Mercury | the Rail Power (Mirror Fields works) | the walking city must keep moving at about 3.6 km/h or the dawn takes it (LORE.md) |
| Venus | **power** (a resource, not a site) | the cloud cities buy their power from Mercury; cut it off, by blockade or by taking Mercury, and they sink |
| Mars | Aqua Borealis (works) | water from the polar cap: drink, air, the greening of Mars |
| Jupiter | the Fusion Halls (works) | at 0.037 of Earth's sunlight, all light and heat is fusion |
| Saturn (Titan) | the Methane Burners (works) | heat at −179 °C |

### 1.6 War, conquest and the player

- **Breaking the patrol** costs military (shocks) and starts the rally. Killing each rebuilt ship keeps military down.
- **Blockade** (the patrol dead, the player in orbit) cuts economy at once and, after the stock runs out (the run uses
  five minutes), cuts every import (−5 economy each). Hunger then drags government.
- **Taking or wrecking** sites removes what they gave and lands a shock. The capital is the big one.
- **Conquest** (conquest's control rule: capital held, no fort the natives') resets the world: government and
  military fall to at most 20 and the meters now describe **the player's hold** on it:
  - government's target = 25 + half of what the held buildings give − **resolve** × (religion − 40) / 2. A devout
    people resists a conqueror, the more so the higher its resolve (each world's section);
  - military = half the base plus half the held sites (the garrison);
  - economy = half the base plus half the held sites;
  - religion keeps its target: the temples still stand and the people keep their god. Religion no longer steadies
    the rulers, because the rulers are not theirs.
- **Effects that reach the player**: on an enemy world, its build, repair, works and capture-hold multipliers (1.1);
  on a held world, the income multiplier and unrest.

### 1.7 The seam with conquest (what is wired, what waits)

Conquest is uncommitted, so nothing is wired into it. The seam is three calls, all in `src/lib/planets/state.ts`:

1. Conquest tells this layer what each site is doing: `conquestStatus(owner, suppressed)` turns its `SiteState` into
   `working | suppressed | held | wrecked`; plus `underAttack`, `blockaded` and the cut-off resources.
2. Conquest reports events: `applyEvent(p, { kind: 'shipLost' | 'siteLost' | 'controlled' })`.
3. Each tick `stepPlanet(p, dt, situation)` returns `Effects`, and conquest multiplies its own numbers:
   `build` × line speed, `repair` × mend rate, `works` × works output, `hold` × capture hold time; `income` ×
   a held world's pay.

The requests to conquest are in the notes folder, `planets-to-conquest.md`.

---

## 2. The seven worlds

Each section stands alone: culture, architecture, city types and signature buildings, temperament, starting meters.
Site names are conquest's. **Sources**: ancient authors are cited by book and section from memory; they were not
reopened this session, so check a citation before it goes into anything public. Physical facts are LORE.md's (NASA
fact sheets) unless marked.

### 2.1 Earth: the Humans

**Culture.** The mother city, the Metropolis, in the Greek sense: colonies owed it honour, not obedience. Thucydides
tells how Corcyra refused its mother city Corinth the customary honours and the quarrel helped start the
Peloponnesian War (Thucydides 1.25). Earth is that quarrel, seven times over. Its government is the **Charter
Council**, where Earth's old nations each keep a seat, with an executive in Government House: a council of states,
not a throne. Religion is plural and quiet; the one civic cult every faith agreed to share is **Gaia**, the Earth
Mother, whom Hesiod makes the first being after Chaos (Hesiod, *Theogony* 116–117), and Rome honoured as Tellus.

**Architecture.** Today's cities, older and denser: glass, steel and stone in the open air, the only people in the
system who live outdoors. The style is today's navies and agencies grown up (art direction: brass, gunmetal, blue
bands). Pharos Yard keeps the name of Alexandria's lighthouse (Strabo 17.1.6).

**Cities and signature buildings.**

| Site | City type | Buildings |
|---|---|---|
| The Metropolis (capital) | Seat | **The Charter Council** (council) · **Government House** (palace, government +8: ministries, not a throne) · **The Great Library** (academy) · **The Temple of Gaia** (temple, religion +6) |
| Port Charter (city) | Market | **The Exchange** (market, economy +14) · **The Charter Bank** (treasury: lends to the colonies; most owe it) |
| Charter Guard (fort) | | **The Guard Academy** (barracks) |

**Temperament.** *Deep reserves*: the largest, oldest economy. Economy shocks halved; cut-off resources cost half.
**No lifeline.** Resolve **0.5**: the least devout people resist an occupier least.

**Starting meters.** Government 60 · Military 60 · Religion 35 · Economy 80.

### 2.2 The Moon: the Selenitai

**Culture.** A temple-state of scholars, copied from Delphi (LORE.md), now **Selene's**. Delphi was the navel of the
world, marked by the omphalos stone (Pausanias 10.16.3); its sanctuary held the cities' treasuries along the Sacred
Way (Pausanias 10.11) and was protected by the Amphictyony, a league of peoples sworn to defend it (Aeschines, *On the
Embassy* 115). The Selenitai keep all three. Their oracle is Selene's: the goddess of the Moon, who in the *Homeric
Hymn to Selene* (Hymn 32) bathes in the ocean and drives her shining team across the sky. Her Hall of Answers looks up
at the Earth, which never moves in the near-side sky. The **College of the Prophetai** (at Delphi, the prophetai
framed the oracle's answers) governs.

**Architecture.** At 0.165 g, colonnades of tall thin columns that could never stand on Earth, cut into crater walls,
roofed with regolith against radiation; living halls underground, the Hall of Answers open to the sky. White
ceramic and polished silver, mirrors to carry light through the two-week night (art direction: the temple fleet).

**Cities and signature buildings.**

| Site | City type | Buildings |
|---|---|---|
| The Omphalos (capital) | **Sanctuary** | **The Hall of Answers** (sanctuary, religion +20, economy +8: every nation pays to ask) · **The Omphalos Stone** (temple) · **The College of the Prophetai** (council, government +10, religion +4) · **The Archive** (academy) · **The Stadium of Selene** (games, every four Earth years, open to all) |
| Treasury Row (city) | Market | **Treasury Row** (treasury, economy +10, government +2: every nation's vault) · **The Sacred Way** (market, economy +6) |
| The Temenos Wall (fort) | | **The Temenos Wall** (walls: the only wall they ever built) |
| Shackleton Cold Traps (works) | | **The Cold Traps** (lifeline) |

**Temperament.** *Sanctuary*: an attack is sacrilege. Under attack religion rallies +15 (not +5), military only +5.
Military shocks ×1.5: no warrior tradition. Resolve **1.5**: the hardest world in the system to hold.
**Lifeline:** the Cold Traps.

**Starting meters.** Government 60 · Military 30 · Religion 85 · Economy 65.

### 2.3 Mercury: the Hemerodromoi

**Culture.** Sparta, on rails, under **Hermes**. Hermes is the god of roads, messengers and runners (the
day-runners' own name is Herodotus's word for couriers like Pheidippides, Herodotus 6.105), and the Greeks set up
his herms at the roadside. His shrine rides with the city. Government is Sparta's: **two kings** and five **ephors**
elected each year to watch them (Plutarch, *Lycurgus* 7), a council of elders, and every citizen trained in the
**agoge** (Plutarch, *Lycurgus* 16–18) and fed at the **syssitia**, the common messes (Plutarch, *Lycurgus* 10–12).
The **perioikoi**, free people who were not citizens, did the trades.

**Architecture.** Low, heavy, on wheels and rails; nothing taller than it needs to be. Thucydides says a stranger
would never guess Sparta's power from its plain buildings and scattered villages (Thucydides 1.10). And **no walls**:
Sparta's men were its walls (Plutarch, *Lycurgus* 19). The walking city of Lakedaimon stays in the twilight, moving
at about walking pace (LORE.md); mirrored sunshades face the dawn behind it. Dark bronze, black iron, gold rims.

**Cities and signature buildings.**

| Site | City type | Buildings |
|---|---|---|
| Lakedaimon, the walking city (capital) | Seat | **The Two Thrones** (palace, government +10) · **The Ephorate** (council, government +10) · **The Shrine of Hermes Hodios** (temple: Hermes of the road) · **The Syssitia** (barracks, military +8, government +4) |
| The Perioikoi Rail-towns (city) | Colony | **The Rail-towns' Workshops** (market, economy +8) |
| The Agoge (fort) | | **The Agoge** (barracks, military +14, government +2) |
| Thermopylae Line (fort) | | none: a line of men, not a wall |
| Day-side Mirror Fields (works) | | **The Rail Power** (lifeline) |

**Temperament.** *The march*: while the Spartans rule, military never falls below 40. Resolve **1**.
**Lifeline:** the Mirror Fields: if the rails lose power, the city stops and the dawn takes it.

**Starting meters.** Government 65 · Military 85 · Religion 55 · Economy 55.

### 2.4 Venus: the Nephelai

**Culture.** Byzantium in the clouds, under **Aphrodite**. Their goddess is Aphrodite Ourania, "heavenly", born of
the sky (Hesiod, *Theogony* 188–200; Plato, *Symposium* 180d–e for the name): fitting for a people who live in the
air. Government is the Byzantine court: an **Autokrator** in a Sacred Palace of ceremony (the court rites are set out
in Constantine VII's *Book of Ceremonies*), city guilds under the Eparch (the *Book of the Eparch*, Leo VI), a foreign
guard sworn to the ruler alone, and the **Hippodrome**, whose Blues and Greens were political parties. In AD 532 they
rioted together and half burned the city (Procopius, *Wars* 1.24): LORE.md's Nika Burning.

**Architecture.** Floating cities at 50–55 km where, outside source, the air is near Earth's pressure and
temperature; breathable air is a lifting gas in the CO₂ around them (outside source), so every city hangs under its
envelope like a chandelier. Domes inside domes, gold mosaic, green glass, as Procopius describes the great dome of
Constantinople seeming to hang from heaven (Procopius, *Buildings* 1.1.46). Every kilo must be lifted: light frames,
fabric, gold leaf rather than gold.

**Cities and signature buildings.**

| Site | City type | Buildings |
|---|---|---|
| Nephelokokkygia (capital) | Court | **The Sacred Palace** (palace, government +14) · **The Temple of Aphrodite Ourania** (temple, religion +12) · **The Hippodrome** (games, government +8, economy −2) · **The Mese** (market: the great street) |
| Blachernae (city) | Court | **The Blachernae Palace** (palace, government +6: the heir's) · **The Guilds of the Eparch** (market, economy +12) |
| The Varangian Station (fort) | | **The Varangian Guard** (barracks) |

**Temperament.** *Court*: government shocks ×1.5 (every loss is a succession crisis), but economy recovers 1.5× as
fast. Resolve **1**. **Lifeline: power**, bought from Mercury. A blockade long enough to spend the stock, or taking
Mercury, brings the cloud cities down: in the run (section 3) Venus is the world a siege alone breaks.

**Starting meters.** Government 55 · Military 45 · Religion 60 · Economy 75.

### 2.5 Mars: the Quirites

**Culture.** The Roman Republic, on **Mars**' own world. Mars was the father of Romulus and Remus (Livy 1.4), so the
Quirites are, by their own story, the god's children. Augustus built the temple of **Mars Ultor**, the Avenger, and
kept the legions' standards there (Augustus, *Res Gestae* 21, 29). The state cult beside it: Vesta's fire, which must
never go out (Livy 1.20), and the gates of **Janus**, open in war and shut in peace (Livy 1.19; *Res Gestae* 13).
Government: Senate, two consuls, tribunes with a veto (Polybius 6.11–18 on the mixed constitution).

**Architecture.** Arches, concrete and roads on a grid; towns and camps laid out to one plan (Polybius 6.27–32 on the
camp). Under rock and thick domes, because Mars has no magnetic field (LORE.md). Water comes down an aqueduct from the
polar cap, as Frontinus describes Rome's (Frontinus, *De aquaeductu*), and Vitruvius's rules for building hold (book
8 on water). Grey stone and steel, sparing red (art direction: the galactic-empire look is built in, not covered).

**Cities and signature buildings.**

| Site | City type | Buildings |
|---|---|---|
| The Quirinal (capital) | Seat | **The Curia** (council, government +12, religion +2: the Senate) · **The Temple of Mars Ultor** (temple, religion +12) · **The Temple of Vesta** (temple, religion +6) · **The Gates of Janus** (temple, religion +6: never shut since the Secession) · **The Aerarium** (treasury) · **The Forum** (market) |
| Colonia Tharsis (city) | Colony | **The Colonia's Forum** (market, economy +8: a town of veterans) · **The Amphitheatre** (games) |
| Castra Prima (fort) | | **Castra Prima** (barracks) |
| Castra Secunda (fort) | | **Castra Secunda** (walls) |
| Aqua Borealis (works) | | **Aqua Borealis** (lifeline) |

**Temperament.** *The legions*: military shocks ×0.75 and military recovers 1.5× as fast; the Republic always raises
another legion (after Cannae it did, Livy 22–23). Resolve **1.25**: they fear a king, and the player is one.
**Lifeline:** Aqua Borealis.

**Starting meters.** Government 70 · Military 75 · Religion 55 · Economy 55.

### 2.6 Jupiter: the Diadochoi

**Culture.** The Hellenistic kings, under **Zeus**, king of the gods. Their kings ruled as Zeus ruled, and were
honoured as gods themselves: the Athenians sang a hymn to Demetrius the Besieger as a present god (Athenaeus 6.253).
The great Altar of Zeus at Pergamon was a king's offering. The court shows off: Ptolemy II's Grand Procession through
Alexandria (Athenaeus 5.196–203) and the Mouseion, a royal college and library (Strabo 17.1.8). Two houses, Ganymede
and Callisto, rival and married (LORE.md). Because the cult binds the god to the king, **the faith shakes when the
dynasty falls**.

**Architecture.** Palaces under ice domes on Ganymede and Callisto at 0.13–0.15 g; skylines of statues of the
founders; the four crowns on everything. Thick ice and regolith against Jupiter's radiation (outside source; Callisto
is the capital because it lies outside the worst of it). Near-black purple metal, violet plate, magenta seams (the
clawed violet-empire look, with the god built in).

**Cities and signature buildings.**

| Site | City type | Buildings |
|---|---|---|
| The Basileia of Callisto (capital) | Court | **The Basileia** (palace, government +16) · **The Altar of Zeus Basileus** (temple: Zeus the King, and the kings beside him) · **The Mouseion** (academy) · **The Grand Procession** (games) |
| The Court of Ganymede (city) | Court | **The Court of Ganymede** (palace, government +6: the other house) · **The Royal Mint** (treasury) |
| The Companions' Barracks (fort) | | **The Companions** (barracks, military +12) |
| The Io Prison-fort (fort) | | **The Io Prison-fort** (walls) |
| The Fusion Halls (works) | | **The Fusion Halls** (lifeline) |

**Temperament.** *Dynasty*: losing the capital shocks government and religion **twice** as hard. Resolve **0.75**:
when the king falls, so does much of the cult. **Lifeline:** the Fusion Halls.

**Starting meters.** Government 60 · Military 70 · Religion 55 · Economy 60.

### 2.7 Saturn (Titan): the Autochthones

**Culture.** Athens on Titan, under **Kronos**, Saturn's god. Kronos ruled the age of gold, before Zeus, when people
lived without masters or toil (Hesiod, *Works and Days* 109–120). Athens kept his festival, the **Kronia**, when
masters and slaves feasted together (Macrobius, *Saturnalia* 1.7.37, quoting Accius; 1.10.22), the Greek twin of
Rome's Saturnalia that LORE.md already gives them; and Pausanias saw a temple of Kronos and Rhea in Athens (Pausanias
1.18.7). A people who deny any master but the assembly worship the god of the age without masters. Government: the
**Ekklesia** on the Pnyx, every citizen voting, offices by lot from the *kleroterion* (Aristotle, *Constitution of the
Athenians* 43–44, 63–64), the rich paying for ships and festivals as **liturgies**.

**Architecture.** Titan's air is 1.6 times Earth's and its gravity 0.14 g, so people fly with strapped-on wings
(LORE.md): open halls, a *bema* in every settlement, tall thin towers to jump from. At −179 °C, everything is
insulated and heated by burning methane; the Long Walls join the Pnyx to the harbour so the city can always be fed
from the sea (Thucydides 1.107–108). Matte black, indigo, amber lights.

**Cities and signature buildings.**

| Site | City type | Buildings |
|---|---|---|
| The Pnyx (capital) | Seat | **The Ekklesia on the Pnyx** (council, government +14, religion +2) · **The Temple of Kronos and Rhea** (temple, religion +12) · **The Theatre** (games) · **The Stoa** (academy) |
| Piraeus (city) | Market | **The Emporion** (market, economy +14: the system's fuel market) · **The Liturgies** (treasury) |
| The Long Walls (fort) | | **The Long Walls** (walls, military +8, government +2) |
| The Methane Burners (works) | | **The Methane Burners** (lifeline) |

**Temperament.** *Assembly*: every ship lost costs **twice** the government (the assembly votes on the war, and
Athens punished its generals; Thucydides on the plague and Sicily), but government recovers 1.5× as fast. Resolve
**1.25**: a free people hates a master. **Lifeline:** the Methane Burners.

**Starting meters.** Government 75 · Military 45 · Religion 50 · Economy 70.

---

## 3. The headless run

`src/lib/planets/sim.ts` plays conquest's part with a fixed script, so these numbers come from the meters' rules
alone. Rerun with:

```bash
PLANETS_REPORT=1 npx vitest run --dir src src/lib/planets --silent=false
```

The script: **peace**, every site working for 30 minutes. **Attack**, a level-1 pilot kills the patrol in the first
two minutes (4 fighters, 2 cruisers, the capital ship), then every rebuilt ship as it launches; wrecks the batteries
at minute 5; suppresses the shipyard at 8 and wrecks it at 10; wrecks the foundry at 11; and sits in orbit. Blockade
from minute 2, imports cut off from minute 7. No city, fort or works is touched. **Conquered**, the attack until
minute 11, then the forts (12, 13), every works one a minute from 14, the city and the capital (control between
minutes 18 and 22 depending on the number of works), then the player holds the world to minute 60.

### 3.1 The bands, written before the run

| Band | Result |
|---|---|
| Peace: no meter drifts more than 1 in 30 minutes | pass (0 drift) |
| Attack, minute 30: economy 15 or more below start, military below start, government 20 or more | pass, all seven |
| Attack, minute 30: navy rebuild slower than at peace | pass, all seven |
| Conquered, minute 60: income × between 0.4 and 1.2 | pass (0.40 Moon to 0.78 Earth) |
| Conquered, minute 60: the Moon the most restless, Earth the least | pass |
| Every lifeline lost costs 15+ government within 5 minutes | pass, all six |
| At meters of 50, every effect exactly 1 (conquest plays as written) | pass |

### 3.2 The numbers

G = government, M = military, R = religion, E = economy. "Build ×" multiplies conquest's navy rebuild, "Works ×" its
works output, "Hold ×" the time to capture; "Income ×" a held world's pay to the player.

**Peace** (minute 0 and 30 are identical for every world):

| World | Gov | Mil | Rel | Econ | Build × | Works × | Hold × |
|---|---|---|---|---|---|---|---|
| Humans | 60 | 60 | 35 | 80 | 1.10 | 1.30 | 1.05 |
| Selenitai | 60 | 30 | 85 | 65 | 0.80 | 1.15 | 1.05 |
| Hemerodromoi | 65 | 85 | 55 | 55 | 1.35 | 1.05 | 1.07 |
| Nephelai | 55 | 45 | 60 | 75 | 0.95 | 1.25 | 1.02 |
| Quirites | 70 | 75 | 55 | 55 | 1.25 | 1.05 | 1.10 |
| Diadochoi | 60 | 70 | 55 | 60 | 1.20 | 1.10 | 1.05 |
| Autochthones | 75 | 45 | 50 | 70 | 0.95 | 1.20 | 1.13 |

**Under attack:**

| World | Minute | Gov | Mil | Rel | Econ | Build × | Works × | Hold × | Unrest |
|---|---|---|---|---|---|---|---|---|---|
| Humans | 5 | 55 | 45 | 38 | 66 | 1.05 | 1.16 | 1.03 | 0.00 |
| Humans | 10 | 53 | 42 | 40 | 55 | 1.01 | 1.05 | 1.04 | 0.00 |
| Humans | 30 | 60 | 51 | 40 | 46 | 1.01 | 0.96 | 1.05 | 0.00 |
| Selenitai | 5 | 56 | 12 | 95 | 51 | 0.71 | 1.01 | 1.04 | 0.00 |
| Selenitai | 10 | 54 | 8 | 99 | 35 | 0.69 | 0.85 | 1.04 | 0.00 |
| Selenitai | 30 | 51 | 19 | 100 | 21 | 0.69 | 0.71 | 1.00 | 0.00 |
| Hemerodromoi | 5 | 61 | 72 | 58 | 41 | 1.31 | 0.91 | 1.06 | 0.00 |
| Hemerodromoi | 10 | 55 | 68 | 60 | 23 | 1.27 | 0.73 | 1.05 | 0.00 |
| Hemerodromoi | 30 | 48 | 76 | 60 | 6 | 1.24 | 0.55 | 0.99 | 0.04 |
| Nephelai | 5 | 49 | 35 | 63 | 57 | 0.92 | 1.07 | 1.00 | 0.00 |
| Nephelai | 10 | 23 | 32 | 65 | 16 | 0.77 | 0.50 | 0.90 | 0.49 |
| Nephelai | 30 | 21 | 39 | 65 | 1 | 0.69 | 0.32 | 0.85 | 0.73 |
| Quirites | 5 | 66 | 73 | 58 | 41 | 1.28 | 0.91 | 1.08 | 0.00 |
| Quirites | 10 | 61 | 68 | 60 | 25 | 1.24 | 0.75 | 1.08 | 0.00 |
| Quirites | 30 | 56 | 69 | 60 | 11 | 1.19 | 0.61 | 1.03 | 0.00 |
| Diadochoi | 5 | 56 | 57 | 58 | 46 | 1.16 | 0.96 | 1.03 | 0.00 |
| Diadochoi | 10 | 52 | 53 | 60 | 33 | 1.12 | 0.83 | 1.04 | 0.00 |
| Diadochoi | 30 | 51 | 61 | 60 | 21 | 1.11 | 0.71 | 1.00 | 0.00 |
| Autochthones | 5 | 68 | 34 | 53 | 56 | 0.91 | 1.06 | 1.10 | 0.00 |
| Autochthones | 10 | 68 | 31 | 55 | 43 | 0.90 | 0.93 | 1.12 | 0.00 |
| Autochthones | 30 | 71 | 39 | 55 | 31 | 0.89 | 0.81 | 1.10 | 0.00 |

**Conquered** (control lands between minutes 18 and 22):

| World | Minute | Gov | Mil | Rel | Econ | Unrest | Income × |
|---|---|---|---|---|---|---|---|
| Humans | 18 | 57 | 32 | 40 | 35 | 0.00 | 0.86 |
| Humans | 20 | 13 | 20 | 35 | 29 | 0.93 | 0.42 |
| Humans | 30 | 37 | 20 | 35 | 37 | 0.33 | 0.73 |
| Humans | 60 | 40 | 20 | 35 | 38 | 0.24 | 0.78 |
| Selenitai | 20 | 0 | 4 | 92 | 9 | 1.00 | 0.29 |
| Selenitai | 30 | 2 | 8 | 86 | 28 | 1.00 | 0.39 |
| Selenitai | 60 | 4 | 8 | 85 | 30 | 1.00 | 0.40 |
| Hemerodromoi | 20 | 9 | 26 | 55 | 11 | 1.00 | 0.31 |
| Hemerodromoi | 30 | 27 | 32 | 55 | 24 | 0.59 | 0.52 |
| Hemerodromoi | 60 | 30 | 33 | 55 | 25 | 0.49 | 0.57 |
| Nephelai | 20 | 9 | 18 | 60 | 21 | 1.00 | 0.35 |
| Nephelai | 30 | 28 | 15 | 60 | 35 | 0.54 | 0.62 |
| Nephelai | 60 | 32 | 15 | 60 | 35 | 0.46 | 0.66 |
| Quirites | 20 | 5 | 24 | 55 | 7 | 1.00 | 0.29 |
| Quirites | 30 | 23 | 29 | 55 | 24 | 0.68 | 0.48 |
| Quirites | 60 | 27 | 29 | 55 | 25 | 0.58 | 0.54 |
| Diadochoi | 20 | 3 | 21 | 50 | 3 | 1.00 | 0.27 |
| Diadochoi | 30 | 32 | 25 | 55 | 26 | 0.45 | 0.59 |
| Diadochoi | 60 | 38 | 25 | 55 | 28 | 0.29 | 0.67 |
| Autochthones | 20 | 35 | 21 | 55 | 0 | 0.13 | 0.47 |
| Autochthones | 30 | 31 | 15 | 50 | 29 | 0.47 | 0.61 |
| Autochthones | 60 | 36 | 15 | 50 | 33 | 0.34 | 0.69 |

### 3.3 What the run says

- **Each world fails its own way.** Under the same attack Mercury's military stays near 70 (the agoge floor
  and the barracks), the Moon's falls to 8 while its religion climbs to 100, Mars loses half its economy but its
  government holds, and Saturn's assembly takes the ship losses hardest at first and recovers. That is the
  temperaments doing their job.
- **Venus is the world a siege breaks.** Five minutes after its power imports stop, its lifeline goes: government
  falls from 55 to 21, works to a third, unrest 0.73. A player who learns this can take Venus by sitting in orbit,
  or by taking Mercury.
- **Siege hits economy hardest.** Every world's economy falls 34–74 points in 30 minutes, mostly from the blockade and
  the cut imports. Mercury (four imports) and Venus (five) fall furthest; Earth (deep reserves) least. If this is too
  punishing, `RULES.cutOff` (−5 a resource) is the one number to soften.
- **Conquest pays less than the world is worth, for a while.** A held world settles at 0.40 (the Moon) to 0.78
  (Earth) of conquest's income. The Moon never settles: at resolve 1.5 and religion 85 its government stays near 0.
  That is a design choice, and question 1 below asks whether Caleb wants it.
- **What is not modelled**: the meters do not yet feed back into conquest (conquest is uncommitted), so the attack
  script does not slow when build × falls. When it is wired, a besieged world rebuilds more slowly than these tables
  assume, which only shortens sieges.

---

## 4. Code

`src/lib/planets/`, pure TypeScript, no rendering:

- `meters.ts`: the four meters, `RULES`, `effects()`, `unrest()`, `steadiness()`, `approach()`.
- `buildings.ts`: site-kind effects and shocks, the eleven building types, the five city types.
- `worlds.ts`: the seven worlds: starting meters, temperament, imports, and the buildings in each conquest site.
- `state.ts`: `newPlanet`, `targets`, `applyEvent`, `stepPlanet`, `conquestStatus`: the seam with conquest.
- `sim.ts`: the headless run and its report.
- `planets.test.ts`: 21 tests: the data matches conquest's site ids exactly, peace is steady, each temperament does
  what this file says, every lifeline bites, and the bands in 3.1.

---

## 5. Open questions for Caleb

1. Should a conquered world ever settle, or should a devout people (the Moon) resist forever unless the player does
   something (honour its temple, restore its college, pay its priests)?
2. Should the player be able to build in cities they hold (a temple, a market, walls), and spend resources to raise a
   meter?
3. Is a fifth meter, **tech**, worth having once arsenal's tiers are in: a slow meter that unlocks better ships for a
   world?
4. Is Earth's religion right: plural and quiet, with Gaia as the one shared civic cult?
5. Should a lifeline be something the player can strike directly (Venus's power, Titan's burners), or is that too
   easy a way to break a world?
6. Should meters show on the arrival card (four bars), or stay hidden and show only as effects?
7. Should the player's own home world have meters that the player's actions move (losses at home, trade)?
8. Are the city types right, or should each people have its own (a Roman colonia, a Greek polis, a Byzantine
   theme city)?

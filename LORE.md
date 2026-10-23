# Ascent Flight — the races

> **DRAFT, 2026-10-18; depth pass 2026-10-19** (governments, cultures, bases, ship classes, Earth's humans). A first
> pass for Caleb to react to, not canon. Every name, date and grudge here can change.
> History and myth only: no astrology, no planetary metals or days, no zodiac, no Hermetic ideas.
>
> The structured parts of each section (government, culture, bases, ship classes) are the same words as
> `src/lib/races.ts` `PEOPLES`, which the game reads, and the in-game codex (main menu or pause menu → Peoples of the
> System) shows with each people's portrait, emblem, home base and ship line-up.

## Where the facts come from

Every physical number below was read on 2026-10-18 from NASA's fact sheets (NSSDCA, Dr. David R. Williams, curator)
unless it is marked otherwise:

| Source | Last updated |
|---|---|
| [Planetary Fact Sheet, metric](https://nssdc.gsfc.nasa.gov/planetary/factsheet/) | 18 Mar 2025 |
| [Mercury](https://nssdc.gsfc.nasa.gov/planetary/factsheet/mercuryfact.html), [Venus](https://nssdc.gsfc.nasa.gov/planetary/factsheet/venusfact.html), [Moon](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) | 11 Jan 2024 |
| [Mars](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) | 19 May 2025 |
| [Jupiter](https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html) | 2 Oct 2024 |
| [Saturn](https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturnfact.html) | 18 Mar 2025 |
| [Jovian satellites](https://nssdc.gsfc.nasa.gov/planetary/factsheet/joviansatfact.html) | 6 Dec 2023 |
| [Saturnian satellites](https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturniansatfact.html) | 22 Jul 2025 |
| [NASA Science, Titan facts](https://science.nasa.gov/saturn/moons/titan/facts/) | 25 Apr 2025 |

| Home | Gravity (m/s², × Earth) | Sunlight (× Earth) | Length of day | Air at home | Temperature |
|---|---|---|---|---|---|
| Earth | 9.8 (1) | 1 | 24.0 h | 1 bar | 15 °C mean |
| Moon | 1.62 (0.165) | 1 | 708.7 h (synodic 29.53 d) | none (3 × 10⁻¹⁵ bar) | 95 K to 390 K at the equator |
| Mercury | 3.7 (0.38) | 6.674 | 4,222.6 h | none (< 5 × 10⁻¹⁵ bar) | 167 °C mean; 590–725 K sunward |
| Venus, surface | 8.9 (0.91) | 1.911 | 2,802.0 h | 92 bar, 96.5% CO₂ | 464 °C |
| Mars | 3.7 (0.38) | 0.431 | 24.66 h | 6.36 mb, 95.1% CO₂ | about −59 °C at Viking 1 |
| Ganymede / Callisto (Jupiter) | 1.43 / 1.24 (0.15 / 0.13) † | 0.037 | locked to Jupiter: 7.15 d / 16.69 d orbits | none listed | Jupiter at 1 bar: −108 °C |
| Titan (Saturn) | 1.35 (0.14) † | 0.011 | locked to Saturn: 15.95 d orbit | about 1.6 × Earth's, ~95% N₂ ~5% CH₄ | −179 °C |

† Not on the sheets. Worked out here from the sheets' mass and radius (g = GM/r²).

Things used below that are **not** on these pages, so they are marked "outside source" where they appear: the
Venus cloud layer at 50–55 km being near 1 bar and room temperature; Venus's sulphuric-acid clouds and fast-turning
upper air; Jupiter's radiation belts being harsh at Io and Europa and much milder at Callisto. All are widely
reported, but this session did not read them in a primary source.

**On bodies.** Real evolution needs far more generations than a few centuries of colonies. So in this draft the
peoples changed in three ways, and each section says which: **grown** (what a body does in that gravity and light
during one life; plausible, much of it seen in astronauts), **chosen** (gene editing the founders did on purpose;
fiction, but the kind of fiction the game needs), and **custom** (culture, not biology).

---

## A short history

**The Founding.** Earth's nations, working together for once, put people on the Moon, then Mars. They borrowed the
Greek word for it: each settlement was an *apoikia*, a "home away", and Earth was the *metropolis*, the mother city.
A Greek colony owed its mother city honour, not obedience. The founders wrote that into the charters without
thinking hard about what it would mean in three hundred years.

**The Spreading.** Venus's cloud cities came next, then the walking city on Mercury, then the stations on Jupiter's
outer moons, and last Titan, where the light from the Sun is about one per cent of Earth's and a message home takes
more than an hour.

**The Editing.** Bodies built for Earth broke down in low gravity. Bones thinned, hearts weakened, children born on
the Moon could not stand on Earth. The colonies chose, one by one, to edit their children for the worlds they lived
on. Earth did not. That is where "human" and "the others" began.

**The Sundering.** Each colony stopped asking the Metropolis for permission at a different time and for a different
reason. Some broke away by vote, some by war, one by simply not answering. Today seven nations hold the solar
system. Earth is still human, still the largest, and still thinks of itself as the mother city. Nobody else does.

---

## Earth — the Humans

**Name.** *Humans*, plainly. Earth never took a Greek or Latin name, because it never needed one: the charters called
it the *metropolis*, the mother city, and it still uses the word. One Human.

**Bodies.** Unedited, on purpose. Earth chose not to edit its children when the colonies did, and that choice is now
the thing Humans are proudest of. Gravity 1 g, sunlight 1, a 24-hour day. *Custom:* a Human visiting any colony
wears weights or gets dizzy; a colonist visiting Earth needs a frame or a wheelchair. Only the Nephelai (0.91 g)
can walk on Earth unaided, and they make a point of it.

**Society.** The Achaean League, grown up: Earth's old nations kept their flags and their votes and pooled one navy
under one elected commander. The League was formed to run the Founding and outlived it. It is slow, it argues,
and it is still the largest power in the system.

**Values and fears.** Treaties, the unedited body, being first. It fears that the colonies will combine against it,
and that a colony's editing will turn out to be the better choice.

**The others.** Earth thinks of every colony as a daughter. It holds the Moon close, hires Mercury, courts Venus,
fought Mars in the Secession and has not forgiven it, is flattered by Jupiter, and is ignored by Saturn.

**Look.** Blue and brass (nation colour `#3f7fd0`). Flight suits and uniforms in navy blue with a blue League band
and brass fittings. Architecture: glass towers, the space elevator at Quito, and ordinary cities, the only ones in
the system under an open sky.
*Ship materials:* brushed brass `#c9a14a` and gunmetal `#3a3f48`, blue bands and nav lights, blue engine plumes
([ART-DIRECTION.md](ART-DIRECTION.md), "Earth").

**Government: The Metropolitan League** (league). Model: The Achaean League: free cities sharing one army and one vote each.
- *Who rules.* Earth’s old nations, each with a vote in the Synedrion. A Strategos, elected for one year, commands the shared navy.
- *How power passes.* The Strategos serves one year and may not serve twice running. Member nations can leave the League; none has since the Secession.
- *How it goes to war.* The Synedrion votes for war by two thirds. Each nation sends ships under its own flag, and the Strategos fights them as one fleet.

**Culture.**
- *Customs.* Founding Day, when every nation lights a lamp for the colonies it sent out. The colonies do not light one back.
- *Belief.* Many faiths and none. What they share is a belief in the unedited body: being born as people always were.
- *Arts.* Film, music and the oldest museums in the system. Earth keeps the originals; everyone else has copies.
- *War and honour.* A navy that fights by treaty and rules of engagement, and is proud that it does.
- *Daily life.* Weather, oceans, a 24-hour day and a full gravity that no colonist can stand any more.

**Bases.**

| | Name | Where | |
|---|---|---|---|
| Capital | **Quito Skyport** (`earth-capital`) | Earth, on the equator, 2,850 m up in the Andes | The League sits at the foot of the space elevator. The equator gives the tether a straight climb to orbit, and the altitude puts a third of the air below the city. |
| Station | **Pharos Station** (`stn-earth-1`) | Earth orbit, at the top of the tether | A ring-and-spoke wheel in brushed steel with blue window bands: the lighthouse every colony ship sailed from. |
| Station | **Lagrange Yard** (`stn-earth-2`) | Earth orbit, the shipyard ring | The League’s navy yard. Metropolis carriers are built here in dry docks a kilometre long. |
| Outpost | **Clarke Belt Relays** (`earth-outpost-1`) | Geostationary orbit | A ring of relay stations that carries every message between Earth and the colonies. |

**Ship classes** (lengths against the player ship; looks follow [ART-DIRECTION.md](ART-DIRECTION.md)).

| Type | Class | id | Role | Length | Description |
|---|---|---|---|---|---|
| Capital | **Metropolis** | `earth-metropolis` | Carrier and flagship | 5× | A long lathed hull with three turned bands, a flat carrier deck and an island to starboard. Brass and gunmetal, four blue-plumed engine bells. |
| Cruiser | **Pathfinder** | `earth-pathfinder` | Courier and line cruiser | 1× | The brass courier every colony ship descends from: a lathed cigar with swept wings. The ship an Earth player flies. |
| Fighter | **Sparrow** | `earth-sparrow` | Carrier fighter | 0.2× | A miniature courier with one pair of swept wings, one engine and a bubble canopy. |
| Race-only | **Ark** | `earth-ark` | Colony ship | 3× | The ship that founded every colony, still built for new ones: a fat brass hull round a turning habitat ring. Unarmed. |

**Plot hooks.**
1. A League member votes to leave and take its share of the navy with it.
2. A colony asks to rejoin the League; the Synedrion cannot agree on the price.
3. The Ark being built at Lagrange Yard is for a colony no one has announced.

---

## The Moon — the Selenitai

**Name.** *Selenitai*, "Moon-dwellers", from Greek *selēnē*, the Moon. Lucian of Samosata used it in his *True
History* (2nd century AD) for the people of the Moon who go to war with the people of the Sun. One Selenite.

**Bodies.** At 0.165 g, children grow long. *Grown:* longer spines, thinner bones and smaller hearts (all seen in
astronauts), so a Selenite visiting Earth needs a frame to walk. *Chosen:* the editors kept their bones from thinning
further, but not enough for Earth; they never went that far, on purpose. *Custom:* the Moon's day is 708.7 hours,
two weeks of light and two of dark, so the Selenitai live by the clock, not the Sun, and keep Earth's 24 hours as a
religious duty.

**Society.** The first colony, built around the oldest observatory and the biggest archive off Earth. They copied
Delphi. The Earth never moves in the near-side sky (the Moon keeps one face to it), and the Selenitai made that
their *omphalos*, the navel of the world. They are a temple-state run by the **College of the Pythia**, scholars who
answer questions from every nation for a price, and by the **Amphictyony**, a council in which every nation has a
seat to protect the sanctuary. Like Delphi, they hold the other nations' **treasuries**: vaults under the Moon's
crust, each built in its owner's style.

**Values and fears.** Neutrality, records, the long view. They fear being made to choose a side, and the day an
oracle is proved wrong in public.

**Earth and the others.** Earth's oldest daughter, and closest. Earth thinks of the Moon as its own back yard and
the Selenitai know it. Everyone else trusts them a little and needs them a lot. Old grudge with Venus: the Blues and
the Greens (see the Nephelai).

**Look.** Pale blue and white (nation colour `#2f5fc4`). Long robes that hang straight in low gravity, laurel
wreaths of grown silver-leaf for office. Architecture: colonnades carved into crater walls, tall thin columns that
could never stand on Earth, and the Hall of Answers under the near side, its roof open to the Earth.
*Ship materials:* white marble ceramic `#e6e3da`, polished silver `#b8c0cc` and mirror; a pale blue halo on the engine ring.

**Government: The Sanctuary of the Pythia** (oracle state). Model: Delphi: a sanctuary run by its priests and guarded by a council of every Greek city.
- *Who rules.* The College of the Pythia, about three hundred scholars who answer any nation’s question for a fee. The Amphictyony, one seat per nation, guards the sanctuary.
- *How power passes.* Scholars are chosen by examination, not birth. The College elects the Pythia, its head and speaking voice, for life, from its own members.
- *How it goes to war.* The Selenitai almost never fight for themselves. The Amphictyony declares a Sacred War against anyone who attacks the sanctuary, and the other nations’ fleets fight it.

**Culture.**
- *Customs.* They live by Earth’s 24-hour clock through two weeks of light and two of dark. Ringing the hours is a holy duty.
- *Belief.* The two sayings carved over the Hall of Answers: “Know yourself” and “Nothing in excess.” Their faith is that a true record outlasts any empire.
- *Arts.* Calligraphy, star catalogues and very tall architecture: columns too thin to stand on Earth.
- *War and honour.* A Selenite’s honour is never to lie in an answer. An archivist caught forging a record is exiled to Earth, where they cannot walk.
- *Daily life.* Low gravity: children grow long, everyone glides, and robes hang straight. The Earth never moves in the sky.

**Bases.**

| | Name | Where | |
|---|---|---|---|
| Capital | **Pytho** (`moon-capital`) | The Moon, carved into the walls of Copernicus crater on the near side | Colonnades cut into a crater wall 3.8 km high, and the Hall of Answers under an open roof, with the Earth fixed overhead. |
| Station | **Tholos Station** (`stn-moon-1`) | Lunar orbit | A round temple in space: a ring of white columns round a domed core, open to the stars, with a silver dish on top. |
| Outpost | **The Treasuries** (`moon-outpost-1`) | Under the crust beside Pytho | A vault for every nation, each built in its owner’s style. The system’s money sleeps here. |
| Outpost | **Peaks of Light** (`moon-outpost-2`) | The rim of Shackleton crater, at the south pole | Solar towers on peaks that are almost always lit, over craters that are always dark and hold ice. |
| Outpost | **The Quiet Ear** (`moon-outpost-3`) | The far side | Radio telescopes on the side of the Moon that never hears Earth’s noise. |

**Ship classes** (lengths against the player ship; looks follow [ART-DIRECTION.md](ART-DIRECTION.md)).

| Type | Class | id | Role | Length | Description |
|---|---|---|---|---|---|
| Capital | **Thesauros** | `moon-thesauros` | Treasure ship and battery | 5× | A colonnade a kilometre long: two rows of white columns between plinths, sealed silver vaults between them, a pediment at the bow and one mirror ring for an engine. |
| Cruiser | **Lampas** | `moon-lampas` | Laser cruiser | 1× | A narrow white hull with a ring of mirror petals at the bow, opened like a lamp’s reflector. The ship a Selenite player flies. |
| Fighter | **Belone** | `moon-belone` | Interceptor | 0.2× | A white needle with four folded fins and a blue point of light at the tip. More lance than plane. |
| Race-only | **Theoros** | `moon-theoros` | Sacred envoy | 0.6× | The Pythia’s envoy ship, small and unarmed, with a laurel ring at the bow. Every nation has sworn to let it pass. |

**Plot hooks.**
1. The Pythia's answer to Mars about the coming war is leaked before Mars has paid for it.
2. A nation stops paying for its treasury; the Amphictyony votes on opening the vault.
3. A Selenite archivist finds a charter clause that says the Moon still belongs to Earth.

---

## Mercury — the Hemerodromoi

**Name.** *Hemerodromoi*, "day-runners", from Greek *hēmera* (day) and *dromos* (running): the long-distance
couriers of Greece, like Pheidippides. Here they run from the day itself. One Hemerodrome.

**Bodies.** Gravity 0.38 g and sunlight 6.674 times Earth's. *Chosen:* the darkest skin of any people, thick
eyelids with a second clear lid against glare. *Grown:* lean and long-legged from walking. *Custom:* everyone walks.

**The walking city.** Mercury's day lasts 4,222.6 hours. The planet's equator is about 15,330 km round, so the line
between day and night moves at about 3.6 km/h (worked out here from the sheet's radius and day length): walking
pace. Their city **Lakedaimon** rides on rails in that twilight and never stops. Ahead is the night, at well below
freezing; behind is the day at 590–725 K. A city that stops dies.

**Society.** Sparta. Two kings, one for the rails and one for the field, and five **ephors** elected each year to
watch them. Every child goes through the *agoge*, a training in endurance and discipline, ending with a run across
the terminator on foot. Solar power is their wealth: they sell it in beams and in banks to the whole system.

**Values and fears.** Endurance, the word kept, the march. They fear stopping, and the dawn.

**Earth and the others.** They see Earth as soft. They hire out as soldiers and couriers to anyone who pays, like
Greek mercenaries, which makes them everyone's ally and no one's. They sell most of their power to Venus, which
needs it, and they despise Venus for needing it.

**Look.** Gold and black (nation colour `#e3c52c`). Red-bronze cloaks, crested helmets kept for ceremony,
mirrored masks for the day side. Architecture: low, heavy, on wheels and rails, nothing taller than it needs to be.
*Ship materials:* dark bronze `#5a3d22`, black iron `#151210`, a gold rim on every shield; white-gold engines, short and wide.

**Government: The Rail and the Field** (diarchy). Model: Sparta: two kings at once, watched by five elected ephors.
- *Who rules.* Two kings rule together: the King of the Rail runs the walking city, the King of the Field leads the army. Five ephors, elected every Mercury year, can put either king on trial.
- *How power passes.* Each kingship passes in its own family, to the eldest child who finished the agoge. If none did, the ephors choose.
- *How it goes to war.* The ephors declare war; the King of the Field leads it in person. Companies hire out under contract, and a contract is kept even against their own people.

**Culture.**
- *Customs.* The Dawn Run: every child, at the end of training, runs across the terminator on foot ahead of the sunrise.
- *Belief.* Laconic speech and endurance. Say little, keep your word, keep walking. Stopping is the only sin they name.
- *Arts.* Marching songs, bronze-work and the shortest poems in the system. A three-word speech is a compliment.
- *War and honour.* A broken contract shames the whole company. A shield is brought home or its bearer is not.
- *Daily life.* Everyone walks with the city at 3.6 km/h, forever. Mirrored masks on the day side, sleep in shifts, sunlight sold in beams.

**Bases.**

| | Name | Where | |
|---|---|---|---|
| Capital | **Lakedaimon** (`mercury-capital`) | Mercury, on rails in the twilight band, always moving west | A low, heavy city on wheels that keeps pace with the terminator. Ahead is the night below freezing, behind is the day at 590–725 K. |
| Station | **Skias Station** (`stn-mercury-1`) | Mercury orbit | A low disc behind a mirrored sunshade that always faces the Sun. Nothing on it is taller than it needs to be. |
| Outpost | **The Cold Wells** (`mercury-outpost-1`) | Shadowed craters at the north pole | Ice mines in craters the Sun never reaches. Every drop the city drinks starts here. |
| Outpost | **Beam Towers** (`mercury-outpost-2`) | The day side | Solar farms that beam power to orbit. Venus buys most of it. |

**Ship classes** (lengths against the player ship; looks follow [ART-DIRECTION.md](ART-DIRECTION.md)).

| Type | Class | id | Role | Length | Description |
|---|---|---|---|---|---|
| Capital | **Hoplon** | `mercury-hoplon` | Shield-ship of the line | 5× | A great domed heat shield faces forward with a short drum hull hidden behind it, gun blisters round the rim. Dark bronze, a raised gold rim, white-gold engines. |
| Cruiser | **Embolon** | `mercury-embolon` | Ramming cruiser | 1× | A blunt wedge with a domed shield plate at the point, flown point-first at the enemy. The ship a Hemerodrome player flies. |
| Fighter | **Aspis** | `mercury-aspis` | Line fighter | 0.2× | A small round shield with one gun through the middle and one engine behind. A squadron from the front is a wall of discs. |
| Race-only | **Skytale** | `mercury-skytale` | Dispatch runner | 0.4× | The fastest hull in the system: a black rod wrapped in a spiral of gold fins, carrying sealed orders. Named for the Spartan message staff. |

**Plot hooks.**
1. A section of the rails breaks ahead of Lakedaimon; there are 300 hours to fix it before the dawn arrives.
2. A Hemerodrome company under contract to Earth is ordered to fight a company of its own people under contract to
   Mars.
3. The ephors find one of the kings has been selling power to Jupiter in secret.

---

## Venus — the Nephelai

**Name.** *Nephelai*, "the Clouds", from Greek *nephelē*; also the title of Aristophanes' comedy (423 BC). Their
capital is **Nephelokokkygia**, "Cloud-cuckoo-land", the city in the sky the birds build in Aristophanes' *Birds*.
They took the joke and made it their name. One Nephelan.

**Bodies.** At the surface Venus is 92 bar and 464 °C, so nobody lives there. They live in floating cities in the
cloud layer at 50–55 km where, outside source, the pressure and temperature are near Earth's surface. Gravity is
0.91 g: **the most Earth-like bodies of any race**. *Grown:* almost human. *Chosen:* small and light, because every
kilo has to be lifted; lungs and skin edited to stand the acid in the air (outside source: the clouds are sulphuric
acid). *Custom:* sunlight is 1.911 times Earth's; they veil.

**Society.** Byzantium. An **Autokrator** rules from the Sacred Palace in a court of endless ceremony, titles and
purple ink. Under the Autokrator, the cities are bound by bloodline and debt. Public life runs through the
**Hippodrome**, where racing factions, the **Greens** and the **Blues**, are also political parties, as they were in
Constantinople.

**Values and fears.** Grace, ceremony, staying aloft. They fear falling. A city that loses lift sinks into the heat.
Their worst punishment is to be "sent down".

**Earth and the others.** The Nephelai call themselves Earth's true heirs because their bodies changed least. Earth
finds them charming and does not trust them. They depend on Mercury's power and pay for it with art, luxury and
favour. Old grudge with the Moon: the Moon's people once ran the Blue faction and Venus the Greens, and in the
**Nika Burning** a race riot in the Hippodrome turned into a war that burned two cities. Neither side has forgiven it.

**Look.** Green and gold (nation colour `#1d8f5c`). Layered silks, veils, jewels on everything. Architecture: domes
inside domes, gold mosaics, the whole city hanging under its lifting envelope like a chandelier.
*Ship materials:* gold leaf `#c9a227`, green glass `#0f4a33` and enamel; long soft emerald engines.

**Government: The Sacred Palace** (autocracy). Model: Byzantium: one emperor, a court of titles, a Hippodrome where the factions speak.
- *Who rules.* The Autokrator, sole ruler, signing in purple ink. Under the throne, the cities are run by great families bound to it by titles and debt.
- *How power passes.* The Autokrator names a co-emperor while alive. With no co-emperor, whoever holds the palace and is acclaimed in the Hippodrome is crowned.
- *How it goes to war.* The Autokrator decides. Venus prefers to pay, marry or bribe its way out, and fights only when that fails, with fire ships and hired Hemerodrome companies.

**Culture.**
- *Customs.* Court ceremony for everything: titles, robes by rank, a set number of bows. Being “sent down” below the clouds is the worst punishment.
- *Belief.* A faith of icons and incense, and the belief that grace and order are what keep a city in the air.
- *Arts.* Gold mosaics, icon painting, silk and chariot racing in the Hippodrome between the Greens and the Blues.
- *War and honour.* Honour is rank and favour, held at court and lost there. A family that loses favour loses its city’s lift contracts.
- *Daily life.* Life on a floating city 50 km up, warm and near Earth’s pressure, under a sky of acid cloud. Veils against the glare; nothing is ever thrown away.

**Bases.**

| | Name | Where | |
|---|---|---|---|
| Capital | **Nephelokokkygia** (`venus-capital`) | Venus, floating in the cloud layer about 50–55 km up | Domes inside domes and gold mosaics, the whole city hanging under its lifting envelope like a chandelier. |
| Station | **Polykandelon** (`stn-venus-1`) | Venus orbit | A chandelier station: domes stacked and hung from a lifting ring, gold filigree on every one. |
| Outpost | **Chrysopolis** (`venus-outpost-1`) | The cloud layer, trailing the capital | The second cloud city, home of the Blue faction’s great families. |
| Outpost | **Maxwell Anchor** (`venus-outpost-2`) | Over Maxwell Montes | A mining tether hung over the highest, coolest ground on Venus, where the “sent down” work. |

**Ship classes** (lengths against the player ship; looks follow [ART-DIRECTION.md](ART-DIRECTION.md)).

| Type | Class | id | Role | Length | Description |
|---|---|---|---|---|---|
| Capital | **Palatine** | `venus-palatine` | Flagship and court | 5× | A floating palace: a wide gold teardrop under a green-glass dome, four onion domes, a lifting ring at the waist and a chapel spire at the stern. |
| Cruiser | **Dromon** | `venus-dromon` | Escort cruiser | 1× | A gold teardrop with fins in an X, two of them painted with icon panels. The ship a Nephelan player flies. |
| Fighter | **Smaragdos** | `venus-smaragdos` | Court fighter | 0.2× | A faceted green gem in a gold claw mount with two curled fins. Each pilot’s family paints its own. |
| Race-only | **Siphon** | `venus-siphon` | Fire ship | 0.8× | A gilded tube with a beast-headed nozzle that pours burning plasma at close range: Venus’s answer to boarders. |

**Plot hooks.**
1. The Autokrator dies without an heir; three cities each crown one.
2. A Nephelan city is losing lift and asks Earth, not Mercury, for help.
3. A chariot race between the Greens and the Blues is set, for the first time since the Nika Burning.

---

## Mars — the Quirites

**Name.** *Quirites*, the old formal name of the citizens of Rome when they met in assembly, from Quirinus, the god
of the Roman people (Romulus made a god in some stories). One Quirite.

**Bodies.** Gravity 0.38 g, sunlight 0.431 of Earth's, air of 6.36 millibars, no global magnetic field. *Grown:*
tall and long-limbed. *Chosen:* bones and heart kept close to human, because Mars meant to fight Earth if it had to;
eyes edited for low light. *Custom:* without a magnetic field to turn the radiation, they live under the rock and
under thick domes.

**Society.** The Roman Republic. A **Senate** of former magistrates, two **consuls** elected every Mars year (687
days), and tribunes who can veto. The **legions** are citizen soldiers. Their great work, and their civic religion,
is making Mars green, which they say will take another thousand years. The day is 24.66 hours, close to Earth's;
they are the only colonists who still live by the sun.

**Values and fears.** Duty (*pietas*), law, the long project. They fear a king. Any one person gathering too much
power is the oldest Martian nightmare.

**Earth and the others.** Mars broke away from Earth in a war, the **Secession**, and still says it is the true
Rome and Earth the decayed empire. Their great enemy is Jupiter: a republic against kings, as Rome fought Macedon.
They want the asteroid belt, which lies between them and Jupiter, and so does everyone else.

**Look.** Red and bronze (nation colour `#cc2131`). Tunics, red military cloaks, and the toga for the Senate.
Architecture: arches and concrete, aqueducts that carry melted ice, roads straight across the plains, the eagle
standards of the legions.
*Ship materials:* cold mid-grey steel `#8a8f96`, darker grey panels `#5d6269`, red only as one stripe or a numeral; ice-white engines in a flat bank.

**Government: The Martian Republic** (republic). Model: The Roman Republic: Senate, two consuls, tribunes with a veto.
- *Who rules.* The Senate of former magistrates advises; two consuls, elected every Mars year (687 days), command. Tribunes of the people can veto either.
- *How power passes.* Elections, every Mars year, by the assembly of citizens in their legions. No consul may hold office twice in ten years.
- *How it goes to war.* The Senate votes war, a consul takes command. In a crisis the Senate names a dictator for six months, and fears every one of them.

**Culture.**
- *Customs.* The Triumph: a victorious commander rides through Urbs Arsia with a slave at the commander’s ear, repeating that the commander is mortal.
- *Belief.* Pietas, duty to family, legion and Republic; Stoic calm. Their civic faith is the Greening, the thousand-year work of making Mars live.
- *Arts.* Engineering: aqueducts, roads and arches. Portrait busts of the dead, kept in every home.
- *War and honour.* A legion that loses its standard is disbanded. Kingship is the oldest Martian crime.
- *Daily life.* A 24.66-hour day, close to Earth’s. Life under rock and thick domes against radiation, and a long walk to see the sky.

**Bases.**

| | Name | Where | |
|---|---|---|---|
| Capital | **Urbs Arsia** (`mars-capital`) | Mars, in the lava tubes on the flank of Arsia Mons | A city of arches and concrete inside lava tubes, lit through the skylights where their roofs fell in. Rock overhead stops the radiation. |
| Station | **Castra Phobos** (`stn-mars-1`) | Mars orbit, near Phobos | A flat grey wedge-platform with a central tower and a hangar slot along one edge; white lights in rows. |
| Station | **Castra Deimos** (`stn-mars-2`) | Mars orbit, near Deimos | The second legionary camp, built to the same plan as the first, down to the numbering of the bunks. |
| Outpost | **Aqua Borealis** (`mars-outpost-1`) | From the north polar cap south | An aqueduct that carries melted ice from the pole to the cities. |
| Outpost | **Via Marineris** (`mars-outpost-2`) | Valles Marineris | A road along the floor of the great canyon, with a fort at each day’s march. |

**Ship classes** (lengths against the player ship; looks follow [ART-DIRECTION.md](ART-DIRECTION.md)).

| Type | Class | id | Role | Length | Description |
|---|---|---|---|---|---|
| Capital | **Rostrata** | `mars-rostrata` | Ship of the line | 5× | A flat grey dagger-wedge with a ram prow, stepped decks and a command tower at the stern. One plan from every yard; one thin red stripe. |
| Cruiser | **Corvus** | `mars-corvus` | Boarding cruiser | 1× | A smaller wedge with a spiked boarding bridge folded along its spine, for taking an enemy ship whole. The ship a Quirite player flies. |
| Fighter | **Velite** | `mars-velite` | Line fighter | 0.2× | A ball cockpit between two upright six-sided wing panels. Cheap, plain and flown in squadrons of eight. |
| Race-only | **Testudo** | `mars-testudo` | Assault lander | 1.5× | A box of overlapping armour plates that carries a cohort down to a planet or into a station. Named for the legion’s shield formation. |

**Plot hooks.**
1. A popular general wins the belt war and marches on the Senate.
2. The terraforming project needs ice from Saturn's rings, and Saturn says no.
3. A consul proposes a treaty with Earth that would make the Secession a mistake.

---

## Jupiter — the Diadochoi

**Name.** *Diadochoi*, "the successors", from Greek *diadechesthai*, to take over. The generals who split Alexander's
empire after he died. One Diadoch.

**Where they live.** Not on Jupiter: the gravity is 23.1 m/s² at the reference level (25.92 at 1 bar) and the air is
hydrogen and helium, so nothing breathable floats. They live on the big moons. Ganymede and Callisto are the homes;
Callisto is the capital because, outside source, it sits outside the worst of Jupiter's radiation belts. Europa is
mined for ice; Io is a prison.

**Bodies.** Gravity 0.13–0.15 g and sunlight 0.037 of Earth's. *Chosen:* very large eyes, the most sensitive of any
people, and pale skin; they cannot stand full sunlight. Radiation-repair genes (fiction). *Grown:* very tall and
slight; the tallest people in the system. *Custom:* Jupiter dominates their sky, and the court counts time in its
moons' orbits.

**Society.** The founding governor of the Jupiter colonies died without naming an heir. His four generals each took
a moon and a crown. Two kingdoms remain strong, the **House of Ganymede** and the **House of Callisto**, each ruled by
a Basileus with Macedonian phalanx armies and a court of companions. They are always at war with each other or
married to each other.

**Values and fears.** Glory, lineage, the crown. They fear being forgotten, and each other.

**Earth and the others.** They respect Earth more than anyone does, as one dynasty respects an older one, and would
like to marry into it. Their enemy is Mars, which calls them tyrants and wants the belt. They trade with Saturn, the
only people farther out, and quietly think Saturn belongs to them.

**Look.** Purple and silver (nation colour `#7442ad`). Purple-dyed cloaks, diadems, armour for show. Architecture:
palaces under ice domes, a skyline of statues of the founders, the four crowns carved on everything.
*Ship materials:* near-black purple metal `#24133a`, violet plate `#4a2a78`, magenta seams `#ff2fd0`; magenta-to-violet engines.

**Government: The Two Crowns** (kingdoms). Model: The Hellenistic kingdoms after Alexander: kings, companions and a phalanx.
- *Who rules.* Two kings, each a Basileus: the House of Callisto and the House of Ganymede. Each rules with a council of Companions, the noble pilots.
- *How power passes.* A king names an heir, but the crown goes to whoever the army acclaims. Brothers, widows and generals all try.
- *How it goes to war.* The king leads in person from the flagship. The two houses fight each other more than anyone else, and stop to fight Mars together.

**Culture.**
- *Customs.* Founders’ Day, when the four crowns are carried through the ice palaces. Royal weddings between the houses end wars, and start them.
- *Belief.* Kleos, glory that outlives you. The four founders are honoured as heroes, with statues on every skyline.
- *Arts.* Giant statues, epic poetry recited at court, and the largest ships ever built, each meant to outdo the last.
- *War and honour.* To be forgotten is the worst end. A Companion who flees a battle has their name chiselled off the walls.
- *Daily life.* Dim light at 0.037 of Earth’s, Jupiter filling the sky, time counted in the moons’ orbits, life under ice domes.

**Bases.**

| | Name | Where | |
|---|---|---|---|
| Capital | **Kallistopolis** (`jupiter-capital`) | Callisto, in the Valhalla basin | Palaces under ice domes in the great ringed crater, a skyline of statues of the founders, and Jupiter hanging overhead. Callisto lies outside the worst radiation. |
| Station | **First Crown** (`stn-jupiter-1`) | Jupiter system, off Callisto | A spiked crown: a dark core ring with four great upswept prongs, violet windows and magenta seams. |
| Station | **Second Crown** (`stn-jupiter-2`) | Jupiter system, off Ganymede | The House of Ganymede’s crown station, built a little taller than the first on purpose. |
| Station | **Third Crown** (`stn-jupiter-3`) | Jupiter system, off Europa | The ice-mining crown, shared by the two houses when they are at peace and fought over when they are not. |
| Outpost | **Ganymedeia** (`jupiter-outpost-1`) | Ganymede | The rival royal seat, on the largest moon in the system. |
| Outpost | **Tartaros** (`jupiter-outpost-2`) | Io | The prison moon, in Jupiter’s radiation, among the volcanoes. |

**Ship classes** (lengths against the player ship; looks follow [ART-DIRECTION.md](ART-DIRECTION.md)).

| Type | Class | id | Role | Length | Description |
|---|---|---|---|---|---|
| Capital | **Tessarakonteres** | `jupiter-tessarakonteres` | Royal flagship | 5× | A faceted spine with two crescent claws sweeping forward past the prow, raked blades on top, and a throne room lit violet. Near-black purple, magenta seams. |
| Cruiser | **Sarissa** | `jupiter-sarissa` | Spinal-gun cruiser | 1× | A long faceted spine with a railgun as long as the hull and two small claws at the bow. The ship a Diadoch player flies. |
| Fighter | **Hetairos** | `jupiter-hetairos` | Companion fighter | 0.2× | A narrow fuselage with forward-swept wings hooked down like talons, flown by nobles and armed to the teeth. |
| Race-only | **Helepolis** | `jupiter-helepolis` | Siege ship | 3× | A tiered tower of armour and guns for breaking stations. Named for the siege tower of a successor king. |

**Plot hooks.**
1. A marriage between the two houses is arranged; Mars wants the wedding stopped.
2. A prisoner escapes from Io claiming to be the founding governor's lost heir.
3. The Callisto king asks Earth to recognise him as king of all Jupiter.

---

## Saturn — the Autochthones

**Name.** *Autochthones*, "sprung from the land itself", from Greek *autos* (self) and *chthōn* (earth, soil).
The Athenians said they had always lived in Attica and had come from nowhere else. The Titan-born say the same.
One Autochthon.

**Where they live.** Titan, Saturn's largest moon: gravity about 0.14 g, air about 1.6 times Earth's pressure, mostly
nitrogen with some methane, at −179 °C, with lakes and seas of liquid methane and ethane. They need warmth and oxygen
but no pressure suit. Saturn's sunlight is 0.011 of Earth's.

**Bodies.** *Chosen:* very large dark eyes, heat-holding bodies with thick fat and dense fur-like body hair
(fiction). *Grown:* tall and light. Thick air and low gravity together make human-powered flight possible with
strapped-on wings (worked out from the numbers above; flying on Titan this way is a well-known idea, and plausible).
*Custom:* they fly to the assembly.

**Society.** Athens. All citizens meet in the **Ekklesia**, the assembly, and vote directly. Most offices are filled
by lot, as in Athens, by a machine they still call the *kleroterion*. Once a Titan year they hold **Saturnalia**, the
Roman festival when masters serve their servants and everything is upside down. Their wealth is the hydrocarbon
seas: fuel and plastics for everyone.

**Values and fears.** Freedom of speech, equality, being left alone. They fear Earth's reach, and losing the vote.

**Earth and the others.** Saturn is the most distant and most isolated: a message to Earth takes more than an hour
(worked out from the mean distances). They did not secede; they simply stopped answering, and now deny they came
from Earth at all. They sell fuel to everyone, side with whoever respects them, and do not like the Diadochoi
calling them "our cousins".

**Look.** Deep indigo and amber (nation colour `#33307a`). Plain dress for citizens, fur and wing-harness, a
painted owl-eye on assembly days. Architecture: open halls, a speaker's platform (the *bema*) in every settlement,
tall thin towers for jumping off.
*Ship materials:* matte black composite `#16161e`, indigo `#2a2850`, amber running lights; amber engines, thin and very long.

**Government: The Ekklesia of Titan** (democracy). Model: Athens: every citizen votes in the assembly; most offices by lot.
- *Who rules.* The Ekklesia, every citizen, meeting on the Pnyx and voting directly. A council of five hundred, chosen by lot, prepares the business.
- *How power passes.* No one inherits anything. Offices are filled by lot from all citizens, each year. Only the ten generals are elected.
- *How it goes to war.* The assembly votes war or peace, often by a handful of votes. The ten generals command by turns, a day each.

**Culture.**
- *Customs.* Saturnalia, once a Titan year: masters serve servants, the lot picks a mock king, and everything is upside down.
- *Belief.* Free speech, questions in the agora, and the belief that they were born of Titan itself and came from nowhere else.
- *Arts.* Theatre, comedy above all; owl-eye painting; flight, with wings strapped on in the thick cold air.
- *War and honour.* A citizen speaks in the assembly and serves when the lot falls on them. Refusing is the shame.
- *Daily life.* Orange haze at noon, 0.011 of Earth’s sunlight, methane rain, and flying to the assembly.

**Bases.**

| | Name | Where | |
|---|---|---|---|
| Capital | **Astu** (`saturn-capital`) | Titan, on the shore of Kraken Mare | Open halls, tall towers to jump from, and the Pnyx above a sea of liquid methane. They need warmth and oxygen, not pressure suits. |
| Station | **Bema Station** (`stn-saturn-1`) | Saturn system, off Titan | A tall thin tower with an open speaker’s hall at the top, wings of solar fins and amber lights. |
| Station | **Stoa Station** (`stn-saturn-2`) | Saturn system, at the rings | A long colonnade of docks where ring-ice skimmers unload. |
| Station | **Prytaneion** (`stn-saturn-3`) | Saturn system, off Enceladus | The council’s far hearth, by the geysers where Titan takes its water. |
| Outpost | **Ligeia Rigs** (`saturn-outpost-1`) | Ligeia Mare, Titan | Floating rigs on a hydrocarbon sea: the fuel and plastics Saturn sells to everyone. |

**Ship classes** (lengths against the player ship; looks follow [ART-DIRECTION.md](ART-DIRECTION.md)).

| Type | Class | id | Role | Length | Description |
|---|---|---|---|---|---|
| Capital | **Trireme** | `saturn-trireme` | Long-range battleship | 5× | A long thin black spine with three banks of amber engines down each side, radiator fins out like oars and a painted eye beside the ram. |
| Cruiser | **Paralos** | `saturn-paralos` | Long-range raider | 1× | A low black hull with three fuel tanks along its spine, built to go far and come back. The ship an Autochthon player flies. Named for Athens’s state ship. |
| Fighter | **Glaux** | `saturn-glaux` | Glider fighter | 0.2× | High wings on a slim pod with a small booster: a sailplane armed for war. Named for the owl of Athens. |
| Race-only | **Holkas** | `saturn-holkas` | Fuel tanker | 2× | A round-bellied merchant hull full of Titan’s fuel. Every nation’s fleet waits on one. |

**Plot hooks.**
1. The Ekklesia votes, by one vote, to stop selling fuel to Earth.
2. A Titan-born child is found to have an Earth birth record.
3. Jupiter offers protection; the assembly debates; the lot falls on a newcomer to argue the case.

---

## Who stands where (for battle and conquest)

| | Earth | Moon | Mercury | Venus | Mars | Jupiter | Saturn |
|---|---|---|---|---|---|---|---|
| **Earth** (human) | — | holds close | hires | courts | old war | flattered | ignored |
| **Moon** (Selenitai) | wary daughter | — | clients | Nika grudge | clients | clients | clients |
| **Mercury** (Hemerodromoi) | soft | bankers | — | customer, despised | hire | hire | far |
| **Venus** (Nephelai) | heirs | Nika grudge | needed | — | crude | gaudy rivals | far |
| **Mars** (Quirites) | decayed empire | useful | hire | decadent | — | **enemy** | wanted ice |
| **Jupiter** (Diadochoi) | elder dynasty | useful | hire | rivals | **enemy** | — | "cousins" |
| **Saturn** (Autochthones) | not our mother | useful | far | far | wary | wary | — |

---

## For the other threads (2026-10-19)

**Progression** (`claude/progression-0613e0`, `src/lib/progression/refs.ts` `RACE_REFS.ships`): swap the PLACEHOLDER
class names for `shipClassOf(nation, type).name` from `src/lib/races.ts`, or for these ids (`CLASS_IDS`):

| Nation | Capital | Cruiser | Fighter | Changed from the placeholder |
|---|---|---|---|---|
| Earth | `earth-metropolis` | `earth-pathfinder` | `earth-sparrow` | none |
| Moon | `moon-thesauros` | `moon-lampas` | `moon-belone` | Treasury → Thesauros, Lamp → Lampas, Needle → Belone |
| Mercury | `mercury-hoplon` | `mercury-embolon` | `mercury-aspis` | Wedge → Embolon |
| Venus | `venus-palatine` | `venus-dromon` | `venus-smaragdos` | Jewel → Smaragdos |
| Mars | `mars-rostrata` | `mars-corvus` | `mars-velite` | none |
| Jupiter | `jupiter-tessarakonteres` | `jupiter-sarissa` | `jupiter-hetairos` | none |
| Saturn | `saturn-trireme` | `saturn-paralos` | `saturn-glaux` | Raider → Paralos, Glider → Glaux |

Each people also has one race-only class (`kind: 'special'`): Ark, Theoros, Skytale, Siphon, Testudo, Helepolis,
Holkas. Nothing flies them yet.

**Stations and moons** (`claude/stations-moons-629924`): each station there (`stn-<home>-<n>`) has a name here, as a
base of kind `station` with the same id, in the same order. Its label could read the name.

**Where this lore asks ART-DIRECTION.md to change.** Only names. The art direction kept progression's placeholder
names; seven of them were English words for Greek peoples and are now Greek (table above), so `STYLES[n].names` in
`styles/index.ts` and the class names in each section of ART-DIRECTION.md would follow. No shape, colour or material
changes. The race-only classes have no reference model yet; the codex draws them in SVG from the descriptions.

## Open questions for Caleb

1. Do the colonies speak Greek and Latin, or only borrow the names?
2. How long ago was the Founding: three centuries, a thousand years?
3. Is the editing the line between "human" and "not", and does Earth look down on it or fear it?
4. Should Mars really be the main enemy, or should every nation be equally hostile at the start?
5. Should a race own more than its planet (Mars the belt, Jupiter its four moons, Saturn the rings)?
6. Does Earth have a culture of its own in this game, or is it plain modern humanity?
7. Do the Selenitai treasuries become the game's bank?
8. Should Mercury's walking city be something the player can see and visit?
9. Are any of these names wrong for you: Selenitai, Hemerodromoi, Nephelai, Quirites, Diadochoi, Autochthones?
10. Should the cultures stay one-to-one with Greek and Roman history, or drift further into their own thing?
11. *(2026-10-19)* Seven class names changed from English to Greek (Thesauros, Lampas, Belone, Embolon, Smaragdos,
    Paralos, Glaux). Keep them, or go back to the English?
12. Each people has a race-only extra ship (Ark, Theoros, Skytale, Siphon, Testudo, Helepolis, Holkas). Should these
    be flyable or buildable, and does conquest use the Testudo and the Helepolis?
13. Earth's government is a league (the Achaean model). Is that the Earth you want, or should Earth be one state?
14. The Moon's Pythia answers questions for a fee. That is scholarship, not prophecy, in this draft. Is that right?

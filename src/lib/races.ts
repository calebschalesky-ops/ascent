/**
 * Races: the peoples the colonies became. One for each non-player nation; Earth stays human. A DRAFT for Caleb to
 * react to: the lore behind these lines is in LORE.md.
 *
 * `RACES` is the six colony races (unchanged since 95c3dbf, so other branches keep working). `PEOPLES` is all seven
 * nations, Earth's humans first, with the structured fields the rest of the game reads: government, bases and ship
 * classes. The long prose for each is in LORE.md; the codex page (components/codex) shows both.
 */
import type { NationId } from './nations';

export interface Race { id: NationId; name: string; demonym: string; home: NationId; line: string }

export const RACES: Race[] = [
  { id: 'moon', name: 'Selenitai', demonym: 'Selenite', home: 'moon',
    line: 'The oldest colony: a temple-state of scholars who keep the Archive, the Oracle and every nation’s treasury.' },
  { id: 'mercury', name: 'Hemerodromoi', demonym: 'Hemerodrome', home: 'mercury',
    line: 'Spartan day-runners whose city walks the twilight line forever, ahead of the dawn.' },
  { id: 'venus', name: 'Nephelai', demonym: 'Nephelan', home: 'venus',
    line: 'A Byzantine court in floating cloud cities, where falling is the worst fate there is.' },
  { id: 'mars', name: 'Quirites', demonym: 'Quirite', home: 'mars',
    line: 'A Roman republic of Senate and legions that broke from Earth by war and calls itself the true Rome.' },
  { id: 'jupiter', name: 'Diadochoi', demonym: 'Diadoch', home: 'jupiter',
    line: 'Rival successor-kings on Jupiter’s moons, always at war with one another or married to one another.' },
  { id: 'saturn', name: 'Autochthones', demonym: 'Autochthon', home: 'saturn',
    line: 'An Athenian democracy on Titan that stopped answering Earth and now denies it ever came from there.' },
];

export const raceOf = (id: NationId): Race | undefined => RACES.find((r) => r.id === id);

export const RACE_NAME = Object.fromEntries(RACES.map((r) => [r.id, r.name])) as Record<Exclude<NationId, 'earth'>, string>;

// ---------------------------------------------------------------------------------------------------------------
// Depth: government, culture, bases and ships for every nation, Earth included (a new game can start as any).
// ---------------------------------------------------------------------------------------------------------------

/** As on the ship-types branch (src/lib/shipTypes.ts). On merge: `export type { ShipType } from './shipTypes'`. */
export type ShipType = 'capital' | 'cruiser' | 'fighter';
export const SHIP_TYPES: ShipType[] = ['capital', 'cruiser', 'fighter'];
/** Every class is one of the three types, or a race-only extra. */
export type ClassKind = ShipType | 'special';
/** Length against the player ship: capital 5×, cruiser 1×, fighter 0.2× (ship types). Specials give their own. */
export const TYPE_LENGTH: Record<ShipType, number> = { capital: 5, cruiser: 1, fighter: 0.2 };

/** `<nation>-<name>`, lower case. These are the ids progression swaps its PLACEHOLDER class names for. */
export type ShipClassId = `${NationId}-${string}`;

export interface ShipClass {
  id: ShipClassId;
  kind: ClassKind;
  name: string;
  /** What it does in a fleet, in a few words. */
  role: string;
  /** Length in player-ship lengths. */
  length: number;
  /** One or two sentences: what it is and how it looks (ART-DIRECTION.md). */
  line: string;
}

/** Each government is a different type, drawn from a Greek or Roman model. */
export type GovernmentType = 'league' | 'oracle-state' | 'diarchy' | 'autocracy' | 'republic' | 'kingdoms' | 'democracy';

export interface Government {
  type: GovernmentType;
  /** What its people call it. */
  name: string;
  /** The ancient model it copies. */
  model: string;
  rulers: string;
  succession: string;
  war: string;
}

export interface Culture {
  customs: string;
  belief: string;
  arts: string;
  honour: string;
  daily: string;
}

/** `capital`: the home city. `station`: one per station on the stations branch, in order (stn-<home>-<n>). */
export type BaseKind = 'capital' | 'station' | 'outpost';
export interface Base { id: string; kind: BaseKind; name: string; where: string; line: string }

/** Colours for the codex art, from ART-DIRECTION.md's table (hull, panel, accent, engine) plus two of the people's own. */
export interface Palette { accent: string; hull: string; panel: string; glow: string; cloth: string; skin: string }

export interface People {
  nation: NationId;
  name: string;
  demonym: string;
  /** A short title for the codex header. */
  epithet: string;
  line: string;
  government: Government;
  culture: Culture;
  bases: Base[];
  ships: ShipClass[];
  palette: Palette;
}

const ship = (nation: NationId, kind: ClassKind, name: string, role: string, line: string, length?: number): ShipClass => ({
  id: `${nation}-${name.toLowerCase().replace(/[^a-z]+/g, '-')}` as ShipClassId,
  kind, name, role, line,
  length: length ?? TYPE_LENGTH[kind as ShipType],
});

export const PEOPLES: People[] = [
  {
    nation: 'earth', name: 'Humans', demonym: 'Human', epithet: 'The Mother City',
    line: 'Still the largest nation, still unedited, and still sure it is everyone’s mother city. Nobody else agrees.',
    government: {
      type: 'league', name: 'The Metropolitan League', model: 'The Achaean League: free cities sharing one army and one vote each',
      rulers: 'Earth’s old nations, each with a vote in the Synedrion. A Strategos, elected for one year, commands the shared navy.',
      succession: 'The Strategos serves one year and may not serve twice running. Member nations can leave the League; none has since the Secession.',
      war: 'The Synedrion votes for war by two thirds. Each nation sends ships under its own flag, and the Strategos fights them as one fleet.',
    },
    culture: {
      customs: 'Founding Day, when every nation lights a lamp for the colonies it sent out. The colonies do not light one back.',
      belief: 'Many faiths and none. What they share is a belief in the unedited body: being born as people always were.',
      arts: 'Film, music and the oldest museums in the system. Earth keeps the originals; everyone else has copies.',
      honour: 'A navy that fights by treaty and rules of engagement, and is proud that it does.',
      daily: 'Weather, oceans, a 24-hour day and a full gravity that no colonist can stand any more.',
    },
    bases: [
      { id: 'earth-capital', kind: 'capital', name: 'Quito Skyport', where: 'Earth, on the equator, 2,850 m up in the Andes',
        line: 'The League sits at the foot of the space elevator. The equator gives the tether a straight climb to orbit, and the altitude puts a third of the air below the city.' },
      { id: 'stn-earth-1', kind: 'station', name: 'Pharos Station', where: 'Earth orbit, at the top of the tether',
        line: 'A ring-and-spoke wheel in brushed steel with blue window bands: the lighthouse every colony ship sailed from.' },
      { id: 'stn-earth-2', kind: 'station', name: 'Lagrange Yard', where: 'Earth orbit, the shipyard ring',
        line: 'The League’s navy yard. Metropolis carriers are built here in dry docks a kilometre long.' },
      { id: 'earth-outpost-1', kind: 'outpost', name: 'Clarke Belt Relays', where: 'Geostationary orbit',
        line: 'A ring of relay stations that carries every message between Earth and the colonies.' },
    ],
    ships: [
      ship('earth', 'capital', 'Metropolis', 'Carrier and flagship',
        'A long lathed hull with three turned bands, a flat carrier deck and an island to starboard. Brass and gunmetal, four blue-plumed engine bells.'),
      ship('earth', 'cruiser', 'Pathfinder', 'Courier and line cruiser',
        'The brass courier every colony ship descends from: a lathed cigar with swept wings. The ship an Earth player flies.'),
      ship('earth', 'fighter', 'Sparrow', 'Carrier fighter',
        'A miniature courier with one pair of swept wings, one engine and a bubble canopy.'),
      ship('earth', 'special', 'Ark', 'Colony ship',
        'The ship that founded every colony, still built for new ones: a fat brass hull round a turning habitat ring. Unarmed.', 3),
    ],
    palette: { accent: '#3f7fd0', hull: '#c9a14a', panel: '#3a3f48', glow: '#2659ff', cloth: '#29466e', skin: '#9a6a4a' },
  },
  {
    nation: 'moon', name: 'Selenitai', demonym: 'Selenite', epithet: 'Keepers of the Archive',
    line: RACES[0].line,
    government: {
      type: 'oracle-state', name: 'The Sanctuary of the Pythia', model: 'Delphi: a sanctuary run by its priests and guarded by a council of every Greek city',
      rulers: 'The College of the Pythia, about three hundred scholars who answer any nation’s question for a fee. The Amphictyony, one seat per nation, guards the sanctuary.',
      succession: 'Scholars are chosen by examination, not birth. The College elects the Pythia, its head and speaking voice, for life, from its own members.',
      war: 'The Selenitai almost never fight for themselves. The Amphictyony declares a Sacred War against anyone who attacks the sanctuary, and the other nations’ fleets fight it.',
    },
    culture: {
      customs: 'They live by Earth’s 24-hour clock through two weeks of light and two of dark. Ringing the hours is a holy duty.',
      belief: 'The two sayings carved over the Hall of Answers: “Know yourself” and “Nothing in excess.” Their faith is that a true record outlasts any empire.',
      arts: 'Calligraphy, star catalogues and very tall architecture: columns too thin to stand on Earth.',
      honour: 'A Selenite’s honour is never to lie in an answer. An archivist caught forging a record is exiled to Earth, where they cannot walk.',
      daily: 'Low gravity: children grow long, everyone glides, and robes hang straight. The Earth never moves in the sky.',
    },
    bases: [
      { id: 'moon-capital', kind: 'capital', name: 'Pytho', where: 'The Moon, carved into the walls of Copernicus crater on the near side',
        line: 'Colonnades cut into a crater wall 3.8 km high, and the Hall of Answers under an open roof, with the Earth fixed overhead.' },
      { id: 'stn-moon-1', kind: 'station', name: 'Tholos Station', where: 'Lunar orbit',
        line: 'A round temple in space: a ring of white columns round a domed core, open to the stars, with a silver dish on top.' },
      { id: 'moon-outpost-1', kind: 'outpost', name: 'The Treasuries', where: 'Under the crust beside Pytho',
        line: 'A vault for every nation, each built in its owner’s style. The system’s money sleeps here.' },
      { id: 'moon-outpost-2', kind: 'outpost', name: 'Peaks of Light', where: 'The rim of Shackleton crater, at the south pole',
        line: 'Solar towers on peaks that are almost always lit, over craters that are always dark and hold ice.' },
      { id: 'moon-outpost-3', kind: 'outpost', name: 'The Quiet Ear', where: 'The far side',
        line: 'Radio telescopes on the side of the Moon that never hears Earth’s noise.' },
    ],
    ships: [
      ship('moon', 'capital', 'Thesauros', 'Treasure ship and battery',
        'A colonnade a kilometre long: two rows of white columns between plinths, sealed silver vaults between them, a pediment at the bow and one mirror ring for an engine.'),
      ship('moon', 'cruiser', 'Lampas', 'Laser cruiser',
        'A narrow white hull with a ring of mirror petals at the bow, opened like a lamp’s reflector. The ship a Selenite player flies.'),
      ship('moon', 'fighter', 'Belone', 'Interceptor',
        'A white needle with four folded fins and a blue point of light at the tip. More lance than plane.'),
      ship('moon', 'special', 'Theoros', 'Sacred envoy',
        'The Pythia’s envoy ship, small and unarmed, with a laurel ring at the bow. Every nation has sworn to let it pass.', 0.6),
    ],
    palette: { accent: '#2f5fc4', hull: '#e6e3da', panel: '#b8c0cc', glow: '#9ab8ff', cloth: '#f2efe6', skin: '#e9dccb' },
  },
  {
    nation: 'mercury', name: 'Hemerodromoi', demonym: 'Hemerodrome', epithet: 'The Day-Runners',
    line: RACES[1].line,
    government: {
      type: 'diarchy', name: 'The Rail and the Field', model: 'Sparta: two kings at once, watched by five elected ephors',
      rulers: 'Two kings rule together: the King of the Rail runs the walking city, the King of the Field leads the army. Five ephors, elected every Mercury year, can put either king on trial.',
      succession: 'Each kingship passes in its own family, to the eldest child who finished the agoge. If none did, the ephors choose.',
      war: 'The ephors declare war; the King of the Field leads it in person. Companies hire out under contract, and a contract is kept even against their own people.',
    },
    culture: {
      customs: 'The Dawn Run: every child, at the end of training, runs across the terminator on foot ahead of the sunrise.',
      belief: 'Laconic speech and endurance. Say little, keep your word, keep walking. Stopping is the only sin they name.',
      arts: 'Marching songs, bronze-work and the shortest poems in the system. A three-word speech is a compliment.',
      honour: 'A broken contract shames the whole company. A shield is brought home or its bearer is not.',
      daily: 'Everyone walks with the city at 3.6 km/h, forever. Mirrored masks on the day side, sleep in shifts, sunlight sold in beams.',
    },
    bases: [
      { id: 'mercury-capital', kind: 'capital', name: 'Lakedaimon', where: 'Mercury, on rails in the twilight band, always moving west',
        line: 'A low, heavy city on wheels that keeps pace with the terminator. Ahead is the night below freezing, behind is the day at 590–725 K.' },
      { id: 'stn-mercury-1', kind: 'station', name: 'Skias Station', where: 'Mercury orbit',
        line: 'A low disc behind a mirrored sunshade that always faces the Sun. Nothing on it is taller than it needs to be.' },
      { id: 'mercury-outpost-1', kind: 'outpost', name: 'The Cold Wells', where: 'Shadowed craters at the north pole',
        line: 'Ice mines in craters the Sun never reaches. Every drop the city drinks starts here.' },
      { id: 'mercury-outpost-2', kind: 'outpost', name: 'Beam Towers', where: 'The day side',
        line: 'Solar farms that beam power to orbit. Venus buys most of it.' },
    ],
    ships: [
      ship('mercury', 'capital', 'Hoplon', 'Shield-ship of the line',
        'A great domed heat shield faces forward with a short drum hull hidden behind it, gun blisters round the rim. Dark bronze, a raised gold rim, white-gold engines.'),
      ship('mercury', 'cruiser', 'Embolon', 'Ramming cruiser',
        'A blunt wedge with a domed shield plate at the point, flown point-first at the enemy. The ship a Hemerodrome player flies.'),
      ship('mercury', 'fighter', 'Aspis', 'Line fighter',
        'A small round shield with one gun through the middle and one engine behind. A squadron from the front is a wall of discs.'),
      ship('mercury', 'special', 'Skytale', 'Dispatch runner',
        'The fastest hull in the system: a black rod wrapped in a spiral of gold fins, carrying sealed orders. Named for the Spartan message staff.', 0.4),
    ],
    palette: { accent: '#e3c52c', hull: '#5a3d22', panel: '#151210', glow: '#ffb000', cloth: '#8e3a22', skin: '#3a2418' },
  },
  {
    nation: 'venus', name: 'Nephelai', demonym: 'Nephelan', epithet: 'The Cloud Court',
    line: RACES[2].line,
    government: {
      type: 'autocracy', name: 'The Sacred Palace', model: 'Byzantium: one emperor, a court of titles, a Hippodrome where the factions speak',
      rulers: 'The Autokrator, sole ruler, signing in purple ink. Under the throne, the cities are run by great families bound to it by titles and debt.',
      succession: 'The Autokrator names a co-emperor while alive. With no co-emperor, whoever holds the palace and is acclaimed in the Hippodrome is crowned.',
      war: 'The Autokrator decides. Venus prefers to pay, marry or bribe its way out, and fights only when that fails, with fire ships and hired Hemerodrome companies.',
    },
    culture: {
      customs: 'Court ceremony for everything: titles, robes by rank, a set number of bows. Being “sent down” below the clouds is the worst punishment.',
      belief: 'A faith of icons and incense, and the belief that grace and order are what keep a city in the air.',
      arts: 'Gold mosaics, icon painting, silk and chariot racing in the Hippodrome between the Greens and the Blues.',
      honour: 'Honour is rank and favour, held at court and lost there. A family that loses favour loses its city’s lift contracts.',
      daily: 'Life on a floating city 50 km up, warm and near Earth’s pressure, under a sky of acid cloud. Veils against the glare; nothing is ever thrown away.',
    },
    bases: [
      { id: 'venus-capital', kind: 'capital', name: 'Nephelokokkygia', where: 'Venus, floating in the cloud layer about 50–55 km up',
        line: 'Domes inside domes and gold mosaics, the whole city hanging under its lifting envelope like a chandelier.' },
      { id: 'stn-venus-1', kind: 'station', name: 'Polykandelon', where: 'Venus orbit',
        line: 'A chandelier station: domes stacked and hung from a lifting ring, gold filigree on every one.' },
      { id: 'venus-outpost-1', kind: 'outpost', name: 'Chrysopolis', where: 'The cloud layer, trailing the capital',
        line: 'The second cloud city, home of the Blue faction’s great families.' },
      { id: 'venus-outpost-2', kind: 'outpost', name: 'Maxwell Anchor', where: 'Over Maxwell Montes',
        line: 'A mining tether hung over the highest, coolest ground on Venus, where the “sent down” work.' },
    ],
    ships: [
      ship('venus', 'capital', 'Palatine', 'Flagship and court',
        'A floating palace: a wide gold teardrop under a green-glass dome, four onion domes, a lifting ring at the waist and a chapel spire at the stern.'),
      ship('venus', 'cruiser', 'Dromon', 'Escort cruiser',
        'A gold teardrop with fins in an X, two of them painted with icon panels. The ship a Nephelan player flies.'),
      ship('venus', 'fighter', 'Smaragdos', 'Court fighter',
        'A faceted green gem in a gold claw mount with two curled fins. Each pilot’s family paints its own.'),
      ship('venus', 'special', 'Siphon', 'Fire ship',
        'A gilded tube with a beast-headed nozzle that pours burning plasma at close range: Venus’s answer to boarders.', 0.8),
    ],
    palette: { accent: '#1d8f5c', hull: '#c9a227', panel: '#0f4a33', glow: '#1dbf6c', cloth: '#1f7a50', skin: '#d9b08c' },
  },
  {
    nation: 'mars', name: 'Quirites', demonym: 'Quirite', epithet: 'The Senate and the Legions',
    line: RACES[3].line,
    government: {
      type: 'republic', name: 'The Martian Republic', model: 'The Roman Republic: Senate, two consuls, tribunes with a veto',
      rulers: 'The Senate of former magistrates advises; two consuls, elected every Mars year (687 days), command. Tribunes of the people can veto either.',
      succession: 'Elections, every Mars year, by the assembly of citizens in their legions. No consul may hold office twice in ten years.',
      war: 'The Senate votes war, a consul takes command. In a crisis the Senate names a dictator for six months, and fears every one of them.',
    },
    culture: {
      customs: 'The Triumph: a victorious commander rides through Urbs Arsia with a slave at the commander’s ear, repeating that the commander is mortal.',
      belief: 'Pietas, duty to family, legion and Republic; Stoic calm. Their civic faith is the Greening, the thousand-year work of making Mars live.',
      arts: 'Engineering: aqueducts, roads and arches. Portrait busts of the dead, kept in every home.',
      honour: 'A legion that loses its standard is disbanded. Kingship is the oldest Martian crime.',
      daily: 'A 24.66-hour day, close to Earth’s. Life under rock and thick domes against radiation, and a long walk to see the sky.',
    },
    bases: [
      { id: 'mars-capital', kind: 'capital', name: 'Urbs Arsia', where: 'Mars, in the lava tubes on the flank of Arsia Mons',
        line: 'A city of arches and concrete inside lava tubes, lit through the skylights where their roofs fell in. Rock overhead stops the radiation.' },
      { id: 'stn-mars-1', kind: 'station', name: 'Castra Phobos', where: 'Mars orbit, near Phobos',
        line: 'A flat grey wedge-platform with a central tower and a hangar slot along one edge; white lights in rows.' },
      { id: 'stn-mars-2', kind: 'station', name: 'Castra Deimos', where: 'Mars orbit, near Deimos',
        line: 'The second legionary camp, built to the same plan as the first, down to the numbering of the bunks.' },
      { id: 'mars-outpost-1', kind: 'outpost', name: 'Aqua Borealis', where: 'From the north polar cap south',
        line: 'An aqueduct that carries melted ice from the pole to the cities.' },
      { id: 'mars-outpost-2', kind: 'outpost', name: 'Via Marineris', where: 'Valles Marineris',
        line: 'A road along the floor of the great canyon, with a fort at each day’s march.' },
    ],
    ships: [
      ship('mars', 'capital', 'Rostrata', 'Ship of the line',
        'A flat grey dagger-wedge with a ram prow, stepped decks and a command tower at the stern. One plan from every yard; one thin red stripe.'),
      ship('mars', 'cruiser', 'Corvus', 'Boarding cruiser',
        'A smaller wedge with a spiked boarding bridge folded along its spine, for taking an enemy ship whole. The ship a Quirite player flies.'),
      ship('mars', 'fighter', 'Velite', 'Line fighter',
        'A ball cockpit between two upright six-sided wing panels. Cheap, plain and flown in squadrons of eight.'),
      ship('mars', 'special', 'Testudo', 'Assault lander',
        'A box of overlapping armour plates that carries a cohort down to a planet or into a station. Named for the legion’s shield formation.', 1.5),
    ],
    palette: { accent: '#cc2131', hull: '#8a8f96', panel: '#5d6269', glow: '#bfefff', cloth: '#a8232c', skin: '#c48f6a' },
  },
  {
    nation: 'jupiter', name: 'Diadochoi', demonym: 'Diadoch', epithet: 'The Successor Kings',
    line: RACES[4].line,
    government: {
      type: 'kingdoms', name: 'The Two Crowns', model: 'The Hellenistic kingdoms after Alexander: kings, companions and a phalanx',
      rulers: 'Two kings, each a Basileus: the House of Callisto and the House of Ganymede. Each rules with a council of Companions, the noble pilots.',
      succession: 'A king names an heir, but the crown goes to whoever the army acclaims. Brothers, widows and generals all try.',
      war: 'The king leads in person from the flagship. The two houses fight each other more than anyone else, and stop to fight Mars together.',
    },
    culture: {
      customs: 'Founders’ Day, when the four crowns are carried through the ice palaces. Royal weddings between the houses end wars, and start them.',
      belief: 'Kleos, glory that outlives you. The four founders are honoured as heroes, with statues on every skyline.',
      arts: 'Giant statues, epic poetry recited at court, and the largest ships ever built, each meant to outdo the last.',
      honour: 'To be forgotten is the worst end. A Companion who flees a battle has their name chiselled off the walls.',
      daily: 'Dim light at 0.037 of Earth’s, Jupiter filling the sky, time counted in the moons’ orbits, life under ice domes.',
    },
    bases: [
      { id: 'jupiter-capital', kind: 'capital', name: 'Kallistopolis', where: 'Callisto, in the Valhalla basin',
        line: 'Palaces under ice domes in the great ringed crater, a skyline of statues of the founders, and Jupiter hanging overhead. Callisto lies outside the worst radiation.' },
      { id: 'stn-jupiter-1', kind: 'station', name: 'First Crown', where: 'Jupiter system, off Callisto',
        line: 'A spiked crown: a dark core ring with four great upswept prongs, violet windows and magenta seams.' },
      { id: 'stn-jupiter-2', kind: 'station', name: 'Second Crown', where: 'Jupiter system, off Ganymede',
        line: 'The House of Ganymede’s crown station, built a little taller than the first on purpose.' },
      { id: 'stn-jupiter-3', kind: 'station', name: 'Third Crown', where: 'Jupiter system, off Europa',
        line: 'The ice-mining crown, shared by the two houses when they are at peace and fought over when they are not.' },
      { id: 'jupiter-outpost-1', kind: 'outpost', name: 'Ganymedeia', where: 'Ganymede',
        line: 'The rival royal seat, on the largest moon in the system.' },
      { id: 'jupiter-outpost-2', kind: 'outpost', name: 'Tartaros', where: 'Io',
        line: 'The prison moon, in Jupiter’s radiation, among the volcanoes.' },
    ],
    ships: [
      ship('jupiter', 'capital', 'Tessarakonteres', 'Royal flagship',
        'A faceted spine with two crescent claws sweeping forward past the prow, raked blades on top, and a throne room lit violet. Near-black purple, magenta seams.'),
      ship('jupiter', 'cruiser', 'Sarissa', 'Spinal-gun cruiser',
        'A long faceted spine with a railgun as long as the hull and two small claws at the bow. The ship a Diadoch player flies.'),
      ship('jupiter', 'fighter', 'Hetairos', 'Companion fighter',
        'A narrow fuselage with forward-swept wings hooked down like talons, flown by nobles and armed to the teeth.'),
      ship('jupiter', 'special', 'Helepolis', 'Siege ship',
        'A tiered tower of armour and guns for breaking stations. Named for the siege tower of a successor king.', 3),
    ],
    palette: { accent: '#7442ad', hull: '#24133a', panel: '#4a2a78', glow: '#ff2fd0', cloth: '#4b1f7a', skin: '#e8e2f0' },
  },
  {
    nation: 'saturn', name: 'Autochthones', demonym: 'Autochthon', epithet: 'Sprung from Titan',
    line: RACES[5].line,
    government: {
      type: 'democracy', name: 'The Ekklesia of Titan', model: 'Athens: every citizen votes in the assembly; most offices by lot',
      rulers: 'The Ekklesia, every citizen, meeting on the Pnyx and voting directly. A council of five hundred, chosen by lot, prepares the business.',
      succession: 'No one inherits anything. Offices are filled by lot from all citizens, each year. Only the ten generals are elected.',
      war: 'The assembly votes war or peace, often by a handful of votes. The ten generals command by turns, a day each.',
    },
    culture: {
      customs: 'Saturnalia, once a Titan year: masters serve servants, the lot picks a mock king, and everything is upside down.',
      belief: 'Free speech, questions in the agora, and the belief that they were born of Titan itself and came from nowhere else.',
      arts: 'Theatre, comedy above all; owl-eye painting; flight, with wings strapped on in the thick cold air.',
      honour: 'A citizen speaks in the assembly and serves when the lot falls on them. Refusing is the shame.',
      daily: 'Orange haze at noon, 0.011 of Earth’s sunlight, methane rain, and flying to the assembly.',
    },
    bases: [
      { id: 'saturn-capital', kind: 'capital', name: 'Astu', where: 'Titan, on the shore of Kraken Mare',
        line: 'Open halls, tall towers to jump from, and the Pnyx above a sea of liquid methane. They need warmth and oxygen, not pressure suits.' },
      { id: 'stn-saturn-1', kind: 'station', name: 'Bema Station', where: 'Saturn system, off Titan',
        line: 'A tall thin tower with an open speaker’s hall at the top, wings of solar fins and amber lights.' },
      { id: 'stn-saturn-2', kind: 'station', name: 'Stoa Station', where: 'Saturn system, at the rings',
        line: 'A long colonnade of docks where ring-ice skimmers unload.' },
      { id: 'stn-saturn-3', kind: 'station', name: 'Prytaneion', where: 'Saturn system, off Enceladus',
        line: 'The council’s far hearth, by the geysers where Titan takes its water.' },
      { id: 'saturn-outpost-1', kind: 'outpost', name: 'Ligeia Rigs', where: 'Ligeia Mare, Titan',
        line: 'Floating rigs on a hydrocarbon sea: the fuel and plastics Saturn sells to everyone.' },
    ],
    ships: [
      ship('saturn', 'capital', 'Trireme', 'Long-range battleship',
        'A long thin black spine with three banks of amber engines down each side, radiator fins out like oars and a painted eye beside the ram.'),
      ship('saturn', 'cruiser', 'Paralos', 'Long-range raider',
        'A low black hull with three fuel tanks along its spine, built to go far and come back. The ship an Autochthon player flies. Named for Athens’s state ship.'),
      ship('saturn', 'fighter', 'Glaux', 'Glider fighter',
        'High wings on a slim pod with a small booster: a sailplane armed for war. Named for the owl of Athens.'),
      ship('saturn', 'special', 'Holkas', 'Fuel tanker',
        'A round-bellied merchant hull full of Titan’s fuel. Every nation’s fleet waits on one.', 2),
    ],
    palette: { accent: '#33307a', hull: '#16161e', panel: '#2a2850', glow: '#ff8a1e', cloth: '#2c2a66', skin: '#b9a48e' },
  },
];

export const peopleOf = (n: NationId): People => {
  const p = PEOPLES.find((x) => x.nation === n);
  if (!p) throw new Error(`no people for ${n}`);
  return p;
};

/** The one class of a type a nation builds. */
export const shipClassOf = (n: NationId, t: ShipType): ShipClass => {
  const c = peopleOf(n).ships.find((s) => s.kind === t);
  if (!c) throw new Error(`${n} has no ${t}`);
  return c;
};

/**
 * What progression should swap its PLACEHOLDER class names (refs.ts RACE_REFS.ships) for: the names here, by these
 * ids. Seven names change from the placeholders, which were English words for Greek peoples: Moon Treasury → Thesauros,
 * Lamp → Lampas, Needle → Belone; Mercury Wedge → Embolon; Venus Jewel → Smaragdos; Saturn Raider → Paralos,
 * Glider → Glaux.
 */
export const CLASS_IDS = Object.fromEntries(PEOPLES.map((p) => [p.nation,
  Object.fromEntries(SHIP_TYPES.map((t) => [t, shipClassOf(p.nation, t).id]))])) as Record<NationId, Record<ShipType, ShipClassId>>;

/** Stations per home on the stations branch (claude/stations-moons-629924, src/lib/stations.ts STATION_COUNT). */
export const STATION_COUNT_REF: Record<NationId, number> = { earth: 2, moon: 1, mercury: 1, venus: 1, mars: 2, jupiter: 3, saturn: 3 };

/**
 * Planets: each world's people, starting meters, temperament, and the buildings in each of its conquest sites.
 * FIRST PASS, a DRAFT for Caleb (PLANETS.md section 2, one part per world). Site ids are conquest's
 * (`${world}-${slug}`, src/lib/conquest/sites.ts on claude/conquest-0b139e); this file adds buildings to them and
 * never invents a site of its own.
 */
import type { NationId } from '../nations';
import type { BuildingDef, CityType, Resource, SiteKind } from './buildings';
import type { Meters } from './meters';
import { meters } from './meters';

/** One conquest site, as this layer sees it. */
export interface PlanetSite {
  id: string;
  kind: SiteKind;
  /** Works only: conquest's resource and richness. */
  res?: Resource;
  rich?: number;
  /** City and capital only. */
  city?: CityType;
  buildings: BuildingDef[];
}

/** How a people takes a blow and recovers. Every field is optional: 1 (or nothing) means the shared rule. */
export interface Temperament {
  /** Multiplies every shock to that meter. */
  shock?: Partial<Meters>;
  /** Multiplies how fast that meter moves toward its target. */
  recover?: Partial<Meters>;
  /** While the natives rule, the meter never falls below this. */
  floor?: Partial<Meters>;
  /** Replaces the shared rally (RULES.rally) under attack. */
  rally?: Meters;
  /** Multiplies the capital's shock when it falls. */
  capitalShock?: number;
  /** Multiplies the government part of every ship-loss shock. */
  lossGovernment?: number;
  /** Multiplies the economy penalty for each cut-off resource. */
  cutOffMul?: number;
  /** Under occupation: how hard religion resists the occupier (RULES.resistAbove). */
  resolve: number;
  /** What keeps the people alive: a site, a resource they import, or nothing (Earth). */
  lifeline: { site: string } | { resource: Resource } | null;
}

export interface World {
  id: NationId;
  people: string;
  /** The meters at peace with every site working: the world starts here and settles back here. */
  start: Meters;
  temperament: Temperament;
  /** What it buys from other worlds (conquest's TRADE table): cut off under a long blockade. */
  imports: Resource[];
  sites: PlanetSite[];
}

const B = (type: BuildingDef['type'], name: string, line?: string, effect?: Partial<Meters>): BuildingDef => ({ type, name, line, effect });
const S = (id: string, kind: SiteKind, buildings: BuildingDef[] = [], extra: Partial<PlanetSite> = {}): PlanetSite => ({ id, kind, buildings, ...extra });
const W = (id: string, res: Resource, rich: number, buildings: BuildingDef[] = []): PlanetSite => S(id, 'works', buildings, { res, rich });

export const WORLDS: World[] = [
  {
    id: 'earth', people: 'Humans',
    start: meters(60, 60, 35, 80),
    temperament: { resolve: 0.5, lifeline: null, shock: { economy: 0.5 }, cutOffMul: 0.5 },
    imports: ['helium3', 'hydrocarbons'],
    sites: [
      S('earth-metropolis', 'capital', [
        B('council', 'The Charter Council', 'Every old nation of Earth still has a seat, and a veto it rarely uses.'),
        B('palace', 'Government House', 'The Council’s executive: ministries, not a throne.', { government: 8 }),
        B('academy', 'The Great Library', 'The oldest archive in the system, and the Moon has never stopped asking for copies.'),
        B('temple', 'The Temple of Gaia', 'The Earth Mother, the one cult every faith on Earth agreed to share; the smallest religion meter of any world.', { religion: 6 }),
      ], { city: 'seat' }),
      S('earth-port', 'city', [
        B('market', 'The Exchange', 'Where every colony’s goods were priced, and still are.', { economy: 14 }),
        B('treasury', 'The Charter Bank', 'Lends to the colonies; most of them owe it.'),
      ], { city: 'market' }),
      S('earth-guard', 'fort', [B('barracks', 'The Guard Academy')]),
      S('earth-pharos', 'shipyard'),
      S('earth-foundries', 'foundry'),
      W('earth-breadbasket', 'food', 2), W('earth-desal', 'ice', 1.5), W('earth-mines', 'metals', 1),
      W('earth-refineries', 'chemicals', 1), W('earth-grid', 'power', 1),
      S('earth-guns-1', 'battery'), S('earth-guns-2', 'battery'),
    ],
  },
  {
    id: 'moon', people: 'Selenitai',
    start: meters(60, 30, 85, 65),
    temperament: {
      resolve: 1.5, lifeline: { site: 'moon-shackleton' },
      shock: { military: 1.5 },
      rally: { government: 0, military: 5, religion: 15, economy: -10 },
    },
    imports: ['food', 'hydrocarbons', 'chemicals'],
    sites: [
      S('moon-omphalos', 'capital', [
        B('sanctuary', 'The Hall of Answers', 'Selene’s oracle under the near side, its roof open to the Earth. Every nation pays to ask.', { religion: 20, economy: 8 }),
        B('temple', 'The Omphalos Stone', 'The navel of the world, where the Earth hangs still in Selene’s sky.'),
        B('council', 'The College of the Prophetai', 'The scholars who frame the goddess’s answers, and who rule.', { government: 10, religion: 4 }),
        B('academy', 'The Archive'),
        B('games', 'The Stadium of Selene', 'Games every four Earth years, open to every nation.'),
      ], { city: 'sanctuary' }),
      S('moon-treasury', 'city', [
        B('treasury', 'Treasury Row', 'Every nation’s vault, each in its owner’s style.', { economy: 10, government: 2 }),
        B('market', 'The Sacred Way', 'The road up to the Hall, lined with offerings and stalls.', { economy: 6 }),
      ], { city: 'market' }),
      S('moon-temenos', 'fort', [B('walls', 'The Temenos Wall', 'The sacred precinct’s boundary, and the only wall the Selenitai built.')]),
      S('moon-lamp', 'shipyard'),
      S('moon-mirrors', 'foundry'),
      W('moon-ovens', 'helium3', 1.5),
      W('moon-shackleton', 'ice', 1, [B('lifeline', 'The Cold Traps', 'Water and air out of ice the Sun never reaches.')]),
      W('moon-imbrium', 'metals', 1), W('moon-peaks', 'power', 1),
      S('moon-guns', 'battery'),
    ],
  },
  {
    id: 'mercury', people: 'Hemerodromoi',
    start: meters(65, 85, 55, 55),
    temperament: { resolve: 1, lifeline: { site: 'mercury-mirrors' }, floor: { military: 40 } },
    imports: ['hydrocarbons', 'chemicals', 'food', 'helium3'],
    sites: [
      S('mercury-lakedaimon', 'capital', [
        B('palace', 'The Two Thrones', 'Two kings, one for the rails and one for the field.', { government: 10 }),
        B('council', 'The Ephorate', 'Five ephors elected each year to watch the kings.', { government: 10 }),
        B('temple', 'The Shrine of Hermes Hodios', 'Hermes of the road, god of runners and messengers, carried along on the rails.'),
        B('barracks', 'The Syssitia', 'The common messes: every citizen eats with his fifteen.', { military: 8, government: 4 }),
      ], { city: 'seat' }),
      S('mercury-perioikoi', 'city', [
        B('market', 'The Rail-towns’ Workshops', 'The perioikoi, free but not citizens, make and sell everything.', { economy: 8 }),
      ], { city: 'colony' }),
      S('mercury-agoge', 'fort', [B('barracks', 'The Agoge', 'Where every child is trained, and runs the terminator at the end.', { military: 14, government: 2 })]),
      S('mercury-thermopylae', 'fort', [], {}),
      S('mercury-hoplon', 'shipyard'),
      S('mercury-forges', 'foundry'),
      W('mercury-mirrors', 'power', 2.5, [B('lifeline', 'The Rail Power', 'The mirror fields drive the rails. If the city stops, the dawn takes it.')]),
      W('mercury-caloris', 'metals', 1.5), W('mercury-cold', 'ice', 0.5),
      S('mercury-shield-1', 'battery'), S('mercury-shield-2', 'battery'),
    ],
  },
  {
    id: 'venus', people: 'Nephelai',
    start: meters(55, 45, 60, 75),
    temperament: { resolve: 1, lifeline: { resource: 'power' }, shock: { government: 1.5 }, recover: { economy: 1.5 } },
    imports: ['power', 'metals', 'ice', 'helium3', 'hydrocarbons'],
    sites: [
      S('venus-nephelokokkygia', 'capital', [
        B('palace', 'The Sacred Palace', 'The Autokrator’s court of ceremony and purple ink.', { government: 14 }),
        B('temple', 'The Temple of Aphrodite Ourania', 'Heavenly Aphrodite, born of the sky: a gold dome that seems to hang from the clouds, inside a city that does.', { religion: 12 }),
        B('games', 'The Hippodrome', 'Where the Greens and the Blues race, and riot.', { government: 8, economy: -2 }),
        B('market', 'The Mese', 'The great street of shops and guild halls.'),
      ], { city: 'court' }),
      S('venus-blachernae', 'city', [
        B('palace', 'The Blachernae Palace', 'The second palace, and the heir’s.', { government: 6 }),
        B('market', 'The Guilds of the Eparch', 'Silk, gold and perfume, every trade under its own rules.', { economy: 12 }),
      ], { city: 'court' }),
      S('venus-varangian', 'fort', [B('barracks', 'The Varangian Guard', 'Foreigners sworn to the Autokrator, not to any faction.')]),
      S('venus-horn', 'shipyard'),
      S('venus-fire', 'foundry'),
      W('venus-skimmers', 'chemicals', 2), W('venus-orchards', 'food', 1.5), W('venus-descent', 'metals', 0.5),
      S('venus-chain', 'battery'),
    ],
  },
  {
    id: 'mars', people: 'Quirites',
    start: meters(70, 75, 55, 55),
    temperament: { resolve: 1.25, lifeline: { site: 'mars-aqua' }, shock: { military: 0.75 }, recover: { military: 1.5 } },
    imports: ['power', 'helium3', 'hydrocarbons'],
    sites: [
      S('mars-quirinal', 'capital', [
        B('council', 'The Curia', 'The Senate house. Two consuls a Mars year, and tribunes who can say "I forbid".', { government: 12, religion: 2 }),
        B('temple', 'The Temple of Mars Ultor', 'Mars the Avenger, father of Romulus: the legions’ standards are kept here.', { religion: 12 }),
        B('temple', 'The Temple of Vesta', 'The fire of the state, which must never go out.', { religion: 6 }),
        B('temple', 'The Gates of Janus', 'Open in war, shut in peace; they have not been shut since the Secession.', { religion: 6 }),
        B('treasury', 'The Aerarium', 'The treasury of the Roman people, kept in a temple.'),
        B('market', 'The Forum'),
      ], { city: 'seat' }),
      S('mars-tharsis', 'city', [
        B('market', 'The Colonia’s Forum', 'A town of veterans, planted on a grid.', { economy: 8 }),
        B('games', 'The Amphitheatre'),
      ], { city: 'colony' }),
      S('mars-prima', 'fort', [B('barracks', 'Castra Prima', 'A legion’s camp, laid out to the same plan as every other.')]),
      S('mars-secunda', 'fort', [B('walls', 'Castra Secunda')]),
      S('mars-navalia', 'shipyard'),
      S('mars-fabrica', 'foundry'),
      W('mars-aqua', 'ice', 1.5, [B('lifeline', 'Aqua Borealis', 'The aqueduct from the north polar cap: water, air and the greening of Mars.')]),
      W('mars-mines', 'metals', 1.5), W('mars-fields', 'food', 1), W('mars-perchlorate', 'chemicals', 1),
      S('mars-limes', 'battery'),
    ],
  },
  {
    id: 'jupiter', people: 'Diadochoi',
    start: meters(60, 70, 55, 60),
    temperament: { resolve: 0.75, lifeline: { site: 'jupiter-fusion' }, capitalShock: 2 },
    imports: ['food', 'hydrocarbons'],
    sites: [
      S('jupiter-basileia', 'capital', [
        B('palace', 'The Basileia', 'The king’s palace under the ice dome, a skyline of founders’ statues.', { government: 16 }),
        B('temple', 'The Altar of Zeus Basileus', 'Zeus the King, and beside him the founders and the living king honoured as gods. The royal part dies with the dynasty.'),
        B('academy', 'The Mouseion', 'A royal college and library, to outshine every other court.'),
        B('games', 'The Grand Procession', 'Every few years, a parade of the kingdom’s wealth and might.'),
      ], { city: 'court' }),
      S('jupiter-court', 'city', [
        B('palace', 'The Court of Ganymede', 'The other house: rival, ally, in-law.', { government: 6 }),
        B('treasury', 'The Royal Mint', 'Coins with the king’s head on them.'),
      ], { city: 'court' }),
      S('jupiter-companions', 'fort', [B('barracks', 'The Companions', 'The nobles who ride, and fly, beside the king.', { military: 12 })]),
      S('jupiter-prison', 'fort', [B('walls', 'The Io Prison-fort')]),
      S('jupiter-royal', 'shipyard'),
      S('jupiter-forges', 'foundry'),
      W('jupiter-scoops', 'helium3', 2), W('jupiter-europa', 'ice', 2), W('jupiter-sulphur', 'chemicals', 1.5),
      W('jupiter-fusion', 'power', 1.5, [B('lifeline', 'The Fusion Halls', 'Light and heat at a twenty-seventh of Earth’s sunlight.')]),
      W('jupiter-regolith', 'metals', 0.75),
      S('jupiter-sarissa-1', 'battery'), S('jupiter-sarissa-2', 'battery'),
    ],
  },
  {
    id: 'saturn', people: 'Autochthones',
    start: meters(75, 45, 50, 70),
    temperament: { resolve: 1.25, lifeline: { site: 'saturn-burners' }, lossGovernment: 2, recover: { government: 1.5 } },
    imports: ['metals', 'chemicals'],
    sites: [
      S('saturn-pnyx', 'capital', [
        B('council', 'The Ekklesia on the Pnyx', 'Every citizen votes; most offices go by lot from the kleroterion.', { government: 14, religion: 2 }),
        B('temple', 'The Temple of Kronos and Rhea', 'Kronos, who ruled the age of gold, when no one was master; Titan’s oldest cult.', { religion: 12 }),
        B('games', 'The Theatre', 'Tragedy and comedy at the festival, paid for by the rich.'),
        B('academy', 'The Stoa', 'A colonnade where anyone may teach.'),
      ], { city: 'seat' }),
      S('saturn-piraeus', 'city', [
        B('market', 'The Emporion', 'The fuel market of the whole system, on Kraken Mare.', { economy: 14 }),
        B('treasury', 'The Liturgies', 'The rich pay for ships and festivals, and are honoured for it.'),
      ], { city: 'market' }),
      S('saturn-walls', 'fort', [B('walls', 'The Long Walls', 'Joining the Pnyx to Piraeus, so the city can be fed by sea.', { military: 8, government: 2 })]),
      S('saturn-sheds', 'shipyard'),
      S('saturn-kerameikos', 'foundry'),
      W('saturn-kraken', 'hydrocarbons', 2.5), W('saturn-ligeia', 'food', 1), W('saturn-rings', 'ice', 2),
      W('saturn-geysers', 'ice', 1), W('saturn-scoops', 'helium3', 1),
      W('saturn-burners', 'power', 0.8, [B('lifeline', 'The Methane Burners', 'Heat at −179 °C. Without it the city freezes.')]),
      S('saturn-owl', 'battery'),
    ],
  },
];

export const worldOf = (id: NationId): World => {
  const w = WORLDS.find((x) => x.id === id);
  if (!w) throw new Error(`no world ${id}`);
  return w;
};

export const siteOf = (w: World, id: string): PlanetSite => {
  const s = w.sites.find((x) => x.id === id);
  if (!s) throw new Error(`no site ${id} on ${w.id}`);
  return s;
};


/**
 * Conquest sites: the kinds, the seven worlds' sites, and who trades what with whom. FIRST PASS, from CONQUEST.md
 * section 2 and 3; names follow LORE.md's peoples.
 */
import type { NationId } from '../nations';
import type { Resource } from './resources';

export type SiteKind = 'capital' | 'city' | 'fort' | 'shipyard' | 'foundry' | 'works' | 'battery';
export const SITE_KINDS: SiteKind[] = ['capital', 'city', 'fort', 'shipyard', 'foundry', 'works', 'battery'];

export interface KindSpec {
  label: string;
  hp: number; // structure
  hold: number; // seconds held to capture; 0 = cannot be captured
  wreck: boolean; // can be shot to nothing
  income: number; // credits a minute while the player holds it (works: × richness)
  xp: number; // paid the first time it is taken (captured or wrecked)
  credits: number; // likewise
  size: number; // hit radius in player-ship lengths
}

export const KINDS: Record<SiteKind, KindSpec> = {
  capital: { label: 'Capital', hp: 3000, hold: 30, wreck: false, income: 40, xp: 400, credits: 150, size: 24 },
  city: { label: 'City', hp: 1500, hold: 20, wreck: false, income: 20, xp: 150, credits: 60, size: 16 },
  fort: { label: 'Fort', hp: 1800, hold: 20, wreck: true, income: 5, xp: 200, credits: 40, size: 14 },
  shipyard: { label: 'Shipyard', hp: 2400, hold: 25, wreck: true, income: 12, xp: 250, credits: 80, size: 18 },
  foundry: { label: 'Foundry', hp: 1400, hold: 15, wreck: true, income: 10, xp: 150, credits: 50, size: 12 },
  works: { label: 'Works', hp: 900, hold: 10, wreck: true, income: 6, xp: 80, credits: 20, size: 10 },
  battery: { label: 'Battery', hp: 1000, hold: 0, wreck: true, income: 0, xp: 60, credits: 10, size: 8 },
};

export const SITE_RULES = {
  suppressAt: 0.5, // at or below this share of structure a site is suppressed: it stops working and can be captured
  cityFloor: 0.25, // a city or capital takes no damage below this share
  captureReach: 30, // scene units beyond the site's hit radius the player must be within to capture
  contest: 1000, // scene units: a live ship of the owner this close contests a capture
  drain: 2, // capture progress drains this many times faster than it fills, once the player leaves or the site recovers (contested only pauses it)
  repairDelay: 45, // seconds after the last hit before a damaged site mends
  repair: 0.01, // share of structure mended a second
  rebuild: 240, // seconds for the owner to rebuild a wrecked site, while it holds a working shipyard or foundry
  batteryShield: 0.5, // other sites take this share of damage while any of the world's batteries stands
  controlXp: 500, // paid once, when a world is controlled
};

/** Moons the sites stand on (real destinations on the stations-moons branch; stand-ins here until it merges). */
export type MoonId = 'io' | 'europa' | 'ganymede' | 'callisto' | 'titan' | 'enceladus';
/**
 * Where a site sits: on its world's body (or a moon), at latitude and longitude in degrees in the body's own turning
 * frame. `place`: surface, the cloud layer, orbit (fixed, between the fighter and capital rings), Saturn's rings, or the
 * twilight line (Mercury's walking city: it keeps to the line between day and night while the planet turns).
 */
export interface Locus { on: 'home' | MoonId; place: 'surface' | 'air' | 'orbit' | 'ring' | 'twilight'; lat: number; lon: number }

export interface SiteDef {
  id: string;
  world: NationId;
  name: string;
  kind: SiteKind;
  at: Locus;
  res?: Resource; // works only
  rich?: number; // works only
  bounty?: number; // extra credits, once, the first time it is taken (the Moon's treasuries)
  line?: string; // one line for the card
}

const L = (on: Locus['on'], place: Locus['place'], lat: number, lon: number): Locus => ({ on, place, lat, lon });
const site = (world: NationId, slug: string, name: string, kind: SiteKind, at: Locus, extra: Partial<SiteDef> = {}): SiteDef => ({ id: `${world}-${slug}`, world, name, kind, at, ...extra });
const works = (world: NationId, slug: string, name: string, res: Resource, rich: number, at: Locus, line?: string) => site(world, slug, name, 'works', at, { res, rich, line });
const S = 'surface';

export const SITES: SiteDef[] = [
  // Earth: the mother city.
  site('earth', 'metropolis', 'The Metropolis', 'capital', L('home', S, 40, 10), { line: 'The mother city, seat of the Charter Council.' }),
  site('earth', 'port', 'Port Charter', 'city', L('home', S, 30, -70), { line: 'The old treaty port where the colonies signed.' }),
  site('earth', 'guard', 'Charter Guard', 'fort', L('home', S, 45, 30)),
  site('earth', 'pharos', 'Pharos Yard', 'shipyard', L('home', 'orbit', 10, 0), { line: 'Named for the lighthouse of Alexandria.' }),
  site('earth', 'foundries', 'The Old Foundries', 'foundry', L('home', S, 50, 0)),
  works('earth', 'breadbasket', 'The Breadbasket', 'food', 2, L('home', S, 38, -95)),
  works('earth', 'desal', 'The Desalinators', 'ice', 1.5, L('home', S, 25, 50), 'Water out of the sea.'),
  works('earth', 'mines', 'The Deep Mines', 'metals', 1, L('home', S, -25, 130)),
  works('earth', 'refineries', 'The Refineries', 'chemicals', 1, L('home', S, 28, 48)),
  works('earth', 'grid', 'The Grid', 'power', 1, L('home', S, 35, 120)),
  site('earth', 'guns-1', 'Lagrange Guns I', 'battery', L('home', 'orbit', -15, 40)),
  site('earth', 'guns-2', 'Lagrange Guns II', 'battery', L('home', 'orbit', 20, -40)),

  // The Moon: the Selenitai, a temple-state copied from Delphi.
  site('moon', 'omphalos', 'The Omphalos', 'capital', L('home', S, 0, 0), { line: 'The Hall of Answers, its roof open to the Earth.' }),
  site('moon', 'treasury', 'Treasury Row', 'city', L('home', S, 10, 25), { bounty: 600, line: 'The nations’ vaults under the crust: 600 credits the first time it is taken.' }),
  site('moon', 'temenos', 'The Temenos Wall', 'fort', L('home', S, -10, 15), { line: 'The garrison of the sacred precinct.' }),
  site('moon', 'lamp', 'Lamp Yard', 'shipyard', L('home', 'orbit', 5, -20)),
  site('moon', 'mirrors', 'The Mirror Works', 'foundry', L('home', S, 15, -15)),
  works('moon', 'ovens', 'Tranquillity Ovens', 'helium3', 1.5, L('home', S, 8, 31), 'Bakes helium-3 out of mare regolith.'),
  works('moon', 'shackleton', 'Shackleton Cold Traps', 'ice', 1, L('home', S, -88, 0), 'Ice in craters the Sun never reaches.'),
  works('moon', 'imbrium', 'Imbrium Pits', 'metals', 1, L('home', S, 33, -16), 'Titanium and iron from ilmenite.'),
  works('moon', 'peaks', 'The Peaks of Light', 'power', 1, L('home', S, 88, 0), 'Polar summits in near-constant sun.'),
  site('moon', 'guns', 'The Amphictyon Guns', 'battery', L('home', 'orbit', -20, 30)),

  // Mercury: the Hemerodromoi, Sparta, and a city that walks.
  site('mercury', 'lakedaimon', 'Lakedaimon', 'capital', L('home', 'twilight', 0, 0), { line: 'The walking city: it rides the twilight on rails and never stops.' }),
  site('mercury', 'perioikoi', 'The Perioikoi Rail-towns', 'city', L('home', S, 20, 60)),
  site('mercury', 'agoge', 'The Agoge', 'fort', L('home', S, -15, 90), { line: 'Where every child is trained.' }),
  site('mercury', 'thermopylae', 'Thermopylae Line', 'fort', L('home', S, 5, -60), { line: 'At the dawn edge.' }),
  site('mercury', 'hoplon', 'Hoplon Yard', 'shipyard', L('home', 'orbit', 0, 180), { line: 'In the planet’s shadow.' }),
  site('mercury', 'forges', 'The Rail Forges', 'foundry', L('home', S, 10, 120)),
  works('mercury', 'mirrors', 'The Day-side Mirror Fields', 'power', 2.5, L('home', S, 0, 0), 'Sunlight 6.7 times Earth’s.'),
  works('mercury', 'caloris', 'Caloris Iron Pits', 'metals', 1.5, L('home', S, 30, 170)),
  works('mercury', 'cold', 'The Polar Cold Traps', 'ice', 0.5, L('home', S, 87, 0)),
  site('mercury', 'shield-1', 'Shield-wall Battery I', 'battery', L('home', 'orbit', 15, 30)),
  site('mercury', 'shield-2', 'Shield-wall Battery II', 'battery', L('home', 'orbit', -15, -30)),

  // Venus: the Nephelai, a Byzantine court in the clouds.
  site('venus', 'nephelokokkygia', 'Nephelokokkygia', 'capital', L('home', 'air', 10, 0), { line: 'The palace city, hanging under its lifting envelope.' }),
  site('venus', 'blachernae', 'Blachernae', 'city', L('home', 'air', -12, 40)),
  site('venus', 'varangian', 'The Varangian Station', 'fort', L('home', 'air', 20, -30), { line: 'The Autokrator’s foreign guard.' }),
  site('venus', 'horn', 'Golden Horn Yard', 'shipyard', L('home', 'orbit', 0, 60)),
  site('venus', 'fire', 'The Greek Fire Works', 'foundry', L('home', 'air', 0, -60)),
  works('venus', 'skimmers', 'The Acid Skimmers', 'chemicals', 2, L('home', 'air', -25, -10), 'Sulphuric acid out of the clouds.'),
  works('venus', 'orchards', 'The Cloud Orchards', 'food', 1.5, L('home', 'air', 30, 20)),
  works('venus', 'descent', 'The Descent', 'metals', 0.5, L('home', S, -5, 90), 'Dredges let down to the 464 °C ground. To be sent down is a sentence.'),
  site('venus', 'chain', 'The Chain Gate', 'battery', L('home', 'orbit', 15, -40)),

  // Mars: the Quirites, a Roman republic.
  site('mars', 'quirinal', 'The Quirinal', 'capital', L('home', S, 5, 0), { line: 'Seat of the Senate.' }),
  site('mars', 'tharsis', 'Colonia Tharsis', 'city', L('home', S, 0, -110)),
  site('mars', 'prima', 'Castra Prima', 'fort', L('home', S, 15, 25)),
  site('mars', 'secunda', 'Castra Secunda', 'fort', L('home', S, -20, -30)),
  site('mars', 'navalia', 'The Navalia', 'shipyard', L('home', 'orbit', 0, 30), { line: 'Rome’s naval yards, in orbit.' }),
  site('mars', 'fabrica', 'The Fabrica', 'foundry', L('home', S, -5, 45), { line: 'The state arms factories.' }),
  works('mars', 'aqua', 'Aqua Borealis', 'ice', 1.5, L('home', S, 70, 10), 'The aqueduct from the north polar cap.'),
  works('mars', 'mines', 'Tharsis Mines', 'metals', 1.5, L('home', S, 5, -100)),
  works('mars', 'fields', 'The Dome Fields', 'food', 1, L('home', S, 20, -20)),
  works('mars', 'perchlorate', 'The Perchlorate Works', 'chemicals', 1, L('home', S, -30, 60)),
  site('mars', 'limes', 'The Limes Batteries', 'battery', L('home', 'orbit', 20, -20)),

  // Jupiter: the Diadochoi, successor kings on the moons.
  site('jupiter', 'basileia', 'The Basileia of Callisto', 'capital', L('callisto', S, 10, 0), { line: 'The royal capital, outside the worst of the radiation.' }),
  site('jupiter', 'court', 'The Court of Ganymede', 'city', L('ganymede', S, 0, 0)),
  site('jupiter', 'companions', 'The Companions’ Barracks', 'fort', L('ganymede', S, 20, 40)),
  site('jupiter', 'prison', 'The Io Prison-fort', 'fort', L('io', S, 0, 0)),
  site('jupiter', 'royal', 'The Royal Yard', 'shipyard', L('home', 'orbit', 0, 0), { line: 'Where the great flagships are laid down.' }),
  site('jupiter', 'forges', 'The Ganymede Forges', 'foundry', L('ganymede', S, -20, -30)),
  works('jupiter', 'scoops', 'The Cloud-top Scoops', 'helium3', 2, L('home', 'air', 10, 20), 'Helium-3 out of Jupiter’s air.'),
  works('jupiter', 'europa', 'The Europa Ice Quarries', 'ice', 2, L('europa', S, 0, 0)),
  works('jupiter', 'sulphur', 'The Io Sulphur Pits', 'chemicals', 1.5, L('io', S, 20, 60), 'Worked by prisoners.'),
  works('jupiter', 'fusion', 'The Fusion Halls', 'power', 1.5, L('ganymede', S, 10, -80), 'Burning the scoops’ helium-3.'),
  works('jupiter', 'regolith', 'Callisto Regolith Mines', 'metals', 0.75, L('callisto', S, -20, 50)),
  site('jupiter', 'sarissa-1', 'Sarissa Battery I', 'battery', L('home', 'orbit', 15, 25)),
  site('jupiter', 'sarissa-2', 'Sarissa Battery II', 'battery', L('home', 'orbit', -15, -25)),

  // Saturn: the Autochthones, an Athens on Titan.
  site('saturn', 'pnyx', 'The Pnyx', 'capital', L('titan', S, 10, 0), { line: 'The hill where the Ekklesia meets.' }),
  site('saturn', 'piraeus', 'Piraeus', 'city', L('titan', S, 60, 40), { line: 'The harbour on Kraken Mare.' }),
  site('saturn', 'walls', 'The Long Walls', 'fort', L('titan', S, 35, 20), { line: 'Joining the Pnyx to Piraeus.' }),
  site('saturn', 'sheds', 'The Ship Sheds', 'shipyard', L('home', 'orbit', 0, 30), { line: 'The Athenian neosoikoi, in orbit.' }),
  site('saturn', 'kerameikos', 'The Kerameikos Works', 'foundry', L('titan', S, -10, -30)),
  works('saturn', 'kraken', 'The Kraken Mare Wells', 'hydrocarbons', 2.5, L('titan', S, 68, 60), 'Methane and ethane from the seas.'),
  works('saturn', 'ligeia', 'The Ligeia Vat-farms', 'food', 1, L('titan', S, 78, -100)),
  works('saturn', 'rings', 'The Ring Harvesters', 'ice', 2, L('home', 'ring', 0, -60)),
  works('saturn', 'geysers', 'The Enceladus Geyser Taps', 'ice', 1, L('enceladus', S, -80, 0)),
  works('saturn', 'scoops', 'The Saturn Scoops', 'helium3', 1, L('home', 'air', 15, 90)),
  works('saturn', 'burners', 'The Methane Burners', 'power', 0.8, L('titan', S, 0, 60), 'Methane burnt with oxygen split from ice.'),
  site('saturn', 'owl', 'The Owl Batteries', 'battery', L('home', 'orbit', 10, -30)),
];

export const siteById = (id: string) => SITES.find((s) => s.id === id);
export const sitesOf = (w: NationId) => SITES.filter((s) => s.world === w);
export const siteHp = (s: SiteDef) => KINDS[s.kind].hp;
export const capturable = (s: SiteDef) => KINDS[s.kind].hold > 0;

/** Who sells each world what it does not make (CONQUEST.md 3.1, after LORE.md). */
export const TRADE: Record<NationId, Partial<Record<Resource, NationId>>> = {
  earth: { helium3: 'moon', hydrocarbons: 'saturn' },
  moon: { food: 'earth', hydrocarbons: 'saturn', chemicals: 'venus' },
  mercury: { hydrocarbons: 'saturn', chemicals: 'venus', food: 'venus', helium3: 'moon' },
  venus: { power: 'mercury', metals: 'mercury', ice: 'jupiter', helium3: 'moon', hydrocarbons: 'saturn' },
  mars: { power: 'mercury', helium3: 'moon', hydrocarbons: 'saturn' },
  jupiter: { food: 'saturn', hydrocarbons: 'saturn' },
  saturn: { metals: 'jupiter', chemicals: 'jupiter' },
};

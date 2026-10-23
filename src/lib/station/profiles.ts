/**
 * Each world's station systems: its god, temple and boon, its guns and shield (arsenal's ids, never a second table),
 * what its market deals in, where its power comes from, and how it fights. FIRST PASS, for Caleb to reshape.
 *
 * Caleb's ruling (2026-10-19): each station is themed on the god its planet is named for. Myth and cult only, never
 * astrology: a temple here is a building with a history, and a boon is a game rule named for what the god was
 * worshipped for. The shape of the armour is god-armour's; this file names only what is mounted on it.
 */
import type { MunitionId } from '../munitions';
import type { ShieldId } from '../shields';
import type { StationHome } from '../stations';

/** Conquest's seven resources (src/lib/conquest/resources.ts on claude/conquest-0b139e; not merged here yet). */
export type Resource = 'metals' | 'ice' | 'hydrocarbons' | 'power' | 'helium3' | 'chemicals' | 'food';
export const RESOURCE_NAME: Record<Resource, string> = {
  metals: 'Metals', ice: 'Ice', hydrocarbons: 'Hydrocarbons', power: 'Power', helium3: 'Helium-3', chemicals: 'Chemicals', food: 'Food',
};

/** A god's boon: one rule that leans the station's systems toward what the god was worshipped for. */
export type Boon = 'harvest' | 'nightWatch' | 'messenger' | 'charm' | 'avenger' | 'thunderbolt' | 'treasury';
export const BOON_TEXT: Record<Boon, string> = {
  harvest: 'Market income ×1.2.',
  nightWatch: 'Sensors reach ×1.25 farther.',
  messenger: 'Calls the navy and the other stations at once; launches ×1.5 faster.',
  charm: 'Prices 10% better; slower to anger (needs twice the provocation).',
  avenger: 'Once struck, its guns fire ×1.25 faster.',
  thunderbolt: 'Heavy guns hit ×1.2 harder.',
  treasury: 'Development ×1.25 faster.',
};

export interface StationProfile {
  home: StationHome;
  god: { greek: string; roman: string };
  temple: { name: string; history: string };
  boon: Boon;
  /** Arsenal munition ids: the main turrets, the point-defence mounts, and the heavy guns a tier-3 station adds. */
  guns: { turret: MunitionId; pointDefence: MunitionId; heavy: MunitionId };
  shield: ShieldId;
  mines: boolean; // minelayers fitted from tier 1 (everyone else gets them at tier 3)
  market: Resource; // the resource its market deals in
  power: { source: string; richness: number }; // conquest's power works on that world, or its import
  /** Fighters launched per hangar slot against the base (Mars's legion squadrons are bigger). */
  wing: number;
  doctrine: string;
  /** Conquest's orbital sites this world's station hosts (sites.ts ids): its shipyard and its batteries. */
  sites: string[];
}

export const PROFILES: Record<StationHome, StationProfile> = {
  earth: {
    home: 'earth', god: { greek: 'Gaia', roman: 'Terra (Tellus)' }, boon: 'harvest',
    temple: { name: 'Aedes Telluris', history: 'The temple of Tellus, the Earth mother, in Rome (dedicated 268 BC); Gaia kept the first oracle at Delphi before Apollo.' },
    guns: { turret: 'pulse', pointDefence: 'flak', heavy: 'rail' }, shield: 'deflector', mines: false,
    market: 'food', power: { source: 'The Grid', richness: 1 }, wing: 1,
    doctrine: 'Defence in depth: the guns hold, the patrol comes home, and the oldest navy rebuilds.',
    sites: ['earth-pharos', 'earth-guns-1', 'earth-guns-2'],
  },
  moon: {
    home: 'moon', god: { greek: 'Selene', roman: 'Luna' }, boon: 'nightWatch',
    temple: { name: 'Temple of Luna', history: 'Luna’s temple on the Aventine in Rome, said to be founded by Servius Tullius; Selene drove the Moon’s chariot.' },
    guns: { turret: 'ion', pointDefence: 'flak', heavy: 'plasma' }, shield: 'hardened', mines: false,
    market: 'helium3', power: { source: 'The Peaks of Light', richness: 1 }, wing: 1,
    doctrine: 'The sanctuary: hardened shields and ion guns that disable rather than kill. It wants no side.',
    sites: ['moon-lamp', 'moon-guns'],
  },
  mercury: {
    home: 'mercury', god: { greek: 'Hermes', roman: 'Mercurius' }, boon: 'messenger',
    temple: { name: 'Aedes Mercurii', history: 'The temple of Mercury by the Circus Maximus (495 BC), patron of merchants and messengers.' },
    guns: { turret: 'pulse', pointDefence: 'flak', heavy: 'rail' }, shield: 'bifacet', mines: false,
    market: 'power', power: { source: 'The Day-side Mirror Fields', richness: 2.5 }, wing: 1,
    doctrine: 'The shield wall: two-faced shields and the fastest call to arms in the system.',
    sites: ['mercury-hoplon', 'mercury-shield-1', 'mercury-shield-2'],
  },
  venus: {
    home: 'venus', god: { greek: 'Aphrodite', roman: 'Venus' }, boon: 'charm',
    temple: { name: 'Temple of Venus Genetrix', history: 'Caesar’s temple to Venus the Mother in his forum (46 BC).' },
    guns: { turret: 'beam', pointDefence: 'flak', heavy: 'plasma' }, shield: 'capacitor', mines: true,
    market: 'chemicals', power: { source: 'imported from Mercury', richness: 0.6 }, wing: 1,
    doctrine: 'The Chain Gate: welcome everyone, mine the approach, burn whoever comes close with beams.',
    sites: ['venus-horn', 'venus-chain'],
  },
  mars: {
    home: 'mars', god: { greek: 'Ares', roman: 'Mars' }, boon: 'avenger',
    temple: { name: 'Temple of Mars Ultor', history: 'Mars the Avenger, in the Forum of Augustus (2 BC), where the standards were kept.' },
    guns: { turret: 'plasma', pointDefence: 'flak', heavy: 'rail' }, shield: 'deflector', mines: false,
    market: 'metals', power: { source: 'imported from Mercury', richness: 0.5 }, wing: 1.5,
    doctrine: 'The legion: it sorties early and in numbers, and hits back harder once hit.',
    sites: ['mars-navalia', 'mars-limes'],
  },
  jupiter: {
    home: 'jupiter', god: { greek: 'Zeus', roman: 'Jupiter' }, boon: 'thunderbolt',
    temple: { name: 'Temple of Jupiter Optimus Maximus', history: 'The great temple on the Capitoline, the head of Rome’s state cult (509 BC).' },
    guns: { turret: 'rail', pointDefence: 'flak', heavy: 'torpedo' }, shield: 'hardened', mines: false,
    market: 'helium3', power: { source: 'The Fusion Halls', richness: 1.5 }, wing: 1,
    doctrine: 'Outrange them: long rail guns and the royal flagship moored as the heaviest gun of all.',
    sites: ['jupiter-royal', 'jupiter-sarissa-1', 'jupiter-sarissa-2'],
  },
  saturn: {
    home: 'saturn', god: { greek: 'Kronos', roman: 'Saturnus' }, boon: 'treasury',
    temple: { name: 'Temple of Saturn', history: 'In the Roman Forum (497 BC); it held the state treasury, the aerarium. Saturnalia was his feast.' },
    guns: { turret: 'seeker', pointDefence: 'flak', heavy: 'swarm' }, shield: 'deflector', mines: true,
    market: 'hydrocarbons', power: { source: 'The Methane Burners', richness: 0.8 }, wing: 1,
    doctrine: 'Patient and far: missiles from long range, mines in the approach, and the assembly slow to vote for war.',
    sites: ['saturn-sheds', 'saturn-owl', 'saturn-rings'],
  },
};

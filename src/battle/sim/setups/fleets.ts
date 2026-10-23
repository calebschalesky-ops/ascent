/**
 * PKG-20: the houses and ship names the new setups draw from, and the fleet mixes by size.
 *
 * Names (Kalliope's call, ASSUMED for Caleb to overrule): houses and ships from Greek, Roman and Byzantine history and
 * LORE.md, no Red Rising names. A house keeps the same ships in every setup it fights in, so a name means one ship.
 * - House of Kleisthenes (Saturn) and House of Ganymede (Jupiter) are saturn-12v12's; their first twelve names are that
 *   setup's, unchanged. Kleisthenes adds Ostrakon, Boule, Demos, Kraken (Kraken Mare, Titan); Ganymede adds Sarissa,
 *   Phalanx, Hypaspist, Hetairos.
 * - House of Callisto (Jupiter): LORE names it as Ganymede's rival crown. Ships: the first crown, and Alexander's
 *   successors and their guard.
 * - House of Miltiades (Saturn): the Athenian family of Miltiades and Kimon (Philaidai). Ships: their victories, islands
 *   and kin.
 * - House of Cincinnatus (Mars): the Roman who left his plough to be dictator for sixteen days and went back to it (LORE:
 *   the Senate fears every dictator). Ships: the plough, the fasces, the legion and his victory at Mount Algidus.
 * - House of the Pythia (the Moon): LORE's College of the Pythia, Delphi's model. Ships: Delphi's places and offices.
 * - House of Agis (Mercury): Sparta's Agiad kings (LORE: Mercury's diarchy is Sparta's). Ships: Sparta's places,
 *   offices and law-giver.
 * - Tankers (Saturn's convoy, LORE: Titan sells fuel to everyone): Greek vessels for liquids.
 */
import type { BattleClass, ShipSetup, SideSetup } from '../types';

export const HOUSES = {
  kleisthenes: {
    house: 'House of Kleisthenes', world: 'Saturn',
    names: ['Kleros', 'Pnyx', 'Bema', 'Agora', 'Lot', 'Astu', 'Ligeia', 'Ekklesia', 'Stoa', 'Thalassa', 'Hyperion', 'Phoebe',
      'Ostrakon', 'Boule', 'Demos', 'Kraken'],
  },
  ganymede: {
    house: 'House of Ganymede', world: 'Jupiter',
    names: ['Companion', 'Diadem', 'Basileus', 'Second Crown', 'Herald', 'Ganymede', 'Callirrhoe', 'Spear', 'Sceptre', 'Io',
      'Europa', 'Amalthea', 'Sarissa', 'Phalanx', 'Hypaspist', 'Hetairos'],
  },
  callisto: {
    house: 'House of Callisto', world: 'Jupiter',
    names: ['First Crown', 'Basilissa', 'Agema', 'Argyraspid', 'Pezhetairos', 'Seleukos', 'Antigonos', 'Lysimachos',
      'Kassandros', 'Ptolemaios', 'Philetairos', 'Attalos', 'Eumenes', 'Perdikkas', 'Krateros', 'Antipatros'],
  },
  miltiades: {
    house: 'House of Miltiades', world: 'Saturn',
    names: ['Marathon', 'Kimon', 'Chersonese', 'Eurymedon', 'Lemnos', 'Skyros', 'Thasos', 'Eion', 'Elpinike', 'Hegesipyle',
      'Oloros', 'Lakiadai'],
  },
  cincinnatus: {
    house: 'House of Cincinnatus', world: 'Mars',
    names: ['Aratrum', 'Fasces', 'Lictor', 'Aquila', 'Pilum', 'Gladius', 'Testudo', 'Castra', 'Tribune', 'Consul',
      'Dictator', 'Arsia', 'Quirinus', 'Algidus'],
  },
  pythia: {
    house: 'House of the Pythia', world: 'Moon',
    names: ['Omphalos', 'Tripod', 'Laurel', 'Kastalia', 'Parnassos', 'Tholos', 'Amphiktyon', 'Sibyl', 'Theoros', 'Korykion',
      'Mantis', 'Pleistos'],
  },
  agis: {
    house: 'House of Agis', world: 'Mercury',
    names: ['Ephor', 'Agoge', 'Hoplite', 'Thermopylae', 'Leonidas', 'Lykourgos', 'Eurotas', 'Taygetos', 'Gerousia', 'Xiphos',
      'Lambda', 'Amyklai'],
  },
} as const;
export type HouseKey = keyof typeof HOUSES;

/** Saturn's convoy tankers (ref-03, ref-05, ref-08): data only until a package gives the sim a tanker class. */
export const TANKERS = ['Amphora', 'Pithos', 'Hydria', 'Kylix'];

/**
 * Fleet mixes by size, FIRST-PASS (Palamedes to prove by sim). The line abreast, top to bottom; the flagship is the
 * capital. 12 is saturn-12v12's line; the others drop or add ships at the wings so the centre stays the same.
 * The 6 is a reinforcement wave: no flagship of its own.
 */
const E = 'escort', C = 'cruiser', D = 'destroyer', K = 'capital', V = 'carrier';
export const MIX: Record<number, BattleClass[]> = {
  6: [E, C, D, D, C, E],
  8: [E, C, D, K, C, D, C, E],
  10: [E, C, D, C, K, V, C, D, C, E],
  11: [E, C, D, C, E, K, V, E, C, D, C],
  12: [E, C, D, C, E, K, V, E, C, D, C, E],
  13: [E, C, D, C, E, K, V, E, C, D, C, E, E],
  14: [E, C, D, C, E, K, V, E, C, D, C, E, C, E],
  16: [E, D, C, D, C, E, K, V, E, C, D, C, E, C, D, E],
};

/** `n` ships of a house, named in order from its list, in the size's mix. */
export function ships(key: HouseKey, n: number, from = 0): ShipSetup[] {
  const mix = MIX[n];
  if (!mix) throw new Error(`no fleet mix for ${n} ships`);
  const names = HOUSES[key].names;
  if (from + n > names.length) throw new Error(`${HOUSES[key].house} has ${names.length} names, ${from + n} asked`);
  return mix.map((cls, i) => ({ name: names[from + i], cls, ...(cls === 'capital' ? { flagship: true } : {}) }));
}

/** One side of a setup: a house's `n` ships under captains' standing orders. */
export function side(key: HouseKey, n: number, controller: string): SideSetup {
  return {
    house: HOUSES[key].house, world: HOUSES[key].world, ships: ships(key, n),
    standing: { engage: 'captains', boarding: false }, controller,
  };
}

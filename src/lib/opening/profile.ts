/**
 * The pilot the player makes in the opening: their character (a person of their nation's people, LORE.md "Bodies"
 * and "Look") and their first ship's name and paint. Pure data and functions, saved with the game
 * (store.ts GameData.pilot). The loadout itself lives in progression's Progress.fit.
 */
import type { NationId } from '../nations';
import { NATIONS } from '../nations';
import { peopleOf } from '../races';

/** One choice in a list: what the player reads, and the colour (or flag) it sets. */
export interface Swatch { label: string; value: string }
export interface Attire { label: string; line: string; cloth: string }

/**
 * What a people's body and dress can be, per LORE.md. Every list has at least two entries.
 *
 * One people, one look (Caleb, 2026-10-21): every person of a people shares its skin, hair and eye colouring, so no
 * people reads as several races. The choices are shades of that one look, never a different one: skin stays near the
 * people's races.ts palette.skin (opening.test.ts holds it there), hair and eyes stay in one family, and grey hair is
 * the only age change. ART-DIRECTION.md "One people, one look".
 */
export interface AvatarOptions {
  skin: Swatch[];
  hair: Swatch[];
  eyes: Swatch[];
  attire: Attire[];
  /** What the headwear is for this people ("Silver laurel"), and whether it is on by default. */
  headwear: { label: string; on: boolean };
  /** A line on what was grown, chosen and custom in these bodies, shown under the portrait. */
  note: string;
  given: string[];
  /** The second half of a name: family, house, city or deme. */
  family: string[];
}

export const AVATAR_OPTIONS: Record<NationId, AvatarOptions> = {
  earth: {
    skin: [
      { label: 'Sun-browned', value: '#9a6a4a' }, { label: 'Tan', value: '#a87a56' }, { label: 'Olive brown', value: '#9c7050' },
      { label: 'Deep tan', value: '#88593b' },
    ],
    hair: [{ label: 'Dark brown', value: '#3a2416' }, { label: 'Black', value: '#151010' }, { label: 'Grey', value: '#9a9aa0' }],
    eyes: [{ label: 'Brown', value: '#5a3a1e' }, { label: 'Dark brown', value: '#3e2814' }, { label: 'Amber brown', value: '#7a5226' }],
    attire: [
      { label: 'League navy', line: 'The Strategos’s shared fleet: blue tunic, brass collar.', cloth: '#29466e' },
      { label: 'Survey corps', line: 'Charts and far stations: olive field dress.', cloth: '#4a5a36' },
      { label: 'Merchant service', line: 'Convoys to the colonies: russet coat.', cloth: '#6a3a26' },
    ],
    headwear: { label: 'Comms headset', on: true },
    note: 'Unedited: born as people always were. Full Earth gravity, so the strongest bones in the system.',
    given: ['Amara', 'Kenji', 'Sofia', 'Mateo', 'Priya', 'Tomas', 'Leila', 'Daniel', 'Yusuf', 'Ingrid', 'Wei', 'Ada'],
    family: ['Okafor', 'Tanaka', 'Reyes', 'Novak', 'Haddad', 'Lindqvist', 'Chen', 'Mensah', 'Kowalski', 'Ortiz'],
  },
  moon: {
    skin: [{ label: 'Cream', value: '#e9dccb' }, { label: 'Porcelain', value: '#efe4d8' }, { label: 'Pearl', value: '#e2d6cc' }, { label: 'Ash rose', value: '#ddc9bc' }],
    hair: [{ label: 'Silver', value: '#dfe4ee' }, { label: 'White', value: '#f6f6f8' }, { label: 'Ash', value: '#a8a6a8' }],
    eyes: [{ label: 'Ice blue', value: '#8fb4e0' }, { label: 'Blue', value: '#4f78c8' }, { label: 'Blue grey', value: '#7a8aa4' }],
    attire: [
      { label: 'Archivist', line: 'The long white robe of the Hall of Answers.', cloth: '#f2efe6' },
      { label: 'Amphictyon', line: 'A seat on the council that guards the sanctuary.', cloth: '#9fb4e0' },
      { label: 'Pythia’s grey', line: 'The College’s scholars, who answer for a price.', cloth: '#b8c0cc' },
    ],
    headwear: { label: 'Silver laurel', on: true },
    note: 'Grown long in 0.165 g: a long spine, thin bones, a small heart. Needs a frame to walk on Earth.',
    given: ['Hypatia', 'Theano', 'Diotima', 'Aristarchos', 'Hipparchos', 'Philolaos', 'Kallisto', 'Eudoxos', 'Agathe', 'Meton'],
    family: ['of the Archive', 'of the Lamp', 'of the Near Side', 'of the Hall of Answers', 'of the Colonnade'],
  },
  mercury: {
    skin: [{ label: 'Umber', value: '#3a2418' }, { label: 'Ebony', value: '#2a1a12' }, { label: 'Night', value: '#1e140e' }, { label: 'Bronze', value: '#4e3020' }],
    hair: [{ label: 'Black', value: '#120c08' }, { label: 'Iron', value: '#3a3a3a' }],
    eyes: [{ label: 'Amber', value: '#b8860b' }, { label: 'Gold', value: '#d8a820' }, { label: 'Copper', value: '#a8582a' }],
    attire: [
      { label: 'Red-bronze cloak', line: 'The cloak of the agoge’s graduates.', cloth: '#8e3a22' },
      { label: 'Black of the rails', line: 'The rail crews who keep Lakedaimon walking.', cloth: '#231a14' },
      { label: 'Ephor’s crimson', line: 'Worn the year you watch the kings.', cloth: '#a02a1a' },
    ],
    headwear: { label: 'Crested helm and mirror mask', on: true },
    note: 'Chosen: the darkest skin of any people and a second, clear eyelid against the glare. Everyone walks.',
    given: ['Leonidas', 'Gorgo', 'Brasidas', 'Kyniska', 'Lysandros', 'Agis', 'Arete', 'Pausanias', 'Chilonis', 'Dienekes'],
    family: ['of Lakedaimon', 'of the Rails', 'of the Dawn Watch', 'of the Terminator Run', 'of the Field King’s guard'],
  },
  venus: {
    skin: [{ label: 'Warm tan', value: '#d9b08c' }, { label: 'Rose tan', value: '#dcb498' }, { label: 'Honey', value: '#cfa27c' }, { label: 'Golden', value: '#d4a984' }],
    hair: [{ label: 'Chestnut', value: '#3a2214' }, { label: 'Dark brown', value: '#2e1c12' }, { label: 'Black', value: '#1a1210' }],
    eyes: [{ label: 'Green', value: '#2e8a5a' }, { label: 'Emerald', value: '#1f7a4a' }, { label: 'Sea green', value: '#3a8a6e' }],
    attire: [
      { label: 'The Greens', line: 'Venus’s own racing faction, and the court’s.', cloth: '#1f7a50' },
      { label: 'The Reds', line: 'The old minor faction: merchants and guilds.', cloth: '#8a2430' },
      { label: 'The Whites', line: 'No faction: the Autokrator’s household.', cloth: '#e8e0cc' },
    ],
    headwear: { label: 'Veil and pearl crown', on: true },
    note: 'The most Earth-like bodies: small and light, lungs and skin edited for the acid air. They veil.',
    given: ['Anna', 'Theodora', 'Ioannes', 'Zoe', 'Basil', 'Eudokia', 'Nikephoros', 'Irene', 'Alexios', 'Kassia'],
    family: ['of House Doukas', 'of House Phokas', 'of House Palaiologos', 'of House Angelos', 'of House Komnenos'],
  },
  mars: {
    skin: [{ label: 'Olive', value: '#c48f6a' }, { label: 'Warm olive', value: '#b8845e' }, { label: 'Sun olive', value: '#ac7b58' }, { label: 'Light olive', value: '#cc9a76' }],
    hair: [{ label: 'Black', value: '#1c120c' }, { label: 'Dark brown', value: '#3a2416' }, { label: 'Grey', value: '#8a8a8a' }],
    eyes: [{ label: 'Dark', value: '#2a1a12' }, { label: 'Black', value: '#120a08' }, { label: 'Deep brown', value: '#3a2414' }],
    attire: [
      { label: 'Legion', line: 'Segmented armour and the red cloak of a citizen soldier.', cloth: '#a8232c' },
      { label: 'Senate', line: 'White wool for the curia; you held a magistracy once.', cloth: '#e6e0d0' },
      { label: 'Tribune', line: 'Bronze-brown: the people’s veto, carried into the fleet.', cloth: '#7a5226' },
    ],
    headwear: { label: 'None worn', on: false },
    note: 'Tall in 0.38 g, with bones and heart kept close to human on purpose, and eyes edited for low light.',
    given: ['Gaius', 'Marcus', 'Lucius', 'Aulus', 'Quintus', 'Cornelia', 'Livia', 'Aurelia', 'Tullia', 'Valeria'],
    family: ['Rufus', 'Corvus', 'Varro', 'Scaevola', 'Ahala', 'Naso', 'Crassus', 'Agricola'],
  },
  jupiter: {
    skin: [{ label: 'Moonlight', value: '#e8e2f0' }, { label: 'Pale lilac', value: '#e2daec' }, { label: 'Lilac', value: '#dcd0e6' }],
    hair: [{ label: 'White', value: '#e4e0ee' }, { label: 'Silver', value: '#b8b4c8' }, { label: 'Pale violet', value: '#c8b0e0' }],
    eyes: [{ label: 'Violet', value: '#8a4ad0' }, { label: 'Deep violet', value: '#6a2ab0' }, { label: 'Amethyst', value: '#a46ad8' }],
    attire: [
      { label: 'House of Callisto', line: 'The capital’s court, out of the worst of the radiation.', cloth: '#4b1f7a' },
      { label: 'House of Ganymede', line: 'The larger moon, and the older grudge.', cloth: '#26306e' },
      { label: 'Companion', line: 'A noble who flies: black and silver.', cloth: '#1c1424' },
    ],
    headwear: { label: 'Diadem', on: true },
    note: 'Chosen: the largest eyes in the system and radiation-repair genes. The tallest people; full sunlight hurts.',
    given: ['Ptolemaios', 'Seleukos', 'Antigonos', 'Berenike', 'Arsinoe', 'Stratonike', 'Demetrios', 'Laodike', 'Lysimachos', 'Apama'],
    family: ['of Callisto', 'of Ganymede', 'of the Four Crowns', 'Companion of the King', 'of the Europa ice'],
  },
  saturn: {
    skin: [{ label: 'Fawn', value: '#b9a48e' }, { label: 'Sand', value: '#c4ae96' }, { label: 'Dusk', value: '#ab9680' }],
    hair: [{ label: 'Dark brown fur', value: '#3a2c20' }, { label: 'Brown fur', value: '#4a3a2c' }, { label: 'Umber fur', value: '#56402c' }, { label: 'Grey fur', value: '#6a6a70' }],
    eyes: [{ label: 'Dark', value: '#1e1408' }, { label: 'Black', value: '#0e0a06' }, { label: 'Deep brown', value: '#3a2410' }],
    attire: [
      { label: 'Citizen', line: 'Plain indigo: every citizen votes in the Ekklesia.', cloth: '#2c2a66' },
      { label: 'Flyer', line: 'Wing harness and fur, for the towers and the thick air.', cloth: '#4a3a5a' },
      { label: 'Lot-drawn magistrate', line: 'The kleroterion chose you this year: amber trim.', cloth: '#5a3a1a' },
    ],
    headwear: { label: 'Painted owl-eye', on: true },
    note: 'Chosen: very large dark eyes and dense fur against −179 °C. In Titan’s thick air they fly on strapped-on wings.',
    given: ['Kleon', 'Aspasia', 'Perikles', 'Xanthippe', 'Thoukydides', 'Phryne', 'Alkibiades', 'Lysistrata', 'Ephialtes', 'Hipparete'],
    family: ['of Ligeia', 'of Kraken Mare', 'of Punga', 'of Ontario Lacus', 'of the Bema'],
  },
};

export interface Avatar {
  name: string;
  skin: number; // indexes into the people's AVATAR_OPTIONS lists
  hair: number;
  eyes: number;
  attire: number;
  headwear: boolean;
}

/** Paint for the first ship, within the nation's palette. */
export interface ShipLook {
  name: string;
  trim: number; // index into shipTrims(nation)
  finish: number; // index into SHIP_FINISHES
}

export interface Pilot { nation: NationId; avatar: Avatar; ship: ShipLook }

/** Three hull finishes, as a lightness change on the nation's own hull colours. */
export const SHIP_FINISHES: { label: string; line: string; tone: number }[] = [
  { label: 'Yard standard', line: 'As every yard of your people builds it.', tone: 0 },
  { label: 'Polished', line: 'Brighter plate, for a ship that wants to be seen.', tone: 0.18 },
  { label: 'Dark', line: 'Darkened plate, for a ship that would rather not be.', tone: -0.3 },
];

/** Trim colours: the nation colour first, then the people's cloth and engine glow (races.ts palette). */
export function shipTrims(n: NationId): Swatch[] {
  const p = peopleOf(n).palette;
  return [
    { label: 'Nation colour', value: NATIONS.find((x) => x.id === n)!.color },
    { label: 'Cloth', value: p.cloth },
    { label: 'Engine', value: p.glow },
  ];
}

/** Ship names a captain of each people might choose; the field is free text, these are offered. */
export const SHIP_NAMES: Record<NationId, string[]> = {
  earth: ['Endeavour', 'Resolute', 'Meridian', 'Far Horizon', 'Quito Star', 'Lodestar'],
  moon: ['Lamp of Delphi', 'Long Answer', 'Silver Leaf', 'Near Side', 'Omphalos', 'Quiet Record'],
  mercury: ['Dawn Runner', 'Word Kept', 'Three Hundred', 'Terminator', 'Shield Wall', 'Night Ahead'],
  venus: ['Golden Envelope', 'Purple Ink', 'Hippodrome', 'Grace Aloft', 'Never Fall', 'Chandelier'],
  mars: ['Pietas', 'Fides', 'Via Recta', 'Cincinnatus', 'Green Mars', 'Senatus'],
  jupiter: ['Diadem', 'Fourth Crown', 'Companion’s Pride', 'Sarissa Royal', 'Heir of Io', 'Basileia'],
  saturn: ['Free Speech', 'Kleroterion', 'Owl of Titan', 'Ekklesia', 'Long Night', 'Methane Sea'],
};

/** A seeded pick, so "Suggest" gives a new name each press and tests are steady. */
const pick = <T,>(xs: T[], r: number) => xs[Math.floor(r * xs.length) % xs.length];

/** A name for a person of this people: "Gaius Corvus", "Hypatia of the Archive". */
export function suggestName(n: NationId, r1 = Math.random(), r2 = Math.random()): string {
  const o = AVATAR_OPTIONS[n];
  return `${pick(o.given, r1)} ${pick(o.family, r2)}`;
}

export const suggestShipName = (n: NationId, r = Math.random()) => pick(SHIP_NAMES[n], r);

export function defaultPilot(n: NationId): Pilot {
  return {
    nation: n,
    avatar: { name: suggestName(n, 0, 0), skin: 0, hair: 0, eyes: 0, attire: 0, headwear: AVATAR_OPTIONS[n].headwear.on },
    ship: { name: SHIP_NAMES[n][0], trim: 0, finish: 0 },
  };
}

/** The colours a portrait needs, from an avatar's choices. */
export function avatarLook(n: NationId, a: Avatar) {
  const o = AVATAR_OPTIONS[n];
  return {
    skin: o.skin[a.skin]?.value ?? o.skin[0].value,
    hair: o.hair[a.hair]?.value ?? o.hair[0].value,
    iris: o.eyes[a.eyes]?.value ?? o.eyes[0].value,
    cloth: o.attire[a.attire]?.cloth ?? o.attire[0].cloth,
    headwear: a.headwear,
  };
}
export type AvatarLook = ReturnType<typeof avatarLook>;

export const NAME_MAX = 32;
const cleanName = (v: unknown, d: string) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, NAME_MAX) : d);
const idx = (v: unknown, len: number) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < len ? v : 0);

/** Reads a saved pilot, repairing what it can. Null when there is none (a save from before the opening). */
export function migratePilot(raw: unknown): Pilot | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { nation?: unknown; avatar?: Record<string, unknown>; ship?: Record<string, unknown> };
  const nation = NATIONS.find((x) => x.id === r.nation)?.id;
  if (!nation) return null;
  const d = defaultPilot(nation);
  const o = AVATAR_OPTIONS[nation];
  const a = r.avatar ?? {};
  const s = r.ship ?? {};
  return {
    nation,
    avatar: {
      name: cleanName(a.name, d.avatar.name), skin: idx(a.skin, o.skin.length), hair: idx(a.hair, o.hair.length),
      eyes: idx(a.eyes, o.eyes.length), attire: idx(a.attire, o.attire.length),
      headwear: typeof a.headwear === 'boolean' ? a.headwear : d.avatar.headwear,
    },
    ship: { name: cleanName(s.name, d.ship.name), trim: idx(s.trim, shipTrims(nation).length), finish: idx(s.finish, SHIP_FINISHES.length) },
  };
}

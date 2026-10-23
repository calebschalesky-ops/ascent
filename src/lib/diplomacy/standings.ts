/**
 * Standings between the seven houses (FEUDS.md 2-3; endgame/CONTRACT.md for the bands). Pure, so the director, the
 * enemy AI and a later diplomacy screen all read one table.
 *
 * Standing is directed: `table.v[a][b]` is how house `a` regards house `b`, from -100 to +100. LORE.md's "Who stands
 * where" is a directed table (Earth "holds the Moon close"; the Moon calls Earth a "wary daughter"), and FEUDS.md 3's
 * claim feuds run one way ("Jupiter → Saturn"). Blood feuds are both ways and locked: nothing moves them.
 *
 * Bands (CONTRACT.md): Blood (locked), Hostile ≤ -40, Wary -39 to 19, Friendly 20-59, Allied ≥ 60.
 * What each band does to a fleet meeting you (FEUDS.md 6.2): Blood and Hostile engage on sight, Wary shadows, Friendly
 * and Allied hold fire.
 *
 * Every starting number below is first pass, for Palamedes. Each is the LORE word turned into a value inside its band.
 */
import type { NationId } from '../nations';

export const HOUSES: NationId[] = ['earth', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

export type Band = 'blood' | 'hostile' | 'wary' | 'friendly' | 'allied';
/** What a house's fleet does when it meets a ship of a house it regards this way. */
export type Attitude = 'engage' | 'shadow' | 'hold';

export const BANDS = { hostile: -40, friendly: 20, allied: 60 } as const;
/** Where a claim feud drifts back to once a truce has been bought (FEUDS.md 3: "it decays back to Hostile"). */
export const CLAIM_FLOOR = -50;
/** What a shot fired does (FEUDS.md 2: "a shot fired drops it to Hostile" for Wary; Friendly and Allied cool by this). */
export const SHOT = { friendlyDrop: 40 } as const;

/** Blood feuds: always at war, for every start (FEUDS.md 3). */
export const BLOOD: [NationId, NationId][] = [['mars', 'jupiter'], ['mars', 'earth'], ['moon', 'venus']];
/** Claim feuds, one way: Hostile at the start, and they come back (FEUDS.md 3). */
export const CLAIMS: [NationId, NationId][] = [['jupiter', 'saturn'], ['mars', 'saturn'], ['venus', 'jupiter']];

/** When each blood feud began, for the raid card (TIMELINE.md 11; GAMEPLAY.md P2.2). */
export const FEUD_AGE: Record<string, string> = {
  'earth|mars': 'since the Secession War, 4402–4419',
  'mars|jupiter': 'the Fifth Belt War, since 5961',
  'moon|venus': 'since the Nika Burning, 4791',
};
const key = (a: NationId, b: NationId) => (HOUSES.indexOf(a) < HOUSES.indexOf(b) ? `${a}|${b}` : `${b}|${a}`);
export const feudAge = (a: NationId, b: NationId): string | null => FEUD_AGE[key(a, b)] ?? null;

/**
 * The starting values, row = how that house regards each column (LORE.md "Who stands where"). Blood and claim cells
 * are set from BLOOD and CLAIMS and are not read from here.
 */
const START: Record<NationId, Partial<Record<NationId, number>>> = {
  earth: { moon: 45 /* holds close */, mercury: 25 /* hires */, venus: 30 /* courts */, jupiter: 10 /* flattered */, saturn: 0 /* ignored */ },
  moon: { earth: 15 /* wary daughter */, mercury: 25, mars: 20, jupiter: 20, saturn: 20 /* clients */ },
  mercury: { earth: 10 /* soft */, moon: 30 /* bankers */, venus: -20 /* customer, despised */, mars: 5, jupiter: 5 /* hire */, saturn: 0 /* far */ },
  venus: { earth: 35 /* heirs */, mercury: 20 /* needed */, mars: -15 /* crude */, saturn: 0 /* far */ },
  mars: { moon: 20 /* useful */, mercury: 5 /* hire */, venus: -20 /* decadent */ },
  jupiter: { earth: 10 /* elder dynasty */, moon: 20 /* useful */, mercury: 5 /* hire */, venus: -30 /* rivals */ },
  saturn: { earth: -10 /* not our mother */, moon: 20 /* useful */, mercury: 0, venus: 0 /* far */, mars: -15, jupiter: -20 /* wary */ },
};

export interface Standings {
  /** v[a][b]: how `a` regards `b`, -100..100. Blood pairs hold -100 and are locked. */
  v: Record<NationId, Record<NationId, number>>;
}

export const isBlood = (a: NationId, b: NationId) => BLOOD.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
export const isClaim = (a: NationId, b: NationId) => CLAIMS.some(([x, y]) => x === a && y === b);

export function newStandings(): Standings {
  const v = {} as Standings['v'];
  for (const a of HOUSES) {
    v[a] = {} as Record<NationId, number>;
    for (const b of HOUSES) {
      if (a === b) v[a][b] = 100;
      else if (isBlood(a, b)) v[a][b] = -100;
      else if (isClaim(a, b)) v[a][b] = CLAIM_FLOOR;
      else v[a][b] = START[a][b] ?? 0;
    }
  }
  return { v };
}

export function bandOf(s: Standings, a: NationId, b: NationId): Band {
  if (a !== b && isBlood(a, b)) return 'blood';
  const n = s.v[a][b];
  return n <= BANDS.hostile ? 'hostile' : n < BANDS.friendly ? 'wary' : n < BANDS.allied ? 'friendly' : 'allied';
}

export function attitudeOf(band: Band): Attitude {
  return band === 'blood' || band === 'hostile' ? 'engage' : band === 'wary' ? 'shadow' : 'hold';
}
/** What `a`'s fleets do on meeting `b`'s ships. */
export const attitude = (s: Standings, a: NationId, b: NationId): Attitude => attitudeOf(bandOf(s, a, b));

/** Move how `a` regards `b` by `n`. Blood feuds never move (FEUDS.md 2). Returns the band it lands in. */
export function shift(s: Standings, a: NationId, b: NationId, n: number): Band {
  if (a !== b && !isBlood(a, b)) s.v[a][b] = Math.max(-100, Math.min(100, s.v[a][b] + n));
  return bandOf(s, a, b);
}

/**
 * `b` fired on `a`'s ships. Wary drops to Hostile at once; Friendly and Allied cool by `SHOT.friendlyDrop` (so a
 * friend shot twice is at war). Hostile and Blood are already at war.
 */
export function shotAt(s: Standings, a: NationId, b: NationId): Band {
  const band = bandOf(s, a, b);
  if (band === 'wary') s.v[a][b] = Math.min(s.v[a][b], BANDS.hostile);
  else if (band === 'friendly' || band === 'allied') s.v[a][b] -= SHOT.friendlyDrop;
  return bandOf(s, a, b);
}

/** A claim feud's truce decays back toward Hostile: `minutes` of drift at `perMinute`. */
export function decayClaims(s: Standings, minutes: number, perMinute = 1) {
  for (const [a, b] of CLAIMS) if (s.v[a][b] > CLAIM_FLOOR) s.v[a][b] = Math.max(CLAIM_FLOOR, s.v[a][b] - minutes * perMinute);
}

/** Every house `h` is in a blood feud with. Mercury and Saturn have none (FEUDS.md 3-4). */
export const bloodEnemies = (h: NationId): NationId[] => HOUSES.filter((o) => o !== h && isBlood(h, o));

/**
 * Who sends a start's first raid (GAMEPLAY.md P2.5): the blood enemy; Mars and Jupiter fight the belt war first; with no
 * blood enemy, the house you regard worst (Saturn: Jupiter, whose claim on Titan you resent; Mercury: Venus, the
 * despised customer, whose company is the first hired against you).
 */
export function firstRaider(s: Standings, h: NationId): NationId {
  if (h === 'mars') return 'jupiter';
  if (h === 'jupiter') return 'mars';
  const blood = bloodEnemies(h);
  if (blood.length) return blood[0];
  return HOUSES.filter((o) => o !== h).sort((a, b) => s.v[h][a] - s.v[h][b] || HOUSES.indexOf(a) - HOUSES.indexOf(b))[0];
}

export function migrateStandings(raw: unknown): Standings | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = (raw as { v?: unknown }).v as Record<string, Record<string, unknown>> | undefined;
  if (!v || typeof v !== 'object') return null;
  const s = newStandings();
  for (const a of HOUSES) for (const b of HOUSES) {
    const n = v[a]?.[b];
    if (a !== b && !isBlood(a, b) && typeof n === 'number' && Number.isFinite(n)) s.v[a][b] = Math.max(-100, Math.min(100, n));
  }
  return s;
}

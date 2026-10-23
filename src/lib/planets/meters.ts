/**
 * Planets: the four health meters every world has, the shared rules that move them, and what each does in play.
 * FIRST PASS numbers, all here, for Caleb to reshape (PLANETS.md section 1). Pure: no three.js, no React.
 *
 * Every meter runs 0..100 and 50 is "ordinary": at 50 every effect multiplier below is exactly 1, so a world with
 * middling meters plays exactly as conquest's tables say.
 */

export type MeterId = 'government' | 'military' | 'religion' | 'economy';
export const METERS: MeterId[] = ['government', 'military', 'religion', 'economy'];
export const METER_LABEL: Record<MeterId, string> = {
  government: 'Government', military: 'Military', religion: 'Religion', economy: 'Economy',
};

export type Meters = Record<MeterId, number>;
export const meters = (government = 0, military = 0, religion = 0, economy = 0): Meters => ({ government, military, religion, economy });
export const addMeters = (a: Meters, b: Partial<Meters>, k = 1): Meters =>
  meters(a.government + (b.government ?? 0) * k, a.military + (b.military ?? 0) * k, a.religion + (b.religion ?? 0) * k, a.economy + (b.economy ?? 0) * k);
export const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
export const clampMeters = (m: Meters): Meters => meters(clamp(m.government), clamp(m.military), clamp(m.religion), clamp(m.economy));

export const RULES = {
  /** Seconds for a meter to close half the gap to its target (flight time). */
  halfLife: 180,
  /** Under attack (a hostile ship in the world's orbit zone): the shared rally, added to the targets. */
  rally: { government: 0, military: 10, religion: 5, economy: -10 } as Meters,
  /** Blockaded (the player in orbit with none of the world's ships alive): economy target. */
  blockade: -15,
  /** Each resource the world needs and can neither make nor import, once its stock is spent: economy target. */
  cutOff: -5,
  /** Hunger: government's target falls by this much for every point economy is below `hungerAt`. */
  hungerAt: 40,
  hunger: 0.5,
  /** Losing the world's lifeline (PLANETS.md 1.5): shock, and a lasting target penalty while it is lost. */
  lifelineShock: { government: -15, economy: -15 } as Partial<Meters>,
  lifelineTarget: { government: -15, economy: -20 } as Partial<Meters>,
  /** Ship losses: instant shocks. */
  loss: {
    fighter: { military: -1 },
    cruiser: { military: -3, government: -1 },
    capital: { military: -10, government: -5 },
    destroyer: { military: -5, government: -2 }, // integration pass 2: between cruiser and capital
  } as Record<'fighter' | 'cruiser' | 'capital' | 'destroyer', Partial<Meters>>,
  /** Under occupation: government's target starts here, plus half of what the held buildings give it. */
  occupationBase: 25,
  /** Under occupation, the held buildings give this share of their effect (the natives work them grudgingly). */
  occupiedShare: 0.5,
  /** Under occupation, every point of religion above this costs the occupier `resolve / 2` points of government. */
  resistAbove: 40,
  /** On the moment of conquest, government and military fall to at most this. */
  conquestFloor: 20,
};

/**
 * Religion steadies whoever the people believe in: shocks to government and military are scaled by this, from 1.25
 * at religion 0 to 0.75 at religion 100. It applies only while the natives rule; under occupation it does not.
 */
export const steadiness = (religion: number) => 1.25 - clamp(religion) / 200;

/** Unrest, 0..1: nothing at government 50 and above, total at government 10 and below. */
export const unrest = (government: number) => clamp((50 - government) / 40, 0, 1);

/** What the meters do in play: multipliers handed to conquest (and to the shop), each exactly 1 at meters of 50. */
export interface Effects {
  /** Navy rebuild: multiplies conquest's line speed (military, less strikes). */
  build: number;
  /** Site repair: multiplies conquest's mend rate and slows its rebuild of wrecks (military). */
  repair: number;
  /** Works output: multiplies conquest's 0.1/s × richness (economy, less strikes). */
  works: number;
  /** Capture hold time: multiplies the seconds the player must hold a site (government). */
  hold: number;
  /** Prices at the world's shipyard and shops, when the player can buy there (economy). */
  price: number;
  /** Unrest 0..1 (government). */
  unrest: number;
  /** For a world the player controls: multiplies its income to the player (economy, less unrest). */
  income: number;
}

export function effects(m: Meters): Effects {
  const u = unrest(m.government);
  return {
    build: (0.5 + m.military / 100) * (1 - 0.3 * u),
    repair: 0.5 + m.military / 100,
    works: (0.5 + m.economy / 100) * (1 - 0.5 * u),
    hold: 0.75 + m.government / 200,
    price: 1.25 - m.economy / 200,
    unrest: u,
    income: (0.5 + m.economy / 100) * (1 - 0.5 * u),
  };
}

/** Move each meter toward its target over `dt` seconds (exponential, half-life RULES.halfLife × the world's rate). */
export function approach(m: Meters, target: Meters, dt: number, rate: Partial<Meters> = {}): Meters {
  const out = { ...m };
  for (const k of METERS) {
    const f = 1 - Math.pow(0.5, (dt * (rate[k] ?? 1)) / RULES.halfLife);
    out[k] = m[k] + (target[k] - m[k]) * f;
  }
  return out;
}

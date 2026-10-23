/**
 * Atmospheres: how thick each body's air is by altitude, and the flight model in air (drag, a lower top speed, lift,
 * gravity, entry heating, the gas giants' crush depth), blended with the space model as you climb out.
 * Pure functions, no three.js, so all of it is unit-tested.
 *
 * Two kinds of unit, so this carries across a change of scale (see SPEC.md "Atmospheres"):
 * - Heights are fractions of the body's radius R (h = 0.01 is 1% of R above the datum: sea level, or the 1-bar
 *   level of a gas giant). The atmosphere, the terrain and the crush depth grow with the body.
 * - Speeds and accelerations are in ship-sized scene units (the player's hull is 0.371 units long), because they
 *   are about how the ship handles, not how big the planet is.
 */

export type AirBody = 'earth' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';
export type RGB = [number, number, number];

export interface AtmoSpec {
  /** The top of the air, as a fraction of R above the datum. Above it density is exactly 0. */
  top: number;
  /** Scale height (density falls by e every scale height), fraction of R. */
  scale: number;
  /** Density at the datum, relative to Earth's at sea level. */
  rho0: number;
  /** Has ground to fly over (false: a gas giant, with cloud decks and a crush depth instead). */
  surface: boolean;
  /** Gas giants: depth below the datum, fraction of R, at which the pressure pushes the ship back out. */
  crush: number;
  /** Terrain: the highest peaks stand about this far above the datum, fraction of R. */
  relief: number;
  /** Oceans fill everything below the datum. */
  sea: boolean;
  /** Surface gravity relative to Earth's. */
  gravity: number;
  /** Day sky at the datum: straight up, at the horizon, and the horizon toward a low Sun. Linear RGB, 0..1. */
  zenith: RGB;
  horizon: RGB;
  sunset: RGB;
  /** True where the numbers follow the real body; false where the air is a game choice (the Moon, Mercury). */
  physical: boolean;
}

/**
 * Real scale heights as a fraction of radius are tiny (Earth 8.5 km of 6,371 = 0.13%), which next to ships a
 * thousand to an Earth radius would make the air 16 ship lengths deep. The game thickens every atmosphere by the
 * same idea (Earth's top at 6% of R, where the blue rim already sits seen from space) and keeps the order between
 * bodies: Venus thick, Mars thin, the giants deep and banded. Densities near the real ratios, except Venus (real
 * ~65× Earth, here 6× so it can still be flown) and the Moon and Mercury (real: a near-vacuum exosphere; here a
 * thin haze because Caleb asked for air on each planet). Sources in ATMOSPHERE-NOTES.md.
 */
export const ATMO: Record<AirBody, AtmoSpec> = {
  earth: {
    top: 0.06, scale: 0.0075, rho0: 1, surface: true, crush: 0, relief: 0.012, sea: true, gravity: 1,
    zenith: [0.1, 0.3, 0.85], horizon: [0.62, 0.78, 1.0], sunset: [1.0, 0.5, 0.22], physical: true,
  },
  venus: {
    top: 0.06, scale: 0.012, rho0: 6, surface: true, crush: 0, relief: 0.006, sea: false, gravity: 0.9,
    zenith: [0.62, 0.45, 0.2], horizon: [0.95, 0.8, 0.5], sunset: [0.9, 0.45, 0.15], physical: true,
  },
  mars: {
    top: 0.06, scale: 0.0125, rho0: 0.02, surface: true, crush: 0, relief: 0.015, sea: false, gravity: 0.38,
    zenith: [0.5, 0.34, 0.22], horizon: [0.85, 0.64, 0.45], sunset: [0.35, 0.5, 0.85], physical: true,
  },
  jupiter: {
    top: 0.035, scale: 0.004, rho0: 0.5, surface: false, crush: 0.012, relief: 0, sea: false, gravity: 2.53,
    zenith: [0.5, 0.42, 0.32], horizon: [0.9, 0.8, 0.64], sunset: [0.85, 0.5, 0.3], physical: true,
  },
  saturn: {
    top: 0.035, scale: 0.005, rho0: 0.3, surface: false, crush: 0.012, relief: 0, sea: false, gravity: 1.07,
    zenith: [0.55, 0.5, 0.36], horizon: [0.92, 0.86, 0.68], sunset: [0.85, 0.6, 0.35], physical: true,
  },
  moon: {
    top: 0.02, scale: 0.006, rho0: 0.01, surface: true, crush: 0, relief: 0.008, sea: false, gravity: 0.165,
    zenith: [0.03, 0.04, 0.07], horizon: [0.2, 0.21, 0.25], sunset: [0.35, 0.3, 0.3], physical: false,
  },
  mercury: {
    top: 0.02, scale: 0.006, rho0: 0.01, surface: true, crush: 0, relief: 0.008, sea: false, gravity: 0.38,
    zenith: [0.05, 0.045, 0.04], horizon: [0.27, 0.23, 0.18], sunset: [0.4, 0.3, 0.2], physical: false,
  },
};
export const AIR_BODIES = Object.keys(ATMO) as AirBody[];
export const isAirBody = (s: unknown): s is AirBody => typeof s === 'string' && s in ATMO;

/** The flight model in air, in ship units (the hull is 0.371 long). */
export const AIR = {
  vSea: 25, // top speed in Earth's air at sea level, units/s (about 67 ship lengths a second); falls as 1/√density
  thrust: 30, // the engines' push in air, units/s²; drag equals it at the top speed
  turnGrip: 6, // in thick air the velocity follows the nose at this rate (1/s), like wings; space assist uses 5
  g: 6, // Earth's gravity, units/s²
  vStall: 5, // below this speed (in Earth's air at sea level) the wings carry less than the weight; × 1/√density
  hover: 0.7, // the engines always carry this much of the weight, so a stopped ship sinks slowly, never drops
  entry: 220, // the fastest the ship arrives at an atmosphere's top, units/s; the air slows it from there
  clearance: 0.35, // the hull stops this far above the ground, units
  crushPush: 90, // at the crush depth the pressure pushes out this hard, units/s² (three times the engines)
};

/** Height above the datum as a fraction of R, from a distance to the body's centre. */
export const altFrac = (distFromCentre: number, radius: number) => distFromCentre / radius - 1;

/** 0..1 profile: 1 at the datum, exactly 0 at the top, exponential by scale height in between (and >1 below). */
function profile(s: AtmoSpec, h: number): number {
  if (h >= s.top) return 0;
  const e = Math.exp(-s.top / s.scale);
  return (Math.exp(-h / s.scale) - e) / (1 - e);
}

/** Air density at height h (fraction of R above the datum), relative to Earth's at sea level. */
export const density = (s: AtmoSpec, h: number) => s.rho0 * profile(s, h);

/**
 * The space-to-air blend: 0 at the top of the air (the space flight model), 1 at the datum (the air model).
 * It follows the density profile, so the change is gentle high up and complete near the ground.
 */
export const airBlend = (s: AtmoSpec, h: number) => Math.max(0, Math.min(1, profile(s, h)));

/** The top speed the air allows at this density; Infinity in vacuum. */
export const maxAirspeed = (rho: number) => (rho <= 1e-9 ? Infinity : AIR.vSea / Math.sqrt(rho));

/** Deceleration from drag (quadratic in speed, linear in density), units/s². Equals the thrust at the top speed. */
export const dragDecel = (rho: number, v: number) => (AIR.thrust * rho * v * v) / (AIR.vSea * AIR.vSea);

/** One step of speed in air: thrust toward what is wanted, drag always. Never overshoots `want` from below. */
export function airSpeedStep(v: number, want: number, rho: number, dt: number): number {
  const cap = Math.min(want, maxAirspeed(rho));
  const drag = dragDecel(rho, v);
  if (v < cap) return Math.min(cap, v + Math.max(0, AIR.thrust - drag) * dt + (cap - v) * (1 - Math.exp(-dt * 1.2)) * 0.5);
  // Over what is wanted: drag and reverse thrust bring it down, at least as fast as the space model's braking.
  const down = Math.max(drag, (v - cap) * 2.2) * dt;
  return Math.max(cap, v - down);
}

/** Share of the weight the wings and engines carry: the hover floor, up to all of it above the stall speed. */
export function liftShare(v: number, rho: number): number {
  const stall = AIR.vStall / Math.sqrt(Math.max(rho, 1e-6));
  const aero = Math.min(1, (v / stall) ** 2);
  return Math.max(AIR.hover, aero);
}

/** Downward acceleration the ship feels (gravity less lift), blended out toward the top of the air. units/s². */
export const sinkAccel = (s: AtmoSpec, h: number, v: number) => AIR.g * s.gravity * airBlend(s, h) * (1 - liftShare(v, density(s, h)));

/**
 * Entry heating, after the Sutton–Graves stagnation-point relation (heat flux ∝ √density × speed³), normalised so 1
 * is a hard entry (density 0.05, 6× the sea-level top speed). The plasma glow is 1 − e^−heat.
 */
export const heating = (rho: number, v: number) => Math.sqrt(Math.max(rho, 0) / 0.05) * (v / (AIR.vSea * 6)) ** 3;
export const plasmaGlow = (rho: number, v: number) => 1 - Math.exp(-heating(rho, v));

/** Buffeting 0..1: from dynamic pressure past the sea-level cruise, and from the heat of entry. */
export function buffet(rho: number, v: number): number {
  const q = (rho * v * v) / (AIR.vSea * AIR.vSea); // 1 at full speed at sea level
  return Math.min(1, 0.6 * plasmaGlow(rho, v) + 0.4 * Math.max(0, Math.min(1, (q - 0.8) / 3)));
}

/**
 * Gas giants: the push back out once deeper than 70% of the crush depth, rising to AIR.crushPush at it (units/s²).
 * h is the height above the datum (negative below), fraction of R. 0 for bodies with ground.
 */
export function crushAccel(s: AtmoSpec, h: number): number {
  if (s.surface || s.crush <= 0) return 0;
  const depth = -h;
  const start = s.crush * 0.7;
  if (depth <= start) return 0;
  const k = (depth - start) / (s.crush - start);
  return AIR.crushPush * k * k;
}

/**
 * How much the sky covers the stars (0 in space, toward 0.97 deep in thick air) and its colour, for the sun at
 * `sunUp` (sine of its elevation above the local horizon). The sky shader runs the same sums per pixel.
 */
export function skyAt(s: AtmoSpec, h: number, sunUp: number): { cover: number; zenith: RGB; horizon: RGB } {
  // Optical depth above the ship relative to the column at the datum, so thin air gives a thin sky.
  // Raised to a power below 1 so the sky fills in well before the ground: half the air above you reads as most of a sky.
  const column = Math.min(1, profile(s, h)) ** 0.4 * Math.min(1, Math.sqrt(s.rho0) * 1.6 + 0.15);
  const day = Math.max(0, Math.min(1, (sunUp + 0.12) / 0.3));
  const low = 1 - Math.max(0, Math.min(1, sunUp / 0.35)); // toward sunset the horizon warms
  const mixC = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const scaleC = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];
  const cover = Math.min(0.97, column * 1.25 * (0.2 + 0.8 * day));
  return {
    cover,
    zenith: scaleC(s.zenith, column * (0.04 + 0.96 * day)),
    horizon: scaleC(mixC(s.horizon, s.sunset, low * day), column * (0.06 + 0.94 * day)),
  };
}

/** Seconds until the ground, flying straight on: altitude over the speed down (Infinity when climbing or level). */
export const timeToGround = (altitude: number, descent: number) => (descent <= 1e-6 ? Infinity : Math.max(0, altitude) / descent);
/** Pull up: the ground within 3 s on this line, or within 1.2 s while low. */
export const pullUp = (altitude: number, descent: number) => timeToGround(altitude, descent) < (altitude < 3 ? 1.2 : 3);

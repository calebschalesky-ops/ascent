/**
 * The three swarm roles and every number they fly by. Lengths are in player-ship lengths (L) and speeds in L/s, as in
 * fleet-command's spec and the hangar table, so a rescale of the player ship carries through. First pass, to be tuned
 * by play: DRONE-SWARMS.md says where each number came from.
 */
import { ARSENAL_DRONES, ARSENAL_L, FLAK } from './refs';

/**
 * `attack` is arsenal's attack drone (same id, same gun: 6 damage at 1.2 a second, 60 units), flocking and focusing
 * its fire as a beam. `explosive` and `shield` are new drones that only exist in swarms.
 */
export type SwarmRole = 'explosive' | 'shield' | 'attack';
export const SWARM_ROLES: SwarmRole[] = ['explosive', 'shield', 'attack'];

export const ROLE_LABEL: Record<SwarmRole, string> = {
  explosive: 'Explosive drones',
  shield: 'Shield drones',
  attack: 'Laser-focus drones',
};

export interface RoleSpec {
  /** Length, L. The hangar note costs a drone at a quarter slot, about half a fighter (0.1 L). */
  size: number;
  hp: number;
  /** Top speed, L/s, relative to whatever the swarm is working round (its ward, its target, its carrier). */
  speed: number;
  /** L/s². */
  accel: number;
  /** Boids weights (Reynolds 1987): separation, alignment, cohesion, and the pull of the member's own goal. */
  sep: number;
  ali: number;
  coh: number;
  goal: number;
  /** Separation acts inside this distance, L. */
  sepDist: number;
  /** Topological neighbours: each member steers by its nearest K, not by everyone in a radius (Ballerini 2008). */
  neighbours: number;
  /** How far a member looks for neighbours, L. */
  view: number;
  /** 0..1: how hard members weave on their own, so a swarm shimmers instead of flying as a block. */
  jitter: number;
  /** Explosive: the ring the pack stalks on before it strikes. Laser: beam range. Shield: unused. L. */
  range: number;
  /** Explosive: blast damage. Laser: damage per second per beam. */
  damage: number;
  /** Explosive: blast radius, L. Shield: the field each drone projects (what it can stop), L. */
  area: number;
  /** Drones out of the bay per second. */
  launchRate: number;
  color: string;
}

export const ROLES: Record<SwarmRole, RoleSpec> = {
  explosive: {
    size: 0.1, hp: 4, speed: 95, accel: 260,
    sep: 1.6, ali: 0.5, coh: 0.4, goal: 1.4, sepDist: 3, neighbours: 7, view: 10, jitter: 0.35,
    range: 85, damage: 30, area: 2.5, launchRate: 10, color: '#ffb05c',
  },
  shield: {
    size: 0.12, hp: 30, speed: 70, accel: 240,
    sep: 1.5, ali: 0.2, coh: 0.05, goal: 3, sepDist: 0.9, neighbours: 6, view: 4, jitter: 0.03,
    range: 0, damage: 0, area: 2, launchRate: 10, color: '#8fe3ff',
  },
  attack: {
    size: 0.1, hp: 8, speed: 70, accel: 220,
    sep: 1.2, ali: 0.7, coh: 0.5, goal: 1.6, sepDist: 2, neighbours: 7, view: 10, jitter: 0.15,
    range: ARSENAL_DRONES.attack.range / ARSENAL_L, damage: ARSENAL_DRONES.attack.damage * ARSENAL_DRONES.attack.rate,
    area: 0, launchRate: 10, color: ARSENAL_DRONES.attack.color,
  },
};

/** Explosive drones speed up this much for the final run in. */
export const STRIKE_SPEED = 1.1;
/** An explosive drone goes off when it comes this close to a ship's hull or to any hostile drone, L. */
export const CONTACT = 0.6;
/** The pack strikes once this share of its flying members are on the stalking ring, or after `STALK_MAX` seconds. */
export const STALK_READY = 0.75;
export const STALK_MAX = 8;

/** Shield drones keep this far outside the ward's hull, L. */
export const SHELL_GAP = 2.5;
/** A closed bubble when the drones can cover this share of the sphere round the ward; fewer form a wall toward the threat. */
export const BUBBLE_COVER = 0.9;

/** Laser drones hold this share of their range off the target. */
export const STANDOFF = 0.6;
/** Converged beams burn harder: up to +50% once `FOCUS_FULL` beams meet on one point (Japanese honeybees cook a hornet by massing). */
export const FOCUS_BONUS = 0.5;
export const FOCUS_FULL = 12;
/** Total damage a second from `n` beams meeting on one point. */
export const focusDps = (n: number, dps = ROLES.attack.damage) =>
  n <= 0 ? 0 : n * dps * (1 + FOCUS_BONUS * Math.min(1, (n - 1) / (FOCUS_FULL - 1)));

/** Escorting swarms (defend, follow) guard this far round their ward and engage hostile drones inside it, L. */
export const GUARD = 80;

/**
 * The guns a ship turns on drones (DEFENCE in refs.ts says how many). Point defence: arsenal's point-defence drone's
 * range and rate, a 50% hit, 10 damage (one hit kills an explosive or laser drone; a shield drone takes three). Flak:
 * arsenal's burst damage (30) and rate, fired at drones only inside 60 L, scattered 0.12 rad from where it aimed. Its
 * area against drones is 6 L, not arsenal's 7 units (19 L): that is a missile's fuse reach, and at 19 L one burst
 * erased a whole 48-drone pack in testing. A drone a tenth of a ship long is hard to hit with fragments. A shell arms
 * `arm` L out, so it never bursts against its own hull: the last stretch belongs to point defence.
 */
export const PD = { range: ARSENAL_DRONES.pointDefence.range / ARSENAL_L, rate: ARSENAL_DRONES.pointDefence.rate, chance: 0.5, damage: 10 };
export const FLAK_VS_DRONES = { range: 60, rate: FLAK.rate, damage: FLAK.damage, area: 6, scatter: 0.12, arm: 12 };

/**
 * The numbers behind fleet ships: how each type flies and shoots, what each stance means, how wide each formation
 * stands. Lengths are in player-ship lengths (L), so a rescale of the player ship carries through. First pass, to be
 * tuned by play.
 */
import type { ShipType } from '../shipTypes';
import type { FormationId, OrderKind, Stance } from './types';

export interface CombatSpec {
  /** Top speed, L/s. */
  speed: number;
  /** L/s². */
  accel: number;
  /** rad/s. */
  turn: number;
  /** Gun range, L. */
  range: number;
  /** Shots per second, per gun. */
  rate: number;
  guns: number;
  damage: number;
  /** How far off the nose a gun can fire, radians. π is a turret. */
  cone: number;
  /** How much it would rather fight each type (bigger is keener). */
  prefers: Record<ShipType, number>;
}

export const COMBAT: Record<ShipType, CombatSpec> = {
  capital: { speed: 12, accel: 6, turn: 0.3, range: 160, rate: 1.2, guns: 4, damage: 14, cone: Math.PI, prefers: { capital: 1.6, cruiser: 1.3, fighter: 0.8, destroyer: 1.4 } },
  cruiser: { speed: 36, accel: 30, turn: 1.3, range: 100, rate: 2.5, guns: 1, damage: 10, cone: 0.2, prefers: { capital: 1.3, cruiser: 1.4, fighter: 0.9, destroyer: 1.2 } },
  fighter: { speed: 60, accel: 80, turn: 2.6, range: 60, rate: 3, guns: 1, damage: 5, cone: 0.25, prefers: { capital: 0.8, cruiser: 1.1, fighter: 1.6, destroyer: 1.0 } },
  // The destroyer (claude/destroyer-a8ff7d DESTROYER.md): faster and more agile than cruiser and capital, three turrets
  // out-gunning a cruiser, a little under a capital ship. A hunter: it would rather fight cruisers and destroyers.
  destroyer: { speed: 44, accel: 34, turn: 1.55, range: 120, rate: 1.8, guns: 3, damage: 11, cone: Math.PI, prefers: { capital: 1.1, cruiser: 1.6, fighter: 1.0, destroyer: 1.5 } },
};

/** Fleet bolts, L/s. 700 L/s is the player's own laser speed (260 units/s) at today's ship length. */
export const BOLT = { speed: 700, life: 1.3 };

export interface StanceSpec {
  label: string;
  /** How far a ship looks for something to shoot, × its gun range. 0: it never picks its own targets. */
  engage: number;
  /** How far it may chase from its post, × its gun range. */
  leash: number;
  fire: boolean;
  /** 0..1: how hard it weaves while it flies. */
  jink: number;
  /** The distance it holds off a target, × its gun range. */
  standoff: number;
}

export const STANCES: Record<Stance, StanceSpec> = {
  aggressive: { label: 'Aggressive', engage: 2, leash: 4, fire: true, jink: 0.15, standoff: 0.3 },
  defensive: { label: 'Defensive', engage: 1, leash: 1.2, fire: true, jink: 0.35, standoff: 0.55 },
  holdFire: { label: 'Hold fire', engage: 0, leash: 0, fire: false, jink: 0.35, standoff: 0.6 },
  evasive: { label: 'Evasive', engage: 0.8, leash: 0.8, fire: true, jink: 1, standoff: 0.9 },
};
export const STANCE_ORDER: Stance[] = ['aggressive', 'defensive', 'holdFire', 'evasive'];

export interface FormationSpec { label: string; /** Gap between slots, × the biggest member's length (at least 1 L). */ gap: number }
export const FORMATIONS: Record<FormationId, FormationSpec> = {
  wedge: { label: 'Wedge', gap: 3 },
  line: { label: 'Line abreast', gap: 4 },
  column: { label: 'Column', gap: 3.5 },
  screen: { label: 'Screen', gap: 2.5 },
};
export const FORMATION_ORDER: FormationId[] = ['wedge', 'line', 'column', 'screen'];

export const ORDER_LABEL: Record<OrderKind, string> = {
  follow: 'Follow', hold: 'Hold', attack: 'Attack', defend: 'Defend', path: 'Path', recall: 'Recall',
};

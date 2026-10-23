/**
 * What an enemy ship of a nation and type carries into a fight, in one place, so the scene (combat.ts) and the
 * balance simulator read the same numbers. Integration pass 2: the fit is enemy-ai's seeded roll (lib/enemyArms.ts
 * rollFit, ordered by nation doctrine, type and level, Caleb's ruling in the arsenal thread), on its type's hull from
 * lib/shipTypes.ts, as arsenal's defences (lib/shields.ts). Progression's LOADOUTS now arm only the player.
 */
import type { EnemyFit } from './enemyArms';
import { CLASS, levelOf, rollFit } from './enemyArms';
import type { NationId } from './nations';
import type { Defence } from './shields';
import { SHIELDS, makeDefence } from './shields';
import type { ShipType } from './shipTypes';

export interface CraftArms { fit: EnemyFit; level: number; def: Defence; dodge: number }

/**
 * A fresh fit and set of defences for one ship (each ship needs its own: the arsenal wears them down). `level` overrides
 * the nation's (the first raid flies level-1 pickets, so a level-1 pilot can win it).
 */
export function craftArms(nation: NationId, type: ShipType, seed = 0, level = levelOf(nation, type)): CraftArms {
  const spec = CLASS[type];
  const fit = rollFit(nation, type, level, seed);
  const def = makeDefence(SHIELDS[fit.shield], spec.hp, fit.shieldTier, fit.armour);
  def.maxShield *= spec.shieldMul; def.regen *= spec.shieldMul; def.shield = def.shield.map(() => def.maxShield);
  return { fit, level, def, dodge: spec.dodge };
}

/** Hit points to chew through (hull + armour + every shield facet) and the missile dodge, for the simulator. */
export function craftStats(nation: NationId, type: ShipType, seed = 0): { hp: number; dodge: number } {
  const { def, dodge } = craftArms(nation, type, seed);
  return { hp: def.maxHull + def.maxShield * def.shield.length, dodge };
}

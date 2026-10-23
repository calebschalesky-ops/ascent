/**
 * Who launches, at what. The player's side: the nearest friendly capital ship within range that has a boarder left.
 * Enemy capital ships: launch at the nearest player-side warship in range whose shield is down, unless the boarders
 * already on their way to it would win anyway. Pure.
 *
 * The line-of-sight test is an argument: with enemy-ai merged it is its tactics.clearShot over the Occluder list
 * (bodies, ships, stations), so a capital ship never launches through a planet.
 */
import type { V3 } from '../nav';
import { dist } from '../nav';
import type { Hull } from './boarder';
import { canBoard, canLaunch, crewOf } from './boarder';
import { BOARDER, ENEMY, boarderOf } from './spec';
import type { TroopForce } from './troops';
import { resolve } from './troops';

export type ClearShot = (from: V3, to: V3, selfId: number, targetId: number) => boolean;
export const ALWAYS_CLEAR: ClearShot = () => true;

export interface Launcher { hull: Hull; bay: number; cooldown: number }

/** The ship that launches at `target` for its side, or null (and why). */
export function pickLauncher(launchers: Launcher[], target: Hull, L: number, clear: ClearShot = ALWAYS_CLEAR): { launcher: Launcher | null; why: string } {
  if (!canBoard(target.type)) return { launcher: null, why: 'Boarders take only cruisers and capital ships' };
  const own = launchers.filter((l) => l.hull.alive && canLaunch(l.hull.type) && l.hull.side !== target.side);
  if (!own.length) return { launcher: null, why: 'No capital ship to launch from' };
  const stocked = own.filter((l) => l.bay > 0);
  if (!stocked.length) return { launcher: null, why: 'No boarders left in the bay' };
  const inRange = stocked
    .filter((l) => dist(l.hull.pos, target.pos) <= boarderOf(l.hull.nation).range * L && clear(l.hull.pos, target.pos, l.hull.id, target.id))
    .sort((a, b) => dist(a.hull.pos, target.pos) - dist(b.hull.pos, target.pos));
  if (!inRange.length) return { launcher: null, why: 'Target out of boarding range' };
  return { launcher: inRange[0], why: '' };
}

export interface EnemyView {
  launcher: Launcher;
  /** Player-side warships with their shield share (0..1) and hull share. */
  targets: { hull: Hull; shield: number; hull01: number; defenders?: TroopForce }[];
  /** Troops already on their way to (or fighting in) each target, from this side. */
  committed: Map<number, TroopForce>;
  L: number;
  clear?: ClearShot;
}

/** The id of the ship an enemy capital ship launches at now, or null. */
export function enemyLaunch(v: EnemyView): number | null {
  const l = v.launcher;
  if (!l.hull.alive || !canLaunch(l.hull.type) || l.bay <= 0 || l.cooldown > 0) return null;
  const range = boarderOf(l.hull.nation).range * v.L;
  const clear = v.clear ?? ALWAYS_CLEAR;
  const options = v.targets
    .filter((t) => t.hull.alive && t.hull.side !== l.hull.side && canBoard(t.hull.type))
    .filter((t) => t.shield <= BOARDER.shieldGate && dist(t.hull.pos, l.hull.pos) <= range)
    .filter((t) => clear(l.hull.pos, t.hull.pos, l.hull.id, t.hull.id))
    .filter((t) => {
      // Enough already sent? Then save the boarder.
      const sent = v.committed.get(t.hull.id);
      if (!sent || sent.strength <= 0) return true;
      const def = t.defenders ?? crewOf(t.hull.type, t.hull.nation, t.hull01);
      return resolve(sent, def).outcome !== 'captured';
    })
    .sort((a, b) => dist(a.hull.pos, l.hull.pos) - dist(b.hull.pos, l.hull.pos));
  return options.length ? options[0].hull.id : null;
}

export const ENEMY_COOLDOWN = ENEMY.cooldown;

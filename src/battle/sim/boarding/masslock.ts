/**
 * Mass lock (VISION §7, PKG-05): a ship within MASSLOCK.range of an active enemy capital or destroyer cannot jump.
 * No imports from battle.ts, so battle.ts's canJump() can use it without a cycle.
 */
import { dist } from '../ships';
import { otherSide } from '../types';
import type { Battle, Ship } from '../types';
import { MASSLOCK } from './numbers';

/** The enemy ships holding `s` in mass lock (empty: free to jump). */
export function massLockers(b: Battle, s: Ship): Ship[] {
  const foe = otherSide(s.side);
  return b.ships.filter((o) => o.side === foe && o.status === 'active' && MASSLOCK.classes.includes(o.cls)
    && dist(o.pos, s.pos) <= MASSLOCK.range);
}

export const massLocked = (b: Battle, s: Ship) => massLockers(b, s).length > 0;

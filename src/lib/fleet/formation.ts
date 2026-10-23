/**
 * Formation slots. A slot is an offset in the anchor's own frame: x to its right, y up, z behind it. The leader (or
 * the anchor point) sits at the origin; slot 0 is the first ship after it.
 */
import type { V3 } from '../nav';
import { add, cross, dist, len, scale, unit } from '../nav';
import type { ShipType } from '../shipTypes';
import { SHIP_SPECS } from '../shipTypes';
import { FORMATIONS } from './spec';
import type { FormationId } from './types';

/** The gap between slots in world units: the formation's gap times the biggest member's length (at least 1 L). */
export function formationGap(f: FormationId, types: ShipType[], L: number): number {
  const biggest = Math.max(1, ...types.map((t) => SHIP_SPECS[t].size));
  return FORMATIONS[f].gap * biggest * L;
}

/**
 * Slot `k` of `n`, as [right, up, back]. `clear` keeps every slot outside the leader's hull (its hit radius plus a
 * little), so fighters forming on a capital ship do not sit inside it.
 */
export function slotOffset(f: FormationId, k: number, n: number, gap: number, clear = 0): V3 {
  const rank = Math.floor(k / 2) + 1;
  const side = k % 2 === 0 ? 1 : -1;
  switch (f) {
    case 'wedge': return [side * (clear + rank * gap), 0, clear + rank * gap];
    case 'line': return [side * (clear + rank * gap), 0, 0];
    case 'column': return [0, 0, clear + (k + 1) * gap];
    case 'screen': {
      // A ring round the leader, a little ahead of it, square to its course: the shape for screening a big ship.
      const r = Math.max(clear + gap * 1.5, (Math.max(n, 3) * gap) / (2 * Math.PI));
      const a = (k / Math.max(n, 1)) * Math.PI * 2;
      return [Math.cos(a) * r, Math.sin(a) * r, -clear * 0.4];
    }
  }
}

/** A frame from a forward direction: right, up and forward, all unit, with +y as the world's up. */
export function frameOf(fwd: V3): { right: V3; up: V3; fwd: V3 } {
  const f = unit(fwd);
  let right = cross(f, [0, 1, 0]);
  if (len(right) < 1e-6) right = [1, 0, 0];
  right = unit(right);
  return { right, up: unit(cross(right, f)), fwd: f };
}

/** A slot offset placed in the world, from an anchor at `pos` facing `fwd`. */
export function slotWorld(pos: V3, fwd: V3, off: V3): V3 {
  const fr = frameOf(fwd);
  return add(add(add(pos, scale(fr.right, off[0])), scale(fr.up, off[1])), scale(fr.fwd, -off[2]));
}

/** The smallest distance between any two of the points (the leader included), to report how tight a formation is. */
export function nearestSpacing(points: V3[]): number {
  let best = Infinity;
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) best = Math.min(best, dist(points[i], points[j]));
  return best;
}

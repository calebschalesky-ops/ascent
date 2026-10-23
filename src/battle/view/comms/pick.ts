/**
 * Which ship a click (or the pointer, for the hover ring) means (PKG-17). Pure screen-space arithmetic: the controller
 * projects every visible ship and asks the scene which hulls lie under the pointer, then this picks one.
 *
 * Why not the raycast alone (TRC-03: 62 of 150 aimed clicks on enemy ships opened no menu, or the wrong one): a big hull
 * nearer the camera swallows the small ship drawn on top of it, and a far escort is a few pixels of mesh. So the rule is
 * screen distance: the ship whose projected centre is nearest the pointer wins, within a generous radius; a hull under
 * the pointer counts as `hullPx` away, so clicking the long flank of a capital still picks the capital, but clicking
 * right on an escort's icon in front of it picks the escort.
 */
import { COMMS_UI } from './numbers';

export interface PickCandidate {
  id: string;
  /** Projected centre, px, in the same frame as the pointer. */
  x: number;
  y: number;
  /** The pointer's ray touches this ship's hull. */
  hit: boolean;
  /** Distance along the ray to that hull (for ties), or Infinity. */
  depth?: number;
}

export interface PickNumbers { radius: number; hullPx: number }

/** The id of the ship meant by a pointer at (x, y), or null when none is near enough. */
export function pickNearest(cands: readonly PickCandidate[], x: number, y: number, n: PickNumbers = { radius: COMMS_UI.pickRadius, hullPx: COMMS_UI.pickHullPx }): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  let bestDepth = Infinity;
  for (const c of cands) {
    const d = Math.hypot(c.x - x, c.y - y);
    if (!c.hit && d > n.radius) continue;
    const eff = c.hit ? Math.min(d, n.hullPx) : d;
    const depth = c.depth ?? Infinity;
    if (eff < bestD - 1e-6 || (Math.abs(eff - bestD) <= 1e-6 && depth < bestDepth)) { best = c.id; bestD = eff; bestDepth = depth; }
  }
  return best;
}

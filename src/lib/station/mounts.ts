/**
 * The seam between a station's body and its systems. god-armour owns the body (the megastructure, its orbit, berths and
 * docking) and publishes its mount points as `src/lib/megastructure/hardpoints.ts`. This thread owns what is mounted
 * on them. Until that file lands, everything here is written against the shape below (agreed in the notes folder,
 * stations-to-god-armour.md), and `provisionalMounts` puts the same kinds of hardpoint on today's small station model
 * so the systems can be proved in the scene. When the real hardpoints arrive, only this file changes.
 */
import type { V3 } from '../nav';
import { add, cross, len, scale, unit } from '../nav';

/**
 * The old small station's shape, in ship lengths (it was STATION_SIZE in stations.ts until god-armour replaced the
 * station with berths on the armour). Kept here so the provisional mounts stand until they move onto the armour's
 * hardpoints (megastructure/hardpoints.ts).
 */
const STATION_SIZE = { hub: 4, hangarWidth: 2.2, hangarDepth: 3.4, capitalOffset: 5.2, footprint: 6.6 };

export type HardpointKind =
  | 'turret' | 'pointDefence' | 'shieldEmitter' | 'minelayer' // defences
  | 'hangar' | 'berth' | 'mooring' | 'drydock' // navy: launch, dock, moor a capital ship, repair
  | 'market' | 'temple' | 'reactor' | 'sensor'; // economy, religion, power, detection
export const HARDPOINT_KINDS: HardpointKind[] = [
  'turret', 'pointDefence', 'shieldEmitter', 'minelayer', 'hangar', 'berth', 'mooring', 'drydock', 'market', 'temple', 'reactor', 'sensor',
];

export interface Hardpoint {
  id: string; // unique across the game
  station: string; // the structure it is on
  section: string; // the armour section it belongs to: sections hold the hit points and the shields
  kind: HardpointKind;
  pos: V3; // world position, scene units
  normal: V3; // unit, out of the plating: a mount can only see (and shoot into) the half-space in front of it
  size: number; // ship lengths: a turret's hit radius, a hangar mouth's width
}

/** The station's frame: its hangar faces `out`; `right` and `up` complete it. */
export function stationFrame(out: V3): { right: V3; up: V3; out: V3 } {
  const o = unit(out);
  let right = cross([0, 1, 0], o);
  if (len(right) < 1e-6) right = [1, 0, 0];
  right = unit(right);
  return { right, up: cross(o, right), out: o };
}

/**
 * Provisional hardpoints on today's station model (stationScene.ts: a ring of radius `hub` round a spine, the hangar
 * mouth at +z, solar panels at the back, the capital ship moored at `capitalOffset`). Positions in ship lengths in the
 * station's frame, turned into world units. Two sections: the ring (guns) and the core (everything else).
 */
export function provisionalMounts(station: string, place: { pos: V3; out: V3 }, shipLength: number): Hardpoint[] {
  const f = stationFrame(place.out);
  const S = STATION_SIZE;
  const ringZ = -1.2;
  const out: Hardpoint[] = [];
  const at = (x: number, y: number, z: number): V3 => add(place.pos, scale(add(add(scale(f.right, x), scale(f.up, y)), scale(f.out, z)), shipLength));
  const dir = (x: number, y: number, z: number): V3 => unit(add(add(scale(f.right, x), scale(f.up, y)), scale(f.out, z)));
  const put = (kind: HardpointKind, n: number, section: string, x: number, y: number, z: number, nrm: V3, size: number) =>
    out.push({ id: `${station}-${kind}-${n}`, station, section, kind, pos: at(x, y, z), normal: dir(...nrm), size });
  // Eight turrets and four point-defence mounts round the ring, each facing out from it.
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    put('turret', k, 'ring', Math.cos(a) * (S.hub + 0.4), Math.sin(a) * (S.hub + 0.4), ringZ, [Math.cos(a), Math.sin(a), 0.15], 0.5);
  }
  for (let k = 0; k < 4; k++) {
    const a = ((k + 0.5) / 4) * Math.PI * 2;
    put('pointDefence', k, 'ring', Math.cos(a) * (S.hub + 0.4), Math.sin(a) * (S.hub + 0.4), ringZ + 0.3, [Math.cos(a), Math.sin(a), 0.4], 0.3);
  }
  put('shieldEmitter', 0, 'ring', 0, S.hub, ringZ, [0, 1, 0], 0.4);
  put('shieldEmitter', 1, 'core', 0, 0, -3.5, [0, 0, -1], 0.4);
  put('hangar', 0, 'core', 0, 0, 0.5 + S.hangarDepth, [0, 0, 1], S.hangarWidth);
  put('berth', 0, 'core', 0, -0.45, 2.1, [0, 0, 1], 1.2);
  put('drydock', 0, 'core', 0, 0, 1.4, [0, 0, 1], 1.2);
  put('mooring', 0, 'core', S.capitalOffset, 0, -0.5, [1, 0, 0], 5);
  put('minelayer', 0, 'core', -1, -0.9, 3.9, [0, -0.3, 1], 0.3);
  put('minelayer', 1, 'core', 1, -0.9, 3.9, [0, -0.3, 1], 0.3);
  put('market', 0, 'core', 0, 0.6, -2.5, [0, 1, 0], 1);
  put('temple', 0, 'core', 0, -0.6, -2.5, [0, -1, 0], 1);
  put('reactor', 0, 'core', -2.6, 0, -3.2, [0, 0, -1], 1.4);
  put('reactor', 1, 'core', 2.6, 0, -3.2, [0, 0, -1], 1.4);
  put('sensor', 0, 'core', 0, 0.6, 0.5, [0, 1, 0], 0.3);
  return out;
}

export const mountsOf = (ms: Hardpoint[], kind: HardpointKind) => ms.filter((m) => m.kind === kind);
export const sectionsOf = (ms: Hardpoint[]) => [...new Set(ms.map((m) => m.section))];

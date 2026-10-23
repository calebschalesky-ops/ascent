/**
 * Prizes: ships the player has taken by boarding. What is saved (store.ts GameData.prizes), how an old or broken
 * save is read, and where a prize keeps station behind the player. Pure.
 */
import type { V3 } from '../nav';
import { add, dist, scale } from '../nav';
import type { NationId } from '../nations';
import { NATIONS } from '../nations';
import type { ShipType } from '../shipTypes';
import { SHIP_SPECS, SHIP_TYPES } from '../shipTypes';

export interface Prize {
  /** The ship's own navy and its place in that navy's force (lib/nations.ts force), so the same hull leaves its patrol. */
  nation: NationId;
  type: ShipType;
  idx: number;
  hp: number;
  maxHp: number;
  /** Its crew: the boarders who took it. */
  crew: number;
  quality: number;
  /** World time of the capture, ms since 1970. */
  at: number;
}

const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d);

/** Reads saved prizes, dropping any that no longer make sense (an unknown nation or type, a duplicate). */
export function migratePrizes(raw: unknown): Prize[] {
  if (!Array.isArray(raw)) return [];
  const out: Prize[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const p = r as Record<string, unknown>;
    const nation = NATIONS.find((n) => n.id === p.nation)?.id;
    const type = SHIP_TYPES.find((t) => t === p.type);
    if (!nation || !type) continue;
    const idx = Math.floor(num(p.idx));
    if (out.some((q) => q.nation === nation && q.type === type && q.idx === idx)) continue;
    const maxHp = num(p.maxHp, SHIP_SPECS[type].hp) || SHIP_SPECS[type].hp;
    const hp = Math.min(maxHp, num(p.hp, maxHp));
    if (hp <= 0) continue;
    out.push({ nation, type, idx, hp, maxHp, crew: num(p.crew), quality: num(p.quality, 1) || 1, at: num(p.at) });
  }
  return out;
}

export const samePrize = (a: Pick<Prize, 'nation' | 'type' | 'idx'>, b: Pick<Prize, 'nation' | 'type' | 'idx'>) =>
  a.nation === b.nation && a.type === b.type && a.idx === b.idx;

/**
 * Where escort `i` keeps station: behind the player, alternating right and left, rows further back; capital ships
 * further out. `right`, `up` and `fwd` are the player's axes (unit); `L` the player ship's length.
 */
export function escortSlot(i: number, type: ShipType, pos: V3, fwd: V3, right: V3, up: V3, L: number): V3 {
  const side = i % 2 === 0 ? 1 : -1;
  const row = Math.floor(i / 2) + 1;
  const spread = type === 'capital' ? 9 : 4;
  return add(pos, add(add(scale(right, side * spread * row * L), scale(up, (type === 'capital' ? 2 : 1) * L)), scale(fwd, -(6 + 5 * row) * L)));
}

/**
 * One step toward a station: carried along at the player's velocity `carry`, easing in on the rest, and jumping when
 * the gap is too big to close (the player has gone to another planet at autopilot speed; the escort jumps with
 * them). Returns the new position and velocity.
 */
export function escortStep(pos: V3, goal: V3, dt: number, L: number, carry: V3 = [0, 0, 0]): { pos: V3; vel: V3 } {
  const gap = dist(pos, goal);
  if (gap > 400 * L) return { pos: [...goal], vel: [...carry] };
  const k = 1 - Math.exp(-dt * 1.5);
  const moved = add(pos, scale(carry, dt));
  const next = add(moved, scale([goal[0] - moved[0], goal[1] - moved[1], goal[2] - moved[2]], k));
  return { pos: next, vel: dt > 0 ? scale([next[0] - pos[0], next[1] - pos[1], next[2] - pos[2]], 1 / dt) : [0, 0, 0] };
}

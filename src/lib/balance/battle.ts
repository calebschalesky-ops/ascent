/**
 * Fleet against fleet, headless and abstract. Each shot hits with the probability `engage` measured for that weapon
 * against that ship type (the hit table), so the geometry comes from the game's own maths and only the bookkeeping
 * is new. Hit points, dodge and the lock time come from the game's tables.
 *
 * Enemies have no guns in the game yet. Until the arsenal and fleet-command threads give each type its weapons, a
 * side's armament here is an assumption passed in by the caller (`mounts`: how many laser-and-missile mounts a type
 * carries) and every report must say which assumption it ran.
 */
import type { ShipType } from '../shipTypes';
import { SHIP_SPECS } from '../shipTypes';
import type { WeaponId } from '../weapons';
import { LASER, LOCK, MISSILE } from '../weapons';
import type { Rng } from './rng';

export type HitTable = Record<WeaponId, Record<ShipType, number>>;
export type Mounts = Record<ShipType, number>;

/** One laser-and-missile mount per ship: every type armed like the player. */
export const ONE_MOUNT: Mounts = { capital: 1, cruiser: 1, fighter: 1, destroyer: 1 };

interface Unit { type: ShipType; hp: number; target: number; lock: number; cool: number[] }

const WEAPON = {
  laser: { damage: LASER.damage, rate: LASER.rate },
  missile: { damage: MISSILE.damage, rate: MISSILE.rate },
} as const;

/** Expected damage per second of one mount's weapon against a type. */
export const expectedDps = (w: WeaponId, t: ShipType, hits: HitTable) => hits[w][t] * WEAPON[w].damage * WEAPON[w].rate;

export interface BattleResult { winner: 'A' | 'B' | 'draw'; time: number; survivorsA: number; survivorsB: number }

const make = (types: ShipType[], mounts: Mounts): Unit[] =>
  types.map((type) => ({ type, hp: SHIP_SPECS[type].hp, target: -1, lock: 0, cool: Array(mounts[type]).fill(0) }));

export function battle(a: ShipType[], b: ShipType[], hits: HitTable, r: Rng, mounts: Mounts = ONE_MOUNT, maxTime = 300, dt = 0.05): BattleResult {
  const A = make(a, mounts);
  const B = make(b, mounts);
  const alive = (s: Unit[]) => s.filter((u) => u.hp > 0).length;
  let t = 0;
  for (; t < maxTime && alive(A) && alive(B); t += dt) {
    // Both sides choose and fire on the same state; damage lands together, so neither side shoots first.
    const fire = (own: Unit[], foe: Unit[], dmg: number[]) => {
      const live = foe.map((f, i) => (f.hp > 0 ? i : -1)).filter((i) => i >= 0);
      for (const u of own) {
        if (u.hp <= 0) continue;
        if (u.target < 0 || foe[u.target].hp <= 0) {
          u.target = live[Math.floor(r() * live.length)];
          u.lock = 0;
        }
        const tgt = foe[u.target];
        u.lock += dt;
        // The better weapon against this type, once the lock allows a missile.
        const canMissile = u.lock >= LOCK.time;
        const w: WeaponId = canMissile && expectedDps('missile', tgt.type, hits) > expectedDps('laser', tgt.type, hits) ? 'missile' : 'laser';
        for (let m = 0; m < u.cool.length; m++) {
          u.cool[m] -= dt;
          if (u.cool[m] > 0) continue;
          u.cool[m] += 1 / WEAPON[w].rate;
          if (r() < hits[w][tgt.type]) dmg[u.target] += WEAPON[w].damage;
        }
      }
    };
    const dA = A.map(() => 0);
    const dB = B.map(() => 0);
    fire(A, B, dB);
    fire(B, A, dA);
    A.forEach((u, i) => (u.hp -= dA[i]));
    B.forEach((u, i) => (u.hp -= dB[i]));
  }
  const sa = alive(A);
  const sb = alive(B);
  return { winner: sa && !sb ? 'A' : sb && !sa ? 'B' : 'draw', time: t, survivorsA: sa, survivorsB: sb };
}

export interface BattleStats { label: string; runs: number; winA: number; winB: number; draw: number; timeMean: number }

export function battleMany(label: string, a: ShipType[], b: ShipType[], hits: HitTable, runs: number, r: Rng, mounts: Mounts = ONE_MOUNT): BattleStats {
  let wa = 0, wb = 0, d = 0, time = 0;
  for (let i = 0; i < runs; i++) {
    const x = battle(a, b, hits, r, mounts);
    if (x.winner === 'A') wa++; else if (x.winner === 'B') wb++; else d++;
    time += x.time;
  }
  return { label, runs, winA: wa / runs, winB: wb / runs, draw: d / runs, timeMean: time / runs };
}

/** n copies of a type. */
export const many = (t: ShipType, n: number): ShipType[] => Array(n).fill(t);

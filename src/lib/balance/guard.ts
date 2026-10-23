/**
 * The forward shield block (lib/guard.ts) in the cruiser duel (cruisers.ts): side A raises the block for a share of
 * every second (`uptime`, tapped between shots), side B never does. Everything else is the duel's own rules: arsenal's
 * munitions through applyHit, shields regenerating, guns on the capacitor, missiles on ammunition and the dodge.
 *
 * Assumed (say so when quoting it): `front` of the hits on a blocking ship come from its front arc (0.8 by default: a
 * duel is mostly nose to nose), and the block is raised on a fixed rhythm rather than timed to the enemy's shots. As in
 * the game (arsenal.trigger), a shot fired with the block up waits 1/GUARD.rateMul times as long for the next. `skill`
 * is the share of shots a player fires with the block dropped for that instant while otherwise holding it: 0 holds it
 * through every shot, 1 is frame-perfect tapping (no human does that at seven shots a second), 0.5 a practised player.
 */
import { MUNITIONS } from '../munitions';
import { applyHit, regenerate } from '../shields';
import { GUARD } from '../guard';
import type { Fighter } from './cruisers';
import { HIT } from './cruisers';

/** The block's numbers as the simulator uses them: GUARD's, unless a sweep swaps them. */
export const GUARD_KNOBS: { reduce: number; drain: number; rateMul: number } = { reduce: GUARD.reduce, drain: GUARD.drain, rateMul: GUARD.rateMul };

export function duelGuard(A: Fighter, B: Fighter, r: () => number, uptime: number, front = 0.8, skill = 0.5, dt = 0.05, k = GUARD_KNOBS): number {
  const side = (f: Fighter) => ({ f, energy: f.capacity, cool: f.guns.map(() => r() / 2), ammo: f.guns.map((g) => MUNITIONS[g].ammo ?? Infinity) });
  const a = side(A), b = side(B);
  let up = false;
  for (let t = 0; t < 120 && A.def.hull > 0 && B.def.hull > 0; t += dt) {
    // A's rhythm: the block up for `uptime` of each second while the capacitor holds out.
    up = uptime > 0 && (t % 1) < uptime && a.energy > GUARD.minEnergy * (up ? 0 : 2);
    for (const [x, y, xUp, yUp] of [[a, b, up, false], [b, a, false, up]] as const) {
      if (xUp) x.energy = Math.max(0, x.energy - k.drain * dt);
      else x.energy = Math.min(x.f.capacity, x.energy + x.f.regen * dt);
      const pace = xUp ? k.rateMul : 1; // a beam under the block
      const hit = (m: (typeof MUNITIONS)[keyof typeof MUNITIONS], amount: number) => {
        const blocked = yUp && r() < front;
        applyHit(y.f.def, m, blocked ? amount * (1 - k.reduce) : amount);
      };
      x.f.guns.forEach((id, i) => {
        const m = MUNITIONS[id];
        if (m.delivery === 'beam') {
          const cost = m.energy * dt;
          if (x.energy < cost) return;
          x.energy -= cost;
          if (r() < HIT.beam) hit(m, m.damage * dt * pace);
          return;
        }
        x.cool[i] -= dt;
        if (x.cool[i] > 0 || x.ammo[i] <= 0 || x.energy < m.energy) return;
        const slowed = xUp && r() >= skill; // fired with the block up: the next shot waits longer
        x.cool[i] += 1 / ((m.rate || 1) * (slowed ? k.rateMul : 1));
        x.energy -= m.energy;
        x.ammo[i]--;
        for (let k = 0; k < (m.salvo?.count ?? 1); k++) {
          const p = m.delivery === 'missile' ? HIT.missile * (1 - y.f.dodge) : HIT[m.delivery];
          if (r() < p) hit(m, m.damage);
        }
      });
    }
    regenerate(A.def, dt); regenerate(B.def, dt);
  }
  if (A.def.hull > 0 && B.def.hull <= 0) return 1;
  if (A.def.hull > 0 && B.def.hull > 0) return A.def.hull / A.def.maxHull > B.def.hull / B.def.maxHull ? 0.5 : 0;
  return 0;
}

/**
 * Race cruisers, one against one (integration pass 2; report 1 §4 Balance 5 ran this outside the repo). Both sides fire
 * every weapon they carry with arsenal's real numbers: each hit goes through lib/shields.ts applyHit (shield facets,
 * resistances, pierce, armour), shields regenerate, guns draw on the reactor's capacitor and missiles on their ammo.
 * Hit chances per delivery come from engage.ts's measured cruiser rates (0.5° aim, report 1); a missile also has to
 * get past the target's dodge.
 *
 * Two sets of level-1 cruisers: what each race's player starts with (progression LOADOUTS, as arsenal flies them:
 * progress.ts flightLoadout) and what each race fields as an enemy at level 1 (enemy-ai rollFit, several seeds).
 * The band: no race's level-1 cruiser wins more than 65% of its fights against the others.
 */
import type { Munition, MunitionId } from '../munitions';
import { MUNITIONS } from '../munitions';
import { fitted } from '../modules';
import type { NationId } from '../nations';
import { NATIONS } from '../nations';
import { newProgress, flightLoadout } from '../progression/progress';
import { CLASS, rollFit } from '../enemyArms';
import type { Defence } from '../shields';
import { SHIELDS, applyHit, makeDefence, regenerate } from '../shields';
import { SHIP_SPECS } from '../shipTypes';
import { rng } from './rng';

/** Hit chance per shot at a cruiser, by how the munition travels (engage.ts at 0.5° aim; beam and mine assumed). */
export const HIT: Record<Munition['delivery'], number> = { bolt: 0.59, missile: 0.55 / 0.65, burst: 0.59, beam: 0.8, mine: 0.3 };

export interface Fighter { label: string; def: Defence; dodge: number; guns: MunitionId[]; capacity: number; regen: number }

/** A race's player start cruiser, as flown (flightLoadout → arsenal's fitted). */
export function startCruiser(n: NationId): Fighter {
  const f = fitted(flightLoadout(newProgress(n)));
  return { label: n, def: makeDefence(f.shield, SHIP_SPECS.cruiser.hp, f.shieldTier, f.armour), dodge: SHIP_SPECS.cruiser.dodge, guns: f.weapons, capacity: f.reactor.capacity, regen: f.reactor.regen };
}

/** A race's level-1 enemy cruiser from enemy-ai's roll (seed picks the ship). */
export function enemyCruiser(n: NationId, seed: number): Fighter {
  const fit = rollFit(n, 'cruiser', 1, seed);
  const def = makeDefence(SHIELDS[fit.shield], CLASS.cruiser.hp, fit.shieldTier, fit.armour);
  def.maxShield *= CLASS.cruiser.shieldMul; def.shield = def.shield.map(() => def.maxShield);
  return { label: n, def, dodge: CLASS.cruiser.dodge, guns: fit.weapons, capacity: fit.reactor.capacity, regen: fit.reactor.regen };
}

/** One fight to the death (120 s cap; then the healthier hull wins half). Returns 1, 0.5 or 0 for side A. */
export function duel(A: Fighter, B: Fighter, r: () => number, dt = 0.05): number {
  const side = (f: Fighter) => ({ f, energy: f.capacity, cool: f.guns.map(() => r() / 2), ammo: f.guns.map((g) => MUNITIONS[g].ammo ?? Infinity) });
  const a = side(A), b = side(B);
  for (let t = 0; t < 120 && A.def.hull > 0 && B.def.hull > 0; t += dt) {
    for (const [x, y] of [[a, b], [b, a]] as const) {
      x.energy = Math.min(x.f.capacity, x.energy + x.f.regen * dt);
      x.f.guns.forEach((id, i) => {
        const m = MUNITIONS[id];
        if (m.delivery === 'beam') { // continuous: damage and drain per second while it has energy
          const cost = m.energy * dt;
          if (x.energy < cost) return;
          x.energy -= cost;
          if (r() < HIT.beam) applyHit(y.f.def, m, m.damage * dt);
          return;
        }
        x.cool[i] -= dt;
        if (x.cool[i] > 0 || x.ammo[i] <= 0 || x.energy < m.energy) return;
        x.cool[i] += 1 / (m.rate || 1);
        x.energy -= m.energy;
        x.ammo[i]--;
        for (let k = 0; k < (m.salvo?.count ?? 1); k++) {
          const p = m.delivery === 'missile' ? HIT.missile * (1 - y.f.dodge) : HIT[m.delivery];
          if (r() < p) applyHit(y.f.def, m, m.damage);
        }
      });
    }
    regenerate(A.def, dt); regenerate(B.def, dt);
  }
  if (A.def.hull > 0 && B.def.hull <= 0) return 1;
  if (A.def.hull > 0 && B.def.hull > 0) return A.def.hull / A.def.maxHull > B.def.hull / B.def.maxHull ? 0.5 : 0;
  return 0;
}

export interface RoundRobin { set: string; rows: { nation: NationId; fit: string; mean: number; worst: { vs: NationId; p: number } }[]; pairs: Record<string, number> }

/** Every race against every other, `runs` fights a pair (A and B swap nothing: each pair is run both ways). */
export function roundRobin(set: 'start' | 'enemy', runs = 200, seed = 11): RoundRobin {
  const r = rng(seed);
  const ids = NATIONS.map((n) => n.id);
  const make = (n: NationId, i: number) => (set === 'start' ? startCruiser(n) : enemyCruiser(n, i % 8));
  const pairs: Record<string, number> = {};
  for (const a of ids) for (const b of ids) {
    if (a === b) continue;
    let w = 0;
    for (let i = 0; i < runs; i++) w += duel(make(a, i), make(b, i + 3), r);
    pairs[`${a}>${b}`] = w / runs;
  }
  const rows = ids.map((n) => {
    const vs = ids.filter((x) => x !== n);
    const mean = vs.reduce((s, x) => s + pairs[`${n}>${x}`], 0) / vs.length;
    const worst = vs.map((x) => ({ vs: x, p: pairs[`${n}>${x}`] })).sort((p, q) => q.p - p.p)[0];
    const f = make(n, 0);
    return { nation: n, fit: `${f.guns.join('+')} / ${f.def.tech.name}${f.def.armour.hull ? ' + armour' : ''}`, mean, worst };
  });
  return { set, rows, pairs };
}

export function cruiserMarkdown(rr: RoundRobin[]): string {
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const md = ['## Race cruisers, one against one (arsenal applyHit, capacitor and ammo)', ''];
  for (const r of rr) {
    md.push(`### ${r.set === 'start' ? 'Player start cruisers (progression LOADOUTS as flown)' : 'Enemy level-1 cruisers (enemy-ai rollFit, 8 seeds)'}`, '', '| Race | Fit (seed 0) | Mean win | Best pairing |', '|---|---|---|---|');
    for (const x of r.rows) md.push(`| ${x.nation} | ${x.fit} | ${pct(x.mean)}${x.mean > 0.65 ? ' ⚑' : ''} | ${pct(x.worst.p)} vs ${x.worst.vs} |`);
    md.push('');
  }
  md.push('Band: no race above 65% mean (⚑).', '');
  return md.join('\n');
}

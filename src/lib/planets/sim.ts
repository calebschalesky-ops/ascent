/**
 * Planets: a headless run of every world's meters under three cases (PLANETS.md section 3). It plays conquest's part
 * with a fixed script, so the numbers are the meters' own rules and nothing else. Pure; the test prints the tables.
 *
 * - peace: 30 minutes, every site working.
 * - attack: a level-1 pilot breaks the patrol (minute 0–2), kills each rebuilt ship, wrecks the batteries (5),
 *   suppresses then wrecks the shipyard (8, 10) and the foundry (11), and sits in orbit; imports stop after 5 minutes
 *   of blockade. No city, fort or works is touched.
 * - conquered: the attack until minute 11, then the forts (12, 13), every works (one a minute from 14), the city and
 *   the capital (control at minute 18 + works); then occupation until minute 60, the player holding everything.
 */
import type { NationId } from '../nations';
import type { Effects, Meters } from './meters';
import type { PlanetEvent, PlanetState, Situation, SiteStatus } from './state';
import { applyEvent, newPlanet, stepPlanet } from './state';
import type { World } from './worlds';
import { WORLDS, worldOf } from './worlds';

export type Case = 'peace' | 'attack' | 'conquered';
export const CASES: Case[] = ['peace', 'attack', 'conquered'];

export interface Sample { minute: number; meters: Meters; fx: Effects }

interface Script { events: Map<number, PlanetEvent[]>; status: Map<number, [string, SiteStatus][]>; end: number }

function script(w: World, c: Case): Script {
  const events = new Map<number, PlanetEvent[]>();
  const status = new Map<number, [string, SiteStatus][]>();
  const ev = (t: number, e: PlanetEvent) => events.set(t, [...(events.get(t) ?? []), e]);
  const st = (t: number, id: string, s: SiteStatus) => status.set(t, [...(status.get(t) ?? []), [id, s]]);
  const of = (k: string) => w.sites.filter((s) => s.kind === k);
  if (c === 'peace') return { events, status, end: 1800 };

  // The patrol (conquest's FORCE: 4 fighters, 2 cruisers, 1 capital), then each rebuilt ship as it launches.
  [30, 45, 60, 75].forEach((t) => ev(t, { kind: 'shipLost', ship: 'fighter' }));
  [90, 105].forEach((t) => ev(t, { kind: 'shipLost', ship: 'cruiser' }));
  ev(120, { kind: 'shipLost', ship: 'capital' });
  for (let t = 180; t < 660; t += 60) ev(t, { kind: 'shipLost', ship: 'fighter' }); // the foundry's rebuilds
  [300, 420].forEach((t) => ev(t, { kind: 'shipLost', ship: 'cruiser' })); // the shipyard's
  for (const b of of('battery')) { st(300, b.id, 'wrecked'); ev(300, { kind: 'siteLost', site: b.id }); }
  for (const y of of('shipyard')) { st(480, y.id, 'suppressed'); st(600, y.id, 'wrecked'); ev(600, { kind: 'siteLost', site: y.id }); }
  for (const f of of('foundry')) { st(660, f.id, 'wrecked'); ev(660, { kind: 'siteLost', site: f.id }); }
  if (c === 'attack') return { events, status, end: 1800 };

  let t = 720;
  for (const f of of('fort')) { st(t, f.id, 'held'); ev(t, { kind: 'siteLost', site: f.id }); t += 60; }
  t = 840;
  for (const x of of('works')) { st(t, x.id, 'held'); ev(t, { kind: 'siteLost', site: x.id }); t += 60; }
  for (const x of of('city')) { st(t, x.id, 'held'); ev(t, { kind: 'siteLost', site: x.id }); t += 30; }
  for (const x of of('capital')) { st(t, x.id, 'held'); ev(t, { kind: 'siteLost', site: x.id }); ev(t, { kind: 'controlled' }); }
  return { events, status, end: 3600 };
}

/** When the script controls the world (seconds), if it does. */
export const controlAt = (id: NationId, c: Case): number | null => {
  for (const [t, es] of script(worldOf(id), c).events) if (es.some((e) => e.kind === 'controlled')) return t;
  return null;
};

export function run(id: NationId, c: Case, every = 300): Sample[] {
  const w = worldOf(id);
  const s = script(w, c);
  const p: PlanetState = newPlanet(id);
  const sit: Situation = { sites: {}, cutOff: [] };
  let blockadeFrom = -1;
  const out: Sample[] = [];
  let fx = stepPlanet(p, 0, sit);
  for (let t = 0; t <= s.end; t++) {
    for (const [site, v] of s.status.get(t) ?? []) sit.sites![site] = v;
    for (const e of s.events.get(t) ?? []) applyEvent(p, e);
    sit.underAttack = c !== 'peace' && !p.controlled;
    // Blockaded once the patrol is dead (minute 2), until the world is taken; its imports stop 5 minutes later.
    sit.blockaded = sit.underAttack && t >= 120;
    if (sit.blockaded && blockadeFrom < 0) blockadeFrom = t;
    sit.cutOff = sit.blockaded && t - blockadeFrom >= 300 ? [...w.imports] : [];
    if (t % every === 0) out.push({ minute: t / 60, meters: { ...p.meters }, fx: { ...fx } });
    fx = stepPlanet(p, 1, sit);
  }
  return out;
}

const r0 = (v: number) => Math.round(v);
const r2 = (v: number) => v.toFixed(2);

/** One markdown table per case: every world at the sampled minutes, meters G/M/R/E and the effects that matter. */
export function report(minutes: Record<Case, number[]> = { peace: [0, 30], attack: [0, 5, 10, 20, 30], conquered: [10, 18, 20, 30, 60] }): string {
  const lines: string[] = [];
  for (const c of CASES) {
    lines.push(`#### ${c}`, '');
    lines.push(c === 'conquered'
      ? '| World | Minute | Gov | Mil | Rel | Econ | Unrest | Income × |'
      : '| World | Minute | Gov | Mil | Rel | Econ | Build × | Works × | Hold × | Unrest |');
    lines.push(c === 'conquered' ? '|---|---|---|---|---|---|---|---|' : '|---|---|---|---|---|---|---|---|---|---|');
    for (const w of WORLDS) {
      const samples = run(w.id, c, 60);
      for (const m of minutes[c]) {
        const s = samples.find((x) => x.minute === m);
        if (!s) continue;
        const k = s.meters;
        const head = `| ${w.people} | ${m} | ${r0(k.government)} | ${r0(k.military)} | ${r0(k.religion)} | ${r0(k.economy)} |`;
        lines.push(c === 'conquered'
          ? `${head} ${r2(s.fx.unrest)} | ${r2(s.fx.income)} |`
          : `${head} ${r2(s.fx.build)} | ${r2(s.fx.works)} | ${r2(s.fx.hold)} | ${r2(s.fx.unrest)} |`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

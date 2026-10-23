/**
 * The three sample routes (MOTIVATION.md 7) and the markdown report of their simulated playthroughs.
 * `MOTIVATION_OUT=integration/motivation-routes.md npx vitest run src/lib/motivation` writes it.
 */
import { checkRules } from './rules';
import type { RuleResult } from './rules';
import type { Route, Timeline } from './sim';
import { simulate } from './sim';
import type { TtkTable } from './ttk';
import { SHIP_TYPES } from '../shipTypes';

export const ROUTES: Route[] = [
  {
    id: 'iron', name: 'Iron Fist: military conquest from Earth', home: 'earth', strategy: 'military',
    // Mars first (the old war), the Moon for helium-3 and the capital ship, then the inner worlds, the giants last.
    order: ['mars', 'moon', 'mercury', 'venus', 'saturn', 'jupiter'],
  },
  {
    id: 'charter', name: 'The Charter: trade, vassals and alliances from Earth', home: 'earth', strategy: 'economic',
    // Pacts with the helium-3 and hydrocarbon suppliers; break Mercury and Venus's lifeline into vassalage; then Mars and Jupiter.
    order: ['moon', 'saturn', 'mercury', 'venus', 'mars', 'jupiter'],
    pacts: ['moon', 'saturn'],
  },
  {
    id: 'legion', name: 'Boarding Legion: capture the fleet, from a Mars start', home: 'mars', strategy: 'boarding',
    // A Quirite start: the Moon for helium-3, then Earth's big navy (decayed empire), and Jupiter, the old enemy, last.
    order: ['moon', 'earth', 'venus', 'mercury', 'saturn', 'jupiter'],
  },
];

export interface RouteRun { tl: Timeline; rules: RuleResult[] }
export const runRoutes = (ttk: TtkTable, seed = 1): RouteRun[] => ROUTES.map((r) => {
  const tl = simulate(r, ttk, seed);
  return { tl, rules: checkRules(tl) };
});

/** Every route over many salvage seeds: how often each rule holds. */
export interface Sweep { route: string; runs: number; passAll: number; hours: [number, number]; misses: string[] }
export function sweep(ttk: TtkTable, seeds = 10): Sweep[] {
  return ROUTES.map((r) => {
    const out: Sweep = { route: r.id, runs: seeds, passAll: 0, hours: [Infinity, 0], misses: [] };
    for (let s = 1; s <= seeds; s++) {
      const tl = simulate(r, ttk, s);
      const bad = checkRules(tl).filter((x) => !x.ok);
      if (!bad.length) out.passAll++;
      out.misses.push(...bad.map((x) => `seed ${s}: ${x.id} (${x.worst})`));
      out.hours = [Math.min(out.hours[0], tl.end / 60), Math.max(out.hours[1], tl.end / 60)];
    }
    return out;
  });
}

const hm = (m: number) => `${Math.floor(m / 60)}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

export function routesMarkdown(runs: RouteRun[], ttk: TtkTable, sw: Sweep[] = []): string {
  const L: string[] = [];
  const pay = runs[0].tl.pay;
  L.push('## Kill pay from the simulator', '', '| Type | Median time to kill (s) | XP (10 a second) | Credits |', '|---|---|---|---|');
  for (const t of SHIP_TYPES) L.push(`| ${t} | ${pay[t].seconds.toFixed(1)} | ${pay[t].xp} | ${pay[t].credits} |`);
  L.push('', 'Per nation (seconds, faster weapon):', '', `| Nation | ${SHIP_TYPES.join(' | ')} |`, `|---|${SHIP_TYPES.map(() => '---').join('|')}|`);
  for (const [n, row] of Object.entries(ttk)) L.push(`| ${n} | ${SHIP_TYPES.map((t) => row[t].toFixed(1)).join(' | ')} |`);

  L.push('', '## Rules, every route', '', `| Rule | ${runs.map((r) => r.tl.route.id).join(' | ')} |`, `|---|${runs.map(() => '---').join('|')}|`);
  for (let i = 0; i < runs[0].rules.length; i++) {
    L.push(`| ${runs[0].rules[i].rule} | ${runs.map((r) => `${r.rules[i].ok ? 'pass' : '**FAIL**'}: ${r.rules[i].worst}`).join(' | ')} |`);
  }

  // When each rung first lands on each route (h:mm of flight).
  const firsts: [string, (l: string, k: string) => boolean][] = [
    ['Level 2 (bay opens)', (l) => l === 'Level 2'], ['Level 5', (l) => l === 'Level 5'], ['Level 8', (l) => l === 'Level 8'], ['Level 10', (l) => l === 'Level 10'],
    ['Tech 2', (l) => l.startsWith('Tech 2')], ['Tech 3', (l) => l.startsWith('Tech 3')], ['Tech 4', (l) => l.startsWith('Tech 4')], ['Tech 5', (l) => l.startsWith('Tech 5')], ['Tech 6', (l) => l.startsWith('Tech 6')],
    ...['Squadron leader', 'Wing commander', 'Captain', 'Commodore', 'Admiral'].map((n) => [`Rank: ${n}`, (l: string) => l.startsWith(`Rank: ${n}`)] as [string, (l: string, k: string) => boolean]),
    ['First site taken', (_l, k) => k === 'site'], ['First god-armour station broken', (l) => l.includes('god-armour station is broken')],
    ...[1, 2, 3, 4, 5, 6].map((n) => [`World ${n} turned`, (l: string, k: string) => k === 'turned' && l.includes(`(${n} of`)] as [string, (l: string, k: string) => boolean]),
    ['Reckoning forms', (l) => l.startsWith('The Reckoning:')], ['Last Alliance announced', (l) => l.startsWith('The Last Alliance marches')], ['Grand Armada broken', (l) => l.startsWith('The Grand Armada is broken')],
    ['Rival defeated', (l) => l.startsWith('The rival is defeated')], ['First rebellion', (l) => l.startsWith('Rebellion')],
  ];
  L.push('', '## When each rung lands (h:mm of flight)', '', `| Rung | ${runs.map((r) => r.tl.route.id).join(' | ')} |`, `|---|${runs.map(() => '---').join('|')}|`);
  for (const [name, f] of firsts) L.push(`| ${name} | ${runs.map((r) => { const e = r.tl.events.find((x) => f(x.label, x.kind)); return e ? hm(e.t) : '—'; }).join(' | ')} |`);

  if (sw.length) {
    L.push('', '## Seed sweep (salvage rolls and the order of crates vary; everything else is fixed)', '', '| Route | Runs passing every rule | Length (h) | Misses |', '|---|---|---|---|');
    for (const s of sw) L.push(`| ${s.route} | ${s.passAll} of ${s.runs} | ${s.hours[0].toFixed(1)}–${s.hours[1].toFixed(1)} | ${s.misses.join('; ') || 'none'} |`);
  }

  for (const { tl } of runs) {
    L.push('', `## ${tl.route.name}`, '', `Ends ${hm(tl.end)} (h:mm of flight), ${tl.won ? 'every world turned' : 'not won'}. Level 10 at ${tl.levelTenAt === null ? 'never' : hm(tl.levelTenAt)}.`);
    L.push('', 'XP by source: ' + Object.entries(tl.xpBySource).map(([k, v]) => `${k} ${Math.round(v)}`).join(', ') + '.');
    L.push('', '**The first hour, minute by minute** (kills and crates left out):', '', '| Minute | What happens |', '|---|---|');
    for (const e of tl.events.filter((x) => x.t < 60 && x.kind !== 'kill' && !(x.kind === 'salvage' && x.label === 'crate'))) L.push(`| ${e.t.toFixed(1)} | ${e.label} |`);
    L.push('', '**Hour by hour:**', '', '| Hour | Level | Tech | Rank | Standing | Worlds turned | Income /min | Power | What happened that hour |', '|---|---|---|---|---|---|---|---|---|');
    for (let h = 1; h <= Math.ceil(tl.end / 60); h++) {
      const s = [...tl.samples].reverse().find((x) => x.t <= h * 60) ?? tl.samples[tl.samples.length - 1];
      const hour = tl.events.filter((e) => e.t >= (h - 1) * 60 && e.t < h * 60 && (e.rung || e.kind === 'threat' || e.kind === 'pact'));
      L.push(`| ${h} | ${s.level} | ${s.tech} | ${s.rank} | ${s.standing} | ${s.turned} | ${Math.round(s.income)} | ${s.power.toFixed(2)} | ${hour.map((e) => e.label.split('. ')[0]).join('; ')} |`);
    }
  }
  return L.join('\n');
}

/**
 * The world scripts' check tables (vision/scripts/WORLD-01.md, WORLD-02.md) evaluated over run summaries. Pure: the
 * runner (scripts/sim.mjs) runs the battles and prints these rows. Checks that need systems not built yet are rows
 * marked 'not built', never omitted.
 */
import type { AdmiralReport } from './admiral/report';
import type { Summary } from './summary';

export type CheckStatus = 'pass' | 'FAIL' | 'not built' | 'not run' | 'wired-but-unproven';

export interface CheckRow {
  check: number;
  what: string;
  passRange: string;
  need: string;
  got: string;
  status: CheckStatus;
}

/** PKG-16: checks the scripts judge at 30 seeds too (WORLD-02 amended 2026-10-21; WORLD-01 c6 per PKG-16). */
export const BAR30: Record<string, number[]> = { 'WORLD-01': [6], 'WORLD-02': [2, 3, 4, 6] };
export const BAR30_NEED = 24;

/** PKG-16: the "Bar at 30 seeds" cell: judged when the run is 30 seeds, else what it needs. */
export function bar30Cell(r: CheckRow, seeds: number): string {
  if (seeds !== 30) return `${BAR30_NEED} of 30 (run --seeds 30)`;
  const m = /^(\d+) of 30/.exec(r.got);
  if (!m) return `${BAR30_NEED} of 30: ${r.status}`;
  return `${BAR30_NEED} of 30: ${Number(m[1]) >= BAR30_NEED ? 'pass' : 'FAIL'}`;
}

const countIf = (xs: Summary[], f: (s: Summary) => boolean) => xs.filter(f).length;
const row = (check: number, what: string, passRange: string, needN: number, of: number, n: number | null, extra = ''): CheckRow => ({
  check, what, passRange, need: `${needN} of ${of}`,
  got: n === null ? extra : `${n} of ${of}${extra ? `; ${extra}` : ''}`,
  status: n === null ? 'not run' : n >= needN ? 'pass' : 'FAIL',
});
const need = (of: number, frac: number) => Math.ceil(of * frac);

/** WORLD-01 check 6's pair test: the outcome differs, or ships lost differ by ≥ 25%. */
export function pairDiffers(a: Summary, b: Summary): boolean {
  if (a.outcome !== b.outcome) return true;
  const la = a.sides.player.shipsLost + a.sides.enemy.shipsLost;
  const lb = b.sides.player.shipsLost + b.sides.enemy.shipsLost;
  const pa = a.sides.player.shipsLost;
  const pb = b.sides.player.shipsLost;
  const rel = (x: number, y: number) => Math.abs(x - y) / Math.max(x, y, 1);
  return rel(pa, pb) >= 0.25 || rel(la, lb) >= 0.25;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function world01(base: Summary[], swapped: Summary[] | null): CheckRow[] {
  const n = base.length;
  const rows: CheckRow[] = [];
  rows.push(row(1, 'battle ends with an outcome', 'outcome ∈ {victory, defeat, withdrawal}', n, n,
    countIf(base, (s) => s.outcome === 'victory' || s.outcome === 'defeat' || s.outcome === 'withdrawal'),
    outcomes(base)));
  rows.push(row(2, 'both sides fired and dealt damage by 60 s', 'damageDealt.player > 0 and damageDealt.enemy > 0 at 60 s', n, n,
    countIf(base, (s) => s.sides.player.damageAt60 > 0 && s.sides.enemy.damageAt60 > 0),
    `min at 60 s: player ${Math.min(...base.map((s) => s.sides.player.damageAt60))}, enemy ${Math.min(...base.map((s) => s.sides.enemy.damageAt60))}`));
  rows.push(row(3, 'a boarding attempt happened, unordered', 'boardingAttempts ≥ 1, none ordered', need(n, 0.8), n,
    countIf(base, (s) => s.boardingUnordered >= 1),
    `mean attempts ${mean(base.map((s) => s.boardingAttempts)).toFixed(1)} (unordered ${mean(base.map((s) => s.boardingUnordered)).toFixed(1)}); captured P ${base.reduce((a, s) => a + s.sides.player.captured, 0)} E ${base.reduce((a, s) => a + s.sides.enemy.captured, 0)}`));
  rows.push(row(4, 'at least one ship broke (fled or struck)', 'brokenShips ≥ 1', need(n, 0.8), n,
    countIf(base, (s) => s.brokenShips >= 1), `mean broken ${mean(base.map((s) => s.brokenShips)).toFixed(1)}`));
  {
    const ok = countIf(base, (s) => {
      const mine = s.timeoutDecisions.filter((d) => d.side === 'player');
      return mine.length >= 3 && mine.every((d) => !!d.trait);
    });
    // PKG-06: built. Each timeout decision closes a comms report; `report` tags the ones the queue showed.
    const shown = mean(base.map((s) => s.timeoutDecisions.filter((d) => d.side === 'player' && d.report !== undefined).length));
    rows.push(row(5, "idle player's captains decided things on timeouts, each with a trait", 'timeoutDecisions ≥ 3, each with a trait', n, n, ok,
      `mean ${mean(base.map((s) => s.timeoutDecisions.filter((d) => d.side === 'player').length)).toFixed(1)} per battle, ${shown.toFixed(1)} of them closing a comms report`));
  }
  if (swapped) {
    const pairs = base.map((s, i) => [s, swapped[i]] as const);
    const differ = countIf(pairs.map(([a, b]) => ({ ...a, diff: pairDiffers(a, b) }) as Summary & { diff: boolean }), (x) => (x as Summary & { diff: boolean }).diff);
    const ml = (xs: Summary[]) => mean(xs.map((s) => s.sides.player.shipsLost));
    rows.push(row(6, "swapping player captains' Nerve and Judgement changes the battle", 'outcome or losses differ by ≥ 25%', need(n, 0.8), n, differ,
      `mean player ships lost ${ml(base).toFixed(1)} → ${ml(swapped).toFixed(1)}; outcomes ${outcomes(base)} → ${outcomes(swapped)}`));
  } else {
    rows.push(row(6, "swapping player captains' Nerve and Judgement changes the battle", 'outcome or losses differ by ≥ 25%', need(n, 0.8), n, null, 'run with --variant swap-nerve-judgement'));
  }
  rows.push({ check: 7, what: 'the director keeps filming', passRange: 'shotsPer20s ≥ 1', need: 'seed 1', got: 'needs the view (PKG-03 and later)', status: 'not built' });
  return rows;
}

/**
 * WORLD-02 checks 3–7 (PKG-07): the runs they need besides the two idle runs. `ai` is the enemy admiral's report on each
 * idle run; `control` is the aggressive-admiral control's report on the same seeds.
 */
export interface World02Extra {
  good: Summary[];
  bad: Summary[];
  ai: AdmiralReport[];
  control: AdmiralReport[];
  boardOrder: boolean;
}

/**
 * PKG-16, WORLD-02 checks 3–4 as amended 2026-10-21: victory 2 > withdrawal 1 > defeat 0, from the player's side.
 * ASSUMED (the amendment does not rank it): a timeout, where neither side broke, sits between withdrawal and victory.
 */
export const OUTCOME_RANK: Record<string, number> = { defeat: 0, withdrawal: 1, timeout: 1.5, victory: 2 };

/** PKG-16: −1, 0 or 1: does `a` beat `b` for the player? Outcome rank first; at equal rank, fewer player ships lost. */
export function compareOutcome(a: Summary, b: Summary): number {
  const ra = OUTCOME_RANK[String(a.outcome)] ?? -1;
  const rb = OUTCOME_RANK[String(b.outcome)] ?? -1;
  if (ra !== rb) return ra > rb ? 1 : -1;
  const la = a.sides.player.shipsLost;
  const lb = b.sides.player.shipsLost;
  return la === lb ? 0 : la < lb ? 1 : -1;
}

export function world02(a: Summary[], b: Summary[], x?: World02Extra): CheckRow[] {
  const n = a.length;
  const rows: CheckRow[] = [];
  rows.push(row(1, 'same seed, same policy, run twice: identical result', 'final state hash equal', n, n,
    countIf(a.map((s, i) => ({ ...s, same: s.hash === b[i].hash }) as Summary & { same: boolean }), (x) => (x as Summary & { same: boolean }).same)));
  {
    const winners = a.map((s) => s.winner ?? 'none');
    const tally = new Map<string, number>();
    for (const w of winners) tally.set(w, (tally.get(w) ?? 0) + 1);
    const [top, topN] = [...tally.entries()].sort((x, y) => y[1] - x[1])[0];
    rows.push(row(2, 'idle on even fleets: the winner does not swing with the seed', 'the same winner (or draw)', need(n, 0.8), n, topN,
      `winner "${top}"; tally ${[...tally.entries()].map(([k, v]) => `${k} ${v}`).join(', ')}`));
  }
  rows.push({ check: 3, what: 'scripted-good beats idle', passRange: 'outcome rank higher, or equal and fewer player ships lost', need: `${need(n, 0.8)} of ${n}`, got: 'scripted-good policy and boarding not built', status: 'not built' });
  rows.push({ check: 4, what: 'scripted-bad does worse than idle', passRange: 'outcome rank lower, or equal and more player ships lost', need: `${need(n, 0.8)} of ${n}`, got: 'scripted-bad policy and boarding not built', status: 'not built' });
  rows.push({ check: 5, what: "the AI admiral uses the player's order set only", passRange: 'every AI order is a player order type', need: `${n} of ${n}`, got: 'AI admiral is a later package (the doctrine stand-in calls order() only)', status: 'not built' });
  rows.push({ check: 6, what: 'the AI telegraphs a boarding push ≥ 5 s ahead', passRange: 'telegraphLead ≥ 5 s', need: `${need(n, 0.8)} of ${n}`, got: 'boarding and AI admiral not built', status: 'not built' });
  rows.push({ check: 7, what: "Jupiter's mean engagement range beats a Mars-style control", passRange: 'meanRange(jupiter) > meanRange(control)', need: `${need(n, 0.8)} of ${n}`, got: 'AI admiral styles not built', status: 'not built' });
  // PKG-07: with the admiral's runs, rows 3–7 are measured instead of 'not built'.
  if (x) rows.splice(2, 5, ...world02Admiral(a, x));
  return rows;
}

function world02Admiral(idle: Summary[], x: World02Extra): CheckRow[] {
  const n = idle.length;
  const rows: CheckRow[] = [];
  const lost = (s: Summary) => s.sides.player.shipsLost;
  // PKG-16: amended 2026-10-21 (vision/scripts/WORLD-02.md): outcome rank first, player ships lost second.
  rows.push(row(3, 'scripted-good beats idle', 'outcome rank (victory 2 > withdrawal 1 > defeat 0) higher than idle, or equal and fewer player ships lost', need(n, 0.8), n,
    idle.filter((s, i) => compareOutcome(x.good[i], s) > 0).length,
    `outcomes good ${outcomes(x.good)} vs idle ${outcomes(idle)}; lost good ${x.good.map(lost).join(' ')} vs idle ${idle.map(lost).join(' ')}`));
  rows.push(row(4, 'scripted-bad does worse than idle', 'outcome rank lower than idle, or equal and more player ships lost', need(n, 0.8), n,
    idle.filter((s, i) => compareOutcome(x.bad[i], s) < 0).length,
    `outcomes bad ${outcomes(x.bad)} vs idle ${outcomes(idle)}; lost bad ${x.bad.map(lost).join(' ')} vs idle ${idle.map(lost).join(' ')}`));
  rows.push(row(5, "the AI admiral uses the player's order set only", 'every AI order is a player order type (log check)', n, n,
    x.ai.filter((r) => r.issued > 0 && r.foreignKinds.length === 0 && r.logForeign === 0 && r.statsOrders === r.issued).length,
    `orders issued ${x.ai.map((r) => r.issued).join(' ')}; kinds ${kindsOf(x.ai)}; foreign 0 needed, log-foreign ${x.ai.reduce((t, r) => t + r.logForeign, 0)}; stats.orders = admiral's count in ${x.ai.filter((r) => r.statsOrders === r.issued).length} of ${n}`));
  {
    const pushes = x.ai.map((r) => r.pushes.filter((p) => p.telegraphAt !== null && p.launchedAt !== null));
    const ok = pushes.filter((ps) => ps.length > 0 && ps.every((p) => (p.lead ?? 0) >= 5 && p.visible)).length;
    const leads = pushes.flat().map((p) => p.lead ?? 0);
    const got = `seeds with a push ${pushes.filter((ps) => ps.length).length} of ${n}; pushes ${leads.length}; lead min ${leads.length ? Math.min(...leads) : '-'} s; visible ${pushes.flat().filter((p) => p.visible).length} of ${leads.length}`;
    if (!x.boardOrder) {
      rows.push({ check: 6, what: 'the AI telegraphs a boarding push ≥ 5 s ahead', passRange: 'telegraphLead ≥ 5 s', need: `${need(n, 0.8)} of ${n}`, got: `${ok} of ${n} would pass; no 'board' order in this build, so no boarders launch (${got})`, status: 'wired-but-unproven' });
    } else {
      rows.push(row(6, 'the AI telegraphs a boarding push ≥ 5 s ahead', 'telegraphLead ≥ 5 s on each push, telegraph visible', need(n, 0.8), n, ok, got));
    }
  }
  {
    // meanRange = mean range of the AI side's shots. The nearest-foe sample is printed too (see PKG-07 report).
    const pairs = x.ai.map((r, i) => [r.meanShotRangeM, x.control[i].meanShotRangeM] as const);
    rows.push(row(7, "Jupiter's mean engagement range beats a Mars-style control", 'meanRange(jupiter) > meanRange(control), range of every AI shot', need(n, 0.8), n,
      pairs.filter(([j, m]) => j !== null && m !== null && j > m).length,
      `shots: jupiter ${pairs.map(([j]) => j ?? '-').join(' ')} m; control ${pairs.map(([, m]) => m ?? '-').join(' ')} m; nearest-foe sample: jupiter ${x.ai.map((r) => r.meanRangeM ?? '-').join(' ')}, control ${x.control.map((r) => r.meanRangeM ?? '-').join(' ')}`));
  }
  return rows;
}

function kindsOf(rs: AdmiralReport[]): string {
  const m = new Map<string, number>();
  for (const r of rs) for (const [k, v] of Object.entries(r.kinds)) m.set(k, (m.get(k) ?? 0) + v);
  return [...m.entries()].map(([k, v]) => `${k} ${v}`).join(', ');
}

function outcomes(xs: Summary[]): string {
  const m = new Map<string, number>();
  for (const s of xs) m.set(String(s.outcome), (m.get(String(s.outcome)) ?? 0) + 1);
  return [...m.entries()].map(([k, v]) => `${k} ${v}`).join(', ');
}

export function formatTable(script: string, rows: CheckRow[], seeds?: number): string {
  if (seeds === undefined) {
    const head = `| ${script} check | What | Pass range | Seeds needed | Got | Result |\n|---|---|---|---|---|---|`;
    return [head, ...rows.map((r) => `| ${r.check} | ${r.what} | ${r.passRange} | ${r.need} | ${r.got} | ${r.status} |`)].join('\n');
  }
  // PKG-16: with the run's seed count, a "Bar at 30 seeds" column for the checks the scripts also judge at 30 seeds.
  const at30 = BAR30[script] ?? [];
  const cell = (r: CheckRow) => (at30.includes(r.check) && (r.status === 'pass' || r.status === 'FAIL') ? bar30Cell(r, seeds) : '-');
  const head = `| ${script} check | What | Pass range | Seeds needed | Got | Result | Bar at 30 seeds |\n|---|---|---|---|---|---|---|`;
  return [head, ...rows.map((r) => `| ${r.check} | ${r.what} | ${r.passRange} | ${r.need} | ${r.got} | ${r.status} | ${cell(r)} |`)].join('\n');
}

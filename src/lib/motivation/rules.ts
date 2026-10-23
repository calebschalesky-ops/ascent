/**
 * The anti-stagnation rules (MOTIVATION.md 6), checked against a simulated timeline. Each rule returns the worst
 * value it saw and where, so a failure says exactly which stretch of which route went flat.
 */
import { DIRECTOR, RULES } from './tables';
import { ANNOUNCEMENT } from './director';
import type { Ev, Timeline } from './sim';

export interface RuleResult { id: string; rule: string; ok: boolean; worst: string }

const limitAt = (table: [number, number][], t: number) => table.find(([until]) => t < until)![1];
const f1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '∞');

/** The longest gap between consecutive events of a set, judged against the limit for the phase its midpoint is in. */
function gapCheck(events: Ev[], end: number, table: [number, number][]) {
  const ts = [0, ...events.map((e) => e.t), end];
  let worst = { over: -Infinity, gap: 0, at: 0, limit: 0 };
  for (let i = 1; i < ts.length; i++) {
    const gap = ts[i] - ts[i - 1];
    const limit = limitAt(table, (ts[i - 1] + ts[i]) / 2);
    if (gap - limit > worst.over) worst = { over: gap - limit, gap, at: ts[i - 1], limit };
  }
  return worst;
}

export function checkRules(tl: Timeline): RuleResult[] {
  const out: RuleResult[] = [];
  const ev = tl.events;

  // Next goal: judged by stage (worlds turned when the gap starts), not by clock.
  const rungs = ev.filter((e) => e.rung);
  const turnedBy = (t: number) => ev.filter((e) => e.kind === 'turned' && e.t <= t).length;
  let g1 = { over: -Infinity, gap: 0, at: 0, limit: 0 };
  const rt = [0, ...rungs.map((e) => e.t), tl.end];
  for (let i = 1; i < rt.length; i++) {
    const gap = rt[i] - rt[i - 1];
    const limit = limitAt(RULES.nextGoal, turnedBy(rt[i - 1]));
    if (gap - limit > g1.over) g1 = { over: gap - limit, gap, at: rt[i - 1], limit };
  }
  out.push({ id: 'next-goal', rule: 'A new rung within 13 min before the first world turns, 25 until four have, 45 after', ok: g1.over <= 0, worst: `longest ${f1(g1.gap)} min from minute ${f1(g1.at)} (limit ${g1.limit})` });

  const g2 = gapCheck(ev.filter((e) => e.meaningful), tl.end, RULES.rewardGap);
  out.push({ id: 'reward-gap', rule: 'A meaningful reward within 4 min in the first 30, 8 to hour 3, 12 after', ok: g2.over <= 0, worst: `longest ${f1(g2.gap)} min from minute ${f1(g2.at)} (limit ${g2.limit})` });

  // Dominant and nothing pushing back for too long.
  // Calm is measured from the end of the last threat (or its start, for an announcement); time inside a fight is not calm.
  const threats = ev.filter((e) => e.kind === 'threat');
  let worstCalm = 0, calmAt = 0;
  for (const s of tl.samples) {
    if (s.turned < 1 || s.dominance < DIRECTOR.dominant) continue;
    const turnedAt = ev.filter((e) => e.kind === 'turned' && e.t <= s.t).map((e) => e.t);
    const last = Math.max(0, ...turnedAt, ...threats.filter((x) => x.t <= s.t).map((x) => Math.min(s.t, x.end ?? x.t)));
    if (s.t - last > worstCalm) { worstCalm = s.t - last; calmAt = s.t; }
  }
  out.push({ id: 'threat-when-dominant', rule: `Dominant (power ÷ next target ≥ ${DIRECTOR.dominant}) and a world turned: a threat within ${RULES.threatWhenDominant} min of the last threat or world falling`, ok: worstCalm <= RULES.threatWhenDominant, worst: `longest calm while dominant ${f1(worstCalm)} min (at minute ${f1(calmAt)})` });

  const fights = ev.filter((e) => e.kind === 'threat' && !ANNOUNCEMENT.includes(e.threat!));
  let minRelax = Infinity;
  for (let i = 1; i < fights.length; i++) minRelax = Math.min(minRelax, fights[i].t - (fights[i - 1].end ?? fights[i - 1].t));
  out.push({ id: 'relax', rule: `At least ${RULES.relax} min between one threat's end and the next fight`, ok: minRelax >= RULES.relax - 1e-9, worst: `shortest ${f1(minRelax)} min` });

  // Purchase horizon: the next thing to save for is at most N minutes of current earning away.
  let worstEta = 0, etaAt = 0;
  for (const s of tl.samples) {
    if (s.t < 5) continue;
    const back = tl.samples.find((x) => x.t >= s.t - 10)!;
    const rate = (s.earned - back.earned) / Math.max(1, s.t - back.t);
    const eta = s.nextCost === Infinity ? Infinity : Math.max(0, s.nextCost - s.credits) / Math.max(1e-6, rate);
    if (eta > worstEta) { worstEta = eta; etaAt = s.t; }
  }
  out.push({ id: 'purchase-horizon', rule: `From minute 5, the next purchase (module, research, rank, armada ship) is at most ${RULES.purchaseHorizon} min of earning away`, ok: worstEta <= RULES.purchaseHorizon, worst: `worst ${f1(worstEta)} min (at minute ${f1(etaAt)})` });

  // Variety: no hour of only one kind of thing.
  let worstKinds = Infinity, kindsAt = 0;
  for (let a = 0; a + RULES.variety.window <= tl.end; a += 10) {
    const kinds = new Set(ev.filter((e) => e.activity && e.t >= a && e.t < a + RULES.variety.window).map((e) => e.activity));
    if (kinds.size < worstKinds) { worstKinds = kinds.size; kindsAt = a; }
  }
  out.push({ id: 'variety', rule: `Every ${RULES.variety.window}-min window has at least ${RULES.variety.kinds} kinds of activity (fight, siege, diplomacy, economy, defence)`, ok: worstKinds >= RULES.variety.kinds, worst: `fewest ${worstKinds} kinds (window from minute ${kindsAt})` });

  const share = tl.levelTenAt === null ? NaN : tl.levelTenAt / tl.end;
  out.push({ id: 'level-ten', rule: `Level 10 lands between ${RULES.levelTenShare[0] * 100}% and ${RULES.levelTenShare[1] * 100}% of the run`, ok: share >= RULES.levelTenShare[0] && share <= RULES.levelTenShare[1], worst: tl.levelTenAt === null ? 'never' : `minute ${f1(tl.levelTenAt)} = ${Math.round(share * 100)}%` });

  const hours = tl.end / 60;
  out.push({ id: 'run-length', rule: `A whole game takes ${RULES.runHours[0]}–${RULES.runHours[1]} h of flight`, ok: tl.won && hours >= RULES.runHours[0] && hours <= RULES.runHours[1], worst: `${hours.toFixed(1)} h${tl.won ? '' : ' (not won)'}` });

  const reached = (kind: string, label: string) => ev.some((e) => e.kind === kind && e.label.startsWith(label));
  const top = [reached('level', 'Level 10'), reached('tech', 'Tech 6'), reached('rank', 'Rank: Admiral'), reached('standing', 'Standing: Metropolis restored')];
  out.push({ id: 'ladder-top', rule: 'Every track reaches its top: level 10, tech 6, Admiral, Metropolis restored', ok: top.every(Boolean), worst: ['level 10', 'tech 6', 'Admiral', 'standing 5'].filter((_, i) => !top[i]).join(', ') || 'all reached' });

  return out;
}

/**
 * Fighter wings as sim entities (PKG-25, Phase B F1). Wings ride the hulls FIGHTERS.wingsPerHull gives them, launch when
 * fighter command gives the side a task, fly it, are lost to point defence and enemy wings, and come home to rearm.
 *
 * The three tasks (VISION §7a fighter command; NAVY §2 "escort your boarders in, intercept theirs"):
 * - escort: with our pods in flight, the wing flies on them (the target's point defence is cut, enemy passes at them are
 *   cut); otherwise it stays on its ship (the order's target, else the flagship) and thins pods coming in at it.
 * - screen: sits out on the line between its ship and the threat (enemy pods aimed at it, else the nearest enemy ship)
 *   and takes its pass at pods there at FIGHTERS.taskMul.screen.
 * - hunt: goes after the nearest enemy wing or pod group.
 *
 * Randomness: a pass at a pod is a seeded draw per pod, from the fighters' own stream (state.rng, seeded from the battle
 * seed), the gunnery-like spread the Daedalus ruling allows. Dogfights and point defence against wings are deterministic
 * rates. Nothing here reads wall time or imports from the view.
 */
import { canLaunch, pdChance } from '../battle';
import { BOARDING } from '../boarding/numbers';
import { officerOrder } from '../comms/officers';
import { draw, makeRng } from '../rng';
import { dist, pushLog, round2, shipById, v3 } from '../ships';
import { SIDES, inField, otherSide } from '../types';
import type { Battle, Order, Ship, SideId, V3 } from '../types';
import type { PodGroup } from '../boarding/types';
import { FIGHTERS } from './numbers';
import type { FighterState, FighterTask, Wing } from './types';

const TASKS: FighterTask[] = ['escort', 'screen', 'hunt'];
export const isFighterTask = (x: unknown): x is FighterTask => TASKS.includes(x as FighterTask);

const carries = (s: Ship) => FIGHTERS.wingsPerHull[s.cls] ?? 0;

/** The battle's fighter state, created (with every carrying hull's wings aboard) on first use. */
export function fighters(b: Battle): FighterState {
  if (b.fighters) return b.fighters;
  const wings: Wing[] = [];
  for (const s of b.ships) {
    for (let i = 0; i < carries(s); i++) {
      wings.push({
        id: `${s.id}w${i + 1}`, side: s.side, home: s.id, slot: i, craft: FIGHTERS.craftPerWing, craftMax: FIGHTERS.craftPerWing,
        state: inField(s.status) ? 'docked' : 'out', outHow: inField(s.status) ? null : 'gone', pos: v3(s.pos.x, 0, s.pos.z), heading: s.heading,
        readyAt: 0, escorting: null, passed: [], podsKilled: 0, craftKilled: 0,
      });
    }
  }
  const stat = () => ({ launches: 0, craftLost: 0, podsKilled: 0, passes: 0, killedAimedAt: {} });
  b.fighters = {
    rng: makeRng((b.seed ^ 0x6f1c2a77) >>> 0),
    wings,
    orders: { player: { task: null, target: null, at: 0 }, enemy: { task: null, target: null, at: 0 } },
    stats: { player: stat(), enemy: stat() },
  };
  return b.fighters;
}

/**
 * order()'s case for `fighters`: fighter command (the flagship's officer) takes the task as before, and the side's wings
 * now fly it. `o.target`, when it names one of our ships in the field, is the ship to escort or screen.
 */
export function fighterOrder(b: Battle, ship: Ship, o: Order): boolean {
  if (!officerOrder(b, ship, o)) return false;
  if (!isFighterTask(o.task)) return true;
  const t = shipById(b, o.target);
  const st = fighters(b);
  st.orders[ship.side] = { task: o.task, target: t && t.side === ship.side && inField(t.status) ? t.id : null, at: round2(b.t) };
  return true;
}

// ── Geometry ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const toward = (from: V3, to: V3, m: number): V3 => {
  const d = dist(from, to);
  if (d < 1e-6) return v3(from.x, 0, from.z);
  return v3(from.x + (to.x - from.x) / d * m, 0, from.z + (to.z - from.z) / d * m);
};
const nearestOf = <T extends { pos: V3 }>(at: V3, xs: T[]): T | null => {
  let best: T | null = null, bd = Infinity;
  for (const x of xs) { const d = dist(at, x.pos); if (d < bd) { bd = d; best = x; } }
  return best;
};
const flyingPods = (b: Battle, side: SideId): PodGroup[] => (b.boarding?.pods ?? []).filter((g) => g.side === side && g.phase === 'flying' && g.pods > 0);
const flyingWings = (st: FighterState, side: SideId) => st.wings.filter((w) => w.side === side && w.state === 'flying');
const enemyShips = (b: Battle, side: SideId) => b.ships.filter((s) => s.side !== side && inField(s.status));

/** The ship a side's wings escort or screen: the order's target while it is in the field, else the flagship. */
function guardOf(b: Battle, side: SideId): Ship | undefined {
  const st = fighters(b);
  const t = shipById(b, st.orders[side].target);
  if (t && t.side === side && inField(t.status)) return t;
  const f = shipById(b, b.sides[side].flagshipId);
  return f && f.side === side && inField(f.status) ? f : undefined;
}

/** The weave round a station: deterministic in battle time and the wing's slot. */
function weave(b: Battle, w: Wing, at: V3): V3 {
  let k = 0;
  for (let i = 0; i < w.id.length; i++) k = (k * 31 + w.id.charCodeAt(i)) % 997; // each wing its own phase, from its id
  const ph = (b.t / FIGHTERS.weavePeriodS + ((k * 0.618034) % 1)) * Math.PI * 2; // ids one apart sit 0.62 of a turn apart
  return v3(at.x + Math.cos(ph) * FIGHTERS.weaveM, 0, at.z + Math.sin(ph) * FIGHTERS.weaveM);
}

/** Where a flying wing wants to be this tick, for its side's task. */
function goalOf(b: Battle, w: Wing, task: FighterTask): V3 {
  const st = fighters(b);
  const guard = guardOf(b, w.side) ?? shipById(b, w.home);
  const foes = enemyShips(b, w.side);
  if (task === 'escort') {
    const pods = flyingPods(b, w.side);
    let g = pods.find((p) => p.id === w.escorting) ?? null;
    if (!g) g = nearestOf(w.pos, pods);
    w.escorting = g ? g.id : null;
    if (g) return weave(b, w, g.pos);
    if (!guard) return w.pos;
    const foe = nearestOf(guard.pos, foes);
    return weave(b, w, foe ? toward(guard.pos, foe.pos, FIGHTERS.escortM) : guard.pos);
  }
  w.escorting = null;
  if (task === 'screen') {
    if (!guard) return w.pos;
    const inbound = (b.boarding?.pods ?? []).filter((g) => g.side !== w.side && g.target === guard.id && g.phase === 'flying');
    const threat = nearestOf(guard.pos, inbound) ?? nearestOf(guard.pos, foes);
    if (!threat) return weave(b, w, guard.pos);
    const d = dist(guard.pos, threat.pos);
    return weave(b, w, toward(guard.pos, threat.pos, Math.min(FIGHTERS.screenM, d * 0.5)));
  }
  // hunt
  const prey = nearestOf(w.pos, [...flyingWings(st, otherSide(w.side)), ...flyingPods(b, otherSide(w.side))]);
  if (prey) return prey.pos;
  if (!guard) return w.pos;
  const foe = nearestOf(guard.pos, foes);
  return weave(b, w, foe ? toward(guard.pos, foe.pos, FIGHTERS.screenM) : guard.pos);
}

function moveTo(b: Battle, w: Wing, goal: V3): void {
  const d = dist(w.pos, goal);
  const stepM = FIGHTERS.speed * b.dt;
  if (d > 1e-6) w.heading = Math.atan2(goal.z - w.pos.z, goal.x - w.pos.x);
  w.pos = d > stepM ? toward(w.pos, goal, stepM) : v3(goal.x, 0, goal.z);
}

// ── Life cycle ────────────────────────────────────────────────────────────────────────────────────────────────────────
function lose(b: Battle, w: Wing, how: 'lost' | 'gone', why: string): void {
  if (w.state === 'out') return;
  const st = fighters(b);
  if (how === 'lost') st.stats[w.side].craftLost += w.craft;
  w.state = 'out';
  w.outHow = how;
  w.craft = how === 'lost' ? 0 : w.craft;
  w.escorting = null;
  pushLog(b, { t: round2(b.t), kind: 'wingLost', wing: w.id, side: w.side, how, why });
}

/** A new home for a wing whose hull has gone: the nearest friendly hull in the field with a hangar that works. */
function rehome(b: Battle, w: Wing): Ship | undefined {
  const hangars = b.ships.filter((s) => s.side === w.side && canLaunch(s) && BOARDING.hangarClasses.includes(s.cls));
  const h = nearestOf(w.pos, hangars) ?? undefined;
  if (h) w.home = h.id;
  return h;
}

function lifeCycle(b: Battle, w: Wing, task: FighterTask | null): void {
  const home = shipById(b, w.home);
  const homeOk = !!home && home.side === w.side && home.status === 'active';
  if (w.state === 'docked') {
    if (!home || home.side !== w.side || !inField(home.status)) {
      // Aboard a hull that died or struck: lost with it. Aboard one that jumped away (or was taken): gone with it.
      const gone = !!home && (home.status === 'fled' || home.status === 'withdrawn');
      lose(b, w, gone ? 'gone' : 'lost', gone ? 'went with its hull' : 'lost aboard its hull');
      return;
    }
    w.pos = v3(home.pos.x, 0, home.pos.z);
    w.heading = home.heading;
    // A hangar sends its wings out one after another (FIGHTERS.launchGapS), from the moment the task was given.
    const turn = fighters(b).orders[w.side].at + w.slot * FIGHTERS.launchGapS;
    const ready = b.t + 1e-9 >= Math.max(w.readyAt, turn) && w.craft >= FIGHTERS.relaunchMinCraft;
    if (task && homeOk && canLaunch(home) && ready) {
      w.state = 'flying';
      w.passed = [];
      fighters(b).stats[w.side].launches++;
      pushLog(b, { t: round2(b.t), kind: 'wingLaunch', wing: w.id, side: w.side, from: home.id, task, craft: Math.round(w.craft) });
    }
    return;
  }
  if (w.state === 'flying' && w.craft <= w.craftMax * FIGHTERS.returnAtFrac) w.state = 'returning';
  if (w.state === 'returning') {
    const h = homeOk && canLaunch(home!) ? home! : rehome(b, w);
    if (!h) return; // nowhere to land: it stays out, circling where it is
    moveTo(b, w, h.pos);
    if (dist(w.pos, h.pos) <= FIGHTERS.recoverM) {
      w.state = 'docked';
      w.readyAt = b.t + FIGHTERS.rearmS;
      w.escorting = null;
      pushLog(b, { t: round2(b.t), kind: 'wingHome', wing: w.id, side: w.side, ship: h.id, craft: Math.round(w.craft * 10) / 10 });
    }
  }
}

// ── Combat ────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Is pod group `g` under an escort wing of its own side? */
function escorted(st: FighterState, g: PodGroup): boolean {
  return st.wings.some((w) => w.side === g.side && w.state === 'flying' && w.escorting === g.id && dist(w.pos, g.pos) <= FIGHTERS.escortOnM);
}

/**
 * The point defence's chance against one pod of `g` as it crosses BOARDING.pdRange of `t` (boarding.ts's pdChance line,
 * PKG-25): pdChance × pdKillScale as before, cut by FIGHTERS.escortPdCut while an escort wing is on the pods.
 */
export function podPdChance(b: Battle, g: PodGroup, t: Ship): number {
  const p = pdChance(t) * BOARDING.pdKillScale;
  return b.fighters && escorted(b.fighters, g) ? p * (1 - FIGHTERS.escortPdCut) : p;
}

/** Each flying wing makes one pass at each enemy pod group that comes within FIGHTERS.interceptM. */
function passes(b: Battle, task: Record<SideId, FighterTask | null>): void {
  const st = fighters(b);
  const pods = b.boarding?.pods;
  if (!pods?.length) return;
  let emptied = false;
  for (const w of st.wings) {
    if (w.state !== 'flying' || !task[w.side]) continue;
    for (const g of pods) {
      if (g.side === w.side || g.phase !== 'flying' || g.pods <= 0 || w.passed.includes(g.id)) continue;
      if (dist(w.pos, g.pos) > FIGHTERS.interceptM) continue;
      w.passed.push(g.id);
      st.stats[w.side].passes++;
      let p = Math.min(FIGHTERS.podKillCap, w.craft * FIGHTERS.podKillPerCraft) * (FIGHTERS.taskMul[task[w.side]!] ?? 1);
      if (escorted(st, g)) p *= 1 - FIGHTERS.escortDefend;
      p = Math.min(FIGHTERS.podKillCap, p);
      let lost = 0;
      for (let i = 0; i < g.pods; i++) if (draw(st.rng) < p) lost++;
      if (!lost) continue;
      const n = g.marines * lost / g.pods;
      g.pods -= lost;
      g.marines -= n;
      w.podsKilled += lost;
      st.stats[w.side].podsKilled += lost;
      st.stats[w.side].killedAimedAt[g.target] = (st.stats[w.side].killedAimedAt[g.target] ?? 0) + lost;
      pushLog(b, { t: round2(b.t), kind: 'podIntercept', wing: w.id, side: w.side, group: g.id, target: g.target, pods: lost, n: Math.round(n), p: Math.round(p * 10000) / 10000 });
      if (g.pods <= 0) emptied = true;
    }
  }
  // A group shot down to its last pod is gone (its marines with it).
  if (emptied && b.boarding) b.boarding.pods = b.boarding.pods.filter((g) => g.pods > 0);
}

/** Dogfights and point defence against wings: deterministic rates, applied together. */
function attrition(b: Battle, task: Record<SideId, FighterTask | null>): void {
  const st = fighters(b);
  const out = st.wings.filter((w) => w.state === 'flying' || w.state === 'returning');
  if (!out.length) return;
  const loss = new Map<Wing, number>();
  const add = (w: Wing, x: number) => loss.set(w, (loss.get(w) ?? 0) + x);
  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) {
      const a = out[i], c = out[j];
      if (a.side === c.side || dist(a.pos, c.pos) > FIGHTERS.dogfightM) continue;
      const mul = (w: Wing) => (task[w.side] === 'hunt' && w.state === 'flying' ? FIGHTERS.huntDogMul : 1);
      const ka = c.craft * FIGHTERS.dogKillPerS * mul(c) * b.dt;
      const kc = a.craft * FIGHTERS.dogKillPerS * mul(a) * b.dt;
      add(a, ka); add(c, kc);
      c.craftKilled += ka; a.craftKilled += kc;
    }
  }
  for (const w of out) {
    for (const s of b.ships) {
      if (s.side === w.side || s.status !== 'active') continue;
      if (dist(s.pos, w.pos) > FIGHTERS.pdWingM) continue;
      add(w, pdChance(s) * FIGHTERS.pdWingKillPerS * b.dt);
    }
  }
  for (const [w, x] of loss) {
    const before = w.craft;
    w.craft = Math.max(0, w.craft - x);
    st.stats[w.side].craftLost += before - w.craft;
    if (w.craft < FIGHTERS.lostBelow) {
      lose(b, w, 'lost', 'shot down');
    }
  }
}

/** One fixed step of the fighters. battle.ts step() calls it once, before boarding moves the pods. */
export function stepFighters(b: Battle): void {
  if (!b.fighters) return;
  const st = b.fighters;
  const task = { player: st.orders.player.task, enemy: st.orders.enemy.task };
  for (const w of st.wings) {
    if (w.state === 'out') continue;
    lifeCycle(b, w, task[w.side]);
    if (w.state === 'flying') {
      const t = task[w.side];
      if (!t) { w.state = 'returning'; continue; }
      moveTo(b, w, goalOf(b, w, t));
    }
  }
  passes(b, task);
  attrition(b, task);
}

// ── Probe ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface WingSummary { id: string; side: SideId; home: string; state: string; craft: number; task: FighterTask | null; escorting: number | null; pos: V3 }

/** What the probe and the tests read: every wing, each side's task and its tallies. Null when no fighter was ever ordered. */
export function fighterReport(b: Battle) {
  if (!b.fighters) return null;
  const st = b.fighters;
  const mins = Math.max(b.t, 1e-9) / 60;
  return {
    orders: st.orders,
    wings: st.wings.map((w): WingSummary => ({
      id: w.id, side: w.side, home: w.home, state: w.state, craft: Math.round(w.craft * 10) / 10,
      task: st.orders[w.side].task, escorting: w.escorting, pos: w.pos,
    })),
    sides: Object.fromEntries(SIDES.map((s) => [s, { ...st.stats[s], podsKilledPerMin: Math.round(st.stats[s].podsKilled / mins * 100) / 100 }])),
  };
}

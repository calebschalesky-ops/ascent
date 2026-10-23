/**
 * The real battle on screen: an adapter from the headless engine (src/battle/sim, PKG-02) to the view model (model.ts).
 * It runs `createBattle(SATURN_12V12, seed)` and the sim's own `step()` on the sim's fixed 1/30 s, and maps the `Battle`
 * into a `BattleFrame` after every step. It never changes the battle except through `order()`, the same call the UI's
 * orders will use. It imports only from src/battle/sim/index.ts.
 *
 * Frames: the sim fights on the ring plane XZ in metres with forward = (cos h, 0, sin h); the scene draws in battle units
 * (a cruiser is about 7 long). SIM_VIEW.metresPerUnit converts. The small height stagger is the view's, not the sim's
 * (the sim keeps y = 0 in Phase A), so a line reads as crewed ships rather than a ruled line.
 *
 * Seeing is not knowing (VISION §7a): enemy ships reach the frame with position, heading, class and status only. Their
 * shield state arrives as hit flashes on the side struck, never as numbers or open sides. Morale never reaches the frame.
 */
import { peopleOf } from '../../lib/races';
import type { NationId } from '../../lib/nations';
import { order as simOrder, orderSay, SATURN_12V12, SHIELD_SIDES, startBattle, step as simStep, summarise } from '../sim/index';
import type { Battle, BattleSetup, LogEvent, Order, Ship, SideId, SideSummary } from '../sim/index';
import { wingViews } from './fighters'; // PKG-25
import type { BattleEvent, BattleFeed, BattleFrame, Ending, ShipStatus, ShipView, ShotView, Side, SideInfo, SideTally, V3 } from './model';

/** The adapter's numbers: how the sim is drawn, never how it plays. First-pass, look only. */
export const SIM_VIEW = {
  /** Metres of sim per battle unit of the scene. 9 km between the fleets at the start is 225 units. */
  metresPerUnit: 40,
  /** Height stagger of a ship out of the ring plane, units, fixed per ship. */
  stagger: 3,
  /** Tracer speed per gun, units per second. A laser is all but instant; a missile is seen to fly. */
  tracerSpeed: { rail: 260, laser: 1600, missile: 70 } as Record<'rail' | 'laser' | 'missile', number>,
  /** How far a miss passes its target, units. */
  missScatter: 7,
};

const SIDE_OF: Record<SideId, Side> = { player: 0, enemy: 1 };
const STATUS: Record<Ship['status'], ShipStatus> = {
  active: 'alive', broken: 'broken', fled: 'fled', withdrawn: 'withdrawn', struck: 'struck', wrecked: 'wrecked',
};

/** The feed the skirmish runs on by default, with the two calls the stub has not got. */
export interface SimFeed extends BattleFeed {
  /** The live battle (read-only by contract: the view changes it only through `order`). */
  battle(): Battle;
  /** An order from the player's side, through the sim's one order entry point. */
  order(ship: string, o: Order): boolean;
}

function nationOf(world: string): NationId {
  const n = world.toLowerCase() as NationId;
  peopleOf(n); // throws on a world with no people, rather than drawing a ship in no house's colours
  return n;
}

function sideInfo(b: Battle, id: SideId): SideInfo {
  const house = nationOf(b.sides[id].world);
  const p = peopleOf(house).palette;
  return { side: SIDE_OF[id], house, name: b.sides[id].house, colours: { hull: p.hull, accent: p.accent, glow: p.glow } };
}

/** A fixed per-ship number in [-1, 1] from its id: the view's own, never the sim's RNG. */
function hash01(id: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

const tally = (s: SideSummary): SideTally => ({
  lost: s.shipsLost,
  broken: s.broken,
  struck: s.struck,
  fled: s.fled + s.withdrawn,
  /** Enemy ships this side took by boarding (PKG-05). */
  captured: s.captured,
});

const HEADLINE = { 0: 'Victory', 1: 'Defeat' } as const;
const HOW: Record<string, string> = {
  victory: 'The enemy line broke', defeat: 'Your line broke', withdrawal: 'A fleet withdrew', timeout: 'Time ran out',
};

export function createSimFeed(seed0 = 1, setup: BattleSetup = SATURN_12V12): SimFeed { // PKG-20: the setup
  const M = SIM_VIEW.metresPerUnit;
  let b: Battle = startBattle(setup, seed0);
  let sides: [SideInfo, SideInfo] = [sideInfo(b, 'player'), sideInfo(b, 'enemy')];
  /** Log events seen so far, counted across the cap (log index i is event logDropped + i). */
  let seen = 0;
  let shots: ShotView[] = [];
  let events: BattleEvent[] = [];
  let ending: Ending | undefined;
  let miss = 1;
  let opened: Record<SideId, boolean> = { player: false, enemy: false };
  let current: BattleFrame;

  const pos = (s: Ship): V3 => [s.pos.x / M, SIM_VIEW.stagger * hash01(s.id, 7), s.pos.z / M];
  const byId = (id: string) => b.ships.find((s) => s.id === id);
  const label = (s: Ship | undefined) => (!s ? 'a ship' : s.side === 'player' ? s.name : `the enemy's ${s.name}`);
  const scatter = () => {
    miss = (Math.imul(miss, 1103515245) + 12345) >>> 0;
    return ((miss / 4294967295) * 2 - 1) * SIM_VIEW.missScatter;
  };

  const shipView = (s: Ship): ShipView => {
    const side = SIDE_OF[s.side];
    const info = sides[side];
    const v: ShipView = {
      id: s.id, name: s.name, side, flagship: s.flagship, house: info.house, cls: s.cls,
      pos: pos(s), heading: [Math.cos(s.heading), 0, Math.sin(s.heading)], status: STATUS[s.status], colours: info.colours,
    };
    // Only his own ships show which shields are down (VISION §7a).
    if (side === 0) v.open = SHIELD_SIDES.filter((f) => s.open[f]);
    return v;
  };

  const shotOf = (e: Extract<LogEvent, { kind: 'shot' }>): ShotView | null => {
    const a = byId(e.ship), t = byId(e.target);
    if (!a || !t) return null;
    const from = pos(a);
    const at = pos(t);
    const hit = e.hit && !e.pd?.stopped;
    const to: V3 = hit ? at : [at[0] + scatter(), at[1] + scatter() * 0.4, at[2] + scatter()];
    const flight = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) / SIM_VIEW.tracerSpeed[e.gun];
    const v: ShotView = { shooter: a.id, target: t.id, side: SIDE_OF[a.side], kind: e.gun, from, to, flight, hit };
    if (hit) { v.face = e.side; v.hull = e.hullDmg > 0; }
    return v;
  };

  /** Comms lines: what a bridge would hear. No morale numbers, no enemy shield state. */
  const say = (e: LogEvent): string | null => {
    switch (e.kind) {
      case 'break': {
        const s = byId(e.ship);
        return e.reason.startsWith('the line broke') ? `${label(s)} breaks with the line and runs` : `${label(s)} breaks off and runs`;
      }
      case 'out': {
        const s = byId(e.ship);
        if (e.how === 'fled') return `${label(s)} jumps away`;
        if (e.how === 'withdrawn') return `${label(s)} withdraws and jumps out`;
        if (e.how === 'struck') return `${label(s)} strikes her colours`;
        if (e.how === 'wrecked') return `${label(s)} breaks apart`;
        return null;
      }
      case 'captured': return `${b.sides[e.by].house} takes ${byId(e.ship)?.name ?? 'a ship'} by boarding`;
      case 'repelled': return `${label(byId(e.ship))} throws off her boarders`;
      case 'scuttled': return `${label(byId(e.ship))} is scuttled`;
      case 'flagshipLost': return `${b.sides[e.side].house}: the flagship ${byId(e.ship)?.name ?? ''} is lost`;
      case 'sideBroken': return `${b.sides[e.side].house}: the line breaks`;
      case 'end': return 'The battle is over';
      case 'order': {
        if (e.by !== 'player') return null;
        const s = byId(e.ship);
        // PKG-22 (F-10, TRC05-3): the order in words, never its internal kind name.
        return e.ok ? `${s?.name ?? e.ship}: aye, ${orderSay(e.order.kind)}` : `${s?.name ?? e.ship}: order refused (${orderSay(e.order.kind)})`;
      }
      default: return null;
    }
  };

  const drain = () => {
    const total = b.logDropped + b.log.length;
    const fresh = Math.min(total - seen, b.log.length);
    for (let i = b.log.length - fresh; i < b.log.length; i++) {
      const e = b.log[i];
      if (e.kind === 'shot') {
        const s = shotOf(e);
        if (s) shots.push(s);
        const side = byId(e.ship)?.side;
        if (side && !opened[side]) {
          opened[side] = true;
          events.push({ t: e.t, kind: 'open-fire', ship: e.ship, text: `${b.sides[side].house} opens fire` });
        }
        continue;
      }
      const text = say(e);
      if (text) events.push({ t: e.t, kind: e.kind, ship: 'ship' in e ? e.ship : undefined, text: text[0].toUpperCase() + text.slice(1) });
    }
    seen = total;
  };

  const endingOf = (): Ending | undefined => {
    if (!b.ended) return undefined;
    if (ending) return ending;
    const sum = summarise(b);
    const winner = b.winner === 'player' ? 0 : b.winner === 'enemy' ? 1 : null;
    ending = {
      winner,
      text: winner === null ? 'Drawn' : HEADLINE[winner],
      kind: b.outcome ?? undefined,
      reason: b.reason ?? HOW[b.outcome ?? ''] ?? '',
      tally: [tally(sum.sides.player), tally(sum.sides.enemy)],
    };
    return ending;
  };

  const build = (): BattleFrame => {
    current = { t: b.t, seed: b.seed, sides, ships: b.ships.map(shipView), shots, events, outcome: endingOf(), wings: wingViews(b, M) }; // PKG-25: wings
    return current;
  };

  const reset = (n: number) => {
    b = startBattle(setup, n);
    sides = [sideInfo(b, 'player'), sideInfo(b, 'enemy')];
    seen = b.logDropped + b.log.length;
    shots = [];
    events = [];
    ending = undefined;
    opened = { player: false, enemy: false };
    miss = (n >>> 0) || 1;
    return build();
  };

  const step = (dt: number) => {
    shots = [];
    events = [];
    const n = Math.max(0, Math.round(dt / b.dt));
    for (let i = 0; i < n; i++) simStep(b);
    drain();
    return build();
  };

  reset(seed0);
  return {
    name: 'sim',
    timeScale: 1,
    reset,
    step,
    frame: () => current,
    battle: () => b,
    order: (ship, o) => simOrder(b, ship, o, 'player'),
  };
}

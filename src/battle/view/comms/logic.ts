/**
 * The comms UI's reading of the battle (PKG-09): pure functions over the sim's `Battle`, no DOM, no three.js, no React.
 * Everything the player sees here comes from what a bridge would hear: the queue (PKG-06's `queue()`), his own ships,
 * what their captains last said. Never an enemy's state, never a morale number, never a true hull figure.
 */
import { COMMS_UI } from './numbers';
import { remainingPath } from '../tactical/paths';
import type { PathCache, XZ } from '../tactical/paths';
import { TAC } from '../tactical/numbers';
import { FIGHTER_TASKS, MANEUVERS, POINTS, SHIELD_SIDES, hasHangar, inField, isOfficerKind, queue } from '../../sim/index';
import type { Battle, Mood, OfficerId, Order, OrderKind, QueueItem, Report, ShieldSide, Ship, SideId } from '../../sim/index';

/** Q, E, R pick the selected report's first, second, third answer (BRIDGE §4). */
export const ANSWER_KEYS = ['Q', 'E', 'R'] as const;

/** Mood as a colour token (tokens only: styles.css). */
export const MOOD_TOKEN: Record<Mood, string> = {
  confident: 'var(--good)', steady: 'var(--cyan)', strained: 'var(--amber)', panicked: 'var(--danger)', defiant: 'var(--silver)',
};

/** Two letters from a name: "Livia Laskaris" → "LL". The code-drawn placeholder portrait. */
export function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : parts[0][1] ?? '')).toUpperCase();
}

export const playerSide = (b: Battle): SideId => b.comms?.side ?? 'player';
export const flagshipOf = (b: Battle): Ship | undefined => b.ships.find((s) => s.id === b.sides[playerSide(b)].flagshipId);

/** What an order costs in command points (PKG-06 `command()`): the flagship's crew and officer kinds cost `officer`. */
export function costOf(b: Battle, shipId: string | null, kind: OrderKind): number {
  const s = b.ships.find((x) => x.id === shipId);
  return (s?.flagship || isOfficerKind(kind)) ? POINTS.officer : POINTS.direct;
}

const HULL_WORDS: [number, string][] = [[80, 'Sound'], [50, 'Damaged'], [25, 'Hurt'], [0, 'Crippled']];
const TYPE_WORDS: Partial<Record<Report['type'], string>> = {
  breaking: 'Wavering', shieldDown: 'Side open', breach: 'Breached', protest: 'Protesting', refuse: 'Refusing',
  ack: 'Under orders', timeoutChoice: 'Own call', kill: 'Scored', withdraw: 'Asks out', pursue: 'Wants pursuit',
  cover: 'Wants to cover', ping: 'On station', flagshipThreatened: 'Under fire',
};
const OUT_WORDS: Record<Ship['status'], string> = {
  active: 'On station', broken: 'Running', fled: 'Jumped', withdrawn: 'Withdrawn', struck: 'Struck', wrecked: 'Lost',
};

/**
 * A ship's status word as its captain last reported it (BRIDGE §3: reports can be wrong). The hull figure, when there
 * is one, is the captain's own (Candour-shaped), never the true number. Out of the field, what anyone can see.
 */
export function statusWord(b: Battle, s: Ship): { word: string; reported: number | null } {
  if (s.status !== 'active') return { word: OUT_WORDS[s.status], reported: null };
  const c = b.comms;
  if (!c) return { word: OUT_WORDS.active, reported: null };
  const said = [...c.history, ...c.open].filter((r) => r.ship === s.id && r.from.officer === null).sort((x, y) => x.t - y.t || x.id - y.id);
  const last = said[said.length - 1];
  if (!last) return { word: OUT_WORDS.active, reported: null };
  const m = /(\d{1,3})%/.exec(last.text);
  if (m) {
    const pct = Number(m[1]);
    return { word: HULL_WORDS.find(([at]) => pct >= at)![1], reported: pct };
  }
  return { word: TYPE_WORDS[last.type] ?? OUT_WORDS.active, reported: null };
}

export interface RosterCard {
  id: string; name: string; cls: Ship['cls']; captain: string; initials: string; mood: Mood; moodToken: string;
  word: string; reported: number | null; flagship: boolean; prize: boolean; inField: boolean; hangar: boolean;
}

/** One card per own ship (captured prizes join it: a prize is on his side now). */
export function rosterOf(b: Battle): RosterCard[] {
  const side = playerSide(b);
  return b.ships.filter((s) => s.side === side).map((s) => {
    const w = statusWord(b, s);
    return {
      id: s.id, name: s.name, cls: s.cls, captain: s.captain.name, initials: initials(s.captain.name), mood: s.captain.mood,
      moodToken: MOOD_TOKEN[s.captain.mood], word: w.word, reported: w.reported, flagship: s.flagship, prize: !!s.prize,
      inField: inField(s.status), hangar: hasHangar(s),
    };
  }).sort((x, y) => Number(y.flagship) - Number(x.flagship) || Number(y.inField) - Number(x.inField));
}

/**
 * PKG-22 (F-07, TRC05-8): what the scoreboard's counts are made of, per side: prizes it took and now fights, and its
 * own ships the enemy took. The header reads "12/13 · 1 taken" instead of a bare 12/13.
 */
export function capturesOf(b: Battle): Record<SideId, { taken: number; lost: number }> {
  const out = { player: { taken: 0, lost: 0 }, enemy: { taken: 0, lost: 0 } } as Record<SideId, { taken: number; lost: number }>;
  for (const s of b.ships) {
    if (s.capturedFrom === undefined || s.capturedFrom === s.side) continue;
    out[s.side].taken++;
    out[s.capturedFrom].lost++;
  }
  return out;
}

export interface QueueRow extends QueueItem {
  initials: string; moodToken: string; keys: string[]; fraction: number | null;
  /** PKG-22 (F-07): a capture card: 'won' when the prize is his now, 'lost' when one of his was taken. */
  prize: 'won' | 'lost' | null;
}

/** The queue as PKG-06 orders it, with the portrait, mood colour, answer keys and how much of the timeout is left. */
export function queueRows(b: Battle, firstLeft: Map<number, number>): QueueRow[] {
  return queue(b).map((q) => {
    if (q.secondsLeft !== null && !firstLeft.has(q.id)) firstLeft.set(q.id, Math.max(q.secondsLeft, 0.01));
    const total = firstLeft.get(q.id);
    return {
      ...q,
      initials: initials(q.from.name || 'Flag'),
      moodToken: MOOD_TOKEN[q.from.mood],
      keys: q.selected ? q.answers.map((_, i) => ANSWER_KEYS[i] ?? '') : q.answers.map(() => ''),
      fraction: q.secondsLeft === null || !total ? null : Math.max(0, Math.min(1, q.secondsLeft / total)),
      prize: q.type !== 'captured' ? null : b.ships.find((s) => s.id === q.about)?.side === playerSide(b) ? 'won' : 'lost',
    };
  });
}

/**
 * One order line. `to` is the ship the order is on; PKG-12 (`all`) adds lines with no ship at the end: `point` (a hold
 * station, a withdrawal's course) or `path` (a maneuver's remaining path, sim metres, from the ship's position).
 */
export interface OrderLine { from: string; to: string | null; kind: OrderKind | 'pods'; point?: XZ; path?: XZ[] }

/**
 * Standing orders with a target, drawn ship → target while they stand (an order the ship dropped is not drawn).
 * `all` (PKG-12, the `tactical` flag): every standing order of his ships, not only those with a target. A maneuver in
 * progress is its remaining path; follow-the-flagship runs to the flagship; hold position marks the station; a
 * withdrawal points along its course; the master of guns' target runs from the flagship.
 */
export function orderLines(b: Battle, all = false, paths: PathCache = new Map()): OrderLine[] {
  const side = playerSide(b);
  const live = (id: string | undefined | null) => {
    const t = b.ships.find((x) => x.id === id);
    return !!t && inField(t.status) && t.side !== side;
  };
  const out: OrderLine[] = [];
  for (const s of b.ships) {
    if (all && s.side === side && s.status === 'active' && s.order) {
      const o = s.order;
      if (o.kind === 'maneuver') {
        const rest = remainingPath(b, s.id, paths);
        if (rest && rest.pts.length > 1) { out.push({ from: s.id, to: o.target && live(o.target) ? o.target : null, kind: 'maneuver', path: rest.pts }); continue; }
      } else if (o.kind === 'followFlagship') {
        const flag = flagshipOf(b);
        if (flag && flag.id !== s.id && inField(flag.status)) out.push({ from: s.id, to: flag.id, kind: o.kind });
        continue;
      } else if (o.kind === 'holdPosition') {
        out.push({ from: s.id, to: null, kind: o.kind, point: { x: s.pos.x, z: s.pos.z } });
        continue;
      } else if (o.kind === 'withdraw') {
        out.push({ from: s.id, to: null, kind: o.kind, point: { x: s.pos.x + Math.cos(s.heading) * TAC.withdrawLineM, z: s.pos.z + Math.sin(s.heading) * TAC.withdrawLineM } });
        continue;
      }
    }
    if (s.side !== side || s.status !== 'active' || !s.order?.target || !live(s.order.target)) continue;
    out.push({ from: s.id, to: s.order.target, kind: s.order.kind });
  }
  const guns = b.comms?.crew[side]?.guns;
  const flag = flagshipOf(b);
  if (all && guns?.mode === 'on' && flag?.status === 'active' && live(guns.target) && !out.some((l) => l.from === flag.id && l.to === guns.target)) {
    out.push({ from: flag.id, to: guns.target, kind: 'gunsOn' });
  }
  // Pods in flight: launcher → target, once per pair, while the launcher is still his.
  const seen = new Set<string>();
  for (const g of b.boarding?.pods ?? []) {
    const from = b.ships.find((x) => x.id === g.from);
    if (g.side !== side || !from || from.side !== side || !live(g.target) || seen.has(`${g.from}>${g.target}`)) continue;
    seen.add(`${g.from}>${g.target}`);
    out.push({ from: g.from, to: g.target, kind: 'pods' });
  }
  return out;
}

/** A shield split shifted toward one side by COMMS_UI.shieldStep, the others giving it up evenly (floored). */
export function shiftSplit(split: Record<ShieldSide, number>, toward: ShieldSide | 'even' | 'all'): Record<ShieldSide, number> {
  if (toward === 'even') return { fore: 0.25, aft: 0.25, port: 0.25, starboard: 0.25 };
  const out = { ...split };
  if (toward === 'all') return out;
  const others = SHIELD_SIDES.filter((k) => k !== toward);
  let moved = 0;
  for (const k of others) {
    const give = Math.min(COMMS_UI.shieldStep / 3, Math.max(0, out[k] - COMMS_UI.shieldFloor));
    out[k] -= give;
    moved += give;
  }
  out[toward] += moved;
  return out;
}

/** Everything to one side: the floor on the other three. */
export function allToSide(side: ShieldSide): Record<ShieldSide, number> {
  const out = { fore: COMMS_UI.shieldFloor, aft: COMMS_UI.shieldFloor, port: COMMS_UI.shieldFloor, starboard: COMMS_UI.shieldFloor };
  out[side] = 1 - COMMS_UI.shieldFloor * 3;
  return out;
}

/** The flagship's five officers (VISION §7a crew table), with the order kinds each takes. */
export const OFFICERS: { id: OfficerId; title: string }[] = [
  { id: 'helm', title: 'Flag captain' },
  { id: 'guns', title: 'Master of guns' },
  { id: 'engineering', title: 'Shields and engineering' },
  { id: 'marines', title: 'Marine commander' },
  { id: 'fighters', title: 'Fighter command' },
];

export const MANEUVER_LABEL: Record<(typeof MANEUVERS)[number], string> = {
  close: 'Close', openRange: 'Open range', freshSide: 'Fresh side', crossBow: 'Cross their bow', holdStation: 'Hold station', ram: 'Ram',
};
export const TASK_LABEL: Record<(typeof FIGHTER_TASKS)[number], string> = { escort: 'Escort', screen: 'Screen', hunt: 'Hunt' };

/** What the order menu offers on an enemy, for the selected ship. Board only if she carries pods. */
export interface MenuItem { id: string; label: string; order: Order }
export function menuFor(b: Battle, shipId: string, target: string): MenuItem[][] {
  const s = b.ships.find((x) => x.id === shipId);
  const rows: MenuItem[][] = [[{ id: 'attack', label: 'Attack', order: { kind: 'attack', target } }]];
  rows.push(SHIELD_SIDES.map((side) => ({ id: `focus-${side}`, label: side === 'starboard' ? 'Stbd' : cap(side), order: { kind: 'focusSide', target, side } })));
  if (s && hasHangar(s)) {
    rows.push([{ id: 'board', label: 'Board', order: { kind: 'board', target } },
      ...SHIELD_SIDES.map((side) => ({ id: `board-${side}`, label: side === 'starboard' ? 'Stbd' : cap(side), order: { kind: 'board' as const, target, side } }))]);
  }
  return rows;
}

/** Orders that need no target, for the selected ship. */
export const PLAIN_ORDERS: { id: string; label: string; order: Order }[] = [
  { id: 'hold', label: 'Hold', order: { kind: 'holdPosition' } },
  { id: 'follow', label: 'Follow flagship', order: { kind: 'followFlagship' } },
  { id: 'withdraw', label: 'Withdraw', order: { kind: 'withdraw' } },
];

export const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** The player's boarding fight on a ship, if any (for Reinforce / Pull back). */
export function playerFights(b: Battle): { target: string; name: string }[] {
  const side = playerSide(b);
  return (b.boarding?.fights ?? []).filter((f) => f.side === side).map((f) => ({ target: f.target, name: b.ships.find((s) => s.id === f.target)?.name ?? f.target }));
}

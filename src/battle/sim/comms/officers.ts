/**
 * The flagship's own crew (VISION §7a): five officers, each with direct order kinds that run through `order()`. They
 * answer in person. Their standing effects on the flagship run each tick from `crewEffects`.
 */
import { BOARDING } from '../boarding/numbers';
import { cannotBoard } from '../boarding/boarding';
import { order } from '../orders';
import { dist } from '../ships';
import { shipById } from '../ships';
import { ORDER_KINDS, SHIELD_SIDES, inField } from '../types';
import type { Battle, Order, Ship } from '../types';
import { comms, logRefusal, officerLine, officerSpeaker, status } from './core';
import { MANEUVER_SAY } from './lines';
import { CREW, FIGHTER_TASKS, MANEUVERS } from './numbers';
import type { OfficerId } from './types';

export const OFFICER_OF: Record<string, OfficerId> = {
  gunsOn: 'guns', holdFire: 'guns', shieldPower: 'engineering', overloadGuns: 'engineering', feedEngines: 'engineering',
  helm: 'helm', launchPods: 'marines', fighters: 'fighters',
};
export const isOfficerKind = (k: string) => k in OFFICER_OF && k !== 'shieldPower';

/** An officer speaks, on the player's comms only. */
function reply(b: Battle, ship: Ship, officer: OfficerId, key: string, vars: Record<string, string | number | undefined> = {}): string {
  const c = comms(b);
  const text = officerLine(c, key, vars);
  if (ship.side === c.side) status(b, 'officer', ship.id, officerSpeaker(b, c, officer, ship.side), text, false);
  return text;
}

function refuse(b: Battle, ship: Ship, officer: OfficerId, key: string, o: Order, vars: Record<string, string | number | undefined> = {}): false {
  const text = reply(b, ship, officer, key, vars);
  logRefusal(b, ship.id, o, text);
  return false;
}

/** order()'s case for the officer kinds. The flagship only. */
export function officerOrder(b: Battle, ship: Ship, o: Order): boolean {
  const officer = OFFICER_OF[o.kind];
  if (!ship.flagship) return refuse(b, ship, officer, 'notFlagship', o);
  const crew = comms(b).crew[ship.side];
  switch (o.kind) {
    case 'gunsOn': {
      const t = shipById(b, o.target);
      if (!t || t.side === ship.side || !inField(t.status)) return refuse(b, ship, officer, 'noTarget', o, { target: o.target ?? 'that' });
      crew.guns = { mode: 'on', target: t.id };
      ship.order = { kind: 'gunsOn', target: t.id };
      ship.stance.target = t.id;
      ship.stance.why = 'order';
      reply(b, ship, officer, 'gunsOn', { target: t.name });
      return true;
    }
    case 'holdFire':
      if (crew.guns.mode === 'hold') {
        crew.guns = { mode: 'free', target: null };
        reply(b, ship, officer, 'gunsFree');
      } else {
        crew.guns = { mode: 'hold', target: null };
        if (ship.order?.kind === 'gunsOn') ship.order = null;
        reply(b, ship, officer, 'holdFire');
      }
      return true;
    case 'overloadGuns':
    case 'feedEngines': {
      const want = o.kind === 'overloadGuns' ? 'overload' : 'engines';
      crew.power = crew.power === want ? 'normal' : want;
      reply(b, ship, officer, crew.power === 'normal' ? 'powerNormal' : o.kind);
      return true;
    }
    case 'helm':
      if (!o.maneuver || !(MANEUVERS as readonly string[]).includes(o.maneuver)) return refuse(b, ship, officer, 'noTarget', o, { target: o.maneuver ?? 'that maneuver' });
      crew.helm = o.maneuver;
      reply(b, ship, officer, 'helm', { maneuver: MANEUVER_SAY[o.maneuver] });
      return true;
    case 'launchPods': {
      const t = shipById(b, o.target);
      if (!t || t.side === ship.side || !inField(t.status)) return refuse(b, ship, officer, 'noTarget', o, { target: o.target ?? 'that' });
      // PKG-05 owns boarding: if its `board` kind is registered, the marine commander hands over to it.
      if (!(ORDER_KINDS as string[]).includes('board')) return refuse(b, ship, officer, 'noPods', o);
      // PKG-14: every refusal gives its true reason. The marine commander may send pods at their flagship (VISION §7a).
      const why = cannotBoard(ship, t, true);
      if (why) return refuse(b, ship, officer, POD_REFUSAL[why] ?? 'noTarget', o,
        { target: t.name, km: (dist(ship.pos, t.pos) / 1000).toFixed(1), reach: `${BOARDING.launchRange / 1000} km` });
      // PKG-22 (F-03): pods sent at a side the master of guns reported open go at that side.
      const ok = order(b, ship.id, { kind: 'board', target: t.id, ...(o.side ? { side: o.side } : {}) } as unknown as Order, ship.side);
      if (!ok) return refuse(b, ship, officer, 'podsGone', o, { target: t.name });
      crew.pods = t.id;
      reply(b, ship, officer, t.flagship ? 'launchPodsFlagship' : 'launchPods', { target: t.name });
      return true;
    }
    case 'fighters':
      if (!o.task || !(FIGHTER_TASKS as readonly string[]).includes(o.task)) return refuse(b, ship, officer, 'noTarget', o, { target: o.task ?? 'that task' });
      crew.fighters = o.task;
      reply(b, ship, officer, 'fighters', { task: o.task });
      return true;
  }
  return false;
}

/** The marine commander's line for each boarding refusal (boarding.ts BoardRefusal). */
const POD_REFUSAL: Record<string, string> = {
  'out of range': 'podsOutOfRange', 'no boarding hangar': 'noPods', 'hangar out': 'podsHangarOut',
  'not enough marines': 'podsNoMarines', 'no enemy target': 'podsGone', 'ship not active': 'podsGone',
};

/** Engineering's reply to a shield order on the flagship (shieldPower is PKG-02's kind; the reply is comms'). */
export function shieldReply(b: Battle, ship: Ship): void {
  const top = SHIELD_SIDES.reduce((a, k) => (ship.split[k] > ship.split[a] ? k : a), 'fore' as (typeof SHIELD_SIDES)[number]);
  const even = SHIELD_SIDES.every((k) => Math.abs(ship.split[k] - 0.25) < 0.01);
  reply(b, ship, 'engineering', even ? 'shieldEven' : 'shieldPower', { side: top });
}

/** The officers' standing orders, applied to each side's flagship every tick (before gunnery). */
export function crewEffects(b: Battle): void {
  const c = comms(b);
  for (const side of ['player', 'enemy'] as const) {
    const crew = c.crew[side];
    const s = shipById(b, b.sides[side].flagshipId);
    if (!s || s.status !== 'active') continue;
    if (crew.guns.mode === 'on') {
      const t = shipById(b, crew.guns.target);
      if (!t || !inField(t.status)) {
        crew.guns = { mode: 'free', target: null };
        if (s.order?.kind === 'gunsOn') s.order = null;
      } else s.stance.target = t.id;
    }
    if (crew.guns.mode === 'hold') for (const g of s.guns) g.cd = Math.max(g.cd, 2 * b.dt);
    if (crew.power === 'overload') {
      for (const g of s.guns) g.cd -= b.dt * CREW.overloadReload;
      for (const k of SHIELD_SIDES) {
        const max = s.shieldTotal * s.split[k];
        if (s.shields[k] > 1) s.shields[k] = Math.max(1, s.shields[k] - max * CREW.overloadShieldDrainPerS * b.dt);
      }
    } else if (crew.power === 'engines') {
      for (const g of s.guns) g.cd += b.dt * CREW.feedReloadPenalty;
      s.systems.engines = Math.min(100, s.systems.engines + CREW.feedRepairPerS * b.dt);
      s.systems.jump = Math.min(100, s.systems.jump + CREW.feedRepairPerS * b.dt);
    }
  }
}

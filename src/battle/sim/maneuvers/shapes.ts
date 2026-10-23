/**
 * The six shapes (PKG-10, BRIDGE §12b): each is a function of (battle, ships, target, params) → a plotted course per
 * ship, a list of legs the pilot flies inside the ship's limits. Read-only on the battle: the preview calls this too.
 *
 * The captain chooses how: the engagement range and the flanking swing come from class, trait and SHADE; the speed,
 * tightness and lateness of the turns come from Helm in the pilot. ASSUMED, for Caleb to overrule: every shape below.
 */
import { BOARDING } from '../boarding/numbers';
import { CLASS, SHIELD, TRAIT, sideOffset } from '../numbers';
import { bearing, centroid, headingToPresent, shipById, sideMax, wrap } from '../ships';
import { SHIELD_SIDES, inField } from '../types';
import type { Battle, ShieldSide, Ship } from '../types';
import { DEFAULT_SHADE, MAN, SHADE } from './numbers';
import type { Shade } from './numbers';
import { limitsOf } from './pilot';
import type { Leg, ManeuverName } from './types';


interface P { x: number; z: number }
const at = (o: P, h: number, r: number): P => ({ x: o.x + Math.cos(h) * r, z: o.z + Math.sin(h) * r });
const go = (p: P, v = 1): Leg => ({ k: 'go', x: p.x, z: p.z, v });
const hold = (face: number | null, dur: number): Leg => ({ k: 'hold', face, dur });
const shadeOf = (s: Ship): Shade => SHADE[s.captain.trait] ?? DEFAULT_SHADE;

/** The range this captain fights the maneuver at. */
export function rangeOf(s: Ship): number {
  return CLASS[s.cls].prefRange * TRAIT[s.captain.trait].rangeMul * shadeOf(s).rangeMul;
}

/** Where the target will be: its velocity at order time, for as long as it takes us to get there (capped). */
function lead(s: Ship, t: Ship): P {
  const cruise = Math.max(1, CLASS[s.cls].maxSpeed);
  const d = Math.hypot(t.pos.x - s.pos.x, t.pos.z - s.pos.z);
  const k = t.speed * Math.min(d / cruise, MAN.leadMaxS);
  return at(t.pos, t.heading, k);
}

/** Unit normal of the target's track pointing to the ship's side of it. */
function sideNormal(T: P, th: number, S: P): number {
  const cross = Math.cos(th) * (S.z - T.z) - Math.sin(th) * (S.x - T.x);
  return th + (cross >= 0 ? Math.PI / 2 : -Math.PI / 2);
}

const frac = (s: Ship, side: ShieldSide) => {
  const m = sideMax(s, side);
  return m > 0 ? s.shields[side] / m : 0;
};

/** The weak side to come in on: an open side nearest our bearing, else the lowest-charged side. */
export function weakSide(t: Ship, from: P): ShieldSide {
  const toFrom = Math.atan2(from.z - t.pos.z, from.x - t.pos.x);
  const open = SHIELD_SIDES.filter((x) => t.open[x]);
  const pool = open.length ? open : SHIELD_SIDES;
  let best = pool[0];
  let bestK = Infinity;
  for (const side of pool) {
    const angle = Math.abs(wrap(t.heading + sideOffset[side] - toFrom));
    // Open sides: nearest wins. Otherwise: weakest wins, nearest breaks ties.
    const k = open.length ? angle : frac(t, side) * 10 + angle / Math.PI;
    if (k < bestK) { bestK = k; best = side; }
  }
  return best;
}

/** The side with the most charge (a fresh side), ties in SHIELD_SIDES order. */
export function freshSide(s: Ship, among: ShieldSide[] = SHIELD_SIDES): ShieldSide {
  let best = among[0];
  for (const side of among) if (frac(s, side) > frac(s, best) + 1e-9) best = side;
  return best;
}

export const hasHangar = (s: Ship) => BOARDING.hangarClasses.includes(s.cls);

export interface Plan { ship: string; legs: Leg[] }
export interface PlanResult { plans: Plan[]; refused: { ship: string; reason: string }[]; target: string | null; side: ShieldSide | null }

/**
 * Plot `name` for `shipIds` against `targetId`. The first ship leads. Ships that cannot take part are refused with a
 * reason; if none can, plans is empty.
 */
export function plan(b: Battle, shipIds: string[], name: ManeuverName, targetId: string | null | undefined, side?: ShieldSide | null): PlanResult {
  const refused: PlanResult['refused'] = [];
  const lead0 = shipById(b, shipIds[0]);
  const ships: Ship[] = [];
  for (const id of [...new Set(shipIds)]) {
    const s = shipById(b, id);
    if (!s || s.status !== 'active') { refused.push({ ship: id, reason: 'ship not active' }); continue; }
    if (lead0 && s.side !== lead0.side) { refused.push({ ship: id, reason: 'not under the same command' }); continue; }
    ships.push(s);
  }
  const none = (reason: string): PlanResult => ({ plans: [], refused: [...refused, ...ships.map((s) => ({ ship: s.id, reason }))], target: null, side: null });
  if (!ships.length) return none('no ship');
  let t = shipById(b, targetId);
  if (!t && (name === 'defensiveWheel' || name === 'fightingWithdrawal')) {
    // The threat defaults to the nearest enemy.
    let bd = Infinity;
    for (const f of b.ships) {
      if (f.side === ships[0].side || f.status !== 'active') continue;
      const d = Math.hypot(f.pos.x - ships[0].pos.x, f.pos.z - ships[0].pos.z);
      if (d < bd) { bd = d; t = f; }
    }
  }
  if (!t || t.side === ships[0].side || !inField(t.status)) return none('no enemy target');
  const target = t;
  const out = (plans: Plan[], s: ShieldSide | null = null): PlanResult => ({ plans, refused, target: target.id, side: s });

  switch (name) {
    case 'broadsidePass':
      return out(ships.map((s) => ({ ship: s.id, legs: broadsidePass(s, target) })));
    case 'crossingLine':
      return out(ships.map((s) => ({ ship: s.id, legs: crossingLine(s, target) })));
    case 'flankingArc': {
      const chosen = side ?? weakSide(target, ships[0].pos);
      return out(ships.map((s) => ({ ship: s.id, legs: flankingArc(s, target, chosen) })), chosen);
    }
    case 'boardingRun': {
      if (target.flagship) return none('flagship: only the admiral leading may board it');
      const divers = ships.filter(hasHangar);
      if (!divers.length) return none('no boarding hangar in the group');
      const chosen = side ?? weakSide(target, ships[0].pos);
      const T = lead(divers[0], target);
      const a = target.heading + sideOffset[chosen];
      const plans: Plan[] = [];
      let di = 0;
      let ei = 0;
      for (const s of ships) {
        if (hasHangar(s)) {
          const spread = (di % 2 ? -1 : 1) * Math.ceil(di / 2) * (MAN.escortSpread / 2);
          const D = at(T, a + spread, BOARDING.launchRange * MAN.diveFrac);
          const exit = at(T, a + spread + MAN.pullOutAngle * (di % 2 ? -1 : 1), BOARDING.launchRange);
          plans.push({ ship: s.id, legs: [hold(null, MAN.diveDelayS), go(D), { k: 'board', target: target.id, side: chosen }, go(exit)] });
          di++;
        } else {
          const sgn = ei % 2 ? -1 : 1;
          const E = at(T, a + sgn * MAN.escortSpread * (1 + Math.floor(ei / 2)), MAN.escortLeadR);
          plans.push({ ship: s.id, legs: [go(E), go(at(T, a + sgn * MAN.breakAngle, MAN.breakR))] });
          ei++;
        }
      }
      return out(plans, chosen);
    }
    case 'defensiveWheel':
      return out(defensiveWheel(ships, target, b.dt));
    case 'fightingWithdrawal':
      return out(fightingWithdrawal(ships, target));
  }
}

/** Run parallel to the target at range, guns trained across: in on its beam, along it, and out. */
function broadsidePass(s: Ship, t: Ship): Leg[] {
  const R = rangeOf(s);
  const T = lead(s, t);
  const n = sideNormal(T, t.heading, s.pos);
  const M = at(T, n, R);
  const L = MAN.passLenMul * R;
  // The ship in the run's frame: u along the target's heading from the beam point M, w off the run line.
  const rx = s.pos.x - M.x, rz = s.pos.z - M.z;
  const uT = rx * Math.cos(t.heading) + rz * Math.sin(t.heading);
  const w = Math.abs(rx * Math.cos(n) + rz * Math.sin(n));
  // PKG-18: run the way that passes the target, unless the ship is near its beam; then the way it is already heading.
  const dir = Math.abs(uT) > MAN.passAbeamMul * R ? (uT < 0 ? 1 : -1) : (Math.cos(wrap(s.heading - t.heading)) >= 0 ? 1 : -1);
  const along = dir > 0 ? t.heading : t.heading + Math.PI;
  const us = uT * dir;
  // Join the run ahead of the ship at no more than passJoin off the line: never behind it, never past the beam point
  // unless the ship already is. No leg back to an entry point, so no dog-leg.
  const uj = Math.max(-L / 2, Math.min(Math.max(0, us), us + w / Math.tan(MAN.passJoin)));
  const legs = [go(at(M, along, uj))];
  if (uj < -1) legs.push(go(M));
  legs.push(go(at(M, along, Math.max(L / 2, uj + L / 2))));
  return legs;
}

/** Cut across the enemy's front, ahead of its bow at range, from our side to the other. */
function crossingLine(s: Ship, t: Ship): Leg[] {
  const R = rangeOf(s);
  const T = lead(s, t);
  const n = sideNormal(T, t.heading, s.pos);
  const P0 = at(T, t.heading, R);
  const W = MAN.crossHalfWidthMul * R;
  // Start on our side of their track; no further out than we already are, and at least a quarter-width out so the run
  // across is a run, not a pivot.
  const e = n + Math.PI;
  const u = (s.pos.x - P0.x) * Math.cos(e) + (s.pos.z - P0.z) * Math.sin(e);
  const start = Math.max(-W, Math.min(-W / 4, u));
  return [go(at(P0, e, start)), go(P0), go(at(P0, e, W))];
}

/** A wide curve round the target onto `side`, then settle facing it. A Bold captain skips the curve and goes straight in. */
function flankingArc(s: Ship, t: Ship, side: ShieldSide): Leg[] {
  const R = rangeOf(s);
  const shade = shadeOf(s);
  const T = lead(s, t);
  const aG = t.heading + sideOffset[side];
  const G = at(T, aG, R);
  const legs: Leg[] = [];
  if (!shade.direct) {
    const a0 = bearing({ x: T.x, y: 0, z: T.z }, s.pos);
    const d = wrap(aG - a0);
    const n = Math.ceil(Math.abs(d) / MAN.arcStep);
    for (let i = 1; i < n; i++) legs.push(go(at(T, a0 + (d * i) / n, R * shade.swing)));
  }
  legs.push(go(G));
  legs.push(hold(bearing({ x: G.x, y: 0, z: G.z }, { x: T.x, y: 0, z: T.z }), MAN.settleS));
  return legs;
}

/** The group turns round its centre so each ship ends with its freshest side toward the threat. */
function defensiveWheel(ships: Ship[], threat: Ship, dt: number): { ship: string; legs: Leg[] }[] {
  const lone = ships.length === 1;
  const C0 = centroid(ships)!;
  const C: P = lone ? at(ships[0].pos, ships[0].heading + Math.PI / 2, MAN.wheelMinR) : C0;
  const n = Math.ceil(MAN.wheelTurn / MAN.arcStep);
  return ships.map((s) => {
    // The ring is never tighter than the ship can turn.
    const r = Math.max(MAN.wheelMinR, MAN.wheelRadiusMul * limitsOf(s, dt).radius, Math.hypot(s.pos.x - C.x, s.pos.z - C.z));
    const phi = Math.atan2(s.pos.z - C.z, s.pos.x - C.x);
    const legs: Leg[] = [];
    let last: P = s.pos;
    for (let j = 1; j <= n; j++) { last = at(C, phi + (MAN.wheelTurn * j) / n, r); legs.push(go(last)); }
    const face = headingToPresent(Math.atan2(threat.pos.z - last.z, threat.pos.x - last.x), freshSide(s));
    legs.push(hold(face, MAN.settleS));
    return { ship: s.id, legs };
  });
}

/**
 * Back away from the threat keeping the strong beam toward it, in bounds; alternate ships hold and cover while the others
 * move (ships at odd places in the group start by covering).
 */
function fightingWithdrawal(ships: Ship[], threat: Ship): { ship: string; legs: Leg[] }[] {
  const C = centroid(ships)!;
  const away = Math.atan2(C.z - threat.pos.z, C.x - threat.pos.x);
  const off = SHIELD.arc + MAN.strongMargin;
  return ships.map((s, i) => {
    const strong = freshSide(s, ['port', 'starboard']);
    const hw = strong === 'port' ? away + off : away - off;
    const cover = (p: P) => hold(headingToPresent(Math.atan2(threat.pos.z - p.z, threat.pos.x - p.x), strong), MAN.coverS);
    let p: P = s.pos;
    const legs: Leg[] = [];
    if (i % 2) legs.push(cover(p));
    for (let k = 0; k < MAN.bounds; k++) {
      p = at(p, hw, MAN.boundM);
      legs.push(go(p));
      legs.push(cover(p));
    }
    return { ship: s.id, legs };
  });
}

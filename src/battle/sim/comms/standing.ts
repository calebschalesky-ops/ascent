/**
 * Standing shield orders (PKG-14, EXP-02 step 8). A shield split the admiral orders holds: the ship's captain (on the
 * flagship, the flag captain) does not re-trim it. It stands until the admiral gives another shield order, or until the
 * ship's officer reports out loud that it cannot hold: a side the order starves is open and carrying most of the
 * enemy's fire. Then the order is released and the captain trims again.
 */
import { SHIELD } from '../numbers';
import { drawPick } from '../rng';
import { SHIELD_SIDES } from '../types';
import type { Battle, ShieldSide, Ship } from '../types';
import { captainSpeaker, comms, fill, officerLine, officerSpeaker, status } from './core';
import { STATUS } from './lines';
import { STANDING } from './numbers';

/** The admiral's shield order on `s` now stands (call after the split is set). */
export function standShieldOrder(b: Battle, s: Ship): void {
  const c = comms(b);
  (c.shieldOrders ??= {})[s.id] = { t: b.t, side: s.side, split: { ...s.split } };
}

/** The standing shield order on `s`, if any. */
export const shieldOrderOn = (b: Battle, s: Ship) => b.comms?.shieldOrders?.[s.id];

/**
 * Called by the captain's shield trim (battle.ts shieldManagement) with the fire it sees per side. True while the
 * admiral's order holds, so the captain leaves the split alone. When it cannot hold, the officer says so and it is
 * released (false).
 */
export function shieldOrderStands(b: Battle, s: Ship, threat: Record<ShieldSide, number>): boolean {
  const c = b.comms;
  const o = c?.shieldOrders?.[s.id];
  if (!c || !o) return false;
  if (s.status !== 'active' || s.side !== o.side) { delete c.shieldOrders![s.id]; return false; }
  if (b.t - o.t < STANDING.graceS) return true;
  const total = SHIELD_SIDES.reduce((a, k) => a + threat[k], 0);
  if (total <= 0) return true;
  const starved = SHIELD_SIDES.find((k) => s.open[k] && threat[k] / total >= SHIELD.threatShare && s.split[k] < SHIELD.focus - 0.05);
  if (!starved) return true;
  delete c.shieldOrders![s.id];
  if (s.side === c.side) {
    if (s.flagship) status(b, 'shieldHold', s.id, officerSpeaker(b, c, 'engineering'), officerLine(c, 'shieldCantHold', { side: starved }), false);
    else status(b, 'shieldHold', s.id, captainSpeaker(s), fill(drawPick(c.rng, STATUS.shieldHold!), { side: starved, ship: s.name }), false);
  }
  return false;
}

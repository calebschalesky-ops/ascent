/**
 * The one order entry point both the player and the later AI admiral use. Later packages add kinds to ORDER_KINDS and a
 * case here; nothing else issues orders. Every order, accepted or refused, is logged.
 */
import { pushLog, round2, setShieldPower, shipById } from './ships';
import { launchBoarding, pullBack, refused } from './boarding/boarding';
import { inField } from './types';
import { officerOrder } from './comms/officers';
import { startManeuver } from './maneuvers/fly';
import { fighterOrder } from './fighters/fighters'; // PKG-25
import type { Battle, Order, SideId } from './types';

export function order(b: Battle, shipId: string, o: Order, by?: SideId): boolean {
  const ship = shipById(b, shipId);
  const issuer: SideId = by ?? ship?.side ?? 'player';
  const ok = !!ship && ship.status === 'active' && ship.side === issuer && valid(b, ship.side, o);
  pushLog(b, { t: round2(b.t), kind: 'order', ship: shipId, order: o, ok, by: issuer });
  b.stats.orders++;
  if (!ok || !ship) return false;
  switch (o.kind) {
    case 'shieldPower':
      setShieldPower(ship, o.split!);
      return true;
    case 'attack':
      ship.order = { kind: 'attack', target: o.target };
      ship.stance = { mode: 'engage', target: o.target!, side: null, present: ship.stance.present, why: 'order' };
      return true;
    case 'focusSide':
      ship.order = { kind: 'focusSide', target: o.target, side: o.side };
      ship.stance = { mode: 'engage', target: o.target!, side: o.side!, present: ship.stance.present, why: 'order' };
      return true;
    case 'holdPosition':
      ship.order = { kind: 'holdPosition' };
      ship.stance = { mode: 'hold', target: null, side: null, present: ship.stance.present, why: 'order' };
      return true;
    case 'followFlagship':
      ship.order = { kind: 'followFlagship' };
      ship.stance = { mode: 'follow', target: null, side: null, present: ship.stance.present, why: 'order' };
      return true;
    case 'withdraw':
      ship.order = { kind: 'withdraw' };
      ship.stance = { mode: 'withdraw', target: null, side: null, present: null, why: 'order' };
      return true;
    case 'gunsOn': case 'holdFire': case 'overloadGuns': case 'feedEngines': case 'helm': case 'launchPods':
      return officerOrder(b, ship, o);
    case 'fighters': // PKG-25: fighter command answers as before, and the wings fly the task
      return fighterOrder(b, ship, o);
    case 'board':
      return launchBoarding(b, ship, o.target!, o.side, true) || refused(b);
    case 'pullBack':
      return pullBack(b, ship.side, o.target) || refused(b);
    case 'maneuver':
      return startManeuver(b, ship, o);
  }
}

function valid(b: Battle, side: SideId, o: Order): boolean {
  if (o.kind === 'attack' || o.kind === 'focusSide') {
    const t = shipById(b, o.target);
    if (!t || t.side === side || !inField(t.status)) return false;
    if (o.kind === 'focusSide' && !o.side) return false;
  }
  if (o.kind === 'shieldPower' && !o.split) return false;
  return true;
}

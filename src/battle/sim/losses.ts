/**
 * PKG-08: what a fleet has lost, in one place. The break rule (battle.ts sideCheck), the end reason and the tally
 * (summary.ts) all read `fleetLosses()`, so they cannot disagree.
 *
 * A side's ships are the ones it started with. One of them is
 * - lost: wrecked, struck, or captured by the enemy (whatever became of it after);
 * - fled: broke and jumped out; withdrawn: ordered or allowed out.
 * A prize is an enemy ship this side captured. Strength (numbers STRENGTH) weights each by class: losing a destroyer
 * costs a fleet more than losing an escort.
 */
import { MORALE, STRENGTH } from './numbers';
import type { Battle, SideId } from './types';

export interface FleetLosses {
  /** Own ships wrecked, struck, captured by the enemy; `lost` is their sum (the tally's "Ships lost"). */
  wrecked: number;
  struck: number;
  captured: number;
  lost: number;
  fled: number;
  withdrawn: number;
  /** Enemy ships this side has captured and still holds in the field. */
  prizes: number;
  /** Strength the side started with, and what it has lost net of prizes (never below 0). */
  startStrength: number;
  strengthLost: number;
  /** strengthLost / startStrength: the side breaks at MORALE.sideBreakStrength. */
  frac: number;
}

export function fleetLosses(b: Battle, side: SideId): FleetLosses {
  const l: FleetLosses = { wrecked: 0, struck: 0, captured: 0, lost: 0, fled: 0, withdrawn: 0, prizes: 0, startStrength: 0, strengthLost: 0, frac: 0 };
  let gone = 0;
  let credit = 0;
  for (const s of b.ships) {
    const w = STRENGTH[s.cls];
    const origin = s.capturedFrom ?? s.side;
    if (origin === side) {
      l.startStrength += w;
      if (s.side !== side) { l.captured++; gone += w; }
      else if (s.status === 'wrecked') { l.wrecked++; gone += w; }
      else if (s.status === 'struck') { l.struck++; gone += w; }
      else if (s.status === 'fled') { l.fled++; gone += w; }
      else if (s.status === 'withdrawn') { l.withdrawn++; gone += w * MORALE.withdrawnLossFrac; }
    } else if (s.side === side && (s.status === 'active' || s.status === 'broken')) {
      // A prize counts while the side still holds it in the field: one wrecked a minute later is no gain.
      l.prizes++;
      credit += w * MORALE.prizeCredit;
    }
  }
  l.lost = l.wrecked + l.struck + l.captured;
  l.strengthLost = Math.max(0, gone - credit);
  l.frac = l.startStrength > 0 ? l.strengthLost / l.startStrength : 0;
  return l;
}

/** The break reason, in the tally's own words: "52% of its strength gone: ships lost 1, fled 4; prizes held 1". */
export function lossesText(l: FleetLosses): string {
  const parts = [`ships lost ${l.lost}`, `fled ${l.fled}`];
  if (l.withdrawn) parts.push(`withdrawn ${l.withdrawn}`);
  return `${Math.round(l.frac * 100)}% of its strength gone: ${parts.join(', ')}${l.prizes ? `; prizes held ${l.prizes}` : ''}`;
}

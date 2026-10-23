/**
 * PKG-16: `player-ui-like`, the plan TRC-03's player played through the real UI in EXP-06 step 6 (shots/trc-03/
 * exp06-s6-play-*.jsonl): every ~10 s, every ship, the flagship included, is ordered at the enemy nearest his
 * flagship; a ship already on it gets a focus-side order at the side facing it. The flagship goes forward to lead.
 * Acts only through `order()`, like every policy (policies.ts). Numbers: `PLAYER_UI` in numbers.ts.
 */
import { PLAYER_UI } from './numbers';
import { order } from './orders';
import { activeShips, nearest, shipById, sideFacing } from './ships';
import { otherSide } from './types';
import type { Battle, SideId } from './types';

export function playerUiLike(b: Battle, side: SideId): void {
  if (b.tick % Math.round(PLAYER_UI.everyS / b.dt) !== 0) return;
  const own = activeShips(b, side);
  const foes = activeShips(b, otherSide(side));
  if (!own.length || !foes.length) return;
  const flag = shipById(b, b.sides[side].flagshipId);
  const lead = flag && flag.status === 'active' ? flag : own[0];
  const t = nearest(lead, foes);
  if (!t) return;
  for (const s of own) {
    if (s.order?.kind === 'withdraw') continue;
    const onIt = (s.order?.kind === 'attack' || s.order?.kind === 'focusSide') && s.order.target === t.id;
    if (onIt && PLAYER_UI.focusSide) order(b, s.id, { kind: 'focusSide', target: t.id, side: sideFacing(t, s.pos) }, side);
    else if (!onIt) order(b, s.id, { kind: 'attack', target: t.id }, side);
  }
}

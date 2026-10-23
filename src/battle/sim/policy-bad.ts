/**
 * PKG-19: `scripted-bad` (WORLD-02 check 4), the bad plan written in reports/PKG-19.md section 1 before any seed was
 * run: the mistakes battles 2–6 name (B1–B5). Acts only through `order()` and sees only what the player's side sees
 * (policy-good.ts `look`). Numbers: `PLAN_BAD` in numbers.ts.
 */
import { cannotBoard, hasHangar } from './boarding/boarding';
import { PLAN_BAD } from './numbers';
import { order } from './orders';
import { activeShips, dist, fieldShips, nearest, shipById, sideFacing } from './ships';
import { SHIELD_SIDES, otherSide } from './types';
import type { Battle, SideId } from './types';
import { give, look, planState, seenOpen } from './policy-good';

export function scriptedBad(b: Battle, side: SideId): void {
  const st = planState(b, side);
  look(b, side, st.sight);
  if (b.t + 1e-9 < st.nextAt) return;
  st.nextAt = b.t + PLAN_BAD.everyS;
  const own = activeShips(b, side);
  const foes = activeShips(b, otherSide(side)).sort((x, y) => (x.id < y.id ? -1 : 1));
  if (!own.length || !foes.length) return;
  const running = fieldShips(b, otherSide(side)).filter((x) => x.status === 'broken');
  const theirFlag = shipById(b, b.sides[otherSide(side)].flagshipId);

  let i = 0;
  for (const s of own) {
    if (s.order?.kind === 'withdraw' || s.stance.mode === 'withdraw') continue;
    // B3: the flagship forward alone at theirs.
    if (s.flagship) {
      give(b, side, s, { kind: 'attack', target: (theirFlag && theirFlag.status === 'active' ? theirFlag : foes[0]).id });
      continue;
    }
    // B5: a ship whose target has broken chases the nearest broken enemy still in the field.
    const was = shipById(b, s.order?.target);
    if (running.length && was && was.status !== 'active') {
      const r = nearest(s, running);
      if (r) { give(b, side, s, { kind: 'attack', target: r.id }); continue; }
    }
    // B1 + B2: split fire, escorts included, round robin over their line.
    give(b, side, s, { kind: 'attack', target: foes[i++ % foes.length].id });
  }

  // B4: board before the side is open, every boardEveryS.
  if (b.t + 1e-9 >= st.nextBoardAt) {
    st.nextBoardAt = b.t + PLAN_BAD.boardEveryS;
    for (const l of own) {
      if (!hasHangar(l) || l.systems.hangar <= 0) continue;
      let t = foes[0];
      for (const f of foes) if (dist(l.pos, f.pos) < dist(l.pos, t.pos)) t = f;
      if (cannotBoard(l, t, true) !== null) continue;
      const facing = sideFacing(t, l.pos);
      const closed = seenOpen(b, st.sight, t.id, facing) ? SHIELD_SIDES.find((k) => !seenOpen(b, st.sight, t.id, k)) ?? facing : facing;
      order(b, l.id, { kind: 'board', target: t.id, side: closed }, side);
    }
  }
}

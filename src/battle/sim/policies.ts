/**
 * Controllers: who gives a side its orders. A policy runs every RUN.policyEveryS and may only act through `order()`
 * (and, once requests are answered by a player, `answer()`), so anything a policy does the player could do.
 *
 * - `idle`: never orders, never answers. Captains act on standing orders, Judgement and trait (WORLD-01).
 * - `doctrine-concentrate`: a STAND-IN for the AI admiral package, used by the enemy side in the Saturn skirmish.
 *   Methodical: one fleet target at a time, held until it leaves the field, chosen by distance and weakness. Uses
 *   the player's order set only.
 * - `scripted-good` / `scripted-bad` (WORLD-02 checks 3–4) slot in here; not built in PKG-02.
 */
import { ADMIRAL_POLICIES } from './admiral/admiral';
import { RUN } from './numbers';
import { order } from './orders';
import { activeShips, centroid, dist, shieldFrac, shipById } from './ships';
import { otherSide } from './types';
import type { Battle, SideId } from './types';
import { playerAnswersFirst } from './comms/policy';
import { playerUiLike } from './policy-ui-like'; // PKG-16
import { scriptedGood } from './policy-good'; // PKG-19
import { scriptedBad } from './policy-bad'; // PKG-19

export type Policy = (b: Battle, side: SideId) => void;

const idle: Policy = () => {};

const doctrineConcentrate: Policy = (b, side) => {
  if (b.tick % Math.round(RUN.doctrineEveryS / b.dt) !== 0) return;
  const own = activeShips(b, side);
  const foes = activeShips(b, otherSide(side));
  if (!own.length || !foes.length) return;
  const st = b.sides[side];
  const current = shipById(b, st.fleetTarget);
  if (!current || current.status !== 'active') {
    const c = centroid(own)!;
    let best = foes[0];
    let bestScore = Infinity;
    for (const f of foes) {
      const score = dist(c, f.pos) / 1000 + 4 * (f.hull / f.hullMax) + 4 * shieldFrac(f);
      if (score < bestScore) { bestScore = score; best = f; }
    }
    st.fleetTarget = best.id;
  }
  for (const s of own) {
    if (s.order?.kind === 'attack' && s.order.target === st.fleetTarget) continue;
    if (s.order?.kind === 'withdraw') continue;
    if (s.cls === 'escort') continue; // escorts keep screening the flagship
    order(b, s.id, { kind: 'attack', target: st.fleetTarget! }, side);
  }
};

export const POLICIES: Record<string, Policy> = {
  idle,
  'doctrine-concentrate': doctrineConcentrate,
  'admiral-jupiter': ADMIRAL_POLICIES['admiral-jupiter'],
  'aggressive-admiral': ADMIRAL_POLICIES['aggressive-admiral'],
  'scripted-good': scriptedGood, // PKG-19: the good plan (reports/PKG-19.md section 1), not the admiral's
  'scripted-bad': scriptedBad, // PKG-19: the bad plan
  'player-answers-first': playerAnswersFirst,
  'player-ui-like': playerUiLike, // PKG-16: TRC-03's played plan (EXP-06 s6)
};

export const policyNames = () => Object.keys(POLICIES);

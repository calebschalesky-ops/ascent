/**
 * PKG-20: what a setup does to a created battle beyond createBattle: a roster fixture's captains, and wings moved off
 * the line abreast. Draws only from a stream of the battle's own roster seed, never the battle's dice, so the same
 * setup, seed and roster give the same battle.
 */
import { ABILITY } from '../numbers';
import { fairRosters, moodOf, startingMorale } from '../captains';
import { makeRng, drawPick } from '../rng';
import { fieldShips } from '../ships';
import { TRAITS } from '../types';
import type { Battle, BattleSetup, Ship, SideId, Trait } from '../types';
import type { RosterFixture } from './rosters';

const other = (s: SideId): SideId => (s === 'player' ? 'enemy' : 'player');

/** The `nth` (from 1) ship of a class on a side, top of the line down. */
export function shipAt(b: Battle, side: SideId, cls: string, nth: number): Ship | undefined {
  return b.ships.filter((s) => s.side === side && s.cls === cls)[nth - 1];
}

export function applyRoster(b: Battle, fx: RosterFixture): void {
  const r = makeRng(b.rosterSeed ^ 0x7e3a1c55);
  // Bans, both sides: every banned trait becomes one drawn replacement, so each class's traits still match.
  const banned = new Set<Trait>((fx.bans ?? []).map((x) => x.trait));
  if (banned.size) {
    const pinnedTraits = new Set(fx.pins.map((p) => p.trait).filter(Boolean));
    const pool = TRAITS.filter((t) => !banned.has(t) && !pinnedTraits.has(t));
    const swap = drawPick(r, pool);
    for (const s of b.ships) if (banned.has(s.captain.trait)) s.captain.trait = swap;
  }
  // Pins, copied whole onto the other side's ship of the same class and place.
  const pinned = new Set<string>();
  for (const p of fx.pins) {
    const s = shipAt(b, p.side, p.cls, p.nth);
    if (!s) throw new Error(`roster ${fx.id}: ${b.setup} has no ${p.side} ${p.cls} #${p.nth}`);
    const c = s.captain;
    if (p.trait) c.trait = p.trait;
    if (p.abilities) Object.assign(c.abilities, p.abilities);
    if (p.loyalty !== undefined) c.loyalty = p.loyalty;
    pinned.add(s.id);
    const twin = shipAt(b, other(p.side), p.cls, p.nth);
    if (twin && !pinned.has(twin.id)) {
      twin.captain = { ...twin.captain, abilities: { ...c.abilities }, trait: c.trait, loyalty: c.loyalty };
      pinned.add(twin.id);
    }
  }
  // The unpinned captains evened again (they hold no banned or pinned-only trait, so redealing keeps the fixture).
  if (ABILITY.fairRosters) fairRosters(b.ships.filter((s) => !pinned.has(s.id)), r);
  restartMorale(b);
}

/** Wings: each named ship moved by its wing's offset. */
export function applyWings(b: Battle, setup: BattleSetup): void {
  for (const w of setup.wings ?? []) {
    for (const name of w.ships) {
      const s = b.ships.find((x) => x.side === w.side && x.name === name);
      if (!s) throw new Error(`${setup.name}: wing ${w.name} names ${name}, not a ${w.side} ship`);
      s.pos = { x: s.pos.x + w.offset.x, y: s.pos.y, z: s.pos.z + w.offset.z };
    }
  }
}

/** Morale and mood from the captains as they now are, as createBattle sets them; the t = 0 sample redone. */
export function restartMorale(b: Battle): void {
  for (const s of b.ships) {
    s.morale = s.moraleStart = startingMorale(s.captain);
    s.captain.mood = moodOf(s.captain, s.morale);
  }
  const mean = (side: SideId) => {
    const f = fieldShips(b, side);
    return f.length ? f.reduce((a, s) => a + s.morale, 0) / f.length : 0;
  };
  b.sides.player.morale = mean('player');
  b.sides.enemy.morale = mean('enemy');
  const first = b.stats.moraleSeries[0];
  if (first) {
    first.player = Math.round(b.sides.player.morale * 10) / 10;
    first.enemy = Math.round(b.sides.enemy.morale * 10) / 10;
  }
}

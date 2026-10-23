/**
 * Captains as data (BRIDGE-DESIGN §1): five abilities 1–10, one trait, mood (fast) and loyalty (slow), generated from
 * the battle's seed. Names are Greek, Roman and Byzantine history (house rule: no Red Rising names).
 */
import { MORALE, TRAIT, ABILITY } from './numbers';
import { draw, drawInt, drawPick } from './rng';
import type { Rng } from './rng';
import { TRAITS } from './types';
import type { Abilities, AbilityId, Captain, Mood, Trait } from './types';

export const GIVEN_NAMES = [
  'Alexios', 'Theodora', 'Irene', 'Nikephoros', 'Basil', 'Zoe', 'Anna', 'Leo', 'Helena', 'Demetrios', 'Eudokia',
  'Konstantinos', 'Theophano', 'Kallias', 'Phaedra', 'Isaac', 'Maria', 'Andronikos', 'Thekla', 'Stephanos', 'Sophia',
  'Manuel', 'Michael', 'Euphrosyne', 'Romanos', 'Bardas', 'Anastasia', 'Theodosios', 'Pulcheria', 'Kassia', 'Aurelia',
  'Marcus', 'Flavia', 'Gaius', 'Livia', 'Quintus', 'Lucilla', 'Simonis', 'Philippos', 'Xene',
] as const;

export const FAMILY_NAMES = [
  'Phokas', 'Doukas', 'Palaiologos', 'Kantakouzenos', 'Laskaris', 'Angelos', 'Bryennios', 'Skleros', 'Tornikes',
  'Gabras', 'Kamateros', 'Branas', 'Argyros', 'Maleinos', 'Kourkouas', 'Botaneiates', 'Melissenos', 'Synadenos',
  'Tarchaneiotes', 'Batatzes', 'Philanthropenos', 'Raoul', 'Choumnos', 'Metochites',
] as const;

/** An ability 1–10, bunched toward the middle (mean of two draws). */
function ability(r: Rng): number {
  return Math.max(1, Math.min(10, Math.round((draw(r) * 10 + draw(r) * 10) / 2 + 0.5)));
}

export function generateCaptain(r: Rng, taken: Set<string>): Captain {
  let name = '';
  for (let i = 0; i < 50; i++) {
    name = `${drawPick(r, GIVEN_NAMES)} ${drawPick(r, FAMILY_NAMES)}`;
    if (!taken.has(name)) break;
  }
  taken.add(name);
  const abilities: Abilities = { gunnery: ability(r), helm: ability(r), nerve: ability(r), judgement: ability(r), candour: ability(r) };
  const trait: Trait = drawPick(r, TRAITS);
  const loyalty = drawInt(r, 40, 90);
  return { name, abilities, trait, mood: 'steady', loyalty };
}

/**
 * PKG-13, fair rosters: after both sides' captains are generated (each still varied ship by ship), even them out so
 * neither side starts with better captains. Measured on roster 1 (PKG-13 report): equal fleet totals alone still left
 * one side ahead, because who commands which hull decides as much as the totals (swapping the two sides' captains
 * flipped the result), so the evening is done per class of hull:
 * - each ability's total over a class's ships (the capitals, the carriers, the destroyers, ...) is the same on both
 *   sides, within `ABILITY.fairTotalTol`: one point at a time, taken alternately from a seeded pick of the richer side's
 *   captains and given to the poorer side's, inside 1-10. So the fleet totals are equal too;
 * - (`ABILITY.fairTraits`) both sides' ships of a class carry the same traits, the second side's dealt in a seeded order.
 * A single-ship class (the flagship capital, the carrier) therefore gets the same abilities and trait on both sides.
 * Draws only from the roster stream, so the same roster seed gives the same captains. createBattle calls it only while
 * `ABILITY.fairRosters` is on (off until ruled on: see that switch).
 * ASSUMED, for Caleb to overrule: what "fair" means (equal ability totals and traits per side and per class of hull).
 */
export function fairRosters(ships: readonly { side: string; cls: string; captain: Captain }[], r: Rng): void {
  const keys: AbilityId[] = ['gunnery', 'helm', 'nerve', 'judgement', 'candour'];
  const sides = [...new Set(ships.map((s) => s.side))];
  if (sides.length !== 2) return;
  const total = (xs: Abilities[], k: AbilityId) => xs.reduce((t, a) => t + a[k], 0);
  for (const cls of [...new Set(ships.map((s) => s.cls))]) {
    const [p, e] = sides.map((side) => ships.filter((s) => s.side === side && s.cls === cls).map((s) => s.captain));
    if (p.length !== e.length) continue;
    const [pa, ea] = [p.map((c) => c.abilities), e.map((c) => c.abilities)];
    for (const k of keys) {
      for (let take = true, guard = 0; guard < 400; guard++, take = !take) {
        const d = total(pa, k) - total(ea, k);
        if (Math.abs(d) <= ABILITY.fairTotalTol) break;
        const [rich, poor] = d > 0 ? [pa, ea] : [ea, pa];
        const pool = take ? rich.filter((a) => a[k] > 1) : poor.filter((a) => a[k] < 10);
        if (!pool.length) continue;
        pool[drawInt(r, 0, pool.length - 1)][k] += take ? -1 : 1;
      }
    }
    if (!ABILITY.fairTraits) continue;
    const [from, to] = draw(r) < 0.5 ? [p, e] : [e, p];
    const deck = from.map((c) => c.trait);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = drawInt(r, 0, i);
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    to.forEach((c, i) => { c.trait = deck[i]; });
  }
}

/** Ship morale at the start of a battle, from Nerve and trait. */
export function startingMorale(c: Captain): number {
  const m = ABILITY.moraleStartBase + ABILITY.moraleStartPer * (c.abilities.nerve - 5) + TRAIT[c.trait].moraleStart;
  return Math.max(0, Math.min(100, m));
}

/** The morale below which this captain's ship breaks: low Nerve breaks sooner. */
export function breakThreshold(c: Captain): number {
  return ABILITY.breakBase - ABILITY.breakPer * (c.abilities.nerve - 5) + TRAIT[c.trait].breakMod;
}

/** Multiplier on every morale loss: high Nerve and steady traits lose less. */
export function moraleLossMul(c: Captain): number {
  return Math.max(0.2, (ABILITY.nerveLossBase - ABILITY.nerveLossPer * c.abilities.nerve) * TRAIT[c.trait].lossMul);
}

export function moodOf(c: Captain, morale: number): Mood {
  if (morale >= MORALE.confident) return 'confident';
  if (morale >= MORALE.steady) return 'steady';
  if (morale >= MORALE.strained) return 'strained';
  return c.trait === 'Fanatic' || c.trait === 'Bold' ? 'defiant' : 'panicked';
}

/** 1↔10, 2↔9 …: the swap WORLD-01 check 6 runs. */
export const flipAbility = (v: number) => 11 - v;

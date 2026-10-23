/**
 * A fight between squads: inside a ground site (infantry-carrier) or a hull (drill-boarder). Pure and deterministic:
 * the same squads and the same steps give the same result, so it is tested, saved mid-fight and replayed.
 *
 * Each step, each side's fire (men × fire, damped by morale) becomes casualties on the other, cut by the defender's
 * cover and spread over the other side's fighting squads by their size, divided by each squad's toughness. Losses and
 * being out-fired cost morale; a squad at the break line stops fighting. A side with no squad fighting has lost.
 */
import type { Side, Squad } from './squads';
import { INFANTRY, SQUADS, fighting, fireOf, menOf, sideFire } from './squads';

export interface FightTerms {
  /** Where: a ground site or a ship's hull. */
  place: 'site' | 'hull';
  /** The defenders' cover (squads.ts COVER): multiplies the casualties they take. */
  cover: number;
  /** Extra fire for the attackers (a breaching charge, close air support); 1 = none. */
  attackBonus?: number;
}

export interface Fight {
  v: 1;
  terms: FightTerms;
  attack: Squad[];
  defend: Squad[];
  /** Seconds fought. */
  t: number;
  winner: Side | null;
}

export function newFight(attack: Squad[], defend: Squad[], terms: FightTerms): Fight {
  const f: Fight = { v: 1, terms, attack, defend, t: 0, winner: null };
  settle(f);
  return f;
}

function wound(ss: Squad[], casualties: number) {
  const live = ss.filter(fighting);
  const men = live.reduce((t, s) => t + s.men, 0);
  if (men <= 0) return;
  for (const s of live) {
    const k = SQUADS[s.kind];
    const lost = Math.min(s.men, (casualties * (s.men / men)) / k.tough);
    s.men -= lost;
    s.morale -= (lost / k.men) * INFANTRY.shock;
  }
}

function nerve(ss: Squad[], own: number, enemy: number, dt: number) {
  const ratio = enemy / Math.max(1e-6, own);
  for (const s of ss) {
    if (!fighting(s)) continue;
    if (ratio > 1) s.morale -= INFANTRY.pressure * (ratio - 1) * dt;
    else s.morale += INFANTRY.rally * dt;
    s.morale = Math.max(0, Math.min(SQUADS[s.kind].morale, s.morale));
  }
}

function fall(ss: Squad[]) {
  for (const s of ss) {
    if (s.state === 'dead') continue;
    if (s.men < INFANTRY.minMen) { s.men = 0; s.state = 'dead'; } else if (s.state === 'fighting' && s.morale <= INFANTRY.breakAt) s.state = 'broken';
  }
}

function settle(f: Fight) {
  if (f.winner) return;
  const a = f.attack.some(fighting);
  const d = f.defend.some(fighting);
  if (!d && a) f.winner = 'attack';
  else if (!a) f.winner = 'defend'; // no attacker standing (or nobody): the defenders hold
  else if (f.t >= INFANTRY.maxTime) f.winner = 'defend';
}

/** Fight for `dt` seconds (call with small steps, a frame or a second). Returns the winner once there is one. */
export function stepFight(f: Fight, dt: number): Side | null {
  if (f.winner || dt <= 0) return f.winner;
  const fa = sideFire(f.attack) * (f.terms.attackBonus ?? 1);
  const fd = sideFire(f.defend);
  wound(f.defend, fa * INFANTRY.lethality * f.terms.cover * dt);
  wound(f.attack, fd * INFANTRY.lethality * dt);
  nerve(f.attack, fa, fd, dt);
  nerve(f.defend, fd, fa, dt);
  fall(f.attack);
  fall(f.defend);
  f.t += dt;
  settle(f);
  return f.winner;
}

export interface Outcome {
  winner: Side;
  /** Seconds it took. */
  time: number;
  /** Men standing at the end, each side (broken squads included: they live). */
  attackMen: number;
  defendMen: number;
}

/** Fight it out on copies (the squads given are untouched): the forecast a carrier's commander sees before landing. */
export function forecast(attack: Squad[], defend: Squad[], terms: FightTerms, step = 0.5): Outcome {
  const f = newFight(structuredCloneSquads(attack), structuredCloneSquads(defend), terms);
  while (!f.winner) stepFight(f, step);
  return { winner: f.winner, time: f.t, attackMen: menOf(f.attack), defendMen: menOf(f.defend) };
}

const structuredCloneSquads = (ss: Squad[]): Squad[] => ss.map((s) => ({ ...s }));

/** The attackers' share of the fire, now (0..1): the bar the HUD shows. */
export function balanceOfFire(f: Fight): number {
  const a = f.attack.reduce((t, s) => t + fireOf(s), 0);
  const d = f.defend.reduce((t, s) => t + fireOf(s), 0);
  return a + d > 0 ? a / (a + d) : f.winner === 'attack' ? 1 : 0;
}

/** Squads left standing on a side, for loading back into a carrier (broken squads re-embark and rally). */
export const survivors = (ss: Squad[]): Squad[] => ss.filter((s) => s.state !== 'dead').map((s) => ({ ...s, state: 'fighting' as const }));

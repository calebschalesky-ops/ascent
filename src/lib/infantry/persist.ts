/**
 * Reading the saved infantry state (GameData.infantry): carriers mid-operation, fights mid-fight, garrisons. Repairs
 * what it can (unknown sites and phases dropped, numbers clamped); null when there is nothing to read.
 */
import { NATIONS } from '../nations';
import type { NationId } from '../nations';
import { siteById } from '../conquest/sites';
import { INFANTRY_CARRIER } from '../shipTypes';
import type { Carrier, InfantryState, Phase } from './carrier';
import { newInfantry } from './carrier';
import { COSMOS, COSMOS_200M, migratePos } from '../nav';
import type { Fight } from './fight';
import type { Squad } from './squads';
import { SQUADS, SQUAD_KINDS } from './squads';

const PHASES: Phase[] = ['docked', 'standby', 'transit', 'descent', 'unload', 'fight', 'hold', 'lift', 'return', 'lost', 'gone'];
const NATION_IDS = NATIONS.map((n) => n.id);
const num = (v: unknown, d: number, lo = -Infinity, hi = Infinity) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' ? (v as Record<string, unknown>) : null);
const isNation = (v: unknown): v is NationId => NATION_IDS.includes(v as NationId);

function squad(v: unknown): Squad | null {
  const o = obj(v);
  if (!o || !SQUAD_KINDS.includes(o.kind as never) || !isNation(o.nation)) return null;
  const k = SQUADS[o.kind as Squad['kind']];
  const state = (['fighting', 'broken', 'dead'] as const).includes(o.state as never) ? (o.state as Squad['state']) : 'fighting';
  return { id: String(o.id ?? ''), kind: o.kind as Squad['kind'], nation: o.nation, men: num(o.men, k.men, 0, k.men), morale: num(o.morale, k.morale, 0, 1), state };
}
const squads = (v: unknown): Squad[] => (Array.isArray(v) ? v.map(squad).filter((s): s is Squad => !!s) : []);

function fight(v: unknown): Fight | null {
  const o = obj(v);
  const terms = obj(o?.terms);
  if (!o || !terms) return null;
  const winner = o.winner === 'attack' || o.winner === 'defend' ? o.winner : null;
  return { v: 1, terms: { place: terms.place === 'hull' ? 'hull' : 'site', cover: num(terms.cover, 1, 0, 1), ...(terms.attackBonus !== undefined ? { attackBonus: num(terms.attackBonus, 1, 0, 10) } : {}) }, attack: squads(o.attack), defend: squads(o.defend), t: num(o.t, 0, 0), winner };
}

function carrier(v: unknown): Carrier | null {
  const o = obj(v);
  if (!o || !PHASES.includes(o.phase as Phase) || !isNation(o.nation)) return null;
  const side = o.side === 'player' ? 'player' : isNation(o.side) ? o.side : null;
  if (!side) return null;
  const site = typeof o.site === 'string' && siteById(o.site) ? o.site : null;
  const pos = Array.isArray(o.pos) && o.pos.length === 3 ? (o.pos.map((x) => num(x, 0)) as Carrier['pos']) : ([0, 0, 0] as Carrier['pos']);
  let phase = o.phase as Phase;
  const f = fight(o.fight);
  if (!site && !['docked', 'standby', 'return', 'lost', 'gone'].includes(phase)) phase = 'standby';
  if ((phase === 'fight' || phase === 'hold') && !f) phase = 'lift';
  return {
    id: String(o.id ?? ''), side, nation: o.nation, name: String(o.name ?? 'Carrier'), phase,
    hp: num(o.hp, INFANTRY_CARRIER.hp, 0, INFANTRY_CARRIER.hp), squads: squads(o.squads), site, pos,
    alt: num(o.alt, 0, 0, 1e4), t: num(o.t, 0, 0), hold: num(o.hold, 0, 0), fight: f, note: String(o.note ?? ''),
  };
}

export function migrateInfantry(raw: unknown): InfantryState | null {
  const r = obj(raw);
  if (!r || r.v !== 1) return null;
  const inf = newInfantry();
  inf.carriers = Array.isArray(r.carriers) ? r.carriers.map(carrier).filter((c): c is Carrier => !!c) : [];
  // Positions follow the world's scale: a save from before ships went ×5 smaller has no scale and was at COSMOS_200M.
  const was = typeof r.scale === 'number' && r.scale > 0 ? r.scale : COSMOS_200M;
  if (was !== COSMOS) for (const c of inf.carriers) c.pos = migratePos(c.pos, was);
  inf.scale = COSMOS;
  const g = obj(r.garrisons);
  for (const [id, ss] of Object.entries(g ?? {})) if (siteById(id)) inf.garrisons[id] = squads(ss);
  inf.next = Math.max(num(r.next, 1, 1), ...inf.carriers.map((c) => Number(c.id.replace(/\D/g, '')) + 1 || 1));
  const cd = obj(r.cooldown);
  for (const n of NATION_IDS) if (cd && typeof cd[n] === 'number') inf.cooldown[n] = num(cd[n], 0, 0, 1e5);
  return inf;
}

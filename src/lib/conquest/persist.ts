/**
 * Reading a saved conquest state (GameData.conquest), repairing what it can: unknown worlds and sites are dropped,
 * missing ones start fresh, numbers are clamped to what the tables allow. Null when there is nothing to read.
 */
import type { NationId } from '../nations';
import type { Force } from '../shipTypes';
import { FORCE, SHIP_TYPES } from '../shipTypes';
import type { Job, LineKind, Owner, ConquestState } from './state';
import { WORLDS, newConquest } from './state';
import { PRODUCTION, RESOURCES } from './resources';
import { KINDS, SITES } from './sites';

const num = (v: unknown, d: number, lo = 0, hi = Infinity) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' ? (v as Record<string, unknown>) : null);
const force = (v: unknown, d: Force): Force => {
  const o = obj(v);
  return Object.fromEntries(SHIP_TYPES.map((t) => [t, Math.floor(num(o?.[t], d[t], 0, FORCE[t]))])) as Force;
};
const job = (v: unknown): Job | null => {
  const o = obj(v);
  return o && SHIP_TYPES.includes(o.type as never) ? { type: o.type as Job['type'], t: num(o.t, 0, 0, PRODUCTION.buildTime[o.type as Job['type']]) } : null;
};

export function migrateConquest(raw: unknown, home: NationId): ConquestState | null {
  const r = obj(raw);
  if (!r || r.v !== 1) return null;
  const c = newConquest(home);
  c.clock = num(r.clock, 0);
  c.purse = num(r.purse, 0, 0, 1e6);
  const worlds = obj(r.worlds);
  for (const w of WORLDS) {
    const x = obj(worlds?.[w]);
    if (!x) continue;
    const ws = c.worlds[w];
    ws.alive = force(x.alive, FORCE);
    ws.veterans = force(x.veterans, FORCE);
    for (const t of SHIP_TYPES) ws.veterans[t] = Math.min(ws.veterans[t], ws.alive[t]);
    const lines = obj(x.lines);
    for (const l of ['foundry', 'shipyard'] as LineKind[]) ws.lines[l] = job(lines?.[l]);
    const stock = obj(x.stock);
    for (const res of RESOURCES) ws.stock[res] = num(stock?.[res], PRODUCTION.start, 0, PRODUCTION.cap);
    ws.controlled = w !== home && x.controlled === true;
  }
  const sites = obj(r.sites);
  for (const s of SITES) {
    const x = obj(sites?.[s.id]);
    if (!x) continue;
    const st = c.sites[s.id];
    const max = KINDS[s.kind].hp;
    st.owner = (['native', 'player', 'wrecked'] as Owner[]).includes(x.owner as Owner) ? (x.owner as Owner) : 'native';
    if (st.owner === 'wrecked' && !KINDS[s.kind].wreck) st.owner = 'native';
    st.hp = st.owner === 'wrecked' ? 0 : num(x.hp, max, st.owner === 'native' ? 0 : max, max);
    st.hold = num(x.hold, 0, 0, KINDS[s.kind].hold);
    st.taken = x.taken === true;
    st.lastHit = num(x.lastHit, -1e9, -1e9);
    st.rebuild = num(x.rebuild, 0);
  }
  return c;
}

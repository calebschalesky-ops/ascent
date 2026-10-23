/**
 * Conquest rules over one plain, saveable object: production, damage, repair, capture, control, income, losses and
 * kill rewards (CONQUEST.md sections 2–7). Functions mutate the state they are given and return what happened, so
 * the scene can show it and the save can write it. No three.js and no clock of its own: time is what callers pass in
 * (flight time only).
 */
import type { NationId } from '../nations';
import { NATIONS } from '../nations';
import type { Force, ShipType } from '../shipTypes';
import { FORCE } from '../shipTypes';
import { ECONOMY } from '../progression/economy';
import type { Resource, Stock } from './resources';
import { PRODUCTION, RESOURCES, SHIP_COST, emptyStock } from './resources';
import type { SiteDef, SiteKind } from './sites';
import { KINDS, SITES, SITE_RULES, TRADE, siteById, sitesOf } from './sites';

export type Owner = 'native' | 'player' | 'wrecked';
export interface SiteState {
  hp: number;
  owner: Owner;
  hold: number; // capture progress, seconds
  taken: boolean; // the player has been paid for it already
  lastHit: number; // clock of the last hit
  rebuild: number; // seconds into the owner's rebuild of a wreck
}
export type LineKind = 'foundry' | 'shipyard';
export interface Job { type: ShipType; t: number }
export interface WorldState {
  alive: Force; // its ships flying now
  veterans: Force; // of its original force, still alive: they pay full, the rest are levies
  lines: Record<LineKind, Job | null>;
  stock: Stock;
  controlled: boolean; // by the player
}
export interface ConquestState {
  v: 1;
  clock: number; // flight seconds
  purse: number; // credits owed the player, not yet paid (fractions)
  home: NationId; // the player's nation: never a target
  worlds: Record<NationId, WorldState>;
  sites: Record<string, SiteState>;
}

export type ConquestEvent =
  | { kind: 'launch'; world: NationId; type: ShipType; from: string }
  | { kind: 'rebuilt'; site: string }
  | { kind: 'wrecked'; site: string }
  | { kind: 'captured'; site: string }
  | { kind: 'control'; world: NationId }
  | { kind: 'reward'; xp: number; credits: number; why: string };

export const WORLDS: NationId[] = NATIONS.map((n) => n.id);
const copyForce = (f: Force): Force => ({ ...f });

export function newConquest(home: NationId): ConquestState {
  const worlds = {} as Record<NationId, WorldState>;
  for (const w of WORLDS) {
    worlds[w] = { alive: copyForce(FORCE), veterans: copyForce(FORCE), lines: { foundry: null, shipyard: null }, stock: emptyStock(PRODUCTION.start), controlled: false };
  }
  const sites: Record<string, SiteState> = {};
  for (const s of SITES) sites[s.id] = { hp: KINDS[s.kind].hp, owner: 'native', hold: 0, taken: false, lastHit: -1e9, rebuild: 0 };
  return { v: 1, clock: 0, purse: 0, home, worlds, sites };
}

// ---------- reading the state ----------

export const isTarget = (c: ConquestState, w: NationId) => w !== c.home && !c.worlds[w].controlled;
export const controlledCount = (c: ConquestState) => WORLDS.filter((w) => c.worlds[w].controlled).length;
const maxHp = (s: SiteDef) => KINDS[s.kind].hp;
export const suppressed = (c: ConquestState, s: SiteDef) => c.sites[s.id].hp <= maxHp(s) * SITE_RULES.suppressAt;
/** Its owner's and above half structure: it works. */
export const working = (c: ConquestState, s: SiteDef) => c.sites[s.id].owner === 'native' && !suppressed(c, s);
export const workingOf = (c: ConquestState, w: NationId, kind: SiteKind) => sitesOf(w).filter((s) => s.kind === kind && working(c, s));
export const batteriesUp = (c: ConquestState, w: NationId) => sitesOf(w).some((s) => s.kind === 'battery' && c.sites[s.id].owner === 'native');
export const nativeForts = (c: ConquestState, w: NationId) => sitesOf(w).filter((s) => s.kind === 'fort' && c.sites[s.id].owner === 'native');
/** Every shipyard and foundry is the player's or wrecked: nothing can ever be built (or rebuilt) here again. */
export const productionGone = (c: ConquestState, w: NationId) => !sitesOf(w).some((s) => (s.kind === 'shipyard' || s.kind === 'foundry') && c.sites[s.id].owner === 'native');
export const productionStopped = (c: ConquestState, w: NationId) => c.worlds[w].controlled || productionGone(c, w);

/** Does the world make, or can it import, a resource right now? */
export function supplied(c: ConquestState, w: NationId, r: Resource, blockaded: NationId[] = []): 'local' | 'import' | null {
  if (sitesOf(w).some((s) => s.kind === 'works' && s.res === r && working(c, s))) return 'local';
  const from = TRADE[w][r];
  if (from && !c.worlds[from].controlled && !blockaded.includes(w)) return 'import';
  return null;
}

const covers = (stock: Stock, cost: Partial<Stock>) => RESOURCES.every((r) => stock[r] >= (cost[r] ?? 0));

/** What a line would lay down next, or null when the world is at strength for it. */
export function nextBuild(c: ConquestState, w: NationId, line: LineKind): ShipType | null {
  const ws = c.worlds[w];
  const order: ShipType[] = line === 'foundry' ? ['fighter'] : ['cruiser', 'destroyer', 'capital'];
  for (const t of order) {
    const building = (ws.lines.foundry?.type === t ? 1 : 0) + (ws.lines.shipyard?.type === t ? 1 : 0);
    if (ws.alive[t] + building < FORCE[t]) return t;
  }
  return null;
}

/** Why a line is not building, for the card; null while it builds or has nothing to build. */
export function lineProblem(c: ConquestState, w: NationId, line: LineKind): string | null {
  if (c.worlds[w].controlled) return 'stopped: the world is yours';
  if (!sitesOf(w).some((s) => s.kind === line && c.sites[s.id].owner === 'native')) return `stopped: no ${line} left`;
  if (!workingOf(c, w, line).length) return `paused: the ${line} is suppressed`;
  const job = c.worlds[w].lines[line];
  if (job) return null;
  const t = nextBuild(c, w, line);
  if (!t) return null;
  const short = RESOURCES.filter((r) => c.worlds[w].stock[r] < (SHIP_COST[t][r] ?? 0));
  return short.length ? `short of ${short.join(', ')}` : null;
}

// ---------- changing it ----------

export function rewardFor(s: SiteDef): { xp: number; credits: number } {
  return { xp: KINDS[s.kind].xp, credits: KINDS[s.kind].credits + (s.bounty ?? 0) };
}

function take(c: ConquestState, s: SiteDef, why: string, out: ConquestEvent[]) {
  const st = c.sites[s.id];
  if (st.taken) return;
  st.taken = true;
  const r = rewardFor(s);
  out.push({ kind: 'reward', xp: r.xp, credits: r.credits, why: `${why} ${s.name}` });
}

/** A shot on a site. Returns what it caused (a wreck, and the first-taking reward). */
export function hitSite(c: ConquestState, id: string, damage: number): ConquestEvent[] {
  const s = siteById(id);
  const st = c.sites[id];
  const out: ConquestEvent[] = [];
  if (!s || !st || st.owner !== 'native' || !isTarget(c, s.world) || damage <= 0) return out;
  const k = KINDS[s.kind];
  const shielded = s.kind !== 'battery' && batteriesUp(c, s.world) ? SITE_RULES.batteryShield : 1;
  const floor = k.wreck ? 0 : k.hp * SITE_RULES.cityFloor;
  st.hp = Math.max(floor, st.hp - damage * shielded);
  st.lastHit = c.clock;
  if (st.hp <= 0) {
    st.owner = 'wrecked';
    st.hold = 0;
    st.rebuild = 0;
    out.push({ kind: 'wrecked', site: id });
    take(c, s, 'Wrecked', out);
  }
  return out;
}

/** Why the player cannot capture a site now (or null when holding counts). */
export function captureProblem(c: ConquestState, id: string, at: { inRange: boolean; contested: boolean }): string | null {
  const s = siteById(id)!;
  const st = c.sites[id];
  if (st.owner !== 'native' || !isTarget(c, s.world)) return 'not theirs';
  if (!KINDS[s.kind].hold) return 'cannot be held: destroy it';
  if ((s.kind === 'city' || s.kind === 'capital') && nativeForts(c, s.world).length) return 'its forts still stand';
  if (!suppressed(c, s)) return 'not suppressed: shoot it below half';
  if (!at.inRange) return 'too far: close in to hold it';
  if (at.contested) return 'contested: their ships are near';
  return null;
}

/** One step of holding (or not holding) a site. Captures it once held long enough; may control the world. */
export function captureStep(c: ConquestState, id: string, dt: number, at: { inRange: boolean; contested: boolean }): ConquestEvent[] {
  const s = siteById(id);
  const st = s && c.sites[id];
  const out: ConquestEvent[] = [];
  if (!s || !st) return out;
  const why = captureProblem(c, id, at);
  // Their ships nearby pause the hold (the landing party digs in); leaving, or letting the site recover, loses it.
  if (why) { if (!why.startsWith('contested')) st.hold = Math.max(0, st.hold - SITE_RULES.drain * dt); return out; }
  st.hold += dt;
  if (st.hold < KINDS[s.kind].hold) return out;
  st.owner = 'player';
  st.hp = KINDS[s.kind].hp;
  st.hold = 0;
  out.push({ kind: 'captured', site: id });
  take(c, s, 'Took', out);
  out.push(...checkControl(c, s.world));
  return out;
}

/** The capital is the player's and no fort is its owner's: the world is the player's. */
export function checkControl(c: ConquestState, w: NationId): ConquestEvent[] {
  const ws = c.worlds[w];
  if (ws.controlled || w === c.home) return [];
  const cap = sitesOf(w).find((s) => s.kind === 'capital')!;
  if (c.sites[cap.id].owner !== 'player' || nativeForts(c, w).length) return [];
  ws.controlled = true;
  ws.lines = { foundry: null, shipyard: null };
  for (const s of sitesOf(w)) {
    const st = c.sites[s.id];
    if (st.owner === 'native') { st.owner = 'player'; st.hp = KINDS[s.kind].hp; st.hold = 0; st.taken = true; } // surrendered: no extra pay
  }
  return [{ kind: 'control', world: w }, { kind: 'reward', xp: SITE_RULES.controlXp, credits: 0, why: `Took ${NATIONS.find((n) => n.id === w)!.name}'s world` }];
}

/** A ship of a world was destroyed. A veteran (of its original force) pays full; a levy (rebuilt) pays half. */
export function onLoss(c: ConquestState, w: NationId, type: ShipType): { veteran: boolean } {
  const ws = c.worlds[w];
  ws.alive[type] = Math.max(0, ws.alive[type] - 1);
  if (ws.veterans[type] > 0) { ws.veterans[type]--; return { veteran: true }; }
  return { veteran: false };
}

export const LEVY_PAY = 0.5;
export function killReward(type: ShipType, veteran: boolean): { xp: number; credits: number } {
  const k = veteran ? 1 : LEVY_PAY;
  return { xp: Math.round(ECONOMY.killXp[type] * k), credits: Math.round(ECONOMY.killCredits[type] * k) };
}

/** Credits a minute the player is paid: every held site, plus tolls on trade links cut by taking a supplier. */
export function incomePerMinute(c: ConquestState): number {
  let n = 0;
  for (const s of SITES) {
    if (s.world === c.home || c.sites[s.id].owner !== 'player') continue;
    n += KINDS[s.kind].income * (s.kind === 'works' ? s.rich ?? 1 : 1);
  }
  for (const w of WORLDS) {
    if (c.worlds[w].controlled) continue;
    for (const from of Object.values(TRADE[w])) if (from && c.worlds[from].controlled) n += PRODUCTION.toll;
  }
  return n;
}

export interface StepOpts { blockaded?: NationId[] }

/** Advance flight time by dt: repairs, rebuilds, works, imports, the build lines, and the player's income. */
export function stepConquest(c: ConquestState, dt: number, o: StepOpts = {}): ConquestEvent[] {
  const out: ConquestEvent[] = [];
  const blockaded = o.blockaded ?? [];
  const mobilised = 1 + PRODUCTION.alarm * controlledCount(c);
  c.clock += dt;
  for (const w of WORLDS) {
    if (!isTarget(c, w)) continue;
    const ws = c.worlds[w];
    const sites = sitesOf(w);
    const canRebuild = sites.some((s) => (s.kind === 'shipyard' || s.kind === 'foundry') && working(c, s));
    for (const s of sites) {
      const st = c.sites[s.id];
      const max = KINDS[s.kind].hp;
      if (st.owner === 'native' && st.hp < max && c.clock - st.lastHit >= SITE_RULES.repairDelay) st.hp = Math.min(max, st.hp + max * SITE_RULES.repair * dt);
      if (st.owner === 'wrecked' && canRebuild) {
        st.rebuild += dt;
        if (st.rebuild >= SITE_RULES.rebuild) { st.owner = 'native'; st.hp = max; st.rebuild = 0; out.push({ kind: 'rebuilt', site: s.id }); }
      }
    }
    // Works and imports fill the stockpile.
    for (const r of RESOURCES) {
      let rate = 0;
      for (const s of sites) if (s.kind === 'works' && s.res === r && working(c, s)) rate += PRODUCTION.works * (s.rich ?? 1);
      if (!rate && supplied(c, w, r, blockaded) === 'import') rate = PRODUCTION.imports;
      ws.stock[r] = Math.min(PRODUCTION.cap, ws.stock[r] + rate * dt);
    }
    // The two build lines.
    for (const line of ['foundry', 'shipyard'] as LineKind[]) {
      const sitesHere = workingOf(c, w, line);
      if (!sitesHere.length) continue; // paused (or gone) while no site of it works
      let job = ws.lines[line];
      if (!job) {
        const t = nextBuild(c, w, line);
        if (t && covers(ws.stock, SHIP_COST[t])) {
          for (const r of RESOURCES) ws.stock[r] -= SHIP_COST[t][r] ?? 0;
          job = ws.lines[line] = { type: t, t: 0 };
        }
      }
      if (!job) continue;
      job.t += dt * sitesHere.length * mobilised;
      if (job.t >= PRODUCTION.buildTime[job.type]) {
        ws.alive[job.type]++;
        ws.lines[line] = null;
        out.push({ kind: 'launch', world: w, type: job.type, from: sitesHere[0].id });
      }
    }
  }
  c.purse += (incomePerMinute(c) / 60) * dt;
  const whole = Math.floor(c.purse);
  if (whole > 0) { c.purse -= whole; out.push({ kind: 'reward', xp: 0, credits: whole, why: 'income' }); }
  return out;
}

/** Plain copy, for the save. */
export const cloneConquest = (c: ConquestState): ConquestState => JSON.parse(JSON.stringify(c));

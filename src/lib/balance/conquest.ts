/**
 * Conquest against a level-1 pilot, headless. The world is the game's own conquest code (lib/conquest: production,
 * repair, rebuilding, capture, control, rewards). The pilot is abstract: it kills ships in the time `engage.ts`
 * measures for the player's best weapon against that race's loadout (0.5° aim), plus a fixed time to find and close on
 * each one, and shoots sites at a fixed damage rate. Enemies do not shoot back (they do not in the game yet).
 *
 * Assumptions every report states: ACQUIRE seconds per ship, SITE_DPS on a site, TRAVEL between sites (MOON_TRAVEL to,
 * from or between moons), a pilot who clears every live ship before touching a site, and a world counted as contested
 * while any of its ships is alive.
 * The pilot takes a world's foundry before its shipyard: fighters come every 45 s, cruisers every 120 s.
 */
import type { NationId } from '../nations';
import { NATIONS } from '../nations';
import type { ShipType } from '../shipTypes';
import { FORCE, SHIP_TYPES } from '../shipTypes';
import { ECONOMY } from '../progression/economy';
import { xpForLevel, MAX_LEVEL } from '../progression/levels';
import { craftStats } from '../craftStats';
import type { ConquestEvent, ConquestState } from '../conquest/state';
import { captureStep, hitSite, incomePerMinute, killReward, newConquest, onLoss, stepConquest, suppressed } from '../conquest/state';
import type { SiteDef, SiteKind } from '../conquest/sites';
import { KINDS, SITES, TRADE, sitesOf } from '../conquest/sites';
import { LASER } from '../weapons';
import { DEFAULT_ENGAGE, engageMany } from './engage';
import { rng } from './rng';

export const PILOT = {
  acquire: 8, // seconds to find and close on each ship
  siteDps: LASER.damage * LASER.rate * 0.9, // a big still target at close range: 90% of bolts land
  travel: 30, // seconds between two sites of one body (or its orbit)
  moonTravel: 90, // seconds to, from or between moons
  dt: 0.5,
};

export const CONQUEST_BANDS = {
  conquerMin: [8, 30] as const, // minutes to control each world, taking every site
  busyMax: 0.5, // farming an intact world, the pilot is busy killing at most this share of the time: kill capacity ≥ 2× production
  windowMin: 30, // seconds between a wiped patrol and the first launch
  // minutes to rebuild a wiped force at an intact world. Written as 6–15; widened to 16 after the first run because the
  // two metal-poor worlds (Venus's Descent, Saturn importing all its metal) rebuild in 16 min, which is the design.
  rebuildMin: [6, 20] as const, // integration pass 2: was 6–16; the force grew by a destroyer (3 min on the shipyard), destroyer thread's open question 1
  farmVsConquer: 0.6, // XP a minute farming a world's rebuilds ≤ this × XP a minute taking it
  incomeVsFarm: 1.5, // credits a minute from a controlled world ≥ this × credits a minute farming it
};

const ORDER: SiteKind[] = ['battery', 'foundry', 'shipyard', 'works', 'fort', 'city', 'capital'];
const body = (s: SiteDef) => s.at.on;

/** The pilot's seconds to kill each type of a race's ship, best weapon, from engage.ts. */
export function killTimes(nation: NationId, runs = 40, seed = 11): Record<ShipType, number> {
  const r = rng(seed);
  return Object.fromEntries(SHIP_TYPES.map((t) => {
    const best = Math.min(engageMany(t, 'laser', runs, r, { ...DEFAULT_ENGAGE, nation }).ttkMean, engageMany(t, 'missile', runs, r, { ...DEFAULT_ENGAGE, nation }).ttkMean);
    return [t, best];
  })) as Record<ShipType, number>;
}

interface Tally { xp: number; credits: number; oneTimeXp: number; vets: number; levies: number; launches: number; busy: number }
const tally = (): Tally => ({ xp: 0, credits: 0, oneTimeXp: 0, vets: 0, levies: 0, launches: 0, busy: 0 });
function book(t: Tally, ev: ConquestEvent[]) {
  for (const e of ev) {
    if (e.kind === 'launch') t.launches++;
    if (e.kind === 'reward') { t.xp += e.xp; t.credits += e.credits; if (e.why !== 'income') t.oneTimeXp += e.xp; }
  }
}

/** Kill the next live ship (fighters first, as they come out first and fly nearest) and pay for it. */
function killOne(c: ConquestState, w: NationId, t: Tally): ShipType | null {
  const type = (['fighter', 'cruiser', 'destroyer', 'capital'] as ShipType[]).find((x) => c.worlds[w].alive[x] > 0);
  if (!type) return null;
  const { veteran } = onLoss(c, w, type);
  const r = killReward(type, veteran);
  t.xp += r.xp; t.credits += r.credits;
  if (veteran) { t.vets++; t.oneTimeXp += r.xp; } else t.levies++;
  return type;
}

export interface ConquerRun { world: NationId; minutes: number; controlled: boolean; tally: Tally; xpPerMin: number }

/** A level-1 pilot takes every site of a world in order, clearing its ships whenever any are alive. */
export function conquer(world: NationId, ttk: Record<ShipType, number>, maxMin = 90): ConquerRun {
  const c = newConquest(world === 'earth' ? 'moon' : 'earth');
  const t = tally();
  const plan = sitesOf(world).slice().sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  let cur: SiteDef | null = null;
  let where: string = 'home';
  let travel = 0;
  let killing: { type: ShipType; left: number } | null = null;
  let time = 0;
  const dt = PILOT.dt;
  while (time < maxMin * 60 && !c.worlds[world].controlled) {
    book(t, stepConquest(c, dt));
    time += dt;
    const alive = SHIP_TYPES.some((x) => c.worlds[world].alive[x] > 0);
    if (killing || alive) {
      t.busy += dt;
      // Off chasing a ship: out of range of the site, so any hold drains (conservative: in the game a ship may come to you).
      if (cur && !travel) book(t, captureStep(c, cur.id, dt, { inRange: false, contested: true }));
      if (!killing) { const type = (['fighter', 'cruiser', 'destroyer', 'capital'] as ShipType[]).find((x) => c.worlds[world].alive[x] > 0)!; killing = { type, left: ttk[type] + PILOT.acquire }; }
      killing.left -= dt;
      if (killing.left <= 0) { killOne(c, world, t); killing = null; }
      continue;
    }
    if (!cur || c.sites[cur.id].owner !== 'native') {
      cur = plan.find((s) => c.sites[s.id].owner === 'native') ?? null;
      if (!cur) break;
      travel = body(cur) !== where && (body(cur) !== 'home' || where !== 'home') ? PILOT.moonTravel : PILOT.travel;
      where = body(cur);
    }
    if (travel > 0) { travel -= dt; continue; }
    const capture = KINDS[cur.kind].hold > 0;
    if (!capture || !suppressed(c, cur)) book(t, hitSite(c, cur.id, PILOT.siteDps * dt));
    else book(t, captureStep(c, cur.id, dt, { inRange: true, contested: false }));
  }
  const minutes = time / 60;
  return { world, minutes, controlled: c.worlds[world].controlled, tally: t, xpPerMin: t.xp / Math.max(1e-9, minutes) };
}

export interface FarmRun { world: NationId; minutes: number; tally: Tally; xpPerMin: number; creditsPerMin: number; busyShare: number }

/** A pilot who only kills a world's ships as they come, never touching a site. */
export function farm(world: NationId, ttk: Record<ShipType, number>, minutes = 60): FarmRun {
  const c = newConquest(world === 'earth' ? 'moon' : 'earth');
  const t = tally();
  let killing: { left: number } | null = null;
  const dt = PILOT.dt;
  for (let time = 0; time < minutes * 60; time += dt) {
    book(t, stepConquest(c, dt));
    const type = (['fighter', 'cruiser', 'destroyer', 'capital'] as ShipType[]).find((x) => c.worlds[world].alive[x] > 0);
    if (!killing && type) killing = { left: ttk[type] + PILOT.acquire };
    if (killing) { t.busy += dt; killing.left -= dt; if (killing.left <= 0) { killOne(c, world, t); killing = null; } }
  }
  const vetXp = SHIP_TYPES.reduce((a, x) => a + FORCE[x] * ECONOMY.killXp[x], 0);
  const vetCr = SHIP_TYPES.reduce((a, x) => a + FORCE[x] * ECONOMY.killCredits[x], 0);
  // Steady-state rates leave out the original force (paid once, whatever the pilot does next).
  return { world, minutes, tally: t, xpPerMin: (t.xp - vetXp) / minutes, creditsPerMin: (t.credits - vetCr) / minutes, busyShare: t.busy / (minutes * 60) };
}

/** Seconds from a wiped patrol to its first launch, and to a whole force again, at an intact world. */
export function rebuild(world: NationId): { window: number; full: number } {
  const c = newConquest(world === 'earth' ? 'moon' : 'earth');
  for (const x of SHIP_TYPES) while (c.worlds[world].alive[x] > 0) onLoss(c, world, x);
  let window = Infinity;
  let t = 0;
  while (t < 3600 && SHIP_TYPES.some((x) => c.worlds[world].alive[x] < FORCE[x])) {
    const ev = stepConquest(c, 0.5);
    t += 0.5;
    if (window === Infinity && ev.some((e) => e.kind === 'launch' && e.world === world)) window = t;
  }
  return { window, full: t };
}

/** Launches in 30 minutes once every shipyard and foundry is the player's or wrecked. */
export function afterProduction(world: NationId): number {
  const c = newConquest(world === 'earth' ? 'moon' : 'earth');
  for (const s of sitesOf(world)) if (s.kind === 'battery') hitSite(c, s.id, 1e6);
  for (const s of sitesOf(world)) if (s.kind === 'shipyard' || s.kind === 'foundry') hitSite(c, s.id, 1e6);
  for (const x of SHIP_TYPES) while (c.worlds[world].alive[x] > 0) onLoss(c, world, x);
  let n = 0;
  for (let t = 0; t < 1800; t += 1) n += stepConquest(c, 1).filter((e) => e.kind === 'launch' && e.world === world).length;
  return n;
}

/** Capital ships laid down in an hour at a world whose helium-3 is cut off (the Moon taken) and spent. */
export function heliumCut(world: NationId): number | null {
  if (TRADE[world].helium3 !== 'moon') return null;
  const c = newConquest(world === 'earth' ? 'moon' : 'earth');
  c.worlds.moon.controlled = true;
  c.worlds[world].stock.helium3 = 0;
  for (const x of SHIP_TYPES) while (c.worlds[world].alive[x] > 0) onLoss(c, world, x);
  let n = 0;
  for (let t = 0; t < 3600; t += 1) n += stepConquest(c, 1).filter((e) => e.kind === 'launch' && e.world === world && e.type === 'capital').length;
  return n;
}

/** Credits a minute a world pays once controlled (its sites only, no tolls). */
export function controlledIncome(world: NationId): number {
  const c = newConquest(world === 'earth' ? 'moon' : 'earth');
  for (const s of SITES) if (s.world === world && c.sites[s.id].owner === 'native') c.sites[s.id].owner = 'player';
  return incomePerMinute(c);
}

export interface ConquestFlag { band: string; detail: string }
export interface ConquestReport { rows: { world: NationId; ttk: Record<ShipType, number>; conquer: ConquerRun; farm: FarmRun; rebuild: { window: number; full: number }; after: number; helium: number | null; income: number }[]; reach: number; flags: ConquestFlag[]; markdown: string }

const f1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '—');
const pct = (x: number) => `${Math.round(x * 100)}%`;

export function conquestReport(runs = 40): ConquestReport {
  const targets = NATIONS.map((n) => n.id);
  const rows = targets.map((world) => {
    const ttk = killTimes(world, runs);
    return { world, ttk, conquer: conquer(world, ttk), farm: farm(world, ttk), rebuild: rebuild(world), after: afterProduction(world), helium: heliumCut(world), income: controlledIncome(world) };
  });
  // One-time XP a pilot from any home can earn: the six other worlds (taken whole) with their original forces.
  const reach = Math.min(...targets.map((home) => rows.filter((r) => r.world !== home).reduce((a, r) => a + r.conquer.tally.oneTimeXp, 0)));
  const B = CONQUEST_BANDS;
  const flags: ConquestFlag[] = [];
  for (const r of rows) {
    const n = r.world;
    if (!r.conquer.controlled || r.conquer.minutes < B.conquerMin[0] || r.conquer.minutes > B.conquerMin[1]) flags.push({ band: 'conquer', detail: `${n}: ${r.conquer.controlled ? f1(r.conquer.minutes) + ' min' : 'not taken in 90 min'}, band ${B.conquerMin[0]}–${B.conquerMin[1]}` });
    if (r.farm.busyShare > B.busyMax) flags.push({ band: 'outProduce', detail: `${n}: farming, the pilot is busy ${pct(r.farm.busyShare)} of the time (band ≤ ${pct(B.busyMax)})` });
    if (r.rebuild.window < B.windowMin) flags.push({ band: 'window', detail: `${n}: first launch ${f1(r.rebuild.window)} s after the patrol dies` });
    if (r.rebuild.full / 60 < B.rebuildMin[0] || r.rebuild.full / 60 > B.rebuildMin[1]) flags.push({ band: 'rebuild', detail: `${n}: full rebuild in ${f1(r.rebuild.full / 60)} min` });
    if (r.after !== 0) flags.push({ band: 'productionGone', detail: `${n}: ${r.after} launches after every production site fell` });
    if (r.helium !== null && r.helium !== 0) flags.push({ band: 'helium', detail: `${n}: ${r.helium} capital ships with helium-3 cut off` });
    if (r.farm.xpPerMin > B.farmVsConquer * r.conquer.xpPerMin) flags.push({ band: 'farm', detail: `${n}: farming ${f1(r.farm.xpPerMin)} XP/min against taking it ${f1(r.conquer.xpPerMin)}` });
    if (r.income < B.incomeVsFarm * r.farm.creditsPerMin) flags.push({ band: 'income', detail: `${n}: controlled pays ${f1(r.income)} cr/min, farming ${f1(r.farm.creditsPerMin)}` });
  }
  if (reach < xpForLevel(MAX_LEVEL)) flags.push({ band: 'reach', detail: `one-time XP ${reach} < level ${MAX_LEVEL}'s ${xpForLevel(MAX_LEVEL)}` });

  const md: string[] = [];
  md.push(`Level-1 pilot, 0.5° aim, kill times from engage.ts (${runs} runs a cell) against each race's loadout. Assumptions: ${PILOT.acquire} s to find each ship; ${f1(PILOT.siteDps)} damage a second on a site; ${PILOT.travel} s between sites (${PILOT.moonTravel} s to or between moons); every live ship cleared before a site is touched; a world is contested while any of its ships lives. Enemies do not shoot.`, '');
  md.push('| World | TTK fighter / cruiser / capital s | Conquer min | Ships killed (veteran + levy) | Launches while besieged | XP taking it | XP/min taking | Farm XP/min | Farm cr/min | Farm busy | First launch s | Full rebuild min | Launches after production falls | Capitals with He-3 cut | Income when held cr/min |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    md.push(`| ${r.world} | ${SHIP_TYPES.slice().reverse().map((x) => f1(r.ttk[x])).join(' / ')} | ${r.conquer.controlled ? f1(r.conquer.minutes) : '—'} | ${r.conquer.tally.vets} + ${r.conquer.tally.levies} | ${r.conquer.tally.launches} | ${r.conquer.tally.xp} | ${f1(r.conquer.xpPerMin)} | ${f1(r.farm.xpPerMin)} | ${f1(r.farm.creditsPerMin)} | ${pct(r.farm.busyShare)} | ${f1(r.rebuild.window)} | ${f1(r.rebuild.full / 60)} | ${r.after} | ${r.helium ?? 'n/a'} | ${f1(r.income)} |`);
  }
  md.push('', `One-time XP for the least rewarding home (six worlds taken whole, original forces included): **${reach}**; level ${MAX_LEVEL} needs ${xpForLevel(MAX_LEVEL)}.`, '');
  md.push('Hit points the pilot faces, for reference: ' + targets.map((n) => `${n} ${SHIP_TYPES.map((x) => craftStats(n, x).hp).join('/')}`).join('; ') + '.', '');
  md.push('**Bands**: conquer ' + `${B.conquerMin[0]}–${B.conquerMin[1]} min; farming busy ≤ ${pct(B.busyMax)} (kill capacity ≥ 2× production); first launch ≥ ${B.windowMin} s; full rebuild ${B.rebuildMin[0]}–${B.rebuildMin[1]} min; 0 launches after production falls; 0 capitals with helium-3 cut; farm XP/min ≤ ${B.farmVsConquer} × taking; held income ≥ ${B.incomeVsFarm} × farm credits; one-time XP ≥ ${xpForLevel(MAX_LEVEL)}.`, '');
  md.push('**Flags**', '');
  if (!flags.length) md.push('None.');
  for (const f of flags) md.push(`- [${f.band}] ${f.detail}`);
  return { rows, reach, flags, markdown: md.join('\n') };
}

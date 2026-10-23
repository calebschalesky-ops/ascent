/**
 * A station's civic systems: its development tier (what is fitted on its hardpoints), its power budget, its market,
 * its temple, and what all of it gives the world's four meters. Pure; FIRST PASS numbers, all here.
 *
 * The meters are the planets thread's (src/lib/planets/meters.ts on claude/planets-cd91e2): government, military,
 * religion and economy, 0..100, 50 ordinary. A station is one more contributor to its world's meter targets, like a
 * conquest site with buildings in it; `MeterDelta` has the same shape as planets' `Partial<Meters>`.
 */
import type { Hardpoint, HardpointKind } from './mounts';
import { HARDPOINT_KINDS } from './mounts';
import type { Boon, Resource, StationProfile } from './profiles';

export type MeterId = 'government' | 'military' | 'religion' | 'economy';
export const METER_IDS: MeterId[] = ['government', 'military', 'religion', 'economy'];
export type MeterDelta = Partial<Record<MeterId, number>>;

// ---------- development: tiers ----------
export type Tier = 1 | 2 | 3;
export interface TierSpec {
  name: string;
  /** Share of each kind's hardpoints fitted at this tier (at least one when the share is above 0 and the kind exists). */
  fit: Record<HardpointKind, number>;
  mk: 1 | 2 | 3; // arsenal's shield tier (makeDefence's `tier`) and the guns' grade
  hull: number; // each section's structure
  housed: { fighter: number; cruiser: number; capital: number }; // what the hangar and the mooring hold
}
const fitAll = (v: number) => Object.fromEntries(HARDPOINT_KINDS.map((k) => [k, v])) as Record<HardpointKind, number>;
export const TIERS: Record<Tier, TierSpec> = {
  1: { name: 'Outpost', fit: { ...fitAll(1), turret: 0.5, pointDefence: 0.5, minelayer: 0, mooring: 0, reactor: 0.5 }, mk: 1, hull: 2000, housed: { fighter: 4, cruiser: 1, capital: 0 } },
  2: { name: 'Station', fit: { ...fitAll(1), turret: 0.75, pointDefence: 0.75, minelayer: 0 }, mk: 2, hull: 3000, housed: { fighter: 8, cruiser: 2, capital: 1 } },
  3: { name: 'Citadel', fit: fitAll(1), mk: 3, hull: 4500, housed: { fighter: 12, cruiser: 3, capital: 1 } },
};

/** The hardpoints fitted at a tier: the first share of each kind, in the order god-armour lists them. */
export function fitted(mounts: Hardpoint[], tier: Tier, profile: Pick<StationProfile, 'mines'>): Hardpoint[] {
  const out: Hardpoint[] = [];
  for (const kind of HARDPOINT_KINDS) {
    const all = mounts.filter((m) => m.kind === kind);
    let share = TIERS[tier].fit[kind];
    if (kind === 'minelayer' && profile.mines) share = 1;
    const n = share <= 0 || !all.length ? 0 : Math.max(1, Math.ceil(all.length * share - 1e-9));
    out.push(...all.slice(0, n));
  }
  return out;
}

/** The munition a fitted turret carries: the station's turret gun, and at tier 3 every other turret the heavy gun. */
export function gunOf(profile: StationProfile, m: Hardpoint, index: number, tier: Tier) {
  if (m.kind === 'pointDefence') return profile.guns.pointDefence;
  return tier === 3 && index % 2 === 1 ? profile.guns.heavy : profile.guns.turret;
}

/**
 * Development: points accrue while the station is calm and powered, at a rate set by the world's economy, and a tier
 * is bought when the points and the resources are there. A player-held station can buy its next tier with credits.
 */
export const DEVELOPMENT = {
  rate: 1, // points a second at economy 50, full power
  points: { 2: 600, 3: 1500 } as Record<2 | 3, number>,
  cost: { 2: { metals: 20, power: 10 }, 3: { metals: 40, power: 20, helium3: 6 } } as Record<2 | 3, Partial<Record<Resource, number>>>,
  credits: { 2: 1200, 3: 3000 } as Record<2 | 3, number>,
};
/** Development points gained in `dt` seconds. */
export function develop(dt: number, economy: number, power: number, calm: boolean, boon: Boon | null): number {
  if (!calm || power < 0.5) return 0;
  return dt * DEVELOPMENT.rate * (0.5 + economy / 100) * power * (boon === 'treasury' ? 1.25 : 1);
}
/** True when the stock covers the next tier's resources. */
export function canAfford(tier: Tier, stock: Partial<Record<Resource, number>>): boolean {
  if (tier >= 3) return false;
  const cost = DEVELOPMENT.cost[(tier + 1) as 2 | 3];
  return Object.entries(cost).every(([r, n]) => (stock[r as Resource] ?? 0) >= (n ?? 0));
}

// ---------- power ----------
/**
 * Power each working hardpoint of a kind draws. A reactor's output is a share of what everything fitted would draw at
 * once (× `margin` at richness 1), so the budget holds however many hardpoints god-armour puts on a structure.
 */
export const POWER = {
  margin: 1.1,
  draw: { turret: 4, pointDefence: 2, shieldEmitter: 6, minelayer: 1, hangar: 3, berth: 1, mooring: 2, drydock: 4, market: 2, temple: 1, reactor: 0, sensor: 1 } as Record<HardpointKind, number>,
  /** Served first to last when supply is short: in a fight the guns come first, in peace the yard and the market. */
  priority: ['shieldEmitter', 'pointDefence', 'hangar', 'sensor', 'turret', 'mooring', 'minelayer', 'drydock', 'berth', 'temple', 'market'] as HardpointKind[],
  peace: ['shieldEmitter', 'sensor', 'temple', 'market', 'berth', 'drydock', 'hangar', 'mooring', 'pointDefence', 'turret', 'minelayer'] as HardpointKind[],
  /** Guns on standby (not fighting) draw this share of their power. */
  idle: 0.25,
  guns: ['turret', 'pointDefence', 'minelayer'] as HardpointKind[],
  /** Switched off while fighting: the market closes and the yard stops work. */
  civic: ['market', 'drydock', 'berth'] as HardpointKind[],
};

/** What everything fitted would draw at once, in a fight. */
export const fullDraw = (fit: Hardpoint[]) => fit.reduce((a, m) => a + POWER.draw[m.kind], 0);

/**
 * The power budget: supply from the working reactors (each a share of `fullDraw(fit)` × margin × the world's power
 * richness), served in priority order. A gun's share is of what it wants now (a quarter at standby), so a share of 1
 * in peace means ready, not firing. Returns each kind's share of what it wants (0..1) and the totals.
 */
export function powerBudget(working: Hardpoint[], richness: number, fighting: boolean, fit: Hardpoint[] = working): { share: Record<HardpointKind, number>; supply: number; demand: number } {
  const count = (k: HardpointKind) => working.filter((m) => m.kind === k).length;
  const reactors = fit.filter((m) => m.kind === 'reactor').length;
  const supply = reactors ? (count('reactor') / reactors) * fullDraw(fit) * POWER.margin * richness : 0;
  let left = supply;
  let demand = 0;
  const share = fitAll(0);
  share.reactor = 1;
  for (const k of fighting ? POWER.priority : POWER.peace) {
    const want = fighting && POWER.civic.includes(k) ? 0 : count(k) * POWER.draw[k] * (!fighting && POWER.guns.includes(k) ? POWER.idle : 1);
    demand += want;
    if (want <= 0) { share[k] = fighting && POWER.civic.includes(k) ? 0 : 1; continue; }
    const got = Math.min(want, left);
    left -= got;
    share[k] = got / want;
  }
  return { share, supply, demand };
}

// ---------- market ----------
/** Credits a unit, at economy 50. FIRST PASS. */
export const BASE_PRICE: Record<Resource, number> = { metals: 10, ice: 6, hydrocarbons: 8, power: 5, helium3: 30, chemicals: 12, food: 6 };
export const MARKET = {
  buyBack: 0.7, // the station buys from you at this share of its selling price
  local: 0.8, // its own resource sells at this share
  income: 20, // credits a minute to its world while the market works, at economy 50
};
/** What the station sells a unit for (or null: the market is closed while it fights, or has no power). */
export function price(r: Resource, p: Pick<StationProfile, 'market'>, economy: number, open: boolean, boon: Boon | null): { sell: number; buy: number } | null {
  if (!open) return null;
  const k = (1.25 - economy / 200) * (r === p.market ? MARKET.local : 1) * (boon === 'charm' ? 0.9 : 1);
  const sell = Math.round(BASE_PRICE[r] * k * 100) / 100;
  return { sell, buy: Math.round(sell * MARKET.buyBack * 100) / 100 };
}
/** Credits a minute the market pays its world. */
export const marketIncome = (economy: number, share: number, boon: Boon | null) => MARKET.income * (0.5 + economy / 100) * share * (boon === 'harvest' ? 1.2 : 1);

// ---------- meters ----------
/** What one working, powered hardpoint of each kind gives its world's meter targets. */
export const MOUNT_EFFECT: Record<HardpointKind, MeterDelta> = {
  turret: { military: 0.5 }, pointDefence: { military: 0.25 }, shieldEmitter: { military: 0.5 }, minelayer: { military: 0.25 },
  hangar: { military: 1 }, berth: { economy: 0.5 }, mooring: { military: 2, government: 1 }, drydock: { military: 1, economy: 0.5 },
  market: { economy: 4 }, temple: { religion: 6, government: 1 }, reactor: { economy: 1 }, sensor: { military: 0.5 },
};
/** A station gives each meter at most this much, about one city with its buildings (planets' building effects). */
export const METER_CAP = 20;
/** The moment a station falls (its sections all suppressed, or taken): shocks to its world's meters. */
export const FALL_SHOCK: MeterDelta = { military: -10, government: -5, economy: -3 };

/** The station's contribution to its world's meter targets: each working mount × its power share, capped. */
export function stationMeters(working: Hardpoint[], share: Record<HardpointKind, number>): Record<MeterId, number> {
  const out = { government: 0, military: 0, religion: 0, economy: 0 };
  for (const m of working) for (const k of METER_IDS) out[k] += (MOUNT_EFFECT[m.kind][k] ?? 0) * share[m.kind];
  for (const k of METER_IDS) out[k] = Math.min(METER_CAP, out[k]);
  return out;
}

/** The god's boon holds only while a temple works. */
export const activeBoon = (p: Pick<StationProfile, 'boon'>, templeWorks: boolean): Boon | null => (templeWorks ? p.boon : null);

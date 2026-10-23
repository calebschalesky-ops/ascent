/**
 * The route simulator: plays a whole game at the level of decisions (fight this patrol, take this site, research,
 * buy, sign a pact, answer a threat) and logs every reward, rung and threat with its minute. It is not a physics
 * simulation: fights cost the balance simulator's times to kill (`ttk.ts`) and sieges cost conquest's measured
 * conquest times (`tables.ts` WORLDS), stretched by `ASSUME.enemyFire` because enemies now shoot back.
 *
 * Its job is to check the plan's pacing (`rules.ts`), not to predict a real player to the minute.
 */
import type { NationId } from '../nations';
import type { ShipType } from '../shipTypes';
import { FORCE, SHIP_TYPES } from '../shipTypes';
import type { Rng } from '../balance/rng';
import { rng } from '../balance/rng';
import type { SiteKind } from './tables';
import {
  ASSUME, CONTROL_XP, CONVOY, SEIZED, DIRECTOR, HELD_ECONOMY, INFLUENCE, LEVY_PAY, MAX_LEVEL, PACT_INCOME, RANKS, SALVAGE, SHOPPING,
  HOLDINGS, SITE, SITE_ORDER, STANDING, SUPPLIERS, TECH, VASSAL_TRIBUTE, WORKS, WORLDS, XP_CURVE, levelOf, renownOf, sitesOf,
} from './tables';
import type { TtkTable } from './ttk';
import { killPay } from './ttk';
import type { DirectorState, Threat } from './director';
import { ANNOUNCEMENT, breakReckoning, newDirector, nextThreat, onPatrolBroken, onTaken, resolveThreat } from './director';

export type Strategy = 'military' | 'economic' | 'boarding';
export type Activity = 'fight' | 'siege' | 'diplomacy' | 'economy' | 'defence';
export interface Route {
  id: string;
  name: string;
  home: NationId;
  strategy: Strategy;
  /** The worlds in the order this player goes after them. */
  order: NationId[];
  /** Economic route: worlds courted with trade pacts (and later alliances) instead of fought. */
  pacts?: NationId[];
}

export type EvKind = 'kill' | 'salvage' | 'site' | 'turned' | 'level' | 'tech' | 'rank' | 'standing' | 'purchase' | 'pact' | 'threat' | 'note';
export interface Ev { t: number; kind: EvKind; label: string; rung: boolean; meaningful: boolean; activity?: Activity; end?: number; threat?: Threat['kind'] }
export interface Sample {
  t: number; level: number; xp: number; credits: number; earned: number; influence: number; tech: number; rank: number;
  standing: number; turned: number; power: number; dominance: number; income: number; nextCost: number;
}
export interface Timeline {
  route: Route; events: Ev[]; samples: Sample[]; end: number; won: boolean; levelTenAt: number | null;
  xpBySource: Record<string, number>; pay: ReturnType<typeof killPay>;
}

type Status = 'hostile' | 'pact' | 'allied' | 'vassal' | 'controlled';
interface W {
  id: NationId; status: Status; veterans: number; levies: number; rebuild: number; taken: number; sites: SiteKind[];
  patrolBroken: boolean; pactSince: number; heldSince: number; unrest: number; built: number; blockade: number; demanded: boolean;
}

const ARMADA = [
  { label: 'Armada cruiser', credits: 600, cp: 3, power: 0.05 },
  { label: 'Armada destroyer', credits: 1200, cp: 5, power: 0.08 },
  { label: 'Armada capital ship', credits: 4000, cp: 10, power: 0.15 },
];
/** What a world's yards turn out, in order: mostly fighters (the foundry line), a cruiser now and then. */
/** Share of conquest's measured conquest time that is the sieges themselves (the rest is the patrol and levies, charged per ship). */
const SIEGE_SHARE = 1;
const LEVY_MIX: ShipType[] = ['fighter', 'fighter', 'cruiser', 'fighter', 'fighter', 'cruiser', 'capital'];
/** What an alliance pays: about what a vassal's surrender pays on a mid-sized world. */
const ALLIANCE_XP = 1500;
const COMMAND_CAP = [0, 0, 0, 0, 14, 38, 100];
const CAP_PER_TURNED = 15; // Admiral: command points for every world turned // by rank (fleet-command); the starting fleet of each rank is in its power
const STANDING_AT = [0, 50, 150, 350, 650]; // lifetime influence for standing 1–4; 5 is every world turned
const THREAT_FORCE: Record<Threat['kind'], Partial<Record<ShipType, number>>> = {
  counter: { cruiser: 1, fighter: 3 },
  raid: { cruiser: 2, fighter: 2 },
  reckoningRaid: { capital: 1, cruiser: 2, fighter: 4 },
  nemesis: { capital: 1, fighter: 2 },
  rebellion: { fighter: 4 },
  lastAlliance: { capital: 1, cruiser: 2, fighter: 4 }, // per wave
  reckoning: {}, marchWarning: {}, feudRaid: { fighter: 2 },
};

class Game {
  t = 0; xp = 0; credits = 100; earned = 0; influence = 0; lifetimeInfluence = 0;
  tech = 1; research: { tier: number; left: number } | null = null; rank = 0; standing = 0; bought = 0; boughtPower = 0;
  levyCount = 0; works = 0; armada = 0; armadaPower = 0; captured = 0; armadaBroken = false; levelTenAt: number | null = null;
  events: Ev[] = []; samples: Sample[] = []; xpBySource: Record<string, number> = {};
  worlds: Record<string, W> = {};
  d: DirectorState = newDirector();
  r: Rng;
  pay: ReturnType<typeof killPay>;
  route: Route;
  ttk: TtkTable;

  constructor(route: Route, ttk: TtkTable, seed: number) {
    this.route = route; this.ttk = ttk; this.r = rng(seed); this.pay = killPay(ttk);
    this.influence = route.home === 'earth' ? INFLUENCE.start : 20;
    for (const id of route.order) {
      const sites = SITE_ORDER.flatMap((k) => Array<SiteKind>(sitesOf(id)[k]).fill(k));
      this.worlds[id] = { id, status: 'hostile', veterans: 7, levies: 0, rebuild: 0, taken: 0, sites, patrolBroken: false, pactSince: 0, heldSince: 0, unrest: 0, built: 0, blockade: -1, demanded: false };
    }
  }

  // --- state readers ---
  get level() { return levelOf(this.xp); }
  get turnedList() { return Object.values(this.worlds).filter((w) => w.status === 'allied' || w.status === 'vassal' || w.status === 'controlled'); }
  get turned() { return this.turnedList.length; }
  get helium() {
    const home = WORLDS[this.route.home].heliumWorks;
    return home || Object.values(this.worlds).some((w) => w.status !== 'hostile' && WORLDS[w.id].heliumWorks)
      || Object.values(this.worlds).some((w) => w.status === 'hostile' && WORLDS[w.id].heliumWorks && w.sites.slice(0, w.taken).includes('works'));
  }
  count(st: Status) { return Object.values(this.worlds).filter((w) => w.status === st).length; }
  get anySite() { return Object.values(this.worlds).some((w) => w.taken > 0 || w.status === 'controlled'); }
  get power() {
    return (1 + 0.04 * (this.level - 1)) * (1 + 0.08 * (this.tech - 1)) * (1 + this.boughtPower + WORKS.slice(0, this.works).reduce((a, w) => a + w.power, 0)) * RANKS[this.rank].power
      * (1 + Math.min(ASSUME.armadaCap, this.armadaPower)) * (1 + 0.03 * Math.min(20, this.captured))
      * (1 + INFLUENCE.allyPower * this.count('allied') + INFLUENCE.vassalPower * this.count('vassal'));
  }
  hardness(w?: W) {
    const mob = (1 + 0.2 * this.turned) * (1 + ASSUME.enemyTech * this.turned);
    const coal = this.d.reckoning === 'standing' ? DIRECTOR.reckoningMobilise : 1;
    const spent = this.armadaBroken ? 0.8 : 1;
    const world = w ? WORLDS[w.id].conquerMin / 14 : 1;
    return mob * coal * spent * world;
  }
  target(): W | undefined { return this.route.order.map((id) => this.worlds[id]).find((w) => w.status === 'hostile' && !(this.route.pacts ?? []).includes(w.id)); }
  dominance() { const w = this.target(); return w ? this.power / this.hardness(w) : 0; }
  income() {
    let inc = 15 + 10 * this.standing; // the home budget (a proposal: conquest pays nothing at home)
    for (const w of Object.values(this.worlds)) {
      const full = w.sites.reduce((s, k) => s + SITE[k].income, 0);
      const extra = HOLDINGS.slice(0, w.built).reduce((a, h) => a + h.income, 0);
      if (w.status === 'controlled') inc += (full * HELD_ECONOMY + extra) * (1 - 0.5 * Math.max(0, w.unrest - 0.3));
      else if (w.status === 'vassal') inc += full * HELD_ECONOMY * VASSAL_TRIBUTE + extra;
      else if (w.status === 'pact' || w.status === 'allied') inc += PACT_INCOME;
      else inc += w.sites.slice(0, w.taken).reduce((s, k) => s + SITE[k].income, 0) * HELD_ECONOMY;
    }
    return inc;
  }
  influenceRate() {
    let ip = 0;
    for (const w of Object.values(this.worlds)) {
      if (w.status === 'pact' || w.status === 'allied') ip += INFLUENCE.perPactMinute;
      if (w.status === 'vassal') ip += INFLUENCE.perVassalMinute;
      const held = w.status === 'controlled' ? w.sites.length : w.status === 'hostile' ? w.taken : 0;
      ip += held * INFLUENCE.perSiteHeld;
    }
    return ip;
  }

  // --- logging and rewards ---
  log(kind: EvKind, label: string, o: Partial<Ev> = {}) {
    const rung = ['level', 'tech', 'rank', 'standing', 'turned'].includes(kind) || !!o.rung;
    const meaningful = rung || ['site', 'purchase', 'pact'].includes(kind) || (kind === 'salvage' && label !== 'crate') || !!o.meaningful;
    this.events.push({ t: this.t, kind, label, rung, meaningful, ...o });
  }
  gainInfluence(ip: number) { this.influence += ip; this.lifetimeInfluence += ip; this.checkStanding(); }
  gain(xp: number, credits: number, source: string) {
    const before = this.level;
    const renown = renownOf(this.xp);
    this.xp += xp; this.credits += credits; this.earned += credits;
    this.xpBySource[source] = (this.xpBySource[source] ?? 0) + xp;
    for (let l = before + 1; l <= this.level; l++) {
      this.log('level', `Level ${l}`);
      if (l === MAX_LEVEL) this.levelTenAt = this.t;
    }
    for (let r = renown + 1; r <= renownOf(this.xp); r++) this.log('level', `Renown ${r}: +5 command points and a medal`);
  }
  checkStanding() {
    let s = STANDING_AT.filter((x) => this.lifetimeInfluence >= x).length - 1;
    if (this.turned >= this.route.order.length) s = 5;
    while (this.standing < s) { this.standing++; this.log('standing', `Standing: ${STANDING[this.standing]}`); }
  }
  kill(w: NationId, type: ShipType, share: number, activity: Activity, source: string) {
    const p = this.pay[type];
    this.gain(Math.round(p.xp * share), Math.round(p.credits * share), source);
    // salvage: the variable layer on every kill
    const x = this.r();
    let acc = 0;
    for (const s of SALVAGE) {
      acc += s.chance;
      if (x < acc) {
        const c = Math.round(s.credits[0] + this.r() * (s.credits[1] - s.credits[0]));
        this.gain(0, c, 'salvage');
        this.log('salvage', s.kind, { activity });
        break;
      }
    }
    void w;
  }

  // --- time ---
  advance(dt: number) {
    const steps = Math.max(1, Math.ceil(dt));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.t += h;
      const inc = this.income() * h;
      this.credits += inc; this.earned += inc;
      this.gainInfluence(this.influenceRate() * h);
      for (const w of Object.values(this.worlds)) {
        if (w.status === 'controlled') w.unrest = Math.max(0, w.unrest - 0.004 * h);
        if (w.status !== 'hostile') continue;
        const production = !(w.sites.slice(0, w.taken).includes('foundry') && w.sites.slice(0, w.taken).includes('shipyard'));
        if (production && w.veterans + w.levies < 7) {
          w.rebuild += h * (7 / 13) * (1 + 0.2 * this.turned) * (this.d.reckoning === 'standing' ? DIRECTOR.reckoningMobilise : 1);
          while (w.rebuild >= 1 && w.veterans + w.levies < 7) { w.rebuild -= 1; w.levies++; }
        }
      }
      if (this.research) {
        this.research.left -= h;
        if (this.research.left <= 0) {
          this.tech = this.research.tier; this.research = null;
          this.log('tech', `Tech ${this.tech}: ${TECH[this.tech - 1].gives}`);
        }
      }
      this.sample();
    }
  }
  sample() {
    this.samples.push({
      t: this.t, level: this.level, xp: this.xp, credits: this.credits, earned: this.earned, influence: this.influence,
      tech: this.tech, rank: this.rank, standing: this.standing, turned: this.turned, power: this.power,
      dominance: this.dominance(), income: this.income(), nextCost: this.nextCost(),
    });
  }

  // --- spending ---
  rankReady(next = RANKS[this.rank + 1]) {
    return !!next && this.level >= next.level && this.tech >= next.tech && this.turned >= next.turned
      && (!next.helium || this.helium) && (!next.site || this.anySite);
  }
  techAllowed(tier: number) {
    const t = TECH[tier - 1];
    if (!t) return false;
    if (t.needs === 'helium' && !this.helium) return false;
    if (t.needs === 'twoWorlds' && this.turned < 2) return false;
    return true;
  }
  nextShop(orResearching = false) {
    const s = SHOPPING[this.bought];
    const open = this.tech + (orResearching && this.research ? 1 : 0);
    return s && s.tier <= open ? s : undefined;
  }
  armadaNext() {
    if (this.rank < 4) return undefined;
    const a = ARMADA[this.armada % 3 === 2 && this.rank >= 5 ? 2 : this.armada % 2];
    const used = this.armadaUsed();
    return used + a.cp <= COMMAND_CAP[this.rank] + (this.rank === 6 ? CAP_PER_TURNED * this.turned : 0) + (this.rank >= 4 ? 5 * renownOf(this.xp) : 0) ? a : undefined;
  }
  armadaCp = 0;
  armadaUsed() { return this.armadaCp; }
  /** The turned world with the most unrest and a project left (vassals and allies too: building there is goodwill). */
  nextHolding(): W | undefined {
    return this.turnedList.filter((w) => w.built < HOLDINGS.length).sort((a, b) => b.unrest - a.unrest || a.built - b.built)[0];
  }
  /** What the player is saving for next (the cheapest thing they can work toward now): the purchase-horizon rule. */
  nextCost(): number {
    const costs: number[] = [];
    const nr = RANKS[this.rank + 1];
    if (nr && nr.credits > 0) costs.push(nr.credits);
    if (!this.research && this.techAllowed(this.tech + 1)) costs.push(TECH[this.tech].credits);
    const s = this.nextShop(true); if (s) costs.push(s.credits);
    const a = this.armadaNext(); if (a) costs.push(a.credits);
    if (WORKS[this.works]) costs.push(WORKS[this.works].credits);
    const h = this.nextHolding(); if (h) costs.push(HOLDINGS[h.built].credits);
    return costs.length ? Math.min(...costs) : Infinity;
  }
  spend() {
    for (let guard = 0; guard < 20; guard++) {
      const nr = RANKS[this.rank + 1];
      if (nr && this.rankReady(nr) && this.credits >= nr.credits) {
        this.credits -= nr.credits;
        if (nr.rank === 4) { this.log('note', 'Mission: Take command (escort a capital ship home)', { activity: 'fight' }); this.advance(6); }
        this.rank++;
        this.log('rank', `Rank: ${nr.name}. ${nr.gives}`);
        continue;
      }
      // Saving for a rank whose other conditions are met comes first.
      if (nr && this.rankReady(nr) && nr.credits > this.credits) return;
      if (!this.research && this.techAllowed(this.tech + 1) && this.credits >= TECH[this.tech].credits) {
        this.credits -= TECH[this.tech].credits;
        this.research = { tier: this.tech + 1, left: TECH[this.tech].minutes };
        this.log('note', `Research begins: tech ${this.tech + 1}`, { activity: 'economy' });
        continue;
      }
      const s = this.nextShop();
      if (s && this.credits >= s.credits) {
        this.credits -= s.credits; this.bought++; this.boughtPower += s.power;
        this.log('purchase', s.label, { activity: 'economy' });
        continue;
      }
      const wk = WORKS[this.works];
      if (wk && this.credits >= wk.credits && (!this.armadaNext() || this.works <= this.armada)) {
        this.credits -= wk.credits; this.works++;
        this.log('purchase', `Earth's Works ${this.works}: ${wk.label}`, { activity: 'economy', rung: true });
        continue;
      }
      const hw = this.nextHolding();
      if (hw && this.credits >= HOLDINGS[hw.built].credits) {
        const hp = HOLDINGS[hw.built];
        this.credits -= hp.credits; hw.built++; hw.unrest = Math.max(0, hw.unrest - hp.unrest);
        this.log('purchase', `${hw.id}: ${hp.label}`, { activity: 'economy' });
        continue;
      }
      const a = this.armadaNext();
      if (a && this.credits >= a.credits + 300) {
        this.credits -= a.credits; this.armada++; this.armadaCp += a.cp; this.armadaPower += a.power;
        this.log('purchase', a.label, { activity: 'economy' });
        continue;
      }
      return;
    }
  }

  // --- the fights and sieges ---
  shipMinutes(w: NationId, type: ShipType) { return ((this.ttk[w][type] + ASSUME.searchSeconds) / 60) * ASSUME.enemyFire; }
  avgShip(w: NationId) {
    const n = SHIP_TYPES.reduce((s, t) => s + FORCE[t], 0);
    return {
      minutes: SHIP_TYPES.reduce((s, t) => s + FORCE[t] * this.shipMinutes(w, t), 0) / n,
      types: SHIP_TYPES.flatMap((t) => Array<ShipType>(FORCE[t]).fill(t)),
    };
  }
  /** Break a world's patrol one ship per step, so the director can cut in. Veterans pay in full, levies half. The
   *  boarding route captures the big hulls from Commodore up. */
  fightOne(w: W) {
    const vt = SHIP_TYPES.flatMap((t) => Array<ShipType>(FORCE[t]).fill(t));
    let type: ShipType; let share = 1;
    if (w.veterans > 0) { type = vt[7 - w.veterans]; w.veterans--; } else { type = LEVY_MIX[this.levyCount++ % LEVY_MIX.length]; w.levies--; share = LEVY_PAY; }
    const board = this.route.strategy === 'boarding' && this.rank >= 5 && type !== 'fighter' && share === 1;
    this.advance(this.shipMinutes(w.id, type) * this.hardness(w) / this.power);
    if (board) {
      this.advance(1.5); // the drill boarders' fight inside the hull
      this.captured++;
      this.kill(w.id, type, share * 1.5, 'fight', 'boarding');
      this.log('note', `Boarded and took a ${w.id} ${type}`, { activity: 'fight', meaningful: type === 'capital' });
    } else this.kill(w.id, type, share, 'fight', 'kills');
    if (w.veterans === 0 && !w.patrolBroken) { // the veteran patrol is broken; its commander escapes to become the rival
      this.log('kill', `${w.id} patrol broken`, { activity: 'fight' });
      w.patrolBroken = true; onPatrolBroken(this.d, w.id, this.t);
    }
  }
  /** The first hour: one patrol ship at a time, before the player can siege. */
  skirmish(w: W) {
    if (w.veterans + w.levies === 0) { this.advance(1); return; }
    const vt = SHIP_TYPES.flatMap((t) => Array<ShipType>(FORCE[t]).fill(t)).reverse(); // fighters, cruisers, then the capital
    let type: ShipType; let share = 1;
    if (w.veterans > 0) { type = vt[7 - w.veterans]; w.veterans--; } else { type = LEVY_MIX[this.levyCount++ % LEVY_MIX.length]; w.levies--; share = LEVY_PAY; }
    this.advance(ASSUME.skirmish + this.shipMinutes(w.id, type) * this.hardness(w) / this.power);
    this.kill(w.id, type, share, 'fight', 'kills');
    if (w.veterans === 0 && !w.patrolBroken) { w.patrolBroken = true; onPatrolBroken(this.d, w.id, this.t); this.log('kill', `${w.id} patrol broken`, { activity: 'fight' }); }
  }
  takeSite(w: W) {
    const kind = w.sites[w.taken];
    const infantry = this.rank >= 3 && (kind === 'fort' || kind === 'city' || kind === 'capital') ? 0.7 : 1;
    const per = (SIEGE_SHARE * WORLDS[w.id].conquerMin) / w.sites.length;
    this.advance(per * ASSUME.enemyFire * infantry * this.hardness(w) / this.power);
    w.taken++;
    this.gain(SITE[kind].xp, SITE[kind].credits, 'sites');
    this.gainInfluence(3);
    this.log('site', `${w.id}: ${kind} taken`, { activity: 'siege' });
    const done = w.sites.slice(0, w.taken);
    if (kind === 'section' && w.sites[w.taken] !== 'section') {
      this.log('site', `${w.id}: its god-armour station is broken (every section taken)`, { activity: 'siege', rung: true });
    }
    if ((kind === 'shipyard' || kind === 'foundry') && done.includes('shipyard') && done.includes('foundry')) {
      this.log('site', `${w.id}: the yards fall silent (production stopped)`, { activity: 'siege', rung: true });
    }
  }
  turn(w: W, status: Status, how: string) {
    w.status = status; w.heldSince = this.t;
    if (status === 'controlled') w.unrest = 0.3 + 0.3 * WORLDS[w.id].resolve;
    this.gain(CONTROL_XP, 0, 'turned');
    // Every route pays the same for a world: a vassal's surrender pays its untaken sites' XP at 75%, an alliance the
    // mean of that, so a player who never storms a capital still climbs the ladder (MOTIVATION.md 5).
    if (status === 'vassal') this.gain(Math.round(0.75 * w.sites.slice(w.taken).reduce((x, k) => x + SITE[k].xp, 0)), 0, 'diplomacy');
    if (status === 'allied') this.gain(ALLIANCE_XP, 0, 'diplomacy');
    this.gainInfluence(INFLUENCE.perTurned);
    this.log('turned', `${w.id} ${how} (${this.turned} of ${this.route.order.length})`);
    onTaken(this.d, w.id, this.t, this.turned + 1); // held: the turned worlds plus your capital
    this.checkStanding();
  }

  // --- the director's threats ---
  handleThreat(th: Threat) {
    this.log('threat', th.label, { threat: th.kind, activity: ANNOUNCEMENT.includes(th.kind) ? undefined : 'defence', meaningful: true });
    const ev = this.events[this.events.length - 1];
    if (th.kind === 'rebellion' && this.route.strategy === 'economic' && this.influence >= INFLUENCE.pacify) {
      this.influence -= INFLUENCE.pacify;
      this.advance(ASSUME.diplomacy);
      this.worlds[th.world!].unrest -= 0.25;
      this.log('note', `Pacified ${th.world}: honoured its temple`, { activity: 'diplomacy', meaningful: true });
    } else if (!ANNOUNCEMENT.includes(th.kind)) {
      const waves = th.kind === 'lastAlliance' ? ASSUME.lastAllianceWaves : 1;
      const force = THREAT_FORCE[th.kind];
      const nemesisDuel = th.kind === 'nemesis' && this.d.nemesis && this.d.nemesis.escapes >= DIRECTOR.nemesisEscapes;
      for (let wave = 1; wave <= waves; wave++) {
        this.advance(ASSUME.threatMinutes[th.kind]);
        for (const t of SHIP_TYPES) for (let i = 0; i < (force[t] ?? 0); i++) {
          const isNemesisShip = th.kind === 'nemesis' && t === 'capital';
          if (isNemesisShip && !nemesisDuel) continue; // he escapes
          this.kill(th.world ?? this.route.home, t, isNemesisShip ? 2 : th.kind === 'lastAlliance' ? 1 : LEVY_PAY, 'defence', 'defence');
        }
        // Each wave is a segment of a visible three-step bar (survive the Armada), so each is a rung.
        if (waves > 1) this.log('note', `Armada wave ${wave} of ${waves} broken`, { activity: 'defence', rung: true });
      }
      if (th.kind === 'rebellion') this.worlds[th.world!].unrest -= 0.25;
      if (th.kind === 'nemesis') {
        if (nemesisDuel) {
          this.gain(0, 500, 'salvage'); this.gainInfluence(INFLUENCE.perNemesis);
          this.log('salvage', 'relic: the rival\'s own module', { activity: 'defence' });
          this.log('note', 'The rival is defeated (his successor will remember it)', { activity: 'defence', rung: true });
        }
        else this.gainInfluence(10);
      }
      if (th.kind === 'lastAlliance') {
        this.gain(800, 1500, 'defence'); this.armadaBroken = true; this.gainInfluence(60);
        this.log('note', 'The Grand Armada is broken: the free worlds\' fleets are spent (their yards build 20% slower from now)', { activity: 'defence', rung: true });
      }
      else this.gainInfluence(INFLUENCE.perThreatRepelled);
    }
    resolveThreat(this.d, th, this.t);
    ev.end = this.t;
    if (!ANNOUNCEMENT.includes(th.kind)) this.log('note', `Repelled: ${th.label}`, { activity: 'defence', meaningful: true });
    if (th.kind === 'reckoning' && this.route.strategy === 'economic' && this.influence >= INFLUENCE.breakReckoning) {
      this.influence -= INFLUENCE.breakReckoning;
      this.advance(ASSUME.diplomacy);
      breakReckoning(this.d);
      this.log('note', 'Reckoning broken: one member bought off', { activity: 'diplomacy', meaningful: true });
    }
  }
  directorCtx() {
    const unrest: Partial<Record<NationId, number>> = {}; const heldSince: Partial<Record<NationId, number>> = {};
    for (const w of Object.values(this.worlds)) if (w.status === 'controlled') { unrest[w.id] = w.unrest; heldSince[w.id] = w.heldSince; }
    const lastRung = [...this.events].reverse().find((e) => e.rung)?.t ?? 0;
    return { t: this.t, held: this.turned + 1, broken: 0, dominance: this.dominance(), rank: this.rank, unrest, heldSince, sinceRung: this.t - lastRung };
  }

  // --- the strategies ---
  diplomacy(): boolean {
    if (this.route.strategy !== 'economic') return false;
    for (const id of this.route.pacts ?? []) {
      const w = this.worlds[id];
      if (w.status === 'hostile' && this.influence >= INFLUENCE.pact && this.level >= 2) {
        this.influence -= INFLUENCE.pact; this.advance(ASSUME.travel + ASSUME.diplomacy);
        w.status = 'pact'; w.pactSince = this.t;
        this.gain(100, 0, 'diplomacy');
        this.log('pact', `Trade pact with ${id}`, { activity: 'diplomacy', rung: true });
        return true;
      }
      if (w.status === 'pact' && this.t - w.pactSince >= INFLUENCE.allianceAfter && this.influence >= INFLUENCE.alliance) {
        this.influence -= INFLUENCE.alliance; this.advance(ASSUME.diplomacy);
        this.turn(w, 'allied', 'allied (pact became alliance)');
        return true;
      }
    }
    return false;
  }
  partners() { return Object.values(this.worlds).filter((x) => x.status === 'pact' || x.status === 'allied' || x.status === 'vassal'); }
  /** The economic route's own activity: a trade run between pact worlds. Pays credits and influence. */
  convoy() {
    const partners = this.partners();
    if (!partners.length) { this.advance(1); return; }
    this.advance(ASSUME.convoy);
    this.gain(CONVOY.xp, CONVOY.credits, 'convoy');
    this.gainInfluence(CONVOY.influence);
    this.log('note', `Convoy run to ${partners[Math.floor(this.r() * partners.length)].id}: +${CONVOY.credits} credits, +${CONVOY.influence} influence`, { activity: 'economy', meaningful: true });
  }
  step(): boolean {
    const th = nextThreat(this.d, this.directorCtx());
    if (th) { this.handleThreat(th); return true; }
    this.spend();
    if (this.diplomacy()) return true;
    const w = this.target();
    if (!w) { this.convoy(); return true; } // only pacts left: trade while the alliances ripen
    if (this.level < 3) { this.skirmish(w); return true; }
    // The veteran patrol has to be broken; after that, levies are fought only when three or more have gathered,
    // otherwise the player goes for the yards (conquest: reinforcements arrive the whole time).
    if (w.veterans > 0 || w.levies >= 3 || (w.levies > 0 && w.taken >= w.sites.length)) { this.fightOne(w); return true; }
    const economic = this.route.strategy === 'economic';
    if (economic) {
      const production = w.sites.slice(0, w.taken);
      // Weakened: its god-armour station broken (it shields the blockade runners), and then either its yards and two
      // works taken, or cut off (every supplier is yours: economic domination by isolation).
      const cutOff = SUPPLIERS[w.id].every((x) => x === this.route.home || (this.worlds[x] && this.worlds[x].status !== 'hostile'));
      const stationBroken = production.filter((k) => k === 'section').length >= w.sites.filter((k) => k === 'section').length;
      const weakened = stationBroken && (cutOff || (production.includes('shipyard') && production.includes('foundry') && production.filter((k) => k === 'works').length >= 2));
      if (weakened) {
        // The blockade and the ultimatum are clocks on flight time: fighting off a raid meanwhile does not stop them.
        if (w.blockade < 0) w.blockade = this.t;
        const holdOut = w.demanded ? ASSUME.blockade + ASSUME.ultimatum : ASSUME.blockade;
        if (this.t - w.blockade < holdOut) {
          // Sit in orbit until the economy breaks; every step a freighter trying to run it is seized.
          this.advance(Math.max(0.5, Math.min(ASSUME.blockadeStep, holdOut - (this.t - w.blockade))));
          this.gain(SEIZED.xp, SEIZED.credits, 'blockade');
          this.log('note', `Blockade of ${w.id}: a freighter seized (+${SEIZED.credits} credits)`, { activity: 'siege', meaningful: true });
          return true;
        }
        if (w.demanded) { this.turn(w, 'vassal', 'swears fealty (vassal)'); return true; }
        const cost = INFLUENCE.vassal + INFLUENCE.vassalPerTurned * this.turned;
        if (this.influence >= cost) {
          this.advance(ASSUME.diplomacy);
          this.influence -= cost; w.demanded = true; w.blockade = this.t - ASSUME.blockade;
          this.log('note', `Ultimatum to ${w.id}: swear fealty or starve (${ASSUME.ultimatum} min)`, { activity: 'diplomacy', rung: true });
          return true;
        }
        // Saving influence for the demand: run the trade lanes if there are any, else keep taking sites.
        if (this.partners().length) { this.convoy(); return true; }
      }
    }
    if (w.taken < w.sites.length) { this.takeSite(w); if (w.taken === w.sites.length) this.turn(w, 'controlled', 'controlled'); return true; }
    return false;
  }
}

export function simulate(route: Route, ttk: TtkTable, seed = 1, maxMinutes = 20 * 60): Timeline {
  const g = new Game(route, ttk, seed);
  g.sample();
  while (g.t < maxMinutes && g.turned < route.order.length) if (!g.step()) g.advance(1);
  // play out a pending Last Alliance so every route meets it
  while (g.d.lastAlliance !== 'done' && g.d.lastAlliance !== 'none' && g.t < maxMinutes) {
    const th = nextThreat(g.d, g.directorCtx());
    if (th) g.handleThreat(th); else g.advance(1);
  }
  return {
    route, events: g.events, samples: g.samples, end: g.t, won: g.turned >= route.order.length,
    levelTenAt: g.levelTenAt, xpBySource: g.xpBySource, pay: g.pay,
  };
}

/** The XP curve's top, so the report can say how far past it the game pays. */
export const XP_TOP = XP_CURVE[XP_CURVE.length - 1];

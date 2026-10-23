/**
 * The infantry carrier's operation (INFANTRY-CARRIER.md sections 4–7): ordered to a ground site, it flies there,
 * descends (vulnerable to the world's guns), lands, puts its squads down, fights the garrison and, if they win, holds
 * the site by conquest's capture rules until it changes hands. Then it lifts off and waits for the next order.
 *
 * Pure: a plain object stepped by the caller, who says where the site is this frame and how much fire reaches the
 * carrier. Conquest's rules (lib/conquest/state) decide whether a site may be taken and when it is.
 */
import type { V3 } from '../nav';
import { COSMOS, add, dist, scale, sub, unit } from '../nav';
import type { NationId } from '../nations';
import type { ConquestEvent, ConquestState } from '../conquest/state';
import { captureProblem, captureStep, isTarget, suppressed } from '../conquest/state';
import type { SiteDef } from '../conquest/sites';
import { KINDS, SITE_RULES, siteById, sitesOf } from '../conquest/sites';
import type { Squad, SquadKind } from './squads';
import { COVER, SQUADS, garrisonFor, menOf, newSquad } from './squads';
import type { Fight } from './fight';
import { forecast, newFight, stepFight, survivors } from './fight';
import { INFANTRY_CARRIER } from '../shipTypes';

/** The carrier's numbers beyond its ship-type row (FIRST PASS). Distances in scene units, times in seconds. */
export const CARRIER = {
  bays: 6, // squads aboard
  speed: 45, // transit speed, units a second (the player's cruiser at a middling throttle)
  approach: 60, // height above the site where the descent starts
  descent: 20, // seconds from the approach height to the ground
  unload: 6, // seconds on the ground before the squads are down and fighting
  lift: 10, // seconds back up to the approach height
  arrive: 2, // units: close enough to the approach point
  /** Squads left behind to garrison a taken site. */
  garrison: 1,
  /** Fire on a landing carrier, hit points a second: from each working battery of the world, each working fort, the target if it still works, and each hostile ship near it. */
  fire: { battery: 8, fort: 5, target: 4, ship: 3 },
  /** Refuse a landing whose expected fire over descent and unloading is at least this share of the carrier's hull. */
  hot: 0.8,
};

export type Phase = 'docked' | 'standby' | 'transit' | 'descent' | 'unload' | 'fight' | 'hold' | 'lift' | 'return' | 'lost' | 'gone';
export const LANDED: Phase[] = ['descent', 'unload', 'fight', 'hold', 'lift'];

export interface Carrier {
  id: string;
  /** 'player', or the world whose carrier it is. */
  side: 'player' | NationId;
  nation: NationId; // whose ship (its model and names)
  name: string;
  phase: Phase;
  hp: number;
  squads: Squad[];
  site: string | null;
  /** Where it is (transit, standby, return); on the ground and in the air above a site it is `alt` above the site. */
  pos: V3;
  alt: number;
  /** Seconds into the phase. */
  t: number;
  /** Seconds the troops have held the site (conquest's hold time, counted here: see the hold step). */
  hold: number;
  fight: Fight | null;
  /** The last thing that happened, for the HUD. */
  note: string;
}

export interface InfantryState {
  v: 1;
  carriers: Carrier[];
  /** Squads garrisoning taken sites, by site id: who an enemy landing would have to fight. */
  garrisons: Record<string, Squad[]>;
  next: number; // id counter
  /** Seconds until each world may launch its next carrier (enemy carriers). */
  cooldown: Partial<Record<NationId, number>>;
  /** nav.ts COSMOS when saved, so the carriers' positions follow a rescale (absent: saved with 200 m ships). */
  scale?: number;
}

export const newInfantry = (): InfantryState => ({ v: 1, carriers: [], garrisons: {}, next: 1, cooldown: {}, scale: COSMOS });

/** Carriers the player may have, by level: one from level 3, two from level 6. */
export const carrierSlots = (level: number) => (level >= 6 ? 2 : level >= 3 ? 1 : 0);

export function fullLoad(nation: NationId, prefix: string, kind: SquadKind = 'line', n = CARRIER.bays): Squad[] {
  return Array.from({ length: n }, (_, i) => newSquad(kind, nation, `${prefix}-s${i}`));
}

export function newCarrier(inf: InfantryState, side: Carrier['side'], nation: NationId, name: string, pos: V3, squads = fullLoad(nation, `c${inf.next}`)): Carrier {
  const c: Carrier = { id: `c${inf.next++}`, side, nation, name, phase: 'docked', hp: INFANTRY_CARRIER.hp, squads, site: null, pos: [...pos] as V3, alt: 0, t: 0, hold: 0, fight: null, note: 'With your ship' };
  inf.carriers.push(c);
  return c;
}

// ---------- the guns that reach a landing ----------

const works = (c: ConquestState, s: SiteDef) => c.sites[s.id].owner === 'native' && !suppressed(c, s);

/**
 * Fire on a carrier at `siteId` now, hit points a second (`ships`: hostile ships near it). The world's batteries (in
 * orbit) reach it all the way; its other forts' guns cover the sky, so they reach it only on the way down (`ground`
 * false); the target itself fires while it still works.
 */
export function landingFire(c: ConquestState, siteId: string, ships = 0, ground = false): number {
  const s = siteById(siteId);
  if (!s) return 0;
  let f = ships * CARRIER.fire.ship;
  for (const o of sitesOf(s.world)) {
    if (!works(c, o)) continue;
    if (o.kind === 'battery') f += CARRIER.fire.battery;
    else if (o.kind === 'fort' && o.id !== s.id && !ground) f += CARRIER.fire.fort;
  }
  if (works(c, s)) f += CARRIER.fire.target;
  return f;
}

/** Fire the player's garrison at a site puts on an enemy carrier (its own squads' guns, nothing more yet). */
export const garrisonFire = (inf: InfantryState, siteId: string) => (inf.garrisons[siteId]?.length ? CARRIER.fire.target : 0);

// ---------- orders ----------

export function garrisonOf(c: ConquestState, siteId: string): Squad[] {
  const s = siteById(siteId)!;
  return garrisonFor(s.kind, s.world, s.id, c.sites[s.id].hp / KINDS[s.kind].hp);
}

/**
 * Why the carrier may not land at `siteId` now, or null. Conquest's own rules first (whose it is, whether it can be
 * held, its forts, suppressed), then the carrier's: the guns that would reach it, and the garrison it would face.
 * `force` skips the carrier's own advice (the player insists), never conquest's rules.
 */
export function landingProblem(c: ConquestState, car: Carrier, siteId: string, o: { ships?: number; force?: boolean } = {}): string | null {
  const s = siteById(siteId);
  if (!s) return 'no such site';
  if (car.phase === 'lost') return 'the carrier is lost';
  if (!car.squads.length) return 'no troops aboard';
  if (LANDED.includes(car.phase)) return 'already landing';
  const rule = captureProblem(c, siteId, { inRange: true, contested: false });
  if (rule && !(o.force && rule.startsWith('not suppressed'))) return rule.startsWith('not suppressed') ? 'its defences are up: shoot it below half first' : rule;
  if (o.force) return null;
  const fire = landingFire(c, siteId, o.ships ?? 0);
  if (fire * CARRIER.descent + landingFire(c, siteId, o.ships ?? 0, true) * CARRIER.unload >= car.hp * CARRIER.hot) return `too hot: its guns would shoot the carrier down (${Math.round(fire)} a second); clear the batteries and forts`;
  const odds = forecast(car.squads, garrisonOf(c, siteId), { place: 'site', cover: COVER[s.kind] });
  if (odds.winner === 'defend') return `the garrison would hold (${Math.round(menOf(garrisonOf(c, siteId)))} men): bring more troops or shell it harder`;
  return null;
}

/** Send the carrier to land at a site. Returns the refusal, or null when it is on its way. */
export function orderLanding(c: ConquestState, car: Carrier, siteId: string, o: { ships?: number; force?: boolean } = {}): string | null {
  const why = landingProblem(c, car, siteId, o);
  if (why) { car.note = `Refused: ${why}`; return why; }
  car.site = siteId;
  car.phase = 'transit';
  car.t = 0;
  car.note = `To ${siteById(siteId)!.name}`;
  return null;
}

/** Back to the player's ship: it keeps station with it (too big for a bay: INFANTRY-CARRIER.md 2) and refills. */
export function orderReturn(car: Carrier) {
  if (car.phase === 'lost' || car.phase === 'docked') return;
  if (LANDED.includes(car.phase) && car.phase !== 'lift') { car.phase = 'lift'; car.t = 0; reembark(car); }
  else { car.phase = 'return'; car.t = 0; }
  car.note = 'Returning';
}

function reembark(car: Carrier) {
  if (car.fight) car.squads = survivors(car.fight.attack);
  car.fight = null;
}

/** Fill the bays at the player's ship; returns the credits it cost (line squads, by the men missing). */
export function refill(car: Carrier, credits: number): number {
  let spent = 0;
  const full = SQUADS.line.men;
  for (const s of car.squads) {
    const need = Math.min(credits - spent, Math.ceil(((full - s.men) / full) * SQUADS[s.kind].cost));
    if (need <= 0) continue;
    s.men = Math.min(SQUADS[s.kind].men, s.men + (need / SQUADS[s.kind].cost) * SQUADS[s.kind].men);
    s.morale = SQUADS[s.kind].morale;
    spent += need;
  }
  while (car.squads.length < CARRIER.bays && credits - spent >= SQUADS.line.cost) {
    car.squads.push(newSquad('line', car.nation, `${car.id}-r${car.squads.length}-${Math.round(spent)}`));
    spent += SQUADS.line.cost;
  }
  return spent;
}

// ---------- a step ----------

export interface CarrierCtx {
  /** Where the site's touchdown point is now, and the way up from it (the surface normal). */
  site?: { pos: V3; up: V3 };
  /** Where the player's ship is (to return to). */
  ship: V3;
  /** Fire reaching the carrier this step, hit points a second (landingFire, or the scene's own count). */
  fire: number;
  /** Hostile ships near the site (conquest's contest rule). */
  contested: boolean;
}

export interface CarrierEvent { kind: 'landed' | 'fighting' | 'won' | 'repulsed' | 'captured' | 'lifted' | 'lost' | 'docked' | 'aborted'; carrier: string; site?: string }

const above = (car: Carrier, ctx: CarrierCtx): V3 => (ctx.site ? add(ctx.site.pos, scale(ctx.site.up, car.alt)) : car.pos);

function moveToward(car: Carrier, goal: V3, dt: number): boolean {
  const d = dist(car.pos, goal);
  const step = CARRIER.speed * dt;
  if (d <= Math.max(CARRIER.arrive, step)) { car.pos = [...goal] as V3; return true; }
  car.pos = add(car.pos, scale(unit(sub(goal, car.pos)), step));
  return false;
}

/** For the player's carriers: conquest's capture runs through here; its events are returned for the game to pay. */
export function stepCarrier(c: ConquestState, inf: InfantryState, car: Carrier, dt: number, ctx: CarrierCtx): { ev: CarrierEvent[]; conquest: ConquestEvent[] } {
  const ev: CarrierEvent[] = [];
  const cq: ConquestEvent[] = [];
  if (car.phase === 'lost' || car.phase === 'gone' || car.phase === 'docked' || dt <= 0) return { ev, conquest: cq };
  const s = car.site ? siteById(car.site) : undefined;
  const e = (kind: CarrierEvent['kind']) => ev.push({ kind, carrier: car.id, site: car.site ?? undefined });
  car.t += dt;

  // A site that is no longer theirs to take (the pilot took or wrecked it): give up, unless it is ours to hold.
  if (s && car.phase !== 'lift' && car.phase !== 'hold' && LANDED.concat(['transit']).includes(car.phase) && (c.sites[s.id].owner !== 'native' || !isTarget(c, s.world))) {
    if (car.phase === 'transit') { car.phase = 'standby'; car.site = null; } else { reembark(car); car.phase = 'lift'; }
    car.t = 0;
    car.note = 'Aborted: the site changed hands';
    e('aborted');
  }

  // Fire reaches it from the moment it starts down until it is back up.
  if (LANDED.includes(car.phase) && ctx.fire > 0) {
    car.hp -= ctx.fire * dt;
    if (car.hp <= 0) {
      car.hp = 0;
      car.phase = 'lost';
      car.fight = null;
      car.squads = [];
      car.note = s ? `Shot down over ${s.name}` : 'Shot down';
      e('lost');
      return { ev, conquest: cq };
    }
  }

  // A landing under way counts as hits on the site: it does not mend from the moment the carrier starts down until the
  // troops are done (infantry-to-conquest.md, 3).
  if (s && (car.phase === 'descent' || car.phase === 'unload' || car.phase === 'fight' || car.phase === 'hold')) c.sites[s.id].lastHit = c.clock;

  switch (car.phase) {
    case 'transit': {
      if (!ctx.site) break;
      const goal = add(ctx.site.pos, scale(ctx.site.up, CARRIER.approach));
      if (moveToward(car, goal, dt)) { car.phase = 'descent'; car.t = 0; car.alt = CARRIER.approach; car.note = `Descending on ${s!.name}`; }
      break;
    }
    case 'descent': {
      car.alt = Math.max(0, CARRIER.approach * (1 - car.t / CARRIER.descent));
      if (car.t >= CARRIER.descent) { car.alt = 0; car.phase = 'unload'; car.t = 0; car.note = `Landed at ${s!.name}: troops going down`; e('landed'); }
      break;
    }
    case 'unload': {
      if (car.t >= CARRIER.unload) {
        car.fight = newFight(car.squads, garrisonOf(c, s!.id), { place: 'site', cover: COVER[s!.kind] });
        car.squads = [];
        car.phase = 'fight';
        car.t = 0;
        car.note = `Fighting for ${s!.name}`;
        e('fighting');
      }
      break;
    }
    case 'fight': {
      const w = stepFight(car.fight!, dt);
      if (w === 'attack') { car.phase = 'hold'; car.t = 0; car.note = `${s!.name}: garrison beaten, holding`; e('won'); }
      if (w === 'defend') { reembark(car); car.phase = 'lift'; car.t = 0; car.note = `Repulsed at ${s!.name}`; e('repulsed'); }
      break;
    }
    case 'hold': {
      // Conquest's rule, counted by the troops: hold while it may be captured; contested pauses; anything else drains.
      // The full hold is then handed to captureStep in one go, which checks the rule again and does the capture.
      const why = captureProblem(c, s!.id, { inRange: true, contested: ctx.contested });
      if (!why) car.hold += dt;
      else if (!why.startsWith('contested')) car.hold = Math.max(0, car.hold - SITE_RULES.drain * dt);
      if (why?.startsWith('not suppressed') && car.hold <= 0) {
        // It had mended above half before the troops got there: they cannot hold it. Back aboard; shell it again.
        reembark(car);
        car.phase = 'lift';
        car.t = 0;
        car.note = `${s!.name} is above half structure: troops pulled out, shell it again`;
        e('aborted');
        break;
      }
      if (car.hold >= KINDS[s!.kind].hold) cq.push(...captureStep(c, s!.id, KINDS[s!.kind].hold, { inRange: true, contested: false }));
      if (c.sites[s!.id].owner === 'player') {
        const men = survivors(car.fight!.attack);
        inf.garrisons[s!.id] = men.slice(0, CARRIER.garrison);
        car.squads = men.slice(CARRIER.garrison);
        car.fight = null;
        car.hold = 0;
        car.phase = 'lift';
        car.t = 0;
        car.note = `${s!.name} taken`;
        e('captured');
      } else car.note = `Holding ${s!.name} (${car.hold.toFixed(0)} / ${KINDS[s!.kind].hold} s)${why ? `: ${why}` : ''}`;
      break;
    }
    case 'lift': {
      car.alt = Math.min(CARRIER.approach, CARRIER.approach * (car.t / CARRIER.lift));
      if (car.t >= CARRIER.lift) {
        car.pos = above(car, ctx);
        car.phase = 'standby';
        car.site = null;
        car.t = 0;
        car.note = car.note.startsWith('Repulsed') || car.note.endsWith('taken') ? car.note + '; awaiting orders' : 'Awaiting orders';
        e('lifted');
      }
      break;
    }
    case 'return': {
      if (moveToward(car, ctx.ship, dt)) { car.phase = 'docked'; car.t = 0; car.note = 'With your ship'; e('docked'); }
      break;
    }
  }
  if (LANDED.includes(car.phase) && ctx.site) car.pos = above(car, ctx);
  return { ev, conquest: cq };
}

// ---------- enemy carriers ----------

export const ENEMY = {
  every: 240, // seconds between a world's carriers
  squads: 4,
};

/**
 * Which of the player's sites a world's carrier goes for, or null: a world not yet controlled, still holding a
 * working shipyard (carriers are built there), sends one at the player's site of that world with the smallest
 * garrison, while the player's ship is not near it (the scene passes `guarded`).
 */
export function enemyTarget(c: ConquestState, inf: InfantryState, w: NationId, guarded: (siteId: string) => boolean): string | null {
  if (!isTarget(c, w)) return null;
  if (!sitesOf(w).some((s) => s.kind === 'shipyard' && works(c, s))) return null;
  if (inf.carriers.some((k) => k.side === w && k.phase !== 'lost' && k.phase !== 'gone')) return null;
  const mine = sitesOf(w).filter((s) => c.sites[s.id].owner === 'player' && KINDS[s.kind].hold > 0 && !guarded(s.id));
  mine.sort((a, b) => menOf(inf.garrisons[a.id] ?? []) - menOf(inf.garrisons[b.id] ?? []));
  return mine[0]?.id ?? null;
}

/**
 * An enemy carrier's landing: it fights the player's garrison there. If it wins, the site goes back to its world,
 * suppressed (half structure) and with no capture progress: the player must take it again. PENDING conquest's
 * ruling on counter-attacks (CONQUEST.md open question 1; infantry-to-conquest.md request 2).
 */
export function retake(c: ConquestState, siteId: string) {
  const s = siteById(siteId)!;
  const st = c.sites[siteId];
  if (st.owner !== 'player' || !isTarget(c, s.world)) return false;
  st.owner = 'native';
  st.hp = KINDS[s.kind].hp * 0.5;
  st.hold = 0;
  st.lastHit = c.clock;
  return true;
}

/** An enemy carrier's step: as the player's, but the defenders are the player's garrison and a win retakes the site. */
export function stepEnemyCarrier(c: ConquestState, inf: InfantryState, car: Carrier, dt: number, ctx: CarrierCtx): CarrierEvent[] {
  const ev: CarrierEvent[] = [];
  if (car.phase === 'lost' || car.phase === 'gone' || dt <= 0 || !car.site) return ev;
  const s = siteById(car.site)!;
  const e = (kind: CarrierEvent['kind']) => ev.push({ kind, carrier: car.id, site: car.site ?? undefined });
  car.t += dt;
  if (LANDED.includes(car.phase) && ctx.fire > 0) {
    car.hp -= ctx.fire * dt;
    if (car.hp <= 0) { car.hp = 0; car.phase = 'lost'; car.fight = null; car.squads = []; car.note = `Enemy carrier shot down over ${s.name}`; e('lost'); return ev; }
  }
  if (c.sites[s.id].owner !== 'player' && car.phase !== 'lift') { car.phase = 'lift'; car.t = 0; reembark(car); }
  switch (car.phase) {
    case 'transit': {
      if (!ctx.site) break;
      if (moveToward(car, add(ctx.site.pos, scale(ctx.site.up, CARRIER.approach)), dt)) { car.phase = 'descent'; car.t = 0; car.alt = CARRIER.approach; car.note = `Enemy carrier descending on ${s.name}`; }
      break;
    }
    case 'descent':
      car.alt = Math.max(0, CARRIER.approach * (1 - car.t / CARRIER.descent));
      if (car.t >= CARRIER.descent) { car.alt = 0; car.phase = 'unload'; car.t = 0; e('landed'); }
      break;
    case 'unload':
      if (car.t >= CARRIER.unload) {
        car.fight = newFight(car.squads, inf.garrisons[s.id] ?? [], { place: 'site', cover: COVER[s.kind] });
        car.squads = [];
        car.phase = 'fight';
        car.t = 0;
        car.note = `Enemy troops attacking ${s.name}`;
        e('fighting');
      }
      break;
    case 'fight': {
      const w = stepFight(car.fight!, dt);
      if (w === 'attack') {
        retake(c, s.id);
        delete inf.garrisons[s.id];
        car.squads = survivors(car.fight!.attack);
        car.fight = null;
        car.phase = 'lift';
        car.t = 0;
        car.note = `${s.name} retaken by its world`;
        e('captured');
      } else if (w === 'defend') {
        inf.garrisons[s.id] = survivors(car.fight!.defend);
        reembark(car);
        car.phase = 'lift';
        car.t = 0;
        car.note = `Enemy landing at ${s.name} beaten off`;
        e('repulsed');
      }
      break;
    }
    case 'lift':
      car.alt = Math.min(CARRIER.approach, CARRIER.approach * (car.t / CARRIER.lift));
      if (car.t >= CARRIER.lift) { car.phase = 'gone'; car.note += ' (withdrew)'; e('lifted'); } // home to its yard: out of play
      break;
  }
  if (LANDED.includes(car.phase) && ctx.site) car.pos = above(car, ctx);
  return ev;
}

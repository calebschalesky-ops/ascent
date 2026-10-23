/**
 * Infantry carriers in the scene: the player's (ordered from the cockpit to a site, L; recalled, K) and the enemy
 * worlds' (sent to retake a site the player holds). The rules are lib/infantry/carrier.ts; this file places and
 * draws the carriers and their troops, measures the fire that reaches them and who contests the site, and feeds the
 * result back to the game (conquest's captures and rewards, the save).
 */
import * as THREE from 'three';
import type { V3 } from '../lib/nav';
import { dist, sub, unit } from '../lib/nav';
import type { NationId } from '../lib/nations';
import { NATIONS } from '../lib/nations';
import type { ConquestEvent, ConquestState } from '../lib/conquest/state';
import { WORLDS, isTarget } from '../lib/conquest/state';
import { KINDS, SITE_RULES, siteById } from '../lib/conquest/sites';
import { siteRadius } from '../lib/conquest/anchors';
import { INFANTRY_CARRIER } from '../lib/shipTypes';
import type { Carrier, CarrierCtx, CarrierEvent, InfantryState } from '../lib/infantry/carrier';
import { CARRIER, ENEMY, LANDED, newInfantry as newInfantryShadow, carrierSlots, enemyTarget, fullLoad, garrisonFire, landingFire, landingProblem, newCarrier, orderLanding, orderReturn, refill, stepCarrier, stepEnemyCarrier } from '../lib/infantry/carrier';
import { carrierName } from '../lib/infantry/names';
import { balanceOfFire } from '../lib/infantry/fight';
import { menOf } from '../lib/infantry/squads';
import type { Combat, Solid } from './combat';
import type { ConquestLayer } from './conquest';
import { CARRIER_MODEL_LENGTH, buildCarrier, disposeCarrier } from './space/carrier';
import { LABEL_FONT, textSprite } from './three-helpers';

export interface CarrierView { id: string; name: string; side: Carrier['side']; phase: Carrier['phase']; hp: number; max: number; men: number; enemy: number; balance: number | null; note: string; site: string | null; dist: number }

interface Drawn { obj: THREE.Group; troops: THREE.Points; label: THREE.Sprite; beacon: THREE.Sprite }

/** Commissioning a carrier after the first: hull and a full load of troops. */
export const COMMISSION = 300;

export function createInfantry(opts: {
  scene: THREE.Scene; combat: Combat; conquest: ConquestLayer; playerLength: number;
  state: () => InfantryState; cq: () => ConquestState; nation: () => NationId; level: () => number; credits: () => number;
  spend: (credits: number) => void; onConquest: (ev: ConquestEvent[]) => void; onEvents: (lines: string[], save: boolean) => void;
}) {
  const { combat, conquest, playerLength } = opts;
  const root = new THREE.Group();
  opts.scene.add(root);
  const drawn = new Map<string, Drawn>();
  const scaleK = (INFANTRY_CARRIER.size * playerLength) / CARRIER_MODEL_LENGTH;
  let ship: V3 = [0, 0, 0];
  const color = (n: NationId) => new THREE.Color(NATIONS.find((x) => x.id === n)?.color ?? '#ffffff');
  // A beacon a few pixels across at any distance, so a carrier a couple of ship lengths long can be found over a world.
  const glow = (() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d')!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.25, '#ffffff'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  })();
  const CALM = { player: new THREE.Color('#9fe0ff'), enemy: new THREE.Color('#ff7050') };
  const HIT = new THREE.Color('#ffb020');

  function draw(car: Carrier): Drawn {
    let d = drawn.get(car.id);
    if (d) return d;
    const obj = new THREE.Group();
    const model = buildCarrier(car.nation);
    model.scale.setScalar(scaleK);
    obj.add(model);
    const label = textSprite(car.name, LABEL_FONT, car.side === 'player' ? '#bfe0ff' : '#ffb0a0', 0.013, true);
    label.center.set(0.5, -0.8);
    obj.add(label);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 160), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(3 * 160), 3));
    const troops = new THREE.Points(geo, new THREE.PointsMaterial({ size: 3, sizeAttenuation: false, vertexColors: true, depthWrite: false }));
    troops.frustumCulled = false;
    troops.visible = false;
    const beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: car.side === 'player' ? CALM.player : CALM.enemy, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false }));
    beacon.scale.set(0.022, 0.022, 1);
    obj.add(beacon);
    root.add(obj, troops);
    d = { obj, troops, label, beacon };
    drawn.set(car.id, d);
    return d;
  }

  function undraw(id: string) {
    const d = drawn.get(id);
    if (!d) return;
    root.remove(d.obj, d.troops);
    disposeCarrier(d.obj);
    d.troops.geometry.dispose();
    (d.beacon.material as THREE.Material).dispose();
    (d.troops.material as THREE.Material).dispose();
    drawn.delete(id);
  }

  /** The touchdown point of a site this frame (the top of its structure) and the way up from it. */
  function sitePlace(id: string | null): CarrierCtx['site'] {
    if (!id) return undefined;
    const pos = conquest.sitePos(id);
    const door = conquest.doorstep(id);
    if (!pos || !door) return undefined;
    const up = unit(sub(door, pos));
    const def = siteById(id)!;
    const r = siteRadius(def, playerLength);
    return { pos: [pos[0] + up[0] * r, pos[1] + up[1] * r, pos[2] + up[2] * r], up };
  }

  const shipsNear = (w: NationId, at: V3) => combat.crafts.filter((c) => c.alive && c.hostile && c.nation === w && dist(c.pos, at) < SITE_RULES.contest).length;

  /** Scatter the two sides' men round the site, each dot about two men, jittering as they fight. */
  function drawTroops(d: Drawn, car: Carrier, place: NonNullable<CarrierCtx['site']>, t: number) {
    const f = car.fight;
    const mine = f ? f.attack : [];
    const theirs = f ? f.defend : [];
    const pos = d.troops.geometry.getAttribute('position') as THREE.BufferAttribute;
    const col = d.troops.geometry.getAttribute('color') as THREE.BufferAttribute;
    const a = new THREE.Vector3(...place.up);
    const u = new THREE.Vector3(1, 0, 0).cross(a);
    if (u.lengthSq() < 1e-4) u.set(0, 0, 1).cross(a);
    u.normalize();
    const v = a.clone().cross(u);
    const r = siteRadius(siteById(car.site!)!, playerLength) * 1.6;
    let k = 0;
    d.troops.position.set(...place.pos); // points are offsets from the site (space/origin.ts)
    const put = (n: number, c: THREE.Color, ring: number, seed: number) => {
      for (let i = 0; i < n && k < 160; i++, k++) {
        const ang = (i / Math.max(1, n)) * Math.PI * 2 + seed + Math.sin(t * 2 + i) * 0.03;
        const rr = r * (ring + 0.15 * Math.sin(i * 7.3 + seed));
        const p = new THREE.Vector3(...place.pos).addScaledVector(u, Math.cos(ang) * rr).addScaledVector(v, Math.sin(ang) * rr).addScaledVector(a, -r * 0.55);
        pos.setXYZ(k, p.x - place.pos[0], p.y - place.pos[1], p.z - place.pos[2]);
        col.setXYZ(k, c.r, c.g, c.b);
      }
    };
    const side = (car.side === 'player' ? opts.nation() : car.nation);
    const foe = car.side === 'player' ? siteById(car.site!)!.world : opts.nation();
    put(Math.round(menOf(mine) / 2), color(side).multiplyScalar(1.6), car.phase === 'hold' ? 0.5 : 0.9, 0.3);
    put(Math.round(menOf(theirs) / 2), color(foe).multiplyScalar(1.6), car.phase === 'hold' ? 0.2 : 0.5, 1.1);
    d.troops.geometry.setDrawRange(0, k);
    pos.needsUpdate = true;
    col.needsUpdate = true;
  }

  function place(car: Carrier, ctx: CarrierCtx, t: number) {
    const d = draw(car);
    const hidden = car.phase === 'docked' || car.phase === 'lost' || car.phase === 'gone';
    d.obj.visible = !hidden;
    d.troops.visible = !hidden && (car.phase === 'fight' || car.phase === 'hold') && !!ctx.site;
    if (hidden) return;
    const prev = d.obj.position.clone();
    d.obj.position.set(...car.pos);
    if (LANDED.includes(car.phase) && ctx.site) {
      // Belly to the ground: up along the surface normal, nose along the tangent.
      d.obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...ctx.site.up));
    } else {
      const mv = d.obj.position.clone().sub(prev);
      if (mv.lengthSq() > 1e-8) d.obj.lookAt(d.obj.position.clone().sub(mv)); // nose (−z) along the motion
    }
    // Under fire the beacon flickers amber: the guns are reaching it.
    const calm = car.side === 'player' ? CALM.player : CALM.enemy;
    const hit = ctx.fire > 0 && LANDED.includes(car.phase) && Math.sin(t * 25) > 0;
    (d.beacon.material as THREE.SpriteMaterial).color.copy(hit ? HIT : calm);
    d.beacon.scale.setScalar(hit ? 0.03 : 0.022);
    const ramp = d.obj.getObjectByName('ramp');
    if (ramp) ramp.rotation.x = car.phase === 'unload' || car.phase === 'fight' || car.phase === 'hold' ? -0.6 : 0;
    if (d.troops.visible && ctx.site) drawTroops(d, car, ctx.site, t);
  }

  // Enemy carriers are things the pilot's shots can hit.
  const before = combat.hooks.solids;
  combat.hooks.solids = () => {
    const out: Solid[] = before?.() ?? [];
    for (const car of opts.state().carriers) {
      if (car.side === 'player' || car.phase === 'lost' || car.phase === 'gone') continue;
      out.push({ pos: car.pos, radius: INFANTRY_CARRIER.hitRadius * playerLength, hit: (dmg) => { car.hp -= dmg; if (car.hp <= 0) { car.hp = 0; car.phase = 'lost'; car.fight = null; car.squads = []; car.note = `Enemy carrier ${car.name} destroyed`; opts.onEvents([car.note], true); } } });
    }
    return out;
  };

  const mine = () => opts.state().carriers.filter((k) => k.side === 'player');
  const ready = () => mine().filter((k) => k.phase === 'standby' || k.phase === 'docked');

  /** A carrier for an order: one waiting or with the player's ship, or a new one if the pilot's level allows and they can pay. */
  function pick(dry = false): Carrier | string {
    const inf = opts.state();
    const r = ready().sort((a, b) => (a.phase === 'standby' ? 0 : 1) - (b.phase === 'standby' ? 0 : 1));
    if (r.length) return r[0];
    const live = mine().filter((k) => k.phase !== 'lost');
    const slots = carrierSlots(opts.level());
    if (!slots) return 'Infantry carriers open at level 3';
    if (live.length >= slots) return 'Every carrier is busy';
    const cost = mine().length ? COMMISSION : 0;
    if (opts.credits() < cost) return `A new carrier costs ${cost} credits`;
    if (dry) return newCarrier(newInfantryShadow(), 'player', opts.nation(), 'new', ship);
    if (cost) opts.spend(cost);
    const nation = opts.nation();
    return newCarrier(inf, 'player', nation, carrierName(nation, mine().length), ship, fullLoad(nation, `c${inf.next}`));
  }

  /** Order a carrier to land at `siteId` (the nearest one that can be taken, if none is given). */
  function order(siteId?: string, force = false): string {
    const c = opts.cq();
    const v = conquest.view;
    const id = siteId ?? v?.sites.find((s) => s.owner === 'native' && KINDS[s.def.kind].hold > 0)?.def.id;
    if (!id) return 'No site here to land on';
    const car = pick();
    if (typeof car === 'string') return car;
    if (car.phase === 'docked') car.pos = [...ship] as V3;
    const why = orderLanding(c, car, id, { ships: shipsNear(siteById(id)!.world, conquest.sitePos(id) ?? ship), force });
    if (car.phase === 'docked' && !why) car.note = `Launched for ${siteById(id)!.name}`;
    opts.onEvents([why ? `${car.name} refused: ${why}` : `${car.name} to ${siteById(id)!.name}`], !why);
    return why ? `refused: ${why}` : `ordered: ${car.name} to ${id}`;
  }

  function recall(): string {
    const out = mine().filter((k) => k.phase !== 'lost' && k.phase !== 'docked');
    out.forEach(orderReturn);
    opts.onEvents([out.length ? `${out.map((k) => k.name).join(', ')} returning` : 'No carrier out'], true);
    return `${out.length} recalled`;
  }

  function lines(ev: CarrierEvent[], car: Carrier): string[] {
    const out: string[] = [];
    for (const e of ev) {
      const s = siteById(e.site ?? car.site ?? '')?.name ?? 'the site';
      const me = car.side === 'player';
      const line = {
        landed: me ? `${car.name} down at ${s}` : `Enemy carrier ${car.name} landing at ${s}!`,
        won: `${s}: garrison beaten, holding`,
        repulsed: me ? `${car.name} repulsed at ${s}` : `Enemy landing at ${s} beaten off`,
        captured: me ? `${s} taken by ${car.name}'s troops` : `${s} retaken by its world`,
        lost: me ? `${car.name} shot down over ${s}` : `Enemy carrier ${car.name} shot down`,
        docked: `${car.name} back with your ship`,
        aborted: car.note,
        fighting: '',
        lifted: '',
      }[e.kind];
      if (line) out.push(line);
    }
    return out;
  }

  let clock = 0;
  let sinceSave = 0;
  function update(dt: number, pos: V3) {
    ship = pos;
    clock += dt;
    const inf = opts.state();
    const c = opts.cq();
    const msgs: string[] = [];
    let save = false;
    const cqEv: ConquestEvent[] = [];
    for (const car of inf.carriers) {
      const ctx: CarrierCtx = { site: sitePlace(car.site), ship, fire: 0, contested: false };
      if (car.side === 'player') {
        if (car.phase === 'docked') { car.pos = [...ship] as V3; if (car.squads.length < CARRIER.bays || car.squads.some((s) => s.men < 10)) { const spent = refill(car, opts.credits()); if (spent > 0) { opts.spend(spent); msgs.push(`${car.name} refilled for ${spent} credits`); save = true; } } }
        if (car.site && ctx.site) {
          const w = siteById(car.site)!.world;
          const ships = shipsNear(w, ctx.site.pos);
          ctx.fire = LANDED.includes(car.phase) ? landingFire(c, car.site, ships, car.phase !== 'descent') : 0;
          ctx.contested = ships > 0;
        }
        const r = stepCarrier(c, inf, car, dt, ctx);
        cqEv.push(...r.conquest);
        if (r.ev.length) { msgs.push(...lines(r.ev, car)); save = true; }
      } else {
        if (car.site && ctx.site) ctx.fire = LANDED.includes(car.phase) ? garrisonFire(inf, car.site) : 0;
        const ev = stepEnemyCarrier(c, inf, car, dt, ctx);
        if (ev.length) { msgs.push(...lines(ev, car)); save = true; }
      }
      place(car, ctx, clock);
    }
    // Enemy worlds send carriers at the player's sites (only once the pilot holds some).
    for (const w of WORLDS) {
      if (!isTarget(c, w)) continue;
      const cd = (inf.cooldown[w] ?? ENEMY.every) - dt;
      inf.cooldown[w] = cd;
      if (cd > 0) continue;
      inf.cooldown[w] = ENEMY.every;
      const target = enemyTarget(c, inf, w, (id) => { const p = conquest.sitePos(id); return !!p && dist(p, ship) < 400; });
      if (!target) continue;
      const yard = Object.keys(c.sites).find((id) => siteById(id)?.world === w && siteById(id)?.kind === 'shipyard');
      const at = (yard && conquest.sitePos(yard)) || conquest.sitePos(target)!;
      const n = inf.carriers.filter((k) => k.side === w).length;
      const foe = newCarrier(inf, w, w, carrierName(w, n), at, fullLoad(w, `e${inf.next}`, 'line', ENEMY.squads));
      foe.site = target;
      foe.phase = 'transit';
      foe.note = `Enemy carrier ${foe.name} bound for ${siteById(target)!.name}`;
      msgs.push(foe.note);
      save = true;
    }
    // Forget the long-gone (the lost stay a while, for the record).
    for (const car of [...inf.carriers]) if (car.phase === 'gone' && car.t > 0) { inf.carriers.splice(inf.carriers.indexOf(car), 1); undraw(car.id); }
    for (const id of [...drawn.keys()]) if (!inf.carriers.some((k) => k.id === id)) undraw(id);
    if (cqEv.length) opts.onConquest(cqEv);
    sinceSave += dt;
    if (sinceSave > 5) { sinceSave = 0; save = true; }
    if (msgs.length || save) opts.onEvents(msgs, save);
  }

  function view(): CarrierView[] {
    return opts.state().carriers.filter((k) => k.phase !== 'gone' && (k.side === 'player' || k.phase !== 'lost')).map((k) => ({
      id: k.id, name: k.name, side: k.side, phase: k.phase, hp: k.hp, max: INFANTRY_CARRIER.hp,
      men: Math.round(menOf(k.fight ? k.fight.attack : k.squads)), enemy: Math.round(k.fight ? menOf(k.fight.defend) : 0),
      balance: k.fight ? balanceOfFire(k.fight) : null, note: k.note, site: k.site, dist: dist(k.pos, ship),
    }));
  }

  return {
    update, order, recall, view,
    /** Why a landing at `id` would be refused now (null: it would go). */
    problem: (id: string) => { const k = pick(true); return typeof k === 'string' ? k : landingProblem(opts.cq(), k, id, { ships: shipsNear(siteById(id)!.world, conquest.sitePos(id) ?? ship) }); },
    dispose: () => { combat.hooks.solids = before; for (const id of [...drawn.keys()]) undraw(id); glow.dispose(); opts.scene.remove(root); },
  };
}

export type InfantryLayer = ReturnType<typeof createInfantry>;

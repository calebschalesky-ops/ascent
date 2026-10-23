/**
 * Conquest in the scene: every world's sites drawn where they stand (surface sites turn with their planet), the
 * player's shots landing on them, capture by holding, production running on flight time, and ships relaunching from
 * their shipyard or foundry through combat.ts. The rules are lib/conquest; this file only places, draws and feeds them.
 */
import * as THREE from 'three';
import type { DestGeo, V3 } from '../lib/nav';
import { COSMOS, dist, orbitZone } from '../lib/nav';
import type { NationId } from '../lib/nations';
import { NATIONS } from '../lib/nations';
import type { ConquestEvent, ConquestState } from '../lib/conquest/state';
import { captureProblem, captureStep, hitSite, isTarget, stepConquest } from '../lib/conquest/state';
import type { MoonId, SiteDef, SiteKind } from '../lib/conquest/sites';
import { KINDS, SITES, SITE_RULES, sitesOf } from '../lib/conquest/sites';
import { MOON_STANDINS, dirOf, moonPlace, siteFrame, siteLocal, siteRadius, twilightPos } from '../lib/conquest/anchors';
import type { Combat, Solid } from './combat';
import type { VoyageWorld } from './voyageScene';
import { LABEL_FONT, textSprite } from './three-helpers';

export interface SiteView { def: SiteDef; pos: V3; dist: number; hp: number; max: number; owner: string; hold: number; problem: string | null }
export interface ConquestView { world: NationId; sites: SiteView[] }

interface Placed { def: SiteDef; obj: THREE.Group; mats: THREE.MeshStandardMaterial[]; owner: string; pos: V3; near: boolean }

const GREY = new THREE.Color('#3a3a3e');

/** One structure per kind, built from boxes and cylinders about one unit across (scaled to the site's size). */
function structure(kind: SiteKind, mat: THREE.Material, trim: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const box = (w: number, h: number, d: number, x = 0, z = 0, m = mat) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, h / 2, z); g.add(o); return o; };
  const cyl = (r: number, h: number, x = 0, z = 0, m = mat) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), m); o.position.set(x, h / 2, z); g.add(o); return o; };
  const dome = (r: number, x = 0, z = 0, m = trim) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), m); o.position.set(x, 0, z); g.add(o); return o; };
  switch (kind) {
    case 'capital': dome(0.55); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; cyl(0.07, 0.9 + (i % 2) * 0.4, Math.cos(a) * 0.75, Math.sin(a) * 0.75); } box(0.3, 1.6, 0.3, 0, 0, trim); break;
    case 'city': dome(0.35, -0.3, 0); box(0.3, 0.8, 0.3, 0.35, 0.2); box(0.25, 0.55, 0.25, 0.1, -0.4); box(0.2, 1.0, 0.2, 0.45, -0.25, trim); break;
    case 'fort': { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.12, 8, 24), mat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.12; g.add(ring); box(0.4, 0.6, 0.4, 0, 0, trim); break; }
    case 'shipyard': { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.06, 8, 32), mat); g.add(ring); for (const x of [-0.85, 0.85]) { const s = box(0.12, 0.12, 1.4, x, 0); s.position.y = 0; } box(0.3, 0.3, 0.3, 0, 0, trim).position.y = -0.15; break; }
    case 'foundry': box(1.0, 0.45, 0.6); cyl(0.09, 1.1, 0.3, 0.15, trim); cyl(0.09, 0.9, 0.05, 0.15, trim); break;
    case 'works': cyl(0.4, 0.35); box(0.2, 0.8, 0.2, 0.45, 0, trim); dome(0.25, -0.45, 0.2); break;
    case 'battery': box(0.6, 0.3, 0.6); for (const x of [-0.12, 0.12]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), trim); b.rotation.z = Math.PI / 2.6; b.position.set(x, 0.55, 0); g.add(b); } break;
  }
  return g;
}

/**
 * `state()` is the live conquest state (GameView owns it and saves it); `onEvents` receives everything that happened
 * this frame (rewards, captures, launches) so the pilot is paid and the game saved.
 */
export function createConquest(opts: {
  scene: THREE.Scene; combat: Combat; world: () => VoyageWorld | null; geo: () => DestGeo[]; playerLength: number;
  state: () => ConquestState; onEvents: (ev: ConquestEvent[]) => void;
}) {
  const { combat, playerLength } = opts;
  const root = new THREE.Group();
  opts.scene.add(root);
  const placed: Placed[] = [];
  const disposables: { dispose: () => void }[] = [];
  const moons = new Map<MoonId, THREE.Group>();
  let attached = false;
  let near: ConquestView | null = null;
  const playerColor = () => new THREE.Color(NATIONS.find((n) => n.player)?.color ?? '#3f7fd0');

  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.3, '#ffffff'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    disposables.push(t);
    return t;
  })();

  /** Hang every site (and the stand-in moons they need) in its frame. Runs once the planets exist. */
  function attach(world: VoyageWorld) {
    const geo = opts.geo();
    for (const m of MOON_STANDINS) {
      if (!SITES.some((s) => s.at.on === m.id)) continue;
      const { pos, size } = moonPlace(m.id, geo);
      const g = new THREE.Group();
      g.position.set(...pos);
      const mat = new THREE.MeshStandardMaterial({ color: m.tint, roughness: 0.95, metalness: 0 });
      const geom = new THREE.SphereGeometry(size, 96, 48);
      disposables.push(mat, geom);
      g.add(new THREE.Mesh(geom, mat));
      const label = textSprite(m.name.toUpperCase(), LABEL_FONT, '#dfe9ff', 0.016, true);
      label.center.set(0.5, -0.3);
      label.position.set(0, size * 1.05, 0);
      g.add(label);
      root.add(g);
      moons.set(m.id, g);
    }
    for (const def of SITES) {
      const nation = NATIONS.find((n) => n.id === def.world)!;
      const mat = new THREE.MeshStandardMaterial({ color: nation.color, emissive: new THREE.Color(nation.color).multiplyScalar(0.25), metalness: 0.4, roughness: 0.55 });
      const trim = new THREE.MeshStandardMaterial({ color: '#d9cfb8', emissive: new THREE.Color(nation.color).multiplyScalar(0.6), metalness: 0.6, roughness: 0.3 });
      disposables.push(mat, trim);
      const obj = structure(def.kind, mat, trim);
      obj.scale.setScalar(siteRadius(def, playerLength));
      const beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: nation.color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false }));
      const b = def.kind === 'capital' ? 0.03 : 0.018;
      beacon.scale.set(b / obj.scale.x, b / obj.scale.y, 1);
      beacon.position.y = 1.3;
      obj.add(beacon);
      const label = textSprite(def.name, LABEL_FONT, '#dfe9ff', 0.013, true);
      label.center.set(0.5, -0.6);
      label.position.y = 1.3;
      label.visible = false;
      label.name = 'label';
      // A screen-sized sprite still takes its parent's scale: undo the site's, as the beacon does, or a fort's name
      // comes out a hundred times the size of the planet's and the names pile up over the world.
      label.scale.set(label.scale.x / obj.scale.x, label.scale.y / obj.scale.y, 1);
      obj.add(label);
      const frame = siteFrame(def);
      const local = siteLocal(def, geo);
      if (frame === 'spin' || frame === 'tilt') {
        const f = world.bodyFrame(def.world === 'earth' ? 'earth' : def.world)!;
        obj.position.set(...local);
        obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...local).normalize());
        (frame === 'spin' ? f.spin : f.tilt).add(obj);
      } else if (frame === 'moon') {
        obj.position.set(...local);
        obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dirOf(def.at.lat, def.at.lon)));
        moons.get(def.at.on as MoonId)!.add(obj);
      } else {
        obj.position.set(...local);
        root.add(obj);
      }
      placed.push({ def, obj, mats: [mat, trim], owner: 'native', pos: local, near: false });
    }
    attached = true;
  }

  const world = (id: NationId) => opts.geo().find((g) => g.id === id)!;
  const sunPos = () => opts.geo().find((g) => g.id === 'sun')!.pos;

  /** Colour by owner: the nation's, the player's, or grey for a wreck. */
  function paint(p: Placed, owner: string) {
    p.owner = owner;
    const c = owner === 'wrecked' ? GREY : owner === 'player' ? playerColor() : new THREE.Color(NATIONS.find((n) => n.id === p.def.world)!.color);
    p.mats[0].color.copy(c);
    p.mats[0].emissive.copy(c).multiplyScalar(owner === 'wrecked' ? 0 : 0.25);
    p.mats[1].emissive.copy(c).multiplyScalar(owner === 'wrecked' ? 0 : 0.6);
    const beacon = p.obj.children.find((o) => o instanceof THREE.Sprite && o.name !== 'label') as THREE.Sprite | undefined;
    if (beacon) beacon.visible = owner !== 'wrecked';
  }

  /** Ships stand down for the player once their world is taken. */
  function standDown(w: NationId) { for (const c of combat.crafts) if (c.nation === w) c.hostile = false; }

  /** A save says some ships are dead and some worlds are taken: make the fight agree. */
  function sync() {
    const s = opts.state();
    for (const w of Object.keys(s.worlds) as NationId[]) {
      if (w === s.home) continue;
      for (const type of ['capital', 'cruiser', 'fighter'] as const) {
        const ships = combat.crafts.filter((c) => c.nation === w && c.type === type && c.alive);
        for (let i = s.worlds[w].alive[type]; i < ships.length; i++) combat.retire(ships[i]);
      }
      if (s.worlds[w].controlled) standDown(w);
    }
  }
  sync();

  /** The world whose sites the player is among: the nearest whose orbit zone (or a moon of it) holds the ship. */
  function worldNear(ship: V3): NationId | null {
    let best: NationId | null = null;
    let bd = Infinity;
    for (const n of NATIONS) {
      const g = world(n.id);
      const d = dist(ship, g.pos) - orbitZone(g) * (n.id === 'jupiter' || n.id === 'saturn' ? 3.5 : 1.5);
      if (d < 0 && d < bd) { bd = d; best = n.id; }
    }
    return best;
  }

  function handle(ev: ConquestEvent[]) {
    if (!ev.length) return;
    for (const e of ev) {
      if (e.kind === 'launch') {
        const c = combat.crafts.find((x) => x.nation === e.world && x.type === e.type && !x.alive);
        const from = placed.find((p) => p.def.id === e.from)?.pos;
        if (c) combat.revive(c, from);
      }
      if (e.kind === 'control') standDown(e.world);
    }
    opts.onEvents(ev);
  }

  combat.hooks.solids = () => {
    const s = opts.state();
    const out: Solid[] = [];
    for (const p of placed) {
      if (p.owner !== 'native' || !isTarget(s, p.def.world) || !p.near) continue;
      out.push({ pos: p.pos, radius: siteRadius(p.def, playerLength), hit: (d) => handle(hitSite(s, p.def.id, d)) });
    }
    return out;
  };

  const v = new THREE.Vector3();
  const up = new THREE.Vector3();
  const wq = new THREE.Quaternion();
  function update(dt: number, ship: V3) {
    const w = opts.world();
    if (!attached && w) attach(w);
    const s = opts.state();
    // Where each site is this frame; only sites near the ship take hits and draw their names.
    const here = worldNear(ship);
    for (const p of placed) {
      if (siteFrame(p.def) === 'twilight') {
        const home = world(p.def.world);
        p.obj.position.set(...twilightPos(home, sunPos()));
        p.obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.obj.position.clone().sub(new THREE.Vector3(...home.pos)).normalize());
      }
      p.obj.getWorldPosition(v);
      p.pos = [v.x, v.y, v.z];
      p.near = p.def.world === here && dist(p.pos, ship) < 0.7 * COSMOS; // 4,000 at 200 m ships
      const label = p.obj.getObjectByName('label');
      if (label) {
        // Only the names on the side of the world facing the ship: the far side's showed through the planet.
        let facing = true;
        if (siteFrame(p.def) !== 'world') {
          up.set(0, 1, 0).applyQuaternion(p.obj.getWorldQuaternion(wq));
          facing = up.x * (ship[0] - v.x) + up.y * (ship[1] - v.y) + up.z * (ship[2] - v.z) > 0;
        }
        label.visible = p.near && facing;
      }
      const owner = s.sites[p.def.id].owner;
      if (owner !== p.owner) paint(p, owner);
    }
    // Hold any site the ship is close to; let every other hold drain.
    const ev: ConquestEvent[] = [];
    for (const p of placed) {
      const st = s.sites[p.def.id];
      if (st.owner !== 'native' || !isTarget(s, p.def.world) || !KINDS[p.def.kind].hold) continue;
      const inRange = dist(p.pos, ship) <= siteRadius(p.def, playerLength) + SITE_RULES.captureReach;
      if (!inRange && st.hold <= 0) continue;
      const contested = combat.crafts.some((c) => c.alive && c.hostile && c.nation === p.def.world && dist(c.pos, p.pos) < SITE_RULES.contest);
      ev.push(...captureStep(s, p.def.id, dt, { inRange, contested }));
    }
    // Production, repair and income run on flight time. A world is blockaded while the ship sits in it unopposed.
    const blockaded = here && !combat.crafts.some((c) => c.alive && c.hostile && c.nation === here) && dist(ship, world(here).pos) < orbitZone(world(here)) ? [here] : [];
    ev.push(...stepConquest(s, dt, { blockaded }));
    handle(ev);
    // What the HUD shows: the world the ship is at, its sites by distance.
    if (here && here !== s.home) {
      const sites = placed.filter((p) => p.def.world === here).map((p) => {
        const st = s.sites[p.def.id];
        const inRange = dist(p.pos, ship) <= siteRadius(p.def, playerLength) + SITE_RULES.captureReach;
        const contested = combat.crafts.some((c) => c.alive && c.hostile && c.nation === here && dist(c.pos, p.pos) < SITE_RULES.contest);
        return { def: p.def, pos: p.pos, dist: dist(p.pos, ship), hp: st.hp, max: KINDS[p.def.kind].hp, owner: st.owner, hold: st.hold, problem: st.owner === 'native' ? captureProblem(s, p.def.id, { inRange, contested }) : null };
      }).sort((a, b) => a.dist - b.dist);
      near = { world: here, sites };
    } else near = null;
  }

  return {
    update,
    sync,
    get view() { return near; },
    sitePos: (id: string) => placed.find((p) => p.def.id === id)?.pos ?? null,
    /** The ship to `id`'s doorstep (dev and tests): a point just above the site, on the side away from its body. */
    doorstep: (id: string): V3 | null => {
      const p = placed.find((x) => x.def.id === id);
      if (!p) return null;
      const def = p.def;
      const centre = def.at.on !== 'home' ? (moons.get(def.at.on as MoonId)!.position.toArray() as V3) : world(def.world).pos;
      const out = new THREE.Vector3(...p.pos).sub(new THREE.Vector3(...centre)).normalize();
      return new THREE.Vector3(...p.pos).addScaledVector(out, siteRadius(def, playerLength) + 12).toArray() as V3;
    },
    sitesOf,
    dispose: () => { combat.hooks.solids = null; opts.scene.remove(root); for (const p of placed) p.obj.removeFromParent(); disposables.forEach((d) => d.dispose()); },
  };
}

export type ConquestLayer = ReturnType<typeof createConquest>;

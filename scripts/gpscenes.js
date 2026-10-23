// Graphics-pass scenes, page side (driven by scripts/gp.mjs). Each scene poses the world and either returns
// { url } (a canvas frame read in the same task as the render) or 'screen' (the driver takes a page screenshot,
// HUD included). Dev only.
import * as THREE from 'three';
import * as A from './artrefit.js';
import * as AT from './armourtest.js';
import * as AIR from './airtest.js';

const V = () => window.__voyage;
const HOMES = ['earth', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
const add = (a, b) => a.map((x, i) => x + b[i]);
const sub = (a, b) => a.map((x, i) => x - b[i]);
const mul = (a, k) => a.map((x) => x * k);
const unit = (a) => mul(a, 1 / Math.hypot(...a));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * artrefit.shoot() moves the camera and renders without the per-frame graphics update, so the post pass's Sun
 * (god rays, flare) is left where the last live frame put it. Before every composer render, set it from the camera
 * that is about to draw, the same way fx/post.ts does (blockers: the bodies of nav geo).
 */
function patchSun() {
  const v = V();
  if (v.composer.__gp) return;
  const pass = v.composer.passes.find((p) => p.uniforms?.uSunVis);
  if (!pass) return;
  const orig = v.composer.render.bind(v.composer);
  v.composer.render = (dt) => {
    const cam = v.camera;
    cam.updateMatrixWorld(true);
    const sun = A.geo('sun');
    const sp = new THREE.Vector3(...sun.pos);
    const vs = sp.clone().applyMatrix4(cam.matrixWorldInverse);
    const nd = sp.clone().project(cam);
    const edge = Math.max(Math.abs(nd.x), Math.abs(nd.y));
    let vis = vs.z < 0 ? THREE.MathUtils.clamp((1.35 - edge) / 0.4, 0, 1) : 0;
    const to = sp.clone().sub(cam.position); const dS = to.length(); to.normalize();
    for (const g of v.geo()) {
      if (g.id === 'sun' || !(g.size > 0)) continue;
      const oc = new THREE.Vector3(...g.pos).sub(cam.position);
      const along = oc.dot(to);
      if (along <= 0 || along > dS) continue;
      if (oc.clone().sub(to.clone().multiplyScalar(along)).length() < g.size) vis = 0;
    }
    pass.uniforms.uSun.value.set((nd.x + 1) / 2, (nd.y + 1) / 2);
    pass.uniforms.uSunVis.value = vis;
    pass.uniforms.uSunSize.value = Math.min(0.5, Math.atan(sun.size / Math.max(dS, sun.size)) / ((cam.fov * Math.PI) / 360) * 0.5);
    return orig(dt);
  };
  v.composer.__gp = true;
}

export async function init() {
  const v = V();
  patchSun();
  if (v.dock) { v.undock(); v.run(1.5); }
  return true;
}

const free = () => { const v = V(); if (v.dock) { v.undock(); v.run(1.5); } if (v.air?.active) { /* left by the next pose */ } };

/** Frame a group with the camera: from `dir` (unit, world), at `k` × its bounding radius. */
function frameObj(obj, dir, k = 1.6, up = [0, 1, 0]) {
  const box = new THREE.Box3().setFromObject(obj);
  const s = box.getBoundingSphere(new THREE.Sphere());
  const c = s.center.toArray();
  const fov = V().camera.fov;
  const dist = (s.radius * k) / Math.tan((fov / 2) * Math.PI / 180);
  return A.shoot(add(c, mul(unit(dir), dist)), c, up, { clean: false });
}

/** Park the ship in an empty patch of space well clear of every world, nose along -z. */
function emptySpace() {
  const v = V();
  const e = A.geo('earth');
  const at = [e.pos[0] + e.size * 2.2, e.pos[1] + e.size * 1.4, e.pos[2] + e.size * 2.6];
  AT.pose(at, [0, 0, -1]);
  v.run(0.2);
  return at;
}

const SCENES = {};

// The seven home worlds and their god-armour: the reference-sheet hero view, and the ship's own view on approach.
for (const h of HOMES) {
  SCENES['hero-' + h] = async () => { free(); const p = await A.heroPose(h); return A.shoot(p.pos, p.at, p.up, { clean: false }); };
  SCENES['approach-' + h] = async () => {
    free();
    const pl = V().armour?.places?.[h];
    if (!pl) return 'no place ' + h;
    const f = pl.frame;
    const dir = unit(add(mul(f.face, 0.9), mul(f.spin, h === 'jupiter' ? 0.75 : h === 'mercury' ? 0.5 : 0.28)));
    const pos = add(f.centre, mul(dir, f.R * 3.4));
    AT.pose(pos, sub(sub(f.centre, mul([0, 1, 0], f.R * 0.62)), pos));
    V().run(0.5);
    return { screen: true, wait: 500 };
  };
  SCENES['close-' + h] = async () => {
    free();
    const pl = V().armour?.places?.[h];
    const b = pl?.hardpoints?.find((x) => x.kind === 'berth');
    if (!b) return 'no berth ' + h;
    const L = 0.18 * 2.06;
    const n = unit(b.normal ?? b.up ?? sub(b.pos, pl.frame.centre));
    const t = unit(b.along ?? b.tangent ?? [n[2], 0, -n[0]]);
    const pos = add(add(b.pos, mul(n, 30 * L)), mul(t, -70 * L));
    AT.pose(pos, sub(b.pos, pos));
    V().run(0.4);
    return { screen: true };
  };
}

// The Sun, deep space and the edge.
SCENES['sun'] = async () => { free(); const g = A.geo('sun'); const e = A.geo('earth'); const d = unit(sub(e.pos, g.pos)); return A.shoot(add(g.pos, mul(d, g.size * 3.2)), g.pos, [0, 1, 0], { clean: false }); };
SCENES['stars'] = async () => { free(); const g = A.geo('stars'); if (!g) return 'no stars'; AT.pose(g.pos, [0.3, 0.05, -1]); V().run(0.3); return { screen: true }; };
SCENES['edge'] = async () => { free(); const g = A.geo('edge'); if (!g) return 'no edge'; const p = mul(g.pos, 0.97); AT.pose(p, g.pos); V().run(0.3); return { screen: true }; };

// Moons: every destination that is not a home, a station, the Sun or the far places.
SCENES['moons'] = async () => {
  free();
  const ids = V().geo().map((g) => g.id).filter((i) => !HOMES.includes(i) && !['sun', 'stars', 'edge'].includes(i) && !i.startsWith('stn-'));
  return { info: ids, url: null, screen: false, ids };
};
for (const m of ['io', 'europa', 'ganymede', 'callisto', 'mimas', 'enceladus', 'tethys', 'dione', 'rhea', 'titan', 'iapetus']) {
  SCENES['moon-' + m] = async () => {
    free();
    const g = A.geo(m);
    if (!g) return 'no moon ' + m;
    const sun = A.geo('sun').pos;
    const d = unit(add(unit(sub(sun, g.pos)), [0.6, 0.35, -0.7]));
    return A.shoot(add(g.pos, mul(d, Math.max(g.size, 0.05) * 4.5)), g.pos, [0, 1, 0], { clean: false });
  };
}

// Stations: the ship's view on approach, then docked.
SCENES['station-earth'] = async () => { free(); const g = A.geo('stn-earth-1'); if (!g) return 'no stn'; const pos = add(g.pos, [g.size * 6, g.size * 2, g.size * 6]); AT.pose(pos, sub(g.pos, pos)); V().run(0.4); return { screen: true }; };
SCENES['station-mars'] = async () => { free(); const g = A.geo('stn-mars-1'); if (!g) return 'no stn'; const pos = add(g.pos, [g.size * 6, g.size * 2, -g.size * 6]); AT.pose(pos, sub(g.pos, pos)); V().run(0.4); return { screen: true }; };
SCENES['dock-mars'] = async () => { free(); const r = await AT.autoDock('stn-mars-1', true, false); return { screen: true, wait: 800, info: { docked: r?.docked, dock: V().dock?.phase } }; };
SCENES['dock-inside'] = async () => {
  const v = V();
  if (!v.dock) await AT.autoDock('stn-earth-1', true, false);
  return { screen: true, wait: 1200, info: { dock: v.dock?.phase } };
};

// Inside the air: Earth descent and low flight, a rocky world, the cloud deck of Venus, a gas giant.
SCENES['air-earth-high'] = async () => { free(); await AIR.descend(false); return { screen: true }; };
SCENES['air-earth-low'] = async () => { await AIR.lowFlight(3, 2.5); return { screen: true }; };
async function dropInto(id, k = 1.03, nose = 0.35, secs = 12) {
  free();
  const { pos, rad, tan } = AIR.daySide(id, k);
  AT.pose(pos, tan.map((t, i) => t * Math.cos(nose) - rad[i] * Math.sin(nose)));
  V().input.throttle.current = 0.6;
  for (let i = 0; i < secs * 30; i++) {
    const L = AIR.log();
    const want = L.alt === null ? -0.3 : L.alt > 8 ? -0.25 : L.alt > 3 ? -0.08 : 0.05;
    await AIR.fly(want, 1);
    if (L.alt !== null && L.alt < 3.2 && i > 60) break;
  }
  return { screen: true, info: AIR.log() };
}
/**
 * Graphics pass 3: since ships went ×5 smaller (S1, KM_PER_UNIT 0.04/0.3708) a dive from a fixed fraction of R takes
 * 5× longer and the timed dives above never reach the air. Pose the ship at `alt` scene units above the ground (or a
 * giant's cloud tops) on the day side instead, nose `nose` below the local horizon, and hold that height for `secs`
 * of real-time frames so the ground streams in. Same place every run, whatever the scale.
 */
async function airAt(id, alt, nose = 0.08, secs = 3) {
  free();
  const v = V();
  const { R, pos, rad, tan } = AIR.daySide(id, 1.0015);
  const C = sub(pos, mul(rad, R * 1.0015));
  const fwd = tan.map((t, i) => t * Math.cos(nose) - rad[i] * Math.sin(nose));
  AT.pose(pos, fwd);
  v.run(1 / 30);
  const hold = () => {
    const a = v.air.altitudeAt(v.ship.pos);
    if (!Number.isFinite(a)) return;
    const up = unit(sub(v.ship.pos.toArray(), C));
    v.ship.pos.set(...add(v.ship.pos.toArray(), mul(up, alt - a)));
  };
  for (let i = 0; i < 3; i++) { hold(); v.run(1 / 30); }
  v.input.throttle.current = 0.35;
  for (let i = 0; i < secs * 30; i++) { await AIR.fly(-nose, 1); hold(); }
  return { screen: true, info: AIR.log() };
}
// Pass 3: posed heights (scene units; the hull is 0.371 long), not timed dives.
SCENES['air-earth-high'] = () => airAt('earth', 400, 0.2);
SCENES['air-earth-low'] = () => airAt('earth', 3, 0.05, 4);
SCENES['air-mars'] = () => airAt('mars', 3, 0.05, 4);
SCENES['air-venus'] = () => airAt('venus', 4, 0.05, 4);
SCENES['air-moon'] = () => airAt('moon', 3, 0.05, 4);
SCENES['air-mercury'] = () => airAt('mercury', 3, 0.05, 4);
SCENES['air-jupiter'] = () => airAt('jupiter', 1, 0.05, 3);
SCENES['air-saturn'] = () => airAt('saturn', 1, 0.05, 3);

// Each house's ships, fighter to capital, in a line: the ship-art reference view.
for (const h of HOMES) {
  SCENES['ladder-' + h] = async () => {
    free();
    const v = V();
    const at = emptySpace();
    v.duel.clear?.();
    v.duel.lineup('ladder', at, [0, 0, -1], 4, h);
    v.duel.root.updateMatrixWorld(true);
    const r = frameObj(v.duel.root, [0.55, 0.32, 1], 1.15);
    v.duel.clear?.();
    return r;
  };
}

// A dogfight between two houses: their fighters, then their cruisers, with bolts in the air.
const PAIRS = [['earth', 'mars'], ['moon', 'venus'], ['mercury', 'jupiter'], ['saturn', 'mars']];
for (const [a, b] of PAIRS) {
  for (const type of ['fighter', 'cruiser', 'destroyer', 'capital']) {
    SCENES[`duel-${type}-${a}-${b}`] = async () => {
      free();
      const v = V();
      const at = emptySpace();
      v.duel.start({ type, nation: a }, { type, nation: b }, at, [0, 0, -1], 0.45, 4, 3);
      for (let i = 0; i < 40; i++) v.duel.update(1 / 30);
      v.duel.root.updateMatrixWorld(true);
      const [oa, ob] = v.duel.root.children.filter((c) => c.isGroup || c.children?.length).slice(0, 2);
      const sa = new THREE.Box3().setFromObject(oa).getBoundingSphere(new THREE.Sphere());
      const sb = new THREE.Box3().setFromObject(ob).getBoundingSphere(new THREE.Sphere());
      const ca = sa.center.toArray(), cb = sb.center.toArray();
      const away = unit(sub(ca, cb));
      const side = unit([away[2], 0, -away[0]]);
      const cam = add(add(add(ca, mul(away, sa.radius * 2.6)), mul(side, sa.radius * 1.4)), [0, sa.radius * 0.9, 0]);
      const look = add(mul(ca, 0.45), mul(cb, 0.55));
      const r = A.shoot(cam, look, [0, 1, 0], { clean: false });
      return { ...r, info: { near: v.camera.near, ships: v.duel.state.ships.map((s) => `${s.nation} ${s.type} ${s.hp}/${s.maxHp}`) } };
    };
  }
}

// The live game's own fight: behind a hostile near Mars with the guns going.
SCENES['fight-live'] = async () => {
  free();
  const v = V();
  v.duel.clear?.();
  const m = A.geo('mars');
  const foes = v.combat.crafts.filter((c) => c.alive && c.hostile && !c.drill);
  foes.sort((a, b) => Math.hypot(...a.pos.map((x, i) => x - m.pos[i])) - Math.hypot(...b.pos.map((x, i) => x - m.pos[i])));
  const f = foes.find((c) => c.type === 'cruiser') ?? foes[0];
  if (!f) return 'no foes';
  const back = f.radius * 5;
  const pos = [f.pos[0] + back, f.pos[1] + back * 0.25, f.pos[2] + back];
  AT.pose(pos, sub(f.pos, pos));
  v.firing.current = true;
  await wait(2200);
  return { screen: true, info: { foe: f.nation + ' ' + f.type, kills: v.combat.stats.kills }, after: `__voyage.firing.current = false; return 'ok'` };
};
SCENES['fight-missile'] = async () => {
  const v = V();
  const w = v.loadout?.weapons ?? null;
  try { v.selectSlot(2); } catch { /* */ }
  v.firing.current = true;
  await wait(900);
  return { screen: true, info: { weapon: v.weapon, w }, after: `__voyage.firing.current = false; return 'ok'` };
};
SCENES['swarm'] = async () => {
  const v = V();
  let r = 'no select';
  try { v.selectSlot(5); r = 'slot ' + v.slot; } catch (e) { r = String(e); }
  v.firing.current = true;
  await wait(1800);
  return { screen: true, info: { r, role: v.swarmRole, mine: v.swarms?.stats ?? null }, after: `__voyage.firing.current = false; return 'ok'` };
};
SCENES['boarders'] = async () => {
  const v = V();
  const ext = v.ext ?? {};
  const b = ext.boarding ?? Object.values(ext).find((x) => x && typeof x.board === 'function');
  if (!b) return 'no boarding: ' + Object.keys(ext);
  const r = b.board();
  for (let i = 0; i < 4; i++) { v.run(0.25); }
  await wait(400);
  return { screen: true, info: { launched: !!r, stats: b.stats } };
};
SCENES['nav'] = async () => {
  const btn = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Navigation map');
  btn?.click();
  await wait(1200);
  return { screen: true, after: `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' })); return 'closed'` };
};

export { SCENES };

// Graphics pass 2: the sky inside a thick air, looking up through the layers and down onto them (no HUD).
for (const [id, alt] of [['jupiter', 1], ['saturn', 1], ['venus', 4]]) {
  for (const [dir, tilt] of [['up', 0.55], ['down', -0.35]]) {
    SCENES[`sky-${id}-${dir}`] = async () => {
      await airAt(id, alt, 0.05, 3);
      const v = V();
      const p = v.camera.position.toArray();
      const g = A.geo(id);
      const up = unit(sub(p, g.pos));
      const f = new THREE.Vector3(0, 0, -1).applyQuaternion(v.camera.quaternion).toArray();
      const aim = unit(add(f, mul(up, tilt)));
      return A.shoot(p, add(p, aim), up, { clean: false });
    };
  }
}

// Graphics pass 3 probes (info only): how lit each hero view is, and what fills a screen point in a live view.
SCENES['probe-hero'] = async () => {
  const out = {};
  for (const h of HOMES) {
    const p = await A.heroPose(h);
    const g = A.geo(h);
    const sun = A.geo('sun').pos;
    out[h] = +(unit(sub(sun, g.pos)).reduce((s, x, i) => s + x * unit(sub(p.pos, g.pos))[i], 0)).toFixed(3);
  }
  return { dump: out };
};
function pick(ndc) {
  const v = V();
  const rc = new THREE.Raycaster();
  rc.setFromCamera(new THREE.Vector2(...ndc), v.camera);
  const hits = rc.intersectObjects(v.scene.children, true).filter((x) => x.object.visible && !x.object.isPoints && !x.object.isLine).slice(0, 4);
  return hits.map((x) => {
    const chain = [];
    for (let o = x.object; o && chain.length < 6; o = o.parent) chain.push(o.name || o.type);
    const m = x.object.material;
    return { d: +x.distance.toFixed(1), chain: chain.join(' < '), mat: (Array.isArray(m) ? m[0] : m)?.type, col: (Array.isArray(m) ? m[0] : m)?.color?.getHexString?.(), geo: x.object.geometry?.type, tris: (x.object.geometry?.index?.count ?? 0) / 3 };
  });
}
SCENES['probe-close'] = async () => {
  const out = {};
  for (const [name, pts] of [['station-earth', [[0.8, -0.8], [0.3, -0.7]]], ['close-saturn', [[-0.8, 0.2], [-0.6, -0.3]]], ['close-mars', [[0.6, 0.3]]]]) {
    await SCENES[name]();
    V().run(1 / 30);
    out[name] = pts.map((p) => ({ p, hits: pick(p) }));
  }
  return { dump: out };
};

// Pass 3: the berth close-up as a beauty frame (same camera every run, no HUD): 30 ship lengths off the berth,
// 70 back along it, looking at it, so the plating fills the view the way it does when a ship comes in to dock.
for (const h of HOMES) {
  SCENES['berth-' + h] = async () => {
    free();
    const pl = V().armour?.places?.[h];
    const b = pl?.hardpoints?.find((x) => x.kind === 'berth');
    if (!b) return 'no berth ' + h;
    const L = 0.18 * 2.06;
    const n = unit(b.normal ?? b.up ?? sub(b.pos, pl.frame.centre));
    const t = unit(b.along ?? b.tangent ?? [n[2], 0, -n[0]]);
    const pos = add(add(b.pos, mul(n, 30 * L)), mul(t, -70 * L));
    return A.shoot(pos, b.pos, n, { clean: false });
  };
}
SCENES['probe-duel'] = async () => {
  const v = V();
  const at = emptySpace();
  const out = {};
  const desc = (root) => root.children.map((c) => { const s = new THREE.Box3().setFromObject(c).getBoundingSphere(new THREE.Sphere()); return { n: c.name || c.type, kids: c.children.length, r: +s.radius.toFixed(2), d: +s.center.distanceTo(new THREE.Vector3(...at)).toFixed(1), vis: c.visible }; });
  v.duel.clear?.(); v.duel.lineup('ladder', at, [0, 0, -1], 4, 'mars'); v.duel.root.updateMatrixWorld(true);
  out.ladder = desc(v.duel.root);
  v.duel.clear?.(); v.duel.start({ type: 'fighter', nation: 'earth' }, { type: 'fighter', nation: 'mars' }, at, [0, 0, -1], 0.45, 4, 3);
  for (let i = 0; i < 40; i++) v.duel.update(1 / 30);
  v.duel.root.updateMatrixWorld(true);
  out.duel = desc(v.duel.root);
  v.duel.clear?.();
  return { dump: out };
};

// Dev-only proofs for the art refit (ART-REFIT.md). In the dev server's page, in flight:
//   const A = await import('/scripts/artrefit.js?t=' + Date.now()); await A.hero('mars');
// Poses the camera like a reference sheet's hero view (three-quarter, sun upper left, north up), draws one frame by
// hand (so it works with the browser pane hidden) and POSTs the canvas to a local receiver on :5343, which saves it
// under shots/art-refit/. `perf()` reads draw calls, triangles and CPU time per frame at the same views.
const V = () => window.__voyage;
const sub = (a, b) => a.map((x, i) => x - b[i]);
const add = (a, b) => a.map((x, i) => x + b[i]);
const mul = (a, k) => a.map((x) => x * k);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(...a);
const unit = (a) => mul(a, 1 / len(a));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const D = Math.PI / 180;

export const geo = (id) => V().geo().find((g) => g.id === id);
const sunPos = () => geo('sun').pos;

/** The planet's spin axis (its tilt group's +y), from the armour frame when there is one. */
function spinOf(id) {
  const p = V().armour?.places?.[id];
  if (p) return p.frame.spin;
  return [0, 1, 0];
}

/**
 * A camera direction (planet → camera) for a three-quarter view: the sun `phase` degrees round from the camera, shown
 * toward the upper left of the frame, the camera `elev` degrees above the equator. Brute force over the sphere.
 */
export function heroDir(id, { phase = 55, elev = 18, sunAt = 145, centre } = {}) {
  const c = centre ?? geo(id).pos;
  const S = unit(sub(sunPos(), c));
  const up0 = spinOf(id);
  let best = null;
  let bs = Infinity;
  for (let a = 0; a < 360; a += 2) {
    for (let e = -60; e <= 60; e += 2) {
      // o in the planet's spin frame: azimuth a round the spin axis, elevation e.
      const r0 = unit(cross(up0, Math.abs(up0[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1]));
      const r1 = cross(up0, r0);
      const o = add(mul(up0, Math.sin(e * D)), add(mul(r0, Math.cos(e * D) * Math.cos(a * D)), mul(r1, Math.cos(e * D) * Math.sin(a * D))));
      const F = mul(o, -1);
      const right = unit(cross(F, up0));
      const up = cross(right, F);
      const ph = Math.acos(Math.max(-1, Math.min(1, dot(o, S)))) / D;
      const ang = Math.atan2(dot(S, up), dot(S, right)) / D;
      let da = Math.abs(ang - sunAt); if (da > 180) da = 360 - da;
      const s = (ph - phase) ** 2 + 0.5 * da ** 2 + 2 * (e - elev) ** 2;
      if (s < bs) { bs = s; best = o; }
    }
  }
  return best;
}

/** Hide the player's ship and its trails for a beauty shot (they sit at the camera). */
function hideShip(on) {
  const v = V();
  v.scene.traverse((o) => { if (o.userData?.playerShip || o.name === 'playerShip') o.visible = !on; });
}

/** Labels and orbit lines off for a clean comparison with the sheets (they are game UI, not art); returns a restore. */
export function declutter() {
  const off = [];
  V().scene.traverse((o) => {
    const label = o.isSprite && o.material && o.material.sizeAttenuation === false;
    if ((label || o.isLine) && o.visible) { o.visible = false; off.push(o); }
  });
  return () => off.forEach((o) => { o.visible = true; });
}

/** Place the camera at `pos` looking at `at` with `up`, refresh what depends on the camera, draw, return the canvas. */
export function shoot(pos, at, up = [0, 1, 0], { w = 1280, h = 720, fov, clean = true } = {}) {
  const v = V();
  const s = v.ship;
  // Park the ship well behind the camera so its model never enters the frame, engines off.
  const back = unit(sub(pos, at));
  s.pos.set(...add(pos, mul(back, 3)));
  s.speed = 0; s.vel.set(0, 0, 0);
  v.input.autopilot.current = null; v.input.throttle.current = 0;
  v.draw.on = false;
  v.run(1 / 30);
  v.draw.on = true;
  const r = v.renderer;
  r.setPixelRatio(1);
  r.setSize(w, h, false);
  v.composer.setSize(w, h);
  const cam = v.camera;
  if (fov) cam.fov = fov;
  cam.aspect = w / h;
  cam.position.set(...pos);
  cam.up.set(...up);
  cam.lookAt(...at);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
  v.armour?.update(0, performance.now() / 1000, cam);
  v.ext?.layers?.forEach?.((l) => l.update?.(0, performance.now() / 1000, cam));
  const restore = clean ? declutter() : () => {};
  r.info.autoReset = false;
  r.info.reset();
  const t0 = performance.now();
  v.composer.render(0);
  const ms = performance.now() - t0;
  const info = { calls: r.info.render.calls, triangles: r.info.render.triangles, renderMs: +ms.toFixed(1) };
  r.info.autoReset = true;
  const url = r.domElement.toDataURL('image/jpeg', 0.9);
  restore();
  return { url, info };
}

export async function post(name, url) {
  return fetch('http://localhost:5343/' + name, { method: 'POST', body: url }).then((x) => x.text()).catch((e) => 'no receiver: ' + e);
}

/** How far out a world's whole structure is (planet radii): Saturn's rings and wall, Mercury's wings, Mars's moons. */
const REACH = { earth: 1.75, moon: 1.4, mercury: 2.1, venus: 1.35, mars: 1.9, jupiter: 1.6, saturn: 2.5, sun: 1.2 };

/**
 * Each sheet's hero view, as a camera direction in the structure's own axes (x toward Earth, y north, z east):
 * azimuth from x toward z and elevation, degrees. Chosen to show the structure as the sheet does with the game's
 * Sun as near the upper left as its fixed place allows.
 */
export const HERO = { earth: [110, 20], moon: [22, 12], mercury: [168, 10], venus: [28, 14], mars: [0, 20], jupiter: [80, 18], saturn: [40, 22] };

let armourMod = null;
async function axes(id) {
  armourMod = armourMod ?? (await import('/src/lib/megastructure/armour.ts'));
  return armourMod.axesOf(V().armour.places[id].frame);
}
const fromLocal = (ax, a, e) => {
  const c = Math.cos(e * D);
  return unit(add(add(mul(ax.x, c * Math.cos(a * D)), mul(ax.y, Math.sin(e * D))), mul(ax.z, c * Math.sin(a * D))));
};

/** The hero view of a world: the whole structure in frame, three-quarter, north up. */
export async function heroPose(id, o = {}) {
  const g = geo(id);
  const v = V();
  const fov = v.camera.fov;
  const k = (REACH[id] ?? 1.4) * (o.zoom ?? 1);
  const dist = (g.size * k) / Math.tan((fov / 2) * D) * 1.05;
  let dir = o.dir;
  let up = spinOf(id);
  if (!dir && HERO[id] && V().armour) {
    const ax = await axes(id);
    const [a, e] = o.local ?? HERO[id];
    dir = fromLocal(ax, a, e);
    up = ax.y;
  }
  dir = dir ?? heroDir(id, o);
  return { pos: add(g.pos, mul(dir, dist)), at: g.pos, up };
}

export async function hero(id, name = `${id}-hero`, o = {}) {
  const p = await heroPose(id, o);
  const arm = V().armour;
  if (o.bare && arm) arm.show.on = false;
  const { url, info } = shoot(p.pos, p.at, p.up, o);
  if (o.bare && arm) arm.show.on = true;
  const saved = await post(name, url);
  return { saved, info };
}

/** Frame cost at a pose: draw calls and triangles of one composed frame, and CPU ms per frame (sim only, and sim + draw). */
export function perfAt(pose) {
  const v = V();
  const { info } = shoot(pose.pos, pose.at, pose.up);
  const N = 30;
  v.draw.on = false;
  let t0 = performance.now();
  v.run(N / 30);
  const sim = (performance.now() - t0) / N;
  v.draw.on = true;
  // Rendering through run() moves the camera behind the ship: still the same world in view, for timing only.
  t0 = performance.now();
  v.run(10 / 30);
  const all = (performance.now() - t0) / 10;
  return { ...info, simMs: +sim.toFixed(2), frameCpuMs: +all.toFixed(2) };
}

export async function perf(ids = ['earth', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn']) {
  const out = {};
  for (const id of ids) out[id] = perfAt(await heroPose(id));
  return out;
}

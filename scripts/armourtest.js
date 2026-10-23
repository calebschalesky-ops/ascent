// Dev-only proofs for the god armour. In the dev server's page, in flight:
//   const A = await import('/scripts/armourtest.js'); await A.views();
// Drives frames with window.__voyage.run, so it works with the browser pane hidden. Frames are read from the canvas in
// the same task as the render and POSTed to a local receiver on :5343 (saved as shots/armour/<name>.jpg).
const V = () => window.__voyage;
const L = 0.18 * 2.06;
const sub = (a, b) => a.map((x, i) => x - b[i]);
const add = (a, b) => a.map((x, i) => x + b[i]);
const mul = (a, k) => a.map((x) => x * k);
const len = (a) => Math.hypot(...a);
const unit = (a) => mul(a, 1 / len(a));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Put the ship at `pos` with its nose along `fwd`, engines off, autopilot off; the camera snaps behind it. */
export function pose(pos, fwd) {
  const v = V();
  const s = v.ship;
  s.pos.set(...pos);
  const l = len(fwd);
  s.yaw = Math.atan2(-fwd[0], -fwd[2]);
  s.pitch = Math.asin(fwd[1] / l);
  s.speed = 0; s.vel.set(0, 0, 0); s.yawRate = 0; s.pitchRate = 0;
  v.input.autopilot.current = null;
  v.input.throttle.current = 0;
  v.input.stick.x = 0; v.input.stick.y = 0;
  v.cam.yaw = s.yaw; v.cam.pitch = s.pitch;
  v.camera.position.copy(s.pos);
}

/** Resize, draw one frame and send the canvas to the receiver (shots/armour/<name>.jpg). */
export async function cap(name, w = 960, h = 540) {
  const v = V();
  const r = v.renderer;
  r.setPixelRatio(1);
  r.setSize(w, h, false);
  v.composer.setSize(w, h);
  v.camera.aspect = w / h;
  v.camera.updateProjectionMatrix();
  v.run(1 / 30);
  const url = r.domElement.toDataURL('image/jpeg', 0.85);
  return fetch('http://localhost:5343/' + name, { method: 'POST', body: url }).then((x) => x.text()).catch((e) => 'no receiver: ' + e);
}

const place = (home) => V().armour.places[home];

/** From approach distance: `k` radii out, on the side the structure faces, a little above. */
export async function approachView(home, k = 3.4) {
  const p = place(home);
  const f = p.frame;
  const dir = unit(add(mul(f.face, 0.9), mul(f.spin, home === 'jupiter' ? 0.75 : home === 'mercury' ? 0.5 : 0.28)));
  const pos = add(f.centre, mul(dir, f.R * k));
  // Aim a little below the centre, so the world sits above the ship in the frame rather than behind it.
  pose(pos, sub(sub(f.centre, mul([0, 1, 0], f.R * 0.62)), pos));
  V().run(0.5);
  return cap(`${home}-approach`);
}

/** Close in: beside the first berth, `up` ship lengths over the plating, looking along it at the cradle and the moored capital ship. */
export async function closeView(home, up = 30, back = 70) {
  const b = V().armour.places[home].hardpoints.find((h) => h.kind === 'berth');
  const n = b.normal;
  const t = unit(cross(n, cross(V().armour.places[home].frame.pole, n)));
  const pos = add(add(b.pos, mul(n, up * L)), mul(t, -back * L));
  pose(pos, sub(add(b.pos, mul(n, 4 * L)), pos));
  V().run(0.2);
  return cap(`${home}-close`);
}

/** Every structure from approach distance and from close in. */
export async function views(homes = ['earth', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn']) {
  const out = [];
  for (const h of homes) { out.push(await approachView(h)); out.push(await closeView(h)); }
  return out;
}

/** Fly `seconds` in steps, stopping early when `done()` is true. */
function flyUntil(done, seconds, step = 0.5) {
  let t = 0;
  V().draw.on = false; // fly without drawing: the checks read numbers, and the shots draw their own frame
  try { while (t < seconds && !done()) { V().run(step); t += step; } } finally { V().draw.on = true; }
  return t;
}

/**
 * Autopilot docking: from parked off the planet (its stop distance, on the far side from the berth when `far`),
 * the autopilot flies to the berth and docks itself. Reports time, the closest the ship came to the plating's outer
 * radius while flying, and armour hits.
 */
export async function autoDock(id, far = true, shot = true) {
  const v = V();
  const g = v.places.get(id);
  const home = id.split('-')[1];
  const f = place(home).frame;
  const out = far ? mul(g.out, -1) : g.out;
  const start = add(f.centre, mul(unit(add(out, [0, 0.2, 0])), f.R * 2.9 + 111));
  pose(start, sub(f.centre, start));
  v.dbg.armourHits = 0; v.dbg.armourMin = Infinity; v.dbg.autoDocks.length = 0;
  v.actions.fly(id);
  // Stop for a frame near the end of the docking run (the docked screen draws no scene), then finish it.
  let t = flyUntil(() => v.dock?.phase === 'docked' || (v.dock?.phase === 'in' && v.dock.t > 2.6), 240, 0.1);
  const inShot = shot && v.dock?.phase === 'in' ? await cap(`${home}-docking`) : null;
  t += flyUntil(() => v.dock?.phase === 'docked', 10, 0.1);
  const res = { id, seconds: t, docked: v.dock?.phase === 'docked', autoDocked: v.dbg.autoDocks.includes(id), armourHits: v.dbg.armourHits, closestOverPlatingSL: +(v.dbg.armourMin / L).toFixed(1), distToCradleSL: +(v.ship.pos.distanceTo(new v.ship.pos.constructor(...g.cradle)) / L).toFixed(2) };
  res.shot = inShot;
  return res;
}

/**
 * Hand docking, as a pilot would: arrow keys and A/D to keep the nose on the berth's approach point, W/S to hold a slow
 * speed, then L once the "Dock" prompt is up. No autopilot at any point.
 */
export async function handDock(id) {
  const v = V();
  if (v.dock) { v.undock(); v.run(1.5); }
  const g = v.places.get(id);
  const start = add(g.pos, mul(unit(add(mul(g.out, 1.2), cross(g.out, [0, 1, 0]))), 90 * L));
  pose(start, add(sub(g.pos, start), mul(cross(g.out, [0, 1, 0]), 30 * L))); // not quite pointing at it
  v.dbg.armourHits = 0;
  v.dbg.autoDocks.length = 0;
  const k = v.input.keys;
  const press = (key, on) => (on ? k.add(key) : k.delete(key));
  let t = 0;
  v.draw.on = false;
  try {
    for (; t < 90 && v.dockable !== id; t += 1 / 30) {
      const s = v.ship;
      const to = sub(g.pos, s.pos.toArray());
      const d = len(to);
      const wy = Math.atan2(-to[0], -to[2]);
      const wp = Math.asin(to[1] / d);
      let ey = wy - s.yaw; ey -= Math.PI * 2 * Math.round(ey / (Math.PI * 2));
      const ep = wp - s.pitch;
      press('a', ey > 0.03); press('d', ey < -0.03);
      press('arrowup', ep > 0.03); press('arrowdown', ep < -0.03);
      const want = Math.min(12, d * 0.4); // ship lengths a second... in units
      v.input.throttle.current = s.speed < want * L ? Math.min(1, v.input.throttle.current + 0.01) : Math.max(0, v.input.throttle.current - 0.02);
      v.run(1 / 30);
    }
  } finally { v.draw.on = true; ['a', 'd', 'arrowup', 'arrowdown'].forEach((x) => k.delete(x)); v.input.throttle.current = 0; }
  const reach = v.dockable === id;
  const shotPrompt = await cap('hand-reach');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }));
  window.dispatchEvent(new KeyboardEvent('keyup', { key: 'l' }));
  flyUntil(() => v.dock?.phase === 'docked', 10, 0.1);
  return { id, flewSeconds: +t.toFixed(1), inReach: reach, docked: v.dock?.phase === 'docked', byL: v.dbg.docks.includes(id) && !v.dbg.autoDocks.includes(id), armourHits: v.dbg.armourHits, shot: shotPrompt };
}

/** Ram the plating: full throttle straight down at a plated cell. The ship must stop on top, never get through. */
export function ram(home) {
  const v = V();
  if (v.dock) { v.undock(); v.run(1.5); }
  const p = place(home);
  const f = p.frame;
  // A plated cell whose neighbours are plated too, well away from every mount, about a third of the way down the grid.
  const g = v.armour.gridOf(home);
  const dirOf = (i, j) => {
    const th = (i + 0.5) * g.dt;
    const ph = ((j + 0.5) / g.per[i]) * Math.PI * 2 - Math.PI;
    return unit(add(add(mul(f.pole, Math.cos(th)), mul(f.ref, Math.sin(th) * Math.cos(ph))), mul(f.side, Math.sin(th) * Math.sin(ph))));
  };
  let d = null;
  for (let i = Math.floor(g.rings / 3); i < g.rings - 2 && !d; i++) {
    for (let j = 2; j < g.per[i] - 2 && !d; j++) {
      const k = g.start[i] + j;
      if (!g.plates[k] || !g.plates[k - 1] || !g.plates[k + 1] || !g.plates[k - 2] || !g.plates[k + 2]) continue;
      const q = dirOf(i, j);
      if (p.hardpoints.every((h) => Math.acos(Math.min(1, h.normal[0] * q[0] + h.normal[1] * q[1] + h.normal[2] * q[2])) > g.dt * 4)) d = q;
    }
  }
  const start = add(f.centre, mul(d, f.rOut + 120 * L));
  pose(start, mul(d, -1));
  v.dbg.armourHits = 0;
  v.input.throttle.current = 1;
  let minR = Infinity;
  v.draw.on = false;
  try { for (let i = 0; i < 300; i++) { v.run(1 / 30); minR = Math.min(minR, len(sub(v.ship.pos.toArray(), f.centre))); } } finally { v.draw.on = true; v.input.throttle.current = 0; }
  return { home, hits: v.dbg.armourHits, lowestOverInnerSL: +((minR - f.rIn) / L).toFixed(2), thicknessSL: +((f.rOut - f.rIn) / L).toFixed(1), heldAbovePlating: minR > f.rIn };
}

/** Collisions on a grand tour, and on approaches to every world's berths. */
export async function tour(stops = ['earth', 'moon', 'mercury', 'venus', 'sun', 'mars', 'jupiter', 'saturn', 'stars']) {
  const v = V();
  if (v.dock) { v.undock(); v.run(1.5); }
  v.dbg.armourHits = 0; v.dbg.armourContacts = 0; v.dbg.hits = 0;
  const legs = [];
  for (const s of stops) {
    const n0 = v.dbg.parks.length;
    v.actions.fly(s);
    const t = flyUntil(() => v.dbg.parks.length > n0, 300, 1);
    legs.push({ to: s, seconds: t, parked: v.dbg.parks.length > n0 });
  }
  return { legs, armourHits: v.dbg.armourHits, armourContacts: v.dbg.armourContacts, surfaceHits: v.dbg.hits };
}

/**
 * Frame time with a structure filling the view: the ship close over the plating, looking across it. Each frame is
 * forced to finish (a 1-pixel read) so the GPU's time counts. Median of `n`.
 */
export function frameTime(home, n = 40, armour = true) {
  const v = V();
  v.armour.show.on = armour;
  const b = place(home).hardpoints.find((h) => h.kind === 'berth');
  const f = place(home).frame;
  const t = unit(cross(b.normal, f.pole));
  const pos = add(b.pos, mul(b.normal, f.R * 0.04));
  pose(pos, add(mul(t, 1), mul(b.normal, -0.35)));
  const gl = v.renderer.getContext();
  const px = new Uint8Array(4);
  const ms = [];
  v.run(0.1);
  const info = v.renderer.info;
  info.autoReset = false; // the composer renders several passes a frame: count them all
  let calls = 0;
  let tris = 0;
  try {
    for (let i = 0; i < n; i++) {
      info.reset();
      const t0 = performance.now();
      v.run(1 / 30);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      ms.push(performance.now() - t0);
      calls = info.render.calls; tris = info.render.triangles;
    }
  } finally { info.autoReset = true; v.armour.show.on = true; }
  ms.sort((a, b) => a - b);
  return { home, armour, median: +ms[n >> 1].toFixed(1), p90: +ms[Math.floor(n * 0.9)].toFixed(1), ...v.armour.stats(), calls, tris };
}

/** From the start screen: Continue if there is a save, else New game as Earth. Resolves once in flight. */
export async function boot() {
  const B = () => [...document.querySelectorAll('button')];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 20 && !B().length; i++) await wait(200);
  const c = B().find((b) => b.textContent.trim().startsWith('Continue'));
  if (c) c.click();
  else { B().find((b) => b.textContent.trim() === 'New game')?.click(); await wait(400); B().find((b) => b.textContent.startsWith('Earth'))?.click(); }
  for (let i = 0; i < 40 && !window.__voyage?.armour; i++) await wait(200);
  return !!window.__voyage?.armour;
}

/** Every flight proof in one go; results land in window.R as they come (for a caller that polls). */
export async function proveAll(only = null, skipApproaches = false) {
  const v = V();
  const R = (window.R = { dock: [], hand: null, tour: null, approaches: [], frames: [] });
  const free = () => { if (v.dock) { v.undock(); v.run(1.5); } };
  free();
  for (const id of only ?? ['stn-earth-1', 'stn-moon-1', 'stn-mercury-1', 'stn-venus-1', 'stn-mars-1', 'stn-jupiter-1', 'stn-saturn-1']) {
    const r = await autoDock(id, true, true);
    R.dock.push(r);
    free();
  }
  // Approaches to every berth from both sides of its world, near and far, no shots.
  for (const id of skipApproaches ? [] : ['stn-earth-2', 'stn-earth-3', 'stn-moon-2', 'stn-mercury-2', 'stn-venus-2', 'stn-mars-2', 'stn-mars-3', 'stn-jupiter-2', 'stn-jupiter-3', 'stn-jupiter-4', 'stn-saturn-2', 'stn-saturn-3']) {
    for (const far of [true, false]) { const r = await autoDock(id, far, false); R.approaches.push({ id, far, docked: r.docked, hits: r.armourHits, closest: r.closestOverPlatingSL }); free(); }
  }
  R.hand = await handDock('stn-mars-2');
  free();
  R.ram = ['earth', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'].map(ram);
  R.tour = await tour();
  return R;
}

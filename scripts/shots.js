// Dev-only frame capture for the graphics audit. In the dev server's page:
//   const s = await import('/scripts/shots.js'); await s.all('before');
// Poses the ship, drives frames with window.__voyage.run, reads the canvas in the same task and POSTs each JPEG to a
// tiny local receiver on :5309 (see THREAD-LOG 2026-10-18 graphics). True frames even when the browser pane is hidden.
const V = () => window.__voyage;
const at = (lon, r, y = 0) => { const a = (lon * Math.PI) / 180; return [r * Math.cos(a), y, -r * Math.sin(a)]; };
export const BODIES = {
  earth: { pos: [0, 0, 0], size: 2 },
  mars: { pos: at(0, 800), size: 1.064 },
  sun: { pos: at(58, 450), size: 218.4 },
  saturn: { pos: at(200, 1000), size: 18.28 },
  jupiter: { pos: at(116, 900), size: 21.95 },
};

export function size(w = 1280, h = 720) {
  const v = V();
  v.renderer.setPixelRatio(1);
  v.renderer.setSize(w, h, false);
  v.composer?.setSize(w, h);
  v.bloom?.resolution.set(w / 2, h / 2);
  v.camera.aspect = w / h;
  v.camera.updateProjectionMatrix();
}

/** Put the ship at `pos` with its nose on `look`, engines off; let the camera settle. */
export function pose(pos, look, settle = 1.5) {
  const v = V();
  const s = v.ship;
  const set = () => {
    s.pos.set(...pos);
    const to = [look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]];
    const d = Math.hypot(...to);
    s.yaw = Math.atan2(-to[0], -to[2]);
    s.pitch = Math.asin(to[1] / d);
    s.speed = 0; s.vel.set(0, 0, 0); s.yawRate = 0; s.pitchRate = 0;
  };
  v.input.autopilot.current = null;
  v.input.throttle.current = 0;
  set();
  v.run(settle);
  set();
}

export async function cap(name, w = 1280, h = 720) {
  size(w, h);
  V().run(1 / 30);
  const url = V().renderer.domElement.toDataURL('image/jpeg', 0.9);
  return fetch('http://localhost:5309/' + name, { method: 'POST', body: url }).then((r) => r.text());
}

const off = (b, k, up = 0.15, side = 0.35) => {
  const p = BODIES[b].pos;
  const L = Math.hypot(p[0], p[2]) || 1;
  // Back toward Earth along the ring radius, a little up and to the side, k body radii out.
  const r = BODIES[b].size * k;
  const dir = [-p[0] / L, 0, -p[2] / L];
  const sideV = [-dir[2], 0, dir[0]];
  return [p[0] + (dir[0] + sideV[0] * side) * r, p[1] + r * up, p[2] + (dir[2] + sideV[2] * side) * r];
};

export const SHOTS = {
  start: () => {
    // The fresh start: just outside Earth's outer shell, looking back across Earth.
    pose([8.5, 1.2, 6], [0, 0, 0]);
  },
  mars: () => {
    const m = BODIES.mars;
    const p = off('mars', 5, 0.25, 0.6);
    pose(p, [m.pos[0], m.pos[1], m.pos[2]]);
  },
  sun: () => {
    const s = BODIES.sun;
    const p = off('sun', 1.55, 0.05, 0.9);
    pose(p, [s.pos[0] + s.size * 0.3, s.pos[1], s.pos[2]]);
  },
  saturn: () => {
    const s = BODIES.saturn;
    const p = off('saturn', 4.2, 0.55, -0.9);
    pose(p, s.pos);
  },
  stars: () => {
    const p = at(30, 1150, 20);
    pose(p, at(60, 1600, 160));
  },
  fight: async () => {
    // Mars's patrol: come up behind one, a missile first, then lasers held until it breaks apart; the frame is taken
    // a moment after the kill, with the fireball, debris, shockwave and the missile's smoke still in the air.
    const v = V();
    const c = v.combat.crafts.find((x) => x.nation === 'mars' && x.alive) || v.combat.crafts.find((x) => x.hostile && x.alive);
    const k0 = v.combat.stats.kills;
    pose([c.pos[0] - 10, c.pos[1] + 2, c.pos[2] + 4], c.pos, 0.5);
    v.setWeapon('missile');
    v.firing.current = true;
    v.run(1 / 30);
    v.firing.current = false;
    v.run(0.5);
    v.setWeapon('laser');
    v.firing.current = true;
    for (let i = 0; i < 120 && v.combat.stats.kills === k0; i++) {
      const s = v.ship;
      const to = [c.pos[0] - s.pos.x, c.pos[1] - s.pos.y, c.pos[2] - s.pos.z];
      s.yaw = Math.atan2(-to[0], -to[2]);
      s.pitch = Math.asin(to[1] / Math.hypot(...to));
      v.run(1 / 30);
    }
    v.firing.current = false;
    v.run(0.25);
  },
};

/** Extra effect frames, after the overhaul only: boosting through open space, a missile in flight, a shield hit. */
export const EXTRAS = {
  boost: () => {
    const v = V();
    pose(at(150, 300, 10), at(150, 700, 10), 0.3);
    v.input.throttle.current = 1;
    v.input.boost.current = true;
    v.run(2.5);
    v.input.boost.current = false;
  },
  missile: () => {
    const v = V();
    v.input.throttle.current = 0;
    const c = v.combat.crafts.find((x) => x.nation === 'jupiter' && x.alive) || v.combat.crafts.find((x) => x.hostile && x.alive);
    pose([c.pos[0] - 14, c.pos[1] + 3, c.pos[2] + 9], c.pos, 0.5);
    v.setWeapon('missile');
    v.firing.current = true;
    v.run(0.9);
    v.firing.current = false;
    v.run(0.15);
  },
  shield: () => {
    const v = V();
    const c = v.combat.crafts.find((x) => x.nation === 'saturn' && x.alive) || v.combat.crafts.find((x) => x.alive);
    pose([c.pos[0] - 4, c.pos[1] + 0.8, c.pos[2] + 1.5], c.pos, 0.5);
    v.fx.spawnShieldHit(c.pos, 0.55, [c.pos[0] - 1, c.pos[1] + 0.2, c.pos[2] + 0.4], { color: 0x5ac8ff });
    v.run(0.12);
    v.fx.spawnShieldHit(c.pos, 0.55, [c.pos[0] - 0.6, c.pos[1] - 0.5, c.pos[2] + 0.7], { color: 0x5ac8ff });
    v.run(0.1);
  },
};

export async function extras(prefix = 'after') {
  const out = [];
  for (const [k, f] of Object.entries(EXTRAS)) {
    await f();
    out.push(await cap(`${prefix}-${k}.jpg`));
  }
  return out;
}

export async function all(prefix = 'before') {
  const out = [];
  for (const [k, f] of Object.entries(SHOTS)) {
    await f();
    out.push(await cap(`${prefix}-${k}.jpg`));
  }
  return out;
}

/**
 * Frame time (ms) over n frames drawn back to back at w×h: each frame is followed by a 1-pixel readPixels so the GPU
 * work is counted. Returns the median (integrated GPUs change clocks, so a mean is noisy); 30 frames warm up first.
 */
export function frameTime(n = 120, w = 1280, h = 720) {
  size(w, h);
  const v = V();
  const gl = v.renderer.getContext();
  const px = new Uint8Array(4);
  for (let i = 0; i < 30; i++) { v.run(1 / 30); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
  const t = [];
  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    v.run(1 / 30);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    t.push(performance.now() - t0);
  }
  t.sort((a, b) => a - b);
  return +t[Math.floor(n / 2)].toFixed(1);
}

// Dev-only checks for flight in air. In the dev server's page (after New flight):
//   const A = await import('/scripts/airtest.js'); await A.descend();
// Drives frames with window.__voyage.run, so it works with the browser pane hidden. Frames are read from the canvas
// in the same task as the render and POSTed to a local receiver (cap), so they are the real frame, not a stale one.
const V = () => window.__voyage;

/** Invert the stick shaping in Voyage (dead zone 0.08, then 0.35t + 0.65t²): the stick that gives pitch input p. */
export function stickFor(p) {
  const a = Math.min(1, Math.abs(p));
  if (a < 1e-3) return 0;
  const t = (-0.35 + Math.sqrt(0.1225 + 2.6 * a)) / 1.3;
  return -Math.sign(p) * (0.08 + 0.92 * t);
}

/** Put the ship at `pos` with its nose along `fwd`, engines off, autopilot off. */
export function pose(pos, fwd) {
  const v = V();
  const s = v.ship;
  s.pos.set(...pos);
  const l = Math.hypot(...fwd);
  s.yaw = Math.atan2(-fwd[0], -fwd[2]);
  s.pitch = Math.asin(fwd[1] / l);
  s.speed = 0; s.vel.set(0, 0, 0); s.yawRate = 0; s.pitchRate = 0;
  v.input.autopilot.current = null;
  v.input.throttle.current = 0;
  v.input.stick.x = 0; v.input.stick.y = 0;
}

/** What the HUD shows in air, plus the sky. */
export function log() {
  const v = V();
  const a = v.air.hud(v.ship);
  const dome = v.scene.getObjectByName('air-sky');
  const u = dome.material.uniforms;
  return {
    alt: a ? +a.alt.toFixed(2) : null, airspeed: a ? +a.airspeed.toFixed(1) : +v.ship.vel.length().toFixed(1),
    rho: a ? +a.density.toFixed(4) : 0, glow: a ? +a.glow.toFixed(2) : 0, warn: a?.warn ?? false, limited: a?.limited ?? false,
    sky: dome.visible ? { cover: +u.uCover.value.toFixed(3), zenith: '#' + u.uZenith.value.getHexString(), horizon: '#' + u.uHorizon.value.getHexString() } : 'black (space)',
    inAir: v.air.body, speed: +v.ship.speed.toFixed(1),
  };
}

/**
 * Pace the frames to real time (30 a second) and let the browser deliver worker messages (built ground) between
 * them, as it does between real frames. Without this the test flies faster than the ground can stream.
 */
let due = 0;
const ch = new MessageChannel();
const tick = () => new Promise((r) => { ch.port1.onmessage = () => r(); ch.port2.postMessage(0); });
// Message-channel yields are not throttled in a hidden page (timers are): spin on them until the frame is due,
// which lets worker messages in between.
export const yieldNow = async () => {
  due = Math.max(due + 1000 / 30, performance.now() - 100);
  do await tick(); while (performance.now() < due);
};

/** One or more frames of a pilot holding a pitch against the local horizon (radians), optionally a yaw rate. */
export async function fly(pitchWant, frames = 1, yawIn = 0) {
  const v = V();
  let ms = 0;
  for (let i = 0; i < frames; i++) {
    const p = v.air.active ? v.air.local.pitch : v.ship.pitch;
    v.input.stick.y = stickFor((pitchWant - p) * 2.5);
    v.input.stick.x = -yawIn;
    const t = performance.now();
    v.run(1 / 30);
    ms += performance.now() - t;
    await yieldNow();
  }
  v.input.stick.y = 0; v.input.stick.x = 0;
  return ms;
}

/** Resize, draw one frame and send the canvas to the receiver on :5310 (saved as shots/<name>.jpg). */
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
  return fetch('http://localhost:5310/' + name, { method: 'POST', body: url }).then((x) => x.text()).catch((e) => 'no receiver: ' + e);
}

const sunDir = () => { const s = V().scene.getObjectByName('air-sky'); return s; };

/** Earth's day side: a point `r` from the centre toward the Sun, and the tangent along the equator. */
export function earthDay(r) {
  const sun = V().world.frames.get('sun').spin.getWorldPosition(V().ship.pos.clone());
  const d = [sun.x, 0, sun.z];
  const l = Math.hypot(...d);
  const rad = d.map((x) => x / l);
  return { pos: rad.map((x) => x * r), rad, tan: [rad[2], 0, -rad[0]] };
}

/** From above Earth's air, dive in on the day side, hold a descent, level off low. Returns the log at each stage. */
export async function descend(shots = true) {
  void sunDir;
  const v = V();
  const R = v.world.frames.get('earth').radius;
  const { pos, rad, tan } = earthDay(R * 1.1);
  const a = 0.35;
  pose(pos, tan.map((t, i) => t * Math.cos(a) - rad[i] * Math.sin(a)));
  v.input.throttle.current = 0.7;
  const out = [{ stage: 'orbit, above the air', ...log() }];
  if (shots) out.push(await cap('descend-0-orbit'));
  let shot = 1;
  for (let i = 0; i < 40 * 30; i++) {
    const L = log();
    const want = L.alt === null ? -0.35 : L.alt > 12 ? -0.35 : L.alt > 5 ? -0.18 : L.alt > 2.5 ? -0.05 : 0.0;
    await fly(want, 1);
    if (i % 30 === 0) out.push({ t: i / 30, ...log() });
    if (shots && L.alt !== null && ((shot === 1 && L.alt < 16) || (shot === 2 && L.alt < 8) || (shot === 3 && L.alt < 3))) out.push(await cap('descend-' + shot++ + '-alt' + Math.round(L.alt)));
    if (L.alt !== null && L.alt < 2.6 && i > 60) { v.input.throttle.current = 0.5; break; }
  }
  out.push({ stage: 'low', ...log(), hits: v.air.dbg.terrainHits });
  return out;
}

/**
 * Fly low over the ground for `seconds`: a terrain-following pilot holds `height` above the highest ground it sees
 * ahead (sampled along the velocity), turning gently. Counts collisions with the ground.
 */
export async function lowFlight(seconds = 30, height = 2.5) {
  const v = V();
  const air = v.air;
  const hits0 = air.dbg.terrainHits;
  const t0 = performance.now();
  let frames = 0;
  let minAlt = Infinity;
  let maxAlt = -Infinity;
  let sumV = 0;
  const times = [];
  const frame = v.world.frames.get(air.body);
  const c = frame.spin.getWorldPosition(v.ship.pos.clone());
  const P = v.ship.pos.clone();
  const groundAhead = () => {
    // The highest ground over the next 1.5 s, measured as altitude at those points.
    let worst = Infinity;
    for (const t of [0, 0.3, 0.6, 1.0, 1.5]) {
      P.copy(v.ship.pos).addScaledVector(v.ship.vel, t);
      const h = air.altitudeAt(P);
      worst = Math.min(worst, h);
    }
    return worst;
  };
  for (let i = 0; i < seconds * 30; i++) {
    const ahead = groundAhead();
    const err = ahead - height; // positive: too high
    const want = Math.max(-0.35, Math.min(0.6, -err * 0.12));
    times.push(await fly(want, 1, Math.sin(i / 90) * 0.25));
    frames++;
    const a = log();
    minAlt = Math.min(minAlt, a.alt);
    maxAlt = Math.max(maxAlt, a.alt);
    sumV += a.airspeed;
  }
  void c;
  times.sort((x, y) => x - y);
  return {
    seconds, frames, collisions: air.dbg.terrainHits - hits0, minAlt: +minAlt.toFixed(2), maxAlt: +maxAlt.toFixed(2),
    meanAirspeed: +(sumV / frames).toFixed(1), groundCovered: +((sumV / frames) * seconds).toFixed(0),
    frameMs: { median: +times[times.length >> 1].toFixed(2), p95: +times[Math.floor(times.length * 0.95)].toFixed(2), max: +times[times.length - 1].toFixed(2) },
    wallSeconds: +((performance.now() - t0) / 1000).toFixed(1), terrain: air.terrains.get(air.body)?.stats,
  };
}

/** A body's day side: a point `k` radii from its centre toward the Sun, the outward direction and a tangent. */
export function daySide(id, k) {
  const v = V();
  const f = v.world.frames.get(id);
  const c = f.spin.getWorldPosition(v.ship.pos.clone());
  const sun = v.world.frames.get('sun').spin.getWorldPosition(v.ship.pos.clone());
  const d = [sun.x - c.x, 0, sun.z - c.z];
  const l = Math.hypot(...d);
  const rad = d.map((x) => x / l);
  return { R: f.radius, pos: [c.x + rad[0] * f.radius * k, c.y, c.z + rad[2] * f.radius * k], rad, tan: [rad[2], 0, -rad[0]] };
}

/** Dive into a gas giant's clouds nose down and keep pushing: the pressure stops the ship and pushes it back. */
export async function giantDive(id = 'jupiter', seconds = 30) {
  const v = V();
  const { R, pos, rad, tan } = daySide(id, 1.04);
  const a = 0.7;
  pose(pos, tan.map((t, i) => t * Math.cos(a) - rad[i] * Math.sin(a)));
  v.input.throttle.current = 0.8;
  const pushes0 = v.air.dbg.crushPushes;
  const out = [];
  let shot = 0;
  let deepest = Infinity;
  for (let i = 0; i < seconds * 30; i++) {
    await fly(-0.7, 1);
    const L = log();
    if (L.alt !== null) deepest = Math.min(deepest, L.alt);
    if (i % 60 === 0) out.push({ t: i / 30, ...L, warn: L.warn });
    if (L.alt !== null && ((shot === 0 && L.alt < 60) || (shot === 1 && L.alt < -10) || (shot === 2 && v.air.dbg.crushPushes > pushes0))) out.push(await cap(`${id}-${shot++}`));
    if (v.air.dbg.crushPushes > pushes0 + 2) break;
  }
  return { out, deepest: +deepest.toFixed(1), crushDepth: -(R * 0.012), pushes: v.air.dbg.crushPushes - pushes0, maxDepthFrac: v.air.dbg.maxDepth };
}

/** Climb from low in the air back to space: full throttle, nose up 40°. The space model takes over above the top. */
export async function climbOut(seconds = 20) {
  const v = V();
  v.input.throttle.current = 0.85;
  const out = [];
  for (let i = 0; i < seconds * 30; i++) {
    await fly(0.7, 1);
    if (i % 30 === 0) out.push({ t: i / 30, ...log() });
    if (!v.air.active && i > 30) { out.push({ stage: 'out of the air', ...log() }); break; }
  }
  // A few more seconds in space: speed now follows the throttle as before (no drag, no cap but the throttle's).
  for (let i = 0; i < 90; i++) { v.run(1 / 30); await yieldNow(); }
  out.push({ stage: 'space, 3 s later', ...log(), active: v.air.active });
  return out;
}

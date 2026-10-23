// Dev-only proofs for the ship art pass (art-refit/03-SHIPS.md). In the dev server's page, in flight:
//   const S = await import('/scripts/shipart.js?t=' + Date.now()); await S.views('earth', 'capital');
// Builds the ship exactly as the game does (fleet.ts's styledModel, destroyers.ts, styles/specials.ts, merged by
// material), sets it in the live scene beside the player under the game's own Sun, lights, bloom and tone mapping,
// draws one frame by hand per view (so it works with the browser pane hidden) and POSTs each canvas to a local
// receiver on :5347. `calls()` reads draw calls and triangles for the whole fleet on screen.
const V = () => window.__voyage;
const add = (a, b) => a.map((x, i) => x + b[i]);
const sub = (a, b) => a.map((x, i) => x - b[i]);
const mul = (a, k) => a.map((x) => x * k);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a) => mul(a, 1 / Math.hypot(...a));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

const mods = {};
async function load() {
  const t = Date.now();
  mods.THREE = mods.THREE ?? (await import('/node_modules/.vite/deps/three.js').catch(() => null)) ?? (await import('three'));
  mods.fleet = await import('/src/components/space/fleet.ts?t=' + t);
  mods.dest = await import('/src/components/space/destroyers.ts?t=' + t);
  mods.styles = await import('/src/components/space/styles/index.ts?t=' + t);
  mods.nations = await import('/src/lib/nations.ts');
  return mods;
}

/** The ship as the game builds it, merged by material. */
export async function model(nation, kind) {
  const m = await load();
  const n = m.nations.NATIONS.find((x) => x.id === nation);
  if (kind === 'destroyer') return m.fleet.mergeByMaterial(m.dest.buildDestroyer(nation));
  if (kind === 'special') {
    const sp = m.styles.SPECIALS?.[nation];
    if (!sp) throw new Error('no special for ' + nation);
    return m.fleet.mergeByMaterial(sp.build(m.styles.STYLES[nation].materials(n.color)));
  }
  return m.fleet.styledModel(kind, { id: nation, color: n.color });
}

/**
 * Views like a model sheet's: `hero` three-quarter from the front left and above, `top`, `side` (port, nose left),
 * `front`, `rear`. Each is lit by the game's Sun from over the camera's shoulder: the ship is turned so the face shown
 * points at a camera placed 40° off the Sun line.
 */
const VIEWS = {
  // nose direction and up direction of the ship, in camera space (x right, y up, z toward the camera)
  hero: { nose: [-0.72, -0.22, 0.66], up: [0.1, 0.92, 0.35] },
  // Mercury's sheets swing further round: the shield faces the viewer at a slant so the hull behind it shows.
  heroSide: { nose: [-0.86, -0.2, 0.47], up: [0.1, 0.94, 0.3] },
  top: { nose: [-1, 0, 0], up: [0, 0, 1] },
  side: { nose: [-1, 0, 0], up: [0, 1, 0] },
  front: { nose: [0, 0, 1], up: [0, 1, 0] },
  rear: { nose: [0, 0, -1], up: [0, 1, 0] },
};

/** Renders `obj` (nose −z, up +y) in view `view`; returns the canvas as a JPEG data URL plus frame stats. */
export function shoot(obj, view = 'hero', { w = 960, h = 540, fill = 0.78, name } = {}) {
  const v = V();
  const THREE = mods.THREE;
  const s = v.ship;
  s.speed = 0; s.vel.set(0, 0, 0);
  v.input.autopilot.current = null; v.input.throttle.current = 0;
  v.draw.on = false; v.run(1 / 30); v.draw.on = true;
  // A spot 60 units off the ship, away from the Sun's glare; camera there, ship in front of it.
  const sp = s.pos.toArray();
  const sun = (v.geo().find((g) => g.id === 'sun') ?? { pos: [0, 0, 0] }).pos;
  const S = unit(sub(sun, sp));
  const side = unit(cross(S, Math.abs(S[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
  // Camera axis: 40° off the Sun line so the lit face looks three-dimensional.
  const toCam = unit(add(mul(S, Math.cos(0.7)), mul(side, Math.sin(0.7))));
  // Up: world +y with the camera axis taken out (cross(cross(a, b), a) is b minus its part along a).
  const camUp = unit(Math.abs(toCam[1]) > 0.95 ? [1, 0, 0] : cross(cross(toCam, [0, 1, 0]), toCam));
  const camRight = unit(cross(camUp, toCam));
  const centre = add(sp, mul(side, -60));
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const L = Math.max(size.x, size.y, size.z);
  const holder = new THREE.Group();
  const inner = new THREE.Group();
  inner.add(obj);
  obj.position.copy(box.getCenter(new THREE.Vector3()).negate());
  inner.scale.setScalar(10 / L);
  holder.add(inner);
  // Orient: ship −z along `nose` and +y along `up`, both given in camera space.
  const vw = VIEWS[view];
  const toWorld = (c) => add(add(mul(camRight, c[0]), mul(camUp, c[1])), mul(toCam, c[2]));
  const nose = unit(toWorld(vw.nose));
  let up = toWorld(vw.up);
  up = unit(sub(up, mul(nose, dot(up, nose))));
  const zAxis = mul(nose, -1);
  const xAxis = cross(up, zAxis);
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...xAxis), new THREE.Vector3(...up), new THREE.Vector3(...zAxis));
  holder.quaternion.setFromRotationMatrix(m);
  holder.position.set(...centre);
  v.scene.add(holder);
  holder.updateMatrixWorld(true);
  // Fit: the projected extent across the frame.
  const r = v.renderer;
  r.setPixelRatio(1); r.setSize(w, h, false); v.composer.setSize(w, h);
  const cam = v.camera;
  const fov = cam.fov;
  cam.aspect = w / h;
  // Fit: the extent of every vertex across and up the frame.
  let ex = 0, ey = 0;
  const p = new THREE.Vector3();
  holder.traverse((o) => {
    if (!o.isMesh) return;
    const pos = o.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      const d = [p.x - centre[0], p.y - centre[1], p.z - centre[2]];
      ex = Math.max(ex, Math.abs(dot(d, camRight))); ey = Math.max(ey, Math.abs(dot(d, camUp)));
    }
  });
  const tanY = Math.tan((fov / 2) * Math.PI / 180), tanX = tanY * cam.aspect;
  const dist = Math.max(ex / (tanX * fill), ey / (tanY * fill)) + 5;
  cam.position.set(...add(centre, mul(toCam, dist)));
  cam.up.set(...camUp);
  cam.lookAt(...centre);
  cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
  // A plain backdrop like the sheets' slate, so the hull reads: everything drawn but this ship (sky box, stars,
  // planets, other ships, labels) is hidden for the frame. The ship's own lighting, materials, bloom and tone mapping are the game's.
  const off = [];
  const bg = v.scene.background;
  v.scene.background = new THREE.Color(0x1c2029);
  v.scene.traverse((o) => {
    if (o === holder || !o.visible || holder.getObjectById(o.id)) return;
    // LOD groups too: the renderer re-shows their levels each frame.
    if (o.isLOD || o.isMesh || o.isSprite || o.isLine || o.isPoints) { o.visible = false; off.push(o); }
  });
  // The grade pass draws a sun flare from the last game frame's sun position; this camera is not that one.
  const grade = v.composer.passes.find((x) => x.uniforms?.uSunVis);
  const vis = grade?.uniforms.uSunVis.value;
  if (grade) grade.uniforms.uSunVis.value = 0;
  r.info.autoReset = false; r.info.reset();
  v.composer.render(0);
  if (grade) grade.uniforms.uSunVis.value = vis;
  const info = { calls: r.info.render.calls, triangles: r.info.render.triangles };
  r.info.autoReset = true;
  const url = r.domElement.toDataURL('image/jpeg', 0.92);
  off.forEach((o) => { o.visible = true; });
  v.scene.background = bg;
  v.scene.remove(holder);
  return { url, info, name };
}

export const post = (name, url) => fetch('http://127.0.0.1:5347/' + name, { method: 'POST', body: url }).then((x) => x.text()).catch((e) => 'no receiver: ' + e);

/** All five views of one ship, posted as `<nation>-<kind>-<view>`. */
export async function views(nation, kind, which = ['hero', 'top', 'side', 'front', 'rear']) {
  const out = [];
  for (const view of which) {
    const g = await model(nation, kind);
    const { url, info } = shoot(g, view === 'hero' && nation === 'mercury' ? 'heroSide' : view);
    out.push([view, await post(`${nation}-${kind}-${view}`, url), info.calls]);
  }
  return out;
}

/** Mesh count of each built model (one draw call per mesh once merged). */
export async function meshes() {
  const m = await load();
  const out = {};
  for (const n of m.nations.NATIONS.map((x) => x.id)) {
    out[n] = {};
    for (const k of ['capital', 'cruiser', 'fighter', 'destroyer', 'special']) {
      try { const g = await model(n, k); let c = 0; g.traverse((o) => { if (o.isMesh) c++; }); out[n][k] = c; } catch { out[n][k] = null; }
    }
  }
  return out;
}

/** From the title screen into flight as the Humans (an edit to a model reloads the page). */
export async function fly() {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const click = (re) => {
    const b = [...document.querySelectorAll('button, [role=button]')].find((x) => x.offsetParent && new RegExp(re, 'i').test((x.textContent || x.getAttribute('aria-label') || '').trim()));
    if (b) b.click();
    return !!b;
  };
  for (let i = 0; i < 40 && !click('^New game$'); i++) await wait(250);
  await wait(900); click('Humans'); await wait(700); click('^Play the'); await wait(1200);
  click('^To the hangar'); await wait(1200); click('^Launch the shakedown');
  for (let i = 0; i < 60 && !window.__voyage; i++) await wait(250);
  await wait(4000); click('^Skip tutorial$'); await wait(400); click('^Skip$'); await wait(800);
  return !!window.__voyage;
}

/** The codex ship line-up on screen (ShipLineup.tsx), rasterised at 2× and posted as `codex-<name>`. */
export async function codex(name) {
  const svg = [...document.querySelectorAll('svg')].find((s) => (s.getAttribute('aria-label') || '').startsWith('Ships of the') || s.querySelector('title')?.textContent?.startsWith('Ships of the'));
  if (!svg) return 'no line-up on screen';
  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  await img.decode();
  const c = document.createElement('canvas');
  c.width = 960; c.height = 640;
  c.getContext('2d').drawImage(img, 0, 0, 960, 640);
  return post('codex-' + name, c.toDataURL('image/jpeg', 0.92));
}

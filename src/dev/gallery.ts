/**
 * Dev-only gallery of the nation ship styles (ART-DIRECTION.md), at /gallery.html in the dev server. Not part of the
 * production build: vite builds index.html only.
 *
 * For true frames when the browser pane is hidden: `__gallery.shot(name, opts)` renders and reads the canvas in the
 * same task and POSTs the JPEG to a local receiver (default http://localhost:5307/).
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { STYLES } from '../components/space/styles';
import type { NationId } from '../lib/nations';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const bg = new THREE.Color(0x070a1f);
scene.background = bg;
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.add(new THREE.AmbientLight(0x8090b0, 0.35));
const sun = new THREE.DirectionalLight(0xfff2e0, 3.2);
sun.position.set(-6, 9, -4);
scene.add(sun);
const rim = new THREE.DirectionalLight(0x8fb0ff, 1.4);
rim.position.set(5, 2, 8);
scene.add(rim);

// A few stars.
{
  const n = 1500, pos = new Float32Array(n * 3);
  let s = 3;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    const z = r() * 2 - 1, t = r() * Math.PI * 2, q = Math.sqrt(1 - z * z);
    pos.set([q * Math.cos(t) * 300, z * 300, q * Math.sin(t) * 300], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9aa4c0, size: 1.2, sizeAttenuation: false })));
}

/** Each model centred, fitted so its longer side (length or span) is `size`, and set in a holder for the turntable. */
const fit = (g: THREE.Group, size: number) => {
  const b = new THREE.Box3().setFromObject(g);
  g.position.sub(b.getCenter(new THREE.Vector3()));
  const holder = new THREE.Group();
  const inner = new THREE.Group();
  inner.add(g);
  inner.scale.setScalar(size / Math.max(b.max.z - b.min.z, b.max.x - b.min.x));
  holder.add(inner);
  return holder;
};

const ORDER: NationId[] = ['earth', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
const NAME: Record<NationId, string> = { earth: 'Earth', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn' };
type Kind = 'capital' | 'cruiser' | 'fighter';
interface Ship { name: string; line: string; kind: Kind; nation: NationId; model: THREE.Group; label: HTMLDivElement }
const SHIPS: Ship[] = ORDER.flatMap((n) => {
  const st = STYLES[n];
  const mats = st.materials();
  return (['capital', 'cruiser', 'fighter'] as Kind[]).map((kind) => {
    const label = document.createElement('div');
    label.className = 'label';
    label.innerHTML = `<b>${st.names[kind]}</b>${NAME[n]} ${kind === 'capital' ? 'capital ship' : kind}`;
    document.body.appendChild(label);
    const model = new THREE.Group();
    model.add(fit(st[kind](mats), 1));
    scene.add(model);
    return { name: st.names[kind], line: NAME[n], kind, nation: n, model, label };
  });
});

/**
 * Which ships are on show. `all`: seven columns, capital ships over cruisers over fighters. `capital`, `cruiser` or
 * `fighter`: that kind alone, larger, four over three.
 */
type GallerySet = 'all' | Kind;
let set: GallerySet = 'all';
const at = new Map<Ship, { pos: THREE.Vector3; size: number; drop: number }>();
function layout() {
  at.clear();
  for (const s of SHIPS) {
    let pos: THREE.Vector3 | null = null, size = 1, drop = 1;
    const i = ORDER.indexOf(s.nation);
    if (set === 'all') {
      const row = { capital: 0, cruiser: 1, fighter: 2 }[s.kind];
      pos = new THREE.Vector3((i - 3) * 3.15, [2.7, -0.2, -2.9][row], 0);
      size = [2.8, 1.7, 1.45][row];
      drop = [1.45, 1.0, 1.0][row];
    } else if (s.kind === set) {
      const row = i < 4 ? 0 : 1;
      const col = row === 0 ? i - 1.5 : i - 4 - 1;
      pos = new THREE.Vector3(col * 5.2, row === 0 ? 2.0 : -2.3, 0);
      size = s.kind === 'capital' ? 4.1 : 3.0;
      drop = 1.9;
    }
    s.model.visible = !!pos;
    s.label.style.display = pos ? '' : 'none';
    if (!pos) continue;
    s.model.position.copy(pos);
    s.model.scale.setScalar(size);
    at.set(s, { pos, size, drop });
  }
}
layout();

const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 1000);
camera.position.set(0, 6.5, 22);
camera.lookAt(0, 0, 0);

let yaw = Math.PI - 0.6; // a three-quarter view from the bow
let spinning = false;
let silhouette = false;
const black = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });

function size(w = innerWidth, h = innerHeight) {
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function render() {
  for (const s of SHIPS) s.model.rotation.y = yaw;
  scene.background = silhouette ? new THREE.Color(0xffffff) : bg;
  scene.overrideMaterial = silhouette ? black : null;
  scene.children.forEach((c) => { if (c instanceof THREE.Points) c.visible = !silhouette; });
  renderer.render(scene, camera);
  // Labels under each ship.
  const r = renderer.domElement.getBoundingClientRect();
  for (const [s, a] of at) {
    const p = a.pos.clone().add(new THREE.Vector3(0, -a.drop, 0)).project(camera);
    s.label.style.left = `${r.left + ((p.x + 1) / 2) * r.width}px`;
    s.label.style.top = `${r.top + ((1 - p.y) / 2) * r.height}px`;
    s.label.style.color = silhouette ? '#000' : '';
    s.label.style.textShadow = silhouette ? 'none' : '';
  }
}

let last = performance.now();
function loop(now: number) {
  if (spinning) yaw += (now - last) * 0.0004;
  last = now;
  render();
  requestAnimationFrame(loop);
}
size();
addEventListener('resize', () => size());
requestAnimationFrame(loop);
document.getElementById('spin')!.onclick = () => { spinning = !spinning; };
document.getElementById('sil')!.onclick = () => { silhouette = !silhouette; };
const SETS: GallerySet[] = ['all', 'capital', 'cruiser', 'fighter'];
document.getElementById('set')!.onclick = () => { set = SETS[(SETS.indexOf(set) + 1) % SETS.length]; layout(); };

interface ShotOpts { yaw?: number; silhouette?: boolean; set?: GallerySet; w?: number; h?: number; to?: string }
const gallery = {
  renderer,
  /** Render one frame at a pose and read it back, in the same task. */
  frame(o: ShotOpts = {}) {
    size(o.w ?? 1280, o.h ?? 720);
    renderer.setPixelRatio(1);
    if (o.yaw !== undefined) yaw = o.yaw;
    if (o.set && o.set !== set) { set = o.set; layout(); }
    silhouette = !!o.silhouette;
    render();
    const url = renderer.domElement.toDataURL('image/jpeg', 0.92);
    silhouette = false;
    return url;
  },
  async shot(name: string, o: ShotOpts = {}) {
    const url = gallery.frame(o);
    const res = await fetch((o.to ?? 'http://localhost:5307/') + name, { method: 'POST', body: url });
    size();
    return `${name}: ${url.length} chars, ${await res.text()}`;
  },
};
(window as unknown as { __gallery: typeof gallery }).__gallery = gallery;

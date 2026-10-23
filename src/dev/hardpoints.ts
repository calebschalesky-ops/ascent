/**
 * Dev gallery for HARDPOINTS.md: each nation's cruiser (columns) under four loadouts (rows), drawn as the shipyard
 * draws it. ?n=mars&row=1 shows one ship large. window.__hp.draw(yaw) draws a frame by hand (for a hidden pane).
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Loadout } from '../lib/modules';
import type { NationId } from '../lib/nations';
import { buildPilotShip } from '../components/space/pilotShip';

const NATIONS: NationId[] = ['earth', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
const ROWS: { name: string; l: Loadout }[] = [
  { name: 'Starting fit: pulse laser, seekers', l: { weapons: ['pulse', 'seeker'], shield: 'deflector-1', drones: [], counter: 'flare', targeting: 'targeting-1', reactor: 'reactor-1', armour: null, engine: 'engine-1' } },
  { name: 'Gunship: railguns, plasma, flak, torpedo', l: { weapons: ['rail', 'plasma', 'flak', 'torpedo'], shield: 'bifacet-2', drones: ['attack'], counter: 'chaff', targeting: 'targeting-2', reactor: 'reactor-2', armour: 'armour-1', engine: 'engine-2' } },
  { name: 'Missile boat: seekers, swarm, torpedo, mines', l: { weapons: ['seeker', 'swarm', 'torpedo', 'mine'], shield: 'deflector-2', drones: ['pointDefence'], counter: 'flare', targeting: 'targeting-3', reactor: 'reactor-1', armour: null, engine: 'engine-2' } },
  { name: 'Energy, all Mk III: beam, ion, plasma, pulse', l: { weapons: ['beam', 'ion', 'plasma', 'pulse'], shield: 'hardened-3', drones: ['repair', 'attack'], counter: 'jammer', targeting: 'targeting-3', reactor: 'reactor-3', armour: 'armour-2', engine: 'engine-3' } },
];

const q = new URLSearchParams(location.search);
const one = q.get('n') as NationId | null;
const nations = one ? [one] : NATIONS;
const rows = q.has('row') ? [ROWS[Number(q.get('row'))]] : ROWS;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.setScissorTest(true);
document.body.appendChild(renderer.domElement);
const pmrem = new THREE.PMREMGenerator(renderer);
const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

interface Cell { scene: THREE.Scene; holder: THREE.Group; ship: ReturnType<typeof buildPilotShip>; camera: THREE.PerspectiveCamera; label: HTMLDivElement }
const cells: Cell[] = [];
for (const r of rows) for (const n of nations) {
  const scene = new THREE.Scene();
  scene.environment = env;
  scene.background = new THREE.Color(0x141a2c);
  scene.add(new THREE.AmbientLight(0x8090b0, 0.4));
  const key = new THREE.DirectionalLight(0xfff2e0, 3); key.position.set(-4, 6, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fb0ff, 1.6); rim.position.set(4, 2, -6); scene.add(rim);
  const ship = buildPilotShip(n, { trim: 0, finish: 0 }, r.l);
  const holder = new THREE.Group();
  holder.add(ship.group);
  const sz = new THREE.Box3().setFromObject(ship.group).getSize(new THREE.Vector3());
  ship.group.scale.setScalar(2.2 / Math.max(sz.x, sz.z)); // as the shipyard frames it
  scene.add(holder);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = `${n} · ${r.name}`;
  document.body.appendChild(label);
  cells.push({ scene, holder, ship, camera, label });
}

function draw(yaw = 0.7, time = 1) {
  const W = innerWidth, H = innerHeight;
  renderer.setSize(W, H);
  const cols = one && rows.length > 1 ? 2 : nations.length, nr = Math.ceil(cells.length / cols);
  const cw = W / cols, ch = H / nr;
  cells.forEach((c, i) => {
    const x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
    c.camera.aspect = cw / ch;
    c.camera.updateProjectionMatrix();
    const d = 2.7 / Math.min(1, c.camera.aspect * 0.9);
    c.camera.position.set(Math.sin(yaw) * d, d * 0.42, Math.cos(yaw) * d);
    c.camera.lookAt(0, 0, 0);
    c.ship.update(0.016, 0.4, time);
    renderer.setViewport(x, H - y - ch, cw, ch);
    renderer.setScissor(x, H - y - ch, cw, ch);
    renderer.render(c.scene, c.camera);
    c.label.style.left = `${x + cw / 2}px`;
    c.label.style.top = `${y + 4}px`;
  });
}
(window as unknown as { __hp: unknown }).__hp = { draw };
let yaw = Number(q.get('yaw') ?? 0.7);
const spin = q.has('spin');
renderer.setAnimationLoop((t) => { if (spin) yaw += 0.01; draw(yaw, t / 1000); });

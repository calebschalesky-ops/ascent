/**
 * The drill boarder's model, one per nation, each in its nation's silhouette and colours (ART-DIRECTION.md): a drill
 * on the nose, the troop hold behind it, an engine glow at the tail. Nose toward −z, fitted to the length asked for.
 * The drill is tagged `userData.drill` so the scene can spin it.
 */
import * as THREE from 'three';
import type { NationId } from '../../lib/nations';
import { modelLength } from './fleet';

interface Look { hull: string; dark: string; accent: string; engine: string }
/** Hull base, second hull tone, accent and engine glow, from the art direction's table. */
export const BOARDER_LOOK: Record<NationId, Look> = {
  earth: { hull: '#c9a14a', dark: '#3a3f48', accent: '#3f7fd0', engine: '#9cc8ff' },
  moon: { hull: '#e6e3da', dark: '#b8c0cc', accent: '#2f5fc4', engine: '#e8f0ff' },
  mercury: { hull: '#5a3d22', dark: '#151210', accent: '#e3c52c', engine: '#fff1b8' },
  venus: { hull: '#c9a227', dark: '#0f4a33', accent: '#1d8f5c', engine: '#3dffa0' },
  mars: { hull: '#8a8f96', dark: '#5d6269', accent: '#cc2131', engine: '#bfefff' },
  jupiter: { hull: '#24133a', dark: '#4a2a78', accent: '#ff2fd0', engine: '#ff3df0' },
  saturn: { hull: '#16161e', dark: '#2a2850', accent: '#ffb347', engine: '#ffb347' },
};

function glowTexture(color: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.3, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Shared per nation: materials, the glow texture. Built once, reused by every boarder of that nation. */
export function createBoarderKit() {
  const mats = new Map<NationId, { hull: THREE.Material; dark: THREE.Material; accent: THREE.Material; drill: THREE.Material; glow: THREE.SpriteMaterial; tex: THREE.Texture }>();
  const geos: THREE.BufferGeometry[] = [];
  const g = <T extends THREE.BufferGeometry>(x: T) => { geos.push(x); return x; };

  const kit = (n: NationId) => {
    let m = mats.get(n);
    if (m) return m;
    const L = BOARDER_LOOK[n];
    const tex = glowTexture(L.engine);
    m = {
      hull: new THREE.MeshStandardMaterial({ color: L.hull, metalness: 0.7, roughness: 0.35 }),
      dark: new THREE.MeshStandardMaterial({ color: L.dark, metalness: 0.6, roughness: 0.5 }),
      accent: new THREE.MeshStandardMaterial({ color: L.accent, emissive: new THREE.Color(L.accent).multiplyScalar(0.6), metalness: 0.4, roughness: 0.4 }),
      drill: new THREE.MeshStandardMaterial({ color: '#d8d8d8', metalness: 1, roughness: 0.2, flatShading: true }),
      glow: new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
      tex,
    };
    mats.set(n, m);
    return m;
  };

  /** A boarder of `nation`, `length` world units long. */
  function make(nation: NationId, length: number): THREE.Group {
    const m = kit(nation);
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
      const mesh = new THREE.Mesh(g(geo), mat);
      mesh.position.set(x, y, z);
      mesh.rotation.set(rx, ry, rz);
      body.add(mesh);
      return mesh;
    };
    const along = Math.PI / 2; // cylinders and cones stand on y; lay them along z
    // The drill: a fluted cone, point toward −z.
    const drillGeo = new THREE.ConeGeometry(0.16, 0.42, 7, 1);
    const drill = add(drillGeo, m.drill, 0, 0, -0.62, -along);
    drill.userData.drill = true;
    switch (nation) {
      case 'earth': // lathed cigar, swept fins, a blue band
        add(new THREE.CylinderGeometry(0.18, 0.2, 0.9, 16), m.hull, 0, 0, 0, along);
        add(new THREE.CylinderGeometry(0.205, 0.205, 0.08, 16), m.accent, 0, 0, -0.15, along);
        for (const s of [1, -1]) add(new THREE.BoxGeometry(0.36, 0.03, 0.22), m.dark, s * 0.28, 0, 0.32, 0, s * 0.5, 0);
        break;
      case 'moon': // a long needle through an open silver ring
        add(new THREE.CylinderGeometry(0.07, 0.1, 1.15, 10), m.hull, 0, 0, 0.05, along);
        add(new THREE.TorusGeometry(0.24, 0.025, 6, 24), m.dark, 0, 0, -0.25);
        add(new THREE.TorusGeometry(0.245, 0.012, 6, 24), m.accent, 0, 0, -0.25);
        break;
      case 'mercury': // a round bronze shield with a gold rim, the drill through its centre
        add(new THREE.CylinderGeometry(0.34, 0.34, 0.1, 24), m.hull, 0, 0, -0.32, along);
        add(new THREE.TorusGeometry(0.34, 0.03, 6, 24), m.accent, 0, 0, -0.32);
        add(new THREE.CylinderGeometry(0.13, 0.15, 0.6, 12), m.dark, 0, 0, 0.05, along);
        break;
      case 'venus': { // a gold teardrop with a green glass dome
        const tear = add(new THREE.SphereGeometry(0.22, 16, 12), m.hull, 0, 0, 0.05);
        tear.scale.set(1, 0.9, 2.1);
        const dome = add(new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.dark, 0, 0.16, -0.05);
        dome.scale.set(1, 0.8, 1.6);
        add(new THREE.TorusGeometry(0.2, 0.015, 6, 20), m.accent, 0, 0, -0.2);
        break;
      }
      case 'mars': { // a flat grey dagger-wedge, one red stripe, a flat bank of nozzles
        const shape = new THREE.Shape([new THREE.Vector2(0, -0.45), new THREE.Vector2(0.3, 0.45), new THREE.Vector2(-0.3, 0.45)]);
        const wedge = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false });
        wedge.rotateX(Math.PI / 2);
        wedge.translate(0, 0.06, 0);
        add(wedge, m.hull);
        add(new THREE.BoxGeometry(0.04, 0.125, 0.7), m.accent, 0, 0.005, 0.08);
        add(new THREE.BoxGeometry(0.5, 0.06, 0.06), m.dark, 0, 0, 0.46);
        break;
      }
      case 'jupiter': // violet crescent claws round the drill, magenta seams
        add(new THREE.CylinderGeometry(0.12, 0.17, 0.75, 6), m.hull, 0, 0, 0.08, along);
        for (const s of [1, -1]) {
          const claw = add(new THREE.TorusGeometry(0.26, 0.04, 4, 12, Math.PI * 0.8), m.dark, s * 0.02, 0, -0.38, 0, 0, s > 0 ? -0.4 : Math.PI + 0.4);
          claw.rotation.x = Math.PI / 2;
        }
        add(new THREE.BoxGeometry(0.02, 0.2, 0.6), m.accent, 0, 0, 0.08);
        break;
      case 'saturn': // a long thin black spine, oar-fins, amber lights
        add(new THREE.BoxGeometry(0.12, 0.1, 1.2), m.hull, 0, 0, 0.05);
        for (let i = 0; i < 4; i++) for (const s of [1, -1]) add(new THREE.BoxGeometry(0.26, 0.015, 0.06), m.dark, s * 0.18, 0, -0.2 + i * 0.18, 0, s * 0.25, 0);
        add(new THREE.SphereGeometry(0.03, 6, 4), m.accent, 0, 0.06, -0.38);
        break;
    }
    const len = modelLength(body);
    root.scale.setScalar(length / Math.max(1e-6, len));
    const flame = new THREE.Sprite(m.glow);
    flame.scale.set(0.5, 0.5, 1);
    flame.position.z = 0.62;
    flame.userData.exhaust = true;
    root.add(flame);
    return root;
  }

  return {
    make,
    dispose: () => { geos.forEach((x) => x.dispose()); for (const m of mats.values()) { m.hull.dispose(); m.dark.dispose(); m.accent.dispose(); m.drill.dispose(); m.glow.dispose(); m.tex.dispose(); } },
  };
}

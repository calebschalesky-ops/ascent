/**
 * The infantry carrier, one model per nation (INFANTRY-CARRIER.md section 8), after ART-DIRECTION.md: each keeps its
 * nation's silhouette (Earth's lathed cigar, the Moon's colonnade, Mercury's shield disc, Venus's teardrop and dome,
 * Mars's flat wedge, Jupiter's claws, Saturn's oar-banked spine) round a common troop bay with a drop ramp underneath.
 *
 * Built nose to −z, up +y, about 4 units long, then scaled by the caller to its world length. Meshes carry
 * `userData.role` (hull, panel, accent, glow, glass) as the art direction asks.
 */
import * as THREE from 'three';
import type { NationId } from '../../lib/nations';

interface Palette { hull: string; panel: string; accent: string; glow: string; glass?: string }
const PALETTE: Record<NationId, Palette> = {
  earth: { hull: '#c9a14a', panel: '#3a3f48', accent: '#3f7fd0', glow: '#9fd0ff' },
  moon: { hull: '#e6e3da', panel: '#b8c0cc', accent: '#2f5fc4', glow: '#e8f2ff' },
  mercury: { hull: '#5a3d22', panel: '#151210', accent: '#e3c52c', glow: '#fff2b0' },
  venus: { hull: '#c9a227', panel: '#0f4a33', accent: '#1d8f5c', glow: '#5dffa8', glass: '#2fd98a' },
  mars: { hull: '#8a8f96', panel: '#5d6269', accent: '#cc2131', glow: '#bfefff' },
  jupiter: { hull: '#24133a', panel: '#4a2a78', accent: '#ff2fd0', glow: '#ff3df0' },
  saturn: { hull: '#16161e', panel: '#2a2850', accent: '#ffb347', glow: '#ffb347' },
};

export const CARRIER_MODEL_LENGTH = 4;

export function buildCarrier(nation: NationId): THREE.Group {
  const p = PALETTE[nation];
  const g = new THREE.Group();
  const mat = {
    hull: new THREE.MeshStandardMaterial({ color: p.hull, metalness: 0.6, roughness: 0.45, flatShading: nation === 'mars' || nation === 'jupiter' || nation === 'mercury' }),
    panel: new THREE.MeshStandardMaterial({ color: p.panel, metalness: 0.5, roughness: 0.6 }),
    accent: new THREE.MeshStandardMaterial({ color: p.accent, emissive: new THREE.Color(p.accent).multiplyScalar(0.5), metalness: 0.4, roughness: 0.4 }),
    glow: new THREE.MeshBasicMaterial({ color: new THREE.Color(p.glow).multiplyScalar(2.2) }),
    glass: new THREE.MeshStandardMaterial({ color: p.glass ?? p.accent, emissive: new THREE.Color(p.glass ?? p.accent).multiplyScalar(0.6), transparent: true, opacity: 0.85 }),
  };
  type Role = keyof typeof mat;
  const add = (geo: THREE.BufferGeometry, role: Role, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat[role]);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.userData.role = role;
    g.add(m);
    return m;
  };
  const box = (w: number, h: number, d: number, role: Role, x = 0, y = 0, z = 0) => add(new THREE.BoxGeometry(w, h, d), role, x, y, z);

  // The common troop bay: a squat box under the hull, with a drop ramp hinged at its stern.
  box(0.9, 0.42, 1.8, 'panel', 0, -0.32, 0.15);
  const ramp = box(0.7, 0.05, 0.6, 'accent', 0, -0.55, 1.15);
  ramp.name = 'ramp';

  switch (nation) {
    case 'earth': {
      const pts = [0, 0.18, 0.34, 0.42, 0.44, 0.42, 0.3, 0].map((r, i) => new THREE.Vector2(r, -2 + i * (4 / 7)));
      add(new THREE.LatheGeometry(pts, 24), 'hull', 0, 0, 0, Math.PI / 2, 0, 0);
      for (const s of [-1, 1]) add(new THREE.BoxGeometry(1.2, 0.05, 0.6), 'hull', s * 0.8, -0.05, 0.6, 0, s * -0.4, 0);
      add(new THREE.TorusGeometry(0.43, 0.04, 8, 24), 'accent', 0, 0, -0.6);
      break;
    }
    case 'moon': {
      for (const s of [-1, 1]) box(0.08, 0.08, 4, 'hull', s * 0.42, 0.25, 0);
      for (let i = 0; i < 7; i++) for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), 'panel', s * 0.42, 0, -1.8 + i * 0.6);
      add(new THREE.ConeGeometry(0.12, 1.2, 8), 'hull', 0, 0.25, -2.4, -Math.PI / 2, 0, 0);
      add(new THREE.TorusGeometry(0.5, 0.05, 8, 32), 'accent', 0, 0.1, 1.6);
      break;
    }
    case 'mercury': {
      add(new THREE.CylinderGeometry(1.5, 1.5, 0.3, 32), 'hull', 0, 0.05, 0);
      add(new THREE.TorusGeometry(1.5, 0.1, 8, 40), 'accent', 0, 0.05, 0, Math.PI / 2, 0, 0);
      add(new THREE.ConeGeometry(0.3, 0.6, 3), 'accent', 0, 0.3, -0.9, -Math.PI / 2, 0, 0); // the chevron
      break;
    }
    case 'venus': {
      add(new THREE.SphereGeometry(0.75, 24, 16), 'hull', 0, 0, 0.6).scale.set(1, 0.8, 1.6);
      add(new THREE.ConeGeometry(0.62, 1.6, 24), 'hull', 0, 0, -1.2, -Math.PI / 2, 0, 0);
      add(new THREE.SphereGeometry(0.4, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), 'glass', 0, 0.45, 0.2);
      break;
    }
    case 'mars': {
      const shape = new THREE.Shape([new THREE.Vector2(0, -2.1), new THREE.Vector2(1.1, 1.6), new THREE.Vector2(-1.1, 1.6)]);
      add(new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: false }), 'hull', 0, -0.05, 0, Math.PI / 2, 0, 0);
      box(0.5, 0.35, 0.6, 'panel', 0, 0.3, 1.1); // command tower at the stern
      box(0.08, 0.02, 3, 'accent', 0, 0.01, 0); // the one red stripe
      break;
    }
    case 'jupiter': {
      box(0.35, 0.3, 3.6, 'hull', 0, 0.05, 0);
      for (const s of [-1, 1]) {
        add(new THREE.TorusGeometry(1.0, 0.12, 6, 20, Math.PI * 0.75), 'hull', s * 0.15, 0, -1.0, Math.PI / 2, 0, s > 0 ? -0.4 : Math.PI + 0.4);
        box(0.04, 0.04, 2.6, 'accent', s * 0.19, 0.2, 0); // magenta seams
      }
      break;
    }
    case 'saturn': {
      box(0.18, 0.18, 4.4, 'hull', 0, 0.1, 0);
      for (let i = 0; i < 8; i++) for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.7, 0.02, 0.12), 'panel', s * 0.5, 0.0, -1.5 + i * 0.4, 0, 0, s * 0.25);
      add(new THREE.SphereGeometry(0.1, 10, 8), 'accent', 0, 0.2, -2.2); // the painted eye
      break;
    }
  }
  // Engines at the stern, in the nation's glow (Mars: a flat bank of small nozzles).
  const n = nation === 'mars' ? 5 : nation === 'mercury' ? 3 : 2;
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * (nation === 'mars' ? 0.18 : 0.35);
    const e = nation === 'mars' ? box(0.12, 0.12, 0.08, 'glow', x, 0.05, 1.7) : add(new THREE.SphereGeometry(0.13, 10, 8), 'glow', x, 0, nation === 'mercury' ? 1.5 : 2.0);
    e.name = 'engine';
  }
  g.scale.setScalar(1);
  return g;
}

export function disposeCarrier(g: THREE.Object3D) {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry.dispose();
    (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
  });
}

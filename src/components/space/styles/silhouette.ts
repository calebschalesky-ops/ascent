/**
 * The silhouette test of ART-DIRECTION.md, in software: a model drawn black on white at low resolution from one side,
 * so tests can check that no two nations' ships could be taken for each other. Not used by the game.
 */
import * as THREE from 'three';

export type View = 'top' | 'side' | 'front';
/** The two world axes each view keeps, as [across, up]. */
const AXES: Record<View, [number, number]> = { top: [0, 2], side: [2, 1], front: [0, 1] };

/**
 * A `n` × `n` coverage mask of `g` seen from `view`, centred on its bounding box and scaled by its largest extent in
 * that view, so ships of different sizes compare by shape.
 */
export function silhouette(g: THREE.Object3D, view: View, n = 48): Uint8Array {
  g.updateMatrixWorld(true);
  const [ia, ib] = AXES[view];
  const tris: number[][] = [];
  const p = new THREE.Vector3();
  g.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const pos = mesh.geometry.getAttribute('position');
    const idx = mesh.geometry.getIndex();
    const count = idx ? idx.count : pos.count;
    for (let i = 0; i < count; i += 3) {
      const t: number[] = [];
      for (let j = 0; j < 3; j++) {
        p.fromBufferAttribute(pos, idx ? idx.getX(i + j) : i + j).applyMatrix4(mesh.matrixWorld);
        t.push(p.getComponent(ia), p.getComponent(ib));
      }
      tris.push(t);
    }
  });
  let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
  for (const t of tris) for (let j = 0; j < 6; j += 2) {
    a0 = Math.min(a0, t[j]); a1 = Math.max(a1, t[j]); b0 = Math.min(b0, t[j + 1]); b1 = Math.max(b1, t[j + 1]);
  }
  const span = Math.max(a1 - a0, b1 - b0) * 1.02;
  const ca = (a0 + a1) / 2, cb = (b0 + b1) / 2;
  const mask = new Uint8Array(n * n);
  for (const t of tris) {
    const q = [0, 1, 2].map((j) => [((t[j * 2] - ca) / span + 0.5) * n, ((t[j * 2 + 1] - cb) / span + 0.5) * n]);
    const [[x0, y0], [x1, y1], [x2, y2]] = q;
    const d = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (Math.abs(d) < 1e-12) continue;
    const lo = (k: number) => Math.max(0, Math.floor(Math.min(q[0][k], q[1][k], q[2][k])));
    const hi = (k: number) => Math.min(n - 1, Math.ceil(Math.max(q[0][k], q[1][k], q[2][k])));
    for (let y = lo(1); y <= hi(1); y++) for (let x = lo(0); x <= hi(0); x++) {
      const px = x + 0.5, py = y + 0.5;
      const u = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) / d;
      const v = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) / d;
      if (u >= 0 && v >= 0 && u + v <= 1) mask[y * n + x] = 1;
    }
  }
  return mask;
}

/** How alike two masks are: shared cover over total cover (1 is the same shape). */
export function overlap(a: Uint8Array, b: Uint8Array) {
  let both = 0, either = 0;
  for (let i = 0; i < a.length; i++) { both += a[i] & b[i]; either += a[i] | b[i]; }
  return either ? both / either : 1;
}

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createRenderOrigin, mulF32 } from './origin';

/**
 * The precision proof for real scale (REAL-SCALE-PLAN.md section 2): a hull or plate vertex a couple of units in front
 * of the camera, drawn the way a world-space shader draws it (projection × view × (model × p)), every step in single
 * precision. Screen error is measured in pixels on a 1080-pixel-tall view, over a hundred frames of the camera creeping.
 */
const H = 1080;

function worstPx(far: number, rebase: boolean): number {
  const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.01, 1e10);
  const base = new THREE.Vector3(far, far * 0.31, -far * 0.57); // somewhere 1e9-ish out, not on an axis
  let worst = 0;
  for (let k = 0; k < 100; k++) {
    const c = base.clone().add(new THREE.Vector3(k * 1e-3, k * 7e-4, -k * 3e-4)); // creeping, as a parked ship does
    // A plate 2 units ahead; its mesh's origin is the plate's own tile centre, 0.5 units off the vertex.
    const tile = c.clone().add(new THREE.Vector3(0.3, -0.2, -2.5));
    const vLocal = new THREE.Vector3(0.1, 0.4, 0.5);
    const O = rebase ? c : new THREE.Vector3();
    cam.position.copy(c).sub(O);
    cam.lookAt(tile.clone().sub(O));
    cam.updateMatrixWorld();
    const model = new THREE.Matrix4().makeTranslation(tile.x - O.x, tile.y - O.y, tile.z - O.z);
    // Exact, in doubles.
    const exact = vLocal.clone().applyMatrix4(model).applyMatrix4(cam.matrixWorldInverse).applyMatrix4(cam.projectionMatrix);
    // As the GPU: world = model × p, then view, then projection, each in single precision.
    const w = mulF32(model.elements, vLocal.x, vLocal.y, vLocal.z);
    const v = mulF32(cam.matrixWorldInverse.elements, w[0], w[1], w[2]);
    const p = mulF32(cam.projectionMatrix.elements, v[0], v[1], v[2]);
    const ndc = [p[0] / p[3], p[1] / p[3]];
    const err = Math.hypot(ndc[0] - exact.x, ndc[1] - exact.y) * H / 2;
    worst = Math.max(worst, err);
  }
  return worst;
}

describe('render origin', () => {
  it('the absolute path shakes a plate 2 units ahead by many pixels at 1e9 units out (the bug this fixes)', () => {
    expect(worstPx(1e9, false)).toBeGreaterThan(5);
  });
  it('rebased on the camera, a plate 2 units ahead is steady to a twentieth of a pixel, at 1e9 units and at 3e9', () => {
    expect(worstPx(1e9, true)).toBeLessThan(0.05);
    expect(worstPx(3e9, true)).toBeLessThan(0.05);
  });
  it('rebased, 10 km (18.5 units) out from a plate near Earth is steady too', () => {
    expect(worstPx(18.5, true)).toBeLessThan(0.05);
  });
  it('restores the scene, the camera and world uniforms after the draw, and rebases them during it', () => {
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera();
    cam.position.set(2e9, 1, -3e9);
    const mesh = new THREE.Mesh();
    mesh.position.set(2e9 + 5, 1, -3e9);
    scene.add(mesh);
    const sun = { value: new THREE.Vector3(1e9, 0, 0) };
    const ro = createRenderOrigin(scene, cam);
    ro.world(sun);
    let seen: number[] = [];
    ro.render(() => {
      scene.updateMatrixWorld(); // as renderer.render does
      seen = [cam.position.x, new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld).x, sun.value.x];
    });
    expect(seen).toEqual([0, 5, 1e9 - 2e9]);
    expect(cam.position.x).toBe(2e9);
    expect(sun.value.x).toBe(1e9);
    expect(new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld).x).toBe(2e9 + 5);
  });
});

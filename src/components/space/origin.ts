/**
 * The render origin (real scale, REAL-SCALE-PLAN.md section 2). World positions stay absolute JS doubles everywhere in
 * the game; only the draw is rebased. For the length of one draw the scene is shifted by −O, O being the camera's
 * absolute position, so the camera sits at the origin and everything the GPU sees as a world value (modelMatrix,
 * cameraPosition, world-space uniforms) is small and precise in single precision even 3e9 units from Earth.
 *
 * Three.js already composes modelViewMatrix on the CPU in doubles, so plain meshes were steady without this. What it
 * fixes is the rest: shaders that work in world space (the atmosphere's ray march, the shield bubble), uniforms that
 * hold world positions (the Sun's, the speed streaks' camera), and anything the GPU adds up from two big numbers.
 *
 * After the draw everything is put back, world matrices included, so picking and game code between frames read
 * absolute positions as before.
 */
import * as THREE from 'three';

type Vec3Uniform = { value: THREE.Vector3 };

export interface RenderOrigin {
  /** The origin of the draw now being made (absolute), or of the last one. */
  readonly O: THREE.Vector3;
  /**
   * A uniform that holds a world position. Game code keeps writing the absolute value; during the draw it reads the
   * value less O. Registering the same uniform twice is harmless.
   */
  world: (u: Vec3Uniform) => void;
  /** Draw (`draw` runs the composer or the renderer) with the scene rebased on the camera. */
  render: (draw: () => void) => void;
}

export function createRenderOrigin(scene: THREE.Scene, camera: THREE.Camera): RenderOrigin {
  const O = new THREE.Vector3();
  const uniforms = new Set<Vec3Uniform>();
  const keep: THREE.Vector3[] = [];
  return {
    O,
    world: (u) => { uniforms.add(u); },
    render(draw) {
      O.copy(camera.position);
      scene.position.sub(O);
      camera.position.sub(O);
      camera.updateMatrixWorld();
      let i = 0;
      for (const u of uniforms) {
        (keep[i] ??= new THREE.Vector3()).copy(u.value);
        u.value.sub(O);
        i++;
      }
      try {
        draw();
      } finally {
        i = 0;
        for (const u of uniforms) u.value.copy(keep[i++]);
        scene.position.add(O);
        scene.updateMatrix();
        camera.position.add(O);
        camera.updateMatrixWorld();
        // The draw shifted every world matrix by −O and nothing else (the scene's root carries only a translation), so
        // putting them back is three adds each, not a second walk of matrix products (0.44 ms for 1,427 objects).
        const { x, y, z } = O;
        scene.traverse((o) => { const e = o.matrixWorld.elements; e[12] += x; e[13] += y; e[14] += z; });
      }
    },
  };
}

/**
 * Write instance or point positions relative to an anchor: the mesh sits at the anchor (in doubles) and each
 * instance's offset from it goes into the Float32Array, so the GPU never adds two large numbers. Call before writing.
 */
export function anchorAt(obj: THREE.Object3D, at: THREE.Vector3 | readonly number[]): THREE.Vector3 {
  if (at instanceof THREE.Vector3) obj.position.copy(at);
  else obj.position.set(at[0], at[1], at[2]);
  return obj.position;
}

// ---------- single precision, for the proof ----------
const f = Math.fround;
/** A column-major 4×4 matrix times (x, y, z, 1), every multiply and add rounded to single precision as a GPU does. */
export function mulF32(m: ArrayLike<number>, x: number, y: number, z: number): [number, number, number, number] {
  const e = Array.from(m, f);
  const [X, Y, Z] = [f(x), f(y), f(z)];
  const row = (r: number) => f(f(f(f(e[r] * X) + f(e[r + 4] * Y)) + f(e[r + 8] * Z)) + e[r + 12]);
  return [row(0), row(1), row(2), row(3)];
}

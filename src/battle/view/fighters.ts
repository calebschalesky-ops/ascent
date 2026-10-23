/**
 * Fighter wings on screen (PKG-25). Each wing out of its hangar is drawn as its fighters in a small V on the wing's
 * position, at the hull scale rules (scene.ts LOOK.length.fighter, PKG-15/17: small, readable), in its people's glow
 * colour (the house palette the scene already reads: Zeuxis's tokens, no colour of its own). One instanced mesh for the
 * craft and one points layer for their engine lights, which keeps a floor in device pixels so a wing still reads as
 * lights from across the battle and in the dimmed tactical view. Two draw calls for every wing in the battle.
 *
 * Behind the `fighters` flag (src/flags.ts): off, nothing is drawn.
 */
import * as THREE from 'three';
import { flagOn } from '../../flags';
import type { Battle } from '../sim/index';
import type { BattleFrame, Side, V3, WingView } from './model';

/** The look of a wing. First-pass, look only. */
export const WING_LOOK = {
  /** Length of one fighter, battle units (scene.ts LOOK.length.fighter). */
  craft: 2,
  /** Spacing of the V, battle units. */
  spacing: 2.6,
  /** Engine light: world size per fighter, and never under this many device pixels. */
  glowSize: 1.6,
  glowMinPx: 2.5,
  glowGain: 2.6,
  /** A returning wing's lights are dimmer. */
  returningGain: 0.55,
  /** Most fighters drawn at once. */
  max: 512,
};

/** The sim's wings as the view model sees them (simFeed.ts calls this): flying and returning wings, in battle units. */
export function wingViews(b: Battle, metresPerUnit: number): WingView[] {
  const out: WingView[] = [];
  for (const w of b.fighters?.wings ?? []) {
    if (w.state !== 'flying' && w.state !== 'returning') continue;
    out.push({
      id: w.id, side: (w.side === 'player' ? 0 : 1) as Side, craft: Math.max(1, Math.ceil(w.craft - 1e-6)), returning: w.state === 'returning',
      pos: [w.pos.x / metresPerUnit, 1.5, w.pos.z / metresPerUnit], heading: [Math.cos(w.heading), 0, Math.sin(w.heading)],
    });
  }
  return out;
}

/** Offsets of fighter `i` in a V behind its leader, in the wing's frame (+x along the heading, z to the side). */
function vee(i: number): [number, number] {
  if (i === 0) return [0, 0];
  const rank = Math.ceil(i / 2);
  const sideSign = i % 2 ? 1 : -1;
  return [-rank * WING_LOOK.spacing * 0.8, sideSign * rank * WING_LOOK.spacing];
}

export interface WingLayer { place(frame: BattleFrame): void; count(): number }

export function createWingLayer(parent: THREE.Object3D): WingLayer {
  // A fighter: a slim dart pointing along +x.
  const geo = new THREE.ConeGeometry(WING_LOOK.craft * 0.28, WING_LOOK.craft, 4);
  geo.rotateZ(-Math.PI / 2);
  const craft = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ toneMapped: false }) /* white: tinted per craft */, WING_LOOK.max);
  craft.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(WING_LOOK.max * 3), 3);
  craft.frustumCulled = false;
  craft.count = 0;
  parent.add(craft);

  const lightGeo = new THREE.BufferGeometry();
  lightGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(WING_LOOK.max * 3), 3));
  lightGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(WING_LOOK.max * 3), 3));
  const lightMat = new THREE.PointsMaterial({ size: WING_LOOK.glowSize, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  lightMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <logdepthbuf_vertex>', `gl_PointSize = max(gl_PointSize, ${WING_LOOK.glowMinPx.toFixed(1)});\n#include <logdepthbuf_vertex>`);
  };
  const lights = new THREE.Points(lightGeo, lightMat);
  lights.frustumCulled = false;
  parent.add(lights);

  const m = new THREE.Matrix4();
  const r = new THREE.Matrix4();
  const col = new THREE.Color();
  let n = 0;

  return {
    place(frame) {
      const on = flagOn('fighters');
      craft.visible = lights.visible = on;
      n = 0;
      if (on) {
        const lp = lightGeo.attributes.position as THREE.BufferAttribute;
        const lc = lightGeo.attributes.color as THREE.BufferAttribute;
        for (const w of frame.wings ?? []) {
          const h = Math.atan2(w.heading[2], w.heading[0]);
          const c = Math.cos(h), s = Math.sin(h);
          col.set(frame.sides[w.side].colours.glow).multiplyScalar(WING_LOOK.glowGain * (w.returning ? WING_LOOK.returningGain : 1));
          for (let i = 0; i < w.craft && n < WING_LOOK.max; i++) {
            const [ax, az] = vee(i);
            const p: V3 = [w.pos[0] + ax * c - az * s, w.pos[1] + (i % 3) * 0.3, w.pos[2] + ax * s + az * c];
            craft.setMatrixAt(n, m.makeTranslation(p[0], p[1], p[2]).multiply(r.makeRotationY(-h)));
            craft.setColorAt(n, col);
            lp.setXYZ(n, p[0] - w.heading[0] * WING_LOOK.craft * 0.5, p[1], p[2] - w.heading[2] * WING_LOOK.craft * 0.5);
            lc.setXYZ(n, col.r, col.g, col.b);
            n++;
          }
        }
        lp.needsUpdate = true;
        lc.needsUpdate = true;
      }
      craft.count = n;
      craft.visible = lights.visible = n > 0; // no wings out: no draw calls
      craft.instanceMatrix.needsUpdate = true;
      if (craft.instanceColor) craft.instanceColor.needsUpdate = true;
      lightGeo.setDrawRange(0, n);
    },
    count: () => n,
  };
}

/**
 * The hologram treatment in the scene (PKG-12): a grid on the ring plane under the battle, and the renderer's exposure
 * turned down so the hulls and the planet go faint while the icons (overlay.ts) carry the picture. It adds one line
 * mesh to the scene, hidden (no draw call) while the tactical view is closed; it changes nothing in scene.ts.
 */
import * as THREE from 'three';
import type { V3 } from '../model';
import type { BattleView } from '../scene';
import { TAC } from './numbers';

/** A colour token from the page (styles.css), so the grid is drawn in the HUD's own cyan. No token: a plain grey. */
function token(name: string, grey: number): THREE.Color {
  let v = '';
  try { v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); } catch { /* no document */ }
  const c = new THREE.Color().setScalar(grey);
  if (v) { try { c.setStyle(v); } catch { /* keep the grey */ } }
  return c;
}

export interface Holo {
  set(on: boolean): void;
  /** Keep the grid under the middle of the battle (battle units), snapped to its own step so it never slides. */
  centre(c: V3): void;
  dispose(): void;
}

export function createHolo(view: BattleView): Holo {
  const n = Math.round(TAC.gridHalf / TAC.gridStep);
  const pts: number[] = [];
  for (let i = -n; i <= n; i++) {
    const k = i * TAC.gridStep;
    pts.push(-TAC.gridHalf, 0, k, TAC.gridHalf, 0, k, k, 0, -TAC.gridHalf, k, 0, TAC.gridHalf);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const mat = new THREE.LineBasicMaterial({
    color: token('--cyan', 0.7).multiplyScalar(TAC.gridGain), transparent: true, opacity: TAC.gridOpacity, depthWrite: false, toneMapped: false,
  });
  const grid = new THREE.LineSegments(geo, mat);
  grid.name = 'tactical-grid';
  grid.matrixAutoUpdate = false;
  grid.frustumCulled = false;
  grid.renderOrder = -1;
  grid.visible = false;
  view.scene.add(grid);
  // The holotable: a dark disc on the plane under the battle, so the planet and the bright rings below fall away.
  // It writes depth (drawn first among the see-through things), so the rings beyond it are hidden, not blended over it.
  const discGeo = new THREE.CircleGeometry(TAC.gridHalf * 1.15, 96).rotateX(-Math.PI / 2).translate(0, -0.5, 0);
  const discMat = new THREE.MeshBasicMaterial({ color: token('--night', 0), transparent: true, opacity: TAC.tableOpacity, depthWrite: true, side: THREE.DoubleSide });
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.name = 'tactical-table';
  disc.matrixAutoUpdate = false;
  disc.frustumCulled = false;
  disc.renderOrder = -2;
  disc.visible = false;
  view.scene.add(disc);

  let base: number | null = null;
  const o = new THREE.Vector3(), ex = new THREE.Vector3(), ey = new THREE.Vector3(), ez = new THREE.Vector3();
  let at: V3 = [0, 0, 0];

  const place = () => {
    // The battle frame's axes in world space, through the view's own mapping: the grid lies in the battle's ring plane.
    o.copy(view.toWorld(at));
    ex.copy(view.toWorld([at[0] + 1, at[1], at[2]])).sub(o);
    ey.copy(view.toWorld([at[0], at[1] + 1, at[2]])).sub(o);
    ez.copy(view.toWorld([at[0], at[1], at[2] + 1])).sub(o);
    grid.matrix.makeBasis(ex, ey, ez).setPosition(o);
    grid.matrixWorldNeedsUpdate = true;
    disc.matrix.copy(grid.matrix);
    disc.matrixWorldNeedsUpdate = true;
  };

  return {
    set(on) {
      grid.visible = on;
      disc.visible = on;
      const r = view.renderer;
      if (on && base === null) { base = r.toneMappingExposure; r.toneMappingExposure = base * TAC.exposureK; }
      if (!on && base !== null) { r.toneMappingExposure = base; base = null; }
      if (on) place();
    },
    centre(c) {
      at = [Math.round(c[0] / TAC.gridStep) * TAC.gridStep, TAC.tableY, Math.round(c[2] / TAC.gridStep) * TAC.gridStep];
      if (grid.visible) place();
    },
    dispose() {
      if (base !== null) view.renderer.toneMappingExposure = base;
      view.scene.remove(grid, disc);
      geo.dispose();
      mat.dispose();
      discGeo.dispose();
      discMat.dispose();
    },
  };
}

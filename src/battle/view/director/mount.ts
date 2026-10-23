/**
 * The director on screen (PKG-11): wires director.ts to the camera rig, the scene and the probe, and draws the
 * picture-in-picture inset as a second, small render pass of the same scene from a second camera. No pass is added
 * while no inset is open, so the bench's draw calls are the scene's own. PKG-15: the inset goes through its own small
 * composer with the main view's bloom and output pass, so fire and engines glow in it as they do on the main screen.
 *
 * Probe: `state('director')` is the shot log, the mode and the inset; player input is any camera verb, or
 * `act('camera', {yaw, pitch, zoom, ship})`.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { registerProbeSource } from '../../../dev/probeSources';
import { flagOn } from '../../../flags';
import type { CameraRig } from '../camera';
import type { BattleFrame, ShipView } from '../model';
import type { BattleView } from '../scene';
import { LOOK } from '../scene';
import type { LogSource } from './director';
import { createDirector } from './director';
import { DIRECTOR } from './numbers';
import './director.css';

export interface DirectorMount {
  step(frame: BattleFrame, dt: number): void;
  reset(): void;
  dispose(): void;
  /** PKG-12: pause the director (the tactical view holds the camera): no cuts, no inset, a camera input takes nothing. */
  pause(on: boolean): void;
}

export function mountDirector(o: { host: HTMLElement; view: BattleView; rig: CameraRig; log: () => LogSource | null }): DirectorMount {
  const { host, view, rig } = o;
  const P = DIRECTOR.pip;
  const ndc = new THREE.Vector3();

  /** Is this ship on his screen already, and near enough to read? Then a moment there needs no inset. */
  const visible = (s: ShipView) => {
    const w = view.toWorld(s.pos);
    const near = w.distanceTo(view.camera.position) <= LOOK.length[s.cls] * P.nearK;
    ndc.copy(w).project(view.camera);
    return near && ndc.z < 1 && Math.abs(ndc.x) <= P.onScreen && Math.abs(ndc.y) <= P.onScreen;
  };

  const d = createDirector({ lengths: LOOK.length, visible, lens: () => ({ fov: view.camera.fov, aspect: view.camera.aspect }) });
  let paused = false;
  rig.onTake = () => (paused ? false : d.take(rig));

  const pipCam = new THREE.PerspectiveCamera(P.fov, P.aspect, 0.5, view.camera.far);
  const frameEl = document.createElement('figure');
  frameEl.className = 'director-pip';
  frameEl.hidden = true;
  const caption = document.createElement('figcaption');
  frameEl.appendChild(caption);
  host.appendChild(frameEl);
  const size = new THREE.Vector2();
  // The inset's post: the main view's bloom (scene.ts LOOK.bloom) at a resolution fit for a small picture, then the
  // same tone mapping and colour output. Its targets are sized to the inset, so the extra fill is the inset's area.
  const pipPost = new EffectComposer(view.renderer);
  pipPost.addPass(new RenderPass(view.scene, pipCam));
  pipPost.addPass(new UnrealBloomPass(new THREE.Vector2(P.bloomRes, P.bloomRes), LOOK.bloom.strength, LOOK.bloom.radius, LOOK.bloom.threshold));
  pipPost.addPass(new OutputPass());
  let pipW = 0, pipH = 0;

  const drawPip = () => {
    const v = flagOn('director') && !paused ? d.pipView() : null;
    if (!v) { frameEl.hidden = true; return; }
    const r = view.renderer;
    r.getSize(size);
    const w = Math.round(Math.min(P.maxPx, Math.max(P.minPx, size.x * P.width)));
    const h = Math.round(w / P.aspect);
    const x = size.x - w - P.right;
    // Below the side chips (they stack under the title at phone width), never above `P.top`.
    const chips = host.parentElement?.querySelector('.skirmish-sides')?.getBoundingClientRect();
    const top = Math.round(Math.max(P.top, chips ? chips.bottom - host.getBoundingClientRect().top + P.gap : 0));
    const y = size.y - top - h; // the viewport is measured from the bottom
    view.aim(pipCam, v.eye, v.target);
    r.setViewport(x, y, w, h);
    r.setScissor(x, y, w, h);
    if (w !== pipW || h !== pipH) { pipW = w; pipH = h; pipPost.setSize(w, h); }
    r.setScissorTest(true);
    pipPost.render();
    r.setScissorTest(false);
    r.setViewport(0, 0, size.x, size.y);
    frameEl.hidden = false;
    frameEl.style.width = `${w}px`;
    frameEl.style.height = `${h}px`;
    frameEl.style.top = `${top}px`;
    frameEl.style.right = `${P.right}px`;
    if (caption.textContent !== v.pip.reason) caption.textContent = v.pip.reason;
  };
  view.afterRender.push(drawPip);

  const off = registerProbeSource('director', () => d.snapshot());

  return {
    step(frame, dt) { if (!paused) d.step(frame, o.log(), rig, dt); },
    pause(on) { paused = on; },
    reset() { d.reset(rig); },
    dispose() {
      off();
      const i = view.afterRender.indexOf(drawPip);
      if (i >= 0) view.afterRender.splice(i, 1);
      if (rig.onTake) rig.onTake = undefined;
      frameEl.remove();
      pipPost.dispose();
    },
  };
}

/**
 * The hangar: the player's cruiser turning on a lit pad, in three.js. Drag to turn it by hand; it turns on its own
 * otherwise. Repaints when the trim or finish changes. `compact` is the small view on the faction cards.
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { NationId } from '../../lib/nations';
import { NATIONS } from '../../lib/nations';
import type { ShipLook } from '../../lib/opening/profile';
import type { Loadout } from '../../lib/modules';
import { buildPilotShip } from '../space/pilotShip';

/** `loadout`: what is fitted, shown on the hull (space/hardpoints.ts); none shows the bare hull. */
interface Props { nation: NationId; look: Pick<ShipLook, 'trim' | 'finish'>; label: string; compact?: boolean; loadout?: Loadout | null }

export default function ShipViewer({ nation, look, label, compact = false, loadout = null }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ setShip: (n: NationId, l: Pick<ShipLook, 'trim' | 'finish'>, fit: Loadout | null) => void } | null>(null);

  useEffect(() => {
    const host = hostRef.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      host.classList.add('no-gl'); // no WebGL: the label and the stats still tell the player what they get
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.add(new THREE.AmbientLight(0x8090b0, 0.4));
    const key = new THREE.DirectionalLight(0xfff2e0, 3);
    key.position.set(-4, 6, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8fb0ff, 1.6);
    rim.position.set(4, 2, -6);
    scene.add(rim);
    const camera = new THREE.PerspectiveCamera(compact ? 30 : 34, 1, 0.05, 100);

    // The pad: a dark disc with a ring of the nation's colour and a few deck lines.
    const pad = new THREE.Group();
    const padMat = new THREE.MeshStandardMaterial({ color: 0x10141f, metalness: 0.6, roughness: 0.55 });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.75, 0.06, 64), padMat);
    disc.position.y = -0.62;
    pad.add(disc);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.012, 8, 96), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.585;
    pad.add(ring);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x2a3550 });
    for (let i = 0; i < 6; i++) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.004, 0.01), lineMat);
      l.rotation.y = (i / 6) * Math.PI;
      l.position.y = -0.588;
      pad.add(l);
    }
    if (!compact) scene.add(pad);

    const holder = new THREE.Group();
    scene.add(holder);
    let ship: ReturnType<typeof buildPilotShip> | null = null;
    const disposeShip = () => {
      if (!ship) return;
      holder.remove(ship.group);
      const mats = new Set<THREE.Material>();
      ship.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => mats.add(x));
      });
      mats.forEach((m) => m.dispose());
      ship = null;
    };
    // The camera backs off until the ship's bounding sphere fits the view, whatever its shape or the view's.
    let radius = 1.1;
    const frame = () => {
      const half = THREE.MathUtils.degToRad(camera.fov / 2);
      const fitV = radius / Math.sin(half);
      const fitH = radius / Math.sin(Math.atan(Math.tan(half) * camera.aspect));
      const d = Math.max(fitV, fitH) * 0.86; // the sphere is generous: the ship never fills all of it at once
      const dir = new THREE.Vector3(1, 0.42, 1).normalize();
      camera.position.copy(dir.multiplyScalar(d));
      camera.lookAt(0, -0.05, 0);
    };
    const setShip = (n: NationId, l: Pick<ShipLook, 'trim' | 'finish'>, fit: Loadout | null) => {
      disposeShip();
      ship = buildPilotShip(n, l, fit);
      // Framed on the hull alone, so fitting a railgun does not zoom the camera out.
      const box = new THREE.Box3();
      ship.group.updateMatrixWorld(true);
      ship.group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !m.userData.hardpoint && !m.userData.exhaust) box.expandByObject(m); });
      const size = box.getSize(new THREE.Vector3());
      // Normalise so the longer of length and span is about 2.2, then frame its sphere (turning, so length and span).
      const k = 2.2 / Math.max(size.z, size.x, 1e-6);
      ship.group.scale.setScalar(k);
      radius = (Math.hypot(Math.max(size.x, size.z), size.y) * k) / 2 + 0.08;
      // The pad sits just under the ship and a little wider than it turns.
      const turn = (Math.max(size.x, size.z) * k) / 2;
      pad.scale.setScalar((turn * 1.08) / 1.7);
      pad.position.y = -(size.y * k) / 2 - 0.05 + 0.62 * pad.scale.y;
      if (!compact) radius = Math.max(radius, turn * 1.1);
      holder.add(ship.group);
      ringMat.color.set(NATIONS.find((x) => x.id === n)!.color).multiplyScalar(1.6);
      frame();
    };
    sceneRef.current = { setShip };

    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      frame();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    // Drag turns it; let go and it keeps turning slowly.
    let drag: { x: number; yaw: number } | null = null;
    let yaw = -0.6, spin = 0.35;
    const down = (e: PointerEvent) => { drag = { x: e.clientX, yaw }; host.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => { if (drag) yaw = drag.yaw + (e.clientX - drag.x) * 0.01; };
    const up = () => { drag = null; };
    host.addEventListener('pointerdown', down);
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerup', up);
    host.addEventListener('pointercancel', up);

    let last = performance.now();
    const t0 = last;
    renderer.setAnimationLoop((now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!drag) yaw += spin * dt;
      holder.rotation.y = yaw;
      holder.position.y = Math.sin((now - t0) / 900) * 0.03;
      ship?.update(dt, 0.35 + 0.15 * Math.sin((now - t0) / 700), (now - t0) / 1000);
      renderer.render(scene, camera);
    });
    return () => {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      host.removeEventListener('pointerdown', down);
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerup', up);
      host.removeEventListener('pointercancel', up);
      disposeShip();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
      spin = 0;
    };
  }, [compact]);

  const fitKey = loadout ? JSON.stringify(loadout) : '';
  useEffect(() => { sceneRef.current?.setShip(nation, look, loadout); }, [nation, look.trim, look.finish, fitKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={hostRef} className={compact ? 'ship-viewer compact' : 'ship-viewer'} role="img" aria-label={label} />;
}

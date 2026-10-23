// Dev-only: the draw-call cost of the ship models, comparable across branches. Paste the body into the dev page in
// flight on either branch (it only imports modules both branches have), or:
//   const C = await import('/scripts/shipart-calls.js?t=' + Date.now()); await C.calls();
// Sets the 28 ships every nation fields (capital, cruiser, fighter, destroyer, as fleet.ts builds and merges them) in
// a grid in front of the camera and reads one composed frame's draw calls and triangles, first with only the ships
// drawn and then with the whole scene. The ship models are what this pass changed; the rest of the frame is not.
// `calls({ specials: true })` adds a fifth row, each nation's special as fleet.make('special') builds it (35 ships;
// only on a branch whose fleet.ts has the special path).
export async function calls({ specials = false } = {}) {
  const v = window.__voyage;
  const F = await import('/src/components/space/fleet.ts');
  const D = await import('/src/components/space/destroyers.ts');
  const N = await import('/src/lib/nations.ts');
  const THREE = await import('three');
  const grid = new THREE.Group();
  let meshes = 0;
  let fleetOf = null;
  const nations = N.NATIONS.map((n) => n.id).filter((id) => id !== 'sun');
  nations.forEach((id, i) => {
    const nation = N.NATIONS.find((n) => n.id === id);
    const models = [
      F.styledModel('capital', { id, color: nation.color }),
      F.styledModel('cruiser', { id, color: nation.color }),
      F.styledModel('fighter', { id, color: nation.color }),
      F.mergeByMaterial(D.buildDestroyer(id)),
      ...(specials ? [(fleetOf ??= F.createFleet({})).make('special', nation, 4)] : []),
    ];
    models.forEach((m, j) => {
      const b = new THREE.Box3().setFromObject(m);
      const L = Math.max(...b.getSize(new THREE.Vector3()).toArray());
      m.scale.setScalar(4 / L);
      const h = new THREE.Group();
      h.add(m);
      h.position.set((i - 3) * 6, (j - 1.5) * 5, 0);
      grid.add(h);
      m.traverse((o) => { if (o.isMesh) meshes++; });
    });
  });
  const cam = v.camera;
  const fwd = new THREE.Vector3();
  cam.getWorldDirection(fwd);
  grid.position.copy(cam.position).addScaledVector(fwd, 70);
  grid.quaternion.copy(cam.quaternion);
  v.scene.add(grid);
  const r = v.renderer;
  const frame = () => {
    r.info.autoReset = false; r.info.reset();
    v.composer.render(0);
    const out = { calls: r.info.render.calls, triangles: r.info.render.triangles };
    r.info.autoReset = true;
    return out;
  };
  const whole = frame();
  const off = [];
  v.scene.traverse((o) => {
    if (o === grid || !o.visible || grid.getObjectById(o.id)) return;
    if (o.isLOD || o.isMesh || o.isSprite || o.isLine || o.isPoints) { o.visible = false; off.push(o); }
  });
  const shipsOnly = frame();
  off.forEach((o) => { o.visible = true; });
  const empty = (() => { grid.visible = false; const f = frame(); grid.visible = true; return f; })();
  v.scene.remove(grid);
  return { ships: specials ? 35 : 28, meshes, shipsOnly, wholeFrameWithShips: whole, wholeFrameWithoutShips: empty };
}

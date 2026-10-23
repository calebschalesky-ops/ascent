/**
 * PKG-20: the body behind a battle, from the voyage game's own planet art (space/materials.ts, read-only import): the
 * planets' surface shader for Saturn, Mars, the Moon and Mercury, and the major moons' shader for Europa and Titan with
 * the same style and colours moonScene.ts gives them (copied here because moonScene keeps its table private).
 * No new painted art. Near Phobos the backdrop is Mars: Phobos is 22 km across, too small to fill the sky.
 */
import type * as THREE from 'three';
import { moonletMaterial, surfaceMaterial } from '../../components/space/materials';
import type { SpaceUniforms, SurfaceKind } from '../../components/space/materials';
import type { BodyId } from '../sim/index';

/** moonScene.ts LOOK: [style, colour a, b, c] (2 Europa, 3 Titan). */
const MOONLET: Partial<Record<BodyId, [number, string, string, string]>> = {
  europa: [2, '#efe6d6', '#d8c9b0', '#9a5a3c'],
  titan: [3, '#e0a14a', '#a9662a', '#7fa6c8'],
};
/** moonScene.ts's seed for a major moon's pattern, from its id. */
const moonSeed = (id: string) => (id.charCodeAt(0) * 7.3 + id.length * 3.1) % 50;

export function bodyMaterial(body: BodyId, u: SpaceUniforms): THREE.ShaderMaterial {
  const m = MOONLET[body];
  if (m) return moonletMaterial(m[0], m[1], m[2], m[3], moonSeed(body), u);
  const kind: SurfaceKind = body === 'phobos' ? 'mars' : (body as 'saturn' | 'moon' | 'mercury');
  return surfaceMaterial(kind, u);
}

/** Only Saturn has the rings. */
export const hasRings = (body: BodyId) => body === 'saturn';

/**
 * The nation styles of ART-DIRECTION.md, as procedural models: a capital ship, a cruiser and a fighter for each of the
 * seven nations. Each builder returns a flat group of meshes tagged with `userData.role` (see kit.ts), nose toward −z,
 * capital ships about 10 long, cruisers and fighters about 2. A nation's cruiser is the ship its player flies.
 */
import type * as THREE from 'three';
import type { NationId } from '../../../lib/nations';
import type { StyleMaterials } from './kit';
import { buildClawCapital, buildClawCruiser, buildClawFighter, clawMaterials } from './claw';
import { buildCourtCapital, buildCourtCruiser, buildCourtFighter, courtMaterials } from './court';
import { buildImperialCapital, buildImperialCruiser, buildImperialFighter, imperialMaterials } from './imperial';
import { buildNavyCapital, buildNavyCruiser, buildNavyFighter, navyMaterials } from './navy';
import { buildPhalanxCapital, buildPhalanxCruiser, buildPhalanxFighter, phalanxMaterials } from './phalanx';
import { buildTempleCapital, buildTempleCruiser, buildTempleFighter, templeMaterials } from './temple';
import { buildTriremeCapital, buildTriremeCruiser, buildTriremeFighter, triremeMaterials } from './trireme';

export type { StyleMaterials, StyleRole } from './kit';
export { SPECIALS } from './specials';
export { STYLE_ROLES } from './kit';
export {
  buildClawCapital, buildClawCruiser, buildClawFighter, clawMaterials, buildImperialCapital, buildImperialCruiser,
  buildImperialFighter, imperialMaterials, buildNavyCapital, buildNavyCruiser, buildNavyFighter, navyMaterials,
  buildTempleCapital, buildTempleCruiser, buildTempleFighter, templeMaterials, buildPhalanxCapital,
  buildPhalanxCruiser, buildPhalanxFighter, phalanxMaterials, buildCourtCapital, buildCourtCruiser,
  buildCourtFighter, courtMaterials, buildTriremeCapital, buildTriremeCruiser, buildTriremeFighter, triremeMaterials,
};

export interface NationStyle {
  /** The ship names, as the codex (races.ts) gives them. */
  names: { capital: string; cruiser: string; fighter: string };
  materials: (accent?: string) => StyleMaterials;
  capital: (m?: StyleMaterials) => THREE.Group;
  /** The ship the player flies when they fly this nation. */
  cruiser: (m?: StyleMaterials) => THREE.Group;
  fighter: (m?: StyleMaterials) => THREE.Group;
}

/** Every nation's style, by nation id. */
export const STYLES: Record<NationId, NationStyle> = {
  earth: { names: { capital: 'Metropolis', cruiser: 'Pathfinder', fighter: 'Sparrow' }, materials: navyMaterials, capital: buildNavyCapital, cruiser: buildNavyCruiser, fighter: buildNavyFighter },
  moon: { names: { capital: 'Thesauros', cruiser: 'Lampas', fighter: 'Belone' }, materials: templeMaterials, capital: buildTempleCapital, cruiser: buildTempleCruiser, fighter: buildTempleFighter },
  mercury: { names: { capital: 'Hoplon', cruiser: 'Embolon', fighter: 'Aspis' }, materials: phalanxMaterials, capital: buildPhalanxCapital, cruiser: buildPhalanxCruiser, fighter: buildPhalanxFighter },
  venus: { names: { capital: 'Palatine', cruiser: 'Dromon', fighter: 'Smaragdos' }, materials: (a) => courtMaterials(a), capital: buildCourtCapital, cruiser: buildCourtCruiser, fighter: buildCourtFighter },
  mars: { names: { capital: 'Rostrata', cruiser: 'Corvus', fighter: 'Velite' }, materials: imperialMaterials, capital: buildImperialCapital, cruiser: buildImperialCruiser, fighter: buildImperialFighter },
  jupiter: { names: { capital: 'Tessarakonteres', cruiser: 'Sarissa', fighter: 'Hetairos' }, materials: clawMaterials, capital: buildClawCapital, cruiser: buildClawCruiser, fighter: buildClawFighter },
  saturn: { names: { capital: 'Trireme', cruiser: 'Paralos', fighter: 'Glaux' }, materials: triremeMaterials, capital: buildTriremeCapital, cruiser: buildTriremeCruiser, fighter: buildTriremeFighter },
};

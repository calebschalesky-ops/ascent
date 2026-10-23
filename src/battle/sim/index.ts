/**
 * The battle sim's public surface (PKG-02). Headless and deterministic: no three.js, React, DOM or components (an ESLint
 * block enforces it), no wall time, one seeded RNG.
 */
export { createBattle, step, run, answer, fire, breakShip, shipOut, canThrust, canFire, pdChance, canLaunch, canJump, VARIANTS } from './battle';
export type { CreateOptions } from './battle';
export { order } from './orders';
export { POLICIES, policyNames } from './policies';
export type { Policy } from './policies';
export { openSides, setShieldPower, sideFacing } from './ships';
export { summarise, hashState } from './summary';
export type { Summary, SideSummary } from './summary';
export { world01, world02, formatTable, pairDiffers, compareOutcome, OUTCOME_RANK } from './checks';
export type { CheckRow } from './checks';
export { SATURN_12V12 } from './setups/saturn-12v12';
export { SETUPS, DEFAULT_SETUP, ROSTER_IDS, setupIds, setupById, startBattle, bodyOf, placeOf } from './setups'; // PKG-20
export { ROSTERS } from './setups/rosters'; // PKG-20
export type { RosterFixture, CaptainPin } from './setups/rosters'; // PKG-20
export * from './types';
export * from './comms';
export {
  boarding, launchBoarding, pullBack, cannotBoard, defenders, fightOn, isBoarded, gunneryMul, boardBar, hasHangar, spareMarines,
} from './boarding/boarding';
export { massLocked, massLockers } from './boarding/masslock';
export { prizeSummary } from './boarding/summary';
export { BOARDING, MASSLOCK, PRIZE } from './boarding/numbers';
export type { BoardingState, BoardFight, PodGroup } from './boarding/types';
export { ADMIRAL_POLICIES, admiralReport, boardOrderExists, DIFFICULTY, JUPITER, TELEGRAPH } from './admiral';
export type { AdmiralReport, PushReport } from './admiral';
export * from './maneuvers';
export * from './fighters'; // PKG-25

/** The comms layer's public surface (PKG-06): the queue and its keys, direct orders, broadcast, asking. */
export { queue, answerTop, tabNext, answerable, selectedReport } from './queue';
export { command, broadcast, ping, pushback } from './command';
export { comms, timeoutFor, reportedHull } from './core';
export { OFFICER_OF, isOfficerKind } from './officers';
export { COMMS, POINTS, PATIENCE, CANDOUR, PUSHBACK, CREW, MANEUVERS, FIGHTER_TASKS, MARINES, STANDING } from './numbers';
export { standShieldOrder, shieldOrderOn } from './standing';
export { marineJudgement } from './marines';
export { playerAnswersFirst } from './policy';
export type * from './types';
export { watchShip, watchedShips } from './sides';
export { orderSay } from './lines';

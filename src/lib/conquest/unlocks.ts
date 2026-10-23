/**
 * The two steps after the fighter bay (CONQUEST.md section 6), as rules for fleet command to read when it merges:
 * the capital-ship command and the armada. Nothing in the engine flies them yet.
 */
import type { ConquestState } from './state';
import { WORLDS, controlledCount } from './state';
import { SITES } from './sites';

export const STEPS = { capitalLevel: 8, armadaLevel: 10, armadaWorlds: 3 };

/** Worlds whose helium-3 the player holds: a held helium-3 works, or control of a world that makes it. */
export const heldHelium = (c: ConquestState) =>
  SITES.some((s) => s.res === 'helium3' && s.world !== c.home && c.sites[s.id].owner === 'player');

export function capitalCommand(level: number, c: ConquestState): { open: boolean; why: string } {
  if (level < STEPS.capitalLevel) return { open: false, why: `Level ${STEPS.capitalLevel}` };
  const yard = SITES.some((s) => s.kind === 'shipyard' && s.world !== c.home && c.sites[s.id].owner === 'player' && c.worlds[s.world].controlled);
  if (!yard) return { open: false, why: 'Control a world with its shipyard' };
  if (!heldHelium(c)) return { open: false, why: 'Hold a helium-3 source' };
  return { open: true, why: 'Open' };
}

export function armada(level: number, c: ConquestState): { open: boolean; why: string } {
  if (level < STEPS.armadaLevel) return { open: false, why: `Level ${STEPS.armadaLevel}` };
  if (controlledCount(c) < STEPS.armadaWorlds) return { open: false, why: `Control ${STEPS.armadaWorlds} worlds (${controlledCount(c)} of ${WORLDS.length - 1})` };
  return { open: true, why: 'Open' };
}

/**
 * Where game systems plug into the probe (src/dev/probe.ts, METHOD §3 F1) without the probe knowing them.
 * Safe in a production build: it is a map and nothing reads it there (the probe itself is dev-only).
 *
 * - A *source* is a named getter of plain, JSON-able data: `registerProbeSource('battle', () => ...)`.
 *   `__probe.state('battle.ships')` reads it.
 * - A *driver* is the one thing that can step time and take commands: the skirmish registers itself; the sim's adapter
 *   will register through the same call next wave.
 *
 * Both calls return an unregister function (for a React effect's cleanup).
 */
export type ProbeGetter = () => unknown;

export interface ProbeDriver {
  name: string;
  /** Restart on seed `n`. */
  seed(n: number): unknown;
  /** Step `seconds` of game time on the fixed timestep, then render one frame by hand. */
  advance(seconds: number): { t: number; steps: number; frames: number };
  /** The command layer the UI calls. */
  act(verb: string, args: Record<string, unknown>): unknown;
  verbs(): string[];
}

const sources = new Map<string, ProbeGetter>();
let driver: ProbeDriver | null = null;

export function registerProbeSource(name: string, getter: ProbeGetter): () => void {
  sources.set(name, getter);
  return () => { if (sources.get(name) === getter) sources.delete(name); };
}

export function registerProbeDriver(d: ProbeDriver): () => void {
  driver = d;
  return () => { if (driver === d) driver = null; };
}

export const probeSourceNames = () => [...sources.keys()];
export const readProbeSource = (name: string): unknown => sources.get(name)?.();
export const probeDriver = () => driver;

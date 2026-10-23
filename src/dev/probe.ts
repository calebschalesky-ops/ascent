/**
 * The probe (METHOD §3 F1): `window.__probe`, so a tracer drives the battle and reads its state without clicking a
 * real-time 3D game by screenshot. Dev builds only: App.tsx imports this behind `import.meta.env.DEV`, so a production
 * build does not contain it (scripts/smoke.mjs and the PKG-03 acceptance grep `dist/` for PROBE_MARKER).
 *
 *   keys()                 what can be read and done
 *   state(path?)           a JSON copy of the registered sources, or one path in them ('battle.ships', 'camera.mode')
 *   seed(n)                restart the battle on seed n
 *   advance({seconds})     step the battle on its fixed timestep and render a frame by hand (works with the pane hidden)
 *   act(verb, args)        the same command layer the UI calls (camera verbs for now)
 *   flags() / flag(n, on)  the feature flags of src/flags.ts, for this page
 *   smoke()                boot the skirmish, advance 60 s, return {ok, errors[], frames}
 *   bench({frames})        renderer.info and median CPU ms per step+render over hand-driven frames (F5 baseline)
 *   errors()               console errors and uncaught errors seen since the probe was installed
 */
import { FLAGS, setFlag } from '../flags';
import { probeDriver, probeSourceNames, readProbeSource } from './probeSources';

/** A string that exists only in this file, so a grep of `dist/` proves the probe was left out of the build. */
export const PROBE_MARKER = 'ascent-probe:dev-only:F1';

const copy = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

function at(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const k of path.split('.').filter(Boolean)) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

interface ShipLike { id: string; side: number; pos: number[]; status: string }

export function installProbe() {
  const w = window as unknown as { __probe?: unknown };
  if (w.__probe) return;
  const errors: string[] = [];
  const origError = console.error.bind(console);
  console.error = (...args: unknown[]) => { errors.push(args.map((a) => (a instanceof Error ? a.stack ?? a.message : String(a))).join(' ')); origError(...args); };
  window.addEventListener('error', (e) => errors.push(`uncaught: ${e.message}`));
  window.addEventListener('unhandledrejection', (e) => errors.push(`unhandled rejection: ${String((e as PromiseRejectionEvent).reason)}`));

  const all = () => {
    const out: Record<string, unknown> = { flags: FLAGS.map((f) => ({ ...f })) };
    for (const n of probeSourceNames()) out[n] = readProbeSource(n);
    return out;
  };
  const needDriver = () => {
    const d = probeDriver();
    if (!d) throw new Error('no battle loaded: open the game with ?skirmish');
    return d;
  };
  const waitDriver = async (ms: number) => {
    for (let t = 0; t < ms && !probeDriver(); t += 50) await new Promise((r) => setTimeout(r, 50));
    return probeDriver();
  };

  const probe = {
    marker: PROBE_MARKER,
    keys: () => ({
      sources: ['flags', ...probeSourceNames()],
      driver: probeDriver()?.name ?? null,
      verbs: probeDriver()?.verbs() ?? [],
      methods: ['keys', 'state', 'seed', 'advance', 'act', 'flags', 'flag', 'smoke', 'bench', 'errors'],
    }),
    state: (path?: string) => copy(path ? at(all(), path) : all()),
    seed: (n: number) => copy(needDriver().seed(n)),
    advance: ({ seconds = 1 }: { seconds?: number } = {}) => needDriver().advance(seconds),
    act: (verb: string, args: Record<string, unknown> = {}) => copy(needDriver().act(verb, args)),
    flags: () => FLAGS.map((f) => ({ ...f })),
    flag: (name: string, on: boolean) => setFlag(name, on),
    errors: () => [...errors],

    async smoke() {
      const errs: string[] = [];
      const before = errors.length;
      const d = await waitDriver(8000);
      if (!d) return { ok: false, errors: ['no battle driver registered within 8 s: is this ?skirmish?'], frames: 0 };
      let frames = 0;
      const checks: Record<string, unknown> = {};
      try {
        d.seed(1);
        const start = (readProbeSource('battle') as { ships: ShipLike[] }).ships.map((s) => ({ ...s, pos: [...s.pos] }));
        checks.ships = start.length;
        checks.bySide = [start.filter((s) => s.side === 0).length, start.filter((s) => s.side === 1).length];
        if (start.length !== 24) errs.push(`expected 24 ships, saw ${start.length}`);
        if ((checks.bySide as number[]).join('/') !== '12/12') errs.push(`expected 12/12 by side, saw ${(checks.bySide as number[]).join('/')}`);
        for (let i = 0; i < 60; i++) frames += d.advance(1).frames;
        const end = (readProbeSource('battle') as { t: number; ships: ShipLike[]; shotsFired: number });
        const shots = end.shotsFired;
        checks.t = end.t;
        const moved = end.ships.filter((s) => {
          const a = start.find((x) => x.id === s.id);
          return a && Math.hypot(s.pos[0] - a.pos[0], s.pos[1] - a.pos[1], s.pos[2] - a.pos[2]) > 1;
        });
        checks.moved = moved.length;
        checks.shots = shots;
        if (Math.abs(end.t - 60) > 0.05) errs.push(`expected t = 60 s, saw ${end.t}`);
        // Both fleets move (PKG-04: on the real engine a station-keeping escort or a carrier already at range can sit
        // still for the first minute, so "all 24" became "more than half of each side").
        const movedBySide = [0, 1].map((side) => end.ships.filter((s) => s.side === side && moved.includes(s)).length);
        checks.movedBySide = movedBySide;
        if (movedBySide.some((n) => n <= 6)) errs.push(`expected more than half of each fleet to move, saw ${movedBySide.join('/')}`);
        if (end.ships.some((s) => s.pos.some((x) => !Number.isFinite(x)))) errs.push('a ship position is not finite');
        if (!(shots > 0)) errs.push('no shots fired in 60 s');
        const render = readProbeSource('render') as { calls?: number; lost?: boolean } | undefined;
        checks.drawCalls = render?.calls;
        if (!render || !(render.calls! > 0)) errs.push('the last frame drew nothing');
        if (render?.lost) errs.push('the WebGL context is lost');
      } catch (e) {
        errs.push(`threw: ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
      }
      errs.push(...errors.slice(before));
      return { ok: errs.length === 0 && frames >= 60, errors: errs, frames, checks };
    },

    bench({ frames = 300 }: { frames?: number } = {}) {
      const d = needDriver();
      d.seed(1);
      d.advance(30); // into the firefight, so fire is on screen
      d.act('camera.reset', {});
      d.advance(0);
      const render = copy(readProbeSource('render'));
      const ms: number[] = [];
      for (let i = 0; i < frames; i++) {
        const t0 = performance.now();
        d.advance(1 / 30);
        ms.push(performance.now() - t0);
      }
      ms.sort((a, b) => a - b);
      return { frames, render, medianMs: +ms[Math.floor(ms.length / 2)].toFixed(3), p95Ms: +ms[Math.floor(ms.length * 0.95)].toFixed(3) };
    },
  };
  w.__probe = probe;
}

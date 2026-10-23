/**
 * The skirmish mode (Phase A, VISION §16): one battle at one body, no strategy map. Loaded by `?skirmish` (App.tsx),
 * which the title screen's "Fleet battle" opens while the `skirmish` flag is on (PKG-21). It neither loads nor writes the voyage save: a reload starts
 * the battle again from its seed.
 *
 * The battle is the real engine (simFeed.ts over src/battle/sim); `?stub` swaps in the old placeholder for comparison.
 * The sim steps on its fixed 1/30 s inside the render loop (an accumulator, scaled by `feed.timeScale`); the view draws
 * whatever the feed's last frame says and never changes the battle except through `order()`. The probe drives the same
 * loop by hand (registerProbeDriver), so a test with the pane hidden sees the same battle a player does.
 */
import { useEffect, useRef, useState } from 'react';
import { registerProbeDriver, registerProbeSource } from '../../dev/probeSources';
import type { CommandArgs } from './camera';
import { cameraCommands, createCameraRig } from './camera';
import type { Order } from '../sim/index';
import { capturesOf } from './comms/logic'; // PKG-22 (F-07)
import { bodyOf, placeOf, setupById } from '../sim/index'; // PKG-20
import type { BattleEvent, BattleFeed, BattleFrame, Ending } from './model';
import { createBattleView } from './scene';
import type { SimFeed } from './simFeed';
import { createSimFeed } from './simFeed';
import { createStubFeed } from './stubFeed';
import type { CommsController, OrderSpec } from './comms/controller';
import { createCommsController } from './comms/controller';
import CommsHud from './comms/CommsHud';
import { mountDirector } from './director/mount';
import { mountTactical } from './tactical/mount';
import { mountArmed } from './input/armed';
import { setBattleSource } from './input/escort';
import './skirmish.css';

/** Fixed battle timestep, seconds, and the most steps one animation frame may catch up. */
const DT = 1 / 30;
const MAX_CATCHUP = 5;
const START_SEED = 1;
const COMMS_SHOWN = 4;
/** Game seconds the battle keeps playing on screen after it ends (the last jumps and wrecks) before the end screen. */
const END_DELAY = 3;
/** PKG-20: `?skirmish&setup=<id>` picks a registered setup (sim/setups/index.ts); default saturn-12v12. */
const SETUP = setupById(new URLSearchParams(window.location.search).get('setup') ?? undefined);

/** What the help line says the keys do right now (PKG-17): R answers the selected report when it has a third answer,
 * otherwise it resets the view (PKG-09's ruling); Tab only means something with two reports to move between. */
interface HintKeys { r: 'answer' | 'reset'; tab: boolean; tactical: boolean }
interface Hud { t: number; seed: number; sides: { name: string; glow: string; alive: number; total: number; taken: number; lost: number }[]; comms: BattleEvent[]; cameraMode: string; outcome: Ending | null; keys: HintKeys }

// PKG-22 (F-07, TRC05-8): `caps` is each side's prizes taken and ships lost to boarders, frame side order.
const hudOf = (f: BattleFrame, comms: BattleEvent[], cameraMode: string, ended: boolean, keys: HintKeys, caps: { taken: number; lost: number }[] = []): Hud => ({
  t: f.t,
  seed: f.seed,
  outcome: ended ? f.outcome ?? null : null,
  sides: f.sides.map((s, i) => {
    const mine = f.ships.filter((x) => x.side === s.side);
    return { name: s.name, glow: s.colours.glow, alive: mine.filter((x) => x.status === 'alive').length, total: mine.length, taken: caps[i]?.taken ?? 0, lost: caps[i]?.lost ?? 0 };
  }),
  comms: comms.slice(-COMMS_SHOWN),
  cameraMode,
  keys,
});

const clockText = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

const TALLY_ROWS: [keyof NonNullable<Ending['tally']>[number], string][] = [
  ['lost', 'Ships lost'], ['broken', 'Broken'], ['struck', 'Struck'], ['fled', 'Fled'], ['captured', 'Enemy ships it captured'], // PKG-22 (TRC05-8)
];

export default function Skirmish() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  const restartRef = useRef<(seed: number) => void>(() => {});
  const [comms, setComms] = useState<CommsController | null>(null);

  useEffect(() => {
    const host = hostRef.current!;
    const rig = createCameraRig();
    const stub = new URLSearchParams(window.location.search).has('stub');
    const sim: SimFeed | null = stub ? null : createSimFeed(START_SEED, SETUP); // PKG-20: the picked setup
    const feed: BattleFeed = sim ?? createStubFeed(START_SEED);
    const view = createBattleView(host, rig, bodyOf(SETUP)); // PKG-20: the setup's body
    const commands = cameraCommands(rig);
    const cx = sim ? createCommsController(sim, view, host) : null;
    setComms(cx);
    const director = mountDirector({ host, view, rig, log: () => sim?.battle() ?? null });
    const tac = sim ? mountTactical({ host, view, rig, sim, director, comms: cx }) : null; // PKG-12: the tactical view
    const armedUi = cx ? mountArmed({ host, view, comms: cx }) : null; // PKG-21 F-12
    setBattleSource(sim ? () => sim.battle() : null); // PKG-21: the roster, enemy list and escort warning read the battle
    let comms: BattleEvent[] = [];
    let shotsFired = 0;
    let frames = 0;
    let lost = false;
    let lastHud = 0;
    let sinceEnd = 0;

    const hintKeys = (): HintKeys => ({ r: cx?.canAnswer(2) ? 'answer' : 'reset', tab: (cx?.snapshot().answerable ?? 0) > 1, tactical: !!tac?.enabled() });
    const caps = () => { const B = sim?.battle(); if (!B) return []; const k = capturesOf(B); return [k.player, k.enemy]; }; // PKG-22
    const pushHud = () => { setHud(hudOf(feed.frame(), comms, rig.state.mode, sinceEnd >= END_DELAY, hintKeys(), caps())); cx?.refresh(); };
    const stepOnce = () => {
      const f = feed.step(DT);
      if (f.outcome) sinceEnd += DT;
      shotsFired += f.shots.length;
      if (f.events.length) comms = [...comms, ...f.events].slice(-20);
      view.ingest(f, DT);
      director.step(f, DT);
      tac?.step();
    };
    const draw = () => { view.render(); frames++; };
    const restart = (seed: number) => {
      const f = feed.reset(seed);
      comms = [];
      shotsFired = 0;
      sinceEnd = 0;
      view.reset(f);
      cx?.reset();
      director.reset();
      tac?.reset();
      draw();
      pushHud();
      return f;
    };
    restart(START_SEED);
    restartRef.current = (n) => { restart(n); };

    const act = (verb: string, args: CommandArgs) => {
      if (verb === 'order') {
        // The player's orders: the same call the UI will make, for his own side only.
        if (!sim) throw new Error('order needs the real engine (open without ?stub)');
        const a = args as unknown as { ship: string; order: Order };
        const ok = sim.order(a.ship, a.order);
        pushHud();
        return { ok };
      }
      if (cx && (verb === 'answer' || verb === 'tab' || verb === 'select' || verb === 'orderUI' || verb === 'target' || verb === 'ping')) {
        // The comms UI's verbs (PKG-09): the same methods the keys, buttons and clicks call.
        const a = args as Record<string, unknown>;
        const out = verb === 'answer' ? cx.answer(Number(a.i)) : verb === 'tab' ? { cursor: cx.tab() }
          : verb === 'select' ? (cx.select((a.ship as string | null) ?? null), { selected: cx.snapshot().selected })
            : verb === 'target' ? cx.targetShip(String(a.ship)) : verb === 'ping' ? cx.ping(String(a.ship))
              : cx.order(a as unknown as OrderSpec);
        pushHud();
        return out;
      }
      if (tac && verb.startsWith('tactical')) { const out = tac.act(verb, args); pushHud(); return out; } // PKG-12
      if (verb === 'time.scale') {
        // Game seconds per real second for the frame loop: 0 pauses, 0.25 is the tactical view's slow time.
        const k = Number((args as { scale?: unknown }).scale);
        if (!Number.isFinite(k) || k < 0 || k > 4) throw new Error('time.scale needs {scale} in 0..4');
        feed.timeScale = k;
        return { timeScale: k };
      }
      const c = commands[verb];
      if (!c) throw new Error(`unknown verb ${verb}; verbs: ${Object.keys(commands).join(', ')}`);
      const out = c(args);
      view.ingest(feed.frame(), 0); // the camera moves on the input frame
      return out;
    };

    // The loop: real time, fixed steps.
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      acc += Math.min(0.25, (now - last) / 1000) * feed.timeScale;
      last = now;
      let n = 0;
      while (acc >= DT && n < MAX_CATCHUP) { stepOnce(); acc -= DT; n++; }
      if (n === MAX_CATCHUP) acc = 0;
      draw();
      if (now - lastHud > 250) { lastHud = now; pushHud(); }
    };
    raf = requestAnimationFrame(tick);

    // Input: the same command layer the probe calls.
    const canvas = view.renderer.domElement;
    const onLost = (e: Event) => { e.preventDefault(); lost = true; };
    canvas.addEventListener('webglcontextlost', onLost);
    let drag: { x: number; y: number; id: number } | null = null;
    const down = (e: PointerEvent) => { drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; canvas.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      // PKG-21 F-11: a press whose release never reached the canvas must not leave the view orbiting on every hover.
      if (!(e.buttons & 1)) { drag = null; return; }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      act('camera.orbit', { yaw: -dx * 0.006, pitch: dy * 0.006 });
    };
    const up = (e: PointerEvent) => { if (drag?.id === e.pointerId) drag = null; };
    const wheel = (e: WheelEvent) => { e.preventDefault(); act('camera.zoom', { factor: Math.exp(e.deltaY * 0.0012) }); };
    const key = (e: KeyboardEvent) => {
      const k = e.key;
      const plain = !e.ctrlKey && !e.metaKey && !e.altKey;
      // Comms (PKG-09, BRIDGE §4): Q/E/R answer the selected report, Tab moves down the queue. R answers only when the
      // selected report has a third answer; otherwise it stays the camera reset.
      if (cx && plain && (k === 'q' || k === 'Q')) cx.answer(0);
      else if (cx && plain && (k === 'e' || k === 'E')) cx.answer(1);
      else if (cx && plain && (k === 'r' || k === 'R') && cx.canAnswer(2)) cx.answer(2);
      else if (cx && plain && k === 'Tab') cx.tab();
      else if (tac?.enabled() && plain && (k === 't' || k === 'T')) tac.toggle(); // PKG-12: the tactical view
      else if (k === 'ArrowLeft') act('camera.orbit', { yaw: 0.08 });
      else if (k === 'ArrowRight') act('camera.orbit', { yaw: -0.08 });
      else if (k === 'ArrowUp') act('camera.orbit', { pitch: 0.06 });
      else if (k === 'ArrowDown') act('camera.orbit', { pitch: -0.06 });
      else if (k === '+' || k === '=') act('camera.zoom', { factor: 0.85 });
      else if (k === '-') act('camera.zoom', { factor: 1.18 });
      else if (k === 'r' || k === 'R') { if (tac?.on()) tac.resetView(); else act('camera.reset', {}); } // PKG-21 F-11
      else if (cx && k === 'Escape' && !e.defaultPrevented) {
        // PKG-21 (F-12, TRC05-4): Esc stands down an armed crew order or a menu first, then clears the selection.
        const s = cx.snapshot();
        if (s.armed || s.menu || s.pingMenu) cx.closeMenus();
        else if (s.selected) cx.select(null);
        else return;
      } else return;
      e.preventDefault();
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('keydown', key);
    const ro = new ResizeObserver(() => { view.resize(); draw(); });
    ro.observe(host);

    // The probe's view of the battle (dev builds; registering is harmless in production).
    const offs = [
      // 'battle': the view's frame (ships by side 0/1, positions in battle units: what smoke() reads), and under `sim`
      // the engine's whole serialisable Battle (morale, shields, captains, log), so a tracer can read what the player
      // is not shown. The view model itself carries none of that for enemy ships.
      registerProbeSource('battle', () => {
        const f = feed.frame();
        return { feed: feed.name, t: f.t, seed: f.seed, sides: f.sides, ships: f.ships, outcome: f.outcome ?? null, shotsFired, comms, timeScale: feed.timeScale, sim: sim ? sim.battle() : null };
      }),
      registerProbeSource('camera', () => ({ ...rig.state })),
      registerProbeSource('render', () => ({ ...view.info(), frames, lost })),
      registerProbeDriver({
        name: 'skirmish',
        seed: (n) => restart(n),
        advance: (seconds) => {
          const steps = Math.max(0, Math.round(seconds / DT));
          for (let i = 0; i < steps; i++) stepOnce();
          draw();
          pushHud();
          return { t: feed.frame().t, steps, frames: 1 };
        },
        act,
        verbs: () => [...Object.keys(commands), 'time.scale', ...(sim ? ['order', 'answer', 'tab', 'select', 'target', 'orderUI', 'ping'] : []), ...(tac?.verbs ?? [])],
      }),
    ];

    return () => {
      cancelAnimationFrame(raf);
      offs.forEach((off) => off());
      ro.disconnect();
      window.removeEventListener('keydown', key);
      armedUi?.dispose();
      setBattleSource(null);
      cx?.dispose();
      canvas.removeEventListener('webglcontextlost', onLost);
      tac?.dispose();
      director.dispose();
      view.dispose();
    };
  }, []);

  return (
    <div className="skirmish">
      <div className="skirmish-stage" ref={hostRef} />
      {comms && hud && <CommsHud ctl={comms} />}
      {hud && (
        <>
          <header className="skirmish-top">
            <div className="skirmish-title">
              <h1>Skirmish</h1>
              <span>{placeOf(SETUP)} · {clockText(hud.t)}</span>
            </div>
            <ul className="skirmish-sides">
              {hud.sides.map((s) => (
                <li key={s.name} style={{ ['--house' as string]: s.glow }}>
                  <i aria-hidden="true" />{s.name} <b title="In the fight / ships under this flag">{s.alive}/{s.total}</b>
                  {(s.taken > 0 || s.lost > 0) && <small className="skirmish-caps">{[s.taken ? `${s.total - s.taken} + ${s.taken} taken` : '', s.lost ? `${s.lost} lost to boarders` : ''].filter(Boolean).join(' · ')}</small>}
                </li>
              ))}
            </ul>
            {/* PKG-17: the help line says what R and Tab do now; it lives in the header, clear of the order bar. */}
            <p className="skirmish-hint">
              <span>Drag to turn</span>
              <span className="skirmish-hint-desk"> · wheel to zoom</span>
              <span className="skirmish-hint-desk"> · <kbd>R</kbd> {hud.keys.r === 'answer' ? 'answers the selected report' : 'resets the view'}</span>
              {hud.keys.tab && <span className="skirmish-hint-desk"> · <kbd>Tab</kbd> next report</span>}
              {hud.keys.tactical && <span className="skirmish-hint-desk"> · <kbd>T</kbd> tactical</span>}
              {hud.cameraMode === 'player' && <span> · your camera</span>}
            </p>
          </header>
          <footer className="skirmish-bottom">
            <ol className="skirmish-comms" aria-label="Comms">
              {hud.comms.length === 0 && <li className="quiet">The fleets close.</li>}
              {hud.comms.map((c, i) => <li key={`${c.t}-${i}`}><time>{clockText(c.t)}</time> {c.text}</li>)}
            </ol>
          </footer>
          {hud.outcome && (
            <section className="skirmish-end" role="dialog" aria-label="Battle over">
              <div className="skirmish-end-card">
                <h2>{hud.outcome.text}</h2>
                {hud.outcome.reason && <p className="skirmish-end-reason">{hud.outcome.reason}</p>}
                <p className="skirmish-end-when">{hud.outcome.kind ? `${hud.outcome.kind} · ` : ''}{clockText(hud.t)}</p>
                {hud.outcome.tally && (
                  <table className="skirmish-end-table">
                    <thead>
                      <tr><th scope="col" />{hud.sides.map((s) => <th scope="col" key={s.name} style={{ ['--house' as string]: s.glow }}><i aria-hidden="true" />{s.name}</th>)}</tr>
                    </thead>
                    <tbody>
                      {TALLY_ROWS.map(([k, label]) => (
                        <tr key={k}><th scope="row">{label}</th>{hud.outcome!.tally!.map((t, i) => <td key={i}>{t[k]}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <button type="button" className="skirmish-end-restart" onClick={() => restartRef.current(hud.seed + 1)}>Restart</button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

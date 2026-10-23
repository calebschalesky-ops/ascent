/**
 * The shakedown flight: the tutorial, run in the real game. A coach panel says what to do; each step ends when the
 * flight shows it was done (lib/opening/tutorial.ts). It sets up what a step needs (drill targets, the home berth as
 * the target, a scuffed hull to repair), can go back a step, and can be skipped. Its place is saved on every step.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Dest } from '../../lib/nav';
import type { FlightProbe, StepId, StepMemory, TutorialState } from '../../lib/opening/tutorial';
import { DRILL_HULL, DRILL_STEPS, howTo, memoryAt, nextStep, observe, prevStep, stepDone, stepsFor } from '../../lib/opening/tutorial';
import type { VoyageApi } from '../Voyage';
import type { Binds } from '../controls/bindings';

interface Props {
  api: () => VoyageApi | null;
  state: TutorialState;
  home: Dest; // the berth the autopilot lesson flies to
  homeLabel: string;
  binds: Binds; // the player's keys: every lesson names the key they are bound to
  paused: boolean;
  onState: (t: TutorialState) => void;
  onFinish: (skipped: boolean) => void;
}

const POLL = 0.15; // seconds
/** A step not done after this long offers "Skip this step", so a stuck flight never traps the player in the tutorial. */
const STUCK_MS = 45000;

export default function Shakedown({ api, state, home, homeLabel, binds, paused, onState, onFinish }: Props) {
  const touch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const [weapons, setWeapons] = useState<FlightProbe['weapons'] | null>(null);
  const [tick, setTick] = useState<'doing' | 'done'>('doing');
  const [asking, setAsking] = useState(false);
  const [min, setMin] = useState(false);
  // The navigation screen is drawn over the whole page: while it is open the coach goes over it too.
  const [overNav, setOverNav] = useState(false);
  const [stuck, setStuck] = useState(false);
  const memRef = useRef<StepMemory | null>(null);
  const respawnRef = useRef(performance.now());
  const step = state.step;
  const steps = weapons ? stepsFor(weapons) : [];
  const idx = steps.findIndex((s) => s.id === step);
  const cur = idx >= 0 ? steps[idx] : null;

  // The fit's weapons, once the flight is up.
  useEffect(() => {
    if (weapons) return;
    const id = setInterval(() => { const p = api()?.probe(); if (p) setWeapons(p.weapons); }, 100);
    return () => clearInterval(id);
  }, [api, weapons]);

  // A step whose lesson the fit cannot do (a save from another fit) moves on to the next one that it can.
  useEffect(() => {
    if (!weapons || !step || idx >= 0) return;
    const n = nextStep(steps, step);
    if (n) onState({ ...state, step: n }); else onFinish(false);
  }, [weapons, step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Set up what the step needs, and start its memory from now.
  useEffect(() => {
    const a = api();
    if (!a || !cur) return;
    const p = a.probe();
    memRef.current = memoryAt(p);
    setTick('doing');
    setStuck(false);
    const drill = DRILL_STEPS.includes(cur.id);
    a.holdStation(drill);
    if (drill) { if (p.drillLeft < 2) a.drill(5); } else if (p.drillLeft) a.drill(0);
    if (cur.id === 'autopilot') {
      if (!p.auto && p.target !== home) a.setTarget(home);
      if (p.hull >= p.maxHull) a.setHull(DRILL_HULL);
    }
    if ((cur.id === 'dock' || cur.id === 'repair') && p.hull >= p.maxHull && !p.docked) a.setHull(DRILL_HULL);
  }, [cur?.id, api]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!cur || paused || tick === 'done') return;
    const id = setTimeout(() => setStuck(true), STUCK_MS);
    return () => clearTimeout(id);
  }, [cur?.id, paused, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Watch the flight. A finished step shows its tick for a moment, then the next one starts.
  useEffect(() => {
    if (!cur || paused || tick === 'done') return;
    const id = setInterval(() => {
      const a = api();
      const m = memRef.current;
      if (!a || !m) return;
      const p = a.probe();
      setOverNav(p.nav !== null);
      const next = observe(m, p, POLL);
      memRef.current = next;
      // Drill targets: more when they run low, and new ones ahead when the ship has left them behind.
      if (DRILL_STEPS.includes(cur.id) && !p.docked) {
        const now = performance.now();
        if (p.drillLeft < 2) a.drill(5);
        else if (!p.drillAhead && now - respawnRef.current > 4000) { respawnRef.current = now; a.drill(0); a.drill(5); }
      }
      if (stepDone(cur.id, next)) setTick('done');
    }, POLL * 1000);
    return () => clearInterval(id);
  }, [cur?.id, paused, tick, api]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tick !== 'done' || !cur) return;
    const id = setTimeout(() => {
      const n = nextStep(steps, cur.id);
      if (n) onState({ ...state, step: n });
      else { api()?.drill(0); api()?.holdStation(false); onFinish(false); }
    }, 900);
    return () => clearTimeout(id);
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cur || !weapons) return null;
  const back = prevStep(steps, cur.id);
  const skip = () => { api()?.drill(0); api()?.holdStation(false); onFinish(true); };
  /** Past a step that will not finish; without a berth, the repair and undock lessons go with the docking one. */
  const skipStep = () => {
    const docked = !!api()?.probe().docked;
    let n = nextStep(steps, cur.id);
    while (n && !docked && (n === 'repair' || n === 'undock')) n = nextStep(steps, n);
    if (n) onState({ ...state, step: n }); else { api()?.drill(0); api()?.holdStation(false); onFinish(false); }
  };
  const how = cur.id === 'autopilot' ? howTo(cur, binds, touch).replace('Your home berth', homeLabel) : howTo(cur, binds, touch);
  const panel = (
    <aside className={`shakedown${tick === 'done' ? ' done' : ''}${min ? ' min' : ''}${paused ? ' paused' : ''}${overNav ? ' over-nav' : ''}`} aria-label="Shakedown flight" aria-live="polite">
      <header className="sk-head">
        <span className="sk-kicker">Shakedown flight · {idx + 1} of {steps.length}</span>
        <button className="sk-min" onClick={() => setMin(!min)} aria-label={min ? 'Show the lesson' : 'Hide the lesson'} aria-expanded={!min}>{min ? '▴' : '▾'}</button>
      </header>
      <h3 className="sk-title">{tick === 'done' ? '✓ ' : ''}{cur.title}</h3>
      {!min && (
        <>
          <p className="sk-how">{how}</p>
          <ol className="sk-dots" aria-hidden="true">
            {steps.map((s, i) => <li key={s.id} className={i < idx || (i === idx && tick === 'done') ? 'done' : i === idx ? 'on' : ''} />)}
          </ol>
          {asking ? (
            <div className="sk-ask">
              <span>Skip the rest? You can fly straight to your first goal.</span>
              <button className="btn small" onClick={skip}>Skip</button>
              <button className="btn ghost small" onClick={() => setAsking(false)}>Keep going</button>
            </div>
          ) : (
            <div className="sk-btns">
              <button className="btn ghost small" disabled={!back} onClick={() => back && onState({ ...state, step: back as StepId })}>‹ Back a step</button>
              {stuck && <button className="btn ghost small" onClick={skipStep}>Skip this step</button>}
              <button className="btn ghost small" onClick={() => setAsking(true)}>Skip tutorial</button>
            </div>
          )}
        </>
      )}
    </aside>
  );
  return overNav ? createPortal(panel, document.body) : panel;
}

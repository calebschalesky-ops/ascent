/**
 * A new game: choose your people, make your pilot, fit your first ship, then launch the shakedown flight. Every step
 * can go back; going back to the people and choosing another starts the pilot and ship afresh for that people.
 */
import { useEffect, useRef, useState } from 'react';
import type { NationId } from '../../lib/nations';
import { NATIONS } from '../../lib/nations';
import { peopleOf } from '../../lib/races';
import type { Fit } from '../../lib/progression/catalog';
import type { Pilot } from '../../lib/opening/profile';
import { defaultPilot } from '../../lib/opening/profile';
import { firstFitProblem, standardFit } from '../../lib/opening/fit';
import FactionStep from './FactionStep';
import PilotStep from './PilotStep';
import ShipStep from './ShipStep';

type StepKey = 'people' | 'pilot' | 'ship';
const STEPS: { key: StepKey; label: string }[] = [
  { key: 'people', label: 'People' },
  { key: 'pilot', label: 'Pilot' },
  { key: 'ship', label: 'Ship' },
];

interface Props {
  onDone: (pilot: Pilot, fit: Fit) => void;
  onBack: () => void;
  replaces: boolean; // a saved game exists and starting will replace it
}

export default function NewGame({ onDone, onBack, replaces }: Props) {
  const [step, setStep] = useState<StepKey>('people');
  const [pilot, setPilot] = useState<Pilot>(() => defaultPilot('earth'));
  const [fit, setFit] = useState<Fit>(() => standardFit('earth'));
  const nation = pilot.nation;
  const color = NATIONS.find((n) => n.id === nation)!.color;
  const i = STEPS.findIndex((s) => s.key === step);
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => { topRef.current?.scrollTo?.({ top: 0 }); }, [step]);

  const pickNation = (n: NationId) => {
    if (n === nation) return;
    setPilot(defaultPilot(n));
    setFit(standardFit(n));
  };
  const problem = step === 'pilot' && !pilot.avatar.name.trim() ? 'Your pilot needs a name.'
    : step === 'ship' && !pilot.ship.name.trim() ? 'Your ship needs a name.'
      : step === 'ship' ? firstFitProblem(fit) : null;
  const back = () => (i === 0 ? onBack() : setStep(STEPS[i - 1].key));
  const next = () => {
    if (problem) return;
    if (step === 'ship') onDone({ ...pilot, avatar: { ...pilot.avatar, name: pilot.avatar.name.trim() }, ship: { ...pilot.ship, name: pilot.ship.name.trim() } }, fit);
    else setStep(STEPS[i + 1].key);
  };
  // Esc goes back a step, as the Back button does.
  const backRef = useRef(back);
  backRef.current = back;
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      const t = e.target;
      const typing = (t instanceof HTMLInputElement && t.type === 'text') || t instanceof HTMLSelectElement;
      if (e.key !== 'Escape' || typing) return;
      e.preventDefault();
      backRef.current();
    };
    addEventListener('keydown', kd);
    return () => removeEventListener('keydown', kd);
  }, []);

  const people = peopleOf(nation);
  const nextLabel = step === 'people' ? `Play the ${people.name}` : step === 'pilot' ? 'To the hangar' : 'Launch the shakedown flight';
  return (
    <div className="opening" style={{ ['--c' as string]: color }} ref={topRef}>
      <div className="op-frame">
        <header className="op-head">
          <button className="op-back" onClick={back} aria-label={i === 0 ? 'Back to the main menu' : `Back to ${STEPS[i - 1].label}`}>‹ Back</button>
          <ol className="op-steps" aria-label="New game">
            {STEPS.map((s, k) => (
              <li key={s.key} className={k === i ? 'on' : k < i ? 'done' : ''} aria-current={k === i ? 'step' : undefined}>
                {k < i ? <button onClick={() => setStep(s.key)}>{k + 1} · {s.label}</button> : <span>{k + 1} · {s.label}</span>}
              </li>
            ))}
          </ol>
        </header>
        <h1 className="op-title">{step === 'people' ? 'Choose your people' : step === 'pilot' ? `Your ${people.demonym}` : 'Your first ship'}</h1>
        <main className="op-body">
          {step === 'people' && <FactionStep nation={nation} onPick={pickNation} />}
          {step === 'pilot' && <PilotStep nation={nation} avatar={pilot.avatar} onChange={(avatar) => setPilot({ ...pilot, avatar })} />}
          {step === 'ship' && <ShipStep nation={nation} look={pilot.ship} fit={fit} onLook={(ship) => setPilot({ ...pilot, ship })} onFit={setFit} />}
        </main>
        <footer className="op-foot">
          {problem ? <span className="op-problem" role="alert">{problem}</span> : step === 'ship' && replaces ? <span className="small muted">Launching replaces your saved game.</span> : <span />}
          <div className="op-foot-btns">
            <button className="btn ghost" onClick={back}>Back</button>
            <button className="btn" onClick={next} disabled={!!problem}>{nextLabel}</button>
          </div>
        </footer>
      </div>
    </div>
  );
}

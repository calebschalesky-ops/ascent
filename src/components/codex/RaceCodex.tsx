/**
 * The race codex: every people of the system on its own page, with its art and its description. Opened from the main
 * menu and the pause menu. Data from lib/races.ts (PEOPLES); the long lore is LORE.md.
 *
 * Esc, or the close button, closes it; ← and → (or the tabs) turn the page. The keys are caught before the flight's own
 * handler, so Esc here never toggles the pause menu underneath.
 */
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { NationId } from '../../lib/nations';
import type { ClassKind } from '../../lib/races';
import { aDemonym } from '../../lib/raceArt';
import { PEOPLES } from '../../lib/races';
import Emblem from './art/Emblem';
import HomeBase from './art/HomeBase';
import RacePortrait from './art/RacePortrait';
import ShipLineup from './art/ShipLineup';

const KIND: Record<ClassKind, string> = { capital: 'Capital ship', cruiser: 'Cruiser', fighter: 'Fighter', special: 'Special' };
const BASE_KIND = { capital: 'Capital', station: 'Station', outpost: 'Outpost' } as const;
const CULTURE: [keyof (typeof PEOPLES)[number]['culture'], string][] = [
  ['customs', 'Customs'], ['belief', 'Belief'], ['arts', 'Arts'], ['honour', 'War and honour'], ['daily', 'Daily life'],
];

export default function RaceCodex({ onClose, start = 'earth' }: { onClose: () => void; start?: NationId }) {
  const [i, setI] = useState(Math.max(0, PEOPLES.findIndex((p) => p.nation === start)));
  const scroller = useRef<HTMLDivElement>(null);
  const p = PEOPLES[i];
  const go = (k: number) => setI((x) => (x + k + PEOPLES.length) % PEOPLES.length);

  useEffect(() => { scroller.current?.scrollTo({ top: 0 }); }, [i]);
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); onClose(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); go(1); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); go(-1); return; }
      e.stopImmediatePropagation(); // nothing reaches the ship while the codex is open
    };
    addEventListener('keydown', kd, true);
    return () => removeEventListener('keydown', kd, true);
  }, [onClose]);

  const style = { '--accent': p.palette.accent, '--glow': p.palette.glow, '--hull': p.palette.hull } as CSSProperties;
  return (
    <div className="codex" role="dialog" aria-label="Peoples of the System" style={style}>
      <header className="codex-top">
        <h2>Peoples of the System</h2>
        <button className="codex-close" onClick={onClose} aria-label="Close the codex">✕</button>
      </header>
      <nav className="codex-tabs" aria-label="Peoples">
        {PEOPLES.map((q, k) => (
          <button key={q.nation} className={k === i ? 'on' : ''} aria-selected={k === i} onClick={() => setI(k)}
            style={{ '--tab': q.palette.accent } as CSSProperties}>
            {q.name}
          </button>
        ))}
      </nav>
      <div className="codex-scroll" ref={scroller}>
        <article className="codex-page" data-nation={p.nation}>
          <section className="codex-hero">
            <div className="codex-emblem"><Emblem nation={p.nation} /></div>
            <div>
              <p className="codex-kicker">{p.nation === 'earth' ? 'Earth' : `${p.nation[0].toUpperCase()}${p.nation.slice(1)}`} · one {p.demonym}</p>
              <h3>{p.name}</h3>
              <p className="codex-epithet">{p.epithet}</p>
              <p>{p.line}</p>
            </div>
          </section>

          <section className="codex-two">
            <figure className="codex-portrait"><RacePortrait key={p.nation} nation={p.nation} /><figcaption>{aDemonym(p.demonym)}</figcaption></figure>
            <div className="codex-card">
              <h4>Government</h4>
              <p className="codex-gov"><b>{p.government.name}</b> <span className="codex-tag">{p.government.type.replace('-', ' ')}</span></p>
              <p className="muted-i">{p.government.model}</p>
              <dl>
                <dt>Who rules</dt><dd>{p.government.rulers}</dd>
                <dt>How power passes</dt><dd>{p.government.succession}</dd>
                <dt>How it goes to war</dt><dd>{p.government.war}</dd>
              </dl>
            </div>
          </section>

          <section className="codex-card">
            <h4>Culture</h4>
            <dl className="codex-culture">
              {CULTURE.map(([k, label]) => <div key={k}><dt>{label}</dt><dd>{p.culture[k]}</dd></div>)}
            </dl>
          </section>

          <section className="codex-card">
            <h4>Bases</h4>
            <figure className="codex-wide"><HomeBase nation={p.nation} /></figure>
            <ul className="codex-bases">
              {p.bases.map((b) => (
                <li key={b.id}>
                  <span className={`codex-tag ${b.kind}`}>{BASE_KIND[b.kind]}</span> <b>{b.name}</b> <span className="muted-i">— {b.where}</span>
                  <br />{b.line}
                </li>
              ))}
            </ul>
          </section>

          <section className="codex-card">
            <h4>Ships</h4>
            <figure className="codex-wide"><ShipLineup nation={p.nation} /></figure>
            <ul className="codex-ships">
              {p.ships.map((s) => (
                <li key={s.id}>
                  <b>{s.name}</b> <span className="codex-tag">{KIND[s.kind]}</span> <span className="muted-i">{s.role} · {s.length}× the player ship</span>
                  <br />{s.line}
                </li>
              ))}
            </ul>
          </section>

          <footer className="codex-foot">
            <button className="btn ghost" onClick={() => go(-1)}>← {PEOPLES[(i + PEOPLES.length - 1) % PEOPLES.length].name}</button>
            <span className="small">DRAFT · {i + 1} of {PEOPLES.length}</span>
            <button className="btn ghost" onClick={() => go(1)}>{PEOPLES[(i + 1) % PEOPLES.length].name} →</button>
          </footer>
        </article>
      </div>
    </div>
  );
}

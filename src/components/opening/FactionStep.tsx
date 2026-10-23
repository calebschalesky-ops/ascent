/**
 * Step 1 of a new game: choose your people. All seven nations can be played (Caleb's ruling, 2026-10-19). Each shows
 * its pitch, its home world, its cruiser turning in the hangar, and how it plays.
 */
import type { NationId } from '../../lib/nations';
import { NATIONS } from '../../lib/nations';
import { peopleOf } from '../../lib/races';
import { RACE_REFS, raceRef } from '../../lib/progression/refs';
import { fitModules, fitStats, loadoutOf, moduleOf } from '../../lib/progression/catalog';
import { RIVAL } from '../../lib/opening/goal';
import Emblem from '../codex/art/Emblem';
import { fitLoadout } from '../../lib/progression/progress';
import ShipViewer from './ShipViewer';

/** Each home, in a line: where they live and what that does to them (LORE.md's NASA table). */
const HOME_LINE: Record<NationId, { world: string; facts: string }> = {
  earth: { world: 'Earth', facts: '1 g · a 24-hour day · open air and oceans' },
  moon: { world: 'The Moon', facts: '0.165 g · two weeks of light, two of dark · no air' },
  mercury: { world: 'Mercury', facts: '0.38 g · 6.7× Earth’s sunlight · a city that walks the twilight' },
  venus: { world: 'Venus, the clouds', facts: '0.91 g · floating cities 50 km up · acid air' },
  mars: { world: 'Mars', facts: '0.38 g · a 24.66-hour day · thin air, no magnetic field' },
  jupiter: { world: 'Callisto and Ganymede', facts: '0.13–0.15 g · 4% of Earth’s sunlight · Jupiter fills the sky' },
  saturn: { world: 'Titan', facts: '0.14 g · thick nitrogen air · −179 °C · methane seas' },
};

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default function FactionStep({ nation, onPick }: { nation: NationId; onPick: (n: NationId) => void }) {
  const people = peopleOf(nation);
  const ref = raceRef(nation);
  const fit = loadoutOf(nation, 'cruiser');
  const s = fitStats(fit);
  const color = NATIONS.find((n) => n.id === nation)!.color;
  const capital = people.bases.find((b) => b.kind === 'capital');
  const cruiser = people.ships.find((x) => x.kind === 'cruiser');
  const rival = peopleOf(RIVAL[nation]);
  return (
    <div className="op-faction">
      <div className="op-peoples" role="radiogroup" aria-label="Peoples">
        {RACE_REFS.map((r) => {
          const p = peopleOf(r.nation);
          const c = NATIONS.find((n) => n.id === r.nation)!.color;
          return (
            <button key={r.nation} role="radio" aria-checked={r.nation === nation} aria-label={`${p.name}, ${HOME_LINE[r.nation].world}`} className={r.nation === nation ? 'op-people on' : 'op-people'}
              style={{ ['--c' as string]: c }} onClick={() => onPick(r.nation)}>
              <span className="op-emblem"><Emblem nation={r.nation} /></span>
              <span className="op-people-text">
                <span className="op-people-home">{HOME_LINE[r.nation].world}</span>
                <strong>{p.name}</strong>
              </span>
            </button>
          );
        })}
      </div>
      <section className="op-detail" style={{ ['--c' as string]: color }} aria-live="polite">
        <header className="op-detail-head">
          <div>
            <p className="op-kicker">{HOME_LINE[nation].world} · {people.epithet}</p>
            <h2>{people.name}</h2>
          </div>
        </header>
        <p className="op-pitch">{people.line}</p>
        <div className="op-detail-grid">
          <ShipViewer nation={nation} look={{ trim: 0, finish: 0 }} loadout={fitLoadout(fit)} label={`The ${ref.ships.cruiser}, the ${people.demonym} cruiser`} />
          <dl className="op-facts">
            <div><dt>Home</dt><dd>{capital ? `${capital.name}. ` : ''}{HOME_LINE[nation].facts}</dd></div>
            <div><dt>Rule</dt><dd>{people.government.name}: {people.government.model.split(':')[0]}</dd></div>
            <div><dt>Your ship</dt><dd><strong>{ref.ships.cruiser}</strong>{cruiser ? `: ${cruiser.line}` : ''}</dd></div>
            <div><dt>How they fight</dt><dd>{ref.doctrine}</dd></div>
            <div><dt>Level-1 fit</dt><dd>{fitModules(fit).map((m) => moduleOf(m).label).join(' · ')}</dd></div>
            <div><dt>On paper</dt><dd>{s.dps} damage/s · {s.shield ? `${s.shield} shield` : 'no shield'}{s.hp ? ` · +${s.hp} hull` : ''}{s.dodge ? ` · ${pct(s.dodge)} dodge` : ''}{s.lock < 1 ? ' · fast lock' : ''}{s.regen ? ' · self-repair' : ''}</dd></div>
            <div><dt>Old enemy</dt><dd>The {rival.name}</dd></div>
          </dl>
        </div>
      </section>
    </div>
  );
}

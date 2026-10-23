import type { ReactNode } from 'react';
import { PLANET_NAME, RADIUS_KM, isPlanet } from '../lib/bodies';
import type { Dest } from '../lib/nav';
import { DEST_LABEL, fmtDist } from '../lib/nav';
import { destColor } from './NavOverlay';
import { raceOf } from '../lib/races';
import { moonById } from '../lib/moons';
import { destKindLine, holderOf } from '../lib/world';

interface Props {
  dest: Dest;
  distance: number | null; // to the surface, in voyage units
  onClose: () => void;
  next?: { label: string; onClick: () => void }; // on a route: leave this stop for the next
  enter?: () => void; // go into the body
  extra?: ReactNode; // rows a game layer adds (conquest: production, sites, resources)
  dock?: () => void; // dock at the station (only offered within docking range)
}

const sizeVsEarth = (k: number) => (k >= 1 ? `${k >= 10 ? Math.round(k) : k.toFixed(1)} × Earth’s` : `${Math.round(k * 100)}% of Earth’s`);

/** Arriving at a destination: what it is, how big, how far, and the way in. Physics only. */
export default function ArrivalCard({ dest, distance, onClose, next, enter, extra, dock }: Props) {
  const title = isPlanet(dest) ? PLANET_NAME[dest] : DEST_LABEL[dest];
  const nation = holderOf(dest);
  const race = nation && raceOf(nation.id);
  const radius = isPlanet(dest) ? RADIUS_KM[dest] : dest === 'earth' ? RADIUS_KM.earth : moonById(dest)?.radiusKm ?? null;
  const kind = destKindLine(dest);
  return (
    <article className="arrival parchment" role="dialog" aria-label={title}>
      <header className="sheet-head" style={{ ['--c' as string]: destColor(dest) }}>
        <div className="sheet-title">
          <div><h2>{title}</h2>{kind && <p className="small muted">{kind}</p>}</div>
        </div>
        <button className="close" onClick={onClose} aria-label="Close">×</button>
      </header>
      <div className="sheet-body">
        {(next || enter || dock) && (
          <div className="card-next">
            {enter && <button className="btn" onClick={enter}>Enter {title} ›</button>}
            {dock && <button className="btn" onClick={dock}>Dock at {title} ›</button>}
            {next && <button className={enter || dock ? 'btn ghost' : 'btn'} onClick={next.onClick}>{next.label} ›</button>}
          </div>
        )}
        <dl className="kv">
          {radius !== null && <div><dt>Radius</dt><dd>{Math.round(radius).toLocaleString('en-US')} km{dest !== 'earth' && <> · {sizeVsEarth(radius / RADIUS_KM.earth)}</>}</dd></div>}
          <div><dt>Held by</dt><dd>{nation ? `${nation.name}${nation.player ? ' (yours)' : ''}` : 'No one'}{race && <span className="small muted" style={{ display: 'block' }}>{race.line}</span>}</dd></div>
          {distance !== null && <div><dt>To surface</dt><dd>{fmtDist(distance)}</dd></div>}
        </dl>
        {extra}
        <p className="small muted">Bodies are to scale with one another; the spacing between them is not.</p>
      </div>
    </article>
  );
}

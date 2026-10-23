/**
 * Docked at a station: repairs, the hangar, and the station's systems (lib/station/): its defences, its market, its
 * temple, its power and its development. Repairs are free for now. Prices are first-pass numbers, and nothing can be
 * bought or sold here yet: the cargo hold and the trade itself wait for conquest's resources to merge.
 */
import * as THREE from 'three';
import type { StationId } from '../lib/stations';
import { HOUSED, stationById } from '../lib/stations';
import { holderOf } from '../lib/world';
import type { StationSummary } from '../lib/station/system';
import { RESOURCE_NAME } from '../lib/station/profiles';

const light = (hex: string, k: number) => `#${new THREE.Color(hex).lerp(new THREE.Color(1, 1, 1), k).getHexString()}`;

interface Props {
  id: StationId;
  systems?: StationSummary;
  hull: number;
  maxHull: number;
  onRepair: () => void;
  onUndock: () => void;
  onMenu: () => void;
}

export default function StationScreen({ id, systems: s, hull, maxHull, onRepair, onUndock, onMenu }: Props) {
  const st = stationById(id)!;
  const nation = holderOf(id);
  const color = nation?.color ?? '#ffc46b';
  const damage = Math.max(0, maxHull - hull);
  const pct = Math.round((hull / maxHull) * 100);
  return (
    <section className="sphere-display station-screen" role="dialog" aria-label={`Docked at ${st.label}`} style={{ ['--c' as string]: color, ['--cl' as string]: light(color, 0.6) }}>
      <header className="sd-head">
        <div className="sd-title">
          <div>
            <h2>{st.label}</h2>
            <p className="sd-sub">Docked · held by {nation ? `${nation.name}${nation.player ? ' (yours)' : ''}` : 'no one'}</p>
          </div>
        </div>
        <div className="sd-btns">
          <button className="btn" onClick={onUndock}>Undock <span className="key-hint">Esc</span></button>
          <button className="btn ghost" onClick={onMenu}>☰ Menu</button>
        </div>
      </header>
      <div className="sd-body station-grid">
        <section className="sd-panel">
          <h3>Repair</h3>
          <div className="hull-bar" role="meter" aria-label="Hull" aria-valuemin={0} aria-valuemax={maxHull} aria-valuenow={hull}>
            <span style={{ width: `${pct}%` }} />
          </div>
          <dl className="kv">
            <div><dt>Hull</dt><dd>{Math.round(hull)} / {maxHull} ({pct}%)</dd></div>
            <div><dt>Damage</dt><dd>{damage > 0 ? `${Math.round(damage)} points` : 'None'}</dd></div>
          </dl>
          <button className="btn" onClick={onRepair} disabled={damage <= 0}>{damage > 0 ? 'Repair the hull' : 'Hull is sound'}</button>
          <p className="small muted">Free for now: what a repair costs is not decided.</p>
        </section>
        <section className="sd-panel">
          <h3>Hangar</h3>
          <dl className="kv">
            <div><dt>Inside</dt><dd>{s ? s.housed.cruiser : HOUSED.cruiser} cruisers, {s ? s.housed.fighter : HOUSED.fighter} fighters</dd></div>
            <div><dt>Moored</dt><dd>{s ? s.housed.capital : HOUSED.capital} capital ship, outside: too big for the hangar</dd></div>
            {s && (s.out.fighter + s.out.cruiser + s.out.capital > 0) && <div><dt>Out</dt><dd>{s.out.fighter} fighters, {s.out.cruiser} cruisers, {s.out.capital} capital</dd></div>}
          </dl>
          <p className="small muted">Your ship is in the bay.</p>
        </section>
        {s && (
          <section className="sd-panel">
            <h3>Defences</h3>
            <dl className="kv">
              <div><dt>Alert</dt><dd>{s.alert}</dd></div>
              <div><dt>Shields</dt><dd>{s.shieldName}, {Math.round(s.shield * 100)}%</dd></div>
              <div><dt>Structure</dt><dd>{Math.round(s.hull * 100)}%</dd></div>
              <div><dt>Guns</dt><dd>{Object.entries(s.guns).map(([g, n]) => `${n} × ${g}`).join(', ')} ({s.gunsUp}/{s.gunsFitted} up)</dd></div>
            </dl>
            <p className="small muted">{s.doctrine}</p>
          </section>
        )}
        {s && (
          <section className="sd-panel">
            <h3>Market</h3>
            <p className="small">{s.market.open ? `Deals in ${RESOURCE_NAME[s.market.resource]}. Credits a unit (sells / buys):` : 'Closed while the station fights.'}</p>
            {s.market.open && (
              <dl className="kv">
                {s.market.prices.map((p) => <div key={p.resource}><dt>{RESOURCE_NAME[p.resource]}{p.local ? ' ★' : ''}</dt><dd>{p.sell} / {p.buy}</dd></div>)}
              </dl>
            )}
            <p className="small muted">First-pass prices. Trading opens when there is a hold to carry goods in.</p>
          </section>
        )}
        {s && (
          <section className="sd-panel">
            <h3>{s.temple.name}</h3>
            <p className="small">{s.temple.god.greek} / {s.temple.god.roman}. {s.temple.history}</p>
            <dl className="kv">
              <div><dt>Boon</dt><dd>{s.temple.boon}{s.temple.works ? '' : ' (not now: the temple is dark)'}</dd></div>
            </dl>
          </section>
        )}
        {s && (
          <section className="sd-panel">
            <h3>Power and development</h3>
            <dl className="kv">
              <div><dt>Power</dt><dd>{s.power ? `${Math.round(s.power.supply)} of ${Math.round(s.power.demand)} wanted` : '…'} ({s.powerSource})</dd></div>
              <div><dt>Tier</dt><dd>{s.tierName}{s.devNext ? ` · ${Math.floor(s.dev)} / ${s.devNext} toward ${s.nextName}` : ' (the highest)'}</dd></div>
              {s.meters && <div><dt>Gives its world</dt><dd>military +{s.meters.military.toFixed(1)}, economy +{s.meters.economy.toFixed(1)}, religion +{s.meters.religion.toFixed(1)}, government +{s.meters.government.toFixed(1)}</dd></div>}
            </dl>
          </section>
        )}
      </div>
    </section>
  );
}

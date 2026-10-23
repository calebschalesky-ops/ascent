import { useEffect, useState } from 'react';
import type { NationId } from '../lib/nations';
import { NATIONS } from '../lib/nations';
import type { ConquestState, LineKind } from '../lib/conquest/state';
import { lineProblem, productionStopped, supplied } from '../lib/conquest/state';
import { PRODUCTION, RESOURCES, RESOURCE_LABEL } from '../lib/conquest/resources';
import { KINDS, SITES, sitesOf } from '../lib/conquest/sites';
import { SHIP_SPECS, SHIP_TYPES } from '../lib/shipTypes';
import type { ConquestView } from './conquest';

const OWNER: Record<string, string> = { native: '', player: 'yours', wrecked: 'wrecked' };
const nationName = (w: NationId) => NATIONS.find((n) => n.id === w)?.name ?? w;

/** One line per build line: what it is building and how far along, or why it is not. */
function lineText(c: ConquestState, w: NationId, line: LineKind): string {
  const job = c.worlds[w].lines[line];
  const why = lineProblem(c, w, line);
  if (why && /^(stopped|paused)/.test(why)) return why; // a half-built ship waits while its site is down
  if (job) return `${SHIP_SPECS[job.type].label.toLowerCase()} ${Math.round((job.t / PRODUCTION.buildTime[job.type]) * 100)}%`;
  return why ?? 'at strength';
}

/** Near a world you are taking: what it is building, and its sites nearest first with structure and capture. */
export default function ConquestHud({ view, state }: { view: () => ConquestView | null; state: () => ConquestState | null }) {
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 250); return () => clearInterval(id); }, []);
  const v = view();
  const c = state();
  if (!v || !c) return null;
  const w = v.world;
  const ws = c.worlds[w];
  const taken = sitesOf(w).filter((s) => c.sites[s.id].owner !== 'native').length;
  return (
    <div className="conquest-hud" role="status" aria-label="Conquest">
      <div className="cq-head">{nationName(w)} {ws.controlled ? '· yours' : `· ${taken}/${sitesOf(w).length} sites`}</div>
      {!ws.controlled && (
        <div className="cq-lines">
          {productionStopped(c, w) ? <span>Production stopped for good</span> : <>
            <span>Foundry: {lineText(c, w, 'foundry')}</span>
            <span>Shipyard: {lineText(c, w, 'shipyard')}</span>
          </>}
        </div>
      )}
      <ol className="cq-sites">
        {v.sites.slice(0, 7).map((s) => {
          const pct = Math.round((s.hp / s.max) * 100);
          const hold = KINDS[s.def.kind].hold;
          return (
            <li key={s.def.id} className={`cq-site ${s.owner}`}>
              <span className="cq-name">{s.def.name}<small> · {KINDS[s.def.kind].label}{s.def.res ? ` (${RESOURCE_LABEL[s.def.res]})` : ''}</small></span>
              <span className="cq-dist">{s.dist < 1000 ? Math.round(s.dist) : `${(s.dist / 1000).toFixed(1)}k`}</span>
              {s.owner === 'native' ? <>
                <span className="cq-bar" title={`${pct}% structure`}><span style={{ width: `${pct}%` }} /></span>
                <span className="cq-state">{s.hold > 0 && hold ? `holding ${Math.round((s.hold / hold) * 100)}%` : s.problem ?? 'hold here'}</span>
              </> : <span className="cq-state">{OWNER[s.owner]}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * A world's navy, every ship type it flies: "1 capital ship, 1 destroyer, 3 cruisers, 3 fighters" (8). The line used to
 * name three types and leave the destroyer out, so it read 7 with 8 flying (player notes 5.4).
 */
export function navyLine(alive: Record<(typeof SHIP_TYPES)[number], number>): string {
  const total = SHIP_TYPES.reduce((n, t) => n + alive[t], 0);
  if (!total) return 'none flying';
  const parts = SHIP_TYPES.filter((t) => alive[t] > 0).map((t) => `${alive[t]} ${SHIP_SPECS[t].label.toLowerCase()}${alive[t] === 1 ? '' : 's'}`);
  return `${total} ship${total === 1 ? '' : 's'}: ${parts.join(', ')}`;
}

/** Rows for the arrival card at a world: who holds it, its production, its sites, its resources. */
export function ConquestCard({ world, state }: { world: NationId; state: ConquestState }) {
  const c = state;
  const ws = c.worlds[world];
  if (world === c.home) return <p className="small muted">Your home world: its sites are your nation’s, not a conquest.</p>;
  const sites = sitesOf(world);
  const mine = sites.filter((s) => c.sites[s.id].owner === 'player').length;
  const wrecked = sites.filter((s) => c.sites[s.id].owner === 'wrecked').length;
  const makes = [...new Set(SITES.filter((s) => s.world === world && s.res).map((s) => RESOURCE_LABEL[s.res!]))];
  const imports = RESOURCES.filter((r) => supplied(c, world, r) === 'import').map((r) => RESOURCE_LABEL[r]);
  return (
    <dl className="kv conquest-card">
      <div><dt>Taken</dt><dd>{ws.controlled ? 'Yours' : `${mine} of ${sites.length} sites yours${wrecked ? `, ${wrecked} wrecked` : ''}`}</dd></div>
      <div><dt>Production</dt><dd>{productionStopped(c, world) ? 'Stopped for good' : `Foundry: ${lineText(c, world, 'foundry')} · Shipyard: ${lineText(c, world, 'shipyard')}`}</dd></div>
      <div><dt>Navy</dt><dd>{navyLine(ws.alive)}</dd></div>
      <div><dt>Makes</dt><dd>{makes.join(', ') || 'nothing'}{imports.length ? <span className="small muted" style={{ display: 'block' }}>Imports {imports.join(', ')}</span> : null}</dd></div>
    </dl>
  );
}

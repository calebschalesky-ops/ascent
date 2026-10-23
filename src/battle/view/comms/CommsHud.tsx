/**
 * The comms HUD (PKG-09, BRIDGE §4, §12): the queue on the left, the roster strip along the bottom, the flagship's crew
 * on the right, the command-points meter, and the order menu that opens on an enemy. It draws the controller's
 * snapshot and calls its methods; it holds no battle state of its own beyond what is open on screen.
 */
import { useState, useSyncExternalStore } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import { FIGHTER_TASKS, MANEUVERS, POINTS, SHIELD_SIDES } from '../../sim/index';
import type { OfficerId, OrderKind } from '../../sim/index';
import type { CommsController, CommsSnapshot } from './controller';
import { MANEUVER_LABEL, OFFICERS, PLAIN_ORDERS, TASK_LABEL, cap } from './logic';
import './comms.css';
import ManeuverMenu from '../tactical/ManeuverMenu';
// PKG-21: the roster keeps its slots (F-13), the enemy list (PKG-17's request), the escort warning (TRC05-5).
import EnemyList from '../input/EnemyList';
import { ESCORT_WARNING, battleNow, escortOnScreen } from '../input/escort';
import { useStableRoster } from '../input/roster';

const LEVEL_WORD = { urgent: 'Urgent', decision: 'Decision', status: 'Status' } as const;

const house = (c: string) => ({ ['--house' as string]: c }) as CSSProperties;

function Portrait({ initials, mood, title }: { initials: string; mood: string; title?: string }) {
  return <span className="cx-portrait" style={{ ['--mood' as string]: mood } as CSSProperties} title={title} aria-hidden="true">{initials}</span>;
}

function Meter({ s }: { s: CommsSnapshot }) {
  const cost = s.hoverCost;
  const short = cost !== null && cost > s.points + 1e-9;
  return (
    <div className="cx-meter" aria-label={`Command points ${s.points} of ${s.pointsMax}`}>
      <span className="cx-meter-label">Command</span>
      <span className="cx-meter-pips">
        {Array.from({ length: s.pointsMax }, (_, i) => {
          const fill = Math.max(0, Math.min(1, s.points - i));
          const spend = cost !== null && !short && i >= Math.ceil(s.points) - cost && i < Math.ceil(s.points);
          return <i key={i} className={spend ? 'spend' : ''} style={{ ['--fill' as string]: fill } as CSSProperties} />;
        })}
      </span>
      <b>{s.points.toFixed(1)}</b>
      {cost !== null && <span className={`cx-meter-cost${short ? ' short' : ''}`}>{cost === 0 ? 'free' : `costs ${cost}`}{short ? ' · not enough' : ''}</span>}
    </div>
  );
}

export default function CommsHud({ ctl }: { ctl: CommsController }) {
  const s = useSyncExternalStore(ctl.subscribe, ctl.snapshot);
  const [open, setOpen] = useState(false);
  // PKG-15: the crew panel folds to five officer chips; one officer opens at a time (and the one an armed order
  // belongs to stays open while it waits for its target), so the battle stays the picture.
  const [officer, setOfficer] = useState<OfficerId | null>(null);
  const slots = useStableRoster(s.roster, battleNow()); // PKG-21 F-13
  if (s.ended) return null;
  const cost = (ship: string | null, kind: OrderKind) => ({
    onMouseEnter: () => ctl.hoverCost(costOfSnap(ctl, ship, kind)),
    onMouseLeave: () => ctl.hoverCost(null),
    onFocus: () => ctl.hoverCost(costOfSnap(ctl, ship, kind)),
    onBlur: () => ctl.hoverCost(null),
  });
  const crew = s.crew;
  const flag = crew?.flagship ?? null;

  return (
    <div className={`cx${open ? ' cx-open' : ''}`} style={house(s.house)}>
      <aside className="cx-queue" aria-label="Comms queue">
        <Meter s={s} />
        <ol>
          {s.queue.length === 0 && <li className="cx-r cx-status cx-quiet">Comms quiet.</li>}
          {s.queue.map((q) => (
            <li key={q.id} className={`cx-r cx-${q.level}${q.selected ? ' cx-sel' : ''}${q.prize ? ` cx-prize cx-prize-${q.prize}` : ''}`} data-type={q.type}>
              <Portrait initials={q.initials} mood={q.moodToken} title={q.from.mood} />
              <div className="cx-body">
                <p className="cx-who">
                  <span className="cx-level">{q.prize === 'won' ? 'Prize taken' : q.prize === 'lost' ? 'Ship taken' : LEVEL_WORD[q.level]}</span>
                  <b>{q.from.name || 'Flag lieutenant'}</b>{q.from.ship && <> · {q.from.ship}</>}
                  {q.level !== 'status' && <span className="cx-mood" style={{ color: q.moodToken }}> · {q.from.mood}</span>}
                </p>
                <p className="cx-text">{q.text}</p>
                {q.answers.length > 0 && q.level !== 'status' && (
                  <div className="cx-answers">
                    {q.answers.map((a, i) => (
                      <button key={i} type="button" onClick={() => ctl.answerReport(q.id, i)} {...{ onMouseEnter: () => ctl.hoverCost(0), onMouseLeave: () => ctl.hoverCost(null) }}>
                        {q.keys[i] && <kbd>{q.keys[i]}</kbd>}{a}
                      </button>
                    ))}
                  </div>
                )}
                {q.fraction !== null && <span className="cx-timer" style={{ ['--left' as string]: q.fraction } as CSSProperties} aria-label={`${Math.ceil(q.secondsLeft ?? 0)} s`} />}
              </div>
            </li>
          ))}
        </ol>
        {s.answerable > 1 && <p className="cx-hint"><kbd>Tab</kbd> next report</p>}
        {s.notice && <p className="cx-notice" role="status">{s.notice}</p>}
      </aside>

      <button type="button" className="cx-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>{open ? 'Hide fleet' : 'Fleet'}</button>

      {crew && (
        <section className={`cx-crew${officer || s.armed ? ' cx-crew-open' : ''}`} aria-label="Flagship crew">
          <h2>{crew.flagName}</h2>
          {!flag && <p className="cx-dim">The flagship is gone.</p>}
          {flag && (
            <div className="cx-chips" role="group" aria-label="Officers">
              {OFFICERS.map((o) => (
                <button key={o.id} type="button" className="cx-chip" data-chip={o.id} aria-expanded={officer === o.id || s.armed?.officer === o.id}
                  onClick={() => setOfficer((v) => (v === o.id ? null : o.id))}>{o.title}</button>
              ))}
            </div>
          )}
          {flag && OFFICERS.filter((o) => o.id === officer || s.armed?.officer === o.id).map((o) => (
            <div key={o.id} className="cx-officer" data-officer={o.id}>
              <p className="cx-who"><span className="cx-level">{o.title}</span> <b>{crew.officers[o.id]}</b></p>
              <div className="cx-buttons">
                {o.id === 'helm' && MANEUVERS.map((m) => (
                  <button key={m} type="button" aria-pressed={crew.helm === m} onClick={() => ctl.order({ kind: 'helm', maneuver: m })} {...cost(flag, 'helm')}>{MANEUVER_LABEL[m]}</button>
                ))}
                {o.id === 'guns' && <>
                  <button type="button" aria-pressed={s.armed?.kind === 'gunsOn'} onClick={() => ctl.arm(s.armed?.kind === 'gunsOn' ? null : { kind: 'gunsOn', officer: 'guns' })} {...cost(flag, 'gunsOn')}>
                    {s.targetName ? `All guns on ${s.targetName}` : 'Guns on…'}
                  </button>
                  <button type="button" aria-pressed={crew.guns.mode === 'hold'} onClick={() => ctl.order({ kind: 'holdFire' })} {...cost(flag, 'holdFire')}>{crew.guns.mode === 'hold' ? 'Guns free' : 'Hold fire'}</button>
                  {crew.guns.mode === 'on' && crew.guns.targetName && <span className="cx-dim">on {crew.guns.targetName}</span>}
                </>}
                {o.id === 'engineering' && crew.split && <>
                  <div className="cx-split" role="group" aria-label="Shield power">
                    {SHIELD_SIDES.map((k) => (
                      <button key={k} type="button" className={`cx-side cx-side-${k}`} style={{ ['--p' as string]: crew.split![k] } as CSSProperties}
                        title={`Shift power to ${k}; shift-click for everything`}
                        onClick={(e) => ctl.order({ kind: 'shieldPower', ship: flag, shield: k, all: e.shiftKey })} {...cost(flag, 'shieldPower')}>
                        <span>{k === 'starboard' ? 'Stbd' : cap(k)}</span><b>{Math.round(crew.split![k] * 100)}</b>
                      </button>
                    ))}
                    <button type="button" className="cx-side cx-side-even" onClick={() => ctl.order({ kind: 'shieldPower', ship: flag, shield: 'even' })} {...cost(flag, 'shieldPower')}>Even</button>
                  </div>
                  <div className="cx-all">
                    {SHIELD_SIDES.map((k) => (
                      <button key={k} type="button" onClick={() => ctl.order({ kind: 'shieldPower', ship: flag, shield: k, all: true })} {...cost(flag, 'shieldPower')}>All {k === 'starboard' ? 'stbd' : k}</button>
                    ))}
                  </div>
                  <button type="button" aria-pressed={crew.power === 'overload'} onClick={() => ctl.order({ kind: 'overloadGuns' })} {...cost(flag, 'overloadGuns')}>Overload guns</button>
                  <button type="button" aria-pressed={crew.power === 'engines'} onClick={() => ctl.order({ kind: 'feedEngines' })} {...cost(flag, 'feedEngines')}>Feed engines</button>
                </>}
                {o.id === 'marines' && <>
                  <button type="button" aria-pressed={s.armed?.kind === 'launchPods'} onClick={() => ctl.arm(s.armed?.kind === 'launchPods' ? null : { kind: 'launchPods', officer: 'marines' })} {...cost(flag, 'launchPods')}>
                    {s.targetName ? `Pods at ${s.targetName}` : 'Pods at…'}
                  </button>
                  {crew.fights.map((f) => (
                    <span key={f.target} className="cx-fight">
                      <span className="cx-dim">Inside {f.name}:</span>
                      <button type="button" onClick={() => ctl.order({ kind: 'board', ship: flag, target: f.target })} {...cost(flag, 'board')}>Reinforce</button>
                      <button type="button" onClick={() => ctl.order({ kind: 'pullBack', ship: flag, target: f.target })} {...cost(flag, 'pullBack')}>Pull back</button>
                    </span>
                  ))}
                </>}
                {o.id === 'fighters' && FIGHTER_TASKS.map((k) => (
                  <button key={k} type="button" aria-pressed={crew.fighters === k} onClick={() => ctl.order({ kind: 'fighters', task: k })} {...cost(flag, 'fighters')}>{TASK_LABEL[k]}</button>
                ))}
              </div>
            </div>
          ))}
          {s.armed && <p className="cx-armed">Click an enemy ship: {s.armed.kind === 'gunsOn' ? 'the guns' : 'the pods'} go there.</p>}
        </section>
      )}

      <nav className="cx-roster" aria-label="Your fleet">
        {s.selected && (
          <div className="cx-orders">
            <span><b>{s.selectedName}</b>{s.target ? <> → {s.targetName}</> : <span className="cx-dim"> · click an enemy to target</span>}</span>
            {PLAIN_ORDERS.map((o) => (
              <button key={o.id} type="button" onClick={() => ctl.order({ kind: o.order.kind })} {...cost(s.selected, o.order.kind)}>{o.label}</button>
            ))}
            <button type="button" onClick={() => ctl.ping(s.selected!)} {...{ onMouseEnter: () => ctl.hoverCost(POINTS.ping), onMouseLeave: () => ctl.hoverCost(null) }}>Status?</button>
            <ManeuverMenu ctl={ctl} ship={s.selected} />
          </div>
        )}
        <EnemyList ctl={ctl} />
        <ul>
          {slots.map(({ card: r, gone }) => (
            <li key={r.id}>
              <button type="button" className={`cx-card${s.selected === r.id ? ' cx-sel' : ''}${r.inField && !gone ? '' : ' cx-out'}${gone ? ' in-gone' : ''}`} aria-pressed={s.selected === r.id}
                disabled={gone} onClick={() => ctl.select(r.id)}
                onContextMenu={(e: ReactMouseEvent) => { e.preventDefault(); ctl.openPing(r.id, e.clientX, e.clientY); }}
                title={`${r.captain}, ${r.mood}${r.reported !== null ? `; last reported hull ${r.reported}%` : ''}. Right-click: Status?`}>
                <Portrait initials={r.initials} mood={r.moodToken} />
                <span className="cx-card-text">
                  <b>{r.name}{r.flagship ? ' ★' : ''}{r.prize ? ' · prize' : ''}</b>
                  <span>{r.cls}</span>
                  <span className="cx-word" style={{ color: r.moodToken }}>{gone ? 'Taken' : r.word}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {s.menu && (
        <div className={`cx-menu${s.menu.x > window.innerWidth / 2 ? ' cx-menu-left' : ''}`} role="menu" aria-label={`Orders for ${s.selectedName} on ${s.targetName}`} style={{ left: s.menu.x, top: s.menu.y }}>
          <p className="cx-who"><b>{s.selectedName}</b> → {s.targetName}</p>
          {escortOnScreen(battleNow(), s.menu.ship) && <p className="in-escort-warn" role="note">{ESCORT_WARNING}: the flagship loses her screen.</p>}
          {s.menu.items.map((row, i) => (
            <div key={i} className="cx-menu-row">
              {i === 1 && <span className="cx-dim">Focus</span>}
              {i === 2 && <span className="cx-dim">Board</span>}
              {row.map((m) => (
                <button key={m.id} type="button" role="menuitem" data-id={m.id} onClick={() => ctl.order({ ...m.order, ship: s.menu!.ship })} {...cost(s.menu!.ship, m.order.kind)}>{i === 2 && m.id === 'board' ? 'Any side' : m.label}</button>
              ))}
            </div>
          ))}
          <ManeuverMenu ctl={ctl} ship={s.menu.ship} target={s.menu.target} onChosen={() => ctl.closeMenus()} />
          <button type="button" className="cx-dim-button" onClick={() => ctl.closeMenus()}>Cancel</button>
        </div>
      )}

      {s.pingMenu && (
        <div className="cx-menu" role="menu" style={{ left: s.pingMenu.x, top: s.pingMenu.y - 48 }}>
          <button type="button" role="menuitem" onClick={() => ctl.ping(s.pingMenu!.ship)}>Status?</button>
        </div>
      )}
    </div>
  );
}

/** The cost readout for a button: what `command()` will charge. */
function costOfSnap(ctl: CommsController, ship: string | null, kind: OrderKind): number {
  return ctl.costFor(ship, kind);
}



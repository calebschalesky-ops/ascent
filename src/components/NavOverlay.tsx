import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Dest } from '../lib/nav';
import {
  VR,
  DESTS, DEST_LABEL, bearingTo, fmtLat, destSphere, dist, dot, fmtBearing, fmtDist, fmtEta, len, lonLatOf,
  planLeg, routeCurrent, routeDone, shipAxes, sub, unit,
} from '../lib/nav';
import { COLOR, SPHERE_NAMES, isPlanet } from '../lib/bodies';
import type { MapView, NavSnap } from './navMap';
import { PHASE_LABEL, drawNavMap, fitCanvas, hitTest, mapXY } from './navMap';
import TacticalView from './fleet/TacticalView';
import type { FleetCommand } from './fleet/fleetRuntime';
import { destTint, holderOf } from '../lib/world';

export type NavTab = 'map' | 'computer' | 'route' | 'fleet';
const TABS: [NavTab, string][] = [['map', 'Map'], ['computer', 'Computer'], ['route', 'Route'], ['fleet', 'Fleet']];

export interface NavActions {
  fly: (d: Dest) => void; // set as target, autopilot on
  addStop: (d: Dest) => void;
  removeStop: (i: number) => void;
  moveStop: (i: number, delta: -1 | 1) => void;
  tour: () => void; // load and start the grand tour
  clearRoute: () => void;
  startRoute: () => void; // engage from the current stop (also Resume)
  continueRoute: () => void; // leave the stop you are parked at
}

interface Props {
  tab: NavTab;
  onTab: (t: NavTab) => void;
  onClose: () => void;
  getSnap: () => NavSnap | null;
  actions: NavActions;
  fleet?: FleetCommand | null;
}

export const destColor = (d: Dest) => (isPlanet(d) ? COLOR[d] : d === 'earth' ? '#3f7fd0' : destTint(d) ?? '#c9a54a');
/** A dot in the destination's colour. */
export const destGlyph = (d: Dest) => <span className="dest-dot" style={{ background: destColor(d) }} aria-hidden="true" />;

export interface DestRow {
  id: Dest;
  surface: number;
  bearing: string;
  etaNow: number | null;
  etaAuto: number;
  sphere: string;
}

/** The navigation computer's table, from one snapshot. */
function destRows(s: NavSnap): DestRow[] {
  const ax = shipAxes(s.yaw, s.pitch);
  return s.geo.map((d) => {
    const surface = Math.max(0, dist(s.pos, d.pos) - d.size);
    const b = bearingTo(s.pos, ax, d.pos);
    const closing = dot(s.vel, unit(sub(d.pos, s.pos)));
    const leg = planLeg(s.pos, s.fwd, d, s.geo, s.auto && s.target === d.id ? s.speed : 0);
    return {
      id: d.id,
      surface,
      bearing: fmtBearing(b.az, b.el),
      etaNow: closing > 0.05 ? surface / closing : null,
      etaAuto: leg.eta,
      sphere: SPHERE_NAMES[destSphere(d.id)],
    };
  });
}

export default function NavOverlay({ tab, onTab, onClose, getSnap, actions, fleet }: Props) {
  const [snap, setSnap] = useState<NavSnap | null>(() => getSnap());
  const getRef = useRef(getSnap);
  getRef.current = getSnap;
  useEffect(() => {
    const t = setInterval(() => setSnap(getRef.current()), 200);
    return () => clearInterval(t);
  }, []);

  return createPortal(
    <div className="nav-overlay" role="dialog" aria-label="Navigation">
      <header className="nav-head">
        <div className="seg nav-tabs" role="tablist">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => onTab(id)}>{label}</button>
          ))}
        </div>
        <button className="close" onClick={onClose} aria-label="Close navigation">×</button>
      </header>
      {snap && (
        <div className={`nav-body nav-${tab}`}>
          {tab === 'map' && <MapTab snap={snap} actions={actions} />}
          {tab === 'computer' && <ComputerTab snap={snap} actions={actions} />}
          {tab === 'route' && <RouteTab snap={snap} actions={actions} />}
          {tab === 'fleet' && fleet && <TacticalView fleet={fleet} />}
        </div>
      )}
      <p className="nav-foot small">M map · N computer · R route · T fleet · Esc close</p>
    </div>,
    document.body,
  );
}

// ---------- Map ----------
function MapTab({ snap, actions }: { snap: NavSnap; actions: NavActions }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const view = useRef<MapView>({ zoom: 1, panX: 0, panY: 0 });
  const [selected, setSelected] = useState<Dest | null>(null);
  const [, bump] = useState(0);
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const selRef = useRef(selected);
  selRef.current = selected;

  const draw = () => {
    const c = canvasRef.current;
    if (!c) return;
    const { ctx, w, h } = fitCanvas(c);
    if (!w || !h) return;
    drawNavMap(ctx, w, h, view.current, snapRef.current, { full: true, time: performance.now() / 1000, selected: selRef.current });
  };
  useEffect(draw);

  useEffect(() => {
    const c = canvasRef.current!;
    const ro = new ResizeObserver(draw);
    ro.observe(c);
    const pointers = new Map<number, { x: number; y: number }>();
    let moved = false;
    let pinch: { d: number; zoom: number } | null = null;
    const local = (e: PointerEvent | WheelEvent) => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height }; };
    const zoomAt = (x: number, y: number, w: number, h: number, z: number) => {
      const v = view.current;
      const nz = Math.max(0.6, Math.min(40, z));
      const s0 = (Math.min(w, h) / 2) * 0.86 * v.zoom;
      const s1 = (Math.min(w, h) / 2) * 0.86 * nz;
      // Keep the map point under (x, y) where it is.
      const mx = v.panX + (x - w / 2) / s0;
      const my = v.panY - (y - h / 2) / s0;
      v.zoom = nz;
      v.panX = mx - (x - w / 2) / s1;
      v.panY = my + (y - h / 2) / s1;
      draw();
    };
    const down = (e: PointerEvent) => {
      try { c.setPointerCapture(e.pointerId); } catch { /* the pointer is already gone */ }
      pointers.set(e.pointerId, local(e));
      moved = false;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: view.current.zoom };
      }
    };
    const move = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const p = local(e);
      pointers.set(e.pointerId, p);
      if (pointers.size === 2 && pinch) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, p.w, p.h, pinch.zoom * (d / Math.max(pinch.d, 1)));
        moved = true;
        return;
      }
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      if (!moved && Math.hypot(dx, dy) < 2) { pointers.set(e.pointerId, prev); return; }
      moved = true;
      const s = (Math.min(p.w, p.h) / 2) * 0.86 * view.current.zoom;
      view.current.panX -= dx / s;
      view.current.panY += dy / s;
      draw();
    };
    const up = (e: PointerEvent) => {
      const had = pointers.has(e.pointerId);
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (!had || moved || pointers.size) return;
      const p = local(e);
      const hit = hitTest(p.w, p.h, view.current, snapRef.current.geo, p.x, p.y);
      setSelected(hit);
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = local(e);
      zoomAt(p.x, p.y, p.w, p.h, view.current.zoom * Math.exp(-e.deltaY * 0.0015));
    };
    c.addEventListener('pointerdown', down);
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', wheel, { passive: false });
    if (import.meta.env.DEV) (window as unknown as { __navmap?: unknown }).__navmap = { view, canvas: c, draw };
    return () => {
      ro.disconnect();
      c.removeEventListener('pointerdown', down);
      c.removeEventListener('pointermove', move);
      c.removeEventListener('pointerup', up);
      c.removeEventListener('pointercancel', up);
      c.removeEventListener('wheel', wheel);
    };
  }, []);

  const zoomBy = (k: number) => {
    const v = view.current;
    v.zoom = Math.max(0.6, Math.min(40, v.zoom * k));
    bump((n) => n + 1);
  };
  const center = (what: 'all' | 'ship') => {
    const v = view.current;
    if (what === 'all') { v.zoom = 1; v.panX = 0; v.panY = 0; } else { const [x, y] = mapXY(snap.pos); v.panX = x; v.panY = y; v.zoom = Math.max(v.zoom, 3); }
    bump((n) => n + 1);
  };

  const row = useMemo(() => (selected ? destRows(snap).find((r) => r.id === selected) : undefined), [selected, snap]);
  const r = snap.route;
  const cur = routeCurrent(r);

  return (
    <div className="map-tab">
      <canvas ref={canvasRef} className="nav-canvas" aria-label="Navigation map: tap a body to choose it" />
      <div className="map-tools">
        <button onClick={() => zoomBy(1.6)} aria-label="Zoom in">+</button>
        <button onClick={() => zoomBy(1 / 1.6)} aria-label="Zoom out">−</button>
        <button onClick={() => center('ship')} aria-label="Centre on the ship">◎</button>
        <button onClick={() => center('all')} aria-label="Whole cosmos">⤢</button>
      </div>
      <p className="map-legend small">Seen from above. Distance from Earth is squeezed so every ring shows; the angle is true.</p>
      {r.stops.length > 0 && (
        <div className="map-route small">
          <strong>Route</strong> {routeDone(r) ? 'complete' : `${r.index + 1}/${r.stops.length} · ${DEST_LABEL[cur!]}`}
          {snap.legs.length > 0 && <> · total {fmtEta(snap.legs.reduce((a, l) => a + l.eta, 0))}</>}
        </div>
      )}
      {row && selected && (
        <div className="map-pick parchment">
          <div className="pick-head" style={{ ['--c' as string]: destColor(selected) }}>
            <span className="pick-glyph">{destGlyph(selected)}</span>
            <strong>{DEST_LABEL[selected]}</strong>
            <button className="close" onClick={() => setSelected(null)} aria-label="Close">×</button>
          </div>
          <dl className="pick-facts">
            <div><dt>Zone</dt><dd>{row.sphere}</dd></div>
            <div><dt>Held by</dt><dd>{holderOf(selected)?.name ?? 'No one'}</dd></div>
            <div><dt>To surface</dt><dd>{fmtDist(row.surface)}</dd></div>
            <div><dt>Bearing</dt><dd>{row.bearing}</dd></div>
            <div><dt>ETA, autopilot</dt><dd>{row.etaAuto < 0.5 ? 'here' : fmtEta(row.etaAuto)}</dd></div>
          </dl>
          <div className="pick-btns">
            <button className="btn" onClick={() => { actions.fly(selected); setSelected(null); }}>Fly here</button>
            <button className="btn ghost" onClick={() => actions.addStop(selected)}>Add to route</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Computer ----------
function ComputerTab({ snap, actions }: { snap: NavSnap; actions: NavActions }) {
  const rows = useMemo(() => destRows(snap), [snap]);
  const head = lonLatOf(snap.fwd);
  const fromEarth = len(snap.pos);
  return (
    <div className="computer">
      <section className="ship-readout parchment">
        <h3 className="sub first">Ship</h3>
        <dl className="readout">
          <div><dt>Speed</dt><dd>{snap.speed < 10 ? snap.speed.toFixed(1) : Math.round(snap.speed)} /s</dd></div>
          <div><dt>Throttle</dt><dd>{snap.auto ? 'autopilot' : `${Math.round(snap.throttle * 100)}%`}</dd></div>
          <div><dt>Heading</dt><dd>{Math.round(head.lon) % 360}°</dd></div>
          <div><dt>Elevation</dt><dd>{fmtLat(head.lat, 1)}</dd></div>
          <div><dt>Zone</dt><dd>{SPHERE_NAMES[snap.zone]}</dd></div>
          <div><dt>From Earth</dt><dd>{fmtDist(fromEarth)} <span className="muted">(centre)</span></dd></div>
          {snap.phase && <div><dt>Autopilot</dt><dd>{PHASE_LABEL[snap.phase]}{snap.target ? ` · ${DEST_LABEL[snap.target]}` : ''}</dd></div>}
        </dl>
      </section>
      <section className="dest-table parchment">
        <div className="dt-row dt-headrow">
          <span>Destination</span><span>To surface</span><span>Bearing</span><span>ETA now</span><span>ETA auto</span><span>Zone</span><span />
        </div>
        {rows.map((r) => (
          <div key={r.id} className={`dt-row ${snap.target === r.id ? 'on' : ''}`}>
            <span className="dt-name" style={{ ['--c' as string]: destColor(r.id) }}><span className="dt-glyph">{destGlyph(r.id)}</span> {DEST_LABEL[r.id]}</span>
            <span className="dt-num" data-k="Surface">{fmtDist(r.surface)}</span>
            <span data-k="Bearing">{r.bearing}</span>
            <span className="dt-num" data-k="Now">{fmtEta(r.etaNow)}</span>
            <span className="dt-num" data-k="Auto">{r.etaAuto < 0.5 ? 'here' : fmtEta(r.etaAuto)}</span>
            <span className="dt-sphere">{r.sphere}</span>
            <span className="dt-act">
              <button className="mini" onClick={() => actions.fly(r.id)} aria-label={`Fly to ${DEST_LABEL[r.id]}`}>Fly</button>
              <button className="mini" onClick={() => actions.addStop(r.id)} aria-label={`Add ${DEST_LABEL[r.id]} to route`}>+</button>
            </span>
          </div>
        ))}
        <p className="small muted dt-note">
          Distances in voyage units; your ship is 0.37 of one, and Earth’s radius is {Math.round(VR.earth).toLocaleString('en-US')}. Everything is life-size: true radii, true orbits round the Sun (the map spaces them on a log scale).</p>
      </section>
    </div>
  );
}

// ---------- Route ----------
function RouteTab({ snap, actions }: { snap: NavSnap; actions: NavActions }) {
  const r = snap.route;
  const done = routeDone(r);
  // Leg ETAs line up with the stops still ahead (the one you are parked at has none).
  const first = r.waiting ? r.index + 1 : r.index;
  const etaOf = (i: number) => (i >= first ? snap.legs[i - first]?.eta : undefined);
  let cum = 0;
  const total = snap.legs.reduce((a, l) => a + l.eta, 0);
  const status = !r.stops.length ? 'No route' : done ? 'Route complete' : r.waiting ? `Parked at ${DEST_LABEL[r.stops[r.index]]}` : r.engaged ? `${snap.phase ? PHASE_LABEL[snap.phase] : 'Flying'} · ${DEST_LABEL[r.stops[r.index]]}` : 'Paused';
  return (
    <div className="route-tab">
      <section className="parchment route-card">
        <div className="route-top">
          <button className="btn" onClick={actions.tour}>Grand tour</button>
          <span className="small muted">Every body from Earth outward: Earth, Moon, Mercury, Venus, Sun, Mars, Jupiter, Saturn, the stars, the edge</span>
        </div>
        <p className="route-status"><strong>{status}</strong>{r.stops.length > 0 && !done && <> · {snap.legs.length} leg{snap.legs.length === 1 ? '' : 's'} · flight time {fmtEta(total)}, not counting stops</>}</p>
        <div className="row-btns">
          {r.waiting && <button className="btn" onClick={actions.continueRoute}>Continue</button>}
          {!r.waiting && !r.engaged && !done && r.stops.length > 0 && <button className="btn" onClick={actions.startRoute}>{r.index > 0 ? 'Resume' : 'Start'}</button>}
          {r.stops.length > 0 && <button className="btn ghost" onClick={actions.clearRoute}>Clear</button>}
        </div>
        {r.stops.length > 0 ? (
          <ol className="route-list">
            {r.stops.map((d, i) => {
              const eta = etaOf(i);
              if (eta !== undefined) cum += eta;
              const state = i < r.index ? 'done' : i === r.index && !done ? (r.waiting ? 'here' : 'next') : 'ahead';
              return (
                <li key={`${d}-${i}`} className={`rs-${state}`}>
                  <span className="rs-mark">{state === 'done' ? '✓' : state === 'here' ? '●' : state === 'next' ? '▶' : i + 1}</span>
                  <span className="rs-name" style={{ ['--c' as string]: destColor(d) }}>{destGlyph(d)} {DEST_LABEL[d]}</span>
                  <span className="rs-eta small">{eta !== undefined ? <>{fmtEta(eta)} <span className="muted">· {fmtEta(cum)}</span></> : state === 'here' ? 'parked' : ''}</span>
                  <span className="rs-btns">
                    <button className="mini" disabled={i === 0} onClick={() => actions.moveStop(i, -1)} aria-label={`Move ${DEST_LABEL[d]} earlier`}>↑</button>
                    <button className="mini" disabled={i === r.stops.length - 1} onClick={() => actions.moveStop(i, 1)} aria-label={`Move ${DEST_LABEL[d]} later`}>↓</button>
                    <button className="mini" onClick={() => actions.removeStop(i)} aria-label={`Remove ${DEST_LABEL[d]}`}>×</button>
                  </span>
                </li>
              );
            })}
          </ol>
        ) : <p className="small muted">Add stops below, or tap a body on the map.</p>}
        <h3 className="sub">Add a stop</h3>
        <div className="add-stops">
          {DESTS.map((d) => (
            <button key={d} className="mini wide" onClick={() => actions.addStop(d)} style={{ ['--c' as string]: destColor(d) }}>{destGlyph(d)} {DEST_LABEL[d]}</button>
          ))}
        </div>
        <p className="small muted">Leg times: the first from where the ship is now, each later one from where the last stop parks. The autopilot goes around any body in its path.</p>
      </section>
    </div>
  );
}

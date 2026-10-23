/**
 * The tactical view: the Fleet tab of the navigation screen. Seen from above, centred on the flagship; time runs at
 * a quarter while it is open (or stops). Tap a wing to select it, an enemy to attack it, your own ship to have the
 * wing defend you; draw a path with taps. Every order is also a button.
 */
import { useEffect, useRef, useState } from 'react';
import type { V3 } from '../../lib/nav';
import { add, scale } from '../../lib/nav';
import { NATIONS } from '../../lib/nations';
import { SHIP_SPECS } from '../../lib/shipTypes';
import { FORMATIONS, ORDER_LABEL, STANCES } from '../../lib/fleet/spec';
import { fitCanvas } from '../navMap';
import type { FleetCommand, FleetShipSnap, FleetSnap, WingSnap } from './fleetRuntime';

type Mode = 'select' | 'path' | 'move';
interface View { zoom: number; panX: number; panZ: number } // pan in world units from the flagship

const RANGE = 40; // world units from the centre to the nearest edge at zoom 1
const OURS = '#7fd6ff';
const nationColor = (s: FleetShipSnap) => (s.side === 0 ? OURS : NATIONS.find((n) => n.id === s.nation)?.color ?? '#ff6050');

export default function TacticalView({ fleet }: { fleet: FleetCommand }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const view = useRef<View>({ zoom: 1, panX: 0, panZ: 0 });
  const [snap, setSnap] = useState<FleetSnap>(() => fleet.snap(RANGE * 6));
  const [mode, setMode] = useState<Mode>('select');
  const [draft, setDraft] = useState<V3[]>([]);
  const [loop, setLoop] = useState(false);
  const [scaleUi, setScaleUi] = useState(fleet.tacticalScale);
  const st = useRef({ snap, mode, draft });
  st.current = { snap, mode, draft };
  const fleetRef = useRef(fleet);
  fleetRef.current = fleet;

  useEffect(() => {
    const t = setInterval(() => setSnap(fleetRef.current.snap(RANGE * 6)), 100);
    return () => clearInterval(t);
  }, []);

  // World ↔ screen. Map up is −z, as on the navigation map.
  const geom = (w: number, h: number) => {
    const s = st.current.snap;
    const c = s.flagship?.pos ?? [0, 0, 0];
    const k = (Math.min(w, h) / 2 / RANGE) * view.current.zoom;
    const cx = c[0] + view.current.panX;
    const cz = c[2] + view.current.panZ;
    return {
      k, y: c[1],
      to: (p: V3): [number, number] => [w / 2 + (p[0] - cx) * k, h / 2 + (p[2] - cz) * k],
      from: (x: number, y: number): V3 => [cx + (x - w / 2) / k, c[1], cz + (y - h / 2) / k],
    };
  };

  const draw = () => {
    const c = canvasRef.current;
    if (!c) return;
    const { ctx, w, h } = fitCanvas(c);
    if (!w || !h) return;
    const s = st.current.snap;
    const g = geom(w, h);
    ctx.fillStyle = '#04070f';
    ctx.fillRect(0, 0, w, h);
    // Range rings every 10 units round the flagship.
    if (s.flagship) {
      const [fx, fy] = g.to(s.flagship.pos);
      ctx.strokeStyle = 'rgba(120,150,200,0.12)';
      ctx.lineWidth = 1;
      for (let r = 10; r <= RANGE * 4; r += 10) { ctx.beginPath(); ctx.arc(fx, fy, r * g.k, 0, Math.PI * 2); ctx.stroke(); }
    }
    // Bodies, with their keep-clear ring.
    for (const b of fleet.world.bodies) {
      const [x, y] = g.to(b.pos);
      ctx.fillStyle = 'rgba(90,110,150,0.35)';
      ctx.beginPath(); ctx.arc(x, y, b.size * g.k, 0, Math.PI * 2); ctx.fill();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(140,160,200,0.35)';
      ctx.beginPath(); ctx.arc(x, y, b.size * 1.15 * g.k, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    const byId = new Map(s.ships.map((x) => [x.id, x]));
    const sel = s.selected === 'all' ? s.wings.filter((x) => x.side === 0) : s.wings.filter((x) => x.id === s.selected);
    for (const wg of sel) drawWing(ctx, g, wg, byId);
    // Ships.
    for (const x of s.ships) {
      const [px, py] = g.to(x.pos);
      const col = nationColor(x);
      const ang = Math.atan2(x.fwd[2], x.fwd[0]);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);
      ctx.fillStyle = col;
      ctx.strokeStyle = col;
      const len = Math.max(SHIP_SPECS[x.type].size * fleet.world.L * g.k, x.type === 'capital' ? 14 : x.type === 'destroyer' ? 11 : x.type === 'cruiser' ? 9 : 5);
      if (x.type === 'capital') ctx.fillRect(-len / 2, -len / 7, len, len / 3.5);
      // A destroyer: a long thin dart, between the cruiser's triangle and the capital ship's bar.
      else if (x.type === 'destroyer') { ctx.beginPath(); ctx.moveTo(len / 2, 0); ctx.lineTo(-len / 2, len / 5); ctx.lineTo(-len / 3, 0); ctx.lineTo(-len / 2, -len / 5); ctx.closePath(); ctx.fill(); }
      else if (x.type === 'cruiser') { ctx.beginPath(); ctx.moveTo(len / 2, 0); ctx.lineTo(-len / 2, len / 2.6); ctx.lineTo(-len / 2, -len / 2.6); ctx.closePath(); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(0, 0, len / 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      if (x.flagship) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px, py, 11, 0, Math.PI * 2); ctx.stroke(); }
      // Hit-point tick.
      const f = Math.max(0, x.hp / x.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(px - 8, py + 8, 16, 3);
      ctx.fillStyle = f > 0.5 ? '#8dffad' : f > 0.25 ? '#ffc46b' : '#ff6a55';
      ctx.fillRect(px - 8, py + 8, 16 * f, 3);
    }
    // The path being drawn.
    const d = st.current.draft;
    if (d.length) {
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = '#ffc46b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      d.forEach((p, i) => { const [x, y] = g.to(p); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.stroke();
      ctx.setLineDash([]);
      d.forEach((p, i) => label(ctx, g.to(p), String(i + 1), '#ffc46b'));
    }
  };

  function label(ctx: CanvasRenderingContext2D, [x, y]: [number, number], t: string, col: string) {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#04070f';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t, x, y + 0.5);
  }

  function drawWing(ctx: CanvasRenderingContext2D, g: ReturnType<typeof geom>, wg: WingSnap, byId: Map<number, FleetShipSnap>) {
    const ms = wg.ships.map((id) => byId.get(id)).filter(Boolean) as FleetShipSnap[];
    if (!ms.length) return;
    const cen = scale(ms.reduce<V3>((a, m) => add(a, m.pos), [0, 0, 0]), 1 / ms.length);
    const [cx, cy] = g.to(cen);
    // Engagement circle: how far this wing looks for a fight under its stance.
    if (wg.engage > 0) {
      ctx.strokeStyle = 'rgba(127,214,255,0.35)';
      ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.arc(cx, cy, wg.engage * g.k, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    // Formation slots.
    ctx.strokeStyle = 'rgba(127,214,255,0.6)';
    for (const p of wg.post) if (p) { const [x, y] = g.to(p); ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.stroke(); }
    const o = wg.order;
    ctx.lineWidth = 1.5;
    if (o.kind === 'attack') {
      const t = byId.get(o.target);
      if (t) { const [tx, ty] = g.to(t.pos); ctx.strokeStyle = '#ff6a55'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke(); ctx.beginPath(); ctx.arc(tx, ty, 14, 0, Math.PI * 2); ctx.stroke(); }
    } else if (o.kind === 'defend') {
      const t = byId.get(o.ward);
      if (t) { const [tx, ty] = g.to(t.pos); ctx.strokeStyle = '#8dffad'; ctx.beginPath(); ctx.arc(tx, ty, 18, 0, Math.PI * 2); ctx.stroke(); }
    } else if (o.kind === 'path') {
      ctx.strokeStyle = '#ffc46b';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let i = o.next; i < o.points.length; i++) { const [x, y] = g.to(o.points[i]); ctx.lineTo(x, y); }
      if (o.loop && o.points.length) { const [x, y] = g.to(o.points[0]); ctx.lineTo(x, y); }
      ctx.stroke();
      o.points.forEach((p, i) => label(ctx, g.to(p), String(i + 1), i < o.next ? '#8fa3c8' : '#ffc46b'));
    } else if (o.kind === 'hold') {
      const [x, y] = g.to(o.at);
      ctx.strokeStyle = '#c0c8ff';
      ctx.strokeRect(x - 6, y - 6, 12, 12);
    }
    ctx.fillStyle = OURS;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(wg.name, cx + 10, cy - 8);
  }

  useEffect(draw);

  /** A tap at (x, y) on the canvas: select, attack, defend, a waypoint or a hold point. */
  const tapAt = (x: number, y: number, w: number, h: number) => {
    const f = fleetRef.current;
    const s = st.current.snap;
    const g = geom(w, h);
    const p = g.from(x, y);
    if (st.current.mode === 'path') { setDraft((d) => [...d, p]); return; }
    if (st.current.mode === 'move') { f.orders.hold(p); setMode('select'); return; }
    let hit: FleetShipSnap | null = null;
    let best = 18;
    for (const sh of s.ships) { const [sx, sy] = g.to(sh.pos); const d = Math.hypot(sx - x, sy - y); if (d < best) { best = d; hit = sh; } }
    if (!hit) return;
    if (hit.side === 1) f.orders.attack(hit.id);
    else if (hit.flagship || hit.wing === null || hit.wing === s.selected) f.orders.defend(hit.id);
    else f.select(hit.wing);
    setSnap(f.snap(RANGE * 6));
  };

  useEffect(() => {
    const c = canvasRef.current!;
    const ro = new ResizeObserver(draw);
    ro.observe(c);
    let start: { x: number; y: number; px: number; pz: number; id: number } | null = null;
    let moved = false;
    const local = (e: PointerEvent | WheelEvent) => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height }; };
    const down = (e: PointerEvent) => {
      try { c.setPointerCapture(e.pointerId); } catch { /* gone */ }
      const p = local(e);
      start = { x: p.x, y: p.y, px: view.current.panX, pz: view.current.panZ, id: e.pointerId };
      moved = false;
    };
    const move = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      const p = local(e);
      if (!moved && Math.hypot(p.x - start.x, p.y - start.y) < 6) return;
      moved = true;
      const k = (Math.min(p.w, p.h) / 2 / RANGE) * view.current.zoom;
      view.current.panX = start.px - (p.x - start.x) / k;
      view.current.panZ = start.pz - (p.y - start.y) / k;
      draw();
    };
    const up = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      start = null;
      if (moved) return;
      const p = local(e);
      tapAt(p.x, p.y, p.w, p.h);
    };
    const wheel = (e: WheelEvent) => { e.preventDefault(); view.current.zoom = Math.max(0.2, Math.min(8, view.current.zoom * Math.exp(-e.deltaY * 0.0015))); draw(); };
    c.addEventListener('pointerdown', down);
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', () => { start = null; });
    c.addEventListener('wheel', wheel, { passive: false });
    if (import.meta.env.DEV) {
      (window as unknown as { __tactical?: unknown }).__tactical = {
        view, canvas: c, draw,
        /** Tap where a world point is drawn, as a finger would. */
        tapWorld: (p: V3) => { const r = c.getBoundingClientRect(); const [x, y] = geom(r.width, r.height).to(p); tapAt(x, y, r.width, r.height); },
        setMode, get draft() { return st.current.draft; },
      };
    }
    return () => { ro.disconnect(); c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); c.removeEventListener('wheel', wheel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTime = (k: number) => { fleet.tacticalScale = k; setScaleUi(k); };
  const wings = snap.wings.filter((w) => w.side === 0);
  const sel = snap.selected === 'all' ? null : wings.find((w) => w.id === snap.selected) ?? null;
  const shown = sel ?? wings[0];
  const bayLeft = snap.bay.cruiser + snap.bay.fighter;
  const act = (f: () => void) => () => { f(); setSnap(fleet.snap(RANGE * 6)); };
  const L = fleet.world.L;

  if (!snap.flagship) {
    const ready = snap.level >= 10;
    return (
      <div className="tac tac-empty">
        <p>No fleet yet. Command of a capital ship opens at <strong>Captain</strong>: level 10 and the mission "Take command".</p>
        <p>You are level {snap.level}.{ready ? ' The mission is not built yet, so the level is enough for now.' : ''}</p>
        {ready && <button className="fb-btn" onClick={act(() => fleet.takeCommand())}>Take command of a capital ship</button>}
        {!ready && import.meta.env.DEV && (
          <button className="fb-btn" onClick={act(() => fleet.takeCommand(undefined, true))}>Take command (test build only)</button>
        )}
      </div>
    );
  }

  return (
    <div className="tac">
      <div className="tac-top">
        <div className="fleet-row fleet-wings">
          <button className={`fb-chip ${snap.selected === 'all' ? 'on' : ''}`} onClick={act(() => fleet.select('all'))}>All</button>
          {wings.map((w) => (
            <button key={w.id} className={`fb-chip ${snap.selected === w.id ? 'on' : ''}`} onClick={act(() => fleet.select(w.id))}>{w.name} <span className="fb-n">{w.ships.length}</span></button>
          ))}
        </div>
        <div className="seg tac-time" role="group" aria-label="Time">
          <button aria-pressed={scaleUi === 0} onClick={() => setTime(0)}>Pause</button>
          <button aria-pressed={scaleUi === 0.25} onClick={() => setTime(0.25)}>¼</button>
          <button aria-pressed={scaleUi === 1} onClick={() => setTime(1)}>1×</button>
        </div>
      </div>
      <canvas ref={canvasRef} className="tac-canvas" aria-label="Tactical map: tap a wing to select it, an enemy to attack it, your ship to defend it" />
      <p className="tac-read" role="status">
        {shown ? (
          <>
            <strong>{sel ? sel.name : 'All'}</strong> · {ORDER_LABEL[shown.order.kind]}: {shown.orderText}
            {' · '}{FORMATIONS[shown.formation].label}{shown.spacing !== null ? ` (spacing ${(shown.spacing / L).toFixed(1)} lengths)` : ''}
            {' · '}{STANCES[shown.stance].label} (engages within {(shown.engage / L).toFixed(0)} lengths)
          </>
        ) : 'Nothing launched'}
        {mode === 'path' && <> · <em>tap to add waypoints ({draft.length})</em></>}
        {mode === 'move' && <> · <em>tap where to hold</em></>}
        {' · '}{snap.stats.kills} down, {snap.stats.lost} lost · bay {snap.bay.cruiser} cruisers, {snap.bay.fighter} fighters
      </p>
      <div className="fleet-row fleet-orders tac-orders">
        <button className="fb-btn" disabled={!bayLeft} onClick={act(() => fleet.launch())}>Launch{bayLeft ? ` ${bayLeft}` : ''}</button>
        <button className="fb-btn" onClick={act(() => fleet.orders.defend())}>Defend me</button>
        <button className="fb-btn" onClick={act(() => fleet.orders.follow())}>Follow me</button>
        <button className="fb-btn" onClick={act(() => fleet.orders.hold())}>Hold</button>
        <button className={`fb-btn ${mode === 'move' ? 'on' : ''}`} onClick={() => setMode(mode === 'move' ? 'select' : 'move')}>Hold at…</button>
        {mode !== 'path' ? (
          <button className="fb-btn" onClick={() => { setDraft([]); setMode('path'); }}>Path</button>
        ) : (
          <>
            <button className="fb-btn on" disabled={!draft.length} onClick={act(() => { fleet.orders.path(draft, loop); setDraft([]); setMode('select'); })}>Send path</button>
            <button className={`fb-btn ${loop ? 'on' : ''}`} onClick={() => setLoop(!loop)} aria-pressed={loop}>Loop</button>
            <button className="fb-btn" onClick={() => { setDraft([]); setMode('select'); }}>Cancel</button>
          </>
        )}
        <button className="fb-btn" onClick={act(() => fleet.orders.recall())}>Recall</button>
        <button className="fb-btn fb-cycle" onClick={act(() => fleet.setFormation('next'))}>{shown ? FORMATIONS[shown.formation].label : 'Formation'}</button>
        <button className="fb-btn fb-cycle" onClick={act(() => fleet.setStance('next'))}>{shown ? STANCES[shown.stance].label : 'Stance'}</button>
      </div>
    </div>
  );
}

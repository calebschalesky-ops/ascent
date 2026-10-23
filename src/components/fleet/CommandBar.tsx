/**
 * The command strip at the foot of the flight view: wings, orders, formation and stance. T opens command mode (the
 * keys go to the strip, FreeSpace-style); every control is also a button, for the mouse and for a phone.
 */
import { useEffect, useRef, useState } from 'react';
import { FORMATIONS, STANCES } from '../../lib/fleet/spec';
import { SHIP_SPECS } from '../../lib/shipTypes';
import type { FleetCommand, FleetSnap } from './fleetRuntime';

/** What a key does in command mode. Returns null when the key is not a command key. */
export function commandKey(fleet: FleetCommand, key: string, lockId: number | null): 'done' | 'stay' | 'path' | null {
  const ws = fleet.snap(0).wings.filter((w) => w.side === 0);
  if (/^[1-9]$/.test(key)) {
    const k = +key;
    fleet.select(k === 1 ? 'all' : ws[k - 2]?.id ?? 'all');
    return 'stay';
  }
  switch (key) {
    case 'a': if (lockId !== null) fleet.orders.attack(lockId); return 'done';
    case 'd': fleet.orders.defend(); return 'done';
    case 'f': fleet.orders.follow(); return 'done';
    case 'h': fleet.orders.hold(); return 'done';
    case 'r': fleet.orders.recall(); return 'done';
    case 'l': fleet.launch(); return 'done';
    case 'v': fleet.setFormation('next'); return 'stay';
    case 'b': fleet.setStance('next'); return 'stay';
    case 'p': return 'path';
    default: return null;
  }
}

interface Props {
  fleet: FleetCommand;
  open: boolean;
  onOpen: (on: boolean) => void;
  lockId: () => number | null;
  onTactical: () => void;
  keyHint?: string; // the key that opens command mode (mc-controls: T, rebindable)
}

export default function CommandBar({ fleet, open, onOpen, lockId, onTactical, keyHint = 'T' }: Props) {
  const [snap, setSnap] = useState<FleetSnap>(() => fleet.snap(0));
  const fleetRef = useRef(fleet);
  fleetRef.current = fleet;
  // On a phone the strip folds away to one button, so it does not sit over the middle of the view.
  const [sheet, setSheet] = useState(() => !(typeof matchMedia === 'function' && matchMedia('(max-width: 760px)').matches));
  useEffect(() => {
    const t = setInterval(() => setSnap(fleetRef.current.snap(0)), 250);
    return () => clearInterval(t);
  }, []);
  if (!snap.flagship) return null;
  const wings = snap.wings.filter((w) => w.side === 0);
  const sel = snap.selected === 'all' ? null : wings.find((w) => w.id === snap.selected) ?? null;
  const shown = sel ?? wings[0];
  const bayLeft = snap.bay.cruiser + snap.bay.fighter;
  const act = (f: () => void) => () => { f(); setSnap(fleet.snap(0)); };
  const k = (s: string) => (open ? <span className="key-hint">{s}</span> : null);
  const ships = wings.reduce((n, w) => n + w.ships.length, 0);
  if (!sheet && !open) {
    return (
      <div className="fleet-bar folded" role="toolbar" aria-label="Fleet orders">
        <div className="fleet-row">
          <button className="fb-btn" onClick={() => setSheet(true)} aria-expanded={false}>Fleet · {ships}</button>
          <button className="fb-chip fb-fold" onClick={() => setSheet(false)} aria-expanded={true} aria-label="Fold the fleet orders">×</button>
        <span className="fb-status" role="status">{snap.lastOrder ?? snap.rank.label}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`fleet-bar ${open ? 'open' : ''}`} role="toolbar" aria-label="Fleet orders">
      <div className="fleet-row fleet-wings">
        <button className={`fb-chip ${snap.selected === 'all' ? 'on' : ''}`} onClick={act(() => fleet.select('all'))}>{k('1')}All</button>
        {wings.map((w, i) => (
          <button key={w.id} className={`fb-chip ${snap.selected === w.id ? 'on' : ''}`} onClick={act(() => fleet.select(w.id))}
            title={`${w.name}: ${w.orderText}, ${FORMATIONS[w.formation].label}, ${STANCES[w.stance].label}`}>
            {k(String(i + 2))}{w.name} <span className="fb-n">{w.ships.length}</span>
          </button>
        ))}
        <span className="fb-status" role="status">{snap.lastOrder ?? `${snap.rank.label} · ${SHIP_SPECS[snap.hull].label}`}</span>
      </div>
      <div className="fleet-row fleet-orders">
        <button className="fb-btn" disabled={!bayLeft} onClick={act(() => fleet.launch())}>{k('L')}Launch{bayLeft ? ` ${bayLeft}` : ''}</button>
        <button className="fb-btn" onClick={act(() => { const id = lockId(); if (id !== null) fleet.orders.attack(id); })} title="Attack the ship you have locked">{k('A')}Attack</button>
        <button className="fb-btn" onClick={act(() => fleet.orders.defend())} title="Defend your ship">{k('D')}Defend</button>
        <button className="fb-btn" onClick={act(() => fleet.orders.follow())} title="Form on your ship">{k('F')}Follow</button>
        <button className="fb-btn" onClick={act(() => fleet.orders.hold())}>{k('H')}Hold</button>
        <button className="fb-btn" onClick={onTactical} title="Draw a path on the tactical view">{k('P')}Path</button>
        <button className="fb-btn" onClick={act(() => fleet.orders.recall())}>{k('R')}Recall</button>
        <button className="fb-btn fb-cycle" onClick={act(() => fleet.setFormation('next'))} title="Next formation">{k('V')}{shown ? FORMATIONS[shown.formation].label : 'Formation'}</button>
        <button className="fb-btn fb-cycle" onClick={act(() => fleet.setStance('next'))} title="Next stance">{k('B')}{shown ? STANCES[shown.stance].label : 'Stance'}</button>
        <button className={`fb-btn fb-mode ${open ? 'on' : ''}`} onClick={() => onOpen(!open)} aria-pressed={open} title="Command mode: the keys give orders">{open ? 'Keys on' : keyHint}</button>
      </div>
    </div>
  );
}

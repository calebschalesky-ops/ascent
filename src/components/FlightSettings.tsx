import { useState } from 'react';
import type { FlightSettings as Flight } from '../lib/store';
import Keybinds from './controls/Keybinds';
import { DEFAULT_BINDS } from './controls/bindings';

interface Props {
  flight: Flight;
  onChange: (f: Flight) => void;
}

/** Flight options, shared by the pause menu, the main menu and the Settings tab. */
export default function FlightSettings({ flight, onChange }: Props) {
  const set = (p: Partial<Flight>) => onChange({ ...flight, ...p });
  const [keys, setKeys] = useState(false);
  return (
    <div className="flight-settings">
      <label className="fs-row">
        <span className="fs-label">Camera drag sensitivity <span className="muted">{Math.round((flight.look ?? 1) * 100)}%</span></span>
        <input type="range" min={0.1} max={2} step={0.05} value={flight.look ?? 1} onChange={(e) => set({ look: +e.target.value })} aria-label="Camera drag sensitivity" />
      </label>
      <label className="fs-row">
        <span className="fs-label">Key and stick turn rate <span className="muted">{flight.sensitivity.toFixed(1)}×</span></span>
        <input type="range" min={0.5} max={2} step={0.1} value={flight.sensitivity} onChange={(e) => set({ sensitivity: +e.target.value })} />
      </label>
      <label className="check-lbl">
        <input type="checkbox" checked={flight.assist} onChange={(e) => set({ assist: e.target.checked })} />
        Flight assist (the ship goes where it points; the nose levels when you let go)
      </label>
      <label className="check-lbl">
        <input type="checkbox" checked={flight.invert} onChange={(e) => set({ invert: e.target.checked })} />
        Invert up and down (camera drag, arrow keys and stick: pull back to climb, like a plane)
      </label>
      <label className="check-lbl">
        <input type="checkbox" checked={flight.ovPinned ?? true} onChange={(e) => set({ ovPinned: e.target.checked })} />
        Overview pinned at the right edge (off: hold Tab for it)
      </label>
      <div className="fs-row">
        <span className="fs-label">Controls</span>
        <button className="btn ghost" onClick={() => setKeys(!keys)} aria-expanded={keys}>{keys ? 'Hide key bindings' : 'Key bindings…'}</button>
      </div>
      {keys && <Keybinds binds={flight.binds ?? DEFAULT_BINDS} onChange={(binds) => set({ binds })} />}
      <div className="fs-row">
        <span className="fs-label">Graphics</span>
        <div className="seg">
          <button aria-selected={flight.quality === 'high'} onClick={() => set({ quality: 'high' })}>High</button>
          <button aria-selected={flight.quality === 'low'} onClick={() => set({ quality: 'low' })}>Battery saver</button>
        </div>
      </div>
    </div>
  );
}

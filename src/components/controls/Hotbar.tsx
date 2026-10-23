/**
 * The hotbar along the bottom of the view (R4): nine slots, the picked one framed, Minecraft-shaped. A slot the pilot
 * cannot have yet shows a lock and what opens it (GP-04); a slot that opens pulses once, with a line naming its key.
 */
import { useEffect, useRef, useState } from 'react';

export interface BarSlot {
  label: string; // what is in it, short
  sub: string; // a count or a state: ammunition, drones in the bay, charges
  empty: boolean;
  locked: boolean;
  unlock?: string; // on a locked slot: what opens it, short ("Lv 2", "Shipyard")
  title: string; // the full line for a tooltip and screen readers
  active?: boolean; // deployed (a swarm or fighters out), shield up, a draw in progress
}

interface Props {
  slots: BarSlot[];
  selected: number;
  keys: string[]; // each slot's key, as the player reads it
  onPick: (i: number) => void;
}

/** How long a slot that just opened is marked, and its line shown. */
const OPENED_MS = 6000;

export default function Hotbar({ slots, selected, keys, onPick }: Props) {
  const wasLocked = useRef<boolean[] | null>(null);
  const [opened, setOpened] = useState<{ i: number; n: number } | null>(null);
  const lockSig = slots.map((s) => (s.locked ? '1' : '0')).join('');
  useEffect(() => {
    const before = wasLocked.current;
    wasLocked.current = slots.map((s) => s.locked);
    if (!before) return; // the first look is not an opening
    const i = slots.findIndex((s, k) => before[k] && !s.locked);
    if (i < 0) return;
    setOpened((o) => ({ i, n: (o?.n ?? 0) + 1 }));
  }, [lockSig]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!opened) return;
    const id = setTimeout(() => setOpened(null), OPENED_MS);
    return () => clearTimeout(id);
  }, [opened]);
  return (
    <div className="hotbar" role="toolbar" aria-label="Hotbar">
      {opened && slots[opened.i] && (
        <p key={opened.n} className="hb-opened" role="status">{slots[opened.i].label || 'Slot'} open: press {keys[opened.i]}</p>
      )}
      {slots.map((s, i) => (
        <button key={i} className={`hb-slot${i === selected ? ' on' : ''}${s.empty ? ' empty' : ''}${s.locked ? ' locked' : ''}${s.active ? ' active' : ''}${opened?.i === i ? ' opened' : ''}`}
          title={s.title} aria-label={`${keys[i]}: ${s.title}`} aria-pressed={i === selected}
          onClick={() => onPick(i)} onContextMenu={(e) => e.preventDefault()}>
          <span className="hb-key">{keys[i]}</span>
          {s.locked ? (
            <>
              <span className="hb-lock" aria-hidden="true">🔒</span>
              <span className="hb-label">{s.label}</span>
              <span className="hb-unlock">{s.unlock}</span>
            </>
          ) : <span className="hb-label">{s.label}</span>}
          {s.sub && !s.locked && <span className="hb-sub">{s.sub}</span>}
        </button>
      ))}
    </div>
  );
}

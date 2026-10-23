import { useEffect, useState } from 'react';
import type { AirHud as AirHudState } from './planetAir';
import './air.css';

const NAME = { earth: 'Earth', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn' } as const;
const fmt = (v: number) => (Math.abs(v) < 10 ? v.toFixed(1) : Math.round(v).toLocaleString('en-US'));

/** Altitude, airspeed and air in the atmosphere; the pull-up warning; a banner on the way in and out. */
export default function AirHud({ air, event }: { air: AirHudState | null; event: { text: string; n: number } | null }) {
  const [shown, setShown] = useState<{ text: string; n: number } | null>(null);
  useEffect(() => {
    if (!event) return;
    setShown(event);
    const t = setTimeout(() => setShown((s) => (s && s.n === event.n ? null : s)), 3200);
    return () => clearTimeout(t);
  }, [event?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      {shown && <div key={shown.n} className="air-banner" role="status">{shown.text}</div>}
      {air && (
        <div className="air-hud" role="status" aria-label="Flight in air">
          <span className="air-row"><span className="air-k">{NAME[air.body]}</span> air {air.density < 0.01 ? air.density.toFixed(4) : air.density.toFixed(2)}</span>
          <span className="air-row"><span className="air-k">alt</span> {fmt(air.alt)}{air.alt < 0 ? ' below the cloud tops' : ''}</span>
          <span className="air-row"><span className="air-k">airspeed</span> {fmt(air.airspeed)}</span>
          {air.limited && <span className="air-row air-note">slowing near the ground</span>}
          {air.glow > 0.15 && <span className="air-row air-hot">entry heat {Math.round(air.glow * 100)}%</span>}
        </div>
      )}
      {air?.warn && <div className="air-warn" role="alert">{air.crush ? 'PRESSURE — CLIMB' : 'PULL UP'}</div>}
    </>
  );
}

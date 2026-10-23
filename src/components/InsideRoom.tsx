/**
 * Inside a body: an empty placeholder room. What goes in here is a game-design question and is not decided.
 */
import * as THREE from 'three';
import type { Dest } from '../lib/nav';
import { DEST_LABEL } from '../lib/nav';
import { destColor } from './NavOverlay';

const light = (hex: string, k: number) => `#${new THREE.Color(hex).lerp(new THREE.Color(1, 1, 1), k).getHexString()}`;

/** Inner and outer colour of the wash seen while going in. The stars and the edge have no body: a gold wash. */
export function washColor(d: Dest): [string, string] {
  if (d === 'stars' || d === 'edge') return ['#fff3cf', '#c9a54a'];
  const c = destColor(d);
  return [light(c, 0.45), c];
}

interface Props {
  dest: Dest;
  onLeave: () => void;
  onMenu: () => void;
}

export default function InsideRoom({ dest, onLeave, onMenu }: Props) {
  const color = destColor(dest);
  return (
    <section className="sphere-display" role="dialog" aria-label={`Inside: ${DEST_LABEL[dest]}`} style={{ ['--c' as string]: color, ['--cl' as string]: light(color, 0.6) }}>
      <header className="sd-head">
        <div className="sd-title">
          <div>
            <h2>Inside {DEST_LABEL[dest]}</h2>
            <p className="sd-sub">Placeholder room</p>
          </div>
        </div>
        <div className="sd-btns">
          <button className="btn" onClick={onLeave}>Leave <span className="key-hint">Esc</span></button>
          <button className="btn ghost" onClick={onMenu}>☰ Menu</button>
        </div>
      </header>
      <div className="sd-body">
        <section className="sd-panel">
          <p>This is an empty room. What the player finds inside a body has not been decided yet.</p>
        </section>
      </div>
    </section>
  );
}

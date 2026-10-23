/**
 * The tactical view's SVG overlay (PKG-12): ship icons by class, the four shield arcs per ship, and the ghost line of a
 * maneuver being chosen with its time to completion. An SVG over the canvas, like PKG-09's order lines: it costs no draw
 * call. Colours are tokens (tactical.css) and the houses' own glow, which every HUD in the skirmish already uses.
 */
import * as THREE from 'three';
import type { ManeuverPreview } from '../../sim/index';
import type { BattleFrame, ShipView, V3 } from '../model';
import type { BattleView } from '../scene';
import { SIM_VIEW } from '../simFeed';
import type { Arc } from './intel';
import { TAC } from './numbers';
import type { XZ } from './paths';

export interface Px { x: number; y: number }

/**
 * Battle-frame points (units) and sim points (metres, at a ship's height) to canvas-local px; null off screen.
 * The battle-to-world mapping is read once per projector (view.toWorld updates the battle's matrices on every call,
 * which is far too slow for the hundreds of points an overlay frame projects): make one per drawn frame.
 */
export function projector(view: BattleView) {
  const v = new THREE.Vector3();
  const canvas = view.renderer.domElement;
  const o = view.toWorld([0, 0, 0]);
  const m = new THREE.Matrix4().makeBasis(
    view.toWorld([1, 0, 0]).sub(o), view.toWorld([0, 1, 0]).sub(o), view.toWorld([0, 0, 1]).sub(o),
  ).setPosition(o);
  const unit = (p: V3): Px | null => {
    v.set(p[0], p[1], p[2]).applyMatrix4(m).project(view.camera);
    if (v.z > 1 || v.z < -1) return null;
    return { x: ((v.x + 1) / 2) * canvas.clientWidth, y: ((1 - v.y) / 2) * canvas.clientHeight };
  };
  const sim = (p: XZ, y = 0): Px | null => unit([p.x / SIM_VIEW.metresPerUnit, y, p.z / SIM_VIEW.metresPerUnit]);
  return { unit, sim };
}

/** An SVG path through screen points; a point off screen breaks the line. */
export function pathD(pts: (Px | null)[]): string {
  let d = '';
  let pen = false;
  for (const p of pts) {
    if (!p) { pen = false; continue; }
    d += `${pen ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    pen = true;
  }
  return d;
}

const f1 = (n: number) => n.toFixed(1);
export const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** The screen direction of a battle-frame heading at a ship (perspective-correct near the ship). */
function screenDir(unit: (p: V3) => Px | null, s: ShipView, at: Px, yaw: number): { x: number; y: number } | null {
  const k = 4; // units: far enough to resolve, near enough to stay local
  const q = unit([s.pos[0] + Math.cos(yaw) * k, s.pos[1], s.pos[2] + Math.sin(yaw) * k]);
  if (!q) return null;
  const dx = q.x - at.x, dy = q.y - at.y;
  const L = Math.hypot(dx, dy);
  return L > 1e-6 ? { x: dx / L, y: dy / L } : null;
}

/** Icon outlines by class, pointing +x, unit size (scaled by TAC.icon). */
const GLYPH: Record<string, [number, number][]> = {
  escort: [[1, 0], [-0.8, 0.7], [-0.4, 0], [-0.8, -0.7]],
  destroyer: [[1.1, 0], [-0.6, 0.55], [-0.9, 0.3], [-0.9, -0.3], [-0.6, -0.55]],
  cruiser: [[1.2, 0], [0.2, 0.5], [-1, 0.45], [-1, -0.45], [0.2, -0.5]],
  carrier: [[1, 0.3], [1, -0.3], [-1, -0.6], [-1, 0.6]],
  capital: [[1.3, 0], [0.4, 0.55], [-0.9, 0.7], [-1.1, 0], [-0.9, -0.7], [0.4, -0.55]],
  fighter: [[1, 0], [-1, 0.8], [-1, -0.8]],
};

/** Where each shield side points, relative to the bow, in the sim's convention (ships.ts sideFacing: port is +90°). */
const SIDE_YAW: Record<Arc['side'], number> = { fore: 0, port: Math.PI / 2, aft: Math.PI, starboard: -Math.PI / 2 };

export interface TacticalDraw {
  frame: BattleFrame;
  /** His side in the frame (0). */
  own: number;
  arcs: Record<string, Arc[]>;
  selected: string | null;
  ghost: ManeuverPreview | null;
  ghostLabel: string | null;
  /** Ships the picker is choosing for (rings). */
  choosing: string[];
  /** Draw icons and arcs (the tactical view is open); the ghost draws either way. */
  holo: boolean;
}

/** The overlay's markup for one frame. */
export function tacticalSvg(view: BattleView, d: TacticalDraw): string {
  const { unit, sim } = projector(view);
  const out: string[] = [];
  const byId = new Map(d.frame.ships.map((s) => [s.id, s]));

  if (d.holo) {
    for (const s of d.frame.ships) {
      if (s.status !== 'alive' && s.status !== 'broken') continue;
      const at = unit(s.pos);
      if (!at) continue;
      const fwd = screenDir(unit, s, at, Math.atan2(s.heading[2], s.heading[0]));
      if (!fwd) continue;
      const size = TAC.icon[s.cls] ?? 8;
      const ang = (Math.atan2(fwd.y, fwd.x) * 180) / Math.PI;
      const pts = (GLYPH[s.cls] ?? GLYPH.cruiser).map(([x, y]) => `${f1(x * size)},${f1(y * size)}`).join(' ');
      const mine = s.side === d.own;
      out.push(`<g class="tac-ship${mine ? ' tac-own' : ' tac-foe'}${s.status === 'broken' ? ' tac-broken' : ''}" data-id="${s.id}" style="--house:${s.colours.glow}" transform="translate(${f1(at.x)} ${f1(at.y)})">`);
      out.push(`<polygon class="tac-icon" points="${pts}" transform="rotate(${f1(ang)})"/>`);
      if (s.flagship) out.push(`<circle class="tac-flag" r="${f1(size * 0.28)}"/>`);
      // The four shield arcs, each centred on its side's bearing, drawn as a polyline round the icon.
      const yaw0 = Math.atan2(s.heading[2], s.heading[0]);
      const R = size + TAC.arcGap;
      for (const a of d.arcs[s.id] ?? []) {
        const c = yaw0 + SIDE_YAW[a.side];
        const half = Math.PI / 4 - TAC.arcPad / 2;
        const sweep = a.level === null ? 1 : Math.max(0.12, a.level);
        const ps: string[] = [];
        for (let i = 0; i <= 8; i++) {
          const yaw = c - half * sweep + ((2 * half * sweep) * i) / 8;
          const dir = screenDir(unit, s, at, yaw);
          if (dir) ps.push(`${f1(dir.x * R)},${f1(dir.y * R)}`);
        }
        if (ps.length < 2) continue;
        const w = a.level === null ? TAC.arcWidth : Math.max(TAC.arcMin, Math.min(TAC.arcMax, TAC.arcWidth * (a.weight / 0.25)));
        out.push(`<polyline class="tac-arc tac-arc-${a.state}" data-side="${a.side}" points="${ps.join(' ')}" style="stroke-width:${f1(w)};opacity:${a.alpha.toFixed(2)}"/>`);
        if (a.state === 'down') {
          // A side seen open: a breach tick out from the middle of the arc, so it reads at a glance and not by hue alone.
          const dir = screenDir(unit, s, at, c);
          if (dir) out.push(`<line class="tac-breach" data-side="${a.side}" x1="${f1(dir.x * (R - 3))}" y1="${f1(dir.y * (R - 3))}" x2="${f1(dir.x * (R + 7))}" y2="${f1(dir.y * (R + 7))}"/>`);
        }
      }
      out.push('</g>');
    }
  }

  for (const id of d.choosing) {
    const s = byId.get(id);
    const at = s && unit(s.pos);
    if (at) out.push(`<circle class="tac-choosing" cx="${f1(at.x)}" cy="${f1(at.y)}" r="20"/>`);
  }

  if (d.ghost) {
    let end: Px | null = null;
    for (const [id, path] of Object.entries(d.ghost.path)) {
      const y = byId.get(id)?.pos[1] ?? 0;
      const pts = path.map((p) => sim({ x: p.x, z: p.z }, y));
      const dd = pathD(pts);
      if (dd) out.push(`<path class="tac-ghost" data-ship="${id}" d="${dd}"/>`);
      const last = [...pts].reverse().find((p) => p);
      if (last && (!end || last.y < end.y)) end = last;
    }
    for (const m of d.ghost.marks) {
      const p = sim({ x: m.at.x, z: m.at.z }, byId.get(m.ship)?.pos[1] ?? 0);
      if (p) out.push(`<rect class="tac-mark" x="${f1(p.x - 4)}" y="${f1(p.y - 4)}" width="8" height="8" transform="rotate(45 ${f1(p.x)} ${f1(p.y)})"/>`);
    }
    if (end) {
      const text = `${d.ghostLabel ?? ''} · ${clock(d.ghost.eta)}${d.ghost.complete ? '' : '+'}`;
      out.push(`<text class="tac-eta" x="${f1(end.x + 8)}" y="${f1(end.y - 8)}">${text}</text>`);
    }
  }
  return out.join('');
}

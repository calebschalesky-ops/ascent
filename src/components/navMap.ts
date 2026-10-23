/**
 * The navigation map, drawn on a 2D canvas: one function for both the corner minimap and the full map.
 * Seen from above. Radius is distance from Earth, squeezed so every ring gets room (the spacing in the cosmos is not
 * to scale either); angle is the angle round from +x, 0° to the right, increasing anticlockwise.
 */
import type { Dest, DestGeo, LegPlan, RouteState, V3 } from '../lib/nav';
import { AU, COSMOS, DEST_LABEL, HILL, LIMIT, SUN_POS, VR, add, bodyPos, dist, len, lonLatOf, scale, sub } from '../lib/nav';
import { COLOR, PLANET_NAME, isPlanet } from '../lib/bodies';
import type { PlanetId, SphereId } from '../lib/bodies';
import { LABEL_FONT } from './three-helpers';
import { destTint } from '../lib/world';

export type Phase = 'aligning' | 'cruising' | 'approaching' | 'parked';
export const PHASE_LABEL: Record<Phase, string> = { aligning: 'Aligning', cruising: 'Cruising', approaching: 'Approaching', parked: 'Parked' };

/** Everything the navigation views read, taken from the flight a few times a second. */
export interface NavSnap {
  pos: V3;
  vel: V3;
  fwd: V3;
  yaw: number;
  pitch: number;
  speed: number;
  throttle: number;
  zone: SphereId;
  auto: boolean;
  target: Dest | null;
  geo: DestGeo[];
  route: RouteState;
  vias: V3[]; // the autopilot's current detour points
  legs: LegPlan[]; // the rest of the route, leg by leg
  phase: Phase | null;
}

/**
 * Real scale (step 3): the map is centred on the Sun, every orbit a circle round it, with distance from the Sun on a
 * log scale so Mercury's orbit and the edge both get room (Mercury 0.24 of the way out, Earth 0.41, Saturn 0.93).
 * Inside a world's Hill sphere (its moons, its stations, a ship near home) points are drawn round that world's dot,
 * magnified, within LOCAL map units of it.
 */
const R0 = 0.25 * AU;
export function mapR(r: number): number {
  if (r <= 0) return 0;
  return Math.log(1 + r / R0) / Math.log(1 + LIMIT / R0);
}
const LOCAL = 0.05;
const HOSTS: { id: 'earth' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn'; pos: V3; hill: number }[] = [
  { id: 'earth', pos: [0, 0, 0], hill: HILL.earth },
  ...(['mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const).map((id) => ({ id, pos: bodyPos(id), hill: HILL[id] })),
];
/** Where a point is drawn round the Sun, before any magnifying. */
function helio(p: V3): [number, number] {
  const v = sub(p, SUN_POS);
  const h = Math.hypot(v[0], v[2]);
  if (h < 1e-9) return [0, 0];
  const m = mapR(len(v));
  return [(v[0] / h) * m, (-v[2] / h) * m];
}
/** How far from its world's dot a point at `d` from the world is drawn (map units), out to LOCAL at its Hill sphere. */
const localR = (d: number, hill: number) => (LOCAL * Math.log(1 + (60 * d) / hill)) / Math.log(61);
/** A point in the cosmos to map units (-1..1), x right, y up. */
export function mapXY(p: V3): [number, number] {
  for (const hst of HOSTS) {
    const d = dist(p, hst.pos);
    if (d >= hst.hill) continue;
    // The Moon is inside Earth's sphere, so it and everything near it are drawn round Earth.
    const base = helio(hst.pos);
    const v = sub(p, hst.pos);
    const h = Math.hypot(v[0], v[2]);
    const k = h < 1e-9 ? 0 : localR(d, hst.hill) / h;
    return [base[0] + v[0] * k, base[1] - v[2] * k];
  }
  return helio(p);
}
/** Map radius of a ring round a world's dot at distance `d` from it (the Moon's orbit, Earth's shells). */
export const localRing = (d: number) => localR(d, HILL.earth);

export interface MapView { zoom: number; panX: number; panY: number } // pan in map units
export const toScreen = (w: number, h: number, v: MapView, [x, y]: [number, number]): [number, number] => {
  const s = (Math.min(w, h) / 2) * 0.86 * v.zoom;
  return [w / 2 + (x - v.panX) * s, h / 2 - (y - v.panY) * s];
};

/** Orbits round the Sun, as map radii: Earth's path is drawn in the Sun's colour, as its ring was. */
const RING_NAMES: [PlanetId, number][] = (['mercury', 'venus', 'sun', 'mars', 'jupiter', 'saturn'] as const).map((id) => [id, mapR(id === 'sun' ? len(SUN_POS) : dist(bodyPos(id), SUN_POS))]);
const bodyColor = (id: Dest) => (isPlanet(id) ? COLOR[id] : id === 'earth' ? '#3f7fd0' : destTint(id) ?? '#dfe9ff');
/** Moons and stations crowd their planet at the whole-cosmos scale: they are drawn, and can be tapped, from this zoom in. */
export const DETAIL_ZOOM = 3;

export interface DrawOpts { full: boolean; time: number; selected?: Dest | null }

/** Screen positions of the destinations, for drawing and for tapping. */
export function destPoints(w: number, h: number, v: MapView, geo: DestGeo[]): { id: Dest; x: number; y: number; r: number }[] {
  const s = (Math.min(w, h) / 2) * 0.86 * v.zoom;
  return geo.filter((d) => !d.kind || v.zoom >= DETAIL_ZOOM).map((d) => {
    if (d.id === 'edge') {
      const [x, y] = toScreen(w, h, v, [0, 0]);
      return { id: d.id, x, y, r: s * mapR(VR.edge) }; // the rim itself
    }
    const [x, y] = toScreen(w, h, v, mapXY(d.pos));
    const rr = dist(d.pos, SUN_POS);
    const r = d.size ? Math.max(((mapR(rr + d.size) - mapR(Math.max(0, rr - d.size))) / 2) * s, 0) : 0;
    return { id: d.id, x, y, r };
  });
}

/** Which destination a tap at (x, y) means, if any. */
export function hitTest(w: number, h: number, v: MapView, geo: DestGeo[], x: number, y: number, slop = 22): Dest | null {
  let best: Dest | null = null;
  let bestD = Infinity;
  for (const p of destPoints(w, h, v, geo)) {
    if (p.id === 'edge') {
      const d = Math.abs(Math.hypot(x - p.x, y - p.y) - p.r);
      if (d < 14 && d < bestD) { best = 'edge'; bestD = d + 6; } // bodies win over the rim when both are close
      continue;
    }
    const d = Math.max(0, Math.hypot(x - p.x, y - p.y) - p.r);
    if (d < slop && d < bestD) { best = p.id; bestD = d; }
  }
  return best;
}

/** A segment in the cosmos drawn through the squeezed map, which bends straight lines. */
function pathLine(ctx: CanvasRenderingContext2D, w: number, h: number, v: MapView, pts: V3[]) {
  ctx.beginPath();
  let dir: [number, number] = [1, 0];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const n = 24;
    for (let k = i === 0 ? 0 : 1; k <= n; k++) {
      const p = add(a, scale([b[0] - a[0], b[1] - a[1], b[2] - a[2]], k / n));
      // Straight over the Sun (the edge's waypoint) there is no angle: keep heading the way the line was going.
      const q = sub(p, SUN_POS);
      const hz = Math.hypot(q[0], q[2]);
      if (hz > len(q) * 1e-3) dir = [q[0] / hz, -q[2] / hz];
      const m = mapR(len(q));
      const [x, y] = toScreen(w, h, v, hz > len(q) * 1e-3 ? mapXY(p) : [dir[0] * m, dir[1] * m]);
      if (i === 0 && k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

export function drawNavMap(ctx: CanvasRenderingContext2D, w: number, h: number, v: MapView, snap: NavSnap, o: DrawOpts) {
  const s = (Math.min(w, h) / 2) * 0.86 * v.zoom;
  const [cx, cy] = toScreen(w, h, v, [0, 0]);
  const S = (p: [number, number]) => toScreen(w, h, v, p);
  const small = !o.full;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = small ? 'rgba(4, 6, 20, 0.78)' : '#03040e';
  ctx.fillRect(0, 0, w, h);
  ctx.lineCap = 'round';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // The edge: light at the rim.
  const rim = mapR(VR.edge) * s;
  const gr = ctx.createRadialGradient(cx, cy, rim * 0.9, cx, cy, rim * 1.02);
  gr.addColorStop(0, 'rgba(255, 220, 140, 0)');
  gr.addColorStop(1, snap.target === 'edge' ? 'rgba(255, 220, 140, 0.45)' : 'rgba(255, 220, 140, 0.22)');
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.arc(cx, cy, rim * 1.02, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255, 230, 170, 0.7)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(cx, cy, rim, 0, Math.PI * 2); ctx.stroke();

  // The stars' ring.
  const zs = mapR(VR.stars) * s;
  ctx.strokeStyle = 'rgba(255, 196, 107, 0.75)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, zs, 0, Math.PI * 2); ctx.stroke();

  // The rings in their colours, and the shells around Earth in parchment.
  for (const [id, r] of RING_NAMES) {
    const col = COLOR[id];
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = small ? 1 : 1.4;
    ctx.beginPath(); ctx.arc(cx, cy, r * s, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // Round Earth's dot: the Moon's orbit in its colour, and the shells in parchment.
  const [ex, ey] = S(mapXY([0, 0, 0]));
  ctx.strokeStyle = COLOR.moon;
  ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.arc(ex, ey, localRing(VR.moon) * s, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(233, 220, 192, 0.3)';
  ctx.lineWidth = 1;
  for (const r of [VR.water, VR.air, VR.fire]) { ctx.beginPath(); ctx.arc(ex, ey, localRing(r) * s, 0, Math.PI * 2); ctx.stroke(); }
  // Names are placed last, most important first, and any that would overlap one already placed is left out.
  const placed: [number, number, number, number][] = [];
  const names: { text: string; x: number; y: number; font: string; color: string }[] = [];
  const placeNames = () => {
    for (const n of names) {
      ctx.font = n.font;
      const w2 = ctx.measureText(n.text).width / 2 + 2;
      const box: [number, number, number, number] = [n.x - w2, n.y - 7, n.x + w2, n.y + 7];
      if (placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
      placed.push(box);
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, n.x, n.y);
    }
  };

  // The route ahead: the current leg along its detours, then each later leg.
  if (snap.legs.length) {
    ctx.setLineDash(small ? [3, 3] : [6, 5]);
    ctx.lineWidth = small ? 1 : 1.6;
    snap.legs.forEach((leg, i) => {
      const to = snap.geo.find((d) => d.id === leg.dest);
      if (!to) return;
      ctx.strokeStyle = i === 0 ? 'rgba(255, 215, 106, 0.95)' : 'rgba(255, 215, 106, 0.4)';
      pathLine(ctx, w, h, v, [leg.from, ...leg.vias, to.pos]);
    });
    ctx.setLineDash([]);
  } else if (snap.auto && snap.target) {
    const to = snap.geo.find((d) => d.id === snap.target);
    if (to) {
      ctx.setLineDash(small ? [3, 3] : [6, 5]);
      ctx.strokeStyle = 'rgba(255, 215, 106, 0.95)';
      ctx.lineWidth = small ? 1 : 1.6;
      pathLine(ctx, w, h, v, [snap.pos, ...snap.vias, to.pos]);
      ctx.setLineDash([]);
    }
  }

  // Bodies.
  const pts = destPoints(w, h, v, snap.geo);
  for (const p of pts) {
    if (p.id === 'edge') continue;
    const col = bodyColor(p.id);
    const detail = snap.geo.find((g) => g.id === p.id)?.kind;
    const r = Math.max(p.r, p.id === 'stars' ? 2.5 : small ? 2.6 : detail ? 3 : 4.5);
    if (p.id === 'sun') {
      const sg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 1.5);
      sg.addColorStop(0, 'rgba(255, 236, 190, 0.95)');
      sg.addColorStop(0.65, 'rgba(235, 154, 30, 0.85)');
      sg.addColorStop(1, 'rgba(235, 154, 30, 0)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = col;
      ctx.beginPath();
      if (detail === 'station') ctx.rect(p.x - r, p.y - r, r * 2, r * 2); else ctx.arc(p.x, p.y, r, 0, Math.PI * 2); // stations square, bodies round
      ctx.fill();
      ctx.strokeStyle = 'rgba(223, 233, 255, 0.75)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    if (!small || p.id !== 'stars') {
      placed.push([p.x - r, p.y - r, p.x + r, p.y + r]);
      if (o.full) names.push({ text: DEST_LABEL[p.id], x: p.x, y: p.y + Math.max(r, 4) + 10, font: `12px ${LABEL_FONT}`, color: 'rgba(223, 233, 255, 0.85)' });
    }
  }

  if (o.full && v.zoom >= 0.9) {
    for (const [id, r] of RING_NAMES) names.push({ text: (id === 'sun' ? 'Earth' : PLANET_NAME[id]).toUpperCase(), x: cx, y: cy + r * s + 8, font: `12px ${LABEL_FONT}`, color: 'rgba(150, 190, 255, 0.28)' });
    names.push({ text: 'STARS', x: cx, y: cy + zs + 8, font: `12px ${LABEL_FONT}`, color: 'rgba(150, 190, 255, 0.28)' });
  }
  if (o.full) placeNames();

  // Route stop numbers.
  if (o.full && snap.route.stops.length) {
    const seen = new Map<Dest, number[]>();
    snap.route.stops.forEach((d, i) => seen.set(d, [...(seen.get(d) ?? []), i + 1]));
    ctx.font = `bold 11px ${LABEL_FONT}`;
    for (const [d, ns] of seen) {
      const p = pts.find((x) => x.id === d);
      if (!p) continue; // a moon or station not drawn at this zoom
      const x = d === 'edge' ? p.x : p.x + Math.max(p.r, 4) + 9;
      const y = d === 'edge' ? p.y - p.r - 10 : p.y - Math.max(p.r, 4) - 4;
      const txt = ns.join(',');
      const tw = ctx.measureText(txt).width + 8;
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath(); ctx.roundRect(x - tw / 2, y - 8, tw, 16, 8); ctx.fill();
      ctx.fillStyle = '#2b2014';
      ctx.fillText(txt, x, y + 0.5);
    }
  }

  // Target and selection rings.
  const ring = (id: Dest, color: string, pulse: boolean) => {
    const p = pts.find((x) => x.id === id);
    if (!p) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (id === 'edge') { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke(); return; }
    const k = pulse ? 1 + 0.18 * (0.5 + 0.5 * Math.sin(o.time * 4)) : 1;
    ctx.beginPath(); ctx.arc(p.x, p.y, (Math.max(p.r, 4) + (small ? 4 : 7)) * k, 0, Math.PI * 2); ctx.stroke();
  };
  if (snap.target) ring(snap.target, '#ffd76a', true);
  if (o.selected) ring(o.selected, '#ffffff', false);

  // The ship, pointing along its heading as the map draws it.
  const [sx, sy] = S(mapXY(snap.pos));
  const r = len(snap.pos);
  const ahead = mapXY(add(snap.pos, scale(snap.fwd, Math.max(0.5 * COSMOS, r * 0.02))));
  const [ax, ay] = S(ahead);
  let ang = Math.atan2(ay - sy, ax - sx);
  if (Math.hypot(ax - sx, ay - sy) < 1e-6) ang = -Math.PI / 2;
  const L = small ? 7 : 11;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(ang);
  ctx.fillStyle = '#ffd76a';
  ctx.strokeStyle = '#2b2014';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(L, 0); ctx.lineTo(-L * 0.7, L * 0.6); ctx.lineTo(-L * 0.35, 0); ctx.lineTo(-L * 0.7, -L * 0.6); ctx.closePath();
  ctx.fill(); ctx.stroke();
  if (o.full) {
    ctx.strokeStyle = 'rgba(255, 215, 106, 0.6)';
    ctx.beginPath(); ctx.moveTo(L, 0); ctx.lineTo(L * 3.2, 0); ctx.stroke();
  }
  ctx.restore();

  if (o.full) {
    // Which way the nose points, marked on the rim.
    const { lon } = lonLatOf(snap.fwd);
    const a = (lon * Math.PI) / 180;
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    const tip = rim * 1.0;
    ctx.moveTo(cx + Math.cos(a) * tip, cy - Math.sin(a) * tip);
    const b1 = a + 0.025;
    const b2 = a - 0.025;
    ctx.lineTo(cx + Math.cos(b1) * (tip + 14), cy - Math.sin(b1) * (tip + 14));
    ctx.lineTo(cx + Math.cos(b2) * (tip + 14), cy - Math.sin(b2) * (tip + 14));
    ctx.closePath();
    ctx.fill();
  }
}

/** Size a canvas for the device's pixel ratio; returns its CSS size and a context drawing in CSS pixels. */
export function fitCanvas(c: HTMLCanvasElement, maxDpr = 2) {
  const w = c.clientWidth;
  const h = c.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }
  const ctx = c.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

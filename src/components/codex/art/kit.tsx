/**
 * Small helpers shared by the codex art: colour mixing, a seeded random for star fields, and a few repeated pieces.
 * Every drawing is plain SVG built from numbers, so it scales to any screen and costs nothing to load.
 */
import type { ReactNode } from 'react';

const hex = (c: string) => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

/** a → b by t (0..1). */
export const mix = (a: string, b: string, t: number) => {
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
};
export const lighten = (c: string, t: number) => mix(c, '#ffffff', t);
export const darken = (c: string, t: number) => mix(c, '#000000', t);

/** A deterministic random in [0, 1), so every drawing is the same on every load. */
export function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function Stars({ w, h, n, seed, color = '#ffffff', maxY }: { w: number; h: number; n: number; seed: number; color?: string; maxY?: number }) {
  const r = seeded(seed);
  const pts = Array.from({ length: n }, () => [r() * w, r() * (maxY ?? h), 0.3 + r() * 1.1, 0.35 + r() * 0.65]);
  return <g>{pts.map(([x, y, s, o], i) => <circle key={i} cx={x} cy={y} r={s} fill={color} opacity={o} />)}</g>;
}

/** A Greek key (meander) band, `n` units long, starting at (x, y), each unit `u` wide. */
export function Meander({ x, y, u, n, color, width = 1.6 }: { x: number; y: number; u: number; n: number; color: string; width?: number }) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = x + i * u;
    d += `M${a},${y + u * 0.8} L${a},${y} L${a + u * 0.8},${y} L${a + u * 0.8},${y + u * 0.6} L${a + u * 0.3},${y + u * 0.6} L${a + u * 0.3},${y + u * 0.3} L${a + u * 0.5},${y + u * 0.3} `;
    d += `M${a},${y + u * 0.8} L${a + u},${y + u * 0.8} `;
  }
  return <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="square" />;
}

/** A linear gradient from a list of stops (offset 0..1, colour, opacity?). */
export function Lin({ id, stops, x2 = 0, y2 = 1 }: { id: string; stops: [number, string, number?][]; x2?: number; y2?: number }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
      {stops.map(([o, c, a], i) => <stop key={i} offset={o} stopColor={c} stopOpacity={a ?? 1} />)}
    </linearGradient>
  );
}

export function Rad({ id, stops, cx = 0.5, cy = 0.5, r = 0.5 }: { id: string; stops: [number, string, number?][]; cx?: number; cy?: number; r?: number }) {
  return (
    <radialGradient id={id} cx={cx} cy={cy} r={r}>
      {stops.map(([o, c, a], i) => <stop key={i} offset={o} stopColor={c} stopOpacity={a ?? 1} />)}
    </radialGradient>
  );
}

/** Soft glow filter, for engines, seams and lamps. */
export function Glow({ id, blur = 3 }: { id: string; blur?: number }) {
  return (
    <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation={blur} result="b" />
      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  );
}

/** The painted frame every codex picture sits in: an accent border, a gold inner rule, and corner rosettes. */
export function Frame({ w, h, accent, gold = '#d8ad4a' }: { w: number; h: number; accent: string; gold?: string }) {
  const c = (x: number, y: number) => (
    <g transform={`translate(${x},${y})`}>
      <circle r={7} fill={accent} stroke={gold} strokeWidth={1.4} />
      <circle r={2.6} fill={gold} />
    </g>
  );
  return (
    <g pointerEvents="none">
      <rect x={3} y={3} width={w - 6} height={h - 6} rx={10} fill="none" stroke={accent} strokeWidth={6} />
      <rect x={9} y={9} width={w - 18} height={h - 18} rx={6} fill="none" stroke={gold} strokeWidth={1.2} opacity={0.9} />
      {c(9, 9)}{c(w - 9, 9)}{c(9, h - 9)}{c(w - 9, h - 9)}
    </g>
  );
}

/** An SVG that fills its box's width and keeps its shape. */
export function Art({ w, h, label, children }: { w: number; h: number; label: string; children: ReactNode }) {
  return (
    <svg className="codex-art" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} xmlns="http://www.w3.org/2000/svg">
      {children}
    </svg>
  );
}

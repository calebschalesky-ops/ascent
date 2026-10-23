/**
 * Each people's emblem or standard, 240 × 240. Marks follow ART-DIRECTION.md's "Markings" row: Earth's blue band,
 * the Moon's laurel ring, Mercury's gold chevron, Venus's filigree, Mars's red bar (here on a legion standard),
 * Jupiter's four-crown sigil, Saturn's painted eye. Original marks only.
 */
import { useId } from 'react';
import type { ReactNode } from 'react';
import type { NationId } from '../../../lib/nations';
import { peopleOf } from '../../../lib/races';
import { Art, Glow, Lin, Meander, Rad, Stars, darken, lighten } from './kit';

const S = 240, C = 120;

const ring = (n: number, r: number, f: (x: number, y: number, a: number, i: number) => ReactNode, a0 = -Math.PI / 2) =>
  Array.from({ length: n }, (_, i) => {
    const a = a0 + (i / n) * Math.PI * 2;
    return f(C + Math.cos(a) * r, C + Math.sin(a) * r, a, i);
  });

function Mark({ n, id }: { n: NationId; id: string }) {
  const p = peopleOf(n).palette;
  switch (n) {
    case 'earth': return (
      <g>
        <circle cx={C} cy={C} r={104} fill={p.accent} stroke="#c9a14a" strokeWidth={6} />
        <circle cx={C} cy={C} r={92} fill="none" stroke="#e8d08a" strokeWidth={1.4} />
        {ring(7, 80, (x, y, _a, i) => <path key={i} transform={`translate(${x},${y})`} d="M0,-7 L2,-2 L7,-2 L3,1.5 L4.5,7 L0,3.8 L-4.5,7 L-3,1.5 L-7,-2 L-2,-2 Z" fill="#ffffff" />)}
        <circle cx={C} cy={C} r={54} fill={`url(#${id}globe)`} stroke="#ffffff" strokeWidth={2.5} />
        {[-36, 0, 36].map((dx) => <ellipse key={dx} cx={C} cy={C} rx={Math.abs(dx) || 0.1} ry={54} fill="none" stroke="#ffffff" strokeWidth={1.3} opacity={0.85} />)}
        {[-30, 0, 30].map((dy) => <line key={dy} x1={C - Math.sqrt(54 * 54 - dy * dy)} y1={C + dy} x2={C + Math.sqrt(54 * 54 - dy * dy)} y2={C + dy} stroke="#ffffff" strokeWidth={1.3} opacity={0.85} />)}
        <path d="M30,150 Q120,190 210,150 L214,170 Q120,214 26,170 Z" fill="#c9a14a" stroke="#8a6a2a" strokeWidth={1.5} />
        <text x={C} y={180} textAnchor="middle" fontFamily="Georgia, serif" fontSize={15} fontWeight={700} fill="#1a2a44" letterSpacing={3}>METROPOLIS</text>
      </g>
    );
    case 'moon': return (
      <g>
        <circle cx={C} cy={C} r={106} fill={`url(#${id}field)`} stroke="#b8c0cc" strokeWidth={4} />
        <Stars w={S} h={S} n={30} seed={21} color="#cfe0ff" />
        {ring(30, 84, (x, y, a, i) => (
          <ellipse key={i} cx={x} cy={y} rx={10} ry={4} fill={i % 2 ? '#eef1f7' : '#b8c0cc'} stroke="#6a7486" strokeWidth={0.7}
            transform={`rotate(${(a * 180) / Math.PI + 90 + (i % 2 ? 25 : -25)} ${x} ${y})`} />
        ), -Math.PI / 2 + 0.2)}
        <path d={`M${C - 34},${C + 46} Q${C - 40},${C - 40} ${C},${C - 52} Q${C + 40},${C - 40} ${C + 34},${C + 46} Z`} fill={`url(#${id}stone)`} stroke="#8a8f9a" strokeWidth={1.5} />
        {[-24, -8, 8, 24].map((dx) => <path key={dx} d={`M${C + dx},${C - 44 + Math.abs(dx) * 0.4} Q${C + dx * 1.3},${C} ${C + dx * 1.1},${C + 44}`} fill="none" stroke="#2f5fc4" strokeWidth={1.6} />)}
        {[-30, -10, 10, 30].map((dy) => <path key={dy} d={`M${C - 36 + Math.abs(dy) * 0.3},${C + dy} Q${C},${C + dy + 6} ${C + 36 - Math.abs(dy) * 0.3},${C + dy}`} fill="none" stroke="#2f5fc4" strokeWidth={1.6} />)}
        <rect x={C - 46} y={C + 44} width={92} height={10} fill="#d8d3c8" stroke="#8a8f9a" />
      </g>
    );
    case 'mercury': return (
      <g>
        {ring(24, 0, (_x, _y, a, i) => <path key={i} d={`M${C},${C} L${C + Math.cos(a - 0.07) * 118},${C + Math.sin(a - 0.07) * 118} L${C + Math.cos(a + 0.07) * 118},${C + Math.sin(a + 0.07) * 118} Z`} fill="#ffcf3a" opacity={i % 2 ? 0.45 : 0.8} />)}
        <circle cx={C} cy={C} r={92} fill={`url(#${id}bronze)`} stroke="#e3c52c" strokeWidth={9} />
        <circle cx={C} cy={C} r={80} fill="none" stroke="#2a1a10" strokeWidth={1.5} />
        {ring(16, 86, (x, y, _a, i) => <circle key={i} cx={x} cy={y} r={2.6} fill="#fff1b0" />)}
        <path d={`M${C - 50},${C + 30} L${C},${C - 34} L${C + 50},${C + 30} L${C + 32},${C + 30} L${C},${C - 10} L${C - 32},${C + 30} Z`} fill="#e3c52c" stroke="#fff1b0" strokeWidth={1.5} />
      </g>
    );
    case 'venus': return (
      <g>
        <circle cx={C} cy={C} r={108} fill="#c9a227" />
        {ring(36, 101, (x, y, _a, i) => <circle key={i} cx={x} cy={y} r={3.4} fill="#fff7ea" stroke="#a8862a" strokeWidth={0.5} />)}
        <circle cx={C} cy={C} r={94} fill={`url(#${id}enamel)`} stroke="#fff3c0" strokeWidth={2} />
        {ring(8, 70, (x, y, a, i) => (
          <path key={i} d={`M${x},${y} q${Math.cos(a + 1.2) * 16},${Math.sin(a + 1.2) * 16} ${Math.cos(a) * 18},${Math.sin(a) * 18}`} fill="none" stroke="#e8c85a" strokeWidth={2.4} strokeLinecap="round" />
        ))}
        <path d={`M${C - 56},${C + 40} Q${C - 30},${C + 26} ${C},${C + 40} Q${C + 30},${C + 26} ${C + 56},${C + 40} Q${C + 40},${C + 60} ${C},${C + 56} Q${C - 40},${C + 60} ${C - 56},${C + 40} Z`} fill="#fff3d8" />
        <path d={`M${C - 34},${C + 30} L${C - 34},${C + 4} A34,34 0 0 1 ${C + 34},${C + 4} L${C + 34},${C + 30} Z`} fill="#c9a227" stroke="#fff3c0" strokeWidth={1.5} />
        <path d={`M${C - 22},${C + 4} A22,22 0 0 1 ${C + 22},${C + 4} Z`} fill="#3fdf9a" opacity={0.85} />
        {[-24, 0, 24].map((dx) => <path key={dx} d={`M${C + dx - 7},${C - 26 + Math.abs(dx) * 0.9} q7,-16 14,0 Z`} fill="#c9a227" stroke="#fff3c0" strokeWidth={1} />)}
        <line x1={C} y1={C - 46} x2={C} y2={C - 30} stroke="#fff3c0" strokeWidth={2} />
        <circle cx={C} cy={C - 48} r={4} fill="#fff3c0" />
      </g>
    );
    case 'mars': return (
      <g>
        <rect x={C - 3} y={20} width={6} height={210} fill="#6a4a1a" />
        <path d={`M${C},${18} L${C - 14},${44} L${C + 14},${44} Z`} fill="#b8862e" />
        <g fill="#9aa0a8" stroke="#3d4249" strokeWidth={1.4}>
          <path d={`M${C},${48} L${C - 12},${58} L${C - 70},${40} L${C - 92},${62} L${C - 60},${66} L${C - 80},${82} L${C - 40},${80} L${C - 14},${88} L${C},${100} L${C + 14},${88} L${C + 40},${80} L${C + 80},${82} L${C + 60},${66} L${C + 92},${62} L${C + 70},${40} L${C + 12},${58} Z`} />
          <path d={`M${C - 8},${46} L${C + 8},${46} L${C + 14},${36} L${C},${30} L${C - 6},${36} Z`} />
        </g>
        <path d={`M${C + 6},${36} L${C + 16},${38} L${C + 8},${42} Z`} fill="#b8862e" />
        <rect x={C - 56} y={104} width={112} height={8} fill="#6a4a1a" />
        <path d={`M${C - 52},${112} L${C + 52},${112} L${C + 52},${196} L${C + 40},${210} L${C + 26},${196} L${C + 13},${210} L${C},${196} L${C - 13},${210} L${C - 26},${196} L${C - 40},${210} L${C - 52},${196} Z`} fill={p.accent} stroke="#7a1018" strokeWidth={2} />
        <rect x={C - 52} y={124} width={104} height={8} fill="#e8e8ec" />
        <text x={C} y={168} textAnchor="middle" fontFamily="Georgia, serif" fontSize={24} fontWeight={700} fill="#f4efe6" letterSpacing={3}>S·P·Q·M</text>
        <rect x={C - 52} y={180} width={104} height={4} fill="#b8862e" />
      </g>
    );
    case 'jupiter': return (
      <g>
        <circle cx={C} cy={C} r={108} fill={`url(#${id}void)`} stroke="#4a2a78" strokeWidth={4} />
        {ring(4, 0, (_x, _y, a, i) => (
          <g key={i}>
            <path d={`M${C},${C} L${C + Math.cos(a - 0.32) * 38},${C + Math.sin(a - 0.32) * 38} L${C + Math.cos(a) * 98},${C + Math.sin(a) * 98} L${C + Math.cos(a + 0.32) * 38},${C + Math.sin(a + 0.32) * 38} Z`} fill={p.accent} stroke="#ff2fd0" strokeWidth={2} filter={`url(#${id}glow)`} />
            <path d={`M${C + Math.cos(a) * 30},${C + Math.sin(a) * 30} L${C + Math.cos(a) * 92},${C + Math.sin(a) * 92}`} stroke="#ff9ff0" strokeWidth={1.4} />
            {[-0.5, 0, 0.5].map((d) => {
              const x = C + Math.cos(a + d * 0.5) * (d === 0 ? 62 : 52), y = C + Math.sin(a + d * 0.5) * (d === 0 ? 62 : 52);
              return <circle key={d} cx={x} cy={y} r={2} fill="#ffd0ff" />;
            })}
          </g>
        ), -Math.PI / 4)}
        <circle cx={C} cy={C} r={24} fill="#24133a" stroke="#ff2fd0" strokeWidth={2.4} filter={`url(#${id}glow)`} />
        {ring(4, 0, (_x, _y, a, i) => <path key={i} d={`M${C + Math.cos(a) * 6},${C + Math.sin(a) * 6} L${C + Math.cos(a) * 18},${C + Math.sin(a) * 18}`} stroke="#d8dae6" strokeWidth={3} />)}
        <circle cx={C} cy={C} r={5} fill="#ff2fd0" />
      </g>
    );
    case 'saturn': return (
      <g>
        <circle cx={C} cy={C} r={108} fill={`url(#${id}night)`} stroke="#ffb347" strokeWidth={3} />
        {ring(22, 84, (x, y, a, i) => (
          <path key={i} d={`M${x},${y} l${Math.cos(a + 0.5) * 14},${Math.sin(a + 0.5) * 14} l${Math.cos(a) * 12},${Math.sin(a) * 12} Z`} fill={i % 2 ? '#4a47a0' : '#2a2850'} stroke="#8a87d0" strokeWidth={0.6} />
        ))}
        <ellipse cx={C} cy={C} rx={70} ry={40} fill="#f2e6cc" stroke="#1a1408" strokeWidth={3} />
        <circle cx={C} cy={C} r={34} fill={`url(#${id}iris)`} />
        <circle cx={C} cy={C} r={14} fill="#120a04" />
        <circle cx={C + 10} cy={C - 10} r={5} fill="#ffffff" />
        <path d={`M${C - 74},${C} Q${C},${C - 62} ${C + 74},${C}`} fill="none" stroke="#1a1408" strokeWidth={5} />
        {[-1, 1].map((s) => <path key={s} d={`M${C + s * 70},${C} q${s * 18},${-6} ${s * 28},${4}`} fill="none" stroke="#1a1408" strokeWidth={3} />)}
      </g>
    );
  }
}

export default function Emblem({ nation }: { nation: NationId }) {
  const id = 'e' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const people = peopleOf(nation);
  const p = people.palette;
  return (
    <Art w={S} h={S} label={`Emblem of the ${people.name}`}>
      <defs>
        <Rad id={`${id}bg`} stops={[[0, lighten(p.accent, 0.25)], [0.7, darken(p.accent, 0.35)], [1, darken(p.accent, 0.65)]]} />
        <Rad id={`${id}globe`} cx={0.38} cy={0.35} stops={[[0, '#9fd2ff'], [0.6, '#2f8a6a'], [1, '#1a4a6a']]} />
        <Rad id={`${id}field`} stops={[[0, '#3a6ad8'], [1, '#0c1e5a']]} />
        <Lin id={`${id}stone`} stops={[[0, '#ffffff'], [1, '#b8bcc6']]} />
        <Rad id={`${id}bronze`} cx={0.4} cy={0.35} stops={[[0, '#9a6a3a'], [0.7, '#5a3d22'], [1, '#2a1a10']]} />
        <Rad id={`${id}enamel`} cx={0.45} cy={0.4} stops={[[0, '#3fbf80'], [0.7, '#1d8f5c'], [1, '#0f4a33']]} />
        <Rad id={`${id}void`} stops={[[0, '#4a2a78'], [0.6, '#24133a'], [1, '#0a0412']]} />
        <Rad id={`${id}night`} stops={[[0, '#33307a'], [1, '#0a0a1a']]} />
        <Rad id={`${id}iris`} cx={0.4} cy={0.4} stops={[[0, '#ffe08a'], [0.6, '#ffb347'], [1, '#c06a10']]} />
        <Glow id={`${id}glow`} blur={2.5} />
      </defs>
      <rect width={S} height={S} rx={18} fill={`url(#${id}bg)`} />
      <Meander x={14} y={8} u={12} n={18} color={lighten(p.accent, 0.5)} width={1.2} />
      <Meander x={14} y={S - 18} u={12} n={18} color={lighten(p.accent, 0.5)} width={1.2} />
      <Mark n={nation} id={id} />
    </Art>
  );
}

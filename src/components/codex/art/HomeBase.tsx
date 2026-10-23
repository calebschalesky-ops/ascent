/**
 * Each people's home capital (races.ts `bases`, kind 'capital') in its world's real conditions, with its orbital
 * station overhead in the station style of ART-DIRECTION.md. 480 × 270.
 */
import { useId } from 'react';
import type { NationId } from '../../../lib/nations';
import { peopleOf } from '../../../lib/races';
import { Art, Frame, Glow, Lin, Rad, Stars, darken, seeded } from './kit';

const W = 480, H = 270;

function Scene({ n, id }: { n: NationId; id: string }) {
  switch (n) {
    case 'earth': {
      // Quito Skyport: the Andes, the city at the tether's foot, Pharos Station at the top.
      return (
        <g>
          <defs>
            <Lin id={`${id}sky`} stops={[[0, '#1a3a7a'], [0.45, '#5a9ad8'], [0.8, '#f2c890'], [1, '#e89a60']]} />
          </defs>
          <rect width={W} height={H} fill={`url(#${id}sky)`} />
          <Stars w={W} h={H} n={30} seed={3} maxY={60} />
          <line x1={300} y1={0} x2={300} y2={210} stroke="#ffffff" strokeWidth={2} />
          <line x1={300} y1={0} x2={300} y2={210} stroke="#9fd0ff" strokeWidth={8} opacity={0.25} />
          {[60, 110, 150].map((y) => <rect key={y} x={296} y={y} width={8} height={6} fill="#c9a14a" />)}
          <g transform="translate(300,34)">
            <ellipse rx={56} ry={14} fill="none" stroke="#b8c0cc" strokeWidth={5} />
            <ellipse rx={56} ry={14} fill="none" stroke="#3f7fd0" strokeWidth={1.5} strokeDasharray="5 4" />
            {[0, 1, 2, 3].map((k) => <line key={k} x1={0} y1={0} x2={Math.cos((k * Math.PI) / 2 + 0.4) * 56} y2={Math.sin((k * Math.PI) / 2 + 0.4) * 14} stroke="#b8c0cc" strokeWidth={2} />)}
            <circle r={7} fill="#c9a14a" />
          </g>
          <path d="M0,190 L50,140 L90,168 L150,96 L200,150 L240,128 L300,170 L360,110 L420,158 L480,130 L480,270 L0,270 Z" fill="#5a6a8a" />
          <path d="M150,96 L132,118 L146,114 L158,122 L170,112 Z M360,110 L344,128 L358,124 L372,130 Z" fill="#ffffff" />
          <path d="M0,215 L80,195 L170,206 L260,190 L340,204 L480,192 L480,270 L0,270 Z" fill="#3a5a4a" />
          {Array.from({ length: 30 }, (_, i) => {
            const r = seeded(i + 40), x = 200 + (i % 15) * 14 - 10, h = 10 + r() * 34, y = 214 - h + (i > 14 ? 12 : 0);
            return <g key={i}><rect x={x} y={y} width={11} height={h} fill={i > 14 ? '#2a3a5a' : '#3a4a6a'} />{h > 22 && <rect x={x + 3} y={y + 4} width={5} height={3} fill="#ffd890" />}</g>;
          })}
          <path d="M282,214 L300,180 L318,214 Z" fill="#c9a14a" stroke="#8a6a2a" />
          <rect x={0} y={232} width={W} height={38} fill="#2a4a3a" />
        </g>
      );
    }
    case 'moon': {
      // Pytho: colonnades cut into Copernicus's wall, the Hall of Answers open to the Earth.
      return (
        <g>
          <defs>
            <Rad id={`${id}e`} cx={0.38} cy={0.35} stops={[[0, '#9fd2ff'], [0.55, '#2f6fd0'], [1, '#0c2a6a']]} />
            <Lin id={`${id}rock`} stops={[[0, '#b8b6b0'], [1, '#6a6870']]} />
          </defs>
          <rect width={W} height={H} fill="#03040c" />
          <Stars w={W} h={H} n={110} seed={17} maxY={150} />
          <circle cx={360} cy={60} r={40} fill="#7fb0ff" opacity={0.18} />
          <circle cx={360} cy={60} r={28} fill={`url(#${id}e)`} />
          <path d="M346,50 q10,-8 20,-1 q6,5 0,9 q-12,2 -20,-8 Z" fill="#ffffff" opacity={0.8} />
          <g transform="translate(110,52)">
            {Array.from({ length: 8 }, (_, i) => <rect key={i} x={Math.cos((i / 8) * Math.PI * 2) * 22 - 1.5} y={-10} width={3} height={22} fill="#e6e3da" opacity={0.6 + 0.4 * Math.sin((i / 8) * Math.PI * 2)} />)}
            <ellipse cx={0} cy={-12} rx={24} ry={6} fill="#e6e3da" />
            <path d="M-12,-14 a12,10 0 0 1 24,0 Z" fill="#b8c0cc" />
            <ellipse cx={0} cy={13} rx={24} ry={5} fill="#d8d3c8" />
            <ellipse cx={0} cy={-26} rx={9} ry={3} fill="#c9cfdb" />
          </g>
          <path d="M0,120 L60,110 L140,128 L220,104 L300,120 L380,102 L480,118 L480,270 L0,270 Z" fill={`url(#${id}rock)`} />
          {Array.from({ length: 12 }, (_, i) => (
            <g key={i}>
              <rect x={60 + i * 30} y={150} width={7} height={80} fill="#f2efe6" />
              <rect x={56 + i * 30} y={146} width={15} height={5} fill="#d8d3c8" />
              <rect x={56 + i * 30} y={229} width={15} height={5} fill="#d8d3c8" />
              {i < 11 && <rect x={67 + i * 30} y={160} width={23} height={68} fill="#2a2a3a" opacity={0.75} />}
              {i < 11 && i % 3 === 1 && <rect x={72 + i * 30} y={190} width={13} height={20} fill="#ffe7a8" opacity={0.85} />}
            </g>
          ))}
          <path d="M52,146 L404,146 L228,118 Z" fill="#e6e3da" stroke="#b8c0cc" />
          <path d="M120,144 L336,144 L228,126 Z" fill="none" stroke="#2f5fc4" strokeWidth={1.5} />
          <rect x={0} y={234} width={W} height={36} fill="#8d8c94" />
          {[[40, 248, 14], [430, 254, 20], [300, 258, 9]].map(([x, y, r], i) => <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.3} fill="#6a6870" />)}
        </g>
      );
    }
    case 'mercury': {
      // Lakedaimon: the walking city on rails in the twilight band, the day behind it, the night ahead.
      return (
        <g>
          <defs>
            <Lin id={`${id}sky`} x2={1} y2={0} stops={[[0, '#fffbe6'], [0.12, '#ffcf3a'], [0.32, '#e05a1a'], [0.45, '#5a2a5a'], [0.6, '#1a1e48'], [1, '#05060f']]} />
            <Lin id={`${id}ground`} x2={1} y2={0} stops={[[0, '#c9a060'], [0.35, '#6a4a30'], [0.6, '#2a2028'], [1, '#0e0c14']]} />
          </defs>
          <rect width={W} height={H} fill={`url(#${id}sky)`} />
          <Stars w={W} h={H} n={60} seed={9} />
          <rect x={0} y={0} width={140} height={H} fill="#fff6d0" opacity={0.3} />
          <path d="M0,170 L480,170 L480,270 L0,270 Z" fill={`url(#${id}ground)`} />
          {[0, 1, 2].map((k) => <line key={k} x1={0} y1={226 + k * 10} x2={W} y2={226 + k * 10} stroke="#e3c52c" strokeWidth={2} opacity={0.6 - k * 0.15} />)}
          <g transform="translate(250,0)">
            <path d="M-170,210 L170,210 L180,224 L-180,224 Z" fill="#3a2614" stroke="#e3c52c" strokeWidth={1.5} />
            {Array.from({ length: 18 }, (_, i) => <circle key={i} cx={-165 + i * 19.4} cy={226} r={7} fill="#151210" stroke="#e3c52c" strokeWidth={1.2} />)}
            <path d="M-160,210 L-160,170 Q-80,150 0,156 Q80,150 160,170 L160,210 Z" fill="#5a3d22" stroke="#e3c52c" strokeWidth={1.5} />
            {Array.from({ length: 14 }, (_, i) => <rect key={i} x={-150 + i * 22} y={184} width={12} height={6} fill="#ffcf6a" opacity={0.9} />)}
            {[-100, -20, 70].map((x, i) => <path key={i} d={`M${x},158 a26,${16 + i * 3} 0 0 1 52,0 Z`} fill="#6a4524" stroke="#e3c52c" strokeWidth={1.2} />)}
            <path d="M-210,90 L-176,206 L-168,206 L-196,88 Z" fill="#cfd8e8" stroke="#ffffff" strokeWidth={1.5} />
            <path d="M-212,88 L-196,88" stroke="#ffffff" strokeWidth={2} />
          </g>
          <g transform="translate(400,58)">
            <ellipse rx={40} ry={8} fill="#5a3d22" stroke="#e3c52c" strokeWidth={2} />
            <path d="M-46,-4 L-56,-30 L-50,30 Z" fill="#e8f0ff" stroke="#ffffff" />
          </g>
        </g>
      );
    }
    case 'venus': {
      // Nephelokokkygia: a chandelier city under its envelope in the cloud sea.
      return (
        <g>
          <defs>
            <Lin id={`${id}sky`} stops={[[0, '#f6d48a'], [0.5, '#f2c070'], [0.8, '#e8d8a0'], [1, '#c8e0b0']]} />
            <Rad id={`${id}env`} cx={0.4} cy={0.35} stops={[[0, '#fff0b0'], [0.6, '#d8b030'], [1, '#8a6a1a']]} />
            <Rad id={`${id}glass`} cx={0.4} cy={0.3} stops={[[0, '#9fffd0'], [0.6, '#1d8f5c'], [1, '#0f4a33']]} />
          </defs>
          <rect width={W} height={H} fill={`url(#${id}sky)`} />
          {[[60, 220, 90], [200, 245, 110], [380, 228, 100], [460, 250, 70], [120, 80, 50], [400, 60, 60]].map(([x, y, s], i) => (
            <g key={i} fill="#fff7e0" opacity={0.75}>
              <ellipse cx={x} cy={y} rx={s} ry={s * 0.26} /><ellipse cx={x - s * 0.3} cy={y - s * 0.14} rx={s * 0.45} ry={s * 0.28} /><ellipse cx={x + s * 0.35} cy={y - s * 0.1} rx={s * 0.4} ry={s * 0.24} />
            </g>
          ))}
          <g transform="translate(240,0)">
            <ellipse cx={0} cy={46} rx={110} ry={36} fill={`url(#${id}env)`} stroke="#8a6a1a" strokeWidth={1.5} />
            {[-80, -40, 0, 40, 80].map((x) => <path key={x} d={`M${x},14 Q${x * 1.1},46 ${x},80`} fill="none" stroke="#a8862a" strokeWidth={1} />)}
            {[-90, -50, 50, 90, -20, 20].map((x) => <line key={x} x1={x * 0.9} y1={76} x2={x * 0.6} y2={112} stroke="#5a4a2a" strokeWidth={1.2} />)}
            <rect x={-80} y={112} width={160} height={10} fill="#c9a227" stroke="#8a6a1a" />
            <path d="M-80,122 L-60,170 L60,170 L80,122 Z" fill="#c9a227" stroke="#8a6a1a" />
            {Array.from({ length: 9 }, (_, i) => <rect key={i} x={-64 + i * 15} y={132} width={8} height={16} rx={4} fill="#1d8f5c" stroke="#fff3c0" strokeWidth={0.8} />)}
            <path d="M-40,112 a40,36 0 0 1 80,0 Z" fill={`url(#${id}glass)`} stroke="#c9a227" strokeWidth={2} />
            {[-64, 64].map((x) => <path key={x} d={`M${x - 12},112 q12,-34 24,0 Z`} fill="#c9a227" stroke="#8a6a1a" />)}
            <path d="M0,76 L0,62" stroke="#c9a227" strokeWidth={2} />
            <path d="M-60,170 L-30,200 L30,200 L60,170 Z" fill="#a8862a" />
            <path d="M-30,200 L0,224 L30,200 Z" fill="#8a6a1a" />
            <circle cx={0} cy={230} r={4} fill="#1dbf6c" />
          </g>
          <g transform="translate(70,40) scale(0.5)" opacity={0.85}>
            <ellipse cx={0} cy={0} rx={50} ry={18} fill="#c9a227" />
            <path d="M-36,40 a36,30 0 0 1 72,0 Z" fill="#1d8f5c" />
            <line x1={-30} y1={14} x2={-20} y2={40} stroke="#5a4a2a" /><line x1={30} y1={14} x2={20} y2={40} stroke="#5a4a2a" />
            <rect x={-40} y={40} width={80} height={8} fill="#c9a227" />
          </g>
        </g>
      );
    }
    case 'mars': {
      // Urbs Arsia: arches in the lava tubes of Arsia Mons, lit through a skylight; the aqueduct; Castra Phobos above.
      return (
        <g>
          <defs>
            <Lin id={`${id}sky`} stops={[[0, '#b06a40'], [0.6, '#e0aa74'], [1, '#e8c094']]} />
            <Lin id={`${id}rock`} stops={[[0, '#9a5232'], [1, '#4a2014']]} />
          </defs>
          <rect width={W} height={H} fill={`url(#${id}sky)`} />
          <path d="M60,130 L240,40 L420,130 Z" fill="#a85a36" />
          <path d="M200,60 L240,40 L280,60 Q240,70 200,60 Z" fill="#7a3a22" />
          <g transform="translate(380,40)">
            <path d="M-36,8 L36,8 L24,-4 L-24,-4 Z" fill="#8a8f96" stroke="#5d6269" />
            <rect x={-5} y={-16} width={10} height={12} fill="#5d6269" />
            <rect x={-12} y={-20} width={24} height={4} fill="#8a8f96" />
            {[-26, -14, -2, 10, 22].map((x) => <rect key={x} x={x} y={2} width={4} height={2} fill="#ffffff" />)}
          </g>
          <ellipse cx={90} cy={34} rx={9} ry={6} fill="#8a7a6a" />
          <path d="M0,130 L480,130 L480,270 L0,270 Z" fill={`url(#${id}rock)`} />
          <path d="M150,130 Q240,108 330,130 Z" fill="#3a1a10" />
          <path d="M150,130 L330,130 L300,270 L180,270 Z" fill="#ffd8a8" opacity={0.18} />
          {Array.from({ length: 7 }, (_, i) => (
            <g key={i}>
              <path d={`M${20 + i * 64},250 L${20 + i * 64},196 A26,26 0 0 1 ${72 + i * 64},196 L${72 + i * 64},250`} fill="#3a1a10" stroke="#c48a5a" strokeWidth={5} />
              <rect x={30 + i * 64} y={214} width={32} height={20} fill="#ffcf8a" opacity={i % 2 ? 0.7 : 0.4} />
            </g>
          ))}
          <rect x={0} y={170} width={W} height={10} fill="#c48a5a" />
          {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${i * 40},170 l0,-14 a20,14 0 0 1 40,0 l0,14`} fill="none" stroke="#b07a4a" strokeWidth={4} />)}
          <rect x={0} y={152} width={W} height={5} fill="#7fb4e8" opacity={0.85} />
          {[110, 240, 370].map((x) => (
            <g key={x} transform={`translate(${x},146)`}>
              <line x1={0} y1={0} x2={0} y2={-30} stroke="#b8862e" strokeWidth={2} />
              <rect x={-9} y={-26} width={18} height={14} fill="#cc2131" />
              <rect x={-9} y={-22} width={18} height={3} fill="#ffffff" />
            </g>
          ))}
          <rect x={0} y={250} width={W} height={20} fill="#3a1a10" />
        </g>
      );
    }
    case 'jupiter': {
      // Kallistopolis: ice palaces in the Valhalla basin, statues of the founders, Jupiter overhead.
      return (
        <g>
          <defs>
            <Lin id={`${id}sky`} stops={[[0, '#05020c'], [1, '#24104a']]} />
            <clipPath id={`${id}j`}><circle cx={150} cy={-10} r={170} /></clipPath>
            <Rad id={`${id}dome`} cx={0.4} cy={0.3} stops={[[0, '#d8e8ff', 0.7], [1, '#7a9ad8', 0.35]]} />
          </defs>
          <rect width={W} height={H} fill={`url(#${id}sky)`} />
          <Stars w={W} h={H} n={60} seed={31} />
          <g clipPath={`url(#${id}j)`}>
            {['#e8d8b8', '#c9925a', '#f0e2c8', '#a8643a', '#ead6b0', '#b8784a', '#f2e6d0', '#9a5a36'].map((c, i) => <rect key={i} x={-30} y={-180 + i * 24} width={360} height={25} fill={c} />)}
            <ellipse cx={90} cy={60} rx={26} ry={12} fill="#c0442a" />
          </g>
          <circle cx={150} cy={-10} r={170} fill="none" stroke="#ffd8a0" strokeWidth={2} opacity={0.4} />
          <g transform="translate(400,46)">
            <ellipse rx={22} ry={6} fill="#24133a" stroke="#ff2fd0" strokeWidth={1.2} />
            {[-16, -6, 6, 16].map((x, i) => <path key={i} d={`M${x - 3},-3 L${x * 1.3},${-26 - (i === 1 || i === 2 ? 6 : 0)} L${x + 3},-3 Z`} fill="#4a2a78" stroke="#ff2fd0" strokeWidth={0.8} />)}
          </g>
          <path d="M0,170 Q120,150 240,166 T480,160 L480,270 L0,270 Z" fill="#cfd8ea" />
          {[[120, 200, 60], [360, 214, 46]].map(([x, y, r], i) => <ellipse key={i} cx={x} cy={y} rx={r * 2} ry={r * 0.32} fill="none" stroke="#9aa6c4" strokeWidth={3} />)}
          <path d="M150,176 a90,70 0 0 1 180,0 Z" fill={`url(#${id}dome)`} stroke="#d8e8ff" strokeWidth={1.5} />
          {Array.from({ length: 7 }, (_, i) => (
            <g key={i}>
              <path d={`M${178 + i * 20},176 L${178 + i * 20},${132 - (i === 3 ? 22 : i % 2 ? 6 : 12)} L${184 + i * 20},${126 - (i === 3 ? 26 : i % 2 ? 8 : 14)} L${190 + i * 20},${132 - (i === 3 ? 22 : i % 2 ? 6 : 12)} L${190 + i * 20},176 Z`} fill="#24133a" stroke="#ff2fd0" strokeWidth={1} />
              <rect x={181 + i * 20} y={150} width={6} height={4} fill="#c08aff" />
            </g>
          ))}
          {[60, 100, 380, 420].map((x, i) => (
            <g key={x} transform={`translate(${x},${172 - (i % 2) * 4})`}>
              <rect x={-8} y={0} width={16} height={8} fill="#9aa6c4" />
              <path d="M-4,0 L-4,-26 L-7,-36 L0,-44 L7,-36 L4,-26 L4,0 Z" fill="#c8d0e0" />
              <path d="M-5,-44 L-3,-50 L0,-46 L3,-50 L5,-44 Z" fill="#7442ad" />
            </g>
          ))}
          <path d="M0,230 Q120,220 240,232 T480,228 L480,270 L0,270 Z" fill="#9aa6c4" />
        </g>
      );
    }
    case 'saturn': {
      // Astu on Kraken Mare: towers to jump from, the Pnyx above a methane sea, citizens flying to the assembly.
      return (
        <g>
          <defs>
            <Lin id={`${id}sky`} stops={[[0, '#6a2e10'], [0.45, '#c8702a'], [0.75, '#e8a050'], [1, '#c87a3a']]} />
            <Lin id={`${id}sea`} stops={[[0, '#3a2a1a'], [1, '#0e0a08']]} />
          </defs>
          <rect width={W} height={H} fill={`url(#${id}sky)`} />
          <ellipse cx={240} cy={120} rx={300} ry={60} fill="#f6c070" opacity={0.25} />
          <path d="M0,176 L480,176 L480,270 L0,270 Z" fill={`url(#${id}sea)`} />
          {Array.from({ length: 8 }, (_, k) => <line key={k} x1={20 + k * 14} y1={190 + k * 10} x2={460 - k * 20} y2={190 + k * 10} stroke="#e8a050" strokeWidth={1} opacity={0.3} />)}
          <path d="M0,176 L40,150 L120,146 L170,170 L0,182 Z" fill="#2a1a10" />
          <path d="M280,176 L330,128 L420,122 L480,140 L480,180 Z" fill="#2a1a10" />
          <g transform="translate(370,122)">
            <path d="M-40,0 L40,0 L36,-6 L-36,-6 Z" fill="#16161e" />
            {[-30, -15, 0, 15, 30].map((x) => <rect key={x} x={x - 1.5} y={-26} width={3} height={20} fill="#2a2850" />)}
            <rect x={-38} y={-30} width={76} height={5} fill="#16161e" />
            <rect x={-6} y={-12} width={12} height={6} fill="#ffb347" />
          </g>
          {[60, 100, 200, 240].map((x, i) => (
            <g key={x}>
              <rect x={x - 4} y={60 + i * 10} width={8} height={120 - i * 10} fill="#16161e" />
              <rect x={x - 14} y={54 + i * 10} width={28} height={7} fill="#2a2850" />
              {[0, 1, 2, 3].map((k) => <circle key={k} cx={x} cy={80 + i * 10 + k * 22} r={2} fill="#ffb347" />)}
            </g>
          ))}
          {[[140, 70, 1], [300, 50, 0.8], [180, 110, 0.7], [420, 80, 0.9]].map(([x, y, s], i) => (
            <g key={i} transform={`translate(${x},${y}) scale(${s})`}>
              <path d="M-22,-2 L-2,-8 L0,-4 L2,-8 L22,-2 L2,0 L-2,0 Z" fill="#2a2850" stroke="#ffb347" strokeWidth={0.8} />
              <circle cx={0} cy={-6} r={2} fill="#1a1208" />
              <line x1={0} y1={-4} x2={0} y2={6} stroke="#1a1208" strokeWidth={1.6} />
            </g>
          ))}
          <g transform="translate(240,180)">
            <rect x={-60} y={0} width={120} height={8} fill="#2a2018" />
            {Array.from({ length: 8 }, (_, i) => <rect key={i} x={-44 + i * 12} y={-6} width={8} height={6} fill="#ffb347" opacity={0.75} />)}
          </g>
        </g>
      );
    }
  }
}

export default function HomeBase({ nation }: { nation: NationId }) {
  const id = 'h' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const people = peopleOf(nation);
  const capital = people.bases.find((b) => b.kind === 'capital')!;
  return (
    <Art w={W} h={H} label={`${capital.name}, home of the ${people.name}`}>
      <defs><Glow id={`${id}glow`} /></defs>
      <Scene n={nation} id={id} />
      <rect x={14} y={H - 40} width={Math.min(W - 28, 24 + capital.name.length * 11)} height={26} rx={4} fill={darken(people.palette.accent, 0.45)} opacity={0.85} />
      <text x={26} y={H - 22} fontFamily="Georgia, serif" fontSize={16} fill="#f6efd8" letterSpacing={1}>{capital.name}</text>
      <Frame w={W} h={H} accent={people.palette.accent} />
    </Art>
  );
}

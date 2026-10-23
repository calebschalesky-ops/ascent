/**
 * A portrait of a typical person of each people, drawn in SVG: their home sky behind them, the body their world gave
 * them (LORE.md "Bodies"), and the dress of the codex description. 300 × 380.
 */
import { useId } from 'react';
import type { NationId } from '../../../lib/nations';
import { peopleOf } from '../../../lib/races';
import { Art, Frame, Glow, Lin, Meander, Rad, Stars, darken, lighten, mix } from './kit';

const W = 300, H = 380, CX = 150;

interface Face {
  cy: number; rx: number; ry: number; // head
  neckW: number; shY: number; sw: number; // neck width, shoulder line, half shoulder width
  eyeW: number; eyeH: number; iris: number; irisColor: string; // eyes
  hair: string; rim: string; // hair colour, the light from their sky on one side of the face
}

const FACE: Record<NationId, Face> = {
  earth: { cy: 172, rx: 46, ry: 57, neckW: 36, shY: 288, sw: 118, eyeW: 10, eyeH: 5.5, iris: 4.6, irisColor: '#5a3a1e', hair: '#22160f', rim: '#ffd9a0' },
  moon: { cy: 150, rx: 39, ry: 66, neckW: 25, shY: 292, sw: 96, eyeW: 10, eyeH: 5.5, iris: 4.6, irisColor: '#4f78c8', hair: '#dfe4ee', rim: '#a9c8ff' },
  mercury: { cy: 178, rx: 44, ry: 55, neckW: 36, shY: 292, sw: 112, eyeW: 9.5, eyeH: 4.8, iris: 4.4, irisColor: '#b8860b', hair: '#120c08', rim: '#ffcf4a' },
  venus: { cy: 185, rx: 39, ry: 50, neckW: 28, shY: 292, sw: 100, eyeW: 10, eyeH: 5.6, iris: 4.6, irisColor: '#2e8a5a', hair: '#3a2214', rim: '#fff0b0' },
  mars: { cy: 168, rx: 42, ry: 60, neckW: 34, shY: 290, sw: 116, eyeW: 11, eyeH: 6.2, iris: 5.4, irisColor: '#2a1a12', hair: '#1c120c', rim: '#9fd0ff' },
  jupiter: { cy: 162, rx: 38, ry: 62, neckW: 24, shY: 292, sw: 98, eyeW: 15, eyeH: 10, iris: 9, irisColor: '#8a4ad0', hair: '#e4e0ee', rim: '#ff9a5a' },
  saturn: { cy: 168, rx: 44, ry: 58, neckW: 36, shY: 290, sw: 112, eyeW: 14, eyeH: 9.5, iris: 8.6, irisColor: '#1e1408', hair: '#4a3a2c', rim: '#ffb347' },
};

function Backdrop({ n, id }: { n: NationId; id: string }) {
  switch (n) {
    case 'earth': return (
      <g>
        <defs>
          <Lin id={`${id}s`} stops={[[0, '#4f8fd8'], [0.55, '#9cc7ec'], [0.85, '#f4d8a8'], [1, '#f0b878']]} />
          <Rad id={`${id}sun`} stops={[[0, '#fff8e0'], [0.3, '#ffe7a8', 0.8], [1, '#ffe7a8', 0]]} />
        </defs>
        <rect width={W} height={H} fill={`url(#${id}s)`} />
        <circle cx={70} cy={250} r={90} fill={`url(#${id}sun)`} />
        {[[40, 70, 50], [190, 110, 64], [250, 60, 38]].map(([x, y, s], i) => (
          <g key={i} fill="#ffffff" opacity={0.75}>
            <ellipse cx={x} cy={y} rx={s} ry={s * 0.28} /><ellipse cx={x + s * 0.3} cy={y - s * 0.16} rx={s * 0.5} ry={s * 0.3} />
          </g>
        ))}
        <path d="M0,300 L40,255 L75,282 L120,232 L160,270 L205,226 L250,268 L300,240 L300,380 L0,380 Z" fill="#5b6f8f" opacity={0.85} />
        <path d="M0,320 L55,292 L110,310 L170,285 L230,305 L300,290 L300,380 L0,380 Z" fill="#3e5070" />
        <line x1={238} y1={0} x2={238} y2={300} stroke="#ffffff" strokeWidth={1.5} opacity={0.9} />
        <line x1={238} y1={0} x2={238} y2={300} stroke="#bfe0ff" strokeWidth={5} opacity={0.25} />
      </g>
    );
    case 'moon': return (
      <g>
        <defs>
          <Lin id={`${id}s`} stops={[[0, '#03040c'], [1, '#141a36']]} />
          <Rad id={`${id}e`} cx={0.38} cy={0.35} stops={[[0, '#9fd2ff'], [0.55, '#2f6fd0'], [1, '#0c2a6a']]} />
          <Rad id={`${id}eh`} stops={[[0.6, '#7fb0ff', 0.5], [1, '#7fb0ff', 0]]} />
        </defs>
        <rect width={W} height={H} fill={`url(#${id}s)`} />
        <Stars w={W} h={H} n={70} seed={11} maxY={260} />
        <circle cx={232} cy={78} r={52} fill={`url(#${id}eh)`} />
        <circle cx={232} cy={78} r={36} fill={`url(#${id}e)`} />
        <path d="M210,64 q12,-10 26,-2 q10,6 2,12 q-14,4 -28,-10 Z M222,96 q14,-4 24,4 q-6,8 -22,2 Z" fill="#ffffff" opacity={0.8} />
        <path d="M232,42 a36,36 0 0 1 0,72 a26,36 0 0 0 0,-72 Z" fill="#000010" opacity={0.45} />
        {Array.from({ length: 9 }, (_, i) => (
          <g key={i}>
            <rect x={8 + i * 34} y={222} width={7} height={140} fill="#e9e6dc" opacity={0.85} />
            <rect x={5 + i * 34} y={216} width={13} height={6} fill="#cfcac0" />
          </g>
        ))}
        <rect x={0} y={208} width={W} height={9} fill="#d8d3c8" opacity={0.85} />
        <rect x={0} y={330} width={W} height={50} fill="#8d8c94" />
      </g>
    );
    case 'mercury': return (
      <g>
        <defs>
          <Lin id={`${id}s`} x2={1} y2={0} stops={[[0, '#fffbe6'], [0.18, '#ffcf3a'], [0.42, '#e05a1a'], [0.5, '#7a2a4a'], [0.62, '#24204e'], [1, '#070a1f']]} />
          <Rad id={`${id}sun`} stops={[[0, '#ffffff'], [0.35, '#fff1b0'], [1, '#ffcf3a', 0]]} />
        </defs>
        <rect width={W} height={H} fill={`url(#${id}s)`} />
        <Stars w={W} h={H} n={36} seed={7} />
        <rect x={0} y={0} width={110} height={H} fill="#fff6d0" opacity={0.25} />
        <circle cx={-10} cy={250} r={130} fill={`url(#${id}sun)`} />
        <path d="M0,318 L300,318 L300,380 L0,380 Z" fill="#2a1a12" />
        <path d="M0,318 L300,318" stroke="#ffcf3a" strokeWidth={2} />
        {[0, 1, 2].map((k) => <line key={k} x1={0} y1={334 + k * 14} x2={W} y2={334 + k * 14} stroke="#8a6a3a" strokeWidth={2.5} opacity={0.8} />)}
      </g>
    );
    case 'venus': return (
      <g>
        <defs>
          <Lin id={`${id}s`} stops={[[0, '#f9e2a0'], [0.45, '#efc070'], [0.75, '#d8d49a'], [1, '#9fcfa8']]} />
        </defs>
        <rect width={W} height={H} fill={`url(#${id}s)`} />
        {[[30, 90, 60], [240, 70, 70], [150, 40, 50], [60, 300, 90], [260, 320, 80]].map(([x, y, s], i) => (
          <g key={i} fill="#fff7e0" opacity={0.6}>
            <ellipse cx={x} cy={y} rx={s} ry={s * 0.3} /><ellipse cx={x - s * 0.3} cy={y - s * 0.15} rx={s * 0.45} ry={s * 0.3} /><ellipse cx={x + s * 0.35} cy={y - s * 0.12} rx={s * 0.4} ry={s * 0.26} />
          </g>
        ))}
        {[[48, 160, 0.8], [252, 150, 1]].map(([x, y, s], i) => (
          <g key={i} transform={`translate(${x},${y}) scale(${s})`} opacity={0.85}>
            <ellipse cx={0} cy={-34} rx={20} ry={12} fill="#c9a227" />
            <line x1={0} y1={-22} x2={0} y2={-8} stroke="#8a6a1a" strokeWidth={1.5} />
            <path d="M-16,0 a16,14 0 0 1 32,0 Z" fill="#1d8f5c" />
            <rect x={-18} y={0} width={36} height={6} fill="#c9a227" />
          </g>
        ))}
      </g>
    );
    case 'mars': return (
      <g>
        <defs>
          <Lin id={`${id}s`} stops={[[0, '#c9875a'], [0.6, '#e2b07a'], [0.82, '#e7c49a'], [1, '#9a5a3a']]} />
          <Rad id={`${id}sun`} stops={[[0, '#ffffff'], [0.2, '#cfeaff'], [0.6, '#7fb4e8', 0.55], [1, '#7fb4e8', 0]]} />
        </defs>
        <rect width={W} height={H} fill={`url(#${id}s)`} />
        <circle cx={232} cy={262} r={70} fill={`url(#${id}sun)`} />
        <circle cx={60} cy={60} r={6} fill="#d8c8b0" opacity={0.9} />
        <path d="M0,270 L60,250 L120,262 L190,240 L300,262 L300,380 L0,380 Z" fill="#8a4a2e" />
        {Array.from({ length: 6 }, (_, i) => (
          <path key={i} d={`M${i * 54 - 6},300 l0,-30 a22,22 0 0 1 44,0 l0,30 Z`} fill="none" stroke="#6a3420" strokeWidth={5} />
        ))}
        <rect x={0} y={262} width={W} height={8} fill="#6a3420" />
        <rect x={0} y={300} width={W} height={80} fill="#5a2a1a" />
      </g>
    );
    case 'jupiter': return (
      <g>
        <defs>
          <Lin id={`${id}s`} stops={[[0, '#05020c'], [1, '#2a1350']]} />
          <clipPath id={`${id}j`}><circle cx={250} cy={70} r={150} /></clipPath>
        </defs>
        <rect width={W} height={H} fill={`url(#${id}s)`} />
        <Stars w={W} h={H} n={50} seed={5} />
        <g clipPath={`url(#${id}j)`}>
          {['#e8d8b8', '#c9925a', '#f0e2c8', '#a8643a', '#ead6b0', '#b8784a', '#f2e6d0', '#9a5a36', '#e2c8a0', '#c08050'].map((c, i) => (
            <rect key={i} x={90} y={-80 + i * 30} width={320} height={31} fill={c} />
          ))}
          <ellipse cx={200} cy={130} rx={34} ry={16} fill="#c0442a" />
          <ellipse cx={200} cy={130} rx={22} ry={9} fill="#d8603a" />
        </g>
        <circle cx={250} cy={70} r={150} fill="none" stroke="#ffd8a0" strokeWidth={3} opacity={0.35} />
        <path d="M0,318 Q80,300 150,316 T300,308 L300,380 L0,380 Z" fill="#cfd8ea" />
        <path d="M0,340 Q90,326 160,340 T300,336 L300,380 L0,380 Z" fill="#9aa6c4" />
      </g>
    );
    case 'saturn': return (
      <g>
        <defs>
          <Lin id={`${id}s`} stops={[[0, '#7a3a14'], [0.4, '#d07a2e'], [0.75, '#e8a050'], [1, '#2a1a10']]} />
        </defs>
        <rect width={W} height={H} fill={`url(#${id}s)`} />
        <ellipse cx={150} cy={120} rx={260} ry={50} fill="#f0b060" opacity={0.25} />
        {[30, 60, 250, 280].map((x, i) => (
          <g key={i}>
            <rect x={x - 3} y={110 + i * 14} width={6} height={230} fill="#2a1408" />
            <rect x={x - 12} y={104 + i * 14} width={24} height={8} fill="#2a1408" />
            <circle cx={x} cy={100 + i * 14} r={2.5} fill="#ffb347" />
          </g>
        ))}
        <path d="M0,300 L300,300 L300,380 L0,380 Z" fill="#1a1210" />
        {[0, 1, 2, 3].map((k) => <line key={k} x1={10 + k * 30} y1={312 + k * 16} x2={290 - k * 20} y2={312 + k * 16} stroke="#e8a050" strokeWidth={1.2} opacity={0.35} />)}
        <path d="M200,40 l14,6 l-14,4 l4,-5 Z M90,70 l12,5 l-12,3 l3,-4 Z" fill="#2a1408" />
      </g>
    );
  }
}

/** Things behind the head and shoulders: hair falling, wings, high collars. */
function Behind({ n, f, p }: { n: NationId; f: Face; p: { cloth: string; accent: string; glow: string } }) {
  switch (n) {
    case 'moon':
      return <path d={`M${CX - f.rx - 8},${f.cy - 20} C${CX - f.rx - 14},${f.cy + 80} ${CX - f.rx - 18},${f.shY} ${CX - f.rx - 24},${f.shY + 30} L${CX + f.rx + 24},${f.shY + 30} C${CX + f.rx + 18},${f.shY} ${CX + f.rx + 14},${f.cy + 80} ${CX + f.rx + 8},${f.cy - 20} Z`} fill={f.hair} />;
    case 'jupiter':
      return (
        <g>
          <ellipse cx={CX} cy={f.cy - f.ry - 18} rx={30} ry={26} fill={f.hair} />
          <path d={`M${CX - 70},${f.shY + 10} L${CX - 92},${f.shY - 70} L${CX - 40},${f.shY - 10} Z M${CX + 70},${f.shY + 10} L${CX + 92},${f.shY - 70} L${CX + 40},${f.shY - 10} Z`} fill={darken(p.cloth, 0.3)} stroke={p.glow} strokeWidth={1.6} />
        </g>
      );
    case 'saturn':
      return (
        <g>
          {[-1, 1].map((s) => (
            <g key={s}>
              <path d={`M${CX + s * 40},${f.shY - 10} L${CX + s * 138},${f.cy - 110} L${CX + s * 150},${f.cy - 40} L${CX + s * 128},${f.shY + 60} Z`} fill="#2a2850" opacity={0.92} stroke="#ffb347" strokeWidth={1.4} />
              {[0.25, 0.5, 0.75].map((t) => (
                <line key={t} x1={CX + s * 40} y1={f.shY - 10} x2={CX + s * (138 + 12 * t)} y2={f.cy - 110 + (f.shY + 170 - f.cy) * t} stroke="#5a58a0" strokeWidth={1.2} />
              ))}
              <circle cx={CX + s * 138} cy={f.cy - 110} r={3} fill="#ffb347" />
            </g>
          ))}
        </g>
      );
    case 'mars':
      return <path d={`M${CX - f.sw + 4},380 L${CX - f.sw + 18},${f.shY + 4} L${CX + f.sw - 18},${f.shY + 4} L${CX + f.sw - 4},380 Z`} fill={darken(p.cloth, 0.25)} />;
    default:
      return null;
  }
}

/** The clothing on the shoulders. */
function Dress({ n, f, p, id }: { n: NationId; f: Face; p: { cloth: string; accent: string; glow: string; hull: string; panel: string }; id: string }) {
  const bust = `M${CX - f.sw},${H} C${CX - f.sw},${f.shY + 20} ${CX - f.sw * 0.72},${f.shY} ${CX},${f.shY - 6} C${CX + f.sw * 0.72},${f.shY} ${CX + f.sw},${f.shY + 20} ${CX + f.sw},${H} Z`;
  const base = <path d={bust} fill={`url(#${id}cloth)`} />;
  switch (n) {
    case 'earth':
      return (
        <g>
          {base}
          <ellipse cx={CX} cy={f.shY - 2} rx={f.neckW * 0.85} ry={9} fill="#c9a14a" stroke="#8a6a2a" strokeWidth={1.5} />
          <path d={`M${CX - f.sw + 20},${f.shY + 30} L${CX - f.sw + 64},${f.shY + 6} L${CX - f.sw + 70},${f.shY + 18} L${CX - f.sw + 26},${f.shY + 44} Z`} fill={p.accent} />
          <circle cx={CX + 54} cy={f.shY + 46} r={14} fill={p.accent} stroke="#c9a14a" strokeWidth={2} />
          <circle cx={CX + 54} cy={f.shY + 46} r={8} fill="none" stroke="#ffffff" strokeWidth={1.4} />
          <line x1={CX + 46} y1={f.shY + 46} x2={CX + 62} y2={f.shY + 46} stroke="#ffffff" strokeWidth={1} />
          <line x1={CX} y1={f.shY + 6} x2={CX} y2={H} stroke="#1a2a44" strokeWidth={2} />
        </g>
      );
    case 'moon':
      return (
        <g>
          {base}
          <path d={`M${CX - 34},${f.shY - 4} L${CX},${f.shY + 60} L${CX + 34},${f.shY - 4}`} fill="none" stroke={p.accent} strokeWidth={7} />
          <path d={`M${CX - 34},${f.shY - 4} L${CX},${f.shY + 60} L${CX + 34},${f.shY - 4}`} fill="none" stroke="#d8ad4a" strokeWidth={1.2} />
          {[-60, -40, 40, 60].map((dx) => <line key={dx} x1={CX + dx} y1={f.shY + 20} x2={CX + dx * 1.2} y2={H} stroke={darken(p.cloth, 0.12)} strokeWidth={2} />)}
          <rect x={CX - f.sw + 10} y={H - 22} width={2 * f.sw - 20} height={14} fill={p.accent} />
          <Meander x={CX - f.sw + 14} y={H - 20} u={10} n={Math.floor((2 * f.sw - 28) / 10)} color="#e6e3da" width={1.3} />
        </g>
      );
    case 'mercury':
      return (
        <g>
          {base}
          <path d={`M${CX - 50},${f.shY + 6} Q${CX},${f.shY + 30} ${CX + 50},${f.shY + 6} L${CX + 44},${H} L${CX - 44},${H} Z`} fill="#6a4524" stroke="#e3c52c" strokeWidth={2} />
          <path d={`M${CX - 26},${f.shY + 60} L${CX},${f.shY + 40} L${CX + 26},${f.shY + 60}`} fill="none" stroke="#e3c52c" strokeWidth={6} strokeLinejoin="round" />
          <circle cx={CX - f.sw + 40} cy={f.shY + 14} r={11} fill="#e3c52c" stroke="#5a3d22" strokeWidth={2} />
          {[-1, 1].map((s) => <path key={s} d={`M${CX + s * f.sw * 0.95},${H} Q${CX + s * f.sw * 0.7},${f.shY + 60} ${CX + s * 56},${f.shY + 6}`} fill="none" stroke={darken(p.cloth, 0.3)} strokeWidth={3} />)}
        </g>
      );
    case 'venus':
      return (
        <g>
          {base}
          <path d={`M${CX - f.sw + 8},${f.shY + 40} Q${CX},${f.shY + 4} ${CX + f.sw - 8},${f.shY + 40} L${CX + f.sw - 4},${f.shY + 62} Q${CX},${f.shY + 26} ${CX - f.sw + 4},${f.shY + 62} Z`} fill="#c9a227" />
          <path d={`M${CX - 30},${f.shY + 4} L${CX - 10},${H} L${CX + 10},${H} L${CX + 30},${f.shY + 4}`} fill="#c9a227" stroke="#8a6a1a" strokeWidth={1} />
          {Array.from({ length: 9 }, (_, i) => {
            const t = i / 8, x = CX - f.sw + 20 + t * (2 * f.sw - 40);
            const y = f.shY + 40 - Math.sin(t * Math.PI) * 28 + 10;
            return <circle key={i} cx={x} cy={y} r={4} fill={i % 2 ? '#c0302a' : '#1d8f5c'} stroke="#fff3c0" strokeWidth={1} />;
          })}
          {[0, 1, 2, 3].map((k) => <rect key={k} x={CX - 5} y={f.shY + 40 + k * 16} width={10} height={10} fill={k % 2 ? '#c0302a' : '#1d8f5c'} stroke="#fff3c0" strokeWidth={1} transform={`rotate(45 ${CX} ${f.shY + 45 + k * 16})`} />)}
        </g>
      );
    case 'mars':
      return (
        <g>
          {base}
          {[0, 1, 2, 3].map((k) => (
            <g key={k}>
              <path d={`M${CX - f.sw + 14 + k * 4},${f.shY + 14 + k * 13} Q${CX - f.sw * 0.55},${f.shY - 4 + k * 13} ${CX - 40},${f.shY + 6 + k * 13}`} fill="none" stroke="#9aa0a8" strokeWidth={10} />
              <path d={`M${CX + f.sw - 14 - k * 4},${f.shY + 14 + k * 13} Q${CX + f.sw * 0.55},${f.shY - 4 + k * 13} ${CX + 40},${f.shY + 6 + k * 13}`} fill="none" stroke="#9aa0a8" strokeWidth={10} />
            </g>
          ))}
          <path d={`M${CX - 40},${f.shY + 8} L${CX + 40},${f.shY + 8} L${CX + 36},${H} L${CX - 36},${H} Z`} fill="#6d7279" />
          {[0, 1, 2, 3, 4].map((k) => <line key={k} x1={CX - 38} y1={f.shY + 24 + k * 16} x2={CX + 38} y2={f.shY + 24 + k * 16} stroke="#4d5259" strokeWidth={2} />)}
          <path d={`M${CX + 20},${f.shY + 4} Q${CX + f.sw * 0.7},${f.shY + 30} ${CX + f.sw},${H} L${CX + f.sw * 0.55},${H} Q${CX + 40},${f.shY + 60} ${CX + 10},${f.shY + 10} Z`} fill={p.cloth} />
          <circle cx={CX + 28} cy={f.shY + 12} r={12} fill="#b8862e" stroke="#6a4a1a" strokeWidth={2} />
          <rect x={CX + 20} y={f.shY + 9} width={16} height={6} fill={p.accent} />
        </g>
      );
    case 'jupiter':
      return (
        <g>
          {base}
          <path d={`M${CX - 46},${f.shY - 4} L${CX - 64},${f.shY - 52} L${CX - 26},${f.shY - 4} Z M${CX + 46},${f.shY - 4} L${CX + 64},${f.shY - 52} L${CX + 26},${f.shY - 4} Z`} fill={darken(p.cloth, 0.1)} stroke={p.glow} strokeWidth={1.6} />
          <path d={`M${CX - f.sw + 12},${f.shY + 40} L${CX},${f.shY + 4} L${CX + f.sw - 12},${f.shY + 40}`} fill="none" stroke={p.glow} strokeWidth={2.2} filter={`url(#${id}glow)`} />
          <path d={`M${CX},${f.shY + 4} L${CX - 14},${f.shY + 30} L${CX},${f.shY + 56} L${CX + 14},${f.shY + 30} Z`} fill="#c8c8d8" stroke={p.glow} strokeWidth={1.2} />
          <circle cx={CX} cy={f.shY + 30} r={5} fill={p.accent} />
        </g>
      );
    case 'saturn':
      return (
        <g>
          {base}
          <path d={`M${CX - f.sw + 26},${f.shY + 30} L${CX + f.sw - 26},${f.shY + 30}`} stroke="#ffb347" strokeWidth={3} />
          <path d={`M${CX - 50},${f.shY + 30} L${CX - 30},${H} M${CX + 50},${f.shY + 30} L${CX + 30},${H}`} stroke="#8a6a4a" strokeWidth={6} />
          {Array.from({ length: 26 }, (_, i) => {
            const t = i / 25, x = CX - 70 + t * 140, y = f.shY - 4 + Math.sin(t * Math.PI) * 10;
            return <path key={i} d={`M${x - 6},${y + 18} L${x},${y - 10} L${x + 6},${y + 18} Z`} fill={i % 2 ? '#8a7258' : '#a88c6a'} />;
          })}
        </g>
      );
  }
}

/** Things worn on or over the head, drawn over the face. */
function Headwear({ n, f, p, id }: { n: NationId; f: Face; p: { cloth: string; accent: string; glow: string; hull: string }; id: string }) {
  const top = f.cy - f.ry;
  switch (n) {
    case 'earth':
      return (
        <g>
          <path d={`M${CX - f.rx - 6},${f.cy} A${f.rx + 6},${f.ry + 8} 0 0 1 ${CX + f.rx + 6},${f.cy}`} fill="none" stroke="#2a2f38" strokeWidth={5} />
          <rect x={CX + f.rx - 2} y={f.cy - 8} width={13} height={24} rx={5} fill="#3a3f48" stroke="#c9a14a" strokeWidth={1.5} />
          <path d={`M${CX + f.rx + 4},${f.cy + 14} Q${CX + f.rx},${f.cy + 44} ${CX + 18},${f.cy + 40}`} fill="none" stroke="#2a2f38" strokeWidth={3} />
          <circle cx={CX + 16} cy={f.cy + 40} r={4} fill="#3a3f48" />
        </g>
      );
    case 'moon':
      return (
        <g>
          {Array.from({ length: 16 }, (_, i) => {
            const a = Math.PI + (i / 15) * Math.PI, x = CX + Math.cos(a) * (f.rx + 4), y = f.cy - f.ry * 0.42 + Math.sin(a) * 14;
            return <ellipse key={i} cx={x} cy={y} rx={8} ry={3.4} fill={i % 2 ? '#e6eaf2' : '#b8c0cc'} stroke="#7a8496" strokeWidth={0.6} transform={`rotate(${(a * 180) / Math.PI + (i < 8 ? -30 : 30)} ${x} ${y})`} />;
          })}
          <circle cx={CX} cy={f.cy - f.ry * 0.52} r={4} fill={p.accent} stroke="#e6eaf2" strokeWidth={1.2} />
        </g>
      );
    case 'mercury':
      return (
        <g>
          <defs><Lin id={`${id}mask`} x2={1} y2={0} stops={[[0, '#fff6d0'], [0.4, '#e3c52c'], [0.6, '#ffffff'], [1, '#b88a1a']]} /></defs>
          <path d={`M${CX - f.rx - 6},${f.cy - 4} C${CX - f.rx - 8},${top - 30} ${CX + f.rx + 8},${top - 30} ${CX + f.rx + 6},${f.cy - 4} L${CX + f.rx + 2},${f.cy + 24} L${CX + f.rx - 10},${f.cy + 24} L${CX + f.rx - 8},${f.cy - 22} L${CX - f.rx + 8},${f.cy - 22} L${CX - f.rx + 10},${f.cy + 24} L${CX - f.rx - 2},${f.cy + 24} Z`} fill="#6a4524" stroke="#e3c52c" strokeWidth={2} />
          <path d={`M${CX - f.rx + 2},${f.cy - 28} Q${CX},${f.cy - 40} ${CX + f.rx - 2},${f.cy - 28} L${CX + f.rx - 4},${f.cy - 44} Q${CX},${f.cy - 58} ${CX - f.rx + 4},${f.cy - 44} Z`} fill={`url(#${id}mask)`} stroke="#5a3d22" strokeWidth={1} />
          <path d={`M${CX - 70},${top + 8} C${CX - 60},${top - 60} ${CX + 60},${top - 60} ${CX + 70},${top + 8} L${CX + 56},${top + 2} C${CX + 40},${top - 36} ${CX - 40},${top - 36} ${CX - 56},${top + 2} Z`} fill="#a8432a" stroke="#e3c52c" strokeWidth={1.6} />
          {Array.from({ length: 11 }, (_, i) => {
            const t = i / 10, x = CX - 62 + t * 124, y = top + 4 - Math.sin(t * Math.PI) * 40;
            return <line key={i} x1={x} y1={y} x2={x * 0.98 + CX * 0.02} y2={y + 14} stroke="#6a1a10" strokeWidth={1.4} />;
          })}
        </g>
      );
    case 'venus':
      return (
        <g>
          <path d={`M${CX - f.rx - 4},${f.cy - 10} C${CX - f.rx - 6},${top - 18} ${CX + f.rx + 6},${top - 18} ${CX + f.rx + 4},${f.cy - 10} L${CX + f.rx + 30},${f.shY + 40} L${CX - f.rx - 30},${f.shY + 40} Z`} fill="#3fbf80" opacity={0.28} />
          <rect x={CX - f.rx - 2} y={f.cy - f.ry * 0.62} width={2 * f.rx + 4} height={11} rx={3} fill="#c9a227" stroke="#8a6a1a" strokeWidth={1} />
          {[-0.6, -0.2, 0.2, 0.6].map((t) => <circle key={t} cx={CX + t * f.rx} cy={f.cy - f.ry * 0.62 + 5.5} r={3.4} fill={t > -0.3 && t < 0.3 ? '#c0302a' : '#1d8f5c'} />)}
          {[-1, 1].map((s) => (
            <g key={s}>
              {Array.from({ length: 6 }, (_, k) => <circle key={k} cx={CX + s * (f.rx + 4)} cy={f.cy - f.ry * 0.5 + k * 10} r={3.2} fill="#fff7ea" stroke="#d8c8a8" strokeWidth={0.6} />)}
              <circle cx={CX + s * (f.rx + 4)} cy={f.cy - f.ry * 0.5 + 62} r={4.6} fill="#1d8f5c" stroke="#c9a227" strokeWidth={1.2} />
            </g>
          ))}
        </g>
      );
    case 'mars':
      return null;
    case 'jupiter':
      return (
        <g>
          <path d={`M${CX - f.rx - 2},${f.cy - f.ry * 0.5} Q${CX},${f.cy - f.ry * 0.62} ${CX + f.rx + 2},${f.cy - f.ry * 0.5} L${CX + f.rx},${f.cy - f.ry * 0.38} Q${CX},${f.cy - f.ry * 0.5} ${CX - f.rx},${f.cy - f.ry * 0.38} Z`} fill="#d8dae6" stroke="#8a8aa0" strokeWidth={1} />
          {[-0.7, -0.25, 0.25, 0.7].map((t, i) => {
            const x = CX + t * f.rx, y = f.cy - f.ry * 0.56 - (1 - Math.abs(t)) * 4;
            return (
              <g key={i}>
                <path d={`M${x - 6},${y + 4} L${x},${y - 24 - (i === 1 || i === 2 ? 8 : 0)} L${x + 6},${y + 4} Z`} fill="#e8eaf4" stroke="#8a8aa0" strokeWidth={1} />
                <circle cx={x} cy={y} r={3.6} fill={p.glow} filter={`url(#${id}glow)`} />
              </g>
            );
          })}
        </g>
      );
    case 'saturn':
      return (
        <g>
          <circle cx={CX} cy={f.cy - f.ry * 0.55} r={11} fill="#f2e6cc" stroke="#ffb347" strokeWidth={3} />
          <circle cx={CX} cy={f.cy - f.ry * 0.55} r={5} fill="#ffb347" />
          <circle cx={CX} cy={f.cy - f.ry * 0.55} r={2.2} fill="#1a1008" />
          {[-1, 1].map((s) => <path key={s} d={`M${CX + s * 12},${f.cy - f.ry * 0.55} Q${CX + s * 28},${f.cy - f.ry * 0.72} ${CX + s * 38},${f.cy - f.ry * 0.5}`} fill="none" stroke="#ffb347" strokeWidth={2} />)}
        </g>
      );
  }
}

function Hair({ n, f, bare = false }: { n: NationId; f: Face; bare?: boolean }) {
  const top = f.cy - f.ry;
  const cap = (depth: number, extra = 0) =>
    `M${CX - f.rx - 2 - extra},${f.cy - 4} C${CX - f.rx - 4 - extra},${top - 14 - extra} ${CX + f.rx + 4 + extra},${top - 14 - extra} ${CX + f.rx + 2 + extra},${f.cy - 4} C${CX + f.rx - 6},${f.cy - f.ry * depth} ${CX - f.rx + 6},${f.cy - f.ry * depth} ${CX - f.rx - 2 - extra},${f.cy - 4} Z`;
  switch (n) {
    case 'earth': return <path d={cap(0.62)} fill={f.hair} />;
    case 'moon': return <path d={cap(0.58)} fill={f.hair} />;
    case 'mercury': return bare ? <path d={cap(0.82)} fill={f.hair} /> : null; // cropped close; the helm covers it
    case 'venus': return <path d={cap(0.6, 2)} fill={f.hair} />;
    case 'mars': return <path d={cap(0.72)} fill={f.hair} />;
    case 'jupiter': return <path d={cap(0.66)} fill={f.hair} />;
    case 'saturn': return (
      <g>
        <path d={cap(0.6, 8)} fill={f.hair} />
        {Array.from({ length: 14 }, (_, i) => {
          const a = Math.PI + (i / 13) * Math.PI, x = CX + Math.cos(a) * (f.rx + 8), y = f.cy - 6 + Math.sin(a) * (f.ry + 8);
          return <path key={i} d={`M${x},${y} l${Math.cos(a) * 10},${Math.sin(a) * 10}`} stroke={f.hair} strokeWidth={5} strokeLinecap="round" />;
        })}
      </g>
    );
  }
}

function Eyes({ n, f, id }: { n: NationId; f: Face; id: string }) {
  const ey = f.cy + f.ry * 0.04;
  const dx = f.rx * 0.43;
  return (
    <g>
      {[-1, 1].map((s) => {
        const x = CX + s * dx;
        return (
          <g key={s}>
            <ellipse cx={x} cy={ey} rx={f.eyeW} ry={f.eyeH} fill="#fbf8f2" />
            <clipPath id={`${id}eye${s}`}><ellipse cx={x} cy={ey} rx={f.eyeW} ry={f.eyeH} /></clipPath>
            <g clipPath={`url(#${id}eye${s})`}>
              <circle cx={x} cy={ey} r={f.iris} fill={f.irisColor} />
              <circle cx={x} cy={ey} r={f.iris * 0.45} fill="#0a0608" />
              <circle cx={x + f.iris * 0.35} cy={ey - f.iris * 0.35} r={Math.max(1.2, f.iris * 0.22)} fill="#ffffff" />
              {n === 'mercury' && <rect x={x - f.eyeW} y={ey - f.eyeH} width={f.eyeW * 2} height={f.eyeH * 0.9} fill="#d8e8ff" opacity={0.35} />}
              {n === 'saturn' && <circle cx={x} cy={ey} r={f.iris * 0.75} fill="none" stroke="#ffb347" strokeWidth={1.2} opacity={0.8} />}
            </g>
            <path d={`M${x - f.eyeW - 1},${ey} Q${x},${ey - f.eyeH * 1.7} ${x + f.eyeW + 1},${ey}`} fill="none" stroke="#1a100a" strokeWidth={1.8} />
            <path d={`M${x - f.eyeW - 2},${ey - f.eyeH - 7} Q${x},${ey - f.eyeH - 12} ${x + f.eyeW + 2},${ey - f.eyeH - 6}`} fill="none" stroke={n === 'moon' || n === 'jupiter' ? '#a8a8b8' : '#2a1a10'} strokeWidth={2.6} strokeLinecap="round" />
          </g>
        );
      })}
    </g>
  );
}

/**
 * A person's own look (the opening's avatar, lib/opening/profile.ts): skin, hair, eye and cloth colours, and whether
 * the people's headwear is worn. Without it, the codex's typical person.
 */
export interface PortraitLook { skin: string; hair: string; iris: string; cloth: string; headwear: boolean }

export default function Portrait({ nation, look, label }: { nation: NationId; look?: PortraitLook; label?: string }) {
  const id = 'p' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const people = peopleOf(nation);
  const p = look ? { ...people.palette, skin: look.skin, cloth: look.cloth } : people.palette;
  const f0 = look ? { ...FACE[nation], hair: look.hair, irisColor: look.iris } : FACE[nation];
  const f = { ...f0, shY: Math.min(f0.shY, Math.round(f0.cy + f0.ry + 26)) };
  const skinLight = lighten(p.skin, 0.14), skinDark = darken(p.skin, 0.28);
  const neckTop = f.cy + f.ry * 0.6;
  const mouthY = f.cy + f.ry * 0.62;
  const noseY = f.cy + f.ry * 0.4;
  const lip = mix(darken(p.skin, 0.3), '#a03a3a', 0.35);
  return (
    <Art w={W} h={H} label={label ?? `A ${people.demonym}`}>
      <defs>
        <Rad id={`${id}skin`} cx={0.42} cy={0.42} r={0.62} stops={[[0, skinLight], [0.7, p.skin], [1, skinDark]]} />
        <Lin id={`${id}neck`} stops={[[0, skinDark], [0.5, p.skin], [1, skinDark]]} x2={1} y2={0} />
        <Lin id={`${id}cloth`} stops={[[0, lighten(p.cloth, 0.12)], [1, darken(p.cloth, 0.35)]]} />
        <Glow id={`${id}glow`} blur={2.4} />
      </defs>
      <Backdrop n={nation} id={id} />
      <g transform={`translate(${CX},${H}) scale(1.14) translate(${-CX},${-H})`}>
      <Behind n={nation} f={f} p={p} />
      <rect x={CX - f.neckW / 2} y={neckTop} width={f.neckW} height={f.shY - neckTop + 6} fill={`url(#${id}neck)`} />
      <Dress n={nation} f={f} p={p} id={id} />
      {[-1, 1].map((s) => <ellipse key={s} cx={CX + s * (f.rx - 1)} cy={f.cy + 6} rx={7} ry={13} fill={skinDark} />)}
      <ellipse cx={CX} cy={f.cy} rx={f.rx} ry={f.ry} fill={`url(#${id}skin)`} />
      <clipPath id={`${id}rim`}><rect x={CX + f.rx * 0.35} y={0} width={W} height={H} /></clipPath>
      <ellipse cx={CX} cy={f.cy} rx={f.rx - 1.5} ry={f.ry - 1.5} fill="none" stroke={f.rim} strokeWidth={4} opacity={0.5} clipPath={`url(#${id}rim)`} />
      <Hair n={nation} f={f} bare={look?.headwear === false} />
      <Eyes n={nation} f={f} id={id} />
      <path d={`M${CX},${f.cy + f.ry * 0.12} L${CX - 6},${noseY} Q${CX},${noseY + 5} ${CX + 6},${noseY - 1}`} fill="none" stroke={skinDark} strokeWidth={2} strokeLinecap="round" />
      <path d={`M${CX - 13},${mouthY} Q${CX},${mouthY + 5} ${CX + 13},${mouthY}`} fill="none" stroke={lip} strokeWidth={3} strokeLinecap="round" />
      {[-1, 1].map((s) => <ellipse key={s} cx={CX + s * f.rx * 0.55} cy={f.cy + f.ry * 0.36} rx={9} ry={5} fill="#d0605a" opacity={0.18} />)}
      {look?.headwear !== false && <Headwear n={nation} f={f} p={p} id={id} />}
      </g>
      <Frame w={W} h={H} accent={p.accent} />
    </Art>
  );
}

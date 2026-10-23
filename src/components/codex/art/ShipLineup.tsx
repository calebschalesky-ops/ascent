/**
 * Each people's ship line-up: capital ship, cruiser, fighter and race-only extra, drawn from the accepted model sheets
 * (art-refit/refs/ships, notes in art-refit/03-SHIPS.md) and the engine colours in ART-DIRECTION.md: side views, but
 * the Velite and the Glaux from above, where their shape reads. A strip along the bottom shows their true lengths
 * against one another. 480 × 320.
 *
 * Every hull is drawn in its own units: tail at x 0, nose at x 100, centred on y 0.
 */
import { useId } from 'react';
import type { ReactNode } from 'react';
import type { NationId } from '../../../lib/nations';
import type { ClassKind, ShipClass } from '../../../lib/races';
import { peopleOf } from '../../../lib/races';
import { Art, Frame, Glow, Lin, darken, lighten } from './kit';

const W = 480, H = 320;

/** Engine plume colours, ART-DIRECTION.md "Engine plumes and lit seams". */
const PLUME: Record<NationId, [string, string, number, number]> = { // core, tail, length, width
  earth: ['#ffffff', '#2659ff', 26, 6],
  moon: ['#ffffff', '#9ab8ff', 12, 9],
  mercury: ['#fff6d0', '#ffb000', 14, 10],
  venus: ['#e8fff0', '#1dbf6c', 34, 7],
  mars: ['#ffffff', '#bfefff', 12, 3],
  jupiter: ['#ffd0ff', '#8a2be2', 22, 6],
  saturn: ['#fff0d0', '#ff8a1e', 44, 2.5],
};

const ns = { vectorEffect: 'non-scaling-stroke' as const };

function Plume({ n, x = 0, y = 0, k = 1, id }: { n: NationId; x?: number; y?: number; k?: number; id: string }) {
  const [, , len, wid] = PLUME[n];
  return <ellipse cx={x - (len * k) / 2} cy={y} rx={(len * k) / 2} ry={(wid * k) / 2} fill={`url(#${id}plume)`} filter={`url(#${id}glow)`} />;
}

type Draw = (id: string) => ReactNode;

const SHAPES: Record<NationId, Record<ClassKind, Draw>> = {
  earth: {
    capital: (id) => (
      // Side view of the sheet: turned hull with three bands, carrier deck with hangar hood, turrets, island and mast.
      <g stroke="#3a2a10" strokeWidth={1} {...ns}>
        {[-5, 5].map((y) => <Plume key={y} n="earth" x={1} y={y} id={id} />)}
        <rect x={0} y={-9} width={7} height={18} fill="#3a3f48" />
        <path d="M44,3 L64,3 L70,6 L48,6 Z" fill="#c9a14a" />
        <path d="M6,-10 L84,-10 Q100,-9 100,0 Q100,9 84,10 L6,10 Z" fill={`url(#${id}brass)`} />
        {[[24, '#3a3f48'], [50, '#3f7fd0'], [76, '#3a3f48']].map(([x, c]) => <rect key={x} x={x as number} y={-10.6} width={5} height={21.2} fill={c as string} />)}
        {[-1.5, 3].map((y) => Array.from({ length: 14 }, (_, i) => 10 + i * 5.4).filter((x) => Math.abs(x - 26.5) > 4 && Math.abs(x - 52.5) > 4 && Math.abs(x - 78.5) > 4).map((x) => <rect key={`${y}${x}`} x={x} y={y} width={1.4} height={1.4} fill="#ffe7a8" stroke="none" />))}
        {[24, 50, 76].map((x) => <rect key={x} x={x - 1} y={-12} width={6} height={2} fill="#3a3f48" />)}
        <rect x={4} y={-14.5} width={88} height={2.6} fill="#3a3f48" />
        <rect x={82} y={-14.5} width={10} height={6} fill="#3a3f48" />
        <rect x={90} y={-13} width={2} height={3} fill="#ffe7a8" stroke="none" />
        {[34, 66].map((x) => <g key={x}><path d={`M${x - 3},-14.5 A3,3 0 0 1 ${x + 3},-14.5 Z`} fill="#c9a14a" /><path d={`M${x + 2},-16 L${x + 8},-16.4`} strokeWidth={1.2} /></g>)}
        <rect x={18} y={-21} width={9} height={6.5} fill="#c9a14a" />
        <rect x={18} y={-19} width={9} height={1.6} fill="#1c2a4a" stroke="none" />
        <path d="M23,-21 L23,-29" />
        <circle cx={23} cy={-29.5} r={1.4} fill="#9fd0ff" stroke="none" filter={`url(#${id}glow)`} />
      </g>
    ),
    cruiser: (id) => (
      // Side view: the flattened cigar, gunmetal band, long blue canopy, nacelle under the wing root, V fins.
      <g stroke="#3a2a10" strokeWidth={1} {...ns}>
        <Plume n="earth" x={14} y={8} id={id} />
        <path d="M10,-6 L3,-16 L7,-16 L18,-6 Z" fill="#3a3f48" />
        <path d="M8,-7 C40,-11 80,-9 100,0 C80,9 40,10 8,7 Q2,0 8,-7 Z" fill={`url(#${id}brass)`} />
        <rect x={44} y={-9.6} width={8} height={19.2} fill="#3a3f48" />
        <path d="M54,-8 Q70,-14 90,-5 L56,-5.6 Z" fill="#1c3a7a" />
        <path d="M30,1 L64,1" strokeWidth={1.4} />
        <rect x={18} y={5} width={38} height={6} rx={2} fill="#3a3f48" />
        <rect x={54} y={4.6} width={3} height={6.8} fill="#c9a14a" />
        <path d="M18,5 L14,3.5 L14,12.5 L18,11 Z" fill="#3a3f48" />
        <circle cx={6} cy={-16.5} r={1.3} fill="#ffffff" stroke="none" />
      </g>
    ),
    fighter: (id) => (
      // Side view: brass body, blue band near the nose, bubble canopy, gunmetal fin and tailplane, gun under the wing.
      <g stroke="#3a2a10" strokeWidth={1} {...ns}>
        <Plume n="earth" x={4} id={id} k={1.6} />
        <path d="M8,-8 L0,-26 L8,-26 L28,-8 Z" fill="#3a3f48" />
        <path d="M6,-9 C40,-13 82,-11 100,0 C82,11 40,12 6,9 Q0,0 6,-9 Z" fill={`url(#${id}brass)`} />
        <rect x={76} y={-10.5} width={4} height={21} fill="#3f7fd0" />
        <path d="M46,-10.5 Q58,-21 70,-10 Z" fill="#cfe6ff" opacity={0.85} />
        <path d="M4,2 L-4,6 L12,6 L18,2 Z" fill="#3a3f48" />
        <path d="M30,2 L60,2 L54,6 L34,6 Z" fill="#3a3f48" />
        <rect x={44} y={7} width={18} height={2.4} fill="#3a3f48" />
        <rect x={2} y={-6} width={5} height={12} fill="#3a3f48" />
      </g>
    ),
    special: (id) => (
      // Side view of the sheet: the fat banded brass hull, the habitat ring edge-on at mid-hull with its lit inner
      // face, the bridge dome, the docking bay under the bow, three bells.
      <g stroke="#3a2a10" strokeWidth={1} {...ns}>
        <Plume n="earth" x={4} id={id} k={1.4} />
        <rect x={0} y={-10} width={8} height={20} fill="#3a3f48" />
        <path d="M8,-16 C30,-26 80,-24 96,-8 Q100,0 96,8 C80,24 30,26 8,16 Z" fill={`url(#${id}brass)`} />
        {[30, 66, 80].map((x) => <rect key={x} x={x} y={-21} width={4} height={42} fill="#3a3f48" />)}
        <path d="M70,14 L84,14 L86,20 L72,20 Z" fill="#3a3f48" />
        <rect x={74} y={15} width={8} height={3} fill="#ffe7a8" stroke="none" />
        <path d="M96,-5 A5,5 0 0 1 96,5 Z" fill="#1c3a7a" />
        <rect x={46} y={-36} width={8} height={72} rx={2} fill="#3a3f48" />
        <rect x={47} y={-34} width={2} height={68} fill="#ffe7a8" stroke="none" />
        <rect x={52} y={-34} width={1.4} height={68} fill="#c9a14a" stroke="none" />
        {[-36, 36].map((y) => <circle key={y} cx={50} cy={y} r={1.8} fill="#9fd0ff" stroke="none" filter={`url(#${id}glow)`} />)}
      </g>
    ),
  },
  moon: {
    capital: (id) => (
      // Side view of the second sheet: a spearhead warship with a silver ram, the treasury on its spine, six mirror
      // turrets down the flank, a keel blade and the ring engines at the stern.
      <g stroke="#7a8496" strokeWidth={0.8} {...ns}>
        <Plume n="moon" x={0} id={id} />
        {[[-6, 5], [0, 7], [6, 5]].map(([y, r]) => <ellipse key={y} cx={3} cy={y} rx={2.6} ry={r} fill={`url(#${id}silver)`} />)}
        <ellipse cx={1.6} cy={0} rx={1.4} ry={5} fill="#9ab8ff" filter={`url(#${id}glow)`} stroke="none" />
        <path d="M20,6 L70,4 L58,11 L30,10 Z" fill={`url(#${id}silver)`} />
        <path d="M6,-7 L60,-6 L88,-2 L88,2 L60,4 L6,6.5 Z" fill="#e6e3da" />
        <path d="M6,-7 L60,-6 L88,-2 L88,-0.6 L6,-3 Z" fill={`url(#${id}silver)`} opacity={0.55} stroke="none" />
        <path d="M88,-1.8 L100,0 L88,1.8 Z" fill={`url(#${id}silver)`} />
        <path d="M8,1 L88,0.4" stroke="#2f5fc4" strokeWidth={1.2} />
        <rect x={26} y={-8} width={40} height={2} fill={`url(#${id}silver)`} />
        {Array.from({ length: 9 }, (_, i) => <rect key={i} x={28.5 + i * 4.3} y={-15} width={1.5} height={7} fill="#f6f4ee" />)}
        <rect x={27} y={-16.6} width={38} height={1.8} fill="#f6f4ee" />
        <rect x={27} y={-18.6} width={38} height={2} fill={`url(#${id}silver)`} />
        <path d="M70,-4.4 L74,-9 L83,-8 L87,-2.6 Z" fill="#e6e3da" />
        <rect x={75} y={-7.6} width={7} height={1.6} fill="#9ab8ff" stroke="none" />
        {Array.from({ length: 6 }, (_, i) => (
          <g key={i}>
            <circle cx={16 + i * 8.6} cy={0.6} r={3.2} fill={`url(#${id}silver)`} />
            <circle cx={16 + i * 8.6} cy={0.6} r={1.2} fill="#9ab8ff" stroke="none" filter={`url(#${id}glow)`} />
          </g>
        ))}
      </g>
    ),
    cruiser: (id) => (
      // Side view: the long eight-sided hull, three silver collars, the bridge slits, the petals round the lamp.
      <g stroke="#7a8496" strokeWidth={0.8} {...ns}>
        <Plume n="moon" x={2} id={id} />
        <rect x={2} y={-4.5} width={6} height={9} rx={1.5} fill={`url(#${id}silver)`} />
        <ellipse cx={2} cy={0} rx={1.4} ry={3.4} fill="#9ab8ff" filter={`url(#${id}glow)`} stroke="none" />
        <rect x={8} y={-4} width={72} height={8} fill="#f2efe6" />
        <rect x={10} y={0.4} width={68} height={1.3} fill="#2f5fc4" stroke="none" />
        <path d="M62,-4 L64,-7.4 L76,-7.4 L78,-4 Z" fill="#f2efe6" />
        {[66, 69.5, 73].map((x) => <rect key={x} x={x} y={-6.6} width={2.2} height={1.2} fill="#9ab8ff" stroke="none" />)}
        {[64, 68, 72, 76].map((x) => <rect key={x} x={x - 0.4} y={-3.4} width={0.8} height={3} fill="#b8c0cc" stroke="none" />)}
        {[10, 44, 76].map((x) => <rect key={x} x={x} y={-5} width={4} height={10} fill={`url(#${id}silver)`} />)}
        {[-1, 1].map((s) => [7, 12, 17].map((y) => (
          <path key={`${s}${y}`} d={`M80,${s * 2} Q86,${s * (y + 1)} 99,${s * y} Q94,${s * (y - 4)} 82,${s * 0.5} Z`} fill={`url(#${id}silver)`} />
        )))}
        <circle cx={90} cy={0} r={4} fill="#9ab8ff" filter={`url(#${id}glow)`} stroke="none" />
      </g>
    ),
    fighter: (id) => (
      // Side view: the needle, the slit cockpit ahead of the collar, fins folded back like fletching, the ring.
      <g stroke="#7a8496" strokeWidth={0.8} {...ns}>
        <Plume n="moon" x={2} id={id} />
        <path d="M6,-4.6 L100,0 L6,4.6 Z" fill="#f6f4ee" />
        <rect x={20} y={-5} width={2.4} height={10} fill={`url(#${id}silver)`} />
        <path d="M24,-4.2 Q30,-6.4 38,-3.6 Z" fill="#dfe8f4" />
        <path d="M18,-3.4 L4,-11 L9,-11 L26,-3 Z" fill="#f6f4ee" />
        <path d="M18,3.4 L4,11 L9,11 L26,3 Z" fill="#b8c0cc" />
        <rect x={1} y={-3.6} width={5} height={7.2} rx={1.5} fill={`url(#${id}silver)`} />
        <circle cx={100} cy={0} r={2.4} fill="#9ab8ff" filter={`url(#${id}glow)`} stroke="none" />
      </g>
    ),
    special: (id) => (
      // Side view: the needle with its blue inlay, the open laurel wreath standing at the bow, the little shrine
      // with its light, cabin slits, a swept fin and the ring engine.
      <g stroke="#7a8496" strokeWidth={0.8} {...ns}>
        <Plume n="moon" x={4} id={id} />
        <rect x={0} y={-4} width={5} height={8} rx={1.5} fill={`url(#${id}silver)`} />
        <path d="M4,4 L-6,12 L0,12 L18,4 Z" fill="#f6f4ee" />
        <path d="M4,-5 L60,-5 L100,0 L60,5 L4,5 Z" fill="#f6f4ee" />
        <path d="M8,1 L88,0.5" stroke="#2f5fc4" strokeWidth={1.2} />
        {[48, 53, 58].map((x) => <rect key={x} x={x} y={-2.4} width={3} height={1} fill="#9ab8ff" stroke="none" />)}
        <rect x={46} y={-6} width={14} height={1.2} fill="#e6e3da" />
        {[47.5, 51.5, 55.5, 59].map((x) => <rect key={x} x={x - 0.6} y={-13} width={1.2} height={7} fill="#f6f4ee" />)}
        <circle cx={53} cy={-9.5} r={2.2} fill="#9ab8ff" stroke="none" filter={`url(#${id}glow)`} />
        <path d="M45,-13 L61,-13 L53,-18 Z" fill={`url(#${id}silver)`} />
        {Array.from({ length: 9 }, (_, i) => {
          const y = -24 + i * 6;
          return <g key={i}><ellipse cx={80 - 1.6} cy={y} rx={1.4} ry={3.2} fill="#d8dce6" transform={`rotate(-30 78.4 ${y})`} /><ellipse cx={80 + 1.6} cy={y} rx={1.4} ry={3.2} fill="#b8c0cc" transform={`rotate(30 81.6 ${y})`} /></g>;
        })}
        <path d="M80,-26 L80,26" stroke="#b8c0cc" strokeWidth={0.8} />
      </g>
    ),
  },
  mercury: {
    capital: (id) => (
      // Side view of the sheet: the great shield edge-on at the bow, the drum behind it with two gold rings and its
      // blisters, the black mount ring, two short engines.
      <g stroke="#e3c52c" strokeWidth={1} {...ns}>
        {[-10, 10].map((y) => <Plume key={y} n="mercury" x={4} y={y} id={id} k={1.3} />)}
        {[-10, 10].map((y) => <path key={y} d={`M4,${y - 7} L20,${y - 5} L20,${y + 5} L4,${y + 7} Z`} fill={`url(#${id}bronze)`} />)}
        <rect x={18} y={-14} width={6} height={28} fill="#151210" stroke="#2a1a10" />
        <rect x={22} y={-25} width={52} height={50} rx={3} fill={`url(#${id}bronze)`} stroke="#2a1a10" />
        {[36, 62].map((x) => <rect key={x} x={x} y={-25.5} width={2} height={51} fill="#e3c52c" stroke="none" />)}
        {[-1, 1].map((s) => [30, 44, 56, 68].map((x) => (
          <g key={`${s}${x}`}>
            <path d={`M${x - 3.5},${s * 25} A3.5,3.5 0 0 ${s > 0 ? 0 : 1} ${x + 3.5},${s * 25} Z`} fill="#5a3d22" stroke="#2a1a10" />
            <path d={`M${x},${s * 28} L${x + 9},${s * 31}`} stroke="#151210" strokeWidth={1.4} />
          </g>
        )))}
        <rect x={72} y={-16} width={8} height={32} fill="#151210" stroke="#2a1a10" />
        <path d="M80,-46 Q100,0 80,46 L77,46 Q95,0 77,-46 Z" fill={`url(#${id}bronze)`} stroke="#e3c52c" strokeWidth={2.2} />
      </g>
    ),
    cruiser: (id) => (
      // Side view: the blunt wedge sloping down to the stern, black iron flank, gold strips, the bridge slit, guns
      // under the rim and the round shield edge-on at the point.
      <g stroke="#e3c52c" strokeWidth={1} {...ns}>
        <Plume n="mercury" x={4} id={id} k={1.2} />
        <rect x={0} y={-5} width={6} height={10} fill="#151210" />
        <path d="M4,-7 L84,-12 L84,10 L4,7 Z" fill={`url(#${id}bronze)`} stroke="#2a1a10" />
        <path d="M10,-3 L80,-6 L80,6 L10,4 Z" fill="#151210" stroke="none" />
        <path d="M4,-7 L84,-12" strokeWidth={2} />
        <rect x={64} y={-14} width={12} height={3} fill="#151210" stroke="none" />
        {[-1, 1].map((s) => <path key={s} d={`M84,${8 + s} L100,${8 + s}`} stroke="#151210" strokeWidth={1.6} />)}
        <path d="M82,-16 Q102,0 82,16 Z" fill={`url(#${id}bronze)`} stroke="#e3c52c" strokeWidth={2} />
      </g>
    ),
    fighter: (id) => (
      // Side view: the gun through the shield, the shield edge-on, the faceted body with its canopy, upright fins.
      <g stroke="#e3c52c" strokeWidth={1} {...ns}>
        <Plume n="mercury" x={8} id={id} k={1.6} />
        <rect x={4} y={-5} width={6} height={10} fill="#151210" />
        <path d="M10,-6 L58,-9 L58,9 L10,6 Z" fill={`url(#${id}bronze)`} stroke="#2a1a10" />
        <path d="M40,-9 L44,-13 L54,-13 L56,-9 Z" fill="#5a3d22" stroke="#2a1a10" />
        <rect x={45} y={-12.4} width={6} height={2.4} fill="#9fb0c0" stroke="none" />
        <path d="M14,-6 L18,-20 L24,-20 L26,-6 Z M14,6 L18,16 L24,16 L26,6 Z" fill="#5a3d22" stroke="#2a1a10" />
        <rect x={64} y={-1.6} width={36} height={3.2} fill="#151210" stroke="#2a1a10" />
        <rect x={62} y={-2.6} width={4} height={5.2} fill="#e3c52c" stroke="none" />
        <path d="M56,-26 Q68,0 56,26 L53,26 Q64,0 53,-26 Z" fill={`url(#${id}bronze)`} stroke="#e3c52c" strokeWidth={2.2} />
      </g>
    ),
    special: (id) => (
      // Side view: the black iron rod, the gold ribbon wound round it in six turns, the bronze nose cap with its gun,
      // the cockpit pod in the first turn, the gold-rimmed nozzle.
      <g stroke="#e3c52c" strokeWidth={1} {...ns}>
        <Plume n="mercury" x={4} id={id} k={1.6} />
        <rect x={4} y={-2.4} width={4} height={4.8} fill="#151210" stroke="#e3c52c" />
        <rect x={8} y={-1.4} width={80} height={2.8} fill="#151210" stroke="none" />
        {Array.from({ length: 6 }, (_, i) => <path key={i} d={`M${14 + i * 12},7 Q${18 + i * 12},0 ${22 + i * 12},-7 M${22 + i * 12},-7 Q${24 + i * 12},-2 ${26 + i * 12},7`} fill="none" strokeWidth={1.8} />)}
        <path d="M74,-1 Q76,-6 82,-5 L82,-1 Z" fill="#5a3d22" stroke="#2a1a10" />
        <path d="M86,-6 Q100,-4 100,0 Q100,4 86,6 Z" fill={`url(#${id}bronze)`} stroke="#e3c52c" />
        <rect x={98} y={-0.8} width={6} height={1.6} fill="#151210" stroke="none" />
      </g>
    ),
  },
  venus: {
    capital: (id) => (
      // Side view of the sheet: the gilded teardrop with two enamel bands and waist windows, the ribbed dome with its
      // onion domes, the lifting ring edge-on with its knots, the chapel spire at the stern, engines one over two.
      <g stroke="#8a6a1a" strokeWidth={1} {...ns}>
        {[-4, 3].map((y) => <Plume key={y} n="venus" x={4} y={y} id={id} k={1.1} />)}
        <path d="M14,-14 L12,-46 L18,-14 Z" fill="#c9a227" />
        <path d="M2,0 C10,-18 50,-22 80,-13 C95,-8 100,-2 100,0 C100,2 95,8 80,13 C50,22 10,18 2,0 Z" fill={`url(#${id}gold)`} />
        {[[30, 20], [80, 14]].map(([x, h]) => <rect key={x} x={x} y={-h} width={5} height={h * 2} fill="#1d8f5c" stroke="#e8c85a" />)}
        {Array.from({ length: 11 }, (_, i) => <rect key={i} x={38 + i * 3.6} y={1} width={1.4} height={2.4} rx={0.7} fill="#ffe7a8" stroke="none" />)}
        <path d="M44,-18 L44,-22 L82,-22 L82,-15 Z" fill="#c9a227" />
        <path d="M46,-22 A17,17 0 0 1 80,-22 Z" fill={`url(#${id}glass)`} stroke="#c9a227" strokeWidth={1.4} />
        {[52, 58, 63, 68, 74].map((x) => <path key={x} d={`M${x},-22 Q${(x + 63) / 2},-34 63,-39`} fill="none" stroke="#e8c85a" strokeWidth={0.8} />)}
        <path d="M63,-39 L63,-46" strokeWidth={1.4} />
        {[[40, -16], [86, -11]].map(([x, y]) => <path key={x} d={`M${x - 4},${y} Q${x - 4},${y - 7} ${x},${y - 12} Q${x + 4},${y - 7} ${x + 4},${y} Z`} fill="#c9a227" />)}
        <path d="M14,6 L92,6" stroke="#c9a227" strokeWidth={3.4} />
        {[14, 40, 66, 92].map((x) => <circle key={x} cx={x} cy={6} r={2.2} fill="#e8c85a" />)}
      </g>
    ),
    cruiser: (id) => (
      // Side view: the gilded teardrop, the broad enamel band near the nose, glass dome and guns, onion cupola, and
      // the X fins edge-on as tall boards, the upper ones painted.
      <g stroke="#8a6a1a" strokeWidth={1} {...ns}>
        <Plume n="venus" x={4} id={id} />
        <path d="M4,0 C16,-12 60,-14 100,0 C60,14 16,12 4,0 Z" fill={`url(#${id}gold)`} />
        <rect x={70} y={-10} width={7} height={20} fill="#1d8f5c" stroke="#e8c85a" />
        <path d="M56,-9 A7,6 0 0 1 70,-9 Z" fill={`url(#${id}glass)`} />
        <path d="M68,-11 L80,-11" strokeWidth={1.8} />
        <path d="M40,-9 Q40,-14 43,-17 Q46,-14 46,-9 Z" fill="#c9a227" />
        {[-1, 1].map((s) => <rect key={s} x={2} y={s > 0 ? 6 : -30} width={12} height={24} fill="#c9a227" />)}
        <rect x={4} y={-27} width={8} height={17} fill="#1d8f5c" stroke="#e8c85a" />
        <path d="M8,-24 L8,-13 M6,-20 L10,-20" stroke="#e8c85a" />
      </g>
    ),
    fighter: (id) => (
      // Side view: the long cut stone, flat and pointed at both ends, the pilot's shadow in it, the claw prongs
      // curling over its girdle, a scroll fin, the emitter at the point and the gold engine cup.
      <g stroke="#8a6a1a" strokeWidth={1} {...ns}>
        <Plume n="venus" x={4} id={id} k={1.4} />
        <rect x={4} y={-5} width={8} height={10} fill="#c9a227" />
        <path d="M10,0 L30,-10 L72,-10 L96,0 L72,10 L30,10 Z" fill={`url(#${id}glass)`} stroke="#c9a227" strokeWidth={1.4} />
        <path d="M30,-10 L44,0 L30,10 M72,-10 L60,0 L72,10" fill="none" stroke="#9fffd0" strokeWidth={0.6} />
        <path d="M40,-6 Q46,-9 50,-5 L52,4 L42,4 Z" fill="#0f4a33" opacity={0.6} stroke="none" />
        <path d="M12,-3 L28,-10 L58,-11 L64,-7 M12,3 L28,10 L58,11 L64,7" fill="none" stroke="#c9a227" strokeWidth={1.8} />
        <path d="M24,-8 Q16,-22 28,-22 Q32,-20 28,-17" fill="none" stroke="#c9a227" strokeWidth={2.4} />
        <rect x={96} y={-1.6} width={6} height={3.2} fill="#c9a227" />
      </g>
    ),
    special: (id) => (
      // Side view: the gilded tube with three enamel bands, a fuel tank behind the lion's head, the glass dome, the
      // X fins and the engine cup, and the roaring gold lion's head at the front with green in its throat.
      <g stroke="#8a6a1a" strokeWidth={1} {...ns}>
        <Plume n="venus" x={4} id={id} k={0.6} />
        <path d="M6,-4 L-2,-14 L4,-14 L14,-4 Z M6,4 L-2,14 L4,14 L14,4 Z" fill="#c9a227" />
        <rect x={4} y={-8} width={78} height={16} rx={2} fill={`url(#${id}gold)`} />
        {[30, 42, 54].map((x) => <rect key={x} x={x} y={-8} width={5} height={16} fill="#1d8f5c" stroke="#e8c85a" />)}
        <path d="M24,-8 A6,5 0 0 1 36,-8 Z" fill={`url(#${id}glass)`} />
        <ellipse cx={70} cy={5} rx={8} ry={6} fill={`url(#${id}gold)`} />
        <circle cx={70} cy={5} r={2} fill="#1d8f5c" stroke="none" />
        {Array.from({ length: 11 }, (_, i) => { const a = -1.4 + i * 0.28; return <path key={i} d={`M${86 + Math.sin(a) * 2},${Math.cos(a) * -1} l${-Math.cos(a) * 6 - 4},${-Math.sin(a) * 6 * 3}`} stroke="#c9a227" strokeWidth={2.2} />; })}
        <path d="M82,-12 Q96,-14 104,-6 L112,-3 L104,0 L110,4 L102,8 Q94,13 82,12 Z" fill="#c9a227" />
        <path d="M104,0 L110,4 L102,6 Z" fill="#7aff9a" stroke="none" filter={`url(#${id}glow)`} />
        <circle cx={98} cy={-6} r={1.4} fill="#7aff9a" stroke="none" />
      </g>
    ),
  },
  mars: {
    capital: (id) => (
      // Side view of the sheet: the long flat wedge, stepped decks and turrets, the tower with its bridge bar and
      // vanes, the oar radiators raked back down the flank, the galley ram beak under the prow, seven nozzles.
      <g stroke="#3d4249" strokeWidth={1} {...ns}>
        {[-4, 0, 4].map((y) => <rect key={y} x={-2} y={y - 1} width={3} height={2.4} fill="#bfefff" filter={`url(#${id}glow)`} stroke="none" />)}
        {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${26 + i * 4.6},2 L${18 + i * 4.6},9`} stroke="#5d6269" strokeWidth={1.1} />)}
        <path d="M0,-7 L96,-0.5 L96,0.5 L0,4 Z" fill={`url(#${id}grey)`} />
        <path d="M0,-1 L96,0" stroke="#4d5259" strokeWidth={1.2} />
        <path d="M82,0.6 L102,1.6 L84,3.2 Z" fill="#5d6269" />
        <path d="M86,1.4 L100,1.6" stroke="#3d4249" strokeWidth={0.6} />
        <path d="M2,-7 L58,-3.4 L58,-5.6 L4,-10 Z" fill="#8a8f96" />
        <path d="M3,-10 L38,-7.4 L38,-9.4 L5,-12.6 Z" fill="#9aa0a8" />
        <path d="M4,-12.6 L22,-11 L22,-12.6 L6,-14.6 Z" fill="#8a8f96" />
        {[10, 16, 22, 28, 34, 40, 46, 52].map((x) => <rect key={x} x={x} y={-7.2 + (x - 10) * 0.065} width={2} height={1} fill="#ffffff" stroke="none" />)}
        {[16, 30, 44].map((x) => <g key={x}><rect x={x} y={-11.6 + (x - 16) * 0.1} width={4} height={2} fill="#8a8f96" /><path d={`M${x + 4},${-10.8 + (x - 16) * 0.1} l4,0`} strokeWidth={0.8} /></g>)}
        <path d="M8,-14.6 L10,-22 L13,-22 L15,-14 Z" fill="#8a8f96" />
        <rect x={3} y={-25} width={18} height={3} fill="#9aa0a8" />
        {[5, 8, 11, 14, 17].map((x) => <rect key={x} x={x} y={-24.2} width={1.6} height={1.2} fill="#ffffff" stroke="none" />)}
        {[3, 20].map((x) => <rect key={x} x={x} y={-30} width={1.2} height={5} fill="#5d6269" />)}
        <rect x={10.4} y={-20} width={2.2} height={2.2} fill="#cc2131" stroke="none" />
        <path d="M58,-3 L92,-0.6" stroke="#cc2131" strokeWidth={1.2} />
        <rect x={30} y={3.4} width={14} height={1.6} fill="#ffe7a8" stroke="none" />
      </g>
    ),
    cruiser: (id) => (
      // Side view: the dagger wedge, the raised deck with its windows, the tower and bridge bar with the red plate,
      // the corvus boom folded along the spine to its spike, guns under the prow, three square nozzles.
      <g stroke="#3d4249" strokeWidth={1} {...ns}>
        {[-3, 2].map((y) => <rect key={y} x={-2} y={y - 1.5} width={3} height={3} fill="#bfefff" filter={`url(#${id}glow)`} stroke="none" />)}
        <path d="M0,-10 L100,-1 L100,1 L0,8 Z" fill={`url(#${id}grey)`} />
        <path d="M4,-10 L70,-4.4 L70,-6 L6,-13 Z" fill="#8a8f96" />
        {[16, 24, 32, 40, 48, 56, 64].map((x) => <rect key={x} x={x} y={-10.8 + (x - 16) * 0.105} width={2} height={1} fill="#ffffff" stroke="none" />)}
        <rect x={6} y={-22} width={12} height={9} fill="#8a8f96" />
        <rect x={2} y={-25} width={20} height={3} fill="#9aa0a8" />
        <rect x={4} y={-24.4} width={16} height={1.2} fill="#ffffff" stroke="none" />
        <rect x={11} y={-20} width={4} height={4} fill="#cc2131" stroke="none" />
        <path d="M18,-15 L86,-4.6 M18,-17 L86,-6.6" stroke="#5d6269" strokeWidth={1} />
        {Array.from({ length: 7 }, (_, i) => 26 + i * 8.4).map((x) => <path key={x} d={`M${x},${-16 + (x - 18) * 0.152} l0,2`} stroke="#5d6269" strokeWidth={1.4} />)}
        <path d="M86,-6.6 L90,-5 L86,-1 Z" fill="#5d6269" />
        <path d="M60,-2.6 L96,-0.6" stroke="#cc2131" strokeWidth={1.4} />
        <path d="M84,4 L100,4" stroke="#5d6269" strokeWidth={1.4} />
      </g>
    ),
    fighter: (id) => (
      // Top view: the javelin. A narrow fuselage, the pilum run out past the nose, short delta wings with red leading
      // edges, the V fins and two square nozzles. No upright panels anywhere.
      <g stroke="#3d4249" strokeWidth={1} {...ns}>
        {[-3.4, 3.4].map((y) => <rect key={y} x={-2} y={y - 2.4} width={3} height={4.8} fill="#bfefff" filter={`url(#${id}glow)`} stroke="none" />)}
        <path d="M30,-30 L46,-30 L56,-5 L40,-5 Z M30,30 L46,30 L56,5 L40,5 Z" fill="#8a8f96" />
        <path d="M46,-30 L56,-5 M46,30 L56,5" stroke="#cc2131" strokeWidth={2.2} />
        <path d="M0,-6 L56,-6 L66,-3 L70,0 L66,3 L56,6 L0,6 Z" fill={`url(#${id}grey)`} />
        <path d="M4,-6 L-2,-12 L4,-12 L14,-6 Z M4,6 L-2,12 L4,12 L14,6 Z" fill="#5d6269" />
        <path d="M46,-2 L58,-2 L60,0 L58,2 L46,2 Z" fill="#1a2a3a" />
        <path d="M70,0 L96,0" stroke="#5d6269" strokeWidth={1.6} />
        <path d="M96,-2.4 L101,0 L96,2.4 Z" fill="#8a8f96" />
      </g>
    ),
    special: (id) => (
      // Side view: the long box with its arched roof, the shield wall of bossed plates, red bars on the roof, two
      // side ramps let down and outlined red, the front ramp down, folded legs, six square nozzles.
      <g stroke="#3d4249" strokeWidth={1} {...ns}>
        {[-5, 3].map((y) => <rect key={y} x={-2} y={y - 2} width={3} height={4} fill="#bfefff" filter={`url(#${id}glow)`} stroke="none" />)}
        <path d="M0,-12 L90,-12 L96,-8 L96,10 L0,10 Z" fill="#5d6269" />
        {[0, 1, 2, 3].map((r) => Array.from({ length: 13 }, (_, i) => (
          <g key={`${r}${i}`}>
            <rect x={4 + i * 6.8} y={-14 + r * 6} width={7} height={6.4} rx={1.6} fill={`url(#${id}grey)`} />
            <circle cx={7.5 + i * 6.8} cy={-10.8 + r * 6} r={0.8} fill="#5d6269" stroke="none" />
          </g>
        )))}
        {Array.from({ length: 13 }, (_, i) => <rect key={i} x={5.5 + i * 6.8} y={-15} width={4} height={1} fill="#cc2131" stroke="none" />)}
        {[22, 64].map((x) => <g key={x}><rect x={x} y={-4} width={10} height={14} fill="#1a1e24" stroke="#cc2131" /><path d={`M${x},10 L${x - 6},17 L${x + 4},17 L${x + 10},10 Z`} fill="#8a8f96" /></g>)}
        <path d="M96,6 L104,16 L100,17 L94,8 Z" fill="#8a8f96" />
        <path d="M90,-12 L96,-8" stroke="#cc2131" strokeWidth={1.6} />
        {[16, 80].map((x) => <rect key={x} x={x} y={10} width={10} height={2} fill="#5d6269" />)}
        <rect x={74} y={-18} width={6} height={3} fill="#8a8f96" />
        <path d="M80,-17 L86,-17" strokeWidth={1.2} />
      </g>
    ),
  },
  jupiter: {
    capital: (id) => (
      // Side view after the hero view (the sheet's flat views drop the claws): the lozenge spine, the two great claws
      // sweeping forward past the prow, three crest blades and the keel blade, the throne-room band, four cannons
      // down the flank, five engines.
      <g stroke="#120820" strokeWidth={1} {...ns}>
        {[-4, 0, 4].map((y) => <Plume key={y} n="jupiter" x={2} y={y} id={id} k={0.9} />)}
        <path d="M18,8 C46,34 96,36 116,12 L110,12 C92,26 52,24 26,6 Z" fill="#24133a" />
        <path d="M26,6 C52,24 92,26 110,12" fill="none" stroke="#ff2fd0" strokeWidth={1.6} filter={`url(#${id}glow)`} />
        <path d="M30,6 L22,14 L36,7 Z" fill="#4a2a78" />
        <path d="M0,-6 L70,-11 L100,0 L70,9 L0,6 Z" fill={`url(#${id}violet)`} />
        <path d="M18,-8 C46,-34 96,-36 116,-12 L110,-12 C92,-26 52,-24 26,-6 Z" fill="#24133a" />
        <path d="M26,-6 C52,-24 92,-26 110,-12" fill="none" stroke="#ff2fd0" strokeWidth={1.6} filter={`url(#${id}glow)`} />
        {[[30, 8], [44, 14], [58, 9]].map(([x, h]) => <path key={x} d={`M${x},-9 L${x - 12},${-9 - h} L${x + 6},-9 Z`} fill="#4a2a78" />)}
        <path d="M28,6 L16,15 L40,7 Z" fill="#4a2a78" />
        <rect x={56} y={-4} width={14} height={2} fill="#c08aff" filter={`url(#${id}glow)`} stroke="none" />
        {[34, 42, 50, 58].map((x) => <g key={x}><rect x={x} y={-3} width={4} height={3} fill="#4a2a78" /><path d={`M${x + 4},-1.6 L${x + 11},-1.6`} strokeWidth={1.4} /></g>)}
        <path d="M2,0 L100,0" stroke="#ff2fd0" strokeWidth={0.8} opacity={0.8} />
        <path d="M44,-24 l1.5,3 l3,1.5 l-3,1.5 l-1.5,3 l-1.5,-3 l-3,-1.5 l3,-1.5 Z" fill="#7442ad" stroke="#ff9ff0" strokeWidth={0.6} />
      </g>
    ),
    cruiser: (id) => (
      // Side view: the spine, the spinal gun run out past the prow, the small claws, the crest with its sigil and
      // the bridge slits along its foot, three engines.
      <g stroke="#120820" strokeWidth={1} {...ns}>
        <Plume n="jupiter" x={2} id={id} />
        <rect x={20} y={-1} width={106} height={2} fill="#4a2a78" />
        <circle cx={126} cy={0} r={1.6} fill="#ff2fd0" filter={`url(#${id}glow)`} stroke="none" />
        <path d="M0,-5 L70,-7 L100,0 L70,7 L0,5 Z" fill={`url(#${id}violet)`} />
        <path d="M80,-5 C92,-16 104,-14 108,-8 L102,-8 C96,-12 90,-10 84,-4 Z M80,5 C92,16 104,14 108,8 L102,8 C96,12 90,10 84,4 Z" fill="#24133a" />
        <path d="M4,-3 L80,-5 M4,3 L80,5" stroke="#ff2fd0" strokeWidth={0.8} filter={`url(#${id}glow)`} />
        <path d="M16,-6 L4,-16 L10,-16 L34,-6 Z" fill="#24133a" />
        <path d="M14,-6 L30,-6 L30,-8 L16,-8 Z" fill="#24133a" />
        {[17, 20, 23, 26].map((x) => <rect key={x} x={x} y={-7.6} width={1.8} height={1} fill="#c08aff" stroke="none" />)}
      </g>
    ),
    fighter: (id) => (
      // Side view: the needle fuselage and slit cockpit, a crescent wing with its talon tip, the long tail spikes,
      // the guns under the prow.
      <g stroke="#120820" strokeWidth={1} {...ns}>
        <Plume n="jupiter" x={6} id={id} k={1.6} />
        <path d="M8,-4 L-14,-30 L-8,-30 L22,-5 Z" fill="#24133a" />
        <path d="M30,0 L68,-12 L76,-10 L92,-6 L56,2 Z" fill="#4a2a78" />
        <path d="M68,-12 L92,-6 L96,-1" stroke="#ff2fd0" strokeWidth={1.6} fill="none" filter={`url(#${id}glow)`} />
        <path d="M4,-6 L60,-7 L100,0 L60,7 L4,6 Z" fill={`url(#${id}violet)`} />
        <rect x={62} y={-3} width={14} height={2} fill="#c08aff" stroke="none" />
        <path d="M58,7 L84,7" strokeWidth={1.4} />
      </g>
    ),
    special: (id) => (
      // Side view: four tiers stepping down from the broad stern to the narrow front, each edged in magenta, turrets
      // on every tier, the crown sigil and lit bridge on the rear tier, the three-talon ram claw at the front.
      <g stroke="#120820" strokeWidth={1} {...ns}>
        {[-8, 8].map((y) => <Plume key={y} n="jupiter" x={4} y={y} id={id} />)}
        {[[4, 30, 26], [30, 52, 21], [52, 70, 16], [70, 84, 12]].map(([x0, x1, h], i) => (
          <g key={i}>
            <path d={`M${x0},${-h} L${x1},${-h} L${x1 + 2},${-h + 4} L${x1 + 2},${h - 4} L${x1},${h} L${x0},${h} Z`} fill={i % 2 ? '#4a2a78' : '#24133a'} />
            <path d={`M${x1 + 2},${-h + 4} L${x1 + 2},${h - 4}`} stroke="#ff2fd0" strokeWidth={1.4} filter={`url(#${id}glow)`} />
            {(i === 0 ? [10, 20] : i < 3 ? [x0 + 6] : [x0 + 4]).map((x) => <g key={x}><rect x={x} y={-h - 3} width={5} height={3} fill="#4a2a78" /><path d={`M${x + 5},${-h - 1.6} L${x + 11},${-h - 1.6}`} strokeWidth={1} /></g>)}
          </g>
        ))}
        <rect x={8} y={-30} width={18} height={4} fill="#24133a" />
        <rect x={9} y={-29} width={16} height={1.6} fill="#c08aff" stroke="none" filter={`url(#${id}glow)`} />
        <path d="M14,-6 l3,-5 l3,3 l3,-3 l3,5 Z" fill="#7442ad" stroke="#ff9ff0" strokeWidth={0.6} />
        <path d="M84,-8 Q96,-12 100,-1 Q94,-6 86,-4 Z M84,6 Q94,14 100,1 Q92,8 86,4 Z M84,10 Q92,18 98,4 Q90,12 86,9 Z" fill="#7442ad" />
      </g>
    ),
  },
  saturn: {
    capital: (id) => (
      // Side view of the sheet: the long black spine, the curled stern post with the amber-windowed cabin at its
      // foot, the oar fins fanned up and down from three banks of amber engines, the indigo ram with its long gun,
      // the painted eye.
      <g stroke="#2a2850" strokeWidth={0.8} {...ns}>
        <Plume n="saturn" x={0} id={id} k={0.9} />
        {Array.from({ length: 14 }, (_, i) => <path key={i} d={`M${16 + i * 5},-3 L${7 + i * 5},-20`} stroke="#16161e" strokeWidth={1.3} />)}
        {Array.from({ length: 14 }, (_, i) => <path key={i} d={`M${16 + i * 5},3 L${7 + i * 5},20`} stroke="#16161e" strokeWidth={1.3} />)}
        <path d="M6,-4 L6,-14 Q6,-24 12,-22 Q15,-20 11,-17" fill="none" stroke="#16161e" strokeWidth={2.2} />
        <rect x={0} y={-3.4} width={88} height={6.8} fill="#16161e" />
        <rect x={4} y={2.4} width={80} height={1.2} fill="#2a2850" stroke="none" />
        {Array.from({ length: 9 }, (_, i) => <rect key={i} x={16 + i * 7.6} y={-3.4} width={6.6} height={1.2} fill="#2a2850" stroke="none" />)}
        <rect x={8} y={-7} width={10} height={3.6} fill="#16161e" />
        {[10, 13, 16].map((x) => <rect key={x} x={x} y={-6} width={1.6} height={1.2} fill="#ffb347" stroke="none" />)}
        <path d="M88,-1 L102,2.6 L88,3.4 Z" fill="#33307a" />
        <path d="M86,0 L104,0" stroke="#16161e" strokeWidth={1.6} />
        {[-1.6, 0, 1.6].map((y) => Array.from({ length: 8 }, (_, i) => <circle key={`${y}${i}`} cx={16 + i * 9} cy={y} r={0.7} fill="#ffb347" stroke="none" />))}
        <ellipse cx={82} cy={-0.6} rx={3.6} ry={2.2} fill="#f2e6cc" />
        <circle cx={82} cy={-0.6} r={1.3} fill="#33307a" stroke="none" />
      </g>
    ),
    cruiser: (id) => (
      // Side view: the low black hull with its ram and gun, the eye and the canopy behind it, three fuel tanks on the
      // spine in black bands, an oar fin raked back with its amber root engine.
      <g stroke="#2a2850" strokeWidth={0.8} {...ns}>
        <Plume n="saturn" x={2} id={id} k={0.8} />
        <path d="M30,2 L10,9 M56,2 L36,9" stroke="#16161e" strokeWidth={1.4} />
        {[30, 56].map((x) => <circle key={x} cx={x} cy={2.4} r={1.1} fill="#ffb347" stroke="none" />)}
        <path d="M2,-4 L84,-4 L100,1 L84,4 L2,4 Z" fill="#16161e" />
        <path d="M84,2 L100,1.4" stroke="#2a2850" strokeWidth={1.4} />
        {[12, 34, 56].map((x) => <g key={x}><rect x={x} y={-11} width={20} height={7} rx={3.5} fill="#2a2850" /><rect x={x + 9} y={-11} width={2.4} height={7} fill="#16161e" stroke="none" /></g>)}
        <path d="M76,-4 Q80,-7.4 86,-4 Z" fill="#0a0a14" />
        <ellipse cx={90} cy={-0.6} rx={2.4} ry={1.6} fill="#f2e6cc" />
        <circle cx={90} cy={-0.6} r={0.9} fill="#33307a" stroke="none" />
      </g>
    ),
    fighter: (id) => (
      // Top view: long glider wings with indigo tips and amber lights on a slim pod, the boom and T-tail, nose guns.
      <g stroke="#2a2850" strokeWidth={0.8} {...ns}>
        <Plume n="saturn" x={30} id={id} k={0.6} />
        <path d="M30,-3 L96,-3 Q100,0 96,3 L30,3 Z" fill="#16161e" />
        <path d="M62,-3 L58,-56 L52,-56 L50,-3 Z M62,3 L58,56 L52,56 L50,3 Z" fill="#16161e" />
        <path d="M58.4,-44 L58,-56 L52,-56 L52.6,-44 Z M58.4,44 L58,56 L52,56 L52.6,44 Z" fill="#2a2850" />
        <path d="M58,-56 L52,-56 M58,56 L52,56" stroke="#ffb347" strokeWidth={1.6} />
        <path d="M2,-12 L10,-12 L10,12 L2,12 Z" fill="#16161e" />
        <path d="M6,-1 L30,-1 L30,1 L6,1 Z" fill="#16161e" />
        <ellipse cx={80} cy={0} rx={12} ry={2} fill="#0a0a14" />
        {[-1.4, 1.4].map((y) => <path key={y} d={`M96,${y} L104,${y}`} strokeWidth={1} stroke="#16161e" />)}
      </g>
    ),
    special: (id) => (
      // Side view: the round-bellied black merchant hull, the raised curled stern post with the cabin under it, the
      // indigo bladder in its hoops, the valve towers lit amber, oar fins with amber root engines, the painted eye.
      <g stroke="#2a2850" strokeWidth={0.8} {...ns}>
        {[-2, 4].map((y) => <Plume key={y} n="saturn" x={4} y={y} id={id} k={0.6} />)}
        {Array.from({ length: 6 }, (_, i) => <g key={i}><path d={`M${30 + i * 7},8 L${22 + i * 7},22`} stroke="#16161e" strokeWidth={1.6} /><circle cx={30 + i * 7} cy={8} r={1.2} fill="#ffb347" stroke="none" /></g>)}
        <path d="M4,-6 C10,-8 20,-8 26,-6 L80,-6 Q96,-6 100,-2 L96,8 C80,16 20,16 8,8 Z" fill="#16161e" />
        <path d="M8,-6 Q2,-20 10,-22 Q16,-22 14,-16" fill="none" stroke="#16161e" strokeWidth={2.4} />
        <rect x={12} y={-10} width={10} height={4} fill="#16161e" />
        {[14, 17, 20].map((x) => <rect key={x} x={x} y={-9} width={1.6} height={1.2} fill="#ffb347" stroke="none" />)}
        <path d="M28,-6 C30,-16 76,-16 78,-6 Z" fill="#2a2850" />
        {[34, 42, 50, 58, 66, 74].slice(0, 5).map((x) => <path key={x} d={`M${x},-6 Q${x},-14 ${x},-14.4`} stroke="#16161e" strokeWidth={1.4} />)}
        {[38, 48, 58, 68].map((x) => <g key={x}><rect x={x - 0.8} y={-20} width={1.6} height={6} fill="#16161e" /><circle cx={x} cy={-20.6} r={1} fill="#ffb347" stroke="none" /></g>)}
        <ellipse cx={90} cy={-1} rx={2.6} ry={1.8} fill="#f2e6cc" />
        <circle cx={90} cy={-1} r={1} fill="#33307a" stroke="none" />
      </g>
    ),
  },
};

const KIND_LABEL: Record<ClassKind, string> = { capital: 'Capital ship', cruiser: 'Cruiser', fighter: 'Fighter', special: 'Special' };

/** Each drawing's extent in its own units, plume included: [left, right, half-height]. Measured from the shapes above. */
const EXTENT: Record<NationId, Record<ClassKind, [number, number, number]>> = {
  earth: { capital: [-25, 100, 31], cruiser: [-12, 100, 17], fighter: [-38, 100, 26], special: [-30, 100, 36] },
  moon: { capital: [-12, 100, 20], cruiser: [-10, 101, 18], fighter: [-10, 103, 12], special: [-12, 100, 26] },
  mercury: { capital: [-14, 100, 46], cruiser: [-12, 100, 16], fighter: [-18, 100, 26], special: [-22, 100, 10] },
  venus: { capital: [-34, 100, 46], cruiser: [-30, 100, 30], fighter: [-44, 102, 22], special: [-20, 112, 18] },
  mars: { capital: [-2, 102, 30], cruiser: [-2, 100, 25], fighter: [-2, 101, 30], special: [-2, 100, 18] },
  jupiter: { capital: [-18, 116, 36], cruiser: [-22, 128, 16], fighter: [-30, 100, 31], special: [-18, 100, 30] },
  saturn: { capital: [-40, 104, 25], cruiser: [-33, 100, 11], fighter: [-1, 104, 56], special: [-30, 100, 24] },
};

/** Draws class `c` fitted into a box centred on (cx, cy), `w` wide and `h` tall, with its name under the box. */
function Slot({ n, c, cx, cy, w, h, labelY, id }: { n: NationId; c: ShipClass; cx: number; cy: number; w: number; h: number; labelY: number; id: string }) {
  const [l, r, hh] = EXTENT[n][c.kind];
  const k = Math.min(w / (r - l), h / 2 / hh);
  const x = cx - ((l + r) / 2) * k;
  return (
    <g>
      <g transform={`translate(${x},${cy}) scale(${k})`}>{SHAPES[n][c.kind](id)}</g>
      <text x={cx} y={labelY} textAnchor="middle" fontFamily="Georgia, serif" fill="#f6efd8">
        <tspan fontSize={15} fontWeight={700}>{c.name}</tspan>
        <tspan x={cx} dy={15} fontSize={10.5} opacity={0.8} letterSpacing={1}>{KIND_LABEL[c.kind].toUpperCase()}</tspan>
      </text>
    </g>
  );
}

export default function ShipLineup({ nation }: { nation: NationId }) {
  const id = 's' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const people = peopleOf(nation);
  const p = people.palette;
  const [core, tail] = PLUME[nation];
  const by = (k: ClassKind) => people.ships.find((s) => s.kind === k);
  const cap = by('capital')!, cru = by('cruiser')!, fig = by('fighter')!, spe = by('special');
  const unit = 52; // px per player-ship length in the scale strip
  const strip = [cap, cru, fig, ...(spe ? [spe] : [])];
  return (
    <Art w={W} h={H} label={`Ships of the ${people.name}`}>
      <defs>
        <Lin id={`${id}bg`} stops={[[0, darken(p.accent, 0.55)], [0.6, darken(p.accent, 0.78)], [1, '#05060f']]} />
        <Lin id={`${id}plume`} x2={1} y2={0} stops={[[0, tail, 0], [0.6, tail, 0.85], [1, core]]} />
        <Lin id={`${id}brass`} stops={[[0, '#f0d890'], [0.45, '#c9a14a'], [1, '#6a5020']]} />
        <Lin id={`${id}silver`} stops={[[0, '#ffffff'], [0.5, '#b8c0cc'], [1, '#7a8496']]} />
        <Lin id={`${id}bronze`} stops={[[0, '#9a6a3a'], [0.5, '#5a3d22'], [1, '#2a1a10']]} />
        <Lin id={`${id}gold`} stops={[[0, '#fff0b0'], [0.45, '#c9a227'], [1, '#6a5010']]} />
        <Lin id={`${id}glass`} stops={[[0, '#9fffd0'], [0.5, '#1d8f5c'], [1, '#0f4a33']]} />
        <Lin id={`${id}grey`} stops={[[0, '#b8bcc4'], [0.5, '#8a8f96'], [1, '#4d5259']]} />
        <Lin id={`${id}violet`} stops={[[0, '#6a3aa8'], [0.5, '#4a2a78'], [1, '#1a0a2a']]} />
        <Glow id={`${id}glow`} blur={1.6} />
      </defs>
      <rect width={W} height={H} fill={`url(#${id}bg)`} />
      {Array.from({ length: 13 }, (_, i) => <line key={`v${i}`} x1={i * 40} y1={0} x2={i * 40} y2={H} stroke={lighten(p.accent, 0.4)} strokeWidth={0.5} opacity={0.12} />)}
      {Array.from({ length: 9 }, (_, i) => <line key={`h${i}`} x1={0} y1={i * 40} x2={W} y2={i * 40} stroke={lighten(p.accent, 0.4)} strokeWidth={0.5} opacity={0.12} />)}
      <Slot n={nation} c={cap} cx={W / 2} cy={66} w={400} h={104} labelY={136} id={id} />
      <Slot n={nation} c={cru} cx={92} cy={188} w={128} h={62} labelY={240} id={id} />
      <Slot n={nation} c={fig} cx={spe ? 240 : 330} cy={188} w={110} h={62} labelY={240} id={id} />
      {spe && <Slot n={nation} c={spe} cx={388} cy={188} w={128} h={62} labelY={240} id={id} />}
      <g transform={`translate(24,${H - 30})`}>
        <text x={0} y={-19} fontFamily="Georgia, serif" fontSize={9} fill="#f6efd8" opacity={0.7} letterSpacing={1}>TRUE LENGTHS · ONE MARK = THE PLAYER SHIP</text>
        <text x={0} y={-6} fontFamily="Georgia, serif" fontSize={9.5} fill="#f6efd8" opacity={0.9}>
          {strip.map((s) => `${s.name} ${s.length}×`).join(' · ')}
        </text>
        {Array.from({ length: 9 }, (_, i) => <line key={i} x1={i * unit} y1={0} x2={i * unit} y2={18} stroke="#f6efd8" strokeWidth={0.6} opacity={0.35} />)}
        {strip.map((s, i) => (
          <rect key={s.id} x={0} y={1 + i * 4.2} width={Math.max(2, s.length * unit)} height={3}
            fill={i === 0 ? p.glow : i === 1 ? '#f6efd8' : i === 2 ? lighten(p.accent, 0.4) : '#d8ad4a'} />
        ))}
      </g>
      <Frame w={W} h={H} accent={p.accent} />
    </Art>
  );
}

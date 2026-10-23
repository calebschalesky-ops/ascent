// Renders the app icons from one SVG. Run: node scripts/icons.mjs
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const rings = [
  ['#2f5fc4', 70], ['#e3c52c', 92], ['#1d8f5c', 114], ['#eb9a1e', 136],
  ['#cc2131', 158], ['#7442ad', 180], ['#33307a', 202],
];

function svg(pad) {
  const s = 1 - pad;
  const body = rings.map(([c, r]) => `<circle cx="256" cy="256" r="${r * s}" fill="none" stroke="${c}" stroke-width="${20 * s}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#070a1f"/>
  <circle cx="256" cy="256" r="${226 * s}" fill="none" stroke="#f3e2a6" stroke-width="${6 * s}" opacity=".85"/>
  ${body}
  <circle cx="256" cy="256" r="${50 * s}" fill="#3a2e1c" stroke="#e9dcc0" stroke-width="3"/>
  <circle cx="256" cy="${256 - 136 * s}" r="${24 * s}" fill="#e9b949" stroke="#5a3d0c" stroke-width="3"/>
  <circle cx="256" cy="${256 - 136 * s}" r="${5 * s}" fill="#5a3d0c"/>
</svg>`;
}

writeFileSync('public/icon.svg', svg(0));
const full = Buffer.from(svg(0));
const masked = Buffer.from(svg(0.2));
await sharp(full).resize(192, 192).png().toFile('public/icon-192.png');
await sharp(full).resize(512, 512).png().toFile('public/icon-512.png');
await sharp(masked).resize(512, 512).png().toFile('public/icon-512-maskable.png');
await sharp(full).resize(180, 180).png().toFile('public/apple-touch-icon.png');
console.log('icons written');

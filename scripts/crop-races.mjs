// Crop the accepted race reference sheets (art-refit/02-RACES.md) into the game's people art: a front head study, the
// front figure of the turnaround, and the leader where the sheet drew one cleanly.
//   node scripts/crop-races.mjs [sheet-dir] [--sheet contact-dir]
// sheet-dir defaults to ../../../art-refit/refs/races from a worktree, else art-refit/refs/races. Writes
// public/races/<nation>/{head,body,leader}.webp at the sheet's own pixels (never upscaled). --sheet also writes one
// contact image per people, to check the boxes by eye. When a sheet is rerun, measure its boxes again here.
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Boxes are [left, top, width, height] on the 1024 × 572 sheet, measured by looking. Each excludes the border, the
 * swatches, the line-up and the neighbouring studies. A missing `leader` means the sheet's leader can't be used as
 * drawn (the reason is beside it).
 */
const SHEETS = {
  earth: { file: 'earth.webp', head: [742, 26, 120, 150], body: [26, 36, 236, 486], leader: [690, 290, 118, 230] },
  moon: { file: 'moon.webp', head: [588, 36, 116, 160], body: [34, 40, 210, 490], leader: [678, 226, 104, 294] },
  // The King of the Field is drawn pale; he should have the soldier's very dark skin (02-RACES Results). No leader.
  // The front head is the younger face the Results ask for; the three-quarter study drifted older.
  mercury: { file: 'mercury.webp', head: [706, 26, 124, 168], body: [38, 46, 194, 488] },
  venus: { file: 'venus.webp', head: [728, 26, 116, 156], body: [36, 40, 226, 470], leader: [680, 256, 106, 274] },
  mars: { file: 'mars-v3.webp', head: [722, 26, 114, 154], body: [34, 28, 212, 464], leader: [706, 340, 92, 188] },
  jupiter: { file: 'jupiter.webp', head: [744, 26, 108, 176], body: [36, 38, 198, 486], leader: [664, 246, 106, 282] },
  saturn: { file: 'saturn-v3.webp', head: [680, 28, 166, 192], body: [36, 44, 220, 480], leader: [728, 296, 104, 232] },
};

const argDir = process.argv.slice(2).find((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--sheet');
const dir = argDir ? resolve(argDir)
  : [join(ROOT, '../../../art-refit/refs/races'), join(ROOT, 'art-refit/refs/races')].find((d) => existsSync(d));
if (!dir || !existsSync(dir)) throw new Error('No sheet folder: pass the path to art-refit/refs/races');

const out = [];
for (const [nation, s] of Object.entries(SHEETS)) {
  const src = join(dir, s.file);
  const meta = await sharp(src).metadata();
  const to = join(ROOT, 'public/races', nation);
  mkdirSync(to, { recursive: true });
  for (const part of ['head', 'body', 'leader']) {
    const box = s[part];
    if (!box) continue;
    const [left, top, width, height] = box;
    if (left + width > meta.width || top + height > meta.height) throw new Error(`${nation} ${part}: box leaves the ${meta.width}×${meta.height} sheet`);
    const file = join(to, `${part}.webp`);
    await sharp(src).extract({ left, top, width, height }).webp({ quality: 90, effort: 6 }).toFile(file);
    out.push({ nation, part, file, width, height });
    console.log(`${nation}/${part}.webp ${width}×${height}`);
  }
}

const si = process.argv.indexOf('--sheet');
if (si > 0 && process.argv[si + 1]) {
  // One contact image per people, on magenta so a box that bites into a border or a neighbour shows.
  const at = resolve(process.argv[si + 1]);
  mkdirSync(at, { recursive: true });
  const pad = 8;
  for (const n of Object.keys(SHEETS)) {
    const r = out.filter((o) => o.nation === n);
    const composites = [];
    let x = pad;
    for (const o of r) { composites.push({ input: o.file, left: x, top: pad }); x += o.width + pad; }
    const H = Math.max(...r.map((o) => o.height)) + 2 * pad;
    await sharp({ create: { width: x, height: H, channels: 3, background: '#ff00ff' } }).composite(composites).png().toFile(join(at, `${n}.png`));
  }
  console.log(`contact sheets: ${at}`);
}

// Turn Gemini downloads (gemini-in/) into game assets. GEMINI-PROMPTS.md names each subject and its file.
//   node scripts/gemini-clean.mjs [in-dir]
// Portraits: trim any flat border, cut a centred box at the people's head aspect (lib/raceArt.ts / crop-races.mjs
// boxes), biased up so the face sits in the upper half, resize to 3 × the display size, write
// public/races/<people>/head.webp. Key art: cover-crop to 16:9 at 1920 × 1080, public/art/title-keyart.webp.
// Pilots (pass 3): pilot-<people>-<f|m>.* -> public/races/<people>/pilot-<f|m>.webp, one 4:5 box (lib/raceArt.ts
// PILOT_BOX) at 3 x, cut the same way as the heads. Leaders: leader-<people>.* (a full figure, head to feet) ->
// public/races/<people>/leader.webp, trimmed and cover-cropped to the leader box of lib/raceArt.ts at 3 x.
// Also writes shots/graphics-pass-3/gemini-contact.jpg, every result side by side, to check by eye.
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IN = resolve(process.argv[2] ?? join(ROOT, 'gemini-in'));
if (!existsSync(IN)) throw new Error('No input folder ' + IN);

// Display size of each people's head (lib/raceArt.ts), so the new image fits the same box.
const HEAD = { earth: [120, 150], moon: [116, 160], mercury: [124, 168], venus: [116, 156], mars: [114, 154], jupiter: [108, 176], saturn: [166, 192] };
const SCALE = 3;
const PILOT = [160, 200];
// Leader boxes (lib/raceArt.ts RACE_ART[n].leader). Mercury's King of the Field is new in pass 3.
const LEADER = { earth: [118, 230], moon: [104, 294], mercury: [104, 230], venus: [106, 274], mars: [92, 188], jupiter: [106, 282], saturn: [104, 232] };

/** A head-and-shoulders box of the head's aspect: `frac` of the width, centred, from just under the top. */
async function headBox(src, w, h, out, frac = 0.7) {
  const buf = await sharp(src).trim({ threshold: 12 }).toBuffer();
  const meta = await sharp(buf).metadata();
  let bw = Math.round(meta.width * frac), bh = Math.round((bw * h) / w);
  if (bh > meta.height * 0.95) { bh = Math.round(meta.height * 0.95); bw = Math.round((bh * w) / h); }
  const left = Math.round((meta.width - bw) / 2);
  const top = Math.round(Math.min(meta.height - bh, meta.height * 0.02));
  if (bw < w * SCALE) console.log(`warning: ${src} gives ${bw} px across, under ${w * SCALE}`);
  await sharp(buf).extract({ left, top, width: bw, height: bh }).resize(w * SCALE, h * SCALE).webp({ quality: 88 }).toFile(out);
}

const files = readdirSync(IN).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
const done = [];
for (const f of files) {
  const src = join(IN, f);
  const m = f.match(/^(\w+)-portrait\./);
  if (m && HEAD[m[1]]) {
    const [w, h] = HEAD[m[1]];
    const img = sharp(src).trim({ threshold: 12 });
    const buf = await img.toBuffer();
    const meta = await sharp(buf).metadata();
    // A head-and-shoulders box like the sheet crops it replaces: 70% of the width, centred, from just under the top,
    // so the face fills the small codex and HUD frames instead of the armour.
    let bw = Math.round(meta.width * 0.7), bh = Math.round((bw * h) / w);
    if (bh > meta.height * 0.95) { bh = Math.round(meta.height * 0.95); bw = Math.round((bh * w) / h); }
    const left = Math.round((meta.width - bw) / 2);
    const top = Math.round(Math.min(meta.height - bh, meta.height * 0.02));
    const outDir = join(ROOT, 'public/races', m[1]);
    mkdirSync(outDir, { recursive: true });
    const out = join(outDir, 'head.webp');
    await sharp(buf).extract({ left, top, width: bw, height: bh }).resize(w * SCALE, h * SCALE).webp({ quality: 88 }).toFile(out);
    done.push(out);
    continue;
  }
  const lm = f.match(/^leader-(\w+)\./);
  if (lm && LEADER[lm[1]]) {
    const [w, h] = LEADER[lm[1]];
    const out = join(ROOT, 'public/races', lm[1], 'leader.webp');
    await sharp(src).trim({ threshold: 12 }).resize(w * SCALE, h * SCALE, { fit: 'cover', position: 'centre' }).webp({ quality: 88 }).toFile(out);
    done.push(out);
    continue;
  }
  const pm = f.match(/^pilot-(\w+)-([fm])\./);
  if (pm && HEAD[pm[1]]) {
    const outDir = join(ROOT, 'public/races', pm[1]);
    mkdirSync(outDir, { recursive: true });
    const out = join(outDir, `pilot-${pm[2]}.webp`);
    await headBox(src, PILOT[0], PILOT[1], out, 0.78);
    done.push(out);
    continue;
  }
  if (/^title-keyart\./.test(f)) {
    mkdirSync(join(ROOT, 'public/art'), { recursive: true });
    const out = join(ROOT, 'public/art/title-keyart.webp');
    await sharp(src).trim({ threshold: 12 }).resize(1920, 1080, { fit: 'cover', position: 'centre' }).webp({ quality: 86 }).toFile(out);
    done.push(out);
    continue;
  }
  console.log('skipped (no rule):', f);
}

// Contact sheet.
if (done.length) {
  const th = 300;
  const tiles = await Promise.all(done.map(async (p) => {
    const b = await sharp(p).resize({ height: th }).toBuffer();
    return { b, w: (await sharp(b).metadata()).width };
  }));
  const W = tiles.reduce((a, t) => a + t.w + 8, 8);
  let x = 8;
  const comp = tiles.map((t) => { const c = { input: t.b, left: x, top: 8 }; x += t.w + 8; return c; });
  mkdirSync(join(ROOT, 'shots/graphics-pass-3'), { recursive: true });
  await sharp({ create: { width: W, height: th + 16, channels: 3, background: '#14141a' } }).composite(comp).jpeg({ quality: 85 }).toFile(join(ROOT, 'shots/graphics-pass-3/gemini-contact.jpg'));
}
console.log(done.join('\n') || 'nothing written');

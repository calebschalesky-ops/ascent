// Graphics-pass tour: headless Chrome on the real GPU (ANGLE D3D11) over CDP against this worktree's dev server.
//   node scripts/gp.mjs <prefix> [scene,scene,...]       e.g. node scripts/gp.mjs before   |   node scripts/gp.mjs after mars,fight-mars
// Writes shots/graphics-pass/<prefix>-<scene>.jpg. UI scenes are Page.captureScreenshot (what the player sees, HUD and
// all); 3D beauty scenes read the canvas in the same task as the render (artrefit.shoot) and return it as a data URL.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.ROOT || fileURLToPath(new URL('..', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '');
const OUT = ROOT + '/shots/' + (process.env.OUTDIR || 'graphics-pass-3');
mkdirSync(OUT, { recursive: true });
const W = 1280, H = 720;
const PORT = process.env.PORT || '5410';
const prefix = process.argv[2] || 'before';
const only = process.argv[3] ? new Set(process.argv[3].split(',')) : null;

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dport = 9300 + Math.floor(Math.random() * 500);
const prof = mkdtempSync(join(tmpdir(), 'cdp-gp-'));
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${dport}`, `--user-data-dir=${prof}`, '--use-angle=d3d11', '--enable-gpu',
  '--ignore-gpu-blocklist', `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 150 && !ws; i++) {
  await sleep(200);
  try {
    const page = (await (await fetch(`http://127.0.0.1:${dport}/json`)).json()).find((t) => t.type === 'page');
    if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
  } catch { /* starting */ }
}
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
const logs = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 300));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push('ERR ' + m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 300));
});
const send = (method, params = {}) => Promise.race([
  new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); }),
  sleep(120000).then(() => ({ result: { result: { value: 'TIMEOUT ' + method } } })),
]);
const ev = async (expr) => {
  const m = await send('Runtime.evaluate', { expression: `(async()=>{ ${expr} })()`, awaitPromise: true, returnByValue: true });
  if (m.result?.exceptionDetails) return 'ERROR ' + (m.result.exceptionDetails.exception?.description ?? JSON.stringify(m.result.exceptionDetails)).slice(0, 400);
  return m.result?.result?.value;
};
const file = (name) => join(OUT, `${prefix}-${name}.jpg`);
const snap = async (name) => {
  const m = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
  writeFileSync(file(name), Buffer.from(m.result.data, 'base64'));
  console.log('shot', name);
};
const saveUrl = (name, url) => {
  if (typeof url !== 'string' || !url.startsWith('data:')) { console.log('FAIL', name, String(url).slice(0, 300)); return; }
  writeFileSync(file(name), Buffer.from(url.replace(/^data:image\/\w+;base64,/, ''), 'base64'));
  console.log('shot', name);
};
const SAYLEN = +(process.env.SAYLEN || 400);
const say = (k, v) => console.log(k, typeof v === 'string' ? v.slice(0, SAYLEN) : JSON.stringify(v)?.slice(0, SAYLEN));
const want = (n) => !only || only.has(n);

const HELP = `
window.__gp = {
  click(re, root = document) {
    const r = new RegExp(re);
    const b = [...root.querySelectorAll('button, [role=tab], a')].find((x) => x.offsetParent !== null && (r.test(x.textContent.trim()) || r.test(x.getAttribute('aria-label') || '')));
    if (!b) return 'no ' + re;
    b.click(); return 'clicked ' + (b.textContent.trim() || b.getAttribute('aria-label')).slice(0, 40);
  },
  key(k, code = k) { for (const t of ['keydown', 'keyup']) window.dispatchEvent(new KeyboardEvent(t, { key: k, code, bubbles: true })); },
  closeCard() { const c = document.querySelector('.arrival-card .close, [aria-label=Close]'); if (c && c.offsetParent) { c.click(); return 'closed'; } return 'none'; },
  wait: (ms) => new Promise((r) => setTimeout(r, ms)),
};`;

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: `http://localhost:${PORT}/` });
await sleep(5000);
await ev(HELP);
await ev(`for (const s of ['/scripts/artrefit.js', '/scripts/shots.js', '/scripts/armourtest.js', '/scripts/airtest.js', '/scripts/gpscenes.js']) await fetch(s, { cache: 'reload' }); return 'ok';`);

// ---- Menus and the opening (screen session's territory for layout; shot here for the art in them) ----
if (want('title')) await snap('title');
if (want('codex')) {
  say('codex', await ev(`return __gp.click('^Peoples of the System$');`)); await sleep(1500);
  await snap('codex-humans');
  for (const [tab, n] of [['Selenitai', 'moon'], ['Hemerodromoi', 'mercury'], ['Nephelai', 'venus'], ['Quirites', 'mars'], ['Diadochoi', 'jupiter'], ['Autochthones', 'saturn']]) {
    say(tab, await ev(`return __gp.click('^${tab}$');`)); await sleep(1100);
    await snap('codex-' + n);
  }
  say('close codex', await ev(`return __gp.click('^Close|^×$|close', document.querySelector('.codex') || document);`)); await sleep(600);
}
say('new', await ev(`return __gp.click('^New game$');`)); await sleep(1500);
if (want('opening')) {
  await snap('opening-people');
  say('pick mars', await ev(`return __gp.click('Quirites');`)); await sleep(1200);
  await snap('opening-people-mars');
  say('pick earth', await ev(`return __gp.click('Humans');`)); await sleep(800);
}
say('play', await ev(`return __gp.click('^Play the');`)); await sleep(1500);
if (want('opening')) await snap('opening-pilot');
say('hangar', await ev(`return __gp.click('^To the hangar');`)); await sleep(2000);
if (want('opening')) await snap('opening-hangar');
say('launch', await ev(`return __gp.click('^Launch the shakedown');`)); await sleep(9000);
say('flight', await ev(`return { v: !!window.__voyage, kids: __voyage?.scene.children.length, card: __gp.closeCard() };`)); await sleep(600);
if (want('shakedown')) await snap('shakedown');
say('skip', await ev(`const r = __gp.click('^Skip tutorial$'); await __gp.wait(500); return r + ' / ' + __gp.click('^Skip$');`)); await sleep(2500);
say('launch card', await ev(`const b = [...document.querySelectorAll('.launch-btns button')]; const t = b.map((x) => x.textContent); b[b.length - 1]?.click(); return t;`)); await sleep(800);
if (want('start')) await snap('start-earth');

// ---- 3D scenes, defined in scripts/gpscenes.js so the page owns the posing ----
say('scenes', await ev(`window.G = await import('/scripts/gpscenes.js?t=' + Date.now()); await G.init(); return Object.keys(G.SCENES);`));
const names = await ev(`return Object.keys(G.SCENES);`);
for (const n of Array.isArray(names) ? names : []) {
  if (!want(n)) continue;
  const r = await ev(`try { return await G.SCENES['${n}'](); } catch (e) { return 'ERROR ' + (e.stack || e).toString().slice(0, 300); }`);
  if (r && typeof r === 'object' && r.dump) { writeFileSync(join(OUT, `${prefix}-${n}.json`), JSON.stringify(r.dump, null, 1)); say('  ' + n, 'dump written'); continue; }
  if (r && typeof r === 'object' && r.url) { saveUrl(n, r.url); if (r.info) say('  ' + n, r.info); }
  else if (r === 'screen' || (r && r.screen)) { await sleep(r?.wait ?? 300); await snap(n); if (r?.info) say('  ' + n, r.info); if (r?.after) say('  after', await ev(r.after)); }
  else say('FAIL ' + n, r);
}

say('logs', logs.slice(0, 30));
ws.close();
proc.kill();
process.exit(0);

// Pass-3 proof shots: headless Chrome (real GPU) over CDP against the integration-3 dev server on :5321.
// UI shots are Page.captureScreenshot; planet heroes come from scripts/artrefit.js, which POSTs the canvas to :5343.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT = '<repo>/shots/pass-3';
mkdirSync(OUT, { recursive: true });
const W = 1440, H = 900;
const only = process.argv[2] || 'all';

const rx = createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const name = decodeURIComponent(req.url.slice(1)).replace(/[^\w.-]/g, '_');
    const b64 = body.replace(/^data:image\/\w+;base64,/, '');
    writeFileSync(join(OUT, `${name}.jpg`), Buffer.from(b64, 'base64'));
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end('saved ' + name);
  });
});
rx.listen(5343);

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9300 + Math.floor(Math.random() * 500);
const prof = mkdtempSync(join(tmpdir(), 'cdp-p3-'));
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--use-angle=d3d11', '--enable-gpu',
  '--ignore-gpu-blocklist', `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 150 && !ws; i++) {
  await sleep(200);
  try {
    const page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page');
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
  sleep(60000).then(() => ({ result: { result: { value: 'TIMEOUT ' + method } } })),
]);
const ev = async (expr) => {
  const m = await send('Runtime.evaluate', { expression: `(async()=>{ ${expr} })()`, awaitPromise: true, returnByValue: true });
  if (m.result?.exceptionDetails) return 'ERROR ' + (m.result.exceptionDetails.exception?.description ?? JSON.stringify(m.result.exceptionDetails)).slice(0, 400);
  return m.result?.result?.value;
};
const snap = async (name) => {
  const m = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
  writeFileSync(join(OUT, `${name}.jpg`), Buffer.from(m.result.data, 'base64'));
  console.log('shot', name);
};
const say = (k, v) => console.log(k, typeof v === 'string' ? v : JSON.stringify(v));

// Page helpers: click the first visible button whose text or aria-label matches.
const HELP = `
window.__p3 = {
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
await send('Page.navigate', { url: 'http://127.0.0.1:5321/' });
await sleep(4000);
await ev(HELP);
// Fresh scripts, as the shared memory notes require.
say('reload', await ev(`for (const s of ['/scripts/artrefit.js', '/scripts/shots.js']) await fetch(s, { cache: 'reload' }); return 'ok';`));

await snap('01-title');
say('codex', await ev(`return __p3.click('^Peoples of the System$');`)); await sleep(1500);
await snap('02-codex-humans');
say('mars tab', await ev(`return __p3.click('^Quirites$');`)); await sleep(1200);
await snap('03-codex-quirites');
say('jupiter tab', await ev(`return __p3.click('^Diadochoi$');`)); await sleep(1200);
await snap('04-codex-diadochoi');
say('close codex', await ev(`return __p3.click('^Close|^×$|close', document.querySelector('.codex, [class*=codex]') || document);`)); await sleep(600);

say('new', await ev(`return __p3.click('^New game$');`)); await sleep(1500);
await snap('05-home-picker-earth');
say('pick mars', await ev(`return __p3.click('Quirites');`)); await sleep(1200);
await snap('06-home-picker-mars');
say('pick earth', await ev(`return __p3.click('Humans');`)); await sleep(800);
say('play', await ev(`return __p3.click('^Play the');`)); await sleep(1500);
await snap('07-pilot-step');
say('hangar', await ev(`return __p3.click('^To the hangar');`)); await sleep(1500);
await snap('08-hangar');
say('launch', await ev(`return __p3.click('^Launch the shakedown');`)); await sleep(9000);
say('flight', await ev(`return { v: !!window.__voyage, kids: __voyage?.scene.children.length, card: __p3.closeCard() };`)); await sleep(600);
await snap('09-flight-hud-hotbar-tutorial');

say('skip', await ev(`const r = __p3.click('^Skip tutorial$'); await __p3.wait(500); return r + ' / ' + __p3.click('^Skip$');`)); await sleep(2500);
await snap('10-launch-card');
say('launch card', await ev(`const b = [...document.querySelectorAll('.launch-btns button')]; const t = b.map((x) => x.textContent); b[b.length - 1]?.click(); return t;`)); await sleep(800);

say('menu', await ev(`__p3.key('Escape'); await __p3.wait(700); return __p3.click('^Controls$');`)); await sleep(1000);
await snap('11-controls-list');
say('settings', await ev(`__p3.click('^Back$|^‹|Done'); await __p3.wait(400); return __p3.click('^Settings$');`)); await sleep(800);
say('keys', await ev(`const r = __p3.click('Key bindings'); await __p3.wait(600); document.querySelector('.keybinds, [class*=keybind]')?.scrollIntoView({ block: 'start' }); return r;`)); await sleep(800);
await snap('12-keybinds');
say('unpause', await ev(`__p3.key('Escape'); await __p3.wait(300); if (document.querySelector('.game-menu-backdrop')) { __p3.key('Escape'); await __p3.wait(300); } return !document.querySelector('.game-menu-backdrop');`)); await sleep(800);

// Planet heroes with armour, the art-refit poses.
say('artrefit', await ev(`window.A = await import('/scripts/artrefit.js?t=' + Date.now()); return Object.keys(A);`));
for (const p of ['earth', 'mars', 'jupiter', 'saturn']) {
  say(p, await ev(`const r = await A.hero('${p}', '${({ earth: 13, mars: 14, jupiter: 15, saturn: 16 })[p]}-${p}-armour'); return r;`));
}

// The same worlds from the cockpit, with the HUD: the ship parked at a three-quarter view, the info card closed.
for (const [i, p] of [[17, 'saturn'], [18, 'mars']]) {
  say(p + ' hud', await ev(`
    const g = A.geo('${p}'); const S = await import('/scripts/shots.js?t=' + Date.now());
    const k = ${p === 'saturn' ? 3.2 : 3.6} * g.size;
    const pos = [g.pos[0] + k * 0.75, g.pos[1] + k * 0.3, g.pos[2] + k * 0.6];
    S.pose(pos, g.pos, 1.0);
    await __p3.wait(1500);
    return [__p3.closeCard(), Math.round(g.size * 100) / 100];`));
  await sleep(700);
  await ev(`__p3.closeCard();`);
  await snap(`${i}-flight-${p}-hud`);
}

// A fight: park behind a hostile ship near Mars with the guns going and let the enemy AI answer.
say('fight', await ev(`
  const v = __voyage; const S = await import('/scripts/shots.js?t=' + Date.now());
  const m = A.geo('mars');
  const foes = v.combat.crafts.filter((c) => c.alive && c.hostile && !c.drill);
  foes.sort((a, b) => Math.hypot(...a.pos.map((x, i) => x - m.pos[i])) - Math.hypot(...b.pos.map((x, i) => x - m.pos[i])));
  const f = foes.find((c) => c.type === 'cruiser') ?? foes[0];
  if (!f) return 'no foes';
  const back = f.radius * 5;
  const pos = [f.pos[0] + back, f.pos[1] + back * 0.25, f.pos[2] + back];
  S.pose(pos, f.pos, 0.3);
  v.firing.current = true;
  await __p3.wait(2500);
  __p3.closeCard();
  return { foe: f.nation + ' ' + f.type, foes: foes.length, kills: v.combat.stats.kills, shots: Object.values(v.arsenal.stats).reduce((a, s) => a + s.shots, 0) };`));
await snap('19-fight');
await sleep(1500);
await snap('20-fight-later');
say('fight end', await ev(`__voyage.firing.current = false; return { kills: __voyage.combat.stats.kills, hits: Object.values(__voyage.arsenal.stats).reduce((a, s) => a + s.hits, 0), hull: __voyage.hull.current };`));

say('logs', logs.slice(0, 30));
ws.close();
proc.kill();
rx.close();
process.exit(0);

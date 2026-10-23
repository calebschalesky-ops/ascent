// Full-page screenshots of the flight view, HUD included, from a headless Chrome driven over the DevTools protocol.
//   node scripts/hudshot.mjs <out.png> <width> <height> [script]
// `script` is page JS run after "New flight" (for example to open the menu). Needs the dev server on :5301.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [out, w = '1280', h = '720', extra = ''] = process.argv.slice(2);
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9300 + Math.floor(Math.random() * 500);
const prof = mkdtempSync(join(tmpdir(), 'hudshot-'));
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', `--window-size=${w},${h}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 50 && !ws; i++) {
  await sleep(200);
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    const page = list.find((t) => t.type === 'page');
    if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
  } catch { /* not up yet */ }
}
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

const mobile = +w < 600;
await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: mobile ? 2 : 1, mobile });
if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await send('Page.enable');
await send('Page.navigate', { url: 'http://localhost:5301/' });
await sleep(4000);
await evalJs(`(async()=>{ for (let i=0;i<60 && !window.__voyage;i++){ [...document.querySelectorAll('button')].find(b=>/New flight/.test(b.textContent))?.click(); await new Promise(r=>setTimeout(r,250)); } await new Promise(r=>setTimeout(r,3000)); return !!window.__voyage; })()`);
if (extra) await evalJs(`(async()=>{ ${extra} })()`);
await sleep(1500);
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
console.log('saved', out, await evalJs('JSON.stringify([innerWidth, document.documentElement.scrollWidth])'));
ws.close();
proc.kill();

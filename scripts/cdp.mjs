// Run page JS in the flight view of a headless Chrome on the real GPU (ANGLE D3D11), driven over the DevTools
// protocol, and print the result. Timers are not throttled the way a hidden browser pane's are.
//   node scripts/cdp.mjs "<async page js; return a value>" [width] [height]
// The page has `S` (scripts/shots.js) loaded and a flight started. Needs the dev server on :5301 and, for S.cap,
// the frame receiver on :5309.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [js, w = '1280', h = '720'] = process.argv.slice(2);
const PORT = process.env.PORT || '5301';
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9300 + Math.floor(Math.random() * 500);
const prof = mkdtempSync(join(tmpdir(), 'cdp-'));
const flags = ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', `--window-size=${w},${h}`, 'about:blank'];
const proc = spawn(chrome, flags, { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 50 && !ws; i++) {
  await sleep(200);
  try {
    const page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page');
    if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
  } catch { /* starting */ }
}
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expr) => {
  const m = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (m.result?.exceptionDetails) return 'ERROR ' + JSON.stringify(m.result.exceptionDetails.exception?.description ?? m.result.exceptionDetails);
  return m.result?.result?.value;
};
await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: false });
await send('Page.enable');
await send('Page.navigate', { url: `http://localhost:${PORT}/` });
await sleep(3000);
const ready = await evalJs(`(async()=>{ for (let i=0;i<80 && !window.__voyage;i++){ [...document.querySelectorAll('button')].find(b=>/New flight/.test(b.textContent))?.click(); await new Promise(r=>setTimeout(r,250)); }
  for (let i=0;i<80 && window.__voyage.scene.children.length < 30;i++) await new Promise(r=>setTimeout(r,250));
  window.S = await import('/scripts/shots.js?t='+Date.now()); return window.__voyage.scene.children.length; })()`);
const gpu = await evalJs(`(()=>{const gl=__voyage.renderer.getContext(); const e=gl.getExtension('WEBGL_debug_renderer_info'); return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'?'})()`);
console.log('ready', ready, gpu);
console.log(JSON.stringify(await evalJs(`(async()=>{ ${js} })()`), null, 1));
ws.close();
proc.kill();

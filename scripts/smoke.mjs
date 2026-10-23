// The merge gate's boot check (HOUSE-RULES 4.5): `npm run smoke`.
//   1. Starts Vite on [::1]:5290 (in this process; its cache in the OS temp dir, not through the shared node_modules).
//   2. Opens http://[::1]:5290/?skirmish&probe in headless Chrome (as scripts/cdp.mjs does) and calls __probe.smoke():
//      boot the skirmish, advance 60 s, {ok, errors[], frames}.
//   3. Opens the voyage game at http://[::1]:5290/?probe and checks it boots with zero console errors.
//   4. Prints the result and exits non-zero on any failure. Always closes Chrome and Vite, pass or fail.
// Port 5290 belongs to the gate: do not use it for anything else.
import { spawn, execSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 5290;
const BASE = `http://[::1]:${PORT}`;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const WATCHDOG_MS = 180_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const stamp = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;

let server = null;
let chrome = null;
let ws = null;
let prof = null;

function killTree(proc) {
  if (!proc || proc.exitCode !== null) return;
  try {
    if (process.platform === 'win32') execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' });
    else proc.kill('SIGKILL');
  } catch { /* already gone */ }
}

async function cleanup() {
  try { ws?.close(); } catch { /* closed */ }
  killTree(chrome);
  try { await server?.close(); } catch { /* closed */ }
  if (prof) { await sleep(300); try { rmSync(prof, { recursive: true, force: true }); } catch { /* chrome still holds a file */ } }
}

async function main() {
  const { createServer } = await import('vite');
  server = await createServer({
    root: ROOT,
    configFile: join(ROOT, 'vite.config.ts'),
    cacheDir: join(tmpdir(), 'ascent-flight-smoke-vite'),
    logLevel: 'error',
    clearScreen: false,
    server: { port: PORT, strictPort: true, host: '::1' },
  });
  await server.listen();
  console.log(`[${stamp()}] vite on ${BASE}`);

  const port = 9300 + Math.floor(Math.random() * 500);
  prof = mkdtempSync(join(tmpdir(), 'smoke-cdp-'));
  chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--use-angle=d3d11', '--enable-gpu',
    '--ignore-gpu-blocklist', '--window-size=1280,720', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
  let chromeError = null;
  chrome.on('error', (e) => { chromeError = e; });
  for (let i = 0; i < 75 && !ws && !chromeError; i++) {
    await sleep(200);
    try {
      const page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page');
      if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
    } catch { /* starting */ }
  }
  if (!ws) throw new Error(`headless Chrome did not start (${CHROME})${chromeError ? ': ' + chromeError.message : ''}`);
  await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });

  let id = 0;
  const pending = new Map();
  let errors = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'assert')) {
      errors.push('console.error: ' + m.params.args.map((a) => a.value ?? a.description ?? a.type).join(' '));
    } else if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      errors.push('uncaught: ' + (d.exception?.description ?? d.text));
    } else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      errors.push(`log: ${m.params.entry.text}${m.params.entry.url ? ' ' + m.params.entry.url : ''}`);
    }
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const evalJs = async (expr) => {
    const m = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (m.result?.exceptionDetails) throw new Error(m.result.exceptionDetails.exception?.description ?? JSON.stringify(m.result.exceptionDetails));
    return m.result?.result?.value;
  };
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

  const open = async (path, ready, label) => {
    errors = [];
    await send('Page.navigate', { url: BASE + path });
    for (let i = 0; i < 240; i++) {
      await sleep(250);
      try { if (await evalJs(ready)) return true; } catch { /* reloading */ }
    }
    throw new Error(`${label} did not become ready in 60 s`);
  };

  // 1. The skirmish.
  await open('/?skirmish&probe', `!!(window.__probe && window.__probe.keys().driver)`, 'skirmish');
  await sleep(1500); // let a first-run dependency reload happen before the run starts
  await open('/?skirmish&probe', `!!(window.__probe && window.__probe.keys().driver)`, 'skirmish');
  const skirmish = await evalJs('window.__probe.smoke()');
  const skirmishPageErrors = [...errors];
  const gpu = await evalJs(`(()=>{const c=document.querySelector('canvas'); const gl=c&&(c.getContext('webgl2')||c.getContext('webgl')); const e=gl&&gl.getExtension('WEBGL_debug_renderer_info'); return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'?'})()`);
  console.log(`[${stamp()}] skirmish smoke: ok=${skirmish.ok} frames=${skirmish.frames} checks=${JSON.stringify(skirmish.checks)} gpu=${gpu}`);
  for (const e of skirmish.errors) console.log('  probe error: ' + e);
  for (const e of skirmishPageErrors) console.log('  page error: ' + e);

  // 2. The voyage game still boots.
  await open('/?probe', `!!(window.__probe && document.querySelector('#root') && document.querySelector('#root').children.length > 0 && !document.querySelector('.loading'))`, 'voyage');
  await sleep(4000); // let it settle: a late error counts
  const voyageErrors = [...errors];
  const voyage = { ok: voyageErrors.length === 0, errors: voyageErrors, probe: await evalJs('typeof window.__probe') };
  console.log(`[${stamp()}] voyage boot: ok=${voyage.ok} probe=${voyage.probe} errors=${voyageErrors.length}`);
  for (const e of voyageErrors) console.log('  page error: ' + e);

  const ok = skirmish.ok && skirmishPageErrors.length === 0 && voyage.ok;
  console.log(`SMOKE ${ok ? 'PASS' : 'FAIL'}: skirmish ${skirmish.ok && skirmishPageErrors.length === 0 ? 'pass' : 'fail'} (${skirmish.frames} frames, 60 s), voyage ${voyage.ok ? 'pass' : 'fail'} (${stamp()})`);
  return ok;
}

const watchdog = setTimeout(async () => { console.log('SMOKE FAIL: watchdog, over ' + WATCHDOG_MS / 1000 + ' s'); await cleanup(); process.exit(1); }, WATCHDOG_MS);
let ok = false;
try {
  ok = await main();
} catch (e) {
  console.log('SMOKE FAIL: ' + (e?.stack ?? e));
} finally {
  clearTimeout(watchdog);
  await cleanup();
}
process.exit(ok ? 0 : 1);

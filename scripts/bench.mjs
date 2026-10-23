// `npm run bench` (PKG-23): the wall-clock bars, moved out of the vitest suite so a loaded machine cannot fail the gate.
// Each bar is a test named "bench: ..." that runs only when ASCENT_BENCH=1 (it.runIf). This runs them alone, one worker,
// and exits non-zero if any fails. Run it on a quiet machine: the bars are timings, and they mean nothing under load.
//
// Registry: one line per file that holds a bench test. Add a line; do not move a bar into the suite.
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BARS = [
  'src/lib/swarm/swarm.test.ts', // PKG-23: hundreds of drones step in under 8 ms
];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VITEST = join(ROOT, 'node_modules', 'vitest', 'vitest.mjs');
const t0 = Date.now();
const r = spawnSync(process.execPath, [VITEST, 'run', ...BARS, '-t', 'bench:', '--maxWorkers=1', '--silent=false', '--reporter=verbose'], {
  cwd: ROOT,
  env: { ...process.env, ASCENT_BENCH: '1' },
  encoding: 'utf8',
});
const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
const lines = out.split(/\r?\n/);
const ran = lines.filter((l) => /bench:/.test(l) && /[✓×]/.test(l));
const said = lines.filter((l) => /ms a step|ms\b.*bench/.test(l) && !/[✓×]/.test(l));
for (const l of said) console.log(l.trim());
for (const l of ran) console.log(l.trim());
const ok = r.status === 0 && ran.length > 0 && ran.every((l) => l.includes('✓'));
if (!ok) console.log(out);
console.log(`bench: ${ok ? 'PASS' : 'FAIL'} · ${ran.length} bar(s) · ${((Date.now() - t0) / 1000).toFixed(1)}s`);
process.exit(ok ? 0 : 1);

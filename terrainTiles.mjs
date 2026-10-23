/**
 * Real terrain tiles (1.5 GB, built by ascent-flight-data/scripts) are served from outside the repo at /terrain/,
 * in dev only, so they never enter git or dist. TERRAIN_DATA overrides where they are.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const TYPES = { '.json': 'application/json', '.bin': 'application/octet-stream', '.jpg': 'image/jpeg' };

export function terrainTiles() {
  const root = path.resolve(process.env.TERRAIN_DATA ?? path.join(here, '..', 'ascent-flight-data', 'out'));
  return {
    name: 'terrain-tiles',
    configureServer(server) {
      server.middlewares.use('/terrain', (req, res, next) => {
        const rel = decodeURIComponent((req.url ?? '').split('?')[0]);
        const file = path.join(root, rel);
        if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return next();
        res.setHeader('Content-Type', TYPES[path.extname(file)] ?? 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        fs.createReadStream(file).pipe(res);
      });
      // Dev only: the real-terrain proof shots. POST a JPEG data URL to /__shot/<name> and it lands in
      // shots/real-terrain/<name>.jpg in this checkout.
      server.middlewares.use('/__shot', (req, res, next) => {
        const name = (req.url ?? '').replace(/^\//, '').split('?')[0];
        if (req.method !== 'POST' || !/^[a-z0-9-]{1,60}$/.test(name)) return next();
        let body = '';
        req.on('data', (c) => { body += c; });
        req.on('end', () => {
          const m = /^data:image\/jpeg;base64,(.+)$/.exec(body);
          if (!m) { res.statusCode = 400; res.end('need a JPEG data URL'); return; }
          const dir = path.join(here, 'shots', 'real-terrain');
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, name + '.jpg'), Buffer.from(m[1], 'base64'));
          res.end('ok');
        });
      });
    },
  };
}

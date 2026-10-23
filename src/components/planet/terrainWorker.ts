/**
 * Builds patches of ground off the main thread, so streaming terrain never stalls a frame. Each worker holds its own
 * cache of the body's real tiles (the pool sends a patch to the worker that owns its tile), and fetches a patch's
 * height and colour tiles before building it. Without tiles (none served, or a fetch fails) it builds the made-up
 * shape, so the ground never goes missing.
 */
import { buildChunk, chunkTiles } from './chunk';
import type { ChunkRequest } from './chunk';
import { loadRealTerrain } from '../../lib/realTerrain';

const ctx = self as unknown as { onmessage: ((e: MessageEvent) => void) | null; postMessage: (m: unknown, t: Transferable[]) => void };
ctx.onmessage = async (e: MessageEvent<{ id: number; req: ChunkRequest; real?: boolean }>) => {
  const { id, req, real } = e.data;
  if (real) {
    const s = await loadRealTerrain(req.body, false);
    if (s.ready) {
      const t = chunkTiles(s, req.node);
      await Promise.all([s.ensure(t.h.L, t.h.f, t.h.i, t.h.j), t.c ? s.ensureColour(t.c.L, t.c.f, t.c.i, t.c.j) : null]);
    }
  }
  const d = buildChunk(req);
  ctx.postMessage({ id, data: d }, [d.positions.buffer, d.normals.buffer, d.colors.buffer]);
};

import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { publicStoreInfo } from './adapters/index.js';
import { POPULAR, SEED_TITLES } from './catalog.js';
import { tokenize } from './matching/normalize.js';

export function createApp({ adapters, searchService, db }) {
  const app = express();
  app.disable('x-powered-by');
  // Behind a host's proxy (Render/Fly), so req.ip is the real visitor for rate limiting.
  app.set('trust proxy', 1);

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // Tiny per-IP limiter for our own API (protects the stores behind us too).
  const hits = new Map();
  app.use('/api/search', (req, res, next) => {
    const ip = req.ip || 'x';
    const now = Date.now();
    const arr = (hits.get(ip) || []).filter((t) => now - t < 60_000);
    if (arr.length >= 30) return res.status(429).json({ error: 'Too many searches, try again in a minute' });
    arr.push(now);
    hits.set(ip, arr);
    next();
  });

  app.get('/api/stores', (_req, res) => res.json(adapters.map(publicStoreInfo)));

  app.get('/api/popular', (_req, res) => res.json(POPULAR));

  app.get('/api/suggest', (req, res) => {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json([]);
    res.json(suggest(q, db));
  });

  // Non-streaming: waits for all stores. Handy for scripts / curl.
  app.get('/api/search', async (req, res) => {
    const q = validQuery(req, res); if (!q) return;
    const result = await searchService.search(q);
    res.json(result);
  });

  // Streaming: Server-Sent Events, one "store" event per store as it finishes.
  app.get('/api/search/stream', async (req, res) => {
    const q = validQuery(req, res); if (!q) return;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    send('start', { query: q, stores: adapters.map(publicStoreInfo) });
    let closed = false;
    req.on('close', () => { closed = true; });
    await searchService.search(q, (evt) => { if (!closed) send('store', evt); });
    if (!closed) { send('done', {}); res.end(); }
  });

  // Game cover thumbnails (built by .github/workflows/thumbs.yml into thumbs/out).
  const thumbsDir = path.resolve(new URL('.', import.meta.url).pathname, '../../thumbs');
  let thumbMap = {};
  try {
    const list = JSON.parse(fs.readFileSync(path.join(thumbsDir, 'urls.json'), 'utf8'));
    thumbMap = Object.fromEntries(list.filter((t) => fs.existsSync(path.join(thumbsDir, 'out', t.file))).map((t) => [t.key, t.file]));
  } catch { /* no thumbnails built yet */ }
  app.get('/api/thumbs', (_req, res) => res.set('Cache-Control', 'public, max-age=3600').json(thumbMap));
  app.use('/thumbs', express.static(path.join(thumbsDir, 'out'), { maxAge: '7d', immutable: true }));

  // Ready for the future price-history UI.
  app.get('/api/history', (req, res) => {
    const key = tokenize(String(req.query.q || '')).join(' ');
    if (!key) return res.status(400).json({ error: 'q required' });
    res.json(db ? db.history(key) : []);
  });

  // Serve the built frontend in production.
  const dist = path.resolve(new URL('.', import.meta.url).pathname, '../../client/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  return app;
}

function validQuery(req, res) {
  const q = String(req.query.q || '').trim().slice(0, 80);
  if (q.length < 2) { res.status(400).json({ error: 'Search for at least 2 characters' }); return null; }
  return q;
}

function suggest(q, db) {
  const qt = tokenize(q);
  const last = qt.at(-1) || '';
  const full = qt.slice(0, -1);
  const pool = new Map();
  for (const t of SEED_TITLES) pool.set(tokenize(t).join(' '), t);
  for (const { key, display } of db?.knownTitles() || []) if (!pool.has(key)) pool.set(key, display);
  const scored = [];
  for (const [key, display] of pool) {
    const tt = key.split(' ');
    if (!full.every((w) => tt.includes(w))) continue;
    const prefixHit = tt.some((w) => w.startsWith(last));
    if (!prefixHit) continue;
    const startsWith = key.startsWith(qt.join(' ')) ? 1 : 0;
    scored.push({ display, score: startsWith * 10 - tt.length });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, 8).map((s) => s.display);
}

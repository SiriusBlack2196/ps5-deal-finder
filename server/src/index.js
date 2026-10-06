import { config } from './config.js';
import { adapters } from './adapters/index.js';
import { createHttpClient } from './lib/http.js';
import { openDb } from './lib/db.js';
import { createSearchService } from './search.js';
import { createApp } from './app.js';
import { POPULAR } from './catalog.js';

const http = createHttpClient();
const db = openDb(config.dbPath);
const searchService = createSearchService({ adapters, http, db, config });
const app = createApp({ adapters, searchService, db });

app.listen(config.port, () => {
  console.log(`Lowscore API on http://localhost:${config.port}  (http mode: ${http.mode})`);
});

// Warm-up: search the popular titles one at a time so the cache and the
// "Best deals" list have data before the first visitor. Repeats every 6 hours.
// Disable with WARMUP=0.
async function warmUp() {
  for (const t of POPULAR) {
    try { await searchService.search(t); } catch { /* a failed store never matters here */ }
  }
}
if (process.env.WARMUP !== '0' && http.mode !== 'fixtures') {
  setTimeout(warmUp, 5_000);
  setInterval(warmUp, 6 * 3600_000).unref();
}

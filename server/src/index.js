import fs from 'node:fs';
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
// Newest released titles (ratings/dates.json) are warmed too, so "Latest releases" has prices.
function newestTitles(n = 15) {
  try {
    const root = new URL('../../ratings/', import.meta.url);
    const dates = JSON.parse(fs.readFileSync(new URL('dates.json', root), 'utf8'));
    const names = Object.fromEntries(JSON.parse(fs.readFileSync(new URL('titles.json', root), 'utf8')).map((t) => [t.key, t.title]));
    const today = new Date().toISOString().slice(0, 10);
    return Object.entries(dates).filter(([k, d]) => d <= today && names[k]).sort((a, b) => (a[1] < b[1] ? 1 : -1)).slice(0, n).map(([k]) => names[k]);
  } catch { return []; }
}
async function warmUp() {
  for (const t of [...new Set([...POPULAR, ...newestTitles()])]) {
    try { await searchService.search(t); } catch { /* a failed store never matters here */ }
  }
}
if (process.env.WARMUP !== '0' && http.mode !== 'fixtures') {
  setTimeout(warmUp, 5_000);
  setInterval(warmUp, 6 * 3600_000).unref();
}

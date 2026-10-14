// Crawls DACBY's PS5 catalogue (sitemaps + product pages, robots.txt respected) and writes
// the index the dacby adapter searches. Used by .github/workflows/dacby-catalog.yml.
//   node scripts/crawl-dacby.js ../catalog/dacby/dacby.json
import fs from 'node:fs';
import path from 'node:path';
import { createHttpClient } from '../src/lib/http.js';
import { crawlDacby } from '../src/adapters/dacby.js';

const out = process.argv[2];
if (!out) { console.error('usage: crawl-dacby.js <out.json>'); process.exit(1); }

const http = createHttpClient({ fixturesDir: null });
const r = await crawlDacby(http, { log: (m) => console.warn(m) });
console.log(`pages ${r.pages}, failed ${r.failed}, listings ${r.listings.length}`);
if (!r.listings.length) { console.error('no listings; keeping the previous catalogue'); process.exit(1); }
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ at: r.at, pages: r.pages, failed: r.failed, listings: r.listings }, null, 0));

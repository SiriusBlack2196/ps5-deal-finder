// Prints what each store returns for the verification queries, including what
// was filtered out and why — so matching can be checked before Phase 2.
//
//   npm run samples                       # live, hits the stores
//   USE_FIXTURES=1 npm run samples        # captured responses, no network
//   npm run samples -- "Astro Bot"        # custom query
//   npm run samples -- --json > out.json  # machine-readable

import { config } from '../src/config.js';
import { adapters } from '../src/adapters/index.js';
import { createHttpClient } from '../src/lib/http.js';
import { createSearchService } from '../src/search.js';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const queries = args.filter((a) => !a.startsWith('--'));
const QUERIES = queries.length ? queries : ['Spider-Man 2', 'God of War Ragnarok', 'EA FC 25'];

const http = createHttpClient();
const svc = createSearchService({ adapters, http, db: null, config, logger: { warn() {} } });
const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');
const out = [];

for (const q of QUERIES) {
  const res = await svc.search(q);
  out.push(res);
  if (asJson) continue;
  console.log(`\n${'═'.repeat(78)}\n  "${q}"   (${http.mode})\n${'═'.repeat(78)}`);
  for (const s of res.stores) {
    const name = adapters.find((a) => a.id === s.store).name;
    if (s.status === 'error') { console.log(`\n  ✗ ${name}: Couldn't fetch — ${s.error}`); continue; }
    console.log(`\n  ✓ ${name}  (${s.ms} ms)`);
    if (!s.listings.length) console.log('    (no matching PS5 listing)');
    for (const l of s.listings) {
      console.log(`    ${inr(l.price).padEnd(8)} ${l.condition.padEnd(8)} ${l.edition.padEnd(9)} ${(l.inStock ? 'in stock' : 'OUT').padEnd(9)} ${l.matchType.padEnd(7)} ${l.title}`);
    }
    for (const d of s.dropped) console.log(`      · skipped: ${d.title}  [${d.reason}]`);
  }
  const all = res.stores.flatMap((s) => s.listings).filter((l) => l.matchType === 'exact' && l.inStock);
  const bestNew = all.filter((l) => l.condition === 'new').sort((a, b) => a.effectivePrice - b.effectivePrice)[0];
  const bestUsed = all.filter((l) => l.condition === 'preowned').sort((a, b) => a.effectivePrice - b.effectivePrice)[0];
  console.log(`\n  → Best deal (new, in stock): ${bestNew ? `${inr(bestNew.price)} at ${bestNew.store}` : '—'}`);
  console.log(`  → Best pre-owned (in stock): ${bestUsed ? `${inr(bestUsed.price)} at ${bestUsed.store}` : '—'}`);
}
if (asJson) console.log(JSON.stringify(out, null, 2));

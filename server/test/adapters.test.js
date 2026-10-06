import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHttpClient } from '../src/lib/http.js';
import { createSearchService } from '../src/search.js';
import { adapters } from '../src/adapters/index.js';
import { openDb } from '../src/lib/db.js';
import { decodeGameNationUrl, gameNationProductUrl } from '../src/adapters/gamenation.js';
import { wooPrice } from '../src/adapters/woocommerce.js';
import { parseRobots, isPathAllowed } from '../src/lib/robots.js';

const fixturesDir = fileURLToPath(new URL('../fixtures', import.meta.url));
const quiet = { warn() {} };

function service(over = {}) {
  const db = openDb(':memory:');
  const config = { cacheTtlMs: 60_000, adapterTimeoutMs: 6000, ...over };
  return { db, svc: createSearchService({ adapters, http: createHttpClient({ fixturesDir }), db, config, logger: quiet }) };
}
const byStore = (res, id) => res.stores.find((s) => s.store === id);

test('MRP is kept only when higher than the selling price', async () => {
  const { processListings } = await import('../src/matching/pipeline.js');
  const { prepareQuery } = await import('../src/matching/match.js');
  const base = { store: 'x', title: 'Astro Bot PS5', inStock: true, url: 'u', fetchedAt: 't' };
  const { kept } = processListings([
    { ...base, url: 'a', price: 3300, mrp: 3999 },
    { ...base, url: 'b', price: 2699, mrp: 2699 },
    { ...base, url: 'c', price: 2000, mrp: null },
  ], prepareQuery('astro bot'));
  const byUrl = Object.fromEntries(kept.map((l) => [l.url, l]));
  assert.equal(byUrl.a.mrp, 3999); assert.equal(byUrl.a.discountPct, 17);
  assert.equal(byUrl.b.mrp, null); assert.equal(byUrl.c.mrp, null);
});

test('Woo prices respect currency_minor_unit (E2Z paise vs Gameloot rupees)', () => {
  assert.equal(wooPrice({ price: '519900', currency_minor_unit: 2 }), 5199);
  assert.equal(wooPrice({ price: '2599', currency_minor_unit: 0 }), 2599);
});

test('Console Garage: variants expanded, BUYBACK dropped, conditions split', async () => {
  const { svc } = service();
  const res = await svc.search('Spider-Man 2');
  const cg = byStore(res, 'consolegarage');
  assert.equal(cg.status, 'ok');
  const prices = cg.listings.map((l) => [l.condition, l.price]);
  assert.deepEqual(prices, [['preowned', 3300], ['new', 3700]]);
  assert.ok(cg.listings.every((l) => /variant=\d+/.test(l.url)));
  assert.ok(cg.dropped.some((d) => /buyback/.test(d.reason)));
});

test('E2Z: PS4/PC/Xbox copies excluded, PS5 kept', async () => {
  const { svc } = service();
  const fc = byStore(await svc.search('EA FC 25'), 'e2z');
  assert.deepEqual(fc.listings.map((l) => [l.title, l.price]), [['EA Sports FC 25 PS5', 2699]]);
  const gow = byStore(await svc.search('God of War Ragnarok'), 'e2z');
  assert.equal(gow.listings.length, 0);
  assert.match(gow.dropped[0].reason, /ps4/);
});

test('Gameloot: consoles/merch excluded, pre-owned split by category', async () => {
  const { svc } = service();
  const gl = byStore(await svc.search('Spider-Man 2'), 'gameloot');
  assert.deepEqual(gl.listings.map((l) => [l.condition, l.price]), [['new', 2599], ['preowned', 2999]]);
});

test('A failing store never fails the search', async () => {
  const { svc } = service();
  const res = await svc.search('God of War Ragnarok');
  assert.equal(byStore(res, 'gameloot').status, 'error');
  assert.equal(byStore(res, 'gamenation').status, 'error');
  assert.equal(byStore(res, 'consolegarage').status, 'ok');
});

test('Timeouts are enforced per adapter', async () => {
  const slow = { id: 'slow', name: 'Slow', search: () => new Promise(() => {}) };
  const svc = createSearchService({ adapters: [slow], http: {}, db: null, config: { cacheTtlMs: 1000, adapterTimeoutMs: 50 }, logger: quiet });
  const t0 = Date.now();
  const res = await svc.search('anything');
  assert.ok(Date.now() - t0 < 500);
  assert.equal(res.stores[0].error, 'Store took too long to respond');
});

test('Results are cached and every price is recorded with a timestamp', async () => {
  const { svc, db } = service();
  const a = await svc.search('Spider-Man 2');
  const b = await svc.search('spider-man 2');
  assert.equal(byStore(a, 'e2z').cached, false);
  assert.equal(byStore(b, 'e2z').cached, true);
  const hist = db.history('spiderman 2');
  assert.ok(hist.length >= 5);
  assert.ok(hist.every((h) => h.fetchedAt && h.price > 0));
});

test('Game Nation URL scheme round-trips', () => {
  assert.deepEqual(decodeGameNationUrl('https://www.gamenation.in/Products/Games/god-of-war-laufey-ps5-WzU0NTIsMV0'), { id: 5452, condition: 'new' });
  assert.deepEqual(decodeGameNationUrl('https://www.gamenation.in/Products/Games/crimson-desert-ps5-pre-owned-WzUwODgsMl0'), { id: 5088, condition: 'preowned' });
  assert.equal(gameNationProductUrl('god-of-war-laufey-ps5', 5452, 1), 'https://www.gamenation.in/Products/Games/god-of-war-laufey-ps5-WzU0NTIsMV0');
});

test('robots.txt: E2Z disallows /search/ but not the Store API', () => {
  const rules = parseRobots('User-agent: *\nDisallow: /search/\nDisallow: /?s=\nDisallow: /wp-admin/\nAllow: /wp-admin/admin-ajax.php\n');
  assert.equal(isPathAllowed(rules, '/search/suggest.json?q=x'), false);
  assert.equal(isPathAllowed(rules, '/wp-json/wc/store/v1/products?search=x'), true);
  assert.equal(isPathAllowed(rules, '/wp-admin/admin-ajax.php'), true);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseDacbySitemap, parseDacbyProduct, createDacbyAdapter, cleanDacbyTitle } from '../src/adapters/dacby.js';
import { classifyListing } from '../src/matching/pipeline.js';
import { prepareQuery } from '../src/matching/match.js';

const fx = (f) => fs.readFileSync(new URL(`../fixtures/dacby/${f}`, import.meta.url), 'utf8');

test('dacby sitemap: buy pages only (never /sell/ buyback pages, never image URLs)', () => {
  assert.deepEqual(parseDacbySitemap(fx('sitemap-sample.xml')), [
    'https://dacby.com/buy/ps5-cds/007-first-light-0Pp20Nrh4xtSEe6NZJad',
    'https://dacby.com/buy/ps5-cds/wwe-2k26-cIlZnEvc8vDFmvP33Z3W',
    'https://dacby.com/buy/pre-orders/god-of-war-laufey-ps5-fPuHENLxWT3cDSgdVpPh',
  ]);
});

test('dacby product page: JSON-LD price, MRP, stock, condition, free delivery', () => {
  const url = 'https://dacby.com/buy/ps5-cds/007-first-light-0Pp20Nrh4xtSEe6NZJad';
  const [l, ...rest] = parseDacbyProduct(fx('007-first-light.html'), url, '2026-10-14T00:00:00Z');
  assert.equal(rest.length, 0);
  assert.equal(l.title, '007 First Light');
  assert.equal(l.price, 5449);
  assert.equal(l.mrp, 6999);
  assert.equal(l.shipping, 0);
  assert.equal(l.inStock, true);
  assert.equal(l.conditionHint, 'preowned');
  assert.equal(l.preorder, false);
  assert.equal(l.url, url);
  const c = classifyListing(l);
  assert.ok(c.listing, `kept (${c.reason})`);
  assert.equal(c.listing.condition, 'preowned');
});

test('dacby product page: separate variants with their own prices', () => {
  const html = fx('007-first-light.html').replace(
    '<li><strong>Variant 1:</strong> SKU: 007-first-light-ps5-cds | Price: ₹5449</li>',
    '<li><strong>Variant 1:</strong> SKU: 007-first-light-ps5-cds | Price: ₹5449</li><li><strong>Variant 2:</strong> SKU: 007-first-light-steelbook-ps5-cds | Price: ₹6199</li>');
  const ls = parseDacbyProduct(html, 'https://dacby.com/buy/ps5-cds/x', 'now');
  assert.deepEqual(ls.map((l) => [l.price, l.variantTitle]), [[5449, undefined], [6199, 'Steelbook']]);
});

test('dacby adapter: answers from the index, no network; empty index -> loading error', async () => {
  const listing = parseDacbyProduct(fx('007-first-light.html'), 'https://dacby.com/buy/ps5-cds/x', 'now')[0];
  const seed = new URL('../data/dacby-test-seed.json', import.meta.url).pathname;
  fs.mkdirSync(new URL('../data/', import.meta.url).pathname, { recursive: true });
  fs.writeFileSync(seed, JSON.stringify({ at: new Date().toISOString(), listings: [listing] }));
  try {
    const a = createDacbyAdapter({ seedFile: seed, autoRefresh: false });
    const http = { mode: 'network', getText() { throw new Error('no network in this test'); } };
    assert.equal((await a.search('007 first light', { http, preparedQuery: prepareQuery('007 first light') })).length, 1);
    assert.equal((await a.search('astro bot', { http, preparedQuery: prepareQuery('astro bot') })).length, 0);
    const empty = createDacbyAdapter({ autoRefresh: false });
    await assert.rejects(empty.search('x', { http, preparedQuery: prepareQuery('x') }), /catalogue still loading/);
  } finally { fs.rmSync(seed, { force: true }); }
});

test('dacby titles: condition notes dropped, edition/format notes kept', () => {
  assert.equal(cleanDacbyTitle('FC25 (Minor Scratches, Tested &amp; Working)'), 'FC25');
  assert.equal(cleanDacbyTitle('Mortal Kombat 11 Ultimate Edition (Includes only the base game, without DLC)'), 'Mortal Kombat 11 Ultimate Edition');
  assert.equal(cleanDacbyTitle('GTA 6 Standard Edition | PS5  (Code in Box)'), 'GTA 6 Standard Edition | PS5 (Code in Box)');
});

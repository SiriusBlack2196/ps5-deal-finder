// Builds a price snapshot for the static (artifact) version of the app.
// Input: full PS5 catalogues captured from each store. Output: one JSON file of
// raw listings that the browser runs through the SAME matching pipeline as the
// server (server/src/matching/*), so results are identical to the live app.
//
//   node scripts/build-snapshot.js <dir-with-catalogues> <out.json>
//
// Expected files in <dir>: cg*.json (Shopify collection products.json pages),
// e2z*.json and gl*.json (WooCommerce Store API pages: E2Z, Gameloot), gn*.json (Game Nation games API pages).

import fs from 'node:fs';
import path from 'node:path';
import { wooPrice } from '../src/adapters/woocommerce.js';
import { mapGameNationProduct } from '../src/adapters/gamenation.js';
import { mapCexHit, CEX_PS5_CATEGORY } from '../src/adapters/cex.js';
import { mapGtsProduct } from '../src/adapters/gamestheshop.js';
import { detectKind, detectPlatform, isBuyback } from '../src/matching/classify.js';
import { displayTitle } from '../src/matching/normalize.js';

const [dir, out] = process.argv.slice(2);
const read = (prefix) => fs.readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith('.json')).sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
const fetchedAt = process.env.SNAPSHOT_AT || new Date().toISOString();
const decode = (s) => String(s).replace(/&#8217;/g, '’').replace(/&#8211;/g, '–').replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"');

const listings = [];

// Console Garage (Shopify collection products.json: prices are rupee strings)
for (const page of read('cg')) {
  for (const p of page.products) {
    const hints = [p.product_type, ...(Array.isArray(p.tags) ? p.tags : String(p.tags || '').split(','))].filter(Boolean);
    const onlyDefault = p.variants.length === 1 && /^default title$/i.test(p.variants[0].title);
    for (const v of p.variants) {
      if (isBuyback(v.title)) continue;
      listings.push({
        store: 'consolegarage',
        title: p.title,
        variantTitle: onlyDefault ? undefined : v.title,
        price: Number(v.price),
        mrp: v.compare_at_price ? Number(v.compare_at_price) : null,
        shipping: null,
        inStock: Boolean(v.available),
        url: `https://www.consolegarage.com/products/${p.handle}${onlyDefault ? '' : `?variant=${v.id}`}`,
        imageUrl: p.images?.[0]?.src || null,
        fetchedAt,
        hints,
      });
    }
  }
}

// WooCommerce Store API stores: E2Z (prices in paise) and Gameloot (rupees).
// wooPrice() reads currency_minor_unit, so both map the same way.
for (const [prefix, store, at] of [['e2z', 'e2z', fetchedAt], ['gl', 'gameloot', process.env.GL_AT || fetchedAt]]) {
  for (const page of read(prefix)) {
    for (const p of page) {
      const cats = (p.categories || []).map((c) => decode(c.name));
      listings.push({
        store,
        title: decode(p.name),
        price: wooPrice(p.prices),
        mrp: wooPrice({ ...p.prices, price: p.prices?.regular_price }),
        shipping: null,
        inStock: Boolean(p.is_in_stock),
        url: p.permalink,
        imageUrl: p.images?.[0]?.thumbnail || null,
        fetchedAt: at,
        hints: cats,
        conditionHint: cats.some((c) => /pre-?owned/i.test(c)) ? 'preowned' : undefined,
        preorder: cats.some((c) => /pre-?order/i.test(c)),
      });
    }
  }
}

// Game Nation (games API: rupees; UsageType New/Used)
for (const page of read('gn')) {
  for (const p of page.Products || []) {
    if (p.FullName && p.Price > 0) listings.push(mapGameNationProduct(p, process.env.GN_AT || fetchedAt));
  }
}

// CeX India (Algolia search hits; pre-owned, bought in store)
for (const page of read('cex')) {
  for (const h of page) {
    if (h.categoryName === CEX_PS5_CATEGORY && h.sellPrice > 0) listings.push(mapCexHit(h, process.env.CEX_AT || fetchedAt));
  }
}

// Games The Shop (storefront API: new copies; regular_price is the MRP)
for (const page of read('gts')) {
  if (!Array.isArray(page)) continue;   // skip sample/debug files
  for (const p of page) {
    if (!p.is_digital && p.platform?.name === 'PS5' && (p.sale_price ?? p.regular_price) > 0) listings.push(mapGtsProduct(p, process.env.GTS_AT || fetchedAt));
  }
}

// Query-independent pre-filter to keep the page small; matching happens in the browser.
const kept = listings.filter((l) => {
  const hint = (l.hints || []).join(' | ');
  const pf = detectPlatform(l.title, hint);
  return l.price > 0 && detectKind(l.title, hint) === 'game' && (pf === 'ps5' || pf === 'ps4-ps5-upgrade');
});
// Trim hints to what classification needs.
for (const l of kept) l.hints = (l.hints || []).filter((h) => /ps\s?[45]|playstation|game|pre-?owned/i.test(h)).slice(0, 4);

const titles = [...new Set(kept.map((l) => displayTitle(l.title)))].sort();
const snapshot = {
  fetchedAt,
  stores: [
    { id: 'gameloot', name: 'Gameloot', status: 'ok', count: kept.filter((l) => l.store === 'gameloot').length },
    { id: 'consolegarage', name: 'Console Garage', status: 'ok', count: kept.filter((l) => l.store === 'consolegarage').length },
    { id: 'gamenation', name: 'Game Nation', status: 'ok', count: kept.filter((l) => l.store === 'gamenation').length },
    { id: 'e2z', name: 'E2Z', status: 'ok', count: kept.filter((l) => l.store === 'e2z').length },
    { id: 'cex', name: 'CeX', status: 'ok', count: kept.filter((l) => l.store === 'cex').length },
    { id: 'gamestheshop', name: 'Games The Shop', status: 'ok', count: kept.filter((l) => l.store === 'gamestheshop').length },
  ],
  titles,
  listings: kept,
};
fs.writeFileSync(out, JSON.stringify(snapshot));
console.log(`listings: ${listings.length} raw -> ${kept.length} PS5 games; titles: ${titles.length}; ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);

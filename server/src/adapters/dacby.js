// DACBY (dacby.com) — Noida-based marketplace for certified pre-owned games and consoles.
//
// How it's fetched (and why it's different from the other stores):
//  - The site is a Flutter app backed by Firebase; robots.txt disallows /api/ and
//    /buy/search?, so there is no search endpoint we may call.
//  - What robots.txt does allow: the product sitemaps (product-sitemap-ps5-cds.xml,
//    product-sitemap-pre-orders.xml) and the product pages they list. Every /buy/ page
//    is server-rendered with schema.org Product JSON-LD (name, price, availability,
//    itemCondition, images) plus a "Pricing Details" block with the MRP.
//  - So this adapter keeps a local catalogue index: crawl the two sitemaps, fetch each
//    /buy/ page one at a time with a pause between requests, and answer searches from the
//    index. The index is refreshed every 12 hours in the background and saved to disk.
//  - The sitemaps also list /sell/ pages (what DACBY pays you); those are buyback prices
//    and are never fetched.
//
// What DACBY listings are like:
//  - ps5-cds are pre-owned discs (itemCondition UsedCondition); pre-orders are new copies.
//  - Delivery is free (shippingRate 0 in the JSON-LD), so shipping is reported as 0.

import fs from 'node:fs';
import path from 'node:path';
import { couldMatch } from '../matching/match.js';

const SITE = 'https://dacby.com';
export const DACBY_SITEMAPS = [`${SITE}/product-sitemap-ps5-cds.xml`, `${SITE}/product-sitemap-pre-orders.xml`];
const REFRESH_MS = 12 * 3600_000;
const PAGE_GAP_MS = 1000; // one product page per second, on top of the shared per-host limiter

const decode = (s) => s
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/** Product page URLs to buy from (only /buy/ps5-cds/ and /buy/pre-orders/; never /sell/). */
export function parseDacbySitemap(xml) {
  const out = [];
  for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    const u = decode(m[1]);
    if (/^https:\/\/dacby\.com\/buy\/(ps5-cds|pre-orders)\/[^/?#]+$/.test(u)) out.push(u);
  }
  return [...new Set(out)];
}

const num = (v) => {
  const n = Number(String(v ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Maps one product page to raw listings (one per variant with its own price). */
export function parseDacbyProduct(html, pageUrl, fetchedAt) {
  let product = null;
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const j = JSON.parse(m[1]);
      const items = Array.isArray(j) ? j : j['@graph'] || [j];
      product = items.find((x) => x && x['@type'] === 'Product') || product;
    } catch { /* not every block is valid JSON */ }
  }
  if (!product?.name) return [];
  const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers || {};
  const price = num(offer.price);
  if (!price) return [];

  const availability = String(offer.availability || '');
  const condition = String(offer.itemCondition || '');
  const preorder = /\/pre-orders\//.test(pageUrl) || /PreOrder/i.test(availability);
  const mrp = num(html.match(/<strong>MRP:<\/strong>\s*₹?\s*([\d,]+)/)?.[1]);
  const imageUrl = [].concat(product.image || [])[0] || null;
  const base = {
    store: 'dacby',
    title: decode(product.name).replace(/\s+/g, ' ').trim(),
    mrp: mrp && mrp > price ? mrp : null,
    shipping: Number(offer.shippingDetails?.shippingRate?.value) === 0 ? 0 : null,
    inStock: /InStock|PreOrder|LimitedAvailability/i.test(availability),
    preorder,
    url: offer.url || pageUrl,
    imageUrl,
    fetchedAt,
    hints: ['PS5', 'Games', product.category].filter(Boolean),
    conditionHint: /NewCondition/i.test(condition) ? 'new' : /UsedCondition|Refurbished/i.test(condition) ? 'preowned' : (preorder ? 'new' : 'preowned'),
  };

  // "Available Variants": <li><strong>Variant 1:</strong> SKU: <sku> | Price: ₹5449</li>
  const variants = [...html.matchAll(/<strong>Variant \d+:<\/strong>\s*SKU:\s*([^|<]+?)\s*\|\s*Price:\s*₹?\s*([\d,]+)/g)]
    .map((m) => ({ sku: decode(m[1]).trim(), price: num(m[2]) }))
    .filter((v) => v.price);
  if (variants.length <= 1) return [{ ...base, price }];
  const baseSku = String(product.sku || variants[0].sku);
  return variants.map((v) => ({
    ...base,
    price: v.price,
    mrp: base.mrp && base.mrp > v.price ? base.mrp : null,
    variantTitle: v.sku === baseSku ? undefined : skuLabel(v.sku, baseSku),
  }));
}

// "spider-man-2-steelbook-ps5-cds" vs base "spider-man-2-ps5-cds" -> "Steelbook"
function skuLabel(sku, baseSku) {
  const b = new Set(baseSku.toLowerCase().split('-'));
  const extra = sku.toLowerCase().split('-').filter((w) => w && !b.has(w) && !['ps5', 'cds', 'cd'].includes(w));
  return extra.length ? extra.map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') : sku;
}

const sleep = (ms, signal) => new Promise((resolve, reject) => {
  const t = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); reject(signal.reason); }, { once: true });
});

/**
 * Crawls the sitemaps and every product page they list. Pages that fail are skipped.
 * @returns {Promise<{ at: string, pages: number, failed: number, listings: object[] }>}
 */
export async function crawlDacby(http, { signal, gapMs = PAGE_GAP_MS, log = () => {} } = {}) {
  const urls = [];
  for (const sm of DACBY_SITEMAPS) {
    const xml = await http.getText(sm, { signal, accept: 'application/xml,text/xml' });
    urls.push(...parseDacbySitemap(xml));
  }
  const listings = [];
  let failed = 0;
  for (const [i, u] of [...new Set(urls)].entries()) {
    if (i) await sleep(gapMs, signal);
    try {
      const html = await http.getText(u, { signal, accept: 'text/html' });
      listings.push(...parseDacbyProduct(html, u, new Date().toISOString()));
    } catch (e) {
      if (signal?.aborted) throw e;
      failed++;
      log(`[dacby] ${u}: ${e.message}`);
    }
  }
  return { at: new Date().toISOString(), pages: urls.length, failed, listings };
}

/**
 * Adapter around a catalogue index. `indexFile` caches the last crawl on disk; `seedFile`
 * (the catalogue committed under catalog/dacby/) covers a fresh deploy until the first crawl.
 */
export function createDacbyAdapter({ indexFile, seedFile, autoRefresh = true } = {}) {
  let index = null;      // { at, listings }
  let refreshing = null; // in-flight crawl

  const load = (f) => {
    try {
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      return Array.isArray(j.listings) ? j : null;
    } catch { return null; }
  };
  const newest = [indexFile, seedFile].filter(Boolean).map(load).filter(Boolean).sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  if (newest) index = newest;

  function refresh(http) {
    refreshing ??= crawlDacby(http, { log: (m) => console.warn(m) })
      .then((r) => {
        if (r.listings.length) {
          index = { at: r.at, listings: r.listings };
          if (indexFile) {
            fs.mkdirSync(path.dirname(indexFile), { recursive: true });
            fs.writeFileSync(indexFile, JSON.stringify(index));
          }
        }
        return index;
      })
      .catch((e) => { console.warn(`[dacby] crawl failed: ${e.message}`); return index; })
      .finally(() => { refreshing = null; });
    return refreshing;
  }

  return {
    id: 'dacby',
    name: 'DACBY',
    homepage: SITE,
    get indexedAt() { return index?.at || null; },
    refresh,
    async search(query, { http, preparedQuery }) {
      const stale = !index || Date.now() - Date.parse(index.at) > REFRESH_MS;
      if (stale && autoRefresh && http.mode !== 'fixtures') refresh(http); // background; never blocks a search
      if (!index && http.mode === 'fixtures' && seedFile) index = load(seedFile);
      if (!index) throw new Error('catalogue still loading');
      return index.listings.filter((l) => couldMatch(preparedQuery, l.variantTitle ? `${l.title} ${l.variantTitle}` : l.title));
    },
  };
}

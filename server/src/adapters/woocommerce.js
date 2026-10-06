// Generic adapter for WooCommerce stores via the public Store API
// (/wp-json/wc/store/v1/products). Used by Gameloot and E2Z.
//
// Gotcha: prices are integers in minor units. `currency_minor_unit` is 0 on
// Gameloot (rupees) and 2 on E2Z (paise) — always scale by it.

import { storeSearchTerm } from '../matching/normalize.js';

const FIELDS = 'id,name,permalink,prices,is_in_stock,is_purchasable,images,categories';

export function wooPrice(prices) {
  if (!prices || prices.price == null) return null;
  const minor = Number(prices.currency_minor_unit ?? 0);
  const n = Number(prices.price) / 10 ** minor;
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {{ id, name, baseUrl, logo?, searchTerm?: (q)=>string }} store
 */
export function createWooAdapter(store) {
  return {
    id: store.id,
    name: store.name,
    homepage: store.baseUrl,
    logo: store.logo,
    async search(query, { http, signal }) {
      // Search with the distinctive words only (platform words would make WP's
      // AND-search miss listings titled without "PS5").
      const term = storeSearchTerm(query) || query;
      const url = `${store.baseUrl}/wp-json/wc/store/v1/products?search=${encodeURIComponent(term)}&per_page=40&_fields=${FIELDS}`;
      const items = await http.getJSON(url, { signal });
      if (!Array.isArray(items)) throw new Error('Unexpected response shape');
      const fetchedAt = new Date().toISOString();
      return items.map((p) => ({
        store: store.id,
        title: decodeEntities(p.name),
        price: wooPrice(p.prices),
        mrp: wooPrice(p.prices && { ...p.prices, price: p.prices.regular_price }),
        shipping: null, // not exposed by the Store API
        inStock: Boolean(p.is_in_stock),
        url: p.permalink,
        imageUrl: p.images?.[0]?.thumbnail || p.images?.[0]?.src || null,
        fetchedAt,
        hints: (p.categories || []).map((c) => decodeEntities(c.name)),
        conditionHint: (p.categories || []).some((c) => /pre-?owned/i.test(c.name)) ? 'preowned' : undefined,
      }));
    },
  };
}

function decodeEntities(s = '') {
  return String(s)
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
}

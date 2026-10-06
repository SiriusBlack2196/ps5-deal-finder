// Game Nation (gamenation.in)
//
// STATUS: needs one config value before it can return results.
//
// What we know (probed Oct 2026):
//  - Custom Next.js site; search (/searchresults?q=), listings and product pages
//    are all rendered client-side from a private API, behind Cloudflare.
//  - No Shopify/WooCommerce endpoints, no sitemap.xml; server HTML contains no
//    product data, so Cheerio parsing has nothing to parse.
//  - Product URLs: /Products/Games/<slug>-<base64("[productId,condition]")>
//    where condition 1 = New, 2 = Pre-owned.
//    e.g. god-of-war-laufey-ps5-WzU0NTIsMV0  ->  [5452,1]  (new)
//
// To enable: open https://www.gamenation.in/searchresults?q=god%20of%20war in
// Chrome (from India), DevTools > Network > Fetch/XHR, copy the request that
// returns the product list, and set in .env:
//   GAMENATION_SEARCH_URL=https://<host>/<path>?<param>={q}
// The mapper below tries common field names; adjust `mapItem` if needed.

import { storeSearchTerm } from '../matching/normalize.js';
import { config } from '../config.js';

const BASE = 'https://www.gamenation.in';

export function gameNationProductUrl(slug, productId, conditionCode) {
  const token = Buffer.from(JSON.stringify([Number(productId), Number(conditionCode)])).toString('base64').replace(/=+$/, '');
  return `${BASE}/Products/Games/${slug}-${token}`;
}

export function decodeGameNationUrl(url) {
  const m = url.match(/-([A-Za-z0-9+/]+)\/?$/);
  if (!m) return null;
  try {
    const [id, cond] = JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'));
    return { id, condition: cond === 2 ? 'preowned' : 'new' };
  } catch { return null; }
}

const pick = (o, keys) => keys.map((k) => k.split('.').reduce((v, p) => v?.[p], o)).find((v) => v != null && v !== '');

function mapItem(item, fetchedAt) {
  const title = pick(item, ['name', 'title', 'productName', 'ProductName']);
  const price = Number(pick(item, ['sellingPrice', 'salePrice', 'price', 'Price', 'offerPrice', 'finalPrice']));
  const slug = pick(item, ['slug', 'urlKey', 'seoUrl']);
  const id = pick(item, ['id', 'productId', 'ProductId']);
  const condCode = pick(item, ['condition', 'age', 'Age', 'conditionId']);
  const isPreowned = /pre|used|2/i.test(String(condCode ?? '')) || /pre-?owned/i.test(title || '');
  const directUrl = pick(item, ['url', 'productUrl', 'link']);
  const url = directUrl
    ? new URL(directUrl, BASE).toString()
    : slug && id ? gameNationProductUrl(slug, id, isPreowned ? 2 : 1) : `${BASE}/searchresults?q=${encodeURIComponent(title || '')}`;
  const stockVal = pick(item, ['inStock', 'isInStock', 'available', 'stock', 'quantity', 'qty']);
  return {
    store: 'gamenation',
    title,
    price,
    shipping: null,
    inStock: typeof stockVal === 'number' ? stockVal > 0 : stockVal !== false,
    url,
    imageUrl: pick(item, ['image', 'imageUrl', 'thumbnail', 'images.0']) || null,
    fetchedAt,
    hints: [pick(item, ['category', 'platform', 'categoryName'])].filter(Boolean),
    conditionHint: isPreowned ? 'preowned' : 'new',
  };
}

export const gameNationAdapter = {
  id: 'gamenation',
  name: 'Game Nation',
  homepage: BASE,
  async search(query, { http, signal }) {
    if (!config.gameNation.searchUrl) {
      throw new Error('Game Nation search endpoint not configured (see GAMENATION_SEARCH_URL in .env.example)');
    }
    const url = config.gameNation.searchUrl.replace('{q}', encodeURIComponent(storeSearchTerm(query) || query));
    const data = await http.getJSON(url, { signal });
    const list = Array.isArray(data) ? data : pick(data, ['data.products', 'products', 'data.items', 'items', 'results', 'data']);
    if (!Array.isArray(list)) throw new Error('Game Nation: unrecognised response shape — update mapItem()');
    const fetchedAt = new Date().toISOString();
    return list.map((i) => mapItem(i, fetchedAt)).filter((l) => l.title);
  },
};

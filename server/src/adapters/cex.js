// CeX India (in.webuy.com)
//
// in.webuy.com searches a public Algolia index (app LNNFEEWZVA, index prod_cex_in)
// through CeX's own proxy, search.webuy.io, with a search-only key published in
// the site's app settings (wss2.cex.in.webuy.io/v3/appsettings/prelogin?platformId=18).
// The direct Algolia host rejects that key; the proxy is what the site uses.
//
// What CeX India is like:
//  - Everything is pre-owned (CeX buys and resells second-hand); a `new` flag exists.
//  - Online ordering is switched off (appsettings isEcomEnabled: 0): items are bought
//    in CeX stores. inStockStore = 1 means at least one store has it.
//  - No MRP. firstPrice/previousPrice are earlier CeX prices, not an MRP, so unused.
//  - PS5 games are categoryName "Playstation5 Software"; titles often omit "PS5".

import { storeSearchTerm } from '../matching/normalize.js';

const SITE = 'https://in.webuy.com';
const SEARCH = 'https://search.webuy.io/1/indexes/prod_cex_in/query';
const HEADERS = {
  'X-Algolia-Application-Id': 'LNNFEEWZVA',
  'X-Algolia-API-Key': 'bf79f2b6699e60a18ae330a1248b452c',
  Origin: SITE,
  Referer: `${SITE}/`,
};
export const CEX_PS5_CATEGORY = 'Playstation5 Software';

/** Maps one CeX search hit to a raw listing (also used by the snapshot build). */
export function mapCexHit(h, fetchedAt) {
  const img = h.imageUrls?.medium || h.imageUrls?.large || null;
  return {
    store: 'cex',
    title: h.boxName,
    price: Number(h.sellPrice),
    mrp: null,
    shipping: null,
    inStock: h.inStockStore === 1 || h.inStockOnline === 1,
    storeOnly: h.inStockOnline !== 1,
    url: `${SITE}/product-detail?id=${encodeURIComponent(h.boxId)}`,
    imageUrl: img ? encodeURI(img) : null,
    fetchedAt,
    hints: ['PS5', 'Games', h.categoryName].filter(Boolean),
    conditionHint: h.new === 1 ? 'new' : 'preowned',
  };
}

export const cexAdapter = {
  id: 'cex',
  name: 'CeX',
  homepage: SITE,
  async search(query, { http, signal }) {
    const term = storeSearchTerm(query) || query;
    const params = new URLSearchParams({ query: term, hitsPerPage: '40' }).toString();
    const data = await http.postJSON(SEARCH, { params }, { signal, headers: HEADERS });
    if (!data || !Array.isArray(data.hits)) throw new Error('Unexpected response shape');
    const fetchedAt = new Date().toISOString();
    return data.hits
      .filter((h) => h.categoryName === CEX_PS5_CATEGORY && h.sellPrice > 0 && h.showOnWeb !== 0)
      .map((h) => mapCexHit(h, fetchedAt));
  },
};

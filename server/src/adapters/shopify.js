// Generic adapter for Shopify stores. Used by Console Garage.
//
// Step 1: /search/suggest.json (fast, fuzzy) -> candidate products.
// Step 2: for candidates that could be the game, fetch /products/<handle>.js to
//         get real variants. Console Garage sells one product with variants
//         "Pre-Owned (USED)", "NEW" and "BUYBACK (SELL)". The suggest endpoint's
//         headline price is the BUYBACK price (what they pay you), so without
//         this step we'd show a fake "best deal".
//
// Prices: suggest.json uses rupee strings ("2000.00"); product .js uses paise (200000).

import { storeSearchTerm } from '../matching/normalize.js';
import { couldMatch } from '../matching/match.js';
import { detectPlatform } from '../matching/classify.js';

const MAX_DETAIL_FETCHES = 4;

export function createShopifyAdapter(store) {
  return {
    id: store.id,
    name: store.name,
    homepage: store.baseUrl,
    logo: store.logo,
    async search(query, { http, signal, preparedQuery }) {
      const term = storeSearchTerm(query) || query;
      const suggestUrl = `${store.baseUrl}/search/suggest.json?q=${encodeURIComponent(term)}`
        + '&resources[type]=product&resources[limit]=10&resources[options][unavailable_products]=last';
      const data = await http.getJSON(suggestUrl, { signal });
      const products = data?.resources?.results?.products;
      if (!Array.isArray(products)) throw new Error('Unexpected response shape');

      // Cheap pre-filter so we only fetch details for plausible PS5 matches.
      const candidates = products
        .filter((p) => {
          const hint = [p.type, ...(p.tags || [])].join(' | ');
          const platform = detectPlatform(p.title, hint);
          return (platform === 'ps5' || platform === 'ps4-ps5-upgrade') && couldMatch(preparedQuery, p.title);
        })
        .slice(0, MAX_DETAIL_FETCHES);

      const fetchedAt = new Date().toISOString();
      const settled = await Promise.allSettled(candidates.map(async (p) => {
        const handle = p.handle || p.url?.match(/\/products\/([^?/]+)/)?.[1];
        const detail = await http.getJSON(`${store.baseUrl}/products/${handle}.js`, { signal });
        const hints = [detail.type || p.type, ...(detail.tags || p.tags || [])].filter(Boolean);
        const image = absolutize(detail.featured_image || p.image);
        const variants = detail.variants?.length ? detail.variants : [];
        const onlyDefault = variants.length === 1 && /^default title$/i.test(variants[0].title);
        return variants.map((v) => ({
          store: store.id,
          title: detail.title || p.title,
          variantTitle: onlyDefault ? undefined : v.title,
          price: Number(v.price) / 100, // paise -> rupees
          shipping: null,
          inStock: Boolean(v.available),
          url: `${store.baseUrl}/products/${handle}${onlyDefault ? '' : `?variant=${v.id}`}`,
          imageUrl: image,
          fetchedAt,
          hints,
        }));
      }));

      const listings = settled.filter((s) => s.status === 'fulfilled').flatMap((s) => s.value);
      if (listings.length === 0 && settled.some((s) => s.status === 'rejected')) {
        throw settled.find((s) => s.status === 'rejected').reason;
      }
      return listings;
    },
  };
}

function absolutize(src) {
  if (!src) return null;
  if (typeof src === 'object') src = src.url || src.src;
  if (!src) return null;
  return src.startsWith('//') ? 'https:' + src : src;
}

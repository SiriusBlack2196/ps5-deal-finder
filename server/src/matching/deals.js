// "Best deals": games with the biggest discount off the store's own MRP.
// Shared by the server (/api/deals, from recorded prices) and the snapshot build.
//
// Rules: new, in-stock copies only (pre-owned vs a new-copy MRP isn't a fair
// "discount"); one card per game, showing its single best discount; sanity
// bounds drop placeholder MRPs.

import { tokenize, displayTitle } from './normalize.js';

export function topDeals(listings, { limit = 12, minPct = 5, maxPct = 90 } = {}) {
  const best = new Map();
  for (const l of listings) {
    if (l.condition !== 'new' || !l.inStock || !l.mrp) continue;
    if (l.discountPct < minPct || l.discountPct > maxPct) continue;
    const title = l.displayTitle || displayTitle(l.title);
    const key = l.gameKey || tokenize(title).join(' ');
    if (!key) continue;
    const cur = best.get(key);
    if (!cur || l.discountPct > cur.discountPct || (l.discountPct === cur.discountPct && l.price < cur.price)) {
      best.set(key, {
        gameKey: key, title, store: l.store, price: l.price, mrp: l.mrp, discountPct: l.discountPct,
        edition: l.edition, url: l.url, fetchedAt: l.fetchedAt,
      });
    }
  }
  return [...best.values()]
    .sort((a, b) => b.discountPct - a.discountPct || (b.mrp - b.price) - (a.mrp - a.price))
    .slice(0, limit);
}

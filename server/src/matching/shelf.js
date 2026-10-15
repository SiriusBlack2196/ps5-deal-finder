// Price tags for the home shelves: for each title, the lowest in-stock price among listings
// that match it exactly, and how many stores carry it. Shared by /api/shelf and the snapshot.

import { prepareQuery, matchTitle } from './match.js';

export function shelfPrices(titles, listings) {
  return titles.map((title) => {
    const pq = prepareQuery(title);
    let best = null;
    const stores = new Set();
    for (const l of listings) {
      if (matchTitle(pq, l.title)?.matchType !== 'exact') continue;
      stores.add(l.store);
      if (l.inStock && (!best || l.price < best.price)) best = l;
    }
    return { title, price: best?.price ?? null, store: best?.store ?? null, condition: best?.condition ?? null, storeCount: stores.size };
  });
}

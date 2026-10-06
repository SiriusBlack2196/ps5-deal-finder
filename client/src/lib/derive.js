// Pure functions that turn per-store results into what the results page shows.

/**
 * Exact matches are the game. If no store has an exact match, fall back to the
 * biggest "related" group (e.g. query "god of war" -> "God of War Ragnarok")
 * and say so. Other related groups become "Did you mean" suggestions.
 */
export function pickGame(storeStates, finished) {
  const all = Object.values(storeStates).flatMap((s) => s.listings || []);
  const exact = all.filter((l) => l.matchType === 'exact');

  const groups = new Map();
  for (const l of all.filter((x) => x.matchType === 'related')) {
    const g = groups.get(l.gameKey) || { key: l.gameKey, title: l.displayTitle, listings: [] };
    g.listings.push(l);
    groups.set(l.gameKey, g);
  }
  const related = [...groups.values()].sort((a, b) => b.listings.length - a.listings.length);

  if (exact.length || !finished || related.length === 0) {
    return { listings: exact, fallbackTitle: null, related };
  }
  const [best, ...rest] = related;
  return { listings: best.listings, fallbackTitle: best.title, related: rest };
}

export function applyFilters(listings, { condition, inStockOnly, edition }) {
  return listings
    .filter((l) => condition === 'all' || l.condition === condition)
    .filter((l) => !inStockOnly || l.inStock)
    .filter((l) => edition === 'all' || l.edition === edition)
    .sort((a, b) => a.effectivePrice - b.effectivePrice || a.store.localeCompare(b.store));
}

/**
 * Best deal = cheapest in-stock NEW PS5 copy.
 * Best pre-owned = cheapest in-stock pre-owned, only surfaced when it beats the
 * best new price (or there is no new copy). The two are never merged.
 * "PS4 with free PS5 upgrade" copies are excluded from both — they're shown in
 * the list with their own tag.
 */
export function bestDeals(listings, { edition }) {
  const eligible = listings.filter((l) => l.inStock && l.platform === 'ps5' && (edition === 'all' || l.edition === edition));
  const cheapest = (arr) => arr.reduce((min, l) => (!min || l.effectivePrice < min.effectivePrice ? l : min), null);
  const bestNew = cheapest(eligible.filter((l) => l.condition === 'new'));
  const bestUsed = cheapest(eligible.filter((l) => l.condition === 'preowned'));
  const showUsed = bestUsed && (!bestNew || bestUsed.effectivePrice < bestNew.effectivePrice);
  return { bestNew, bestUsed: showUsed ? bestUsed : null };
}

/** "Save ₹1,200 vs highest price" — across the rows currently visible and in stock, same condition only. */
export function priceSpread(visible) {
  const byCond = (c) => visible.filter((l) => l.inStock && l.condition === c).map((l) => l.effectivePrice);
  const spreads = ['new', 'preowned'].map((c) => {
    const p = byCond(c);
    return p.length >= 2 ? { condition: c, save: Math.max(...p) - Math.min(...p), count: p.length } : null;
  }).filter(Boolean);
  return spreads.sort((a, b) => b.save - a.save)[0] || null;
}

export function editionsIn(listings) {
  return [...new Set(listings.map((l) => l.edition))].sort((a, b) => (a === 'Standard' ? -1 : b === 'Standard' ? 1 : a.localeCompare(b)));
}

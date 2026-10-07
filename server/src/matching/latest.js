// "Latest releases": the most recently released games the stores carry, newest
// first, one entry per game (editions merged), with the lowest in-stock price.
// Release dates come from ratings/dates.json (Metacritic datePublished).

import { tokenize, displayTitle } from './normalize.js';

const EDITION = new Set(['standard', 'deluxe', 'ultimate', 'gold', 'premium', 'launch', 'day', 'one', 'complete',
  'definitive', 'special', 'limited', 'collector', 'collectors', 'anniversary', 'goty', 'edition', 'ed', 'bundle',
  'steelbook', 'no', 'dlc', 'code', 'box']);

// Drop edition words, including "Day 1" / "Day One".
function baseKey(tokens) {
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === 'day' && /^(1|one)$/.test(tokens[i + 1] || '')) { i++; continue; }
    if (!EDITION.has(tokens[i])) out.push(tokens[i]);
  }
  return out.join(' ');
}

// Prefer the store's most "proper" spelling ("Marvel's Spider-Man 2" over "Spiderman 2"),
// then the shortest (plain name over "... Complete Edition").
function pickName(titles) {
  const score = (t) => (/[’']/.test(t) ? 2 : 0) + (/\w-\w/.test(t) ? 1 : 0) + (/[a-z]/.test(t) && /[A-Z]/.test(t) ? 1 : 0) - t.length / 100;
  return [...new Set(titles)].sort((a, b) => score(b) - score(a))[0];
}

// mode 'released': released on or before today, newest first.
// mode 'upcoming': release date after today (pre-orders the stores already list), soonest first.
export function latestReleases(listings, dates, { limit = 12, mode = 'released', today = new Date().toISOString().slice(0, 10) } = {}) {
  const upcoming = mode === 'upcoming';
  const games = new Map();
  for (const l of listings) {
    const title = l.displayTitle || displayTitle(l.title);
    const tokens = tokenize(title);
    if (!tokens.length) continue;
    const key = tokens.join(' ');
    const base = baseKey(tokens) || key;
    const date = dates[key] || dates[base];
    // Coming soon also takes pre-orders Metacritic has no date for yet (shown last).
    if (upcoming ? (date ? date <= today : !l.preorder) : !date || date > today) continue;
    const g = games.get(base) || { key: base, date: date || null, titles: [], stores: new Set(), best: null, anyInStock: false };
    if (date && (!g.date || date > g.date)) g.date = date;
    g.titles.push(title);
    g.stores.add(l.store);
    const better = !g.best || (l.inStock && !g.best.inStock) || (l.inStock === g.best.inStock && l.price < g.best.price);
    if (better) g.best = l;
    g.anyInStock ||= l.inStock;
    games.set(base, g);
  }
  return [...games.values()]
    .map((g) => ({
      gameKey: g.key,
      title: pickName(g.titles).replace(/\s*[([]?\b(?:standard|launch|deluxe|complete|ultimate|gold|premium|day (?:1|one))\s+edition[)\]]?$/i, '') || pickName(g.titles),
      storeCount: g.stores.size,
      date: g.date,
      price: g.best.price,
      inStock: g.anyInStock,
      store: g.best.store,
      preorder: upcoming,
    }))
    .sort((a, b) => {
      if (a.date === b.date) return b.storeCount - a.storeCount || a.price - b.price;
      if (!a.date || !b.date) return a.date ? -1 : 1; // undated pre-orders last
      return (a.date < b.date) === upcoming ? -1 : 1;
    })
    .slice(0, limit);
}

// "Latest releases": the most recently released games the stores carry, newest
// first, one entry per game (editions merged), with the lowest in-stock price.
// Release dates come from ratings/dates.json (Metacritic datePublished).

import { tokenize, displayTitle } from './normalize.js';

const EDITION = new Set(['standard', 'deluxe', 'ultimate', 'gold', 'premium', 'launch', 'day', 'one', 'complete',
  'definitive', 'special', 'limited', 'collector', 'collectors', 'anniversary', 'goty', 'edition', 'ed', 'bundle',
  'steelbook', 'no', 'dlc']);

// Prefer the store's most "proper" spelling ("Marvel's Spider-Man 2" over "Spiderman 2"),
// then the shortest (plain name over "... Complete Edition").
function pickName(titles) {
  const score = (t) => (/[’']/.test(t) ? 2 : 0) + (/\w-\w/.test(t) ? 1 : 0) + (/[a-z]/.test(t) && /[A-Z]/.test(t) ? 1 : 0) - t.length / 100;
  return [...new Set(titles)].sort((a, b) => score(b) - score(a))[0];
}

export function latestReleases(listings, dates, { limit = 9, today = new Date().toISOString().slice(0, 10) } = {}) {
  const games = new Map();
  for (const l of listings) {
    const title = l.displayTitle || displayTitle(l.title);
    const tokens = tokenize(title);
    if (!tokens.length) continue;
    const key = tokens.join(' ');
    const base = tokens.filter((t) => !EDITION.has(t)).join(' ') || key;
    const date = dates[key] || dates[base];
    if (!date || date > today) continue;
    const g = games.get(base) || { key: base, date, titles: [], best: null, anyInStock: false };
    if (date > g.date) g.date = date;
    g.titles.push(title);
    const better = !g.best || (l.inStock && !g.best.inStock) || (l.inStock === g.best.inStock && l.price < g.best.price);
    if (better) g.best = l;
    g.anyInStock ||= l.inStock;
    games.set(base, g);
  }
  return [...games.values()]
    .map((g) => ({
      gameKey: g.key,
      title: pickName(g.titles),
      date: g.date,
      price: g.best.price,
      inStock: g.anyInStock,
      store: g.best.store,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.price - b.price))
    .slice(0, limit);
}

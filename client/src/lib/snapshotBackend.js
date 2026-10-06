// Snapshot backend: searches bundled store catalogues in the browser using the
// exact matching/classification code the server uses.

import snapshot from '../snapshot/snapshot.json';
import { prepareQuery } from '@matching/match.js';
import { processListings } from '@matching/pipeline.js';
import { tokenize } from '@matching/normalize.js';
import { POPULAR } from '../../../server/src/catalog.js';

const stores = snapshot.stores.map(({ id, name }) => ({ id, name }));
const byStoreRaw = Object.groupBy
  ? Object.groupBy(snapshot.listings, (l) => l.store)
  : snapshot.listings.reduce((acc, l) => ((acc[l.store] ||= []).push(l), acc), {});

export function info() {
  return { fetchedAt: snapshot.fetchedAt, stores: snapshot.stores };
}

export function getStores() {
  return stores;
}

export function search(query) {
  const pq = prepareQuery(query);
  const byStore = {};
  for (const s of snapshot.stores) {
    if (s.status !== 'ok') {
      byStore[s.id] = { store: s.id, status: 'error', listings: [], error: s.reason };
      continue;
    }
    const { kept, dropped } = processListings(byStoreRaw[s.id] || [], pq);
    byStore[s.id] = { store: s.id, status: 'ok', listings: kept.map((l) => ({ ...l, imageUrl: null })), dropped, fetchedAt: snapshot.fetchedAt };
  }
  return { stores, byStore, finished: true, error: null };
}

// Popular titles that the snapshot actually has.
export function getPopular() {
  return POPULAR.filter((t) => Object.values(search(t).byStore).some((b) => b.listings.some((l) => l.matchType === 'exact')));
}

const titleIndex = snapshot.titles.map((t) => ({ display: t, key: tokenize(t).join(' ') })).filter((t) => t.key);

export function suggest(q) {
  const qt = tokenize(q);
  if (!qt.length) return [];
  const last = qt.at(-1);
  const full = qt.slice(0, -1);
  const seen = new Set();
  const scored = [];
  for (const { display, key } of titleIndex) {
    if (seen.has(key)) continue;
    const tt = key.split(' ');
    if (!full.every((w) => tt.includes(w)) || !tt.some((w) => w.startsWith(last))) continue;
    seen.add(key);
    const typed = q.trim().toLowerCase();
    const score = (display.toLowerCase().startsWith(typed) ? 40 : 0) + (key.startsWith(qt.join(' ')) ? 10 : 0) + (tt.includes(last) ? 5 : 0) - tt.length;
    scored.push({ display, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, 8).map((s) => s.display);
}
